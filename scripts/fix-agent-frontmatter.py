#!/usr/bin/env python3
"""
Script to fix agent frontmatter by adding missing description and name fields.
"""

import os
import re
from pathlib import Path

# Agent files missing description
DESCRIPTION_FILES = [
    ".claude/agents/data/analytics-implementation-specialist.md",
    ".claude/agents/data/business-intelligence-developer.md",
    ".claude/agents/infrastructure/devops-troubleshooter.md",
    ".claude/agents/infrastructure/network-engineer.md",
    ".claude/agents/infrastructure/pulumi-typescript-specialist.md",
    ".claude/agents/infrastructure/observability-engineer.md",
    ".claude/agents/infrastructure/serverless-architect.md",
    ".claude/agents/infrastructure/terraform-specialist.md",
    ".claude/agents/choreography/bug-hunting-tango.md",
    ".claude/agents/choreography/feature-development-dance.md",
    ".claude/agents/choreography/code-review-waltz.md",
    ".claude/agents/task-execution-context.md",
    ".claude/agents/security/CONSOLIDATED_SECURITY_AUDITOR.md",
    ".claude/agents/automation/release-manager.md",
    ".claude/agents/security/privacy-engineer.md",
    ".claude/agents/security/devsecops-engineer.md",
    ".claude/agents/personalities/agent-evolution-system.md",
    ".claude/agents/marketing/instagram-curator.md",
    ".claude/agents/marketing/twitter-engager.md",
    ".claude/agents/marketing/growth-hacker.md",
    ".claude/agents/marketing/content-creator.md",
    ".claude/agents/marketing/reddit-community-builder.md",
    ".claude/agents/ai/computer-vision-specialist.md",
    ".claude/agents/ai/machine-learning-engineer.md",
    ".claude/agents/ai/nlp-llm-integration-expert.md",
    ".claude/agents/frontend/mobile-developer.md",
    ".claude/agents/frontend/micro-frontend-architect.md",
    ".claude/agents/frontend/react-expert.md",
    ".claude/agents/frontend/pwa-specialist.md",
    ".claude/agents/frontend/design-system-architect.md",
    ".claude/agents/frontend/webassembly-specialist.md",
    ".claude/agents/backend/go-resilience-engineer.md",
    ".claude/agents/backend/go-zap-logging.md",
    ".claude/agents/backend/CONSOLIDATED_DJANGO_BACKEND_EXPERT.md",
    ".claude/agents/backend/resilience-engineer.md",
    ".claude/agents/backend/logging-concepts-engineer.md",
    ".claude/agents/backend/typescript-cockatiel-resilience.md",
    ".claude/agents/backend/CONSOLIDATED_RAILS_BACKEND_EXPERT.md",
    ".claude/agents/backend/typescript-pino-logging.md",
    ".claude/agents/backend/REMOVED_DUPLICATE.md",
    ".claude/agents/backend/CONSOLIDATED_NODEJS_BACKEND_EXPERT.md",
    ".claude/agents/universal/resilience-engineer.md",
    ".claude/agents/universal/logging-concepts-engineer.md",
    ".claude/agents/business/payment-integration-agent.md",
    ".claude/agents/business/ux-designer.md",
    ".claude/agents/business/MOVED_TO_DESIGN_CATEGORY.md",
    ".claude/agents/business/business-analyst.md",
    ".claude/agents/business/product-manager.md",
    ".claude/agents/business/healthcare-compliance-agent.md",
    ".claude/agents/orchestration/choreography-engine.md",
    ".claude/agents/orchestration/personality-engine.md",
    ".claude/agents/orchestration/activation-system.md",
    ".claude/agents/orchestration/workflow-coordinator.md",
    ".claude/agents/orchestration/learning-system.md",
    ".claude/agents/ai-analysis/graphql-architect.md",
    ".claude/agents/ai-analysis/prompt-engineer.md",
    ".claude/agents/README.md",
    ".claude/agents/choreography/README.md",
    ".claude/agents/orchestration/README.md",
]

# Files missing name
NAME_FILES = [
    ".claude/agents/infrastructure/incident-responder.md",
    ".claude/agents/infrastructure/cloud-architect.md",
    ".claude/agents/infrastructure/site-reliability-engineer.md",
    ".claude/agents/infrastructure/database-admin.md",
    ".claude/agents/ACTIVE-SYSTEM-OVERVIEW.md",
    ".claude/agents/orchestration/CONSOLIDATION_PLAN.md",
]

BASE_DIR = Path("/Users/gklainert/Documents/olorin")


def get_description_from_content(content):
    """Extract a description from the file content."""
    lines = content.split('\n')
    
    # Skip frontmatter
    in_frontmatter = False
    content_lines = []
    for line in lines:
        if line.strip() == '---':
            if not in_frontmatter:
                in_frontmatter = True
                continue
            else:
                in_frontmatter = False
                continue
        if not in_frontmatter:
            content_lines.append(line)
    
    # Look for Role section
    for i, line in enumerate(content_lines):
        if line.strip().startswith('## Role'):
            if i + 1 < len(content_lines):
                desc = content_lines[i + 1].strip()
                if desc:
                    return desc[:97] + '...' if len(desc) > 100 else desc
    
    # Look for first meaningful paragraph
    for line in content_lines:
        line = line.strip()
        if line and not line.startswith('#') and not line.startswith('**'):
            return line[:97] + '...' if len(line) > 100 else line
    
    return None


def get_name_from_file(filepath):
    """Extract agent name from filename."""
    return Path(filepath).stem


def add_frontmatter_field(content, field, value):
    """Add a field to frontmatter."""
    if not content.startswith('---'):
        # No frontmatter, create it
        name = get_name_from_file('')
        return f"---\nname: {name}\n{field}: {value}\nmodel: sonnet\n---\n\n{content}"
    
    parts = content.split('---', 2)
    if len(parts) < 3:
        return content
    
    frontmatter = parts[1]
    body = parts[2]
    
    # Check if field already exists
    if f'{field}:' in frontmatter:
        return content
    
    # Add field
    frontmatter = frontmatter.rstrip() + f'\n{field}: {value}\n'
    return f"---{frontmatter}---{body}"


def fix_file(filepath, add_name=False):
    """Fix frontmatter in a file."""
    full_path = BASE_DIR / filepath
    
    if not full_path.exists():
        print(f"  ⚠ File not found: {filepath}")
        return False
    
    print(f"Processing: {filepath}")
    
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Add name if needed
    if add_name:
        name = get_name_from_file(filepath)
        content = add_frontmatter_field(content, 'name', name)
    
    # Add description
    desc = get_description_from_content(content)
    if not desc:
        desc = f"{get_name_from_file(filepath).replace('-', ' ').title()} specialist with comprehensive expertise and implementation capabilities"
    
    content = add_frontmatter_field(content, 'description', desc)
    
    # Write back if changed
    if content != original_content:
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✓ Updated")
        return True
    else:
        print(f"  - No changes needed")
        return False


def main():
    """Main function."""
    print("Fixing agent frontmatter...\n")
    
    fixed = 0
    errors = 0
    
    # Fix files missing description
    for filepath in DESCRIPTION_FILES:
        try:
            if fix_file(filepath, add_name=False):
                fixed += 1
        except Exception as e:
            print(f"  ✗ Error: {e}")
            errors += 1
    
    # Fix files missing name
    for filepath in NAME_FILES:
        try:
            if fix_file(filepath, add_name=True):
                fixed += 1
        except Exception as e:
            print(f"  ✗ Error: {e}")
            errors += 1
    
    print(f"\n✅ Complete! Fixed {fixed} files with {errors} errors.")
    print("Run 'claude doctor' to verify all issues are resolved.")


if __name__ == '__main__':
    main()
