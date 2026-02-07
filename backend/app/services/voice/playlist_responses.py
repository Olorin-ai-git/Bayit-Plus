"""
Playlist Spoken Response Templates
10-language spoken response templates for playlist voice interactions.
"""

# Spoken response templates (10 languages)
PLAYLIST_ADDED_RESPONSES = {
    "he": "{} נוסף לרשימה שלך",
    "en": "Added {} to your playlist",
    "es": "{} agregado a tu lista",
    "zh": "{} 已添加到您的播放列表",
    "fr": "{} ajouté à votre liste",
    "it": "{} aggiunto alla tua playlist",
    "hi": "{} आपकी प्लेलिस्ट में जोड़ा गया",
    "ta": "{} உங்கள் பட்டியலில் சேர்க்கப்பட்டது",
    "bn": "{} আপনার প্লেলিস্টে যোগ করা হয়েছে",
    "ja": "{} をプレイリストに追加しました",
}
PLAYLIST_REMOVED_RESPONSES = {
    "he": "{} הוסר מהרשימה שלך",
    "en": "Removed {} from your playlist",
    "es": "{} eliminado de tu lista",
    "zh": "{} 已从您的播放列表中移除",
    "fr": "{} retiré de votre liste",
    "it": "{} rimosso dalla tua playlist",
    "hi": "{} आपकी प्लेलिस्ट से हटाया गया",
    "ta": "{} உங்கள் பட்டியலிலிருந்து அகற்றப்பட்டது",
    "bn": "{} আপনার প্লেলিস্ট থেকে সরানো হয়েছে",
    "ja": "{} をプレイリストから削除しました",
}
PLAYLIST_CLEARED_RESPONSES = {
    "he": "הרשימה נוקתה",
    "en": "Playlist cleared",
    "es": "Lista limpiada",
    "zh": "播放列表已清空",
    "fr": "Liste de lecture vidée",
    "it": "Playlist svuotata",
    "hi": "प्लेलिस्ट साफ़ कर दी गई",
    "ta": "பட்டியல் அழிக்கப்பட்டது",
    "bn": "প্লেলিস্ট সাফ করা হয়েছে",
    "ja": "プレイリストをクリアしました",
}
PLAYLIST_PLAYING_RESPONSES = {
    "he": "מנגן את הרשימה שלך",
    "en": "Playing your playlist",
    "es": "Reproduciendo tu lista",
    "zh": "正在播放您的播放列表",
    "fr": "Lecture de votre liste",
    "it": "Riproduzione della tua playlist",
    "hi": "आपकी प्लेलिस्ट चलाई जा रही है",
    "ta": "உங்கள் பட்டியல் இயக்கப்படுகிறது",
    "bn": "আপনার প্লেলিস্ট চালানো হচ্ছে",
    "ja": "プレイリストを再生中",
}
PLAYLIST_REVIEW_RESPONSES = {
    "he": "ברשימה שלך {} פריטים",
    "en": "Your playlist has {} items",
    "es": "Tu lista tiene {} elementos",
    "zh": "您的播放列表有 {} 个项目",
    "fr": "Votre liste contient {} éléments",
    "it": "La tua playlist ha {} elementi",
    "hi": "आपकी प्लेलिस्ट में {} आइटम हैं",
    "ta": "உங்கள் பட்டியலில் {} உருப்படிகள் உள்ளன",
    "bn": "আপনার প্লেলিস্টে {} আইটেম আছে",
    "ja": "プレイリストに {} 件あります",
}
PLAYLIST_EMPTY_RESPONSES = {
    "he": "הרשימה שלך ריקה",
    "en": "Your playlist is empty",
    "es": "Tu lista est\u00e1 vac\u00eda",
    "zh": "您的播放列表为空",
    "fr": "Votre liste de lecture est vide",
    "it": "La tua playlist è vuota",
    "hi": "आपकी प्लेलिस्ट खाली है",
    "ta": "உங்கள் பட்டியல் காலியாக உள்ளது",
    "bn": "আপনার প্লেলিস্ট খালি",
    "ja": "プレイリストは空です",
}
PLAYLIST_NOT_FOUND_RESPONSES = {
    "he": "לא מצאתי את זה ברשימה שלך",
    "en": "I couldn't find that in your playlist",
    "es": "No encontré eso en tu lista",
    "zh": "在您的播放列表中找不到该项目",
    "fr": "Je n'ai pas trouvé cela dans votre liste",
    "it": "Non ho trovato questo nella tua playlist",
    "hi": "आपकी प्लेलिस्ट में यह नहीं मिला",
    "ta": "உங்கள் பட்டியலில் அது கிடைக்கவில்லை",
    "bn": "আপনার প্লেলিস্টে এটি পাওয়া যায়নি",
    "ja": "プレイリストにそれが見つかりませんでした",
}
PLAYLIST_ALREADY_EXISTS_RESPONSES = {
    "he": "{} כבר ברשימה שלך",
    "en": "{} is already in your playlist",
    "es": "{} ya está en tu lista",
    "zh": "{} 已在您的播放列表中",
    "fr": "{} est déjà dans votre liste",
    "it": "{} è già nella tua playlist",
    "hi": "{} पहले से आपकी प्लेलिस्ट में है",
    "ta": "{} ஏற்கனவே உங்கள் பட்டியலில் உள்ளது",
    "bn": "{} ইতিমধ্যে আপনার প্লেলিস্টে আছে",
    "ja": "{} は既にプレイリストにあります",
}
PLAYLIST_FULL_RESPONSES = {
    "he": "הרשימה שלך מלאה ({} פריטים מקסימום)",
    "en": "Your playlist is full ({} items max)",
    "es": "Tu lista est\u00e1 llena ({} elementos m\u00e1ximo)",
    "zh": "您的播放列表已满（最多{}个项目）",
    "fr": "Votre liste est pleine ({} \u00e9l\u00e9ments max)",
    "it": "La tua playlist \u00e8 piena ({} elementi max)",
    "hi": "आपकी प्लेलिस्ट भर गई है (अधिकतम {} आइटम)",
    "ta": "உங்கள் பட்டியல் நிரம்பிவிட்டது (அதிகபட்சம் {})",
    "bn": "আপনার প্লেলিস্ট পূর্ণ (সর্বোচ্চ {} আইটেম)",
    "ja": "プレイリストがいっぱいです（最大{}件）",
}
