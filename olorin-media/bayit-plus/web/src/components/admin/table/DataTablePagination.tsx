import { View, Text, Pressable, StyleSheet } from 'react-native';
import { z } from 'zod';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';

const PaginationSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
});

const DataTablePaginationPropsSchema = z.object({
  pagination: PaginationSchema,
  onPageChange: z.function().args(z.number()).optional(),
  isRTL: z.boolean(),
});

export type Pagination = z.infer<typeof PaginationSchema>;

interface DataTablePaginationProps {
  pagination: Pagination;
  onPageChange?: (page: number) => void;
  isRTL: boolean;
}

export default function DataTablePagination({
  pagination,
  onPageChange,
  isRTL
}: DataTablePaginationProps) {
  // Validate props
  DataTablePaginationPropsSchema.parse({ pagination, onPageChange, isRTL });

  const { t } = useTranslation();

  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
  const startItem = (pagination.page - 1) * pagination.pageSize + 1;
  const endItem = Math.min(pagination.page * pagination.pageSize, pagination.total);

  const isFirstPage = pagination.page <= 1;
  const isLastPage = pagination.page >= totalPages;

  const handlePrevious = () => {
    if (!isFirstPage && onPageChange) {
      onPageChange(pagination.page - 1);
    }
  };

  const handleNext = () => {
    if (!isLastPage && onPageChange) {
      onPageChange(pagination.page + 1);
    }
  };

  return (
    <View style={[styles.container, isRTL && styles.containerRTL]}>
      <Text style={styles.infoText}>
        {t('common.showing', 'Showing')} {startItem}-{endItem}{' '}
        {t('common.of', 'of')} {pagination.total}
      </Text>

      <View style={[styles.controls, isRTL && styles.controlsRTL]}>
        <Pressable
          onPress={handlePrevious}
          disabled={isFirstPage}
          style={[
            styles.button,
            isFirstPage && styles.buttonDisabled
          ]}
        >
          {isRTL ? (
            <ChevronRight
              size={16}
              color={isFirstPage ? colors.textMuted : colors.text}
            />
          ) : (
            <ChevronLeft
              size={16}
              color={isFirstPage ? colors.textMuted : colors.text}
            />
          )}
        </Pressable>

        <Text style={styles.pageText}>
          {pagination.page} / {totalPages}
        </Text>

        <Pressable
          onPress={handleNext}
          disabled={isLastPage}
          style={[
            styles.button,
            isLastPage && styles.buttonDisabled
          ]}
        >
          {isRTL ? (
            <ChevronLeft
              size={16}
              color={isLastPage ? colors.textMuted : colors.text}
            />
          ) : (
            <ChevronRight
              size={16}
              color={isLastPage ? colors.textMuted : colors.text}
            />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorderWhite,
  },
  containerRTL: {
    flexDirection: 'row-reverse',
  },
  infoText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  controlsRTL: {
    flexDirection: 'row-reverse',
  },
  button: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  pageText: {
    fontSize: 14,
    color: colors.text,
  },
});
