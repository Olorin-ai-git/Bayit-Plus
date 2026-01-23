/**
 * WidgetHeader - Header bar with controls and drag handle
 *
 * Displays widget title, icon, and control buttons (minimize, refresh, mute, close).
 * Entire header is draggable when widget.is_draggable is true.
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { X, Volume2, VolumeX, GripHorizontal, Minimize2, Maximize2, RefreshCw } from 'lucide-react';
import { platformClass, platformStyle } from '@/utils/platformClass';
import type { Widget } from '@/types/widget';

interface WidgetHeaderProps {
  widget: Widget;
  isMuted: boolean;
  isMinimized: boolean;
  isDragging: boolean;
  isTVBuild: boolean;
  onToggleMute: () => void;
  onMinimize: () => void;
  onRestore: () => void;
  onRefresh: () => void;
  onClose: () => void;
  onDragStart?: (e: React.MouseEvent) => void;
}

export function WidgetHeader({
  widget,
  isMuted,
  isMinimized,
  isDragging,
  isTVBuild,
  onToggleMute,
  onMinimize,
  onRestore,
  onRefresh,
  onClose,
  onDragStart,
}: WidgetHeaderProps) {
  const handleMouseDown = (e: React.MouseEvent) => {
    if (widget.is_draggable && !isMinimized && !isTVBuild && onDragStart) {
      onDragStart(e);
    }
  };

  return (
    <div
      className={platformClass(
        'flex flex-row items-center justify-between px-2 py-1 bg-black/70 backdrop-blur-md border-b border-white/10 min-h-[36px] select-none',
        'flex flex-row items-center justify-between px-2 py-1 bg-black/70 border-b border-white/10 min-h-[36px]'
      )}
      style={platformStyle({
        web: {
          cursor: widget.is_draggable && !isMinimized ? (isDragging ? 'grabbing' : 'grab') : 'default',
        },
      })}
      onMouseDown={handleMouseDown as any}
    >
      {/* Controls Container */}
      <View className="flex flex-row items-center gap-1">
        {/* Minimize/Restore Button */}
        <Pressable
          className={platformClass(
            'w-[26px] h-[26px] rounded-full bg-white/10 justify-center items-center hover:bg-white/20',
            'w-[26px] h-[26px] rounded-full bg-white/10 justify-center items-center'
          )}
          onPress={isMinimized ? onRestore : onMinimize}
        >
          {isMinimized ? (
            <Maximize2 size={14} color="#ffffff" />
          ) : (
            <Minimize2 size={14} color="#ffffff" />
          )}
        </Pressable>

        {/* Refresh Button */}
        <Pressable
          className={platformClass(
            'w-[26px] h-[26px] rounded-full bg-white/10 justify-center items-center hover:bg-white/20',
            'w-[26px] h-[26px] rounded-full bg-white/10 justify-center items-center'
          )}
          onPress={onRefresh}
        >
          <RefreshCw size={14} color="#ffffff" />
        </Pressable>

        {/* Mute Button */}
        <Pressable
          className={platformClass(
            'w-[26px] h-[26px] rounded-full bg-white/10 justify-center items-center hover:bg-white/20',
            'w-[26px] h-[26px] rounded-full bg-white/10 justify-center items-center'
          )}
          onPress={onToggleMute}
        >
          {isMuted ? (
            <VolumeX size={14} color="#ffffff" />
          ) : (
            <Volume2 size={14} color="#ffffff" />
          )}
        </Pressable>

        {/* Close Button */}
        {widget.is_closable && (
          <Pressable
            className={platformClass(
              'w-[26px] h-[26px] rounded-full bg-white/10 justify-center items-center hover:bg-white/20',
              'w-[26px] h-[26px] rounded-full bg-white/10 justify-center items-center'
            )}
            onPress={onClose}
          >
            <X size={14} color="#ffffff" />
          </Pressable>
        )}
      </View>

      {/* Drag Indicator - Center */}
      {widget.is_draggable && !isMinimized && (
        <View
          className="absolute left-1/2 opacity-60"
          style={{ transform: [{ translateX: -8 }] }}
        >
          {isTVBuild ? (
            <Text className="text-white text-sm font-semibold">⬅️ ⬆️ ⬇️ ➡️</Text>
          ) : (
            <GripHorizontal size={16} color="rgba(255,255,255,0.4)" />
          )}
        </View>
      )}

      {/* Title Container */}
      <View className="flex flex-row items-center gap-1 flex-1 max-w-[40%]">
        {widget.icon && <Text className="text-sm">{widget.icon}</Text>}
        <Text className="text-xs font-semibold text-white" numberOfLines={1}>
          {widget.title}
        </Text>
      </View>
    </div>
  );
}
