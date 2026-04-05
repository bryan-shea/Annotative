import * as assert from 'assert';
import { AiResponseReviewService, ReviewArtifactManager } from '../../managers';
import {
    clearTestWorkspace,
    getWorkspaceRoot,
    readReviewArtifactFixture,
} from './testUtils';

suite('AiResponseReviewService', () => {
    setup(async () => {
        await clearTestWorkspace();
    });

    teardown(async () => {
        await clearTestWorkspace();
    });

    test('creates and saves AI response review artifacts from pasted text', async () => {
        const aiResponseText = await readReviewArtifactFixture('ai-response-basic.md');
        const manager = new ReviewArtifactManager({
            clock: () => new Date('2026-04-05T09:45:00.000Z'),
            createId: () => 'ai-response-service-fixture',
        });
        const service = new AiResponseReviewService(manager);

        const artifact = await service.createArtifactFromResponse({
            rawText: aiResponseText,
            title: 'Review Storage Refactor Response',
            source: service.createManualPasteSource({
                sourceMode: 'clipboard',
            }),
        });

        const stored = await manager.getArtifact(artifact.id);

        assert.strictEqual(artifact.id, 'ai-response-service-fixture');
        assert.strictEqual(artifact.kind, 'aiResponse');
        assert.strictEqual(artifact.title, 'Review Storage Refactor Response');
        assert.strictEqual(artifact.content.sections?.length, 1);
        assert.strictEqual(artifact.content.blocks?.length, 4);
        assert.strictEqual(artifact.content.metadata?.parser, 'aiResponseMarkdownV1');
        assert.strictEqual(artifact.source.type, 'manualPaste');
        assert.strictEqual(artifact.source.metadata?.sourceMode, 'clipboard');
        assert.ok(stored, 'Expected the saved AI response review artifact to be reloadable.');
        assert.strictEqual(stored?.content.blocks?.[1].kind, 'list');
        assert.strictEqual(stored?.source.workspaceFolder, getWorkspaceRoot());
    });
});