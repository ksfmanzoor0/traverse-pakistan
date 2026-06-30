# Traverse Pakistan — AI Agent Instructions

Tourism booking platform for traversepakistan.com.
**Stack:** Next.js 16 App Router (Turbopack) · TypeScript strict · Tailwind v4 · Plus Jakarta Sans · Supabase (Postgres + Auth) · Resend (email) · Meta WhatsApp Cloud API (transactional) · Alfa Hosted Checkout (payments) · ImageKit CDN · Vercel.

For a chronological narrative of major work shipped, see [PROGRESS.md](PROGRESS.md).

---

## Non-negotiable rules

1. **No emojis** anywhere — data files, chips, empty states, headings. Use `<Icon>`.
2. **No hex colors** — always `var(--token)`. See [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).
3. **No inline `<svg>`** — icons go through [`<Icon>`](src/components/ui/Icon.tsx).
4. **No `bg-white` / `text-white`** on theme surfaces — use `--bg-primary` / `--on-dark`. Exception: overlays `bg-black/NN` on photographs.
5. **Only 4 radius values:** 8 / 12 / 16 / 9999px via `--radius-{sm,md,lg,full}`.
6. **Motion tokens** — `--duration-fast/normal/slow`, `--ease-default` (Airbnb curve). No `duration-300`.
7. **Services are async** — components import from `src/services/*.service.ts`, never from `src/data/*` directly.
8. **Branch hygiene** — never push directly to `main`; never commit directly to `Dev-Main` (merge-only); always pull latest from origin after switching branches; always `npm run build` before pushing; verify UI on localhost before commit.
9. **Booking creation goes through silent signup** — every booking must call `stampBookingWithUser(bookingRef)` from a server-side route so `auth.users` is provisioned and `bookings.user_id` is stamped. Already wired into all 4 `/api/payments/alfa/initiate*` routes; do not bypass it.

---

## Branch strategy

| Branch | Purpose |
|---|---|
| `main` | Production — never commit directly, PR through Dev-Main |
| `Dev-Main` | Staging — merge-only; preview at sandbox.traversepakistan.com when assigned |
| `Desktop-Frontend` | Desktop UI tweaks |
| `Mobile-Frontend` | Mobile-specific UI; every Desktop-Frontend change must be ported here separately |
| `backend-testing` | Server-side / API / Supabase RPC work |
| `add-data` | Hotels / packages / tours seeding |
| Feature branches | One per coherent feature (e.g. `booking`, `passwordless-signup`); merge full stack together when API and UI are coupled |

Pull from `origin/main` (or feature base) after switching to any branch before doing any work.

---

## File map — where things live

### Routes & pages
- [src/app/](src/app/) — App Router pages
- Destination detail: [src/app/destinations/[slug]/page.tsx](src/app/destinations/[slug]/page.tsx)
- Tour detail: [src/app/grouptours/[slug]/page.tsx](src/app/grouptours/[slug]/page.tsx)
- Package detail: [src/app/packages/[slug]/](src/app/packages/[slug]/)
- Hotel detail: [src/app/hotels/[slug]/page.tsx](src/app/hotels/[slug]/page.tsx)

### UI primitives → [src/components/ui/](src/components/ui/)
`Icon`, `Button`, `Chip`, `Badge`, `StarRating`, `SectionHeader`, `EyebrowLabel`, `EmptyState`, `Reveal`, `Container`, `Carousel`, `Accordion`, `FilterTag`, `PriceDisplay`, `WishlistButton`.

### Domain components
- [src/components/destination/](src/components/destination/) — `DestinationStory`, `MomentCard`, `SeasonCard`
- [src/components/home/](src/components/home/) — homepage sections (`HeroSection`, `WhyUsSection`, `StatsBar`, `DestinationsScroll`, `FeaturedHotels`, `VideoStories`, `ReviewsCarousel`)
- [src/components/tours/](src/components/tours/) — `TourCard`, booking success
- [src/components/packages/](src/components/packages/) — package card, detail, itinerary, booking sidebar
- [src/components/hotels/](src/components/hotels/) — hotel listing, detail, sidebar, checkout
- [src/components/trip-detail/](src/components/trip-detail/) — `MosaicGallery`, `BookingSidebar`, `ItineraryAccordion`
- [src/components/booking/](src/components/booking/) — wizard, trust strip, urgency, FAQ, review quote, mobile reserve bar
- [src/components/layout/](src/components/layout/) — `Navbar`, `Footer`, `Breadcrumb`, `ThemeToggle`, `WhatsAppFAB`, `AwardStrip`, `NavSearchBar`
- [src/components/auth/](src/components/auth/) · [src/components/admin/](src/components/admin/) · [src/components/account/](src/components/account/) · [src/components/seo/](src/components/seo/) · [src/components/quote/](src/components/quote/)

### Data / services / types
- [src/data/](src/data/) — TS data (destinations, tours, regions, hotels, reviews, blog, travel-styles, faqs, packages, itinerary)
- [src/services/](src/services/) — `*.service.ts`, async. Phase 2: swap body to Supabase, components stay
- [src/types/](src/types/) — TS interfaces. `WhyVisitCard.icon` is typed as `IconName` (from `Icon.tsx`). `BookingStatus` / `RefundStatus` literal-types in [booking-status.ts](src/types/booking-status.ts).
- [src/lib/](src/lib/) — `utils.ts` (cn, formatPrice, slugify, getWhatsAppUrl), `constants.ts`, `supabase/`, `seo/`, `auth/`, `whatsapp/`, `email/`, `alfa/`, `payments/`, `imageLoader.ts`
- [src/styles/fonts.ts](src/styles/fonts.ts) — Plus Jakarta Sans

### Auth, bookings, payments — server-side primitives

- [src/lib/supabase/server.ts](src/lib/supabase/server.ts) — `getSupabaseServer()` (cookie-aware, for user-context reads) and `getSupabaseAdmin()` (service-role, bypasses RLS)
- [src/lib/auth/](src/lib/auth/)
  - `phone.ts` — E.164 normalize + `synthesizeEmailFromPhone(phone)` → `wa-{digits}@traverse.internal`
  - `findOrCreateUser.ts` — silent admin-create with `email_confirm: true` + `user_metadata { verified_via_otp: false, origin: "silent_checkout" }`
  - `stampBookingWithUser.ts` — best-effort hook called from all 4 initiate routes; populates `bookings.user_id`
  - `requireBookingOwner.ts` — guard for booking-action routes: requires session + verified_via_otp + user_id match
- [src/lib/whatsapp/cloud.ts](src/lib/whatsapp/cloud.ts) — Meta Cloud API client; env-gated (no-ops if `META_WHATSAPP_TOKEN` unset); two senders: `sendOtpViaWhatsApp` (auth template) and `sendBookingConfirmedViaWhatsApp` (utility template)
- [src/lib/email/](src/lib/email/) — `resend.ts` (lazy client init, `FROM` env-overridable), `sendBookingConfirmation.ts` (generates magic link, dispatches to email + WhatsApp), templates
- [src/lib/alfa/](src/lib/alfa/) — config + hash helpers for Alfa Hosted Checkout
- [src/lib/payments/markBooking.ts](src/lib/payments/markBooking.ts) — IPN-triggered status updates across all 3 booking tables

### Auth flow (passwordless)

1. **Booking checkout** — user enters contact + pays. Server (`/api/payments/alfa/initiate*`) calls `stampBookingWithUser` which silent-creates an `auth.users` row keyed by email (or synthesized email if phone-only) and stamps `booking.user_id`.
2. **Payment confirmed** — IPN triggers `sendBookingConfirmation`, which mints a Supabase magic-link token via `auth.admin.generateLink` and sends `${SITE}/auth/callback?token_hash=...&next=/bookings/{ref}` via Resend email (if real email) + WhatsApp Cloud API.
3. **User clicks magic link** — [/auth/callback](src/app/auth/callback/route.ts) consumes the token, flips `verified_via_otp = true`, redirects to `next`.
4. **User opens /bookings/[ref] cold** — [server-side gate](src/app/bookings/[ref]/page.tsx) checks session + verified_via_otp + user_id; missing → redirects to `/bookings/find?next=/bookings/{ref}`.
5. **Find-booking** — [/bookings/find](src/app/bookings/find/page.tsx) takes email or phone, sends OTP via chosen channel. Verify route mints a magic-link token, client calls `supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })` → real session.

### Auth routes
- `POST /api/bookings/otp` — `{ identifier, channel }` (channel: `email` | `whatsapp`); always 200 to prevent enumeration
- `PUT  /api/bookings/otp` — `{ identifier, code }`; on success returns `{ tokenHash, type: 'magiclink' }` and flips `verified_via_otp`
- `GET  /auth/callback` — handles both OAuth `code` and magic-link `token_hash`; sets session cookies
- `GET/POST/PATCH /api/bookings/[ref]/...` — gated by `requireBookingOwner`

---

## Common tasks → file to open

| Task | Open |
|------|------|
| Add a new icon | [icon-map.ts](src/components/ui/icon-map.ts) — import + add to `iconMap` |
| Add a new destination | [src/data/destinations.ts](src/data/destinations.ts) — use `IconName` tokens, include `opening` |
| Change brand color | [src/app/globals.css](src/app/globals.css) — update the token, both light + dark blocks |
| Add a section header with eyebrow | Use `<SectionHeader eyebrow="..." title="..." />` |
| Empty state | Use `<EmptyState icon="..." title="..." description="..." action={...} />` |
| Add a seasonal tint | Already derived in [SeasonCard.tsx](src/components/destination/SeasonCard.tsx) from `season` name — don't add per-destination |
| Scroll-reveal wrap | `<Reveal delayMs={60}>…</Reveal>` (respects `prefers-reduced-motion`) |
| Send something via WhatsApp | Use `sendOtpViaWhatsApp` / `sendBookingConfirmedViaWhatsApp` from [cloud.ts](src/lib/whatsapp/cloud.ts) — env-gated, safe to call when not configured |
| Gate a booking action by ownership | Wrap route in `requireBookingOwner(ref)` from [requireBookingOwner.ts](src/lib/auth/requireBookingOwner.ts); the `ok: false` branch returns a ready `NextResponse` |
| Add a new package | See "Adding a new package — checklist" below |
| Add a new hotel | Add slug to `SUPABASE_HOTEL_SLUGS` in [hotel.service.ts](src/services/hotel.service.ts) + insert rows into 6 Supabase tables. **Never** add new hotels to static data. |

---

## Authoring checklist before committing UI

- No emojis in diff (`rg '[\u{1F300}-\u{1F9FF}]'`)
- No hex in diff (`rg '#[0-9A-Fa-f]{3,6}\b'`)
- No new inline `<svg>` (`rg '<svg' src/`)
- Toggled `data-theme="dark"` and verified
- `npm run build` passes

---

## Commands

```bash
npm run dev    # Dev server (Turbopack) on :3000
npm run build  # Production build, static-generates ~570 pages
npm run lint   # ESLint
```

---

## Environment variables

Required for full functionality. Most are also set in [.env.example](.env.example).

### Core
- `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL` — base URL for the deployment (e.g. `https://traversepakistan.com`, `https://sandbox.traversepakistan.com`). Used by SEO canonicals AND magic-link URLs in confirmation emails/WhatsApp. **Critical per deploy** — wrong value breaks sign-in flow from preview emails.

### Email (Resend)
- `RESEND_API_KEY` — required for OTP + booking confirmation send
- `EMAIL_FROM` — optional override; defaults to `Traverse Pakistan <info@traversepakistan.com>`. Domain must be verified in Resend (info@ alias does not need to actually exist as a mailbox).

### WhatsApp (Meta Cloud API) — optional; client no-ops when unset
- `META_WHATSAPP_TOKEN` — system user permanent token
- `META_WHATSAPP_PHONE_ID` — phone number ID from WhatsApp Manager
- `META_WHATSAPP_TEMPLATE_OTP` — authentication template name (default `verification_code`)
- `META_WHATSAPP_TEMPLATE_BOOKING_CONFIRMED` — utility template name (default `booking_confirmed`)

### Payments (Alfa Hosted Checkout)
- `ALFA_MERCHANT_ID` · `ALFA_STORE_ID` · `ALFA_MERCHANT_HASH` · `ALFA_MERCHANT_USERNAME` · `ALFA_MERCHANT_PASSWORD` · `ALFA_KEY1` · `ALFA_KEY2`
- `ALFA_SANDBOX` — defaults to true unless set to `"false"` explicitly

### Domain assignments
- `sandbox.traversepakistan.com` → currently assigned to `passwordless-signup` branch in Vercel. Reassign in **Settings → Domains** when promoting feature branches.

---

## Brand quick-ref

- Pakistan's highest-rated tourism company — 4.9 ★ · 1,300+ reviews · TripAdvisor Travelers' Choice 2025
- Phone `+92-321-6650670` · WhatsApp `923216650670` · Office E-11/1, Islamabad
- Image host: `https://traversepakistan.com/wp-content/uploads/` (`images.unoptimized: true` in [next.config.ts](next.config.ts) due to upstream SSL)

---

## Package data — current state

### Package IDs in use: pkg-1 → pkg-56

| Range | Region | Notes |
|-------|--------|-------|
| pkg-1 – pkg-14 | Gilgit-Baltistan / KPK | Hunza, Fairy Meadows, Chitral, Skardu (original set) |
| pkg-15 – pkg-30 | Gilgit-Baltistan / KPK | Kaghan, Kumrat, Hunza extensions (added in bulk) |
| pkg-31 – pkg-40 | Gilgit-Baltistan | Skardu — 10 packages (4-day flights → 8-day road epics) |
| pkg-41 – pkg-43 | Balochistan | Gwadar / Makran Coast — 3 packages |
| pkg-44 – pkg-48 | Sindh | Karachi day trip, Mohen Jo Daro, Sindh circuit, 10-day & 12-day historical tours |
| pkg-49 – pkg-51 | KPK / Swat | Malam Jabba 3-day winter, Swat+Kalam+Malam Jabba 4-day, Malam Jabba+Kalam 5-day winter |
| pkg-52 – pkg-56 | Azad Kashmir | Neelam Valley — Arrang Kel, Ratti Galli, Taobut (3–7 day, ISB & Lahore departures) |

**Next package ID: pkg-57**

### Neelam Valley packages (pkg-52–56) — key conventions
- `destinationSlug: "neelam-valley"`, `regionSlug: "azad-kashmir"`
- KHI pricing = null for all (no direct Karachi departure)
- ISB and LHR priced separately; lahore: 0 placeholder for ISB-only packages too — confirm per package
- All pricing currently 0 (placeholder) — fill before launch
- Images use MEDIA CDN: `${MEDIA}/destinations/{arang-kel,keran,ratti-galli,sharda,neelam-valley}/cover.jpg`
- Taobut hotels: `shabistan-inn-taobut` (hotel-28), `corner-view-guest-house-taobut` (hotel-29)

### Skardu packages (pkg-31–40) — key conventions
- `destinationSlug: "skardu"` except pkg-34 (`"astore"` + `relatedDestinationSlugs: ["skardu", "deosai"]`)
- Flight packages: ISB and LHR priced separately (+5k LHR vs ISB); KHI = null on road packages
- Road packages via Naran/Babusar: described as "Naran & Babusar" route, not "KKH"
- Pricing range: 225k–545k deluxe/luxury per person

### Gwadar / Makran packages (pkg-41–43) — key conventions
- `destinationSlug: "makran"`, `regionSlug: "balochistan"`
- KHI is primary departure for all three; ISB/LHR travelers add 1 night KHI each way (+2 days total)
- KHI prices are the base; ISB = LHR prices (same flight cost differential)
- Pricing: deluxe KHI 125k–175k, deluxe ISB/LHR 225k–295k, luxury KHI 145k–195k, luxury ISB/LHR 265k–395k

### Adding a new package — checklist
1. Add entry to [src/data/packages.ts](src/data/packages.ts) with next `pkg-N` id
2. Add itinerary to [src/data/package-itineraries.ts](src/data/package-itineraries.ts) matching `packageSlug`
3. Ensure hotel slugs in `hotels` field exist in [src/data/hotels.ts](src/data/hotels.ts)
4. Run `npm run build` — confirms static page generated

---

## Hotels — current state

### Hotel IDs in use: hotel-1 → hotel-29

| ID | Slug | Destination | Tier |
|----|------|-------------|------|
| hotel-1 | eagles-nest-hotel | hunza | premium |
| hotel-2 | luxus-hunza-attabad-lake | hunza | luxury |
| hotel-3 | shangrila-resort-skardu | skardu | premium |
| hotel-4 | nanga-parbat-base-camp-hotel | fairy-meadows | standard |
| hotel-5 | swat-serena-hotel | swat | luxury |
| hotel-6 | concordia-hotel-skardu | skardu | deluxe |
| hotel-7 | glamp-pakistan-deosai | skardu | premium |
| hotel-8 | sadaf-resort-gwadar | **gwadar** | deluxe |
| hotel-9 | pc-gwadar | **gwadar** | luxury |
| hotel-10 | haft-talar-resort-ormara | **ormara** | deluxe |
| hotel-11 | gidan-beach-resort-ormara | **ormara** | luxury |
| hotel-12 | lokal-karachi | **karachi** | deluxe |
| hotel-13 | ambiance-karachi | **karachi** | luxury |
| hotel-24 | shabistan-inn-arrang-kel | **arang-kel** | deluxe |
| hotel-25 | wanderlust-arrang-kel | **arang-kel** | premium |
| hotel-26 | keran-riverside-resort | **keran** | deluxe |
| hotel-27 | green-village-resort-upper-neelam | **keran** | deluxe |
| hotel-28 | shabistan-inn-taobut | **taobut** | deluxe |
| hotel-29 | corner-view-guest-house-taobut | **taobut** | standard |
| hotel-30 | himmel-skardu | **shigar** | luxury |

**Next hotel ID: hotel-31**

### Gwadar/Makran hotel destinations
`gwadar`, `ormara`, and `karachi` are valid destination slugs confirmed by the user. `makran` is the **region** — do not use it as a hotel `destinationSlug`.

### Glamp Pakistan Deosai (hotel-7) — special notes
- Located at Bara Pani inside Deosai National Park at 4,114m
- Deluxe room: "Standard Glamps"; Luxury room: "Arch of View"
- `destinationSlug: "skardu"` (no separate Deosai destination slug exists in static data)

---

## Pending / known gaps

- **Gwadar media images not yet uploaded** — `media.traversepakistan.com/destinations/gwadar/`, `/ormara/`, `/karachi/` all 404. Currently using WP uploads for all Gwadar package and hotel images. Once uploaded, update `images[]` in packages.ts, hotels.ts and `heroImage` in destinations.ts.
- **Kashmir media images** — `media.traversepakistan.com/destinations/arang-kel/`, `/keran/`, `/ratti-galli/`, `/sharda/` CDN paths used in pkg-52–56. Upload images before launch.
- **Skardu packages itineraries (pkg-31–40)** — package-itineraries.ts entries not yet written for these. Gwadar (pkg-41–43) itineraries are complete.
- **Pricing on pkg-41–43** — single supplements are estimates (~15% of deluxe KHI). Confirm if adjustment needed.
- **Pricing on pkg-52–56** — all tiers currently 0 placeholder. Fill before launch.
- **Hotel IDs 14–23 gap** — hotel-24 through hotel-29 are Kashmir hotels; IDs 14–23 may be assigned to Sindh/other hotels added in a prior session not reflected here.
- **Himmel Skardu off-season rates** — Sep 15 onwards rates not yet received; add a third season when available.
- **Himmel Skardu cover image** — `media.traversepakistan.com/hotels/himmel-skardu/cover.jpg` must be uploaded before launch.
