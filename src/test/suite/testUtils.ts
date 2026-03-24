import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { Annotation, AnnotationTag, StoredAnnotation } from '../../types';

export function getWorkspaceRoot(): string {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, 'Expected the VS Code test workspace to be open.');
    return workspaceFolder.uri.fsPath;
}

export function createTestContext(): vscode.ExtensionContext {
    const workspaceRoot = getWorkspaceRoot();

    return {
        subscriptions: [],
        extensionUri: vscode.Uri.file(workspaceRoot),
        asAbsolutePath: (relativePath: string) => path.join(workspaceRoot, relativePath),
    } as unknown as vscode.ExtensionContext;
}

export async function clearTestWorkspace(): Promise<void> {
    const workspaceRoot = getWorkspaceRoot();
    await fs.rm(path.join(workspaceRoot, '.annotative'), { recursive: true, force: true });
    await fs.rm(path.join(workspaceRoot, '.test-artifacts'), { recursive: true, force: true });
}

export async function ensureWorkspaceFile(relativePath: string, contents: string): Promise<string> {
    const filePath = path.join(getWorkspaceRoot(), '.test-artifacts', 'workspace-files', relativePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, contents, 'utf-8');
    return filePath;
}

export async function writeJson(filePath: string, payload: unknown): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
}

export async function readJson<T>(filePath: string): Promise<T> {
    return JSON.parse(await fs.readFile(filePath, 'utf-8')) as T;
}

export function getStoragePaths(): { storageDir: string; annotationsPath: string; customTagsPath: string } {
    const storageDir = path.join(getWorkspaceRoot(), '.annotative');
    return {
        storageDir,
        annotationsPath: path.join(storageDir, 'annotations.json'),
        customTagsPath: path.join(storageDir, 'customTags.json'),
    };
}

export function createAnnotation(overrides: Partial<Annotation> & { filePath: string }): Annotation {
    return {
        id: overrides.id ?? 'annotation-1',
        filePath: overrides.filePath,
        range: overrides.range ?? new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 12)),
        text: overrides.text ?? 'const answer = 42;',
        comment: overrides.comment ?? 'Review this code path.',
        author: overrides.author ?? 'Test User',
        timestamp: overrides.timestamp ?? new Date('2026-03-24T12:00:00.000Z'),
        resolved: overrides.resolved ?? false,
        tags: overrides.tags ?? [],
        priority: overrides.priority,
        color: overrides.color ?? '#ffc107',
        aiConversations: overrides.aiConversations,
    };
}

export function toStoredAnnotation(annotation: Annotation): StoredAnnotation {
    return {
        ...annotation,
        range: {
            start: {
                line: annotation.range.start.line,
                character: annotation.range.start.character,
            },
            end: {
                line: annotation.range.end.line,
                character: annotation.range.end.character,
            },
        },
        timestamp: annotation.timestamp.toISOString(),
        tags: annotation.tags ? [...annotation.tags] : undefined,
    };
}

export function createCustomTag(overrides: Partial<AnnotationTag> & { id: string; name: string }): AnnotationTag {
    return {
        id: overrides.id,
        name: overrides.name,
        category: overrides.category ?? 'issue',
        metadata: overrides.metadata,
        isPreset: overrides.isPreset ?? false,
    };
}