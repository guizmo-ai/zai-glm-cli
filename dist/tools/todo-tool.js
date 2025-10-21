export class TodoTool {
    todos = [];
    formatTodoList() {
        if (this.todos.length === 0) {
            return 'No todos created yet';
        }
        const getCheckbox = (status) => {
            switch (status) {
                case 'completed':
                    return '●';
                case 'in_progress':
                    return '◐';
                case 'pending':
                    return '○';
                default:
                    return '○';
            }
        };
        const getStatusColor = (status) => {
            switch (status) {
                case 'completed':
                    return '\x1b[32m'; // Green
                case 'in_progress':
                    return '\x1b[36m'; // Cyan
                case 'pending':
                    return '\x1b[37m'; // White/default
                default:
                    return '\x1b[0m'; // Reset
            }
        };
        const reset = '\x1b[0m';
        let output = '';
        this.todos.forEach((todo, index) => {
            const checkbox = getCheckbox(todo.status);
            const statusColor = getStatusColor(todo.status);
            const strikethrough = todo.status === 'completed' ? '\x1b[9m' : '';
            const indent = index === 0 ? '' : '  ';
            output += `${indent}${statusColor}${strikethrough}${checkbox} ${todo.content}${reset}\n`;
        });
        return output;
    }
    async createTodoList(todos) {
        try {
            // Validate todos
            for (const todo of todos) {
                if (!todo.id || !todo.content || !todo.status || !todo.priority) {
                    return {
                        success: false,
                        error: 'Each todo must have id, content, status, and priority fields'
                    };
                }
                if (!['pending', 'in_progress', 'completed'].includes(todo.status)) {
                    return {
                        success: false,
                        error: `Invalid status: ${todo.status}. Must be pending, in_progress, or completed`
                    };
                }
                if (!['high', 'medium', 'low'].includes(todo.priority)) {
                    return {
                        success: false,
                        error: `Invalid priority: ${todo.priority}. Must be high, medium, or low`
                    };
                }
            }
            this.todos = todos;
            return {
                success: true,
                output: this.formatTodoList()
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Error creating todo list: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
    async updateTodoList(updates) {
        try {
            const updatedIds = [];
            for (const update of updates) {
                const todoIndex = this.todos.findIndex(t => t.id === update.id);
                if (todoIndex === -1) {
                    return {
                        success: false,
                        error: `Todo with id ${update.id} not found`
                    };
                }
                const todo = this.todos[todoIndex];
                if (update.status && !['pending', 'in_progress', 'completed'].includes(update.status)) {
                    return {
                        success: false,
                        error: `Invalid status: ${update.status}. Must be pending, in_progress, or completed`
                    };
                }
                if (update.priority && !['high', 'medium', 'low'].includes(update.priority)) {
                    return {
                        success: false,
                        error: `Invalid priority: ${update.priority}. Must be high, medium, or low`
                    };
                }
                if (update.status)
                    todo.status = update.status;
                if (update.content)
                    todo.content = update.content;
                if (update.priority)
                    todo.priority = update.priority;
                updatedIds.push(update.id);
            }
            return {
                success: true,
                output: this.formatTodoList()
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Error updating todo list: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
    async viewTodoList() {
        return {
            success: true,
            output: this.formatTodoList()
        };
    }
}
//# sourceMappingURL=todo-tool.js.map