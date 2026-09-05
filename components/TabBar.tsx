"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Home, Radio, Search, Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/frequencies", label: "Tones", Icon: Radio },
  { href: "/search", label: "Search", Icon: Search },
  { href: "/sessions", label: "Sessions", Icon: Heart },
  { href: "/profile", label: "Profile", Icon: User },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      aria-label="Primary"
    >
      <div className="glass flex w-full max-w-[440px] items-stretch justify-between gap-0.5 rounded-[26px] p-1.5">
        {TABS.map(({ href, label, Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="relative flex flex-1 flex-col items-center gap-1 rounded-[19px] px-1 py-2.5"
            >
              {active && (
                <motion.span
                  layoutId="tab-pill"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-[19px] border border-cyan/35 bg-cyan/12 shadow-[0_0_26px_-10px_var(--color-cyan)]"
                />
              )}
              <Icon
                className={cn(
                  "relative size-[19px] transition-colors duration-300",
                  active ? "text-cyan-glow" : "text-ink-faint",
                )}
                strokeWidth={active ? 2.2 : 1.7}
              />
              <span
                className={cn(
                  "relative text-[0.5625rem] font-semibold tracking-[0.1em] uppercase transition-colors duration-300",
                  active ? "text-cyan-glow" : "text-ink-faint",
                )}
                style={{ fontFamily: "var(--font-display)" }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
