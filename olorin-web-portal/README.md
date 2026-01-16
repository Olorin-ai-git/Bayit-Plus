# Olorin.AI - Agentic AI Solutions Platform

A modern, multi-subdomain web portal showcasing Olorin.AI's cutting-edge Generative AI agentic solutions across multiple industries: Fraud Detection, Media Streaming, and Radio Management.

## 🚀 About Olorin.AI

Olorin.AI provides next-generation AI-powered solutions with specialized intelligent agents. Our platform leverages advanced Generative AI technology to deliver industry-specific solutions with unprecedented accuracy and automation.

### Solutions

- **Fraud Detection**: AI-powered fraud prevention with 6 specialized agents
- **Media Streaming**: Intelligent content delivery and optimization
- **Radio Management**: Automated programming and listener analytics
- **Custom AI**: Tailored agentic AI solutions for your business

## 🏗 Architecture

This project uses a **monorepo architecture with npm workspaces** managing four independent portals:

- **olorin.ai** (portal-main) - Parent marketing site
- **fraud.olorin.ai** (portal-fraud) - Fraud detection subdomain
- **streaming.olorin.ai** (portal-streaming) - Media streaming subdomain
- **radio.olorin.ai** (portal-radio) - Radio management subdomain

Each portal shares a common wizard-themed component library while maintaining independent deployment capabilities.

## 🛠 Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with glassmorphic wizard theme
- **Icons**: Lucide React
- **Routing**: React Router DOM v6
- **i18n**: react-i18next (5 languages supported)
- **Build Tool**: Create React App
- **Package Manager**: npm workspaces
- **Hosting**: Firebase Hosting (multi-site)

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd olorin-web-portal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   This installs dependencies for all workspaces (shared + 4 portals)

3. **Configure environment variables**
   ```bash
   # Copy example files for each portal
   cp packages/portal-main/.env.example packages/portal-main/.env
   cp packages/portal-fraud/.env.example packages/portal-fraud/.env
   cp packages/portal-streaming/.env.example packages/portal-streaming/.env
   cp packages/portal-radio/.env.example packages/portal-radio/.env
   ```
   Edit each `.env` file with your configuration values.

4. **Start a development server**
   ```bash
   # Main portal (port 3000)
   npm run dev:main

   # Or run specific portal
   npm run dev:fraud      # port 3001
   npm run dev:streaming  # port 3002
   npm run dev:radio      # port 3003
   ```

## 🚀 Available Scripts

### Development
- `npm run dev:main` - Main portal (port 3000)
- `npm run dev:fraud` - Fraud portal (port 3001)
- `npm run dev:streaming` - Streaming portal (port 3002)
- `npm run dev:radio` - Radio portal (port 3003)

### Build
- `npm run build:all` - Build all portals
- `npm run build:main` - Build main portal only
- `npm run build:fraud` - Build fraud portal only
- `npm run build:streaming` - Build streaming portal only
- `npm run build:radio` - Build radio portal only

### Testing
- `npm test` - Run tests for all portals

## 📱 Portals & Features

### Main Portal (olorin.ai)
- Hero section with wizard mascot branding
- Solutions grid showcasing all 4 services
- About section with mission and vision
- Knowledge Hub with resources
- Contact page with EmailJS integration

### Fraud Portal (fraud.olorin.ai)
- AI-powered fraud prevention showcase
- 4 specialized agent cards (Location, Network, Authentication, Behavioral)
- 4-step intelligent workflow explanation
- Success story with metrics (80% fraud reduction)
- Industry solutions for financial, e-commerce, insurance, healthcare

### Streaming Portal (streaming.olorin.ai)
- AI-driven media streaming features
- Content optimization and viewer engagement
- 4-step workflow (Collection → Analysis → Optimization → Delivery)
- Performance metrics (50% buffer reduction, 30% engagement increase)
- Use cases for live events, on-demand, education, enterprise

### Radio Portal (radio.olorin.ai)
- Intelligent radio management features
- Automation, analytics, and smart ad insertion
- 4-step workflow (Ingestion → Scheduling → Broadcasting → Analytics)
- Success metrics (50% listener retention increase)
- Solutions for commercial, music, talk, and community stations

## 🎨 Wizard Theme Design System

### Glassmorphic Dark Purple/Black Theme

**Core Colors:**
```css
--wizard-bg-deep: #0f0027           /* Near-black purple base */
--wizard-bg-primary: #1a0033        /* Deep purple primary */
--wizard-bg-secondary: #2d1b4e      /* Dark purple secondary */
--wizard-bg-card: rgba(45, 27, 78, 0.6)  /* Semi-transparent card */
```

**Neon Accents:**
```css
--wizard-accent-purple: #a855f7     /* Neon purple primary */
--wizard-accent-pink: #d946ef       /* Neon pink */
--wizard-accent-cyan: #22d3ee       /* Cyan highlight */
```

### Shared Components Library

All portals use components from `@olorin/shared`:

**UI Components:**
- `GlassCard` - Glassmorphic card with blur effect
- `GlassButton` - Wizard-themed button with glow
- `GlowingIcon` - Icon wrapper with neon glow effect
- `HeroSection` - Customizable hero template

**Branding:**
- `WizardLogo` - Domain-specific wizard logo (variants: main, fraud, streaming, radio)
- Domain-aware Header and Footer components

**Key Features:**
- Backdrop blur effects
- Neon glow animations
- Circuit/tech line patterns
- Responsive design (mobile-first)
- Dark mode optimized

## 🔧 Configuration

### Tailwind CSS
The project uses a custom Tailwind configuration with:
- Custom color palette
- Extended animations
- Typography and forms plugins

### Environment Setup
For production deployment, ensure:
- Node.js 14+ installed
- Build optimization enabled
- Proper domain configuration

## 📈 Performance Features

- **Fast Loading**: Optimized images and lazy loading
- **SEO Friendly**: Proper meta tags and semantic HTML
- **Responsive**: Mobile-first design approach
- **Accessible**: WCAG compliance considerations

## 🔐 Security Features

- Form validation and sanitization
- Secure contact form handling
- No sensitive data exposure
- HTTPS-ready configuration

## 🌍 Internationalization

All portals support 5 languages:
- English (en) - Primary
- French (fr)
- Spanish (es)
- Italian (it)
- Chinese (zh)

Translations are managed via `react-i18next` with separate locale files for each portal.

## 🚀 Deployment

### Quick Start

```bash
# Build all portals
npm run build:all

# Deploy to Firebase (requires Firebase CLI)
firebase deploy --only hosting
```

### Detailed Instructions

For complete deployment documentation including:
- Firebase Hosting multi-site setup
- DNS configuration
- CI/CD automation with GitHub Actions
- Environment variable configuration
- Production checklist

**See [DEPLOYMENT.md](./DEPLOYMENT.md) for full guide.**

### Firebase Hosting Sites

- `olorin-main` → olorin.ai
- `olorin-fraud` → fraud.olorin.ai
- `olorin-streaming` → streaming.olorin.ai
- `olorin-radio` → radio.olorin.ai

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is proprietary software for Olorin.ai. All rights reserved.

## 📞 Support

For technical support or questions:
- Email: contact@olorin.ai
- Phone: +1 (555) 123-4567
- Address: 123 AI Innovation Drive, San Francisco, CA 94105

---

**Built with ❤️ by the Olorin.ai team**