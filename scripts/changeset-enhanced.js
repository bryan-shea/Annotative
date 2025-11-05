#!/usr/bin/env node

/**
 * Enhanced Changeset CLI for Annotative
 * Interactive tool with manual version control and markdown support
 *
 * Usage: npm run changeset
 */

const readline = require('readline');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
};

// Simple commit types
const commitTypes = [
  { type: 'feat', description: 'New feature' },
  { type: 'fix', description: 'Bug fix' },
  { type: 'docs', description: 'Documentation' },
  { type: 'chore', description: 'Maintenance/dependencies' },
  { type: 'refactor', description: 'Code refactoring' },
  { type: 'perf', description: 'Performance improvement' },
  { type: 'test', description: 'Tests' }
];

// Version bump types
const versionTypes = [
  { type: 'major', description: 'Breaking changes (1.0.0 → 2.0.0)' },
  { type: 'minor', description: 'New features (1.0.0 → 1.1.0)' },
  { type: 'patch', description: 'Bug fixes (1.0.0 → 1.0.1)' },
  { type: 'none', description: 'No version change' }
];

function displayCommitTypes() {
  console.log('\nWhat type of change is this?\n');

  commitTypes.forEach((item, index) => {
    console.log(`${index + 1}. ${item.description}`);
  });
  console.log('');
}

function displayVersionTypes() {
  console.log('\nWhat kind of version bump?\n');

  versionTypes.forEach((item, index) => {
    console.log(`${index + 1}. ${item.description}`);
  });
  console.log('');
}

function getCurrentVersion() {
  try {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    return packageJson.version;
  } catch {
    return '1.0.0';
  }
}

function calculateNewVersion(currentVersion, versionBump) {
  const [major, minor, patch] = currentVersion.split('.').map(Number);

  switch (versionBump) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      return currentVersion;
  }
}

function showVersionImpact(versionBump) {
  const currentVersion = getCurrentVersion();
  const newVersion = calculateNewVersion(currentVersion, versionBump);

  if (currentVersion === newVersion) {
    console.log(`Version: No change (${currentVersion})\n`);
  } else {
    console.log(`Version: ${versionBump.toUpperCase()} (${currentVersion} → ${newVersion})\n`);
  }
}

async function openMarkdownEditor() {
  const tempFile = path.join(__dirname, '..', '.changeset-temp.md');

  // Create template
  const template = `# Commit Description

## Summary
Brief description of changes

## Changes Made
- List specific changes
- What was added/fixed/updated

## Impact
- How this affects users
- Any breaking changes
- Migration notes (if needed)

## Related
- Issue numbers
- Pull request references

---
Delete sections you don't need. Save and close when done.
`;

  fs.writeFileSync(tempFile, template);

  console.log('Opening markdown editor...');
  console.log('Save and close the file when you\'re done writing.\n');

  try {
    // Try different editors
    const editors = ['code', 'notepad', 'nano', 'vim'];
    let editorWorked = false;

    for (const editor of editors) {
      try {
        execSync(`${editor} "${tempFile}"`, { stdio: 'inherit' });
        editorWorked = true;
        break;
      } catch {
        continue;
      }
    }

    if (!editorWorked) {
      console.log(`Couldn't open editor. Edit this file manually: ${tempFile}`);
      await question('Press Enter when you\'ve finished editing...');
    }

    // Read the content
    const content = fs.readFileSync(tempFile, 'utf-8').trim();

    // Clean up
    fs.unlinkSync(tempFile);

    return content;
  } catch (error) {
    console.log('Editor failed. Using simple text input instead.');
    return null;
  }
}

function getStagedFiles() {
  try {
    const staged = execSync('git diff --cached --name-only', { encoding: 'utf-8' }).trim();
    return staged ? staged.split('\n') : [];
  } catch {
    return [];
  }
}

function getUnstagedFiles() {
  try {
    const unstaged = execSync('git diff --name-only', { encoding: 'utf-8' }).trim();
    return unstaged ? unstaged.split('\n') : [];
  } catch {
    return [];
  }
}

async function stageFiles() {
  const staged = getStagedFiles();
  const unstaged = getUnstagedFiles();

  if (staged.length > 0) {
    console.log('Files ready to commit:');
    staged.forEach(file => console.log(`  ${file}`));
    console.log('');
  }

  if (unstaged.length > 0) {
    console.log('Modified files:');
    unstaged.forEach(file => console.log(`  ${file}`));

    const stageAll = await question('\nAdd all files to commit? (y/n): ');
    if (stageAll.toLowerCase() === 'y' || stageAll.toLowerCase() === 'yes') {
      execSync('git add .');
      console.log('Files added\n');
      return true;
    } else {
      console.log('Use "git add <file>" to add specific files\n');
      return false;
    }
  } else if (staged.length === 0) {
    console.log('No files to commit. Make changes first.\n');
    return false;
  }

  return true;
}

async function main() {
  try {
    console.log('\nCreate a commit for Annotative\n');

    // Select commit type
    displayCommitTypes();
    const typeChoice = await question(`Choose type (1-${commitTypes.length}): `);
    const typeIndex = parseInt(typeChoice) - 1;

    if (typeIndex < 0 || typeIndex >= commitTypes.length) {
      console.log('Invalid choice. Try again.');
      process.exit(1);
    }

    const selectedType = commitTypes[typeIndex];

    // Select version bump
    displayVersionTypes();
    const versionChoice = await question(`Choose version bump (1-${versionTypes.length}): `);
    const versionIndex = parseInt(versionChoice) - 1;

    if (versionIndex < 0 || versionIndex >= versionTypes.length) {
      console.log('Invalid choice. Try again.');
      process.exit(1);
    }

    const selectedVersion = versionTypes[versionIndex];

    // Get title
    let title;
    while (true) {
      title = await question('Commit title: ');
      if (title.length === 0) {
        console.log('Title is required');
        continue;
      }
      if (title.length > 60) {
        console.log(`Keep it short (${title.length}/60 chars)`);
        continue;
      }
      break;
    }

    // Ask about description format
    const useMarkdown = await question('Use markdown for description? (y/n): ');
    let description = '';

    if (useMarkdown.toLowerCase() === 'y' || useMarkdown.toLowerCase() === 'yes') {
      const markdownContent = await openMarkdownEditor();
      if (markdownContent) {
        description = markdownContent;
      } else {
        description = await question('Description (optional): ');
      }
    } else {
      description = await question('Description (optional): ');
    }

    // Build commit message
    const breakingMarker = selectedVersion.type === 'major' ? '!' : '';
    let commitMessage = `${selectedType.type}${breakingMarker}: ${title}`;

    if (description) {
      commitMessage += `\n\n${description}`;
    }

    // Add version marker for CI
    if (selectedVersion.type !== 'none') {
      commitMessage += `\n\nVersion-Bump: ${selectedVersion.type}`;
    }

    // Preview
    console.log('\n--- Commit Preview ---');
    console.log(commitMessage);
    console.log('--- End Preview ---\n');

    showVersionImpact(selectedVersion.type);

    // Confirm
    const confirm = await question('Create this commit? (y/n): ');
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('Cancelled');
      process.exit(0);
    }

    // Stage files
    const hasFiles = await stageFiles();
    if (!hasFiles) {
      process.exit(1);
    }

    // Create commit
    console.log('Creating commit...');
    execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });

    console.log('\nDone! Commit created.');
    console.log('Push to main to trigger auto-release.');

  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };