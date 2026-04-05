import {
    ReviewAnnotationKind,
    ReviewAnnotationStatus,
    ReviewAnnotationTarget,
    ReviewAnnotation,
    ReviewArtifact,
    ReviewArtifactContent,
    ReviewArtifactKind,
    ReviewArtifactMetadata,
    ReviewArtifactSource,
    ReviewExportState,
    TagPriority,
} from '../types';
import { ReviewArtifactExportResult, ReviewArtifactExportService } from './reviewArtifactExportService';
import { ReviewArtifactStorageManager } from './reviewArtifactStorage';

export const REVIEW_ARTIFACT_MODEL_VERSION = 1;

export interface CreateReviewArtifactInput {
    id?: string;
    version?: number;
    kind: ReviewArtifactKind;
    title: string;
    source: ReviewArtifactSource;
    content: ReviewArtifactContent;
    annotations?: ReviewAnnotation[];
    exportState?: ReviewExportState;
    createdAt?: string;
    updatedAt?: string;
}

export interface ReviewArtifactManagerOptions {
    clock?: () => Date;
    createId?: (artifact: Pick<ReviewArtifact, 'kind' | 'title' | 'createdAt'>) => string;
    storage?: ReviewArtifactStorageManager;
    exportService?: ReviewArtifactExportService;
}

export interface CreateReviewAnnotationInput {
    id?: string;
    kind: ReviewAnnotationKind;
    status?: ReviewAnnotationStatus;
    severity?: TagPriority;
    target: ReviewAnnotationTarget;
    body: string;
    suggestedReplacement?: string;
    metadata?: ReviewArtifactMetadata;
    createdAt?: string;
    updatedAt?: string;
}

export interface UpdateReviewAnnotationInput {
    kind?: ReviewAnnotationKind;
    status?: ReviewAnnotationStatus;
    severity?: TagPriority;
    target?: ReviewAnnotationTarget;
    body?: string;
    suggestedReplacement?: string;
    metadata?: ReviewArtifactMetadata;
}

export interface RecordReviewArtifactExportInput {
    adapterId: string;
    target?: 'clipboard' | 'document' | 'file';
    metadata?: ReviewArtifactMetadata;
    exportedAt?: string;
}

export class ReviewArtifactManager {
    private readonly clock: () => Date;
    private readonly createId: (artifact: Pick<ReviewArtifact, 'kind' | 'title' | 'createdAt'>) => string;
    private readonly storage: ReviewArtifactStorageManager;
    private readonly exportService: ReviewArtifactExportService;

    constructor(options: ReviewArtifactManagerOptions = {}) {
        this.clock = options.clock ?? (() => new Date());
        this.createId = options.createId ?? ((artifact) => createDefaultArtifactId(artifact.kind, artifact.title, artifact.createdAt));
        this.storage = options.storage ?? new ReviewArtifactStorageManager();
        this.exportService = options.exportService ?? new ReviewArtifactExportService();
    }

    getStorage(): ReviewArtifactStorageManager {
        return this.storage;
    }

    getExportService(): ReviewArtifactExportService {
        return this.exportService;
    }

    createAnnotation(input: CreateReviewAnnotationInput): ReviewAnnotation {
        const createdAt = input.createdAt ?? this.clock().toISOString();
        const body = input.body.trim();

        if (body.length === 0) {
            throw new Error('Review annotation body cannot be empty');
        }

        return {
            id: input.id ?? createDefaultAnnotationId(input.kind, input.target, createdAt),
            kind: input.kind,
            status: input.status ?? 'open',
            severity: input.severity,
            target: cloneTarget(input.target),
            body,
            suggestedReplacement: input.suggestedReplacement?.trim() || undefined,
            createdAt,
            updatedAt: input.updatedAt ?? createdAt,
            metadata: input.metadata ? { ...input.metadata } : undefined,
        };
    }

    createArtifact(input: CreateReviewArtifactInput): ReviewArtifact {
        const createdAt = input.createdAt ?? this.clock().toISOString();
        const title = input.title.trim() || getFallbackTitle(input.kind);

        return {
            id: input.id ?? this.createId({ kind: input.kind, title, createdAt }),
            version: input.version ?? REVIEW_ARTIFACT_MODEL_VERSION,
            kind: input.kind,
            title,
            createdAt,
            updatedAt: input.updatedAt ?? createdAt,
            source: cloneSource(input.source),
            content: cloneContent(input.content),
            annotations: cloneAnnotations(input.annotations ?? []),
            exportState: cloneExportState(input.exportState),
        };
    }

    async createAndSaveArtifact(input: CreateReviewArtifactInput): Promise<ReviewArtifact> {
        const artifact = this.createArtifact(input);
        await this.storage.saveArtifact(artifact);
        return artifact;
    }

    async saveArtifact(artifact: ReviewArtifact, options: { touchUpdatedAt?: boolean } = {}): Promise<ReviewArtifact> {
        const normalized: ReviewArtifact = {
            ...this.createArtifact(artifact),
            updatedAt: options.touchUpdatedAt === false ? artifact.updatedAt : this.clock().toISOString(),
        };

        await this.storage.saveArtifact(normalized);
        return normalized;
    }

    async getArtifact(id: string): Promise<ReviewArtifact | undefined> {
        const result = await this.storage.loadArtifact(id);
        if (result.artifact && result.needsSave) {
            await this.storage.saveArtifact(result.artifact);
        }

        return result.artifact;
    }

    async listArtifacts(filters: { kind?: ReviewArtifactKind } = {}): Promise<ReviewArtifact[]> {
        const result = await this.storage.listArtifacts();

        if (result.needsSaveIds.length > 0) {
            for (const artifact of result.artifacts) {
                if (result.needsSaveIds.includes(artifact.id)) {
                    await this.storage.saveArtifact(artifact);
                }
            }
        }

        if (!filters.kind) {
            return result.artifacts;
        }

        return result.artifacts.filter(artifact => artifact.kind === filters.kind);
    }

    async addAnnotation(artifactId: string, input: CreateReviewAnnotationInput): Promise<ReviewArtifact> {
        return this.updateArtifact(artifactId, artifact => ({
            ...artifact,
            annotations: [...artifact.annotations, this.createAnnotation(input)],
        }));
    }

    async updateAnnotation(
        artifactId: string,
        annotationId: string,
        updates: UpdateReviewAnnotationInput
    ): Promise<ReviewArtifact> {
        return this.updateArtifact(artifactId, artifact => {
            const existing = artifact.annotations.find(annotation => annotation.id === annotationId);
            if (!existing) {
                throw new Error(`Review annotation not found: ${annotationId}`);
            }

            const nextBody = updates.body !== undefined ? updates.body.trim() : existing.body;
            if (nextBody.length === 0) {
                throw new Error('Review annotation body cannot be empty');
            }

            return {
                ...artifact,
                annotations: artifact.annotations.map(annotation => {
                    if (annotation.id !== annotationId) {
                        return annotation;
                    }

                    return {
                        ...annotation,
                        kind: updates.kind ?? annotation.kind,
                        status: updates.status ?? annotation.status,
                        severity: updates.severity === undefined ? annotation.severity : updates.severity,
                        target: updates.target ? cloneTarget(updates.target) : cloneTarget(annotation.target),
                        body: nextBody,
                        suggestedReplacement: updates.suggestedReplacement === undefined
                            ? annotation.suggestedReplacement
                            : updates.suggestedReplacement.trim() || undefined,
                        updatedAt: this.clock().toISOString(),
                        metadata: updates.metadata ? { ...updates.metadata } : annotation.metadata ? { ...annotation.metadata } : undefined,
                    };
                }),
            };
        });
    }

    async removeAnnotation(artifactId: string, annotationId: string): Promise<ReviewArtifact> {
        return this.updateArtifact(artifactId, artifact => ({
            ...artifact,
            annotations: artifact.annotations.filter(annotation => annotation.id !== annotationId),
        }));
    }

    async toggleAnnotationStatus(artifactId: string, annotationId: string): Promise<ReviewArtifact> {
        return this.updateArtifact(artifactId, artifact => {
            const existing = artifact.annotations.find(annotation => annotation.id === annotationId);
            if (!existing) {
                throw new Error(`Review annotation not found: ${annotationId}`);
            }

            return {
                ...artifact,
                annotations: artifact.annotations.map(annotation => {
                    if (annotation.id !== annotationId) {
                        return annotation;
                    }

                    return {
                        ...annotation,
                        status: annotation.status === 'open' ? 'resolved' : 'open',
                        updatedAt: this.clock().toISOString(),
                    };
                }),
            };
        });
    }

    async recordExport(artifactId: string, input: RecordReviewArtifactExportInput): Promise<ReviewArtifact> {
        return this.updateArtifact(artifactId, artifact => {
            const exportedAt = input.exportedAt ?? this.clock().toISOString();
            const exports = artifact.exportState?.exports ? [...artifact.exportState.exports] : [];

            exports.push({
                adapterId: input.adapterId,
                exportedAt,
                target: input.target,
                metadata: input.metadata ? { ...input.metadata } : undefined,
            });

            return {
                ...artifact,
                exportState: {
                    lastExportedAt: exportedAt,
                    exports,
                },
            };
        });
    }

    async exportArtifact(
        artifact: ReviewArtifact,
        adapterId = 'genericMarkdown'
    ): Promise<ReviewArtifactExportResult> {
        return this.exportService.exportArtifact(artifact, adapterId);
    }

    private async updateArtifact(
        artifactId: string,
        update: (artifact: ReviewArtifact) => ReviewArtifact
    ): Promise<ReviewArtifact> {
        const artifact = await this.getArtifact(artifactId);
        if (!artifact) {
            throw new Error(`Review artifact not found: ${artifactId}`);
        }

        return this.saveArtifact(update(artifact));
    }
}

function getFallbackTitle(kind: ReviewArtifactKind): string {
    switch (kind) {
        case 'plan':
            return 'Review Plan';
        case 'aiResponse':
            return 'Review AI Response';
        case 'localDiff':
            return 'Review Local Diff';
        default:
            return 'Review Artifact';
    }
}

function createDefaultArtifactId(kind: ReviewArtifactKind, title: string, createdAt: string): string {
    const timeToken = createdAt.replace(/[-:.TZ]/g, '').toLowerCase();
    const titleToken = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48);

    return `${kind}-${timeToken}-${titleToken || 'artifact'}`;
}

function createDefaultAnnotationId(kind: ReviewAnnotationKind, target: ReviewAnnotationTarget, createdAt: string): string {
    const timeToken = createdAt.replace(/[-:.TZ]/g, '').toLowerCase();
    const targetToken = [
        target.type,
        target.sectionId,
        target.blockId,
        target.diffFileId,
        target.diffHunkId,
        typeof target.lineStart === 'number' ? String(target.lineStart) : undefined,
        typeof target.lineEnd === 'number' ? String(target.lineEnd) : undefined,
    ]
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
        .join('-')
        .replace(/[^a-zA-Z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase()
        .slice(0, 40);

    return `${kind}-${targetToken || 'target'}-${timeToken}`;
}

function cloneSource(source: ReviewArtifactSource): ReviewArtifactSource {
    return {
        ...source,
        metadata: source.metadata ? { ...source.metadata } : undefined,
    };
}

function cloneContent(content: ReviewArtifactContent): ReviewArtifactContent {
    return {
        ...content,
        metadata: content.metadata ? { ...content.metadata } : undefined,
        sections: content.sections?.map(section => ({
            ...section,
            metadata: section.metadata ? { ...section.metadata } : undefined,
        })),
        blocks: content.blocks?.map(block => ({
            ...block,
            metadata: block.metadata ? { ...block.metadata } : undefined,
        })),
        diffFiles: content.diffFiles?.map(diffFile => ({
            ...diffFile,
            metadata: diffFile.metadata ? { ...diffFile.metadata } : undefined,
            hunks: diffFile.hunks.map(hunk => ({
                ...hunk,
                lines: hunk.lines.map(line => ({ ...line })),
            })),
        })),
    };
}

function cloneAnnotations(annotations: ReviewAnnotation[]): ReviewAnnotation[] {
    return annotations
        .map(annotation => ({
            ...annotation,
            target: cloneTarget(annotation.target),
            metadata: annotation.metadata ? { ...annotation.metadata } : undefined,
        }))
        .sort((left, right) => {
            if (left.createdAt !== right.createdAt) {
                return left.createdAt.localeCompare(right.createdAt);
            }

            return left.id.localeCompare(right.id);
        });
}

function cloneTarget(target: ReviewAnnotationTarget): ReviewAnnotationTarget {
    return {
        ...target,
        metadata: target.metadata ? { ...target.metadata } : undefined,
    };
}

function cloneExportState(exportState: ReviewExportState | undefined): ReviewExportState | undefined {
    if (!exportState) {
        return undefined;
    }

    return {
        ...exportState,
        exports: exportState.exports?.map(entry => ({
            ...entry,
            metadata: entry.metadata ? { ...entry.metadata } : undefined,
        })),
    };
}