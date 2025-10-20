# Annotative

A VS Code extension for highlighting and annotating code lines with comments, similar to GitHub PR reviews.

## What is Annotative?

Annotative lets you select any line or block of code and add contextual comments directly in VS Code. Think of it as adding review comments to your code without needing a pull request.

## Key Features

- **Highlight & Annotate**: Select code and add comments with visual highlighting
- **Sidebar Management**: View all annotations organized by file
- **Export Integration**: Export annotations as Markdown for GitHub Copilot or team sharing
- **Persistent Storage**: Annotations saved locally and restored between sessions

## Quick Start

1. Select text in any file
2. Right-click → "Add Annotation" (or `Ctrl+Shift+A`)
3. Enter your comment
4. View and manage annotations in the sidebar
5. Export annotations for sharing or AI assistance

## Commands

- `annotative.addAnnotation`: Add annotation to selected text
- `annotative.removeAnnotation`: Remove an annotation
- `annotative.toggleResolved`: Toggle resolved status of an annotation
- `annotative.exportAnnotations`: Export all annotations to clipboard
- `annotative.showExport`: Show export in a new document
- `annotative.refresh`: Refresh the annotations view

## Requirements

- VS Code 1.105.0 or higher
- No additional dependencies required

## Extension Settings

This extension does not currently contribute any VS Code settings, but stores annotations locally in your workspace.

## GitHub Copilot Integration

Export your annotations as Markdown and paste them directly into GitHub Copilot chat for:

- Code review discussions
- Documentation generation
- Context sharing with team members
- Code explanation requests

## Known Issues

- Annotations are stored locally and not synced across devices
- Line number references may shift if code is modified extensively

## Release Notes

### 0.0.1

Initial release of Annotative

- Line and selection highlighting
- Annotation management with comments
- Sidebar view for organization
- Export functionality for GitHub Copilot integration
- Keyboard shortcuts and context menus

**Enjoy!**
