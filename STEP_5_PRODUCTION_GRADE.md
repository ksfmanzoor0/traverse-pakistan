# STEP 5 (PRODUCTION-GRADE): API Client with Modern Timeout Pattern

**3 key enhancements for production readiness**

---

## 🎯 3 Production Enhancements

### **1. Body Read Coverage** (Critical)
```typescript
// ❌ WRONG: Only times out connection, not response body
const response = await fetch(url);
const data = await response.json(); // Could hang forever here

// ✅ RIGHT: Timeout covers entire operation
const response = await fetch(url, { signal: controller.signal });
const data = await response.json(); // Also covered by timeout
```

### **2. AbortSignal.timeout()** (Simpler)
```typescript
// ❌ OLD: Manual AbortController
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

// ✅ NEW: Modern API (cleaner)
const signal = AbortSignal.timeout(5000);
const response = await fetch(url, { signal });
```

### **3. Idempotency Keys** (For Payments)
```typescript
// Prevent double-charging on retry
const idempotencyKey = crypto.randomUUID();
const response = await fetch(url, {
  headers: { 'Idempotency-Key': idempotencyKey },
  signal: AbortSignal.timeout(5000)
});
```

---

## 🚀 COMMAND: Production-Grade STEP 5

```bash
cd /Users/kashifmanzoor/Downloads/New\ Website/traverse-pakistan

claude --task "Create production-grade HTTP client with modern timeout pattern and body read coverage.

File to create: src/lib/api-client.ts

Requirements:

PART 1: Type Definitions
- Export interface FetchOptions:
  interface FetchOptions extends RequestInit {
    timeout?: number;
    idempotencyKey?: string;
    retryable?: boolean;
  }

- Export interface ApiResponse:
  interface ApiResponse<T = unknown> {
    ok: boolean;
    status: number;
    data?: T;
    error?: string;
  }

PART 2: Main fetchWithTimeout Function
- Export async function fetchWithTimeout<T = unknown>(
    url: string,
    options?: FetchOptions
  ): Promise<Response>

  Logic:
  * Extract timeout from options (default: 10000ms = 10 seconds)
  * Extract idempotencyKey from options (optional)
  * Extract retryable from options (default: false)

  * Create signal using AbortSignal.timeout(timeout):
    const signal = AbortSignal.timeout(timeout);
    // This automatically handles cleanup - no need for manual clearTimeout

  * Build headers:
    const headers = new Headers(options?.headers);
    if (idempotencyKey) {
      headers.set('Idempotency-Key', idempotencyKey);
    }

  * Call fetch with signal INCLUDED:
    const response = await fetch(url, {
      ...options,
      headers,
      signal
    });

  * IMPORTANT: The signal covers:
    - Connection timeout ✓
    - Response body read timeout ✓ (response.json(), response.text())
    - All streaming operations ✓

  * Return response (caller handles response.json(), response.text())

  * Catch AbortError:
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError(\`Request to \${url} timed out after \${timeout}ms\`);
    }

PART 3: Helper Functions
- Export class TimeoutError extends Error:
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }

- Export function isTimeoutError(error: unknown): boolean:
  return error instanceof TimeoutError || 
         (error instanceof Error && error.name === 'AbortError');

- Export function getDefaultTimeout(endpoint: string): number:
  // Different timeouts for different operations
  if (endpoint.includes('/payment')) return 10000; // 10s for payments
  if (endpoint.includes('/booking')) return 8000;  // 8s for bookings
  if (endpoint.includes('/search')) return 15000;  // 15s for search/browse
  return 10000; // Default 10s

PART 4: Request Builder (Optional but useful)
- Export function createRequest(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data?: unknown,
    options?: Partial<FetchOptions>
  ): FetchOptions

  Logic:
  * Build headers with Content-Type
  * Set method
  * Add body if data provided (JSON.stringify)
  * Set timeout based on endpoint
  * Generate idempotencyKey for POST/PUT/DELETE
  * Return options object

  Usage example in comments:
    const options = createRequest('/api/bookings', 'POST', booking);
    const response = await fetchWithTimeout('...', options);

PART 5: Comments & Documentation
- Add comments explaining:
  // AbortSignal.timeout() is modern standard (all major browsers support)
  // Automatically handles cleanup - no manual timer management
  // Signal covers both connection AND response body read
  // Idempotency keys prevent double-charging on payment retries
  // Different timeouts for different operations

- Add browser compatibility note:
  // AbortSignal.timeout() supported in:
  // - Chrome 103+
  // - Firefox 102+
  // - Safari 16.4+
  // - Node 17+
  // Fallback to manual AbortController if needed

- Add usage examples:
  // Example 1: Simple GET with timeout
  const response = await fetchWithTimeout('/api/tours');
  const tours = await response.json();

  // Example 2: POST with idempotency key (payments)
  const response = await fetchWithTimeout('/api/payments/initiate', {
    method: 'POST',
    body: JSON.stringify(booking),
    idempotencyKey: crypto.randomUUID(),
    timeout: 10000
  });

  // Example 3: Handling timeout errors
  try {
    const response = await fetchWithTimeout(url);
  } catch (error) {
    if (isTimeoutError(error)) {
      console.error('Request timed out');
      // Show user-friendly error message
    } else {
      console.error('Network error:', error);
    }
  }

PART 6: Error Handling
- When AbortError occurs, convert to TimeoutError:
  catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError(\`Request timed out after \${timeout}ms\`);
    }
    throw error; // Re-throw other errors
  }"
```

Then run:
```bash
npm run type-check
npm run build
```

---

## 📋 3-Phase Implementation Plan

### **Phase 1 (NOW - Development)** ✓
```bash
# Create production-grade API client ← You are here
# Replace all raw fetch() with fetchWithTimeout()

// Old:
const res = await fetch('/api/bookings');

// New:
const res = await fetchWithTimeout('/api/bookings');
```

### **Phase 2 (Testing - Week 2)**
```
Simulate slow network in browser:
1. Open Chrome DevTools
2. Go to Network tab
3. Click throttling dropdown (top left)
4. Select "Slow 3G" or "Custom"
5. Test your API calls
6. Verify timeout errors show properly
7. Verify UI shows error state
```

### **Phase 3 (Monitoring - Later)**
```typescript
// When ready, add to your logger:
import * as Sentry from "@sentry/nextjs";

try {
  const res = await fetchWithTimeout(url);
} catch (error) {
  if (isTimeoutError(error)) {
    logger.warning('Request timeout', { url, timeout: 10000 });
    // Optionally report to Sentry
    Sentry.captureException(error);
  }
}
```

---

## 🎯 Key Improvements

| Feature | Why | When |
|---------|-----|------|
| **Body Read Coverage** | Prevents hanging responses | Now ✓ |
| **AbortSignal.timeout()** | Modern standard, cleaner code | Now ✓ |
| **Idempotency Keys** | Prevents double-charges on retry | Payments ✓ |
| **Custom Timeouts** | Different operations need different limits | Phase 2 |
| **Error Logging** | Monitor timeout frequency | Phase 3 |

---

## 📊 Timeout Strategy

```typescript
// Different endpoints, different timeouts

Browsing/Read operations:
- GET /api/tours → 15 seconds (users browsing, can wait)
- GET /api/hotels → 15 seconds

Booking operations:
- POST /api/bookings → 8 seconds (user expects quick response)
- PUT /api/bookings/:id → 8 seconds

Payment operations:
- POST /api/payments/initiate → 10 seconds (critical, needs time)
- POST /api/payments/confirm → 10 seconds

Use `getDefaultTimeout(endpoint)` to auto-select based on URL
```

---

## ✅ Production Readiness Checklist

After implementing STEP 5:

```
✓ Timeouts cover entire request (connection + body read)
✓ Using modern AbortSignal.timeout()
✓ Idempotency keys for payment retries
✓ Custom timeouts per endpoint type
✓ Error handling with isTimeoutError()
✓ Ready for Phase 2 (network simulation testing)
✓ Ready for Phase 3 (monitoring with Sentry)
```

---

## 🚀 Summary

**Before (Naive):**
```typescript
const res = await fetch(url);
const data = await res.json(); // Could timeout here without coverage
```

**After (Production-Grade):**
```typescript
const res = await fetchWithTimeout(url, {
  timeout: 10000,
  idempotencyKey: crypto.randomUUID()
});
const data = await res.json(); // Covered by timeout ✓
```

---

**Run this STEP 5 command now for production-grade HTTP client!** 🚀
