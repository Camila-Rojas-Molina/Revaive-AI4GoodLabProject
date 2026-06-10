-- Paste the ENTIRE contents of this file into the Supabase SQL Editor and click Run.
-- Uses IF NOT EXISTS so it is safe to re-run.


/*
profiles        → who is this person, what role (nurse/patient)
patients        → clinical record for a patient (linked to profiles via profile_id)
sessions        → one row per chatbot session (linked to patients)
session_features → speech metrics per session
reports         → generated clinical reports per patient
*/

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('nurse', 'patient')),
  full_name text,
  created_at timestamptz default now()
);

create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete set null,
  name text not null,
  age int,
  sex text,
  surgery_type text,
  anesthesia_duration_min float,
  comorbidity_count int default 0,
  baseline_orientation_score float,
  pod_risk_label text check (pod_risk_label in ('high', 'medium', 'low')),
  pod_risk_score float,
  assigned_nurse_id uuid references profiles(id),
  enrolled_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  session_date date not null default current_date,
  transcript text,
  cognitive_score float,
  theme text,
  difficulty text,
  duration_seconds int,
  flag_escalate boolean default false,
  created_at timestamptz default now()
);

create table if not exists session_features (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  speech_rate_wpm float,
  pause_frequency float,
  pause_avg_duration_sec float,
  type_token_ratio float,
  sentence_completion_rate float,
  recall_accuracy float,
  created_at timestamptz default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  session_id uuid references sessions(id),
  report_date date not null default current_date,
  score_today float,
  score_delta float,
  trend_direction text,
  recommendation text,
  body_text text,
  sent_at timestamptz,
  created_at timestamptz default now()
);

-- Row-level security
alter table patients enable row level security;
alter table sessions enable row level security;
alter table reports enable row level security;

-- Drop existing policies before recreating (safe to re-run)
drop policy if exists "Nurses see their patients" on patients;
drop policy if exists "Patients see their own record" on patients;
drop policy if exists "Patients see their own sessions" on sessions;
drop policy if exists "Nurses see sessions of their patients" on sessions;

create policy "Nurses see their patients"
  on patients for select
  using (assigned_nurse_id = auth.uid());

create policy "Patients see their own record"
  on patients for select
  using (profile_id = auth.uid());

create policy "Patients see their own sessions"
  on sessions for select
  using (patient_id in (
    select id from patients where profile_id = auth.uid()
  ));

create policy "Nurses see sessions of their patients"
  on sessions for select
  using (patient_id in (
    select id from patients where assigned_nurse_id = auth.uid()
  ));

-- Grant service_role full access to all tables (required when tables are created via raw SQL)
grant select, insert, update, delete on public.profiles   to service_role;
grant select, insert, update, delete on public.patients   to service_role;
grant select, insert, update, delete on public.sessions   to service_role;
grant select, insert, update, delete on public.session_features to service_role;
grant select, insert, update, delete on public.reports    to service_role;

-- Trigger: auto-create a profiles row whenever a new auth user is created,
-- as long as their metadata includes a 'role' field ('nurse' or 'patient').
create or replace function public.handle_new_user()
returns trigger as $$
begin
  if new.raw_user_meta_data->>'role' is not null then
    insert into public.profiles (id, role, full_name)
    values (
      new.id,
      new.raw_user_meta_data->>'role',
      coalesce(new.raw_user_meta_data->>'full_name', '')
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
