# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.1] - 2025-01-17

### Fixed

- Fixed hardcoded version number in CLI - now correctly reads version from package.json
- Fixed test isolation issues in HistoryManager tests - prevents contamination between test runs

## [0.2.0] - 2025-01-17

This major feature release significantly enhances the developer experience with persistent command history, interactive diff viewing, and substantial internal improvements for better code quality and maintainability.

### Added

- **Persistent Command History** - Full command history persistence across sessions stored in `~/.zai/history.json`
  - Support for up to 1,000 historical commands with metadata (timestamp, working directory, model)
  - Automatic deduplication of consecutive identical commands
  - Fuzzy search capabilities with date range and directory filtering

- **Ctrl+R Fuzzy Search** - Interactive reverse search through command history (bash-style)
  - Real-time fuzzy matching as you type
  - Visual feedback with highlighted matches
  - Navigate results with arrow keys
  - Press Enter to select or Escape to cancel

- **Interactive Diff Viewer** - Visual review and approval of file changes before applying
  - Side-by-side or unified diff display modes
  - Per-file accept/reject with navigation (n/p keys)
  - Batch operations: accept all (a) or reject all (r)
  - Keyboard shortcuts with help menu (? key)
  - Syntax-highlighted diff output

- **Automatic Backup System** - Safe file modification with rollback capability
  - Automatic backups before file edits in `~/.zai/backups/`
  - Backup metadata tracking (timestamp, checksum, file size)
  - Retention limit of 50 most recent backups
  - Indexed backup management for quick retrieval

### Changed

- **Enhanced State Management** - Migrated from useState to useReducer for complex UI state
  - More predictable state transitions
  - Improved debugging with state action logging
  - Better support for concurrent state updates

- **Improved Error Handling** - Comprehensive error recovery for backup and file operations
  - Graceful degradation when backup system unavailable
  - Detailed error messages with actionable context
  - Automatic retry mechanisms for transient failures

- **Modular Hook Architecture** - Extracted specialized React hooks for better code reuse
  - `useHistorySearch` - Command history search logic
  - `useInputHistory` - History navigation state
  - `useEnhancedInput` - Advanced input handling with Ctrl+R support
  - `useUiState` - Centralized UI state with reducer pattern

### Fixed

- **BackupManager Import Issues** - Resolved fs-extra import conflicts
  - Switched to explicit fs-extra imports for better compatibility
  - Fixed type definitions for backup metadata

- **Security Vulnerabilities** - Eliminated all npm audit vulnerabilities
  - Updated dependencies to latest secure versions
  - Currently at 0 vulnerabilities across all packages

- **ESLint Configuration** - Migrated to ESLint v9 flat config format
  - Modern flat config structure (eslint.config.js)
  - Proper TypeScript integration with @typescript-eslint v8
  - Comprehensive global definitions for Node.js and Web APIs

### Internal

- **ESLint v9 Migration** - Complete migration to ESLint flat config system
  - Removed legacy .eslintrc format
  - Updated to @typescript-eslint/eslint-plugin v8.37.0
  - Improved linting performance and rule organization

- **Comprehensive Test Suite** - Expanded test coverage to 302 tests across 11 test files
  - Unit tests for BackupManager, HistoryManager, DiffGenerator
  - Integration tests for history search and feature workflows
  - End-to-end tests for complete user journeys
  - Full test coverage for new diff viewer and backup systems

- **Dependencies Updated** - Major version updates for core dependencies
  - ESLint v9.31.0 with flat config support
  - @typescript-eslint/* v8.37.0
  - Vitest v3.2.4 with coverage and UI plugins
  - All dependencies verified for security compliance

- **Code Quality Improvements**
  - Extracted 4+ specialized React hooks from monolithic components
  - Implemented singleton pattern for HistoryManager and BackupManager
  - Added comprehensive JSDoc documentation for public APIs
  - Improved type safety with stricter TypeScript configurations

## [0.1.2] - 2025-01-16

### Documentation

- Improved README with npm version badges and package metadata
- Corrected installation instructions for npm registry
- Added shields.io badges for version, license, and Node.js compatibility

## [0.1.1] - 2025-01-15

### Fixed

- Added chokidar to dependencies (was missing from package.json)
- Resolved runtime errors with file watching functionality

## [0.1.0] - 2025-01-15

### Added

- Initial release of ZAI CLI for Z.ai GLM models
- Forked from superagent-ai/grok-cli with GLM-specific enhancements
- Interactive onboarding wizard for first-run setup
- Support for GLM-4.6 (200K context), GLM-4.5, and GLM-4.5-Air models
- Configuration management with `zai config` command
- MCP (Model Context Protocol) server integration
- Streaming SSE support for real-time AI responses
- Smart file operations (view, create, edit)
- Bash command execution tool
- Session persistence for conversation history
- Batch editing across multiple files
- File watching for external change detection
- Thinking mode visualization (GLM extended thinking)
- Morph Fast Apply integration (optional) for high-speed edits
- Custom instructions via `.zai/ZAI.md`
- Project-specific settings in `.zai/settings.json`
- Comprehensive test suite with 90+ tests using Vitest

### Developer Experience

- TypeScript with strict mode enabled
- React Ink UI framework for terminal interface
- Commander.js for CLI argument parsing
- Hot reload development mode with tsx
- Build system with TypeScript compiler
- Bun runtime support alongside Node.js

---

**Installation:** `npm install -g @guizmo-ai/zai-cli`

**Repository:** [github.com/guizmo-ai/zai-glm-cli](https://github.com/guizmo-ai/zai-glm-cli)

**Report Issues:** [GitHub Issues](https://github.com/guizmo-ai/zai-glm-cli/issues)
