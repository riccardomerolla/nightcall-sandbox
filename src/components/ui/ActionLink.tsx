import Link from "next/link"
import type { ComponentProps } from "react"

import styles from "./ActionLink.module.css"

type ActionLinkVariant = "primary" | "secondary"

export interface ActionLinkProps extends ComponentProps<typeof Link> {
  readonly variant?: ActionLinkVariant
}

export function ActionLink({
  children,
  className,
  variant = "primary",
  ...props
}: ActionLinkProps) {
  return (
    <Link
      className={[styles.action, styles[variant], className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </Link>
  )
}
