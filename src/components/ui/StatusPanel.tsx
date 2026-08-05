import type { ReactNode } from "react"

import { Card } from "./Card"
import { PageContainer } from "./PageContainer"
import styles from "./StatusPanel.module.css"

export interface StatusPanelProps {
  readonly actions?: ReactNode
  readonly busy?: boolean
  readonly id?: string
  readonly message: string
  readonly messageRole: "alert" | "status"
  readonly tabIndex?: number
  readonly title: string
}

export function StatusPanel({
  actions,
  busy = false,
  id,
  message,
  messageRole,
  tabIndex,
  title
}: StatusPanelProps) {
  return (
    <PageContainer
      aria-busy={busy || undefined}
      as="main"
      className={styles.page}
      id={id}
      tabIndex={tabIndex}
      width="narrow"
    >
      <Card className={styles.panel}>
        <p className={styles.eyebrow}>Advisor Workbench</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.message} role={messageRole}>
          {message}
        </p>
        {actions === undefined ? null : (
          <div className={styles.actions}>{actions}</div>
        )}
      </Card>
    </PageContainer>
  )
}
