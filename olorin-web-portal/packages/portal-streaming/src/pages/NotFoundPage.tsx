import React from 'react';
import { NotFoundPage as SharedNotFoundPage } from '@olorin/shared';

const NotFoundPage: React.FC = () => {
  return (
    <SharedNotFoundPage
      accentColor="streaming"
      popularLinks={[
        { label: 'Home', path: '/' },
        { label: 'Features', path: '/features' },
        { label: 'Use Cases', path: '/use-cases' },
        { label: 'Contact', path: '/contact' },
      ]}
    />
  );
};

export default NotFoundPage;
