"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/scan", label: "Scan" },
  { href: "/garage", label: "Garage" },
  { href: "/map", label: "Map" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="nav">
      <Link href="/" className="brand">
        GADI<span>DEX</span>
      </Link>
      <nav className="nav-links" aria-label="Primary">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={pathname.startsWith(link.href) ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
