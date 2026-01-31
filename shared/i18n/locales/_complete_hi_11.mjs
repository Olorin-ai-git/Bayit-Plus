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
        invalidUrl: "कृपया वैध URL दर्ज करें",
        urlMustBeHttps: "URL HTTPS प्रोटोकॉल का उपयोग करना चाहिए",
        emptyUrlList: "कोई URL आयातित नहीं",
        emptyUrlListDescription: "दूरस्थ स्रोतों से वीडियो फ़ाइलें आयात करने के लिए ऊपर URL दर्ज करें",
        addUrl: "URL जोड़ें",
        removeUrl: "URL हटाएं"
      },
      monitoredFolders: {
        title: "मॉनिटर किए गए फोल्डर",
        subtitle: "स्वचालित रूप से सामग्री का पता लगाने और अपलोड करने के लिए फोल्डर कॉन्फ़िगर करें",
        noFolders: "कोई मॉनिटर किया गया फोल्डर नहीं",
        noFoldersDescription: "स्वचालित सामग्री पहचान और अपलोड सक्षम करने के लिए फोल्डर जोड़ें",
        addFolder: "फोल्डर जोड़ें",
        editFolder: "फोल्डर संपादित करें",
        deleteFolder: "फोल्डर हटाएं",
        scanFolder: "फोल्डर स्कैन करें",
        scanFolderHint: "नई फ़ाइलों के लिए फोल्डर जांचें और अपलोड कतारबद्ध करें",
        scanning: "स्कैन हो रहा है...",
        scanComplete: "स्कैन पूर्ण: {{count}} फ़ाइलें मिलीं",
        scanCompleteOne: "स्कैन पूर्ण: 1 फ़ाइल मिली",
        scanCompleteOther: "स्कैन पूर्ण: {{count}} फ़ाइलें मिलीं",
        noFilesFound: "फोल्डर में कोई नई फ़ाइल नहीं मिली",
        scanFailed: "स्कैन विफल: {{error}}",
        folderName: "फोल्डर नाम",
        folderPath: "फोल्डर पथ",
        folderStatus: "स्थिति",
        folderEnabled: "सक्षम",
        folderDisabled: "अक्षम",
        lastScan: "अंतिम स्कैन",
        neverScanned: "कभी स्कैन नहीं किया",
        filesDetected: "{{count}} फ़ाइलें पाई गईं",
        confirmDelete: "{{name}} हटाएं?",
        confirmDeleteMessage: "यह इस फोल्डर की निगरानी बंद कर देगा। मौजूदा अपलोड प्रभावित नहीं होंगे।",
        deleteSuccess: "फोल्डर सफलतापूर्वक हटाया गया",
        deleteFailed: "फोल्डर हटाने में विफल: {{error}}",
        form: {
          title: "फोल्डर कॉन्फ़िगरेशन",
          name: "फोल्डर नाम",
          namePlaceholder: "जैसे, मूवी आर्काइव",
          nameRequired: "फोल्डर नाम आवश्यक है",
          nameHelp: "इस फोल्डर के लिए वर्णनात्मक नाम",
          path: "फोल्डर पथ",
          pathPlaceholder: "/path/to/folder",
          pathHelp: "मॉनिटर करने के लिए पूर्ण पथ दर्ज करें",
          pathRequired: "फोल्डर पथ आवश्यक है",
          pathInvalid: "अमान्य फोल्डर पथ",
          pathReadOnly: "निर्माण के बाद पथ बदला नहीं जा सकता",
          enabled: "सक्षम",
          enabledHelp: "इस फोल्डर की निगरानी सक्षम या अक्षम करें",
          autoUpload: "स्वचालित अपलोड",
          autoUploadHelp: "इस फोल्डर में पाई गई नई फ़ाइलें स्वचालित रूप से अपलोड करें",
          contentType: "सामग्री प्रकार",
          contentTypeHelp: "इस फोल्डर में सामग्री का प्रकार",
          saveButton: "फोल्डर सहेजें",
          cancelButton: "रद्द करें",
          saving: "सहेजा जा रहा है..."
        }
      },
      dryRun: {
        title: "ड्राई रन मोड",
        enabled: "ड्राई रन सक्षम",
        disabled: "ड्राई रन अक्षम",
        description: "वास्तव में फ़ाइलें स्थानांतरित किए बिना अपलोड पूर्वावलोकन करें",
        descriptionDetailed: "सक्षम होने पर, फ़ाइलें सत्यापित होंगी और मेटाडेटा निकाला जाएगा, लेकिन स्टोरेज में अपलोड नहीं होगा। परिवर्तन किए बिना अपलोड परीक्षण के लिए इसका उपयोग करें।",
        toggle: "ड्राई रन सक्षम करें",
        toggleHint: "सुरक्षित अपलोड परीक्षण के लिए ड्राई रन मोड टॉगल करें",
        previewTitle: "ड्राई रन परिणाम",
        previewDescription: "अपलोड के साथ आगे बढ़ने पर क्या होगा इसकी समीक्षा करें",
        validFiles: "वैध फ़ाइलें ({{count}})",
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
        reconnectAttempt: "पुनः कनेक्ट हो रहा है (प्रयास {{current}} का {{max}})",
        connectionLost: "कतार स्थिति स्वचालित रूप से अपडेट नहीं होगी",
        connectionLostDescription: "कनेक्शन खो गया। नवीनतम कतार स्थिति देखने के लिए रिफ्रेश बटन का उपयोग करें। हम पुनः कनेक्ट करने का प्रयास कर रहे हैं...",
        connectionLostAnnouncement: "कनेक्शन खो गया। रीयल-टाइम अपडेट रुके हुए हैं। मैनुअल अपडेट के लिए रिफ्रेश बटन का उपयोग करें।",
        connectedAnnouncement: "अपलोड सेवा से कनेक्टेड। रीयल-टाइम अपडेट सक्रिय।",
        reconnectingAnnouncement: "अपलोड सेवा से पुनः कनेक्ट हो रहा है। प्रयास {{attempt}} का {{maxAttempts}}।",
        troubleshooting: "समस्या निवारण",
        troubleshootingSteps: [
          "अपना इंटरनेट कनेक्शन जांचें",
          "सर्वर चल रहा है इसकी पुष्टि करें",
          "अपना प्रमाणीकरण टोकन जांचें",
          "पेज रिफ्रेश करने का प्रयास करें"
        ],
        manualRefresh: "मैनुअल रिफ्रेश",
        manualRefreshHint: "कतार डेटा मैनुअल रूप से रिफ्रेश करें",
        refreshing: "रिफ्रेश हो रहा है..."
      },
      contentTypes: {
        movie: "फिल्म",
        series: "सीरीज",
        podcast: "पॉडकास्ट",
        other: "अन्य"
      },
      stages: {
        browserUpload: "ब्राउज़र अपलोड",
        hashCalculation: "हैश गणना",
        duplicateCheck: "डुप्लीकेट जांच",
        metadataExtraction: "मेटाडेटा निष्कर्षण",
        gcsUpload: "क्लाउड अपलोड",
        databaseInsert: "डेटाबेस इंसर्ट",
        complete: "पूर्ण",
        failed: "विफल"
      },
      status: {
        queued: "कतारबद्ध",
        processing: "प्रोसेसिंग",
        uploading: "अपलोड हो रहा है",
        complete: "पूर्ण",
        failed: "विफल",
        cancelled: "रद्द",
        skipped: "छोड़ा गया (डुप्लीकेट)"
      },
      actions: {
        pauseQueue: "कतार रोकें",
        resumeQueue: "कतार फिर से शुरू करें",
        clearQueue: "कतार साफ करें",
        clearQueueConfirm: "अपलोड कतार साफ करें?",
        clearQueueConfirmMessage: "यह {{count}} लंबित अपलोड रद्द कर देगा। यह क्रिया पूर्ववत नहीं की जा सकती।",
        triggerUpload: "फोल्डर स्कैन करें",
        triggerUploadHint: "नई फ़ाइलों के लिए सभी मॉनिटर किए गए फोल्डर स्कैन करें",
        triggerUploadSuccess: "अपलोड के लिए {{files_found}} फ़ाइलें मिलीं",
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
        saveFailed: "फोल्डर कॉन्फ़िगरेशन सहेजने में विफल",
        saveFailedDescription: "मॉनिटर किया गया फोल्डर सहेजने में असमर्थ। कृपया पुनः प्रयास करें।",
        deleteFailed: "मॉनिटर किया गया फोल्डर हटाने में विफल",
        uploadFailed: "अपलोड विफल",
        uploadFailedDescription: "एक या अधिक फ़ाइलें अपलोड करने में विफल। विवरण के लिए फ़ाइल सूची जांचें।",
        resumeFailed: "कतार फिर से शुरू करने में विफल",
        clearFailed: "कतार साफ करने में विफल",
        triggerFailed: "अपलोड स्कैन ट्रिगर करने में विफल",
        pathRequired: "फोल्डर पथ आवश्यक है",
        invalidPath: "अमान्य फोल्डर पथ",
        pathTraversal: "पथ में अमान्य अक्षर या ट्रैवर्सल प्रयास हैं",
        networkError: "नेटवर्क त्रुटि। कृपया अपना कनेक्शन जांचें।",
        authError: "प्रमाणीकरण त्रुटि। कृपया फिर से लॉग इन करें।",
        serverError: "सर्वर त्रुटि। कृपया बाद में पुनः प्रयास करें।",
        fileTooBig: "फ़ाइल {{maxSize}} की अधिकतम सीमा से अधिक है",
        invalidFileType: "अमान्य फ़ाइल प्रकार। समर्थित प्रारूप: {{formats}}",
        duplicateFile: "यह फ़ाइल पहले ही अपलोड की जा चुकी है",
        rateLimitExceeded: "दर सीमा पार हो गई। कृपया और फ़ाइलें अपलोड करने से पहले प्रतीक्षा करें।",
        configValidationFailed: "कॉन्फ़िगरेशन सत्यापन विफल। विवरण के लिए कंसोल जांचें।",
        websocketAuthFailed: "WebSocket प्रमाणीकरण विफल",
        unsupportedBrowser: "आपका ब्राउज़र आवश्यक सुविधाओं का समर्थन नहीं करता"
      },
      mobile: {
        dataWarning: "आप सेलुलर डेटा पर हैं। {{size}} अपलोड करने से महत्वपूर्ण डेटा का उपयोग हो सकता है।",
        dataWarningProceed: "फिर भी जारी रखें",
        dataWarningCancel: "अपलोड रद्द करें",
        lowMemoryWarning: "डिवाइस मेमोरी कम है। बड़े अपलोड विफल हो सकते हैं।",
        batteryLowWarning: "बैटरी कम है ({{percent}}%)। अपलोड बाधित हो सकते हैं।",
        networkChanged: "नेटवर्क बदल गया। पुनः कनेक्ट हो रहा है...",
        mobileBrowserNotSupported: "कुछ सुविधाएं मोबाइल ब्राउज़र पर काम नहीं कर सकतीं"
      },
      accessibility: {
        pageDescription: "कतार निगरानी, मैनुअल अपलोड और फोल्डर निगरानी के साथ अपलोड प्रबंधन इंटरफ़ेस",
        pageTitle: "व्यवस्थापक अपलोड पेज",
        sectionQueue: "कतार डैशबोर्ड अनुभाग",
        sectionManualUpload: "मैनुअल अपलोड अनुभाग",
        sectionMonitoredFolders: "मॉनिटर किए गए फोल्डर अनुभाग",
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
        folderAdded: "फोल्डर {{name}} निगरानी में जोड़ा गया",
        folderRemoved: "फोल्डर {{name}} निगरानी से हटाया गया",
        folderScanned: "फोल्डर {{name}} स्कैन किया गया, {{count}} फ़ाइलें मिलीं",
        emptyStateAction: "कार्रवाई करने के लिए Enter दबाएं",
        connectionStatusRegion: "कनेक्शन स्थिति जानकारी",
        queueStatsRegion: "कतार आंकड़े क्षेत्र",
        shortcuts: {
          uploadFocused: "अपलोड इनपुट फोकस में। फ़ाइलें चुनने के लिए Enter दबाएं।",
          queueRefreshed: "कतार मैनुअल रूप से रिफ्रेश हुई।"
        }
      }
    }
  }
};

deepMerge(hi, translations);
fs.writeFileSync('hi.json', JSON.stringify(hi, null, 2) + '\n');
console.log('Part 11 complete - admin.uploads remaining sections');
