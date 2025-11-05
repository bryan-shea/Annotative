## [1.2.1] - 2025-11-05

### Changes
- 9ce8643 fix: disable Husky git hooks in CI environment
- 295a3a6 fix: create .vsix file after publishing for GitHub releases
- ee6ea95 fix: detect version bumps when no git tags exist
- d2c5e0d feat: complete automated CI/CD and release infrastructure
- 95d887e chore: trigger workflow with updated PAT
- b0916e8 fix: add @vscode/vsce as dev dependency for publishing
- 3f8490b feat: configure automated marketplace publishing
- 3d9c930 fix: resolve extension compliance issues
- a6d464e fix: clean up GitHub workflows and fix VS Code test display issues
- 6c5a404 fix: update package-lock.json for husky dependency
- 2e3e50d feat: Add enhanced changeset CLI with manual version control
- 80d2f39 Merge pull request #7 from bryan-shea/update/1.3.0
- 4acac6f feat: simplify annotations and add bulk operations
- fa414d3 feat: add GitHub Actions workflow for publishing to VS Code Marketplace, update .vscodeignore, and enhance README with new features
- 0e1b109 refactor: simplify UI and remove outdated features from README
- c8a57e0 Merge branch 'main' of https://github.com/bryan-shea/Annotative
- 60eddf9 Update .gitignore to include additional development files and directories
- 0af2de1 Merge pull request #6 from bryan-shea/enhancement/ui-features
- c410c5d feat: update version to 1.2.0 and simplify annotation management
- 3c3962f refactor: Remove emojis from UI elements and update related text for clarity


# Change Log

All notable changes to the Annotative extension.

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
