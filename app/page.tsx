import { ActionLink } from "../src/components/ui/ActionLink"
import { Card } from "../src/components/ui/Card"
import { PageContainer } from "../src/components/ui/PageContainer"
import { PageHeader } from "../src/components/ui/PageHeader"
import styles from "./page.module.css"

const workflow = [
  {
    label: "01",
    title: "Understand the client",
    description:
      "Bring the MiFID profile, objectives, and investment horizon into one clear view."
  },
  {
    label: "02",
    title: "See the whole portfolio",
    description:
      "Review positions, allocation, and target deviations without losing the financial context."
  },
  {
    label: "03",
    title: "Prepare the next move",
    description:
      "Turn suitability findings into a practical rebalancing proposal for the client conversation."
  }
] as const

export default function Home() {
  return (
    <PageContainer as="main" className={styles.landing}>
      <section aria-labelledby="landing-title" className={styles.hero}>
        <PageHeader
          actions={
            <>
              <ActionLink href="/customer">Open customer dashboard</ActionLink>
              <ActionLink href="/customer/proposal" variant="secondary">
                Review proposal
              </ActionLink>
            </>
          }
          description="A focused workspace for understanding a client’s portfolio, checking suitability, and preparing a confident recommendation."
          eyebrow="Portfolio intelligence for advisors"
          title="Advisor Workbench"
          titleId="landing-title"
        />
        <div aria-hidden="true" className={styles.heroVisual}>
          <span className={styles.heroLine} />
          <span className={styles.heroValue}>One client. One clear view.</span>
        </div>
      </section>

      <section aria-labelledby="workflow-heading" className={styles.workflow}>
        <div className={styles.sectionIntro}>
          <p className={styles.sectionEyebrow}>Built for the meeting</p>
          <h2 id="workflow-heading">From client data to a clear decision</h2>
        </div>
        <div className={styles.cardGrid}>
          {workflow.map(({ description, label, title }) => (
            <Card as="article" className={styles.workflowCard} key={label}>
              <span className={styles.cardIndex}>{label}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </Card>
          ))}
        </div>
      </section>
    </PageContainer>
  )
}
