# Claude Task Master Integration Guide

## Overview
Claude Task Master is an AI-powered task management system that enhances Claude Code's capabilities by providing structured task management, PRD-based planning, and multi-model orchestration.

## What Task Master Does Well

### 1. **Structured Task Management**
- Generates tasks from Product Requirements Documents (PRDs)
- Tracks task progress and dependencies
- Provides context-aware task recommendations

### 2. **Multi-Model Support**
- Works with Claude, OpenAI, Google Gemini, and other models
- Allows model selection based on task type
- No API key required for Claude Code models

### 3. **Development Workflow Integration**
- Integrates with editors (Cursor, Windsurf, VS Code)
- Supports command-line workflows
- Provides research capabilities with project context

## Installation

Task Master has been added to Claude Code:
```bash
claude mcp add task-master "npx -y task-master-ai" --scope user
```

## Configuration

Add environment variables to `~/.config/claude/mcp-env.sh`:
```bash
# Task Master Configuration (optional - uses Claude Code by default)
export ANTHROPIC_API_KEY="your-key-here"  # Optional
export OPENAI_API_KEY="your-key-here"     # Optional
export GOOGLE_API_KEY="your-key-here"     # Optional
```

## How Claude Code Should Use Task Master

### 1. **Task Planning & Management**
Instead of using the built-in TodoWrite/TodoRead tools alone, Claude Code should:
- Use Task Master for complex project planning
- Generate tasks from PRDs or requirements
- Track implementation progress

### 2. **Research & Context Gathering**
Task Master excels at:
- Researching implementation strategies
- Gathering context for specific tasks
- Finding best practices for technologies

### 3. **Task Implementation Workflow**

```bash
# 1. Parse requirements and generate tasks
"Parse this PRD and create a task list"

# 2. Get next task recommendation
"What's the next task I should work on?"

# 3. Research before implementation
"Research React Query v5 migration strategies for task 3"

# 4. Implement specific tasks
"Help me implement task 3"
```

## Integration with Ultimate MCP Server

Task Master complements the Ultimate MCP Server by:
1. Providing structured task management (Task Master) vs execution (Ultimate)
2. PRD-based planning (Task Master) vs code generation (Ultimate)
3. Research capabilities (Task Master) vs implementation (Ultimate)

## Best Practices

### When to Use Task Master:
- Starting new projects with PRDs
- Breaking down complex features
- Research and planning phases
- Task prioritization and tracking

### When to Use TodoWrite/TodoRead:
- Quick task lists
- Simple todo tracking
- Session-specific tasks
- Immediate action items

### When to Use Both:
- Use Task Master for project-level planning
- Use TodoWrite for session-level tracking
- Sync important tasks between both systems

## Example Workflow

```markdown
1. User: "I have a PRD for a new authentication system"
   → Use Task Master to parse PRD and generate tasks

2. User: "What should I work on first?"
   → Task Master recommends priority tasks

3. User: "Research JWT vs session authentication"
   → Task Master provides context-aware research

4. User: "Implement the login endpoint"
   → Use Ultimate MCP for code generation
   → Use TodoWrite to track subtasks

5. User: "Mark task 3 as complete"
   → Update Task Master progress
```

## Available Task Master Tools

After restarting Claude, these tools will be available:
- `mcp__task-master__parse_requirements`
- `mcp__task-master__generate_tasks`
- `mcp__task-master__get_next_task`
- `mcp__task-master__implement_task`
- `mcp__task-master__research_topic`
- `mcp__task-master__update_task_status`

## Integration Checklist

- [x] Task Master added to Claude Code
- [ ] Environment variables configured (optional)
- [ ] Claude restarted to load new MCP server
- [ ] Test Task Master tools availability
- [ ] Create sample PRD for testing
- [ ] Validate task generation workflow

## Notes

- Task Master uses Claude Code models by default (no API key needed)
- PRDs should be detailed for best results
- Tasks are persisted across sessions
- Research capabilities are project-aware