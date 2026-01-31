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

// Final batch - all remaining missing translations
const completeFrFinal = {
  flows: {
    title: "Flux",
    subtitle: "Expériences de contenu personnalisées pour chaque moment",
    activeNow: "Actif maintenant",
    start: "Démarrer",
    skipToday: "Passer pour aujourd'hui",
    systemFlows: "Flux prédéfinis",
    customFlows: "Mes flux",
    system: "Système",
    noCustomFlows: "Pas encore de flux personnalisés",
    createHint: "Créez votre premier flux personnalisé",
    createCustom: "Créer un flux personnalisé",
    createFlow: "Créer un flux",
    editFlow: "Modifier le flux",
    type: "Type",
    systemFlow: "Flux système",
    customFlow: "Flux personnalisé",
    schedule: "Programmer",
    content: "Contenu",
    items: "éléments",
    aiGenerated: "Généré par IA",
    autoPlay: "Lecture automatique",
    aiEnabled: "Curation IA",
    shabbatTrigger: "Soir de Shabbat",
    manual: "Manuel",
    flowName: "Nom du flux",
    flowNamePlaceholder: "ex. : Ma routine matinale",
    description: "Description",
    descriptionPlaceholder: "À quoi sert ce flux ?",
    startTime: "Heure de début",
    endTime: "Heure de fin",
    actions: "Actions",
    details: "Détails",
    createFlowDesc: "Concevez votre expérience de contenu personnalisée",
    editFlowDesc: "Mettez à jour les paramètres et le contenu de votre flux",
    basicInfo: "Informations de base",
    options: "Options",
    autoPlayDesc: "Lire automatiquement l'élément suivant à la fin du précédent",
    aiEnabledDesc: "Laisser l'IA sélectionner le contenu selon vos préférences",
    startFlow: "Démarrer le flux",
    deleteFlow: "Supprimer le flux",
    custom: "Personnalisé",
    morning: "Matin",
    evening: "Soir",
    shabbat: "Shabbat",
    addContent: "Ajouter du contenu",
    contentPicker: {
      title: "Ajouter du contenu au flux",
      tabs: {
        live: "TV en direct",
        radio: "Radio",
        vod: "À la demande",
        podcast: "Podcasts"
      },
      search: "Rechercher du contenu...",
      selected: "{{count}} sélectionné(s)",
      addSelected: "Ajouter la sélection",
      noResults: "Aucun contenu trouvé",
      alreadyAdded: "Déjà dans le flux",
      loadMore: "Charger plus"
    },
    flowItems: {
      title: "Contenu du flux",
      empty: "Pas encore de contenu. Cliquez sur Ajouter du contenu pour commencer.",
      count: "{{count}} éléments",
      remove: "Supprimer",
      moveUp: "Monter",
      moveDown: "Descendre",
      order: "Ordre",
      confirmRemove: "Cliquez à nouveau pour confirmer la suppression",
      maxReached: "Maximum de {{max}} éléments atteint",
      more: "éléments de plus"
    },
    days: {
      sunday: "Dimanche",
      monday: "Lundi",
      tuesday: "Mardi",
      wednesday: "Mercredi",
      thursday: "Jeudi",
      friday: "Vendredi",
      saturday: "Samedi",
      sundayShort: "Dim",
      mondayShort: "Lun",
      tuesdayShort: "Mar",
      wednesdayShort: "Mer",
      thursdayShort: "Jeu",
      fridayShort: "Ven",
      saturdayShort: "Sam",
      selectAll: "Tout sélectionner",
      deselectAll: "Tout désélectionner",
      title: "Jours actifs",
      everyday: "Tous les jours",
      everyDay: "Tous les jours",
      weekdays: "Jours de semaine",
      weekends: "Week-ends",
      noneSelected: "Aucun jour sélectionné",
      selectedCount: "{{count}} jours sélectionnés"
    },
    trigger: {
      type: "Type de déclencheur",
      time: "Basé sur l'heure",
      shabbat: "Soir de Shabbat",
      holiday: "Fête",
      skipShabbat: "Passer le Shabbat",
      skipShabbatDesc: "Ne pas exécuter ce flux le vendredi soir ou le samedi",
      shabbatOffset: "Minutes avant l'allumage des bougies",
      shabbatOffsetDesc: "Combien de minutes avant Shabbat ce flux doit-il démarrer ?",
      calculatedTime: "Heure calculée",
      thisWeek: "Cette semaine : {{day}} à {{time}}",
      comingSoon: "Déclencheurs de fêtes bientôt disponibles",
      locationBased: "Heures basées sur votre emplacement"
    },
    examples: {
      title: "Exemples de flux",
      subtitle: "Appuyez pour utiliser comme modèle",
      morningRoutine: {
        name: "Routine matinale",
        desc: "Commencez votre journée avec les actualités, la météo et du contenu inspirant"
      },
      eveningWindDown: {
        name: "Détente du soir",
        desc: "Détendez-vous avec de la musique apaisante et du divertissement léger"
      },
      shabbatPrep: {
        name: "Préparation du Shabbat",
        desc: "Créez l'ambiance du Shabbat avec du contenu spécial"
      },
      coffeeBreak: {
        name: "Pause café",
        desc: "Divertissement rapide pour une courte pause"
      },
      sunsetVibes: {
        name: "Ambiance coucher de soleil",
        desc: "Détente du week-end avec musique et contenu ambiant"
      }
    },
    aiBrief: "Résumé IA",
    aiBriefDesc: "Obtenez un résumé personnalisé généré par IA avant le démarrage du flux",
    aiBriefEnabled: "Résumé IA activé",
    validation: {
      nameRequired: "Le nom du flux est requis",
      startTimeRequired: "L'heure de début est requise",
      endTimeRequired: "L'heure de fin est requise",
      timeRange: "L'heure de fin doit être après l'heure de début",
      daysRequired: "Sélectionnez au moins un jour",
      contentRequired: "Ajoutez du contenu ou activez l'IA"
    }
  },
  watchlist: {
    filters: {
      all: "Tout",
      continue: "Continuer à regarder",
      movies: "Films",
      series: "Séries",
      kids: "Enfants",
      judaism: "Judaïsme",
      podcasts: "Podcasts",
      radio: "Radio"
    }
  },
  cultureTrending: {
    whatsHotIn: "Tendances à {{location}}",
    noTopics: "Aucun sujet tendance disponible",
    sources: "Sources",
    categories: {
      security: "Sécurité",
      politics: "Politique",
      tech: "Tech",
      technology: "Technologie",
      culture: "Culture",
      sports: "Sports",
      economy: "Économie",
      finance: "Finance",
      entertainment: "Divertissement",
      weather: "Météo",
      health: "Santé",
      food: "Cuisine",
      fashion: "Mode",
      travel: "Voyage",
      history: "Histoire",
      expat: "Vie d'expatrié",
      general: "Général"
    }
  },
  chatbot: {
    title: "Assistant Bayit+",
    greeting: "Bonjour ! Je suis l'assistant intelligent Bayit+. Comment puis-je vous aider aujourd'hui ? Cliquez sur le microphone et parlez, ou tapez un message.",
    openChat: "Ouvrir le chat",
    welcome: "Bonjour ! Je suis l'assistant intelligent Bayit+. Comment puis-je vous aider aujourd'hui ? Cliquez sur le microphone et parlez, ou tapez un message.",
    placeholder: "Tapez ici...",
    recording: "Enregistrement... cliquez à nouveau pour arrêter",
    transcribing: "Transcription...",
    stopRecording: "Arrêter l'enregistrement",
    startRecording: "Démarrer l'enregistrement vocal",
    recommendations: "Voici quelques recommandations :",
    showMultipleSuccess: "Affichage de {{count}} éléments de contenu dans les widgets",
    showMultipleNotFound: "Impossible de trouver le contenu demandé. Veuillez essayer d'autres noms.",
    resolvingContent: "Recherche de votre contenu...",
    errors: {
      micPermission: "Impossible d'accéder au microphone. Veuillez vérifier les permissions du microphone dans votre navigateur.",
      transcribeFailed: "Impossible de transcrire l'enregistrement. Veuillez réessayer.",
      general: "Désolé, une erreur s'est produite. Veuillez réessayer."
    },
    suggestions: {
      whatToWatch: "Que regarder aujourd'hui ?",
      israeliMovies: "Films israéliens recommandés",
      whatsOnNow: "Qu'y a-t-il en ce moment ?",
      popularPodcasts: "Podcasts populaires"
    },
    voiceCommands: {
      showChannels: "Montre-moi les chaînes...",
      playChess: "Commencer une partie d'échecs avec...",
      multiContent: "Afficher côte à côte..."
    }
  },
  olorin: {
    wizard: "Assistant Olorin"
  },
  admin: {
    emailCampaigns: {
      title: "Campagnes email"
    }
  },
  taxonomy: {
    genre: "Genre",
    category: "Catégorie"
  },
  nav: {
    games: "Jeux",
    privacy: "Politique de confidentialité"
  },
  epg: {
    searchPlaceholder: "Rechercher des programmes, chaînes, acteurs...",
    premiumRequired: "Fonctionnalité Premium",
    premiumRequiredMessage: "La recherche intelligente utilise l'IA pour comprendre vos questions. Passez à Premium pour accéder à cette fonctionnalité."
  }
};

deepMerge(fr, completeFrFinal);

fs.writeFileSync('fr.json', JSON.stringify(fr, null, 2) + '\n');
console.log('Completed French translations - final batch');

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
