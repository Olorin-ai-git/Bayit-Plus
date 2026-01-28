#!/usr/bin/env node
/**
 * Script to update empty state translations across all 10 languages
 *
 * Updates the "empty" section in all locale files with standardized
 * GlassEmptyState translations.
 */

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../packages/ui/shared-i18n/locales');

// Translation data for all languages
const translations = {
  es: { // Spanish
    "noContent": {
      "title": "Sin contenido aún",
      "description": "El contenido aparecerá aquí cuando esté disponible"
    },
    "noResults": {
      "title": "No se encontraron resultados",
      "description": "Prueba con diferentes palabras clave o filtros"
    },
    "noQuery": {
      "title": "Comenzar a buscar",
      "description": "Ingresa palabras clave para encontrar contenido"
    },
    "error": {
      "title": "Algo salió mal",
      "description": "No se pudo cargar el contenido. Por favor, inténtalo de nuevo."
    },
    "loading": {
      "title": "Cargando...",
      "description": "Por favor espera mientras cargamos tu contenido"
    },
    "noFavorites": {
      "title": "Sin favoritos aún",
      "description": "Agrega contenido a favoritos para verlo aquí"
    },
    "noDownloads": {
      "title": "Sin descargas",
      "description": "Descarga contenido para ver sin conexión"
    },
    "sectionEmpty": {
      "title": "Sin elementos",
      "description": "Esta sección está vacía"
    },
    "noData": {
      "title": "Sin datos disponibles",
      "description": "Los datos aparecerán aquí cuando estén disponibles"
    },
    "permissionDenied": {
      "title": "Acceso denegado",
      "description": "No tienes permiso para ver este contenido"
    }
  },
  zh: { // Chinese
    "noContent": {
      "title": "尚无内容",
      "description": "内容可用时将显示在此处"
    },
    "noResults": {
      "title": "未找到结果",
      "description": "尝试不同的关键词或筛选条件"
    },
    "noQuery": {
      "title": "开始搜索",
      "description": "输入关键词以查找内容"
    },
    "error": {
      "title": "出错了",
      "description": "无法加载内容。请重试。"
    },
    "loading": {
      "title": "加载中...",
      "description": "请稍候，我们正在加载您的内容"
    },
    "noFavorites": {
      "title": "尚无收藏",
      "description": "将内容添加到收藏以在此处查看"
    },
    "noDownloads": {
      "title": "无下载内容",
      "description": "下载内容以离线观看"
    },
    "sectionEmpty": {
      "title": "无项目",
      "description": "此部分为空"
    },
    "noData": {
      "title": "无可用数据",
      "description": "数据可用时将显示在此处"
    },
    "permissionDenied": {
      "title": "访问被拒绝",
      "description": "您无权查看此内容"
    }
  },
  fr: { // French
    "noContent": {
      "title": "Pas encore de contenu",
      "description": "Le contenu apparaîtra ici lorsqu'il sera disponible"
    },
    "noResults": {
      "title": "Aucun résultat trouvé",
      "description": "Essayez différents mots-clés ou filtres"
    },
    "noQuery": {
      "title": "Commencer à rechercher",
      "description": "Entrez des mots-clés pour trouver du contenu"
    },
    "error": {
      "title": "Quelque chose s'est mal passé",
      "description": "Impossible de charger le contenu. Veuillez réessayer."
    },
    "loading": {
      "title": "Chargement...",
      "description": "Veuillez patienter pendant que nous chargeons votre contenu"
    },
    "noFavorites": {
      "title": "Pas encore de favoris",
      "description": "Ajoutez du contenu aux favoris pour le voir ici"
    },
    "noDownloads": {
      "title": "Aucun téléchargement",
      "description": "Téléchargez du contenu pour regarder hors ligne"
    },
    "sectionEmpty": {
      "title": "Aucun élément",
      "description": "Cette section est vide"
    },
    "noData": {
      "title": "Aucune donnée disponible",
      "description": "Les données apparaîtront ici lorsqu'elles seront disponibles"
    },
    "permissionDenied": {
      "title": "Accès refusé",
      "description": "Vous n'avez pas la permission de voir ce contenu"
    }
  },
  it: { // Italian
    "noContent": {
      "title": "Nessun contenuto ancora",
      "description": "Il contenuto apparirà qui quando disponibile"
    },
    "noResults": {
      "title": "Nessun risultato trovato",
      "description": "Prova con parole chiave o filtri diversi"
    },
    "noQuery": {
      "title": "Inizia a cercare",
      "description": "Inserisci parole chiave per trovare contenuti"
    },
    "error": {
      "title": "Qualcosa è andato storto",
      "description": "Impossibile caricare il contenuto. Riprova."
    },
    "loading": {
      "title": "Caricamento...",
      "description": "Attendi mentre carichiamo il tuo contenuto"
    },
    "noFavorites": {
      "title": "Nessun preferito ancora",
      "description": "Aggiungi contenuti ai preferiti per vederli qui"
    },
    "noDownloads": {
      "title": "Nessun download",
      "description": "Scarica contenuti per guardare offline"
    },
    "sectionEmpty": {
      "title": "Nessun elemento",
      "description": "Questa sezione è vuota"
    },
    "noData": {
      "title": "Nessun dato disponibile",
      "description": "I dati appariranno qui quando disponibili"
    },
    "permissionDenied": {
      "title": "Accesso negato",
      "description": "Non hai il permesso di visualizzare questo contenuto"
    }
  },
  hi: { // Hindi
    "noContent": {
      "title": "अभी तक कोई सामग्री नहीं",
      "description": "सामग्री उपलब्ध होने पर यहाँ दिखाई देगी"
    },
    "noResults": {
      "title": "कोई परिणाम नहीं मिला",
      "description": "विभिन्न कीवर्ड या फ़िल्टर आज़माएं"
    },
    "noQuery": {
      "title": "खोज शुरू करें",
      "description": "सामग्री खोजने के लिए कीवर्ड दर्ज करें"
    },
    "error": {
      "title": "कुछ गलत हो गया",
      "description": "सामग्री लोड करने में असमर्थ। कृपया पुनः प्रयास करें।"
    },
    "loading": {
      "title": "लोड हो रहा है...",
      "description": "कृपया प्रतीक्षा करें जब तक हम आपकी सामग्री लोड करते हैं"
    },
    "noFavorites": {
      "title": "अभी तक कोई पसंदीदा नहीं",
      "description": "यहाँ देखने के लिए पसंदीदा में सामग्री जोड़ें"
    },
    "noDownloads": {
      "title": "कोई डाउनलोड नहीं",
      "description": "ऑफ़लाइन देखने के लिए सामग्री डाउनलोड करें"
    },
    "sectionEmpty": {
      "title": "कोई आइटम नहीं",
      "description": "यह अनुभाग खाली है"
    },
    "noData": {
      "title": "कोई डेटा उपलब्ध नहीं",
      "description": "डेटा उपलब्ध होने पर यहाँ दिखाई देगा"
    },
    "permissionDenied": {
      "title": "पहुंच अस्वीकृत",
      "description": "आपके पास यह सामग्री देखने की अनुमति नहीं है"
    }
  },
  ta: { // Tamil
    "noContent": {
      "title": "இன்னும் உள்ளடக்கம் இல்லை",
      "description": "உள்ளடக்கம் கிடைக்கும்போது இங்கே தோன்றும்"
    },
    "noResults": {
      "title": "முடிவுகள் எதுவும் கிடைக்கவில்லை",
      "description": "வெவ்வேறு முக்கிய வார்த்தைகள் அல்லது வடிப்பான்களை முயற்சிக்கவும்"
    },
    "noQuery": {
      "title": "தேடலைத் தொடங்கவும்",
      "description": "உள்ளடக்கத்தைக் கண்டறிய முக்கிய வார்த்தைகளை உள்ளிடவும்"
    },
    "error": {
      "title": "ஏதோ தவறு நடந்துவிட்டது",
      "description": "உள்ளடக்கத்தை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்."
    },
    "loading": {
      "title": "ஏற்றுகிறது...",
      "description": "உங்கள் உள்ளடக்கத்தை ஏற்றும்போது காத்திருக்கவும்"
    },
    "noFavorites": {
      "title": "இன்னும் விருப்பங்கள் இல்லை",
      "description": "இங்கே பார்க்க விருப்பங்களில் உள்ளடக்கத்தைச் சேர்க்கவும்"
    },
    "noDownloads": {
      "title": "பதிவிறக்கங்கள் இல்லை",
      "description": "ஆஃப்லைனில் பார்க்க உள்ளடக்கத்தைப் பதிவிறக்கவும்"
    },
    "sectionEmpty": {
      "title": "உருப்படிகள் இல்லை",
      "description": "இந்த பிரிவு காலியாக உள்ளது"
    },
    "noData": {
      "title": "தரவு கிடைக்கவில்லை",
      "description": "தரவு கிடைக்கும்போது இங்கே தோன்றும்"
    },
    "permissionDenied": {
      "title": "அணுகல் மறுக்கப்பட்டது",
      "description": "இந்த உள்ளடக்கத்தைப் பார்க்க உங்களுக்கு அனுமதி இல்லை"
    }
  },
  bn: { // Bengali
    "noContent": {
      "title": "এখনও কোনও বিষয়বস্তু নেই",
      "description": "বিষয়বস্তু উপলব্ধ হলে এখানে প্রদর্শিত হবে"
    },
    "noResults": {
      "title": "কোনও ফলাফল পাওয়া যায়নি",
      "description": "বিভিন্ন কীওয়ার্ড বা ফিল্টার চেষ্টা করুন"
    },
    "noQuery": {
      "title": "অনুসন্ধান শুরু করুন",
      "description": "বিষয়বস্তু খুঁজে পেতে কীওয়ার্ড লিখুন"
    },
    "error": {
      "title": "কিছু ভুল হয়েছে",
      "description": "বিষয়বস্তু লোড করতে অক্ষম। অনুগ্রহ করে আবার চেষ্টা করুন।"
    },
    "loading": {
      "title": "লোড হচ্ছে...",
      "description": "আমরা আপনার বিষয়বস্তু লোড করার সময় অপেক্ষা করুন"
    },
    "noFavorites": {
      "title": "এখনও কোনও প্রিয় নেই",
      "description": "এখানে দেখতে প্রিয়তে বিষয়বস্তু যোগ করুন"
    },
    "noDownloads": {
      "title": "কোনও ডাউনলোড নেই",
      "description": "অফলাইনে দেখতে বিষয়বস্তু ডাউনলোড করুন"
    },
    "sectionEmpty": {
      "title": "কোনও আইটেম নেই",
      "description": "এই বিভাগটি খালি"
    },
    "noData": {
      "title": "কোনও ডেটা উপলব্ধ নেই",
      "description": "ডেটা উপলব্ধ হলে এখানে প্রদর্শিত হবে"
    },
    "permissionDenied": {
      "title": "অ্যাক্সেস অস্বীকৃত",
      "description": "এই বিষয়বস্তু দেখার অনুমতি আপনার নেই"
    }
  },
  ja: { // Japanese
    "noContent": {
      "title": "まだコンテンツがありません",
      "description": "コンテンツが利用可能になるとここに表示されます"
    },
    "noResults": {
      "title": "結果が見つかりませんでした",
      "description": "異なるキーワードやフィルターを試してください"
    },
    "noQuery": {
      "title": "検索を開始",
      "description": "コンテンツを検索するためにキーワードを入力してください"
    },
    "error": {
      "title": "問題が発生しました",
      "description": "コンテンツを読み込めません。もう一度お試しください。"
    },
    "loading": {
      "title": "読み込み中...",
      "description": "コンテンツを読み込んでいますのでお待ちください"
    },
    "noFavorites": {
      "title": "まだお気に入りがありません",
      "description": "ここに表示するにはお気に入りにコンテンツを追加してください"
    },
    "noDownloads": {
      "title": "ダウンロードはありません",
      "description": "オフラインで視聴するにはコンテンツをダウンロードしてください"
    },
    "sectionEmpty": {
      "title": "アイテムがありません",
      "description": "このセクションは空です"
    },
    "noData": {
      "title": "利用可能なデータがありません",
      "description": "データが利用可能になるとここに表示されます"
    },
    "permissionDenied": {
      "title": "アクセスが拒否されました",
      "description": "このコンテンツを表示する権限がありません"
    }
  }
};

// Update each language file
Object.keys(translations).forEach(lang => {
  const filePath = path.join(localesDir, `${lang}.json`);

  try {
    // Read existing file
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);

    // Preserve existing keys, add new translations
    const existingEmpty = data.empty || {};
    data.empty = {
      ...translations[lang],
      // Preserve any existing legacy keys not in new structure
      ...(existingEmpty.tryAnotherCategory && { tryAnotherCategory: existingEmpty.tryAnotherCategory }),
      ...(existingEmpty.noPodcasts && { noPodcasts: existingEmpty.noPodcasts }),
      ...(existingEmpty.tryLater && { tryLater: existingEmpty.tryLater }),
    };

    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`✅ Updated ${lang}.json`);
  } catch (error) {
    console.error(`❌ Failed to update ${lang}.json:`, error.message);
  }
});

console.log('\n🎉 All translations updated successfully!');
