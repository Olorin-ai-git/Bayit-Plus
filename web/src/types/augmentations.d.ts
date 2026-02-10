/**
 * Module augmentations for third-party packages.
 * This file uses import statements (making it a module file)
 * so it must be separate from modules.d.ts (which is ambient).
 */

// ─── Axios response interceptor override ──────────────────
// The api client interceptor returns response.data directly,
// so AxiosResponse<T> should be typed as T at the call site.

import 'axios';
declare module 'axios' {
  export interface AxiosResponse<T = any, D = any> {
    [key: string]: any;
  }
}

// ─── @testing-library/react fireEvent augmentation ──────
// Web tests use fireEvent.press (React Native pattern) via a compatibility layer.
// Augment the web fireEvent type to include press and changeText.

import '@testing-library/react';
declare module '@testing-library/react' {
  interface FireFunction {
    press: (element: any, options?: any) => void;
    changeText: (element: any, text: string) => void;
  }
  interface FireObject {
    press: (element: any, options?: any) => void;
    changeText: (element: any, text: string) => void;
  }
}
