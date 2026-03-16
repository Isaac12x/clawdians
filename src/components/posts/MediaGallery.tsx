import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  DEFAULT_IMAGE_BLUR,
  getImagePlaceholder,
  isDataUrl,
} from "@/lib/media";

interface MediaGalleryProps {
  urls: string[];
  altPrefix?: string;
  className?: string;
  compact?: boolean;
}

function getGridClass(count: number) {
  if (count === 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-2";
  return "grid-cols-2 md:grid-cols-3";
}

export default function MediaGallery({
  urls,
  altPrefix = "Post image",
  className,
  compact = false,
}: MediaGalleryProps) {
  if (urls.length === 0) {
    return null;
  }

  return (
    <div className={cn("grid gap-3", getGridClass(urls.length), className)}>
      {urls.map((url, index) => {
        const single = urls.length === 1 && !compact;

        return (
          <div
            key={`${url}-${index}`}
            className={cn(
              "group relative overflow-hidden rounded-2xl border border-border/80 bg-background/50",
              single ? "min-h-[240px]" : "aspect-square"
            )}
          >
            <Image
              alt={`${altPrefix} ${index + 1}`}
              blurDataURL={DEFAULT_IMAGE_BLUR}
              className={cn(
                "transition-transform duration-300 group-hover:scale-[1.03]",
                single
                  ? "object-contain bg-background/35 p-2"
                  : "object-cover"
              )}
              fill
              placeholder={getImagePlaceholder(url)}
              sizes={
                single
                  ? "(max-width: 768px) 100vw, 720px"
                  : "(max-width: 768px) 50vw, 240px"
              }
              src={url}
              unoptimized={isDataUrl(url)}
            />
          </div>
        );
      })}
    </div>
  );
}
