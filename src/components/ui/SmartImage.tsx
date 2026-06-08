"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

interface SmartImageProps extends Omit<ImageProps, "src"> {
  src: string;
}

export default function SmartImage({ src, alt, ...props }: SmartImageProps) {
  const [isBroken, setIsBroken] = useState(false);

  if (isBroken) return null;

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      onError={() => setIsBroken(true)}
    />
  );
}
