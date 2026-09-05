import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  backHref?: string;
  backLabel?: string;
  className?: string;
};

export function PageHeader({ eyebrow, title, backHref, backLabel = "Back", className }: PageHeaderProps) {
  return (
    <header className={className}>
      {backHref && (
        <Link
          href={backHref}
          className="mb-3 inline-flex items-center gap-1 text-[0.75rem] font-medium text-ink-faint transition-colors hover:text-cyan"
        >
          <ChevronLeft className="size-3.5" />
          {backLabel}
        </Link>
      )}
      <p className="t-label">{eyebrow}</p>
      <h1 className="t-display mt-2 text-[1.75rem] text-ink">{title}</h1>
    </header>
  );
}
