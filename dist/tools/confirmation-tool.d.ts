import { ToolResult } from '../types/index.js';
export interface ConfirmationRequest {
    operation: string;
    filename: string;
    description?: string;
    showVSCodeOpen?: boolean;
    autoAccept?: boolean;
}
export declare class ConfirmationTool {
    private confirmationService;
    constructor();
    requestConfirmation(request: ConfirmationRequest): Promise<ToolResult>;
    checkSessionAcceptance(): Promise<ToolResult>;
    resetSession(): void;
    isPending(): boolean;
}
