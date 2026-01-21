/**
 * ReportTOC Component - Table of contents sidebar for report navigation
 */

import React, { useState, useEffect, useRef } from 'react';
import { TOCItem } from '../utils/tocGenerator';

interface ReportTOCProps {
  items: TOCItem[];
  className?: string;
}

export const ReportTOC: React.FC<ReportTOCProps> = ({ items, className = '' }) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Scroll spy: highlight current section based on scroll position
  useEffect(() => {
    if (items.length === 0) return;

    const headings = items.flatMap((item) => {
      const result = [item];
      if (item.children) {
        result.push(...item.children);
      }
      return result;
    });

    const observerOptions = {
      rootMargin: '-20% 0% -60% 0%',
      threshold: 0,
    };

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id);
        }
      });
    }, observerOptions);

    headings.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) {
        observerRef.current?.observe(element);
      }
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [items]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // Account for sticky header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  const renderTOCItem = (item: TOCItem, level: number = 0) => {
    const isActive = activeId === item.id;
    const paddingLeft = level * 12;

    return (
      <div key={item.id}>
      <a
        href={`#${item.id}`}
        onClick={(e) => {
          e.preventDefault();
          scrollToSection(item.id);
        }}
        className={`block px-1.5 py-1 rounded-lg text-sm transition-colors ${
          isActive
            ? 'text-purple-400 bg-purple-500/20 font-medium'
            : 'text-gray-400 hover:text-purple-400 hover:bg-gray-800'
        }`}
        style={{ paddingLeft: `${paddingLeft}px` }}
        aria-label={`Navigate to ${item.text}`}
      >
        {item.text}
      </a>
        {item.children && item.children.length > 0 && (
          <div className="ml-2 border-l border-gray-700">
            {item.children.map((child) => renderTOCItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={`sticky top-[72px] max-h-[calc(100vh-200px)] overflow-auto p-2 border-l border-gray-800 ${className}`}
    >
      <div className="text-xs font-semibold text-gray-400 mb-2 px-2">Contents</div>
      <nav className="space-y-1">
        {items.map((item) => renderTOCItem(item))}
      </nav>
    </div>
  );
};

