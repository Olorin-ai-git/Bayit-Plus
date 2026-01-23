import { View, Text, Pressable } from 'react-native';
import clsx from 'clsx';
import { z } from 'zod';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
    <View
      className={clsx(
        'flex flex-row items-center justify-between p-4 border-t border-white/5',
        isRTL && 'flex-row-reverse'
      )}
    >
      <Text className="text-sm text-gray-400">
        {t('common.showing', 'Showing')} {startItem}-{endItem}{' '}
        {t('common.of', 'of')} {pagination.total}
      </Text>

      <View
        className={clsx(
          'flex flex-row items-center gap-2',
          isRTL && 'flex-row-reverse'
        )}
      >
        <Pressable
          onPress={handlePrevious}
          disabled={isFirstPage}
          className={clsx(
            'p-1 rounded-sm bg-white/10',
            isFirstPage && 'opacity-50'
          )}
        >
          {isRTL ? (
            <ChevronRight
              size={16}
              color={isFirstPage ? '#6B7280' : '#FFFFFF'}
            />
          ) : (
            <ChevronLeft
              size={16}
              color={isFirstPage ? '#6B7280' : '#FFFFFF'}
            />
          )}
        </Pressable>

        <Text className="text-sm text-white">
          {pagination.page} / {totalPages}
        </Text>

        <Pressable
          onPress={handleNext}
          disabled={isLastPage}
          className={clsx(
            'p-1 rounded-sm bg-white/10',
            isLastPage && 'opacity-50'
          )}
        >
          {isRTL ? (
            <ChevronLeft
              size={16}
              color={isLastPage ? '#6B7280' : '#FFFFFF'}
            />
          ) : (
            <ChevronRight
              size={16}
              color={isLastPage ? '#6B7280' : '#FFFFFF'}
            />
          )}
        </Pressable>
      </View>
    </View>
  );
}
