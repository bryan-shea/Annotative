#!/usr/bin/env node

/**
 * Simple Changeset CLI for Annotative
 * Interactive tool to create conventional commits
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
  { type: 'chore', description: 'Maintenance/dependencies' }
];

function displayCommitTypes() {
  console.log('\nWhat type of change is this?\n');

  commitTypes.forEach((item, index) => {
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

function showVersionImpact(commitType) {
  const currentVersion = getCurrentVersion();
  const [major, minor, patch] = currentVersion.split('.').map(Number);

  let newVersion = currentVersion;
  let changeType = 'No change';

  if (commitType === 'feat') {
    newVersion = `${major}.${minor + 1}.0`;
    changeType = 'MINOR';
  } else if (commitType === 'fix') {
    newVersion = `${major}.${minor}.${patch + 1}`;
    changeType = 'PATCH';
  }

  if (currentVersion === newVersion) {
    console.log(`Version: No change (${currentVersion})\n`);
  } else {
    console.log(`Version: ${changeType} (${currentVersion} → ${newVersion})\n`);
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
    const typeChoice = await question(`Choose (1-${commitTypes.length}): `);
    const typeIndex = parseInt(typeChoice) - 1;

    if (typeIndex < 0 || typeIndex >= commitTypes.length) {
      console.log('Invalid choice. Try again.');
      process.exit(1);
    }

    const selectedType = commitTypes[typeIndex];

    // Get description of what they did
    let description;
    while (true) {
      description = await question('What did you do? ');
      if (description.length === 0) {
        console.log('Please describe what you changed');
        continue;
      }
      if (description.length > 60) {
        console.log(`Keep it short (${description.length}/60 chars)`);
        continue;
      }
      break;
    }

    // Build commit message
    const commitMessage = `${selectedType.type}: ${description}`;

    // Preview
    console.log(`\nCommit: ${commitMessage}`);
    showVersionImpact(selectedType.type);

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