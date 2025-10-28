# Fish completion script for ZAI CLI
# Install: Copy to ~/.config/fish/completions/

# Remove old completions
complete -c zai -e

# Main options
complete -c zai -s V -l version -d "Output the version number"
complete -c zai -s d -l directory -d "Set working directory" -r -F
complete -c zai -s k -l api-key -d "ZAI API key" -r
complete -c zai -s u -l base-url -d "ZAI API base URL" -r
complete -c zai -s m -l model -d "AI model to use" -r -a "glm-4.6 glm-4.5 glm-4.5-air"
complete -c zai -s p -l prompt -d "Process a single prompt and exit" -r
complete -c zai -l max-tool-rounds -d "Maximum number of tool execution rounds" -r
complete -c zai -s w -l watch -d "Watch for file changes and auto-reload context"
complete -c zai -l no-color -d "Disable colored output (useful for CI/CD)"
complete -c zai -l debug -d "Enable debug mode with verbose logging"
complete -c zai -s h -l help -d "Display help for command"

# Commands
complete -c zai -f -n "__fish_use_subcommand" -a "config" -d "Manage ZAI CLI settings"
complete -c zai -f -n "__fish_use_subcommand" -a "metrics" -d "View performance metrics and analytics"
complete -c zai -f -n "__fish_use_subcommand" -a "git" -d "Git operations with AI assistance"
complete -c zai -f -n "__fish_use_subcommand" -a "mcp" -d "Manage MCP servers"
complete -c zai -f -n "__fish_use_subcommand" -a "sessions" -d "List all saved sessions"
complete -c zai -f -n "__fish_use_subcommand" -a "save-session" -d "Save current session"
complete -c zai -f -n "__fish_use_subcommand" -a "load-session" -d "Load a saved session"
complete -c zai -f -n "__fish_use_subcommand" -a "delete-session" -d "Delete a saved session"
complete -c zai -f -n "__fish_use_subcommand" -a "export-session" -d "Export session to markdown"

# Config subcommand options
complete -c zai -f -n "__fish_seen_subcommand_from config" -l show -d "Show current configuration"
complete -c zai -f -n "__fish_seen_subcommand_from config" -l reset -d "Reset to default settings"
complete -c zai -f -n "__fish_seen_subcommand_from config" -l set-key -d "Update API key"
complete -c zai -f -n "__fish_seen_subcommand_from config" -l set-url -d "Update base URL"

# Metrics subcommand options
complete -c zai -f -n "__fish_seen_subcommand_from metrics" -l reset -d "Reset metrics data"
complete -c zai -f -n "__fish_seen_subcommand_from metrics" -l export -d "Export metrics to JSON"

# MCP subcommand
complete -c zai -f -n "__fish_seen_subcommand_from mcp" -a "add" -d "Add a new MCP server"
complete -c zai -f -n "__fish_seen_subcommand_from mcp" -a "remove" -d "Remove an MCP server"
complete -c zai -f -n "__fish_seen_subcommand_from mcp" -a "list" -d "List all MCP servers"
complete -c zai -f -n "__fish_seen_subcommand_from mcp" -a "test" -d "Test MCP server connection"

# Session completion - complete with saved session names
complete -c zai -f -n "__fish_seen_subcommand_from load-session delete-session export-session" -a "(ls ~/.zai/sessions/*.json 2>/dev/null | string replace -r '.*/(.*)\\.json' '\$1')"
