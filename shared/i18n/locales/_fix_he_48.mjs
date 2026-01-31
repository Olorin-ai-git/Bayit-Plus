import fs from 'fs';
const he = JSON.parse(fs.readFileSync('he.json', 'utf8'));

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && key in target && target[key] instanceof Object && !Array.isArray(source[key])) {
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

const fix = {
  common: {
    filters: "מסננים"
  },
  login: {
    errors: {
      emailRequired: "יש להזין כתובת אימייל",
      passwordRequired: "יש להזין סיסמה",
      googleFailed: "ההתחברות עם גוגל נכשלה. נסו שוב."
    },
    unexpectedError: "אירעה שגיאה לא צפויה"
  },
  flows: {
    flowItems: {
      confirmRemove: "לחצו שוב לאישור ההסרה",
      maxReached: "הגעתם למקסימום של {{max}} פריטים"
    },
    trigger: {
      locationBased: "זמנים לפי המיקום שלכם"
    },
    validation: {
      endTimeRequired: "שעת סיום נדרשת",
      timeRange: "שעת הסיום חייבת להיות אחרי שעת ההתחלה",
      daysRequired: "יש לבחור לפחות יום אחד",
      contentRequired: "הוסיפו תוכן או הפעילו AI"
    }
  },
  profile: {
    devices: {
      minutesAgo_one: "לפני דקה",
      minutesAgo_other: "לפני {{count}} דקות",
      hoursAgo_one: "לפני שעה",
      hoursAgo_other: "לפני {{count}} שעות",
      daysAgo_one: "לפני יום",
      daysAgo_other: "לפני {{count}} ימים",
      disconnectDevice: "נתק מכשיר"
    }
  },
  podcast: {
    selectLanguage: "בחר שפה",
    switchToLanguage: "עבור ל{{language}}",
    premiumRequiredForTranslation: "נדרש מנוי פרימיום לתרגום פודקאסטים",
    player: {
      switchingLanguage: "מחליף..."
    },
    languages: {
      he: {
        short: "עב",
        full: "עברית"
      },
      en: {
        short: "EN",
        full: "אנגלית"
      },
      es: {
        short: "ES",
        full: "ספרדית"
      }
    }
  },
  admin: {
    campaignEdit: {
      subtitle: "עריכת פרטי קמפיין והגדרות"
    },
    auditActions: {
      subscription_deleted: "מנוי נמחק"
    },
    titles: {
      librarian: "סוכן ספרן"
    },
    content: {
      columns: {
        subtitles: "כתוביות"
      }
    },
    librarian: {
      stats: {
        title: "סקירת ביקורת (30 יום)",
        successRate: "אחוז הצלחה",
        fixesApplied: "תיקונים שבוצעו",
        budgetUsed: "תקציב בשימוש",
        budgetLimit: "/ ${{limit}}"
      },
      reports: {
        columns: {
          triggeredBy: "הופעל על ידי",
          parameters: "פרמטרים",
          stats: "בעיות / תיקונים"
        },
        downloadReport: "הורד דוח",
        detailModal: {
          issuesBreakdown: "פירוט בעיות"
        }
      },
      logs: {
        items: "פריטים",
        live: "חי",
        updatedAgo: "עודכן לפני {{time}}",
        justNow: "הרגע",
        emptyState: {
          title: "אין ביקורת פעילה",
          description: "הפעילו ביקורת כדי לראות לוגים בזמן אמת",
          dailyTitle: "ביקורת יומית",
          dailyDescription: "הביקורת היומית האוטומטית תציג לוגים כאן כשתפעל"
        }
      }
    },
    contentEditor: {
      subtitle: "עריכת מטאדטה ומידע של תוכן"
    },
    liveChannels: {
      subtitleSettings: "הגדרות כתוביות שידור חי",
      form: {
        supportsSubtitles: "הפעל כתוביות שידור חי",
        primaryLanguage: "שפה ראשית (מקור)",
        targetLanguages: "שפות תרגום זמינות",
        targetLanguagesHelp: "בחרו לאילו שפות המשתמשים יכולים לתרגם בזמן אמת"
      }
    },
    podcastEpisodes: {
      subtitle: "ניהול פרקי פודקאסט ומטאדטה"
    },
    userDetail: {
      subtitle: "פרטי חשבון משתמש והיסטוריית פעילות"
    },
    subscriptions: {
      actions: {
        changePlan: "שנה מסלול",
        pause: "השהה",
        resume: "חדש",
        cancel: "בטל",
        delete: "מחק"
      }
    }
  }
};

deepMerge(he, fix);
fs.writeFileSync('he.json', JSON.stringify(he, null, 2) + '\n');
console.log('Fixed 48 missing Hebrew keys');
