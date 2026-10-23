const server = require("../js/server.js");
server.startServer(process.env.PORT || server.defaultPort);
