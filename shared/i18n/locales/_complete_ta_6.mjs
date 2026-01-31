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
    "uploads": {
      "mobile": {
        "dataWarningCancel": "பதிவேற்றத்தை ரத்து செய்",
        "lowMemoryWarning": "சாதன நினைவகம் குறைவாக உள்ளது. பெரிய பதிவேற்றங்கள் தோல்வியடையலாம்.",
        "batteryLowWarning": "மின்கலன் குறைவாக உள்ளது ({{percent}}%). பதிவேற்றங்கள் தடைபடலாம்.",
        "networkChanged": "நெட்வொர்க் மாறியது. மீண்டும் இணைக்கிறது...",
        "mobileBrowserNotSupported": "சில அம்சங்கள் மொபைல் உலாவிகளில் வேலை செய்யாமல் போகலாம்"
      },
      "accessibility": {
        "pageDescription": "வரிசை கண்காணிப்பு, கைமுறை பதிவேற்றங்கள் மற்றும் கோப்புறை கண்காணிப்புடன் பதிவேற்ற மேலாண்மை இடைமுகம்",
        "pageTitle": "நிர்வாக பதிவேற்றங்கள் பக்கம்",
        "sectionQueue": "வரிசை டாஷ்போர்டு பிரிவு",
        "sectionManualUpload": "கைமுறை பதிவேற்ற பிரிவு",
        "sectionMonitoredFolders": "கண்காணிக்கப்படும் கோப்புறைகள் பிரிவு",
        "loadingQueue": "பதிவேற்ற வரிசையை ஏற்றுகிறது...",
        "queueLoaded": "{{count}} உருப்படிகளுடன் பதிவேற்ற வரிசை ஏற்றப்பட்டது",
        "uploadStarted": "{{count}} கோப்புகளுக்கு பதிவேற்றம் தொடங்கியது",
        "uploadCompleted": "பதிவேற்றம் வெற்றிகரமாக முடிந்தது",
        "uploadFailed": "பதிவேற்றம் தோல்வியடைந்தது",
        "folderAdded": "{{name}} கோப்புறை கண்காணிப்புக்கு சேர்க்கப்பட்டது",
        "folderRemoved": "{{name}} கோப்புறை கண்காணிப்பிலிருந்து அகற்றப்பட்டது",
        "folderScanned": "{{name}} கோப்புறை ஸ்கேன் செய்யப்பட்டது, {{count}} கோப்புகள் கிடைத்தன"
      }
    },
    "librarian": {
      "title": "நூலகர் முகவர்",
      "subtitle": "தன்னியக்க AI-இயக்கும் உள்ளடக்க நூலக மேலாண்மை",
      "loading": "நூலகர் முகவரை ஏற்றுகிறது...",
      "loadingConfig": "உள்ளமைவை ஏற்றுகிறது...",
      "refresh": "புதுப்பி",
      "errors": {
        "configError": "உள்ளமைவு பிழை",
        "configNotLoaded": "உள்ளமைவு ஏற்றப்படவில்லை",
        "failedToLoad": "நூலகர் தரவை ஏற்ற முடியவில்லை",
        "failedToLoadConfig": "நூலகர் உள்ளமைவை ஏற்ற முடியவில்லை",
        "failedToTrigger": "தணிக்கையைத் தொடங்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
        "failedToLoadDetails": "அறிக்கை விவரங்களை ஏற்ற முடியவில்லை.",
        "failedToRollback": "செயலை மீட்டெடுக்க முடியவில்லை.",
        "auditAlreadyRunning": "தணிக்கை ஏற்கனவே இயங்குகிறது. முடிவதற்கு காத்திருங்கள் அல்லது புதிதாக தொடங்குவதற்கு முன் ரத்து செய்யுங்கள்."
      },
      "stats": {
        "systemHealth": "அமைப்பு ஆரோக்கியம்",
        "totalAudits": "மொத்த இயக்கங்கள்",
        "last30Days": "கடந்த 30 நாட்கள்",
        "issuesFixed": "சரி செய்யப்பட்ட சிக்கல்கள்",
        "lastAudit": "கடைசி தணிக்கை",
        "never": "ஒருபோதும் இல்லை",
        "unknown": "தெரியவில்லை",
        "title": "தணிக்கை கண்ணோட்டம் (30 நாட்கள்)",
        "successRate": "வெற்றி விகிதம்",
        "fixesApplied": "சரிசெய்தல்கள் பயன்படுத்தப்பட்டன",
        "budgetUsed": "பயன்படுத்தப்பட்ட பட்ஜெட்",
        "budgetLimit": "/ ${{limit}}"
      },
      "health": {
        "excellent": "சிறப்பு",
        "good": "நல்லது",
        "fair": "சராசரி",
        "poor": "மோசமானது",
        "unknown": "தெரியவில்லை"
      },
      "quickActions": {
        "title": "இயக்க உள்ளமைவு",
        "subtitle": "தணிக்கைகளை உள்ளமை மற்றும் தொடங்கு",
        "auditMode": "தணிக்கை பயன்முறை",
        "auditModeHelp": "சரிபார்க்க என்ன தேர்வு செய்யவும்",
        "dryRun": "முன்னோட்ட பயன்முறை",
        "dryRunHelp": "மாற்றங்கள் செய்யாமல் என்ன மாறும் என்பதைக் காட்டு",
        "scopeFilters": "தணிக்கை திறன்கள்",
        "triggerDaily": "தினசரி தணிக்கையை இயக்கு",
        "triggerAI": "AI முகவர் தணிக்கையை இயக்கு",
        "budgetLabel": "AI முகவர் பட்ஜெட் வரம்பு: ${{budget}}",
        "budgetPerAudit": "தணிக்கைக்கான பட்ஜெட்",
        "monthlyBudgetUsed": "பயன்படுத்தப்பட்ட பட்ஜெட் (30 நாட்கள்)"
      },
      "voice": {
        "title": "குரல் கட்டுப்பாடு",
        "description": "நூலகருக்கு கட்டளைகள் கொடுக்க உங்கள் குரலைப் பயன்படுத்துங்கள். பட்டனை அழுத்தி இயற்கையாக பேசுங்கள்.",
        "pressToSpeak": "பேச அழுத்தவும்",
        "listening": "கேட்கிறேன்...",
        "transcript": "எழுத்துப்பெயர்ப்பு",
        "processing": "உங்கள் கட்டளையை செயலாக்குகிறது..."
      },
      "schedules": {
        "title": "திட்டமிடப்பட்ட தணிக்கைகள்",
        "subtitle": "தினசரி மற்றும் வாராந்திர தணிக்கை அட்டவணைகளை உள்ளமைக்கவும்",
        "dailyTitle": "தினசரி தணிக்கை",
        "weeklyTitle": "வாராந்திர AI தணிக்கை",
        "schedule": "அட்டவணை",
        "time": "நேரம்",
        "mode": "பயன்முறை",
        "cost": "மதிப்பிடப்பட்ட செலவு",
        "status": "நிலை",
        "description": "விளக்கம்"
      },
      "reports": {
        "title": "சமீபத்திய தணிக்கை அறிக்கைகள்",
        "emptyMessage": "தணிக்கை அறிக்கைகள் இன்னும் இல்லை",
        "totalReports": "{{count}} அறிக்கை(கள்)",
        "clearAll": "அனைத்தையும் அழி",
        "confirmClearAll": "அனைத்து தணிக்கை அறிக்கைகளையும் அழிக்க விரும்புகிறீர்களா? இந்த செயலை செயல்தவிர்க்க முடியாது.",
        "viewLogs": "பதிவுகளை காண்",
        "viewDetails": "விவரங்களை காண்",
        "columns": {
          "date": "தேதி",
          "type": "வகை",
          "duration": "கால அளவு",
          "status": "நிலை",
          "issues": "சிக்கல்கள்",
          "fixes": "சரிசெய்தல்கள்",
          "actions": "செயல்கள்"
        }
      },
      "logs": {
        "title": "செயல்படுத்தல் பதிவுகள்",
        "liveAuditLog": "நேரலை தணிக்கை பதிவு",
        "executionLog": "தணிக்கை செயல்படுத்தல் பதிவு",
        "searchPlaceholder": "பதிவுகளை தேடு...",
        "noLogs": "காட்ட பதிவுகள் இல்லை",
        "noActiveAudit": "செயலில் உள்ள தணிக்கை இல்லை",
        "triggerAuditToSee": "நேரலை செயல்படுத்தல் பதிவுகளை இங்கே காண தணிக்கையைத் தொடங்குங்கள்"
      },
      "audit": {
        "types": {
          "aiAgent": "AI முகவர்",
          "dailyIncremental": "தினசரி அதிகரிப்பு"
        },
        "pause": "இடைநிறுத்து",
        "resume": "தொடர்",
        "cancel": "ரத்து செய்"
      },
      "status": {
        "enabled": "இயக்கப்பட்டது",
        "disabled": "முடக்கப்பட்டது",
        "completed": "தணிக்கை முடிந்தது",
        "failed": "தணிக்கை தோல்வியடைந்தது",
        "in_progress": "நடைபெறுகிறது",
        "running": "இயங்குகிறது"
      }
    },
    "widgets": {
      "title": "விட்ஜெட்கள்",
      "subtitle": "நேரலை ஸ்ட்ரீம்கள் மற்றும் உட்பொதிவுகளுக்கான மிதக்கும் மேலடுக்கு விட்ஜெட்களை நிர்வகிக்கவும்",
      "newWidget": "புதிய விட்ஜெட்",
      "editWidget": "விட்ஜெட்டை திருத்து",
      "columns": {
        "title": "தலைப்பு",
        "contentType": "உள்ளடக்க வகை",
        "targetRoles": "இலக்கு பங்குகள்",
        "targetPages": "இலக்கு பக்கங்கள்",
        "status": "நிலை",
        "order": "வரிசை"
      },
      "contentTypes": {
        "liveChannel": "நேரலை சேனல்",
        "live": "நேரலை",
        "vod": "தேவைக்கேற்ப வீடியோ",
        "podcast": "போட்காஸ்ட்",
        "radio": "வானொலி",
        "iframe": "ஐஃப்ரேம்"
      },
      "status": {
        "active": "செயலில்",
        "inactive": "செயலற்றது"
      },
      "form": {
        "title": "விட்ஜெட் தலைப்பு",
        "description": "விளக்கம் (விருப்பம்)",
        "contentType": "உள்ளடக்க வகை",
        "selectChannel": "நேரலை சேனலைத் தேர்ந்தெடுக்கவும்"
      },
      "confirmDelete": "இந்த விட்ஜெட்டை நீக்க விரும்புகிறீர்களா?",
      "emptyMessage": "விட்ஜெட்கள் இல்லை. தொடங்க ஒன்றை உருவாக்குங்கள்."
    },
    "billing": {
      "subtitle": "வருவாய் மற்றும் கொடுப்பனவுகளை கண்காணிக்கவும்",
      "revenue": "வருவாய்",
      "today": "இன்று",
      "thisWeek": "இந்த வாரம்",
      "thisMonth": "இந்த மாதம்",
      "thisYear": "இந்த ஆண்டு",
      "metrics": "முக்கிய அளவீடுகள்",
      "totalTransactions": "மொத்த பரிவர்த்தனைகள்",
      "avgTransaction": "சராசரி பரிவர்த்தனை",
      "pendingRefunds": "நிலுவையில் உள்ள பணத்திரும்புகள்",
      "refundRate": "பணத்திரும்பு விகிதம்"
    },
    "marketing": {
      "recentCampaigns": "சமீபத்திய பிரச்சாரங்கள்",
      "audienceSegments": "பார்வையாளர் பிரிவுகள்",
      "emailMetrics": "மின்னஞ்சல் அளவீடுகள்",
      "pushMetrics": "புஷ் அளவீடுகள்",
      "quickActions": "விரைவு செயல்கள்"
    },
    "auditLogs": {
      "subtitle": "அனைத்து அமைப்பு செயல்களையும் கண்காணிக்கவும்",
      "filter": "வடிகட்டு",
      "export": "ஏற்றுமதி",
      "all": "அனைத்தும்",
      "advancedFiltering": "மேம்பட்ட வடிகட்டுதல்",
      "actionType": "செயல் வகை",
      "clear": "அழி",
      "apply": "பயன்படுத்து",
      "noRecords": "பதிவுகள் இல்லை",
      "columns": {
        "action": "செயல்",
        "user": "பயனர்",
        "resource": "வளம்",
        "details": "விவரங்கள்",
        "date": "தேதி",
        "ip": "IP"
      }
    },
    "settings": {
      "subtitle": "அமைப்பு அளவுருக்களை உள்ளமைக்கவும்",
      "saveChanges": "மாற்றங்களை சேமி",
      "generalSettings": "பொது அமைப்புகள்",
      "supportEmail": "ஆதரவு மின்னஞ்சல்",
      "defaultPlan": "இயல்புநிலை திட்டம்",
      "userSettings": "பயனர் அமைப்புகள்",
      "maxDevices": "கணக்குக்கு அதிகபட்ச சாதனங்கள்",
      "trialDays": "சோதனை கால நாட்கள்",
      "maintenanceMode": "பராமரிப்பு பயன்முறை",
      "featureFlags": "அம்ச கொடிகள்",
      "systemActions": "அமைப்பு செயல்கள்",
      "clearCache": "கேச் அழி",
      "savingSuccess": "அமைப்புகள் வெற்றிகரமாக சேமிக்கப்பட்டன"
    }
  },
  "friends": {
    "lastGame": "கடைசி விளையாட்டு: {{time}}",
    "friendsSince": "{{date}} முதல் நண்பர்கள்",
    "incomingRequests": "வரும் கோரிக்கைகள்",
    "outgoingRequests": "வெளிச்செல்லும் கோரிக்கைகள்",
    "noIncoming": "வரும் கோரிக்கைகள் இல்லை",
    "noOutgoing": "வெளிச்செல்லும் கோரிக்கைகள் இல்லை",
    "sentAt": "{{time}} அனுப்பப்பட்டது",
    "searchPlaceholder": "பெயர் மூலம் தேடு...",
    "noResults": "வீரர்கள் கிடைக்கவில்லை",
    "noResultsDesc": "வேறு பெயருடன் தேட முயற்சிக்கவும்",
    "requestSent": "நண்பர் கோரிக்கை அனுப்பப்பட்டது!",
    "requestAccepted": "நண்பர் கோரிக்கை ஏற்றுக்கொள்ளப்பட்டது!",
    "requestRejected": "நண்பர் கோரிக்கை நிராகரிக்கப்பட்டது",
    "requestCancelled": "நண்பர் கோரிக்கை ரத்து செய்யப்பட்டது",
    "friendRemoved": "நண்பர் அகற்றப்பட்டார்",
    "searchFailed": "பயனர்களை தேட முடியவில்லை",
    "requestFailed": "கோரிக்கை அனுப்ப முடியவில்லை",
    "acceptFailed": "கோரிக்கையை ஏற்றுக்கொள்ள முடியவில்லை",
    "rejectFailed": "கோரிக்கையை நிராகரிக்க முடியவில்லை",
    "cancelFailed": "கோரிக்கையை ரத்து செய்ய முடியவில்லை",
    "removeFailed": "நண்பரை அகற்ற முடியவில்லை",
    "friendsCount": "{{count}} நண்பர்கள்",
    "gamesCount": "{{count}} விளையாட்டுகள்",
    "alreadyFriends": "நண்பர்கள்"
  },
  "olorin": {
    "errors": {
      "capability_disabled": "'{capability}' திறன் தற்போது முடக்கப்பட்டுள்ளது",
      "capability_not_enabled": "இந்த பங்காளிக்கு '{capability}' திறன் இயக்கப்படவில்லை",
      "source_language_not_supported": "'{language}' மூல மொழி ஆதரிக்கப்படவில்லை. ஆதரிக்கப்படுபவை: {supported}",
      "target_language_not_supported": "'{language}' இலக்கு மொழி ஆதரிக்கப்படவில்லை. ஆதரிக்கப்படுபவை: {supported}",
      "partner_not_found": "பங்காளி கிடைக்கவில்லை",
      "partner_registration_failed": "பங்காளியை பதிவு செய்ய முடியவில்லை",
      "no_updates_provided": "புதுப்பிப்புகள் வழங்கப்படவில்லை",
      "webhook_config_failed": "வெப்ஹூக்கை உள்ளமைக்க முடியவில்லை",
      "webhook_url_not_configured": "வெப்ஹூக் URL உள்ளமைக்கப்படவில்லை",
      "webhook_secret_not_configured": "வெப்ஹூக் ரகசியம் உள்ளமைக்கப்படவில்லை",
      "search_failed": "தேடல் தோல்வியடைந்தது",
      "indexing_failed": "குறியீட்டு தோல்வியடைந்தது",
      "detection_failed": "கண்டறிதல் தோல்வியடைந்தது",
      "explanation_failed": "விளக்கத்தை பெற முடியவில்லை",
      "reference_not_found": "'{reference_id}' குறிப்பு கிடைக்கவில்லை",
      "enrichment_failed": "செறிவூட்டல் தோல்வியடைந்தது",
      "get_references_failed": "குறிப்புகளை பெற முடியவில்லை",
      "create_session_failed": "அமர்வை உருவாக்க முடியவில்லை",
      "add_transcript_failed": "எழுத்துப்பெயர்ப்பை சேர்க்க முடியவில்லை",
      "generate_recap_failed": "சுருக்கத்தை உருவாக்க முடியவில்லை"
    }
  },
  "chess": {
    "sendingInvite": "{{name}} க்கு விளையாட்டு அழைப்பை அனுப்புகிறது...",
    "inviteSent": "{{name}} க்கு விளையாட்டு அழைப்பு அனுப்பப்பட்டது! விளையாட்டு குறியீடு: {{code}}",
    "inviteFailed": "அந்த பயனரை கண்டுபிடிக்க முடியவில்லை. பெயரை சரிபார்த்து மீண்டும் முயற்சிக்கவும்.",
    "inviteReceived": "{{name}} உங்களை சதுரங்க விளையாட்டிற்கு அழைத்தார்!",
    "joinInvite": "விளையாட்டில் சேர்",
    "challenge": "சவால்",
    "playedAsWhite": "வெள்ளையாக விளையாடினார்",
    "playedAsBlack": "கருப்பாக விளையாடினார்",
    "gameMode": "விளையாட்டு பயன்முறை",
    "playVsFriend": "நண்பருக்கு எதிராக விளையாடு",
    "playVsBot": "போட்டிற்கு எதிராக விளையாடு",
    "difficulty": "கடினம்",
    "easy": "எளிது",
    "medium": "நடுத்தரம்",
    "hard": "கடினம்",
    "chessBot": "சதுரங்க போட்"
  },
  "stats": {
    "moves": "நகர்வுகள்",
    "won": "வென்றது",
    "lost": "தோற்றது",
    "draw": "டிரா",
    "overall": "ஒட்டுமொத்த பதிவு",
    "yourWins": "உங்கள் வெற்றிகள்",
    "theirWins": "அவர்களின் வெற்றிகள்",
    "totalGamesPlayed": "மொத்தம்: {{count}} விளையாட்டுகள்",
    "recentGames": "சமீபத்திய விளையாட்டுகள்",
    "currentRating": "தற்போதைய மதிப்பீடு"
  },
  "passkey": {
    "unknownDevice": "தெரியாத சாதனம்",
    "created": "உருவாக்கப்பட்டது",
    "lastUsed": "கடைசியாக பயன்படுத்தியது",
    "never": "ஒருபோதும் இல்லை",
    "addPasskey": "பாஸ்கீ சேர்",
    "deleteConfirmTitle": "பாஸ்கீயை நீக்கவா?",
    "deleteConfirmText": "இந்த பாஸ்கீ இனி உள்ளடக்கத்தை திறக்க முடியாது. பின்னர் மீண்டும் சேர்க்கலாம்.",
    "unlockDescription": "தனிப்பட்ட திரைப்படங்கள் மற்றும் தொடர்களை அணுக உங்கள் பாஸ்கீயைப் பயன்படுத்துங்கள்",
    "auth": {
      "title": "உள்ளடக்கத்தை திறக்கவும்",
      "description": "தனிப்பட்ட திரைப்படங்கள் மற்றும் தொடர்களை திறக்க உங்கள் கைரேகை, முகம் அல்லது சாதன PIN பயன்படுத்துங்கள்.",
      "unlock": "பாஸ்கீயுடன் திறக்கவும்",
      "authenticating": "அங்கீகரிக்கிறது...",
      "success": "உள்ளடக்கம் திறக்கப்பட்டது!",
      "cancelled": "அங்கீகாரம் ரத்து செய்யப்பட்டது",
      "error": "அங்கீகாரம் தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும்."
    }
  },
  "trivia": {
    "settings": {
      "frequencyHint": "விவர காட்சி அதிர்வெண்ணை மாற்று",
      "category": "வகை",
      "selectCategory": "இந்த வகையை தேர்ந்தெடுக்க தட்டவும்",
      "deselectCategory": "இந்த வகையை நீக்க தட்டவும்",
      "displayDuration": "காட்சி கால அளவு",
      "durationHint": "விவரம் எவ்வளவு நேரம் காட்டப்படும் என்பதை மாற்று",
      "seconds": "நொடிகள்"
    },
    "categories": {
      "cast": "நடிகர்கள்",
      "production": "தயாரிப்பு",
      "location": "இடம்",
      "cultural": "கலாச்சாரம்",
      "historical": "வரலாற்று"
    },
    "frequency": {
      "off": "அணை",
      "low": "குறைவு",
      "normal": "சாதாரண",
      "high": "அதிக"
    },
    "errors": {
      "loadFailed": "விவரத்தை ஏற்ற முடியவில்லை",
      "saveFailed": "விவர விருப்பங்களை சேமிக்க முடியவில்லை"
    }
  },
  "cities": {
    "jerusalem": {
      "noContent": "தற்போது உள்ளடக்கம் இல்லை",
      "errorLoading": "ஜெருசலேம் உள்ளடக்கத்தை ஏற்ற முடியவில்லை",
      "sources": "ஆதாரங்கள்",
      "categories": {
        "history": "🏛️ வரலாற்று இடங்கள்",
        "religion": "🕍 மத பாரம்பரியம்",
        "culture": "🎭 கலாச்சார நிகழ்வுகள்",
        "events": "📅 உள்ளூர் நிகழ்வுகள்",
        "food": "🍴 சமையல் சிறப்புகள்",
        "markets": "🛍️ பாரம்பரிய சந்தைகள்",
        "arts": "🎨 கலை & கேலரிகள்"
      }
    },
    "telAviv": {
      "noContent": "தற்போது உள்ளடக்கம் இல்லை",
      "errorLoading": "டெல் அவிவ் உள்ளடக்கத்தை ஏற்ற முடியவில்லை",
      "sources": "ஆதாரங்கள்",
      "categories": {
        "beaches": "🏖️ கடற்கரைகள் & நீர்முகப்பு",
        "nightlife": "🌃 இரவு வாழ்க்கை & பொழுதுபோக்கு",
        "culture": "🎭 கலாச்சார நிகழ்வுகள்",
        "music": "🎵 இசை & கச்சேரிகள்",
        "food": "🍴 உணவகங்கள் & உணவு காட்சி",
        "tech": "💻 தொழில்நுட்பம் & புதுமை",
        "events": "📅 உள்ளூர் நிகழ்வுகள்"
      }
    }
  },
  "catchup": {
    "overlay": {
      "creditContext": "இது உங்கள் {{balance}} கிரெடிட்களில் {{cost}} பயன்படுத்தும்",
      "lowBalanceWarning": "கிரெடிட்கள் குறைவாக உள்ளன",
      "declineButton": "வேண்டாம்"
    },
    "summary": {
      "windowInfo": "கடைசி {{minutes}} நிமிடங்கள்",
      "creditsUsed": "{{count}} கிரெடிட்கள் பயன்படுத்தப்பட்டன",
      "creditsRemaining": "{{count}} கிரெடிட்கள் மீதமுள்ளன",
      "close": "மூடு"
    },
    "error": {
      "failed": "சுருக்கத்தை உருவாக்க முடியவில்லை",
      "retry": "மீண்டும் முயற்சிக்கவும்",
      "insufficientCredits": "போதுமான கிரெடிட்கள் இல்லை"
    }
  },
  "channelChat": {
    "participants_one": "{{count}} பார்வையாளர்",
    "participants_other": "{{count}} பார்வையாளர்கள்",
    "showOriginal": "அசலை காட்டு",
    "showTranslation": "மொழிபெயர்",
    "userJoined": "{{name}} அரட்டையில் சேர்ந்தார்",
    "userLeft": "ஒரு பயனர் அரட்டையை விட்டு வெளியேறினார்",
    "translationBeta": "மொழிபெயர்ப்பு (பீட்டா)"
  },
  "widgets": {
    "live": {
      "description": "நேரலை சேனல் விட்ஜெட்"
    }
  },
  "podcasts": {
    "admin": {
      "totalPodcasts": "மொத்த போட்காஸ்ட்கள்",
      "totalEpisodes": "மொத்த எபிசோட்கள்"
    }
  },
  "taxonomy": {
    "subcategories": {
      "learning-hebrew": "எபிரேயம் கற்றல்",
      "young-science": "இளம் அறிவியல்",
      "math-fun": "வேடிக்கையான கணிதம்",
      "nature-animals": "இயற்கை & விலங்குகள்",
      "interactive": "ஊடாடும்",
      "hebrew-songs": "எபிரேய பாடல்கள்"
    }
  }
};

deepMerge(ta, translations);
fs.writeFileSync('ta.json', JSON.stringify(ta, null, 2) + '\n');
console.log('Part 6: Remaining Tamil translations added for all missing sections');
