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
  "watchParty": {
    "title": "ওয়াচ পার্টি",
    "create": "পার্টি তৈরি করুন",
    "join": "পার্টিতে যোগ দিন",
    "active": "পার্টি সক্রিয়",
    "createTitle": "ওয়াচ পার্টি তৈরি করুন",
    "joinTitle": "পার্টিতে যোগ দিন",
    "enterCode": "রুম কোড লিখুন",
    "roomCode": "রুম কোড",
    "roomCodeHint": "পার্টিতে যোগ দিতে ৮-অক্ষরের রুম কোড লিখুন",
    "copyCode": "কোড কপি করুন",
    "codeCopied": "কোড কপি হয়েছে!",
    "participants": "অংশগ্রহণকারী",
    "host": "হোস্ট",
    "you": "আপনি",
    "leave": "পার্টি ছাড়ুন",
    "end": "পার্টি শেষ করুন",
    "chat": "চ্যাট",
    "sendMessage": "বার্তা পাঠান",
    "typeMessage": "একটি বার্তা টাইপ করুন...",
    "synced": "সিঙ্ক হয়েছে",
    "syncing": "সিঙ্ক হচ্ছে...",
    "hostPaused": "হোস্ট বিরতি দিয়েছে",
    "userJoined": "{{name}} যোগ দিয়েছে",
    "userLeft": "{{name}} চলে গেছে",
    "partyEnded": "পার্টি শেষ হয়েছে",
    "connecting": "সংযোগ হচ্ছে...",
    "options": {
      "chatEnabled": "চ্যাট সক্রিয়",
      "syncPlayback": "প্লেব্যাক সিঙ্ক"
    },
    "errors": {
      "invalidCode": "অবৈধ কোড",
      "partyFull": "পার্টি পূর্ণ",
      "partyEnded": "পার্টি শেষ হয়েছে",
      "connectionError": "সংযোগ ত্রুটি",
      "createFailed": "পার্টি তৈরি ব্যর্থ",
      "joinFailed": "পার্টিতে যোগ দিতে ব্যর্থ"
    },
    "audio": {
      "mute": "নিঃশব্দ",
      "unmute": "শব্দ চালু",
      "speaking": "বলছে",
      "connecting": "অডিওতে সংযোগ হচ্ছে...",
      "noAudio": "অডিও উপলব্ধ নেই",
      "muteHint": "আপনার মাইক্রোফোন নিঃশব্দ করে",
      "unmuteHint": "কথা বলতে আপনার মাইক্রোফোন চালু করে"
    },
    "textOnlyMode": "শুধুমাত্র টেক্সট চ্যাট",
    "endParty": "পার্টি শেষ করুন",
    "toggleEmoji": "ইমোজি পিকার টগল",
    "toggleEmojiHint": "প্রতিক্রিয়ার জন্য ইমোজি কুইক পিকার খোলে",
    "sendEmoji": "{{emoji}} পাঠান",
    "sendEmojiHint": "চ্যাটে ইমোজি প্রতিক্রিয়া পাঠায়",
    "emojiPicker": "ইমোজি পিকার",
    "chatInput": "চ্যাট বার্তা ইনপুট",
    "chatInputHint": "পার্টি চ্যাটে পাঠাতে একটি বার্তা টাইপ করুন",
    "sendMessageHint": "আপনার বার্তা পার্টি চ্যাটে পাঠায়",
    "copyCodeHint": "ক্লিপবোর্ডে রুম কোড কপি করে",
    "share": "শেয়ার",
    "shareHint": "পার্টি লিঙ্ক শেয়ার বা কোড কপি করুন",
    "copied": "কপি হয়েছে!",
    "endPartyHint": "সব অংশগ্রহণকারীদের জন্য পার্টি শেষ করে",
    "leaveParty": "পার্টি ছাড়ুন",
    "leavePartyHint": "শেষ না করে পার্টি ছাড়ে",
    "buttonHint": "ওয়াচ পার্টি তৈরি বা যোগ দেওয়ার মেনু খোলে",
    "createHint": "নতুন ওয়াচ পার্টি তৈরি করে",
    "joinHint": "কোড দিয়ে বিদ্যমান ওয়াচ পার্টিতে যোগ দেয়",
    "emojiPickerHint": "কুইক ইমোজি প্রতিক্রিয়া দেখায়",
    "chatEnabledHint": "অংশগ্রহণকারীদের জন্য চ্যাট সক্রিয় করে",
    "syncPlaybackHint": "হোস্টের সাথে প্লেব্যাক সিঙ্ক রাখে",
    "createPartyHint": "নির্বাচিত অপশন দিয়ে পার্টি তৈরি করে",
    "joinPartyHint": "প্রবেশকৃত কোড দিয়ে পার্টিতে যোগ দেয়",
    "closePanelHint": "ওয়াচ পার্টি প্যানেল বন্ধ করে",
    "cancelHint": "বাতিল করে এবং ডায়ালগ বন্ধ করে",
    "viewPartyHint": "ওয়াচ পার্টি প্যানেল খোলে",
    "panel": "ওয়াচ পার্টি প্যানেল"
  },
  "footer": {
    "location": "নিউ ইয়র্ক, USA",
    "links": {
      "home": "হোম",
      "liveTV": "লাইভ TV",
      "vod": "সিনেমা ও সিরিজ",
      "radio": "রেডিও",
      "podcasts": "পডকাস্ট",
      "judaism": "ইহুদি ধর্ম",
      "profile": "আমার প্রোফাইল",
      "favorites": "প্রিয়",
      "watchlist": "ওয়াচলিস্ট",
      "subscribe": "সাবস্ক্রাইব",
      "downloads": "ডাউনলোড",
      "help": "সাহায্য কেন্দ্র",
      "faq": "FAQ",
      "contact": "যোগাযোগ করুন",
      "feedback": "ফিডব্যাক",
      "terms": "সেবার শর্তাবলী",
      "privacy": "গোপনীয়তা নীতি",
      "cookies": "কুকি নীতি",
      "licenses": "লাইসেন্স"
    },
    "newsletter": {
      "title": "আপডেট থাকুন",
      "description": "সর্বশেষ আপডেট এবং এক্সক্লুসিভ কন্টেন্টের জন্য আমাদের নিউজলেটারে সাবস্ক্রাইব করুন।",
      "placeholder": "আপনার ইমেইল লিখুন",
      "success": "সাবস্ক্রাইব করার জন্য ধন্যবাদ!"
    },
    "apps": {
      "title": "অ্যাপ পান",
      "downloadOn": "ডাউনলোড করুন",
      "getItOn": "পান",
      "appStore": "App Store",
      "googlePlay": "Google Play"
    },
    "social": {
      "facebook": "Facebook",
      "twitter": "Twitter",
      "instagram": "Instagram",
      "youtube": "YouTube"
    },
    "privacy": "গোপনীয়তা নীতি",
    "sitemap": "সাইটম্যাপ",
    "accessibility": "অ্যাক্সেসিবিলিটি",
    "navigation": "নেভিগেশন",
    "liveTV": "লাইভ TV",
    "moviesAndSeries": "সিনেমা ও সিরিজ",
    "radioStations": "রেডিও স্টেশন",
    "myProfile": "আমার প্রোফাইল",
    "subscriptions": "সাবস্ক্রিপশন",
    "helpAndSupport": "সাহায্য ও সাপোর্ট",
    "termsOfUse": "ব্যবহারের শর্তাবলী",
    "privacyPolicy": "গোপনীয়তা নীতি",
    "contactUs": "যোগাযোগ করুন"
  },
  "chapters": {
    "title": "অধ্যায়",
    "noChapters": "কোনো অধ্যায় নেই",
    "generating": "অধ্যায় তৈরি হচ্ছে...",
    "jumpTo": "যান",
    "current": "এখন",
    "categories": {
      "intro": "ভূমিকা",
      "news": "সংবাদ",
      "security": "নিরাপত্তা",
      "politics": "রাজনীতি",
      "economy": "অর্থনীতি",
      "sports": "খেলাধুলা",
      "weather": "আবহাওয়া",
      "culture": "সংস্কৃতি",
      "conclusion": "উপসংহার"
    }
  },
  "placeholder": {
    "email": "your@email.com",
    "password": "••••••••",
    "pin": "••••",
    "dateRange": {
      "from": "থেকে (YYYY-MM-DD)",
      "to": "পর্যন্ত (YYYY-MM-DD)"
    },
    "amount": {
      "min": "সর্বনিম্ন",
      "max": "সর্বোচ্চ",
      "price": "0.00"
    },
    "chatMessage": "এখানে টাইপ করুন...",
    "deepLink": "bayitplus://content/123",
    "scheduleDateTime": "YYYY-MM-DDTHH:mm",
    "roomCode": "ABCD1234",
    "time": {
      "start": "08:00",
      "end": "10:00"
    },
    "filter": {
      "userId": "ইউজার ID লিখুন"
    },
    "datetime": "YYYY-MM-DDTHH:mm",
    "number": "0",
    "chat": "আপনার বার্তা টাইপ করুন..."
  },
  "components": {
    "select": {
      "default": "নির্বাচন করুন..."
    }
  },
  "profiles": {
    "addProfile": "প্রোফাইল যোগ করুন",
    "enterPin": "PIN লিখুন",
    "selectError": "প্রোফাইল নির্বাচনে ত্রুটি",
    "wrongPin": "ভুল PIN",
    "loading": "প্রোফাইল লোড হচ্ছে...",
    "manage": "প্রোফাইল পরিচালনা করুন",
    "whoIsWatching": "কে দেখছে?",
    "manageProfiles": "প্রোফাইল পরিচালনা করুন"
  },
  "watch": {
    "notFound": "কন্টেন্ট পাওয়া যায়নি",
    "backToHome": "হোমে ফিরে যান",
    "episodes": "পর্ব",
    "addToList": "তালিকায় যোগ করুন",
    "like": "পছন্দ",
    "share": "শেয়ার",
    "cast": "কাস্ট",
    "episodesList": "পর্ব",
    "schedule": "সময়সূচী",
    "now": "এখন",
    "related": "সম্পর্কিত কন্টেন্ট",
    "deleteEpisode": "পর্ব মুছুন",
    "confirmDeleteEpisode": "এই পর্ব মুছবেন?"
  },
  "live": {
    "title": "লাইভ TV",
    "next": "পরবর্তী:",
    "noChannels": "কোনো চ্যানেল নেই",
    "tryLater": "পরে আবার চেষ্টা করুন",
    "categories": {
      "all": "সব",
      "news": "সংবাদ",
      "entertainment": "বিনোদন",
      "sports": "খেলাধুলা",
      "kids": "শিশু",
      "music": "সংগীত"
    }
  },
  "judaism": {
    "emptyHint": "অন্য বিভাগ নির্বাচন করুন",
    "dashboard": "আপনার ইহুদি ড্যাশবোর্ড",
    "categories": {
      "news": "ইহুদি সংবাদ",
      "community": "সম্প্রদায়"
    },
    "shabbat": {
      "shabbatMode": "শাব্বাত মোড",
      "endsIn": "শাব্বাত শেষ হবে",
      "parashat": "পরশত",
      "friday": "শুক্রবার",
      "saturday": "শনিবার",
      "noData": "শাব্বাত সময় লোড করা যায়নি"
    },
    "erevShabbat": {
      "title": "এরেভ শাব্বাত",
      "prepareFor": "শাব্বাতের জন্য প্রস্তুতি নিন",
      "inTime": "{{time}}-এ",
      "featuredContent": "শাব্বাত কন্টেন্ট",
      "noContent": "শাব্বাত কন্টেন্ট শীঘ্রই আসছে!",
      "shabbatShalom": "শাব্বাত শালোম!",
      "timeUntil": "শাব্বাত পর্যন্ত সময়",
      "shabbatSongs": "শাব্বাত গান",
      "parashaStudy": "পরশা",
      "shabbatRecipes": "রেসিপি",
      "prayers": "প্রার্থনা"
    }
  },
  "children": {
    "emptyHint": "অন্য বিভাগ চেষ্টা করুন",
    "exitDescription": "বের হতে পিতামাতার কোড লিখুন",
    "parentCode": "পিতামাতার কোড",
    "confirm": "নিশ্চিত করুন",
    "wrongCode": "ভুল কোড",
    "noContent": "কোনো কন্টেন্ট নেই",
    "tryAnotherCategory": "অন্য বিভাগ নির্বাচন করুন",
    "categories": {
      "hebrew": "হিব্রু"
    },
    "ageRatings": {
      "3": "বয়স ৩+",
      "5": "বয়স ৫+",
      "7": "বয়স ৭+",
      "10": "বয়স ১০+",
      "12": "বয়স ১২+"
    },
    "moderation": {
      "pending": "পর্যালোচনা মুলতুবি",
      "approved": "অনুমোদিত",
      "rejected": "প্রত্যাখ্যাত"
    },
    "admin": {
      "stats": "শিশু কন্টেন্ট ম্যানেজার",
      "seedContent": "কন্টেন্ট সিড করুন",
      "importArchive": "Archive.org ইমপোর্ট করুন",
      "syncPodcasts": "পডকাস্ট সিঙ্ক করুন",
      "syncYouTube": "YouTube সিঙ্ক করুন",
      "tagVod": "VOD ট্যাগ করুন",
      "pendingModeration": "মুলতুবি মডারেশন"
    }
  },
  "youngsters": {
    "title": "তরুণ",
    "items": "আইটেম",
    "empty": "কোনো কন্টেন্ট নেই",
    "emptyHint": "অন্য বিভাগ চেষ্টা করুন",
    "exitYoungstersMode": "তরুণ মোড থেকে বের হন",
    "exitDescription": "বের হতে পিতামাতার কোড লিখুন",
    "parentCode": "পিতামাতার কোড",
    "confirm": "নিশ্চিত করুন",
    "wrongCode": "ভুল কোড",
    "noContent": "কোনো কন্টেন্ট নেই",
    "tryAnotherCategory": "অন্য বিভাগ নির্বাচন করুন",
    "categories": {
      "all": "সব",
      "trending": "ট্রেন্ডিং",
      "news": "সংবাদ",
      "culture": "সংস্কৃতি",
      "educational": "শিক্ষামূলক",
      "music": "সংগীত",
      "entertainment": "বিনোদন",
      "sports": "খেলাধুলা",
      "tech": "প্রযুক্তি",
      "judaism": "ইহুদি ধর্ম"
    },
    "ageGroups": {
      "middle-school": "মিডল স্কুল (১২-১৪)",
      "high-school": "হাই স্কুল (১৫-১৭)"
    },
    "moderation": {
      "pending": "পর্যালোচনা মুলতুবি",
      "approved": "অনুমোদিত",
      "rejected": "প্রত্যাখ্যাত"
    },
    "admin": {
      "stats": "তরুণ কন্টেন্ট ম্যানেজার",
      "seedContent": "কন্টেন্ট সিড করুন",
      "importArchive": "Archive.org ইমপোর্ট করুন",
      "syncPodcasts": "পডকাস্ট সিঙ্ক করুন",
      "syncYouTube": "YouTube সিঙ্ক করুন",
      "tagVod": "VOD ট্যাগ করুন",
      "pendingModeration": "মুলতুবি মডারেশন"
    }
  },
  "chatbot": {
    "openChat": "চ্যাট খুলুন",
    "welcome": "হ্যালো! আমি Bayit+ স্মার্ট সহায়ক। আজ আমি আপনাকে কীভাবে সাহায্য করতে পারি? মাইক্রোফোনে ক্লিক করে বলুন, বা একটি বার্তা টাইপ করুন।",
    "recording": "রেকর্ডিং হচ্ছে... আবার ক্লিক করুন থামাতে",
    "transcribing": "ট্রান্সক্রাইব হচ্ছে...",
    "stopRecording": "রেকর্ডিং বন্ধ করুন",
    "startRecording": "ভয়েস রেকর্ডিং শুরু করুন",
    "recommendations": "এখানে কিছু সুপারিশ:",
    "showMultipleSuccess": "{{count}}টি কন্টেন্ট আইটেম উইজেটে দেখানো হচ্ছে",
    "showMultipleNotFound": "অনুরোধকৃত কন্টেন্ট খুঁজে পাওয়া যায়নি। ভিন্ন নাম চেষ্টা করুন।",
    "resolvingContent": "আপনার কন্টেন্ট খোঁজা হচ্ছে...",
    "errors": {
      "micPermission": "মাইক্রোফোন অ্যাক্সেস করা যায়নি। আপনার ব্রাউজারে মাইক্রোফোন অনুমতি পরীক্ষা করুন।",
      "transcribeFailed": "রেকর্ডিং ট্রান্সক্রাইব করা যায়নি। আবার চেষ্টা করুন।",
      "general": "দুঃখিত, কিছু ভুল হয়েছে। আবার চেষ্টা করুন।"
    },
    "suggestions": {
      "whatToWatch": "আজ কী দেখব?",
      "israeliMovies": "সুপারিশকৃত ইসরায়েলি সিনেমা",
      "whatsOnNow": "এখন কী চলছে?",
      "popularPodcasts": "জনপ্রিয় পডকাস্ট"
    },
    "voiceCommands": {
      "showChannels": "চ্যানেল দেখান...",
      "playChess": "সাথে দাবা খেলা শুরু করুন...",
      "multiContent": "পাশাপাশি দেখান..."
    }
  },
  "chat": {
    "title": "Bayit+ সহায়ক",
    "greeting": "হ্যালো! আমি Bayit+ স্মার্ট সহায়ক। আজ আমি আপনাকে কীভাবে সাহায্য করতে পারি? মাইক্রোফোনে ক্লিক করে বলুন, বা একটি বার্তা টাইপ করুন।"
  },
  "subtitles": {
    "nikud": "নিকুদ",
    "selection": "নির্বাচন",
    "translation": "অনুবাদ",
    "translating": "অনুবাদ হচ্ছে...",
    "close": "বন্ধ করুন",
    "unavailable": "অনুবাদ উপলব্ধ নেই",
    "off": "বন্ধ",
    "none": "কোনোটি নয়",
    "autoGenerated": "স্বয়ংক্রিয়-তৈরি",
    "selectLanguage": "সাবটাইটেল ভাষা নির্বাচন করুন",
    "liveTranslate": "লাইভ অনুবাদ",
    "translateTo": "অনুবাদ করুন",
    "downloadMore": "আরও সাবটাইটেল ডাউনলোড করুন...",
    "downloading": "OpenSubtitles-এ খোঁজা হচ্ছে...",
    "opensubtitlesSource": "OpenSubtitles.com থেকে",
    "downloadSuccess": "{{count}}টি সাবটাইটেল ডাউনলোড হয়েছে",
    "noSubtitlesFound": "এই কন্টেন্টের জন্য কোনো সাবটাইটেল পাওয়া যায়নি"
  },
  "dubbing": {
    "title": "লাইভ ডাবিং",
    "enabled": "লাইভ ডাবিং সক্রিয়",
    "selectLanguage": "ভাষা নির্বাচন করুন",
    "originalAudio": "মূল অডিও",
    "dubbedAudio": "ডাব করা অডিও",
    "selectVoice": "ভয়েস নির্বাচন করুন",
    "adjustVolume": "ভলিউম সামঞ্জস্য করুন",
    "tapToSelect": "এই ভাষা নির্বাচন করতে ট্যাপ করুন",
    "languages": {
      "en": "English",
      "es": "Español",
      "he": "עברית",
      "ar": "العربية",
      "ru": "Русский",
      "fr": "Français",
      "de": "Deutsch"
    },
    "onboarding": {
      "title": "লাইভ ডাবিং পরিচয়",
      "description": "আপনার ভাষায় লাইভ কন্টেন্ট অভিজ্ঞতা করুন। আমাদের AI দেখার সময় রিয়েল-টাইমে অডিও অনুবাদ এবং রিপ্লে করে।",
      "feature1": "৭টি ভাষা সমর্থিত",
      "feature2": "রিয়েল-টাইম প্রক্রিয়াকরণ",
      "feature3": "অডিও ব্যালেন্স সামঞ্জস্য করুন",
      "tryNow": "এখনই চেষ্টা করুন",
      "later": "পরে হবে"
    },
    "consent": {
      "title": "অডিও প্রক্রিয়াকরণ সম্মতি",
      "message": "লাইভ ডাবিং AI পরিষেবা ব্যবহার করে রিয়েল-টাইমে আপনার অডিও প্রক্রিয়া করে। অডিও শুধুমাত্র অনুবাদের জন্য প্রক্রিয়া করা হয় এবং স্থায়ীভাবে সংরক্ষিত হয় না।",
      "accept": "আমি সম্মত",
      "decline": "না ধন্যবাদ"
    },
    "errors": {
      "connectionFailed": "সংযোগ ব্যর্থ",
      "connectionFailedMessage": "ডাবিং পরিষেবায় সংযোগ করা যায়নি",
      "connectionFailedAction": "আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন এবং আবার চেষ্টা করুন",
      "notAuthenticated": "প্রমাণীকৃত নয়",
      "notAuthenticatedMessage": "আবার সাইন ইন করুন",
      "notAuthenticatedAction": "লাইভ ডাবিং ব্যবহার করতে সাইন ইন করুন",
      "premiumRequired": "প্রিমিয়াম বৈশিষ্ট্য",
      "premiumRequiredMessage": "লাইভ ডাবিংয়ের জন্য প্রিমিয়াম সাবস্ক্রিপশন প্রয়োজন",
      "premiumRequiredAction": "এই বৈশিষ্ট্য অ্যাক্সেস করতে প্রিমিয়ামে আপগ্রেড করুন",
      "channelUnavailable": "অনুপলব্ধ",
      "channelUnavailableMessage": "এই চ্যানেলের জন্য ডাবিং উপলব্ধ নেই",
      "audioCaptureError": "মাইক্রোফোন ত্রুটি",
      "audioCaptureErrorMessage": "আপনার মাইক্রোফোন অ্যাক্সেস করা যায়নি",
      "sttServiceError": "স্পিচ রিকগনিশন ত্রুটি",
      "sttServiceErrorMessage": "স্পিচ চিনতে ব্যর্থ",
      "ttsServiceError": "ডাবিং ত্রুটি",
      "ttsServiceErrorMessage": "ডাব করা অডিও তৈরি করতে ব্যর্থ",
      "translationTimeout": "অনুবাদ টাইমআউট",
      "translationTimeoutMessage": "অনুবাদে অনেক সময় লাগছে, আবার চেষ্টা করা হচ্ছে",
      "websocketClosed": "সংযোগ বিচ্ছিন্ন",
      "websocketClosedMessage": "ডাবিং সংযোগ বন্ধ হয়ে গেছে",
      "rateLimitExceeded": "অনেক চেষ্টা",
      "rateLimitExceededMessage": "আবার চেষ্টা করার আগে অপেক্ষা করুন",
      "sessionTimeout": "সেশন মেয়াদ শেষ",
      "sessionTimeoutMessage": "আপনার ডাবিং সেশনের মেয়াদ শেষ হয়েছে"
    }
  },
  "video": {
    "watchTrailer": "ট্রেলার দেখুন",
    "closeTrailer": "ট্রেলার বন্ধ করুন",
    "deleteConfirm": "এই পর্ব মুছবেন?"
  }
};

deepMerge(bn, translations);
fs.writeFileSync('bn.json', JSON.stringify(bn, null, 2) + '\n');
console.log('Part 4 complete - watchParty, footer, chapters, profiles, watch, live, judaism, children, youngsters, chatbot, subtitles, dubbing, video added');
