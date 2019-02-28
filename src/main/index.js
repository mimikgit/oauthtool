import { app, BrowserWindow, Menu, session, protocol, ipcRenderer, } from 'electron';
import crypto from 'crypto';
import queryString from 'query-string';
import rp from 'request-promise';

import env from 'env';

import { devMenuTemplate } from '../menu/dev_menu_template';
import { editMenuTemplate } from '../menu/edit_menu_template';

// global reference to mainWindow (necessary to prevent window from being garbage collected)
let mainWindow;
let authWindow;
let devClientId;
let devRidirectUri;
let devEdgeIdToken;

const OAUTH_DOMAIN = 'https://mid.mimik360.com';
const SCOPES = [
      //  'write:me', 
      //  'read:users',
      //  'read:friendList',
      //  'delete:friend',        
      //  'read:requestFriendList',
      //  'read:friendRequestList',
      //  'add:requestFriend',
      //  'delete:requestFriend',
      //  'update:friendRequest',
      //  'delete:friendRequest',
      //  'update:me',
      //  'create:app',
      //  'delete:app',
      // 'read:me',
       'edge:mcm',
       'edge:clusters',
       'edge:account:associate',
       'openid', ];

const RESET_SCOPES = [
        'openid',
        'edge:account:unassociate',
];

function base64URLEncode(str) {
  return str.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
}

const verifier = base64URLEncode(crypto.randomBytes(32));

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest();
}

function getProtocol(url) {
  if (typeof url === 'undefined' || url === null || url === '') {
    return null;
  }

  const regex = /^(.+):\/\/(([^:/?#]*)(?::([0-9]+))?)([/]{0,1}[^?#]*)(\?[^#]*|)(#.*|)$/;
  const match = url.match(regex);
  const data = match && {
    url,
    protocol: match[1],
    host: match[2],
    hostname: match[3],
    port: match[4],
    pathname: match[5],
    search: match[6],
    hash: match[7],
  };
  if (data.protocol) {
    return data.protocol;
  }
  return null;
}

const setApplicationMenu = () => {
  const menus = [editMenuTemplate];
  if (env.name !== 'production') {
    menus.push(devMenuTemplate);
  }
  Menu.setApplicationMenu(Menu.buildFromTemplate(menus));
};

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nativeWindowOpen: true,
    }
  });

  protocol.registerHttpProtocol('openid', (request, callback) => {
    const _url = request.url.substr('openid://'.length);
    const query = queryString.parse(_url.replace('callback?', ''));    

    devClientId = query.client_id;
    devRidirectUri = query.redirect_uri;
    devEdgeIdToken = query.edge_id_token;

    console.log({
      devClientId: devClientId,
      devRidirectUri: devRidirectUri,
      devEdgeIdToken: devEdgeIdToken
    })
    
    if (query.protocol) {
      const redirectProtocol = getProtocol(devRidirectUri);
      
      if (redirectProtocol) {
        protocol.registerHttpProtocol(redirectProtocol, (request, callback) => {
          const url = request.url.substr(12);
          const query = queryString.parseUrl(request.url);

          console.log({
            url: url,
            query: JSON.stringify(query),
            code: query.query.code,
            state: query.query.state
          })

          authWindow.removeAllListeners('done');
          setImmediate(() => {
            authWindow.close();
          });
      
          if (!query.query.code) {
                  
            setTimeout(() => {
              mainWindow.webContents.send('oauth-login-reply', { status: false, message: query.query, devClientId, devRidirectUri });
            }, 150);
          } else {
            var options = {
              method: 'POST',
              uri: `${OAUTH_DOMAIN}/token`,
              form: {
                grant_type: 'authorization_code',
                code: query.query.code,
                redirect_uri: devRidirectUri,
                client_id: devClientId,
                code_verifier: 'SqRg3wQWke2YSwMydkdilNHURfmmnt-Vlbvf8s2Ri58'
              }
            };
        
            rp(options)
              .then((parsedBody) => {
                const token = JSON.parse(parsedBody);

                console.log(`rp: ${JSON.stringify(token, null, 2)}`);
                session.defaultSession.cookies.get({}, (error, cookies) => {
                  console.log(error, cookies)
                });
                
                const optionsTokenExchange = {
                  method: 'POST',
                  uri: `${OAUTH_DOMAIN}/token`,
                  form: {
                    grant_type: 'exchange_edge_token',
                    token: token.access_token,
                    redirect_uri: devRidirectUri,
                    code_verifier: 'SqRg3wQWke2YSwMydkdilNHURfmmnt-Vlbvf8s2Ri58',
                    client_id: devClientId,
                  },
                };
  
                rp(optionsTokenExchange)
                  .then((tokenBody) => {
                    const userToken = JSON.parse(tokenBody).access_token;
                    console.log(`accessToken: ${tokenBody} `);
                    const data = {};
                    data.userToken = userToken;
                    data.edgeToken = token.access_token;
                    data.scope = token.scope;                    
                  })
                  .catch((error) => {
                    console.error(JSON.stringify(error));
                  });

                if (token.id_token) {
                  token.id_token = null;
                }
        
                setTimeout(() => {
                  mainWindow.webContents.send('oauth-login-reply', { status: true, token, devClientId, devRidirectUri });
                }, 150);
              })
              .catch((err) => {
                console.log(`${err}`);                
                setTimeout(() => {
                  mainWindow.webContents.send('oauth-login-reply', { status: false, message: err, devClientId, devRidirectUri });
                }, 150);
              });
          }
      
        }, (error) => {
          if (error) {
            console.error(`Failed to register protocol: ${redirectProtocol}`);
            mainWindow.webContents.send('protocol-reply', { status: false, message: {error: 'Setup Redirect', error_description: 'Failed to register protocol'} });
          } else {
            console.error(`Registered protocol: ${redirectProtocol}`);
            mainWindow.webContents.send('protocol-reply', { status: true, data: 'Setup Redirect done.' });
          }
        });
      }
    } else {
      const oauthScope = query.reset ? 
        RESET_SCOPES.map(u => encodeURIComponent(u)).join('+') :
        SCOPES.map(u => encodeURIComponent(u)).join('+');

      const redirect = encodeURIComponent(devRidirectUri);
      let url = `${OAUTH_DOMAIN}/auth?redirect_uri=${redirect}&scope=${oauthScope}&client_id=${devClientId}&state=xyz&response_type=code&code_challenge=czD7gtNh2SowYqxpN5OSf5a6wIiszEZ9AvRHGvwIJS4&code_challenge_method=S256&edge_id_token=${devEdgeIdToken}`;

      authWindow = new BrowserWindow({
        parent: mainWindow,
        modal: true,
        width: 1000,
        height: 600,
        webPreferences: {
          nodeIntegration: false,
        },
      });

      authWindow.loadURL(url);
      if (env.name === 'development') {
        authWindow.openDevTools();
      }
      authWindow.show();
    }
  });

  mainWindow.loadURL(`file://${__dirname}/index.html`);

  if (env.name === 'development') {
    mainWindow.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.on('devtools-opened', () => {
    mainWindow.focus()
    setImmediate(() => {
      mainWindow.focus()
    })
  })
}

// quit application when all windows are closed
app.on('window-all-closed', () => {
  // on macOS it is common for applications to stay open until the user explicitly quits
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // on macOS it is common to re-create a window even after all windows have been closed
  if (mainWindow === null) {
    createMainWindow()
  }
})

// create main BrowserWindow when electron is ready
app.on('ready', () => {
  setApplicationMenu();
  createMainWindow()
})
