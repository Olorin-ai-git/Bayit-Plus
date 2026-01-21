import { InternalAxiosRequestConfig } from 'axios';

export interface RequestMetadata {
  startTime: number;
}

export interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  metadata?: RequestMetadata;
}
