import { View, Text, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { platformClass } from '@/utils/platformClass';

/**
 * Zod schema for ProfileSelectionHeader props
 */
const ProfileSelectionHeaderPropsSchema = z.object({
  isManageMode: z.boolean(),
  logoUri: z.string().optional().default('/assets/images/logos/logo.png'),
});

type ProfileSelectionHeaderProps = z.infer<typeof ProfileSelectionHeaderPropsSchema>;

/**
 * ProfileSelectionHeader - Logo and title section for profile selection
 *
 * @component
 * @example
 * <ProfileSelectionHeader isManageMode={false} />
 */
export function ProfileSelectionHeader(props: ProfileSelectionHeaderProps) {
  const validatedProps = ProfileSelectionHeaderPropsSchema.parse(props);
  const { isManageMode, logoUri } = validatedProps;
  const { t } = useTranslation();

  return (
    <View className="items-center mb-8 z-10">
      {/* Logo */}
      <View className="mb-6">
        <Image
          source={{ uri: logoUri }}
          className={platformClass(
            'h-16 w-[200px]',
            'h-16 w-[200px]'
          )}
          resizeMode="contain"
        />
      </View>

      {/* Title */}
      <Text
        className={platformClass(
          'text-2xl font-bold text-white text-center',
          'text-2xl font-bold text-white text-center'
        )}
      >
        {isManageMode ? t('profiles.manage') : t('profiles.whoIsWatching')}
      </Text>
    </View>
  );
}
