import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';

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
  const { i18n } = useTranslation();
  const [focusedItem, setFocusedItem] = useState<string | null>(null);
  const isHebrew = i18n.language === 'he';

  return (
    <View style={[styles.container, isExpanded && styles.containerExpanded]}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>{isHebrew ? 'בית+' : 'Bayit+'}</Text>
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
    backgroundColor: colors.glass,
    paddingVertical: 24,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.glassBorder,
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
    color: colors.primary,
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
    borderWidth: 1,
    borderColor: 'transparent',
  },
  menuItemActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    borderColor: colors.glassBorder,
  },
  menuItemFocused: {
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  menuIcon: {
    fontSize: 24,
  },
  menuLabel: {
    fontSize: 18,
    color: colors.textSecondary,
    marginLeft: 16,
  },
  menuLabelActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
});

export default SideMenu;
