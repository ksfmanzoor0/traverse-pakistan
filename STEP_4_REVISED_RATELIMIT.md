# STEP 4 (REVISED): Rate Limiting - Selective Not Global

**Better approach:** Apply rate limiting ONLY where it matters - Bookings, Payments, Tours.

---

## 🎯 Why Selective Rate Limiting

```
❌ BAD: Rate limit everything
GET /api/tours → User browsing → Rate limited after 10 requests → User locked out

✅ GOOD: Rate limit only high-value operations
GET /api/tours → User browsing → NO limit (unlimited reads)
POST /api/bookings → User booking → 10 requests/min (prevent abuse)
POST /api/payments/alfa/initiate → User paying → 10 requests/min (prevent spam)
```

---

## 📋 What Gets Rate Limited

**YES - Rate Limit These (State-Changing Operations):**
- `POST /api/bookings` - Creating a booking
- `POST /api/payments/alfa/initiate` - Initiating payment
- `POST /api/tours` - Creating a tour listing
- `PUT /api/bookings/:id` - Modifying a booking
- `DELETE /api/bookings/:id` - Cancelling a booking

**NO - Don't Rate Limit These (Read-Only Operations):**
- `GET /api/tours` - Browsing tours
- `GET /api/hotels` - Browsing hotels
- `GET /api/regions` - Browsing regions
- `GET /api/packages` - Browsing packages
- `GET /api/travel-styles` - Browsing travel styles

---

## 🚀 STEP 4 Command (Revised)

```bash
claude --task "Create in-memory rate limiting for high-value API endpoints only.

File to create: src/lib/ratelimit.ts

Requirements:
- Create interface:
  interface RateLimit {
    count: number;
    resetAt: number;
  }

- Create Map to store limits:
  const limits = new Map<string, RateLimit>();

- Export function checkRateLimit:
  function checkRateLimit(
    key: string,
    maxRequests: number = 10,
    windowMs: number = 60000
  ): boolean
  
  Logic:
  * Get current time with Date.now()
  * Check if key exists in limits and if resetAt expired
  * If expired or doesn't exist: 
    - Create new RateLimit with count=1, resetAt=now+windowMs
    - Return true (allowed)
  * If exists and not expired:
    - If count >= maxRequests: return false (blocked)
    - Otherwise: increment count and return true
  * Return true if allowed, false if rate limited

- Export utility function:
  function getRateLimitKey(ip: string, type: 'booking' | 'payment' | 'tour'): string
  - Returns: '\${type}:\${ip}' (e.g., 'booking:192.168.1.1')

- Add comments:
  // Apply rate limiting ONLY to state-changing operations
  // READ endpoints (GET): No rate limit
  // WRITE endpoints (POST/PUT/DELETE): Rate limit applied
  // Prevents abuse of expensive operations without blocking browsing
  
- Add cleanup function:
  function cleanupExpiredLimits(): void
  - Loop through limits Map
  - Delete entries where resetAt < Date.now()
  - Call this every 5 minutes
  - Prevents memory leak

- Create setInterval for cleanup:
  setInterval(cleanupExpiredLimits, 5 * 60 * 1000); // Every 5 minutes

No dependencies needed (uses native Map)"
```

Then run:
```bash
npm run type-check
```

---

## 📝 Usage in API Routes

**BOOKINGS API - Rate Limited**
```typescript
import { checkRateLimit, getRateLimitKey } from '@/lib/ratelimit';

export async function POST(req: NextRequest) {
  const ip = req.ip || '127.0.0.1';
  
  // ✅ Rate limit POST (creating booking)
  if (!checkRateLimit(getRateLimitKey(ip, 'booking'), 10, 60000)) {
    return NextResponse.json(
      { error: 'Too many booking requests. Try again in 1 minute.' },
      { status: 429 }
    );
  }

  // ... process booking ...
}

export async function GET(req: NextRequest) {
  // ❌ NO rate limit on GET (just browsing)
  // User can read unlimited bookings
  
  // ... fetch and return bookings ...
}
```

**TOURS API - Rate Limited on POST Only**
```typescript
export async function GET(req: NextRequest) {
  // ❌ NO rate limit (browsing tours)
  // Return all tours
}

export async function POST(req: NextRequest) {
  const ip = req.ip || '127.0.0.1';
  
  // ✅ Rate limit POST (creating tour)
  if (!checkRateLimit(getRateLimitKey(ip, 'tour'), 10, 60000)) {
    return NextResponse.json(
      { error: 'Rate limited' },
      { status: 429 }
    );
  }

  // ... create tour ...
}
```

**PAYMENTS API - Rate Limited**
```typescript
export async function POST(req: NextRequest) {
  const ip = req.ip || '127.0.0.1';
  
  // ✅ Rate limit POST (initiating payment)
  if (!checkRateLimit(getRateLimitKey(ip, 'payment'), 10, 60000)) {
    return NextResponse.json(
      { error: 'Too many payment attempts. Try again in 1 minute.' },
      { status: 429 }
    );
  }

  // ... initiate payment ...
}
```

---

## ✅ Benefits of Selective Rate Limiting

| Aspect | Benefit |
|--------|---------|
| **User browsing** | ✅ Can browse unlimited (no friction) |
| **User booking** | ✅ Protected from spam (max 10/min) |
| **User paying** | ✅ Protected from DoS (max 10/min) |
| **Your server** | ✅ Protected from expensive operations spam |
| **No over-blocking** | ✅ Won't lock out legitimate users |

---

## 🎯 Rate Limit Rules

```
Booking requests:
- Legitimate user: 1-3 per minute (normal flow)
- Limit: 10 per minute
- Safety margin: 7x above normal
- Won't affect real users ✓

Payment requests:
- Legitimate user: 1 per booking
- Limit: 10 per minute
- Safety margin: 10x above normal
- Prevents payment spam ✓

Tour requests:
- Admin creating: 1-2 per hour
- Limit: 10 per minute
- Safety margin: 100x above normal
- Won't affect real users ✓
```

---

## 🔍 Real Scenarios

### Scenario 1: User Browsing
```
User visits homepage
  ↓
GET /api/tours → NO rate limit → Returns all tours ✓
GET /api/hotels → NO rate limit → Returns all hotels ✓
GET /api/regions → NO rate limit → Returns all regions ✓

Result: Fast, smooth browsing experience ✓
```

### Scenario 2: User Booking
```
User clicks "Book Tour"
  ↓
POST /api/bookings (attempt 1) → Rate limit check → Allowed ✓
POST /api/bookings (attempt 2 - retry after error) → Allowed ✓
... up to 10 times in 1 minute ...
POST /api/bookings (attempt 11) → Rate limited ✗

Result: Normal user can retry, attacker can't spam ✓
```

### Scenario 3: Attacker Spam
```
Attacker scripts 1000 GET requests to /api/tours
  ↓
Result: All 1000 succeed (they're just reading data)
  ↓
No rate limit triggered ✓ (not harmful)

Attacker scripts 1000 POST requests to /api/bookings
  ↓
Result: First 10 succeed, rest blocked with 429 ✗
  ↓
Rate limit protects your server ✓
```

---

## 🛡️ Protection Without Friction

| Type | Approach | Reason |
|------|----------|--------|
| **Browse/Read** | No limit | Cheap operation, harmless |
| **Book/Post** | Rate limit | Expensive, abuse risk |
| **Pay** | Rate limit | Critical, highest abuse risk |

---

## ⏱️ Time Estimate

- Create rate limiting logic: 1 hour
- Add to booking endpoints: 30 minutes
- Add to payment endpoints: 30 minutes
- **Total: 2 hours** (same as STEP 4)

---

## 📦 Complete Solution

After this STEP 4:
- ✅ Bookings protected from spam
- ✅ Payments protected from DoS
- ✅ Tours protected from abuse
- ✅ Browse operations unlimited (no friction)
- ✅ Legitimate users unaffected
- ✅ Attackers can't abuse expensive operations

---

## 🚀 Perfect Setup

This is production-ready rate limiting:
- **Precise**: Only where needed
- **Safe**: Won't lock out users
- **Effective**: Stops abuse
- **Simple**: In-memory (upgrade to Redis later)

**Run this STEP 4 command now!** ✅
