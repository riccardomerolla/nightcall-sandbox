import type { Metadata } from "next"
import type { ReactNode } from "react"

import { SiteFooter } from "../src/components/layout/SiteFooter"
import { SiteHeader } from "../src/components/layout/SiteHeader"
import "./globals.css"
import "../src/app/globals.css"
import styles from "./layout.module.css"

export const metadata: Metadata = {
  title: "Advisor Workbench",
  description:
    "Import a customer's portfolio and MiFID profile, analyze it, and propose a rebalancing."
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className={styles.shell}>
          <SiteHeader />
          <div className={`${styles.content} page-shell`}>{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  )
}
