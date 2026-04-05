import * as vscode from 'vscode';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export interface AIConversation {
    id: string;
    timestamp: Date;
    messages: ChatMessage[];
    model: string;
    resolved: boolean;
}

// Tag system - fully user-defined
export type TagCategory = 'issue' | 'action' | 'reference' | 'meta' | 'custom';
export type TagPriority = 'low' | 'medium' | 'high' | 'critical';

export interface TagMetadata {
    priority?: TagPriority;
    color?: string;
    icon?: string;
    description?: string;
}

export interface AnnotationTag {
    id: string;
    name: string;
    category: TagCategory;
    metadata?: TagMetadata;
    isPreset: boolean; // Always false for user-created tags
}

export interface AnnotationTagOption {
    id: string;
    label: string;
    color?: string;
    priority?: TagPriority;
}

export interface AnnotationAnchor {
    selectedText: string;
    prefixContext: string;
    suffixContext: string;
    selectedTextHash: string;
    normalizedTextHash: string;
    contextHash: string;
}

export interface Annotation {
    id: string;
    filePath: string;
    range: vscode.Range;
    text: string;
    comment: string;
    author: string;
    timestamp: Date;
    resolved: boolean;        // Resolution status - open (false) or resolved (true)
    tags?: string[];
    priority?: TagPriority;
    color?: string;           // Hex color code - user's visual preference only
    aiConversations?: AIConversation[];
    anchor?: AnnotationAnchor;
}

export interface AnnotationDecoration {
    decoration: vscode.TextEditorDecorationType;
    ranges: vscode.DecorationOptions[];
}

export interface AnnotationStorage {
    schemaVersion: number;
    workspaceAnnotations: { [filePath: string]: Annotation[] };
}

export interface StoredPosition {
    line: number;
    character: number;
}

export interface StoredRange {
    start: StoredPosition;
    end: StoredPosition;
}

export type LegacyStoredTag = string | AnnotationTag;
export type Tag = string | AnnotationTag;

export interface StoredAnnotation extends Omit<Annotation, 'range' | 'timestamp' | 'tags'> {
    range: StoredRange;
    timestamp: string;
    tags?: LegacyStoredTag[];
}

export interface AnnotationStorageFile {
    schemaVersion: number;
    workspaceAnnotations: { [filePath: string]: StoredAnnotation[] };
}

export interface TagStorageFile {
    schemaVersion: number;
    customTags: AnnotationTag[];
}

// Tag management
export interface TagRegistry {
    customTags: Map<string, AnnotationTag>;
}

export interface TagSuggestion {
    tag: AnnotationTag;
    confidence: number; // 0-1
    reason: 'keyword' | 'pattern' | 'context' | 'history';
}

export interface ExportData {
    annotations: Annotation[];
    exportedAt: Date;
    workspaceName: string;
}

export interface ExportOptions {
    format: 'copilot' | 'chatgpt' | 'claude' | 'generic';
    includeResolved: boolean;
    contextLines: number;
    includeImports: boolean;
    includeFunction: boolean;
}

export interface CopilotExportOptions {
    contextLines?: number;
    includeImports?: boolean;
    includeFunction?: boolean;
    smartContext?: boolean;
}

export interface AnnotationStatistics {
    total: number;
    resolved: number;
    unresolved: number;
    byFile: Map<string, { total: number; resolved: number; unresolved: number }>;
}

export type ReviewArtifactKind = 'plan' | 'aiResponse' | 'localDiff';
export type ReviewArtifactSourceType = 'markdownFile' | 'chatResponse' | 'gitDiff' | 'manualPaste';
export type ReviewAnnotationKind = 'comment' | 'issue' | 'requestChange' | 'question' | 'risk' | 'testGap' | 'maintainability';
export type ReviewAnnotationStatus = 'open' | 'resolved';
export type ReviewAnnotationTargetType = 'artifact' | 'section' | 'block' | 'diffFile' | 'diffHunk' | 'lineRange';
export type ReviewArtifactDiffFileStatus = 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'unknown';
export type ReviewArtifactDiffLineType = 'context' | 'add' | 'delete';
export type ReviewArtifactBlockKind = 'paragraph' | 'list' | 'code' | 'quote' | 'table' | 'other';
export type ReviewArtifactMetadataValue = string | number | boolean | null;
export type ReviewArtifactMetadata = Record<string, ReviewArtifactMetadataValue>;

export interface ReviewArtifactSource {
    type: ReviewArtifactSourceType;
    uri?: string;
    workspaceFolder?: string;
    revision?: string;
    metadata?: ReviewArtifactMetadata;
}

export interface ReviewArtifactSection {
    id: string;
    heading?: string;
    level: number;
    order: number;
    content: string;
    lineStart?: number;
    lineEnd?: number;
    metadata?: ReviewArtifactMetadata;
}

export interface ReviewArtifactBlock {
    id: string;
    sectionId?: string;
    kind: ReviewArtifactBlockKind;
    order: number;
    content: string;
    lineStart?: number;
    lineEnd?: number;
    metadata?: ReviewArtifactMetadata;
}

export interface ReviewArtifactDiffLine {
    type: ReviewArtifactDiffLineType;
    content: string;
    oldLineNumber?: number;
    newLineNumber?: number;
}

export interface ReviewArtifactDiffHunk {
    id: string;
    header: string;
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    lines: ReviewArtifactDiffLine[];
}

export interface ReviewArtifactDiffFile {
    id: string;
    oldPath: string;
    newPath: string;
    status: ReviewArtifactDiffFileStatus;
    hunks: ReviewArtifactDiffHunk[];
    metadata?: ReviewArtifactMetadata;
}

export interface ReviewArtifactContent {
    rawText: string;
    sections?: ReviewArtifactSection[];
    blocks?: ReviewArtifactBlock[];
    diffFiles?: ReviewArtifactDiffFile[];
    metadata?: ReviewArtifactMetadata;
}

export interface ReviewAnnotationTarget {
    type: ReviewAnnotationTargetType;
    sectionId?: string;
    blockId?: string;
    diffFileId?: string;
    diffHunkId?: string;
    lineStart?: number;
    lineEnd?: number;
    metadata?: ReviewArtifactMetadata;
}

export interface ReviewAnnotation {
    id: string;
    kind: ReviewAnnotationKind;
    status: ReviewAnnotationStatus;
    severity?: TagPriority;
    target: ReviewAnnotationTarget;
    body: string;
    suggestedReplacement?: string;
    createdAt: string;
    updatedAt: string;
    metadata?: ReviewArtifactMetadata;
}

export interface ReviewExportRecord {
    adapterId: string;
    exportedAt: string;
    target?: 'clipboard' | 'document' | 'file';
    metadata?: ReviewArtifactMetadata;
}

export interface ReviewExportState {
    lastExportedAt?: string;
    exports?: ReviewExportRecord[];
}

export interface ReviewArtifact {
    id: string;
    version: number;
    kind: ReviewArtifactKind;
    title: string;
    createdAt: string;
    updatedAt: string;
    source: ReviewArtifactSource;
    content: ReviewArtifactContent;
    annotations: ReviewAnnotation[];
    exportState?: ReviewExportState;
}

export interface ReviewArtifactStorageFile {
    schemaVersion: number;
    artifact: ReviewArtifact;
}
