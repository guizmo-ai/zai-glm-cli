import React, { useState } from "react";
import { Box, Text, useInput, useApp } from "ink";
import TextInput from "ink-text-input";
import { getSettingsManager } from "../../utils/settings-manager.js";
import { StaticGradientLogo } from "./animated-logo.js";
export default function OnboardingSetup({ onComplete }) {
    const [step, setStep] = useState("welcome");
    const [apiKey, setApiKey] = useState("");
    const [apiKeyInput, setApiKeyInput] = useState("");
    const [selectedModel, setSelectedModel] = useState(0);
    const { exit } = useApp();
    const models = ["glm-4.6", "glm-4.5", "glm-4.5-air"];
    useInput((inputChar, key) => {
        if (key.ctrl && inputChar === "c") {
            exit();
            return;
        }
        // Handle navigation based on current step
        switch (step) {
            case "welcome":
                if (key.return) {
                    setStep("api-key");
                }
                break;
            case "model":
                if (key.upArrow) {
                    setSelectedModel((prev) => (prev > 0 ? prev - 1 : models.length - 1));
                }
                else if (key.downArrow) {
                    setSelectedModel((prev) => (prev < models.length - 1 ? prev + 1 : 0));
                }
                else if (key.return || key.tab) {
                    handleComplete();
                }
                break;
        }
    });
    const handleApiKeySubmit = (value) => {
        if (value.trim()) {
            setApiKey(value.trim());
            setStep("model");
        }
    };
    const handleComplete = () => {
        const manager = getSettingsManager();
        const defaultBaseURL = "https://api.z.ai/api/coding/paas/v4";
        manager.initializeFromOnboarding(apiKey, defaultBaseURL, models[selectedModel]);
        setStep("complete");
        setTimeout(() => {
            onComplete(apiKey, models[selectedModel]);
        }, 1500);
    };
    // Render based on current step
    return (React.createElement(Box, { flexDirection: "column", paddingX: 2, paddingY: 1 },
        step === "welcome" && (React.createElement(React.Fragment, null,
            React.createElement(StaticGradientLogo, { subtitle: "Powered by Stebou", showSubtitle: true }),
            React.createElement(Text, { color: "cyan", bold: true }, "\uD83C\uDF89 Welcome to ZAI CLI!"),
            React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                React.createElement(Text, null, "Let's set up your Z.ai configuration."),
                React.createElement(Text, { color: "gray", dimColor: true }, "This will only take a moment.")),
            React.createElement(Box, { marginTop: 2 },
                React.createElement(Text, { color: "yellow" }, "Press Enter to continue...")))),
        step === "api-key" && (React.createElement(React.Fragment, null,
            React.createElement(Text, { color: "cyan", bold: true }, "\uD83D\uDD11 Z.ai API Key"),
            React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                React.createElement(Text, null, "Enter your Z.ai API key:"),
                React.createElement(Text, { color: "gray", dimColor: true }, "(Get one at: https://z.ai/manage-apikey/apikey-list)")),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: "gray" }, "\u276F "),
                React.createElement(TextInput, { value: apiKeyInput, onChange: setApiKeyInput, onSubmit: handleApiKeySubmit, mask: "*", placeholder: "Paste or type your API key..." })),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: "gray", dimColor: true }, "Press Enter to continue")))),
        step === "model" && (React.createElement(React.Fragment, null,
            React.createElement(Text, { color: "cyan", bold: true }, "\uD83E\uDD16 Select Default Model"),
            React.createElement(Box, { marginTop: 1, flexDirection: "column" }, models.map((model, index) => (React.createElement(Box, { key: model, paddingLeft: 1 },
                React.createElement(Text, { color: index === selectedModel ? "black" : "white", backgroundColor: index === selectedModel ? "cyan" : undefined },
                    model,
                    model === "glm-4.6" && " (Recommended - 200K context)",
                    model === "glm-4.5" && " (128K context)",
                    model === "glm-4.5-air" && " (Compact & Fast)"))))),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: "gray", dimColor: true }, "\u2191\u2193 navigate \u2022 Enter select")))),
        step === "complete" && (React.createElement(React.Fragment, null,
            React.createElement(Text, { color: "green", bold: true }, "\u2705 Setup Complete!"),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, null, "Your configuration has been saved to ~/.zai/user-settings.json")),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: "cyan" }, "Starting ZAI CLI..."))))));
}
//# sourceMappingURL=onboarding-setup.js.map