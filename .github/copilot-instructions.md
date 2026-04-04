# GitHub Copilot repository instructions for Annotative

Annotative is a VS Code extension for persistent, structured review annotations and AI-oriented exports. Treat it as an in-IDE review-memory layer for AI-assisted development, not as a generic PR review client and not as a separate browser app.

## Product positioning

- Primary use case: reviewing AI-generated code changes from Copilot, ChatGPT, Claude, and similar tools
- Secondary use cases: code review, documentation, issue tracking, and team collaboration
- Key value: structured, persistent review context that can be exported for AI workflows and team discussion

For the current initiative, preserve Annotative's existing strengths:

- local persistence
- structured annotations
- exportable review context
- sidebar/webview workflows
- Copilot integration

Prefer additive, backward-compatible changes unless explicitly told otherwise.

## Architecture expectations

Follow the existing extension structure and naming patterns in the repo:

- Main extension entry: `src/extension.ts`
- Command modules: `src/commands/`
- Core managers/services: `src/managers/`
- Tag system: `src/tags/`
- UI and webview code: `src/ui/`
- Shared types: `src/types.ts`
- Copilot integration: `src/copilotExporter.ts` and `src/copilotChatParticipant.ts`

Keep commands thin. Put business logic in managers and services.

Reuse storage, export, webview, and Copilot-participant patterns that already exist in the repo. Avoid building duplicate subsystems when an existing manager or service can be extended.

For the AI review workflows initiative, prefer one shared `ReviewArtifact` abstraction over separate one-off models for:

- markdown plans
- AI responses
- local diffs

## Development guidelines

- Follow TypeScript best practices for VS Code extensions
- Keep TypeScript strictness intact
- Use the VS Code Extension API for editor interactions and UI
- Implement proper error handling and user feedback
- Keep local-file writes atomic and schema-aware
- Preserve conservative behavior for content anchoring and reattachment
- Add TODOs instead of pretending unknown behavior is complete
- Avoid speculative abstractions unless they clearly reduce repeated logic

## UX guidelines

- Keep the product inside VS Code
- Stay consistent with existing Annotative UI patterns
- Favor simple, reviewable UI over elaborate first-pass polish
- Prefer native VS Code interactions where they are sufficient
- Use webviews when they clearly improve the review workflow
- Minimize modal flows
- Make failures obvious and recoverable
- Do not silently mutate user source files

## Storage and export expectations

- Store annotations and review artifacts in project-local `.annotative/` storage unless explicitly told otherwise
- Ensure export formats remain useful for AI tools and team discussions
- Prefer extending existing export infrastructure rather than creating a parallel export pipeline

## Testing expectations

For new logic, add or update tests as appropriate:

- unit tests for parsing, models, and export logic
- storage round-trip tests
- webview message-routing tests when UI behavior changes
- at least one happy-path integration test per phase where practical

Never leave new storage or export logic untested.

## Scope guardrails

Do not build the following unless explicitly asked:

- remote PR review or provider APIs
- GitHub comment publishing
- encrypted sharing links
- cloud sync
- a separate browser-first review surface
- major refactors outside the initiative's direct path

## Naming conventions

Use the extension's existing terminology:

- "Add Annotation" not "Create Annotation"
- "Toggle Status" not "Mark Resolved"
- "Remove" not "Delete" in UI text
- "Export to Clipboard" not "Copy Export"
- "Filter by Status" and "Filter by Tag"
- "Storage Info" not "Show Storage"

Match existing file organization and naming conventions in the repo.

## Communication style in generated work

Do not use emojis in:

- code or comments
- documentation
- commit messages
- user-facing text
- UI labels

When responding to a task:

- start with a concise implementation plan
- keep changes modular
- summarize files changed, what works, and any remaining TODOs or risks
