import React, { useState } from "react";
import { Box, Text, useInput, useApp } from "ink";
import TextInput from "ink-text-input";
import { getSettingsManager } from "../../utils/settings-manager.js";
import { StaticGradientLogo } from "./animated-logo.js";

interface OnboardingSetupProps {
  onComplete: (apiKey: string, model: string) => void;
}

type SetupStep = "welcome" | "api-key" | "model" | "complete";

export default function OnboardingSetup({ onComplete }: OnboardingSetupProps) {
  const [step, setStep] = useState<SetupStep>("welcome");
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
        } else if (key.downArrow) {
          setSelectedModel((prev) => (prev < models.length - 1 ? prev + 1 : 0));
        } else if (key.return || key.tab) {
          handleComplete();
        }
        break;
    }
  });

  const handleApiKeySubmit = (value: string) => {
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
  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      {step === "welcome" && (
        <>
          <StaticGradientLogo subtitle="Powered by Stebou" showSubtitle={true} />
          <Text color="cyan" bold>
            🎉 Welcome to ZAI CLI!
          </Text>
          <Box marginTop={1} flexDirection="column">
            <Text>Let's set up your Z.ai configuration.</Text>
            <Text color="gray" dimColor>
              This will only take a moment.
            </Text>
          </Box>
          <Box marginTop={2}>
            <Text color="yellow">Press Enter to continue...</Text>
          </Box>
        </>
      )}

      {step === "api-key" && (
        <>
          <Text color="cyan" bold>
            🔑 Z.ai API Key
          </Text>
          <Box marginTop={1} flexDirection="column">
            <Text>Enter your Z.ai API key:</Text>
            <Text color="gray" dimColor>
              (Get one at: https://z.ai/manage-apikey/apikey-list)
            </Text>
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
              Press Enter to continue
            </Text>
          </Box>
        </>
      )}

      {step === "model" && (
        <>
          <Text color="cyan" bold>
            🤖 Select Default Model
          </Text>
          <Box marginTop={1} flexDirection="column">
            {models.map((model, index) => (
              <Box key={model} paddingLeft={1}>
                <Text
                  color={index === selectedModel ? "black" : "white"}
                  backgroundColor={index === selectedModel ? "cyan" : undefined}
                >
                  {model}
                  {model === "glm-4.6" && " (Recommended - 200K context)"}
                  {model === "glm-4.5" && " (128K context)"}
                  {model === "glm-4.5-air" && " (Compact & Fast)"}
                </Text>
              </Box>
            ))}
          </Box>
          <Box marginTop={1}>
            <Text color="gray" dimColor>
              ↑↓ navigate • Enter select
            </Text>
          </Box>
        </>
      )}

      {step === "complete" && (
        <>
          <Text color="green" bold>
            ✅ Setup Complete!
          </Text>
          <Box marginTop={1}>
            <Text>
              Your configuration has been saved to ~/.zai/user-settings.json
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text color="cyan">Starting ZAI CLI...</Text>
          </Box>
        </>
      )}
    </Box>
  );
}
