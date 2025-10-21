/**
 * Text manipulation utilities for terminal input handling
 * Inspired by Gemini CLI's text processing capabilities
 */
export interface TextPosition {
    index: number;
    line: number;
    column: number;
}
export interface TextSelection {
    start: number;
    end: number;
}
/**
 * Check if a character is a word boundary
 */
export declare function isWordBoundary(char: string | undefined): boolean;
/**
 * Find the start of the current word at the given position
 */
export declare function findWordStart(text: string, position: number): number;
/**
 * Find the end of the current word at the given position
 */
export declare function findWordEnd(text: string, position: number): number;
/**
 * Move cursor to the previous word boundary
 */
export declare function moveToPreviousWord(text: string, position: number): number;
/**
 * Move cursor to the next word boundary
 */
export declare function moveToNextWord(text: string, position: number): number;
/**
 * Delete the word before the cursor
 */
export declare function deleteWordBefore(text: string, position: number): {
    text: string;
    position: number;
};
/**
 * Delete the word after the cursor
 */
export declare function deleteWordAfter(text: string, position: number): {
    text: string;
    position: number;
};
/**
 * Get the current line and column from text position
 */
export declare function getTextPosition(text: string, index: number): TextPosition;
/**
 * Move to the beginning of the current line
 */
export declare function moveToLineStart(text: string, position: number): number;
/**
 * Move to the end of the current line
 */
export declare function moveToLineEnd(text: string, position: number): number;
/**
 * Handle proper Unicode-aware character deletion
 */
export declare function deleteCharBefore(text: string, position: number): {
    text: string;
    position: number;
};
/**
 * Handle proper Unicode-aware character deletion forward
 */
export declare function deleteCharAfter(text: string, position: number): {
    text: string;
    position: number;
};
/**
 * Insert text at the given position with proper Unicode handling
 */
export declare function insertText(text: string, position: number, insert: string): {
    text: string;
    position: number;
};
