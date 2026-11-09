"use client";

import { useState } from "react";

type Props = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type" | "inputMode"
> & {
  value: number | null | undefined;
  /** Receives null when the field is emptied; callers decide null vs 0. */
  onChange: (value: number | null) => void;
  /** Allow a decimal point (default: whole numbers only). */
  decimal?: boolean;
  /** Allow a leading minus sign. */
  negative?: boolean;
  /** Show 0 as "0" instead of blank, for fields where 0 means something (e.g. Day 0). */
  keepZero?: boolean;
};

function toText(v: number | null | undefined, keepZero: boolean): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "";
  return v === 0 && !keepZero ? "" : String(v);
}

// Text input rather than type="number": no "e"/"+" input, no wheel-scroll
// changes, no stuck leading zeros, and zero/empty render as blank. The box is
// never rewritten while focused, so a caller's fallback (e.g. `n ?? 1`) can't
// pop a value back in mid-typing; it's shown on blur instead.
export function NumberInput({
  value,
  onChange,
  decimal = false,
  negative = false,
  keepZero = false,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const [text, setText] = useState(() => toText(value, keepZero));
  const [focused, setFocused] = useState(false);
  const [prevValue, setPrevValue] = useState(value);

  // Sync from props during render (React's "adjust state on prop change" pattern).
  if (!Object.is(value, prevValue)) {
    setPrevValue(value);
    if (!focused) setText(toText(value, keepZero));
  }

  const pattern = new RegExp(`^${negative ? "-?" : ""}\\d*${decimal ? "(\\.\\d*)?" : ""}$`);

  return (
    <input
      {...rest}
      type="text"
      inputMode={decimal ? "decimal" : "numeric"}
      autoComplete="off"
      value={text}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onChange={(e) => {
        const next = e.target.value.trim().replace(/^(-?)0+(?=\d)/, "$1");
        if (!pattern.test(next)) return;
        setText(next);
        if (next === "" || next === "-" || next === ".") return onChange(null);
        const n = Number(next);
        if (Number.isFinite(n)) onChange(n);
      }}
      onBlur={(e) => {
        setFocused(false);
        setText(toText(value, keepZero));
        onBlur?.(e);
      }}
    />
  );
}
