![Annotative Logo](media/annotative-logo/128px/annotative-logo.png)

Annotative is a lightweight VS Code extension for code annotation and team collaboration. Highlight code, add tagged notes with custom colors, and export to Markdown for sharing with your team or AI tools like Copilot, ChatGPT, and Claude. Perfect for code reviews, documenting issues, and collaborative feedback.

## Why Use Annotative?

- **Review code systematically** - Flag issues, improvements, and observations as you code
- **Team collaboration** - Share annotations with teammates for synchronized feedback
- **AI-assisted development** - Export annotations to discuss with Copilot, ChatGPT, or Claude
- **Documentation** - Capture insights and create self-documenting code reviews
- **Issue tracking** - Mark, prioritize, and track code issues within the editor
- **Knowledge sharing** - Create project-specific annotation libraries for team learning

## How It Works

1. Select code you want to annotate
2. Press Ctrl+Shift+A or right-click and select "Add Annotation"
3. Enter your note
4. Add tags to categorize (bug, performance, security, etc.)
5. Choose a color for visual preference
6. View in sidebar with flexible organization options
7. Export as Markdown or share with your team

## Core Features

- **Fast annotation** - Keyboard shortcuts and context menus for quick feedback
- **Visual highlighting** - See annotated code directly in your editor with color coding
- **Smart organization** - Group annotations by file, tag, project, or status
- **Flexible tagging** - Built-in tags (bug, performance, security, docs, etc.) plus custom tag support
- **Resolution tracking** - Mark annotations resolved when issues are addressed
- **Easy export** - Generate Markdown for sharing, documentation, or AI discussions
- **Persistent storage** - Auto-save annotations between sessions
- **Zero configuration** - Works out of the box with no setup needed

## Advanced Features

- **Project-based storage** - Save annotations in `.annotative/` folder within your project for team sharing
- **Custom tags** - Create, edit, and delete tags tailored to your team's workflow
- **Sidebar editing** - Update annotation comments directly from the sidebar
- **Multiple organization modes** - Group by file, tag, project, or resolution status
- **Bulk operations** - Tag, resolve, or delete multiple annotations at once
- **Smart filtering** - Filter by status, tag, or search across all annotations
- **Keyboard navigation** - Jump between annotations with Alt+Up/Down
- **Undo support** - Quickly undo the last annotation
- **Copilot integration** - Use @annotative participant in Copilot Chat for AI discussion
- **Multi-format export** - Optimized exports for Copilot, ChatGPT, Claude, or generic sharing

## Keyboard Shortcuts

| Shortcut                            | Action                          |
| ----------------------------------- | ------------------------------- |
| `Ctrl+Shift+A` (Mac: `Cmd+Shift+A`) | Add annotation to selected text |
| `Ctrl+Shift+Z` (Mac: `Cmd+Shift+Z`) | Undo last annotation            |
| `Alt+Down`                          | Jump to next annotation         |
| `Alt+Up`                            | Jump to previous annotation     |
| `Ctrl+Shift+F` (Mac: `Cmd+Shift+F`) | Search annotations              |
| `Ctrl+Alt+E` (Mac: `Cmd+Alt+E`)     | Export annotations              |

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

## Commands

Use the command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) to access:

| Command                    | Description                                   |
| -------------------------- | --------------------------------------------- |
| Add Annotation             | Annotate selected code                        |
| Edit Annotation            | Update comment in sidebar                     |
| Toggle Resolved            | Mark annotation resolved/unresolved           |
| Remove Annotation          | Delete an annotation                          |
| Filter by Status           | Show all, open, or resolved only              |
| Filter by Tag              | Focus on specific tag categories              |
| Create Custom Tag          | Define custom tags for your team              |
| Edit Custom Tag            | Modify custom tag properties                  |
| Delete Custom Tag          | Remove a custom tag                           |
| List All Tags              | View all available tags                       |
| Initialize Project Storage | Create `.annotative/` folder for team sharing |
| Show Storage Info          | View where annotations are stored             |
| Export Annotations         | Copy as Markdown to clipboard                 |
| Search Annotations         | Find annotations across workspace             |

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

Annotations are stored per workspace in `.annotative/` folder:

- **Project-specific**: Each project can have its own annotation set in `.annotative/annotations.json`
- **Shared with team**: Commit `.annotative/` to version control to share annotations with teammates
- **Portable**: Take your workspace and annotations with you
- **Auto-save**: Changes save automatically during development
- **Global fallback**: If no project storage exists, annotations save globally in VS Code's storage

## Tips & Best Practices

### Team Collaboration

1. **Initialize project storage** - Run `Annotative: Initialize Project Storage` to create `.annotative/` folder
2. **Establish consistent tags** - Create custom tags your team agrees on (e.g., "security-review", "needs-clarification")
3. **Version control** - Commit `.annotative/` to share annotations with teammates
4. **Code review workflow** - Use annotations as a lightweight alternative to traditional PR comments

### Using Custom Tags

1. **Create tags** - Use `Annotative: Create Custom Tag` to define project-specific categories
2. **Assign priorities** - Tags support low, medium, high, and critical priority levels
3. **Use colors strategically** - Align tag colors with severity or category (red = critical, blue = documentation)
4. **Bulk operations** - Apply the same tag to multiple annotations for organization

### With AI Tools

1. Export annotations and paste directly into Copilot Chat, ChatGPT, or Claude
2. Use `@annotative` participant in Copilot Chat for direct integration
3. Ask AI to prioritize issues or suggest fixes based on tagged annotations
4. Iterate on AI suggestions and track progress with resolved status

### Organizing Annotations

1. Use "Group by Tag" to see all similar issues together
2. Use "Group by Status" to focus on unresolved items first
3. Use "Filter by Tag" to focus on specific categories
4. Use bulk operations to efficiently manage large annotation sets

## License

Annotative is fully open source and available under the MIT License.

- Free for personal, educational, commercial, and enterprise use
- Modify and distribute freely
- No restrictions on commercial use

See [LICENSE](LICENSE) for details.

## Recent Updates

### Version 1.4.0 - Project Management & Custom Tags

**New Features:**

- **Project-based storage** - Initialize `.annotative/` folder to store annotations in your project
- **Sidebar editing** - Edit annotation comments directly from the sidebar with dedicated edit button
- **Custom tags CRUD** - Create, edit, and delete custom tags tailored to your team's workflow
- **Enhanced tag management** - All preset and custom tags available in tag picker

**Commands:**

- `Annotative: Initialize Project Storage` - Set up project-specific annotation storage
- `Annotative: Create Custom Tag` - Define new tags with custom colors and priorities
- `Annotative: Edit Custom Tag` - Modify existing custom tags
- `Annotative: Delete Custom Tag` - Remove custom tags (preset tags protected)
- `Annotative: List All Tags` - View all available tags
- `Annotative: Show Storage Info` - Check current storage location

### Version 1.3.54 - Stability & Polish

- Performance improvements and bug fixes
- Enhanced sidebar rendering
- Improved tag handling

### Version 1.2.0 - Simplified UI & Color Customization

- 8-color picker for visual annotation preference
- Lightweight input boxes instead of complex webviews
- Native VS Code UI components
- Full MIT open source license

See [CHANGELOG.md](CHANGELOG.md) for complete version history.

## Support

- **GitHub Issues** - Report bugs and request features
- **GitHub Discussions** - Share ideas and best practices
- **Documentation** - See [docs/](docs/) folder for detailed guides

Built by developers for developers who care about code quality.
