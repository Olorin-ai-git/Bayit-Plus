/**
 * React Router DOM Platform Shim for React Native
 *
 * Provides compatibility layer for shared code that imports react-router-dom.
 * React Native uses react-navigation instead of react-router-dom.
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
    // React Native uses react-navigation - this shim provides API compatibility only
  };
};

export const useParams = () => ({});

export const useSearchParams = () => [new URLSearchParams(), () => {}];

export default {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
};
