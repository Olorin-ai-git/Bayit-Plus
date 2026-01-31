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
  "chatbot": {
    "openChat": "அரட்டையைத் திற",
    "welcome": "வணக்கம்! நான் Bayit+ ஸ்மார்ட் உதவியாளர். இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்? மைக்ரோஃபோனை கிளிக் செய்து பேசுங்கள், அல்லது செய்தியைத் தட்டச்சு செய்யுங்கள்.",
    "recording": "பதிவு செய்கிறது... நிறுத்த மீண்டும் கிளிக் செய்யவும்",
    "transcribing": "டிரான்ஸ்கிரைப் செய்கிறது...",
    "stopRecording": "பதிவை நிறுத்து",
    "startRecording": "குரல் பதிவைத் தொடங்கு",
    "recommendations": "சில பரிந்துரைகள்:",
    "showMultipleSuccess": "{{count}} உள்ளடக்க உருப்படிகளை விட்ஜெட்களில் காட்டுகிறது",
    "showMultipleNotFound": "கோரிய உள்ளடக்கத்தைக் கண்டறிய முடியவில்லை. வேறு பெயர்களை முயற்சிக்கவும்.",
    "resolvingContent": "உங்கள் உள்ளடக்கத்தைக் கண்டுபிடிக்கிறது...",
    "errors": {
      "micPermission": "மைக்ரோஃபோனை அணுக முடியவில்லை. உலாவியில் மைக்ரோஃபோன் அனுமதிகளைச் சரிபார்க்கவும்.",
      "transcribeFailed": "பதிவை டிரான்ஸ்கிரைப் செய்ய முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
      "general": "மன்னிக்கவும், ஏதோ தவறு நடந்தது. மீண்டும் முயற்சிக்கவும்."
    },
    "suggestions": {
      "whatToWatch": "இன்று என்ன பார்க்கலாம்?",
      "israeliMovies": "பரிந்துரைக்கப்பட்ட இஸ்ரேலி திரைப்படங்கள்",
      "whatsOnNow": "இப்போது என்ன ஒளிபரப்பாகிறது?",
      "popularPodcasts": "பிரபலமான பாட்காஸ்ட்கள்"
    },
    "voiceCommands": {
      "showChannels": "சேனல்களைக் காட்டு...",
      "playChess": "சதுரங்க விளையாட்டைத் தொடங்கு...",
      "multiContent": "பக்கவாட்டில் காட்டு..."
    }
  },
  "children": {
    "exitDescription": "வெளியேற பெற்றோர் குறியீட்டை உள்ளிடவும்",
    "parentCode": "பெற்றோர் குறியீடு",
    "confirm": "உறுதிப்படுத்து",
    "wrongCode": "தவறான குறியீடு",
    "noContent": "உள்ளடக்கம் இல்லை",
    "tryAnotherCategory": "வேறு வகையைத் தேர்ந்தெடுக்கவும்",
    "categories": {
      "hebrew": "எபிரேயம்"
    },
    "ageRatings": {
      "3": "வயது 3+",
      "5": "வயது 5+",
      "7": "வயது 7+",
      "10": "வயது 10+",
      "12": "வயது 12+"
    },
    "moderation": {
      "pending": "மதிப்பாய்வு நிலுவையில்",
      "approved": "அங்கீகரிக்கப்பட்டது",
      "rejected": "நிராகரிக்கப்பட்டது"
    },
    "admin": {
      "stats": "குழந்தைகள் உள்ளடக்க மேலாளர்",
      "seedContent": "உள்ளடக்கத்தை விதை",
      "importArchive": "Archive.org இறக்குமதி",
      "syncPodcasts": "பாட்காஸ்ட்களை ஒத்திசை",
      "syncYouTube": "YouTube ஒத்திசை",
      "tagVod": "VOD குறியிடு",
      "pendingModeration": "நிலுவையில் உள்ள மதிப்பாய்வு"
    }
  },
  "support": {
    "tabs": {
      "videos": "வீடியோக்கள்"
    },
    "categories": {
      "title": "ஆவணங்களை உலாவு",
      "loading": "ஆவணங்கள் ஏற்றப்படுகின்றன...",
      "loadError": "வகைகளை ஏற்ற முடியவில்லை",
      "articleCount": "{{count}} கட்டுரைகள்",
      "gettingStarted": "தொடங்குதல்",
      "features": "அம்சங்கள்",
      "troubleshooting": "சரிசெய்தல்",
      "account": "கணக்கு"
    },
    "docs": {
      "loading": "ஆவணம் ஏற்றப்படுகிறது...",
      "loadError": "ஆவணத்தை ஏற்ற முடியவில்லை",
      "backToList": "ஆவணங்களுக்குத் திரும்பு"
    },
    "search": {
      "placeholder": "ஆவணங்களைத் தேடு...",
      "noResults": "முடிவுகள் இல்லை"
    },
    "faq": {
      "title": "அடிக்கடி கேட்கப்படும் கேள்விகள்",
      "loading": "FAQ ஏற்றப்படுகிறது...",
      "loadError": "FAQ ஏற்ற முடியவில்லை",
      "empty": "இந்த வகையில் FAQ உருப்படிகள் இல்லை",
      "categories": {
        "all": "அனைத்து தலைப்புகள்",
        "general": "பொது",
        "billing": "பில்லிங்",
        "technical": "தொழில்நுட்ப",
        "features": "அம்சங்கள்"
      }
    },
    "videos": {
      "title": "பயிற்சி வீடியோக்கள்",
      "subtitle": "Bayit+ அம்சங்களைப் பயன்படுத்த கற்றுக்கொள்ளுங்கள்",
      "widgetsIntro": "விட்ஜெட்களுடன் தொடங்குதல்",
      "widgetsDescription": "மிதக்கும் விட்ஜெட்களை உருவாக்க, தனிப்பயனாக்க மற்றும் நிர்வகிக்க கற்றுக்கொள்ளுங்கள்"
    },
    "contact": {
      "voiceTitle": "குரல் ஆதரவு",
      "voiceDescription": "எங்கள் AI உதவியாளருடன் குரல் உரையாடலைத் தொடங்க அவதார் பொத்தானை கிளிக் செய்யவும் அல்லது \"Jarvis\" என்று சொல்லுங்கள்.",
      "ticketTitle": "ஆதரவு டிக்கெட் உருவாக்கு",
      "ticketDescription": "மனித உதவி தேவையா? ஆதரவு டிக்கெட் உருவாக்குங்கள், எங்கள் குழு 24 மணி நேரத்தில் பதிலளிக்கும்.",
      "createTicket": "டிக்கெட் உருவாக்கு",
      "emailTitle": "மின்னஞ்சல் ஆதரவு",
      "emailDescription": "மின்னஞ்சல் விரும்புகிறீர்களா? கேள்விகள் அல்லது கவலைகளுக்கு support@bayit.tv ஐத் தொடர்புகொள்ளுங்கள்."
    },
    "ticket": {
      "title": "ஆதரவு டிக்கெட் உருவாக்கு",
      "subject": "தலைப்பு",
      "subjectPlaceholder": "உங்கள் சிக்கலின் சுருக்கமான விளக்கம்",
      "message": "செய்தி",
      "messagePlaceholder": "உங்கள் சிக்கலை விரிவாக விவரிக்கவும்...",
      "categoryLabel": "வகை",
      "priorityLabel": "முன்னுரிமை",
      "submit": "டிக்கெட்டை சமர்ப்பி",
      "category": {
        "billing": "பில்லிங்",
        "technical": "தொழில்நுட்ப",
        "feature": "அம்சக் கோரிக்கை",
        "general": "பொது"
      },
      "priority": {
        "low": "குறைந்த",
        "medium": "நடுத்தர",
        "high": "அதிக",
        "urgent": "அவசர"
      },
      "status": {
        "open": "திறந்த",
        "in_progress": "செயலில்",
        "resolved": "தீர்க்கப்பட்டது",
        "closed": "மூடப்பட்டது"
      },
      "created": "உருவாக்கப்பட்டது",
      "error": {
        "required": "அனைத்து தேவையான புலங்களையும் நிரப்பவும்",
        "submit": "டிக்கெட் உருவாக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."
      }
    },
    "tickets": {
      "title": "என் ஆதரவு டிக்கெட்கள்",
      "loading": "டிக்கெட்கள் ஏற்றப்படுகின்றன...",
      "loadError": "டிக்கெட்களை ஏற்ற முடியவில்லை",
      "empty": "ஆதரவு டிக்கெட்கள் இல்லை",
      "emptyFilter": "இந்த நிலையில் டிக்கெட்கள் இல்லை",
      "create": "புதிய டிக்கெட்",
      "createFirst": "உங்கள் முதல் டிக்கெட்டை உருவாக்குங்கள்",
      "filter": {
        "all": "அனைத்தும்",
        "open": "திறந்த",
        "inProgress": "செயலில்",
        "resolved": "தீர்க்கப்பட்டது"
      }
    },
    "voice": {
      "title": "குரல் உதவியாளர்",
      "listening": "கேட்கிறேன்...",
      "thinking": "யோசிக்கிறேன்...",
      "speaking": "பேசுகிறது...",
      "error": "மன்னிக்கவும், புரியவில்லை. மீண்டும் முயற்சிக்கவா?",
      "ready": "என்ன தெரிந்துகொள்ள விரும்புகிறீர்கள்?",
      "listeningNow": "கேட்கிறது...",
      "wakeWordHint": "பேச \"Jarvis\" என்று சொல்லுங்கள்"
    },
    "wizard": {
      "role": "உங்கள் வழிகாட்டி"
    }
  },
  "judaism": {
    "emptyHint": "வேறு வகையைத் தேர்ந்தெடுக்கவும்",
    "dashboard": "உங்கள் யூத டாஷ்போர்டு",
    "categories": {
      "news": "யூத செய்திகள்",
      "community": "சமூகம்"
    },
    "shabbat": {
      "shabbatMode": "ஷப்பத் முறை",
      "endsIn": "ஷப்பத் முடிவடைகிறது",
      "parashat": "பராஷத்",
      "friday": "வெள்ளி",
      "saturday": "சனி",
      "noData": "ஷப்பத் நேரங்களை ஏற்ற முடியவில்லை"
    },
    "erevShabbat": {
      "title": "ஏரெவ் ஷப்பத்",
      "prepareFor": "ஷப்பத்திற்கு தயாராகுங்கள்",
      "inTime": "{{time}} இல்",
      "featuredContent": "ஷப்பத் உள்ளடக்கம்",
      "noContent": "ஷப்பத் உள்ளடக்கம் விரைவில் வருகிறது!",
      "shabbatShalom": "ஷப்பத் ஷாலோம்!",
      "timeUntil": "ஷப்பத் வரை நேரம்",
      "shabbatSongs": "ஷப்பத் பாடல்கள்",
      "parashaStudy": "பராஷா",
      "shabbatRecipes": "சமையல் குறிப்புகள்",
      "prayers": "பிரார்த்தனைகள்"
    }
  },
  "subscribe": {
    "save2Months": "2 மாதங்கள் சேமிக்கவும்",
    "selected": "தேர்ந்தெடுக்கப்பட்டது",
    "processing": "செயலாக்குகிறது...",
    "perYear": "/வருடம்",
    "noCharge": "சோதனை காலத்தில் உங்கள் கிரெடிட் கார்டு கட்டணம் விதிக்கப்படாது"
  },
  "notFound": {
    "orTry": "அல்லது முயற்சிக்கவும்:",
    "liveChannel": "நேரலை",
    "vodLabel": "திரைப்படங்கள்",
    "podcastsLabel": "பாட்காஸ்ட்கள்"
  },
  "plans": {
    "basic": {
      "notIncluded": [
        "நேரலை சேனல்கள்",
        "AI உதவியாளர்",
        "ஆஃப்லைன் பார்வை"
      ]
    },
    "premium": {
      "notIncluded": [
        "ஆஃப்லைன் பார்வை",
        "குடும்ப சுயவிவரங்கள்"
      ]
    },
    "family": {
      "notIncluded": []
    }
  },
  "widgets": {
    "allPages": "அனைத்து பக்கங்கள்",
    "allRoles": "அனைத்தும்"
  },
  "placeholder": {
    "email": "your@email.com",
    "password": "••••••••",
    "pin": "••••",
    "dateRange": {
      "from": "இருந்து (YYYY-MM-DD)",
      "to": "வரை (YYYY-MM-DD)"
    },
    "amount": {
      "min": "குறைந்தபட்சம்",
      "max": "அதிகபட்சம்",
      "price": "0.00"
    },
    "chatMessage": "இங்கே தட்டச்சு செய்யவும்...",
    "deepLink": "bayitplus://content/123",
    "scheduleDateTime": "YYYY-MM-DDTHH:mm",
    "roomCode": "ABCD1234",
    "time": {
      "start": "08:00",
      "end": "10:00"
    },
    "filter": {
      "userId": "பயனர் ID உள்ளிடவும்"
    },
    "datetime": "YYYY-MM-DDTHH:mm",
    "number": "0",
    "chat": "உங்கள் செய்தியைத் தட்டச்சு செய்யவும்..."
  },
  "components": {
    "select": {
      "default": "தேர்ந்தெடு..."
    }
  },
  "profiles": {
    "addProfile": "சுயவிவரத்தைச் சேர்",
    "enterPin": "PIN உள்ளிடவும்",
    "selectError": "சுயவிவரத்தைத் தேர்ந்தெடுப்பதில் பிழை",
    "wrongPin": "தவறான PIN",
    "loading": "சுயவிவரங்கள் ஏற்றப்படுகின்றன...",
    "manage": "சுயவிவரங்களை நிர்வகி",
    "whoIsWatching": "யார் பார்க்கிறார்கள்?",
    "manageProfiles": "சுயவிவரங்களை நிர்வகி"
  },
  "watch": {
    "notFound": "உள்ளடக்கம் இல்லை",
    "backToHome": "முகப்புக்குத் திரும்பு",
    "episodes": "எபிசோட்கள்",
    "addToList": "பட்டியலில் சேர்",
    "like": "விருப்பம்",
    "share": "பகிர்",
    "cast": "நடிகர்கள்",
    "episodesList": "எபிசோட்கள்",
    "schedule": "அட்டவணை",
    "now": "இப்போது",
    "related": "தொடர்புடைய உள்ளடக்கம்",
    "deleteEpisode": "எபிசோடை நீக்கு",
    "confirmDeleteEpisode": "இந்த எபிசோடை நீக்கவா?"
  },
  "live": {
    "title": "நேரலை TV",
    "next": "அடுத்து:",
    "noChannels": "சேனல்கள் இல்லை",
    "tryLater": "பின்னர் மீண்டும் முயற்சிக்கவும்",
    "categories": {
      "all": "அனைத்தும்",
      "news": "செய்திகள்",
      "entertainment": "பொழுதுபோக்கு",
      "sports": "விளையாட்டு",
      "kids": "குழந்தைகள்",
      "music": "இசை"
    }
  },
  "youngsters": {
    "title": "இளைஞர்கள்",
    "items": "உருப்படிகள்",
    "empty": "உள்ளடக்கம் இல்லை",
    "emptyHint": "வேறு வகையை முயற்சிக்கவும்",
    "exitYoungstersMode": "இளைஞர்கள் முறையிலிருந்து வெளியேறு",
    "exitDescription": "வெளியேற பெற்றோர் குறியீட்டை உள்ளிடவும்",
    "parentCode": "பெற்றோர் குறியீடு",
    "confirm": "உறுதிப்படுத்து",
    "wrongCode": "தவறான குறியீடு",
    "noContent": "உள்ளடக்கம் இல்லை",
    "tryAnotherCategory": "வேறு வகையைத் தேர்ந்தெடுக்கவும்",
    "categories": {
      "all": "அனைத்தும்",
      "trending": "டிரெண்டிங்",
      "news": "செய்திகள்",
      "culture": "கலாச்சாரம்",
      "educational": "கல்வி",
      "music": "இசை",
      "entertainment": "பொழுதுபோக்கு",
      "sports": "விளையாட்டு",
      "tech": "தொழில்நுட்பம்",
      "judaism": "யூதமதம்"
    },
    "ageGroups": {
      "middle-school": "நடுநிலைப் பள்ளி (12-14)",
      "high-school": "உயர்நிலைப் பள்ளி (15-17)"
    },
    "moderation": {
      "pending": "மதிப்பாய்வு நிலுவையில்",
      "approved": "அங்கீகரிக்கப்பட்டது",
      "rejected": "நிராகரிக்கப்பட்டது"
    },
    "admin": {
      "stats": "இளைஞர்கள் உள்ளடக்க மேலாளர்",
      "seedContent": "உள்ளடக்கத்தை விதை",
      "importArchive": "Archive.org இறக்குமதி",
      "syncPodcasts": "பாட்காஸ்ட்களை ஒத்திசை",
      "syncYouTube": "YouTube ஒத்திசை",
      "tagVod": "VOD குறியிடு",
      "pendingModeration": "நிலுவையில் உள்ள மதிப்பாய்வு"
    }
  },
  "chat": {
    "title": "Bayit+ உதவியாளர்",
    "greeting": "வணக்கம்! நான் Bayit+ ஸ்மார்ட் உதவியாளர். இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்? மைக்ரோஃபோனை கிளிக் செய்து பேசுங்கள், அல்லது செய்தியைத் தட்டச்சு செய்யுங்கள்."
  },
  "subtitles": {
    "nikud": "நிகுட்",
    "selection": "தேர்வு",
    "translation": "மொழிபெயர்ப்பு",
    "translating": "மொழிபெயர்க்கிறது...",
    "close": "மூடு",
    "unavailable": "மொழிபெயர்ப்பு கிடைக்கவில்லை",
    "off": "அணைக்கவும்",
    "none": "இல்லை",
    "autoGenerated": "தானாக உருவாக்கப்பட்டது",
    "selectLanguage": "வசன வரி மொழியைத் தேர்ந்தெடுக்கவும்",
    "liveTranslate": "நேரடி மொழிபெயர்ப்பு",
    "translateTo": "மொழிபெயர்க்க",
    "downloadMore": "மேலும் வசன வரிகளைப் பதிவிறக்கு...",
    "downloading": "OpenSubtitles தேடுகிறது...",
    "opensubtitlesSource": "OpenSubtitles.com இலிருந்து",
    "downloadSuccess": "{{count}} வசன வரி(கள்) பதிவிறக்கப்பட்டன",
    "noSubtitlesFound": "இந்த உள்ளடக்கத்திற்கு வசன வரிகள் இல்லை"
  },
  "dubbing": {
    "title": "நேரடி டப்பிங்",
    "enabled": "நேரடி டப்பிங் இயக்கப்பட்டது",
    "selectLanguage": "மொழியைத் தேர்ந்தெடு",
    "originalAudio": "அசல் ஆடியோ",
    "dubbedAudio": "டப் செய்யப்பட்ட ஆடியோ",
    "selectVoice": "குரலைத் தேர்ந்தெடு",
    "adjustVolume": "ஒலியளவை சரிசெய்",
    "tapToSelect": "இந்த மொழியைத் தேர்ந்தெடுக்க தட்டவும்",
    "languages": {
      "en": "ஆங்கிலம்",
      "es": "ஸ்பானிஷ்",
      "he": "எபிரேயம்",
      "ar": "அரபி",
      "ru": "ரஷ்ய",
      "fr": "பிரெஞ்சு",
      "de": "ஜெர்மன்"
    },
    "onboarding": {
      "title": "நேரடி டப்பிங் அறிமுகம்",
      "description": "உங்கள் மொழியில் நேரடி உள்ளடக்கத்தை அனுபவிக்கவும். நீங்கள் பார்க்கும்போது எங்கள் AI நிகழ்நேரத்தில் ஆடியோவை மொழிபெயர்த்து ரீப்ளே செய்கிறது.",
      "feature1": "7 மொழிகள் ஆதரிக்கப்படுகின்றன",
      "feature2": "நிகழ்நேர செயலாக்கம்",
      "feature3": "ஆடியோ சமநிலையை சரிசெய்",
      "tryNow": "இப்போது முயற்சிக்கவும்",
      "later": "பின்னர்"
    },
    "consent": {
      "title": "ஆடியோ செயலாக்க ஒப்புதல்",
      "message": "நேரடி டப்பிங் AI சேவைகளைப் பயன்படுத்தி உங்கள் ஆடியோவை நிகழ்நேரத்தில் செயலாக்குகிறது. ஆடியோ மொழிபெயர்ப்புக்காக மட்டுமே செயலாக்கப்படுகிறது, நிரந்தரமாக சேமிக்கப்படாது.",
      "accept": "ஒப்புக்கொள்கிறேன்",
      "decline": "வேண்டாம்"
    },
    "errors": {
      "connectionFailed": "இணைப்பு தோல்வி",
      "connectionFailedMessage": "டப்பிங் சேவையுடன் இணைக்க முடியவில்லை",
      "connectionFailedAction": "உங்கள் இணைய இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்",
      "notAuthenticated": "அங்கீகரிக்கப்படவில்லை",
      "notAuthenticatedMessage": "மீண்டும் உள்நுழையவும்",
      "notAuthenticatedAction": "நேரடி டப்பிங்கைப் பயன்படுத்த உள்நுழையவும்",
      "premiumRequired": "பிரீமியம் அம்சம்",
      "premiumRequiredMessage": "நேரடி டப்பிங்கிற்கு பிரீமியம் சந்தா தேவை",
      "premiumRequiredAction": "இந்த அம்சத்தை அணுக பிரீமியத்திற்கு மேம்படுத்தவும்",
      "channelUnavailable": "கிடைக்கவில்லை",
      "channelUnavailableMessage": "இந்த சேனலுக்கு டப்பிங் கிடைக்கவில்லை",
      "audioCaptureError": "மைக்ரோஃபோன் பிழை",
      "audioCaptureErrorMessage": "உங்கள் மைக்ரோஃபோனை அணுக முடியவில்லை",
      "sttServiceError": "பேச்சு அங்கீகார பிழை",
      "sttServiceErrorMessage": "பேச்சை அங்கீகரிக்க முடியவில்லை",
      "ttsServiceError": "டப்பிங் பிழை",
      "ttsServiceErrorMessage": "டப் செய்யப்பட்ட ஆடியோவை உருவாக்க முடியவில்லை",
      "translationTimeout": "மொழிபெயர்ப்பு நேரம் முடிந்தது",
      "translationTimeoutMessage": "மொழிபெயர்ப்பு நீண்ட நேரம் எடுத்தது, மீண்டும் முயற்சிக்கிறது",
      "websocketClosed": "இணைப்பு துண்டிக்கப்பட்டது",
      "websocketClosedMessage": "டப்பிங் இணைப்பு மூடப்பட்டது",
      "rateLimitExceeded": "அதிக முயற்சிகள்",
      "rateLimitExceededMessage": "மீண்டும் முயற்சிக்கும் முன் காத்திருக்கவும்",
      "sessionTimeout": "அமர்வு காலாவதியானது",
      "sessionTimeoutMessage": "உங்கள் டப்பிங் அமர்வு காலாவதியாகிவிட்டது"
    }
  },
  "video": {
    "watchTrailer": "டிரெய்லர் பார்",
    "closeTrailer": "டிரெய்லரை மூடு",
    "deleteConfirm": "இந்த எபிசோடை நீக்கவா?"
  }
};

deepMerge(ta, translations);
fs.writeFileSync('ta.json', JSON.stringify(ta, null, 2) + '\n');
console.log('Part 4 complete');
