import fs from 'fs';
const it = JSON.parse(fs.readFileSync('it.json', 'utf8'));

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
  "common": {
    "confirmDelete": "Conferma eliminazione",
    "partialSuccess": "Successo parziale",
    "dismiss": "Ignora",
    "refresh": "Aggiorna",
    "refreshing": "Aggiornamento...",
    "refreshData": "Aggiorna dati",
    "dismissError": "Ignora errore",
    "closeHint": "Chiude la schermata corrente",
    "cancelHint": "Annulla l'azione corrente",
    "loadingArticle": "Caricamento articolo...",
    "watch": "Guarda",
    "share": "Condividi",
    "noContent": "Nessun contenuto disponibile",
    "premium": "PREMIUM",
    "poweredBy": "Powered by"
  },
  "tvLogin": {
    "invalidQR": "Codice QR non valido. Scansiona nuovamente dalla TV."
  },
  "googleLogin": {
    "redirecting": "Reindirizzamento alla pagina di accesso..."
  },
  "register": {
    "placeholders": {
      "fullName": "Mario Rossi",
      "email": "tua@email.com",
      "password": "Almeno 8 caratteri",
      "confirmPassword": "Reinserisci la password"
    }
  },
  "nav": {
    "support": "Supporto",
    "privacy": "Informativa sulla Privacy"
  },
  "epg": {
    "storageEstimate": "Stima spazio",
    "availableSpace": "Spazio disponibile",
    "lowStorage": "Avviso spazio ridotto",
    "lowStorageMessage": "Lo spazio di archiviazione sta per esaurirsi. Considera di eliminare le vecchie registrazioni.",
    "scheduleRecording": "Programma registrazione",
    "scheduledRecordingNotSupported": "Le registrazioni programmate non sono ancora supportate. Sono disponibili solo le registrazioni immediate.",
    "recordingFailed": "Impossibile avviare/programmare la registrazione",
    "smartSearchPlaceholder": "es. Mostrami tutti i programmi con l'attrice Tali Sharon stasera",
    "premiumRequiredMessage": "La Ricerca Intelligente utilizza l'IA per comprendere le tue domande. Passa a Premium per accedere a questa funzione.",
    "exampleQuery1": "Mostrami tutti i programmi con l'attrice Tali Sharon stasera",
    "exampleQuery2": "Quali commedie vanno in onda questa settimana?",
    "exampleQuery3": "Trova documentari sulla storia su Canale 11",
    "exampleQuery4": "Mostrami tutti i telegiornali domani mattina",
    "noProgramsScheduled": "Nessun programma in palinsesto",
    "noProgramsFound": "Nessun programma trovato",
    "noDataAvailable": "Dati guida TV non disponibili",
    "live": "LIVE"
  },
  "home": {
    "podcasts": "Podcast",
    "audiobooks": "Audiolibri",
    "israelis_in_city": "Israeliani a {{city}}, {{state}}",
    "israeli_businesses": "Attivit\u00e0 israeliane a {{city}}, {{state}}",
    "israeli_businesses_nearby": "Attivit\u00e0 israeliane vicino a te - Da {{city}}",
    "searching_businesses": "Ricerca attivit\u00e0 israeliane a {{city}}...",
    "no_businesses_found": "Nessuna attivit\u00e0 israeliana trovata a {{city}}",
    "businesses_load_error": "Impossibile caricare l'elenco delle attivit\u00e0. Riprova."
  },
  "search": {
    "loadingMore": "Caricamento altri risultati...",
    "viewMode": {
      "grid": "Griglia",
      "list": "Lista",
      "cards": "Schede"
    }
  },
  "auth": {
    "login": "Accedi"
  },
  "flows": {
    "tv": {
      "useCompanion": "Per la personalizzazione completa, usa l'app Bayit+ sul telefono o visita bayit.plus dal computer."
    }
  },
  "profile": {
    "title": "Il mio profilo",
    "profileDetails": "Dettagli profilo",
    "name": "Nome",
    "notSet": "Non impostato",
    "email": "Email",
    "editProfile": "Modifica profilo",
    "notificationSettings": "Impostazioni notifiche",
    "security": "Sicurezza",
    "changePassword": "Cambia password",
    "updatePassword": "Aggiorna la tua password",
    "connectedDevices": "Dispositivi connessi",
    "manageDevices": "Gestisci i dispositivi connessi al tuo account",
    "twoFactorAuth": "Autenticazione a due fattori",
    "addExtraSecurity": "Aggiungi un livello extra di sicurezza",
    "address": {
      "line1": "Via Roma 123",
      "line2": "Tel Aviv, Israele 6100000"
    },
    "free": "Gratuito",
    "premiumPrice": "7,99\u20ac/mese",
    "familyPrice": "12,99\u20ac/mese",
    "remaining": "rimanenti",
    "tabs": {
      "personal": "Personale",
      "overview": "Panoramica",
      "subscription": "Abbonamento",
      "notifications": "Notifiche",
      "security": "Sicurezza",
      "ai": "IA e Voce",
      "voice": "Voce e Accessibilit\u00e0"
    },
    "subscription": {
      "currentPlan": "Piano attuale",
      "renewsOn": "Si rinnova il",
      "manageSubscription": "Gestisci abbonamento",
      "cancelSubscription": "Annulla abbonamento",
      "noActivePlan": "Nessun abbonamento attivo",
      "selectPlan": "Seleziona un piano"
    },
    "notifications": "Notifiche",
    "ai": {
      "title": "IA e Personalizzazione",
      "description": "Configura le funzionalit\u00e0 basate sull'IA",
      "assistant": "Assistente IA",
      "assistantDesc": "Raccomandazioni e assistenza personalizzate",
      "chatbot": "Assistente IA",
      "chatbotEnabled": "Abilita Assistente IA",
      "chatbotEnabledDesc": "Ricevi aiuto nella navigazione dei contenuti",
      "saveHistory": "Salva cronologia conversazioni",
      "saveHistoryDesc": "Ricorda le conversazioni precedenti",
      "recommendations": "Raccomandazioni",
      "personalizedRecs": "Raccomandazioni personalizzate",
      "personalizedRecsDesc": "Suggerimenti basati sulla cronologia",
      "privacy": "Privacy e Dati",
      "privacyDesc": "I tuoi dati sono crittografati e al sicuro",
      "dataConsent": "Analisi utilizzo",
      "dataConsentDesc": "Aiuta a migliorare le funzionalit\u00e0 IA",
      "privacyNote": "I tuoi dati sono crittografati e al sicuro"
    },
    "voice": {
      "title": "Controllo vocale",
      "description": "Navigazione a mani libere",
      "enabled": "Comandi vocali",
      "enabledDesc": "Controlla l'app con la voce",
      "tts": "Sintesi vocale",
      "ttsDesc": "Risposte IA lette ad alta voce",
      "wakeWord": "Parola di attivazione",
      "wakeWordDesc": "Di' \"Bayit\" per attivare",
      "operationMode": "Modalit\u00e0 operativa",
      "operationModeDesc": "Scegli come interagire con l'app",
      "voiceSearch": "Ricerca vocale",
      "voiceSearchEnabled": "Abilita ricerca vocale",
      "voiceSearchEnabledDesc": "Cerca contenuti usando la voce",
      "constantListening": "Modalit\u00e0 ascolto continuo",
      "constantListeningDesc": "Ascolta continuamente i comandi vocali senza premere un pulsante",
      "constantListeningPrivacy": "L'audio viene inviato ai server solo quando viene rilevato il parlato",
      "holdButtonMode": "Tieni premuto per parlare",
      "holdButtonModeDesc": "Tieni premuto il pulsante del microfono invece dell'ascolto continuo",
      "sensitivity": "Sensibilit\u00e0 rilevamento vocale",
      "sensitivityDesc": "Regola la reattivit\u00e0 del rilevamento vocale",
      "sensitivityLow": "Bassa (meno falsi positivi)",
      "sensitivityMedium": "Media (bilanciata)",
      "sensitivityHigh": "Alta (pi\u00f9 reattiva)",
      "silenceThreshold": "Rilevamento silenzio",
      "silenceThresholdDesc": "Tempo di attesa dopo aver parlato prima dell'elaborazione",
      "language": "Lingua vocale",
      "accessibility": "Accessibilit\u00e0",
      "autoSubtitle": "Attiva sottotitoli automaticamente",
      "autoSubtitleDesc": "Mostra automaticamente i sottotitoli durante la riproduzione",
      "highContrast": "Modalit\u00e0 alto contrasto",
      "highContrastDesc": "Aumenta il contrasto per una migliore visibilit\u00e0",
      "textSize": "Dimensione testo",
      "textSizeSmall": "Piccolo",
      "textSizeMedium": "Medio",
      "textSizeLarge": "Grande",
      "voiceOnlyInfo": "Modalit\u00e0 solo voce",
      "voiceOnlyDetails": "Di' \"Ciao Bayit\" per attivare. Telecomando disabilitato. Naviga interamente con i comandi vocali.",
      "hybridInfo": "Modalit\u00e0 ibrida",
      "hybridDetails": "Usa voce o telecomando. Feedback vocale sulle azioni non vocali.",
      "classicInfo": "Modalit\u00e0 classica",
      "classicDetails": "Tutte le funzioni vocali disabilitate. Solo telecomando.",
      "textToSpeech": "Risposte vocali",
      "ttsEnabled": "Abilita risposte vocali",
      "ttsEnabledDesc": "L'app parler\u00e0 in risposta ai tuoi comandi vocali",
      "ttsVolume": "Volume voce",
      "ttsSpeed": "Velocit\u00e0 parlato",
      "hybridFeedback": "Feedback interattivo",
      "voiceFeedback": "Feedback vocale sulle azioni",
      "voiceFeedbackDesc": "Ricevi conferma vocale quando usi il telecomando o clicchi i pulsanti",
      "feedbackExample": "Esempio: Clicca un film \u2192 L'app dice \"Riproduzione [Nome Film]\"",
      "state": {
        "idle": "Pronto",
        "listening": "In ascolto...",
        "processing": "Elaborazione...",
        "speaking": "Sta parlando",
        "error": "Errore"
      },
      "avatar": {
        "title": "Visualizzazione Avatar",
        "description": "Scegli come appare il mago Olorin durante le interazioni vocali",
        "currentMode": "Modalit\u00e0 attuale",
        "modes": {
          "full": "Schermo intero",
          "compact": "Compatto",
          "minimal": "Minimale",
          "iconOnly": "Solo icona"
        },
        "descriptions": {
          "full": "Mago completo con animazioni, trascrizione e interazione vocale completa",
          "compact": "Pannello circolare fluttuante del mago con animazioni",
          "minimal": "Barra forma d'onda con solo indicatore di stato",
          "iconOnly": "Nascosto - visibile solo il pulsante microfono"
        },
        "features": {
          "wizard": "Personaggio mago",
          "animations": "Gesti animati",
          "waveform": "Forma d'onda audio",
          "transcript": "Trascrizione in tempo reale"
        },
        "closePanel": "Chiudi pannello vocale",
        "closePanelHint": "Tocca per chiudere il pannello di interazione vocale",
        "audioVisualization": "Visualizzazione audio",
        "compactMode": "Mago vocale compatto",
        "wizardAvatar": "Avatar mago",
        "wizardCharacter": "Personaggio mago Olorin",
        "fullMode": "Mago vocale a schermo intero",
        "wizardInteraction": "Interazione vocale con il mago",
        "openVoice": "Apri assistente vocale",
        "openVoiceHint": "Attiva interazione vocale con il mago Olorin",
        "wizardHat": "Icona cappello da mago"
      },
      "gesture": {
        "browsing": "Mago che sfoglia",
        "cheering": "Mago che esulta",
        "clapping": "Mago che applaude",
        "conjuring": "Mago che evoca magia",
        "crying": "Mago che piange",
        "shrugging": "Mago che scrolla le spalle",
        "facepalm": "Mago facepalm"
      },
      "settings": {
        "title": "Impostazioni vocali",
        "close": "Chiudi",
        "voiceFeatures": "Funzionalit\u00e0 vocali",
        "enableCommands": "Abilita comandi vocali",
        "enableCommandsDesc": "Attiva ricerca e comandi vocali",
        "voiceLanguage": "Lingua vocale",
        "wakeWordDetection": "Rilevamento parola di attivazione",
        "sensitivityLabel": "Sensibilit\u00e0",
        "sensitivityHint": "Pi\u00f9 alta = pi\u00f9 reattiva, potrebbe causare pi\u00f9 falsi positivi",
        "currentSensitivity": "Sensibilit\u00e0 attuale: {{value}}%",
        "avatarDisplay": "Visualizzazione avatar",
        "voiceResponse": "Risposta vocale",
        "audioResponses": "Risposte audio",
        "audioResponsesDesc": "Rispondi con la voce invece del testo",
        "privacy": "Privacy e cronologia",
        "recordHistory": "Registra cronologia comandi",
        "recordHistoryDesc": "Salva i comandi vocali per accesso rapido",
        "historyHelp": "La cronologia aiuta a migliorare la precisione del riconoscimento vocale",
        "permissions": "Autorizzazioni",
        "microphone": "Microfono",
        "granted": "Concessa",
        "denied": "Negata",
        "microphoneRequired": "L'accesso al microfono \u00e8 richiesto per i comandi vocali",
        "supportedCommands": "Comandi supportati",
        "advanced": "Avanzate",
        "clearHistory": "Cancella cronologia comandi",
        "resetSettings": "Ripristina tutte le impostazioni",
        "clearHistoryConfirm": "Cancella cronologia comandi",
        "clearHistoryMessage": "Sei sicuro di voler eliminare tutta la cronologia dei comandi vocali?",
        "resetConfirm": "Ripristina impostazioni",
        "resetMessage": "Ripristinare le impostazioni vocali ai valori predefiniti?",
        "historyCleared": "Cronologia comandi cancellata",
        "success": "Successo"
      },
      "errors": {
        "microphoneAccess": "Accesso al microfono negato",
        "networkError": "Errore di connessione di rete",
        "processingFailed": "Impossibile elaborare l'input vocale",
        "intentClassification": "Comando non compreso",
        "timeout": "Riconoscimento vocale scaduto"
      }
    },
    "devices": {
      "minutesAgo_one": "1 minuto fa",
      "minutesAgo_other": "{{count}} minuti fa",
      "hoursAgo_one": "1 ora fa",
      "hoursAgo_other": "{{count}} ore fa",
      "daysAgo_one": "1 giorno fa",
      "daysAgo_other": "{{count}} giorni fa",
      "disconnectDevice": "Disconnetti dispositivo"
    },
    "dropdown": {
      "myProfile": "Il mio profilo",
      "subscription": "Abbonamento",
      "favorites": "Preferiti",
      "downloads": "Download",
      "signOut": "Esci"
    },
    "guest": "Ospite",
    "morningRitual": "Rituale mattutino",
    "watchlist": "Lista",
    "favorites": "Preferiti",
    "downloads": "Download",
    "settings": "Impostazioni",
    "language": "Lingua",
    "admin": "Admin",
    "watchTime": "Tempo di visione",
    "minutes": "minuti",
    "hours": "ore",
    "logout": "Esci",
    "premium": "Premium",
    "basic": "Base",
    "upgrade": "Passa a Premium",
    "memberSince": "Membro dal",
    "aiAssistant": "Assistente IA",
    "voiceSettings": "Voce",
    "subscriptionButton": "Abbonamento",
    "recentActivity": "Attivit\u00e0 recente",
    "justNow": "Proprio ora",
    "hoursAgo": "{{hours}} ore fa",
    "yesterday": "Ieri",
    "noRecentActivity": "Nessuna attivit\u00e0 recente",
    "accountInfo": "Informazioni account",
    "role": "Ruolo",
    "accountSecurity": "Sicurezza account",
    "securityNote": "Il tuo account \u00e8 protetto con autenticazione crittografata",
    "lastLogin": "Ultimo accesso",
    "dangerZone": "Zona pericolosa",
    "invalidImageType": "Seleziona un file immagine valido (JPEG, PNG, WebP o GIF)",
    "imageTooLarge": "L'immagine \u00e8 troppo grande. La dimensione massima \u00e8 5MB.",
    "uploadSuccess": "Avatar aggiornato con successo!",
    "uploadFailed": "Impossibile caricare l'avatar. Riprova."
  },
  "voiceMode": {
    "voiceOnly": "Solo voce",
    "voiceOnlyDesc": "Nessun telecomando - navigazione vocale completa",
    "hybrid": "Ibrido",
    "hybridDesc": "Voce + Telecomando - feedback vocale sulle azioni",
    "classic": "Classico",
    "classicDesc": "Nessuna voce - solo telecomando"
  },
  "settings": {
    "display": "Schermo",
    "homePageSections": "Sezioni Home Page",
    "configureSections": "Configura quali sezioni appaiono nella tua home page",
    "visibleSections": "Sezioni visibili",
    "hiddenSections": "Sezioni nascoste",
    "dragToReorder": "Trascina per riordinare",
    "tapToHide": "Tocca per nascondere",
    "tapToShow": "Tocca per mostrare",
    "resetToDefault": "Ripristina predefiniti",
    "resetConfirmMessage": "Sei sicuro di voler ripristinare le sezioni della home page alla configurazione predefinita?",
    "sectionHidden": "Sezione nascosta",
    "sectionShown": "Sezione mostrata"
  },
  "help": {
    "subtitle": "Come possiamo aiutarti?",
    "email": "Supporto email",
    "phone": "Supporto telefonico",
    "chat": "Chat dal vivo",
    "chatAvailable": "Disponibile 24/7",
    "openTooltip": "Apri suggerimento aiuto",
    "openHelp": "Apri menu aiuto",
    "howTo": "Come usare",
    "relatedArticles": "Articoli correlati",
    "stillNeedHelp": "Hai ancora bisogno di aiuto?",
    "contactSupport": "Contatta il supporto",
    "previous": "Precedente",
    "next": "Successivo",
    "getStarted": "Inizia",
    "skipTutorial": "Salta tutorial",
    "actions": {
      "search": "Cerca aiuto",
      "docs": "Documentazione",
      "faq": "FAQ",
      "support": "Contatta supporto",
      "tutorial": "Vedi tutorial"
    },
    "search": {
      "placeholder": "Cerca aiuto...",
      "noResults": "Nessun risultato trovato per \"{{query}}\"",
      "noResultsHint": "Prova parole chiave diverse o sfoglia le categorie",
      "recent": "Recenti",
      "popular": "Popolari"
    },
    "categories": {
      "getting-started": "Per iniziare",
      "features": "Funzionalit\u00e0",
      "judaism": "Ebraismo",
      "platform-guides": "Guide piattaforma",
      "account": "Account",
      "troubleshooting": "Risoluzione problemi",
      "parents": "Per i genitori",
      "admin": "Guida Admin",
      "developer": "API sviluppatori"
    },
    "faq": {
      "title": "Domande frequenti",
      "q1": "Come cambio il mio piano di abbonamento?",
      "a1": "Vai su Impostazioni > Abbonamento per visualizzare e cambiare il tuo piano attuale. Puoi fare upgrade o downgrade in qualsiasi momento.",
      "q2": "Come scarico contenuti per la visione offline?",
      "a2": "Tocca l'icona download su qualsiasi contenuto per salvarlo per la visione offline. I download sono disponibili solo su dispositivi mobili.",
      "q3": "Perch\u00e9 il mio video non si riproduce?",
      "a3": "Controlla la tua connessione internet. Se il problema persiste, prova a cancellare la cache dell'app o a riavviare l'app.",
      "q4": "Come annullo il mio abbonamento?",
      "a4": "Puoi annullare il tuo abbonamento in qualsiasi momento tramite Impostazioni > Abbonamento > Annulla piano. Continuerai ad avere accesso fino alla fine del periodo di fatturazione."
    },
    "onboarding": {
      "welcome": {
        "title": "Benvenuto su Bayit+",
        "description": "La tua casa per l'intrattenimento israeliano, ovunque nel mondo"
      },
      "liveTv": {
        "title": "TV in diretta",
        "description": "Guarda i canali israeliani in diretta, inclusi notizie, sport e intrattenimento"
      },
      "vod": {
        "title": "Contenuti on-demand",
        "description": "Sfoglia film, serie e documentari in qualsiasi momento"
      },
      "voice": {
        "title": "Controllo vocale",
        "description": "Di' \"Bayit\" per controllare l'app con la voce"
      },
      "profiles": {
        "title": "Profili familiari",
        "description": "Crea profili per ogni membro della famiglia con raccomandazioni personalizzate"
      }
    }
  },
  "voice": {
    "listening": "In ascolto...",
    "speaking": "Sta parlando",
    "ready": "Pronto",
    "tapToSpeak": "Tocca per parlare",
    "processing": "Elaborazione...",
    "transcribing": "Trascrizione...",
    "tapToStop": "Tocca per fermare la registrazione",
    "pleaseWait": "Attendere prego...",
    "transcriptionNotAvailable": "Trascrizione non disponibile",
    "transcriptionFailed": "Trascrizione fallita",
    "micPermissionDenied": "Permesso microfono negato",
    "error": "Non ho capito, riprova"
  },
  "errors": {
    "api": {
      "networkTimeout": "Impossibile connettersi ai nostri server. Controlla la tua connessione.",
      "offlineMessage": "Sei offline. Controlla la tua connessione internet.",
      "requestFailed": "Qualcosa \u00e8 andato storto. Riprova."
    },
    "widget": {
      "loadFailed": "Impossibile caricare il widget. Riprova."
    }
  },
  "player": {
    "live": "LIVE",
    "play": "Riproduci",
    "pause": "Pausa",
    "mute": "Muto",
    "unmute": "Attiva audio",
    "volume": "Volume",
    "albumArt": "Copertina album per {{title}}",
    "seekBar": "Avanzamento riproduzione",
    "skipBack": "Indietro di {{seconds}} secondi",
    "skipForward": "Avanti di 30 secondi",
    "chapters": "Capitoli",
    "sceneSearch": {
      "title": "Cerca scene",
      "placeholder": "Cerca una scena...",
      "inputLabel": "Input ricerca scene",
      "searching": "Ricerca in corso...",
      "noResults": "Nessuna scena trovata",
      "resultsFound": "Trovate {{count}} scene",
      "searchError": "Ricerca fallita. Riprova.",
      "hint": "Digita almeno 2 caratteri per cercare",
      "voiceReceived": "Ricerca per: {{query}}",
      "seekingTo": "Vai a {{time}}",
      "previous": "Precedente",
      "next": "Successivo",
      "result": {
        "jumpTo": "Vai a {{title}} alle {{time}}",
        "hint": "Premi per andare a questa scena"
      },
      "panelOpened": "Pannello ricerca scene aperto",
      "navigation": "Navigazione ricerca scene",
      "position": "Risultato {{current}} di {{total}}"
    }
  },
  "empty": {
    "noContent": "Nessun contenuto disponibile",
    "tryAnotherCategory": "Prova a selezionare un'altra categoria",
    "noPodcasts": "Nessun podcast disponibile",
    "tryLater": "Riprova pi\u00f9 tardi",
    "noResults": "Nessun risultato trovato"
  },
  "audiobooks": {
    "audiobook": "Audiolibro",
    "chapter": "Capitolo",
    "chapters": "Capitoli",
    "playChapter": "Riproduci capitolo",
    "noChapters": "Nessun capitolo disponibile",
    "notFound": "Audiolibro non trovato",
    "author": "Autore",
    "narrator": "Narratore",
    "duration": "Durata",
    "isbn": "ISBN"
  },
  "breadcrumbs": {
    "series": "Serie",
    "movie": "Film",
    "watching": "In visione",
    "channel": "Canale",
    "station": "Stazione",
    "podcast": "Podcast",
    "watchlist": "Lista",
    "downloads": "Download"
  },
  "podcast": {
    "selectLanguage": "Seleziona lingua",
    "switchToLanguage": "Passa a {{language}}",
    "premiumRequiredForTranslation": "Abbonamento Premium richiesto per la traduzione dei podcast",
    "player": {
      "switchingLanguage": "Cambio in corso..."
    },
    "languages": {
      "he": {
        "short": "EB",
        "full": "Ebraico"
      },
      "en": {
        "short": "EN",
        "full": "Inglese"
      },
      "es": {
        "short": "ES",
        "full": "Spagnolo"
      }
    }
  },
  "watchlist": {
    "watched": "guardati"
  },
  "widgets": {
    "empty": "Nessun widget",
    "emptyHint": "I tuoi widget appariranno qui",
    "emptyPersonal": "Nessun widget personale",
    "emptyPersonalHint": "Crea il tuo primo widget personale o aggiungi widget di sistema sopra",
    "itemsTotal": "widget totali",
    "systemWidgets": "Widget di sistema",
    "systemWidgetsHint": "Sfoglia e aggiungi widget alla tua collezione",
    "myWidgets": "I miei widget personali",
    "myWidgetsHint": "Widget che hai creato",
    "personalWidgets": "I miei widget",
    "noSystemWidgets": "Nessun widget di sistema disponibile",
    "added": "Aggiunto",
    "add": "Aggiungi",
    "remove": "Rimuovi",
    "show": "Mostra",
    "hidden": "Nascosto",
    "addToCollection": "Aggiungi ai miei widget",
    "removeFromCollection": "Rimuovi dai miei widget",
    "contentTypes": {
      "liveChannel": "Canale in diretta",
      "iframe": "Contenuto web",
      "podcast": "Podcast",
      "radio": "Radio",
      "vod": "Video",
      "custom": "Personalizzato",
      "widget": "Widget"
    },
    "form": {
      "title": "Crea widget",
      "basicInfo": "Informazioni base",
      "titlePlaceholder": "Titolo widget",
      "titleRequired": "Il titolo del widget \u00e8 obbligatorio",
      "descriptionPlaceholder": "Descrizione (opzionale)",
      "iconPlaceholder": "Emoji icona (es. \ud83d\udcfa)",
      "content": "Contenuto",
      "fromLibrary": "Dalla libreria",
      "iframe": "iFrame",
      "selectContent": "Seleziona contenuto (Canali, Podcast, Programmi, ecc.)",
      "iframeUrl": "URL iFrame",
      "iframeUrlRequired": "L'URL iFrame \u00e8 obbligatorio",
      "iframeTitle": "Titolo iFrame",
      "positionSize": "Posizione e Dimensione",
      "behavior": "Comportamento",
      "mutedByDefault": "Muto per impostazione predefinita",
      "closable": "Chiudibile",
      "draggable": "Trascinabile",
      "widgetOrder": "Ordine widget",
      "orderPlaceholder": "Ordine (0 = primo)",
      "saveWidget": "Salva widget",
      "saving": "Salvataggio...",
      "cancel": "Annulla",
      "change": "Cambia"
    },
    "intro": {
      "title": "Benvenuto nei Widget",
      "description": "Scopri potenti widget fluttuanti per personalizzare la tua esperienza di visione",
      "watchVideo": "Guarda l'introduzione",
      "skip": "Salta",
      "dismiss": "Non mostrare pi\u00f9",
      "videoUnavailable": "Video temporaneamente non disponibile",
      "loadingMartyJr": "Caricamento Marty Jr...",
      "loadingWidgets": "Caricamento intro widget..."
    }
  },
  "trending": {
    "title": "Tendenze in Israele",
    "noTopics": "Nessun argomento di tendenza disponibile",
    "topStory": "IN PRIMO PIANO",
    "sources": "Fonti",
    "categories": {
      "security": "Sicurezza",
      "politics": "Politica",
      "tech": "Tecnologia",
      "culture": "Cultura",
      "sports": "Sport",
      "economy": "Economia",
      "entertainment": "Intrattenimento",
      "weather": "Meteo",
      "health": "Salute",
      "general": "Generale"
    }
  },
  "cultures": {
    "current": "Cultura attuale"
  },
  "cultureTrending": {
    "title": "Tendenze",
    "topStory": "In primo piano",
    "refreshing": "Aggiornamento...",
    "lastUpdated": "Ultimo aggiornamento",
    "categories": {
      "security": "Sicurezza",
      "politics": "Politica",
      "tech": "Tecnologia",
      "technology": "Tecnologia",
      "culture": "Cultura",
      "sports": "Sport",
      "economy": "Economia",
      "finance": "Finanza",
      "entertainment": "Intrattenimento",
      "weather": "Meteo",
      "health": "Salute",
      "food": "Gastronomia",
      "fashion": "Moda",
      "travel": "Viaggi",
      "history": "Storia",
      "expat": "Vita da espatriato",
      "general": "Generale"
    }
  },
  "cultureClock": {
    "weekday": "Giorno feriale"
  },
  "cultureCities": {
    "explore": "Esplora {{city}}",
    "categories": {
      "history": "Storia",
      "finance": "Finanza",
      "expat": "Vita da espatriato"
    }
  },
  "clock": {
    "israel": "Israele",
    "local": "Locale",
    "shabbatShalom": "Shabbat Shalom!",
    "erevShabbat": "Erev Shabbat",
    "candleLighting": "Accensione candele",
    "parasha": "Parasha"
  },
  "ritual": {
    "title": "Rituale mattutino",
    "greeting": "Buongiorno!",
    "israelUpdate": "\u00c8 pomeriggio in Israele, le notizie riportano gli sviluppi in corso",
    "recommendation": "Ti consigliamo di iniziare con le notizie del mattino e poi passare alla radio",
    "preparingRitual": "Preparazione del tuo rituale mattutino...",
    "israelTime": "Ora di Israele",
    "day": "Giorno",
    "letsStart": "Iniziamo",
    "skipToday": "Salta per oggi",
    "finish": "Fine",
    "noContentNow": "Nessun contenuto disponibile al momento",
    "typeLive": "Live",
    "typeRadio": "Radio",
    "typeVideo": "Video"
  },
  "watchParty": {
    "title": "Watch Party",
    "create": "Crea Party",
    "join": "Unisciti al Party",
    "active": "Party attivo",
    "createTitle": "Crea Watch Party",
    "joinTitle": "Unisciti al Party",
    "enterCode": "Inserisci codice stanza",
    "roomCode": "Codice stanza",
    "roomCodeHint": "Inserisci codice stanza di 8 caratteri per unirti al party",
    "copyCode": "Copia codice",
    "codeCopied": "Codice copiato!",
    "participants": "Partecipanti",
    "host": "Host",
    "you": "Tu",
    "leave": "Lascia Party",
    "end": "Termina Party",
    "chat": "Chat",
    "sendMessage": "Invia messaggio",
    "typeMessage": "Scrivi un messaggio...",
    "synced": "Sincronizzato",
    "syncing": "Sincronizzazione...",
    "hostPaused": "Host in pausa",
    "userJoined": "{{name}} si \u00e8 unito",
    "userLeft": "{{name}} \u00e8 uscito",
    "partyEnded": "Il party \u00e8 terminato",
    "connecting": "Connessione...",
    "options": {
      "chatEnabled": "Abilita chat",
      "syncPlayback": "Sincronizza riproduzione"
    },
    "errors": {
      "invalidCode": "Codice non valido",
      "partyFull": "Party pieno",
      "partyEnded": "Party terminato",
      "connectionError": "Errore di connessione",
      "createFailed": "Impossibile creare il party",
      "joinFailed": "Impossibile unirsi al party"
    },
    "audio": {
      "mute": "Muto",
      "unmute": "Attiva audio",
      "speaking": "Sta parlando",
      "connecting": "Connessione all'audio...",
      "noAudio": "Audio non disponibile",
      "muteHint": "Disattiva il microfono",
      "unmuteHint": "Attiva il microfono per parlare"
    },
    "textOnlyMode": "Solo chat testuale",
    "endParty": "Termina Party",
    "toggleEmoji": "Mostra selettore emoji",
    "toggleEmojiHint": "Apre il selettore rapido di emoji per le reazioni",
    "sendEmoji": "Invia {{emoji}}",
    "sendEmojiHint": "Invia reazione emoji alla chat",
    "emojiPicker": "Selettore emoji",
    "chatInput": "Input messaggio chat",
    "chatInputHint": "Scrivi un messaggio da inviare alla chat del party",
    "sendMessageHint": "Invia il tuo messaggio alla chat del party",
    "copyCodeHint": "Copia il codice stanza negli appunti",
    "share": "Condividi",
    "shareHint": "Condividi link del party o copia il codice",
    "copied": "Copiato!",
    "endPartyHint": "Termina il party per tutti i partecipanti",
    "leaveParty": "Lascia Party",
    "leavePartyHint": "Lascia il party senza terminarlo",
    "buttonHint": "Apre menu per creare o unirsi a un watch party",
    "createHint": "Crea un nuovo watch party",
    "joinHint": "Unisciti a un watch party esistente con un codice",
    "emojiPickerHint": "Mostra reazioni emoji rapide",
    "chatEnabledHint": "Abilita chat per i partecipanti",
    "syncPlaybackHint": "Mantiene la riproduzione sincronizzata con l'host",
    "createPartyHint": "Crea party con le opzioni selezionate",
    "joinPartyHint": "Unisciti al party con il codice inserito",
    "closePanelHint": "Chiude il pannello watch party",
    "cancelHint": "Annulla e chiude la finestra",
    "viewPartyHint": "Apre il pannello watch party",
    "panel": "Pannello Watch Party"
  },
  "footer": {
    "links": {
      "home": "Home",
      "liveTV": "TV in diretta",
      "vod": "Film e Serie",
      "radio": "Radio",
      "podcasts": "Podcast",
      "judaism": "Ebraismo",
      "profile": "Il mio profilo",
      "favorites": "Preferiti",
      "watchlist": "Lista",
      "subscribe": "Abbonati",
      "downloads": "Download",
      "help": "Centro assistenza",
      "faq": "FAQ",
      "contact": "Contattaci",
      "feedback": "Feedback",
      "terms": "Termini di Servizio",
      "privacy": "Informativa sulla Privacy",
      "cookies": "Cookie Policy",
      "licenses": "Licenze"
    },
    "newsletter": {
      "title": "Resta aggiornato",
      "description": "Iscriviti alla nostra newsletter per gli ultimi aggiornamenti e contenuti esclusivi.",
      "placeholder": "Inserisci la tua email",
      "success": "Grazie per l'iscrizione!"
    },
    "apps": {
      "title": "Scarica l'app",
      "downloadOn": "Scarica su",
      "getItOn": "Disponibile su",
      "appStore": "App Store",
      "googlePlay": "Google Play"
    },
    "social": {
      "facebook": "Facebook",
      "twitter": "Twitter",
      "instagram": "Instagram",
      "youtube": "YouTube"
    },
    "privacy": "Informativa sulla Privacy",
    "sitemap": "Mappa del sito",
    "accessibility": "Accessibilit\u00e0",
    "navigation": "Navigazione",
    "liveTV": "TV in diretta",
    "moviesAndSeries": "Film e Serie",
    "radioStations": "Stazioni radio",
    "myProfile": "Il mio profilo",
    "subscriptions": "Abbonamenti",
    "helpAndSupport": "Aiuto e Supporto",
    "termsOfUse": "Termini d'uso",
    "privacyPolicy": "Informativa sulla Privacy",
    "contactUs": "Contattaci"
  },
  "chapters": {
    "title": "Capitoli",
    "noChapters": "Nessun capitolo disponibile",
    "generating": "Generazione capitoli...",
    "jumpTo": "Vai a",
    "current": "Ora",
    "categories": {
      "intro": "Introduzione",
      "news": "Notizie",
      "security": "Sicurezza",
      "politics": "Politica",
      "economy": "Economia",
      "sports": "Sport",
      "weather": "Meteo",
      "culture": "Cultura",
      "conclusion": "Conclusione"
    }
  },
  "placeholder": {
    "email": "tua@email.com",
    "password": "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    "pin": "\u2022\u2022\u2022\u2022",
    "dateRange": {
      "from": "Da (AAAA-MM-GG)",
      "to": "A (AAAA-MM-GG)"
    },
    "amount": {
      "min": "Min",
      "max": "Max",
      "price": "0,00"
    },
    "chatMessage": "Scrivi qui...",
    "deepLink": "bayitplus://content/123",
    "scheduleDateTime": "AAAA-MM-GGTHH:mm",
    "roomCode": "ABCD1234",
    "time": {
      "start": "08:00",
      "end": "10:00"
    },
    "filter": {
      "userId": "Inserisci ID utente"
    },
    "datetime": "AAAA-MM-GGTHH:mm",
    "number": "0",
    "chat": "Scrivi il tuo messaggio..."
  },
  "components": {
    "select": {
      "default": "Seleziona..."
    }
  },
  "notFound": {
    "title": "Pagina non trovata",
    "description": "La pagina che stai cercando non esiste o \u00e8 stata spostata.",
    "homeButton": "Vai alla Home",
    "searchButton": "Cerca",
    "orTry": "Oppure prova:",
    "liveChannel": "Live",
    "vodLabel": "Film",
    "podcastsLabel": "Podcast"
  },
  "profiles": {
    "addProfile": "Aggiungi profilo",
    "enterPin": "Inserisci PIN",
    "selectError": "Errore nella selezione del profilo",
    "wrongPin": "PIN errato",
    "loading": "Caricamento profili...",
    "manage": "Gestisci profili",
    "whoIsWatching": "Chi sta guardando?",
    "manageProfiles": "Gestisci profili"
  },
  "watch": {
    "notFound": "Contenuto non trovato",
    "backToHome": "Torna alla Home",
    "episodes": "Episodi",
    "addToList": "Aggiungi alla lista",
    "like": "Mi piace",
    "share": "Condividi",
    "cast": "Cast",
    "episodesList": "Episodi",
    "schedule": "Programmazione",
    "now": "Ora",
    "related": "Contenuti correlati",
    "deleteEpisode": "Elimina episodio",
    "confirmDeleteEpisode": "Eliminare questo episodio?"
  },
  "live": {
    "title": "TV in diretta",
    "next": "Prossimo:",
    "noChannels": "Nessun canale disponibile",
    "tryLater": "Riprova pi\u00f9 tardi",
    "categories": {
      "all": "Tutto",
      "news": "Notizie",
      "entertainment": "Intrattenimento",
      "sports": "Sport",
      "kids": "Bambini",
      "music": "Musica"
    }
  },
  "judaism": {
    "erevShabbat": {
      "title": "Erev Shabbat",
      "prepareFor": "Preparati per lo Shabbat",
      "inTime": "tra {{time}}",
      "featuredContent": "Contenuti Shabbat",
      "noContent": "Contenuti Shabbat in arrivo!",
      "shabbatShalom": "Shabbat Shalom!",
      "timeUntil": "Tempo fino allo Shabbat",
      "shabbatSongs": "Canti dello Shabbat",
      "parashaStudy": "Parasha",
      "shabbatRecipes": "Ricette",
      "prayers": "Preghiere"
    }
  },
  "children": {
    "noContent": "Nessun contenuto disponibile",
    "tryAnotherCategory": "Prova a selezionare un'altra categoria",
    "ageRatings": {
      "3": "Et\u00e0 3+",
      "5": "Et\u00e0 5+",
      "7": "Et\u00e0 7+",
      "10": "Et\u00e0 10+",
      "12": "Et\u00e0 12+"
    },
    "moderation": {
      "pending": "In attesa di revisione",
      "approved": "Approvato",
      "rejected": "Rifiutato"
    },
    "admin": {
      "stats": "Gestione contenuti bambini",
      "seedContent": "Popola contenuti",
      "importArchive": "Importa da Archive.org",
      "syncPodcasts": "Sincronizza podcast",
      "syncYouTube": "Sincronizza YouTube",
      "tagVod": "Tagga VOD",
      "pendingModeration": "In attesa di moderazione"
    }
  },
  "youngsters": {
    "title": "Ragazzi",
    "items": "elementi",
    "empty": "Nessun contenuto disponibile",
    "emptyHint": "Prova un'altra categoria",
    "exitYoungstersMode": "Esci dalla modalit\u00e0 ragazzi",
    "exitDescription": "Inserisci il codice genitore per uscire",
    "parentCode": "Codice genitore",
    "confirm": "Conferma",
    "wrongCode": "Codice errato",
    "noContent": "Nessun contenuto disponibile",
    "tryAnotherCategory": "Prova a selezionare un'altra categoria",
    "categories": {
      "all": "Tutto",
      "trending": "Tendenze",
      "news": "Notizie",
      "culture": "Cultura",
      "educational": "Educativo",
      "music": "Musica",
      "entertainment": "Intrattenimento",
      "sports": "Sport",
      "tech": "Tecnologia",
      "judaism": "Ebraismo"
    },
    "ageGroups": {
      "middle-school": "Scuola media (12-14)",
      "high-school": "Liceo (15-17)"
    },
    "moderation": {
      "pending": "In attesa di revisione",
      "approved": "Approvato",
      "rejected": "Rifiutato"
    },
    "admin": {
      "stats": "Gestione contenuti ragazzi",
      "seedContent": "Popola contenuti",
      "importArchive": "Importa da Archive.org",
      "syncPodcasts": "Sincronizza podcast",
      "syncYouTube": "Sincronizza YouTube",
      "tagVod": "Tagga VOD",
      "pendingModeration": "In attesa di moderazione"
    }
  },
  "chatbot": {
    "showMultipleSuccess": "Mostro {{count}} contenuti nei widget",
    "showMultipleNotFound": "Impossibile trovare il contenuto richiesto. Prova con nomi diversi.",
    "resolvingContent": "Ricerca dei tuoi contenuti...",
    "voiceCommands": {
      "showChannels": "Mostrami i canali...",
      "playChess": "Inizia una partita a scacchi con...",
      "multiContent": "Mostra affiancati..."
    }
  },
  "chat": {
    "title": "Assistente Bayit+",
    "greeting": "Ciao! Sono l'assistente intelligente Bayit+. Come posso aiutarti oggi? Clicca sul microfono e parla, o digita un messaggio."
  },
  "subtitles": {
    "nikud": "Nikud",
    "selection": "Selezione",
    "translation": "Traduzione",
    "translating": "Traduzione in corso...",
    "close": "Chiudi",
    "unavailable": "Traduzione non disponibile",
    "off": "Disattivati",
    "none": "Nessuno",
    "autoGenerated": "Generati automaticamente",
    "selectLanguage": "Seleziona lingua sottotitoli",
    "liveTranslate": "Traduzione live",
    "translateTo": "Traduci in",
    "downloadMore": "Scarica altri sottotitoli...",
    "downloading": "Ricerca su OpenSubtitles...",
    "opensubtitlesSource": "Da OpenSubtitles.com",
    "downloadSuccess": "Scaricati {{count}} sottotitoli",
    "noSubtitlesFound": "Nessun sottotitolo trovato per questo contenuto"
  },
  "dubbing": {
    "title": "Doppiaggio live",
    "enabled": "Doppiaggio live attivato",
    "selectLanguage": "Seleziona lingua",
    "originalAudio": "Audio originale",
    "dubbedAudio": "Audio doppiato",
    "selectVoice": "Seleziona voce",
    "adjustVolume": "Regola volume",
    "tapToSelect": "Tocca per selezionare questa lingua",
    "languages": {
      "en": "English",
      "es": "Espa\u00f1ol",
      "he": "\u05e2\u05d1\u05e8\u05d9\u05ea",
      "ar": "\u0627\u0644\u0639\u0631\u0628\u064a\u0629",
      "ru": "\u0420\u0443\u0441\u0441\u043a\u0438\u0439",
      "fr": "Fran\u00e7ais",
      "de": "Deutsch"
    },
    "onboarding": {
      "title": "Introduzione al doppiaggio live",
      "description": "Vivi i contenuti live nella tua lingua. La nostra IA traduce e riproduce l'audio in tempo reale mentre guardi.",
      "feature1": "7 lingue supportate",
      "feature2": "Elaborazione in tempo reale",
      "feature3": "Regola il bilanciamento audio",
      "tryNow": "Prova ora",
      "later": "Forse pi\u00f9 tardi"
    },
    "consent": {
      "title": "Consenso elaborazione audio",
      "message": "Il doppiaggio live elabora l'audio in tempo reale usando servizi IA. L'audio viene elaborato solo per la traduzione e non viene archiviato permanentemente.",
      "accept": "Accetto",
      "decline": "No grazie"
    },
    "errors": {
      "connectionFailed": "Connessione fallita",
      "connectionFailedMessage": "Impossibile connettersi al servizio di doppiaggio",
      "connectionFailedAction": "Controlla la connessione internet e riprova",
      "notAuthenticated": "Non autenticato",
      "notAuthenticatedMessage": "Effettua nuovamente l'accesso",
      "notAuthenticatedAction": "Accedi per usare il doppiaggio live",
      "premiumRequired": "Funzione Premium",
      "premiumRequiredMessage": "Il doppiaggio live richiede un abbonamento Premium",
      "premiumRequiredAction": "Passa a Premium per accedere a questa funzione",
      "channelUnavailable": "Non disponibile",
      "channelUnavailableMessage": "Il doppiaggio non \u00e8 disponibile per questo canale",
      "audioCaptureError": "Errore microfono",
      "audioCaptureErrorMessage": "Impossibile accedere al microfono",
      "sttServiceError": "Errore riconoscimento vocale",
      "sttServiceErrorMessage": "Impossibile riconoscere il parlato",
      "ttsServiceError": "Errore doppiaggio",
      "ttsServiceErrorMessage": "Impossibile generare l'audio doppiato",
      "translationTimeout": "Timeout traduzione",
      "translationTimeoutMessage": "La traduzione ha impiegato troppo tempo, nuovo tentativo",
      "websocketClosed": "Connessione persa",
      "websocketClosedMessage": "La connessione al doppiaggio \u00e8 stata chiusa",
      "rateLimitExceeded": "Troppi tentativi",
      "rateLimitExceededMessage": "Attendi prima di riprovare",
      "sessionTimeout": "Sessione scaduta",
      "sessionTimeoutMessage": "La tua sessione di doppiaggio \u00e8 scaduta"
    }
  },
  "video": {
    "watchTrailer": "Guarda trailer",
    "closeTrailer": "Chiudi trailer",
    "deleteConfirm": "Eliminare questo episodio?"
  },
  "chess": {
    "title": "Scacchi",
    "welcome": "Benvenuto agli Scacchi",
    "subtitle": "Gioca a scacchi con amici e familiari in tutto il mondo",
    "createGame": "Crea nuova partita",
    "joinGame": "Unisciti alla partita",
    "gameCode": "Codice partita",
    "enterGameCode": "Inserisci codice partita",
    "invalidGameCode": "Codice partita non valido. Deve essere di 6 caratteri.",
    "joinFailed": "Impossibile unirsi alla partita",
    "join": "Unisciti",
    "create": "Crea",
    "chooseColor": "Scegli il tuo colore",
    "white": "Bianco",
    "black": "Nero",
    "chatPlaceholder": "Scrivi un messaggio... (@bot per consigli)",
    "botHint": "Tagga @bot nel tuo messaggio per ricevere consigli scacchistici dal nostro assistente IA",
    "bot": "Assistente scacchi",
    "mute": "Muto",
    "unmute": "Attiva audio",
    "speaking": "partecipanti",
    "resign": "Abbandona",
    "offerDraw": "Offri patta",
    "newGame": "Nuova partita",
    "checkmate": "Scacco matto!",
    "stalemate": "Stallo",
    "draw": "Patta",
    "resigned": "Partita abbandonata",
    "reconnecting": "Riconnessione...",
    "moveHistory": "Cronologia mosse",
    "noMoves": "Nessuna mossa ancora",
    "showHints": "Mostra suggerimenti guida",
    "yourTurn": "Tocca a te",
    "opponentTurn": "Tocca all'avversario",
    "waitingForOpponent": "In attesa dell'avversario...",
    "gameOver": "Partita terminata",
    "sendingInvite": "Invio invito partita a {{name}}...",
    "inviteSent": "Invito partita inviato a {{name}}! Codice: {{code}}",
    "inviteFailed": "Impossibile trovare l'utente. Controlla il nome e riprova.",
    "inviteReceived": "{{name}} ti ha invitato a una partita a scacchi!",
    "joinInvite": "Unisciti alla partita",
    "challenge": "Sfida",
    "playedAsWhite": "Giocato con il Bianco",
    "playedAsBlack": "Giocato con il Nero",
    "gameMode": "Modalit\u00e0 di gioco",
    "playVsFriend": "Gioca vs Amico",
    "playVsBot": "Gioca vs Bot",
    "difficulty": "Difficolt\u00e0",
    "easy": "Facile",
    "medium": "Media",
    "hard": "Difficile",
    "chessBot": "Bot scacchi"
  },
  "friends": {
    "title": "Amici e Avversari",
    "subtitle": "Connettiti con giocatori e sfida amici",
    "myFriends": "I miei amici",
    "requests": "Richieste",
    "findPlayers": "Trova giocatori",
    "friendsLabel": "Amici",
    "pendingLabel": "In sospeso",
    "add": "Aggiungi amico",
    "remove": "Rimuovi",
    "accept": "Accetta",
    "reject": "Rifiuta",
    "cancel": "Annulla",
    "noFriends": "Nessun amico ancora",
    "noFriendsDesc": "Cerca giocatori e invia richieste di amicizia",
    "lastGame": "Ultima partita: {{time}}",
    "friendsSince": "Amici dal {{date}}",
    "incomingRequests": "Richieste in arrivo",
    "outgoingRequests": "Richieste in uscita",
    "noIncoming": "Nessuna richiesta in arrivo",
    "noOutgoing": "Nessuna richiesta in uscita",
    "sentAt": "Inviata {{time}}",
    "searchPlaceholder": "Cerca per nome...",
    "noResults": "Nessun giocatore trovato",
    "noResultsDesc": "Prova a cercare con un nome diverso",
    "requestSent": "Richiesta di amicizia inviata!",
    "requestAccepted": "Richiesta di amicizia accettata!",
    "requestRejected": "Richiesta di amicizia rifiutata",
    "requestCancelled": "Richiesta di amicizia annullata",
    "friendRemoved": "Amico rimosso",
    "searchFailed": "Impossibile cercare utenti",
    "requestFailed": "Impossibile inviare richiesta",
    "acceptFailed": "Impossibile accettare richiesta",
    "rejectFailed": "Impossibile rifiutare richiesta",
    "cancelFailed": "Impossibile annullare richiesta",
    "removeFailed": "Impossibile rimuovere amico",
    "friendsCount": "{{count}} amici",
    "gamesCount": "{{count}} partite",
    "alreadyFriends": "Amici"
  },
  "stats": {
    "statistics": "Statistiche",
    "matchHistory": "Cronologia partite",
    "headToHead": "Testa a testa",
    "gamesPlayed": "Partite giocate",
    "wins": "Vittorie",
    "losses": "Sconfitte",
    "draws": "Pareggi",
    "winRate": "Percentuale vittorie",
    "rating": "Punteggio",
    "peakRating": "Punteggio massimo",
    "peak": "Massimo",
    "winStreak": "Serie di vittorie",
    "currentStreak": "Serie attuale",
    "bestStreak": "Miglior serie",
    "performance": "Prestazioni",
    "achievements": "Trofei",
    "currentRating": "Punteggio attuale",
    "totalGames": "Partite totali",
    "noGames": "Nessuna partita giocata ancora",
    "moves": "mosse",
    "won": "Vinta",
    "lost": "Persa",
    "draw": "Patta",
    "overall": "Record complessivo",
    "yourWins": "Le tue vittorie",
    "theirWins": "Le loro vittorie",
    "totalGamesPlayed": "Totale: {{count}} partite",
    "recentGames": "Partite recenti"
  },
  "support": {
    "categories": {
      "title": "Sfoglia documentazione",
      "loading": "Caricamento documentazione...",
      "loadError": "Impossibile caricare le categorie",
      "articleCount": "{{count}} articoli",
      "gettingStarted": "Per iniziare",
      "features": "Funzionalit\u00e0",
      "troubleshooting": "Risoluzione problemi",
      "account": "Account"
    },
    "docs": {
      "loading": "Caricamento documento...",
      "loadError": "Impossibile caricare il documento",
      "backToList": "Torna alla documentazione"
    },
    "search": {
      "placeholder": "Cerca nella documentazione...",
      "noResults": "Nessun risultato trovato"
    },
    "videos": {
      "title": "Video tutorial",
      "subtitle": "Impara a usare le funzionalit\u00e0 di Bayit+",
      "widgetsIntro": "Introduzione ai Widget",
      "widgetsDescription": "Impara a creare, personalizzare e gestire i widget fluttuanti"
    },
    "ticket": {
      "title": "Crea ticket di supporto",
      "subject": "Oggetto",
      "subjectPlaceholder": "Breve descrizione del problema",
      "message": "Messaggio",
      "messagePlaceholder": "Descrivi il problema in dettaglio...",
      "categoryLabel": "Categoria",
      "priorityLabel": "Priorit\u00e0",
      "submit": "Invia ticket",
      "category": {
        "billing": "Fatturazione",
        "technical": "Tecnico",
        "feature": "Richiesta funzionalit\u00e0",
        "general": "Generale"
      },
      "priority": {
        "low": "Bassa",
        "medium": "Media",
        "high": "Alta",
        "urgent": "Urgente"
      },
      "status": {
        "open": "Aperto",
        "in_progress": "In corso",
        "resolved": "Risolto",
        "closed": "Chiuso"
      },
      "created": "Creato",
      "error": {
        "required": "Compila tutti i campi obbligatori",
        "submit": "Impossibile creare il ticket. Riprova."
      }
    },
    "tickets": {
      "title": "I miei ticket di supporto",
      "loading": "Caricamento ticket...",
      "loadError": "Impossibile caricare i ticket",
      "empty": "Nessun ticket di supporto ancora",
      "emptyFilter": "Nessun ticket con questo stato",
      "create": "Nuovo ticket",
      "createFirst": "Crea il tuo primo ticket",
      "filter": {
        "all": "Tutti",
        "open": "Aperti",
        "inProgress": "In corso",
        "resolved": "Risolti"
      }
    },
    "voice": {
      "title": "Assistente vocale",
      "listening": "Sto ascoltando...",
      "thinking": "Fammi pensare...",
      "speaking": "Sta parlando...",
      "error": "Scusa, non ho capito. Riprova?",
      "ready": "Cosa vorresti sapere?",
      "listeningNow": "In ascolto...",
      "wakeWordHint": "Di' \"Jarvis\" per parlare"
    },
    "wizard": {
      "role": "La tua guida"
    }
  },
  "jerusalem": {
    "title": "Connessione Gerusalemme",
    "subtitle": "Resta connesso al cuore di Israele",
    "noContent": "Nessun contenuto su Gerusalemme disponibile",
    "sources": "Fonti",
    "kotelLive": "Muro Occidentale live",
    "categories": {
      "kotel": "Muro Occidentale",
      "idf-ceremony": "Cerimonie IDF",
      "diaspora-connection": "Connessione Diaspora",
      "holy-sites": "Luoghi Sacri",
      "jerusalem-events": "Eventi a Gerusalemme",
      "general": "Gerusalemme"
    }
  },
  "telAviv": {
    "title": "Connessione Tel Aviv",
    "subtitle": "La citt\u00e0 che non si ferma mai",
    "noContent": "Nessun contenuto su Tel Aviv disponibile",
    "sources": "Fonti",
    "beachLive": "Webcam spiaggia",
    "categories": {
      "beaches": "Spiagge",
      "nightlife": "Vita notturna",
      "culture": "Cultura e Arte",
      "music": "Scena musicale",
      "food": "Gastronomia",
      "tech": "Tech e Startup",
      "events": "Eventi",
      "general": "Tel Aviv"
    }
  },
  "taxonomy": {
    "sections": {
      "movies": "Film",
      "series": "Serie",
      "kids": "Bambini",
      "youngsters": "Ragazzi",
      "music": "Musica",
      "documentaries": "Documentari",
      "podcasts": "Podcast",
      "live": "TV in diretta",
      "audiobooks": "Audiolibri"
    },
    "subcategories": {
      "learning-hebrew": "Impara l'ebraico",
      "learning-hebrew.description": "Impara a leggere, scrivere e il vocabolario ebraico per bambini",
      "young-science": "Giovani scienziati",
      "young-science.description": "Esperimenti e spiegazioni scientifiche adatte ai bambini",
      "math-fun": "Matematica divertente",
      "math-fun.description": "Impara i numeri e l'aritmetica in modo divertente e giocoso",
      "nature-animals": "Natura e Animali",
      "nature-animals.description": "Il mondo degli animali e della natura per bambini curiosi",
      "interactive": "Interattivo",
      "interactive.description": "Contenuti interattivi e partecipativi per bambini",
      "hebrew-songs": "Canzoni ebraiche",
      "hebrew-songs.description": "Canzoni israeliane classiche e nuove per bambini",
      "nursery-rhymes": "Filastrocche",
      "nursery-rhymes.description": "Canzoni e melodie per neonati e bambini piccoli",
      "kids-movies": "Film per bambini",
      "kids-movies.description": "Film completi adatti ai bambini",
      "kids-series": "Serie per bambini",
      "kids-series.description": "Serie animate e programmi TV per bambini",
      "jewish-holidays": "Festivit\u00e0 ebraiche",
      "jewish-holidays.description": "Contenuti sulle festivit\u00e0 e tradizioni ebraiche per bambini",
      "torah-stories": "Storie della Torah",
      "torah-stories.description": "Storie dalla Torah e dalla tradizione ebraica",
      "bedtime-stories": "Storie della buonanotte",
      "bedtime-stories.description": "Storie rilassanti per l'ora della nanna",
      "tiktok-trends": "Tendenze TikTok",
      "tiktok-trends.description": "Tendenze e sfide popolari su TikTok",
      "viral-videos": "Video virali",
      "viral-videos.description": "Video virali popolari sui social media",
      "memes": "Meme",
      "memes.description": "Meme divertenti e cultura internet",
      "israel-news": "Notizie da Israele",
      "israel-news.description": "Notizie da Israele adatte agli adolescenti",
      "world-news": "Notizie dal mondo",
      "world-news.description": "Notizie internazionali per i giovani",
      "science-news": "Notizie scientifiche",
      "science-news.description": "Scoperte scientifiche e innovazioni tecnologiche",
      "sports-news": "Notizie sportive",
      "sports-news.description": "Aggiornamenti sportivi e risultati delle partite",
      "music-culture": "Cultura musicale",
      "music-culture.description": "Scena musicale, artisti e festival",
      "film-culture": "Cultura cinematografica",
      "film-culture.description": "Cinema, serie e recensioni",
      "art-culture": "Cultura artistica",
      "art-culture.description": "Arte, gallerie e creativit\u00e0",
      "food-culture": "Cultura gastronomica",
      "food-culture.description": "Cucina, ricette e cultura alimentare",
      "study-help": "Aiuto studio",
      "study-help.description": "Aiuto per esami, riassunti e preparazione test",
      "career-prep": "Preparazione carriera",
      "career-prep.description": "Preparazione universit\u00e0 e carriera",
      "life-skills": "Competenze di vita",
      "life-skills.description": "Competenze di vita, gestione del denaro e indipendenza",
      "teen-movies": "Film per adolescenti",
      "teen-movies.description": "Film consigliati per adolescenti",
      "teen-series": "Serie per adolescenti",
      "teen-series.description": "Serie popolari per adolescenti",
      "gaming": "Gaming",
      "gaming.description": "Videogiochi, e-sport e gaming",
      "coding": "Programmazione",
      "coding.description": "Programmazione, coding e sviluppo software",
      "gadgets": "Gadget",
      "gadgets.description": "Gadget, tecnologia e recensioni",
      "bar-bat-mitzvah": "Bar/Bat Mitzvah",
      "bar-bat-mitzvah.description": "Preparazione e celebrazioni per Bar/Bat Mitzvah",
      "teen-torah": "Torah per adolescenti",
      "teen-torah.description": "Lezioni di Torah e parasha settimanale per adolescenti",
      "jewish-history": "Storia ebraica",
      "jewish-history.description": "Storia del popolo ebraico"
    }
  },
  "passkey": {
    "manager": {
      "title": "Passkey",
      "subtitle": "Gestisci le tue passkey per l'accesso sicuro ai contenuti"
    },
    "unsupported": "Le passkey non sono supportate su questo dispositivo",
    "fetchError": "Impossibile caricare le passkey",
    "registerError": "Impossibile registrare la passkey",
    "deleteError": "Impossibile eliminare la passkey",
    "cancelled": "Operazione passkey annullata",
    "noPasskeys": "Nessuna passkey registrata. Aggiungine una per sbloccare i contenuti privati.",
    "unknownDevice": "Dispositivo sconosciuto",
    "created": "Creata",
    "lastUsed": "Ultimo utilizzo",
    "never": "Mai",
    "addPasskey": "Aggiungi passkey",
    "deleteConfirmTitle": "Eliminare la passkey?",
    "deleteConfirmText": "Questa passkey non potr\u00e0 pi\u00f9 sbloccare i contenuti. Puoi sempre aggiungerla di nuovo in seguito.",
    "unlock": "Sblocca",
    "unlockContent": "Sblocca contenuti privati",
    "unlockDescription": "Usa la tua passkey per accedere a film e serie privati",
    "auth": {
      "title": "Sblocca contenuti",
      "description": "Usa l'impronta digitale, il viso o il PIN del dispositivo per sbloccare film e serie privati.",
      "unlock": "Sblocca con passkey",
      "authenticating": "Autenticazione...",
      "success": "Contenuti sbloccati!",
      "cancelled": "Autenticazione annullata",
      "error": "Autenticazione fallita. Riprova."
    },
    "qr": {
      "useQR": "Usa il telefono per sbloccare",
      "scanWithPhone": "Scansiona con il telefono",
      "instruction": "Apri la fotocamera sul telefono e scansiona il codice QR per autenticarti",
      "error": "Impossibile generare il codice QR",
      "expired": "Codice QR scaduto. Riprova."
    }
  },
  "olorin": {
    "errors": {
      "session_not_found": "Sessione non trovata",
      "session_different_partner": "La sessione appartiene a un altro partner",
      "session_invalid_status": "La sessione \u00e8 {status}, impossibile aggiungere trascrizione",
      "max_sessions_reached": "Numero massimo di sessioni simultanee ({limit}) raggiunto",
      "invalid_api_key": "Chiave API non valida",
      "missing_api_key": "Header {header} mancante",
      "capability_disabled": "La funzionalit\u00e0 '{capability}' \u00e8 attualmente disabilitata",
      "capability_not_enabled": "La funzionalit\u00e0 '{capability}' non \u00e8 abilitata per questo partner",
      "source_language_not_supported": "Lingua sorgente '{language}' non supportata. Supportate: {supported}",
      "target_language_not_supported": "Lingua destinazione '{language}' non supportata. Supportate: {supported}",
      "partner_not_found": "Partner non trovato",
      "partner_registration_failed": "Registrazione partner fallita",
      "no_updates_provided": "Nessun aggiornamento fornito",
      "webhook_config_failed": "Configurazione webhook fallita",
      "webhook_url_not_configured": "URL webhook non configurato",
      "webhook_secret_not_configured": "Secret webhook non configurato",
      "search_failed": "Ricerca fallita",
      "indexing_failed": "Indicizzazione fallita",
      "detection_failed": "Rilevamento fallito",
      "explanation_failed": "Impossibile ottenere spiegazione",
      "reference_not_found": "Riferimento '{reference_id}' non trovato",
      "enrichment_failed": "Arricchimento fallito",
      "get_references_failed": "Impossibile ottenere riferimenti",
      "create_session_failed": "Impossibile creare sessione",
      "add_transcript_failed": "Impossibile aggiungere trascrizione",
      "generate_recap_failed": "Impossibile generare riepilogo"
    }
  },
  "trivia": {
    "didYouKnow": "Lo sapevi?",
    "dismissHint": "Tocca per nascondere questa curiosit\u00e0",
    "settings": {
      "title": "Curiosit\u00e0 e Fun Facts",
      "enabled": "Mostra curiosit\u00e0",
      "enabledDescription": "Mostra fatti interessanti durante la riproduzione",
      "frequency": "Frequenza",
      "frequencyHint": "Cambia frequenza di visualizzazione delle curiosit\u00e0",
      "categories": "Categorie",
      "category": "categoria",
      "selectCategory": "Tocca per selezionare questa categoria",
      "deselectCategory": "Tocca per deselezionare questa categoria",
      "displayDuration": "Durata visualizzazione",
      "durationHint": "Cambia per quanto tempo vengono mostrate le curiosit\u00e0",
      "seconds": "secondi"
    },
    "categories": {
      "cast": "Cast",
      "production": "Produzione",
      "location": "Ambientazione",
      "cultural": "Culturale",
      "historical": "Storico"
    },
    "frequency": {
      "off": "Disattivato",
      "low": "Bassa",
      "normal": "Normale",
      "high": "Alta"
    },
    "errors": {
      "loadFailed": "Impossibile caricare le curiosit\u00e0",
      "saveFailed": "Impossibile salvare le preferenze curiosit\u00e0"
    }
  },
  "cities": {
    "jerusalem": {
      "title": "Gerusalemme",
      "subtitle": "Scopri la citt\u00e0 eterna",
      "loadingContent": "Caricamento contenuti di Gerusalemme...",
      "noContent": "Nessun contenuto disponibile al momento",
      "errorLoading": "Impossibile caricare i contenuti di Gerusalemme",
      "sources": "Fonti",
      "categories": {
        "history": "\ud83c\udfdb\ufe0f Siti storici",
        "religion": "\ud83d\udd4d Patrimonio religioso",
        "culture": "\ud83c\udfad Eventi culturali",
        "events": "\ud83d\udcc5 Eventi locali",
        "food": "\ud83c\udf74 Delizie culinarie",
        "markets": "\ud83d\udecd\ufe0f Mercati tradizionali",
        "arts": "\ud83c\udfa8 Arte e Gallerie"
      }
    },
    "telAviv": {
      "title": "Tel Aviv",
      "subtitle": "Vivi la citt\u00e0 vibrante",
      "loadingContent": "Caricamento contenuti di Tel Aviv...",
      "noContent": "Nessun contenuto disponibile al momento",
      "errorLoading": "Impossibile caricare i contenuti di Tel Aviv",
      "sources": "Fonti",
      "categories": {
        "beaches": "\ud83c\udfd6\ufe0f Spiagge e Lungomare",
        "nightlife": "\ud83c\udf03 Vita notturna e Intrattenimento",
        "culture": "\ud83c\udfad Eventi culturali",
        "music": "\ud83c\udfb5 Musica e Concerti",
        "food": "\ud83c\udf74 Gastronomia",
        "tech": "\ud83d\udcbb Tech e Innovazione",
        "events": "\ud83d\udcc5 Eventi locali"
      }
    },
    "beta": {
      "credits": {
        "loading": "Caricamento saldo crediti...",
        "error": "Impossibile caricare il saldo crediti",
        "label": "Crediti IA",
        "remaining": "Crediti rimanenti",
        "warningCritical": "Critico: Crediti quasi esauriti",
        "warningLow": "Avviso: Saldo crediti basso",
        "upgrade": "Aggiorna piano",
        "upgradeAction": "Aggiorna per ottenere pi\u00f9 crediti"
      },
      "settings": {
        "title": "Programmi Beta",
        "description": "Gestisci la tua iscrizione a Beta 500 e visualizza i dettagli del programma. Ottieni accesso anticipato alle funzionalit\u00e0 basate sull'IA.",
        "enrolledTitle": "Sei in Beta 500!",
        "statusPendingVerification": "Verifica in corso",
        "statusActive": "Attivo",
        "statusExpired": "Scaduto",
        "pendingMessage": "Stiamo verificando la tua iscrizione. Riceverai un'email una volta approvata.",
        "expiresOn": "Scade il {{date}}",
        "loadingStatus": "Caricamento stato programma...",
        "errorLoading": "Impossibile caricare le informazioni del programma. Riprova.",
        "programStatus": "Stato programma",
        "slots": "posti occupati",
        "slotsAvailable": "{{count}} posti disponibili",
        "programFull": "Tutti i 500 posti occupati"
      },
      "enrollment": {
        "title": "Unisciti a Beta 500",
        "subtitle": "Sii una delle 500 famiglie a sperimentare le funzionalit\u00e0 basate sull'IA",
        "programFull": "Programma completo",
        "joinButton": "Unisciti a Beta 500",
        "exclusiveAccess": "Accesso esclusivo",
        "limitedSlots": "Limitato a 500 famiglie",
        "slotsAvailable": "{{available}} di {{total}} posti disponibili",
        "freeCredits": "Crediti IA gratuiti",
        "creditsAmount": "5.000 crediti (valore 50\u20ac)",
        "duration": "Durata Beta",
        "durationValue": "90 giorni",
        "features": "Funzionalit\u00e0 IA",
        "featuresValue": "Doppiaggio live, ricerca IA, raccomandazioni",
        "whatYouGet": "Cosa ottieni",
        "benefits": {
          "liveDubbing": "Traduzione audio in tempo reale mentre guardi",
          "aiSearch": "Scoperta intelligente dei contenuti",
          "aiRecommendations": "Suggerimenti personalizzati",
          "prioritySupport": "Accesso diretto al team di sviluppo"
        },
        "disclaimer": "Beta 500 \u00e8 un programma a tempo limitato. I crediti non sono rinnovabili durante il periodo beta.",
        "waitlistMessage": "Tutti i 500 posti sono attualmente occupati. Unisciti alla lista d'attesa per essere avvisato quando un posto si libera.",
        "enrollmentSuccess": "Benvenuto in Beta 500! Controlla la tua email per verificare l'account.",
        "enrollmentError": "Impossibile iscriversi. Riprova pi\u00f9 tardi."
      }
    }
  },
  "catchup": {
    "overlay": {
      "title": "Appena arrivato?",
      "description": "Ti sei unito a {{programName}} a programma iniziato",
      "creditContext": "Questo user\u00e0 {{cost}} dei tuoi {{balance}} crediti",
      "lowBalanceWarning": "Crediti rimanenti bassi",
      "acceptButton": "Fammi il riassunto ({{cost}} crediti)",
      "declineButton": "No grazie"
    },
    "button": {
      "credits": "Riassunto ({{cost}} crediti)",
      "label": "Riassunto per mettersi in pari",
      "title": "Riassunto"
    },
    "generating": "Generazione riassunto...",
    "summary": {
      "title": "Cosa ti sei perso",
      "keyPoints": "Punti chiave",
      "windowInfo": "Ultimi {{minutes}} minuti",
      "creditsUsed": "Usati {{count}} crediti",
      "creditsRemaining": "{{count}} crediti rimanenti",
      "close": "Chiudi"
    },
    "error": {
      "failed": "Impossibile generare il riassunto",
      "retry": "Riprova",
      "insufficientCredits": "Crediti insufficienti"
    }
  },
  "quota": {
    "subtitleExceeded": "Quota sottotitoli superata. Riprova pi\u00f9 tardi.",
    "dubbingExceeded": "Quota doppiaggio superata. Riprova pi\u00f9 tardi."
  },
  "podcasts": {
    "selectLanguage": "Lingua audio",
    "switchToLanguage": "Passa a {{language}}",
    "languageSwitched": "Ora in riproduzione in {{language}}",
    "availableInLanguage": "Disponibile in {{language}}",
    "availableLanguages": "Disponibile in pi\u00f9 lingue",
    "downloadForOffline": "Scarica per ascolto offline",
    "downloadProgress": "Download {{progress}}%",
    "downloaded": "Scaricato",
    "downloadFailed": "Download fallito",
    "retryDownload": "Riprova download",
    "deleteDownload": "Elimina download",
    "confirmDelete": "Eliminare l'audio scaricato?",
    "quality": {
      "label": "Qualit\u00e0 audio",
      "low": "Bassa (64 kbps) - Risparmia dati",
      "medium": "Media (96 kbps) - Bilanciata",
      "high": "Alta (128 kbps) - Migliore qualit\u00e0"
    },
    "languages": {
      "he": {
        "short": "Ebraico",
        "full": "Ebraico"
      },
      "en": {
        "short": "Inglese",
        "full": "Inglese"
      }
    },
    "player": {
      "switchingLanguage": "Cambio lingua audio...",
      "languageSwitchError": "Impossibile cambiare lingua",
      "loadingTranslation": "Caricamento audio tradotto...",
      "translationUnavailable": "Traduzione non ancora disponibile"
    },
    "onboarding": {
      "multiLanguageTitle": "Audio multilingue",
      "multiLanguageDescription": "Questo podcast \u00e8 disponibile in ebraico e inglese. Tocca il selettore lingua per cambiare.",
      "downloadTitle": "Ascolta offline",
      "downloadDescription": "Scarica gli episodi per ascoltarli senza connessione internet.",
      "gotIt": "Capito"
    }
  },
  "vod": {
    "allContent": "Tutti i contenuti",
    "noContent": "Nessun contenuto disponibile",
    "noContentInCategory": "Nessun contenuto trovato in questa categoria"
  },
  "admin": {
    "refunds": {
      "subtitle": "Gestisci richieste di rimborso",
      "approveModal": {
        "title": "Conferma approvazione",
        "message": "Approvare il rimborso di {{amount}}?"
      },
      "confirmApprove": "Approvare il rimborso di {{amount}}?",
      "confirmDelete": "Eliminare la richiesta di rimborso?",
      "rejectModal": {
        "title": "Rifiuta richiesta di rimborso",
        "message": "Rifiuto rimborso di {{amount}}",
        "reasonLabel": "Motivo del rifiuto",
        "reasonPlaceholder": "Inserisci il motivo del rifiuto...",
        "submitButton": "Rifiuta richiesta"
      },
      "status": {
        "pending": "In sospeso",
        "approved": "Approvato",
        "rejected": "Rifiutato"
      },
      "columns": {
        "id": "ID",
        "user": "Utente",
        "amount": "Importo",
        "reason": "Motivo",
        "status": "Stato",
        "requestDate": "Data richiesta"
      },
      "stats": {
        "pendingTitle": "In attesa di approvazione",
        "approvedTitle": "Approvati",
        "rejectedTitle": "Rifiutati",
        "totalRefunded": "Totale rimborsato"
      },
      "emptyMessage": "Nessuna richiesta di rimborso trovata",
      "errors": {
        "rejectReasonRequired": "Inserisci il motivo del rifiuto"
      },
      "title": "Rimborsi"
    },
    "plans": {
      "title": "Gestione piani",
      "subtitle": "Configura e gestisci i piani di abbonamento",
      "createButton": "Nuovo piano",
      "inactive": "Inattivo",
      "subscribersLabel": "Abbonati:",
      "intervals": {
        "monthly": "mese",
        "yearly": "anno"
      },
      "trialDays": "{{days}} giorni di prova",
      "modal": {
        "editTitle": "Modifica piano",
        "createTitle": "Nuovo piano"
      },
      "form": {
        "nameEn": "Nome (Inglese)",
        "nameHe": "Nome (Ebraico)",
        "price": "Prezzo (\u20ac)",
        "interval": "Periodo di fatturazione",
        "trialDays": "Giorni di prova",
        "features": "Caratteristiche (una per riga)",
        "active": "Piano attivo"
      },
      "errors": {
        "requiredFields": "Nome e prezzo sono obbligatori"
      },
      "confirmDelete": "Eliminare il piano \"{{name}}\"?"
    },
    "emailCampaigns": {
      "subtitle": "Crea e gestisci campagne email",
      "createButton": "Nuova campagna",
      "searchPlaceholder": "Cerca campagna...",
      "emptyMessage": "Nessuna campagna trovata",
      "status": {
        "draft": "Bozza",
        "active": "Attiva",
        "scheduled": "Programmata",
        "completed": "Completata"
      },
      "columns": {
        "name": "Nome campagna",
        "status": "Stato",
        "sent": "Inviate",
        "opened": "Aperte",
        "clicked": "Cliccate",
        "created": "Creata",
        "actions": "Azioni"
      },
      "editModal": {
        "title": "Modifica campagna"
      },
      "sendTestEmail": "Invia test",
      "confirmSend": "Inviare la campagna \"{{name}}\"?",
      "confirmDelete": "Eliminare la campagna \"{{name}}\"?",
      "testEmailSent": "Email di test inviata!",
      "createModal": {
        "title": "Nuova campagna email"
      },
      "form": {
        "name": "Nome campagna",
        "namePlaceholder": "es. Saldi di fine anno",
        "subject": "Oggetto email",
        "subjectPlaceholder": "Oggetto mostrato ai destinatari",
        "body": "Contenuto",
        "bodyPlaceholder": "Contenuto email...",
        "submitButton": "Crea campagna",
        "requiredFields": "Nome e oggetto sono obbligatori"
      },
      "testModal": {
        "title": "Invia email di test",
        "emailLabel": "Indirizzo email",
        "emailPlaceholder": "test@esempio.com",
        "submitButton": "Invia test"
      },
      "errors": {
        "requiredFields": "Nome e oggetto sono obbligatori"
      }
    },
    "campaignEdit": {
      "subtitle": "Modifica dettagli e impostazioni campagna"
    },
    "dashboard": {
      "subtitle": "Panoramica del sistema",
      "refresh": "Aggiorna",
      "timeAgo": {
        "minutes": "{{count}} minuti fa",
        "hours": "{{count}} ore fa"
      },
      "title": "Dashboard",
      "users": "Utenti",
      "revenue": "Entrate",
      "subscriptions": "Abbonamenti",
      "recentActivity": "Attivit\u00e0 recente",
      "quickActions": "Azioni rapide"
    },
    "common": {
      "all": "Tutto",
      "cancel": "Annulla",
      "save": "Salva",
      "active": "Attivo",
      "back": "Indietro",
      "backToPodcasts": "Torna ai podcast",
      "savePodcast": "Salva podcast",
      "saveEpisode": "Salva episodio",
      "filterAction": "Azione",
      "filterResource": "Risorsa",
      "filterUser": "Utente",
      "filterDateRange": "Intervallo date"
    },
    "stats": {
      "totalUsers": "Utenti totali",
      "activeUsers": "Utenti attivi",
      "newToday": "Nuovi oggi",
      "newThisWeek": "Nuovi questa settimana",
      "totalRevenue": "Entrate totali",
      "revenueToday": "Entrate oggi",
      "revenueMonth": "Entrate questo mese",
      "arpu": "ARPU",
      "activeSubscriptions": "Abbonamenti attivi",
      "churnRate": "Tasso di abbandono"
    },
    "actions": {
      "new": "Nuovo",
      "addUser": "Aggiungi utente",
      "newCampaign": "Nuova campagna",
      "sendEmail": "Invia email",
      "viewReports": "Visualizza report",
      "newPodcast": "Crea nuovo podcast",
      "newEpisode": "Crea nuovo episodio"
    },
    "auditActions": {
      "user_created": "Utente creato",
      "user_updated": "Utente aggiornato",
      "user_deleted": "Utente eliminato",
      "user_role_changed": "Ruolo utente modificato",
      "campaign_created": "Campagna creata",
      "campaign_updated": "Campagna aggiornata",
      "campaign_deleted": "Campagna eliminata",
      "campaign_activated": "Campagna attivata",
      "subscription_created": "Abbonamento creato",
      "subscription_updated": "Abbonamento aggiornato",
      "subscription_canceled": "Abbonamento annullato",
      "subscription_deleted": "Abbonamento eliminato",
      "refund_processed": "Rimborso elaborato",
      "payment_received": "Pagamento ricevuto",
      "settings_updated": "Impostazioni aggiornate",
      "login": "Accesso",
      "logout": "Disconnessione",
      "content_created": "Contenuto creato",
      "content_updated": "Contenuto aggiornato",
      "content_deleted": "Contenuto eliminato",
      "content_published": "Contenuto pubblicato",
      "content_unpublished": "Contenuto rimosso dalla pubblicazione",
      "category_created": "Categoria creata",
      "category_updated": "Categoria aggiornata",
      "category_deleted": "Categoria eliminata",
      "live_channel_created": "Canale live creato",
      "live_channel_updated": "Canale live aggiornato",
      "live_channel_deleted": "Canale live eliminato",
      "radio_station_created": "Stazione radio creata",
      "radio_station_updated": "Stazione radio aggiornata",
      "radio_station_deleted": "Stazione radio eliminata",
      "podcast_created": "Podcast creato",
      "podcast_updated": "Podcast aggiornato",
      "podcast_deleted": "Podcast eliminato",
      "podcast_episode_created": "Episodio podcast creato",
      "podcast_episode_updated": "Episodio podcast aggiornato",
      "podcast_episode_deleted": "Episodio podcast eliminato",
      "content_imported": "Contenuto importato",
      "widget_created": "Widget creato",
      "widget_updated": "Widget aggiornato",
      "widget_deleted": "Widget eliminato",
      "widget_published": "Widget pubblicato",
      "widget_unpublished": "Widget rimosso dalla pubblicazione"
    },
    "placeholder": {
      "userId": "Inserisci ID utente",
      "discount": "0"
    },
    "titles": {
      "users": "Utenti",
      "transactions": "Transazioni",
      "subscriptions": "Abbonamenti",
      "refunds": "Rimborsi",
      "plans": "Piani",
      "campaigns": "Campagne",
      "auditLogs": "Log di audit",
      "pushNotifications": "Notifiche push",
      "billing": "Fatturazione",
      "marketing": "Marketing",
      "content": "Libreria contenuti",
      "categories": "Categorie",
      "liveChannels": "Canali live",
      "librarian": "Agente bibliotecario",
      "radioStations": "Stazioni radio",
      "podcasts": "Podcast",
      "settings": "Impostazioni"
    },
    "nav": {
      "campaigns": "Campagne",
      "billing": "Fatturazione",
      "billingOverview": "Panoramica",
      "transactions": "Transazioni",
      "refunds": "Rimborsi",
      "subscriptions": "Abbonamenti",
      "subscriptionsList": "Abbonati",
      "plans": "Piani",
      "marketing": "Marketing",
      "marketingDashboard": "Panoramica",
      "emailCampaigns": "Campagne email",
      "pushNotifications": "Notifiche push",
      "content": "Contenuti",
      "contentLibrary": "Libreria contenuti",
      "categories": "Categorie",
      "liveChannels": "Canali live",
      "radioStations": "Stazioni radio",
      "podcasts": "Podcast",
      "widgets": "Widget",
      "recordings": "Registrazioni",
      "uploads": "Caricamenti",
      "auditLogs": "Log di audit",
      "librarian": "Agente bibliotecario",
      "liveQuotas": "Quote live",
      "featured": "In evidenza",
      "translations": "Traduzioni"
    },
    "liveQuotas": {
      "title": "Gestione quote funzionalit\u00e0 live",
      "analytics": "Analisi utilizzo funzionalit\u00e0 live",
      "currentUsage": "Utilizzo corrente",
      "quotaLimits": "Limiti quota",
      "confirmReset": "Azzerare tutti i contatori di utilizzo per questo utente?",
      "subtitlesHour": "Sottotitoli (ora)",
      "subtitlesDay": "Sottotitoli (giorno)",
      "subtitlesMonth": "Sottotitoli (mese)",
      "dubbingHour": "Doppiaggio (ora)",
      "dubbingDay": "Doppiaggio (giorno)",
      "dubbingMonth": "Doppiaggio (mese)",
      "estimatedCost": "Costo stimato (questo mese)",
      "subtitleLimits": "Limiti sottotitoli",
      "dubbingLimits": "Limiti doppiaggio",
      "perHour": "Per ora (min)",
      "perDay": "Per giorno (min)",
      "perMonth": "Per mese (min)",
      "notes": "Note admin",
      "notesPlaceholder": "Motivo per l'estensione dei limiti...",
      "editLimits": "Modifica limiti",
      "resetCounters": "Azzera tutti i contatori di utilizzo",
      "totalUsers": "Utenti totali con quote",
      "activeSessions": "Sessioni attive",
      "subtitlesToday": "Minuti sottotitoli (oggi)",
      "dubbingToday": "Minuti doppiaggio (oggi)",
      "costToday": "Costo (oggi)",
      "costMonth": "Costo (questo mese)",
      "last7Days": "Ultimi 7 giorni",
      "last30Days": "Ultimi 30 giorni",
      "totalSessions": "Sessioni totali",
      "totalMinutes": "Minuti totali",
      "totalCost": "Costo totale",
      "topUsers": "Utenti principali (ultimi 30 giorni)",
      "user": "Utente",
      "subtitles": "Sottotitoli",
      "dubbing": "Doppiaggio",
      "cost": "Costo",
      "noData": "Nessun dato di utilizzo disponibile"
    },
    "featured": {
      "title": "Contenuti in evidenza",
      "subtitle": "Gestisci l'ordine del carosello trascinando gli elementi",
      "empty": "Nessun contenuto in evidenza",
      "emptyHint": "Aggiungi contenuti in evidenza dalla Libreria contenuti",
      "count": "{{count}} elementi",
      "confirmUnfeature": "Rimuovere dai contenuti in evidenza?",
      "remove": "Rimuovi",
      "unsavedChanges": "Hai modifiche non salvate",
      "addContent": "Aggiungi contenuto",
      "addContentToSection": "Aggiungi contenuto a {{section}}",
      "selectContentToAdd": "Seleziona contenuto da aggiungere",
      "addSelected": "Aggiungi selezionati ({{count}})",
      "noContentAvailable": "Nessun contenuto disponibile",
      "contentAdded": "Aggiunti {{count}} elementi",
      "failedToAdd": "Impossibile aggiungere contenuto",
      "publishedOnly": "Solo pubblicati",
      "saveButton": "Salva ({{count}})"
    },
    "content": {
      "title": "Libreria contenuti",
      "subtitle": "Gestisci film, serie e contenuti video",
      "importFree": "Importa contenuti gratuiti",
      "searchPlaceholder": "Cerca contenuti...",
      "emptyMessage": "Nessun contenuto trovato",
      "confirmDelete": "Eliminare questo contenuto?",
      "confirmDeleteSingle": "Sei sicuro di voler eliminare questo contenuto? Questa azione non pu\u00f2 essere annullata.",
      "confirmBatchDelete": "Sei sicuro di voler eliminare {{count}} elemento/i? Questa azione non pu\u00f2 essere annullata.",
      "batchDeleteSuccess": "Eliminati {{count}} elemento/i con successo",
      "batchDeletePartial": "Eliminati {{success}} elemento/i, ma {{failed}} elemento/i falliti",
      "selectedItems": "{{count}} elemento/i selezionato/i",
      "batchFeature": "In evidenza",
      "batchUnfeature": "Rimuovi da evidenza"
    }
  }
};

deepMerge(it, translations);
fs.writeFileSync('it.json', JSON.stringify(it, null, 2) + '\n');

console.log('Italian locale file completed successfully!');
