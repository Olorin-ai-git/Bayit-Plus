import React from 'react';
import { NotFoundPage as SharedNotFoundPage } from '@olorin/shared';

const NotFoundPage: React.FC = () => {
  return (
    <SharedNotFoundPage
      accentColor="main"
      popularLinks={[
        { label: 'Home', path: '/' },
        { label: 'About Us', path: '/about' },
        { label: 'Knowledge Hub', path: '/knowledge-hub' },
        { label: 'Contact Us', path: '/contact' },
      ]}
    />
  );
};

export default NotFoundPage;
