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
  "chess": {
    "title": "দাবা",
    "welcome": "দাবায় স্বাগতম",
    "subtitle": "বিশ্বজুড়ে বন্ধু এবং পরিবারের সাথে দাবা খেলুন",
    "createGame": "নতুন গেম তৈরি করুন",
    "joinGame": "গেমে যোগ দিন",
    "gameCode": "গেম কোড",
    "enterGameCode": "গেম কোড লিখুন",
    "invalidGameCode": "অবৈধ গেম কোড। ৬ অক্ষর হতে হবে।",
    "joinFailed": "গেমে যোগ দিতে ব্যর্থ",
    "join": "যোগ দিন",
    "create": "তৈরি করুন",
    "chooseColor": "আপনার রঙ বেছে নিন",
    "white": "সাদা",
    "black": "কালো",
    "chatPlaceholder": "একটি বার্তা টাইপ করুন... (পরামর্শের জন্য @bot)",
    "botHint": "আমাদের AI সহায়ক থেকে দাবা পরামর্শ পেতে আপনার বার্তায় @bot ট্যাগ করুন",
    "bot": "দাবা সহায়ক",
    "mute": "নিঃশব্দ",
    "unmute": "শব্দ চালু",
    "speaking": "অংশগ্রহণকারী",
    "resign": "পরাজয় স্বীকার",
    "offerDraw": "ড্র প্রস্তাব করুন",
    "newGame": "নতুন গেম",
    "checkmate": "চেকমেট!",
    "stalemate": "স্টেলমেট",
    "draw": "ড্র",
    "resigned": "গেম ছেড়ে দেওয়া হয়েছে",
    "reconnecting": "পুনঃসংযোগ হচ্ছে...",
    "moveHistory": "চাল ইতিহাস",
    "noMoves": "এখনও কোনো চাল নেই",
    "showHints": "গাইড হিন্ট দেখান",
    "yourTurn": "আপনার পালা",
    "opponentTurn": "প্রতিপক্ষের পালা",
    "waitingForOpponent": "প্রতিপক্ষের জন্য অপেক্ষা করা হচ্ছে...",
    "gameOver": "গেম শেষ",
    "sendingInvite": "{{name}}-কে গেম আমন্ত্রণ পাঠানো হচ্ছে...",
    "inviteSent": "{{name}}-কে গেম আমন্ত্রণ পাঠানো হয়েছে! গেম কোড: {{code}}",
    "inviteFailed": "সেই ব্যবহারকারী পাওয়া যায়নি। নাম পরীক্ষা করে আবার চেষ্টা করুন।",
    "inviteReceived": "{{name}} আপনাকে দাবা খেলার আমন্ত্রণ জানিয়েছে!",
    "joinInvite": "গেমে যোগ দিন",
    "challenge": "চ্যালেঞ্জ",
    "playedAsWhite": "সাদা হিসাবে খেলেছে",
    "playedAsBlack": "কালো হিসাবে খেলেছে",
    "gameMode": "গেম মোড",
    "playVsFriend": "বন্ধুর সাথে খেলুন",
    "playVsBot": "বটের সাথে খেলুন",
    "difficulty": "কঠিনতা",
    "easy": "সহজ",
    "medium": "মাঝারি",
    "hard": "কঠিন",
    "chessBot": "দাবা বট"
  },
  "friends": {
    "title": "বন্ধু ও প্রতিপক্ষ",
    "subtitle": "খেলোয়াড়দের সাথে সংযোগ করুন এবং বন্ধুদের চ্যালেঞ্জ করুন",
    "myFriends": "আমার বন্ধুরা",
    "requests": "অনুরোধ",
    "findPlayers": "খেলোয়াড় খুঁজুন",
    "friendsLabel": "বন্ধু",
    "pendingLabel": "মুলতুবি",
    "add": "বন্ধু যোগ করুন",
    "remove": "সরান",
    "accept": "গ্রহণ করুন",
    "reject": "প্রত্যাখ্যান করুন",
    "cancel": "বাতিল",
    "noFriends": "এখনও কোনো বন্ধু নেই",
    "noFriendsDesc": "খেলোয়াড়দের খুঁজুন এবং বন্ধু অনুরোধ পাঠান",
    "lastGame": "শেষ গেম: {{time}}",
    "friendsSince": "{{date}} থেকে বন্ধু",
    "incomingRequests": "আগত অনুরোধ",
    "outgoingRequests": "বহির্গামী অনুরোধ",
    "noIncoming": "কোনো আগত অনুরোধ নেই",
    "noOutgoing": "কোনো বহির্গামী অনুরোধ নেই",
    "sentAt": "{{time}} পাঠানো হয়েছে",
    "searchPlaceholder": "নাম দিয়ে খুঁজুন...",
    "noResults": "কোনো খেলোয়াড় পাওয়া যায়নি",
    "noResultsDesc": "ভিন্ন নাম দিয়ে খুঁজুন",
    "requestSent": "বন্ধু অনুরোধ পাঠানো হয়েছে!",
    "requestAccepted": "বন্ধু অনুরোধ গৃহীত!",
    "requestRejected": "বন্ধু অনুরোধ প্রত্যাখ্যাত",
    "requestCancelled": "বন্ধু অনুরোধ বাতিল",
    "friendRemoved": "বন্ধু সরানো হয়েছে",
    "searchFailed": "ব্যবহারকারী খুঁজতে ব্যর্থ",
    "requestFailed": "অনুরোধ পাঠাতে ব্যর্থ",
    "acceptFailed": "অনুরোধ গ্রহণ করতে ব্যর্থ",
    "rejectFailed": "অনুরোধ প্রত্যাখ্যান করতে ব্যর্থ",
    "cancelFailed": "অনুরোধ বাতিল করতে ব্যর্থ",
    "removeFailed": "বন্ধু সরাতে ব্যর্থ",
    "friendsCount": "{{count}} বন্ধু",
    "gamesCount": "{{count}} গেম",
    "alreadyFriends": "বন্ধু"
  },
  "stats": {
    "statistics": "পরিসংখ্যান",
    "matchHistory": "ম্যাচ ইতিহাস",
    "headToHead": "মুখোমুখি",
    "gamesPlayed": "খেলা গেম",
    "wins": "জয়",
    "losses": "হার",
    "draws": "ড্র",
    "winRate": "জয়ের হার",
    "rating": "রেটিং",
    "peakRating": "সর্বোচ্চ রেটিং",
    "peak": "সর্বোচ্চ",
    "winStreak": "জয়ের ধারা",
    "currentStreak": "বর্তমান ধারা",
    "bestStreak": "সেরা ধারা",
    "performance": "কর্মক্ষমতা",
    "achievements": "অর্জন",
    "currentRating": "বর্তমান রেটিং",
    "totalGames": "মোট গেম",
    "noGames": "এখনও কোনো গেম খেলা হয়নি",
    "moves": "চাল",
    "won": "জিতেছে",
    "lost": "হেরেছে",
    "draw": "ড্র",
    "overall": "সামগ্রিক রেকর্ড",
    "yourWins": "আপনার জয়",
    "theirWins": "তাদের জয়",
    "totalGamesPlayed": "মোট: {{count}} গেম",
    "recentGames": "সাম্প্রতিক গেম"
  },
  "support": {
    "categories": {
      "title": "ডকুমেন্টেশন ব্রাউজ করুন",
      "loading": "ডকুমেন্টেশন লোড হচ্ছে...",
      "loadError": "বিভাগ লোড করতে ব্যর্থ",
      "articleCount": "{{count}}টি নিবন্ধ",
      "gettingStarted": "শুরু করা",
      "features": "বৈশিষ্ট্য",
      "troubleshooting": "সমস্যা সমাধান",
      "account": "অ্যাকাউন্ট"
    },
    "docs": {
      "loading": "ডকুমেন্ট লোড হচ্ছে...",
      "loadError": "ডকুমেন্ট লোড করতে ব্যর্থ",
      "backToList": "ডকুমেন্টেশনে ফিরে যান"
    },
    "search": {
      "placeholder": "ডকুমেন্টেশন খুঁজুন...",
      "noResults": "কোনো ফলাফল পাওয়া যায়নি"
    },
    "faq": {
      "title": "প্রায়শই জিজ্ঞাসিত প্রশ্ন",
      "loading": "FAQ লোড হচ্ছে...",
      "loadError": "FAQ লোড করতে ব্যর্থ",
      "empty": "এই বিভাগে কোনো FAQ আইটেম নেই",
      "categories": {
        "all": "সব বিষয়",
        "general": "সাধারণ",
        "billing": "বিলিং",
        "technical": "প্রযুক্তিগত",
        "features": "বৈশিষ্ট্য"
      }
    },
    "videos": {
      "title": "টিউটোরিয়াল ভিডিও",
      "subtitle": "Bayit+ বৈশিষ্ট্য ব্যবহার শিখুন",
      "widgetsIntro": "উইজেট দিয়ে শুরু করা",
      "widgetsDescription": "ফ্লোটিং উইজেট তৈরি, কাস্টমাইজ এবং পরিচালনা শিখুন"
    },
    "contact": {
      "voiceTitle": "ভয়েস সাপোর্ট",
      "voiceDescription": "আমাদের AI সহায়কের সাথে ভয়েস কথোপকথন শুরু করতে অবতার বোতামে ক্লিক করুন বা \"Jarvis\" বলুন।",
      "ticketTitle": "সাপোর্ট টিকেট তৈরি করুন",
      "ticketDescription": "মানবিক সহায়তা দরকার? সাপোর্ট টিকেট তৈরি করুন এবং আমাদের দল ২৪ ঘণ্টার মধ্যে প্রতিক্রিয়া জানাবে।",
      "createTicket": "টিকেট তৈরি করুন",
      "emailTitle": "ইমেইল সাপোর্ট",
      "emailDescription": "ইমেইল পছন্দ করেন? যেকোনো প্রশ্ন বা উদ্বেগের জন্য support@bayit.tv-তে যোগাযোগ করুন।"
    },
    "ticket": {
      "title": "সাপোর্ট টিকেট তৈরি করুন",
      "subject": "বিষয়",
      "subjectPlaceholder": "আপনার সমস্যার সংক্ষিপ্ত বিবরণ",
      "message": "বার্তা",
      "messagePlaceholder": "আপনার সমস্যা বিস্তারিত বর্ণনা করুন...",
      "categoryLabel": "বিভাগ",
      "priorityLabel": "অগ্রাধিকার",
      "submit": "টিকেট জমা দিন",
      "category": {
        "billing": "বিলিং",
        "technical": "প্রযুক্তিগত",
        "feature": "বৈশিষ্ট্য অনুরোধ",
        "general": "সাধারণ"
      },
      "priority": {
        "low": "কম",
        "medium": "মাঝারি",
        "high": "উচ্চ",
        "urgent": "জরুরি"
      },
      "status": {
        "open": "খোলা",
        "in_progress": "চলমান",
        "resolved": "সমাধান হয়েছে",
        "closed": "বন্ধ"
      },
      "created": "তৈরি হয়েছে",
      "error": {
        "required": "সব প্রয়োজনীয় ফিল্ড পূরণ করুন",
        "submit": "টিকেট তৈরি ব্যর্থ। আবার চেষ্টা করুন।"
      }
    },
    "tickets": {
      "title": "আমার সাপোর্ট টিকেট",
      "loading": "টিকেট লোড হচ্ছে...",
      "loadError": "টিকেট লোড করতে ব্যর্থ",
      "empty": "এখনও কোনো সাপোর্ট টিকেট নেই",
      "emptyFilter": "এই স্ট্যাটাসে কোনো টিকেট নেই",
      "create": "নতুন টিকেট",
      "createFirst": "আপনার প্রথম টিকেট তৈরি করুন",
      "filter": {
        "all": "সব",
        "open": "খোলা",
        "inProgress": "চলমান",
        "resolved": "সমাধান হয়েছে"
      }
    },
    "voice": {
      "title": "ভয়েস সহায়ক",
      "listening": "আমি শুনছি...",
      "thinking": "ভাবছি...",
      "speaking": "বলছে...",
      "error": "দুঃখিত, শুনতে পাইনি। আবার চেষ্টা করুন?",
      "ready": "আপনি কী জানতে চান?",
      "listeningNow": "শুনছে...",
      "wakeWordHint": "বলতে \"Jarvis\" বলুন"
    },
    "wizard": {
      "role": "আপনার গাইড"
    }
  },
  "jerusalem": {
    "title": "জেরুজালেম সংযোগ",
    "subtitle": "ইসরায়েলের হৃদয়ের সাথে সংযুক্ত থাকুন",
    "noContent": "জেরুজালেম কন্টেন্ট উপলব্ধ নেই",
    "sources": "উৎস",
    "kotelLive": "পশ্চিম প্রাচীর লাইভ",
    "categories": {
      "kotel": "পশ্চিম প্রাচীর",
      "idf-ceremony": "IDF অনুষ্ঠান",
      "diaspora-connection": "প্রবাসী সংযোগ",
      "holy-sites": "পবিত্র স্থান",
      "jerusalem-events": "জেরুজালেম ইভেন্ট",
      "general": "জেরুজালেম"
    }
  },
  "telAviv": {
    "title": "তেল আভিভ সংযোগ",
    "subtitle": "যে শহর কখনো থামে না",
    "noContent": "তেল আভিভ কন্টেন্ট উপলব্ধ নেই",
    "sources": "উৎস",
    "beachLive": "সমুদ্র সৈকত ওয়েবক্যাম",
    "categories": {
      "beaches": "সমুদ্র সৈকত",
      "nightlife": "নাইটলাইফ",
      "culture": "সংস্কৃতি ও শিল্প",
      "music": "সংগীত দৃশ্য",
      "food": "খাবার ও ডাইনিং",
      "tech": "প্রযুক্তি ও স্টার্টআপ",
      "events": "ইভেন্ট",
      "general": "তেল আভিভ"
    }
  },
  "taxonomy": {
    "sections": {
      "movies": "সিনেমা",
      "series": "সিরিজ",
      "kids": "শিশু",
      "youngsters": "তরুণ",
      "music": "সংগীত",
      "documentaries": "ডকুমেন্টারি",
      "podcasts": "পডকাস্ট",
      "live": "লাইভ TV",
      "audiobooks": "অডিওবুক"
    },
    "subcategories": {
      "learning-hebrew": "হিব্রু শেখা",
      "learning-hebrew.description": "শিশুদের জন্য হিব্রুতে পড়া, লেখা এবং শব্দভাণ্ডার শেখা",
      "young-science": "তরুণ বিজ্ঞান",
      "young-science.description": "শিশুদের জন্য উপযোগী পরীক্ষা-নিরীক্ষা এবং বৈজ্ঞানিক ব্যাখ্যা",
      "math-fun": "মজার গণিত",
      "math-fun.description": "মজাদার এবং খেলার মতো উপায়ে সংখ্যা এবং পাটিগণিত শেখা",
      "nature-animals": "প্রকৃতি ও প্রাণী",
      "nature-animals.description": "কৌতূহলী শিশুদের জন্য প্রাণী এবং প্রকৃতির জগৎ",
      "interactive": "ইন্টারঅ্যাক্টিভ",
      "interactive.description": "শিশুদের জন্য ইন্টারঅ্যাক্টিভ এবং অংশগ্রহণমূলক কন্টেন্ট",
      "hebrew-songs": "হিব্রু গান",
      "hebrew-songs.description": "ক্লাসিক এবং নতুন ইসরায়েলি শিশুদের গান",
      "nursery-rhymes": "নার্সারি রাইমস",
      "nursery-rhymes.description": "ছোট শিশু এবং বাচ্চাদের জন্য গান এবং সুর",
      "kids-movies": "শিশু সিনেমা",
      "kids-movies.description": "শিশুদের জন্য উপযুক্ত পূর্ণদৈর্ঘ্য সিনেমা",
      "kids-series": "শিশু সিরিজ",
      "kids-series.description": "শিশুদের জন্য অ্যানিমেটেড সিরিজ এবং TV শো",
      "jewish-holidays": "ইহুদি ছুটি",
      "jewish-holidays.description": "শিশুদের জন্য ইহুদি ছুটি এবং ঐতিহ্য সম্পর্কে কন্টেন্ট",
      "torah-stories": "তোরাহ গল্প",
      "torah-stories.description": "তোরাহ এবং ইহুদি ঐতিহ্য থেকে গল্প",
      "bedtime-stories": "ঘুমানোর গল্প",
      "bedtime-stories.description": "ঘুমানোর সময়ের জন্য শান্ত গল্প"
    }
  },
  "passkey": {
    "manager": {
      "title": "পাসকি",
      "subtitle": "নিরাপদ কন্টেন্ট অ্যাক্সেসের জন্য আপনার পাসকি পরিচালনা করুন"
    },
    "unsupported": "এই ডিভাইসে পাসকি সমর্থিত নয়",
    "fetchError": "পাসকি লোড করতে ব্যর্থ",
    "registerError": "পাসকি নিবন্ধন করতে ব্যর্থ",
    "deleteError": "পাসকি মুছতে ব্যর্থ",
    "cancelled": "পাসকি অপারেশন বাতিল হয়েছে",
    "noPasskeys": "এখনও কোনো পাসকি নিবন্ধিত নেই। প্রাইভেট কন্টেন্ট আনলক করতে একটি যোগ করুন।",
    "unknownDevice": "অজানা ডিভাইস",
    "created": "তৈরি হয়েছে",
    "lastUsed": "শেষ ব্যবহার",
    "never": "কখনো না",
    "addPasskey": "পাসকি যোগ করুন",
    "deleteConfirmTitle": "পাসকি মুছবেন?",
    "deleteConfirmText": "এই পাসকি আর কন্টেন্ট আনলক করতে পারবে না। আপনি পরে আবার যোগ করতে পারেন।",
    "unlock": "আনলক",
    "unlockContent": "প্রাইভেট কন্টেন্ট আনলক করুন",
    "unlockDescription": "প্রাইভেট সিনেমা এবং সিরিজ অ্যাক্সেস করতে আপনার পাসকি ব্যবহার করুন",
    "auth": {
      "title": "কন্টেন্ট আনলক করুন",
      "description": "প্রাইভেট সিনেমা এবং সিরিজ আনলক করতে আপনার ফিঙ্গারপ্রিন্ট, ফেস বা ডিভাইস PIN ব্যবহার করুন।",
      "unlock": "পাসকি দিয়ে আনলক করুন",
      "authenticating": "প্রমাণীকরণ হচ্ছে...",
      "success": "কন্টেন্ট আনলক হয়েছে!",
      "cancelled": "প্রমাণীকরণ বাতিল হয়েছে",
      "error": "প্রমাণীকরণ ব্যর্থ। আবার চেষ্টা করুন।"
    },
    "qr": {
      "useQR": "আনলক করতে ফোন ব্যবহার করুন",
      "scanWithPhone": "আপনার ফোন দিয়ে স্ক্যান করুন",
      "instruction": "আপনার ফোনে ক্যামেরা খুলুন এবং প্রমাণীকরণ করতে QR কোড স্ক্যান করুন",
      "error": "QR কোড তৈরি করতে ব্যর্থ",
      "expired": "QR কোডের মেয়াদ শেষ। আবার চেষ্টা করুন।"
    }
  },
  "olorin": {
    "errors": {
      "session_not_found": "সেশন পাওয়া যায়নি",
      "session_different_partner": "সেশন ভিন্ন পার্টনারের",
      "session_invalid_status": "সেশন {status}, ট্রান্সক্রিপ্ট যোগ করা যাচ্ছে না",
      "max_sessions_reached": "সর্বোচ্চ সমকালীন সেশন ({limit}) পৌঁছেছে",
      "invalid_api_key": "অবৈধ API কী",
      "missing_api_key": "{header} হেডার অনুপস্থিত",
      "capability_disabled": "'{capability}' ক্ষমতা বর্তমানে নিষ্ক্রিয়",
      "capability_not_enabled": "'{capability}' ক্ষমতা এই পার্টনারের জন্য সক্রিয় নয়",
      "source_language_not_supported": "সোর্স ভাষা '{language}' সমর্থিত নয়। সমর্থিত: {supported}",
      "target_language_not_supported": "টার্গেট ভাষা '{language}' সমর্থিত নয়। সমর্থিত: {supported}",
      "partner_not_found": "পার্টনার পাওয়া যায়নি",
      "partner_registration_failed": "পার্টনার নিবন্ধন ব্যর্থ",
      "no_updates_provided": "কোনো আপডেট দেওয়া হয়নি",
      "webhook_config_failed": "ওয়েবহুক কনফিগার করতে ব্যর্থ",
      "webhook_url_not_configured": "ওয়েবহুক URL কনফিগার করা হয়নি",
      "webhook_secret_not_configured": "ওয়েবহুক সিক্রেট কনফিগার করা হয়নি",
      "search_failed": "সার্চ ব্যর্থ",
      "indexing_failed": "ইনডেক্সিং ব্যর্থ",
      "detection_failed": "সনাক্তকরণ ব্যর্থ",
      "explanation_failed": "ব্যাখ্যা পেতে ব্যর্থ",
      "reference_not_found": "রেফারেন্স '{reference_id}' পাওয়া যায়নি",
      "enrichment_failed": "এনরিচমেন্ট ব্যর্থ",
      "get_references_failed": "রেফারেন্স পেতে ব্যর্থ",
      "create_session_failed": "সেশন তৈরি করতে ব্যর্থ",
      "add_transcript_failed": "ট্রান্সক্রিপ্ট যোগ করতে ব্যর্থ",
      "generate_recap_failed": "রিক্যাপ তৈরি করতে ব্যর্থ"
    }
  },
  "trivia": {
    "didYouKnow": "আপনি কি জানতেন?",
    "dismissHint": "এই ট্রিভিয়া ফ্যাক্ট বাতিল করতে ট্যাপ করুন",
    "settings": {
      "title": "ট্রিভিয়া ও মজার তথ্য",
      "enabled": "ট্রিভিয়া দেখান",
      "enabledDescription": "প্লেব্যাকের সময় আকর্ষণীয় তথ্য প্রদর্শন করুন",
      "frequency": "ফ্রিকোয়েন্সি",
      "frequencyHint": "ট্রিভিয়া প্রদর্শন ফ্রিকোয়েন্সি পরিবর্তন করুন",
      "categories": "বিভাগ",
      "category": "বিভাগ",
      "selectCategory": "এই বিভাগ নির্বাচন করতে ট্যাপ করুন",
      "deselectCategory": "এই বিভাগ অনির্বাচন করতে ট্যাপ করুন",
      "displayDuration": "প্রদর্শন সময়কাল",
      "durationHint": "ট্রিভিয়া কতক্ষণ প্রদর্শিত হবে তা পরিবর্তন করুন",
      "seconds": "সেকেন্ড"
    },
    "categories": {
      "cast": "কাস্ট",
      "production": "প্রোডাকশন",
      "location": "লোকেশন",
      "cultural": "সাংস্কৃতিক",
      "historical": "ঐতিহাসিক"
    },
    "frequency": {
      "off": "বন্ধ",
      "low": "কম",
      "normal": "স্বাভাবিক",
      "high": "উচ্চ"
    },
    "errors": {
      "loadFailed": "ট্রিভিয়া লোড করতে ব্যর্থ",
      "saveFailed": "ট্রিভিয়া পছন্দ সংরক্ষণ করতে ব্যর্থ"
    }
  },
  "cities": {
    "jerusalem": {
      "title": "জেরুজালেম",
      "subtitle": "চিরন্তন শহর আবিষ্কার করুন",
      "loadingContent": "জেরুজালেম কন্টেন্ট লোড হচ্ছে...",
      "noContent": "এই মুহূর্তে কোনো কন্টেন্ট নেই",
      "errorLoading": "জেরুজালেম কন্টেন্ট লোড করতে ব্যর্থ",
      "sources": "উৎস",
      "categories": {
        "history": "🏛️ ঐতিহাসিক স্থান",
        "religion": "🕍 ধর্মীয় ঐতিহ্য",
        "culture": "🎭 সাংস্কৃতিক ইভেন্ট",
        "events": "📅 স্থানীয় ইভেন্ট",
        "food": "🍴 রন্ধনসম্পর্কীয় আনন্দ",
        "markets": "🛍️ ঐতিহ্যবাহী বাজার",
        "arts": "🎨 শিল্প ও গ্যালারি"
      }
    },
    "telAviv": {
      "title": "তেল আভিভ",
      "subtitle": "প্রাণবন্ত শহর অভিজ্ঞতা করুন",
      "loadingContent": "তেল আভিভ কন্টেন্ট লোড হচ্ছে...",
      "noContent": "এই মুহূর্তে কোনো কন্টেন্ট নেই",
      "errorLoading": "তেল আভিভ কন্টেন্ট লোড করতে ব্যর্থ",
      "sources": "উৎস",
      "categories": {
        "beaches": "🏖️ সমুদ্র সৈকত ও ওয়াটারফ্রন্ট",
        "nightlife": "🌃 নাইটলাইফ ও বিনোদন",
        "culture": "🎭 সাংস্কৃতিক ইভেন্ট",
        "music": "🎵 সংগীত ও কনসার্ট",
        "food": "🍴 ডাইনিং ও খাবার দৃশ্য",
        "tech": "💻 প্রযুক্তি ও উদ্ভাবন",
        "events": "📅 স্থানীয় ইভেন্ট"
      }
    },
    "beta": {
      "credits": {
        "loading": "ক্রেডিট ব্যালেন্স লোড হচ্ছে...",
        "error": "ক্রেডিট ব্যালেন্স লোড করা যায়নি",
        "label": "AI ক্রেডিট",
        "remaining": "বাকি ক্রেডিট",
        "warningCritical": "সতর্কতা: ক্রেডিট কম",
        "warningLow": "সতর্কতা: ক্রেডিট ব্যালেন্স কম",
        "upgrade": "প্ল্যান আপগ্রেড করুন",
        "upgradeAction": "আরও ক্রেডিট পেতে আপগ্রেড করুন"
      },
      "settings": {
        "title": "বেটা প্রোগ্রাম",
        "description": "আপনার Beta 500 এনরোলমেন্ট পরিচালনা করুন এবং প্রোগ্রাম বিবরণ দেখুন। AI-চালিত বৈশিষ্ট্যে প্রাথমিক অ্যাক্সেস পান।",
        "enrolledTitle": "আপনি Beta 500-এ আছেন!",
        "statusPendingVerification": "যাচাই মুলতুবি",
        "statusActive": "সক্রিয়",
        "statusExpired": "মেয়াদ শেষ",
        "pendingMessage": "আমরা আপনার এনরোলমেন্ট যাচাই করছি। অনুমোদিত হলে আপনি ইমেইল পাবেন।",
        "expiresOn": "{{date}}-এ মেয়াদ শেষ",
        "loadingStatus": "প্রোগ্রাম স্ট্যাটাস লোড হচ্ছে...",
        "errorLoading": "প্রোগ্রাম তথ্য লোড করা যায়নি। আবার চেষ্টা করুন।",
        "programStatus": "প্রোগ্রাম স্ট্যাটাস",
        "slots": "স্লট পূরণ হয়েছে",
        "slotsAvailable": "{{count}}টি স্লট উপলব্ধ",
        "programFull": "সব ৫০০ স্লট পূরণ হয়েছে"
      },
      "enrollment": {
        "title": "Beta 500-এ যোগ দিন",
        "subtitle": "AI-চালিত বৈশিষ্ট্য অভিজ্ঞতা করতে ৫০০ পরিবারের একজন হন",
        "programFull": "প্রোগ্রাম পূর্ণ",
        "joinButton": "Beta 500-এ যোগ দিন",
        "exclusiveAccess": "এক্সক্লুসিভ অ্যাক্সেস",
        "limitedSlots": "৫০০ পরিবারে সীমিত",
        "slotsAvailable": "{{total}}-এর মধ্যে {{available}}টি স্লট উপলব্ধ",
        "freeCredits": "বিনামূল্যে AI ক্রেডিট",
        "creditsAmount": "৫,০০০ ক্রেডিট ($50 মূল্যের)",
        "duration": "বেটা সময়কাল",
        "durationValue": "৯০ দিন",
        "features": "AI বৈশিষ্ট্য",
        "featuresValue": "লাইভ ডাবিং, AI সার্চ, সুপারিশ",
        "whatYouGet": "আপনি যা পাবেন",
        "benefits": {
          "liveDubbing": "দেখার সময় রিয়েল-টাইম অডিও অনুবাদ",
          "aiSearch": "বুদ্ধিমান কন্টেন্ট আবিষ্কার",
          "aiRecommendations": "ব্যক্তিগত সাজেশন",
          "prioritySupport": "ডেভেলপমেন্ট টিমে সরাসরি অ্যাক্সেস"
        },
        "disclaimer": "Beta 500 একটি সীমিত-সময়ের প্রোগ্রাম। বেটা পিরিয়ডে ক্রেডিট নবায়নযোগ্য নয়।",
        "waitlistMessage": "সব ৫০০ স্লট বর্তমানে পূর্ণ। স্লট উপলব্ধ হলে জানতে ওয়েটলিস্টে যোগ দিন।",
        "enrollmentSuccess": "Beta 500-এ স্বাগতম! আপনার অ্যাকাউন্ট যাচাই করতে আপনার ইমেইল চেক করুন।",
        "enrollmentError": "এনরোল করা যায়নি। পরে আবার চেষ্টা করুন।"
      }
    }
  },
  "catchup": {
    "overlay": {
      "title": "এইমাত্র যোগ দিলেন?",
      "description": "আপনি {{programName}}-এ মাঝপথে যোগ দিয়েছেন",
      "creditContext": "এটি আপনার {{balance}} ক্রেডিটের {{cost}} ব্যবহার করবে",
      "lowBalanceWarning": "ক্রেডিট কম বাকি",
      "acceptButton": "আমাকে আপডেট করুন ({{cost}} ক্রেডিট)",
      "declineButton": "না ধন্যবাদ"
    },
    "button": {
      "credits": "ক্যাচ আপ ({{cost}} ক্রেডিট)",
      "label": "ক্যাচ আপ সারাংশ",
      "title": "ক্যাচ আপ"
    },
    "generating": "সারাংশ তৈরি হচ্ছে...",
    "summary": {
      "title": "আপনি যা মিস করেছেন",
      "keyPoints": "মূল পয়েন্ট",
      "windowInfo": "শেষ {{minutes}} মিনিট",
      "creditsUsed": "{{count}} ক্রেডিট ব্যবহৃত",
      "creditsRemaining": "{{count}} ক্রেডিট বাকি",
      "close": "বন্ধ করুন"
    },
    "error": {
      "failed": "সারাংশ তৈরি করা যায়নি",
      "retry": "আবার চেষ্টা করুন",
      "insufficientCredits": "পর্যাপ্ত ক্রেডিট নেই"
    }
  },
  "quota": {
    "subtitleExceeded": "সাবটাইটেল কোটা অতিক্রম করেছে। পরে আবার চেষ্টা করুন।",
    "dubbingExceeded": "ডাবিং কোটা অতিক্রম করেছে। পরে আবার চেষ্টা করুন।"
  }
};

deepMerge(bn, translations);
fs.writeFileSync('bn.json', JSON.stringify(bn, null, 2) + '\n');
console.log('Part 5 complete - chess, friends, stats, support, jerusalem, telAviv, taxonomy, passkey, olorin, trivia, cities, catchup, quota added');
