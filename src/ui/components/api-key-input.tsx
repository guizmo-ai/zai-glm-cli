import React, { useState } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { ZaiAgent } from "../../agent/zai-agent.js";
import { getSettingsManager } from "../../utils/settings-manager.js";

interface ApiKeyInputProps {
  onApiKeySet: (agent: ZaiAgent) => void;
}

export default function ApiKeyInput({ onApiKeySet }: ApiKeyInputProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { exit } = useApp();

  useInput((inputChar, key) => {
    if (isSubmitting) return;

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
      } catch (error) {
        console.log('\n⚠️ Could not save API key to settings file');
        console.log('API key set for current session only');
      }
      
      onApiKeySet(agent);
    } catch (error: any) {
      let errorMessage = "Invalid API key";

      // Provide more specific error messages
      if (error.message?.includes("ENOTFOUND") || error.message?.includes("ECONNREFUSED")) {
        errorMessage = "Network error: Cannot reach Z.ai API. Please check your internet connection.";
      } else if (error.message?.includes("401") || error.message?.includes("Unauthorized")) {
        errorMessage = "Invalid API key: The key you entered is not valid. Please check and try again.";
      } else if (error.message?.includes("403") || error.message?.includes("Forbidden")) {
        errorMessage = "API key rejected: This key doesn't have permission to access the API.";
      } else if (error.message?.includes("429")) {
        errorMessage = "Rate limit exceeded: Too many requests. Please try again later.";
      } else if (error.message?.includes("timeout")) {
        errorMessage = "Request timeout: API took too long to respond. Please try again.";
      } else if (error.message) {
        errorMessage = `API error: ${error.message}`;
      }

      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  const displayText = input.length > 0 ? 
    (isSubmitting ? "*".repeat(input.length) : "*".repeat(input.length) + "█") : 
    (isSubmitting ? " " : "█");

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Text color="yellow">🔑 ZAI API Key Required</Text>
      <Box marginBottom={1}>
        <Text color="gray">Please enter your ZAI API key to continue:</Text>
      </Box>
      
      <Box borderStyle="round" borderColor="blue" paddingX={1} marginBottom={1}>
        <Text color="gray">❯ </Text>
        <Text>{displayText}</Text>
      </Box>

      {error ? (
        <Box marginBottom={1}>
          <Text color="red">❌ {error}</Text>
        </Box>
      ) : null}

      <Box flexDirection="column" marginTop={1}>
        <Text color="gray" dimColor>• Press Enter to submit</Text>
        <Text color="gray" dimColor>• Press Ctrl+C to exit</Text>
        <Text color="gray" dimColor>Note: API key will be saved to ~/.zai/user-settings.json</Text>
      </Box>

      {isSubmitting ? (
        <Box marginTop={1}>
          <Text color="yellow">🔄 Validating API key...</Text>
        </Box>
      ) : null}
    </Box>
  );
}