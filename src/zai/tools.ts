import { ZaiTool } from "./client.js";
import { MCPManager, MCPTool } from "../mcp/client.js";
import { loadMCPConfig } from "../mcp/config.js";

const BASE_ZAI_TOOLS: ZaiTool[] = [
  {
    type: "function",
    function: {
      name: "view_file",
      description: `View file contents or list directory structure.

USE WHEN:
- You need to read a file's current contents before editing
- You want to verify a file exists and check its current state
- You need to see directory structure and contents
- You want to inspect code, configuration files, or documentation
- You need to understand the context before making changes

PARAMETERS:
- path: Absolute or relative file/directory path to view
- start_line (optional): First line number to display for large files (1-indexed)
- end_line (optional): Last line number to display for large files (inclusive)

RETURNS:
- File contents with line numbers (for files)
- Directory listing with file/folder names (for directories)
- Error message if path doesn't exist or can't be read

BEST PRACTICES:
- Always view before editing existing files to avoid conflicts
- Use line ranges (start_line/end_line) for files over 100 lines to reduce token usage
- Combine with search tool for locating specific content in large files
- View parent directory first if unsure about file structure`,
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Path to file or directory to view",
          },
          start_line: {
            type: "number",
            description:
              "Starting line number for partial file view (optional)",
          },
          end_line: {
            type: "number",
            description: "Ending line number for partial file view (optional)",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_file",
      description: `Create a new file with specified content at a given path.

USE WHEN:
- You need to create a completely new file that doesn't exist
- You're scaffolding new components, modules, or configuration files
- You're generating documentation, tests, or build artifacts
- You need to write initial boilerplate or templates

PARAMETERS:
- path: Full file path where the new file should be created (including filename)
- content: Complete text content to write to the file

RETURNS:
- Success confirmation with the created file path
- Error if file already exists at that path
- Error if parent directory doesn't exist or write permission denied

BEST PRACTICES:
- Use view_file first to verify the file doesn't already exist
- Ensure parent directories exist before creating the file
- For existing files, use str_replace_editor or edit_file instead
- Include complete, valid content (avoid placeholders like "TODO" unless intentional)
- Use appropriate file extensions for the content type`,
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Path where the file should be created",
          },
          content: {
            type: "string",
            description: "Content to write to the file",
          },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "str_replace_editor",
      description: `Replace specific text in a file with exact string matching.

USE WHEN:
- You need to make precise, targeted edits to existing files
- You want to change specific strings, variable names, or values
- You need to update configuration values or constants
- You're making single-line or small multi-line edits
- You want to rename identifiers across a file (with replace_all)

PARAMETERS:
- path: Path to the file to edit
- old_str: Exact text to find and replace (must match precisely for single occurrence)
- new_str: Text to replace the old string with
- replace_all (optional): If true, replaces all occurrences; if false/omitted, replaces only first occurrence

RETURNS:
- Success message with number of replacements made
- Error if old_str is not found in the file
- Error if old_str is ambiguous (appears multiple times when replace_all is false)
- File contents preview showing the changes made

BEST PRACTICES:
- Always use view_file first to see exact content and formatting
- Include enough context in old_str to make it unique when not using replace_all
- Preserve exact indentation and whitespace from the original
- Use replace_all=true for renaming variables/functions throughout a file
- For complex edits spanning many lines, consider edit_file (Morph) instead
- Verify the edit by viewing the file again after replacement`,
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Path to the file to edit",
          },
          old_str: {
            type: "string",
            description:
              "Text to replace (must match exactly, or will use fuzzy matching for multi-line strings)",
          },
          new_str: {
            type: "string",
            description: "Text to replace with",
          },
          replace_all: {
            type: "boolean",
            description:
              "Replace all occurrences (default: false, only replaces first occurrence)",
          },
        },
        required: ["path", "old_str", "new_str"],
      },
    },
  },

  {
    type: "function",
    function: {
      name: "bash",
      description: `Execute a bash command in the shell.

USE WHEN:
- You need to run system commands (ls, mkdir, rm, mv, cp, etc.)
- You want to execute build tools (npm, yarn, pip, cargo, make, etc.)
- You need to run tests, linters, or formatters
- You're working with version control (git commands)
- You need to check system information or environment variables
- You want to install dependencies or manage packages

PARAMETERS:
- command: The complete bash command to execute (single string)

RETURNS:
- Command output (stdout) showing the results
- Error output (stderr) if the command fails
- Exit code indicating success (0) or failure (non-zero)
- Combined stdout/stderr for comprehensive feedback

BEST PRACTICES:
- Use absolute paths when possible to avoid ambiguity
- Chain commands with && for dependent operations (e.g., "cd dir && npm install")
- Check file/directory existence before operations that depend on them
- Avoid interactive commands that require user input
- Use appropriate error handling (e.g., "|| true" to ignore errors if needed)
- Be cautious with destructive operations (rm, mv, overwriting files)
- Quote paths with spaces properly (e.g., "cd 'My Documents'")`,
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The bash command to execute",
          },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search",
      description: `Unified search tool for finding text content or files across the codebase.

USE WHEN:
- You need to find where specific code, text, or patterns appear
- You want to locate files by name or path pattern
- You're searching for function/class/variable definitions or usages
- You need to find configuration values or documentation
- You want to understand how a feature is implemented across files
- You're looking for all occurrences of a pattern to make consistent changes

PARAMETERS:
- query: Text to search for or file name/path pattern (required)
- search_type: 'text' (search file contents), 'files' (search file names), or 'both' (default: 'both')
- include_pattern: Glob pattern for files to include (e.g., '*.ts', 'src/**/*.js')
- exclude_pattern: Glob pattern for files to exclude (e.g., '*.log', 'node_modules/**')
- case_sensitive: Whether search should be case sensitive (default: false)
- whole_word: Whether to match whole words only (default: false)
- regex: Whether query is a regex pattern (default: false)
- max_results: Maximum number of results to return (default: 50)
- file_types: Array of file extensions to search (e.g., ['js', 'ts', 'py'])
- include_hidden: Whether to include hidden files/directories (default: false)

RETURNS:
- List of matching files with line numbers and context (for text search)
- List of matching file paths (for file name search)
- Number of total matches found
- Preview of matched content with surrounding context

BEST PRACTICES:
- Start with broad searches, then narrow with include/exclude patterns
- Use search_type='files' for finding files by name quickly
- Use regex=true for complex pattern matching (e.g., function signatures)
- Set whole_word=true to avoid partial matches in variable names
- Limit results with max_results to avoid overwhelming output
- Use file_types to search specific languages and avoid irrelevant matches
- Combine with view_file to inspect full context of matches`,
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Text to search for or file name/path pattern",
          },
          search_type: {
            type: "string",
            enum: ["text", "files", "both"],
            description:
              "Type of search: 'text' for content search, 'files' for file names, 'both' for both (default: 'both')",
          },
          include_pattern: {
            type: "string",
            description:
              "Glob pattern for files to include (e.g. '*.ts', '*.js')",
          },
          exclude_pattern: {
            type: "string",
            description:
              "Glob pattern for files to exclude (e.g. '*.log', 'node_modules')",
          },
          case_sensitive: {
            type: "boolean",
            description:
              "Whether search should be case sensitive (default: false)",
          },
          whole_word: {
            type: "boolean",
            description: "Whether to match whole words only (default: false)",
          },
          regex: {
            type: "boolean",
            description: "Whether query is a regex pattern (default: false)",
          },
          max_results: {
            type: "number",
            description: "Maximum number of results to return (default: 50)",
          },
          file_types: {
            type: "array",
            items: { type: "string" },
            description: "File types to search (e.g. ['js', 'ts', 'py'])",
          },
          include_hidden: {
            type: "boolean",
            description: "Whether to include hidden files (default: false)",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "batch_edit",
      description: `Apply the same edit operation to multiple files simultaneously.

USE WHEN:
- Renaming a function/variable across multiple files
- Updating import paths in many files
- Adding headers or comments to multiple files
- Refactoring code patterns across the project
- Replacing deprecated APIs with new ones

PARAMETERS:
- type: Type of operation (search-replace, insert, delete, rename-symbol)
- files: Optional explicit list of files to edit
- pattern: Search pattern to find files (alternative to explicit list)
- search_type: 'text' or 'files' (when using pattern)
- include_pattern: File glob to include (e.g., "*.ts", "src/**/*.tsx")
- exclude_pattern: File glob to exclude (e.g., "*.test.ts")
- params: Operation-specific parameters

OPERATION TYPES:
1. search-replace: Find and replace text
   - search: Text to find
   - replace: Replacement text
   - regex: Use regex (default: false)
   - case_sensitive: Case sensitive (default: false)
   - whole_word: Match whole words only (default: false)

2. insert: Insert content
   - content: Text to insert
   - position: "start", "end", or {line, character}

3. delete: Delete lines
   - start_line: First line to delete (0-indexed)
   - end_line: Last line to delete (inclusive)

4. rename-symbol: Rename a symbol (function, variable, class)
   - old_name: Current name
   - new_name: New name

RETURNS:
- Summary of files processed
- Number of changes made
- List of successful and failed files
- Preview of changes

BEST PRACTICES:
- Always use explicit file list or search pattern to target specific files
- Use include_pattern to limit scope (e.g., only .ts files)
- Use exclude_pattern to avoid test files or node_modules
- Test with a small subset of files first before batch editing many
- Commit code before running batch operations for easy rollback
- Use rename-symbol for safe refactoring of identifiers`,
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["search-replace", "insert", "delete", "rename-symbol"],
            description: "Type of batch operation to perform",
          },
          files: {
            type: "array",
            items: { type: "string" },
            description: "Explicit list of files to edit (optional)",
          },
          pattern: {
            type: "string",
            description: "Search pattern to find files (alternative to explicit files list)",
          },
          search_type: {
            type: "string",
            enum: ["text", "files"],
            description: "Type of search when using pattern",
          },
          include_pattern: {
            type: "string",
            description: "Glob pattern for files to include (e.g., '*.ts')",
          },
          exclude_pattern: {
            type: "string",
            description: "Glob pattern for files to exclude (e.g., '*.test.ts')",
          },
          params: {
            type: "object",
            description: "Operation-specific parameters",
            properties: {
              search: { type: "string" },
              replace: { type: "string" },
              regex: { type: "boolean" },
              case_sensitive: { type: "boolean" },
              whole_word: { type: "boolean" },
              content: { type: "string" },
              position: {
                oneOf: [
                  { type: "string", enum: ["start", "end"] },
                  {
                    type: "object",
                    properties: {
                      line: { type: "number" },
                      character: { type: "number" }
                    }
                  }
                ]
              },
              start_line: { type: "number" },
              end_line: { type: "number" },
              old_name: { type: "string" },
              new_name: { type: "string" },
            },
          },
        },
        required: ["type", "params"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_todo_list",
      description: `Create a new todo list for planning and tracking multi-step tasks.

USE WHEN:
- Starting a complex task that requires multiple steps
- User requests a plan or breakdown of work to be done
- You need to organize and track progress on a feature implementation
- Working on tasks with dependencies that should be completed in order
- You want to provide visibility into what work remains

PARAMETERS:
- todos: Array of todo item objects, each containing:
  - id: Unique identifier for the todo item (use descriptive slugs like "setup-auth")
  - content: Clear description of what needs to be done (imperative form: "Add authentication")
  - status: Current state - 'pending' (not started), 'in_progress' (actively working), or 'completed'
  - priority: Urgency level - 'high', 'medium', or 'low'

RETURNS:
- Confirmation that the todo list was created
- Visual representation of all tasks with their statuses
- Summary of pending, in-progress, and completed items

BEST PRACTICES:
- Create todo list at the start of complex multi-step tasks
- Break down large tasks into smaller, actionable items
- Use descriptive content that clearly states what needs to be done
- Set only one item to 'in_progress' at a time to show current focus
- Order todos by dependency (things that must be done first, earlier in list)
- Use priority to highlight critical items
- Update the list with update_todo_list as you make progress`,
      parameters: {
        type: "object",
        properties: {
          todos: {
            type: "array",
            description: "Array of todo items",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  description: "Unique identifier for the todo item",
                },
                content: {
                  type: "string",
                  description: "Description of the todo item",
                },
                status: {
                  type: "string",
                  enum: ["pending", "in_progress", "completed"],
                  description: "Current status of the todo item",
                },
                priority: {
                  type: "string",
                  enum: ["high", "medium", "low"],
                  description: "Priority level of the todo item",
                },
              },
              required: ["id", "content", "status", "priority"],
            },
          },
        },
        required: ["todos"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_todo_list",
      description: `Update existing todos in the todo list to reflect progress.

USE WHEN:
- You've completed a task and need to mark it as done
- You're starting work on a new task and need to mark it in_progress
- You need to change the priority of a task
- You want to update the description of a task based on new information
- You need to revert a task from completed back to pending (if blocked or needs rework)

PARAMETERS:
- updates: Array of update objects, each containing:
  - id: The unique identifier of the todo item to update (required)
  - status: New status - 'pending', 'in_progress', or 'completed' (optional)
  - content: New description text for the todo (optional)
  - priority: New priority level - 'high', 'medium', or 'low' (optional)

RETURNS:
- Confirmation of updates applied
- Updated visual representation of the todo list
- Summary showing which items were modified

BEST PRACTICES:
- Mark tasks as 'in_progress' when you start working on them
- Mark tasks as 'completed' immediately after finishing
- Only have one task as 'in_progress' at a time for clarity
- Update status frequently to keep the list current and accurate
- Use content updates to refine tasks as you learn more details
- Batch multiple updates in a single call when marking several items complete`,
      parameters: {
        type: "object",
        properties: {
          updates: {
            type: "array",
            description: "Array of todo updates",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  description: "ID of the todo item to update",
                },
                status: {
                  type: "string",
                  enum: ["pending", "in_progress", "completed"],
                  description: "New status for the todo item",
                },
                content: {
                  type: "string",
                  description: "New content for the todo item",
                },
                priority: {
                  type: "string",
                  enum: ["high", "medium", "low"],
                  description: "New priority for the todo item",
                },
              },
              required: ["id"],
            },
          },
        },
        required: ["updates"],
      },
    },
  },
];

// Morph Fast Apply tool (conditional)
const MORPH_EDIT_TOOL: ZaiTool = {
  type: "function",
  function: {
    name: "edit_file",
    description: `Intelligent file editor that applies multiple edits to existing files efficiently using AI-assisted code transformation.

USE WHEN:
- You need to make multiple related edits to a single file
- You're refactoring code with changes in several locations
- You want to add, modify, or remove functions/classes/blocks
- You're making complex edits that span many lines
- You need to edit large files without rewriting the entire content

PARAMETERS:
- target_file: Path to the file you want to modify
- instructions: Single sentence describing your intent in first person (e.g., "I am adding error handling to the API calls")
- code_edit: The edited code showing ONLY the changes, using "// ... existing code ..." to represent unchanged sections

RETURNS:
- Success confirmation with applied changes
- Diff preview showing what was modified
- Error if the edit cannot be applied due to ambiguity or conflicts

BEST PRACTICES:
- View the file first to understand its current structure
- Write clear, specific instructions that explain the "why" of your edit
- Show multiple edits in sequence with "// ... existing code ..." between them
- Include 2-3 lines of unchanged context around each edit for clarity
- NEVER omit code without "// ... existing code ..." or it may be deleted
- For deletions, show context before and after the deleted section
- Batch all changes to a file in ONE edit_file call (don't make multiple calls)
- Use language-appropriate comment syntax (// for JS/TS, # for Python, etc.)
- Minimize repeated code - only show what changes and surrounding context

EXAMPLE PATTERN:
// ... existing code ...
function oldFunction() {
  // new implementation
  return newValue;
}
// ... existing code ...
const newConstant = 42;
// ... existing code ...`,
    parameters: {
      type: "object",
      properties: {
        target_file: {
          type: "string",
          description: "The target file to modify."
        },
        instructions: {
          type: "string",
          description: "A single sentence instruction describing what you are going to do for the sketched edit. This is used to assist the less intelligent model in applying the edit. Use the first person to describe what you are going to do. Use it to disambiguate uncertainty in the edit."
        },
        code_edit: {
          type: "string",
          description: "Specify ONLY the precise lines of code that you wish to edit. NEVER specify or write out unchanged code. Instead, represent all unchanged code using the comment of the language you're editing in - example: // ... existing code ..."
        }
      },
      required: ["target_file", "instructions", "code_edit"]
    }
  }
};

// Function to build tools array conditionally
function buildZaiTools(): ZaiTool[] {
  const tools = [...BASE_ZAI_TOOLS];

  // Add Morph Fast Apply tool if API key is available
  if (process.env.MORPH_API_KEY) {
    tools.splice(3, 0, MORPH_EDIT_TOOL); // Insert after str_replace_editor
  }

  return tools;
}

// Export dynamic tools array
export const ZAI_TOOLS: ZaiTool[] = buildZaiTools();

// Global MCP manager instance
let mcpManager: MCPManager | null = null;

export function getMCPManager(): MCPManager {
  if (!mcpManager) {
    mcpManager = new MCPManager();
  }
  return mcpManager;
}

export async function initializeMCPServers(): Promise<void> {
  const manager = getMCPManager();
  const config = loadMCPConfig();
  
  // Store original stderr.write
  const originalStderrWrite = process.stderr.write;
  
  // Temporarily suppress stderr to hide verbose MCP connection logs
  process.stderr.write = function(chunk: any, encoding?: any, callback?: any): boolean {
    // Filter out mcp-remote verbose logs
    const chunkStr = chunk.toString();
    if (chunkStr.includes('[') && (
        chunkStr.includes('Using existing client port') ||
        chunkStr.includes('Connecting to remote server') ||
        chunkStr.includes('Using transport strategy') ||
        chunkStr.includes('Connected to remote server') ||
        chunkStr.includes('Local STDIO server running') ||
        chunkStr.includes('Proxy established successfully') ||
        chunkStr.includes('Local→Remote') ||
        chunkStr.includes('Remote→Local')
      )) {
      // Suppress these verbose logs
      if (callback) callback();
      return true;
    }
    
    // Allow other stderr output
    return originalStderrWrite.call(this, chunk, encoding, callback);
  };
  
  try {
    for (const serverConfig of config.servers) {
      try {
        await manager.addServer(serverConfig);
      } catch (error) {
        console.warn(`Failed to initialize MCP server ${serverConfig.name}:`, error);
      }
    }
  } finally {
    // Restore original stderr.write
    process.stderr.write = originalStderrWrite;
  }
}

export function convertMCPToolToZaiTool(mcpTool: MCPTool): ZaiTool {
  return {
    type: "function",
    function: {
      name: mcpTool.name,
      description: mcpTool.description,
      parameters: mcpTool.inputSchema || {
        type: "object",
        properties: {},
        required: []
      }
    }
  };
}

export function addMCPToolsToZaiTools(baseTools: ZaiTool[]): ZaiTool[] {
  if (!mcpManager) {
    return baseTools;
  }

  const mcpTools = mcpManager.getTools();
  const zaiMCPTools = mcpTools.map(convertMCPToolToZaiTool);

  return [...baseTools, ...zaiMCPTools];
}

export async function getAllZaiTools(): Promise<ZaiTool[]> {
  const manager = getMCPManager();
  // Try to initialize servers if not already done, but don't block
  manager.ensureServersInitialized().catch(() => {
    // Ignore initialization errors to avoid blocking
  });
  return addMCPToolsToZaiTools(ZAI_TOOLS);
}
