import fs from 'fs';

const ta = JSON.parse(fs.readFileSync('ta.json', 'utf8'));

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      deepMerge(target[key], source[key]);
    } else if (!(key in target)) {
      target[key] = source[key];
    }
  }
  return target;
}

const additions = {
  admin: {
    liveChannels: {
      form: {
        currentShow: "தற்போதைய நிகழ்ச்சி",
        order: "வரிசை",
        supportsSubtitles: "நேரடி வசன உரைகளை இயக்கு",
        primaryLanguage: "முதன்மை மொழி (மூலம்)",
        targetLanguages: "கிடைக்கும் மொழிபெயர்ப்பு மொழிகள்",
        targetLanguagesHelp: "பயனர்கள் நிகழ்நேரத்தில் எந்த மொழிகளுக்கு மொழிபெயர்க்கலாம் என்பதைத் தேர்ந்தெடுக்கவும்"
      }
    },
    radioStations: {
      form: {
        genre: "வகை",
        currentShow: "தற்போதைய நிகழ்ச்சி (விருப்பத்திற்கு)",
        currentSong: "தற்போதைய பாடல் (விருப்பத்திற்கு)",
        order: "வரிசை"
      }
    },
    podcasts: {
      episodes: {
        form: {
          title: "அத்தியாயத் தலைப்பு",
          description: "விளக்கம்",
          episodeNumber: "அத்தியாய எண்",
          seasonNumber: "பருவ எண் (விருப்பத்திற்கு)",
          duration: "கால அளவு",
          audioUrl: "ஒலி URL (தேவை)",
          publishedDate: "வெளியிட்ட தேதி (YYYY-MM-DD)"
        }
      }
    },
    translation: {
      columns: {
        episodeTitle: "அத்தியாயம்",
        retries: "மறுமுயற்சிகள்",
        lastAttempt: "கடைசி முயற்சி"
      },
      stats: {
        processing: "செயலாக்கம்"
      }
    },
    users: {
      filters: {
        all: "அனைத்தும்",
        active: "செயலில்",
        inactive: "செயலற்றது",
        blocked: "தடுக்கப்பட்டது"
      }
    },
    campaigns: {
      status: {
        inactive: "செயலற்றது"
      },
      columns: {
        discount: "தள்ளுபடி",
        usage: "பயன்பாடுகள்",
        validUntil: "செல்லுபடியாகும் வரை",
        actions: "செயல்கள்"
      },
      form: {
        code: "கூப்பன் குறியீடு",
        generate: "உருவாக்கு",
        discountType: "தள்ளுபடி வகை",
        discountValue: "தள்ளுபடி மதிப்பு",
        maxUses: "அதிகபட்ச பயன்பாடுகள்",
        unlimited: "வரம்பற்றது",
        validUntil: "செல்லுபடியாகும் வரை",
        active: "பிரச்சாரம் செயலில்"
      }
    },
    subscriptions: {
      actions: {
        changePlan: "திட்டத்தை மாற்று",
        delete: "நீக்கு"
      },
      editPlan: {
        title: "சந்தா திட்டத்தை மாற்று",
        user: "பயனர்",
        currentPlan: "தற்போதைய திட்டம்",
        newPlan: "புதிய திட்டத்தைத் தேர்ந்தெடுக்கவும்"
      },
      addSubscription: {
        title: "சந்தாவைச் சேர்",
        userEmail: "பயனர் மின்னஞ்சல்",
        emailPlaceholder: "பயனர் மின்னஞ்சலை உள்ளிடவும்",
        duration: "கால அளவு (நாட்கள்)",
        selectPlan: "திட்டத்தைத் தேர்ந்தெடுக்கவும்"
      }
    },
    marketingDashboard: {
      campaignStatus: {
        active: "செயலில்",
        completed: "நிறைவடைந்தது",
        scheduled: "திட்டமிடப்பட்டது",
        draft: "வரைவு"
      }
    },
    transactions: {
      filters: {
        all: "அனைத்தும்"
      }
    },
    pushNotifications: {
      columns: {
        sent: "அனுப்பப்பட்டது",
        opened: "திறக்கப்பட்டது",
        created: "உருவாக்கப்பட்டது",
        actions: "செயல்கள்"
      },
      filters: {
        all: "அனைத்தும்"
      }
    }
  }
};

deepMerge(ta, additions);

fs.writeFileSync('ta.json', JSON.stringify(ta, null, 2) + '\n');
console.log('Fixed ta.json - added 43 missing admin keys');
