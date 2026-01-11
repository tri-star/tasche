---
name: asset-creator
description: Generate web page assets (illustrations, icons, logos) using the Gemini image generation API. Use when the user wants to create images, icons, logos, or illustrations for web pages.
allowed-tools: Bash, Read
---

# Asset Creator

Generate web page assets using the Gemini image generation API.

## Arguments

- `prompt`: Description of the asset to generate (required)
- `--aspect`: Aspect ratio (default: 1:1). Options: 1:1, 16:9, 9:16, 4:3, 3:4
- `--output`: Output filename (default: auto-generated based on timestamp)

## Instructions

When this skill is invoked, run the generation script with the user's arguments:

```bash
bash .claude/skills/asset-creator/scripts/generate-asset.sh [OPTIONS] "<prompt>"
```

### Parsing Arguments

Parse the user's input to extract:
1. The `--aspect` option if provided (e.g., `--aspect 16:9`)
2. The `--output` option if provided (e.g., `--output logo.png`)
3. The remaining text as the prompt

### Example Invocations

```bash
# Simple icon generation
bash .claude/skills/asset-creator/scripts/generate-asset.sh "a minimalist coffee cup icon for a cafe website"

# With aspect ratio
bash .claude/skills/asset-creator/scripts/generate-asset.sh --aspect 16:9 "a hero illustration of a mountain landscape with sunrise"

# With custom output filename
bash .claude/skills/asset-creator/scripts/generate-asset.sh --output logo.png "a modern tech startup logo with abstract geometric shapes"

# With both options
bash .claude/skills/asset-creator/scripts/generate-asset.sh --aspect 4:3 --output banner.png "a promotional banner for a summer sale"
```

## Prompt Enhancement

The script automatically enhances prompts based on detected asset types:

- **Icons**: Prepends "Create a simple, clean icon suitable for web UI. Use flat design with clear shapes."
- **Logos**: Prepends "Create a professional, modern logo suitable for web use. Ensure it works well at various sizes."
- **Illustrations**: Prepends "Create a modern, clean illustration suitable for a web page. Use a cohesive color palette."

Asset type is detected from keywords in the prompt (icon, logo, illustration, etc.).

## Prerequisites

- Environment variable `GEMINI_API_KEY` must be set with a valid Gemini API key
- Required tools: `curl`, `jq`, `base64`

## Error Handling

The script will report errors for:
- Missing `GEMINI_API_KEY` environment variable
- API errors from Gemini
- Missing image data in the response
- File save failures
