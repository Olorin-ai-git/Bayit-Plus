/**
 * RTL Helper Utilities
 * Common patterns for RTL layout transformations
 * Use these utilities to ensure consistent RTL handling across components
 */

/**
 * Reverse array in RTL mode
 * Useful for: filter pills, tabs, breadcrumbs, horizontal lists
 *
 * @example
 * // Filter buttons - reverses order in RTL
 * {rtlArray(filterOptions, isRTL).map((option) => (
 *   <GlassCategoryPill key={option.id} label={option.name} />
 * ))}
 */
export const rtlArray = <T>(arr: T[], isRTL: boolean): T[] => {
  return isRTL ? arr : [...arr].reverse();
};

/**
 * Get conditional margin/padding for icons/badges
 * Useful for: avatar margins, icon spacing, badge positioning
 *
 * @example
 * // Icon with proper spacing in RTL
 * <View style={[styles.icon, rtlSpacing(isRTL, spacing.lg)]}>
 *   <Icon />
 * </View>
 */
export const rtlSpacing = (
  isRTL: boolean,
  spacing: number
): { marginLeft?: number; marginRight?: number } => {
  return isRTL ? { marginLeft: spacing } : { marginRight: spacing };
};

/**
 * Get conditional positioning for absolutely positioned elements
 * Useful for: badges, overlays, floating buttons, absolutely positioned indicators
 *
 * @example
 * // Badge positioned in correct corner
 * <View style={[styles.badge, rtlPosition(isRTL, 8)]}>
 *   <Text>NEW</Text>
 * </View>
 */
export const rtlPosition = (
  isRTL: boolean,
  offset: number
): { left?: number; right?: number } => {
  return isRTL ? { left: offset } : { right: offset };
};

/**
 * Get conditional flex direction for rows
 * Useful for: header layouts, row containers, navigation items
 *
 * @example
 * // Row that reverses in RTL
 * <View style={[styles.row, { flexDirection: rtlFlexDirection(isRTL) }]}>
 *   <Icon />
 *   <Text>Item</Text>
 * </View>
 */
export const rtlFlexDirection = (isRTL: boolean): 'row' | 'row-reverse' => {
  return isRTL ? 'row-reverse' : 'row';
};

/**
 * Get conditional text alignment
 * Useful for: titles, descriptions, body text
 *
 * @example
 * // Text that aligns properly in RTL
 * <Text style={[styles.text, { textAlign: rtlTextAlign(isRTL) }]}>
 *   Content goes here
 * </Text>
 */
export const rtlTextAlign = (isRTL: boolean): 'left' | 'right' | 'center' => {
  // Center is always center
  // Only flip between left and right
  return isRTL ? 'right' : 'left';
};

/**
 * Get conditional margins for elements that need different spacing on each side
 * Useful for: elements with left/right specific padding
 *
 * @example
 * // Container that indents from the correct side
 * <View style={[styles.container, rtlMargin(isRTL, { left: 16, right: 0 })]}>
 *   Content
 * </View>
 */
export const rtlMargin = (
  isRTL: boolean,
  margins: { left?: number; right?: number }
): { marginLeft?: number; marginRight?: number } => {
  if (!isRTL) {
    return { marginLeft: margins.left, marginRight: margins.right };
  }
  // Swap left and right in RTL
  return { marginLeft: margins.right, marginRight: margins.left };
};

/**
 * Get conditional padding for elements
 * Useful for: container padding that differs on left/right
 *
 * @example
 * // Padding that adjusts for RTL
 * <View style={[styles.container, rtlPadding(isRTL, { left: 16, right: 8 })]}>
 *   Content
 * </View>
 */
export const rtlPadding = (
  isRTL: boolean,
  paddings: { left?: number; right?: number }
): { paddingLeft?: number; paddingRight?: number } => {
  if (!isRTL) {
    return { paddingLeft: paddings.left, paddingRight: paddings.right };
  }
  // Swap left and right in RTL
  return { paddingLeft: paddings.right, paddingRight: paddings.left };
};

/**
 * Combine multiple RTL conditionals into a single object
 * Useful for: complex components with multiple RTL-affected properties
 *
 * @example
 * // Apply multiple RTL changes at once
 * const headerStyles = rtlCompose(isRTL, {
 *   flexDirection: true, // Will be row-reverse in RTL
 *   textAlign: true,     // Will be right in RTL
 *   marginLeft: 16,      // Will become marginRight in RTL
 * });
 */
export const rtlCompose = (
  isRTL: boolean,
  options: {
    flexDirection?: boolean;
    textAlign?: boolean;
    marginLeft?: number;
    marginRight?: number;
    paddingLeft?: number;
    paddingRight?: number;
  }
): any => {
  const result: any = {};

  if (options.flexDirection) {
    result.flexDirection = rtlFlexDirection(isRTL);
  }

  if (options.textAlign) {
    result.textAlign = rtlTextAlign(isRTL);
  }

  if (options.marginLeft || options.marginRight) {
    const margins = rtlMargin(isRTL, {
      left: options.marginLeft,
      right: options.marginRight,
    });
    Object.assign(result, margins);
  }

  if (options.paddingLeft || options.paddingRight) {
    const paddings = rtlPadding(isRTL, {
      left: options.paddingLeft,
      right: options.paddingRight,
    });
    Object.assign(result, paddings);
  }

  return result;
};

export default {
  rtlArray,
  rtlSpacing,
  rtlPosition,
  rtlFlexDirection,
  rtlTextAlign,
  rtlMargin,
  rtlPadding,
  rtlCompose,
};
