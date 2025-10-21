import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionManager } from '../../src/utils/session-manager.js';
import { FileWatcher } from '../../src/utils/file-watcher.js';
import { BatchEditorTool } from '../../src/tools/batch-editor.js';
import { ChatEntry } from '../../src/agent/zai-agent.js';
import { ConfirmationService } from '../../src/utils/confirmation-service.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Feature Integration', () => {
  let testDir: string;
  let sessionManager: SessionManager;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), 'zai-integration-test-' + Date.now());
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });

    sessionManager = new SessionManager();
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  describe('Session Persistence', () => {
    it('should save and load sessions', () => {
      const chatHistory: ChatEntry[] = [
        { type: 'user', content: 'Hello', timestamp: new Date() },
        { type: 'assistant', content: 'Hi', timestamp: new Date() },
      ];

      const metadata = sessionManager.saveSession(
        'test-session',
        chatHistory,
        {
          workingDirectory: testDir,
          model: 'glm-4.6',
        }
      );

      expect(metadata.name).toBe('test-session');
      expect(metadata.messageCount).toBe(2);

      const loaded = sessionManager.loadSession(metadata.id);
      expect(loaded).toBeTruthy();
      expect(loaded?.chatHistory.length).toBe(2);

      // Cleanup
      sessionManager.deleteSession(metadata.id);
    });

    it('should export session to markdown', () => {
      const chatHistory: ChatEntry[] = [
        { type: 'user', content: 'Test question', timestamp: new Date() },
        { type: 'assistant', content: 'Test answer', timestamp: new Date() },
      ];

      const metadata = sessionManager.saveSession(
        'export-test',
        chatHistory,
        { workingDirectory: testDir, model: 'glm-4.6' }
      );

      const mdPath = path.join(testDir, 'session.md');
      const markdown = sessionManager.exportSessionToMarkdown(metadata.id, mdPath);

      expect(markdown).toBeTruthy();
      expect(markdown).toContain('# export-test');
      expect(markdown).toContain('Test question');
      expect(fs.existsSync(mdPath)).toBe(true);

      // Cleanup
      sessionManager.deleteSession(metadata.id);
    });

    it('should list all sessions', () => {
      const chatHistory: ChatEntry[] = [
        { type: 'user', content: 'Hello', timestamp: new Date() },
      ];

      const session1 = sessionManager.saveSession(
        'session-1',
        chatHistory,
        { workingDirectory: testDir, model: 'glm-4.6' }
      );

      const session2 = sessionManager.saveSession(
        'session-2',
        chatHistory,
        { workingDirectory: testDir, model: 'glm-4.5' }
      );

      const sessions = sessionManager.listSessions();
      expect(sessions.length).toBeGreaterThanOrEqual(2);

      const sessionNames = sessions.map(s => s.name);
      expect(sessionNames).toContain('session-1');
      expect(sessionNames).toContain('session-2');

      // Cleanup
      sessionManager.deleteSession(session1.id);
      sessionManager.deleteSession(session2.id);
    });
  });

  describe('Batch Edit Tool', () => {
    it('should perform search-replace on multiple files', async () => {
      // Mock confirmation service to auto-approve
      const confirmationService = ConfirmationService.getInstance();
      vi.spyOn(confirmationService, 'requestConfirmation').mockResolvedValue({ confirmed: true });

      const batchEditor = new BatchEditorTool();

      // Create test files
      const file1 = path.join(testDir, 'test1.ts');
      const file2 = path.join(testDir, 'test2.ts');

      fs.writeFileSync(file1, 'const oldName = 123;');
      fs.writeFileSync(file2, 'function oldName() {}');

      const result = await batchEditor.batchEdit({
        type: 'search-replace',
        files: [file1, file2],
        params: {
          search: 'oldName',
          replace: 'newName',
        },
      });

      if (!result.success) {
        console.log('Batch edit failed:', result.error);
      }
      expect(result.success).toBe(true);
      expect(fs.readFileSync(file1, 'utf-8')).toContain('newName');
      expect(fs.readFileSync(file2, 'utf-8')).toContain('newName');

      vi.restoreAllMocks();
    }, 10000);

    it('should handle errors gracefully', async () => {
      const batchEditor = new BatchEditorTool();

      const result = await batchEditor.batchEdit({
        type: 'search-replace',
        files: ['/nonexistent/file.ts'],
        params: {
          search: 'test',
          replace: 'new',
        },
      });

      // Should not crash, should report failure
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should apply changes to multiple specified files', async () => {
      // Mock confirmation service to auto-approve
      const confirmationService = ConfirmationService.getInstance();
      vi.spyOn(confirmationService, 'requestConfirmation').mockResolvedValue({ confirmed: true });

      const batchEditor = new BatchEditorTool();

      // Create multiple TypeScript files
      const srcDir = path.join(testDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      const file1 = path.join(srcDir, 'file1.ts');
      const file2 = path.join(srcDir, 'file2.ts');
      const mdFile = path.join(srcDir, 'readme.md');

      fs.writeFileSync(file1, 'const VERSION = "1.0.0";');
      fs.writeFileSync(file2, 'const VERSION = "1.0.0";');
      fs.writeFileSync(mdFile, 'const VERSION = "1.0.0";');

      const result = await batchEditor.batchEdit({
        type: 'search-replace',
        files: [file1, file2], // Explicitly list only TS files
        params: {
          search: '1.0.0',
          replace: '2.0.0',
        },
      });

      expect(result.success).toBe(true);

      // TypeScript files should be updated
      expect(fs.readFileSync(file1, 'utf-8')).toContain('2.0.0');
      expect(fs.readFileSync(file2, 'utf-8')).toContain('2.0.0');

      // Markdown file should NOT be updated
      expect(fs.readFileSync(mdFile, 'utf-8')).toContain('1.0.0');

      vi.restoreAllMocks();
    }, 10000);
  });

  describe('File Watcher', () => {
    it('should detect file changes', (done) => {
      const watcher = new FileWatcher();
      const testFile = path.join(testDir, 'watch-test.txt');

      watcher.start(testDir);

      watcher.once('change', (event) => {
        try {
          expect(event.path).toContain('watch-test.txt');
          expect(event.type).toBe('add');
          watcher.stop();
          done();
        } catch (error) {
          watcher.stop();
          done(error);
        }
      });

      // Create file after watcher is ready
      watcher.once('ready', () => {
        setTimeout(() => {
          try {
            if (fs.existsSync(testDir)) {
              fs.writeFileSync(testFile, 'test content');
            }
          } catch (error) {
            watcher.stop();
            done(error);
          }
        }, 200);
      });
    }, 7000);

    it('should detect file modifications', (done) => {
      const watcher = new FileWatcher();
      const testFile = path.join(testDir, 'modify-test.txt');

      // Create file before starting watcher
      fs.writeFileSync(testFile, 'initial content');

      watcher.start(testDir);

      watcher.once('change', (event) => {
        try {
          expect(event.type).toBe('change');
          expect(event.path).toContain('modify-test.txt');
          watcher.stop();
          done();
        } catch (error) {
          watcher.stop();
          done(error);
        }
      });

      watcher.once('ready', () => {
        setTimeout(() => {
          try {
            if (fs.existsSync(testFile)) {
              fs.writeFileSync(testFile, 'modified content');
            }
          } catch (error) {
            watcher.stop();
            done(error);
          }
        }, 200);
      });
    }, 7000);

    it('should ignore files in node_modules', (done) => {
      const watcher = new FileWatcher();
      const nodeModulesDir = path.join(testDir, 'node_modules');
      fs.mkdirSync(nodeModulesDir, { recursive: true });

      let changeDetected = false;

      watcher.on('change', () => {
        changeDetected = true;
      });

      watcher.start(testDir);

      watcher.once('ready', () => {
        try {
          // Create file in node_modules - should be ignored
          if (fs.existsSync(nodeModulesDir)) {
            fs.writeFileSync(path.join(nodeModulesDir, 'test.txt'), 'content');
          }

          setTimeout(() => {
            try {
              expect(changeDetected).toBe(false);
              watcher.stop();
              done();
            } catch (error) {
              watcher.stop();
              done(error);
            }
          }, 1500);
        } catch (error) {
          watcher.stop();
          done(error);
        }
      });
    }, 7000);
  });

  describe('Error System', () => {
    it('should create typed errors with suggestions', async () => {
      const { FileNotFoundError } = await import('../../src/errors/tool-errors.js');

      const error = new FileNotFoundError('/test/file.txt', 'read');

      expect(error.name).toBe('FileNotFoundError');
      expect(error.code).toBe('FILE_OPERATION_ERROR');
      expect(error.suggestions.length).toBeGreaterThan(0);
      expect(error.formatForUser()).toContain('Suggestions:');
    });

    it('should include context in errors', async () => {
      const { BashCommandError } = await import('../../src/errors/tool-errors.js');

      const error = new BashCommandError('ls /nonexistent', 127, 'command not found', {
        workingDir: '/tmp'
      });

      expect(error.code).toBe('BASH_COMMAND_ERROR');
      expect(error.context.command).toBe('ls /nonexistent');
      expect(error.context.exitCode).toBe(127);
    });

    it('should format errors for user display', async () => {
      const { ToolExecutionError } = await import('../../src/errors/tool-errors.js');

      const error = new ToolExecutionError(
        'test-tool',
        'Something went wrong',
        { param1: 'value1' }
      );

      const formatted = error.formatForUser();
      expect(formatted).toContain('test-tool');
      expect(formatted).toContain('Suggestions:');
    });
  });

  describe('Integration Workflow', () => {
    it('should handle complete workflow: edit files, save session, export', async () => {
      // Mock confirmation service to auto-approve
      const confirmationService = ConfirmationService.getInstance();
      vi.spyOn(confirmationService, 'requestConfirmation').mockResolvedValue({ confirmed: true });

      const batchEditor = new BatchEditorTool();

      // Step 1: Create and edit files
      const file1 = path.join(testDir, 'app.ts');
      const file2 = path.join(testDir, 'config.ts');

      fs.writeFileSync(file1, 'export const API_VERSION = "v1";');
      fs.writeFileSync(file2, 'export const API_VERSION = "v1";');

      const editResult = await batchEditor.batchEdit({
        type: 'search-replace',
        files: [file1, file2],
        params: {
          search: 'v1',
          replace: 'v2',
        },
      });

      expect(editResult.success).toBe(true);

      // Step 2: Create chat history
      const chatHistory: ChatEntry[] = [
        { type: 'user', content: 'Update API version to v2', timestamp: new Date() },
        { type: 'assistant', content: 'Updated files successfully', timestamp: new Date() },
      ];

      // Step 3: Save session
      const metadata = sessionManager.saveSession(
        'api-update',
        chatHistory,
        { workingDirectory: testDir, model: 'glm-4.6' },
        'Updated API version from v1 to v2'
      );

      expect(metadata.name).toBe('api-update');
      expect(metadata.description).toBe('Updated API version from v1 to v2');

      // Step 4: Export session
      const exportPath = path.join(testDir, 'workflow.md');
      const markdown = sessionManager.exportSessionToMarkdown(metadata.id, exportPath);

      expect(markdown).toBeTruthy();
      expect(fs.existsSync(exportPath)).toBe(true);
      expect(markdown).toContain('Update API version to v2');

      // Cleanup
      sessionManager.deleteSession(metadata.id);
      vi.restoreAllMocks();
    }, 10000);
  });
});
