---
name: Jamiati Arabic pass patterns
description: Patterns, pitfalls, and decisions from Phase 1 Arabic language pass on the Jamiati mobile app
---

## Enum display maps
Backend sends English enum values (examType, eventType, fileType, oppType, sessionType).
Always define a local `*_AR` lookup object and fall back to the raw value:
```ts
const EXAM_TYPE_AR: Record<string, string> = { midterm: 'فصلي', final: 'نهائي', ... };
// render: {EXAM_TYPE_AR[item.examType] ?? item.examType}
```
Do NOT call `.toUpperCase()` or `.replace('_', ' ')` on Arabic-display screens.

## Filter type casting for generated API hooks
orval-generated filter params use const-union types (e.g. `ListAssignmentsStatus`, `ListFilesType`).
Import the enum object and use it directly; do not use raw strings:
```ts
import { useListAssignments, ListAssignmentsStatus } from '@workspace/api-client-react';
const [filter, setFilter] = useState<ListAssignmentsStatus | undefined>(undefined);
// For non-strongly-typed params, cast: (val as ListFilesType | undefined)
```

## orval conditional query hooks (useListFaculties etc.)
The query option type requires a `queryKey` via UseQueryOptions, which conflicts with passing only `{ enabled }`.
Workaround: pass `{ query: { enabled } } as any` to suppress the TS error.
The hook generates its own queryKey internally; the `as any` is safe here.

**Why:** orval's generated hook types inherit the full UseQueryOptions shape including the required `queryKey` field,
but the hook internally derives it — passing `enabled: false` alone causes a TS error without the cast.

## RTL text alignment
All user-visible Arabic text on card/label/body elements should have `textAlign: 'right'`.
Flex containers keep their default `row` direction (do NOT globally reverse to row-reverse) to avoid breaking icon layout.
The most impactful RTL fixes are `textAlign: 'right'` on Text and `placeholder` in TextInput.

## Auth debug panels
The 🔍 DEBUG panels in login.tsx and register.tsx are intentionally kept until the user confirms
phone registration works in Expo Go. Do not remove them prematurely.
