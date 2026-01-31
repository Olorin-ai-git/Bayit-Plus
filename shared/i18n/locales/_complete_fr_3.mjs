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

// Third batch of missing translations
const completeFr3 = {
  profile: {
    title: "Mon profil",
    profileDetails: "Détails du profil",
    name: "Nom",
    notSet: "Non défini",
    email: "E-mail",
    editProfile: "Modifier le profil",
    notificationSettings: "Paramètres de notification",
    security: "Sécurité",
    changePassword: "Changer le mot de passe",
    updatePassword: "Mettre à jour votre mot de passe",
    connectedDevices: "Appareils connectés",
    manageDevices: "Gérer les appareils connectés à votre compte",
    twoFactorAuth: "Authentification à deux facteurs",
    addExtraSecurity: "Ajouter une couche de sécurité supplémentaire",
    address: {
      line1: "123 Rue Principale",
      line2: "Tel Aviv, Israël 6100000"
    },
    free: "Gratuit",
    premiumPrice: "7,99 $/mois",
    familyPrice: "12,99 $/mois",
    remaining: "restant",
    notifications: "Notifications",
    guest: "Invité",
    morningRitual: "Rituel matinal",
    watchlist: "Liste de lecture",
    favorites: "Favoris",
    downloads: "Téléchargements",
    settings: "Paramètres",
    language: "Langue",
    admin: "Admin",
    watchTime: "Temps de visionnage",
    minutes: "minutes",
    hours: "heures",
    logout: "Se déconnecter",
    premium: "Premium",
    basic: "Basic",
    upgrade: "Passer à Premium",
    memberSince: "Membre depuis",
    aiAssistant: "Assistant IA",
    voiceSettings: "Voix",
    subscriptionButton: "Abonnement",
    recentActivity: "Activité récente",
    justNow: "À l'instant",
    hoursAgo: "il y a {{hours}} heures",
    yesterday: "Hier",
    noRecentActivity: "Aucune activité récente",
    accountInfo: "Informations du compte",
    role: "Rôle",
    accountSecurity: "Sécurité du compte",
    securityNote: "Votre compte est sécurisé avec une authentification cryptée",
    lastLogin: "Dernière connexion",
    dangerZone: "Zone de danger",
    invalidImageType: "Veuillez sélectionner un fichier image valide (JPEG, PNG, WebP ou GIF)",
    imageTooLarge: "L'image est trop grande. La taille maximale est de 5 Mo.",
    uploadSuccess: "Avatar mis à jour avec succès !",
    uploadFailed: "Échec du téléversement de l'avatar. Veuillez réessayer.",
    complimentaryPremium: "ACCÈS PREMIUM OFFERT",
    emailVerified: "E-mail vérifié",
    emailUnverified: "E-mail non vérifié",
    phoneVerified: "Téléphone vérifié",
    phoneUnverified: "Téléphone non vérifié",
    completeVerification: "Complétez la vérification pour débloquer toutes les fonctionnalités",
    unlockPremium: "Débloquer les fonctionnalités Premium",
    unlockPremiumDescription: "Passez à niveau pour profiter de contenu et fonctionnalités exclusifs"
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
  cities: {
    title: "Villes",
    subtitle: "Découvrez les communautés israéliennes",
    explore: "Explorer",
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
  home: {
    israeliMovies: "Films israéliens",
    "israeli-movies": "Films israéliens",
    "israeli-series": "Séries israéliennes",
    action: "Action & Thriller",
    comedy: "Comédie",
    drama: "Drame",
    documentaries: "Documentaires",
    loadingContent: "Chargement du contenu...",
    liveNow: "En direct maintenant",
    trendingInIsrael: "Tendances en Israël",
    jerusalemConnection: "Connexion Jérusalem",
    telAvivConnection: "Connexion Tel Aviv",
    categories: "Catégories",
    israelis_in_city: "Israéliens à {{city}}, {{state}}",
    israeli_businesses: "Entreprises israéliennes à {{city}}, {{state}}",
    israeli_businesses_nearby: "Entreprises israéliennes près de vous - De {{city}}",
    searching_businesses: "Recherche d'entreprises israéliennes à {{city}}...",
    no_businesses_found: "Aucune entreprise israélienne trouvée à {{city}}",
    businesses_load_error: "Impossible de charger les entreprises. Veuillez réessayer.",
    carousel: {
      fauda: {
        title: "Fauda",
        subtitle: "Saison 4 - En streaming maintenant",
        description: "La série israélienne à succès revient pour une quatrième saison pleine de suspense et d'action"
      },
      shtisel: {
        title: "Shtisel",
        subtitle: "Toutes les saisons disponibles",
        description: "Suivez la famille Shtisel dans le quartier ultra-orthodoxe de Jérusalem"
      },
      tehran: {
        title: "Téhéran",
        subtitle: "Saison 2",
        description: "Un agent du Mossad en mission dangereuse en Iran"
      },
      live: {
        title: "En direct - Kan 11",
        subtitle: "Regarder maintenant",
        description: "Actualités, affaires courantes et contenu de qualité"
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
    emptyDescription: "Essayez de sélectionner une autre catégorie",
    allContent: "Tout le contenu",
    noContent: "Aucun contenu disponible",
    noContentInCategory: "Aucun contenu trouvé dans cette catégorie"
  },
  children: {
    title: "Enfants",
    items: "éléments",
    empty: "Aucun contenu disponible",
    emptyHint: "Essayez une autre catégorie",
    exitKidsMode: "Quitter le mode Enfants",
    exitDescription: "Entrez le code parental pour quitter",
    parentCode: "Code parental",
    confirm: "Confirmer",
    wrongCode: "Code incorrect",
    noContent: "Aucun contenu disponible",
    tryAnotherCategory: "Essayez de sélectionner une autre catégorie",
    ageRatings: {
      "3": "3 ans et +",
      "5": "5 ans et +",
      "7": "7 ans et +",
      "10": "10 ans et +",
      "12": "12 ans et +"
    },
    moderation: {
      pending: "En attente de révision",
      approved: "Approuvé",
      rejected: "Rejeté"
    },
    admin: {
      stats: "Gestionnaire de contenu Enfants",
      seedContent: "Ajouter du contenu",
      importArchive: "Importer Archive.org",
      syncPodcasts: "Synchroniser les podcasts",
      syncYouTube: "Synchroniser YouTube",
      tagVod: "Taguer VOD",
      pendingModeration: "Modération en attente"
    }
  },
  video: {
    watchTrailer: "Regarder la bande-annonce",
    closeTrailer: "Fermer la bande-annonce",
    deleteConfirm: "Supprimer cet épisode ?"
  },
  nav: {
    games: "Jeux",
    friends: "Amis"
  },
  search: {
    loadingMore: "Chargement de plus de résultats...",
    viewMode: {
      grid: "Grille",
      list: "Liste",
      cards: "Cartes"
    },
    empty: {
      clearSearch: "Effacer la recherche"
    }
  },
  player: {
    previousChapter: "Chapitre précédent",
    nextChapter: "Chapitre suivant",
    skipBackward: "Reculer de 30 secondes",
    restart: "Reprendre depuis le début",
    subtitlesOff: "Désactivés",
    liveChat: "Chat en direct",
    liveTrivia: "Quiz en direct",
    showAIFeatures: "Afficher les fonctionnalités IA",
    hideAIFeatures: "Masquer les fonctionnalités IA",
    subscription: {
      requiredTitle: "Abonnement requis",
      requiredMessage: "nécessite un abonnement payant",
      upgradeInfo: "Passez à niveau pour accéder au contenu premium",
      upgrade: "Mettre à niveau maintenant"
    },
    chapters: "Chapitres",
    sceneSearch: {
      title: "Rechercher des scènes",
      placeholder: "Rechercher une scène...",
      inputLabel: "Entrée de recherche de scène",
      searching: "Recherche...",
      noResults: "Aucune scène trouvée",
      resultsFound: "{{count}} scènes trouvées",
      searchError: "Échec de la recherche. Veuillez réessayer.",
      hint: "Tapez au moins 2 caractères pour rechercher",
      voiceReceived: "Recherche de : {{query}}",
      seekingTo: "Saut vers {{time}}",
      previous: "Précédent",
      next: "Suivant",
      result: {
        jumpTo: "Aller à {{title}} à {{time}}",
        hint: "Appuyez pour sauter à cette scène"
      },
      panelOpened: "Panneau de recherche de scène ouvert",
      navigation: "Navigation de recherche de scène",
      position: "Résultat {{current}} sur {{total}}"
    },
    streamLimit: {
      title: "Limite de flux atteinte",
      message: "Vous avez atteint le nombre maximum de flux simultanés ({{maxStreams}}) pour votre plan.",
      activeDevices: "En streaming sur {{count}} appareil(s) :",
      hint: "Déconnectez un appareil pour libérer un créneau de streaming, ou passez à niveau pour plus de flux simultanés.",
      manageDevices: "Gérer les appareils"
    }
  },
  judaism: {
    title: "Judaïsme",
    items: "éléments",
    empty: "Aucun contenu disponible",
    emptyHint: "Essayez de sélectionner une autre catégorie",
    dashboard: "Votre tableau de bord juif",
    categories: {
      news: "Actualités juives",
      community: "Communauté"
    },
    shabbat: {
      title: "Horaires de Shabbat",
      shabbatShalom: "Shabbat Shalom !",
      shabbatMode: "Mode Shabbat",
      endsIn: "Shabbat se termine dans",
      candleLighting: "Allumage des bougies",
      havdalah: "Havdalah",
      parashat: "Parashat",
      friday: "Vendredi",
      saturday: "Samedi",
      noData: "Impossible de charger les horaires de Shabbat"
    },
    erevShabbat: {
      title: "Erev Shabbat",
      prepareFor: "Préparez-vous pour Shabbat",
      inTime: "dans {{time}}",
      featuredContent: "Contenu Shabbat",
      noContent: "Contenu Shabbat bientôt disponible !",
      shabbatShalom: "Shabbat Shalom !",
      timeUntil: "Temps jusqu'à Shabbat",
      shabbatSongs: "Chants de Shabbat",
      parashaStudy: "Parasha",
      shabbatRecipes: "Recettes",
      prayers: "Prières"
    }
  },
  chat: {
    title: "Assistant Bayit+",
    greeting: "Bonjour ! Je suis l'assistant intelligent Bayit+. Comment puis-je vous aider aujourd'hui ? Cliquez sur le microphone et parlez, ou tapez un message."
  },
  taxonomy: {
    genre: "Genre",
    category: "Catégorie"
  },
  auth: {
    login: "Connexion"
  },
  flows: {
    tv: {
      useCompanion: "Pour une personnalisation complète, utilisez l'application Bayit+ sur votre téléphone ou visitez bayit.plus sur votre ordinateur."
    }
  },
  empty: {
    tryLater: "Réessayez plus tard",
    noResults: "Aucun résultat trouvé"
  }
};

deepMerge(fr, completeFr3);

fs.writeFileSync('fr.json', JSON.stringify(fr, null, 2) + '\n');
console.log('Completed French translations - batch 3');

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
