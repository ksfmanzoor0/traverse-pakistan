"use client";

import { useMemo } from "react";
import { formatPrice } from "@/lib/utils";
import type { ResolvedAddonView } from "@/types/tour-addon";

interface AddonPickerProps {
  addons: ResolvedAddonView[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onRadioSelect: (groupKey: string, id: string) => void;
}

// Splits the per-city addon list into Included (required, non-toggleable)
// + Extras (optional, toggleable). Optional addons sharing a group_key
// render as a radio group; standalone optionals render as checkboxes.
export function AddonPicker({ addons, selectedIds, onToggle, onRadioSelect }: AddonPickerProps) {
  const { required, optionalGroups, optionalStandalone } = useMemo(() => {
    const req: ResolvedAddonView[] = [];
    const groups = new Map<string, ResolvedAddonView[]>();
    const solo: ResolvedAddonView[] = [];
    for (const a of addons) {
      if (a.isRequired) { req.push(a); continue; }
      if (a.groupKey) {
        const list = groups.get(a.groupKey) ?? [];
        list.push(a);
        groups.set(a.groupKey, list);
      } else {
        solo.push(a);
      }
    }
    return { required: req, optionalGroups: groups, optionalStandalone: solo };
  }, [addons]);

  if (required.length === 0 && optionalGroups.size === 0 && optionalStandalone.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {required.length > 0 && (
        <section aria-label="Included">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-2">
            Included
          </label>
          <ul className="space-y-1.5">
            {required.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 text-[13px]">
                <span className="text-[var(--text-primary)]">{a.label}</span>
                <span className="tabular-nums text-[var(--text-secondary)]">
                  {formatPrice(a.perPerson)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(optionalGroups.size > 0 || optionalStandalone.length > 0) && (
        <section aria-label="Extras">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-2">
            Extras
          </label>
          <div className="space-y-2">
            {Array.from(optionalGroups.entries()).map(([groupKey, options]) => {
              const activeId = options.find((o) => selectedIds.has(o.id))?.id ?? null;
              return (
                <fieldset key={groupKey} className="space-y-1">
                  <div className="space-y-1">
                    {options.map((a) => {
                      const active = a.id === activeId;
                      return (
                        <label
                          key={a.id}
                          className={`flex items-center justify-between gap-2 h-10 px-3 rounded-[var(--radius-sm)] border cursor-pointer text-[13px] ${
                            active
                              ? "border-[var(--primary)] bg-[var(--bg-subtle)]"
                              : "border-[var(--border-default)] hover:border-[var(--primary)]"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`addon-${groupKey}`}
                              checked={active}
                              onChange={() => onRadioSelect(groupKey, a.id)}
                              className="accent-[var(--primary)]"
                            />
                            <span className="text-[var(--text-primary)]">{a.label}</span>
                          </span>
                          <span className="tabular-nums text-[var(--text-secondary)]">
                            {formatPrice(a.perPerson)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
            {optionalStandalone.map((a) => {
              const active = selectedIds.has(a.id);
              return (
                <label
                  key={a.id}
                  className={`flex items-center justify-between gap-2 h-10 px-3 rounded-[var(--radius-sm)] border cursor-pointer text-[13px] ${
                    active
                      ? "border-[var(--primary)] bg-[var(--bg-subtle)]"
                      : "border-[var(--border-default)] hover:border-[var(--primary)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => onToggle(a.id)}
                      className="accent-[var(--primary)]"
                    />
                    <span className="text-[var(--text-primary)]">
                      {a.label}
                      {a.durationDelta > 0 && (
                        <span className="ml-1.5 text-[11px] text-[var(--text-tertiary)]">
                          +{a.durationDelta} day{a.durationDelta > 1 ? "s" : ""}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="tabular-nums text-[var(--text-secondary)]">
                    {formatPrice(a.perPerson)}
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// Compute the default selection set: every required addon, plus every
// optional addon with default_selected=true. When a group has multiple
// default-on options, the first (lowest priority) wins.
export function defaultSelectedIds(addons: ResolvedAddonView[]): Set<string> {
  const set = new Set<string>();
  const groupClaimed = new Set<string>();
  for (const a of addons) {
    if (a.isRequired) { set.add(a.id); continue; }
    if (!a.defaultSelected) continue;
    if (a.groupKey) {
      if (groupClaimed.has(a.groupKey)) continue;
      groupClaimed.add(a.groupKey);
    }
    set.add(a.id);
  }
  return set;
}

// Sum per-person cost for the currently-selected addon IDs.
export function sumSelectedAddons(addons: ResolvedAddonView[], selectedIds: Set<string>): number {
  return addons.reduce((s, a) => (selectedIds.has(a.id) ? s + a.perPerson : s), 0);
}
