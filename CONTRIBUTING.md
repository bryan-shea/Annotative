# Contributing to Annotative

Thank you for your interest in contributing to Annotative! This document provides guidelines for contributing to this VS Code extension.

## Development Setup

1. Clone the repository
2. Run `npm install` to install dependencies
3. Open in VS Code
4. Press `F5` to launch the extension in a new Extension Development Host window

## Building

- `npm run compile` - Compile TypeScript
- `npm run watch` - Watch mode for development
- `npm run package` - Build for production
- `npm run lint` - Run ESLint

## Testing

- `npm run test` - Run tests
- Test manually by pressing `F5` to launch debug mode

## Pull Request Guidelines

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Code Style

- Follow the existing code style
- Use TypeScript best practices
- Add JSDoc comments for public APIs
- Ensure all tests pass

## Bug Reports

When filing bug reports, please include:

- VS Code version
- Extension version
- Steps to reproduce
- Expected vs actual behavior
- Any error messages
