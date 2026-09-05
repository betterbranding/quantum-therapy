# Quantum Therapy: Setup and Deployment Walkthrough

This is the complete path from an empty machine to a live app on your own domain.
Follow it top to bottom. Every step lists what you do, and what you should see when
it worked.

Total time if nothing goes wrong: about 45 minutes, most of it waiting on Stripe
and DNS.

---

## What this app is now

The old Manus build was a Vite SPA talking to an Express server, a TiDB database and
Manus OAuth. All three of those went away when Manus shut down. This rebuild keeps
every feature and moves to infrastructure you own:

| Concern | Was (Manus) | Is now |
|---|---|---|
| Framework | Vite SPA + Wouter | Next.js 15 App Router |
| Server | Express + tRPC | Vercel serverless route handlers |
| Database | TiDB (MySQL) + Drizzle | Supabase Postgres |
| Auth | Manus OAuth | Supabase Auth (magic link + Google) |
| Payments | Stripe | Stripe (unchanged) |
| CRM | GoHighLevel | GoHighLevel (unchanged) |
| Hosting | Manus WebDev | Vercel |
| Audio | Web Audio API | Web Audio API (unchanged) |

Three known problems from the old build are fixed on the way:

1. **Session limits could be bypassed.** The free tier counter lived in
   `localStorage`, so clearing it reset the limit. It is now enforced inside
   Postgres by the `start_session()` function, which the client cannot go around.
2. **The protocol database bloated the bundle.** All protocols were compiled into
   the JavaScript payload. They now live in Postgres with full text search, and
   each one is a statically generated page.
3. **No SEO.** The app was one client-rendered route. It now pre-renders 1,395
   protocol pages plus 22 tone pages, with a sitemap. That is the single biggest
   growth lever in this rebuild.

---

## Step 0: What you need before you start

Accounts, all free to open:

- [GitHub](https://github.com) (you have `betterbranding`)
- [Supabase](https://supabase.com) (you have the `betterbranding` org)
- [Vercel](https://vercel.com)
- [Stripe](https://stripe.com) (you already have the account from the old build)
- GoHighLevel (optional, only for CRM sync)

Local tools, only needed if you want to run it on your own machine:

- Node.js 20 or newer
- `git`

---

## Step 1: Get the code

The repository is `betterbranding/quantum-therapy`.

> Note: your existing `betterbranding/quantum-therapy` repo is the marketing landing
> page for quantumtherapy.app. It is untouched. This is a separate repo for the app.

```bash
git clone https://github.com/betterbranding/quantum-therapy.git
cd quantum-therapy
npm install
```

Copy the environment template:

```bash
cp .env.example .env.local
```

You can already run it:

```bash
npm run dev
```

Open http://localhost:3000. **The app works right now with no keys at all.** Search,
browse and audio playback all run off the bundled protocol file. What you do not get
until Supabase is connected is accounts, session history and billing. That fallback is
deliberate so you are never staring at a broken screen while you configure things.

---

## Step 2: Supabase (database and auth)

### 2a. The project already exists

This one is done. The Supabase project was created and is live:

| Field | Value |
|---|---|
| Organization | `betterbranding` |
| Project name | `quantum-therapy-app` |
| Project ref | `irqjnjxggrrdkduptzcm` |
| Project URL | `https://irqjnjxggrrdkduptzcm.supabase.co` |
| Region | `us-east-1` |
| Plan | Pro, $10/month |

Dashboard: https://supabase.com/dashboard/project/irqjnjxggrrdkduptzcm

### 2b. The schema is already applied

Also done. The full schema in `supabase/schema.sql` has been applied to the
project as two migrations, `initial_schema` and `restore_alias_search_vector`.

Live in the database now:

- Tables: `profiles`, `protocols`, `tones`, `sessions`, `favorites`,
  `knowledge_base`, `stripe_events`. All seven show **RLS enabled**.
- Functions: `start_session`, `complete_session`, `search_protocols`,
  `sessions_this_month`, `monthly_limit_for`, `handle_new_user`,
  `touch_updated_at`, `immutable_array_to_string`.

`supabase/schema.sql` in the repo is the authoritative copy. If you ever rebuild
the database from scratch, paste that file into **SQL Editor -> New query** and
run it.

> Why `immutable_array_to_string` exists: the protocol search index is a
> generated column that includes each protocol's aliases. Postgres only allows
> `IMMUTABLE` functions in a generated column, and the built-in
> `array_to_string` is merely `STABLE`, so the schema wraps it in an immutable
> helper. Keep that function if you edit the schema.

### 2c. Get your keys

**Project Settings → API**. Copy these into `.env.local`:

| Supabase field | Goes into |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` `secret` key | `SUPABASE_SERVICE_ROLE_KEY` |

> The `service_role` key bypasses every security policy in your database. It must
> never appear in a `NEXT_PUBLIC_` variable, never be committed, and never be sent
> to a browser. It is only used by the Stripe webhook and the seed script.

### 2d. The protocols are already loaded

Done as well. The database currently holds:

- **1,395 protocols**
- **11,624 frequencies**
- **22 standalone tones**

Server-side search is live and tested: `search_protocols('insomnia')` returns
Insomnia (Nervous System, 10 frequencies) as its top hit.

If you ever need to reload the library, from the repo root:

```bash
npm run seed
```

It upserts on `slug`, so re-running it is always safe.

### 2e. Turn on sign-in

**Authentication → Providers**:

- **Email** is on by default. Leave it on. This powers the magic link.
- **Google**: toggle on, then follow Supabase's prompt to create OAuth credentials
  in Google Cloud Console. Paste the callback URL Supabase shows you into Google's
  "Authorized redirect URIs". Copy the client ID and secret back into Supabase.

**Authentication → URL Configuration**:

- Site URL: `https://app.quantumtherapy.app` (or your Vercel URL for now)
- Redirect URLs, add all of these:
  - `http://localhost:3000/auth/callback`
  - `https://your-project.vercel.app/auth/callback`
  - `https://app.quantumtherapy.app/auth/callback`

Missing redirect URLs is the number one cause of "sign in did nothing". If a magic
link bounces you to a blank page, this is the first place to look.

---

## Step 3: Stripe (billing)

### 3a. Create the products

**Products → Add product**, twice:

**Quantum Therapy Pro**
- Monthly price: $9.99 recurring
- Yearly price: $107.89 recurring (add a second price to the same product)

**Quantum Therapy Premium**
- Monthly price: $19.99 recurring
- Yearly price: $215.89 recurring

Copy each of the four price IDs. They look like `price_1Qxxxxxxxxxxxxxx`.

> If you skip this, the app still works. It falls back to creating products and
> prices on the fly at first checkout, which is what the Manus build did. Setting
> them explicitly is cleaner and keeps your Stripe dashboard readable.

### 3b. Keys

**Developers → API keys**:

| Stripe field | Goes into |
|---|---|
| Secret key | `STRIPE_SECRET_KEY` |
| Publishable key | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |

Plus the four price IDs into `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY`,
`STRIPE_PRICE_PREMIUM_MONTHLY`, `STRIPE_PRICE_PREMIUM_YEARLY`.

### 3c. Webhook

Do this **after** your first Vercel deploy, because you need the live URL.

**Developers → Webhooks → Add endpoint**:

- Endpoint URL: `https://app.quantumtherapy.app/api/stripe/webhook`
- Events to send:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

Copy the **Signing secret** (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.

> This bit me in the old build and it will bite again: if you ever switch Stripe
> from test mode to live mode, the webhook secret changes. Update the environment
> variable in Vercel and redeploy, or subscriptions will silently stop upgrading
> accounts.

---

## Step 4: GoHighLevel (optional)

The CRM sync is one way, app to GHL. Skip this and everything else still works.

In GHL: **Settings → Private Integrations → Create**. Give it Contacts read and
write scope. Copy the token (`pit-...`) into `GHL_API_KEY`, and your sub-account
location ID into `GHL_LOCATION_ID`.

The seven custom field IDs from the old build are already hard coded in
`lib/ghl.ts`, so if you point this at the same sub-account, tier, status, signup
date, last login, total sessions, last session date and app user ID all keep
flowing exactly as before.

---

## Step 5: Vercel (hosting)

### 5a. Import

Go to [vercel.com/new](https://vercel.com/new), import
`betterbranding/quantum-therapy`. Vercel detects Next.js on its own, so leave
every build setting alone.

### 5b. Environment variables

Before the first deploy, open **Environment Variables** and paste in everything from
your `.env.local`, applied to Production, Preview and Development.

Set `NEXT_PUBLIC_SITE_URL` to your real domain, `https://app.quantumtherapy.app`.
This one is easy to forget and it controls Stripe redirect URLs, the sitemap and
canonical tags.

### 5c. Deploy

Click **Deploy**. The first build takes two to four minutes. Protocol pages are
rendered on request and then cached at the edge, so the build stays quick even
though the library has 1,395 of them.

> The repo also still contains the original `index.html` landing page and
> `QuantumTherapy.png` at the root. Vercel detects the Next.js app and ignores
> them, so if you serve that landing page from GitHub Pages today, it keeps
> working exactly as it does now.

### 5d. Domain

**Project → Settings → Domains → Add**, enter `app.quantumtherapy.app`.

Vercel gives you a CNAME. Add it wherever quantumtherapy.app's DNS lives:

```
Type:  CNAME
Name:  app
Value: cname.vercel-dns.com
```

Certificates issue automatically within a few minutes.

> Using the `app.` subdomain keeps your existing marketing site on the root domain
> untouched. If you would rather the app take the root domain, you can, but then
> the landing page needs a new home first.

---

## Step 6: Post-deploy checklist

Work through this in order. Each one catches a different class of failure.

- [ ] Home page loads and the hero frequency counter animates
- [ ] Search for "insomnia" returns results
- [ ] Open a protocol, put headphones on, press play, and hear a beat
- [ ] Sign in with a magic link to your own email
- [ ] Check **Supabase → Table Editor → profiles**: your row exists, tier `free`
- [ ] Play a session, then confirm a row appears in `sessions`
- [ ] Subscribe with Stripe test card `4242 4242 4242 4242`
- [ ] Confirm `profiles.subscription_tier` flips to `pro`
- [ ] Check **Stripe → Webhooks**: the event shows a 200 response
- [ ] Visit `/sitemap.xml` and confirm it lists the protocol pages
- [ ] Submit the sitemap in Google Search Console

---

## Step 7: Tell Google about it

This is the step most people skip, and it is where the compounding traffic is.

1. [Google Search Console](https://search.google.com/search-console), add
   `app.quantumtherapy.app` as a property, verify by DNS.
2. Submit `https://app.quantumtherapy.app/sitemap.xml`.
3. Expect indexing to roll in over two to six weeks.

Every one of those 1,395 pages targets a real long tail query, the kind people
actually type: "rife frequency for shingles", "CAFL lyme protocol",
"528 hz binaural". The old app could not rank for any of them because it rendered
entirely in the browser. This one ships each page as HTML with structured data
attached.

---

## Common problems

**Sign in link does nothing.**
The redirect URL is not whitelisted. Supabase → Authentication → URL Configuration,
add the exact callback including `/auth/callback`.

**Subscribed in Stripe but the account is still free.**
The webhook is not landing. Check Stripe → Webhooks → your endpoint → recent
deliveries. A 400 means the signing secret is wrong. A 404 means the URL is wrong.
A 500 means `SUPABASE_SERVICE_ROLE_KEY` is missing in Vercel.

**No sound on iPhone.**
Check the physical mute switch first, then confirm the volume slider is not at zero.
The app plays a silent audio element on your first tap specifically to get around
the mute switch, but that only works if the tap actually reached the play button.

**Sound in only one ear, or no beat.**
That is binaural working correctly. Each ear gets a slightly different tone, and the
beat only exists once your brain combines them. It requires headphones and it will
never work on a single speaker.

**Search returns nothing after connecting Supabase.**
You have not run `npm run seed`, so the `protocols` table is empty. The API falls
back to the bundled file only when Supabase is entirely absent, not when it is
present and empty.

**Build fails on Vercel with a Supabase error.**
An environment variable is missing or has a stray newline from pasting. Re-paste it,
and make sure there is no trailing whitespace.

---

## Running it day to day

```bash
npm run dev        # local dev server
npm run build      # production build, catches type errors
npm run typecheck  # types only, faster
npm run seed       # reload protocols into Supabase
```

To change protocol data, edit `data/protocols.json` and re-run the seed. To change
the pure tones, edit `data/tones.ts` and re-run the seed.

Every push to `main` deploys to production automatically. Every pull request gets
its own preview URL.
