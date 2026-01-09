import React, { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { AlertCircle, Save, X } from 'lucide-react'
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
          {(errors[name as keyof FormData]?.message || `${label} is required`)}
        </p>
      )}
    </div>
  )

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
      {/* Basic Information */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderField('title', 'Title', 'text', true, 'Content title')}
          {type !== 'radio' && type !== 'podcast' && renderField('year', 'Year', 'number', false, '2024')}
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-white mb-2">
            Description
          </label>
          <textarea
            id="description"
            {...register('description')}
            placeholder="Content description"
            disabled={isLoading}
            rows={4}
            className="w-full px-4 py-2 rounded-lg border border-white/20 bg-white/5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 transition-colors"
          />
        </div>
      </section>

      {/* Images */}
      {type !== 'radio' && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Media</h3>
          <Controller
            control={control}
            name="thumbnail"
            render={({ field }) => (
              <ImageUploader
                value={field.value}
                onChange={field.onChange}
                label={type === 'podcast' ? 'Podcast Cover' : 'Thumbnail (3:4 aspect ratio)'}
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
                  label="Backdrop (16:9 aspect ratio)"
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
                  label="Channel Logo"
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
                  label="Station Logo"
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
          <h3 className="text-lg font-semibold text-white">Streaming</h3>
          <Controller
            control={control}
            name="stream_url"
            render={({ field }) => (
              <StreamUrlInput
                value={field.value}
                onChange={field.onChange}
                onStreamTypeChange={(st) => setValue('stream_type', st)}
                label="Stream URL"
                required
              />
            )}
          />
          {(type === 'vod' || type === 'live') && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white">DRM Protected</label>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_drm_protected"
                  {...register('is_drm_protected')}
                  disabled={isLoading}
                  className="w-4 h-4 rounded border-white/20 bg-white/5"
                />
                <label htmlFor="is_drm_protected" className="text-sm text-gray-300">
                  This content requires DRM protection
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
                label="Category"
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
          <h3 className="text-lg font-semibold text-white">Content Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('duration', 'Duration', 'text', false, '1:30:00')}
            {renderField('rating', 'Rating', 'text', false, 'PG-13')}
            {renderField('genre', 'Genre', 'text', false, 'Drama')}
            {renderField('director', 'Director', 'text', false, 'Director name')}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">Series</label>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_series"
                {...register('is_series')}
                disabled={isLoading}
                className="w-4 h-4 rounded border-white/20 bg-white/5"
              />
              <label htmlFor="is_series" className="text-sm text-gray-300">
                This is a series/multi-part content
              </label>
            </div>
          </div>

          {isSeries && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderField('season', 'Season', 'number')}
              {renderField('episode', 'Episode', 'number')}
              {renderField('series_id', 'Series ID', 'text', false, 'series-identifier')}
            </div>
          )}
        </section>
      )}

      {/* Publishing Options */}
      {type !== 'episode' && type !== 'radio' && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Publishing</h3>
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
                Publish this content immediately
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
                  Feature this content on homepage
                </label>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Subscription & Kids */}
      {(type === 'vod' || type === 'live') && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Access Control</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="requires_subscription" className="block text-sm font-medium text-white">
                Required Subscription
              </label>
              <select
                id="requires_subscription"
                {...register('requires_subscription')}
                disabled={isLoading}
                className="w-full px-4 py-2 rounded-lg border border-white/20 bg-white/5 text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 transition-colors"
              >
                <option value="basic">Basic</option>
                <option value="premium">Premium</option>
                <option value="family">Family</option>
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
                This is kids-friendly content
              </label>
            </div>
          )}
        </section>
      )}

      {/* Podcast Specific */}
      {type === 'podcast' && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Podcast Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('author', 'Author', 'text', false, 'Podcast author')}
            {renderField('category', 'Category', 'text', false, 'News, Science, etc.')}
            {renderField('rss_feed', 'RSS Feed URL', 'url', false, 'https://example.com/feed.xml')}
            {renderField('website', 'Website URL', 'url', false, 'https://example.com')}
          </div>
        </section>
      )}

      {/* Episode Specific */}
      {type === 'episode' && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Episode Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('episode_number', 'Episode #', 'number')}
            {renderField('season_number', 'Season #', 'number')}
            {renderField('duration', 'Duration', 'text', false, '45:30')}
          </div>
          <div className="space-y-2">
            <label htmlFor="audio_url" className="block text-sm font-medium text-white">
              Audio URL
              <span className="text-red-400">*</span>
            </label>
            <input
              id="audio_url"
              {...register('audio_url', { required: 'Audio URL is required' })}
              type="url"
              placeholder="https://example.com/episode.mp3"
              disabled={isLoading}
              className="w-full px-4 py-2 rounded-lg border border-white/20 bg-white/5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="published_at" className="block text-sm font-medium text-white">
              Published Date
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
          <h3 className="text-lg font-semibold text-white">Station Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('genre', 'Genre', 'text', false, 'Electronic, News, etc.')}
            {renderField('current_show', 'Current Show', 'text', false, 'Show name')}
            {renderField('current_song', 'Current Song', 'text', false, 'Song title')}
          </div>
        </section>
      )}

      {/* Live Channel Specific */}
      {type === 'live' && (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Channel Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('epg_source', 'EPG Source URL', 'url', false, 'https://example.com/epg.xml')}
            {renderField('current_show', 'Current Show', 'text', false, 'Show name')}
            {renderField('next_show', 'Next Show', 'text', false, 'Show name')}
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
              Channel is active
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
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isLoading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  )
}
