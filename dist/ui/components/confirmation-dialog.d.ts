import React from "react";
interface ConfirmationDialogProps {
    operation: string;
    filename: string;
    onConfirm: (dontAskAgain?: boolean) => void;
    onReject: (feedback?: string) => void;
    showVSCodeOpen?: boolean;
    content?: string;
}
export default function ConfirmationDialog({ operation, filename, onConfirm, onReject, showVSCodeOpen, content, }: ConfirmationDialogProps): React.JSX.Element;
export {};
