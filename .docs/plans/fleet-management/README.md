# Fleet Management — Documentation Index

## Subdomain Documentation

These are the **canonical design & implementation docs** for each fleet management subdomain. They consolidate all design decisions, data models, API endpoints, frontend architecture, and implementation details. Update them when making significant changes.

| Document | Subdomain | What's Covered |
|----------|-----------|----------------|
| [drivers.md](./drivers.md) | Drivers | Data model, 11 API endpoints, lifecycle, TMS partial edit, HOS, SALLY access derivation, profile page, design decisions |
| [vehicles.md](./vehicles.md) | Vehicles/Assets | Data model, 5 API endpoints, TMS field locking, VIN validation, trucks/trailers/equipment tabs, design decisions |
| [loads.md](./loads.md) | Loads | Data model, 7+ API endpoints, status lifecycle, intake sources, stops, TMS adapter pattern, sync process, dispatch board UX, tracking, design decisions |
| [customers.md](./customers.md) | Customers | Data model, 5 API endpoints, portal invitations, visibility boundaries, tracking timeline, customer portal, design decisions |

## Archived Plans

Historical design and implementation plans from feature development are preserved in `_archive/`. These document the **design intent at the time of creation** — their unique content has been merged into the consolidated docs above.

| Document | Subdomain | Original Purpose |
|----------|-----------|-----------------|
| team-drivers-design.md | Drivers | SALLY access lifecycle design |
| team-drivers-implementation.md | Drivers | Implementation plan |
| 2026-02-13-driver-management-ux-redesign.md | Drivers | PR #22: CDL badges, HOS bars, profile page, edit dialog |
| 2026-02-13-driver-management-implementation.md | Drivers | Implementation plan for PR #22 |
| 2026-02-13-driver-management-ux-fixes-design.md | Drivers | Post-PR #22 audit: More Details, unified edit, TMS partial edit |
| 2026-02-13-driver-management-ux-fixes.md | Drivers | Implementation plan for UX fixes |
| loads-management-design.md | Loads | Core loads feature design |
| loads-management-implementation.md | Loads | Implementation plan |
| loads-dispatch-board-design.md | Loads | Dispatch board UI design |
| loads-dispatch-board-implementation.md | Loads | Implementation plan |
| 2026-02-12-load-creation-ux-review.md | Loads | UX audit of load creation |
| 2026-02-12-load-creation-ux-improvements.md | Loads | Implementation plan for UX fixes |
| customer-shipper-portal-design.md | Customers | Customer portal design |
| customer-shipper-portal-implementation.md | Customers | Implementation plan |
