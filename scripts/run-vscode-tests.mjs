import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { downloadAndUnzipVSCode } from '@vscode/test-electron';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, '..');
const compiledSuiteRoot = path.join(repoRoot, 'out', 'test', 'suite');
const workspaceFolder = path.join(repoRoot, 'src', 'test', 'fixtures', 'workspace');
const extensionTestsPath = path.join(repoRoot, 'node_modules', '@vscode', 'test-cli', 'out', 'runner.cjs');
const vscodeTestRoot = path.join(repoRoot, '.vscode-test');

const testFiles = await collectTestFiles(compiledSuiteRoot);
if (testFiles.length === 0) {
    throw new Error(`No compiled tests found under ${compiledSuiteRoot}`);
}

await fs.mkdir(vscodeTestRoot, { recursive: true });

const runDirectory = await fs.mkdtemp(path.join(vscodeTestRoot, 'run-'));
const userDataDirectory = path.join(runDirectory, 'user-data');
const extensionsDirectory = path.join(runDirectory, 'extensions');

await fs.mkdir(userDataDirectory, { recursive: true });
await fs.mkdir(extensionsDirectory, { recursive: true });

const vscodeExecutablePath = await downloadAndUnzipVSCode('stable');
const env = {
    ...process.env,
    VSCODE_TEST_OPTIONS: JSON.stringify({
        mochaOpts: {
            ui: 'tdd',
            timeout: 20000,
        },
        colorDefault: !!process.stdout.isTTY,
        preload: [],
        files: testFiles,
    }),
};

delete env.ELECTRON_RUN_AS_NODE;

const args = [
    workspaceFolder,
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--disable-updates',
    '--skip-welcome',
    '--skip-release-notes',
    '--disable-workspace-trust',
    `--user-data-dir=${userDataDirectory}`,
    `--extensions-dir=${extensionsDirectory}`,
    `--extensionTestsPath=${extensionTestsPath}`,
    `--extensionDevelopmentPath=${repoRoot}`,
];

try {
    const exitCode = await runTests(vscodeExecutablePath, args, env);
    process.exitCode = exitCode;
} finally {
    await fs.rm(runDirectory, { recursive: true, force: true });
}

async function collectTestFiles(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const entryPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            files.push(...await collectTestFiles(entryPath));
            continue;
        }

        if (entry.isFile() && entry.name.endsWith('.test.js')) {
            files.push(entryPath);
        }
    }

    return files.sort((left, right) => left.localeCompare(right));
}

function runTests(executablePath, args, env) {
    return new Promise((resolve, reject) => {
        const child = spawn(executablePath, args, {
            env,
            stdio: 'inherit',
        });

        child.once('error', reject);
        child.once('exit', (code, signal) => {
            if (signal) {
                reject(new Error(`VS Code tests terminated with signal ${signal}`));
                return;
            }

            resolve(code ?? 1);
        });
    });
}