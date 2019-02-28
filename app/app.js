/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 8);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

module.exports = require("electron");

/***/ }),
/* 1 */,
/* 2 */,
/* 3 */,
/* 4 */,
/* 5 */,
/* 6 */,
/* 7 */,
/* 8 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_electron__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_electron___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_electron__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ws__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ws___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_ws__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_simple_jsonrpc_js__ = __webpack_require__(10);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_simple_jsonrpc_js___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2_simple_jsonrpc_js__);




const app = document.querySelector('#app');

function showMessage(msg) {
  document.querySelector('.message').style.display = 'flex';
  document.querySelector('.message').innerText = msg;
}

function init() {
  app.style.display = 'block';
}

init();

document.querySelector('#btnRedirect').onclick = () => {
  const clientId = document.querySelector('#clientId');
  const redirectUri = document.querySelector('#redirectUri');
  const edgeIdToken = document.querySelector('#edgeIdToken');
  console.log({
    clientId: clientId.value,
    redirectUri: redirectUri.value,
    edgeIdToken: edgeIdToken.value
  });

  const url = "openid://callback?protocol=true&client_id=" + clientId.value + "&redirect_uri=" + redirectUri.value + "&edge_id_token=" + edgeIdToken.value;
  window.location.assign(url);
};

document.querySelector('#btnEdgeToken').onclick = () => {
  const clientId = document.querySelector('#clientId');
  const redirectUri = document.querySelector('#redirectUri');
  const edgeIdToken = document.querySelector('#edgeIdToken');
  console.log({
    clientId: clientId.value,
    redirectUri: redirectUri.value,
    edgeIdToken: edgeIdToken.value
  });

  const url = "openid://callback?client_id=" + clientId.value + "&redirect_uri=" + redirectUri.value + "&edge_id_token=" + edgeIdToken.value;
  window.location.assign(url);
};

document.querySelector('#btnDeviceConnect').onclick = () => {

  showMessage('');
  const EDGE_SDK_PORT = 8083; // Currently the edge SDK default port is 8083
  const ipAddress = document.querySelector('#ipAddress');
  const localEDGEWSURL = `ws://${ipAddress.value}:${EDGE_SDK_PORT}/ws/edge-service-api/v1`; // "ws://127.0.0.1:8083/ws/edge-service-api/v1"

  const ws = new __WEBPACK_IMPORTED_MODULE_1_ws___default.a(localEDGEWSURL);
  const jrpc = new __WEBPACK_IMPORTED_MODULE_2_simple_jsonrpc_js___default.a();
  ws.jrpc = jrpc;
  ws.jrpc.toStream = _msg => {
    ws.send(_msg);
  };

  ws.on('open', () => {
    // console.log('getEdgeIdToken socket open');
    jrpc.call('getEdgeIdToken', null).then(result => {
      document.querySelector('#edgeIdToken').value = result.id_token;
      document.querySelector('#btnResetEdgeToken').disabled = false;
      document.querySelector('#btnRedirect').disabled = false;
      setImmediate(() => {
        ws.onmessage = undefined;
        ws.close();
      });
    }).catch(e => {
      console.log('catch error:', e);
      setImmediate(() => {
        ws.onmessage = undefined;
        ws.close();
      });

      showMessage('Error connecting: ' + e);
    });
  });

  ws.on('message', msgData => {
    // const msg = JSON.parse(msgData);
    // console.log('getMe socket message: ', msg);
    jrpc.messageHandler(msgData);
  });

  ws.on('error', err => {
    console.log('edge ws error:', err);

    showMessage('Edge error: ' + err);
    //   cb(wsError(err));
  });

  ws.on('close', () => {
    // console.log('edge ws close');
  });
};

document.querySelector('#btnResetEdgeToken').onclick = () => {
  const clientId = document.querySelector('#clientId');
  const redirectUri = document.querySelector('#redirectUri');
  const edgeIdToken = document.querySelector('#edgeIdToken');

  const url = "openid://callback?reset=true&client_id=" + clientId.value + "&redirect_uri=" + redirectUri.value + "&edge_id_token=" + edgeIdToken.value;
  window.location.assign(url);
};

__WEBPACK_IMPORTED_MODULE_0_electron__["ipcRenderer"].on('protocol-reply', (event, arg) => {
  console.log('protocol-reply', arg);
  showMessage('');
  if (arg.status === true) {
    if (arg.data) {
      document.querySelector('#btnRedirect').disabled = true;
      document.querySelector('#btnEdgeToken').disabled = false;
    }
  } else {
    const msg = `${arg.message.error} - ${arg.message.error_description}`;
    showMessage(msg);
  }
});

__WEBPACK_IMPORTED_MODULE_0_electron__["ipcRenderer"].on('oauth-login-reply', (event, arg) => {
  console.log('oauth-login-reply', arg);
  document.querySelector('#btnRedirect').disabled = true;
  document.querySelector('#btnEdgeToken').disabled = false;
  showMessage('');
  if (arg.devClientId) {
    document.querySelector('#clientId').value = arg.devClientId;
  }
  if (arg.devRidirectUri) {
    document.querySelector('#redirectUri').value = arg.devRidirectUri;
  }
  if (arg.status === true) {
    if (arg.token) {
      console.log(`Token: ${JSON.stringify(arg.token)}`);
      const accessToken = document.querySelector('#accessToken');
      accessToken.innerText = JSON.stringify(arg.token);
    }
  } else {
    const msg = `${arg.message.error} - ${arg.message.error_description}`;
    showMessage(msg);
  }
});

/***/ }),
/* 9 */
/***/ (function(module, exports) {

module.exports = require("ws");

/***/ }),
/* 10 */
/***/ (function(module, exports) {

module.exports = require("simple-jsonrpc-js");

/***/ })
/******/ ]);
//# sourceMappingURL=app.js.map