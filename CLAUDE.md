# Claude Code Integration Guide

## Task Management Strategy

Claude Code should use a hybrid approach for task management:

### 1. **Use Task Master for:**
- Project-level planning from PRDs or requirements documents
- Breaking down complex features into structured tasks
- Research and context gathering before implementation
- Long-term task tracking across sessions
- Multi-step workflows requiring detailed planning

### 2. **Use TodoWrite/TodoRead for:**
- Quick, session-specific task lists
- Tracking immediate action items
- Simple todo management during coding
- Temporary task tracking that doesn't need persistence

### 3. **Use Ultimate MCP Server for:**
- Code generation and implementation
- Multi-AI orchestration for complex problems
- Error analysis and debugging
- Codebase analysis and search

## Recommended Workflow

When a user presents a new project or feature request:

1. **First, check if it needs structured planning:**
   - Multiple features? → Use Task Master
   - Single task? → Use TodoWrite
   - Research needed? → Use Task Master

2. **For complex projects:**
   ```
   1. Parse PRD with Task Master
   2. Generate task list
   3. Use TodoWrite to track current session work
   4. Research with Task Master
   5. Implement with Ultimate MCP
   ```

3. **For simple tasks:**
   ```
   1. Use TodoWrite to capture the task
   2. Implement directly
   3. Mark complete in TodoWrite
   ```

## Tool Selection Guide

| Scenario | Use This Tool |
|----------|---------------|
| "Build a new authentication system" | Task Master → parse requirements |
| "Fix this TypeScript error" | Ultimate MCP → analyze_error |
| "What's my next task?" | Task Master → get_next_task |
| "Track these 3 quick fixes" | TodoWrite |
| "Research React Query v5" | Task Master → research_topic |
| "Generate login component" | Ultimate MCP → generate_code |

## Important Notes

- Always use Task Master when the user mentions PRDs, requirements docs, or complex planning
- Task Master tasks persist across sessions, TodoWrite tasks don't
- Combine both systems for maximum effectiveness
- When in doubt, ask the user if they want persistent task tracking

## Environment Checks

Before using various tools:
- Task Master: Available after restart (uses Claude Code by default)
- Ultimate MCP: Always available
- TodoWrite/Read: Always available

Remember: Task Master excels at planning and research, Ultimate MCP at execution, and TodoWrite at quick session management.