# 🤖 Claude Code Commands for Critical Fixes

Use these commands with **Claude Code CLI** to implement all critical fixes automatically.

---

## Installation

```bash
# If you haven't installed Claude Code yet
npm install -g @anthropic-ai/claude-code

# Verify installation
claude --version
```

---

## Quick Start

Each command below will:
1. Create/modify files as needed
2. Run linting checks
3. Show you the changes
4. Ask for confirmation

```bash
cd /path/to/traverse-pakistan
```

---

## 🚀 Commands to Run (In Order)

### **STEP 1: Add Zod Validation (4 hours)**

```bash
claude --task "Create Zod validation schemas for booking input. 

File to create: src/lib/validation/schemas.ts

Requirements:
- Import zod
- Create BookingInputSchema with strict validation for:
  * departureId (UUID)
  * seats (1-100)
  * singleRooms (0-50)
  * contact object with name (2-100 chars), email (valid format), phone (10-15 digits, regex pattern)
  * participants array with fullName, dateOfBirth, cnicOrPassport, dietary, emergencyContact
  * notes (max 500 chars, optional)
- Export type BookingInput from schema using z.infer
- Add Pakistani phone validation regex: /^(\+92|0)?[3][0-9]{2}[0-9]{7}$/
- Add email validation with max 254 chars
- Add proper error messages for each field

Also create: src/lib/validation/index.ts
Export all schemas from there for easy imports.

Add to package.json: npm install zod (if not already there)"
```

---

### **STEP 2: Create CORS Middleware (2 hours)**

```bash
claude --task "Create CORS middleware to protect API endpoints.

File to create: src/middleware.ts

Requirements:
- Import NextRequest, NextResponse from next/server
- Define ALLOWED_ORIGINS array with:
  * https://traversepakistan.com
  * https://www.traversepakistan.com
- Create middleware function that:
  * Checks if request is to /api/* routes
  * Gets origin from request headers
  * Returns 403 Forbidden if origin not in ALLOWED_ORIGINS
  * Returns NextResponse.next() if allowed
- Export config with matcher: ['/api/:path*']
- Add comments explaining CSRF protection
- Should allow requests with no origin (server-to-server)

Make sure this is compatible with Next.js 16.2.3"
```

---

### **STEP 3: Create Logger Service (3 hours)**

```bash
claude --task "Create structured logging service for audit trail and debugging.

File to create: src/lib/logger.ts

Requirements:
- Create logger object with methods: info, error, warning
- Each log should include:
  * level (INFO, ERROR, WARN)
  * timestamp (ISO 8601)
  * message
  * context object (userId, bookingRef, departureId, ip, etc.)
- Console output should be JSON formatted (single line)
- Export as default or named export

Each method signature:
  - info(message: string, context?: LogContext)
  - error(message: string, error?: Error, context?: LogContext)
  - warning(message: string, context?: LogContext)

Add comments with TODO for:
- Datadog/CloudWatch integration
- Slack/PagerDuty alerts for critical errors
- Persistent storage

Also create: src/lib/logger/types.ts
With interfaces: LogContext, LogEntry, LogLevel"
```

---

### **STEP 4: Add Rate Limiting (2 hours)**

```bash
claude --task "Create rate limiting for API endpoints (in-memory for MVP).

File to create: src/lib/ratelimit.ts

Requirements:
- Use in-memory Map for rate limiting
- Export checkRateLimit function with signature:
  * checkRateLimit(key: string, maxRequests: number = 10, windowMs: number = 60000): boolean
- Tracks request count per key
- Resets count after windowMs milliseconds
- Returns true if request allowed, false if rate limited
- Auto-cleanup old entries to prevent memory leak

Add interface for RateLimit:
  interface RateLimit {
    count: number;
    resetAt: number;
  }

Add comments for future Upstash Redis migration.

Export utility:
  - getRateLimitKey(ip: string, type: 'booking' | 'payment'): string
  - Returns: 'booking:192.168.1.1' format"
```

---

### **STEP 5: Create API Client with Timeouts (1 hour)**

```bash
claude --task "Create HTTP client with timeout support for all fetch calls.

File to create: src/lib/api-client.ts

Requirements:
- Export fetchWithTimeout function
- Signature: async function fetchWithTimeout(url: string, options?: RequestInit & { timeout?: number })
- Default timeout: 10000ms (10 seconds)
- Use AbortController for timeout
- If timeout occurs, throw error with name 'AbortError'
- Clean up timeout ID in finally block
- Return Response object same as fetch()

Usage example in comments:
  const response = await fetchWithTimeout(url, { 
    method: 'POST', 
    timeout: 5000 
  });

Export helper for handling timeout errors:
  - isTimeoutError(error: unknown): boolean"
```

---

### **STEP 6: Update Booking Validation Schema (1 hour)**

```bash
claude --task "Update and improve email and phone validation in schemas.

File to modify: src/lib/validation/schemas.ts

Requirements:
- Email validation:
  * Use z.string().email()
  * Max 254 chars (RFC 5321)
  * Error message: 'Invalid email format'
- Phone validation:
  * Regex for Pakistani numbers: /^(\+92|0)?[3][0-9]{2}[0-9]{7}$/
  * Accepts: +923001234567, 03001234567, 923001234567
  * Error message: 'Invalid Pakistani phone number (e.g., +923001234567)'
- Name validation:
  * 2-100 characters
  * Regex: /^[a-zA-Z\s'-]+$/
  * Error message: 'Name contains invalid characters'

Add in schema comments examples of valid/invalid inputs"
```

---

### **STEP 7: Update Environment Variable Validation (1 hour)**

```bash
claude --task "Add safety checks for environment variables.

File to modify: src/lib/supabase/env.ts

Requirements:
- Create getEnvVar(name: string): string function
- If variable missing:
  * In production: throw error with message 'Missing required environment variable: NAME'
  * In development: console.warn with message '⚠️ Missing environment variable: NAME'
- Update SUPABASE_URL to use getEnvVar()
- Update SUPABASE_ANON_KEY to use getEnvVar()
- Keep isSupabaseConfigured logic same
- Add comment: 'Fail fast in production, warn in development'

Also create error handling for startup:
- Add try-catch in app initialization if needed"
```

---

### **STEP 8: Add Validation to API Routes (2 hours)**

```bash
claude --task "Add input validation to all API routes using Zod schemas.

Files to modify:
1. src/app/api/payments/alfa/initiate/route.ts (when you build it)
2. src/app/api/payments/alfa/ipn/route.ts (when you build it)
3. Any future API routes

Requirements:
- Import BookingInputSchema from src/lib/validation
- In POST handler:
  1. Parse request body to JSON
  2. Validate with BookingInputSchema.safeParse(body)
  3. If validation fails: return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  4. Use parsed.data (type-safe) for all operations
- Add try-catch for JSON parsing errors
- Log all validation failures with logger.warning()
- Return 400 for validation errors, 500 for server errors
- Never expose internal error messages to client (log internally, show generic message)

Code pattern to follow:
  const parsed = BookingInputSchema.safeParse(body);
  if (!parsed.success) {
    logger.warning('Validation failed', { errors: parsed.error, ip: req.ip });
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 });
  }
  const validData = parsed.data;
  // Use validData for processing"
```

---

### **STEP 9: Add Rate Limiting to API Routes (1 hour)**

```bash
claude --task "Add rate limiting to all API endpoints for DoS protection.

Files to modify:
1. src/app/api/payments/alfa/initiate/route.ts (when you build it)
2. src/app/api/payments/alfa/ipn/route.ts (when you build it)
3. Any other POST endpoints

Requirements:
- Import checkRateLimit from src/lib/ratelimit
- Import getRateLimitKey from src/lib/ratelimit
- In each POST handler, add at start:
  const ip = req.ip || '127.0.0.1';
  if (!checkRateLimit(getRateLimitKey(ip, 'payment'), 10, 60000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in 1 minute.' },
      { status: 429 }
    );
  }
- Booking endpoints: 10 requests per 60 seconds
- Payment endpoints: 10 requests per 60 seconds
- Log rate limit hits: logger.warning('Rate limit exceeded', { ip })

Pattern:
  export async function POST(req: NextRequest) {
    const ip = req.ip || '127.0.0.1';
    if (!checkRateLimit(getRateLimitKey(ip, 'payment'), 10, 60000)) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }
    // Process request
  }"
```

---

### **STEP 10: Add Error Logging to API Routes (2 hours)**

```bash
claude --task "Add comprehensive error logging and audit trail to all API routes.

Files to modify:
1. src/app/api/payments/alfa/initiate/route.ts (when you build it)
2. src/app/api/payments/alfa/ipn/route.ts (when you build it)
3. src/services/booking.service.server.ts

Requirements:
- Import logger from src/lib/logger
- At start of each async function:
  logger.info('Processing [operation name]', { context data })
- Before success response:
  logger.info('[Operation] completed successfully', { bookingRef, amount, status })
- In catch block:
  logger.error('[Operation] failed', error, { context data, ip: req.ip })
- For database operations:
  logger.info('Booking created', { bookingRef, seats, totalAmount })
  logger.info('Booking status updated', { bookingRef, newStatus, previousStatus })

Logging examples:
  // At start
  logger.info('Creating payment initiation request', { 
    ip: req.ip,
    amount: body.amount 
  });
  
  // On success
  logger.info('Payment initiated successfully', {
    bookingRef: summary.bookingRef,
    amount: body.amount,
    timestamp: new Date().toISOString()
  });
  
  // On error
  logger.error('Payment initiation failed', err, {
    amount: body.amount,
    ip: req.ip
  });"
```

---

### **STEP 11: Update Supabase RPC for Concurrency (4 hours)**

```bash
claude --task "Update Supabase create_booking RPC function to prevent overbooking with row locking.

File to create/modify: Migration file for Supabase

Requirements:
- Drop existing create_booking function
- Create new version with:
  * FOR UPDATE clause to lock departure row
  * Check available seats BEFORE insert
  * Raise exception if insufficient seats
  * Insert booking within transaction
  * Update departure seat count atomically
  * Return booking_id, booking_ref, total_amount

SQL pattern:
  SELECT max_seats - seats_booked INTO v_seats_available
  FROM departures
  WHERE id = p_departure_id
  FOR UPDATE;  -- Lock row here
  
  IF v_seats_available < p_seats THEN
    RAISE EXCEPTION 'Only % seats available', v_seats_available;
  END IF;
  
  -- Insert booking
  -- Update departure
  -- Return results

Add error handling for:
- Invalid departure ID
- Negative seats
- Concurrent booking attempts

Include migration comments explaining row locking."
```

---

### **STEP 12: Add Request Timeouts to API Routes (1 hour)**

```bash
claude --task "Add request timeouts to all fetch calls in API routes.

Files to modify:
1. src/app/api/payments/alfa/initiate/route.ts (when building)
2. src/app/api/payments/alfa/ipn/route.ts (when building)
3. Any external API calls

Requirements:
- Import fetchWithTimeout from src/lib/api-client
- Replace all fetch() calls with fetchWithTimeout()
- Set timeouts:
  * External payment gateway: 5-10 seconds
  * Supabase: default (10 seconds)
  * Third-party APIs: 10 seconds
- Handle timeout errors:
  if (err.name === 'AbortError') {
    return NextResponse.json(
      { error: 'Request timeout. Please try again.' },
      { status: 504 }
    );
  }
- Log timeout errors: logger.warning('Request timeout', { url, timeout })

Pattern:
  const response = await fetchWithTimeout(
    alfaConfig.hsUrl,
    { method: 'POST', timeout: 5000 }
  );"
```

---

### **STEP 13: Refactor BookingWizard (Optional - 8 hours)**

```bash
claude --task "Refactor large BookingWizard component (1058 lines) into smaller focused components.

Create new component structure:
src/components/booking/
├── BookingWizard.tsx (50 lines - orchestrator only)
├── steps/
│   ├── StepDates.tsx (Step 1 - date/city selection)
│   ├── StepTravelers.tsx (Step 2 - traveler count)
│   ├── StepContact.tsx (Step 3 - contact info)
│   └── StepReview.tsx (Step 4 - review booking)
├── hooks/
│   ├── useBookingState.ts (state management)
│   ├── useBookingValidation.ts (validation logic)
│   └── usePricingCalculation.ts (pricing logic)
└── types.ts (shared types)

Requirements:
- Extract state management to useBookingState hook
- Extract validation to useBookingValidation hook
- Extract pricing to usePricingCalculation hook
- Each step component < 200 lines
- Main BookingWizard < 100 lines
- All tests should pass after refactor
- No behavior changes, only structure

Move approximately:
- Lines 1-150 → state hook
- Lines 200-350 → validation hook
- Lines 100-150 → pricing hook
- Remaining → step components"
```

---

## 🎯 Complete Implementation in One Command

If you want Claude to do EVERYTHING at once:

```bash
claude --task "Implement all 10 critical security fixes for Traverse Pakistan website.

THIS IS A LARGE TASK - Complete the following in order:

1. Create src/lib/validation/schemas.ts with Zod schemas for:
   - BookingInput validation
   - Pakistani phone number regex
   - Email validation (RFC 5321)

2. Create src/middleware.ts with CORS protection:
   - Whitelist allowed origins
   - Block CSRF from other domains
   - Log blocked requests

3. Create src/lib/logger.ts with structured logging:
   - JSON formatted logs
   - info/error/warning methods
   - Audit trail capability

4. Create src/lib/ratelimit.ts with in-memory rate limiting:
   - 10 requests per minute per IP
   - Automatic cleanup
   - Key generation helper

5. Create src/lib/api-client.ts with timeout support:
   - fetchWithTimeout function
   - 10 second default timeout
   - Proper AbortController cleanup

6. Update src/lib/supabase/env.ts:
   - Add getEnvVar() function
   - Fail fast in production
   - Warn in development

7. Create test file: src/lib/validation/__tests__/schemas.test.ts
   - Test phone number validation
   - Test email validation
   - Test booking schema

8. Update package.json:
   - Add zod dependency

9. Create documentation:
   - src/lib/SECURITY.md with implementation notes
   - Usage examples for each utility

All code should:
- Follow existing code style (TypeScript, ESLint config)
- Have proper error handling
- Include comments explaining security
- Be production-ready
- Have no linting errors

After completing all files, run:
- npm install
- npm run build
- npm run lint
- npm run type-check"
```

---

## 📊 Run Commands in Sequence

### **For Step-by-Step Implementation (Recommended):**

```bash
# Step 1: Validation
claude --task "..." # Copy STEP 1 command above
# Review changes, ask questions
# Then proceed to step 2

# Step 2: CORS
claude --task "..." # Copy STEP 2 command above

# Continue through all 12 steps
```

### **For Faster Implementation:**

```bash
# Do all foundational fixes at once (Steps 1-6)
claude --task "..." # Copy all of STEPS 1-6 as one task

# Then apply to routes (Steps 8-10)
claude --task "..." # Copy STEPS 8-10

# Then do optional refactoring (Step 13)
```

---

## ✅ Verification Commands

After each Claude task completes:

```bash
# Check TypeScript compilation
npm run type-check

# Check linting
npm run lint

# Check build
npm run build

# If tests exist
npm test

# Verify file was created
ls -la src/lib/validation/schemas.ts
head -20 src/lib/validation/schemas.ts
```

---

## 🐛 Debugging Tips

If Claude Code gets stuck:

```bash
# Cancel and try again
ctrl + c

# Provide more context to next command
# Include file paths explicitly
# Include exact error messages
# Ask for specific changes instead of general refactoring

# Example:
claude --task "In file src/app/api/payments/alfa/initiate/route.ts,
add Zod validation using BookingInputSchema from src/lib/validation/schemas.ts.
After const parsed = BookingInputSchema.safeParse(body), 
if !parsed.success return 400 status with errors."
```

---

## 📝 Workflow Example

```bash
# Terminal 1: Run Claude Code commands
cd /Users/kashifmanzoor/Downloads/New\ Website/traverse-pakistan

# 1. Add validation
claude --task "Create Zod validation schemas for booking input..."
# Review output, test with: npm run type-check

# 2. Add middleware
claude --task "Create CORS middleware to protect API endpoints..."
# Review output, test with: npm run build

# 3. Add logger
claude --task "Create structured logging service..."
# Review output

# 4-12... continue

# Terminal 2: Watch for changes
watch -n 1 "git status"

# Terminal 3: Run tests
npm run lint
npm run type-check
npm run build
```

---

## 🚀 Pro Tips

1. **Be specific:** More detail = better results
2. **Include examples:** Show what you want
3. **Reference files:** Use exact paths
4. **Ask for tests:** "Add unit tests for..."
5. **Request docs:** "Add JSDoc comments..."
6. **Verify after:** Always check the changes

---

## Example Full Output

When you run a command like:

```bash
claude --task "Create Zod validation schemas..."
```

You'll see:

```
✨ Claude Code starting...

🔍 Analyzing your project...
- Detected: Next.js 16.2.3
- Language: TypeScript
- Package manager: npm

📝 Creating: src/lib/validation/schemas.ts
✅ Installed: zod@3.22.4

📋 Changes:
+ src/lib/validation/schemas.ts (87 lines)
+ src/lib/validation/index.ts (12 lines)

🧪 Running checks...
✓ TypeScript: OK
✓ ESLint: OK
✓ Build: OK

✨ Done! Review changes:
  git diff src/lib/validation/

Continue with next fix? (y/n)
```

---

## Next Steps

1. **Copy a command** from above
2. **Run it** in your terminal
3. **Review the changes**
4. **Run verification** (`npm run type-check`, `npm run build`)
5. **Commit** (`git add . && git commit -m "Add validation"`)
6. **Move to next command**

---

**Total implementation time: 28 hours**  
**Your team can build Alfa in parallel**  
**All fixes independent and stackable**

Ready to start? Pick STEP 1 or run the complete implementation command above! 🚀
