global.document = {
  getElementById: () => null,
  createElement: () => ({ style: {}, innerHTML: '', id: '' }),
  body: { appendChild: () => {} },
  addEventListener: () => {},
  removeEventListener: () => {}
};
global.navigator = { clipboard: {} };
global.window = {};

global.app = {
  toast: { info: console.log, warning: console.warn, error: console.error },
  menu: { updateStates: () => {} },
  repository: { on: () => {}, off: () => {} },
  commands: { on: () => {}, off: () => {}, commands: {} },
  selections: { on: () => {}, off: () => {} },
  diagrams: { on: () => {}, off: () => {}, $diagramArea: [], getCurrentDiagram: () => null },
  project: { on: () => {}, off: () => {} }
};

const net = require('../js/net.js');

async function run() {
  console.log('\n1. Testing startSession (LAN mode)...');
  const lanStarted = await net.startSession('Alice', 'lan');
  console.log('   Started:', lanStarted);
  const lanLink = net.getSessionLink();
  console.log('   LAN link generated:', lanLink);
  if (!lanLink.includes(':6789/?room=')) {
    throw new Error('LAN link mismatch: ' + lanLink);
  }
  net.endSession();
  console.log('   LAN session ended cleanly.');

  console.log('\n2. Testing startSession (Windows SSH Tunnel mode)...');
  const sshStarted = await net.startSession('Alice', 'ssh');
  console.log('   SSH Tunnel Started:', sshStarted);
  const sshLink = net.getSessionLink();
  console.log('   SSH link generated:', sshLink);
  if (!sshLink.startsWith('https://') || !sshLink.includes('.lhr.life/?room=')) {
    throw new Error('SSH link mismatch: ' + sshLink);
  }
  net.endSession();
  console.log('   SSH session ended cleanly.');

  console.log('\nSUCCESS: All unit and integration tests passed!');
  process.exit(0);
}

run().catch((err) => {
  console.error('\nTEST FAILED:', err);
  process.exit(1);
});
