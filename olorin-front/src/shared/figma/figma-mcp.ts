/**
 * Figma MCP Integration for Olorin Microservices
 * Provides design-to-code automation, token synchronization, and visual consistency
 */

<<<<<<< HEAD
import { EventBusManager } from '../events/eventBus';
=======
import { EventBusManager } from '../events/UnifiedEventBus';
>>>>>>> 001-modify-analyzer-method

export interface FigmaToken {
  id: string;
  name: string;
  type: 'color' | 'typography' | 'spacing' | 'shadow' | 'border-radius';
  value: string | number;
  category: string;
  service?: string;
}

export interface FigmaComponent {
  id: string;
  name: string;
  type: string;
  service: string;
  properties: Record<string, any>;
  styles: Record<string, string>;
  variants?: FigmaComponentVariant[];
}

export interface FigmaComponentVariant {
  id: string;
  name: string;
  properties: Record<string, any>;
}

export interface FigmaFrame {
  id: string;
  name: string;
  service: string;
  width: number;
  height: number;
  children: FigmaNode[];
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  fills?: any[];
  strokes?: any[];
  effects?: any[];
  children?: FigmaNode[];
}

export interface FigmaFileResponse {
  document: FigmaNode;
  components: Record<string, any>;
  styles: Record<string, any>;
}

export interface FigmaConfig {
  accessToken: string;
  fileKey: string;
  nodeIds?: string[];
  depth?: number;
  geometry?: string;
  plugins_data?: string;
  version?: string;
}

/**
 * Figma MCP Client for design system integration
 */
export class FigmaMCPClient {
  private eventBus: EventBusManager;
  private config: FigmaConfig;
  private cache: Map<string, any> = new Map();

  constructor(config: FigmaConfig) {
    this.config = config;
    this.eventBus = EventBusManager.getInstance();
  }

  /**
   * Fetch design tokens from Figma file
   */
  async fetchDesignTokens(): Promise<FigmaToken[]> {
    try {
      const file = await this.fetchFile();
      const tokens = this.extractTokensFromFile(file);

      this.eventBus.emit('design:tokens:updated', {
        tokens: this.tokensToDesignTokens(tokens),
        source: 'figma-mcp'
      });

      return tokens;
    } catch (error) {
      console.error('Failed to fetch design tokens:', error);
      throw error;
    }
  }

  /**
   * Fetch components from Figma file
   */
  async fetchComponents(serviceFilter?: string): Promise<FigmaComponent[]> {
    try {
      const file = await this.fetchFile();
      const components = this.extractComponentsFromFile(file, serviceFilter);

      components.forEach(component => {
        this.eventBus.emit('design:component:generated', { component });
      });

      return components;
    } catch (error) {
      console.error('Failed to fetch components:', error);
      throw error;
    }
  }

  /**
   * Sync design system from Figma
   */
  async syncDesignSystem(): Promise<void> {
    try {
      const [tokens, components] = await Promise.all([
        this.fetchDesignTokens(),
        this.fetchComponents()
      ]);

      await this.validateDesignSystem(tokens, components);

      this.eventBus.emit('design:figma:synced', {
        components: components.map(c => c.id),
        timestamp: new Date()
      });

      console.log('Design system synced successfully');
    } catch (error) {
      console.error('Failed to sync design system:', error);
      throw error;
    }
  }

  /**
   * Generate React component code from Figma component
   */
  async generateReactComponent(componentId: string, service: string): Promise<string> {
    try {
      const component = await this.fetchComponentById(componentId);
      if (!component) {
        throw new Error(`Component ${componentId} not found`);
      }

      const reactCode = this.convertToReactComponent(component, service);
      return reactCode;
    } catch (error) {
      console.error('Failed to generate React component:', error);
      throw error;
    }
  }

  /**
   * Fetch frames for a specific microservice
   */
  async fetchServiceFrames(serviceName: string): Promise<FigmaFrame[]> {
    try {
      const file = await this.fetchFile();
      const frames = this.extractFramesForService(file, serviceName);
      return frames;
    } catch (error) {
      console.error(`Failed to fetch frames for service ${serviceName}:`, error);
      throw error;
    }
  }

  /**
   * Private: Fetch file from Figma API
   */
  private async fetchFile(): Promise<FigmaFileResponse> {
    const cacheKey = `file_${this.config.fileKey}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const url = new URL(`https://api.figma.com/v1/files/${this.config.fileKey}`);

    if (this.config.nodeIds) {
      url.searchParams.set('ids', this.config.nodeIds.join(','));
    }
    if (this.config.depth) {
      url.searchParams.set('depth', this.config.depth.toString());
    }
    if (this.config.geometry) {
      url.searchParams.set('geometry', this.config.geometry);
    }
    if (this.config.version) {
      url.searchParams.set('version', this.config.version);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'X-Figma-Token': this.config.accessToken,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    this.cache.set(cacheKey, data);

    // Cache for 5 minutes
    setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);

    return data;
  }

  /**
   * Private: Extract design tokens from Figma file
   */
  private extractTokensFromFile(file: FigmaFileResponse): FigmaToken[] {
    const tokens: FigmaToken[] = [];

    // Extract color tokens from styles
    Object.entries(file.styles).forEach(([id, style]: [string, any]) => {
      if (style.styleType === 'FILL') {
        tokens.push({
          id,
          name: style.name,
          type: 'color',
          value: this.extractColorValue(style),
          category: this.categorizeToken(style.name),
          service: this.extractServiceFromName(style.name)
        });
      } else if (style.styleType === 'TEXT') {
        tokens.push({
          id,
          name: style.name,
          type: 'typography',
          value: this.extractTypographyValue(style),
          category: this.categorizeToken(style.name),
          service: this.extractServiceFromName(style.name)
        });
      }
    });

    return tokens;
  }

  /**
   * Private: Extract components from Figma file
   */
  private extractComponentsFromFile(file: FigmaFileResponse, serviceFilter?: string): FigmaComponent[] {
    const components: FigmaComponent[] = [];

    Object.entries(file.components).forEach(([id, component]: [string, any]) => {
      const service = this.extractServiceFromName(component.name);

      if (serviceFilter && service !== serviceFilter) {
        return;
      }

      components.push({
        id,
        name: component.name,
        type: component.type,
        service: service || 'core-ui',
        properties: this.extractComponentProperties(component),
        styles: this.extractComponentStyles(component),
        variants: this.extractComponentVariants(component)
      });
    });

    return components;
  }

  /**
   * Private: Extract frames for specific service
   */
  private extractFramesForService(file: FigmaFileResponse, serviceName: string): FigmaFrame[] {
    const frames: FigmaFrame[] = [];

    const traverseNode = (node: FigmaNode) => {
      if (node.type === 'FRAME' && node.name.toLowerCase().includes(serviceName.toLowerCase())) {
        frames.push({
          id: node.id,
          name: node.name,
          service: serviceName,
          width: (node as any).absoluteBoundingBox?.width || 0,
          height: (node as any).absoluteBoundingBox?.height || 0,
          children: node.children || []
        });
      }

      if (node.children) {
        node.children.forEach(traverseNode);
      }
    };

    traverseNode(file.document);
    return frames;
  }

  /**
   * Private: Convert Figma component to React component code
   */
  private convertToReactComponent(component: FigmaComponent, service: string): string {
    const componentName = this.toPascalCase(component.name);
    const propsInterface = this.generatePropsInterface(component.properties);
    const styles = this.convertStylesToTailwind(component.styles);

    return `
import React from 'react';
import { cn } from '@shared/utils';

${propsInterface}

export const ${componentName}: React.FC<${componentName}Props> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        '${styles}',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default ${componentName};
`.trim();
  }

  /**
   * Private: Utility methods
   */
  private extractColorValue(style: any): string {
    // Extract hex color from Figma style
    const fill = style.fills?.[0];
    if (fill?.type === 'SOLID') {
      const { r, g, b } = fill.color;
      return `#${Math.round(r * 255).toString(16).padStart(2, '0')}${Math.round(g * 255).toString(16).padStart(2, '0')}${Math.round(b * 255).toString(16).padStart(2, '0')}`;
    }
    return '#000000';
  }

  private extractTypographyValue(style: any): any {
    return {
      fontFamily: style.fontFamily,
      fontSize: `${style.fontSize}px`,
      fontWeight: style.fontWeight,
      lineHeight: style.lineHeightPercent ? `${style.lineHeightPercent}%` : 'normal',
      letterSpacing: style.letterSpacing ? `${style.letterSpacing}px` : 'normal'
    };
  }

  private categorizeToken(name: string): string {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('primary') || nameLower.includes('secondary')) return 'brand';
    if (nameLower.includes('text') || nameLower.includes('content')) return 'semantic';
    if (nameLower.includes('surface') || nameLower.includes('background')) return 'surface';
    if (nameLower.includes('border') || nameLower.includes('outline')) return 'border';
    return 'other';
  }

  private extractServiceFromName(name: string): string | undefined {
    const services = [
<<<<<<< HEAD
      'autonomous-investigation',
=======
      'structured-investigation',
>>>>>>> 001-modify-analyzer-method
      'manual-investigation',
      'agent-analytics',
      'rag-intelligence',
      'visualization',
      'reporting',
      'core-ui',
      'design-system'
    ];

    const nameLower = name.toLowerCase();
    return services.find(service => nameLower.includes(service.replace('-', '')));
  }

  private extractComponentProperties(component: any): Record<string, any> {
    return {
      width: component.absoluteBoundingBox?.width,
      height: component.absoluteBoundingBox?.height,
      constraints: component.constraints,
      visible: component.visible !== false
    };
  }

  private extractComponentStyles(component: any): Record<string, string> {
    const styles: Record<string, string> = {};

    if (component.fills) {
      styles.backgroundColor = this.extractColorValue({ fills: component.fills });
    }

    if (component.strokes) {
      styles.borderColor = this.extractColorValue({ fills: component.strokes });
      styles.borderWidth = `${component.strokeWeight || 1}px`;
    }

    if (component.cornerRadius) {
      styles.borderRadius = `${component.cornerRadius}px`;
    }

    return styles;
  }

  private extractComponentVariants(component: any): FigmaComponentVariant[] {
    // Extract component variants if available
    return component.componentPropertyDefinitions ?
      Object.entries(component.componentPropertyDefinitions).map(([key, def]: [string, any]) => ({
        id: key,
        name: def.name || key,
        properties: def.variantOptions || {}
      })) : [];
  }

  private toPascalCase(str: string): string {
    return str.replace(/[\s-_]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
              .replace(/^(.)/, (_, char) => char.toUpperCase());
  }

  private generatePropsInterface(properties: Record<string, any>): string {
    return `
interface ${this.toPascalCase(properties.name || 'Component')}Props {
  className?: string;
  children?: React.ReactNode;
}`.trim();
  }

  private convertStylesToTailwind(styles: Record<string, string>): string {
    const tailwindClasses: string[] = [];

    Object.entries(styles).forEach(([property, value]) => {
      switch (property) {
        case 'backgroundColor':
          // Convert to Tailwind background color class
          if (value.startsWith('#')) {
            tailwindClasses.push(`bg-[${value}]`);
          }
          break;
        case 'borderColor':
          if (value.startsWith('#')) {
            tailwindClasses.push(`border-[${value}]`);
          }
          break;
        case 'borderWidth':
          tailwindClasses.push(`border-[${value}]`);
          break;
        case 'borderRadius':
          tailwindClasses.push(`rounded-[${value}]`);
          break;
      }
    });

    return tailwindClasses.join(' ');
  }

  private tokensToDesignTokens(tokens: FigmaToken[]): Record<string, any> {
    const designTokens: Record<string, any> = {
      colors: {},
      typography: {},
      spacing: {},
      shadows: {}
    };

    tokens.forEach(token => {
      switch (token.type) {
        case 'color':
          designTokens.colors[token.name] = token.value;
          break;
        case 'typography':
          designTokens.typography[token.name] = token.value;
          break;
        case 'spacing':
          designTokens.spacing[token.name] = token.value;
          break;
        case 'shadow':
          designTokens.shadows[token.name] = token.value;
          break;
      }
    });

    return designTokens;
  }

  private async fetchComponentById(componentId: string): Promise<FigmaComponent | null> {
    const components = await this.fetchComponents();
    return components.find(c => c.id === componentId) || null;
  }

  private async validateDesignSystem(tokens: FigmaToken[], components: FigmaComponent[]): Promise<void> {
    const errors: any[] = [];

    // Validate tokens
    tokens.forEach(token => {
      if (!token.name || !token.value) {
        errors.push({
          type: 'token',
          message: `Invalid token: ${token.id}`,
          token
        });
      }
    });

    // Validate components
    components.forEach(component => {
      if (!component.name || !component.service) {
        errors.push({
          type: 'component',
          message: `Invalid component: ${component.id}`,
          component
        });
      }
    });

    if (errors.length > 0) {
      errors.forEach(error => {
        this.eventBus.emit('design:validation:failed', {
          componentId: error.token?.id || error.component?.id || 'unknown',
          errors: [{ field: error.type, message: error.message, severity: 'error' as const }]
        });
      });

      throw new Error(`Design system validation failed with ${errors.length} errors`);
    }
  }
}

/**
 * Factory function to create Figma MCP client
 */
export function createFigmaMCPClient(config: FigmaConfig): FigmaMCPClient {
  return new FigmaMCPClient(config);
}

/**
 * Service-specific Figma integration helpers
 */
export const FigmaServiceHelpers = {
  /**
   * Sync design tokens for a specific microservice
   */
  async syncServiceTokens(service: string, client: FigmaMCPClient): Promise<FigmaToken[]> {
    const allTokens = await client.fetchDesignTokens();
    return allTokens.filter(token => token.service === service || !token.service);
  },

  /**
   * Generate components for a specific microservice
   */
  async generateServiceComponents(service: string, client: FigmaMCPClient): Promise<string[]> {
    const components = await client.fetchComponents(service);
    const generatedCode: string[] = [];

    for (const component of components) {
      try {
        const code = await client.generateReactComponent(component.id, service);
        generatedCode.push(code);
      } catch (error) {
        console.error(`Failed to generate component ${component.name}:`, error);
      }
    }

    return generatedCode;
  },

  /**
   * Get service-specific design frames
   */
  async getServiceFrames(service: string, client: FigmaMCPClient): Promise<FigmaFrame[]> {
    return await client.fetchServiceFrames(service);
  }
};

export default FigmaMCPClient;