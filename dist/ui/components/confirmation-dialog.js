import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { DiffRenderer } from "./diff-renderer.js";
export default function ConfirmationDialog({ operation, filename, onConfirm, onReject, showVSCodeOpen = false, content, interactiveDiff = false, oldContent, newContent, }) {
    const [selectedOption, setSelectedOption] = useState(0);
    const [feedbackMode, setFeedbackMode] = useState(false);
    const [feedback, setFeedback] = useState("");
    const options = interactiveDiff
        ? [
            "Accept",
            "Accept all (don't ask again)",
            "Reject",
            "Edit manually",
        ]
        : [
            "Yes",
            "Yes, and don't ask again this session",
            "No",
            "No, with feedback",
        ];
    useInput((input, key) => {
        if (feedbackMode) {
            if (key.return) {
                onReject(feedback.trim());
                return;
            }
            if (key.backspace || key.delete) {
                setFeedback((prev) => prev.slice(0, -1));
                return;
            }
            if (input && !key.ctrl && !key.meta) {
                setFeedback((prev) => prev + input);
            }
            return;
        }
        if (key.upArrow || (key.shift && key.tab)) {
            setSelectedOption((prev) => (prev > 0 ? prev - 1 : options.length - 1));
            return;
        }
        if (key.downArrow || key.tab) {
            setSelectedOption((prev) => (prev + 1) % options.length);
            return;
        }
        if (key.return) {
            if (selectedOption === 0) {
                onConfirm(false, false);
            }
            else if (selectedOption === 1) {
                onConfirm(true, false);
            }
            else if (selectedOption === 2) {
                onReject("Operation cancelled by user");
            }
            else {
                if (interactiveDiff) {
                    // Edit manually option
                    onConfirm(false, true);
                }
                else {
                    // Feedback mode for non-interactive
                    setFeedbackMode(true);
                }
            }
            return;
        }
        if (key.escape) {
            if (feedbackMode) {
                setFeedbackMode(false);
                setFeedback("");
            }
            else {
                // Cancel the confirmation when escape is pressed from main confirmation
                onReject("Operation cancelled by user (pressed Escape)");
            }
            return;
        }
    });
    if (feedbackMode) {
        return (React.createElement(Box, { flexDirection: "column", padding: 1 },
            React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
                React.createElement(Text, { color: "gray" }, "Type your feedback and press Enter, or press Escape to go back.")),
            React.createElement(Box, { borderStyle: "round", borderColor: "yellow", paddingX: 1, marginTop: 1 },
                React.createElement(Text, { color: "gray" }, "\u276F "),
                React.createElement(Text, null,
                    feedback,
                    React.createElement(Text, { color: "white" }, "\u2588")))));
    }
    return (React.createElement(Box, { flexDirection: "column" },
        React.createElement(Box, { marginTop: 1 },
            React.createElement(Box, null,
                React.createElement(Text, { color: "magenta" }, "\u23FA"),
                React.createElement(Text, { color: "white" },
                    " ",
                    operation,
                    "(",
                    filename,
                    ")"))),
        React.createElement(Box, { marginLeft: 2, flexDirection: "column" },
            React.createElement(Text, { color: "gray" }, "\u23BF Requesting user confirmation"),
            showVSCodeOpen && (React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: "gray" }, "\u23BF Opened changes in Visual Studio Code \u29C9"))),
            content && (React.createElement(React.Fragment, null,
                React.createElement(Text, { color: "gray" },
                    "\u23BF ",
                    content.split('\n')[0]),
                React.createElement(Box, { marginLeft: 4, flexDirection: "column" },
                    React.createElement(DiffRenderer, { diffContent: content, filename: filename, terminalWidth: 80 }))))),
        React.createElement(Box, { flexDirection: "column", marginTop: 1 },
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, null, "Do you want to proceed with this operation?")),
            React.createElement(Box, { flexDirection: "column" }, options.map((option, index) => (React.createElement(Box, { key: index, paddingLeft: 1 },
                React.createElement(Text, { color: selectedOption === index ? "black" : "white", backgroundColor: selectedOption === index ? "cyan" : undefined },
                    index + 1,
                    ". ",
                    option))))),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: "gray", dimColor: true }, "\u2191\u2193 navigate \u2022 Enter select \u2022 Esc cancel")))));
}
//# sourceMappingURL=confirmation-dialog.js.map