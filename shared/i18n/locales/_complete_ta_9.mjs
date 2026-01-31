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
  "children": {
    "emptyHint": "மற்றொரு வகையை முயற்சிக்கவும்"
  },
  "cities": {
    "beta": {
      "settings": {
        "title": "பீட்டா திட்டங்கள்",
        "description": "உங்கள் பீட்டா 500 பதிவை நிர்வகித்து திட்ட விவரங்களைக் காணுங்கள். AI-இயக்கும் அம்சங்களுக்கு முன்கூட்டியே அணுகல் பெறுங்கள்.",
        "enrolledTitle": "நீங்கள் பீட்டா 500 இல் உள்ளீர்கள்!",
        "statusPendingVerification": "சரிபார்ப்பு நிலுவையில்",
        "statusActive": "செயலில்",
        "statusExpired": "காலாவதியானது",
        "pendingMessage": "உங்கள் பதிவை சரிபார்க்கிறோம். அங்கீகரிக்கப்பட்டதும் மின்னஞ்சல் பெறுவீர்கள்.",
        "expiresOn": "{{date}} அன்று காலாவதியாகும்",
        "loadingStatus": "திட்ட நிலையை ஏற்றுகிறது...",
        "errorLoading": "திட்ட தகவலை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
        "programStatus": "திட்ட நிலை",
        "slots": "இடங்கள் நிரம்பியுள்ளன",
        "slotsAvailable": "{{count}} இடங்கள் கிடைக்கின்றன",
        "programFull": "அனைத்து 500 இடங்களும் நிரம்பின"
      },
      "enrollment": {
        "title": "பீட்டா 500 இல் சேரவும்",
        "subtitle": "AI-இயக்கும் அம்சங்களை அனுபவிக்க 500 குடும்பங்களில் ஒருவராக இருங்கள்",
        "programFull": "திட்டம் நிறைந்தது",
        "joinButton": "பீட்டா 500 இல் சேர்",
        "exclusiveAccess": "பிரத்தியேக அணுகல்",
        "limitedSlots": "500 குடும்பங்களுக்கு மட்டுமே",
        "slotsAvailable": "{{total}} இல் {{available}} இடங்கள் கிடைக்கின்றன",
        "freeCredits": "இலவச AI கிரெடிட்கள்",
        "creditsAmount": "5,000 கிரெடிட்கள் ($50 மதிப்பு)",
        "duration": "பீட்டா கால அளவு",
        "durationValue": "90 நாட்கள்",
        "features": "AI அம்சங்கள்",
        "featuresValue": "நேரலை டப்பிங், AI தேடல், பரிந்துரைகள்",
        "whatYouGet": "நீங்கள் பெறுவது",
        "benefits": {
          "liveDubbing": "பார்க்கும்போது நிகழ்நேர ஆடியோ மொழிபெயர்ப்பு",
          "aiSearch": "புத்திசாலித்தனமான உள்ளடக்க கண்டுபிடிப்பு",
          "aiRecommendations": "தனிப்பயனாக்கப்பட்ட பரிந்துரைகள்",
          "prioritySupport": "மேம்பாட்டு குழுவுக்கு நேரடி அணுகல்"
        },
        "disclaimer": "பீட்டா 500 ஒரு குறிப்பிட்ட காலத்திற்கான திட்டம். பீட்டா காலத்தில் கிரெடிட்கள் புதுப்பிக்கப்படாது.",
        "waitlistMessage": "அனைத்து 500 இடங்களும் தற்போது நிரம்பியுள்ளன. இடம் கிடைக்கும்போது அறிவிக்கப்பட காத்திருப்புப் பட்டியலில் சேரவும்.",
        "enrollmentSuccess": "பீட்டா 500 க்கு வரவேற்கிறோம்! உங்கள் கணக்கை சரிபார்க்க உங்கள் மின்னஞ்சலை சரிபார்க்கவும்.",
        "enrollmentError": "பதிவு செய்ய முடியவில்லை. பின்னர் மீண்டும் முயற்சிக்கவும்."
      }
    }
  },
  "admin": {
    "librarian": {
      "reports": {
        "detailModal": {
          "seeInsightsBelow": "விவரங்களுக்கு கீழே AI நுண்ணறிவுகளைக் காண்க",
          "totalFixes": "{{count}} மொத்த சரிசெய்தல்கள்"
        }
      },
      "activityLog": {
        "pagination": "பக்கம் {{page}} / {{totalPages}}"
      }
    },
    "widgets": {
      "form": {
        "icon": "ஐகான் ஈமோஜி (விருப்பம்)",
        "channelPlaceholder": "-- சேனலைத் தேர்ந்தெடுக்கவும் --",
        "iframeUrl": "ஐஃப்ரேம் URL",
        "iframeTitle": "ஐஃப்ரேம் தலைப்பு (அணுகல்தன்மைக்கு)",
        "position": "இயல்புநிலை நிலை",
        "behavior": "நடத்தை",
        "mutedByDefault": "இயல்பாக ஒலியடக்கப்பட்டது",
        "closable": "மூடக்கூடியது",
        "draggable": "இழுக்கக்கூடியது",
        "targetPages": "இலக்கு பக்கங்கள் (காற்புள்ளியால் பிரிக்கப்பட்டது, காலி = அனைத்தும்)",
        "targetPagesPlaceholder": "/, /live, /vod",
        "order": "வரிசை"
      },
      "actions": {
        "save": "சேமி",
        "cancel": "ரத்து செய்"
      },
      "allPages": "அனைத்து பக்கங்கள்",
      "allRoles": "அனைத்தும்",
      "errors": {
        "titleRequired": "தலைப்பு தேவை",
        "selectChannel": "நேரலை சேனலைத் தேர்ந்தெடுக்கவும்",
        "iframeUrlRequired": "ஐஃப்ரேம் URL தேவை"
      }
    },
    "billing": {
      "retention": "தக்கவைப்பு",
      "retentionRate": "தக்கவைப்பு விகிதம்",
      "churnRate": "இழப்பு விகிதம்",
      "atRiskUsers": "ஆபத்தில் உள்ள பயனர்கள்",
      "churnedUsers": "வெளியேறிய பயனர்கள்",
      "quickLinks": "விரைவு இணைப்புகள்"
    },
    "auditLogs": {
      "changed": "மாற்றப்பட்டது",
      "actionFilters": {
        "user": "பயனர்",
        "subscription": "சந்தா",
        "payment": "கட்டணம்",
        "settings": "அமைப்புகள்",
        "campaign": "பிரச்சாரம்",
        "content": "உள்ளடக்கம்"
      }
    },
    "contentEditor": {
      "title": "உள்ளடக்க ஆசிரியர்",
      "subtitle": "உள்ளடக்கத்தை திருத்து அல்லது புதியதை உருவாக்கு"
    },
    "liveChannels": {
      "title": "நேரலை சேனல்கள்",
      "subtitle": "நேரலை டிவி சேனல்களை நிர்வகிக்க",
      "searchPlaceholder": "சேனல்களை தேடு...",
      "newChannel": "புதிய சேனல்",
      "emptyMessage": "நேரலை சேனல்கள் இல்லை",
      "confirmDelete": "இந்த சேனலை நீக்கவா?"
    },
    "radioStations": {
      "title": "வானொலி நிலையங்கள்",
      "subtitle": "வானொலி நிலையங்களை நிர்வகிக்க",
      "searchPlaceholder": "நிலையங்களை தேடு...",
      "newStation": "புதிய நிலையம்",
      "emptyMessage": "வானொலி நிலையங்கள் இல்லை",
      "confirmDelete": "இந்த நிலையத்தை நீக்கவா?"
    },
    "podcasts": {
      "title": "போட்காஸ்ட்கள்",
      "subtitle": "போட்காஸ்ட்கள் மற்றும் எபிசோட்களை நிர்வகிக்க",
      "searchPlaceholder": "போட்காஸ்ட்களை தேடு...",
      "newPodcast": "புதிய போட்காஸ்ட்",
      "emptyMessage": "போட்காஸ்ட்கள் இல்லை",
      "confirmDelete": "இந்த போட்காஸ்டை நீக்கவா?"
    },
    "podcastEpisodes": {
      "title": "போட்காஸ்ட் எபிசோட்கள்",
      "subtitle": "போட்காஸ்ட் எபிசோட்களை நிர்வகிக்க",
      "newEpisode": "புதிய எபிசோட்",
      "emptyMessage": "எபிசோட்கள் இல்லை",
      "confirmDelete": "இந்த எபிசோடை நீக்கவா?"
    },
    "translation": {
      "title": "மொழிபெயர்ப்புகள்",
      "subtitle": "உள்ளடக்க மொழிபெயர்ப்புகளை நிர்வகிக்க"
    },
    "users": {
      "title": "பயனர்கள்",
      "subtitle": "பயனர்களை நிர்வகிக்க",
      "searchPlaceholder": "பயனர்களை தேடு...",
      "newUser": "புதிய பயனர்",
      "emptyMessage": "பயனர்கள் இல்லை",
      "confirmDelete": "இந்த பயனரை நீக்கவா?",
      "columns": {
        "name": "பெயர்",
        "email": "மின்னஞ்சல்",
        "role": "பங்கு",
        "status": "நிலை",
        "createdAt": "உருவாக்கப்பட்டது"
      },
      "status": {
        "active": "செயலில்",
        "inactive": "செயலற்றது",
        "suspended": "இடைநிறுத்தப்பட்டது"
      },
      "roles": {
        "admin": "நிர்வாகி",
        "user": "பயனர்",
        "moderator": "மதிப்பாளர்"
      }
    },
    "userDetail": {
      "title": "பயனர் விவரங்கள்",
      "subtitle": "பயனர் கணக்கு தகவலை நிர்வகிக்க",
      "profile": "சுயவிவரம்",
      "subscription": "சந்தா",
      "activity": "செயல்பாடு",
      "devices": "சாதனங்கள்"
    },
    "campaigns": {
      "title": "பிரச்சாரங்கள்",
      "subtitle": "சந்தைப்படுத்தல் பிரச்சாரங்களை நிர்வகிக்க",
      "searchPlaceholder": "பிரச்சாரங்களை தேடு...",
      "newCampaign": "புதிய பிரச்சாரம்",
      "emptyMessage": "பிரச்சாரங்கள் இல்லை"
    },
    "subscriptions": {
      "title": "சந்தாக்கள்",
      "subtitle": "பயனர் சந்தாக்களை நிர்வகிக்க",
      "searchPlaceholder": "சந்தாக்களை தேடு...",
      "emptyMessage": "சந்தாக்கள் இல்லை",
      "columns": {
        "user": "பயனர்",
        "plan": "திட்டம்",
        "status": "நிலை",
        "startDate": "தொடக்க தேதி",
        "endDate": "முடிவு தேதி"
      },
      "status": {
        "active": "செயலில்",
        "cancelled": "ரத்து செய்யப்பட்டது",
        "expired": "காலாவதியானது",
        "trial": "சோதனை"
      }
    },
    "marketingDashboard": {
      "title": "சந்தைப்படுத்தல் டாஷ்போர்டு",
      "subtitle": "சந்தைப்படுத்தல் செயல்திறனை காண்க"
    },
    "transactions": {
      "title": "பரிவர்த்தனைகள்",
      "subtitle": "கட்டண பரிவர்த்தனைகளை நிர்வகிக்க",
      "searchPlaceholder": "பரிவர்த்தனைகளை தேடு...",
      "emptyMessage": "பரிவர்த்தனைகள் இல்லை",
      "columns": {
        "id": "அடையாளம்",
        "user": "பயனர்",
        "amount": "தொகை",
        "status": "நிலை",
        "date": "தேதி"
      },
      "status": {
        "completed": "முடிந்தது",
        "pending": "நிலுவையில்",
        "failed": "தோல்வியடைந்தது",
        "refunded": "பணத்திரும்பு"
      }
    },
    "pushNotifications": {
      "title": "புஷ் அறிவிப்புகள்",
      "subtitle": "புஷ் அறிவிப்புகளை நிர்வகிக்க",
      "newNotification": "புதிய அறிவிப்பு",
      "emptyMessage": "அறிவிப்புகள் இல்லை",
      "send": "அறிவிப்பை அனுப்பு",
      "schedule": "திட்டமிடு"
    }
  }
};

deepMerge(ta, translations);
fs.writeFileSync('ta.json', JSON.stringify(ta, null, 2) + '\n');
console.log('Part 9: Final batch of Tamil translations - completing 100% coverage');
