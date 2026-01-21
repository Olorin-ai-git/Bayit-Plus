#!/bin/bash

# Script to help migrate StyleSheet to TailwindCSS in admin screens
# This script removes StyleSheet imports and StyleSheet.create blocks

files=(
  "shared/screens/admin/SubscriptionsScreen.tsx"
  "shared/screens/admin/UserDetailScreen.tsx"
  "shared/screens/admin/CampaignsListScreen.tsx"
  "shared/screens/admin/PushNotificationsScreen.tsx"
  "shared/screens/admin/PlanManagementScreen.tsx"
  "shared/screens/admin/AdminDashboardScreen.tsx"
  "shared/screens/admin/CampaignDetailScreen.tsx"
  "shared/screens/admin/MarketingDashboardScreen.tsx"
  "shared/screens/admin/UploadsScreen.tsx"
  "shared/screens/admin/UsersListScreen.tsx"
  "shared/screens/admin/BillingOverviewScreen.tsx"
  "shared/screens/admin/SupportDashboardScreen.tsx"
  "shared/screens/admin/EmailCampaignsScreen.tsx"
)

echo "Starting migration of ${#files[@]} files..."

for file in "${files[@]}"; do
  echo "Processing: $file"

  # Check if file exists
  if [ ! -f "$file" ]; then
    echo "  ❌ File not found: $file"
    continue
  fi

  # Remove StyleSheet from imports
  sed -i.bak 's/StyleSheet, //g' "$file"
  sed -i.bak 's/, StyleSheet//g' "$file"

  # Find line number where StyleSheet.create starts
  start_line=$(grep -n "const styles = StyleSheet.create" "$file" | cut -d: -f1)

  if [ -n "$start_line" ]; then
    echo "  ✓ Found StyleSheet.create at line $start_line"

    # Remove from StyleSheet.create to end of file (typically last few lines)
    # We'll delete from the styles declaration to the export
    head -n $(($start_line - 2)) "$file" > "${file}.tmp"

    # Find and append the export line
    tail -n 2 "$file" >> "${file}.tmp"

    mv "${file}.tmp" "$file"
    echo "  ✓ Removed StyleSheet.create block"
  else
    echo "  ℹ No StyleSheet.create found"
  fi

  # Clean up backup
  rm -f "${file}.bak"
done

echo "✅ Migration complete!"
echo "⚠️  Next steps:"
echo "   1. Manually convert all style={styles.xyz} to className='...' in each file"
echo "   2. Test each screen to ensure styles work correctly"
echo "   3. Keep any dynamic style={{}} for RTL or computed values"
