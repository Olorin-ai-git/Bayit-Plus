import React from 'react';
import { NotFoundPage as SharedNotFoundPage } from '@olorin/shared';

const NotFoundPage: React.FC = () => {
  return (
    <SharedNotFoundPage
      accentColor="purple"
      popularLinks={[
        { label: 'Home', path: '/' },
        { label: 'AI Agents', path: '/agents' },
        { label: 'Features', path: '/features' },
        { label: 'Contact', path: '/contact' },
      ]}
    />
  );
};

export default NotFoundPage;
