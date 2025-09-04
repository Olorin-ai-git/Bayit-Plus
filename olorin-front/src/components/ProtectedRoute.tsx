import React from 'react';
import { Navigate } from 'react-router-dom';
import { preserveUrlParams } from '../js/utils/urlParams';
import { useDemoMode } from '../js/contexts/DemoModeContext';

interface ProtectedRouteProps {
  element: React.ReactElement;
  allowedInDemo?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  element, 
  allowedInDemo = false 
}) => {
  const { isDemoMode } = useDemoMode();
  
  if (isDemoMode && !allowedInDemo) {
    // Redirect to investigation page if trying to access restricted page in demo mode
    const redirectPath = preserveUrlParams('/investigation');
    return <Navigate to={redirectPath} replace />;
  }
  
  return element;
};

export default ProtectedRoute;