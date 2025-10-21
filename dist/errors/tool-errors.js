import { ZAIError } from './base-errors.js';
export class FileOperationError extends ZAIError {
    constructor(message, context, suggestions = []) {
        super(message, 'FILE_OPERATION_ERROR', {
            recoverable: true,
            suggestions,
            context,
        });
    }
}
export class FileNotFoundError extends FileOperationError {
    constructor(filePath, operation = 'read') {
        super(`File not found: ${filePath}`, { file: filePath, operation }, [
            {
                action: 'Verify the file path is correct',
                description: 'Check for typos or incorrect directory',
            },
            {
                action: 'Search for the file',
                description: 'Use the search tool to locate the file',
                command: `search "${filePath.split('/').pop()}"`,
            },
            {
                action: 'List directory contents',
                description: 'See what files exist in the directory',
                command: `bash ls ${filePath.split('/').slice(0, -1).join('/')}`,
            },
        ]);
    }
}
export class FilePermissionError extends FileOperationError {
    constructor(filePath, operation) {
        super(`Permission denied: Cannot ${operation} ${filePath}`, { file: filePath, operation }, [
            {
                action: 'Check file permissions',
                description: 'Verify you have the necessary permissions',
                command: `bash ls -la ${filePath}`,
            },
            {
                action: 'Use sudo (if appropriate)',
                description: 'Run the operation with elevated privileges',
            },
        ]);
    }
}
export class FileAlreadyExistsError extends FileOperationError {
    constructor(filePath) {
        super(`File already exists: ${filePath}`, { file: filePath, operation: 'create' }, [
            {
                action: 'Use str_replace_editor instead',
                description: 'Edit the existing file rather than creating a new one',
            },
            {
                action: 'View the existing file',
                description: 'Check the current contents of the file',
                command: `view_file "${filePath}"`,
            },
            {
                action: 'Delete the file first (if intentional)',
                description: 'Remove the existing file before creating a new one',
                command: `bash rm "${filePath}"`,
            },
        ]);
    }
}
export class ToolExecutionError extends ZAIError {
    constructor(toolName, message, context = {}, cause) {
        super(`Tool '${toolName}' execution failed: ${message}`, 'TOOL_EXECUTION_ERROR', {
            recoverable: true,
            context: { tool: toolName, ...context },
            cause,
            suggestions: [
                {
                    action: 'Review tool parameters',
                    description: 'Ensure all required parameters are correct',
                },
                {
                    action: 'Try an alternative tool',
                    description: 'Consider using a different approach',
                },
            ],
        });
    }
}
export class BashCommandError extends ZAIError {
    constructor(command, exitCode, stderr, context = {}) {
        const suggestions = [];
        // Smart suggestions based on common errors
        if (stderr.includes('command not found')) {
            const commandName = command.split(' ')[0];
            suggestions.push({
                action: 'Install the missing command',
                description: `The command '${commandName}' may not be installed on your system`,
            });
            suggestions.push({
                action: 'Check if command is in PATH',
                description: 'Verify the command is accessible',
                command: 'bash which ' + commandName,
            });
        }
        else if (stderr.includes('Permission denied')) {
            suggestions.push({
                action: 'Check permissions',
                description: 'You may need elevated privileges',
            });
            suggestions.push({
                action: 'Run with sudo (if appropriate)',
                description: 'Execute the command with elevated privileges',
            });
        }
        else if (exitCode === 127) {
            suggestions.push({
                action: 'Verify the command exists',
                description: 'Check if the command is in your PATH',
                command: 'bash echo $PATH',
            });
        }
        else if (stderr.includes('No such file or directory')) {
            suggestions.push({
                action: 'Verify the file path',
                description: 'Check that the file or directory exists',
            });
            suggestions.push({
                action: 'List current directory',
                description: 'See available files and directories',
                command: 'bash ls -la',
            });
        }
        else if (stderr.includes('syntax error')) {
            suggestions.push({
                action: 'Check command syntax',
                description: 'Review the command for syntax errors',
            });
            suggestions.push({
                action: 'Escape special characters',
                description: 'Ensure special characters are properly escaped',
            });
        }
        super(`Bash command failed with exit code ${exitCode}: ${command}`, 'BASH_COMMAND_ERROR', {
            recoverable: true,
            context: { command, exitCode, stderr: stderr.substring(0, 200), ...context },
            suggestions,
        });
    }
}
export class DirectoryNotFoundError extends FileOperationError {
    constructor(dirPath, operation = 'access') {
        super(`Directory not found: ${dirPath}`, { directory: dirPath, operation }, [
            {
                action: 'Verify the directory path',
                description: 'Check for typos or incorrect path',
            },
            {
                action: 'Create the directory',
                description: 'Create the missing directory if needed',
                command: `bash mkdir -p "${dirPath}"`,
            },
            {
                action: 'List parent directory',
                description: 'See what exists in the parent directory',
                command: `bash ls -la ${dirPath.split('/').slice(0, -1).join('/')}`,
            },
        ]);
    }
}
export class InvalidLineNumberError extends FileOperationError {
    constructor(filePath, lineNumber, totalLines, operation = 'access') {
        super(`Invalid line number ${lineNumber}: File has ${totalLines} lines`, { file: filePath, lineNumber, totalLines, operation }, [
            {
                action: 'Use a valid line number',
                description: `Choose a line number between 1 and ${totalLines}`,
            },
            {
                action: 'View the file',
                description: 'See the file contents to determine the correct line',
                command: `view_file "${filePath}"`,
            },
        ]);
    }
}
//# sourceMappingURL=tool-errors.js.map