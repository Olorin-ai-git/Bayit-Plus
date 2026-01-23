import { View } from 'react-native';
import { z } from 'zod';
import { platformClass } from '@/utils/platformClass';
import { ProfileCard, ProfileSchema, type Profile } from './ProfileCard';
import { AddProfileButton } from './AddProfileButton';

/**
 * Zod schema for ProfileGrid props
 */
const ProfileGridPropsSchema = z.object({
  profiles: z.array(ProfileSchema),
  onProfileSelect: z.function().args(ProfileSchema).returns(z.void()),
  onAddProfile: z.function().args().returns(z.void()),
  isManageMode: z.boolean(),
  canAddProfile: z.boolean(),
});

type ProfileGridProps = z.infer<typeof ProfileGridPropsSchema>;

/**
 * ProfileGrid - Grid layout for profile cards
 *
 * @component
 * @example
 * <ProfileGrid
 *   profiles={profiles}
 *   onProfileSelect={handleSelect}
 *   onAddProfile={handleAdd}
 *   isManageMode={false}
 *   canAddProfile={true}
 * />
 */
export function ProfileGrid(props: ProfileGridProps) {
  const validatedProps = ProfileGridPropsSchema.parse(props);
  const {
    profiles,
    onProfileSelect,
    onAddProfile,
    isManageMode,
    canAddProfile,
  } = validatedProps;

  return (
    <View
      className={platformClass(
        'flex-row flex-wrap justify-center gap-6 mb-8',
        'flex-row flex-wrap justify-center gap-6 mb-8'
      )}
    >
      {/* Profile Cards */}
      {profiles.map((profile: Profile) => (
        <ProfileCard
          key={profile.id}
          profile={profile}
          onSelect={onProfileSelect}
          isManageMode={isManageMode}
        />
      ))}

      {/* Add Profile Button */}
      {canAddProfile && !isManageMode && (
        <AddProfileButton onClick={onAddProfile} />
      )}
    </View>
  );
}
