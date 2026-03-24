import * as assert from 'assert';
import { AnnotationManager } from '../../managers';
import { AnnotationStorageFile, TagStorageFile } from '../../types';
import {
    clearTestWorkspace,
    createAnnotation,
    createCustomTag,
    createTestContext,
    ensureWorkspaceFile,
    getStoragePaths,
    readJson,
    toStoredAnnotation,
    writeJson,
} from './testUtils';

suite('AnnotationManager', () => {
    teardown(async () => {
        await clearTestWorkspace();
    });

    test('migrates loaded tag names to ids and persists canonical tags', async () => {
        await clearTestWorkspace();

        const filePath = await ensureWorkspaceFile('manager-migration.ts', 'const answer = 42;\n');
        const { annotationsPath, customTagsPath } = getStoragePaths();
        const customTags = [
            createCustomTag({
                id: 'needs-review',
                name: 'Needs Review',
                metadata: { priority: 'high', color: '#42A5F5' },
            }),
        ];
        const legacyAnnotation = createAnnotation({
            filePath,
            id: 'migration-target',
            tags: ['Needs Review', 'needs-review', '   '],
            comment: 'Normalize this tag set.',
        });

        await writeJson(customTagsPath, {
            schemaVersion: 1,
            customTags,
        } satisfies TagStorageFile);
        await writeJson(annotationsPath, {
            schemaVersion: 1,
            workspaceAnnotations: {
                [filePath]: [toStoredAnnotation(legacyAnnotation)],
            },
        } satisfies AnnotationStorageFile);

        const manager = new AnnotationManager(createTestContext());
        await manager.ready;

        const loadedAnnotation = manager.getAnnotationsForFile(filePath)[0];
        assert.deepStrictEqual(loadedAnnotation.tags, ['needs-review']);
        assert.strictEqual(manager.resolveTagLabel('needs-review'), 'Needs Review');
        assert.strictEqual(manager.getAnnotationPriority(loadedAnnotation), 'high');

        const persisted = await readJson<AnnotationStorageFile>(annotationsPath);
        assert.deepStrictEqual(persisted.workspaceAnnotations[filePath][0].tags, ['needs-review']);

        manager.dispose();
    });

    test('preserves annotation tag ids across tag rename and delete operations', async () => {
        await clearTestWorkspace();

        const filePath = await ensureWorkspaceFile('manager-tags.ts', 'const review = true;\n');
        const { annotationsPath, customTagsPath } = getStoragePaths();
        const customTags = [
            createCustomTag({ id: 'bug-tag', name: 'Bug Tag' }),
            createCustomTag({ id: 'critical-tag', name: 'Critical Tag', metadata: { priority: 'critical' } }),
        ];
        const storedAnnotation = createAnnotation({
            filePath,
            id: 'tagged-annotation',
            tags: ['bug-tag', 'critical-tag'],
            comment: 'Keep ids stable while labels change.',
        });

        await writeJson(customTagsPath, {
            schemaVersion: 1,
            customTags,
        } satisfies TagStorageFile);
        await writeJson(annotationsPath, {
            schemaVersion: 1,
            workspaceAnnotations: {
                [filePath]: [toStoredAnnotation(storedAnnotation)],
            },
        } satisfies AnnotationStorageFile);

        const manager = new AnnotationManager(createTestContext());
        await manager.ready;

        const annotation = manager.getAnnotationsForFile(filePath)[0];
        assert.strictEqual(manager.getAnnotationPriority(annotation), 'critical');
        assert.strictEqual(
            manager.getAnnotationPriority(createAnnotation({ filePath, id: 'default-priority', tags: ['bug-tag'] })),
            'medium'
        );

        const updated = await manager.updateCustomTag('bug-tag', 'Bugs');
        assert.strictEqual(updated?.name, 'Bugs');
        assert.deepStrictEqual(annotation.tags, ['bug-tag', 'critical-tag']);
        assert.strictEqual(manager.resolveTagLabel('bug-tag'), 'Bugs');

        const deleted = await manager.deleteCustomTag('bug-tag');
        assert.strictEqual(deleted, true);
        assert.deepStrictEqual(annotation.tags, ['bug-tag', 'critical-tag']);
        assert.strictEqual(manager.resolveTagLabel('bug-tag'), 'bug-tag');

        manager.dispose();
    });
});