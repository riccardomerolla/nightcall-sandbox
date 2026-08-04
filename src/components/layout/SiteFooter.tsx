import styles from "./SiteFooter.module.css"

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <div className={styles.bar}>
        <span className={styles.wordmark}>Advisor Workbench</span>
        <p className={styles.copyright}>
          © {year} Advisor Workbench. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
