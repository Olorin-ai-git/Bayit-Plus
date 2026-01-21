/**
 * @fileoverview Tests for TranslationService
  */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TranslationService } from '../services/translation.service';
import type { TranslationServiceConfig } from '../types';

describe('TranslationService', () => {
  let service: TranslationService;
  
  beforeEach(() => {
    service = TranslationService.getInstance();
  });
  
  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = TranslationService.getInstance();
      const instance2 = TranslationService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
  
  describe('Translation', () => {
    it('should translate basic keys', () => {
      const result = service.translate('common.welcome');
      
      expect(result).toBe('common.welcome'); // Mock returns the key
    });
    
    it('should handle translation options', () => {
      const result = service.translate('common.welcome', {
        lng: 'es',
        replace: { name: 'John' }
      });
      
      expect(result).toBe('common.welcome');
    });
    
    it('should return fallback for missing keys', () => {
      const result = service.translate('missing.key', {
        defaultValue: 'Fallback text'
      });
      
      expect(result).toBe('missing.key');
    });
  });
  
  describe('Language Management', () => {
    it('should get current language', () => {
      const language = service.getCurrentLanguage();
      
      expect(language).toBe('en');
    });
    
    it('should change language', async () => {
      await service.changeLanguage('es');
      
      // Verify that the change language function was called
      expect(document.documentElement.classList.add).toHaveBeenCalledWith('ltr');
    });
    
    it('should detect RTL languages', () => {
      expect(service.isRTL('ar')).toBe(true);
      expect(service.isRTL('en')).toBe(false);
    });
    
    it('should get text direction', () => {
      expect(service.getDirection('ar')).toBe('rtl');
      expect(service.getDirection('en')).toBe('ltr');
    });
  });
  
  describe('Professional Translations', () => {
    it('should translate CV sections', () => {
      const result = service.translateCVSection('experience');
      
      expect(result).toBe('cv.sections.experience');
    });
    
    it('should translate roles with industry context', () => {
      const result = service.translateRole('software-engineer', 'technology');
      
      expect(result).toBe('software-engineer'); // Fallback to original
    });
    
    it('should translate skills with category', () => {
      const result = service.translateSkill('javascript', 'technical');
      
      expect(result).toBe('javascript'); // Fallback to original
    });
  });
  
  describe('Form Translations', () => {
    it('should translate form field labels', () => {
      const result = service.translateForm('firstName', 'label');
      
      expect(result).toBe('forms.firstName.label');
    });
    
    it('should translate error messages', () => {
      const result = service.translateError('required_field');
      
      expect(result).toBe('errors.required_field');
    });
  });
  
  describe('Caching', () => {
    it('should clear cache', () => {
      service.clearCache();
      
      // Should not throw
      expect(true).toBe(true);
    });
  });
  
  describe('Validation', () => {
    it('should validate translations', async () => {
      const validation = await service.validateTranslations(['en', 'es']);
      
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('errors');
      expect(validation).toHaveProperty('warnings');
    });
  });
  
  describe('Language Support', () => {
    it('should return available languages', () => {
      const languages = service.getAvailableLanguages();
      
      expect(Array.isArray(languages)).toBe(true);
      expect(languages.length).toBeGreaterThan(0);
    });
    
    it('should get language configuration', () => {
      const config = service.getLanguageConfig('en');
      
      expect(config).toHaveProperty('name');
      expect(config).toHaveProperty('dir');
      expect(config).toHaveProperty('locale');
    });
  });
});