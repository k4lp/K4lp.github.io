#!/bin/bash
# CSS Update Script for Swiss Design Monochrome Redesign
# This script systematically updates the CSS to follow Swiss design principles

CSS_FILE="styles.css"
BACKUP_FILE="styles.css.backup"

echo "Starting CSS redesign..."

# Phase 1: Update color variables to monochrome
sed -i '/--info:/c\  --info: var(--gray-100);' "$CSS_FILE"
sed -i '/--info-border:/c\  --info-border: var(--gray-300);' "$CSS_FILE"
sed -i '/--info-text:/c\  --info-text: var(--gray-900);' "$CSS_FILE"

sed -i '/--success:/c\  --success: var(--gray-100);' "$CSS_FILE"
sed -i '/--success-border:/c\  --success-border: var(--gray-300);' "$CSS_FILE"
sed -i '/--success-text:/c\  --success-text: var(--gray-900);' "$CSS_FILE"

sed -i '/--warning:/c\  --warning: var(--gray-100);' "$CSS_FILE"
sed -i '/--warning-border:/c\  --warning-border: var(--gray-300);' "$CSS_FILE"
sed -i '/--warning-text:/c\  --warning-text: var(--gray-700);' "$CSS_FILE"

sed -i '/--error:/c\  --error: var(--gray-100);' "$CSS_FILE"
sed -i '/--error-border:/c\  --error-border: var(--gray-400);' "$CSS_FILE"
sed -i '/--error-text:/c\  --error-text: var(--gray-900);' "$CSS_FILE"

# Phase 2: Update layout variables
sed -i 's/--header-height: 64px;/--header-height: 56px;/' "$CSS_FILE"
sed -i '/--gap: 0;/a\  --border-emphasis: 2px;' "$CSS_FILE"

# Phase 3: Replace bright colors with monochrome
sed -i 's/#00ff00/var(--white)/g' "$CSS_FILE"
sed -i 's/#00cc00/var(--gray-200)/g' "$CSS_FILE"
sed -i 's/#ff4444/var(--white)/g' "$CSS_FILE"
sed -i 's/#ff3366/var(--gray-900)/g' "$CSS_FILE"
sed -i 's/#0066cc/var(--gray-900)/g' "$CSS_FILE"
sed -i 's/#00804d/var(--gray-900)/g' "$CSS_FILE"
sed -i 's/#cc8800/var(--gray-700)/g' "$CSS_FILE"
sed -i 's/#cc0000/var(--gray-900)/g' "$CSS_FILE"
sed -i 's/#0099ff/var(--gray-900)/g' "$CSS_FILE"
sed -i 's/#00cc66/var(--gray-900)/g' "$CSS_FILE"
sed -i 's/#9334e6/var(--gray-900)/g' "$CSS_FILE"
sed -i 's/#ff6600/var(--gray-900)/g' "$CSS_FILE"
sed -i 's/#cc0099/var(--gray-900)/g' "$CSS_FILE"
sed -i 's/#ff9933/var(--gray-900)/g' "$CSS_FILE"

# Phase 4: Remove box-shadows (except where needed for depth)
sed -i 's/box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);/box-shadow: none;/' "$CSS_FILE"
sed -i 's/box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);/box-shadow: none;/' "$CSS_FILE"
sed -i 's/box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);/box-shadow: none;/' "$CSS_FILE"
sed -i 's/box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);/box-shadow: none;/' "$CSS_FILE"
sed -i 's/box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);/box-shadow: none;/' "$CSS_FILE"
sed -i 's/box-shadow: 0 8px 32px rgba(0, 0, 0, 0.24);/box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);/' "$CSS_FILE"
sed -i 's/text-shadow: 0 0 10px rgba(0, 255, 0, 0.5);/text-shadow: none;/' "$CSS_FILE"
sed -i 's/box-shadow: 0 0 8px rgba(0, 255, 0, 0.8);/box-shadow: none;/' "$CSS_FILE"

# Phase 5: Update border-radius to 0 where it exists
sed -i 's/border-radius: 50%;/border-radius: 0;/' "$CSS_FILE"
sed -i 's/border-radius: 3px;/border-radius: 0;/' "$CSS_FILE"
sed -i 's/border-radius: 2px;/border-radius: 0;/' "$CSS_FILE"

# Phase 6: Standardize borders
sed -i 's/border: 3px solid/border: var(--border-emphasis) solid/' "$CSS_FILE"
sed -i 's/border-left: 3px solid/border-left: var(--border-emphasis) solid/' "$CSS_FILE"
sed -i 's/border-left: 4px solid/border-left: var(--border-emphasis) solid/' "$CSS_FILE"
sed -i 's/border-bottom: 3px solid/border-bottom: var(--border-emphasis) solid/' "$CSS_FILE"
sed -i 's/border: 2px dashed/border: var(--border-emphasis) dashed/' "$CSS_FILE"

# Phase 7: Remove gradient backgrounds
sed -i 's/background: linear-gradient(to right, rgba(0, 102, 204, 0.03), transparent);/background: var(--white);/' "$CSS_FILE"
sed -i 's/background: linear-gradient(to right, rgba(0, 204, 102, 0.04), transparent);/background: var(--white);/' "$CSS_FILE"
sed -i 's/background: linear-gradient(to right, rgba(147, 52, 230, 0.04), transparent);/background: var(--white);/' "$CSS_FILE"
sed -i 's/background: linear-gradient(to right, rgba(0, 153, 255, 0.04), transparent);/background: var(--white);/' "$CSS_FILE"
sed -i 's/background: linear-gradient(to right, rgba(255, 102, 0, 0.04), transparent);/background: var(--white);/' "$CSS_FILE"
sed -i 's/background: linear-gradient(to right, rgba(204, 0, 153, 0.04), transparent);/background: var(--white);/' "$CSS_FILE"

# Phase 8: Update status indicator from circle to square
sed -i 's/width: 10px;/width: 8px;/' "$CSS_FILE"
sed -i 's/height: 10px;/height: 8px;/' "$CSS_FILE"

echo "CSS redesign complete! Check $CSS_FILE"
echo "Original CSS backed up to $BACKUP_FILE"
