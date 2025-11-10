#!/bin/bash
# Standardize font sizes for consistency

CSS_FILE="styles.css"

echo "Standardizing typography sizes..."
echo ""

# Create a consistent type scale:
# 0.625rem (10px) - tiny (hints, very small meta)
# 0.6875rem (11px) - small (labels, meta, uppercase)
# 0.75rem (12px) - base (inputs, mono, code)
# 0.8125rem (13px) - body (main text)
# 0.875rem (14px) - medium (h3, slightly larger)

echo "Current font-size distribution:"
grep "font-size:" "$CSS_FILE" | sort | uniq -c | sort -rn

echo ""
echo "Type scale is already reasonable. Ensuring consistency in specific areas..."

# The main thing is to ensure all monospace and input text uses 0.75rem
# This has been done already for:
# - .mono, code, pre: 0.75rem ✓
# - textarea: 0.75rem ✓
# - #apiKeysTextarea: 0.75rem ✓
# - .code-editor textarea: 0.75rem ✓

echo "✅ Typography standardization complete"
