import * as vscode from 'vscode';
import { Annotation, AnnotationAnchor, StoredRange } from '../types';

const ANCHOR_CONTEXT_CHARS = 48;
const MIN_CONTEXT_CHARS = 6;

interface TextIndex {
    lineOffsets: number[];
    normalizedText: string;
    normalizedOffsets: number[];
}

interface CandidateMatch {
    startOffset: number;
    endOffset: number;
    score: number;
}

export interface ReattachmentResult {
    range: vscode.Range;
    text: string;
    anchor?: AnnotationAnchor;
    changed: boolean;
    reattached: boolean;
}

export function captureAnnotationAnchor(documentText: string, range: vscode.Range): AnnotationAnchor | undefined {
    const index = buildTextIndex(documentText);
    const offsets = clampRangeOffsets(range, documentText, index.lineOffsets);
    if (offsets.startOffset >= offsets.endOffset) {
        return undefined;
    }

    const selectedText = documentText.slice(offsets.startOffset, offsets.endOffset);
    const prefixContext = documentText.slice(Math.max(0, offsets.startOffset - ANCHOR_CONTEXT_CHARS), offsets.startOffset);
    const suffixContext = documentText.slice(offsets.endOffset, Math.min(documentText.length, offsets.endOffset + ANCHOR_CONTEXT_CHARS));

    return {
        selectedText,
        prefixContext,
        suffixContext,
        selectedTextHash: hashString(selectedText),
        normalizedTextHash: hashString(normalizeSnippet(selectedText)),
        contextHash: hashString(`${normalizeSnippet(prefixContext)}|${normalizeSnippet(suffixContext)}`),
    };
}

export function reattachAnnotation(annotation: Annotation, documentText: string): ReattachmentResult {
    const index = buildTextIndex(documentText);
    const fallbackOffsets = clampStoredRange(annotation.range, documentText, index.lineOffsets);
    const fallbackRange = createRangeFromOffsets(fallbackOffsets.startOffset, fallbackOffsets.endOffset, index.lineOffsets);
    const fallbackText = documentText.slice(fallbackOffsets.startOffset, fallbackOffsets.endOffset);
    const fallbackAnchor = captureAnnotationAnchor(documentText, fallbackRange);

    if (!annotation.anchor?.selectedText) {
        return {
            range: fallbackRange,
            text: fallbackText,
            anchor: fallbackAnchor,
            changed: !annotation.range.isEqual(fallbackRange) || annotation.text !== fallbackText || !anchorsEqual(annotation.anchor, fallbackAnchor),
            reattached: false,
        };
    }

    const anchor = annotation.anchor;
    const exactMatch = findExactAnchorMatch(anchor, documentText, index, fallbackOffsets.startOffset);
    if (exactMatch) {
        return buildResolvedResult(annotation, documentText, index.lineOffsets, exactMatch.startOffset, exactMatch.endOffset, true);
    }

    const contextualMatch = findContextualAnchorMatch(anchor, documentText, index, fallbackOffsets.startOffset);
    if (contextualMatch) {
        return buildResolvedResult(annotation, documentText, index.lineOffsets, contextualMatch.startOffset, contextualMatch.endOffset, true);
    }

    return {
        range: fallbackRange,
        text: fallbackText,
        anchor: fallbackAnchor,
        changed: !annotation.range.isEqual(fallbackRange) || annotation.text !== fallbackText || !anchorsEqual(annotation.anchor, fallbackAnchor),
        reattached: false,
    };
}

function buildResolvedResult(
    annotation: Annotation,
    documentText: string,
    lineOffsets: number[],
    startOffset: number,
    endOffset: number,
    reattached: boolean,
): ReattachmentResult {
    const range = createRangeFromOffsets(startOffset, endOffset, lineOffsets);
    const text = documentText.slice(startOffset, endOffset);
    const anchor = captureAnnotationAnchor(documentText, range);

    return {
        range,
        text,
        anchor,
        changed: !annotation.range.isEqual(range) || annotation.text !== text || !anchorsEqual(annotation.anchor, anchor),
        reattached,
    };
}

function findExactAnchorMatch(
    anchor: AnnotationAnchor,
    documentText: string,
    index: TextIndex,
    originalStartOffset: number,
): CandidateMatch | undefined {
    const normalizedNeedle = normalizeSnippet(anchor.selectedText);
    if (!normalizedNeedle) {
        return undefined;
    }

    const prefix = normalizeSnippet(anchor.prefixContext);
    const suffix = normalizeSnippet(anchor.suffixContext);
    const candidates: CandidateMatch[] = [];
    let searchIndex = 0;

    while (searchIndex <= index.normalizedText.length) {
        const matchIndex = index.normalizedText.indexOf(normalizedNeedle, searchIndex);
        if (matchIndex === -1) {
            break;
        }

        const startOffset = index.normalizedOffsets[matchIndex] ?? 0;
        const lastCharOffset = index.normalizedOffsets[matchIndex + normalizedNeedle.length - 1] ?? startOffset;
        const endOffset = Math.min(documentText.length, lastCharOffset + 1);
        let score = 55;

        if (prefix) {
            const prefixText = index.normalizedText.slice(Math.max(0, matchIndex - prefix.length), matchIndex);
            if (prefixText === prefix) {
                score += 20;
            }
        }

        if (suffix) {
            const suffixText = index.normalizedText.slice(matchIndex + normalizedNeedle.length, matchIndex + normalizedNeedle.length + suffix.length);
            if (suffixText === suffix) {
                score += 20;
            }
        }

        if (hashString(normalizeSnippet(documentText.slice(startOffset, endOffset))) === anchor.normalizedTextHash) {
            score += 10;
        }

        score += proximityScore(startOffset, originalStartOffset, Math.max(1, normalizedNeedle.length));
        candidates.push({ startOffset, endOffset, score });
        searchIndex = matchIndex + 1;
    }

    return pickBestCandidate(candidates, 65);
}

function findContextualAnchorMatch(
    anchor: AnnotationAnchor,
    documentText: string,
    index: TextIndex,
    originalStartOffset: number,
): CandidateMatch | undefined {
    const prefix = normalizeSnippet(anchor.prefixContext);
    const suffix = normalizeSnippet(anchor.suffixContext);
    const normalizedSelection = normalizeSnippet(anchor.selectedText);

    if (!prefix || !suffix || Math.max(prefix.length, suffix.length) < MIN_CONTEXT_CHARS || !normalizedSelection) {
        return undefined;
    }

    const maxGap = Math.max(normalizedSelection.length * 3, normalizedSelection.length + 80, 120);
    const candidates: CandidateMatch[] = [];
    let prefixIndex = 0;

    while (prefixIndex <= index.normalizedText.length) {
        const prefixMatchIndex = index.normalizedText.indexOf(prefix, prefixIndex);
        if (prefixMatchIndex === -1) {
            break;
        }

        let suffixIndex = prefixMatchIndex + prefix.length;
        while (suffixIndex <= index.normalizedText.length) {
            const suffixMatchIndex = index.normalizedText.indexOf(suffix, suffixIndex);
            if (suffixMatchIndex === -1) {
                break;
            }

            const normalizedGap = suffixMatchIndex - (prefixMatchIndex + prefix.length);
            if (normalizedGap <= 0) {
                suffixIndex = suffixMatchIndex + 1;
                continue;
            }

            if (normalizedGap > maxGap) {
                break;
            }

            const prefixEndOffset = (index.normalizedOffsets[prefixMatchIndex + prefix.length - 1] ?? 0) + 1;
            const suffixStartOffset = index.normalizedOffsets[suffixMatchIndex] ?? prefixEndOffset;
            if (suffixStartOffset <= prefixEndOffset) {
                suffixIndex = suffixMatchIndex + 1;
                continue;
            }

            const trimmedOffsets = trimCandidateWhitespace(anchor.selectedText, documentText, prefixEndOffset, suffixStartOffset);
            if (trimmedOffsets.endOffset <= trimmedOffsets.startOffset) {
                suffixIndex = suffixMatchIndex + 1;
                continue;
            }

            const candidateText = documentText.slice(trimmedOffsets.startOffset, trimmedOffsets.endOffset);
            const similarity = diceCoefficient(normalizedSelection, normalizeSnippet(candidateText));
            if (similarity < 0.35) {
                suffixIndex = suffixMatchIndex + 1;
                continue;
            }

            let score = 75;
            score += Math.round(similarity * 20);
            score += proximityScore(trimmedOffsets.startOffset, originalStartOffset, Math.max(1, normalizedSelection.length));
            candidates.push({ startOffset: trimmedOffsets.startOffset, endOffset: trimmedOffsets.endOffset, score });
            suffixIndex = suffixMatchIndex + 1;
        }

        prefixIndex = prefixMatchIndex + 1;
    }

    return pickBestCandidate(candidates, 85);
}

function pickBestCandidate(candidates: CandidateMatch[], minimumScore: number): CandidateMatch | undefined {
    if (candidates.length === 0) {
        return undefined;
    }

    const ranked = [...candidates].sort((left, right) => right.score - left.score);
    const best = ranked[0];
    const secondBest = ranked[1];

    if (best.score < minimumScore) {
        return undefined;
    }

    if (secondBest && best.score - secondBest.score < 15) {
        return undefined;
    }

    return best;
}

function proximityScore(candidateStart: number, originalStart: number, anchorLength: number): number {
    const distance = Math.abs(candidateStart - originalStart);
    const unit = Math.max(16, anchorLength * 2);
    return Math.max(0, 12 - Math.floor(distance / unit));
}

function diceCoefficient(left: string, right: string): number {
    if (!left || !right) {
        return 0;
    }

    if (left === right) {
        return 1;
    }

    const leftBigrams = buildBigrams(left);
    const rightBigrams = buildBigrams(right);
    const remaining = new Map<string, number>();

    rightBigrams.forEach(bigram => {
        remaining.set(bigram, (remaining.get(bigram) ?? 0) + 1);
    });

    let intersection = 0;
    leftBigrams.forEach(bigram => {
        const count = remaining.get(bigram) ?? 0;
        if (count > 0) {
            remaining.set(bigram, count - 1);
            intersection += 1;
        }
    });

    return (2 * intersection) / (leftBigrams.length + rightBigrams.length);
}

function buildBigrams(value: string): string[] {
    if (value.length < 2) {
        return [value];
    }

    const bigrams: string[] = [];
    for (let index = 0; index < value.length - 1; index += 1) {
        bigrams.push(value.slice(index, index + 2));
    }
    return bigrams;
}

function buildTextIndex(documentText: string): TextIndex {
    return {
        lineOffsets: buildLineOffsets(documentText),
        ...buildNormalizedText(documentText),
    };
}

function buildLineOffsets(documentText: string): number[] {
    const offsets = [0];
    for (let index = 0; index < documentText.length; index += 1) {
        if (documentText[index] === '\n') {
            offsets.push(index + 1);
        }
    }
    return offsets;
}

function buildNormalizedText(documentText: string): { normalizedText: string; normalizedOffsets: number[] } {
    let normalizedText = '';
    const normalizedOffsets: number[] = [];
    let pendingWhitespaceOffset: number | undefined;

    for (let index = 0; index < documentText.length; index += 1) {
        const character = documentText[index];
        if (/\s/.test(character)) {
            pendingWhitespaceOffset ??= index;
            continue;
        }

        const previousCharacter = normalizedText.length > 0 ? normalizedText[normalizedText.length - 1] : undefined;
        if (
            pendingWhitespaceOffset !== undefined
            && previousCharacter
            && !isNormalizedPunctuation(previousCharacter)
            && !isNormalizedPunctuation(character)
        ) {
            normalizedText += ' ';
            normalizedOffsets.push(pendingWhitespaceOffset);
        }

        normalizedText += character;
        normalizedOffsets.push(index);
        pendingWhitespaceOffset = undefined;
    }

    return { normalizedText, normalizedOffsets };
}

function clampStoredRange(range: vscode.Range, documentText: string, lineOffsets: number[]): { startOffset: number; endOffset: number } {
    return clampRangeOffsets(range, documentText, lineOffsets);
}

function clampRangeOffsets(
    range: vscode.Range | StoredRange,
    documentText: string,
    lineOffsets: number[],
): { startOffset: number; endOffset: number } {
    const startOffset = clampOffset(positionToOffset(range.start.line, range.start.character, documentText, lineOffsets), documentText.length);
    const endOffset = clampOffset(positionToOffset(range.end.line, range.end.character, documentText, lineOffsets), documentText.length);

    if (endOffset < startOffset) {
        return { startOffset, endOffset: startOffset };
    }

    return { startOffset, endOffset };
}

function positionToOffset(line: number, character: number, documentText: string, lineOffsets: number[]): number {
    if (line < 0) {
        return 0;
    }

    if (line >= lineOffsets.length) {
        return documentText.length;
    }

    const lineStart = lineOffsets[line];
    const nextLineStart = line + 1 < lineOffsets.length ? lineOffsets[line + 1] : documentText.length;
    return Math.min(lineStart + Math.max(0, character), nextLineStart);
}

function clampOffset(offset: number, documentLength: number): number {
    return Math.max(0, Math.min(offset, documentLength));
}

function createRangeFromOffsets(startOffset: number, endOffset: number, lineOffsets: number[]): vscode.Range {
    return new vscode.Range(offsetToPosition(startOffset, lineOffsets), offsetToPosition(endOffset, lineOffsets));
}

function offsetToPosition(offset: number, lineOffsets: number[]): vscode.Position {
    let low = 0;
    let high = lineOffsets.length - 1;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const lineStart = lineOffsets[mid];
        const nextLineStart = mid + 1 < lineOffsets.length ? lineOffsets[mid + 1] : Number.MAX_SAFE_INTEGER;

        if (offset < lineStart) {
            high = mid - 1;
            continue;
        }

        if (offset >= nextLineStart) {
            low = mid + 1;
            continue;
        }

        return new vscode.Position(mid, offset - lineStart);
    }

    const lastLine = Math.max(0, lineOffsets.length - 1);
    return new vscode.Position(lastLine, Math.max(0, offset - lineOffsets[lastLine]));
}

function normalizeSnippet(value: string): string {
    return value
        .replace(/\s+/g, ' ')
        .replace(/\s*([()[\]{}.,;:+\-*/%<>=!?&|])\s*/g, '$1')
        .trim();
}

function isNormalizedPunctuation(value: string): boolean {
    return /[()[\]{}.,;:+\-*/%<>=!?&|]/.test(value);
}

function trimCandidateWhitespace(
    selectedText: string,
    documentText: string,
    startOffset: number,
    endOffset: number,
): { startOffset: number; endOffset: number } {
    let nextStartOffset = startOffset;
    let nextEndOffset = endOffset;

    if (!/^\s/.test(selectedText)) {
        while (nextStartOffset < nextEndOffset && /\s/.test(documentText[nextStartOffset])) {
            nextStartOffset += 1;
        }
    }

    if (!/\s$/.test(selectedText)) {
        while (nextEndOffset > nextStartOffset && /\s/.test(documentText[nextEndOffset - 1])) {
            nextEndOffset -= 1;
        }
    }

    return { startOffset: nextStartOffset, endOffset: nextEndOffset };
}

function hashString(value: string): string {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}

function anchorsEqual(left?: AnnotationAnchor, right?: AnnotationAnchor): boolean {
    if (!left && !right) {
        return true;
    }

    if (!left || !right) {
        return false;
    }

    return left.selectedText === right.selectedText
        && left.prefixContext === right.prefixContext
        && left.suffixContext === right.suffixContext
        && left.selectedTextHash === right.selectedTextHash
        && left.normalizedTextHash === right.normalizedTextHash
        && left.contextHash === right.contextHash;
}