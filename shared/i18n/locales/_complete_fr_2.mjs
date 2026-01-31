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

// Second batch of missing translations
const completeFr2 = {
  profile: {
    voice: {
      voiceOnlyInfo: "Mode voix uniquement",
      voiceOnlyDetails: "Dites \"Salut Bayit\" pour activer. Télécommande désactivée. Naviguez entièrement avec les commandes vocales.",
      hybridInfo: "Mode hybride",
      hybridDetails: "Utilisez la voix ou la télécommande. Retour vocal sur les actions non vocales.",
      classicInfo: "Mode classique",
      classicDetails: "Toutes les fonctionnalités vocales désactivées. Télécommande uniquement.",
      textToSpeech: "Réponses vocales",
      ttsEnabled: "Activer les réponses vocales",
      ttsEnabledDesc: "L'application parlera les réponses à vos commandes vocales",
      ttsVolume: "Volume de la voix",
      ttsSpeed: "Vitesse de parole",
      hybridFeedback: "Retour interactif",
      voiceFeedback: "Retour vocal sur les actions",
      voiceFeedbackDesc: "Obtenez une confirmation vocale lorsque vous utilisez la télécommande ou cliquez sur des boutons",
      feedbackExample: "Exemple : Cliquez sur un film → L'application dit \"Lecture de [Nom du film]\"",
      state: {
        idle: "Prêt",
        listening: "Écoute...",
        processing: "Traitement...",
        speaking: "Parle",
        error: "Erreur"
      },
      avatar: {
        descriptions: {
          full: "Assistant complet avec animations, transcription et interaction vocale complète",
          compact: "Panneau assistant flottant circulaire avec animations",
          minimal: "Barre de forme d'onde avec indicateur de statut uniquement",
          iconOnly: "Masqué - seul le bouton microphone est visible"
        },
        features: {
          wizard: "Personnage assistant",
          animations: "Gestes animés",
          waveform: "Forme d'onde audio",
          transcript: "Transcription en direct"
        },
        closePanel: "Fermer le panneau vocal",
        closePanelHint: "Appuyez pour fermer le panneau d'interaction vocale",
        audioVisualization: "Visualisation audio",
        compactMode: "Assistant vocal compact",
        wizardAvatar: "Avatar de l'assistant",
        wizardCharacter: "Personnage assistant Olorin",
        fullMode: "Assistant vocal plein écran",
        wizardInteraction: "Interaction vocale avec l'assistant",
        openVoice: "Ouvrir l'assistant vocal",
        openVoiceHint: "Activer l'interaction vocale avec l'assistant Olorin",
        wizardHat: "Icône chapeau de magicien"
      },
      gesture: {
        browsing: "Assistant parcourt",
        cheering: "Assistant applaudit",
        clapping: "Assistant tape des mains",
        conjuring: "Assistant fait de la magie",
        crying: "Assistant pleure",
        shrugging: "Assistant hausse les épaules",
        facepalm: "Assistant facepalm"
      },
      settings: {
        clearHistoryConfirm: "Effacer l'historique des commandes",
        clearHistoryMessage: "Êtes-vous sûr de vouloir supprimer tout l'historique des commandes vocales ?",
        resetConfirm: "Réinitialiser les paramètres",
        resetMessage: "Réinitialiser les paramètres vocaux aux valeurs par défaut ?",
        historyCleared: "Historique des commandes effacé",
        success: "Succès"
      }
    },
    dropdown: {
      myProfile: "Mon profil",
      subscription: "Abonnement",
      favorites: "Favoris",
      downloads: "Téléchargements",
      signOut: "Se déconnecter"
    }
  },
  voiceMode: {
    voiceOnly: "Voix uniquement",
    voiceOnlyDesc: "Pas de télécommande - navigation vocale complète",
    hybrid: "Hybride",
    hybridDesc: "Voix + Télécommande - retour vocal sur les actions",
    classic: "Classique",
    classicDesc: "Pas de voix - télécommande uniquement"
  },
  clock: {
    israel: "Israël",
    local: "Local",
    shabbatShalom: "Shabbat Shalom !",
    erevShabbat: "Erev Shabbat",
    candleLighting: "Allumage des bougies",
    parasha: "Parasha"
  },
  trending: {
    title: "Tendances en Israël",
    noTopics: "Aucun sujet tendance disponible",
    topStory: "À LA UNE",
    sources: "Sources",
    categories: {
      security: "Sécurité",
      politics: "Politique",
      tech: "Tech",
      culture: "Culture",
      sports: "Sports",
      economy: "Économie",
      entertainment: "Divertissement",
      weather: "Météo",
      health: "Santé",
      general: "Général"
    }
  },
  cultureCities: {
    connectionTo: "Connexion {{city}}",
    explore: "Explorer {{city}}",
    noContent: "Aucun contenu disponible pour cette ville",
    categories: {
      all: "Tout",
      history: "Histoire",
      culture: "Culture",
      finance: "Finance",
      tech: "Tech",
      food: "Cuisine",
      expat: "Vie d'expatrié",
      news: "Actualités",
      entertainment: "Divertissement"
    }
  },
  watchParty: {
    title: "Watch Party",
    create: "Créer une fête",
    join: "Rejoindre",
    active: "Fête active",
    host: "Hôte",
    chat: "Chat",
    textOnlyMode: "Chat texte uniquement"
  },
  chapters: {
    title: "Chapitres",
    noChapters: "Aucun chapitre disponible",
    generating: "Génération des chapitres...",
    jumpTo: "Aller à",
    current: "Maintenant",
    categories: {
      intro: "Introduction",
      news: "Actualités",
      security: "Sécurité",
      politics: "Politique",
      economy: "Économie",
      sports: "Sports",
      weather: "Météo",
      culture: "Culture",
      conclusion: "Conclusion"
    }
  },
  live: {
    title: "TV en direct",
    next: "Suivant :",
    noChannels: "Aucune chaîne disponible",
    tryLater: "Réessayez plus tard",
    categories: {
      all: "Tout",
      news: "Actualités",
      entertainment: "Divertissement",
      sports: "Sports",
      kids: "Enfants",
      music: "Musique"
    }
  },
  support: {
    contact: {
      title: "Nous contacter",
      subtitle: "Choisissez comment vous souhaitez nous contacter",
      email: {
        title: "Support par e-mail",
        description: "Obtenez une réponse dans les 24 heures",
        action: "Envoyer un e-mail"
      },
      phone: {
        title: "Support téléphonique",
        description: "Parlez à un représentant",
        action: "Appeler maintenant"
      },
      chat: {
        title: "Chat en direct",
        description: "Discutez avec notre équipe de support",
        action: "Démarrer le chat"
      }
    },
    tickets: {
      title: "Mes tickets de support",
      empty: "Aucun ticket de support",
      emptyHint: "Vos demandes de support apparaîtront ici",
      new: "Nouveau ticket",
      status: {
        open: "Ouvert",
        pending: "En attente",
        resolved: "Résolu",
        closed: "Fermé"
      }
    }
  },
  jerusalem: {
    title: "Connexion Jérusalem",
    subtitle: "Actualités et culture de la ville sainte",
    weather: "Météo à Jérusalem",
    time: "Heure à Jérusalem"
  },
  telAviv: {
    title: "Connexion Tel Aviv",
    subtitle: "Actualités et culture de la ville qui ne dort jamais",
    weather: "Météo à Tel Aviv",
    time: "Heure à Tel Aviv"
  },
  epg: {
    smartSearch: "Recherche intelligente",
    smartSearchSubtitle: "Posez des questions en langage naturel",
    smartSearchPlaceholder: "ex. : Montrez-moi toutes les émissions avec l'actrice Tali Sharon ce soir"
  },
  vod: {
    allCategories: "Tout",
    emptyTitle: "Aucun contenu disponible",
    emptyDescription: "Essayez de sélectionner une autre catégorie"
  },
  empty: {
    noContent: "Aucun contenu disponible",
    tryAnotherCategory: "Essayez de sélectionner une autre catégorie",
    noPodcasts: "Aucun podcast disponible"
  },
  children: {
    categories: {
      all: "Tout",
      cartoons: "Dessins animés",
      educational: "Éducatif",
      music: "Musique",
      hebrew: "Hébreu",
      stories: "Histoires",
      jewish: "Juif"
    }
  },
  podcasts: {
    noPodcasts: "Aucun podcast disponible",
    tryLater: "Réessayez plus tard",
    selectLanguage: "Langue audio",
    switchToLanguage: "Passer en {{language}}",
    languageSwitched: "Lecture maintenant en {{language}}",
    availableInLanguage: "Disponible en {{language}}",
    availableLanguages: "Disponible en plusieurs langues",
    downloadForOffline: "Télécharger pour écouter hors ligne",
    downloadProgress: "Téléchargement {{progress}}%",
    downloaded: "Téléchargé",
    downloadFailed: "Échec du téléchargement",
    retryDownload: "Réessayer le téléchargement",
    deleteDownload: "Supprimer le téléchargement",
    confirmDelete: "Supprimer l'audio téléchargé ?",
    quality: {
      label: "Qualité audio",
      low: "Basse (64 kbps) - Économiser les données",
      medium: "Moyenne (96 kbps) - Équilibré",
      high: "Haute (128 kbps) - Meilleure qualité"
    },
    languages: {
      he: {
        short: "Hébreu",
        full: "Hébreu"
      },
      en: {
        short: "Anglais",
        full: "Anglais"
      }
    },
    player: {
      switchingLanguage: "Changement de langue audio...",
      languageSwitchError: "Impossible de changer de langue",
      loadingTranslation: "Chargement de l'audio traduit...",
      translationUnavailable: "Traduction pas encore disponible"
    },
    onboarding: {
      multiLanguageTitle: "Audio multilingue",
      multiLanguageDescription: "Ce podcast est disponible en hébreu et en anglais. Appuyez sur le sélecteur de langue pour changer.",
      downloadTitle: "Écouter hors ligne",
      downloadDescription: "Téléchargez des épisodes pour écouter sans connexion Internet.",
      gotIt: "Compris"
    }
  },
  dubbing: {
    errors: {
      channelUnavailable: "Non disponible",
      channelUnavailableMessage: "Le doublage n'est pas disponible pour cette chaîne",
      audioCaptureError: "Erreur de microphone",
      audioCaptureErrorMessage: "Impossible d'accéder à votre microphone",
      sttServiceError: "Erreur de reconnaissance vocale",
      sttServiceErrorMessage: "Échec de la reconnaissance vocale",
      ttsServiceError: "Erreur de doublage",
      ttsServiceErrorMessage: "Échec de la génération de l'audio doublé",
      translationTimeout: "Délai de traduction dépassé",
      translationTimeoutMessage: "La traduction a pris trop de temps, nouvelle tentative",
      websocketClosed: "Connexion perdue",
      websocketClosedMessage: "La connexion de doublage a été fermée",
      rateLimitExceeded: "Trop de tentatives",
      rateLimitExceededMessage: "Veuillez attendre avant de réessayer",
      sessionTimeout: "Session expirée",
      sessionTimeoutMessage: "Votre session de doublage a expiré"
    }
  },
  home: {
    israeliMovies: "Films israéliens",
    "israeli-movies": "Films israéliens",
    "israeli-series": "Séries israéliennes",
    action: "Action & Thriller",
    comedy: "Comédie",
    drama: "Drame",
    documentaries: "Documentaires",
    loadingContent: "Chargement du contenu..."
  },
  cities: {
    title: "Villes",
    subtitle: "Découvrez les communautés israéliennes",
    explore: "Explorer"
  },
  passkey: {
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
    learnMore: "En savoir plus sur les Passkeys"
  }
};

deepMerge(fr, completeFr2);

fs.writeFileSync('fr.json', JSON.stringify(fr, null, 2) + '\n');
console.log('Completed French translations - batch 2');

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
