import {
    ReviewAnnotation,
    ReviewArtifact,
    ReviewArtifactContent,
    ReviewArtifactKind,
    ReviewArtifactSource,
    ReviewExportState,
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

    async exportArtifact(
        artifact: ReviewArtifact,
        adapterId = 'genericMarkdown'
    ): Promise<ReviewArtifactExportResult> {
        return this.exportService.exportArtifact(artifact, adapterId);
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
            target: {
                ...annotation.target,
                metadata: annotation.target.metadata ? { ...annotation.target.metadata } : undefined,
            },
            metadata: annotation.metadata ? { ...annotation.metadata } : undefined,
        }))
        .sort((left, right) => {
            if (left.createdAt !== right.createdAt) {
                return left.createdAt.localeCompare(right.createdAt);
            }

            return left.id.localeCompare(right.id);
        });
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