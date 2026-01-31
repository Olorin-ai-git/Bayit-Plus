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
  "empty": {
    "noContent": "உள்ளடக்கம் இல்லை",
    "tryAnotherCategory": "வேறு வகையைத் தேர்ந்தெடுக்கவும்",
    "noPodcasts": "பாட்காஸ்ட்கள் இல்லை",
    "tryLater": "பின்னர் மீண்டும் முயற்சிக்கவும்",
    "noResults": "முடிவுகள் இல்லை"
  },
  "content": {
    "genres": "வகைகள்",
    "released": "வெளியிடப்பட்டது",
    "starring": "நடிக்கின்றனர்",
    "seasons": "சீசன்கள்",
    "ep": "எபி",
    "selectSeason": "சீசனைத் தேர்ந்தெடு",
    "noEpisodes": "எபிசோட்கள் இல்லை",
    "noEpisodesAvailable": "இயக்க எபிசோட்கள் இல்லை",
    "loadingSeries": "தொடர் தகவல் ஏற்றப்படுகிறது...",
    "votes": "வாக்குகள்",
    "imdbRating": "IMDB மதிப்பீடு",
    "preview": "முன்னோட்டம்",
    "previewPlaying": "முன்னோட்டம் இயங்குகிறது",
    "trailerPlaying": "டிரெய்லர் இயங்குகிறது",
    "youMayAlsoLike": "நீங்கள் விரும்பலாம்",
    "availableSubtitles": "கிடைக்கும் வசன வரிகள்",
    "subtitleSelected": "தேர்ந்தெடுக்கப்பட்டது: {{language}}"
  },
  "audiobooks": {
    "audiobook": "ஒலிப்புத்தகம்",
    "chapter": "அத்தியாயம்",
    "chapters": "அத்தியாயங்கள்",
    "playChapter": "அத்தியாயத்தை இயக்கு",
    "noChapters": "அத்தியாயங்கள் இல்லை",
    "notFound": "ஒலிப்புத்தகம் இல்லை",
    "author": "ஆசிரியர்",
    "narrator": "விவரிப்பாளர்",
    "duration": "கால அளவு",
    "isbn": "ISBN"
  },
  "breadcrumbs": {
    "series": "தொடர்",
    "movie": "திரைப்படம்",
    "watching": "பார்க்கிறது",
    "channel": "சேனல்",
    "station": "நிலையம்",
    "podcast": "பாட்காஸ்ட்",
    "watchlist": "கண்காணிப்பு பட்டியல்",
    "downloads": "பதிவிறக்கங்கள்"
  },
  "downloads": {
    "storage": "சேமிப்பு",
    "paused": "இடைநிறுத்தப்பட்டது"
  },
  "podcast": {
    "selectLanguage": "மொழியைத் தேர்ந்தெடு",
    "switchToLanguage": "{{language}} க்கு மாறு",
    "premiumRequiredForTranslation": "பாட்காஸ்ட் மொழிபெயர்ப்புக்கு பிரீமியம் சந்தா தேவை",
    "player": {
      "switchingLanguage": "மாறுகிறது..."
    },
    "languages": {
      "he": {
        "short": "HE",
        "full": "எபிரேயம்"
      },
      "en": {
        "short": "EN",
        "full": "ஆங்கிலம்"
      },
      "es": {
        "short": "ES",
        "full": "ஸ்பானிஷ்"
      }
    }
  },
  "watchlist": {
    "filters": {
      "continue": "தொடர்ந்து பார்",
      "judaism": "யூதமதம்",
      "podcasts": "பாட்காஸ்ட்கள்",
      "radio": "வானொலி"
    },
    "watched": "பார்த்தது",
    "emptyHint": "பார்க்கத் தொடங்குங்கள், உருப்படிகள் இங்கே தோன்றும்"
  },
  "widgets": {
    "emptyPersonal": "தனிப்பட்ட விட்ஜெட்கள் இல்லை",
    "emptyPersonalHint": "உங்கள் முதல் தனிப்பட்ட விட்ஜெட்டை உருவாக்கவும் அல்லது மேலே உள்ள அமைப்பு விட்ஜெட்களைச் சேர்க்கவும்",
    "itemsTotal": "மொத்த விட்ஜெட்கள்",
    "systemWidgets": "அமைப்பு விட்ஜெட்கள்",
    "systemWidgetsHint": "உங்கள் தொகுப்பில் சேர்க்க விட்ஜெட்களை உலாவவும்",
    "myWidgets": "என் தனிப்பட்ட விட்ஜெட்கள்",
    "myWidgetsHint": "நீங்கள் உருவாக்கிய விட்ஜெட்கள்",
    "personalWidgets": "என் விட்ஜெட்கள்",
    "noSystemWidgets": "அமைப்பு விட்ஜெட்கள் இல்லை",
    "added": "சேர்க்கப்பட்டது",
    "add": "சேர்",
    "remove": "நீக்கு",
    "show": "காட்டு",
    "hidden": "மறைக்கப்பட்டது",
    "addToCollection": "என் விட்ஜெட்களில் சேர்",
    "removeFromCollection": "என் விட்ஜெட்களில் இருந்து நீக்கு",
    "contentTypes": {
      "liveChannel": "நேரலை சேனல்",
      "iframe": "வலை உள்ளடக்கம்",
      "podcast": "பாட்காஸ்ட்",
      "radio": "வானொலி",
      "vod": "வீடியோ",
      "custom": "தனிப்பயன்",
      "widget": "விட்ஜெட்"
    },
    "form": {
      "title": "விட்ஜெட்டை உருவாக்கு",
      "basicInfo": "அடிப்படை தகவல்",
      "titlePlaceholder": "விட்ஜெட் தலைப்பு",
      "titleRequired": "விட்ஜெட் தலைப்பு தேவை",
      "descriptionPlaceholder": "விளக்கம் (விருப்பத்தேர்வு)",
      "iconPlaceholder": "ஐகான் எமோஜி (எ.கா., 📺)",
      "content": "உள்ளடக்கம்",
      "fromLibrary": "நூலகத்திலிருந்து",
      "iframe": "iFrame",
      "selectContent": "உள்ளடக்கத்தைத் தேர்ந்தெடு (சேனல்கள், பாட்காஸ்ட்கள், நிகழ்ச்சிகள், முதலியன)",
      "iframeUrl": "iFrame URL",
      "iframeUrlRequired": "iFrame URL தேவை",
      "iframeTitle": "iFrame தலைப்பு",
      "positionSize": "நிலை & அளவு",
      "behavior": "நடத்தை",
      "mutedByDefault": "இயல்பாக ஒலி நிறுத்தப்பட்டது",
      "closable": "மூடக்கூடியது",
      "draggable": "இழுக்கக்கூடியது",
      "widgetOrder": "விட்ஜெட் வரிசை",
      "orderPlaceholder": "வரிசை (0 = முதல்)",
      "saveWidget": "விட்ஜெட்டைச் சேமி",
      "saving": "சேமிக்கிறது...",
      "cancel": "ரத்து செய்",
      "change": "மாற்று"
    },
    "intro": {
      "title": "விட்ஜெட்களுக்கு வரவேற்கிறோம்",
      "description": "உங்கள் பார்வை அனுபவத்தைத் தனிப்பயனாக்க சக்திவாய்ந்த மிதக்கும் விட்ஜெட்களைக் கண்டறியுங்கள்",
      "watchVideo": "அறிமுகத்தைப் பாருங்கள்",
      "skip": "தவிர்",
      "dismiss": "மீண்டும் காட்டாதே",
      "videoUnavailable": "வீடியோ தற்காலிகமாக கிடைக்கவில்லை",
      "loadingMartyJr": "மார்ட்டி ஜூனியர் ஏற்றப்படுகிறது...",
      "loadingWidgets": "விட்ஜெட்கள் அறிமுகம் ஏற்றப்படுகிறது..."
    }
  },
  "trending": {
    "title": "இஸ்ரேலில் டிரெண்டிங்",
    "noTopics": "டிரெண்டிங் தலைப்புகள் இல்லை",
    "topStory": "முதன்மைக் கதை",
    "sources": "ஆதாரங்கள்",
    "categories": {
      "security": "பாதுகாப்பு",
      "politics": "அரசியல்",
      "tech": "தொழில்நுட்பம்",
      "culture": "கலாச்சாரம்",
      "sports": "விளையாட்டு",
      "economy": "பொருளாதாரம்",
      "entertainment": "பொழுதுபோக்கு",
      "weather": "வானிலை",
      "health": "ஆரோக்கியம்",
      "general": "பொது"
    }
  },
  "cultures": {
    "title": "உங்கள் கலாச்சாரத்தைத் தேர்ந்தெடுக்கவும்",
    "select": "கலாச்சாரத்தைத் தேர்ந்தெடு",
    "selectCulture": "உங்கள் கலாச்சாரத்தைத் தேர்ந்தெடுக்கவும்",
    "selectCultureDescription": "உங்கள் அனுபவத்தைத் தனிப்பயனாக்க உங்கள் கலாச்சார சமூகத்தைத் தேர்ந்தெடுக்கவும்",
    "changeCulture": "கலாச்சாரத்தை மாற்று",
    "israeli": {
      "name": "இஸ்ரேலி",
      "description": "இஸ்ரேலி புலம்பெயர்ந்தோர் சமூக உள்ளடக்கம்"
    },
    "chinese": {
      "name": "சீன",
      "description": "சீன சமூக உள்ளடக்கம்"
    },
    "japanese": {
      "name": "ஜப்பானிய",
      "description": "ஜப்பானிய சமூக உள்ளடக்கம்"
    },
    "korean": {
      "name": "கொரிய",
      "description": "கொரிய சமூக உள்ளடக்கம்"
    },
    "indian": {
      "name": "இந்திய",
      "description": "இந்திய சமூக உள்ளடக்கம்"
    }
  },
  "cultureTrending": {
    "whatsHotIn": "{{location}} இல் என்ன பிரபலம்",
    "noTopics": "டிரெண்டிங் தலைப்புகள் இல்லை",
    "sources": "ஆதாரங்கள்",
    "categories": {
      "security": "பாதுகாப்பு",
      "politics": "அரசியல்",
      "tech": "தொழில்நுட்பம்",
      "technology": "தொழில்நுட்பம்",
      "culture": "கலாச்சாரம்",
      "sports": "விளையாட்டு",
      "economy": "பொருளாதாரம்",
      "finance": "நிதி",
      "entertainment": "பொழுதுபோக்கு",
      "weather": "வானிலை",
      "health": "ஆரோக்கியம்",
      "food": "உணவு",
      "fashion": "பேஷன்",
      "travel": "பயணம்",
      "history": "வரலாறு",
      "expat": "புலம்பெயர்ந்தோர் வாழ்க்கை",
      "general": "பொது"
    }
  },
  "cultureCities": {
    "connectionTo": "{{city}} இணைப்பு",
    "explore": "{{city}} ஐ ஆராயுங்கள்",
    "noContent": "இந்த நகரத்திற்கு உள்ளடக்கம் இல்லை",
    "categories": {
      "all": "அனைத்தும்",
      "history": "வரலாறு",
      "culture": "கலாச்சாரம்",
      "finance": "நிதி",
      "tech": "தொழில்நுட்பம்",
      "food": "உணவு",
      "expat": "புலம்பெயர்ந்தோர் வாழ்க்கை",
      "news": "செய்திகள்",
      "entertainment": "பொழுதுபோக்கு"
    }
  },
  "clock": {
    "israel": "இஸ்ரேல்",
    "local": "உள்ளூர்",
    "shabbatShalom": "ஷப்பத் ஷாலோம்!",
    "erevShabbat": "ஏரெவ் ஷப்பத்",
    "candleLighting": "மெழுகுவர்த்தி ஏற்றுதல்",
    "parasha": "பராஷா"
  },
  "ritual": {
    "title": "காலை சடங்கு",
    "greeting": "காலை வணக்கம்!",
    "israelUpdate": "இஸ்ரேலில் மதியம், செய்திகள் நடப்பு முன்னேற்றங்களை அறிவிக்கின்றன",
    "recommendation": "காலை செய்திகளுடன் தொடங்கி பின்னர் வானொலிக்கு மாற பரிந்துரைக்கிறோம்",
    "preparingRitual": "உங்கள் காலை சடங்கை தயாரிக்கிறது...",
    "israelTime": "இஸ்ரேல் நேரம்",
    "day": "நாள்",
    "letsStart": "தொடங்குவோம்",
    "skipToday": "இன்று தவிர்",
    "finish": "முடி",
    "noContentNow": "இப்போது உள்ளடக்கம் இல்லை",
    "typeLive": "நேரலை",
    "typeRadio": "வானொலி",
    "typeVideo": "வீடியோ"
  },
  "watchParty": {
    "title": "வாட்ச் பார்ட்டி",
    "create": "பார்ட்டியை உருவாக்கு",
    "join": "பார்ட்டியில் சேர்",
    "active": "பார்ட்டி செயலில்",
    "createTitle": "வாட்ச் பார்ட்டியை உருவாக்கு",
    "joinTitle": "பார்ட்டியில் சேர்",
    "enterCode": "அறை குறியீட்டை உள்ளிடவும்",
    "roomCode": "அறை குறியீடு",
    "roomCodeHint": "பார்ட்டியில் சேர 8-எழுத்து அறை குறியீட்டை உள்ளிடவும்",
    "copyCode": "குறியீட்டை நகலெடு",
    "codeCopied": "குறியீடு நகலெடுக்கப்பட்டது!",
    "participants": "பங்கேற்பாளர்கள்",
    "host": "தொகுப்பாளர்",
    "you": "நீங்கள்",
    "leave": "பார்ட்டியை விட்டு வெளியேறு",
    "end": "பார்ட்டியை முடி",
    "chat": "அரட்டை",
    "sendMessage": "செய்தி அனுப்பு",
    "typeMessage": "செய்தியைத் தட்டச்சு செய்யவும்...",
    "synced": "ஒத்திசைக்கப்பட்டது",
    "syncing": "ஒத்திசைக்கிறது...",
    "hostPaused": "தொகுப்பாளர் இடைநிறுத்தினார்",
    "userJoined": "{{name}} சேர்ந்தார்",
    "userLeft": "{{name}} வெளியேறினார்",
    "partyEnded": "பார்ட்டி முடிந்தது",
    "connecting": "இணைக்கிறது...",
    "options": {
      "chatEnabled": "அரட்டையை இயக்கு",
      "syncPlayback": "பின்னணியை ஒத்திசை"
    },
    "errors": {
      "invalidCode": "தவறான குறியீடு",
      "partyFull": "பார்ட்டி நிரம்பிவிட்டது",
      "partyEnded": "பார்ட்டி முடிந்துவிட்டது",
      "connectionError": "இணைப்பு பிழை",
      "createFailed": "பார்ட்டியை உருவாக்க முடியவில்லை",
      "joinFailed": "பார்ட்டியில் சேர முடியவில்லை"
    },
    "audio": {
      "mute": "ஒலி நிறுத்து",
      "unmute": "ஒலி இயக்கு",
      "speaking": "பேசுகிறது",
      "connecting": "ஆடியோவுடன் இணைக்கிறது...",
      "noAudio": "ஆடியோ கிடைக்கவில்லை",
      "muteHint": "உங்கள் மைக்ரோஃபோனை ஒலி நிறுத்துகிறது",
      "unmuteHint": "பேச உங்கள் மைக்ரோஃபோனை ஒலி இயக்குகிறது"
    },
    "textOnlyMode": "உரை அரட்டை மட்டும்",
    "endParty": "பார்ட்டியை முடி",
    "toggleEmoji": "எமோஜி பிக்கரை மாற்று",
    "toggleEmojiHint": "எதிர்வினைகளுக்கு எமோஜி விரைவு பிக்கரைத் திறக்கிறது",
    "sendEmoji": "{{emoji}} அனுப்பு",
    "sendEmojiHint": "அரட்டைக்கு எமோஜி எதிர்வினையை அனுப்புகிறது",
    "emojiPicker": "எமோஜி பிக்கர்",
    "chatInput": "அரட்டை செய்தி உள்ளீடு",
    "chatInputHint": "பார்ட்டி அரட்டைக்கு அனுப்ப செய்தியைத் தட்டச்சு செய்யவும்",
    "sendMessageHint": "உங்கள் செய்தியை பார்ட்டி அரட்டைக்கு அனுப்புகிறது",
    "copyCodeHint": "அறை குறியீட்டை கிளிப்போர்டுக்கு நகலெடுக்கிறது",
    "share": "பகிர்",
    "shareHint": "பார்ட்டி இணைப்பைப் பகிரவும் அல்லது குறியீட்டை நகலெடுக்கவும்",
    "copied": "நகலெடுக்கப்பட்டது!",
    "endPartyHint": "அனைத்து பங்கேற்பாளர்களுக்கும் பார்ட்டியை முடிக்கிறது",
    "leaveParty": "பார்ட்டியை விட்டு வெளியேறு",
    "leavePartyHint": "பார்ட்டியை முடிக்காமல் வெளியேறுகிறது",
    "buttonHint": "வாட்ச் பார்ட்டியை உருவாக்க அல்லது சேர மெனுவைத் திறக்கிறது",
    "createHint": "புதிய வாட்ச் பார்ட்டியை உருவாக்குகிறது",
    "joinHint": "குறியீட்டுடன் இருக்கும் வாட்ச் பார்ட்டியில் சேருகிறது",
    "emojiPickerHint": "விரைவு எமோஜி எதிர்வினைகளைக் காட்டுகிறது",
    "chatEnabledHint": "பங்கேற்பாளர்களுக்கு அரட்டையை இயக்குகிறது",
    "syncPlaybackHint": "தொகுப்பாளருடன் பின்னணியை ஒத்திசைக்கிறது",
    "createPartyHint": "தேர்ந்தெடுக்கப்பட்ட விருப்பங்களுடன் பார்ட்டியை உருவாக்குகிறது",
    "joinPartyHint": "உள்ளிட்ட குறியீட்டுடன் பார்ட்டியில் சேருகிறது",
    "closePanelHint": "வாட்ச் பார்ட்டி பேனலை மூடுகிறது",
    "cancelHint": "ரத்து செய்து உரையாடலை மூடுகிறது",
    "viewPartyHint": "வாட்ச் பார்ட்டி பேனலைத் திறக்கிறது",
    "panel": "வாட்ச் பார்ட்டி பேனல்"
  },
  "footer": {
    "location": "நியூயார்க், USA",
    "links": {
      "home": "முகப்பு",
      "liveTV": "நேரலை TV",
      "vod": "திரைப்படங்கள் & தொடர்கள்",
      "radio": "வானொலி",
      "podcasts": "பாட்காஸ்ட்கள்",
      "judaism": "யூதமதம்",
      "profile": "என் சுயவிவரம்",
      "favorites": "பிடித்தவை",
      "watchlist": "கண்காணிப்பு பட்டியல்",
      "subscribe": "சந்தா செலுத்து",
      "downloads": "பதிவிறக்கங்கள்",
      "help": "உதவி மையம்",
      "faq": "FAQ",
      "contact": "எங்களைத் தொடர்புகொள்ளுங்கள்",
      "feedback": "பின்னூட்டம்",
      "terms": "சேவை விதிமுறைகள்",
      "privacy": "தனியுரிமைக் கொள்கை",
      "cookies": "குக்கி கொள்கை",
      "licenses": "உரிமங்கள்"
    },
    "newsletter": {
      "title": "புதுப்பித்த நிலையில் இருங்கள்",
      "description": "சமீபத்திய புதுப்பிப்புகள் மற்றும் பிரத்யேக உள்ளடக்கத்திற்கு எங்கள் செய்திமடலுக்கு குழுசேரவும்.",
      "placeholder": "உங்கள் மின்னஞ்சலை உள்ளிடவும்",
      "success": "குழுசேர்ந்ததற்கு நன்றி!"
    },
    "apps": {
      "title": "ஆப்பைப் பெறுங்கள்",
      "downloadOn": "பதிவிறக்கவும்",
      "getItOn": "பெறுங்கள்",
      "appStore": "App Store",
      "googlePlay": "Google Play"
    },
    "social": {
      "facebook": "Facebook",
      "twitter": "Twitter",
      "instagram": "Instagram",
      "youtube": "YouTube"
    },
    "privacy": "தனியுரிமைக் கொள்கை",
    "sitemap": "தளவரைபடம்",
    "accessibility": "அணுகல்தன்மை",
    "navigation": "வழிசெலுத்தல்",
    "liveTV": "நேரலை TV",
    "moviesAndSeries": "திரைப்படங்கள் & தொடர்கள்",
    "radioStations": "வானொலி நிலையங்கள்",
    "myProfile": "என் சுயவிவரம்",
    "subscriptions": "சந்தாக்கள்",
    "helpAndSupport": "உதவி & ஆதரவு",
    "termsOfUse": "பயன்பாட்டு விதிமுறைகள்",
    "privacyPolicy": "தனியுரிமைக் கொள்கை",
    "contactUs": "எங்களைத் தொடர்புகொள்ளுங்கள்"
  },
  "chapters": {
    "title": "அத்தியாயங்கள்",
    "noChapters": "அத்தியாயங்கள் இல்லை",
    "generating": "அத்தியாயங்கள் உருவாக்கப்படுகின்றன...",
    "jumpTo": "தாவு",
    "current": "இப்போது",
    "categories": {
      "intro": "அறிமுகம்",
      "news": "செய்திகள்",
      "security": "பாதுகாப்பு",
      "politics": "அரசியல்",
      "economy": "பொருளாதாரம்",
      "sports": "விளையாட்டு",
      "weather": "வானிலை",
      "culture": "கலாச்சாரம்",
      "conclusion": "முடிவுரை"
    }
  },
  "podcasts": {
    "selectLanguage": "ஆடியோ மொழி",
    "switchToLanguage": "{{language}} க்கு மாறு",
    "languageSwitched": "இப்போது {{language}} இல் இயங்குகிறது",
    "availableInLanguage": "{{language}} இல் கிடைக்கிறது",
    "availableLanguages": "பல மொழிகளில் கிடைக்கிறது",
    "downloadForOffline": "ஆஃப்லைன் கேட்பதற்கு பதிவிறக்கு",
    "downloadProgress": "பதிவிறக்குகிறது {{progress}}%",
    "downloaded": "பதிவிறக்கப்பட்டது",
    "downloadFailed": "பதிவிறக்கம் தோல்வி",
    "retryDownload": "பதிவிறக்கத்தை மீண்டும் முயற்சிக்கவும்",
    "deleteDownload": "பதிவிறக்கத்தை நீக்கு",
    "confirmDelete": "பதிவிறக்கிய ஆடியோவை நீக்கவா?",
    "quality": {
      "label": "ஆடியோ தரம்",
      "low": "குறைந்த (64 kbps) - தரவைச் சேமி",
      "medium": "நடுத்தர (96 kbps) - சமநிலையான",
      "high": "அதிக (128 kbps) - சிறந்த தரம்"
    },
    "languages": {
      "he": {
        "short": "எபிரேயம்",
        "full": "எபிரேயம்"
      },
      "en": {
        "short": "ஆங்கிலம்",
        "full": "ஆங்கிலம்"
      }
    },
    "player": {
      "switchingLanguage": "ஆடியோ மொழியை மாற்றுகிறது...",
      "languageSwitchError": "மொழியை மாற்ற முடியவில்லை",
      "loadingTranslation": "மொழிபெயர்க்கப்பட்ட ஆடியோ ஏற்றப்படுகிறது...",
      "translationUnavailable": "மொழிபெயர்ப்பு இன்னும் கிடைக்கவில்லை"
    },
    "onboarding": {
      "multiLanguageTitle": "பல மொழி ஆடியோ",
      "multiLanguageDescription": "இந்த பாட்காஸ்ட் எபிரேயம் மற்றும் ஆங்கிலத்தில் கிடைக்கிறது. மாற மொழி தேர்வியைத் தட்டவும்.",
      "downloadTitle": "ஆஃப்லைனில் கேளுங்கள்",
      "downloadDescription": "இணைய இணைப்பு இல்லாமல் கேட்க எபிசோட்களைப் பதிவிறக்குங்கள்.",
      "gotIt": "புரிந்தது"
    }
  },
  "vod": {
    "showOnlyWithSubtitles": "வசன வரிகள் உள்ளவற்றை மட்டும் காட்டு",
    "allCategories": "அனைத்தும்",
    "emptyTitle": "உள்ளடக்கம் இல்லை",
    "emptyDescription": "வேறு வகையைத் தேர்ந்தெடுக்கவும்",
    "allContent": "அனைத்து உள்ளடக்கம்",
    "noContent": "உள்ளடக்கம் இல்லை",
    "noContentInCategory": "இந்த வகையில் உள்ளடக்கம் இல்லை"
  },
  "account": {
    "manageSubscription": "சந்தாவை நிர்வகி",
    "personalDetails": "தனிப்பட்ட விவரங்கள்",
    "billing": "பில்லிங் & கட்டணம்",
    "register": "பதிவு செய்",
    "email": "மின்னஞ்சல்",
    "password": "கடவுச்சொல்",
    "name": "பெயர்"
  }
};

deepMerge(ta, translations);
fs.writeFileSync('ta.json', JSON.stringify(ta, null, 2) + '\n');
console.log('Part 3 complete');
