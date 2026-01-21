/**
 * Lucide React Shims for React Native (tvOS)
 *
 * These shims provide emoji-based icons to replace lucide-react icons.
 * This allows web components that use lucide-react to work on tvOS.
 */

import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface IconProps {
  size?: number;
  color?: string;
  style?: any;
}

// Icon component factory
const createIcon = (emoji: string): React.FC<IconProps> => {
  return ({ size = 24, color = '#ffffff', style }) => (
    <Text style={[{ fontSize: size, color }, style]}>{emoji}</Text>
  );
};

// Shim icons used in web Header.tsx
export const Search = createIcon('🔍');
export const Menu = createIcon('☰');
export const X = createIcon('✕');
export const Shield = createIcon('🛡️');

// Additional common icons that might be used
export const Home = createIcon('🏠');
export const Tv = createIcon('📺');
export const Film = createIcon('🎬');
export const Radio = createIcon('📻');
export const Mic = createIcon('🎙️');
export const Star = createIcon('⭐');
export const User = createIcon('👤');
export const Settings = createIcon('⚙️');
export const Play = createIcon('▶️');
export const Pause = createIcon('⏸️');
export const ChevronLeft = createIcon('◀');
export const ChevronRight = createIcon('▶');
export const ChevronUp = createIcon('▲');
export const ChevronDown = createIcon('▼');
export const Heart = createIcon('❤️');
export const Clock = createIcon('🕐');
export const Calendar = createIcon('📅');
export const Volume2 = createIcon('🔊');
export const VolumeX = createIcon('🔇');
export const Maximize = createIcon('⛶');
export const Minimize = createIcon('⊟');
export const SkipForward = createIcon('⏭️');
export const SkipBack = createIcon('⏮️');
export const Loader = createIcon('⏳');
export const Check = createIcon('✓');
export const AlertCircle = createIcon('⚠️');
export const Info = createIcon('ℹ️');
export const MessageCircle = createIcon('💬');
export const Send = createIcon('➤');
export const Trash = createIcon('🗑️');
export const Edit = createIcon('✏️');
export const Plus = createIcon('+');
export const Minus = createIcon('-');
export const Globe = createIcon('🌐');
export const Sun = createIcon('☀️');
export const Moon = createIcon('🌙');
export const Download = createIcon('⬇️');
export const Upload = createIcon('⬆️');
export const Share = createIcon('↗️');
export const Copy = createIcon('📋');
export const ExternalLink = createIcon('🔗');
export const Bookmark = createIcon('🔖');
export const List = createIcon('☰');
export const Grid = createIcon('⊞');
export const Filter = createIcon('⏔');
export const SortAsc = createIcon('↑');
export const SortDesc = createIcon('↓');
export const Refresh = createIcon('↻');
export const Eye = createIcon('👁️');
export const EyeOff = createIcon('🙈');
export const Lock = createIcon('🔒');
export const Unlock = createIcon('🔓');
export const Bell = createIcon('🔔');
export const BellOff = createIcon('🔕');
export const Mail = createIcon('📧');
export const Phone = createIcon('📞');
export const MapPin = createIcon('📍');
export const Zap = createIcon('⚡');
export const Award = createIcon('🏆');
export const Gift = createIcon('🎁');
export const Sparkles = createIcon('✨');
export const Coffee = createIcon('☕');
export const Book = createIcon('📖');
export const Headphones = createIcon('🎧');
export const Camera = createIcon('📷');
export const Image = createIcon('🖼️');
export const Video = createIcon('🎥');
export const Music = createIcon('🎵');
export const Folder = createIcon('📁');
export const File = createIcon('📄');
export const Archive = createIcon('📦');
export const Tag = createIcon('🏷️');
export const Hash = createIcon('#');
export const AtSign = createIcon('@');

export default {
  Search,
  Menu,
  X,
  Shield,
  Home,
  Tv,
  Film,
  Radio,
  Mic,
  Star,
  User,
  Settings,
  Play,
  Pause,
};
