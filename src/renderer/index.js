import { ipcRenderer, } from 'electron';
import WebSocket from 'ws';
import JsonRPC from 'simple-jsonrpc-js';

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

    const ws = new WebSocket(localEDGEWSURL);
    const jrpc = new JsonRPC();
    ws.jrpc = jrpc;
    ws.jrpc.toStream = (_msg) => {
      ws.send(_msg);
    };
  
    ws.on('open', () => {
      // console.log('getEdgeIdToken socket open');
      jrpc.call('getEdgeIdToken', null).then((result) => {
        document.querySelector('#edgeIdToken').value = result.id_token;
        document.querySelector('#btnResetEdgeToken').disabled = false;
        document.querySelector('#btnRedirect').disabled = false;
        setImmediate(() => {
          ws.onmessage = undefined;
          ws.close();
        });
      }).catch((e) => {
        console.log('catch error:', e);
        setImmediate(() => {
          ws.onmessage = undefined;
          ws.close();
        });

        showMessage('Error connecting: ' + e);
      });
    });
  
    ws.on('message', (msgData) => {
      // const msg = JSON.parse(msgData);
      // console.log('getMe socket message: ', msg);
      jrpc.messageHandler(msgData);
    });
  
    ws.on('error', (err) => {
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
  
ipcRenderer.on('protocol-reply', (event, arg) => {
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
  
ipcRenderer.on('oauth-login-reply', (event, arg) => {
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