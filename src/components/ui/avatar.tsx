"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  canUseNextImage,
  DEFAULT_IMAGE_BLUR,
  getImagePlaceholder,
  isDataUrl,
} from "@/lib/media";

type AvatarContextValue = {
  imageVisible: boolean;
  setImageVisible: React.Dispatch<React.SetStateAction<boolean>>;
};

const AvatarContext = React.createContext<AvatarContextValue | null>(null);

const Avatar = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, children, ...props }, ref) => {
    const [imageVisible, setImageVisible] = React.useState(false);

    return (
      <AvatarContext.Provider value={{ imageVisible, setImageVisible }}>
        <span
          ref={ref}
          className={cn(
            "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
            className
          )}
          {...props}
        >
          {children}
        </span>
      </AvatarContext.Provider>
    );
  }
);
Avatar.displayName = "Avatar";

interface AvatarImageProps
  extends Omit<
    React.ComponentProps<typeof Image>,
    "src" | "alt" | "fill" | "placeholder" | "blurDataURL"
  > {
  src?: string | null;
  alt?: string;
}

function AvatarImage({
  className,
  src,
  alt = "",
  sizes = "64px",
  ...props
}: AvatarImageProps) {
  const context = React.useContext(AvatarContext);
  const setImageVisible = context?.setImageVisible;
  const [hasError, setHasError] = React.useState(!src);

  React.useEffect(() => {
    setImageVisible?.(false);
    setHasError(!src);
  }, [setImageVisible, src]);

  if (!src || hasError) {
    return null;
  }

  return (
    <>
      {canUseNextImage(src) ? (
        <Image
          {...props}
          alt={alt}
          blurDataURL={DEFAULT_IMAGE_BLUR}
          className={cn("object-cover", className)}
          fill
          onError={() => {
            setHasError(true);
            setImageVisible?.(false);
          }}
          onLoad={() => setImageVisible?.(true)}
          placeholder={getImagePlaceholder(src)}
          sizes={sizes}
          src={src}
          unoptimized={isDataUrl(src)}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={alt}
          className={cn("absolute inset-0 h-full w-full object-cover", className)}
          decoding="async"
          loading="lazy"
          onError={() => {
            setHasError(true);
            setImageVisible?.(false);
          }}
          onLoad={() => setImageVisible?.(true)}
          referrerPolicy="no-referrer"
          src={src}
        />
      )}
    </>
  );
}

const AvatarFallback = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => {
    const context = React.useContext(AvatarContext);

    return (
      <span
        ref={ref}
        className={cn(
          "absolute inset-0 flex h-full w-full items-center justify-center rounded-full bg-muted text-foreground transition-opacity",
          context?.imageVisible ? "opacity-0" : "opacity-100",
          className
        )}
        {...props}
      />
    );
  }
);
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };
