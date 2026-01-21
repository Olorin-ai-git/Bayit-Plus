#!/usr/bin/env node

/**
 * Generate Feature Selection UI Diagram
 */

const fs = require('fs');
const path = require('path');

const diagram = `
graph TB
    subgraph "Feature Selection Interface"
        subgraph "AI Features"
            F1["🎙️ AI Podcast<br/>2-15 min audio summary<br/>[Configure ⚙️]"]
            F2["🤖 AI Chat Assistant<br/>Answer questions about CV<br/>[Configure ⚙️]"]
        end
        
        subgraph "Multimedia"
            F3["🎥 Video Introduction<br/>30-second pitch<br/>[Upload Video]"]
            F4["📈 Interactive Timeline<br/>Career journey<br/>[Style: Horizontal ▼]"]
            F5["🖼️ Portfolio Gallery<br/>Project showcase<br/>[Add Projects +]"]
            F6["📊 Skills Visualization<br/>Dynamic charts<br/>[Chart: Radar ▼]"]
        end
        
        subgraph "Communication"
            F7["📇 Smart Contact Card<br/>One-click contact<br/>[Enable Calendar ✓]"]
            F8["📅 Meeting Scheduler<br/>Book appointments<br/>[Provider: Calendly ▼]"]
            F9["💬 Direct Messaging<br/>Contact form<br/>[Enable ✓]"]
        end
        
        subgraph "Analytics"
            F10["📊 View Analytics<br/>Track engagement<br/>[Privacy: Anonymous ▼]"]
            F11["🗺️ Geographic Stats<br/>Viewer locations<br/>[Enable ✓]"]
        end
        
        subgraph "Enhancements"
            F12["📱 QR Code<br/>Link to profile<br/>[Style: Branded ▼]"]
            F13["⭐ Testimonials<br/>Recommendations<br/>[Add Testimonials +]"]
        end
    end
    
    subgraph "Preview Panel"
        Preview["Live CV Preview with Selected Features"]
    end
    
    subgraph "Actions"
        Generate["Generate Interactive CV →"]
    end
    
    F1 --> Preview
    F2 --> Preview
    F3 --> Preview
    F4 --> Preview
    F5 --> Preview
    F6 --> Preview
    F7 --> Preview
    F8 --> Preview
    F9 --> Preview
    F10 --> Preview
    F11 --> Preview
    F12 --> Preview
    F13 --> Preview
    
    Preview --> Generate
    
    style F1 fill:#e0f2fe
    style F2 fill:#e0f2fe
    style F3 fill:#fef3c7
    style F4 fill:#fef3c7
    style F5 fill:#fef3c7
    style F6 fill:#fef3c7
    style F7 fill:#e0e7ff
    style F8 fill:#e0e7ff
    style F9 fill:#e0e7ff
    style F10 fill:#fee2e2
    style F11 fill:#fee2e2
    style F12 fill:#d1fae5
    style F13 fill:#d1fae5
    style Generate fill:#10b981,color:#fff
`;

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'ui-designs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write mermaid file
const mmdFile = path.join(outputDir, 'feature-selection.mmd');
fs.writeFileSync(mmdFile, diagram);

// Generate PNG using mermaid-cli
const { execSync } = require('child_process');
try {
  console.log('Generating feature-selection.png...');
  execSync(`npx -y @mermaid-js/mermaid-cli -i "${mmdFile}" -o "${path.join(outputDir, 'feature-selection.png')}" -t dark -b transparent`, {
    stdio: 'inherit'
  });
  
  // Clean up mermaid file
  fs.unlinkSync(mmdFile);
  
  console.log('✅ Generated feature-selection.png');
} catch (error) {
  console.error('❌ Failed to generate feature-selection.png:', error.message);
}

// Also create a configuration example diagram
const configDiagram = `
graph LR
    subgraph "AI Podcast Configuration"
        Duration["Duration<br/>⚪ 2-5 min<br/>🔘 5-10 min<br/>⚪ 10-15 min"]
        Voice["Voice Style<br/>⚪ Professional<br/>🔘 Conversational<br/>⚪ Energetic"]
        Topics["Include Sections<br/>☑️ Experience<br/>☑️ Skills<br/>☐ Education<br/>☑️ Achievements"]
        Language["Language<br/>[English ▼]"]
    end
    
    subgraph "Preview"
        AudioPlayer["🎙️ Sample Audio<br/>▶️ ━━━━━━━━ 3:45"]
    end
    
    Duration --> AudioPlayer
    Voice --> AudioPlayer
    Topics --> AudioPlayer
    Language --> AudioPlayer
    
    style Duration fill:#f3f4f6
    style Voice fill:#f3f4f6
    style Topics fill:#f3f4f6
    style Language fill:#f3f4f6
    style AudioPlayer fill:#e0f2fe
`;

const configMmdFile = path.join(outputDir, 'feature-config.mmd');
fs.writeFileSync(configMmdFile, configDiagram);

try {
  console.log('Generating feature-config.png...');
  execSync(`npx -y @mermaid-js/mermaid-cli -i "${configMmdFile}" -o "${path.join(outputDir, 'feature-config.png')}" -t dark -b transparent`, {
    stdio: 'inherit'
  });
  
  fs.unlinkSync(configMmdFile);
  console.log('✅ Generated feature-config.png');
} catch (error) {
  console.error('❌ Failed to generate feature-config.png:', error.message);
}

console.log('\n📁 Feature selection UI designs have been generated in the ui-designs/ directory');