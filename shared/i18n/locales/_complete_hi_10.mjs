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
  admin: {
    uploads: {
      title: "अपलोड प्रबंधन",
      subtitle: "फोल्डर मॉनिटर करें और सामग्री अपलोड प्रबंधित करें",
      queueDashboard: {
        title: "अपलोड कतार डैशबोर्ड",
        stats: "कतार आंकड़े",
        total: "कुल",
        queued: "कतार में",
        active: "सक्रिय",
        done: "पूर्ण",
        activeJob: "सक्रिय अपलोड",
        queuedJobs: "कतारबद्ध अपलोड",
        recentCompleted: "हाल की पूर्णताएं",
        noActiveJob: "कोई सक्रिय अपलोड नहीं",
        noActiveJobDescription: "कतार खाली है। प्रोसेसिंग शुरू करने के लिए फ़ाइलें अपलोड करें या मॉनिटर किए गए फोल्डर स्कैन करें।",
        noQueuedJobs: "कोई लंबित अपलोड नहीं",
        noQueuedJobsDescription: "सभी फ़ाइलें प्रोसेस हो चुकी हैं। जारी रखने के लिए और फ़ाइलें जोड़ें।",
        noRecentCompleted: "कोई हाल की पूर्णता नहीं",
        noRecentCompletedDescription: "सफलतापूर्वक अपलोड की गई फ़ाइलें यहां दिखाई देंगी।",
        queuePausedWarning: "कतार रुकी हुई है: {{reason}}",
        resumeQueue: "कतार फिर से शुरू करें",
        pauseQueue: "कतार रोकें",
        clearQueue: "कतार साफ करें"
      },
      manualUpload: {
        title: "मैनुअल अपलोड",
        subtitle: "अपने डिवाइस से सीधे फ़ाइलें अपलोड करें",
        browserUpload: "ब्राउज़र अपलोड",
        urlUpload: "URL आयात",
        contentType: "सामग्री प्रकार",
        contentTypeHelp: "अपलोड की जा रही सामग्री का प्रकार चुनें",
        contentTypeRequired: "कृपया एक सामग्री प्रकार चुनें",
        dropZone: "ड्रॉप ज़ोन",
        dropZoneAriaLabel: "फ़ाइल अपलोड ड्रॉपज़ोन। फ़ाइलें चुनने के लिए क्लिक करें या Enter दबाएं, या फ़ाइलें यहां खींचें",
        dropHere: "वीडियो फ़ाइलें यहां खींचें या ब्राउज़ करने के लिए क्लिक करें",
        dropHereActive: "अपलोड करने के लिए फ़ाइलें छोड़ें",
        dragOrClick: "फ़ाइलें यहां खींचें और छोड़ें, या चुनने के लिए क्लिक करें",
        dropFiles: "फ़ाइलें यहां छोड़ें",
        acceptedFormats: "स्वीकृत प्रारूप",
        maxSize: "अधिकतम फ़ाइल आकार",
        invalidFiles: "{{count}} फ़ाइलें अस्वीकृत",
        tapToSelect: "फ़ाइलें चुनने के लिए टैप करें",
        browseFiles: "फ़ाइलें ब्राउज़ करें",
        selectFiles: "फ़ाइलें चुनें",
        supportedFormats: "समर्थित: MP4, MKV, AVI, MOV, WEBM (अधिकतम {{maxSize}})",
        fileList: "अपलोड के लिए चयनित फ़ाइलें",
        fileListEmpty: "कोई फ़ाइल चयनित नहीं",
        fileListEmptyDescription: "अपलोड के लिए फ़ाइलें चुनने के लिए ऊपर फ़ाइल चयनकर्ता का उपयोग करें",
        fileItem: "फ़ाइल: {{name}}, आकार: {{size}}, प्रगति: {{progress}}%",
        fileName: "फ़ाइल नाम",
        fileSize: "आकार",
        fileType: "प्रकार",
        fileProgress: "प्रगति",
        fileStatus: "स्थिति",
        removeFile: "{{name}} हटाएं",
        removeFileHint: "इस फ़ाइल को अपलोड कतार से हटाएं",
        fileRemoved: "{{name}} अपलोड कतार से हटाया गया",
        selectedFiles: "{{count}} फ़ाइलें चयनित",
        selectedFilesOne: "1 फ़ाइल चयनित",
        selectedFilesOther: "{{count}} फ़ाइलें चयनित",
        totalSize: "कुल आकार: {{size}}",
        clearAll: "सभी साफ करें",
        clearAllHint: "अपलोड कतार से सभी फ़ाइलें हटाएं",
        clearAllConfirm: "सभी {{count}} फ़ाइलें हटाएं?",
        uploadFiles: "फ़ाइलें अपलोड करें",
        uploading: "अपलोड हो रहा है...",
        uploadingFiles: "{{count}} फ़ाइलें अपलोड हो रही हैं...",
        uploadProgress: "अपलोड हो रहा है: {{percent}}% पूर्ण",
        uploadComplete: "अपलोड पूर्ण",
        uploadSuccess: "{{count}} फ़ाइलें सफलतापूर्वक अपलोड हुईं",
        uploadSuccessOne: "1 फ़ाइल सफलतापूर्वक अपलोड हुई",
        uploadSuccessOther: "{{count}} फ़ाइलें सफलतापूर्वक अपलोड हुईं",
        uploadPartialSuccess: "{{total}} में से {{successful}} फ़ाइलें अपलोड हुईं। {{failed}} विफल।",
        uploadFailed: "अपलोड विफल: {{error}}",
        cancelUpload: "अपलोड रद्द करें",
        retryUpload: "अपलोड पुनः प्रयास करें",
        retryFailed: "विफल फ़ाइलों का पुनः प्रयास करें"
      }
    }
  },
  support: {
    tabs: {
      videos: "वीडियो"
    }
  },
  cities: {
    privacy: {
      retention: {
        title: "4. डेटा प्रतिधारण",
        sync: "सिंक डेटा (छवियां/ऑडियो): 0 दिन। प्रोसेसिंग के तुरंत बाद हटाया जाता है।",
        account: "खाता डेटा: आपकी सदस्यता और प्राथमिकताओं को प्रबंधित करने के लिए केवल तब तक रखा जाता है जब तक आपका खाता सक्रिय है।"
      },
      children: {
        title: "5. बच्चों की गोपनीयता",
        content: "जबकि हमारी सामग्री सभी उम्र के लिए उपयुक्त है, Olorin.ai LLC जानबूझकर 13 वर्ष से कम उम्र के बच्चों से व्यक्तिगत पहचान योग्य जानकारी एकत्र नहीं करता है। यदि आप माता-पिता हैं और मानते हैं कि आपके बच्चे ने हमें व्यक्तिगत जानकारी प्रदान की है, तो कृपया हमसे संपर्क करें।"
      },
      rights: {
        title: "6. आपके अधिकार",
        content: "आपके स्थान के आधार पर, आपके पास अपने व्यक्तिगत डेटा तक पहुंच, सुधार या हटाने का अनुरोध करने का अधिकार हो सकता है। आप किसी भी समय ऐप सेटिंग्स में अपना Bayit+ खाता हटा सकते हैं।"
      },
      contact: {
        title: "7. हमसे संपर्क करें",
        intro: "यदि इस गोपनीयता नीति के बारे में आपके कोई प्रश्न हैं, तो कृपया हमसे संपर्क करें:"
      }
    },
    beta: {
      credits: {
        loading: "क्रेडिट बैलेंस लोड हो रहा है...",
        error: "क्रेडिट बैलेंस लोड करने में असमर्थ",
        label: "AI क्रेडिट",
        remaining: "शेष क्रेडिट",
        warningCritical: "गंभीर: क्रेडिट कम हो रहे हैं",
        warningLow: "चेतावनी: क्रेडिट बैलेंस कम है",
        upgrade: "प्लान अपग्रेड करें",
        upgradeAction: "और क्रेडिट पाने के लिए अपग्रेड करें"
      },
      settings: {
        title: "बीटा कार्यक्रम",
        description: "अपना Beta 500 नामांकन प्रबंधित करें और कार्यक्रम विवरण देखें। AI-संचालित सुविधाओं तक जल्दी पहुंच प्राप्त करें।",
        enrolledTitle: "आप Beta 500 में हैं!",
        statusPendingVerification: "सत्यापन लंबित",
        statusActive: "सक्रिय",
        statusExpired: "समाप्त",
        pendingMessage: "हम आपके नामांकन की पुष्टि कर रहे हैं। स्वीकृत होने पर आपको ईमेल प्राप्त होगा।",
        expiresOn: "{{date}} को समाप्त होगा",
        loadingStatus: "कार्यक्रम स्थिति लोड हो रही है...",
        errorLoading: "कार्यक्रम जानकारी लोड करने में असमर्थ। कृपया पुनः प्रयास करें।",
        programStatus: "कार्यक्रम स्थिति",
        slots: "स्लॉट भरे हुए",
        slotsAvailable: "{{count}} स्लॉट उपलब्ध",
        programFull: "सभी 500 स्लॉट भर गए"
      },
      enrollment: {
        title: "Beta 500 में शामिल हों",
        subtitle: "AI-संचालित सुविधाओं का अनुभव करने वाले 500 परिवारों में से एक बनें",
        programFull: "कार्यक्रम भर गया",
        joinButton: "Beta 500 में शामिल हों",
        exclusiveAccess: "विशेष पहुंच",
        limitedSlots: "500 परिवारों तक सीमित",
        slotsAvailable: "{{total}} में से {{available}} स्लॉट उपलब्ध",
        freeCredits: "मुफ्त AI क्रेडिट",
        creditsAmount: "5,000 क्रेडिट ($50 मूल्य)",
        duration: "बीटा अवधि",
        durationValue: "90 दिन",
        features: "AI सुविधाएं",
        featuresValue: "लाइव डबिंग, AI खोज, सिफारिशें",
        whatYouGet: "आपको क्या मिलेगा",
        benefits: {
          liveDubbing: "देखते समय रीयल-टाइम ऑडियो अनुवाद",
          aiSearch: "बुद्धिमान सामग्री खोज",
          aiRecommendations: "व्यक्तिगत सुझाव",
          prioritySupport: "विकास टीम तक सीधी पहुंच"
        },
        disclaimer: "Beta 500 एक सीमित समय का कार्यक्रम है। बीटा अवधि के दौरान क्रेडिट नवीकरणीय नहीं हैं।",
        waitlistMessage: "सभी 500 स्लॉट वर्तमान में भरे हुए हैं। स्लॉट उपलब्ध होने पर सूचित होने के लिए प्रतीक्षा सूची में शामिल हों।",
        enrollmentSuccess: "Beta 500 में आपका स्वागत है! अपना खाता सत्यापित करने के लिए अपना ईमेल जांचें।",
        enrollmentError: "नामांकन करने में असमर्थ। कृपया बाद में पुनः प्रयास करें।"
      }
    }
  },
  catchup: {
    overlay: {
      title: "अभी जुड़े?",
      description: "आप {{programName}} में बीच में शामिल हुए",
      creditContext: "यह आपके {{balance}} क्रेडिट में से {{cost}} का उपयोग करेगा",
      lowBalanceWarning: "कम क्रेडिट शेष",
      acceptButton: "मुझे अपडेट करें ({{cost}} क्रेडिट)",
      declineButton: "नहीं धन्यवाद"
    },
    button: {
      credits: "कैच अप ({{cost}} क्रेडिट)",
      label: "कैच अप सारांश",
      title: "कैच अप"
    },
    generating: "सारांश तैयार हो रहा है...",
    summary: {
      title: "आपने क्या मिस किया",
      keyPoints: "मुख्य बिंदु",
      windowInfo: "पिछले {{minutes}} मिनट",
      creditsUsed: "{{count}} क्रेडिट उपयोग किए",
      creditsRemaining: "{{count}} क्रेडिट शेष",
      close: "बंद करें"
    },
    error: {
      failed: "सारांश तैयार नहीं किया जा सका",
      retry: "पुनः प्रयास करें",
      insufficientCredits: "पर्याप्त क्रेडिट नहीं"
    }
  },
  quota: {
    subtitleExceeded: "उपशीर्षक कोटा पार हो गया। कृपया बाद में पुनः प्रयास करें।",
    dubbingExceeded: "डबिंग कोटा पार हो गया। कृपया बाद में पुनः प्रयास करें।"
  },
  channelChat: {
    error: "चैट से कनेक्ट करने में असमर्थ",
    retry: "पुनः कनेक्ट करें",
    participants: "{{count}} दर्शक",
    participants_one: "{{count}} दर्शक",
    participants_other: "{{count}} दर्शक",
    showOriginal: "मूल दिखाएं",
    showTranslation: "अनुवाद करें",
    userJoined: "{{name}} चैट में शामिल हुए",
    userLeft: "एक उपयोगकर्ता चैट छोड़ गया",
    translationBeta: "अनुवाद (बीटा)"
  }
};

deepMerge(hi, translations);
fs.writeFileSync('hi.json', JSON.stringify(hi, null, 2) + '\n');
console.log('Part 10 complete - admin.uploads, support.tabs, cities.privacy, cities.beta, catchup, quota, channelChat');
