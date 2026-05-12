"use client";

import { useState, useEffect } from "react";

export function DesktopOnly({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(window.innerWidth >= 768);
  }, []);
  if (!show) return null;
  return <>{children}</>;
}
