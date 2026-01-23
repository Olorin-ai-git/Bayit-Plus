/**
 * ResizeHandles - Interactive resize handles for widget container
 *
 * Provides 8 resize handles (4 edges + 4 corners) for resizing the widget.
 * Only visible on web platform (not on TV).
 */

import React from 'react';
import { platformClass } from '@/utils/platformClass';

interface ResizeHandlesProps {
  onResizeStart: (e: React.MouseEvent, direction: string) => void;
}

export function ResizeHandles({ onResizeStart }: ResizeHandlesProps) {
  const handleClass = 'absolute bg-transparent';

  return (
    <>
      {/* North edge handle */}
      <div
        className={platformClass(
          `${handleClass} top-0 left-2 right-2 h-1.5 cursor-ns-resize`,
          `${handleClass} top-0 left-2 right-2 h-1.5`
        )}
        onMouseDown={(e) => onResizeStart(e, 'n')}
      />

      {/* South edge handle */}
      <div
        className={platformClass(
          `${handleClass} bottom-0 left-2 right-2 h-1.5 cursor-ns-resize`,
          `${handleClass} bottom-0 left-2 right-2 h-1.5`
        )}
        onMouseDown={(e) => onResizeStart(e, 's')}
      />

      {/* East edge handle */}
      <div
        className={platformClass(
          `${handleClass} top-2 right-0 bottom-2 w-1.5 cursor-ew-resize`,
          `${handleClass} top-2 right-0 bottom-2 w-1.5`
        )}
        onMouseDown={(e) => onResizeStart(e, 'e')}
      />

      {/* West edge handle */}
      <div
        className={platformClass(
          `${handleClass} top-2 left-0 bottom-2 w-1.5 cursor-ew-resize`,
          `${handleClass} top-2 left-0 bottom-2 w-1.5`
        )}
        onMouseDown={(e) => onResizeStart(e, 'w')}
      />

      {/* Northeast corner handle */}
      <div
        className={platformClass(
          `${handleClass} top-0 right-0 w-3 h-3 cursor-ne-resize`,
          `${handleClass} top-0 right-0 w-3 h-3`
        )}
        onMouseDown={(e) => onResizeStart(e, 'ne')}
      />

      {/* Northwest corner handle */}
      <div
        className={platformClass(
          `${handleClass} top-0 left-0 w-3 h-3 cursor-nw-resize`,
          `${handleClass} top-0 left-0 w-3 h-3`
        )}
        onMouseDown={(e) => onResizeStart(e, 'nw')}
      />

      {/* Southeast corner handle */}
      <div
        className={platformClass(
          `${handleClass} bottom-0 right-0 w-3 h-3 cursor-se-resize`,
          `${handleClass} bottom-0 right-0 w-3 h-3`
        )}
        onMouseDown={(e) => onResizeStart(e, 'se')}
      />

      {/* Southwest corner handle */}
      <div
        className={platformClass(
          `${handleClass} bottom-0 left-0 w-3 h-3 cursor-sw-resize`,
          `${handleClass} bottom-0 left-0 w-3 h-3`
        )}
        onMouseDown={(e) => onResizeStart(e, 'sw')}
      />
    </>
  );
}
