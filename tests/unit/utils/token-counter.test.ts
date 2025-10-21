import { describe, it, expect, afterEach } from 'vitest';
import { createTokenCounter, formatTokenCount } from '../../../src/utils/token-counter';

describe('TokenCounter', () => {
  describe('countTokens', () => {
    it('should count tokens in simple text', () => {
      const counter = createTokenCounter('glm-4.6');
      const text = 'Hello world';
      const count = counter.countTokens(text);
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(10); // Simple text should be < 10 tokens
      counter.dispose();
    });

    it('should return 0 for empty text', () => {
      const counter = createTokenCounter('glm-4.6');
      const count = counter.countTokens('');
      expect(count).toBe(0);
      counter.dispose();
    });

    it('should count tokens in longer text', () => {
      const counter = createTokenCounter('glm-4.6');
      const text = 'This is a longer piece of text that should have more tokens than a simple greeting.';
      const count = counter.countTokens(text);
      expect(count).toBeGreaterThan(10);
      counter.dispose();
    });
  });

  describe('countMessageTokens', () => {
    it('should count message tokens', () => {
      const counter = createTokenCounter('glm-4.6');
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ];
      const count = counter.countMessageTokens(messages);
      expect(count).toBeGreaterThan(0);
      // Messages have overhead for role tokens and formatting
      expect(count).toBeGreaterThan(messages.length * 3); // At least 3 tokens per message
      counter.dispose();
    });

    it('should handle messages with null content', () => {
      const counter = createTokenCounter('glm-4.6');
      const messages = [
        { role: 'user', content: null },
        { role: 'assistant', content: 'Hello' }
      ];
      const count = counter.countMessageTokens(messages);
      expect(count).toBeGreaterThan(0);
      counter.dispose();
    });

    it('should count tokens with tool calls', () => {
      const counter = createTokenCounter('glm-4.6');
      const messages = [
        {
          role: 'assistant',
          content: 'Using tools',
          tool_calls: [
            { function: { name: 'test_tool', arguments: '{}' } }
          ]
        }
      ];
      const count = counter.countMessageTokens(messages);
      expect(count).toBeGreaterThan(5);
      counter.dispose();
    });
  });

  describe('estimateStreamingTokens', () => {
    it('should estimate tokens for accumulated content', () => {
      const counter = createTokenCounter('glm-4.6');
      const content = 'This is streaming content that accumulates over time';
      const estimate = counter.estimateStreamingTokens(content);
      expect(estimate).toBeGreaterThan(0);
      expect(estimate).toBeLessThan(20);
      counter.dispose();
    });
  });

  describe('formatTokenCount', () => {
    it('should format small numbers directly', () => {
      expect(formatTokenCount(0)).toBe('0');
      expect(formatTokenCount(100)).toBe('100');
      expect(formatTokenCount(999)).toBe('999');
    });

    it('should format thousands with k suffix', () => {
      expect(formatTokenCount(1000)).toBe('1k');
      expect(formatTokenCount(1200)).toBe('1.2k');
      expect(formatTokenCount(5500)).toBe('5.5k');
      expect(formatTokenCount(10000)).toBe('10k');
    });

    it('should format millions with m suffix', () => {
      expect(formatTokenCount(1000000)).toBe('1m');
      expect(formatTokenCount(1500000)).toBe('1.5m');
      expect(formatTokenCount(2300000)).toBe('2.3m');
    });
  });
});
