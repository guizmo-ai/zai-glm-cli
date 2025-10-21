# ZAI CLI Tests

## Overview

This directory contains the test suite for ZAI CLI, built with Vitest for fast, modern testing with TypeScript support.

## Running Tests

```bash
# Run all tests in watch mode
bun test

# Run tests once (CI mode)
bun test:run

# Run tests with UI
bun test:ui

# Generate coverage report
bun test:coverage
```

## Test Structure

```
tests/
├── unit/                    # Unit tests for individual modules
│   ├── utils/              # Utility function tests
│   │   ├── token-counter.test.ts
│   │   ├── settings-manager.test.ts
│   │   └── text-utils.test.ts
│   └── tools/              # Tool-specific tests
│       └── search.test.ts
└── integration/            # Integration tests
    └── agent-basic.test.ts
```

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect } from 'vitest';

describe('MyModule', () => {
  it('should do something', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = myFunction(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

### Using Hooks

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('MyModule', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  it('should do something', () => {
    // Test code
  });
});
```

### Testing Async Code

```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeTruthy();
});
```

### Mocking

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('MyModule', () => {
  it('should use mocked function', () => {
    const mockFn = vi.fn();
    mockFn.mockReturnValue('mocked value');

    expect(mockFn()).toBe('mocked value');
    expect(mockFn).toHaveBeenCalled();
  });
});
```

## Test Categories

### Unit Tests (`tests/unit/`)

Test individual functions and classes in isolation. Focus on:
- Input/output correctness
- Edge cases
- Error handling
- Pure function behavior

### Integration Tests (`tests/integration/`)

Test how components work together. Focus on:
- Component interactions
- End-to-end workflows
- System behavior
- Real-world scenarios

## Coverage Goals

- **Target**: 80%+ overall coverage
- **Critical paths**: 90%+ coverage
- **Utilities**: 85%+ coverage
- **Tools**: 75%+ coverage

## Best Practices

1. **Arrange-Act-Assert**: Structure tests clearly
2. **One assertion per test**: Keep tests focused
3. **Descriptive names**: Use clear test descriptions
4. **Clean up**: Always clean up resources (files, mocks, etc.)
5. **Fast tests**: Keep unit tests under 100ms
6. **Isolated tests**: Tests should not depend on each other
7. **Test behavior**: Focus on what code does, not how it does it

## Common Matchers

```typescript
// Equality
expect(value).toBe(expected);           // Strict equality (===)
expect(value).toEqual(expected);        // Deep equality
expect(value).toBeTruthy();             // Truthy check
expect(value).toBeFalsy();              // Falsy check

// Numbers
expect(value).toBeGreaterThan(5);
expect(value).toBeLessThan(10);
expect(value).toBeCloseTo(0.3, 5);      // Floating point

// Strings
expect(string).toContain('substring');
expect(string).toMatch(/regex/);

// Arrays
expect(array).toContain(item);
expect(array).toHaveLength(3);

// Objects
expect(obj).toHaveProperty('key');
expect(obj).toMatchObject({ key: value });

// Functions
expect(fn).toThrow();
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledWith(arg);
```

## Debugging Tests

```bash
# Run specific test file
bun test tests/unit/utils/token-counter.test.ts

# Run tests matching pattern
bun test -t "should count tokens"

# Run with verbose output
bun test --reporter=verbose

# Run in debug mode
NODE_OPTIONS='--inspect-brk' bun test
```

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Before deployments

Required checks:
- All tests passing
- Coverage thresholds met
- No test warnings

## Contributing

When adding new features:
1. Write tests first (TDD approach recommended)
2. Ensure all tests pass locally
3. Maintain or improve coverage
4. Update this README if adding new test patterns

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [TypeScript Testing Guide](https://www.typescriptlang.org/docs/handbook/testing.html)
