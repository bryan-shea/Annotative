# Annotative

**Simple, powerful code annotation for your IDE. Take notes, leave feedback, and share your thoughts directly in your editor.**

Annotative is a lightweight productivity tool that makes it effortless to annotate code, add inline feedback, and capture your thoughts. Whether you're reviewing code, learning, collaborating, or just documenting your work—Annotative helps you stay organized without leaving your editor.

## What is Annotative?

Annotative is a clean, intuitive code annotation tool for your IDE. Select any code, add a note, and keep working. Use it for:

- **Reviewing AI-generated code** from Copilot, ChatGPT, Claude, or other models
- **Code reviews** and collaborative feedback on pull requests
- **Note-taking** and quick documentation while coding
- **Self-review and quality checks** before committing
- **Team collaboration** with exportable feedback
- **Learning and auditing** code systematically

**The core idea**: Select code → add a note → organize and export. That's it.

## Key Features

> **Note:** Currently available for VS Code. Future IDE support planned.

- **Quick Annotation**: Select text and add notes instantly with keyboard shortcuts
- **Flexible Tagging**: Optionally tag notes by type (bug, performance, security, style, improvement, docs, question)
- **Organized View**: See all your annotations in a sidebar, organized by file
- **Easy Export**: Export your notes as Markdown for sharing, pasting into chat, or team discussions
- **Always Available**: Annotations stay in your workspace, ready when you need them
- **No Setup Required**: Works out of the box with no dependencies
- **Persistent Storage**: Annotations are automatically saved and restored between sessions

## Quick Start

1. **Select code** you want to annotate
2. **Right-click → "Add Annotation"** (or press `Ctrl+Shift+A`)
3. **Add your note** (optionally tag it)
4. **View in sidebar** with all your annotations organized by file
5. **Export** when you're ready to share or discuss

## Usage Examples

**Reviewing Code**: Highlight issues, add comments, export as feedback for your team

**Taking Notes**: Jot down thoughts and reminders while coding, search later

**Collaborating**: Share annotations with teammates via exported Markdown

**AI Workflows**: Export annotations to paste into ChatGPT, Copilot Chat, or Claude for discussion and iteration

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

This extension stores annotations locally in your workspace and automatically restores them between sessions.

## Tips

**Export to Chat**: Copy exported annotations and paste directly into any AI chat (Copilot, ChatGPT, Claude, etc.) for discussions, code improvement, or documentation generation.

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

### 0.0.1

Initial release of Annotative

- Line and selection highlighting
- Annotation management with comments
- Sidebar view for organization
- Export functionality for GitHub Copilot integration
- Keyboard shortcuts and context menus

**Enjoy!**
