-- Crear tabla para almacenar los enlaces del Libro de Servicio
create table public.service_links (
  id uuid default gen_random_uuid() primary key,
  category_id text not null, -- 'instalacion', 'preventivos', 'correctivos'
  period_label text not null, -- ej. 'Abril 2026'
  title text not null,
  url text not null,
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
