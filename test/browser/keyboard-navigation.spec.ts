import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

import { expect, test, type Locator, type Page } from "@playwright/test"

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

const expectVisibleFocus = async (locator: Locator) => {
  await expect(locator).toBeFocused()
  await expect(locator).toHaveCSS("outline-style", "solid")
  await expect(locator).toHaveCSS("outline-width", "3px")
}

const tabTo = async (page: Page, locator: Locator) => {
  await page.keyboard.press("Tab")
  await expectVisibleFocus(locator)
}

test.describe("keyboard focus order", () => {
  test.beforeEach(async ({ page }) => {
    await useDeterministicPageData(page)
    await page.goto("/customer")
    await expect(
      page.getByRole("heading", { level: 1, name: "Mario Rossi" })
    ).toBeVisible()
  })

  test("skip link reveals itself and moves focus to main content", async ({
    page
  }) => {
    const skipLink = page.getByRole("link", {
      name: "Skip to main content"
    })

    await tabTo(page, skipLink)

    const focusedBox = await skipLink.boundingBox()
    expect(focusedBox).not.toBeNull()
    expect(focusedBox?.y).toBeGreaterThanOrEqual(0)

    await page.keyboard.press("Enter")

    await expect(page).toHaveURL(/#main-content$/)
    await expectVisibleFocus(page.locator("main#main-content"))
  })

  test("desktop tabs through shared navigation before the page action", async ({
    page,
    viewport
  }) => {
    test.skip(viewport === null || viewport.width < 768, "Desktop-only order")

    const navigation = page.getByRole("navigation", {
      name: "Primary navigation"
    })

    await tabTo(
      page,
      page.getByRole("link", { name: "Skip to main content" })
    )
    await tabTo(
      page,
      page.getByRole("link", { name: "Advisor Workbench home" })
    )
    await tabTo(
      page,
      navigation.getByRole("link", { name: "Overview", exact: true })
    )
    await tabTo(
      page,
      navigation.getByRole("link", { name: "Customer", exact: true })
    )
    await tabTo(
      page,
      navigation.getByRole("link", { name: "Proposal", exact: true })
    )
    await tabTo(
      page,
      page.getByRole("link", { name: "View rebalancing proposal" })
    )
  })

  test("mobile tabs through the menu and returns focus when it closes", async ({
    page,
    viewport
  }) => {
    test.skip(viewport?.width !== 375, "Mobile-only order")

    const navigation = page.getByRole("navigation", {
      name: "Primary navigation"
    })

    await tabTo(
      page,
      page.getByRole("link", { name: "Skip to main content" })
    )
    await tabTo(
      page,
      page.getByRole("link", { name: "Advisor Workbench home" })
    )

    const openNavigation = page.getByRole("button", {
      name: "Open primary navigation"
    })
    await tabTo(page, openNavigation)
    await expect(navigation).toBeHidden()

    await page.keyboard.press("Enter")

    const closeNavigation = page.getByRole("button", {
      name: "Close primary navigation"
    })
    await expect(navigation).toBeVisible()
    await expectVisibleFocus(closeNavigation)

    await tabTo(
      page,
      navigation.getByRole("link", { name: "Overview", exact: true })
    )
    await tabTo(
      page,
      navigation.getByRole("link", { name: "Customer", exact: true })
    )
    await tabTo(
      page,
      navigation.getByRole("link", { name: "Proposal", exact: true })
    )
    await tabTo(
      page,
      page.getByRole("link", { name: "View rebalancing proposal" })
    )

    await page.keyboard.press("Escape")

    await expect(navigation).toBeHidden()
    await expect(openNavigation).toHaveAttribute("aria-expanded", "false")
    await expectVisibleFocus(openNavigation)
  })
})
