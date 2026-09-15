---
name: typescript
description: "Apply strict TypeScript conventions when editing .ts or .tsx files: avoid any, validate boundaries, preserve API contracts, and keep error shapes deterministic."
---

Apply the project's conventions first. Prefer `unknown` with narrowing over `any`, `type` over `interface` unless extension or declaration merging needs an interface, and `satisfies` when checking object conformity without widening literals. Validate untrusted input at boundaries, type function signatures, share request and response DTOs, and avoid leaking internal errors or identifiers through API responses.
