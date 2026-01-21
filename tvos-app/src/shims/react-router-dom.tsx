/**
 * React Router DOM Shims for React Native (tvOS)
 *
 * These shims provide React Router-like components that work with React Navigation.
 * This allows web components that use react-router-dom to work on tvOS.
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

// Navigation context for route tracking
const RouterContext = createContext<{
  currentPath: string;
  navigate: (path: string) => void;
}>({
  currentPath: '/',
  navigate: () => {},
});

// Route mapping: web paths to React Navigation screen names
const pathToScreen: Record<string, string> = {
  '/': 'Home',
  '/home': 'Home',
  '/live': 'LiveTV',
  '/vod': 'VOD',
  '/radio': 'Radio',
  '/podcasts': 'Podcasts',
  '/flows': 'Flows',
  '/judaism': 'Judaism',
  '/children': 'Children',
  '/search': 'Search',
  '/login': 'Login',
  '/register': 'Register',
  '/admin': 'Admin',
  '/profile': 'Profile',
  '/favorites': 'Favorites',
  '/watchlist': 'Watchlist',
  '/downloads': 'Downloads',
  '/subscribe': 'Subscribe',
};

const screenToPath: Record<string, string> = Object.entries(pathToScreen).reduce(
  (acc, [path, screen]) => ({ ...acc, [screen]: path }),
  {}
);

// Provider for router context
export const RouterProvider: React.FC<{ children: ReactNode; currentRoute: string }> = ({
  children,
  currentRoute,
}) => {
  const navigation = useNavigation<any>();

  const navigate = (path: string) => {
    const screen = pathToScreen[path] || 'Home';
    const mainTabScreens = ['Home', 'LiveTV', 'VOD', 'Radio', 'Podcasts', 'Profile'];
    if (mainTabScreens.includes(screen)) {
      navigation.navigate('Main', { screen });
    } else {
      navigation.navigate(screen);
    }
  };

  return (
    <RouterContext.Provider value={{ currentPath: screenToPath[currentRoute] || '/', navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

// useNavigate hook shim
export function useNavigate() {
  const { navigate } = useContext(RouterContext);
  return navigate;
}

// Link component shim
interface LinkProps {
  to: string;
  style?: any;
  children: ReactNode;
}

export const Link: React.FC<LinkProps> = ({ to, style, children }) => {
  const navigate = useNavigate();

  const handlePress = () => {
    navigate(to);
  };

  // If children is a string, wrap in Text
  if (typeof children === 'string') {
    return (
      <TouchableOpacity onPress={handlePress} style={style}>
        <Text>{children}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={handlePress} style={style}>
      {children}
    </TouchableOpacity>
  );
};

// NavLink component shim with active state
interface NavLinkProps {
  to: string;
  style?: any | (({ isActive }: { isActive: boolean }) => any);
  children: ReactNode | (({ isActive }: { isActive: boolean }) => ReactNode);
  onClick?: () => void;
}

export const NavLink: React.FC<NavLinkProps> = ({ to, style, children, onClick }) => {
  const { currentPath, navigate } = useContext(RouterContext);
  const isActive = currentPath === to || (to === '/' && currentPath === '/home');

  const handlePress = () => {
    if (onClick) onClick();
    navigate(to);
  };

  const computedStyle = typeof style === 'function' ? style({ isActive }) : style;
  const content = typeof children === 'function' ? children({ isActive }) : children;

  return (
    <TouchableOpacity onPress={handlePress} style={computedStyle}>
      {content}
    </TouchableOpacity>
  );
};

// Export default for module resolution
export default {
  Link,
  NavLink,
  useNavigate,
  RouterProvider,
};
