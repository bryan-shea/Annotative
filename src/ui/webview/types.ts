/**
 * Webview Message Types
 * Defines all message interfaces for communication between webview and extension
 */

import { Annotation, AnnotationTagOption } from '../../types';

/**
 * Messages sent FROM the webview TO the extension
 */
export type WebviewToExtensionCommand =
  | 'requestAnnotations'
  | 'navigate'
  | 'toggleResolved'
  | 'delete'
  | 'resolveAll'
  | 'deleteResolved'
  | 'edit'
  | 'addTag'
  | 'removeTag'
  | 'manageTags'
  | 'sidebarAction'
  | 'filterStateChanged';

export type SidebarAction =
  | 'reviewMarkdownPlan'
  | 'reviewLastAIResponse'
  | 'reviewLocalDiff'
  | 'exportForAI'
  | 'showAnnotativeCommands';

export interface WebviewMessage {
  command: WebviewToExtensionCommand;
  annotation?: Annotation;
  id?: string;
  filePath?: string;
  resolved?: boolean;
  tag?: string;
  tags?: string[];
  action?: SidebarAction;
  [key: string]: unknown;
}

/**
 * Messages sent FROM the extension TO the webview
 */
export type ExtensionToWebviewCommand =
  | 'updateAnnotations'
  | 'tagsUpdated'
  | 'annotationAdded'
  | 'annotationRemoved'
  | 'annotationUpdated'
  | 'filterStateUpdated';

export interface ExtensionMessage {
  command: ExtensionToWebviewCommand;
  annotations?: Annotation[];
  tags?: AnnotationTagOption[];
  annotation?: Annotation;
  filters?: FilterState;
  [key: string]: unknown;
}

/**
 * Filter state for annotations
 */
export interface FilterState {
  status: 'all' | 'resolved' | 'unresolved';
  tag: string;
  search: string;
  groupBy: 'file' | 'tag' | 'status' | 'folder';
}

/**
 * Grouped annotations for display
 */
export interface GroupedAnnotations {
  [groupName: string]: Annotation[];
}

/**
 * Statistics for display
 */
export interface AnnotationStats {
  total: number;
  resolved: number;
  unresolved: number;
}
