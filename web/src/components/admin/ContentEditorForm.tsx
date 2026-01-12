import React, { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { AlertCircle, Save, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ImageUploader } from './ImageUploader'
import { StreamUrlInput } from './StreamUrlInput'
import { CategoryPicker } from './CategoryPicker'
import type { Content, LiveChannel, RadioStation, Podcast, PodcastEpisode } from '../../types/content'

type ContentType = 'vod' | 'live' | 'radio' | 'podcast' | 'episode'
type FormData = Partial<Content & LiveChannel & RadioStation & Podcast & PodcastEpisode>

interface ContentEditorFormProps {
  type?: ContentType
  initialData?: FormData
  onSubmit: (data: FormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

export function ContentEditorForm({
  type = 'vod',
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: ContentEditorFormProps) {
  const { t } = useTranslation()
  const { control, register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: initialData || {},
  })

  const isSeries = watch('is_series')
  const streamType = watch('stream_type') as 'hls' | 'dash' | 'audio'

  const onSubmitForm = async (data: FormData) => {
    try {
      await onSubmit(data)
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const renderField = (
    name: string,
    label: string,
    type: string = 'text',
    required: boolean = false,
    placeholder?: string,
  ) => (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-white">
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      <input
        id={name}
        {...register(name as any, { required: required ? `${label} is required` : false })}
        type={type}
        placeholder={placeholder}
        disabled={isLoading}
        className="w-full px-4 py-2 rounded-lg border border-white/20 bg-white/5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 transition-colors"
      />
      {errors[name as keyof FormData] && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {(errors[name as keyof FormData]?.message as string || `${label} ${t('admin.content.editor.fields.titleRequired').split(' ')[1]}`)}
        </p>
      )}
    </div>
  )

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
      {/* Basic Information */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-white">{t('admin.content.editor.sections.basicInfo')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderField('title', t('admin.content.editor.fields.title'), 'text', true, t('admin.content.editor.fields.titlePlaceholder'))}
          {type !== 'radio' && type !== 'podcast' && renderField('year', t('admin.content.editor.fields.year'), 'number', false, t('admin.content.editor.fields.yearPlaceholder'))}
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-white mb-2">
            {t('admin.content.editor.fields.description')}
          </label>
          <textarea
            id="description"
            {...register('description')}
            placeholder={t('admin.content.editor.fields.descriptionPlaceholder')}
            disabled={isLoading}
            rows={4}
            className="w-full px-4 py-2 rounded-lg border border-white/20 bg-white/5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 transition-colors"
          />
        </div>
      </section>

      {/* Images */}
      {type !== 'radio' && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-white">{t('admin.content.editor.sections.media')}</h3>
          <Controller
            control={control}
            name="thumbnail"
            render={({ field }) => (
              <ImageUploader
                value={field.value}
                onChange={field.onChange}
                label={type === 'podcast' ? t('admin.content.editor.fields.posterCover') : t('admin.content.editor.fields.thumbnail')}
                aspectRatio={type === 'podcast' ? 1 : 3 / 4}
                allowUrl
              />
            )}
          />
          {type === 'vod' && (
            <Controller
              control={control}
              name="backdrop"
              render={({ field }) => (
                <ImageUploader
                  value={field.value}
                  onChange={field.onChange}
                  label={t('admin.content.editor.fields.backdrop')}
                  aspectRatio={16 / 9}
                  allowUrl
                />
              )}
            />
          )}
          {type === 'live' && (
            <Controller
              control={control}
              name="logo"
              render={({ field }) => (
                <ImageUploader
                  value={field.value}
                  onChange={field.onChange}
                  label={t('admin.content.editor.fields.channelLogo')}
                  aspectRatio={2 / 1}
                  allowUrl
                />
              )}
            />
          )}
          {type === 'radio' && (
            <Controller
              control={control}
              name="logo"
              render={({ field }) => (
                <ImageUploader
                  value={field.value}
                  onChange={field.onChange}
                  label={t('admin.content.editor.fields.stationLogo')}
                  aspectRatio={1}
                  allowUrl
                />
              )}
            />
          )}
        </section>
      )}

      {/* Stream/Audio Configuration */}
      {(type === 'vod' || type === 'live' || type === 'radio') && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-white">{t('admin.content.editor.sections.streaming')}</h3>
          <Controller
            control={control}
            name="stream_url"
            render={({ field }) => (
              <StreamUrlInput
                value={field.value}
                onChange={field.onChange}
                onStreamTypeChange={(st) => setValue('stream_type', st)}
                label={t('admin.content.editor.fields.streamUrl')}
                required
              />
            )}
          />
          {(type === 'vod' || type === 'live') && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white">{t('admin.content.editor.fields.drmProtected')}</label>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_drm_protected"
                  {...register('is_drm_protected')}
                  disabled={isLoading}
                  className="w-4 h-4 rounded border-white/20 bg-white/5"
                />
                <label htmlFor="is_drm_protected" className="text-sm text-gray-300">
                  {t('admin.content.editor.fields.drmProtectedLabel')}
                </label>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Category */}
      {type === 'vod' && (
        <section className="space-y-4">
          <Controller
            control={control}
            name="category_id"
            render={({ field }) => (
              <CategoryPicker
                value={field.value}
                onChange={field.onChange}
                label={t('admin.content.editor.fields.category')}
                required
                allowCreate
              />
            )}
          />
        </section>
      )}

      {/* VOD Specific */}
      {type === 'vod' && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-white">{t('admin.content.editor.sections.details')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('duration', t('admin.content.editor.fields.duration'), 'text', false, t('admin.content.editor.fields.durationPlaceholder'))}
            {renderField('rating', t('admin.content.editor.fields.rating'), 'text', false, t('admin.content.editor.fields.ratingPlaceholder'))}
            {renderField('genre', t('admin.content.editor.fields.genre'), 'text', false, t('admin.content.editor.fields.genrePlaceholder'))}
            {renderField('director', t('admin.content.editor.fields.director'), 'text', false, t('admin.content.editor.fields.directorPlaceholder'))}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">{t('admin.content.editor.fields.isSeries')}</label>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_series"
                {...register('is_series')}
                disabled={isLoading}
                className="w-4 h-4 rounded border-white/20 bg-white/5"
              />
              <label htmlFor="is_series" className="text-sm text-gray-300">
                {t('admin.content.editor.fields.isSeriesLabel')}
              </label>
            </div>
          </div>

          {isSeries && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderField('season', t('admin.content.editor.fields.season'), 'number')}
              {renderField('episode', t('admin.content.editor.fields.episode'), 'number')}
              {renderField('series_id', t('admin.content.editor.fields.seriesId'), 'text', false, t('admin.content.editor.fields.seriesIdPlaceholder'))}
            </div>
          )}
        </section>
      )}

      {/* Publishing Options */}
      {type !== 'episode' && type !== 'radio' && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-white">{t('admin.content.editor.sections.publishing')}</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_published"
                {...register('is_published')}
                disabled={isLoading}
                className="w-4 h-4 rounded border-white/20 bg-white/5"
              />
              <label htmlFor="is_published" className="text-sm text-gray-300">
                {t('admin.content.editor.fields.isPublishedLabel')}
              </label>
            </div>
            {type === 'vod' && (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_featured"
                  {...register('is_featured')}
                  disabled={isLoading}
                  className="w-4 h-4 rounded border-white/20 bg-white/5"
                />
                <label htmlFor="is_featured" className="text-sm text-gray-300">
                  {t('admin.content.editor.fields.isFeaturedLabel')}
                </label>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Subscription & Kids */}
      {(type === 'vod' || type === 'live') && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-white">{t('admin.content.editor.sections.accessControl')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="requires_subscription" className="block text-sm font-medium text-white">
                {t('admin.content.editor.fields.requiredSubscription')}
              </label>
              <select
                id="requires_subscription"
                {...register('requires_subscription')}
                disabled={isLoading}
                className="w-full px-4 py-2 rounded-lg border border-white/20 bg-white/5 text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 transition-colors"
              >
                <option value="basic">{t('admin.content.editor.subscriptionTiers.basic')}</option>
                <option value="premium">{t('admin.content.editor.subscriptionTiers.premium')}</option>
                <option value="family">{t('admin.content.editor.subscriptionTiers.family')}</option>
              </select>
            </div>
          </div>
          {type === 'vod' && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_kids_content"
                {...register('is_kids_content')}
                disabled={isLoading}
                className="w-4 h-4 rounded border-white/20 bg-white/5"
              />
              <label htmlFor="is_kids_content" className="text-sm text-gray-300">
                {t('admin.content.editor.fields.isKidsContentLabel')}
              </label>
            </div>
          )}
        </section>
      )}

      {/* Podcast Specific */}
      {type === 'podcast' && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-white">{t('admin.content.editor.sections.podcastDetails')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('author', t('admin.content.editor.fields.author'), 'text', false, t('admin.content.editor.fields.authorPlaceholder'))}
            {renderField('category', t('admin.content.editor.fields.podcastCategory'), 'text', false, t('admin.content.editor.fields.podcastCategoryPlaceholder'))}
            {renderField('rss_feed', t('admin.content.editor.fields.rssFeed'), 'url', false, t('admin.content.editor.fields.rssFeedPlaceholder'))}
            {renderField('website', t('admin.content.editor.fields.website'), 'url', false, t('admin.content.editor.fields.websitePlaceholder'))}
          </div>
        </section>
      )}

      {/* Episode Specific */}
      {type === 'episode' && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-white">{t('admin.content.editor.sections.episodeDetails')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('episode_number', t('admin.content.editor.fields.episodeNumber'), 'number')}
            {renderField('season_number', t('admin.content.editor.fields.seasonNumber'), 'number')}
            {renderField('duration', t('admin.content.editor.fields.duration'), 'text', false, t('admin.content.editor.fields.durationPlaceholder'))}
          </div>
          <div className="space-y-2">
            <label htmlFor="audio_url" className="block text-sm font-medium text-white">
              {t('admin.content.editor.fields.audioUrl')}
              <span className="text-red-400">*</span>
            </label>
            <input
              id="audio_url"
              {...register('audio_url', { required: t('admin.content.editor.fields.audioUrlRequired') })}
              type="url"
              placeholder={t('admin.content.editor.fields.audioUrlPlaceholder')}
              disabled={isLoading}
              className="w-full px-4 py-2 rounded-lg border border-white/20 bg-white/5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="published_at" className="block text-sm font-medium text-white">
              {t('admin.content.editor.fields.publishedDate')}
            </label>
            <input
              id="published_at"
              {...register('published_at')}
              type="datetime-local"
              disabled={isLoading}
              className="w-full px-4 py-2 rounded-lg border border-white/20 bg-white/5 text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 transition-colors"
            />
          </div>
        </section>
      )}

      {/* Radio Specific */}
      {type === 'radio' && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-white">{t('admin.content.editor.sections.stationDetails')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('genre', t('admin.content.editor.fields.genre'), 'text', false, t('admin.content.editor.fields.genrePlaceholder'))}
            {renderField('current_show', t('admin.content.editor.fields.currentShow'), 'text', false, t('admin.content.editor.fields.currentShowPlaceholder'))}
            {renderField('current_song', t('admin.content.editor.fields.currentSong'), 'text', false, t('admin.content.editor.fields.currentSongPlaceholder'))}
          </div>
        </section>
      )}

      {/* Live Channel Specific */}
      {type === 'live' && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-white">{t('admin.content.editor.sections.channelDetails')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('epg_source', t('admin.content.editor.fields.epgSource'), 'url', false, t('admin.content.editor.fields.epgSourcePlaceholder'))}
            {renderField('current_show', t('admin.content.editor.fields.currentShow'), 'text', false, t('admin.content.editor.fields.currentShowPlaceholder'))}
            {renderField('next_show', t('admin.content.editor.fields.nextShow'), 'text', false, t('admin.content.editor.fields.nextShowPlaceholder'))}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              {...register('is_active')}
              disabled={isLoading}
              className="w-4 h-4 rounded border-white/20 bg-white/5"
            />
            <label htmlFor="is_active" className="text-sm text-gray-300">
              {t('admin.content.editor.fields.isActiveLabel')}
            </label>
          </div>
        </section>
      )}

      {/* Form Actions */}
      <div className="flex gap-3 justify-end pt-6 border-t border-white/10">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-6 py-2 rounded-lg border border-white/20 hover:bg-white/10 text-gray-300 font-medium transition-colors disabled:opacity-50"
        >
          <X className="w-4 h-4 inline mr-2" />
          {t('admin.content.editor.actions.cancel')}
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isLoading ? t('admin.content.editor.actions.saving') : t('admin.content.editor.actions.save')}
        </button>
      </div>
    </form>
  )
}
