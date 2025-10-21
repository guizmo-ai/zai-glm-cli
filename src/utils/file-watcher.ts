import chokidar, { FSWatcher } from 'chokidar';
import path from 'path';
import { EventEmitter } from 'events';

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  timestamp: Date;
}

export interface WatcherOptions {
  ignored?: string | string[];
  ignoreInitial?: boolean;
  persistent?: boolean;
  awaitWriteFinish?: boolean | { stabilityThreshold: number; pollInterval: number };
}

export class FileWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private watchPath: string | null = null;
  private isWatching: boolean = false;
  private changeBuffer: Map<string, NodeJS.Timeout> = new Map();
  private debounceMs: number = 300; // Wait 300ms before emitting change

  constructor() {
    super();
  }

  start(watchPath: string, options: WatcherOptions = {}): void {
    if (this.isWatching) {
      this.stop();
    }

    this.watchPath = watchPath;

    const defaultOptions: WatcherOptions = {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/.zai/**',
        '**/coverage/**',
        '**/*.log',
        '**/.DS_Store',
      ],
      ignoreInitial: true,
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
    };

    const mergedOptions = { ...defaultOptions, ...options };

    this.watcher = chokidar.watch(watchPath, mergedOptions);

    this.watcher
      .on('add', (filePath) => this.handleFileEvent('add', filePath))
      .on('change', (filePath) => this.handleFileEvent('change', filePath))
      .on('unlink', (filePath) => this.handleFileEvent('unlink', filePath))
      .on('error', (error) => this.emit('error', error))
      .on('ready', () => {
        this.isWatching = true;
        this.emit('ready', { watchPath: this.watchPath });
      });
  }

  private handleFileEvent(type: 'add' | 'change' | 'unlink', filePath: string): void {
    // Debounce rapid changes to the same file
    const existingTimeout = this.changeBuffer.get(filePath);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(() => {
      this.changeBuffer.delete(filePath);

      const event: FileChangeEvent = {
        type,
        path: filePath,
        timestamp: new Date(),
      };

      this.emit('change', event);
      this.emit(type, event);
    }, this.debounceMs);

    this.changeBuffer.set(filePath, timeout);
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    // Clear all pending timeouts
    for (const timeout of this.changeBuffer.values()) {
      clearTimeout(timeout);
    }
    this.changeBuffer.clear();

    this.isWatching = false;
    this.watchPath = null;
    this.emit('stopped');
  }

  isActive(): boolean {
    return this.isWatching;
  }

  getWatchPath(): string | null {
    return this.watchPath;
  }

  setDebounceMs(ms: number): void {
    this.debounceMs = ms;
  }
}

// Singleton instance
let fileWatcher: FileWatcher | null = null;

export function getFileWatcher(): FileWatcher {
  if (!fileWatcher) {
    fileWatcher = new FileWatcher();
  }
  return fileWatcher;
}
