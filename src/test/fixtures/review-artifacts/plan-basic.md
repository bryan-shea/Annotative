# API Migration Plan

## Goal

Move review artifact persistence into project-local storage without breaking existing annotations.

## Steps

1. Add shared types for review artifacts.
2. Add storage and manager services.
3. Add deterministic export adapters.

## Risks

- Diff parsing may need normalization in Phase 5.
- Export adapter selection must remain backward-compatible.

## Open Questions

- Should later phases expose review artifacts in the sidebar?
- How should copied exports record adapter history?

## Optional Implementation Detail

Use one JSON file per review artifact under .annotative/reviews/.
