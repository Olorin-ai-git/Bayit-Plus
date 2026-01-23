# Git Hooks

This directory contains custom git hooks for the Olorin monorepo.

## Installation

To enable these hooks, run:

```bash
git config core.hooksPath .githooks
```

Or add to your global git config to use for all Olorin work:

```bash
git config --global core.hooksPath .githooks
```

## Available Hooks

### pre-commit

Prevents committing code with hardcoded paths.

**Blocks:**
- Absolute paths like `/Users/olorin/Documents/olorin`
- Old directory references like `olorin-server`, `olorin-front`
- User-specific paths

**Allows:**
- Dynamic path resolution via `scripts/common/paths.sh`
- Python path imports via `fraud.lib.paths`
- Relative paths from repository root

### Running Manually

Test the pre-commit hook before committing:

```bash
.githooks/pre-commit
```

## Bypassing (Not Recommended)

If you need to bypass the hook temporarily (not recommended):

```bash
git commit --no-verify
```

## Disabling

To disable the custom hooks:

```bash
git config --unset core.hooksPath
```
