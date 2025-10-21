import { describe, it, expect, beforeEach } from 'vitest';
import { SearchTool } from '../../../src/tools/search';
import path from 'path';

describe('SearchTool', () => {
  let searchTool: SearchTool;

  beforeEach(() => {
    searchTool = new SearchTool();
    // Set to project root for testing
    searchTool.setCurrentDirectory(process.cwd());
  });

  describe('Text Search', () => {
    it('should search for text in files', async () => {
      const result = await searchTool.search('export', {
        searchType: 'text',
        includePattern: '*.ts',
        maxResults: 5
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toBeTruthy();
        expect(typeof result.output).toBe('string');
      }
    });

    it('should handle case-insensitive search', async () => {
      const result = await searchTool.search('EXPORT', {
        searchType: 'text',
        includePattern: '*.ts',
        caseSensitive: false,
        maxResults: 5
      });

      expect(result.success).toBe(true);
    });

    it('should return success even with no results', async () => {
      const result = await searchTool.search('xYz999NoMatch555NotExistHere888', {
        searchType: 'text',
        excludePattern: '*.test.ts', // Exclude test files to avoid self-reference
        maxResults: 5
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toContain('No results found');
      }
    });

    it('should respect file type filters', async () => {
      const result = await searchTool.search('test', {
        searchType: 'text',
        fileTypes: ['ts'],
        maxResults: 3
      });

      expect(result.success).toBe(true);
    });
  });

  describe('File Search', () => {
    it('should search for files by name', async () => {
      const result = await searchTool.search('package.json', {
        searchType: 'files',
        maxResults: 5
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toBeTruthy();
      }
    });

    it('should find TypeScript files', async () => {
      const result = await searchTool.search('test', {
        searchType: 'files',
        maxResults: 10
      });

      expect(result.success).toBe(true);
    });

    it('should handle pattern with extension', async () => {
      const result = await searchTool.search('.ts', {
        searchType: 'files',
        maxResults: 5
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Unified Search', () => {
    it('should search both text and files', async () => {
      const result = await searchTool.search('test', {
        searchType: 'both',
        maxResults: 5
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toBeTruthy();
      }
    });

    it('should default to both search types', async () => {
      const result = await searchTool.search('src', {
        maxResults: 5
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Search Options', () => {
    it('should respect exclude patterns', async () => {
      const result = await searchTool.search('test', {
        searchType: 'files',
        excludePattern: 'node_modules',
        maxResults: 5
      });

      expect(result.success).toBe(true);
      if (result.success && result.output) {
        expect(result.output).not.toContain('node_modules');
      }
    });

    it('should limit results with maxResults', async () => {
      const result = await searchTool.search('function', {
        searchType: 'text',
        includePattern: '*.ts',
        maxResults: 2
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle search errors gracefully', async () => {
      const result = await searchTool.search('', {
        searchType: 'text',
        maxResults: 1
      });

      // Even with empty query, should not throw but return a result
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Directory Management', () => {
    it('should get current directory', () => {
      const dir = searchTool.getCurrentDirectory();
      expect(dir).toBeTruthy();
      expect(typeof dir).toBe('string');
    });

    it('should set current directory', () => {
      const newDir = '/tmp';
      searchTool.setCurrentDirectory(newDir);
      expect(searchTool.getCurrentDirectory()).toBe(newDir);
    });
  });
});
