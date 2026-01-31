import fs from 'fs';

const ta = JSON.parse(fs.readFileSync('ta.json', 'utf8'));

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
  "admin": {
    "brand": {
      "title": "Bayit+ நிர்வாகம்",
      "subtitle": "அமைப்பு மேலாண்மை"
    },
    "backToApp": "பயன்பாட்டிற்கு திரும்பு",
    "refunds": {
      "subtitle": "பணத்திரும்ப கோரிக்கைகளை நிர்வகிக்க",
      "approveModal": {
        "title": "ஒப்புதல் உறுதிப்படுத்தல்",
        "message": "{{amount}} பணத்திரும்பை அனுமதிக்கவா?"
      },
      "confirmApprove": "{{amount}} பணத்திரும்பை அனுமதிக்கவா?",
      "confirmDelete": "பணத்திரும்ப கோரிக்கையை நீக்கவா?",
      "rejectModal": {
        "title": "பணத்திரும்ப கோரிக்கையை நிராகரி",
        "message": "{{amount}} பணத்திரும்பை நிராகரிக்கிறது",
        "reasonLabel": "நிராகரிப்பு காரணம்",
        "reasonPlaceholder": "நிராகரிப்பு காரணத்தை உள்ளிடவும்...",
        "submitButton": "கோரிக்கையை நிராகரி"
      },
      "status": {
        "pending": "நிலுவையில்",
        "approved": "அனுமதிக்கப்பட்டது",
        "rejected": "நிராகரிக்கப்பட்டது"
      },
      "columns": {
        "id": "அடையாளம்",
        "user": "பயனர்",
        "amount": "தொகை",
        "reason": "காரணம்",
        "status": "நிலை",
        "requestDate": "கோரிக்கை தேதி"
      },
      "stats": {
        "pendingTitle": "ஒப்புதல் நிலுவை",
        "approvedTitle": "அனுமதிக்கப்பட்டவை",
        "rejectedTitle": "நிராகரிக்கப்பட்டவை",
        "totalRefunded": "மொத்த பணத்திரும்பு"
      },
      "emptyMessage": "பணத்திரும்ப கோரிக்கைகள் இல்லை",
      "errors": {
        "rejectReasonRequired": "நிராகரிப்பு காரணத்தை உள்ளிடவும்"
      },
      "title": "பணத்திரும்புகள்"
    },
    "plans": {
      "title": "திட்ட மேலாண்மை",
      "subtitle": "சந்தா திட்டங்களை உள்ளமை மற்றும் நிர்வகி",
      "createButton": "புதிய திட்டம்",
      "inactive": "செயலற்றது",
      "subscribersLabel": "சந்தாதாரர்கள்:",
      "intervals": {
        "monthly": "மாதம்",
        "yearly": "ஆண்டு"
      },
      "trialDays": "{{days}} நாள் சோதனை",
      "modal": {
        "editTitle": "திட்டத்தை திருத்து",
        "createTitle": "புதிய திட்டம்"
      },
      "form": {
        "nameEn": "பெயர் (ஆங்கிலம்)",
        "nameHe": "பெயர் (எபிரேயம்)",
        "price": "விலை ($)",
        "interval": "கட்டண காலம்",
        "trialDays": "சோதனை நாட்கள்",
        "features": "அம்சங்கள் (வரிக்கு ஒன்று)",
        "active": "செயலில் உள்ள திட்டம்"
      },
      "errors": {
        "requiredFields": "பெயர் மற்றும் விலை தேவை"
      },
      "confirmDelete": "\"{{name}}\" திட்டத்தை நீக்கவா?"
    },
    "emailCampaigns": {
      "subtitle": "மின்னஞ்சல் பிரச்சாரங்களை உருவாக்கி நிர்வகிக்க",
      "createButton": "புதிய பிரச்சாரம்",
      "searchPlaceholder": "பிரச்சாரத்தை தேடு...",
      "emptyMessage": "பிரச்சாரங்கள் இல்லை",
      "status": {
        "draft": "வரைவு",
        "active": "செயலில்",
        "scheduled": "திட்டமிடப்பட்டது",
        "completed": "நிறைவடைந்தது"
      },
      "columns": {
        "name": "பிரச்சார பெயர்",
        "status": "நிலை",
        "sent": "அனுப்பப்பட்டது",
        "opened": "திறக்கப்பட்டது",
        "clicked": "கிளிக் செய்யப்பட்டது",
        "created": "உருவாக்கப்பட்டது",
        "actions": "செயல்கள்"
      },
      "editModal": {
        "title": "பிரச்சாரத்தை திருத்து"
      },
      "sendTestEmail": "சோதனை அனுப்பு",
      "confirmSend": "\"{{name}}\" பிரச்சாரத்தை அனுப்பவா?",
      "confirmDelete": "\"{{name}}\" பிரச்சாரத்தை நீக்கவா?",
      "testEmailSent": "சோதனை மின்னஞ்சல் அனுப்பப்பட்டது!",
      "createModal": {
        "title": "புதிய மின்னஞ்சல் பிரச்சாரம்"
      },
      "form": {
        "name": "பிரச்சார பெயர்",
        "namePlaceholder": "எ.கா., ஆண்டு இறுதி விற்பனை",
        "subject": "மின்னஞ்சல் தலைப்பு",
        "subjectPlaceholder": "பெறுநர்களுக்கு காட்டப்படும் தலைப்பு",
        "body": "உள்ளடக்கம்",
        "bodyPlaceholder": "மின்னஞ்சல் உள்ளடக்கம்...",
        "submitButton": "பிரச்சாரத்தை உருவாக்கு",
        "requiredFields": "பெயர் மற்றும் தலைப்பு தேவை"
      },
      "testModal": {
        "title": "சோதனை மின்னஞ்சல் அனுப்பு",
        "emailLabel": "மின்னஞ்சல் முகவரி",
        "emailPlaceholder": "test@example.com",
        "submitButton": "சோதனை அனுப்பு"
      },
      "errors": {
        "requiredFields": "பெயர் மற்றும் தலைப்பு தேவை"
      }
    },
    "campaignEdit": {
      "subtitle": "பிரச்சார விவரங்கள் மற்றும் அமைப்புகளை திருத்து"
    },
    "dashboard": {
      "subtitle": "அமைப்பு கண்ணோட்டம்",
      "refresh": "புதுப்பி",
      "timeAgo": {
        "minutes": "{{count}} நிமிடங்களுக்கு முன்",
        "hours": "{{count}} மணி நேரத்திற்கு முன்"
      },
      "title": "டாஷ்போர்டு",
      "users": "பயனர்கள்",
      "revenue": "வருவாய்",
      "subscriptions": "சந்தாக்கள்",
      "recentActivity": "சமீபத்திய செயல்பாடு",
      "quickActions": "விரைவு செயல்கள்"
    },
    "common": {
      "all": "அனைத்தும்",
      "cancel": "ரத்து செய்",
      "save": "சேமி",
      "active": "செயலில்",
      "back": "பின்",
      "backToPodcasts": "போட்காஸ்ட்களுக்கு திரும்பு",
      "savePodcast": "போட்காஸ்டை சேமி",
      "saveEpisode": "எபிசோடை சேமி",
      "filterAction": "செயல்",
      "filterResource": "வளம்",
      "filterUser": "பயனர்",
      "filterDateRange": "தேதி வரம்பு"
    },
    "stats": {
      "totalUsers": "மொத்த பயனர்கள்",
      "activeUsers": "செயலில் உள்ள பயனர்கள்",
      "newToday": "இன்று புதியவை",
      "newThisWeek": "இந்த வாரம் புதியவை",
      "totalRevenue": "மொத்த வருவாய்",
      "revenueToday": "இன்றைய வருவாய்",
      "revenueMonth": "இந்த மாத வருவாய்",
      "arpu": "சராசரி பயனர் வருவாய்",
      "activeSubscriptions": "செயலில் உள்ள சந்தாக்கள்",
      "churnRate": "இழப்பு விகிதம்"
    },
    "actions": {
      "new": "புதிய",
      "addUser": "பயனர் சேர்",
      "newCampaign": "புதிய பிரச்சாரம்",
      "sendEmail": "மின்னஞ்சல் அனுப்பு",
      "viewReports": "அறிக்கைகளை காண்",
      "newPodcast": "புதிய போட்காஸ்ட் உருவாக்கு",
      "newEpisode": "புதிய எபிசோட் உருவாக்கு"
    },
    "auditActions": {
      "user_created": "பயனர் உருவாக்கப்பட்டது",
      "user_updated": "பயனர் புதுப்பிக்கப்பட்டது",
      "user_deleted": "பயனர் நீக்கப்பட்டது",
      "user_role_changed": "பயனர் பங்கு மாற்றப்பட்டது",
      "campaign_created": "பிரச்சாரம் உருவாக்கப்பட்டது",
      "campaign_updated": "பிரச்சாரம் புதுப்பிக்கப்பட்டது",
      "campaign_deleted": "பிரச்சாரம் நீக்கப்பட்டது",
      "campaign_activated": "பிரச்சாரம் செயல்படுத்தப்பட்டது",
      "subscription_created": "சந்தா உருவாக்கப்பட்டது",
      "subscription_updated": "சந்தா புதுப்பிக்கப்பட்டது",
      "subscription_canceled": "சந்தா ரத்து செய்யப்பட்டது",
      "subscription_deleted": "சந்தா நீக்கப்பட்டது",
      "refund_processed": "பணத்திரும்பு செயலாக்கப்பட்டது",
      "payment_received": "பணம் பெறப்பட்டது",
      "settings_updated": "அமைப்புகள் புதுப்பிக்கப்பட்டன",
      "login": "உள்நுழைவு",
      "logout": "வெளியேறு",
      "content_created": "உள்ளடக்கம் உருவாக்கப்பட்டது",
      "content_updated": "உள்ளடக்கம் புதுப்பிக்கப்பட்டது",
      "content_deleted": "உள்ளடக்கம் நீக்கப்பட்டது",
      "content_published": "உள்ளடக்கம் வெளியிடப்பட்டது",
      "content_unpublished": "உள்ளடக்கம் வெளியிடப்படவில்லை",
      "category_created": "வகை உருவாக்கப்பட்டது",
      "category_updated": "வகை புதுப்பிக்கப்பட்டது",
      "category_deleted": "வகை நீக்கப்பட்டது",
      "live_channel_created": "நேரலை சேனல் உருவாக்கப்பட்டது",
      "live_channel_updated": "நேரலை சேனல் புதுப்பிக்கப்பட்டது",
      "live_channel_deleted": "நேரலை சேனல் நீக்கப்பட்டது",
      "radio_station_created": "வானொலி நிலையம் உருவாக்கப்பட்டது",
      "radio_station_updated": "வானொலி நிலையம் புதுப்பிக்கப்பட்டது",
      "radio_station_deleted": "வானொலி நிலையம் நீக்கப்பட்டது",
      "podcast_created": "போட்காஸ்ட் உருவாக்கப்பட்டது",
      "podcast_updated": "போட்காஸ்ட் புதுப்பிக்கப்பட்டது",
      "podcast_deleted": "போட்காஸ்ட் நீக்கப்பட்டது",
      "podcast_episode_created": "போட்காஸ்ட் எபிசோட் உருவாக்கப்பட்டது",
      "podcast_episode_updated": "போட்காஸ்ட் எபிசோட் புதுப்பிக்கப்பட்டது",
      "podcast_episode_deleted": "போட்காஸ்ட் எபிசோட் நீக்கப்பட்டது",
      "content_imported": "உள்ளடக்கம் இறக்குமதி செய்யப்பட்டது",
      "widget_created": "விட்ஜெட் உருவாக்கப்பட்டது",
      "widget_updated": "விட்ஜெட் புதுப்பிக்கப்பட்டது",
      "widget_deleted": "விட்ஜெட் நீக்கப்பட்டது",
      "widget_published": "விட்ஜெட் வெளியிடப்பட்டது",
      "widget_unpublished": "விட்ஜெட் வெளியிடப்படவில்லை"
    },
    "placeholder": {
      "userId": "பயனர் அடையாளத்தை உள்ளிடவும்",
      "discount": "0"
    },
    "titles": {
      "users": "பயனர்கள்",
      "transactions": "பரிவர்த்தனைகள்",
      "subscriptions": "சந்தாக்கள்",
      "refunds": "பணத்திரும்புகள்",
      "plans": "திட்டங்கள்",
      "campaigns": "பிரச்சாரங்கள்",
      "auditLogs": "தணிக்கை பதிவுகள்",
      "pushNotifications": "புஷ் அறிவிப்புகள்",
      "billing": "கட்டணம்",
      "marketing": "சந்தைப்படுத்தல்",
      "content": "உள்ளடக்க நூலகம்",
      "categories": "வகைகள்",
      "liveChannels": "நேரலை சேனல்கள்",
      "librarian": "நூலகர் முகவர்",
      "radioStations": "வானொலி நிலையங்கள்",
      "podcasts": "போட்காஸ்ட்கள்",
      "settings": "அமைப்புகள்"
    },
    "nav": {
      "dashboard": "டாஷ்போர்டு",
      "users": "பயனர்கள்",
      "campaigns": "பிரச்சாரங்கள்",
      "billing": "கட்டணம்",
      "billingOverview": "கண்ணோட்டம்",
      "transactions": "பரிவர்த்தனைகள்",
      "refunds": "பணத்திரும்புகள்",
      "subscriptions": "சந்தாக்கள்",
      "subscriptionsList": "சந்தாதாரர்கள்",
      "plans": "திட்டங்கள்",
      "marketing": "சந்தைப்படுத்தல்",
      "marketingDashboard": "கண்ணோட்டம்",
      "emailCampaigns": "மின்னஞ்சல் பிரச்சாரங்கள்",
      "pushNotifications": "புஷ் அறிவிப்புகள்",
      "content": "உள்ளடக்கம்",
      "contentLibrary": "உள்ளடக்க நூலகம்",
      "categories": "வகைகள்",
      "liveChannels": "நேரலை சேனல்கள்",
      "radioStations": "வானொலி நிலையங்கள்",
      "podcasts": "போட்காஸ்ட்கள்",
      "widgets": "விட்ஜெட்கள்",
      "recordings": "பதிவுகள்",
      "uploads": "பதிவேற்றங்கள்",
      "settings": "அமைப்புகள்",
      "auditLogs": "தணிக்கை பதிவுகள்",
      "librarian": "நூலகர் முகவர்",
      "liveQuotas": "நேரலை ஒதுக்கீடுகள்",
      "featured": "சிறப்பு",
      "translations": "மொழிபெயர்ப்புகள்"
    },
    "liveQuotas": {
      "title": "நேரலை அம்ச ஒதுக்கீடு மேலாண்மை",
      "analytics": "நேரலை அம்சங்கள் பயன்பாட்டு பகுப்பாய்வு",
      "currentUsage": "தற்போதைய பயன்பாடு",
      "quotaLimits": "ஒதுக்கீடு வரம்புகள்",
      "confirmReset": "இந்த பயனருக்கான அனைத்து பயன்பாட்டு எண்ணிக்கைகளை மீட்டமைக்கவா?",
      "subtitlesHour": "வசனங்கள் (மணி)",
      "subtitlesDay": "வசனங்கள் (நாள்)",
      "subtitlesMonth": "வசனங்கள் (மாதம்)",
      "dubbingHour": "டப்பிங் (மணி)",
      "dubbingDay": "டப்பிங் (நாள்)",
      "dubbingMonth": "டப்பிங் (மாதம்)",
      "estimatedCost": "மதிப்பிடப்பட்ட செலவு (இந்த மாதம்)",
      "subtitleLimits": "வசன வரம்புகள்",
      "dubbingLimits": "டப்பிங் வரம்புகள்",
      "perHour": "மணிக்கு (நிமிடம்)",
      "perDay": "நாளுக்கு (நிமிடம்)",
      "perMonth": "மாதத்திற்கு (நிமிடம்)",
      "notes": "நிர்வாக குறிப்புகள்",
      "notesPlaceholder": "வரம்புகளை நீட்டிக்க காரணம்...",
      "editLimits": "வரம்புகளை திருத்து",
      "resetCounters": "அனைத்து பயன்பாட்டு எண்ணிக்கைகளை மீட்டமை",
      "totalUsers": "ஒதுக்கீடுகள் உள்ள மொத்த பயனர்கள்",
      "activeSessions": "செயலில் உள்ள அமர்வுகள்",
      "subtitlesToday": "வசன நிமிடங்கள் (இன்று)",
      "dubbingToday": "டப்பிங் நிமிடங்கள் (இன்று)",
      "costToday": "செலவு (இன்று)",
      "costMonth": "செலவு (இந்த மாதம்)",
      "last7Days": "கடந்த 7 நாட்கள்",
      "last30Days": "கடந்த 30 நாட்கள்",
      "totalSessions": "மொத்த அமர்வுகள்",
      "totalMinutes": "மொத்த நிமிடங்கள்",
      "totalCost": "மொத்த செலவு",
      "topUsers": "சிறந்த பயனர்கள் (கடந்த 30 நாட்கள்)",
      "user": "பயனர்",
      "subtitles": "வசனங்கள்",
      "dubbing": "டப்பிங்",
      "cost": "செலவு",
      "noData": "பயன்பாட்டு தரவு இல்லை"
    },
    "featured": {
      "title": "சிறப்பு உள்ளடக்கம்",
      "subtitle": "உருப்படிகளை இழுத்து கரூசல் வரிசையை நிர்வகிக்கவும்",
      "empty": "சிறப்பு உள்ளடக்கம் இல்லை",
      "emptyHint": "உள்ளடக்க நூலகத்தில் இருந்து சிறப்பிற்கு சேர்க்கவும்",
      "count": "{{count}} உருப்படிகள்",
      "confirmUnfeature": "சிறப்பில் இருந்து அகற்றவா?",
      "remove": "அகற்று",
      "unsavedChanges": "சேமிக்கப்படாத மாற்றங்கள் உள்ளன",
      "addContent": "உள்ளடக்கம் சேர்",
      "addContentToSection": "{{section}} க்கு உள்ளடக்கம் சேர்",
      "selectContentToAdd": "சேர்க்க உள்ளடக்கத்தை தேர்ந்தெடுக்கவும்",
      "addSelected": "தேர்ந்தெடுத்ததை சேர் ({{count}})",
      "noContentAvailable": "உள்ளடக்கம் இல்லை",
      "contentAdded": "{{count}} உருப்படிகள் சேர்க்கப்பட்டன",
      "failedToAdd": "உள்ளடக்கத்தை சேர்க்க முடியவில்லை",
      "publishedOnly": "வெளியிடப்பட்டவை மட்டும்",
      "saveButton": "சேமி ({{count}})"
    },
    "content": {
      "title": "உள்ளடக்க நூலகம்",
      "subtitle": "திரைப்படங்கள், தொடர்கள் மற்றும் வீடியோ உள்ளடக்கத்தை நிர்வகிக்க",
      "importFree": "இலவச உள்ளடக்கத்தை இறக்குமதி செய்",
      "searchPlaceholder": "உள்ளடக்கத்தை தேடு...",
      "emptyMessage": "உள்ளடக்கம் கிடைக்கவில்லை",
      "confirmDelete": "இந்த உள்ளடக்கத்தை நீக்கவா?",
      "confirmDeleteSingle": "இந்த உள்ளடக்கத்தை நீக்க விரும்புகிறீர்களா? இந்த செயலை செயல்தவிர்க்க முடியாது.",
      "confirmBatchDelete": "{{count}} உருப்படி(களை) நீக்க விரும்புகிறீர்களா? இந்த செயலை செயல்தவிர்க்க முடியாது.",
      "batchDeleteSuccess": "{{count}} உருப்படி(கள்) வெற்றிகரமாக நீக்கப்பட்டன",
      "batchDeletePartial": "{{success}} உருப்படி(கள்) நீக்கப்பட்டன, ஆனால் {{failed}} உருப்படி(கள்) தோல்வியடைந்தன",
      "selectedItems": "{{count}} உருப்படி(கள்) தேர்ந்தெடுக்கப்பட்டன",
      "batchFeature": "சிறப்பு",
      "batchUnfeature": "சிறப்பை நீக்கு"
    },
    "categories": {
      "subtitle": "உள்ளடக்க வகைகளை நிர்வகிக்க",
      "emptyMessage": "வகைகள் இல்லை",
      "status": {
        "active": "செயலில்",
        "inactive": "செயலற்றது"
      },
      "form": {
        "nameHebrew": "வகை பெயர் (எபிரேயம்)",
        "nameEnglish": "வகை பெயர் (ஆங்கிலம்)",
        "slug": "ஸ்லக்"
      }
    },
    "recordings": {
      "title": "பதிவுகள் மேலாண்மை",
      "subtitle": "தளம் முழுவதும் பயனர் பதிவுகளை நிர்வகிக்க",
      "totalRecordings": "மொத்த பதிவுகள்",
      "totalStorage": "மொத்த சேமிப்பகம்",
      "totalUsers": "பதிவுகள் உள்ள பயனர்கள்",
      "activeSessions": "செயலில் உள்ள அமர்வுகள்",
      "searchPlaceholder": "தலைப்பு, பயனர் அல்லது சேனல் மூலம் தேடு...",
      "user": "பயனர்",
      "confirmDelete": "'{{title}}' பதிவை நீக்கவா? இந்த செயலை செயல்தவிர்க்க முடியாது.",
      "deleteRecording": "பதிவை நீக்கு",
      "deleteSuccess": "பதிவு வெற்றிகரமாக நீக்கப்பட்டது",
      "deleteFailed": "பதிவை நீக்க முடியவில்லை",
      "loadFailed": "பதிவுகளை ஏற்ற முடியவில்லை",
      "noRecordings": "பதிவுகள் இல்லை",
      "noRecordingsHint": "அமைப்பில் பயனர் பதிவுகள் இன்னும் இல்லை."
    }
  },
  "widgets": {
    "live": {
      "title": "நேரலை விட்ஜெட்கள்"
    }
  },
  "podcasts": {
    "admin": {
      "stats": "போட்காஸ்ட் புள்ளிவிவரங்கள்"
    }
  },
  "children": {
    "admin": {
      "stats": "குழந்தைகள் உள்ளடக்க மேலாளர்",
      "seedContent": "உள்ளடக்கம் விதைக்க",
      "importArchive": "Archive.org இறக்குமதி",
      "syncPodcasts": "போட்காஸ்ட்களை ஒத்திசை",
      "syncYouTube": "YouTube ஒத்திசை",
      "tagVod": "VOD குறியிடு",
      "pendingModeration": "நிலுவையில் உள்ள மதிப்பாய்வு"
    }
  },
  "chess": {
    "title": "சதுரங்கம்",
    "welcome": "சதுரங்கத்திற்கு வரவேற்கிறோம்",
    "subtitle": "உலகம் முழுவதும் உள்ள நண்பர்கள் மற்றும் குடும்பத்தினருடன் சதுரங்கம் விளையாடுங்கள்",
    "createGame": "புதிய விளையாட்டு உருவாக்கு",
    "joinGame": "விளையாட்டில் சேர்",
    "gameCode": "விளையாட்டு குறியீடு",
    "enterGameCode": "விளையாட்டு குறியீட்டை உள்ளிடவும்",
    "invalidGameCode": "தவறான விளையாட்டு குறியீடு. 6 எழுத்துக்கள் இருக்க வேண்டும்.",
    "joinFailed": "விளையாட்டில் சேர முடியவில்லை",
    "join": "சேர்",
    "create": "உருவாக்கு",
    "chooseColor": "உங்கள் நிறத்தை தேர்ந்தெடுக்கவும்",
    "white": "வெள்ளை",
    "black": "கருப்பு",
    "chatPlaceholder": "செய்தி தட்டச்சு செய்யவும்... (ஆலோசனைக்கு @bot)",
    "botHint": "AI உதவியாளரிடம் சதுரங்க ஆலோசனை பெற @bot குறிப்பிடவும்",
    "bot": "சதுரங்க உதவியாளர்",
    "mute": "ஒலியடக்கு",
    "unmute": "ஒலி இயக்கு",
    "speaking": "பங்கேற்பாளர்கள்",
    "resign": "விட்டுக்கொடு",
    "offerDraw": "டிரா வழங்கு",
    "newGame": "புதிய விளையாட்டு",
    "checkmate": "செக்மேட்!",
    "stalemate": "ஸ்டேல்மேட்",
    "draw": "டிரா",
    "resigned": "விளையாட்டு விட்டுக்கொடுக்கப்பட்டது",
    "reconnecting": "மீண்டும் இணைக்கிறது...",
    "moveHistory": "நகர்வு வரலாறு",
    "noMoves": "நகர்வுகள் இன்னும் இல்லை",
    "showHints": "வழிகாட்டி குறிப்புகளை காட்டு",
    "yourTurn": "உங்கள் முறை",
    "opponentTurn": "எதிராளியின் முறை",
    "waitingForOpponent": "எதிராளிக்காக காத்திருக்கிறது...",
    "gameOver": "விளையாட்டு முடிந்தது"
  },
  "friends": {
    "title": "நண்பர்கள் & எதிராளிகள்",
    "subtitle": "வீரர்களுடன் இணைந்து நண்பர்களை சவால் செய்யுங்கள்",
    "myFriends": "என் நண்பர்கள்",
    "requests": "கோரிக்கைகள்",
    "findPlayers": "வீரர்களை கண்டறியவும்",
    "friendsLabel": "நண்பர்கள்",
    "pendingLabel": "நிலுவையில்",
    "add": "நண்பரைச் சேர்",
    "remove": "அகற்று",
    "accept": "ஏற்றுக்கொள்",
    "reject": "நிராகரி",
    "cancel": "ரத்து செய்",
    "noFriends": "இன்னும் நண்பர்கள் இல்லை",
    "noFriendsDesc": "வீரர்களை தேடி நண்பர் கோரிக்கைகளை அனுப்புங்கள்"
  },
  "stats": {
    "statistics": "புள்ளிவிவரங்கள்",
    "matchHistory": "போட்டி வரலாறு",
    "headToHead": "நேருக்கு நேர்",
    "gamesPlayed": "விளையாடிய விளையாட்டுகள்",
    "wins": "வெற்றிகள்",
    "losses": "தோல்விகள்",
    "draws": "டிரா",
    "winRate": "வெற்றி விகிதம்",
    "rating": "மதிப்பீடு",
    "peakRating": "உச்ச மதிப்பீடு",
    "peak": "உச்சம்",
    "winStreak": "வெற்றி தொடர்",
    "currentStreak": "தற்போதைய தொடர்",
    "bestStreak": "சிறந்த தொடர்",
    "performance": "செயல்திறன்",
    "achievements": "சாதனைகள்",
    "totalGames": "மொத்த விளையாட்டுகள்",
    "noGames": "இன்னும் விளையாட்டுகள் விளையாடவில்லை"
  },
  "jerusalem": {
    "title": "ஜெருசலேம் இணைப்பு",
    "subtitle": "இஸ்ரேலின் இதயத்துடன் இணைந்திருங்கள்",
    "noContent": "ஜெருசலேம் உள்ளடக்கம் இல்லை",
    "sources": "ஆதாரங்கள்",
    "kotelLive": "மேற்குச் சுவர் நேரலை",
    "categories": {
      "kotel": "மேற்குச் சுவர்",
      "idf-ceremony": "IDF விழாக்கள்",
      "diaspora-connection": "புலம்பெயர்ந்தோர் இணைப்பு",
      "holy-sites": "புனித இடங்கள்",
      "jerusalem-events": "ஜெருசலேம் நிகழ்வுகள்",
      "general": "ஜெருசலேம்"
    }
  },
  "telAviv": {
    "title": "டெல் அவிவ் இணைப்பு",
    "subtitle": "ஒருபோதும் நிற்காத நகரம்",
    "noContent": "டெல் அவிவ் உள்ளடக்கம் இல்லை",
    "sources": "ஆதாரங்கள்",
    "beachLive": "கடற்கரை வெப்கேம்",
    "categories": {
      "beaches": "கடற்கரைகள்",
      "nightlife": "இரவு வாழ்க்கை",
      "culture": "கலாச்சாரம் & கலை",
      "music": "இசை காட்சி",
      "food": "உணவு & உணவகங்கள்",
      "tech": "தொழில்நுட்பம் & ஸ்டார்ட்அப்கள்",
      "events": "நிகழ்வுகள்",
      "general": "டெல் அவிவ்"
    }
  },
  "taxonomy": {
    "sections": {
      "movies": "திரைப்படங்கள்",
      "series": "தொடர்கள்",
      "kids": "குழந்தைகள்",
      "youngsters": "இளைஞர்கள்",
      "music": "இசை",
      "documentaries": "ஆவணப்படங்கள்",
      "podcasts": "போட்காஸ்ட்கள்",
      "live": "நேரலை டிவி",
      "audiobooks": "ஆடியோபுக்கள்"
    }
  },
  "passkey": {
    "manager": {
      "title": "பாஸ்கீகள்",
      "subtitle": "பாதுகாப்பான உள்ளடக்க அணுகலுக்கு உங்கள் பாஸ்கீகளை நிர்வகிக்கவும்"
    },
    "unsupported": "இந்த சாதனத்தில் பாஸ்கீகள் ஆதரிக்கப்படவில்லை",
    "fetchError": "பாஸ்கீகளை ஏற்ற முடியவில்லை",
    "registerError": "பாஸ்கீயை பதிவு செய்ய முடியவில்லை",
    "deleteError": "பாஸ்கீயை நீக்க முடியவில்லை",
    "cancelled": "பாஸ்கீ செயல்பாடு ரத்து செய்யப்பட்டது",
    "noPasskeys": "இன்னும் பாஸ்கீகள் பதிவு செய்யப்படவில்லை. தனிப்பட்ட உள்ளடக்கத்தை திறக்க ஒன்றைச் சேர்க்கவும்.",
    "unlock": "திறக்கவும்",
    "unlockContent": "தனிப்பட்ட உள்ளடக்கத்தை திறக்கவும்"
  },
  "olorin": {
    "errors": {
      "session_not_found": "அமர்வு கிடைக்கவில்லை",
      "session_different_partner": "அமர்வு வேறு பங்காளிக்கு சொந்தமானது",
      "session_invalid_status": "அமர்வு {status} நிலையில் உள்ளது, டிரான்ஸ்கிரிப்ட் சேர்க்க முடியாது",
      "max_sessions_reached": "அதிகபட்ச ஒரே நேர அமர்வுகள் ({limit}) அடைந்துவிட்டன",
      "invalid_api_key": "தவறான API விசை",
      "missing_api_key": "{header} தலைப்பு இல்லை"
    }
  },
  "trivia": {
    "didYouKnow": "உங்களுக்குத் தெரியுமா?",
    "dismissHint": "இந்த விவர உண்மையை நிராகரிக்க தட்டவும்",
    "settings": {
      "title": "விவரங்கள் & வேடிக்கை உண்மைகள்",
      "enabled": "விவரங்களைக் காட்டு",
      "enabledDescription": "பிளேபேக் போது சுவாரஸ்யமான உண்மைகளைக் காட்டு",
      "frequency": "அதிர்வெண்",
      "categories": "வகைகள்"
    }
  },
  "cities": {
    "jerusalem": {
      "title": "ஜெருசலேம்",
      "subtitle": "நித்திய நகரத்தை கண்டறியுங்கள்",
      "loadingContent": "ஜெருசலேம் உள்ளடக்கத்தை ஏற்றுகிறது..."
    },
    "telAviv": {
      "title": "டெல் அவிவ்",
      "subtitle": "துடிப்பான நகரத்தை அனுபவியுங்கள்",
      "loadingContent": "டெல் அவிவ் உள்ளடக்கத்தை ஏற்றுகிறது..."
    }
  },
  "catchup": {
    "overlay": {
      "title": "இப்போதுதான் சேர்ந்தீர்களா?",
      "description": "{{programName}} நடுவில் சேர்ந்தீர்கள்",
      "acceptButton": "என்னை புதுப்பி ({{cost}} கிரெடிட்கள்)"
    },
    "button": {
      "credits": "புதுப்பி ({{cost}} கிரெடிட்கள்)",
      "label": "புதுப்பிப்பு சுருக்கம்",
      "title": "புதுப்பி"
    },
    "generating": "சுருக்கத்தை உருவாக்குகிறது...",
    "summary": {
      "title": "நீங்கள் தவறவிட்டது",
      "keyPoints": "முக்கிய புள்ளிகள்"
    }
  },
  "quota": {
    "subtitleExceeded": "வசன ஒதுக்கீடு மீறப்பட்டது. பின்னர் முயற்சிக்கவும்.",
    "dubbingExceeded": "டப்பிங் ஒதுக்கீடு மீறப்பட்டது. பின்னர் முயற்சிக்கவும்."
  },
  "channelChat": {
    "title": "நேரலை அரட்டை",
    "error": "அரட்டையுடன் இணைக்க முடியவில்லை",
    "retry": "மீண்டும் இணைக்கவும்",
    "participants": "{{count}} பார்வையாளர்கள்",
    "placeholder": "செய்தி அனுப்பு...",
    "send": "அனுப்பு"
  }
};

deepMerge(ta, translations);
fs.writeFileSync('ta.json', JSON.stringify(ta, null, 2) + '\n');
console.log('Part 5: Tamil translations added for admin (110 keys) and remaining sections');
