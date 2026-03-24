import * as assert from 'assert';
import { AnnotationExporter } from '../../managers';
import { CopilotExporter } from '../../copilotExporter';
import { Annotation } from '../../types';
import { createAnnotation, ensureWorkspaceFile } from './testUtils';

suite('Exporters', () => {
    test('exports markdown grouped by file with resolved tag labels', async () => {
        const filePath = await ensureWorkspaceFile('exports/example.ts', 'export const value = 42;\n');
        const annotations = new Map<string, Annotation[]>([
            [
                filePath,
                [
                    createAnnotation({
                        filePath,
                        id: 'markdown-export',
                        comment: 'Check the exported value.',
                        tags: ['bug-tag', 'docs-tag'],
                    }),
                ],
            ],
        ]);
        const exporter = new AnnotationExporter(annotations, (tagIds) =>
            (tagIds || []).map(tagId => ({ 'bug-tag': 'Bug', 'docs-tag': 'Docs' }[tagId] || tagId))
        );

        const markdown = await exporter.exportToMarkdown();

        assert.ok(markdown.includes('# Code Annotations - workspace'));
        assert.ok(markdown.includes('## .test-artifacts/workspace-files/exports/example.ts'));
        assert.ok(markdown.includes('### [Open] Annotation 1'));
        assert.ok(markdown.includes('**Comment:**\nCheck the exported value.'));
        assert.ok(markdown.includes('**Tags:** Bug, Docs'));
    });

    test('exports AI-specific formats and intent filters from current behavior', async () => {
        const filePath = await ensureWorkspaceFile('exports/ai.ts', 'export function render() {}\n');
        const annotations = [
            createAnnotation({
                filePath,
                id: 'review-annotation',
                comment: 'Review this bug fix.',
                tags: ['bug'],
                resolved: false,
            }),
            createAnnotation({
                filePath,
                id: 'resolved-annotation',
                comment: 'Document this branch.',
                tags: ['documentation'],
                resolved: true,
            }),
            createAnnotation({
                filePath,
                id: 'performance-annotation',
                comment: 'Optimize this hot path.',
                tags: ['performance'],
                resolved: false,
            }),
        ];

        const reviewExport = CopilotExporter.exportByIntent(annotations, 'review');
        const bugExport = CopilotExporter.exportByIntent(annotations, 'bugs');
        const chatGptExport = CopilotExporter.exportForAI(annotations, {
            format: 'chatgpt',
            includeResolved: true,
            contextLines: 5,
            includeImports: false,
            includeFunction: false,
        });
        const claudeExport = CopilotExporter.exportForAI(annotations, {
            format: 'claude',
            includeResolved: true,
            contextLines: 5,
            includeImports: false,
            includeFunction: false,
        });
        const genericExport = CopilotExporter.exportForAI(annotations, {
            format: 'generic',
            includeResolved: true,
            contextLines: 5,
            includeImports: false,
            includeFunction: false,
        });

        assert.ok(reviewExport.includes('Review this bug fix.'));
        assert.ok(reviewExport.includes('Optimize this hot path.'));
        assert.ok(!reviewExport.includes('Document this branch.'));

        assert.ok(bugExport.includes('Review this bug fix.'));
        assert.ok(!bugExport.includes('Optimize this hot path.'));

        assert.ok(chatGptExport.includes('# Code Review Request'));
        assert.ok(chatGptExport.includes('### Issue 1'));

        assert.ok(claudeExport.includes('<code_review>'));
        assert.ok(claudeExport.includes('<file path=".test-artifacts/workspace-files/exports/ai.ts">'));

        assert.ok(genericExport.includes('# Code Review Annotations (3 items)'));
        assert.ok(genericExport.includes('## Summary'));
    });
});