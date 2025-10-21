import { EventEmitter } from "events";
export interface ConfirmationOptions {
    operation: string;
    filename: string;
    showVSCodeOpen?: boolean;
    content?: string;
}
export interface ConfirmationResult {
    confirmed: boolean;
    dontAskAgain?: boolean;
    feedback?: string;
}
export declare class ConfirmationService extends EventEmitter {
    private static instance;
    private skipConfirmationThisSession;
    private pendingConfirmation;
    private resolveConfirmation;
    private sessionFlags;
    static getInstance(): ConfirmationService;
    constructor();
    requestConfirmation(options: ConfirmationOptions, operationType?: "file" | "bash"): Promise<ConfirmationResult>;
    confirmOperation(confirmed: boolean, dontAskAgain?: boolean): void;
    rejectOperation(feedback?: string): void;
    private openInVSCode;
    isPending(): boolean;
    resetSession(): void;
    getSessionFlags(): {
        fileOperations: boolean;
        bashCommands: boolean;
        allOperations: boolean;
    };
    setSessionFlag(flagType: "fileOperations" | "bashCommands" | "allOperations", value: boolean): void;
}
