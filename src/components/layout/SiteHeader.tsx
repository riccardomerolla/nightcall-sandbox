"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import styles from "./SiteHeader.module.css"

interface NavDestination {
  readonly href: string
  readonly label: string
}

const NAV_DESTINATIONS: readonly NavDestination[] = [
  { href: "/", label: "Home" },
  { href: "/customer", label: "Customer dashboard" },
  { href: "/customer/proposal", label: "Proposal" }
]

export function SiteHeader() {
  const pathname = usePathname()

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Link className={styles.wordmark} href="/">
          Advisor Workbench
        </Link>
        <nav aria-label="Primary" className={styles.nav}>
          <ul className={styles.navList}>
            {NAV_DESTINATIONS.map(({ href, label }) => {
              const isActive = pathname === href

              return (
                <li key={href}>
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    className={[
                      styles.navLink,
                      isActive ? styles.navLinkActive : null
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    href={href}
                  >
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </header>
  )
}
