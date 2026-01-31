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
  "podcasts": {
    "tryLater": "பின்னர் முயற்சிக்கவும்"
  },
  "widgets": {
    "empty": "விட்ஜெட்கள் இல்லை",
    "emptyHint": "விட்ஜெட் சேர்க்க '+' பட்டனை அழுத்தவும்"
  },
  "children": {
    "admin": {
      "title": "குழந்தைகள் உள்ளடக்க மேலாளர்"
    }
  },
  "passkey": {
    "qr": {
      "useQR": "திறக்க தொலைபேசியைப் பயன்படுத்துங்கள்",
      "scanWithPhone": "உங்கள் தொலைபேசியால் ஸ்கேன் செய்யுங்கள்",
      "instruction": "அங்கீகரிக்க உங்கள் தொலைபேசியில் கேமராவைத் திறந்து QR குறியீட்டை ஸ்கேன் செய்யுங்கள்",
      "error": "QR குறியீட்டை உருவாக்க முடியவில்லை",
      "expired": "QR குறியீடு காலாவதியானது. மீண்டும் முயற்சிக்கவும்."
    }
  },
  "cities": {
    "privacy": {
      "lastUpdated": "கடைசியாக புதுப்பிக்கப்பட்டது: ஜனவரி 27, 2026",
      "intro": {
        "title": "1. அறிமுகம்",
        "content": "Olorin.ai LLC (\"நாங்கள்\", \"எங்கள்\" அல்லது \"நிறுவனம்\") உங்கள் தனியுரிமையைப் பாதுகாக்க உறுதிபூண்டுள்ளது.",
        "commitment": "Bayit+ ஐ \"தனியுரிமை-முதல்\" கட்டமைப்புடன் கட்டமைத்தோம். உங்கள் வாழ்க்கை அறையை நாங்கள் பதிவு செய்வதில்லை."
      }
    },
    "beta": {
      "credits": {
        "loading": "கிரெடிட் இருப்பை ஏற்றுகிறது...",
        "error": "கிரெடிட் இருப்பை ஏற்ற முடியவில்லை",
        "label": "AI கிரெடிட்கள்",
        "remaining": "மீதமுள்ள கிரெடிட்கள்",
        "warningCritical": "முக்கியம்: கிரெடிட்கள் குறைவாக உள்ளன",
        "warningLow": "எச்சரிக்கை: கிரெடிட் இருப்பு குறைவாக உள்ளது",
        "upgrade": "திட்டத்தை மேம்படுத்து",
        "upgradeAction": "அதிக கிரெடிட்கள் பெற மேம்படுத்துங்கள்"
      }
    }
  },
  "taxonomy": {
    "subcategories": {
      "learning-hebrew.description": "குழந்தைகளுக்கு எபிரேயத்தில் படிக்க, எழுத மற்றும் சொல்வளம் கற்றல்",
      "young-science.description": "குழந்தைகளுக்கு ஏற்ற பரிசோதனைகள் மற்றும் அறிவியல் விளக்கங்கள்",
      "math-fun.description": "வேடிக்கையான மற்றும் விளையாட்டான வழியில் எண்கள் மற்றும் கணிதம் கற்றல்",
      "nature-animals.description": "ஆர்வமுள்ள குழந்தைகளுக்கு விலங்குகள் மற்றும் இயற்கையின் உலகம்",
      "interactive.description": "குழந்தைகளுக்கான ஊடாடும் மற்றும் பங்கேற்பு உள்ளடக்கம்",
      "hebrew-songs.description": "கிளாசிக் மற்றும் புதிய இஸ்ரேலி குழந்தைகள் பாடல்கள்",
      "nursery-rhymes": "நர்சரி ரைம்ஸ்",
      "nursery-rhymes.description": "குழந்தைகள் மற்றும் சிறுவர்களுக்கான பாடல்கள் மற்றும் இசை",
      "kids-movies": "குழந்தைகள் திரைப்படங்கள்",
      "kids-movies.description": "குழந்தைகளுக்கு ஏற்ற முழு நீள திரைப்படங்கள்",
      "kids-series": "குழந்தைகள் தொடர்கள்",
      "kids-series.description": "குழந்தைகளுக்கான அனிமேஷன் தொடர்கள் மற்றும் டிவி நிகழ்ச்சிகள்",
      "jewish-holidays": "யூத விடுமுறைகள்",
      "jewish-holidays.description": "குழந்தைகளுக்கு யூத விடுமுறைகள் மற்றும் மரபுகள் பற்றிய உள்ளடக்கம்",
      "torah-stories": "தோரா கதைகள்",
      "torah-stories.description": "தோரா மற்றும் யூத மரபிலிருந்து கதைகள்",
      "bedtime-stories": "தூக்க நேர கதைகள்",
      "bedtime-stories.description": "தூக்க நேரத்திற்கான அமைதியான கதைகள்",
      "tiktok-trends": "TikTok டிரெண்ட்கள்",
      "tiktok-trends.description": "TikTok இல் சூடான டிரெண்ட்கள் மற்றும் சவால்கள்",
      "viral-videos": "வைரல் வீடியோக்கள்",
      "viral-videos.description": "சமூக ஊடகங்களில் பிரபலமான வைரல் வீடியோக்கள்",
      "memes": "மீம்ஸ்",
      "memes.description": "வேடிக்கையான மீம்ஸ் மற்றும் இணைய கலாச்சாரம்",
      "israel-news": "இஸ்ரேல் செய்திகள்",
      "israel-news.description": "இளைஞர்களுக்கு ஏற்ற இஸ்ரேல் செய்திகள்",
      "world-news": "உலக செய்திகள்",
      "world-news.description": "இளைஞர்களுக்கான சர்வதேச செய்திகள்",
      "science-news": "அறிவியல் செய்திகள்",
      "science-news.description": "அறிவியல் கண்டுபிடிப்புகள் மற்றும் தொழில்நுட்ப புதுமைகள்",
      "sports-news": "விளையாட்டு செய்திகள்",
      "sports-news.description": "விளையாட்டு புதுப்பிப்புகள் மற்றும் விளையாட்டு முடிவுகள்",
      "music-culture": "இசை கலாச்சாரம்",
      "music-culture.description": "இசை காட்சி, கலைஞர்கள் மற்றும் விழாக்கள்",
      "film-culture": "திரைப்பட கலாச்சாரம்",
      "film-culture.description": "சினிமா, தொடர்கள் மற்றும் விமர்சனங்கள்",
      "art-culture": "கலை கலாச்சாரம்",
      "art-culture.description": "கலை, கேலரிகள் மற்றும் படைப்பாற்றல்",
      "food-culture": "உணவு கலாச்சாரம்",
      "food-culture.description": "சமையல், சமையல் குறிப்புகள் மற்றும் உணவு கலாச்சாரம்",
      "study-help": "படிப்பு உதவி",
      "study-help.description": "தேர்வுகள், சுருக்கங்கள் மற்றும் தேர்வு தயாரிப்புக்கு உதவி",
      "career-prep": "தொழில் தயாரிப்பு",
      "career-prep.description": "பல்கலைக்கழகம் மற்றும் தொழில் தயாரிப்பு",
      "life-skills": "வாழ்க்கை திறன்கள்",
      "life-skills.description": "வாழ்க்கை திறன்கள், பண மேலாண்மை மற்றும் சுதந்திரம்",
      "teen-movies": "டீன் திரைப்படங்கள்",
      "teen-movies.description": "இளைஞர்களுக்கு பரிந்துரைக்கப்பட்ட திரைப்படங்கள்",
      "teen-series": "டீன் தொடர்கள்",
      "teen-series.description": "இளைஞர்களுக்கு பிரபலமான தொடர்கள்",
      "gaming": "கேமிங்",
      "gaming.description": "வீடியோ கேம்கள், ஈ-ஸ்போர்ட்ஸ் மற்றும் கேமிங்",
      "coding": "கோடிங்",
      "coding.description": "புரோகிராமிங், கோடிங் மற்றும் மென்பொருள் மேம்பாடு",
      "gadgets": "கேஜெட்கள்",
      "gadgets.description": "கேஜெட்கள், தொழில்நுட்பம் மற்றும் விமர்சனங்கள்",
      "bar-bat-mitzvah": "பர்/பாட் மிட்ஸ்வா",
      "bar-bat-mitzvah.description": "பர்/பாட் மிட்ஸ்வாவுக்கு தயாரிப்பு மற்றும் கொண்டாட்டங்கள்",
      "teen-torah": "டீன் தோரா",
      "teen-torah.description": "இளைஞர்களுக்கு தோரா வகுப்புகள் மற்றும் வாராந்திர பகுதி",
      "jewish-history": "யூத வரலாறு",
      "jewish-history.description": "யூத மக்களின் வரலாறு"
    }
  },
  "admin": {
    "content": {
      "import": {
        "pageTitle": "இலவச உள்ளடக்கத்தை இறக்குமதி செய்",
        "subtitle": "இலவச ஆதாரங்களிலிருந்து பொது உள்ளடக்கத்தை உலவி இறக்குமதி செய்யுங்கள்",
        "selectCategory": "இறக்குமதி செய்யப்பட்ட திரைப்படங்களுக்கு வகையை தேர்ந்தெடுக்கவும்:",
        "categoryPlaceholder": "வகையை தேர்ந்தெடுக்கவும்...",
        "loading": "ஆதாரங்களை ஏற்றுகிறது...",
        "sourceTypes": {
          "vod": "திரைப்படங்கள் & VOD",
          "live_tv": "நேரலை டிவி",
          "radio": "வானொலி",
          "podcasts": "போட்காஸ்ட்கள்"
        },
        "items": "உருப்படி",
        "itemsPlural": "உருப்படிகள்",
        "selectItems": "இறக்குமதி செய்ய குறைந்தபட்சம் ஒரு உருப்படியை தேர்ந்தெடுக்கவும்",
        "importing": "{{count}} இறக்குமதி செய்கிறது... {{percent}}%",
        "importButton": "{{count}} {{item}} இறக்குமதி செய்",
        "noSources": "ஆதாரங்கள் இல்லை",
        "noSourcesDescription": "{{type}} க்கு தற்போது இலவச உள்ளடக்க ஆதாரங்கள் இல்லை"
      },
      "movies": "திரைப்படங்கள்",
      "series": "தொடர்கள்",
      "audiobooks": "ஆடியோபுக்கள்",
      "podcasts": "போட்காஸ்ட்கள்",
      "filters": {
        "contentType": "உள்ளடக்க வகை",
        "series": "தொடர்கள்",
        "movies": "திரைப்படங்கள்",
        "audiobooks": "ஆடியோபுக்கள்",
        "podcasts": "போட்காஸ்ட்கள்",
        "radioStations": "வானொலி நிலையங்கள்",
        "allStatus": "அனைத்து நிலைகளும்"
      },
      "showOnlyWithSubtitles": "வசனங்கள் உள்ளவற்றை மட்டும் காட்டு",
      "status": {
        "published": "வெளியிடப்பட்டது",
        "draft": "வரைவு"
      },
      "columns": {
        "title": "தலைப்பு",
        "category": "வகை",
        "year": "ஆண்டு",
        "status": "நிலை",
        "views": "பார்வைகள்",
        "rating": "மதிப்பீடு",
        "streamUrl": "ஸ்ட்ரீம் URL",
        "epgSource": "EPG ஆதாரம்",
        "genre": "வகை",
        "episodeNumber": "எபிசோட் #",
        "description": "விளக்கம்",
        "duration": "கால அளவு",
        "publishedDate": "வெளியிடப்பட்டது",
        "episodes": "எபிசோட்கள்",
        "order": "வரிசை",
        "name": "பெயர்",
        "slug": "ஸ்லக்",
        "subtitles": "வசனங்கள்"
      },
      "validation": {
        "titleRequired": "தலைப்பு தேவை",
        "nameRequired": "பெயர் தேவை",
        "streamUrlRequired": "ஸ்ட்ரீம் URL தேவை",
        "audioUrlRequired": "ஆடியோ URL தேவை"
      },
      "episodes_one": "எபிசோட்",
      "episodes_other": "எபிசோட்கள்",
      "noEpisodes": "எபிசோட்கள் இல்லை",
      "toggleCarousel": "கரூசலை மாற்று",
      "type": {
        "series": "தொடர்",
        "movie": "திரைப்படம்"
      },
      "editor": {
        "pageTitle": "உள்ளடக்கத்தை திருத்து",
        "pageTitleNew": "உள்ளடக்கம் சேர்",
        "sections": {
          "basicInfo": "அடிப்படை தகவல்",
          "media": "மீடியா",
          "streaming": "ஸ்ட்ரீமிங்",
          "details": "உள்ளடக்க விவரங்கள்",
          "publishing": "வெளியீடு",
          "accessControl": "அணுகல் கட்டுப்பாடு",
          "podcastDetails": "போட்காஸ்ட் விவரங்கள்",
          "episodeDetails": "எபிசோட் விவரங்கள்",
          "stationDetails": "நிலைய விவரங்கள்",
          "channelDetails": "சேனல் விவரங்கள்"
        },
        "fields": {
          "title": "தலைப்பு",
          "titlePlaceholder": "உள்ளடக்க தலைப்பு",
          "titleRequired": "தலைப்பு தேவை",
          "year": "ஆண்டு",
          "yearPlaceholder": "2024",
          "description": "விளக்கம்",
          "descriptionPlaceholder": "உள்ளடக்க விளக்கம்",
          "thumbnail": "சிறுபடம் (3:4 விகிதம்)",
          "thumbnailUrl": "சிறுபட URL",
          "backdrop": "பின்னணி (16:9 விகிதம்)",
          "backdropUrl": "பின்னணி URL",
          "posterCover": "போட்காஸ்ட் அட்டை",
          "logo": "லோகோ",
          "channelLogo": "சேனல் லோகோ",
          "stationLogo": "நிலைய லோகோ",
          "streamUrl": "ஸ்ட்ரீம் URL",
          "streamUrlRequired": "ஸ்ட்ரீம் URL தேவை",
          "streamType": "ஸ்ட்ரீம் வகை",
          "drmProtected": "DRM பாதுகாக்கப்பட்டது",
          "category": "வகை",
          "categoryRequired": "வகை தேவை",
          "duration": "கால அளவு",
          "rating": "மதிப்பீடு",
          "genre": "வகை",
          "director": "இயக்குனர்",
          "isSeries": "தொடர்",
          "season": "பருவம்",
          "episode": "எபிசோட்",
          "isPublished": "வெளியிடு",
          "isFeatured": "சிறப்பு",
          "requiresSubscription": "தேவையான சந்தா",
          "isKidsContent": "குழந்தைகள் உள்ளடக்கம்",
          "author": "ஆசிரியர்",
          "rssFeed": "RSS ஊட்டம் URL",
          "website": "வலைதள URL",
          "episodeNumber": "எபிசோட் #",
          "seasonNumber": "பருவம் #",
          "audioUrl": "ஆடியோ URL",
          "audioUrlRequired": "ஆடியோ URL தேவை",
          "publishedAt": "வெளியிடப்பட்ட தேதி"
        },
        "subscriptionTiers": {
          "basic": "அடிப்படை",
          "premium": "பிரீமியம்",
          "family": "குடும்பம்"
        },
        "actions": {
          "save": "சேமி",
          "saving": "சேமிக்கிறது...",
          "cancel": "ரத்து செய்"
        },
        "imageUpload": {
          "dropHere": "படத்தை இங்கே இழுக்கவும் அல்லது பதிவேற்ற கிளிக் செய்யவும்",
          "formats": "PNG, JPG, WebP {{maxSize}}MB வரை",
          "uploading": "பதிவேற்றுகிறது...",
          "success": "படம் வெற்றிகரமாக பதிவேற்றப்பட்டது",
          "orPasteUrl": "அல்லது பட URL ஐ ஒட்டவும்",
          "clear": "படத்தை அகற்று",
          "changeImage": "படத்தை மாற்று",
          "errors": {
            "imageOnly": "பட கோப்பை தேர்ந்தெடுக்கவும்",
            "tooLarge": "கோப்பு அளவு {{maxSize}}MB க்கும் குறைவாக இருக்க வேண்டும்",
            "uploadFailed": "பதிவேற்றம் தோல்வியடைந்தது",
            "invalidUrl": "தவறான URL"
          }
        }
      },
      "categoryPicker": {
        "selectPlaceholder": "வகையை தேர்ந்தெடுக்கவும்...",
        "searchPlaceholder": "வகைகளை தேடு...",
        "loading": "வகைகளை ஏற்றுகிறது...",
        "noResults": "வகைகள் கிடைக்கவில்லை",
        "noCategories": "வகைகள் இல்லை",
        "createNew": "புதிய வகை உருவாக்கு",
        "errors": {
          "loadFailed": "வகைகளை ஏற்ற முடியவில்லை",
          "createFailed": "வகையை உருவாக்க முடியவில்லை"
        },
        "modal": {
          "title": "புதிய வகை உருவாக்கு",
          "placeholder": "வகை பெயர் (எ.கா., திரைப்படங்கள், தொடர்கள்)",
          "creating": "உருவாக்குகிறது...",
          "create": "உருவாக்கு"
        }
      },
      "streamUrlInput": {
        "copyUrl": "URL நகலெடு",
        "copied": "URL கிளிப்போர்டுக்கு நகலெடுக்கப்பட்டது",
        "streamType": "ஸ்ட்ரீம் வகை",
        "validUrl": "URL செல்லுபடியாகும் - {{type}} ஆக கண்டறியப்பட்டது",
        "errors": {
          "required": "ஸ்ட்ரீம் URL தேவை",
          "invalidFormat": "தவறான URL வடிவம்"
        },
        "supportedFormats": {
          "title": "ஆதரிக்கப்படும் வடிவங்கள்:",
          "hls": "HLS: .m3u8 ஸ்ட்ரீம்கள்",
          "dash": "DASH: .mpd ஸ்ட்ரீம்கள்",
          "audio": "ஆடியோ: .mp3, .aac அல்லது ஆடியோ ஸ்ட்ரீம்கள்"
        }
      },
      "batchMerge": "ஒன்றிணை",
      "mergeContent": "உள்ளடக்கத்தை ஒன்றிணை",
      "selectItemToKeep": "வைத்திருக்க உருப்படியை தேர்ந்தெடுக்கவும்",
      "removeAction": "அகற்றப்பட்ட உருப்படிகளுக்கு என்ன செய்வது?",
      "removeActionUnpublish": "வெளியிடுதலை நீக்கு (பரிந்துரைக்கப்படுகிறது)",
      "removeActionDelete": "நிரந்தரமாக நீக்கு",
      "unpublishDescription": "உருப்படிகள் மறைக்கப்படும் ஆனால் பின்னர் மீட்டெடுக்கலாம்",
      "deleteWarning": "⚠️ நீக்கப்பட்ட உருப்படிகளை மீட்டெடுக்க முடியாது",
      "mergeReason": "ஒன்றிணைப்புக்கான காரணம்",
      "mergeReasonPlaceholder": "காரணத்தை உள்ளிடவும் (குறைந்தது 10 எழுத்துக்கள்)...",
      "mergeReasonTooShort": "காரணம் குறைந்தது 10 எழுத்துக்கள் இருக்க வேண்டும்",
      "confirmMerge": "உருப்படிகளை ஒன்றிணை",
      "itemWillBeKept": "இந்த உருப்படி வைத்திருக்கப்படும்",
      "itemsWillBeRemoved": "{{count}} உருப்படி {{action}} செய்யப்படும்",
      "itemsWillBeRemoved_plural": "{{count}} உருப்படிகள் {{action}} செய்யப்படும்",
      "mergeSuccess": "{{count}} உருப்படிகள் வெற்றிகரமாக ஒன்றிணைக்கப்பட்டன",
      "mergeFailed": "உள்ளடக்கத்தை ஒன்றிணைக்க முடியவில்லை",
      "merge": {
        "wizard": "உள்ளடக்க ஒன்றிணைப்பு வழிகாட்டி",
        "errorMixedTypes": "தொடர்கள் மற்றும் திரைப்படங்களை ஒன்றாக ஒன்றிணைக்க முடியாது",
        "errorDifferentNames": "உருப்படிகள் பொருந்தக்கூடிய அல்லது ஒத்த பெயர்களைக் கொண்டிருக்கவில்லை",
        "cannotMerge": "இந்த உருப்படிகளை ஒன்றிணைக்க முடியாது",
        "canMerge": "உருப்படிகளை ஒன்றிணைக்கலாம்",
        "suggestions": "பரிந்துரைகள்:",
        "validationPassed": "இந்த உருப்படிகள் ஒத்த பெயர்களைக் கொண்டுள்ளன மற்றும் ஒன்றிணைக்க இணக்கமானவை.",
        "continue": "தொடர்",
        "selectBase": "அடிப்படை உருப்படியை தேர்ந்தெடுக்கவும்",
        "configure": "ஒன்றிணைப்பை உள்ளமை",
        "contentTransfer": "உள்ளடக்க மாற்றம்",
        "transferSeasons": "பருவங்களை மாற்று",
        "transferEpisodes": "எபிசோட்களை மாற்று",
        "metadataPreferences": "மெட்டாடேட்டா விருப்பங்கள்",
        "baseItem": "அடிப்படை உருப்படி",
        "mergePreview": "ஒன்றிணைப்பு முன்னோட்டம்",
        "itemsToMerge": "ஒன்றிணைக்க உருப்படிகள்",
        "confirmButton": "உருப்படிகளை ஒன்றிணை",
        "merging": "ஒன்றிணைக்கிறது...",
        "mergeSuccess": "ஒன்றிணைப்பு வெற்றிகரமானது"
      }
    },
    "uploads": {
      "title": "பதிவேற்ற மேலாண்மை",
      "subtitle": "கோப்புறைகளை கண்காணித்து உள்ளடக்க பதிவேற்றங்களை நிர்வகிக்கவும்",
      "queueDashboard": {
        "title": "பதிவேற்ற வரிசை டாஷ்போர்டு",
        "stats": "வரிசை புள்ளிவிவரங்கள்",
        "total": "மொத்தம்",
        "queued": "வரிசையில்",
        "active": "செயலில்",
        "done": "முடிந்தது",
        "activeJob": "செயலில் உள்ள பதிவேற்றம்",
        "queuedJobs": "வரிசையில் உள்ள பதிவேற்றங்கள்",
        "recentCompleted": "சமீபத்திய முடிவுகள்",
        "noActiveJob": "செயலில் உள்ள பதிவேற்றங்கள் இல்லை",
        "noActiveJobDescription": "வரிசை காலியாக உள்ளது. கோப்புகளை பதிவேற்றவும் அல்லது கண்காணிக்கப்படும் கோப்புறைகளை ஸ்கேன் செய்யவும்."
      },
      "manualUpload": {
        "title": "கைமுறை பதிவேற்றம்",
        "subtitle": "உங்கள் சாதனத்திலிருந்து கோப்புகளை நேரடியாக பதிவேற்றவும்",
        "browserUpload": "உலாவி பதிவேற்றம்",
        "urlUpload": "URL இறக்குமதி",
        "contentType": "உள்ளடக்க வகை",
        "dropZone": "இழுத்து விடும் பகுதி",
        "dropHere": "வீடியோ கோப்புகளை இங்கே இழுக்கவும் அல்லது உலாவ கிளிக் செய்யவும்",
        "selectFiles": "கோப்புகளை தேர்ந்தெடு",
        "selectedFiles": "{{count}} கோப்பு(கள்) தேர்ந்தெடுக்கப்பட்டன",
        "clearAll": "அனைத்தையும் அழி",
        "uploadFiles": "கோப்புகளை பதிவேற்று",
        "uploading": "பதிவேற்றுகிறது...",
        "uploadComplete": "பதிவேற்றம் முடிந்தது",
        "uploadSuccess": "{{count}} கோப்பு(கள்) வெற்றிகரமாக பதிவேற்றப்பட்டன",
        "uploadFailed": "பதிவேற்றம் தோல்வியடைந்தது: {{error}}"
      },
      "urlUpload": {
        "title": "URL இலிருந்து இறக்குமதி",
        "subtitle": "தொலைநிலை URL களிலிருந்து வீடியோ கோப்புகளை இறக்குமதி செய்",
        "urlLabel": "வீடியோ URL",
        "urlPlaceholder": "https://example.com/video.mp4",
        "importButton": "URL இலிருந்து இறக்குமதி",
        "importing": "இறக்குமதி செய்கிறது...",
        "importSuccess": "URL இலிருந்து வெற்றிகரமாக இறக்குமதி செய்யப்பட்டது",
        "importFailed": "இறக்குமதி தோல்வியடைந்தது: {{error}}"
      },
      "monitoredFolders": {
        "title": "கண்காணிக்கப்படும் கோப்புறைகள்",
        "subtitle": "உள்ளடக்கத்தை தானாக கண்டறிந்து பதிவேற்ற கோப்புறைகளை உள்ளமைக்கவும்",
        "noFolders": "கண்காணிக்கப்படும் கோப்புறைகள் இல்லை",
        "addFolder": "கோப்புறை சேர்",
        "editFolder": "கோப்புறையை திருத்து",
        "deleteFolder": "கோப்புறையை நீக்கு",
        "scanFolder": "கோப்புறையை ஸ்கேன் செய்",
        "scanning": "ஸ்கேன் செய்கிறது...",
        "scanComplete": "ஸ்கேன் முடிந்தது: {{count}} கோப்பு(கள்) கிடைத்தன"
      },
      "dryRun": {
        "title": "உலர் இயக்க பயன்முறை",
        "enabled": "உலர் இயக்கம் இயக்கப்பட்டது",
        "disabled": "உலர் இயக்கம் முடக்கப்பட்டது",
        "description": "உண்மையில் கோப்புகளை மாற்றாமல் பதிவேற்றத்தை முன்னோட்டமிடு"
      },
      "connectionStatus": {
        "connected": "இணைக்கப்பட்டது",
        "disconnected": "துண்டிக்கப்பட்டது",
        "reconnecting": "மீண்டும் இணைக்கிறது..."
      },
      "contentTypes": {
        "movie": "திரைப்படம்",
        "series": "தொடர்",
        "podcast": "போட்காஸ்ட்",
        "other": "மற்றவை"
      },
      "stages": {
        "browserUpload": "உலாவி பதிவேற்றம்",
        "hashCalculation": "ஹாஷ் கணக்கீடு",
        "duplicateCheck": "நகல் சோதனை",
        "metadataExtraction": "மெட்டாடேட்டா பிரித்தெடுப்பு",
        "gcsUpload": "கிளவுட் பதிவேற்றம்",
        "databaseInsert": "தரவுத்தள செருகல்",
        "complete": "முடிந்தது",
        "failed": "தோல்வியடைந்தது"
      },
      "status": {
        "queued": "வரிசையில்",
        "processing": "செயலாக்குகிறது",
        "uploading": "பதிவேற்றுகிறது",
        "complete": "முடிந்தது",
        "failed": "தோல்வியடைந்தது",
        "cancelled": "ரத்து செய்யப்பட்டது",
        "skipped": "தவிர்க்கப்பட்டது (நகல்)"
      },
      "actions": {
        "pauseQueue": "வரிசையை இடைநிறுத்து",
        "resumeQueue": "வரிசையை தொடர்",
        "clearQueue": "வரிசையை அழி",
        "triggerUpload": "கோப்புறைகளை ஸ்கேன் செய்",
        "refresh": "புதுப்பி",
        "cancel": "ரத்து செய்",
        "retry": "மீண்டும் முயற்சி",
        "remove": "அகற்று"
      },
      "errors": {
        "loadFailed": "பதிவேற்ற தரவை ஏற்ற முடியவில்லை",
        "saveFailed": "கோப்புறை உள்ளமைவை சேமிக்க முடியவில்லை",
        "deleteFailed": "கண்காணிக்கப்படும் கோப்புறையை நீக்க முடியவில்லை",
        "uploadFailed": "பதிவேற்றம் தோல்வியடைந்தது",
        "networkError": "நெட்வொர்க் பிழை. இணைப்பை சரிபார்க்கவும்.",
        "authError": "அங்கீகார பிழை. மீண்டும் உள்நுழையவும்.",
        "serverError": "சர்வர் பிழை. பின்னர் முயற்சிக்கவும்."
      },
      "mobile": {
        "dataWarning": "செல்லுலர் தரவில் உள்ளீர்கள். {{size}} பதிவேற்றம் குறிப்பிடத்தக்க தரவைப் பயன்படுத்தலாம்.",
        "dataWarningProceed": "எப்படியும் தொடர்"
      },
      "accessibility": {
        "queueLoadedOne": "1 உருப்படியுடன் பதிவேற்ற வரிசை ஏற்றப்பட்டது",
        "queueLoadedOther": "{{count}} உருப்படிகளுடன் பதிவேற்ற வரிசை ஏற்றப்பட்டது",
        "uploadStartedOne": "1 கோப்புக்கு பதிவேற்றம் தொடங்கியது",
        "uploadStartedOther": "{{count}} கோப்புகளுக்கு பதிவேற்றம் தொடங்கியது",
        "uploadProgressUpdate": "பதிவேற்ற முன்னேற்றம்: {{percent}}% முடிந்தது",
        "uploadProgressMilestone": "பதிவேற்றம் {{percent}}% முடிந்தது",
        "emptyStateAction": "செயலை செய்ய Enter அழுத்தவும்",
        "connectionStatusRegion": "இணைப்பு நிலை தகவல்",
        "queueStatsRegion": "வரிசை புள்ளிவிவரங்கள் பகுதி",
        "shortcuts": {
          "uploadFocused": "பதிவேற்ற உள்ளீடு கவனம் செலுத்தப்பட்டது. கோப்புகளை தேர்ந்தெடுக்க Enter அழுத்தவும்.",
          "queueRefreshed": "வரிசை கைமுறையாக புதுப்பிக்கப்பட்டது."
        }
      }
    },
    "librarian": {
      "errors": {
        "failedToClearReports": "தணிக்கை அறிக்கைகளை அழிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
        "failedToPause": "தணிக்கையை இடைநிறுத்த முடியவில்லை",
        "failedToResume": "தணிக்கையை தொடர முடியவில்லை",
        "failedToCancel": "தணிக்கையை ரத்து செய்ய முடியவில்லை",
        "failedToInterject": "AI முகவருக்கு செய்தி அனுப்ப முடியவில்லை",
        "budgetExceeded": "மாதாந்திர பட்ஜெட் வரம்பு மீறப்பட்டது. தணிக்கையை இயக்க முடியாது.",
        "contactAdmin": "சரியான உள்ளமைவு இல்லாமல் நூலகர் பக்கத்தை ஏற்ற முடியாது.\nஉங்கள் நிர்வாகியைத் தொடர்பு கொள்ளவும்."
      },
      "quickActions": {
        "scopeFiltersHelp": "இயக்க திறன்களைத் தேர்ந்தெடுக்கவும் (பல இணைக்கலாம்)",
        "last24Hours": "சமீபத்திய உள்ளடக்கம் மட்டும்",
        "last24HoursHelp": "கடந்த 24 மணி நேரத்தில் சேர்க்கப்பட்ட உள்ளடக்கத்திற்கு தணிக்கையை வரம்பிடு",
        "cybTitlesOnly": "அசுத்த தலைப்புகளை சுத்தம் செய்",
        "cybTitlesOnlyHelp": "தலைப்புகளிலிருந்து கோப்பு நீட்டிப்புகள், தர குறிப்பான்கள் மற்றும் வெளியீட்டு குறிச்சொற்களை அகற்று",
        "tmdbPostersOnly": "TMDB போஸ்டர்கள் & மெட்டாடேட்டா",
        "tmdbPostersOnlyHelp": "TMDB இலிருந்து விடுபட்ட போஸ்டர்கள், விளக்கங்கள் மற்றும் மெட்டாடேட்டாவைப் பெறு",
        "openSubtitlesEnabled": "வசனங்களைப் பெறு",
        "openSubtitlesEnabledHelp": "OpenSubtitles இலிருந்து விடுபட்ட வசனங்களைப் பதிவிறக்கு (HE/EN/ES)",
        "classifyOnly": "வகைப்படுத்தலை சரிபார்",
        "classifyOnlyHelp": "திரைப்படம் vs தொடர் வகைப்படுத்தல் பிழைகளை சரிபார்த்து சரிசெய்",
        "purgeDuplicates": "நகல்களை அகற்று",
        "purgeDuplicatesHelp": "நகல் உள்ளடக்க உருப்படிகளை கண்டறிந்து அகற்று",
        "auditType": "தணிக்கை வகை",
        "auditTypeHelp": "விதி அடிப்படையிலான அல்லது AI-இயக்கும் தணிக்கையை தேர்வு செய்யவும்",
        "dailyAudit": "தினசரி தணிக்கை",
        "dailyBadge": "விதி அடிப்படையிலான • வேகமான • இலவசம்",
        "dailyDescription": "கடந்த 7 நாட்களில் மாற்றப்பட்ட உள்ளடக்கத்தில் முன்வரையறுக்கப்பட்ட சோதனைகளை இயக்குகிறது.",
        "aiAgentAudit": "AI முகவர் தணிக்கை",
        "aiAgentBadge": "AI-இயக்கும் • புத்திசாலி • பட்ஜெட் பயன்படுத்துகிறது",
        "aiAgentDescription": "தன்னியக்க AI முகவர் (Claude) என்ன சரிபார்க்க வேண்டும் என்பது பற்றி புத்திசாலித்தனமான முடிவுகளை எடுக்கிறது.",
        "auditRunningNotice": "தணிக்கை தற்போது இயங்குகிறது. முடிந்ததும் பட்டன்கள் இயக்கப்படும்.",
        "monthlyBudgetLimit": "/ ${{limit}} மாதாந்திர",
        "budgetWarning": "இந்த தணிக்கையை இயக்குவது மாதாந்திர பட்ஜெட் வரம்பை மீறும்",
        "aiAuditSuccess": "AI முகவர் தணிக்கை வெற்றிகரமாக தொடங்கப்பட்டது. {{dryRun}}",
        "dailyAuditSuccess": "தினசரி தணிக்கை வெற்றிகரமாக தொடங்கப்பட்டது. {{dryRun}}",
        "dryRunMode": "(உலர் இயக்க பயன்முறை)",
        "rollbackSuccess": "செயல் வெற்றிகரமாக மீட்டெடுக்கப்பட்டது."
      },
      "voice": {
        "speaking": "நூலகர் பதிலளிக்கிறார்...",
        "examples": "எடுத்துக்காட்டு கட்டளைகள்",
        "example1": "கடந்த 24 மணி நேரத்தில் விடுபட்ட போஸ்டர்களை சரிபார்க்கவும்",
        "example2": "CYB தலைப்புகளுக்கு மெட்டாடேட்டாவை சரிசெய்யவும்",
        "example3": "உடைந்த ஸ்ட்ரீமிங் URL களை ஸ்கேன் செய்யவும்",
        "example4": "திரைப்படங்களிலிருந்து வசனங்களைப் பிரித்தெடுக்கவும்",
        "notSupported": "உங்கள் உலாவியில் குரல் அங்கீகாரம் ஆதரிக்கப்படவில்லை. Chrome, Edge அல்லது Safari பயன்படுத்தவும்.",
        "notAvailable": "குரல் கட்டுப்பாடு கிடைக்கவில்லை",
        "noSpeech": "பேச்சு கண்டறியப்படவில்லை. மீண்டும் முயற்சிக்கவும்.",
        "noMicrophone": "மைக்ரோஃபோன் கண்டறியப்படவில்லை. உங்கள் சாதனத்தை சரிபார்க்கவும்.",
        "microphoneBlocked": "மைக்ரோஃபோன் அணுகல் தடுக்கப்பட்டது. உலாவி அமைப்புகளில் இயக்கவும்.",
        "error": "பேச்சு அங்கீகார பிழை: {{error}}",
        "startFailed": "குரல் அங்கீகாரத்தைத் தொடங்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
        "commandFailed": "கட்டளையை செயல்படுத்த முடியவில்லை. மீண்டும் முயற்சிக்கவும்."
      },
      "schedules": {
        "viewInConsole": "Cloud Console இல் காண்",
        "modifyNote": "அட்டவணைகளை மாற்ற, Google Cloud Console பயன்படுத்தவும்",
        "editTitle": "அட்டவணையை திருத்து",
        "editNotAvailable": "அட்டவணை திருத்துதல் கிடைக்கவில்லை",
        "editNotAvailableMessage": "அட்டவணை மாற்றங்களுக்கு Cloud Scheduler API ஒருங்கிணைப்பு தேவை.",
        "cronExpression": "Cron வெளிப்பாடு",
        "cronHint": "வடிவம்: நிமிடம் மணி நாள் மாதம் வாரநாள் (எ.கா., 0 2 * * * = தினமும் 2:00 AM க்கு)",
        "patterns": {
          "daily": "{{hour}}:{{minute}} க்கு தினமும்",
          "weekly": "ஒவ்வொரு {{day}} {{hour}}:{{minute}} க்கு"
        },
        "days": {
          "sunday": "ஞாயிறு",
          "monday": "திங்கள்",
          "tuesday": "செவ்வாய்",
          "wednesday": "புதன்",
          "thursday": "வியாழன்",
          "friday": "வெள்ளி",
          "saturday": "சனி"
        }
      },
      "reports": {
        "clearedSuccessfully": "அனைத்து தணிக்கை அறிக்கைகளும் வெற்றிகரமாக அழிக்கப்பட்டன",
        "columns": {
          "triggeredBy": "தொடங்கியவர்",
          "parameters": "அளவுருக்கள்",
          "stats": "சிக்கல்கள் / சரிசெய்தல்கள்"
        },
        "downloadReport": "அறிக்கையைப் பதிவிறக்கு",
        "detailModal": {
          "title": "தணிக்கை அறிக்கை: {{id}}",
          "summary": "சுருக்கம்",
          "status": "நிலை",
          "executionTime": "செயல்படுத்தல் நேரம்",
          "totalItems": "மொத்த உருப்படிகள்",
          "healthyItems": "ஆரோக்கியமான உருப்படிகள்",
          "issuesFound": "கண்டறியப்பட்ட சிக்கல்கள்",
          "issuesBreakdown": "சிக்கல்கள் பிரிவு",
          "totalIssues": "கண்டறியப்பட்ட மொத்த சிக்கல்கள்",
          "brokenStreams": "உடைந்த ஸ்ட்ரீம்கள்",
          "missingMetadata": "விடுபட்ட மெட்டாடேட்டா",
          "misclassifications": "தவறான வகைப்படுத்தல்கள்",
          "orphanedItems": "அனாதை உருப்படிகள்",
          "fixesApplied": "பயன்படுத்தப்பட்ட சரிசெய்தல்கள்",
          "aiInsights": "AI நுண்ணறிவுகள்"
        }
      },
      "logs": {
        "auditType": "தணிக்கை வகை",
        "started": "தொடங்கியது",
        "completed": "முடிந்தது",
        "lastLog": "கடைசி பதிவு",
        "staleWarning": "{{seconds}} வினாடிகளாக புதிய பதிவுகள் இல்லை - வேலை செயலாக்கப்படலாம் அல்லது சிக்கியிருக்கலாம்",
        "pollingStatus": "போலிங் செயலில் • கடைசியாக சரிபார்க்கப்பட்டது",
        "connecting": "நேரலை தணிக்கை பதிவுடன் இணைக்கிறது...",
        "aiInsightPrefix": "AI நுண்ணறிவு",
        "items": "உருப்படிகள்",
        "live": "நேரலை",
        "updatedAgo": "{{time}} முன் புதுப்பிக்கப்பட்டது",
        "justNow": "இப்போதுதான்",
        "emptyState": {
          "title": "செயலில் உள்ள தணிக்கை இல்லை",
          "description": "நேரலை செயல்படுத்தல் பதிவுகளை காண தணிக்கையைத் தொடங்குங்கள்",
          "dailyTitle": "தினசரி தணிக்கை",
          "dailyFeature1": "வேகமான",
          "dailyFeature2": "விதி அடிப்படையிலான",
          "dailyFeature3": "அதிகரிப்பு",
          "aiTitle": "AI முகவர் தணிக்கை",
          "aiFeature1": "புத்திசாலி",
          "aiFeature2": "தகவமைப்பு",
          "aiFeature3": "விரிவான",
          "trigger": "தொடங்கு",
          "lastRun": "கடைசி இயக்கம்: {{time}}"
        },
        "source": {
          "librarian": "நூலகர்",
          "aiAgent": "AI முகவர்"
        },
        "levels": {
          "debug": "DEBUG",
          "info": "INFO",
          "warn": "WARN",
          "error": "ERROR",
          "success": "SUCCESS",
          "trace": "TRACE"
        },
        "auditStarted": "தணிக்கை தொடங்கியது",
        "brokenStreamsFound": "{{count}} உடைந்த ஸ்ட்ரீம்(கள்) கண்டறியப்பட்டன",
        "missingMetadataFound": "விடுபட்ட மெட்டாடேட்டா உள்ள {{count}} உருப்படி(கள்) கண்டறியப்பட்டன",
        "misclassificationsFound": "{{count}} தவறான வகைப்படுத்தப்பட்ட உருப்படி(கள்) கண்டறியப்பட்டன",
        "orphanedItemsFound": "{{count}} அனாதை உருப்படி(கள்) கண்டறியப்பட்டன",
        "fixesApplied": "{{count}} சரிசெய்தல்(கள்) பயன்படுத்தப்பட்டன",
        "auditCompleted": "தணிக்கை {{status}} {{duration}} வினாடிகளில்",
        "auditInitializing": "🚀 {{auditType}} தணிக்கையைத் தொடங்குகிறது...",
        "dryRunMode": "⚠️ உலர் இயக்க பயன்முறையில் இயங்குகிறது - மாற்றங்கள் செய்யப்படாது",
        "liveMode": "✅ நேரலை பயன்முறையில் இயங்குகிறது - மாற்றங்கள் பயன்படுத்தப்படும்",
        "budgetSet": "💰 பட்ஜெட் வரம்பு: ${{budget}}",
        "connectingToAgent": "🔗 Claude AI முகவருடன் இணைக்கிறது..."
      },
      "audit": {
        "interject": "குறுக்கிடு",
        "interjectTitle": "AI முகவருக்கு செய்தி அனுப்பு",
        "interjectHint": "இந்த செய்தி அடுத்த மறுசெய்கையில் AI முகவர் உரையாடலில் செலுத்தப்படும்.",
        "interjectPlaceholder": "எ.கா., திரைப்படங்களில் மட்டும் கவனம் செலுத்துங்கள், தொடர்களைத் தவிர்க்கவும்...",
        "sendInterject": "அனுப்பு",
        "interjectSuccess": "AI முகவருக்கு செய்தி வெற்றிகரமாக அனுப்பப்பட்டது",
        "pauseSuccess": "தணிக்கை வெற்றிகரமாக இடைநிறுத்தப்பட்டது",
        "resumeSuccess": "தணிக்கை வெற்றிகரமாக தொடர்ந்தது",
        "cancelSuccess": "தணிக்கை வெற்றிகரமாக ரத்து செய்யப்பட்டது"
      },
      "progress": {
        "batch": "தொகுதி {{current}} / {{total}}",
        "items": "{{processed}} / {{total}} உருப்படிகள்",
        "finishing": "முடிக்கிறது...",
        "finalizing": "அறிக்கை உருவாக்கி சரிசெய்தல்களைப் பயன்படுத்துகிறது"
      },
      "activityLog": {
        "title": "செயல்பாட்டு பதிவு",
        "subtitle": "{{count}} செயல்கள் பதிவு செய்யப்பட்டன",
        "filterByType": "வகை மூலம் வடிகட்டு",
        "allActions": "அனைத்து செயல்கள்",
        "content": "உள்ளடக்கம்",
        "noDescription": "விளக்கம் இல்லை",
        "updatedFields": "{{fields}} புதுப்பிக்கப்பட்டது",
        "issueType": "சிக்கல் வகை",
        "confidence": "நம்பிக்கை",
        "autoApproved": "தானாக அங்கீகரிக்கப்பட்டது",
        "changes": "மாற்றங்கள்",
        "actionTypes": {
          "addPoster": "போஸ்டர் சேர்",
          "updateMetadata": "மெட்டாடேட்டா புதுப்பி",
          "recategorize": "மறு வகைப்படுத்து",
          "fixUrl": "URL சரிசெய்",
          "cleanTitle": "தலைப்பு சுத்தம் செய்",
          "classify": "வகைப்படுத்து"
        },
        "rollback": "மீட்டெடு",
        "rolledBack": "மீட்டெடுக்கப்பட்டது",
        "confirmRollback": {
          "title": "மீட்டெடுப்பை உறுதிப்படுத்து",
          "message": "இந்த செயலை மீட்டெடுக்க விரும்புகிறீர்களா? இது முந்தைய நிலையை மீட்டெடுக்கும்."
        },
        "emptyMessage": "செயல்கள் இல்லை"
      },
      "modal": {
        "confirmAI": {
          "title": "AI முகவர் தணிக்கையைத் தொடங்கவா?",
          "message": "இது ${{budget}} பட்ஜெட் வரம்புடன் தன்னியக்க AI முகவர் தணிக்கையைத் தொடங்கும். {{dryRun}}",
          "dryRunNote": "உலர் இயக்க பயன்முறையில் இயங்குகிறது (மாற்றங்கள் செய்யப்படாது)."
        },
        "cancel": "ரத்து செய்",
        "confirm": "உறுதிப்படுத்து",
        "close": "மூடு",
        "retry": "மீண்டும் முயற்சி"
      },
      "status": {
        "partial": "பகுதியாக முடிந்தது",
        "pending": "நிலுவையில்"
      },
      "auditTypes": {
        "daily_incremental": "தினசரி அதிகரிப்பு",
        "ai_agent": "AI முகவர்"
      }
    },
    "push": {
      "titlePlaceholder": "அறிவிப்பு தலைப்பு",
      "bodyPlaceholder": "அறிவிப்பு செய்தி"
    }
  }
};

deepMerge(ta, translations);
fs.writeFileSync('ta.json', JSON.stringify(ta, null, 2) + '\n');
console.log('Part 7: Comprehensive Tamil translations added for all remaining missing sections');
