import { useMemo, useState } from "react";
// Import the image via Vite so it gets served correctly even outside /public
// Path alias @assets points to /attached_assets in vite.config and tsconfig
import idachi1 from "@assets/idachi1.png";
import { cn } from "@/lib/utils";

interface BrandWatermarkProps {
  className?: string;
  srcPrimary?: string; // likely '/attached_assets/image_1759411904981.png'
  srcFallback?: string; // e.g. '/idachi-bg.png' (place under client/public)
  opacity?: number; // 0..1
}

export default function BrandWatermark({
  className,
  srcPrimary = idachi1,
  srcFallback = "/idachi-bg.png",
  opacity = 0.80,
}: BrandWatermarkProps) {
  const candidates = useMemo(() => [
    srcPrimary,
    "/image_1759411904981.png",
    "/attached_assets/idachi1.png",
    srcFallback,
  ], [srcPrimary, srcFallback]);
  const [idx, setIdx] = useState(0);
  const [src, setSrc] = useState(candidates[0]);
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  return (
    <div
      className={cn(
        "pointer-events-none select-none fixed inset-0 z-0 flex items-center justify-center",
        className
      )}
      aria-hidden
    >
      {/* decorative image centered */}
      <img
        src={src}
        alt=""
        style={{ opacity }}
        className="max-w-[70%] w-[360px] sm:w-[420px] md:w-[520px] max-h-[70vh] object-contain drop-shadow-xl"
        onError={() => {
          const next = idx + 1;
          if (next < candidates.length) {
            setIdx(next);
            setSrc(candidates[next]);
          } else {
            setHidden(true);
          }
        }}
      />
    </div>
  );
}
