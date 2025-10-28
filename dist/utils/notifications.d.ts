/**
 * Notification utility for terminal alerts
 * Provides sound and banner notifications for task completion
 */
export declare class NotificationService {
    private static instance;
    private soundEnabled;
    private bannerEnabled;
    private isMac;
    private constructor();
    static getInstance(): NotificationService;
    /**
     * Play a terminal bell sound
     * Uses the ASCII BEL character (\x07) for cross-platform compatibility
     */
    playBell(): void;
    /**
     * Show macOS banner notification with emoji icon in title only
     * Uses osascript to display notification via Notification Center
     */
    private showBanner;
    /**
     * Play notification for task completion
     */
    notifyTaskComplete(taskName?: string): void;
    /**
     * Play notification for error/failure
     * Double beep for errors
     */
    notifyError(errorMessage?: string): void;
    /**
     * Notify when a session completes
     */
    notifySessionComplete(sessionInfo?: string): void;
    /**
     * Enable or disable sound notifications
     */
    setSoundEnabled(enabled: boolean): void;
    /**
     * Check if sound is enabled
     */
    isSoundEnabled(): boolean;
    /**
     * Enable or disable banner notifications
     */
    setBannerEnabled(enabled: boolean): void;
    /**
     * Check if banner notifications are enabled
     */
    isBannerEnabled(): boolean;
}
export declare const notifications: NotificationService;
