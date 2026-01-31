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

// Fix all remaining missing keys
const remaining = {
  nav: {
    support: "Support"
  },
  epg: {
    noProgramsScheduled: "Aucun programme prévu",
    noProgramsFound: "Aucun programme trouvé",
    noDataAvailable: "Aucune donnée du guide TV disponible"
  },
  home: {
    podcasts: "Podcasts",
    audiobooks: "Livres audio"
  },
  profile: {
    devices: {
      minutesAgo_one: "il y a 1 minute",
      minutesAgo_other: "il y a {{count}} minutes",
      hoursAgo_one: "il y a 1 heure",
      hoursAgo_other: "il y a {{count}} heures",
      daysAgo_one: "il y a 1 jour",
      daysAgo_other: "il y a {{count}} jours",
      disconnectSuccessWithSessions: "Appareil déconnecté et {{count}} session(s) active(s) terminée(s).",
      disconnectDevice: "Déconnecter l'appareil"
    }
  },
  watchlist: {
    watched: "vu"
  },
  watchParty: {
    share: "Partager"
  },
  admin: {
    uploads: {
      connectionStatus: {
        troubleshootingSteps: [
          "Vérifiez votre connexion Internet",
          "Vérifiez que le serveur fonctionne",
          "Vérifiez votre jeton d'authentification",
          "Essayez de rafraîchir la page"
        ]
      }
    }
  },
  support: {
    ticket: {
      title: "Créer un ticket de support",
      subject: "Sujet",
      subjectPlaceholder: "Décrivez votre problème brièvement",
      description: "Description",
      descriptionPlaceholder: "Décrivez votre problème en détail...",
      category: "Catégorie",
      priority: "Priorité",
      submit: "Soumettre le ticket",
      submitting: "Envoi...",
      success: "Ticket créé avec succès",
      error: "Échec de la création du ticket"
    },
    tickets: {
      loading: "Chargement des tickets...",
      loadError: "Échec du chargement des tickets",
      emptyFilter: "Aucun ticket avec ce statut",
      create: "Nouveau ticket",
      createFirst: "Créez votre premier ticket",
      filter: {
        all: "Tous",
        open: "Ouvert",
        inProgress: "En cours",
        resolved: "Résolu",
        closed: "Fermé"
      }
    },
    voice: {
      title: "Assistant vocal",
      listening: "Je vous écoute...",
      processing: "Traitement...",
      speaking: "Je parle..."
    },
    wizard: {
      role: "Votre guide"
    }
  },
  jerusalem: {
    noContent: "Aucun contenu de Jérusalem disponible",
    sources: "Sources",
    kotelLive: "Kotel en direct",
    categories: {
      kotel: "Mur occidental",
      "idf-ceremony": "Cérémonie de Tsahal",
      history: "Histoire",
      oldCity: "Vieille ville",
      holidays: "Fêtes"
    }
  },
  telAviv: {
    noContent: "Aucun contenu de Tel Aviv disponible",
    sources: "Sources",
    beachCams: "Caméras de plage",
    categories: {
      tech: "Tech",
      startup: "Startups",
      culture: "Culture",
      nightlife: "Vie nocturne",
      beaches: "Plages"
    }
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
  taxonomy: {
    genre: "Genre",
    category: "Catégorie"
  },
  olorin: {
    wizard: "Assistant Olorin"
  }
};

deepMerge(fr, remaining);

fs.writeFileSync('fr.json', JSON.stringify(fr, null, 2) + '\n');
console.log('Fixed remaining French translations');

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
