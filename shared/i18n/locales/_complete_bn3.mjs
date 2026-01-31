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
  "help": {
    "subtitle": "আমরা আপনাকে কিভাবে সাহায্য করতে পারি?",
    "email": "ইমেইল সাপোর্ট",
    "phone": "ফোন সাপোর্ট",
    "chat": "লাইভ চ্যাট",
    "chatAvailable": "24/7 উপলব্ধ",
    "openTooltip": "সাহায্য টুলটিপ খুলুন",
    "openHelp": "সাহায্য মেনু খুলুন",
    "howTo": "কিভাবে ব্যবহার করবেন",
    "relatedArticles": "সম্পর্কিত নিবন্ধ",
    "stillNeedHelp": "এখনও সাহায্য দরকার?",
    "contactSupport": "সাপোর্টে যোগাযোগ করুন",
    "previous": "পূর্ববর্তী",
    "next": "পরবর্তী",
    "getStarted": "শুরু করুন",
    "skipTutorial": "টিউটোরিয়াল এড়িয়ে যান",
    "actions": {
      "search": "সাহায্য খুঁজুন",
      "docs": "ডকুমেন্টেশন",
      "faq": "FAQ",
      "support": "সাপোর্টে যোগাযোগ করুন",
      "tutorial": "টিউটোরিয়াল দেখুন"
    },
    "search": {
      "placeholder": "সাহায্য খুঁজুন...",
      "noResults": "\"{{query}}\"-এর জন্য কোনো ফলাফল নেই",
      "noResultsHint": "ভিন্ন কীওয়ার্ড চেষ্টা করুন বা বিভাগ ব্রাউজ করুন",
      "recent": "সাম্প্রতিক",
      "popular": "জনপ্রিয়"
    },
    "categories": {
      "getting-started": "শুরু করা",
      "features": "বৈশিষ্ট্য",
      "judaism": "ইহুদি ধর্ম",
      "platform-guides": "প্ল্যাটফর্ম গাইড",
      "account": "অ্যাকাউন্ট",
      "troubleshooting": "সমস্যা সমাধান",
      "parents": "পিতামাতাদের জন্য",
      "admin": "অ্যাডমিন গাইড",
      "developer": "ডেভেলপার API"
    },
    "faq": {
      "title": "প্রায়শই জিজ্ঞাসিত প্রশ্ন",
      "q1": "আমি কিভাবে আমার সাবস্ক্রিপশন প্ল্যান পরিবর্তন করব?",
      "a1": "আপনার বর্তমান প্ল্যান দেখতে এবং পরিবর্তন করতে সেটিংস > সাবস্ক্রিপশনে যান। আপনি যেকোনো সময় আপগ্রেড বা ডাউনগ্রেড করতে পারেন।",
      "q2": "আমি কিভাবে অফলাইনে দেখার জন্য কন্টেন্ট ডাউনলোড করব?",
      "a2": "অফলাইনে দেখার জন্য সংরক্ষণ করতে যেকোনো কন্টেন্টে ডাউনলোড আইকনে ট্যাপ করুন। ডাউনলোড শুধুমাত্র মোবাইল ডিভাইসে উপলব্ধ।",
      "q3": "কেন আমার ভিডিও চলছে না?",
      "a3": "আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন। সমস্যা থাকলে, অ্যাপ ক্যাশ সাফ করুন বা অ্যাপ পুনরায় চালু করুন।",
      "q4": "আমি কিভাবে আমার সাবস্ক্রিপশন বাতিল করব?",
      "a4": "আপনি সেটিংস > সাবস্ক্রিপশন > প্ল্যান বাতিল করুন-এর মাধ্যমে যেকোনো সময় আপনার সাবস্ক্রিপশন বাতিল করতে পারেন। আপনার বিলিং পিরিয়ড শেষ না হওয়া পর্যন্ত আপনার অ্যাক্সেস থাকবে।"
    },
    "onboarding": {
      "welcome": {
        "title": "Bayit+-এ স্বাগতম",
        "description": "বিশ্বের যেকোনো জায়গায় ইসরায়েলি বিনোদনের জন্য আপনার বাড়ি"
      },
      "liveTv": {
        "title": "লাইভ TV",
        "description": "সংবাদ, খেলাধুলা এবং বিনোদন সহ ইসরায়েলি চ্যানেল লাইভ দেখুন"
      },
      "vod": {
        "title": "অন-ডিমান্ড কন্টেন্ট",
        "description": "যেকোনো সময় সিনেমা, সিরিজ এবং ডকুমেন্টারি ব্রাউজ করুন"
      },
      "voice": {
        "title": "ভয়েস কন্ট্রোল",
        "description": "আপনার কণ্ঠ দিয়ে অ্যাপ নিয়ন্ত্রণ করতে 'Bayit' বলুন"
      },
      "profiles": {
        "title": "ফ্যামিলি প্রোফাইল",
        "description": "ব্যক্তিগত সুপারিশ সহ প্রতিটি পরিবারের সদস্যের জন্য প্রোফাইল তৈরি করুন"
      }
    }
  },
  "voice": {
    "transcribing": "ট্রান্সক্রাইব হচ্ছে...",
    "tapToStop": "রেকর্ডিং বন্ধ করতে ট্যাপ করুন",
    "pleaseWait": "অপেক্ষা করুন...",
    "transcriptionNotAvailable": "ট্রান্সক্রিপশন উপলব্ধ নেই",
    "transcriptionFailed": "ট্রান্সক্রিপশন ব্যর্থ",
    "micPermissionDenied": "মাইক্রোফোন অনুমতি প্রত্যাখ্যাত",
    "error": "শুনতে পারিনি, আবার চেষ্টা করুন"
  },
  "errors": {
    "offline": {
      "ttsMessage": "ইন্টারনেট সংযোগ নেই। আপনি এখন অফলাইন মোডে আছেন।"
    },
    "online": {
      "ttsMessage": "ইন্টারনেট সংযোগ পুনরুদ্ধার হয়েছে।"
    },
    "api": {
      "badRequest": "কিছু ভুল হয়েছে। আবার চেষ্টা করুন।",
      "unauthorized": "চালিয়ে যেতে লগইন করুন।",
      "forbidden": "এই কন্টেন্ট অ্যাক্সেস করার অনুমতি নেই।",
      "notFound": "আপনি যে কন্টেন্ট খুঁজছেন তা উপলব্ধ নেই।",
      "rateLimit": "আপনি অনেক অনুরোধ করছেন। একটু অপেক্ষা করুন।",
      "serverError": "আমাদের সার্ভারে সমস্যা হচ্ছে। পরে আবার চেষ্টা করুন।",
      "unknown": "কিছু ভুল হয়েছে। আবার চেষ্টা করুন।",
      "networkTimeout": "আমাদের সার্ভারে সংযোগ করা যাচ্ছে না। আপনার সংযোগ পরীক্ষা করুন।",
      "offlineMessage": "আপনি অফলাইনে আছেন। আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।",
      "requestFailed": "কিছু ভুল হয়েছে। আবার চেষ্টা করুন।"
    },
    "voice": {
      "permissionDenied": "ভয়েস কমান্ডের জন্য মাইক্রোফোন অ্যাক্সেস প্রয়োজন। সেটিংসে সক্রিয় করুন।",
      "recognitionFailed": "বুঝতে পারিনি। আবার চেষ্টা করুন।",
      "commandFailed": "ভয়েস কমান্ড ব্যর্থ। আবার চেষ্টা করুন।"
    },
    "widget": {
      "loadFailed": "উইজেট লোড করা যায়নি। আবার চেষ্টা করুন।"
    },
    "buttons": {
      "ok": "ঠিক আছে",
      "retry": "পুনরায় চেষ্টা",
      "cancel": "বাতিল"
    },
    "title": "ত্রুটি",
    "networkUnavailable": "নেটওয়ার্ক অনুপলব্ধ"
  },
  "player": {
    "live": "লাইভ",
    "play": "চালান",
    "pause": "বিরতি",
    "mute": "নিঃশব্দ",
    "unmute": "শব্দ চালু",
    "volume": "ভলিউম",
    "albumArt": "{{title}}-এর অ্যালবাম আর্ট",
    "seekBar": "প্লেব্যাক অগ্রগতি",
    "skipBack": "{{seconds}} সেকেন্ড পিছিয়ে যান",
    "skipForward": "30 সেকেন্ড এগিয়ে যান",
    "loadError": "স্ট্রিম লোড করতে ব্যর্থ",
    "playbackSpeed": "প্লেব্যাক গতি",
    "previousChapter": "পূর্ববর্তী অধ্যায়",
    "nextChapter": "পরবর্তী অধ্যায়",
    "skipBackward": "30 সেকেন্ড পিছিয়ে যান",
    "subscription": {
      "requiredTitle": "সাবস্ক্রিপশন প্রয়োজন",
      "requiredMessage": "পেইড সাবস্ক্রিপশন প্রয়োজন",
      "upgradeInfo": "প্রিমিয়াম কন্টেন্ট অ্যাক্সেস করতে আপনার সাবস্ক্রিপশন আপগ্রেড করুন",
      "upgrade": "এখনই আপগ্রেড করুন"
    },
    "chapters": "অধ্যায়",
    "sceneSearch": {
      "title": "সিন খুঁজুন",
      "placeholder": "একটি সিন খুঁজুন...",
      "inputLabel": "সিন সার্চ ইনপুট",
      "searching": "খুঁজছে...",
      "noResults": "কোনো সিন পাওয়া যায়নি",
      "resultsFound": "{{count}}টি সিন পাওয়া গেছে",
      "searchError": "সার্চ ব্যর্থ। আবার চেষ্টা করুন।",
      "hint": "সার্চ করতে কমপক্ষে ২টি অক্ষর টাইপ করুন",
      "voiceReceived": "খুঁজছে: {{query}}",
      "seekingTo": "{{time}}-এ যাচ্ছে",
      "previous": "পূর্ববর্তী",
      "next": "পরবর্তী",
      "result": {
        "jumpTo": "{{time}}-এ {{title}}-এ যান",
        "hint": "এই সিনে যেতে চাপুন"
      },
      "panelOpened": "সিন সার্চ প্যানেল খোলা হয়েছে",
      "navigation": "সিন সার্চ নেভিগেশন",
      "position": "ফলাফল {{current}} / {{total}}"
    }
  },
  "empty": {
    "noContent": "কোনো কন্টেন্ট নেই",
    "tryAnotherCategory": "অন্য বিভাগ নির্বাচন করুন",
    "noPodcasts": "কোনো পডকাস্ট নেই",
    "tryLater": "পরে আবার চেষ্টা করুন",
    "noResults": "কোনো ফলাফল পাওয়া যায়নি"
  },
  "content": {
    "genres": "জনরা",
    "released": "মুক্তি",
    "starring": "অভিনয়ে",
    "seasons": "সিজন",
    "ep": "পর্ব",
    "selectSeason": "সিজন নির্বাচন করুন",
    "noEpisodes": "কোনো পর্ব নেই",
    "noEpisodesAvailable": "চালানোর জন্য কোনো পর্ব নেই",
    "loadingSeries": "সিরিজের তথ্য লোড হচ্ছে...",
    "votes": "ভোট",
    "imdbRating": "IMDB রেটিং",
    "preview": "প্রিভিউ",
    "previewPlaying": "প্রিভিউ চলছে",
    "trailerPlaying": "ট্রেলার চলছে",
    "youMayAlsoLike": "আপনার পছন্দ হতে পারে",
    "availableSubtitles": "উপলব্ধ সাবটাইটেল",
    "subtitleSelected": "নির্বাচিত: {{language}}"
  },
  "audiobooks": {
    "audiobook": "অডিওবুক",
    "chapter": "অধ্যায়",
    "chapters": "অধ্যায়",
    "playChapter": "অধ্যায় চালান",
    "noChapters": "কোনো অধ্যায় নেই",
    "notFound": "অডিওবুক পাওয়া যায়নি",
    "author": "লেখক",
    "narrator": "বর্ণনাকারী",
    "duration": "সময়কাল",
    "isbn": "ISBN"
  },
  "breadcrumbs": {
    "series": "সিরিজ",
    "movie": "সিনেমা",
    "watching": "দেখছে",
    "channel": "চ্যানেল",
    "station": "স্টেশন",
    "podcast": "পডকাস্ট",
    "watchlist": "ওয়াচলিস্ট",
    "downloads": "ডাউনলোড"
  },
  "downloads": {
    "storage": "স্টোরেজ",
    "paused": "বিরতি"
  },
  "podcast": {
    "selectLanguage": "ভাষা নির্বাচন করুন",
    "switchToLanguage": "{{language}}-তে পরিবর্তন করুন",
    "premiumRequiredForTranslation": "পডকাস্ট অনুবাদের জন্য প্রিমিয়াম সাবস্ক্রিপশন প্রয়োজন",
    "player": {
      "switchingLanguage": "পরিবর্তন হচ্ছে..."
    },
    "languages": {
      "he": {
        "short": "HE",
        "full": "হিব্রু"
      },
      "en": {
        "short": "EN",
        "full": "ইংরেজি"
      },
      "es": {
        "short": "ES",
        "full": "স্প্যানিশ"
      }
    }
  },
  "watchlist": {
    "filters": {
      "continue": "দেখা চালিয়ে যান",
      "judaism": "ইহুদি ধর্ম",
      "podcasts": "পডকাস্ট",
      "radio": "রেডিও"
    },
    "watched": "দেখা হয়েছে",
    "emptyHint": "দেখা শুরু করুন এবং আইটেম এখানে দেখাবে"
  },
  "widgets": {
    "emptyPersonal": "এখনও কোনো ব্যক্তিগত উইজেট নেই",
    "emptyPersonalHint": "আপনার প্রথম ব্যক্তিগত উইজেট তৈরি করুন বা উপরে সিস্টেম উইজেট যোগ করুন",
    "itemsTotal": "মোট উইজেট",
    "systemWidgets": "সিস্টেম উইজেট",
    "systemWidgetsHint": "আপনার সংগ্রহে যোগ করতে উইজেট ব্রাউজ করুন",
    "myWidgets": "আমার ব্যক্তিগত উইজেট",
    "myWidgetsHint": "আপনার তৈরি উইজেট",
    "personalWidgets": "আমার উইজেট",
    "noSystemWidgets": "কোনো সিস্টেম উইজেট নেই",
    "added": "যোগ করা হয়েছে",
    "add": "যোগ করুন",
    "remove": "সরান",
    "show": "দেখান",
    "hidden": "লুকানো",
    "addToCollection": "আমার উইজেটে যোগ করুন",
    "removeFromCollection": "আমার উইজেট থেকে সরান",
    "contentTypes": {
      "liveChannel": "লাইভ চ্যানেল",
      "iframe": "ওয়েব কন্টেন্ট",
      "podcast": "পডকাস্ট",
      "radio": "রেডিও",
      "vod": "ভিডিও",
      "custom": "কাস্টম",
      "widget": "উইজেট"
    },
    "form": {
      "title": "উইজেট তৈরি করুন",
      "basicInfo": "মৌলিক তথ্য",
      "titlePlaceholder": "উইজেট শিরোনাম",
      "titleRequired": "উইজেট শিরোনাম প্রয়োজন",
      "descriptionPlaceholder": "বিবরণ (ঐচ্ছিক)",
      "iconPlaceholder": "আইকন ইমোজি (যেমন, 📺)",
      "content": "কন্টেন্ট",
      "fromLibrary": "লাইব্রেরি থেকে",
      "iframe": "iFrame",
      "selectContent": "কন্টেন্ট নির্বাচন করুন (চ্যানেল, পডকাস্ট, শো ইত্যাদি)",
      "iframeUrl": "iFrame URL",
      "iframeUrlRequired": "iFrame URL প্রয়োজন",
      "iframeTitle": "iFrame শিরোনাম",
      "positionSize": "অবস্থান ও আকার",
      "behavior": "আচরণ",
      "mutedByDefault": "ডিফল্টে নিঃশব্দ",
      "closable": "বন্ধযোগ্য",
      "draggable": "টানাযোগ্য",
      "widgetOrder": "উইজেট ক্রম",
      "orderPlaceholder": "ক্রম (0 = প্রথম)",
      "saveWidget": "উইজেট সংরক্ষণ করুন",
      "saving": "সংরক্ষণ হচ্ছে...",
      "cancel": "বাতিল",
      "change": "পরিবর্তন"
    },
    "intro": {
      "title": "উইজেটে স্বাগতম",
      "description": "আপনার দেখার অভিজ্ঞতা কাস্টমাইজ করতে শক্তিশালী ফ্লোটিং উইজেট আবিষ্কার করুন",
      "watchVideo": "পরিচিতি দেখুন",
      "skip": "এড়িয়ে যান",
      "dismiss": "আর দেখাবেন না",
      "videoUnavailable": "ভিডিও সাময়িকভাবে অনুপলব্ধ",
      "loadingMartyJr": "Marty Jr লোড হচ্ছে...",
      "loadingWidgets": "উইজেট পরিচিতি লোড হচ্ছে..."
    }
  },
  "trending": {
    "title": "ইসরায়েলে কী ট্রেন্ডিং",
    "noTopics": "কোনো ট্রেন্ডিং বিষয় নেই",
    "topStory": "শীর্ষ সংবাদ",
    "sources": "উৎস",
    "categories": {
      "security": "নিরাপত্তা",
      "politics": "রাজনীতি",
      "tech": "প্রযুক্তি",
      "culture": "সংস্কৃতি",
      "sports": "খেলাধুলা",
      "economy": "অর্থনীতি",
      "entertainment": "বিনোদন",
      "weather": "আবহাওয়া",
      "health": "স্বাস্থ্য",
      "general": "সাধারণ"
    }
  },
  "cultures": {
    "title": "আপনার সংস্কৃতি নির্বাচন করুন",
    "select": "সংস্কৃতি নির্বাচন করুন",
    "selectCulture": "আপনার সংস্কৃতি বেছে নিন",
    "selectCultureDescription": "আপনার অভিজ্ঞতা ব্যক্তিগত করতে আপনার সাংস্কৃতিক সম্প্রদায় নির্বাচন করুন",
    "changeCulture": "সংস্কৃতি পরিবর্তন করুন",
    "israeli": {
      "name": "ইসরায়েলি",
      "description": "ইসরায়েলি প্রবাসী সম্প্রদায়ের কন্টেন্ট"
    },
    "chinese": {
      "name": "চীনা",
      "description": "চীনা সম্প্রদায়ের কন্টেন্ট"
    },
    "japanese": {
      "name": "জাপানি",
      "description": "জাপানি সম্প্রদায়ের কন্টেন্ট"
    },
    "korean": {
      "name": "কোরিয়ান",
      "description": "কোরিয়ান সম্প্রদায়ের কন্টেন্ট"
    },
    "indian": {
      "name": "ভারতীয়",
      "description": "ভারতীয় সম্প্রদায়ের কন্টেন্ট"
    }
  },
  "cultureTrending": {
    "whatsHotIn": "{{location}}-এ কী হট",
    "noTopics": "কোনো ট্রেন্ডিং বিষয় নেই",
    "sources": "উৎস",
    "categories": {
      "security": "নিরাপত্তা",
      "politics": "রাজনীতি",
      "tech": "প্রযুক্তি",
      "technology": "প্রযুক্তি",
      "culture": "সংস্কৃতি",
      "sports": "খেলাধুলা",
      "economy": "অর্থনীতি",
      "finance": "অর্থ",
      "entertainment": "বিনোদন",
      "weather": "আবহাওয়া",
      "health": "স্বাস্থ্য",
      "food": "খাবার",
      "fashion": "ফ্যাশন",
      "travel": "ভ্রমণ",
      "history": "ইতিহাস",
      "expat": "প্রবাসী জীবন",
      "general": "সাধারণ"
    }
  },
  "cultureCities": {
    "connectionTo": "{{city}} সংযোগ",
    "explore": "{{city}} অন্বেষণ করুন",
    "noContent": "এই শহরের জন্য কোনো কন্টেন্ট নেই",
    "categories": {
      "all": "সব",
      "history": "ইতিহাস",
      "culture": "সংস্কৃতি",
      "finance": "অর্থ",
      "tech": "প্রযুক্তি",
      "food": "খাবার",
      "expat": "প্রবাসী জীবন",
      "news": "সংবাদ",
      "entertainment": "বিনোদন"
    }
  },
  "clock": {
    "israel": "ইসরায়েল",
    "local": "স্থানীয়",
    "shabbatShalom": "শাব্বাত শালোম!",
    "erevShabbat": "এরেভ শাব্বাত",
    "candleLighting": "মোমবাতি জ্বালানো",
    "parasha": "পরশা"
  },
  "ritual": {
    "title": "সকালের রীতি",
    "greeting": "সুপ্রভাত!",
    "israelUpdate": "ইসরায়েলে বিকেল, সংবাদ চলমান উন্নয়নের রিপোর্ট করছে",
    "recommendation": "আমরা সকালের সংবাদ দিয়ে শুরু করে তারপর রেডিওতে যাওয়ার পরামর্শ দিই",
    "preparingRitual": "আপনার সকালের রীতি প্রস্তুত হচ্ছে...",
    "israelTime": "ইসরায়েল সময়",
    "day": "দিন",
    "letsStart": "শুরু করা যাক",
    "skipToday": "আজ এড়িয়ে যান",
    "finish": "শেষ",
    "noContentNow": "এখন কোনো কন্টেন্ট নেই",
    "typeLive": "লাইভ",
    "typeRadio": "রেডিও",
    "typeVideo": "ভিডিও"
  }
};

deepMerge(bn, translations);
fs.writeFileSync('bn.json', JSON.stringify(bn, null, 2) + '\n');
console.log('Part 3 complete - help, voice, errors, player, content, cultures added');
