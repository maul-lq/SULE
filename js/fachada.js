const fs = require('fs');
const path = require('path');
const dns = require('dns');

function INFO(mensaje) {
  console.log(`[LS] ${mensaje}`);
  app.toast.info(mensaje);
}

function WARN(mensaje) {
  console.warn(`[LS] ${mensaje}`);
  app.toast.warning(mensaje);
}

function ERR(mensaje) {
  console.error(`[LS] ${mensaje}`);
  app.toast.error(mensaje);
}

function _createDialog(templateName) {
  const dialogHTML = fs.readFileSync(
    path.join(__dirname, templateName),
    'utf8',
  );
  return app.dialogs.showModalDialogUsingTemplate(dialogHTML);
}

const MODES = [
  {
    id: 'lan',
    label: 'LAN (Original)',
    desc: 'Local server for your home Wi-Fi / LAN',
  },
  {
    id: 'playit',
    label: 'Playit.gg Tunnel',
    desc: 'Public tunnel via Playit.gg (Minecraft Java / TCP)',
  },
  {
    id: 'ssh',
    label: 'Windows SSH Tunnel',
    desc: 'Instant zero-setup public HTTPS tunnel via Windows SSH',
  },
  {
    id: 'remote',
    label: 'Remote Server',
    desc: 'Connect to an existing standalone remote server',
  },
];

async function resolvePlayitAddress(rawAddress) {
  let address = (rawAddress || '').trim();
  if (!address) return '';

  let hostPart = address.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();

  // If already includes a port number (e.g. host:55392), keep it
  if (hostPart.includes(':')) {
    return 'http://' + hostPart;
  }

  // If no port and it's a playit domain (.ply.gg or .joinmc.link), try resolving SRV record
  if (hostPart.endsWith('.ply.gg') || hostPart.endsWith('.joinmc.link')) {
    try {
      const records = await dns.promises.resolveSrv('_minecraft._tcp.' + hostPart);
      if (records && records.length > 0 && records[0].port) {
        console.log(`[LS] Resolved SRV for ${hostPart}: port ${records[0].port}`);
        return `http://${hostPart}:${records[0].port}`;
      }
    } catch (e) {
      console.warn(`[LS] SRV lookup for ${hostPart} failed or not found:`, e.message);
    }
  }

  return 'http://' + hostPart;
}

async function showSSDialog() {
  return new Promise((resolve) => {
    const htmlPath = path.join('html', 'ss_dialog.html');
    let dialog;
    try {
      dialog = _createDialog(htmlPath);
    } catch (e) {
      ERR('Error creating dialog: ' + e.message);
      resolve(null);
      return;
    }

    const $el = dialog.getElement();

    // Restore saved settings (each user has their own localStorage)
    const savedName = localStorage.getItem('liveshare:username') || '';
    const savedPlayit = localStorage.getItem('liveshare:playit_address') || '';
    const savedServer = localStorage.getItem('liveshare:server') || '';
    const savedMode = localStorage.getItem('liveshare:mode') || 'lan';

    let currentModeIndex = MODES.findIndex((m) => m.id === savedMode);
    if (currentModeIndex === -1) currentModeIndex = 0;

    if (savedName) $el.find('#name').val(savedName);
    if (savedPlayit) $el.find('#playit-address').val(savedPlayit);
    if (savedServer) $el.find('#server').val(savedServer);

    function updateMode(index) {
      const mode = MODES[index];
      $el.find('#mode-label').text(mode.label).attr('data-mode', mode.id);
      $el.find('#mode-desc').text(mode.desc);

      if (mode.id === 'playit') {
        $el.find('#playit-group').removeClass('hidden');
        $el.find('#server-group').addClass('hidden');
      } else if (mode.id === 'remote') {
        $el.find('#server-group').removeClass('hidden');
        $el.find('#playit-group').addClass('hidden');
      } else {
        $el.find('#playit-group').addClass('hidden');
        $el.find('#server-group').addClass('hidden');
      }
    }

    updateMode(currentModeIndex);

    $el.on('click', '#mode-prev', () => {
      currentModeIndex = (currentModeIndex - 1 + MODES.length) % MODES.length;
      updateMode(currentModeIndex);
    });

    $el.on('click', '#mode-next', () => {
      currentModeIndex = (currentModeIndex + 1) % MODES.length;
      updateMode(currentModeIndex);
    });

    $el.on('click', '#ok-btn', async () => {
      const name = $el.find('#name').val().trim();
      const mode = $el.find('#mode-label').attr('data-mode');
      const rawPlayit = $el.find('#playit-address').val().trim();
      const server = $el.find('#server').val().trim();

      if (!name) {
        ERR('Username cannot be empty.');
        return;
      }

      localStorage.setItem('liveshare:username', name);
      localStorage.setItem('liveshare:mode', mode);

      if (mode === 'playit') {
        if (!rawPlayit) {
          ERR('Playit.gg address cannot be empty.');
          return;
        }

        const resolvedPlayit = await resolvePlayitAddress(rawPlayit);
        localStorage.setItem('liveshare:playit_address', rawPlayit);

        dialog.close();
        resolve({ name, mode, tunnelAddress: resolvedPlayit });
        return;
      }

      if (mode === 'remote') {
        if (!server) {
          ERR('Server address cannot be empty.');
          return;
        }

        let normalizedServer = server;
        if (!normalizedServer.startsWith('http')) {
          normalizedServer = 'http://' + normalizedServer;
        }
        localStorage.setItem('liveshare:server', normalizedServer);

        dialog.close();
        resolve({ name, mode, server: normalizedServer });
        return;
      }

      dialog.close();
      resolve({ name, mode });
    });

    $el.on('click', '#cancel-btn', () => {
      dialog.close();
      resolve(null);
    });

    $el.on('dialog:close', () => {
      resolve(null);
    });
  });
}

async function showJSDialog() {
  return new Promise((resolve) => {
    const htmlPath = path.join('html', 'js_dialog.html');
    let dialog;
    try {
      dialog = _createDialog(htmlPath);
    } catch (e) {
      ERR('Error creating dialog: ' + e.message);
      resolve(null);
      return;
    }

    const $el = dialog.getElement();
    const savedName = localStorage.getItem('liveshare:username') || '';
    if (savedName) $el.find('#name').val(savedName);

    $el.on('click', '#ok-btn', () => {
      const name = $el.find('#name').val().trim();
      let address = $el.find('#address').val().trim();

      if (!name) {
        ERR('Username cannot be empty.');
        return;
      }

      if (!address) {
        ERR('Address cannot be empty.');
        return;
      }

      localStorage.setItem('liveshare:username', name);

      if (!address.startsWith('http')) {
        address = 'http://' + address;
      }

      dialog.close();
      resolve({ name, address });
    });

    $el.on('click', '#cancel-btn', () => {
      dialog.close();
      resolve(null);
    });

    $el.on('dialog:close', () => {
      resolve(null);
    });
  });
}

let originalHandlers = {};

function changeKeyBindings(host) {
  const forbidden = [
    'project:new',
    'project:open',
    'project:import-fragment',
    'project:close',
    'project:open-recent',
  ];

  forbidden.forEach((cmdId) => {
    if (!app.commands.commands[cmdId]) return;

    if (host) {
      if (originalHandlers[cmdId]) {
        app.commands.commands[cmdId] = originalHandlers[cmdId];
        delete originalHandlers[cmdId];
      }
    } else {
      if (!originalHandlers[cmdId]) {
        originalHandlers[cmdId] = app.commands.commands[cmdId];
      }
      app.commands.commands[cmdId] = () => {
        WARN('Only host can manage files.');
        console.log(`[LS] Blocking: ${cmdId}`);
      };
    }
  });
}

function changeHostOptions(state) {
  const menuStates = {
    'file.new': state,
    'file.open': state,
    'file.import': state,
    'file.export-diagram-to-png': state,
    'file.export-diagram-to-svg': state,
    'file.export-diagram-to-pdf': state,
    'file.close': state,
    'file.open-recent': state,
    'file.new-from-template': state,
  };

  try {
    app.menu.updateStates(null, menuStates, null);
  } catch (e) {
    console.error('[LiveShare] Error updating menu states:', e);
  }
}

function disableHostOptions() {
  changeHostOptions(false);
  changeKeyBindings(false);
}

function enableHostOptions() {
  changeHostOptions(true);
  changeKeyBindings(true);
}

function showLoadingOverlay() {
  let overlay = document.createElement('div');
  overlay.id = 'my-extension-loading';

  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.background = 'rgba(0,0,0,0.4)';
  overlay.style.zIndex = '99999';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';

  overlay.innerHTML = `
    <div style="
      background:white;
      padding:20px;
      border-radius:8px;
      font-size:18px;
    ">
      Loading...
    </div>
  `;

  document.body.appendChild(overlay);
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('my-extension-loading');
  if (overlay) {
    overlay.remove();
  }
}

module.exports = {
  showSS: showSSDialog,
  showJS: showJSDialog,
  disableHostOptions: disableHostOptions,
  enableHostOptions: enableHostOptions,
  showLoadingOverlay: showLoadingOverlay,
  hideLoadingOverlay: hideLoadingOverlay,
  resolvePlayitAddress: resolvePlayitAddress,
  INFO: INFO,
  WARN: WARN,
  ERR: ERR,
};
