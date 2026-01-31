import fs from 'fs';
const hi = JSON.parse(fs.readFileSync('hi.json', 'utf8'));

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
  "watchParty": {
    "title": "वॉच पार्टी",
    "create": "पार्टी बनाएं",
    "join": "पार्टी में शामिल हों",
    "active": "पार्टी सक्रिय",
    "createTitle": "वॉच पार्टी बनाएं",
    "joinTitle": "पार्टी में शामिल हों",
    "enterCode": "रूम कोड दर्ज करें",
    "roomCode": "रूम कोड",
    "roomCodeHint": "पार्टी में शामिल होने के लिए 8-अक्षर का रूम कोड दर्ज करें",
    "copyCode": "कोड कॉपी करें",
    "codeCopied": "कोड कॉपी हो गया!",
    "participants": "प्रतिभागी",
    "host": "होस्ट",
    "you": "आप",
    "leave": "पार्टी छोड़ें",
    "end": "पार्टी समाप्त करें",
    "chat": "चैट",
    "sendMessage": "संदेश भेजें",
    "typeMessage": "संदेश टाइप करें...",
    "synced": "सिंक्ड",
    "syncing": "सिंक हो रहा है...",
    "hostPaused": "होस्ट ने रोका",
    "userJoined": "{{name}} शामिल हुए",
    "userLeft": "{{name}} चले गए",
    "partyEnded": "पार्टी समाप्त हो गई",
    "connecting": "कनेक्ट हो रहा है...",
    "options": {
      "chatEnabled": "चैट सक्षम करें",
      "syncPlayback": "प्लेबैक सिंक करें"
    },
    "errors": {
      "invalidCode": "अमान्य कोड",
      "partyFull": "पार्टी भरी हुई है",
      "partyEnded": "पार्टी समाप्त हो गई है",
      "connectionError": "कनेक्शन त्रुटि",
      "createFailed": "पार्टी बनाने में विफल",
      "joinFailed": "पार्टी में शामिल होने में विफल"
    },
    "audio": {
      "mute": "म्यूट",
      "unmute": "अनम्यूट",
      "speaking": "बोल रहे हैं",
      "connecting": "ऑडियो से कनेक्ट हो रहा है...",
      "noAudio": "ऑडियो उपलब्ध नहीं",
      "muteHint": "आपके माइक्रोफोन को म्यूट करता है",
      "unmuteHint": "बोलने के लिए आपके माइक्रोफोन को अनम्यूट करता है"
    },
    "textOnlyMode": "केवल टेक्स्ट चैट",
    "endParty": "पार्टी समाप्त करें",
    "toggleEmoji": "इमोजी पिकर टॉगल करें",
    "toggleEmojiHint": "प्रतिक्रियाओं के लिए इमोजी क्विक पिकर खोलता है",
    "sendEmoji": "{{emoji}} भेजें",
    "sendEmojiHint": "चैट में इमोजी प्रतिक्रिया भेजता है",
    "emojiPicker": "इमोजी पिकर",
    "chatInput": "चैट संदेश इनपुट",
    "chatInputHint": "पार्टी चैट में भेजने के लिए संदेश टाइप करें",
    "sendMessageHint": "आपके संदेश को पार्टी चैट में भेजता है",
    "copyCodeHint": "रूम कोड क्लिपबोर्ड पर कॉपी करता है",
    "share": "साझा करें",
    "shareHint": "पार्टी लिंक साझा करें या कोड कॉपी करें",
    "copied": "कॉपी हो गया!",
    "endPartyHint": "सभी प्रतिभागियों के लिए पार्टी समाप्त करता है",
    "leaveParty": "पार्टी छोड़ें",
    "leavePartyHint": "पार्टी समाप्त किए बिना छोड़ता है",
    "buttonHint": "वॉच पार्टी बनाने या शामिल होने के लिए मेनू खोलता है",
    "createHint": "नई वॉच पार्टी बनाता है",
    "joinHint": "कोड के साथ मौजूदा वॉच पार्टी में शामिल होता है",
    "emojiPickerHint": "क्विक इमोजी प्रतिक्रियाएं दिखाता है",
    "chatEnabledHint": "प्रतिभागियों के लिए चैट सक्षम करता है",
    "syncPlaybackHint": "होस्ट के साथ प्लेबैक सिंक्रनाइज़ रखता है",
    "createPartyHint": "चयनित विकल्पों के साथ पार्टी बनाता है",
    "joinPartyHint": "दर्ज किए गए कोड के साथ पार्टी में शामिल होता है",
    "closePanelHint": "वॉच पार्टी पैनल बंद करता है",
    "cancelHint": "रद्द करता है और डायलॉग बंद करता है",
    "viewPartyHint": "वॉच पार्टी पैनल खोलता है",
    "panel": "वॉच पार्टी पैनल"
  },
  "footer": {
    "location": "न्यूयॉर्क, USA",
    "links": {
      "home": "होम",
      "liveTV": "लाइव TV",
      "vod": "फ़िल्में और सीरीज़",
      "radio": "रेडियो",
      "podcasts": "पॉडकास्ट",
      "judaism": "यहूदी धर्म",
      "profile": "मेरी प्रोफ़ाइल",
      "favorites": "पसंदीदा",
      "watchlist": "वॉचलिस्ट",
      "subscribe": "सब्सक्राइब करें",
      "downloads": "डाउनलोड",
      "help": "सहायता केंद्र",
      "faq": "FAQ",
      "contact": "हमसे संपर्क करें",
      "feedback": "प्रतिक्रिया",
      "terms": "सेवा की शर्तें",
      "privacy": "गोपनीयता नीति",
      "cookies": "कुकी नीति",
      "licenses": "लाइसेंस"
    },
    "newsletter": {
      "title": "अपडेट रहें",
      "description": "नवीनतम अपडेट और विशेष सामग्री के लिए हमारे न्यूज़लेटर की सदस्यता लें।",
      "placeholder": "अपना ईमेल दर्ज करें",
      "success": "सदस्यता के लिए धन्यवाद!"
    },
    "apps": {
      "title": "ऐप प्राप्त करें",
      "downloadOn": "पर डाउनलोड करें",
      "getItOn": "पर प्राप्त करें",
      "appStore": "App Store",
      "googlePlay": "Google Play"
    },
    "social": {
      "facebook": "Facebook",
      "twitter": "Twitter",
      "instagram": "Instagram",
      "youtube": "YouTube"
    },
    "privacy": "गोपनीयता नीति",
    "sitemap": "साइटमैप",
    "accessibility": "एक्सेसिबिलिटी",
    "navigation": "नेविगेशन",
    "liveTV": "लाइव TV",
    "moviesAndSeries": "फ़िल्में और सीरीज़",
    "radioStations": "रेडियो स्टेशन",
    "myProfile": "मेरी प्रोफ़ाइल",
    "subscriptions": "सब्सक्रिप्शन",
    "helpAndSupport": "सहायता और समर्थन",
    "termsOfUse": "उपयोग की शर्तें",
    "privacyPolicy": "गोपनीयता नीति",
    "contactUs": "हमसे संपर्क करें"
  },
  "chapters": {
    "title": "अध्याय",
    "noChapters": "कोई अध्याय उपलब्ध नहीं",
    "generating": "अध्याय जनरेट हो रहे हैं...",
    "jumpTo": "पर जाएं",
    "current": "अभी",
    "categories": {
      "intro": "परिचय",
      "news": "समाचार",
      "security": "सुरक्षा",
      "politics": "राजनीति",
      "economy": "अर्थव्यवस्था",
      "sports": "खेल",
      "weather": "मौसम",
      "culture": "संस्कृति",
      "conclusion": "निष्कर्ष"
    }
  },
  "placeholder": {
    "email": "your@email.com",
    "password": "••••••••",
    "pin": "••••",
    "dateRange": {
      "from": "से (YYYY-MM-DD)",
      "to": "तक (YYYY-MM-DD)"
    },
    "amount": {
      "min": "न्यूनतम",
      "max": "अधिकतम",
      "price": "0.00"
    },
    "chatMessage": "यहां टाइप करें...",
    "deepLink": "bayitplus://content/123",
    "scheduleDateTime": "YYYY-MM-DDTHH:mm",
    "roomCode": "ABCD1234",
    "time": {
      "start": "08:00",
      "end": "10:00"
    },
    "filter": {
      "userId": "उपयोगकर्ता ID दर्ज करें"
    },
    "datetime": "YYYY-MM-DDTHH:mm",
    "number": "0",
    "chat": "अपना संदेश टाइप करें..."
  },
  "components": {
    "select": {
      "default": "चुनें..."
    }
  },
  "plans": {
    "notIncluded": [],
    "basic": {
      "notIncluded": [
        "लाइव चैनल",
        "AI सहायक",
        "ऑफ़लाइन देखना"
      ]
    },
    "premium": {
      "notIncluded": [
        "ऑफ़लाइन देखना",
        "फैमिली प्रोफाइल"
      ]
    },
    "family": {
      "notIncluded": []
    }
  },
  "subscribe": {
    "noCharge": "ट्रायल अवधि के दौरान आपके क्रेडिट कार्ड से शुल्क नहीं लिया जाएगा"
  },
  "notFound": {
    "orTry": "या प्रयास करें:",
    "liveChannel": "लाइव",
    "vodLabel": "फ़िल्में",
    "podcastsLabel": "पॉडकास्ट"
  },
  "profiles": {
    "addProfile": "प्रोफ़ाइल जोड़ें",
    "enterPin": "PIN दर्ज करें",
    "selectError": "प्रोफ़ाइल चुनने में त्रुटि",
    "wrongPin": "गलत PIN",
    "loading": "प्रोफ़ाइल लोड हो रहे हैं...",
    "manage": "प्रोफ़ाइल प्रबंधित करें",
    "whoIsWatching": "कौन देख रहा है?",
    "manageProfiles": "प्रोफ़ाइल प्रबंधित करें"
  },
  "watch": {
    "notFound": "सामग्री नहीं मिली",
    "backToHome": "होम पर वापस जाएं",
    "episodes": "एपिसोड",
    "addToList": "सूची में जोड़ें",
    "like": "पसंद करें",
    "share": "साझा करें",
    "cast": "कास्ट",
    "episodesList": "एपिसोड",
    "schedule": "शेड्यूल",
    "now": "अभी",
    "related": "संबंधित सामग्री",
    "deleteEpisode": "एपिसोड हटाएं",
    "confirmDeleteEpisode": "इस एपिसोड को हटाएं?"
  },
  "live": {
    "title": "लाइव TV",
    "next": "अगला:",
    "noChannels": "कोई चैनल उपलब्ध नहीं",
    "tryLater": "बाद में पुनः प्रयास करें",
    "categories": {
      "all": "सभी",
      "news": "समाचार",
      "entertainment": "मनोरंजन",
      "sports": "खेल",
      "kids": "बच्चे",
      "music": "संगीत"
    }
  },
  "judaism": {
    "dashboard": "आपका यहूदी डैशबोर्ड",
    "categories": {
      "news": "यहूदी समाचार",
      "community": "समुदाय"
    },
    "shabbat": {
      "shabbatMode": "शब्बत मोड",
      "endsIn": "शब्बत समाप्त होने में",
      "friday": "शुक्रवार",
      "saturday": "शनिवार",
      "noData": "शब्बत समय लोड करने में असमर्थ"
    },
    "erevShabbat": {
      "title": "एरेव शब्बत",
      "prepareFor": "शब्बत के लिए तैयारी करें",
      "inTime": "{{time}} में",
      "featuredContent": "शब्बत सामग्री",
      "noContent": "शब्बत सामग्री जल्द आ रही है!",
      "shabbatShalom": "शब्बत शालोम!",
      "timeUntil": "शब्बत तक समय",
      "shabbatSongs": "शब्बत गाने",
      "parashaStudy": "पराशा",
      "shabbatRecipes": "व्यंजन विधि",
      "prayers": "प्रार्थनाएं"
    }
  },
  "children": {
    "exitDescription": "बाहर निकलने के लिए पैरेंट कोड दर्ज करें",
    "parentCode": "पैरेंट कोड",
    "confirm": "पुष्टि करें",
    "wrongCode": "गलत कोड",
    "noContent": "कोई सामग्री उपलब्ध नहीं",
    "tryAnotherCategory": "कोई अन्य श्रेणी चुनने का प्रयास करें",
    "ageRatings": {
      "3": "आयु 3+",
      "5": "आयु 5+",
      "7": "आयु 7+",
      "10": "आयु 10+",
      "12": "आयु 12+"
    },
    "moderation": {
      "pending": "समीक्षा प्रतीक्षित",
      "approved": "स्वीकृत",
      "rejected": "अस्वीकृत"
    },
    "admin": {
      "stats": "बच्चों की सामग्री प्रबंधक",
      "seedContent": "सीड सामग्री",
      "importArchive": "Archive.org आयात करें",
      "syncPodcasts": "पॉडकास्ट सिंक करें",
      "syncYouTube": "YouTube सिंक करें",
      "tagVod": "VOD टैग करें",
      "pendingModeration": "मॉडरेशन प्रतीक्षित"
    }
  },
  "youngsters": {
    "title": "किशोर",
    "items": "आइटम",
    "empty": "कोई सामग्री उपलब्ध नहीं",
    "emptyHint": "कोई अन्य श्रेणी आज़माएं",
    "exitYoungstersMode": "किशोर मोड से बाहर निकलें",
    "exitDescription": "बाहर निकलने के लिए पैरेंट कोड दर्ज करें",
    "parentCode": "पैरेंट कोड",
    "confirm": "पुष्टि करें",
    "wrongCode": "गलत कोड",
    "noContent": "कोई सामग्री उपलब्ध नहीं",
    "tryAnotherCategory": "कोई अन्य श्रेणी चुनने का प्रयास करें",
    "categories": {
      "all": "सभी",
      "trending": "ट्रेंडिंग",
      "news": "समाचार",
      "culture": "संस्कृति",
      "educational": "शैक्षिक",
      "music": "संगीत",
      "entertainment": "मनोरंजन",
      "sports": "खेल",
      "tech": "तकनीक",
      "judaism": "यहूदी धर्म"
    },
    "ageGroups": {
      "middle-school": "मिडिल स्कूल (12-14)",
      "high-school": "हाई स्कूल (15-17)"
    },
    "moderation": {
      "pending": "समीक्षा प्रतीक्षित",
      "approved": "स्वीकृत",
      "rejected": "अस्वीकृत"
    },
    "admin": {
      "stats": "किशोर सामग्री प्रबंधक",
      "seedContent": "सीड सामग्री",
      "importArchive": "Archive.org आयात करें",
      "syncPodcasts": "पॉडकास्ट सिंक करें",
      "syncYouTube": "YouTube सिंक करें",
      "tagVod": "VOD टैग करें",
      "pendingModeration": "मॉडरेशन प्रतीक्षित"
    }
  },
  "chatbot": {
    "openChat": "चैट खोलें",
    "welcome": "नमस्ते! मैं Bayit+ स्मार्ट सहायक हूं। आज मैं आपकी कैसे मदद कर सकता हूं? माइक्रोफोन पर क्लिक करें और बोलें, या संदेश टाइप करें।",
    "stopRecording": "रिकॉर्डिंग बंद करें",
    "startRecording": "वॉइस रिकॉर्डिंग शुरू करें",
    "recommendations": "यहां कुछ सिफारिशें हैं:",
    "showMultipleSuccess": "विजेट में {{count}} सामग्री आइटम दिखा रहा है",
    "showMultipleNotFound": "अनुरोधित सामग्री नहीं मिल सकी। कृपया अलग नाम आज़माएं।",
    "resolvingContent": "आपकी सामग्री खोज रहा है...",
    "errors": {
      "micPermission": "माइक्रोफोन तक पहुंच नहीं मिल सकी। कृपया अपने ब्राउज़र में माइक्रोफोन अनुमतियां जांचें।",
      "transcribeFailed": "रिकॉर्डिंग ट्रांसक्राइब नहीं हो सकी। कृपया पुनः प्रयास करें।",
      "general": "क्षमा करें, कुछ गलत हो गया। कृपया पुनः प्रयास करें।"
    },
    "suggestions": {
      "whatToWatch": "आज क्या देखें?",
      "israeliMovies": "सुझाई गई इज़राइली फ़िल्में",
      "whatsOnNow": "अभी क्या चल रहा है?",
      "popularPodcasts": "लोकप्रिय पॉडकास्ट"
    },
    "voiceCommands": {
      "showChannels": "मुझे चैनल दिखाओ...",
      "playChess": "शतरंज का खेल शुरू करो...",
      "multiContent": "साथ-साथ दिखाओ..."
    }
  },
  "chat": {
    "title": "Bayit+ सहायक",
    "greeting": "नमस्ते! मैं Bayit+ स्मार्ट सहायक हूं। आज मैं आपकी कैसे मदद कर सकता हूं? माइक्रोफोन पर क्लिक करें और बोलें, या संदेश टाइप करें।"
  },
  "subtitles": {
    "nikud": "निकुद",
    "selection": "चयन",
    "translation": "अनुवाद",
    "translating": "अनुवाद हो रहा है...",
    "close": "बंद करें",
    "unavailable": "अनुवाद उपलब्ध नहीं",
    "autoGenerated": "स्वचालित-जनित",
    "downloadMore": "और सबटाइटल डाउनलोड करें...",
    "downloading": "OpenSubtitles खोज रहा है...",
    "opensubtitlesSource": "OpenSubtitles.com से",
    "downloadSuccess": "{{count}} सबटाइटल डाउनलोड किए गए",
    "noSubtitlesFound": "इस सामग्री के लिए कोई सबटाइटल नहीं मिला"
  },
  "dubbing": {
    "title": "लाइव डबिंग",
    "enabled": "लाइव डबिंग सक्षम",
    "selectLanguage": "भाषा चुनें",
    "originalAudio": "मूल ऑडियो",
    "dubbedAudio": "डब किया गया ऑडियो",
    "selectVoice": "आवाज़ चुनें",
    "adjustVolume": "वॉल्यूम समायोजित करें",
    "tapToSelect": "इस भाषा को चुनने के लिए टैप करें",
    "languages": {
      "en": "अंग्रेज़ी",
      "es": "स्पेनिश",
      "he": "हिब्रू",
      "ar": "अरबी",
      "ru": "रूसी",
      "fr": "फ्रेंच",
      "de": "जर्मन"
    },
    "onboarding": {
      "title": "लाइव डबिंग का परिचय",
      "description": "लाइव सामग्री को अपनी भाषा में अनुभव करें। हमारा AI देखते समय रीयल-टाइम में ऑडियो का अनुवाद और रीप्ले करता है।",
      "feature1": "7 भाषाएं समर्थित",
      "feature2": "रीयल-टाइम प्रोसेसिंग",
      "feature3": "ऑडियो बैलेंस समायोजित करें",
      "tryNow": "अभी आज़माएं",
      "later": "बाद में"
    },
    "consent": {
      "title": "ऑडियो प्रोसेसिंग सहमति",
      "message": "लाइव डबिंग AI सेवाओं का उपयोग करके रीयल-टाइम में आपके ऑडियो को प्रोसेस करती है। ऑडियो केवल अनुवाद के लिए प्रोसेस किया जाता है और स्थायी रूप से संग्रहीत नहीं किया जाता।",
      "accept": "मैं सहमत हूं",
      "decline": "नहीं धन्यवाद"
    },
    "errors": {
      "connectionFailed": "कनेक्शन विफल",
      "connectionFailedMessage": "डबिंग सेवा से कनेक्ट करने में असमर्थ",
      "connectionFailedAction": "अपना इंटरनेट कनेक्शन जांचें और पुनः प्रयास करें",
      "notAuthenticated": "प्रमाणित नहीं",
      "notAuthenticatedMessage": "कृपया फिर से साइन इन करें",
      "notAuthenticatedAction": "लाइव डबिंग उपयोग करने के लिए साइन इन करें",
      "premiumRequired": "प्रीमियम सुविधा",
      "premiumRequiredMessage": "लाइव डबिंग के लिए प्रीमियम सब्सक्रिप्शन आवश्यक है",
      "premiumRequiredAction": "इस सुविधा का उपयोग करने के लिए प्रीमियम में अपग्रेड करें",
      "channelUnavailable": "उपलब्ध नहीं",
      "channelUnavailableMessage": "इस चैनल के लिए डबिंग उपलब्ध नहीं है",
      "audioCaptureError": "माइक्रोफोन त्रुटि",
      "audioCaptureErrorMessage": "आपके माइक्रोफोन तक पहुंचने में असमर्थ",
      "sttServiceError": "स्पीच रिकग्निशन त्रुटि",
      "sttServiceErrorMessage": "भाषण पहचानने में विफल",
      "ttsServiceError": "डबिंग त्रुटि",
      "ttsServiceErrorMessage": "डब किया गया ऑडियो जनरेट करने में विफल",
      "translationTimeout": "अनुवाद टाइमआउट",
      "translationTimeoutMessage": "अनुवाद में बहुत समय लगा, पुनः प्रयास कर रहा है",
      "websocketClosed": "कनेक्शन खो गया",
      "websocketClosedMessage": "डबिंग कनेक्शन बंद हो गया",
      "rateLimitExceeded": "बहुत अधिक प्रयास",
      "rateLimitExceededMessage": "कृपया फिर से प्रयास करने से पहले प्रतीक्षा करें",
      "sessionTimeout": "सत्र समाप्त",
      "sessionTimeoutMessage": "आपका डबिंग सत्र समाप्त हो गया है"
    }
  },
  "video": {
    "watchTrailer": "ट्रेलर देखें",
    "closeTrailer": "ट्रेलर बंद करें",
    "deleteConfirm": "इस एपिसोड को हटाएं?"
  }
};

deepMerge(hi, translations);
fs.writeFileSync('hi.json', JSON.stringify(hi, null, 2) + '\n');
console.log('Part 3 complete - More sections added');
