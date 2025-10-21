import { describe, it, expect, beforeAll } from 'vitest';
import { ZaiAgent } from '../../src/agent/zai-agent';

describe('ZaiAgent Integration', () => {
  const testApiKey = process.env.ZAI_API_KEY || 'test-api-key';
  const testModel = 'glm-4.6';

  describe('Agent Initialization', () => {
    it('should initialize with API key', () => {
      const agent = new ZaiAgent(testApiKey, undefined, testModel);
      expect(agent.getCurrentModel()).toBe(testModel);
    });

    it('should initialize with custom base URL', () => {
      const customBaseURL = 'https://custom.api.url';
      const agent = new ZaiAgent(testApiKey, customBaseURL, testModel);
      expect(agent.getCurrentModel()).toBe(testModel);
    });

    it('should initialize with default model when not specified', () => {
      const agent = new ZaiAgent(testApiKey);
      const model = agent.getCurrentModel();
      expect(model).toBeTruthy();
      expect(typeof model).toBe('string');
    });
  });

  describe('Directory Management', () => {
    it('should get current directory', () => {
      const agent = new ZaiAgent(testApiKey);
      const dir = agent.getCurrentDirectory();
      expect(dir).toBeTruthy();
      expect(typeof dir).toBe('string');
      expect(dir.length).toBeGreaterThan(0);
    });
  });

  describe('Model Management', () => {
    it('should get current model', () => {
      const agent = new ZaiAgent(testApiKey, undefined, 'glm-4.5');
      expect(agent.getCurrentModel()).toBe('glm-4.5');
    });

    it('should change model', () => {
      const agent = new ZaiAgent(testApiKey, undefined, 'glm-4.6');
      expect(agent.getCurrentModel()).toBe('glm-4.6');

      agent.setModel('glm-4.5');
      expect(agent.getCurrentModel()).toBe('glm-4.5');
    });
  });

  describe('Chat History', () => {
    it('should initialize with empty chat history', () => {
      const agent = new ZaiAgent(testApiKey);
      const history = agent.getChatHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(0);
    });
  });

  describe('Client Access', () => {
    it('should provide access to ZaiClient', () => {
      const agent = new ZaiAgent(testApiKey);
      const client = agent.getClient();
      expect(client).toBeDefined();
      expect(client).toBeTruthy();
    });
  });

  describe('Bash Command Execution', () => {
    it('should execute simple bash commands', async () => {
      const agent = new ZaiAgent(testApiKey);
      const result = await agent.executeBashCommand('echo "test"');

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');

      // The command should execute even if it requires approval
      // This tests the structure, not the actual execution with approval
    });
  });

  describe('Operation Abort', () => {
    it('should have abort functionality', () => {
      const agent = new ZaiAgent(testApiKey);

      // Should not throw when aborting with no operation
      expect(() => agent.abortCurrentOperation()).not.toThrow();
    });
  });

  describe('Context Summary', () => {
    it('should return empty context summary initially', () => {
      const agent = new ZaiAgent(testApiKey);
      const summary = agent.getContextSummary();
      expect(typeof summary).toBe('string');
    });
  });
});
