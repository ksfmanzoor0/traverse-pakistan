export type DepartureStatus = "open" | "closed" | "cancelled";
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "refunded";
export type PaymentStatus = "initiated" | "succeeded" | "failed" | "refunded";
export type DepartureCity = "islamabad" | "lahore" | "karachi";

export type TourRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  badge: string | null;
  duration: number;
  route: string;
  departure_date: string | null;
  destination_slug: string;
  region_slug: string;
  travel_style_slugs: string[];
  rating: number;
  review_count: number;
  max_group_size: number;
  languages: string[];
  free_cancellation: boolean;
  reserve_now_pay_later: boolean;
  images: Array<{ url: string; alt: string }>;
  guide: { name: string; yearsGuiding: number; photo?: string } | null;
  highlights: string[];
  inclusions: string[];
  exclusions: string[];
  know_before_you_go: string[];
  meeting_point: {
    address: string;
    departureTime: string;
    arrivalInstruction: string;
    endPoint: string;
    mapEmbedUrl: string;
    pickupOffered: boolean;
    pickupDescription: string;
  };
  featured: boolean;
  meta_title: string;
  meta_description: string;
  created_at: string;
  updated_at: string;
};

export type TourItineraryDayRow = {
  id: string;
  tour_slug: string;
  day_number: number;
  title: string;
  description: string;
  image: { url: string; alt: string } | null;
  stops: Array<{ name: string; detail: string }>;
  driving_time: string;
  overnight: string;
};

export type DepartureRow = {
  id: string;
  tour_slug: string;
  departure_date: string;
  end_date: string | null;
  departure_city: DepartureCity | null;
  max_seats: number;
  seats_booked: number;
  status: DepartureStatus;
  price: number;
  single_supplement: number | null;
  created_at: string;
};

export type BookingRow = {
  id: string;
  booking_ref: string;
  user_id: string | null;
  departure_id: string;
  seats: number;
  single_rooms: number;
  total_amount: number;
  currency: string;
  status: BookingStatus;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BookingParticipantRow = {
  id: string;
  booking_id: string;
  full_name: string;
  cnic_or_passport: string | null;
  date_of_birth: string | null;
  dietary: string | null;
  emergency_contact: string | null;
};

export type ReviewRow = {
  id: string;
  user_id: string | null;
  tour_slug: string;
  rating: number;
  title: string | null;
  body: string;
  approved: boolean;
  created_at: string;
};

export type ProfileRow = {
  id: string;
  full_name: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};

export type QuoteRequestType = "package" | "hotel" | "tour" | "custom";
export type QuoteRequestStatus = "new" | "contacted" | "quoted" | "converted" | "closed";

export type QuoteRequestRow = {
  id: string;
  user_id: string | null;
  request_type: QuoteRequestType;
  slug: string | null;
  display_name: string;
  tier: string | null;
  preferred_start_date: string | null;
  preferred_end_date: string | null;
  adults: number;
  children: number;
  rooms: number;
  departure_city: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  notes: string | null;
  status: QuoteRequestStatus;
  created_at: string;
  updated_at: string;
};

export type RegionRow = {
  id: string;
  wp_id: number | null;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
};

export type DestinationRow = {
  id: string;
  wp_id: number | null;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  region_id: string | null;
  parent_id: string | null;
  hero_image: string | null;
  elevation: string | null;
  featured: boolean;
  lat: number | null;
  lng: number | null;
  starting_price: number | null;
  rating: number | null;
  why_visit_cards: Array<{ icon: string; title: string; description: string }> | null;
  seasons: Array<{
    season: "spring" | "summer" | "autumn" | "winter";
    icon: string;
    months: string;
    badge: string;
    badgeColor: "green" | "yellow" | "red" | "blue";
    description: string;
  }> | null;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
};

export type DestinationFaqRow = {
  id: string;
  destination_id: string;
  question: string;
  answer: string;
  sort_order: number;
  created_at: string;
};

export type PackageRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  badge: string | null;
  duration: number;
  route: string | null;
  destination_slug: string;
  related_destination_slugs: string[];
  region_slug: string;
  rating: number;
  review_count: number;
  max_group_size: number | null;
  languages: string[];
  free_cancellation: boolean;
  reserve_now_pay_later: boolean;
  images: Array<{ url: string; alt: string }>;
  highlights: string[];
  inclusions: string[];
  exclusions: string[];
  know_before_you_go: string[];
  pricing: unknown;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type PackageItineraryDayRow = {
  id: string;
  package_slug: string;
  day_number: number;
  title: string;
  description: string | null;
  hotel_deluxe: string | null;
  hotel_luxury: string | null;
  stops: Array<{ name: string; detail: string }> | null;
  driving_time: string | null;
  overnight: string | null;
  city_only: string[] | null;
};

export type CreateBookingArgs = {
  p_departure_id: string;
  p_seats: number;
  p_single_rooms: number;
  p_contact_name: string;
  p_contact_email: string;
  p_contact_phone: string;
  p_participants: Array<{
    full_name: string;
    cnic_or_passport?: string | null;
    date_of_birth?: string | null;
    dietary?: string | null;
    emergency_contact?: string | null;
  }>;
  p_notes?: string | null;
};

export type CreateBookingResult = {
  booking_id: string;
  booking_ref: string;
  total_amount: number;
};

export type Database = {
  public: {
    Tables: {
      tours: {
        Row: TourRow;
        Insert: Omit<TourRow, "id" | "created_at" | "updated_at" | "featured"> &
          Partial<Pick<TourRow, "id" | "created_at" | "updated_at" | "featured">>;
        Update: Partial<TourRow>;
        Relationships: [];
      };
      tour_itinerary_days: {
        Row: TourItineraryDayRow;
        Insert: Omit<TourItineraryDayRow, "id"> & Partial<Pick<TourItineraryDayRow, "id">>;
        Update: Partial<TourItineraryDayRow>;
        Relationships: [];
      };
      departures: {
        Row: DepartureRow;
        Insert: Omit<DepartureRow, "id" | "created_at" | "seats_booked" | "status"> &
          Partial<Pick<DepartureRow, "id" | "created_at" | "seats_booked" | "status">>;
        Update: Partial<DepartureRow>;
        Relationships: [];
      };
      bookings: {
        Row: BookingRow;
        Insert: Omit<BookingRow, "id" | "created_at" | "updated_at" | "status"> &
          Partial<Pick<BookingRow, "id" | "created_at" | "updated_at" | "status">>;
        Update: Partial<BookingRow>;
        Relationships: [];
      };
      booking_participants: {
        Row: BookingParticipantRow;
        Insert: Omit<BookingParticipantRow, "id"> & Partial<Pick<BookingParticipantRow, "id">>;
        Update: Partial<BookingParticipantRow>;
        Relationships: [];
      };
      reviews: {
        Row: ReviewRow;
        Insert: Omit<ReviewRow, "id" | "created_at" | "approved"> &
          Partial<Pick<ReviewRow, "id" | "created_at" | "approved">>;
        Update: Partial<ReviewRow>;
        Relationships: [];
      };
      quote_requests: {
        Row: QuoteRequestRow;
        Insert: Omit<QuoteRequestRow, "id" | "created_at" | "updated_at" | "status"> &
          Partial<Pick<QuoteRequestRow, "id" | "created_at" | "updated_at" | "status">>;
        Update: Partial<QuoteRequestRow>;
        Relationships: [];
      };
      profiles: {
        Row: ProfileRow;
        Insert: Omit<ProfileRow, "created_at" | "updated_at" | "is_admin"> &
          Partial<Pick<ProfileRow, "created_at" | "updated_at" | "is_admin">>;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      regions: {
        Row: RegionRow;
        Insert: Omit<RegionRow, "id" | "created_at"> & Partial<Pick<RegionRow, "id" | "created_at">>;
        Update: Partial<RegionRow>;
        Relationships: [];
      };
      destinations: {
        Row: DestinationRow;
        Insert: Omit<DestinationRow, "id" | "created_at" | "updated_at" | "featured"> &
          Partial<Pick<DestinationRow, "id" | "created_at" | "updated_at" | "featured">>;
        Update: Partial<DestinationRow>;
        Relationships: [];
      };
      destination_faqs: {
        Row: DestinationFaqRow;
        Insert: Omit<DestinationFaqRow, "id" | "created_at"> & Partial<Pick<DestinationFaqRow, "id" | "created_at">>;
        Update: Partial<DestinationFaqRow>;
        Relationships: [];
      };
      packages: {
        Row: PackageRow;
        Insert: Omit<PackageRow, "id" | "created_at" | "updated_at"> & Partial<Pick<PackageRow, "id" | "created_at" | "updated_at">>;
        Update: Partial<PackageRow>;
        Relationships: [];
      };
      package_itinerary_days: {
        Row: PackageItineraryDayRow;
        Insert: Omit<PackageItineraryDayRow, "id"> & Partial<Pick<PackageItineraryDayRow, "id">>;
        Update: Partial<PackageItineraryDayRow>;
        Relationships: [];
      };
      package_bookings: {
        Row: {
          id: string;
          booking_ref: string;
          user_id: string | null;
          package_slug: string;
          tier: "deluxe" | "luxury";
          departure_city: string;
          start_date: string | null;
          adults: number;
          rooms: number;
          total_amount: number;
          currency: string;
          payment_status: string;
          contact_name: string;
          contact_email: string;
          contact_phone: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Partial<{ payment_status: string; updated_at: string }>;
        Relationships: [];
      };
      hotel_bookings: {
        Row: {
          id: string;
          booking_ref: string;
          user_id: string | null;
          hotel_slug: string;
          room_name: string;
          checkin_date: string | null;
          checkout_date: string | null;
          adults: number;
          children: number;
          rooms: number;
          nights: number;
          total_amount: number;
          currency: string;
          payment_status: string;
          contact_name: string;
          contact_email: string;
          contact_phone: string;
          arrival_time: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Partial<{ payment_status: string; updated_at: string }>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      create_booking: {
        Args: CreateBookingArgs;
        Returns: CreateBookingResult[];
      };
      create_package_booking: {
        Args: {
          p_package_slug: string;
          p_tier: "deluxe" | "luxury";
          p_departure_city: string;
          p_start_date: string | null;
          p_adults: number;
          p_rooms: number;
          p_total_amount: number;
          p_contact_name: string;
          p_contact_email: string;
          p_contact_phone: string;
          p_notes: string | null;
        };
        Returns: { booking_id: string; booking_ref: string; total_amount: number }[];
      };
      create_hotel_booking: {
        Args: {
          p_hotel_slug: string;
          p_room_name: string;
          p_checkin_date: string | null;
          p_checkout_date: string | null;
          p_adults: number;
          p_children: number;
          p_rooms: number;
          p_nights: number;
          p_total_amount: number;
          p_contact_name: string;
          p_contact_email: string;
          p_contact_phone: string;
          p_arrival_time: string | null;
          p_notes: string | null;
        };
        Returns: { booking_id: string; booking_ref: string; total_amount: number }[];
      };
    };
  };
}
