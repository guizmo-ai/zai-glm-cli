#compdef zai
# Zsh completion script for ZAI CLI
# Install: Copy to a directory in $fpath or add to ~/.zshrc

_zai() {
    local -a commands options models config_opts metrics_opts mcp_commands

    commands=(
        'config:Manage ZAI CLI settings'
        'metrics:View performance metrics and analytics'
        'git:Git operations with AI assistance'
        'mcp:Manage MCP (Model Context Protocol) servers'
        'sessions:List all saved sessions'
        'save-session:Save current session'
        'load-session:Load a saved session'
        'delete-session:Delete a saved session'
        'export-session:Export session to markdown'
    )

    options=(
        '(-V --version)'{-V,--version}'[output the version number]'
        '(-d --directory)'{-d,--directory}'[set working directory]:directory:_directories'
        '(-k --api-key)'{-k,--api-key}'[ZAI API key]:api-key:'
        '(-u --base-url)'{-u,--base-url}'[ZAI API base URL]:url:'
        '(-m --model)'{-m,--model}'[AI model to use]:model:(glm-4.6 glm-4.5 glm-4.5-air)'
        '(-p --prompt)'{-p,--prompt}'[process a single prompt and exit]:prompt:'
        '--max-tool-rounds[maximum number of tool execution rounds]:rounds:'
        '(-w --watch)'{-w,--watch}'[watch for file changes and auto-reload context]'
        '--no-color[disable colored output (useful for CI/CD)]'
        '--debug[enable debug mode with verbose logging]'
        '(-h --help)'{-h,--help}'[display help for command]'
    )

    config_opts=(
        '--show:Show current configuration'
        '--reset:Reset to default settings'
        '--set-key:Update API key'
        '--set-url:Update base URL'
    )

    metrics_opts=(
        '--reset:Reset metrics data'
        '--export:Export metrics to JSON'
    )

    mcp_commands=(
        'add:Add a new MCP server'
        'remove:Remove an MCP server'
        'list:List all MCP servers'
        'test:Test MCP server connection'
    )

    _arguments -C \
        '1: :->command' \
        '*:: :->args' \
        $options

    case $state in
        command)
            _describe 'command' commands
            ;;
        args)
            case $words[1] in
                config)
                    _describe 'config options' config_opts
                    ;;
                metrics)
                    _describe 'metrics options' metrics_opts
                    ;;
                mcp)
                    _describe 'mcp commands' mcp_commands
                    ;;
                load-session|delete-session|export-session)
                    # Complete with saved session names
                    if [[ -d "$HOME/.zai/sessions" ]]; then
                        local -a sessions
                        sessions=($HOME/.zai/sessions/*.json(:t:r))
                        _describe 'sessions' sessions
                    fi
                    ;;
            esac
            ;;
    esac
}

_zai "$@"
