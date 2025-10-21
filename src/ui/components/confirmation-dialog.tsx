import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { DiffRenderer } from "./diff-renderer.js";

interface ConfirmationDialogProps {
  operation: string;
  filename: string;
  onConfirm: (dontAskAgain?: boolean, editManually?: boolean) => void;
  onReject: (feedback?: string) => void;
  showVSCodeOpen?: boolean;
  content?: string; // Optional content to show (file content or command)
  interactiveDiff?: boolean; // Enable interactive diff mode
  oldContent?: string; // Original content for diff
  newContent?: string; // New content for diff
}

export default function ConfirmationDialog({
  operation,
  filename,
  onConfirm,
  onReject,
  showVSCodeOpen = false,
  content,
  interactiveDiff = false,
  oldContent,
  newContent,
}: ConfirmationDialogProps) {
  const [selectedOption, setSelectedOption] = useState(0);
  const [feedbackMode, setFeedbackMode] = useState(false);
  const [feedback, setFeedback] = useState("");

  const options = interactiveDiff
    ? [
        "Accept",
        "Accept all (don't ask again)",
        "Reject",
        "Edit manually",
      ]
    : [
        "Yes",
        "Yes, and don't ask again this session",
        "No",
        "No, with feedback",
      ];

  useInput((input, key) => {
    if (feedbackMode) {
      if (key.return) {
        onReject(feedback.trim());
        return;
      }
      if (key.backspace || key.delete) {
        setFeedback((prev) => prev.slice(0, -1));
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setFeedback((prev) => prev + input);
      }
      return;
    }

    if (key.upArrow || (key.shift && key.tab)) {
      setSelectedOption((prev) => (prev > 0 ? prev - 1 : options.length - 1));
      return;
    }

    if (key.downArrow || key.tab) {
      setSelectedOption((prev) => (prev + 1) % options.length);
      return;
    }

    if (key.return) {
      if (selectedOption === 0) {
        onConfirm(false, false);
      } else if (selectedOption === 1) {
        onConfirm(true, false);
      } else if (selectedOption === 2) {
        onReject("Operation cancelled by user");
      } else {
        if (interactiveDiff) {
          // Edit manually option
          onConfirm(false, true);
        } else {
          // Feedback mode for non-interactive
          setFeedbackMode(true);
        }
      }
      return;
    }

    if (key.escape) {
      if (feedbackMode) {
        setFeedbackMode(false);
        setFeedback("");
      } else {
        // Cancel the confirmation when escape is pressed from main confirmation
        onReject("Operation cancelled by user (pressed Escape)");
      }
      return;
    }
  });

  if (feedbackMode) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box flexDirection="column" marginBottom={1}>
          <Text color="gray">
            Type your feedback and press Enter, or press Escape to go back.
          </Text>
        </Box>

        <Box
          borderStyle="round"
          borderColor="yellow"
          paddingX={1}
          marginTop={1}
        >
          <Text color="gray">❯ </Text>
          <Text>
            {feedback}
            <Text color="white">█</Text>
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Tool use header - styled like chat history */}
      <Box marginTop={1}>
        <Box>
          <Text color="magenta">⏺</Text>
          <Text color="white">
            {" "}
            {operation}({filename})
          </Text>
        </Box>
      </Box>

      <Box marginLeft={2} flexDirection="column">
        <Text color="gray">⎿ Requesting user confirmation</Text>

        {showVSCodeOpen && (
          <Box marginTop={1}>
            <Text color="gray">⎿ Opened changes in Visual Studio Code ⧉</Text>
          </Box>
        )}

        {/* Show content preview if provided */}
        {content && (
          <>
            <Text color="gray">⎿ {content.split('\n')[0]}</Text>
            <Box marginLeft={4} flexDirection="column">
              <DiffRenderer
                diffContent={content}
                filename={filename}
                terminalWidth={80}
              />
            </Box>
          </>
        )}
      </Box>

      {/* Confirmation options */}
      <Box flexDirection="column" marginTop={1}>
        <Box marginBottom={1}>
          <Text>Do you want to proceed with this operation?</Text>
        </Box>

        <Box flexDirection="column">
          {options.map((option, index) => (
            <Box key={index} paddingLeft={1}>
              <Text
                color={selectedOption === index ? "black" : "white"}
                backgroundColor={selectedOption === index ? "cyan" : undefined}
              >
                {index + 1}. {option}
              </Text>
            </Box>
          ))}
        </Box>

        <Box marginTop={1}>
          <Text color="gray" dimColor>
            ↑↓ navigate • Enter select • Esc cancel
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
