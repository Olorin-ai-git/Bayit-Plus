# Interactive Visualization Components System

A comprehensive, modular system for generating interactive HTML/JavaScript/CSS visualization components for investigation data analysis. This system provides 7 specialized components that transform investigation data into professional, interactive visualizations.

## Overview

The Interactive Visualization Components System is designed to create rich, interactive visualizations from investigation data using Chart.js for charts, Mermaid.js for diagrams, and custom CSS for styling. Each component is self-contained, responsive, and follows accessibility best practices.

## Components

### 1. LLM Interactions Timeline (`llm_timeline.py`)
**Purpose**: Visualizes LLM interactions over time with token usage and performance metrics.

**Features**:
- Interactive Chart.js timeline showing token usage progression
- Detailed interaction cards with agent and model breakdowns
- Performance metrics visualization (response times, success rates)
- Agent activity analysis and tool usage tracking

**Data Input**: Requires `llm_interactions` list with timestamp, agent info, tokens, tools, and reasoning data.

### 2. Investigation Flow Graph (`flow_graph.py`)
**Purpose**: Shows investigation phase progression and workflow patterns.

**Features**:
- Interactive Mermaid.js flowchart with dynamic phase transitions
- Phase duration analysis and timing metrics
- Flow pattern detection (linear, branching, loops)
- Interactive phase timeline table

**Data Input**: Requires `investigation_phases` list with phase transitions and metadata.

### 3. Tools & Agents Analysis (`tools_analysis.py`)
**Purpose**: Analyzes tool usage patterns and agent performance.

**Features**:
- Interactive bar charts for tool usage distribution
- Agent performance radar charts with efficiency scoring
- Success rate analysis and reliability metrics
- Performance categorization and bottleneck identification

**Data Input**: Requires `tool_executions` and optionally `agent_decisions` lists.

### 4. Risk Analysis Dashboard (`risk_dashboard.py`)
**Purpose**: Comprehensive risk score tracking and threat assessment.

**Features**:
- Dynamic risk progression line charts with confidence mapping
- Risk category radar charts and threshold analysis
- Risk alert system with severity classification
- Historical trend analysis with volatility metrics

**Data Input**: Requires `risk_score_entries` list with scores, factors, and confidence data.

### 5. Investigation Explanations (`explanations.py`)
**Purpose**: Formatted display of AI reasoning chains and decision logic.

**Features**:
- Searchable and filterable explanation cards
- Syntax highlighting for technical content
- Confidence score visualization and categorization
- Interactive expansion for detailed reasoning

**Data Input**: Extracts from `llm_interactions`, `agent_decisions`, and `investigation_phases`.

### 6. Journey Visualization (`journey_visualization.py`)
**Purpose**: Interactive timeline of investigation milestones and progress.

**Features**:
- Interactive progress timeline with milestone markers
- Stage-based progress visualization (initiation, development, completion)
- Journey insights and pattern analysis
- Performance bottleneck identification

**Data Input**: Uses `journey_data` or constructs from `investigation_phases`.

### 7. LangGraph Visualization (`langgraph_visualization.py`)
**Purpose**: Network diagram of LangGraph node execution and state transitions.

**Features**:
- Interactive Mermaid.js network diagrams
- Node performance analysis with execution metrics
- Critical path identification and bottleneck detection
- Execution pattern analysis (parallel, sequential, branching)

**Data Input**: Requires `langgraph_nodes` list with execution and transition data.

## Architecture

### Base Component (`base_component.py`)
All components inherit from `BaseVisualizationComponent`, providing:
- Consistent error handling and data validation
- Theme support (default, dark, high contrast, colorblind-friendly)
- Responsive design utilities and accessibility features
- Performance optimization and debug capabilities

### Component Structure
Each component implements:
```python
class ComponentName(BaseVisualizationComponent):
    def validate_data(self, data) -> bool
    def process_data(self, data) -> Dict[str, Any]
    def generate_html(self, processed_data) -> str
    def generate_javascript(self, processed_data) -> str
    def generate_css(self) -> str
```

## Usage

### Basic Usage
```python
from app.service.reporting.components import LLMTimelineComponent

# Initialize component
component = LLMTimelineComponent()

# Generate visualization
result = component.generate_component({
    'llm_interactions': [
        {
            'timestamp': '2023-01-01T10:00:00Z',
            'agent_name': 'Agent1',
            'model_name': 'gpt-4',
            'tokens_used': {'total_tokens': 150},
            'reasoning_chain': 'Analysis of data...',
            # ... other fields
        }
    ]
})

# Access generated content
html_content = result['html']
css_styles = result['css']
javascript_code = result['javascript']
```

### Using Component Registry
```python
from app.service.reporting.components import get_component, get_all_components

# Get specific component
llm_component = get_component('llm_timeline')

# Get all available components
all_components = get_all_components()
```

### Advanced Configuration
```python
from app.service.reporting.components import ComponentConfig, ComponentTheme

# Custom configuration
config = ComponentConfig(
    theme=ComponentTheme.DARK,
    enable_animations=True,
    chart_height=500,
    max_data_points=500
)

component = LLMTimelineComponent(config=config)
```

## Data Processing Flow

1. **Data Validation**: Components validate input data structure and types
2. **Data Processing**: Raw data is transformed into visualization-ready format
3. **Content Generation**: HTML, CSS, and JavaScript are generated
4. **Error Handling**: Comprehensive error states and fallbacks
5. **Performance Optimization**: Data limiting and efficient rendering

## Integration with Investigation Data Processor

The components integrate seamlessly with the `InvestigationDataProcessor`:

```python
from app.service.reporting.investigation_data_processor import process_investigation_folder
from app.service.reporting.components import get_all_components

# Process investigation data
processed_data = process_investigation_folder('/path/to/investigation')

# Generate all visualizations
components = get_all_components()
visualizations = {}

for component in components:
    result = component.generate_component({
        'llm_interactions': processed_data.llm_interactions,
        'tool_executions': processed_data.tool_executions,
        'agent_decisions': processed_data.agent_decisions,
        'risk_score_entries': processed_data.risk_score_entries,
        'investigation_phases': processed_data.investigation_phases,
        'langgraph_nodes': processed_data.langgraph_nodes,
        'journey_data': processed_data.journey_data
    })
    visualizations[component.component_name] = result
```

## Styling and Themes

### Available Themes
- **Default**: Professional blue/purple gradient theme
- **Dark**: Dark mode with light text and vibrant accents
- **High Contrast**: Black and white for accessibility
- **Colorblind Friendly**: Colors chosen for colorblind accessibility

### Custom Styling
Components generate scoped CSS that can be customized:
```python
component.config.theme = ComponentTheme.DARK
result = component.generate_component(data)
custom_css = result['css'] + "\n/* Custom styles */"
```

## Accessibility Features

- **WCAG 2.1 AA Compliance**: All components follow accessibility guidelines
- **Keyboard Navigation**: Full keyboard support for interactive elements
- **Screen Reader Support**: Proper semantic markup and ARIA labels
- **High Contrast Support**: Theme support for visual accessibility
- **Responsive Design**: Mobile-friendly layouts and touch interactions

## Performance Considerations

- **Data Limiting**: Components automatically limit data points for performance
- **Efficient Rendering**: Optimized chart rendering and DOM manipulation
- **Memory Management**: Proper cleanup and resource management
- **Progressive Loading**: Components handle large datasets gracefully
- **Animation Control**: Animations can be disabled for performance

## Error Handling

Components provide robust error handling:
- **Validation Errors**: Clear error messages for invalid data
- **Missing Data**: Graceful degradation with empty states
- **Processing Errors**: Error components with diagnostic information
- **Runtime Errors**: JavaScript error handling and fallbacks

## Browser Compatibility

- **Modern Browsers**: Full support for Chrome, Firefox, Safari, Edge
- **Chart.js**: Requires modern browser with Canvas support
- **Mermaid.js**: SVG-based diagrams work in all modern browsers
- **CSS Grid**: Uses CSS Grid with fallbacks for older browsers

## Dependencies

### Python Dependencies
- No additional Python dependencies beyond standard library
- Integrates with existing `investigation_data_processor.py`

### JavaScript Libraries (CDN)
- **Chart.js**: For interactive charts and graphs
- **Mermaid.js**: For flowcharts and network diagrams
- Both loaded via CDN in generated HTML

## Development

### Adding New Components
1. Create new component file inheriting from `BaseVisualizationComponent`
2. Implement required methods (`validate_data`, `process_data`, etc.)
3. Add to component registry in `__init__.py`
4. Write comprehensive tests

### Testing Components
```python
# Component testing example
from app.service.reporting.components import LLMTimelineComponent

component = LLMTimelineComponent()
result = component.generate_component(test_data)

assert result['metadata']['status'] == 'success'
assert 'llm_timeline' in result['html']
assert len(result['css']) > 0
```

### Debugging
Components provide debug information:
- Component metadata with processing stats
- Error and warning collections
- Performance metrics and timing data
- Data processing status and validation results

## Best Practices

1. **Data Validation**: Always validate input data structure
2. **Error Handling**: Provide meaningful error messages and fallbacks
3. **Performance**: Limit data points and optimize rendering
4. **Accessibility**: Follow WCAG guidelines and test with screen readers
5. **Responsiveness**: Test on mobile devices and various screen sizes
6. **Browser Testing**: Verify compatibility across target browsers
7. **Security**: Sanitize all user-provided content in HTML output

## Future Enhancements

- **Export Functionality**: PDF and image export capabilities
- **Real-time Updates**: WebSocket integration for live data updates
- **Advanced Interactions**: Drill-down capabilities and data linking
- **Custom Themes**: User-defined color schemes and styling
- **Collaborative Features**: Annotations and sharing capabilities
- **Integration APIs**: REST APIs for component generation

## Support

For issues, feature requests, or contributions:
- Check existing components for implementation patterns
- Follow the base component architecture
- Maintain comprehensive error handling
- Include accessibility considerations
- Write clear documentation and examples
