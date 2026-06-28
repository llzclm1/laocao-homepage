create table if not exists public.leads (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'new',
  source text not null default 'diagnosis_form',
  company_name text not null,
  contact_name text,
  email text,
  wechat text,
  product_line text,
  website_url text,
  material_url text,
  pain_point text not null,
  notes text,
  page_url text,
  user_agent text,
  constraint leads_status_check check (
    status in ('new', 'contacted', 'diagnosed', 'quoted', 'paid', 'delivered', 'lost')
  ),
  constraint leads_contact_check check (
    coalesce(nullif(email, ''), nullif(wechat, '')) is not null
  )
);

alter table public.leads enable row level security;

create index if not exists leads_status_created_at_idx
  on public.leads (status, created_at desc);

grant insert on public.leads to anon, authenticated;
grant usage on sequence public.leads_id_seq to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'leads'
      and policyname = 'anon_insert_leads'
  ) then
    create policy anon_insert_leads
      on public.leads
      for insert
      to anon
      with check (
        status = 'new'
        and source = 'diagnosis_form'
      );
  end if;
end $$;
