import * as assert from 'assert';
import * as vscode from 'vscode';
import { AnnotationManager } from '../../managers';
import { captureAnnotationAnchor } from '../../managers/annotationAnchors';
import { AnnotationStorageFile } from '../../types';
import {
    clearTestWorkspace,
    createAnnotation,
    createTestContext,
    ensureWorkspaceFile,
    getStoragePaths,
    readJson,
    toStoredAnnotation,
    writeJson,
} from './testUtils';

suite('Annotation anchoring', () => {
    teardown(async () => {
        await clearTestWorkspace();
    });

    test('migrates legacy annotations by capturing anchors without changing unchanged ranges', async () => {
        await clearTestWorkspace();

        const contents = 'const answer = 42;\n';
        const filePath = await ensureWorkspaceFile('anchors-legacy.ts', contents);
        const storedAnnotation = buildStoredAnnotation({
            filePath,
            originalContents: contents,
            selectedText: 'answer',
            includeAnchor: false,
        });

        await writeAnnotationsFile(filePath, [storedAnnotation], 1);

        const manager = new AnnotationManager(createTestContext());
        await manager.ready;

        const loadedAnnotation = manager.getAnnotationsForFile(filePath)[0];
        assert.ok(loadedAnnotation.anchor, 'Expected the legacy annotation to gain an anchor during migration.');
        assert.strictEqual(loadedAnnotation.range.start.line, 0);
        assert.strictEqual(loadedAnnotation.range.start.character, 6);
        assert.strictEqual(loadedAnnotation.text, 'answer');

        const persisted = await readJson<AnnotationStorageFile>(getStoragePaths().annotationsPath);
        assert.strictEqual(persisted.schemaVersion, 2);
        assert.ok(persisted.workspaceAnnotations[filePath][0].anchor);

        manager.dispose();
    });

    test('rebases annotations when lines are inserted above the anchored range', async () => {
        await clearTestWorkspace();

        const originalContents = 'const alpha = 1;\nconst target = alpha + 1;\n';
        const currentContents = 'const inserted = true;\nconst alpha = 1;\nconst target = alpha + 1;\n';
        const filePath = await ensureWorkspaceFile('anchors-shift.ts', currentContents);
        const storedAnnotation = buildStoredAnnotation({
            filePath,
            originalContents,
            selectedText: 'target = alpha + 1',
        });

        await writeAnnotationsFile(filePath, [storedAnnotation], 2);

        const manager = new AnnotationManager(createTestContext());
        await manager.ready;

        const loadedAnnotation = manager.getAnnotationsForFile(filePath)[0];
        assert.strictEqual(loadedAnnotation.range.start.line, 2);
        assert.strictEqual(loadedAnnotation.text, 'target = alpha + 1');

        manager.dispose();
    });

    test('reattaches annotations across nearby formatting changes and line movement', async () => {
        await clearTestWorkspace();

        const originalContents = 'const total = sum(a, b);\n';
        const currentContents = 'const before = 1;\nconst total = sum(\n    a,\n    b\n);\n';
        const filePath = await ensureWorkspaceFile('anchors-format.ts', currentContents);
        const storedAnnotation = buildStoredAnnotation({
            filePath,
            originalContents,
            selectedText: 'sum(a, b)',
        });

        await writeAnnotationsFile(filePath, [storedAnnotation], 2);

        const manager = new AnnotationManager(createTestContext());
        await manager.ready;

        const loadedAnnotation = manager.getAnnotationsForFile(filePath)[0];
        assert.strictEqual(loadedAnnotation.range.start.line, 1);
        assert.strictEqual(loadedAnnotation.range.end.line, 4);
        assert.strictEqual(loadedAnnotation.text, 'sum(\n    a,\n    b\n)');

        manager.dispose();
    });

    test('reattaches annotations when the selected text changes but surrounding context stays stable', async () => {
        await clearTestWorkspace();

        const originalContents = 'function build(user) {\n    return getValue(user.id);\n}\n';
        const currentContents = 'function build(user) {\n    return buildValue(user.id, ctx);\n}\n';
        const filePath = await ensureWorkspaceFile('anchors-partial.ts', currentContents);
        const storedAnnotation = buildStoredAnnotation({
            filePath,
            originalContents,
            selectedText: 'getValue(user.id)',
        });

        await writeAnnotationsFile(filePath, [storedAnnotation], 2);

        const manager = new AnnotationManager(createTestContext());
        await manager.ready;

        const loadedAnnotation = manager.getAnnotationsForFile(filePath)[0];
        assert.strictEqual(loadedAnnotation.range.start.line, 1);
        assert.strictEqual(loadedAnnotation.text, 'buildValue(user.id, ctx)');
        assert.strictEqual(loadedAnnotation.anchor?.selectedText, 'buildValue(user.id, ctx)');

        manager.dispose();
    });

    test('falls back conservatively when multiple matches are equally plausible', async () => {
        await clearTestWorkspace();

        const originalContents = 'duplicate(),\nduplicate(),\n';
        const currentContents = 'duplicate(),\nduplicate(),\nduplicate(),\n';
        const filePath = await ensureWorkspaceFile('anchors-ambiguous.ts', currentContents);
        const storedAnnotation = buildStoredAnnotation({
            filePath,
            originalContents,
            selectedText: 'duplicate()',
        });

        await writeAnnotationsFile(filePath, [storedAnnotation], 2);

        const manager = new AnnotationManager(createTestContext());
        await manager.ready;

        const loadedAnnotation = manager.getAnnotationsForFile(filePath)[0];
        assert.strictEqual(loadedAnnotation.range.start.line, 0);
        assert.strictEqual(loadedAnnotation.range.start.character, 0);
        assert.strictEqual(loadedAnnotation.text, 'duplicate()');

        manager.dispose();
    });
});

function buildStoredAnnotation(options: {
    filePath: string;
    originalContents: string;
    selectedText: string;
    includeAnchor?: boolean;
    occurrence?: number;
}) {
    const range = findRange(options.originalContents, options.selectedText, options.occurrence ?? 0);
    const annotation = createAnnotation({
        filePath: options.filePath,
        id: `${pathSafeId(options.filePath)}-${options.selectedText.length}`,
        range,
        text: options.originalContents.slice(
            offsetAt(options.originalContents, range.start),
            offsetAt(options.originalContents, range.end)
        ),
    });

    if (options.includeAnchor !== false) {
        annotation.anchor = captureAnnotationAnchor(options.originalContents, range);
    }

    return toStoredAnnotation(annotation);
}

async function writeAnnotationsFile(filePath: string, storedAnnotations: ReturnType<typeof buildStoredAnnotation>[], schemaVersion: number) {
    await writeJson(getStoragePaths().annotationsPath, {
        schemaVersion,
        workspaceAnnotations: {
            [filePath]: storedAnnotations,
        },
    } satisfies AnnotationStorageFile);
}

function findRange(contents: string, selectedText: string, occurrence: number): vscode.Range {
    let searchFrom = 0;
    let offset = -1;

    for (let index = 0; index <= occurrence; index += 1) {
        offset = contents.indexOf(selectedText, searchFrom);
        if (offset === -1) {
            throw new Error(`Could not find '${selectedText}' in test contents.`);
        }
        searchFrom = offset + 1;
    }

    return new vscode.Range(
        positionAt(contents, offset),
        positionAt(contents, offset + selectedText.length)
    );
}

function positionAt(contents: string, offset: number): vscode.Position {
    const clampedOffset = Math.max(0, Math.min(offset, contents.length));
    const lines = contents.slice(0, clampedOffset).split('\n');
    return new vscode.Position(lines.length - 1, lines[lines.length - 1].length);
}

function offsetAt(contents: string, position: vscode.Position): number {
    const lines = contents.split('\n');
    let offset = 0;

    for (let line = 0; line < position.line; line += 1) {
        offset += lines[line]?.length ?? 0;
        offset += 1;
    }

    return offset + position.character;
}

function pathSafeId(filePath: string): string {
    return filePath.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}