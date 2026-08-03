import Link from "next/link"

export default function ProposalPage() {
  return (
    <main style={{ padding: "3rem", maxWidth: "48rem", margin: "0 auto" }}>
      <h1>Rebalancing proposal</h1>
      <p>The customer&apos;s rebalancing proposal will be available here.</p>
      <p>
        <Link href="/customer">Back to customer dashboard</Link>
      </p>
    </main>
  )
}
