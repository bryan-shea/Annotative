import * as assert from 'assert';
import {
    CopilotReviewPromptReviewArtifactExportAdapter,
    GenericMarkdownReviewArtifactExportAdapter,
    parseUnifiedDiff,
    parseMarkdownPlan,
    parseStructuredMarkdownContent,
    ReviewArtifactExportService,
} from '../../managers';
import { createReviewAnnotation, createReviewArtifact, readReviewArtifactFixture } from './testUtils';

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

    test('exports deterministic copilot review prompts for review artifacts', async () => {
        const planText = await readReviewArtifactFixture('plan-basic.md');
        const parsed = parseMarkdownPlan(planText);
        const artifact = createReviewArtifact({
            id: 'copilot-export',
            title: 'API Migration Plan',
            createdAt: '2026-04-04T09:00:00.000Z',
            updatedAt: '2026-04-04T10:00:00.000Z',
            source: {
                type: 'markdownFile',
                uri: 'file:///workspace/docs/plan-basic.md',
                workspaceFolder: 'c:/workspace',
                metadata: { origin: 'fixture', sourceMode: 'currentFile' },
            },
            content: {
                rawText: planText,
                sections: parsed.sections,
                blocks: parsed.blocks,
                metadata: parsed.metadata,
            },
            annotations: [
                createReviewAnnotation({
                    id: 'change-goal',
                    kind: 'requestChange',
                    target: { type: 'section', sectionId: 'goal' },
                    body: 'State the compatibility guardrails explicitly.',
                    severity: 'high',
                    createdAt: '2026-04-04T10:00:01.000Z',
                    updatedAt: '2026-04-04T10:00:01.000Z',
                    metadata: { category: 'request_change' },
                }),
                createReviewAnnotation({
                    id: 'missing-step',
                    kind: 'issue',
                    target: { type: 'block', blockId: 'steps-block-1' },
                    body: 'Add a validation step after wiring the adapter registry.',
                    createdAt: '2026-04-04T10:00:02.000Z',
                    updatedAt: '2026-04-04T10:00:02.000Z',
                    metadata: { category: 'missing_step' },
                }),
                createReviewAnnotation({
                    id: 'risk-selection',
                    kind: 'risk',
                    target: { type: 'section', sectionId: 'risks' },
                    body: 'Keep the export selection flow backward-compatible for existing plan review users.',
                    severity: 'medium',
                    createdAt: '2026-04-04T10:00:03.000Z',
                    updatedAt: '2026-04-04T10:00:03.000Z',
                }),
                createReviewAnnotation({
                    id: 'question-history',
                    kind: 'question',
                    target: { type: 'section', sectionId: 'open-questions' },
                    body: 'Should export history keep the adapter label as metadata for later audit views?',
                    createdAt: '2026-04-04T10:00:04.000Z',
                    updatedAt: '2026-04-04T10:00:04.000Z',
                }),
                createReviewAnnotation({
                    id: 'note-follow-up',
                    kind: 'comment',
                    target: { type: 'artifact' },
                    body: 'Keep the artifact export text concise enough to paste into an agent workflow.',
                    createdAt: '2026-04-04T10:00:05.000Z',
                    updatedAt: '2026-04-04T10:00:05.000Z',
                    metadata: { category: 'global_comment' },
                }),
                createReviewAnnotation({
                    id: 'resolved-note',
                    kind: 'comment',
                    status: 'resolved',
                    target: { type: 'artifact' },
                    body: 'Resolved naming drift between plan review and review artifact export.',
                    createdAt: '2026-04-04T10:00:06.000Z',
                    updatedAt: '2026-04-04T10:00:07.000Z',
                }),
            ],
        });
        const service = new ReviewArtifactExportService([
            new GenericMarkdownReviewArtifactExportAdapter(),
            new CopilotReviewPromptReviewArtifactExportAdapter(),
        ]);

        assert.deepStrictEqual(
            service.getSupportedAdapters(artifact).map(adapter => adapter.id),
            ['genericMarkdown', 'copilotReviewPrompt']
        );

        const exported = await service.exportArtifact(artifact, 'copilotReviewPrompt');

        assert.strictEqual(exported.adapterId, 'copilotReviewPrompt');
        assert.strictEqual(exported.language, 'markdown');
        assert.strictEqual(exported.fileExtension, 'md');
        assert.strictEqual(
            exported.content,
            [
                '# Copilot Review Prompt: API Migration Plan',
                '',
                'Use this review context to revise the artifact or implementation before continuing.',
                '',
                '## Artifact Summary',
                '',
                '- Artifact ID: copilot-export',
                '- Kind: plan',
                '- Source Type: markdownFile',
                '- Source URI: file:///workspace/docs/plan-basic.md',
                '- Workspace Folder: c:/workspace',
                '- Open Annotations: 5',
                '- Resolved Annotations: 1',
                '',
                '### Source Metadata',
                '- origin: fixture',
                '- sourceMode: currentFile',
                '',
                '### Content Metadata',
                '- blockCount: 5',
                '- parser: markdownPlanV1',
                '- sectionCount: 5',
                '',
                '## Review Context',
                '',
                '### Sections Under Review',
                '',
                '- Goal (lines 3-5)',
                '- Steps (lines 7-11)',
                '- Risks (lines 13-16)',
                '- Open Questions (lines 18-21)',
                '- Optional Implementation Detail (lines 23-25)',
                '',
                '## Requested Changes',
                '',
                '### 1. Request Change [high]',
                '- Target: section:goal',
                '- Annotation ID: change-goal',
                '- Created At: 2026-04-04T10:00:01.000Z',
                '- Updated At: 2026-04-04T10:00:01.000Z',
                '',
                'State the compatibility guardrails explicitly.',
                '',
                'Metadata:',
                '- category: request_change',
                '',
                '',
                '## Missing Steps',
                '',
                '### 1. Missing Step',
                '- Target: block:steps-block-1',
                '- Annotation ID: missing-step',
                '- Created At: 2026-04-04T10:00:02.000Z',
                '- Updated At: 2026-04-04T10:00:02.000Z',
                '',
                'Add a validation step after wiring the adapter registry.',
                '',
                'Metadata:',
                '- category: missing_step',
                '',
                '',
                '## Risks Or Concerns',
                '',
                '### 1. Risk [medium]',
                '- Target: section:risks',
                '- Annotation ID: risk-selection',
                '- Created At: 2026-04-04T10:00:03.000Z',
                '- Updated At: 2026-04-04T10:00:03.000Z',
                '',
                'Keep the export selection flow backward-compatible for existing plan review users.',
                '',
                '',
                '## Open Questions',
                '',
                '### 1. Open Question',
                '- Target: section:open-questions',
                '- Annotation ID: question-history',
                '- Created At: 2026-04-04T10:00:04.000Z',
                '- Updated At: 2026-04-04T10:00:04.000Z',
                '',
                'Should export history keep the adapter label as metadata for later audit views?',
                '',
                '',
                '## Additional Notes',
                '',
                '### 1. Comment',
                '- Target: artifact',
                '- Annotation ID: note-follow-up',
                '- Created At: 2026-04-04T10:00:05.000Z',
                '- Updated At: 2026-04-04T10:00:05.000Z',
                '',
                'Keep the artifact export text concise enough to paste into an agent workflow.',
                '',
                'Metadata:',
                '- category: global_comment',
                '',
                '',
                '## Next-Step Guidance',
                '',
                '1. Revise the implementation approach to address every requested change before continuing.',
                '2. Add the missing steps or sequencing details so the review artifact covers the full delivery path.',
                '3. Mitigate the identified risks and test gaps, or document why each concern is acceptable.',
                '4. Answer the open questions explicitly in the next revision instead of leaving them implicit.',
                '5. After updating API Migration Plan, re-run the review and confirm the 5 open annotation(s) are resolved or intentionally deferred.',
                '',
                '## Resolved Feedback',
                '',
                '### 1. Comment',
                '- Target: artifact',
                '- Annotation ID: resolved-note',
                '- Created At: 2026-04-04T10:00:06.000Z',
                '- Updated At: 2026-04-04T10:00:07.000Z',
                '',
                'Resolved naming drift between plan review and review artifact export.',
                '',
            ].join('\n')
        );
    });

    test('exports AI response suggested replacements through the shared adapter flow', async () => {
        const aiResponseText = await readReviewArtifactFixture('ai-response-basic.md');
        const parsed = parseStructuredMarkdownContent(aiResponseText, 'aiResponseMarkdownV1');
        const artifact = createReviewArtifact({
            id: 'ai-response-export',
            kind: 'aiResponse',
            title: 'Review Last AI Response',
            source: {
                type: 'manualPaste',
                workspaceFolder: 'c:/workspace',
                metadata: { sourceMode: 'clipboard' },
            },
            content: {
                rawText: aiResponseText,
                sections: parsed.sections,
                blocks: parsed.blocks,
                metadata: parsed.metadata,
            },
            annotations: [
                createReviewAnnotation({
                    id: 'ai-response-replacement',
                    kind: 'maintainability',
                    target: { type: 'artifact' },
                    body: 'Do not skip manager tests in this phase.',
                    suggestedReplacement: 'Keep the manager tests and add deterministic coverage for AI response artifact creation.',
                    severity: 'high',
                    metadata: { category: 'suggested_replacement' },
                }),
            ],
        });
        const service = new ReviewArtifactExportService([
            new GenericMarkdownReviewArtifactExportAdapter(),
            new CopilotReviewPromptReviewArtifactExportAdapter(),
        ]);

        const genericExport = await service.exportArtifact(artifact, 'genericMarkdown');
        const copilotExport = await service.exportArtifact(artifact, 'copilotReviewPrompt');

        assert.ok(genericExport.content.includes('- Kind: aiResponse'));
        assert.ok(genericExport.content.includes('Suggested replacement:'));
        assert.ok(copilotExport.content.includes('### 1. Suggested Replacement [high]'));
        assert.ok(copilotExport.content.includes('Suggested revision:'));
    });

    test('exports local diff artifacts with file and hunk references through shared adapters', async () => {
        const rawDiff = await readReviewArtifactFixture('local-diff-basic.diff');
        const parsed = parseUnifiedDiff(rawDiff);
        const artifact = createReviewArtifact({
            id: 'local-diff-export',
            kind: 'localDiff',
            title: 'Review Local Diff: Annotative',
            source: {
                type: 'gitDiff',
                workspaceFolder: 'c:/workspace',
                revision: 'abc123def456',
                metadata: {
                    repositoryRoot: 'c:/workspace',
                    snapshotMode: 'headToWorkingTreeTracked',
                    trackedFilesOnly: true,
                },
            },
            content: {
                rawText: rawDiff,
                diffFiles: parsed.diffFiles,
                metadata: parsed.metadata,
            },
            annotations: [
                createReviewAnnotation({
                    id: 'diff-file-follow-up',
                    kind: 'comment',
                    target: { type: 'diffFile', diffFileId: parsed.diffFiles[0].id },
                    body: 'Follow up on the placeholder workspace export behavior before broadening scope.',
                    metadata: { category: 'follow_up' },
                }),
                createReviewAnnotation({
                    id: 'diff-hunk-test-gap',
                    kind: 'testGap',
                    target: { type: 'diffHunk', diffHunkId: parsed.diffFiles[0].hunks[0].id },
                    body: 'Add a deterministic test for the new exportArtifactsForWorkspace placeholder branch.',
                    severity: 'high',
                    metadata: { category: 'test_gap' },
                }),
            ],
        });
        const service = new ReviewArtifactExportService([
            new GenericMarkdownReviewArtifactExportAdapter(),
            new CopilotReviewPromptReviewArtifactExportAdapter(),
        ]);

        const genericExport = await service.exportArtifact(artifact, 'genericMarkdown');
        const copilotExport = await service.exportArtifact(artifact, 'copilotReviewPrompt');

        assert.ok(genericExport.content.includes('## Diff Files'));
        assert.ok(genericExport.content.includes('- Diff File ID: diff-file-src-managers-reviewartifactmanager-ts'));
        assert.ok(genericExport.content.includes('- Hunk ID: diff-file-src-managers-reviewartifactmanager-ts-hunk-1'));
        assert.ok(genericExport.content.includes('- Target: diffFile:diff-file-src-managers-reviewartifactmanager-ts'));
        assert.ok(genericExport.content.includes('- Target: diffHunk:diff-file-src-managers-reviewartifactmanager-ts-hunk-1'));
        assert.ok(copilotExport.content.includes('### Diff Files Under Review'));
        assert.ok(copilotExport.content.includes('- src/managers/reviewArtifactManager.ts [modified]'));
        assert.ok(copilotExport.content.includes('- src/test/suite/reviewArtifactExport.test.ts [added]'));
        assert.ok(copilotExport.content.includes('### 1. Test Gap [high]'));
        assert.ok(copilotExport.content.includes('- Target: diffHunk:diff-file-src-managers-reviewartifactmanager-ts-hunk-1'));
    });
});