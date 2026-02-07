# Autocoding Templates

Reusable templates and prompts for running autonomous multi-session coding agents. Given a project idea, these tools produce a detailed specification and then guide an agent through building the entire application across multiple sessions.

## Directory Structure

```
autocoding/
  templates/
    app_spec_template.txt       Blank XML skeleton with guidance comments
  prompts/
    spec_generator_prompt.md    Prompt that fills in the template from a project idea
    initializer_prompt.md       Session 1: scaffolding, feature list, init script
    coding_prompt.md            Session 2+: recurring implement-test-commit cycle
```

## Workflow

### Step 1: Generate the Spec

Feed three things to Claude (via API, Claude Code, or any agent runner):

1. The contents of `prompts/spec_generator_prompt.md` as the system/instruction prompt
2. The contents of `templates/app_spec_template.txt` as context
3. Your project description (a paragraph or page describing what you want built)

Claude outputs a complete `app_spec.txt`. Save it into your target project directory.

**Example prompt structure:**

```
[spec_generator_prompt.md contents]

--- TEMPLATE ---
[app_spec_template.txt contents]

--- PROJECT DESCRIPTION ---
Build a personal finance tracker where users can log expenses, categorize
spending, set monthly budgets, and view charts of their spending over time.
Use React with Vite, Tailwind CSS, Node.js/Express backend, and SQLite.
```

### Step 2: Initialize the Project (Session 1)

Place the generated `app_spec.txt` in your project working directory, then run the agent with `prompts/initializer_prompt.md` as the prompt.

This session will:

- Read `app_spec.txt` and generate `feature_list.json` with 200+ test cases
- Create `init.sh` for environment setup
- Initialize a git repository with the first commit
- Set up the project directory structure
- Optionally begin implementing the highest-priority features

### Step 3: Build Iteratively (Session 2+)

Run the agent with `prompts/coding_prompt.md` as the prompt. Each session follows a disciplined cycle:

1. **Orient** -- Read `app_spec.txt`, `feature_list.json`, `claude-progress.txt`, and git log
2. **Start servers** -- Run `init.sh` or start manually
3. **Verify** -- Re-test 1-2 previously passing features to catch regressions
4. **Pick one feature** -- Choose the highest-priority failing test
5. **Implement** -- Write the code for that feature
6. **Test via browser** -- Verify through actual UI interaction with screenshots
7. **Update feature_list.json** -- Mark the test as passing (only modify `passes` and `screenshots` fields)
8. **Commit** -- Descriptive git commit with what changed
9. **Update progress** -- Write session notes to `claude-progress.txt`
10. **Clean exit** -- No uncommitted changes, no broken features

Repeat until all 200+ tests pass.

## Key Files in a Running Project

| File | Purpose |
|---|---|
| `app_spec.txt` | Complete project specification (generated in Step 1) |
| `feature_list.json` | 200+ test cases tracking what's built and verified |
| `init.sh` | One-command environment setup and server start |
| `claude-progress.txt` | Session-by-session progress notes for continuity |

## Design Decisions

- **Technology-agnostic templates.** The spec generator picks the stack based on your project description. Nothing is hardcoded to React/Node/SQLite.
- **Tool-agnostic prompts.** The coding prompt references "browser automation tools" generically rather than naming specific MCP servers. Works with Puppeteer, Playwright, or whatever your orchestrator provides.
- **Self-contained prompts.** No Python orchestrator dependency. Use these with the Claude Code SDK, direct API calls, or any agent runner.
- **Append-only feature list.** Tests are never removed or edited, only marked as passing. This prevents features from silently disappearing across sessions.
- **One feature per session.** Encourages depth over breadth. A perfectly implemented and tested feature is worth more than five half-done ones.

## Tips

- The spec generator works best when you provide specific technology preferences. Saying "use SQLite" produces a more actionable spec than leaving the database choice open.
- For complex projects, review and edit the generated `app_spec.txt` before starting Session 1. The spec is the contract -- everything downstream follows from it.
- If the agent gets stuck on a feature across multiple sessions, check `claude-progress.txt` for patterns. The issue is usually in the spec (under-specified) or the environment (`init.sh` missing a dependency).
- You can run Step 1 multiple times to iterate on the spec before committing to implementation.
