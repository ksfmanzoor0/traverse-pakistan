/**
 * Single source of truth for pax capacity rules used by the wizard, the
 * detail-page sidebar, and the engine's hotel room allocation.
 *
 * Change a number here and all three places see it. If ops later needs
 * runtime tunability, migrate this into engine_config columns of the
 * same names — the shape maps 1:1.
 */
export const PAX_RULES = {
  /** People per hotel room. Standard hotel policy — 3 fits a triple. */
  MAX_ROOM_OCCUPANCY: 3,

  /** Base free under-5 slots per room. Under-5s share beds/cots and don't
   *  consume standard room capacity, but each room has a soft cap. */
  UNDER_5_PER_ROOM: 2,

  /** Extra under-5 slot per room when children_5_12 = 0 (no older bed-
   *  consuming kids). Frees up one bed slot for a third under-5. */
  UNDER_5_BONUS_NO_OLDER_KIDS: 1,

  /** Airline rule: one lap infant per adult. */
  INFANTS_PER_ADULT: 1,

  /** Supervision guideline: each adult can travel with up to N kids age 2–5. */
  KIDS_2_5_PER_ADULT: 2,
} as const;

/**
 * Room-derived free under-5 capacity: base slots × rooms, plus a bonus
 * per room when there are no older kids taking bed space.
 */
export function computeUnder5Capacity(rooms: number, children_5_12: number): number {
  const base = rooms * PAX_RULES.UNDER_5_PER_ROOM;
  const bonus = children_5_12 === 0 ? PAX_RULES.UNDER_5_BONUS_NO_OLDER_KIDS : 0;
  return base + bonus;
}

/**
 * Minimum rooms needed for the bed-consuming pax (adults + kids 5-12).
 * Mirrors the engine's hotel allocation floor.
 */
export function computeMinRooms(bedPax: number): number {
  return Math.max(1, Math.ceil(bedPax / PAX_RULES.MAX_ROOM_OCCUPANCY));
}
