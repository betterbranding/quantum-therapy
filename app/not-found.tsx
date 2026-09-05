import Link from "next/link";
import { Radio, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
      <div className="relative mb-6 grid size-32 place-items-center">
        <div className="rings">
          <span className="ring" />
          <span className="ring" />
          <span className="ring" />
          <span className="ring" />
        </div>
        <Radio className="glow-cyan size-8 text-cyan" />
      </div>

      <p className="t-label">Signal lost</p>
      <h1 className="t-display mt-2 text-[2rem] text-ink">404</h1>
      <p className="mt-3 max-w-sm text-[0.86rem] leading-relaxed text-ink-mute">
        That frequency is not in the library. Search 1,395 protocols and 22 standalone tones instead.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link href="/search" className="btn btn-primary inline-flex items-center gap-2 px-6 py-3 text-[0.72rem]">
          <Search className="size-3.5" />
          Search the library
        </Link>
        <Link href="/" className="btn inline-flex px-6 py-3 text-[0.72rem] text-ink-soft">
          Back home
        </Link>
      </div>
    </div>
  );
}
