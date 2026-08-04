import type { HTMLAttributes } from "react"

import styles from "./EmptyState.module.css"

export function EmptyState({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={[styles.emptyState, className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </p>
  )
}
