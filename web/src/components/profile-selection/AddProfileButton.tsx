import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { platformClass } from '@/utils/platformClass';

/**
 * Zod schema for AddProfileButton props
 */
const AddProfileButtonPropsSchema = z.object({
  onClick: z.function().args().returns(z.void()),
});

type AddProfileButtonProps = z.infer<typeof AddProfileButtonPropsSchema>;

/**
 * AddProfileButton - Button to add a new profile
 *
 * @component
 * @example
 * <AddProfileButton onClick={handleAddProfile} />
 */
export function AddProfileButton(props: AddProfileButtonProps) {
  const validatedProps = AddProfileButtonPropsSchema.parse(props);
  const { onClick } = validatedProps;
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Pressable
      onPress={onClick}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      className="items-center gap-2"
    >
      {/* Add Avatar */}
      <View
        className={platformClass(
          isHovered
            ? 'w-[120px] h-[120px] rounded-lg border-2 border-dashed border-purple-500 justify-center items-center bg-[rgba(30,30,30,0.5)]'
            : 'w-[120px] h-[120px] rounded-lg border-2 border-dashed border-[rgba(255,255,255,0.1)] justify-center items-center bg-[rgba(30,30,30,0.3)]',
          'w-[120px] h-[120px] rounded-lg border-2 border-dashed border-[rgba(255,255,255,0.1)] justify-center items-center bg-[rgba(30,30,30,0.3)]'
        )}
      >
        <Plus size={40} color={isHovered ? '#a855f7' : '#9ca3af'} />
      </View>

      {/* Add Profile Text */}
      <Text
        className={platformClass(
          isHovered ? 'text-sm text-gray-300' : 'text-sm text-gray-400',
          'text-sm text-gray-400'
        )}
      >
        {t('profiles.addProfile')}
      </Text>
    </Pressable>
  );
}
