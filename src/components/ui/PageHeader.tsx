import type { ReactNode } from "react"

import styles from "./PageHeader.module.css"

export interface PageHeaderProps {
  readonly actions?: ReactNode
  readonly children?: ReactNode
  readonly className?: string
  readonly description?: ReactNode
  readonly eyebrow?: ReactNode
  readonly title: ReactNode
  readonly titleId: string
}

export function PageHeader({
  actions,
  children,
  className,
  description,
  eyebrow,
  title,
  titleId
}: PageHeaderProps) {
  return (
    <header
      aria-labelledby={titleId}
      className={[styles.header, className].filter(Boolean).join(" ")}
    >
      <div className={styles.topline}>
        <div className={styles.copy}>
          {eyebrow === undefined ? null : (
            <p className={styles.eyebrow}>{eyebrow}</p>
          )}
          <h1 className={styles.title} id={titleId}>
            {title}
          </h1>
          {description === undefined ? null : (
            <p className={styles.description}>{description}</p>
          )}
        </div>
        {actions === undefined ? null : (
          <div className={styles.actions}>{actions}</div>
        )}
      </div>
      {children === undefined ? null : (
        <div className={styles.content}>{children}</div>
      )}
    </header>
  )
}
