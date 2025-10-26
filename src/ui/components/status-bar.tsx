import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";

export type OperationState = "idle" | "thinking" | "executing" | "waiting" | "streaming";

interface StatusBarProps {
  state: OperationState;
  currentOperation?: string;
  showAnimatedDots?: boolean;
}

export function StatusBar({ state, currentOperation, showAnimatedDots = true }: StatusBarProps) {
  const [dots, setDots] = useState(".");

  // Animated dots for active states
  useEffect(() => {
    if (!showAnimatedDots || state === "idle") {
      setDots("");
      return;
    }

    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === "...") return ".";
        return prev + ".";
      });
    }, 500);

    return () => clearInterval(interval);
  }, [state, showAnimatedDots]);

  const getStateColor = (state: OperationState): string => {
    switch (state) {
      case "idle":
        return "gray";
      case "thinking":
        return "magenta";
      case "executing":
        return "cyan";
      case "waiting":
        return "yellow";
      case "streaming":
        return "blue";
      default:
        return "white";
    }
  };

  const getStateIcon = (state: OperationState): string => {
    switch (state) {
      case "idle":
        return "○";
      case "thinking":
        return "💭";
      case "executing":
        return "⚙";
      case "waiting":
        return "⏳";
      case "streaming":
        return "▶";
      default:
        return "●";
    }
  };

  const getStateLabel = (state: OperationState): string => {
    switch (state) {
      case "idle":
        return "Ready";
      case "thinking":
        return "Thinking";
      case "executing":
        return "Executing";
      case "waiting":
        return "Waiting";
      case "streaming":
        return "Streaming";
      default:
        return "Unknown";
    }
  };

  if (state === "idle" && !currentOperation) {
    return null;
  }

  return (
    <Box
      borderStyle="single"
      borderColor={getStateColor(state)}
      paddingX={1}
      marginBottom={1}
    >
      <Text color={getStateColor(state)}>
        {getStateIcon(state)} {getStateLabel(state)}
        {state !== "idle" && dots}
      </Text>
      {currentOperation && (
        <Text color="gray" dimColor>
          {" "}
          - {currentOperation}
        </Text>
      )}
    </Box>
  );
}
