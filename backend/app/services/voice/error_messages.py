"""
Error Messages Module
Multi-language error messages for voice interactions.
Supports all 10 Bayit+ languages: he, en, es, zh, fr, it, hi, ta, bn, ja
"""

from typing import Dict

ERROR_MESSAGES: Dict[str, Dict[str, str]] = {
    "claude_api_failure": {
        "he": "מצטער, לא הצלחתי להבין את זה כרגע",
        "en": "Sorry, I couldn't understand that right now",
        "es": "Lo siento, no pude entender eso ahora",
        "zh": "抱歉，我现在无法理解",
        "fr": "Désolé, je n'ai pas pu comprendre pour le moment",
        "it": "Mi dispiace, non sono riuscito a capire al momento",
        "hi": "क्षमा करें, मैं अभी यह नहीं समझ सका",
        "ta": "மன்னிக்கவும், இப்போது புரிந்து கொள்ள முடியவில்லை",
        "bn": "দুঃখিত, আমি এখন এটি বুঝতে পারিনি",
        "ja": "申し訳ありません、今は理解できませんでした",
    },
    "search_failure": {
        "he": "מצטער, לא הצלחתי לחפש כרגע",
        "en": "Sorry, I couldn't search right now",
        "es": "Lo siento, no pude buscar ahora",
        "zh": "抱歉，我现在无法搜索",
        "fr": "Désolé, je n'ai pas pu effectuer la recherche",
        "it": "Mi dispiace, non sono riuscito a cercare ora",
        "hi": "क्षमा करें, मैं अभी खोज नहीं कर सका",
        "ta": "மன்னிக்கவும், இப்போது தேட முடியவில்லை",
        "bn": "দুঃখিত, আমি এখন অনুসন্ধান করতে পারিনি",
        "ja": "申し訳ありません、今は検索できませんでした",
    },
    "kids_content_empty": {
        "he": "לא מצאתי תוכן מתאים לגיל זה",
        "en": "No content found for that age",
        "es": "No se encontró contenido para esa edad",
        "zh": "未找到适合该年龄的内容",
        "fr": "Aucun contenu trouvé pour cet âge",
        "it": "Nessun contenuto trovato per questa età",
        "hi": "उस उम्र के लिए कोई सामग्री नहीं मिली",
        "ta": "அந்த வயதிற்கு உள்ளடக்கம் கிடைக்கவில்லை",
        "bn": "সেই বয়সের জন্য কোনো বিষয়বস্তু পাওয়া যায়নি",
        "ja": "その年齢に適したコンテンツが見つかりませんでした",
    },
    "family_controls_block": {
        "he": "תוכן זה חסום על ידי בקרת הורים",
        "en": "This content is blocked by parental controls",
        "es": "Este contenido está bloqueado por controles parentales",
        "zh": "此内容被家长控制功能屏蔽",
        "fr": "Ce contenu est bloqué par le contrôle parental",
        "it": "Questo contenuto è bloccato dal controllo genitori",
        "hi": "यह सामग्री माता-पिता के नियंत्रण द्वारा अवरुद्ध है",
        "ta": "இந்த உள்ளடக்கம் பெற்றோர் கட்டுப்பாட்டால் தடுக்கப்பட்டுள்ளது",
        "bn": "এই বিষয়বস্তু অভিভাবকীয় নিয়ন্ত্রণ দ্বারা অবরুদ্ধ",
        "ja": "このコンテンツはペアレンタルコントロールによりブロックされています",
    },
    "timeout": {
        "he": "החיפוש לוקח זמן, נסה שוב",
        "en": "Search is taking time, try again",
        "es": "La búsqueda está tardando, inténtalo de nuevo",
        "zh": "搜索耗时较长，请重试",
        "fr": "La recherche prend du temps, réessayez",
        "it": "La ricerca richiede tempo, riprova",
        "hi": "खोज में समय लग रहा है, फिर से प्रयास करें",
        "ta": "தேடல் நேரம் எடுக்கிறது, மீண்டும் முயற்சிக்கவும்",
        "bn": "অনুসন্ধানে সময় লাগছে, আবার চেষ্টা করুন",
        "ja": "検索に時間がかかっています、もう一度お試しください",
    },
    "unknown_error": {
        "he": "שגיאה בלתי צפויה, נסה שוב",
        "en": "Unexpected error, try again",
        "es": "Error inesperado, inténtalo de nuevo",
        "zh": "意外错误，请重试",
        "fr": "Erreur inattendue, réessayez",
        "it": "Errore imprevisto, riprova",
        "hi": "अप्रत्याशित त्रुटि, फिर से प्रयास करें",
        "ta": "எதிர்பாராத பிழை, மீண்டும் முயற்சிக்கவும்",
        "bn": "অপ্রত্যাশিত ত্রুটি, আবার চেষ্টা করুন",
        "ja": "予期しないエラーです、もう一度お試しください",
    },
    "no_results": {
        "he": "מצטער, לא מצאתי תוצאות",
        "en": "Sorry, I found no results",
        "es": "Lo siento, no encontré resultados",
        "zh": "抱歉，没有找到结果",
        "fr": "Désolé, aucun résultat trouvé",
        "it": "Mi dispiace, nessun risultato trovato",
        "hi": "क्षमा करें, कोई परिणाम नहीं मिला",
        "ta": "மன்னிக்கவும், முடிவுகள் கிடைக்கவில்லை",
        "bn": "দুঃখিত, কোনো ফলাফল পাওয়া যায়নি",
        "ja": "申し訳ありません、結果が見つかりませんでした",
    },
    "age_detection_failed": {
        "he": "לא הצלחתי לזהות את הגיל מהבקשה",
        "en": "Couldn't detect age from request",
        "es": "No pude detectar la edad de la solicitud",
        "zh": "无法从请求中检测年龄",
        "fr": "Impossible de détecter l'âge à partir de la demande",
        "it": "Non sono riuscito a rilevare l'età dalla richiesta",
        "hi": "अनुरोध से उम्र का पता नहीं चल सका",
        "ta": "கோரிக்கையிலிருந்து வயதைக் கண்டறிய இயலவில்லை",
        "bn": "অনুরোধ থেকে বয়স সনাক্ত করা যায়নি",
        "ja": "リクエストから年齢を検出できませんでした",
    },
    "unauthorized": {
        "he": "אין לך הרשאה לגשת לשיחה זו",
        "en": "You don't have permission to access this conversation",
        "es": "No tienes permiso para acceder a esta conversación",
        "zh": "您没有权限访问此对话",
        "fr": "Vous n'avez pas la permission d'accéder à cette conversation",
        "it": "Non hai il permesso di accedere a questa conversazione",
        "hi": "आपको इस बातचीत तक पहुँचने की अनुमति नहीं है",
        "ta": "இந்த உரையாடலை அணுக உங்களுக்கு அனுமதி இல்லை",
        "bn": "এই কথোপকথনে অ্যাক্সেস করার অনুমতি আপনার নেই",
        "ja": "この会話にアクセスする権限がありません",
    },
    "service_unavailable": {
        "he": "השירות אינו זמין כרגע, נסה שוב מאוחר יותר",
        "en": "Service is unavailable right now, please try again later",
        "es": "El servicio no está disponible ahora, inténtalo más tarde",
        "zh": "服务暂时不可用，请稍后重试",
        "fr": "Le service est indisponible, veuillez réessayer plus tard",
        "it": "Il servizio non è disponibile ora, riprova più tardi",
        "hi": "सेवा अभी उपलब्ध नहीं है, कृपया बाद में पुनः प्रयास करें",
        "ta": "சேவை இப்போது கிடைக்கவில்லை, பின்னர் மீண்டும் முயற்சிக்கவும்",
        "bn": "সেবা এখন অনুপলব্ধ, অনুগ্রহ করে পরে আবার চেষ্টা করুন",
        "ja": "サービスは現在利用できません、後でもう一度お試しください",
    },
    "rate_limit": {
        "he": "יותר מדי בקשות, נסה שוב עוד מעט",
        "en": "Too many requests, please try again in a moment",
        "es": "Demasiadas solicitudes, inténtalo de nuevo en un momento",
        "zh": "请求过多，请稍后重试",
        "fr": "Trop de demandes, veuillez réessayer dans un moment",
        "it": "Troppe richieste, riprova tra un momento",
        "hi": "बहुत अधिक अनुरोध, कृपया कुछ देर बाद पुनः प्रयास करें",
        "ta": "அதிகமான கோரிக்கைகள், சிறிது நேரத்தில் மீண்டும் முயற்சிக்கவும்",
        "bn": "অনেক বেশি অনুরোধ, অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন",
        "ja": "リクエストが多すぎます、しばらくしてからもう一度お試しください",
    },
}


def get_error_message(error_type: str, language: str = "he") -> str:
    """
    Get localized error message.

    Args:
        error_type: Error type key (e.g., 'claude_api_failure')
        language: Language code (he, en, es, zh, fr, it, hi, ta, bn, ja)

    Returns:
        Localized error message string
    """
    messages = ERROR_MESSAGES.get(error_type, ERROR_MESSAGES["unknown_error"])
    return messages.get(language, messages["en"])
