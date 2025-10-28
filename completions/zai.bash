#!/usr/bin/env bash
# Bash completion script for ZAI CLI
# Install: Copy to /etc/bash_completion.d/ or source in ~/.bashrc

_zai_completions() {
    local cur prev opts commands
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"

    # Main commands
    commands="config metrics git mcp sessions save-session load-session delete-session export-session"

    # Options
    opts="-V --version -d --directory -k --api-key -u --base-url -m --model -p --prompt --max-tool-rounds -w --watch --no-color --debug -h --help"

    # Models
    models="glm-4.6 glm-4.5 glm-4.5-air"

    # Config subcommands
    config_opts="--show --reset --set-key --set-url"

    # Metrics subcommands
    metrics_opts="--reset --export"

    # MCP subcommands
    mcp_commands="add remove list test"

    # Complete based on previous word
    case "${prev}" in
        -m|--model)
            COMPREPLY=( $(compgen -W "${models}" -- ${cur}) )
            return 0
            ;;
        -d|--directory)
            COMPREPLY=( $(compgen -d -- ${cur}) )
            return 0
            ;;
        config)
            COMPREPLY=( $(compgen -W "${config_opts}" -- ${cur}) )
            return 0
            ;;
        metrics)
            COMPREPLY=( $(compgen -W "${metrics_opts}" -- ${cur}) )
            return 0
            ;;
        mcp)
            COMPREPLY=( $(compgen -W "${mcp_commands}" -- ${cur}) )
            return 0
            ;;
        load-session|delete-session|export-session)
            # Complete with saved session names
            if [ -d "$HOME/.zai/sessions" ]; then
                local sessions=$(ls -1 "$HOME/.zai/sessions" 2>/dev/null | sed 's/\.json$//')
                COMPREPLY=( $(compgen -W "${sessions}" -- ${cur}) )
            fi
            return 0
            ;;
        zai)
            # Complete commands and options
            COMPREPLY=( $(compgen -W "${commands} ${opts}" -- ${cur}) )
            return 0
            ;;
    esac

    # Default completion
    if [[ ${cur} == -* ]] ; then
        COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )
    else
        COMPREPLY=( $(compgen -W "${commands}" -- ${cur}) )
    fi
}

complete -F _zai_completions zai
