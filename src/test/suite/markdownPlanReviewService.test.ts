import * as assert from 'assert';
import { MarkdownPlanReviewService, ReviewArtifactManager, parseMarkdownPlan } from '../../managers';
import {
    clearTestWorkspace,
    getWorkspaceRoot,
    readReviewArtifactFixture,
} from './testUtils';

suite('MarkdownPlanReviewService', () => {
    setup(async () => {
        await clearTestWorkspace();
    });

    teardown(async () => {
        await clearTestWorkspace();
    });

    test('parses markdown plans into deterministic sections and blocks', async () => {
        const planText = await readReviewArtifactFixture('plan-basic.md');

        const parsed = parseMarkdownPlan(planText);

        assert.strictEqual(parsed.title, 'API Migration Plan');
        assert.deepStrictEqual(
            parsed.sections.map(section => ({
                id: section.id,
                heading: section.heading,
                level: section.level,
                lineStart: section.lineStart,
                lineEnd: section.lineEnd,
                blockCount: section.metadata?.blockCount,
            })),
            [
                { id: 'goal', heading: 'Goal', level: 2, lineStart: 3, lineEnd: 5, blockCount: 1 },
                { id: 'steps', heading: 'Steps', level: 2, lineStart: 7, lineEnd: 11, blockCount: 1 },
                { id: 'risks', heading: 'Risks', level: 2, lineStart: 13, lineEnd: 16, blockCount: 1 },
                { id: 'open-questions', heading: 'Open Questions', level: 2, lineStart: 18, lineEnd: 21, blockCount: 1 },
                {
                    id: 'optional-implementation-detail',
                    heading: 'Optional Implementation Detail',
                    level: 2,
                    lineStart: 23,
                    lineEnd: 25,
                    blockCount: 1,
                },
            ]
        );
        assert.deepStrictEqual(
            parsed.blocks.map(block => ({
                id: block.id,
                sectionId: block.sectionId,
                kind: block.kind,
                lineStart: block.lineStart,
                lineEnd: block.lineEnd,
            })),
            [
                { id: 'goal-block-1', sectionId: 'goal', kind: 'paragraph', lineStart: 5, lineEnd: 5 },
                { id: 'steps-block-1', sectionId: 'steps', kind: 'list', lineStart: 9, lineEnd: 11 },
                { id: 'risks-block-1', sectionId: 'risks', kind: 'list', lineStart: 15, lineEnd: 16 },
                { id: 'open-questions-block-1', sectionId: 'open-questions', kind: 'list', lineStart: 20, lineEnd: 21 },
                {
                    id: 'optional-implementation-detail-block-1',
                    sectionId: 'optional-implementation-detail',
                    kind: 'paragraph',
                    lineStart: 25,
                    lineEnd: 25,
                },
            ]
        );
    });

    test('creates and saves plan review artifacts from markdown input', async () => {
        const planText = await readReviewArtifactFixture('plan-basic.md');
        const manager = new ReviewArtifactManager({
            clock: () => new Date('2026-04-05T08:30:00.000Z'),
            createId: () => 'plan-fixture-artifact',
        });
        const service = new MarkdownPlanReviewService(manager);

        const artifact = await service.createArtifactFromMarkdown({
            rawText: planText,
            source: {
                type: 'manualPaste',
                workspaceFolder: getWorkspaceRoot(),
                metadata: { sourceMode: 'clipboard' },
            },
        });

        const stored = await manager.getArtifact(artifact.id);

        assert.strictEqual(artifact.id, 'plan-fixture-artifact');
        assert.strictEqual(artifact.kind, 'plan');
        assert.strictEqual(artifact.title, 'API Migration Plan');
        assert.strictEqual(artifact.content.sections?.length, 5);
        assert.strictEqual(artifact.content.blocks?.length, 5);
        assert.strictEqual(artifact.content.metadata?.parser, 'markdownPlanV1');
        assert.ok(stored, 'Expected the saved plan review artifact to be reloadable.');
        assert.strictEqual(stored?.content.blocks?.[1].kind, 'list');
    });
});