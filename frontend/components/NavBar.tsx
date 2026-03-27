"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavBar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Properties", icon: "⌂" },
    { href: "/compare", label: "Compare", icon: "⇌" },
    { href: "/pipeline", label: "Pipeline", icon: "◇" },
    { href: "/portfolio", label: "Portfolio", icon: "◈" },
    { href: "/markets", label: "Markets", icon: "◎" },
    { href: "/forecast", label: "Forecast", icon: "◆" },
    { href: "/about", label: "About", icon: "◉" },
  ];

  return (
    <nav className="topNav">
      <div className="topNavInner">
        <Link href="/" className="navBrand">
          <span className="navBrandDot" />
          RossRent
          <span className="navAiBadge">AI</span>
        </Link>
        <div className="navLinks">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`navLink ${pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href)) ? "navLinkActive" : ""}`}
            >
              {link.icon} {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
