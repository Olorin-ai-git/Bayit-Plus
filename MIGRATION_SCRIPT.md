# StyleSheet to TailwindCSS Migration Guide

## Conversion Map

### Layout
- `flex: 1` → `flex-1`
- `flexDirection: 'row'` → `flex-row`
- `flexDirection: 'column'` → `flex-col`
- `flexWrap: 'wrap'` → `flex-wrap`
- `justifyContent: 'center'` → `justify-center`
- `justifyContent: 'space-between'` → `justify-between`
- `justifyContent: 'flex-end'` → `justify-end`
- `alignItems: 'center'` → `items-center`
- `alignSelf: 'flex-start'` → `self-start`

### Spacing
- `padding: spacing.lg` → `p-4`
- `paddingHorizontal: spacing.md` → `px-3`
- `paddingVertical: spacing.sm` → `py-2`
- `margin: spacing.md` → `m-3`
- `marginBottom: spacing.lg` → `mb-4`
- `gap: spacing.sm` → `gap-2`

### Colors & Backgrounds
- `backgroundColor: colors.glass` → `bg-black/20 backdrop-blur-xl`
- `backgroundColor: colors.primary` → `bg-purple-600`
- `backgroundColor: colors.secondary` → `bg-blue-500`
- `backgroundColor: colors.success` → `bg-green-500`
- `backgroundColor: colors.error` → `bg-red-500`
- `backgroundColor: colors.warning` → `bg-yellow-500`
- `backgroundColor: colors.backgroundLighter` → `bg-gray-800`

### Borders
- `borderRadius: borderRadius.md` → `rounded-md`
- `borderRadius: borderRadius.lg` → `rounded-lg`
- `borderRadius: borderRadius.sm` → `rounded-sm`
- `borderWidth: 1` → `border`
- `borderColor: colors.glassBorder` → `border-white/10`

### Text
- `fontSize: fontSize.xs` → `text-xs`
- `fontSize: fontSize.sm` → `text-sm`
- `fontSize: fontSize.md` → `text-base`
- `fontSize: fontSize.lg` → `text-lg`
- `fontSize: fontSize.xl` → `text-xl`
- `fontWeight: '600'` → `font-semibold`
- `fontWeight: 'bold'` → `font-bold`
- `color: colors.text` → `text-white`
- `color: colors.textSecondary` → `text-gray-400`
- `color: colors.textMuted` → `text-gray-500`
- `textTransform: 'capitalize'` → `capitalize`

### Dimensions
- `width: 30` → `w-[30px]`
- `height: 30` → `h-[30px]`
- `maxWidth: 500` → `max-w-[500px]`

### Dynamic Styles (Keep as inline style)
- `style={{ backgroundColor: getStatusColor(status) + '20' }}` → Keep as is
- `style={{ color: getStatusColor(status) }}` → Keep as is
