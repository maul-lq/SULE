const client = require('./client.js');
const server = require('./server.js');
const tunnel = require('./tunnel.js');
const CONNECT_TIMEOUT = 500;

let am_i_hosting = false;
let am_i_connected = false;
let activeTunnelUrl = null;

let userPanel = null;
let updateMenuStatesFn = null;

function resetSessionState() {
  stopActiveTunnel();
  if (userPanel) userPanel.hide();
  if (updateMenuStatesFn)
    updateMenuStatesFn(
      {
        ls_ss: true,
        ls_js: true,
        ls_es: false,
        ls_cs: false,
        ls_sd: false,
      },
      null,
      null,
    );
  am_i_connected = false;
  am_i_hosting = false;
}

function setUserPanel(panel) {
  userPanel = panel;
}

function setUpdateMenuStates(fn) {
  updateMenuStatesFn = fn;
}

async function startSession(name, mode, serverOrTunnel) {
  if (mode === 'remote') {
    am_i_hosting = false;
    am_i_connected = await client.connectToServer(serverOrTunnel, name, -1);
  } else {
    am_i_hosting = true;
    await server.startServer(server.defaultPort);

    if (mode === 'playit') {
      if (serverOrTunnel) {
        activeTunnelUrl = serverOrTunnel;
        console.log(`[LS] Playit Tunnel URL: ${activeTunnelUrl}`);
      }
    } else if (mode === 'ssh' || mode === 'tunnel') {
      const port = server.getServerPort();
      const result = await tunnel.startSSHTunnel(port);
      if (result.url) {
        activeTunnelUrl = result.url;
        console.log(`[LS] SSH Tunnel URL: ${activeTunnelUrl}`);
      } else {
        const fachada = require('./fachada.js');
        const detail =
          result.errors.length > 0 ? ' (' + result.errors.join('; ') + ')' : '';
        fachada.WARN('SSH Tunnel unavailable — LAN only.' + detail);
      }
    }

    am_i_connected = await client.connectToServer(
      server.getServerAddress(),
      name,
    );
  }

  if (am_i_connected) {
    client.onDisconnect(handleClientDisconnect);
    if (userPanel) userPanel.show();
    if (updateMenuStatesFn)
      updateMenuStatesFn(
        {
          ls_ss: false,
          ls_js: false,
          ls_es: true,
          ls_cs: true,
          ls_sd: true,
        },
        null,
        null,
      );
  }

  return am_i_connected;
}

async function joinSession(name, url) {
  let urlObj;
  try {
    urlObj = new URL(url);
  } catch (e) {
    const fachada = require('./fachada.js');
    fachada.ERR('Invalid session URL.');
    return false;
  }

  const roomId = urlObj.searchParams.get('room');
  const serverUrl = urlObj.origin;

  if (!roomId) {
    const fachada = require('./fachada.js');
    fachada.WARN(
      'No room ID found in session URL. You might not join the host canvas.',
    );
  }

  am_i_hosting = false;
  am_i_connected = await client.connectToServer(serverUrl, name, roomId || -1);

  if (am_i_connected) {
    client.onDisconnect(handleClientDisconnect);
    if (userPanel) userPanel.show();
    if (updateMenuStatesFn)
      updateMenuStatesFn(
        {
          ls_ss: false,
          ls_js: false,
          ls_es: true,
          ls_cs: true,
          ls_sd: true,
        },
        null,
        null,
      );
  }

  return am_i_connected;
}

function handleClientDisconnect() {
  resetSessionState();
}

function stopActiveTunnel() {
  if (activeTunnelUrl) {
    tunnel.stopTunnel();
    activeTunnelUrl = null;
  }
}

function endSession() {
  if (am_i_connected) {
    client.disconnect();
  }

  if (am_i_hosting) {
    server.stopServer();
  }

  resetSessionState();
}

function getSessionLink() {
  const roomId = client.getCurrentRoom();

  if (activeTunnelUrl) {
    try {
      const urlObj = new URL(activeTunnelUrl);
      if (roomId) {
        urlObj.searchParams.set('room', roomId);
      }
      return urlObj.toString();
    } catch (e) {
      return activeTunnelUrl + (roomId ? `/?room=${roomId}` : '');
    }
  }

  let baseUrl = am_i_hosting
    ? server.getServerAddress()
    : client.getConnectedAddress();

  if (!baseUrl) return '';

  if (roomId) {
    const urlObj = new URL(baseUrl);
    urlObj.searchParams.set('room', roomId);
    return urlObj.toString();
  }

  return baseUrl;
}

function syncDoc() {
  if (!am_i_connected) return;
  client.requestDocument();
}

module.exports = {
  startSession: startSession,
  joinSession: joinSession,
  endSession: endSession,
  getSessionLink: getSessionLink,
  syncDoc: syncDoc,
  setUserPanel: setUserPanel,
  setUpdateMenuStates: setUpdateMenuStates,
};
