import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { formatTokenCount } from "../../utils/token-counter.js";
const loadingTexts = [
    "Thinking...",
    "Computing...",
    "Analyzing...",
    "Processing...",
    "Calculating...",
    "Interfacing...",
    "Optimizing...",
    "Synthesizing...",
    "Decrypting...",
    "Calibrating...",
    "Bootstrapping...",
    "Synchronizing...",
    "Compiling...",
    "Downloading...",
];
export function LoadingSpinner({ isActive, processingTime, tokenCount, }) {
    const [spinnerFrame, setSpinnerFrame] = useState(0);
    const [loadingTextIndex, setLoadingTextIndex] = useState(0);
    useEffect(() => {
        if (!isActive)
            return;
        const spinnerFrames = ["/", "-", "\\", "|"];
        // Reduced frequency: 500ms instead of 250ms to reduce flickering on Windows
        const interval = setInterval(() => {
            setSpinnerFrame((prev) => (prev + 1) % spinnerFrames.length);
        }, 500);
        return () => clearInterval(interval);
    }, [isActive]);
    useEffect(() => {
        if (!isActive)
            return;
        setLoadingTextIndex(Math.floor(Math.random() * loadingTexts.length));
        // Increased interval: 4s instead of 2s to reduce state changes
        const interval = setInterval(() => {
            setLoadingTextIndex(Math.floor(Math.random() * loadingTexts.length));
        }, 4000);
        return () => clearInterval(interval);
    }, [isActive]);
    if (!isActive)
        return null;
    const spinnerFrames = ["/", "-", "\\", "|"];
    return (React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { color: "cyan" },
            spinnerFrames[spinnerFrame],
            " ",
            loadingTexts[loadingTextIndex],
            " "),
        React.createElement(Text, { color: "gray" },
            "(",
            processingTime,
            "s \u00B7 \u2191 ",
            formatTokenCount(tokenCount),
            " tokens \u00B7 esc to interrupt)")));
}
//# sourceMappingURL=loading-spinner.js.map