import { ToolResult } from '../types/index.js';
interface TodoItem {
    id: string;
    content: string;
    status: 'pending' | 'in_progress' | 'completed';
    priority: 'high' | 'medium' | 'low';
}
export declare class TodoTool {
    private todos;
    formatTodoList(): string;
    createTodoList(todos: TodoItem[]): Promise<ToolResult>;
    updateTodoList(updates: {
        id: string;
        status?: string;
        content?: string;
        priority?: string;
    }[]): Promise<ToolResult>;
    viewTodoList(): Promise<ToolResult>;
}
export {};
