# Contributing to Annotative

Annotative is a VS Code extension for code annotation and review workflows. This guide covers the current development, testing, and pull request expectations for the `v3` line.

## Prerequisites

- Node.js `20.x` or `22.x`
- VS Code `1.105.0` or later
- Git

## Local Setup

```bash
git clone https://github.com/your-username/Annotative.git
cd Annotative
npm install
code .
```

Press `F5` in VS Code to launch an Extension Development Host.

## Project Structure

```text
src/
  commands/      Command handlers
  managers/      Storage, exports, and annotation logic
  tags/          Tag management
  ui/            Sidebar webview host code
  test/          VS Code integration and manager tests
  utils/         Workspace and support helpers
media/           Webview assets
scripts/         Build, validation, and test entry points
docs/            User, maintainer, and testing documentation
```

## Core Commands

- `npm run compile` builds the extension bundle once
- `npm run watch` runs the extension bundle in watch mode
- `npm run compile-tests` builds the test output
- `npm run watch-tests` watches and rebuilds tests
- `npm run lint` runs ESLint
- `npm test` runs the VS Code test harness
- `npm run quality` runs compile, lint, tests, and compliance checks
- `npm run release:check` runs the local pre-release verification flow

## Testing Expectations

Before opening a pull request, run:

```bash
npm run compile
npm run lint
npm test
```

If your change affects release readiness, packaging, or the published extension, also run:

```bash
npm run release:check
```

Notes:

- `npm test` uses the repository test runner in `scripts/run-vscode-tests.mjs`
- The runner exists because the stock Windows path handling was unreliable in repo paths with spaces
- Manual verification in an Extension Development Host is still required for UI-heavy changes

## Code Guidelines

- Keep commands thin and put business logic in managers
- Keep storage and export behavior deterministic and testable
- Follow the current naming used by the extension UI and package manifest
- Use strict TypeScript patterns and avoid unnecessary `any`
- Add or update tests when behavior changes
- Update documentation when user-visible behavior, settings, or release steps change

## Pull Request Expectations

Each pull request should:

1. Describe the behavioral change clearly.
2. Include tests or explain why tests were not practical.
3. Update relevant docs when user-facing behavior changes.
4. Avoid unrelated cleanup unless it directly supports the change.

Recommended PR checklist:

- [ ] `package.json`, docs, and commands agree on names and behavior
- [ ] Tests cover the changed path or a reasonable equivalent
- [ ] Screenshots are attached for meaningful UI changes
- [ ] Migration notes are updated if storage or upgrade behavior changed

## Commit Messages

Use conventional commits where practical:

```text
feat: add anchored annotation reattachment
fix: recover cleanly from corrupt annotation storage
docs: align release process with manual workflow
test: add sidebar webview regression coverage
```

## Release Ownership

Maintainers handle releases.

Current release flow:

1. Prepare the release version and changelog in git.
2. Merge the release-ready commit to `main`.
3. Run `npm run release:check` locally if you are preparing that release commit.
4. Trigger the `Release To Marketplace` GitHub Actions workflow from `main`.
5. Let the workflow validate, package, publish, and tag the already-versioned commit.

Contributors should not add ad hoc release automation, bump versions in unrelated PRs, or push directly to `main`.

## Reporting Issues

When reporting bugs, include:

- VS Code version
- Annotative version
- Operating system
- Whether you opened a folder or loose files
- Steps to reproduce
- Expected behavior
- Actual behavior
- Relevant output or error text

## Documentation Map

- [README.md](README.md) for user-facing behavior
- [MIGRATION.md](MIGRATION.md) for upgrade guidance
- [CHANGELOG.md](CHANGELOG.md) for release notes
- [docs/](docs/) for maintainer and testing documentation
