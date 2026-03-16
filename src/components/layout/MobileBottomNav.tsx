"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Hammer, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/spaces", label: "Spaces", icon: Users },
  { href: "/new", label: "Post", icon: PlusCircle },
  { href: "/forge", label: "Forge", icon: Hammer, forge: true },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-bottom-nav md:hidden">
      {navItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-w-[72px] flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[10px] font-medium transition-all active:scale-[0.98]",
              isActive
                ? item.forge
                  ? "bg-forge/10 text-forge"
                  : "bg-primary/10 text-primary"
                : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
