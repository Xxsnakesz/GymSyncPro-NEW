import { cn } from "@/lib/utils";

interface BrandTopbarProps {
  className?: string;
  title?: string;
}

export default function BrandTopbar({ className, title = "IDACHI FITNESS JAKARTA" }: BrandTopbarProps) {
  return (
    <div
      className={cn(
        "w-full flex items-center justify-center gap-3 rounded-lg px-3 py-3 border border-border bg-background shadow-sm",
        className
      )}
      role="banner"
      aria-label={title}
    >
      <span className="text-base sm:text-lg font-extrabold tracking-wide uppercase text-white">
        {title}
      </span>
    </div>
  );
}
