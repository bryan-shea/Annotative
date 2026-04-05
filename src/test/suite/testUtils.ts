import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { Annotation, AnnotationTag, ReviewAnnotation, ReviewArtifact, StoredAnnotation } from '../../types';

export function getWorkspaceRoot(): string {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(workspaceFolder, 'Expected the VS Code test workspace to be open.');
    return workspaceFolder.uri.fsPath;
}

export function getRepositoryRoot(): string {
    return path.resolve(__dirname, '..', '..', '..');
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

export function getReviewStoragePaths(artifactId?: string): {
    storageDir: string;
    reviewsDir: string;
    artifactPath?: string;
} {
    const storageDir = path.join(getWorkspaceRoot(), '.annotative');
    const reviewsDir = path.join(storageDir, 'reviews');

    return {
        storageDir,
        reviewsDir,
        artifactPath: artifactId ? path.join(reviewsDir, `${artifactId}.json`) : undefined,
    };
}

export async function readReviewArtifactFixture(fileName: string): Promise<string> {
    const fixturePath = path.join(getRepositoryRoot(), 'src', 'test', 'fixtures', 'review-artifacts', fileName);
    return fs.readFile(fixturePath, 'utf-8');
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

export function createReviewAnnotation(overrides: Partial<ReviewAnnotation> = {}): ReviewAnnotation {
    return {
        id: overrides.id ?? 'review-annotation-1',
        kind: overrides.kind ?? 'requestChange',
        status: overrides.status ?? 'open',
        target: overrides.target ?? { type: 'artifact' },
        body: overrides.body ?? 'Tighten this review artifact before export.',
        createdAt: overrides.createdAt ?? '2026-04-01T12:00:00.000Z',
        updatedAt: overrides.updatedAt ?? '2026-04-01T12:00:00.000Z',
        ...(overrides.severity ? { severity: overrides.severity } : {}),
        ...(overrides.suggestedReplacement ? { suggestedReplacement: overrides.suggestedReplacement } : {}),
        ...(overrides.metadata ? { metadata: overrides.metadata } : {}),
    };
}

export function createReviewArtifact(overrides: Partial<ReviewArtifact> & { id: string }): ReviewArtifact {
    return {
        id: overrides.id,
        version: overrides.version ?? 1,
        kind: overrides.kind ?? 'plan',
        title: overrides.title ?? 'Review API Migration Plan',
        createdAt: overrides.createdAt ?? '2026-04-01T12:00:00.000Z',
        updatedAt: overrides.updatedAt ?? '2026-04-01T12:00:00.000Z',
        source: overrides.source ?? {
            type: 'markdownFile',
            uri: 'file:///workspace/docs/plan.md',
            workspaceFolder: getWorkspaceRoot(),
        },
        content: overrides.content ?? {
            rawText: '# Review API Migration Plan\n\n## Goal\nShip the migration safely.\n',
            sections: [
                {
                    id: 'goal',
                    heading: 'Goal',
                    level: 2,
                    order: 1,
                    content: 'Ship the migration safely.',
                    lineStart: 3,
                    lineEnd: 4,
                },
            ],
        },
        annotations: overrides.annotations ?? [createReviewAnnotation()],
        ...(overrides.exportState ? { exportState: overrides.exportState } : {}),
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