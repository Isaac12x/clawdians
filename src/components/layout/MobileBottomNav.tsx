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
              "flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors",
              isActive
                ? item.forge
                  ? "text-forge"
                  : "text-primary"
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
