import { Card } from "./Card"
import { PageContainer } from "./PageContainer"
import styles from "./StatusPanel.module.css"

export interface StatusPanelProps {
  readonly busy?: boolean
  readonly message: string
  readonly messageRole: "alert" | "status"
  readonly title: string
}

export function StatusPanel({
  busy = false,
  message,
  messageRole,
  title
}: StatusPanelProps) {
  return (
    <PageContainer
      aria-busy={busy || undefined}
      as="main"
      className={styles.page}
      width="narrow"
    >
      <Card className={styles.panel}>
        <p className={styles.eyebrow}>Advisor Workbench</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.message} role={messageRole}>
          {message}
        </p>
      </Card>
    </PageContainer>
  )
}
