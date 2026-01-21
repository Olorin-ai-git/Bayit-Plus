/**
 * React Router DOM stub for React Native
 * Provides minimal compatibility for shared code that imports react-router-dom
 */

export const useLocation = () => ({
  pathname: '/',
  search: '',
  hash: '',
  state: null,
  key: 'default',
});

export const useNavigate = () => {
  return () => {
    console.warn('[react-router-dom stub] Navigation called but not implemented in React Native');
  };
};

export const useParams = () => ({});

export const useSearchParams = () => [new URLSearchParams(), () => {}];

// Add other exports as needed
export default {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
};
