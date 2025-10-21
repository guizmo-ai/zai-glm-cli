import React from "react";
import { Box, Text } from "ink";
import CFonts from "cfonts";
export default function AnimatedLogo({ subtitle = "Powered by Z.ai", showSubtitle = true }) {
    // Generate ZAI logo
    const zaiOutput = CFonts.render("ZAI", {
        font: "3d",
        align: "left",
        colors: ["magenta", "gray"],
        space: true,
        maxLength: "0",
        gradient: ["magenta", "cyan"],
        independentGradient: false,
        transitionGradient: true,
        env: "node",
    });
    // Generate GLM logo (same style as ZAI)
    const glmOutput = CFonts.render("GLM", {
        font: "3d",
        align: "left",
        colors: ["magenta", "gray"],
        space: true,
        maxLength: "0",
        gradient: ["magenta", "cyan"],
        independentGradient: false,
        transitionGradient: true,
        env: "node",
    });
    const zaiString = zaiOutput && typeof zaiOutput === "object" && "string" in zaiOutput ? zaiOutput.string : "ZAI";
    const glmString = glmOutput && typeof glmOutput === "object" && "string" in glmOutput ? glmOutput.string : "GLM";
    return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
        React.createElement(Text, null, zaiString),
        React.createElement(Box, { marginTop: -3 },
            React.createElement(Text, null, glmString)),
        showSubtitle && (React.createElement(Box, { marginTop: 1, flexDirection: "column" },
            React.createElement(Text, { color: "cyan", dimColor: true }, "\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C"),
            React.createElement(Text, { color: "blue", bold: true }, subtitle),
            React.createElement(Text, { color: "cyan", dimColor: true }, "\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C")))));
}
/**
 * Alternative: Static gradient logo (no animation)
 * Use this for onboarding or when animation causes performance issues
 */
export function StaticGradientLogo({ subtitle = "Powered by Z.ai", showSubtitle = true }) {
    // Generate ZAI logo
    const zaiOutput = CFonts.render("ZAI", {
        font: "3d",
        align: "left",
        colors: ["magenta", "gray"],
        space: true,
        maxLength: "0",
        gradient: ["magenta", "cyan"],
        independentGradient: false,
        transitionGradient: true,
        env: "node",
    });
    // Generate GLM logo (same style as ZAI)
    const glmOutput = CFonts.render("GLM", {
        font: "3d",
        align: "left",
        colors: ["magenta", "gray"],
        space: true,
        maxLength: "0",
        gradient: ["magenta", "cyan"],
        independentGradient: false,
        transitionGradient: true,
        env: "node",
    });
    const zaiString = zaiOutput && typeof zaiOutput === "object" && "string" in zaiOutput ? zaiOutput.string : "ZAI";
    const glmString = glmOutput && typeof glmOutput === "object" && "string" in glmOutput ? glmOutput.string : "GLM";
    return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
        React.createElement(Text, null, zaiString),
        React.createElement(Box, { marginTop: -3 },
            React.createElement(Text, null, glmString)),
        showSubtitle && (React.createElement(Box, { marginTop: 1, flexDirection: "column" },
            React.createElement(Text, { color: "cyan", dimColor: true }, "\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C"),
            React.createElement(Text, { color: "blue", bold: true }, subtitle),
            React.createElement(Text, { color: "cyan", dimColor: true }, "\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C\u254C")))));
}
//# sourceMappingURL=animated-logo.js.map