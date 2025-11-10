#!/bin/bash
# Verify all critical selectors exist in CSS

echo "=== VERIFYING CRITICAL CSS SELECTORS ==="
echo ""

critical_ids=(
  "#keysContainer" "#validateKeys" "#clearKeys" "#keyRotationPill"
  "#sessionStatusBar" "#stickyStopBtn" "#runQueryBtn" "#sessionStatus"
  "#iterationLog" "#execBtn" "#codeInput" "#finalOutput"
  "#tasksList" "#memoryList" "#goalsList" "#vaultList"
  "#taskModal" "#memoryModal" "#goalModal" "#vaultModal"
  "#attachmentDropzone" "#attachmentInput"
)

critical_classes=(
  ".btn" ".btn-primary" ".btn-danger" ".pill" ".block" ".panel"
  ".collapse-toggle" ".li" ".modal" ".attachment-tab"
)

echo "Checking IDs..."
missing_ids=0
for id in "${critical_ids[@]}"; do
  if ! grep -q "$id" styles.css; then
    echo "⚠️  Missing: $id"
    ((missing_ids++))
  fi
done

if [ $missing_ids -eq 0 ]; then
  echo "✅ All critical IDs have styles"
else
  echo "❌ Found $missing_ids missing ID selectors"
fi

echo ""
echo "Checking Classes..."
missing_classes=0
for class in "${critical_classes[@]}"; do
  if ! grep -q "$class" styles.css; then
    echo "⚠️  Missing: $class"
    ((missing_classes++))
  fi
done

if [ $missing_classes -eq 0 ]; then
  echo "✅ All critical classes have styles"
else
  echo "❌ Found $missing_classes missing class selectors"
fi

echo ""
echo "=== VERIFICATION COMPLETE ==="
