import { test, expect } from "@playwright/test";

/**
 * Reproduces the race fixed in feature/sidebar-rooms: driving adults up then
 * down quickly used to leave the rooms floor stuck at the previous (higher)
 * pax count. After the fix, the floor must drop with adults.
 *
 * Targets the Hunza Valley Escape sidebar by default — change SLUG below to
 * exercise a different package.
 */

const SLUG = "hunza-valley-escape";
const ROOMS_LABEL_RE = /Minimum (\d+) rooms? for (\d+) guests?/;

test.describe("Package booking sidebar rooms counter", () => {
  test("rooms floor drops back to 1 when adults shrinks faster than engine fetch", async ({ page }) => {
    await page.goto(`/packages/${SLUG}`);

    // The sidebar lives in the sticky right column. Anchor on the Rooms label.
    const sidebar = page.locator("section, aside, div").filter({ hasText: "Rooms" }).first();
    await expect(sidebar).toBeVisible();

    const adultsPlus = sidebar.locator("button").filter({ hasText: "+" }).nth(1);
    const adultsMinus = sidebar.locator("button").filter({ hasText: "−" }).nth(1);

    // Space clicks ~250ms apart so each one passes the 200ms debounce and
    // actually fires a fetch. Without this gap Playwright clicks too fast,
    // the debounce coalesces them, and only the final fetch is ever issued —
    // which means the race we're trying to reproduce never happens.
    for (let i = 0; i < 10; i++) {
      await adultsPlus.click();
      await page.waitForTimeout(250);
    }

    // Now drive adults back down to 1 without waiting between clicks. A
    // higher-pax fetch is in flight from the last + click and we want its
    // response to land after the - clicks have settled the new state.
    for (let i = 0; i < 11; i++) {
      if (await adultsMinus.isDisabled()) break;
      await adultsMinus.click();
    }

    // Give the latest stale higher-pax fetch enough time to land if it's
    // going to.
    await page.waitForTimeout(2500);

    // The rooms label should now read "Minimum 1 room for 1 guest". Before
    // the fix it read "Minimum 4 rooms for 1 guest" and stayed there.
    const label = sidebar.locator("text=Minimum").first();
    const text = (await label.textContent())?.trim() ?? "";
    const match = text.match(ROOMS_LABEL_RE);
    expect(match, `Label text was: "${text}"`).not.toBeNull();
    const floor = Number(match![1]);
    const guests = Number(match![2]);

    expect(guests).toBe(1);
    expect(floor).toBeLessThanOrEqual(guests);
  });
});
