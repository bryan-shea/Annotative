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
- Keep the UI simple and intuitive - lightweight input boxes instead of complex webviews
- Ensure export format is optimized for pasting into AI chats
- Focus on speed and simplicity over complex UI

## Architecture

- Main extension file: `src/extension.ts`
- Annotation management: `src/annotationManager.ts`
- UI components: `src/ui/annotationProvider.ts` (sidebar tree view only)
- Types and interfaces: `src/types.ts`
- Copilot integration: `src/copilotExporter.ts` and `src/copilotChatParticipant.ts`

## Key Features

1. Quick annotation with keyboard shortcuts and context menus
2. Simple input boxes for adding/editing annotations (no complex webviews)
3. Visual highlighting with editor decorations
4. Flexible tagging system (bug, performance, security, style, improvement, docs, question, ai-review)
5. Resolution tracking
6. Markdown export optimized for AI chats and team discussions
7. Sidebar tree view for organization
8. Persistent workspace storage
9. Template support for common annotation scenarios
10. Direct Copilot Chat integration (@annotative participant)
