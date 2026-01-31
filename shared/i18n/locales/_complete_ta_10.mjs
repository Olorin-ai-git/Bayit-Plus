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
      "subtitleSettings": "வசன அமைப்புகள்",
      "form": {
        "name": "சேனல் பெயர்",
        "namePlaceholder": "சேனல் பெயரை உள்ளிடவும்",
        "logo": "லோகோ URL",
        "streamUrl": "ஸ்ட்ரீம் URL",
        "epgSource": "EPG ஆதாரம்",
        "category": "வகை",
        "isActive": "செயலில்",
        "requiresSubscription": "சந்தா தேவை"
      }
    },
    "radioStations": {
      "form": {
        "name": "நிலைய பெயர்",
        "namePlaceholder": "நிலைய பெயரை உள்ளிடவும்",
        "logo": "லோகோ URL",
        "streamUrl": "ஸ்ட்ரீம் URL",
        "frequency": "அலைவரிசை",
        "category": "வகை",
        "isActive": "செயலில்"
      }
    },
    "podcasts": {
      "episodesSubtitle": "இந்த போட்காஸ்டின் எபிசோட்களை நிர்வகிக்க",
      "noEpisodes": "எபிசோட்கள் இல்லை",
      "translateAll": "அனைத்தையும் மொழிபெயர்",
      "translateAllEpisodes": "அனைத்து எபிசோட்களையும் மொழிபெயர்",
      "translateEpisode": "எபிசோடை மொழிபெயர்",
      "viewEpisodes": "எபிசோட்களை காண்",
      "editPodcast": "போட்காஸ்டை திருத்து",
      "deletePodcast": "போட்காஸ்டை நீக்கு",
      "editEpisode": "எபிசோடை திருத்து",
      "deleteEpisode": "எபிசோடை நீக்கு",
      "newEpisode": "புதிய எபிசோட்",
      "filterByStatus": "நிலை மூலம் வடிகட்டு",
      "form": {
        "title": "போட்காஸ்ட் தலைப்பு",
        "titlePlaceholder": "போட்காஸ்ட் தலைப்பை உள்ளிடவும்",
        "author": "ஆசிரியர்",
        "authorPlaceholder": "ஆசிரியர் பெயர்",
        "description": "விளக்கம்",
        "descriptionPlaceholder": "போட்காஸ்ட் விளக்கம்",
        "category": "வகை",
        "coverImage": "அட்டை படம்",
        "rssFeed": "RSS ஊட்டம்",
        "website": "வலைதளம்",
        "isPublished": "வெளியிடப்பட்டது"
      },
      "episodes": {
        "title": "தலைப்பு",
        "duration": "கால அளவு",
        "publishedAt": "வெளியிடப்பட்டது",
        "status": "நிலை"
      }
    },
    "translation": {
      "retry": "மீண்டும் முயற்சி",
      "retryTranslation": "மொழிபெயர்ப்பை மீண்டும் முயற்சி",
      "view": "காண்",
      "viewEpisodes": "எபிசோட்களை காண்",
      "failedEpisodes": "தோல்வியடைந்த எபிசோட்கள்",
      "noFailed": "தோல்வியடைந்த மொழிபெயர்ப்புகள் இல்லை",
      "columns": {
        "podcast": "போட்காஸ்ட்",
        "episode": "எபிசோட்",
        "language": "மொழி",
        "status": "நிலை",
        "error": "பிழை",
        "date": "தேதி"
      },
      "stats": {
        "total": "மொத்த மொழிபெயர்ப்புகள்",
        "pending": "நிலுவையில்",
        "completed": "முடிந்தது",
        "failed": "தோல்வியடைந்தது"
      }
    },
    "users": {
      "addUser": "பயனர் சேர்",
      "status": {
        "blocked": "தடுக்கப்பட்டது"
      },
      "filters": {
        "role": "பங்கு",
        "status": "நிலை",
        "subscription": "சந்தா"
      },
      "columns": {
        "subscription": "சந்தா",
        "noSubscription": "சந்தா இல்லை",
        "created": "உருவாக்கப்பட்டது",
        "actions": "செயல்கள்"
      },
      "confirmDeleteMessage": "இந்த பயனரை நீக்க விரும்புகிறீர்களா? இந்த செயலை செயல்தவிர்க்க முடியாது.",
      "resetPassword": "கடவுச்சொல்லை மீட்டமை",
      "block": "தடு",
      "unban": "தடை நீக்கு",
      "confirmResetPassword": "இந்த பயனருக்கு கடவுச்சொல் மீட்டமைப்பு மின்னஞ்சல் அனுப்பவா?",
      "resetPasswordSent": "கடவுச்சொல் மீட்டமைப்பு மின்னஞ்சல் அனுப்பப்பட்டது",
      "recentActivity": "சமீபத்திய செயல்பாடு",
      "noActivity": "செயல்பாடு இல்லை",
      "notFound": "பயனர் கிடைக்கவில்லை",
      "backToList": "பட்டியலுக்குத் திரும்பு",
      "banReason": "தடை காரணம்",
      "banReasonPrompt": "இந்த பயனரை தடுப்பதற்கான காரணத்தை உள்ளிடவும்",
      "confirmUnban": "இந்த பயனரின் தடையை நீக்க விரும்புகிறீர்களா?",
      "userDetails": "பயனர் விவரங்கள்",
      "id": "பயனர் ID",
      "registered": "பதிவு செய்யப்பட்டது",
      "billingHistory": "கட்டண வரலாறு",
      "noPayments": "கட்டணங்கள் இல்லை"
    },
    "campaigns": {
      "expired": "காலாவதியானது",
      "status": {
        "draft": "வரைவு",
        "active": "செயலில்",
        "scheduled": "திட்டமிடப்பட்டது",
        "completed": "நிறைவடைந்தது",
        "paused": "இடைநிறுத்தப்பட்டது"
      },
      "columns": {
        "name": "பிரச்சார பெயர்",
        "status": "நிலை",
        "startDate": "தொடக்க தேதி",
        "endDate": "முடிவு தேதி",
        "budget": "பட்ஜெட்",
        "reach": "எட்டியது"
      },
      "confirmDelete": "இந்த பிரச்சாரத்தை நீக்கவா?",
      "confirmDeleteMessage": "இந்த பிரச்சாரத்தை நீக்க விரும்புகிறீர்களா? இந்த செயலை செயல்தவிர்க்க முடியாது.",
      "deactivate": "செயலிழக்கச்செய்",
      "activate": "செயல்படுத்து",
      "createTitle": "பிரச்சாரத்தை உருவாக்கு",
      "editTitle": "பிரச்சாரத்தை திருத்து",
      "formSubtitle": "பிரச்சார விவரங்களை உள்ளிடவும்",
      "form": {
        "name": "பிரச்சார பெயர்",
        "namePlaceholder": "பிரச்சார பெயரை உள்ளிடவும்",
        "description": "விளக்கம்",
        "descriptionPlaceholder": "பிரச்சார விளக்கம்",
        "startDate": "தொடக்க தேதி",
        "endDate": "முடிவு தேதி",
        "budget": "பட்ஜெட்",
        "targetAudience": "இலக்கு பார்வையாளர்கள்"
      }
    },
    "subscriptions": {
      "status": {
        "paused": "இடைநிறுத்தப்பட்டது"
      },
      "columns": {
        "price": "விலை",
        "nextBilling": "அடுத்த கட்டணம்"
      },
      "perMonth": "மாதத்திற்கு",
      "actions": {
        "cancel": "சந்தாவை ரத்து செய்",
        "pause": "சந்தாவை இடைநிறுத்து",
        "resume": "சந்தாவை தொடர்",
        "upgrade": "மேம்படுத்து",
        "downgrade": "தரமிறக்கு"
      },
      "editPlan": "திட்டத்தை திருத்து",
      "addSubscription": "சந்தா சேர்",
      "fillAllFields": "அனைத்து புலங்களையும் நிரப்பவும்",
      "userNotFound": "பயனர் கிடைக்கவில்லை",
      "selectOneToEdit": "திருத்த ஒன்றைத் தேர்ந்தெடுக்கவும்",
      "selectToDelete": "நீக்க சந்தாக்களைத் தேர்ந்தெடுக்கவும்",
      "confirmDeleteMultiple": "{{count}} சந்தா(களை) நீக்க விரும்புகிறீர்களா?",
      "selected": "{{count}} தேர்ந்தெடுக்கப்பட்டது",
      "confirmDelete": "இந்த சந்தாவை நீக்க விரும்புகிறீர்களா?"
    },
    "marketingDashboard": {
      "refresh": "புதுப்பி",
      "totalSubscribers": "மொத்த சந்தாதாரர்கள்",
      "emailOpenRate": "மின்னஞ்சல் திறப்பு விகிதம்",
      "pushClickRate": "புஷ் கிளிக் விகிதம்",
      "activeSegments": "செயலில் உள்ள பிரிவுகள்",
      "campaignStatus": "பிரச்சார நிலை"
    },
    "transactions": {
      "exportCsv": "CSV ஆக ஏற்றுமதி செய்",
      "columns": {
        "type": "வகை"
      },
      "filters": {
        "status": "நிலை",
        "type": "வகை",
        "dateRange": "தேதி வரம்பு"
      },
      "details": "பரிவர்த்தனை விவரங்கள்",
      "email": "மின்னஞ்சல்"
    },
    "pushNotifications": {
      "status": {
        "sent": "அனுப்பப்பட்டது",
        "scheduled": "திட்டமிடப்பட்டது",
        "draft": "வரைவு",
        "failed": "தோல்வியடைந்தது"
      },
      "columns": {
        "title": "தலைப்பு",
        "status": "நிலை",
        "sentAt": "அனுப்பப்பட்டது",
        "scheduledAt": "திட்டமிடப்பட்டது",
        "reach": "எட்டியது"
      },
      "filters": {
        "status": "நிலை",
        "dateRange": "தேதி வரம்பு"
      },
      "searchPlaceholder": "அறிவிப்புகளை தேடு...",
      "createModal": {
        "title": "புதிய அறிவிப்பை உருவாக்கு"
      },
      "editModal": {
        "title": "அறிவிப்பை திருத்து"
      },
      "scheduleModal": {
        "title": "அறிவிப்பை திட்டமிடு"
      },
      "titleLabel": "அறிவிப்பு தலைப்பு",
      "bodyLabel": "அறிவிப்பு உடல்",
      "dateTimeLabel": "தேதி மற்றும் நேரம்",
      "cancel": "ரத்து செய்",
      "create": "உருவாக்கு",
      "confirmSend": "இந்த அறிவிப்பை அனுப்ப விரும்புகிறீர்களா?",
      "confirmDelete": "இந்த அறிவிப்பை நீக்க விரும்புகிறீர்களா?",
      "fillRequired": "தேவையான புலங்களை நிரப்பவும்"
    }
  }
};

deepMerge(ta, translations);
fs.writeFileSync('ta.json', JSON.stringify(ta, null, 2) + '\n');
console.log('Part 10: Final admin section translations completed');
