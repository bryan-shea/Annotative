import * as assert from 'assert';
import { ReviewArtifactManager } from '../../managers';
import {
    clearTestWorkspace,
    createReviewAnnotation,
    getWorkspaceRoot,
    readReviewArtifactFixture,
} from './testUtils';

suite('ReviewArtifactManager', () => {
    setup(async () => {
        await clearTestWorkspace();
    });

    teardown(async () => {
        await clearTestWorkspace();
    });

    test('creates, saves, lists, and exports review artifacts through the manager', async () => {
        const aiResponseText = await readReviewArtifactFixture('ai-response-basic.md');
        const manager = new ReviewArtifactManager({
            clock: () => new Date('2026-04-04T10:15:00.000Z'),
            createId: () => 'ai-response-fixture',
        });

        const artifact = await manager.createAndSaveArtifact({
            kind: 'aiResponse',
            title: 'Review Payment Form Response',
            source: {
                type: 'manualPaste',
                workspaceFolder: getWorkspaceRoot(),
                metadata: { source: 'fixture' },
            },
            content: {
                rawText: aiResponseText,
            },
            annotations: [
                createReviewAnnotation({
                    id: 'response-risk',
                    kind: 'risk',
                    body: 'The recommendation to skip manager tests should be rejected in Phase 1.',
                    target: { type: 'artifact' },
                }),
            ],
        });

        const loaded = await manager.getArtifact(artifact.id);
        const listed = await manager.listArtifacts({ kind: 'aiResponse' });
        const exported = await manager.exportArtifact(artifact);

        assert.strictEqual(artifact.id, 'ai-response-fixture');
        assert.ok(loaded, 'Expected the review artifact to load after save.');
        assert.strictEqual(loaded?.kind, 'aiResponse');
        assert.strictEqual(listed.length, 1);
        assert.strictEqual(listed[0].id, artifact.id);
        assert.strictEqual(exported.adapterId, 'genericMarkdown');
        assert.ok(exported.content.includes('# Review Artifact: Review Payment Form Response'));
        assert.ok(exported.content.includes('Risky recommendation: skip manager tests for now'));
    });
});