# Task Master + Claude Code Integration Guide

## Overview
Task Master is a CLI-based task management system that works alongside Claude Code to provide structured project planning, task tracking, and AI-powered research capabilities.

## How It Works
Task Master is NOT an MCP server but a CLI tool that Claude Code can interact with through:
1. Direct CLI commands
2. Configuration files (`.taskmaster/config.json`)
3. Claude Code's AI models for task generation and research

## Installation & Setup

### 1. Install Task Master Globally
```bash
npm install -g task-master-ai
```

### 2. Initialize in Your Project
```bash
task-master init --name="Your Project" --description="Your description" -y
```

### 3. Configure for Claude Code
The `.taskmaster/config.json` is automatically configured to use Claude Code models:
```json
{
  "models": {
    "main": {
      "provider": "claude-code",
      "modelId": "opus",
      "maxTokens": 32000,
      "temperature": 0.2
    },
    "research": {
      "provider": "claude-code", 
      "modelId": "sonnet",
      "maxTokens": 64000,
      "temperature": 0.5
    }
  }
}
```

## Key Features

### 1. **Task Management**
- Parse PRDs into actionable tasks
- Track task status and dependencies
- Expand tasks into subtasks
- Persistent across Claude sessions

### 2. **Research Capabilities**
```bash
# Research with project context
task-master research "How to implement OAuth 2.0" --tree

# Research specific to a task
task-master research "Best practices for task 3" -i=3
```

### 3. **Workflow Commands**
```bash
# Parse a PRD
task-master parse-prd --input=prd.txt

# List all tasks
task-master list

# Get next task to work on
task-master next

# Update task status
task-master set-status --id=3 --status=in-progress

# Add a new task
task-master add-task --prompt="Implement user authentication"
```

## Integration with Claude Code Workflow

### 1. **Planning Phase**
```bash
# Create PRD with Claude's help
# Save to scripts/prd.txt
# Parse PRD into tasks
task-master parse-prd --input=scripts/prd.txt

# Analyze complexity
task-master analyze-complexity --research

# Expand complex tasks
task-master expand --all --research
```

### 2. **Implementation Phase**
```bash
# Get next task
task-master next

# Research before implementing
task-master research "Implementation strategies for [task]"

# Update status as you work
task-master set-status --id=1 --status=in-progress

# Add implementation notes
task-master update-subtask --id=1.1 --prompt="Implemented login form"
```

### 3. **Review Phase**
```bash
# Update README with task list
task-master sync-readme

# Generate complexity report
task-master complexity-report

# List completed tasks
task-master list --status=done
```

## Best Practices

### 1. **Use with TodoWrite/TodoRead**
- Task Master: Long-term project tasks
- TodoWrite: Quick session tasks
- Combine both for comprehensive tracking

### 2. **Tag Management**
```bash
# Create feature branch tasks
task-master add-tag feature-auth
task-master use-tag feature-auth

# Switch back to main tasks
task-master use-tag master
```

### 3. **Multi-Session Work**
- Tasks persist across Claude sessions
- Use git worktrees for parallel work
- Each session can work on different tasks

## Common Workflows

### Starting a New Feature
```bash
1. task-master add-tag feature-name
2. task-master use-tag feature-name
3. task-master add-task --prompt="Feature requirements"
4. task-master expand --id=1 --research
5. task-master next
```

### Daily Development
```bash
1. task-master next                    # Get task
2. task-master show 3                  # View details
3. # Implement with Claude Code
4. task-master set-status --id=3 --status=done
5. task-master next                    # Repeat
```

### Project Updates
```bash
1. task-master update --from=5 --prompt="New requirements"
2. task-master validate-dependencies
3. task-master sync-readme
```

## Troubleshooting

### Configuration Warnings
If you see "No configuration file found":
- Ensure you're in the project root
- Run `task-master init` if needed
- Check `.taskmaster/config.json` exists

### Claude Code Integration
- No API keys needed for Claude Code
- Uses your local Claude instance
- Models: opus (main), sonnet (research)

### Permission Errors
- Use `permissionMode: "default"` in config
- Valid modes: default, acceptEdits, plan, bypassPermissions

## Summary
Task Master complements Claude Code by providing:
- Structured task management
- AI-powered research
- Project-wide task persistence
- PRD-based planning

Use it alongside TodoWrite/TodoRead for a complete task management solution in Claude Code.