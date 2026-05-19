"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

interface SmartImageProps extends Omit<ImageProps, "src"> {
  src: string;
}

export default function SmartImage({ src, alt, ...props }: SmartImageProps) {
  const [useBackup, setUseBackup] = useState(false);
  const [isBroken, setIsBroken] = useState(false);

  if (isBroken) return null;

  return (
    <Image
      {...props}
      src={useBackup ? `${src}?fallback=true` : src}
      alt={alt}
      unoptimized={useBackup}
      onError={() => {
        if (!useBackup) {
          setUseBackup(true);
        } else {
          setIsBroken(true);
        }
      }}
    />
  );
}
