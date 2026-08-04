import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

import { expect, test, type Page, type Route } from "@playwright/test"

const fixtureBodies = {
  "mifid-mario-rossi.json": readFile(
    resolve("fixtures/mifid-mario-rossi.json"),
    "utf8"
  ),
  "portfolio-mario-rossi.csv": readFile(
    resolve("fixtures/portfolio-mario-rossi.csv"),
    "utf8"
  )
}

const fulfillFixture = async (
  route: Route,
  fileName: keyof typeof fixtureBodies
) => {
  await route.fulfill({
    body: await fixtureBodies[fileName],
    contentType: fileName.endsWith(".json")
      ? "application/json"
      : "text/csv",
    status: 200
  })
}

const holdCustomerData = async (page: Page) => {
  let releaseRequest = () => {}
  let markRequestStarted = () => {}
  const requestReleased = new Promise<void>((resolveRequest) => {
    releaseRequest = resolveRequest
  })
  const requestStarted = new Promise<void>((resolveRequest) => {
    markRequestStarted = resolveRequest
  })

  await page.route("**/fixtures/mifid-mario-rossi.json", async (route) => {
    markRequestStarted()
    await requestReleased
    await fulfillFixture(route, "mifid-mario-rossi.json")
  })
  await page.route("**/fixtures/portfolio-mario-rossi.csv", (route) =>
    fulfillFixture(route, "portfolio-mario-rossi.csv")
  )

  return { releaseRequest, requestStarted }
}

const expectPageToFitViewport = async (page: Page) => {
  const viewport = page.viewportSize()

  if (viewport === null) {
    throw new Error("A viewport is required for responsive visual coverage")
  }

  const mainBox = await page.locator("main").boundingBox()
  const documentWidth = await page.evaluate(
    () => document.documentElement.scrollWidth
  )

  expect(mainBox).not.toBeNull()
  expect(mainBox?.x).toBeGreaterThanOrEqual(0)
  expect((mainBox?.x ?? 0) + (mainBox?.width ?? 0)).toBeLessThanOrEqual(
    viewport.width
  )
  expect(documentWidth).toBeLessThanOrEqual(viewport.width)
}

test.describe("representative route-group page states", () => {
  test("root-shell renders its loaded overview", async ({ page }) => {
    await page.goto("/")

    await expect(
      page.getByRole("heading", { level: 1, name: "Advisor Workbench" })
    ).toBeVisible()
    await expectPageToFitViewport(page)
    await expect(page.locator("main")).toHaveScreenshot("root-overview.png")
  })

  test("customer-workflow renders loading and populated views", async ({
    page
  }) => {
    const customerData = await holdCustomerData(page)

    try {
      await page.goto("/customer")
      await customerData.requestStarted

      const loadingStatus = page.getByRole("status")
      await expect(loadingStatus).toBeVisible()
      await expect(loadingStatus).toHaveText("Loading customer data…")
      await expect(page.locator("main")).toHaveAttribute("aria-busy", "true")
      await expect(page.locator("main")).toHaveCSS("display", "grid")
      await expectPageToFitViewport(page)
      await expect(page.locator("main")).toHaveScreenshot(
        "customer-loading.png"
      )
    } finally {
      customerData.releaseRequest()
    }

    await expect(
      page.getByRole("heading", { level: 1, name: "Mario Rossi" })
    ).toBeVisible()
    await expect(
      page.getByRole("region", { name: "Positions" }).getByRole("row")
    ).toHaveCount(8)
    const positionsTable = page
      .getByRole("region", { name: "Positions" })
      .getByRole("table")
    const viewport = page.viewportSize()

    if (viewport?.width === 375) {
      await expect(positionsTable).toHaveCSS("display", "block")
      await expect(positionsTable.locator("tbody")).toHaveCSS(
        "display",
        "grid"
      )
    } else {
      await expect(positionsTable).toHaveCSS("display", "table")
      await expect(positionsTable.locator("tbody")).toHaveCSS(
        "display",
        "table-row-group"
      )
    }
    await expectPageToFitViewport(page)
    await expect(page.locator("main")).toHaveScreenshot(
      "customer-populated.png"
    )

    await page
      .getByRole("link", { name: "View rebalancing proposal" })
      .click()

    await expect(page).toHaveURL(/\/customer\/proposal$/)
    await expect(
      page.getByRole("heading", { level: 1, name: "Rebalancing proposal" })
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { level: 2, name: "Proposed trades" })
    ).toBeVisible()
    await expectPageToFitViewport(page)
    await expect(page.locator("main")).toHaveScreenshot(
      "customer-proposal.png"
    )
  })

  test("proposal-placeholder renders its loaded state", async ({ page }) => {
    await page.goto("/proposal")

    await expect(
      page.getByRole("heading", { level: 1, name: "Rebalancing proposal" })
    ).toBeVisible()
    await expect(
      page.getByText("The customer's rebalancing proposal will be available here.")
    ).toBeVisible()
    await expectPageToFitViewport(page)
    await expect(page.locator("main")).toHaveScreenshot(
      "proposal-placeholder.png"
    )
  })
})
