import * as assert from 'assert';
import * as vscode from 'vscode';
import { LocalDiffReviewService, ReviewArtifactManager, parseUnifiedDiff } from '../../managers';
import {
    clearTestWorkspace,
    getWorkspaceRoot,
    readReviewArtifactFixture,
} from './testUtils';

suite('LocalDiffReviewService', () => {
    setup(async () => {
        await clearTestWorkspace();
    });

    teardown(async () => {
        await clearTestWorkspace();
    });

    test('parses unified git diffs into deterministic file and hunk targets', async () => {
        const rawDiff = await readReviewArtifactFixture('local-diff-basic.diff');

        const parsed = parseUnifiedDiff(rawDiff);

        assert.deepStrictEqual(
            parsed.diffFiles.map(diffFile => ({
                id: diffFile.id,
                oldPath: diffFile.oldPath,
                newPath: diffFile.newPath,
                status: diffFile.status,
                hunkIds: diffFile.hunks.map(hunk => hunk.id),
            })),
            [
                {
                    id: 'diff-file-src-managers-reviewartifactmanager-ts',
                    oldPath: 'src/managers/reviewArtifactManager.ts',
                    newPath: 'src/managers/reviewArtifactManager.ts',
                    status: 'modified',
                    hunkIds: ['diff-file-src-managers-reviewartifactmanager-ts-hunk-1'],
                },
                {
                    id: 'diff-file-src-test-suite-reviewartifactexport-test-ts',
                    oldPath: 'src/test/suite/reviewArtifactExport.test.ts',
                    newPath: 'src/test/suite/reviewArtifactExport.test.ts',
                    status: 'added',
                    hunkIds: ['diff-file-src-test-suite-reviewartifactexport-test-ts-hunk-1'],
                },
            ]
        );
        assert.strictEqual(parsed.diffFiles[0].hunks[0].oldStart, 18);
        assert.strictEqual(parsed.diffFiles[0].hunks[0].newStart, 18);
        assert.strictEqual(parsed.diffFiles[1].hunks[0].oldStart, 0);
        assert.strictEqual(parsed.metadata.diffFileCount, 2);
        assert.strictEqual(parsed.metadata.hunkCount, 2);
        assert.strictEqual(parsed.metadata.addedLineCount, 11);
        assert.strictEqual(parsed.metadata.deletedLineCount, 0);
    });

    test('creates and saves local diff review artifacts from the workspace git snapshot flow', async () => {
        const rawDiff = await readReviewArtifactFixture('local-diff-basic.diff');
        const gitCalls: Array<{ cwd: string; args: string[] }> = [];
        const manager = new ReviewArtifactManager({
            clock: () => new Date('2026-04-05T15:30:00.000Z'),
            createId: () => 'local-diff-fixture',
        });
        const service = new LocalDiffReviewService(manager, {
            runGitCommand: async (cwd, args) => {
                gitCalls.push({ cwd, args });

                if (args[0] === 'rev-parse' && args[1] === '--show-toplevel') {
                    return `${getWorkspaceRoot()}\n`;
                }

                if (args[0] === 'rev-parse' && args[1] === '--verify') {
                    return 'abc123def456\n';
                }

                if (args[0] === 'diff') {
                    return rawDiff;
                }

                throw new Error(`Unexpected git args: ${args.join(' ')}`);
            },
        });

        const artifact = await service.createArtifactFromWorkspaceDiff({
            uri: vscode.Uri.file(getWorkspaceRoot()),
            index: 0,
            name: 'workspace',
        });
        const stored = await manager.getArtifact(artifact.id);

        assert.strictEqual(artifact.id, 'local-diff-fixture');
        assert.strictEqual(artifact.kind, 'localDiff');
        assert.strictEqual(artifact.source.type, 'gitDiff');
        assert.strictEqual(artifact.source.revision, 'abc123def456');
        assert.strictEqual(artifact.source.metadata?.snapshotMode, 'headToWorkingTreeTracked');
        assert.strictEqual(artifact.source.metadata?.trackedFilesOnly, true);
        assert.strictEqual(artifact.content.diffFiles?.length, 2);
        assert.ok(stored, 'Expected the saved local diff artifact to be reloadable.');
        assert.deepStrictEqual(
            gitCalls.map(call => ({ cwd: call.cwd, args: call.args })),
            [
                { cwd: getWorkspaceRoot(), args: ['rev-parse', '--show-toplevel'] },
                { cwd: getWorkspaceRoot(), args: ['rev-parse', '--verify', 'HEAD'] },
                { cwd: getWorkspaceRoot(), args: ['diff', '--no-ext-diff', '--minimal', '--unified=3', 'HEAD', '--'] },
            ]
        );
    });
});