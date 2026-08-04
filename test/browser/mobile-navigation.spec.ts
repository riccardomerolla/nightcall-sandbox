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

test("mobile navigation opens, selects a route, and closes", async ({
  page
}) => {
  await useDeterministicPageData(page)
  await page.goto("/")
  await expect(
    page.getByRole("heading", { level: 1, name: "Advisor Workbench" })
  ).toBeVisible()

  const header = page.locator(".site-header")
  const navigation = page.getByRole("navigation", {
    name: "Primary navigation"
  })
  const openNavigation = page.getByRole("button", {
    name: "Open primary navigation"
  })

  await expect(openNavigation).toBeVisible()
  await expect(openNavigation).toHaveAttribute("aria-expanded", "false")
  await expect(header).toHaveCSS("display", "grid")
  await expect(openNavigation).toHaveCSS("display", "inline-flex")
  await expect(navigation).toBeHidden()

  await openNavigation.click()

  const closeNavigation = page.getByRole("button", {
    name: "Close primary navigation"
  })
  await expect(closeNavigation).toHaveAttribute("aria-expanded", "true")
  await expect(navigation).toBeVisible()
  await expect(navigation.locator("ul")).toHaveCSS(
    "flex-direction",
    "column"
  )
  const overviewLink = navigation.getByRole("link", {
    name: "Overview",
    exact: true
  })
  await expect(overviewLink).toHaveAttribute("aria-current", "page")
  await expect(overviewLink).toHaveCSS("box-shadow", /inset/)
  await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1)

  await navigation
    .getByRole("link", { name: "Customer", exact: true })
    .click()

  await expect(page).toHaveURL(/\/customer$/)
  await expect(
    page.getByRole("heading", { level: 1, name: "Mario Rossi" })
  ).toBeVisible()
  await expect(navigation).toBeHidden()
  await expect(openNavigation).toHaveAttribute("aria-expanded", "false")
  const customerLink = navigation.getByRole("link", {
    name: "Customer",
    exact: true
  })
  await expect(customerLink).toHaveAttribute("aria-current", "page")

  await openNavigation.click()

  await expect(navigation).toBeVisible()
  await expect(customerLink).toHaveCSS("box-shadow", /inset/)
  await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1)

  await closeNavigation.click()

  await expect(navigation).toBeHidden()
  await expect(openNavigation).toHaveAttribute("aria-expanded", "false")
})
