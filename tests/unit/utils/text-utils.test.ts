import { describe, it, expect } from 'vitest';
import {
  isWordBoundary,
  findWordStart,
  findWordEnd,
  moveToPreviousWord,
  moveToNextWord,
  deleteWordBefore,
  deleteWordAfter,
  getTextPosition,
  moveToLineStart,
  moveToLineEnd,
  deleteCharBefore,
  deleteCharAfter,
  insertText,
} from '../../../src/utils/text-utils';

describe('TextUtils', () => {
  describe('isWordBoundary', () => {
    it('should identify word boundaries correctly', () => {
      expect(isWordBoundary(' ')).toBe(true);
      expect(isWordBoundary('\t')).toBe(true);
      expect(isWordBoundary('\n')).toBe(true);
      expect(isWordBoundary('.')).toBe(true);
      expect(isWordBoundary(',')).toBe(true);
      expect(isWordBoundary(undefined)).toBe(true);
    });

    it('should identify non-boundaries correctly', () => {
      expect(isWordBoundary('a')).toBe(false);
      expect(isWordBoundary('Z')).toBe(false);
      expect(isWordBoundary('5')).toBe(false);
      expect(isWordBoundary('_')).toBe(false);
    });
  });

  describe('findWordStart', () => {
    it('should find start of current word', () => {
      const text = 'hello world';
      expect(findWordStart(text, 8)).toBe(6); // Position in 'world'
      expect(findWordStart(text, 3)).toBe(0); // Position in 'hello'
    });

    it('should handle position at start', () => {
      const text = 'hello';
      expect(findWordStart(text, 0)).toBe(0);
    });
  });

  describe('findWordEnd', () => {
    it('should find end of current word', () => {
      const text = 'hello world';
      expect(findWordEnd(text, 0)).toBe(5); // 'hello'
      expect(findWordEnd(text, 6)).toBe(11); // 'world'
    });

    it('should handle position at end', () => {
      const text = 'hello';
      expect(findWordEnd(text, 5)).toBe(5);
    });
  });

  describe('moveToPreviousWord', () => {
    it('should move to start of previous word', () => {
      const text = 'one two three';
      expect(moveToPreviousWord(text, 13)).toBe(8); // from 'three' to 'two'
      expect(moveToPreviousWord(text, 8)).toBe(4); // from 'two' to 'one'
    });

    it('should handle start of text', () => {
      const text = 'hello';
      expect(moveToPreviousWord(text, 0)).toBe(0);
    });
  });

  describe('moveToNextWord', () => {
    it('should move to start of next word', () => {
      const text = 'one two three';
      expect(moveToNextWord(text, 0)).toBe(4); // from 'one' to 'two'
      expect(moveToNextWord(text, 4)).toBe(8); // from 'two' to 'three'
    });

    it('should handle end of text', () => {
      const text = 'hello';
      expect(moveToNextWord(text, 5)).toBe(5);
    });
  });

  describe('deleteWordBefore', () => {
    it('should delete the word before cursor', () => {
      const text = 'hello world';
      const result = deleteWordBefore(text, 11);
      expect(result.text).toBe('hello ');
      expect(result.position).toBe(6);
    });
  });

  describe('deleteWordAfter', () => {
    it('should delete the word after cursor', () => {
      const text = 'hello world';
      const result = deleteWordAfter(text, 0);
      expect(result.text).toBe('world');
      expect(result.position).toBe(0);
    });
  });

  describe('getTextPosition', () => {
    it('should get line and column from index', () => {
      const text = 'line1\nline2\nline3';
      const pos = getTextPosition(text, 8);
      expect(pos.line).toBe(1);
      expect(pos.column).toBe(2);
      expect(pos.index).toBe(8);
    });

    it('should handle first line', () => {
      const text = 'hello\nworld';
      const pos = getTextPosition(text, 3);
      expect(pos.line).toBe(0);
      expect(pos.column).toBe(3);
    });
  });

  describe('moveToLineStart', () => {
    it('should move to start of current line', () => {
      const text = 'line1\nline2\nline3';
      expect(moveToLineStart(text, 8)).toBe(6); // Start of 'line2'
    });

    it('should handle first line', () => {
      const text = 'line1\nline2';
      expect(moveToLineStart(text, 3)).toBe(0);
    });
  });

  describe('moveToLineEnd', () => {
    it('should move to end of current line', () => {
      const text = 'line1\nline2\nline3';
      expect(moveToLineEnd(text, 0)).toBe(5); // End of 'line1'
      expect(moveToLineEnd(text, 6)).toBe(11); // End of 'line2'
    });

    it('should handle last line', () => {
      const text = 'line1\nline2';
      expect(moveToLineEnd(text, 6)).toBe(11);
    });
  });

  describe('deleteCharBefore', () => {
    it('should delete single character', () => {
      const text = 'hello';
      const result = deleteCharBefore(text, 5);
      expect(result.text).toBe('hell');
      expect(result.position).toBe(4);
    });

    it('should handle start of text', () => {
      const text = 'hello';
      const result = deleteCharBefore(text, 0);
      expect(result.text).toBe('hello');
      expect(result.position).toBe(0);
    });
  });

  describe('deleteCharAfter', () => {
    it('should delete single character forward', () => {
      const text = 'hello';
      const result = deleteCharAfter(text, 0);
      expect(result.text).toBe('ello');
      expect(result.position).toBe(0);
    });

    it('should handle end of text', () => {
      const text = 'hello';
      const result = deleteCharAfter(text, 5);
      expect(result.text).toBe('hello');
      expect(result.position).toBe(5);
    });
  });

  describe('insertText', () => {
    it('should insert text at position', () => {
      const text = 'hello world';
      const result = insertText(text, 6, 'beautiful ');
      expect(result.text).toBe('hello beautiful world');
      expect(result.position).toBe(16);
    });

    it('should insert at start', () => {
      const text = 'world';
      const result = insertText(text, 0, 'hello ');
      expect(result.text).toBe('hello world');
      expect(result.position).toBe(6);
    });

    it('should insert at end', () => {
      const text = 'hello';
      const result = insertText(text, 5, ' world');
      expect(result.text).toBe('hello world');
      expect(result.position).toBe(11);
    });
  });
});
