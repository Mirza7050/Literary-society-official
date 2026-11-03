-- TLS PUBG/BGMI Tournament: run in Supabase SQL Editor.
-- Uses the existing Supabase project. Does not alter TLS recruitment tables.

create table if not exists public.tournament_registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  team_name text not null check (char_length(team_name) between 2 and 60),
  player_1_uid text not null,
  player_2_uid text not null,
  player_3_uid text not null,
  player_4_uid text not null,
  leader_mobile text not null check (leader_mobile ~ '^[0-9]{10}$'),
  leader_email text not null,
  payment_screenshot_path text not null,
  payment_status text not null default 'pending' check (payment_status in ('pending','verified','rejected')),
  registration_status text not null default 'pending' check (registration_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  constraint distinct_player_uids check (
    player_1_uid <> player_2_uid and player_1_uid <> player_3_uid and
    player_1_uid <> player_4_uid and player_2_uid <> player_3_uid and
    player_2_uid <> player_4_uid and player_3_uid <> player_4_uid
  )
);

create table if not exists public.tournament_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.tournament_registrations enable row level security;
alter table public.tournament_admins enable row level security;

-- Check verification against the Auth user record on the server, not a
-- browser-supplied flag or a client-side boolean.
create or replace function public.tournament_email_is_verified()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  );
$$;

grant execute on function public.tournament_email_is_verified() to authenticated;

-- A signed-in OTP-verified user may create only their own registration,
-- and the leader email must match the authenticated Supabase email.
drop policy if exists "verified users create own tournament registration" on public.tournament_registrations;
create policy "verified users create own tournament registration"
on public.tournament_registrations for insert to authenticated
with check (
  user_id = auth.uid()
  and public.tournament_email_is_verified()
  and lower(leader_email) = lower(auth.jwt() ->> 'email')
  and payment_status = 'pending'
  and registration_status = 'pending'
);

drop policy if exists "users read own tournament registration" on public.tournament_registrations;
create policy "users read own tournament registration"
on public.tournament_registrations for select to authenticated
using (user_id = auth.uid());

drop policy if exists "tournament admins read all registrations" on public.tournament_registrations;
create policy "tournament admins read all registrations"
on public.tournament_registrations for select to authenticated
using (exists (select 1 from public.tournament_admins a where a.user_id = auth.uid()));

drop policy if exists "tournament admins update registrations" on public.tournament_registrations;
create policy "tournament admins update registrations"
on public.tournament_registrations for update to authenticated
using (exists (select 1 from public.tournament_admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.tournament_admins a where a.user_id = auth.uid()));

drop policy if exists "only tournament admins can read admin list" on public.tournament_admins;
create policy "admins can read their own admin membership"
on public.tournament_admins for select to authenticated
using (user_id = auth.uid());

-- Private bucket. 5 MB limit; only JPEG and PNG accepted.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tournament-payment-proofs', 'tournament-payment-proofs', false, 5242880, array['image/jpeg','image/png'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png'];

drop policy if exists "users upload own tournament payment proof" on storage.objects;
create policy "users upload own tournament payment proof"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'tournament-payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users view own tournament payment proof" on storage.objects;
create policy "users view own tournament payment proof"
on storage.objects for select to authenticated
using (
  bucket_id = 'tournament-payment-proofs'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.tournament_admins a where a.user_id = auth.uid())
  )
);

drop policy if exists "users delete own tournament payment proof" on storage.objects;
create policy "users delete own tournament payment proof"
on storage.objects for delete to authenticated
using (
  bucket_id = 'tournament-payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ADMIN SETUP:
-- 1) Create the management account in Supabase Authentication > Users.
-- 2) Copy that user's UUID.
-- 3) Run the statement below once per authorised tournament manager:
-- insert into public.tournament_admins (user_id) values ('PASTE_AUTH_USER_UUID_HERE');
--
-- Keep this admin table inaccessible to public users. Never place service-role keys
-- in any frontend file. Add/remove tournament managers only from the SQL editor.
