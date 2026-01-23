/**
 * CreateCategoryModal Component
 *
 * Modal dialog for creating new categories
 * Part of CategoryPicker migration from StyleSheet to TailwindCSS
 *
 * Features:
 * - Input field for category name
 * - Cancel and Create buttons
 * - Loading state during creation
 * - Glass morphism styling
 *
 * Props validated with Zod schema
 */

import { z } from 'zod'
import { GlassInput, GlassModal } from '@bayit/shared/ui'

const CreateCategoryModalPropsSchema = z.object({
  visible: z.boolean(),
  categoryName: z.string(),
  isCreating: z.boolean(),
  titleText: z.string(),
  placeholderText: z.string(),
  cancelText: z.string(),
  createText: z.string(),
  creatingText: z.string(),
  onClose: z.function().returns(z.void()),
  onNameChange: z.function().args(z.string()).returns(z.void()),
  onCreate: z.function().returns(z.void()),
})

export type CreateCategoryModalProps = z.infer<typeof CreateCategoryModalPropsSchema>

export function CreateCategoryModal({
  visible,
  categoryName,
  isCreating,
  titleText,
  placeholderText,
  cancelText,
  createText,
  creatingText,
  onClose,
  onNameChange,
  onCreate,
}: CreateCategoryModalProps) {
  return (
    <GlassModal
      visible={visible}
      type="info"
      title={titleText}
      onClose={onClose}
      dismissable={!isCreating}
      buttons={[
        {
          text: cancelText,
          style: 'cancel',
          onPress: onClose,
        },
        {
          text: isCreating ? creatingText : createText,
          style: 'default',
          onPress: onCreate,
        },
      ]}
    >
      <GlassInput
        value={categoryName}
        onChangeText={onNameChange}
        placeholder={placeholderText}
        autoFocus
        editable={!isCreating}
      />
    </GlassModal>
  )
}
