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
  "chess": {
    "title": "शतरंज",
    "welcome": "शतरंज में आपका स्वागत है",
    "subtitle": "दुनिया भर के दोस्तों और परिवार के साथ शतरंज खेलें",
    "createGame": "नया खेल बनाएं",
    "joinGame": "खेल में शामिल हों",
    "gameCode": "खेल कोड",
    "enterGameCode": "खेल कोड दर्ज करें",
    "invalidGameCode": "अमान्य खेल कोड। 6 अक्षर होने चाहिए।",
    "joinFailed": "खेल में शामिल होने में विफल",
    "join": "शामिल हों",
    "create": "बनाएं",
    "chooseColor": "अपना रंग चुनें",
    "white": "सफेद",
    "black": "काला",
    "chatPlaceholder": "संदेश टाइप करें... (सलाह के लिए @bot)",
    "botHint": "हमारे AI सहायक से शतरंज सलाह पाने के लिए अपने संदेश में @bot टैग करें",
    "bot": "शतरंज सहायक",
    "mute": "म्यूट",
    "unmute": "अनम्यूट",
    "speaking": "प्रतिभागी",
    "resign": "त्यागें",
    "offerDraw": "ड्रॉ प्रस्ताव",
    "newGame": "नया खेल",
    "checkmate": "शहमात!",
    "stalemate": "गतिरोध",
    "draw": "ड्रॉ",
    "resigned": "खेल त्याग दिया",
    "reconnecting": "पुनः कनेक्ट हो रहा है...",
    "moveHistory": "चाल इतिहास",
    "noMoves": "अभी कोई चाल नहीं",
    "showHints": "गाइड हिंट दिखाएं",
    "yourTurn": "आपकी बारी",
    "opponentTurn": "प्रतिद्वंद्वी की बारी",
    "waitingForOpponent": "प्रतिद्वंद्वी की प्रतीक्षा...",
    "gameOver": "खेल समाप्त",
    "sendingInvite": "{{name}} को खेल निमंत्रण भेज रहा है...",
    "inviteSent": "{{name}} को खेल निमंत्रण भेजा गया! खेल कोड: {{code}}",
    "inviteFailed": "वह उपयोगकर्ता नहीं मिला। कृपया नाम जांचें और पुनः प्रयास करें।",
    "inviteReceived": "{{name}} ने आपको शतरंज के खेल के लिए आमंत्रित किया!",
    "joinInvite": "खेल में शामिल हों",
    "challenge": "चुनौती दें",
    "playedAsWhite": "सफेद के रूप में खेला",
    "playedAsBlack": "काले के रूप में खेला",
    "gameMode": "खेल मोड",
    "playVsFriend": "दोस्त के विरुद्ध खेलें",
    "playVsBot": "बॉट के विरुद्ध खेलें",
    "difficulty": "कठिनाई",
    "easy": "आसान",
    "medium": "मध्यम",
    "hard": "कठिन",
    "chessBot": "शतरंज बॉट"
  },
  "friends": {
    "title": "मित्र और प्रतिद्वंद्वी",
    "subtitle": "खिलाड़ियों से जुड़ें और दोस्तों को चुनौती दें",
    "myFriends": "मेरे मित्र",
    "requests": "अनुरोध",
    "findPlayers": "खिलाड़ी खोजें",
    "friendsLabel": "मित्र",
    "pendingLabel": "लंबित",
    "add": "मित्र जोड़ें",
    "remove": "हटाएं",
    "accept": "स्वीकार करें",
    "reject": "अस्वीकार करें",
    "cancel": "रद्द करें",
    "noFriends": "अभी कोई मित्र नहीं",
    "noFriendsDesc": "खिलाड़ियों को खोजें और मित्र अनुरोध भेजें",
    "lastGame": "अंतिम खेल: {{time}}",
    "friendsSince": "{{date}} से मित्र",
    "incomingRequests": "आने वाले अनुरोध",
    "outgoingRequests": "भेजे गए अनुरोध",
    "noIncoming": "कोई आने वाला अनुरोध नहीं",
    "noOutgoing": "कोई भेजा गया अनुरोध नहीं",
    "sentAt": "{{time}} को भेजा",
    "searchPlaceholder": "नाम से खोजें...",
    "noResults": "कोई खिलाड़ी नहीं मिला",
    "noResultsDesc": "अलग नाम से खोजने का प्रयास करें",
    "requestSent": "मित्र अनुरोध भेजा गया!",
    "requestAccepted": "मित्र अनुरोध स्वीकार किया गया!",
    "requestRejected": "मित्र अनुरोध अस्वीकार किया गया",
    "requestCancelled": "मित्र अनुरोध रद्द किया गया",
    "friendRemoved": "मित्र हटाया गया",
    "searchFailed": "उपयोगकर्ताओं को खोजने में विफल",
    "requestFailed": "अनुरोध भेजने में विफल",
    "acceptFailed": "अनुरोध स्वीकार करने में विफल",
    "rejectFailed": "अनुरोध अस्वीकार करने में विफल",
    "cancelFailed": "अनुरोध रद्द करने में विफल",
    "removeFailed": "मित्र हटाने में विफल",
    "friendsCount": "{{count}} मित्र",
    "gamesCount": "{{count}} खेल",
    "alreadyFriends": "मित्र"
  },
  "stats": {
    "statistics": "आंकड़े",
    "matchHistory": "मैच इतिहास",
    "headToHead": "आमने-सामने",
    "gamesPlayed": "खेले गए खेल",
    "wins": "जीत",
    "losses": "हार",
    "draws": "ड्रॉ",
    "winRate": "जीत दर",
    "rating": "रेटिंग",
    "peakRating": "शीर्ष रेटिंग",
    "peak": "शीर्ष",
    "winStreak": "जीत की लय",
    "currentStreak": "वर्तमान लय",
    "bestStreak": "सर्वश्रेष्ठ लय",
    "performance": "प्रदर्शन",
    "achievements": "उपलब्धियां",
    "currentRating": "वर्तमान रेटिंग",
    "totalGames": "कुल खेल",
    "noGames": "अभी कोई खेल नहीं खेला",
    "moves": "चालें",
    "won": "जीता",
    "lost": "हारा",
    "draw": "ड्रॉ",
    "overall": "कुल रिकॉर्ड",
    "yourWins": "आपकी जीत",
    "theirWins": "उनकी जीत",
    "totalGamesPlayed": "कुल: {{count}} खेल",
    "recentGames": "हाल के खेल"
  },
  "support": {
    "categories": {
      "title": "दस्तावेज़ीकरण ब्राउज़ करें",
      "loading": "दस्तावेज़ीकरण लोड हो रहा है...",
      "loadError": "श्रेणियां लोड करने में विफल",
      "articleCount": "{{count}} लेख",
      "gettingStarted": "शुरू करें",
      "features": "सुविधाएं",
      "troubleshooting": "समस्या निवारण",
      "account": "खाता"
    },
    "docs": {
      "loading": "दस्तावेज़ लोड हो रहा है...",
      "loadError": "दस्तावेज़ लोड करने में विफल",
      "backToList": "दस्तावेज़ीकरण पर वापस जाएं"
    },
    "search": {
      "placeholder": "दस्तावेज़ीकरण खोजें...",
      "noResults": "कोई परिणाम नहीं मिला"
    },
    "faq": {
      "title": "अक्सर पूछे जाने वाले प्रश्न",
      "loading": "FAQ लोड हो रहा है...",
      "loadError": "FAQ लोड करने में विफल",
      "empty": "इस श्रेणी में कोई FAQ आइटम नहीं",
      "categories": {
        "all": "सभी विषय",
        "general": "सामान्य",
        "billing": "बिलिंग",
        "technical": "तकनीकी",
        "features": "सुविधाएं"
      }
    },
    "videos": {
      "title": "ट्यूटोरियल वीडियो",
      "subtitle": "Bayit+ सुविधाओं का उपयोग कैसे करें सीखें",
      "widgetsIntro": "विजेट के साथ शुरू करें",
      "widgetsDescription": "फ्लोटिंग विजेट बनाना, अनुकूलित करना और प्रबंधित करना सीखें"
    },
    "contact": {
      "voiceTitle": "वॉइस सहायता",
      "voiceDescription": "हमारे AI सहायक के साथ वॉइस बातचीत शुरू करने के लिए अवतार बटन पर क्लिक करें या \"Jarvis\" बोलें।",
      "ticketTitle": "सहायता टिकट बनाएं",
      "ticketDescription": "मानव सहायता चाहिए? सहायता टिकट बनाएं और हमारी टीम 24 घंटे के भीतर जवाब देगी।",
      "createTicket": "टिकट बनाएं",
      "emailTitle": "ईमेल सहायता",
      "emailDescription": "ईमेल पसंद करते हैं? किसी भी प्रश्न या चिंता के लिए support@bayit.tv पर हमसे संपर्क करें।"
    },
    "ticket": {
      "title": "सहायता टिकट बनाएं",
      "subject": "विषय",
      "subjectPlaceholder": "आपकी समस्या का संक्षिप्त विवरण",
      "message": "संदेश",
      "messagePlaceholder": "अपनी समस्या का विस्तार से वर्णन करें...",
      "categoryLabel": "श्रेणी",
      "priorityLabel": "प्राथमिकता",
      "submit": "टिकट सबमिट करें",
      "category": {
        "billing": "बिलिंग",
        "technical": "तकनीकी",
        "feature": "सुविधा अनुरोध",
        "general": "सामान्य"
      },
      "priority": {
        "low": "कम",
        "medium": "मध्यम",
        "high": "उच्च",
        "urgent": "अत्यावश्यक"
      },
      "status": {
        "open": "खुला",
        "in_progress": "प्रगति में",
        "resolved": "हल किया गया",
        "closed": "बंद"
      },
      "created": "बनाया गया",
      "error": {
        "required": "कृपया सभी आवश्यक फ़ील्ड भरें",
        "submit": "टिकट बनाने में विफल। कृपया पुनः प्रयास करें।"
      }
    },
    "tickets": {
      "title": "मेरे सहायता टिकट",
      "loading": "टिकट लोड हो रहे हैं...",
      "loadError": "टिकट लोड करने में विफल",
      "empty": "अभी कोई सहायता टिकट नहीं",
      "emptyFilter": "इस स्थिति के साथ कोई टिकट नहीं",
      "create": "नया टिकट",
      "createFirst": "अपना पहला टिकट बनाएं",
      "filter": {
        "all": "सभी",
        "open": "खुला",
        "inProgress": "प्रगति में",
        "resolved": "हल किया गया"
      }
    },
    "voice": {
      "title": "वॉइस सहायक",
      "listening": "मैं सुन रहा हूं...",
      "thinking": "मुझे इसके बारे में सोचने दीजिए...",
      "speaking": "बोल रहा है...",
      "error": "क्षमा करें, मुझे समझ नहीं आया। फिर से प्रयास करें?",
      "ready": "आप क्या जानना चाहेंगे?",
      "listeningNow": "सुन रहे हैं...",
      "wakeWordHint": "बोलने के लिए \"Jarvis\" बोलें"
    },
    "wizard": {
      "role": "आपका गाइड"
    }
  },
  "jerusalem": {
    "title": "जेरूसलम कनेक्शन",
    "subtitle": "इज़राइल के दिल से जुड़े रहें",
    "noContent": "कोई जेरूसलम सामग्री उपलब्ध नहीं",
    "sources": "स्रोत",
    "kotelLive": "पश्चिमी दीवार लाइव",
    "categories": {
      "kotel": "पश्चिमी दीवार",
      "idf-ceremony": "IDF समारोह",
      "diaspora-connection": "प्रवासी कनेक्शन",
      "holy-sites": "पवित्र स्थल",
      "jerusalem-events": "जेरूसलम इवेंट्स",
      "general": "जेरूसलम"
    }
  },
  "telAviv": {
    "title": "तेल अवीव कनेक्शन",
    "subtitle": "जो शहर कभी नहीं रुकता",
    "noContent": "कोई तेल अवीव सामग्री उपलब्ध नहीं",
    "sources": "स्रोत",
    "beachLive": "बीच वेबकैम",
    "categories": {
      "beaches": "बीच",
      "nightlife": "नाइटलाइफ",
      "culture": "संस्कृति और कला",
      "music": "संगीत दृश्य",
      "food": "भोजन और डाइनिंग",
      "tech": "तकनीक और स्टार्टअप",
      "events": "इवेंट्स",
      "general": "तेल अवीव"
    }
  },
  "taxonomy": {
    "sections": {
      "movies": "फ़िल्में",
      "series": "सीरीज़",
      "kids": "बच्चे",
      "youngsters": "किशोर",
      "music": "संगीत",
      "documentaries": "डॉक्यूमेंट्री",
      "podcasts": "पॉडकास्ट",
      "live": "लाइव TV",
      "audiobooks": "ऑडियोबुक"
    },
    "subcategories": {
      "learning-hebrew": "हिब्रू सीखें",
      "learning-hebrew.description": "बच्चों के लिए हिब्रू में पढ़ना, लिखना और शब्दावली सीखना",
      "young-science": "युवा विज्ञान",
      "young-science.description": "बच्चों के लिए अनुकूलित प्रयोग और वैज्ञानिक व्याख्याएं",
      "math-fun": "मज़ेदार गणित",
      "math-fun.description": "मज़ेदार और खेल-खेल में संख्याएं और अंकगणित सीखना",
      "nature-animals": "प्रकृति और जानवर",
      "nature-animals.description": "जिज्ञासु बच्चों के लिए जानवरों और प्रकृति की दुनिया",
      "interactive": "इंटरैक्टिव",
      "interactive.description": "बच्चों के लिए इंटरैक्टिव और सहभागी सामग्री",
      "hebrew-songs": "हिब्रू गाने",
      "hebrew-songs.description": "क्लासिक और नए इज़राइली बच्चों के गाने",
      "nursery-rhymes": "नर्सरी राइम्स",
      "nursery-rhymes.description": "छोटे बच्चों और शिशुओं के लिए गाने और धुनें",
      "kids-movies": "बच्चों की फ़िल्में",
      "kids-movies.description": "बच्चों के लिए उपयुक्त पूर्ण-लंबाई की फ़िल्में",
      "kids-series": "बच्चों की सीरीज़",
      "kids-series.description": "बच्चों के लिए एनिमेटेड सीरीज़ और TV शो",
      "jewish-holidays": "यहूदी छुट्टियां",
      "jewish-holidays.description": "बच्चों के लिए यहूदी छुट्टियों और परंपराओं की सामग्री",
      "torah-stories": "तोराह कहानियां",
      "torah-stories.description": "तोराह और यहूदी परंपरा की कहानियां",
      "bedtime-stories": "सोने की कहानियां",
      "bedtime-stories.description": "सोने के समय के लिए आरामदायक कहानियां",
      "tiktok-trends": "TikTok ट्रेंड्स",
      "tiktok-trends.description": "TikTok पर हॉट ट्रेंड्स और चैलेंज",
      "viral-videos": "वायरल वीडियो",
      "viral-videos.description": "सोशल मीडिया पर लोकप्रिय वायरल वीडियो",
      "memes": "मीम्स",
      "memes.description": "मज़ेदार मीम्स और इंटरनेट संस्कृति",
      "israel-news": "इज़राइल समाचार",
      "israel-news.description": "किशोरों के लिए अनुकूलित इज़राइल समाचार",
      "world-news": "विश्व समाचार",
      "world-news.description": "युवाओं के लिए अंतर्राष्ट्रीय समाचार",
      "science-news": "विज्ञान समाचार",
      "science-news.description": "वैज्ञानिक खोजें और तकनीकी नवाचार",
      "sports-news": "खेल समाचार",
      "sports-news.description": "खेल अपडेट और मैच परिणाम",
      "music-culture": "संगीत संस्कृति",
      "music-culture.description": "संगीत दृश्य, कलाकार और उत्सव",
      "film-culture": "फ़िल्म संस्कृति",
      "film-culture.description": "सिनेमा, सीरीज़ और समीक्षाएं",
      "art-culture": "कला संस्कृति",
      "art-culture.description": "कला, गैलरी और रचनात्मकता",
      "food-culture": "खाद्य संस्कृति",
      "food-culture.description": "खाना पकाना, व्यंजन विधि और खाद्य संस्कृति",
      "study-help": "पढ़ाई में मदद",
      "study-help.description": "परीक्षा, सारांश और टेस्ट तैयारी में मदद",
      "career-prep": "करियर तैयारी",
      "career-prep.description": "विश्वविद्यालय और करियर की तैयारी",
      "life-skills": "जीवन कौशल",
      "life-skills.description": "जीवन कौशल, धन प्रबंधन और स्वतंत्रता",
      "teen-movies": "किशोर फ़िल्में",
      "teen-movies.description": "किशोरों के लिए सुझाई गई फ़िल्में",
      "teen-series": "किशोर सीरीज़",
      "teen-series.description": "किशोरों के लिए लोकप्रिय सीरीज़",
      "gaming": "गेमिंग",
      "gaming.description": "वीडियो गेम, ई-स्पोर्ट्स और गेमिंग",
      "coding": "कोडिंग",
      "coding.description": "प्रोग्रामिंग, कोडिंग और सॉफ्टवेयर विकास",
      "gadgets": "गैजेट्स",
      "gadgets.description": "गैजेट्स, तकनीक और समीक्षाएं",
      "bar-bat-mitzvah": "बार/बैट मिट्ज़वाह",
      "bar-bat-mitzvah.description": "बार/बैट मिट्ज़वाह की तैयारी और उत्सव",
      "teen-torah": "किशोर तोराह",
      "teen-torah.description": "किशोरों के लिए तोराह कक्षाएं और साप्ताहिक भाग",
      "jewish-history": "यहूदी इतिहास",
      "jewish-history.description": "यहूदी लोगों का इतिहास"
    }
  },
  "passkey": {
    "manager": {
      "title": "पासकी",
      "subtitle": "सुरक्षित सामग्री पहुंच के लिए अपनी पासकी प्रबंधित करें"
    },
    "unsupported": "इस डिवाइस पर पासकी समर्थित नहीं हैं",
    "fetchError": "पासकी लोड करने में विफल",
    "registerError": "पासकी पंजीकृत करने में विफल",
    "deleteError": "पासकी हटाने में विफल",
    "cancelled": "पासकी ऑपरेशन रद्द कर दिया गया",
    "noPasskeys": "अभी कोई पासकी पंजीकृत नहीं। निजी सामग्री अनलॉक करने के लिए एक जोड़ें।",
    "unknownDevice": "अज्ञात डिवाइस",
    "created": "बनाया गया",
    "lastUsed": "अंतिम बार उपयोग",
    "never": "कभी नहीं",
    "addPasskey": "पासकी जोड़ें",
    "deleteConfirmTitle": "पासकी हटाएं?",
    "deleteConfirmText": "यह पासकी अब सामग्री अनलॉक नहीं कर पाएगी। आप इसे बाद में फिर से जोड़ सकते हैं।",
    "unlock": "अनलॉक करें",
    "unlockContent": "निजी सामग्री अनलॉक करें",
    "unlockDescription": "निजी फ़िल्में और सीरीज़ तक पहुंचने के लिए अपनी पासकी उपयोग करें",
    "auth": {
      "title": "सामग्री अनलॉक करें",
      "description": "निजी फ़िल्में और सीरीज़ अनलॉक करने के लिए अपना फिंगरप्रिंट, चेहरा या डिवाइस PIN उपयोग करें।",
      "unlock": "पासकी से अनलॉक करें",
      "authenticating": "प्रमाणित हो रहा है...",
      "success": "सामग्री अनलॉक हो गई!",
      "cancelled": "प्रमाणीकरण रद्द कर दिया गया",
      "error": "प्रमाणीकरण विफल। कृपया पुनः प्रयास करें।"
    },
    "qr": {
      "useQR": "अनलॉक करने के लिए फोन उपयोग करें",
      "scanWithPhone": "अपने फोन से स्कैन करें",
      "instruction": "प्रमाणित करने के लिए अपने फोन पर कैमरा खोलें और QR कोड स्कैन करें",
      "error": "QR कोड जनरेट करने में विफल",
      "expired": "QR कोड समाप्त हो गया। कृपया पुनः प्रयास करें।"
    }
  },
  "olorin": {
    "errors": {
      "session_not_found": "सत्र नहीं मिला",
      "session_different_partner": "सत्र अलग पार्टनर का है",
      "session_invalid_status": "सत्र {status} है, ट्रांसक्रिप्ट नहीं जोड़ सकते",
      "max_sessions_reached": "अधिकतम समवर्ती सत्र ({limit}) पहुंच गए",
      "invalid_api_key": "अमान्य API कुंजी",
      "missing_api_key": "{header} हेडर गायब है",
      "capability_disabled": "क्षमता '{capability}' वर्तमान में अक्षम है",
      "capability_not_enabled": "इस पार्टनर के लिए क्षमता '{capability}' सक्षम नहीं है",
      "source_language_not_supported": "स्रोत भाषा '{language}' समर्थित नहीं है। समर्थित: {supported}",
      "target_language_not_supported": "लक्ष्य भाषा '{language}' समर्थित नहीं है। समर्थित: {supported}",
      "partner_not_found": "पार्टनर नहीं मिला",
      "partner_registration_failed": "पार्टनर पंजीकृत करने में विफल",
      "no_updates_provided": "कोई अपडेट प्रदान नहीं किया गया",
      "webhook_config_failed": "वेबहुक कॉन्फ़िगर करने में विफल",
      "webhook_url_not_configured": "वेबहुक URL कॉन्फ़िगर नहीं है",
      "webhook_secret_not_configured": "वेबहुक सीक्रेट कॉन्फ़िगर नहीं है",
      "search_failed": "खोज विफल",
      "indexing_failed": "इंडेक्सिंग विफल",
      "detection_failed": "पता लगाना विफल",
      "explanation_failed": "व्याख्या प्राप्त करने में विफल",
      "reference_not_found": "संदर्भ '{reference_id}' नहीं मिला",
      "enrichment_failed": "एनरिचमेंट विफल",
      "get_references_failed": "संदर्भ प्राप्त करने में विफल",
      "create_session_failed": "सत्र बनाने में विफल",
      "add_transcript_failed": "ट्रांसक्रिप्ट जोड़ने में विफल",
      "generate_recap_failed": "रीकैप जनरेट करने में विफल"
    }
  },
  "trivia": {
    "didYouKnow": "क्या आप जानते हैं?",
    "dismissHint": "इस ट्रिविया फैक्ट को खारिज करने के लिए टैप करें",
    "settings": {
      "title": "ट्रिविया और मज़ेदार तथ्य",
      "enabled": "ट्रिविया दिखाएं",
      "enabledDescription": "प्लेबैक के दौरान दिलचस्प तथ्य प्रदर्शित करें",
      "frequency": "आवृत्ति",
      "frequencyHint": "ट्रिविया प्रदर्शन आवृत्ति बदलें",
      "categories": "श्रेणियां",
      "category": "श्रेणी",
      "selectCategory": "इस श्रेणी को चुनने के लिए टैप करें",
      "deselectCategory": "इस श्रेणी को हटाने के लिए टैप करें",
      "displayDuration": "प्रदर्शन अवधि",
      "durationHint": "ट्रिविया कितनी देर प्रदर्शित हो बदलें",
      "seconds": "सेकंड"
    },
    "categories": {
      "cast": "कास्ट",
      "production": "निर्माण",
      "location": "स्थान",
      "cultural": "सांस्कृतिक",
      "historical": "ऐतिहासिक"
    },
    "frequency": {
      "off": "बंद",
      "low": "कम",
      "normal": "सामान्य",
      "high": "उच्च"
    },
    "errors": {
      "loadFailed": "ट्रिविया लोड करने में विफल",
      "saveFailed": "ट्रिविया प्राथमिकताएं सहेजने में विफल"
    }
  },
  "cities": {
    "jerusalem": {
      "title": "जेरूसलम",
      "subtitle": "शाश्वत शहर की खोज करें",
      "loadingContent": "जेरूसलम सामग्री लोड हो रही है...",
      "noContent": "इस समय कोई सामग्री उपलब्ध नहीं",
      "errorLoading": "जेरूसलम सामग्री लोड करने में विफल",
      "sources": "स्रोत",
      "categories": {
        "history": "🏛️ ऐतिहासिक स्थल",
        "religion": "🕍 धार्मिक विरासत",
        "culture": "🎭 सांस्कृतिक कार्यक्रम",
        "events": "📅 स्थानीय कार्यक्रम",
        "food": "🍴 पाक आनंद",
        "markets": "🛍️ पारंपरिक बाज़ार",
        "arts": "🎨 कला और गैलरी"
      }
    },
    "telAviv": {
      "title": "तेल अवीव",
      "subtitle": "जीवंत शहर का अनुभव करें",
      "loadingContent": "तेल अवीव सामग्री लोड हो रही है...",
      "noContent": "इस समय कोई सामग्री उपलब्ध नहीं",
      "errorLoading": "तेल अवीव सामग्री लोड करने में विफल",
      "sources": "स्रोत",
      "categories": {
        "beaches": "🏖️ बीच और वॉटरफ्रंट",
        "nightlife": "🌃 नाइटलाइफ और मनोरंजन",
        "culture": "🎭 सांस्कृतिक कार्यक्रम",
        "music": "🎵 संगीत और कॉन्सर्ट",
        "food": "🍴 डाइनिंग और फूड सीन",
        "tech": "💻 तकनीक और नवाचार",
        "events": "📅 स्थानीय कार्यक्रम"
      }
    }
  },
  "catchup": {
    "title": "कैचअप",
    "subtitle": "चूके हुए प्रोग्राम देखें",
    "noContent": "कोई कैचअप सामग्री उपलब्ध नहीं",
    "watchNow": "अभी देखें",
    "airedOn": "प्रसारित",
    "expiresIn": "में समाप्त होता है"
  },
  "quota": {
    "title": "उपयोग कोटा",
    "subtitle": "अपने उपयोग सीमा की निगरानी करें",
    "used": "उपयोग किया",
    "remaining": "शेष",
    "unlimited": "असीमित",
    "upgradeForMore": "अधिक के लिए अपग्रेड करें"
  }
};

deepMerge(hi, translations);
fs.writeFileSync('hi.json', JSON.stringify(hi, null, 2) + '\n');
console.log('Part 4 complete - Chess, friends, stats, support, cities, etc. added');
