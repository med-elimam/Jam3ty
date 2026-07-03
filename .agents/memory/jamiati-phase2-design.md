---
name: Jamiati Phase 2 design system
description: Design tokens, reusable UI components, and critical patterns from the Phase 2 visual upgrade of the Jamiati mobile app.
---

## Component locations
All reusable UI components live in `artifacts/mobile/components/ui/`:
- `Button.tsx` — variants: primary, secondary, outline, ghost, danger, gold; accepts `style?: ViewStyle`
- `Card.tsx` — style prop is `StyleProp<ViewStyle>` (not just ViewStyle) to support array styles at call site
- `Input.tsx` — labeled, RTL, focus state, password toggle
- `EmptyState.tsx` — icon + title + body + optional action
- `Badge.tsx` — color variants matching design tokens; exports `BadgeColor` type
- `Avatar.tsx` — initials-based; `style` accepts `ViewStyle | ViewStyle[]`

Design tokens: `artifacts/mobile/constants/theme.ts` (spacing, radius, fontSize, fontWeight, lineHeight, shadow).
Colors: `artifacts/mobile/constants/colors.ts` (navy #1E3A5F, gold #D4A853).

## Onboarding cascade-reset pattern (critical)
Onboarding has 5 hierarchical steps: University → Faculty → Department → Level → Language.
When a higher-level field changes, ALL downstream fields must be cleared.
A `selectField(field, value)` helper in `onboarding.tsx` handles this.
Without it, stale child IDs (from a previously selected parent) persist and get submitted together, causing mismatched academic profiles.

**Why:** Discovered via code review — `canNext()` only checks presence, not consistency, so stale IDs silently pass validation.

**How to apply:** Any wizard/multi-step form with hierarchical selects needs this pattern. Never use `setSel(p => ({...p, [field]: value}))` directly for parent fields.

## StyleProp vs ViewStyle
RN `StyleProp<ViewStyle>` accepts arrays; `ViewStyle` does not.
Components that receive a `style` prop that callers may spread into arrays (e.g. `[s.myStyle, { color }]`) must type it as `StyleProp<ViewStyle>` not `ViewStyle`.
Same applies to Avatar's `style` prop.

## More modules grid
`app/more/index.tsx` uses a 2-column flex-wrap grid (not FlatList numColumns) because Arabic labels need full tile width.
Tile width = `(SCREEN_W - 2*padding - gap) / 2`.
3-column was causing Arabic text wrapping — do not revert to 3-col.
