import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const hiPath = join(__dirname, 'hi.json');

const hi = JSON.parse(readFileSync(hiPath, 'utf8'));

// Deep merge helper
function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

const adminAdditions = {
  uploads: {
    urlUpload: {
      title: "URL से आयात करें",
      subtitle: "दूरस्थ URL से वीडियो फ़ाइलें आयात करें",
      urlLabel: "वीडियो URL",
      urlPlaceholder: "https://example.com/video.mp4",
      urlHelp: "वीडियो फ़ाइल का सीधा URL दर्ज करें",
      urlRequired: "URL आवश्यक है",
      importButton: "URL से आयात करें",
      importing: "आयात हो रहा है...",
      importSuccess: "URL से सफलतापूर्वक आयात किया गया",
      importFailed: "आयात विफल: {{error}}",
      invalidUrl: "कृपया एक मान्य URL दर्ज करें",
      urlMustBeHttps: "URL को HTTPS प्रोटोकॉल का उपयोग करना चाहिए",
      emptyUrlList: "कोई URL आयात नहीं किया गया",
      emptyUrlListDescription: "दूरस्थ स्रोतों से वीडियो फ़ाइलें आयात करने के लिए ऊपर URL दर्ज करें",
      addUrl: "URL जोड़ें",
      removeUrl: "URL हटाएं"
    },
    monitoredFolders: {
      title: "निगरानी किए गए फ़ोल्डर",
      subtitle: "सामग्री को स्वचालित रूप से पहचानने और अपलोड करने के लिए फ़ोल्डर कॉन्फ़िगर करें",
      noFolders: "कोई निगरानी किए गए फ़ोल्डर नहीं",
      noFoldersDescription: "स्वचालित सामग्री पहचान और अपलोड सक्षम करने के लिए फ़ोल्डर जोड़ें",
      addFolder: "फ़ोल्डर जोड़ें",
      editFolder: "फ़ोल्डर संपादित करें",
      deleteFolder: "फ़ोल्डर हटाएं",
      scanFolder: "फ़ोल्डर स्कैन करें",
      scanFolderHint: "नई फ़ाइलों के लिए फ़ोल्डर जांचें और अपलोड कतार में जोड़ें",
      scanning: "स्कैन हो रहा है...",
      scanComplete: "स्कैन पूरा: {{count}} फ़ाइल(ें) मिलीं",
      scanCompleteOne: "स्कैन पूरा: 1 फ़ाइल मिली",
      scanCompleteOther: "स्कैन पूरा: {{count}} फ़ाइलें मिलीं",
      noFilesFound: "फ़ोल्डर में कोई नई फ़ाइलें नहीं मिलीं",
      scanFailed: "स्कैन विफल: {{error}}",
      folderName: "फ़ोल्डर का नाम",
      folderPath: "फ़ोल्डर पथ",
      folderStatus: "स्थिति",
      folderEnabled: "सक्षम",
      folderDisabled: "अक्षम",
      lastScan: "अंतिम स्कैन",
      neverScanned: "कभी स्कैन नहीं किया गया",
      filesDetected: "{{count}} फ़ाइल(ें) पाई गईं",
      confirmDelete: "{{name}} को हटाएं?",
      confirmDeleteMessage: "इससे इस फ़ोल्डर की निगरानी बंद हो जाएगी। मौजूदा अपलोड प्रभावित नहीं होंगे।",
      deleteSuccess: "फ़ोल्डर सफलतापूर्वक हटाया गया",
      deleteFailed: "फ़ोल्डर हटाने में विफल: {{error}}",
      form: {
        title: "फ़ोल्डर कॉन्फ़िगरेशन",
        name: "फ़ोल्डर का नाम",
        namePlaceholder: "उदा., फ़िल्म संग्रह",
        nameRequired: "फ़ोल्डर का नाम आवश्यक है",
        nameHelp: "इस फ़ोल्डर के लिए विवरणात्मक नाम",
        path: "फ़ोल्डर पथ",
        pathPlaceholder: "/path/to/folder",
        pathHelp: "निगरानी के लिए पूरा पथ दर्ज करें",
        pathRequired: "फ़ोल्डर पथ आवश्यक है",
        pathInvalid: "अमान्य फ़ोल्डर पथ",
        pathReadOnly: "निर्माण के बाद पथ बदला नहीं जा सकता",
        enabled: "सक्षम",
        enabledHelp: "इस फ़ोल्डर की निगरानी सक्षम या अक्षम करें",
        autoUpload: "स्वचालित अपलोड",
        autoUploadHelp: "इस फ़ोल्डर में पाई गई नई फ़ाइलें स्वचालित रूप से अपलोड करें",
        contentType: "सामग्री प्रकार",
        contentTypeHelp: "इस फ़ोल्डर में सामग्री का प्रकार",
        saveButton: "फ़ोल्डर सहेजें",
        cancelButton: "रद्द करें",
        saving: "सहेजा जा रहा है..."
      }
    },
    dryRun: {
      title: "ड्राई रन मोड",
      enabled: "ड्राई रन सक्षम",
      disabled: "ड्राई रन अक्षम",
      description: "फ़ाइलें वास्तव में स्थानांतरित किए बिना अपलोड का पूर्वावलोकन करें",
      descriptionDetailed: "सक्षम होने पर, फ़ाइलों को सत्यापित किया जाएगा और मेटाडेटा निकाला जाएगा, लेकिन स्टोरेज पर अपलोड नहीं किया जाएगा। बिना परिवर्तन किए अपलोड का परीक्षण करने के लिए इसका उपयोग करें।",
      toggle: "ड्राई रन सक्षम करें",
      toggleHint: "सुरक्षित अपलोड परीक्षण के लिए ड्राई रन मोड टॉगल करें",
      previewTitle: "ड्राई रन परिणाम",
      previewDescription: "अपलोड के साथ आगे बढ़ने पर क्या होगा इसकी समीक्षा करें",
      validFiles: "मान्य फ़ाइलें ({{count}})",
      invalidFiles: "अमान्य फ़ाइलें ({{count}})",
      warnings: "चेतावनियां ({{count}})",
      proceedButton: "अपलोड के साथ आगे बढ़ें",
      proceedHint: "ड्राई रन अक्षम करें और वास्तविक अपलोड करें",
      cancelButton: "रद्द करें",
      noResults: "कोई ड्राई रन परिणाम उपलब्ध नहीं"
    },
    connectionStatus: {
      connected: "कनेक्टेड",
      disconnected: "डिस्कनेक्टेड",
      reconnecting: "पुनः कनेक्ट हो रहा है...",
      reconnectAttempt: "पुनः कनेक्ट हो रहा है (प्रयास {{current}} / {{max}})",
      connectionLost: "कतार की स्थिति स्वचालित रूप से अपडेट नहीं होगी",
      connectionLostDescription: "कनेक्शन टूट गया। नवीनतम कतार स्थिति देखने के लिए रिफ्रेश बटन का उपयोग करें। हम पुनः कनेक्ट करने का प्रयास कर रहे हैं...",
      connectionLostAnnouncement: "कनेक्शन टूट गया। रीयल-टाइम अपडेट रुके हुए हैं। मैन्युअल अपडेट के लिए रिफ्रेश बटन का उपयोग करें।",
      connectedAnnouncement: "अपलोड सेवा से कनेक्ट है। रीयल-टाइम अपडेट सक्रिय हैं।",
      reconnectingAnnouncement: "अपलोड सेवा से पुनः कनेक्ट हो रहा है। प्रयास {{attempt}} / {{maxAttempts}}।",
      troubleshooting: "समस्या निवारण",
      troubleshootingSteps: [
        "अपना इंटरनेट कनेक्शन जांचें",
        "सत्यापित करें कि सर्वर चल रहा है",
        "अपना प्रमाणीकरण टोकन जांचें",
        "पेज को रिफ्रेश करने का प्रयास करें"
      ],
      manualRefresh: "मैन्युअल रिफ्रेश",
      manualRefreshHint: "कतार डेटा को मैन्युअल रूप से रिफ्रेश करें",
      refreshing: "रिफ्रेश हो रहा है..."
    },
    contentTypes: {
      movie: "फ़िल्म",
      series: "सीरीज़",
      podcast: "पॉडकास्ट",
      other: "अन्य"
    },
    stages: {
      browserUpload: "ब्राउज़र अपलोड",
      hashCalculation: "हैश गणना",
      duplicateCheck: "डुप्लिकेट जांच",
      metadataExtraction: "मेटाडेटा निष्कर्षण",
      gcsUpload: "क्लाउड अपलोड",
      databaseInsert: "डेटाबेस प्रविष्टि",
      complete: "पूर्ण",
      failed: "विफल"
    },
    status: {
      queued: "कतार में",
      processing: "प्रोसेसिंग",
      uploading: "अपलोड हो रहा है",
      complete: "पूर्ण",
      failed: "विफल",
      cancelled: "रद्द",
      skipped: "छोड़ दिया गया (डुप्लिकेट)"
    },
    actions: {
      pauseQueue: "कतार रोकें",
      resumeQueue: "कतार फिर से शुरू करें",
      clearQueue: "कतार साफ़ करें",
      clearQueueConfirm: "अपलोड कतार साफ़ करें?",
      clearQueueConfirmMessage: "इससे {{count}} लंबित अपलोड रद्द हो जाएंगे। यह कार्रवाई पूर्ववत नहीं की जा सकती।",
      triggerUpload: "फ़ोल्डर स्कैन करें",
      triggerUploadHint: "नई फ़ाइलों के लिए सभी निगरानी किए गए फ़ोल्डर स्कैन करें",
      triggerUploadSuccess: "अपलोड के लिए {{files_found}} फ़ाइल(ें) मिलीं",
      triggerUploadFailed: "स्कैन विफल: {{error}}",
      refresh: "रिफ्रेश",
      refreshHint: "कतार डेटा पुनः लोड करें",
      cancel: "रद्द करें",
      retry: "पुनः प्रयास",
      remove: "हटाएं"
    },
    errors: {
      loadFailed: "अपलोड डेटा लोड करने में विफल",
      loadFailedDescription: "अपलोड कतार प्राप्त करने में असमर्थ। कृपया रिफ्रेश करने का प्रयास करें।",
      saveFailed: "फ़ोल्डर कॉन्फ़िगरेशन सहेजने में विफल",
      saveFailedDescription: "निगरानी किए गए फ़ोल्डर को सहेजने में असमर्थ। कृपया पुनः प्रयास करें।",
      deleteFailed: "निगरानी किए गए फ़ोल्डर को हटाने में विफल",
      uploadFailed: "अपलोड विफल",
      uploadFailedDescription: "एक या अधिक फ़ाइलें अपलोड करने में विफल। विवरण के लिए फ़ाइल सूची जांचें।",
      resumeFailed: "कतार फिर से शुरू करने में विफल",
      clearFailed: "कतार साफ़ करने में विफल",
      triggerFailed: "अपलोड स्कैन शुरू करने में विफल",
      pathRequired: "फ़ोल्डर पथ आवश्यक है",
      invalidPath: "अमान्य फ़ोल्डर पथ",
      pathTraversal: "पथ में अमान्य वर्ण या ट्रैवर्सल प्रयास हैं",
      networkError: "नेटवर्क त्रुटि। कृपया अपना कनेक्शन जांचें।",
      authError: "प्रमाणीकरण त्रुटि। कृपया पुनः लॉग इन करें।",
      serverError: "सर्वर त्रुटि। कृपया बाद में पुनः प्रयास करें।",
      fileTooBig: "फ़ाइल अधिकतम आकार {{maxSize}} से अधिक है",
      invalidFileType: "अमान्य फ़ाइल प्रकार। समर्थित प्रारूप: {{formats}}",
      duplicateFile: "यह फ़ाइल पहले से अपलोड की जा चुकी है",
      rateLimitExceeded: "दर सीमा पार हो गई। कृपया और फ़ाइलें अपलोड करने से पहले प्रतीक्षा करें।",
      configValidationFailed: "कॉन्फ़िगरेशन सत्यापन विफल। विवरण के लिए कंसोल जांचें।",
      websocketAuthFailed: "वेबसॉकेट प्रमाणीकरण विफल",
      unsupportedBrowser: "आपका ब्राउज़र आवश्यक सुविधाओं का समर्थन नहीं करता"
    },
    mobile: {
      dataWarning: "आप सेलुलर डेटा पर हैं। {{size}} अपलोड करने से काफ़ी डेटा खर्च हो सकता है।",
      dataWarningProceed: "फिर भी आगे बढ़ें",
      dataWarningCancel: "अपलोड रद्द करें",
      lowMemoryWarning: "डिवाइस मेमोरी कम है। बड़े अपलोड विफल हो सकते हैं।",
      batteryLowWarning: "बैटरी कम है ({{percent}}%)। अपलोड बाधित हो सकते हैं।",
      networkChanged: "नेटवर्क बदल गया। पुनः कनेक्ट हो रहा है...",
      mobileBrowserNotSupported: "मोबाइल ब्राउज़र पर कुछ सुविधाएं काम नहीं कर सकतीं"
    },
    accessibility: {
      pageDescription: "कतार निगरानी, मैन्युअल अपलोड और फ़ोल्डर निगरानी के साथ अपलोड प्रबंधन इंटरफ़ेस",
      pageTitle: "एडमिन अपलोड पेज",
      sectionQueue: "कतार डैशबोर्ड अनुभाग",
      sectionManualUpload: "मैन्युअल अपलोड अनुभाग",
      sectionMonitoredFolders: "निगरानी किए गए फ़ोल्डर अनुभाग",
      loadingQueue: "अपलोड कतार लोड हो रही है...",
      queueLoaded: "अपलोड कतार {{count}} आइटम के साथ लोड हुई",
      queueLoadedOne: "अपलोड कतार 1 आइटम के साथ लोड हुई",
      queueLoadedOther: "अपलोड कतार {{count}} आइटम के साथ लोड हुई",
      uploadStarted: "{{count}} फ़ाइलों के लिए अपलोड शुरू हुआ",
      uploadStartedOne: "1 फ़ाइल के लिए अपलोड शुरू हुआ",
      uploadStartedOther: "{{count}} फ़ाइलों के लिए अपलोड शुरू हुआ",
      uploadProgressUpdate: "अपलोड प्रगति: {{percent}}% पूर्ण",
      uploadProgressMilestone: "अपलोड {{percent}}% पूर्ण",
      uploadCompleted: "अपलोड सफलतापूर्वक पूर्ण",
      uploadFailed: "अपलोड विफल",
      folderAdded: "फ़ोल्डर {{name}} निगरानी में जोड़ा गया",
      folderRemoved: "फ़ोल्डर {{name}} निगरानी से हटाया गया",
      folderScanned: "फ़ोल्डर {{name}} स्कैन किया गया, {{count}} फ़ाइलें मिलीं",
      emptyStateAction: "कार्रवाई करने के लिए Enter दबाएं",
      connectionStatusRegion: "कनेक्शन स्थिति जानकारी",
      queueStatsRegion: "कतार सांख्यिकी क्षेत्र",
      shortcuts: {
        uploadFocused: "अपलोड इनपुट फ़ोकस में है। फ़ाइलें चुनने के लिए Enter दबाएं।",
        queueRefreshed: "कतार मैन्युअल रूप से रिफ्रेश की गई।"
      }
    }
  },
  librarian: {
    title: "लाइब्रेरियन एजेंट",
    subtitle: "स्वायत्त AI-संचालित सामग्री लाइब्रेरी प्रबंधन",
    loading: "लाइब्रेरियन एजेंट लोड हो रहा है...",
    loadingConfig: "कॉन्फ़िगरेशन लोड हो रहा है...",
    refresh: "रिफ्रेश",
    errors: {
      configError: "कॉन्फ़िगरेशन त्रुटि",
      configNotLoaded: "कॉन्फ़िगरेशन लोड नहीं हुआ",
      failedToLoad: "लाइब्रेरियन डेटा लोड करने में विफल",
      failedToLoadConfig: "लाइब्रेरियन कॉन्फ़िगरेशन लोड करने में विफल",
      failedToTrigger: "ऑडिट शुरू करने में विफल। कृपया पुनः प्रयास करें।",
      failedToLoadDetails: "रिपोर्ट विवरण लोड करने में विफल।",
      failedToRollback: "रोलबैक करने में विफल।",
      failedToClearReports: "ऑडिट रिपोर्ट साफ़ करने में विफल। कृपया पुनः प्रयास करें।",
      failedToPause: "ऑडिट रोकने में विफल",
      failedToResume: "ऑडिट फिर से शुरू करने में विफल",
      failedToCancel: "ऑडिट रद्द करने में विफल",
      failedToInterject: "AI एजेंट को संदेश भेजने में विफल",
      auditAlreadyRunning: "एक ऑडिट पहले से चल रहा है। कृपया नया शुरू करने से पहले इसके पूरा होने या रद्द होने की प्रतीक्षा करें।",
      budgetExceeded: "मासिक बजट सीमा पार हो गई। ऑडिट नहीं चलाया जा सकता।",
      contactAdmin: "उचित कॉन्फ़िगरेशन के बिना लाइब्रेरियन पेज लोड नहीं हो सकता।\nकृपया अपने एडमिनिस्ट्रेटर से संपर्क करें।"
    },
    stats: {
      systemHealth: "सिस्टम स्वास्थ्य",
      totalAudits: "कुल रन",
      last30Days: "पिछले 30 दिन",
      issuesFixed: "समस्याएं ठीक की गईं",
      lastAudit: "अंतिम ऑडिट",
      never: "कभी नहीं",
      unknown: "अज्ञात",
      title: "ऑडिट अवलोकन (30 दिन)",
      successRate: "सफलता दर",
      fixesApplied: "लागू किए गए सुधार",
      budgetUsed: "बजट उपयोग",
      budgetLimit: "/ ${{limit}}"
    },
    health: {
      excellent: "उत्कृष्ट",
      good: "अच्छा",
      fair: "ठीक",
      poor: "खराब",
      unknown: "अज्ञात"
    },
    quickActions: {
      title: "रन कॉन्फ़िगरेशन",
      subtitle: "ऑडिट कॉन्फ़िगर और ट्रिगर करें",
      auditMode: "ऑडिट मोड",
      auditModeHelp: "क्या जांचना है चुनें",
      dryRun: "पूर्वावलोकन मोड",
      dryRunHelp: "बिना बदलाव किए दिखाएं कि क्या बदलेगा",
      scopeFilters: "ऑडिट क्षमताएं",
      scopeFiltersHelp: "सक्षम करने के लिए क्षमताएं चुनें (कई संयोजित की जा सकती हैं)",
      last24Hours: "केवल हालिया सामग्री",
      last24HoursHelp: "ऑडिट को पिछले 24 घंटों में जोड़ी गई सामग्री तक सीमित करें",
      cybTitlesOnly: "गंदे शीर्षक साफ़ करें",
      cybTitlesOnlyHelp: "शीर्षकों से फ़ाइल एक्सटेंशन, गुणवत्ता मार्कर और रिलीज़ टैग हटाएं",
      tmdbPostersOnly: "TMDB पोस्टर और मेटाडेटा",
      tmdbPostersOnlyHelp: "TMDB से गायब पोस्टर, विवरण और मेटाडेटा प्राप्त करें",
      openSubtitlesEnabled: "उपशीर्षक प्राप्त करें",
      openSubtitlesEnabledHelp: "OpenSubtitles से गायब उपशीर्षक डाउनलोड करें (HE/EN/ES)",
      classifyOnly: "वर्गीकरण सत्यापित करें",
      classifyOnlyHelp: "फ़िल्म बनाम सीरीज़ वर्गीकरण त्रुटियों की जांच और सुधार करें",
      purgeDuplicates: "डुप्लिकेट हटाएं",
      purgeDuplicatesHelp: "डुप्लिकेट सामग्री आइटम खोजें और हटाएं",
      auditType: "ऑडिट प्रकार",
      auditTypeHelp: "नियम-आधारित या AI-संचालित ऑडिट के बीच चुनें",
      dailyAudit: "दैनिक ऑडिट",
      dailyBadge: "नियम-आधारित • तेज़ • मुफ़्त",
      dailyDescription: "पिछले 7 दिनों में संशोधित सामग्री पर पूर्वनिर्धारित जांच चलाता है। तेज़ और पूर्वानुमेय, कोई AI लागत नहीं।",
      aiAgentAudit: "AI एजेंट ऑडिट",
      aiAgentBadge: "AI-संचालित • बुद्धिमान • बजट उपयोग करता है",
      aiAgentDescription: "स्वायत्त AI एजेंट (Claude) बुद्धिमानी से निर्णय लेता है कि क्या जांचना और ठीक करना है। अधिक व्यापक लेकिन API बजट का उपयोग करता है।",
      triggerDaily: "दैनिक ऑडिट चलाएं",
      triggerAI: "AI एजेंट ऑडिट चलाएं",
      auditRunningNotice: "वर्तमान में एक ऑडिट चल रहा है। पूरा होने पर बटन सक्षम होंगे।",
      budgetLabel: "AI एजेंट बजट सीमा: ${{budget}}",
      budgetPerAudit: "प्रति ऑडिट बजट",
      monthlyBudgetUsed: "बजट उपयोग (30 दिन)",
      monthlyBudgetLimit: "/ ${{limit}} मासिक",
      budgetWarning: "इस ऑडिट को चलाने से मासिक बजट सीमा पार हो जाएगी",
      aiAuditSuccess: "AI एजेंट ऑडिट सफलतापूर्वक ट्रिगर किया गया। {{dryRun}}",
      dailyAuditSuccess: "दैनिक ऑडिट सफलतापूर्वक ट्रिगर किया गया। {{dryRun}}",
      dryRunMode: "(ड्राई रन मोड)",
      rollbackSuccess: "कार्रवाई सफलतापूर्वक रोलबैक की गई।"
    },
    voice: {
      title: "ध्वनि नियंत्रण",
      description: "लाइब्रेरियन को आदेश देने के लिए अपनी आवाज़ का उपयोग करें। बस बटन दबाएं और स्वाभाविक रूप से बोलें।",
      pressToSpeak: "बोलने के लिए दबाएं",
      listening: "सुन रहा है...",
      transcript: "प्रतिलेख",
      processing: "आपका आदेश प्रोसेस हो रहा है...",
      speaking: "लाइब्रेरियन जवाब दे रहा है...",
      examples: "उदाहरण आदेश",
      example1: "पिछले 24 घंटों में गायब पोस्टर जांचें",
      example2: "CYB शीर्षकों के लिए मेटाडेटा ठीक करें",
      example3: "टूटे हुए स्ट्रीमिंग URL स्कैन करें",
      example4: "फ़िल्मों से उपशीर्षक निकालें",
      notSupported: "आपके ब्राउज़र में ध्वनि पहचान समर्थित नहीं है। कृपया Chrome, Edge या Safari का उपयोग करें।",
      notAvailable: "ध्वनि नियंत्रण उपलब्ध नहीं है",
      noSpeech: "कोई भाषण नहीं पाया गया। कृपया पुनः प्रयास करें।",
      noMicrophone: "कोई माइक्रोफ़ोन नहीं पाया गया। कृपया अपना डिवाइस जांचें।",
      microphoneBlocked: "माइक्रोफ़ोन एक्सेस अवरुद्ध कर दी गई। कृपया अपनी ब्राउज़र सेटिंग्स में इसे सक्षम करें।",
      error: "ध्वनि पहचान त्रुटि: {{error}}",
      startFailed: "ध्वनि पहचान शुरू करने में विफल। कृपया पुनः प्रयास करें।",
      commandFailed: "आदेश निष्पादित करने में विफल। कृपया पुनः प्रयास करें।"
    },
    schedules: {
      title: "शेड्यूल किए गए ऑडिट",
      subtitle: "दैनिक और साप्ताहिक ऑडिट शेड्यूल कॉन्फ़िगर करें",
      dailyTitle: "दैनिक ऑडिट",
      weeklyTitle: "साप्ताहिक AI ऑडिट",
      schedule: "शेड्यूल",
      time: "समय",
      mode: "मोड",
      cost: "अनुमानित लागत",
      status: "स्थिति",
      description: "विवरण",
      viewInConsole: "Cloud कंसोल में देखें",
      modifyNote: "शेड्यूल संशोधित करने के लिए Google Cloud Console का उपयोग करें",
      editTitle: "शेड्यूल संपादित करें",
      editNotAvailable: "शेड्यूल संपादन उपलब्ध नहीं",
      editNotAvailableMessage: "शेड्यूल संशोधन के लिए Cloud Scheduler API एकीकरण आवश्यक है। शेड्यूल को सीधे Google Cloud Console में संशोधित करने के लिए 'Cloud कंसोल में देखें' बटन का उपयोग करें।",
      cronExpression: "Cron अभिव्यक्ति",
      cronHint: "प्रारूप: मिनट घंटा दिन माह सप्ताह का दिन (उदा., 0 2 * * * = प्रतिदिन सुबह 2:00 बजे)",
      patterns: {
        daily: "प्रतिदिन {{hour}}:{{minute}} पर",
        weekly: "हर {{day}} को {{hour}}:{{minute}} पर"
      },
      days: {
        sunday: "रविवार",
        monday: "सोमवार",
        tuesday: "मंगलवार",
        wednesday: "बुधवार",
        thursday: "गुरुवार",
        friday: "शुक्रवार",
        saturday: "शनिवार"
      }
    },
    reports: {
      title: "हालिया ऑडिट रिपोर्ट",
      emptyMessage: "अभी तक कोई ऑडिट रिपोर्ट नहीं",
      totalReports: "{{count}} रिपोर्ट",
      clearAll: "सभी साफ़ करें",
      confirmClearAll: "क्या आप वाकई सभी ऑडिट रिपोर्ट साफ़ करना चाहते हैं? यह कार्रवाई पूर्ववत नहीं की जा सकती।",
      clearedSuccessfully: "सभी ऑडिट रिपोर्ट सफलतापूर्वक साफ़ की गईं",
      viewLogs: "लॉग देखें",
      viewDetails: "विवरण देखें",
      columns: {
        date: "दिनांक",
        type: "प्रकार",
        duration: "अवधि",
        status: "स्थिति",
        issues: "समस्याएं",
        fixes: "सुधार",
        actions: "कार्रवाइयां",
        triggeredBy: "द्वारा ट्रिगर किया गया",
        parameters: "पैरामीटर",
        stats: "समस्याएं / सुधार"
      },
      downloadReport: "रिपोर्ट डाउनलोड करें",
      detailModal: {
        title: "ऑडिट रिपोर्ट: {{id}}",
        summary: "सारांश",
        status: "स्थिति",
        executionTime: "निष्पादन समय",
        totalItems: "कुल आइटम",
        healthyItems: "स्वस्थ आइटम",
        issuesFound: "पाई गई समस्याएं",
        issuesBreakdown: "समस्याओं का विवरण",
        totalIssues: "कुल पाई गई समस्याएं",
        seeInsightsBelow: "विवरण के लिए नीचे AI अंतर्दृष्टि देखें",
        brokenStreams: "टूटी हुई स्ट्रीम",
        missingMetadata: "गायब मेटाडेटा",
        misclassifications: "गलत वर्गीकरण",
        orphanedItems: "अनाथ आइटम",
        fixesApplied: "लागू किए गए सुधार",
        totalFixes: "{{count}} कुल सुधार",
        aiInsights: "AI अंतर्दृष्टि"
      }
    },
    logs: {
      title: "निष्पादन लॉग",
      liveAuditLog: "लाइव ऑडिट लॉग",
      executionLog: "ऑडिट निष्पादन लॉग",
      searchPlaceholder: "लॉग खोजें...",
      noLogs: "प्रदर्शित करने के लिए कोई लॉग नहीं",
      noActiveAudit: "कोई सक्रिय ऑडिट नहीं",
      triggerAuditToSee: "लाइव निष्पादन लॉग देखने के लिए एक ऑडिट ट्रिगर करें",
      auditType: "ऑडिट प्रकार",
      started: "शुरू हुआ",
      completed: "पूर्ण",
      lastLog: "अंतिम लॉग",
      staleWarning: "{{seconds}} सेकंड से कोई नया लॉग नहीं - कार्य प्रोसेसिंग या अटका हुआ हो सकता है",
      pollingStatus: "पोलिंग सक्रिय • अंतिम जांच",
      connecting: "लाइव ऑडिट लॉग से कनेक्ट हो रहा है...",
      aiInsightPrefix: "AI अंतर्दृष्टि",
      items: "आइटम",
      live: "लाइव",
      updatedAgo: "{{time}} पहले अपडेट किया गया",
      justNow: "अभी",
      emptyState: {
        title: "कोई सक्रिय ऑडिट नहीं",
        description: "लाइव निष्पादन लॉग देखने के लिए एक ऑडिट ट्रिगर करें",
        dailyTitle: "दैनिक ऑडिट",
        dailyFeature1: "तेज़",
        dailyFeature2: "नियम-आधारित",
        dailyFeature3: "वृद्धिशील",
        aiTitle: "AI एजेंट ऑडिट",
        aiFeature1: "बुद्धिमान",
        aiFeature2: "अनुकूली",
        aiFeature3: "व्यापक",
        trigger: "ट्रिगर",
        lastRun: "अंतिम रन: {{time}}"
      },
      source: {
        librarian: "लाइब्रेरियन",
        aiAgent: "AI एजेंट"
      },
      levels: {
        debug: "DEBUG",
        info: "INFO",
        warn: "WARN",
        error: "ERROR",
        success: "SUCCESS",
        trace: "TRACE"
      },
      auditStarted: "ऑडिट शुरू हुआ",
      brokenStreamsFound: "{{count}} टूटी हुई स्ट्रीम पाई गईं",
      missingMetadataFound: "{{count}} आइटम में गायब मेटाडेटा पाया गया",
      misclassificationsFound: "{{count}} गलत वर्गीकृत आइटम पाए गए",
      orphanedItemsFound: "{{count}} अनाथ आइटम पाए गए",
      fixesApplied: "{{count}} सुधार लागू किए गए",
      auditCompleted: "ऑडिट {{status}} {{duration}} सेकंड में",
      auditInitializing: "\uD83D\uDE80 {{auditType}} ऑडिट प्रारंभ हो रहा है...",
      dryRunMode: "\u26A0\uFE0F ड्राई रन मोड में चल रहा है - कोई बदलाव नहीं किया जाएगा",
      liveMode: "\u2705 लाइव मोड में चल रहा है - बदलाव लागू किए जाएंगे",
      budgetSet: "\uD83D\uDCB0 बजट सीमा: ${{budget}}",
      connectingToAgent: "\uD83D\uDD17 Claude AI एजेंट से कनेक्ट हो रहा है..."
    },
    audit: {
      types: {
        aiAgent: "AI एजेंट",
        dailyIncremental: "दैनिक वृद्धिशील"
      },
      pause: "रोकें",
      resume: "फिर से शुरू करें",
      cancel: "रद्द करें",
      interject: "हस्तक्षेप करें",
      interjectTitle: "AI एजेंट को संदेश भेजें",
      interjectHint: "यह संदेश अगले पुनरावृत्ति पर AI एजेंट वार्तालाप में डाला जाएगा। अतिरिक्त संदर्भ प्रदान करने, ध्यान पुनर्निर्देशित करने या विशिष्ट निर्देश देने के लिए इसका उपयोग करें।",
      interjectPlaceholder: "उदा., केवल फ़िल्मों पर ध्यान दें, अभी सीरीज़ छोड़ दें...",
      sendInterject: "भेजें",
      interjectSuccess: "AI एजेंट को संदेश सफलतापूर्वक भेजा गया",
      pauseSuccess: "ऑडिट सफलतापूर्वक रोका गया",
      resumeSuccess: "ऑडिट सफलतापूर्वक फिर से शुरू किया गया",
      cancelSuccess: "ऑडिट सफलतापूर्वक रद्द किया गया"
    },
    progress: {
      batch: "बैच {{current}} / {{total}}",
      items: "{{processed}} / {{total}} आइटम",
      finishing: "समाप्त हो रहा है...",
      finalizing: "रिपोर्ट तैयार हो रही है और सुधार लागू हो रहे हैं"
    },
    activityLog: {
      title: "गतिविधि लॉग",
      subtitle: "{{count}} कार्रवाइयां दर्ज की गईं",
      filterByType: "प्रकार से फ़िल्टर करें",
      allActions: "सभी कार्रवाइयां",
      content: "सामग्री",
      noDescription: "कोई विवरण उपलब्ध नहीं",
      updatedFields: "{{fields}} अपडेट किए गए",
      pagination: "पेज {{page}} / {{totalPages}}",
      issueType: "समस्या प्रकार",
      confidence: "विश्वसनीयता",
      autoApproved: "स्वतः स्वीकृत",
      changes: "बदलाव",
      actionTypes: {
        addPoster: "पोस्टर जोड़ें",
        updateMetadata: "मेटाडेटा अपडेट करें",
        recategorize: "पुनर्वर्गीकरण करें",
        fixUrl: "URL ठीक करें",
        cleanTitle: "शीर्षक साफ़ करें",
        classify: "वर्गीकृत करें"
      },
      rollback: "रोलबैक",
      rolledBack: "रोलबैक किया गया",
      confirmRollback: {
        title: "रोलबैक की पुष्टि करें",
        message: "क्या आप वाकई इस कार्रवाई को रोलबैक करना चाहते हैं? इससे पिछली स्थिति बहाल हो जाएगी।"
      },
      emptyMessage: "कोई कार्रवाई नहीं मिली"
    },
    modal: {
      confirmAI: {
        title: "AI एजेंट ऑडिट ट्रिगर करें?",
        message: "इससे ${{budget}} की बजट सीमा के साथ एक स्वायत्त AI एजेंट ऑडिट ट्रिगर होगा। एजेंट निर्णय लेगा कि क्या जांचना और ठीक करना है। {{dryRun}}",
        dryRunNote: "ड्राई रन मोड में चल रहा है (कोई बदलाव नहीं किया जाएगा)।"
      },
      cancel: "रद्द करें",
      confirm: "पुष्टि करें",
      close: "बंद करें",
      retry: "पुनः प्रयास"
    },
    status: {
      enabled: "सक्षम",
      disabled: "अक्षम",
      completed: "ऑडिट पूर्ण",
      failed: "ऑडिट विफल",
      in_progress: "प्रगति में",
      partial: "आंशिक रूप से पूर्ण",
      pending: "लंबित",
      running: "चल रहा है"
    },
    auditTypes: {
      daily_incremental: "दैनिक वृद्धिशील",
      ai_agent: "AI एजेंट"
    }
  },
  widgets: {
    title: "विजेट",
    subtitle: "लाइव स्ट्रीम और एम्बेड के लिए फ़्लोटिंग ओवरले विजेट प्रबंधित करें",
    newWidget: "नया विजेट",
    editWidget: "विजेट संपादित करें",
    columns: {
      title: "शीर्षक",
      contentType: "सामग्री प्रकार",
      targetRoles: "लक्षित भूमिकाएं",
      targetPages: "लक्षित पेज",
      status: "स्थिति",
      order: "क्रम"
    },
    contentTypes: {
      liveChannel: "लाइव चैनल",
      live: "लाइव",
      vod: "वीडियो ऑन डिमांड",
      podcast: "पॉडकास्ट",
      radio: "रेडियो",
      iframe: "Iframe"
    },
    status: {
      active: "सक्रिय",
      inactive: "निष्क्रिय"
    },
    form: {
      title: "विजेट शीर्षक",
      description: "विवरण (वैकल्पिक)",
      icon: "आइकन इमोजी (वैकल्पिक)",
      contentType: "सामग्री प्रकार",
      selectChannel: "लाइव चैनल चुनें",
      channelPlaceholder: "-- चैनल चुनें --",
      iframeUrl: "Iframe URL",
      iframeTitle: "Iframe शीर्षक (पहुंच योग्यता के लिए)",
      position: "डिफ़ॉल्ट स्थिति",
      behavior: "व्यवहार",
      mutedByDefault: "डिफ़ॉल्ट रूप से म्यूट",
      closable: "बंद करने योग्य",
      draggable: "ड्रैग करने योग्य",
      targetPages: "लक्षित पेज (अल्पविराम से अलग, खाली = सभी)",
      targetPagesPlaceholder: "/, /live, /vod",
      order: "क्रम"
    },
    actions: {
      save: "सहेजें",
      cancel: "रद्द करें"
    },
    confirmDelete: "क्या आप वाकई इस विजेट को हटाना चाहते हैं?",
    emptyMessage: "कोई विजेट नहीं मिला। शुरू करने के लिए एक बनाएं।",
    allPages: "सभी पेज",
    allRoles: "सभी",
    errors: {
      titleRequired: "शीर्षक आवश्यक है",
      selectChannel: "कृपया एक लाइव चैनल चुनें",
      iframeUrlRequired: "Iframe URL आवश्यक है"
    }
  },
  billing: {
    subtitle: "राजस्व और भुगतान ट्रैक करें",
    revenue: "राजस्व",
    today: "आज",
    thisWeek: "इस सप्ताह",
    thisMonth: "इस माह",
    thisYear: "इस वर्ष",
    metrics: "प्रमुख मीट्रिक्स",
    totalTransactions: "कुल लेनदेन",
    avgTransaction: "औसत लेनदेन",
    pendingRefunds: "लंबित धनवापसी",
    refundRate: "धनवापसी दर",
    retention: "प्रतिधारण",
    retentionRate: "प्रतिधारण दर",
    churnRate: "चर्न दर",
    atRiskUsers: "जोखिम में उपयोगकर्ता",
    churnedUsers: "चर्न हुए उपयोगकर्ता",
    quickLinks: "त्वरित लिंक"
  },
  marketing: {
    recentCampaigns: "हालिया अभियान",
    audienceSegments: "दर्शक खंड",
    emailMetrics: "ईमेल मीट्रिक्स",
    pushMetrics: "पुश मीट्रिक्स",
    quickActions: "त्वरित कार्रवाइयां"
  },
  push: {
    titlePlaceholder: "सूचना शीर्षक",
    bodyPlaceholder: "सूचना संदेश"
  },
  auditLogs: {
    subtitle: "सभी सिस्टम कार्रवाइयां ट्रैक करें",
    filter: "फ़िल्टर",
    export: "निर्यात",
    all: "सभी",
    advancedFiltering: "उन्नत फ़िल्टरिंग",
    actionType: "कार्रवाई प्रकार",
    clear: "साफ़ करें",
    apply: "लागू करें",
    noRecords: "कोई रिकॉर्ड नहीं मिला",
    columns: {
      action: "कार्रवाई",
      user: "उपयोगकर्ता",
      resource: "संसाधन",
      details: "विवरण",
      date: "दिनांक",
      ip: "IP"
    },
    changed: "बदला गया",
    actionFilters: {
      user: "उपयोगकर्ता",
      subscription: "सदस्यता",
      payment: "भुगतान",
      settings: "सेटिंग्स",
      campaign: "अभियान",
      content: "सामग्री"
    }
  },
  settings: {
    subtitle: "सिस्टम पैरामीटर कॉन्फ़िगर करें",
    saveChanges: "परिवर्तन सहेजें",
    generalSettings: "सामान्य सेटिंग्स",
    supportEmail: "सहायता ईमेल",
    defaultPlan: "डिफ़ॉल्ट प्लान",
    termsUrl: "सेवा की शर्तें URL",
    privacyUrl: "गोपनीयता नीति URL",
    userSettings: "उपयोगकर्ता सेटिंग्स",
    maxDevices: "प्रति खाता अधिकतम डिवाइस",
    trialDays: "परीक्षण अवधि दिन",
    maintenanceMode: "रखरखाव मोड",
    maintenanceModeDesc: "सक्षम होने पर, सिस्टम उपयोगकर्ताओं के लिए अनुपलब्ध होगा",
    featureFlags: "फ़ीचर फ़्लैग",
    systemActions: "सिस्टम कार्रवाइयां",
    clearCache: "कैश साफ़ करें",
    resetAnalytics: "एनालिटिक्स रीसेट करें",
    actionsWarning: "ये कार्रवाइयां सिस्टम प्रदर्शन को प्रभावित कर सकती हैं। सावधानी से उपयोग करें।",
    savingSuccess: "सेटिंग्स सफलतापूर्वक सहेजी गईं",
    confirmClearCache: "कैश साफ़ करें? इससे अस्थायी रूप से प्रदर्शन प्रभावित हो सकता है।",
    cacheCleared: "कैश सफलतापूर्वक साफ़ किया गया",
    confirmResetAnalytics: "एनालिटिक्स डेटा रीसेट करें? यह कार्रवाई पूर्ववत नहीं की जा सकती!",
    analyticsReset: "एनालिटिक्स डेटा रीसेट कर दिया गया है",
    featureFlagLabels: {
      new_player: "नया प्लेयर",
      live_chat: "लाइव चैट",
      downloads: "डाउनलोड",
      watch_party: "वॉच पार्टी",
      voice_search: "ध्वनि खोज",
      ai_recommendations: "AI अनुशंसाएं"
    }
  },
  contentEditor: {
    subtitle: "सामग्री मेटाडेटा और जानकारी संपादित करें"
  },
  liveChannels: {
    subtitle: "लाइव टीवी चैनल प्रबंधित करें",
    emptyMessage: "कोई लाइव चैनल नहीं मिला",
    subtitleSettings: "लाइव उपशीर्षक सेटिंग्स",
    form: {
      name: "चैनल का नाम",
      streamUrl: "स्ट्रीम URL",
      epgSource: "EPG स्रोत URL (वैकल्पिक)",
      currentShow: "वर्तमान शो",
      order: "क्रम",
      supportsSubtitles: "लाइव उपशीर्षक सक्षम करें",
      primaryLanguage: "प्राथमिक भाषा (स्रोत)",
      targetLanguages: "उपलब्ध अनुवाद भाषाएं",
      targetLanguagesHelp: "चुनें कि उपयोगकर्ता रीयल-टाइम में किन भाषाओं में अनुवाद कर सकते हैं"
    }
  },
  radioStations: {
    subtitle: "रेडियो स्टेशन प्रबंधित करें",
    emptyMessage: "कोई रेडियो स्टेशन नहीं मिला",
    form: {
      name: "स्टेशन का नाम",
      genre: "शैली",
      streamUrl: "स्ट्रीम URL",
      currentShow: "वर्तमान शो (वैकल्पिक)",
      currentSong: "वर्तमान गाना (वैकल्पिक)",
      order: "क्रम"
    }
  },
  podcasts: {
    subtitle: "पॉडकास्ट और एपिसोड प्रबंधित करें",
    episodesSubtitle: "एपिसोड प्रबंधित करें",
    emptyMessage: "कोई पॉडकास्ट नहीं मिला",
    noEpisodes: "कोई एपिसोड नहीं मिला",
    translateAll: "सभी अनुवाद करें",
    translateAllEpisodes: "सभी एपिसोड अनुवाद करें",
    translateEpisode: "एपिसोड अनुवाद करें",
    viewEpisodes: "एपिसोड देखें",
    editPodcast: "पॉडकास्ट संपादित करें",
    deletePodcast: "पॉडकास्ट हटाएं",
    editEpisode: "एपिसोड संपादित करें",
    deleteEpisode: "एपिसोड हटाएं",
    newEpisode: "नया एपिसोड",
    filterByStatus: "स्थिति से फ़िल्टर करें",
    form: {
      title: "पॉडकास्ट शीर्षक",
      author: "लेखक",
      description: "विवरण",
      category: "श्रेणी",
      rssFeed: "RSS फ़ीड URL",
      website: "वेबसाइट URL (वैकल्पिक)"
    },
    episodes: {
      form: {
        title: "एपिसोड शीर्षक",
        description: "विवरण",
        episodeNumber: "एपिसोड नंबर",
        seasonNumber: "सीज़न नंबर (वैकल्पिक)",
        duration: "अवधि",
        audioUrl: "ऑडियो URL (आवश्यक)",
        publishedDate: "प्रकाशन तिथि (YYYY-MM-DD)"
      }
    }
  },
  podcastEpisodes: {
    subtitle: "पॉडकास्ट एपिसोड और मेटाडेटा प्रबंधित करें"
  },
  translation: {
    title: "अनुवाद डैशबोर्ड",
    subtitle: "पॉडकास्ट एपिसोड अनुवाद की निगरानी करें",
    retry: "पुनः प्रयास",
    retryTranslation: "अनुवाद पुनः प्रयास करें",
    view: "देखें",
    viewEpisodes: "एपिसोड देखें",
    failedEpisodes: "विफल अनुवाद",
    noFailed: "कोई विफल अनुवाद नहीं",
    columns: {
      episodeTitle: "एपिसोड",
      podcast: "पॉडकास्ट",
      retries: "पुनः प्रयास",
      lastAttempt: "अंतिम प्रयास"
    },
    stats: {
      pending: "लंबित",
      processing: "प्रोसेसिंग",
      completed: "पूर्ण",
      failed: "विफल"
    }
  },
  users: {
    subtitle: "उपयोगकर्ता और खाते प्रबंधित करें",
    addUser: "उपयोगकर्ता जोड़ें",
    status: {
      active: "सक्रिय",
      inactive: "निष्क्रिय",
      blocked: "अवरुद्ध"
    },
    filters: {
      all: "सभी",
      active: "सक्रिय",
      inactive: "निष्क्रिय",
      blocked: "अवरुद्ध"
    },
    columns: {
      name: "नाम",
      role: "भूमिका",
      subscription: "सदस्यता",
      noSubscription: "कोई सदस्यता नहीं",
      status: "स्थिति",
      created: "बनाया गया",
      actions: "कार्रवाइयां"
    },
    confirmDelete: "उपयोगकर्ता हटाएं",
    confirmDeleteMessage: "क्या आप वाकई {{name}} को हटाना चाहते हैं? यह कार्रवाई पूर्ववत नहीं की जा सकती।",
    resetPassword: "पासवर्ड रीसेट करें",
    block: "अवरुद्ध करें",
    unban: "प्रतिबंध हटाएं",
    confirmResetPassword: "{{email}} को पासवर्ड रीसेट ईमेल भेजें?",
    resetPasswordSent: "पासवर्ड रीसेट ईमेल भेजा गया",
    recentActivity: "हालिया गतिविधि",
    noActivity: "कोई गतिविधि नहीं",
    notFound: "उपयोगकर्ता नहीं मिला",
    backToList: "सूची पर वापस जाएं",
    banReason: "प्रतिबंध का कारण",
    banReasonPrompt: "प्रतिबंध का कारण:",
    confirmUnban: "उपयोगकर्ता का प्रतिबंध हटाएं?",
    userDetails: "उपयोगकर्ता विवरण",
    id: "ID",
    registered: "पंजीकृत",
    billingHistory: "बिलिंग इतिहास",
    noPayments: "कोई भुगतान नहीं"
  },
  userDetail: {
    subtitle: "उपयोगकर्ता खाता विवरण और गतिविधि इतिहास"
  },
  campaigns: {
    subtitle: "कूपन कोड और छूट प्रबंधित करें",
    expired: "समाप्त",
    status: {
      active: "सक्रिय",
      inactive: "निष्क्रिय"
    },
    columns: {
      name: "नाम",
      discount: "छूट",
      usage: "उपयोग",
      validUntil: "तक मान्य",
      status: "स्थिति",
      actions: "कार्रवाइयां"
    },
    confirmDelete: "अभियान हटाएं",
    confirmDeleteMessage: "क्या आप वाकई \"{{name}}\" को हटाना चाहते हैं? यह कार्रवाई पूर्ववत नहीं की जा सकती।",
    searchPlaceholder: "अभियान खोजें...",
    emptyMessage: "कोई अभियान नहीं मिला",
    deactivate: "निष्क्रिय करें",
    activate: "सक्रिय करें",
    createTitle: "नया अभियान",
    editTitle: "अभियान संपादित करें",
    formSubtitle: "कूपन कोड या छूट सेट करें",
    form: {
      name: "अभियान का नाम",
      namePlaceholder: "उदा. गर्मी की बिक्री 2024",
      code: "कूपन कोड",
      generate: "उत्पन्न करें",
      discountType: "छूट प्रकार",
      discountValue: "छूट मूल्य",
      maxUses: "अधिकतम उपयोग",
      unlimited: "असीमित",
      validUntil: "तक मान्य",
      active: "अभियान सक्रिय"
    }
  },
  subscriptions: {
    subtitle: "सिस्टम सदस्यों को देखें और प्रबंधित करें",
    status: {
      active: "सक्रिय",
      paused: "रुका हुआ",
      cancelled: "रद्द",
      expired: "समाप्त"
    },
    columns: {
      user: "उपयोगकर्ता",
      plan: "प्लान",
      price: "मूल्य",
      nextBilling: "अगली बिलिंग",
      status: "स्थिति"
    },
    perMonth: "/माह",
    searchPlaceholder: "सदस्यता खोजें...",
    emptyMessage: "कोई सदस्यता नहीं मिली",
    actions: {
      changePlan: "प्लान बदलें",
      pause: "रोकें",
      resume: "फिर से शुरू करें",
      cancel: "रद्द करें",
      delete: "हटाएं"
    },
    editPlan: {
      title: "सदस्यता प्लान बदलें",
      user: "उपयोगकर्ता",
      currentPlan: "वर्तमान प्लान",
      newPlan: "नया प्लान चुनें"
    },
    addSubscription: {
      title: "सदस्यता जोड़ें",
      userEmail: "उपयोगकर्ता ईमेल",
      emailPlaceholder: "उपयोगकर्ता ईमेल दर्ज करें",
      duration: "अवधि (दिन)",
      selectPlan: "प्लान चुनें"
    },
    fillAllFields: "कृपया सभी फ़ील्ड भरें",
    userNotFound: "उपयोगकर्ता नहीं मिला",
    selectOneToEdit: "कृपया संपादित करने के लिए ठीक एक सदस्यता चुनें",
    selectToDelete: "कृपया हटाने के लिए सदस्यता चुनें",
    confirmDeleteMultiple: "{{count}} सदस्यता हटाएं?",
    selected: "चयनित",
    confirmDelete: "क्या आप वाकई {{user}} की सदस्यता हटाना चाहते हैं? यह कार्रवाई पूर्ववत नहीं की जा सकती।"
  },
  marketingDashboard: {
    subtitle: "मार्केटिंग अवलोकन",
    refresh: "रिफ्रेश",
    totalSubscribers: "कुल सदस्य",
    emailOpenRate: "ईमेल ओपन दर",
    pushClickRate: "पुश क्लिक दर",
    activeSegments: "सक्रिय खंड",
    campaignStatus: {
      active: "सक्रिय",
      completed: "पूर्ण",
      scheduled: "शेड्यूल किया गया",
      draft: "ड्राफ़्ट"
    }
  },
  transactions: {
    subtitle: "भुगतान इतिहास देखें",
    exportCsv: "CSV निर्यात करें",
    status: {
      completed: "पूर्ण",
      pending: "लंबित",
      failed: "विफल",
      refunded: "धनवापसी"
    },
    columns: {
      id: "ID",
      user: "उपयोगकर्ता",
      amount: "राशि",
      type: "प्रकार",
      status: "स्थिति",
      date: "दिनांक"
    },
    filters: {
      all: "सभी"
    },
    searchPlaceholder: "लेनदेन खोजें...",
    emptyMessage: "कोई लेनदेन नहीं मिला",
    details: "लेनदेन विवरण",
    email: "ईमेल"
  },
  pushNotifications: {
    subtitle: "उपयोगकर्ताओं को सूचनाएं बनाएं और भेजें",
    newNotification: "नई सूचना",
    status: {
      draft: "ड्राफ़्ट",
      sent: "भेजी गई",
      scheduled: "शेड्यूल की गई"
    },
    columns: {
      title: "शीर्षक",
      status: "स्थिति",
      sent: "भेजी गईं",
      opened: "खोली गईं",
      scheduledAt: "शेड्यूल किया गया",
      created: "बनाया गया",
      actions: "कार्रवाइयां"
    },
    filters: {
      all: "सभी"
    },
    searchPlaceholder: "सूचना खोजें...",
    emptyMessage: "कोई सूचना नहीं मिली",
    createModal: "नई पुश सूचना",
    editModal: "सूचना संपादित करें",
    scheduleModal: "सूचना शेड्यूल करें",
    titleLabel: "शीर्षक",
    bodyLabel: "मुख्य भाग",
    dateTimeLabel: "दिनांक और समय",
    cancel: "रद्द करें",
    create: "सूचना बनाएं",
    schedule: "शेड्यूल",
    send: "अभी भेजें",
    confirmSend: "सूचना \"{{title}}\" भेजें?",
    confirmDelete: "सूचना \"{{title}}\" हटाएं?",
    fillRequired: "कृपया शीर्षक और मुख्य भाग भरें"
  }
};

// Ensure admin exists
if (!hi.admin) hi.admin = {};

// Deep merge the additions into hi.admin
deepMerge(hi.admin, adminAdditions);

writeFileSync(hiPath, JSON.stringify(hi, null, 2) + '\n', 'utf8');

// Verify
const enData = JSON.parse(readFileSync(join(__dirname, 'en.json'), 'utf8'));
const hiData = JSON.parse(readFileSync(hiPath, 'utf8'));

function getKeys(obj, prefix = '') {
  let keys = [];
  for (const k in obj) {
    const path = prefix ? prefix + '.' + k : k;
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      keys = keys.concat(getKeys(obj[k], path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

const enKeys = getKeys(enData);
const hiKeys = getKeys(hiData);
const stillMissing = enKeys.filter(k => !hiKeys.includes(k));

console.log(`Hindi keys after merge: ${hiKeys.length}`);
console.log(`English keys: ${enKeys.length}`);
console.log(`Still missing: ${stillMissing.length}`);
if (stillMissing.length > 0) {
  console.log('Missing keys:');
  stillMissing.forEach(k => console.log('  ' + k));
}
