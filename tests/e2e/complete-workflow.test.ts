import { describe, it, expect, vi } from 'vitest';
import { SessionManager } from '../../src/utils/session-manager.js';
import { BatchEditorTool } from '../../src/tools/batch-editor.js';
import { ChatEntry } from '../../src/agent/zai-agent.js';
import { ConfirmationService } from '../../src/utils/confirmation-service.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Complete Workflow E2E', () => {
  it('should handle complete development workflow', async () => {
    // Mock confirmation service to auto-approve
    const confirmationService = ConfirmationService.getInstance();
    vi.spyOn(confirmationService, 'requestConfirmation').mockResolvedValue({ confirmed: true });

    const testDir = path.join(os.tmpdir(), 'zai-e2e-test-' + Date.now());
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });

    try {
      // Step 1: Create project files
      const srcDir = path.join(testDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      const files = ['index.ts', 'utils.ts', 'config.ts'];
      files.forEach(file => {
        const fullPath = path.join(srcDir, file);
        fs.writeFileSync(fullPath, `export const OLD_CONSTANT = 'value';\nexport const APP_NAME = 'MyApp';`);
      });

      // Step 2: Use batch edit to refactor
      const batchEditor = new BatchEditorTool();
      const filesToEdit = files.map(f => path.join(srcDir, f));
      const result = await batchEditor.batchEdit({
        type: 'search-replace',
        files: filesToEdit,
        params: {
          search: 'OLD_CONSTANT',
          replace: 'NEW_CONSTANT',
        },
      });

      expect(result.success).toBe(true);

      // Step 3: Verify changes
      files.forEach(file => {
        const content = fs.readFileSync(path.join(srcDir, file), 'utf-8');
        expect(content).toContain('NEW_CONSTANT');
        expect(content).not.toContain('OLD_CONSTANT');
        // Other constants should remain unchanged
        expect(content).toContain('APP_NAME');
      });

      // Step 4: Save session
      const sessionManager = new SessionManager();
      const chatHistory: ChatEntry[] = [
        { type: 'user', content: 'Refactor OLD_CONSTANT to NEW_CONSTANT', timestamp: new Date() },
        { type: 'assistant', content: result.output || 'Refactoring complete', timestamp: new Date() },
      ];

      const metadata = sessionManager.saveSession(
        'refactor-session',
        chatHistory,
        { workingDirectory: testDir, model: 'glm-4.6' },
        'Complete refactoring workflow'
      );

      expect(metadata.name).toBe('refactor-session');
      expect(metadata.description).toBe('Complete refactoring workflow');

      // Step 5: Export session
      const mdPath = path.join(testDir, 'workflow.md');
      const markdown = sessionManager.exportSessionToMarkdown(metadata.id, mdPath);

      expect(markdown).toBeTruthy();
      expect(fs.existsSync(mdPath)).toBe(true);
      expect(markdown).toContain('Refactor OLD_CONSTANT');
      expect(markdown).toContain('# refactor-session');

      // Step 6: Verify markdown contains session metadata
      const mdContent = fs.readFileSync(mdPath, 'utf-8');
      expect(mdContent).toContain('glm-4.6'); // Model is mentioned in markdown
      expect(mdContent).toContain('refactor-session');

      // Cleanup
      sessionManager.deleteSession(metadata.id);
      vi.restoreAllMocks();
    } finally {
      fs.rmSync(testDir, { recursive: true });
    }
  }, 15000);

  it('should handle multi-step refactoring with validation', async () => {
    // Mock confirmation service to auto-approve
    const confirmationService = ConfirmationService.getInstance();
    vi.spyOn(confirmationService, 'requestConfirmation').mockResolvedValue({ confirmed: true });

    const testDir = path.join(os.tmpdir(), 'zai-multistep-test-' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });

    try {
      const sessionManager = new SessionManager();
      const batchEditor = new BatchEditorTool();

      // Create a mini project structure
      const dirs = ['src', 'src/components', 'src/utils', 'tests'];
      dirs.forEach(dir => {
        fs.mkdirSync(path.join(testDir, dir), { recursive: true });
      });

      // Create TypeScript files with imports
      const files = {
        'src/components/Button.ts': `import { oldHelper } from '../utils/helpers';\nexport const Button = () => oldHelper();`,
        'src/components/Input.ts': `import { oldHelper } from '../utils/helpers';\nexport const Input = () => oldHelper();`,
        'src/utils/helpers.ts': `export const oldHelper = () => 'old';\nexport const newHelper = () => 'new';`,
        'tests/helpers.test.ts': `import { oldHelper } from '../src/utils/helpers';\ntest('oldHelper', () => {});`,
      };

      Object.entries(files).forEach(([relativePath, content]) => {
        fs.writeFileSync(path.join(testDir, relativePath), content);
      });

      const chatHistory: ChatEntry[] = [];

      // Step 1: Rename function
      chatHistory.push({
        type: 'user',
        content: 'Rename oldHelper to modernHelper',
        timestamp: new Date(),
      });

      // Get all TypeScript files
      const allFiles = Object.keys(files).filter(f => f.endsWith('.ts')).map(f => path.join(testDir, f));

      const renameResult = await batchEditor.batchEdit({
        type: 'search-replace',
        files: allFiles,
        params: {
          search: 'oldHelper',
          replace: 'modernHelper',
        },
      });

      expect(renameResult.success).toBe(true);
      chatHistory.push({
        type: 'assistant',
        content: 'Renamed oldHelper to modernHelper across all files',
        timestamp: new Date(),
      });

      // Verify all files updated
      const buttonContent = fs.readFileSync(path.join(testDir, 'src/components/Button.ts'), 'utf-8');
      expect(buttonContent).toContain('modernHelper');
      expect(buttonContent).not.toContain('oldHelper');

      // Step 2: Update return values
      chatHistory.push({
        type: 'user',
        content: "Update function to return 'modern' instead of 'old'",
        timestamp: new Date(),
      });

      const updateResult = await batchEditor.batchEdit({
        type: 'search-replace',
        files: [path.join(testDir, 'src/utils/helpers.ts')],
        params: {
          search: "'old'",
          replace: "'modern'",
        },
      });

      expect(updateResult.success).toBe(true);
      chatHistory.push({
        type: 'assistant',
        content: 'Updated return value',
        timestamp: new Date(),
      });

      // Verify the change
      const helpersContent = fs.readFileSync(path.join(testDir, 'src/utils/helpers.ts'), 'utf-8');
      expect(helpersContent).toContain("'modern'");

      // Step 3: Save session with all steps
      const metadata = sessionManager.saveSession(
        'multi-step-refactor',
        chatHistory,
        { workingDirectory: testDir, model: 'glm-4.6' },
        'Multi-step refactoring: oldHelper -> modernHelper'
      );

      expect(metadata.messageCount).toBe(4);

      // Step 4: Export and verify
      const exportPath = path.join(testDir, 'refactor-log.md');
      const markdown = sessionManager.exportSessionToMarkdown(metadata.id, exportPath);

      expect(markdown).toContain('Rename oldHelper to modernHelper');
      expect(markdown).toContain("Update function to return 'modern'");

      // Cleanup
      sessionManager.deleteSession(metadata.id);
      vi.restoreAllMocks();
    } finally {
      fs.rmSync(testDir, { recursive: true });
    }
  }, 20000);

  it('should handle error recovery in workflow', async () => {
    // Mock confirmation service to auto-approve
    const confirmationService = ConfirmationService.getInstance();
    vi.spyOn(confirmationService, 'requestConfirmation').mockResolvedValue({ confirmed: true });

    const testDir = path.join(os.tmpdir(), 'zai-error-test-' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });

    try {
      const batchEditor = new BatchEditorTool();

      // Create valid file
      const validFile = path.join(testDir, 'valid.ts');
      fs.writeFileSync(validFile, 'const test = 1;');

      // Try to edit non-existent file
      const result1 = await batchEditor.batchEdit({
        type: 'search-replace',
        files: ['/nonexistent/file.ts'],
        params: {
          search: 'test',
          replace: 'production',
        },
      });

      // Should fail gracefully
      expect(result1.success).toBe(false);
      expect(result1.error).toBeTruthy();

      // Try valid operation
      const result2 = await batchEditor.batchEdit({
        type: 'search-replace',
        files: [validFile],
        params: {
          search: 'test',
          replace: 'production',
        },
      });

      // Should succeed
      expect(result2.success).toBe(true);

      // Verify file was updated
      const content = fs.readFileSync(validFile, 'utf-8');
      expect(content).toContain('production');
      vi.restoreAllMocks();
    } finally {
      fs.rmSync(testDir, { recursive: true });
    }
  }, 15000);

  it('should preserve session integrity across save/load cycles', async () => {
    const testDir = path.join(os.tmpdir(), 'zai-integrity-test-' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });

    try {
      const sessionManager = new SessionManager();

      // Create complex chat history
      const originalHistory: ChatEntry[] = [
        { type: 'user', content: 'First message', timestamp: new Date('2024-01-01T10:00:00Z') },
        { type: 'assistant', content: 'First response', timestamp: new Date('2024-01-01T10:00:01Z') },
        {
          type: 'tool_call',
          content: 'batch_edit',
          timestamp: new Date('2024-01-01T10:00:02Z'),
          toolCalls: [{
            id: 'call_1',
            type: 'function' as const,
            function: {
              name: 'batch_edit',
              arguments: '{"type":"search-replace"}',
            },
          }],
        },
        {
          type: 'tool_result',
          content: 'Success',
          timestamp: new Date('2024-01-01T10:00:03Z'),
          toolResult: { success: true, output: 'Files updated' },
        },
      ];

      // Save session
      const metadata = sessionManager.saveSession(
        'integrity-test',
        originalHistory,
        {
          workingDirectory: testDir,
          model: 'glm-4.6',
          customInstructions: 'Always be helpful',
        },
        'Test session integrity'
      );

      // Load session
      const loaded = sessionManager.loadSession(metadata.id);

      expect(loaded).toBeTruthy();
      expect(loaded!.chatHistory.length).toBe(4);
      expect(loaded!.context.model).toBe('glm-4.6');
      expect(loaded!.context.customInstructions).toBe('Always be helpful');

      // Verify chat history preserved
      expect(loaded!.chatHistory[0].type).toBe('user');
      expect(loaded!.chatHistory[0].content).toBe('First message');
      expect(loaded!.chatHistory[2].type).toBe('tool_call');
      expect(loaded!.chatHistory[3].type).toBe('tool_result');

      // Cleanup
      sessionManager.deleteSession(metadata.id);
    } finally {
      fs.rmSync(testDir, { recursive: true });
    }
  }, 10000);
});
