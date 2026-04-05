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

    test('adds, updates, removes, and records plan review annotations', async () => {
        const planText = await readReviewArtifactFixture('plan-basic.md');
        const manager = new ReviewArtifactManager({
            clock: () => new Date('2026-04-05T11:45:00.000Z'),
            createId: () => 'plan-manager-fixture',
        });

        await manager.createAndSaveArtifact({
            kind: 'plan',
            title: 'Review Plan Manager Flow',
            source: {
                type: 'manualPaste',
                workspaceFolder: getWorkspaceRoot(),
            },
            content: {
                rawText: planText,
            },
        });

        await manager.addAnnotation('plan-manager-fixture', {
            kind: 'requestChange',
            target: { type: 'section', sectionId: 'goal' },
            body: 'Clarify the migration safety constraints.',
            metadata: { category: 'request_change' },
        });
        await manager.updateAnnotation('plan-manager-fixture', 'requestChange-section-goal-20260405114500000', {
            body: 'Clarify the migration safety constraints before coding.',
        });
        await manager.recordExport('plan-manager-fixture', {
            adapterId: 'genericMarkdown',
            target: 'clipboard',
        });
        await manager.removeAnnotation('plan-manager-fixture', 'requestChange-section-goal-20260405114500000');

        const stored = await manager.getArtifact('plan-manager-fixture');

        assert.ok(stored, 'Expected the saved artifact to be reloadable.');
        assert.strictEqual(stored?.annotations.length, 0);
        assert.strictEqual(stored?.exportState?.lastExportedAt, '2026-04-05T11:45:00.000Z');
        assert.strictEqual(stored?.exportState?.exports?.length, 1);
    });
});