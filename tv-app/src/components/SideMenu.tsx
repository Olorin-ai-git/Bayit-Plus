import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,
} from 'react-native';

interface MenuItem {
  id: string;
  label: string;
  icon: string;
}

interface SideMenuProps {
  items: MenuItem[];
  activeItem: string;
  onItemSelect: (id: string) => void;
  isExpanded: boolean;
}

export const SideMenu: React.FC<SideMenuProps> = ({
  items,
  activeItem,
  onItemSelect,
  isExpanded,
}) => {
  const [focusedItem, setFocusedItem] = useState<string | null>(null);

  return (
    <View style={[styles.container, isExpanded && styles.containerExpanded]}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>בית+</Text>
      </View>

      {/* Menu Items */}
      <View style={styles.menuItems}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => onItemSelect(item.id)}
            onFocus={() => setFocusedItem(item.id)}
            onBlur={() => setFocusedItem(null)}
            style={[
              styles.menuItem,
              activeItem === item.id && styles.menuItemActive,
              focusedItem === item.id && styles.menuItemFocused,
            ]}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            {isExpanded && (
              <Text
                style={[
                  styles.menuLabel,
                  activeItem === item.id && styles.menuLabelActive,
                ]}
              >
                {item.label}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 80,
    backgroundColor: '#0d0d1a',
    paddingVertical: 24,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#1a1a2e',
  },
  containerExpanded: {
    width: 240,
    alignItems: 'flex-start',
    paddingHorizontal: 20,
  },
  logoContainer: {
    marginBottom: 40,
    alignItems: 'center',
    width: '100%',
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00d9ff',
  },
  menuItems: {
    flex: 1,
    width: '100%',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuItemActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  menuItemFocused: {
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
    borderWidth: 2,
    borderColor: '#00d9ff',
  },
  menuIcon: {
    fontSize: 24,
  },
  menuLabel: {
    fontSize: 18,
    color: '#888888',
    marginLeft: 16,
  },
  menuLabelActive: {
    color: '#00d9ff',
    fontWeight: 'bold',
  },
});

export default SideMenu;
