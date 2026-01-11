#!/bin/bash
#
# Asset Creator - Generate web page assets using Gemini API
#
# Usage: generate-asset.sh [OPTIONS] "<prompt>"
#
# Options:
#   --aspect RATIO   Aspect ratio (1:1, 16:9, 9:16, 4:3, 3:4). Default: 1:1
#   --output FILE    Output filename. Default: nanobanana_<timestamp>.<ext>
#
# Environment:
#   GEMINI_API_KEY   Required. Your Gemini API key.
#

set -e

source ~/.local/gemini-key

# Default values
ASPECT_RATIO="1:1"
OUTPUT_FILE=""
PROMPT=""

# Check for required tools
check_dependencies() {
    local missing=()
    for cmd in curl jq base64; do
        if ! command -v "$cmd" &> /dev/null; then
            missing+=("$cmd")
        fi
    done

    if [ ${#missing[@]} -gt 0 ]; then
        echo "Error: Missing required tools: ${missing[*]}"
        echo "Please install them before running this script."
        exit 1
    fi
}

# Check for API key
check_api_key() {
    if [ -z "$GEMINI_API_KEY" ]; then
        echo "Error: GEMINI_API_KEY environment variable is not set."
        echo "Please set it with your Gemini API key:"
        echo "  export GEMINI_API_KEY='your-api-key-here'"
        exit 1
    fi
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --aspect)
                ASPECT_RATIO="$2"
                shift 2
                ;;
            --output)
                OUTPUT_FILE="$2"
                shift 2
                ;;
            *)
                # Remaining arguments are the prompt
                if [ -z "$PROMPT" ]; then
                    PROMPT="$1"
                else
                    PROMPT="$PROMPT $1"
                fi
                shift
                ;;
        esac
    done

    if [ -z "$PROMPT" ]; then
        echo "Error: No prompt provided."
        echo "Usage: generate-asset.sh [OPTIONS] \"<prompt>\""
        exit 1
    fi
}

# Validate aspect ratio
validate_aspect_ratio() {
    case $ASPECT_RATIO in
        1:1|16:9|9:16|4:3|3:4)
            ;;
        *)
            echo "Error: Invalid aspect ratio '$ASPECT_RATIO'."
            echo "Valid options: 1:1, 16:9, 9:16, 4:3, 3:4"
            exit 1
            ;;
    esac
}

# Detect asset type and enhance prompt
enhance_prompt() {
    local prompt_lower=$(echo "$PROMPT" | tr '[:upper:]' '[:lower:]')
    local enhanced_prompt="$PROMPT"

    if [[ "$prompt_lower" == *"icon"* ]]; then
        enhanced_prompt="Create a simple, clean icon suitable for web UI. Use flat design with clear shapes. $PROMPT"
    elif [[ "$prompt_lower" == *"logo"* ]]; then
        enhanced_prompt="Create a professional, modern logo suitable for web use. Ensure it works well at various sizes. $PROMPT"
    elif [[ "$prompt_lower" == *"illustration"* ]]; then
        enhanced_prompt="Create a modern, clean illustration suitable for a web page. Use a cohesive color palette. $PROMPT"
    fi

    echo "$enhanced_prompt"
}

# Generate the image via Gemini API
generate_image() {
    local enhanced_prompt="$1"

    # Escape special characters for JSON
    local escaped_prompt=$(echo "$enhanced_prompt" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\n/\\n/g')

    local request_body=$(cat <<EOF
{
  "contents": [{
    "parts": [
      {"text": "$escaped_prompt"}
    ]
  }],
  "generationConfig": {
    "imageConfig": {
      "aspectRatio": "$ASPECT_RATIO"
    }
  }
}
EOF
)

    # Make the API request
    local response
    response=$(curl -s -X POST \
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent" \
        -H "x-goog-api-key: $GEMINI_API_KEY" \
        -H "Content-Type: application/json" \
        -d "$request_body" 2>&1)

    echo "$response"
}

# Extract and save the image from the response
save_image() {
    local response="$1"

    # Check for API error
    local error_message=$(echo "$response" | jq -r '.error.message // empty' 2>/dev/null)
    if [ -n "$error_message" ]; then
        echo "Error: API returned an error: $error_message"
        exit 1
    fi

    # Extract base64 image data
    local image_data=$(echo "$response" | jq -r '.candidates[0].content.parts[0].inlineData.data // empty' 2>/dev/null)
    if [ -z "$image_data" ] || [ "$image_data" == "null" ]; then
        echo "Error: No image data in the response. Image generation may have failed."
        echo "Response preview:"
        echo "$response" | head -c 500
        exit 1
    fi

    # Extract MIME type
    local mime_type=$(echo "$response" | jq -r '.candidates[0].content.parts[0].inlineData.mimeType // "image/png"' 2>/dev/null)

    # Determine file extension from MIME type
    local extension="png"
    case $mime_type in
        image/jpeg|image/jpg)
            extension="jpg"
            ;;
        image/png)
            extension="png"
            ;;
        image/gif)
            extension="gif"
            ;;
        image/webp)
            extension="webp"
            ;;
    esac

    # Generate output filename if not provided
    if [ -z "$OUTPUT_FILE" ]; then
        local timestamp=$(date +%Y%m%d_%H%M%S)
        OUTPUT_FILE="nanobanana_${timestamp}.${extension}"
    fi

    # Decode and save the image
    if echo "$image_data" | base64 -d > "$OUTPUT_FILE" 2>/dev/null; then
        echo "Success! Image saved to: $OUTPUT_FILE"
        echo "MIME type: $mime_type"
        echo "File size: $(ls -lh "$OUTPUT_FILE" | awk '{print $5}')"
    else
        echo "Error: Failed to decode and save the image."
        exit 1
    fi
}

# Main function
main() {
    check_dependencies
    check_api_key
    parse_args "$@"
    validate_aspect_ratio

    echo "Generating asset..."
    echo "Prompt: $PROMPT"
    echo "Aspect ratio: $ASPECT_RATIO"

    local enhanced_prompt=$(enhance_prompt)
    echo "Enhanced prompt: $enhanced_prompt"
    echo ""

    local response=$(generate_image "$enhanced_prompt")
    save_image "$response"
}

main "$@"
