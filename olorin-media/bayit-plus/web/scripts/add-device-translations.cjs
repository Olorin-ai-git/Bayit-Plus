#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Device translations for each language
const translations = {
  he: {
    tabs_devices: 'מכשירים',
    devices: {
      registeredDevices: 'מכשירים רשומים',
      description: 'נהל מכשירים שיש להם גישה לחשבונך. תוכל לנתק מכשירים כדי לפנות חריצי סטרימינג.',
      noDevices: 'אין מכשירים מחוברים',
      noDevicesDescription: 'מכשירים יופיעו כאן כשתתחבר בפלטפורמות שונות',
      activeNow: 'פעיל כעת',
      minutesAgo: 'לפני {{count}} דקות',
      hoursAgo: 'לפני {{count}} שעות',
      daysAgo: 'לפני {{count}} ימים',
      disconnect: 'התנתק',
      confirmDisconnect: 'לנתק מכשיר?',
      confirmDisconnectMessage: 'זה יסיים את כל הפעלות הסטרימינג הפעילות במכשיר זה ויסיר אותו מהחשבון שלך.',
      disconnectSuccess: 'המכשיר נותק',
      disconnectSuccessMessage: 'המכשיר נותק בהצלחה.',
      disconnectSuccessWithSessions: 'המכשיר נותק ו-{{count}} סשן/סשנים פעילים הסתיימו.',
      thisDevice: 'מכשיר זה',
      loading: 'טוען מכשירים...'
    }
  },
  es: {
    tabs_devices: 'Dispositivos',
    devices: {
      registeredDevices: 'Dispositivos Registrados',
      description: 'Gestiona los dispositivos que tienen acceso a tu cuenta. Puedes desconectar dispositivos para liberar espacios de transmisión.',
      noDevices: 'No hay dispositivos conectados',
      noDevicesDescription: 'Los dispositivos aparecerán aquí cuando inicies sesión en diferentes plataformas',
      activeNow: 'Activo ahora',
      minutesAgo: 'hace {{count}} minutos',
      hoursAgo: 'hace {{count}} horas',
      daysAgo: 'hace {{count}} días',
      disconnect: 'Desconectar',
      confirmDisconnect: '¿Desconectar Dispositivo?',
      confirmDisconnectMessage: 'Esto finalizará todas las sesiones de reproducción activas en este dispositivo y lo eliminará de tu cuenta.',
      disconnectSuccess: 'Dispositivo Desconectado',
      disconnectSuccessMessage: 'El dispositivo se ha desconectado correctamente.',
      disconnectSuccessWithSessions: 'Dispositivo desconectado y {{count}} sesión/sesiones activa(s) finalizada(s).',
      thisDevice: 'Este dispositivo',
      loading: 'Cargando dispositivos...'
    }
  },
  fr: {
    tabs_devices: 'Appareils',
    devices: {
      registeredDevices: 'Appareils Enregistrés',
      description: 'Gérez les appareils qui ont accès à votre compte. Vous pouvez déconnecter des appareils pour libérer des emplacements de streaming.',
      noDevices: 'Aucun appareil connecté',
      noDevicesDescription: 'Les appareils apparaîtront ici lorsque vous vous connecterez sur différentes plateformes',
      activeNow: 'Actif maintenant',
      minutesAgo: 'il y a {{count}} minutes',
      hoursAgo: 'il y a {{count}} heures',
      daysAgo: 'il y a {{count}} jours',
      disconnect: 'Déconnecter',
      confirmDisconnect: 'Déconnecter l\'Appareil ?',
      confirmDisconnectMessage: 'Cela mettra fin à toutes les sessions de lecture actives sur cet appareil et le supprimera de votre compte.',
      disconnectSuccess: 'Appareil Déconnecté',
      disconnectSuccessMessage: 'L\'appareil a été déconnecté avec succès.',
      disconnectSuccessWithSessions: 'Appareil déconnecté et {{count}} session(s) active(s) terminée(s).',
      thisDevice: 'Cet appareil',
      loading: 'Chargement des appareils...'
    }
  },
  it: {
    tabs_devices: 'Dispositivi',
    devices: {
      registeredDevices: 'Dispositivi Registrati',
      description: 'Gestisci i dispositivi che hanno accesso al tuo account. Puoi disconnettere i dispositivi per liberare slot di streaming.',
      noDevices: 'Nessun dispositivo connesso',
      noDevicesDescription: 'I dispositivi appariranno qui quando accedi su piattaforme diverse',
      activeNow: 'Attivo ora',
      minutesAgo: '{{count}} minuti fa',
      hoursAgo: '{{count}} ore fa',
      daysAgo: '{{count}} giorni fa',
      disconnect: 'Disconnetti',
      confirmDisconnect: 'Disconnettere il Dispositivo?',
      confirmDisconnectMessage: 'Questo terminerà tutte le sessioni di riproduzione attive su questo dispositivo e lo rimuoverà dal tuo account.',
      disconnectSuccess: 'Dispositivo Disconnesso',
      disconnectSuccessMessage: 'Il dispositivo è stato disconnesso con successo.',
      disconnectSuccessWithSessions: 'Dispositivo disconnesso e {{count}} sessione/i attiva/e terminata/e.',
      thisDevice: 'Questo dispositivo',
      loading: 'Caricamento dispositivi...'
    }
  },
  ja: {
    tabs_devices: 'デバイス',
    devices: {
      registeredDevices: '登録済みデバイス',
      description: 'アカウントにアクセスできるデバイスを管理します。デバイスを切断してストリーミングスロットを解放できます。',
      noDevices: 'デバイスが接続されていません',
      noDevicesDescription: '異なるプラットフォームでログインすると、デバイスがここに表示されます',
      activeNow: '現在アクティブ',
      minutesAgo: '{{count}}分前',
      hoursAgo: '{{count}}時間前',
      daysAgo: '{{count}}日前',
      disconnect: '切断',
      confirmDisconnect: 'デバイスを切断しますか？',
      confirmDisconnectMessage: 'このデバイス上のすべてのアクティブな再生セッションを終了し、アカウントから削除します。',
      disconnectSuccess: 'デバイスが切断されました',
      disconnectSuccessMessage: 'デバイスが正常に切断されました。',
      disconnectSuccessWithSessions: 'デバイスが切断され、{{count}}個のアクティブセッションが終了しました。',
      thisDevice: 'このデバイス',
      loading: 'デバイスを読み込み中...'
    }
  },
  zh: {
    tabs_devices: '设备',
    devices: {
      registeredDevices: '已注册设备',
      description: '管理有权访问您账户的设备。您可以断开设备连接以释放流媒体插槽。',
      noDevices: '没有连接的设备',
      noDevicesDescription: '当您在不同平台上登录时，设备将显示在此处',
      activeNow: '当前活跃',
      minutesAgo: '{{count}}分钟前',
      hoursAgo: '{{count}}小时前',
      daysAgo: '{{count}}天前',
      disconnect: '断开连接',
      confirmDisconnect: '断开设备连接？',
      confirmDisconnectMessage: '这将结束此设备上的所有活动播放会话并将其从您的账户中删除。',
      disconnectSuccess: '设备已断开',
      disconnectSuccessMessage: '设备已成功断开连接。',
      disconnectSuccessWithSessions: '设备已断开连接，{{count}}个活动会话已结束。',
      thisDevice: '此设备',
      loading: '正在加载设备...'
    }
  },
  hi: {
    tabs_devices: 'डिवाइस',
    devices: {
      registeredDevices: 'पंजीकृत डिवाइस',
      description: 'अपने खाते तक पहुंच वाले डिवाइस प्रबंधित करें। स्ट्रीमिंग स्लॉट खाली करने के लिए आप डिवाइस डिस्कनेक्ट कर सकते हैं।',
      noDevices: 'कोई डिवाइस कनेक्ट नहीं है',
      noDevicesDescription: 'जब आप विभिन्न प्लेटफ़ॉर्म पर लॉगिन करेंगे तो डिवाइस यहां दिखाई देंगे',
      activeNow: 'अभी सक्रिय',
      minutesAgo: '{{count}} मिनट पहले',
      hoursAgo: '{{count}} घंटे पहले',
      daysAgo: '{{count}} दिन पहले',
      disconnect: 'डिस्कनेक्ट करें',
      confirmDisconnect: 'डिवाइस डिस्कनेक्ट करें?',
      confirmDisconnectMessage: 'यह इस डिवाइस पर सभी सक्रिय प्लेबैक सत्रों को समाप्त कर देगा और इसे आपके खाते से हटा देगा।',
      disconnectSuccess: 'डिवाइस डिस्कनेक्ट हो गया',
      disconnectSuccessMessage: 'डिवाइस सफलतापूर्वक डिस्कनेक्ट हो गया है।',
      disconnectSuccessWithSessions: 'डिवाइस डिस्कनेक्ट हो गया और {{count}} सक्रिय सत्र समाप्त हो गए।',
      thisDevice: 'यह डिवाइस',
      loading: 'डिवाइस लोड हो रहे हैं...'
    }
  },
  ta: {
    tabs_devices: 'சாதனங்கள்',
    devices: {
      registeredDevices: 'பதிவுசெய்யப்பட்ட சாதனங்கள்',
      description: 'உங்கள் கணக்கிற்கு அணுகல் உள்ள சாதனங்களை நிர்வகிக்கவும். ஸ்ட்ரீமிங் இடங்களை விடுவிக்க சாதனங்களைத் துண்டிக்கலாம்.',
      noDevices: 'இணைக்கப்பட்ட சாதனங்கள் இல்லை',
      noDevicesDescription: 'வெவ்வேறு இயங்குதளங்களில் உள்நுழையும்போது சாதனங்கள் இங்கே தோன்றும்',
      activeNow: 'இப்போது செயலில் உள்ளது',
      minutesAgo: '{{count}} நிமிடங்களுக்கு முன்பு',
      hoursAgo: '{{count}} மணி நேரத்திற்கு முன்பு',
      daysAgo: '{{count}} நாட்களுக்கு முன்பு',
      disconnect: 'துண்டிக்கவும்',
      confirmDisconnect: 'சாதனத்தைத் துண்டிக்கவா?',
      confirmDisconnectMessage: 'இது இந்தச் சாதனத்தில் உள்ள அனைத்து செயலில் உள்ள பிளேபேக் அமர்வுகளையும் முடித்து, உங்கள் கணக்கிலிருந்து அதை அகற்றும்.',
      disconnectSuccess: 'சாதனம் துண்டிக்கப்பட்டது',
      disconnectSuccessMessage: 'சாதனம் வெற்றிகரமாக துண்டிக்கப்பட்டது.',
      disconnectSuccessWithSessions: 'சாதனம் துண்டிக்கப்பட்டது மற்றும் {{count}} செயலில் உள்ள அமர்வுகள் முடிந்தன.',
      thisDevice: 'இந்தச் சாதனம்',
      loading: 'சாதனங்கள் ஏற்றப்படுகின்றன...'
    }
  },
  bn: {
    tabs_devices: 'ডিভাইস',
    devices: {
      registeredDevices: 'নিবন্ধিত ডিভাইস',
      description: 'আপনার অ্যাকাউন্টে অ্যাক্সেস আছে এমন ডিভাইসগুলি পরিচালনা করুন। স্ট্রিমিং স্লট খালি করতে আপনি ডিভাইসগুলি সংযোগ বিচ্ছিন্ন করতে পারেন।',
      noDevices: 'কোনো ডিভাইস সংযুক্ত নেই',
      noDevicesDescription: 'যখন আপনি বিভিন্ন প্ল্যাটফর্মে লগইন করবেন তখন ডিভাইসগুলি এখানে প্রদর্শিত হবে',
      activeNow: 'এখন সক্রিয়',
      minutesAgo: '{{count}} মিনিট আগে',
      hoursAgo: '{{count}} ঘণ্টা আগে',
      daysAgo: '{{count}} দিন আগে',
      disconnect: 'সংযোগ বিচ্ছিন্ন করুন',
      confirmDisconnect: 'ডিভাইস সংযোগ বিচ্ছিন্ন করবেন?',
      confirmDisconnectMessage: 'এটি এই ডিভাইসে সমস্ত সক্রিয় প্লেব্যাক সেশন শেষ করবে এবং আপনার অ্যাকাউন্ট থেকে এটি সরিয়ে দেবে।',
      disconnectSuccess: 'ডিভাইস সংযোগ বিচ্ছিন্ন হয়েছে',
      disconnectSuccessMessage: 'ডিভাইসটি সফলভাবে সংযোগ বিচ্ছিন্ন হয়েছে।',
      disconnectSuccessWithSessions: 'ডিভাইস সংযোগ বিচ্ছিন্ন হয়েছে এবং {{count}}টি সক্রিয় সেশন শেষ হয়েছে।',
      thisDevice: 'এই ডিভাইস',
      loading: 'ডিভাইস লোড হচ্ছে...'
    }
  }
};

const localesDir = path.join(__dirname, '../../shared/i18n/locales');

function addDeviceTranslations(langCode) {
  const filePath = path.join(localesDir, `${langCode}.json`);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${langCode}.json`);
    return;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(content);

    // Ensure profile section exists
    if (!json.profile) {
      json.profile = {};
    }

    // Ensure profile.tabs exists
    if (!json.profile.tabs) {
      json.profile.tabs = {};
    }

    // Add devices tab if not already present
    if (!json.profile.tabs.devices) {
      json.profile.tabs.devices = translations[langCode].tabs_devices;
    }

    // Add devices section if not already present
    if (!json.profile.devices) {
      json.profile.devices = translations[langCode].devices;
    }

    // Write back to file with proper formatting
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');
    console.log(`✅ Updated ${langCode}.json`);
  } catch (error) {
    console.error(`❌ Error processing ${langCode}.json:`, error.message);
  }
}

// Process all language files
console.log('Adding device translations to language files...\n');

Object.keys(translations).forEach(langCode => {
  addDeviceTranslations(langCode);
});

console.log('\n✨ Device translations added successfully!');
