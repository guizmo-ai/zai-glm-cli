import chokidar from 'chokidar';
import { EventEmitter } from 'events';
export class FileWatcher extends EventEmitter {
    watcher = null;
    watchPath = null;
    isWatching = false;
    changeBuffer = new Map();
    debounceMs = 300; // Wait 300ms before emitting change
    constructor() {
        super();
    }
    start(watchPath, options = {}) {
        if (this.isWatching) {
            this.stop();
        }
        this.watchPath = watchPath;
        const defaultOptions = {
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
    handleFileEvent(type, filePath) {
        // Debounce rapid changes to the same file
        const existingTimeout = this.changeBuffer.get(filePath);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }
        const timeout = setTimeout(() => {
            this.changeBuffer.delete(filePath);
            const event = {
                type,
                path: filePath,
                timestamp: new Date(),
            };
            this.emit('change', event);
            this.emit(type, event);
        }, this.debounceMs);
        this.changeBuffer.set(filePath, timeout);
    }
    stop() {
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
    isActive() {
        return this.isWatching;
    }
    getWatchPath() {
        return this.watchPath;
    }
    setDebounceMs(ms) {
        this.debounceMs = ms;
    }
}
// Singleton instance
let fileWatcher = null;
export function getFileWatcher() {
    if (!fileWatcher) {
        fileWatcher = new FileWatcher();
    }
    return fileWatcher;
}
//# sourceMappingURL=file-watcher.js.map