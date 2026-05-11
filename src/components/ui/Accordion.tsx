"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

interface AccordionItemProps {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function AccordionItem({
  title,
  children,
  defaultOpen = false,
  className,
}: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "border-b border-[var(--border-default)] last:border-b-0",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-5 text-left cursor-pointer group"
      >
        <span className="text-[15px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors pr-4">
          {title}
        </span>
        <span
          className={cn(
            "shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] transition-transform duration-300",
            isOpen && "rotate-45"
          )}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <line x1="6" y1="1" x2="6" y2="11"/>
            <line x1="1" y1="6" x2="11" y2="6"/>
          </svg>
        </span>
      </button>
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="pb-5 text-[15px] text-[var(--text-secondary)] leading-relaxed">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
