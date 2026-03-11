#!/usr/bin/env python3
"""Batch 4: French translations H-N."""
import json
import os

DIRS = [
    "/Users/olorin/Documents/Projects/olorin/olorin-core/packages/shared-i18n/locales",
    "/Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/android-app/app/src/main/assets/locales",
]

TRANSLATIONS = {
    "Hands-free navigation": {"fr": "Navigation mains libres"},
    "Head to Head": {"fr": "Face à face"},
    "Health": {"fr": "Santé"},
    "Hebrew Songs": {"fr": "Chansons hébraïques"},
    "Hello! I'm Bayit+ smart assistant. How can I help you today? Click the microphone and speak, or type a message.": {"fr": "Bonjour ! Je suis l'assistant intelligent Bayit+. Comment puis-je vous aider aujourd'hui ? Cliquez sur le microphone et parlez, ou saisissez un message."},
    "Help & Support": {"fr": "Aide et support"},
    "Help improve AI features": {"fr": "Aidez à améliorer les fonctionnalités IA"},
    "Hidden": {"fr": "Masqué"},
    "High": {"fr": "Élevé"},
    "High (most responsive)": {"fr": "Élevée (la plus réactive)"},
    "High School (15-17)": {"fr": "Lycée (15-17)"},
    "High contrast mode": {"fr": "Mode contraste élevé"},
    "History": {"fr": "Historique"},
    "Hold Button to Talk": {"fr": "Maintenir le bouton pour parler"},
    "Holiday": {"fr": "Fête"},
    "Holiday triggers coming soon": {"fr": "Déclencheurs de fêtes bientôt disponibles"},
    "Holy Sites": {"fr": "Lieux saints"},
    "Host": {"fr": "Hôte"},
    "Host Paused": {"fr": "Hôte en pause"},
    "How can we help you?": {"fr": "Comment pouvons-nous vous aider ?"},
    "How do I cancel my subscription?": {"fr": "Comment annuler mon abonnement ?"},
    "How do I change my subscription plan?": {"fr": "Comment changer mon forfait d'abonnement ?"},
    "How do I download content for offline viewing?": {"fr": "Comment télécharger du contenu pour le visionnage hors ligne ?"},
    "How long to wait after speaking before processing": {"fr": "Combien de temps attendre après avoir parlé avant le traitement"},
    "How many minutes before Shabbat should this flow start?": {"fr": "Combien de minutes avant le Chabbat ce flux doit-il démarrer ?"},
    "How to use": {"fr": "Comment utiliser"},
    "Hybrid": {"fr": "Hybride"},
    "Hybrid Mode": {"fr": "Mode hybride"},
    "I'm listening...": {"fr": "J'écoute..."},
    "IDF Ceremonies": {"fr": "Cérémonies de Tsahal"},
    "Icon emoji (e.g., \ud83d\udcfa)": {"fr": "Emoji d'icône (ex. \ud83d\udcfa)"},
    "Image is too large. Maximum size is 5MB.": {"fr": "L'image est trop grande. La taille maximale est de 5 Mo."},
    "Import Archive.org": {"fr": "Importer depuis Archive.org"},
    "In Progress": {"fr": "En cours"},
    "Inactive": {"fr": "Inactif"},
    "Incoming Requests": {"fr": "Demandes reçues"},
    "Incorrect PIN": {"fr": "PIN incorrect"},
    "Incorrect code": {"fr": "Code incorrect"},
    "Increase contrast for better visibility": {"fr": "Augmenter le contraste pour une meilleure visibilité"},
    "Indexing failed": {"fr": "Échec de l'indexation"},
    "Infrastructure": {"fr": "Infrastructure"},
    "Interactive": {"fr": "Interactif"},
    "Interactive Feedback": {"fr": "Retour interactif"},
    "Introduction": {"fr": "Introduction"},
    "Invalid API key": {"fr": "Clé API invalide"},
    "Invalid code": {"fr": "Code invalide"},
    "Invalid game code. Must be 6 characters.": {"fr": "Code de jeu invalide. Doit contenir 6 caractères."},
    "Israel News": {"fr": "Actualités d'Israël"},
    "Israel Time": {"fr": "Heure d'Israël"},
    "It's afternoon in Israel, news is reporting on ongoing developments": {"fr": "C'est l'après-midi en Israël, les informations rapportent les développements en cours"},
    "Jerusalem Connection": {"fr": "Connexion Jérusalem"},
    "Jerusalem Events": {"fr": "Événements à Jérusalem"},
    "Jewish History": {"fr": "Histoire juive"},
    "Jewish Holidays": {"fr": "Fêtes juives"},
    "Join": {"fr": "Rejoindre"},
    "Join Party": {"fr": "Rejoindre la fête"},
    "Judaism": {"fr": "Judaïsme"},
    "Jump to": {"fr": "Aller à"},
    "Just now": {"fr": "À l'instant"},
    "Kids": {"fr": "Enfants"},
    "Kids Content Manager": {"fr": "Gestionnaire de contenu enfants"},
    "Kids Movies": {"fr": "Films pour enfants"},
    "Kids Series": {"fr": "Séries pour enfants"},
    "Large": {"fr": "Grand"},
    "Last game: {{time}}": {"fr": "Dernière partie : {{time}}"},
    "Last login": {"fr": "Dernière connexion"},
    "Last used": {"fr": "Dernière utilisation"},
    "Learning Hebrew": {"fr": "Apprendre l'hébreu"},
    "Leave Party": {"fr": "Quitter la fête"},
    "Let AI curate content based on your preferences": {"fr": "Laissez l'IA sélectionner du contenu selon vos préférences"},
    "Let me think about that...": {"fr": "Laissez-moi réfléchir..."},
    "Let's Start": {"fr": "Commençons"},
    "Life Skills": {"fr": "Compétences de vie"},
    "Like": {"fr": "J'aime"},
    "Listening...": {"fr": "Écoute en cours..."},
    "Live Channel": {"fr": "Chaîne en direct"},
    "Live TV": {"fr": "TV en direct"},
    "Load More": {"fr": "Charger plus"},
    "Loading document...": {"fr": "Chargement du document..."},
    "Loading profiles...": {"fr": "Chargement des profils..."},
    "Loading tickets...": {"fr": "Chargement des tickets..."},
    "Log Out": {"fr": "Se déconnecter"},
    "Login": {"fr": "Connexion"},
    "Login Required": {"fr": "Connexion requise"},
    "Losses": {"fr": "Défaites"},
    "Lost": {"fr": "Perdu"},
    "Low (fewer false triggers)": {"fr": "Faible (moins de faux déclenchements)"},
    "Manage Profiles": {"fr": "Gérer les profils"},
    "Manage Subscription": {"fr": "Gérer l'abonnement"},
    "Manage devices connected to your account": {"fr": "Gérer les appareils connectés à votre compte"},
    "Manage your passkeys for secure content access": {"fr": "Gérez vos clés d'accès pour un accès sécurisé au contenu"},
    "Match History": {"fr": "Historique des matchs"},
    "Max Duration": {"fr": "Durée maximale"},
    "Maximum concurrent sessions ({limit}) reached": {"fr": "Nombre maximum de sessions simultanées ({limit}) atteint"},
    "Medium (balanced)": {"fr": "Moyenne (équilibrée)"},
    "Member since": {"fr": "Membre depuis"},
    "Message": {"fr": "Message"},
    "Messages": {"fr": "Messages"},
    "Middle School (12-14)": {"fr": "Collège (12-14)"},
    "Minutes before candle lighting": {"fr": "Minutes avant l'allumage des bougies"},
    "Missing {header} header": {"fr": "En-tête {header} manquant"},
    "Missions": {"fr": "Missions"},
    "Mode": {"fr": "Mode"},
    "Monday": {"fr": "Lundi"},
    "Morning": {"fr": "Matin"},
    "Morning Routine": {"fr": "Routine matinale"},
    "Move Down": {"fr": "Déplacer vers le bas"},
    "Move History": {"fr": "Historique des coups"},
    "Move Up": {"fr": "Déplacer vers le haut"},
    "Movie": {"fr": "Film"},
    "Movies": {"fr": "Films"},
    "Movies & Series": {"fr": "Films et séries"},
    "Music": {"fr": "Musique"},
    "Music Culture": {"fr": "Culture musicale"},
    "Music Scene": {"fr": "Scène musicale"},
    "Mute": {"fr": "Couper le son"},
    "Muted by Default": {"fr": "Son coupé par défaut"},
    "My Flows": {"fr": "Mes flux"},
    "My Friends": {"fr": "Mes amis"},
    "My Personal Widgets": {"fr": "Mes widgets personnels"},
    "My Profile": {"fr": "Mon profil"},
    "My Recordings": {"fr": "Mes enregistrements"},
    "My Support Tickets": {"fr": "Mes tickets de support"},
    "My Widgets": {"fr": "Mes widgets"},
    "Nature & Animals": {"fr": "Nature et animaux"},
    "Navigation": {"fr": "Navigation"},
    "Never": {"fr": "Jamais"},
    "New Game": {"fr": "Nouvelle partie"},
    "New Ticket": {"fr": "Nouveau ticket"},
    "News": {"fr": "Actualités"},
    "Next": {"fr": "Suivant"},
    "Next:": {"fr": "Suivant :"},
    "Nightlife": {"fr": "Vie nocturne"},
    "No Jerusalem content available": {"fr": "Aucun contenu sur Jérusalem disponible"},
    "No Recordings Yet": {"fr": "Aucun enregistrement"},
    "No Tel Aviv content available": {"fr": "Aucun contenu sur Tel-Aviv disponible"},
    "No active subscription": {"fr": "Aucun abonnement actif"},
    "No channels available": {"fr": "Aucune chaîne disponible"},
    "No chapters available": {"fr": "Aucun chapitre disponible"},
    "No content available": {"fr": "Aucun contenu disponible"},
    "No content available right now": {"fr": "Aucun contenu disponible actuellement"},
    "No content found": {"fr": "Aucun contenu trouvé"},
    "No content found in this category": {"fr": "Aucun contenu trouvé dans cette catégorie"},
    "No content yet. Click Add Content to get started.": {"fr": "Pas encore de contenu. Cliquez sur Ajouter du contenu pour commencer."},
    "No custom flows yet": {"fr": "Pas encore de flux personnalisés"},
    "No days selected": {"fr": "Aucun jour sélectionné"},
    "No games played yet": {"fr": "Aucune partie jouée"},
    "No incoming requests": {"fr": "Aucune demande reçue"},
    "No moves yet": {"fr": "Aucun coup joué"},
    "No outgoing requests": {"fr": "Aucune demande envoyée"},
    "No passkeys registered yet. Add one to unlock private content.": {"fr": "Aucune clé d'accès enregistrée. Ajoutez-en une pour débloquer le contenu privé."},
    "No personal widgets yet": {"fr": "Pas encore de widgets personnels"},
    "No players found": {"fr": "Aucun joueur trouvé"},
    "No podcasts available": {"fr": "Aucun podcast disponible"},
    "No recent activity": {"fr": "Aucune activité récente"},
    "No remote control - full voice navigation": {"fr": "Pas de télécommande - navigation vocale complète"},
    "No results found": {"fr": "Aucun résultat trouvé"},
    "No results found for \"{{query}}\"": {"fr": "Aucun résultat trouvé pour « {{query}} »"},
    "No support tickets yet": {"fr": "Aucun ticket de support"},
    "No system widgets available": {"fr": "Aucun widget système disponible"},
    "No tickets with this status": {"fr": "Aucun ticket avec ce statut"},
    "No trending topics available": {"fr": "Aucun sujet tendance disponible"},
    "No updates provided": {"fr": "Aucune mise à jour fournie"},
    "No voice - remote control only": {"fr": "Pas de voix - télécommande uniquement"},
    "No widgets yet": {"fr": "Pas encore de widgets"},
    "Not set": {"fr": "Non défini"},
    "Notification Settings": {"fr": "Paramètres de notification"},
    "Notifications": {"fr": "Notifications"},
    "Nursery Rhymes": {"fr": "Comptines"},
}


def apply_translations(directory):
    with open(os.path.join(directory, "en.json"), "r", encoding="utf-8") as f:
        en = json.load(f)

    langs = ["he", "es", "zh", "fr", "it", "hi", "ta", "bn", "ja"]
    counts = {}

    for lang in langs:
        filepath = os.path.join(directory, f"{lang}.json")
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        count = 0

        def walk_and_replace(en_obj, lang_obj):
            nonlocal count
            for k, v in en_obj.items():
                if k not in lang_obj:
                    continue
                if isinstance(v, dict) and isinstance(lang_obj.get(k), dict):
                    walk_and_replace(v, lang_obj[k])
                elif isinstance(v, str) and lang_obj.get(k) == v:
                    if v in TRANSLATIONS and lang in TRANSLATIONS[v]:
                        lang_obj[k] = TRANSLATIONS[v][lang]
                        count += 1

        walk_and_replace(en, data)
        counts[lang] = count

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")

    return counts


if __name__ == "__main__":
    for d in DIRS:
        if not os.path.exists(d):
            print(f"Skipping {d} (not found)")
            continue
        print(f"\nProcessing: {d}")
        counts = apply_translations(d)
        for lang, c in sorted(counts.items()):
            print(f"  {lang}: {c} values translated")
