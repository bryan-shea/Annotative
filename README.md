# Annotative

**Simple, powerful code annotation for your IDE. Perfect for reviewing AI-generated code, collaborating on pull requests, and documenting your work.**

Select code, add notes with optional tags, and export as Markdown. Stay organized without leaving your editor.

## Use Cases

- **Review AI-generated code** from Copilot, ChatGPT, Claude, or other models
- **Code reviews** and collaborative feedback on pull requests
- **Note-taking** and quick documentation while coding
- **Self-review** and quality checks before committing
- **Team collaboration** with exportable feedback
- **Learning** by annotating code systematically

## How It Works

1. **Select code** you want to annotate
2. **Right-click → "Add Annotation"** (or press `Ctrl+Shift+A`)
3. **Add your note** and optionally tag it (bug, performance, security, style, improvement, docs, question)
4. **View in sidebar** with all annotations organized by file
5. **Export as Markdown** to share with your team or paste into AI chats

## Features

### Core Functionality

- **Quick & Simple**: Keyboard shortcuts and context menus for fast annotation
- **Visual Highlighting**: Annotated code is highlighted directly in your editor
- **Smart Organization**: Sidebar view with all annotations organized by file
- **Flexible Tagging**: Categorize annotations by type (bug, performance, security, style, improvement, docs, question)
- **Resolution Tracking**: Mark annotations as resolved when issues are fixed
- **Easy Export**: Generate Markdown for AI chats, team discussions, or documentation
- **Persistent Storage**: Annotations auto-save and restore between sessions
- **Zero Config**: Works out of the box, no setup required

### Advanced Features (New!)

- **Filter by Status**: Show all, unresolved only, or resolved only annotations
- **Filter by Tag**: Filter annotations by specific tags to focus on what matters
- **Search Annotations**: Find annotations by comment text, code, author, or tags
- **Edit Annotations**: Modify comments and tags after creation
- **Bulk Operations**:
  - Resolve all annotations at once
  - Delete all resolved annotations
  - Delete all annotations
- **Keyboard Navigation**: Jump to next/previous annotation with `Alt+Up/Down`
- **Undo Support**: Quickly undo the last annotation with `Ctrl+Shift+Z`

> **Note:** Currently available for VS Code. Future IDE support planned.

## Keyboard Shortcuts

- `Ctrl+Shift+A` (Mac: `Cmd+Shift+A`) - Add annotation to selected text
- `Ctrl+Shift+Z` (Mac: `Cmd+Shift+Z`) - Undo last annotation
- `Alt+Down` - Go to next annotation
- `Alt+Up` - Go to previous annotation
- `Ctrl+Shift+F` (Mac: `Cmd+Shift+F`) - Search annotations (when sidebar is focused)

## Requirements

- VS Code 1.105.0 or higher
- No additional dependencies

## Development & Testing

Want to contribute or test locally? It's easy!

**Quick Start:**

1. Clone the repository
2. Run `npm install`
3. Press **F5** in VS Code to launch the extension
4. Test in the Extension Development Host window

See [QUICK_START_TESTING.md](QUICK_START_TESTING.md) for a simple guide or [TESTING_GUIDE.md](TESTING_GUIDE.md) for comprehensive documentation.

## Tips for AI Workflows

Export your annotations and paste directly into ChatGPT, Copilot Chat, or Claude to:

- Discuss issues and get suggestions
- Request code improvements
- Generate documentation
- Iterate on AI-generated code

## Licensing

Annotative is available under a **Dual License** model:

### Open Source (MIT License)

- Free for personal, educational, and internal business use
- Requires attribution
- See [LICENSE](LICENSE) for full terms

### Commercial License (In Development)

- Currently being outlined and finalized
- For future commercial distribution, resale, or enterprise use
- See [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md) for draft framework

**Unsure which license applies?** See the [LICENSE](LICENSE) file for guidance, or contact the publisher.

## Known Issues

- Annotations are stored locally and not synced across devices
- Line number references may shift if code is modified extensively

## Release Notes

### 1.1.0 (Phase 1: Quick Wins)

Enhanced user experience with powerful filtering and management features:

#### Filtering & Search

- Filter annotations by status (All/Unresolved/Resolved)
- Filter by tags to focus on specific types
- Search annotations by comment, code, author, or tags
- Clear all filters command

#### Editing & Undo

- Edit existing annotations (modify comments and tags)
- Undo last annotation with keyboard shortcut

#### Bulk Operations

- Resolve all annotations at once
- Delete all resolved annotations
- Delete all annotations (with confirmation)

#### Navigation

- Navigate to next/previous annotation with `Alt+Up/Down`
- Jump between annotations in the current file

#### UI Improvements

- Enhanced sidebar with filter controls
- Updated context menus with edit option
- Additional keyboard shortcuts for productivity

### 1.0.0

Initial release of Annotative

- Code annotation with visual highlighting
- Flexible tagging and categorization
- Sidebar view with resolution tracking
- Markdown export for AI chats and team collaboration
- Keyboard shortcuts and context menus
- Persistent workspace storage
