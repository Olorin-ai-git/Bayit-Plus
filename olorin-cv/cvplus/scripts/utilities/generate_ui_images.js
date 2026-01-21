#!/usr/bin/env node

/**
 * Script to generate PNG images from Mermaid diagrams
 * Requires: npm install -g @mermaid-js/mermaid-cli
 * Usage: node generate_ui_images.js
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Mermaid diagram definitions
const diagrams = {
  'landing-page': `
graph TB
    subgraph "GetMyCV.ai - Transform Your CV in One Click"
        subgraph "Header"
            Logo[GetMyCV.ai 🚀]
            Nav["Home • Features • Pricing • Login"]
        end
        
        subgraph "Hero Section"
            Title["Transform Your CV with AI"]
            Subtitle["Professional CV + AI Podcast in 60 seconds"]
            
            subgraph "Upload Area"
                style Upload fill:#f0f9ff,stroke:#1e40af,stroke-width:2px
                Upload["📤 Drag & Drop Your CV Here<br/>(PDF, DOC, DOCX, CSV)<br/><br/>━━━━━ OR ━━━━━<br/><br/>🔗 Enter CV URL: [_______________]<br/><br/>[Start Processing →]"]
            end
        end
        
        subgraph "Features"
            F1["🤖 AI Analysis"]
            F2["🎨 Pro Templates"]
            F3["🎙️ AI Podcast"]
            F4["📄 Multi-format"]
        end
    end
    
    style Title fill:#1e40af,color:#fff
    style F1 fill:#e0f2fe
    style F2 fill:#e0f2fe
    style F3 fill:#e0f2fe
    style F4 fill:#e0f2fe
`,

  'processing-screen': `
graph TD
    subgraph "Processing Your CV"
        Progress["⏳ Processing Your CV..."]
        
        subgraph "Progress Steps"
            S1["✅ File Uploaded"]
            S2["🔄 Analyzing Content with AI"]
            S3["⏳ Generating Enhanced CV"]
            S4["⏳ Creating AI Podcast"]
        end
        
        Bar["Progress: ████████░░ 75%"]
        Status["🔍 Extracting skills and achievements..."]
        
        style S1 fill:#d1fae5
        style S2 fill:#fef3c7
        style Bar fill:#e0f2fe
    end
`,

  'preview-screen': `
graph LR
    subgraph "CV Preview & Download"
        subgraph "Preview Area"
            CV["📄 John Doe<br/>Senior Software Engineer<br/><br/>📧 john@example.com<br/>📱 +1 234 567 8900<br/><br/>💼 Experience<br/>• Tech Lead @ Google (2020-2023)<br/>• Senior Dev @ Meta (2018-2020)<br/><br/>🛠️ Skills<br/>React, Node.js, Python, AWS"]
        end
        
        subgraph "Controls"
            subgraph "Templates"
                T1["🎨 Modern"]
                T2["📋 Classic"]
                T3["✨ Creative"]
            end
            
            subgraph "Download"
                D1["📥 PDF"]
                D2["📝 DOCX"]
                D3["🌐 HTML"]
            end
            
            Podcast["🎙️ ▶️ Play AI Podcast (3:45)"]
        end
    end
    
    style CV fill:#f9fafb,stroke:#e5e7eb
    style T1 fill:#e0f2fe
    style Podcast fill:#fef3c7
`,

  'user-flow': `
flowchart TD
    Start([User Visits Site]) --> Upload{Choose Method}
    Upload -->|File| FileUpload[Upload CV File]
    Upload -->|URL| URLInput[Enter CV URL]
    
    FileUpload --> Process[AI Processing]
    URLInput --> Process
    
    Process --> Analysis[Anthropic AI Analysis]
    Analysis --> Generate[Generate Enhanced CV]
    Generate --> Podcast[Create AI Podcast]
    
    Podcast --> Preview[Preview Results]
    Preview --> Actions{User Actions}
    
    Actions -->|Download| Download[Select Format & Download]
    Actions -->|Edit| Edit[Choose Different Template]
    Actions -->|Listen| Play[Play AI Podcast]
    
    Edit --> Preview
    
    style Start fill:#e0f2fe
    style Process fill:#fef3c7
    style Analysis fill:#d1fae5
    style Preview fill:#e0e7ff
`,

  'mobile-view': `
graph TD
    subgraph "Mobile View (375px)"
        Header["☰ GetMyCV.ai"]
        
        Upload["📤 Upload Your CV"]
        URL["🔗 Or Enter URL"]
        
        Accordion1["▼ Preview CV"]
        Accordion2["▼ Select Template"]
        Accordion3["▼ Download Options"]
        Accordion4["▼ AI Podcast"]
        
        BottomNav["🏠 Home | 📤 Upload | 👤 Profile"]
        
        style Header fill:#1e40af,color:#fff
        style Upload fill:#e0f2fe
        style BottomNav fill:#f3f4f6
    end
`
};

// Create output directory
const outputDir = path.join(__dirname, 'ui-designs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate PNG files for each diagram
Object.entries(diagrams).forEach(([name, diagram]) => {
  const mmdFile = path.join(outputDir, `${name}.mmd`);
  const pngFile = path.join(outputDir, `${name}.png`);
  
  // Write mermaid file
  fs.writeFileSync(mmdFile, diagram);
  
  try {
    // Generate PNG using mermaid-cli
    console.log(`Generating ${name}.png...`);
    execSync(`npx -y @mermaid-js/mermaid-cli -i "${mmdFile}" -o "${pngFile}" -t dark -b transparent`, {
      stdio: 'inherit'
    });
    
    // Clean up mermaid file
    fs.unlinkSync(mmdFile);
    
    console.log(`✅ Generated ${name}.png`);
  } catch (error) {
    console.error(`❌ Failed to generate ${name}.png:`, error.message);
  }
});

console.log('\n📁 All UI designs have been generated in the ui-designs/ directory');