import { exec } from 'child_process';
import { promisify } from 'util';
import { ConfirmationService } from '../utils/confirmation-service.js';
import { BashCommandError, FilePermissionError, DirectoryNotFoundError } from '../errors/index.js';
import { ErrorHandler } from '../utils/error-handler.js';
const execAsync = promisify(exec);
export class BashTool {
    currentDirectory = process.cwd();
    confirmationService = ConfirmationService.getInstance();
    // Liste des commandes en lecture seule qui ne nécessitent pas de confirmation
    READ_ONLY_COMMANDS = [
        'ls', 'pwd', 'cat', 'head', 'tail', 'less', 'more', 'echo',
        'grep', 'egrep', 'fgrep', 'rg', 'ag', 'find', 'locate', 'which', 'whereis', 'type',
        'git status', 'git log', 'git diff', 'git show', 'git branch',
        'ps', 'top', 'df', 'du', 'free', 'whoami', 'hostname', 'uname',
        'curl', 'wget', 'ping', 'dig', 'nslookup',
        'node', 'bun', 'npm list', 'npm ls', 'bun list',
        'env', 'printenv', 'date', 'cal', 'uptime', 'w', 'who',
        'file', 'stat', 'wc', 'sort', 'uniq', 'sed', 'awk'
    ];
    // Détermine si une commande nécessite une confirmation
    isDestructiveCommand(command) {
        const trimmedCommand = command.trim().toLowerCase();
        // Vérifier si c'est une commande en lecture seule
        for (const readOnlyCmd of this.READ_ONLY_COMMANDS) {
            if (trimmedCommand.startsWith(readOnlyCmd)) {
                return false; // Pas besoin de confirmation
            }
        }
        // Liste des commandes destructives/modificatrices
        const destructivePatterns = [
            'rm ', 'rmdir ', 'mv ', 'cp ', 'mkdir ', 'touch ',
            'chmod ', 'chown ', 'chgrp ',
            'git add', 'git commit', 'git push', 'git pull', 'git checkout', 'git merge', 'git rebase',
            'npm install', 'npm uninstall', 'npm update', 'npm remove',
            'bun add', 'bun remove', 'bun install',
            'ln ', 'ln -s',
            'tar ', 'zip ', 'unzip ',
            'kill ', 'killall ',
            'systemctl ', 'service ',
            'dd ', 'fdisk ', 'mkfs',
            '>', '>>', // Redirection vers fichiers
        ];
        for (const pattern of destructivePatterns) {
            if (trimmedCommand.includes(pattern)) {
                return true; // Besoin de confirmation
            }
        }
        return false; // Par défaut, pas de confirmation pour les autres commandes
    }
    async execute(command, timeout = 30000) {
        try {
            // Vérifier si la commande est destructive et nécessite une confirmation
            const isDestructive = this.isDestructiveCommand(command);
            // Check if user has already accepted bash commands for this session
            const sessionFlags = this.confirmationService.getSessionFlags();
            if (isDestructive && !sessionFlags.bashCommands && !sessionFlags.allOperations) {
                // Request confirmation showing the command
                const confirmationResult = await this.confirmationService.requestConfirmation({
                    operation: 'Run bash command',
                    filename: command,
                    showVSCodeOpen: false,
                    content: `Command: ${command}\nWorking directory: ${this.currentDirectory}`
                }, 'bash');
                if (!confirmationResult.confirmed) {
                    return {
                        success: false,
                        error: confirmationResult.feedback || 'Command execution cancelled by user'
                    };
                }
            }
            if (command.startsWith('cd ')) {
                const newDir = command.substring(3).trim();
                try {
                    process.chdir(newDir);
                    this.currentDirectory = process.cwd();
                    return {
                        success: true,
                        output: `Changed directory to: ${this.currentDirectory}`
                    };
                }
                catch (error) {
                    // Handle directory errors with typed errors
                    if (error.code === 'ENOENT') {
                        const dirError = new DirectoryNotFoundError(newDir, 'change to');
                        return {
                            success: false,
                            error: ErrorHandler.toSimpleMessage(dirError)
                        };
                    }
                    else if (error.code === 'EACCES' || error.code === 'EPERM') {
                        const permError = new FilePermissionError(newDir, 'access directory');
                        return {
                            success: false,
                            error: ErrorHandler.toSimpleMessage(permError)
                        };
                    }
                    return {
                        success: false,
                        error: `Cannot change directory: ${error.message}`
                    };
                }
            }
            const { stdout, stderr } = await execAsync(command, {
                cwd: this.currentDirectory,
                timeout,
                maxBuffer: 1024 * 1024
            });
            const output = stdout + (stderr ? `\nSTDERR: ${stderr}` : '');
            return {
                success: true,
                output: output.trim() || 'Command executed successfully (no output)'
            };
        }
        catch (error) {
            // Handle execution errors with typed errors
            if (error.code === 'EACCES' || error.code === 'EPERM') {
                const permError = new FilePermissionError(command, 'execute');
                return {
                    success: false,
                    error: ErrorHandler.toSimpleMessage(permError)
                };
            }
            // For command execution errors with exit codes
            if (error.code && typeof error.code === 'number') {
                const cmdError = new BashCommandError(command, error.code, error.stderr || error.message, { cwd: this.currentDirectory });
                return {
                    success: false,
                    error: ErrorHandler.toSimpleMessage(cmdError)
                };
            }
            // Generic error fallback
            return {
                success: false,
                error: `Command failed: ${error.message}`
            };
        }
    }
    getCurrentDirectory() {
        return this.currentDirectory;
    }
    async listFiles(directory = '.') {
        return this.execute(`ls -la ${directory}`);
    }
    async findFiles(pattern, directory = '.') {
        return this.execute(`find ${directory} -name "${pattern}" -type f`);
    }
    async grep(pattern, files = '.') {
        return this.execute(`grep -r "${pattern}" ${files}`);
    }
}
//# sourceMappingURL=bash.js.map