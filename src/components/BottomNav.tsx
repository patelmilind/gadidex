"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/scan", label: "Scan", icon: "◎" },
  { href: "/garage", label: "Garage", icon: "▣" },
  { href: "/map", label: "Map", icon: "◌" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {links.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={active ? "bottom-nav-link is-active" : "bottom-nav-link"}
            aria-current={active ? "page" : undefined}
          >
            <span className="bottom-nav-icon" aria-hidden>
              {link.icon}
            </span>
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}