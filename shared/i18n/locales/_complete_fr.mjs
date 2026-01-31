import fs from 'fs';

const fr = JSON.parse(fs.readFileSync('fr.json', 'utf8'));

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

// Complete missing translations for French
const completeFr = {
  profile: {
    tabs: {
      personal: "Personnel",
      overview: "Aperçu",
      subscription: "Abonnement",
      notifications: "Notifications",
      security: "Sécurité",
      ai: "IA & Voix",
      voice: "Voix & Accessibilité",
      devices: "Appareils"
    },
    subscription: {
      currentPlan: "Plan actuel",
      renewsOn: "Renouvellement le",
      manageSubscription: "Gérer l'abonnement",
      cancelSubscription: "Annuler l'abonnement",
      noActivePlan: "Aucun abonnement actif",
      selectPlan: "Sélectionner un plan"
    },
    ai: {
      title: "IA & Personnalisation",
      description: "Configurer les fonctionnalités IA",
      assistant: "Assistant IA",
      assistantDesc: "Recommandations personnalisées et aide",
      chatbot: "Assistant IA",
      chatbotEnabled: "Activer l'assistant IA",
      chatbotEnabledDesc: "Obtenez de l'aide pour naviguer le contenu",
      saveHistory: "Enregistrer l'historique des conversations",
      saveHistoryDesc: "Se souvenir des conversations précédentes",
      recommendations: "Recommandations",
      personalizedRecs: "Recommandations personnalisées",
      personalizedRecsDesc: "Suggestions de contenu basées sur l'historique",
      privacy: "Confidentialité & Données",
      privacyDesc: "Vos données sont cryptées et sécurisées",
      dataConsent: "Analyse d'utilisation",
      dataConsentDesc: "Aider à améliorer les fonctionnalités IA",
      privacyNote: "Vos données sont cryptées et sécurisées"
    },
    voice: {
      title: "Contrôle vocal",
      description: "Navigation mains libres",
      enabled: "Commandes vocales",
      enabledDesc: "Contrôlez l'application avec votre voix",
      tts: "Synthèse vocale",
      ttsDesc: "Réponses IA lues à voix haute",
      wakeWord: "Détection du mot d'activation",
      wakeWordDesc: "Dites \"Bayit\" pour activer",
      operationMode: "Mode de fonctionnement",
      operationModeDesc: "Choisissez comment interagir avec l'application",
      voiceSearch: "Recherche vocale",
      voiceSearchEnabled: "Activer la recherche vocale",
      voiceSearchEnabledDesc: "Rechercher du contenu avec votre voix",
      constantListening: "Mode écoute permanente",
      constantListeningDesc: "Écouter en continu les commandes vocales sans appuyer sur un bouton",
      constantListeningPrivacy: "L'audio n'est envoyé aux serveurs que lorsque la parole est détectée",
      holdButtonMode: "Maintenir le bouton pour parler",
      holdButtonModeDesc: "Appuyez et maintenez le bouton micro au lieu d'écouter en permanence",
      sensitivity: "Sensibilité de détection vocale",
      sensitivityDesc: "Ajuster la réactivité de la détection vocale",
      sensitivityLow: "Faible (moins de faux déclenchements)",
      sensitivityMedium: "Moyenne (équilibrée)",
      sensitivityHigh: "Élevée (plus réactive)",
      silenceThreshold: "Détection du silence",
      silenceThresholdDesc: "Temps d'attente après avoir parlé avant le traitement",
      language: "Langue vocale",
      accessibility: "Accessibilité",
      autoSubtitle: "Activer les sous-titres automatiquement",
      autoSubtitleDesc: "Afficher automatiquement les sous-titres lors de la lecture",
      highContrast: "Mode contraste élevé",
      highContrastDesc: "Augmenter le contraste pour une meilleure visibilité",
      textSize: "Taille du texte",
      textSizeSmall: "Petit",
      textSizeMedium: "Moyen",
      textSizeLarge: "Grand",
      avatar: {
        title: "Affichage de l'avatar",
        description: "Choisissez comment l'assistant apparaît pendant les interactions vocales",
        currentMode: "Mode actuel",
        modes: {
          full: "Plein écran",
          compact: "Compact",
          minimal: "Minimal",
          iconOnly: "Icône uniquement"
        }
      },
      settings: {
        title: "Paramètres vocaux",
        close: "Fermer",
        voiceFeatures: "Fonctionnalités vocales",
        enableCommands: "Activer les commandes vocales",
        enableCommandsDesc: "Activer la recherche et les commandes vocales",
        voiceLanguage: "Langue vocale",
        wakeWordDetection: "Détection du mot d'activation",
        sensitivityLabel: "Sensibilité",
        sensitivityHint: "Plus élevé = plus réactif, peut déclencher plus de faux positifs",
        currentSensitivity: "Sensibilité actuelle : {{value}}%",
        avatarDisplay: "Affichage de l'avatar",
        voiceResponse: "Réponse vocale",
        audioResponses: "Réponses audio",
        audioResponsesDesc: "Répondre avec la voix au lieu du texte",
        privacy: "Confidentialité & Historique",
        recordHistory: "Enregistrer l'historique des commandes",
        recordHistoryDesc: "Sauvegarder les commandes vocales pour un accès rapide",
        historyHelp: "L'historique aide à améliorer la précision de la reconnaissance vocale",
        permissions: "Permissions",
        microphone: "Microphone",
        granted: "Accordé",
        denied: "Refusé",
        microphoneRequired: "L'accès au microphone est requis pour les commandes vocales",
        supportedCommands: "Commandes supportées",
        advanced: "Avancé",
        clearHistory: "Effacer l'historique des commandes",
        resetSettings: "Réinitialiser tous les paramètres"
      },
      errors: {
        microphoneAccess: "Accès au microphone refusé",
        networkError: "Erreur de connexion réseau",
        processingFailed: "Échec du traitement de l'entrée vocale",
        intentClassification: "Commande non comprise",
        timeout: "Délai de reconnaissance vocale dépassé"
      }
    },
    devices: {
      registeredDevices: "Appareils enregistrés",
      description: "Gérez les appareils ayant accès à votre compte. Vous pouvez déconnecter des appareils pour libérer des créneaux de streaming.",
      noDevices: "Aucun appareil connecté",
      noDevicesDescription: "Les appareils apparaîtront ici lorsque vous vous connecterez sur différentes plateformes",
      loading: "Chargement des appareils...",
      thisDevice: "Cet appareil",
      activeNow: "Actif maintenant",
      minutesAgo: "il y a {{count}} minutes",
      hoursAgo: "il y a {{count}} heures",
      daysAgo: "il y a {{count}} jours",
      disconnect: "Déconnecter",
      confirmDisconnect: "Déconnecter l'appareil ?",
      confirmDisconnectMessage: "Cela mettra fin à toutes les sessions de lecture actives sur cet appareil et le supprimera de votre compte.",
      disconnectSuccess: "Appareil déconnecté",
      disconnectSuccessMessage: "L'appareil a été déconnecté avec succès."
    }
  },
  profiles: {
    addProfile: "Ajouter un profil",
    enterPin: "Entrer le code PIN",
    selectError: "Erreur lors de la sélection du profil",
    wrongPin: "Code PIN incorrect",
    loading: "Chargement des profils...",
    manage: "Gérer les profils",
    whoIsWatching: "Qui regarde ?",
    manageProfiles: "Gérer les profils"
  },
  friends: {
    title: "Amis & Adversaires",
    subtitle: "Connectez-vous avec des joueurs et défiez vos amis",
    myFriends: "Mes amis",
    requests: "Demandes",
    findPlayers: "Trouver des joueurs",
    friendsLabel: "Amis",
    pendingLabel: "En attente",
    add: "Ajouter un ami",
    remove: "Supprimer",
    accept: "Accepter",
    reject: "Rejeter",
    cancel: "Annuler",
    noFriends: "Pas encore d'amis",
    noFriendsDesc: "Recherchez des joueurs et envoyez des demandes d'ami",
    lastGame: "Dernière partie : {{time}}",
    friendsSince: "Amis depuis {{date}}",
    incomingRequests: "Demandes reçues",
    outgoingRequests: "Demandes envoyées",
    noIncoming: "Aucune demande reçue",
    noOutgoing: "Aucune demande envoyée",
    sentAt: "Envoyée {{time}}",
    searchPlaceholder: "Rechercher par nom...",
    noResults: "Aucun joueur trouvé",
    noResultsDesc: "Essayez de rechercher avec un autre nom",
    requestSent: "Demande d'ami envoyée !",
    requestAccepted: "Demande d'ami acceptée !",
    requestRejected: "Demande d'ami rejetée",
    requestCancelled: "Demande d'ami annulée",
    friendRemoved: "Ami supprimé",
    searchFailed: "Échec de la recherche d'utilisateurs",
    requestFailed: "Échec de l'envoi de la demande",
    acceptFailed: "Échec de l'acceptation de la demande",
    rejectFailed: "Échec du rejet de la demande",
    cancelFailed: "Échec de l'annulation de la demande",
    removeFailed: "Échec de la suppression de l'ami",
    friendsCount: "{{count}} amis",
    gamesCount: "{{count}} parties",
    alreadyFriends: "Amis"
  },
  stats: {
    statistics: "Statistiques",
    matchHistory: "Historique des matchs",
    headToHead: "Face à face",
    gamesPlayed: "Parties jouées",
    wins: "Victoires",
    losses: "Défaites",
    draws: "Nulles",
    winRate: "Taux de victoire",
    rating: "Classement",
    peakRating: "Meilleur classement",
    peak: "Pic",
    winStreak: "Série de victoires",
    currentStreak: "Série actuelle",
    bestStreak: "Meilleure série",
    performance: "Performance",
    achievements: "Succès",
    currentRating: "Classement actuel",
    totalGames: "Total de parties",
    noGames: "Aucune partie jouée",
    moves: "coups",
    won: "Gagné",
    lost: "Perdu",
    draw: "Nulle",
    overall: "Bilan global",
    yourWins: "Vos victoires",
    theirWins: "Leurs victoires",
    totalGamesPlayed: "Total : {{count}} parties",
    recentGames: "Parties récentes"
  },
  chess: {
    title: "Échecs",
    welcome: "Bienvenue aux Échecs",
    subtitle: "Jouez aux échecs avec vos amis et votre famille dans le monde entier",
    createGame: "Créer une partie",
    joinGame: "Rejoindre une partie",
    gameCode: "Code de la partie",
    enterGameCode: "Entrer le code de la partie",
    invalidGameCode: "Code de partie invalide. Doit contenir 6 caractères.",
    joinFailed: "Échec pour rejoindre la partie",
    join: "Rejoindre",
    create: "Créer",
    chooseColor: "Choisissez votre couleur",
    white: "Blancs",
    black: "Noirs",
    chatPlaceholder: "Tapez un message... (@bot pour des conseils)",
    botHint: "Mentionnez @bot dans votre message pour obtenir des conseils d'échecs de notre assistant IA",
    bot: "Assistant Échecs",
    mute: "Muet",
    unmute: "Activer le son",
    speaking: "participants",
    resign: "Abandonner",
    offerDraw: "Proposer la nulle",
    newGame: "Nouvelle partie",
    checkmate: "Échec et mat !",
    stalemate: "Pat",
    draw: "Nulle",
    resigned: "Partie abandonnée",
    reconnecting: "Reconnexion...",
    moveHistory: "Historique des coups",
    noMoves: "Aucun coup encore",
    showHints: "Afficher les indices",
    yourTurn: "Votre tour",
    opponentTurn: "Tour de l'adversaire",
    waitingForOpponent: "En attente de l'adversaire...",
    gameOver: "Partie terminée",
    sendingInvite: "Envoi de l'invitation à {{name}}...",
    inviteSent: "Invitation envoyée à {{name}} ! Code : {{code}}",
    inviteFailed: "Utilisateur introuvable. Veuillez vérifier le nom et réessayer.",
    inviteReceived: "{{name}} vous a invité à une partie d'échecs !",
    joinInvite: "Rejoindre la partie",
    challenge: "Défier",
    playedAsWhite: "Joué avec les Blancs",
    playedAsBlack: "Joué avec les Noirs",
    gameMode: "Mode de jeu",
    playVsFriend: "Jouer contre un ami",
    playVsBot: "Jouer contre le bot",
    difficulty: "Difficulté",
    easy: "Facile",
    medium: "Moyen",
    hard: "Difficile",
    chessBot: "Bot d'échecs"
  },
  youngsters: {
    title: "Jeunes",
    items: "éléments",
    empty: "Aucun contenu disponible",
    emptyHint: "Essayez une autre catégorie",
    exitYoungstersMode: "Quitter le mode Jeunes",
    exitDescription: "Entrez le code parental pour quitter",
    parentCode: "Code parental",
    confirm: "Confirmer",
    wrongCode: "Code incorrect",
    noContent: "Aucun contenu disponible",
    tryAnotherCategory: "Essayez de sélectionner une autre catégorie",
    categories: {
      all: "Tout",
      trending: "Tendances",
      news: "Actualités",
      culture: "Culture",
      educational: "Éducatif",
      music: "Musique",
      entertainment: "Divertissement",
      sports: "Sports",
      tech: "Technologie",
      judaism: "Judaïsme"
    },
    ageGroups: {
      "middle-school": "Collège (12-14 ans)",
      "high-school": "Lycée (15-17 ans)"
    },
    moderation: {
      pending: "En attente de révision",
      approved: "Approuvé",
      rejected: "Rejeté"
    },
    admin: {
      stats: "Gestionnaire de contenu Jeunes",
      seedContent: "Ajouter du contenu",
      importArchive: "Importer Archive.org",
      syncPodcasts: "Synchroniser les podcasts",
      syncYouTube: "Synchroniser YouTube",
      tagVod: "Taguer VOD",
      pendingModeration: "Modération en attente"
    }
  },
  widgets: {
    empty: "Pas encore de widgets",
    emptyHint: "Vos widgets apparaîtront ici",
    emptyPersonal: "Pas encore de widgets personnels",
    emptyPersonalHint: "Créez votre premier widget personnel ou ajoutez des widgets système ci-dessus",
    itemsTotal: "widgets au total",
    systemWidgets: "Widgets système",
    systemWidgetsHint: "Parcourir et ajouter des widgets à votre collection",
    myWidgets: "Mes widgets personnels",
    myWidgetsHint: "Widgets que vous avez créés",
    personalWidgets: "Mes widgets",
    noSystemWidgets: "Aucun widget système disponible",
    added: "Ajouté",
    add: "Ajouter",
    remove: "Supprimer",
    show: "Afficher",
    hidden: "Masqué",
    addToCollection: "Ajouter à mes widgets",
    removeFromCollection: "Retirer de mes widgets",
    contentTypes: {
      liveChannel: "Chaîne en direct",
      iframe: "Contenu web",
      podcast: "Podcast",
      radio: "Radio",
      vod: "Vidéo",
      custom: "Personnalisé",
      widget: "Widget"
    },
    form: {
      title: "Créer un widget",
      basicInfo: "Informations de base",
      titlePlaceholder: "Titre du widget",
      titleRequired: "Le titre du widget est requis",
      descriptionPlaceholder: "Description (optionnel)",
      iconPlaceholder: "Emoji icône (ex. : 📺)",
      content: "Contenu",
      fromLibrary: "Depuis la bibliothèque",
      iframe: "iFrame",
      selectContent: "Sélectionner le contenu (chaînes, podcasts, émissions, etc.)",
      iframeUrl: "URL iFrame",
      iframeUrlRequired: "L'URL iFrame est requise",
      iframeTitle: "Titre iFrame (pour l'accessibilité)",
      positionSize: "Position & Taille",
      behavior: "Comportement",
      mutedByDefault: "Muet par défaut",
      closable: "Fermable",
      draggable: "Déplaçable",
      widgetOrder: "Ordre du widget",
      orderPlaceholder: "Ordre (0 = premier)",
      saveWidget: "Enregistrer le widget",
      saving: "Enregistrement...",
      cancel: "Annuler",
      change: "Modifier"
    },
    intro: {
      title: "Bienvenue dans les Widgets",
      description: "Découvrez des widgets flottants puissants pour personnaliser votre expérience de visionnage",
      watchVideo: "Regarder l'introduction",
      skip: "Passer",
      dismiss: "Ne plus afficher",
      videoUnavailable: "Vidéo temporairement indisponible",
      loadingMartyJr: "Chargement de Marty Jr...",
      loadingWidgets: "Chargement de l'intro des widgets..."
    }
  },
  help: {
    title: "Aide",
    subtitle: "Comment pouvons-nous vous aider ?",
    email: "Support par e-mail",
    phone: "Support téléphonique",
    chat: "Chat en direct",
    chatAvailable: "Disponible 24h/24",
    openTooltip: "Ouvrir l'info-bulle d'aide",
    openHelp: "Ouvrir le menu d'aide",
    howTo: "Comment utiliser",
    relatedArticles: "Articles connexes",
    stillNeedHelp: "Besoin d'aide supplémentaire ?",
    contactSupport: "Contacter le support",
    previous: "Précédent",
    next: "Suivant",
    getStarted: "Commencer",
    skipTutorial: "Passer le tutoriel",
    actions: {
      search: "Rechercher dans l'aide",
      docs: "Documentation",
      faq: "FAQ",
      support: "Contacter le support",
      tutorial: "Voir le tutoriel"
    },
    search: {
      placeholder: "Rechercher dans l'aide...",
      noResults: "Aucun résultat trouvé pour \"{{query}}\"",
      noResultsHint: "Essayez d'autres mots-clés ou parcourez les catégories",
      recent: "Récent",
      popular: "Populaire"
    },
    categories: {
      "getting-started": "Premiers pas",
      features: "Fonctionnalités",
      judaism: "Judaïsme",
      "platform-guides": "Guides des plateformes",
      account: "Compte",
      troubleshooting: "Dépannage",
      parents: "Pour les parents",
      admin: "Guide administrateur",
      developer: "API développeur"
    },
    faq: {
      title: "Questions fréquemment posées",
      q1: "Comment puis-je changer mon plan d'abonnement ?",
      a1: "Allez dans Paramètres > Abonnement pour voir et changer votre plan actuel. Vous pouvez mettre à niveau ou rétrograder à tout moment.",
      q2: "Comment puis-je télécharger du contenu pour le visionnage hors ligne ?",
      a2: "Appuyez sur l'icône de téléchargement sur n'importe quel contenu pour le sauvegarder pour le visionnage hors ligne. Les téléchargements sont disponibles uniquement sur les appareils mobiles.",
      q3: "Pourquoi ma vidéo ne se lit-elle pas ?",
      a3: "Vérifiez votre connexion Internet. Si le problème persiste, essayez de vider le cache de l'application ou de redémarrer l'application.",
      q4: "Comment puis-je annuler mon abonnement ?",
      a4: "Vous pouvez annuler votre abonnement à tout moment via Paramètres > Abonnement > Annuler le plan. Vous continuerez à avoir accès jusqu'à la fin de votre période de facturation."
    },
    onboarding: {
      welcome: {
        title: "Bienvenue sur Bayit+",
        description: "Votre maison pour le divertissement israélien, partout dans le monde"
      },
      liveTv: {
        title: "TV en direct",
        description: "Regardez les chaînes israéliennes en direct, y compris les actualités, le sport et le divertissement"
      },
      vod: {
        title: "Contenu à la demande",
        description: "Parcourez les films, séries et documentaires à tout moment"
      },
      voice: {
        title: "Contrôle vocal",
        description: "Dites 'Bayit' pour contrôler l'application avec votre voix"
      },
      profiles: {
        title: "Profils familiaux",
        description: "Créez des profils pour chaque membre de la famille avec des recommandations personnalisées"
      }
    }
  },
  ritual: {
    title: "Rituel du matin",
    greeting: "Bonjour !",
    israelUpdate: "C'est l'après-midi en Israël, les nouvelles rapportent les développements en cours",
    recommendation: "Nous recommandons de commencer par les actualités du matin puis de passer à la radio",
    preparingRitual: "Préparation de votre rituel matinal...",
    israelTime: "Heure d'Israël",
    day: "Jour",
    letsStart: "Commençons",
    skipToday: "Passer pour aujourd'hui",
    finish: "Terminer",
    noContentNow: "Aucun contenu disponible maintenant",
    typeLive: "En direct",
    typeRadio: "Radio",
    typeVideo: "Vidéo"
  },
  watch: {
    notFound: "Contenu introuvable",
    backToHome: "Retour à l'accueil",
    episodes: "Épisodes",
    addToList: "Ajouter à la liste",
    like: "J'aime",
    share: "Partager",
    cast: "Casting",
    episodesList: "Épisodes",
    schedule: "Programme",
    now: "Maintenant",
    related: "Contenu associé",
    deleteEpisode: "Supprimer l'épisode",
    confirmDeleteEpisode: "Supprimer cet épisode ?"
  },
  support: {
    title: "Centre d'assistance",
    subtitle: "Comment pouvons-nous vous aider aujourd'hui ?",
    tabs: {
      docs: "Documentation",
      faq: "FAQ",
      videos: "Vidéos",
      contact: "Contact",
      tickets: "Mes tickets"
    },
    categories: {
      title: "Parcourir la documentation",
      loading: "Chargement de la documentation...",
      loadError: "Échec du chargement des catégories",
      articleCount: "{{count}} articles",
      gettingStarted: "Premiers pas",
      features: "Fonctionnalités",
      troubleshooting: "Dépannage",
      account: "Compte"
    },
    docs: {
      loading: "Chargement du document...",
      loadError: "Échec du chargement du document",
      backToList: "Retour à la documentation"
    },
    search: {
      placeholder: "Rechercher dans la documentation...",
      noResults: "Aucun résultat trouvé"
    },
    faq: {
      title: "Questions fréquemment posées",
      loading: "Chargement de la FAQ...",
      loadError: "Échec du chargement de la FAQ",
      empty: "Aucun élément FAQ dans cette catégorie",
      categories: {
        all: "Tous les sujets",
        general: "Général",
        billing: "Facturation",
        technical: "Technique",
        features: "Fonctionnalités"
      }
    },
    videos: {
      title: "Vidéos tutoriels",
      subtitle: "Apprenez à utiliser les fonctionnalités de Bayit+",
      widgetsIntro: "Premiers pas avec les widgets",
      widgetsDescription: "Apprenez à créer, personnaliser et gérer les widgets flottants"
    }
  },
  subtitles: {
    nikud: "Nikud",
    selection: "Sélection",
    translation: "Traduction",
    translating: "Traduction en cours...",
    close: "Fermer",
    unavailable: "Traduction non disponible",
    off: "Désactivé",
    none: "Aucun",
    autoGenerated: "Généré automatiquement",
    selectLanguage: "Sélectionner la langue des sous-titres",
    liveTranslate: "Traduction en direct",
    translateTo: "Traduire en",
    downloadMore: "Télécharger plus de sous-titres...",
    downloading: "Recherche sur OpenSubtitles...",
    opensubtitlesSource: "Depuis OpenSubtitles.com",
    downloadSuccess: "{{count}} sous-titre(s) téléchargé(s)",
    noSubtitlesFound: "Aucun sous-titre trouvé pour ce contenu"
  },
  dubbing: {
    title: "Doublage en direct",
    enabled: "Doublage en direct activé",
    selectLanguage: "Sélectionner la langue",
    originalAudio: "Audio original",
    dubbedAudio: "Audio doublé",
    selectVoice: "Sélectionner la voix",
    adjustVolume: "Ajuster le volume",
    tapToSelect: "Appuyez pour sélectionner cette langue",
    languages: {
      en: "English",
      es: "Español",
      he: "עברית",
      ar: "العربية",
      ru: "Русский",
      fr: "Français",
      de: "Deutsch"
    },
    onboarding: {
      title: "Présentation du doublage en direct",
      description: "Découvrez le contenu en direct dans votre langue. Notre IA traduit et relit l'audio en temps réel pendant que vous regardez.",
      feature1: "7 langues supportées",
      feature2: "Traitement en temps réel",
      feature3: "Ajustez la balance audio",
      tryNow: "Essayer maintenant",
      later: "Plus tard"
    },
    consent: {
      title: "Consentement au traitement audio",
      message: "Le doublage en direct traite votre audio en temps réel à l'aide de services IA. L'audio est traité uniquement pour la traduction et n'est pas stocké de façon permanente.",
      accept: "J'accepte",
      decline: "Non merci"
    },
    errors: {
      connectionFailed: "Échec de la connexion",
      connectionFailedMessage: "Impossible de se connecter au service de doublage",
      connectionFailedAction: "Vérifiez votre connexion Internet et réessayez",
      notAuthenticated: "Non authentifié",
      notAuthenticatedMessage: "Veuillez vous reconnecter",
      notAuthenticatedAction: "Connectez-vous pour utiliser le doublage en direct",
      premiumRequired: "Fonctionnalité Premium",
      premiumRequiredMessage: "Le doublage en direct nécessite un abonnement Premium",
      premiumRequiredAction: "Passez à Premium pour accéder à cette fonctionnalité"
    }
  },
  voice: {
    listening: "Écoute...",
    speaking: "Parle",
    ready: "Prêt",
    tapToSpeak: "Appuyez pour parler",
    processing: "Traitement...",
    transcribing: "Transcription...",
    tapToStop: "Appuyez pour arrêter l'enregistrement",
    pleaseWait: "Veuillez patienter...",
    transcriptionNotAvailable: "Transcription non disponible",
    transcriptionFailed: "Échec de la transcription",
    micPermissionDenied: "Permission du microphone refusée",
    error: "Je n'ai pas pu vous entendre, veuillez réessayer"
  },
  home: {
    continueWatching: "Continuer à regarder",
    featuredContent: "À la une",
    liveTV: "TV en direct",
    allChannels: "Toutes les chaînes",
    liveChannels: "Chaînes en direct",
    showOnlyWithSubtitles: "Afficher uniquement avec sous-titres",
    quickAccess: "Accès rapide",
    recentlyAdded: "Récemment ajouté",
    recommended: "Recommandé pour vous",
    watchAgain: "Regarder à nouveau",
    myList: "Ma liste",
    exploreAll: "Explorer tout"
  },
  breadcrumbs: {
    series: "Séries",
    movie: "Film",
    watching: "Visionnage",
    channel: "Chaîne",
    station: "Station",
    podcast: "Podcast",
    watchlist: "Liste de lecture",
    downloads: "Téléchargements",
    home: "Accueil",
    vod: "VOD",
    live: "En direct",
    radio: "Radio",
    podcasts: "Podcasts",
    profile: "Profil",
    settings: "Paramètres"
  },
  player: {
    loading: "Chargement...",
    retry: "Réessayer",
    error: "Erreur de lecture vidéo",
    back: "← Retour",
    liveBadge: "EN DIRECT",
    live: "EN DIRECT",
    play: "Lecture",
    pause: "Pause",
    mute: "Muet",
    unmute: "Activer le son",
    volume: "Volume",
    albumArt: "Pochette d'album pour {{title}}",
    seekBar: "Progression de la lecture",
    skipBack: "Reculer de {{seconds}} secondes",
    skipForward: "Avancer de 30 secondes",
    noStream: "Flux non disponible",
    loadError: "Échec du chargement du flux",
    settings: "Paramètres",
    subtitles: "Sous-titres",
    playbackSpeed: "Vitesse de lecture",
    quality: "Qualité",
    auto: "Auto",
    buffering: "Mise en mémoire tampon...",
    speed: "Vitesse"
  },
  podcasts: {
    title: "Podcasts",
    episodes: "épisodes",
    subscribe: "S'abonner",
    unsubscribe: "Se désabonner",
    subscribed: "Abonné",
    latestEpisode: "Dernier épisode",
    allEpisodes: "Tous les épisodes",
    sortBy: "Trier par",
    newestFirst: "Plus récent d'abord",
    oldestFirst: "Plus ancien d'abord",
    duration: "Durée",
    playbackSpeed: "Vitesse de lecture",
    sleepTimer: "Minuterie de sommeil",
    markAsPlayed: "Marquer comme lu",
    markAsUnplayed: "Marquer comme non lu",
    addToQueue: "Ajouter à la file",
    removeFromQueue: "Retirer de la file",
    categories: {
      all: "Tout",
      general: "Général",
      news: "Actualités",
      politics: "Politique",
      tech: "Tech",
      business: "Business",
      jewish: "Juif",
      entertainment: "Divertissement",
      sports: "Sports",
      history: "Histoire",
      educational: "Éducatif"
    }
  },
  cities: {
    discover: "Découvrir",
    events: "Événements",
    news: "Actualités",
    weather: "Météo",
    community: "Communauté",
    businesses: "Entreprises",
    restaurants: "Restaurants",
    synagogues: "Synagogues",
    schools: "Écoles",
    activities: "Activités"
  },
  passkey: {
    title: "Passkey",
    setup: "Configurer Passkey",
    description: "Connectez-vous de manière sécurisée sans mot de passe",
    create: "Créer un Passkey",
    creating: "Création du Passkey...",
    success: "Passkey créé avec succès",
    error: "Erreur de création du Passkey",
    remove: "Supprimer le Passkey",
    removeConfirm: "Êtes-vous sûr de vouloir supprimer ce Passkey ?",
    usePasskey: "Utiliser Passkey",
    authenticating: "Authentification...",
    notSupported: "Les Passkeys ne sont pas pris en charge sur cet appareil",
    learnMore: "En savoir plus sur les Passkeys",
    benefits: {
      secure: "Plus sécurisé que les mots de passe",
      fast: "Connexion rapide",
      noPassword: "Pas besoin de mémoriser un mot de passe"
    }
  }
};

deepMerge(fr, completeFr);

fs.writeFileSync('fr.json', JSON.stringify(fr, null, 2) + '\n');
console.log('Completed French translations');

function countKeys(obj) {
  let count = 0;
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      count += countKeys(obj[key]);
    } else {
      count++;
    }
  }
  return count;
}
console.log('Total keys:', countKeys(JSON.parse(fs.readFileSync('fr.json', 'utf8'))));
