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
    await route.fulfill({
      body: await fixtureBodies["mifid-mario-rossi.json"],
      contentType: "application/json",
      status: 200
    })
  })
  await page.route("**/fixtures/portfolio-mario-rossi.csv", async (route) => {
    await route.fulfill({
      body: await fixtureBodies["portfolio-mario-rossi.csv"],
      contentType: "text/csv",
      status: 200
    })
  })

  return { releaseRequest, requestStarted }
}

const useInvalidCustomerFixture = async (page: Page) => {
  const invalidProfile = JSON.parse(
    await fixtureBodies["mifid-mario-rossi.json"]
  ) as Record<string, unknown>
  delete invalidProfile.customerId

  await page.route("**/fixtures/mifid-mario-rossi.json", async (route) => {
    await route.fulfill({
      body: JSON.stringify(invalidProfile),
      contentType: "application/json",
      status: 200
    })
  })
  await page.route("**/fixtures/portfolio-mario-rossi.csv", async (route) => {
    await route.fulfill({
      body: await fixtureBodies["portfolio-mario-rossi.csv"],
      contentType: "text/csv",
      status: 200
    })
  })
}

interface AccessibilityViolation {
  readonly rule: string
  readonly detail: string
}

const auditAccessibility = (): ReadonlyArray<AccessibilityViolation> => {
  const violations: AccessibilityViolation[] = []

  const describe = (el: Element): string => {
    const id = el.id.length > 0 ? `#${el.id}` : ""
    const className =
      typeof el.className === "string" && el.className.length > 0
        ? `.${el.className.split(/\s+/).join(".")}`
        : ""
    const text = (el.textContent ?? "").trim().slice(0, 40)
    return `${el.tagName.toLowerCase()}${id}${className} "${text}"`
  }

  const isRendered = (el: Element): boolean => {
    const style = getComputedStyle(el)
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0"
    ) {
      return false
    }
    const rect = el.getBoundingClientRect()
    return rect.width > 0 || rect.height > 0
  }

  const isVisuallyHidden = (el: Element): boolean => {
    const rect = el.getBoundingClientRect()
    return rect.width <= 1 && rect.height <= 1
  }

  const banners = Array.from(document.querySelectorAll("header")).filter(
    isRendered
  )
  if (banners.length !== 1) {
    violations.push({
      rule: "landmark-banner-unique",
      detail: `Expected exactly one banner landmark, found ${banners.length}`
    })
  }

  const mains = Array.from(document.querySelectorAll("main")).filter(
    isRendered
  )
  if (mains.length !== 1) {
    violations.push({
      rule: "landmark-main-unique",
      detail: `Expected exactly one visible main landmark, found ${mains.length}`
    })
  }

  const contentinfos = Array.from(document.querySelectorAll("footer")).filter(
    isRendered
  )
  if (contentinfos.length !== 1) {
    violations.push({
      rule: "landmark-contentinfo-unique",
      detail: `Expected exactly one contentinfo landmark, found ${contentinfos.length}`
    })
  }

  const navigations = Array.from(document.querySelectorAll("nav")).filter(
    isRendered
  )
  for (const nav of navigations) {
    const label =
      nav.getAttribute("aria-label") ?? nav.getAttribute("aria-labelledby")
    if (!label || label.trim().length === 0) {
      violations.push({
        rule: "navigation-labeled",
        detail: `Navigation landmark is missing an accessible name: ${describe(nav)}`
      })
    }
  }

  const lang = document.documentElement.getAttribute("lang")
  if (!lang || lang.trim().length === 0) {
    violations.push({
      rule: "html-has-lang",
      detail: "<html> is missing a lang attribute"
    })
  }

  const seenIds = new Set<string>()
  for (const el of Array.from(document.querySelectorAll("[id]"))) {
    const id = el.id
    if (id.length === 0) {
      continue
    }
    if (seenIds.has(id)) {
      violations.push({ rule: "duplicate-id", detail: `Duplicate id "${id}"` })
    }
    seenIds.add(id)
  }

  const headings = Array.from(
    document.querySelectorAll("h1, h2, h3, h4, h5, h6")
  ).filter(isRendered)
  const h1Count = headings.filter((heading) => heading.tagName === "H1").length
  if (h1Count !== 1) {
    violations.push({
      rule: "page-has-heading-one",
      detail: `Expected exactly one visible <h1>, found ${h1Count}`
    })
  }
  let previousLevel = 0
  for (const heading of headings) {
    const level = Number(heading.tagName.slice(1))
    if (previousLevel > 0 && level - previousLevel > 1) {
      violations.push({
        rule: "heading-order",
        detail: `Heading level jumps from h${previousLevel} to h${level}: ${describe(heading)}`
      })
    }
    previousLevel = level
  }

  const controls = Array.from(
    document.querySelectorAll("a[href], button")
  ).filter(isRendered)
  for (const control of controls) {
    const accessibleName =
      control.getAttribute("aria-label") ?? (control.textContent ?? "")
    if (accessibleName.trim().length === 0) {
      violations.push({
        rule: "control-name",
        detail: `Interactive control has no accessible name: ${describe(control)}`
      })
    }
  }

  for (const img of Array.from(document.querySelectorAll("img")).filter(
    isRendered
  )) {
    if (!img.hasAttribute("alt")) {
      violations.push({
        rule: "image-alt",
        detail: `<img> is missing an alt attribute: ${describe(img)}`
      })
    }
  }

  const parseRgb = (
    value: string
  ): { r: number; g: number; b: number; a: number } | null => {
    const match = value.match(/rgba?\(([^)]+)\)/)
    if (!match) {
      return null
    }
    const parts = (match[1] ?? "")
      .split(",")
      .map((part) => Number.parseFloat(part.trim()))
    const [r, g, b, a] = parts
    if (r === undefined || g === undefined || b === undefined) {
      return null
    }
    return { r, g, b, a: a ?? 1 }
  }

  const relativeLuminance = ({
    r,
    g,
    b
  }: {
    r: number
    g: number
    b: number
  }): number => {
    const channel = (value: number): number => {
      const normalized = value / 255
      return normalized <= 0.03928
        ? normalized / 12.92
        : Math.pow((normalized + 0.055) / 1.055, 2.4)
    }
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
  }

  const contrastRatio = (
    foreground: { r: number; g: number; b: number },
    background: { r: number; g: number; b: number }
  ): number => {
    const foregroundLuminance = relativeLuminance(foreground)
    const backgroundLuminance = relativeLuminance(background)
    const lighter = Math.max(foregroundLuminance, backgroundLuminance)
    const darker = Math.min(foregroundLuminance, backgroundLuminance)
    return (lighter + 0.05) / (darker + 0.05)
  }

  const resolveBackgroundColor = (
    el: Element
  ): { r: number; g: number; b: number } => {
    let node: Element | null = el
    while (node) {
      const background = parseRgb(getComputedStyle(node).backgroundColor)
      if (background && background.a > 0.99) {
        return background
      }
      node = node.parentElement
    }
    return { r: 255, g: 255, b: 255 }
  }

  const isLargeText = (style: CSSStyleDeclaration): boolean => {
    const sizePx = Number.parseFloat(style.fontSize)
    const bold = style.fontWeight === "bold" || Number(style.fontWeight) >= 700
    return sizePx >= 24 || (sizePx >= 18.66 && bold)
  }

  const textElements = Array.from(document.querySelectorAll("body *")).filter(
    (el) => {
      if (el.closest("svg")) {
        return false
      }
      if (el.tagName === "SCRIPT" || el.tagName === "STYLE") {
        return false
      }
      return Array.from(el.childNodes).some(
        (node) =>
          node.nodeType === Node.TEXT_NODE &&
          (node.textContent ?? "").trim().length > 0
      )
    }
  )

  for (const el of textElements) {
    if (!isRendered(el) || isVisuallyHidden(el)) {
      continue
    }
    const style = getComputedStyle(el)
    const foreground = parseRgb(style.color)
    if (!foreground) {
      continue
    }
    const background = resolveBackgroundColor(el)
    const ratio = contrastRatio(foreground, background)
    const required = isLargeText(style) ? 3 : 4.5
    if (ratio + 0.01 < required) {
      violations.push({
        rule: "color-contrast",
        detail: `${describe(el)} has a contrast ratio of ${ratio.toFixed(2)}, below the required ${required}:1`
      })
    }
  }

  return violations
}

const expectNoAccessibilityViolations = async (page: Page) => {
  const violations = await page.evaluate(auditAccessibility)
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
}

test.describe("WCAG AA accessibility scans", () => {
  test("root-shell has no accessibility violations", async ({ page }) => {
    await page.goto("/")
    await expect(
      page.getByRole("heading", { level: 1, name: "Advisor Workbench" })
    ).toBeVisible()
    await expectNoAccessibilityViolations(page)
  })

  test("customer-workflow loading state has no accessibility violations", async ({
    page
  }) => {
    const customerData = await holdCustomerData(page)

    try {
      await page.goto("/customer")
      await customerData.requestStarted
      await expect(page.getByRole("status")).toBeVisible()
      await expectNoAccessibilityViolations(page)
    } finally {
      customerData.releaseRequest()
    }
  })

  test("customer-workflow populated state has no accessibility violations", async ({
    page
  }) => {
    await useDeterministicPageData(page)
    await page.goto("/customer")
    await expect(
      page.getByRole("heading", { level: 1, name: "Mario Rossi" })
    ).toBeVisible()
    await expectNoAccessibilityViolations(page)
  })

  test("customer-workflow proposal state has no accessibility violations", async ({
    page
  }) => {
    await useDeterministicPageData(page)
    await page.goto("/customer")
    await expect(
      page.getByRole("heading", { level: 1, name: "Mario Rossi" })
    ).toBeVisible()

    await page
      .getByRole("link", { name: "View rebalancing proposal" })
      .click()

    await expect(page).toHaveURL(/\/customer\/proposal$/)
    await expect(
      page.getByRole("heading", { level: 1, name: "Rebalancing proposal" })
    ).toBeVisible()
    await expectNoAccessibilityViolations(page)
  })

  test("customer-workflow invalid data state has no accessibility violations", async ({
    page
  }) => {
    await useInvalidCustomerFixture(page)
    await page.goto("/customer")
    await expect(
      page.getByRole("heading", { level: 1, name: "Unable to load customer" })
    ).toBeVisible()
    await expect(page.getByRole("alert")).toBeVisible()
    await expectNoAccessibilityViolations(page)
  })

  test("proposal-placeholder has no accessibility violations", async ({
    page
  }) => {
    await page.goto("/proposal")
    await expect(
      page.getByRole("heading", { level: 1, name: "Rebalancing proposal" })
    ).toBeVisible()
    await expectNoAccessibilityViolations(page)
  })

  test("mobile navigation open state has no accessibility violations", async ({
    page,
    viewport
  }) => {
    test.skip(viewport?.width !== 375, "Mobile-only navigation state")

    await page.goto("/")
    await expect(
      page.getByRole("heading", { level: 1, name: "Advisor Workbench" })
    ).toBeVisible()

    await page
      .getByRole("button", { name: "Open primary navigation" })
      .click()

    await expect(
      page.getByRole("navigation", { name: "Primary navigation" })
    ).toBeVisible()
    await expectNoAccessibilityViolations(page)
  })
})
