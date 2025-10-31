# Annotative

**Simple, powerful code annotation for VS Code. Perfect for reviewing AI-generated code, collaborating on pull requests, and documenting your work.**

Highlight code, add notes with color-coding and tags, then export as Markdown. Stay organized without leaving your editor.

## Why Annotative?

- **Review AI-generated code** - Flag issues in Copilot, ChatGPT, or Claude suggestions
- **Collaborative code reviews** - Leave feedback that's easy to share and discuss
- **Documentation on the fly** - Capture insights while coding
- **Self-review before commits** - Catch issues during your own quality checks
- **Team knowledge sharing** - Export annotations for team discussions
- **Learning tool** - Annotate code systematically as you study new concepts

## How It Works

1. **Select code** you want to annotate
2. **Right-click → "Add Annotation"** (or press `Ctrl+Shift+A`)
3. **Enter your note** in the input box
4. **Choose a color** to visually distinguish the annotation (8 colors available)
5. **Select tags** (optional) to categorize the annotation
6. **View in sidebar** with all annotations organized by file
7. **Export as Markdown** to share with your team or paste into AI chats

## Features

### Core Functionality

- **Quick & Simple**: Keyboard shortcuts and context menus for fast annotation
- **Color-Coded Annotations**: Choose from 8 colors (Yellow, Red, Orange, Blue, Green, Purple, Brown, Gray) to visually distinguish different types of annotations
- **Visual Highlighting**: Annotated code is highlighted directly in your editor with your chosen color
- **Smart Organization**: Sidebar view with all annotations organized by file
- **Flexible Tagging**: Categorize annotations by type (bug, performance, security, style, improvement, docs, question, ai-review)
- **Resolution Tracking**: Mark annotations as resolved when issues are fixed
- **Easy Export**: Generate Markdown for AI chats, team discussions, or documentation
- **Persistent Storage**: Annotations auto-save and restore between sessions
- **Zero Config**: Works out of the box, no setup required
- **Template Support**: Quick templates for common annotation scenarios (AI review, optimization, security, etc.)

### Advanced Features

- **Filter by Status**: Show all, unresolved only, or resolved only annotations
- **Filter by Tag**: Filter annotations by specific tags to focus on what matters
- **Search Annotations**: Find annotations by comment text, code, author, or tags
- **Edit Annotations**: Modify comments, tags, and colors after creation
- **Bulk Operations**: Resolve all, delete resolved, or delete all annotations
- **Keyboard Navigation**: Jump to next/previous annotation with `Alt+Up/Down`
- **Undo Support**: Quickly undo the last annotation with `Ctrl+Shift+Z`
- **Copilot Integration**: Direct integration with GitHub Copilot Chat (@annotative participant)
- **Multiple Export Formats**: Export for Copilot, ChatGPT, Claude, or generic AI tools

- **Flexible Tagging** - Categorize with tags: bug, performance, security, style, improvement, docs, question, ai-review

- **Templates** - Quick-start templates for common scenarios (AI review, security audit, optimization, etc.)

- **Resolution Tracking** - Mark annotations as resolved when addressed

- **Easy Export** - One-click export to Markdown for sharing or pasting into AI chats

### Power Features

- **Filtering** - Show only unresolved, filter by tag, or search across all annotations
- **Edit Anytime** - Change comments, tags, or colors after creation
- **Keyboard Navigation** - Jump between annotations with `Alt+Up/Down`
- **Bulk Operations** - Resolve all, delete resolved, or clear everything at once
- **Undo Support** - Made a mistake? Undo the last annotation instantly
- **Copilot Integration** - Built-in @annotative chat participant for seamless AI workflows
- **Multi-Format Export** - Optimized exports for Copilot, ChatGPT, Claude, or generic use
- **Persistent Storage** - Annotations auto-save and restore between sessions
- **Zero Configuration** - Works immediately, no setup required

## Keyboard Shortcuts

- `Ctrl+Shift+A` (Mac: `Cmd+Shift+A`) - Add annotation to selected text
- `Ctrl+Shift+Z` (Mac: `Cmd+Shift+Z`) - Undo last annotation
- `Alt+Down` - Go to next annotation
- `Alt+Up` - Go to previous annotation
- `Ctrl+Shift+F` (Mac: `Cmd+Shift+F`) - Search annotations (when sidebar is focused)

## Requirements

Annotative works seamlessly with AI tools:

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

## License

Annotative is **fully open source** and available under the [MIT License](LICENSE).

- Free for personal, educational, commercial, and enterprise use
- Modify, distribute, and use in your projects
- No restrictions on commercial use
- Requires attribution in derivative works

See [LICENSE](LICENSE) for full terms.

## What's New

### Version 1.2.0

- **8-color annotation system** for visual organization
- **Simplified UI** with native VS Code input boxes
- **Edit colors** on existing annotations
- **Improved performance** with streamlined interface
- **MIT License** - now fully open source

### 1.2.0 (Latest)

Simplified UI and enhanced visual customization:

#### Visual Enhancements

- **Color Picker**: Choose from 8 colors to visually distinguish annotations
  - 🟡 Yellow (Default) - General notes
  - 🔴 Red - Bugs and critical issues
  - 🟠 Orange - Warnings and improvements
  - 🔵 Blue - Information and documentation
  - 🟢 Green - Optimizations and enhancements
  - 🟣 Purple - Security and important notes
  - 🟤 Brown - Technical debt
  - ⚪ Gray - Low priority or archived
- Color-coded highlighting in editor
- Edit annotation colors after creation
