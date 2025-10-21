import { exec } from "child_process";
import { promisify } from "util";
import { EventEmitter } from "events";
const execAsync = promisify(exec);
export class ConfirmationService extends EventEmitter {
    static instance;
    skipConfirmationThisSession = false;
    pendingConfirmation = null;
    resolveConfirmation = null;
    // Session flags for different operation types
    sessionFlags = {
        fileOperations: false,
        bashCommands: false,
        allOperations: false,
        interactiveDiff: true, // Enable interactive diff by default
    };
    static getInstance() {
        if (!ConfirmationService.instance) {
            ConfirmationService.instance = new ConfirmationService();
        }
        return ConfirmationService.instance;
    }
    constructor() {
        super();
    }
    async requestConfirmation(options, operationType = "file") {
        // Check session flags
        if (this.sessionFlags.allOperations ||
            (operationType === "file" && this.sessionFlags.fileOperations) ||
            (operationType === "bash" && this.sessionFlags.bashCommands)) {
            return { confirmed: true };
        }
        // If VS Code should be opened, try to open it
        if (options.showVSCodeOpen) {
            try {
                await this.openInVSCode(options.filename);
            }
            catch (error) {
                // If VS Code opening fails, continue without it
                options.showVSCodeOpen = false;
            }
        }
        // Create a promise that will be resolved by the UI component
        this.pendingConfirmation = new Promise((resolve) => {
            this.resolveConfirmation = resolve;
        });
        // Emit custom event that the UI can listen to (using setImmediate to ensure the UI updates)
        setImmediate(() => {
            this.emit("confirmation-requested", options);
        });
        const result = await this.pendingConfirmation;
        if (result.dontAskAgain) {
            // Set the appropriate session flag based on operation type
            if (operationType === "file") {
                this.sessionFlags.fileOperations = true;
            }
            else if (operationType === "bash") {
                this.sessionFlags.bashCommands = true;
            }
            // Could also set allOperations for global skip
        }
        return result;
    }
    confirmOperation(confirmed, dontAskAgain, editManually) {
        if (this.resolveConfirmation) {
            this.resolveConfirmation({ confirmed, dontAskAgain, editManually });
            this.resolveConfirmation = null;
            this.pendingConfirmation = null;
        }
    }
    rejectOperation(feedback) {
        if (this.resolveConfirmation) {
            this.resolveConfirmation({ confirmed: false, feedback });
            this.resolveConfirmation = null;
            this.pendingConfirmation = null;
        }
    }
    async openInVSCode(filename) {
        // Try different VS Code commands
        const commands = ["code", "code-insiders", "codium"];
        for (const cmd of commands) {
            try {
                await execAsync(`which ${cmd}`);
                await execAsync(`${cmd} "${filename}"`);
                return;
            }
            catch (error) {
                // Continue to next command
                continue;
            }
        }
        throw new Error("VS Code not found");
    }
    isPending() {
        return this.pendingConfirmation !== null;
    }
    resetSession() {
        this.sessionFlags = {
            fileOperations: false,
            bashCommands: false,
            allOperations: false,
            interactiveDiff: true,
        };
    }
    getSessionFlags() {
        return { ...this.sessionFlags };
    }
    setSessionFlag(flagType, value) {
        this.sessionFlags[flagType] = value;
    }
    isInteractiveDiffEnabled() {
        return this.sessionFlags.interactiveDiff;
    }
    setInteractiveDiff(enabled) {
        this.sessionFlags.interactiveDiff = enabled;
    }
}
//# sourceMappingURL=confirmation-service.js.map