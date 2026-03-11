#!/usr/bin/env python3
"""Batch 1: Translate values common to all 9 languages (131 values)."""
import json
import os

DIRS = [
    "/Users/olorin/Documents/Projects/olorin/olorin-core/packages/shared-i18n/locales",
    "/Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/android-app/app/src/main/assets/locales",
]

SKIP_EXACT = {'Bayit+', 'Netflix', 'Plex', 'YouTube', 'Spotify', 'API', 'URL', 'HD', '4K', 'UHD', 'HDMI', 'WiFi', 'OK', 'TV', 'FM', 'AM'}

TRANSLATIONS = {
    "3D Avatar": {
        "he": "אווטאר תלת-ממדי", "es": "Avatar 3D", "zh": "3D 虚拟形象", "fr": "Avatar 3D",
        "it": "Avatar 3D", "hi": "3D अवतार", "ta": "3D அவதாரம்", "bn": "3D অবতার", "ja": "3Dアバター"
    },
    "3D Mesh Viewer": {
        "he": "מציג רשת תלת-ממדית", "es": "Visor de malla 3D", "zh": "3D 网格查看器", "fr": "Visionneuse de maillage 3D",
        "it": "Visualizzatore mesh 3D", "hi": "3D मेश व्यूअर", "ta": "3D மெஷ் காட்சியாளர்", "bn": "3D মেশ ভিউয়ার", "ja": "3Dメッシュビューア"
    },
    "3D mesh viewer requires WebView or GLSurfaceView integration": {
        "he": "מציג רשת תלת-ממדית דורש שילוב WebView או GLSurfaceView", "es": "El visor de malla 3D requiere integración con WebView o GLSurfaceView",
        "zh": "3D 网格查看器需要 WebView 或 GLSurfaceView 集成", "fr": "Le visualiseur de maillage 3D nécessite l'intégration de WebView ou GLSurfaceView",
        "it": "Il visualizzatore mesh 3D richiede l'integrazione di WebView o GLSurfaceView", "hi": "3D मेश व्यूअर के लिए WebView या GLSurfaceView एकीकरण आवश्यक है",
        "ta": "3D மெஷ் காட்சியாளருக்கு WebView அல்லது GLSurfaceView ஒருங்கிணைப்பு தேவை", "bn": "3D মেশ ভিউয়ারের জন্য WebView বা GLSurfaceView ইন্টিগ্রেশন প্রয়োজন",
        "ja": "3DメッシュビューアにはWebViewまたはGLSurfaceViewの統合が必要です"
    },
    "ARPU": {
        "he": "הכנסה ממוצעת למשתמש", "es": "Ingreso promedio por usuario", "zh": "每用户平均收入", "fr": "Revenu moyen par utilisateur",
        "it": "Ricavo medio per utente", "hi": "प्रति उपयोगकर्ता औसत राजस्व", "ta": "பயனர் ஒருவருக்கான சராசரி வருவாய்",
        "bn": "প্রতি ব্যবহারকারী গড় আয়", "ja": "ユーザーあたりの平均収益"
    },
    "About Shabbat Mode": {
        "he": "אודות מצב שבת", "es": "Acerca del modo Shabat", "zh": "关于安息日模式", "fr": "À propos du mode Chabbat",
        "it": "Informazioni sulla modalità Shabbat", "hi": "शबत मोड के बारे में", "ta": "ஷப்பாத் பயன்முறை பற்றி",
        "bn": "শাব্বাত মোড সম্পর্কে", "ja": "シャバットモードについて"
    },
    "Accessories": {
        "he": "אביזרים", "es": "Accesorios", "zh": "配件", "fr": "Accessoires",
        "it": "Accessori", "hi": "सहायक उपकरण", "ta": "துணைக்கருவிகள்", "bn": "আনুষঙ্গিক", "ja": "アクセサリー"
    },
    "Add Contact": {
        "he": "הוסף איש קשר", "es": "Agregar contacto", "zh": "添加联系人", "fr": "Ajouter un contact",
        "it": "Aggiungi contatto", "hi": "संपर्क जोड़ें", "ta": "தொடர்பு சேர்", "bn": "পরিচিতি যোগ করুন", "ja": "連絡先を追加"
    },
    "Analyzing pronunciation...": {
        "he": "מנתח הגייה...", "es": "Analizando pronunciación...", "zh": "正在分析发音...", "fr": "Analyse de la prononciation...",
        "it": "Analisi della pronuncia...", "hi": "उच्चारण का विश्लेषण...", "ta": "உச்சரிப்பை பகுப்பாய்வு செய்கிறது...",
        "bn": "উচ্চারণ বিশ্লেষণ করা হচ্ছে...", "ja": "発音を分析中..."
    },
    "Animate": {
        "he": "הנפשה", "es": "Animar", "zh": "动画", "fr": "Animer",
        "it": "Anima", "hi": "एनिमेट करें", "ta": "அசைவூட்டு", "bn": "অ্যানিমেট", "ja": "アニメーション"
    },
    "Animate avatar movements and expressions": {
        "he": "הנפש תנועות והבעות של האווטאר", "es": "Animar movimientos y expresiones del avatar", "zh": "为虚拟形象的动作和表情添加动画",
        "fr": "Animer les mouvements et expressions de l'avatar", "it": "Anima i movimenti e le espressioni dell'avatar",
        "hi": "अवतार की गतिविधियों और भावों को एनिमेट करें", "ta": "அவதார இயக்கங்கள் மற்றும் வெளிப்பாடுகளை அசைவூட்டு",
        "bn": "অবতারের গতিবিধি এবং অভিব্যক্তি অ্যানিমেট করুন", "ja": "アバターの動きと表情をアニメーション化"
    },
    "Appearance": {
        "he": "מראה", "es": "Apariencia", "zh": "外观", "fr": "Apparence",
        "it": "Aspetto", "hi": "दिखावट", "ta": "தோற்றம்", "bn": "চেহারা", "ja": "外観"
    },
    "Apple TV": {
        "he": "Apple TV", "es": "Apple TV", "zh": "Apple TV", "fr": "Apple TV",
        "it": "Apple TV", "hi": "Apple TV", "ta": "Apple TV", "bn": "Apple TV", "ja": "Apple TV"
    },
    "Available Outfits": {
        "he": "תלבושות זמינות", "es": "Atuendos disponibles", "zh": "可用服装", "fr": "Tenues disponibles",
        "it": "Abiti disponibili", "hi": "उपलब्ध पोशाकें", "ta": "கிடைக்கும் ஆடைகள்", "bn": "উপলব্ধ পোশাক", "ja": "利用可能な衣装"
    },
    "Avatar": {
        "he": "אווטאר", "es": "Avatar", "zh": "虚拟形象", "fr": "Avatar",
        "it": "Avatar", "hi": "अवतार", "ta": "அவதாரம்", "bn": "অবতার", "ja": "アバター"
    },
    "Avatar Mode": {
        "he": "מצב אווטאר", "es": "Modo avatar", "zh": "虚拟形象模式", "fr": "Mode avatar",
        "it": "Modalità avatar", "hi": "अवतार मोड", "ta": "அவதார பயன்முறை", "bn": "অবতার মোড", "ja": "アバターモード"
    },
    "Avatar Preview": {
        "he": "תצוגה מקדימה של אווטאר", "es": "Vista previa del avatar", "zh": "虚拟形象预览", "fr": "Aperçu de l'avatar",
        "it": "Anteprima avatar", "hi": "अवतार पूर्वावलोकन", "ta": "அவதார முன்னோட்டம்", "bn": "অবতার প্রিভিউ", "ja": "アバタープレビュー"
    },
    "Avatar Settings": {
        "he": "הגדרות אווטאר", "es": "Configuración del avatar", "zh": "虚拟形象设置", "fr": "Paramètres de l'avatar",
        "it": "Impostazioni avatar", "hi": "अवतार सेटिंग्स", "ta": "அவதார அமைப்புகள்", "bn": "অবতার সেটিংস", "ja": "アバター設定"
    },
    "Avatar created successfully": {
        "he": "האווטאר נוצר בהצלחה", "es": "Avatar creado exitosamente", "zh": "虚拟形象创建成功", "fr": "Avatar créé avec succès",
        "it": "Avatar creato con successo", "hi": "अवतार सफलतापूर्वक बनाया गया", "ta": "அவதாரம் வெற்றிகரமாக உருவாக்கப்பட்டது",
        "bn": "অবতার সফলভাবে তৈরি হয়েছে", "ja": "アバターが正常に作成されました"
    },
    "Avatar preview": {
        "he": "תצוגה מקדימה של אווטאר", "es": "Vista previa del avatar", "zh": "虚拟形象预览", "fr": "Aperçu de l'avatar",
        "it": "Anteprima avatar", "hi": "अवतार पूर्वावलोकन", "ta": "அவதார முன்னோட்டம்", "bn": "অবতার প্রিভিউ", "ja": "アバタープレビュー"
    },
    "Biometric Consent": {
        "he": "הסכמה ביומטרית", "es": "Consentimiento biométrico", "zh": "生物识别同意", "fr": "Consentement biométrique",
        "it": "Consenso biometrico", "hi": "बायोमेट्रिक सहमति", "ta": "பயோமெட்ரிக் ஒப்புதல்", "bn": "বায়োমেট্রিক সম্মতি", "ja": "生体認証の同意"
    },
    "Biometric consent management": {
        "he": "ניהול הסכמה ביומטרית", "es": "Gestión del consentimiento biométrico", "zh": "生物识别同意管理", "fr": "Gestion du consentement biométrique",
        "it": "Gestione del consenso biometrico", "hi": "बायोमेट्रिक सहमति प्रबंधन", "ta": "பயோமெட்ரிக் ஒப்புதல் மேலாண்மை",
        "bn": "বায়োমেট্রিক সম্মতি ব্যবস্থাপনা", "ja": "生体認証同意の管理"
    },
    "Blend Shapes": {
        "he": "צורות מיזוג", "es": "Formas de mezcla", "zh": "混合形状", "fr": "Formes de fusion",
        "it": "Forme di fusione", "hi": "ब्लेंड शेप्स", "ta": "கலவை வடிவங்கள்", "bn": "ব্লেন্ড শেপস", "ja": "ブレンドシェイプ"
    },
    "Bones": {
        "he": "עצמות", "es": "Huesos", "zh": "骨骼", "fr": "Os",
        "it": "Ossa", "hi": "हड्डियाँ", "ta": "எலும்புகள்", "bn": "হাড়", "ja": "ボーン"
    },
    "Browse and talk to movie characters": {
        "he": "דפדף ושוחח עם דמויות מסרטים", "es": "Explora y habla con personajes de películas", "zh": "浏览并与电影角色对话",
        "fr": "Parcourez et discutez avec les personnages de films", "it": "Sfoglia e parla con i personaggi dei film",
        "hi": "फिल्म के किरदारों को ब्राउज़ करें और उनसे बात करें", "ta": "திரைப்பட கதாபாத்திரங்களை உலாவி அவர்களுடன் பேசுங்கள்",
        "bn": "মুভির চরিত্রগুলি ব্রাউজ করুন এবং তাদের সাথে কথা বলুন", "ja": "映画のキャラクターを閲覧して会話する"
    },
    "Camera": {
        "he": "מצלמה", "es": "Cámara", "zh": "相机", "fr": "Caméra",
        "it": "Fotocamera", "hi": "कैमरा", "ta": "கேமரா", "bn": "ক্যামেরা", "ja": "カメラ"
    },
    "Camera Preview": {
        "he": "תצוגה מקדימה של מצלמה", "es": "Vista previa de cámara", "zh": "相机预览", "fr": "Aperçu de la caméra",
        "it": "Anteprima fotocamera", "hi": "कैमरा पूर्वावलोकन", "ta": "கேமரா முன்னோட்டம்", "bn": "ক্যামেরা প্রিভিউ", "ja": "カメラプレビュー"
    },
    "Candle Lighting and Havdalah times will be displayed here": {
        "he": "זמני הדלקת נרות והבדלה יוצגו כאן", "es": "Los horarios de encendido de velas y Havdalá se mostrarán aquí",
        "zh": "蜡烛点燃和哈夫达拉时间将在此显示", "fr": "Les horaires d'allumage des bougies et de Havdalah seront affichés ici",
        "it": "Gli orari dell'accensione delle candele e dell'Havdalah saranno visualizzati qui",
        "hi": "मोमबत्ती जलाने और हवदलाह के समय यहाँ प्रदर्शित होंगे", "ta": "மெழுகுவர்த்தி ஏற்றும் நேரம் மற்றும் ஹவ்தலா நேரங்கள் இங்கே காட்டப்படும்",
        "bn": "মোমবাতি জ্বালানো এবং হাভদালার সময় এখানে প্রদর্শিত হবে", "ja": "キャンドル点灯とハヴダラの時間がここに表示されます"
    },
    "Characters": {
        "he": "דמויות", "es": "Personajes", "zh": "角色", "fr": "Personnages",
        "it": "Personaggi", "hi": "किरदार", "ta": "கதாபாத்திரங்கள்", "bn": "চরিত্র", "ja": "キャラクター"
    },
    "Chess": {
        "he": "שחמט", "es": "Ajedrez", "zh": "国际象棋", "fr": "Échecs",
        "it": "Scacchi", "hi": "शतरंज", "ta": "செஸ்", "bn": "দাবা", "ja": "チェス"
    },
    "Consent": {
        "he": "הסכמה", "es": "Consentimiento", "zh": "同意", "fr": "Consentement",
        "it": "Consenso", "hi": "सहमति", "ta": "ஒப்புதல்", "bn": "সম্মতি", "ja": "同意"
    },
    "Contacts": {
        "he": "אנשי קשר", "es": "Contactos", "zh": "联系人", "fr": "Contacts",
        "it": "Contatti", "hi": "संपर्क", "ta": "தொடர்புகள்", "bn": "পরিচিতি", "ja": "連絡先"
    },
    "Continue Practicing": {
        "he": "המשך לתרגל", "es": "Seguir practicando", "zh": "继续练习", "fr": "Continuer à pratiquer",
        "it": "Continua a praticare", "hi": "अभ्यास जारी रखें", "ta": "பயிற்சியைத் தொடரவும்", "bn": "অনুশীলন চালিয়ে যান", "ja": "練習を続ける"
    },
    "Controls": {
        "he": "פקדים", "es": "Controles", "zh": "控制", "fr": "Commandes",
        "it": "Controlli", "hi": "नियंत्रण", "ta": "கட்டுப்பாடுகள்", "bn": "নিয়ন্ত্রণ", "ja": "コントロール"
    },
    "Create Another": {
        "he": "צור נוסף", "es": "Crear otro", "zh": "再创建一个", "fr": "Créer un autre",
        "it": "Crea un altro", "hi": "एक और बनाएं", "ta": "மற்றொன்றை உருவாக்கு", "bn": "আরেকটি তৈরি করুন", "ja": "もう一つ作成"
    },
    "Create Avatar": {
        "he": "צור אווטאר", "es": "Crear avatar", "zh": "创建虚拟形象", "fr": "Créer un avatar",
        "it": "Crea avatar", "hi": "अवतार बनाएं", "ta": "அவதாரம் உருவாக்கு", "bn": "অবতার তৈরি করুন", "ja": "アバターを作成"
    },
    "Create a 3D avatar to see yourself in the story": {
        "he": "צור אווטאר תלת-ממדי כדי לראות את עצמך בסיפור", "es": "Crea un avatar 3D para verte en la historia",
        "zh": "创建 3D 虚拟形象，在故事中看到自己", "fr": "Créez un avatar 3D pour vous voir dans l'histoire",
        "it": "Crea un avatar 3D per vederti nella storia", "hi": "कहानी में खुद को देखने के लिए 3D अवतार बनाएं",
        "ta": "கதையில் உங்களைப் பார்க்க 3D அவதாரம் உருவாக்குங்கள்", "bn": "গল্পে নিজেকে দেখতে একটি 3D অবতার তৈরি করুন",
        "ja": "ストーリーに自分を登場させる3Dアバターを作成"
    },
    "Creating your avatar...": {
        "he": "יוצר את האווטאר שלך...", "es": "Creando tu avatar...", "zh": "正在创建您的虚拟形象...", "fr": "Création de votre avatar...",
        "it": "Creazione del tuo avatar...", "hi": "आपका अवतार बनाया जा रहा है...", "ta": "உங்கள் அவதாரம் உருவாக்கப்படுகிறது...",
        "bn": "আপনার অবতার তৈরি করা হচ্ছে...", "ja": "アバターを作成中..."
    },
    "Curated content for your morning routine": {
        "he": "תוכן מותאם לשגרת הבוקר שלך", "es": "Contenido seleccionado para tu rutina matutina", "zh": "为您的早晨日程精选的内容",
        "fr": "Contenu sélectionné pour votre routine matinale", "it": "Contenuti selezionati per la tua routine mattutina",
        "hi": "आपकी सुबह की दिनचर्या के लिए क्यूरेटेड सामग्री", "ta": "உங்கள் காலை நடைமுறைக்கான தொகுக்கப்பட்ட உள்ளடக்கம்",
        "bn": "আপনার সকালের রুটিনের জন্য কিউরেটেড বিষয়বস্তু", "ja": "朝のルーティンに合わせた厳選コンテンツ"
    },
    "Daily Inspiration": {
        "he": "השראה יומית", "es": "Inspiración diaria", "zh": "每日灵感", "fr": "Inspiration quotidienne",
        "it": "Ispirazione quotidiana", "hi": "दैनिक प्रेरणा", "ta": "தினசரி உத்வேகம்", "bn": "দৈনিক অনুপ্রেরণা", "ja": "日々のインスピレーション"
    },
    "Daily greetings and face ID": {
        "he": "ברכות יומיות וזיהוי פנים", "es": "Saludos diarios e identificación facial", "zh": "每日问候和面部识别",
        "fr": "Salutations quotidiennes et identification faciale", "it": "Saluti giornalieri e riconoscimento facciale",
        "hi": "दैनिक अभिवादन और फेस आईडी", "ta": "தினசரி வாழ்த்துகள் மற்றும் முக அடையாளம்",
        "bn": "দৈনিক শুভেচ্ছা এবং ফেস আইডি", "ja": "毎日の挨拶とFace ID"
    },
    "Definition": {
        "he": "הגדרה", "es": "Definición", "zh": "定义", "fr": "Définition",
        "it": "Definizione", "hi": "परिभाषा", "ta": "வரையறை", "bn": "সংজ্ঞা", "ja": "定義"
    },
    "Enable Animations": {
        "he": "הפעל אנימציות", "es": "Habilitar animaciones", "zh": "启用动画", "fr": "Activer les animations",
        "it": "Abilita animazioni", "hi": "एनिमेशन सक्षम करें", "ta": "அசைவூட்டங்களை இயக்கு", "bn": "অ্যানিমেশন সক্রিয় করুন", "ja": "アニメーションを有効化"
    },
    "Enable Avatar Mode": {
        "he": "הפעל מצב אווטאר", "es": "Habilitar modo avatar", "zh": "启用虚拟形象模式", "fr": "Activer le mode avatar",
        "it": "Abilita modalità avatar", "hi": "अवतार मोड सक्षम करें", "ta": "அவதார பயன்முறையை இயக்கு", "bn": "অবতার মোড সক্রিয় করুন", "ja": "アバターモードを有効化"
    },
    "Enable Shabbat Mode": {
        "he": "הפעל מצב שבת", "es": "Habilitar modo Shabat", "zh": "启用安息日模式", "fr": "Activer le mode Chabbat",
        "it": "Abilita modalità Shabbat", "hi": "शबत मोड सक्षम करें", "ta": "ஷப்பாத் பயன்முறையை இயக்கு", "bn": "শাব্বাত মোড সক্রিয় করুন", "ja": "シャバットモードを有効化"
    },
    "Enter your PIN to create avatar": {
        "he": "הזן את הקוד שלך ליצירת אווטאר", "es": "Ingresa tu PIN para crear un avatar", "zh": "输入您的 PIN 以创建虚拟形象",
        "fr": "Entrez votre code PIN pour créer un avatar", "it": "Inserisci il tuo PIN per creare un avatar",
        "hi": "अवतार बनाने के लिए अपना PIN दर्ज करें", "ta": "அவதாரம் உருவாக்க உங்கள் PIN ஐ உள்ளிடவும்",
        "bn": "অবতার তৈরি করতে আপনার PIN প্রবেশ করুন", "ja": "アバターを作成するにはPINを入力してください"
    },
    "Equipped": {
        "he": "מצויד", "es": "Equipado", "zh": "已装备", "fr": "Équipé",
        "it": "Equipaggiato", "hi": "सुसज्जित", "ta": "அணிந்துள்ளது", "bn": "সজ্জিত", "ja": "装備済み"
    },
    "Examples": {
        "he": "דוגמאות", "es": "Ejemplos", "zh": "示例", "fr": "Exemples",
        "it": "Esempi", "hi": "उदाहरण", "ta": "எடுத்துக்காட்டுகள்", "bn": "উদাহরণ", "ja": "例"
    },
    "Feedback": {
        "he": "משוב", "es": "Comentarios", "zh": "反馈", "fr": "Commentaires",
        "it": "Feedback", "hi": "प्रतिक्रिया", "ta": "கருத்து", "bn": "মতামত", "ja": "フィードバック"
    },
    "Feedback Inbox": {
        "he": "תיבת משוב", "es": "Bandeja de comentarios", "zh": "反馈收件箱", "fr": "Boîte de commentaires",
        "it": "Posta dei feedback", "hi": "प्रतिक्रिया इनबॉक्स", "ta": "கருத்து இன்பாக்ஸ்", "bn": "মতামত ইনবক্স", "ja": "フィードバック受信箱"
    },
    "Feedback from your contacts will appear here": {
        "he": "משוב מאנשי הקשר שלך יופיע כאן", "es": "Los comentarios de tus contactos aparecerán aquí", "zh": "来自您联系人的反馈将显示在此处",
        "fr": "Les commentaires de vos contacts apparaîtront ici", "it": "I feedback dai tuoi contatti appariranno qui",
        "hi": "आपके संपर्कों की प्रतिक्रिया यहाँ दिखाई देगी", "ta": "உங்கள் தொடர்புகளின் கருத்துகள் இங்கே தோன்றும்",
        "bn": "আপনার পরিচিতিদের মতামত এখানে প্রদর্শিত হবে", "ja": "連絡先からのフィードバックがここに表示されます"
    },
    "GLB Mesh Viewer": {
        "he": "מציג רשת GLB", "es": "Visor de malla GLB", "zh": "GLB 网格查看器", "fr": "Visionneuse de maillage GLB",
        "it": "Visualizzatore mesh GLB", "hi": "GLB मेश व्यूअर", "ta": "GLB மெஷ் காட்சியாளர்", "bn": "GLB মেশ ভিউয়ার", "ja": "GLBメッシュビューア"
    },
    "Hair Style": {
        "he": "תסרוקת", "es": "Peinado", "zh": "发型", "fr": "Coiffure",
        "it": "Acconciatura", "hi": "बालों की शैली", "ta": "சிகை அலங்காரம்", "bn": "চুলের স্টাইল", "ja": "ヘアスタイル"
    },
    "Has GLB": {
        "he": "כולל GLB", "es": "Tiene GLB", "zh": "包含 GLB", "fr": "Contient GLB",
        "it": "Ha GLB", "hi": "GLB है", "ta": "GLB உள்ளது", "bn": "GLB আছে", "ja": "GLBあり"
    },
    "Heblish": {
        "he": "עברנגלית", "es": "Heblish", "zh": "希伯来英语混合", "fr": "Heblish",
        "it": "Heblish", "hi": "हेब्लिश", "ta": "ஹெப்லிஷ்", "bn": "হেবলিশ", "ja": "ヘブリッシュ"
    },
    "Hide your avatar from other users": {
        "he": "הסתר את האווטאר שלך ממשתמשים אחרים", "es": "Oculta tu avatar de otros usuarios", "zh": "向其他用户隐藏您的虚拟形象",
        "fr": "Masquer votre avatar des autres utilisateurs", "it": "Nascondi il tuo avatar dagli altri utenti",
        "hi": "अपना अवतार अन्य उपयोगकर्ताओं से छिपाएं", "ta": "உங்கள் அவதாரத்தை மற்ற பயனர்களிடமிருந்து மறை",
        "bn": "আপনার অবতার অন্য ব্যবহারকারীদের থেকে লুকান", "ja": "他のユーザーからアバターを非表示にする"
    },
    "Holidays & Torah": {
        "he": "חגים ותורה", "es": "Festividades y Torá", "zh": "节日与托拉", "fr": "Fêtes et Torah",
        "it": "Festività e Torah", "hi": "त्योहार और तोराह", "ta": "விடுமுறைகள் & தோரா", "bn": "ছুটি ও তোরাহ", "ja": "祝日とトーラー"
    },
    "IPTV": {
        "he": "IPTV", "es": "IPTV", "zh": "IPTV", "fr": "IPTV",
        "it": "IPTV", "hi": "IPTV", "ta": "IPTV", "bn": "IPTV", "ja": "IPTV"
    },
    "IPTV / M3U": {
        "he": "IPTV / M3U", "es": "IPTV / M3U", "zh": "IPTV / M3U", "fr": "IPTV / M3U",
        "it": "IPTV / M3U", "hi": "IPTV / M3U", "ta": "IPTV / M3U", "bn": "IPTV / M3U", "ja": "IPTV / M3U"
    },
    "IPTV / Xtream": {
        "he": "IPTV / Xtream", "es": "IPTV / Xtream", "zh": "IPTV / Xtream", "fr": "IPTV / Xtream",
        "it": "IPTV / Xtream", "hi": "IPTV / Xtream", "ta": "IPTV / Xtream", "bn": "IPTV / Xtream", "ja": "IPTV / Xtream"
    },
    "Improvement: {{score}}%": {
        "he": "שיפור: {{score}}%", "es": "Mejora: {{score}}%", "zh": "改进: {{score}}%", "fr": "Amélioration : {{score}} %",
        "it": "Miglioramento: {{score}}%", "hi": "सुधार: {{score}}%", "ta": "முன்னேற்றம்: {{score}}%",
        "bn": "উন্নতি: {{score}}%", "ja": "改善: {{score}}%"
    },
    "Israeli Culture": {
        "he": "תרבות ישראלית", "es": "Cultura israelí", "zh": "以色列文化", "fr": "Culture israélienne",
        "it": "Cultura israeliana", "hi": "इज़राइली संस्कृति", "ta": "இஸ்ரேலிய கலாச்சாரம்", "bn": "ইসরায়েলি সংস্কৃতি", "ja": "イスラエル文化"
    },
    "Jerusalem": {
        "he": "ירושלים", "es": "Jerusalén", "zh": "耶路撒冷", "fr": "Jérusalem",
        "it": "Gerusalemme", "hi": "जेरूसलम", "ta": "ஜெருசலேம்", "bn": "জেরুজালেম", "ja": "エルサレム"
    },
    "Jerusalem, Tel Aviv, and Israeli heritage": {
        "he": "ירושלים, תל אביב ומורשת ישראלית", "es": "Jerusalén, Tel Aviv y herencia israelí", "zh": "耶路撒冷、特拉维夫和以色列遗产",
        "fr": "Jérusalem, Tel-Aviv et patrimoine israélien", "it": "Gerusalemme, Tel Aviv e patrimonio israeliano",
        "hi": "जेरूसलम, तेल अवीव और इज़राइली विरासत", "ta": "ஜெருசலேம், தெல் அவீவ் மற்றும் இஸ்ரேலிய பாரம்பரியம்",
        "bn": "জেরুজালেম, তেল আবিব এবং ইসরায়েলি ঐতিহ্য", "ja": "エルサレム、テルアビブ、イスラエルの遺産"
    },
    "Language": {
        "he": "שפה", "es": "Idioma", "zh": "语言", "fr": "Langue",
        "it": "Lingua", "hi": "भाषा", "ta": "மொழி", "bn": "ভাষা", "ja": "言語"
    },
    "Layout Mode": {
        "he": "מצב פריסה", "es": "Modo de diseño", "zh": "布局模式", "fr": "Mode de disposition",
        "it": "Modalità layout", "hi": "लेआउट मोड", "ta": "தளவமைப்பு பயன்முறை", "bn": "লেআউট মোড", "ja": "レイアウトモード"
    },
    "Magic Mirror": {
        "he": "מראה קסומה", "es": "Espejo mágico", "zh": "魔镜", "fr": "Miroir magique",
        "it": "Specchio magico", "hi": "जादुई दर्पण", "ta": "மாயக் கண்ணாடி", "bn": "ম্যাজিক মিরর", "ja": "マジックミラー"
    },
    "Modeh Ani": {
        "he": "מודה אני", "es": "Modé Aní", "zh": "莫代阿尼", "fr": "Modé Ani",
        "it": "Modeh Ani", "hi": "मोदे अनी", "ta": "மோதே அனி", "bn": "মোদে আনি", "ja": "モデ・アニ"
    },
    "Morning Ritual": {
        "he": "טקס בוקר", "es": "Ritual matutino", "zh": "晨间仪式", "fr": "Rituel du matin",
        "it": "Rituale mattutino", "hi": "सुबह की रस्म", "ta": "காலை சடங்கு", "bn": "সকালের আচার", "ja": "朝の儀式"
    },
    "Morning gratitude prayer": {
        "he": "תפילת הודיה של הבוקר", "es": "Oración de gratitud matutina", "zh": "晨间感恩祈祷",
        "fr": "Prière de gratitude du matin", "it": "Preghiera di gratitudine mattutina",
        "hi": "सुबह की कृतज्ञता प्रार्थना", "ta": "காலை நன்றி பிரார்த்தனை", "bn": "সকালের কৃতজ্ঞতা প্রার্থনা", "ja": "朝の感謝の祈り"
    },
    "Morning prayer service": {
        "he": "תפילת שחרית", "es": "Servicio de oración matutina", "zh": "晨间祈祷仪式",
        "fr": "Service de prière du matin", "it": "Servizio di preghiera mattutina",
        "hi": "सुबह की प्रार्थना सेवा", "ta": "காலை பிரார்த்தனை சேவை", "bn": "সকালের প্রার্থনা সেবা", "ja": "朝の祈りの礼拝"
    },
    "Movie Interactions": {
        "he": "אינטראקציות עם סרטים", "es": "Interacciones con películas", "zh": "电影互动", "fr": "Interactions avec les films",
        "it": "Interazioni con i film", "hi": "फिल्म इंटरैक्शन", "ta": "திரைப்பட ஊடாடுதல்கள்", "bn": "মুভি ইন্টারঅ্যাকশন", "ja": "映画インタラクション"
    },
    "Name": {
        "he": "שם", "es": "Nombre", "zh": "名称", "fr": "Nom",
        "it": "Nome", "hi": "नाम", "ta": "பெயர்", "bn": "নাম", "ja": "名前"
    },
    "Netilat Yadayim": {
        "he": "נטילת ידיים", "es": "Netilat Yadayim", "zh": "涅提拉特·亚达伊姆", "fr": "Netilat Yadayim",
        "it": "Netilat Yadayim", "hi": "नेतिलत यादयिम", "ta": "நெதிலாத் யாதயிம்", "bn": "নেতিলাত ইয়াদায়িম", "ja": "ネティラット・ヤダイム"
    },
    "Next Phrase": {
        "he": "ביטוי הבא", "es": "Siguiente frase", "zh": "下一个短语", "fr": "Phrase suivante",
        "it": "Frase successiva", "hi": "अगला वाक्यांश", "ta": "அடுத்த சொற்றொடர்", "bn": "পরবর্তী বাক্যাংশ", "ja": "次のフレーズ"
    },
    "No avatar configured": {
        "he": "לא הוגדר אווטאר", "es": "No se configuró un avatar", "zh": "未配置虚拟形象", "fr": "Aucun avatar configuré",
        "it": "Nessun avatar configurato", "hi": "कोई अवतार कॉन्फ़िगर नहीं किया गया", "ta": "அவதாரம் கட்டமைக்கப்படவில்லை",
        "bn": "কোনো অবতার কনফিগার করা হয়নি", "ja": "アバターが設定されていません"
    },
    "No avatar yet": {
        "he": "אין אווטאר עדיין", "es": "Aún no hay avatar", "zh": "尚无虚拟形象", "fr": "Pas encore d'avatar",
        "it": "Nessun avatar ancora", "hi": "अभी कोई अवतार नहीं", "ta": "இன்னும் அவதாரம் இல்லை", "bn": "এখনো কোনো অবতার নেই", "ja": "まだアバターがありません"
    },
    "No characters found for this movie": {
        "he": "לא נמצאו דמויות לסרט זה", "es": "No se encontraron personajes para esta película", "zh": "未找到该电影的角色",
        "fr": "Aucun personnage trouvé pour ce film", "it": "Nessun personaggio trovato per questo film",
        "hi": "इस फिल्म के लिए कोई किरदार नहीं मिला", "ta": "இந்த திரைப்படத்திற்கு கதாபாத்திரங்கள் எதுவும் கிடைக்கவில்லை",
        "bn": "এই মুভির জন্য কোনো চরিত্র পাওয়া যায়নি", "ja": "この映画のキャラクターが見つかりません"
    },
    "No feedback yet": {
        "he": "אין משוב עדיין", "es": "Aún no hay comentarios", "zh": "暂无反馈", "fr": "Pas encore de commentaires",
        "it": "Nessun feedback ancora", "hi": "अभी कोई प्रतिक्रिया नहीं", "ta": "இன்னும் கருத்து இல்லை", "bn": "এখনো কোনো মতামত নেই", "ja": "まだフィードバックがありません"
    },
    "No interactable movies available": {
        "he": "אין סרטים אינטראקטיביים זמינים", "es": "No hay películas interactivas disponibles", "zh": "没有可互动的电影",
        "fr": "Aucun film interactif disponible", "it": "Nessun film interattivo disponibile",
        "hi": "कोई इंटरैक्टिव फिल्म उपलब्ध नहीं", "ta": "ஊடாடக்கூடிய திரைப்படங்கள் எதுவும் கிடைக்கவில்லை",
        "bn": "কোনো ইন্টারঅ্যাকটিভ মুভি উপলব্ধ নেই", "ja": "インタラクティブな映画はありません"
    },
    "OpenSubtitles": {
        "he": "OpenSubtitles", "es": "OpenSubtitles", "zh": "OpenSubtitles", "fr": "OpenSubtitles",
        "it": "OpenSubtitles", "hi": "OpenSubtitles", "ta": "OpenSubtitles", "bn": "OpenSubtitles", "ja": "OpenSubtitles"
    },
    "Parasha of the Week": {
        "he": "פרשת השבוע", "es": "Parashá de la semana", "zh": "本周读经", "fr": "Parasha de la semaine",
        "it": "Parasha della settimana", "hi": "सप्ताह की पराशा", "ta": "வாரத்தின் பராஷா", "bn": "সপ্তাহের পারাশা", "ja": "今週のパラシャ"
    },
    "Pause": {
        "he": "השהה", "es": "Pausar", "zh": "暂停", "fr": "Pause",
        "it": "Pausa", "hi": "रोकें", "ta": "இடைநிறுத்து", "bn": "বিরতি", "ja": "一時停止"
    },
    "Phone": {
        "he": "טלפון", "es": "Teléfono", "zh": "电话", "fr": "Téléphone",
        "it": "Telefono", "hi": "फ़ोन", "ta": "தொலைபேசி", "bn": "ফোন", "ja": "電話"
    },
    "Play Lipsync": {
        "he": "הפעל סנכרון שפתיים", "es": "Reproducir sincronización labial", "zh": "播放唇形同步", "fr": "Lancer la synchronisation labiale",
        "it": "Avvia sincronizzazione labiale", "hi": "लिप सिंक चलाएं", "ta": "உதடு ஒத்திசைவை இயக்கு", "bn": "লিপসিঙ্ক চালান", "ja": "リップシンクを再生"
    },
    "Play Voice Message": {
        "he": "הפעל הודעה קולית", "es": "Reproducir mensaje de voz", "zh": "播放语音消息", "fr": "Écouter le message vocal",
        "it": "Riproduci messaggio vocale", "hi": "वॉइस मैसेज चलाएं", "ta": "குரல் செய்தியை இயக்கு", "bn": "ভয়েস মেসেজ চালান", "ja": "ボイスメッセージを再生"
    },
    "Play chess with friends and family": {
        "he": "שחק שחמט עם חברים ומשפחה", "es": "Juega ajedrez con amigos y familia", "zh": "与朋友和家人下棋",
        "fr": "Jouez aux échecs avec vos amis et votre famille", "it": "Gioca a scacchi con amici e familiari",
        "hi": "दोस्तों और परिवार के साथ शतरंज खेलें", "ta": "நண்பர்கள் மற்றும் குடும்பத்தினருடன் செஸ் விளையாடுங்கள்",
        "bn": "বন্ধু এবং পরিবারের সাথে দাবা খেলুন", "ja": "友人や家族とチェスを楽しむ"
    },
    "Privacy": {
        "he": "פרטיות", "es": "Privacidad", "zh": "隐私", "fr": "Confidentialité",
        "it": "Privacy", "hi": "गोपनीयता", "ta": "தனியுரிமை", "bn": "গোপনীয়তা", "ja": "プライバシー"
    },
    "Private Avatar Mode": {
        "he": "מצב אווטאר פרטי", "es": "Modo avatar privado", "zh": "私密虚拟形象模式", "fr": "Mode avatar privé",
        "it": "Modalità avatar privato", "hi": "निजी अवतार मोड", "ta": "தனிப்பட்ட அவதார பயன்முறை", "bn": "প্রাইভেট অবতার মোড", "ja": "プライベートアバターモード"
    },
    "Pronunciation": {
        "he": "הגייה", "es": "Pronunciación", "zh": "发音", "fr": "Prononciation",
        "it": "Pronuncia", "hi": "उच्चारण", "ta": "உச்சரிப்பு", "bn": "উচ্চারণ", "ja": "発音"
    },
    "Pronunciation Feedback": {
        "he": "משוב על הגייה", "es": "Retroalimentación de pronunciación", "zh": "发音反馈", "fr": "Retour sur la prononciation",
        "it": "Feedback sulla pronuncia", "hi": "उच्चारण प्रतिक्रिया", "ta": "உச்சரிப்பு கருத்து", "bn": "উচ্চারণ প্রতিক্রিয়া", "ja": "発音フィードバック"
    },
    "Reaction Style": {
        "he": "סגנון תגובה", "es": "Estilo de reacción", "zh": "反应风格", "fr": "Style de réaction",
        "it": "Stile di reazione", "hi": "प्रतिक्रिया शैली", "ta": "எதிர்வினை நடை", "bn": "প্রতিক্রিয়া শৈলী", "ja": "リアクションスタイル"
    },
    "Record": {
        "he": "הקלט", "es": "Grabar", "zh": "录制", "fr": "Enregistrer",
        "it": "Registra", "hi": "रिकॉर्ड करें", "ta": "பதிவு செய்", "bn": "রেকর্ড করুন", "ja": "録画"
    },
    "Refresh": {
        "he": "רענן", "es": "Actualizar", "zh": "刷新", "fr": "Actualiser",
        "it": "Aggiorna", "hi": "रिफ्रेश करें", "ta": "புதுப்பி", "bn": "রিফ্রেশ করুন", "ja": "更新"
    },
    "Relationship": {
        "he": "קשר", "es": "Relación", "zh": "关系", "fr": "Relation",
        "it": "Relazione", "hi": "संबंध", "ta": "உறவு", "bn": "সম্পর্ক", "ja": "関係"
    },
    "Retake": {
        "he": "צלם מחדש", "es": "Volver a tomar", "zh": "重拍", "fr": "Reprendre",
        "it": "Riprendi", "hi": "दोबारा लें", "ta": "மீண்டும் எடு", "bn": "পুনরায় নিন", "ja": "撮り直し"
    },
    "Ritual hand washing": {
        "he": "נטילת ידיים", "es": "Lavado ritual de manos", "zh": "仪式性洗手",
        "fr": "Lavage rituel des mains", "it": "Lavaggio rituale delle mani",
        "hi": "अनुष्ठानिक हाथ धोना", "ta": "சடங்கு கை கழுவுதல்", "bn": "আচারিক হাত ধোয়া", "ja": "儀式的な手洗い"
    },
    "Save Changes": {
        "he": "שמור שינויים", "es": "Guardar cambios", "zh": "保存更改", "fr": "Enregistrer les modifications",
        "it": "Salva modifiche", "hi": "परिवर्तन सहेजें", "ta": "மாற்றங்களைச் சேமி", "bn": "পরিবর্তন সংরক্ষণ করুন", "ja": "変更を保存"
    },
    "Shabbat": {
        "he": "שבת", "es": "Shabat", "zh": "安息日", "fr": "Chabbat",
        "it": "Shabbat", "hi": "शबत", "ta": "ஷப்பாத்", "bn": "শাব্বাত", "ja": "シャバット"
    },
    "Shabbat Mode": {
        "he": "מצב שבת", "es": "Modo Shabat", "zh": "安息日模式", "fr": "Mode Chabbat",
        "it": "Modalità Shabbat", "hi": "शबत मोड", "ta": "ஷப்பாத் பயன்முறை", "bn": "শাব্বাত মোড", "ja": "シャバットモード"
    },
    "Shabbat Times": {
        "he": "זמני שבת", "es": "Horarios de Shabat", "zh": "安息日时间", "fr": "Horaires du Chabbat",
        "it": "Orari dello Shabbat", "hi": "शबत का समय", "ta": "ஷப்பாத் நேரங்கள்", "bn": "শাব্বাতের সময়", "ja": "シャバットの時間"
    },
    "Shacharit": {
        "he": "שחרית", "es": "Shajarit", "zh": "沙哈里特", "fr": "Cha'harit",
        "it": "Shacharit", "hi": "शचरित", "ta": "ஷச்சரித்", "bn": "শাচারিত", "ja": "シャハリット"
    },
    "Share your experience": {
        "he": "שתף את החוויה שלך", "es": "Comparte tu experiencia", "zh": "分享您的体验", "fr": "Partagez votre expérience",
        "it": "Condividi la tua esperienza", "hi": "अपना अनुभव साझा करें", "ta": "உங்கள் அனுபவத்தைப் பகிரவும்",
        "bn": "আপনার অভিজ্ঞতা শেয়ার করুন", "ja": "体験を共有する"
    },
    "Show your avatar reacting to content": {
        "he": "הצג את האווטאר שלך מגיב לתוכן", "es": "Muestra tu avatar reaccionando al contenido", "zh": "显示您的虚拟形象对内容的反应",
        "fr": "Montrez votre avatar réagissant au contenu", "it": "Mostra il tuo avatar che reagisce ai contenuti",
        "hi": "सामग्री पर प्रतिक्रिया देते हुए अपना अवतार दिखाएं", "ta": "உள்ளடக்கத்திற்கு எதிர்வினையாற்றும் உங்கள் அவதாரத்தைக் காட்டு",
        "bn": "বিষয়বস্তুতে প্রতিক্রিয়া দেখাচ্ছে আপনার অবতার দেখান", "ja": "コンテンツに反応するアバターを表示"
    },
    "Similarity: {{score}}%": {
        "he": "דמיון: {{score}}%", "es": "Similitud: {{score}}%", "zh": "相似度: {{score}}%", "fr": "Similarité : {{score}} %",
        "it": "Somiglianza: {{score}}%", "hi": "समानता: {{score}}%", "ta": "ஒற்றுமை: {{score}}%",
        "bn": "সাদৃশ্য: {{score}}%", "ja": "類似度: {{score}}%"
    },
    "Skin Tone": {
        "he": "גוון עור", "es": "Tono de piel", "zh": "肤色", "fr": "Teint",
        "it": "Tonalità della pelle", "hi": "त्वचा का रंग", "ta": "சருமத் தொனி", "bn": "ত্বকের টোন", "ja": "肌の色"
    },
    "Start Recording": {
        "he": "התחל הקלטה", "es": "Iniciar grabación", "zh": "开始录制", "fr": "Commencer l'enregistrement",
        "it": "Avvia registrazione", "hi": "रिकॉर्डिंग शुरू करें", "ta": "பதிவைத் தொடங்கு", "bn": "রেকর্ডিং শুরু করুন", "ja": "録画を開始"
    },
    "Start your day with intention and gratitude": {
        "he": "התחל את היום שלך בכוונה ובהכרת תודה", "es": "Comienza tu día con intención y gratitud", "zh": "以意愿和感恩开始新的一天",
        "fr": "Commencez votre journée avec intention et gratitude", "it": "Inizia la giornata con intenzione e gratitudine",
        "hi": "संकल्प और कृतज्ञता के साथ अपने दिन की शुरुआत करें", "ta": "நோக்கம் மற்றும் நன்றியுடன் உங்கள் நாளைத் தொடங்குங்கள்",
        "bn": "উদ্দেশ্য এবং কৃতজ্ঞতার সাথে আপনার দিন শুরু করুন", "ja": "意思と感謝をもって一日を始めましょう"
    },
    "Status: {{value}}": {
        "he": "סטטוס: {{value}}", "es": "Estado: {{value}}", "zh": "状态: {{value}}", "fr": "Statut : {{value}}",
        "it": "Stato: {{value}}", "hi": "स्थिति: {{value}}", "ta": "நிலை: {{value}}",
        "bn": "স্থিতি: {{value}}", "ja": "ステータス: {{value}}"
    },
    "Stop": {
        "he": "עצור", "es": "Detener", "zh": "停止", "fr": "Arrêter",
        "it": "Ferma", "hi": "रोकें", "ta": "நிறுத்து", "bn": "থামান", "ja": "停止"
    },
    "Stop Recording": {
        "he": "הפסק הקלטה", "es": "Detener grabación", "zh": "停止录制", "fr": "Arrêter l'enregistrement",
        "it": "Ferma registrazione", "hi": "रिकॉर्डिंग बंद करें", "ta": "பதிவை நிறுத்து", "bn": "রেকর্ডিং থামান", "ja": "録画を停止"
    },
    "Tel Aviv": {
        "he": "תל אביב", "es": "Tel Aviv", "zh": "特拉维夫", "fr": "Tel-Aviv",
        "it": "Tel Aviv", "hi": "तेल अवीव", "ta": "தெல் அவீவ்", "bn": "তেল আবিব", "ja": "テルアビブ"
    },
    "Term Detail": {
        "he": "פרטי מונח", "es": "Detalle del término", "zh": "术语详情", "fr": "Détail du terme",
        "it": "Dettaglio del termine", "hi": "शब्द विवरण", "ta": "சொல் விவரம்", "bn": "শব্দ বিবরণ", "ja": "用語の詳細"
    },
    "Transforms: {{count}}": {
        "he": "טרנספורמציות: {{count}}", "es": "Transformaciones: {{count}}", "zh": "变换: {{count}}", "fr": "Transformations : {{count}}",
        "it": "Trasformazioni: {{count}}", "hi": "ट्रांसफॉर्म: {{count}}", "ta": "மாற்றங்கள்: {{count}}",
        "bn": "ট্রান্সফর্ম: {{count}}", "ja": "変換: {{count}}"
    },
    "V2V Practice": {
        "he": "תרגול קול-לקול", "es": "Práctica V2V", "zh": "V2V 练习", "fr": "Pratique V2V",
        "it": "Pratica V2V", "hi": "V2V अभ्यास", "ta": "V2V பயிற்சி", "bn": "V2V অনুশীলন", "ja": "V2V練習"
    },
    "Vertices": {
        "he": "קודקודים", "es": "Vértices", "zh": "顶点", "fr": "Sommets",
        "it": "Vertici", "hi": "शीर्ष", "ta": "முனைகள்", "bn": "শীর্ষবিন্দু", "ja": "頂点"
    },
    "Video Selfie": {
        "he": "סלפי וידאו", "es": "Selfie de video", "zh": "视频自拍", "fr": "Selfie vidéo",
        "it": "Video selfie", "hi": "वीडियो सेल्फी", "ta": "வீடியோ செல்ஃபி", "bn": "ভিডিও সেলফি", "ja": "ビデオセルフィー"
    },
    "View Progress": {
        "he": "הצג התקדמות", "es": "Ver progreso", "zh": "查看进度", "fr": "Voir la progression",
        "it": "Visualizza progressi", "hi": "प्रगति देखें", "ta": "முன்னேற்றத்தைக் காண்", "bn": "অগ্রগতি দেখুন", "ja": "進捗を表示"
    },
    "Voice Practice": {
        "he": "תרגול קולי", "es": "Práctica de voz", "zh": "语音练习", "fr": "Pratique vocale",
        "it": "Pratica vocale", "hi": "वॉइस अभ्यास", "ta": "குரல் பயிற்சி", "bn": "ভয়েস অনুশীলন", "ja": "ボイス練習"
    },
    "Voice-to-voice pronunciation": {
        "he": "הגייה קול-לקול", "es": "Pronunciación de voz a voz", "zh": "语音对语音发音", "fr": "Prononciation voix-à-voix",
        "it": "Pronuncia voce-a-voce", "hi": "वॉइस-टू-वॉइस उच्चारण", "ta": "குரல்-க்கு-குரல் உச்சரிப்பு",
        "bn": "ভয়েস-টু-ভয়েস উচ্চারণ", "ja": "音声対音声の発音"
    },
    "Wardrobe": {
        "he": "מלתחה", "es": "Guardarropa", "zh": "衣橱", "fr": "Garde-robe",
        "it": "Guardaroba", "hi": "वार्डरोब", "ta": "ஆடை அலமாரி", "bn": "ওয়ার্ডরোব", "ja": "ワードローブ"
    },
    "Weekly Torah reading and commentary": {
        "he": "קריאת תורה שבועית ופרשנות", "es": "Lectura semanal de la Torá y comentario", "zh": "每周托拉诵读和注释",
        "fr": "Lecture hebdomadaire de la Torah et commentaire", "it": "Lettura settimanale della Torah e commento",
        "hi": "साप्ताहिक तोराह पाठ और टिप्पणी", "ta": "வாராந்திர தோரா வாசிப்பு மற்றும் விளக்கம்",
        "bn": "সাপ্তাহিক তোরাহ পাঠ এবং ভাষ্য", "ja": "毎週のトーラー朗読と解説"
    },
    "WhatsApp sharing contacts": {
        "he": "שיתוף אנשי קשר ב-WhatsApp", "es": "Compartir contactos por WhatsApp", "zh": "WhatsApp 分享联系人",
        "fr": "Partage de contacts WhatsApp", "it": "Condivisione contatti WhatsApp",
        "hi": "WhatsApp संपर्क साझा करना", "ta": "WhatsApp தொடர்புகளை பகிர்தல்", "bn": "WhatsApp পরিচিতি শেয়ারিং", "ja": "WhatsApp連絡先の共有"
    },
    "When enabled, Shabbat Mode will pause notifications, reduce screen brightness, and enable a simplified interface during Shabbat hours.": {
        "he": "כאשר מופעל, מצב שבת ישהה התראות, יפחית בהירות מסך ויפעיל ממשק מפושט בשעות השבת.",
        "es": "Cuando está habilitado, el modo Shabat pausará las notificaciones, reducirá el brillo de la pantalla y habilitará una interfaz simplificada durante las horas de Shabat.",
        "zh": "启用后，安息日模式将在安息日时间内暂停通知、降低屏幕亮度并启用简化界面。",
        "fr": "Lorsqu'il est activé, le mode Chabbat mettra en pause les notifications, réduira la luminosité de l'écran et activera une interface simplifiée pendant les heures du Chabbat.",
        "it": "Quando attivata, la modalità Shabbat metterà in pausa le notifiche, ridurrà la luminosità dello schermo e abiliterà un'interfaccia semplificata durante le ore dello Shabbat.",
        "hi": "सक्षम होने पर, शबत मोड शबत के घंटों के दौरान सूचनाओं को रोकेगा, स्क्रीन की चमक कम करेगा और एक सरलीकृत इंटरफ़ेस सक्षम करेगा।",
        "ta": "இயக்கப்பட்டால், ஷப்பாத் பயன்முறை ஷப்பாத் நேரங்களில் அறிவிப்புகளை இடைநிறுத்தும், திரை பிரகாசத்தைக் குறைக்கும் மற்றும் எளிமையான இடைமுகத்தை இயக்கும்.",
        "bn": "সক্রিয় করা হলে, শাব্বাত মোড শাব্বাতের সময় বিজ্ঞপ্তি বিরতি দেবে, স্ক্রিনের উজ্জ্বলতা কমাবে এবং একটি সরলীকৃত ইন্টারফেস সক্রিয় করবে।",
        "ja": "有効にすると、シャバットモードはシャバットの時間中に通知を一時停止し、画面の明るさを下げ、簡略化されたインターフェースを有効にします。"
    },
    "Word of the Day": {
        "he": "מילת היום", "es": "Palabra del día", "zh": "每日一词", "fr": "Mot du jour",
        "it": "Parola del giorno", "hi": "आज का शब्द", "ta": "இன்றைய சொல்", "bn": "আজকের শব্দ", "ja": "今日の単語"
    },
    "Xtream Codes": {
        "he": "Xtream Codes", "es": "Xtream Codes", "zh": "Xtream Codes", "fr": "Xtream Codes",
        "it": "Xtream Codes", "hi": "Xtream Codes", "ta": "Xtream Codes", "bn": "Xtream Codes", "ja": "Xtream Codes"
    },
    "Your Progress": {
        "he": "ההתקדמות שלך", "es": "Tu progreso", "zh": "您的进度", "fr": "Votre progression",
        "it": "I tuoi progressi", "hi": "आपकी प्रगति", "ta": "உங்கள் முன்னேற்றம்", "bn": "আপনার অগ্রগতি", "ja": "あなたの進捗"
    },
    "Your personalized avatar mesh": {
        "he": "רשת האווטאר המותאמת שלך", "es": "Tu malla de avatar personalizada", "zh": "您的个性化虚拟形象网格",
        "fr": "Votre maillage d'avatar personnalisé", "it": "La tua mesh avatar personalizzata",
        "hi": "आपका व्यक्तिगत अवतार मेश", "ta": "உங்கள் தனிப்பயனாக்கப்பட்ட அவதார மெஷ்",
        "bn": "আপনার ব্যক্তিগত অবতার মেশ", "ja": "あなたのパーソナライズされたアバターメッシュ"
    },
    "Zeh Ani": {
        "he": "זה אני", "es": "Zeh Ani", "zh": "泽·阿尼", "fr": "Zeh Ani",
        "it": "Zeh Ani", "hi": "ज़ेह अनी", "ta": "ஜே அனி", "bn": "জেহ আনি", "ja": "ゼ・アニ"
    },
    "{{count}} active consents": {
        "he": "{{count}} הסכמות פעילות", "es": "{{count}} consentimientos activos", "zh": "{{count}} 个有效同意",
        "fr": "{{count}} consentements actifs", "it": "{{count}} consensi attivi",
        "hi": "{{count}} सक्रिय सहमतियाँ", "ta": "{{count}} செயலில் உள்ள ஒப்புதல்கள்",
        "bn": "{{count}} সক্রিয় সম্মতি", "ja": "{{count}} 件の有効な同意"
    },
    "{{count}} characters": {
        "he": "{{count}} דמויות", "es": "{{count}} personajes", "zh": "{{count}} 个角色",
        "fr": "{{count}} personnages", "it": "{{count}} personaggi",
        "hi": "{{count}} किरदार", "ta": "{{count}} கதாபாத்திரங்கள்",
        "bn": "{{count}} চরিত্র", "ja": "{{count}} キャラクター"
    },
    "{{name}}": {
        "he": "{{name}}", "es": "{{name}}", "zh": "{{name}}", "fr": "{{name}}",
        "it": "{{name}}", "hi": "{{name}}", "ta": "{{name}}", "bn": "{{name}}", "ja": "{{name}}"
    },
}


def apply_translations(directory):
    with open(os.path.join(directory, "en.json"), "r", encoding="utf-8") as f:
        en = json.load(f)

    langs = ["he", "es", "zh", "fr", "it", "hi", "ta", "bn", "ja"]
    counts = {}

    for lang in langs:
        filepath = os.path.join(directory, f"{lang}.json")
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        count = 0

        def walk_and_replace(en_obj, lang_obj):
            nonlocal count
            for k, v in en_obj.items():
                if k not in lang_obj:
                    continue
                if isinstance(v, dict) and isinstance(lang_obj.get(k), dict):
                    walk_and_replace(v, lang_obj[k])
                elif isinstance(v, str) and lang_obj.get(k) == v:
                    if v in TRANSLATIONS and lang in TRANSLATIONS[v]:
                        lang_obj[k] = TRANSLATIONS[v][lang]
                        count += 1

        walk_and_replace(en, data)
        counts[lang] = count

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")

    return counts


if __name__ == "__main__":
    for d in DIRS:
        if not os.path.exists(d):
            print(f"Skipping {d} (not found)")
            continue
        print(f"\nProcessing: {d}")
        counts = apply_translations(d)
        for lang, c in sorted(counts.items()):
            print(f"  {lang}: {c} values translated")
