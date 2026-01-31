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
  "admin": {
    "refunds": {
      "subtitle": "रिफंड अनुरोध प्रबंधित करें",
      "approveModal": {
        "title": "अनुमोदन की पुष्टि करें",
        "message": "{{amount}} का रिफंड स्वीकृत करें?"
      },
      "confirmApprove": "{{amount}} का रिफंड स्वीकृत करें?",
      "confirmDelete": "रिफंड अनुरोध हटाएं?",
      "rejectModal": {
        "title": "रिफंड अनुरोध अस्वीकार करें",
        "message": "{{amount}} का रिफंड अस्वीकार कर रहा है",
        "reasonLabel": "अस्वीकृति का कारण",
        "reasonPlaceholder": "कृपया अस्वीकृति का कारण दर्ज करें...",
        "submitButton": "अनुरोध अस्वीकार करें"
      },
      "status": {
        "pending": "लंबित",
        "approved": "स्वीकृत",
        "rejected": "अस्वीकृत"
      },
      "columns": {
        "id": "ID",
        "user": "उपयोगकर्ता",
        "amount": "राशि",
        "reason": "कारण",
        "status": "स्थिति",
        "requestDate": "अनुरोध तिथि"
      },
      "stats": {
        "pendingTitle": "अनुमोदन लंबित",
        "approvedTitle": "स्वीकृत",
        "rejectedTitle": "अस्वीकृत",
        "totalRefunded": "कुल रिफंड"
      },
      "emptyMessage": "कोई रिफंड अनुरोध नहीं मिला",
      "errors": {
        "rejectReasonRequired": "कृपया अस्वीकृति का कारण दर्ज करें"
      },
      "title": "रिफंड"
    },
    "plans": {
      "title": "योजना प्रबंधन",
      "subtitle": "सब्सक्रिप्शन योजनाएं कॉन्फ़िगर और प्रबंधित करें",
      "createButton": "नई योजना",
      "inactive": "निष्क्रिय",
      "subscribersLabel": "सब्सक्राइबर:",
      "intervals": {
        "monthly": "महीना",
        "yearly": "वर्ष"
      },
      "trialDays": "{{days}} दिन का ट्रायल",
      "modal": {
        "editTitle": "योजना संपादित करें",
        "createTitle": "नई योजना"
      },
      "form": {
        "nameEn": "नाम (अंग्रेज़ी)",
        "nameHe": "नाम (हिब्रू)",
        "price": "कीमत ($)",
        "interval": "बिलिंग अवधि",
        "trialDays": "ट्रायल दिन",
        "features": "सुविधाएं (प्रति पंक्ति एक)",
        "active": "सक्रिय योजना"
      },
      "errors": {
        "requiredFields": "नाम और कीमत आवश्यक हैं"
      },
      "confirmDelete": "योजना \"{{name}}\" हटाएं?"
    },
    "emailCampaigns": {
      "subtitle": "ईमेल अभियान बनाएं और प्रबंधित करें",
      "createButton": "नया अभियान",
      "searchPlaceholder": "अभियान खोजें...",
      "emptyMessage": "कोई अभियान नहीं मिला",
      "status": {
        "draft": "ड्राफ्ट",
        "active": "सक्रिय",
        "scheduled": "शेड्यूल्ड",
        "completed": "पूर्ण"
      },
      "columns": {
        "name": "अभियान नाम",
        "status": "स्थिति",
        "sent": "भेजे गए",
        "opened": "खोले गए",
        "clicked": "क्लिक किए गए",
        "created": "बनाया गया",
        "actions": "कार्रवाइयां"
      },
      "editModal": {
        "title": "अभियान संपादित करें"
      },
      "sendTestEmail": "टेस्ट भेजें",
      "confirmSend": "अभियान \"{{name}}\" भेजें?",
      "confirmDelete": "अभियान \"{{name}}\" हटाएं?",
      "testEmailSent": "टेस्ट ईमेल भेजा गया!",
      "createModal": {
        "title": "नया ईमेल अभियान"
      },
      "form": {
        "name": "अभियान नाम",
        "namePlaceholder": "जैसे, वर्षांत बिक्री",
        "subject": "ईमेल विषय",
        "subjectPlaceholder": "प्राप्तकर्ताओं को दिखाया जाने वाला विषय",
        "body": "सामग्री",
        "bodyPlaceholder": "ईमेल सामग्री...",
        "submitButton": "अभियान बनाएं",
        "requiredFields": "नाम और विषय आवश्यक हैं"
      },
      "testModal": {
        "title": "टेस्ट ईमेल भेजें",
        "emailLabel": "ईमेल पता",
        "emailPlaceholder": "test@example.com",
        "submitButton": "टेस्ट भेजें"
      },
      "errors": {
        "requiredFields": "नाम और विषय आवश्यक हैं"
      }
    },
    "campaignEdit": {
      "subtitle": "अभियान विवरण और सेटिंग्स संपादित करें"
    },
    "dashboard": {
      "timeAgo": {
        "minutes": "{{count}} मिनट पहले",
        "hours": "{{count}} घंटे पहले"
      },
      "recentActivity": "हाल की गतिविधि",
      "quickActions": "त्वरित कार्रवाइयां"
    },
    "common": {
      "all": "सभी",
      "cancel": "रद्द करें",
      "save": "सहेजें",
      "active": "सक्रिय",
      "back": "वापस",
      "backToPodcasts": "पॉडकास्ट पर वापस जाएं",
      "savePodcast": "पॉडकास्ट सहेजें",
      "saveEpisode": "एपिसोड सहेजें",
      "filterAction": "कार्रवाई",
      "filterResource": "संसाधन",
      "filterUser": "उपयोगकर्ता",
      "filterDateRange": "तिथि सीमा"
    },
    "stats": {
      "totalUsers": "कुल उपयोगकर्ता",
      "activeUsers": "सक्रिय उपयोगकर्ता",
      "newToday": "आज नए",
      "newThisWeek": "इस सप्ताह नए",
      "totalRevenue": "कुल राजस्व",
      "revenueToday": "आज का राजस्व",
      "revenueMonth": "इस महीने का राजस्व",
      "arpu": "ARPU",
      "activeSubscriptions": "सक्रिय सब्सक्रिप्शन",
      "churnRate": "चर्न दर"
    },
    "actions": {
      "new": "नया",
      "addUser": "उपयोगकर्ता जोड़ें",
      "newCampaign": "नया अभियान",
      "sendEmail": "ईमेल भेजें",
      "viewReports": "रिपोर्ट देखें",
      "newPodcast": "नया पॉडकास्ट बनाएं",
      "newEpisode": "नया एपिसोड बनाएं"
    },
    "auditActions": {
      "user_created": "उपयोगकर्ता बनाया",
      "user_updated": "उपयोगकर्ता अपडेट किया",
      "user_deleted": "उपयोगकर्ता हटाया",
      "user_role_changed": "उपयोगकर्ता भूमिका बदली",
      "campaign_created": "अभियान बनाया",
      "campaign_updated": "अभियान अपडेट किया",
      "campaign_deleted": "अभियान हटाया",
      "campaign_activated": "अभियान सक्रिय किया",
      "subscription_created": "सब्सक्रिप्शन बनाई",
      "subscription_updated": "सब्सक्रिप्शन अपडेट की",
      "subscription_canceled": "सब्सक्रिप्शन रद्द की",
      "subscription_deleted": "सब्सक्रिप्शन हटाई",
      "refund_processed": "रिफंड प्रोसेस किया",
      "payment_received": "भुगतान प्राप्त",
      "settings_updated": "सेटिंग्स अपडेट की",
      "login": "लॉगिन",
      "logout": "लॉगआउट",
      "content_created": "सामग्री बनाई",
      "content_updated": "सामग्री अपडेट की",
      "content_deleted": "सामग्री हटाई",
      "content_published": "सामग्री प्रकाशित",
      "content_unpublished": "सामग्री अप्रकाशित",
      "category_created": "श्रेणी बनाई",
      "category_updated": "श्रेणी अपडेट की",
      "category_deleted": "श्रेणी हटाई",
      "live_channel_created": "लाइव चैनल बनाया",
      "live_channel_updated": "लाइव चैनल अपडेट किया",
      "live_channel_deleted": "लाइव चैनल हटाया",
      "radio_station_created": "रेडियो स्टेशन बनाया",
      "radio_station_updated": "रेडियो स्टेशन अपडेट किया",
      "radio_station_deleted": "रेडियो स्टेशन हटाया",
      "podcast_created": "पॉडकास्ट बनाया",
      "podcast_updated": "पॉडकास्ट अपडेट किया",
      "podcast_deleted": "पॉडकास्ट हटाया",
      "podcast_episode_created": "पॉडकास्ट एपिसोड बनाया",
      "podcast_episode_updated": "पॉडकास्ट एपिसोड अपडेट किया",
      "podcast_episode_deleted": "पॉडकास्ट एपिसोड हटाया",
      "content_imported": "सामग्री आयातित",
      "widget_created": "विजेट बनाया",
      "widget_updated": "विजेट अपडेट किया",
      "widget_deleted": "विजेट हटाया",
      "widget_published": "विजेट प्रकाशित",
      "widget_unpublished": "विजेट अप्रकाशित"
    },
    "placeholder": {
      "userId": "उपयोगकर्ता ID दर्ज करें",
      "discount": "0"
    },
    "titles": {
      "users": "उपयोगकर्ता",
      "transactions": "लेनदेन",
      "subscriptions": "सब्सक्रिप्शन",
      "refunds": "रिफंड",
      "plans": "योजनाएं",
      "campaigns": "अभियान",
      "auditLogs": "ऑडिट लॉग",
      "pushNotifications": "पुश नोटिफिकेशन",
      "billing": "बिलिंग",
      "marketing": "मार्केटिंग",
      "content": "सामग्री लाइब्रेरी",
      "categories": "श्रेणियां",
      "liveChannels": "लाइव चैनल",
      "librarian": "लाइब्रेरियन एजेंट",
      "radioStations": "रेडियो स्टेशन",
      "podcasts": "पॉडकास्ट",
      "settings": "सेटिंग्स"
    },
    "nav": {
      "campaigns": "अभियान",
      "billing": "बिलिंग",
      "billingOverview": "अवलोकन",
      "transactions": "लेनदेन",
      "refunds": "रिफंड",
      "subscriptions": "सब्सक्रिप्शन",
      "subscriptionsList": "सब्सक्राइबर",
      "plans": "योजनाएं",
      "marketing": "मार्केटिंग",
      "marketingDashboard": "अवलोकन",
      "emailCampaigns": "ईमेल अभियान",
      "pushNotifications": "पुश नोटिफिकेशन",
      "contentLibrary": "सामग्री लाइब्रेरी",
      "categories": "श्रेणियां",
      "liveChannels": "लाइव चैनल",
      "radioStations": "रेडियो स्टेशन",
      "widgets": "विजेट",
      "recordings": "रिकॉर्डिंग",
      "uploads": "अपलोड",
      "auditLogs": "ऑडिट लॉग",
      "librarian": "लाइब्रेरियन एजेंट",
      "liveQuotas": "लाइव कोटा",
      "featured": "फीचर्ड",
      "translations": "अनुवाद"
    }
  },
  "catchup": {
    "title": "कैचअप",
    "subtitle": "चूके हुए प्रोग्राम देखें",
    "noContent": "कोई कैचअप सामग्री उपलब्ध नहीं",
    "watchNow": "अभी देखें",
    "airedOn": "प्रसारित",
    "expiresIn": "में समाप्त होता है",
    "available": "कैचअप उपलब्ध",
    "expired": "समाप्त",
    "hoursLeft": "{{count}} घंटे शेष"
  },
  "channelChat": {
    "title": "चैनल चैट",
    "placeholder": "संदेश टाइप करें...",
    "send": "भेजें",
    "joinChat": "चैट में शामिल हों",
    "viewers": "दर्शक",
    "rules": "चैट नियम"
  },
  "quota": {
    "title": "उपयोग कोटा",
    "subtitle": "अपने उपयोग सीमा की निगरानी करें",
    "used": "उपयोग किया",
    "remaining": "शेष",
    "unlimited": "असीमित",
    "upgradeForMore": "अधिक के लिए अपग्रेड करें",
    "resetDate": "रीसेट तिथि",
    "currentUsage": "वर्तमान उपयोग"
  },
  "support": {
    "videos": {
      "title": "ट्यूटोरियल वीडियो",
      "subtitle": "Bayit+ सुविधाओं का उपयोग कैसे करें सीखें",
      "widgetsIntro": "विजेट के साथ शुरू करें",
      "widgetsDescription": "फ्लोटिंग विजेट बनाना, अनुकूलित करना और प्रबंधित करना सीखें",
      "loading": "वीडियो लोड हो रहे हैं...",
      "loadError": "वीडियो लोड करने में विफल"
    }
  },
  "cities": {
    "privacy": {
      "lastUpdated": "अंतिम अपडेट: 27 जनवरी, 2026",
      "intro": {
        "title": "1. परिचय",
        "content": "Olorin.ai LLC (\"हम,\" \"हमारा,\" या \"कंपनी\") आपकी गोपनीयता की रक्षा के लिए प्रतिबद्ध है। यह गोपनीयता नीति बताती है कि हमारा मोबाइल एप्लिकेशन, Bayit+ (\"ऐप\"), आपकी जानकारी कैसे एकत्र करता है, उपयोग करता है और सुरक्षित रखता है।",
        "commitment": "हमने Bayit+ को \"गोपनीयता-प्रथम\" आर्किटेक्चर के साथ बनाया है। हम आपके लिविंग रूम को रिकॉर्ड नहीं करते। हमारी तकनीक आपके डिवाइस के सेंसर का उपयोग केवल हमारी ऑडियो सेवा को आपके टेलीविज़न के साथ सिंक्रनाइज़ करने के लिए करती है।"
      },
      "collection": {
        "title": "2. हम क्या जानकारी एकत्र करते हैं और कैसे उपयोग करते हैं",
        "camera": {
          "title": "A. कैमरा और विज़ुअल सिंक्रनाइज़ेशन डेटा",
          "intro": "हमारी मुख्य सेवा प्रदान करने के लिए—अनुवादित ऑडियो को आपके TV के साथ सिंक्रनाइज़ करना—Bayit+ को आपके डिवाइस के कैमरा तक पहुंच की आवश्यकता है।",
          "data": "एकत्रित डेटा: जब आप \"सिंक मोड\" सक्रिय करते हैं, तो ऐप आपकी TV स्क्रीन से वीडियो फ्रेम का एक छोटा अनुक्रम (लगभग 3 सेकंड) कैप्चर करता है।",
          "purpose": "उद्देश्य: ये फ्रेम हमारे सुरक्षित क्लाउड सर्वर पर केवल उस सार्वजनिक TV चैनल की पहचान करने और प्रसारण विलंबता (समय देरी) की गणना करने के लिए प्रेषित किए जाते हैं जो आप देख रहे हैं।",
          "retention": "प्रतिधारण: यह डेटा अल्पकालिक है। फ्रेम तुरंत मेमोरी में प्रोसेस होते हैं और सिंक्रनाइज़ेशन स्थापित होने के तुरंत बाद स्थायी रूप से हटा दिए जाते हैं। हम आपके घर या परिवार की छवियों को नहीं देखते, संग्रहीत नहीं करते, या संग्रह नहीं करते।"
        },
        "audio": {
          "title": "B. ऑडियो डेटा (यदि लागू हो)",
          "intro": "यदि आप ऑडियो सिंक्रनाइज़ेशन की आवश्यकता वाली सुविधाओं का उपयोग करते हैं, तो ऐप माइक्रोफोन एक्सेस का अनुरोध कर सकता है।",
          "data": "एकत्रित डेटा: TV प्रसारण के संक्षिप्त ऑडियो नमूने।",
          "purpose": "उद्देश्य: सिंक्रनाइज़ेशन उद्देश्यों के लिए सार्वजनिक प्रसारण के ऑडियो फिंगरप्रिंट का मिलान करना।",
          "retention": "प्रतिधारण: विज़ुअल डेटा की तरह, ऑडियो नमूने रीयल-टाइम में प्रोसेस किए जाते हैं और तुरंत हटा दिए जाते हैं। हम उपयोगकर्ता की बातचीत को नहीं सुनते या रिकॉर्ड नहीं करते।"
        },
        "usage": {
          "title": "C. उपयोग और तकनीकी डेटा",
          "content": "हम ऐप स्थिरता में सुधार के लिए गैर-पहचान योग्य तकनीकी डेटा एकत्र कर सकते हैं, जिसमें शामिल हैं:",
          "device": "डिवाइस प्रकार और ऑपरेटिंग सिस्टम संस्करण।",
          "crash": "क्रैश लॉग और प्रदर्शन मेट्रिक्स।",
          "aggregate": "कौन से चैनल देखे जा रहे हैं इस पर समग्र डेटा (जैसे, \"50% उपयोगकर्ता चैनल 12 देख रहे हैं\")।"
        }
      },
      "sharing": {
        "title": "3. डेटा साझाकरण और तृतीय पक्ष",
        "noSale": "Olorin.ai LLC आपका व्यक्तिगत डेटा नहीं बेचता। हम अपने बुनियादी ढांचे को वितरित करने के लिए विश्वसनीय तृतीय-पक्ष सेवा प्रदाताओं के साथ साझेदारी करते हैं। इन प्रदाताओं को आपके डेटा का उपयोग केवल हमें ये सेवाएं प्रदान करने के लिए आवश्यक होने पर ही करने के लिए अधिकृत किया गया है:",
        "cloud": "क्लाउड इंफ्रास्ट्रक्चर: सिंक्रनाइज़ेशन अनुरोधों को प्रोसेस करने के लिए होस्टिंग सेवाएं (जैसे, AWS)।",
        "ai": "AI प्रोसेसिंग: सार्वजनिक प्रसारण फीड से रीयल-टाइम टेक्स्ट और ऑडियो अनुवाद जनरेट करने के लिए उपयोग की जाने वाली सेवाएं।"
      }
    }
  }
};

deepMerge(hi, translations);
fs.writeFileSync('hi.json', JSON.stringify(hi, null, 2) + '\n');
console.log('Part 5 complete - Admin section and remaining keys added');
