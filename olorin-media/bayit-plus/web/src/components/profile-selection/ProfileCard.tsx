import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Edit2, Lock } from 'lucide-react';
import { z } from 'zod';
import { platformClass, platformStyle } from '@/utils/platformClass';

/**
 * Available avatar colors for profiles
 */
export const AVATAR_COLORS = [
  '#a855f7', // Cyan
  '#ff6b6b', // Red
  '#4ecdc4', // Teal
  '#ffd93d', // Yellow
  '#6c5ce7', // Purple
  '#a8e6cf', // Mint
  '#ff8b94', // Pink
  '#ffaaa5', // Coral
] as const;

/**
 * Zod schema for Profile
 */
export const ProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().optional(),
  avatar_color: z.string().optional(),
  is_kids_profile: z.boolean().optional(),
  has_pin: z.boolean().optional(),
});

export type Profile = z.infer<typeof ProfileSchema>;

/**
 * Zod schema for ProfileCard props
 */
const ProfileCardPropsSchema = z.object({
  profile: ProfileSchema,
  onSelect: z.function().args(ProfileSchema).returns(z.void()),
  isManageMode: z.boolean(),
});

type ProfileCardProps = z.infer<typeof ProfileCardPropsSchema>;

/**
 * Get initials from profile name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * ProfileCard - Individual profile selection card
 *
 * @component
 * @example
 * <ProfileCard
 *   profile={profile}
 *   onSelect={handleSelect}
 *   isManageMode={false}
 * />
 */
export function ProfileCard(props: ProfileCardProps) {
  const validatedProps = ProfileCardPropsSchema.parse(props);
  const { profile, onSelect, isManageMode } = validatedProps;
  const [isHovered, setIsHovered] = useState(false);

  const avatarColor = profile.avatar_color || AVATAR_COLORS[0];

  return (
    <Pressable
      onPress={() => onSelect(profile)}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      className="items-center gap-2"
      style={platformStyle({
        web: isHovered ? { transform: 'scale(1.05)' } : undefined,
      })}
    >
      {/* Avatar Container */}
      <View
        className={platformClass(
          'w-[120px] h-[120px] rounded-lg justify-center items-center relative',
          'w-[120px] h-[120px] rounded-lg justify-center items-center relative'
        )}
        style={{ backgroundColor: avatarColor }}
      >
        {/* Avatar Content */}
        {profile.avatar ? (
          <Text className="text-[56px]">{profile.avatar}</Text>
        ) : (
          <Text
            className={platformClass(
              'text-[40px] font-bold text-white',
              'text-[40px] font-bold text-white'
            )}
          >
            {getInitials(profile.name)}
          </Text>
        )}

        {/* Kids Indicator */}
        {profile.is_kids_profile && (
          <View
            className={platformClass(
              'absolute -bottom-1 -right-1 bg-[#FBBF24] rounded-full p-1.5',
              'absolute -bottom-1 -right-1 bg-[#FBBF24] rounded-full p-1.5'
            )}
          >
            <Text className="text-sm">👶</Text>
          </View>
        )}

        {/* PIN Indicator */}
        {profile.has_pin && (
          <View
            className={platformClass(
              'absolute -top-1 -right-1 bg-[#2a2a2a] rounded-full p-1.5',
              'absolute -top-1 -right-1 bg-[#2a2a2a] rounded-full p-1.5'
            )}
          >
            <Lock size={12} color="#9ca3af" />
          </View>
        )}

        {/* Edit Overlay (Manage Mode) */}
        {isManageMode && (
          <View
            className={platformClass(
              'absolute inset-0 bg-black/50 rounded-lg justify-center items-center',
              'absolute inset-0 bg-black/50 rounded-lg justify-center items-center'
            )}
          >
            <Edit2 size={24} color="#ffffff" />
          </View>
        )}
      </View>

      {/* Profile Name */}
      <Text
        className={platformClass(
          isHovered
            ? 'text-sm text-white max-w-[120px] text-center'
            : 'text-sm text-gray-400 max-w-[120px] text-center',
          'text-sm text-gray-400 max-w-[120px] text-center'
        )}
      >
        {profile.name}
      </Text>
    </Pressable>
  );
}
