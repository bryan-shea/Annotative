import { Annotation } from '../types';
import { getRelativePathForFile, getWorkspaceNameForAnnotations } from '../utils/workspaceContext';

export function groupAnnotationsByFile(annotations: readonly Annotation[]): Map<string, Annotation[]> {
    const grouped = new Map<string, Annotation[]>();

    annotations.forEach(annotation => {
        if (!grouped.has(annotation.filePath)) {
            grouped.set(annotation.filePath, []);
        }

        grouped.get(annotation.filePath)!.push(annotation);
    });

    grouped.forEach(fileAnnotations => {
        fileAnnotations.sort((left, right) => left.range.start.line - right.range.start.line);
    });

    return grouped;
}

export { getRelativePathForFile, getWorkspaceNameForAnnotations };