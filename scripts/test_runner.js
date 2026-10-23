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
const fachada = require('../js/fachada.js');

async function run() {
  console.log('1. Testing resolvePlayitAddress...');
  const addr1 = await fachada.resolvePlayitAddress('performers-delay.tun.ply.gg');
  console.log('   Auto-detected port:', addr1);
  if (addr1 !== 'http://performers-delay.tun.ply.gg:55392') {
    throw new Error('SRV resolution mismatch: ' + addr1);
  }

  const addr2 = await fachada.resolvePlayitAddress('performers-delay.tun.ply.gg:55392');
  console.log('   Explicit port:', addr2);
  if (addr2 !== 'http://performers-delay.tun.ply.gg:55392') {
    throw new Error('Explicit port mismatch: ' + addr2);
  }

  console.log('\n2. Testing startSession (Playit mode)...');
  const started = await net.startSession('Alice', 'playit', addr1);
  console.log('   Started:', started);
  if (!started) throw new Error('Session did not start');

  const link = net.getSessionLink();
  console.log('   Session link generated:', link);
  if (!link.startsWith('http://performers-delay.tun.ply.gg:55392/?room=')) {
    throw new Error('Link mismatch: ' + link);
  }

  net.endSession();
  console.log('   Session ended.');

  console.log('\n3. Testing startSession (LAN mode)...');
  const lanStarted = await net.startSession('Alice', 'lan');
  console.log('   Started:', lanStarted);
  const lanLink = net.getSessionLink();
  console.log('   LAN link generated:', lanLink);
  if (!lanLink.includes(':6789/?room=')) {
    throw new Error('LAN link mismatch: ' + lanLink);
  }
  net.endSession();

  console.log('\nSUCCESS: All unit and integration tests passed!');
  process.exit(0);
}

run().catch((err) => {
  console.error('\nTEST FAILED:', err);
  process.exit(1);
});
