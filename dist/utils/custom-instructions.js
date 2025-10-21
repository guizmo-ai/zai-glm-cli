import * as fs from 'fs';
import * as path from 'path';
/**
 * Load custom instructions from the project's .zai/ZAI.md file
 * This allows projects to define Z.ai-specific behavior and context
 */
export function loadCustomInstructions(workingDirectory = process.cwd()) {
    try {
        const instructionsPath = path.join(workingDirectory, '.zai', 'ZAI.md');
        if (!fs.existsSync(instructionsPath)) {
            return null;
        }
        const customInstructions = fs.readFileSync(instructionsPath, 'utf-8');
        return customInstructions.trim();
    }
    catch (error) {
        console.warn('Failed to load Z.ai custom instructions:', error);
        return null;
    }
}
//# sourceMappingURL=custom-instructions.js.map