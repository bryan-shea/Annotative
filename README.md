# Annotative

<!-- markdownlint-disable MD033 -->
<p align="left">
  <img src="media/banner/banner.png" alt="Annotative banner" width="720">
</p>
<!-- markdownlint-enable MD033 -->

Annotative is a VS Code extension for persistent AI review workflows—review markdown plans, AI responses, and local diffs with structured annotations and exportable feedback.

Keep review context inside VS Code. Capture what needs to change, what looks risky, and what should happen next, then export that feedback as clean Markdown or AI-ready prompts.

## Current Release

Current release: `v3.1.0`.

`v3.1.0` centers Annotative around persistent AI review workflows while keeping the project-based storage model introduced in `v2`. This release adds structured review artifacts for markdown plans, AI responses, and local diffs.

Upgrade notes are in [MIGRATION.md](MIGRATION.md).

## Why Annotative

- Review markdown plans before implementation starts
- Capture AI responses and turn feedback into structured follow-up prompts
- Inspect local git diffs with persistent, targeted review notes
- Add in-editor annotations to source code selections
- Organize feedback with custom tags, filters, grouping, and sidebar workflows
- Export review artifacts as readable Markdown or Copilot-ready prompts
- Keep annotations, tags, and review artifacts in project-local `.annotative/` storage
- Work with GitHub Copilot Chat through `@annotative`

## Quick Start

### Code Annotations

1. Open a folder or workspace in VS Code.
2. Select code.
3. Run `Annotative: Add Annotation` or press `Ctrl+Shift+A` on Windows/Linux or `Cmd+Shift+A` on macOS.
4. Enter a comment, then optionally choose tags and a highlight color.
5. Open the `Annotations` view in the activity bar to review, filter, and export annotations.

### AI Review Workflows

1. Open the `Annotations` view in the activity bar.
2. Use the workflow picker to choose `Review Plan`, `Review AI Response`, or `Review Local Diff`.
3. Complete the source step for that workflow.
4. Review the artifact in the side panel that opens beside the editor.
5. Add structured feedback, toggle status, and export the review when ready.

You can also start these workflows from the command palette with `Annotative: Review Markdown Plan`, `Annotative: Review Last AI Response`, and `Annotative: Review Local Diff`.

## Workflow Details

Annotative includes three persistent review workflows built on one shared review-artifact model:

- `Review Markdown Plan` creates a persisted review artifact from the current markdown file, a markdown selection, an imported markdown file, or clipboard markdown.
- `Review Last AI Response` creates a persisted review artifact from pasted text, clipboard content, or an imported text or markdown file.
- `Review Local Diff` creates a persisted review artifact from the current workspace git diff.

Each workflow opens a dedicated side panel where you can:

- Annotate the whole artifact, a section, a block, a diff file, or a diff hunk
- Record structured feedback such as requested changes, risks, questions, missing steps, and test gaps
- Mark feedback as open or resolved
- Export the artifact as `Generic Markdown` or a `Copilot Review Prompt`
- Re-open the source content when it came from a file-backed workflow

## Storage Model

Annotative stores project data in `.annotative/` at the workspace root.

- `annotations.json` stores annotations
- `customTags.json` stores custom tag definitions
- `reviews/*.json` stores persisted plan reviews, AI response reviews, and local diff reviews
- `README.md` explains how to include or ignore the folder in version control

Storage is created automatically on first save, or explicitly with `Annotative: Initialize Storage`.

## Key Capabilities

### Annotation workflow

- Add, edit, remove, and toggle annotation status
- Undo the most recent annotation
- Navigate to previous and next annotations in the active file
- Keep inline decorations synchronized with saved annotations

### Review artifact workflow

- Persist plan, AI response, and local diff reviews under `.annotative/reviews/`
- Parse markdown into reviewable sections and blocks
- Parse local diffs into files and hunks for targeted feedback
- Use workflow-specific review categories in the review panel
- Track open and resolved review feedback with export history

### Sidebar workflow

- Launch AI review workflows from the sidebar workflow picker
- Group by file, folder, tag, or status
- Filter by status and tag
- Search within the current annotation set
- Run bulk actions such as `Resolve All`, `Delete Resolved`, and `Delete All`

### Tag workflow

- Create user-defined tags with category, priority, and color
- Edit or delete existing tags
- Share tag definitions through `.annotative/customTags.json`

### Export workflow

- Export Markdown to the clipboard
- Open an export in a new untitled document
- Export for Copilot, ChatGPT, Claude, or a generic AI target
- Export by intent for review, bugs, optimization, or documentation
- Export review artifacts as `Generic Markdown` or a `Copilot Review Prompt`
- Save Copilot-oriented exports under `.copilot/annotations`

## Copilot Integration

When GitHub Copilot Chat is installed and `annotative.copilot.enabled` is enabled, Annotative registers an `@annotative` chat participant.

Supported commands:

- `/issues`
- `/explain`
- `/fix`
- `/review`

Annotative can also prepare AI-specific exports and optionally open the Copilot Chat panel after export.

## Commands

Key command groups:

- Annotation: `Add Annotation`, `Add from Template`, `Edit`, `Toggle Status`, `Remove`, `Undo`, `View Details`
- AI review: `Review Markdown Plan`, `Review Last AI Response`, `Review Local Diff`
- Navigation: `Next`, `Previous`, `Go to Location`
- Filters: `Filter by Status`, `Filter by Tag`, `Search`, `Clear Filters`, `Refresh`
- Bulk: `Resolve All`, `Delete Resolved`, `Delete All`
- Tags: `Create Tag`, `Edit Tag`, `Delete Tag`, `List Tags`
- Export: `Export to Clipboard`, `Export to Document`, `Export by Intent`, `Export for AI`, `Batch AI Review`
- Storage: `Initialize Storage`, `Storage Info`

## Keyboard Shortcuts

| Shortcut                       | Action           |
| ------------------------------ | ---------------- |
| `Ctrl+Shift+A` / `Cmd+Shift+A` | Add Annotation   |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Undo             |
| `Alt+Down`                     | Next             |
| `Alt+Up`                       | Previous         |
| `Ctrl+Alt+E` / `Cmd+Alt+E`     | Export by Intent |

## Configuration

Annotative currently exposes these settings:

- `annotative.export.contextLines`
- `annotative.export.includeImports`
- `annotative.copilot.enabled`
- `annotative.copilot.autoAttachContext`
- `annotative.copilot.preferredFormat`
- `annotative.copilot.autoOpenChat`

The AI review workflows in `v3.1.0` reuse the existing export and Copilot settings. They do not add separate workflow-specific settings yet.

If you already use Annotative for code annotations, `v3.1.0` extends that workflow rather than replacing it.

## Requirements

- VS Code `1.105.0` or later
- A folder or workspace for project storage features
- Git for local diff review workflows
- GitHub Copilot Chat only if you want Copilot-specific commands, exports, or chat participant support

## Upgrade Notes

- Upgrading from `v2.x` to `v3.1.0`: no manual storage migration is required.
- Upgrading from `v1.5.x` or earlier: legacy global-state data is not imported automatically.

The AI review workflows store new artifact files under `.annotative/reviews/` without changing the existing annotation or tag storage model.

See [MIGRATION.md](MIGRATION.md) for the full upgrade path.

## Development

Development setup, testing, and contribution guidance are in [CONTRIBUTING.md](CONTRIBUTING.md).

The AI review workflow design notes and acceptance criteria are in [docs/ai-review](docs/ai-review).

## License

MIT. See [LICENSE](LICENSE).
