import * as vscode from 'vscode';
import { AnnotationManager } from './managers';
import { AnnotationProvider, SidebarWebview } from './ui';
import { registerChatParticipant, registerChatVariableIfAvailable } from './copilotChatParticipant';
import {
    registerAnnotationCommands,
    registerExportCommands,
    registerFilterCommands,
    registerBulkCommands,
    registerNavigationCommands,
    registerSidebarCommands,
    registerTagCommands,
    type CommandContext
} from './commands';

// Predefined color palette for annotations - user's visual preference only
const ANNOTATION_COLORS = [
    { label: '🟡 Yellow', value: '#ffc107' },
    { label: '🔴 Red', value: '#f44336' },
    { label: '🟠 Orange', value: '#ff9800' },
    { label: '🔵 Blue', value: '#2196f3' },
    { label: '🟢 Green', value: '#4caf50' },
    { label: '🟣 Purple', value: '#9c27b0' },
    { label: '🟤 Brown', value: '#795548' },
    { label: '⚪ Gray', value: '#9e9e9e' }
];

let annotationManager: AnnotationManager;
let annotationProvider: AnnotationProvider;
let sidebarWebview: SidebarWebview;

export function activate(context: vscode.ExtensionContext) {
    // Initialize core managers
    annotationManager = new AnnotationManager(context);
    annotationProvider = new AnnotationProvider(annotationManager);
    sidebarWebview = new SidebarWebview(context.extensionUri, annotationManager);

    // Register sidebar webview provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            SidebarWebview.viewType,
            sidebarWebview,
            { webviewOptions: { retainContextWhenHidden: true } }
        )
    );

    // Subscribe to annotation changes
    context.subscriptions.push(
        annotationManager.onDidChangeAnnotations(() => {
            sidebarWebview.refreshAnnotations();
        })
    );

    // Register Copilot Chat integration
    context.subscriptions.push(registerChatParticipant(context, annotationManager));
    const chatVariable = registerChatVariableIfAvailable(context, annotationManager);
    if (chatVariable) {
        context.subscriptions.push(chatVariable);
    }

    // Create command context
    const cmdContext: CommandContext = {
        annotationManager,
        annotationProvider,
        sidebarWebview,
        ANNOTATION_COLORS
    };

    // Register all command modules
    context.subscriptions.push(
        ...Object.values(registerAnnotationCommands(context, cmdContext)),
        ...Object.values(registerExportCommands(context, cmdContext)),
        ...Object.values(registerFilterCommands(context, cmdContext)),
        ...Object.values(registerBulkCommands(context, cmdContext)),
        ...Object.values(registerNavigationCommands(context, cmdContext)),
        ...Object.values(registerSidebarCommands(context, cmdContext)),
        ...Object.values(registerTagCommands(context, cmdContext))
    );

    // Update decorations for active editor
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                annotationManager.updateDecorations(editor);
            }
        })
    );

    if (vscode.window.activeTextEditor) {
        annotationManager.updateDecorations(vscode.window.activeTextEditor);
    }

    context.subscriptions.push(annotationManager);
}

export function deactivate() {
    annotationManager?.dispose();
    sidebarWebview?.dispose();
}
