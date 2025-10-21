import React from "react";
interface ConfirmationDialogProps {
    operation: string;
    filename: string;
    onConfirm: (dontAskAgain?: boolean, editManually?: boolean) => void;
    onReject: (feedback?: string) => void;
    showVSCodeOpen?: boolean;
    content?: string;
    interactiveDiff?: boolean;
    oldContent?: string;
    newContent?: string;
}
export default function ConfirmationDialog({ operation, filename, onConfirm, onReject, showVSCodeOpen, content, interactiveDiff, oldContent, newContent, }: ConfirmationDialogProps): React.JSX.Element;
export {};
