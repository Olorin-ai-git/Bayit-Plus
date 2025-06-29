/*!
 * gaia-webplugin
 * Copyright (c) 2025 - Present Intuit Inc. All rights reserved. Unauthorized reproduction is a violation of applicable law. This material contains certain confidential and proprietary information and trade secrets of Intuit Inc.
 */

/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self.webpackChunkgaia_webplugin = self.webpackChunkgaia_webplugin || []).push([
  ['src_mock_risk_json'],
  {
    /***/ './src/mock/risk.json':
      /*! ****************************!*\
  !*** ./src/mock/risk.json ***!
  \*************************** */
      /***/ (module) => {
        module.exports = JSON.parse(
          '{"overall_risk_score":0.65,"risk_level":"High","risk_factors":["Network: Multiple device logins from different countries within a short timeframe (risk: 0.8)","Device: Rapid location shift from the US to India on the same device within 15 minutes (risk: 0.9)","Location: Multiple valid US addresses, but no conflicting or high-risk indicators (risk: 0.2)","Logs: Failed login from new device in a different region/country (risk: 0.7)"],"thoughts":"The overall risk assessment for user 4621097846089147992 is HIGH. The device and network agents both detected rapid geographic switching between the US and India within a very short time window, which is highly anomalous and indicative of possible account compromise or credential sharing. The logs agent also flagged a failed login from a new device in a different country immediately after a successful US login, further supporting the possibility of suspicious activity. While all provided physical addresses are within the US and show no direct conflicts, the device and network signals outweigh the low location risk. Given the high risk scores from device (0.9), network (0.8), and logs (0.7), the overall risk score is calculated as 0.65, and the case should be escalated for further investigation.","timestamp":"2025-05-18T01:00:00Z"}',
        );

        /***/
      },
  },
]);
