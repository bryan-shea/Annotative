## [1.3.51] - 2025-11-17

### Fixed

- Fix webview rendering and empty state icon to use proper codicon class
- Resolve "Add Tag" modal blocking UI on startup
- Add explicit modal hide on initialization
- Enhance CSS specificity for modal display:none state
- Improve error handling and debugging in webview initialization
- Add DOM element validation during setup
- Enhance modal handler cleanup to prevent duplicate event listeners
- Add comprehensive error logging for webview debugging

## [1.3.5] - 2025-11-17

### Changes

- 5628e4b fix: update Content Security Policy in webview HTML to enhance security
- 1749979 fix: resolve webview rendering issues in VS Code 1.105+

## [1.3.4] - 2025-11-17

### Fixed

- Fix webview rendering in VS Code 1.105+ by correcting CSS viewport units from 100vh/100vw to 100%
- Update Content Security Policy to allow inline styles and proper resource loading
- Add visibility event listener to refresh annotations when sidebar view becomes visible

## [1.3.3] - 2025-11-06

### Changes

- 937e611 Update README.md

## [1.3.2] - 2025-11-06

### Changes

- 0c0a008 Revise README description for Annotative extension

## [1.3.1] - 2025-11-06

### Changes

- 6562cd4 fix: include annotative-logo directory in extension package

## [1.3.0] - 2025-11-06

### Changes

- 0ae7212 Merge pull request #8 from bryan-shea/feature-enrichment
- a00f52d refactor: update tagToString function to accept more specific types and clean up tag mapping
- c99ecdf feat: enhance overall ux via webview, add tag crud ops
- 6a7bded feat: Enhance annotation management with tag functionality
- 1e6cf48 feat: Implement tag suggestion engine and validation utilities

# Changelog

All notable changes to the Annotative extension.

## [1.2.6] - 2025-11-05

### Fixed

- Reverted to built-in VS Code selection icon for better theme compatibility
- Icon styling and sidebar icon design refinements

### Infrastructure

- Added pre-push commit hooks for CI/CD validation
- Enhanced Husky git hooks configuration for development workflow

## [1.2.0] - 2025-10-31

### Major Update: Simplified UI & Color Customization

#### Added

- **Color Picker for Annotations**
  - Choose from 8 colors to visually distinguish annotations
  - Colors: Yellow (default), Red, Orange, Blue, Green, Purple, Brown, Gray
  - Each color has a descriptive purpose (bugs, security, documentation, etc.)
  - Color-coded highlighting in the editor
  - Edit annotation colors after creation

#### Changed

- **Simplified User Interface**

  - Removed complex dashboard webview
  - Replaced with simple input boxes for adding/editing annotations
  - Uses native VS Code UI components for better performance
  - Streamlined annotation workflow

- **License Change**
  - Changed from dual license model to fully open source MIT license
  - Free for all uses including commercial and enterprise
  - No restrictions on distribution or resale

#### Improved

- Multi-color decoration system with proper grouping
- Better visual distinction between different annotation types
- Faster, more responsive UI interactions

## [1.1.0] - 2025-10-25

### Phase 1: Quick Wins - Enhanced User Experience

#### New Features

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

#### Enhancements

- Enhanced sidebar with filter and search controls in toolbar
- Updated context menus with edit option
- Better organization of commands in menus
- Improved keyboard shortcut coverage
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
