#!/bin/bash

# Mass Replace Framer Motion with CSS Classes

echo "🚀 Mass replacing Framer Motion with CSS equivalents..."

# Navigate to frontend src directory
cd /Users/gklainert/Documents/cvplus/frontend/src

# Create backup directory
mkdir -p ../../logs/framer-backups

# Find all files with framer-motion imports
FILES=$(find . -name "*.tsx" -o -name "*.ts" | xargs grep -l "framer-motion" 2>/dev/null)

if [ -z "$FILES" ]; then
    echo "No files with framer-motion found"
    exit 0
fi

echo "Found files with framer-motion:"
echo "$FILES"

# Process each file
for file in $FILES; do
    echo "🔧 Processing $file"
    
    # Create backup
    cp "$file" "../../logs/framer-backups/$(basename $file).backup"
    
    # Remove framer-motion import lines
    sed -i.tmp '/import.*framer-motion/d' "$file"
    
    # Replace motion.div with div + CSS classes
    sed -i.tmp 's/motion\.div/div className="animate-fade-in"/g' "$file"
    sed -i.tmp 's/motion\.span/span className="animate-fade-in"/g' "$file"
    sed -i.tmp 's/motion\.button/button className="animate-scale-in hover-scale"/g' "$file"
    sed -i.tmp 's/motion\.section/section className="animate-slide-in"/g' "$file"
    sed -i.tmp 's/motion\.article/article className="animate-fade-in"/g' "$file"
    sed -i.tmp 's/motion\.h1/h1 className="animate-fade-in"/g' "$file"
    sed -i.tmp 's/motion\.h2/h2 className="animate-fade-in"/g' "$file"
    sed -i.tmp 's/motion\.h3/h3 className="animate-fade-in"/g' "$file"
    sed -i.tmp 's/motion\.p/p className="animate-fade-in"/g' "$file"
    
    # Remove AnimatePresence tags
    sed -i.tmp 's/<AnimatePresence[^>]*>/<div>/g' "$file"
    sed -i.tmp 's/<\/AnimatePresence>/<\/div>/g' "$file"
    
    # Remove common animation props
    sed -i.tmp 's/initial={[^}]*}//g' "$file"
    sed -i.tmp 's/animate={[^}]*}//g' "$file"
    sed -i.tmp 's/exit={[^}]*}//g' "$file"
    sed -i.tmp 's/transition={[^}]*}//g' "$file"
    sed -i.tmp 's/whileHover={[^}]*}//g' "$file"
    sed -i.tmp 's/whileTap={[^}]*}//g' "$file"
    sed -i.tmp 's/whileInView={[^}]*}//g' "$file"
    
    # Clean up duplicate className attributes
    sed -i.tmp 's/className="[^"]*" className="/className="/g' "$file"
    
    # Clean up empty className attributes
    sed -i.tmp 's/className=""//g' "$file"
    
    # Remove temporary files
    rm -f "$file.tmp"
    
    echo "✅ Updated $file"
done

echo "🎉 Framer Motion replacement complete!"
echo "📦 Backups saved in logs/framer-backups/"
echo "🏗️ Run npm run build to test the changes"