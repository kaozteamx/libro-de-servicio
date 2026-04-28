-- ============================================================
-- EJECUTAR ESTE SCRIPT EN EL SQL EDITOR DE SUPABASE
-- https://supabase.com/dashboard → tu proyecto → SQL Editor
-- ============================================================

-- PASO 1: Crear la función para actualizar roles
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

  IF p_target_user = 'admin' THEN
    RETURN false;
  END IF;

  UPDATE public.app_users
  SET role = p_new_role
  WHERE username = p_target_user;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- PASO 2: Cambiar el rol del usuario control_lascondes a 'viewer'
SELECT public.update_user_role('admin', 'CHANGE_ME_ADMIN_PASSWORD', 'control_lascondes', 'viewer');

-- VERIFICAR: Debe mostrar username=control_lascondes, role=viewer
SELECT username, role FROM public.app_users WHERE username = 'control_lascondes';
