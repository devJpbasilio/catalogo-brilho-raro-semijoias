-- =====================================================================
-- Brilho Raro Semijoias — Supabase Storage (imagens do catálogo/marca)
-- Bucket público para leitura (o catálogo precisa exibir as fotos);
-- upload/edição/exclusão apenas para admins da allowlist (public.is_admin()).
--
-- Rode DEPOIS do supabase-schema.sql (que cria public.is_admin()).
-- Cole no Supabase → SQL Editor → Run. Idempotente.
-- =====================================================================

-- Cria (ou garante público) o bucket 'images'.
insert into storage.buckets (id, name, public)
  values ('images', 'images', true)
  on conflict (id) do update set public = true;

-- Leitura pública dos arquivos do bucket.
drop policy if exists images_public_read on storage.objects;
create policy images_public_read on storage.objects
  for select using (bucket_id = 'images');

-- Escrita/edição/exclusão só para admins.
drop policy if exists images_admin_insert on storage.objects;
drop policy if exists images_admin_update on storage.objects;
drop policy if exists images_admin_delete on storage.objects;

create policy images_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'images' and public.is_admin());

create policy images_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'images' and public.is_admin());

create policy images_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'images' and public.is_admin());
