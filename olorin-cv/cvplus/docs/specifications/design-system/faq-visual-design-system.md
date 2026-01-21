# CVPlus FAQ Page Visual Design System
## "Paper to Powerful" Transformation Narrative

**Author**: Gil Klainert  
**Date**: 2025-08-20  
**Version**: 1.0

---

## 1. Visual Brand Elements

### 1.1 Icon System for FAQ Categories

#### Core FAQ Category Icons
Each category uses consistent iconography with the CVPlus brand colors and interactive states.

```scss
// Icon specifications
.faq-category-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  font-size: 24px;
}

// Interactive states
.faq-category-icon:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
}
```

#### Category Icon Specifications:

**🤖 AI & Technology**
- Background: `bg-gradient-to-br from-blue-500 to-blue-600`
- Icon: Robot emoji or circuit pattern
- Hover: Blue glow effect
- Usage: AI processes, Claude API, technology questions

**🔐 Account & Privacy**
- Background: `bg-gradient-to-br from-green-500 to-emerald-600`  
- Icon: Shield with lock
- Hover: Green pulse effect
- Usage: Account management, privacy, security

**✨ Features & Enhancement**
- Background: `bg-gradient-to-br from-purple-500 to-pink-600`
- Icon: Sparkle/star burst
- Hover: Purple-pink shimmer
- Usage: CV features, enhancements, capabilities

**📄 Formats & Export**
- Background: `bg-gradient-to-br from-orange-500 to-red-600`
- Icon: Document stack with arrow
- Hover: Orange-red gradient shift
- Usage: PDF, DOCX, sharing options

**💳 Billing & Subscription**
- Background: `bg-gradient-to-br from-indigo-500 to-purple-600`
- Icon: Credit card or dollar sign
- Hover: Indigo glow
- Usage: Pricing, payments, subscriptions

**🚀 Getting Started**
- Background: `bg-gradient-to-br from-cyan-500 to-blue-600`
- Icon: Rocket or play button
- Hover: Cyan trail effect
- Usage: Onboarding, first steps, tutorials

### 1.2 CV Transformation Journey Illustrations

#### Before/After Visual Metaphors

```css
.transformation-visual {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(31, 41, 55, 0.8) 0%, rgba(17, 24, 39, 0.9) 100%);
  border-radius: 16px;
  position: relative;
  overflow: hidden;
}

.transformation-visual::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('/patterns/circuit-pattern.svg') no-repeat center;
  opacity: 0.05;
  z-index: 1;
}
```

#### "Paper" State Visual Elements:
- **Color Palette**: Muted grays (`#6B7280`, `#9CA3AF`)
- **Texture**: Paper grain overlay
- **Animation**: Static → subtle fade-in
- **Typography**: Standard sans-serif
- **Visual Metaphor**: Flat document icon

#### "Powerful" State Visual Elements:
- **Color Palette**: Vibrant blues and gradients (`#3B82F6` to `#8B5CF6`)
- **Texture**: Glossy, glass morphism effects
- **Animation**: Dynamic scaling, glow effects
- **Typography**: Bold, gradient text
- **Visual Metaphor**: Multi-layered, interactive document

#### Transformation Arrow Animation:
```css
@keyframes transformArrow {
  0% { transform: translateX(-10px); opacity: 0.5; }
  50% { transform: translateX(5px); opacity: 1; }
  100% { transform: translateX(0); opacity: 0.8; }
}

.transform-arrow {
  animation: transformArrow 2s ease-in-out infinite;
  color: #3B82F6;
  font-size: 2rem;
}
```

### 1.3 AI Process Visual Metaphors

#### Neural Network Animation
Visual representation of AI thinking process during FAQ interactions:

```css
.ai-thinking-visual {
  width: 100px;
  height: 60px;
  position: relative;
  margin: 1rem auto;
}

.neural-node {
  width: 8px;
  height: 8px;
  background: #3B82F6;
  border-radius: 50%;
  position: absolute;
  animation: neuralPulse 1.5s ease-in-out infinite;
}

.neural-connection {
  height: 1px;
  background: linear-gradient(90deg, transparent, #3B82F6, transparent);
  position: absolute;
  animation: dataFlow 2s linear infinite;
}

@keyframes neuralPulse {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.2); }
}

@keyframes dataFlow {
  0% { opacity: 0; transform: scaleX(0); }
  50% { opacity: 1; transform: scaleX(1); }
  100% { opacity: 0; transform: scaleX(0); }
}
```

---

## 2. Storytelling Graphics

### 2.1 Hero Section Visual Narrative

#### Problem → Solution Visual Flow
The FAQ hero section tells the story of user confusion transforming into clarity:

```html
<div class="faq-hero-visual">
  <div class="confusion-state">
    <!-- Scattered question marks, tangled lines -->
    <div class="question-cloud">❓❓❓</div>
    <div class="tangled-lines"></div>
  </div>
  
  <div class="transformation-beam"></div>
  
  <div class="clarity-state">
    <!-- Organized information, clear paths -->
    <div class="organized-info">💡✨📚</div>
    <div class="clear-paths"></div>
  </div>
</div>
```

#### Visual Specifications:
- **Confusion State**: Chaotic arrangement, muted colors, scattered elements
- **Transformation Beam**: Blue gradient beam with particle effects  
- **Clarity State**: Organized grid, bright colors, clear hierarchy

### 2.2 Search Result Success States

#### Visual Feedback System:
```css
.search-success-visual {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(6, 182, 212, 0.1));
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 12px;
  animation: searchSuccess 0.6s ease-out;
}

@keyframes searchSuccess {
  0% { 
    opacity: 0; 
    transform: translateY(10px) scale(0.95);
  }
  100% { 
    opacity: 1; 
    transform: translateY(0) scale(1);
  }
}

.success-checkmark {
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #10B981, #06B6D4);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: checkmarkPop 0.4s ease-out 0.2s both;
}

@keyframes checkmarkPop {
  0% { transform: scale(0); }
  80% { transform: scale(1.1); }
  100% { transform: scale(1); }
}
```

### 2.3 Progressive Information Architecture

#### Visual Hierarchy System:
```css
.faq-hierarchy {
  --level-1: 2.5rem;  /* Category headers */
  --level-2: 1.875rem; /* Section titles */
  --level-3: 1.25rem;  /* Question titles */
  --level-4: 1rem;     /* Answer text */
  
  --spacing-1: 3rem;   /* Category spacing */
  --spacing-2: 2rem;   /* Section spacing */
  --spacing-3: 1.5rem; /* Question spacing */
  --spacing-4: 1rem;   /* Answer spacing */
}

.faq-category-header {
  font-size: var(--level-1);
  font-weight: 800;
  margin-bottom: var(--spacing-1);
  background: linear-gradient(135deg, #3B82F6, #8B5CF6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  position: relative;
}

.faq-category-header::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 0;
  width: 60px;
  height: 3px;
  background: linear-gradient(135deg, #3B82F6, #8B5CF6);
  border-radius: 2px;
}
```

---

## 3. Interactive Visual Elements

### 3.1 Micro-Interactions

#### Accordion Expand/Collapse Animation:
```css
.faq-accordion {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.faq-question {
  position: relative;
  padding: 1.5rem;
  background: rgba(31, 41, 55, 0.6);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.faq-question:hover {
  background: rgba(31, 41, 55, 0.8);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

.faq-question.expanded {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.expand-icon {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.expanded .expand-icon {
  transform: rotate(180deg);
}

.faq-answer {
  max-height: 0;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0;
}

.expanded .faq-answer {
  max-height: 1000px;
  opacity: 1;
  padding: 1.5rem;
}
```

#### Search Input Visual Feedback:
```css
.faq-search-container {
  position: relative;
  max-width: 600px;
  margin: 0 auto;
}

.faq-search-input {
  width: 100%;
  padding: 1rem 3rem 1rem 1rem;
  background: rgba(31, 41, 55, 0.8);
  border: 2px solid rgba(75, 85, 99, 0.5);
  border-radius: 16px;
  color: white;
  font-size: 1.125rem;
  transition: all 0.3s ease;
}

.faq-search-input:focus {
  outline: none;
  border-color: #3B82F6;
  box-shadow: 
    0 0 0 3px rgba(59, 130, 246, 0.1),
    0 8px 25px rgba(59, 130, 246, 0.2);
  transform: translateY(-2px);
}

.search-icon {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6B7280;
  transition: all 0.3s ease;
}

.faq-search-input:focus + .search-icon {
  color: #3B82F6;
  animation: searchPulse 1.5s ease-in-out infinite;
}

@keyframes searchPulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}
```

### 3.2 Loading and Processing States

#### AI Thinking Animation:
```css
.ai-processing-visual {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.ai-brain-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #3B82F6, #8B5CF6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: brainPulse 1.5s ease-in-out infinite;
}

@keyframes brainPulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 1; }
}

.thinking-dots {
  display: flex;
  gap: 4px;
}

.thinking-dot {
  width: 6px;
  height: 6px;
  background: #3B82F6;
  border-radius: 50%;
  animation: thinkingWave 1.2s ease-in-out infinite;
}

.thinking-dot:nth-child(2) { animation-delay: 0.2s; }
.thinking-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes thinkingWave {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.2); }
}
```

### 3.3 Success and Error State Visuals

#### Success State:
```css
.success-message {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(6, 182, 212, 0.1));
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 12px;
  animation: successSlideIn 0.5s ease-out;
}

@keyframes successSlideIn {
  0% { 
    opacity: 0; 
    transform: translateX(-20px);
  }
  100% { 
    opacity: 1; 
    transform: translateX(0);
  }
}

.success-icon {
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #10B981, #06B6D4);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: successBounce 0.6s ease-out;
}

@keyframes successBounce {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
```

#### Error State:
```css
.error-message {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1));
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  animation: errorShake 0.5s ease-out;
}

@keyframes errorShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.error-icon {
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #EF4444, #DC2626);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: errorPulse 1s ease-in-out infinite;
}

@keyframes errorPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

---

## 4. Brand-Consistent Graphics

### 4.1 Enhanced Color Palette

#### Primary Brand Colors (from existing system):
```css
:root {
  /* Existing CVPlus colors */
  --primary: 222.2 47.4% 11.2%;         /* Dark blue */
  --primary-foreground: 210 40% 98%;     /* Light text */
  --secondary: 210 40% 96.1%;            /* Light gray */
  --accent: 210 40% 96.1%;               /* Light accent */
  
  /* FAQ-specific color extensions */
  --faq-blue: #3B82F6;                   /* Primary blue */
  --faq-blue-light: #60A5FA;             /* Light blue */
  --faq-blue-dark: #1E40AF;              /* Dark blue */
  
  --faq-purple: #8B5CF6;                 /* Primary purple */
  --faq-purple-light: #A78BFA;           /* Light purple */
  --faq-purple-dark: #7C3AED;            /* Dark purple */
  
  --faq-green: #10B981;                  /* Success green */
  --faq-green-light: #34D399;            /* Light green */
  --faq-green-dark: #047857;             /* Dark green */
  
  --faq-red: #EF4444;                    /* Error red */
  --faq-orange: #F59E0B;                 /* Warning orange */
  
  /* Gradient definitions */
  --gradient-primary: linear-gradient(135deg, var(--faq-blue), var(--faq-purple));
  --gradient-success: linear-gradient(135deg, var(--faq-green), #06B6D4);
  --gradient-error: linear-gradient(135deg, var(--faq-red), #DC2626);
  --gradient-warning: linear-gradient(135deg, var(--faq-orange), #F97316);
}
```

#### Color Usage Guidelines:

**Primary Actions**: Blue gradient (`--gradient-primary`)
- Search buttons, primary CTAs, featured content

**Success States**: Green gradient (`--gradient-success`)
- Successful searches, helpful answers, positive feedback

**Warning States**: Orange gradient (`--gradient-warning`)
- Important notices, tips, attention-needed content

**Error States**: Red gradient (`--gradient-error`)
- Error messages, failed searches, problem indicators

### 4.2 Typography System Enhancement

#### Font Specifications:
```css
.faq-typography {
  /* Heading fonts */
  --font-display: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  
  /* Font weights */
  --font-weight-light: 300;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --font-weight-extrabold: 800;
  
  /* Font sizes */
  --text-xs: 0.75rem;     /* 12px */
  --text-sm: 0.875rem;    /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.25rem;     /* 20px */
  --text-2xl: 1.5rem;     /* 24px */
  --text-3xl: 1.875rem;   /* 30px */
  --text-4xl: 2.25rem;    /* 36px */
  
  /* Line heights */
  --leading-tight: 1.25;
  --leading-snug: 1.375;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
  --leading-loose: 2;
}

/* FAQ-specific typography classes */
.faq-hero-title {
  font-family: var(--font-display);
  font-size: var(--text-4xl);
  font-weight: var(--font-weight-extrabold);
  line-height: var(--leading-tight);
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 1rem;
}

.faq-category-title {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: var(--font-weight-bold);
  line-height: var(--leading-snug);
  color: #F3F4F6;
  margin-bottom: 1.5rem;
}

.faq-question-text {
  font-family: var(--font-body);
  font-size: var(--text-lg);
  font-weight: var(--font-weight-medium);
  line-height: var(--leading-normal);
  color: #E5E7EB;
}

.faq-answer-text {
  font-family: var(--font-body);
  font-size: var(--text-base);
  font-weight: var(--font-weight-regular);
  line-height: var(--leading-relaxed);
  color: #D1D5DB;
}
```

### 4.3 Layout and Spacing System

#### Grid and Spacing Specifications:
```css
.faq-layout {
  /* Container sizes */
  --container-xs: 20rem;    /* 320px */
  --container-sm: 24rem;    /* 384px */
  --container-md: 28rem;    /* 448px */
  --container-lg: 32rem;    /* 512px */
  --container-xl: 36rem;    /* 576px */
  --container-2xl: 42rem;   /* 672px */
  --container-3xl: 48rem;   /* 768px */
  --container-4xl: 56rem;   /* 896px */
  --container-5xl: 64rem;   /* 1024px */
  --container-6xl: 72rem;   /* 1152px */
  --container-7xl: 80rem;   /* 1280px */
  
  /* Spacing scale */
  --space-px: 1px;
  --space-0: 0;
  --space-1: 0.25rem;    /* 4px */
  --space-2: 0.5rem;     /* 8px */
  --space-3: 0.75rem;    /* 12px */
  --space-4: 1rem;       /* 16px */
  --space-5: 1.25rem;    /* 20px */
  --space-6: 1.5rem;     /* 24px */
  --space-8: 2rem;       /* 32px */
  --space-10: 2.5rem;    /* 40px */
  --space-12: 3rem;      /* 48px */
  --space-16: 4rem;      /* 64px */
  --space-20: 5rem;      /* 80px */
  --space-24: 6rem;      /* 96px */
  --space-32: 8rem;      /* 128px */
}

.faq-container {
  max-width: var(--container-6xl);
  margin: 0 auto;
  padding: 0 var(--space-6);
}

.faq-section {
  padding: var(--space-16) 0;
}

.faq-category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-8);
  margin-bottom: var(--space-16);
}
```

---

## 5. Accessibility-First Visuals

### 5.1 High Contrast Alternatives

#### Color Contrast Specifications:
All text and interactive elements meet WCAG 2.1 AA standards (minimum 4.5:1 ratio for normal text, 3:1 for large text).

```css
/* High contrast mode support */
@media (prefers-contrast: high) {
  :root {
    --faq-blue: #0066CC;
    --faq-purple: #6B46C1;
    --faq-green: #059669;
    --faq-red: #DC2626;
    
    --background: #000000;
    --foreground: #FFFFFF;
    --border: #FFFFFF;
  }
  
  .faq-question {
    border: 2px solid var(--border);
  }
  
  .faq-question:focus {
    outline: 3px solid #0066CC;
    outline-offset: 2px;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 5.2 Focus Indicators

#### Keyboard Navigation Visual System:
```css
.faq-focusable {
  position: relative;
  transition: all 0.2s ease;
}

.faq-focusable:focus {
  outline: none;
  box-shadow: 
    0 0 0 2px #1F2937,
    0 0 0 4px #3B82F6,
    0 0 0 6px rgba(59, 130, 246, 0.3);
  border-radius: 8px;
}

.faq-focusable:focus-visible {
  /* Enhanced focus for keyboard users */
  box-shadow: 
    0 0 0 2px #1F2937,
    0 0 0 4px #3B82F6,
    0 0 0 8px rgba(59, 130, 246, 0.2);
}

/* Skip links for screen readers */
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: #3B82F6;
  color: white;
  padding: 8px;
  text-decoration: none;
  border-radius: 4px;
  z-index: 1000;
  transition: top 0.3s;
}

.skip-link:focus {
  top: 6px;
}
```

### 5.3 Screen Reader Optimizations

#### Semantic HTML and ARIA Labels:
```html
<!-- FAQ Section Structure -->
<section aria-labelledby="faq-heading" class="faq-section">
  <h1 id="faq-heading">Frequently Asked Questions</h1>
  
  <div role="search" aria-label="Search FAQ">
    <label for="faq-search" class="sr-only">Search questions</label>
    <input 
      id="faq-search"
      type="search"
      aria-describedby="search-help"
      placeholder="Search for answers..."
    >
    <div id="search-help" class="sr-only">
      Type your question to find relevant answers
    </div>
  </div>
  
  <div class="faq-categories">
    <h2>Categories</h2>
    <div 
      role="region" 
      aria-label="AI & Technology Questions"
      class="faq-category"
    >
      <h3 id="ai-tech-heading">
        <span class="category-icon" aria-hidden="true">🤖</span>
        AI & Technology
      </h3>
      
      <div class="faq-accordion">
        <button
          aria-expanded="false"
          aria-controls="faq-answer-1"
          id="faq-question-1"
          class="faq-question"
        >
          How does the AI analyze my CV?
          <span class="expand-icon" aria-hidden="true">▼</span>
        </button>
        
        <div
          id="faq-answer-1"
          role="region"
          aria-labelledby="faq-question-1"
          class="faq-answer"
          hidden
        >
          <p>Our AI uses advanced natural language processing...</p>
        </div>
      </div>
    </div>
  </div>
</section>
```

### 5.4 Color-Blind Friendly Palette

#### Alternative Visual Indicators:
```css
/* Use patterns and shapes in addition to color */
.success-indicator {
  background: var(--faq-green);
  position: relative;
}

.success-indicator::before {
  content: '✓';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-weight: bold;
}

.error-indicator {
  background: var(--faq-red);
  position: relative;
}

.error-indicator::before {
  content: '⚠';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-weight: bold;
}

.info-indicator {
  background: var(--faq-blue);
  position: relative;
}

.info-indicator::before {
  content: 'ℹ';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-weight: bold;
}

/* Pattern overlays for additional differentiation */
.pattern-dots {
  background-image: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
  background-size: 10px 10px;
}

.pattern-lines {
  background-image: linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%);
  background-size: 8px 8px;
}

.pattern-grid {
  background-image: 
    linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px);
  background-size: 12px 12px;
}
```

---

## 6. Implementation Guidelines

### 6.1 Component Architecture

#### React Component Structure:
```typescript
// FAQ Visual Components
interface FAQVisualProps {
  variant?: 'hero' | 'category' | 'question' | 'answer';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  state?: 'default' | 'loading' | 'success' | 'error';
  animated?: boolean;
  accessible?: boolean;
}

// FAQ Category Icon Component
interface FAQCategoryIconProps {
  category: 'ai-tech' | 'account' | 'features' | 'formats' | 'billing' | 'getting-started';
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  showLabel?: boolean;
}

// Transformation Visual Component
interface TransformationVisualProps {
  stage?: 'before' | 'during' | 'after';
  animated?: boolean;
  showProgress?: boolean;
}
```

### 6.2 Performance Optimization

#### Lazy Loading and Asset Management:
```typescript
// Lazy load visual components
const FAQHeroVisual = lazy(() => import('./components/visuals/FAQHeroVisual'));
const TransformationAnimation = lazy(() => import('./components/visuals/TransformationAnimation'));

// Optimize image assets
const optimizeImages = {
  illustrations: {
    format: 'webp',
    fallback: 'png',
    sizes: [320, 640, 1024, 1280],
    quality: 85
  },
  icons: {
    format: 'svg',
    optimized: true,
    inline: true
  }
};

// Preload critical visual assets
const preloadAssets = [
  '/images/faq-hero-illustration.webp',
  '/icons/category-icons.svg',
  '/patterns/circuit-pattern.svg'
];
```

### 6.3 Testing and Quality Assurance

#### Visual Testing Checklist:
- [ ] All animations respect `prefers-reduced-motion`
- [ ] Color contrast meets WCAG 2.1 AA standards
- [ ] Focus indicators are clearly visible
- [ ] Interactive elements have appropriate hover/active states
- [ ] Loading states are visually clear and informative
- [ ] Error states provide helpful visual feedback
- [ ] Mobile responsiveness maintained across all breakpoints
- [ ] Dark mode compatibility verified
- [ ] Screen reader compatibility tested
- [ ] Performance impact assessed (Core Web Vitals)

---

## 7. File Delivery Specifications

### 7.1 Asset Organization
```
/src/assets/faq-visuals/
├── icons/
│   ├── categories/
│   │   ├── ai-tech.svg
│   │   ├── account-privacy.svg
│   │   ├── features-enhancement.svg
│   │   ├── formats-export.svg
│   │   ├── billing-subscription.svg
│   │   └── getting-started.svg
│   ├── states/
│   │   ├── success.svg
│   │   ├── error.svg
│   │   ├── loading.svg
│   │   └── warning.svg
│   └── interactions/
│       ├── expand-arrow.svg
│       ├── search-icon.svg
│       └── close-icon.svg
├── illustrations/
│   ├── faq-hero-main.webp
│   ├── transformation-before.webp
│   ├── transformation-after.webp
│   ├── ai-thinking-process.webp
│   └── success-celebration.webp
├── patterns/
│   ├── circuit-pattern.svg
│   ├── neural-network.svg
│   └── data-flow.svg
└── animations/
    ├── transformation.lottie
    ├── ai-processing.lottie
    └── success-checkmark.lottie
```

### 7.2 CSS File Structure
```
/src/styles/faq-visuals/
├── _variables.scss      // Color definitions, spacing, typography
├── _mixins.scss         // Reusable style mixins
├── _animations.scss     // Keyframe animations
├── _components.scss     // Component-specific styles
├── _accessibility.scss  // A11y-specific styles
└── faq-visuals.scss     // Main import file
```

This comprehensive visual design system provides CVPlus with a cohesive, accessible, and engaging FAQ experience that reinforces the "Paper to Powerful" brand narrative while ensuring usability across all user needs and devices.