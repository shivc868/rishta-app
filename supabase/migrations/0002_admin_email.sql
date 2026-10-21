-- =============================================================================
-- 0002: admins may be keyed by Google email as well as WhatsApp phone.
--
-- Google sign-in gives auth.users an email and no phone, so a phone-only admin
-- list could never match those users. An admin row now needs phone OR email;
-- the link triggers try both.
-- =============================================================================

alter table admin_users alter column phone drop not null;
alter table admin_users add column email text unique;
alter table admin_users
  add constraint admin_users_phone_or_email check (phone is not null or email is not null);

-- Google users have no phone; give them an account row keyed by email instead.
alter table accounts alter column phone drop not null;
alter table accounts add column email text unique;

-- New sign-in -> account row, and link any pre-registered admin by phone or email.
create or replace function handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_phone text := case when new.phone is not null then '+' || ltrim(new.phone, '+') end;
  v_email text := lower(new.email);
begin
  if v_phone is not null or v_email is not null then
    insert into accounts (id, phone, email)
      values (new.id, v_phone, v_email)
      on conflict (id) do update
        set phone = coalesce(excluded.phone, accounts.phone),
            email = coalesce(excluded.email, accounts.email);
    update admin_users
      set user_id = new.id
      where user_id is null
        and ((v_phone is not null and phone = v_phone)
          or (v_email is not null and email = v_email));
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of phone, email on auth.users
  for each row execute function handle_new_auth_user();

-- Admin added by phone/email -> link immediately if that person already signed up.
create or replace function link_admin_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.phone is not null then
    new.phone := '+' || ltrim(regexp_replace(new.phone, '[^0-9+]', '', 'g'), '+');
  end if;
  if new.email is not null then
    new.email := lower(trim(new.email));
  end if;
  if new.user_id is null then
    select id into new.user_id from auth.users
      where (new.phone is not null and phone = ltrim(new.phone, '+'))
         or (new.email is not null and lower(email) = new.email)
      limit 1;
  end if;
  return new;
end $$;

drop trigger if exists admin_users_link on admin_users;
create trigger admin_users_link
  before insert or update of phone, email on admin_users
  for each row execute function link_admin_user();

-- Backfill: existing Google users who signed in before this migration.
insert into accounts (id, email)
  select id, lower(email) from auth.users
  where email is not null
  on conflict (id) do update set email = excluded.email;
