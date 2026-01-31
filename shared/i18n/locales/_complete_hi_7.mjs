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
      import: {
        pageTitle: "मुफ्त सामग्री आयात करें",
        subtitle: "मुफ्त स्रोतों से सार्वजनिक सामग्री ब्राउज़ और आयात करें",
        selectCategory: "आयातित फिल्मों के लिए श्रेणी चुनें:",
        categoryPlaceholder: "श्रेणी चुनें...",
        loading: "स्रोत लोड हो रहे हैं...",
        sourceTypes: {
          vod: "फिल्में और VOD",
          live_tv: "लाइव टीवी",
          radio: "रेडियो",
          podcasts: "पॉडकास्ट"
        },
        items: "आइटम",
        itemsPlural: "आइटम",
        selectItems: "कृपया आयात के लिए कम से कम एक आइटम चुनें",
        selectCategory_vod: "कृपया VOD आयात के लिए श्रेणी चुनें",
        importing: "{{count}} आयात हो रहा है... {{percent}}%",
        importButton: "{{count}} {{item}} आयात करें",
        noSources: "कोई स्रोत उपलब्ध नहीं",
        noSourcesDescription: "{{type}} के लिए वर्तमान में कोई मुफ्त सामग्री स्रोत उपलब्ध नहीं है"
      },
      filters: {
        contentType: "सामग्री प्रकार",
        series: "सीरीज",
        movies: "फिल्में",
        audiobooks: "ऑडियोबुक्स",
        podcasts: "पॉडकास्ट",
        radioStations: "रेडियो स्टेशन",
        allStatus: "सभी स्थिति"
      },
      status: {
        published: "प्रकाशित",
        draft: "ड्राफ्ट"
      },
      columns: {
        title: "शीर्षक",
        category: "श्रेणी",
        year: "वर्ष",
        status: "स्थिति",
        views: "दृश्य",
        rating: "रेटिंग",
        streamUrl: "स्ट्रीम URL",
        epgSource: "EPG स्रोत",
        genre: "शैली",
        episodeNumber: "एपिसोड #",
        description: "विवरण",
        duration: "अवधि",
        publishedDate: "प्रकाशित",
        episodes: "एपिसोड",
        order: "क्रम",
        name: "नाम",
        slug: "स्लग",
        subtitles: "उपशीर्षक"
      },
      validation: {
        titleRequired: "शीर्षक आवश्यक है",
        nameRequired: "नाम आवश्यक है",
        streamUrlRequired: "स्ट्रीम URL आवश्यक है",
        audioUrlRequired: "ऑडियो URL आवश्यक है"
      },
      categoryPicker: {
        selectPlaceholder: "श्रेणी चुनें...",
        searchPlaceholder: "श्रेणियां खोजें...",
        loading: "श्रेणियां लोड हो रही हैं...",
        noResults: "कोई श्रेणी नहीं मिली",
        noCategories: "कोई श्रेणी उपलब्ध नहीं",
        createNew: "नई श्रेणी बनाएं",
        errors: {
          loadFailed: "श्रेणियां लोड करने में विफल",
          createFailed: "श्रेणी बनाने में विफल"
        },
        modal: {
          title: "नई श्रेणी बनाएं",
          placeholder: "श्रेणी नाम (जैसे, फिल्में, सीरीज)",
          creating: "बनाया जा रहा है...",
          create: "बनाएं"
        }
      },
      streamUrlInput: {
        copyUrl: "URL कॉपी करें",
        copied: "URL क्लिपबोर्ड पर कॉपी किया गया",
        streamType: "स्ट्रीम प्रकार",
        validUrl: "URL वैध है - {{type}} के रूप में पहचाना गया",
        errors: {
          required: "स्ट्रीम URL आवश्यक है",
          invalidFormat: "अमान्य URL प्रारूप"
        },
        supportedFormats: {
          title: "समर्थित प्रारूप:",
          hls: "HLS: .m3u8 स्ट्रीम",
          dash: "DASH: .mpd स्ट्रीम",
          audio: "ऑडियो: .mp3, .aac, या ऑडियो स्ट्रीम"
        }
      }
    }
  }
};

deepMerge(hi, translations);
fs.writeFileSync('hi.json', JSON.stringify(hi, null, 2) + '\n');
console.log('Part 7 complete - admin.content.import, filters, columns, validation, categoryPicker, streamUrlInput');
