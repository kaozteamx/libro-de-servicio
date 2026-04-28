-- Crear usuario de solo visualización: control_lascondes
-- Rol 'viewer': puede ver todo pero NO puede agregar, editar ni eliminar folios

INSERT INTO public.app_users (username, password_hash, role)
VALUES (
  'control_lascondes',
  crypt('CHANGE_ME_VIEWER_PASSWORD', gen_salt('bf')),
  'viewer'
)
ON CONFLICT (username) DO UPDATE
  SET password_hash = crypt('CHANGE_ME_VIEWER_PASSWORD', gen_salt('bf')),
      role = 'viewer';
