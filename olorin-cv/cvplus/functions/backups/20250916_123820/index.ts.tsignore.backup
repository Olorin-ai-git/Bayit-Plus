// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// @ts-ignore - Export conflicts// Core Services
import { ProfileService } from './profile.service';
import { SEOService } from './seo.service';
import { AnalyticsService } from './analytics.service';
import { NetworkingService } from './networking.service';
import { TemplateService } from './template.service';
import { ValidationService } from './validation.service';
import { StorageService } from './storage.service';

export { 
  ProfileService, 
  SEOService, 
  AnalyticsService, 
  NetworkingService, 
  TemplateService, 
  ValidationService, 
  StorageService 
};

// Service Types
export interface PublicProfilesServices {
  profileService: ProfileService;
  seoService: SEOService;
  analyticsService: AnalyticsService;
  networkingService: NetworkingService;
  templateService: TemplateService;
  validationService: ValidationService;
  storageService: StorageService;
}

// Service Factory
export class PublicProfilesServiceFactory {
  private static instance: PublicProfilesServiceFactory;
  private services: PublicProfilesServices;

  private constructor() {
    this.services = {
      profileService: new ProfileService(),
      seoService: new SEOService(),
      analyticsService: new AnalyticsService(),
      networkingService: new NetworkingService(),
      templateService: new TemplateService(),
      validationService: new ValidationService(),
      storageService: new StorageService()
    };
  }

  static getInstance(): PublicProfilesServiceFactory {
    if (!PublicProfilesServiceFactory.instance) {
      PublicProfilesServiceFactory.instance = new PublicProfilesServiceFactory();
    }
    return PublicProfilesServiceFactory.instance;
  }

  getServices(): PublicProfilesServices {
    return this.services;
  }

  getProfileService(): ProfileService {
    return this.services.profileService;
  }

  getSEOService(): SEOService {
    return this.services.seoService;
  }

  getAnalyticsService(): AnalyticsService {
    return this.services.analyticsService;
  }

  getNetworkingService(): NetworkingService {
    return this.services.networkingService;
  }

  getTemplateService(): TemplateService {
    return this.services.templateService;
  }

  getValidationService(): ValidationService {
    return this.services.validationService;
  }

  getStorageService(): StorageService {
    return this.services.storageService;
  }
}