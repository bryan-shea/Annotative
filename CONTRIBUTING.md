# Contributing to Annotative

Thank you for your interest in contributing to Annotative.

Annotative is a VS Code extension for code annotation and review workflows. This guide covers development setup, coding standards, and contribution guidelines.

## Development Setup

### Prerequisites

- Node.js 22.x or higher
- VS Code 1.105.0 or higher
- Git

### Setup Steps

1. Fork and clone the repository:

   ```bash
   git clone https://github.com/your-username/Annotative.git
   cd Annotative
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Open the project in VS Code:

   ```bash
   code .
   ```

4. Press F5 to launch the Extension Development Host

### Project Structure

```
src/
  commands/         # Command implementations
  managers/         # Core business logic
  tags/            # Tag management system
  ui/              # Sidebar and webview components
  types.ts         # TypeScript interfaces
  extension.ts     # Extension entry point
media/             # Webview assets (CSS, JS, icons)
docs/              # Documentation
scripts/           # Build and deployment scripts
```

## Development Workflow

### Building

- `npm run compile` - Compile TypeScript once
- `npm run watch` - Compile in watch mode for development
- `npm run package` - Build production bundle with webpack

### Testing

- `npm test` - Run test suite
- `npm run lint` - Run ESLint
- Manual testing: Press F5 to launch Extension Development Host

**Important:** Always test locally before pushing to GitHub. See [docs/dev/LOCAL_TESTING_GUIDE.md](docs/dev/LOCAL_TESTING_GUIDE.md) for detailed testing procedures.

### Quality Checks

Run these before submitting pull requests:

```bash
npm run lint          # Check code style
npm run compile       # Verify TypeScript compilation
npm test              # Run tests
```

Or run all checks at once:

```bash
npm run pretest
```

## Code Standards

### TypeScript

- Use strict TypeScript mode
- Define interfaces for all data structures
- Avoid `any` types when possible
- Use async/await for asynchronous operations

### Code Style

- Follow existing code formatting
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions focused and single-purpose

### Commit Messages

Follow conventional commit format:

```
feat: add new feature
fix: resolve bug
docs: update documentation
refactor: restructure code
test: add or update tests
chore: maintenance tasks
```

Examples:

- `feat: add batch annotation export`
- `fix: resolve sidebar rendering issue`
- `docs: update README with new commands`

### Architecture Guidelines

- **Commands** (`src/commands/`) - User-facing command implementations
- **Managers** (`src/managers/`) - Core business logic and state management
- **UI** (`src/ui/`) - Webview and tree view components
- **Tags** (`src/tags/`) - Tag system implementation

Keep concerns separated:

- Commands handle user input and orchestration
- Managers handle data and business rules
- UI components handle presentation

## Pull Request Process

1. Fork the repository
2. Create a feature branch:

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. Make your changes:
   - Write code following the standards above
   - Add or update tests if applicable
   - Update documentation if needed

4. Test thoroughly:
   - Run all quality checks
   - Test in Extension Development Host
   - Verify no regressions

5. Commit your changes:

   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

6. Push to your fork:

   ```bash
   git push origin feature/your-feature-name
   ```

7. Open a pull request:
   - Provide clear description of changes
   - Reference any related issues
   - Include screenshots for UI changes

## Bug Reports

When filing bug reports, include:

- **VS Code version** - Help > About
- **Extension version** - Check Extensions view
- **Operating system** - Windows, macOS, or Linux
- **Steps to reproduce** - Numbered steps
- **Expected behavior** - What should happen
- **Actual behavior** - What actually happens
- **Error messages** - From Developer Tools console if available
- **Screenshots** - If UI-related

## Feature Requests

When requesting features:

- Check existing issues first
- Describe the use case
- Explain how it benefits users
- Suggest implementation approach if possible

## Documentation

Update documentation when:

- Adding new features
- Changing existing behavior
- Adding new commands
- Modifying configuration options

Documentation files:

- [README.md](README.md) - User-facing documentation
- [CHANGELOG.md](CHANGELOG.md) - Version history
- [docs/](docs/) - Technical documentation

## Release Process

Releases are managed by maintainers. The process includes:

1. Version bump in package.json
2. Update CHANGELOG.md
3. Create git tag
4. Build and package extension
5. Publish to VS Code Marketplace

Contributors do not need to manage versions or releases.

## Questions

For questions about contributing:

- Open a discussion on GitHub
- Check existing documentation in [docs/](docs/)
- Review closed issues for similar topics

## Code of Conduct

- Be respectful and constructive
- Focus on the technical merits
- Welcome newcomers
- Collaborate openly
