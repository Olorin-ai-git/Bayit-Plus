/**
 * GlassHierarchicalTable Usage Example
 *
 * This example shows how to use the GlassHierarchicalTable component
 * with the Content Library data structure (movies/series with episodes)
 */

import React, { useState } from 'react';
import { View } from 'react-native';
import {
  GlassHierarchicalTable,
  ThumbnailCell,
  TitleCell,
  BadgeCell,
  ActionsCell,
  TextCell,
  createViewAction,
  createEditAction,
  createDeleteAction,
  createStarAction,
  type HierarchicalTableColumn,
  type HierarchicalTableRow,
} from '@bayit/shared/ui';
import { logger } from '../../utils/logger';

// Scoped logger for hierarchical table example
const tableExampleLogger = logger.scope('UI:HierarchicalTableExample');

// ============================================
// Data Types
// ============================================

interface ContentItem {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  category_name?: string;
  year?: number;
  is_series: boolean;
  is_published: boolean;
  is_featured: boolean;
  episode_count?: number;
  available_subtitles?: string[];
}

interface Episode {
  id: string;
  title: string;
  episode_number?: number;
  season_number?: number;
  thumbnail?: string;
  duration?: number;
  is_published: boolean;
}

// ============================================
// Example Component
// ============================================

export const ContentLibraryTableExample: React.FC = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ============================================
  // Column Definitions
  // ============================================

  const columns: HierarchicalTableColumn<ContentItem | Episode>[] = [
    // Thumbnail Column
    {
      key: 'thumbnail',
      label: '',
      width: 80,
      render: (value, row) => (
        <ThumbnailCell
          uri={value}
          type={row.is_series ? 'series' : 'movie'}
          size="medium"
        />
      ),
      renderChild: (value, episode) => (
        <ThumbnailCell
          uri={value}
          type="episode"
          size="small"
        />
      ),
    },

    // Title Column
    {
      key: 'title',
      label: 'Title',
      render: (value, row, level) => {
        if (level === 0) {
          // Parent row (movie/series)
          return (
            <TitleCell
              title={value}
              subtitle={row.is_series ? 'Series' : 'Movie'}
              badge={row.is_series ? `${row.episode_count} episodes` : undefined}
              badgeColor="#a855f7"
            />
          );
        }
        return null;
      },
      renderChild: (value, episode) => (
        <TitleCell
          title={value}
          subtitle={`S${episode.season_number}E${episode.episode_number}`}
        />
      ),
    },

    // Category Column
    {
      key: 'category_name',
      label: 'Category',
      width: 150,
      render: (value) => (
        <TextCell text={value || '-'} align="left" />
      ),
    },

    // Year Column
    {
      key: 'year',
      label: 'Year',
      width: 100,
      align: 'center',
      render: (value) => (
        <TextCell text={value || '-'} align="center" />
      ),
    },

    // Subtitles Column
    {
      key: 'available_subtitles',
      label: 'Subtitles',
      width: 120,
      render: (value) => {
        const count = value?.length || 0;
        return count > 0 ? (
          <BadgeCell
            label={`${count} languages`}
            variant="info"
          />
        ) : (
          <TextCell text="-" muted align="center" />
        );
      },
    },

    // Status Column
    {
      key: 'is_published',
      label: 'Status',
      width: 120,
      align: 'center',
      render: (value) => (
        <BadgeCell
          label={value ? 'Published' : 'Draft'}
          variant={value ? 'success' : 'default'}
        />
      ),
      renderChild: (value) => (
        <BadgeCell
          label={value ? 'Published' : 'Draft'}
          variant={value ? 'success' : 'default'}
        />
      ),
    },

    // Actions Column
    {
      key: 'id',
      label: 'Actions',
      width: 180,
      align: 'right',
      render: (id, row) => (
        <ActionsCell
          actions={[
            createStarAction(
              () => handleToggleFeatured(id),
              row.is_featured
            ),
            createViewAction(() => handleView(id)),
            createEditAction(() => handleEdit(id)),
            createDeleteAction(() => handleDelete(id)),
          ]}
          align="right"
        />
      ),
      renderChild: (id) => (
        <ActionsCell
          actions={[
            createViewAction(() => handleView(id)),
            createEditAction(() => handleEdit(id)),
            createDeleteAction(() => handleDelete(id)),
          ]}
          align="right"
        />
      ),
    },
  ];

  // ============================================
  // Data Transformation
  // ============================================

  // Transform your content data into hierarchical rows
  const transformContentToRows = (
    content: ContentItem[],
    episodes: Record<string, Episode[]>
  ): HierarchicalTableRow<ContentItem | Episode>[] => {
    return content.map(item => ({
      id: item.id,
      data: item,
      children: item.is_series && episodes[item.id]
        ? episodes[item.id].map(episode => ({
            id: episode.id,
            data: episode,
          }))
        : undefined,
    }));
  };

  // ============================================
  // Example Data
  // ============================================

  const sampleContent: ContentItem[] = [
    {
      id: '1',
      title: 'Twisters',
      thumbnail: 'https://example.com/twisters.jpg',
      category_name: 'Action',
      year: 2024,
      is_series: false,
      is_published: true,
      is_featured: false,
      available_subtitles: ['en', 'he', 'es'],
    },
    {
      id: '2',
      title: 'Mr and Mrs Smith',
      thumbnail: 'https://example.com/smith.jpg',
      category_name: 'Drama',
      year: 2024,
      is_series: true,
      is_published: true,
      is_featured: false,
      episode_count: 2,
      available_subtitles: [],
    },
  ];

  const sampleEpisodes: Record<string, Episode[]> = {
    '2': [
      {
        id: '2-e1',
        title: 'Mr and Mrs Smith S01E07',
        episode_number: 7,
        season_number: 1,
        thumbnail: 'https://example.com/s01e07.jpg',
        duration: 45,
        is_published: true,
      },
      {
        id: '2-e2',
        title: 'Mr and Mrs Smith S01E08',
        episode_number: 8,
        season_number: 1,
        thumbnail: 'https://example.com/s01e08.jpg',
        duration: 47,
        is_published: true,
      },
    ],
  };

  const rows = transformContentToRows(sampleContent, sampleEpisodes);

  // ============================================
  // Handlers
  // ============================================

  const handleView = (id: string) => {
    tableExampleLogger.info('View action', { id });
  };

  const handleEdit = (id: string) => {
    tableExampleLogger.info('Edit action', { id });
  };

  const handleDelete = (id: string) => {
    tableExampleLogger.info('Delete action', { id });
  };

  const handleToggleFeatured = (id: string) => {
    tableExampleLogger.info('Toggle featured action', { id });
  };

  // ============================================
  // Render
  // ============================================

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <GlassHierarchicalTable
        columns={columns}
        rows={rows}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        expandable
        defaultExpandAll={false}
        pagination={{
          page: 1,
          pageSize: 10,
          total: 50,
        }}
        onPageChange={(page) => tableExampleLogger.info('Page change', { page })}
        emptyMessage="No content found"
        isRTL={false}
      />
    </View>
  );
};

export default ContentLibraryTableExample;
