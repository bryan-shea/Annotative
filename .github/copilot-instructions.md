# Annotative VSCode Extension

This extension allows users to highlight lines of code and add annotations, similar to GitHub PR reviews but within VS Code.

## Development Guidelines

- Follow TypeScript best practices for VS Code extensions
- Use the VS Code Extension API for UI components and editor interactions
- Implement proper error handling and user feedback
- Store annotations in workspace-specific files
- Provide clear commands and keyboard shortcuts for user interactions

## Architecture

- Main extension file: `src/extension.ts`
- Annotation management: `src/annotationManager.ts`
- UI components: `src/ui/` directory
- Types and interfaces: `src/types.ts`

## Key Features

1. Line/selection highlighting with decorations
2. Annotation creation and editing
3. Annotation storage and retrieval
4. Export functionality for GitHub Copilot chat integration
5. Sidebar view for managing annotations
