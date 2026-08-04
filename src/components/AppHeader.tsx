"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"

const navigationItems = [
  { href: "/", label: "Overview" },
  { href: "/customer", label: "Customer" },
  { href: "/customer/proposal", label: "Proposal" }
] as const

const normalizePathname = (pathname: string) =>
  pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname

export function AppHeader() {
  const pathname = normalizePathname(usePathname())
  const [navigationOpen, setNavigationOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const navigationToggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => setNavigationOpen(false), [pathname])

  useEffect(() => {
    if (!navigationOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !headerRef.current?.contains(event.target)
      ) {
        setNavigationOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNavigationOpen(false)
        navigationToggleRef.current?.focus()
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [navigationOpen])

  return (
    <header className="site-header" ref={headerRef}>
      <Link
        aria-label="Advisor Workbench home"
        className="site-header__brand"
        href="/"
        onClick={() => setNavigationOpen(false)}
      >
        Advisor Workbench
      </Link>
      <button
        aria-controls="primary-navigation"
        aria-expanded={navigationOpen}
        aria-label={`${navigationOpen ? "Close" : "Open"} primary navigation`}
        className="site-navigation__toggle"
        onClick={() => setNavigationOpen((open) => !open)}
        ref={navigationToggleRef}
        type="button"
      >
        Menu
      </button>
      <nav
        aria-label="Primary navigation"
        className="site-navigation"
        data-open={navigationOpen}
        id="primary-navigation"
      >
        <ul className="site-navigation__list">
          {navigationItems.map(({ href, label }) => (
            <li key={href}>
              <Link
                aria-current={pathname === href ? "page" : undefined}
                className="site-navigation__link"
                href={href}
                onClick={() => setNavigationOpen(false)}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
