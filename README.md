# Annotative

![Annotative Logo](media/annotative-logo/128px/annotative-logo.png)

A VS Code extension for code annotation and review workflows. Add inline comments to code selections, organize them with custom tags, and export for documentation or AI-assisted development.

## Overview

Annotative provides a lightweight annotation system within VS Code. Highlight code, add comments, organize with tags, and export as Markdown. Annotations are stored per workspace and can be shared with your team via version control.

Primary use cases:

- Reviewing AI-generated code changes
- Documenting code issues during development
- Creating feedback for code reviews
- Taking structured notes within codebases
- Tracking technical debt or improvements

## Upgrading from v1.5.0?

Annotative v2.0.0 introduces breaking changes to the tag system and storage. See [MIGRATION.md](MIGRATION.md) for detailed upgrade instructions, including:

- How to recreate preset tags as custom tags
- What happens to legacy global-storage data
- Updating existing annotations with new tags
- Sharing annotations with your team via version control

## Quick Start

1. Select code in the editor
2. Press Ctrl+Shift+A (Cmd+Shift+A on macOS)
3. Enter your comment
4. Optionally select tags and choose a highlight color
5. View all annotations in the sidebar
6. Export to Markdown when ready to share

## Features

### Core Functionality

#### Annotation Management

- Add annotations to selected code with keyboard shortcuts or context menu
- Edit annotation comments directly in the sidebar webview
- Mark annotations as resolved when issues are addressed
- Delete individual or bulk annotations
- Undo the most recent annotation

#### Organization

- Group annotations by file, folder, tag, or resolution status
- Filter by status (all, unresolved, resolved)
- Filter by custom tags
- Navigate between annotations with keyboard shortcuts
- Keep sidebar filter state while the webview stays open in the current window session

#### Custom Tags

- Create project-specific tags with custom names, categories, priorities, and colors
- Edit existing tags to update properties
- Delete unused tags
- No preset tags - all tags are user-defined

#### Visual Highlighting

- Inline code highlighting in the editor
- Eight color options for visual preference
- Decorations update automatically when switching files

#### Export and Sharing

- Export annotations as Markdown to clipboard
- Export to a new document for editing
- Export for Copilot, ChatGPT, Claude, or a generic AI format
- Save Copilot-oriented exports to `.copilot/annotations`
- Run batch AI review for up to 10 unresolved annotations at a time

### GitHub Copilot Integration

When GitHub Copilot Chat is installed and `annotative.copilot.enabled` is on, Annotative registers an `@annotative` chat participant and adds export helpers.

- Review unresolved annotations across the workspace or the active file
- Explain an annotation, suggest fixes, or review the active file with annotation context
- Use template-driven annotation creation and send the new annotation to Copilot immediately
- Export annotation sets to clipboard, a document, or `.copilot/annotations`

Chat participant commands:

- `/issues` - Show open annotations
- `/explain` - Get detailed explanations
- `/fix` - Request fix suggestions
- `/review` - Review with full context

### Storage Options

Annotative currently uses project storage only.

- The `.annotative/` folder is created on first annotation or custom-tag save, or manually with `Annotative: Initialize Storage`
- Annotations are stored in `.annotative/annotations.json`
- Custom tags are stored in `.annotative/customTags.json`
- A `.annotative/README.md` file is created with version-control guidance
- Share annotations with your team via version control
- Portable across different machines

## Installation

Install from the VS Code Marketplace:

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Annotative"
4. Click Install

No additional configuration is required for annotation features. Copilot-specific flows require GitHub Copilot Chat.

## Requirements

- VS Code 1.105.0 or higher
- No external dependencies

## Usage

### Adding Annotations

**Via Keyboard Shortcut:**

1. Select text in the editor
2. Press Ctrl+Shift+A (Cmd+Shift+A on macOS)
3. Enter a comment in the input box
4. Optionally select tags (if any custom tags exist)
5. Choose a highlight color

**Via Context Menu:**

1. Select text in the editor
2. Right-click and choose "Add Annotation"
3. Follow the same prompts as above

**Via Template:**

- Select text and use "Add from Template" for common annotation scenarios
- Templates include predefined comments for review, explanation, optimization, and security

### Managing Annotations

**Sidebar View:**

- All annotations appear in the "Annotations" sidebar
- Click any annotation to navigate to its location
- Use inline buttons to edit, toggle status, or delete
- Group annotations by file, folder, tag, or status using the dropdown
- Toolbar actions refresh and repopulate the sidebar when the webview becomes visible again

**Editing:**

- Click the edit button in the sidebar
- Update the comment text in the input box
- Changes save automatically

**Resolution Tracking:**

- Click the toggle status button to mark as resolved
- Resolved annotations remain visible but are flagged
- Use "Delete Resolved" to clean up completed items

**Bulk Operations:**

- "Resolve All" marks all annotations as resolved
- "Delete Resolved" removes all resolved annotations
- "Delete All" clears all annotations in the workspace

### Filtering

**Filter by Status:**

- Show all, only unresolved, or only resolved annotations
- Access via the filter icon in the sidebar toolbar

**Filter by Tag:**

- Focus on annotations with specific tags
- Only available if custom tags have been created

### Keyboard Shortcuts

| Shortcut                   | Action                          |
| -------------------------- | ------------------------------- |
| Ctrl+Shift+A (Cmd+Shift+A) | Add annotation to selection     |
| Ctrl+Shift+Z (Cmd+Shift+Z) | Undo last annotation            |
| Alt+Down                   | Navigate to next annotation     |
| Alt+Up                     | Navigate to previous annotation |
| Ctrl+Alt+E (Cmd+Alt+E)     | Export annotations by intent    |

### Tag Management

**Creating Tags:**

1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Run "Annotative: Create Tag"
3. Enter tag name
4. Select category, priority, and color

**Editing Tags:**

1. Open Command Palette
2. Run "Annotative: Edit Tag"
3. Select tag to edit
4. Update properties

**Deleting Tags:**

1. Open Command Palette
2. Run "Annotative: Delete Tag"
3. Select tag to remove
4. Confirm deletion

**Viewing Tags:**

- Run "Annotative: List Tags" to see all available tags

### Project Storage

Storage is created automatically on first save, but you can also initialize it explicitly.

**Initialize Project Storage:**

1. Open Command Palette
2. Run "Annotative: Initialize Storage"
3. A `.annotative/` folder is created in the workspace root
4. The folder contains `README.md`, and future saves write `annotations.json` and `customTags.json`

**Share with Team:**

- Commit `.annotative/` to version control
- Team members with the extension see the same annotations
- Changes sync through git like any other file

**Check Storage Location:**

- Run "Annotative: Storage Info" to see current storage path
- Shows whether project storage has already been created for the current workspace

### Exporting Annotations

**To Clipboard:**

- Click "Export to Clipboard" in the sidebar toolbar
- Markdown content copied to clipboard
- Paste into documents, chats, or issues

**To Document:**

- Click "Export to Document" in the sidebar toolbar
- Opens a new untitled document with Markdown content
- Edit and save as needed

**For AI Tools:**

- Click "Export for AI" for optimized formatting
- Choose Copilot, ChatGPT, Claude, or Generic format
- Includes configured context lines and optional import lines
- Paste directly into Copilot, ChatGPT, or Claude

**By Intent:**

- Press Ctrl+Alt+E (Cmd+Alt+E on macOS)
- Choose export intent (review, documentation, issue tracking)
- Format optimized for the selected intent
- Optionally save the prepared export under `.copilot/annotations`

**Batch AI Review:**

- Run "Annotative: Batch AI Review" from the sidebar toolbar
- Annotative prepares a report for up to 10 unresolved annotations
- Copy the report, view it in a document, open Copilot Chat, or save it to `.copilot/annotations`

## Commands

Access all commands via the Command Palette (Ctrl+Shift+P / Cmd+Shift+P):

**Annotation Commands:**

- `Annotative: Add Annotation` - Add annotation to selected code
- `Annotative: Add from Template` - Use predefined templates
- `Annotative: Edit` - Edit annotation comment
- `Annotative: Toggle Status` - Mark resolved or unresolved
- `Annotative: Remove` - Delete annotation
- `Annotative: Undo` - Undo last annotation
- `Annotative: View Details` - Show annotation details

**Navigation Commands:**

- `Annotative: Next` - Go to next annotation
- `Annotative: Previous` - Go to previous annotation
- `Annotative: Go to Location` - Navigate to annotation source

**Filter Commands:**

- `Annotative: Filter by Status` - Filter all, unresolved, or resolved
- `Annotative: Filter by Tag` - Filter by custom tag
- `Annotative: Clear Filters` - Reset all filters
- `Annotative: Refresh` - Reload annotations

**Bulk Commands:**

- `Annotative: Resolve All` - Mark all as resolved
- `Annotative: Delete Resolved` - Remove resolved annotations
- `Annotative: Delete All` - Clear all annotations

**Tag Commands:**

- `Annotative: Create Tag` - Create custom tag
- `Annotative: Edit Tag` - Modify tag properties
- `Annotative: Delete Tag` - Remove custom tag
- `Annotative: List Tags` - View all tags

**Export Commands:**

- `Annotative: Export to Clipboard` - Copy as Markdown
- `Annotative: Export to Document` - Open in new file
- `Annotative: Export by Intent` - Prepare Copilot-oriented output for review, bugs, optimization, or documentation
- `Annotative: Export for AI` - Export for Copilot, ChatGPT, Claude, or a generic AI format
- `Annotative: Batch AI Review` - Prepare a multi-annotation AI review report

**Storage Commands:**

- `Annotative: Initialize Storage` - Create project storage
- `Annotative: Storage Info` - Show storage location

## Configuration

Configure via VS Code settings (File > Preferences > Settings):

**Export Settings:**

- `annotative.export.contextLines` - Number of context lines in exports (default: 5)
- `annotative.export.includeImports` - Include imports in context (default: true)

**Copilot Integration:**

- `annotative.copilot.enabled` - Enable Copilot integration (default: true)
- `annotative.copilot.autoAttachContext` - Auto-attach context to Copilot (default: true)
- `annotative.copilot.preferredFormat` - Export format for Copilot: conversational, structured, or compact (default: conversational)
- `annotative.copilot.autoOpenChat` - Auto-open Copilot Chat (default: false)

## Workflows

### Code Review

1. Open a pull request or diff locally
2. Annotate areas needing attention
3. Use tags to categorize feedback
4. Export annotations and share with the team
5. Mark annotations as resolved when addressed

### AI-Assisted Development

1. Review AI-generated code changes
2. Annotate unclear or problematic sections
3. Use `@annotative` in Copilot Chat to discuss
4. Or export annotations to ChatGPT or Claude
5. Implement suggestions and resolve annotations

### Documentation

1. Annotate complex code sections
2. Use tags like "docs" or "clarification"
3. Export as Markdown
4. Integrate into project documentation

### Issue Tracking

1. Create annotations for technical debt
2. Tag by priority or category
3. Filter to focus on high-priority items
4. Export and create GitHub issues
5. Resolve annotations as issues are fixed

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

**Development Setup:**

1. Clone the repository
2. Run `npm install`
3. Press F5 in VS Code to launch Extension Development Host
4. Make changes and test
5. Submit a pull request

## License

MIT License. See [LICENSE](LICENSE) for details.

This extension is free for personal, commercial, and enterprise use with no restrictions.
