-- =====================================================================
-- Brilho Raro Semijoias — Schema Supabase (PostgreSQL) — VERSÃO BLINDADA
-- Modelo "documento": cada tabela guarda o objeto completo em `data` (jsonb).
-- Acesso protegido por ALLOWLIST DE ADMINS: só usuários cadastrados em
-- public.admins têm acesso aos dados sensíveis — não basta estar autenticado.
--
-- Como usar: cole tudo no Supabase → SQL Editor → Run. Idempotente.
--
-- ⚠️  ANTES DE RODAR: troque 'SEU_EMAIL_ADMIN' (mais abaixo) pelo e-mail do
--     usuário admin que você criou em Authentication → Users.
-- =====================================================================

-- ---------- Tabelas ----------
create table if not exists public.products (
  id text primary key, data jsonb not null, created_at timestamptz not null default now()
);
create table if not exists public.customers (
  id text primary key, data jsonb not null, created_at timestamptz not null default now()
);
create table if not exists public.sales (
  id text primary key, data jsonb not null, created_at timestamptz not null default now()
);
create table if not exists public.cash_flow (
  id text primary key, data jsonb not null, created_at timestamptz not null default now()
);
create table if not exists public.config (
  id text primary key, data jsonb not null, updated_at timestamptz not null default now()
);

-- ---------- Allowlist de administradores ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email   text,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- Sem policies em `admins`: ninguém a acessa pela API. Só a função
-- is_admin() (SECURITY DEFINER) a consulta internamente.

-- ⬇⬇⬇  TROQUE AQUI PELO E-MAIL DO SEU USUÁRIO ADMIN  ⬇⬇⬇
insert into public.admins (user_id, email)
  select id, email from auth.users where email = 'alinelobato71@gmail.com'
  on conflict (user_id) do nothing;
-- ⬆⬆⬆  (depois de rodar, confira com:  select * from public.admins;  )  ⬆⬆⬆

-- Função que diz se o usuário atual é admin. SECURITY DEFINER para poder ler
-- a tabela `admins` ignorando o RLS dela. auth.uid() reflete o JWT do chamador.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- Row Level Security ----------
alter table public.products  enable row level security;
alter table public.customers enable row level security;
alter table public.sales     enable row level security;
alter table public.cash_flow enable row level security;
alter table public.config    enable row level security;

grant select, insert, update, delete on public.products, public.customers, public.sales, public.cash_flow, public.config to anon, authenticated;

-- ---------- Policies ----------
-- PRODUCTS: catálogo público para leitura; escrita só admin.
drop policy if exists products_read on public.products;
drop policy if exists products_write on public.products;
create policy products_read  on public.products for select using (true);
create policy products_write on public.products for all    using (public.is_admin()) with check (public.is_admin());

-- CONFIG: leitura pública (catálogo precisa de nome/logo/banner); escrita só admin.
drop policy if exists config_read on public.config;
drop policy if exists config_write on public.config;
create policy config_read  on public.config for select using (true);
create policy config_write on public.config for all    using (public.is_admin()) with check (public.is_admin());

-- CUSTOMERS: dado pessoal — só admin.
drop policy if exists customers_all on public.customers;
create policy customers_all on public.customers for all using (public.is_admin()) with check (public.is_admin());

-- CASH_FLOW: financeiro — só admin.
drop policy if exists cashflow_all on public.cash_flow;
create policy cashflow_all on public.cash_flow for all using (public.is_admin()) with check (public.is_admin());

-- SALES: leitura/edição/exclusão só admin. Exceção controlada: visitante
-- anônimo pode CRIAR um pedido (status == 'order'), mas nunca ler/alterar.
drop policy if exists sales_admin_all on public.sales;
drop policy if exists sales_anon_order on public.sales;
create policy sales_admin_all  on public.sales for all    using (public.is_admin()) with check (public.is_admin());
create policy sales_anon_order on public.sales for insert with check ((data ->> 'status') = 'order');

-- ---------- Limpeza de linhas de teste (opcional) ----------
delete from public.sales where id like 'sectest_%' or id = 'test_order_rls';
