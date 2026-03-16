interface LinkPreview {
  url: string;
  hostname: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

export default function LinkPreviewCard({
  preview,
}: {
  preview: LinkPreview;
}) {
  return (
    <div className="surface-panel-muted overflow-hidden rounded-[24px] border border-border/80">
      {preview.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview.image}
          alt={preview.title || preview.hostname}
          className="h-40 w-full object-cover"
          decoding="async"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : null}
      <div className="space-y-2 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {preview.siteName || preview.hostname}
        </p>
        <p className="text-base font-semibold text-foreground">
          {preview.title || preview.hostname}
        </p>
        {preview.description ? (
          <p className="text-sm leading-6 text-muted-foreground">
            {preview.description}
          </p>
        ) : null}
        <p className="text-xs text-primary">{preview.url}</p>
      </div>
    </div>
  );
}
