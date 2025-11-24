import { Options } from 'vis-network';
import { visualizationConfig as config } from '../config/environment';

/**
 * Get default network visualization options with Olorin corporate styling
 */
export function getNetworkOptions(): Options {
  return {
    nodes: {
      borderWidth: 2,
      borderWidthSelected: 4,
      font: {
        color: '#F9FAFB',
        size: 14,
        face: 'Arial',
        background: 'rgba(0, 0, 0, 0.7)'
      },
      shadow: {
        enabled: true,
        color: 'rgba(0, 0, 0, 0.5)',
        size: 10,
        x: 3,
        y: 3
      }
    },
    edges: {
      color: {
        color: '#4B5563',
        highlight: '#FF6600',
        hover: '#06B6D4'
      },
      width: 2,
      smooth: {
        enabled: true,
        type: 'continuous',
        roundness: 0.5
      },
      arrows: {
        to: {
          enabled: true,
          scaleFactor: 0.5
        }
      },
      shadow: {
        enabled: false
      },
      font: {
        color: '#D1D5DB',
        size: 12,
        align: 'middle'
      }
    },
    physics: {
      enabled: true,
      solver: 'forceAtlas2Based',
      forceAtlas2Based: {
        gravitationalConstant: -50,
        centralGravity: 0.01,
        springLength: 100,
        springConstant: 0.08,
        damping: 0.4,
        avoidOverlap: 0.5
      },
      stabilization: {
        enabled: true,
        iterations: 1000,
        updateInterval: 25,
        fit: true
      }
    },
    interaction: {
      hover: true,
      tooltipDelay: 200,
      zoomView: true,
      dragView: true,
      navigationButtons: false,
      keyboard: true
    },
    layout: {
      improvedLayout: true,
      clusterThreshold: 150
    }
  };
}

/**
 * Get hierarchical layout options
 */
export function getHierarchicalLayoutOptions(): Partial<Options> {
  return {
    layout: {
      hierarchical: {
        enabled: true,
        direction: 'UD',
        sortMethod: 'directed',
        levelSeparation: 150,
        nodeSpacing: 100,
        treeSpacing: 200,
        blockShifting: true,
        edgeMinimization: true,
        parentCentralization: true
      }
    },
    physics: {
      enabled: false
    }
  };
}

/**
 * Get circular layout options
 */
export function getCircularLayoutOptions(): Partial<Options> {
  return {
    layout: {
      randomSeed: 42,
      improvedLayout: true
    },
    physics: {
      enabled: true,
      solver: 'repulsion',
      repulsion: {
        centralGravity: 0.1,
        springLength: 200,
        springConstant: 0.01,
        nodeDistance: 200,
        damping: 0.09
      }
    }
  };
}

/**
 * Get force-directed layout options (default)
 */
export function getForceDirectedLayoutOptions(): Partial<Options> {
  return {
    layout: {
      randomSeed: 42,
      improvedLayout: true,
      clusterThreshold: config.network.maxNodes
    },
    physics: {
      enabled: true,
      solver: 'forceAtlas2Based',
      forceAtlas2Based: {
        gravitationalConstant: -50,
        centralGravity: 0.01,
        springLength: 100,
        springConstant: 0.08,
        damping: 0.4,
        avoidOverlap: 0.5
      },
      stabilization: {
        enabled: true,
        iterations: 1000,
        updateInterval: 25
      }
    }
  };
}

/**
 * Get performance-optimized options for large networks (1000+ nodes)
 */
export function getPerformanceOptimizedOptions(): Partial<Options> {
  return {
    nodes: {
      scaling: {
        label: {
          enabled: false
        }
      }
    },
    edges: {
      smooth: {
        enabled: false
      }
    },
    physics: {
      enabled: true,
      solver: 'barnesHut',
      barnesHut: {
        gravitationalConstant: -80000,
        centralGravity: 0.3,
        springLength: 95,
        springConstant: 0.04,
        damping: 0.09,
        avoidOverlap: 0
      },
      stabilization: {
        enabled: true,
        iterations: 100,
        updateInterval: 10
      }
    },
    interaction: {
      hideEdgesOnDrag: true,
      hideEdgesOnZoom: true
    }
  };
}

/**
 * Apply clustering for large networks
 */
export function applyClustering(network: any, nodeCount: number) {
  if (nodeCount < config.network.clusterThreshold) {
    return;
  }

  const clusterOptions = {
    joinCondition: (nodeOptions: any) => {
      return nodeOptions.riskScore && nodeOptions.riskScore < 50;
    },
    clusterNodeProperties: {
      id: 'cluster:low-risk',
      borderWidth: 3,
      shape: 'database',
      color: '#06B6D4',
      label: 'Low Risk Entities',
      font: { size: 16 }
    }
  };

  network.cluster(clusterOptions);
}

export type LayoutType = 'force-directed' | 'hierarchical' | 'circular' | 'performance';

/**
 * Get layout options by type
 */
export function getLayoutByType(type: LayoutType): Partial<Options> {
  switch (type) {
    case 'hierarchical':
      return getHierarchicalLayoutOptions();
    case 'circular':
      return getCircularLayoutOptions();
    case 'performance':
      return getPerformanceOptimizedOptions();
    case 'force-directed':
    default:
      return getForceDirectedLayoutOptions();
  }
}
