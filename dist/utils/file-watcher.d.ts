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
    awaitWriteFinish?: boolean | {
        stabilityThreshold: number;
        pollInterval: number;
    };
}
export declare class FileWatcher extends EventEmitter {
    private watcher;
    private watchPath;
    private isWatching;
    private changeBuffer;
    private debounceMs;
    constructor();
    start(watchPath: string, options?: WatcherOptions): void;
    private handleFileEvent;
    stop(): void;
    isActive(): boolean;
    getWatchPath(): string | null;
    setDebounceMs(ms: number): void;
}
export declare function getFileWatcher(): FileWatcher;
