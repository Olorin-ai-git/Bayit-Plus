#!/bin/bash

# GetMyCV.ai - Git Repository Initialization Script
# Repository: git@github.com:gilco1973/getmycv.git

echo "🚀 Initializing GetMyCV.ai project..."
echo "======================================"
echo ""

# Function to check if command was successful
check_status() {
    if [ $? -eq 0 ]; then
        echo "✅ $1"
    else
        echo "❌ Failed: $1"
        exit 1
    fi
}

# Create a comprehensive .gitignore if it doesn't exist
if [ ! -f .gitignore ]; then
    echo "Creating .gitignore file..."
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Production
build/
dist/
lib/

# Environment files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# OS files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Firebase
.firebase/
.firebaserc
firebase-debug.log
firestore-debug.log
ui-debug.log
database-debug.log
pubsub-debug.log
firestore.indexes.json

# Temporary files
*.tmp
*.temp
.cache/

# Build artifacts
*.tsbuildinfo
EOF
    check_status "Created .gitignore"
fi

# Create README.md with project information
echo "Creating README.md..."
cat > README.md << 'EOF'
# GetMyCV.ai - AI-Powered CV Creator

Transform your traditional CV into an interactive, multimedia-rich professional profile with just one click.

## 🚀 Features

- **AI-Powered Analysis**: Uses Anthropic's Claude API to intelligently parse and enhance CVs
- **Smart Recommendations**: Get personalized suggestions for formats, industries, and keywords
- **Interactive Features**: Add podcasts, videos, timelines, and more to your CV
- **Multiple Formats**: Export to PDF, DOCX, HTML, or share online
- **ATS Optimization**: Ensure your CV passes applicant tracking systems
- **Real-time Preview**: See changes as you make them

## 🛠️ Tech Stack

### Frontend
- React + Vite
- TypeScript
- Tailwind CSS + shadcn/ui
- Zustand (State Management)
- Firebase SDK

### Backend
- Firebase Functions
- Firestore Database
- Firebase Storage
- Anthropic Claude API
- NotebookLLM Integration

## 📋 Prerequisites

- Node.js 18+
- Firebase CLI
- Anthropic API Key
- Firebase Project

## 🚀 Quick Start

1. Clone the repository:
```bash
git clone git@github.com:gilco1973/getmycv.git
cd getmycv
```

2. Install dependencies:
```bash
# Frontend
cd frontend && npm install

# Functions
cd ../functions && npm install
```

3. Set up environment variables:
```bash
# Copy example env files
cp frontend/.env.example frontend/.env.local
cp functions/.env.example functions/.env
```

4. Start development:
```bash
# Terminal 1: Firebase emulators
firebase emulators:start

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: Functions
cd functions && npm run build:watch
```

## 📦 Project Structure

```
getmycv.ai/
├── frontend/              # React + Vite app
│   ├── src/              # Source code
│   ├── public/           # Static assets
│   └── dist/             # Build output
├── functions/            # Firebase Cloud Functions
│   ├── src/              # TypeScript source
│   └── lib/              # Compiled JS
├── firestore.rules       # Database security rules
├── storage.rules         # Storage security rules
└── firebase.json         # Firebase configuration
```

## 🔑 Environment Variables

### Frontend (.env.local)
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Functions (.env)
```
ANTHROPIC_API_KEY=
NOTEBOOK_LLM_API_KEY=
```

## 🚀 Deployment

```bash
# Build frontend
cd frontend && npm run build

# Deploy everything
firebase deploy

# Deploy specific services
firebase deploy --only hosting
firebase deploy --only functions
```

## 📝 License

This project is proprietary and confidential.

## 🤝 Contributing

Please read our contributing guidelines before submitting PRs.

## 📧 Contact

For questions or support, please contact the development team.

---

Built with ❤️ by the GetMyCV.ai team
EOF
check_status "Created README.md"

# Initialize git repository
echo ""
echo "Initializing git repository..."
git init
check_status "Git repository initialized"

# Add remote origin
echo "Adding remote origin..."
git remote add origin git@github.com:gilco1973/getmycv.git
check_status "Remote origin added"

# Check if remote was added successfully
echo ""
echo "Verifying remote configuration..."
git remote -v

# Create initial commit
echo ""
echo "Creating initial commit..."
git add .
git commit -m "Initial commit: GetMyCV.ai - AI-powered CV creator

- Complete system design documentation
- React + Vite frontend setup
- Firebase backend architecture
- AI-powered CV parsing with Anthropic Claude
- Interactive CV features design
- NotebookLLM podcast integration
- Comprehensive recommendations system"
check_status "Initial commit created"

# Set main branch
git branch -M main
check_status "Branch renamed to main"

echo ""
echo "======================================"
echo "✅ GetMyCV.ai repository initialized!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Make sure you have SSH keys set up for GitHub"
echo "2. Push to remote repository:"
echo "   git push -u origin main"
echo ""
echo "3. After renaming the directory:"
echo "   cd .."
echo "   mv onecv getmycv"
echo "   cd getmycv"
echo ""
echo "Repository: git@github.com:gilco1973/getmycv.git"
echo ""

# Make the script executable
chmod +x "$0"