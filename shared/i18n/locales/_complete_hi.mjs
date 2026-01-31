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
  "common": {
    "confirmDelete": "हटाने की पुष्टि करें",
    "partialSuccess": "आंशिक सफलता",
    "dismiss": "खारिज करें",
    "refresh": "रीफ्रेश करें",
    "refreshing": "रीफ्रेश हो रहा है...",
    "refreshData": "डेटा रीफ्रेश करें",
    "dismissError": "त्रुटि खारिज करें",
    "closeHint": "वर्तमान स्क्रीन बंद करता है",
    "cancelHint": "वर्तमान कार्रवाई रद्द करता है",
    "loadingArticle": "लेख लोड हो रहा है...",
    "watch": "देखें",
    "share": "साझा करें",
    "noContent": "कोई सामग्री उपलब्ध नहीं",
    "premium": "प्रीमियम",
    "poweredBy": "द्वारा संचालित"
  },
  "googleLogin": {
    "cancelledError": "Google साइन-इन रद्द कर दिया गया",
    "missingCode": "प्रमाणीकरण कोड गायब है",
    "loginError": "Google से साइन इन करने में त्रुटि",
    "redirecting": "लॉगिन पेज पर रीडायरेक्ट हो रहा है...",
    "connecting": "Google से कनेक्ट हो रहा है..."
  },
  "login": {
    "qrDescription": "बिना टाइप किए लॉगिन करने के लिए इस QR कोड को अपने फोन से स्कैन करें",
    "generatingQR": "QR कोड जनरेट हो रहा है...",
    "howItWorks": "यह कैसे काम करता है:",
    "step1": "अपने फोन पर कैमरा खोलें",
    "step2": "ऊपर QR कोड स्कैन करें",
    "step3": "अपने फोन पर लॉगिन करें",
    "step4": "TV अपने आप लॉगिन हो जाएगा!",
    "voicePlaceholder": "अपना जवाब टाइप करें..."
  },
  "tvLogin": {
    "notLoggedIn": "आप इस डिवाइस पर लॉगिन नहीं हैं।",
    "enterCredentials": "कृपया अपने TV को अधिकृत करने के लिए अपनी साख दर्ज करें।",
    "authFailed": "प्राधिकरण विफल।",
    "verifying": "सत्यापित हो रहा है...",
    "verifyingDescription": "आपके TV से कनेक्ट हो रहा है...",
    "loginDescription": "अपने TV को अधिकृत करने के लिए अपनी साख दर्ज करें",
    "authorizing": "अधिकृत हो रहा है...",
    "authorizingDescription": "आपको TV पर लॉगिन कर रहा है...",
    "successDescription": "आपका TV अब लॉगिन हो गया है। आप इस पेज को बंद कर सकते हैं।",
    "securityNote": "आपकी साख सुरक्षित रूप से भेजी जाती है और TV पर कभी संग्रहीत नहीं होती।",
    "footer": "समस्या हो रही है? सुनिश्चित करें कि आपने अपने TV से एक नया QR कोड स्कैन किया है।"
  },
  "register": {
    "fullName": "पूरा नाम",
    "loginLink": "लॉगिन",
    "placeholders": {
      "fullName": "राहुल शर्मा",
      "email": "your@email.com",
      "password": "कम से कम 8 अक्षर",
      "confirmPassword": "पासवर्ड दोबारा दर्ज करें"
    },
    "errors": {
      "googleFailed": "Google से साइन अप विफल। कृपया पुनः प्रयास करें।"
    }
  },
  "nav": {
    "support": "सहायता",
    "plans": "योजनाएं",
    "privacy": "गोपनीयता नीति",
    "flows": "फ्लो"
  },
  "epg": {
    "il": "IL",
    "local": "स्थानीय",
    "goBack": "← {{hours}}घं",
    "goForward": "{{hours}}घं →",
    "toggleTimezone": "समय क्षेत्र बदलें",
    "errorLoading": "TV गाइड डेटा लोड नहीं हो सका",
    "enableSubtitles": "सबटाइटल सक्षम करें",
    "subtitleLanguage": "सबटाइटल भाषा",
    "storageEstimate": "स्टोरेज अनुमान",
    "availableSpace": "उपलब्ध स्थान",
    "lowStorage": "कम स्टोरेज चेतावनी",
    "lowStorageMessage": "आपका स्टोरेज कम हो रहा है। पुरानी रिकॉर्डिंग हटाने पर विचार करें।",
    "scheduleRecording": "रिकॉर्डिंग शेड्यूल करें",
    "scheduledRecordingNotSupported": "शेड्यूल की गई रिकॉर्डिंग अभी समर्थित नहीं है। केवल तत्काल रिकॉर्डिंग उपलब्ध है।",
    "recordingFailed": "रिकॉर्डिंग शुरू/शेड्यूल करने में विफल",
    "smartSearch": "स्मार्ट खोज",
    "smartSearchSubtitle": "प्राकृतिक भाषा में प्रश्न पूछें",
    "smartSearchPlaceholder": "जैसे, आज रात अभिनेत्री के साथ सभी शो दिखाओ",
    "premiumRequired": "प्रीमियम सुविधा",
    "premiumRequiredMessage": "स्मार्ट खोज आपके प्रश्नों को समझने के लिए AI का उपयोग करती है। इस सुविधा का उपयोग करने के लिए प्रीमियम में अपग्रेड करें।",
    "searchWithAI": "AI से खोजें",
    "searching": "खोज रहे हैं...",
    "tryThese": "ये उदाहरण आज़माएं",
    "exampleQuery1": "आज रात अभिनेत्री के साथ सभी शो दिखाओ",
    "exampleQuery2": "इस सप्ताह कौन से कॉमेडी शो आ रहे हैं?",
    "exampleQuery3": "चैनल 11 पर इतिहास के बारे में डॉक्यूमेंट्री खोजें",
    "exampleQuery4": "कल सुबह के सभी समाचार कार्यक्रम दिखाएं",
    "aiDisclaimer": "Claude AI द्वारा संचालित। प्रोग्राम डेटा उपलब्धता के आधार पर परिणाम भिन्न हो सकते हैं।",
    "interpretationTitle": "मैंने क्या समझा",
    "noResultsFound": "आपकी क्वेरी से मेल खाने वाले कोई प्रोग्राम नहीं मिले",
    "noProgramsScheduled": "कोई प्रोग्राम शेड्यूल नहीं",
    "noProgramsFound": "कोई प्रोग्राम नहीं मिला",
    "noDataAvailable": "कोई TV गाइड डेटा उपलब्ध नहीं",
    "live": "लाइव"
  },
  "home": {
    "jerusalemConnection": "जेरूसलम कनेक्शन",
    "telAvivConnection": "तेल अवीव कनेक्शन",
    "podcasts": "पॉडकास्ट",
    "audiobooks": "ऑडियोबुक",
    "israelis_in_city": "{{city}}, {{state}} में इज़राइली",
    "israeli_businesses": "{{city}}, {{state}} में इज़राइली व्यवसाय",
    "israeli_businesses_nearby": "आपके पास इज़राइली व्यवसाय - {{city}} से",
    "searching_businesses": "{{city}} में इज़राइली व्यवसाय खोज रहे हैं...",
    "no_businesses_found": "{{city}} में कोई इज़राइली व्यवसाय नहीं मिला",
    "businesses_load_error": "व्यवसाय सूची लोड करने में असमर्थ। कृपया पुनः प्रयास करें।",
    "carousel": {
      "fauda": {
        "title": "Fauda",
        "subtitle": "सीज़न 4 - अब स्ट्रीमिंग",
        "description": "हिट इज़राइली सीरीज़ सस्पेंस और एक्शन से भरे चौथे सीज़न के साथ वापस"
      },
      "shtisel": {
        "title": "Shtisel",
        "subtitle": "सभी सीज़न उपलब्ध",
        "description": "जेरूसलम के अल्ट्रा-ऑर्थोडॉक्स पड़ोस में Shtisel परिवार का अनुसरण करें"
      },
      "tehran": {
        "title": "Tehran",
        "subtitle": "सीज़न 2",
        "description": "एक खतरनाक मिशन पर ईरान में एक मोसाद एजेंट"
      },
      "live": {
        "title": "लाइव - Kan 11",
        "subtitle": "अभी देखें",
        "description": "समाचार, करंट अफेयर्स और गुणवत्तापूर्ण सामग्री"
      }
    }
  },
  "search": {
    "tryDifferent": "अलग खोज शब्द आज़माएं",
    "resultsFor": "के लिए परिणाम",
    "resultsFound": "\"{{query}}\" के लिए {{count}} परिणाम मिले",
    "promptTitle": "आप क्या खोज रहे हैं?",
    "promptDescription": "अपनी पसंदीदा सामग्री खोजें या वॉइस सर्च उपयोग करें",
    "filters": {
      "moviesAndSeries": "फ़िल्में और सीरीज़",
      "channels": "चैनल",
      "podcasts": "पॉडकास्ट"
    },
    "loadingMore": "और परिणाम लोड हो रहे हैं...",
    "viewMode": {
      "grid": "ग्रिड",
      "list": "सूची",
      "cards": "कार्ड"
    }
  },
  "auth": {
    "login": "लॉगिन"
  },
  "podcasts": {
    "selectLanguage": "ऑडियो भाषा",
    "switchToLanguage": "{{language}} में बदलें",
    "languageSwitched": "अब {{language}} में चल रहा है",
    "availableInLanguage": "{{language}} में उपलब्ध",
    "availableLanguages": "कई भाषाओं में उपलब्ध",
    "downloadForOffline": "ऑफ़लाइन सुनने के लिए डाउनलोड करें",
    "downloadProgress": "डाउनलोड हो रहा है {{progress}}%",
    "downloaded": "डाउनलोड हो गया",
    "downloadFailed": "डाउनलोड विफल",
    "retryDownload": "डाउनलोड पुनः प्रयास करें",
    "deleteDownload": "डाउनलोड हटाएं",
    "confirmDelete": "डाउनलोड किया गया ऑडियो हटाएं?",
    "quality": {
      "label": "ऑडियो गुणवत्ता",
      "low": "कम (64 kbps) - डेटा बचाएं",
      "medium": "मध्यम (96 kbps) - संतुलित",
      "high": "उच्च (128 kbps) - सर्वोत्तम गुणवत्ता"
    },
    "languages": {
      "he": {
        "short": "हिब्रू",
        "full": "हिब्रू"
      },
      "en": {
        "short": "अंग्रेज़ी",
        "full": "अंग्रेज़ी"
      }
    },
    "player": {
      "switchingLanguage": "ऑडियो भाषा बदल रहा है...",
      "languageSwitchError": "भाषा नहीं बदल सकी",
      "loadingTranslation": "अनुवादित ऑडियो लोड हो रहा है...",
      "translationUnavailable": "अनुवाद अभी उपलब्ध नहीं"
    },
    "onboarding": {
      "multiLanguageTitle": "बहु-भाषा ऑडियो",
      "multiLanguageDescription": "यह पॉडकास्ट हिब्रू और अंग्रेज़ी में उपलब्ध है। बदलने के लिए भाषा चयनकर्ता टैप करें।",
      "downloadTitle": "ऑफ़लाइन सुनें",
      "downloadDescription": "इंटरनेट कनेक्शन के बिना सुनने के लिए एपिसोड डाउनलोड करें।",
      "gotIt": "समझ गया"
    }
  },
  "vod": {
    "allContent": "सभी सामग्री",
    "noContent": "कोई सामग्री उपलब्ध नहीं",
    "noContentInCategory": "इस श्रेणी में कोई सामग्री नहीं मिली"
  },
  "flows": {
    "system": "सिस्टम",
    "noCustomFlows": "अभी तक कोई कस्टम फ्लो नहीं",
    "createHint": "अपना पहला व्यक्तिगत फ्लो बनाएं",
    "createCustom": "कस्टम फ्लो बनाएं",
    "type": "प्रकार",
    "systemFlow": "सिस्टम फ्लो",
    "customFlow": "कस्टम फ्लो",
    "schedule": "शेड्यूल",
    "content": "सामग्री",
    "items": "आइटम",
    "aiGenerated": "AI जनरेटेड",
    "autoPlay": "ऑटो प्ले",
    "aiEnabled": "AI क्यूरेशन",
    "shabbatTrigger": "शब्बत शाम",
    "manual": "मैनुअल",
    "flowName": "फ्लो नाम",
    "flowNamePlaceholder": "जैसे, मेरी सुबह की दिनचर्या",
    "description": "विवरण",
    "descriptionPlaceholder": "यह फ्लो किसके लिए है?",
    "startTime": "प्रारंभ समय",
    "endTime": "समाप्ति समय",
    "actions": "कार्रवाइयां",
    "details": "विवरण",
    "createFlowDesc": "अपना व्यक्तिगत सामग्री अनुभव डिज़ाइन करें",
    "editFlowDesc": "अपनी फ्लो सेटिंग्स और सामग्री अपडेट करें",
    "basicInfo": "मूल जानकारी",
    "options": "विकल्प",
    "autoPlayDesc": "जब वर्तमान समाप्त हो तो अगला आइटम स्वचालित रूप से चलाएं",
    "aiEnabledDesc": "AI को आपकी पसंद के आधार पर सामग्री क्यूरेट करने दें",
    "startFlow": "फ्लो शुरू करें",
    "deleteFlow": "फ्लो हटाएं",
    "custom": "कस्टम",
    "morning": "सुबह",
    "evening": "शाम",
    "shabbat": "शब्बत",
    "addContent": "सामग्री जोड़ें",
    "contentPicker": {
      "title": "फ्लो में सामग्री जोड़ें",
      "tabs": {
        "live": "लाइव TV",
        "radio": "रेडियो",
        "vod": "ऑन डिमांड",
        "podcast": "पॉडकास्ट"
      },
      "search": "सामग्री खोजें...",
      "selected": "{{count}} चयनित",
      "addSelected": "चयनित जोड़ें",
      "noResults": "कोई सामग्री नहीं मिली",
      "alreadyAdded": "पहले से फ्लो में",
      "loadMore": "और लोड करें"
    },
    "flowItems": {
      "title": "फ्लो सामग्री",
      "empty": "अभी कोई सामग्री नहीं। शुरू करने के लिए सामग्री जोड़ें पर क्लिक करें।",
      "count": "{{count}} आइटम",
      "remove": "हटाएं",
      "moveUp": "ऊपर ले जाएं",
      "moveDown": "नीचे ले जाएं",
      "order": "क्रम",
      "confirmRemove": "हटाने की पुष्टि के लिए फिर से क्लिक करें",
      "maxReached": "अधिकतम {{max}} आइटम पहुंच गए",
      "more": "और आइटम"
    },
    "days": {
      "sunday": "रविवार",
      "monday": "सोमवार",
      "tuesday": "मंगलवार",
      "wednesday": "बुधवार",
      "thursday": "गुरुवार",
      "friday": "शुक्रवार",
      "saturday": "शनिवार",
      "sundayShort": "रवि",
      "mondayShort": "सोम",
      "tuesdayShort": "मंगल",
      "wednesdayShort": "बुध",
      "thursdayShort": "गुरु",
      "fridayShort": "शुक्र",
      "saturdayShort": "शनि",
      "selectAll": "सभी चुनें",
      "deselectAll": "सभी हटाएं",
      "title": "सक्रिय दिन",
      "everyday": "हर दिन",
      "everyDay": "हर दिन",
      "weekdays": "कार्यदिवस",
      "weekends": "सप्ताहांत",
      "noneSelected": "कोई दिन नहीं चुना",
      "selectedCount": "{{count}} दिन चुने"
    },
    "trigger": {
      "type": "ट्रिगर प्रकार",
      "time": "समय-आधारित",
      "shabbat": "शब्बत शाम",
      "holiday": "छुट्टी",
      "skipShabbat": "शब्बत पर छोड़ें",
      "skipShabbatDesc": "शुक्रवार शाम या शनिवार को यह फ्लो न चलाएं",
      "shabbatOffset": "मोमबत्ती जलाने से मिनट पहले",
      "shabbatOffsetDesc": "शब्बत से कितने मिनट पहले यह फ्लो शुरू होना चाहिए?",
      "calculatedTime": "गणना किया गया समय",
      "thisWeek": "इस सप्ताह: {{day}} को {{time}} बजे",
      "comingSoon": "छुट्टी ट्रिगर जल्द आ रहे हैं",
      "locationBased": "आपके स्थान के आधार पर समय"
    },
    "examples": {
      "title": "उदाहरण फ्लो",
      "subtitle": "टेम्पलेट के रूप में उपयोग करने के लिए टैप करें",
      "morningRoutine": {
        "name": "सुबह की दिनचर्या",
        "desc": "समाचार, मौसम और प्रेरणादायक सामग्री के साथ अपना दिन शुरू करें"
      },
      "eveningWindDown": {
        "name": "शाम की विश्राम",
        "desc": "शांत संगीत और हल्के मनोरंजन के साथ आराम करें"
      },
      "shabbatPrep": {
        "name": "शब्बत की तैयारी",
        "desc": "विशेष सामग्री के साथ शब्बत का माहौल बनाएं"
      },
      "coffeeBreak": {
        "name": "कॉफी ब्रेक",
        "desc": "छोटे ब्रेक के लिए त्वरित मनोरंजन"
      },
      "sunsetVibes": {
        "name": "सनसेट वाइब्स",
        "desc": "संगीत और एंबिएंट सामग्री के साथ सप्ताहांत विश्राम"
      }
    },
    "aiBrief": "AI ब्रीफ",
    "aiBriefDesc": "फ्लो शुरू होने से पहले व्यक्तिगत AI-जनित सारांश प्राप्त करें",
    "aiBriefEnabled": "AI ब्रीफ सक्षम",
    "validation": {
      "nameRequired": "फ्लो नाम आवश्यक है",
      "startTimeRequired": "प्रारंभ समय आवश्यक है",
      "endTimeRequired": "समाप्ति समय आवश्यक है",
      "timeRange": "समाप्ति समय प्रारंभ समय के बाद होना चाहिए",
      "daysRequired": "कम से कम एक दिन चुनें",
      "contentRequired": "सामग्री जोड़ें या AI सक्षम करें"
    },
    "tv": {
      "useCompanion": "पूर्ण अनुकूलन के लिए, अपने फोन पर Bayit+ ऐप का उपयोग करें या अपने कंप्यूटर पर bayit.plus पर जाएं।"
    }
  },
  "profile": {
    "updatePassword": "अपना पासवर्ड अपडेट करें",
    "connectedDevices": "कनेक्टेड डिवाइस",
    "manageDevices": "अपने खाते से कनेक्टेड डिवाइस प्रबंधित करें",
    "twoFactorAuth": "दो-कारक प्रमाणीकरण",
    "addExtraSecurity": "अतिरिक्त सुरक्षा परत जोड़ें",
    "address": {
      "line1": "123 मेन स्ट्रीट",
      "line2": "तेल अवीव, इज़राइल 6100000"
    },
    "free": "मुफ्त",
    "premiumPrice": "$7.99/महीना",
    "familyPrice": "$12.99/महीना",
    "remaining": "शेष",
    "tabs": {
      "personal": "व्यक्तिगत",
      "overview": "अवलोकन",
      "subscription": "सब्सक्रिप्शन",
      "notifications": "सूचनाएं",
      "security": "सुरक्षा",
      "ai": "AI और वॉइस",
      "voice": "वॉइस और एक्सेसिबिलिटी",
      "devices": "डिवाइस"
    },
    "subscription": {
      "currentPlan": "वर्तमान योजना",
      "renewsOn": "नवीनीकरण तिथि",
      "manageSubscription": "सब्सक्रिप्शन प्रबंधित करें",
      "cancelSubscription": "सब्सक्रिप्शन रद्द करें",
      "noActivePlan": "कोई सक्रिय सब्सक्रिप्शन नहीं",
      "selectPlan": "योजना चुनें"
    },
    "notifications": "सूचनाएं",
    "ai": {
      "title": "AI और व्यक्तिगतकरण",
      "description": "AI-संचालित सुविधाएं कॉन्फ़िगर करें",
      "assistant": "AI सहायक",
      "assistantDesc": "व्यक्तिगत सिफारिशें और सहायता",
      "chatbot": "AI सहायक",
      "chatbotEnabled": "AI सहायक सक्षम करें",
      "chatbotEnabledDesc": "सामग्री नेविगेट करने में सहायता प्राप्त करें",
      "saveHistory": "वार्तालाप इतिहास सहेजें",
      "saveHistoryDesc": "पिछली बातचीत याद रखें",
      "recommendations": "सिफारिशें",
      "personalizedRecs": "व्यक्तिगत सिफारिशें",
      "personalizedRecsDesc": "इतिहास के आधार पर सामग्री सुझाव",
      "privacy": "गोपनीयता और डेटा",
      "privacyDesc": "आपका डेटा एन्क्रिप्टेड और सुरक्षित है",
      "dataConsent": "उपयोग विश्लेषण",
      "dataConsentDesc": "AI सुविधाओं को बेहतर बनाने में मदद करें",
      "privacyNote": "आपका डेटा एन्क्रिप्टेड और सुरक्षित है"
    },
    "voice": {
      "title": "वॉइस कंट्रोल",
      "description": "हैंड्स-फ्री नेविगेशन",
      "enabled": "वॉइस कमांड",
      "enabledDesc": "अपनी आवाज से ऐप नियंत्रित करें",
      "tts": "टेक्स्ट-टू-स्पीच",
      "ttsDesc": "AI प्रतिक्रियाएं जोर से पढ़ें",
      "wakeWord": "वेक वर्ड डिटेक्शन",
      "wakeWordDesc": "सक्रिय करने के लिए \"Bayit\" बोलें",
      "operationMode": "ऑपरेशन मोड",
      "operationModeDesc": "चुनें कि आप ऐप के साथ कैसे इंटरैक्ट करते हैं",
      "voiceSearch": "वॉइस सर्च",
      "voiceSearchEnabled": "वॉइस सर्च सक्षम करें",
      "voiceSearchEnabledDesc": "अपनी आवाज से सामग्री खोजें",
      "constantListening": "हमेशा सुनने का मोड",
      "constantListeningDesc": "बटन दबाए बिना लगातार वॉइस कमांड सुनें",
      "constantListeningPrivacy": "ऑडियो केवल तब सर्वर को भेजा जाता है जब भाषण का पता चलता है",
      "holdButtonMode": "बात करने के लिए बटन दबाएं",
      "holdButtonModeDesc": "हमेशा सुनने के बजाय माइक्रोफोन बटन दबाकर रखें",
      "sensitivity": "वॉइस डिटेक्शन संवेदनशीलता",
      "sensitivityDesc": "वॉइस डिटेक्शन कितना प्रतिक्रियाशील है समायोजित करें",
      "sensitivityLow": "कम (कम गलत ट्रिगर)",
      "sensitivityMedium": "मध्यम (संतुलित)",
      "sensitivityHigh": "उच्च (सबसे अधिक प्रतिक्रियाशील)",
      "silenceThreshold": "मौन का पता लगाना",
      "silenceThresholdDesc": "बोलने के बाद प्रोसेसिंग से पहले कितनी देर प्रतीक्षा करें",
      "language": "वॉइस भाषा",
      "accessibility": "एक्सेसिबिलिटी",
      "autoSubtitle": "सबटाइटल ऑटो-सक्षम करें",
      "autoSubtitleDesc": "सामग्री चलाते समय स्वचालित रूप से सबटाइटल दिखाएं",
      "highContrast": "उच्च कंट्रास्ट मोड",
      "highContrastDesc": "बेहतर दृश्यता के लिए कंट्रास्ट बढ़ाएं",
      "textSize": "टेक्स्ट आकार",
      "textSizeSmall": "छोटा",
      "textSizeMedium": "मध्यम",
      "textSizeLarge": "बड़ा",
      "voiceOnlyInfo": "केवल वॉइस मोड",
      "voiceOnlyDetails": "सक्रिय करने के लिए \"Hi Bayit\" बोलें। रिमोट कंट्रोल अक्षम। पूरी तरह से वॉइस कमांड से नेविगेट करें।",
      "hybridInfo": "हाइब्रिड मोड",
      "hybridDetails": "वॉइस या रिमोट कंट्रोल उपयोग करें। गैर-वॉइस कार्यों पर वॉइस फीडबैक।",
      "classicInfo": "क्लासिक मोड",
      "classicDetails": "सभी वॉइस सुविधाएं अक्षम। केवल रिमोट कंट्रोल।",
      "textToSpeech": "वॉइस प्रतिक्रियाएं",
      "ttsEnabled": "वॉइस प्रतिक्रियाएं सक्षम करें",
      "ttsEnabledDesc": "ऐप आपके वॉइस कमांड के जवाब बोलेगा",
      "ttsVolume": "वॉइस वॉल्यूम",
      "ttsSpeed": "बोलने की गति",
      "hybridFeedback": "इंटरैक्टिव फीडबैक",
      "voiceFeedback": "कार्यों पर वॉइस फीडबैक",
      "voiceFeedbackDesc": "जब आप रिमोट या बटन क्लिक करते हैं तो वॉइस पुष्टि प्राप्त करें",
      "feedbackExample": "उदाहरण: मूवी पर क्लिक करें → ऐप बोलता है \"[मूवी नाम] चला रहा है\"",
      "state": {
        "idle": "तैयार",
        "listening": "सुन रहे हैं...",
        "processing": "प्रोसेसिंग...",
        "speaking": "बोल रहे हैं",
        "error": "त्रुटि"
      },
      "avatar": {
        "title": "अवतार प्रदर्शन",
        "description": "वॉइस इंटरैक्शन के दौरान Olorin विज़ार्ड कैसे दिखाई दे चुनें",
        "currentMode": "वर्तमान मोड",
        "modes": {
          "full": "पूर्ण स्क्रीन",
          "compact": "कॉम्पैक्ट",
          "minimal": "न्यूनतम",
          "iconOnly": "केवल आइकन"
        },
        "descriptions": {
          "full": "एनिमेशन, ट्रांसक्रिप्ट और पूर्ण वॉइस इंटरैक्शन के साथ पूर्ण विज़ार्ड",
          "compact": "एनिमेशन के साथ फ्लोटिंग सर्कुलर विज़ार्ड पैनल",
          "minimal": "केवल स्टेटस इंडिकेटर के साथ वेवफॉर्म बार",
          "iconOnly": "छिपा हुआ - केवल माइक्रोफोन बटन दिखाई दे"
        },
        "features": {
          "wizard": "विज़ार्ड कैरेक्टर",
          "animations": "एनिमेटेड जेस्चर",
          "waveform": "ऑडियो वेवफॉर्म",
          "transcript": "लाइव ट्रांसक्रिप्ट"
        },
        "closePanel": "वॉइस पैनल बंद करें",
        "closePanelHint": "वॉइस इंटरैक्शन पैनल बंद करने के लिए टैप करें",
        "audioVisualization": "ऑडियो विज़ुअलाइज़ेशन",
        "compactMode": "कॉम्पैक्ट वॉइस विज़ार्ड",
        "wizardAvatar": "विज़ार्ड अवतार",
        "wizardCharacter": "Olorin विज़ार्ड कैरेक्टर",
        "fullMode": "पूर्ण स्क्रीन वॉइस विज़ार्ड",
        "wizardInteraction": "विज़ार्ड के साथ वॉइस इंटरैक्शन",
        "openVoice": "वॉइस सहायक खोलें",
        "openVoiceHint": "Olorin विज़ार्ड के साथ वॉइस इंटरैक्शन सक्रिय करें",
        "wizardHat": "विज़ार्ड हैट आइकन"
      },
      "gesture": {
        "browsing": "विज़ार्ड ब्राउज़ कर रहा है",
        "cheering": "विज़ार्ड उत्साहित कर रहा है",
        "clapping": "विज़ार्ड ताली बजा रहा है",
        "conjuring": "विज़ार्ड जादू कर रहा है",
        "crying": "विज़ार्ड रो रहा है",
        "shrugging": "विज़ार्ड कंधे उचका रहा है",
        "facepalm": "विज़ार्ड फेसपाम कर रहा है"
      },
      "settings": {
        "title": "वॉइस सेटिंग्स",
        "close": "बंद करें",
        "voiceFeatures": "वॉइस सुविधाएं",
        "enableCommands": "वॉइस कमांड सक्षम करें",
        "enableCommandsDesc": "वॉइस सर्च और कमांड सक्रिय करें",
        "voiceLanguage": "वॉइस भाषा",
        "wakeWordDetection": "वेक वर्ड डिटेक्शन",
        "sensitivityLabel": "संवेदनशीलता",
        "sensitivityHint": "उच्च = अधिक प्रतिक्रियाशील, अधिक गलत पॉजिटिव हो सकते हैं",
        "currentSensitivity": "वर्तमान संवेदनशीलता: {{value}}%",
        "avatarDisplay": "अवतार प्रदर्शन",
        "voiceResponse": "वॉइस प्रतिक्रिया",
        "audioResponses": "ऑडियो प्रतिक्रियाएं",
        "audioResponsesDesc": "टेक्स्ट के बजाय वॉइस से जवाब दें",
        "privacy": "गोपनीयता और इतिहास",
        "recordHistory": "कमांड इतिहास रिकॉर्ड करें",
        "recordHistoryDesc": "त्वरित पहुंच के लिए वॉइस कमांड सहेजें",
        "historyHelp": "इतिहास वॉइस रिकग्निशन सटीकता में सुधार करने में मदद करता है",
        "permissions": "अनुमतियां",
        "microphone": "माइक्रोफोन",
        "granted": "दी गई",
        "denied": "अस्वीकृत",
        "microphoneRequired": "वॉइस कमांड के लिए माइक्रोफोन एक्सेस आवश्यक है",
        "supportedCommands": "समर्थित कमांड",
        "advanced": "उन्नत",
        "clearHistory": "कमांड इतिहास साफ़ करें",
        "resetSettings": "सभी सेटिंग्स रीसेट करें",
        "clearHistoryConfirm": "कमांड इतिहास साफ़ करें",
        "clearHistoryMessage": "क्या आप वाकई सभी वॉइस कमांड इतिहास हटाना चाहते हैं?",
        "resetConfirm": "सेटिंग्स रीसेट करें",
        "resetMessage": "वॉइस सेटिंग्स को डिफ़ॉल्ट पर रीसेट करें?",
        "historyCleared": "कमांड इतिहास साफ़ हो गया",
        "success": "सफलता"
      },
      "errors": {
        "microphoneAccess": "माइक्रोफोन एक्सेस अस्वीकृत",
        "networkError": "नेटवर्क कनेक्शन त्रुटि",
        "processingFailed": "वॉइस इनपुट प्रोसेस करने में विफल",
        "intentClassification": "कमांड समझ नहीं आई",
        "timeout": "वॉइस रिकग्निशन टाइमआउट"
      }
    },
    "devices": {
      "minutesAgo_one": "1 मिनट पहले",
      "minutesAgo_other": "{{count}} मिनट पहले",
      "hoursAgo_one": "1 घंटा पहले",
      "hoursAgo_other": "{{count}} घंटे पहले",
      "daysAgo_one": "1 दिन पहले",
      "daysAgo_other": "{{count}} दिन पहले",
      "disconnectDevice": "डिवाइस डिस्कनेक्ट करें"
    },
    "dropdown": {
      "myProfile": "मेरी प्रोफ़ाइल",
      "subscription": "सब्सक्रिप्शन",
      "favorites": "पसंदीदा",
      "downloads": "डाउनलोड",
      "signOut": "साइन आउट"
    },
    "guest": "अतिथि",
    "morningRitual": "सुबह की दिनचर्या",
    "watchlist": "वॉचलिस्ट",
    "favorites": "पसंदीदा",
    "downloads": "डाउनलोड",
    "settings": "सेटिंग्स",
    "language": "भाषा",
    "admin": "एडमिन",
    "watchTime": "देखने का समय",
    "minutes": "मिनट",
    "hours": "घंटे",
    "logout": "लॉग आउट",
    "aiAssistant": "AI सहायक",
    "voiceSettings": "वॉइस",
    "subscriptionButton": "सब्सक्रिप्शन",
    "recentActivity": "हाल की गतिविधि",
    "justNow": "अभी",
    "hoursAgo": "{{hours}} घंटे पहले",
    "yesterday": "कल",
    "noRecentActivity": "कोई हाल की गतिविधि नहीं",
    "accountInfo": "खाता जानकारी",
    "role": "भूमिका",
    "accountSecurity": "खाता सुरक्षा",
    "securityNote": "आपका खाता एन्क्रिप्टेड प्रमाणीकरण के साथ सुरक्षित है",
    "lastLogin": "अंतिम लॉगिन",
    "dangerZone": "खतरनाक क्षेत्र",
    "invalidImageType": "कृपया एक मान्य छवि फ़ाइल चुनें (JPEG, PNG, WebP, या GIF)",
    "imageTooLarge": "छवि बहुत बड़ी है। अधिकतम आकार 5MB है।",
    "uploadSuccess": "अवतार सफलतापूर्वक अपडेट हो गया!",
    "uploadFailed": "अवतार अपलोड करने में विफल। कृपया पुनः प्रयास करें।"
  }
};

deepMerge(hi, translations);
fs.writeFileSync('hi.json', JSON.stringify(hi, null, 2) + '\n');
console.log('Part 1 complete - Basic sections added');
