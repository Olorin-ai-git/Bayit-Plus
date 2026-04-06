/**
 * SCORM 1.2 API Wrapper
 * Finds the LMS API in parent/opener frames and provides get/set/commit.
 */
var ScormAPI = (function () {
  var api = null;
  var initialized = false;

  function findAPI(win) {
    var attempts = 0;
    while (win && !win.API && attempts < 10) {
      if (win.opener && win.opener.API) return win.opener.API;
      if (win.parent === win) break;
      win = win.parent;
      attempts++;
    }
    return win ? win.API : null;
  }

  function init() {
    api = findAPI(window);
    if (!api) {
      console.warn("[SCORM] No LMS API found — running in standalone mode");
      return false;
    }
    var result = api.LMSInitialize("");
    initialized = result === "true" || result === true;
    if (initialized) {
      var status = api.LMSGetValue("cmi.core.lesson_status");
      if (status === "not attempted" || status === "") {
        api.LMSSetValue("cmi.core.lesson_status", "incomplete");
        api.LMSCommit("");
      }
    }
    return initialized;
  }

  function getValue(key) {
    if (!api || !initialized) return "";
    return api.LMSGetValue(key) || "";
  }

  function setValue(key, value) {
    if (!api || !initialized) return false;
    var result = api.LMSSetValue(key, String(value));
    return result === "true" || result === true;
  }

  function commit() {
    if (!api || !initialized) return false;
    var result = api.LMSCommit("");
    return result === "true" || result === true;
  }

  function finish() {
    if (!api || !initialized) return;
    api.LMSFinish("");
    initialized = false;
  }

  function isConnected() {
    return api !== null && initialized;
  }

  return {
    init: init,
    getValue: getValue,
    setValue: setValue,
    commit: commit,
    finish: finish,
    isConnected: isConnected,
  };
})();
