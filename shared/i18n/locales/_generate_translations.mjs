/**
 * Translation generator for hi.json, ta.json, bn.json
 * Produces complete locale files matching en.json structure
 * Preserves existing translations, translates all missing keys
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const en = JSON.parse(readFileSync(join(__dirname, 'en.json'), 'utf8'));
const hiExisting = JSON.parse(readFileSync(join(__dirname, 'hi.json'), 'utf8'));
const taExisting = JSON.parse(readFileSync(join(__dirname, 'ta.json'), 'utf8'));
const bnExisting = JSON.parse(readFileSync(join(__dirname, 'bn.json'), 'utf8'));

// ===== HINDI DICTIONARY =====
const hiDict = {
  // --- Common UI ---
  "Loading...": "लोड हो रहा है...",
  "Error": "त्रुटि",
  "Retry": "पुनः प्रयास करें",
  "Cancel": "रद्द करें",
  "Save": "सहेजें",
  "Saving...": "सहेज रहे हैं...",
  "Close": "बंद करें",
  "Back": "वापस",
  "Next": "अगला",
  "Search": "खोजें",
  "Delete": "हटाएं",
  "Edit": "संपादित करें",
  "Add": "जोड़ें",
  "OK": "ठीक है",
  "Yes": "हाँ",
  "No": "नहीं",
  "Apply": "लागू करें",
  "Send": "भेजें",
  "Done": "हो गया",
  "All": "सभी",
  "Reset": "रीसेट करें",
  "Clear": "साफ़ करें",
  "Confirm": "पुष्टि करें",
  "Submit": "सबमिट करें",
  "Success": "सफलता",
  "Warning": "चेतावनी",
  "Active": "सक्रिय",
  "Inactive": "निष्क्रिय",
  "Enabled": "सक्षम",
  "Disabled": "अक्षम",
  "Settings": "सेटिंग्स",
  "Profile": "प्रोफ़ाइल",
  "Dashboard": "डैशबोर्ड",
  "Home": "होम",
  "Users": "उपयोगकर्ता",
  "Content": "सामग्री",
  "Title": "शीर्षक",
  "Description": "विवरण",
  "Status": "स्थिति",
  "Date": "तारीख",
  "Actions": "कार्रवाइयां",
  "Name": "नाम",
  "Email": "ईमेल",
  "Password": "पासवर्ड",
  "Refresh": "रीफ्रेश",
  "Refreshing...": "रीफ्रेश हो रहा है...",
  "Export": "निर्यात करें",
  "Import": "आयात करें",
  "Filter": "फ़िल्टर",
  "Filters": "फ़िल्टर",
  "Create": "बनाएं",
  "Update": "अपडेट करें",
  "Remove": "हटाएं",
  "View": "देखें",
  "Play": "चलाएं",
  "Pause": "रोकें",
  "Stop": "रुकें",
  "Mute": "म्यूट करें",
  "Unmute": "अनम्यूट करें",
  "Volume": "वॉल्यूम",
  "Live": "लाइव",
  "LIVE": "लाइव",
  "Premium": "प्रीमियम",
  "PREMIUM": "प्रीमियम",
  "Basic": "बेसिक",
  "Family": "फैमिली",
  "Subscriptions": "सब्सक्रिप्शन",
  "Revenue": "राजस्व",
  "Pending": "लंबित",
  "Approved": "स्वीकृत",
  "Rejected": "अस्वीकृत",
  "Completed": "पूर्ण",
  "Failed": "विफल",
  "Processing": "प्रोसेसिंग",
  "Processing...": "प्रोसेसिंग...",
  "Uploading": "अपलोड हो रहा है",
  "Uploading...": "अपलोड हो रहा है...",
  "Searching...": "खोज रहे हैं...",
  "Listening...": "सुन रहे हैं...",
  "Recording...": "रिकॉर्डिंग...",
  "Transcribing...": "ट्रांसक्राइब हो रहा है...",
  "Connected": "कनेक्टेड",
  "Disconnected": "डिस्कनेक्ट",
  "Reconnecting...": "फिर से कनेक्ट हो रहा है...",
  "Order": "क्रम",
  "Type": "प्रकार",
  "Size": "आकार",
  "Duration": "अवधि",
  "Progress": "प्रगति",
  "Category": "श्रेणी",
  "Categories": "श्रेणियां",
  "Channels": "चैनल",
  "Movies": "फ़िल्में",
  "Series": "सीरीज़",
  "Podcasts": "पॉडकास्ट",
  "Radio": "रेडियो",
  "Audiobooks": "ऑडियोबुक",
  "Episode": "एपिसोड",
  "Episodes": "एपिसोड",
  "Season": "सीज़न",
  "Seasons": "सीज़न",
  "Chapter": "अध्याय",
  "Chapters": "अध्याय",
  "Rating": "रेटिंग",
  "Genre": "शैली",
  "Director": "निर्देशक",
  "Cast": "कास्ट",
  "Author": "लेखक",
  "Narrator": "वर्णनकर्ता",
  "Published": "प्रकाशित",
  "Draft": "ड्राफ्ट",
  "Scheduled": "शेड्यूल किया गया",
  "Subtitles": "सबटाइटल",
  "Off": "बंद",
  "None": "कोई नहीं",
  "Auto": "ऑटो",
  "Manual": "मैनुअल",
  "Custom": "कस्टम",
  "System": "सिस्टम",
  "General": "सामान्य",
  "Billing": "बिलिंग",
  "Technical": "तकनीकी",
  "Features": "सुविधाएं",
  "Support": "सहायता",
  "Documentation": "दस्तावेज़",
  "FAQ": "FAQ",
  "Contact": "संपर्क",
  "Widgets": "विजेट",
  "Recordings": "रिकॉर्डिंग",
  "Uploads": "अपलोड",
  "Favorites": "पसंदीदा",
  "Downloads": "डाउनलोड",
  "Watchlist": "वॉचलिस्ट",
  "History": "इतिहास",
  "News": "समाचार",
  "Sports": "खेल",
  "Entertainment": "मनोरंजन",
  "Music": "संगीत",
  "Kids": "बच्चे",
  "Education": "शिक्षा",
  "Educational": "शैक्षिक",
  "Culture": "संस्कृति",
  "Weather": "मौसम",
  "Health": "स्वास्थ्य",
  "Economy": "अर्थव्यवस्था",
  "Politics": "राजनीति",
  "Technology": "प्रौद्योगिकी",
  "Tech": "तकनीक",
  "Food": "भोजन",
  "Fashion": "फैशन",
  "Travel": "यात्रा",
  "Security": "सुरक्षा",
  "Finance": "वित्त",
  "Troubleshooting": "समस्या निवारण",
  "Account": "खाता",
  "Overview": "अवलोकन",
  "Notifications": "सूचनाएं",
  "Privacy": "गोपनीयता",
  "Language": "भाषा",
  "Appearance": "दिखावट",
  "Display": "प्रदर्शन",
  "Quality": "गुणवत्ता",
  "Speed": "गति",
  "Queued": "कतार में",
  "Cancelled": "रद्द",
  "Skipped": "छोड़ा गया",
  "Complete": "पूर्ण",
  "Paused": "रुका हुआ",
  "Resume": "फिर से शुरू करें",
  "Schedule": "शेड्यूल",
  "Time": "समय",
  "Mode": "मोड",
  "Cost": "लागत",
  "Explore": "अन्वेषण करें",
  "Sources": "स्रोत",
  "Started": "शुरू हुआ",
  "Permissions": "अनुमतियां",
  "Granted": "दी गई",
  "Denied": "अस्वीकृत",
  "Advanced": "उन्नत",
  "items": "आइटम",
  "item": "आइटम",
  "Trending": "ट्रेंडिंग",
  "Popular": "लोकप्रिय",
  "Recent": "हाल का",
  "Speaking": "बोल रहे हैं",
  "Ready": "तैयार",
  "Host": "होस्ट",
  "You": "आप",
  "Chat": "चैट",
  "Share": "शेयर करें",
  "Copied!": "कॉपी हो गया!",
  "Leave Party": "पार्टी छोड़ें",
  "End Party": "पार्टी समाप्त करें",
  "Synced": "सिंक्ड",
  "Syncing...": "सिंक हो रहा है...",
  "Connecting...": "कनेक्ट हो रहा है...",
  "White": "सफ़ेद",
  "Black": "काला",
  "Game Over": "गेम ओवर",
  "New Game": "नया गेम",
  "Checkmate!": "शह-मात!",
  "Stalemate": "गतिरोध",
  "Draw": "ड्रॉ",
  "Resign": "हार मानें",
  "Join": "जुड़ें",
  "Challenge": "चुनौती",
  "Easy": "आसान",
  "Medium": "मध्यम",
  "Hard": "कठिन",
  "Wins": "जीत",
  "Losses": "हार",
  "Draws": "ड्रॉ",
  "Friends": "मित्र",
  "Accept": "स्वीकार करें",
  "Reject": "अस्वीकार करें",
  "Low": "कम",
  "High": "उच्च",
  "Normal": "सामान्य",
  "Open": "खुला",
  "Closed": "बंद",
  "Urgent": "अत्यावश्यक",
  "In Progress": "प्रगति में",
  "Resolved": "हल किया गया",
  "Sunday": "रविवार",
  "Monday": "सोमवार",
  "Tuesday": "मंगलवार",
  "Wednesday": "बुधवार",
  "Thursday": "गुरुवार",
  "Friday": "शुक्रवार",
  "Saturday": "शनिवार",
  "Sun": "रवि",
  "Mon": "सोम",
  "Tue": "मंगल",
  "Wed": "बुध",
  "Thu": "गुरु",
  "Fri": "शुक्र",
  "Sat": "शनि",
  "Weekdays": "कार्यदिवस",
  "Weekends": "सप्ताहांत",
  "Movie": "फ़िल्म",
  "Podcast": "पॉडकास्ट",
  "Video": "वीडियो",
  "Other": "अन्य",
  "DEBUG": "डीबग",
  "INFO": "जानकारी",
  "WARN": "चेतावनी",
  "ERROR": "त्रुटि",
  "SUCCESS": "सफलता",
  "TRACE": "ट्रेस",
  "Librarian": "लाइब्रेरियन",
  "AI Agent": "AI एजेंट",
  "Select...": "चुनें...",
  "Trigger": "ट्रिगर करें",
  "Retry": "पुनः प्रयास करें",
  "Confirm": "पुष्टि करें",
  "Interject": "हस्तक्षेप करें",
  "ENABLED": "सक्षम",
  "DISABLED": "अक्षम",
  "Running": "चल रहा है",
};

// ===== TAMIL DICTIONARY =====
const taDict = {
  "Loading...": "ஏற்றுகிறது...",
  "Error": "பிழை",
  "Retry": "மீண்டும் முயற்சிக்கவும்",
  "Cancel": "ரத்து செய்",
  "Save": "சேமி",
  "Saving...": "சேமிக்கிறது...",
  "Close": "மூடு",
  "Back": "பின்",
  "Next": "அடுத்து",
  "Search": "தேடு",
  "Delete": "நீக்கு",
  "Edit": "திருத்து",
  "Add": "சேர்",
  "OK": "சரி",
  "Yes": "ஆம்",
  "No": "இல்லை",
  "Apply": "பயன்படுத்து",
  "Send": "அனுப்பு",
  "Done": "முடிந்தது",
  "All": "அனைத்தும்",
  "Reset": "மீட்டமை",
  "Clear": "அழி",
  "Confirm": "உறுதிப்படுத்து",
  "Submit": "சமர்ப்பி",
  "Success": "வெற்றி",
  "Warning": "எச்சரிக்கை",
  "Active": "செயலில்",
  "Inactive": "செயலற்ற",
  "Enabled": "இயக்கப்பட்டது",
  "Disabled": "முடக்கப்பட்டது",
  "Settings": "அமைப்புகள்",
  "Profile": "சுயவிவரம்",
  "Dashboard": "டாஷ்போர்டு",
  "Home": "முகப்பு",
  "Users": "பயனர்கள்",
  "Content": "உள்ளடக்கம்",
  "Title": "தலைப்பு",
  "Description": "விளக்கம்",
  "Status": "நிலை",
  "Date": "தேதி",
  "Actions": "செயல்கள்",
  "Name": "பெயர்",
  "Email": "மின்னஞ்சல்",
  "Password": "கடவுச்சொல்",
  "Refresh": "புதுப்பி",
  "Refreshing...": "புதுப்பிக்கிறது...",
  "Export": "ஏற்றுமதி",
  "Import": "இறக்குமதி",
  "Filter": "வடிகட்டி",
  "Filters": "வடிகட்டிகள்",
  "Create": "உருவாக்கு",
  "Update": "புதுப்பி",
  "Remove": "நீக்கு",
  "View": "பார்",
  "Play": "இயக்கு",
  "Pause": "இடைநிறுத்து",
  "Stop": "நிறுத்து",
  "Mute": "ஒலியடக்கு",
  "Unmute": "ஒலிநீக்கு",
  "Volume": "ஒலி அளவு",
  "Live": "நேரலை",
  "LIVE": "நேரலை",
  "Premium": "பிரீமியம்",
  "PREMIUM": "பிரீமியம்",
  "Basic": "அடிப்படை",
  "Family": "குடும்பம்",
  "Subscriptions": "சந்தாக்கள்",
  "Revenue": "வருவாய்",
  "Pending": "நிலுவையில்",
  "Approved": "அங்கீகரிக்கப்பட்டது",
  "Rejected": "நிராகரிக்கப்பட்டது",
  "Completed": "முடிந்தது",
  "Failed": "தோல்வி",
  "Processing": "செயலாக்குகிறது",
  "Processing...": "செயலாக்குகிறது...",
  "Uploading": "பதிவேற்றுகிறது",
  "Uploading...": "பதிவேற்றுகிறது...",
  "Searching...": "தேடுகிறது...",
  "Listening...": "கேட்கிறது...",
  "Recording...": "பதிவு செய்கிறது...",
  "Transcribing...": "எழுத்தாக்குகிறது...",
  "Connected": "இணைக்கப்பட்டது",
  "Disconnected": "துண்டிக்கப்பட்டது",
  "Reconnecting...": "மீண்டும் இணைக்கிறது...",
  "Order": "வரிசை",
  "Type": "வகை",
  "Size": "அளவு",
  "Duration": "கால அளவு",
  "Progress": "முன்னேற்றம்",
  "Category": "வகை",
  "Categories": "வகைகள்",
  "Channels": "சேனல்கள்",
  "Movies": "திரைப்படங்கள்",
  "Series": "தொடர்கள்",
  "Podcasts": "பாட்காஸ்ட்கள்",
  "Radio": "வானொலி",
  "Audiobooks": "ஒலிப்புத்தகங்கள்",
  "Episode": "அத்தியாயம்",
  "Episodes": "அத்தியாயங்கள்",
  "Season": "சீசன்",
  "Seasons": "சீசன்கள்",
  "Chapter": "அத்தியாயம்",
  "Chapters": "அத்தியாயங்கள்",
  "Rating": "மதிப்பீடு",
  "Genre": "வகை",
  "Director": "இயக்குநர்",
  "Cast": "நடிகர்கள்",
  "Author": "ஆசிரியர்",
  "Narrator": "விவரிப்பாளர்",
  "Published": "வெளியிடப்பட்டது",
  "Draft": "வரைவு",
  "Scheduled": "திட்டமிடப்பட்டது",
  "Subtitles": "வசன வரிகள்",
  "Off": "அணைக்கவும்",
  "None": "எதுவுமில்லை",
  "Auto": "தானியங்கி",
  "Manual": "கைமுறை",
  "Custom": "தனிப்பயன்",
  "System": "அமைப்பு",
  "General": "பொது",
  "Billing": "பில்லிங்",
  "Technical": "தொழில்நுட்ப",
  "Features": "அம்சங்கள்",
  "Support": "ஆதரவு",
  "Documentation": "ஆவணங்கள்",
  "FAQ": "FAQ",
  "Contact": "தொடர்பு",
  "Widgets": "விட்ஜெட்கள்",
  "Recordings": "பதிவுகள்",
  "Uploads": "பதிவேற்றங்கள்",
  "Favorites": "பிடித்தவை",
  "Downloads": "பதிவிறக்கங்கள்",
  "Watchlist": "கண்காணிப்பு பட்டியல்",
  "History": "வரலாறு",
  "News": "செய்திகள்",
  "Sports": "விளையாட்டு",
  "Entertainment": "பொழுதுபோக்கு",
  "Music": "இசை",
  "Kids": "குழந்தைகள்",
  "Education": "கல்வி",
  "Educational": "கல்வி",
  "Culture": "கலாச்சாரம்",
  "Weather": "வானிலை",
  "Health": "உடல்நலம்",
  "Economy": "பொருளாதாரம்",
  "Politics": "அரசியல்",
  "Technology": "தொழில்நுட்பம்",
  "Tech": "தொழில்நுட்பம்",
  "Food": "உணவு",
  "Fashion": "ஃபேஷன்",
  "Travel": "பயணம்",
  "Security": "பாதுகாப்பு",
  "Finance": "நிதி",
  "Troubleshooting": "சிக்கல் நீக்கம்",
  "Account": "கணக்கு",
  "Overview": "கண்ணோட்டம்",
  "Notifications": "அறிவிப்புகள்",
  "Privacy": "தனியுரிமை",
  "Language": "மொழி",
  "Appearance": "தோற்றம்",
  "Display": "திரை",
  "Quality": "தரம்",
  "Speed": "வேகம்",
  "Queued": "வரிசையில்",
  "Cancelled": "ரத்து செய்யப்பட்டது",
  "Skipped": "தவிர்க்கப்பட்டது",
  "Complete": "முடிந்தது",
  "Paused": "இடைநிறுத்தப்பட்டது",
  "Resume": "தொடரவும்",
  "Schedule": "அட்டவணை",
  "Time": "நேரம்",
  "Mode": "பயன்முறை",
  "Cost": "செலவு",
  "Explore": "ஆராயுங்கள்",
  "Sources": "ஆதாரங்கள்",
  "Started": "தொடங்கப்பட்டது",
  "Permissions": "அனுமதிகள்",
  "Granted": "வழங்கப்பட்டது",
  "Denied": "மறுக்கப்பட்டது",
  "Advanced": "மேம்பட்ட",
  "items": "உருப்படிகள்",
  "item": "உருப்படி",
  "Trending": "பிரபலமான",
  "Popular": "பிரபலமான",
  "Recent": "சமீபத்திய",
  "Speaking": "பேசுகிறது",
  "Ready": "தயார்",
  "Host": "ஹோஸ்ட்",
  "You": "நீங்கள்",
  "Chat": "அரட்டை",
  "Share": "பகிர்",
  "Copied!": "நகலெடுக்கப்பட்டது!",
  "Leave Party": "பார்ட்டியை விடு",
  "End Party": "பார்ட்டியை முடி",
  "Synced": "ஒத்திசைக்கப்பட்டது",
  "Syncing...": "ஒத்திசைக்கிறது...",
  "Connecting...": "இணைக்கிறது...",
  "White": "வெள்ளை",
  "Black": "கருப்பு",
  "Game Over": "ஆட்டம் முடிந்தது",
  "New Game": "புதிய ஆட்டம்",
  "Checkmate!": "செக்மேட்!",
  "Stalemate": "முட்டுக்கட்டை",
  "Draw": "சமநிலை",
  "Resign": "விலகு",
  "Join": "சேர்",
  "Challenge": "சவால்",
  "Easy": "எளிது",
  "Medium": "நடுத்தரம்",
  "Hard": "கடினம்",
  "Wins": "வெற்றிகள்",
  "Losses": "தோல்விகள்",
  "Draws": "சமநிலைகள்",
  "Friends": "நண்பர்கள்",
  "Accept": "ஏற்றுக்கொள்",
  "Reject": "நிராகரி",
  "Low": "குறைவு",
  "High": "அதிகம்",
  "Normal": "சாதாரணம்",
  "Open": "திறந்த",
  "Closed": "மூடப்பட்ட",
  "Urgent": "அவசரமான",
  "In Progress": "நடைபெறுகிறது",
  "Resolved": "தீர்க்கப்பட்டது",
  "Sunday": "ஞாயிறு",
  "Monday": "திங்கள்",
  "Tuesday": "செவ்வாய்",
  "Wednesday": "புதன்",
  "Thursday": "வியாழன்",
  "Friday": "வெள்ளி",
  "Saturday": "சனி",
  "Sun": "ஞாயி",
  "Mon": "திங்",
  "Tue": "செவ்",
  "Wed": "புத",
  "Thu": "வியா",
  "Fri": "வெள்",
  "Sat": "சனி",
  "Weekdays": "வாரநாட்கள்",
  "Weekends": "வார இறுதிகள்",
  "Movie": "திரைப்படம்",
  "Podcast": "பாட்காஸ்ட்",
  "Video": "வீடியோ",
  "Other": "மற்றவை",
  "DEBUG": "டீபக்",
  "INFO": "தகவல்",
  "WARN": "எச்சரிக்கை",
  "ERROR": "பிழை",
  "SUCCESS": "வெற்றி",
  "TRACE": "ட்ரேஸ்",
  "Librarian": "நூலகர்",
  "AI Agent": "AI முகவர்",
  "Select...": "தேர்ந்தெடு...",
  "Trigger": "தொடங்கு",
  "Interject": "இடையீடு",
  "ENABLED": "இயக்கப்பட்டது",
  "DISABLED": "முடக்கப்பட்டது",
  "Running": "இயங்குகிறது",
};

// ===== BENGALI DICTIONARY =====
const bnDict = {
  "Loading...": "লোড হচ্ছে...",
  "Error": "ত্রুটি",
  "Retry": "পুনরায় চেষ্টা করুন",
  "Cancel": "বাতিল",
  "Save": "সংরক্ষণ করুন",
  "Saving...": "সংরক্ষণ হচ্ছে...",
  "Close": "বন্ধ করুন",
  "Back": "পিছনে",
  "Next": "পরবর্তী",
  "Search": "খুঁজুন",
  "Delete": "মুছুন",
  "Edit": "সম্পাদনা করুন",
  "Add": "যোগ করুন",
  "OK": "ঠিক আছে",
  "Yes": "হ্যাঁ",
  "No": "না",
  "Apply": "প্রয়োগ করুন",
  "Send": "পাঠান",
  "Done": "সম্পন্ন",
  "All": "সব",
  "Reset": "রিসেট করুন",
  "Clear": "পরিষ্কার করুন",
  "Confirm": "নিশ্চিত করুন",
  "Submit": "জমা দিন",
  "Success": "সফল",
  "Warning": "সতর্কতা",
  "Active": "সক্রিয়",
  "Inactive": "নিষ্ক্রিয়",
  "Enabled": "সক্রিয়",
  "Disabled": "নিষ্ক্রিয়",
  "Settings": "সেটিংস",
  "Profile": "প্রোফাইল",
  "Dashboard": "ড্যাশবোর্ড",
  "Home": "হোম",
  "Users": "ব্যবহারকারী",
  "Content": "কন্টেন্ট",
  "Title": "শিরোনাম",
  "Description": "বিবরণ",
  "Status": "অবস্থা",
  "Date": "তারিখ",
  "Actions": "কার্যক্রম",
  "Name": "নাম",
  "Email": "ইমেইল",
  "Password": "পাসওয়ার্ড",
  "Refresh": "রিফ্রেশ",
  "Refreshing...": "রিফ্রেশ হচ্ছে...",
  "Export": "রপ্তানি করুন",
  "Import": "আমদানি করুন",
  "Filter": "ফিল্টার",
  "Filters": "ফিল্টার",
  "Create": "তৈরি করুন",
  "Update": "আপডেট করুন",
  "Remove": "সরান",
  "View": "দেখুন",
  "Play": "চালান",
  "Pause": "বিরতি দিন",
  "Stop": "থামুন",
  "Mute": "নিঃশব্দ করুন",
  "Unmute": "শব্দ চালু করুন",
  "Volume": "ভলিউম",
  "Live": "লাইভ",
  "LIVE": "লাইভ",
  "Premium": "প্রিমিয়াম",
  "PREMIUM": "প্রিমিয়াম",
  "Basic": "বেসিক",
  "Family": "ফ্যামিলি",
  "Subscriptions": "সাবস্ক্রিপশন",
  "Revenue": "রাজস্ব",
  "Pending": "মুলতুবি",
  "Approved": "অনুমোদিত",
  "Rejected": "প্রত্যাখ্যাত",
  "Completed": "সম্পন্ন",
  "Failed": "ব্যর্থ",
  "Processing": "প্রক্রিয়াকরণ",
  "Processing...": "প্রক্রিয়াকরণ হচ্ছে...",
  "Uploading": "আপলোড হচ্ছে",
  "Uploading...": "আপলোড হচ্ছে...",
  "Searching...": "খুঁজছে...",
  "Listening...": "শুনছে...",
  "Recording...": "রেকর্ডিং হচ্ছে...",
  "Transcribing...": "প্রতিলিপি হচ্ছে...",
  "Connected": "সংযুক্ত",
  "Disconnected": "সংযোগ বিচ্ছিন্ন",
  "Reconnecting...": "পুনরায় সংযোগ হচ্ছে...",
  "Order": "ক্রম",
  "Type": "ধরন",
  "Size": "আকার",
  "Duration": "সময়কাল",
  "Progress": "অগ্রগতি",
  "Category": "বিভাগ",
  "Categories": "বিভাগসমূহ",
  "Channels": "চ্যানেল",
  "Movies": "সিনেমা",
  "Series": "সিরিজ",
  "Podcasts": "পডকাস্ট",
  "Radio": "রেডিও",
  "Audiobooks": "অডিওবুক",
  "Episode": "পর্ব",
  "Episodes": "পর্বসমূহ",
  "Season": "সিজন",
  "Seasons": "সিজনসমূহ",
  "Chapter": "অধ্যায়",
  "Chapters": "অধ্যায়সমূহ",
  "Rating": "রেটিং",
  "Genre": "জনরা",
  "Director": "পরিচালক",
  "Cast": "কাস্ট",
  "Author": "লেখক",
  "Narrator": "বর্ণনাকারী",
  "Published": "প্রকাশিত",
  "Draft": "খসড়া",
  "Scheduled": "সময়সূচীত",
  "Subtitles": "সাবটাইটেল",
  "Off": "বন্ধ",
  "None": "কিছুই নয়",
  "Auto": "অটো",
  "Manual": "ম্যানুয়াল",
  "Custom": "কাস্টম",
  "System": "সিস্টেম",
  "General": "সাধারণ",
  "Billing": "বিলিং",
  "Technical": "প্রযুক্তিগত",
  "Features": "বৈশিষ্ট্যসমূহ",
  "Support": "সাপোর্ট",
  "Documentation": "ডকুমেন্টেশন",
  "FAQ": "FAQ",
  "Contact": "যোগাযোগ",
  "Widgets": "উইজেট",
  "Recordings": "রেকর্ডিং",
  "Uploads": "আপলোড",
  "Favorites": "প্রিয়",
  "Downloads": "ডাউনলোড",
  "Watchlist": "ওয়াচলিস্ট",
  "History": "ইতিহাস",
  "News": "সংবাদ",
  "Sports": "খেলাধুলা",
  "Entertainment": "বিনোদন",
  "Music": "সংগীত",
  "Kids": "শিশু",
  "Education": "শিক্ষা",
  "Educational": "শিক্ষামূলক",
  "Culture": "সংস্কৃতি",
  "Weather": "আবহাওয়া",
  "Health": "স্বাস্থ্য",
  "Economy": "অর্থনীতি",
  "Politics": "রাজনীতি",
  "Technology": "প্রযুক্তি",
  "Tech": "প্রযুক্তি",
  "Food": "খাবার",
  "Fashion": "ফ্যাশন",
  "Travel": "ভ্রমণ",
  "Security": "নিরাপত্তা",
  "Finance": "অর্থ",
  "Troubleshooting": "সমস্যা সমাধান",
  "Account": "অ্যাকাউন্ট",
  "Overview": "সংক্ষিপ্ত বিবরণ",
  "Notifications": "বিজ্ঞপ্তি",
  "Privacy": "গোপনীয়তা",
  "Language": "ভাষা",
  "Appearance": "চেহারা",
  "Display": "প্রদর্শন",
  "Quality": "মান",
  "Speed": "গতি",
  "Queued": "সারিতে",
  "Cancelled": "বাতিল",
  "Skipped": "এড়ানো হয়েছে",
  "Complete": "সম্পূর্ণ",
  "Paused": "বিরতি দেওয়া হয়েছে",
  "Resume": "পুনরায় শুরু করুন",
  "Schedule": "সময়সূচী",
  "Time": "সময়",
  "Mode": "মোড",
  "Cost": "খরচ",
  "Explore": "অন্বেষণ করুন",
  "Sources": "উৎস",
  "Started": "শুরু হয়েছে",
  "Permissions": "অনুমতি",
  "Granted": "প্রদান করা হয়েছে",
  "Denied": "প্রত্যাখ্যান করা হয়েছে",
  "Advanced": "উন্নত",
  "items": "আইটেম",
  "item": "আইটেম",
  "Trending": "ট্রেন্ডিং",
  "Popular": "জনপ্রিয়",
  "Recent": "সাম্প্রতিক",
  "Speaking": "বলছে",
  "Ready": "প্রস্তুত",
  "Host": "হোস্ট",
  "You": "আপনি",
  "Chat": "চ্যাট",
  "Share": "শেয়ার করুন",
  "Copied!": "কপি হয়েছে!",
  "Leave Party": "পার্টি ছেড়ে দিন",
  "End Party": "পার্টি শেষ করুন",
  "Synced": "সিঙ্ক হয়েছে",
  "Syncing...": "সিঙ্ক হচ্ছে...",
  "Connecting...": "সংযোগ হচ্ছে...",
  "White": "সাদা",
  "Black": "কালো",
  "Game Over": "খেলা শেষ",
  "New Game": "নতুন খেলা",
  "Checkmate!": "চেকমেট!",
  "Stalemate": "অচলাবস্থা",
  "Draw": "ড্র",
  "Resign": "পরাজয় স্বীকার করুন",
  "Join": "যোগ দিন",
  "Challenge": "চ্যালেঞ্জ",
  "Easy": "সহজ",
  "Medium": "মাঝারি",
  "Hard": "কঠিন",
  "Wins": "জয়",
  "Losses": "পরাজয়",
  "Draws": "ড্র",
  "Friends": "বন্ধুরা",
  "Accept": "গ্রহণ করুন",
  "Reject": "প্রত্যাখ্যান করুন",
  "Low": "কম",
  "High": "বেশি",
  "Normal": "স্বাভাবিক",
  "Open": "খোলা",
  "Closed": "বন্ধ",
  "Urgent": "জরুরি",
  "In Progress": "চলমান",
  "Resolved": "সমাধান হয়েছে",
  "Sunday": "রবিবার",
  "Monday": "সোমবার",
  "Tuesday": "মঙ্গলবার",
  "Wednesday": "বুধবার",
  "Thursday": "বৃহস্পতিবার",
  "Friday": "শুক্রবার",
  "Saturday": "শনিবার",
  "Sun": "রবি",
  "Mon": "সোম",
  "Tue": "মঙ্গল",
  "Wed": "বুধ",
  "Thu": "বৃহ",
  "Fri": "শুক্র",
  "Sat": "শনি",
  "Weekdays": "কর্মদিবস",
  "Weekends": "সপ্তাহান্ত",
  "Movie": "সিনেমা",
  "Podcast": "পডকাস্ট",
  "Video": "ভিডিও",
  "Other": "অন্যান্য",
  "DEBUG": "ডিবাগ",
  "INFO": "তথ্য",
  "WARN": "সতর্কতা",
  "ERROR": "ত্রুটি",
  "SUCCESS": "সফল",
  "TRACE": "ট্রেস",
  "Librarian": "লাইব্রেরিয়ান",
  "AI Agent": "AI এজেন্ট",
  "Select...": "নির্বাচন করুন...",
  "Trigger": "ট্রিগার করুন",
  "Interject": "হস্তক্ষেপ করুন",
  "ENABLED": "সক্রিয়",
  "DISABLED": "নিষ্ক্রিয়",
  "Running": "চলছে",
};

/**
 * Deep merge: existing takes priority, en fills structure
 * Translates leaf values using dictionary, keeps existing translations
 */
function translateValue(enVal, dict) {
  if (enVal === null || enVal === undefined) return enVal;

  // Array: translate each element
  if (Array.isArray(enVal)) {
    return enVal.map(item => {
      if (typeof item === 'string') {
        return dict[item] || translateString(item, dict);
      }
      return item;
    });
  }

  // Object: recurse
  if (typeof enVal === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(enVal)) {
      result[key] = translateValue(value, dict);
    }
    return result;
  }

  // String: translate
  if (typeof enVal === 'string') {
    return dict[enVal] || translateString(enVal, dict);
  }

  return enVal;
}

/**
 * Attempt to translate a string by matching parts against dictionary
 */
function translateString(str, dict) {
  // Direct match
  if (dict[str]) return dict[str];

  // Try matching without trailing punctuation
  const stripped = str.replace(/[.!?:]+$/, '');
  if (dict[stripped]) {
    const suffix = str.slice(stripped.length);
    return dict[stripped] + suffix;
  }

  // For very short strings or strings with special characters, return as-is
  // (like URLs, codes, emoji strings, format patterns)
  if (/^[^a-zA-Z]*$/.test(str) || /^https?:\/\//.test(str) || /^\d+$/.test(str) ||
      /^[A-Z_]+$/.test(str) || str.length <= 2 || /^[^\w\s]+$/.test(str) ||
      /^{{.*}}$/.test(str) || /^[A-Z0-9]{2,4}$/.test(str) ||
      /^\d+:\d+/.test(str) || /^YYYY/.test(str) || /^your@/.test(str) ||
      /^bayitplus:/.test(str) || /^e\.g\./.test(str) || /^https:/.test(str)) {
    return str;
  }

  // Return English as fallback - the per-section translators below will handle these
  return str;
}

/**
 * Merge existing locale with full en.json structure
 * existing translations take priority
 */
function mergeWithExisting(enObj, existingObj, dict) {
  if (enObj === null || enObj === undefined) return enObj;

  if (Array.isArray(enObj)) {
    // If existing has a translated array of same length, use it
    if (Array.isArray(existingObj) && existingObj.length === enObj.length) {
      return existingObj;
    }
    return enObj.map(item => {
      if (typeof item === 'string') {
        return dict[item] || translateString(item, dict);
      }
      return item;
    });
  }

  if (typeof enObj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(enObj)) {
      const existingVal = existingObj && typeof existingObj === 'object' ? existingObj[key] : undefined;

      if (existingVal !== undefined) {
        if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
          // Recurse into nested objects
          result[key] = mergeWithExisting(value, existingVal, dict);
        } else if (Array.isArray(value)) {
          // For arrays, use existing if same length
          if (Array.isArray(existingVal) && existingVal.length === value.length) {
            result[key] = existingVal;
          } else {
            result[key] = value.map(item => typeof item === 'string' ? (dict[item] || translateString(item, dict)) : item);
          }
        } else {
          // Leaf value - use existing if it's not English (i.e., it was translated)
          if (typeof existingVal === 'string' && typeof value === 'string' && existingVal !== value) {
            result[key] = existingVal; // existing translation
          } else {
            result[key] = dict[value] || translateString(value, dict);
          }
        }
      } else {
        // No existing translation - translate from English
        result[key] = translateValue(value, dict);
      }
    }
    return result;
  }

  // Leaf string
  if (typeof enObj === 'string') {
    if (existingObj !== undefined && typeof existingObj === 'string' && existingObj !== enObj) {
      return existingObj;
    }
    return dict[enObj] || translateString(enObj, dict);
  }

  return enObj;
}

// Generate merged locale files
console.log('Generating Hindi (hi.json)...');
const hiResult = mergeWithExisting(en, hiExisting, hiDict);
writeFileSync(join(__dirname, 'hi.json'), JSON.stringify(hiResult, null, 2) + '\n', 'utf8');
console.log('Hindi written.');

console.log('Generating Tamil (ta.json)...');
const taResult = mergeWithExisting(en, taExisting, taDict);
writeFileSync(join(__dirname, 'ta.json'), JSON.stringify(taResult, null, 2) + '\n', 'utf8');
console.log('Tamil written.');

console.log('Generating Bengali (bn.json)...');
const bnResult = mergeWithExisting(en, bnExisting, bnDict);
writeFileSync(join(__dirname, 'bn.json'), JSON.stringify(bnResult, null, 2) + '\n', 'utf8');
console.log('Bengali written.');

console.log('\nDone! Now running validation...');

// Validate key counts
function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const enKeys = flattenKeys(en);
for (const [name, result] of [['hi', hiResult], ['ta', taResult], ['bn', bnResult]]) {
  const resultKeys = flattenKeys(result);
  const missing = enKeys.filter(k => !resultKeys.includes(k));
  console.log(`\n${name}.json: ${resultKeys.length} keys (en: ${enKeys.length}, missing: ${missing.length})`);
  if (missing.length > 0) {
    console.log(`  Missing sections: ${[...new Set(missing.map(k => k.split('.')[0]))].join(', ')}`);
  }
}
