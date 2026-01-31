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
  "voiceMode": {
    "voiceOnly": "केवल वॉइस",
    "voiceOnlyDesc": "कोई रिमोट कंट्रोल नहीं - पूर्ण वॉइस नेविगेशन",
    "hybrid": "हाइब्रिड",
    "hybridDesc": "वॉइस + रिमोट - कार्यों पर वॉइस फीडबैक",
    "classic": "क्लासिक",
    "classicDesc": "कोई वॉइस नहीं - केवल रिमोट कंट्रोल"
  },
  "settings": {
    "chatTranslation": "चैट अनुवाद",
    "autoTranslate": "संदेशों का स्वतः अनुवाद करें",
    "autoTranslateDescription": "चैट संदेशों को स्वचालित रूप से आपकी पसंदीदा भाषा में अनुवाद करें",
    "display": "प्रदर्शन",
    "homePageSections": "होम पेज अनुभाग",
    "configureSections": "कॉन्फ़िगर करें कि आपके होम पेज पर कौन से अनुभाग दिखाई दें",
    "visibleSections": "दृश्यमान अनुभाग",
    "hiddenSections": "छिपे हुए अनुभाग",
    "dragToReorder": "पुनर्क्रम के लिए खींचें",
    "tapToHide": "छिपाने के लिए टैप करें",
    "tapToShow": "दिखाने के लिए टैप करें",
    "resetToDefault": "डिफ़ॉल्ट पर रीसेट करें",
    "resetConfirmMessage": "क्या आप वाकई होम पेज अनुभागों को उनके डिफ़ॉल्ट कॉन्फ़िगरेशन पर रीसेट करना चाहते हैं?",
    "sectionHidden": "अनुभाग छिपा",
    "sectionShown": "अनुभाग दिखाया"
  },
  "help": {
    "subtitle": "हम आज आपकी कैसे मदद कर सकते हैं?",
    "email": "ईमेल सहायता",
    "phone": "फोन सहायता",
    "chat": "लाइव चैट",
    "chatAvailable": "24/7 उपलब्ध",
    "openTooltip": "सहायता टूलटिप खोलें",
    "openHelp": "सहायता मेनू खोलें",
    "howTo": "कैसे उपयोग करें",
    "relatedArticles": "संबंधित लेख",
    "stillNeedHelp": "अभी भी सहायता चाहिए?",
    "contactSupport": "सहायता से संपर्क करें",
    "previous": "पिछला",
    "next": "अगला",
    "getStarted": "शुरू करें",
    "skipTutorial": "ट्यूटोरियल छोड़ें",
    "actions": {
      "search": "सहायता खोजें",
      "docs": "दस्तावेज़ीकरण",
      "faq": "FAQ",
      "support": "सहायता से संपर्क करें",
      "tutorial": "ट्यूटोरियल देखें"
    },
    "search": {
      "placeholder": "सहायता खोजें...",
      "noResults": "\"{{query}}\" के लिए कोई परिणाम नहीं मिला",
      "noResultsHint": "अलग कीवर्ड आज़माएं या श्रेणियां ब्राउज़ करें",
      "recent": "हाल का",
      "popular": "लोकप्रिय"
    },
    "categories": {
      "getting-started": "शुरू करें",
      "features": "सुविधाएं",
      "judaism": "यहूदी धर्म",
      "platform-guides": "प्लेटफ़ॉर्म गाइड",
      "account": "खाता",
      "troubleshooting": "समस्या निवारण",
      "parents": "माता-पिता के लिए",
      "admin": "एडमिन गाइड",
      "developer": "डेवलपर API"
    },
    "faq": {
      "title": "अक्सर पूछे जाने वाले प्रश्न",
      "q1": "मैं अपनी सब्सक्रिप्शन योजना कैसे बदलूं?",
      "a1": "सेटिंग्स > सब्सक्रिप्शन पर जाएं और अपनी वर्तमान योजना देखें और बदलें। आप कभी भी अपग्रेड या डाउनग्रेड कर सकते हैं।",
      "q2": "ऑफ़लाइन देखने के लिए सामग्री कैसे डाउनलोड करूं?",
      "a2": "किसी भी सामग्री पर डाउनलोड आइकन टैप करें। डाउनलोड केवल मोबाइल डिवाइस पर उपलब्ध हैं।",
      "q3": "मेरा वीडियो क्यों नहीं चल रहा है?",
      "a3": "अपना इंटरनेट कनेक्शन जांचें। यदि समस्या बनी रहे, तो ऐप कैश साफ़ करें या ऐप पुनः आरंभ करें।",
      "q4": "मैं अपनी सब्सक्रिप्शन कैसे रद्द करूं?",
      "a4": "आप सेटिंग्स > सब्सक्रिप्शन > योजना रद्द करें से कभी भी अपनी सब्सक्रिप्शन रद्द कर सकते हैं। आपकी बिलिंग अवधि समाप्त होने तक आपके पास एक्सेस रहेगा।"
    },
    "onboarding": {
      "welcome": {
        "title": "Bayit+ में आपका स्वागत है",
        "description": "दुनिया में कहीं भी इज़राइली मनोरंजन के लिए आपका घर"
      },
      "liveTv": {
        "title": "लाइव TV",
        "description": "समाचार, खेल और मनोरंजन सहित इज़राइली चैनल लाइव देखें"
      },
      "vod": {
        "title": "ऑन-डिमांड सामग्री",
        "description": "कभी भी फ़िल्में, सीरीज़ और डॉक्यूमेंट्री ब्राउज़ करें"
      },
      "voice": {
        "title": "वॉइस कंट्रोल",
        "description": "अपनी आवाज से ऐप नियंत्रित करने के लिए 'Bayit' बोलें"
      },
      "profiles": {
        "title": "फैमिली प्रोफाइल",
        "description": "व्यक्तिगत सिफारिशों के साथ प्रत्येक परिवार के सदस्य के लिए प्रोफाइल बनाएं"
      }
    }
  },
  "voice": {
    "transcribing": "ट्रांसक्राइब हो रहा है...",
    "tapToStop": "रिकॉर्डिंग रोकने के लिए टैप करें",
    "pleaseWait": "कृपया प्रतीक्षा करें...",
    "transcriptionNotAvailable": "ट्रांसक्रिप्शन उपलब्ध नहीं",
    "transcriptionFailed": "ट्रांसक्रिप्शन विफल",
    "micPermissionDenied": "माइक्रोफोन अनुमति अस्वीकृत",
    "error": "सुन नहीं पाया, कृपया पुनः प्रयास करें"
  },
  "errors": {
    "offline": {
      "ttsMessage": "कोई इंटरनेट कनेक्शन नहीं। आप अब ऑफ़लाइन मोड में हैं।"
    },
    "online": {
      "ttsMessage": "इंटरनेट कनेक्शन बहाल।"
    },
    "api": {
      "badRequest": "कुछ गलत हो गया। कृपया पुनः प्रयास करें।",
      "unauthorized": "जारी रखने के लिए कृपया लॉग इन करें।",
      "forbidden": "आपके पास इस सामग्री तक पहुंचने की अनुमति नहीं है।",
      "notFound": "आप जो सामग्री खोज रहे हैं वह उपलब्ध नहीं है।",
      "rateLimit": "आप बहुत अधिक अनुरोध कर रहे हैं। कृपया कुछ देर प्रतीक्षा करें।",
      "serverError": "हमारे सर्वर में समस्या आ रही है। कृपया बाद में पुनः प्रयास करें।",
      "unknown": "कुछ गलत हो गया। कृपया पुनः प्रयास करें।",
      "networkTimeout": "हमारे सर्वर से कनेक्ट करने में असमर्थ। कृपया अपना कनेक्शन जांचें।",
      "offlineMessage": "आप ऑफ़लाइन हैं। कृपया अपना इंटरनेट कनेक्शन जांचें।",
      "requestFailed": "कुछ गलत हो गया। कृपया पुनः प्रयास करें।"
    },
    "voice": {
      "permissionDenied": "वॉइस कमांड के लिए माइक्रोफोन एक्सेस आवश्यक है। कृपया सेटिंग्स में सक्षम करें।",
      "recognitionFailed": "समझ नहीं आया। कृपया पुनः प्रयास करें।",
      "commandFailed": "वॉइस कमांड विफल। कृपया पुनः प्रयास करें।"
    },
    "widget": {
      "loadFailed": "विजेट लोड करने में असमर्थ। कृपया पुनः प्रयास करें।"
    },
    "buttons": {
      "ok": "ठीक है",
      "retry": "पुनः प्रयास करें",
      "cancel": "रद्द करें"
    }
  },
  "player": {
    "live": "लाइव",
    "play": "चलाएं",
    "pause": "रोकें",
    "mute": "म्यूट",
    "unmute": "अनम्यूट",
    "volume": "वॉल्यूम",
    "albumArt": "{{title}} के लिए एल्बम आर्ट",
    "seekBar": "प्लेबैक प्रगति",
    "skipBack": "{{seconds}} सेकंड पीछे जाएं",
    "skipForward": "30 सेकंड आगे जाएं",
    "previousChapter": "पिछला अध्याय",
    "nextChapter": "अगला अध्याय",
    "skipBackward": "30 सेकंड पीछे जाएं",
    "subscription": {
      "requiredTitle": "सब्सक्रिप्शन आवश्यक",
      "requiredMessage": "के लिए पेड सब्सक्रिप्शन आवश्यक है",
      "upgradeInfo": "प्रीमियम सामग्री तक पहुंचने के लिए अपनी सब्सक्रिप्शन अपग्रेड करें",
      "upgrade": "अभी अपग्रेड करें"
    },
    "chapters": "अध्याय",
    "sceneSearch": {
      "title": "सीन खोजें",
      "placeholder": "सीन खोजें...",
      "inputLabel": "सीन सर्च इनपुट",
      "searching": "खोज रहे हैं...",
      "noResults": "कोई सीन नहीं मिला",
      "resultsFound": "{{count}} सीन मिले",
      "searchError": "खोज विफल। कृपया पुनः प्रयास करें।",
      "hint": "खोजने के लिए कम से कम 2 अक्षर टाइप करें",
      "voiceReceived": "खोज रहे हैं: {{query}}",
      "seekingTo": "{{time}} पर जा रहे हैं",
      "previous": "पिछला",
      "next": "अगला",
      "result": {
        "jumpTo": "{{time}} पर {{title}} पर जाएं",
        "hint": "इस सीन पर जाने के लिए दबाएं"
      },
      "panelOpened": "सीन सर्च पैनल खुला",
      "navigation": "सीन सर्च नेविगेशन",
      "position": "परिणाम {{current}} / {{total}}"
    }
  },
  "empty": {
    "noContent": "कोई सामग्री उपलब्ध नहीं",
    "tryAnotherCategory": "कोई अन्य श्रेणी चुनने का प्रयास करें",
    "noPodcasts": "कोई पॉडकास्ट उपलब्ध नहीं",
    "tryLater": "बाद में पुनः प्रयास करें",
    "noResults": "कोई परिणाम नहीं मिला"
  },
  "content": {
    "ep": "Ep",
    "noEpisodesAvailable": "चलाने के लिए कोई एपिसोड उपलब्ध नहीं",
    "loadingSeries": "सीरीज़ जानकारी लोड हो रही है...",
    "votes": "वोट",
    "imdbRating": "IMDB रेटिंग",
    "previewPlaying": "प्रीव्यू चल रहा है",
    "trailerPlaying": "ट्रेलर चल रहा है",
    "availableSubtitles": "उपलब्ध सबटाइटल",
    "subtitleSelected": "चयनित: {{language}}"
  },
  "audiobooks": {
    "audiobook": "ऑडियोबुक",
    "chapter": "अध्याय",
    "chapters": "अध्याय",
    "playChapter": "अध्याय चलाएं",
    "noChapters": "कोई अध्याय उपलब्ध नहीं",
    "notFound": "ऑडियोबुक नहीं मिला",
    "author": "लेखक",
    "narrator": "वाचक",
    "duration": "अवधि",
    "isbn": "ISBN"
  },
  "breadcrumbs": {
    "series": "सीरीज़",
    "movie": "फ़िल्म",
    "watching": "देख रहे हैं",
    "channel": "चैनल",
    "station": "स्टेशन",
    "podcast": "पॉडकास्ट",
    "watchlist": "वॉचलिस्ट",
    "downloads": "डाउनलोड"
  },
  "podcast": {
    "selectLanguage": "भाषा चुनें",
    "switchToLanguage": "{{language}} में बदलें",
    "premiumRequiredForTranslation": "पॉडकास्ट अनुवाद के लिए प्रीमियम सब्सक्रिप्शन आवश्यक",
    "player": {
      "switchingLanguage": "बदल रहा है..."
    },
    "languages": {
      "he": {
        "short": "HE",
        "full": "हिब्रू"
      },
      "en": {
        "short": "EN",
        "full": "अंग्रेज़ी"
      },
      "es": {
        "short": "ES",
        "full": "स्पेनिश"
      }
    }
  },
  "watchlist": {
    "watched": "देखा गया"
  },
  "widgets": {
    "empty": "अभी कोई विजेट नहीं",
    "emptyHint": "आपके विजेट यहां दिखाई देंगे",
    "emptyPersonal": "अभी कोई व्यक्तिगत विजेट नहीं",
    "emptyPersonalHint": "अपना पहला व्यक्तिगत विजेट बनाएं या ऊपर सिस्टम विजेट जोड़ें",
    "itemsTotal": "कुल विजेट",
    "systemWidgets": "सिस्टम विजेट",
    "systemWidgetsHint": "अपने संग्रह में विजेट ब्राउज़ करें और जोड़ें",
    "myWidgets": "मेरे व्यक्तिगत विजेट",
    "myWidgetsHint": "आपके द्वारा बनाए गए विजेट",
    "personalWidgets": "मेरे विजेट",
    "noSystemWidgets": "कोई सिस्टम विजेट उपलब्ध नहीं",
    "added": "जोड़ा गया",
    "add": "जोड़ें",
    "remove": "हटाएं",
    "show": "दिखाएं",
    "hidden": "छिपा हुआ",
    "addToCollection": "मेरे विजेट में जोड़ें",
    "removeFromCollection": "मेरे विजेट से हटाएं",
    "contentTypes": {
      "liveChannel": "लाइव चैनल",
      "iframe": "वेब सामग्री",
      "podcast": "पॉडकास्ट",
      "radio": "रेडियो",
      "vod": "वीडियो",
      "custom": "कस्टम",
      "widget": "विजेट"
    },
    "form": {
      "title": "विजेट बनाएं",
      "basicInfo": "मूल जानकारी",
      "titlePlaceholder": "विजेट शीर्षक",
      "titleRequired": "विजेट शीर्षक आवश्यक है",
      "descriptionPlaceholder": "विवरण (वैकल्पिक)",
      "iconPlaceholder": "आइकन इमोजी (जैसे, 📺)",
      "content": "सामग्री",
      "fromLibrary": "लाइब्रेरी से",
      "iframe": "iFrame",
      "selectContent": "सामग्री चुनें (चैनल, पॉडकास्ट, शो, आदि)",
      "iframeUrl": "iFrame URL",
      "iframeUrlRequired": "iFrame URL आवश्यक है",
      "iframeTitle": "iFrame शीर्षक",
      "positionSize": "स्थिति और आकार",
      "behavior": "व्यवहार",
      "mutedByDefault": "डिफ़ॉल्ट रूप से म्यूट",
      "closable": "बंद करने योग्य",
      "draggable": "खींचने योग्य",
      "widgetOrder": "विजेट क्रम",
      "orderPlaceholder": "क्रम (0 = पहला)",
      "saveWidget": "विजेट सहेजें",
      "saving": "सहेज रहे हैं...",
      "cancel": "रद्द करें",
      "change": "बदलें"
    },
    "intro": {
      "title": "विजेट में आपका स्वागत है",
      "description": "अपने देखने के अनुभव को अनुकूलित करने के लिए शक्तिशाली फ्लोटिंग विजेट खोजें",
      "watchVideo": "परिचय देखें",
      "skip": "छोड़ें",
      "dismiss": "फिर न दिखाएं",
      "videoUnavailable": "वीडियो अस्थायी रूप से अनुपलब्ध",
      "loadingMartyJr": "Marty Jr लोड हो रहा है...",
      "loadingWidgets": "विजेट परिचय लोड हो रहा है..."
    }
  },
  "trending": {
    "title": "इज़राइल में क्या ट्रेंड कर रहा है",
    "noTopics": "कोई ट्रेंडिंग विषय उपलब्ध नहीं",
    "topStory": "शीर्ष कहानी",
    "sources": "स्रोत",
    "categories": {
      "security": "सुरक्षा",
      "politics": "राजनीति",
      "tech": "तकनीक",
      "culture": "संस्कृति",
      "sports": "खेल",
      "economy": "अर्थव्यवस्था",
      "entertainment": "मनोरंजन",
      "weather": "मौसम",
      "health": "स्वास्थ्य",
      "general": "सामान्य"
    }
  },
  "cultures": {
    "title": "अपनी संस्कृति चुनें",
    "select": "संस्कृति चुनें",
    "selectCulture": "अपनी संस्कृति चुनें",
    "selectCultureDescription": "अपने अनुभव को व्यक्तिगत बनाने के लिए अपनी सांस्कृतिक समुदाय चुनें",
    "changeCulture": "संस्कृति बदलें",
    "israeli": {
      "name": "इज़राइली",
      "description": "इज़राइली प्रवासी समुदाय सामग्री"
    },
    "chinese": {
      "name": "चीनी",
      "description": "चीनी समुदाय सामग्री"
    },
    "japanese": {
      "name": "जापानी",
      "description": "जापानी समुदाय सामग्री"
    },
    "korean": {
      "name": "कोरियाई",
      "description": "कोरियाई समुदाय सामग्री"
    },
    "indian": {
      "name": "भारतीय",
      "description": "भारतीय समुदाय सामग्री"
    }
  },
  "cultureTrending": {
    "whatsHotIn": "{{location}} में क्या गरम है",
    "noTopics": "कोई ट्रेंडिंग विषय उपलब्ध नहीं",
    "sources": "स्रोत",
    "categories": {
      "security": "सुरक्षा",
      "politics": "राजनीति",
      "tech": "तकनीक",
      "technology": "तकनीक",
      "culture": "संस्कृति",
      "sports": "खेल",
      "economy": "अर्थव्यवस्था",
      "finance": "वित्त",
      "entertainment": "मनोरंजन",
      "weather": "मौसम",
      "health": "स्वास्थ्य",
      "food": "भोजन",
      "fashion": "फैशन",
      "travel": "यात्रा",
      "history": "इतिहास",
      "expat": "प्रवासी जीवन",
      "general": "सामान्य"
    }
  },
  "cultureCities": {
    "connectionTo": "{{city}} कनेक्शन",
    "explore": "{{city}} का अन्वेषण करें",
    "noContent": "इस शहर के लिए कोई सामग्री उपलब्ध नहीं",
    "categories": {
      "all": "सभी",
      "history": "इतिहास",
      "culture": "संस्कृति",
      "finance": "वित्त",
      "tech": "तकनीक",
      "food": "भोजन",
      "expat": "प्रवासी जीवन",
      "news": "समाचार",
      "entertainment": "मनोरंजन"
    }
  },
  "clock": {
    "israel": "इज़राइल",
    "local": "स्थानीय",
    "shabbatShalom": "शब्बत शालोम!",
    "erevShabbat": "एरेव शब्बत",
    "candleLighting": "मोमबत्ती जलाना",
    "parasha": "पराशा"
  },
  "ritual": {
    "title": "सुबह की दिनचर्या",
    "greeting": "सुप्रभात!",
    "israelUpdate": "इज़राइल में दोपहर है, समाचार चल रहे घटनाक्रमों पर रिपोर्ट कर रहे हैं",
    "recommendation": "हम सुबह की खबरों से शुरू करने और फिर रेडियो पर जाने की सलाह देते हैं",
    "preparingRitual": "आपकी सुबह की दिनचर्या तैयार हो रही है...",
    "israelTime": "इज़राइल समय",
    "day": "दिन",
    "letsStart": "शुरू करें",
    "skipToday": "आज के लिए छोड़ें",
    "finish": "समाप्त करें",
    "noContentNow": "अभी कोई सामग्री उपलब्ध नहीं",
    "typeLive": "लाइव",
    "typeRadio": "रेडियो",
    "typeVideo": "वीडियो"
  }
};

deepMerge(hi, translations);
fs.writeFileSync('hi.json', JSON.stringify(hi, null, 2) + '\n');
console.log('Part 2 complete - More sections added');
