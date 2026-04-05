import { execFile } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';
import * as vscode from 'vscode';
import {
    ReviewArtifact,
    ReviewArtifactDiffFile,
    ReviewArtifactDiffFileStatus,
    ReviewArtifactDiffHunk,
    ReviewArtifactDiffLine,
    ReviewArtifactMetadata,
    ReviewArtifactSource,
} from '../types';
import { getPreferredWorkspaceFolder } from '../utils/workspaceContext';
import { ReviewArtifactManager } from './reviewArtifactManager';

const execFileAsync = promisify(execFile);
const LOCAL_DIFF_PARSER_ID = 'gitUnifiedDiffV1';
const DEFAULT_CONTEXT_LINES = 3;

export interface CreateLocalDiffArtifactInput {
    rawDiff: string;
    title?: string;
    source: ReviewArtifactSource;
}

export interface ParsedLocalDiff {
    diffFiles: ReviewArtifactDiffFile[];
    metadata: ReviewArtifactMetadata;
}

export interface LocalDiffReviewServiceOptions {
    runGitCommand?: (cwd: string, args: string[]) => Promise<string>;
    resolveWorkspaceFolder?: () => vscode.WorkspaceFolder | undefined;
}

interface MutableDiffHunk {
    hunk: ReviewArtifactDiffHunk;
    nextOldLine: number;
    nextNewLine: number;
}

export class LocalDiffReviewService {
    private readonly runGitCommand: (cwd: string, args: string[]) => Promise<string>;
    private readonly resolveWorkspaceFolder: () => vscode.WorkspaceFolder | undefined;

    constructor(
        private readonly reviewArtifactManager: ReviewArtifactManager,
        options: LocalDiffReviewServiceOptions = {}
    ) {
        this.runGitCommand = options.runGitCommand ?? runGitCommand;
        this.resolveWorkspaceFolder = options.resolveWorkspaceFolder ?? getPreferredWorkspaceFolder;
    }

    async createArtifactFromWorkspaceDiff(workspaceFolder = this.resolveWorkspaceFolder()): Promise<ReviewArtifact> {
        if (!workspaceFolder) {
            throw new Error('Open a workspace folder before reviewing local changes.');
        }

        const repositoryRoot = (await this.runGitCommand(workspaceFolder.uri.fsPath, ['rev-parse', '--show-toplevel'])).trim();
        if (!repositoryRoot) {
            throw new Error('Unable to determine the git repository root for the current workspace.');
        }

        const revision = await this.getCurrentRevision(repositoryRoot);

        // MVP snapshot strategy: compare HEAD to the current tracked working tree so staged and unstaged
        // tracked changes land in one persisted artifact. Untracked files remain out of scope for Phase 5.
        const diffArgs = revision
            ? ['diff', '--no-ext-diff', '--minimal', `--unified=${DEFAULT_CONTEXT_LINES}`, 'HEAD', '--']
            : ['diff', '--no-ext-diff', '--minimal', `--unified=${DEFAULT_CONTEXT_LINES}`, '--'];
        const rawDiff = normalizeDiffText(await this.runGitCommand(repositoryRoot, diffArgs));

        if (rawDiff.length === 0) {
            throw new Error('No tracked local changes were found in the current workspace.');
        }

        return this.createArtifactFromDiff({
            rawDiff,
            source: {
                type: 'gitDiff',
                workspaceFolder: workspaceFolder.uri.fsPath,
                revision,
                metadata: {
                    contextLines: DEFAULT_CONTEXT_LINES,
                    includesStagedChanges: Boolean(revision),
                    includesUntrackedFiles: false,
                    parser: LOCAL_DIFF_PARSER_ID,
                    repositoryRoot,
                    snapshotMode: revision ? 'headToWorkingTreeTracked' : 'workingTreeTracked',
                    trackedFilesOnly: true,
                },
            },
        });
    }

    async createArtifactFromDiff(input: CreateLocalDiffArtifactInput): Promise<ReviewArtifact> {
        const normalizedDiff = normalizeDiffText(input.rawDiff);
        if (normalizedDiff.length === 0) {
            throw new Error('Local diff content cannot be empty.');
        }

        const parsed = parseUnifiedDiff(normalizedDiff);

        return this.reviewArtifactManager.createAndSaveArtifact({
            kind: 'localDiff',
            title: input.title?.trim() || deriveTitleFromSource(input.source),
            source: input.source,
            content: {
                rawText: normalizedDiff,
                diffFiles: parsed.diffFiles,
                metadata: parsed.metadata,
            },
        });
    }

    private async getCurrentRevision(repositoryRoot: string): Promise<string | undefined> {
        try {
            const revision = (await this.runGitCommand(repositoryRoot, ['rev-parse', '--verify', 'HEAD'])).trim();
            return revision || undefined;
        } catch {
            return undefined;
        }
    }
}

export function parseUnifiedDiff(rawDiff: string): ParsedLocalDiff {
    const normalizedDiff = normalizeDiffText(rawDiff);
    if (normalizedDiff.length === 0) {
        throw new Error('Local diff content cannot be empty.');
    }

    const lines = normalizedDiff.split('\n');
    const diffFiles: ReviewArtifactDiffFile[] = [];
    let currentFile: ReviewArtifactDiffFile | undefined;
    let currentHunk: MutableDiffHunk | undefined;

    const finalizeCurrentHunk = () => {
        if (!currentFile || !currentHunk) {
            return;
        }

        currentFile.hunks.push(currentHunk.hunk);
        currentHunk = undefined;
    };

    const finalizeCurrentFile = () => {
        finalizeCurrentHunk();
        if (!currentFile) {
            return;
        }

        currentFile.metadata = {
            addedLineCount: countDiffLines(currentFile.hunks, 'add'),
            deletedLineCount: countDiffLines(currentFile.hunks, 'delete'),
            hunkCount: currentFile.hunks.length,
        };
        diffFiles.push(currentFile);
        currentFile = undefined;
    };

    for (const line of lines) {
        if (line.startsWith('diff --git ')) {
            finalizeCurrentFile();
            const paths = parseDiffGitPaths(line);
            currentFile = {
                id: createDiffFileId(paths?.newPath ?? paths?.oldPath ?? `file-${diffFiles.length + 1}`),
                oldPath: paths?.oldPath ?? '',
                newPath: paths?.newPath ?? '',
                status: 'modified',
                hunks: [],
            };
            continue;
        }

        if (!currentFile) {
            continue;
        }

        if (line.startsWith('new file mode ')) {
            currentFile.status = 'added';
            continue;
        }

        if (line.startsWith('deleted file mode ')) {
            currentFile.status = 'deleted';
            continue;
        }

        if (line.startsWith('rename from ')) {
            currentFile.status = 'renamed';
            currentFile.oldPath = line.slice('rename from '.length).trim();
            continue;
        }

        if (line.startsWith('rename to ')) {
            currentFile.status = 'renamed';
            currentFile.newPath = line.slice('rename to '.length).trim();
            continue;
        }

        if (line.startsWith('copy from ')) {
            currentFile.status = 'copied';
            currentFile.oldPath = line.slice('copy from '.length).trim();
            continue;
        }

        if (line.startsWith('copy to ')) {
            currentFile.status = 'copied';
            currentFile.newPath = line.slice('copy to '.length).trim();
            continue;
        }

        if (line.startsWith('--- ')) {
            const oldPath = parseHeaderPath(line.slice(4));
            if (oldPath) {
                currentFile.oldPath = oldPath;
            }
            continue;
        }

        if (line.startsWith('+++ ')) {
            const newPath = parseHeaderPath(line.slice(4));
            if (newPath) {
                currentFile.newPath = newPath;
            }
            continue;
        }

        const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);
        if (hunkMatch) {
            finalizeCurrentHunk();
            const oldStart = Number.parseInt(hunkMatch[1], 10);
            const oldLines = Number.parseInt(hunkMatch[2] ?? '1', 10);
            const newStart = Number.parseInt(hunkMatch[3], 10);
            const newLines = Number.parseInt(hunkMatch[4] ?? '1', 10);
            const hunkIndex = currentFile.hunks.length + 1;

            currentHunk = {
                hunk: {
                    id: `${currentFile.id}-hunk-${hunkIndex}`,
                    header: `@@ -${oldStart},${oldLines} +${newStart},${newLines} @@${hunkMatch[5] ?? ''}`,
                    oldStart,
                    oldLines,
                    newStart,
                    newLines,
                    lines: [],
                },
                nextOldLine: oldStart,
                nextNewLine: newStart,
            };
            continue;
        }

        if (!currentHunk || line.startsWith('\\ No newline at end of file')) {
            continue;
        }

        const parsedLine = parseDiffLine(line, currentHunk);
        if (parsedLine) {
            currentHunk.hunk.lines.push(parsedLine);
        }
    }

    finalizeCurrentFile();

    const totalHunks = diffFiles.reduce((count, diffFile) => count + diffFile.hunks.length, 0);
    const addedLineCount = diffFiles.reduce(
        (count, diffFile) => count + countDiffLines(diffFile.hunks, 'add'),
        0
    );
    const deletedLineCount = diffFiles.reduce(
        (count, diffFile) => count + countDiffLines(diffFile.hunks, 'delete'),
        0
    );

    return {
        diffFiles,
        metadata: {
            addedLineCount,
            deletedLineCount,
            diffFileCount: diffFiles.length,
            hunkCount: totalHunks,
            parser: LOCAL_DIFF_PARSER_ID,
        },
    };
}

function deriveTitleFromSource(source: ReviewArtifactSource): string {
    const workspaceFolder = source.workspaceFolder ? path.basename(source.workspaceFolder) : undefined;
    return workspaceFolder ? `Review Local Diff: ${workspaceFolder}` : 'Review Local Diff';
}

async function runGitCommand(cwd: string, args: string[]): Promise<string> {
    const { stdout, stderr } = await execFileAsync('git', args, {
        cwd,
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true,
    });

    if (stderr && stderr.trim().length > 0) {
        return stdout;
    }

    return stdout;
}

function normalizeDiffText(value: string): string {
    return value.replace(/\r\n/g, '\n').trim();
}

function parseDiffGitPaths(line: string): { oldPath: string; newPath: string } | undefined {
    const match = line.match(/^diff --git a\/(.+) b\/(.+)$/);
    if (!match) {
        return undefined;
    }

    return {
        oldPath: match[1],
        newPath: match[2],
    };
}

function parseHeaderPath(value: string): string | undefined {
    const trimmed = value.trim().replace(/^"|"$/g, '');
    if (trimmed === '/dev/null') {
        return undefined;
    }

    if (trimmed.startsWith('a/')) {
        return trimmed.slice(2);
    }

    if (trimmed.startsWith('b/')) {
        return trimmed.slice(2);
    }

    return trimmed;
}

function createDiffFileId(filePath: string): string {
    const slug = filePath
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return slug ? `diff-file-${slug}` : 'diff-file';
}

function countDiffLines(hunks: ReviewArtifactDiffHunk[], type: ReviewArtifactDiffLine['type']): number {
    return hunks.reduce(
        (count, hunk) => count + hunk.lines.filter(line => line.type === type).length,
        0
    );
}

function parseDiffLine(line: string, currentHunk: MutableDiffHunk): ReviewArtifactDiffLine | undefined {
    const indicator = line[0];
    const content = line.slice(1);

    switch (indicator) {
        case '+': {
            const parsedLine: ReviewArtifactDiffLine = {
                type: 'add',
                content,
                newLineNumber: currentHunk.nextNewLine,
            };
            currentHunk.nextNewLine += 1;
            return parsedLine;
        }
        case '-': {
            const parsedLine: ReviewArtifactDiffLine = {
                type: 'delete',
                content,
                oldLineNumber: currentHunk.nextOldLine,
            };
            currentHunk.nextOldLine += 1;
            return parsedLine;
        }
        case ' ': {
            const parsedLine: ReviewArtifactDiffLine = {
                type: 'context',
                content,
                oldLineNumber: currentHunk.nextOldLine,
                newLineNumber: currentHunk.nextNewLine,
            };
            currentHunk.nextOldLine += 1;
            currentHunk.nextNewLine += 1;
            return parsedLine;
        }
        default:
            return undefined;
    }
}