# Supabase setup

The register runs in **demo mode** (mock data, any 6-digit OTP) until these
steps are done. After them, sign-in sends a real one-time code over WhatsApp
and `/admin` reads real tables.

## 1. Create the project and run the schema

1. Create a project at https://supabase.com/dashboard.
2. Open **SQL Editor**, paste `migrations/0001_schema.sql`, run it.
3. Copy **Project URL** and **anon public key** from *Settings -> API* into
   `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

## 2. Turn on phone sign-in

*Authentication -> Providers -> Phone*: enable it. Then pick **one** of the two
delivery paths.

### Option A: Twilio (simplest)

1. In *Phone*, choose **Twilio** or **Twilio Verify** and paste the SID, token
   and Message Service SID / Verify Service SID.
2. In Twilio, enable the WhatsApp sender on that service (WhatsApp Business
   approval by Meta is required for production; the Twilio sandbox works for
   testing).
3. Set `NEXT_PUBLIC_OTP_CHANNEL=whatsapp`.

The client calls `signInWithOtp({ phone, options: { channel: 'whatsapp' } })`.

### Option B: Meta WhatsApp Cloud API (no Twilio)

Supabase still generates and verifies the code; a **Send SMS hook** hands the
delivery to this app, which posts it to Meta.

1. In Meta Business, create an **authentication** template (name it
   `rishta_otp`, or set `WHATSAPP_OTP_TEMPLATE`). Meta fills the body; keep the
   "copy code" button on.
2. Get a permanent system-user access token and the sender's phone-number id.
3. In *Phone*, choose any provider (it will not be used) so the toggle stays on.
4. *Authentication -> Hooks -> Send SMS*: type **HTTPS**, URL
   `https://<your-domain>/api/auth/whatsapp-otp-hook`. Copy the generated secret.
5. `.env.local`:

   ```
   NEXT_PUBLIC_OTP_CHANNEL=sms
   SUPABASE_SEND_SMS_HOOK_SECRET=v1,whsec_...
   WHATSAPP_ACCESS_TOKEN=EAAG...
   WHATSAPP_PHONE_NUMBER_ID=1234567890
   ```

The hook is in `app/api/auth/whatsapp-otp-hook/route.ts`. It verifies the
Standard-Webhooks signature, sends the template, and never sees the code the
user types.

Local testing: expose the dev server with a tunnel (for example `ngrok http 3000`)
and use that URL in the hook settings.

## 3. Turn on Google sign-in

1. In Google Cloud Console, create an **OAuth client ID** (Web application).
   Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
2. *Authentication -> Providers -> Google*: enable it, paste the client ID and
   secret.
3. *Authentication -> URL Configuration*: add `http://localhost:3000/auth/callback`
   (and your production `https://<your-domain>/auth/callback`) to **Redirect URLs**.

The client calls `signInWithOAuth({ provider: 'google' })`; Google returns the
browser to `app/auth/callback/route.ts`, which swaps the code for a session
cookie and sends the user on to `/login`, which then routes to `/browse` or
`/onboarding`. In demo mode the button signs in a fixed demo Google account.


## 4. Make yourself the first super admin

Run `migrations/0002_admin_email.sql` first (it lets admins be keyed by Google
email as well as phone). Then, in the SQL editor, with your own number **or**
the Gmail you use for "Continue with Google":

```sql
-- WhatsApp number
insert into admin_users (phone, role, display_name)
values ('+919876543210', 'superadmin', 'Your name');

-- or Google account
insert into admin_users (email, role, display_name)
values ('you@gmail.com', 'superadmin', 'Your name');
```

If you have already signed in once, the row links to your user immediately;
otherwise it links on your first sign-in. Sign out and back in, then open `/admin`.

Sign in at `/login?next=/admin` with that number. The trigger links your
`auth.users` row to the admin entry on first sign-in (or immediately, if you
had already signed in). From then on, add further admins from `/admin/admins`.


## 5. Run the follow-up migrations

`migrations/0003_seed_flag.sql` (is_seed flag) and `migrations/0004_no_review_gate.sql`
(new profiles default to `active` — no manual approval step; "Hidden for review"
remains an admin tool and the verified badge is optional).

## 6. Load the demo profiles (optional)

The 100 dummy families the browser demo shows can be loaded into Supabase too,
so `/admin` has something to review:

1. Run `migrations/0003_seed_flag.sql` if you have not yet.
2. Paste `seed/demo_profiles.sql` into the SQL Editor and run it.

Every row is flagged `is_seed = true`. To remove them all later:

```sql
delete from profiles where is_seed;
delete from auth.users where id = '00000000-0000-4000-8000-000000000001';
```

The file is generated from `lib/mock-data.ts` — after changing the seed, run
`npm run seed:sql` and re-run the SQL (inserts are upserts, so it is safe).

## Roles

| Ability                                   | admin | superadmin |
| ----------------------------------------- | :---: | :--------: |
| Dashboard, review queue, audit log        |  yes  |    yes     |
| Approve / pause / match / send back       |  yes  |    yes     |
| Mark verified, see private details        |  yes  |    yes     |
| Resolve or dismiss reports                |  yes  |    yes     |
| Delete a profile                          |   no  |    yes     |
| Add / remove admins, change roles         |   no  |    yes     |

Everything is enforced by Row Level Security in Postgres, not just hidden in
the UI. The last super admin cannot be removed or demoted.

## Row Level Security summary

- `profiles`: signed-in users see `active` rows plus their own; admins see all.
- `profile_privates`: owner, admins, or a holder of an unrevoked `grant`.
- `admin_users`: readable by admins, writable only by super admins.
- `admin_actions`: append-only, written through the `admin_log()` RPC.

## 7. Category column

`migrations/0006_category.sql` adds the reservation category (General / OBC /
SC / ST) that the biodata form now asks right after religion. Run it before
loading a freshly generated `seed/demo_profiles.sql`, which includes the column.
