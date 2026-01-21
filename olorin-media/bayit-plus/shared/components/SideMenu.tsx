import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../hooks/useDirection';

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
  const { i18n, t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useDirection();
  const [focusedItem, setFocusedItem] = useState<string | null>(null);
  const isHebrew = i18n.language === 'he';

  return (
    <View className={`bg-black/20 py-6 items-center border-r border-white/10 ${isExpanded ? 'w-60 items-start px-5' : 'w-20'}`}>
      {/* Logo */}
      <View className="mb-10 items-center w-full">
        <Text className="text-3xl font-bold text-purple-600">{t('common.appName', 'Bayit+')}</Text>
      </View>

      {/* Menu Items */}
      <View className="flex-1 w-full">
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => onItemSelect(item.id)}
            onFocus={() => setFocusedItem(item.id)}
            onBlur={() => setFocusedItem(null)}
            className={`items-center py-4 px-4 rounded-xl mb-2 border ${
              activeItem === item.id ? 'bg-purple-600/30 border-white/10' : 'border-transparent'
            } ${focusedItem === item.id ? 'bg-purple-600/30 border-[3px] border-purple-600' : ''}`}
            style={{ flexDirection }}
          >
            <Text className="text-2xl">{item.icon}</Text>
            {isExpanded && (
              <Text
                className={`text-lg ${activeItem === item.id ? 'text-purple-600 font-bold' : 'text-gray-400'}`}
                style={{ textAlign, marginLeft: isRTL ? 0 : 16, marginRight: isRTL ? 16 : 0 }}
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

export default SideMenu;
