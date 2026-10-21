-- =============================================================================
-- Rishta — initial schema.
--
-- Mirrors types/index.ts 1:1. Every interface there is a table here, every
-- string union is an enum. Run in the Supabase SQL editor or with
-- `supabase db push`.
-- =============================================================================

create extension if not exists "pgcrypto";

-- --- Enums -------------------------------------------------------------------

create type gender as enum ('male', 'female');
create type profile_status as enum ('pending_review', 'active', 'paused', 'matched');
create type request_type as enum ('interest', 'photo', 'contact');
create type request_status as enum ('pending', 'accepted', 'declined', 'withdrawn');
create type grant_scope as enum ('photo', 'contact');
create type marital_status as enum ('never_married', 'divorced', 'widowed', 'annulled');
create type diet as enum ('vegetarian', 'eggetarian', 'non_vegetarian', 'jain_vegetarian');
create type complexion as enum ('very_fair', 'fair', 'medium', 'wheatish', 'wheatish_brown', 'dusky', 'dark');
create type manglik as enum ('yes', 'no', 'partial', 'unknown');
create type income_band as enum (
  'upto_15k', '15k_25k', '25k_35k', '35k_45k', '45k_55k',
  '55k_65k', '65k_75k', '75k_85k', '85k_1l', 'above_1l'
);
create type education_level as enum ('high_school', 'diploma', 'bachelors', 'masters', 'doctorate', 'professional');
create type occupation_category as enum ('government', 'private_job', 'business', 'self_employed', 'student', 'not_working');
create type religion as enum ('hindu', 'muslim', 'sikh', 'christian', 'jain', 'buddhist', 'other');
create type created_for as enum ('self', 'son', 'daughter', 'brother', 'sister', 'relative');
create type admin_role as enum ('superadmin', 'admin');
create type report_status as enum ('open', 'resolved', 'dismissed');

-- --- Accounts ----------------------------------------------------------------
-- One phone number = one auth.users row = one account. Created by trigger.

create table accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text not null unique,
  created_at timestamptz not null default now()
);

-- --- Admins ------------------------------------------------------------------
-- Keyed by phone so a superadmin can add someone before they ever log in;
-- user_id is linked by trigger the moment that phone signs up.

create table admin_users (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  user_id uuid unique references auth.users (id) on delete set null,
  role admin_role not null default 'admin',
  display_name text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index admin_users_user_id_idx on admin_users (user_id);

-- --- Profiles ----------------------------------------------------------------

create table profiles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts (id) on delete cascade,
  public_code text not null unique,
  created_for created_for not null default 'self',
  gender gender not null,
  dob date not null,
  height_cm smallint not null check (height_cm between 120 and 220),
  weight_band text not null,
  complexion complexion not null,
  education text not null,
  education_level education_level not null,
  occupation text not null,
  occupation_category occupation_category not null,
  income_band income_band not null,
  religion religion not null,
  community text not null,
  state text not null,
  district text not null,
  city text not null,
  village text not null default '',
  city_lat double precision not null,
  city_lng double precision not null,
  marital_status marital_status not null,
  diet diet not null,
  manglik manglik not null default 'unknown',
  about text not null default '',
  family_brief text not null default '',
  status profile_status not null default 'pending_review',
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  -- Moderation bookkeeping (admin-only columns).
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  review_note text not null default ''
);

create index profiles_status_idx on profiles (status);
create index profiles_account_idx on profiles (account_id);
create index profiles_browse_idx on profiles (gender, status, religion, state);

-- Public code sequence: RSH-101, RSH-102, ...
create sequence profile_code_seq start 101;

create or replace function set_public_code()
returns trigger language plpgsql as $$
begin
  if new.public_code is null or new.public_code = '' then
    new.public_code := 'RSH-' || nextval('profile_code_seq');
  end if;
  return new;
end $$;

create trigger profiles_public_code
  before insert on profiles
  for each row execute function set_public_code();

-- Gated columns. Separate table so RLS can lock the whole row.
create table profile_privates (
  profile_id uuid primary key references profiles (id) on delete cascade,
  full_name text not null,
  phone text not null,
  photo_urls text[] not null default '{}',
  family_details text not null default '',
  exact_address text not null default ''
);

-- --- Requests / grants / shortlists -----------------------------------------

create table requests (
  id uuid primary key default gen_random_uuid(),
  from_profile_id uuid not null references profiles (id) on delete cascade,
  to_profile_id uuid not null references profiles (id) on delete cascade,
  type request_type not null,
  status request_status not null default 'pending',
  message text not null default '' check (char_length(message) <= 200),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (from_profile_id <> to_profile_id)
);

create index requests_to_idx on requests (to_profile_id, status);
create index requests_from_idx on requests (from_profile_id, status);

create table grants (
  id uuid primary key default gen_random_uuid(),
  grantee_profile_id uuid not null references profiles (id) on delete cascade,
  target_profile_id uuid not null references profiles (id) on delete cascade,
  scope grant_scope not null,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz
);

create index grants_lookup_idx on grants (grantee_profile_id, target_profile_id, scope);

create table shortlists (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references profiles (id) on delete cascade,
  target_profile_id uuid not null references profiles (id) on delete cascade,
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (owner_profile_id, target_profile_id)
);

-- --- Reports & audit ---------------------------------------------------------

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_profile_id uuid references profiles (id) on delete set null,
  target_profile_id uuid not null references profiles (id) on delete cascade,
  reason text not null,
  status report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  resolution_note text not null default ''
);

create index reports_status_idx on reports (status, created_at desc);

create table admin_actions (
  id bigint generated always as identity primary key,
  admin_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  target_type text not null,
  target_id text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index admin_actions_created_idx on admin_actions (created_at desc);

-- =============================================================================
-- Role helpers. SECURITY DEFINER so policies can call them without granting
-- users direct read access to admin_users.
-- =============================================================================

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_users where user_id = auth.uid());
$$;

create or replace function is_superadmin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_users where user_id = auth.uid() and role = 'superadmin');
$$;

create or replace function my_profile_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select id from profiles where account_id = auth.uid();
$$;

-- =============================================================================
-- Triggers that keep auth.users, accounts and admin_users in step.
-- =============================================================================

-- New sign-in -> account row, and link any pre-registered admin by phone.
create or replace function handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.phone is not null then
    insert into accounts (id, phone)
      values (new.id, '+' || ltrim(new.phone, '+'))
      on conflict (id) do update set phone = excluded.phone;
    update admin_users
      set user_id = new.id
      where user_id is null and phone = '+' || ltrim(new.phone, '+');
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert or update of phone on auth.users
  for each row execute function handle_new_auth_user();

-- Admin added by phone -> link immediately if that person already signed up.
create or replace function link_admin_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.phone := '+' || ltrim(regexp_replace(new.phone, '[^0-9+]', '', 'g'), '+');
  if new.user_id is null then
    select id into new.user_id from auth.users where phone = ltrim(new.phone, '+') limit 1;
  end if;
  return new;
end $$;

create trigger admin_users_link
  before insert or update of phone on admin_users
  for each row execute function link_admin_user();

-- Nobody may remove or demote the last superadmin.
create or replace function protect_last_superadmin()
returns trigger language plpgsql as $$
begin
  if old.role = 'superadmin'
     and (tg_op = 'DELETE' or new.role <> 'superadmin')
     and (select count(*) from admin_users where role = 'superadmin') <= 1 then
    raise exception 'Cannot remove the last superadmin';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create trigger admin_users_protect
  before update or delete on admin_users
  for each row execute function protect_last_superadmin();

-- =============================================================================
-- Row Level Security
-- =============================================================================

alter table accounts enable row level security;
alter table admin_users enable row level security;
alter table profiles enable row level security;
alter table profile_privates enable row level security;
alter table requests enable row level security;
alter table grants enable row level security;
alter table shortlists enable row level security;
alter table reports enable row level security;
alter table admin_actions enable row level security;

-- accounts: you see yourself; admins see everyone.
create policy accounts_self_read on accounts for select using (id = auth.uid() or is_admin());

-- admin_users: any admin can read the roster; only superadmins change it.
create policy admin_users_read on admin_users for select using (is_admin());
create policy admin_users_insert on admin_users for insert with check (is_superadmin());
create policy admin_users_update on admin_users for update using (is_superadmin());
create policy admin_users_delete on admin_users for delete using (is_superadmin());

-- profiles: active ones are public to signed-in users; owners and admins see all.
create policy profiles_read on profiles for select using (
  auth.uid() is not null and (status = 'active' or account_id = auth.uid() or is_admin())
);
create policy profiles_insert on profiles for insert with check (account_id = auth.uid());
create policy profiles_owner_update on profiles for update using (account_id = auth.uid());
create policy profiles_admin_update on profiles for update using (is_admin());
create policy profiles_admin_delete on profiles for delete using (is_superadmin());

-- profile_privates: owner, admins (for verification), or an unrevoked grant.
create policy privates_read on profile_privates for select using (
  profile_id in (select my_profile_ids())
  or is_admin()
  or exists (
    select 1 from grants g
    where g.target_profile_id = profile_privates.profile_id
      and g.grantee_profile_id in (select my_profile_ids())
      and g.revoked_at is null
      and (g.expires_at is null or g.expires_at > now())
  )
);
create policy privates_owner_write on profile_privates for insert with check (profile_id in (select my_profile_ids()));
create policy privates_owner_update on profile_privates for update using (profile_id in (select my_profile_ids()));

-- requests: either side, or admins.
create policy requests_read on requests for select using (
  from_profile_id in (select my_profile_ids()) or to_profile_id in (select my_profile_ids()) or is_admin()
);
create policy requests_insert on requests for insert with check (from_profile_id in (select my_profile_ids()));
create policy requests_update on requests for update using (
  from_profile_id in (select my_profile_ids()) or to_profile_id in (select my_profile_ids())
);

-- grants: the target creates/revokes; grantee may read; admins read.
create policy grants_read on grants for select using (
  grantee_profile_id in (select my_profile_ids()) or target_profile_id in (select my_profile_ids()) or is_admin()
);
create policy grants_insert on grants for insert with check (target_profile_id in (select my_profile_ids()));
create policy grants_update on grants for update using (target_profile_id in (select my_profile_ids()));

-- shortlists: private to the owner.
create policy shortlists_all on shortlists for all
  using (owner_profile_id in (select my_profile_ids()))
  with check (owner_profile_id in (select my_profile_ids()));

-- reports: anyone signed in can file; admins triage.
create policy reports_insert on reports for insert with check (
  reporter_profile_id is null or reporter_profile_id in (select my_profile_ids())
);
create policy reports_read on reports for select using (is_admin());
create policy reports_update on reports for update using (is_admin());

-- admin_actions: admins append and read; nothing is ever edited or deleted.
create policy admin_actions_read on admin_actions for select using (is_admin());
create policy admin_actions_insert on admin_actions for insert with check (is_admin() and admin_id = auth.uid());

-- =============================================================================
-- Admin RPCs. Small, auditable, and the only way the panel mutates admin data.
-- =============================================================================

create or replace function admin_log(p_action text, p_target_type text, p_target_id text, p_detail jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into admin_actions (admin_id, action, target_type, target_id, detail)
  values (auth.uid(), p_action, p_target_type, p_target_id, coalesce(p_detail, '{}'::jsonb));
$$;

-- Dashboard counts in one round trip.
create or replace function admin_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when is_admin() then jsonb_build_object(
    'pending_review', (select count(*) from profiles where status = 'pending_review'),
    'active',         (select count(*) from profiles where status = 'active'),
    'paused',         (select count(*) from profiles where status = 'paused'),
    'matched',        (select count(*) from profiles where status = 'matched'),
    'verified',       (select count(*) from profiles where is_verified),
    'accounts',       (select count(*) from accounts),
    'open_reports',   (select count(*) from reports where status = 'open'),
    'admins',         (select count(*) from admin_users),
    'requests_7d',    (select count(*) from requests where created_at > now() - interval '7 days'),
    'signups_7d',     (select count(*) from accounts where created_at > now() - interval '7 days')
  ) else null end;
$$;

-- =============================================================================
-- Bootstrap: make yourself the first superadmin. Replace the number, run once.
-- If you have already signed in with this number, the trigger links you now;
-- if not, it links you the moment you sign in.
-- =============================================================================
-- insert into admin_users (phone, role, display_name) values ('+919876543210', 'superadmin', 'Owner');
