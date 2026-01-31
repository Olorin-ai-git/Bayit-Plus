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
    nav: {
      podcasts: "पॉडकास्ट"
    },
    liveQuotas: {
      title: "लाइव फीचर कोटा प्रबंधन",
      analytics: "लाइव फीचर्स उपयोग विश्लेषण",
      currentUsage: "वर्तमान उपयोग",
      quotaLimits: "कोटा सीमाएं",
      confirmReset: "इस उपयोगकर्ता के सभी उपयोग काउंटर रीसेट करें?",
      subtitlesHour: "उपशीर्षक (घंटा)",
      subtitlesDay: "उपशीर्षक (दिन)",
      subtitlesMonth: "उपशीर्षक (महीना)",
      dubbingHour: "डबिंग (घंटा)",
      dubbingDay: "डबिंग (दिन)",
      dubbingMonth: "डबिंग (महीना)",
      estimatedCost: "अनुमानित लागत (इस महीने)",
      subtitleLimits: "उपशीर्षक सीमाएं",
      dubbingLimits: "डबिंग सीमाएं",
      perHour: "प्रति घंटा (मिनट)",
      perDay: "प्रति दिन (मिनट)",
      perMonth: "प्रति माह (मिनट)",
      notes: "व्यवस्थापक नोट्स",
      notesPlaceholder: "सीमा बढ़ाने का कारण...",
      editLimits: "सीमाएं संपादित करें",
      resetCounters: "सभी उपयोग काउंटर रीसेट करें",
      totalUsers: "कोटा वाले कुल उपयोगकर्ता",
      activeSessions: "सक्रिय सत्र",
      subtitlesToday: "उपशीर्षक मिनट (आज)",
      dubbingToday: "डबिंग मिनट (आज)",
      costToday: "लागत (आज)",
      costMonth: "लागत (इस महीने)",
      last7Days: "पिछले 7 दिन",
      last30Days: "पिछले 30 दिन",
      totalSessions: "कुल सत्र",
      totalMinutes: "कुल मिनट",
      totalCost: "कुल लागत",
      topUsers: "शीर्ष उपयोगकर्ता (पिछले 30 दिन)",
      user: "उपयोगकर्ता",
      subtitles: "उपशीर्षक",
      dubbing: "डबिंग",
      cost: "लागत",
      noData: "कोई उपयोग डेटा उपलब्ध नहीं"
    },
    featured: {
      title: "विशेष सामग्री",
      subtitle: "आइटम खींचकर कैरोसेल क्रम प्रबंधित करें",
      empty: "कोई विशेष सामग्री नहीं",
      emptyHint: "सामग्री लाइब्रेरी से विशेष में सामग्री जोड़ें",
      count: "{{count}} आइटम",
      confirmUnfeature: "विशेष से हटाएं?",
      remove: "हटाएं",
      unsavedChanges: "आपके पास सहेजे न गए परिवर्तन हैं",
      addContent: "सामग्री जोड़ें",
      addContentToSection: "{{section}} में सामग्री जोड़ें",
      selectContentToAdd: "जोड़ने के लिए सामग्री चुनें",
      addSelected: "चयनित जोड़ें ({{count}})",
      noContentAvailable: "कोई सामग्री उपलब्ध नहीं",
      contentAdded: "{{count}} आइटम जोड़े गए",
      failedToAdd: "सामग्री जोड़ने में विफल",
      publishedOnly: "केवल प्रकाशित",
      saveButton: "सहेजें ({{count}})"
    },
    content: {
      title: "सामग्री लाइब्रेरी",
      subtitle: "फिल्में, सीरीज और वीडियो सामग्री प्रबंधित करें",
      importFree: "मुफ्त सामग्री आयात करें",
      searchPlaceholder: "सामग्री खोजें...",
      emptyMessage: "कोई सामग्री नहीं मिली",
      confirmDelete: "यह सामग्री हटाएं?",
      confirmDeleteSingle: "क्या आप वाकई इस सामग्री को हटाना चाहते हैं? यह क्रिया पूर्ववत नहीं की जा सकती।",
      confirmBatchDelete: "क्या आप वाकई {{count}} आइटम हटाना चाहते हैं? यह क्रिया पूर्ववत नहीं की जा सकती।",
      batchDeleteSuccess: "{{count}} आइटम सफलतापूर्वक हटाए गए",
      batchDeletePartial: "{{success}} आइटम हटाए गए, लेकिन {{failed}} आइटम विफल रहे",
      selectedItems: "{{count}} आइटम चयनित",
      batchFeature: "विशेष बनाएं",
      batchUnfeature: "विशेष से हटाएं",
      movies: "फिल्में",
      series: "सीरीज",
      audiobooks: "ऑडियोबुक्स",
      podcasts: "पॉडकास्ट",
      showOnlyWithSubtitles: "केवल उपशीर्षक वाले दिखाएं",
      episodes_one: "एपिसोड",
      episodes_other: "एपिसोड",
      toggleCarousel: "कैरोसेल टॉगल करें",
      batchMerge: "मर्ज करें",
      mergeContent: "सामग्री मर्ज करें",
      selectItemToKeep: "रखने के लिए आइटम चुनें",
      removeAction: "हटाए गए आइटम के साथ क्या करें?",
      removeActionUnpublish: "अप्रकाशित करें (अनुशंसित)",
      removeActionDelete: "स्थायी रूप से हटाएं",
      unpublishDescription: "आइटम छिपाए जाएंगे लेकिन बाद में पुनर्स्थापित किए जा सकते हैं",
      deleteWarning: "⚠️ हटाए गए आइटम पुनर्प्राप्त नहीं किए जा सकते",
      mergeReason: "मर्ज का कारण",
      mergeReasonPlaceholder: "कारण दर्ज करें (न्यूनतम 10 अक्षर)...",
      mergeReasonTooShort: "कारण कम से कम 10 अक्षर का होना चाहिए",
      confirmMerge: "आइटम मर्ज करें",
      itemWillBeKept: "यह आइटम रखा जाएगा",
      itemsWillBeRemoved: "{{count}} आइटम {{action}} किया जाएगा",
      itemsWillBeRemoved_plural: "{{count}} आइटम {{action}} किए जाएंगे",
      mergeSuccess: "{{count}} आइटम सफलतापूर्वक मर्ज किए गए",
      mergeFailed: "सामग्री मर्ज करने में विफल"
    }
  }
};

deepMerge(hi, translations);
fs.writeFileSync('hi.json', JSON.stringify(hi, null, 2) + '\n');
console.log('Part 6 complete - admin.liveQuotas, admin.featured, admin.content basics');
