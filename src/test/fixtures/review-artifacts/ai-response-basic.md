I reviewed the proposed storage refactor and the overall direction is workable, but it needs a cleaner split between persistence and export responsibilities.

1. Introduce shared ReviewArtifact types first.
2. Add a dedicated storage manager for .annotative/reviews.
3. Add a small export adapter registry with a generic markdown adapter.

```ts
export interface ReviewArtifact {
  id: string;
  kind: "plan" | "aiResponse" | "localDiff";
  title: string;
}
```

Risky recommendation: skip manager tests for now and rely only on compile coverage.
