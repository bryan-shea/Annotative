#!/usr/bin/env node
/**
 * Extension Compliance Checker for Annotative
 *
 * Validates that the extension follows all rules from .vscode-agent.md:
 * - package.json structure and required fields
 * - No Node.js APIs in webview code (media/)
 * - TypeScript strict mode enabled
 * - No 'any' types in source code
 * - Proper CSP headers in webview HTML
 * - No console.log in production code
 *
 * Usage:
 *   node scripts/check-extension-compliance.js [--verbose] [--fix]
 *
 * Exit codes:
 *   0 - All checks passed
 *   1 - One or more checks failed
 */

const fs = require('fs');
const path = require('path');

// Configuration
const VERBOSE = process.argv.includes('--verbose');
const FIX_MODE = process.argv.includes('--fix');
const ROOT_DIR = path.resolve(__dirname, '..');

// Colors for terminal output
const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

// Track all errors
let totalErrors = 0;
let totalWarnings = 0;

/**
 * Log utility functions
 */
function log(message, color = '') {
  console.log(`${color}${message}${RESET}`);
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, CYAN);
  log(`  ${title}`, CYAN);
  log('='.repeat(60), CYAN);
}

function logError(message) {
  totalErrors++;
  log(`  ❌ ERROR: ${message}`, RED);
}

function logWarning(message) {
  totalWarnings++;
  log(`  ⚠️  WARNING: ${message}`, YELLOW);
}

function logSuccess(message) {
  log(`  ✅ ${message}`, GREEN);
}

function logVerbose(message) {
  if (VERBOSE) {
    log(`     ${message}`);
  }
}

/**
 * Check 1: Validate package.json
 */
function checkPackageJson() {
  logSection('Checking package.json');

  const packagePath = path.join(ROOT_DIR, 'package.json');

  if (!fs.existsSync(packagePath)) {
    logError('package.json not found');
    return;
  }

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  } catch (error) {
    logError(`Failed to parse package.json: ${error.message}`);
    return;
  }

  // Check required fields
  const requiredFields = ['name', 'displayName', 'version', 'publisher', 'engines', 'main'];
  requiredFields.forEach(field => {
    if (!pkg[field]) {
      logError(`Missing required field: ${field}`);
    } else {
      logVerbose(`Found required field: ${field}`);
    }
  });

  // Check engines.vscode
  if (!pkg.engines || !pkg.engines.vscode) {
    logError('Missing engines.vscode field');
  } else {
    logVerbose(`VS Code engine version: ${pkg.engines.vscode}`);
    logSuccess('engines.vscode is defined');
  }

  // Check activation events (should not use *)
  if (pkg.activationEvents) {
    if (pkg.activationEvents.includes('*')) {
      logError('Using * activation event (too broad, activates on every VS Code start)');
    } else if (pkg.activationEvents.length === 0) {
      logVerbose('Using automatic activation based on contributes');
    } else {
      logVerbose(`Activation events: ${pkg.activationEvents.join(', ')}`);
    }
    logSuccess('Activation events are properly configured');
  } else {
    logVerbose('No explicit activation events (using automatic activation)');
  }

  // Check contributes section
  if (!pkg.contributes) {
    logWarning('No contributes section found (extension may not provide any features)');
  } else {
    // Validate commands
    if (pkg.contributes.commands) {
      let validCommands = 0;
      pkg.contributes.commands.forEach((cmd, index) => {
        if (!cmd.command) {
          logError(`Command at index ${index} missing 'command' field`);
        } else if (!cmd.title) {
          logError(`Command '${cmd.command}' missing 'title' field`);
        } else {
          validCommands++;
          logVerbose(`Command: ${cmd.command}`);
        }
      });
      logSuccess(`${validCommands} valid commands registered`);
    }

    // Check views (if any)
    if (pkg.contributes.views) {
      Object.keys(pkg.contributes.views).forEach(container => {
        const views = pkg.contributes.views[container];
        logVerbose(`View container '${container}' has ${views.length} views`);
      });
      logSuccess('Views are properly configured');
    }

    // Check menus (if any)
    if (pkg.contributes.menus) {
      const menuTypes = Object.keys(pkg.contributes.menus);
      logVerbose(`Menu contributions: ${menuTypes.join(', ')}`);
      logSuccess('Menus are properly configured');
    }
  }

  // Check main entry point exists
  if (pkg.main) {
    const mainPath = path.join(ROOT_DIR, pkg.main);
    if (!fs.existsSync(mainPath)) {
      logError(`Main entry point not found: ${pkg.main}`);
    } else {
      logSuccess(`Main entry point exists: ${pkg.main}`);
    }
  }
}

/**
 * Check 2: Validate webview safety (no Node.js in media/)
 */
function checkWebviewSafety() {
  logSection('Checking Webview Safety (media/)');

  const mediaDir = path.join(ROOT_DIR, 'media');

  if (!fs.existsSync(mediaDir)) {
    logVerbose('media/ directory not found (no webview assets)');
    return;
  }

  const jsFiles = fs.readdirSync(mediaDir)
    .filter(f => f.endsWith('.js'))
    .map(f => path.join(mediaDir, f));

  if (jsFiles.length === 0) {
    logVerbose('No JavaScript files in media/');
    return;
  }

  logVerbose(`Checking ${jsFiles.length} JavaScript files`);

  let safeFiles = 0;

  jsFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const filename = path.basename(file);
    let fileSafe = true;

    // Check for require() calls
    if (/\brequire\s*\(/.test(content)) {
      logError(`${filename}: Uses require() (forbidden in webview - no Node.js runtime)`);
      fileSafe = false;
    }

    // Check for ES6 imports with from keyword
    if (/\bimport\s+.*\s+from\s+['"]/.test(content)) {
      logWarning(`${filename}: Uses ES6 imports (may not work without bundling)`);
    }

    // Check for process global
    if (/\bprocess\.\w+/.test(content)) {
      logError(`${filename}: Accesses 'process' global (undefined in webview)`);
      fileSafe = false;
    }

    // Check for __dirname or __filename
    if (/__dirname/.test(content) || /__filename/.test(content)) {
      logError(`${filename}: Uses Node.js globals (__dirname/__filename) - undefined in webview`);
      fileSafe = false;
    }

    // Check for fs module usage
    if (/\bfs\.\w+/.test(content) || /require\s*\(\s*['"]fs['"]\s*\)/.test(content)) {
      logError(`${filename}: Attempts to use 'fs' module (forbidden in webview)`);
      fileSafe = false;
    }

    // Check for path module usage
    if (/\bpath\.\w+/.test(content) || /require\s*\(\s*['"]path['"]\s*\)/.test(content)) {
      logError(`${filename}: Attempts to use 'path' module (forbidden in webview)`);
      fileSafe = false;
    }

    // Check for eval or Function constructor (CSP violations)
    if (/\beval\s*\(/.test(content)) {
      logError(`${filename}: Uses eval() (violates Content Security Policy)`);
      fileSafe = false;
    }
    if (/new\s+Function\s*\(/.test(content)) {
      logError(`${filename}: Uses Function constructor (violates Content Security Policy)`);
      fileSafe = false;
    }

    if (fileSafe) {
      safeFiles++;
      logVerbose(`${filename}: ✓ Safe`);
    }
  });

  if (safeFiles === jsFiles.length) {
    logSuccess(`All ${jsFiles.length} webview JavaScript files are browser-safe`);
  } else {
    logError(`${jsFiles.length - safeFiles} of ${jsFiles.length} files have webview safety issues`);
  }
}

/**
 * Check 3: Validate TypeScript configuration
 */
function checkTypeScriptConfig() {
  logSection('Checking TypeScript Configuration');

  const tsconfigPath = path.join(ROOT_DIR, 'tsconfig.json');

  if (!fs.existsSync(tsconfigPath)) {
    logError('tsconfig.json not found');
    return;
  }

  let tsconfig;
  try {
    // Read and strip comments (JSON5-style)
    const content = fs.readFileSync(tsconfigPath, 'utf8')
      .replace(/\/\/.*/g, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments
    tsconfig = JSON.parse(content);
  } catch (error) {
    logError(`Failed to parse tsconfig.json: ${error.message}`);
    return;
  }

  if (!tsconfig.compilerOptions) {
    logError('Missing compilerOptions in tsconfig.json');
    return;
  }

  // Check strict mode
  if (!tsconfig.compilerOptions.strict) {
    if (FIX_MODE) {
      logWarning('TypeScript strict mode is disabled - attempting to fix');
      tsconfig.compilerOptions.strict = true;
      fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
      logSuccess('✓ Fixed: Enabled strict mode in tsconfig.json');
    } else {
      logError('TypeScript strict mode is not enabled (use --fix to enable)');
    }
  } else {
    logSuccess('TypeScript strict mode is enabled');
  }

  // Check source map generation
  if (tsconfig.compilerOptions.sourceMap !== true) {
    logWarning('Source maps are not enabled (debugging will be harder)');
  } else {
    logVerbose('Source maps enabled');
  }

  // Check target
  if (tsconfig.compilerOptions.target) {
    logVerbose(`Target: ${tsconfig.compilerOptions.target}`);
  }

  // Check module
  if (tsconfig.compilerOptions.module) {
    logVerbose(`Module: ${tsconfig.compilerOptions.module}`);
  }
}

/**
 * Check 4: Scan for 'any' types in source code
 */
function checkForAnyTypes() {
  logSection('Checking for \'any\' Types');

  const srcDir = path.join(ROOT_DIR, 'src');

  if (!fs.existsSync(srcDir)) {
    logWarning('src/ directory not found');
    return;
  }

  const tsFiles = getAllTypeScriptFiles(srcDir);
  logVerbose(`Scanning ${tsFiles.length} TypeScript files`);

  let filesWithAny = 0;
  let anyCount = 0;

  tsFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(ROOT_DIR, file);

    // Match 'any' type annotations (not in comments or strings)
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
        return;
      }

      // Match ': any' or '<any>' or 'any[]' or '(any)'
      const anyPattern = /:\s*any\b|<any>|\bany\[\]|\(\s*any\s*\)/g;
      const matches = line.match(anyPattern);

      if (matches) {
        filesWithAny++;
        anyCount += matches.length;
        logWarning(`${relativePath}:${index + 1} - Found 'any' type`);
        logVerbose(`    ${line.trim()}`);
      }
    });
  });

  if (anyCount === 0) {
    logSuccess('No \'any\' types found in source code');
  } else {
    logError(`Found ${anyCount} uses of 'any' type in ${filesWithAny} files`);
    log('     Use specific types or \'unknown\' with type guards instead', YELLOW);
  }
}

/**
 * Check 5: Scan for console.log in production code
 */
function checkForConsoleLogs() {
  logSection('Checking for console.log Statements');

  const srcDir = path.join(ROOT_DIR, 'src');
  const mediaDir = path.join(ROOT_DIR, 'media');

  const allDirs = [srcDir, mediaDir].filter(d => fs.existsSync(d));
  const allFiles = allDirs.flatMap(d => getAllJavaScriptFiles(d));

  logVerbose(`Scanning ${allFiles.length} files`);

  let filesWithConsole = 0;
  let consoleCount = 0;

  allFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(ROOT_DIR, file);

    const lines = content.split('\n');
    lines.forEach((line, index) => {
      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
        return;
      }

      // Match console.log, console.warn, etc.
      if (/\bconsole\.(log|warn|info|debug)\s*\(/.test(line)) {
        filesWithConsole++;
        consoleCount++;
        logWarning(`${relativePath}:${index + 1} - Found console statement`);
        logVerbose(`    ${line.trim()}`);
      }
    });
  });

  if (consoleCount === 0) {
    logSuccess('No console.log statements found');
  } else {
    logWarning(`Found ${consoleCount} console statements in ${filesWithConsole} files`);
    log('     Consider using a logging utility or removing debug logs', YELLOW);
  }
}

/**
 * Check 6: Validate webview HTML for CSP
 */
function checkWebviewCSP() {
  logSection('Checking Webview Content Security Policy');

  const srcUiDir = path.join(ROOT_DIR, 'src', 'ui');

  if (!fs.existsSync(srcUiDir)) {
    logVerbose('src/ui/ directory not found');
    return;
  }

  const tsFiles = getAllTypeScriptFiles(srcUiDir);
  let foundCSP = false;
  let hasUnsafeInline = false;
  let hasUnsafeEval = false;

  tsFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(ROOT_DIR, file);

    // Look for CSP meta tags in HTML strings
    if (/Content-Security-Policy/.test(content)) {
      foundCSP = true;
      logVerbose(`${relativePath}: Found CSP configuration`);

      // Check for unsafe directives
      if (/unsafe-inline/.test(content)) {
        hasUnsafeInline = true;
        logError(`${relativePath}: Uses 'unsafe-inline' in CSP (security risk)`);
      }
      if (/unsafe-eval/.test(content)) {
        hasUnsafeEval = true;
        logError(`${relativePath}: Uses 'unsafe-eval' in CSP (security risk)`);
      }

      // Check for nonce usage (recommended)
      if (/nonce/.test(content)) {
        logSuccess('CSP uses nonce for inline scripts (secure)');
      }
    }
  });

  if (foundCSP) {
    if (!hasUnsafeInline && !hasUnsafeEval) {
      logSuccess('Content Security Policy is properly configured');
    }
  } else {
    logWarning('No Content Security Policy found in webview code');
    log('     CSP helps protect against XSS attacks', YELLOW);
  }
}

/**
 * Utility: Get all TypeScript files recursively
 */
function getAllTypeScriptFiles(dir) {
  const files = [];

  function walk(directory) {
    const items = fs.readdirSync(directory);

    items.forEach(item => {
      const fullPath = path.join(directory, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip node_modules, dist, etc.
        if (!['node_modules', 'dist', '.vscode-test', '.git'].includes(item)) {
          walk(fullPath);
        }
      } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    });
  }

  walk(dir);
  return files;
}

/**
 * Utility: Get all JavaScript/TypeScript files recursively
 */
function getAllJavaScriptFiles(dir) {
  const files = [];

  function walk(directory) {
    const items = fs.readdirSync(directory);

    items.forEach(item => {
      const fullPath = path.join(directory, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!['node_modules', 'dist', '.vscode-test', '.git'].includes(item)) {
          walk(fullPath);
        }
      } else if (item.endsWith('.js') || (item.endsWith('.ts') && !item.endsWith('.d.ts'))) {
        files.push(fullPath);
      }
    });
  }

  walk(dir);
  return files;
}

/**
 * Main execution
 */
function main() {
  log('\n🔍 Annotative Extension Compliance Checker', CYAN);
  log(`   Root: ${ROOT_DIR}`, CYAN);
  log(`   Mode: ${FIX_MODE ? 'FIX' : 'CHECK'}`, CYAN);

  // Run all checks
  checkPackageJson();
  checkWebviewSafety();
  checkTypeScriptConfig();
  checkForAnyTypes();
  checkForConsoleLogs();
  checkWebviewCSP();

  // Summary
  logSection('Summary');

  if (totalErrors === 0 && totalWarnings === 0) {
    log('  ✅ All compliance checks passed!', GREEN);
    log('  🎉 Extension follows all best practices', GREEN);
    process.exit(0);
  } else {
    if (totalErrors > 0) {
      log(`  ❌ ${totalErrors} error(s) found`, RED);
    }
    if (totalWarnings > 0) {
      log(`  ⚠️  ${totalWarnings} warning(s) found`, YELLOW);
    }

    if (totalErrors > 0) {
      log('\n  Please fix the errors before packaging or publishing', RED);
      process.exit(1);
    } else {
      log('\n  Warnings do not block packaging but should be addressed', YELLOW);
      process.exit(0);
    }
  }
}

// Run the checker
main();
