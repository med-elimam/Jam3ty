---
name: Jam3ty Admin
description: The internal command console for running the Jam3ty university platform
colors:
  bridge-indigo: "oklch(0.42 0.16 264)"
  bridge-indigo-deep: "oklch(0.34 0.15 264)"
  bridge-blue: "oklch(0.52 0.19 264)"
  bridge-blue-tint: "oklch(0.94 0.02 264)"
  neutral-bg: "oklch(1 0 0)"
  neutral-surface: "oklch(1 0 0)"
  neutral-ink: "oklch(0.22 0.02 264)"
  neutral-muted: "oklch(0.97 0.008 264)"
  neutral-muted-foreground: "oklch(0.55 0.02 264)"
  neutral-border: "oklch(0.91 0.01 264)"
  destructive: "oklch(0.577 0.245 27.325)"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "normal"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  sm: "0.4rem"
  md: "0.525rem"
  lg: "0.65rem"
  xl: "0.9rem"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.bridge-indigo}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.bridge-indigo-deep}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.md}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.neutral-ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  card:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.neutral-ink}"
    rounded: "{rounded.xl}"
    padding: "24px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.neutral-ink}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "4px 12px"
---

# Design System: Jam3ty Admin

## 1. Overview

**Creative North Star: "The Command Bridge"**

Jam3ty Admin is the bridge, not the ship. A small crew runs the entire platform from here for hours at a time, every day — universities, people, courses, payments — so the room has to stay calm and legible under sustained use, never showy, never in the way. Every instrument reads clearly at a glance; nothing on the console exists to be admired, everything exists to be trusted and acted on immediately.

The palette centers on a deep, deliberate indigo-blue — not the stock Tailwind `blue-700` this system started from, but a richer, more particular shade that reads as confident rather than default. The rest of the surface stays quiet: near-white panels, a single warm-neutral ink, and one accent color used with discipline. This is not a dashboard dressed up to impress a first-time visitor; it explicitly rejects the generic "SaaS admin template" look — dated card grids, timid gray-on-gray hierarchies, decoration for its own sake.

Arabic is the primary reading direction here, French secondary; the console has to feel exactly as native and confident mirrored right-to-left as it does left-to-right — RTL is not a retrofit.

**Key Characteristics:**
- One deliberate accent (Bridge Indigo), used with restraint against a near-white console
- Flat surfaces with a whisper of ambient shadow, never a lifted, showy card
- Confident, calm interaction: definite hover/focus states, no timidity, no flourish
- Fully bidirectional: every layout, icon, and alignment decision is mirrored correctly in RTL

## 2. Colors

A near-monochrome instrument panel with a single, deliberate accent — restraint is what makes the accent legible as a signal.

### Primary
- **Bridge Indigo** (`oklch(0.42 0.16 264)`): the one accent color. Primary actions (submit, create, save), active nav state, focus rings, links. Deeper and more particular than a stock Tailwind blue so it reads as a chosen identity, not a framework default.
- **Bridge Indigo Deep** (`oklch(0.34 0.15 264)`): hover/pressed state for anything using Bridge Indigo.
- **Bridge Blue** (`oklch(0.52 0.19 264)`): a brighter sibling used sparingly for the sidebar's active-item accent and focus rings, where it needs to read against a lighter surface.
- **Bridge Blue Tint** (`oklch(0.94 0.02 264)`): the accent's whisper-light form — active/hover backgrounds behind nav items and selected rows, never behind body text.

### Neutral
- **Console White** (`oklch(1 0 0)`): page background and card surfaces alike — the console is one continuous plane; separation comes from borders and shadow, not color blocking.
- **Bridge Ink** (`oklch(0.22 0.02 264)`): all body and heading text. Retinted from the original mismatched warm/cool split (the stock shadcn neutral had warm-hued text over cool-hued grays) into one coherent indigo-leaning neutral family.
- **Bridge Mist** (`oklch(0.97 0.008 264)`): muted/secondary surface fills — table header rows, subtle section backgrounds.
- **Bridge Mist Ink** (`oklch(0.55 0.02 264)`): secondary/muted text — captions, helper text, disabled labels. Never used for anything a user must read to complete a task.
- **Bridge Line** (`oklch(0.91 0.01 264)`): borders, dividers, input strokes.

### Named Rules
**The One Accent Rule.** Bridge Indigo (and its Deep/Blue/Tint siblings) is the *only* saturated color on the console outside of the destructive red. If a screen needs a second "important" color, that's a sign the hierarchy is wrong, not that the palette needs a new entry.

## 3. Typography

**Display Font:** Inter (with system-ui, sans-serif fallback)
**Body Font:** Inter (with system-ui, sans-serif fallback)

**Character:** One typeface, multiple weights — a console reads faster when every screen shares one type voice, so distinction comes from weight and size, not font-pairing.

### Hierarchy
- **Display** (700, 1.875rem/30px, 1.2 line-height): page-level titles ("الجامعات", "المستخدمون"). One per screen.
- **Title** (600, 1.25rem/20px, 1.3 line-height): dialog titles, section headings, card titles.
- **Body** (400, 0.875rem/14px, 1.5 line-height): table rows, form labels' values, descriptions. Cap prose blocks at 65-75ch even though most content here is short-form data, not long text.
- **Label** (500, 0.8125rem/13px, 1.4 line-height): form field labels, table column headers, badges.

### Named Rules
**The One Voice Rule.** Every weight and size on the console maps to a role above. No ad hoc `text-lg font-semibold` invented per-component — reach for Display/Title/Body/Label first.

## 4. Elevation

Flat by default, with a whisper of ambient shadow — never a lifted, floating card. Depth exists only to separate a surface from the page (a card from the console background), never to imply hierarchy of importance; importance is carried by color and type weight instead.

### Shadow Vocabulary
- **Ambient** (`box-shadow: 0 1px 2px 0 oklch(0 0 0 / 0.05)`): the default card/panel shadow (Tailwind's `shadow-sm`) — just enough to lift a surface off the console plane.
- **Field** (`box-shadow: 0 1px 2px 0 oklch(0 0 0 / 0.03)`): the subtler shadow on inputs and outline buttons (Tailwind's `shadow-xs`) — present, not decorative.

### Named Rules
**The Flat-By-Default Rule.** Nothing on the console lifts on hover. State changes are communicated through color (Bridge Indigo Deep, Bridge Blue Tint) and border, never through a growing shadow — that reads as a marketing-site affordance, not a console one.

## 5. Components

Confident and calm: every interactive element has a definite, immediate state change on hover and focus — never timid, never decorative.

### Buttons
- **Shape:** rounded corners (`rounded-md`, ~8px on this console's radius scale — see Named Rules)
- **Primary:** Bridge Indigo fill, white text, `h-9` (36px), `px-4 py-2` — hover moves to Bridge Indigo Deep, no transform, no shadow growth.
- **Outline:** transparent fill, Bridge Line border, `shadow-xs` at rest — hover fills with Bridge Mist. Used for secondary actions (Cancel, Edit) sitting next to a Primary button.
- **Destructive:** same shape and sizing as Primary, filled with the destructive red — reserved for delete/reject actions only, never for anything else.
- **Focus:** a 3px Bridge Blue ring at 50% opacity plus a Bridge Indigo border — visible without a shadow.

### Cards
- **Corner Style:** `rounded-xl` (~10px) — the roomiest radius on the console, reserved for the containers that hold everything else.
- **Background:** Console White, same as the page — separation comes from the 1px Bridge Line border plus the Ambient shadow, not a color shift.
- **Shadow Strategy:** Ambient (see Elevation).
- **Internal Padding:** 24px (`py-6`, `px-6` on header/content/footer).

### Inputs / Fields
- **Style:** transparent background, 1px Bridge Line border, `rounded-md`, `h-9`, `px-3` — same height as a default button so forms and their action buttons align on one baseline.
- **Focus:** border shifts to Bridge Indigo plus the same 3px Bridge Blue ring used on buttons — one consistent focus language across every interactive element.
- **Error:** border and ring shift to the destructive red on `aria-invalid`.

### Dialogs (Create/Edit modals)
- The primary surface for every create/edit workflow — not a full-page form. Header (Title-weight heading + one-line description), body (stacked Label + Input pairs, two-column grid for paired bilingual fields like name-ar/name-fr), footer (Outline Cancel + Primary Save, in that order, trailing edge).
- Destructive confirmations (delete) use a distinct alert-dialog pattern: red-filled confirm action, never the default Primary indigo — a delete confirmation must never look like a routine save.

### Navigation (Sidebar)
- Fixed rail, Console White background, `border` divider from the content area.
- Active item: Bridge Blue Tint background, Bridge Indigo text, medium weight — inactive items sit in Bridge Mist Ink until hovered.
- Mirrors fully in RTL: the rail itself flips sides (`right-0` in RTL vs `left-0` in LTR), not just its text alignment.

## 6. Do's and Don'ts

### Do:
- **Do** keep Bridge Indigo as the only saturated accent on any given screen; everything else is neutral or destructive red.
- **Do** give every interactive element (button, input, nav item) a definite hover *and* focus state — calm does not mean inert.
- **Do** test every screen mirrored in RTL before shipping it; a layout that only works LTR is not done.
- **Do** use the Ambient/Field shadow pair for all elevation — nothing on the console should ever look like it's floating above the page.

### Don't:
- **Don't** introduce a second saturated "important" color (a green "success" badge, an orange "warning" chip) without checking the One Accent Rule first — reach for weight, size, or the muted palette before reaching for a new hue.
- **Don't** use `border-left`/`border-right` colored stripes as a status indicator on cards or list rows — use a full border, a Bridge Blue Tint background, or a leading label instead.
- **Don't** add hover states that lift, scale, or grow a shadow — that's marketing-site motion vocabulary, not console vocabulary. State change lives in color and border only.
- **Don't** ship a screen that "shows an API not enabled yet" message or a dead button — every visible action must work, or must not be visible.
- **Don't** let a dated 2014-admin-template feeling creep in: no dense unstyled tables, no gray-on-gray hierarchy indistinguishable at a glance, no decoration that doesn't aid comprehension.
