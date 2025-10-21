import React from "react";
interface LoadingSpinnerProps {
    isActive: boolean;
    processingTime: number;
    tokenCount: number;
}
export declare function LoadingSpinner({ isActive, processingTime, tokenCount, }: LoadingSpinnerProps): React.JSX.Element;
export {};
