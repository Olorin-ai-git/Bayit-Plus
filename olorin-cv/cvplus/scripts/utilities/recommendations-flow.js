#!/usr/bin/env node

/**
 * Generate Recommendations Flow Diagram
 */

const fs = require('fs');
const path = require('path');

const diagram = `
graph TB
    subgraph "CV Analysis & Recommendations Flow"
        Upload[CV Upload/URL] --> Parse[Parse CV with Anthropic]
        Parse --> Analysis[AI Analysis]
        
        Analysis --> Recommendations{Generate Recommendations}
        
        Recommendations --> Formats[Format Recommendations]
        Recommendations --> Industries[Industry Versions]
        Recommendations --> Purposes[Purpose-Specific]
        Recommendations --> Keywords[Keyword Optimization]
        Recommendations --> Features[Feature Rankings]
        Recommendations --> Visual[Visual Enhancements]
        
        subgraph "Format Recommendations"
            F1[Traditional<br/>85% Match]
            F2[ATS-Optimized<br/>92% Match]
            F3[Creative<br/>68% Match]
            F4[Executive<br/>78% Match]
        end
        
        subgraph "Industry Specific"
            I1[Technology<br/>Keywords: 45]
            I2[Finance<br/>Keywords: 38]
            I3[Healthcare<br/>Keywords: 42]
            I4[Creative<br/>Keywords: 35]
        end
        
        subgraph "Purpose Versions"
            P1[Job Application<br/>2 pages]
            P2[Board Position<br/>3-4 pages]
            P3[Freelance<br/>1 page]
            P4[Academic<br/>5+ pages]
        end
        
        subgraph "User Selection"
            Select[User Reviews<br/>Recommendations]
            Choose[Select Options]
            Generate[Generate CV]
        end
        
        Formats --> Select
        Industries --> Select
        Purposes --> Select
        Keywords --> Select
        Features --> Select
        Visual --> Select
        
        Select --> Choose
        Choose --> Generate
    end
    
    style Upload fill:#e0f2fe
    style Parse fill:#fef3c7
    style Analysis fill:#d1fae5
    style Recommendations fill:#e0e7ff
    style Generate fill:#10b981,color:#fff
    style F2 fill:#d1fae5
    style F1 fill:#fef3c7
`;

const recommendationUI = `
graph LR
    subgraph "Recommendation Dashboard UI"
        subgraph "Top Section"
            Header[AI-Powered Recommendations]
            TopRecs["🎯 Top 3 Recommendations<br/>1. Use ATS-Optimized Format<br/>2. Include Tech Keywords<br/>3. Add Portfolio Gallery"]
            Strategy["📊 Overall Strategy<br/>Position yourself as a senior tech leader<br/>with proven track record"]
        end
        
        subgraph "Tabbed Content"
            Tabs["Formats • Industries • Purposes • Features"]
            
            subgraph "Active Tab: Formats"
                Card1["Traditional CV<br/>85% Match<br/>✅ Pros ❌ Cons<br/>[Select]"]
                Card2["ATS-Optimized<br/>92% Match ⭐<br/>✅ Pros ❌ Cons<br/>[Select]"]
                Card3["Creative Format<br/>68% Match<br/>✅ Pros ❌ Cons<br/>[Select]"]
            end
        end
        
        subgraph "Visual Preview"
            Colors["Color Schemes<br/>🎨 Professional Blue<br/>🎨 Modern Dark<br/>🎨 Creative Gradient"]
            Fonts["Font Pairings<br/>📝 Inter + Inter<br/>📝 Playfair + Open Sans<br/>📝 Montserrat + Lato"]
        end
        
        subgraph "Keywords Panel"
            Primary["🎯 Primary: Leadership, Architecture, Cloud"]
            ATS["🤖 ATS: Python, AWS, Kubernetes"]
            Industry["🏢 Industry: DevOps, CI/CD, Microservices"]
            Avoid["⚠️ Avoid: Ninja, Rockstar, Guru"]
        end
        
        Actions["[Generate with Recommendations] [Customize Further]"]
    end
    
    Header --> TopRecs
    TopRecs --> Strategy
    Strategy --> Tabs
    Tabs --> Card1
    Tabs --> Card2
    Tabs --> Card3
    Card1 --> Colors
    Card2 --> Colors
    Card3 --> Colors
    Colors --> Fonts
    Fonts --> Primary
    Primary --> ATS
    ATS --> Industry
    Industry --> Avoid
    Avoid --> Actions
    
    style Card2 fill:#d1fae5
    style Actions fill:#10b981,color:#fff
`;

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'ui-designs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate first diagram
const mmdFile1 = path.join(outputDir, 'recommendations-flow.mmd');
fs.writeFileSync(mmdFile1, diagram);

const mmdFile2 = path.join(outputDir, 'recommendations-ui.mmd');
fs.writeFileSync(mmdFile2, recommendationUI);

// Generate PNG using mermaid-cli
const { execSync } = require('child_process');

try {
  console.log('Generating recommendations-flow.png...');
  execSync(`npx -y @mermaid-js/mermaid-cli -i "${mmdFile1}" -o "${path.join(outputDir, 'recommendations-flow.png')}" -t dark -b transparent`, {
    stdio: 'inherit'
  });
  fs.unlinkSync(mmdFile1);
  console.log('✅ Generated recommendations-flow.png');

  console.log('Generating recommendations-ui.png...');
  execSync(`npx -y @mermaid-js/mermaid-cli -i "${mmdFile2}" -o "${path.join(outputDir, 'recommendations-ui.png')}" -t dark -b transparent`, {
    stdio: 'inherit'
  });
  fs.unlinkSync(mmdFile2);
  console.log('✅ Generated recommendations-ui.png');

} catch (error) {
  console.error('Failed to generate diagrams:', error.message);
}

console.log('\n📁 Recommendation flow diagrams have been generated in the ui-designs/ directory');