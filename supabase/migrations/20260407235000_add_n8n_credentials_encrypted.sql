create table if not exists public.n8n_credentials (
  id uuid primary key default gen_random_uuid(),
  key_name text not null,
  encrypted_value text not null,
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'inactive', 'revoked')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_n8n_credentials_key_name on public.n8n_credentials (key_name);
create index if not exists idx_n8n_credentials_status on public.n8n_credentials (status);
create index if not exists idx_n8n_credentials_expires_at on public.n8n_credentials (expires_at);

create unique index if not exists uq_n8n_credentials_active_key
  on public.n8n_credentials (key_name)
  where status = 'active';

alter table public.n8n_credentials enable row level security;

create or replace function public.touch_n8n_credentials_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_n8n_credentials_updated_at on public.n8n_credentials;
create trigger trg_touch_n8n_credentials_updated_at
before update on public.n8n_credentials
for each row execute function public.touch_n8n_credentials_updated_at();
