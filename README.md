# Quantum Therapy

Rife frequency protocols you can actually play. 1,395 protocols and 11,624
frequencies from the Consolidated Annotated Frequency List, delivered as
binaural beat and isochronic sessions with ambient soundscapes.

Rebuilt from the original Manus app as a self-hosted Next.js application on
Supabase and Vercel.

**Full setup and deployment walkthrough: [SETUP.md](./SETUP.md)**

---

## What is in this repo

| Path | What it is |
|---|---|
| `app/`, `components/`, `lib/`, `data/` | The Next.js 15 application |
| `supabase/schema.sql` | Authoritative Postgres schema, RLS policies and functions |
| `scripts/seed.ts` | Loads the 1,395 protocols and 22 tones into Supabase |
| `SETUP.md` | Step by step setup, deployment and troubleshooting guide |
| `index.html`, `QuantumTherapy.png` | The original standalone landing page, untouched |

The landing page files at the root are left exactly as they were. Vercel detects
the Next.js app and ignores them, so anything you serve from them today keeps
working.

## Stack

- **Next.js 15** App Router, React 19, TypeScript
- **Tailwind CSS 4** with a custom dark "resonance field" design system
- **Motion** for animation
- **Supabase** for Postgres, auth (magic link and Google) and row level security
- **Web Audio API** for playback, rendered as pre-computed stereo buffers
- **Stripe** for Pro and Premium subscriptions
- **GoHighLevel** for one-way contact sync
- **Vercel** for hosting

## How the audio works

- One global `AudioContext`, unlocked with a silent `<audio>` element so iOS
  Safari cooperates.
- Each step is rendered into a pre-computed stereo `AudioBuffer` rather than
  wired through a `ChannelMergerNode`, which removes the clicks and drift the
  original build had.
- Below 1500 Hz the session uses **binaural** delivery, a small offset between
  the ears. At or above 1500 Hz it switches to **isochronic** pulsing, because
  binaural separation stops being perceivable up there.
- Pro adds optional Grounding (7.83 Hz), Clearing (10000 Hz) and Lock-In
  (524 Hz) phases, plus offline WAV export of the whole session.

## Tiers

| | Free | Pro | Premium |
|---|---|---|---|
| Price | $0 | $9.99/mo | $19.99/mo |
| Sessions | 10 per month | Unlimited | Unlimited |
| Ambient soundscapes | 1 | 5 | 5 |
| Session phases | | Yes | Yes |
| WAV download | | Yes | Yes |
| Session history and analytics | | | Yes |

Monthly limits are enforced server side in Postgres, not in the browser.

## Local development

```bash
git clone https://github.com/betterbranding/quantum-therapy.git
cd quantum-therapy
npm install
cp .env.example .env.local   # fill in your keys
npm run dev
```

The app runs without any keys at all: protocol search falls back to the bundled
`data/protocols.json`, and auth and billing simply stay signed out. Add Supabase
keys and it upgrades to server side search and accounts automatically.

```bash
npm run typecheck   # tsc --noEmit
npm run build       # production build
npm run seed        # load protocols and tones into Supabase
```

## SEO

Every protocol has its own indexable URL at `/protocol/{slug}` with real HTML,
per-page metadata and `MedicalWebPage` structured data. `/sitemap.xml` lists all
1,395 protocol pages and 22 tone pages. The original app rendered entirely in
the browser and could not rank for any of it.

## Disclaimer

Rife frequency protocols are experimental and are not a medical treatment,
diagnosis or cure. This app is for wellness and relaxation only.

---

Built by [Better Branding](https://thebetterbranding.com).
