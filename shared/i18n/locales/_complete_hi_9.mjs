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
    content: {
      merge: {
        wizard: "सामग्री मर्ज विज़ार्ड",
        errorMixedTypes: "सीरीज और फिल्मों को एक साथ मर्ज नहीं किया जा सकता",
        errorDifferentNames: "आइटम के नाम मेल नहीं खाते या समान नहीं हैं",
        suggestionSeparate: "केवल सीरीज या केवल फिल्में चुनें",
        suggestionNames1: "मर्ज आइटम के नाम विभिन्न भाषाओं में समान होने चाहिए",
        suggestionNames2: "उदाहरण: \"בורגנים\" (हिब्रू) और \"burganim\" (अंग्रेजी)",
        cannotMerge: "इन आइटम को मर्ज नहीं किया जा सकता",
        canMerge: "आइटम मर्ज किए जा सकते हैं",
        suggestions: "सुझाव:",
        validationPassed: "इन आइटम के नाम समान हैं और मर्ज के लिए संगत हैं।",
        continue: "जारी रखें",
        selectBase: "बेस आइटम चुनें",
        selectBaseDescription: "कौन सा आइटम बेस के रूप में रखना है चुनें। अन्य आइटम की सभी सामग्री इसमें मर्ज की जाएगी।",
        configure: "मर्ज कॉन्फ़िगर करें",
        configureDescription: "क्या स्थानांतरित करना है और कौन सा मेटाडेटा रखना है चुनें।",
        contentTransfer: "सामग्री स्थानांतरण",
        transferSeasons: "सीज़न स्थानांतरित करें",
        transferSeasonsDesc: "मर्ज किए गए आइटम से सभी सीज़न बेस आइटम में ले जाएं",
        transferEpisodes: "एपिसोड स्थानांतरित करें",
        transferEpisodesDesc: "मर्ज किए गए आइटम से सभी एपिसोड बेस आइटम में ले जाएं",
        metadataPreferences: "मेटाडेटा प्राथमिकताएं",
        baseItem: "बेस आइटम",
        useBasePoster: "बेस आइटम पोस्टर का उपयोग करें",
        useBasePosterDesc: "बेस आइटम से पोस्टर छवि रखें",
        useBaseDescription: "बेस आइटम विवरण का उपयोग करें",
        useBaseDescriptionDesc: "बेस आइटम से विवरण रखें",
        mergePreview: "मर्ज पूर्वावलोकन",
        itemsToMerge: "मर्ज करने के लिए आइटम",
        totalSeasons: "मर्ज के बाद कुल सीज़न",
        totalEpisodes: "मर्ज के बाद कुल एपिसोड",
        confirmMerge: "मर्ज की पुष्टि करें",
        confirmDescription: "मर्ज ऑपरेशन की समीक्षा करें और आगे बढ़ने के लिए पुष्टि करें।",
        baseItemKeep: "यह आइटम रखा जाएगा",
        itemsMergeInto: "ये आइटम बेस में मर्ज किए जाएंगे",
        mergeWarning: "मर्ज करने के बाद, सभी सामग्री बेस आइटम में संयोजित होगी। मर्ज किए गए आइटम मर्ज के रूप में चिह्नित किए जाएंगे और लाइब्रेरी से छिपाए जाएंगे।",
        merging: "मर्ज हो रहा है...",
        confirmButton: "आइटम मर्ज करें",
        errorNoBase: "कृपया एक बेस आइटम चुनें",
        errorNoMerge: "मर्ज करने के लिए कोई आइटम नहीं",
        successMessage: "{{count}} आइटम सफलतापूर्वक \"{{title}}\" में मर्ज किए गए।",
        noEpisodesNote: "नोट: कोई एपिसोड या सीज़न स्थानांतरित नहीं किए गए क्योंकि वे अभी तक डेटाबेस में नहीं बनाए गए हैं।",
        transferredInfo: "स्थानांतरित: {{seasons}} सीज़न, {{episodes}} एपिसोड।",
        mergeSuccess: "मर्ज सफल"
      }
    },
    categories: {
      subtitle: "सामग्री श्रेणियां प्रबंधित करें",
      emptyMessage: "कोई श्रेणी नहीं मिली",
      status: {
        active: "सक्रिय",
        inactive: "निष्क्रिय"
      },
      form: {
        nameHebrew: "श्रेणी नाम (हिब्रू)",
        nameEnglish: "श्रेणी नाम (अंग्रेजी)",
        slug: "स्लग"
      }
    },
    recordings: {
      title: "रिकॉर्डिंग प्रबंधन",
      subtitle: "प्लेटफॉर्म पर उपयोगकर्ता रिकॉर्डिंग प्रबंधित करें",
      totalRecordings: "कुल रिकॉर्डिंग",
      totalStorage: "कुल स्टोरेज",
      totalUsers: "रिकॉर्डिंग वाले उपयोगकर्ता",
      activeSessions: "सक्रिय सत्र",
      searchPlaceholder: "शीर्षक, उपयोगकर्ता, या चैनल से खोजें...",
      user: "उपयोगकर्ता",
      confirmDelete: "'{{title}}' रिकॉर्डिंग हटाएं? यह क्रिया पूर्ववत नहीं की जा सकती।",
      deleteRecording: "रिकॉर्डिंग हटाएं",
      deleteSuccess: "रिकॉर्डिंग सफलतापूर्वक हटाई गई",
      deleteFailed: "रिकॉर्डिंग हटाने में विफल",
      loadFailed: "रिकॉर्डिंग लोड करने में विफल",
      noRecordings: "कोई रिकॉर्डिंग नहीं मिली",
      noRecordingsHint: "सिस्टम में अभी तक कोई उपयोगकर्ता रिकॉर्डिंग नहीं।"
    }
  }
};

deepMerge(hi, translations);
fs.writeFileSync('hi.json', JSON.stringify(hi, null, 2) + '\n');
console.log('Part 9 complete - admin.content.merge, admin.categories, admin.recordings');
