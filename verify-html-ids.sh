#!/bin/bash
echo "=== VERIFYING HTML ELEMENT IDS ==="
echo ""

critical_ids=(
  "keysContainer" "validateKeys" "clearKeys" "keyRotationPill"
  "sessionStatusBar" "stickyStopBtn" "runQueryBtn" "sessionStatus"
  "iterationLog" "execBtn" "codeInput" "finalOutput"
  "tasksList" "memoryList" "goalsList" "vaultList"
  "taskModal" "memoryModal" "goalModal" "vaultModal"
  "attachmentDropzone" "attachmentInput"
)

missing=0
for id in "${critical_ids[@]}"; do
  if ! grep -q "id=\"$id\"" index.html; then
    echo "❌ Missing in HTML: $id"
    ((missing++))
  fi
done

if [ $missing -eq 0 ]; then
  echo "✅ All ${#critical_ids[@]} critical IDs present in HTML"
else
  echo "❌ Found $missing missing IDs in HTML"
fi

echo ""
echo "=== HTML VERIFICATION COMPLETE ==="
