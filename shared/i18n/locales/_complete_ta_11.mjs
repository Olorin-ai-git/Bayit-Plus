import fs from 'fs';

const ta = JSON.parse(fs.readFileSync('ta.json', 'utf8'));

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

const translations = {
  "admin": {
    "liveChannels": {
      "form": {
        "currentShow": "தற்போதைய நிகழ்ச்சி",
        "order": "வரிசை",
        "supportsSubtitles": "வசனங்களை ஆதரிக்கிறது",
        "primaryLanguage": "முதன்மை மொழி",
        "targetLanguages": "இலக்கு மொழிகள்",
        "targetLanguagesHelp": "டப்பிங்கிற்கான மொழிகளைத் தேர்ந்தெடுக்கவும்"
      }
    },
    "radioStations": {
      "form": {
        "genre": "வகை",
        "currentShow": "தற்போதைய நிகழ்ச்சி",
        "currentSong": "தற்போதைய பாடல்",
        "order": "வரிசை"
      }
    },
    "podcasts": {
      "episodes": {
        "form": {
          "title": "எபிசோட் தலைப்பு",
          "titlePlaceholder": "எபிசோட் தலைப்பை உள்ளிடவும்",
          "description": "விளக்கம்",
          "descriptionPlaceholder": "எபிசோட் விளக்கம்",
          "audioUrl": "ஆடியோ URL",
          "duration": "கால அளவு (விநாடிகள்)",
          "publishedAt": "வெளியிடப்பட்ட தேதி",
          "isPublished": "வெளியிடப்பட்டது"
        }
      }
    },
    "translation": {
      "columns": {
        "episodeTitle": "எபிசோட் தலைப்பு",
        "retries": "மறு முயற்சிகள்",
        "lastAttempt": "கடைசி முயற்சி"
      },
      "stats": {
        "processing": "செயலாக்கத்தில்"
      }
    },
    "users": {
      "filters": {
        "all": "அனைத்தும்",
        "active": "செயலில்",
        "inactive": "செயலற்றது",
        "blocked": "தடுக்கப்பட்டது"
      }
    },
    "campaigns": {
      "status": {
        "inactive": "செயலற்றது"
      },
      "columns": {
        "discount": "தள்ளுபடி",
        "usage": "பயன்பாடு",
        "validUntil": "செல்லுபடியாகும் வரை",
        "actions": "செயல்கள்"
      },
      "form": {
        "discountType": "தள்ளுபடி வகை",
        "discountValue": "தள்ளுபடி மதிப்பு",
        "maxUses": "அதிகபட்ச பயன்பாடுகள்",
        "validFrom": "இருந்து செல்லுபடி",
        "validUntil": "வரை செல்லுபடி",
        "isActive": "செயலில்"
      }
    },
    "subscriptions": {
      "actions": {
        "changePlan": "திட்டத்தை மாற்று",
        "delete": "நீக்கு"
      }
    },
    "marketingDashboard": {
      "conversionRate": "மாற்ற விகிதம்",
      "recentCampaigns": "சமீபத்திய பிரச்சாரங்கள்"
    },
    "transactions": {
      "filters": {
        "all": "அனைத்தும்"
      }
    },
    "pushNotifications": {
      "columns": {
        "sent": "அனுப்பப்பட்டது",
        "opened": "திறக்கப்பட்டது",
        "created": "உருவாக்கப்பட்டது",
        "actions": "செயல்கள்"
      },
      "filters": {
        "all": "அனைத்தும்"
      }
    }
  }
};

deepMerge(ta, translations);
fs.writeFileSync('ta.json', JSON.stringify(ta, null, 2) + '\n');
console.log('Part 11: Final 43 missing admin keys added - Tamil locale complete!');
