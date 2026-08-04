import type { Metadata } from "next"
import type { ReactNode } from "react"

import { AppFooter } from "../src/components/AppFooter"
import { AppHeader } from "../src/components/AppHeader"
import "./globals.css"
import "../src/app/globals.css"

export const metadata: Metadata = {
  title: "Advisor Workbench",
  description:
    "Import a customer's portfolio and MiFID profile, analyze it, and propose a rebalancing."
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="app-shell">
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <AppHeader />
        {children}
        <AppFooter />
      </body>
    </html>
  )
}
