-- Seed 7 hotels into Supabase
-- Generated 2026-06-09. Margin 1.20 on corporate rates, rounded to nearest 500 PKR.
-- Hotels: pc-gwadar, destination-khaplu, destination-hotel-gilgit, pine-park-shogran,
--         hotel-greens-kalam, mount-feast-naran, himalaya-hotel-skardu

-- =====================================================================
-- 1. pc-gwadar (luxury, gwadar)
-- =====================================================================
do $$
declare
  v_hotel uuid := gen_random_uuid();
  v_season uuid := gen_random_uuid();
  r1 uuid := gen_random_uuid(); r2 uuid := gen_random_uuid(); r3 uuid := gen_random_uuid();
  r4 uuid := gen_random_uuid(); r5 uuid := gen_random_uuid();
begin
  insert into hotels (id, slug, name, destination_slug, location, tier, property_type,
    image, rating, review_count, price_per_night, margin, guest_favourite,
    check_in, check_out, tax_note, description, amenities, highlights, policies)
  values (v_hotel, 'pc-gwadar', 'Pearl Continental Gwadar', 'gwadar',
    'Marine Drive, Gwadar', 'luxury', 'Hotel',
    'https://media.traversepakistan.com/hotels/pc-gwadar/cover.jpg',
    4.6, 0, 30000, 1.20, false, '2:00 PM', '12:00 PM',
    'Breakfast included · Taxes additional',
    'Pearl Continental Gwadar sits on the Arabian Sea shoreline, pairing five-star service with sweeping sea views across deluxe rooms, twin rooms, and executive suites.',
    array['Sea views','Restaurant','Free WiFi','24-hour room service','Free parking','Concierge','Laundry service','Air conditioning','Family rooms','Business centre'],
    array['Beachfront location','Five-star service','Multiple dining venues','Sea-view rooms','Executive suites available'],
    jsonb_build_object(
      'rules', array['Check-in from 2:00 PM','Check-out by 12:00 PM','Valid CNIC/passport required at check-in','No smoking inside rooms','Pets not allowed'],
      'safety', array['24-hour reception','CCTV in common areas','Smoke detectors','Fire extinguishers on each floor','First-aid kit available'],
      'cancellation', array['Free cancellation up to 7 days before check-in','50% refund for cancellations 3-7 days prior','No refund within 72 hours of check-in']
    ));

  insert into hotel_seasons (id, hotel_id, label, sort_order) values (v_season, v_hotel, 'All Year', 0);

  insert into hotel_rooms (id, hotel_id, name, beds, price, available, extra_occupancy_charge,
    capacity_adults, capacity_children, capacity_infants, max_occupancy, sort_order) values
    (r1, v_hotel, 'Deluxe King Room', '1 king bed', 30000, 5, 6500, 2, 1, 1, 3, 0),
    (r2, v_hotel, 'Deluxe Twin Room', '2 twin beds', 30000, 5, 6500, 2, 1, 1, 3, 1),
    (r3, v_hotel, 'Executive King Room', '1 king bed', 36000, 5, 6500, 2, 1, 1, 3, 2),
    (r4, v_hotel, 'Executive Twin Room', '2 twin beds', 36000, 5, 6500, 2, 1, 1, 3, 3),
    (r5, v_hotel, 'Deluxe Suite', '1 king bed + lounge', 63500, 3, 6500, 2, 1, 1, 3, 4);

  insert into hotel_room_prices (room_id, season_id, price) values
    (r1, v_season, 30000), (r2, v_season, 30000), (r3, v_season, 36000),
    (r4, v_season, 36000), (r5, v_season, 63500);
end $$;

-- =====================================================================
-- 2. destination-khaplu (deluxe, khaplu)
-- =====================================================================
do $$
declare
  v_hotel uuid := gen_random_uuid();
  v_season uuid := gen_random_uuid();
  r1 uuid := gen_random_uuid(); r2 uuid := gen_random_uuid(); r3 uuid := gen_random_uuid();
begin
  insert into hotels (id, slug, name, destination_slug, location, tier, property_type,
    image, rating, review_count, price_per_night, margin, guest_favourite,
    check_in, check_out, tax_note, description, amenities, highlights, policies)
  values (v_hotel, 'destination-khaplu', 'Destination Hotel Khaplu', 'khaplu',
    'Khaplu, Ghanche District', 'deluxe', 'Hotel',
    'https://media.traversepakistan.com/hotels/destination-khaplu/cover.jpg',
    4.5, 0, 20500, 1.20, false, '2:00 PM', '12:00 PM',
    'Breakfast included · Taxes additional',
    'Destination Hotel Khaplu offers comfortable mountain-side stays in the Shyok valley, with deluxe rooms and an executive suite ideal for travellers exploring Khaplu Palace and the Ghanche region.',
    array['Mountain views','Restaurant','Free WiFi','24-hour reception','Free parking','Room service','Air conditioning','Laundry service'],
    array['Walking distance to Khaplu Palace','Mountain views','Local cuisine','Family-friendly'],
    jsonb_build_object(
      'rules', array['Check-in from 2:00 PM','Check-out by 12:00 PM','Valid CNIC/passport required at check-in','No smoking inside rooms','Pets not allowed'],
      'safety', array['24-hour reception','Smoke detectors','Fire extinguishers on each floor','First-aid kit available'],
      'cancellation', array['Free cancellation up to 7 days before check-in','50% refund for cancellations 3-7 days prior','No refund within 72 hours of check-in']
    ));

  insert into hotel_seasons (id, hotel_id, label, sort_order) values (v_season, v_hotel, 'All Year', 0);

  insert into hotel_rooms (id, hotel_id, name, beds, price, available, extra_occupancy_charge,
    capacity_adults, capacity_children, capacity_infants, max_occupancy, sort_order) values
    (r1, v_hotel, 'Deluxe King Room', '1 king bed', 20500, 5, 4000, 2, 1, 1, 3, 0),
    (r2, v_hotel, 'Deluxe Twin Room', '2 twin beds', 20500, 5, 4000, 2, 1, 1, 3, 1),
    (r3, v_hotel, 'Executive Suite', '1 king bed + lounge', 23000, 3, 4000, 2, 1, 1, 3, 2);

  insert into hotel_room_prices (room_id, season_id, price) values
    (r1, v_season, 20500), (r2, v_season, 20500), (r3, v_season, 23000);
end $$;

-- =====================================================================
-- 3. destination-hotel-gilgit (deluxe, gilgit)
-- =====================================================================
do $$
declare
  v_hotel uuid := gen_random_uuid();
  v_season uuid := gen_random_uuid();
  r1 uuid := gen_random_uuid(); r2 uuid := gen_random_uuid(); r3 uuid := gen_random_uuid();
begin
  insert into hotels (id, slug, name, destination_slug, location, tier, property_type,
    image, rating, review_count, price_per_night, margin, guest_favourite,
    check_in, check_out, tax_note, description, amenities, highlights, policies)
  values (v_hotel, 'destination-hotel-gilgit', 'Destination Hotel Gilgit', 'gilgit',
    'Gilgit City, Gilgit-Baltistan', 'deluxe', 'Hotel',
    'https://media.traversepakistan.com/hotels/destination-hotel-gilgit/cover.jpg',
    4.5, 0, 17000, 1.20, false, '2:00 PM', '12:00 PM',
    'Breakfast included · Taxes additional',
    'Destination Hotel Gilgit is a comfortable city-centre base for travellers heading to Hunza, Ghizer, and Skardu, offering deluxe rooms and an executive suite with modern amenities.',
    array['Restaurant','Free WiFi','24-hour reception','Free parking','Room service','Air conditioning','Laundry service','Airport transfer on request'],
    array['Central Gilgit location','Gateway to Hunza & Skardu','Modern amenities','Family-friendly'],
    jsonb_build_object(
      'rules', array['Check-in from 2:00 PM','Check-out by 12:00 PM','Valid CNIC/passport required at check-in','No smoking inside rooms','Pets not allowed'],
      'safety', array['24-hour reception','Smoke detectors','Fire extinguishers on each floor','First-aid kit available'],
      'cancellation', array['Free cancellation up to 7 days before check-in','50% refund for cancellations 3-7 days prior','No refund within 72 hours of check-in']
    ));

  insert into hotel_seasons (id, hotel_id, label, sort_order) values (v_season, v_hotel, 'All Year', 0);

  insert into hotel_rooms (id, hotel_id, name, beds, price, available, extra_occupancy_charge,
    capacity_adults, capacity_children, capacity_infants, max_occupancy, sort_order) values
    (r1, v_hotel, 'Deluxe King Room', '1 king bed', 17000, 5, 4000, 2, 1, 1, 3, 0),
    (r2, v_hotel, 'Deluxe Twin Room', '2 twin beds', 17000, 5, 4000, 2, 1, 1, 3, 1),
    (r3, v_hotel, 'Executive Suite', '1 king bed + lounge', 17000, 3, 4000, 2, 1, 1, 3, 2);

  insert into hotel_room_prices (room_id, season_id, price) values
    (r1, v_season, 17000), (r2, v_season, 17000), (r3, v_season, 17000);
end $$;

-- =====================================================================
-- 4. pine-park-shogran (deluxe, shogran)
-- =====================================================================
do $$
declare
  v_hotel uuid := gen_random_uuid();
  v_season uuid := gen_random_uuid();
  r1 uuid := gen_random_uuid(); r2 uuid := gen_random_uuid(); r3 uuid := gen_random_uuid();
begin
  insert into hotels (id, slug, name, destination_slug, location, tier, property_type,
    image, rating, review_count, price_per_night, margin, guest_favourite,
    check_in, check_out, tax_note, description, amenities, highlights, policies)
  values (v_hotel, 'pine-park-shogran', 'Pine Park Shogran', 'shogran',
    'Shogran, Kaghan Valley', 'deluxe', 'Resort',
    'https://media.traversepakistan.com/hotels/pine-park-shogran/cover.jpg',
    4.5, 0, 24500, 1.20, false, '2:00 PM', '12:00 PM',
    'Breakfast included · Taxes additional',
    'Pine Park Shogran rests in the pine forests of Shogran at 7,500 ft, offering deluxe rooms, executive family rooms, and luxury main-block rooms — a popular base for Siri Paye and the Kaghan Valley.',
    array['Pine forest setting','Restaurant','Free WiFi','24-hour reception','Free parking','Room service','Family rooms','Heating'],
    array['Pine forest views','Easy access to Siri Paye','Family-friendly cottages','Luxury main-block rooms'],
    jsonb_build_object(
      'rules', array['Check-in from 2:00 PM','Check-out by 12:00 PM','Valid CNIC/passport required at check-in','No smoking inside rooms','Pets not allowed'],
      'safety', array['24-hour reception','Smoke detectors','Fire extinguishers on each floor','First-aid kit available'],
      'cancellation', array['Free cancellation up to 7 days before check-in','50% refund for cancellations 3-7 days prior','No refund within 72 hours of check-in']
    ));

  insert into hotel_seasons (id, hotel_id, label, sort_order) values (v_season, v_hotel, 'All Year', 0);

  insert into hotel_rooms (id, hotel_id, name, beds, price, available, extra_occupancy_charge,
    capacity_adults, capacity_children, capacity_infants, max_occupancy, sort_order) values
    (r1, v_hotel, 'Deluxe Room', '1 king bed', 24500, 5, 3500, 2, 1, 1, 3, 0),
    (r2, v_hotel, 'Luxury Room (Main Block)', '1 king bed', 34000, 5, 3500, 2, 2, 1, 4, 1),
    (r3, v_hotel, 'Executive Family Room', '2 double beds', 42000, 3, 3500, 4, 0, 1, 4, 2);

  insert into hotel_room_prices (room_id, season_id, price) values
    (r1, v_season, 24500), (r2, v_season, 34000), (r3, v_season, 42000);
end $$;

-- =====================================================================
-- 5. hotel-greens-kalam (deluxe, kalam)
-- =====================================================================
do $$
declare
  v_hotel uuid := gen_random_uuid();
  v_season uuid := gen_random_uuid();
  r1 uuid := gen_random_uuid(); r2 uuid := gen_random_uuid(); r3 uuid := gen_random_uuid(); r4 uuid := gen_random_uuid();
begin
  insert into hotels (id, slug, name, destination_slug, location, tier, property_type,
    image, rating, review_count, price_per_night, margin, guest_favourite,
    check_in, check_out, tax_note, description, amenities, highlights, policies)
  values (v_hotel, 'hotel-greens-kalam', 'Hotel Greens Kalam', 'kalam',
    'Kalam, Swat Valley', 'deluxe', 'Hotel',
    'https://media.traversepakistan.com/hotels/hotel-greens-kalam/cover.jpg',
    4.5, 0, 17000, 1.20, false, '2:00 PM', '12:00 PM',
    'Breakfast included · Taxes additional',
    'Hotel Greens Kalam sits in the heart of Swat''s alpine valley, offering deluxe and family rooms with mountain views — ideal for travellers exploring Kalam, Mahodand Lake, and Ushu Forest.',
    array['Mountain views','Restaurant','Free WiFi','24-hour reception','Free parking','Room service','Family rooms','Heating'],
    array['Central Kalam location','Mountain & river views','Family-friendly rooms','Easy access to Mahodand Lake'],
    jsonb_build_object(
      'rules', array['Check-in from 2:00 PM','Check-out by 12:00 PM','Valid CNIC/passport required at check-in','No smoking inside rooms','Pets not allowed'],
      'safety', array['24-hour reception','Smoke detectors','Fire extinguishers on each floor','First-aid kit available'],
      'cancellation', array['Free cancellation up to 7 days before check-in','50% refund for cancellations 3-7 days prior','No refund within 72 hours of check-in']
    ));

  insert into hotel_seasons (id, hotel_id, label, sort_order) values (v_season, v_hotel, 'All Year', 0);

  insert into hotel_rooms (id, hotel_id, name, beds, price, available, extra_occupancy_charge,
    capacity_adults, capacity_children, capacity_infants, max_occupancy, sort_order) values
    (r1, v_hotel, 'Standard Nook', '1 king bed', 17000, 5, 6000, 2, 1, 1, 3, 0),
    (r2, v_hotel, 'Deluxe Escape', '1 king bed', 19000, 5, 6000, 2, 1, 1, 3, 1),
    (r3, v_hotel, 'The Chill Fam Room', '1 king bed + 1 single', 26500, 4, 6000, 2, 2, 1, 4, 2),
    (r4, v_hotel, 'The Suite Spot', '1 king bed + lounge', 29000, 3, 6000, 2, 1, 1, 3, 3);

  insert into hotel_room_prices (room_id, season_id, price) values
    (r1, v_season, 17000), (r2, v_season, 19000), (r3, v_season, 26500), (r4, v_season, 29000);
end $$;

-- =====================================================================
-- 6. mount-feast-naran (deluxe, naran)
-- =====================================================================
do $$
declare
  v_hotel uuid := gen_random_uuid();
  v_season uuid := gen_random_uuid();
  r1 uuid := gen_random_uuid(); r2 uuid := gen_random_uuid(); r3 uuid := gen_random_uuid();
  r4 uuid := gen_random_uuid(); r5 uuid := gen_random_uuid(); r6 uuid := gen_random_uuid();
  r7 uuid := gen_random_uuid(); r8 uuid := gen_random_uuid(); r9 uuid := gen_random_uuid();
begin
  insert into hotels (id, slug, name, destination_slug, location, tier, property_type,
    image, rating, review_count, price_per_night, margin, guest_favourite,
    check_in, check_out, tax_note, description, amenities, highlights, policies)
  values (v_hotel, 'mount-feast-naran', 'Mount Feast Naran', 'naran',
    'Naran, Kaghan Valley', 'deluxe', 'Hotel',
    'https://media.traversepakistan.com/hotels/mount-feast-naran/cover.jpg',
    4.5, 0, 13000, 1.20, false, '2:00 PM', '12:00 PM',
    'Breakfast included · Taxes additional',
    'Mount Feast Naran offers a wide selection of rooms — from deluxe and executive to family, suite, and presidential — set against the Kunhar river and Naran''s mountain backdrop.',
    array['Mountain views','River views','Restaurant','Free WiFi','24-hour reception','Free parking','Room service','Family rooms','Heating'],
    array['Riverside location','Nine room categories','Family & presidential suites','Easy access to Saif-ul-Malook'],
    jsonb_build_object(
      'rules', array['Check-in from 2:00 PM','Check-out by 12:00 PM','Valid CNIC/passport required at check-in','No smoking inside rooms','Pets not allowed'],
      'safety', array['24-hour reception','Smoke detectors','Fire extinguishers on each floor','First-aid kit available'],
      'cancellation', array['Free cancellation up to 7 days before check-in','50% refund for cancellations 3-7 days prior','No refund within 72 hours of check-in']
    ));

  insert into hotel_seasons (id, hotel_id, label, sort_order) values (v_season, v_hotel, 'All Year', 0);

  insert into hotel_rooms (id, hotel_id, name, beds, price, available, extra_occupancy_charge,
    capacity_adults, capacity_children, capacity_infants, max_occupancy, sort_order) values
    (r1, v_hotel, 'Deluxe Without Balcony', '1 master bed', 13000, 5, 3000, 2, 1, 1, 3, 0),
    (r2, v_hotel, 'Deluxe With Balcony', '1 master bed', 15000, 5, 3000, 2, 1, 1, 3, 1),
    (r3, v_hotel, 'Executive Room', '1 master bed', 19000, 5, 3000, 2, 1, 1, 3, 2),
    (r4, v_hotel, 'Executive Add-on Room', '1 master bed + sofa-cum-bed', 20500, 4, 3000, 3, 1, 1, 4, 3),
    (r5, v_hotel, 'Triplet Room', '1 master bed + 1 single bed', 20500, 4, 3000, 3, 1, 1, 4, 4),
    (r6, v_hotel, 'Quad Room', '1 master bed + 2 single beds', 24500, 4, 3000, 4, 0, 1, 4, 5),
    (r7, v_hotel, 'Family Room', '1 master bed + 1 single + 2 sofa-cum-beds', 27000, 3, 3000, 4, 1, 1, 5, 6),
    (r8, v_hotel, 'Executive Suite', '2 double beds + 2 sofa-cum-beds', 36000, 2, 3000, 4, 2, 1, 6, 7),
    (r9, v_hotel, 'Presidential Suite', '1 double + 1 double + 1 single + sofa set', 48000, 1, 3000, 4, 1, 1, 5, 8);

  insert into hotel_room_prices (room_id, season_id, price) values
    (r1, v_season, 13000), (r2, v_season, 15000), (r3, v_season, 19000),
    (r4, v_season, 20500), (r5, v_season, 20500), (r6, v_season, 24500),
    (r7, v_season, 27000), (r8, v_season, 36000), (r9, v_season, 48000);
end $$;

-- =====================================================================
-- 7. himalaya-hotel-skardu (deluxe, shigar per sheet)
-- =====================================================================
do $$
declare
  v_hotel uuid := gen_random_uuid();
  v_season uuid := gen_random_uuid();
  r1 uuid := gen_random_uuid(); r2 uuid := gen_random_uuid(); r3 uuid := gen_random_uuid();
  r4 uuid := gen_random_uuid(); r5 uuid := gen_random_uuid(); r6 uuid := gen_random_uuid();
  r7 uuid := gen_random_uuid(); r8 uuid := gen_random_uuid();
begin
  insert into hotels (id, slug, name, destination_slug, location, tier, property_type,
    image, rating, review_count, price_per_night, margin, guest_favourite,
    check_in, check_out, tax_note, description, amenities, highlights, policies)
  values (v_hotel, 'himalaya-hotel-skardu', 'Himalaya Hotel Skardu', 'shigar',
    'Skardu, Gilgit-Baltistan', 'deluxe', 'Hotel',
    'https://media.traversepakistan.com/hotels/himalaya-hotel-skardu/cover.jpg',
    4.5, 0, 12000, 1.20, false, '2:00 PM', '12:00 PM',
    'Breakfast included · Taxes additional',
    'Himalaya Hotel Skardu offers a full range of rooms — from standard twins to royal suites — in the heart of Skardu, with modern amenities and access to Shangrila, Upper Kachura, and Deosai.',
    array['AC inverter','Free WiFi','24-hour hot water','Restaurant','Room service','Housekeeping','Laundry service','Free parking','24-hour reception'],
    array['Central Skardu location','Eight room categories','Royal & Himalayan suites','Gateway to Deosai & Shangrila'],
    jsonb_build_object(
      'rules', array['Check-in from 2:00 PM','Check-out by 12:00 PM','Valid CNIC/passport required at check-in','No smoking inside rooms','Pets not allowed'],
      'safety', array['24-hour reception','Smoke detectors','Fire extinguishers on each floor','First-aid kit available'],
      'cancellation', array['Free cancellation up to 7 days before check-in','50% refund for cancellations 3-7 days prior','No refund within 72 hours of check-in']
    ));

  insert into hotel_seasons (id, hotel_id, label, sort_order) values (v_season, v_hotel, 'All Year', 0);

  insert into hotel_rooms (id, hotel_id, name, beds, price, available, extra_occupancy_charge,
    capacity_adults, capacity_children, capacity_infants, max_occupancy, sort_order) values
    (r1, v_hotel, 'Standard King Master Bedroom', '1 king bed', 12000, 5, 3500, 2, 1, 1, 3, 0),
    (r2, v_hotel, 'Standard Twin Bedroom', '2 twin beds', 12000, 5, 3500, 2, 1, 1, 3, 1),
    (r3, v_hotel, 'Deluxe King', '1 king bed', 15500, 5, 3500, 2, 1, 1, 3, 2),
    (r4, v_hotel, 'Executive King Room', '1 king bed', 18000, 5, 3500, 2, 2, 1, 4, 3),
    (r5, v_hotel, 'Executive Deluxe Room', '1 king + 1 single', 19000, 4, 3500, 3, 2, 1, 5, 4),
    (r6, v_hotel, 'Junior Suite', '1 king + 1 single', 30000, 3, 3500, 3, 2, 1, 5, 5),
    (r7, v_hotel, 'Himalayan Suite', '1 king + 1 single + lounge', 42000, 2, 3500, 3, 2, 1, 5, 6),
    (r8, v_hotel, 'Royal Suite', '2 king beds + lounge', 41000, 1, 3500, 6, 2, 1, 8, 7);

  insert into hotel_room_prices (room_id, season_id, price) values
    (r1, v_season, 12000), (r2, v_season, 12000), (r3, v_season, 15500),
    (r4, v_season, 18000), (r5, v_season, 19000), (r6, v_season, 30000),
    (r7, v_season, 42000), (r8, v_season, 41000);
end $$;
