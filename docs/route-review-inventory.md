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
| `app/page.tsx` | `/` | Root | Pending | `root-shell`: loaded landing page at 375px, 768px, and 1440px; shared-shell keyboard order and WCAG AA scan |
| `app/customer/page.tsx` | `/customer` | Customer workflow | Pending | `customer-workflow`: deterministic populated and loading dashboard states at 375px, 768px, and 1440px; navigation, keyboard order, and WCAG AA scans |
| `app/customer/proposal/page.tsx` | `/customer/proposal` | Customer workflow | Pending | `customer-workflow`: follow the dashboard proposal action, then review populated and empty proposal states responsively and with a WCAG AA scan |
| `app/proposal/page.tsx` | `/proposal` | Proposal placeholder | Pending | `proposal-placeholder`: loaded placeholder at 375px, 768px, and 1440px; back-link keyboard focus and WCAG AA scan |

## Route groups

- **Root** covers the unprefixed landing route.
- **Customer workflow** covers the customer dashboard and the proposal reached
  from its primary action. Its representative scenario exercises the flow
  between both pages rather than duplicating shell assertions.
- **Proposal placeholder** is separate because `/proposal` is a standalone
  placeholder and does not render the customer proposal experience.

When a page module is added, moved, or removed, update this inventory in the
same change. Route groups may share one scenario only when that scenario visits
every page listed in the group.
