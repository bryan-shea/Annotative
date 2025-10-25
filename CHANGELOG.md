# Change Log

All notable changes to the Annotative extension.

## [1.1.0] - 2025-10-25

### Phase 1: Quick Wins - Enhanced User Experience

#### Added

- **Filtering System**

  - Filter annotations by status (All/Unresolved/Resolved)
  - Filter by tags to focus on specific annotation types
  - Search annotations by comment text, code, author, or tags
  - Clear all filters command for quick reset

- **Editing Capabilities**

  - Edit existing annotations - modify comments and tags after creation
  - Undo last annotation with `Ctrl+Shift+Z` (Mac: `Cmd+Shift+Z`)

- **Bulk Operations**

  - Resolve all annotations at once (entire workspace or specific file)
  - Delete all resolved annotations with confirmation
  - Delete all annotations with confirmation

- **Keyboard Navigation**

  - Navigate to next annotation with `Alt+Down`
  - Navigate to previous annotation with `Alt+Up`
  - Wraps around at file boundaries for seamless navigation

- **New Commands**
  - `annotative.filterByStatus` - Filter by resolution status
  - `annotative.filterByTag` - Filter by specific tags
  - `annotative.searchAnnotations` - Search across all annotations
  - `annotative.clearFilters` - Clear all active filters
  - `annotative.editAnnotation` - Edit existing annotation
  - `annotative.undoLastAnnotation` - Undo the most recent annotation
  - `annotative.resolveAll` - Mark all as resolved
  - `annotative.deleteResolved` - Remove resolved annotations
  - `annotative.deleteAll` - Remove all annotations
  - `annotative.nextAnnotation` - Jump to next annotation
  - `annotative.previousAnnotation` - Jump to previous annotation

#### Improved

- Enhanced sidebar with filter and search controls in toolbar
- Updated context menus with edit option
- Better organization of commands in menus
- Improved keyboard shortcut coverage

### Changed

- Sidebar toolbar now includes filter, search, and bulk operation buttons
- Context menu now shows edit option as primary action

## [1.0.0] - 2025-01-XX

### Initial Release

- Code annotation with visual highlighting
- Flexible tagging system (bug, performance, security, style, improvement, docs, question)
- Sidebar view with resolution tracking
- Markdown export for AI chats and team collaboration
- Keyboard shortcuts (`Ctrl+Shift+A`) and context menus
- Persistent workspace storage
- Perfect for reviewing AI-generated code from Copilot, ChatGPT, Claude, and more
