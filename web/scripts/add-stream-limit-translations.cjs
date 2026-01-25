const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../../shared/i18n/locales');

const translations = {
  he: {
    streamLimit: {
      title: 'הגעת למגבלת הזרמות',
      message: 'הגעת למספר המקסימלי של הזרמות במקביל ({{maxStreams}}) עבור התוכנית שלך.',
      activeDevices: 'מזרים כרגע ב-{{count}} מכשירים:',
      hint: 'נתק מכשיר כדי לפנות חריץ הזרמה, או שדרג את התוכנית שלך לקבלת יותר הזרמות במקביל.',
      manageDevices: 'נהל מכשירים'
    }
  },
  es: {
    streamLimit: {
      title: 'Límite de transmisión alcanzado',
      message: 'Has alcanzado el número máximo de transmisiones simultáneas ({{maxStreams}}) para tu plan.',
      activeDevices: 'Transmitiendo actualmente en {{count}} dispositivo(s):',
      hint: 'Desconecta un dispositivo para liberar un espacio de transmisión, o mejora tu plan para más transmisiones simultáneas.',
      manageDevices: 'Administrar dispositivos'
    }
  },
  fr: {
    streamLimit: {
      title: 'Limite de diffusion atteinte',
      message: 'Vous avez atteint le nombre maximum de diffusions simultanées ({{maxStreams}}) pour votre forfait.',
      activeDevices: 'Diffusion en cours sur {{count}} appareil(s):',
      hint: 'Déconnectez un appareil pour libérer un emplacement de diffusion, ou mettez à niveau votre forfait pour plus de diffusions simultanées.',
      manageDevices: 'Gérer les appareils'
    }
  },
  it: {
    streamLimit: {
      title: 'Limite di streaming raggiunto',
      message: 'Hai raggiunto il numero massimo di streaming simultanei ({{maxStreams}}) per il tuo piano.',
      activeDevices: 'Attualmente in streaming su {{count}} dispositivo(i):',
      hint: 'Disconnetti un dispositivo per liberare uno slot di streaming, o aggiorna il tuo piano per più streaming simultanei.',
      manageDevices: 'Gestisci dispositivi'
    }
  },
  ja: {
    streamLimit: {
      title: 'ストリーミング制限に達しました',
      message: 'プランの同時ストリーミング数の上限（{{maxStreams}}）に達しました。',
      activeDevices: '現在{{count}}台のデバイスでストリーミング中:',
      hint: 'デバイスを切断してストリーミングスロットを解放するか、プランをアップグレードして同時ストリーミング数を増やしてください。',
      manageDevices: 'デバイスを管理'
    }
  },
  zh: {
    streamLimit: {
      title: '已达到流媒体限制',
      message: '您已达到套餐的最大并发流媒体数（{{maxStreams}}）。',
      activeDevices: '当前正在{{count}}个设备上流式传输:',
      hint: '断开一个设备以释放流媒体插槽，或升级您的套餐以获得更多并发流媒体。',
      manageDevices: '管理设备'
    }
  },
  hi: {
    streamLimit: {
      title: 'स्ट्रीमिंग सीमा पहुँच गई',
      message: 'आप अपनी योजना के लिए अधिकतम समवर्ती स्ट्रीम ({{maxStreams}}) तक पहुँच गए हैं।',
      activeDevices: 'वर्तमान में {{count}} डिवाइस(ओं) पर स्ट्रीमिंग:',
      hint: 'स्ट्रीमिंग स्लॉट खाली करने के लिए एक डिवाइस को डिस्कनेक्ट करें, या अधिक समवर्ती स्ट्रीम के लिए अपनी योजना को अपग्रेड करें।',
      manageDevices: 'डिवाइस प्रबंधित करें'
    }
  },
  ta: {
    streamLimit: {
      title: 'ஸ்ட்ரீமிங் வரம்பை அடைந்துவிட்டது',
      message: 'உங்கள் திட்டத்திற்கான அதிகபட்ச ஒரே நேர ஸ்ட்ரீம்களை ({{maxStreams}}) நீங்கள் அடைந்துவிட்டீர்கள்.',
      activeDevices: 'தற்போது {{count}} சாதனங்களில் ஸ்ட்ரீமிங் செய்யப்படுகிறது:',
      hint: 'ஸ்ட்ரீமிங் இடத்தை விடுவிக்க ஒரு சாதனத்தை துண்டிக்கவும், அல்லது அதிக ஒரே நேர ஸ்ட்ரீம்களுக்கு உங்கள் திட்டத்தை மேம்படுத்தவும்.',
      manageDevices: 'சாதனங்களை நிர்வகி'
    }
  },
  bn: {
    streamLimit: {
      title: 'স্ট্রিমিং সীমা পৌঁছেছে',
      message: 'আপনি আপনার পরিকল্পনার সর্বাধিক সমকালীন স্ট্রিম ({{maxStreams}}) এ পৌঁছেছেন।',
      activeDevices: 'বর্তমানে {{count}} ডিভাইসে স্ট্রিমিং:',
      hint: 'একটি স্ট্রিমিং স্লট মুক্ত করতে একটি ডিভাইস সংযোগ বিচ্ছিন্ন করুন, বা আরও সমকালীন স্ট্রিমের জন্য আপনার পরিকল্পনা আপগ্রেড করুন।',
      manageDevices: 'ডিভাইস পরিচালনা করুন'
    }
  },
  en: {
    streamLimit: {
      title: 'Stream Limit Reached',
      message: 'You have reached the maximum number of concurrent streams ({{maxStreams}}) for your plan.',
      activeDevices: 'Currently streaming on {{count}} device(s):',
      hint: 'Disconnect a device to free up a streaming slot, or upgrade your plan for more concurrent streams.',
      manageDevices: 'Manage Devices'
    }
  }
};

const languages = ['he', 'es', 'fr', 'it', 'ja', 'zh', 'hi', 'ta', 'bn', 'en'];

languages.forEach(lang => {
  const filePath = path.join(localesDir, `${lang}.json`);

  try {
    // Read existing file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(fileContent);

    // Add player.streamLimit section
    if (!jsonData.player) {
      jsonData.player = {};
    }
    jsonData.player.streamLimit = translations[lang].streamLimit;

    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2) + '\n', 'utf8');
    console.log(`✅ Updated ${lang}.json with stream limit translations`);
  } catch (error) {
    console.error(`❌ Error updating ${lang}.json:`, error.message);
  }
});

console.log('\n✨ All language files updated successfully!');
