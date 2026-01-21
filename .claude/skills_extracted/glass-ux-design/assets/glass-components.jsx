import React, { useState, useRef, useCallback, useEffect } from 'react';

// ============================================
// GLASS CARD
// ============================================
export function GlassCard({ children, className = '', hover = true, ...props }) {
  return (
    <div
      className={`
        bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl
        ${hover ? 'hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5 hover:shadow-xl' : ''}
        transition-all duration-300 ease-out
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

// ============================================
// GLASS BUTTON
// ============================================
export function GlassButton({ 
  children, 
  variant = 'default', 
  size = 'md',
  className = '', 
  ...props 
}) {
  const variants = {
    default: 'bg-white/10 hover:bg-white/20 text-white',
    primary: 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30',
    danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30',
    ghost: 'bg-transparent hover:bg-white/10 text-gray-400 hover:text-white',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`
        ${variants[variant]}
        ${sizes[size]}
        backdrop-blur-xl border border-white/10 rounded-xl
        font-medium cursor-pointer
        hover:border-white/20 hover:-translate-y-0.5
        active:scale-95 active:translate-y-0
        transition-all duration-200 ease-out
        focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-slate-950
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}

// ============================================
// GLASS INPUT
// ============================================
export function GlassInput({ 
  className = '', 
  icon: Icon,
  error,
  ...props 
}) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
      )}
      <input
        className={`
          w-full bg-white/5 backdrop-blur-xl 
          border ${error ? 'border-red-500/50' : 'border-white/10'}
          rounded-xl px-4 py-2.5 text-white placeholder-gray-500
          ${Icon ? 'pl-10' : ''}
          hover:bg-white/10 hover:border-white/20
          focus:bg-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20
          focus:outline-none
          transition-all duration-200 ease-out
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}

// ============================================
// GLASS TEXTAREA
// ============================================
export function GlassTextarea({ className = '', error, ...props }) {
  return (
    <div>
      <textarea
        className={`
          w-full bg-white/5 backdrop-blur-xl 
          border ${error ? 'border-red-500/50' : 'border-white/10'}
          rounded-xl px-4 py-3 text-white placeholder-gray-500
          hover:bg-white/10 hover:border-white/20
          focus:bg-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20
          focus:outline-none resize-none
          transition-all duration-200 ease-out
          ${className}
        `}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
}

// ============================================
// GLASS SELECT
// ============================================
export function GlassSelect({ 
  options = [], 
  value, 
  onChange, 
  placeholder = 'Select...',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl
          px-4 py-2.5 text-left
          hover:bg-white/10 hover:border-white/20
          focus:outline-none focus:ring-2 focus:ring-blue-500/50
          transition-all duration-200 ease-out
          flex items-center justify-between
        `}
      >
        <span className={selectedOption ? 'text-white' : 'text-gray-500'}>
          {selectedOption?.label || placeholder}
        </span>
        <svg 
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className={`
          absolute z-50 w-full mt-2
          bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl
          shadow-2xl overflow-hidden
          animate-[fadeIn_0.15s_ease-out]
        `}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`
                w-full px-4 py-2.5 text-left
                ${option.value === value ? 'bg-blue-500/20 text-blue-400' : 'text-white'}
                hover:bg-white/10
                transition-colors duration-150
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// GLASS SIDEBAR
// ============================================
export function GlassSidebar({ 
  items = [], 
  activeItem,
  onItemClick,
  collapsed = false,
  onToggle,
  header,
  footer,
}) {
  return (
    <aside
      className={`
        ${collapsed ? 'w-16' : 'w-64'}
        bg-white/5 backdrop-blur-xl border-r border-white/10
        flex flex-col
        transition-all duration-300 ease-out
      `}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        {!collapsed && header}
        {onToggle && (
          <button
            onClick={onToggle}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = activeItem === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => onItemClick?.(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                ${isActive 
                  ? 'bg-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/10' 
                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
                }
                transition-all duration-200 ease-out
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
              {!collapsed && (
                <span className="truncate transition-opacity duration-200">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      {footer && (
        <div className="p-4 border-t border-white/10">
          {!collapsed && footer}
        </div>
      )}
    </aside>
  );
}

// ============================================
// GLASS MODAL
// ============================================
export function GlassModal({ 
  isOpen, 
  onClose, 
  title,
  children, 
  size = 'md',
  showClose = true,
}) {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]',
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]" />
      
      {/* Modal */}
      <div 
        className={`
          relative ${sizes[size]} w-full
          bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl
          shadow-2xl
          animate-[scaleIn_0.2s_ease-out]
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            {title && <h2 className="text-lg font-semibold text-white">{title}</h2>}
            {showClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================
// GLASS SPLITTER (Draggable)
// ============================================
export function GlassSplitter({ 
  direction = 'vertical',
  onResize,
  minSize = 200,
  maxSize = 600,
  initialSize = 300,
}) {
  const [size, setSize] = useState(initialSize);
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef(0);
  const startSize = useRef(0);

  const handleMouseDown = useCallback((e) => {
    setIsDragging(true);
    startPos.current = direction === 'vertical' ? e.clientX : e.clientY;
    startSize.current = size;
    document.body.style.cursor = direction === 'vertical' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  }, [direction, size]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const currentPos = direction === 'vertical' ? e.clientX : e.clientY;
      const delta = currentPos - startPos.current;
      const newSize = Math.min(maxSize, Math.max(minSize, startSize.current + delta));
      setSize(newSize);
      onResize?.(newSize);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, direction, minSize, maxSize, onResize]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`
        ${direction === 'vertical' ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'}
        bg-white/10 hover:bg-blue-500/50
        ${isDragging ? 'bg-blue-500/50' : ''}
        transition-colors duration-150
        flex-shrink-0
        group
      `}
    >
      <div className={`
        ${direction === 'vertical' ? 'w-4 h-8 -ml-1.5' : 'h-4 w-8 -mt-1.5'}
        absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
        bg-white/20 rounded-full opacity-0 group-hover:opacity-100
        transition-opacity duration-200
      `} />
    </div>
  );
}

// ============================================
// GLASS TABS
// ============================================
export function GlassTabs({ tabs = [], activeTab, onTabChange }) {
  return (
    <div className="flex gap-1 p-1 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            px-4 py-2 rounded-lg font-medium
            ${activeTab === tab.id 
              ? 'bg-white/10 text-white shadow-lg' 
              : 'text-gray-400 hover:text-white hover:bg-white/5'
            }
            transition-all duration-200 ease-out
          `}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ============================================
// GLASS TOGGLE
// ============================================
export function GlassToggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div 
        onClick={() => onChange(!checked)}
        className={`
          relative w-11 h-6 rounded-full
          ${checked ? 'bg-blue-500/30' : 'bg-white/10'}
          border ${checked ? 'border-blue-500/50' : 'border-white/10'}
          transition-all duration-200
        `}
      >
        <div className={`
          absolute top-0.5 ${checked ? 'left-5.5' : 'left-0.5'}
          w-5 h-5 rounded-full
          ${checked ? 'bg-blue-400' : 'bg-gray-400'}
          shadow-lg
          transition-all duration-200
        `} 
        style={{ left: checked ? 'calc(100% - 22px)' : '2px' }}
        />
      </div>
      {label && (
        <span className="text-gray-400 group-hover:text-white transition-colors">
          {label}
        </span>
      )}
    </label>
  );
}

// ============================================
// GLASS BADGE
// ============================================
export function GlassBadge({ children, variant = 'default' }) {
  const variants = {
    default: 'bg-white/10 text-gray-300',
    primary: 'bg-blue-500/20 text-blue-400',
    success: 'bg-green-500/20 text-green-400',
    warning: 'bg-yellow-500/20 text-yellow-400',
    danger: 'bg-red-500/20 text-red-400',
  };

  return (
    <span className={`
      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
      ${variants[variant]}
      backdrop-blur-sm
    `}>
      {children}
    </span>
  );
}

// ============================================
// GLASS TOOLTIP
// ============================================
export function GlassTooltip({ children, content, position = 'top' }) {
  const [show, setShow] = useState(false);
  
  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className={`
          absolute ${positions[position]} z-50
          px-3 py-1.5 text-sm text-white whitespace-nowrap
          bg-slate-800/95 backdrop-blur-xl border border-white/10 rounded-lg
          shadow-xl
          animate-[fadeIn_0.15s_ease-out]
        `}>
          {content}
        </div>
      )}
    </div>
  );
}

// ============================================
// KEYFRAME STYLES (add to your global CSS or use a style tag)
// ============================================
export const glassKeyframes = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-10px); }
    to { opacity: 1; transform: translateX(0); }
  }
  
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
