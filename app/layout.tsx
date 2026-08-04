import type { Metadata } from "next"
import type { ReactNode } from "react"

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
      <body>{children}</body>
    </html>
  )
}
