import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import {
    Annotation,
    AnnotationStorageFile,
    AnnotationTag,
    AnnotationAnchor,
    StoredAnnotation,
    TagPriority,
    TagStorageFile,
} from '../types';
import {
    findWorkspaceFolderContainingChild,
    getPreferredWorkspaceFolder,
    resolveWorkspaceFolderForAnnotations,
} from '../utils/workspaceContext';

const STORAGE_SCHEMA_VERSION = 2;

export interface LoadAnnotationsResult {
    needsSave: boolean;
}

export interface LoadCustomTagsResult {
    tags: AnnotationTag[];
    needsSave: boolean;
}

interface ParsedAnnotationsPayload {
    workspaceAnnotations: Record<string, StoredAnnotation[]>;
    needsSave: boolean;
}

interface ParsedCustomTagsPayload {
    customTags: AnnotationTag[];
    needsSave: boolean;
}

/**
 * Handles persistence of annotations and custom tags.
 * Uses project-scoped storage (.annotative folder) exclusively.
 */
export class AnnotationStorageManager {
    private storageFilePath = '';
    private customTagsPath = '';
    private projectStorageDir: string | undefined;
    private writeQueue: Promise<void> = Promise.resolve();

    constructor(
        private annotations: Map<string, Annotation[]>,
        context: vscode.ExtensionContext
    ) {
        void context;
        this.detectProjectStorage();
    }

    private detectProjectStorage(): void {
        const storageFolder = findWorkspaceFolderContainingChild('.annotative');
        if (!storageFolder) {
            return;
        }

        const annotativeDir = path.join(storageFolder.uri.fsPath, '.annotative');
        if (!fs.existsSync(annotativeDir)) {
            return;
        }

        this.projectStorageDir = annotativeDir;
        this.storageFilePath = path.join(annotativeDir, 'annotations.json');
        this.customTagsPath = path.join(annotativeDir, 'customTags.json');
    }

    isProjectStorageActive(): boolean {
        return !!this.projectStorageDir;
    }

    getStorageDirectory(): string {
        return this.projectStorageDir || '';
    }

    async ensureProjectStorage(): Promise<void> {
        if (this.projectStorageDir) {
            return;
        }

        const workspaceFolder = this.resolveStorageWorkspaceFolder();
        if (!workspaceFolder) {
            throw new Error('No workspace folder open');
        }

        const annotativeDir = path.join(workspaceFolder.uri.fsPath, '.annotative');
        if (!fs.existsSync(annotativeDir)) {
            await fs.promises.mkdir(annotativeDir, { recursive: true });

            const readmePath = path.join(annotativeDir, 'README.md');
            const readmeContent = `# Annotative Storage\n\nThis folder contains your project's annotations and custom tags.\n\n## Version Control\n\n**Recommended:** Include this folder in version control to share annotations with your team.\n\n\`\`\`bash\ngit add .annotative/\ngit commit -m "Add annotations"\n\`\`\`\n\n**Private annotations:** Add \`.annotative/\` to your project's \`.gitignore\` file.\n\n## Files\n\n- \`annotations.json\` - All annotations in this project\n- \`customTags.json\` - User-defined tag definitions\n`;
            await fs.promises.writeFile(readmePath, readmeContent, 'utf-8');
        }

        this.projectStorageDir = annotativeDir;
        this.storageFilePath = path.join(annotativeDir, 'annotations.json');
        this.customTagsPath = path.join(annotativeDir, 'customTags.json');
    }

    async initializeProjectStorage(): Promise<boolean> {
        const workspaceFolder = this.resolveStorageWorkspaceFolder();
        if (!workspaceFolder) {
            throw new Error('No workspace folder open');
        }

        const annotativeDir = path.join(workspaceFolder.uri.fsPath, '.annotative');
        const existedBefore = fs.existsSync(annotativeDir);
        await this.ensureProjectStorage();
        return !existedBefore && !!this.projectStorageDir;
    }

    refreshStorageDetection(): void {
        this.projectStorageDir = undefined;
        this.storageFilePath = '';
        this.customTagsPath = '';
        this.detectProjectStorage();
    }

    private resolveStorageWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
        const annotationScope = [...this.annotations.entries()].flatMap(([filePath, fileAnnotations]) =>
            fileAnnotations.length > 0
                ? fileAnnotations
                : [{ filePath } as Annotation]
        );

        return resolveWorkspaceFolderForAnnotations(annotationScope) || getPreferredWorkspaceFolder();
    }

    async loadAnnotations(): Promise<LoadAnnotationsResult> {
        try {
            if (!this.storageFilePath || !fs.existsSync(this.storageFilePath)) {
                return { needsSave: false };
            }

            const data = await fs.promises.readFile(this.storageFilePath, 'utf-8');
            const parsed = this.parseAnnotationStorage(JSON.parse(data));

            this.annotations.clear();
            Object.entries(parsed.workspaceAnnotations).forEach(([filePath, annotations]) => {
                this.annotations.set(
                    filePath,
                    annotations.map(annotation => this.deserializeAnnotation(filePath, annotation))
                );
            });

            return { needsSave: parsed.needsSave };
        } catch (error) {
            console.error('Failed to load annotations:', error);
            await this.recoverCorruptFile(this.storageFilePath, 'annotations');
            this.annotations.clear();
            return { needsSave: false };
        }
    }

    async saveAnnotations(): Promise<void> {
        try {
            await this.enqueueWrite(async () => {
                await this.ensureProjectStorage();

                const storage: AnnotationStorageFile = {
                    schemaVersion: STORAGE_SCHEMA_VERSION,
                    workspaceAnnotations: Object.fromEntries(
                        Array.from(this.annotations.entries()).map(([filePath, annotations]) => [
                            filePath,
                            annotations.map(annotation => this.serializeAnnotation(annotation))
                        ])
                    )
                };

                await this.writeJsonAtomically(this.storageFilePath, storage);
            });
        } catch (error) {
            console.error('Failed to save annotations:', error);
            vscode.window.showErrorMessage('Failed to save annotations');
        }
    }

    async loadCustomTags(): Promise<LoadCustomTagsResult> {
        try {
            if (this.customTagsPath && fs.existsSync(this.customTagsPath)) {
                const data = await fs.promises.readFile(this.customTagsPath, 'utf-8');
                const parsed = this.parseCustomTagsStorage(JSON.parse(data));
                return {
                    tags: parsed.customTags,
                    needsSave: parsed.needsSave,
                };
            }
        } catch (error) {
            console.error('Failed to load custom tags:', error);
            await this.recoverCorruptFile(this.customTagsPath, 'custom tags');
        }

        return { tags: [], needsSave: false };
    }

    async saveCustomTags(tags: AnnotationTag[]): Promise<void> {
        try {
            await this.enqueueWrite(async () => {
                await this.ensureProjectStorage();

                const storage: TagStorageFile = {
                    schemaVersion: STORAGE_SCHEMA_VERSION,
                    customTags: tags,
                };

                await this.writeJsonAtomically(this.customTagsPath, storage);
            });
        } catch (error) {
            console.error('Failed to save custom tags:', error);
            vscode.window.showErrorMessage('Failed to save custom tags');
        }
    }

    private serializeAnnotation(annotation: Annotation): StoredAnnotation {
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
            anchor: this.serializeAnchor(annotation.anchor),
        };
    }

    private deserializeAnnotation(filePath: string, annotation: StoredAnnotation): Annotation {
        const start = annotation.range?.start ?? { line: 0, character: 0 };
        const end = annotation.range?.end ?? start;
        const normalizedTags = Array.isArray(annotation.tags)
            ? annotation.tags
                .map(tag => typeof tag === 'string' ? tag : tag.id || tag.name)
                .filter((tagId): tagId is string => typeof tagId === 'string' && tagId.trim().length > 0)
            : [];

        return {
            ...annotation,
            filePath,
            range: new vscode.Range(
                new vscode.Position(start.line, start.character),
                new vscode.Position(end.line, end.character)
            ),
            timestamp: this.parseTimestamp(annotation.timestamp),
            tags: normalizedTags,
            priority: this.normalizePriority(annotation.priority),
            anchor: this.deserializeAnchor(annotation.anchor),
        };
    }

    private serializeAnchor(anchor: AnnotationAnchor | undefined): AnnotationAnchor | undefined {
        if (!anchor) {
            return undefined;
        }

        return {
            selectedText: anchor.selectedText,
            prefixContext: anchor.prefixContext,
            suffixContext: anchor.suffixContext,
            selectedTextHash: anchor.selectedTextHash,
            normalizedTextHash: anchor.normalizedTextHash,
            contextHash: anchor.contextHash,
        };
    }

    private deserializeAnchor(rawAnchor: unknown): AnnotationAnchor | undefined {
        if (!rawAnchor || typeof rawAnchor !== 'object') {
            return undefined;
        }

        const candidate = rawAnchor as Partial<AnnotationAnchor>;
        if (
            typeof candidate.selectedText !== 'string'
            || typeof candidate.prefixContext !== 'string'
            || typeof candidate.suffixContext !== 'string'
            || typeof candidate.selectedTextHash !== 'string'
            || typeof candidate.normalizedTextHash !== 'string'
            || typeof candidate.contextHash !== 'string'
        ) {
            return undefined;
        }

        return {
            selectedText: candidate.selectedText,
            prefixContext: candidate.prefixContext,
            suffixContext: candidate.suffixContext,
            selectedTextHash: candidate.selectedTextHash,
            normalizedTextHash: candidate.normalizedTextHash,
            contextHash: candidate.contextHash,
        };
    }

    private parseAnnotationStorage(raw: unknown): ParsedAnnotationsPayload {
        if (this.isAnnotationStorageFile(raw)) {
            return {
                workspaceAnnotations: raw.workspaceAnnotations,
                needsSave: raw.schemaVersion !== STORAGE_SCHEMA_VERSION,
            };
        }

        if (this.isLegacyAnnotationStorage(raw)) {
            return {
                workspaceAnnotations: raw.workspaceAnnotations,
                needsSave: true,
            };
        }

        throw new Error('Invalid annotation storage schema');
    }

    private parseCustomTagsStorage(raw: unknown): ParsedCustomTagsPayload {
        if (this.isTagStorageFile(raw)) {
            return {
                customTags: raw.customTags,
                needsSave: raw.schemaVersion !== STORAGE_SCHEMA_VERSION,
            };
        }

        if (Array.isArray(raw)) {
            return {
                customTags: raw,
                needsSave: true,
            };
        }

        throw new Error('Invalid custom tag storage schema');
    }

    private isAnnotationStorageFile(raw: unknown): raw is AnnotationStorageFile {
        if (!raw || typeof raw !== 'object') {
            return false;
        }

        const candidate = raw as Partial<AnnotationStorageFile>;
        return typeof candidate.schemaVersion === 'number'
            && !!candidate.workspaceAnnotations
            && typeof candidate.workspaceAnnotations === 'object';
    }

    private isLegacyAnnotationStorage(raw: unknown): raw is { workspaceAnnotations: Record<string, StoredAnnotation[]> } {
        if (!raw || typeof raw !== 'object') {
            return false;
        }

        const candidate = raw as { workspaceAnnotations?: unknown };
        return !!candidate.workspaceAnnotations && typeof candidate.workspaceAnnotations === 'object';
    }

    private isTagStorageFile(raw: unknown): raw is TagStorageFile {
        if (!raw || typeof raw !== 'object') {
            return false;
        }

        const candidate = raw as Partial<TagStorageFile>;
        return typeof candidate.schemaVersion === 'number' && Array.isArray(candidate.customTags);
    }

    private parseTimestamp(rawTimestamp: string): Date {
        const timestamp = new Date(rawTimestamp);
        return Number.isNaN(timestamp.getTime()) ? new Date(0) : timestamp;
    }

    private normalizePriority(priority: unknown): TagPriority | undefined {
        if (priority === 'low' || priority === 'medium' || priority === 'high' || priority === 'critical') {
            return priority;
        }

        return undefined;
    }

    private async writeJsonAtomically(filePath: string, payload: unknown): Promise<void> {
        const directory = path.dirname(filePath);
        const fileName = path.basename(filePath);
        const tempPath = path.join(directory, `${fileName}.tmp`);
        const backupPath = path.join(directory, `${fileName}.bak`);
        const contents = `${JSON.stringify(payload, null, 2)}\n`;

        await fs.promises.writeFile(tempPath, contents, 'utf-8');

        const hasExistingFile = fs.existsSync(filePath);
        if (hasExistingFile) {
            if (fs.existsSync(backupPath)) {
                await fs.promises.unlink(backupPath);
            }

            await fs.promises.rename(filePath, backupPath);
        }

        try {
            await fs.promises.rename(tempPath, filePath);
            if (fs.existsSync(backupPath)) {
                await fs.promises.unlink(backupPath);
            }
        } catch (error) {
            if (fs.existsSync(tempPath)) {
                await fs.promises.unlink(tempPath);
            }

            if (fs.existsSync(backupPath) && !fs.existsSync(filePath)) {
                await fs.promises.rename(backupPath, filePath);
            }

            throw error;
        }
    }

    private async enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
        const nextWrite = this.writeQueue.then(operation, operation);
        this.writeQueue = nextWrite.then(() => undefined, () => undefined);
        return nextWrite;
    }

    private async recoverCorruptFile(filePath: string, label: string): Promise<void> {
        if (!filePath || !fs.existsSync(filePath)) {
            return;
        }

        const parsedPath = path.parse(filePath);
        const timestamp = new Date().toISOString().replace(/[.:]/g, '-');
        const recoveredPath = path.join(parsedPath.dir, `${parsedPath.name}.corrupt-${timestamp}${parsedPath.ext}`);
        await fs.promises.rename(filePath, recoveredPath);

        void vscode.window.showWarningMessage(
            `Annotative recovered an unreadable ${label} file and moved it to ${path.basename(recoveredPath)}.`
        );
    }
}
