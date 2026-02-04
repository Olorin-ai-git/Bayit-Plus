/**
 * React Native SVG Shim for Web
 * Maps react-native-svg components to standard SVG elements
 */

import React from 'react';

// Helper to convert RN style props to web SVG attributes
const convertProps = (props) => {
  const { style, fill, stroke, strokeWidth, ...rest } = props;
  return {
    ...rest,
    fill: fill || (style?.fill),
    stroke: stroke || (style?.stroke),
    strokeWidth: strokeWidth || (style?.strokeWidth),
  };
};

// SVG container
export const Svg = React.forwardRef(({ children, width, height, viewBox, style, ...props }, ref) => (
  <svg
    ref={ref}
    width={width}
    height={height}
    viewBox={viewBox}
    style={style}
    {...props}
  >
    {children}
  </svg>
));
Svg.displayName = 'Svg';

// Basic shapes
export const Circle = React.forwardRef((props, ref) => <circle ref={ref} {...convertProps(props)} />);
Circle.displayName = 'Circle';

export const Rect = React.forwardRef((props, ref) => <rect ref={ref} {...convertProps(props)} />);
Rect.displayName = 'Rect';

export const Path = React.forwardRef((props, ref) => <path ref={ref} {...convertProps(props)} />);
Path.displayName = 'Path';

export const Line = React.forwardRef((props, ref) => <line ref={ref} {...convertProps(props)} />);
Line.displayName = 'Line';

export const Polyline = React.forwardRef((props, ref) => <polyline ref={ref} {...convertProps(props)} />);
Polyline.displayName = 'Polyline';

export const Polygon = React.forwardRef((props, ref) => <polygon ref={ref} {...convertProps(props)} />);
Polygon.displayName = 'Polygon';

export const Ellipse = React.forwardRef((props, ref) => <ellipse ref={ref} {...convertProps(props)} />);
Ellipse.displayName = 'Ellipse';

// Text elements
export const Text = React.forwardRef((props, ref) => <text ref={ref} {...convertProps(props)} />);
Text.displayName = 'Text';

export const TSpan = React.forwardRef((props, ref) => <tspan ref={ref} {...convertProps(props)} />);
TSpan.displayName = 'TSpan';

export const TextPath = React.forwardRef((props, ref) => <textPath ref={ref} {...convertProps(props)} />);
TextPath.displayName = 'TextPath';

// Grouping and structure
export const G = React.forwardRef((props, ref) => <g ref={ref} {...convertProps(props)} />);
G.displayName = 'G';

export const Defs = React.forwardRef((props, ref) => <defs ref={ref} {...props} />);
Defs.displayName = 'Defs';

export const Symbol = React.forwardRef((props, ref) => <symbol ref={ref} {...props} />);
Symbol.displayName = 'Symbol';

export const Use = React.forwardRef((props, ref) => <use ref={ref} {...props} />);
Use.displayName = 'Use';

export const ClipPath = React.forwardRef((props, ref) => <clipPath ref={ref} {...props} />);
ClipPath.displayName = 'ClipPath';

export const Mask = React.forwardRef((props, ref) => <mask ref={ref} {...props} />);
Mask.displayName = 'Mask';

// Gradients
export const LinearGradient = React.forwardRef((props, ref) => <linearGradient ref={ref} {...props} />);
LinearGradient.displayName = 'LinearGradient';

export const RadialGradient = React.forwardRef((props, ref) => <radialGradient ref={ref} {...props} />);
RadialGradient.displayName = 'RadialGradient';

export const Stop = React.forwardRef((props, ref) => <stop ref={ref} {...props} />);
Stop.displayName = 'Stop';

// Filters
export const Filter = React.forwardRef((props, ref) => <filter ref={ref} {...props} />);
Filter.displayName = 'Filter';

export const FeGaussianBlur = React.forwardRef((props, ref) => <feGaussianBlur ref={ref} {...props} />);
FeGaussianBlur.displayName = 'FeGaussianBlur';

// Image
export const Image = React.forwardRef((props, ref) => <image ref={ref} {...props} />);
Image.displayName = 'Image';

// Pattern
export const Pattern = React.forwardRef((props, ref) => <pattern ref={ref} {...props} />);
Pattern.displayName = 'Pattern';

// Marker
export const Marker = React.forwardRef((props, ref) => <marker ref={ref} {...props} />);
Marker.displayName = 'Marker';

// ForeignObject
export const ForeignObject = React.forwardRef((props, ref) => <foreignObject ref={ref} {...props} />);
ForeignObject.displayName = 'ForeignObject';

// Default export
export default Svg;
