import React from "react";
interface AppWrapperProps {
    needsOnboarding: boolean;
    initialMessage?: string;
    watchMode?: boolean;
}
export default function AppWrapper({ needsOnboarding, initialMessage, watchMode, }: AppWrapperProps): React.JSX.Element;
export {};
