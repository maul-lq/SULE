const fachada = require('./js/fachada.js');
const net = require('./js/net.js');
const flatted = require('flatted'); //stringify json
const UserPanel = require('./js/user-panel.js');

const userPanel = new UserPanel();

async function startSession() {
  const data = await fachada.showSS();
  if (!data) return;

  if (!(await net.startSession(data.name, data.mode, data.server))) {
    fachada.WARN('Couldnt start session');
    return;
  }

  fachada.INFO('Session started!');

  // hide start-session and join-session, show end-session and copy-session-link
  app.menu.updateStates(
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

  userPanel.show();
}

async function joinSession() {
  const data = await fachada.showJS();
  if (!data) return;

  if (!(await net.joinSession(data.name, data.address))) {
    fachada.WARN('Couldnt join session');
    return;
  }

  fachada.INFO('Session joined!');

  // hide start-session and join-session, show end-session and copy-session-link
  app.menu.updateStates(
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

  userPanel.show();
}

function endSession() {
  net.endSession();
  userPanel.hide();
  fachada.INFO('Session ended');

  app.menu.updateStates(
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
}

function copySessionLink() {
  let link = net.getSessionLink();

  navigator.clipboard
    .writeText(link)
    .then(() => {
      fachada.INFO('Session link copied!');
    })
    .catch((err) => {
      console.error('[LS] Error copying with navigator:', err);
      console.log('[LS] Couldnt copy. The link is: ' + link);
      fachada.ERR('Error. See console');
    });
}

function syncDocument() {
  net.syncDoc();
}

function init() {
  app.commands.register('liveshare:ss', startSession);
  app.commands.register('liveshare:js', joinSession);
  app.commands.register('liveshare:cs', copySessionLink);
  app.commands.register('liveshare:es', endSession);
  app.commands.register('liveshare:sd', syncDocument);

  // debug print
  app.commands.register('liveshare:pa', () => {
    console.log(app);
    console.log(app.project.getProject());
    // console.log(flatted.stringify(app));
  });

  app.menu.updateStates(
    {
      ls_pa: false,
    },
    null,
    null,
  );
}

exports.init = init;
