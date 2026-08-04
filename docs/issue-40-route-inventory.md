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

| Source | Route or state | Final status | Scope preserved and responsive outcome |
| --- | --- | --- | --- |
| `app/customer/page.tsx` | `/customer` loaded view | Updated | Customer and portfolio fixture loading, portfolio positions, allocation comparison, suitability report, and proposal navigation are preserved. The header action and summary wrap, the chart stays width-bound, and tables become labeled cards at 375px while remaining fixed-layout tables at 768px and 1440px. |
| `app/customer/page.tsx` | `/customer` loading view | Updated | Busy state, status announcement, and asynchronous loading behavior are preserved. The shared feedback card is width-bound and centered without viewport overflow at 375px, 768px, and 1440px. |
| `app/customer/page.tsx` | `/customer` customer request/data error views | Updated | Error source and kind, diagnostic message, and alert semantics are preserved. Diagnostic text wraps within the shared feedback card at all three widths. |
| `app/customer/page.tsx` | `/customer` portfolio request/data error views | Updated | Error source and kind, diagnostic message, and alert semantics are preserved. Diagnostic text wraps within the shared feedback card at all three widths. |
| `app/customer/page.tsx` | `/customer` suitability empty state | Updated | The no-violations message and absence of list items are preserved. The shared empty-state card remains width-bound at all three widths. |
| `app/customer/proposal/page.tsx` | `/customer/proposal` proposed-trades empty state | Updated | The no-trades message and absence of the trades table are preserved. The shared empty-state card remains width-bound at all three widths. |
| `app/customer/proposal/page.tsx` | `/customer/proposal` deferred-adjustments empty state | Updated | The no-deferred-adjustments message and absence of the deferred table are preserved. The shared empty-state card remains width-bound at all three widths. |

## Detail and not-found routes

| Source | Route or state | Final status | Scope preserved and responsive outcome |
| --- | --- | --- | --- |
| `app/customer/proposal/page.tsx` | `/customer/proposal` loaded view | Updated | Customer identity, allocation comparison, proposal summary, trades, deferred adjustments, and back navigation are preserved. Summary cards and labeled table cards stack at 375px; the three-column summary and fixed-layout tables wrap safely at 768px and 1440px. |
| `app/customer/proposal/page.tsx` | `/customer/proposal` loading view | Updated | Busy state, status announcement, back navigation, and asynchronous loading behavior are preserved. The feedback card and link wrap without overflow at all three widths. |
| `app/customer/proposal/page.tsx` | `/customer/proposal` customer request/data error views | Updated | Error source and kind, diagnostic message, alert semantics, and back navigation are preserved. Diagnostic text and navigation wrap within the feedback card at all three widths. |
| `app/customer/proposal/page.tsx` | `/customer/proposal` portfolio request/data error views | Updated | Error source and kind, diagnostic message, alert semantics, and back navigation are preserved. Diagnostic text and navigation wrap within the feedback card at all three widths. |
| `app/proposal/page.tsx` | `/proposal` placeholder detail view | Updated | Placeholder copy and back navigation are preserved. The feedback card and navigation remain centered, width-bound, and wrapping at all three widths. |
| Route tree | Route-level `not-found.*` view | Intentionally absent | No route-specific not-found view exists to refresh; Next.js supplies its default fallback. |
| Route tree | Route-level `error.*` view | Intentionally absent | No route-level error boundary exists; the in-page error states above are the complete error-view inventory. |
| `app/layout.tsx` | Root layout special view | Updated | Document language, metadata, global styles, application-shell class, and child rendering are preserved. The shell supplies bounded page sizing, border-box layout, intrinsic media sizing, and wrapping at all three widths. |

## Form and action routes

No create, edit, submission, or other form/action page exists in the
application route tree. No implementation work is required for this slice.

## Responsive route coverage

Responsive coverage is complete for every updated route and special state.

| Viewport | Final verification outcome |
| --- | --- |
| 375px | Page padding contracts; header controls, summary cards, and proposal metrics stack; data tables become labeled cards; feedback and empty-state cards, chart content, links, and long values stay within the viewport. |
| 768px | The bounded page container leaves usable gutters; controls wrap when needed; three-column metrics and fixed-layout tables constrain and wrap their contents without horizontal scrolling. |
| 1440px | The page remains bounded to its readable maximum width; controls, cards, feedback states, charts, and tables retain their intended desktop layout without stretching or overlap. |

The intentionally unaffected landing page and absent dashboard, not-found,
error-boundary, authentication, settings, and form/action entries retain their
final reasons above because there is no in-scope implementation to adjust.
