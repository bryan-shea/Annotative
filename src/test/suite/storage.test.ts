import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { AnnotationStorageManager } from '../../managers';
import { AnnotationStorageFile, TagStorageFile } from '../../types';
import {
    clearTestWorkspace,
    createAnnotation,
    createCustomTag,
    createTestContext,
    ensureWorkspaceFile,
    getStoragePaths,
    writeJson,
} from './testUtils';

suite('AnnotationStorageManager', () => {
    setup(async () => {
        await clearTestWorkspace();
    });

    teardown(async () => {
        await clearTestWorkspace();
    });

    test('round-trips annotations and custom tags', async () => {
        const annotations = new Map();
        const storage = new AnnotationStorageManager(annotations, createTestContext());
        const filePath = await ensureWorkspaceFile('storage-roundtrip.ts', 'const answer = 42;\n');
        const annotation = createAnnotation({
            filePath,
            id: 'storage-roundtrip',
            comment: 'Persist this annotation.',
            tags: ['needs-review'],
            priority: 'high',
            color: '#42A5F5',
        });
        const customTags = [
            createCustomTag({
                id: 'needs-review',
                name: 'Needs Review',
                metadata: { priority: 'high', color: '#42A5F5' },
            }),
        ];

        annotations.set(filePath, [annotation]);

        await storage.saveAnnotations();
        await storage.saveCustomTags(customTags);

        annotations.clear();

        const annotationLoad = await storage.loadAnnotations();
        const loadedTags = await storage.loadCustomTags();

        assert.strictEqual(annotationLoad.needsSave, false);
        assert.strictEqual(loadedTags.needsSave, false);
        assert.deepStrictEqual(loadedTags.tags, customTags);

        const loadedAnnotation = annotations.get(filePath)?.[0];
        assert.ok(loadedAnnotation, 'Expected the saved annotation to load back from storage.');
        assert.strictEqual(loadedAnnotation.id, annotation.id);
        assert.strictEqual(loadedAnnotation.comment, annotation.comment);
        assert.strictEqual(loadedAnnotation.timestamp.toISOString(), annotation.timestamp.toISOString());
        assert.deepStrictEqual(loadedAnnotation.tags, ['needs-review']);
        assert.strictEqual(loadedAnnotation.priority, 'high');
        assert.strictEqual(loadedAnnotation.color, '#42A5F5');
    });

    test('quarantines a corrupted annotation storage file and resets in-memory state', async () => {
        const annotations = new Map();
        const storage = new AnnotationStorageManager(annotations, createTestContext());
        const { storageDir, annotationsPath } = getStoragePaths();

        await storage.ensureProjectStorage();
        await fs.mkdir(storageDir, { recursive: true });
        await fs.writeFile(annotationsPath, '{ invalid json', 'utf-8');

        const result = await storage.loadAnnotations();
        const storageEntries = await fs.readdir(storageDir);

        assert.strictEqual(result.needsSave, false);
        assert.strictEqual(annotations.size, 0);
        assert.ok(
            storageEntries.some(name => /^annotations\.corrupt-.*\.json$/.test(name)),
            'Expected a quarantined copy of the corrupt annotations file.'
        );
        assert.ok(!storageEntries.includes('annotations.json'));
    });

    test('loads legacy schemas and signals that they should be rewritten', async () => {
        const annotations = new Map();
        const storage = new AnnotationStorageManager(annotations, createTestContext());
        const filePath = await ensureWorkspaceFile('legacy-schema.ts', 'const legacy = true;\n');
        const legacyAnnotation = createAnnotation({
            filePath,
            id: 'legacy-annotation',
            comment: 'Legacy payload.',
            tags: ['legacy-tag'],
        });
        const { annotationsPath, customTagsPath } = getStoragePaths();

        await storage.ensureProjectStorage();

        await writeJson(annotationsPath, {
            workspaceAnnotations: {
                [filePath]: [
                    {
                        ...legacyAnnotation,
                        range: {
                            start: { line: 0, character: 0 },
                            end: { line: 0, character: 5 },
                        },
                        timestamp: legacyAnnotation.timestamp.toISOString(),
                    },
                ],
            },
        });
        await writeJson(customTagsPath, [createCustomTag({ id: 'legacy-tag', name: 'Legacy Tag' })]);

        const annotationLoad = await storage.loadAnnotations();
        const tagLoad = await storage.loadCustomTags();

        assert.strictEqual(annotationLoad.needsSave, true);
        assert.strictEqual(tagLoad.needsSave, true);

        const loadedAnnotation = annotations.get(filePath)?.[0];
        assert.ok(loadedAnnotation, 'Expected the legacy annotation payload to load.');
        assert.deepStrictEqual(loadedAnnotation.tags, ['legacy-tag']);
    });

    test('detects project storage from the active workspace context instead of a hardcoded root index', async () => {
        const annotations = new Map();
        const storage = new AnnotationStorageManager(annotations, createTestContext());
        const filePath = await ensureWorkspaceFile('storage-detection.ts', 'const rootAware = true;\n');
        const editor = await vscode.window.showTextDocument(vscode.Uri.file(filePath));

        await storage.ensureProjectStorage();

        assert.ok(storage.getStorageDirectory().endsWith('.annotative'));

        await editor.hide();
    });
});