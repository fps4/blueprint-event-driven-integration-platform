# Webapp: adding a new list/edit view

Use this checklist to add a new entity list/edit page following existing Minimal patterns (e.g., JobListView). Keep UI simple with placeholders until real data is wired.

## 1) Define routes
- Add paths to `services/webapp/src/routes/paths.js` under the appropriate section (usually `dashboard`). Include base list path, detail, new/edit paths if needed.
- Export a root key for the feature (e.g., `workspace`) so components can import a stable route map.

## 2) Add navigation entry
- Update `services/webapp/src/layouts/nav-config-dashboard.jsx`:
  - Add a nav item under the relevant `subheader` pointing to the new list route.
  - Pick an existing icon from `ICONS` or add one if necessary.
  - Keep titles short; avoid nesting unless the feature has multiple screens.

## 3) Create the view component
- Place the view under `services/webapp/src/sections/<feature>/view/` (create folder if missing).
- Base structure: `DashboardContent` wrapper, `CustomBreadcrumbs` for heading + optional action button (e.g., “New ...”), and a list/grid component for items.
- For placeholders:
  - Use mock data or inline stubs (id, name/title, status, timestamps).
  - Keep cards/rows minimal (title, subtitle, status, short description).
  - Add stub action buttons as disabled or text placeholders (e.g., “Edit (soon)”, “Delete (soon)”).
  - Skip filters/sorting until real requirements exist; leave a top-right action slot empty or with a disabled button.
- If following Job list style: create a `FeatureList` component (Grid of cards) plus a simple `FeatureListView` that renders breadcrumbs, optional action button, and the list.

## 4) Wire the page
- Update the Next.js page at `services/webapp/src/app/dashboard/<feature>/page.jsx` to export metadata and render the new `<FeatureListView />`.
- Keep the page file minimal; logic stays in the view component.

## 5) Data & API wiring (when ready)
- Create API hooks/services under `services/webapp/src/api/<feature>.js|ts` (or reuse existing patterns) to fetch list/detail/mutations.
- Replace mock data in the view with real data:
  - Handle loading/empty/error states (use `EmptyContent` for empty, basic alerts/snackbars for errors).
  - Keep filters/sorting gated until the API supports them.
- If forms are needed, place them under `services/webapp/src/sections/<feature>/components/` or `form/`, and use react-hook-form + existing UI patterns.

## 6) State & UX considerations
- Support skeleton/loading placeholders on first load.
- Keep initial layout responsive: Grid spacing, 1–3 columns depending on breakpoint.
- Use `RouterLink` from `src/routes/components` for internal navigation.
- Keep strings short; add TODO comments for pending behaviors instead of speculative logic.

## 7) Testing & sanity checks
- Run `npm test` / relevant checks for webapp if present.
- Manually verify navigation link appears and page renders without runtime errors.
- Ensure metadata titles follow existing pattern: ``export const metadata = { title: `<Feature> | Dashboard - ${CONFIG.appName}` };``.
