import * as vscode from 'vscode';
import { CopilotExporter } from '../copilotExporter';
import {
    Annotation,
    AnnotationStatistics,
    ExportData,
    ExportOptions,
} from '../types';
import { resolveWorkspaceFolderForAnnotations } from '../utils/workspaceContext';
import { AnnotationExporter } from './annotationExporter';

export type CopilotPreferredFormat = 'conversational' | 'structured' | 'compact';
export type CopilotIntent = 'review' | 'bugs' | 'optimization' | 'documentation';

export interface PreparedExport {
    annotations: Annotation[];
    content: string;
    language: 'markdown' | 'xml';
}

export interface RuntimeExportSettings {
    contextLines: number;
    includeImports: boolean;
    copilotEnabled: boolean;
    autoAttachContext: boolean;
    preferredFormat: CopilotPreferredFormat;
    autoOpenChat: boolean;
}

export class AnnotationExportService {
    private annotationExporter: AnnotationExporter;

    constructor(
        private annotations: Map<string, Annotation[]>,
        resolveTagLabels: (tagIds?: readonly string[]) => string[] = (tagIds) => [...(tagIds || [])]
    ) {
        this.annotationExporter = new AnnotationExporter(this.annotations, resolveTagLabels);
    }

    getRuntimeSettings(): RuntimeExportSettings {
        const config = vscode.workspace.getConfiguration('annotative');

        return {
            contextLines: Math.max(0, config.get<number>('export.contextLines', 5)),
            includeImports: config.get<boolean>('export.includeImports', true),
            copilotEnabled: config.get<boolean>('copilot.enabled', true),
            autoAttachContext: config.get<boolean>('copilot.autoAttachContext', true),
            preferredFormat: config.get<CopilotPreferredFormat>('copilot.preferredFormat', 'conversational'),
            autoOpenChat: config.get<boolean>('copilot.autoOpenChat', false),
        };
    }

    isCopilotEnabled(): boolean {
        return this.getRuntimeSettings().copilotEnabled;
    }

    getAllAnnotations(): Annotation[] {
        return this.annotationExporter.getAllAnnotations();
    }

    getAnnotationsForFile(filePath: string): Annotation[] {
        return this.annotationExporter.getAnnotationsForFile(filePath);
    }

    getAllTags(): string[] {
        return this.annotationExporter.getAllTags();
    }

    getStatistics(): AnnotationStatistics {
        return this.annotationExporter.getStatistics();
    }

    async exportAnnotations(): Promise<ExportData> {
        return this.annotationExporter.exportAnnotations();
    }

    async exportToMarkdown(): Promise<string> {
        return this.annotationExporter.exportToMarkdown();
    }

    prepareCopilotExport(annotations: Annotation[]): PreparedExport {
        const settings = this.getRuntimeSettings();

        switch (settings.preferredFormat) {
            case 'structured':
                return {
                    annotations,
                    content: CopilotExporter.exportForCopilotContext(annotations),
                    language: 'xml',
                };
            case 'compact':
                return {
                    annotations,
                    content: CopilotExporter.exportCompact(annotations),
                    language: 'markdown',
                };
            case 'conversational':
            default:
                return {
                    annotations,
                    content: CopilotExporter.exportForCopilotChat(annotations),
                    language: 'markdown',
                };
        }
    }

    prepareCopilotIntentExport(annotations: Annotation[], intent: CopilotIntent): PreparedExport {
        const filtered = CopilotExporter.filterByIntent(annotations, intent);
        const settings = this.getRuntimeSettings();

        if (settings.preferredFormat === 'conversational') {
            return {
                annotations: filtered.annotations,
                content: CopilotExporter.exportForCopilotChat(filtered.annotations, filtered.title),
                language: 'markdown',
            };
        }

        return this.prepareCopilotExport(filtered.annotations);
    }

    prepareAIExport(
        annotations: Annotation[],
        format: ExportOptions['format'],
        includeResolved: boolean
    ): PreparedExport {
        const settings = this.getRuntimeSettings();

        return {
            annotations,
            content: CopilotExporter.exportForAI(annotations, {
                format,
                includeResolved,
                contextLines: settings.contextLines,
                includeImports: settings.includeImports,
                includeFunction: false,
            }),
            language: format === 'claude' ? 'xml' : 'markdown',
        };
    }

    async formatAnnotationForCopilot(annotation: Annotation): Promise<string> {
        const settings = this.getRuntimeSettings();
        if (!settings.autoAttachContext) {
            return CopilotExporter.formatAsQuickContext(annotation);
        }

        return CopilotExporter.formatAnnotationForCopilot(annotation, {
            contextLines: settings.contextLines,
            includeImports: settings.includeImports,
            smartContext: true,
        });
    }

    async formatQuickCopilotContext(annotation: Annotation): Promise<string> {
        return CopilotExporter.formatAsQuickContext(annotation);
    }

    async saveCopilotExport(annotations: Annotation[], sessionName?: string): Promise<string[]> {
        const workspaceFolder = resolveWorkspaceFolderForAnnotations(annotations);
        if (!workspaceFolder) {
            throw new Error('No workspace folder available for export');
        }

        return CopilotExporter.exportToWorkspace(annotations, workspaceFolder.uri.fsPath, sessionName);
    }

    async openCopilotChatIfConfigured(force = false): Promise<boolean> {
        if (!force && !this.getRuntimeSettings().autoOpenChat) {
            return false;
        }

        try {
            await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
            return true;
        } catch {
            return false;
        }
    }
}