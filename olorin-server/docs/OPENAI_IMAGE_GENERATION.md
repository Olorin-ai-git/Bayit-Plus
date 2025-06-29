 # Generating the System Architecture Diagram via OpenAI Images API

 This document provides step-by-step instructions for using the OpenAI Images API (DALL·E) or the `openai` CLI/Python library to generate a high-quality PNG of the system architecture diagram from a text prompt.

 ## Prerequisites

 1. **OpenAI API key**  
    Obtain your key from the OpenAI dashboard and set it in your environment:

    ```bash
    export OPENAI_API_KEY="your_api_key_here"
    ```

 2. **Install dependencies**  
    - **Option A: `openai` CLI**  
      ```bash
      pip install openai
      ```
    - **Option B: Python SDK** (if not already installed with the CLI):
      ```bash
      pip install openai
      ```

 3. **Command-line utilities**  
    Ensure you have `jq` (for JSON parsing) and the `base64` utility available. On macOS:

    ```bash
    brew install jq
    ```

 ## Step-by-Step Guide

 Below are two approaches: using the `openai` CLI to generate and decode a base64-encoded image, and using a Python script.

 ### 1. Craft a Descriptive Prompt

 Create a clear prompt that describes the desired diagram. For example:

 > "A clean, professional system architecture diagram for a fraud detection platform. It should show User Activity flowing into Domain Agents (Network Agent, Location Agent, Logs Agent, Device Agent, Risk Agent), then into a Fraud Investigation node (LLM), with a conditional Tools node for function-calling, and arrows looping back to Fraud Investigation. Use simple boxes and arrows, monochromatic style, labeled nodes: Domain Agents, Fraud Investigation, Tools."

 Save this prompt in a shell variable (or a file) for reuse. For example:

 ```bash
 PROMPT="A clean, professional system architecture diagram for a fraud detection platform. It should show User Activity flowing into Domain Agents (Network Agent, Location Agent, Logs Agent, Device Agent, Risk Agent), then into a Fraud Investigation node (LLM), with a conditional Tools node for function-calling, and arrows looping back to Fraud Investigation. Use simple boxes and arrows, monochromatic style, labeled nodes: Domain Agents, Fraud Investigation, Tools."
 ```

 ### 2. Generate the Image via the OpenAI CLI

 Use the `openai` CLI to request an image and get a base64-encoded result:

 ```bash
 openai images.generate \
   --prompt "$PROMPT" \
   --n 1 \
   --size 1024x1024 \
   --response_format b64_json \
   > architecture.b64.json
```

 This command writes a JSON file with the base64-encoded image data.

 ### 3. Decode and Save as PNG

 Extract and decode the image data into the official diagram file:

 ```bash
 jq -r '.data[0].b64_json' architecture.b64.json \
   | base64 --decode > docs/Architecture.png
```

 ### 4. Review and Iterate

 Open `docs/Architecture.png` in your favorite image viewer. Update the prompt as needed to refine labels, layout, or style, and repeat the steps above until satisfied.

 ## Alternative: Python Script

 The following Python snippet accomplishes the same end-to-end flow in one script:

 ```python
 import os
 import base64
 import openai

 # 1. Configure API key
 openai.api_key = os.getenv("OPENAI_API_KEY")

 # 2. Define the prompt
 prompt = (
     "A clean, professional system architecture diagram for a fraud detection platform. "
     "It should show User Activity flowing into Domain Agents (Network, Location, Logs, Device, Risk), "
     "then into a Fraud Investigation (LLM) node, with a conditional Tools node for function-calling, "
     "and arrows looping back to Fraud Investigation. Use simple boxes and arrows, monochromatic style."
 )

 # 3. Generate the image (base64-encoded)
 response = openai.Image.create(
     prompt=prompt,
     n=1,
     size="1024x1024",
     response_format="b64_json"
 )

 # 4. Decode and save
 image_data = base64.b64decode(response["data"][0]["b64_json"])
 with open("docs/Architecture.png", "wb") as f:
     f.write(image_data)
```

 Run this script (e.g. `python generate_architecture_via_openai.py`) to update `docs/Architecture.png`.

 ---

 ## Prompt Engineering Guidelines

 To generate a detailed, professional-quality system architecture diagram, include the following specifications in your text prompt:

 ### 1. Layout & Data Flow
 - **Orientation**: Horizontal left-to-right flow.
 - **Grouping**: Place **Domain Agents** in a row (Network, Location, Logs, Device, Risk).
 - **Main Node**: Center **Fraud Investigation** (LLM) node after Domain Agents.
 - **Conditional Node**: Position **Tools** node (function-calling) above or below Fraud Investigation.
 - **Arrows**: Use solid arrows to show data flow:
   - User Activity → Domain Agents → Fraud Investigation → Decision Engine.
   - Conditional arrow (dashed or colored) from Fraud Investigation → Tools → Fraud Investigation.

 ### 2. Node Styling (Colors & Shapes)
 - **Domain Agents**: Rectangular boxes, fill `#4A90E2`, white text.
 - **Fraud Investigation**: Rectangular box, fill `#50E3C2`, white text, bold border.
 - **Tools**: Rectangular box with rounded corners, fill `#F5A623`, black text.
 - **User Activity**: Oval or circle, fill `#7B8D93`, black text.
 - **Decision Engine** (optional): Diamond shape, fill `#D0021B`, white text.

 ### 3. Typography
 - **Font Family**: Use a clean sans-serif (e.g., Arial, Helvetica, Roboto).
 - **Font Size**: Node title 14pt bold; labels 12pt regular.
 - **Text Color**: High contrast (white on dark fills; black on light fills).

 ### 4. Color Palette Reference

 | Element             | Color Example | Hex Code |
 |---------------------|---------------|----------|
 | Domain Agents       | ![#4A90E2](https://via.placeholder.com/15/4A90E2/000000?text=+) | `#4A90E2` |
 | Fraud Investigation | ![#50E3C2](https://via.placeholder.com/15/50E3C2/000000?text=+) | `#50E3C2` |
 | Tools               | ![#F5A623](https://via.placeholder.com/15/F5A623/000000?text=+) | `#F5A623` |
 | User Activity       | ![#7B8D93](https://via.placeholder.com/15/7B8D93/000000?text=+) | `#7B8D93` |
 | Decision Engine     | ![#D0021B](https://via.placeholder.com/15/D0021B/000000?text=+) | `#D0021B` |
 | Arrows              | ![#555555](https://via.placeholder.com/15/555555/000000?text=+) | `#555555` |
 | Background          | ![#FFFFFF](https://via.placeholder.com/15/FFFFFF/000000?text=+) | `#FFFFFF` |

 ### 5. Sample Prompt Template

 Here is a fully annotated prompt that you can customize:

 > "Create a high-resolution system architecture diagram PNG with the following specifications:
 > - **Layout**: horizontal, left-to-right flow.
 > - **User Activity**: circle labeled 'User Activity' (fill #7B8D93, black text).
 > - **Domain Agents**: five rectangular boxes in a row labeled 'Network Agent', 'Location Agent', 'Logs Agent', 'Device Agent', 'Risk Agent' (fill #4A90E2, white text).
 > - **Fraud Investigation (LLM)**: central rectangular box with bold border (fill #50E3C2, white text, font 14pt Arial Bold).
 > - **Tools**: rounded rectangle above Fraud Investigation (fill #F5A623, black text).
 > - **Decision Engine**: optional diamond shape after Fraud Investigation (fill #D0021B, white text).
 > - **Arrows**: solid dark gray (#555555) arrows showing data flow, dashed arrow for function-call branch.
 > - **Typography**: Arial or Helvetica, node titles 14pt bold, labels 12pt regular.
 > - **Background**: white (#FFFFFF).
 > - **Style**: clean, minimal, professional. Use consistent spacing and alignment."

 > End-to-end generation should yield a crisp, legible diagram reflecting the system architecture for the fraud detection platform.

 After adjusting for your needs, set this prompt in `PROMPT` and rerun the CLI or Python script as described above.

 ---