#!/usr/bin/env node

/**
 * Semantic Version Calculator
 * Analyzes commit history to determine semantic version bump
 * Uses Conventional Commits format
 *
 * MAJOR: Breaking changes (feat!, BREAKING CHANGE:)
 * MINOR: New features (feat:)
 * PATCH: Bug fixes (fix:)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const currentVersion = packageJson.version;

/**
 * Get version bump type from commit history
 * @param {string} fromRef - Starting ref (usually last tag)
 * @param {string} toRef - Ending ref (usually HEAD)
 * @returns {string|null} - 'major', 'minor', 'patch', or null
 */
function analyzeCommits(fromRef, toRef) {
  try {
    const commits = execSync(
      `git log ${fromRef}..${toRef} --pretty=format:%B%n---COMMIT_END---`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    );

    if (!commits.trim()) {
      return null; // No commits between refs
    }

    let hasBreaking = false;
    let hasFeature = false;
    let hasFix = false;

    // Split by commits
    const commitList = commits.split('---COMMIT_END---');

    commitList.forEach(commit => {
      const msg = commit.trim().toLowerCase();

      // Check for breaking changes
      if (msg.includes('breaking change:') || /^feat!:|^feat\(.+\)!:/m.test(commit)) {
        hasBreaking = true;
      }

      // Check for features
      if (/^feat(\(.+?\))?:/m.test(commit)) {
        hasFeature = true;
      }

      // Check for fixes
      if (/^fix(\(.+?\))?:/m.test(commit)) {
        hasFix = true;
      }
    });

    // Determine highest priority bump
    if (hasBreaking) return 'major';
    if (hasFeature) return 'minor';
    if (hasFix) return 'patch';

    return null;
  } catch (error) {
    // If command fails (e.g., no commits), return null
    return null;
  }
}

/**
 * Calculate new version based on bump type
 */
function calculateNewVersion(current, bumpType) {
  const parts = current.split('.').map(p => parseInt(p, 10));
  const [major, minor, patch] = parts;

  switch (bumpType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      return current;
  }
}

/**
 * Get last git tag
 */
function getLastTag() {
  try {
    return execSync('git describe --tags --abbrev=0 2>/dev/null', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
  } catch {
    return null;
  }
}

// Main execution
const lastTag = getLastTag();
const fromRef = lastTag || 'HEAD~10'; // Fallback to last 10 commits if no tags
const toRef = 'HEAD';

const bumpType = analyzeCommits(fromRef, toRef);
const newVersion = bumpType ? calculateNewVersion(currentVersion, bumpType) : currentVersion;

// Console output
console.log(`\n📊 Version Analysis`);
console.log(`   Current: ${currentVersion}`);
console.log(`   Last tag: ${lastTag || 'none'}`);
console.log(`   Commits: ${fromRef}..${toRef}`);
console.log(`   Bump type: ${bumpType || 'none'}`);
console.log(`   New version: ${newVersion}\n`);

// GitHub Actions output format
if (process.env.GITHUB_OUTPUT) {
  const output = `BUMP_TYPE=${bumpType || 'none'}\nNEW_VERSION=${newVersion}\nHAS_CHANGES=${bumpType ? 'true' : 'false'}`;
  fs.appendFileSync(process.env.GITHUB_OUTPUT, output + '\n');
}

// Fallback console output for local use
console.log(`BUMP_TYPE=${bumpType || 'none'}`);
console.log(`NEW_VERSION=${newVersion}`);
console.log(`HAS_CHANGES=${bumpType ? 'true' : 'false'}`);
