import * as vscode from 'vscode';

export interface Annotation {
    id: string;
    filePath: string;
    range: vscode.Range;
    text: string;
    comment: string;
    author: string;
    timestamp: Date;
    resolved: boolean;
}

export interface AnnotationDecoration {
    decoration: vscode.TextEditorDecorationType;
    ranges: vscode.DecorationOptions[];
}

export interface AnnotationStorage {
    workspaceAnnotations: { [filePath: string]: Annotation[] };
}

export interface ExportData {
    annotations: Annotation[];
    exportedAt: Date;
    workspaceName: string;
}