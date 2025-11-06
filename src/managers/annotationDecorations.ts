import * as vscode from 'vscode';
import { Annotation } from '../types';

/**
 * Manages editor decorations for annotations
 * Handles styling and visual representation
 */
export class AnnotationDecorations {
    private decorationTypes: Map<string, vscode.TextEditorDecorationType> = new Map();

    /**
     * Update decorations for an editor
     */
    updateDecorations(editor: vscode.TextEditor, fileAnnotations: Annotation[]): void {
        const unresolvedAnnotations = fileAnnotations.filter(annotation => !annotation.resolved);

        // Group annotations by color
        const annotationsByColor = new Map<string, vscode.DecorationOptions[]>();

        unresolvedAnnotations.forEach(annotation => {
            const color = annotation.color || '#ffc107'; // Default to yellow

            if (!annotationsByColor.has(color)) {
                annotationsByColor.set(color, []);
            }

            annotationsByColor.get(color)!.push({
                range: annotation.range,
                hoverMessage: new vscode.MarkdownString(
                    `**Annotation by ${annotation.author}**\n\n${annotation.comment}\n\n*${annotation.timestamp.toLocaleString()}*`
                )
            });
        });

        // Clear all existing decorations first
        this.decorationTypes.forEach(decorationType => {
            editor.setDecorations(decorationType, []);
        });

        // Apply decorations for each color group
        annotationsByColor.forEach((decorationOptions, color) => {
            const decorationType = this.getDecorationTypeForColor(color);
            editor.setDecorations(decorationType, decorationOptions);
        });
    }

    /**
     * Clear all decorations
     */
    clearDecorations(editor: vscode.TextEditor): void {
        this.decorationTypes.forEach(decorationType => {
            editor.setDecorations(decorationType, []);
        });
    }

    /**
     * Dispose all decoration types
     */
    dispose(): void {
        this.decorationTypes.forEach(decorationType => {
            decorationType.dispose();
        });
        this.decorationTypes.clear();
    }

    /**
     * Create or get a decoration type for a specific color
     */
    private getDecorationTypeForColor(color: string): vscode.TextEditorDecorationType {
        if (!this.decorationTypes.has(color)) {
            // Convert hex to rgba for background (20% opacity)
            const rgbaBackground = this.hexToRgba(color, 0.2);
            const rgbaBorder = this.hexToRgba(color, 0.5);

            const decorationType = vscode.window.createTextEditorDecorationType({
                backgroundColor: rgbaBackground,
                border: `1px solid ${rgbaBorder}`,
                borderRadius: '2px',
                isWholeLine: false,
                after: {
                    contentText: '',
                    color: color,
                    fontWeight: 'bold'
                }
            });

            this.decorationTypes.set(color, decorationType);
        }

        return this.decorationTypes.get(color)!;
    }

    /**
     * Convert hex color to rgba
     */
    private hexToRgba(hex: string, alpha: number): string {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
}
