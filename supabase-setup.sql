-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- Names table (known team members)
create table if not exists names (
  name text primary key,
  created_at timestamptz default now()
);

-- Registrations table
create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  name text not null references names(name) on delete cascade,
  session_code text not null,
  created_at timestamptz default now(),
  unique(name, session_code)
);

-- Enable Row Level Security but allow all reads/writes (access code is app-level)
alter table names enable row level security;
alter table registrations enable row level security;

create policy "allow all" on names for all using (true) with check (true);
create policy "allow all" on registrations for all using (true) with check (true);

-- Enable realtime for live updates
alter publication supabase_realtime add table registrations;
