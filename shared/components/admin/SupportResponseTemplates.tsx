/**
 * Support Response Templates
 * Pre-defined response templates for admin support
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui';
import { colors, spacing, borderRadius } from '../../theme';
import { useDirection } from '../../hooks/useDirection';
import { isTV } from '../../utils/platform';

interface SupportResponseTemplatesProps {
  onSelect: (template: string) => void;
  onClose: () => void;
  language: string;
}

interface TemplateCategory {
  id: string;
  labelKey: string;
  templates: Template[];
}

interface Template {
  id: string;
  labelKey: string;
  content: Record<string, string>;
}

const templateCategories: TemplateCategory[] = [
  {
    id: 'acknowledgment',
    labelKey: 'admin.templates.category.acknowledgment',
    templates: [
      {
        id: 'received',
        labelKey: 'admin.templates.received',
        content: {
          en: 'Thank you for contacting Bayit+ support. We have received your request and are looking into it. You can expect a response within 24 hours.',
          he: 'תודה שפנית לתמיכת Bayit+. קיבלנו את פנייתך ואנחנו בודקים אותה. תוכל לצפות לתשובה תוך 24 שעות.',
          es: 'Gracias por contactar al soporte de Bayit+. Hemos recibido tu solicitud y la estamos revisando. Puedes esperar una respuesta dentro de 24 horas.',
        },
      },
      {
        id: 'investigating',
        labelKey: 'admin.templates.investigating',
        content: {
          en: 'We are currently investigating your issue and will update you as soon as we have more information.',
          he: 'אנחנו כרגע בודקים את הבעיה שלך ונעדכן אותך ברגע שיהיה לנו מידע נוסף.',
          es: 'Actualmente estamos investigando tu problema y te actualizaremos tan pronto como tengamos más información.',
        },
      },
    ],
  },
  {
    id: 'billing',
    labelKey: 'admin.templates.category.billing',
    templates: [
      {
        id: 'refund_processed',
        labelKey: 'admin.templates.refundProcessed',
        content: {
          en: 'Your refund has been processed and should appear in your account within 5-10 business days. If you have any questions, please let us know.',
          he: 'החזר הכספי שלך עובד ואמור להופיע בחשבונך תוך 5-10 ימי עסקים. אם יש לך שאלות, אנא עדכן אותנו.',
          es: 'Tu reembolso ha sido procesado y debería aparecer en tu cuenta dentro de 5-10 días hábiles. Si tienes alguna pregunta, por favor háznoslo saber.',
        },
      },
      {
        id: 'subscription_info',
        labelKey: 'admin.templates.subscriptionInfo',
        content: {
          en: 'You can manage your subscription from the Settings > Account section in the app. There you can upgrade, downgrade, or cancel your plan at any time.',
          he: 'ניתן לנהל את המנוי שלך מתוך הגדרות > חשבון באפליקציה. שם תוכל לשדרג, להוריד דרגה או לבטל את התוכנית שלך בכל עת.',
          es: 'Puedes administrar tu suscripción desde Configuración > Cuenta en la aplicación. Allí puedes actualizar, degradar o cancelar tu plan en cualquier momento.',
        },
      },
    ],
  },
  {
    id: 'technical',
    labelKey: 'admin.templates.category.technical',
    templates: [
      {
        id: 'clear_cache',
        labelKey: 'admin.templates.clearCache',
        content: {
          en: 'Please try clearing the app cache and restarting the application. On most devices, you can do this from Settings > Apps > Bayit+ > Clear Cache.',
          he: 'אנא נסה לנקות את מטמון האפליקציה ולהפעיל מחדש את האפליקציה. ברוב המכשירים, ניתן לעשות זאת מהגדרות > אפליקציות > Bayit+ > נקה מטמון.',
          es: 'Por favor, intenta borrar el caché de la aplicación y reiniciarla. En la mayoría de los dispositivos, puedes hacer esto desde Configuración > Aplicaciones > Bayit+ > Borrar caché.',
        },
      },
      {
        id: 'update_app',
        labelKey: 'admin.templates.updateApp',
        content: {
          en: 'Please ensure you are using the latest version of the Bayit+ app. You can update it from your device\'s app store. This often resolves many technical issues.',
          he: 'אנא ודא שאתה משתמש בגרסה העדכנית ביותר של אפליקציית Bayit+. תוכל לעדכן אותה מחנות האפליקציות של המכשיר שלך. זה לעתים קרובות פותר בעיות טכניות רבות.',
          es: 'Por favor, asegúrate de estar usando la última versión de la aplicación Bayit+. Puedes actualizarla desde la tienda de aplicaciones de tu dispositivo. Esto a menudo resuelve muchos problemas técnicos.',
        },
      },
      {
        id: 'check_connection',
        labelKey: 'admin.templates.checkConnection',
        content: {
          en: 'Streaming issues are often related to internet connectivity. Please check your network connection and try again. A minimum of 5 Mbps is recommended for HD streaming.',
          he: 'בעיות הזרמה קשורות לעתים קרובות לחיבור האינטרנט. אנא בדוק את חיבור הרשת שלך ונסה שוב. מומלץ מינימום של 5 Mbps להזרמה ב-HD.',
          es: 'Los problemas de transmisión a menudo están relacionados con la conectividad a Internet. Por favor, verifica tu conexión de red e inténtalo de nuevo. Se recomienda un mínimo de 5 Mbps para transmisión en HD.',
        },
      },
    ],
  },
  {
    id: 'resolution',
    labelKey: 'admin.templates.category.resolution',
    templates: [
      {
        id: 'issue_resolved',
        labelKey: 'admin.templates.issueResolved',
        content: {
          en: 'We\'re happy to confirm that your issue has been resolved. If you experience any further problems, please don\'t hesitate to reach out.',
          he: 'אנחנו שמחים לאשר שהבעיה שלך נפתרה. אם תיתקל בבעיות נוספות, אנא אל תהסס לפנות אלינו.',
          es: 'Nos complace confirmar que tu problema ha sido resuelto. Si experimentas más problemas, no dudes en contactarnos.',
        },
      },
      {
        id: 'escalated',
        labelKey: 'admin.templates.escalated',
        content: {
          en: 'Your case has been escalated to our senior support team for further investigation. They will contact you directly within 48 hours.',
          he: 'המקרה שלך הועבר לצוות התמיכה הבכיר שלנו לבדיקה נוספת. הם יצרו איתך קשר ישירות תוך 48 שעות.',
          es: 'Tu caso ha sido escalado a nuestro equipo de soporte senior para una investigación adicional. Te contactarán directamente dentro de 48 horas.',
        },
      },
    ],
  },
];

export const SupportResponseTemplates: React.FC<SupportResponseTemplatesProps> = ({
  onSelect,
  onClose,
  language,
}) => {
  const { t } = useTranslation();
  const { textAlign } = useDirection();
  const [selectedCategory, setSelectedCategory] = useState(templateCategories[0].id);
  const [focusedTemplate, setFocusedTemplate] = useState<string | null>(null);

  const currentCategory = templateCategories.find((c) => c.id === selectedCategory);

  const handleSelectTemplate = (template: Template) => {
    const content = template.content[language] || template.content.en;
    onSelect(content);
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <GlassView style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { textAlign }]}>
              {t('admin.templates.title', 'Response Templates')}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Category Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
            contentContainerStyle={styles.categoriesContent}
          >
            {templateCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                onPress={() => setSelectedCategory(category.id)}
                style={[
                  styles.categoryTab,
                  selectedCategory === category.id && styles.categoryTabActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    selectedCategory === category.id && styles.categoryTabTextActive,
                  ]}
                >
                  {t(category.labelKey, category.id)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Templates List */}
          <ScrollView
            style={styles.templatesList}
            contentContainerStyle={styles.templatesContent}
          >
            {currentCategory?.templates.map((template) => (
              <TouchableOpacity
                key={template.id}
                onPress={() => handleSelectTemplate(template)}
                onFocus={() => setFocusedTemplate(template.id)}
                onBlur={() => setFocusedTemplate(null)}
                style={[
                  styles.templateItem,
                  focusedTemplate === template.id && styles.templateItemFocused,
                ]}
              >
                <Text style={[styles.templateLabel, { textAlign }]}>
                  {t(template.labelKey, template.id)}
                </Text>
                <Text
                  style={[styles.templatePreview, { textAlign }]}
                  numberOfLines={2}
                >
                  {template.content[language] || template.content.en}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Cancel Button */}
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>
              {t('common.cancel', 'Cancel')}
            </Text>
          </TouchableOpacity>
        </GlassView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modal: {
    width: '100%',
    maxWidth: isTV ? 600 : 500,
    maxHeight: '80%',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: isTV ? 22 : 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    width: isTV ? 36 : 28,
    height: isTV ? 36 : 28,
    borderRadius: isTV ? 18 : 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: isTV ? 18 : 14,
    color: colors.text,
  },
  categoriesScroll: {
    marginBottom: spacing.md,
  },
  categoriesContent: {
    gap: spacing.sm,
  },
  categoryTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.full,
  },
  categoryTabActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  categoryTabText: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
  },
  categoryTabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  templatesList: {
    flex: 1,
  },
  templatesContent: {
    gap: spacing.sm,
  },
  templateItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  templateItemFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  templateLabel: {
    fontSize: isTV ? 16 : 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  templatePreview: {
    fontSize: isTV ? 13 : 11,
    color: colors.textSecondary,
    lineHeight: isTV ? 18 : 16,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  cancelButtonText: {
    fontSize: isTV ? 14 : 12,
    fontWeight: '600',
    color: colors.text,
  },
});

export default SupportResponseTemplates;
