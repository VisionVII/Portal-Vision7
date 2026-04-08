alter table public.n8n_credentials
  add column if not exists reminder_email text,
  add column if not exists remind_days_before integer not null default 7,
  add column if not exists last_reminder_sent_at timestamptz,
  add column if not exists activated_at timestamptz;

alter table public.n8n_credentials
  drop constraint if exists n8n_credentials_remind_days_before_check;

alter table public.n8n_credentials
  add constraint n8n_credentials_remind_days_before_check
  check (remind_days_before in (7, 30, 60, 90));

create index if not exists idx_n8n_credentials_reminder_email on public.n8n_credentials (reminder_email);
create index if not exists idx_n8n_credentials_activated_at on public.n8n_credentials (activated_at);
