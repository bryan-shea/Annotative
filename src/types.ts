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
