#!/bin/bash

# Targeted fix for functions/src/api/index.ts corruption
echo "🔧 Fixing specific corruption in functions/src/api/index.ts..."

FILE="/Users/gklainert/Documents/cvplus/functions/src/api/index.ts"

# Create backup
cp "$FILE" "$FILE.backup.$(date +%s)"

# Fix the specific corruption patterns line by line
echo "Applying targeted fixes..."

# Fix line 11: */ should be /*
sed -i '' '11s/^\*/\/\*/' "$FILE"

# Fix line 13: */ should be /*
sed -i '' '13s/^\*/\/\*/' "$FILE"

# Fix line 15: */ should be /*
sed -i '' '15s/^\*/\/\*/' "$FILE"

# Fix line 67: */ should be /*
sed -i '' '67s/^\*/\/\*/' "$FILE"

# Fix line 126: */ should be /*
sed -i '' '126s/^\*/\/\*/' "$FILE"

# Fix line 162: */ should be /*
sed -i '' '162s/^\*/\/\*/' "$FILE"

# Fix line 198: */ should be /*
sed -i '' '198s/^\*/\/\*/' "$FILE"

# Fix line 291: */ should be /*
sed -i '' '291s/^\*/\/\*/' "$FILE"

# Test compilation
echo "🧪 Testing TypeScript compilation..."
cd /Users/gklainert/Documents/cvplus/functions
npm run build > test_build.log 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Functions TypeScript compilation successful!"
    rm -f test_build.log
else
    echo "❌ Still has errors. First 20 lines:"
    head -20 test_build.log
    echo ""
    echo "Checking if there are other corruption patterns..."

    # Check for remaining patterns
    echo "Lines with */ at start:"
    grep -n "^\s*\*/" "$FILE" | head -10
fi

echo "🎉 Targeted fix complete!"