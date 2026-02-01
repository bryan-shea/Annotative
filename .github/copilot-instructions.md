# Annotative VS Code Extension

Code annotation and review workflows for VS Code. Add comments to code selections, organize with custom tags, and export as Markdown.

## Product Positioning

- **Primary Use Case**: Reviewing AI-generated code changes from Copilot, ChatGPT, Claude, etc.
- **Secondary Use Cases**: Code reviews, documentation, issue tracking, team collaboration
- **Key Value**: Simple annotation system with Markdown export optimized for AI tools and team discussions

## Development Guidelines

- Follow TypeScript best practices for VS Code extensions
- Use VS Code Extension API for UI components and editor interactions
- Implement proper error handling and user feedback
- Store annotations per workspace in `.annotative/` folder or global state
- Keep UI simple - use native VS Code input boxes and quick picks
- Ensure export formats are optimized for AI tools
- Focus on speed and simplicity

## Architecture

### Core Structure

- Main extension file: `src/extension.ts`
- Command modules: `src/commands/` (organized by feature area)
- Core managers: `src/managers/` (AnnotationManager, etc.)
- Tag system: `src/tags/` (TagManager, validation, suggestions)
- UI components: `src/ui/` (webview sidebar, providers)
- Type definitions: `src/types.ts`
- Copilot integration: `src/copilotExporter.ts` and `src/copilotChatParticipant.ts`

### Command Organization

Commands are organized in separate modules:

- `annotation.ts` - Add, remove, edit, toggle, undo
- `export.ts` - Export to clipboard, document, AI formats
- `filters.ts` - Filter by status, tag, search, clear
- `bulk.ts` - Bulk operations (resolve all, delete all)
- `navigation.ts` - Navigate between annotations
- `sidebar.ts` - Sidebar view management, project storage
- `tags.ts` - Custom tag CRUD operations

## Key Features

1. Quick annotation with keyboard shortcuts (Ctrl+Shift+A / Cmd+Shift+A)
2. Native VS Code input boxes for comments and tags
3. Visual highlighting with eight color options
4. Custom tag system - all tags are user-defined
5. Resolution tracking and status management
6. Markdown export optimized for AI tools
7. Webview sidebar with grouping and filtering
8. Project-based storage in `.annotative/` folder
9. Template support for common scenarios
10. GitHub Copilot Chat integration via @annotative participant

## Naming Conventions

Use exact command names and terminology from the extension:

- "Add Annotation" not "Create Annotation"
- "Toggle Status" not "Mark Resolved"
- "Remove" not "Delete" (in UI)
- "Export to Clipboard" not "Copy Export"
- "Filter by Status" and "Filter by Tag"
- "Storage Info" not "Show Storage"

## No Emojis

Do not use emojis in:

- Code or comments
- Documentation
- Commit messages
- User-facing text
- UI labels
