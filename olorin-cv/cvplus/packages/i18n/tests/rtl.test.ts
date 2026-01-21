/**
 * @fileoverview Tests for RTL Support
  */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RTLService } from '../rtl';

describe('RTLService', () => {
  let service: RTLService;
  
  beforeEach(() => {
    service = RTLService.getInstance();
  });
  
  describe('RTL Detection', () => {
    it('should detect RTL languages', () => {
      expect(service.isRTLLanguage('ar')).toBe(true);
      expect(service.isRTLLanguage('he')).toBe(true);
      expect(service.isRTLLanguage('en')).toBe(false);
      expect(service.isRTLLanguage('es')).toBe(false);
    });
    
    it('should get correct text direction', () => {
      expect(service.getDirection('ar')).toBe('rtl');
      expect(service.getDirection('en')).toBe('ltr');
    });
  });
  
  describe('CSS Transformation', () => {
    beforeEach(() => {
      // Set up RTL mode for testing
      service.applyRTLConfig('ar');
    });
    
    it('should transform CSS classes for RTL', () => {
      const result = service.transformCSSClasses('text-left ml-4');
      
      expect(result).toContain('text-right');
      expect(result).toContain('mr-4');
    });
    
    it('should transform flex direction classes', () => {
      const result = service.transformCSSClasses('flex-row');
      
      expect(result).toBe('flex-row-reverse');
    });
    
    it('should not transform LTR classes in LTR mode', () => {
      service.applyRTLConfig('en');
      const result = service.transformCSSClasses('text-left ml-4');
      
      expect(result).toBe('text-left ml-4');
    });
  });
  
  describe('Inline Styles Transformation', () => {
    beforeEach(() => {
      service.applyRTLConfig('ar');
    });
    
    it('should transform margin styles', () => {
      const styles = { marginLeft: 16, marginRight: 8 };
      const result = service.transformInlineStyles(styles);
      
      expect(result).toEqual({ marginRight: 16, marginLeft: 8 });
    });
    
    it('should transform text alignment', () => {
      const styles = { textAlign: 'left' as const };
      const result = service.transformInlineStyles(styles);
      
      expect(result.textAlign).toBe('right');
    });
    
    it('should transform positioning', () => {
      const styles = { left: 10, right: 20 };
      const result = service.transformInlineStyles(styles);
      
      expect(result).toEqual({ right: 10, left: 20 });
    });
  });
  
  describe('Class Generator', () => {
    it('should create class generator function', () => {
      const generator = service.createClassGenerator('text-left', 'text-right');
      
      expect(typeof generator).toBe('function');
      
      const rtlClasses = generator(true);
      expect(rtlClasses).toContain('text-right');
      
      const ltrClasses = generator(false);
      expect(ltrClasses).toBe('text-left');
    });
  });
  
  describe('Observer Pattern', () => {
    it('should subscribe to direction changes', () => {
      const mockObserver = vi.fn();
      
      const unsubscribe = service.subscribe(mockObserver);
      
      expect(mockObserver).toHaveBeenCalledWith(service.getCurrentDirection());
      
      unsubscribe();
      expect(typeof unsubscribe).toBe('function');
    });
  });
  
  describe('RTL Configuration', () => {
    it('should apply RTL configuration', () => {
      const config = service.applyRTLConfig('ar');
      
      expect(config.supported).toBe(true);
      expect(config.direction).toBe('rtl');
      expect(config.cssProperties).toHaveProperty('--direction', 'rtl');
      expect(config.componentMappings).toHaveProperty('textAlign', 'right');
    });
    
    it('should apply LTR configuration', () => {
      const config = service.applyRTLConfig('en');
      
      expect(config.supported).toBe(false);
      expect(config.direction).toBe('ltr');
      expect(config.cssProperties).toHaveProperty('--direction', 'ltr');
      expect(config.componentMappings).toHaveProperty('textAlign', 'left');
    });
  });
});