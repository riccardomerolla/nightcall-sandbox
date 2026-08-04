import { forwardRef, type HTMLAttributes } from "react"

import styles from "./Badge.module.css"

export type BadgeVariant =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly variant?: BadgeVariant
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, className, variant = "neutral", ...props }, ref) => (
    <span
      className={[styles.badge, styles[variant], className]
        .filter(Boolean)
        .join(" ")}
      ref={ref}
      {...props}
    >
      {children}
    </span>
  )
)

Badge.displayName = "Badge"
