# 🚨 Critical Fixes (Independent of Alfa Gateway)

These are security/architecture issues that **must be fixed NOW**, regardless of Alfa implementation status. These are NOT payment-gateway-specific.

---

## 1. ✅ Add Input Validation to All API Routes

**Priority:** CRITICAL  
**Time:** 4-6 hours  
**Affects:** All API endpoints (current + future)

### Problem
```typescript
// Currently: No validation on server
export async function POST(req: NextRequest) {
  const body = await req.json(); // ❌ No schema check
  // Malicious/corrupt data goes straight to database
}
```

### Solution
```bash
npm install zod
```

**Create:** `src/lib/validation/schemas.ts`
```typescript
import { z } from "zod";

export const BookingInputSchema = z.object({
  departureId: z.string().uuid("Invalid departure ID"),
  seats: z.number().int().min(1).max(100),
  singleRooms: z.number().int().min(0).max(50),
  contact: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email("Invalid email format"),
    phone: z.string().regex(/^\+?[0-9]{10,15}$/, "Invalid phone number"),
  }),
  participants: z.array(z.object({
    fullName: z.string().min(2).max(100),
    dateOfBirth: z.string().date().optional(),
    cnicOrPassport: z.string().max(20).optional(),
    dietary: z.string().max(100).optional(),
    emergencyContact: z.string().optional(),
  })),
  notes: z.string().max(500).optional(),
});

export type BookingInput = z.infer<typeof BookingInputSchema>;
```

**Use in all API routes:**
```typescript
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate input
    const parsed = BookingInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    
    // Now use parsed.data (type-safe)
    const validatedData = parsed.data;
    // ...process...
    
  } catch (err) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
```

**Apply to:**
- `src/app/api/payments/alfa/initiate/route.ts` (when building)
- `src/app/api/payments/alfa/ipn/route.ts` (when building)
- Any future API routes

---

## 2. ✅ Add CORS Protection

**Priority:** CRITICAL  
**Time:** 2-3 hours  
**Affects:** All API endpoints

### Problem
```typescript
// Currently: APIs accessible from ANY domain
// attacker.com can call your payment APIs with CSRF
```

### Solution

**Create:** `src/middleware.ts`
```typescript
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "https://traversepakistan.com",
  "https://www.traversepakistan.com",
];

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  
  // Only protect API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // For requests with origin header (browser requests)
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
```

**Result:** Only your domain can call `/api/*` endpoints

---

## 3. ✅ Move Form Validation to Server

**Priority:** CRITICAL  
**Time:** 2 hours  
**Affects:** Booking form security

### Problem
```typescript
// Currently: Only validated in browser
function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Anyone can bypass this with DevTools console:
// - Disable JavaScript
// - Modify fetch request
// - Change email/phone in network tab
```

### Solution

**Never trust client validation.** Always validate on server before DB insert.

```typescript
// In API route (when creating booking):
const parsed = BookingInputSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ errors: parsed.error }, { status: 400 });
}

// Zod ensures:
// - Email is valid format
// - Phone matches pattern
// - Strings aren't too long
// - Numbers in correct range
// - Required fields present
```

**Update BookingWizard component** (optional, for better UX):
```typescript
// Keep client validation for instant feedback
// BUT add server validation as safety net
// Show errors from server, not just client

if (!res.ok) {
  const errors = await res.json();
  setError(errors.errors?.contact?.email?.[0] || "Invalid data");
}
```

---

## 4. ✅ Add Error Logging & Monitoring

**Priority:** CRITICAL  
**Time:** 3-4 hours  
**Affects:** Debugging, security monitoring, incidents

### Problem
```typescript
// Currently: Errors silently fail or log to console
export async function POST(req: NextRequest) {
  try {
    const booking = await createBooking(data);
  } catch (err) {
    console.error(err); // ❌ Only logs to server console
    return NextResponse.json({ error: "Failed" }, { status: 500 });
    // No audit trail, no alerts, no investigation possible
  }
}
```

### Solution

**Create:** `src/lib/logger.ts`
```typescript
interface LogContext {
  userId?: string;
  bookingRef?: string;
  departureId?: string;
  [key: string]: any;
}

export const logger = {
  info: (message: string, context?: LogContext) => {
    const log = {
      level: "INFO",
      timestamp: new Date().toISOString(),
      message,
      ...context,
    };
    console.log(JSON.stringify(log));
    // TODO: Send to Datadog/CloudWatch
  },

  error: (message: string, error?: Error, context?: LogContext) => {
    const log = {
      level: "ERROR",
      timestamp: new Date().toISOString(),
      message,
      errorMessage: error?.message,
      errorStack: error?.stack,
      ...context,
    };
    console.error(JSON.stringify(log));
    // TODO: Alert Slack/PagerDuty for critical errors
  },

  warning: (message: string, context?: LogContext) => {
    const log = {
      level: "WARN",
      timestamp: new Date().toISOString(),
      message,
      ...context,
    };
    console.warn(JSON.stringify(log));
  },
};
```

**Use in API routes:**
```typescript
export async function POST(req: NextRequest) {
  try {
    logger.info("Creating booking", { ip: req.ip });
    const booking = await createBooking(data);
    logger.info("Booking created", { bookingRef: booking.bookingRef });
    return NextResponse.json(booking);
    
  } catch (err) {
    logger.error(
      "Failed to create booking",
      err instanceof Error ? err : new Error(String(err)),
      { ip: req.ip }
    );
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

**Benefits:**
- Searchable logs for debugging
- Audit trail for compliance
- Alerts for critical errors
- Monitoring dashboard

---

## 5. ✅ Add Rate Limiting to All APIs

**Priority:** CRITICAL  
**Time:** 2-3 hours  
**Affects:** All API endpoints (DoS protection)

### Problem
```typescript
// Currently: No limit on requests
// Attacker can spam:
// - 1000 booking requests
// - 1000 payment attempts
// - Overwhelm Alfa Bank
```

### Solution - Option A: Simple In-Memory (Good for MVP)

**Create:** `src/lib/ratelimit.ts`
```typescript
interface RateLimit {
  count: number;
  resetAt: number;
}

const limits = new Map<string, RateLimit>();

export function checkRateLimit(key: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const existing = limits.get(key);

  if (!existing || now > existing.resetAt) {
    limits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= maxRequests) {
    return false;
  }

  existing.count++;
  return true;
}
```

**Use in API routes:**
```typescript
import { checkRateLimit } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  const ip = req.ip || "127.0.0.1";
  
  // Max 10 requests per minute per IP
  if (!checkRateLimit(`booking:${ip}`, 10, 60000)) {
    return NextResponse.json(
      { error: "Too many requests. Try again in 1 minute." },
      { status: 429 }
    );
  }
  
  // Process booking...
}
```

### Solution - Option B: Upstash Redis (Production)

```bash
npm install @upstash/ratelimit @upstash/redis
```

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 per minute
});

export async function POST(req: NextRequest) {
  const ip = req.ip || "127.0.0.1";
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  
  // Process...
}
```

**Apply to:**
- All `/api/*` routes
- Payment endpoints especially

---

## 6. ✅ Improve Email & Phone Validation

**Priority:** HIGH  
**Time:** 1 hour

### Problem
```typescript
// Email regex accepts: x@y.c, invalid@domain (too permissive)
// Phone accepts: 123abc789012 (strips non-digits, too loose)
```

### Solution - Improve Validation Schema

```typescript
// In src/lib/validation/schemas.ts

export const ContactSchema = z.object({
  name: z.string()
    .min(2, "Name too short")
    .max(100, "Name too long")
    .regex(/^[a-zA-Z\s'-]+$/, "Name contains invalid characters"),
  
  email: z.string()
    .email("Invalid email format")
    .max(254, "Email too long"), // RFC 5321
  
  phone: z.string()
    .regex(
      /^(\+92|0)?[3][0-9]{2}[0-9]{7}$/,
      "Invalid Pakistani phone number (e.g., +923001234567 or 03001234567)"
    ),
});
```

**Pakistan phone format:**
- `+923001234567` (international)
- `03001234567` (local)
- `923001234567` (without +)

All 3 formats should work.

---

## 7. ✅ Add Request Timeouts

**Priority:** HIGH  
**Time:** 1 hour  
**Affects:** All fetch() calls (prevent hanging)

### Problem
```typescript
// Currently: Infinite timeout
const response = await fetch(url);
// If server hangs: request never completes, causes memory leak
```

### Solution

**Create:** `src/lib/api-client.ts`
```typescript
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
) {
  const { timeout = 10000, ...fetchOptions } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    return await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
```

**Use in API routes:**
```typescript
import { fetchWithTimeout } from "@/lib/api-client";

export async function POST(req: NextRequest) {
  try {
    // 5 second timeout for external API calls
    const response = await fetchWithTimeout(
      alfaConfig.hsUrl,
      { method: "POST", timeout: 5000 }
    );
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        { error: "Payment gateway timeout. Please try again." },
        { status: 504 }
      );
    }
    throw err;
  }
}
```

---

## 8. ✅ Prevent Booking Overbooking (Concurrency)

**Priority:** HIGH  
**Time:** 4-6 hours  
**Affects:** Supabase RPC function

### Problem
```
Race condition scenario:
Tour has 5 seats left
User A: Booking 3 seats (request 1)
User B: Booking 3 seats (request 2)
Both succeed! = 6 people booked (OVERBOOKING)
```

### Solution - Supabase RPC with Row Locking

**Modify Supabase RPC** (`create_booking` function):

```sql
CREATE OR REPLACE FUNCTION create_booking(
  p_departure_id UUID,
  p_seats INTEGER,
  p_single_rooms INTEGER,
  p_contact_name TEXT,
  p_contact_email TEXT,
  p_contact_phone TEXT,
  p_participants JSONB,
  p_notes TEXT
)
RETURNS TABLE (
  booking_id UUID,
  booking_ref TEXT,
  total_amount NUMERIC
) AS $$
DECLARE
  v_seats_available INTEGER;
  v_booking_id UUID;
  v_booking_ref TEXT;
  v_total_amount NUMERIC;
BEGIN
  -- Lock the departure row to prevent race conditions
  SELECT max_seats - seats_booked INTO v_seats_available
  FROM departures
  WHERE id = p_departure_id
  FOR UPDATE; -- This locks the row
  
  -- Check if seats available
  IF v_seats_available < p_seats THEN
    RAISE EXCEPTION 'Only % seats available', v_seats_available;
  END IF;
  
  -- Create booking within transaction
  INSERT INTO bookings (
    departure_id,
    seats,
    single_rooms,
    contact_name,
    contact_email,
    contact_phone,
    notes,
    status,
    created_at
  ) VALUES (
    p_departure_id,
    p_seats,
    p_single_rooms,
    p_contact_name,
    p_contact_email,
    p_contact_phone,
    p_notes,
    'pending',
    NOW()
  )
  RETURNING id, booking_ref, total_amount
  INTO v_booking_id, v_booking_ref, v_total_amount;
  
  -- Update departure seat count
  UPDATE departures
  SET seats_booked = seats_booked + p_seats
  WHERE id = p_departure_id;
  
  -- Return result
  RETURN QUERY SELECT v_booking_id, v_booking_ref, v_total_amount;
END;
$$ LANGUAGE plpgsql;
```

**Result:** Only one booking at a time per departure (no overbooking)

---

## 9. ✅ Environment Variable Safety

**Priority:** MEDIUM  
**Time:** 1 hour

### Problem
```typescript
// Currently: Returns empty string if missing
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// Silent failure - hard to debug
```

### Solution

**Update:** `src/lib/supabase/env.ts`
```typescript
function getEnvVar(name: string): string {
  const value = process.env[name];
  
  if (!value) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing required environment variable: ${name}`);
    } else {
      console.warn(`⚠️  Missing environment variable: ${name}`);
    }
  }
  
  return value || "";
}

export const SUPABASE_URL = getEnvVar("NEXT_PUBLIC_SUPABASE_URL");
export const SUPABASE_ANON_KEY = getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY");

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
```

**Result:** 
- Production fails fast with clear error
- Development warns in console

---

## 10. ✅ Refactor BookingWizard Component

**Priority:** MEDIUM  
**Time:** 8-10 hours  
**Affects:** Code maintainability

### Problem
```typescript
// BookingWizard.tsx = 1058 lines
// Hard to test, debug, understand
// Contains: validation, payment logic, state, UI
```

### Solution - Split into:

```
src/components/booking/
├── BookingWizard.tsx (wrapper/orchestrator)
├── steps/
│   ├── StepDates.tsx (Step 1)
│   ├── StepTravelers.tsx (Step 2)
│   ├── StepContact.tsx (Step 3)
│   └── StepReview.tsx (Step 4)
├── hooks/
│   ├── useBookingState.ts (state management)
│   ├── useBookingValidation.ts (validation logic)
│   ├── usePaymentHandler.ts (payment logic)
│   └── usePricingCalculation.ts (pricing logic)
└── types/
    └── booking.ts (shared types)
```

Each component: 100-200 lines, single responsibility, testable

---

## Quick Implementation Checklist

```bash
# 1. Add Zod validation
npm install zod

# 2. Create validation schemas
touch src/lib/validation/schemas.ts
# Copy schemas from section 1

# 3. Add middleware for CORS
touch src/middleware.ts
# Copy middleware from section 2

# 4. Add logger
touch src/lib/logger.ts
# Copy logger from section 4

# 5. Add rate limiting
touch src/lib/ratelimit.ts
# Copy ratelimit from section 5

# 6. Add API client with timeout
touch src/lib/api-client.ts
# Copy from section 7

# 7. Update Supabase RPC
# Modify create_booking function (section 8)

# 8. Test everything
npm run build
npm run lint
```

---

## Implementation Order (Recommended)

```
Day 1-2:
├─ Input validation (Zod schemas) - 4h
├─ Logger - 2h
└─ CORS middleware - 2h

Day 3:
├─ Rate limiting - 2h
├─ Request timeouts - 1h
└─ Phone/email validation - 1h

Day 4-5:
├─ Environment variable safety - 1h
├─ Booking concurrency (RPC fix) - 4h
└─ Testing & verification - 2h

Day 6-7:
├─ BookingWizard refactor (optional but recommended) - 8h
└─ Code review & deployment
```

---

## Files to Modify

```
CRITICAL (Must Do):
✅ Create: src/lib/validation/schemas.ts (new)
✅ Create: src/middleware.ts (new)
✅ Create: src/lib/logger.ts (new)
✅ Create: src/lib/ratelimit.ts (new)
✅ Modify: All /api/payments/* routes (add validation + logging)
✅ Modify: Supabase RPC create_booking function

HIGH PRIORITY (Should Do):
✅ Create: src/lib/api-client.ts (new)
✅ Modify: src/lib/supabase/env.ts (add validation)
✅ Modify: src/lib/validation/schemas.ts (improve email/phone)

CODE QUALITY (Nice to Do):
✅ Refactor: src/components/booking/ (split component)
✅ Add: Unit tests for validation
```

---

## Testing After Implementation

```bash
# 1. Zod validation test
curl -X POST http://localhost:3000/api/test-booking \
  -H "Content-Type: application/json" \
  -d '{"seats":"not-a-number"}' \
# Should return 400 with validation errors

# 2. CORS test
curl -X POST http://localhost:3000/api/test-booking \
  -H "Origin: https://attacker.com" \
  -H "Content-Type: application/json" \
  -d '{}' \
# Should return 403

# 3. Rate limit test (10 per minute)
for i in {1..15}; do curl http://localhost:3000/api/test; done
# First 10 succeed, next 5 return 429

# 4. Timeout test
# Long-running endpoint should timeout after 5s

# 5. Logs test
# Check logs are structured JSON with timestamps

npm run build  # Should build without errors
npm run lint   # Should lint without warnings
```

---

## Summary

| Fix | Time | Difficulty | Impact | Status |
|-----|------|-----------|--------|--------|
| Input Validation | 4h | Medium | Prevents data corruption | Critical |
| CORS Protection | 2h | Easy | Prevents CSRF | Critical |
| Error Logging | 3h | Medium | Debugging + compliance | Critical |
| Rate Limiting | 2h | Easy | DoS protection | Critical |
| Form Validation (Server) | 2h | Easy | Security | Critical |
| Phone/Email Validation | 1h | Easy | Data quality | High |
| Request Timeouts | 1h | Easy | Reliability | High |
| Booking Concurrency | 4h | Hard | Prevents overbooking | High |
| Env Var Safety | 1h | Easy | Debugging | Medium |
| Component Refactor | 8h | Medium | Code quality | Medium |
| **TOTAL** | **28h** | - | **6 Critical** | ✅ |

**You can build Alfa in parallel. These fixes are independent and will make your code production-ready.**

---

**Last Updated:** April 24, 2026  
**Status:** Ready for Implementation
