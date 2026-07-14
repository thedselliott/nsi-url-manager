-- URL Audit Tool — Supabase Schema
-- Run this in the Supabase SQL editor before deploying the app.

create table projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  csv_uploaded boolean default false,
  created_at timestamptz default now(),
  created_by text
);

create table urls (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  url text not null,
  path text not null,
  title text,
  status_code integer,
  content_type text,
  is_html boolean default true,
  depth integer default 0,
  decision text check (decision in ('keep', 'redirect', 'delete', 'merge')),
  destination text,
  notes text,
  decided_by text,
  decided_at timestamptz,
  created_at timestamptz default now()
);

create index on urls (project_id);
create index on urls (path);
create index on urls (decision);

-- Enable real-time for the urls table
alter publication supabase_realtime add table urls;

-- Optional: disable Row Level Security for simplicity (project slug acts as lightweight auth)
-- If you need stricter access control, enable RLS and add policies.
alter table projects disable row level security;
alter table urls disable row level security;
