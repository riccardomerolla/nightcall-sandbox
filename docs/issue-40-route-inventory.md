# Issue #40 route inventory

The application uses the root-level `app/` directory as its Next.js App
Router root. `src/app/` contains only the shared `globals.css` stylesheet, so
the inventory below maps the issue's requested `src/app/` scope to the actual
route files in `app/`. This inventory covers every page and special view in
that route tree at the start of issue #40.

## Intentionally unaffected

| Requested path | Actual path | Route | Status and reason |
| --- | --- | --- | --- |
| `src/app/page.*` | `app/page.tsx` | `/` | Intentionally unaffected: the landing page is the explicit issue exclusion and is outside the remaining application workflow routes. |
| `src/app/dashboard/` | No matching route directory | None | Intentionally unaffected: this path does not exist in this checkout. The customer page calls its loaded view a dashboard, but its route is `app/customer/page.tsx`, so it remains in scope below. |

## Authentication routes

No authentication pages or route-specific loading, error, or validation views
exist in the application route tree. No implementation work is required for
this slice.

## Settings routes

No settings pages exist in the application route tree. No implementation work
is required for this slice.

## List and empty-state routes

| Source | Route or state | Status | Scope preserved during refresh |
| --- | --- | --- | --- |
| `app/customer/page.tsx` | `/customer` loaded view | Updated | Customer and portfolio fixture loading, portfolio positions, allocation comparison, suitability report, and navigation to the customer proposal. |
| `app/customer/page.tsx` | `/customer` loading view | Updated | Busy state, status announcement, and asynchronous customer/portfolio loading behavior. |
| `app/customer/page.tsx` | `/customer` customer request/data error views | Updated | Error source and kind, diagnostic message, and alert semantics. |
| `app/customer/page.tsx` | `/customer` portfolio request/data error views | Updated | Error source and kind, diagnostic message, and alert semantics. |
| `app/customer/page.tsx` | `/customer` suitability empty state | Updated | The no-violations message and absence of violation list items. |
| `app/customer/proposal/page.tsx` | `/customer/proposal` proposed-trades empty state | Updated | The no-trades message and absence of the trades table. |
| `app/customer/proposal/page.tsx` | `/customer/proposal` deferred-adjustments empty state | Updated | The no-deferred-adjustments message and absence of the deferred table. |

## Detail and not-found routes

| Source | Route or state | Status | Scope preserved during refresh |
| --- | --- | --- | --- |
| `app/customer/proposal/page.tsx` | `/customer/proposal` loaded view | Updated | Customer identity, allocation comparison, proposal summary, proposed trades, deferred adjustments, and back navigation. |
| `app/customer/proposal/page.tsx` | `/customer/proposal` loading view | Updated | Busy state, status announcement, back navigation, and asynchronous customer/portfolio loading behavior. |
| `app/customer/proposal/page.tsx` | `/customer/proposal` customer request/data error views | Updated | Error source and kind, diagnostic message, alert semantics, and back navigation. |
| `app/customer/proposal/page.tsx` | `/customer/proposal` portfolio request/data error views | Updated | Error source and kind, diagnostic message, alert semantics, and back navigation. |
| `app/proposal/page.tsx` | `/proposal` placeholder detail view | Updated | Placeholder copy and back navigation to the customer dashboard. |
| Route tree | Route-level `not-found.*` view | Intentionally absent | No route-specific not-found view exists to refresh; Next.js supplies its default fallback. |
| Route tree | Route-level `error.*` view | Intentionally absent | No route-level error boundary exists; the in-page error states above are the complete error-view inventory. |
| `app/layout.tsx` | Root layout special view | Updated | Document language, metadata, global styles, application-shell class, and child rendering. This is the only special layout in the route tree. |

## Form and action routes

No create, edit, submission, or other form/action page exists in the
application route tree. No implementation work is required for this slice.

## Responsive route coverage

A final cross-route verification of `/customer`, `/customer/proposal`, and
`/proposal`, all states listed above, and the shared root layout at 375px,
768px, and 1440px remains for the responsive-coverage slice. The detail-route
tables and summary now wrap or stack within the viewport at those widths;
absent and intentionally unaffected entries retain their stated final reasons.
