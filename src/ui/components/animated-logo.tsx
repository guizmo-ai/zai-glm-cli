import React from "react";
import { Box, Text } from "ink";
import CFonts from "cfonts";

interface AnimatedLogoProps {
  subtitle?: string;
  showSubtitle?: boolean;
}

export default function AnimatedLogo({ subtitle = "Powered by Z.ai", showSubtitle = true }: AnimatedLogoProps) {
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

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text>{zaiString}</Text>
      <Box marginTop={-3}>
        <Text>{glmString}</Text>
      </Box>
      {showSubtitle && (
        <Box marginTop={1} flexDirection="column">
          <Text color="cyan" dimColor>
            ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
          </Text>
          <Text color="blue" bold>
            {subtitle}
          </Text>
          <Text color="cyan" dimColor>
            ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
          </Text>
        </Box>
      )}
    </Box>
  );
}

/**
 * Alternative: Static gradient logo (no animation)
 * Use this for onboarding or when animation causes performance issues
 */
export function StaticGradientLogo({ subtitle = "Powered by Z.ai", showSubtitle = true }: AnimatedLogoProps) {
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

  return (
    <Box flexDirection="column" paddingY={1}>
      <Text>{zaiString}</Text>
      <Box marginTop={-3}>
        <Text>{glmString}</Text>
      </Box>
      {showSubtitle && (
        <Box marginTop={1} flexDirection="column">
          <Text color="cyan" dimColor>
            ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
          </Text>
          <Text color="blue" bold>
            {subtitle}
          </Text>
          <Text color="cyan" dimColor>
            ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
          </Text>
        </Box>
      )}
    </Box>
  );
}
