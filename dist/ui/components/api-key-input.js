import React, { useState } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { ZaiAgent } from "../../agent/zai-agent.js";
import { getSettingsManager } from "../../utils/settings-manager.js";
export default function ApiKeyInput({ onApiKeySet }) {
    const [input, setInput] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { exit } = useApp();
    useInput((inputChar, key) => {
        if (isSubmitting)
            return;
        if (key.ctrl && inputChar === "c") {
            exit();
            return;
        }
        if (key.return) {
            handleSubmit();
            return;
        }
        if (key.backspace || key.delete) {
            setInput((prev) => prev.slice(0, -1));
            setError("");
            return;
        }
        if (inputChar && !key.ctrl && !key.meta) {
            setInput((prev) => prev + inputChar);
            setError("");
        }
    });
    const handleSubmit = async () => {
        if (!input.trim()) {
            setError("API key cannot be empty");
            return;
        }
        setIsSubmitting(true);
        try {
            const apiKey = input.trim();
            const agent = new ZaiAgent(apiKey);
            // Set environment variable for current process
            process.env.ZAI_API_KEY = apiKey;
            // Save to user settings
            try {
                const manager = getSettingsManager();
                manager.updateUserSetting('apiKey', apiKey);
                console.log(`\n✅ API key saved to ~/.zai/user-settings.json`);
            }
            catch (error) {
                console.log('\n⚠️ Could not save API key to settings file');
                console.log('API key set for current session only');
            }
            onApiKeySet(agent);
        }
        catch (error) {
            let errorMessage = "Invalid API key";
            // Provide more specific error messages
            if (error.message?.includes("ENOTFOUND") || error.message?.includes("ECONNREFUSED")) {
                errorMessage = "Network error: Cannot reach Z.ai API. Please check your internet connection.";
            }
            else if (error.message?.includes("401") || error.message?.includes("Unauthorized")) {
                errorMessage = "Invalid API key: The key you entered is not valid. Please check and try again.";
            }
            else if (error.message?.includes("403") || error.message?.includes("Forbidden")) {
                errorMessage = "API key rejected: This key doesn't have permission to access the API.";
            }
            else if (error.message?.includes("429")) {
                errorMessage = "Rate limit exceeded: Too many requests. Please try again later.";
            }
            else if (error.message?.includes("timeout")) {
                errorMessage = "Request timeout: API took too long to respond. Please try again.";
            }
            else if (error.message) {
                errorMessage = `API error: ${error.message}`;
            }
            setError(errorMessage);
            setIsSubmitting(false);
        }
    };
    const displayText = input.length > 0 ?
        (isSubmitting ? "*".repeat(input.length) : "*".repeat(input.length) + "█") :
        (isSubmitting ? " " : "█");
    return (React.createElement(Box, { flexDirection: "column", paddingX: 2, paddingY: 1 },
        React.createElement(Text, { color: "yellow" }, "\uD83D\uDD11 ZAI API Key Required"),
        React.createElement(Box, { marginBottom: 1 },
            React.createElement(Text, { color: "gray" }, "Please enter your ZAI API key to continue:")),
        React.createElement(Box, { borderStyle: "round", borderColor: "blue", paddingX: 1, marginBottom: 1 },
            React.createElement(Text, { color: "gray" }, "\u276F "),
            React.createElement(Text, null, displayText)),
        error ? (React.createElement(Box, { marginBottom: 1 },
            React.createElement(Text, { color: "red" },
                "\u274C ",
                error))) : null,
        React.createElement(Box, { flexDirection: "column", marginTop: 1 },
            React.createElement(Text, { color: "gray", dimColor: true }, "\u2022 Press Enter to submit"),
            React.createElement(Text, { color: "gray", dimColor: true }, "\u2022 Press Ctrl+C to exit"),
            React.createElement(Text, { color: "gray", dimColor: true }, "Note: API key will be saved to ~/.zai/user-settings.json")),
        isSubmitting ? (React.createElement(Box, { marginTop: 1 },
            React.createElement(Text, { color: "yellow" }, "\uD83D\uDD04 Validating API key..."))) : null));
}
//# sourceMappingURL=api-key-input.js.map