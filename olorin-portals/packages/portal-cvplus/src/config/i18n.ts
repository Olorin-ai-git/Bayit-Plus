import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      nav: {
        home: 'Home',
        features: 'Features',
        useCases: 'Use Cases',
        solutions: 'Solutions',
        pricing: 'Pricing',
        demo: 'Demo',
        contact: 'Contact',
        getStarted: 'Get Started',
        pricingDescription: 'Flexible plans for every career stage',
        demoDescription: 'See CVPlus in action',
        contactDescription: 'Get in touch with our team',
      },
      hero: {
        title: 'AI-POWERED CAREER ACCELERATION',
        subtitle: 'Transform your career with next-gen AI resume enhancement and job matching',
        cta: 'EXPLORE CVPLUS',
      },
      features: {
        enhancement: {
          title: 'INTELLIGENT RESUME ENHANCEMENT',
          keyword: {
            title: 'AI-DRIVEN KEYWORD OPTIMIZATION',
            description: 'Automatically identify and integrate industry-specific keywords',
          },
          skillGap: {
            title: 'SKILL GAP ANALYSIS',
            description: 'Identify missing skills and get personalized recommendations',
          },
          formatting: {
            title: 'FORMATTING & DESIGN IMPROVEMENT',
            description: 'Professional formatting with ATS compatibility',
          },
        },
        matching: {
          title: 'ADVANCED JOB MATCHING',
          personalized: {
            title: 'PERSONALIZED JOB RECOMMENDATIONS',
            description: 'AI-powered matching based on your skills and preferences',
          },
          culture: {
            title: 'COMPANY CULTURE FIT ANALYSIS',
            description: 'Find companies that align with your values',
          },
          salary: {
            title: 'SALARY INSIGHTS & NEGOTIATION',
            description: 'Data-driven salary insights and negotiation strategies',
          },
        },
        growth: {
          title: 'CAREER GROWTH TOOLS',
          interview: {
            title: 'INTERVIEW PREPARATION AI',
            description: 'Practice with AI-powered interview simulations',
          },
          presence: {
            title: 'ONLINE PRESENCE OPTIMIZATION',
            description: 'Optimize your LinkedIn and professional profiles',
          },
          learning: {
            title: 'CONTINUOUS LEARNING PATHS',
            description: 'Personalized skill development roadmaps',
          },
        },
      },
      footer: {
        companyDescription: 'AI-powered career acceleration platform transforming how professionals advance their careers',
      },
      a11y: {
        skipToContent: 'Skip to main content',
        mainContent: 'Main content',
      },
    },
  },
  he: {
    translation: {
      nav: {
        home: 'בית',
        features: 'תכונות',
        useCases: 'מקרי שימוש',
        solutions: 'פתרונות',
        pricing: 'תמחור',
        demo: 'הדגמה',
        contact: 'צור קשר',
        getStarted: 'התחל',
        pricingDescription: 'תוכניות גמישות לכל שלב בקריירה',
        demoDescription: 'ראה את CVPlus בפעולה',
        contactDescription: 'צור קשר עם הצוות שלנו',
      },
      hero: {
        title: 'האצת קריירה מונעת AI',
        subtitle: 'שנה את הקריירה שלך עם שיפור קורות חיים והתאמת משרות מהדור הבא',
        cta: 'חקור את CVPLUS',
      },
      features: {
        enhancement: {
          title: 'שיפור קורות חיים אינטליגנטי',
          keyword: {
            title: 'אופטימיזציית מילות מפתח מונעת AI',
            description: 'זיהוי ושילוב אוטומטי של מילות מפתח ספציפיות לתעשייה',
          },
          skillGap: {
            title: 'ניתוח פערי מיומנויות',
            description: 'זהה מיומנויות חסרות וקבל המלצות מותאמות אישית',
          },
          formatting: {
            title: 'שיפור עיצוב ופורמט',
            description: 'עיצוב מקצועי עם תאימות למערכות ATS',
          },
        },
        matching: {
          title: 'התאמת משרות מתקדמת',
          personalized: {
            title: 'המלצות משרות מותאמות אישית',
            description: 'התאמה מונעת AI על בסיס המיומנויות וההעדפות שלך',
          },
          culture: {
            title: 'ניתוח התאמה לתרבות ארגונית',
            description: 'מצא חברות המתאימות לערכים שלך',
          },
          salary: {
            title: 'תובנות שכר ומשא ומתן',
            description: 'תובנות שכר מבוססות נתונים ואסטרטגיות משא ומתן',
          },
        },
        growth: {
          title: 'כלי צמיחה בקריירה',
          interview: {
            title: 'הכנה לראיון עבודה עם AI',
            description: 'תרגול עם סימולציות ראיון מונעות AI',
          },
          presence: {
            title: 'אופטימיזציית נוכחות מקוונת',
            description: 'שפר את LinkedIn והפרופילים המקצועיים שלך',
          },
          learning: {
            title: 'מסלולי למידה מתמשכים',
            description: 'מפות דרכים לפיתוח מיומנויות מותאמות אישית',
          },
        },
      },
      footer: {
        companyDescription: 'פלטפורמת האצת קריירה מונעת AI המשנה את האופן שבו אנשי מקצוע מתקדמים בקריירה',
      },
      a11y: {
        skipToContent: 'דלג לתוכן הראשי',
        mainContent: 'תוכן ראשי',
      },
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
