/**
 * Webview Message Types
 * Defines all message interfaces for communication between webview and extension
 */

import { Annotation } from '../../types';

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
  | 'edit';

export interface WebviewMessage {
  command: WebviewToExtensionCommand;
  annotation?: Annotation;
  id?: string;
  filePath?: string;
  resolved?: boolean;
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
  | 'annotationUpdated';

export interface ExtensionMessage {
  command: ExtensionToWebviewCommand;
  annotations?: Annotation[];
  tags?: string[];
  annotation?: Annotation;
  [key: string]: unknown;
}

/**
 * Filter state for annotations
 */
export interface FilterState {
  status: 'all' | 'resolved' | 'unresolved';
  tag: string;
  search: string;
  groupBy: 'file' | 'tag' | 'status' | 'folder' | 'priority';
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
