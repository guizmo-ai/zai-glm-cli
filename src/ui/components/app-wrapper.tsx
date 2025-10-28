import React, { useState } from "react";
import OnboardingSetup from "./onboarding-setup.js";
import ChatInterface from "./chat-interface.js";
import { ZaiAgent } from "../../agent/zai-agent.js";
import { getSettingsManager } from "../../utils/settings-manager.js";

interface AppWrapperProps {
  needsOnboarding: boolean;
  initialMessage?: string;
  watchMode?: boolean;
}

export default function AppWrapper({
  needsOnboarding,
  initialMessage,
  watchMode = false,
}: AppWrapperProps) {
  const [showOnboarding, setShowOnboarding] = useState(needsOnboarding);
  const [agent, setAgent] = useState<ZaiAgent | null>(null);

  const handleOnboardingComplete = (apiKey: string, model: string) => {
    // Get base URL from settings manager (already set during onboarding)
    const settingsManager = getSettingsManager();
    const baseURL = settingsManager.getBaseURL();

    // Create agent with onboarding settings
    const newAgent = new ZaiAgent(apiKey, baseURL, model);
    setAgent(newAgent);

    // Transition to chat interface
    setShowOnboarding(false);
  };

  if (showOnboarding) {
    return <OnboardingSetup onComplete={handleOnboardingComplete} />;
  }

  if (!agent) {
    // This should never happen, but just in case
    return null;
  }

  return (
    <ChatInterface
      agent={agent}
      initialMessage={initialMessage}
      watchMode={watchMode}
    />
  );
}
