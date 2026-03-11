#!/usr/bin/env python3
"""Batch 2: All remaining multi-language values + language names that should stay as-is."""
import json
import os

DIRS = [
    "/Users/olorin/Documents/Projects/olorin/olorin-core/packages/shared-i18n/locales",
    "/Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/packages/ui/bayit-i18n/locales",
]

TRANSLATIONS = {
    # Multi-language values (7+ langs needing them)
    "AI Companion": {"zh": "AI 伴侣", "fr": "Compagnon IA", "it": "Compagno IA", "hi": "AI साथी", "ta": "AI துணை", "bn": "AI সঙ্গী", "ja": "AIコンパニオン"},
    "AI Features": {"zh": "AI 功能", "fr": "Fonctionnalités IA", "it": "Funzionalità IA", "hi": "AI सुविधाएँ", "ta": "AI அம்சங்கள்", "bn": "AI বৈশিষ্ট্য", "ja": "AI機能"},
    "AI Language": {"zh": "AI 语言", "fr": "Langue IA", "it": "Lingua IA", "hi": "AI भाषा", "ta": "AI மொழி", "bn": "AI ভাষা", "ja": "AI言語"},
    "AI Subtitle Modes": {"zh": "AI 字幕模式", "fr": "Modes de sous-titres IA", "it": "Modalità sottotitoli IA", "hi": "AI उपशीर्षक मोड", "ta": "AI வசன முறைகள்", "bn": "AI সাবটাইটেল মোড", "ja": "AI字幕モード"},
    "AI Trivia": {"zh": "AI 问答", "fr": "Anecdotes IA", "it": "Curiosità IA", "hi": "AI ट्रिविया", "ta": "AI அறிவுத்திறன்", "bn": "AI ট্রিভিয়া", "ja": "AIトリビア"},
    "AI modes available": {"zh": "可用的 AI 模式", "fr": "Modes IA disponibles", "it": "Modalità IA disponibili", "hi": "उपलब्ध AI मोड", "ta": "கிடைக்கும் AI முறைகள்", "bn": "উপলব্ধ AI মোড", "ja": "利用可能なAIモード"},
    "Audio Track": {"zh": "音轨", "fr": "Piste audio", "it": "Traccia audio", "hi": "ऑडियो ट्रैक", "ta": "ஆடியோ ட்ராக்", "bn": "অডিও ট্র্যাক", "ja": "オーディオトラック"},
    "Catch Up": {"zh": "回看", "fr": "Rattrapage", "it": "Recupera", "hi": "कैच अप", "ta": "பின்தொடர்", "bn": "ক্যাচ আপ", "ja": "追いつき視聴"},
    "Chapter {{number}}": {"zh": "第 {{number}} 章", "fr": "Chapitre {{number}}", "it": "Capitolo {{number}}", "hi": "अध्याय {{number}}", "ta": "அத்தியாயம் {{number}}", "bn": "অধ্যায় {{number}}", "ja": "第{{number}}章"},
    "Context": {"zh": "上下文", "fr": "Contexte", "it": "Contesto", "hi": "संदर्भ", "ta": "சூழல்", "bn": "প্রসঙ্গ", "ja": "コンテキスト"},
    "Continue Watching": {"zh": "继续观看", "fr": "Continuer à regarder", "it": "Continua a guardare", "hi": "देखना जारी रखें", "ta": "தொடர்ந்து பார்", "bn": "দেখা চালিয়ে যান", "ja": "視聴を続ける"},
    "Dismiss": {"zh": "关闭", "fr": "Ignorer", "it": "Chiudi", "hi": "खारिज करें", "ta": "நிராகரி", "bn": "বাতিল করুন", "ja": "閉じる"},
    "Dubbing": {"zh": "配音", "fr": "Doublage", "it": "Doppiaggio", "hi": "डबिंग", "ta": "டப்பிங்", "bn": "ডাবিং", "ja": "吹き替え"},
    "Dubbing Voice": {"zh": "配音声音", "fr": "Voix de doublage", "it": "Voce di doppiaggio", "hi": "डबिंग वॉइस", "ta": "டப்பிங் குரல்", "bn": "ডাবিং ভয়েস", "ja": "吹替音声"},
    "Fetch Subtitles": {"zh": "获取字幕", "fr": "Récupérer les sous-titres", "it": "Recupera sottotitoli", "hi": "उपशीर्षक प्राप्त करें", "ta": "வசனங்களைப் பெறு", "bn": "সাবটাইটেল আনুন", "ja": "字幕を取得"},
    "Font Size": {"zh": "字体大小", "fr": "Taille de police", "it": "Dimensione carattere", "hi": "फ़ॉन्ट आकार", "ta": "எழுத்துரு அளவு", "bn": "ফন্ট সাইজ", "ja": "フォントサイズ"},
    "Generate Summary": {"zh": "生成摘要", "fr": "Générer un résumé", "it": "Genera riassunto", "hi": "सारांश उत्पन्न करें", "ta": "சுருக்கத்தை உருவாக்கு", "bn": "সারাংশ তৈরি করুন", "ja": "要約を生成"},
    "Go Back": {"zh": "返回", "fr": "Retour", "it": "Indietro", "hi": "वापस जाएं", "ta": "திரும்பிச் செல்", "bn": "ফিরে যান", "ja": "戻る"},
    "Live Chat": {"zh": "实时聊天", "fr": "Chat en direct", "it": "Chat dal vivo", "hi": "लाइव चैट", "ta": "நேரடி அரட்டை", "bn": "লাইভ চ্যাট", "ja": "ライブチャット"},
    "Live Translate": {"zh": "实时翻译", "fr": "Traduction en direct", "it": "Traduzione in diretta", "hi": "लाइव अनुवाद", "ta": "நேரடி மொழிபெயர்ப்பு", "bn": "লাইভ অনুবাদ", "ja": "リアルタイム翻訳"},
    "Live dubbing requires a Premium or Beta 500 subscription": {
        "zh": "实时配音需要 Premium 或 Beta 500 订阅",
        "fr": "Le doublage en direct nécessite un abonnement Premium ou Beta 500",
        "it": "Il doppiaggio in diretta richiede un abbonamento Premium o Beta 500",
        "hi": "लाइव डबिंग के लिए Premium या Beta 500 सदस्यता आवश्यक है",
        "ta": "நேரடி டப்பிங்கிற்கு Premium அல்லது Beta 500 சந்தா தேவை",
        "bn": "লাইভ ডাবিংয়ের জন্য Premium বা Beta 500 সাবস্ক্রিপশন প্রয়োজন",
        "ja": "ライブ吹替にはPremiumまたはBeta 500サブスクリプションが必要です"
    },
    "Missed the beginning? Get an AI-powered summary of what happened so far.": {
        "zh": "错过了开头？获取 AI 生成的剧情摘要。",
        "fr": "Vous avez manqué le début ? Obtenez un résumé généré par l'IA de ce qui s'est passé jusqu'ici.",
        "it": "Hai perso l'inizio? Ottieni un riassunto generato dall'IA di quello che è successo finora.",
        "hi": "शुरुआत चूक गए? अब तक की कहानी का AI-जनित सारांश प्राप्त करें।",
        "ta": "தொடக்கத்தை தவறவிட்டீர்களா? இதுவரை என்ன நடந்தது என்பதன் AI சுருக்கத்தைப் பெறுங்கள்.",
        "bn": "শুরুটা মিস করেছেন? এখন পর্যন্ত কী হয়েছে তার AI-চালিত সারাংশ পান।",
        "ja": "冒頭を見逃しましたか？AIが生成したこれまでのあらすじを取得しましょう。"
    },
    "Navigate back": {"zh": "返回导航", "fr": "Retour", "it": "Torna indietro", "hi": "वापस नेविगेट करें", "ta": "பின்செல்", "bn": "পিছনে নেভিগেট করুন", "ja": "前に戻る"},
    "No cultural context available for this content yet.": {
        "zh": "此内容暂无文化背景信息。",
        "fr": "Aucun contexte culturel disponible pour ce contenu pour le moment.",
        "it": "Nessun contesto culturale disponibile per questo contenuto al momento.",
        "hi": "इस सामग्री के लिए अभी कोई सांस्कृतिक संदर्भ उपलब्ध नहीं है।",
        "ta": "இந்த உள்ளடக்கத்திற்கு இன்னும் கலாச்சார சூழல் கிடைக்கவில்லை.",
        "bn": "এই বিষয়বস্তুর জন্য এখনো কোনো সাংস্কৃতিক প্রসঙ্গ উপলব্ধ নেই।",
        "ja": "このコンテンツの文化的背景はまだありません。"
    },
    "Not Now": {"zh": "暂时不要", "fr": "Pas maintenant", "it": "Non ora", "hi": "अभी नहीं", "ta": "இப்போது வேண்டாம்", "bn": "এখন নয়", "ja": "今はしない"},
    "Play": {"zh": "播放", "fr": "Lecture", "it": "Riproduci", "hi": "चलाएं", "ta": "இயக்கு", "bn": "চালান", "ja": "再生"},
    "Premium Feature": {"zh": "高级功能", "fr": "Fonctionnalité Premium", "it": "Funzionalità Premium", "hi": "प्रीमियम सुविधा", "ta": "பிரீமியம் அம்சம்", "bn": "প্রিমিয়াম বৈশিষ্ট্য", "ja": "プレミアム機能"},
    "Preview": {"zh": "预览", "fr": "Aperçu", "it": "Anteprima", "hi": "पूर्वावलोकन", "ta": "முன்னோட்டம்", "bn": "প্রিভিউ", "ja": "プレビュー"},
    "Primary": {"zh": "主要", "fr": "Principal", "it": "Principale", "hi": "प्राथमिक", "ta": "முதன்மை", "bn": "প্রাথমিক", "ja": "プライマリ"},
    "Quiz": {"zh": "测验", "fr": "Quiz", "it": "Quiz", "hi": "प्रश्नोत्तरी", "ta": "வினாடி வினா", "bn": "কুইজ", "ja": "クイズ"},
    "Quiz Complete": {"zh": "测验完成", "fr": "Quiz terminé", "it": "Quiz completato", "hi": "प्रश्नोत्तरी पूर्ण", "ta": "வினாடி வினா முடிந்தது", "bn": "কুইজ সম্পূর্ণ", "ja": "クイズ完了"},
    "Ready to test your knowledge?": {"zh": "准备好测试您的知识了吗？", "fr": "Prêt à tester vos connaissances ?", "it": "Pronto a testare le tue conoscenze?", "hi": "अपने ज्ञान का परीक्षण करने के लिए तैयार हैं?", "ta": "உங்கள் அறிவை சோதிக்க தயாரா?", "bn": "আপনার জ্ঞান পরীক্ষা করতে প্রস্তুত?", "ja": "知識を試す準備はできましたか？"},
    "Retry": {"zh": "重试", "fr": "Réessayer", "it": "Riprova", "hi": "पुनः प्रयास करें", "ta": "மீண்டும் முயற்சி", "bn": "পুনরায় চেষ্টা করুন", "ja": "再試行"},
    "Search for external subtitles": {"zh": "搜索外部字幕", "fr": "Rechercher des sous-titres externes", "it": "Cerca sottotitoli esterni", "hi": "बाहरी उपशीर्षक खोजें", "ta": "வெளிப்புற வசனங்களைத் தேடு", "bn": "বহিরাগত সাবটাইটেল অনুসন্ধান করুন", "ja": "外部字幕を検索"},
    "Secondary (Optional)": {"zh": "次要（可选）", "fr": "Secondaire (facultatif)", "it": "Secondario (facoltativo)", "hi": "द्वितीयक (वैकल्पिक)", "ta": "இரண்டாம்நிலை (விரும்பினால்)", "bn": "গৌণ (ঐচ্ছিক)", "ja": "セカンダリ（任意）"},
    "Select Language": {"zh": "选择语言", "fr": "Sélectionner la langue", "it": "Seleziona lingua", "hi": "भाषा चुनें", "ta": "மொழியைத் தேர்ந்தெடு", "bn": "ভাষা নির্বাচন করুন", "ja": "言語を選択"},
    "Selected": {"zh": "已选择", "fr": "Sélectionné", "it": "Selezionato", "hi": "चयनित", "ta": "தேர்ந்தெடுக்கப்பட்டது", "bn": "নির্বাচিত", "ja": "選択済み"},
    "Send": {"zh": "发送", "fr": "Envoyer", "it": "Invia", "hi": "भेजें", "ta": "அனுப்பு", "bn": "পাঠান", "ja": "送信"},
    "Show Background": {"zh": "显示背景", "fr": "Afficher l'arrière-plan", "it": "Mostra sfondo", "hi": "पृष्ठभूमि दिखाएं", "ta": "பின்னணியைக் காட்டு", "bn": "পটভূমি দেখান", "ja": "背景を表示"},
    "Single Mode": {"zh": "单一模式", "fr": "Mode unique", "it": "Modalità singola", "hi": "एकल मोड", "ta": "ஒற்றை பயன்முறை", "bn": "একক মোড", "ja": "シングルモード"},
    "Skip": {"zh": "跳过", "fr": "Passer", "it": "Salta", "hi": "छोड़ें", "ta": "தவிர்", "bn": "এড়িয়ে যান", "ja": "スキップ"},
    "Split": {"zh": "分割", "fr": "Diviser", "it": "Dividi", "hi": "विभाजित करें", "ta": "பிரி", "bn": "বিভক্ত করুন", "ja": "分割"},
    "Split Mode": {"zh": "分割模式", "fr": "Mode divisé", "it": "Modalità divisa", "hi": "स्प्लिट मोड", "ta": "பிரிப்பு பயன்முறை", "bn": "স্প্লিট মোড", "ja": "分割モード"},
    "Standard": {"zh": "标准", "fr": "Standard", "it": "Standard", "hi": "मानक", "ta": "நிலையான", "bn": "স্ট্যান্ডার্ড", "ja": "スタンダード"},
    "Start Quiz": {"zh": "开始测验", "fr": "Commencer le quiz", "it": "Inizia il quiz", "hi": "प्रश्नोत्तरी शुरू करें", "ta": "வினாடி வினா தொடங்கு", "bn": "কুইজ শুরু করুন", "ja": "クイズを開始"},
    "Stream Limit Reached": {"zh": "已达串流上限", "fr": "Limite de diffusion atteinte", "it": "Limite di streaming raggiunto", "hi": "स्ट्रीम सीमा पूरी हुई", "ta": "ஸ்ட்ரீம் வரம்பை அடைந்தது", "bn": "স্ট্রিম সীমা পৌঁছেছে", "ja": "ストリーム制限に達しました"},
    "Subtitle Settings": {"zh": "字幕设置", "fr": "Paramètres des sous-titres", "it": "Impostazioni sottotitoli", "hi": "उपशीर्षक सेटिंग्स", "ta": "வசன அமைப்புகள்", "bn": "সাবটাইটেল সেটিংস", "ja": "字幕設定"},
    "Summary": {"zh": "摘要", "fr": "Résumé", "it": "Riepilogo", "hi": "सारांश", "ta": "சுருக்கம்", "bn": "সারাংশ", "ja": "要約"},
    "Tap words in subtitles to add them here": {"zh": "点击字幕中的单词添加到此处", "fr": "Appuyez sur les mots dans les sous-titres pour les ajouter ici", "it": "Tocca le parole nei sottotitoli per aggiungerle qui", "hi": "यहाँ जोड़ने के लिए उपशीर्षक में शब्दों पर टैप करें", "ta": "இங்கே சேர்க்க வசனங்களில் உள்ள சொற்களைத் தட்டவும்", "bn": "এখানে যোগ করতে সাবটাইটেলের শব্দগুলিতে ট্যাপ করুন", "ja": "字幕の単語をタップしてここに追加"},
    "Tell me more": {"zh": "告诉我更多", "fr": "En savoir plus", "it": "Dimmi di più", "hi": "मुझे और बताएं", "ta": "மேலும் சொல்லுங்கள்", "bn": "আরও বলুন", "ja": "もっと教えて"},
    "Toggle AI Panel": {"zh": "切换 AI 面板", "fr": "Afficher/Masquer le panneau IA", "it": "Attiva/Disattiva pannello IA", "hi": "AI पैनल टॉगल करें", "ta": "AI பேனலை நிலைமாற்று", "bn": "AI প্যানেল টগল করুন", "ja": "AIパネルの切り替え"},
    "Translate": {"zh": "翻译", "fr": "Traduire", "it": "Traduci", "hi": "अनुवाद करें", "ta": "மொழிபெயர்", "bn": "অনুবাদ করুন", "ja": "翻訳"},
    "Try Again": {"zh": "重试", "fr": "Réessayer", "it": "Riprova", "hi": "पुनः प्रयास करें", "ta": "மீண்டும் முயற்சி", "bn": "আবার চেষ্টা করুন", "ja": "再試行"},
    "Type a message...": {"zh": "输入消息...", "fr": "Saisissez un message...", "it": "Scrivi un messaggio...", "hi": "एक संदेश टाइप करें...", "ta": "ஒரு செய்தியைத் தட்டச்சு செய்...", "bn": "একটি বার্তা টাইপ করুন...", "ja": "メッセージを入力..."},
    "Upgrade": {"zh": "升级", "fr": "Mettre à niveau", "it": "Aggiorna", "hi": "अपग्रेड करें", "ta": "மேம்படுத்து", "bn": "আপগ্রেড করুন", "ja": "アップグレード"},
    "Upgrade Plan": {"zh": "升级方案", "fr": "Mettre à niveau le forfait", "it": "Aggiorna piano", "hi": "प्लान अपग्रेड करें", "ta": "திட்டத்தை மேம்படுத்து", "bn": "প্ল্যান আপগ্রেড করুন", "ja": "プランをアップグレード"},
    "Vocabulary": {"zh": "词汇", "fr": "Vocabulaire", "it": "Vocabolario", "hi": "शब्दावली", "ta": "சொற்களஞ்சியம்", "bn": "শব্দভান্ডার", "ja": "語彙"},
    "You have reached the maximum of {{maxStreams}} concurrent streams. Please stop another stream or upgrade your plan.": {
        "zh": "您已达到 {{maxStreams}} 个并发串流的上限。请停止其他串流或升级您的方案。",
        "fr": "Vous avez atteint le maximum de {{maxStreams}} diffusions simultanées. Veuillez arrêter une autre diffusion ou mettre à niveau votre forfait.",
        "it": "Hai raggiunto il massimo di {{maxStreams}} streaming simultanei. Interrompi un altro streaming o aggiorna il tuo piano.",
        "hi": "आपने {{maxStreams}} समवर्ती स्ट्रीम की अधिकतम सीमा पूरी कर ली है। कृपया कोई अन्य स्ट्रीम बंद करें या अपना प्लान अपग्रेड करें।",
        "ta": "{{maxStreams}} ஒரே நேர ஸ்ட்ரீம்களின் அதிகபட்ச எண்ணிக்கையை அடைந்துவிட்டீர்கள். மற்றொரு ஸ்ட்ரீமை நிறுத்தவும் அல்லது உங்கள் திட்டத்தை மேம்படுத்தவும்.",
        "bn": "আপনি {{maxStreams}} সমসাময়িক স্ট্রিমের সর্বোচ্চ সীমায় পৌঁছেছেন। অনুগ্রহ করে অন্য একটি স্ট্রিম বন্ধ করুন বা আপনার প্ল্যান আপগ্রেড করুন।",
        "ja": "同時ストリーム数の上限 {{maxStreams}} に達しました。別のストリームを停止するか、プランをアップグレードしてください。"
    },

    # Values shared by 2-6 languages
    "Accept Draw": {"he": "קבל תיקו", "es": "Aceptar empate", "fr": "Accepter le match nul"},
    "Accept Invite": {"he": "קבל הזמנה", "es": "Aceptar invitación", "fr": "Accepter l'invitation"},
    "Account": {"fr": "Compte", "it": "Account"},
    "Add content or enable AI": {"he": "הוסף תוכן או הפעל AI", "fr": "Ajouter du contenu ou activer l'IA"},
    "Admin": {"fr": "Administrateur", "it": "Amministratore"},
    "Android": {"es": "Android", "zh": "Android", "fr": "Android", "it": "Android", "hi": "Android", "ta": "Android", "bn": "Android", "ja": "Android"},
    "Auto": {"fr": "Automatique", "it": "Automatico"},
    "Bayit Chat": {"es": "Chat Bayit", "fr": "Discussion Bayit", "it": "Chat Bayit", "hi": "बयित चैट", "ta": "பயித் அரட்டை", "bn": "বাইত চ্যাট"},
    "Black Captured": {"he": "שחור נלכד", "es": "Negro capturado", "fr": "Noir capturé"},
    "Black's Turn": {"he": "תור השחור", "es": "Turno del negro", "fr": "Tour des noirs"},
    "Business": {"fr": "Entreprise", "it": "Business"},
    "Cancel": {"he": "ביטול", "es": "Cancelar", "fr": "Annuler"},
    "Cast": {"fr": "Distribution", "it": "Cast"},
    "Challenge Friend": {"he": "אתגר חבר", "es": "Desafiar amigo", "fr": "Défier un ami"},
    "Challenge via WhatsApp": {"he": "אתגר דרך WhatsApp", "es": "Desafiar vía WhatsApp", "fr": "Défier via WhatsApp"},
    "Chat": {"es": "Chat", "fr": "Discussion"},
    "Chess Bot": {"es": "Bot de ajedrez", "fr": "Robot d'échecs"},
    "Click again to confirm removal": {"he": "לחץ שוב לאישור ההסרה", "fr": "Cliquez à nouveau pour confirmer la suppression"},
    "Copy Code": {"he": "העתק קוד", "es": "Copiar código", "fr": "Copier le code"},
    "Could not find that user. Please check the name and try again.": {"es": "No se pudo encontrar ese usuario. Verifica el nombre e inténtalo de nuevo.", "fr": "Impossible de trouver cet utilisateur. Veuillez vérifier le nom et réessayer."},
    "Could not find the requested content. Please try different names.": {"es": "No se pudo encontrar el contenido solicitado. Intente con otros nombres.", "fr": "Impossible de trouver le contenu demandé. Veuillez essayer d'autres noms."},
    "DEBUG": {"he": "ניפוי", "es": "DEPURACIÓN", "fr": "DÉBOGAGE", "it": "DEBUG", "hi": "डीबग", "bn": "ডিবাগ", "ja": "デバッグ"},
    "Decline Draw": {"he": "סרב לתיקו", "es": "Rechazar empate", "fr": "Refuser le match nul"},
    "Decline Invite": {"he": "סרב להזמנה", "es": "Rechazar invitación", "fr": "Refuser l'invitation"},
    "Difficulty": {"es": "Dificultad", "fr": "Difficulté"},
    "Discover": {"he": "גלה", "es": "Descubrir", "fr": "Découvrir"},
    "Draw Offered": {"he": "הוצע תיקו", "es": "Empate ofrecido", "fr": "Match nul proposé"},
    "Easy": {"es": "Fácil", "fr": "Facile"},
    "Email": {"fr": "E-mail", "it": "E-mail"},
    "End Party": {"es": "Terminar fiesta", "fr": "Mettre fin à la fête"},
    "End time is required": {"he": "שעת סיום נדרשת", "fr": "L'heure de fin est requise"},
    "End time must be after start time": {"he": "שעת הסיום חייבת להיות אחרי שעת ההתחלה", "fr": "L'heure de fin doit être après l'heure de début"},
    "English": {"he": "אנגלית", "es": "Inglés", "zh": "英语", "fr": "Anglais", "it": "Inglese", "hi": "अंग्रेज़ी", "ta": "ஆங்கிலம்", "bn": "ইংরেজি"},
    "Engrew": {"es": "Engrew", "zh": "英希混合", "fr": "Engrew", "it": "Engrew", "hi": "एनग्रू", "ta": "எங்ரூ", "bn": "এনগ্রু", "ja": "エングリュー"},
    "Español": {"he": "ספרדית", "es": "Español", "zh": "西班牙语", "fr": "Espagnol", "it": "Spagnolo", "hi": "स्पेनिश", "ta": "ஸ்பானிஷ்", "bn": "স্প্যানিশ"},
    "Finding your content...": {"es": "Buscando tu contenido...", "fr": "Recherche de votre contenu..."},
    "Français": {"he": "צרפתית", "es": "Francés", "zh": "法语", "fr": "Français", "it": "Francese", "hi": "फ़्रांसीसी", "ta": "பிரெஞ்சு", "bn": "ফরাসি"},
    "Game Mode": {"es": "Modo de juego", "fr": "Mode de jeu"},
    "Game invite sent to {{name}}! Game code: {{code}}": {"es": "Invitación de juego enviada a {{name}}. Código: {{code}}", "fr": "Invitation envoyée à {{name}} ! Code : {{code}}"},
    "General": {"es": "General", "fr": "Général"},
    "Grammar-Flip": {"es": "Grammar-Flip", "zh": "语法翻转", "fr": "Grammar-Flip", "it": "Grammar-Flip", "hi": "ग्रामर-फ्लिप", "bn": "গ্রামার-ফ্লিপ", "ja": "グラマーフリップ"},
    "Haha": {"fr": "Haha", "it": "Haha"},
    "Hard": {"es": "Difícil", "fr": "Difficile"},
    "Havdalah": {"fr": "Havdalah", "it": "Havdalah"},
    "INFO": {"he": "מידע", "es": "INFO", "fr": "INFO", "it": "INFO", "hi": "जानकारी", "bn": "তথ্য", "ja": "情報"},
    "Iframe": {"es": "Iframe", "zh": "Iframe", "fr": "Iframe", "it": "Iframe", "hi": "Iframe", "ta": "Iframe", "bn": "Iframe", "ja": "Iframe"},
    "Israel": {"es": "Israel", "fr": "Israël"},
    "Italiano": {"he": "איטלקית", "es": "Italiano", "zh": "意大利语", "fr": "Italien", "it": "Italiano", "hi": "इतालवी", "ta": "இத்தாலியன்", "bn": "ইতালীয়"},
    "Join Game": {"es": "Unirse al juego", "fr": "Rejoindre la partie"},
    "Join by Game Code": {"he": "הצטרף עם קוד משחק", "es": "Unirse por código", "fr": "Rejoindre par code"},
    "Labour": {"fr": "Travail", "it": "Lavoro", "hi": "श्रम"},
    "Live": {"fr": "En direct", "it": "In diretta"},
    "Local": {"es": "Local", "fr": "Local"},
    "Logo": {"es": "Logo", "fr": "Logo", "it": "Logo"},
    "Manual": {"es": "Manual", "fr": "Manuel"},
    "Marketing": {"es": "Marketing", "fr": "Marketing", "it": "Marketing"},
    "Maximum {{max}} items reached": {"he": "הגעת למקסימום {{max}} פריטים", "fr": "Maximum de {{max}} éléments atteint"},
    "Medium": {"es": "Medio", "fr": "Moyen"},
    "Memes": {"es": "Memes", "fr": "Mèmes"},
    "Nikud": {"es": "Nikud", "zh": "尼库德", "fr": "Nikoud", "it": "Nikud", "hi": "निक्कुड़", "ta": "நிக்குட்", "bn": "নিকুদ", "ja": "ニクード"},
    "No friends yet": {"he": "אין חברים עדיין", "es": "Aún no hay amigos", "fr": "Pas encore d'amis"},
    "Offline": {"he": "לא מקוון", "es": "Sin conexión", "fr": "Hors ligne"},
    "Online": {"he": "מקוון", "es": "En línea", "fr": "En ligne"},
    "Opponent": {"he": "יריב", "es": "Oponente", "fr": "Adversaire"},
    "Parasha": {"es": "Parashá", "fr": "Parasha"},
    "Parashat": {"es": "Parashat", "fr": "Parashat", "it": "Parashat"},
    "Personal": {"es": "Personal", "fr": "Personnel"},
    "Play vs Bot": {"es": "Jugar contra bot", "fr": "Jouer contre le bot"},
    "Play vs Friend": {"es": "Jugar contra amigo", "fr": "Jouer contre un ami"},
    "Playlist": {"fr": "Liste de lecture", "it": "Playlist"},
    "Podcast": {"es": "Podcast", "fr": "Podcast", "it": "Podcast"},
    "Podcasts": {"es": "Podcasts", "fr": "Podcasts"},
    "Premium": {"es": "Premium", "fr": "Premium", "it": "Premium"},
    "Radio": {"es": "Radio", "fr": "Radio", "it": "Radio"},
    "Select at least one day": {"he": "בחר לפחות יום אחד", "fr": "Sélectionnez au moins un jour"},
    "Sending game invite to {{name}}...": {"es": "Enviando invitación de juego a {{name}}...", "fr": "Envoi de l'invitation à {{name}}..."},
    "Series": {"es": "Series", "fr": "Séries"},
    "Shabbat Shalom!": {"fr": "Chabbat Chalom !", "it": "Shabbat Shalom!"},
    "Shoresh": {"es": "Shoresh", "zh": "词根", "fr": "Shoresh", "it": "Shoresh", "hi": "शोरेश", "ta": "ஷோரேஷ்", "bn": "শোরেশ", "ja": "ショレシュ"},
    "Show Guide Hints": {"es": "Mostrar pistas de guía", "fr": "Afficher les astuces du guide"},
    "Show me channels...": {"es": "Muéstrame canales...", "fr": "Montrez-moi les chaînes..."},
    "Show side by side...": {"es": "Mostrar lado a lado...", "fr": "Afficher côte à côte..."},
    "Showing {{count}} content items in widgets": {"es": "Mostrando {{count}} elementos de contenido en widgets", "fr": "Affichage de {{count}} éléments de contenu dans les widgets"},
    "Slang Synthesis": {"es": "Síntesis de jerga", "zh": "俚语合成", "fr": "Synthèse d'argot", "it": "Sintesi gergale", "hi": "स्लैंग संश्लेषण", "bn": "স্ল্যাং সিন্থেসিস", "ja": "スラング合成"},
    "Slug": {"es": "Slug", "zh": "别名", "fr": "Identifiant", "it": "Slug", "ta": "ஸ்லக்"},
    "Social": {"es": "Social", "fr": "Social"},
    "Start a chess game with...": {"es": "Iniciar un juego de ajedrez con...", "fr": "Commencer une partie d'échecs avec..."},
    "Streaming": {"fr": "Diffusion", "it": "Streaming"},
    "Talkback": {"es": "Talkback", "fr": "Retour vocal"},
    "Tel Aviv, Israel 6100000": {"es": "Tel Aviv, Israel 6100000", "fr": "Tel-Aviv, Israël 6100000"},
    "Text Chat Only": {"es": "Solo chat de texto", "fr": "Chat textuel uniquement"},
    "Times based on your location": {"he": "זמנים לפי מיקומך", "fr": "Horaires basés sur votre emplacement"},
    "Total": {"es": "Total", "fr": "Total"},
    "Trivia": {"es": "Trivia", "zh": "问答", "fr": "Anecdotes", "it": "Curiosità", "hi": "ट्रिविया", "ta": "அறிவுத்திறன்", "bn": "ট্রিভিয়া", "ja": "トリビア"},
    "Upgrade to Premium": {"es": "Actualizar a Premium", "fr": "Passer au Premium"},
    "Video": {"es": "Vídeo", "fr": "Vidéo"},
    "Watch Party": {"es": "Fiesta de visualización", "fr": "Soirée visionnage", "it": "Watch Party"},
    "White Captured": {"he": "לבן נלכד", "es": "Blanco capturado", "fr": "Blanc capturé"},
    "White's Turn": {"he": "תור הלבן", "es": "Turno del blanco", "fr": "Tour des blancs"},
    "Widget": {"es": "Widget", "fr": "Widget"},
    "Widgets": {"es": "Widgets", "fr": "Widgets"},
    "{{count}} min": {"es": "{{count}} min", "fr": "{{count}} min", "it": "{{count}} min"},
    "{{hours}}h →": {"es": "{{hours}}h →", "fr": "{{hours}}h →", "it": "{{hours}}h →"},
    "← {{hours}}h": {"es": "← {{hours}}h", "fr": "← {{hours}}h", "it": "← {{hours}}h"},
    "{{name}} invited you to a chess game!": {"es": "¡{{name}} te ha invitado a una partida de ajedrez!", "fr": "{{name}} vous a invité à une partie d'échecs !"},
    "Talk": {"fr": "Parler", "it": "Parla"},

    # Hebrew-only remaining
    "An unexpected error occurred": {"he": "אירעה שגיאה בלתי צפויה"},
    "Email is required": {"he": "דואר אלקטרוני נדרש"},
    "Feature Flags": {"he": "דגלי תכונות"},
    "Google sign-in failed. Please try again.": {"he": "כניסה עם Google נכשלה. אנא נסה שוב."},
    "Password is required": {"he": "סיסמה נדרשת"},
    "Change Plan": {"he": "שנה מסלול", "es": "Cambiar plan"},
    "Delete": {"he": "מחק", "es": "Eliminar"},
    "Enable Live Subtitles": {"he": "הפעל כתוביות חיות", "es": "Habilitar subtítulos en vivo"},
    "Available Translation Languages": {"he": "שפות תרגום זמינות", "es": "Idiomas de traducción disponibles"},
    "Filters": {"he": "מסננים", "es": "Filtros"},
    "Live Subtitle Settings": {"he": "הגדרות כתוביות חיות", "es": "Configuración de subtítulos en vivo"},
    "Primary Language (Source)": {"he": "שפה ראשית (מקור)", "es": "Idioma principal (origen)"},
    "Resume": {"he": "המשך", "es": "Reanudar"},
    "Select which languages users can translate to in real-time": {"he": "בחר לאילו שפות משתמשים יכולים לתרגם בזמן אמת", "es": "Seleccione a qué idiomas los usuarios pueden traducir en tiempo real"},
    "Subscription Deleted": {"he": "מנוי נמחק", "es": "Suscripción eliminada"},
    "Subtitles": {"he": "כתוביות", "es": "Subtítulos"},

    # Italian-only remaining
    "Dashboard": {"it": "Pannello di controllo"},
    "Feedback": {"it": "Feedback"},
    "Home": {"it": "Home"},
    "LIVE": {"it": "IN DIRETTA"},
    "Media": {"it": "Media"},
    "Password": {"it": "Password"},
    "Powered by": {"it": "Powered by"},
    "Privacy": {"it": "Privacy"},
    "Smart Subs": {"it": "Sottotitoli intelligenti"},
    "Video on Demand": {"it": "Video on demand"},
    "Shabbat": {"it": "Shabbat"},
    "Shacharit": {"it": "Shacharit"},
    "Modeh Ani": {"it": "Modeh Ani"},

    # Hindi-only
    "Fauda": {"es": "Fauda", "fr": "Fauda", "it": "Fauda", "hi": "फ़ौदा"},
    "Shtisel": {"es": "Shtisel", "fr": "Shtisel", "it": "Shtisel", "hi": "שטיסל"},

    # Log levels
    "ERROR": {"es": "ERROR", "hi": "त्रुटि", "bn": "ত্রুটি", "ja": "エラー"},
    "SUCCESS": {"hi": "सफलता", "bn": "সাফল্য", "ja": "成功"},
    "TRACE": {"he": "מעקב", "es": "TRAZA", "fr": "TRACE", "it": "TRACCIA", "hi": "ट्रेस", "bn": "ট্রেস", "ja": "トレース"},
    "WARN": {"hi": "चेतावनी", "bn": "সতর্কতা", "ja": "警告"},
    "PG-13": {"he": "PG-13", "es": "PG-13", "zh": "PG-13", "fr": "PG-13", "it": "PG-13", "hi": "PG-13", "ja": "PG-13"},

    # Language name values - these should stay in their native script
    "עברית": {"he": "עברית", "es": "Hebreo", "zh": "希伯来语", "fr": "Hébreu", "it": "Ebraico", "hi": "हिब्रू", "ta": "எபிரேயம்", "bn": "হিব্রু"},
    "हिन्दी": {"he": "הינדי", "es": "Hindi", "zh": "印地语", "fr": "Hindi", "it": "Hindi", "hi": "हिन्दी", "ta": "இந்தி", "bn": "হিন্দি"},
    "বাংলা": {"he": "בנגלית", "es": "Bengalí", "zh": "孟加拉语", "fr": "Bengali", "it": "Bengalese", "hi": "बांग्ला", "ta": "வங்காளம்", "bn": "বাংলা"},
    "தமிழ்": {"he": "טמילית", "es": "Tamil", "zh": "泰米尔语", "fr": "Tamoul", "it": "Tamil", "hi": "तमिल", "ta": "தமிழ்", "bn": "তামিল"},

    # Iframe URLs
    "Iframe URL": {"zh": "Iframe 网址", "hi": "Iframe URL", "ta": "Iframe URL", "bn": "Iframe URL", "ja": "Iframe URL"},
    "iFrame URL": {"zh": "iFrame 网址", "fr": "URL iFrame"},

    # © line
    "© {{year}} Bayit+. All rights reserved.": {"ja": "© {{year}} Bayit+. All rights reserved."},
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
