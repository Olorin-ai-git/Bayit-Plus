/**
 * ColumnRenderers - Render functions for table column cells
 * Separates rendering logic from column definitions
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassTableCell } from '@bayit/shared/ui/web';
import type { ContentItem, Episode } from './TreeRow';
import {
  ContentTitleCell,
  EpisodeTitleCell,
  ActionButtons,
  SubtitlesCell,
  SelectionCell,
  ContentThumbnail,
  EpisodeThumbnail,
} from './TreeRow';
import { getLanguageFlag, getLanguageName } from './TreeActions';
import { TreeNode } from './TreeNode';

export type TableRow = ({ rowType: 'content' } & ContentItem) | ({ rowType: 'episode'; parentId: string } & Episode);

interface RenderContext {
  t: (key: string, options?: any) => string;
  isRTL: boolean;
  expandedSeries: Set<string>;
  episodeCache: Record<string, Episode[]>;
  loadingEpisodes: Set<string>;
  toggleExpand: (seriesId: string) => Promise<void>;
  onTogglePublish: (id: string) => void;
  onToggleFeatured: (id: string) => void;
  onDelete: (id: string) => void;
}

export function renderExpandCell(row: TableRow, context: RenderContext) {
  if (row.rowType === 'episode') {
    return <View style={styles.expandPlaceholder} />;
  }
  const item = row as ContentItem & { rowType: 'content' };
  return (
    <TreeNode
      seriesId={item.id}
      isSeries={item.is_series}
      isExpanded={context.expandedSeries.has(item.id)}
      isLoading={context.loadingEpisodes.has(item.id)}
      episodes={context.episodeCache[item.id] || []}
      onToggleExpand={context.toggleExpand}
      t={context.t}
    />
  );
}

export function renderThumbnailCell(row: TableRow, context: RenderContext) {
  if (row.rowType === 'episode') {
    return <EpisodeThumbnail episode={row as Episode & { rowType: 'episode' }} isRTL={context.isRTL} />;
  }
  return <ContentThumbnail item={row as ContentItem & { rowType: 'content' }} isRTL={context.isRTL} />;
}

export function renderTitleCell(row: TableRow, context: RenderContext) {
  if (row.rowType === 'episode') {
    return <EpisodeTitleCell episode={row as Episode & { rowType: 'episode' }} isRTL={context.isRTL} />;
  }
  return <ContentTitleCell item={row as ContentItem & { rowType: 'content' }} isRTL={context.isRTL} t={context.t} />;
}

export function renderCategoryCell(row: TableRow, context: RenderContext) {
  const textStyle = [
    styles.categoryText,
    context.isRTL ? styles.textRight : styles.textLeft,
  ];

  if (row.rowType === 'episode') {
    return <Text style={[textStyle, styles.categoryMuted]}>-</Text>;
  }
  const item = row as ContentItem & { rowType: 'content' };
  return (
    <Text style={textStyle}>
      {item.category_name || '-'}
    </Text>
  );
}

export function renderYearCell(row: TableRow, context: RenderContext) {
  const textStyle = [
    styles.yearText,
    context.isRTL ? styles.textRight : styles.textLeft,
  ];

  if (row.rowType === 'episode') {
    return <Text style={[textStyle, styles.yearMuted]}>-</Text>;
  }
  const item = row as ContentItem & { rowType: 'content' };
  return (
    <Text style={textStyle}>{item.year || '-'}</Text>
  );
}

export function renderSubtitlesCell(row: TableRow, context: RenderContext) {
  const textStyle = [
    styles.subtitlesText,
    context.isRTL ? styles.textRight : styles.textLeft,
  ];

  if (row.rowType === 'episode') {
    return <Text style={[textStyle, styles.subtitlesMuted]}>-</Text>;
  }
  const item = row as ContentItem & { rowType: 'content' };
  return (
    <SubtitlesCell
      subtitles={item.available_subtitles || []}
      isRTL={context.isRTL}
      getLanguageFlag={getLanguageFlag}
      getLanguageName={getLanguageName}
    />
  );
}

export function renderStatusCell(row: TableRow, context: RenderContext) {
  const isPublished = row.is_published;
  return (
    <GlassTableCell.Badge variant={isPublished ? 'success' : 'default'}>
      {isPublished ? context.t('admin.content.status.published') : context.t('admin.content.status.draft')}
    </GlassTableCell.Badge>
  );
}

export function renderActionsCell(row: TableRow, context: RenderContext) {
  return (
    <ActionButtons
      id={row.id}
      is_published={row.is_published}
      is_featured={row.is_featured}
      isEpisode={row.rowType === 'episode'}
      onTogglePublish={context.onTogglePublish}
      onToggleFeatured={context.onToggleFeatured}
      onDelete={context.onDelete}
      t={context.t}
    />
  );
}

export function renderSelectionCell(row: TableRow, selectedSet: Set<string>, handleSelectRow: (id: string) => void) {
  if (row.rowType === 'episode') {
    return <View style={styles.selectionPlaceholder} />;
  }
  return <SelectionCell id={row.id} checked={selectedSet.has(row.id)} onChange={handleSelectRow} />;
}

const styles = StyleSheet.create({
  expandPlaceholder: {
    width: 28,
    height: 28,
  },
  selectionPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  categoryText: {
    fontSize: 14,
    color: 'rgb(229, 229, 229)',
  },
  categoryMuted: {
    color: 'rgb(156, 163, 175)',
  },
  textLeft: {
    textAlign: 'left',
  },
  textRight: {
    textAlign: 'right',
  },
  yearText: {
    fontSize: 14,
    color: 'rgb(229, 229, 229)',
  },
  yearMuted: {
    color: 'rgb(156, 163, 175)',
  },
  subtitlesText: {
    fontSize: 14,
    color: 'rgb(156, 163, 175)',
  },
  subtitlesMuted: {
    color: 'rgb(156, 163, 175)',
  },
});
