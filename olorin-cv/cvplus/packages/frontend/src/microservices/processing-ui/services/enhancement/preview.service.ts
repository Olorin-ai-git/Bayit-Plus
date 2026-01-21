export interface PreviewState {
  id: string;
  features: any[];
}

export interface FeaturePreview {
  id: string;
  name: string;
  description: string;
}

export const previewService = {
  getPreviewState: (): PreviewState => ({
    id: '',
    features: []
  })
};
