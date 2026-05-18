# STEP 3 (REVISED): Smart Logging - 3 High-Impact Areas Only

**Better approach:** Focus on what actually matters for debugging and accountability.

---

## 📋 3 High-Impact Areas

### 1. **Audit Trail (Must-Have)** 🔐
Log sensitive/destructive actions only:
- `booking_created` - User booked a tour
- `booking_cancelled` - User cancelled their booking
- `payment_initiated` - Payment attempt started
- `payment_confirmed` - Payment succeeded
- `user_data_modified` - Personal info changed
- `validation_failed` - Suspicious bad data

**Why:** If there's a dispute about a booking or payment, you have proof.

### 2. **Structured JSON (Should-Have)** 📊
Use Pino (lightweight, fast, JSON) instead of `console.log`.

**Why:** When you integrate with Datadog/BetterStack later, you can search by `actionType`, `bookingRef`, `ip`, etc. instantly.

### 3. **Request ID (Pro-Tip)** 🔍
Assign unique ID to every request.

**Why:** User reports "My booking disappeared!" → Search request ID → See entire trace from API call through database.

---

## 🚀 Updated STEP 3 Command

```bash
claude --task "Create production-ready logging with Pino library, focused on audit trail and request tracing.

Step 1: Create src/lib/logger/types.ts

Export interfaces:
  interface AuditAction {
    booking_created
    booking_cancelled
    booking_confirmed
    payment_initiated
    payment_confirmed
    payment_failed
    user_data_modified
    validation_failed
    rate_limit_exceeded
    cors_blocked
    [key: string]: string
  }

  interface AuditLog {
    requestId: string;
    timestamp: string; (ISO 8601)
    actionType: keyof AuditAction;
    userId?: string;
    bookingRef?: string;
    ip?: string;
    amount?: number;
    details?: Record<string, any>;
    error?: {
      message: string;
      stack?: string;
      code?: string;
    };
  }

Step 2: Create src/lib/logger/index.ts

Requirements:
- Install Pino: npm install pino

- Create function getOrCreateRequestId():
  * Check if request context has requestId
  * If not, generate with crypto.randomUUID()
  * Return UUID string (e.g., '550e8400-e29b-41d4-a716-446655440000')

- Create logger instance:
  import pino from 'pino';
  
  export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        levelFirst: true,
        singleLine: false,
        timestampKey: 'timestamp'
      }
    }
  });

- Create audit function:
  export function logAudit(
    action: keyof AuditAction,
    data: {
      requestId: string;
      userId?: string;
      bookingRef?: string;
      ip?: string;
      amount?: number;
      details?: Record<string, any>;
      error?: Error;
    }
  ): void
  
  Logic:
  * Call logger.info() with:
    - level: 'audit'
    - actionType: action
    - requestId: data.requestId
    - timestamp: new Date().toISOString()
    - userId, bookingRef, ip, amount (if provided)
    - details (if provided)
    - error message and stack (if error provided)
  
  Example output:
    {
      'level': 30,
      'time': 1703524800000,
      'pid': 1234,
      'hostname': 'production-server',
      'level_label': 'audit',
      'actionType': 'booking_created',
      'requestId': '550e8400-e29b-41d4-a716-446655440000',
      'bookingRef': 'TP-2024-001',
      'amount': 50000,
      'timestamp': '2026-04-24T10:00:00Z',
      'msg': 'Audit: booking_created'
    }

- Create error logging function:
  export function logError(
    message: string,
    error: Error | unknown,
    requestId: string,
    context?: Record<string, any>
  ): void
  
  Logic:
  * Call logger.error() with:
    - message
    - requestId
    - errorMessage: error.message
    - errorStack: error.stack
    - errorCode: error.code
    - context object

Step 3: Create src/lib/request-id.ts

Requirements:
- Import crypto from 'crypto' (built-in)
- Create AsyncLocalStorage for request context:
  import { AsyncLocalStorage } from 'async_hooks';
  
  interface RequestContext {
    requestId: string;
  }
  
  export const requestContext = new AsyncLocalStorage<RequestContext>();

- Create function getRequestId():
  * Get value from requestContext.getStore()
  * If exists, return requestContext.getStore()?.requestId
  * If not, return 'unknown' (fallback)
  * Return string

- Create function generateRequestId():
  * Use crypto.randomUUID()
  * Return UUID string

- Create middleware helper:
  export function createRequestIdMiddleware() {
    return (req: NextRequest) => {
      const requestId = crypto.randomUUID();
      requestContext.run({ requestId }, () => {
        // Continue with next handler
      });
    }
  }

Step 4: Create src/middleware-logger.ts

Requirements:
- This is a middleware to attach request ID to all requests
- Import requestContext from src/lib/request-id
- Import { NextRequest, NextResponse } from next/server

- Create middleware:
  export function middleware(request: NextRequest) {
    const requestId = crypto.randomUUID();
    const headers = new Headers(request.headers);
    headers.set('x-request-id', requestId);
    
    const response = NextResponse.next({
      request: { headers }
    });
    
    return response;
  }

- Export config:
  export const config = {
    matcher: ['/api/:path*']
  };

Step 5: Create usage examples file src/lib/logger/examples.ts

Add comments with these examples:

  // Example 1: Log a booking creation
  import { logger, logAudit } from '@/lib/logger';
  
  logAudit('booking_created', {
    requestId: req.headers.get('x-request-id') || 'unknown',
    bookingRef: 'TP-2024-001',
    userId: user.id,
    ip: req.ip,
    amount: 50000,
    details: { seats: 2, departure: 'Islamabad' }
  });

  // Example 2: Log an error
  logError(
    'Failed to create booking',
    err,
    req.headers.get('x-request-id') || 'unknown',
    { seats: 2, departureId: '123' }
  );

  // Example 3: Log validation failure
  logAudit('validation_failed', {
    requestId: req.headers.get('x-request-id') || 'unknown',
    ip: req.ip,
    details: { field: 'email', reason: 'invalid format' }
  });

  // Example 4: Log rate limit exceeded
  logAudit('rate_limit_exceeded', {
    requestId: req.headers.get('x-request-id') || 'unknown',
    ip: req.ip,
    details: { endpoint: '/api/bookings', limit: 10 }
  });

Step 6: Update package.json

Add dependencies:
- npm install pino
- npm install pino-pretty (for development - pretty-prints JSON)

Step 7: Create .env.local example

Add:
  LOG_LEVEL=info

Install pino:
npm install pino pino-pretty"
```

---

## ✅ What You Get

| Feature | Purpose | Example |
|---------|---------|---------|
| **Audit Trail** | Track important actions | booking_created, payment_confirmed |
| **Request ID** | Trace entire request | 550e8400-e29b-41d4-a716-446655440000 |
| **Structured JSON** | Easy filtering later | Search by `actionType: 'payment_failed'` |

---

## 📊 Output Example

When you log a booking:

```json
{
  "level": 30,
  "time": 1703524800000,
  "level_label": "audit",
  "actionType": "booking_created",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "bookingRef": "TP-2024-001",
  "amount": 50000,
  "ip": "192.168.1.1",
  "timestamp": "2026-04-24T10:00:00Z",
  "details": {
    "seats": 2,
    "departure": "Islamabad"
  },
  "msg": "Audit: booking_created"
}
```

When something fails:

```json
{
  "level": 50,
  "level_label": "error",
  "time": 1703524800000,
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Failed to create booking",
  "errorMessage": "No seats available",
  "errorCode": "BOOKING_FULL",
  "ip": "192.168.1.1",
  "context": {
    "seats": 2,
    "departureId": "123"
  },
  "msg": "Error: Failed to create booking"
}
```

---

## 🎯 In Your API Endpoints

```typescript
import { logAudit, logError } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || 'unknown';

  try {
    // ... validation code ...

    const booking = await createBooking(data);

    // ✅ Log the important action
    logAudit('booking_created', {
      requestId,
      bookingRef: booking.bookingRef,
      amount: booking.totalAmount,
      ip: req.ip
    });

    return NextResponse.json(booking);

  } catch (err) {
    // ✅ Log errors with full context
    logError('Failed to create booking', err, requestId, {
      seats: data.seats,
      departureId: data.departureId
    });

    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

---

## 🔄 Later Integration (When Needed)

When you're ready to integrate with professional log viewer:

### Datadog
```typescript
// Just add this to your logger config
// No code changes needed
import DD from 'datadog-browser-logs';
```

### BetterStack
```typescript
// Send your Pino logs to BetterStack
// JSON format already supported
```

### Supabase Logs
```typescript
// Store audit logs in database
// Use structured JSON format
```

**No rework needed** - your logs are already production-ready.

---

## ✅ Why This Approach Works

| Aspect | Benefit |
|--------|---------|
| **Audit Trail** | Accountability - "Show me what happened to this booking" |
| **Request ID** | Traceability - Search one ID, see entire request history |
| **JSON format** | Future-proof - Works with any log viewer later |
| **Pino library** | Simple - Not overkill, industry standard |
| **Minimal logging** | No noise - Only log what matters |

---

## ⏱️ Time Estimate

- Install Pino: 5 minutes
- Create logger files: 1 hour
- Create middleware: 30 minutes
- **Total: 1.5 hours** (instead of 3 hours)

---

## 🚀 Next: Skip to STEP 4 (Rate Limiting)

Once this is done, your logging is:
- ✅ Production-ready
- ✅ Integrates with any tool later
- ✅ Focused on what matters
- ✅ No over-engineering

---

**This is the right approach.** Much better than generic logging. 👍
