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

test.describe("customer lookup form validation", () => {
  test.beforeEach(async ({ page }) => {
    await useDeterministicPageData(page)
    await page.goto("/")
    await expect(
      page.getByRole("heading", { level: 1, name: "Advisor Workbench" })
    ).toBeVisible()
  })

  test("submitting an empty customer ID shows an accessible error and returns focus to the field", async ({
    page
  }) => {
    const input = page.getByLabel("Customer ID")
    const submit = page.getByRole("button", {
      name: "View customer dashboard"
    })

    await submit.click()

    const error = page.getByRole("alert")
    await expect(error).toHaveText("Enter a customer ID.")
    await expect(input).toBeFocused()
    await expect(input).toHaveAttribute("aria-invalid", "true")

    const errorId = await error.getAttribute("id")
    const describedBy = await input.getAttribute("aria-describedby")
    expect(errorId).not.toBeNull()
    expect(describedBy?.split(" ")).toContain(errorId)
    await expect(page).toHaveURL(/\/$/)
  })

  test("submitting a malformed customer ID shows a format error", async ({
    page
  }) => {
    const input = page.getByLabel("Customer ID")
    const submit = page.getByRole("button", {
      name: "View customer dashboard"
    })

    await input.fill("mario")
    await submit.click()

    const error = page.getByRole("alert")
    await expect(error).toHaveText(
      "Enter a customer ID in the format C-000451."
    )
    await expect(input).toBeFocused()
    await expect(input).toHaveAttribute("aria-invalid", "true")
  })

  test("correcting an invalid customer ID clears the error", async ({
    page
  }) => {
    const input = page.getByLabel("Customer ID")
    const submit = page.getByRole("button", {
      name: "View customer dashboard"
    })

    await submit.click()
    await expect(page.getByRole("alert")).toBeVisible()

    await input.fill("C-000451")
    await submit.click()

    await expect(page.getByRole("alert")).toHaveCount(0)
    await expect(page).toHaveURL(/\/customer$/)
    await expect(
      page.getByRole("heading", { level: 1, name: "Mario Rossi" })
    ).toBeVisible()
  })

  test("the form fits the viewport in its default and invalid states", async ({
    page
  }) => {
    const form = page.locator("form")
    const viewport = page.viewportSize()

    if (viewport === null) {
      throw new Error("A viewport is required for responsive visual coverage")
    }

    const defaultBox = await form.boundingBox()
    expect(defaultBox).not.toBeNull()
    expect(defaultBox?.x).toBeGreaterThanOrEqual(0)
    expect((defaultBox?.x ?? 0) + (defaultBox?.width ?? 0)).toBeLessThanOrEqual(
      viewport.width
    )

    await page.getByRole("button", { name: "View customer dashboard" }).click()
    await expect(page.getByRole("alert")).toBeVisible()

    const invalidBox = await form.boundingBox()
    expect(invalidBox).not.toBeNull()
    expect(invalidBox?.x).toBeGreaterThanOrEqual(0)
    expect((invalidBox?.x ?? 0) + (invalidBox?.width ?? 0)).toBeLessThanOrEqual(
      viewport.width
    )
  })
})
