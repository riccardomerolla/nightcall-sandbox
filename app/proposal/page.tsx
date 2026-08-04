import Link from "next/link"

import styles from "../customer/customer.module.css"

export default function ProposalPage() {
  return (
    <main className={`${styles.dashboard} ${styles.statePage}`}>
      <div className="feedback-card">
        <h1 className={styles.stateTitle}>Rebalancing proposal</h1>
        <p className={styles.stateMessage}>
          The customer&apos;s rebalancing proposal will be available here.
        </p>
        <p className={styles.stateNavigation}>
          <Link className={styles.backLink} href="/customer">
            Back to customer dashboard
          </Link>
        </p>
      </div>
    </main>
  )
}
