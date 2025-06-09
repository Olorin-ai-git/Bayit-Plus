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
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("web-shell-core/default/PluginRegistryService"), require("react"), require("web-shell-core/widgets/BaseWidget"), require("@design-systems/theme"), require("react-intl"), require("prop-types"), require("@appfabric/ui-data-layer/client"));
	else if(typeof define === 'function' && define.amd)
		define(["web-shell-core/default/PluginRegistryService", "react", "web-shell-core/widgets/BaseWidget", "@design-systems/theme", "react-intl", "prop-types", "@appfabric/ui-data-layer/client"], factory);
	else if(typeof exports === 'object')
		exports["gaia-webplugin"] = factory(require("web-shell-core/default/PluginRegistryService"), require("react"), require("web-shell-core/widgets/BaseWidget"), require("@design-systems/theme"), require("react-intl"), require("prop-types"), require("@appfabric/ui-data-layer/client"));
	else
		root["gaia-webplugin"] = factory(root["web-shell-core/default/PluginRegistryService"], root["react"], root["web-shell-core/widgets/BaseWidget"], root["@design-systems/theme"], root["react-intl"], root["prop-types"], root["@appfabric/ui-data-layer/client"]);
})(self, (__WEBPACK_EXTERNAL_MODULE_web_shell_core_default_PluginRegistryService__, __WEBPACK_EXTERNAL_MODULE_react__, __WEBPACK_EXTERNAL_MODULE_web_shell_core_widgets_BaseWidget__, __WEBPACK_EXTERNAL_MODULE__design_systems_theme__, __WEBPACK_EXTERNAL_MODULE_react_intl__, __WEBPACK_EXTERNAL_MODULE_prop_types__, __WEBPACK_EXTERNAL_MODULE__appfabric_ui_data_layer_client__) => {
return /******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "../../.local/share/appf-tools/@appfabric/plugin-cli/v_gt__eq_4.0.0__lt_5.0.0_0/package/node_modules/@appfabric/plugin-config-loader/index.js?enableHmr=false!./src/config.json":
/*!**************************************************************************************************************************************************************************************!*\
  !*** ../../.local/share/appf-tools/@appfabric/plugin-cli/v_gt__eq_4.0.0__lt_5.0.0_0/package/node_modules/@appfabric/plugin-config-loader/index.js?enableHmr=false!./src/config.json ***!
  \**************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

eval("(__webpack_require__(/*! plugin-config-loader/src/pluginDefine/init-webpack */ \"../../.local/share/appf-tools/@appfabric/plugin-cli/v_gt__eq_4.0.0__lt_5.0.0_0/package/node_modules/@appfabric/plugin-config-loader/src/pluginDefine/init-webpack.js\").initPublicPath)(\"gaia-webplugin\", \"undefined\", false);\nvar loadPluginAMDDefinitions = (__webpack_require__(/*! plugin-config-loader/src/pluginDefine/load-plugin-amd-definitions */ \"../../.local/share/appf-tools/@appfabric/plugin-cli/v_gt__eq_4.0.0__lt_5.0.0_0/package/node_modules/@appfabric/plugin-config-loader/src/pluginDefine/load-plugin-amd-definitions.js\")[\"default\"]);\nloadPluginAMDDefinitions({\n        \"gaia-webplugin/js/widgets/gaia/widget\": function() {\n            return Promise.all(/*! import() | gaia-webplugin-gaia-1_0_0 */[__webpack_require__.e(\"heroicons-node_modules_heroicons_react_24_outline_esm_PencilSquareIcon_js\"), __webpack_require__.e(\"vendors-_local_share_appf-tools_appfabric_plugin-cli_v_gt__eq_4_0_0__lt_5_0_0_0_package_node_-8f4863\"), __webpack_require__.e(\"vendors-node_modules_react-icons_fa_index_mjs\"), __webpack_require__.e(\"vendors-node_modules_react-icons_md_index_mjs\"), __webpack_require__.e(\"gaia-webplugin-gaia-1_0_0-src_js_c\"), __webpack_require__.e(\"gaia-webplugin-gaia-1_0_0-src_js_pages_I\"), __webpack_require__.e(\"gaia-webplugin-gaia-1_0_0-src_js_s\"), __webpack_require__.e(\"gaia-webplugin-gaia-1_0_0-src_m\")]).then(__webpack_require__.bind(__webpack_require__, /*! ./js/widgets/gaia/GaiaWidget */ \"./src/js/widgets/gaia/GaiaWidget.tsx\")).then(function(obj) {\n    var objClass = obj.__esModule ? obj.default : obj;\n    return {\"id\":\"gaia-webplugin/gaia\",\"classification\":\"public\",\"version\":\"1.0.0\",\"interface\":{},\"main\": objClass};\n});\n\n        }\n});//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi4vLi4vLmxvY2FsL3NoYXJlL2FwcGYtdG9vbHMvQGFwcGZhYnJpYy9wbHVnaW4tY2xpL3ZfZ3RfX2VxXzQuMC4wX19sdF81LjAuMF8wL3BhY2thZ2Uvbm9kZV9tb2R1bGVzL0BhcHBmYWJyaWMvcGx1Z2luLWNvbmZpZy1sb2FkZXIvaW5kZXguanM/ZW5hYmxlSG1yPWZhbHNlIS4vc3JjL2NvbmZpZy5qc29uLmpzIiwibWFwcGluZ3MiOiJBQUFBLHNRQUE0RTtBQUM1RSwrQkFBK0IsZ1NBQW9GO0FBQ25IO0FBQ0E7QUFDQSxtQkFBbUIsa3lCQUEwRjtBQUM3RztBQUNBLFlBQVkscUZBQXFGO0FBQ2pHLENBQUM7O0FBRUQ7QUFDQSxDQUFDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vZ2FpYS13ZWJwbHVnaW4vLi9zcmMvY29uZmlnLmpzb24/Y2MyZiJdLCJzb3VyY2VzQ29udGVudCI6WyJyZXF1aXJlKFwicGx1Z2luLWNvbmZpZy1sb2FkZXIvc3JjL3BsdWdpbkRlZmluZS9pbml0LXdlYnBhY2tcIikuaW5pdFB1YmxpY1BhdGgoXCJnYWlhLXdlYnBsdWdpblwiLCBcInVuZGVmaW5lZFwiLCBmYWxzZSk7XG52YXIgbG9hZFBsdWdpbkFNRERlZmluaXRpb25zID0gcmVxdWlyZShcInBsdWdpbi1jb25maWctbG9hZGVyL3NyYy9wbHVnaW5EZWZpbmUvbG9hZC1wbHVnaW4tYW1kLWRlZmluaXRpb25zXCIpLmRlZmF1bHQ7XG5sb2FkUGx1Z2luQU1ERGVmaW5pdGlvbnMoe1xuICAgICAgICBcImdhaWEtd2VicGx1Z2luL2pzL3dpZGdldHMvZ2FpYS93aWRnZXRcIjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gaW1wb3J0KC8qIHdlYnBhY2tDaHVua05hbWU6IFwiZ2FpYS13ZWJwbHVnaW4tZ2FpYS0xXzBfMFwiICovICcuL2pzL3dpZGdldHMvZ2FpYS9HYWlhV2lkZ2V0JykudGhlbihmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgb2JqQ2xhc3MgPSBvYmouX19lc01vZHVsZSA/IG9iai5kZWZhdWx0IDogb2JqO1xuICAgIHJldHVybiB7XCJpZFwiOlwiZ2FpYS13ZWJwbHVnaW4vZ2FpYVwiLFwiY2xhc3NpZmljYXRpb25cIjpcInB1YmxpY1wiLFwidmVyc2lvblwiOlwiMS4wLjBcIixcImludGVyZmFjZVwiOnt9LFwibWFpblwiOiBvYmpDbGFzc307XG59KTtcblxuICAgICAgICB9XG59KTsiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///../../.local/share/appf-tools/@appfabric/plugin-cli/v_gt__eq_4.0.0__lt_5.0.0_0/package/node_modules/@appfabric/plugin-config-loader/index.js?enableHmr=false!./src/config.json\n");

/***/ }),

/***/ "../../.local/share/appf-tools/@appfabric/plugin-cli/v_gt__eq_4.0.0__lt_5.0.0_0/package/node_modules/@appfabric/plugin-config-loader/src/pluginDefine/global-amd.js":
/*!**************************************************************************************************************************************************************************!*\
  !*** ../../.local/share/appf-tools/@appfabric/plugin-cli/v_gt__eq_4.0.0__lt_5.0.0_0/package/node_modules/@appfabric/plugin-config-loader/src/pluginDefine/global-amd.js ***!
  \**************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   define: () => (/* binding */ define),\n/* harmony export */   getGlobalAMDFunctions: () => (/* binding */ getGlobalAMDFunctions),\n/* harmony export */   require: () => (/* binding */ require)\n/* harmony export */ });\n/* globals window */\n/**\n * It is assumed that there will be a global window object in the browser\n * This function gets and returns that object.\n * @returns {Object} the window object\n */\nfunction getWindowObject() {\n  if (window) {\n    return window;\n  }\n  return null;\n}\n\n/**\n * Gets the global AMD function off the window object\n * @param {Object} window global window object in the browser\n * @returns {Object} with properties `require` and `define` from the global window object\n */\nfunction getGlobalAMDFunctions(window) {\n  // eslint-disable-next-line no-underscore-dangle\n  let _require;\n  // eslint-disable-next-line no-underscore-dangle\n  let _define;\n\n  if (window && typeof window.define === 'function') {\n    _define = window.define;\n  } else {\n    _define = () => {};\n  }\n\n  if (window && typeof window.require === 'function') {\n    _require = window.require;\n  } else {\n    _require = () => {};\n  }\n\n  return { require: _require, define: _define };\n}\n\nconst { require, define } = getGlobalAMDFunctions(getWindowObject());\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi4vLi4vLmxvY2FsL3NoYXJlL2FwcGYtdG9vbHMvQGFwcGZhYnJpYy9wbHVnaW4tY2xpL3ZfZ3RfX2VxXzQuMC4wX19sdF81LjAuMF8wL3BhY2thZ2Uvbm9kZV9tb2R1bGVzL0BhcHBmYWJyaWMvcGx1Z2luLWNvbmZpZy1sb2FkZXIvc3JjL3BsdWdpbkRlZmluZS9nbG9iYWwtYW1kLmpzLmpzIiwibWFwcGluZ3MiOiI7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYSxRQUFRO0FBQ3JCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxXQUFXLFFBQVE7QUFDbkIsYUFBYSxRQUFRO0FBQ3JCO0FBQ087QUFDUDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsSUFBSTtBQUNKO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBOztBQUVBLFdBQVc7QUFDWDs7QUFFTyxRQUFRLGtCQUFrQiIsInNvdXJjZXMiOlsid2VicGFjazovL2dhaWEtd2VicGx1Z2luLy4uLy4uLy5sb2NhbC9zaGFyZS9hcHBmLXRvb2xzL0BhcHBmYWJyaWMvcGx1Z2luLWNsaS92X2d0X19lcV80LjAuMF9fbHRfNS4wLjBfMC9wYWNrYWdlL25vZGVfbW9kdWxlcy9AYXBwZmFicmljL3BsdWdpbi1jb25maWctbG9hZGVyL3NyYy9wbHVnaW5EZWZpbmUvZ2xvYmFsLWFtZC5qcz8wMTY5Il0sInNvdXJjZXNDb250ZW50IjpbIi8qIGdsb2JhbHMgd2luZG93ICovXG4vKipcbiAqIEl0IGlzIGFzc3VtZWQgdGhhdCB0aGVyZSB3aWxsIGJlIGEgZ2xvYmFsIHdpbmRvdyBvYmplY3QgaW4gdGhlIGJyb3dzZXJcbiAqIFRoaXMgZnVuY3Rpb24gZ2V0cyBhbmQgcmV0dXJucyB0aGF0IG9iamVjdC5cbiAqIEByZXR1cm5zIHtPYmplY3R9IHRoZSB3aW5kb3cgb2JqZWN0XG4gKi9cbmZ1bmN0aW9uIGdldFdpbmRvd09iamVjdCgpIHtcbiAgaWYgKHdpbmRvdykge1xuICAgIHJldHVybiB3aW5kb3c7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8qKlxuICogR2V0cyB0aGUgZ2xvYmFsIEFNRCBmdW5jdGlvbiBvZmYgdGhlIHdpbmRvdyBvYmplY3RcbiAqIEBwYXJhbSB7T2JqZWN0fSB3aW5kb3cgZ2xvYmFsIHdpbmRvdyBvYmplY3QgaW4gdGhlIGJyb3dzZXJcbiAqIEByZXR1cm5zIHtPYmplY3R9IHdpdGggcHJvcGVydGllcyBgcmVxdWlyZWAgYW5kIGBkZWZpbmVgIGZyb20gdGhlIGdsb2JhbCB3aW5kb3cgb2JqZWN0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRHbG9iYWxBTURGdW5jdGlvbnMod2luZG93KSB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11bmRlcnNjb3JlLWRhbmdsZVxuICBsZXQgX3JlcXVpcmU7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby11bmRlcnNjb3JlLWRhbmdsZVxuICBsZXQgX2RlZmluZTtcblxuICBpZiAod2luZG93ICYmIHR5cGVvZiB3aW5kb3cuZGVmaW5lID09PSAnZnVuY3Rpb24nKSB7XG4gICAgX2RlZmluZSA9IHdpbmRvdy5kZWZpbmU7XG4gIH0gZWxzZSB7XG4gICAgX2RlZmluZSA9ICgpID0+IHt9O1xuICB9XG5cbiAgaWYgKHdpbmRvdyAmJiB0eXBlb2Ygd2luZG93LnJlcXVpcmUgPT09ICdmdW5jdGlvbicpIHtcbiAgICBfcmVxdWlyZSA9IHdpbmRvdy5yZXF1aXJlO1xuICB9IGVsc2Uge1xuICAgIF9yZXF1aXJlID0gKCkgPT4ge307XG4gIH1cblxuICByZXR1cm4geyByZXF1aXJlOiBfcmVxdWlyZSwgZGVmaW5lOiBfZGVmaW5lIH07XG59XG5cbmV4cG9ydCBjb25zdCB7IHJlcXVpcmUsIGRlZmluZSB9ID0gZ2V0R2xvYmFsQU1ERnVuY3Rpb25zKGdldFdpbmRvd09iamVjdCgpKTtcbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///../../.local/share/appf-tools/@appfabric/plugin-cli/v_gt__eq_4.0.0__lt_5.0.0_0/package/node_modules/@appfabric/plugin-config-loader/src/pluginDefine/global-amd.js\n");

/***/ }),

/***/ "../../.local/share/appf-tools/@appfabric/plugin-cli/v_gt__eq_4.0.0__lt_5.0.0_0/package/node_modules/@appfabric/plugin-config-loader/src/pluginDefine/init-webpack.js":
/*!****************************************************************************************************************************************************************************!*\
  !*** ../../.local/share/appf-tools/@appfabric/plugin-cli/v_gt__eq_4.0.0__lt_5.0.0_0/package/node_modules/@appfabric/plugin-config-loader/src/pluginDefine/init-webpack.js ***!
  \****************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   initPublicPath: () => (/* binding */ initPublicPath)\n/* harmony export */ });\n/* harmony import */ var web_shell_core_default_PluginRegistryService__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! web-shell-core/default/PluginRegistryService */ \"web-shell-core/default/PluginRegistryService\");\n/* harmony import */ var web_shell_core_default_PluginRegistryService__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(web_shell_core_default_PluginRegistryService__WEBPACK_IMPORTED_MODULE_0__);\n/* global __webpack_public_path__ window */\n/* eslint camelcase:0, no-global-assign:0, no-console:0, import/prefer-default-export:0 */\n// eslint-disable-next-line import/extensions, import/no-unresolved\n\n\n/**\n * Sets the public path variable in the webpack config to allow the bundle to request assets from the CDN\n * If no plugin name is provided, this will return\n * @param {String} pluginName The name of the plugin loading\n * @param {String} globalToSet a global variable to be set on the window object that maps to the webpack publicPath\n * @param {boolean} isAppArtifact true if current build is for app artifact else false\n * @returns {void}\n */\nfunction initPublicPath(pluginName, globalToSet, isAppArtifact) {\n  if (!pluginName) {\n    return;\n  }\n\n  if (!__webpack_require__.p) {\n    if (isAppArtifact) {\n      __webpack_require__.p = `${web_shell_core_default_PluginRegistryService__WEBPACK_IMPORTED_MODULE_0___default().getAppBaseSourceURL()}/`;\n    } else {\n      const pluginConfig = web_shell_core_default_PluginRegistryService__WEBPACK_IMPORTED_MODULE_0___default().findById(pluginName);\n      if (pluginConfig && pluginConfig.baseSourceUrl) {\n        __webpack_require__.p = `${pluginConfig.baseSourceUrl}/`; // eslint-disable-line no-undef\n      } else {\n        console.error(\n          'Cannot find plugin configuration, __webpack_public_path__ not set',\n        );\n      }\n    }\n  } else {\n    console.debug(\n      `__webpack_public_path__ is already set to '${__webpack_require__.p}'`,\n    );\n  }\n\n  if (globalToSet && globalToSet !== 'undefined') {\n    window[globalToSet] = __webpack_require__.p;\n  }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi4vLi4vLmxvY2FsL3NoYXJlL2FwcGYtdG9vbHMvQGFwcGZhYnJpYy9wbHVnaW4tY2xpL3ZfZ3RfX2VxXzQuMC4wX19sdF81LjAuMF8wL3BhY2thZ2Uvbm9kZV9tb2R1bGVzL0BhcHBmYWJyaWMvcGx1Z2luLWNvbmZpZy1sb2FkZXIvc3JjL3BsdWdpbkRlZmluZS9pbml0LXdlYnBhY2suanMuanMiLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ2lGOztBQUVqRjtBQUNBO0FBQ0E7QUFDQSxXQUFXLFFBQVE7QUFDbkIsV0FBVyxRQUFRO0FBQ25CLFdBQVcsU0FBUztBQUNwQixhQUFhO0FBQ2I7QUFDTztBQUNQO0FBQ0E7QUFDQTs7QUFFQSxPQUFPLHFCQUF1QjtBQUM5QjtBQUNBLE1BQU0scUJBQXVCLE1BQU0sdUdBQXlDLEdBQUc7QUFDL0UsTUFBTTtBQUNOLDJCQUEyQiw0RkFBOEI7QUFDekQ7QUFDQSxRQUFRLHFCQUF1QixNQUFNLDJCQUEyQixJQUFJO0FBQ3BFLFFBQVE7QUFDUjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSTtBQUNKO0FBQ0Esb0RBQW9ELHFCQUF1QixDQUFDO0FBQzVFO0FBQ0E7O0FBRUE7QUFDQSwwQkFBMEIscUJBQXVCO0FBQ2pEO0FBQ0EiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9nYWlhLXdlYnBsdWdpbi8uLi8uLi8ubG9jYWwvc2hhcmUvYXBwZi10b29scy9AYXBwZmFicmljL3BsdWdpbi1jbGkvdl9ndF9fZXFfNC4wLjBfX2x0XzUuMC4wXzAvcGFja2FnZS9ub2RlX21vZHVsZXMvQGFwcGZhYnJpYy9wbHVnaW4tY29uZmlnLWxvYWRlci9zcmMvcGx1Z2luRGVmaW5lL2luaXQtd2VicGFjay5qcz8zNTYwIl0sInNvdXJjZXNDb250ZW50IjpbIi8qIGdsb2JhbCBfX3dlYnBhY2tfcHVibGljX3BhdGhfXyB3aW5kb3cgKi9cbi8qIGVzbGludCBjYW1lbGNhc2U6MCwgbm8tZ2xvYmFsLWFzc2lnbjowLCBuby1jb25zb2xlOjAsIGltcG9ydC9wcmVmZXItZGVmYXVsdC1leHBvcnQ6MCAqL1xuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGltcG9ydC9leHRlbnNpb25zLCBpbXBvcnQvbm8tdW5yZXNvbHZlZFxuaW1wb3J0IFBsdWdpblJlZ2lzdHJ5U2VydmljZSBmcm9tICd3ZWItc2hlbGwtY29yZS9kZWZhdWx0L1BsdWdpblJlZ2lzdHJ5U2VydmljZSc7XG5cbi8qKlxuICogU2V0cyB0aGUgcHVibGljIHBhdGggdmFyaWFibGUgaW4gdGhlIHdlYnBhY2sgY29uZmlnIHRvIGFsbG93IHRoZSBidW5kbGUgdG8gcmVxdWVzdCBhc3NldHMgZnJvbSB0aGUgQ0ROXG4gKiBJZiBubyBwbHVnaW4gbmFtZSBpcyBwcm92aWRlZCwgdGhpcyB3aWxsIHJldHVyblxuICogQHBhcmFtIHtTdHJpbmd9IHBsdWdpbk5hbWUgVGhlIG5hbWUgb2YgdGhlIHBsdWdpbiBsb2FkaW5nXG4gKiBAcGFyYW0ge1N0cmluZ30gZ2xvYmFsVG9TZXQgYSBnbG9iYWwgdmFyaWFibGUgdG8gYmUgc2V0IG9uIHRoZSB3aW5kb3cgb2JqZWN0IHRoYXQgbWFwcyB0byB0aGUgd2VicGFjayBwdWJsaWNQYXRoXG4gKiBAcGFyYW0ge2Jvb2xlYW59IGlzQXBwQXJ0aWZhY3QgdHJ1ZSBpZiBjdXJyZW50IGJ1aWxkIGlzIGZvciBhcHAgYXJ0aWZhY3QgZWxzZSBmYWxzZVxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbml0UHVibGljUGF0aChwbHVnaW5OYW1lLCBnbG9iYWxUb1NldCwgaXNBcHBBcnRpZmFjdCkge1xuICBpZiAoIXBsdWdpbk5hbWUpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAoIV9fd2VicGFja19wdWJsaWNfcGF0aF9fKSB7XG4gICAgaWYgKGlzQXBwQXJ0aWZhY3QpIHtcbiAgICAgIF9fd2VicGFja19wdWJsaWNfcGF0aF9fID0gYCR7UGx1Z2luUmVnaXN0cnlTZXJ2aWNlLmdldEFwcEJhc2VTb3VyY2VVUkwoKX0vYDtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgcGx1Z2luQ29uZmlnID0gUGx1Z2luUmVnaXN0cnlTZXJ2aWNlLmZpbmRCeUlkKHBsdWdpbk5hbWUpO1xuICAgICAgaWYgKHBsdWdpbkNvbmZpZyAmJiBwbHVnaW5Db25maWcuYmFzZVNvdXJjZVVybCkge1xuICAgICAgICBfX3dlYnBhY2tfcHVibGljX3BhdGhfXyA9IGAke3BsdWdpbkNvbmZpZy5iYXNlU291cmNlVXJsfS9gOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXVuZGVmXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgICdDYW5ub3QgZmluZCBwbHVnaW4gY29uZmlndXJhdGlvbiwgX193ZWJwYWNrX3B1YmxpY19wYXRoX18gbm90IHNldCcsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGNvbnNvbGUuZGVidWcoXG4gICAgICBgX193ZWJwYWNrX3B1YmxpY19wYXRoX18gaXMgYWxyZWFkeSBzZXQgdG8gJyR7X193ZWJwYWNrX3B1YmxpY19wYXRoX199J2AsXG4gICAgKTtcbiAgfVxuXG4gIGlmIChnbG9iYWxUb1NldCAmJiBnbG9iYWxUb1NldCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICB3aW5kb3dbZ2xvYmFsVG9TZXRdID0gX193ZWJwYWNrX3B1YmxpY19wYXRoX187XG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///../../.local/share/appf-tools/@appfabric/plugin-cli/v_gt__eq_4.0.0__lt_5.0.0_0/package/node_modules/@appfabric/plugin-config-loader/src/pluginDefine/init-webpack.js\n");

/***/ }),

/***/ "../../.local/share/appf-tools/@appfabric/plugin-cli/v_gt__eq_4.0.0__lt_5.0.0_0/package/node_modules/@appfabric/plugin-config-loader/src/pluginDefine/load-plugin-amd-definitions.js":
/*!*******************************************************************************************************************************************************************************************!*\
  !*** ../../.local/share/appf-tools/@appfabric/plugin-cli/v_gt__eq_4.0.0__lt_5.0.0_0/package/node_modules/@appfabric/plugin-config-loader/src/pluginDefine/load-plugin-amd-definitions.js ***!
  \*******************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ loadPluginAMDDefinitions)\n/* harmony export */ });\n/* harmony import */ var _global_amd__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./global-amd */ \"../../.local/share/appf-tools/@appfabric/plugin-cli/v_gt__eq_4.0.0__lt_5.0.0_0/package/node_modules/@appfabric/plugin-config-loader/src/pluginDefine/global-amd.js\");\n\n/**\n * Given definitions, calls define on the definition\n * @param {Object} definitions object of definitions\n * @returns {void}\n */\nfunction loadPluginAMDDefinitions(definitions) {\n  Object.keys(definitions).forEach(key => {\n    if ({}.hasOwnProperty.call(definitions, key)) {\n      (0,_global_amd__WEBPACK_IMPORTED_MODULE_0__.define)(key, [], definitions[key]);\n    }\n  });\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi4vLi4vLmxvY2FsL3NoYXJlL2FwcGYtdG9vbHMvQGFwcGZhYnJpYy9wbHVnaW4tY2xpL3ZfZ3RfX2VxXzQuMC4wX19sdF81LjAuMF8wL3BhY2thZ2Uvbm9kZV9tb2R1bGVzL0BhcHBmYWJyaWMvcGx1Z2luLWNvbmZpZy1sb2FkZXIvc3JjL3BsdWdpbkRlZmluZS9sb2FkLXBsdWdpbi1hbWQtZGVmaW5pdGlvbnMuanMuanMiLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBc0M7QUFDdEM7QUFDQTtBQUNBLFdBQVcsUUFBUTtBQUNuQixhQUFhO0FBQ2I7QUFDZTtBQUNmO0FBQ0EsVUFBVTtBQUNWLE1BQU0sbURBQU07QUFDWjtBQUNBLEdBQUc7QUFDSCIsInNvdXJjZXMiOlsid2VicGFjazovL2dhaWEtd2VicGx1Z2luLy4uLy4uLy5sb2NhbC9zaGFyZS9hcHBmLXRvb2xzL0BhcHBmYWJyaWMvcGx1Z2luLWNsaS92X2d0X19lcV80LjAuMF9fbHRfNS4wLjBfMC9wYWNrYWdlL25vZGVfbW9kdWxlcy9AYXBwZmFicmljL3BsdWdpbi1jb25maWctbG9hZGVyL3NyYy9wbHVnaW5EZWZpbmUvbG9hZC1wbHVnaW4tYW1kLWRlZmluaXRpb25zLmpzP2QyM2IiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgZGVmaW5lIH0gZnJvbSAnLi9nbG9iYWwtYW1kJztcbi8qKlxuICogR2l2ZW4gZGVmaW5pdGlvbnMsIGNhbGxzIGRlZmluZSBvbiB0aGUgZGVmaW5pdGlvblxuICogQHBhcmFtIHtPYmplY3R9IGRlZmluaXRpb25zIG9iamVjdCBvZiBkZWZpbml0aW9uc1xuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGxvYWRQbHVnaW5BTUREZWZpbml0aW9ucyhkZWZpbml0aW9ucykge1xuICBPYmplY3Qua2V5cyhkZWZpbml0aW9ucykuZm9yRWFjaChrZXkgPT4ge1xuICAgIGlmICh7fS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGRlZmluaXRpb25zLCBrZXkpKSB7XG4gICAgICBkZWZpbmUoa2V5LCBbXSwgZGVmaW5pdGlvbnNba2V5XSk7XG4gICAgfVxuICB9KTtcbn1cbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///../../.local/share/appf-tools/@appfabric/plugin-cli/v_gt__eq_4.0.0__lt_5.0.0_0/package/node_modules/@appfabric/plugin-config-loader/src/pluginDefine/load-plugin-amd-definitions.js\n");

/***/ }),

/***/ "@appfabric/ui-data-layer/client":
/*!**************************************************!*\
  !*** external "@appfabric/ui-data-layer/client" ***!
  \**************************************************/
/***/ ((module) => {

"use strict";
module.exports = __WEBPACK_EXTERNAL_MODULE__appfabric_ui_data_layer_client__;

/***/ }),

/***/ "@design-systems/theme":
/*!****************************************!*\
  !*** external "@design-systems/theme" ***!
  \****************************************/
/***/ ((module) => {

"use strict";
module.exports = __WEBPACK_EXTERNAL_MODULE__design_systems_theme__;

/***/ }),

/***/ "prop-types":
/*!*****************************!*\
  !*** external "prop-types" ***!
  \*****************************/
/***/ ((module) => {

"use strict";
module.exports = __WEBPACK_EXTERNAL_MODULE_prop_types__;

/***/ }),

/***/ "react":
/*!************************!*\
  !*** external "react" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = __WEBPACK_EXTERNAL_MODULE_react__;

/***/ }),

/***/ "react-intl":
/*!*****************************!*\
  !*** external "react-intl" ***!
  \*****************************/
/***/ ((module) => {

"use strict";
module.exports = __WEBPACK_EXTERNAL_MODULE_react_intl__;

/***/ }),

/***/ "web-shell-core/default/PluginRegistryService":
/*!***************************************************************!*\
  !*** external "web-shell-core/default/PluginRegistryService" ***!
  \***************************************************************/
/***/ ((module) => {

"use strict";
module.exports = __WEBPACK_EXTERNAL_MODULE_web_shell_core_default_PluginRegistryService__;

/***/ }),

/***/ "web-shell-core/widgets/BaseWidget":
/*!****************************************************!*\
  !*** external "web-shell-core/widgets/BaseWidget" ***!
  \****************************************************/
/***/ ((module) => {

"use strict";
module.exports = __WEBPACK_EXTERNAL_MODULE_web_shell_core_widgets_BaseWidget__;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "js/" + chunkId + ".js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/load script */
/******/ 	(() => {
/******/ 		var inProgress = {};
/******/ 		var dataWebpackPrefix = "gaia-webplugin:";
/******/ 		// loadScript function to load a script via script tag
/******/ 		__webpack_require__.l = (url, done, key, chunkId) => {
/******/ 			if(inProgress[url]) { inProgress[url].push(done); return; }
/******/ 			var script, needAttach;
/******/ 			if(key !== undefined) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				for(var i = 0; i < scripts.length; i++) {
/******/ 					var s = scripts[i];
/******/ 					if(s.getAttribute("src") == url || s.getAttribute("data-webpack") == dataWebpackPrefix + key) { script = s; break; }
/******/ 				}
/******/ 			}
/******/ 			if(!script) {
/******/ 				needAttach = true;
/******/ 				script = document.createElement('script');
/******/ 		
/******/ 				script.charset = 'utf-8';
/******/ 				script.timeout = 360;
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.setAttribute("data-webpack", dataWebpackPrefix + key);
/******/ 				script.src = url;
/******/ 				if (script.src.indexOf(window.location.origin + '/') !== 0) {
/******/ 					script.crossOrigin = "anonymous";
/******/ 				}
/******/ 			}
/******/ 			inProgress[url] = [done];
/******/ 			var onScriptComplete = (prev, event) => {
/******/ 				// avoid mem leaks in IE.
/******/ 				script.onerror = script.onload = null;
/******/ 				clearTimeout(timeout);
/******/ 				var doneFns = inProgress[url];
/******/ 				delete inProgress[url];
/******/ 				script.parentNode && script.parentNode.removeChild(script);
/******/ 				doneFns && doneFns.forEach((fn) => (fn(event)));
/******/ 				if(prev) return prev(event);
/******/ 			}
/******/ 			var timeout = setTimeout(onScriptComplete.bind(null, undefined, { type: 'timeout', target: script }), 360000);
/******/ 			script.onerror = onScriptComplete.bind(null, script.onerror);
/******/ 			script.onload = onScriptComplete.bind(null, script.onload);
/******/ 			needAttach && document.head.appendChild(script);
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		__webpack_require__.p = "";
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			"gaia-webplugin": 0
/******/ 		};
/******/ 		
/******/ 		__webpack_require__.f.j = (chunkId, promises) => {
/******/ 				// JSONP chunk loading for javascript
/******/ 				var installedChunkData = __webpack_require__.o(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;
/******/ 				if(installedChunkData !== 0) { // 0 means "already installed".
/******/ 		
/******/ 					// a Promise means "currently loading".
/******/ 					if(installedChunkData) {
/******/ 						promises.push(installedChunkData[2]);
/******/ 					} else {
/******/ 						if(true) { // all chunks have JS
/******/ 							// setup Promise in chunk cache
/******/ 							var promise = new Promise((resolve, reject) => (installedChunkData = installedChunks[chunkId] = [resolve, reject]));
/******/ 							promises.push(installedChunkData[2] = promise);
/******/ 		
/******/ 							// start chunk loading
/******/ 							var url = __webpack_require__.p + __webpack_require__.u(chunkId);
/******/ 							// create error before stack unwound to get useful stacktrace later
/******/ 							var error = new Error();
/******/ 							var loadingEnded = (event) => {
/******/ 								if(__webpack_require__.o(installedChunks, chunkId)) {
/******/ 									installedChunkData = installedChunks[chunkId];
/******/ 									if(installedChunkData !== 0) installedChunks[chunkId] = undefined;
/******/ 									if(installedChunkData) {
/******/ 										var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 										var realSrc = event && event.target && event.target.src;
/******/ 										error.message = 'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
/******/ 										error.name = 'ChunkLoadError';
/******/ 										error.type = errorType;
/******/ 										error.request = realSrc;
/******/ 										installedChunkData[1](error);
/******/ 									}
/******/ 								}
/******/ 							};
/******/ 							__webpack_require__.l(url, loadingEnded, "chunk-" + chunkId, chunkId);
/******/ 						}
/******/ 					}
/******/ 				}
/******/ 		};
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		// no on chunks loaded
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		var webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
/******/ 			var [chunkIds, moreModules, runtime] = data;
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0;
/******/ 			if(chunkIds.some((id) => (installedChunks[id] !== 0))) {
/******/ 				for(moduleId in moreModules) {
/******/ 					if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 						__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 					}
/******/ 				}
/******/ 				if(runtime) var result = runtime(__webpack_require__);
/******/ 			}
/******/ 			if(parentChunkLoadingFunction) parentChunkLoadingFunction(data);
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					installedChunks[chunkId][0]();
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 		
/******/ 		}
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunkgaia_webplugin"] = self["webpackChunkgaia_webplugin"] || [];
/******/ 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/nonce */
/******/ 	(() => {
/******/ 		__webpack_require__.nc = undefined;
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval-source-map devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("../../.local/share/appf-tools/@appfabric/plugin-cli/v_gt__eq_4.0.0__lt_5.0.0_0/package/node_modules/@appfabric/plugin-config-loader/index.js?enableHmr=false!./src/config.json");
/******/ 	
/******/ 	return __webpack_exports__;
/******/ })()
;
});