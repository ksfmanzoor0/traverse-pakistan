"use client";

import { useEffect } from "react";
import { trackViewItem, type BookingType } from "@/lib/analytics/track";

interface Props {
  itemId: string;
  itemName: string;
  bookingType: BookingType;
  price?: number | null;
}

// Fires view_item once on mount. Drop into any detail page.
export function TrackView(props: Props) {
  useEffect(() => {
    trackViewItem(props);
    // Only fire on first mount for this slug — parent will remount on
    // navigation to a different slug, which is the correct time to re-fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.itemId]);
  return null;
}
