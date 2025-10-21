import React from "react";
interface OnboardingSetupProps {
    onComplete: (apiKey: string, model: string) => void;
}
export default function OnboardingSetup({ onComplete }: OnboardingSetupProps): React.JSX.Element;
export {};
