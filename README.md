# Prime Green Landscape 🌿

**Visit-based recurring lawn care platform** serving Montgomery County, MD.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange?logo=firebase)](https://firebase.google.com)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-blueviolet?logo=stripe)](https://stripe.com)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://vercel.com)

---

## Business Model

| Principle | Detail |
|---|---|
| **Service** | Weekly & biweekly residential lawn mowing |
| **Billing** | Charged per completed visit — never in advance |
| **Contracts** | None. Cancel anytime. |
| **Coverage** | Montgomery County, MD (Gaithersburg, Rockville, Bethesda, Germantown, Potomac, Silver Spring) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS |
| Auth | Firebase Authentication |
| Database | Cloud Firestore |
| Payments | Stripe (SetupIntents + off-session PaymentIntents) |
| Deployment | Vercel |
| Scheduling | Custom `ensureRollingVisits` engine — maintains exactly 8 future visits per plan |

---

## Key Architecture Decisions

- **`scheduledDate`** (Firestore Timestamp) is the single source of truth for all visit dates
- **Billing fires once** per visit — only on `completionStatus → "completed"` transition
- **`visitId` as Stripe idempotency key** — prevents duplicate charges
- **Clients cannot create visits** — all scheduling is server-side only (enforced by Firestore rules + API gates)
- **Skip flow** — client requests → admin approves → `skipSource: "client_request_approved"` set, schedule rolls forward
- **Change-day** — deletes future scheduled visits (never mark-as-skipped), regenerates 8 fresh visits

---

## Project Structure

```
app/
  (auth)/         # Login + Register with split-panel layout
  admin/          # Admin portal (Today's Route, All Visits, Requests, Failed Charges)
  api/            # All Next.js API Routes (admin, stripe, booking, visits, client, cron)
  dashboard/      # Client portal (Upcoming, History, Settings, Invoices)
  policies/       # TOS, Billing, Cancellation, Skip, Privacy
  page.tsx        # Landing page with instant quote engine

components/       # HeroSection, Navbar, Footer, QuoteResults, BookingModal, etc.
lib/              # Firebase admin, Stripe client, ensureRollingVisits, formatVisitDate
context/          # AuthContext (Firebase Auth)
public/           # Images (optimized JPGs, logo.png)
firestore.rules   # Firestore security rules
```

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in your Firebase + Stripe keys

# 3. Start dev server
npm run dev
# → http://localhost:3000
```

---

## Environment Variables

See `.env.example` for all required variables. Never commit `.env.local` or `.env`.

---

## Production Deployment

This project is deployed on **Vercel**:

1. Import repo at [vercel.com/new](https://vercel.com/new)
2. Set all environment variables from `.env.example`
3. Framework preset: **Next.js** (auto-detected)
4. Deploy — Vercel handles `npm run build` and `npm run start`

**Build command:** `next build`  
**Output directory:** `.next` (auto)  
**Node.js version:** 20.x

---

## Firestore Security Model

- Clients can **read** only their own `users`, `properties`, `servicePlans`, `visits`
- Clients can **update** only `pauseUntil`, `preferredDay`, `updatedAt` on their plan
- Clients can **update** only `clientRequest*` fields on their visits (skip requests)
- Clients **cannot create** visits, properties, or plans directly
- All sensitive operations (complete, charge, approve skip) go through server-side Admin SDK routes

---

## Acceptance Test (Pre-Launch)

- [ ] New booking → card saved → 8 visits generated
- [ ] Skip request → admin approve → correct date in all views
- [ ] Mark complete → Stripe charge fires → `chargeStatus: succeeded`
- [ ] Change preferred day → schedule rebuilds, no phantom skips in history
- [ ] Failed charge → appears in admin Failed Charges → Retry works
- [ ] `GET /api/admin/repair-visit-ids?dry=true` → `mismatches: 0`

---

© 2026 Prime Green Landscape LLC · Gaithersburg, MD

# Build verified: Wed Feb 25 22:28:45 EST 2026
