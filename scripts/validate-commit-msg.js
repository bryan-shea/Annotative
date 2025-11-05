#!/usr/bin/env node

/**
 * Commit Message Validator
 * Enforces Conventional Commits format: https://www.conventionalcommits.org/
 *
 * Valid formats:
 *   - feat: add new feature
 *   - fix: resolve a bug
 *   - docs: documentation only
 *   - style: formatting, no code change
 *   - refactor: code restructure, no feature/bug change
 *   - perf: performance improvements
 *   - test: add/update tests
 *   - chore: dependency updates, build changes
 *   - ci: CI/CD configuration changes
 *
 * Breaking changes (MAJOR version bump):
 *   - feat!: breaking feature change
 *   - BREAKING CHANGE: in commit body
 *
 * Scopes (optional):
 *   - feat(ui): add new UI component
 *   - fix(core): fix core logic
 */

const fs = require('fs');
const path = require('path');

// Get commit message from file or argument
const commitMsgFile = process.argv[2];

if (!commitMsgFile) {
  console.error('❌ No commit message file provided');
  process.exit(1);
}

let commitMessage = '';
try {
  commitMessage = fs.readFileSync(commitMsgFile, 'utf-8').trim();
} catch (error) {
  console.error('❌ Failed to read commit message:', error.message);
  process.exit(1);
}

// Ignore merge commits and squash commits
if (commitMessage.startsWith('Merge ') || commitMessage.startsWith('Squash ')) {
  process.exit(0);
}

// Conventional commit pattern
// Format: type(scope)?: subject
const conventionalRegex = /^(feat|fix|docs|style|refactor|perf|test|chore|ci)(\(.+\))?!?: .{1,}$/m;

// Get first line (subject)
const subject = commitMessage.split('\n')[0];

console.log('\n📋 Validating commit message...');
console.log(`   Subject: ${subject}\n`);

if (!conventionalRegex.test(subject)) {
  console.error('❌ Invalid commit message format!\n');
  console.error('Expected format: type(scope)?: subject\n');
  console.error('Examples:');
  console.error('  ✅ feat: add color picker for annotations');
  console.error('  ✅ fix(ui): resolve highlight rendering bug');
  console.error('  ✅ feat!: redesign annotation storage (BREAKING)');
  console.error('  ✅ chore: update dependencies\n');
  console.error('Types: feat, fix, docs, style, refactor, perf, test, chore, ci\n');
  process.exit(1);
}

// Check for breaking changes
const hasBreaking = commitMessage.includes('BREAKING CHANGE:') || subject.includes('!:');

console.log('✅ Valid conventional commit!');
if (hasBreaking) {
  console.log('   🚨 Breaking change detected (MAJOR version bump)\n');
} else {
  const type = subject.split(':')[0].split('(')[0];
  if (type === 'feat') {
    console.log('   📈 New feature (MINOR version bump)\n');
  } else if (type === 'fix') {
    console.log('   🔧 Bug fix (PATCH version bump)\n');
  }
}

process.exit(0);
