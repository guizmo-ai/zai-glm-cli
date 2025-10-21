import React, { useState } from "react";
import { Box, Text, useInput, useApp } from "ink";
import TextInput from "ink-text-input";
import { getSettingsManager } from "../../utils/settings-manager.js";
export default function SettingsPanel() {
    const manager = getSettingsManager();
    const [settings, setSettings] = useState(manager.loadUserSettings());
    const [selectedField, setSelectedField] = useState("none");
    const [apiKeyInput, setApiKeyInput] = useState("");
    const [baseURLInput, setBaseURLInput] = useState("");
    const [newModelInput, setNewModelInput] = useState("");
    const [selectedModelIndex, setSelectedModelIndex] = useState(0);
    const [showSaved, setShowSaved] = useState(false);
    const { exit } = useApp();
    useInput((inputChar, key) => {
        if (key.ctrl && inputChar === "c") {
            exit();
            return;
        }
        if (selectedField === "none") {
            // Main menu
            if (inputChar === "1") {
                setSelectedField("api-key");
                setApiKeyInput(settings.apiKey || "");
            }
            else if (inputChar === "2") {
                setSelectedField("base-url");
                setBaseURLInput(settings.baseURL || "");
            }
            else if (inputChar === "3") {
                setSelectedField("model");
                const currentModelIndex = settings.models?.indexOf(settings.defaultModel || "") ?? 0;
                setSelectedModelIndex(currentModelIndex >= 0 ? currentModelIndex : 0);
            }
            else if (inputChar === "4") {
                setSelectedField("add-model");
                setNewModelInput("");
            }
            else if (inputChar === "5") {
                setSelectedField("manage-models");
                setSelectedModelIndex(0);
            }
            else if (inputChar === "q" || key.escape) {
                exit();
            }
        }
        else if (selectedField === "model") {
            // Model selection
            if (key.upArrow) {
                setSelectedModelIndex((prev) => prev > 0 ? prev - 1 : (settings.models?.length || 1) - 1);
            }
            else if (key.downArrow) {
                setSelectedModelIndex((prev) => prev < (settings.models?.length || 1) - 1 ? prev + 1 : 0);
            }
            else if (key.return) {
                const newModel = settings.models?.[selectedModelIndex];
                if (newModel) {
                    manager.updateUserSetting("defaultModel", newModel);
                    setShowSaved(true);
                    setTimeout(() => {
                        setShowSaved(false);
                        setSelectedField("none");
                    }, 1500);
                }
            }
            else if (key.escape) {
                setSelectedField("none");
            }
        }
        else if (selectedField === "manage-models") {
            // Manage models - delete option
            if (key.upArrow) {
                setSelectedModelIndex((prev) => prev > 0 ? prev - 1 : (settings.models?.length || 1) - 1);
            }
            else if (key.downArrow) {
                setSelectedModelIndex((prev) => prev < (settings.models?.length || 1) - 1 ? prev + 1 : 0);
            }
            else if (key.return) {
                // Delete selected model
                const modelToDelete = settings.models?.[selectedModelIndex];
                if (modelToDelete && settings.models) {
                    const updatedModels = settings.models.filter((m) => m !== modelToDelete);
                    manager.updateUserSetting("models", updatedModels);
                    setSettings(manager.loadUserSettings());
                    setShowSaved(true);
                    setTimeout(() => {
                        setShowSaved(false);
                        setSelectedField("none");
                    }, 1500);
                }
            }
            else if (key.escape) {
                setSelectedField("none");
            }
        }
    });
    const handleApiKeySubmit = (value) => {
        if (value.trim()) {
            manager.updateUserSetting("apiKey", value.trim());
            setSettings(manager.loadUserSettings());
            setShowSaved(true);
            setTimeout(() => {
                setShowSaved(false);
                setSelectedField("none");
                setApiKeyInput("");
            }, 1500);
        }
    };
    const handleBaseURLSubmit = (value) => {
        if (value.trim()) {
            manager.updateUserSetting("baseURL", value.trim());
            setSettings(manager.loadUserSettings());
            setShowSaved(true);
            setTimeout(() => {
                setShowSaved(false);
                setSelectedField("none");
                setBaseURLInput("");
            }, 1500);
        }
    };
    const handleAddModelSubmit = (value) => {
        if (value.trim()) {
            const newModel = value.trim();
            const currentModels = settings.models || [];
            if (!currentModels.includes(newModel)) {
                const updatedModels = [...currentModels, newModel];
                manager.updateUserSetting("models", updatedModels);
                setSettings(manager.loadUserSettings());
                setShowSaved(true);
                setTimeout(() => {
                    setShowSaved(false);
                    setSelectedField("none");
                    setNewModelInput("");
                }, 1500);
            }
        }
    };
    return (React.createElement(Box, { flexDirection: "column", paddingX: 2, paddingY: 1 },
        React.createElement(Text, { color: "cyan", bold: true }, "\u2699\uFE0F  ZAI CLI Settings"),
        selectedField === "none" && (React.createElement(React.Fragment, null,
            React.createElement(Box, { marginTop: 2, flexDirection: "column" },
                React.createElement(Text, { color: "yellow" }, "Current Configuration:"),
                React.createElement(Box, { marginTop: 1, flexDirection: "column", paddingLeft: 2 },
                    React.createElement(Text, null,
                        "API Key:",
                        " ",
                        settings.apiKey ? "***" + settings.apiKey.slice(-8) : "Not set"),
                    React.createElement(Text, null,
                        "Base URL: ",
                        settings.baseURL || "Not set"),
                    React.createElement(Text, null,
                        "Default Model: ",
                        settings.defaultModel || "Not set"),
                    React.createElement(Text, null,
                        "Available Models: ",
                        settings.models?.join(", ") || "None"))),
            React.createElement(Box, { marginTop: 2, flexDirection: "column" },
                React.createElement(Text, { color: "cyan" }, "Select an option to modify:"),
                React.createElement(Box, { marginTop: 1, flexDirection: "column", paddingLeft: 2 },
                    React.createElement(Text, null, "1. Change API Key"),
                    React.createElement(Text, null, "2. Change Base URL"),
                    React.createElement(Text, null, "3. Change Default Model"),
                    React.createElement(Text, { color: "green" }, "4. Add New Model"),
                    React.createElement(Text, { color: "yellow" }, "5. Manage Models (Delete)"),
                    React.createElement(Text, { color: "gray" }, "q. Quit"))))),
        selectedField === "api-key" && (React.createElement(React.Fragment, null,
            React.createElement(Box, { marginTop: 2 },
                React.createElement(Text, { color: "yellow" }, "Enter new API key:")),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: "gray" }, "\u276F "),
                React.createElement(TextInput, { value: apiKeyInput, onChange: setApiKeyInput, onSubmit: handleApiKeySubmit, mask: "*", placeholder: "Paste or type your API key..." })),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: "gray", dimColor: true }, "Press Enter to save \u2022 Esc to cancel")))),
        selectedField === "base-url" && (React.createElement(React.Fragment, null,
            React.createElement(Box, { marginTop: 2 },
                React.createElement(Text, { color: "yellow" }, "Enter new Base URL:")),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: "gray" }, "\u276F "),
                React.createElement(TextInput, { value: baseURLInput, onChange: setBaseURLInput, onSubmit: handleBaseURLSubmit, placeholder: "https://api.z.ai/api/coding/paas/v4" })),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: "gray", dimColor: true }, "Press Enter to save \u2022 Esc to cancel")))),
        selectedField === "model" && (React.createElement(React.Fragment, null,
            React.createElement(Box, { marginTop: 2 },
                React.createElement(Text, { color: "yellow" }, "Select default model:")),
            React.createElement(Box, { marginTop: 1, flexDirection: "column" }, settings.models?.map((model, index) => (React.createElement(Box, { key: model, paddingLeft: 1 },
                React.createElement(Text, { color: index === selectedModelIndex ? "black" : "white", backgroundColor: index === selectedModelIndex ? "cyan" : undefined }, model))))),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: "gray", dimColor: true }, "\u2191\u2193 navigate \u2022 Enter select \u2022 Esc cancel")))),
        selectedField === "add-model" && (React.createElement(React.Fragment, null,
            React.createElement(Box, { marginTop: 2 },
                React.createElement(Text, { color: "yellow" }, "Enter new model name:"),
                React.createElement(Text, { color: "gray", dimColor: true }, "(e.g., glm-4-plus, claude-3-opus, gpt-4, etc.)")),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: "gray" }, "\u276F "),
                React.createElement(TextInput, { value: newModelInput, onChange: setNewModelInput, onSubmit: handleAddModelSubmit, placeholder: "model-name" })),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: "gray", dimColor: true }, "Press Enter to add \u2022 Esc to cancel")))),
        selectedField === "manage-models" && (React.createElement(React.Fragment, null,
            React.createElement(Box, { marginTop: 2 },
                React.createElement(Text, { color: "yellow" }, "Select model to delete:")),
            React.createElement(Box, { marginTop: 1, flexDirection: "column" }, settings.models?.map((model, index) => (React.createElement(Box, { key: model, paddingLeft: 1 },
                React.createElement(Text, { color: index === selectedModelIndex ? "black" : "white", backgroundColor: index === selectedModelIndex ? "red" : undefined }, model))))),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: "gray", dimColor: true }, "\u2191\u2193 navigate \u2022 Enter delete \u2022 Esc cancel")))),
        showSaved && (React.createElement(Box, { marginTop: 2 },
            React.createElement(Text, { color: "green" }, "\u2705 Settings saved successfully!")))));
}
//# sourceMappingURL=settings-panel.js.map