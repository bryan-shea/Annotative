# Changelog

All notable changes to Annotative are documented in this file.

## [2.0.0] - 2026-02-01

### Breaking Changes

**User-Defined Tags System**

- Removed all preset tags (bug, todo, review, question, refactor, documentation, optimization, security)
- All tags are now user-defined and created per project
- Users must create custom tags matching their workflow needs
- See MIGRATION.md for guidance on recreating your tag system

**Project-Based Storage**

- Annotations now automatically stored in `.annotative/` folder in workspace root
- First annotation in a workspace automatically creates project storage
- Global storage removed - all annotations are project-scoped
- Share annotations with your team by committing `.annotative/` to version control

### Added

- Automatic project storage initialization on first annotation
- Custom tag creation with colors and priorities
- Tag management commands: Create, Edit, Delete, List Tags
- Project storage detection and status information
- Template system for common annotation scenarios
- Enhanced GitHub Copilot Chat integration with @annotative participant
- Comprehensive documentation overhaul with migration guide

### Changed

- Simplified annotation workflow - no manual storage initialization required
- Tags prompt only shows when custom tags exist
- Templates now prompt for tag selection if custom tags are available
- Storage info command shows current project storage location
- Updated UI to support custom tag colors and metadata

### Fixed

- Resolved webview rendering issues in packaged extensions
- Improved Content Security Policy compliance
- Better error handling for storage operations

### Migration Notes

Users upgrading from v1.5.0 should:

1. Review MIGRATION.md for detailed upgrade instructions
2. Create custom tags to replace preset tags you were using
3. Initialize project storage to migrate existing annotations
4. Commit `.annotative/` folder to version control for team sharing

For detailed migration instructions, see [MIGRATION.md](MIGRATION.md).

## [1.5.0] - 2025-12-26

### Added

- Enhanced tag management system
- Improved annotation workflow

## [1.3.54] - 2025-11-17

### Fixed

- Removed unsafe-inline from Content Security Policy for security compliance
- Resolved webview resource path for packaged extension

## [1.3.53] - 2025-11-17

### Fixed

- Fixed webview resource loading in packaged extension by correcting path from `media/` to `dist/media/`
- Added local codicon font files to eliminate external CDN dependency
- Updated CSP headers to support local font loading
- Resolved rendering differences between development and production builds

## [1.3.52] - 2025-11-17

### Fixed

- Resolved webview rendering and modal display issues

## [1.3.51] - 2025-11-17

### Fixed

- Fixed webview rendering and empty state icon to use proper codicon class
- Resolved "Add Tag" modal blocking UI on startup
- Added explicit modal hide on initialization
- Enhanced CSS specificity for modal display state
- Improved error handling and debugging in webview initialization
- Added DOM element validation during setup
- Enhanced modal handler cleanup to prevent duplicate event listeners
- Added comprehensive error logging for webview debugging

## [1.3.5] - 2025-11-17

### Fixed

- Updated Content Security Policy in webview HTML to enhance security
- Resolved webview rendering issues in VS Code 1.105+

## [1.3.4] - 2025-11-17

### Fixed

- Fixed webview rendering in VS Code 1.105+ by correcting CSS viewport units from 100vh/100vw to 100%
- Updated Content Security Policy to allow inline styles and proper resource loading
- Added visibility event listener to refresh annotations when sidebar view becomes visible

## [1.3.3] - 2025-11-06

### Changed

- Updated README documentation

## [1.3.2] - 2025-11-06

### Changed

- Revised README description for clarity

## [1.3.1] - 2025-11-06

### Fixed

- Included annotative-logo directory in extension package

## [1.3.0] - 2025-11-06

### Added

- Enhanced overall user experience via webview improvements
- Tag CRUD operations (create, read, update, delete)
- Tag suggestion engine and validation utilities
- Enhanced annotation management with tag functionality

## [1.2.6] - 2025-11-05

### Fixed

- Reverted to built-in VS Code selection icon for better theme compatibility
- Icon styling and sidebar icon design refinements

### Infrastructure

- Added pre-push commit hooks for CI/CD validation
- Enhanced Husky git hooks configuration for development workflow

## [1.2.0] - 2025-10-31

### Added

- Color picker for annotations with 8 color options
- Visual highlighting with color coding in the editor
- Ability to edit annotation colors after creation

### Changed

- Simplified user interface - removed complex dashboard webview
- Replaced with native VS Code input boxes for better performance
- Streamlined annotation workflow
- Changed to fully open source MIT license (previously dual license)

### Improved

- Multi-color decoration system with proper grouping
- Better visual distinction between annotation types
- Faster, more responsive UI interactions

## [1.1.0] - 2025-10-25

### Added

**Filtering System:**

- Filter by status (all, unresolved, resolved)
- Filter by tags
- Search annotations by text, code, author, or tags
- Clear filters command

**Editing:**

- Edit existing annotations
- Undo last annotation with Ctrl+Shift+Z (Cmd+Shift+Z on macOS)

**Bulk Operations:**

- Resolve all annotations
- Delete all resolved annotations
- Delete all annotations

**Keyboard Navigation:**

- Navigate to next annotation with Alt+Down
- Navigate to previous annotation with Alt+Up
- Wraps around at file boundaries

**New Commands:**

- Filter by Status
- Filter by Tag
- Search Annotations
- Clear Filters
- Edit Annotation
- Undo Last Annotation
- Resolve All
- Delete Resolved
- Delete All
- Next Annotation
- Previous Annotation

### Improved

- Enhanced sidebar with filter and search controls
- Updated context menus with edit option
- Better command organization
- Improved keyboard shortcut coverage

## [1.0.0] - Initial Release

### Features

- Code annotation with visual highlighting
- Tagging system for categorization
- Sidebar view with resolution tracking
- Markdown export for collaboration
- Keyboard shortcuts (Ctrl+Shift+A / Cmd+Shift+A)
- Context menu integration
- Persistent workspace storage
- AI-assisted development support
