import * as assert from 'assert';
import {
    GenericMarkdownReviewArtifactExportAdapter,
    ReviewArtifactExportService,
} from '../../managers';
import { createReviewAnnotation, createReviewArtifact } from './testUtils';

suite('ReviewArtifactExportService', () => {
    test('exports deterministic generic markdown for review artifacts', async () => {
        const artifact = createReviewArtifact({
            id: 'plan-export',
            title: 'Review Build Plan',
            createdAt: '2026-04-04T09:00:00.000Z',
            updatedAt: '2026-04-04T10:00:00.000Z',
            source: {
                type: 'markdownFile',
                uri: 'file:///workspace/review-plan.md',
                workspaceFolder: 'c:/workspace',
                metadata: { origin: 'fixture' },
            },
            content: {
                rawText: '# Review Build Plan',
                metadata: { sectionCount: 1 },
                sections: [
                    {
                        id: 'goal',
                        heading: 'Goal',
                        level: 2,
                        order: 1,
                        content: 'Ship the storage layer.',
                        lineStart: 3,
                        lineEnd: 4,
                    },
                ],
            },
            annotations: [
                createReviewAnnotation({
                    id: 'annotation-b',
                    target: { type: 'section', sectionId: 'goal' },
                    body: 'Confirm the migration fallback.',
                    severity: 'high',
                    createdAt: '2026-04-04T10:00:01.000Z',
                    updatedAt: '2026-04-04T10:00:01.000Z',
                    metadata: { owner: 'qa' },
                }),
            ],
        });
        const service = new ReviewArtifactExportService([
            new GenericMarkdownReviewArtifactExportAdapter(),
        ]);

        const exported = await service.exportArtifact(artifact);

        assert.strictEqual(exported.adapterId, 'genericMarkdown');
        assert.strictEqual(exported.language, 'markdown');
        assert.strictEqual(exported.fileExtension, 'md');
        assert.strictEqual(
            exported.content,
            [
                '# Review Artifact: Review Build Plan',
                '',
                '- Artifact ID: plan-export',
                '- Kind: plan',
                '- Version: 1',
                '- Created At: 2026-04-04T09:00:00.000Z',
                '- Updated At: 2026-04-04T10:00:00.000Z',
                '- Source Type: markdownFile',
                '- Source URI: file:///workspace/review-plan.md',
                '- Workspace Folder: c:/workspace',
                '',
                '### Source Metadata',
                '- origin: fixture',
                '',
                '### Content Metadata',
                '- sectionCount: 1',
                '',
                '## Sections',
                '',
                '### 1. Goal',
                '- Section ID: goal',
                '- Level: 2',
                '- Order: 1',
                '- Lines: 3-4',
                '',
                '```text',
                'Ship the storage layer.',
                '```',
                '',
                '',
                '## Raw Content',
                '',
                '```text',
                '# Review Build Plan',
                '```',
                '',
                '## Annotations',
                '',
                '### 1. requestChange [open]',
                '- Annotation ID: annotation-b',
                '- Target: section:goal',
                '- Created At: 2026-04-04T10:00:01.000Z',
                '- Updated At: 2026-04-04T10:00:01.000Z',
                '- Severity: high',
                '',
                '### Annotation Metadata',
                '- owner: qa',
                '',
                'Confirm the migration fallback.',
                '',
            ].join('\n')
        );
    });

    test('includes parsed plan blocks and block targets in exported markdown', async () => {
        const artifact = createReviewArtifact({
            id: 'plan-export-blocks',
            title: 'Review Blocked Plan',
            content: {
                rawText: '# Review Blocked Plan',
                metadata: { sectionCount: 1, blockCount: 1 },
                sections: [
                    {
                        id: 'steps',
                        heading: 'Steps',
                        level: 2,
                        order: 1,
                        content: '1. Add command wiring.',
                        lineStart: 3,
                        lineEnd: 4,
                    },
                ],
                blocks: [
                    {
                        id: 'steps-block-1',
                        sectionId: 'steps',
                        kind: 'list',
                        order: 1,
                        content: '1. Add command wiring.',
                        lineStart: 4,
                        lineEnd: 4,
                    },
                ],
            },
            annotations: [
                createReviewAnnotation({
                    id: 'annotation-block',
                    target: { type: 'block', blockId: 'steps-block-1' },
                    body: 'Split command wiring and panel activation into separate steps.',
                    metadata: { category: 'missing_step' },
                }),
            ],
        });
        const service = new ReviewArtifactExportService([
            new GenericMarkdownReviewArtifactExportAdapter(),
        ]);

        const exported = await service.exportArtifact(artifact);

        assert.ok(exported.content.includes('#### Blocks'));
        assert.ok(exported.content.includes('##### 1. list'));
        assert.ok(exported.content.includes('- Block ID: steps-block-1'));
        assert.ok(exported.content.includes('- Target: block:steps-block-1'));
        assert.ok(exported.content.includes('- category: missing_step'));
    });
});