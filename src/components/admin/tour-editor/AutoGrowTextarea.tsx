"use client";

import { useEffect, useRef } from "react";

interface Props extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "rows"> {
  minRows?: number;
}

/** Textarea that resizes to fit its content — no scroll-inside, no wasted
 *  whitespace when the text is short. Starts at `minRows` (default 3).
 *  Same visual style as `inputCls` from PackageEditor / TourEditor. */
export function AutoGrowTextarea({ minRows = 3, className, value, ...rest }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    resize();
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={minRows}
      onInput={resize}
      className={
        className ??
        "w-full px-3 py-2 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[13px] leading-[1.5] resize-none overflow-hidden"
      }
      {...rest}
    />
  );
}
