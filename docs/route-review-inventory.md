# Route review inventory

This inventory is the source of truth for post-redesign browser and
accessibility review. A route is `Pending` until its representative scenario
has responsive visual assertions and passes the WCAG AA scan; change it to
`Covered` only when that scenario is in the test suite.

The application currently uses the root `app/` App Router directory. The
`src/app/` directory contains `globals.css`, but no `page` modules. To avoid
silently omitting live routes, this inventory covers every `app/**/page.tsx`
module and should also include any future `src/app/**/page.tsx` modules.

## Pages

| Page module | Route | Route group | Review status | Representative browser/accessibility scenario |
| --- | --- | --- | --- | --- |
| `app/page.tsx` | `/` | Root | Covered | `root-shell`: loaded landing page at 375px, 768px, and 1440px; shared-shell keyboard order and WCAG AA scan. `form-validation`: the customer lookup form's empty, malformed, and corrected states at 375px, 768px, and 1440px, with WCAG AA scans of its default and invalid states |
| `app/customer/page.tsx` | `/customer` | Customer workflow | Covered | `customer-workflow`: deterministic populated, loading, and invalid-data dashboard states at 375px, 768px, and 1440px; navigation, keyboard order, and WCAG AA scans |
| `app/customer/proposal/page.tsx` | `/customer/proposal` | Customer workflow | Covered | `customer-workflow`: follow the dashboard proposal action, then review the populated proposal state responsively and with a WCAG AA scan |
| `app/proposal/page.tsx` | `/proposal` | Proposal placeholder | Covered | `proposal-placeholder`: loaded placeholder at 375px, 768px, and 1440px; back-link keyboard focus and WCAG AA scan |

## Route groups

- **Root** covers the unprefixed landing route, including its customer
  lookup form — the only form in the application and the representative
  scenario for form-validation coverage.
- **Customer workflow** covers the customer dashboard and the proposal reached
  from its primary action. Its representative scenario exercises the flow
  between both pages rather than duplicating shell assertions.
- **Proposal placeholder** is separate because `/proposal` is a standalone
  placeholder and does not render the customer proposal experience.

When a page module is added, moved, or removed, update this inventory in the
same change. Route groups may share one scenario only when that scenario visits
every page listed in the group.

## Known limitation: pixel-snapshot baselines are not yet committed

Each scenario now also asserts `expect(locator).toHaveScreenshot()` for its
shell regions and representative page states (shared shell header/nav/footer,
mobile navigation's closed/open states, each route group's page states, and
the form's default/invalid states), in addition to the CSS-property and
bounding-box checks (`toHaveCSS`, `boundingBox()`) that were already present.

Those `toHaveScreenshot()` assertions have no committed baseline images yet:
generating them requires running the Playwright browser suite once with
`npm run test:browser -- --update-snapshots` from an environment with
headless Chromium execution access, then committing the resulting
`test/browser/*.spec.ts-snapshots/*.png` files. The environment that added
this coverage could not run that command — every attempt to invoke `npx
playwright`, the local `playwright` binary, `npm run test:browser`, and even
plain `node -e`/`npm --version` was blocked by the sandbox's approval gate for
process execution, with no interactive user available to grant it.

Until that one-time generation run happens, `toHaveScreenshot()` will create
and pass on its first execution (per Playwright's `updateSnapshots: 'missing'`
default) rather than fail — so CI stays green, but there is no real pixel
regression protection until the baselines above are generated and committed.
No fixture content in these pages is date-, time-, or randomness-derived (see
`app/**/page.tsx`), so no masking is expected to be necessary; revisit this if
that changes.
