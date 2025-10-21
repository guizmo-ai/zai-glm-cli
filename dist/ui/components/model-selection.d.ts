import React from "react";
interface ModelOption {
    model: string;
}
interface ModelSelectionProps {
    models: ModelOption[];
    selectedIndex: number;
    isVisible: boolean;
    currentModel: string;
}
export declare function ModelSelection({ models, selectedIndex, isVisible, currentModel, }: ModelSelectionProps): React.JSX.Element;
export {};
