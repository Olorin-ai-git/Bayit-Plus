/**
 * Olorin SCORM Player — video playback, character Q&A, completion tracking.
 */
(function () {
  var manifest = null;
  var playerConfig = null;
  var videoEl = null;
  var state = {
    videoProgress: 0,
    answeredQA: {},
    scores: {},
    chainsCompleted: 0,
    sessionStart: Date.now(),
  };

  function loadJSON(url, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.onload = function () {
      cb(JSON.parse(xhr.responseText));
    };
    xhr.send();
  }

  function init() {
    ScormAPI.init();
    restoreState();

    loadJSON("../config.json", function (cfg) {
      playerConfig = cfg;
      loadJSON("../content/manifest.json", function (m) {
        manifest = m;
        CharacterEngine.init(m, {
          api_base: cfg.api_base,
          export_token: cfg.export_token,
          content_id: m.content_id,
        });
        renderPlayer();
      });
    });
  }

  function restoreState() {
    var saved = ScormAPI.getValue("cmi.suspend_data");
    if (saved) {
      try {
        var d = JSON.parse(saved);
        state.videoProgress = d.vp || 0;
        state.answeredQA = d.qa || {};
        state.scores = d.sc || {};
        state.chainsCompleted = d.cr || 0;
      } catch (e) {
        /* ignore corrupt data */
      }
    }
    var loc = ScormAPI.getValue("cmi.core.lesson_location");
    if (loc && videoEl) {
      videoEl.currentTime = parseFloat(loc) || 0;
    }
  }

  function saveState() {
    var data = JSON.stringify({
      v: 1,
      vp: Math.round(state.videoProgress * 10) / 10,
      qa: state.answeredQA,
      sc: state.scores,
      cr: state.chainsCompleted,
    });
    if (data.length > 4096) {
      var keys = Object.keys(state.answeredQA);
      if (keys.length > 0) {
        state.answeredQA[keys[0]] = state.answeredQA[keys[0]].slice(-3);
        saveState();
        return;
      }
    }
    ScormAPI.setValue("cmi.suspend_data", data);
    if (videoEl) {
      ScormAPI.setValue(
        "cmi.core.lesson_location",
        String(videoEl.currentTime),
      );
    }
    var elapsed = Math.round((Date.now() - state.sessionStart) / 1000);
    var h = Math.floor(elapsed / 3600);
    var m = Math.floor((elapsed % 3600) / 60);
    var s = elapsed % 60;
    var timeStr =
      String(h).padStart(2, "0") +
      ":" +
      String(m).padStart(2, "0") +
      ":" +
      String(s).padStart(2, "0");
    ScormAPI.setValue("cmi.core.session_time", timeStr);
    ScormAPI.commit();
  }

  function checkCompletion() {
    if (!playerConfig) return;
    var rule = playerConfig.completion_rule;
    var threshold = playerConfig.video_threshold_pct;
    var passScore = playerConfig.quiz_pass_pct;

    if (rule === "video_only") {
      if (state.videoProgress >= threshold) {
        ScormAPI.setValue("cmi.core.lesson_status", "completed");
        ScormAPI.setValue(
          "cmi.core.score.raw",
          String(Math.round(state.videoProgress)),
        );
      }
    } else if (rule === "video_plus_quiz") {
      var avgScore = calculateAverageScore();
      ScormAPI.setValue("cmi.core.score.raw", String(Math.round(avgScore)));
      if (state.videoProgress >= threshold) {
        ScormAPI.setValue(
          "cmi.core.lesson_status",
          avgScore >= passScore ? "passed" : "failed",
        );
      }
    } else if (rule === "engagement") {
      var composite = calculateEngagementScore();
      ScormAPI.setValue("cmi.core.score.raw", String(Math.round(composite)));
      if (composite >= passScore) {
        ScormAPI.setValue("cmi.core.lesson_status", "completed");
      }
    }
    ScormAPI.setValue("cmi.core.score.min", "0");
    ScormAPI.setValue("cmi.core.score.max", "100");
    saveState();
  }

  function calculateAverageScore() {
    var scores = Object.values(state.scores);
    if (scores.length === 0) return 0;
    var sum = scores.reduce(function (a, b) {
      return a + b;
    }, 0);
    return sum / scores.length;
  }

  function calculateEngagementScore() {
    var videoWeight = 0.4;
    var qaWeight = 0.4;
    var chainWeight = 0.2;
    var totalQA = 0;
    var answeredQA = 0;
    CharacterEngine.getCharacterList().forEach(function (c) {
      var pairs = CharacterEngine.getQAPairs(c.name);
      totalQA += pairs.length;
      answeredQA += (state.answeredQA[c.name] || []).length;
    });
    var qaPct = totalQA > 0 ? (answeredQA / totalQA) * 100 : 0;
    var totalChains = 0;
    CharacterEngine.getCharacterList().forEach(function (c) {
      totalChains += CharacterEngine.getChains(c.name).length;
    });
    var chainPct =
      totalChains > 0 ? (state.chainsCompleted / totalChains) * 100 : 0;
    return (
      state.videoProgress * videoWeight +
      qaPct * qaWeight +
      chainPct * chainWeight
    );
  }

  function renderPlayer() {
    var app = document.getElementById("olorin-app");
    if (!app) return;

    var currentStatus = ScormAPI.getValue("cmi.core.lesson_status");
    var reviewMode =
      currentStatus === "completed" || currentStatus === "passed";

    app.innerHTML =
      (reviewMode ? '<div class="review-banner">REVIEW MODE</div>' : "") +
      '<div class="player-layout">' +
      '<div class="video-container">' +
      '<video id="olorin-video" controls></video>' +
      '<div class="video-progress-bar"><div id="video-pct" class="video-progress-fill"></div></div>' +
      "</div>" +
      '<div class="character-sidebar" id="char-sidebar"></div>' +
      "</div>" +
      '<div class="qa-panel" id="qa-panel"></div>';

    videoEl = document.getElementById("olorin-video");
    if (manifest.video_url) {
      videoEl.src = manifest.video_url;
    }
    var savedLoc = ScormAPI.getValue("cmi.core.lesson_location");
    if (savedLoc) videoEl.currentTime = parseFloat(savedLoc) || 0;

    videoEl.addEventListener("timeupdate", function () {
      if (videoEl.duration) {
        state.videoProgress = (videoEl.currentTime / videoEl.duration) * 100;
        var pctEl = document.getElementById("video-pct");
        if (pctEl) pctEl.style.width = state.videoProgress + "%";
      }
    });
    videoEl.addEventListener("ended", function () {
      state.videoProgress = 100;
      checkCompletion();
    });

    setInterval(function () {
      saveState();
      checkCompletion();
    }, 30000);

    renderCharacterSidebar();
  }

  function renderCharacterSidebar() {
    var sidebar = document.getElementById("char-sidebar");
    if (!sidebar) return;
    var chars = CharacterEngine.getCharacterList();
    sidebar.innerHTML = '<h3 class="sidebar-title">CHARACTERS</h3>';
    chars.forEach(function (c) {
      var el = document.createElement("div");
      el.className = "char-card";
      el.innerHTML =
        (c.profile_url
          ? '<img class="char-avatar" src="../content/characters/' +
            encodeURIComponent(c.name) +
            '/profile.jpg" alt="' +
            c.name +
            '"/>'
          : '<div class="char-avatar char-avatar-text">' +
            c.name
              .split(" ")
              .map(function (w) {
                return w[0];
              })
              .join("") +
            "</div>") +
        '<div class="char-name">' +
        c.name +
        "</div>";
      el.onclick = function () {
        showCharacterQA(c.name);
      };
      sidebar.appendChild(el);
    });
  }

  function showCharacterQA(charName) {
    var panel = document.getElementById("qa-panel");
    if (!panel) return;
    var pairs = CharacterEngine.getQAPairs(charName);
    var answered = state.answeredQA[charName] || [];
    panel.innerHTML =
      '<h3 class="qa-title">ASK ' +
      charName.toUpperCase() +
      "</h3>" +
      '<div class="qa-list" id="qa-list"></div>' +
      '<div class="qa-response" id="qa-response"></div>';
    var list = document.getElementById("qa-list");
    pairs.forEach(function (qa, idx) {
      var btn = document.createElement("button");
      btn.className =
        "qa-btn" + (answered.indexOf(idx) >= 0 ? " qa-answered" : "");
      btn.textContent = qa.question;
      btn.onclick = function () {
        playQAResponse(charName, qa, idx);
      };
      list.appendChild(btn);
    });
    if (CharacterEngine.isLive()) {
      var freeInput = document.createElement("div");
      freeInput.className = "qa-free-input";
      freeInput.innerHTML =
        '<input type="text" id="free-q" placeholder="Ask your own question..." class="qa-input"/>' +
        '<button class="qa-btn qa-send" id="free-send">ASK</button>';
      list.appendChild(freeInput);
      document.getElementById("free-send").onclick = function () {
        var q = document.getElementById("free-q").value.trim();
        if (q) {
          CharacterEngine.askCharacter(charName, q, function (result) {
            renderResponse(charName, result.data, -1);
          });
        }
      };
    }
  }

  function playQAResponse(charName, qa, idx) {
    if (!state.answeredQA[charName]) state.answeredQA[charName] = [];
    if (state.answeredQA[charName].indexOf(idx) < 0) {
      state.answeredQA[charName].push(idx);
    }
    var btns = document.querySelectorAll("#qa-list .qa-btn");
    if (btns[idx]) btns[idx].classList.add("qa-answered");
    renderResponse(charName, qa, idx);
    saveState();
    checkCompletion();
  }

  function renderResponse(charName, qa, idx) {
    if (!qa) return;
    var respEl = document.getElementById("qa-response");
    if (!respEl) return;
    var audioFile =
      qa.audio_url ||
      "../content/characters/" +
        encodeURIComponent(charName) +
        "/qa/q" +
        String(idx + 1).padStart(2, "0") +
        ".mp3";
    var videoFile = qa.video_url || "";
    respEl.innerHTML =
      '<div class="response-card">' +
      (videoFile
        ? '<video class="response-video" src="' +
          videoFile +
          '" autoplay></video>'
        : "") +
      '<p class="response-text">' +
      (qa.response_text || "") +
      "</p>" +
      '<audio id="resp-audio" src="' +
      audioFile +
      '" autoplay></audio>' +
      "</div>";
  }

  window.addEventListener("beforeunload", function () {
    saveState();
    ScormAPI.finish();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
