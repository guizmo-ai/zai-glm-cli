import { ToolResult } from "../types/index.js";
export declare class MorphEditorTool {
    private confirmationService;
    private morphApiKey;
    private morphBaseUrl;
    constructor(apiKey?: string);
    /**
     * Use this tool to make an edit to an existing file.
     *
     * This will be read by a less intelligent model, which will quickly apply the edit. You should make it clear what the edit is, while also minimizing the unchanged code you write.
     * When writing the edit, you should specify each edit in sequence, with the special comment // ... existing code ... to represent unchanged code in between edited lines.
     *
     * For example:
     *
     * // ... existing code ...
     * FIRST_EDIT
     * // ... existing code ...
     * SECOND_EDIT
     * // ... existing code ...
     * THIRD_EDIT
     * // ... existing code ...
     *
     * You should still bias towards repeating as few lines of the original file as possible to convey the change.
     * But, each edit should contain sufficient context of unchanged lines around the code you're editing to resolve ambiguity.
     * DO NOT omit spans of pre-existing code (or comments) without using the // ... existing code ... comment to indicate its absence. If you omit the existing code comment, the model may inadvertently delete these lines.
     * If you plan on deleting a section, you must provide context before and after to delete it. If the initial code is ```code \n Block 1 \n Block 2 \n Block 3 \n code```, and you want to remove Block 2, you would output ```// ... existing code ... \n Block 1 \n  Block 3 \n // ... existing code ...```.
     * Make sure it is clear what the edit should be, and where it should be applied.
     * Make edits to a file in a single edit_file call instead of multiple edit_file calls to the same file. The apply model can handle many distinct edits at once.
     */
    editFile(targetFile: string, instructions: string, codeEdit: string): Promise<ToolResult>;
    private callMorphApply;
    private generateDiff;
    view(filePath: string, viewRange?: [number, number]): Promise<ToolResult>;
    setApiKey(apiKey: string): void;
    getApiKey(): string;
}
