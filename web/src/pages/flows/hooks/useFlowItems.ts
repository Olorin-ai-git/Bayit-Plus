/**
 * useFlowItems Hook
 * Manages flow content items with reordering capabilities
 */

import { useState, useCallback, useEffect } from 'react';
import type { FlowItem, ContentItem } from '../types/flows.types';

interface UseFlowItemsOptions {
  initialItems?: FlowItem[];
  maxItems?: number;
  onChange?: (items: FlowItem[]) => void;
}

interface UseFlowItemsReturn {
  items: FlowItem[];
  setItems: React.Dispatch<React.SetStateAction<FlowItem[]>>;
  moveUp: (index: number) => void;
  moveDown: (index: number) => void;
  removeItem: (index: number) => void;
  addItems: (newItems: ContentItem[]) => void;
  clearItems: () => void;
  canMoveUp: (index: number) => boolean;
  canMoveDown: (index: number) => boolean;
  reorderItems: (newOrder: FlowItem[]) => void;
}

export const useFlowItems = ({
  initialItems = [],
  maxItems,
  onChange,
}: UseFlowItemsOptions = {}): UseFlowItemsReturn => {
  const [items, setItems] = useState<FlowItem[]>(initialItems);

  // Sync internal state with prop changes
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // Update order property for all items
  const updateOrder = useCallback((itemsToUpdate: FlowItem[]): FlowItem[] => {
    return itemsToUpdate.map((item, index) => ({
      ...item,
      order: index,
    }));
  }, []);

  // Notify parent of changes
  const notifyChange = useCallback((newItems: FlowItem[]) => {
    if (onChange) {
      onChange(newItems);
    }
  }, [onChange]);

  // Move item up (swap with previous)
  const moveUp = useCallback((index: number) => {
    if (index <= 0) return;

    setItems(prev => {
      const newItems = [...prev];
      [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
      const orderedItems = updateOrder(newItems);
      notifyChange(orderedItems);
      return orderedItems;
    });
  }, [updateOrder, notifyChange]);

  // Move item down (swap with next)
  const moveDown = useCallback((index: number) => {
    setItems(prev => {
      if (index >= prev.length - 1) return prev;

      const newItems = [...prev];
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
      const orderedItems = updateOrder(newItems);
      notifyChange(orderedItems);
      return orderedItems;
    });
  }, [updateOrder, notifyChange]);

  // Remove item at index
  const removeItem = useCallback((index: number) => {
    setItems(prev => {
      const newItems = prev.filter((_, i) => i !== index);
      const orderedItems = updateOrder(newItems);
      notifyChange(orderedItems);
      return orderedItems;
    });
  }, [updateOrder, notifyChange]);

  // Add new content items
  const addItems = useCallback((newItems: ContentItem[]) => {
    setItems(prev => {
      // Check max items limit
      const availableSlots = maxItems ? maxItems - prev.length : Infinity;
      const itemsToAdd = newItems.slice(0, availableSlots);

      // Convert ContentItem to FlowItem
      const flowItems: FlowItem[] = itemsToAdd.map((item, i) => ({
        content_id: item.id,
        content_type: item.type,
        title: item.title,
        thumbnail: item.thumbnail,
        duration_hint: item.duration,
        order: prev.length + i,
      }));

      const allItems = [...prev, ...flowItems];
      const orderedItems = updateOrder(allItems);
      notifyChange(orderedItems);
      return orderedItems;
    });
  }, [maxItems, updateOrder, notifyChange]);

  // Clear all items
  const clearItems = useCallback(() => {
    setItems([]);
    notifyChange([]);
  }, [notifyChange]);

  // Check if item can move up
  const canMoveUp = useCallback((index: number) => {
    return index > 0;
  }, []);

  // Check if item can move down
  const canMoveDown = useCallback((index: number) => {
    return index < items.length - 1;
  }, [items.length]);

  // Reorder items to new order
  const reorderItems = useCallback((newOrder: FlowItem[]) => {
    const orderedItems = updateOrder(newOrder);
    setItems(orderedItems);
    notifyChange(orderedItems);
  }, [updateOrder, notifyChange]);

  return {
    items,
    setItems,
    moveUp,
    moveDown,
    removeItem,
    addItems,
    clearItems,
    canMoveUp,
    canMoveDown,
    reorderItems,
  };
};

export default useFlowItems;
