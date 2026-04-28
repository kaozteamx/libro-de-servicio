-- Crear tabla para almacenar los enlaces del Libro de Servicio
create table public.service_links (
  id uuid default gen_random_uuid() primary key,
  category_id text not null, -- 'instalacion', 'preventivos', 'correctivos'
  period_label text not null, -- ej. 'Abril 2026'
  title text not null,
  url text not null,
  folio serial,
  folder_description text,
  observations text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Políticas de Seguridad (RLS)
-- Habilitamos RLS
alter table public.service_links enable row level security;

-- Política para permitir acceso público anónimo a visualización e inserción y borrado (Temporal/Simulando LocalStorage global)
-- Si planeas requerir usuario logeado en Supabase, deberás cambiar 'public' por 'authenticated'
create policy "Allow anonymous select" on public.service_links for select using (true);
create policy "Allow anonymous insert" on public.service_links for insert with check (true);
create policy "Allow anonymous delete" on public.service_links for delete using (true);
create policy "Allow anonymous update" on public.service_links for update using (true);

-- -------------------------------------------------------------
-- SISTEMA DE AUTENTICACION PERSONALIZADO
-- -------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.app_users (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  password_hash text not null,
  role text not null default 'user',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS en app_users para permitir lectura si no es admin, pero solo admin modifica a travez de funciones
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read of app_users" ON public.app_users FOR SELECT USING (true);
CREATE POLICY "Only admin write app_users" ON public.app_users FOR ALL USING (role = 'admin');

-- Insertar administrador inicial seguro
INSERT INTO public.app_users (username, password_hash, role)
VALUES ('admin', crypt('CHANGE_ME_ADMIN_PASSWORD', gen_salt('bf')), 'admin')
ON CONFLICT (username) DO NOTHING;


-- Función: Iniciar sesión
CREATE OR REPLACE FUNCTION public.authenticate_user(p_username text, p_password text)
RETURNS json AS $$
DECLARE
  v_user public.app_users;
BEGIN
  SELECT * INTO v_user
  FROM public.app_users
  WHERE username = p_username AND password_hash = crypt(p_password, password_hash);

  IF FOUND THEN
    RETURN json_build_object('id', v_user.id, 'username', v_user.username, 'role', v_user.role);
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Función: Admin crea usuarios (valida el input del admin)
CREATE OR REPLACE FUNCTION public.create_new_user(
  p_admin_user text,
  p_admin_pass text,
  p_new_user text,
  p_new_pass text
) RETURNS boolean AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  SELECT (role = 'admin') INTO v_is_admin
  FROM public.app_users
  WHERE username = p_admin_user AND password_hash = crypt(p_admin_pass, password_hash);

  IF NOT coalesce(v_is_admin, false) THEN
    RETURN false;
  END IF;

  INSERT INTO public.app_users (username, password_hash, role)
  VALUES (p_new_user, crypt(p_new_pass, gen_salt('bf')), 'user');

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Función: Admin resetea contraseñas (valida el input del admin)
CREATE OR REPLACE FUNCTION public.reset_user_password(
  p_admin_user text,
  p_admin_pass text,
  p_target_user text,
  p_new_pass text
) RETURNS boolean AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  SELECT (role = 'admin') INTO v_is_admin
  FROM public.app_users
  WHERE username = p_admin_user AND password_hash = crypt(p_admin_pass, password_hash);

  IF NOT coalesce(v_is_admin, false) THEN
    RETURN false;
  END IF;

  UPDATE public.app_users
  SET password_hash = crypt(p_new_pass, gen_salt('bf'))
  WHERE username = p_target_user AND role != 'admin';

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Función: Admin actualiza el rol de un usuario (admin, user, viewer)
CREATE OR REPLACE FUNCTION public.update_user_role(
  p_admin_user text,
  p_admin_pass text,
  p_target_user text,
  p_new_role text
) RETURNS boolean AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  SELECT (role = 'admin') INTO v_is_admin
  FROM public.app_users
  WHERE username = p_admin_user AND password_hash = crypt(p_admin_pass, password_hash);

  IF NOT coalesce(v_is_admin, false) THEN
    RETURN false;
  END IF;

  -- No permitir cambiar el rol del propio admin
  IF p_target_user = 'admin' THEN
    RETURN false;
  END IF;

  UPDATE public.app_users
  SET role = p_new_role
  WHERE username = p_target_user;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- -------------------------------------------------------------
-- USUARIOS ESPECIALES: Solo visualización (viewer)
-- Ejecutar este bloque para crear control_lascondes como viewer
-- -------------------------------------------------------------
-- PASO 1: El usuario ya fue creado con create_new_user (rol 'user')
-- PASO 2: Ejecutar esta función para cambiar su rol a 'viewer':
-- SELECT public.update_user_role('admin', 'CHANGE_ME_ADMIN_PASSWORD', 'control_lascondes', 'viewer');

