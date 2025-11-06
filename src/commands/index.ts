/**
 * Commands Module
 * Exports all command registration functions
 */

import * as vscode from 'vscode';
import { AnnotationManager } from '../managers';
import { AnnotationProvider, AnnotationItem, SidebarWebview } from '../ui';
import { Annotation } from '../types';

export type CommandContext = {
    annotationManager: AnnotationManager;
    annotationProvider: AnnotationProvider;
    sidebarWebview: SidebarWebview;
    ANNOTATION_COLORS: Array<{ label: string; value: string }>;
};

// Import all command modules
export { registerAnnotationCommands } from './annotation';
export { registerExportCommands } from './export';
export { registerFilterCommands } from './filters';
export { registerBulkCommands } from './bulk';
export { registerNavigationCommands } from './navigation';
export { registerSidebarCommands } from './sidebar';
export { registerTagCommands } from './tags';
