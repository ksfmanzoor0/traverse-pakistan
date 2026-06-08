# Project Progress

Chronological narrative of major work shipped on traversepakistan.com. Newest at top.

For session-to-session memory (architectural decisions, preferences, naming conventions), see the [memory directory](.claude/memory/) — those files load automatically into every Claude session.

---

## 2026-05-21 — Passwordless signup, PR-1

**Branch:** `passwordless-signup` (from Dev-Main) → preview at sandbox.traversepakistan.com
**Status:** Shipped, awaiting end-to-end test on preview

Every booking now silently provisions a Supabase `auth.users` row keyed by the contact email (or `wa-{phone-digits}@traverse.internal` synthesized email if phone-only). Bookings are stamped with `user_id`. After payment, the confirmation email + WhatsApp message contain a magic link that signs the user in on click. Lost the link? `/bookings/find` accepts email-or-phone and sends a 6-digit OTP through whichever channel — verify mints a Supabase token, client signs in.

**Key files:**
- `src/lib/auth/` (new) — `phone.ts`, `findOrCreateUser.ts`, `stampBookingWithUser.ts`, `requireBookingOwner.ts`
- `src/lib/whatsapp/cloud.ts` (new) — env-gated Meta Cloud API client
- `src/app/auth/callback/route.ts` — extended to handle both OAuth code and magic-link token_hash
- `src/app/bookings/[ref]/page.tsx` — converted to server component with session gate
- `src/app/bookings/find/page.tsx` — smart input + channel chooser
- Removed: `BookingVerifyGate`, `OtpModal`, `/api/bookings/verify` (orphaned by session-based gating)

**Migration applied (Supabase):**
- Wiped test data across all booking tables + `booking_otps`
- Indexes on `user_id` for booking tables
- `booking_otps.auth_user_id` + `booking_otps.channel` columns
- `find_auth_user_by_contact(email, phone)` RPC (service_role only)

**Deferred to PR-2:** RLS policies + flip user-facing reads from service_role to anon client + session.

**Deferred to PR-3:** Google OAuth + account/profile screens. Identity merge across silent → OAuth will work automatically because silent users are created with `email_confirm: true`.

**Deferred entirely:** Phone-identity claim flow (linking phone-only synthesized accounts to later OAuth signins). Out of scope until phone-only bookings become common.

---

## 2026-05-20 — View My Booking (email-only), PR shipped

**Branch:** `booking` (from Dev-Main) → merged to Dev-Main

First version of post-payment booking management. Email OTP only; WhatsApp deferred until Cloud API number provisioned.

- `/bookings/find` lookup by ref + email
- `/bookings/[ref]` detail page with edit-name and cancel actions
- OTP via Resend with single-click resend + 30s cooldown
- Booking confirmation email triggered from IPN
- `booking_status` + `refund_status` literal-type columns added across all 3 booking tables
- 6 new API routes under `/api/bookings/`

Email OTP working in production after `RESEND_API_KEY` set + `traversepakistan.com` verified in Resend. `EMAIL_FROM` made env-overridable so we could test with `onboarding@resend.dev` before DNS verified.

---

## 2026-05-19 — Alfa Hosted Checkout integration

**Branch:** `alfa-hosted-checkout` (parked, not merged)

Migrated from redirect-based SSO to Alfa's hosted checkout (jQuery + CryptoJS + HostedCheckoutPayments.js). Several debugging cycles to resolve:
- jQuery and CryptoJS load order (sequential DOM injection in useEffect after form mounts)
- `#dvFailed`, `#failedMsg` DOM elements required by Alfa's script
- `#InitiateTrans` button starts hidden — Alfa FetchKeys reveals it after key handshake
- Phone field `allow_numeric` class blocked `+` prefix — removed

Working end-to-end in sandbox. Not merged to Dev-Main; sandbox flow on `booking` / `passwordless-signup` branches still uses the original redirect-based SSO.

---

## 2026-05-18 — ImageKit CDN integration

**Branch:** `imagekit` → merged to Dev-Main

Solved Vercel Hobby plan image quota (1k/mo, 402 errors when exceeded). Migrated to ImageKit as the optimization CDN with R2 as origin. Custom Next.js image loader at `src/lib/imageLoader.ts` rewrites `media.traversepakistan.com/...` to `ik.imagekit.io/traversepakistan/...?tr=w-{w},q-{q},f-auto`. Verified ~50% size reduction in practice.

Also fixed:
- Page-navigation flicker in `Reveal` component (3-state model: hidden / immediate / animated via `useLayoutEffect` for above-fold)
- White-flash on route transition (removed `opacity: 0` from `page-enter` animation)
- Next.js custom-loader width warnings

---

## 2026-05-15 — Multi-room hotel booking

**Branches:** `feature/multi-room-booking` (data/API) + `responsive` (mobile bar)

Hotels now support multiple room types per booking. New `hotel_booking_rooms` table linking to `hotel_bookings`. Sidebar + mobile reserve bar display individual room cards with remove action.

---

## Branch reference

| Branch | Purpose | Status |
|---|---|---|
| `main` | Production | Never commit directly |
| `Dev-Main` | Staging — merge target | Merge-only |
| `passwordless-signup` | PR-1 auth scaffolding | sandbox.traversepakistan.com |
| `Desktop-Frontend` | Desktop UI changes | Active |
| `Mobile-Frontend` | Mobile UI changes — must port every Desktop change | Active |
| `backend-testing` | Server/API/RPC work | Active |
| `add-data` | Hotel/package/tour seeding | Active |
| `alfa-hosted-checkout` | Hosted checkout integration | Parked, not merged |
| `imagekit` | CDN integration | Merged |
| `booking` | View My Booking PR-0 | Merged |

---

## Known pending items

- **WhatsApp Cloud API**: new phone number to be provisioned; existing `+92-321-6650670` cannot be migrated. Once live, set `META_WHATSAPP_*` env vars on the relevant branches.
- **Alfa IPN whitelisting**: ~2026-06-05. Fallback handles confirmation until then.
- **RLS rollout (PR-2)**: deferred; service_role currently bypasses RLS everywhere; need to add policies + flip user-facing reads to anon + session.
- **Mobile port of passwordless flow**: pending after PR-1 merges.

For the long tail (image uploads, pricing fills, package itinerary gaps), see the "Pending / known gaps" section of [CLAUDE.md](CLAUDE.md).
