---
description: Sync and update skill catalog after changes
argument-hint: [skill-name] or leave empty to sync all skills
---

## Mission
Update the skill catalog by scanning all skills and regenerating metadata files. Use after creating or modifying skills.

## Arguments
$1: skill name (optional, default: all skills)
- If provided: sync only the specified skill
- If empty: scan all skills and regenerate complete catalog

## Your Tasks

### 1. Scan Skills
- Run: `python .agent\scripts\scan_skills.py`
- This scans `.agent/skills/` directory
- Extracts metadata from all `SKILL.md` files
- Generates `skills_data.yaml`

### 2. Generate Catalogs (if needed)
- Run: `python .agent\scripts\generate_catalogs.py`
- Creates updated skill catalogs
- Outputs final metadata for system use

### 3. Verify Changes
- Check if the specified skill (or all skills) appear in `skills_data.yaml`
- Confirm `has_references` and `has_scripts` are correctly detected
- Report success with summary

## Success Criteria
✅ `skills_data.yaml` updated successfully
✅ Skill appears in catalog with correct metadata
✅ References folder detected (if exists)
✅ Scripts folder detected (if exists)

## Example Usage

```bash
# Sync all skills
/skill/sync

# Sync specific skill
/skill/sync blender-addon
```

## Output
- Updated `skills_data.yaml`
- Optional: Updated catalog files
- Summary report of changes


## Related Workflows
- [/skill-sync](./skill-sync.md) - Update catalogs
- [/skill-create](./skill-create.md) - New knowledge
- [/help](./help.md) - All commands
- [/status](./status.md) - Project status

