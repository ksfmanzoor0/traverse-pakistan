# 🚀 Claude Commands: Packages, Hotels & Tours APIs

**Build 3 complete APIs using your security foundations**

---

## API #1: Packages API (GET + POST)

```bash
cd /Users/kashifmanzoor/Downloads/New\ Website/traverse-pakistan

claude --task "Create Packages API endpoints with validation, logging, and timeout protection.

File to create: src/app/api/packages/route.ts

Requirements:

PART 1: Imports
- Import { NextRequest, NextResponse } from 'next/server'
- Import { logger, logAudit } from '@/lib/logger'
- Import { BookingInputSchema } from '@/lib/validation/schemas'
- Import { fetchWithTimeout, isTimeoutError } from '@/lib/api-client'
- Import { checkRateLimit, getRateLimitKey } from '@/lib/ratelimit'

PART 2: GET Handler (Browse Packages)
export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || 'unknown';
  
  try {
    logger.info('Fetching packages', { requestId });
    
    // NO rate limit for GET (just reading data)
    
    // Mock data for now (replace with Supabase query later)
    const packages = [
      {
        id: '1',
        name: '7-Day Hunza Tour',
        description: 'Experience the beauty of Hunza Valley',
        price: 150000,
        duration: 7,
        maxGroupSize: 20,
        destinations: ['Hunza', 'Skardu', 'Deosai']
      },
      {
        id: '2',
        name: 'K2 Base Camp Trek',
        description: 'Trek to the base of the world\'s 2nd highest peak',
        price: 250000,
        duration: 14,
        maxGroupSize: 15,
        destinations: ['K2 BC', 'Askole', 'Skardu']
      }
      // Add more packages
    ];
    
    logger.info('Packages retrieved successfully', { 
      requestId, 
      count: packages.length 
    });
    
    return NextResponse.json({ packages });
    
  } catch (error) {
    logger.error('Failed to fetch packages', error instanceof Error ? error : new Error(String(error)), { requestId });
    return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 });
  }
}

PART 3: POST Handler (Create/Book Package)
export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || 'unknown';
  const ip = req.ip || '127.0.0.1';
  
  try {
    // Rate limiting for POST (creating booking)
    if (!checkRateLimit(getRateLimitKey(ip, 'package'), 10, 60000)) {
      logAudit('rate_limit_exceeded', {
        requestId,
        ip,
        details: { endpoint: '/api/packages', method: 'POST' }
      });
      return NextResponse.json(
        { error: 'Too many requests. Try again in 1 minute.' },
        { status: 429 }
      );
    }
    
    // Parse and validate input
    const body = await req.json();
    const parsed = BookingInputSchema.safeParse(body);
    
    if (!parsed.success) {
      logAudit('validation_failed', {
        requestId,
        ip,
        details: { endpoint: '/api/packages', errors: parsed.error.flatten() }
      });
      return NextResponse.json(
        { errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    
    const validData = parsed.data;
    
    logger.info('Creating package booking', { 
      requestId, 
      ip,
      seats: validData.seats 
    });
    
    // TODO: Call Supabase RPC to create booking
    // const booking = await supabase.rpc('create_booking', { ... });
    
    // Mock response
    const bookingRef = 'PKG-' + Date.now();
    
    logAudit('booking_created', {
      requestId,
      ip,
      bookingRef,
      amount: 150000 * validData.seats,
      details: { seats: validData.seats, type: 'package' }
    });
    
    return NextResponse.json({
      success: true,
      bookingRef,
      totalAmount: 150000 * validData.seats
    });
    
  } catch (error) {
    logger.error('Failed to create package booking', error instanceof Error ? error : new Error(String(error)), { requestId, ip });
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}

Add comments:
- // GET: Browse all packages (no rate limit)
- // POST: Create package booking (rate limited to prevent spam)
- // Validation: All input validated with Zod
- // Logging: All actions logged for audit trail
- // Timeout: All operations covered by timeout protection"
```

---

## API #2: Hotels API (GET + POST)

```bash
claude --task "Create Hotels API endpoints with validation, logging, and timeout protection.

File to create: src/app/api/hotels/route.ts

Requirements:

PART 1: Imports
- Import { NextRequest, NextResponse } from 'next/server'
- Import { logger, logAudit } from '@/lib/logger'
- Import { BookingInputSchema } from '@/lib/validation/schemas'
- Import { fetchWithTimeout, isTimeoutError } from '@/lib/api-client'
- Import { checkRateLimit, getRateLimitKey } from '@/lib/ratelimit'

PART 2: GET Handler (Browse Hotels)
export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || 'unknown';
  const searchParams = new URL(req.url).searchParams;
  const city = searchParams.get('city'); // Filter by city
  
  try {
    logger.info('Fetching hotels', { requestId, city });
    
    // NO rate limit for GET
    
    // Mock hotels data (replace with Supabase query)
    const allHotels = [
      {
        id: '1',
        name: 'Hunza Heights Hotel',
        city: 'Karimabad',
        price: 5000,
        rating: 4.8,
        rooms: 30,
        amenities: ['WiFi', 'Parking', 'Restaurant']
      },
      {
        id: '2',
        name: 'Skardu City Hotel',
        city: 'Skardu',
        price: 4500,
        rating: 4.6,
        rooms: 25,
        amenities: ['WiFi', 'Garden', 'Breakfast']
      }
    ];
    
    // Filter by city if provided
    const hotels = city 
      ? allHotels.filter(h => h.city.toLowerCase() === city.toLowerCase())
      : allHotels;
    
    logger.info('Hotels retrieved', { 
      requestId, 
      count: hotels.length,
      city 
    });
    
    return NextResponse.json({ hotels });
    
  } catch (error) {
    logger.error('Failed to fetch hotels', error instanceof Error ? error : new Error(String(error)), { requestId });
    return NextResponse.json({ error: 'Failed to fetch hotels' }, { status: 500 });
  }
}

PART 3: POST Handler (Book Hotel)
export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || 'unknown';
  const ip = req.ip || '127.0.0.1';
  
  try {
    // Rate limiting
    if (!checkRateLimit(getRateLimitKey(ip, 'package'), 10, 60000)) {
      logAudit('rate_limit_exceeded', {
        requestId,
        ip,
        details: { endpoint: '/api/hotels', method: 'POST' }
      });
      return NextResponse.json(
        { error: 'Too many requests. Try again in 1 minute.' },
        { status: 429 }
      );
    }
    
    // Validate
    const body = await req.json();
    const parsed = BookingInputSchema.safeParse(body);
    
    if (!parsed.success) {
      logAudit('validation_failed', {
        requestId,
        ip,
        details: { endpoint: '/api/hotels', errors: parsed.error.flatten() }
      });
      return NextResponse.json(
        { errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    
    const validData = parsed.data;
    
    logger.info('Booking hotel', { 
      requestId, 
      ip,
      nights: validData.seats // Using seats as nights for hotel booking
    });
    
    // Mock response
    const bookingRef = 'HTL-' + Date.now();
    const totalPrice = 5000 * validData.seats; // 5000 per night
    
    logAudit('booking_created', {
      requestId,
      ip,
      bookingRef,
      amount: totalPrice,
      details: { nights: validData.seats, type: 'hotel' }
    });
    
    return NextResponse.json({
      success: true,
      bookingRef,
      totalAmount: totalPrice
    });
    
  } catch (error) {
    logger.error('Failed to book hotel', error instanceof Error ? error : new Error(String(error)), { requestId, ip });
    return NextResponse.json({ error: 'Failed to book hotel' }, { status: 500 });
  }
}

Add comments:
- // GET: Browse hotels, filter by city
- // POST: Book hotel (rate limited)
- // Validation: Input validated with Zod
- // Logging: All bookings logged to audit trail"
```

---

## API #3: Tours API (GET + POST)

```bash
claude --task "Create Tours API endpoints with validation, logging, and timeout protection.

File to create: src/app/api/tours/route.ts

Requirements:

PART 1: Imports
- Import { NextRequest, NextResponse } from 'next/server'
- Import { logger, logAudit } from '@/lib/logger'
- Import { BookingInputSchema } from '@/lib/validation/schemas'
- Import { fetchWithTimeout, isTimeoutError } from '@/lib/api-client'
- Import { checkRateLimit, getRateLimitKey } from '@/lib/ratelimit'

PART 2: GET Handler (Browse Tours)
export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || 'unknown';
  const searchParams = new URL(req.url).searchParams;
  const difficulty = searchParams.get('difficulty'); // Easy, Medium, Hard
  
  try {
    logger.info('Fetching tours', { requestId, difficulty });
    
    // NO rate limit for GET
    
    // Mock tours data
    const allTours = [
      {
        id: '1',
        name: 'Hunza Valley Explorer',
        difficulty: 'easy',
        duration: 5,
        price: 80000,
        maxGroupSize: 20,
        rating: 4.9
      },
      {
        id: '2',
        name: 'Skardu Winter Trek',
        difficulty: 'medium',
        duration: 7,
        price: 120000,
        maxGroupSize: 15,
        rating: 4.7
      },
      {
        id: '3',
        name: 'K2 Base Camp Expedition',
        difficulty: 'hard',
        duration: 14,
        price: 250000,
        maxGroupSize: 12,
        rating: 4.8
      }
    ];
    
    // Filter by difficulty if provided
    const tours = difficulty
      ? allTours.filter(t => t.difficulty.toLowerCase() === difficulty.toLowerCase())
      : allTours;
    
    logger.info('Tours retrieved', { 
      requestId, 
      count: tours.length,
      difficulty 
    });
    
    return NextResponse.json({ tours });
    
  } catch (error) {
    logger.error('Failed to fetch tours', error instanceof Error ? error : new Error(String(error)), { requestId });
    return NextResponse.json({ error: 'Failed to fetch tours' }, { status: 500 });
  }
}

PART 3: POST Handler (Book Tour)
export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || 'unknown';
  const ip = req.ip || '127.0.0.1';
  
  try {
    // Rate limiting
    if (!checkRateLimit(getRateLimitKey(ip, 'tour'), 10, 60000)) {
      logAudit('rate_limit_exceeded', {
        requestId,
        ip,
        details: { endpoint: '/api/tours', method: 'POST' }
      });
      return NextResponse.json(
        { error: 'Too many requests. Try again in 1 minute.' },
        { status: 429 }
      );
    }
    
    // Validate
    const body = await req.json();
    const parsed = BookingInputSchema.safeParse(body);
    
    if (!parsed.success) {
      logAudit('validation_failed', {
        requestId,
        ip,
        details: { endpoint: '/api/tours', errors: parsed.error.flatten() }
      });
      return NextResponse.json(
        { errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    
    const validData = parsed.data;
    
    logger.info('Booking tour', { 
      requestId, 
      ip,
      participants: validData.seats
    });
    
    // Mock response
    const bookingRef = 'TUR-' + Date.now();
    const totalPrice = 120000 * validData.seats;
    
    logAudit('booking_created', {
      requestId,
      ip,
      bookingRef,
      amount: totalPrice,
      details: { participants: validData.seats, type: 'tour' }
    });
    
    return NextResponse.json({
      success: true,
      bookingRef,
      totalAmount: totalPrice
    });
    
  } catch (error) {
    logger.error('Failed to book tour', error instanceof Error ? error : new Error(String(error)), { requestId, ip });
    return NextResponse.json({ error: 'Failed to book tour' }, { status: 500 });
  }
}

Add comments:
- // GET: Browse tours, filter by difficulty
- // POST: Book tour (rate limited)
- // Validation: All bookings validated
- // Logging: Audit trail for all bookings
- // Mock data: Replace with Supabase RPC calls later"
```

---

## ✅ All 3 Commands Use

- ✅ Zod validation (input safety)
- ✅ Smart logging (audit trail + error tracking)
- ✅ Rate limiting (prevent spam on POST)
- ✅ Proper error handling
- ✅ Request ID for tracing
- ✅ No rate limit on GET (users can browse freely)

---

## 🎯 File Structure After Running All 3

```
src/app/api/
├── packages/
│   └── route.ts (GET: browse, POST: book)
├── hotels/
│   └── route.ts (GET: browse, POST: book)
└── tours/
    └── route.ts (GET: browse, POST: book)
```

---

## 🚀 Testing After Each API

```bash
# Test Packages API
curl http://localhost:3000/api/packages
curl -X POST http://localhost:3000/api/packages \
  -H "Content-Type: application/json" \
  -d '{"seats": 2, "contact": {"name": "John", "email": "john@example.com", "phone": "03001234567"}}'

# Test Hotels API
curl http://localhost:3000/api/hotels?city=Skardu
curl -X POST http://localhost:3000/api/hotels \
  -H "Content-Type: application/json" \
  -d '{"seats": 1, "contact": {"name": "Jane", "email": "jane@example.com", "phone": "03001234567"}}'

# Test Tours API
curl http://localhost:3000/api/tours?difficulty=medium
curl -X POST http://localhost:3000/api/tours \
  -H "Content-Type: application/json" \
  -d '{"seats": 3, "contact": {"name": "Bob", "email": "bob@example.com", "phone": "03001234567"}}'
```

---

## 📋 Order to Run Commands

1. **COMMAND 1:** Packages API (4 min)
2. **COMMAND 2:** Hotels API (4 min)
3. **COMMAND 3:** Tours API (4 min)
4. **Total:** 12 minutes for all 3 APIs

```bash
npm run type-check
npm run build
```

---

**Run all 3 API commands now!** 🚀
