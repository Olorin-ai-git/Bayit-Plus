/**
 * Character Engine — manages pre-baked Q&A and optional live API.
 */
var CharacterEngine = (function () {
  var characters = {};
  var liveMode = false;
  var config = {};
  var conversationHistory = [];
  var MAX_HISTORY = 5;

  function init(manifest, cfg) {
    config = cfg;
    manifest.characters.forEach(function (char) {
      characters[char.name] = {
        profile: char,
        qa: char.qa_pairs || [],
        chains: char.chains || [],
      };
    });
    if (config.export_token) {
      checkLiveMode();
    }
  }

  function checkLiveMode() {
    var xhr = new XMLHttpRequest();
    xhr.timeout = 2000;
    xhr.open(
      "GET",
      config.api_base +
        "/api/v1/training/scorm/health?token=" +
        config.export_token,
    );
    xhr.onload = function () {
      liveMode = xhr.status === 200;
    };
    xhr.onerror = function () {
      liveMode = false;
    };
    xhr.ontimeout = function () {
      liveMode = false;
    };
    xhr.send();
  }

  function findBestMatch(charName, question) {
    var char = characters[charName];
    if (!char) return null;
    var q = question.toLowerCase();
    for (var i = 0; i < char.qa.length; i++) {
      if (char.qa[i].question.toLowerCase() === q) return char.qa[i];
    }
    var bestScore = 0;
    var bestMatch = null;
    var qWords = q.split(/\s+/);
    for (var j = 0; j < char.qa.length; j++) {
      var aWords = char.qa[j].question.toLowerCase().split(/\s+/);
      var overlap = 0;
      qWords.forEach(function (w) {
        if (aWords.indexOf(w) >= 0) overlap++;
      });
      var score = overlap / Math.max(qWords.length, 1);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = char.qa[j];
      }
    }
    return bestScore > 0.3 ? bestMatch : null;
  }

  function askCharacter(charName, question, callback) {
    var match = findBestMatch(charName, question);
    if (match) {
      callback({ source: "prebaked", data: match });
      return;
    }
    if (liveMode) {
      askLive(charName, question, callback);
    } else {
      var char = characters[charName];
      if (char && char.qa.length > 0) {
        callback({ source: "fallback", data: char.qa[0] });
      } else {
        callback({ source: "none", data: null });
      }
    }
  }

  function askLive(charName, question, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", config.api_base + "/api/v1/training/scorm/interact");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.timeout = 15000;
    xhr.onload = function () {
      if (xhr.status === 200) {
        var resp = JSON.parse(xhr.responseText);
        conversationHistory.push({ q: question, a: resp.response_text });
        if (conversationHistory.length > MAX_HISTORY)
          conversationHistory.shift();
        callback({ source: "live", data: resp });
      } else {
        var char = characters[charName];
        if (char && char.qa.length > 0) {
          callback({ source: "fallback", data: char.qa[0] });
        } else {
          callback({ source: "none", data: null });
        }
      }
    };
    xhr.onerror = function () {
      liveMode = false;
      var char = characters[charName];
      if (char && char.qa.length > 0) {
        callback({ source: "fallback", data: char.qa[0] });
      }
    };
    xhr.send(
      JSON.stringify({
        token: config.export_token,
        content_id: config.content_id,
        character_name: charName,
        question: question,
        context: conversationHistory,
      }),
    );
  }

  function getCharacterList() {
    return Object.keys(characters).map(function (name) {
      return characters[name].profile;
    });
  }

  function getQAPairs(charName) {
    var char = characters[charName];
    return char ? char.qa : [];
  }

  function getChains(charName) {
    var char = characters[charName];
    return char ? char.chains : [];
  }

  function isLive() {
    return liveMode;
  }

  return {
    init: init,
    askCharacter: askCharacter,
    getCharacterList: getCharacterList,
    getQAPairs: getQAPairs,
    getChains: getChains,
    isLive: isLive,
  };
})();
