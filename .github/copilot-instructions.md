# Annotative VSCode Extension

A productivity tool for code annotation - perfect for reviewing AI-generated code, collaborating on pull requests, and taking notes while coding.

## Product Positioning

- **Primary Use Case**: Review AI-generated code changes from Copilot, ChatGPT, Claude, etc.
- **Secondary Use Cases**: Code reviews, note-taking, team collaboration, documentation
- **Key Value**: Simple annotation with export to Markdown for AI chats and discussions

## Development Guidelines

- Follow TypeScript best practices for VS Code extensions
- Use the VS Code Extension API for UI components and editor interactions
- Implement proper error handling and user feedback
- Store annotations in workspace-specific files
- Keep the UI simple and intuitive - no configuration required
- Ensure export format is optimized for pasting into AI chats

## Architecture

- Main extension file: `src/extension.ts`
- Annotation management: `src/annotationManager.ts`
- UI components: `src/ui/` directory
- Types and interfaces: `src/types.ts`

## Key Features

1. Quick annotation with keyboard shortcuts and context menus
2. Visual highlighting with decorations
3. Flexible tagging system (bug, performance, security, style, improvement, docs, question)
4. Resolution tracking
5. Markdown export optimized for AI chats and team discussions
6. Sidebar view for organization
7. Persistent workspace storage
