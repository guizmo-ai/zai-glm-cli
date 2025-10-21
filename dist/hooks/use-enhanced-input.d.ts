export interface Key {
    name?: string;
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    paste?: boolean;
    sequence?: string;
    upArrow?: boolean;
    downArrow?: boolean;
    leftArrow?: boolean;
    rightArrow?: boolean;
    return?: boolean;
    escape?: boolean;
    tab?: boolean;
    backspace?: boolean;
    delete?: boolean;
}
export interface EnhancedInputHook {
    input: string;
    cursorPosition: number;
    isMultiline: boolean;
    setInput: (text: string) => void;
    setCursorPosition: (position: number) => void;
    clearInput: () => void;
    insertAtCursor: (text: string) => void;
    resetHistory: () => void;
    handleInput: (inputChar: string, key: Key) => void;
}
interface UseEnhancedInputProps {
    onSubmit?: (text: string) => void;
    onEscape?: () => void;
    onSpecialKey?: (key: Key) => boolean;
    disabled?: boolean;
    multiline?: boolean;
}
export declare function useEnhancedInput({ onSubmit, onEscape, onSpecialKey, disabled, multiline, }?: UseEnhancedInputProps): EnhancedInputHook;
export {};
