import React from 'react';
import { Navigate } from 'react-router-dom';
import { preserveUrlParams } from '../js/utils/urlParams';
import { useDemoMode } from '../js/hooks/useDemoMode';

const RootRedirect: React.FC = () => {
  const { isDemoMode } = useDemoMode();
  const redirectPath = preserveUrlParams(isDemoMode ? '/investigation' : '/investigations');
  return <Navigate to={redirectPath} replace />;
};

export default RootRedirect;