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

// Final 55 missing keys
const finalFix = {
  support: {
    ticket: {
      message: "Message",
      messagePlaceholder: "Décrivez votre problème en détail...",
      categoryLabel: "Catégorie",
      priorityLabel: "Priorité",
      category: {
        billing: "Facturation",
        technical: "Technique",
        feature: "Demande de fonctionnalité",
        general: "Général"
      },
      priority: {
        low: "Basse",
        medium: "Moyenne",
        high: "Haute",
        urgent: "Urgente"
      },
      status: {
        open: "Ouvert",
        in_progress: "En cours",
        resolved: "Résolu",
        closed: "Fermé"
      },
      created: "Créé",
      error: {
        required: "Veuillez remplir tous les champs obligatoires",
        submit: "Échec de la création du ticket. Veuillez réessayer."
      }
    },
    voice: {
      thinking: "Laissez-moi réfléchir...",
      error: "Désolé, je n'ai pas compris. Réessayez ?",
      ready: "Que souhaitez-vous savoir ?",
      listeningNow: "Écoute en cours...",
      wakeWordHint: "Dites \"Jarvis\" pour parler"
    }
  },
  jerusalem: {
    categories: {
      "diaspora-connection": "Connexion Diaspora",
      "holy-sites": "Lieux saints",
      "jerusalem-events": "Événements de Jérusalem",
      general: "Jérusalem"
    }
  },
  telAviv: {
    beachLive: "Webcam de plage",
    categories: {
      music: "Scène musicale",
      food: "Gastronomie",
      events: "Événements",
      general: "Tel Aviv"
    }
  },
  taxonomy: {
    sections: {
      movies: "Films",
      series: "Séries",
      kids: "Enfants",
      youngsters: "Jeunes",
      music: "Musique",
      documentaries: "Documentaires",
      podcasts: "Podcasts",
      live: "TV en direct",
      audiobooks: "Livres audio"
    },
    subcategories: {
      "learning-hebrew": "Apprendre l'hébreu",
      "learning-hebrew.description": "Apprendre à lire, écrire et le vocabulaire en hébreu pour les enfants",
      "young-science": "Jeunes Sciences",
      "young-science.description": "Expériences et explications scientifiques adaptées aux enfants",
      "math-fun": "Maths Amusantes",
      "math-fun.description": "Apprendre les chiffres et l'arithmétique de façon ludique",
      "nature-animals": "Nature et Animaux",
      "nature-animals.description": "Le monde des animaux et de la nature pour les enfants curieux",
      "interactive": "Interactif",
      "interactive.description": "Contenu interactif et participatif pour les enfants",
      "hebrew-songs": "Chansons Hébraïques",
      "hebrew-songs.description": "Chansons israéliennes classiques et nouvelles pour enfants",
      "nursery-rhymes": "Comptines",
      "nursery-rhymes.description": "Chansons et mélodies pour les tout-petits et bébés",
      "kids-movies": "Films pour Enfants",
      "kids-movies.description": "Longs métrages adaptés aux enfants",
      "kids-series": "Séries pour Enfants",
      "kids-series.description": "Séries animées et émissions TV pour enfants",
      "jewish-holidays": "Fêtes Juives",
      "jewish-holidays.description": "Contenu sur les fêtes juives et traditions pour enfants",
      "torah-stories": "Histoires de la Torah",
      "torah-stories.description": "Histoires de la Torah et de la tradition juive",
      "bedtime-stories": "Histoires du Soir",
      "bedtime-stories.description": "Histoires relaxantes pour l'heure du coucher",
      "tiktok-trends": "Tendances TikTok",
      "tiktok-trends.description": "Tendances et défis populaires sur TikTok",
      "viral-videos": "Vidéos Virales",
      "viral-videos.description": "Vidéos virales populaires sur les réseaux sociaux",
      "memes": "Mèmes",
      "memes.description": "Mèmes drôles et culture internet",
      "israel-news": "Actualités d'Israël",
      "israel-news.description": "Actualités d'Israël adaptées aux ados",
      "world-news": "Actualités Mondiales",
      "world-news.description": "Actualités internationales pour les jeunes",
      "science-news": "Actualités Scientifiques",
      "science-news.description": "Découvertes scientifiques et innovations technologiques",
      "sports-news": "Actualités Sportives",
      "sports-news.description": "Résultats sportifs et actualités",
      "music-culture": "Culture Musicale",
      "music-culture.description": "Scène musicale, artistes et festivals",
      "film-culture": "Culture Cinéma",
      "film-culture.description": "Cinéma, séries et critiques",
      "art-culture": "Culture Artistique",
      "art-culture.description": "Art, galeries et créativité",
      "food-culture": "Culture Culinaire",
      "food-culture.description": "Cuisine, recettes et gastronomie",
      "study-help": "Aide aux Études",
      "study-help.description": "Aide pour les examens, résumés et préparation",
      "career-prep": "Préparation Carrière",
      "career-prep.description": "Préparation université et carrière",
      "life-skills": "Compétences de Vie",
      "life-skills.description": "Compétences de vie, gestion financière et autonomie",
      "teen-movies": "Films Ados",
      "teen-movies.description": "Films recommandés pour adolescents",
      "teen-series": "Séries Ados",
      "teen-series.description": "Séries populaires pour adolescents",
      "gaming": "Jeux Vidéo",
      "gaming.description": "Jeux vidéo, e-sport et gaming",
      "coding": "Programmation",
      "coding.description": "Programmation, codage et développement",
      "gadgets": "Gadgets",
      "gadgets.description": "Gadgets, technologie et tests",
      "bar-bat-mitzvah": "Bar/Bat Mitzvah",
      "bar-bat-mitzvah.description": "Préparation et célébrations pour Bar/Bat Mitzvah",
      "teen-torah": "Torah pour Ados",
      "teen-torah.description": "Cours de Torah et paracha hebdomadaire pour ados",
      "jewish-history": "Histoire Juive",
      "jewish-history.description": "Histoire du peuple juif"
    }
  },
  passkey: {
    manager: {
      title: "Passkeys",
      subtitle: "Gérez vos passkeys pour un accès sécurisé au contenu"
    },
    unsupported: "Les passkeys ne sont pas pris en charge sur cet appareil",
    fetchError: "Échec du chargement des passkeys",
    registerError: "Échec de l'enregistrement du passkey",
    deleteError: "Échec de la suppression du passkey",
    cancelled: "Opération passkey annulée",
    unknownDevice: "Appareil inconnu",
    created: "Créé",
    never: "Jamais",
    addPasskey: "Ajouter un Passkey",
    deleteConfirmTitle: "Supprimer le Passkey ?",
    deleteConfirmText: "Ce passkey ne pourra plus déverrouiller le contenu. Vous pouvez toujours l'ajouter à nouveau plus tard.",
    unlock: "Déverrouiller",
    unlockContent: "Déverrouiller le contenu privé",
    unlockDescription: "Utilisez votre passkey pour accéder aux films et séries privés",
    auth: {
      title: "Déverrouiller le contenu",
      description: "Utilisez votre empreinte, votre visage ou le code PIN de votre appareil pour déverrouiller les films et séries privés.",
      unlock: "Déverrouiller avec Passkey",
      authenticating: "Authentification...",
      success: "Contenu déverrouillé !",
      cancelled: "Authentification annulée",
      error: "Échec de l'authentification. Veuillez réessayer."
    },
    qr: {
      useQR: "Utiliser le téléphone pour déverrouiller",
      scanWithPhone: "Scanner avec votre téléphone",
      instruction: "Ouvrez l'appareil photo de votre téléphone et scannez le code QR pour vous authentifier",
      error: "Échec de la génération du code QR",
      expired: "Code QR expiré. Veuillez réessayer."
    }
  },
  olorin: {
    errors: {
      session_not_found: "Session introuvable",
      session_different_partner: "La session appartient à un autre partenaire",
      session_invalid_status: "La session est {status}, impossible d'ajouter la transcription",
      max_sessions_reached: "Nombre maximum de sessions simultanées ({limit}) atteint",
      invalid_api_key: "Clé API invalide",
      missing_api_key: "En-tête {header} manquant",
      capability_disabled: "La capacité '{capability}' est actuellement désactivée",
      capability_not_enabled: "La capacité '{capability}' n'est pas activée pour ce partenaire",
      source_language_not_supported: "Langue source '{language}' non prise en charge. Langues supportées : {supported}",
      target_language_not_supported: "Langue cible '{language}' non prise en charge. Langues supportées : {supported}",
      partner_not_found: "Partenaire introuvable",
      partner_registration_failed: "Échec de l'enregistrement du partenaire",
      no_updates_provided: "Aucune mise à jour fournie",
      webhook_config_failed: "Échec de la configuration du webhook",
      webhook_url_not_configured: "URL du webhook non configurée",
      webhook_secret_not_configured: "Secret du webhook non configuré",
      search_failed: "Échec de la recherche",
      indexing_failed: "Échec de l'indexation",
      detection_failed: "Échec de la détection",
      explanation_failed: "Échec de l'obtention de l'explication",
      reference_not_found: "Référence '{reference_id}' introuvable",
      enrichment_failed: "Échec de l'enrichissement",
      get_references_failed: "Échec de la récupération des références",
      create_session_failed: "Échec de la création de la session",
      add_transcript_failed: "Échec de l'ajout de la transcription",
      generate_recap_failed: "Échec de la génération du récapitulatif"
    }
  },
  cities: {
    jerusalem: {
      title: "Jérusalem",
      subtitle: "Découvrez la ville éternelle",
      loadingContent: "Chargement du contenu de Jérusalem...",
      noContent: "Aucun contenu disponible pour le moment",
      errorLoading: "Échec du chargement du contenu de Jérusalem",
      sources: "Sources",
      categories: {
        history: "🏛️ Sites historiques",
        religion: "🕍 Patrimoine religieux",
        culture: "🎭 Événements culturels",
        events: "📅 Événements locaux",
        food: "🍴 Délices culinaires",
        markets: "🛍️ Marchés traditionnels",
        arts: "🎨 Arts et galeries"
      }
    },
    telAviv: {
      title: "Tel Aviv",
      subtitle: "Découvrez la ville vibrante",
      loadingContent: "Chargement du contenu de Tel Aviv...",
      noContent: "Aucun contenu disponible pour le moment",
      errorLoading: "Échec du chargement du contenu de Tel Aviv",
      sources: "Sources",
      categories: {
        beaches: "🏖️ Plages et bord de mer",
        nightlife: "🌃 Vie nocturne et divertissement",
        culture: "🎭 Événements culturels",
        music: "🎵 Musique et concerts",
        food: "🍴 Gastronomie",
        tech: "💻 Tech et innovation",
        events: "📅 Événements locaux"
      }
    },
    privacy: {
      lastUpdated: "Dernière mise à jour : 27 janvier 2026",
      intro: {
        title: "1. Introduction",
        content: "Olorin.ai LLC (\"nous\", \"notre\" ou \"la Société\") s'engage à protéger votre vie privée. Cette Politique de Confidentialité explique comment notre application mobile, Bayit+ (l'\"Application\"), collecte, utilise et protège vos informations.",
        commitment: "Nous avons conçu Bayit+ avec une architecture \"Privacy-First\". Nous n'enregistrons pas votre salon. Notre technologie utilise les capteurs de votre appareil uniquement pour synchroniser notre service audio avec votre télévision."
      },
      collection: {
        title: "2. Informations collectées et utilisation",
        camera: {
          title: "A. Caméra et données de synchronisation visuelle",
          intro: "Pour fournir notre service principal—synchroniser l'audio traduit avec votre TV—Bayit+ nécessite l'accès à la caméra de votre appareil.",
          data: "Données collectées : Lorsque vous activez le \"Mode Sync\", l'application capture une courte séquence de frames vidéo (environ 3 secondes) de l'écran de votre TV.",
          purpose: "Objectif : Ces frames sont transmises à notre serveur cloud sécurisé uniquement pour identifier la chaîne TV publique que vous regardez et calculer la latence de diffusion.",
          retention: "Conservation : Ces données sont éphémères. Les frames sont traitées instantanément en mémoire et supprimées définitivement immédiatement après l'établissement de la synchronisation. Nous ne visualisons, stockons ou archivons pas d'images de votre domicile ou famille."
        },
        audio: {
          title: "B. Données audio (si applicable)",
          intro: "Si vous utilisez des fonctionnalités nécessitant une synchronisation audio, l'application peut demander l'accès au microphone.",
          data: "Données collectées : Brefs échantillons audio de la diffusion TV.",
          purpose: "Objectif : Pour faire correspondre l'empreinte audio de la diffusion publique à des fins de synchronisation.",
          retention: "Conservation : Comme les données visuelles, les échantillons audio sont traités en temps réel et immédiatement supprimés. Nous n'écoutons pas et n'enregistrons pas les conversations des utilisateurs."
        },
        usage: {
          title: "C. Données d'utilisation et techniques",
          content: "Nous pouvons collecter des données techniques non identifiables pour améliorer la stabilité de l'application, notamment :",
          device: "Type d'appareil et version du système d'exploitation.",
          crash: "Journaux de plantage et métriques de performance.",
          aggregate: "Données agrégées sur les chaînes regardées (ex. : \"50% des utilisateurs regardent la Chaîne 12\")."
        }
      },
      sharing: {
        title: "3. Partage des données et tiers",
        noSale: "Olorin.ai LLC ne vend pas vos données personnelles. Nous collaborons avec des prestataires tiers de confiance pour fournir notre infrastructure. Ces prestataires sont autorisés à utiliser vos données uniquement dans la mesure nécessaire pour nous fournir ces services :",
        cloud: "Infrastructure Cloud : Services d'hébergement (ex. AWS) pour traiter les demandes de synchronisation.",
        ai: "Traitement IA : Services utilisés pour générer des traductions textuelles et audio en temps réel à partir des flux de diffusion publics."
      },
      retention: {
        title: "4. Conservation des données",
        sync: "Données de synchronisation (Images/Audio) : 0 jour. Supprimées immédiatement après traitement.",
        account: "Données de compte : Conservées uniquement tant que votre compte est actif pour gérer votre abonnement et préférences."
      },
      children: {
        title: "5. Confidentialité des enfants",
        content: "Bien que notre contenu soit adapté à tous les âges, Olorin.ai LLC ne collecte pas sciemment d'informations personnelles identifiables auprès d'enfants de moins de 13 ans. Si vous êtes parent et pensez que votre enfant nous a fourni des informations personnelles, veuillez nous contacter."
      },
      rights: {
        title: "6. Vos droits",
        content: "Selon votre localisation, vous pouvez avoir le droit de demander l'accès, la correction ou la suppression de vos données personnelles. Vous pouvez supprimer votre compte Bayit+ à tout moment dans les paramètres de l'application."
      },
      contact: {
        title: "7. Nous contacter",
        intro: "Si vous avez des questions concernant cette Politique de Confidentialité, veuillez nous contacter à :"
      }
    },
    beta: {
      credits: {
        loading: "Chargement du solde de crédits...",
        error: "Impossible de charger le solde de crédits",
        label: "Crédits IA",
        remaining: "Crédits restants",
        warningCritical: "Critique : Crédits presque épuisés",
        warningLow: "Attention : Solde de crédits faible",
        upgrade: "Mettre à niveau",
        upgradeAction: "Passez à niveau pour obtenir plus de crédits"
      },
      settings: {
        title: "Programmes Bêta",
        description: "Gérez votre inscription à Beta 500 et consultez les détails du programme. Accédez en avant-première aux fonctionnalités IA.",
        enrolledTitle: "Vous êtes dans Beta 500 !",
        statusPendingVerification: "Vérification en cours",
        statusActive: "Actif",
        statusExpired: "Expiré",
        pendingMessage: "Nous vérifions votre inscription. Vous recevrez un e-mail une fois approuvé.",
        expiresOn: "Expire le {{date}}",
        loadingStatus: "Chargement du statut du programme...",
        errorLoading: "Impossible de charger les informations du programme. Veuillez réessayer.",
        programStatus: "Statut du programme",
        slots: "places occupées",
        slotsAvailable: "{{count}} places disponibles",
        programFull: "Les 500 places sont complètes"
      },
      enrollment: {
        title: "Rejoindre Beta 500",
        subtitle: "Faites partie des 500 familles à découvrir les fonctionnalités IA",
        programFull: "Programme complet",
        joinButton: "Rejoindre Beta 500",
        exclusiveAccess: "Accès exclusif",
        limitedSlots: "Limité à 500 familles",
        slotsAvailable: "{{available}} places sur {{total}} disponibles",
        freeCredits: "Crédits IA gratuits",
        creditsAmount: "5 000 crédits (valeur 50 $)",
        duration: "Durée du Bêta",
        durationValue: "90 jours",
        features: "Fonctionnalités IA",
        featuresValue: "Doublage en direct, recherche IA, recommandations",
        whatYouGet: "Ce que vous obtenez",
        benefits: {
          liveDubbing: "Traduction audio en temps réel pendant le visionnage",
          aiSearch: "Découverte de contenu intelligente",
          aiRecommendations: "Suggestions personnalisées",
          prioritySupport: "Accès direct à l'équipe de développement"
        },
        disclaimer: "Beta 500 est un programme à durée limitée. Les crédits ne sont pas renouvelables pendant la période bêta.",
        waitlistMessage: "Les 500 places sont actuellement complètes. Inscrivez-vous à la liste d'attente pour être notifié lorsqu'une place se libère.",
        enrollmentSuccess: "Bienvenue dans Beta 500 ! Vérifiez votre e-mail pour valider votre compte.",
        enrollmentError: "Impossible de s'inscrire. Veuillez réessayer plus tard."
      }
    }
  }
};

deepMerge(fr, finalFix);

fs.writeFileSync('fr.json', JSON.stringify(fr, null, 2) + '\n');
console.log('Fixed final 55 French translations');

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
