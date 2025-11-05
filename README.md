# Annotative

**Simple, powerful code annotation for VS Code. Perfect for reviewing AI-generated code, collaborating on pull requests, and documenting your work.**

Highlight code, add notes with color-coding and tags, then export as Markdown. Stay organized without leaving your editor.

## Why Annotative?

- **Review AI-generated code** - Flag issues in Copilot, ChatGPT, or Claude suggestions
- **Collaborative code reviews** - Leave feedback that's easy to share and discuss
- **Documentation on the fly** - Capture insights while coding
- **Self-review before commits** - Catch issues during your own quality checks
- **Team knowledge sharing** - Export annotations for team discussions and AI chats
- **Learning tool** - Annotate code systematically as you study new concepts

## How It Works

1. **Select code** you want to annotate
2. **Right-click → "Add Annotation"** (or press `Ctrl+Shift+A`)
3. **Enter your note** in the input box
4. **Choose a color** to visually distinguish the annotation (8 colors available)
5. **Select tags** (optional) to categorize the annotation
6. **View in sidebar** with all annotations organized by file
7. **Export as Markdown** to share with your team or paste into AI chats

## Core Features

- **Quick & Simple**: Keyboard shortcuts and context menus for fast annotation
- **8 Color-Coded Annotations**: Choose from 8 colors to visually distinguish different types of issues
  - 🟡 Yellow (Default) - General notes
  - 🔴 Red - Bugs and critical issues
  - 🟠 Orange - Warnings and improvements
  - 🔵 Blue - Information and documentation
  - 🟢 Green - Optimizations and enhancements
  - 🟣 Purple - Security and important notes
  - 🟤 Brown - Technical debt
  - ⚪ Gray - Low priority or archived
- **Visual Highlighting**: Annotated code is highlighted directly in your editor with your chosen color
- **Smart Organization**: Sidebar view with all annotations organized by file
- **Flexible Tagging**: Categorize annotations by type (bug, performance, security, style, improvement, docs, question, ai-review)
- **Resolution Tracking**: Mark annotations as resolved when issues are fixed
- **Easy Export**: Generate Markdown for AI chats, team discussions, or documentation
- **Persistent Storage**: Annotations auto-save and restore between sessions
- **Zero Config**: Works out of the box, no setup required

### Advanced Features

- **Filter by Status**: Show all, unresolved only, or resolved only annotations
- **Filter by Tag**: Filter annotations by specific tags to focus on what matters
- **Search Annotations**: Find annotations across your workspace
- **Edit Annotations**: Modify comments, tags, and colors after creation
- **Bulk Operations**: Resolve all, delete resolved, or delete all annotations
- **Keyboard Navigation**: Jump to next/previous annotation with `Alt+Up/Down`
- **Undo Support**: Quickly undo the last annotation with `Ctrl+Shift+Z`
- **Copilot Integration**: Direct integration with GitHub Copilot Chat (@annotative participant)
- **Multi-Format Export**: Optimized exports for Copilot, ChatGPT, Claude, or generic AI tools
- **Template Support**: Quick templates for common annotation scenarios

## Keyboard Shortcuts

| Shortcut                            | Action                          |
| ----------------------------------- | ------------------------------- |
| `Ctrl+Shift+A` (Mac: `Cmd+Shift+A`) | Add annotation to selected text |
| `Ctrl+Shift+Z` (Mac: `Cmd+Shift+Z`) | Undo last annotation            |
| `Alt+Down`                          | Go to next annotation           |
| `Alt+Up`                            | Go to previous annotation       |
| `Ctrl+Shift+F` (Mac: `Cmd+Shift+F`) | Search annotations              |
| `Ctrl+Alt+E` (Mac: `Cmd+Alt+E`)     | Export by intent                |

## AI Integration

Export your annotations and paste directly into ChatGPT, Copilot Chat, or Claude to:

- Discuss issues and get suggestions
- Request code improvements
- Generate documentation
- Iterate on AI-generated code

### GitHub Copilot Integration

Use the `@annotative` participant in Copilot Chat to:

- Get AI suggestions on all annotations in a file
- Ask Copilot about specific annotations
- Generate fixes for flagged issues

## Installation

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for "Annotative"
4. Click Install

## Getting Started

After installation:

1. Select any code in your editor
2. Press `Ctrl+Shift+A` or right-click and select "Add Annotation"
3. Enter your note and choose a color
4. (Optional) Add tags to categorize the annotation
5. View all annotations in the Annotative sidebar
6. Export annotations to share

## Requirements

- VS Code 1.105.0 or higher
- No additional dependencies - works out of the box!

## Development & Contributing

Want to contribute or test locally?

**Quick Start:**

1. Clone the repository
2. Run `npm install`
3. Press **F5** in VS Code to launch the extension
4. Test in the Extension Development Host window

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed setup instructions.

## Workspace Storage

Annotations are stored per workspace in `.annotative/annotations.json`:

- **Workspace-specific**: Each workspace has its own annotations
- **Auto-save**: Changes save automatically
- **Portable**: Take your workspace and annotations with you

## Tips & Best Practices

### For Code Reviews

1. Use **Red** for bugs and critical issues
2. Use **Orange** for warnings and potential problems
3. Use **Blue** for documentation needs
4. Export and share with team

### For AI-Generated Code Review

1. Tag annotations with **ai-review**
2. Use **Red** for issues, **Green** for optimizations
3. Export and ask Copilot/ChatGPT for fixes

### For Team Collaboration

1. Use **consistent tags** across your team
2. Use **colors strategically** (Red = urgent, Green = nice-to-have)
3. Export annotations for discussions

## License

Annotative is **fully open source** and available under the [MIT License](LICENSE).

- Free for personal, educational, commercial, and enterprise use
- Modify and distribute freely
- No restrictions on commercial use

## Changelog

### Version 1.2.0 - Simplified UI & Color Customization

- **8-color annotation system** with visual coding
- **Simplified user interface** using native VS Code components
- **Edit colors** on existing annotations
- **Improved performance** with streamlined workflow
- **MIT License** - fully open source

For detailed changes, see [CHANGELOG.md](CHANGELOG.md).

## Support

- **Issues**: [Report bugs on GitHub](https://github.com/bryan-shea/Annotative/issues)
- **Discussions**: [Join GitHub Discussions](https://github.com/bryan-shea/Annotative/discussions)
- **Features**: [Suggest features](https://github.com/bryan-shea/Annotative/issues/new?labels=enhancement)

---

Made with ❤️ for developers who care about code quality
