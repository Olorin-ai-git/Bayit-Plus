# Bayit+ Documentation Portal

Modern documentation portal built with VitePress and Glass UI theme.

## Features

- ✨ **Glass UI Theme** - Glassmorphism design with backdrop blur
- 🔍 **Local Search** - Fast client-side search with FlexSearch
- 🌙 **Dark Mode** - Optimized for dark backgrounds
- 📱 **Responsive** - Mobile, tablet, and desktop support
- 🚀 **Fast** - Built with Vite for instant HMR
- 🎨 **Custom Components** - GlassCard and CodeBlock Vue components

## Quick Start

### Prerequisites

- Node.js 18+
- npm 8+

### Installation

```bash
cd docs-portal
npm install
```

### Development

```bash
npm run dev
# Opens http://localhost:5173
```

The dev server will:
- Watch for changes in `/docs` directory
- Auto-reload on file changes
- Enable hot module replacement

### Build

```bash
npm run build
# Output: .vitepress/dist/
```

### Preview Production Build

```bash
npm run preview
# Opens http://localhost:4173
```

## Project Structure

```
docs-portal/
├── .vitepress/
│   ├── config.ts              # VitePress configuration
│   ├── theme/
│   │   ├── index.ts           # Custom theme entry
│   │   ├── styles/
│   │   │   ├── vars.css       # Design tokens
│   │   │   ├── glass.css      # Glass UI components
│   │   │   └── custom.css     # VitePress overrides
│   │   └── components/
│   │       ├── GlassCard.vue  # Glass card component
│   │       └── CodeBlock.vue  # Code block component
│   └── dist/                  # Build output (gitignored)
├── index.md                   # Homepage
├── package.json
├── firebase.json              # Firebase Hosting config
└── README.md                  # This file
```

## Documentation Source

The portal reads documentation from the `/docs` directory:

```
../docs/
├── guides/                    # User guides
├── api/                       # API documentation
├── architecture/              # Architecture docs
├── technical/                 # Technical references
├── testing/                   # Testing guides
└── deployment/                # Deployment guides
```

**Note**: Documentation files remain in `/docs` - the portal reads them directly. No file duplication needed.

## Configuration

### VitePress Config

Edit `.vitepress/config.ts` to modify:
- Site title and description
- Navigation menu
- Sidebar structure
- Search configuration
- Theme settings

### Glass UI Theme

Customize the Glass UI theme in `.vitepress/theme/styles/`:

- **vars.css** - Design tokens (colors, spacing, typography)
- **glass.css** - Glass component styles
- **custom.css** - VitePress component overrides

## Custom Components

### GlassCard

```markdown
<GlassCard title="Card Title" variant="info">
Content goes here
</GlassCard>
```

**Variants**: `default`, `info`, `success`, `warning`, `error`

### CodeBlock

```markdown
<CodeBlock title="Example Code" language="typescript">
\`\`\`typescript
const example = "Hello World";
\`\`\`
</CodeBlock>
```

## Deployment

### Firebase Hosting

Automatic deployment via GitHub Actions when changes are pushed to `main` or `beta` branches.

**Manual deployment:**

```bash
# Build
npm run build

# Deploy to Firebase
firebase deploy --only hosting:docs-portal
```

### Environment Variables

No environment variables required - all configuration is in `config.ts`.

## CI/CD Pipeline

The `.github/workflows/docs-deploy.yml` workflow:

1. Triggers on changes to `/docs/` or `/docs-portal/`
2. Installs dependencies
3. Builds VitePress site
4. Deploys to Firebase Hosting
5. Posts deployment comment to commit

**Required GitHub Secrets:**
- `FIREBASE_SERVICE_ACCOUNT` - Firebase service account JSON

## Search

Local search is enabled by default using VitePress's built-in search.

**Features:**
- Fuzzy matching (0.2 tolerance)
- Prefix matching
- Title/heading boosting
- Instant results
- No external service required

## Performance

**Target Metrics:**
- Page load: <1 second (P95)
- Search latency: <50ms (P95)
- Lighthouse score: 95+ (Performance, Accessibility, SEO)
- Build time: <10 seconds

## Maintenance

### Updating Dependencies

```bash
cd docs-portal
npm update
npm audit fix
```

### Checking Broken Links

VitePress will warn about broken internal links during build:

```bash
npm run build
# Check console for link warnings
```

### Adding New Documentation

1. Add markdown files to `/docs/` in the appropriate subdirectory
2. Update navigation in `.vitepress/config.ts` if needed
3. Commit and push - auto-deployment will handle the rest

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 5173
lsof -i :5173 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Or use different port
npm run dev -- --port 5174
```

### Build Errors

```bash
# Clean and rebuild
rm -rf node_modules package-lock.json .vitepress/dist .vitepress/cache
npm install
npm run build
```

### Search Not Working

- Ensure files are in markdown format
- Check frontmatter is valid YAML
- Clear VitePress cache: `rm -rf .vitepress/cache`

## Support

- **Documentation Issues**: [GitHub Issues](https://github.com/bayit-plus/issues)
- **Email**: support@bayitplus.com
- **Community**: community.bayitplus.com

## License

MIT License - Copyright © 2026 Bayit+
