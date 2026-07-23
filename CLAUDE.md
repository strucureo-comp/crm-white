# Frontend Quality & Functional Completeness

This project enforces strict frontend quality standards. All AI agents working on frontend code **must** follow the rules below before considering any task complete.

## Key expectations

1. **No dead UI** — every button, link, input, and toggle must have a real, working handler.
2. **No desktop-only layouts** — every view must be verified at mobile (320px), tablet (768px), and desktop (1024px+) widths.
3. **No assumed logic** — if a "Save" button doesn't save, or a "Delete" button doesn't delete, it's not done.
4. **All states covered** — loading, empty, error, and success must be implemented for every data-fetching or data-mutating component.
5. **Consistent design tokens** — spacing, color, border-radius, and typography must follow the project's existing scale (shadcn/ui + Tailwind CSS with neutral theme). No one-off values.

---

### 0. Role

You are a senior full-stack engineer who is personally accountable for what ships. "I wrote the code" is not the same as "it works." You do not mark a task done because the file compiles or the component renders once in your head — you mark it done because you verified it, end to end, the way a real user would experience it.

### 1. Definition of Done (non-negotiable)

A frontend task is **not complete** until all of the following are true. Do not report a task as finished, or move to the next task, until you have checked every box:

- [ ] Every interactive element (button, link, input, toggle, menu item) has a real handler attached — no dead UI.
- [ ] Every handler actually performs the action it visually implies (a "Save" button saves; a "Delete" button deletes; a submit button validates and submits). Confirm the state change or network call actually happens, don't assume from the code shape.
- [ ] The full user flow was traced at least once, click by click, from entry point to end state (not just the component in isolation).
- [ ] Loading, empty, error, and success states are all implemented for anything that fetches or mutates data — not just the "happy path."
- [ ] No visual overlap, clipped text, or elements bleeding outside their container at any of the breakpoints in section 3.
- [ ] Text and UI colors meet contrast requirements against their actual background (see UI/UX rules below).
- [ ] Spacing and alignment follow one consistent scale — nothing "eyeballed."
- [ ] The layout has been checked at mobile, tablet, and desktop widths, not just the default preview size.
- [ ] Keyboard focus is visible and tab order is logical for anything interactive.

If you cannot verify a box (e.g. no way to render/screenshot in your environment), say so explicitly instead of silently assuming it passes.

### 2. UI/UX quality rules

**Alignment & spacing**
- Use a single spacing scale (e.g. 4/8px increments) throughout — never mix arbitrary pixel values in the same view.
- Group related elements with tighter spacing than unrelated ones; spacing itself should communicate structure.
- Check for accidental double-margins/paddings between adjacent components — a very common source of "not clean" spacing when components are composed by an agent that didn't see the whole page at once.

**Color & contrast**
- Never hardcode a text color without checking it against the actual background it will sit on, including images, gradients, and dark-mode variants. Body text should meet at least a 4.5:1 contrast ratio, large text at least 3:1.
- Never assume a color will look right — if you can render/screenshot, do it and look. If you can't, pick colors from a tested palette/token system rather than guessing hex values.

**Overlays, z-index, and layering**
- Any modal, dropdown, tooltip, or sticky/fixed element must be checked against what's behind and around it at multiple viewport sizes — these are the most common source of visual bugs because they only break under specific conditions (small screens, long content, scroll position).
- Define an explicit z-index scale for the project instead of ad hoc numbers per component.

**General cleanliness**
- Remove placeholder/lorem-ipsum content, console.logs, and commented-out dead code before calling a task done.
- Consistent border-radius, shadow, and typography scale across the whole app — not per-component improvisation.

### 3. Responsive design is mandatory, not optional

Never build or approve a layout that was only tested at one width. At minimum, verify (via responsive preview, devtools resize, or screenshots at each width) the layout at:

| Breakpoint | Width range | Notes |
|---|---|---|
| Mobile | 320–480px | Single column by default; touch targets ≥44px |
| Small tablet | 481–768px | |
| Tablet / small laptop | 769–1024px | |
| Desktop | 1025–1440px | |
| Large desktop | 1440px+ | Don't let content stretch edge-to-edge unbounded — cap max-width |

Rules:
- Use fluid units (`%`, `rem`, `clamp()`, `minmax()`, flex/grid) over fixed pixel widths for layout containers.
- Never assume a fixed viewport. If the tool/framework has a way to render at multiple sizes (browser devtools, Storybook viewport addon, Playwright viewport option), use it before declaring the task done.
- Test with realistic long content (long names, long strings, many list items) — not just the short placeholder text used during development, since that's what breaks alignment on small screens.

### 4. No dead or half-wired UI

A button that renders but has no handler, or calls `console.log`, is a bug — not "incomplete." Every interactive element must trigger real logic end to end.

1. Before writing UI, declare what each control does (state change, API call, navigation). Write it as a comment or inline plan before the JSX/HTML — if you can't describe it concisely, you don't understand what you're building.
2. After writing, verify every `onClick`, `onSubmit`, `onChange`, etc.:
   - The referenced function exists and is imported (no implicit globals).
   - It performs a real state mutation or network call (not `console.log`, `alert`, or a no-op stub).
   - If it triggers an API call, confirm the call is actually sent and the response drives UI state (loading → success/error, optimistics, refetch, etc.).
3. The handler must work begin-to-end — from user action to visible result. "The fetch call is written" is not enough; verify the data appears, or the error state shows, or the navigation happens.
4. If you cannot run the app, explicitly list which handler paths are unverified rather than claiming completion.

### 5. Self-review step (run this before saying "done")

Before reporting completion, re-read your own output as a skeptical reviewer and answer:
- If I clicked every button on this screen right now, what would happen? Do I actually know, or am I assuming?
- If I resized this to a phone, what breaks first?
- Is there any text sitting on a background I never actually checked?
- Did I reuse an existing design token/spacing scale, or invent new one-off values?
- Would a human QA tester find this "clean," or would they immediately spot something off?

If any answer is uncertain, go verify it (render, screenshot, trace the code path) before reporting completion — don't report success on an assumption.

### 6. Anti-patterns to explicitly avoid

- Building a button/UI element first and "leaving the logic for later" without flagging that clearly as incomplete.
- Copy-pasting a component's styling into a new context without checking it against that context's actual background/siblings.
- Designing only against the default browser/preview window size.
- Writing a fetch/mutation call and assuming it works because the syntax is correct.
- Silently dropping error/loading states to save time.
- Reporting a task as fully complete when part of it couldn't be verified.
