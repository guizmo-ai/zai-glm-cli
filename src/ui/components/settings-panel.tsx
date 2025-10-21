import React, { useState } from "react";
import { Box, Text, useInput, useApp } from "ink";
import TextInput from "ink-text-input";
import { getSettingsManager } from "../../utils/settings-manager.js";

type SettingField = "api-key" | "base-url" | "model" | "add-model" | "manage-models" | "none";

export default function SettingsPanel() {
  const manager = getSettingsManager();
  const [settings, setSettings] = useState(manager.loadUserSettings());

  const [selectedField, setSelectedField] = useState<SettingField>("none");
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
      } else if (inputChar === "2") {
        setSelectedField("base-url");
        setBaseURLInput(settings.baseURL || "");
      } else if (inputChar === "3") {
        setSelectedField("model");
        const currentModelIndex =
          settings.models?.indexOf(settings.defaultModel || "") ?? 0;
        setSelectedModelIndex(currentModelIndex >= 0 ? currentModelIndex : 0);
      } else if (inputChar === "4") {
        setSelectedField("add-model");
        setNewModelInput("");
      } else if (inputChar === "5") {
        setSelectedField("manage-models");
        setSelectedModelIndex(0);
      } else if (inputChar === "q" || key.escape) {
        exit();
      }
    } else if (selectedField === "model") {
      // Model selection
      if (key.upArrow) {
        setSelectedModelIndex((prev) =>
          prev > 0 ? prev - 1 : (settings.models?.length || 1) - 1
        );
      } else if (key.downArrow) {
        setSelectedModelIndex((prev) =>
          prev < (settings.models?.length || 1) - 1 ? prev + 1 : 0
        );
      } else if (key.return) {
        const newModel = settings.models?.[selectedModelIndex];
        if (newModel) {
          manager.updateUserSetting("defaultModel", newModel);
          setShowSaved(true);
          setTimeout(() => {
            setShowSaved(false);
            setSelectedField("none");
          }, 1500);
        }
      } else if (key.escape) {
        setSelectedField("none");
      }
    } else if (selectedField === "manage-models") {
      // Manage models - delete option
      if (key.upArrow) {
        setSelectedModelIndex((prev) =>
          prev > 0 ? prev - 1 : (settings.models?.length || 1) - 1
        );
      } else if (key.downArrow) {
        setSelectedModelIndex((prev) =>
          prev < (settings.models?.length || 1) - 1 ? prev + 1 : 0
        );
      } else if (key.return) {
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
      } else if (key.escape) {
        setSelectedField("none");
      }
    }
  });

  const handleApiKeySubmit = (value: string) => {
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

  const handleBaseURLSubmit = (value: string) => {
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

  const handleAddModelSubmit = (value: string) => {
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

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Text color="cyan" bold>
        ⚙️  ZAI CLI Settings
      </Text>

      {selectedField === "none" && (
        <>
          <Box marginTop={2} flexDirection="column">
            <Text color="yellow">Current Configuration:</Text>
            <Box marginTop={1} flexDirection="column" paddingLeft={2}>
              <Text>
                API Key:{" "}
                {settings.apiKey ? "***" + settings.apiKey.slice(-8) : "Not set"}
              </Text>
              <Text>Base URL: {settings.baseURL || "Not set"}</Text>
              <Text>Default Model: {settings.defaultModel || "Not set"}</Text>
              <Text>Available Models: {settings.models?.join(", ") || "None"}</Text>
            </Box>
          </Box>

          <Box marginTop={2} flexDirection="column">
            <Text color="cyan">Select an option to modify:</Text>
            <Box marginTop={1} flexDirection="column" paddingLeft={2}>
              <Text>1. Change API Key</Text>
              <Text>2. Change Base URL</Text>
              <Text>3. Change Default Model</Text>
              <Text color="green">4. Add New Model</Text>
              <Text color="yellow">5. Manage Models (Delete)</Text>
              <Text color="gray">q. Quit</Text>
            </Box>
          </Box>
        </>
      )}

      {selectedField === "api-key" && (
        <>
          <Box marginTop={2}>
            <Text color="yellow">Enter new API key:</Text>
          </Box>
          <Box marginTop={1}>
            <Text color="gray">❯ </Text>
            <TextInput
              value={apiKeyInput}
              onChange={setApiKeyInput}
              onSubmit={handleApiKeySubmit}
              mask="*"
              placeholder="Paste or type your API key..."
            />
          </Box>
          <Box marginTop={1}>
            <Text color="gray" dimColor>
              Press Enter to save • Esc to cancel
            </Text>
          </Box>
        </>
      )}

      {selectedField === "base-url" && (
        <>
          <Box marginTop={2}>
            <Text color="yellow">Enter new Base URL:</Text>
          </Box>
          <Box marginTop={1}>
            <Text color="gray">❯ </Text>
            <TextInput
              value={baseURLInput}
              onChange={setBaseURLInput}
              onSubmit={handleBaseURLSubmit}
              placeholder="https://api.z.ai/api/coding/paas/v4"
            />
          </Box>
          <Box marginTop={1}>
            <Text color="gray" dimColor>
              Press Enter to save • Esc to cancel
            </Text>
          </Box>
        </>
      )}

      {selectedField === "model" && (
        <>
          <Box marginTop={2}>
            <Text color="yellow">Select default model:</Text>
          </Box>
          <Box marginTop={1} flexDirection="column">
            {settings.models?.map((model, index) => (
              <Box key={model} paddingLeft={1}>
                <Text
                  color={index === selectedModelIndex ? "black" : "white"}
                  backgroundColor={
                    index === selectedModelIndex ? "cyan" : undefined
                  }
                >
                  {model}
                </Text>
              </Box>
            ))}
          </Box>
          <Box marginTop={1}>
            <Text color="gray" dimColor>
              ↑↓ navigate • Enter select • Esc cancel
            </Text>
          </Box>
        </>
      )}

      {selectedField === "add-model" && (
        <>
          <Box marginTop={2}>
            <Text color="yellow">Enter new model name:</Text>
            <Text color="gray" dimColor>
              (e.g., glm-4-plus, claude-3-opus, gpt-4, etc.)
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text color="gray">❯ </Text>
            <TextInput
              value={newModelInput}
              onChange={setNewModelInput}
              onSubmit={handleAddModelSubmit}
              placeholder="model-name"
            />
          </Box>
          <Box marginTop={1}>
            <Text color="gray" dimColor>
              Press Enter to add • Esc to cancel
            </Text>
          </Box>
        </>
      )}

      {selectedField === "manage-models" && (
        <>
          <Box marginTop={2}>
            <Text color="yellow">Select model to delete:</Text>
          </Box>
          <Box marginTop={1} flexDirection="column">
            {settings.models?.map((model, index) => (
              <Box key={model} paddingLeft={1}>
                <Text
                  color={index === selectedModelIndex ? "black" : "white"}
                  backgroundColor={
                    index === selectedModelIndex ? "red" : undefined
                  }
                >
                  {model}
                </Text>
              </Box>
            ))}
          </Box>
          <Box marginTop={1}>
            <Text color="gray" dimColor>
              ↑↓ navigate • Enter delete • Esc cancel
            </Text>
          </Box>
        </>
      )}

      {showSaved && (
        <Box marginTop={2}>
          <Text color="green">✅ Settings saved successfully!</Text>
        </Box>
      )}
    </Box>
  );
}
