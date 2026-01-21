import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Shield, Clock, LogOut } from 'lucide-react';
import { GlassView } from '@bayit/shared/ui';
import { useAuthStore } from '@/stores/authStore';

interface SecurityTabProps {
  isRTL: boolean;
}

export function SecurityTab({ isRTL }: SecurityTabProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <View className="gap-6">
      <GlassView className="p-6 gap-4">
        <Text className={`text-[13px] font-semibold text-white/60 uppercase tracking-wide ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('profile.accountSecurity', 'Account Security')}
        </Text>
        <View className="gap-4">
          <View className="flex-row items-center gap-4">
            {isRTL ? (
              <>
                <Text className="flex-1 text-sm text-white/60 text-right">
                  {t('profile.securityNote', 'Your account is secured with encrypted authentication')}
                </Text>
                <Shield size={20} color="#22C55E" />
              </>
            ) : (
              <>
                <Shield size={20} color="#22C55E" />
                <Text className="flex-1 text-sm text-white/60 text-left">
                  {t('profile.securityNote', 'Your account is secured with encrypted authentication')}
                </Text>
              </>
            )}
          </View>
          {user?.last_login && (
            <View className="flex-row items-center gap-4">
              {isRTL ? (
                <>
                  <Text className="flex-1 text-sm text-white/60 text-right">
                    {t('profile.lastLogin', 'Last login')}: {new Date(user.last_login).toLocaleString()}
                  </Text>
                  <Clock size={20} color="rgba(255,255,255,0.6)" />
                </>
              ) : (
                <>
                  <Clock size={20} color="rgba(255,255,255,0.6)" />
                  <Text className="flex-1 text-sm text-white/60 text-left">
                    {t('profile.lastLogin', 'Last login')}: {new Date(user.last_login).toLocaleString()}
                  </Text>
                </>
              )}
            </View>
          )}
        </View>
      </GlassView>

      <GlassView className="p-6 gap-4 border border-[#EF4444]/30">
        <Text className={`text-[13px] font-semibold text-[#EF4444] uppercase tracking-wide ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('profile.dangerZone', 'Danger Zone')}
        </Text>
        <Pressable onPress={handleLogout} className="flex-row items-center gap-2 py-4">
          {isRTL ? (
            <>
              <Text className="text-[15px] font-medium text-[#EF4444] text-right">{t('account.logout', 'Sign Out')}</Text>
              <LogOut size={20} color="#EF4444" />
            </>
          ) : (
            <>
              <LogOut size={20} color="#EF4444" />
              <Text className="text-[15px] font-medium text-[#EF4444] text-left">{t('account.logout', 'Sign Out')}</Text>
            </>
          )}
        </Pressable>
      </GlassView>
    </View>
  );
}
