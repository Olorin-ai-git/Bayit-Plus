# GetMyCV.ai - UI Design Mockup

**Status**: ✅ **IMPLEMENTED** - All UI components are live in production

**Last Updated**: August 2025

**Current Implementation**: Located in `/frontend/src/pages/` and `/frontend/src/components/`

## Landing Page Design

```mermaid
graph TB
    subgraph "Header Section"
        Logo[GetMyCV.ai Logo]
        Nav[Home | Features | Pricing | Login]
    end
    
    subgraph "Hero Section"
        Title[Transform Your CV in One Click]
        Subtitle[AI-Powered Professional CV Creator with Podcast Generation]
        
        subgraph "Upload Area"
            DragDrop[Drag & Drop Your CV Here<br/>PDF, DOC, DOCX, CSV]
            OR[--- OR ---]
            URLInput[Enter CV URL: _____________ ]
            UploadBtn[Start Processing →]
        end
    end
    
    subgraph "Features Grid"
        F1[🤖 AI Analysis<br/>Smart parsing]
        F2[🎨 Pro Templates<br/>10+ designs]
        F3[🎙️ AI Podcast<br/>Audio summary]
        F4[📄 Multi-format<br/>PDF/DOCX/HTML]
    end
```

## Processing Screen

```mermaid
graph TD
    subgraph "Processing View"
        Progress[Processing Your CV...]
        
        subgraph "Steps Progress"
            S1[✓ File Uploaded]
            S2[⟳ Analyzing Content]
            S3[○ Generating Enhanced CV]
            S4[○ Creating Podcast]
        end
        
        ProgressBar[▓▓▓▓▓▓░░░░ 60%]
        Status[Extracting professional experience...]
    end
```

## Preview & Download Screen

```mermaid
graph LR
    subgraph "Main Preview Area"
        subgraph "CV Preview"
            Preview[<br/>John Doe<br/>Senior Software Engineer<br/><br/>Experience:<br/>• Tech Lead at Google<br/>• Senior Dev at Meta<br/><br/>Skills:<br/>React, Node.js, Python<br/>]
        end
    end
    
    subgraph "Side Panel"
        subgraph "Template Options"
            T1[Modern]
            T2[Classic]
            T3[Creative]
            T4[Executive]
        end
        
        subgraph "Download Options"
            D1[📄 Download PDF]
            D2[📝 Download DOCX]
            D3[🌐 View Online]
        end
        
        subgraph "Podcast Section"
            Player[🎵 ▶️ Play AI Podcast<br/>Duration: 3:45]
        end
    end
```

## Mobile View

```mermaid
graph TD
    subgraph "Mobile Layout"
        Header[☰ GetMyCV.ai]
        
        subgraph "Upload Section"
            MobileUpload[📤 Upload CV]
            MobileURL[🔗 Enter URL]
        end
        
        subgraph "Collapsed Sections"
            Preview[▼ Preview CV]
            Templates[▼ Templates]
            Download[▼ Download]
            Podcast[▼ AI Podcast]
        end
        
        BottomNav[Home | Upload | Profile]
    end
```

## Color Scheme & Typography

```mermaid
graph LR
    subgraph "Brand Colors"
        Primary[#1E40AF - Primary Blue]
        Secondary[#10B981 - Success Green]
        Accent[#F59E0B - Accent Orange]
        Dark[#1F2937 - Text Dark]
        Light[#F9FAFB - Background]
    end
    
    subgraph "Typography"
        Heading[Inter - Headings]
        Body[Inter - Body Text]
        Code[JetBrains Mono - Code]
    end
```

## Interactive Elements

```mermaid
stateDiagram-v2
    [*] --> Default
    
    Default --> Hover: Mouse over
    Hover --> Clicked: Click
    Clicked --> Loading: Process
    Loading --> Success: Complete
    Loading --> Error: Failed
    
    Success --> Default: Reset
    Error --> Default: Retry
    Hover --> Default: Mouse out
```

## Responsive Grid Layout

```mermaid
graph TD
    subgraph "Desktop - 1920px"
        D1[12 Column Grid]
        D2[Main Content: 8 cols]
        D3[Sidebar: 4 cols]
    end
    
    subgraph "Tablet - 768px"
        T1[8 Column Grid]
        T2[Main Content: 8 cols]
        T3[Sidebar: Below Main]
    end
    
    subgraph "Mobile - 375px"
        M1[4 Column Grid]
        M2[Full Width Stack]
        M3[Accordion Layout]
    end
```

## User Journey Map

```mermaid
journey
    title User Journey - CV Creation
    section Upload Phase
      Visit Landing Page: 5: User
      Choose Upload Method: 4: User
      Upload CV File: 3: User
      Wait for Processing: 2: User
    section Processing Phase
      View Progress: 4: User
      See AI Analysis: 5: User
      Preview Generated CV: 5: User
    section Download Phase
      Select Template: 4: User
      Choose Format: 5: User
      Download CV: 5: User
      Play Podcast: 5: User
```

## Component Library

```mermaid
graph TD
    subgraph "Buttons"
        Primary[Primary Button]
        Secondary[Secondary Button]
        Ghost[Ghost Button]
        Icon[Icon Button]
    end
    
    subgraph "Inputs"
        Text[Text Input]
        File[File Upload]
        URL[URL Input]
        Select[Dropdown Select]
    end
    
    subgraph "Cards"
        Template[Template Card]
        Feature[Feature Card]
        Preview[Preview Card]
    end
    
    subgraph "Feedback"
        Progress[Progress Bar]
        Toast[Toast Message]
        Modal[Modal Dialog]
        Tooltip[Tooltip]
    end
```