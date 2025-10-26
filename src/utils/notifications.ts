/**
 * Notification utility for terminal alerts
 * Provides sound and banner notifications for task completion
 */

import { execSync } from "child_process";

export class NotificationService {
  private static instance: NotificationService;
  private soundEnabled: boolean = true;
  private bannerEnabled: boolean = true;
  private isMac: boolean = false;

  private constructor() {
    // Check if sound notifications should be disabled (e.g., via env var)
    this.soundEnabled = process.env.ZAI_DISABLE_SOUND !== "true";
    this.bannerEnabled = process.env.ZAI_DISABLE_BANNER !== "true";
    this.isMac = process.platform === "darwin";
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Play a terminal bell sound
   * Uses the ASCII BEL character (\x07) for cross-platform compatibility
   */
  playBell(): void {
    if (!this.soundEnabled) return;

    try {
      // Terminal bell character
      process.stdout.write("\x07");
    } catch (error) {
      // Silently fail if sound notification doesn't work
      console.error("Failed to play notification sound:", error);
    }
  }

  /**
   * Show macOS banner notification with emoji icon in title only
   * Uses osascript to display notification via Notification Center
   */
  private showBanner(title: string, message: string, sound?: string): void {
    if (!this.bannerEnabled || !this.isMac) return;

    try {
      const soundArg = sound ? `sound name "${sound}"` : "";
      // Escape quotes for AppleScript
      const escapedMessage = message.replace(/"/g, '\\"');
      const escapedTitle = title.replace(/"/g, '\\"');
      
      const script = `display notification "${escapedMessage}" with title "${escapedTitle}" ${soundArg}`;
      execSync(`osascript -e '${script}'`, { stdio: "ignore" });
    } catch (error) {
      // Silently fail if notification doesn't work
      console.error("Failed to show banner notification:", error);
    }
  }

  /**
   * Play notification for task completion
   */
  notifyTaskComplete(taskName?: string): void {
    this.playBell();
    const message = taskName ? `${taskName}` : "Task completed successfully";
    this.showBanner("✅ ZAI CLI - Success", message, "Glass");
  }

  /**
   * Play notification for error/failure
   * Double beep for errors
   */
  notifyError(errorMessage?: string): void {
    if (this.soundEnabled) {
      this.playBell();
      setTimeout(() => this.playBell(), 200);
    }

    const message = errorMessage || "An error occurred during task execution";
    this.showBanner("❌ ZAI CLI - Error", message, "Basso");
  }

  /**
   * Notify when a session completes
   */
  notifySessionComplete(sessionInfo?: string): void {
    this.playBell();
    const message = sessionInfo || "Session completed";
    this.showBanner("✅ ZAI CLI - Complete", message, "Glass");
  }

  /**
   * Enable or disable sound notifications
   */
  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  /**
   * Check if sound is enabled
   */
  isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  /**
   * Enable or disable banner notifications
   */
  setBannerEnabled(enabled: boolean): void {
    this.bannerEnabled = enabled;
  }

  /**
   * Check if banner notifications are enabled
   */
  isBannerEnabled(): boolean {
    return this.bannerEnabled;
  }
}

// Export singleton instance
export const notifications = NotificationService.getInstance();
