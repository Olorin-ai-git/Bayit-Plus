/**
 * ContentSelectionSection Component
 * Form section for selecting widget content (library or iframe)
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { z } from 'zod';
import { GlassInput } from '@bayit/shared/ui';
import { useDirection } from '@/hooks/useDirection';
import { platformClass } from '@/utils/platformClass';

// Content item type for widget content selection
export interface ContentItem {
  id: string;
  title: string;
  type: 'live_channel' | 'iframe' | 'podcast' | 'vod' | 'radio' | 'live';
  thumbnail?: string;
}

export const ContentSelectionSchema = z.object({
  content_type: z.enum(['live_channel', 'iframe', 'podcast', 'vod', 'radio', 'live']),
  content_id: z.string().optional(),
  iframe_url: z.string().url().optional(),
  iframe_title: z.string().optional(),
});

export type ContentSelectionData = z.infer<typeof ContentSelectionSchema>;

interface ContentSelectionSectionProps {
  contentType: 'live_channel' | 'iframe' | 'podcast' | 'vod' | 'radio' | 'live';
  contentId: string;
  iframeUrl: string;
  iframeTitle: string;
  selectedContent: ContentItem | null;
  onSwitchToContent: () => void;
  onSwitchToIframe: () => void;
  onUpdateField: (field: 'iframe_url' | 'iframe_title', value: string) => void;
}

export const ContentSelectionSection: React.FC<ContentSelectionSectionProps> = ({
  contentType,
  iframeUrl,
  iframeTitle,
  selectedContent,
  onSwitchToContent,
  onSwitchToIframe,
  onUpdateField,
}) => {
  const { t } = useTranslation();
  const { textAlign, flexDirection } = useDirection();

  const iframeModeActive = contentType === 'iframe';
  const contentModeActive = !iframeModeActive;

  return (
    <View className={platformClass('flex flex-col gap-3')}>
      <Text
        className={platformClass(
          'text-sm font-semibold text-gray-400 uppercase tracking-wider',
          'text-sm font-semibold text-gray-400'
        )}
        style={{ textAlign }}
      >
        {t('widgets.form.content')}
      </Text>

      {/* Mode Toggle */}
      <View className={platformClass('flex gap-2')} style={{ flexDirection }}>
        <Pressable
          className={platformClass(
            contentModeActive
              ? 'flex-1 py-2 px-3 rounded-lg border bg-purple-600 border-purple-600 items-center'
              : 'flex-1 py-2 px-3 rounded-lg border border-white/10 items-center',
            contentModeActive
              ? 'flex-1 py-2 px-3 rounded-lg bg-purple-600 items-center'
              : 'flex-1 py-2 px-3 rounded-lg border border-white/10 items-center'
          )}
          onPress={onSwitchToContent}
        >
          <Text
            className={platformClass(
              contentModeActive
                ? 'text-sm font-medium text-white'
                : 'text-sm font-medium text-gray-400'
            )}
          >
            {t('widgets.form.fromLibrary')}
          </Text>
        </Pressable>

        <Pressable
          className={platformClass(
            iframeModeActive
              ? 'flex-1 py-2 px-3 rounded-lg border bg-purple-600 border-purple-600 items-center'
              : 'flex-1 py-2 px-3 rounded-lg border border-white/10 items-center',
            iframeModeActive
              ? 'flex-1 py-2 px-3 rounded-lg bg-purple-600 items-center'
              : 'flex-1 py-2 px-3 rounded-lg border border-white/10 items-center'
          )}
          onPress={onSwitchToIframe}
        >
          <Text
            className={platformClass(
              iframeModeActive
                ? 'text-sm font-medium text-white'
                : 'text-sm font-medium text-gray-400'
            )}
          >
            {t('widgets.form.iframe')}
          </Text>
        </Pressable>
      </View>

      {/* Content from Library */}
      {contentModeActive && (
        <View>
          {selectedContent ? (
            <View
              className={platformClass(
                'flex justify-between items-center px-3 py-2 rounded-lg bg-purple-600/20 border border-purple-600'
              )}
              style={{ flexDirection }}
            >
              <Text className={platformClass('text-sm text-white flex-1')}>
                {t('common.selected', 'Selected')}: {selectedContent.title}
              </Text>
              <Pressable
                className={platformClass('px-3 py-1 rounded bg-purple-600')}
                onPress={onSwitchToContent}
              >
                <Text className={platformClass('text-xs font-semibold text-white')}>
                  {t('widgets.form.change')}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              className={platformClass('flex items-center px-3 py-3 rounded-lg border border-purple-600 gap-2')}
              style={{ flexDirection }}
              onPress={onSwitchToContent}
            >
              <Plus size={16} color="#9333ea" />
              <Text className={platformClass('text-sm text-purple-600 font-medium')}>
                {t('widgets.form.selectContent')}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* iFrame Mode */}
      {iframeModeActive && (
        <View className={platformClass('flex flex-col gap-2')}>
          <GlassInput
            className={platformClass(
              'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white min-h-[44px]'
            )}
            placeholder={t('widgets.form.iframeUrl')}
            value={iframeUrl}
            onChangeText={(v) => onUpdateField('iframe_url', v)}
          />
          <GlassInput
            className={platformClass(
              'bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white min-h-[44px]'
            )}
            placeholder={t('widgets.form.iframeTitle')}
            value={iframeTitle}
            onChangeText={(v) => onUpdateField('iframe_title', v)}
          />
        </View>
      )}
    </View>
  );
};
