# 🔐 Security Fixes Priority List

## Quick Summary
- **Critical Issues:** 4
- **High Issues:** 4
- **Medium Issues:** 5
- **Low Issues:** 5
- **Estimated Fix Time:** 30-40 hours
- **Risk Level:** 🔴 **CRITICAL** - Payment system vulnerable

---

## 🚨 CRITICAL (Fix Immediately)

### Issue #1: IPN Webhook Not Verified ⚠️ PAYMENT AT RISK
**File:** `src/app/api/payments/alfa/ipn/route.ts`  
**Impact:** Attackers can fake payments, confirm bookings without payment  
**Time:** 4-6 hours

**Quick Fix:**
```typescript
// Add signature verification from Alfa Bank
// Implement HMAC-SHA256 check
// Add idempotency key (use booking_ref)
// Add webhook audit logging
```

---

### Issue #2: Payment API Has No Authentication
**File:** `src/app/api/payments/alfa/initiate/route.ts`  
**Impact:** Anyone can trigger payment requests, bot spam  
**Time:** 3-4 hours

**Quick Fix:**
```typescript
// Add CSRF token validation
// Add rate limiting per IP (10 req/min)
// Add request logging
// Validate Zod schema on input
```

---

### Issue #3: Missing Zod/Input Validation
**Files:** All API routes  
**Impact:** Malicious data in bookings, corrupted database  
**Time:** 4-6 hours

**Quick Fix:**
```typescript
import { z } from "zod";

const BookingSchema = z.object({
  departureId: z.string().uuid(),
  seats: z.number().int().min(1).max(50),
  contact: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    phone: z.string().regex(/^\+?[0-9]{10,15}$/),
  }),
  // ... validate ALL fields
});

// Validate in every API route:
const parsed = BookingSchema.safeParse(body);
if (!parsed.success) return NextResponse.json({ errors: parsed.error }, 400);
```

---

### Issue #4: Rotate Alfa Bank Credentials NOW
**File:** `.env` and `.env.example`  
**Impact:** If repo was public, credentials compromised  
**Time:** 1 hour (emergency)

**Immediate Action:**
1. Log into Alfa Bank admin portal
2. Rotate ALL credentials:
   - Merchant ID
   - Merchant Hash
   - Merchant Username
   - Merchant Password
   - Key1, Key2
3. Move to AWS Secrets Manager
4. Delete from git history:
```bash
git-filter-repo --invert-paths --path .env.local
```

---

## 🟠 HIGH (Fix Before Launch)

### Issue #5: No Rate Limiting
**Time:** 2-3 hours
```typescript
npm install @upstash/ratelimit
# Then add to all /api/payments routes
```

### Issue #6: Form Validation Only Client-Side
**Time:** 2 hours
```typescript
// Move validation logic to server before DB insert
// Use Zod on server
// Never trust client-side validation
```

### Issue #7: Missing CORS Policy
**Time:** 2 hours
```typescript
// middleware.ts
const allowedOrigins = [
  "https://traversepakistan.com",
  "https://www.traversepakistan.com",
];
// Reject requests from other origins
```

### Issue #8: No Booking Concurrency Control
**Time:** 4-6 hours
```typescript
// Supabase RPC: Lock row before checking seats
// Use: FOR UPDATE in SQL
// Prevent: Race condition overbooking
```

---

## 🟡 MEDIUM (Fix Soon)

### Issue #9: No Error Logging/Audit Trail
**Time:** 3-4 hours
```typescript
// Create @/lib/logger.ts
// Log: All payment updates, API access, errors
// Send: Alerts to Slack/PagerDuty for critical errors
```

### Issue #10: BookingWizard Component Too Large
**Time:** 8-10 hours
```typescript
// Split 1058 lines into:
// - 5-6 smaller components
// - 3-4 custom hooks
// - Better testability
```

### Issue #11: No Webhook Idempotency
**Time:** 2 hours
```typescript
// Use UPSERT instead of INSERT
// Prevent duplicate bookings from retried webhooks
```

### Issue #12: Inadequate Error Handling
**Time:** 2-3 hours
```typescript
// Add try-catch to all async operations
// Log errors before returning to client
// Don't expose internal error messages
```

### Issue #13: Missing Request Timeouts
**Time:** 1 hour
```typescript
// Add 5-10 second timeouts to all fetch() calls
// Prevent hanging requests
```

---

## 🟢 LOW (Nice to Have)

### Issue #14: Phone Number Validation Too Loose
**Time:** 30 minutes
- Use Pakistani phone format validation
- Verify: Starts with +92 or 0, followed by 3XX-XXXXXXX

### Issue #15: Email Validation Regex Weak
**Time:** 30 minutes
- Use `z.string().email()` from Zod
- Better than custom regex

### Issue #16: dangerouslySetInnerHTML in JsonLd
**Time:** 1 hour
- Currently safe (static data)
- If user input → sanitize with DOMPurify

### Issue #17: Missing .env Validation
**Time:** 1 hour
- Warn if Supabase not configured
- Throw in production if required vars missing

### Issue #18: No TypeScript Strict Null Checks
**Time:** 30 minutes
- Already enabled ✅

---

## Implementation Order

```
Week 1 (Critical):
├─ [ ] Rotate Alfa Bank credentials (1h - EMERGENCY)
├─ [ ] Add webhook signature verification (6h)
├─ [ ] Add Zod validation to all API routes (6h)
├─ [ ] Add CSRF + rate limiting (4h)
└─ [ ] Test payment flow end-to-end (2h)

Week 2 (High):
├─ [ ] Add CORS policy (2h)
├─ [ ] Move validation to server (2h)
├─ [ ] Fix concurrency control (6h)
├─ [ ] Add error logging/audit trail (4h)
└─ [ ] Implement webhook idempotency (2h)

Week 3 (Medium):
├─ [ ] Refactor BookingWizard (10h)
├─ [ ] Add request timeouts (1h)
├─ [ ] Fix phone/email validation (1h)
└─ [ ] Security testing (4h)
```

---

## How to Check Each Issue

### 1. Check for webhook security
```bash
grep -n "ipn/route.ts" src/app/api/payments/alfa/ipn/route.ts
# Look for: verifyAlfaSignature, HMAC check → NOT FOUND ❌
```

### 2. Check for Zod schemas
```bash
grep -r "z.object\|z.string" src/app/api/payments/
# Should have validation → NOT FOUND ❌
```

### 3. Check for rate limiting
```bash
grep -r "ratelimit\|@upstash" src/app/api/
# Should limit requests → NOT FOUND ❌
```

### 4. Check for CORS
```bash
grep -r "Access-Control\|CORS\|allowedOrigins" src/
# Should reject cross-origin → NOT FOUND ❌
```

### 5. Check for audit logging
```bash
grep -r "logger\|audit\|log\(" src/app/api/payments/
# Should log state changes → MINIMAL ❌
```

---

## Testing After Fixes

```bash
# 1. Test webhook security
curl -X POST http://localhost:3000/api/payments/alfa/ipn \
  -H "Content-Type: application/json" \
  -d '{"url":"https://attacker.com/fake"}'
# Should reject (no signature)

# 2. Test rate limiting
for i in {1..15}; do curl http://localhost:3000/api/payments/alfa/initiate; done
# Should reject after 10 requests

# 3. Test input validation
curl -X POST http://localhost:3000/api/payments/alfa/initiate \
  -H "Content-Type: application/json" \
  -d '{"booking":{"seats":"not-a-number"}}'
# Should reject (Zod validation)

# 4. Test CSRF protection
curl -X POST http://localhost:3000/api/payments/alfa/initiate \
  -H "Origin: https://attacker.com"
# Should reject (CORS)
```

---

## Security Checklist Before Production

- [ ] All CRITICAL issues fixed
- [ ] Credentials rotated
- [ ] npm audit passes (no vulnerabilities)
- [ ] Manual penetration testing completed
- [ ] Load testing passed (10,000 concurrent users)
- [ ] Error logging verified
- [ ] Webhook signature verification tested
- [ ] Rate limiting verified
- [ ] CSRF protection verified
- [ ] Input validation verified
- [ ] Database concurrency locks tested
- [ ] Incident response plan documented
- [ ] PagerDuty/Slack alerts configured
- [ ] Backup/restore procedure tested

---

## Estimated Costs

| Category | Items | Hours | Cost (@ $50/hr) |
|----------|-------|-------|-----------------|
| Critical | 4 issues | 18 | $900 |
| High | 4 issues | 16 | $800 |
| Medium | 5 issues | 20 | $1,000 |
| Low | 5 issues | 4 | $200 |
| Testing & QA | - | 12 | $600 |
| **Total** | **18 issues** | **70 hours** | **$3,500** |

---

## Red Flags

🚩 **Stop everything if you see:**
- Credentials in git history
- Public GitHub repository with `.env` files
- Payment API documentation publicly accessible
- Webhook handling production data in staging
- No database backups
- No rollback plan
- Single point of failure in payment processing

---

**Last Updated:** April 24, 2026  
**Status:** ⚠️ Production NOT Ready  
**Next Step:** Schedule security fix sprint
