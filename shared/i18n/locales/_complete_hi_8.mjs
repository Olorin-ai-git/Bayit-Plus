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
      editor: {
        pageTitle: "सामग्री संपादित करें",
        pageTitleNew: "सामग्री जोड़ें",
        sections: {
          basicInfo: "मूल जानकारी",
          media: "मीडिया",
          streaming: "स्ट्रीमिंग",
          details: "सामग्री विवरण",
          publishing: "प्रकाशन",
          accessControl: "पहुंच नियंत्रण",
          podcastDetails: "पॉडकास्ट विवरण",
          episodeDetails: "एपिसोड विवरण",
          stationDetails: "स्टेशन विवरण",
          channelDetails: "चैनल विवरण"
        },
        fields: {
          title: "शीर्षक",
          titlePlaceholder: "सामग्री शीर्षक",
          titleRequired: "शीर्षक आवश्यक है",
          year: "वर्ष",
          yearPlaceholder: "2024",
          description: "विवरण",
          descriptionPlaceholder: "सामग्री विवरण",
          thumbnail: "थंबनेल (3:4 पहलू अनुपात)",
          thumbnailUrl: "थंबनेल URL",
          thumbnailUrlPlaceholder: "https://example.com/thumbnail.jpg",
          backdrop: "बैकड्रॉप (16:9 पहलू अनुपात)",
          backdropUrl: "बैकड्रॉप URL",
          posterCover: "पॉडकास्ट कवर",
          logo: "लोगो",
          channelLogo: "चैनल लोगो",
          stationLogo: "स्टेशन लोगो",
          streamUrl: "स्ट्रीम URL",
          streamUrlRequired: "स्ट्रीम URL आवश्यक है",
          streamType: "स्ट्रीम प्रकार",
          drmProtected: "DRM संरक्षित",
          drmProtectedLabel: "इस सामग्री को DRM सुरक्षा की आवश्यकता है",
          category: "श्रेणी",
          categoryRequired: "श्रेणी आवश्यक है",
          duration: "अवधि",
          durationPlaceholder: "1:30:00",
          rating: "रेटिंग",
          ratingPlaceholder: "PG-13",
          genre: "शैली",
          genrePlaceholder: "ड्रामा",
          director: "निर्देशक",
          directorPlaceholder: "निर्देशक का नाम",
          isSeries: "सीरीज",
          isSeriesLabel: "यह एक सीरीज/बहु-भाग सामग्री है",
          season: "सीज़न",
          episode: "एपिसोड",
          seriesId: "सीरीज ID",
          seriesIdPlaceholder: "सीरीज-पहचानकर्ता",
          isPublished: "प्रकाशित करें",
          isPublishedLabel: "इस सामग्री को तुरंत प्रकाशित करें",
          isFeatured: "विशेष",
          isFeaturedLabel: "इस सामग्री को होमपेज पर विशेष बनाएं",
          requiresSubscription: "आवश्यक सदस्यता",
          isKidsContent: "बच्चों की सामग्री",
          isKidsContentLabel: "यह बच्चों के अनुकूल सामग्री है",
          author: "लेखक",
          authorPlaceholder: "पॉडकास्ट लेखक",
          podcastCategory: "श्रेणी",
          podcastCategoryPlaceholder: "समाचार, विज्ञान, आदि।",
          rssFeed: "RSS फीड URL",
          rssFeedPlaceholder: "https://example.com/feed.xml",
          website: "वेबसाइट URL",
          websitePlaceholder: "https://example.com",
          episodeNumber: "एपिसोड #",
          seasonNumber: "सीज़न #",
          audioUrl: "ऑडियो URL",
          audioUrlRequired: "ऑडियो URL आवश्यक है",
          audioUrlPlaceholder: "https://example.com/episode.mp3",
          publishedAt: "प्रकाशन तिथि",
          epgSource: "EPG स्रोत URL",
          epgSourcePlaceholder: "https://example.com/epg.xml",
          currentShow: "वर्तमान शो",
          currentShowPlaceholder: "शो का नाम",
          nextShow: "अगला शो",
          nextShowPlaceholder: "शो का नाम",
          currentSong: "वर्तमान गाना",
          currentSongPlaceholder: "गाने का शीर्षक",
          isActive: "सक्रिय",
          isActiveLabel: "चैनल सक्रिय है",
          requiredSubscription: "आवश्यक सदस्यता",
          publishedDate: "प्रकाशन तिथि"
        },
        subscriptionTiers: {
          basic: "बेसिक",
          premium: "प्रीमियम",
          family: "परिवार"
        },
        actions: {
          save: "सहेजें",
          saving: "सहेजा जा रहा है...",
          cancel: "रद्द करें"
        },
        imageUpload: {
          dropHere: "छवि यहां छोड़ें या अपलोड करने के लिए क्लिक करें",
          formats: "PNG, JPG, WebP {{maxSize}}MB तक",
          uploading: "अपलोड हो रहा है...",
          success: "छवि सफलतापूर्वक अपलोड हुई",
          orPasteUrl: "या छवि URL पेस्ट करें",
          urlPlaceholder: "https://example.com/image.jpg",
          validateButton: "जोड़ें",
          validating: "सत्यापित हो रहा है...",
          clear: "छवि हटाएं",
          changeImage: "छवि बदलें",
          errors: {
            imageOnly: "कृपया एक छवि फ़ाइल चुनें",
            tooLarge: "फ़ाइल का आकार {{maxSize}}MB से कम होना चाहिए",
            uploadFailed: "अपलोड विफल",
            invalidUrl: "अमान्य URL"
          }
        }
      }
    }
  }
};

deepMerge(hi, translations);
fs.writeFileSync('hi.json', JSON.stringify(hi, null, 2) + '\n');
console.log('Part 8 complete - admin.content.editor');
