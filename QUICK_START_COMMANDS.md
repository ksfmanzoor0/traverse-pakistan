# ⚡ Quick Start: 5 Critical Fixes Only

**These 5 fixes take ~12 hours and are foundational for your 3 new APIs**

After these are done, you can build Packages/Group Tours/Hotels APIs using these utilities.

---

## 🚀 Copy & Paste Commands (In Order)

### **FIX #1: Input Validation with Zod (4 hours)**

```bash
cd /Users/kashifmanzoor/Downloads/New\ Website/traverse-pakistan

claude --task "Create Zod validation schemas for booking and API inputs.

File to create: src/lib/validation/schemas.ts

Requirements:
- Import zod
- Create BookingInputSchema with validation for:
  * departureId: z.string().uuid()
  * seats: z.number().int().min(1).max(100)
  * singleRooms: z.number().int().min(0).max(50)
  * contact: z.object({
      name: z.string().min(2).max(100),
      email: z.string().email().max(254),
      phone: z.string().regex(/^(\+92|0)?[3][0-9]{2}[0-9]{7}$/, 'Invalid Pakistani phone')
    })
  * participants: z.array(z.object({
      fullName: z.string().min(2).max(100),
      dateOfBirth: z.string().date().optional(),
      cnicOrPassport: z.string().max(20).optional(),
      dietary: z.string().max(100).optional(),
      emergencyContact: z.string().optional()
    }))
  * notes: z.string().max(500).optional()

- Export BookingInput type using z.infer<typeof BookingInputSchema>

- Create generic ApiErrorSchema:
  * error: z.string()
  * details: z.record(z.string(), z.any()).optional()

Also create: src/lib/validation/index.ts
- Export all schemas and types

Update: package.json
- Add 'zod' dependency: npm install zod"
```

After this completes:
```bash
npm run type-check
npm run build
```

---

### **FIX #2: CORS Protection (2 hours)**

```bash
claude --task "Create CORS middleware to protect all API endpoints.

File to create: src/middleware.ts

Requirements:
- Import NextRequest, NextResponse from next/server
- Define ALLOWED_ORIGINS constant:
  const ALLOWED_ORIGINS = [
    'https://traversepakistan.com',
    'https://www.traversepakistan.com'
  ];

- Create middleware function:
  * Check if request path starts with /api/
  * Get origin from request.headers.get('origin')
  * If origin exists AND not in ALLOWED_ORIGINS: return NextResponse with status 403
  * If no origin or origin is allowed: return NextResponse.next()
  * Add comment explaining CSRF protection

- Export config:
  export const config = {
    matcher: ['/api/:path*']
  };

Add helpful comments:
- Blocks cross-origin requests (CSRF protection)
- Allows server-to-server requests (no origin header)
- Will block requests from attacker.com or other domains"
```

After this completes:
```bash
npm run build
```

---

### **FIX #3: Structured Logging (3 hours)**

```bash
claude --task "Create structured logging service for audit trail and debugging.

File to create: src/lib/logger.ts

Requirements:
- Create interface LogContext:
  interface LogContext {
    userId?: string;
    bookingRef?: string;
    departureId?: string;
    packageId?: string;
    hotelId?: string;
    ip?: string;
    amount?: number;
    [key: string]: any;
  }

- Create logger object with 3 methods:

  info(message: string, context?: LogContext): void
  - Logs level: 'INFO'
  - Include timestamp (ISO 8601)
  - Console output as single-line JSON
  
  error(message: string, error?: Error, context?: LogContext): void
  - Logs level: 'ERROR'
  - Include error.message and error.stack
  - Include timestamp
  - Console output as single-line JSON
  
  warning(message: string, context?: LogContext): void
  - Logs level: 'WARN'
  - Include timestamp
  - Console output as single-line JSON

- Export as: export const logger = { ... }

- Add comments with TODOs:
  // TODO: Integrate with Datadog/CloudWatch for production
  // TODO: Add Slack alerting for critical errors
  // TODO: Add persistent storage (database/file)

Example output format:
  console.log(JSON.stringify({ level: 'INFO', timestamp: '2026-04-24T...', message: 'Booking created', bookingRef: '...' }))

Also create: src/lib/logger/types.ts
- Export LogContext interface
- Export LogLevel type"
```

After this completes:
```bash
npm run type-check
```

---

### **FIX #4: Rate Limiting (2 hours)**

```bash
claude --task "Create in-memory rate limiting for API endpoints.

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
  * If expired or doesn't exist: create new RateLimit with count=1, resetAt=now+windowMs
  * If exists and not expired:
    - If count >= maxRequests: return false (blocked)
    - Otherwise: increment count and return true
  * Return true if allowed, false if rate limited

- Export utility function:
  function getRateLimitKey(ip: string, type: 'booking' | 'payment' | 'hotel' | 'package' | 'tour'): string
  - Returns: '\${type}:\${ip}' (e.g., 'booking:192.168.1.1')

- Add comments:
  // In-memory storage for MVP - upgrade to Redis in production
  // Limits are: 10 requests per 60 seconds per IP
  // Clean up: entries auto-expire based on resetAt time

No dependencies needed (uses native Map)"
```

After this completes:
```bash
npm run type-check
```

---

### **FIX #5: API Client with Timeouts (1 hour)**

```bash
claude --task "Create HTTP client with timeout support.

File to create: src/lib/api-client.ts

Requirements:
- Export async function fetchWithTimeout:
  async function fetchWithTimeout(
    url: string,
    options?: RequestInit & { timeout?: number }
  ): Promise<Response>

  Logic:
  * Extract timeout from options (default: 10000ms)
  * Create AbortController
  * setTimeout to abort after timeout milliseconds
  * Call fetch(url, { ...options, signal: controller.signal })
  * In finally block: clearTimeout
  * If error has name 'AbortError': it's a timeout
  * Return Response object

- Export helper function:
  function isTimeoutError(error: unknown): boolean
  - Returns: error instanceof Error && error.name === 'AbortError'

- Add usage examples in comments:
  // const response = await fetchWithTimeout(url, { 
  //   method: 'POST', 
  //   timeout: 5000 
  // });

- Add comments explaining:
  // Default 10 second timeout prevents hanging requests
  // External payment gateway: use 5 second timeout
  // Supabase: use 10 second timeout"
```

After this completes:
```bash
npm run type-check
```

---

## ✅ Verification After All 5

```bash
# Run all checks
npm run type-check
npm run lint
npm run build

# Should all pass with no errors
```

---

## 📋 Files Created

After running all 5 commands, you'll have:

```
src/lib/
├── validation/
│   ├── schemas.ts (⭐ Main validation file)
│   ├── index.ts (exports)
│   └── types.ts (types)
├── logger.ts (⭐ Logging service)
├── logger/
│   └── types.ts (LogContext type)
├── ratelimit.ts (⭐ Rate limiting)
├── api-client.ts (⭐ Timeout wrapper)
└── middleware.ts (⭐ CORS protection)
```

Plus:
- `src/middleware.ts` (CORS middleware)

---

## 🎯 Total Time: ~12 hours

**One developer can complete all 5 in:**
- Fix 1 (Zod): 4 hours
- Fix 2 (CORS): 2 hours  
- Fix 3 (Logger): 3 hours
- Fix 4 (Rate Limit): 2 hours
- Fix 5 (Timeout): 1 hour
- **Total: 12 hours**

---

## 🚀 What You Can Do After This

Once these 5 fixes are done, you can build Packages/Group Tours/Hotels APIs and they'll:

✅ Use Zod validation automatically  
✅ Have rate limiting built-in  
✅ Have error logging built-in  
✅ Have CORS protection  
✅ Have timeout protection on external calls  

**No additional security work needed for new APIs**

---

## 📝 Example: Using These in Your New APIs

After the 5 fixes are complete, when you build a Packages API:

```typescript
// Import what you need
import { BookingInputSchema } from '@/lib/validation/schemas';
import { checkRateLimit, getRateLimitKey } from '@/lib/ratelimit';
import { logger } from '@/lib/logger';
import { fetchWithTimeout } from '@/lib/api-client';

export async function POST(req: NextRequest) {
  // Rate limiting
  const ip = req.ip || '127.0.0.1';
  if (!checkRateLimit(getRateLimitKey(ip, 'package'), 10, 60000)) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  // Validation
  const parsed = BookingInputSchema.safeParse(await req.json());
  if (!parsed.success) {
    logger.warning('Invalid booking data', { ip, errors: parsed.error });
    return NextResponse.json({ errors: parsed.error }, { status: 400 });
  }

  // Processing with logging
  try {
    logger.info('Processing package booking', { bookingRef: parsed.data.departureId, ip });
    
    // Use fetchWithTimeout for external calls
    const response = await fetchWithTimeout(someUrl, { timeout: 5000 });
    
    logger.info('Package booking created', { bookingRef: '123', ip });
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Failed to create package booking', err instanceof Error ? err : new Error(String(err)), { ip });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

---

## ⏱️ Timeline

```
Week 1:
├─ Mon-Tue: Run Fix #1-5 commands (12 hours)
├─ Verify with npm run build (1 hour)
└─ Commit to git

Week 2:
├─ Build Packages API (using these 5 foundations)
├─ Build Group Tours API
├─ Build Hotels API
└─ All 3 automatically secure & consistent
```

---

## 🎬 How to Run

Pick the first command above (FIX #1), copy it exactly, and paste in terminal:

```bash
cd /Users/kashifmanzoor/Downloads/New\ Website/traverse-pakistan
claude --task "Create Zod validation schemas..."
```

Claude will:
1. Create the files
2. Show you what changed
3. You review and confirm
4. Move to FIX #2

---

**Ready? Copy FIX #1 command and run it! 🚀**
