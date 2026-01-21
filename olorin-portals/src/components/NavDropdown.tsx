/**
 * Navigation Dropdown Component
 * Click-based dropdown with animations, adapted from Israeli Radio Manager
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

interface DropdownItem {
  name: string;
  href: string;
  description?: string;
}

interface NavDropdownProps {
  label: string;
  items: DropdownItem[];
}

const NavDropdown: React.FC<NavDropdownProps> = ({ label, items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;
  const isDropdownActive = items.some((item) => location.pathname === item.href);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close dropdown on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-1.5 text-sm font-medium
          px-3 py-2 rounded-lg
          transition-all duration-200
          ${isDropdownActive || isOpen
            ? 'text-corporate-accentPrimary bg-corporate-accentPrimary/10'
            : 'text-corporate-textSecondary hover:text-corporate-accentPrimary hover:bg-white/5'
          }
          ${isOpen ? 'ring-2 ring-corporate-accentPrimary/30' : ''}
        `}
      >
        {label}
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="
            absolute top-full left-0 mt-2 w-56 p-1.5
            rounded-xl
            bg-corporate-bgSecondary/98 backdrop-blur-xl
            border border-white/10
            shadow-[0_20px_50px_rgba(0,0,0,0.5)]
            z-50
            animate-dropdown-in
          "
        >
          {items.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setIsOpen(false)}
              className={`
                block px-3 py-2.5 rounded-lg
                transition-all duration-150
                ${isActive(item.href)
                  ? 'text-corporate-accentPrimary bg-corporate-accentPrimary/20'
                  : 'text-corporate-textSecondary hover:text-corporate-textPrimary hover:bg-white/10'
                }
              `}
            >
              <div className="text-sm font-medium">{item.name}</div>
              {item.description && (
                <div className="text-xs text-corporate-textMuted mt-0.5">{item.description}</div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default NavDropdown;
