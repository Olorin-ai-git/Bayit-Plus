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

// Final batch: remaining missing keys
const finalBatch = {
  common: {
    confirmDelete: "Confirmer la suppression",
    partialSuccess: "Succès partiel",
    dismiss: "Fermer",
    refreshing: "Actualisation...",
    refreshData: "Actualiser les données",
    dismissError: "Fermer l'erreur",
    closeHint: "Ferme l'écran actuel",
    cancelHint: "Annule l'action en cours",
    loadingArticle: "Chargement de l'article...",
    watch: "Regarder",
    noContent: "Aucun contenu disponible",
    premium: "PREMIUM",
    poweredBy: "Propulsé par"
  },
  watchParty: {
    createTitle: "Créer une Watch Party",
    joinTitle: "Rejoindre une fête",
    enterCode: "Entrez le code de la salle",
    roomCode: "Code de la salle",
    roomCodeHint: "Entrez le code à 8 caractères pour rejoindre la fête",
    copyCode: "Copier le code",
    codeCopied: "Code copié !",
    participants: "Participants",
    you: "Vous",
    leave: "Quitter la fête",
    end: "Terminer la fête",
    sendMessage: "Envoyer le message",
    typeMessage: "Tapez un message...",
    synced: "Synchronisé",
    syncing: "Synchronisation...",
    hostPaused: "L'hôte a mis en pause",
    userJoined: "{{name}} a rejoint",
    userLeft: "{{name}} est parti",
    partyEnded: "La fête est terminée",
    connecting: "Connexion...",
    options: {
      chatEnabled: "Activer le chat",
      syncPlayback: "Synchroniser la lecture"
    },
    errors: {
      invalidCode: "Code invalide",
      partyFull: "La fête est complète",
      partyEnded: "La fête est terminée",
      connectionError: "Erreur de connexion",
      createFailed: "Échec de la création de la fête",
      joinFailed: "Échec de l'adhésion à la fête"
    },
    audio: {
      mute: "Muet",
      unmute: "Réactiver le son",
      speaking: "Parle",
      connecting: "Connexion audio...",
      noAudio: "Audio non disponible",
      muteHint: "Coupe votre microphone",
      unmuteHint: "Réactive votre microphone pour parler"
    },
    endParty: "Terminer la fête",
    toggleEmoji: "Basculer le sélecteur d'emoji",
    toggleEmojiHint: "Ouvre le sélecteur rapide d'emoji pour les réactions",
    sendEmoji: "Envoyer {{emoji}}",
    sendEmojiHint: "Envoie une réaction emoji au chat",
    emojiPicker: "Sélecteur d'emoji",
    chatInput: "Champ de message chat",
    chatInputHint: "Tapez un message à envoyer au chat de la fête",
    sendMessageHint: "Envoie votre message au chat de la fête",
    copyCodeHint: "Copie le code de la salle dans le presse-papiers",
    shareHint: "Partager le lien de la fête ou copier le code",
    copied: "Copié !",
    endPartyHint: "Termine la fête pour tous les participants",
    leavePartyHint: "Quitte la fête sans la terminer",
    buttonHint: "Ouvre le menu pour créer ou rejoindre une watch party",
    createHint: "Crée une nouvelle watch party",
    joinHint: "Rejoint une watch party existante avec un code",
    emojiPickerHint: "Affiche les réactions emoji rapides",
    chatEnabledHint: "Active le chat pour les participants",
    syncPlaybackHint: "Garde la lecture synchronisée avec l'hôte",
    createPartyHint: "Crée la fête avec les options sélectionnées",
    joinPartyHint: "Rejoint la fête avec le code entré",
    closePanelHint: "Ferme le panneau de watch party",
    cancelHint: "Annule et ferme la boîte de dialogue",
    viewPartyHint: "Ouvre le panneau de watch party",
    panel: "Panneau Watch Party"
  },
  friends: {
    title: "Amis",
    add: "Ajouter un ami",
    remove: "Supprimer l'ami",
    search: "Rechercher des amis",
    pending: "En attente",
    accepted: "Accepté",
    online: "En ligne",
    offline: "Hors ligne",
    watching: "Regarde",
    invite: "Inviter à regarder",
    noFriends: "Aucun ami pour le moment",
    addFirst: "Ajoutez des amis pour regarder ensemble",
    requests: "Demandes d'amis",
    accept: "Accepter",
    decline: "Refuser",
    sent: "Demande envoyée",
    sendRequest: "Envoyer une demande",
    cancelRequest: "Annuler la demande",
    unfriend: "Retirer de mes amis",
    block: "Bloquer",
    unblock: "Débloquer",
    blocked: "Bloqué",
    activity: "Activité des amis",
    lastSeen: "Vu {{time}}",
    findFriends: "Trouver des amis",
    suggestedFriends: "Amis suggérés",
    mutualFriends: "{{count}} ami(s) en commun",
    inviteVia: "Inviter via",
    shareLink: "Partager le lien",
    qrCode: "Code QR"
  },
  chess: {
    title: "Échecs",
    newGame: "Nouvelle partie",
    playOnline: "Jouer en ligne",
    playFriend: "Jouer avec un ami",
    playComputer: "Jouer contre l'ordinateur",
    difficulty: "Difficulté",
    easy: "Facile",
    medium: "Moyen",
    hard: "Difficile",
    yourTurn: "Votre tour",
    opponentTurn: "Tour de l'adversaire",
    check: "Échec",
    checkmate: "Échec et mat",
    stalemate: "Pat",
    draw: "Nulle",
    resign: "Abandonner",
    offerDraw: "Proposer la nulle",
    acceptDraw: "Accepter la nulle",
    declineDraw: "Refuser la nulle",
    rematch: "Revanche",
    gameOver: "Partie terminée",
    youWin: "Vous avez gagné !",
    youLose: "Vous avez perdu",
    itsADraw: "C'est une nulle",
    moveHistory: "Historique des coups",
    timeRemaining: "Temps restant"
  },
  stats: {
    favoriteCategory: "Catégorie préférée",
    topChannels: "Chaînes préférées",
    topShows: "Émissions préférées",
    sessionHistory: "Historique des sessions",
    weeklyReport: "Rapport hebdomadaire",
    monthlyReport: "Rapport mensuel",
    yearlyReport: "Rapport annuel",
    exportData: "Exporter les données",
    compareLastWeek: "Comparé à la semaine dernière",
    compareLastMonth: "Comparé au mois dernier",
    noStats: "Aucune statistique disponible",
    startWatching: "Commencez à regarder pour voir vos stats",
    totalContent: "Contenu total regardé",
    uniqueShows: "Émissions uniques",
    uniqueChannels: "Chaînes uniques",
    peakHours: "Heures de pointe",
    avgDaily: "Moyenne quotidienne",
    weekdayVsWeekend: "Semaine vs Weekend",
    contentBreakdown: "Répartition du contenu",
    byGenre: "Par genre",
    byLanguage: "Par langue",
    byDevice: "Par appareil",
    downloadReport: "Télécharger le rapport"
  },
  widgets: {
    enabled: "Widgets activés",
    disabled: "Widgets désactivés",
    position: "Position",
    opacity: "Opacité",
    autoHide: "Masquage automatique",
    autoHideDelay: "Délai de masquage",
    showOnStartup: "Afficher au démarrage",
    preview: "Aperçu",
    applyToAll: "Appliquer à tous",
    resetDefaults: "Réinitialiser par défaut",
    noWidgets: "Aucun widget disponible",
    addWidget: "Ajouter un widget",
    removeWidget: "Supprimer le widget",
    configureWidget: "Configurer le widget",
    widgetSettings: "Paramètres du widget",
    livePreview: "Aperçu en direct",
    dragToReorder: "Glissez pour réorganiser",
    clickToSelect: "Cliquez pour sélectionner",
    availableWidgets: "Widgets disponibles",
    activeWidgets: "Widgets actifs",
    maxWidgets: "Maximum de widgets atteint",
    selectContent: "Sélectionner le contenu"
  },
  help: {
    title: "Aide",
    searchHelp: "Rechercher dans l'aide",
    categories: "Catégories",
    popularArticles: "Articles populaires",
    gettingStarted: "Premiers pas",
    account: "Compte et facturation",
    playback: "Lecture",
    devices: "Appareils",
    troubleshooting: "Dépannage",
    contact: "Nous contacter",
    liveChat: "Chat en direct",
    email: "Email",
    phone: "Téléphone",
    availableHours: "Disponible {{hours}}",
    responseTime: "Temps de réponse : {{time}}",
    wasHelpful: "Cet article était-il utile ?",
    yes: "Oui",
    no: "Non",
    feedbackThanks: "Merci pour votre retour",
    relatedArticles: "Articles connexes",
    viewAll: "Voir tout",
    backToHelp: "Retour à l'aide"
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
  },
  dubbing: {
    title: "Doublage",
    enabled: "Doublage activé",
    disabled: "Doublage désactivé",
    targetLanguage: "Langue cible",
    sourceLanguage: "Langue source",
    quality: "Qualité",
    delay: "Délai audio",
    processing: "Traitement du doublage...",
    unavailable: "Doublage non disponible"
  },
  ritual: {
    time: "Heure",
    now: "Maintenant",
    upcoming: "À venir",
    customize: "Personnaliser",
    skip: "Passer",
    addContent: "Ajouter du contenu",
    removeContent: "Supprimer le contenu",
    defaultRitual: "Rituel par défaut",
    customRitual: "Rituel personnalisé",
    saveRitual: "Enregistrer le rituel",
    resetRitual: "Réinitialiser le rituel"
  },
  watch: {
    season: "Saison",
    selectSeason: "Sélectionner la saison",
    nextEpisode: "Épisode suivant",
    previousEpisode: "Épisode précédent",
    playFromStart: "Lire depuis le début",
    resumePlayback: "Reprendre la lecture",
    addToFavorites: "Ajouter aux favoris",
    removeFromFavorites: "Retirer des favoris",
    trailer: "Bande-annonce"
  },
  youngsters: {
    categories: {
      anime: "Anime",
      education: "Éducation",
      reality: "Téléréalité"
    },
    safeMode: "Mode sécurisé",
    timeLimits: "Limites de temps",
    setTimeLimit: "Définir une limite de temps",
    timeRemaining: "Temps restant : {{time}}",
    timeLimitReached: "Limite de temps atteinte",
    askParent: "Demander à un parent"
  },
  voice: {
    settings: "Paramètres vocaux",
    language: "Langue de reconnaissance",
    sensitivity: "Sensibilité"
  },
  home: {
    quickAccess: "Accès rapide",
    recentlyAdded: "Récemment ajouté",
    recommended: "Recommandé pour vous",
    watchAgain: "Regarder à nouveau",
    myList: "Ma liste",
    exploreAll: "Explorer tout"
  },
  breadcrumbs: {
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
    buffering: "Mise en mémoire tampon...",
    error: "Erreur de lecture",
    retry: "Réessayer",
    quality: "Qualité",
    speed: "Vitesse"
  },
  support: {
    openTicket: "Ouvrir un ticket",
    ticketHistory: "Historique des tickets",
    ticketStatus: "Statut du ticket",
    pending: "En attente",
    inProgress: "En cours",
    resolved: "Résolu",
    closed: "Fermé",
    reopen: "Rouvrir",
    addComment: "Ajouter un commentaire",
    attachFile: "Joindre un fichier"
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
  podcasts: {
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
    removeFromQueue: "Retirer de la file"
  }
};

deepMerge(fr, finalBatch);

fs.writeFileSync('fr.json', JSON.stringify(fr, null, 2) + '\n');
console.log('Added final batch to fr.json');

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
