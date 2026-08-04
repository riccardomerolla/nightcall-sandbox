"use client"

import { useEffect, useId, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "../ui/Button"
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
  const navId = useId()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!isMenuOpen) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isMenuOpen])

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Link className={styles.wordmark} href="/">
          Advisor Workbench
        </Link>
        <Button
          aria-controls={navId}
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className={styles.menuToggle}
          size="small"
          type="button"
          variant="secondary"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span aria-hidden="true" className={styles.menuIcon} />
        </Button>
        <nav aria-label="Primary" className={styles.nav} id={navId}>
          <ul
            className={[
              styles.navList,
              isMenuOpen ? styles.navListOpen : null
            ]
              .filter(Boolean)
              .join(" ")}
          >
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
