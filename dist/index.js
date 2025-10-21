#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { program } from "commander";
import * as dotenv from "dotenv";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import { ZaiAgent } from "./agent/zai-agent.js";
import ChatInterface from "./ui/components/chat-interface.js";
import OnboardingSetup from "./ui/components/onboarding-setup.js";
import SettingsPanel from "./ui/components/settings-panel.js";
import { getSettingsManager } from "./utils/settings-manager.js";
import { ConfirmationService } from "./utils/confirmation-service.js";
import { createMCPCommand } from "./commands/mcp.js";
import { getMetricsCollector } from "./utils/metrics.js";
import { getSessionManager } from "./utils/session-manager.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
// Get package version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(path.join(__dirname, "../package.json"), "utf-8"));
const VERSION = packageJson.version;
// Load environment variables
dotenv.config();
// Disable default SIGINT handling to let Ink handle Ctrl+C
// We'll handle exit through the input system instead
process.on("SIGTERM", () => {
    // Restore terminal to normal mode before exit
    if (process.stdin.isTTY && process.stdin.setRawMode) {
        try {
            process.stdin.setRawMode(false);
        }
        catch (e) {
            // Ignore errors when setting raw mode
        }
    }
    console.log("\nGracefully shutting down...");
    process.exit(0);
});
// Handle uncaught exceptions to prevent hanging
process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
    process.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled rejection at:", promise, "reason:", reason);
    process.exit(1);
});
// Check if this is the first run
function isFirstRun() {
    const manager = getSettingsManager();
    const settingsPath = path.join(os.homedir(), ".zai", "user-settings.json");
    return !fs.existsSync(settingsPath) || !manager.getApiKey();
}
// Ensure user settings are initialized
function ensureUserSettingsDirectory() {
    try {
        const manager = getSettingsManager();
        // This will create default settings if they don't exist
        manager.loadUserSettings();
    }
    catch (error) {
        // Silently ignore errors during setup
    }
}
// Load API key from user settings if not in environment
function loadApiKey() {
    const manager = getSettingsManager();
    return manager.getApiKey();
}
// Load base URL from user settings if not in environment
function loadBaseURL() {
    const manager = getSettingsManager();
    return manager.getBaseURL();
}
// Save command line settings to user settings file
async function saveCommandLineSettings(apiKey, baseURL) {
    try {
        const manager = getSettingsManager();
        // Update with command line values
        if (apiKey) {
            manager.updateUserSetting("apiKey", apiKey);
            console.log("✅ API key saved to ~/.zai/user-settings.json");
        }
        if (baseURL) {
            manager.updateUserSetting("baseURL", baseURL);
            console.log("✅ Base URL saved to ~/.zai/user-settings.json");
        }
    }
    catch (error) {
        console.warn("⚠️ Could not save settings to file:", error instanceof Error ? error.message : "Unknown error");
    }
}
// Load model from user settings if not in environment
function loadModel() {
    // First check environment variables
    let model = process.env.ZAI_MODEL;
    if (!model) {
        // Use the unified model loading from settings manager
        try {
            const manager = getSettingsManager();
            model = manager.getCurrentModel();
        }
        catch (error) {
            // Ignore errors, model will remain undefined
        }
    }
    return model;
}
// Handle commit-and-push command in headless mode
async function handleCommitAndPushHeadless(apiKey, baseURL, model, maxToolRounds) {
    try {
        const agent = new ZaiAgent(apiKey, baseURL, model, maxToolRounds);
        // Configure confirmation service for headless mode (auto-approve all operations)
        const confirmationService = ConfirmationService.getInstance();
        confirmationService.setSessionFlag("allOperations", true);
        console.log("🤖 Processing commit and push...\n");
        console.log("> /commit-and-push\n");
        // First check if there are any changes at all
        const initialStatusResult = await agent.executeBashCommand("git status --porcelain");
        if (!initialStatusResult.success || !initialStatusResult.output?.trim()) {
            console.log("❌ No changes to commit. Working directory is clean.");
            process.exit(1);
        }
        console.log("✅ git status: Changes detected");
        // Add all changes
        const addResult = await agent.executeBashCommand("git add .");
        if (!addResult.success) {
            console.log(`❌ git add: ${addResult.error || "Failed to stage changes"}`);
            process.exit(1);
        }
        console.log("✅ git add: Changes staged");
        // Get staged changes for commit message generation
        const diffResult = await agent.executeBashCommand("git diff --cached");
        // Generate commit message using AI
        const commitPrompt = `Generate a concise, professional git commit message for these changes:

Git Status:
${initialStatusResult.output}

Git Diff (staged changes):
${diffResult.output || "No staged changes shown"}

Follow conventional commit format (feat:, fix:, docs:, etc.) and keep it under 72 characters.
Respond with ONLY the commit message, no additional text.`;
        console.log("🤖 Generating commit message...");
        const commitMessageEntries = await agent.processUserMessage(commitPrompt);
        let commitMessage = "";
        // Extract the commit message from the AI response
        for (const entry of commitMessageEntries) {
            if (entry.type === "assistant" && entry.content.trim()) {
                commitMessage = entry.content.trim();
                break;
            }
        }
        if (!commitMessage) {
            console.log("❌ Failed to generate commit message");
            process.exit(1);
        }
        // Clean the commit message
        const cleanCommitMessage = commitMessage.replace(/^["']|["']$/g, "");
        console.log(`✅ Generated commit message: "${cleanCommitMessage}"`);
        // Execute the commit
        const commitCommand = `git commit -m "${cleanCommitMessage}"`;
        const commitResult = await agent.executeBashCommand(commitCommand);
        if (commitResult.success) {
            console.log(`✅ git commit: ${commitResult.output?.split("\n")[0] || "Commit successful"}`);
            // If commit was successful, push to remote
            // First try regular push, if it fails try with upstream setup
            let pushResult = await agent.executeBashCommand("git push");
            if (!pushResult.success &&
                pushResult.error?.includes("no upstream branch")) {
                console.log("🔄 Setting upstream and pushing...");
                pushResult = await agent.executeBashCommand("git push -u origin HEAD");
            }
            if (pushResult.success) {
                console.log(`✅ git push: ${pushResult.output?.split("\n")[0] || "Push successful"}`);
            }
            else {
                console.log(`❌ git push: ${pushResult.error || "Push failed"}`);
                process.exit(1);
            }
        }
        else {
            console.log(`❌ git commit: ${commitResult.error || "Commit failed"}`);
            process.exit(1);
        }
    }
    catch (error) {
        console.error("❌ Error during commit and push:", error.message);
        process.exit(1);
    }
}
// Headless mode processing function
async function processPromptHeadless(prompt, apiKey, baseURL, model, maxToolRounds) {
    try {
        const agent = new ZaiAgent(apiKey, baseURL, model, maxToolRounds);
        // Configure confirmation service for headless mode (auto-approve all operations)
        const confirmationService = ConfirmationService.getInstance();
        confirmationService.setSessionFlag("allOperations", true);
        // Process the user message
        const chatEntries = await agent.processUserMessage(prompt);
        // Convert chat entries to OpenAI compatible message objects
        const messages = [];
        for (const entry of chatEntries) {
            switch (entry.type) {
                case "user":
                    messages.push({
                        role: "user",
                        content: entry.content,
                    });
                    break;
                case "assistant":
                    const assistantMessage = {
                        role: "assistant",
                        content: entry.content,
                    };
                    // Add tool calls if present
                    if (entry.toolCalls && entry.toolCalls.length > 0) {
                        assistantMessage.tool_calls = entry.toolCalls.map((toolCall) => ({
                            id: toolCall.id,
                            type: "function",
                            function: {
                                name: toolCall.function.name,
                                arguments: toolCall.function.arguments,
                            },
                        }));
                    }
                    messages.push(assistantMessage);
                    break;
                case "tool_result":
                    if (entry.toolCall) {
                        messages.push({
                            role: "tool",
                            tool_call_id: entry.toolCall.id,
                            content: entry.content,
                        });
                    }
                    break;
            }
        }
        // Output each message as a separate JSON object
        for (const message of messages) {
            console.log(JSON.stringify(message));
        }
    }
    catch (error) {
        // Output error in OpenAI compatible format
        console.log(JSON.stringify({
            role: "assistant",
            content: `Error: ${error.message}`,
        }));
        process.exit(1);
    }
}
program
    .name("zai")
    .description("A conversational AI CLI tool powered by Z.ai with text editor capabilities")
    .version(VERSION)
    .argument("[message...]", "Initial message to send to ZAI")
    .option("-d, --directory <dir>", "set working directory", process.cwd())
    .option("-k, --api-key <key>", "ZAI API key (or set ZAI_API_KEY env var)")
    .option("-u, --base-url <url>", "ZAI API base URL (or set ZAI_BASE_URL env var)")
    .option("-m, --model <model>", "AI model to use (e.g., glm-4.6, glm-4.5) (or set ZAI_MODEL env var)")
    .option("-p, --prompt <prompt>", "process a single prompt and exit (headless mode)")
    .option("--max-tool-rounds <rounds>", "maximum number of tool execution rounds (default: 400)", "400")
    .option("-w, --watch", "watch for file changes and auto-reload context")
    .action(async (message, options) => {
    if (options.directory) {
        try {
            process.chdir(options.directory);
        }
        catch (error) {
            console.error(`Error changing directory to ${options.directory}:`, error.message);
            process.exit(1);
        }
    }
    try {
        // Check if this is the first run and launch onboarding if needed
        if (isFirstRun() && !options.apiKey && !options.prompt) {
            console.log("🎉 Welcome to ZAI CLI!\n");
            render(React.createElement(OnboardingSetup, {
                onComplete: (apiKey, model) => {
                    // After onboarding, start the chat interface
                    const settingsManager = getSettingsManager();
                    const baseURL = settingsManager.getBaseURL();
                    const agent = new ZaiAgent(apiKey, baseURL, model);
                    const initialMessage = Array.isArray(message)
                        ? message.join(" ")
                        : message;
                    render(React.createElement(ChatInterface, { agent, initialMessage, watchMode: options.watch || false }));
                },
            }));
            return;
        }
        // Get API key from options, environment, or user settings
        const apiKey = options.apiKey || loadApiKey();
        const baseURL = options.baseUrl || loadBaseURL();
        const model = options.model || loadModel();
        const maxToolRounds = parseInt(options.maxToolRounds) || 400;
        if (!apiKey) {
            console.error("❌ Error: API key required. Set ZAI_API_KEY environment variable, use --api-key flag, or run 'zai config' to set it up.");
            process.exit(1);
        }
        // Save API key and base URL to user settings if provided via command line
        if (options.apiKey || options.baseUrl) {
            await saveCommandLineSettings(options.apiKey, options.baseUrl);
        }
        // Headless mode: process prompt and exit
        if (options.prompt) {
            await processPromptHeadless(options.prompt, apiKey, baseURL, model, maxToolRounds);
            return;
        }
        // Interactive mode: launch UI
        const agent = new ZaiAgent(apiKey, baseURL, model, maxToolRounds);
        console.log("🤖 Starting ZAI CLI Conversational Assistant...\n");
        ensureUserSettingsDirectory();
        // Support variadic positional arguments for multi-word initial message
        const initialMessage = Array.isArray(message)
            ? message.join(" ")
            : message;
        render(React.createElement(ChatInterface, { agent, initialMessage, watchMode: options.watch || false }));
    }
    catch (error) {
        console.error("❌ Error initializing ZAI CLI:", error.message);
        process.exit(1);
    }
});
// Config command
program
    .command("config")
    .description("Manage ZAI CLI settings")
    .option("--show", "Display current configuration")
    .option("--reset", "Reset to default settings")
    .option("--set-key <key>", "Set API key directly")
    .option("--set-url <url>", "Set base URL directly")
    .action(async (options) => {
    const manager = getSettingsManager();
    try {
        // Show current configuration
        if (options.show) {
            const settings = manager.loadUserSettings();
            console.log("\n⚙️  ZAI CLI Configuration:");
            console.log("─".repeat(50));
            console.log(`API Key: ${settings.apiKey ? "***" + settings.apiKey.slice(-8) : "Not set"}`);
            console.log(`Base URL: ${settings.baseURL || "Not set"}`);
            console.log(`Default Model: ${settings.defaultModel || "Not set"}`);
            console.log(`Available Models: ${settings.models?.join(", ") || "None"}`);
            console.log("─".repeat(50) + "\n");
            return;
        }
        // Reset to defaults
        if (options.reset) {
            const settingsPath = path.join(os.homedir(), ".zai", "user-settings.json");
            if (fs.existsSync(settingsPath)) {
                fs.unlinkSync(settingsPath);
                console.log("✅ Settings reset to defaults");
            }
            else {
                console.log("ℹ️  No settings file found");
            }
            return;
        }
        // Set API key directly
        if (options.setKey) {
            manager.updateUserSetting("apiKey", options.setKey);
            console.log("✅ API key updated successfully");
            return;
        }
        // Set base URL directly
        if (options.setUrl) {
            manager.updateUserSetting("baseURL", options.setUrl);
            console.log("✅ Base URL updated successfully");
            return;
        }
        // Default: launch settings panel
        console.log("⚙️  Opening ZAI CLI Settings...\n");
        render(React.createElement(SettingsPanel));
    }
    catch (error) {
        console.error("❌ Error managing settings:", error.message);
        process.exit(1);
    }
});
// Metrics command
program
    .command("metrics")
    .description("View performance metrics and analytics")
    .option("--show", "Display current metrics summary (default)")
    .option("--report", "Generate detailed performance report")
    .option("--export [path]", "Export metrics to JSON file")
    .option("--clear", "Clear all metrics data")
    .option("--recent <count>", "Show recent N tasks (default: 10)", "10")
    .action(async (options) => {
    const metrics = getMetricsCollector();
    try {
        // Clear metrics
        if (options.clear) {
            metrics.clearMetrics();
            console.log("✅ All metrics data cleared");
            return;
        }
        // Export metrics
        if (options.export !== undefined) {
            const exportPath = metrics.exportMetrics(typeof options.export === "string" ? options.export : undefined);
            console.log(`✅ Metrics exported to: ${exportPath}`);
            return;
        }
        // Generate detailed report
        if (options.report) {
            const report = metrics.generateReport();
            console.log("\n" + report);
            return;
        }
        // Default: Show summary
        const avg = metrics.getAverageMetrics();
        const recentCount = parseInt(options.recent || "10", 10);
        const recent = metrics.getRecentMetrics(recentCount);
        console.log("\n📊 ZAI CLI Metrics Summary");
        console.log("=".repeat(50));
        if (avg.totalTasks === 0) {
            console.log("\nNo metrics data available yet.");
            console.log("Metrics will be collected as you use ZAI CLI.\n");
            return;
        }
        console.log(`\n📈 Overall Statistics (${avg.totalTasks} tasks):`);
        console.log(`  Completion Rate: ${avg.completionRate.toFixed(1)}%`);
        console.log(`  First Attempt Success: ${avg.firstAttemptSuccessRate.toFixed(1)}%`);
        console.log(`  Avg Tool Rounds: ${avg.avgToolRounds.toFixed(2)}`);
        console.log(`  Avg Tool Calls: ${avg.avgToolCalls.toFixed(2)}`);
        console.log(`  Avg Errors: ${avg.avgErrors.toFixed(2)}`);
        console.log(`  Avg Duration: ${avg.avgDurationSeconds.toFixed(2)}s`);
        console.log(`\n💰 Token Usage:`);
        console.log(`  Avg Tokens/Task: ${avg.avgTokens.toFixed(0)}`);
        console.log(`  Total Tokens: ${(avg.avgTokens * avg.totalTasks).toFixed(0)}`);
        console.log(`\n🔧 Tool Usage:`);
        const toolUsage = metrics.getToolUsageStats();
        const sortedTools = Object.entries(toolUsage)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, 5);
        sortedTools.forEach(([tool, stats]) => {
            console.log(`  ${tool}: ${stats.count} calls (${stats.percentage.toFixed(1)}%)`);
        });
        if (recent.length > 0) {
            console.log(`\n📝 Recent ${recentCount} Tasks:`);
            recent.forEach((task, i) => {
                const status = task.taskCompleted ? "✅" : "❌";
                const duration = (task.durationMs / 1000).toFixed(1);
                const message = task.userMessage.length > 50
                    ? task.userMessage.substring(0, 47) + "..."
                    : task.userMessage;
                console.log(`  ${status} ${duration}s | ${task.totalToolCalls} calls | ${message}`);
            });
        }
        console.log("\n💡 Use --report for detailed analysis");
        console.log("💡 Use --export to save metrics data");
        console.log("=".repeat(50) + "\n");
    }
    catch (error) {
        console.error("❌ Error accessing metrics:", error.message);
        process.exit(1);
    }
});
// Git subcommand
const gitCommand = program
    .command("git")
    .description("Git operations with AI assistance");
gitCommand
    .command("commit-and-push")
    .description("Generate AI commit message and push to remote")
    .option("-d, --directory <dir>", "set working directory", process.cwd())
    .option("-k, --api-key <key>", "ZAI API key (or set ZAI_API_KEY env var)")
    .option("-u, --base-url <url>", "ZAI API base URL (or set ZAI_BASE_URL env var)")
    .option("-m, --model <model>", "AI model to use (e.g., glm-4.6, glm-4.5) (or set ZAI_MODEL env var)")
    .option("--max-tool-rounds <rounds>", "maximum number of tool execution rounds (default: 400)", "400")
    .action(async (options) => {
    if (options.directory) {
        try {
            process.chdir(options.directory);
        }
        catch (error) {
            console.error(`Error changing directory to ${options.directory}:`, error.message);
            process.exit(1);
        }
    }
    try {
        // Get API key from options, environment, or user settings
        const apiKey = options.apiKey || loadApiKey();
        const baseURL = options.baseUrl || loadBaseURL();
        const model = options.model || loadModel();
        const maxToolRounds = parseInt(options.maxToolRounds) || 400;
        if (!apiKey) {
            console.error("❌ Error: API key required. Set ZAI_API_KEY environment variable, use --api-key flag, or run 'zai config' to set it up.");
            process.exit(1);
        }
        // Save API key and base URL to user settings if provided via command line
        if (options.apiKey || options.baseUrl) {
            await saveCommandLineSettings(options.apiKey, options.baseUrl);
        }
        await handleCommitAndPushHeadless(apiKey, baseURL, model, maxToolRounds);
    }
    catch (error) {
        console.error("❌ Error during git commit-and-push:", error.message);
        process.exit(1);
    }
});
// MCP command
program.addCommand(createMCPCommand());
// Session list command
program
    .command("sessions")
    .description("List all saved sessions")
    .option("-v, --verbose", "Show detailed information")
    .action((options) => {
    const sessionManager = getSessionManager();
    const sessions = sessionManager.listSessions();
    if (sessions.length === 0) {
        console.log("No saved sessions found.");
        return;
    }
    console.log(`\n📚 Saved Sessions (${sessions.length}):\n`);
    for (const session of sessions) {
        console.log(`  ${session.name}`);
        console.log(`    ID: ${session.id}`);
        console.log(`    Created: ${session.created.toLocaleString()}`);
        console.log(`    Messages: ${session.messageCount}`);
        console.log(`    Model: ${session.model}`);
        if (options.verbose && session.description) {
            console.log(`    Description: ${session.description}`);
        }
        console.log("");
    }
});
// Session save command
program
    .command("save-session <name>")
    .description("Save current session")
    .option("-d, --description <desc>", "Session description")
    .action((name, options) => {
    // This will be integrated with the running agent
    console.log("⚠️  This command should be used within an active ZAI session.");
    console.log('   Use Ctrl+S or type "/save" during a conversation.');
});
// Session load command
program
    .command("load-session <name>")
    .description("Load a saved session")
    .action(async (name) => {
    const sessionManager = getSessionManager();
    const sessionData = sessionManager.loadSession(name);
    if (!sessionData) {
        console.log(`❌ Session not found: ${name}`);
        return;
    }
    console.log(`✅ Loaded session: ${sessionData.metadata.name}`);
    console.log(`   Messages: ${sessionData.metadata.messageCount}`);
    console.log(`   Model: ${sessionData.metadata.model}`);
    console.log("\nStarting ZAI with loaded session...\n");
    // Get API key from user settings
    const apiKey = loadApiKey();
    const baseURL = loadBaseURL();
    if (!apiKey) {
        console.error("❌ Error: API key required. Set ZAI_API_KEY environment variable or run 'zai config' to set it up.");
        process.exit(1);
    }
    // Start interactive mode with loaded session
    const agent = new ZaiAgent(apiKey, baseURL, sessionData.context.model);
    render(React.createElement(ChatInterface, {
        agent,
        initialSession: sessionData,
    }));
});
// Session delete command
program
    .command("delete-session <name>")
    .description("Delete a saved session")
    .action((name) => {
    const sessionManager = getSessionManager();
    const success = sessionManager.deleteSession(name);
    if (!success) {
        console.log(`❌ Session not found: ${name}`);
    }
});
// Session export command
program
    .command("export-session <name> [output]")
    .description("Export session to markdown")
    .action((name, output) => {
    const sessionManager = getSessionManager();
    const outputPath = output || `${name}.md`;
    const result = sessionManager.exportSessionToMarkdown(name, outputPath);
    if (!result) {
        console.log(`❌ Session not found: ${name}`);
    }
});
program.parse();
//# sourceMappingURL=index.js.map