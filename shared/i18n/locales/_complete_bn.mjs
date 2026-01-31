import fs from 'fs';

const bn = JSON.parse(fs.readFileSync('bn.json', 'utf8'));

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && key in target && target[key] instanceof Object && !Array.isArray(source[key])) {
      deepMerge(target[key], source[key]);
    } else if (!(key in target)) {
      target[key] = source[key];
    }
  }
  return target;
}

const translations = {
  "common": {
    "confirmDelete": "মুছে ফেলা নিশ্চিত করুন",
    "partialSuccess": "আংশিক সফল",
    "clearSelection": "সাফ করুন",
    "dismiss": "বাতিল করুন",
    "refresh": "রিফ্রেশ",
    "refreshing": "রিফ্রেশ হচ্ছে...",
    "refreshData": "ডেটা রিফ্রেশ করুন",
    "dismissError": "ত্রুটি বাতিল করুন",
    "closeHint": "বর্তমান স্ক্রিন বন্ধ করে",
    "cancelHint": "বর্তমান কাজ বাতিল করে",
    "loadingArticle": "নিবন্ধ লোড হচ্ছে...",
    "watch": "দেখুন",
    "share": "শেয়ার করুন",
    "noContent": "কোনো কন্টেন্ট নেই",
    "premium": "প্রিমিয়াম",
    "poweredBy": "দ্বারা চালিত"
  },
  "demo": {
    "search_interpretation": "\"{{query}}\" খুঁজুন",
    "suggestions": {
      "0": "ফাউদা",
      "1": "শটিসেল",
      "2": "তেহরান",
      "3": "দ্য আরবিট্রেটর",
      "4": "লেবার"
    },
    "assistant_response": "আমি ফাউদা সুপারিশ করি - একটি চমৎকার থ্রিলার সিরিজ!",
    "morning_greeting": "সুপ্রভাত! আজ আবহাওয়া সুন্দর, ইসরায়েল থেকে কিছু গুরুত্বপূর্ণ সংবাদ আছে, এবং আমি বিশেষভাবে আপনার জন্য কন্টেন্ট নির্বাচন করেছি।"
  },
  "login": {
    "termsNotice": "সাইন ইন করে, আপনি আমাদের সেবার শর্তাবলী এবং গোপনীয়তা নীতিতে সম্মত হচ্ছেন",
    "qrInstructions": "দ্রুত লগইনের জন্য আপনার ফোন দিয়ে কোডটি স্ক্যান করুন",
    "methodQR": "QR কোড",
    "methodVoice": "ভয়েস",
    "methodTraditional": "ইমেইল",
    "qrTitle": "লগইন করতে স্ক্যান করুন",
    "qrDescription": "টাইপ না করে লগইন করতে আপনার ফোন দিয়ে এই QR কোড স্ক্যান করুন",
    "expiresIn": "৫ মিনিটে মেয়াদ শেষ",
    "companionConnected": "ফোন সংযুক্ত!",
    "authenticating": "লগইন করা হচ্ছে...",
    "sessionExpired": "সেশনের মেয়াদ শেষ",
    "refreshQR": "নতুন কোড তৈরি করুন",
    "generatingQR": "QR কোড তৈরি হচ্ছে...",
    "howItWorks": "কিভাবে কাজ করে:",
    "step1": "আপনার ফোনে ক্যামেরা খুলুন",
    "step2": "উপরের QR কোড স্ক্যান করুন",
    "step3": "আপনার ফোনে লগইন করুন",
    "step4": "TV স্বয়ংক্রিয়ভাবে লগইন হবে!",
    "voicePlaceholder": "আপনার উত্তর টাইপ করুন...",
    "send": "পাঠান",
    "createAccount": "অ্যাকাউন্ট তৈরি করুন",
    "bayitThinking": "Bayit চিন্তা করছে...",
    "unexpectedError": "একটি অপ্রত্যাশিত ত্রুটি হয়েছে",
    "errors": {
      "googleFailed": "Google সাইন-ইন ব্যর্থ। আবার চেষ্টা করুন।"
    }
  },
  "tvLogin": {
    "invalidQR": "অবৈধ QR কোড। আপনার TV থেকে আবার স্ক্যান করুন।",
    "sessionInvalid": "এই QR কোডের মেয়াদ শেষ হয়েছে। আপনার TV-তে নতুন একটি তৈরি করুন।",
    "verificationFailed": "সেশন যাচাই ব্যর্থ। আবার চেষ্টা করুন।",
    "fillAllFields": "সব ফিল্ড পূরণ করুন",
    "loginFailed": "লগইন ব্যর্থ। আপনার তথ্য পরীক্ষা করুন।",
    "notLoggedIn": "আপনি এই ডিভাইসে লগইন করেননি।",
    "enterCredentials": "আপনার TV অনুমোদন করতে আপনার তথ্য লিখুন।",
    "authFailed": "অনুমোদন ব্যর্থ।",
    "verifying": "যাচাই করা হচ্ছে...",
    "verifyingDescription": "আপনার TV-তে সংযোগ করা হচ্ছে...",
    "loginTitle": "আপনার TV-তে লগইন করুন",
    "loginDescription": "আপনার TV অনুমোদন করতে আপনার তথ্য লিখুন",
    "authorizing": "অনুমোদন করা হচ্ছে...",
    "authorizingDescription": "আপনার TV-তে লগইন করা হচ্ছে...",
    "authorizeTV": "TV অনুমোদন করুন",
    "success": "সফল!",
    "successDescription": "আপনার TV এখন লগইন হয়েছে। আপনি এই পৃষ্ঠা বন্ধ করতে পারেন।",
    "goToHome": "হোমে যান",
    "error": "কিছু ভুল হয়েছে",
    "tryAgain": "আবার চেষ্টা করুন",
    "securityNote": "আপনার তথ্য নিরাপদে পাঠানো হয় এবং TV-তে কখনো সংরক্ষিত হয় না।",
    "footer": "সমস্যা হচ্ছে? আপনার TV থেকে নতুন QR কোড স্ক্যান করেছেন কিনা নিশ্চিত করুন।"
  },
  "googleLogin": {
    "cancelledError": "Google সাইন-ইন বাতিল করা হয়েছে",
    "missingCode": "প্রমাণীকরণ কোড অনুপস্থিত",
    "loginError": "Google দিয়ে সাইন ইন করতে ত্রুটি",
    "redirecting": "লগইন পৃষ্ঠায় পুনঃনির্দেশ করা হচ্ছে...",
    "connecting": "Google-এর সাথে সংযোগ করা হচ্ছে..."
  },
  "register": {
    "registering": "সাইন আপ হচ্ছে...",
    "continueWithGoogle": "Google দিয়ে সাইন আপ করুন",
    "fullName": "পুরো নাম",
    "loginLink": "লগইন",
    "placeholders": {
      "fullName": "রাহুল দাস",
      "email": "your@email.com",
      "password": "কমপক্ষে ৮টি অক্ষর",
      "confirmPassword": "আবার পাসওয়ার্ড লিখুন"
    },
    "errors": {
      "nameRequired": "নাম প্রয়োজন",
      "emailRequired": "ইমেইল প্রয়োজন",
      "passwordRequired": "পাসওয়ার্ড প্রয়োজন",
      "passwordTooShort": "পাসওয়ার্ড কমপক্ষে ৮ অক্ষর হতে হবে",
      "passwordMismatch": "পাসওয়ার্ড মিলছে না",
      "acceptTerms": "আপনাকে সেবার শর্তাবলী এবং গোপনীয়তা নীতি মেনে নিতে হবে",
      "fillAllFields": "সব ফিল্ড পূরণ করুন",
      "registrationFailed": "নিবন্ধন ব্যর্থ। আবার চেষ্টা করুন।",
      "googleFailed": "Google দিয়ে সাইন আপ ব্যর্থ। আবার চেষ্টা করুন।"
    }
  },
  "nav": {
    "support": "সাপোর্ট",
    "discover": "আবিষ্কার করুন",
    "plans": "প্ল্যান",
    "privacy": "গোপনীয়তা নীতি",
    "flows": "ফ্লো"
  },
  "epg": {
    "il": "IL",
    "local": "স্থানীয়",
    "goBack": "← {{hours}} ঘণ্টা",
    "goForward": "{{hours}} ঘণ্টা →",
    "toggleTimezone": "সময় অঞ্চল পরিবর্তন করুন",
    "errorLoading": "TV গাইড ডেটা লোড করা যায়নি",
    "recordProgram": "প্রোগ্রাম রেকর্ড করুন",
    "channel": "চ্যানেল",
    "enableSubtitles": "সাবটাইটেল সক্রিয় করুন",
    "subtitleLanguage": "সাবটাইটেল ভাষা",
    "storageEstimate": "স্টোরেজ অনুমান",
    "availableSpace": "উপলব্ধ স্থান",
    "lowStorage": "কম স্টোরেজ সতর্কতা",
    "lowStorageMessage": "আপনার স্টোরেজ কম হচ্ছে। পুরানো রেকর্ডিং মুছে ফেলার কথা বিবেচনা করুন।",
    "scheduleRecording": "রেকর্ডিং সময়সূচী করুন",
    "scheduledRecordingNotSupported": "সময়সূচীত রেকর্ডিং এখনও সমর্থিত নয়। শুধুমাত্র তাৎক্ষণিক রেকর্ডিং উপলব্ধ।",
    "recordingFailed": "রেকর্ডিং শুরু/সময়সূচী করতে ব্যর্থ",
    "smartSearch": "স্মার্ট সার্চ",
    "smartSearchSubtitle": "প্রাকৃতিক ভাষায় প্রশ্ন করুন",
    "smartSearchPlaceholder": "যেমন, আজ রাতে অভিনেত্রী তালি শ্যারনের সব শো দেখান",
    "searchPlaceholder": "প্রোগ্রাম, চ্যানেল, অভিনেতা খুঁজুন...",
    "premiumRequired": "প্রিমিয়াম বৈশিষ্ট্য",
    "premiumRequiredMessage": "স্মার্ট সার্চ আপনার প্রশ্ন বুঝতে AI ব্যবহার করে। এই বৈশিষ্ট্য অ্যাক্সেস করতে প্রিমিয়ামে আপগ্রেড করুন।",
    "searchWithAI": "AI দিয়ে খুঁজুন",
    "searching": "খুঁজছে...",
    "tryThese": "এই উদাহরণগুলি চেষ্টা করুন",
    "exampleQuery1": "আজ রাতে অভিনেত্রী তালি শ্যারনের সব শো দেখান",
    "exampleQuery2": "এই সপ্তাহে কোন কমেডি শো আছে?",
    "exampleQuery3": "চ্যানেল ১১-এ ইতিহাস সম্পর্কে ডকুমেন্টারি খুঁজুন",
    "exampleQuery4": "আগামীকাল সকালে সব সংবাদ প্রোগ্রাম দেখান",
    "aiDisclaimer": "Claude AI দ্বারা চালিত। প্রোগ্রাম ডেটার উপলব্ধতার উপর ভিত্তি করে ফলাফল পরিবর্তিত হতে পারে।",
    "interpretationTitle": "আমি যা বুঝেছি",
    "noResultsFound": "আপনার প্রশ্নের সাথে মিলে যায় এমন কোনো প্রোগ্রাম পাওয়া যায়নি",
    "noProgramsScheduled": "কোনো প্রোগ্রাম সময়সূচীত নেই",
    "noProgramsFound": "কোনো প্রোগ্রাম পাওয়া যায়নি",
    "noDataAvailable": "TV গাইড ডেটা উপলব্ধ নেই",
    "live": "লাইভ"
  },
  "home": {
    "showOnlyWithSubtitles": "শুধুমাত্র সাবটাইটেল সহ দেখান",
    "israeli-movies": "ইসরায়েলি সিনেমা",
    "israeli-series": "ইসরায়েলি সিরিজ",
    "action": "অ্যাকশন ও থ্রিলার",
    "trendingInIsrael": "ইসরায়েলে ট্রেন্ডিং",
    "jerusalemConnection": "জেরুজালেম সংযোগ",
    "telAvivConnection": "তেল আভিভ সংযোগ",
    "podcasts": "পডকাস্ট",
    "audiobooks": "অডিওবুক",
    "israelis_in_city": "{{city}}, {{state}}-এ ইসরায়েলিরা",
    "israeli_businesses": "{{city}}, {{state}}-এ ইসরায়েলি ব্যবসা",
    "israeli_businesses_nearby": "আপনার কাছাকাছি ইসরায়েলি ব্যবসা - {{city}} থেকে",
    "searching_businesses": "{{city}}-তে ইসরায়েলি ব্যবসা খোঁজা হচ্ছে...",
    "no_businesses_found": "{{city}}-তে কোনো ইসরায়েলি ব্যবসা পাওয়া যায়নি",
    "businesses_load_error": "ব্যবসার তালিকা লোড করা যায়নি। আবার চেষ্টা করুন।",
    "carousel": {
      "fauda": {
        "title": "ফাউদা",
        "subtitle": "সিজন ৪ - এখন স্ট্রিমিং",
        "description": "জনপ্রিয় ইসরায়েলি সিরিজ সাসপেন্স এবং অ্যাকশনে ভরা চতুর্থ সিজন নিয়ে ফিরে এসেছে"
      },
      "shtisel": {
        "title": "শটিসেল",
        "subtitle": "সব সিজন উপলব্ধ",
        "description": "জেরুজালেমের অতি-অর্থোডক্স পাড়ায় শটিসেল পরিবারকে অনুসরণ করুন"
      },
      "tehran": {
        "title": "তেহরান",
        "subtitle": "সিজন ২",
        "description": "একজন মোসাদ এজেন্ট ইরানে বিপজ্জনক মিশনে"
      },
      "live": {
        "title": "লাইভ - Kan 11",
        "subtitle": "এখনই দেখুন",
        "description": "সংবাদ, সমসাময়িক বিষয় এবং মানসম্পন্ন কন্টেন্ট"
      }
    }
  },
  "search": {
    "voicePlaceholder": "এখন বলুন...",
    "noResultsHint": "ভিন্ন কীওয়ার্ড চেষ্টা করুন বা আপনার ফিল্টার পরিবর্তন করুন",
    "tryDifferent": "ভিন্ন অনুসন্ধান শব্দ চেষ্টা করুন",
    "resultsFor": "ফলাফল",
    "resultsFound": "\"{{query}}\"-এর জন্য {{count}}টি ফলাফল পাওয়া গেছে",
    "trending": "ট্রেন্ডিং অনুসন্ধান",
    "promptTitle": "আপনি কী খুঁজছেন?",
    "promptDescription": "আপনার পছন্দের কন্টেন্ট খুঁজুন বা ভয়েস সার্চ ব্যবহার করুন",
    "filters": {
      "moviesAndSeries": "সিনেমা ও সিরিজ",
      "channels": "চ্যানেল",
      "podcasts": "পডকাস্ট"
    },
    "loadingMore": "আরও ফলাফল লোড হচ্ছে...",
    "viewMode": {
      "grid": "গ্রিড",
      "list": "তালিকা",
      "cards": "কার্ড"
    }
  },
  "auth": {
    "login": "লগইন"
  },
  "podcasts": {
    "tryLater": "পরে আবার চেষ্টা করুন",
    "selectLanguage": "অডিও ভাষা",
    "switchToLanguage": "{{language}}-তে পরিবর্তন করুন",
    "languageSwitched": "এখন {{language}}-তে চলছে",
    "availableInLanguage": "{{language}}-তে উপলব্ধ",
    "availableLanguages": "একাধিক ভাষায় উপলব্ধ",
    "downloadForOffline": "অফলাইনে শোনার জন্য ডাউনলোড করুন",
    "downloadProgress": "ডাউনলোড হচ্ছে {{progress}}%",
    "downloaded": "ডাউনলোড হয়েছে",
    "downloadFailed": "ডাউনলোড ব্যর্থ",
    "retryDownload": "ডাউনলোড পুনরায় চেষ্টা করুন",
    "deleteDownload": "ডাউনলোড মুছুন",
    "confirmDelete": "ডাউনলোড করা অডিও মুছবেন?",
    "quality": {
      "label": "অডিও মান",
      "low": "নিম্ন (64 kbps) - ডেটা সাশ্রয়",
      "medium": "মাঝারি (96 kbps) - সুষম",
      "high": "উচ্চ (128 kbps) - সেরা মান"
    },
    "languages": {
      "he": {
        "short": "হিব্রু",
        "full": "হিব্রু"
      },
      "en": {
        "short": "ইংরেজি",
        "full": "ইংরেজি"
      }
    },
    "player": {
      "switchingLanguage": "অডিও ভাষা পরিবর্তন হচ্ছে...",
      "languageSwitchError": "ভাষা পরিবর্তন করা যায়নি",
      "loadingTranslation": "অনুবাদিত অডিও লোড হচ্ছে...",
      "translationUnavailable": "অনুবাদ এখনও উপলব্ধ নয়"
    },
    "onboarding": {
      "multiLanguageTitle": "বহু-ভাষা অডিও",
      "multiLanguageDescription": "এই পডকাস্ট হিব্রু এবং ইংরেজিতে উপলব্ধ। পরিবর্তন করতে ভাষা সিলেক্টরে ট্যাপ করুন।",
      "downloadTitle": "অফলাইনে শুনুন",
      "downloadDescription": "ইন্টারনেট সংযোগ ছাড়া শুনতে পর্ব ডাউনলোড করুন।",
      "gotIt": "বুঝেছি"
    }
  },
  "vod": {
    "showOnlyWithSubtitles": "শুধুমাত্র সাবটাইটেল সহ দেখান",
    "allCategories": "সব",
    "emptyTitle": "কোনো কন্টেন্ট নেই",
    "emptyDescription": "অন্য বিভাগ নির্বাচন করুন",
    "allContent": "সব কন্টেন্ট",
    "noContent": "কোনো কন্টেন্ট নেই",
    "noContentInCategory": "এই বিভাগে কোনো কন্টেন্ট নেই"
  },
  "account": {
    "manageSubscription": "সাবস্ক্রিপশন পরিচালনা করুন",
    "personalDetails": "ব্যক্তিগত তথ্য",
    "billing": "বিলিং ও পেমেন্ট",
    "register": "নিবন্ধন করুন",
    "email": "ইমেইল",
    "password": "পাসওয়ার্ড",
    "name": "নাম"
  },
  "flows": {
    "title": "ফ্লো",
    "subtitle": "প্রতিটি মুহূর্তের জন্য ব্যক্তিগত কন্টেন্ট অভিজ্ঞতা",
    "activeNow": "এখন সক্রিয়",
    "start": "শুরু করুন",
    "skipToday": "আজ এড়িয়ে যান",
    "systemFlows": "তৈরি ফ্লো",
    "customFlows": "আমার ফ্লো",
    "system": "সিস্টেম",
    "noCustomFlows": "এখনও কোনো কাস্টম ফ্লো নেই",
    "createHint": "আপনার প্রথম ব্যক্তিগত ফ্লো তৈরি করুন",
    "createCustom": "কাস্টম ফ্লো তৈরি করুন",
    "createFlow": "ফ্লো তৈরি করুন",
    "editFlow": "ফ্লো সম্পাদনা করুন",
    "type": "ধরন",
    "systemFlow": "সিস্টেম ফ্লো",
    "customFlow": "কাস্টম ফ্লো",
    "schedule": "সময়সূচী",
    "content": "কন্টেন্ট",
    "items": "আইটেম",
    "aiGenerated": "AI তৈরি",
    "autoPlay": "অটো প্লে",
    "aiEnabled": "AI কিউরেশন",
    "shabbatTrigger": "শাব্বাত সন্ধ্যা",
    "manual": "ম্যানুয়াল",
    "flowName": "ফ্লো নাম",
    "flowNamePlaceholder": "যেমন, আমার সকালের রুটিন",
    "description": "বিবরণ",
    "descriptionPlaceholder": "এই ফ্লো কিসের জন্য?",
    "startTime": "শুরুর সময়",
    "endTime": "শেষের সময়",
    "actions": "কার্যক্রম",
    "details": "বিবরণ",
    "createFlowDesc": "আপনার ব্যক্তিগত কন্টেন্ট অভিজ্ঞতা ডিজাইন করুন",
    "editFlowDesc": "আপনার ফ্লো সেটিংস এবং কন্টেন্ট আপডেট করুন",
    "basicInfo": "মৌলিক তথ্য",
    "options": "বিকল্প",
    "autoPlayDesc": "বর্তমান শেষ হলে স্বয়ংক্রিয়ভাবে পরবর্তী আইটেম চালান",
    "aiEnabledDesc": "আপনার পছন্দের উপর ভিত্তি করে AI কন্টেন্ট কিউরেট করতে দিন",
    "startFlow": "ফ্লো শুরু করুন",
    "deleteFlow": "ফ্লো মুছুন",
    "custom": "কাস্টম",
    "morning": "সকাল",
    "evening": "সন্ধ্যা",
    "shabbat": "শাব্বাত",
    "addContent": "কন্টেন্ট যোগ করুন",
    "contentPicker": {
      "title": "ফ্লোতে কন্টেন্ট যোগ করুন",
      "tabs": {
        "live": "লাইভ TV",
        "radio": "রেডিও",
        "vod": "অন ডিমান্ড",
        "podcast": "পডকাস্ট"
      },
      "search": "কন্টেন্ট খুঁজুন...",
      "selected": "{{count}}টি নির্বাচিত",
      "addSelected": "নির্বাচিত যোগ করুন",
      "noResults": "কোনো কন্টেন্ট পাওয়া যায়নি",
      "alreadyAdded": "ইতিমধ্যে ফ্লোতে আছে",
      "loadMore": "আরও লোড করুন"
    },
    "flowItems": {
      "title": "ফ্লো কন্টেন্ট",
      "empty": "এখনও কোনো কন্টেন্ট নেই। শুরু করতে কন্টেন্ট যোগ করুন ক্লিক করুন।",
      "count": "{{count}}টি আইটেম",
      "remove": "সরান",
      "moveUp": "উপরে সরান",
      "moveDown": "নিচে সরান",
      "order": "ক্রম",
      "confirmRemove": "সরানো নিশ্চিত করতে আবার ক্লিক করুন",
      "maxReached": "সর্বোচ্চ {{max}}টি আইটেম পৌঁছেছে",
      "more": "আরও আইটেম"
    },
    "days": {
      "sunday": "রবিবার",
      "monday": "সোমবার",
      "tuesday": "মঙ্গলবার",
      "wednesday": "বুধবার",
      "thursday": "বৃহস্পতিবার",
      "friday": "শুক্রবার",
      "saturday": "শনিবার",
      "sundayShort": "রবি",
      "mondayShort": "সোম",
      "tuesdayShort": "মঙ্গল",
      "wednesdayShort": "বুধ",
      "thursdayShort": "বৃহ",
      "fridayShort": "শুক্র",
      "saturdayShort": "শনি",
      "selectAll": "সব নির্বাচন করুন",
      "deselectAll": "সব অনির্বাচন করুন",
      "title": "সক্রিয় দিন",
      "everyday": "প্রতিদিন",
      "everyDay": "প্রতিদিন",
      "weekdays": "সপ্তাহের দিন",
      "weekends": "সাপ্তাহিক ছুটি",
      "noneSelected": "কোনো দিন নির্বাচিত নয়",
      "selectedCount": "{{count}}টি দিন নির্বাচিত"
    },
    "trigger": {
      "type": "ট্রিগার ধরন",
      "time": "সময়-ভিত্তিক",
      "shabbat": "শাব্বাত সন্ধ্যা",
      "holiday": "ছুটির দিন",
      "skipShabbat": "শাব্বাতে এড়িয়ে যান",
      "skipShabbatDesc": "শুক্রবার সন্ধ্যা বা শনিবার এই ফ্লো চালাবেন না",
      "shabbatOffset": "মোমবাতি জ্বালানোর আগে মিনিট",
      "shabbatOffsetDesc": "শাব্বাতের কত মিনিট আগে এই ফ্লো শুরু হবে?",
      "calculatedTime": "গণনা করা সময়",
      "thisWeek": "এই সপ্তাহ: {{day}} {{time}}-এ",
      "comingSoon": "ছুটির ট্রিগার শীঘ্রই আসছে",
      "locationBased": "আপনার অবস্থানের উপর ভিত্তি করে সময়"
    },
    "examples": {
      "title": "উদাহরণ ফ্লো",
      "subtitle": "টেমপ্লেট হিসাবে ব্যবহার করতে ট্যাপ করুন",
      "morningRoutine": {
        "name": "সকালের রুটিন",
        "desc": "সংবাদ, আবহাওয়া এবং উৎসাহমূলক কন্টেন্ট দিয়ে আপনার দিন শুরু করুন"
      },
      "eveningWindDown": {
        "name": "সন্ধ্যার বিশ্রাম",
        "desc": "শান্ত সংগীত এবং হালকা বিনোদন দিয়ে আরাম করুন"
      },
      "shabbatPrep": {
        "name": "শাব্বাত প্রস্তুতি",
        "desc": "বিশেষ কন্টেন্ট দিয়ে শাব্বাতের পরিবেশ তৈরি করুন"
      },
      "coffeeBreak": {
        "name": "কফি বিরতি",
        "desc": "সংক্ষিপ্ত বিরতির জন্য দ্রুত বিনোদন"
      },
      "sunsetVibes": {
        "name": "সূর্যাস্তের পরিবেশ",
        "desc": "সংগীত এবং পরিবেশ কন্টেন্ট দিয়ে সাপ্তাহিক ছুটির বিশ্রাম"
      }
    },
    "aiBrief": "AI ব্রিফ",
    "aiBriefDesc": "ফ্লো শুরু হওয়ার আগে একটি ব্যক্তিগত AI-তৈরি সারাংশ পান",
    "aiBriefEnabled": "AI ব্রিফ সক্রিয়",
    "validation": {
      "nameRequired": "ফ্লো নাম প্রয়োজন",
      "startTimeRequired": "শুরুর সময় প্রয়োজন",
      "endTimeRequired": "শেষের সময় প্রয়োজন",
      "timeRange": "শেষের সময় শুরুর সময়ের পরে হতে হবে",
      "daysRequired": "অন্তত একটি দিন নির্বাচন করুন",
      "contentRequired": "কন্টেন্ট যোগ করুন বা AI সক্রিয় করুন"
    },
    "tv": {
      "useCompanion": "সম্পূর্ণ কাস্টমাইজেশনের জন্য, আপনার ফোনে Bayit+ অ্যাপ ব্যবহার করুন বা আপনার কম্পিউটারে bayit.plus-এ যান।"
    }
  }
};

deepMerge(bn, translations);
fs.writeFileSync('bn.json', JSON.stringify(bn, null, 2) + '\n');
console.log('Part 1 complete - flows and basic sections added');
