import * as assert from 'assert';
import * as vscode from 'vscode';
import { AnnotationCRUD } from '../../managers';
import { Annotation } from '../../types';
import { createAnnotation } from './testUtils';

suite('AnnotationCRUD', () => {
    test('supports add, edit, resolve, unresolve, and remove flows', async () => {
        const annotations = new Map<string, Annotation[]>();
        const decorationUpdates: Annotation[][] = [];
        let saveCount = 0;
        const filePath = 'c:\\workspace\\crud-flow.ts';
        const editor = {
            document: {
                uri: vscode.Uri.file(filePath),
                getText: () => 'const answer = 42;',
            },
        } as unknown as vscode.TextEditor;
        const crud = new AnnotationCRUD(
            annotations,
            {
                updateDecorations: (_editor: vscode.TextEditor, fileAnnotations: Annotation[]) => {
                    decorationUpdates.push([...fileAnnotations]);
                },
            } as unknown as never,
            {
                saveAnnotations: async () => {
                    saveCount += 1;
                },
            } as unknown as never
        );
        const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 12));

        const created = await crud.addAnnotation(editor, range, 'Add regression coverage.', ['bug'], '#42A5F5');

        assert.strictEqual(annotations.get(filePath)?.length, 1);
        assert.strictEqual(created.comment, 'Add regression coverage.');
        assert.deepStrictEqual(created.tags, ['bug']);
        assert.strictEqual(created.color, '#42A5F5');
        assert.ok(created.author.length > 0);
        assert.strictEqual(saveCount, 1);
        assert.strictEqual(decorationUpdates.length, 1);

        await crud.editAnnotation(created.id, filePath, 'Updated comment.', ['security'], '#FF5252');
        assert.strictEqual(annotations.get(filePath)?.[0].comment, 'Updated comment.');
        assert.deepStrictEqual(annotations.get(filePath)?.[0].tags, ['security']);
        assert.strictEqual(annotations.get(filePath)?.[0].color, '#FF5252');

        await crud.toggleResolvedStatus(created.id, filePath);
        assert.strictEqual(annotations.get(filePath)?.[0].resolved, true);

        await crud.toggleResolvedStatus(created.id, filePath);
        assert.strictEqual(annotations.get(filePath)?.[0].resolved, false);

        await crud.removeAnnotation(created.id, filePath);
        assert.strictEqual(annotations.get(filePath)?.length, 0);
        assert.strictEqual(saveCount, 5);
    });

    test('resolves and deletes resolved annotations at file and workspace scope', async () => {
        const fileOne = 'c:\\workspace\\file-one.ts';
        const fileTwo = 'c:\\workspace\\file-two.ts';
        const annotations = new Map<string, Annotation[]>([
            [
                fileOne,
                [
                    createAnnotation({ filePath: fileOne, id: 'one-open', resolved: false }),
                    createAnnotation({ filePath: fileOne, id: 'one-resolved', resolved: true }),
                ],
            ],
            [
                fileTwo,
                [
                    createAnnotation({ filePath: fileTwo, id: 'two-open', resolved: false }),
                ],
            ],
        ]);
        let saveCount = 0;
        const crud = new AnnotationCRUD(
            annotations,
            { updateDecorations: () => undefined } as unknown as never,
            {
                saveAnnotations: async () => {
                    saveCount += 1;
                },
            } as unknown as never
        );

        const deletedFromFile = await crud.deleteResolved(fileOne);
        assert.strictEqual(deletedFromFile, 1);
        assert.deepStrictEqual(
            annotations.get(fileOne)?.map(annotation => annotation.id),
            ['one-open']
        );

        const resolvedAcrossWorkspace = await crud.resolveAll();
        assert.strictEqual(resolvedAcrossWorkspace, 2);
        assert.ok(annotations.get(fileOne)?.every(annotation => annotation.resolved));
        assert.ok(annotations.get(fileTwo)?.every(annotation => annotation.resolved));

        const deletedAcrossWorkspace = await crud.deleteResolved();
        assert.strictEqual(deletedAcrossWorkspace, 2);
        assert.deepStrictEqual(annotations.get(fileOne), []);
        assert.deepStrictEqual(annotations.get(fileTwo), []);
        assert.strictEqual(saveCount, 3);
    });
});