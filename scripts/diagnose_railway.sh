#!/bin/bash

# Railway Diagnostics Script
# Run this to diagnose Google Sheets integration issues

echo "==================================="
echo "Railway Deployment Diagnostics"
echo "==================================="
echo ""

echo "1. Testing Google Sheets access locally..."
echo "---"
node src/test_sheet_structure.js
echo ""

echo "==================================="
echo "2. Checking .env file variables..."
echo "---"
if [ -f .env ]; then
    echo "✓ .env file exists"
    echo "Checking for required variables:"
    grep -q "GOOGLE_SERVICE_ACCOUNT_EMAIL" .env && echo "  ✓ GOOGLE_SERVICE_ACCOUNT_EMAIL found" || echo "  ✗ GOOGLE_SERVICE_ACCOUNT_EMAIL missing"
    grep -q "GOOGLE_PRIVATE_KEY" .env && echo "  ✓ GOOGLE_PRIVATE_KEY found" || echo "  ✗ GOOGLE_PRIVATE_KEY missing"
    grep -q "FACEBOOK_COOKIES" .env && echo "  ✓ FACEBOOK_COOKIES found" || echo "  ✗ FACEBOOK_COOKIES missing"
else
    echo "✗ .env file not found!"
fi
echo ""

echo "==================================="
echo "3. Next Steps for Railway:"
echo "---"
echo "Go to: https://railway.app/project/834be419-22d6-4790-ba75-3e3641e0da4f"
echo ""
echo "Then:"
echo "  1. Click 'negi-scrapper' service"
echo "  2. Go to 'Variables' tab"
echo "  3. Verify all variables are set correctly"
echo "  4. Click 'Deployments' tab"
echo "  5. View latest deployment logs"
echo ""
echo "Look for these errors in logs:"
echo "  - 'Row X not found'"
echo "  - 'Missing Google Sheets credentials'"
echo "  - 'Failed to get pending rows'"
echo "==================================="
