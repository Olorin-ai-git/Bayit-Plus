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

const fix = {
  channelChat: {
    title: "Chat en direct",
    error: "Impossible de se connecter au chat",
    retry: "Reconnecter",
    participants: "{{count}} spectateurs",
    participants_one: "{{count}} spectateur",
    participants_other: "{{count}} spectateurs",
    showOriginal: "Afficher l'original",
    showTranslation: "Traduire",
    userJoined: "{{name}} a rejoint le chat",
    userLeft: "Un utilisateur a quitté le chat",
    placeholder: "Envoyer un message...",
    send: "Envoyer",
    translationBeta: "Traduction (Bêta)"
  }
};

deepMerge(fr, fix);
fs.writeFileSync('fr.json', JSON.stringify(fr, null, 2) + '\n');
console.log('Fixed French channelChat');
