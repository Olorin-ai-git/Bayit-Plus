import React from 'react';
import { NotFoundPage as SharedNotFoundPage } from '@olorin/shared';

const NotFoundPage: React.FC = () => {
  return (
    <SharedNotFoundPage
      accentColor="omen"
      popularLinks={[
        { label: 'Home', path: '/' },
        { label: 'Features', path: '/features' },
        { label: 'Predictions', path: '/predictions' },
        { label: 'Contact', path: '/contact' },
      ]}
    />
  );
};

export default NotFoundPage;
