import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SettingsManager } from '../../../src/utils/settings-manager';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('SettingsManager', () => {
  let testDir: string;
  let originalCwd: string;
  let originalHome: string;
  let originalZaiBaseUrl: string | undefined;
  let originalZaiApiKey: string | undefined;

  beforeEach(() => {
    // Save original values
    originalCwd = process.cwd();
    originalHome = os.homedir();
    originalZaiBaseUrl = process.env.ZAI_BASE_URL;
    originalZaiApiKey = process.env.ZAI_API_KEY;

    // Clear environment variables that might interfere
    delete process.env.ZAI_BASE_URL;
    delete process.env.GROK_BASE_URL;

    // Create temporary test directory
    testDir = path.join(os.tmpdir(), `zai-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    fs.mkdirSync(testDir, { recursive: true });

    // Change to test directory for project settings
    process.chdir(testDir);
  });

  afterEach(() => {
    // Restore original directory
    process.chdir(originalCwd);

    // Restore environment variables
    if (originalZaiBaseUrl) {
      process.env.ZAI_BASE_URL = originalZaiBaseUrl;
    }
    if (originalZaiApiKey) {
      process.env.ZAI_API_KEY = originalZaiApiKey;
    }

    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('User Settings', () => {
    it('should load user settings', () => {
      const manager = SettingsManager.getInstance();
      const settings = manager.loadUserSettings();

      // Settings should have these fields (values may vary based on existing config)
      expect(settings).toHaveProperty('baseURL');
      expect(settings).toHaveProperty('defaultModel');
      expect(settings).toHaveProperty('models');
      expect(Array.isArray(settings.models)).toBe(true);
    });

    it('should get default model', () => {
      const manager = SettingsManager.getInstance();
      const model = manager.getCurrentModel();
      expect(model).toBe('glm-4.6');
    });

    it('should get available models', () => {
      const manager = SettingsManager.getInstance();
      const models = manager.getAvailableModels();
      expect(models).toContain('glm-4.6');
      expect(models.length).toBeGreaterThan(0);
    });

    it('should get base URL', () => {
      const manager = SettingsManager.getInstance();
      const baseURL = manager.getBaseURL();
      expect(baseURL).toBeTruthy();
      expect(typeof baseURL).toBe('string');
      expect(baseURL).toContain('https://');
    });
  });

  describe('Project Settings', () => {
    it('should create default project settings', () => {
      const manager = SettingsManager.getInstance();
      const settings = manager.loadProjectSettings();

      expect(settings.model).toBe('glm-4.6');
    });

    it('should set and get project model', () => {
      const manager = SettingsManager.getInstance();
      manager.setCurrentModel('glm-4.5');

      const model = manager.getProjectSetting('model');
      expect(model).toBe('glm-4.5');
    });

    it('should persist project settings', () => {
      const manager = SettingsManager.getInstance();
      manager.saveProjectSettings({ model: 'glm-4.5-air' });

      // Create new instance to verify persistence
      const manager2 = SettingsManager.getInstance();
      const settings = manager2.loadProjectSettings();
      expect(settings.model).toBe('glm-4.5-air');
    });
  });

  describe('Environment Variables', () => {
    it('should prioritize ZAI_API_KEY from environment', () => {
      const originalKey = process.env.ZAI_API_KEY;
      process.env.ZAI_API_KEY = 'test-key-123';

      const manager = SettingsManager.getInstance();
      const apiKey = manager.getApiKey();
      expect(apiKey).toBe('test-key-123');

      // Restore
      if (originalKey) {
        process.env.ZAI_API_KEY = originalKey;
      } else {
        delete process.env.ZAI_API_KEY;
      }
    });

    it('should fallback to GROK_API_KEY for backward compatibility', () => {
      const originalZaiKey = process.env.ZAI_API_KEY;
      const originalGrokKey = process.env.GROK_API_KEY;

      delete process.env.ZAI_API_KEY;
      process.env.GROK_API_KEY = 'grok-key-456';

      const manager = SettingsManager.getInstance();
      const apiKey = manager.getApiKey();
      expect(apiKey).toBe('grok-key-456');

      // Restore
      if (originalZaiKey) process.env.ZAI_API_KEY = originalZaiKey;
      if (originalGrokKey) {
        process.env.GROK_API_KEY = originalGrokKey;
      } else {
        delete process.env.GROK_API_KEY;
      }
    });

    it('should prioritize ZAI_BASE_URL from environment', () => {
      const originalUrl = process.env.ZAI_BASE_URL;
      process.env.ZAI_BASE_URL = 'https://custom.api.url';

      const manager = SettingsManager.getInstance();
      const baseURL = manager.getBaseURL();
      expect(baseURL).toBe('https://custom.api.url');

      // Restore
      if (originalUrl) {
        process.env.ZAI_BASE_URL = originalUrl;
      } else {
        delete process.env.ZAI_BASE_URL;
      }
    });
  });

  describe('Model Hierarchy', () => {
    it('should use project model over user default', () => {
      const manager = SettingsManager.getInstance();

      // Set user default
      manager.saveUserSettings({ defaultModel: 'glm-4.5' });

      // Set project model
      manager.setCurrentModel('glm-4.5-air');

      const currentModel = manager.getCurrentModel();
      expect(currentModel).toBe('glm-4.5-air');
    });

    it('should have model hierarchy', () => {
      const manager = SettingsManager.getInstance();

      // Get initial state
      const initialModel = manager.getCurrentModel();
      expect(initialModel).toBeTruthy();

      // Set a project model - it should override user default
      manager.setCurrentModel('glm-4.5-air');
      expect(manager.getCurrentModel()).toBe('glm-4.5-air');

      // Change to different model
      manager.setCurrentModel('glm-4.5');
      expect(manager.getCurrentModel()).toBe('glm-4.5');
    });
  });

  describe('Initialization', () => {
    it('should initialize from onboarding', () => {
      const manager = SettingsManager.getInstance();
      manager.initializeFromOnboarding(
        'test-api-key',
        'https://test.api.url',
        'glm-4.6'
      );

      const settings = manager.loadUserSettings();
      expect(settings.apiKey).toBe('test-api-key');
      expect(settings.baseURL).toBe('https://test.api.url');
      expect(settings.defaultModel).toBe('glm-4.6');
    });
  });
});
