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

// Enhanced tag system
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
    isPreset: boolean; // whether this is a built-in preset
}

// Backward compatibility: accept both string and AnnotationTag
export type Tag = string | AnnotationTag;

export interface Annotation {
    id: string;
    filePath: string;
    range: vscode.Range;
    text: string;
    comment: string;
    author: string;
    timestamp: Date;
    resolved: boolean;
    tags?: Tag[];
    priority?: TagPriority;
    color?: string; // Hex color code - user's visual preference only
    aiConversations?: AIConversation[];
}

export interface AnnotationDecoration {
    decoration: vscode.TextEditorDecorationType;
    ranges: vscode.DecorationOptions[];
}

export interface AnnotationStorage {
    workspaceAnnotations: { [filePath: string]: Annotation[] };
}

// Tag management
export interface TagRegistry {
    presetTags: Map<string, AnnotationTag>;
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