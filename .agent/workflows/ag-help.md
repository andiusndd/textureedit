---
description: Antigravity usage guide - just type naturally
argument-hint: [category|command|task description]
---

# Antigravity Help Guide

This command assists you in navigating the Antigravity system, suggesting the right tools and workflows for your needs.

## Pre-Processing

**IMPORTANT: Always translate `$ARGUMENTS` to English before processing.**

If the user provides an argument in another language:
1. Translate `$ARGUMENTS` to English.
2. Use the translated intent to find the best matching command or workflow.

## Execution & Logic

Since we don't use the external python script here, you act as the intelligent guide.
Analyze the user's `$ARGUMENTS`:

- **If Empty**: Show the high-level categories (Core, Design, Fix, Planning, etc.) and ask what they want to do.
- **If Category (e.g., "design", "fix")**: List the specific sub-commands available in that category with brief descriptions.
- **If Task Description (e.g., "how to fix a bug", "create a website")**: Recommend the best command sequence or workflow.

## Presentation Guidelines

**1. Add Context When Helpful**
- If user seems new, add a brief welcome
- If user searched for something not found, suggest alternatives
- If showing a category, mention how to dive deeper

**2. Make It Conversational**
- Don't just dump output - introduce it naturally
- Example: "Here are the fix commands:" then show the list
- End with actionable next step: "Try `/fix your-issue` to get started"

**3. Offer Follow-Up**
- Overview → "Want to explore a category? Just say which one"
- Category → "Need details on a specific command?"
- Command → "Ready to use it? Just type the command"
- Search → "Want me to explain any of these?"

**4. Adapt to User Intent**
- Quick lookup → Be brief, just the essentials
- Learning/exploring → Add context and examples
- Problem-solving → Focus on workflow, skip the overview

**5. Handle Edge Cases Gracefully**
- No results? Suggest similar commands or categories
- Typo detected? Ask "Did you mean X?"
- Empty input? Show overview with friendly intro

## Common Workflows (Reference)

- **Planning First**: `/plan` (create plan) → `/code` (execute plan)
- **All-in-One**: `/cook` (Autonomous planning & coding) - *Good for features*
- **Quick Fixes**: `/fix/fast` or `/fix` (Autonomous debugging)
- **Consultation**: `/ask` (Technical questions)

## Example Interactions

**User:** `/ag-help`
**You:** (Welcome message & Overview of categories: Planning, Coding, Fixing, Design...) "What are you trying to build or fix today?"

**User:** `/ag-help design`
**You:** "Here are the design tools available:"
- `/design/good` (Immersive)
- `/design/fast` (Quick)
- `/design/3d` (Three.js)
"Which style fits your needs?"

**User:** `/ag-help "make a landing page"`
**You:** "For a landing page, I recommend:"
1. `/cook "landing page"` (Fastest, I handle everything)
2. `/plan "landing page"` then `/code` (More control)
"Which approach do you prefer?"


## Related Workflows
- [/help](./help.md) - All commands
- [/status](./status.md) - Project status

