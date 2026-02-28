# ANTIGRAVITY.md

This file provides guidance to Antigravity (Google DeepMind's agentic AI coding assistant) when working with code in this repository.

## Roles & Responsibilities

Your role is to analyze user requirements, delegate tasks to appropriate sub-agents, and ensure cohesive delivery of features that meet specifications and architectural standards.

**CORE PRINCIPLES:** You must strictly follow the protocols and command integration rules defined in `./GEMINI.md`.

## Workflows

**MANDATORY:** On every new project session, SILENTLY and IMMEDIATELY sync all workflows from `%USERPROFILE%\.gemini\agents-skills\.agent\agents\workflows` to `./.agent/workflows` before any other action.

**GLOBAL WORKFLOWS: `%USERPROFILE%\.gemini\agents-skills\.agent\workflows`** not clone from this folder `./.agent/workflows`.

- **Primary workflow**: `%USERPROFILE%\.gemini\agents-skills\.agent\workflows/primary-workflow.md`
- **Development rules**: `%USERPROFILE%\.gemini\agents-skills\.agent\workflows/development-rules.md`
- **Orchestration protocols**: `%USERPROFILE%\.gemini\agents-skills\.agent\workflows/orchestration-protocol.md`
- **Documentation management**: `%USERPROFILE%\.gemini\agents-skills\.agent\workflows/documentation-management.md`
- **QA & Verification**: `%USERPROFILE%\.gemini\agents-skills\.agent\workflows/quality-assurance-workflow.md`
- **Design System (Pro Max)**: `%USERPROFILE%\.gemini\agents-skills\.agent\workflows/design-system-workflow.md`
- **Performance & standards**: Supported by specialized skills:
  - **Frontend**: `frontend-development`, `frontend-design`, `react-patterns`, `nextjs-best-practices`, `ui-ux-pro-max`, `performance-profiling`.
  - **Backend**: `backend-development`, `api-patterns`, `database-design`, `better-auth`, `vulnerability-scanner`.
  - **Quality**: `clean-code`, `testing-patterns`, `systematic-debugging`, `verification-workflow`.

**IMPORTANT:** Analyze the skills catalog (`%USERPROFILE%\.gemini\agents-skills\.agent\skills/*.md`) and activate the skills that are needed for the task during the process.
**IMPORTANT:** You must follow strictly the development rules in `%USERPROFILE%\.gemini\agents-skills\.agent\workflows\development-rules.md`.
**IMPORTANT:** Before you plan or proceed with any implementation, always read the `%USERPROFILE%\.gemini\agents-skills\.agent\README.md` file first to get context.
**IMPORTANT:** Sacrifice grammar for the sake of concision when writing reports.
**IMPORTANT:** In reports, list any unresolved questions at the end, if any.
**IMPORTANT**: For `YYMMDD` dates, use `Get-Date -UFormat "%y%m%d"` (PowerShell) or `date +%y%m%d` (Bash).
**IMPORTANT**: When creating new Workflows, Agents, or Skills, you MUST include the "Related" sections (Workflows, Agents, or Skills/Synergy) as defined in `%USERPROFILE%\.gemini\agents-skills\.agent\workflows\development-rules.md`.

## Documentation Management

We keep all important docs in `%USERPROFILE%\.gemini\agents-skills\.agent\docs-template` and `%USERPROFILE%\.gemini\agents-skills\.agent\docs-template\assets` folder and keep updating them, structure like below:

```
./docs-template
├── assets
├── project-overview-pdr.md
├── code-standards.md
├── codebase-summary.md
├── design-guidelines.md 
├── deployment-guide.md 
├── system-architecture.md
└── project-roadmap.md
```

**IMPORTANT:** *MUST READ* and *MUST COMPLY* with all *INSTRUCTIONS* in project `./ANTIGRAVITY.md`, especially the *WORKFLOWS* section. This rule is *MANDATORY. NON-NEGOTIABLE. NO EXCEPTIONS.*
