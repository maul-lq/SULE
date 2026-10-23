const { Server } = require('socket.io');
const http = require('http');
const { networkInterfaces } = require('os');

let server = null;
const defaultPort = 6789;
const MAX_OP_HISTORY = 500;

class LiveShareServer {
  constructor() {
    this.io = null;
    this.server = null;
    this.address = '';
    this.users = {};
    this.locks = {};
    this.rooms = {};
    this.roomSeqs = {};
    this.opHistory = {};
  }

  start(port = 3000) {
    return new Promise((resolve, reject) => {
      this.server = http.createServer();
      this.io = new Server(this.server, {
        cors: { origin: '*' },
        pingTimeout: 60000,
        pingInterval: 25000,
        maxHttpBufferSize: 1e8,
      });

      this.io.on('connection', async (socket) => {
        const username = socket.handshake.auth.username || 'Anonymous';
        let room_id = socket.handshake.auth.room;

        console.log(`[LS] User connected: ${username}, ${socket.id}`);

        if (
          !room_id ||
          room_id == -1 ||
          room_id === '-1' ||
          room_id === 'null'
        ) {
          room_id = 'room_' + Math.random().toString(36).substring(2, 10);
          console.log(`[LS] Room created: ${room_id}`);
        }

        await socket.join(room_id);

        if (!this.rooms[room_id]) {
          this.rooms[room_id] = { users: {}, host_id: socket.id, locks: {} };
        }
        if (!this.roomSeqs[room_id]) this.roomSeqs[room_id] = 0;
        if (!this.opHistory[room_id]) this.opHistory[room_id] = [];

        for (const [sid] of Object.entries(this.rooms[room_id].users)) {
          if (
            sid !== socket.id &&
            this.users[sid] &&
            this.users[sid].name === username
          ) {
            delete this.rooms[room_id].users[sid];
            delete this.users[sid];
          }
        }

        const isHost = socket.id === this.rooms[room_id].host_id;
        this.rooms[room_id].users[socket.id] = socket.id;

        this.users[socket.id] = {
          id: socket.id,
          name: username,
          isHost: isHost,
          room: room_id,
          color: '#' + Math.floor(Math.random() * 16777215).toString(16),
        };

        socket.emit('is-host', isHost);
        socket.emit('room-assigned', room_id);
        socket.emit('room-seq', this.roomSeqs[room_id]);

        const roomUsers = this.rooms[room_id].users;
        const otherUsers = Object.keys(roomUsers)
          .filter((uid) => uid !== socket.id)
          .map((uid) => ({
            id: uid,
            name: this.users[uid] ? this.users[uid].name : 'Anonymous',
          }));
        socket.emit('current-users', otherUsers);

        socket
          .to(room_id)
          .emit('user-joined', { id: socket.id, name: username });

        if (!isHost && this.rooms[room_id].host_id) {
          this.io
            .to(this.rooms[room_id].host_id)
            .emit('get-whole-document', { requesterId: socket.id });
        }

        socket.on('latency-check', () => {
          socket.emit('latency-response');
        });

        socket.on('host-delivers-document', (data) => {
          this.io.to(data.to).emit('load-whole-document', { json: data.json });
        });

        socket.on('client-mouse-moved', (data) => {
          socket.to(this.users[socket.id].room).emit('update-mouse-pos', {
            id: socket.id,
            x: data.x,
            y: data.y,
            diagram: data.diagram,
            zoom: data.zoom,
            originX: data.originX,
            originY: data.originY,
            name: this.users[socket.id].name,
          });
        });

        socket.on('request-follow-sync', (data) => {
          if (data.targetId && this.users[data.targetId]) {
            this.io.to(data.targetId).emit('get-follow-sync', {
              requesterId: socket.id,
            });
          }
        });

        socket.on('response-follow-sync', (data) => {
          if (data.requesterId && this.users[data.requesterId]) {
            this.io.to(data.requesterId).emit('follower-sync-data', {
              id: socket.id,
              ...data.viewportData,
            });
          }
        });

        socket.on('request-doc', () => {
          console.log(
            `[LS] ${this.users[socket.id].name} requested the whole doc.`,
          );
          this.io
            .to(this.rooms[this.users[socket.id].room].host_id)
            .emit('get-whole-document', { requesterId: socket.id });
        });

        socket.on('sync-operation', (opStr) => {
          const userData = this.users[socket.id];
          if (!userData || !userData.room) return;
          const room_id = userData.room;

          if (!this.opHistory[room_id]) this.opHistory[room_id] = [];
          if (!this.roomSeqs[room_id]) this.roomSeqs[room_id] = 0;

          this.roomSeqs[room_id]++;
          const seq = this.roomSeqs[room_id];

          this.opHistory[room_id].push({
            seq,
            socketId: socket.id,
            operation: opStr,
            timestamp: Date.now(),
          });
          if (this.opHistory[room_id].length > MAX_OP_HISTORY) {
            this.opHistory[room_id].shift();
          }

          this.io.to(room_id).emit('remote-operation', {
            seq,
            operation: opStr,
            socketId: socket.id,
          });
        });

        socket.on('request-missed-ops', (data) => {
          const userData = this.users[socket.id];
          if (!userData) return;
          const room_id = userData.room;
          const fromSeq = data.fromSeq;
          const history = this.opHistory[room_id] || [];

          const missed = history.filter((entry) => entry.seq > fromSeq);

          if (missed.length > 0) {
            console.log(
              `[LS] Sending ${missed.length} missed ops to ${userData.name} (from seq ${fromSeq})`,
            );
            socket.emit('missed-ops', { ops: missed });
          }
        });

        socket.on('lock-element', (viewIds) => {
          const room_id = this.users[socket.id].room;
          if (!this.rooms[room_id]) return;

          viewIds.forEach((id) => {
            if (this.rooms[room_id].locks[id]) return;
            this.rooms[room_id].locks[id] = socket.id;
            this.io.to(room_id).emit('element-locked', {
              viewId: id,
              ownerId: socket.id,
              color: this.users[socket.id].color,
            });
          });
        });

        socket.on('unlock-elements', () => {
          const room_id = this.users[socket.id].room;
          if (!this.rooms[room_id]) return;

          for (let id in this.rooms[room_id].locks) {
            if (this.rooms[room_id].locks[id] === socket.id) {
              delete this.rooms[room_id].locks[id];
              this.io.to(room_id).emit('element-unlocked', { viewId: id });
            }
          }
        });

        socket.on('disconnect', () => {
          const userData = this.users[socket.id];
          if (!userData) return;

          const room_id = userData.room;
          if (!this.rooms[room_id]) return;

          for (let id in this.rooms[room_id].locks) {
            if (this.rooms[room_id].locks[id] === socket.id) {
              delete this.rooms[room_id].locks[id];
              this.io.to(room_id).emit('element-unlocked', { viewId: id });
            }
          }

          console.log(`[LS] ${userData.name}, ${socket.id} left.`);
          socket.to(room_id).emit('user-left', socket.id);
          delete this.rooms[room_id].users[socket.id];
          let remainingUsers = Object.keys(this.rooms[room_id].users);

          if (this.rooms[room_id].host_id === socket.id) {
            this.io.to(room_id).emit('host-left', { oldHostId: socket.id });

            if (remainingUsers.length > 0) {
              let new_host = remainingUsers[0];
              this.rooms[room_id].host_id = new_host;
              this.users[new_host].isHost = true;
              this.io.to(new_host).emit('is-host', true);
            }
          }

          if (remainingUsers.length === 0) {
            delete this.rooms[room_id];
            delete this.roomSeqs[room_id];
            delete this.opHistory[room_id];
          }

          delete this.users[socket.id];
        });
      });

      this.server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`[LS] Port ${port} occupied. Close other instances.`);
        }
        reject(err);
      });

      this.server.listen(port, () => {
        console.log(`[LS] LiveShare server running on port ${port}`);
        resolve();
      });
    });
  }

  stop() {
    if (this.server) this.server.close();
  }
}

async function startServer(port) {
  if (server) server.stop();
  server = new LiveShareServer();
  const targetPort = port || 3000;

  try {
    await server.start(targetPort);
  } catch (e) {
    return false;
  }
  server.address = `http://${get_ip()}:${targetPort}`;
  return true;
}

function stopServer() {
  if (server) server.stop();
}

function getServerAddress() {
  if (server) return server.address;
}

function getServer() {
  return server;
}

function getServerPort() {
  return server && server.server && server.server.address()
    ? server.server.address().port
    : defaultPort;
}

function get_ip() {
  const nets = networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.internal) continue;
      const isIPv4 = net.family === 'IPv4' || net.family === 4;
      if (isIPv4) {
        candidates.push(net.address);
      }
    }
  }

  const priority = (ip) => {
    if (ip.startsWith('10.')) return 0;
    const parts = ip.split('.');
    if (parts[0] === '172') {
      const second = parseInt(parts[1], 10);
      if (second >= 16 && second <= 31) return 1;
    }
    if (ip.startsWith('192.168.')) return 2;
    return 3;
  };

  candidates.sort((a, b) => priority(a) - priority(b));
  return candidates[0] || '127.0.0.1';
}

module.exports = {
  LiveShareServer,
  startServer,
  stopServer,
  getServerAddress,
  getServer,
  getServerPort,
  defaultPort,
};
