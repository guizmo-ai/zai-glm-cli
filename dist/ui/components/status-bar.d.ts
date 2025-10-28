import React from "react";
export type OperationState = "idle" | "thinking" | "executing" | "waiting" | "streaming";
interface StatusBarProps {
    state: OperationState;
    currentOperation?: string;
    showAnimatedDots?: boolean;
}
export declare function StatusBar({ state, currentOperation, showAnimatedDots }: StatusBarProps): React.JSX.Element;
export {};
