import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

import { expect, test, type Page } from "@playwright/test"

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

const routes = [
  {
    name: "overview",
    path: "/",
    heading: "Advisor Workbench",
    currentNavigationItem: "Overview"
  },
  {
    name: "customer",
    path: "/customer",
    heading: "Mario Rossi",
    currentNavigationItem: "Customer"
  }
] as const

const useDeterministicPageData = async (page: Page) => {
  for (const [fileName, body] of Object.entries(fixtureBodies)) {
    await page.route(`**/fixtures/${fileName}`, async (route) => {
      await route.fulfill({
        body: await body,
        contentType: fileName.endsWith(".json")
          ? "application/json"
          : "text/csv",
        status: 200
      })
    })
  }
}

test.describe("responsive shared shell and desktop navigation", () => {
  test.beforeEach(async ({ page }) => {
    await useDeterministicPageData(page)
  })

  for (const route of routes) {
    test(`${route.name} exposes the desktop shell`, async ({ page }) => {
      await page.goto(route.path)
      await expect(
        page.getByRole("heading", { level: 1, name: route.heading })
      ).toBeVisible()

      const header = page.locator(".site-header")
      const main = page.locator("main")
      const footer = page.locator(".site-footer")
      const navigation = page.getByRole("navigation", {
        name: "Primary navigation"
      })

      await expect(header).toBeVisible()
      await expect(main).toBeVisible()
      await expect(footer).toBeVisible()
      await expect(navigation).toBeVisible()
      await expect(header).toHaveCSS("display", "flex")
      await expect(footer).toHaveCSS("flex-direction", "row")
      await expect(navigation.locator("ul")).toHaveCSS(
        "flex-direction",
        "row"
      )
      await expect(
        page.getByRole("button", { name: "Open primary navigation" })
      ).toBeHidden()
      await expect(navigation.getByRole("link")).toHaveText([
        "Overview",
        "Customer",
        "Proposal"
      ])
      const currentNavigationLink = navigation.getByRole("link", {
        name: route.currentNavigationItem,
        exact: true
      })

      await expect(currentNavigationLink).toHaveAttribute(
        "aria-current",
        "page"
      )
      await expect(currentNavigationLink).toHaveCSS("box-shadow", /inset/)
      await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1)

      await expect(header).toHaveScreenshot(`${route.name}-header.png`)
      await expect(navigation).toHaveScreenshot(
        `${route.name}-navigation.png`
      )
      await expect(footer).toHaveScreenshot(`${route.name}-footer.png`)

      const [headerBox, footerBox] = await Promise.all([
        header.boundingBox(),
        footer.boundingBox()
      ])

      expect(headerBox).not.toBeNull()
      expect(footerBox).not.toBeNull()
      expect(headerBox?.x).toBeCloseTo(footerBox?.x ?? Number.NaN, 0)
      expect(headerBox?.width).toBeCloseTo(
        footerBox?.width ?? Number.NaN,
        0
      )
    })
  }
})
