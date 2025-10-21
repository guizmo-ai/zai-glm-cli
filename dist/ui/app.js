import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { ConfirmationService } from '../utils/confirmation-service.js';
import ConfirmationDialog from './components/confirmation-dialog.js';
export default function App({ agent }) {
    const [input, setInput] = useState('');
    const [history, setHistory] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [confirmationOptions, setConfirmationOptions] = useState(null);
    // Removed useApp().exit - using process.exit(0) instead for better terminal handling
    const confirmationService = ConfirmationService.getInstance();
    useEffect(() => {
        const handleConfirmationRequest = (options) => {
            setConfirmationOptions(options);
        };
        confirmationService.on('confirmation-requested', handleConfirmationRequest);
        return () => {
            confirmationService.off('confirmation-requested', handleConfirmationRequest);
        };
    }, [confirmationService]);
    // Reset confirmation service session on app start
    useEffect(() => {
        confirmationService.resetSession();
    }, []);
    useInput(async (inputChar, key) => {
        // If confirmation dialog is open, don't handle normal input
        if (confirmationOptions) {
            return;
        }
        if (key.ctrl && inputChar === 'c') {
            process.exit(0);
            return;
        }
        if (key.return) {
            if (input.trim() === 'exit' || input.trim() === 'quit') {
                process.exit(0);
                return;
            }
            if (input.trim()) {
                setIsProcessing(true);
                const result = await agent.processCommand(input.trim());
                setHistory(prev => [...prev, { command: input.trim(), result }]);
                setInput('');
                setIsProcessing(false);
            }
            return;
        }
        if (key.backspace || key.delete) {
            setInput(prev => prev.slice(0, -1));
            return;
        }
        if (inputChar && !key.ctrl && !key.meta) {
            setInput(prev => prev + inputChar);
        }
    });
    const renderResult = (result) => {
        if (result.success) {
            return (React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
                React.createElement(Text, { color: "green" }, "\u2713 Success"),
                result.output && (React.createElement(Box, { marginLeft: 2 },
                    React.createElement(Text, null, result.output)))));
        }
        else {
            return (React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
                React.createElement(Text, { color: "red" }, "\u2717 Error"),
                result.error && (React.createElement(Box, { marginLeft: 2 },
                    React.createElement(Text, { color: "red" }, result.error)))));
        }
    };
    const handleConfirmation = (dontAskAgain) => {
        confirmationService.confirmOperation(true, dontAskAgain);
        setConfirmationOptions(null);
    };
    const handleRejection = (feedback) => {
        confirmationService.rejectOperation(feedback);
        setConfirmationOptions(null);
    };
    if (confirmationOptions) {
        return (React.createElement(ConfirmationDialog, { operation: confirmationOptions.operation, filename: confirmationOptions.filename, showVSCodeOpen: confirmationOptions.showVSCodeOpen, onConfirm: handleConfirmation, onReject: handleRejection }));
    }
    return (React.createElement(Box, { flexDirection: "column", padding: 1 },
        React.createElement(Box, { marginBottom: 1 },
            React.createElement(Text, { bold: true, color: "cyan" }, "\uD83D\uDD27 Grok CLI - Text Editor Agent")),
        React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
            React.createElement(Text, { dimColor: true }, "Available commands: view, str_replace, create, insert, undo_edit, bash, help"),
            React.createElement(Text, { dimColor: true }, "Type 'help' for detailed usage, 'exit' or Ctrl+C to quit")),
        React.createElement(Box, { flexDirection: "column", marginBottom: 1 }, history.slice(-10).map((entry, index) => (React.createElement(Box, { key: index, flexDirection: "column", marginBottom: 1 },
            React.createElement(Box, null,
                React.createElement(Text, { color: "blue" }, "$ "),
                React.createElement(Text, null, entry.command)),
            renderResult(entry.result))))),
        React.createElement(Box, null,
            React.createElement(Text, { color: "blue" }, "$ "),
            React.createElement(Text, null,
                input,
                !isProcessing && React.createElement(Text, { color: "white" }, "\u2588")),
            isProcessing && React.createElement(Text, { color: "yellow" }, " (processing...)"))));
}
//# sourceMappingURL=app.js.map