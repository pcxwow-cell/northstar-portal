Phase 0 is only 15% done. You must finish it before moving on.

## Task 1: Replace duplicate theme constants (MUST DO FIRST)

In Admin.jsx, DELETE lines 8-15 (the local constants):
```
const sans = "'DM Sans', ...
const red = "#EA2028";
const green = "#3D7A54";
const darkText = "#231F20";
const inputStyle = { ... };
const btnStyle = { ... };
const btnOutline = { ... };
```

Replace with this single import:
```javascript
import { colors, fonts, inputStyle, btnStyle, btnOutline, shadows, radius, labelStyle } from "./styles/theme.js";
```

Then find-and-replace throughout Admin.jsx:
- `red` → `colors.red`
- `green` → `colors.green`
- `darkText` → `colors.darkText`
- `sans` → `fonts.sans`
- `"#fff"` → `colors.white`
- `"#767168"` → `colors.mutedText`
- `"#F0EDE8"` → `colors.lightBorder`
- `"#FAFAF8"` → `colors.cardBg`

Do the same for App.jsx — DELETE lines 11-16 (serif, sans, red, darkText, cream, green) and replace with theme.js import. Then find-and-replace the same color values.

Commit: "Replace local theme constants with theme.js imports in Admin.jsx and App.jsx"

## Task 2: Wire Button component into Admin.jsx

Every inline button pattern like:
```jsx
<button onClick={...} style={{...btnStyle}}>Save</button>
<button onClick={...} style={{...btnOutline}}>Cancel</button>
<button onClick={...} style={{...btnStyle, background: colors.danger}}>Delete</button>
```

Replace with:
```jsx
<Button onClick={...}>Save</Button>
<Button variant="outline" onClick={...}>Cancel</Button>
<Button variant="danger" onClick={...}>Delete</Button>
```

There are ~50 of these in Admin.jsx. Do ALL of them, not just a few.

Commit: "Wire Button component into Admin.jsx"

## Task 3: Wire Button component into App.jsx

Same pattern, ~30 buttons in App.jsx.

Commit: "Wire Button component into App.jsx"

## Task 4: Wire Card component into Admin.jsx

Every pattern like:
```jsx
<div style={{ background: "#fff", borderRadius: 8, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.05)..." }}>
```

Replace with:
```jsx
<Card>
```

Or with accent:
```jsx
<Card accent={colors.red}>
```

There are ~28 of these in Admin.jsx. Do ALL of them.

Commit: "Wire Card component into Admin.jsx"

## Task 5: Wire Card component into App.jsx

Same, ~15 cards in App.jsx.

Commit: "Wire Card component into App.jsx"

## Task 6: Wire FormInput into both files

Every pattern like:
```jsx
<label style={labelStyle}>Name</label>
<input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
```

Replace with:
```jsx
<FormInput label="Name" value={name} onChange={e => setName(e.target.value)} />
```

~35 in Admin.jsx, ~25 in App.jsx. Do ALL of them in both files.

Commit: "Wire FormInput component into Admin.jsx and App.jsx"

## Task 7: Wire remaining components

Wire these into both Admin.jsx and App.jsx where applicable:
- **Modal** — replace all inline modal overlays (fixed position + backdrop + content box)
- **StatCard** — replace inline stat number + label boxes
- **StatusBadge** — replace inline colored pill spans
- **Tabs** — replace inline tab button rows
- **DataTable** — replace inline sortable tables (Admin.jsx has SortableHeader that should be replaced)
- **SearchFilterBar** — replace inline search + filter dropdown combos
- **SectionHeader** — replace section title + right element patterns

Delete any inline component definitions that are now redundant (SortableHeader, SearchBox, etc. in Admin.jsx).

Commit each file separately: "Wire Modal/StatCard/StatusBadge/Tabs/DataTable into Admin.jsx" then same for App.jsx.

## Rules

- ONE COMMIT PER TASK. Do not batch.
- Push after every commit.
- Run `npm run build` after every commit to verify no errors.
- Do NOT leave duplicate constants. If you import from theme.js, DELETE the local versions.
- Do NOT just import components without using them. Every import must replace actual inline code.
- Do NOT skip buttons/cards/inputs because they have extra props. Pass the extra props via the `style` prop override.
- When done with all 7 tasks, proceed to Phase 1 from FRONTEND-PLAN.md.
