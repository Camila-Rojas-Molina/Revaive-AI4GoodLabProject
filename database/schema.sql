-- Roles: 'nurse' or 'patient'
-- Supabase Auth handles the auth.users table automatically.
-- We extend it with a profiles table.

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('nurse', 'patient')),
  full_name text,
  created_at timestamptz default now()
);

create table patients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete set null,
  -- profile_id links a patient's login account to their clinical record
  name text not null,
  age int,
  sex text,
  surgery_type text,
  anesthesia_duration_min float,
  comorbidity_count int default 0,
  baseline_orientation_score float, -- 0–10, entered at intake
  pod_risk_label text check (pod_risk_label in ('high', 'medium', 'low')),
  pod_risk_score float,             -- raw model probability 0–1
  assigned_nurse_id uuid references profiles(id),
  enrolled_at timestamptz default now(),
  created_at timestamptz default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  session_date date not null default current_date,
  transcript text,
  cognitive_score float,            -- 0–100
  theme text,
  difficulty text,
  duration_seconds int,
  flag_escalate boolean default false,
  created_at timestamptz default now()
);

create table session_features (
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

create table reports (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) on delete cascade,
  session_id uuid references sessions(id),
  report_date date not null default current_date,
  score_today float,
  score_delta float,               -- difference from previous session
  trend_direction text,            -- 'improving', 'declining', 'stable'
  recommendation text,
  body_text text,                  -- full report markdown
  sent_at timestamptz,
  created_at timestamptz default now()
);

-- Row-level security: nurses see all patients assigned to them.
-- Patients see only their own sessions and scores.
alter table patients enable row level security;
alter table sessions enable row level security;
alter table reports enable row level security;

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
