/**
 * Commands Module
 * Exports all command registration functions
 */

import * as vscode from 'vscode';
import { AnnotationManager } from '../managers';
import { AnnotationProvider, SidebarWebview } from '../ui';

export type CommandContext = {
    annotationManager: AnnotationManager;
    sidebarWebview: SidebarWebview;
    annotationProvider?: AnnotationProvider;
    ANNOTATION_COLORS: Array<{ label: string; value: string }>;
};

// Import all command modules
export { registerAnnotationCommands } from './annotation';
export { registerExportCommands } from './export';
export { registerFilterCommands } from './filters';
export { registerNavigationCommands } from './navigation';
export { registerSidebarCommands } from './sidebar';
export { registerTagCommands } from './tags';
