create table if not exists generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'image',
  provider text not null,
  model text not null,
  prompt text not null,
  aspect text not null default '1:1',
  status text not null default 'processing' check (status in ('queued','processing','succeeded','failed','cancelled')),
  error text,
  output_path text,
  created_at timestamptz not null default now()
);
create index if not exists jobs_user_created on generation_jobs(user_id, created_at desc);
alter table generation_jobs enable row level security;
create policy "own jobs read" on generation_jobs for select using (auth.uid() = user_id);
create policy "own jobs delete" on generation_jobs for delete using (auth.uid() = user_id);
insert into storage.buckets (id, name, public) values ('creations','creations',false) on conflict do nothing;
