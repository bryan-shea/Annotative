import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ReviewArtifact, ReviewArtifactStorageFile } from '../types';
import { findWorkspaceFolderContainingChild, getPreferredWorkspaceFolder } from '../utils/workspaceContext';

const REVIEW_ARTIFACT_STORAGE_SCHEMA_VERSION = 1;

export interface LoadReviewArtifactResult {
    artifact?: ReviewArtifact;
    needsSave: boolean;
}

export interface ListReviewArtifactsResult {
    artifacts: ReviewArtifact[];
    needsSaveIds: string[];
}

interface ParsedReviewArtifactStorage {
    artifact: ReviewArtifact;
    needsSave: boolean;
}

export class ReviewArtifactStorageManager {
    private annotativeDir = '';
    private reviewsDir = '';
    private writeQueue: Promise<void> = Promise.resolve();

    constructor() {
        this.detectProjectStorage();
    }

    isProjectStorageActive(): boolean {
        return this.reviewsDir.length > 0;
    }

    getStorageDirectory(): string {
        return this.reviewsDir;
    }

    refreshStorageDetection(): void {
        this.annotativeDir = '';
        this.reviewsDir = '';
        this.detectProjectStorage();
    }

    async ensureProjectStorage(): Promise<void> {
        if (this.reviewsDir) {
            return;
        }

        const workspaceFolder = this.resolveStorageWorkspaceFolder();
        if (!workspaceFolder) {
            throw new Error('No workspace folder open');
        }

        const annotativeDir = path.join(workspaceFolder.uri.fsPath, '.annotative');
        const reviewsDir = path.join(annotativeDir, 'reviews');

        await fs.promises.mkdir(reviewsDir, { recursive: true });

        this.annotativeDir = annotativeDir;
        this.reviewsDir = reviewsDir;
    }

    async saveArtifact(artifact: ReviewArtifact): Promise<void> {
        await this.enqueueWrite(async () => {
            await this.ensureProjectStorage();

            const payload: ReviewArtifactStorageFile = {
                schemaVersion: REVIEW_ARTIFACT_STORAGE_SCHEMA_VERSION,
                artifact,
            };

            await this.writeJsonAtomically(this.getArtifactFilePath(artifact.id), payload);
        });
    }

    async loadArtifact(id: string): Promise<LoadReviewArtifactResult> {
        this.detectProjectStorage();
        if (!this.reviewsDir) {
            return { needsSave: false };
        }

        const artifactPath = this.getArtifactFilePath(id);
        if (!fs.existsSync(artifactPath)) {
            return { needsSave: false };
        }

        try {
            const result = await this.readArtifactFile(artifactPath);
            return {
                artifact: result.artifact,
                needsSave: result.needsSave,
            };
        } catch (error) {
            console.error('Failed to load review artifact:', error);
            await this.recoverCorruptFile(artifactPath, 'review artifact');
            return { needsSave: false };
        }
    }

    async listArtifacts(): Promise<ListReviewArtifactsResult> {
        this.detectProjectStorage();
        if (!this.reviewsDir || !fs.existsSync(this.reviewsDir)) {
            return { artifacts: [], needsSaveIds: [] };
        }

        const entries = await fs.promises.readdir(this.reviewsDir, { withFileTypes: true });
        const artifacts: ReviewArtifact[] = [];
        const needsSaveIds: string[] = [];

        for (const entry of entries) {
            if (!entry.isFile() || !entry.name.endsWith('.json') || entry.name.includes('.corrupt-')) {
                continue;
            }

            const filePath = path.join(this.reviewsDir, entry.name);

            try {
                const parsed = await this.readArtifactFile(filePath);
                artifacts.push(parsed.artifact);

                if (parsed.needsSave) {
                    needsSaveIds.push(parsed.artifact.id);
                }
            } catch (error) {
                console.error('Failed to read review artifact while listing artifacts:', error);
                await this.recoverCorruptFile(filePath, 'review artifact');
            }
        }

        artifacts.sort((left, right) => {
            const updatedDelta = this.getSortableTimestamp(right.updatedAt) - this.getSortableTimestamp(left.updatedAt);
            if (updatedDelta !== 0) {
                return updatedDelta;
            }

            return left.id.localeCompare(right.id);
        });

        return { artifacts, needsSaveIds };
    }

    private detectProjectStorage(): void {
        const storageFolder = findWorkspaceFolderContainingChild('.annotative');
        if (!storageFolder) {
            return;
        }

        const annotativeDir = path.join(storageFolder.uri.fsPath, '.annotative');
        const reviewsDir = path.join(annotativeDir, 'reviews');
        if (!fs.existsSync(reviewsDir)) {
            return;
        }

        this.annotativeDir = annotativeDir;
        this.reviewsDir = reviewsDir;
    }

    private resolveStorageWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
        return findWorkspaceFolderContainingChild('.annotative') || getPreferredWorkspaceFolder();
    }

    private getArtifactFilePath(artifactId: string): string {
        return path.join(this.reviewsDir, `${this.sanitizeArtifactId(artifactId)}.json`);
    }

    private sanitizeArtifactId(artifactId: string): string {
        const sanitized = artifactId.replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').trim();
        return sanitized.length > 0 ? sanitized : 'review-artifact';
    }

    private async readArtifactFile(filePath: string): Promise<ParsedReviewArtifactStorage> {
        const data = await fs.promises.readFile(filePath, 'utf-8');
        return this.parseStorageFile(JSON.parse(data));
    }

    private parseStorageFile(raw: unknown): ParsedReviewArtifactStorage {
        if (this.isReviewArtifactStorageFile(raw)) {
            return {
                artifact: raw.artifact,
                needsSave: raw.schemaVersion !== REVIEW_ARTIFACT_STORAGE_SCHEMA_VERSION,
            };
        }

        if (this.isReviewArtifact(raw)) {
            return {
                artifact: raw,
                needsSave: true,
            };
        }

        throw new Error('Invalid review artifact storage schema');
    }

    private isReviewArtifactStorageFile(raw: unknown): raw is ReviewArtifactStorageFile {
        if (!raw || typeof raw !== 'object') {
            return false;
        }

        const candidate = raw as Partial<ReviewArtifactStorageFile>;
        return typeof candidate.schemaVersion === 'number' && this.isReviewArtifact(candidate.artifact);
    }

    private isReviewArtifact(raw: unknown): raw is ReviewArtifact {
        if (!raw || typeof raw !== 'object') {
            return false;
        }

        const candidate = raw as Partial<ReviewArtifact>;
        return typeof candidate.id === 'string'
            && typeof candidate.version === 'number'
            && typeof candidate.kind === 'string'
            && typeof candidate.title === 'string'
            && typeof candidate.createdAt === 'string'
            && typeof candidate.updatedAt === 'string'
            && !!candidate.source
            && typeof candidate.source === 'object'
            && !!candidate.content
            && typeof candidate.content === 'object'
            && typeof (candidate.content as { rawText?: unknown }).rawText === 'string'
            && Array.isArray(candidate.annotations);
    }

    private getSortableTimestamp(rawTimestamp: string): number {
        const parsed = new Date(rawTimestamp).getTime();
        return Number.isNaN(parsed) ? 0 : parsed;
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