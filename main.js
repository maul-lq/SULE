var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// js/fachada.js
var require_fachada = __commonJS({
  "js/fachada.js"(exports2, module2) {
    var fs = require("fs");
    var path = require("path");
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
        "utf8"
      );
      return app.dialogs.showModalDialogUsingTemplate(dialogHTML);
    }
    var MODES = [
      {
        id: "ssh",
        label: "Windows SSH Tunnel",
        desc: "Public HTTPS tunnel via Windows SSH (Internet)"
      },
      {
        id: "lan",
        label: "LAN (Local Wi-Fi)",
        desc: "Local server for your home/office Wi-Fi or local PC"
      },
      {
        id: "remote",
        label: "Remote Server",
        desc: "Connect to an existing standalone remote server"
      }
    ];
    async function showSSDialog() {
      return new Promise((resolve) => {
        const htmlPath = path.join("html", "ss_dialog.html");
        let dialog;
        try {
          dialog = _createDialog(htmlPath);
        } catch (e) {
          ERR("Error creating dialog: " + e.message);
          resolve(null);
          return;
        }
        const $el = dialog.getElement();
        const savedName = localStorage.getItem("liveshare:username") || "";
        const savedServer = localStorage.getItem("liveshare:server") || "";
        const savedMode = localStorage.getItem("liveshare:mode") || "ssh";
        let currentModeIndex = MODES.findIndex((m) => m.id === savedMode);
        if (currentModeIndex === -1) currentModeIndex = 0;
        if (savedName) $el.find("#name").val(savedName);
        if (savedServer) $el.find("#server").val(savedServer);
        function updateMode(index) {
          const mode = MODES[index];
          $el.find("#mode-label").text(mode.label).attr("data-mode", mode.id);
          $el.find("#mode-desc").text(mode.desc);
          if (mode.id === "remote") {
            $el.find("#server-group").removeClass("hidden");
          } else {
            $el.find("#server-group").addClass("hidden");
          }
        }
        updateMode(currentModeIndex);
        $el.on("click", "#mode-prev", () => {
          currentModeIndex = (currentModeIndex - 1 + MODES.length) % MODES.length;
          updateMode(currentModeIndex);
        });
        $el.on("click", "#mode-next", () => {
          currentModeIndex = (currentModeIndex + 1) % MODES.length;
          updateMode(currentModeIndex);
        });
        $el.on("click", "#ok-btn", async () => {
          const name = $el.find("#name").val().trim();
          const mode = $el.find("#mode-label").attr("data-mode");
          const server = $el.find("#server").val().trim();
          if (!name) {
            ERR("Username cannot be empty.");
            return;
          }
          localStorage.setItem("liveshare:username", name);
          localStorage.setItem("liveshare:mode", mode);
          if (mode === "remote") {
            if (!server) {
              ERR("Server address cannot be empty.");
              return;
            }
            let normalizedServer = server;
            if (!normalizedServer.startsWith("http")) {
              normalizedServer = "http://" + normalizedServer;
            }
            localStorage.setItem("liveshare:server", normalizedServer);
            dialog.close();
            resolve({ name, mode, server: normalizedServer });
            return;
          }
          dialog.close();
          resolve({ name, mode });
        });
        $el.on("click", "#cancel-btn", () => {
          dialog.close();
          resolve(null);
        });
        $el.on("dialog:close", () => {
          resolve(null);
        });
      });
    }
    async function showJSDialog() {
      return new Promise((resolve) => {
        const htmlPath = path.join("html", "js_dialog.html");
        let dialog;
        try {
          dialog = _createDialog(htmlPath);
        } catch (e) {
          ERR("Error creating dialog: " + e.message);
          resolve(null);
          return;
        }
        const $el = dialog.getElement();
        const savedName = localStorage.getItem("liveshare:username") || "";
        if (savedName) $el.find("#name").val(savedName);
        $el.on("click", "#ok-btn", () => {
          const name = $el.find("#name").val().trim();
          let address = $el.find("#address").val().trim();
          if (!name) {
            ERR("Username cannot be empty.");
            return;
          }
          if (!address) {
            ERR("Address cannot be empty.");
            return;
          }
          localStorage.setItem("liveshare:username", name);
          if (!address.startsWith("http")) {
            address = "http://" + address;
          }
          dialog.close();
          resolve({ name, address });
        });
        $el.on("click", "#cancel-btn", () => {
          dialog.close();
          resolve(null);
        });
        $el.on("dialog:close", () => {
          resolve(null);
        });
      });
    }
    var originalHandlers = {};
    function changeKeyBindings(host) {
      const forbidden = [
        "project:new",
        "project:open",
        "project:import-fragment",
        "project:close",
        "project:open-recent"
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
            WARN("Only host can manage files.");
            console.log(`[LS] Blocking: ${cmdId}`);
          };
        }
      });
    }
    function changeHostOptions(state) {
      const menuStates = {
        "file.new": state,
        "file.open": state,
        "file.import": state,
        "file.export-diagram-to-png": state,
        "file.export-diagram-to-svg": state,
        "file.export-diagram-to-pdf": state,
        "file.close": state,
        "file.open-recent": state,
        "file.new-from-template": state
      };
      try {
        app.menu.updateStates(null, menuStates, null);
      } catch (e) {
        console.error("[LiveShare] Error updating menu states:", e);
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
      let overlay = document.createElement("div");
      overlay.id = "my-extension-loading";
      overlay.style.position = "fixed";
      overlay.style.top = "0";
      overlay.style.left = "0";
      overlay.style.width = "100%";
      overlay.style.height = "100%";
      overlay.style.background = "rgba(0,0,0,0.4)";
      overlay.style.zIndex = "99999";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
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
      const overlay = document.getElementById("my-extension-loading");
      if (overlay) {
        overlay.remove();
      }
    }
    module2.exports = {
      showSS: showSSDialog,
      showJS: showJSDialog,
      disableHostOptions,
      enableHostOptions,
      showLoadingOverlay,
      hideLoadingOverlay,
      INFO,
      WARN,
      ERR
    };
  }
});

// node_modules/xmlhttprequest-ssl/lib/XMLHttpRequest.js
var require_XMLHttpRequest = __commonJS({
  "node_modules/xmlhttprequest-ssl/lib/XMLHttpRequest.js"(exports2, module2) {
    var fs = require("fs");
    var Url = require("url");
    var spawn = require("child_process").spawn;
    module2.exports = XMLHttpRequest2;
    XMLHttpRequest2.XMLHttpRequest = XMLHttpRequest2;
    function XMLHttpRequest2(opts) {
      "use strict";
      opts = opts || {};
      var self = this;
      var http = require("http");
      var https = require("https");
      var request;
      var response;
      var settings = {};
      var disableHeaderCheck = false;
      var defaultHeaders = {
        "User-Agent": "node-XMLHttpRequest",
        "Accept": "*/*"
      };
      var headers = Object.assign({}, defaultHeaders);
      var forbiddenRequestHeaders = [
        "accept-charset",
        "accept-encoding",
        "access-control-request-headers",
        "access-control-request-method",
        "connection",
        "content-length",
        "content-transfer-encoding",
        "cookie",
        "cookie2",
        "date",
        "expect",
        "host",
        "keep-alive",
        "origin",
        "referer",
        "te",
        "trailer",
        "transfer-encoding",
        "upgrade",
        "via"
      ];
      var forbiddenRequestMethods = [
        "TRACE",
        "TRACK",
        "CONNECT"
      ];
      var sendFlag = false;
      var errorFlag = false;
      var abortedFlag = false;
      var listeners = {};
      this.UNSENT = 0;
      this.OPENED = 1;
      this.HEADERS_RECEIVED = 2;
      this.LOADING = 3;
      this.DONE = 4;
      this.readyState = this.UNSENT;
      this.onreadystatechange = null;
      this.responseText = "";
      this.responseXML = "";
      this.response = Buffer.alloc(0);
      this.status = null;
      this.statusText = null;
      var isAllowedHttpHeader = function(header) {
        return disableHeaderCheck || header && forbiddenRequestHeaders.indexOf(header.toLowerCase()) === -1;
      };
      var isAllowedHttpMethod = function(method) {
        return method && forbiddenRequestMethods.indexOf(method) === -1;
      };
      this.open = function(method, url, async, user, password) {
        this.abort();
        errorFlag = false;
        abortedFlag = false;
        if (!isAllowedHttpMethod(method)) {
          throw new Error("SecurityError: Request method not allowed");
        }
        settings = {
          "method": method,
          "url": url.toString(),
          "async": typeof async !== "boolean" ? true : async,
          "user": user || null,
          "password": password || null
        };
        setState(this.OPENED);
      };
      this.setDisableHeaderCheck = function(state) {
        disableHeaderCheck = state;
      };
      this.setRequestHeader = function(header, value) {
        if (this.readyState != this.OPENED) {
          throw new Error("INVALID_STATE_ERR: setRequestHeader can only be called when state is OPEN");
        }
        if (!isAllowedHttpHeader(header)) {
          console.warn('Refused to set unsafe header "' + header + '"');
          return false;
        }
        if (sendFlag) {
          throw new Error("INVALID_STATE_ERR: send flag is true");
        }
        headers[header] = value;
        return true;
      };
      this.getResponseHeader = function(header) {
        if (typeof header === "string" && this.readyState > this.OPENED && response.headers[header.toLowerCase()] && !errorFlag) {
          return response.headers[header.toLowerCase()];
        }
        return null;
      };
      this.getAllResponseHeaders = function() {
        if (this.readyState < this.HEADERS_RECEIVED || errorFlag) {
          return "";
        }
        var result = "";
        for (var i in response.headers) {
          if (i !== "set-cookie" && i !== "set-cookie2") {
            result += i + ": " + response.headers[i] + "\r\n";
          }
        }
        return result.substr(0, result.length - 2);
      };
      this.getRequestHeader = function(name) {
        if (typeof name === "string" && headers[name]) {
          return headers[name];
        }
        return "";
      };
      this.send = function(data) {
        if (this.readyState != this.OPENED) {
          throw new Error("INVALID_STATE_ERR: connection must be opened before send() is called");
        }
        if (sendFlag) {
          throw new Error("INVALID_STATE_ERR: send has already been called");
        }
        var ssl = false, local = false;
        var url = Url.parse(settings.url);
        var host;
        switch (url.protocol) {
          case "https:":
            ssl = true;
          // SSL & non-SSL both need host, no break here.
          case "http:":
            host = url.hostname;
            break;
          case "file:":
            local = true;
            break;
          case void 0:
          case "":
            host = "localhost";
            break;
          default:
            throw new Error("Protocol not supported.");
        }
        if (local) {
          if (settings.method !== "GET") {
            throw new Error("XMLHttpRequest: Only GET method is supported");
          }
          if (settings.async) {
            fs.readFile(unescape(url.pathname), function(error, data2) {
              if (error) {
                self.handleError(error, error.errno || -1);
              } else {
                self.status = 200;
                self.responseText = data2.toString("utf8");
                self.response = data2;
                setState(self.DONE);
              }
            });
          } else {
            try {
              this.response = fs.readFileSync(unescape(url.pathname));
              this.responseText = this.response.toString("utf8");
              this.status = 200;
              setState(self.DONE);
            } catch (e) {
              this.handleError(e, e.errno || -1);
            }
          }
          return;
        }
        var port = url.port || (ssl ? 443 : 80);
        var uri = url.pathname + (url.search ? url.search : "");
        headers["Host"] = host;
        if (!(ssl && port === 443 || port === 80)) {
          headers["Host"] += ":" + url.port;
        }
        if (settings.user) {
          if (typeof settings.password == "undefined") {
            settings.password = "";
          }
          var authBuf = new Buffer(settings.user + ":" + settings.password);
          headers["Authorization"] = "Basic " + authBuf.toString("base64");
        }
        if (settings.method === "GET" || settings.method === "HEAD") {
          data = null;
        } else if (data) {
          headers["Content-Length"] = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data);
          var headersKeys = Object.keys(headers);
          if (!headersKeys.some(function(h) {
            return h.toLowerCase() === "content-type";
          })) {
            headers["Content-Type"] = "text/plain;charset=UTF-8";
          }
        } else if (settings.method === "POST") {
          headers["Content-Length"] = 0;
        }
        var agent = opts.agent || false;
        var options = {
          host,
          port,
          path: uri,
          method: settings.method,
          headers,
          agent
        };
        if (ssl) {
          options.pfx = opts.pfx;
          options.key = opts.key;
          options.passphrase = opts.passphrase;
          options.cert = opts.cert;
          options.ca = opts.ca;
          options.ciphers = opts.ciphers;
          options.rejectUnauthorized = opts.rejectUnauthorized === false ? false : true;
        }
        errorFlag = false;
        if (settings.async) {
          var doRequest = ssl ? https.request : http.request;
          sendFlag = true;
          self.dispatchEvent("readystatechange");
          var responseHandler = function(resp2) {
            response = resp2;
            if (response.statusCode === 302 || response.statusCode === 303 || response.statusCode === 307) {
              settings.url = response.headers.location;
              var url2 = Url.parse(settings.url);
              host = url2.hostname;
              var newOptions = {
                hostname: url2.hostname,
                port: url2.port,
                path: url2.path,
                method: response.statusCode === 303 ? "GET" : settings.method,
                headers
              };
              if (ssl) {
                newOptions.pfx = opts.pfx;
                newOptions.key = opts.key;
                newOptions.passphrase = opts.passphrase;
                newOptions.cert = opts.cert;
                newOptions.ca = opts.ca;
                newOptions.ciphers = opts.ciphers;
                newOptions.rejectUnauthorized = opts.rejectUnauthorized === false ? false : true;
              }
              request = doRequest(newOptions, responseHandler).on("error", errorHandler);
              request.end();
              return;
            }
            setState(self.HEADERS_RECEIVED);
            self.status = response.statusCode;
            response.on("data", function(chunk) {
              if (chunk) {
                var data2 = Buffer.from(chunk);
                self.response = Buffer.concat([self.response, data2]);
              }
              if (sendFlag) {
                setState(self.LOADING);
              }
            });
            response.on("end", function() {
              if (sendFlag) {
                sendFlag = false;
                setState(self.DONE);
                self.responseText = self.response.toString("utf8");
              }
            });
            response.on("error", function(error) {
              self.handleError(error);
            });
          };
          var errorHandler = function(error) {
            if (request.reusedSocket && error.code === "ECONNRESET")
              return doRequest(options, responseHandler).on("error", errorHandler);
            self.handleError(error);
          };
          request = doRequest(options, responseHandler).on("error", errorHandler);
          if (opts.autoUnref) {
            request.on("socket", (socket) => {
              socket.unref();
            });
          }
          if (data) {
            request.write(data);
          }
          request.end();
          self.dispatchEvent("loadstart");
        } else {
          var contentFile = ".node-xmlhttprequest-content-" + process.pid;
          var syncFile = ".node-xmlhttprequest-sync-" + process.pid;
          fs.writeFileSync(syncFile, "", "utf8");
          var execString = "var http = require('http'), https = require('https'), fs = require('fs');var doRequest = http" + (ssl ? "s" : "") + ".request;var options = " + JSON.stringify(options) + ";var responseText = '';var responseData = Buffer.alloc(0);var req = doRequest(options, function(response) {response.on('data', function(chunk) {  var data = Buffer.from(chunk);  responseText += data.toString('utf8');  responseData = Buffer.concat([responseData, data]);});response.on('end', function() {fs.writeFileSync('" + contentFile + "', JSON.stringify({err: null, data: {statusCode: response.statusCode, headers: response.headers, text: responseText, data: responseData.toString('base64')}}), 'utf8');fs.unlinkSync('" + syncFile + "');});response.on('error', function(error) {fs.writeFileSync('" + contentFile + "', 'NODE-XMLHTTPREQUEST-ERROR:' + JSON.stringify(error), 'utf8');fs.unlinkSync('" + syncFile + "');});}).on('error', function(error) {fs.writeFileSync('" + contentFile + "', 'NODE-XMLHTTPREQUEST-ERROR:' + JSON.stringify(error), 'utf8');fs.unlinkSync('" + syncFile + "');});" + (data ? "req.write('" + JSON.stringify(data).slice(1, -1).replace(/'/g, "\\'") + "');" : "") + "req.end();";
          var syncProc = spawn(process.argv[0], ["-e", execString]);
          var statusText;
          while (fs.existsSync(syncFile)) {
          }
          self.responseText = fs.readFileSync(contentFile, "utf8");
          syncProc.stdin.end();
          fs.unlinkSync(contentFile);
          if (self.responseText.match(/^NODE-XMLHTTPREQUEST-ERROR:/)) {
            var errorObj = JSON.parse(self.responseText.replace(/^NODE-XMLHTTPREQUEST-ERROR:/, ""));
            self.handleError(errorObj, 503);
          } else {
            self.status = self.responseText.replace(/^NODE-XMLHTTPREQUEST-STATUS:([0-9]*),.*/, "$1");
            var resp = JSON.parse(self.responseText.replace(/^NODE-XMLHTTPREQUEST-STATUS:[0-9]*,(.*)/, "$1"));
            response = {
              statusCode: self.status,
              headers: resp.data.headers
            };
            self.responseText = resp.data.text;
            self.response = Buffer.from(resp.data.data, "base64");
            setState(self.DONE, true);
          }
        }
      };
      this.handleError = function(error, status) {
        this.status = status || 0;
        this.statusText = error;
        this.responseText = error.stack;
        errorFlag = true;
        setState(this.DONE);
      };
      this.abort = function() {
        if (request) {
          request.abort();
          request = null;
        }
        headers = Object.assign({}, defaultHeaders);
        this.responseText = "";
        this.responseXML = "";
        this.response = Buffer.alloc(0);
        errorFlag = abortedFlag = true;
        if (this.readyState !== this.UNSENT && (this.readyState !== this.OPENED || sendFlag) && this.readyState !== this.DONE) {
          sendFlag = false;
          setState(this.DONE);
        }
        this.readyState = this.UNSENT;
      };
      this.addEventListener = function(event, callback) {
        if (!(event in listeners)) {
          listeners[event] = [];
        }
        listeners[event].push(callback);
      };
      this.removeEventListener = function(event, callback) {
        if (event in listeners) {
          listeners[event] = listeners[event].filter(function(ev) {
            return ev !== callback;
          });
        }
      };
      this.dispatchEvent = function(event) {
        if (typeof self["on" + event] === "function") {
          if (this.readyState === this.DONE && settings.async)
            setTimeout(function() {
              self["on" + event]();
            }, 0);
          else
            self["on" + event]();
        }
        if (event in listeners) {
          for (let i = 0, len = listeners[event].length; i < len; i++) {
            if (this.readyState === this.DONE)
              setTimeout(function() {
                listeners[event][i].call(self);
              }, 0);
            else
              listeners[event][i].call(self);
          }
        }
      };
      var setState = function(state) {
        if (self.readyState === state || self.readyState === self.UNSENT && abortedFlag)
          return;
        self.readyState = state;
        if (settings.async || self.readyState < self.OPENED || self.readyState === self.DONE) {
          self.dispatchEvent("readystatechange");
        }
        if (self.readyState === self.DONE) {
          let fire;
          if (abortedFlag)
            fire = "abort";
          else if (errorFlag)
            fire = "error";
          else
            fire = "load";
          self.dispatchEvent(fire);
          self.dispatchEvent("loadend");
        }
      };
    }
  }
});

// node_modules/engine.io-parser/build/cjs/commons.js
var require_commons = __commonJS({
  "node_modules/engine.io-parser/build/cjs/commons.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ERROR_PACKET = exports2.PACKET_TYPES_REVERSE = exports2.PACKET_TYPES = void 0;
    var PACKET_TYPES = /* @__PURE__ */ Object.create(null);
    exports2.PACKET_TYPES = PACKET_TYPES;
    PACKET_TYPES["open"] = "0";
    PACKET_TYPES["close"] = "1";
    PACKET_TYPES["ping"] = "2";
    PACKET_TYPES["pong"] = "3";
    PACKET_TYPES["message"] = "4";
    PACKET_TYPES["upgrade"] = "5";
    PACKET_TYPES["noop"] = "6";
    var PACKET_TYPES_REVERSE = /* @__PURE__ */ Object.create(null);
    exports2.PACKET_TYPES_REVERSE = PACKET_TYPES_REVERSE;
    Object.keys(PACKET_TYPES).forEach((key) => {
      PACKET_TYPES_REVERSE[PACKET_TYPES[key]] = key;
    });
    var ERROR_PACKET = { type: "error", data: "parser error" };
    exports2.ERROR_PACKET = ERROR_PACKET;
  }
});

// node_modules/engine.io-parser/build/cjs/encodePacket.js
var require_encodePacket = __commonJS({
  "node_modules/engine.io-parser/build/cjs/encodePacket.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.encodePacket = void 0;
    exports2.encodePacketToBinary = encodePacketToBinary;
    var commons_js_1 = require_commons();
    var encodePacket = ({ type: type2, data }, supportsBinary, callback) => {
      if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
        return callback(supportsBinary ? data : "b" + toBuffer(data, true).toString("base64"));
      }
      return callback(commons_js_1.PACKET_TYPES[type2] + (data || ""));
    };
    exports2.encodePacket = encodePacket;
    var toBuffer = (data, forceBufferConversion) => {
      if (Buffer.isBuffer(data) || data instanceof Uint8Array && !forceBufferConversion) {
        return data;
      } else if (data instanceof ArrayBuffer) {
        return Buffer.from(data);
      } else {
        return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
      }
    };
    var TEXT_ENCODER;
    function encodePacketToBinary(packet, callback) {
      if (packet.data instanceof ArrayBuffer || ArrayBuffer.isView(packet.data)) {
        return callback(toBuffer(packet.data, false));
      }
      (0, exports2.encodePacket)(packet, true, (encoded) => {
        if (!TEXT_ENCODER) {
          TEXT_ENCODER = new TextEncoder();
        }
        callback(TEXT_ENCODER.encode(encoded));
      });
    }
  }
});

// node_modules/engine.io-parser/build/cjs/decodePacket.js
var require_decodePacket = __commonJS({
  "node_modules/engine.io-parser/build/cjs/decodePacket.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.decodePacket = void 0;
    var commons_js_1 = require_commons();
    var decodePacket = (encodedPacket, binaryType) => {
      if (typeof encodedPacket !== "string") {
        return {
          type: "message",
          data: mapBinary(encodedPacket, binaryType)
        };
      }
      const type2 = encodedPacket.charAt(0);
      if (type2 === "b") {
        const buffer = Buffer.from(encodedPacket.substring(1), "base64");
        return {
          type: "message",
          data: mapBinary(buffer, binaryType)
        };
      }
      if (!commons_js_1.PACKET_TYPES_REVERSE[type2]) {
        return commons_js_1.ERROR_PACKET;
      }
      return encodedPacket.length > 1 ? {
        type: commons_js_1.PACKET_TYPES_REVERSE[type2],
        data: encodedPacket.substring(1)
      } : {
        type: commons_js_1.PACKET_TYPES_REVERSE[type2]
      };
    };
    exports2.decodePacket = decodePacket;
    var mapBinary = (data, binaryType) => {
      switch (binaryType) {
        case "arraybuffer":
          if (data instanceof ArrayBuffer) {
            return data;
          } else if (Buffer.isBuffer(data)) {
            return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
          } else {
            return data.buffer;
          }
        case "nodebuffer":
        default:
          if (Buffer.isBuffer(data)) {
            return data;
          } else {
            return Buffer.from(data);
          }
      }
    };
  }
});

// node_modules/engine.io-parser/build/cjs/index.js
var require_cjs = __commonJS({
  "node_modules/engine.io-parser/build/cjs/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.decodePayload = exports2.decodePacket = exports2.encodePayload = exports2.encodePacket = exports2.protocol = void 0;
    exports2.createPacketEncoderStream = createPacketEncoderStream;
    exports2.createPacketDecoderStream = createPacketDecoderStream;
    var encodePacket_js_1 = require_encodePacket();
    Object.defineProperty(exports2, "encodePacket", { enumerable: true, get: function() {
      return encodePacket_js_1.encodePacket;
    } });
    var decodePacket_js_1 = require_decodePacket();
    Object.defineProperty(exports2, "decodePacket", { enumerable: true, get: function() {
      return decodePacket_js_1.decodePacket;
    } });
    var commons_js_1 = require_commons();
    var SEPARATOR = String.fromCharCode(30);
    var encodePayload = (packets, callback) => {
      const length = packets.length;
      const encodedPackets = new Array(length);
      let count = 0;
      packets.forEach((packet, i) => {
        (0, encodePacket_js_1.encodePacket)(packet, false, (encodedPacket) => {
          encodedPackets[i] = encodedPacket;
          if (++count === length) {
            callback(encodedPackets.join(SEPARATOR));
          }
        });
      });
    };
    exports2.encodePayload = encodePayload;
    var decodePayload = (encodedPayload, binaryType) => {
      const encodedPackets = encodedPayload.split(SEPARATOR);
      const packets = [];
      for (let i = 0; i < encodedPackets.length; i++) {
        const decodedPacket = (0, decodePacket_js_1.decodePacket)(encodedPackets[i], binaryType);
        packets.push(decodedPacket);
        if (decodedPacket.type === "error") {
          break;
        }
      }
      return packets;
    };
    exports2.decodePayload = decodePayload;
    function createPacketEncoderStream() {
      return new TransformStream({
        transform(packet, controller) {
          (0, encodePacket_js_1.encodePacketToBinary)(packet, (encodedPacket) => {
            const payloadLength = encodedPacket.length;
            let header;
            if (payloadLength < 126) {
              header = new Uint8Array(1);
              new DataView(header.buffer).setUint8(0, payloadLength);
            } else if (payloadLength < 65536) {
              header = new Uint8Array(3);
              const view = new DataView(header.buffer);
              view.setUint8(0, 126);
              view.setUint16(1, payloadLength);
            } else {
              header = new Uint8Array(9);
              const view = new DataView(header.buffer);
              view.setUint8(0, 127);
              view.setBigUint64(1, BigInt(payloadLength));
            }
            if (packet.data && typeof packet.data !== "string") {
              header[0] |= 128;
            }
            controller.enqueue(header);
            controller.enqueue(encodedPacket);
          });
        }
      });
    }
    var TEXT_DECODER;
    function totalLength(chunks) {
      return chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    }
    function concatChunks(chunks, size) {
      if (chunks[0].length === size) {
        return chunks.shift();
      }
      const buffer = new Uint8Array(size);
      let j = 0;
      for (let i = 0; i < size; i++) {
        buffer[i] = chunks[0][j++];
        if (j === chunks[0].length) {
          chunks.shift();
          j = 0;
        }
      }
      if (chunks.length && j < chunks[0].length) {
        chunks[0] = chunks[0].slice(j);
      }
      return buffer;
    }
    function createPacketDecoderStream(maxPayload, binaryType) {
      if (!TEXT_DECODER) {
        TEXT_DECODER = new TextDecoder();
      }
      const chunks = [];
      let state = 0;
      let expectedLength = -1;
      let isBinary = false;
      return new TransformStream({
        transform(chunk, controller) {
          chunks.push(chunk);
          while (true) {
            if (state === 0) {
              if (totalLength(chunks) < 1) {
                break;
              }
              const header = concatChunks(chunks, 1);
              isBinary = (header[0] & 128) === 128;
              expectedLength = header[0] & 127;
              if (expectedLength < 126) {
                state = 3;
              } else if (expectedLength === 126) {
                state = 1;
              } else {
                state = 2;
              }
            } else if (state === 1) {
              if (totalLength(chunks) < 2) {
                break;
              }
              const headerArray = concatChunks(chunks, 2);
              expectedLength = new DataView(headerArray.buffer, headerArray.byteOffset, headerArray.length).getUint16(0);
              state = 3;
            } else if (state === 2) {
              if (totalLength(chunks) < 8) {
                break;
              }
              const headerArray = concatChunks(chunks, 8);
              const view = new DataView(headerArray.buffer, headerArray.byteOffset, headerArray.length);
              const n = view.getUint32(0);
              if (n > Math.pow(2, 53 - 32) - 1) {
                controller.enqueue(commons_js_1.ERROR_PACKET);
                break;
              }
              expectedLength = n * Math.pow(2, 32) + view.getUint32(4);
              state = 3;
            } else {
              if (totalLength(chunks) < expectedLength) {
                break;
              }
              const data = concatChunks(chunks, expectedLength);
              controller.enqueue((0, decodePacket_js_1.decodePacket)(isBinary ? data : TEXT_DECODER.decode(data), binaryType));
              state = 0;
            }
            if (expectedLength === 0 || expectedLength > maxPayload) {
              controller.enqueue(commons_js_1.ERROR_PACKET);
              break;
            }
          }
        }
      });
    }
    exports2.protocol = 4;
  }
});

// node_modules/@socket.io/component-emitter/lib/cjs/index.js
var require_cjs2 = __commonJS({
  "node_modules/@socket.io/component-emitter/lib/cjs/index.js"(exports2) {
    exports2.Emitter = Emitter;
    function Emitter(obj) {
      if (obj) return mixin(obj);
    }
    function mixin(obj) {
      for (var key in Emitter.prototype) {
        obj[key] = Emitter.prototype[key];
      }
      return obj;
    }
    Emitter.prototype.on = Emitter.prototype.addEventListener = function(event, fn) {
      this._callbacks = this._callbacks || {};
      (this._callbacks["$" + event] = this._callbacks["$" + event] || []).push(fn);
      return this;
    };
    Emitter.prototype.once = function(event, fn) {
      function on() {
        this.off(event, on);
        fn.apply(this, arguments);
      }
      on.fn = fn;
      this.on(event, on);
      return this;
    };
    Emitter.prototype.off = Emitter.prototype.removeListener = Emitter.prototype.removeAllListeners = Emitter.prototype.removeEventListener = function(event, fn) {
      this._callbacks = this._callbacks || {};
      if (0 == arguments.length) {
        this._callbacks = {};
        return this;
      }
      var callbacks = this._callbacks["$" + event];
      if (!callbacks) return this;
      if (1 == arguments.length) {
        delete this._callbacks["$" + event];
        return this;
      }
      var cb;
      for (var i = 0; i < callbacks.length; i++) {
        cb = callbacks[i];
        if (cb === fn || cb.fn === fn) {
          callbacks.splice(i, 1);
          break;
        }
      }
      if (callbacks.length === 0) {
        delete this._callbacks["$" + event];
      }
      return this;
    };
    Emitter.prototype.emit = function(event) {
      this._callbacks = this._callbacks || {};
      var args = new Array(arguments.length - 1), callbacks = this._callbacks["$" + event];
      for (var i = 1; i < arguments.length; i++) {
        args[i - 1] = arguments[i];
      }
      if (callbacks) {
        callbacks = callbacks.slice(0);
        for (var i = 0, len = callbacks.length; i < len; ++i) {
          callbacks[i].apply(this, args);
        }
      }
      return this;
    };
    Emitter.prototype.emitReserved = Emitter.prototype.emit;
    Emitter.prototype.listeners = function(event) {
      this._callbacks = this._callbacks || {};
      return this._callbacks["$" + event] || [];
    };
    Emitter.prototype.hasListeners = function(event) {
      return !!this.listeners(event).length;
    };
  }
});

// node_modules/engine.io-client/build/cjs/globals.node.js
var require_globals_node = __commonJS({
  "node_modules/engine.io-client/build/cjs/globals.node.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CookieJar = exports2.defaultBinaryType = exports2.globalThisShim = exports2.nextTick = void 0;
    exports2.createCookieJar = createCookieJar;
    exports2.parse = parse;
    exports2.nextTick = process.nextTick;
    exports2.globalThisShim = global;
    exports2.defaultBinaryType = "nodebuffer";
    function createCookieJar() {
      return new CookieJar();
    }
    function parse(setCookieString) {
      const parts = setCookieString.split("; ");
      const i = parts[0].indexOf("=");
      if (i === -1) {
        return;
      }
      const name = parts[0].substring(0, i).trim();
      if (!name.length) {
        return;
      }
      let value = parts[0].substring(i + 1).trim();
      if (value.charCodeAt(0) === 34) {
        value = value.slice(1, -1);
      }
      const cookie = {
        name,
        value
      };
      for (let j = 1; j < parts.length; j++) {
        const subParts = parts[j].split("=");
        if (subParts.length !== 2) {
          continue;
        }
        const key = subParts[0].trim();
        const value2 = subParts[1].trim();
        switch (key) {
          case "Expires":
            cookie.expires = new Date(value2);
            break;
          case "Max-Age":
            const expiration = /* @__PURE__ */ new Date();
            expiration.setUTCSeconds(expiration.getUTCSeconds() + parseInt(value2, 10));
            cookie.expires = expiration;
            break;
          default:
        }
      }
      return cookie;
    }
    var CookieJar = class {
      constructor() {
        this._cookies = /* @__PURE__ */ new Map();
      }
      parseCookies(values) {
        if (!values) {
          return;
        }
        values.forEach((value) => {
          const parsed = parse(value);
          if (parsed) {
            this._cookies.set(parsed.name, parsed);
          }
        });
      }
      get cookies() {
        const now = Date.now();
        this._cookies.forEach((cookie, name) => {
          var _a;
          if (((_a = cookie.expires) === null || _a === void 0 ? void 0 : _a.getTime()) < now) {
            this._cookies.delete(name);
          }
        });
        return this._cookies.entries();
      }
      addCookies(xhr) {
        const cookies = [];
        for (const [name, cookie] of this.cookies) {
          cookies.push(`${name}=${cookie.value}`);
        }
        if (cookies.length) {
          xhr.setDisableHeaderCheck(true);
          xhr.setRequestHeader("cookie", cookies.join("; "));
        }
      }
      appendCookies(headers) {
        for (const [name, cookie] of this.cookies) {
          headers.append("cookie", `${name}=${cookie.value}`);
        }
      }
    };
    exports2.CookieJar = CookieJar;
  }
});

// node_modules/engine.io-client/build/cjs/util.js
var require_util = __commonJS({
  "node_modules/engine.io-client/build/cjs/util.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.pick = pick;
    exports2.installTimerFunctions = installTimerFunctions;
    exports2.byteLength = byteLength;
    exports2.randomString = randomString;
    var globals_node_js_1 = require_globals_node();
    function pick(obj, ...attr) {
      return attr.reduce((acc, k) => {
        if (obj.hasOwnProperty(k)) {
          acc[k] = obj[k];
        }
        return acc;
      }, {});
    }
    var NATIVE_SET_TIMEOUT = globals_node_js_1.globalThisShim.setTimeout;
    var NATIVE_CLEAR_TIMEOUT = globals_node_js_1.globalThisShim.clearTimeout;
    function installTimerFunctions(obj, opts) {
      if (opts.useNativeTimers) {
        obj.setTimeoutFn = NATIVE_SET_TIMEOUT.bind(globals_node_js_1.globalThisShim);
        obj.clearTimeoutFn = NATIVE_CLEAR_TIMEOUT.bind(globals_node_js_1.globalThisShim);
      } else {
        obj.setTimeoutFn = globals_node_js_1.globalThisShim.setTimeout.bind(globals_node_js_1.globalThisShim);
        obj.clearTimeoutFn = globals_node_js_1.globalThisShim.clearTimeout.bind(globals_node_js_1.globalThisShim);
      }
    }
    var BASE64_OVERHEAD = 1.33;
    function byteLength(obj) {
      if (typeof obj === "string") {
        return utf8Length(obj);
      }
      return Math.ceil((obj.byteLength || obj.size) * BASE64_OVERHEAD);
    }
    function utf8Length(str) {
      let c = 0, length = 0;
      for (let i = 0, l = str.length; i < l; i++) {
        c = str.charCodeAt(i);
        if (c < 128) {
          length += 1;
        } else if (c < 2048) {
          length += 2;
        } else if (c < 55296 || c >= 57344) {
          length += 3;
        } else {
          i++;
          length += 4;
        }
      }
      return length;
    }
    function randomString() {
      return Date.now().toString(36).substring(3) + Math.random().toString(36).substring(2, 5);
    }
  }
});

// node_modules/engine.io-client/build/cjs/contrib/parseqs.js
var require_parseqs = __commonJS({
  "node_modules/engine.io-client/build/cjs/contrib/parseqs.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.encode = encode;
    exports2.decode = decode;
    function encode(obj) {
      let str = "";
      for (let i in obj) {
        if (obj.hasOwnProperty(i)) {
          if (str.length)
            str += "&";
          str += encodeURIComponent(i) + "=" + encodeURIComponent(obj[i]);
        }
      }
      return str;
    }
    function decode(qs) {
      let qry = {};
      let pairs = qs.split("&");
      for (let i = 0, l = pairs.length; i < l; i++) {
        let pair = pairs[i].split("=");
        qry[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
      }
      return qry;
    }
  }
});

// node_modules/ms/index.js
var require_ms = __commonJS({
  "node_modules/ms/index.js"(exports2, module2) {
    var s = 1e3;
    var m = s * 60;
    var h = m * 60;
    var d = h * 24;
    var w = d * 7;
    var y = d * 365.25;
    module2.exports = function(val, options) {
      options = options || {};
      var type2 = typeof val;
      if (type2 === "string" && val.length > 0) {
        return parse(val);
      } else if (type2 === "number" && isFinite(val)) {
        return options.long ? fmtLong(val) : fmtShort(val);
      }
      throw new Error(
        "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
      );
    };
    function parse(str) {
      str = String(str);
      if (str.length > 100) {
        return;
      }
      var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        str
      );
      if (!match) {
        return;
      }
      var n = parseFloat(match[1]);
      var type2 = (match[2] || "ms").toLowerCase();
      switch (type2) {
        case "years":
        case "year":
        case "yrs":
        case "yr":
        case "y":
          return n * y;
        case "weeks":
        case "week":
        case "w":
          return n * w;
        case "days":
        case "day":
        case "d":
          return n * d;
        case "hours":
        case "hour":
        case "hrs":
        case "hr":
        case "h":
          return n * h;
        case "minutes":
        case "minute":
        case "mins":
        case "min":
        case "m":
          return n * m;
        case "seconds":
        case "second":
        case "secs":
        case "sec":
        case "s":
          return n * s;
        case "milliseconds":
        case "millisecond":
        case "msecs":
        case "msec":
        case "ms":
          return n;
        default:
          return void 0;
      }
    }
    function fmtShort(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return Math.round(ms / d) + "d";
      }
      if (msAbs >= h) {
        return Math.round(ms / h) + "h";
      }
      if (msAbs >= m) {
        return Math.round(ms / m) + "m";
      }
      if (msAbs >= s) {
        return Math.round(ms / s) + "s";
      }
      return ms + "ms";
    }
    function fmtLong(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return plural(ms, msAbs, d, "day");
      }
      if (msAbs >= h) {
        return plural(ms, msAbs, h, "hour");
      }
      if (msAbs >= m) {
        return plural(ms, msAbs, m, "minute");
      }
      if (msAbs >= s) {
        return plural(ms, msAbs, s, "second");
      }
      return ms + " ms";
    }
    function plural(ms, msAbs, n, name) {
      var isPlural = msAbs >= n * 1.5;
      return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
    }
  }
});

// node_modules/debug/src/common.js
var require_common = __commonJS({
  "node_modules/debug/src/common.js"(exports2, module2) {
    function setup(env) {
      createDebug.debug = createDebug;
      createDebug.default = createDebug;
      createDebug.coerce = coerce;
      createDebug.disable = disable;
      createDebug.enable = enable;
      createDebug.enabled = enabled;
      createDebug.humanize = require_ms();
      createDebug.destroy = destroy;
      Object.keys(env).forEach((key) => {
        createDebug[key] = env[key];
      });
      createDebug.names = [];
      createDebug.skips = [];
      createDebug.formatters = {};
      function selectColor(namespace) {
        let hash = 0;
        for (let i = 0; i < namespace.length; i++) {
          hash = (hash << 5) - hash + namespace.charCodeAt(i);
          hash |= 0;
        }
        return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
      }
      createDebug.selectColor = selectColor;
      function createDebug(namespace) {
        let prevTime;
        let enableOverride = null;
        let namespacesCache;
        let enabledCache;
        function debug(...args) {
          if (!debug.enabled) {
            return;
          }
          const self = debug;
          const curr = Number(/* @__PURE__ */ new Date());
          const ms = curr - (prevTime || curr);
          self.diff = ms;
          self.prev = prevTime;
          self.curr = curr;
          prevTime = curr;
          args[0] = createDebug.coerce(args[0]);
          if (typeof args[0] !== "string") {
            args.unshift("%O");
          }
          let index = 0;
          args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
            if (match === "%%") {
              return "%";
            }
            index++;
            const formatter = createDebug.formatters[format];
            if (typeof formatter === "function") {
              const val = args[index];
              match = formatter.call(self, val);
              args.splice(index, 1);
              index--;
            }
            return match;
          });
          createDebug.formatArgs.call(self, args);
          const logFn = self.log || createDebug.log;
          logFn.apply(self, args);
        }
        debug.namespace = namespace;
        debug.useColors = createDebug.useColors();
        debug.color = createDebug.selectColor(namespace);
        debug.extend = extend;
        debug.destroy = createDebug.destroy;
        Object.defineProperty(debug, "enabled", {
          enumerable: true,
          configurable: false,
          get: () => {
            if (enableOverride !== null) {
              return enableOverride;
            }
            if (namespacesCache !== createDebug.namespaces) {
              namespacesCache = createDebug.namespaces;
              enabledCache = createDebug.enabled(namespace);
            }
            return enabledCache;
          },
          set: (v) => {
            enableOverride = v;
          }
        });
        if (typeof createDebug.init === "function") {
          createDebug.init(debug);
        }
        return debug;
      }
      function extend(namespace, delimiter) {
        const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
        newDebug.log = this.log;
        return newDebug;
      }
      function enable(namespaces) {
        createDebug.save(namespaces);
        createDebug.namespaces = namespaces;
        createDebug.names = [];
        createDebug.skips = [];
        const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
        for (const ns of split) {
          if (ns[0] === "-") {
            createDebug.skips.push(ns.slice(1));
          } else {
            createDebug.names.push(ns);
          }
        }
      }
      function matchesTemplate(search, template) {
        let searchIndex = 0;
        let templateIndex = 0;
        let starIndex = -1;
        let matchIndex = 0;
        while (searchIndex < search.length) {
          if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
            if (template[templateIndex] === "*") {
              starIndex = templateIndex;
              matchIndex = searchIndex;
              templateIndex++;
            } else {
              searchIndex++;
              templateIndex++;
            }
          } else if (starIndex !== -1) {
            templateIndex = starIndex + 1;
            matchIndex++;
            searchIndex = matchIndex;
          } else {
            return false;
          }
        }
        while (templateIndex < template.length && template[templateIndex] === "*") {
          templateIndex++;
        }
        return templateIndex === template.length;
      }
      function disable() {
        const namespaces = [
          ...createDebug.names,
          ...createDebug.skips.map((namespace) => "-" + namespace)
        ].join(",");
        createDebug.enable("");
        return namespaces;
      }
      function enabled(name) {
        for (const skip of createDebug.skips) {
          if (matchesTemplate(name, skip)) {
            return false;
          }
        }
        for (const ns of createDebug.names) {
          if (matchesTemplate(name, ns)) {
            return true;
          }
        }
        return false;
      }
      function coerce(val) {
        if (val instanceof Error) {
          return val.stack || val.message;
        }
        return val;
      }
      function destroy() {
        console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
      }
      createDebug.enable(createDebug.load());
      return createDebug;
    }
    module2.exports = setup;
  }
});

// node_modules/debug/src/browser.js
var require_browser = __commonJS({
  "node_modules/debug/src/browser.js"(exports2, module2) {
    exports2.formatArgs = formatArgs;
    exports2.save = save;
    exports2.load = load;
    exports2.useColors = useColors;
    exports2.storage = localstorage();
    exports2.destroy = /* @__PURE__ */ (() => {
      let warned = false;
      return () => {
        if (!warned) {
          warned = true;
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
      };
    })();
    exports2.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function useColors() {
      if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
        return true;
      }
      if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
        return false;
      }
      let m;
      return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function formatArgs(args) {
      args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module2.exports.humanize(this.diff);
      if (!this.useColors) {
        return;
      }
      const c = "color: " + this.color;
      args.splice(1, 0, c, "color: inherit");
      let index = 0;
      let lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === "%%") {
          return;
        }
        index++;
        if (match === "%c") {
          lastC = index;
        }
      });
      args.splice(lastC, 0, c);
    }
    exports2.log = console.debug || console.log || (() => {
    });
    function save(namespaces) {
      try {
        if (namespaces) {
          exports2.storage.setItem("debug", namespaces);
        } else {
          exports2.storage.removeItem("debug");
        }
      } catch (error) {
      }
    }
    function load() {
      let r;
      try {
        r = exports2.storage.getItem("debug") || exports2.storage.getItem("DEBUG");
      } catch (error) {
      }
      if (!r && typeof process !== "undefined" && "env" in process) {
        r = process.env.DEBUG;
      }
      return r;
    }
    function localstorage() {
      try {
        return localStorage;
      } catch (error) {
      }
    }
    module2.exports = require_common()(exports2);
    var { formatters } = module2.exports;
    formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (error) {
        return "[UnexpectedJSONParseError]: " + error.message;
      }
    };
  }
});

// node_modules/debug/src/node.js
var require_node = __commonJS({
  "node_modules/debug/src/node.js"(exports2, module2) {
    var tty = require("tty");
    var util = require("util");
    exports2.init = init2;
    exports2.log = log;
    exports2.formatArgs = formatArgs;
    exports2.save = save;
    exports2.load = load;
    exports2.useColors = useColors;
    exports2.destroy = util.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    );
    exports2.colors = [6, 2, 3, 4, 5, 1];
    try {
      const supportsColor = require("supports-color");
      if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
        exports2.colors = [
          20,
          21,
          26,
          27,
          32,
          33,
          38,
          39,
          40,
          41,
          42,
          43,
          44,
          45,
          56,
          57,
          62,
          63,
          68,
          69,
          74,
          75,
          76,
          77,
          78,
          79,
          80,
          81,
          92,
          93,
          98,
          99,
          112,
          113,
          128,
          129,
          134,
          135,
          148,
          149,
          160,
          161,
          162,
          163,
          164,
          165,
          166,
          167,
          168,
          169,
          170,
          171,
          172,
          173,
          178,
          179,
          184,
          185,
          196,
          197,
          198,
          199,
          200,
          201,
          202,
          203,
          204,
          205,
          206,
          207,
          208,
          209,
          214,
          215,
          220,
          221
        ];
      }
    } catch (error) {
    }
    exports2.inspectOpts = Object.keys(process.env).filter((key) => {
      return /^debug_/i.test(key);
    }).reduce((obj, key) => {
      const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
        return k.toUpperCase();
      });
      let val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) {
        val = true;
      } else if (/^(no|off|false|disabled)$/i.test(val)) {
        val = false;
      } else if (val === "null") {
        val = null;
      } else {
        val = Number(val);
      }
      obj[prop] = val;
      return obj;
    }, {});
    function useColors() {
      return "colors" in exports2.inspectOpts ? Boolean(exports2.inspectOpts.colors) : tty.isatty(process.stderr.fd);
    }
    function formatArgs(args) {
      const { namespace: name, useColors: useColors2 } = this;
      if (useColors2) {
        const c = this.color;
        const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
        const prefix = `  ${colorCode};1m${name} \x1B[0m`;
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
        args.push(colorCode + "m+" + module2.exports.humanize(this.diff) + "\x1B[0m");
      } else {
        args[0] = getDate() + name + " " + args[0];
      }
    }
    function getDate() {
      if (exports2.inspectOpts.hideDate) {
        return "";
      }
      return (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function log(...args) {
      return process.stderr.write(util.formatWithOptions(exports2.inspectOpts, ...args) + "\n");
    }
    function save(namespaces) {
      if (namespaces) {
        process.env.DEBUG = namespaces;
      } else {
        delete process.env.DEBUG;
      }
    }
    function load() {
      return process.env.DEBUG;
    }
    function init2(debug) {
      debug.inspectOpts = {};
      const keys = Object.keys(exports2.inspectOpts);
      for (let i = 0; i < keys.length; i++) {
        debug.inspectOpts[keys[i]] = exports2.inspectOpts[keys[i]];
      }
    }
    module2.exports = require_common()(exports2);
    var { formatters } = module2.exports;
    formatters.o = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
    };
    formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts);
    };
  }
});

// node_modules/debug/src/index.js
var require_src = __commonJS({
  "node_modules/debug/src/index.js"(exports2, module2) {
    if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
      module2.exports = require_browser();
    } else {
      module2.exports = require_node();
    }
  }
});

// node_modules/engine.io-client/build/cjs/transport.js
var require_transport = __commonJS({
  "node_modules/engine.io-client/build/cjs/transport.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Transport = exports2.TransportError = void 0;
    var engine_io_parser_1 = require_cjs();
    var component_emitter_1 = require_cjs2();
    var util_js_1 = require_util();
    var parseqs_js_1 = require_parseqs();
    var debug_1 = __importDefault(require_src());
    var debug = (0, debug_1.default)("engine.io-client:transport");
    var TransportError = class extends Error {
      constructor(reason, description, context) {
        super(reason);
        this.description = description;
        this.context = context;
        this.type = "TransportError";
      }
    };
    exports2.TransportError = TransportError;
    var Transport = class extends component_emitter_1.Emitter {
      /**
       * Transport abstract constructor.
       *
       * @param {Object} opts - options
       * @protected
       */
      constructor(opts) {
        super();
        this.writable = false;
        (0, util_js_1.installTimerFunctions)(this, opts);
        this.opts = opts;
        this.query = opts.query;
        this.socket = opts.socket;
        this.supportsBinary = !opts.forceBase64;
      }
      /**
       * Emits an error.
       *
       * @param {String} reason
       * @param description
       * @param context - the error context
       * @return {Transport} for chaining
       * @protected
       */
      onError(reason, description, context) {
        super.emitReserved("error", new TransportError(reason, description, context));
        return this;
      }
      /**
       * Opens the transport.
       */
      open() {
        this.readyState = "opening";
        this.doOpen();
        return this;
      }
      /**
       * Closes the transport.
       */
      close() {
        if (this.readyState === "opening" || this.readyState === "open") {
          this.doClose();
          this.onClose();
        }
        return this;
      }
      /**
       * Sends multiple packets.
       *
       * @param {Array} packets
       */
      send(packets) {
        if (this.readyState === "open") {
          this.write(packets);
        } else {
          debug("transport is not open, discarding packets");
        }
      }
      /**
       * Called upon open
       *
       * @protected
       */
      onOpen() {
        this.readyState = "open";
        this.writable = true;
        super.emitReserved("open");
      }
      /**
       * Called with data.
       *
       * @param {String} data
       * @protected
       */
      onData(data) {
        const packet = (0, engine_io_parser_1.decodePacket)(data, this.socket.binaryType);
        this.onPacket(packet);
      }
      /**
       * Called with a decoded packet.
       *
       * @protected
       */
      onPacket(packet) {
        super.emitReserved("packet", packet);
      }
      /**
       * Called upon close.
       *
       * @protected
       */
      onClose(details) {
        this.readyState = "closed";
        super.emitReserved("close", details);
      }
      /**
       * Pauses the transport, in order not to lose packets during an upgrade.
       *
       * @param onPause
       */
      pause(onPause) {
      }
      createUri(schema, query = {}) {
        return schema + "://" + this._hostname() + this._port() + this.opts.path + this._query(query);
      }
      _hostname() {
        const hostname = this.opts.hostname;
        return hostname.indexOf(":") === -1 ? hostname : "[" + hostname + "]";
      }
      _port() {
        if (this.opts.port && (this.opts.secure && Number(this.opts.port) !== 443 || !this.opts.secure && Number(this.opts.port) !== 80)) {
          return ":" + this.opts.port;
        } else {
          return "";
        }
      }
      _query(query) {
        const encodedQuery = (0, parseqs_js_1.encode)(query);
        return encodedQuery.length ? "?" + encodedQuery : "";
      }
    };
    exports2.Transport = Transport;
  }
});

// node_modules/engine.io-client/build/cjs/transports/polling.js
var require_polling = __commonJS({
  "node_modules/engine.io-client/build/cjs/transports/polling.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Polling = void 0;
    var transport_js_1 = require_transport();
    var util_js_1 = require_util();
    var engine_io_parser_1 = require_cjs();
    var debug_1 = __importDefault(require_src());
    var debug = (0, debug_1.default)("engine.io-client:polling");
    var Polling = class extends transport_js_1.Transport {
      constructor() {
        super(...arguments);
        this._polling = false;
      }
      get name() {
        return "polling";
      }
      /**
       * Opens the socket (triggers polling). We write a PING message to determine
       * when the transport is open.
       *
       * @protected
       */
      doOpen() {
        this._poll();
      }
      /**
       * Pauses polling.
       *
       * @param {Function} onPause - callback upon buffers are flushed and transport is paused
       * @package
       */
      pause(onPause) {
        this.readyState = "pausing";
        const pause = () => {
          debug("paused");
          this.readyState = "paused";
          onPause();
        };
        if (this._polling || !this.writable) {
          let total = 0;
          if (this._polling) {
            debug("we are currently polling - waiting to pause");
            total++;
            this.once("pollComplete", function() {
              debug("pre-pause polling complete");
              --total || pause();
            });
          }
          if (!this.writable) {
            debug("we are currently writing - waiting to pause");
            total++;
            this.once("drain", function() {
              debug("pre-pause writing complete");
              --total || pause();
            });
          }
        } else {
          pause();
        }
      }
      /**
       * Starts polling cycle.
       *
       * @private
       */
      _poll() {
        debug("polling");
        this._polling = true;
        this.doPoll();
        this.emitReserved("poll");
      }
      /**
       * Overloads onData to detect payloads.
       *
       * @protected
       */
      onData(data) {
        debug("polling got data %s", data);
        const callback = (packet) => {
          if ("opening" === this.readyState && packet.type === "open") {
            this.onOpen();
          }
          if ("close" === packet.type) {
            this.onClose({ description: "transport closed by the server" });
            return false;
          }
          this.onPacket(packet);
        };
        (0, engine_io_parser_1.decodePayload)(data, this.socket.binaryType).forEach(callback);
        if ("closed" !== this.readyState) {
          this._polling = false;
          this.emitReserved("pollComplete");
          if ("open" === this.readyState) {
            this._poll();
          } else {
            debug('ignoring poll - transport state "%s"', this.readyState);
          }
        }
      }
      /**
       * For polling, send a close packet.
       *
       * @protected
       */
      doClose() {
        const close = () => {
          debug("writing close packet");
          this.write([{ type: "close" }]);
        };
        if ("open" === this.readyState) {
          debug("transport open - closing");
          close();
        } else {
          debug("transport not open - deferring close");
          this.once("open", close);
        }
      }
      /**
       * Writes a packets payload.
       *
       * @param {Array} packets - data packets
       * @protected
       */
      write(packets) {
        this.writable = false;
        (0, engine_io_parser_1.encodePayload)(packets, (data) => {
          this.doWrite(data, () => {
            this.writable = true;
            this.emitReserved("drain");
          });
        });
      }
      /**
       * Generates uri for connection.
       *
       * @private
       */
      uri() {
        const schema = this.opts.secure ? "https" : "http";
        const query = this.query || {};
        if (false !== this.opts.timestampRequests) {
          query[this.opts.timestampParam] = (0, util_js_1.randomString)();
        }
        if (!this.supportsBinary && !query.sid) {
          query.b64 = 1;
        }
        return this.createUri(schema, query);
      }
    };
    exports2.Polling = Polling;
  }
});

// node_modules/engine.io-client/build/cjs/contrib/has-cors.js
var require_has_cors = __commonJS({
  "node_modules/engine.io-client/build/cjs/contrib/has-cors.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.hasCORS = void 0;
    var value = false;
    try {
      value = typeof XMLHttpRequest !== "undefined" && "withCredentials" in new XMLHttpRequest();
    } catch (err) {
    }
    exports2.hasCORS = value;
  }
});

// node_modules/engine.io-client/build/cjs/transports/polling-xhr.js
var require_polling_xhr = __commonJS({
  "node_modules/engine.io-client/build/cjs/transports/polling-xhr.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.XHR = exports2.Request = exports2.BaseXHR = void 0;
    var polling_js_1 = require_polling();
    var component_emitter_1 = require_cjs2();
    var util_js_1 = require_util();
    var globals_node_js_1 = require_globals_node();
    var has_cors_js_1 = require_has_cors();
    var debug_1 = __importDefault(require_src());
    var debug = (0, debug_1.default)("engine.io-client:polling");
    function empty() {
    }
    var BaseXHR = class extends polling_js_1.Polling {
      /**
       * XHR Polling constructor.
       *
       * @param {Object} opts
       * @package
       */
      constructor(opts) {
        super(opts);
        if (typeof location !== "undefined") {
          const isSSL = "https:" === location.protocol;
          let port = location.port;
          if (!port) {
            port = isSSL ? "443" : "80";
          }
          this.xd = typeof location !== "undefined" && opts.hostname !== location.hostname || port !== opts.port;
        }
      }
      /**
       * Sends data.
       *
       * @param {String} data to send.
       * @param {Function} called upon flush.
       * @private
       */
      doWrite(data, fn) {
        const req = this.request({
          method: "POST",
          data
        });
        req.on("success", fn);
        req.on("error", (xhrStatus, context) => {
          this.onError("xhr post error", xhrStatus, context);
        });
      }
      /**
       * Starts a poll cycle.
       *
       * @private
       */
      doPoll() {
        debug("xhr poll");
        const req = this.request();
        req.on("data", this.onData.bind(this));
        req.on("error", (xhrStatus, context) => {
          this.onError("xhr poll error", xhrStatus, context);
        });
        this.pollXhr = req;
      }
    };
    exports2.BaseXHR = BaseXHR;
    var Request = class _Request extends component_emitter_1.Emitter {
      /**
       * Request constructor
       *
       * @param {Object} options
       * @package
       */
      constructor(createRequest, uri, opts) {
        super();
        this.createRequest = createRequest;
        (0, util_js_1.installTimerFunctions)(this, opts);
        this._opts = opts;
        this._method = opts.method || "GET";
        this._uri = uri;
        this._data = void 0 !== opts.data ? opts.data : null;
        this._create();
      }
      /**
       * Creates the XHR object and sends the request.
       *
       * @private
       */
      _create() {
        var _a;
        const opts = (0, util_js_1.pick)(this._opts, "agent", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "autoUnref");
        opts.xdomain = !!this._opts.xd;
        const xhr = this._xhr = this.createRequest(opts);
        try {
          debug("xhr open %s: %s", this._method, this._uri);
          xhr.open(this._method, this._uri, true);
          try {
            if (this._opts.extraHeaders) {
              xhr.setDisableHeaderCheck && xhr.setDisableHeaderCheck(true);
              for (let i in this._opts.extraHeaders) {
                if (this._opts.extraHeaders.hasOwnProperty(i)) {
                  xhr.setRequestHeader(i, this._opts.extraHeaders[i]);
                }
              }
            }
          } catch (e) {
          }
          if ("POST" === this._method) {
            try {
              xhr.setRequestHeader("Content-type", "text/plain;charset=UTF-8");
            } catch (e) {
            }
          }
          try {
            xhr.setRequestHeader("Accept", "*/*");
          } catch (e) {
          }
          (_a = this._opts.cookieJar) === null || _a === void 0 ? void 0 : _a.addCookies(xhr);
          if ("withCredentials" in xhr) {
            xhr.withCredentials = this._opts.withCredentials;
          }
          if (this._opts.requestTimeout) {
            xhr.timeout = this._opts.requestTimeout;
          }
          xhr.onreadystatechange = () => {
            var _a2;
            if (xhr.readyState === 3) {
              (_a2 = this._opts.cookieJar) === null || _a2 === void 0 ? void 0 : _a2.parseCookies(
                // @ts-ignore
                xhr.getResponseHeader("set-cookie")
              );
            }
            if (4 !== xhr.readyState)
              return;
            if (200 === xhr.status || 1223 === xhr.status) {
              this._onLoad();
            } else {
              this.setTimeoutFn(() => {
                this._onError(typeof xhr.status === "number" ? xhr.status : 0);
              }, 0);
            }
          };
          debug("xhr data %s", this._data);
          xhr.send(this._data);
        } catch (e) {
          this.setTimeoutFn(() => {
            this._onError(e);
          }, 0);
          return;
        }
        if (typeof document !== "undefined") {
          this._index = _Request.requestsCount++;
          _Request.requests[this._index] = this;
        }
      }
      /**
       * Called upon error.
       *
       * @private
       */
      _onError(err) {
        this.emitReserved("error", err, this._xhr);
        this._cleanup(true);
      }
      /**
       * Cleans up house.
       *
       * @private
       */
      _cleanup(fromError) {
        if ("undefined" === typeof this._xhr || null === this._xhr) {
          return;
        }
        this._xhr.onreadystatechange = empty;
        if (fromError) {
          try {
            this._xhr.abort();
          } catch (e) {
          }
        }
        if (typeof document !== "undefined") {
          delete _Request.requests[this._index];
        }
        this._xhr = null;
      }
      /**
       * Called upon load.
       *
       * @private
       */
      _onLoad() {
        const data = this._xhr.responseText;
        if (data !== null) {
          this.emitReserved("data", data);
          this.emitReserved("success");
          this._cleanup();
        }
      }
      /**
       * Aborts the request.
       *
       * @package
       */
      abort() {
        this._cleanup();
      }
    };
    exports2.Request = Request;
    Request.requestsCount = 0;
    Request.requests = {};
    if (typeof document !== "undefined") {
      if (typeof attachEvent === "function") {
        attachEvent("onunload", unloadHandler);
      } else if (typeof addEventListener === "function") {
        const terminationEvent = "onpagehide" in globals_node_js_1.globalThisShim ? "pagehide" : "unload";
        addEventListener(terminationEvent, unloadHandler, false);
      }
    }
    function unloadHandler() {
      for (let i in Request.requests) {
        if (Request.requests.hasOwnProperty(i)) {
          Request.requests[i].abort();
        }
      }
    }
    var hasXHR2 = (function() {
      const xhr = newRequest({
        xdomain: false
      });
      return xhr && xhr.responseType !== null;
    })();
    var XHR = class extends BaseXHR {
      constructor(opts) {
        super(opts);
        const forceBase64 = opts && opts.forceBase64;
        this.supportsBinary = hasXHR2 && !forceBase64;
      }
      request(opts = {}) {
        Object.assign(opts, { xd: this.xd }, this.opts);
        return new Request(newRequest, this.uri(), opts);
      }
    };
    exports2.XHR = XHR;
    function newRequest(opts) {
      const xdomain = opts.xdomain;
      try {
        if ("undefined" !== typeof XMLHttpRequest && (!xdomain || has_cors_js_1.hasCORS)) {
          return new XMLHttpRequest();
        }
      } catch (e) {
      }
      if (!xdomain) {
        try {
          return new globals_node_js_1.globalThisShim[["Active"].concat("Object").join("X")]("Microsoft.XMLHTTP");
        } catch (e) {
        }
      }
    }
  }
});

// node_modules/engine.io-client/build/cjs/transports/polling-xhr.node.js
var require_polling_xhr_node = __commonJS({
  "node_modules/engine.io-client/build/cjs/transports/polling-xhr.node.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || function(mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.XHR = void 0;
    var XMLHttpRequestModule = __importStar(require_XMLHttpRequest());
    var polling_xhr_js_1 = require_polling_xhr();
    var XMLHttpRequest2 = XMLHttpRequestModule.default || XMLHttpRequestModule;
    var XHR = class extends polling_xhr_js_1.BaseXHR {
      request(opts = {}) {
        var _a;
        Object.assign(opts, { xd: this.xd, cookieJar: (_a = this.socket) === null || _a === void 0 ? void 0 : _a._cookieJar }, this.opts);
        return new polling_xhr_js_1.Request((opts2) => new XMLHttpRequest2(opts2), this.uri(), opts);
      }
    };
    exports2.XHR = XHR;
  }
});

// node_modules/ws/lib/constants.js
var require_constants = __commonJS({
  "node_modules/ws/lib/constants.js"(exports2, module2) {
    "use strict";
    var BINARY_TYPES = ["nodebuffer", "arraybuffer", "fragments"];
    var hasBlob = typeof Blob !== "undefined";
    if (hasBlob) BINARY_TYPES.push("blob");
    module2.exports = {
      BINARY_TYPES,
      EMPTY_BUFFER: Buffer.alloc(0),
      GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
      hasBlob,
      kForOnEventAttribute: /* @__PURE__ */ Symbol("kIsForOnEventAttribute"),
      kListener: /* @__PURE__ */ Symbol("kListener"),
      kStatusCode: /* @__PURE__ */ Symbol("status-code"),
      kWebSocket: /* @__PURE__ */ Symbol("websocket"),
      NOOP: () => {
      }
    };
  }
});

// node_modules/ws/lib/buffer-util.js
var require_buffer_util = __commonJS({
  "node_modules/ws/lib/buffer-util.js"(exports2, module2) {
    "use strict";
    var { EMPTY_BUFFER } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    function concat(list, totalLength) {
      if (list.length === 0) return EMPTY_BUFFER;
      if (list.length === 1) return list[0];
      const target = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (let i = 0; i < list.length; i++) {
        const buf = list[i];
        target.set(buf, offset);
        offset += buf.length;
      }
      if (offset < totalLength) {
        return new FastBuffer(target.buffer, target.byteOffset, offset);
      }
      return target;
    }
    function _mask(source, mask, output, offset, length) {
      for (let i = 0; i < length; i++) {
        output[offset + i] = source[i] ^ mask[i & 3];
      }
    }
    function _unmask(buffer, mask) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] ^= mask[i & 3];
      }
    }
    function toArrayBuffer(buf) {
      if (buf.length === buf.buffer.byteLength) {
        return buf.buffer;
      }
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
    }
    function toBuffer(data) {
      toBuffer.readOnly = true;
      if (Buffer.isBuffer(data)) return data;
      let buf;
      if (data instanceof ArrayBuffer) {
        buf = new FastBuffer(data);
      } else if (ArrayBuffer.isView(data)) {
        buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
      } else {
        buf = Buffer.from(data);
        toBuffer.readOnly = false;
      }
      return buf;
    }
    module2.exports = {
      concat,
      mask: _mask,
      toArrayBuffer,
      toBuffer,
      unmask: _unmask
    };
    if (!process.env.WS_NO_BUFFER_UTIL) {
      try {
        const bufferUtil = require("bufferutil");
        module2.exports.mask = function(source, mask, output, offset, length) {
          if (length < 48) _mask(source, mask, output, offset, length);
          else bufferUtil.mask(source, mask, output, offset, length);
        };
        module2.exports.unmask = function(buffer, mask) {
          if (buffer.length < 32) _unmask(buffer, mask);
          else bufferUtil.unmask(buffer, mask);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/limiter.js
var require_limiter = __commonJS({
  "node_modules/ws/lib/limiter.js"(exports2, module2) {
    "use strict";
    var kDone = /* @__PURE__ */ Symbol("kDone");
    var kRun = /* @__PURE__ */ Symbol("kRun");
    var Limiter = class {
      /**
       * Creates a new `Limiter`.
       *
       * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
       *     to run concurrently
       */
      constructor(concurrency) {
        this[kDone] = () => {
          this.pending--;
          this[kRun]();
        };
        this.concurrency = concurrency || Infinity;
        this.jobs = [];
        this.pending = 0;
      }
      /**
       * Adds a job to the queue.
       *
       * @param {Function} job The job to run
       * @public
       */
      add(job) {
        this.jobs.push(job);
        this[kRun]();
      }
      /**
       * Removes a job from the queue and runs it if possible.
       *
       * @private
       */
      [kRun]() {
        if (this.pending === this.concurrency) return;
        if (this.jobs.length) {
          const job = this.jobs.shift();
          this.pending++;
          job(this[kDone]);
        }
      }
    };
    module2.exports = Limiter;
  }
});

// node_modules/ws/lib/permessage-deflate.js
var require_permessage_deflate = __commonJS({
  "node_modules/ws/lib/permessage-deflate.js"(exports2, module2) {
    "use strict";
    var zlib = require("zlib");
    var bufferUtil = require_buffer_util();
    var Limiter = require_limiter();
    var { kStatusCode } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    var TRAILER = Buffer.from([0, 0, 255, 255]);
    var kPerMessageDeflate = /* @__PURE__ */ Symbol("permessage-deflate");
    var kTotalLength = /* @__PURE__ */ Symbol("total-length");
    var kCallback = /* @__PURE__ */ Symbol("callback");
    var kBuffers = /* @__PURE__ */ Symbol("buffers");
    var kError = /* @__PURE__ */ Symbol("error");
    var zlibLimiter;
    var PerMessageDeflate = class {
      /**
       * Creates a PerMessageDeflate instance.
       *
       * @param {Object} [options] Configuration options
       * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
       *     for, or request, a custom client window size
       * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
       *     acknowledge disabling of client context takeover
       * @param {Number} [options.concurrencyLimit=10] The number of concurrent
       *     calls to zlib
       * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
       *     use of a custom server window size
       * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
       *     disabling of server context takeover
       * @param {Number} [options.threshold=1024] Size (in bytes) below which
       *     messages should not be compressed if context takeover is disabled
       * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
       *     deflate
       * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
       *     inflate
       * @param {Boolean} [isServer=false] Create the instance in either server or
       *     client mode
       * @param {Number} [maxPayload=0] The maximum allowed message length
       */
      constructor(options, isServer, maxPayload) {
        this._maxPayload = maxPayload | 0;
        this._options = options || {};
        this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024;
        this._isServer = !!isServer;
        this._deflate = null;
        this._inflate = null;
        this.params = null;
        if (!zlibLimiter) {
          const concurrency = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
          zlibLimiter = new Limiter(concurrency);
        }
      }
      /**
       * @type {String}
       */
      static get extensionName() {
        return "permessage-deflate";
      }
      /**
       * Create an extension negotiation offer.
       *
       * @return {Object} Extension parameters
       * @public
       */
      offer() {
        const params = {};
        if (this._options.serverNoContextTakeover) {
          params.server_no_context_takeover = true;
        }
        if (this._options.clientNoContextTakeover) {
          params.client_no_context_takeover = true;
        }
        if (this._options.serverMaxWindowBits) {
          params.server_max_window_bits = this._options.serverMaxWindowBits;
        }
        if (this._options.clientMaxWindowBits) {
          params.client_max_window_bits = this._options.clientMaxWindowBits;
        } else if (this._options.clientMaxWindowBits == null) {
          params.client_max_window_bits = true;
        }
        return params;
      }
      /**
       * Accept an extension negotiation offer/response.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Object} Accepted configuration
       * @public
       */
      accept(configurations) {
        configurations = this.normalizeParams(configurations);
        this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
        return this.params;
      }
      /**
       * Releases all resources used by the extension.
       *
       * @public
       */
      cleanup() {
        if (this._inflate) {
          this._inflate.close();
          this._inflate = null;
        }
        if (this._deflate) {
          const callback = this._deflate[kCallback];
          this._deflate.close();
          this._deflate = null;
          if (callback) {
            callback(
              new Error(
                "The deflate stream was closed while data was being processed"
              )
            );
          }
        }
      }
      /**
       *  Accept an extension negotiation offer.
       *
       * @param {Array} offers The extension negotiation offers
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsServer(offers) {
        const opts = this._options;
        const accepted = offers.find((params) => {
          if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && !params.client_max_window_bits) {
            return false;
          }
          return true;
        });
        if (!accepted) {
          throw new Error("None of the extension offers can be accepted");
        }
        if (opts.serverNoContextTakeover) {
          accepted.server_no_context_takeover = true;
        }
        if (opts.clientNoContextTakeover) {
          accepted.client_no_context_takeover = true;
        }
        if (typeof opts.serverMaxWindowBits === "number") {
          accepted.server_max_window_bits = opts.serverMaxWindowBits;
        }
        if (typeof opts.clientMaxWindowBits === "number") {
          accepted.client_max_window_bits = opts.clientMaxWindowBits;
        } else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) {
          delete accepted.client_max_window_bits;
        }
        return accepted;
      }
      /**
       * Accept the extension negotiation response.
       *
       * @param {Array} response The extension negotiation response
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsClient(response) {
        const params = response[0];
        if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
          throw new Error('Unexpected parameter "client_no_context_takeover"');
        }
        if (!params.client_max_window_bits) {
          if (typeof this._options.clientMaxWindowBits === "number") {
            params.client_max_window_bits = this._options.clientMaxWindowBits;
          }
        } else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) {
          throw new Error(
            'Unexpected or invalid parameter "client_max_window_bits"'
          );
        }
        return params;
      }
      /**
       * Normalize parameters.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Array} The offers/response with normalized parameters
       * @private
       */
      normalizeParams(configurations) {
        configurations.forEach((params) => {
          Object.keys(params).forEach((key) => {
            let value = params[key];
            if (value.length > 1) {
              throw new Error(`Parameter "${key}" must have only a single value`);
            }
            value = value[0];
            if (key === "client_max_window_bits") {
              if (value !== true) {
                const num = +value;
                if (!Number.isInteger(num) || num < 8 || num > 15) {
                  throw new TypeError(
                    `Invalid value for parameter "${key}": ${value}`
                  );
                }
                value = num;
              } else if (!this._isServer) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else if (key === "server_max_window_bits") {
              const num = +value;
              if (!Number.isInteger(num) || num < 8 || num > 15) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
              value = num;
            } else if (key === "client_no_context_takeover" || key === "server_no_context_takeover") {
              if (value !== true) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else {
              throw new Error(`Unknown parameter "${key}"`);
            }
            params[key] = value;
          });
        });
        return configurations;
      }
      /**
       * Decompress data. Concurrency limited.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      decompress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._decompress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Compress data. Concurrency limited.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      compress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._compress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Decompress data.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _decompress(data, fin, callback) {
        const endpoint = this._isServer ? "client" : "server";
        if (!this._inflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._inflate = zlib.createInflateRaw({
            ...this._options.zlibInflateOptions,
            windowBits
          });
          this._inflate[kPerMessageDeflate] = this;
          this._inflate[kTotalLength] = 0;
          this._inflate[kBuffers] = [];
          this._inflate.on("error", inflateOnError);
          this._inflate.on("data", inflateOnData);
        }
        this._inflate[kCallback] = callback;
        this._inflate.write(data);
        if (fin) this._inflate.write(TRAILER);
        this._inflate.flush(() => {
          const err = this._inflate[kError];
          if (err) {
            this._inflate.close();
            this._inflate = null;
            callback(err);
            return;
          }
          const data2 = bufferUtil.concat(
            this._inflate[kBuffers],
            this._inflate[kTotalLength]
          );
          if (this._inflate._readableState.endEmitted) {
            this._inflate.close();
            this._inflate = null;
          } else {
            this._inflate[kTotalLength] = 0;
            this._inflate[kBuffers] = [];
            if (fin && this.params[`${endpoint}_no_context_takeover`]) {
              this._inflate.reset();
            }
          }
          callback(null, data2);
        });
      }
      /**
       * Compress data.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _compress(data, fin, callback) {
        const endpoint = this._isServer ? "server" : "client";
        if (!this._deflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._deflate = zlib.createDeflateRaw({
            ...this._options.zlibDeflateOptions,
            windowBits
          });
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          this._deflate.on("data", deflateOnData);
        }
        this._deflate[kCallback] = callback;
        this._deflate.write(data);
        this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
          if (!this._deflate) {
            return;
          }
          let data2 = bufferUtil.concat(
            this._deflate[kBuffers],
            this._deflate[kTotalLength]
          );
          if (fin) {
            data2 = new FastBuffer(data2.buffer, data2.byteOffset, data2.length - 4);
          }
          this._deflate[kCallback] = null;
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          if (fin && this.params[`${endpoint}_no_context_takeover`]) {
            this._deflate.reset();
          }
          callback(null, data2);
        });
      }
    };
    module2.exports = PerMessageDeflate;
    function deflateOnData(chunk) {
      this[kBuffers].push(chunk);
      this[kTotalLength] += chunk.length;
    }
    function inflateOnData(chunk) {
      this[kTotalLength] += chunk.length;
      if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
        this[kBuffers].push(chunk);
        return;
      }
      this[kError] = new RangeError("Max payload size exceeded");
      this[kError].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
      this[kError][kStatusCode] = 1009;
      this.removeListener("data", inflateOnData);
      this.reset();
    }
    function inflateOnError(err) {
      this[kPerMessageDeflate]._inflate = null;
      if (this[kError]) {
        this[kCallback](this[kError]);
        return;
      }
      err[kStatusCode] = 1007;
      this[kCallback](err);
    }
  }
});

// node_modules/ws/lib/validation.js
var require_validation = __commonJS({
  "node_modules/ws/lib/validation.js"(exports2, module2) {
    "use strict";
    var { isUtf8 } = require("buffer");
    var { hasBlob } = require_constants();
    var tokenChars = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 0 - 15
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 16 - 31
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      0,
      // 32 - 47
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      // 48 - 63
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 64 - 79
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      // 80 - 95
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 96 - 111
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      0
      // 112 - 127
    ];
    function isValidStatusCode(code) {
      return code >= 1e3 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3e3 && code <= 4999;
    }
    function _isValidUTF8(buf) {
      const len = buf.length;
      let i = 0;
      while (i < len) {
        if ((buf[i] & 128) === 0) {
          i++;
        } else if ((buf[i] & 224) === 192) {
          if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) {
            return false;
          }
          i += 2;
        } else if ((buf[i] & 240) === 224) {
          if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || // Overlong
          buf[i] === 237 && (buf[i + 1] & 224) === 160) {
            return false;
          }
          i += 3;
        } else if ((buf[i] & 248) === 240) {
          if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || // Overlong
          buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) {
            return false;
          }
          i += 4;
        } else {
          return false;
        }
      }
      return true;
    }
    function isBlob(value) {
      return hasBlob && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.type === "string" && typeof value.stream === "function" && (value[Symbol.toStringTag] === "Blob" || value[Symbol.toStringTag] === "File");
    }
    module2.exports = {
      isBlob,
      isValidStatusCode,
      isValidUTF8: _isValidUTF8,
      tokenChars
    };
    if (isUtf8) {
      module2.exports.isValidUTF8 = function(buf) {
        return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
      };
    } else if (!process.env.WS_NO_UTF_8_VALIDATE) {
      try {
        const isValidUTF8 = require("utf-8-validate");
        module2.exports.isValidUTF8 = function(buf) {
          return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
        };
      } catch (e) {
      }
    }
  }
});

// node_modules/ws/lib/receiver.js
var require_receiver = __commonJS({
  "node_modules/ws/lib/receiver.js"(exports2, module2) {
    "use strict";
    var { Writable } = require("stream");
    var PerMessageDeflate = require_permessage_deflate();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER,
      kStatusCode,
      kWebSocket
    } = require_constants();
    var { concat, toArrayBuffer, unmask } = require_buffer_util();
    var { isValidStatusCode, isValidUTF8 } = require_validation();
    var FastBuffer = Buffer[Symbol.species];
    var GET_INFO = 0;
    var GET_PAYLOAD_LENGTH_16 = 1;
    var GET_PAYLOAD_LENGTH_64 = 2;
    var GET_MASK = 3;
    var GET_DATA = 4;
    var INFLATING = 5;
    var DEFER_EVENT = 6;
    var Receiver = class extends Writable {
      /**
       * Creates a Receiver instance.
       *
       * @param {Object} [options] Options object
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {String} [options.binaryType=nodebuffer] The type for binary data
       * @param {Object} [options.extensions] An object containing the negotiated
       *     extensions
       * @param {Boolean} [options.isServer=false] Specifies whether to operate in
       *     client or server mode
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       */
      constructor(options = {}) {
        super();
        this._allowSynchronousEvents = options.allowSynchronousEvents !== void 0 ? options.allowSynchronousEvents : true;
        this._binaryType = options.binaryType || BINARY_TYPES[0];
        this._extensions = options.extensions || {};
        this._isServer = !!options.isServer;
        this._maxPayload = options.maxPayload | 0;
        this._skipUTF8Validation = !!options.skipUTF8Validation;
        this[kWebSocket] = void 0;
        this._bufferedBytes = 0;
        this._buffers = [];
        this._compressed = false;
        this._payloadLength = 0;
        this._mask = void 0;
        this._fragmented = 0;
        this._masked = false;
        this._fin = false;
        this._opcode = 0;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragments = [];
        this._errored = false;
        this._loop = false;
        this._state = GET_INFO;
      }
      /**
       * Implements `Writable.prototype._write()`.
       *
       * @param {Buffer} chunk The chunk of data to write
       * @param {String} encoding The character encoding of `chunk`
       * @param {Function} cb Callback
       * @private
       */
      _write(chunk, encoding, cb) {
        if (this._opcode === 8 && this._state == GET_INFO) return cb();
        this._bufferedBytes += chunk.length;
        this._buffers.push(chunk);
        this.startLoop(cb);
      }
      /**
       * Consumes `n` bytes from the buffered data.
       *
       * @param {Number} n The number of bytes to consume
       * @return {Buffer} The consumed bytes
       * @private
       */
      consume(n) {
        this._bufferedBytes -= n;
        if (n === this._buffers[0].length) return this._buffers.shift();
        if (n < this._buffers[0].length) {
          const buf = this._buffers[0];
          this._buffers[0] = new FastBuffer(
            buf.buffer,
            buf.byteOffset + n,
            buf.length - n
          );
          return new FastBuffer(buf.buffer, buf.byteOffset, n);
        }
        const dst = Buffer.allocUnsafe(n);
        do {
          const buf = this._buffers[0];
          const offset = dst.length - n;
          if (n >= buf.length) {
            dst.set(this._buffers.shift(), offset);
          } else {
            dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
            this._buffers[0] = new FastBuffer(
              buf.buffer,
              buf.byteOffset + n,
              buf.length - n
            );
          }
          n -= buf.length;
        } while (n > 0);
        return dst;
      }
      /**
       * Starts the parsing loop.
       *
       * @param {Function} cb Callback
       * @private
       */
      startLoop(cb) {
        this._loop = true;
        do {
          switch (this._state) {
            case GET_INFO:
              this.getInfo(cb);
              break;
            case GET_PAYLOAD_LENGTH_16:
              this.getPayloadLength16(cb);
              break;
            case GET_PAYLOAD_LENGTH_64:
              this.getPayloadLength64(cb);
              break;
            case GET_MASK:
              this.getMask();
              break;
            case GET_DATA:
              this.getData(cb);
              break;
            case INFLATING:
            case DEFER_EVENT:
              this._loop = false;
              return;
          }
        } while (this._loop);
        if (!this._errored) cb();
      }
      /**
       * Reads the first two bytes of a frame.
       *
       * @param {Function} cb Callback
       * @private
       */
      getInfo(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        const buf = this.consume(2);
        if ((buf[0] & 48) !== 0) {
          const error = this.createError(
            RangeError,
            "RSV2 and RSV3 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_2_3"
          );
          cb(error);
          return;
        }
        const compressed = (buf[0] & 64) === 64;
        if (compressed && !this._extensions[PerMessageDeflate.extensionName]) {
          const error = this.createError(
            RangeError,
            "RSV1 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_1"
          );
          cb(error);
          return;
        }
        this._fin = (buf[0] & 128) === 128;
        this._opcode = buf[0] & 15;
        this._payloadLength = buf[1] & 127;
        if (this._opcode === 0) {
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (!this._fragmented) {
            const error = this.createError(
              RangeError,
              "invalid opcode 0",
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._opcode = this._fragmented;
        } else if (this._opcode === 1 || this._opcode === 2) {
          if (this._fragmented) {
            const error = this.createError(
              RangeError,
              `invalid opcode ${this._opcode}`,
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._compressed = compressed;
        } else if (this._opcode > 7 && this._opcode < 11) {
          if (!this._fin) {
            const error = this.createError(
              RangeError,
              "FIN must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_FIN"
            );
            cb(error);
            return;
          }
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
            const error = this.createError(
              RangeError,
              `invalid payload length ${this._payloadLength}`,
              true,
              1002,
              "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
            );
            cb(error);
            return;
          }
        } else {
          const error = this.createError(
            RangeError,
            `invalid opcode ${this._opcode}`,
            true,
            1002,
            "WS_ERR_INVALID_OPCODE"
          );
          cb(error);
          return;
        }
        if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
        this._masked = (buf[1] & 128) === 128;
        if (this._isServer) {
          if (!this._masked) {
            const error = this.createError(
              RangeError,
              "MASK must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_MASK"
            );
            cb(error);
            return;
          }
        } else if (this._masked) {
          const error = this.createError(
            RangeError,
            "MASK must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_MASK"
          );
          cb(error);
          return;
        }
        if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
        else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
        else this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+16).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength16(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        this._payloadLength = this.consume(2).readUInt16BE(0);
        this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+64).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength64(cb) {
        if (this._bufferedBytes < 8) {
          this._loop = false;
          return;
        }
        const buf = this.consume(8);
        const num = buf.readUInt32BE(0);
        if (num > Math.pow(2, 53 - 32) - 1) {
          const error = this.createError(
            RangeError,
            "Unsupported WebSocket frame: payload length > 2^53 - 1",
            false,
            1009,
            "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH"
          );
          cb(error);
          return;
        }
        this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
        this.haveLength(cb);
      }
      /**
       * Payload length has been read.
       *
       * @param {Function} cb Callback
       * @private
       */
      haveLength(cb) {
        if (this._payloadLength && this._opcode < 8) {
          this._totalPayloadLength += this._payloadLength;
          if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
            const error = this.createError(
              RangeError,
              "Max payload size exceeded",
              false,
              1009,
              "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
            );
            cb(error);
            return;
          }
        }
        if (this._masked) this._state = GET_MASK;
        else this._state = GET_DATA;
      }
      /**
       * Reads mask bytes.
       *
       * @private
       */
      getMask() {
        if (this._bufferedBytes < 4) {
          this._loop = false;
          return;
        }
        this._mask = this.consume(4);
        this._state = GET_DATA;
      }
      /**
       * Reads data bytes.
       *
       * @param {Function} cb Callback
       * @private
       */
      getData(cb) {
        let data = EMPTY_BUFFER;
        if (this._payloadLength) {
          if (this._bufferedBytes < this._payloadLength) {
            this._loop = false;
            return;
          }
          data = this.consume(this._payloadLength);
          if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) {
            unmask(data, this._mask);
          }
        }
        if (this._opcode > 7) {
          this.controlMessage(data, cb);
          return;
        }
        if (this._compressed) {
          this._state = INFLATING;
          this.decompress(data, cb);
          return;
        }
        if (data.length) {
          this._messageLength = this._totalPayloadLength;
          this._fragments.push(data);
        }
        this.dataMessage(cb);
      }
      /**
       * Decompresses data.
       *
       * @param {Buffer} data Compressed data
       * @param {Function} cb Callback
       * @private
       */
      decompress(data, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
        perMessageDeflate.decompress(data, this._fin, (err, buf) => {
          if (err) return cb(err);
          if (buf.length) {
            this._messageLength += buf.length;
            if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
              const error = this.createError(
                RangeError,
                "Max payload size exceeded",
                false,
                1009,
                "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
              );
              cb(error);
              return;
            }
            this._fragments.push(buf);
          }
          this.dataMessage(cb);
          if (this._state === GET_INFO) this.startLoop(cb);
        });
      }
      /**
       * Handles a data message.
       *
       * @param {Function} cb Callback
       * @private
       */
      dataMessage(cb) {
        if (!this._fin) {
          this._state = GET_INFO;
          return;
        }
        const messageLength = this._messageLength;
        const fragments = this._fragments;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragmented = 0;
        this._fragments = [];
        if (this._opcode === 2) {
          let data;
          if (this._binaryType === "nodebuffer") {
            data = concat(fragments, messageLength);
          } else if (this._binaryType === "arraybuffer") {
            data = toArrayBuffer(concat(fragments, messageLength));
          } else if (this._binaryType === "blob") {
            data = new Blob(fragments);
          } else {
            data = fragments;
          }
          if (this._allowSynchronousEvents) {
            this.emit("message", data, true);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", data, true);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        } else {
          const buf = concat(fragments, messageLength);
          if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
            const error = this.createError(
              Error,
              "invalid UTF-8 sequence",
              true,
              1007,
              "WS_ERR_INVALID_UTF8"
            );
            cb(error);
            return;
          }
          if (this._state === INFLATING || this._allowSynchronousEvents) {
            this.emit("message", buf, false);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", buf, false);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        }
      }
      /**
       * Handles a control message.
       *
       * @param {Buffer} data Data to handle
       * @return {(Error|RangeError|undefined)} A possible error
       * @private
       */
      controlMessage(data, cb) {
        if (this._opcode === 8) {
          if (data.length === 0) {
            this._loop = false;
            this.emit("conclude", 1005, EMPTY_BUFFER);
            this.end();
          } else {
            const code = data.readUInt16BE(0);
            if (!isValidStatusCode(code)) {
              const error = this.createError(
                RangeError,
                `invalid status code ${code}`,
                true,
                1002,
                "WS_ERR_INVALID_CLOSE_CODE"
              );
              cb(error);
              return;
            }
            const buf = new FastBuffer(
              data.buffer,
              data.byteOffset + 2,
              data.length - 2
            );
            if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
              const error = this.createError(
                Error,
                "invalid UTF-8 sequence",
                true,
                1007,
                "WS_ERR_INVALID_UTF8"
              );
              cb(error);
              return;
            }
            this._loop = false;
            this.emit("conclude", code, buf);
            this.end();
          }
          this._state = GET_INFO;
          return;
        }
        if (this._allowSynchronousEvents) {
          this.emit(this._opcode === 9 ? "ping" : "pong", data);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit(this._opcode === 9 ? "ping" : "pong", data);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      }
      /**
       * Builds an error object.
       *
       * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
       * @param {String} message The error message
       * @param {Boolean} prefix Specifies whether or not to add a default prefix to
       *     `message`
       * @param {Number} statusCode The status code
       * @param {String} errorCode The exposed error code
       * @return {(Error|RangeError)} The error
       * @private
       */
      createError(ErrorCtor, message, prefix, statusCode, errorCode) {
        this._loop = false;
        this._errored = true;
        const err = new ErrorCtor(
          prefix ? `Invalid WebSocket frame: ${message}` : message
        );
        Error.captureStackTrace(err, this.createError);
        err.code = errorCode;
        err[kStatusCode] = statusCode;
        return err;
      }
    };
    module2.exports = Receiver;
  }
});

// node_modules/ws/lib/sender.js
var require_sender = __commonJS({
  "node_modules/ws/lib/sender.js"(exports2, module2) {
    "use strict";
    var { Duplex } = require("stream");
    var { randomFillSync } = require("crypto");
    var PerMessageDeflate = require_permessage_deflate();
    var { EMPTY_BUFFER, kWebSocket, NOOP } = require_constants();
    var { isBlob, isValidStatusCode } = require_validation();
    var { mask: applyMask, toBuffer } = require_buffer_util();
    var kByteLength = /* @__PURE__ */ Symbol("kByteLength");
    var maskBuffer = Buffer.alloc(4);
    var RANDOM_POOL_SIZE = 8 * 1024;
    var randomPool;
    var randomPoolPointer = RANDOM_POOL_SIZE;
    var DEFAULT = 0;
    var DEFLATING = 1;
    var GET_BLOB_DATA = 2;
    var Sender = class _Sender {
      /**
       * Creates a Sender instance.
       *
       * @param {Duplex} socket The connection socket
       * @param {Object} [extensions] An object containing the negotiated extensions
       * @param {Function} [generateMask] The function used to generate the masking
       *     key
       */
      constructor(socket, extensions, generateMask) {
        this._extensions = extensions || {};
        if (generateMask) {
          this._generateMask = generateMask;
          this._maskBuffer = Buffer.alloc(4);
        }
        this._socket = socket;
        this._firstFragment = true;
        this._compress = false;
        this._bufferedBytes = 0;
        this._queue = [];
        this._state = DEFAULT;
        this.onerror = NOOP;
        this[kWebSocket] = void 0;
      }
      /**
       * Frames a piece of data according to the HyBi WebSocket protocol.
       *
       * @param {(Buffer|String)} data The data to frame
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @return {(Buffer|String)[]} The framed data
       * @public
       */
      static frame(data, options) {
        let mask;
        let merge = false;
        let offset = 2;
        let skipMasking = false;
        if (options.mask) {
          mask = options.maskBuffer || maskBuffer;
          if (options.generateMask) {
            options.generateMask(mask);
          } else {
            if (randomPoolPointer === RANDOM_POOL_SIZE) {
              if (randomPool === void 0) {
                randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
              }
              randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
              randomPoolPointer = 0;
            }
            mask[0] = randomPool[randomPoolPointer++];
            mask[1] = randomPool[randomPoolPointer++];
            mask[2] = randomPool[randomPoolPointer++];
            mask[3] = randomPool[randomPoolPointer++];
          }
          skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
          offset = 6;
        }
        let dataLength;
        if (typeof data === "string") {
          if ((!options.mask || skipMasking) && options[kByteLength] !== void 0) {
            dataLength = options[kByteLength];
          } else {
            data = Buffer.from(data);
            dataLength = data.length;
          }
        } else {
          dataLength = data.length;
          merge = options.mask && options.readOnly && !skipMasking;
        }
        let payloadLength = dataLength;
        if (dataLength >= 65536) {
          offset += 8;
          payloadLength = 127;
        } else if (dataLength > 125) {
          offset += 2;
          payloadLength = 126;
        }
        const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
        target[0] = options.fin ? options.opcode | 128 : options.opcode;
        if (options.rsv1) target[0] |= 64;
        target[1] = payloadLength;
        if (payloadLength === 126) {
          target.writeUInt16BE(dataLength, 2);
        } else if (payloadLength === 127) {
          target[2] = target[3] = 0;
          target.writeUIntBE(dataLength, 4, 6);
        }
        if (!options.mask) return [target, data];
        target[1] |= 128;
        target[offset - 4] = mask[0];
        target[offset - 3] = mask[1];
        target[offset - 2] = mask[2];
        target[offset - 1] = mask[3];
        if (skipMasking) return [target, data];
        if (merge) {
          applyMask(data, mask, target, offset, dataLength);
          return [target];
        }
        applyMask(data, mask, data, 0, dataLength);
        return [target, data];
      }
      /**
       * Sends a close message to the other peer.
       *
       * @param {Number} [code] The status code component of the body
       * @param {(String|Buffer)} [data] The message component of the body
       * @param {Boolean} [mask=false] Specifies whether or not to mask the message
       * @param {Function} [cb] Callback
       * @public
       */
      close(code, data, mask, cb) {
        let buf;
        if (code === void 0) {
          buf = EMPTY_BUFFER;
        } else if (typeof code !== "number" || !isValidStatusCode(code)) {
          throw new TypeError("First argument must be a valid error code number");
        } else if (data === void 0 || !data.length) {
          buf = Buffer.allocUnsafe(2);
          buf.writeUInt16BE(code, 0);
        } else {
          const length = Buffer.byteLength(data);
          if (length > 123) {
            throw new RangeError("The message must not be greater than 123 bytes");
          }
          buf = Buffer.allocUnsafe(2 + length);
          buf.writeUInt16BE(code, 0);
          if (typeof data === "string") {
            buf.write(data, 2);
          } else {
            buf.set(data, 2);
          }
        }
        const options = {
          [kByteLength]: buf.length,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 8,
          readOnly: false,
          rsv1: false
        };
        if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, buf, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(buf, options), cb);
        }
      }
      /**
       * Sends a ping message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      ping(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 9,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a pong message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      pong(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 10,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a data message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Object} options Options object
       * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
       *     or text
       * @param {Boolean} [options.compress=false] Specifies whether or not to
       *     compress `data`
       * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Function} [cb] Callback
       * @public
       */
      send(data, options, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
        let opcode = options.binary ? 2 : 1;
        let rsv1 = options.compress;
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (this._firstFragment) {
          this._firstFragment = false;
          if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) {
            rsv1 = byteLength >= perMessageDeflate._threshold;
          }
          this._compress = rsv1;
        } else {
          rsv1 = false;
          opcode = 0;
        }
        if (options.fin) this._firstFragment = true;
        const opts = {
          [kByteLength]: byteLength,
          fin: options.fin,
          generateMask: this._generateMask,
          mask: options.mask,
          maskBuffer: this._maskBuffer,
          opcode,
          readOnly,
          rsv1
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
          } else {
            this.getBlobData(data, this._compress, opts, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, this._compress, opts, cb]);
        } else {
          this.dispatch(data, this._compress, opts, cb);
        }
      }
      /**
       * Gets the contents of a blob as binary data.
       *
       * @param {Blob} blob The blob
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     the data
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      getBlobData(blob, compress, options, cb) {
        this._bufferedBytes += options[kByteLength];
        this._state = GET_BLOB_DATA;
        blob.arrayBuffer().then((arrayBuffer) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while the blob was being read"
            );
            process.nextTick(callCallbacks, this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          const data = toBuffer(arrayBuffer);
          if (!compress) {
            this._state = DEFAULT;
            this.sendFrame(_Sender.frame(data, options), cb);
            this.dequeue();
          } else {
            this.dispatch(data, compress, options, cb);
          }
        }).catch((err) => {
          process.nextTick(onError, this, err, cb);
        });
      }
      /**
       * Dispatches a message.
       *
       * @param {(Buffer|String)} data The message to send
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     `data`
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      dispatch(data, compress, options, cb) {
        if (!compress) {
          this.sendFrame(_Sender.frame(data, options), cb);
          return;
        }
        const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
        this._bufferedBytes += options[kByteLength];
        this._state = DEFLATING;
        perMessageDeflate.compress(data, options.fin, (_, buf) => {
          if (this._socket.destroyed) {
            const err = new Error(
              "The socket was closed while data was being compressed"
            );
            callCallbacks(this, err, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          this._state = DEFAULT;
          options.readOnly = false;
          this.sendFrame(_Sender.frame(buf, options), cb);
          this.dequeue();
        });
      }
      /**
       * Executes queued send operations.
       *
       * @private
       */
      dequeue() {
        while (this._state === DEFAULT && this._queue.length) {
          const params = this._queue.shift();
          this._bufferedBytes -= params[3][kByteLength];
          Reflect.apply(params[0], this, params.slice(1));
        }
      }
      /**
       * Enqueues a send operation.
       *
       * @param {Array} params Send operation parameters.
       * @private
       */
      enqueue(params) {
        this._bufferedBytes += params[3][kByteLength];
        this._queue.push(params);
      }
      /**
       * Sends a frame.
       *
       * @param {(Buffer | String)[]} list The frame to send
       * @param {Function} [cb] Callback
       * @private
       */
      sendFrame(list, cb) {
        if (list.length === 2) {
          this._socket.cork();
          this._socket.write(list[0]);
          this._socket.write(list[1], cb);
          this._socket.uncork();
        } else {
          this._socket.write(list[0], cb);
        }
      }
    };
    module2.exports = Sender;
    function callCallbacks(sender, err, cb) {
      if (typeof cb === "function") cb(err);
      for (let i = 0; i < sender._queue.length; i++) {
        const params = sender._queue[i];
        const callback = params[params.length - 1];
        if (typeof callback === "function") callback(err);
      }
    }
    function onError(sender, err, cb) {
      callCallbacks(sender, err, cb);
      sender.onerror(err);
    }
  }
});

// node_modules/ws/lib/event-target.js
var require_event_target = __commonJS({
  "node_modules/ws/lib/event-target.js"(exports2, module2) {
    "use strict";
    var { kForOnEventAttribute, kListener } = require_constants();
    var kCode = /* @__PURE__ */ Symbol("kCode");
    var kData = /* @__PURE__ */ Symbol("kData");
    var kError = /* @__PURE__ */ Symbol("kError");
    var kMessage = /* @__PURE__ */ Symbol("kMessage");
    var kReason = /* @__PURE__ */ Symbol("kReason");
    var kTarget = /* @__PURE__ */ Symbol("kTarget");
    var kType = /* @__PURE__ */ Symbol("kType");
    var kWasClean = /* @__PURE__ */ Symbol("kWasClean");
    var Event = class {
      /**
       * Create a new `Event`.
       *
       * @param {String} type The name of the event
       * @throws {TypeError} If the `type` argument is not specified
       */
      constructor(type2) {
        this[kTarget] = null;
        this[kType] = type2;
      }
      /**
       * @type {*}
       */
      get target() {
        return this[kTarget];
      }
      /**
       * @type {String}
       */
      get type() {
        return this[kType];
      }
    };
    Object.defineProperty(Event.prototype, "target", { enumerable: true });
    Object.defineProperty(Event.prototype, "type", { enumerable: true });
    var CloseEvent = class extends Event {
      /**
       * Create a new `CloseEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {Number} [options.code=0] The status code explaining why the
       *     connection was closed
       * @param {String} [options.reason=''] A human-readable string explaining why
       *     the connection was closed
       * @param {Boolean} [options.wasClean=false] Indicates whether or not the
       *     connection was cleanly closed
       */
      constructor(type2, options = {}) {
        super(type2);
        this[kCode] = options.code === void 0 ? 0 : options.code;
        this[kReason] = options.reason === void 0 ? "" : options.reason;
        this[kWasClean] = options.wasClean === void 0 ? false : options.wasClean;
      }
      /**
       * @type {Number}
       */
      get code() {
        return this[kCode];
      }
      /**
       * @type {String}
       */
      get reason() {
        return this[kReason];
      }
      /**
       * @type {Boolean}
       */
      get wasClean() {
        return this[kWasClean];
      }
    };
    Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });
    var ErrorEvent = class extends Event {
      /**
       * Create a new `ErrorEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.error=null] The error that generated this event
       * @param {String} [options.message=''] The error message
       */
      constructor(type2, options = {}) {
        super(type2);
        this[kError] = options.error === void 0 ? null : options.error;
        this[kMessage] = options.message === void 0 ? "" : options.message;
      }
      /**
       * @type {*}
       */
      get error() {
        return this[kError];
      }
      /**
       * @type {String}
       */
      get message() {
        return this[kMessage];
      }
    };
    Object.defineProperty(ErrorEvent.prototype, "error", { enumerable: true });
    Object.defineProperty(ErrorEvent.prototype, "message", { enumerable: true });
    var MessageEvent = class extends Event {
      /**
       * Create a new `MessageEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.data=null] The message content
       */
      constructor(type2, options = {}) {
        super(type2);
        this[kData] = options.data === void 0 ? null : options.data;
      }
      /**
       * @type {*}
       */
      get data() {
        return this[kData];
      }
    };
    Object.defineProperty(MessageEvent.prototype, "data", { enumerable: true });
    var EventTarget = {
      /**
       * Register an event listener.
       *
       * @param {String} type A string representing the event type to listen for
       * @param {(Function|Object)} handler The listener to add
       * @param {Object} [options] An options object specifies characteristics about
       *     the event listener
       * @param {Boolean} [options.once=false] A `Boolean` indicating that the
       *     listener should be invoked at most once after being added. If `true`,
       *     the listener would be automatically removed when invoked.
       * @public
       */
      addEventListener(type2, handler, options = {}) {
        for (const listener of this.listeners(type2)) {
          if (!options[kForOnEventAttribute] && listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            return;
          }
        }
        let wrapper;
        if (type2 === "message") {
          wrapper = function onMessage(data, isBinary) {
            const event = new MessageEvent("message", {
              data: isBinary ? data : data.toString()
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type2 === "close") {
          wrapper = function onClose(code, message) {
            const event = new CloseEvent("close", {
              code,
              reason: message.toString(),
              wasClean: this._closeFrameReceived && this._closeFrameSent
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type2 === "error") {
          wrapper = function onError(error) {
            const event = new ErrorEvent("error", {
              error,
              message: error.message
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type2 === "open") {
          wrapper = function onOpen() {
            const event = new Event("open");
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else {
          return;
        }
        wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
        wrapper[kListener] = handler;
        if (options.once) {
          this.once(type2, wrapper);
        } else {
          this.on(type2, wrapper);
        }
      },
      /**
       * Remove an event listener.
       *
       * @param {String} type A string representing the event type to remove
       * @param {(Function|Object)} handler The listener to remove
       * @public
       */
      removeEventListener(type2, handler) {
        for (const listener of this.listeners(type2)) {
          if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            this.removeListener(type2, listener);
            break;
          }
        }
      }
    };
    module2.exports = {
      CloseEvent,
      ErrorEvent,
      Event,
      EventTarget,
      MessageEvent
    };
    function callListener(listener, thisArg, event) {
      if (typeof listener === "object" && listener.handleEvent) {
        listener.handleEvent.call(listener, event);
      } else {
        listener.call(thisArg, event);
      }
    }
  }
});

// node_modules/ws/lib/extension.js
var require_extension = __commonJS({
  "node_modules/ws/lib/extension.js"(exports2, module2) {
    "use strict";
    var { tokenChars } = require_validation();
    function push(dest, name, elem) {
      if (dest[name] === void 0) dest[name] = [elem];
      else dest[name].push(elem);
    }
    function parse(header) {
      const offers = /* @__PURE__ */ Object.create(null);
      let params = /* @__PURE__ */ Object.create(null);
      let mustUnescape = false;
      let isEscaping = false;
      let inQuotes = false;
      let extensionName;
      let paramName;
      let start = -1;
      let code = -1;
      let end = -1;
      let i = 0;
      for (; i < header.length; i++) {
        code = header.charCodeAt(i);
        if (extensionName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (i !== 0 && (code === 32 || code === 9)) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            const name = header.slice(start, end);
            if (code === 44) {
              push(offers, name, params);
              params = /* @__PURE__ */ Object.create(null);
            } else {
              extensionName = name;
            }
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else if (paramName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (code === 32 || code === 9) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            push(params, header.slice(start, end), true);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            start = end = -1;
          } else if (code === 61 && start !== -1 && end === -1) {
            paramName = header.slice(start, i);
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else {
          if (isEscaping) {
            if (tokenChars[code] !== 1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (start === -1) start = i;
            else if (!mustUnescape) mustUnescape = true;
            isEscaping = false;
          } else if (inQuotes) {
            if (tokenChars[code] === 1) {
              if (start === -1) start = i;
            } else if (code === 34 && start !== -1) {
              inQuotes = false;
              end = i;
            } else if (code === 92) {
              isEscaping = true;
            } else {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
          } else if (code === 34 && header.charCodeAt(i - 1) === 61) {
            inQuotes = true;
          } else if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (start !== -1 && (code === 32 || code === 9)) {
            if (end === -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i}`);
            }
            if (end === -1) end = i;
            let value = header.slice(start, end);
            if (mustUnescape) {
              value = value.replace(/\\/g, "");
              mustUnescape = false;
            }
            push(params, paramName, value);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            paramName = void 0;
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        }
      }
      if (start === -1 || inQuotes || code === 32 || code === 9) {
        throw new SyntaxError("Unexpected end of input");
      }
      if (end === -1) end = i;
      const token = header.slice(start, end);
      if (extensionName === void 0) {
        push(offers, token, params);
      } else {
        if (paramName === void 0) {
          push(params, token, true);
        } else if (mustUnescape) {
          push(params, paramName, token.replace(/\\/g, ""));
        } else {
          push(params, paramName, token);
        }
        push(offers, extensionName, params);
      }
      return offers;
    }
    function format(extensions) {
      return Object.keys(extensions).map((extension) => {
        let configurations = extensions[extension];
        if (!Array.isArray(configurations)) configurations = [configurations];
        return configurations.map((params) => {
          return [extension].concat(
            Object.keys(params).map((k) => {
              let values = params[k];
              if (!Array.isArray(values)) values = [values];
              return values.map((v) => v === true ? k : `${k}=${v}`).join("; ");
            })
          ).join("; ");
        }).join(", ");
      }).join(", ");
    }
    module2.exports = { format, parse };
  }
});

// node_modules/ws/lib/websocket.js
var require_websocket = __commonJS({
  "node_modules/ws/lib/websocket.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events");
    var https = require("https");
    var http = require("http");
    var net2 = require("net");
    var tls = require("tls");
    var { randomBytes, createHash } = require("crypto");
    var { Duplex, Readable } = require("stream");
    var { URL: URL2 } = require("url");
    var PerMessageDeflate = require_permessage_deflate();
    var Receiver = require_receiver();
    var Sender = require_sender();
    var { isBlob } = require_validation();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER,
      GUID,
      kForOnEventAttribute,
      kListener,
      kStatusCode,
      kWebSocket,
      NOOP
    } = require_constants();
    var {
      EventTarget: { addEventListener: addEventListener2, removeEventListener: removeEventListener2 }
    } = require_event_target();
    var { format, parse } = require_extension();
    var { toBuffer } = require_buffer_util();
    var closeTimeout = 30 * 1e3;
    var kAborted = /* @__PURE__ */ Symbol("kAborted");
    var protocolVersions = [8, 13];
    var readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
    var subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
    var WebSocket = class _WebSocket extends EventEmitter {
      /**
       * Create a new `WebSocket`.
       *
       * @param {(String|URL)} address The URL to which to connect
       * @param {(String|String[])} [protocols] The subprotocols
       * @param {Object} [options] Connection options
       */
      constructor(address, protocols, options) {
        super();
        this._binaryType = BINARY_TYPES[0];
        this._closeCode = 1006;
        this._closeFrameReceived = false;
        this._closeFrameSent = false;
        this._closeMessage = EMPTY_BUFFER;
        this._closeTimer = null;
        this._errorEmitted = false;
        this._extensions = {};
        this._paused = false;
        this._protocol = "";
        this._readyState = _WebSocket.CONNECTING;
        this._receiver = null;
        this._sender = null;
        this._socket = null;
        if (address !== null) {
          this._bufferedAmount = 0;
          this._isServer = false;
          this._redirects = 0;
          if (protocols === void 0) {
            protocols = [];
          } else if (!Array.isArray(protocols)) {
            if (typeof protocols === "object" && protocols !== null) {
              options = protocols;
              protocols = [];
            } else {
              protocols = [protocols];
            }
          }
          initAsClient(this, address, protocols, options);
        } else {
          this._autoPong = options.autoPong;
          this._isServer = true;
        }
      }
      /**
       * For historical reasons, the custom "nodebuffer" type is used by the default
       * instead of "blob".
       *
       * @type {String}
       */
      get binaryType() {
        return this._binaryType;
      }
      set binaryType(type2) {
        if (!BINARY_TYPES.includes(type2)) return;
        this._binaryType = type2;
        if (this._receiver) this._receiver._binaryType = type2;
      }
      /**
       * @type {Number}
       */
      get bufferedAmount() {
        if (!this._socket) return this._bufferedAmount;
        return this._socket._writableState.length + this._sender._bufferedBytes;
      }
      /**
       * @type {String}
       */
      get extensions() {
        return Object.keys(this._extensions).join();
      }
      /**
       * @type {Boolean}
       */
      get isPaused() {
        return this._paused;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onclose() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onerror() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onopen() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onmessage() {
        return null;
      }
      /**
       * @type {String}
       */
      get protocol() {
        return this._protocol;
      }
      /**
       * @type {Number}
       */
      get readyState() {
        return this._readyState;
      }
      /**
       * @type {String}
       */
      get url() {
        return this._url;
      }
      /**
       * Set up the socket and the internal resources.
       *
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Object} options Options object
       * @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Number} [options.maxPayload=0] The maximum allowed message size
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @private
       */
      setSocket(socket, head, options) {
        const receiver = new Receiver({
          allowSynchronousEvents: options.allowSynchronousEvents,
          binaryType: this.binaryType,
          extensions: this._extensions,
          isServer: this._isServer,
          maxPayload: options.maxPayload,
          skipUTF8Validation: options.skipUTF8Validation
        });
        const sender = new Sender(socket, this._extensions, options.generateMask);
        this._receiver = receiver;
        this._sender = sender;
        this._socket = socket;
        receiver[kWebSocket] = this;
        sender[kWebSocket] = this;
        socket[kWebSocket] = this;
        receiver.on("conclude", receiverOnConclude);
        receiver.on("drain", receiverOnDrain);
        receiver.on("error", receiverOnError);
        receiver.on("message", receiverOnMessage);
        receiver.on("ping", receiverOnPing);
        receiver.on("pong", receiverOnPong);
        sender.onerror = senderOnError;
        if (socket.setTimeout) socket.setTimeout(0);
        if (socket.setNoDelay) socket.setNoDelay();
        if (head.length > 0) socket.unshift(head);
        socket.on("close", socketOnClose);
        socket.on("data", socketOnData);
        socket.on("end", socketOnEnd);
        socket.on("error", socketOnError);
        this._readyState = _WebSocket.OPEN;
        this.emit("open");
      }
      /**
       * Emit the `'close'` event.
       *
       * @private
       */
      emitClose() {
        if (!this._socket) {
          this._readyState = _WebSocket.CLOSED;
          this.emit("close", this._closeCode, this._closeMessage);
          return;
        }
        if (this._extensions[PerMessageDeflate.extensionName]) {
          this._extensions[PerMessageDeflate.extensionName].cleanup();
        }
        this._receiver.removeAllListeners();
        this._readyState = _WebSocket.CLOSED;
        this.emit("close", this._closeCode, this._closeMessage);
      }
      /**
       * Start a closing handshake.
       *
       *          +----------+   +-----------+   +----------+
       *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
       *    |     +----------+   +-----------+   +----------+     |
       *          +----------+   +-----------+         |
       * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
       *          +----------+   +-----------+   |
       *    |           |                        |   +---+        |
       *                +------------------------+-->|fin| - - - -
       *    |         +---+                      |   +---+
       *     - - - - -|fin|<---------------------+
       *              +---+
       *
       * @param {Number} [code] Status code explaining why the connection is closing
       * @param {(String|Buffer)} [data] The reason why the connection is
       *     closing
       * @public
       */
      close(code, data) {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this.readyState === _WebSocket.CLOSING) {
          if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) {
            this._socket.end();
          }
          return;
        }
        this._readyState = _WebSocket.CLOSING;
        this._sender.close(code, data, !this._isServer, (err) => {
          if (err) return;
          this._closeFrameSent = true;
          if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) {
            this._socket.end();
          }
        });
        setCloseTimer(this);
      }
      /**
       * Pause the socket.
       *
       * @public
       */
      pause() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = true;
        this._socket.pause();
      }
      /**
       * Send a ping.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the ping is sent
       * @public
       */
      ping(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.ping(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Send a pong.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the pong is sent
       * @public
       */
      pong(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.pong(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Resume the socket.
       *
       * @public
       */
      resume() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = false;
        if (!this._receiver._writableState.needDrain) this._socket.resume();
      }
      /**
       * Send a data message.
       *
       * @param {*} data The message to send
       * @param {Object} [options] Options object
       * @param {Boolean} [options.binary] Specifies whether `data` is binary or
       *     text
       * @param {Boolean} [options.compress] Specifies whether or not to compress
       *     `data`
       * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when data is written out
       * @public
       */
      send(data, options, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof options === "function") {
          cb = options;
          options = {};
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        const opts = {
          binary: typeof data !== "string",
          mask: !this._isServer,
          compress: true,
          fin: true,
          ...options
        };
        if (!this._extensions[PerMessageDeflate.extensionName]) {
          opts.compress = false;
        }
        this._sender.send(data || EMPTY_BUFFER, opts, cb);
      }
      /**
       * Forcibly close the connection.
       *
       * @public
       */
      terminate() {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this._socket) {
          this._readyState = _WebSocket.CLOSING;
          this._socket.destroy();
        }
      }
    };
    Object.defineProperty(WebSocket, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket.prototype, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket.prototype, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket.prototype, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    Object.defineProperty(WebSocket.prototype, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    [
      "binaryType",
      "bufferedAmount",
      "extensions",
      "isPaused",
      "protocol",
      "readyState",
      "url"
    ].forEach((property) => {
      Object.defineProperty(WebSocket.prototype, property, { enumerable: true });
    });
    ["open", "error", "close", "message"].forEach((method) => {
      Object.defineProperty(WebSocket.prototype, `on${method}`, {
        enumerable: true,
        get() {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) return listener[kListener];
          }
          return null;
        },
        set(handler) {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) {
              this.removeListener(method, listener);
              break;
            }
          }
          if (typeof handler !== "function") return;
          this.addEventListener(method, handler, {
            [kForOnEventAttribute]: true
          });
        }
      });
    });
    WebSocket.prototype.addEventListener = addEventListener2;
    WebSocket.prototype.removeEventListener = removeEventListener2;
    module2.exports = WebSocket;
    function initAsClient(websocket, address, protocols, options) {
      const opts = {
        allowSynchronousEvents: true,
        autoPong: true,
        protocolVersion: protocolVersions[1],
        maxPayload: 100 * 1024 * 1024,
        skipUTF8Validation: false,
        perMessageDeflate: true,
        followRedirects: false,
        maxRedirects: 10,
        ...options,
        socketPath: void 0,
        hostname: void 0,
        protocol: void 0,
        timeout: void 0,
        method: "GET",
        host: void 0,
        path: void 0,
        port: void 0
      };
      websocket._autoPong = opts.autoPong;
      if (!protocolVersions.includes(opts.protocolVersion)) {
        throw new RangeError(
          `Unsupported protocol version: ${opts.protocolVersion} (supported versions: ${protocolVersions.join(", ")})`
        );
      }
      let parsedUrl;
      if (address instanceof URL2) {
        parsedUrl = address;
      } else {
        try {
          parsedUrl = new URL2(address);
        } catch (e) {
          throw new SyntaxError(`Invalid URL: ${address}`);
        }
      }
      if (parsedUrl.protocol === "http:") {
        parsedUrl.protocol = "ws:";
      } else if (parsedUrl.protocol === "https:") {
        parsedUrl.protocol = "wss:";
      }
      websocket._url = parsedUrl.href;
      const isSecure = parsedUrl.protocol === "wss:";
      const isIpcUrl = parsedUrl.protocol === "ws+unix:";
      let invalidUrlMessage;
      if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
        invalidUrlMessage = `The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"`;
      } else if (isIpcUrl && !parsedUrl.pathname) {
        invalidUrlMessage = "The URL's pathname is empty";
      } else if (parsedUrl.hash) {
        invalidUrlMessage = "The URL contains a fragment identifier";
      }
      if (invalidUrlMessage) {
        const err = new SyntaxError(invalidUrlMessage);
        if (websocket._redirects === 0) {
          throw err;
        } else {
          emitErrorAndClose(websocket, err);
          return;
        }
      }
      const defaultPort = isSecure ? 443 : 80;
      const key = randomBytes(16).toString("base64");
      const request = isSecure ? https.request : http.request;
      const protocolSet = /* @__PURE__ */ new Set();
      let perMessageDeflate;
      opts.createConnection = opts.createConnection || (isSecure ? tlsConnect : netConnect);
      opts.defaultPort = opts.defaultPort || defaultPort;
      opts.port = parsedUrl.port || defaultPort;
      opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
      opts.headers = {
        ...opts.headers,
        "Sec-WebSocket-Version": opts.protocolVersion,
        "Sec-WebSocket-Key": key,
        Connection: "Upgrade",
        Upgrade: "websocket"
      };
      opts.path = parsedUrl.pathname + parsedUrl.search;
      opts.timeout = opts.handshakeTimeout;
      if (opts.perMessageDeflate) {
        perMessageDeflate = new PerMessageDeflate(
          opts.perMessageDeflate !== true ? opts.perMessageDeflate : {},
          false,
          opts.maxPayload
        );
        opts.headers["Sec-WebSocket-Extensions"] = format({
          [PerMessageDeflate.extensionName]: perMessageDeflate.offer()
        });
      }
      if (protocols.length) {
        for (const protocol of protocols) {
          if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) {
            throw new SyntaxError(
              "An invalid or duplicated subprotocol was specified"
            );
          }
          protocolSet.add(protocol);
        }
        opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
      }
      if (opts.origin) {
        if (opts.protocolVersion < 13) {
          opts.headers["Sec-WebSocket-Origin"] = opts.origin;
        } else {
          opts.headers.Origin = opts.origin;
        }
      }
      if (parsedUrl.username || parsedUrl.password) {
        opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
      }
      if (isIpcUrl) {
        const parts = opts.path.split(":");
        opts.socketPath = parts[0];
        opts.path = parts[1];
      }
      let req;
      if (opts.followRedirects) {
        if (websocket._redirects === 0) {
          websocket._originalIpc = isIpcUrl;
          websocket._originalSecure = isSecure;
          websocket._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
          const headers = options && options.headers;
          options = { ...options, headers: {} };
          if (headers) {
            for (const [key2, value] of Object.entries(headers)) {
              options.headers[key2.toLowerCase()] = value;
            }
          }
        } else if (websocket.listenerCount("redirect") === 0) {
          const isSameHost = isIpcUrl ? websocket._originalIpc ? opts.socketPath === websocket._originalHostOrSocketPath : false : websocket._originalIpc ? false : parsedUrl.host === websocket._originalHostOrSocketPath;
          if (!isSameHost || websocket._originalSecure && !isSecure) {
            delete opts.headers.authorization;
            delete opts.headers.cookie;
            if (!isSameHost) delete opts.headers.host;
            opts.auth = void 0;
          }
        }
        if (opts.auth && !options.headers.authorization) {
          options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
        }
        req = websocket._req = request(opts);
        if (websocket._redirects) {
          websocket.emit("redirect", websocket.url, req);
        }
      } else {
        req = websocket._req = request(opts);
      }
      if (opts.timeout) {
        req.on("timeout", () => {
          abortHandshake(websocket, req, "Opening handshake has timed out");
        });
      }
      req.on("error", (err) => {
        if (req === null || req[kAborted]) return;
        req = websocket._req = null;
        emitErrorAndClose(websocket, err);
      });
      req.on("response", (res) => {
        const location2 = res.headers.location;
        const statusCode = res.statusCode;
        if (location2 && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
          if (++websocket._redirects > opts.maxRedirects) {
            abortHandshake(websocket, req, "Maximum redirects exceeded");
            return;
          }
          req.abort();
          let addr;
          try {
            addr = new URL2(location2, address);
          } catch (e) {
            const err = new SyntaxError(`Invalid URL: ${location2}`);
            emitErrorAndClose(websocket, err);
            return;
          }
          initAsClient(websocket, addr, protocols, options);
        } else if (!websocket.emit("unexpected-response", req, res)) {
          abortHandshake(
            websocket,
            req,
            `Unexpected server response: ${res.statusCode}`
          );
        }
      });
      req.on("upgrade", (res, socket, head) => {
        websocket.emit("upgrade", res);
        if (websocket.readyState !== WebSocket.CONNECTING) return;
        req = websocket._req = null;
        const upgrade = res.headers.upgrade;
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          abortHandshake(websocket, socket, "Invalid Upgrade header");
          return;
        }
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        if (res.headers["sec-websocket-accept"] !== digest) {
          abortHandshake(websocket, socket, "Invalid Sec-WebSocket-Accept header");
          return;
        }
        const serverProt = res.headers["sec-websocket-protocol"];
        let protError;
        if (serverProt !== void 0) {
          if (!protocolSet.size) {
            protError = "Server sent a subprotocol but none was requested";
          } else if (!protocolSet.has(serverProt)) {
            protError = "Server sent an invalid subprotocol";
          }
        } else if (protocolSet.size) {
          protError = "Server sent no subprotocol";
        }
        if (protError) {
          abortHandshake(websocket, socket, protError);
          return;
        }
        if (serverProt) websocket._protocol = serverProt;
        const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
        if (secWebSocketExtensions !== void 0) {
          if (!perMessageDeflate) {
            const message = "Server sent a Sec-WebSocket-Extensions header but no extension was requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          let extensions;
          try {
            extensions = parse(secWebSocketExtensions);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          const extensionNames = Object.keys(extensions);
          if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate.extensionName) {
            const message = "Server indicated an extension that was not requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          try {
            perMessageDeflate.accept(extensions[PerMessageDeflate.extensionName]);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          websocket._extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
        }
        websocket.setSocket(socket, head, {
          allowSynchronousEvents: opts.allowSynchronousEvents,
          generateMask: opts.generateMask,
          maxPayload: opts.maxPayload,
          skipUTF8Validation: opts.skipUTF8Validation
        });
      });
      if (opts.finishRequest) {
        opts.finishRequest(req, websocket);
      } else {
        req.end();
      }
    }
    function emitErrorAndClose(websocket, err) {
      websocket._readyState = WebSocket.CLOSING;
      websocket._errorEmitted = true;
      websocket.emit("error", err);
      websocket.emitClose();
    }
    function netConnect(options) {
      options.path = options.socketPath;
      return net2.connect(options);
    }
    function tlsConnect(options) {
      options.path = void 0;
      if (!options.servername && options.servername !== "") {
        options.servername = net2.isIP(options.host) ? "" : options.host;
      }
      return tls.connect(options);
    }
    function abortHandshake(websocket, stream, message) {
      websocket._readyState = WebSocket.CLOSING;
      const err = new Error(message);
      Error.captureStackTrace(err, abortHandshake);
      if (stream.setHeader) {
        stream[kAborted] = true;
        stream.abort();
        if (stream.socket && !stream.socket.destroyed) {
          stream.socket.destroy();
        }
        process.nextTick(emitErrorAndClose, websocket, err);
      } else {
        stream.destroy(err);
        stream.once("error", websocket.emit.bind(websocket, "error"));
        stream.once("close", websocket.emitClose.bind(websocket));
      }
    }
    function sendAfterClose(websocket, data, cb) {
      if (data) {
        const length = isBlob(data) ? data.size : toBuffer(data).length;
        if (websocket._socket) websocket._sender._bufferedBytes += length;
        else websocket._bufferedAmount += length;
      }
      if (cb) {
        const err = new Error(
          `WebSocket is not open: readyState ${websocket.readyState} (${readyStates[websocket.readyState]})`
        );
        process.nextTick(cb, err);
      }
    }
    function receiverOnConclude(code, reason) {
      const websocket = this[kWebSocket];
      websocket._closeFrameReceived = true;
      websocket._closeMessage = reason;
      websocket._closeCode = code;
      if (websocket._socket[kWebSocket] === void 0) return;
      websocket._socket.removeListener("data", socketOnData);
      process.nextTick(resume, websocket._socket);
      if (code === 1005) websocket.close();
      else websocket.close(code, reason);
    }
    function receiverOnDrain() {
      const websocket = this[kWebSocket];
      if (!websocket.isPaused) websocket._socket.resume();
    }
    function receiverOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket._socket[kWebSocket] !== void 0) {
        websocket._socket.removeListener("data", socketOnData);
        process.nextTick(resume, websocket._socket);
        websocket.close(err[kStatusCode]);
      }
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function receiverOnFinish() {
      this[kWebSocket].emitClose();
    }
    function receiverOnMessage(data, isBinary) {
      this[kWebSocket].emit("message", data, isBinary);
    }
    function receiverOnPing(data) {
      const websocket = this[kWebSocket];
      if (websocket._autoPong) websocket.pong(data, !this._isServer, NOOP);
      websocket.emit("ping", data);
    }
    function receiverOnPong(data) {
      this[kWebSocket].emit("pong", data);
    }
    function resume(stream) {
      stream.resume();
    }
    function senderOnError(err) {
      const websocket = this[kWebSocket];
      if (websocket.readyState === WebSocket.CLOSED) return;
      if (websocket.readyState === WebSocket.OPEN) {
        websocket._readyState = WebSocket.CLOSING;
        setCloseTimer(websocket);
      }
      this._socket.end();
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err);
      }
    }
    function setCloseTimer(websocket) {
      websocket._closeTimer = setTimeout(
        websocket._socket.destroy.bind(websocket._socket),
        closeTimeout
      );
    }
    function socketOnClose() {
      const websocket = this[kWebSocket];
      this.removeListener("close", socketOnClose);
      this.removeListener("data", socketOnData);
      this.removeListener("end", socketOnEnd);
      websocket._readyState = WebSocket.CLOSING;
      let chunk;
      if (!this._readableState.endEmitted && !websocket._closeFrameReceived && !websocket._receiver._writableState.errorEmitted && (chunk = websocket._socket.read()) !== null) {
        websocket._receiver.write(chunk);
      }
      websocket._receiver.end();
      this[kWebSocket] = void 0;
      clearTimeout(websocket._closeTimer);
      if (websocket._receiver._writableState.finished || websocket._receiver._writableState.errorEmitted) {
        websocket.emitClose();
      } else {
        websocket._receiver.on("error", receiverOnFinish);
        websocket._receiver.on("finish", receiverOnFinish);
      }
    }
    function socketOnData(chunk) {
      if (!this[kWebSocket]._receiver.write(chunk)) {
        this.pause();
      }
    }
    function socketOnEnd() {
      const websocket = this[kWebSocket];
      websocket._readyState = WebSocket.CLOSING;
      websocket._receiver.end();
      this.end();
    }
    function socketOnError() {
      const websocket = this[kWebSocket];
      this.removeListener("error", socketOnError);
      this.on("error", NOOP);
      if (websocket) {
        websocket._readyState = WebSocket.CLOSING;
        this.destroy();
      }
    }
  }
});

// node_modules/ws/lib/stream.js
var require_stream = __commonJS({
  "node_modules/ws/lib/stream.js"(exports2, module2) {
    "use strict";
    var WebSocket = require_websocket();
    var { Duplex } = require("stream");
    function emitClose(stream) {
      stream.emit("close");
    }
    function duplexOnEnd() {
      if (!this.destroyed && this._writableState.finished) {
        this.destroy();
      }
    }
    function duplexOnError(err) {
      this.removeListener("error", duplexOnError);
      this.destroy();
      if (this.listenerCount("error") === 0) {
        this.emit("error", err);
      }
    }
    function createWebSocketStream(ws, options) {
      let terminateOnDestroy = true;
      const duplex = new Duplex({
        ...options,
        autoDestroy: false,
        emitClose: false,
        objectMode: false,
        writableObjectMode: false
      });
      ws.on("message", function message(msg, isBinary) {
        const data = !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;
        if (!duplex.push(data)) ws.pause();
      });
      ws.once("error", function error(err) {
        if (duplex.destroyed) return;
        terminateOnDestroy = false;
        duplex.destroy(err);
      });
      ws.once("close", function close() {
        if (duplex.destroyed) return;
        duplex.push(null);
      });
      duplex._destroy = function(err, callback) {
        if (ws.readyState === ws.CLOSED) {
          callback(err);
          process.nextTick(emitClose, duplex);
          return;
        }
        let called = false;
        ws.once("error", function error(err2) {
          called = true;
          callback(err2);
        });
        ws.once("close", function close() {
          if (!called) callback(err);
          process.nextTick(emitClose, duplex);
        });
        if (terminateOnDestroy) ws.terminate();
      };
      duplex._final = function(callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._final(callback);
          });
          return;
        }
        if (ws._socket === null) return;
        if (ws._socket._writableState.finished) {
          callback();
          if (duplex._readableState.endEmitted) duplex.destroy();
        } else {
          ws._socket.once("finish", function finish() {
            callback();
          });
          ws.close();
        }
      };
      duplex._read = function() {
        if (ws.isPaused) ws.resume();
      };
      duplex._write = function(chunk, encoding, callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._write(chunk, encoding, callback);
          });
          return;
        }
        ws.send(chunk, callback);
      };
      duplex.on("end", duplexOnEnd);
      duplex.on("error", duplexOnError);
      return duplex;
    }
    module2.exports = createWebSocketStream;
  }
});

// node_modules/ws/lib/subprotocol.js
var require_subprotocol = __commonJS({
  "node_modules/ws/lib/subprotocol.js"(exports2, module2) {
    "use strict";
    var { tokenChars } = require_validation();
    function parse(header) {
      const protocols = /* @__PURE__ */ new Set();
      let start = -1;
      let end = -1;
      let i = 0;
      for (i; i < header.length; i++) {
        const code = header.charCodeAt(i);
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1) start = i;
        } else if (i !== 0 && (code === 32 || code === 9)) {
          if (end === -1 && start !== -1) end = i;
        } else if (code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1) end = i;
          const protocol2 = header.slice(start, end);
          if (protocols.has(protocol2)) {
            throw new SyntaxError(`The "${protocol2}" subprotocol is duplicated`);
          }
          protocols.add(protocol2);
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      }
      if (start === -1 || end !== -1) {
        throw new SyntaxError("Unexpected end of input");
      }
      const protocol = header.slice(start, i);
      if (protocols.has(protocol)) {
        throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
      }
      protocols.add(protocol);
      return protocols;
    }
    module2.exports = { parse };
  }
});

// node_modules/ws/lib/websocket-server.js
var require_websocket_server = __commonJS({
  "node_modules/ws/lib/websocket-server.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events");
    var http = require("http");
    var { Duplex } = require("stream");
    var { createHash } = require("crypto");
    var extension = require_extension();
    var PerMessageDeflate = require_permessage_deflate();
    var subprotocol = require_subprotocol();
    var WebSocket = require_websocket();
    var { GUID, kWebSocket } = require_constants();
    var keyRegex = /^[+/0-9A-Za-z]{22}==$/;
    var RUNNING = 0;
    var CLOSING = 1;
    var CLOSED = 2;
    var WebSocketServer = class extends EventEmitter {
      /**
       * Create a `WebSocketServer` instance.
       *
       * @param {Object} options Configuration options
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Boolean} [options.autoPong=true] Specifies whether or not to
       *     automatically send a pong in response to a ping
       * @param {Number} [options.backlog=511] The maximum length of the queue of
       *     pending connections
       * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
       *     track clients
       * @param {Function} [options.handleProtocols] A hook to handle protocols
       * @param {String} [options.host] The hostname where to bind the server
       * @param {Number} [options.maxPayload=104857600] The maximum allowed message
       *     size
       * @param {Boolean} [options.noServer=false] Enable no server mode
       * @param {String} [options.path] Accept only connections matching this path
       * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
       *     permessage-deflate
       * @param {Number} [options.port] The port where to bind the server
       * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
       *     server to use
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @param {Function} [options.verifyClient] A hook to reject connections
       * @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
       *     class to use. It must be the `WebSocket` class or class that extends it
       * @param {Function} [callback] A listener for the `listening` event
       */
      constructor(options, callback) {
        super();
        options = {
          allowSynchronousEvents: true,
          autoPong: true,
          maxPayload: 100 * 1024 * 1024,
          skipUTF8Validation: false,
          perMessageDeflate: false,
          handleProtocols: null,
          clientTracking: true,
          verifyClient: null,
          noServer: false,
          backlog: null,
          // use default (511 as implemented in net.js)
          server: null,
          host: null,
          path: null,
          port: null,
          WebSocket,
          ...options
        };
        if (options.port == null && !options.server && !options.noServer || options.port != null && (options.server || options.noServer) || options.server && options.noServer) {
          throw new TypeError(
            'One and only one of the "port", "server", or "noServer" options must be specified'
          );
        }
        if (options.port != null) {
          this._server = http.createServer((req, res) => {
            const body = http.STATUS_CODES[426];
            res.writeHead(426, {
              "Content-Length": body.length,
              "Content-Type": "text/plain"
            });
            res.end(body);
          });
          this._server.listen(
            options.port,
            options.host,
            options.backlog,
            callback
          );
        } else if (options.server) {
          this._server = options.server;
        }
        if (this._server) {
          const emitConnection = this.emit.bind(this, "connection");
          this._removeListeners = addListeners(this._server, {
            listening: this.emit.bind(this, "listening"),
            error: this.emit.bind(this, "error"),
            upgrade: (req, socket, head) => {
              this.handleUpgrade(req, socket, head, emitConnection);
            }
          });
        }
        if (options.perMessageDeflate === true) options.perMessageDeflate = {};
        if (options.clientTracking) {
          this.clients = /* @__PURE__ */ new Set();
          this._shouldEmitClose = false;
        }
        this.options = options;
        this._state = RUNNING;
      }
      /**
       * Returns the bound address, the address family name, and port of the server
       * as reported by the operating system if listening on an IP socket.
       * If the server is listening on a pipe or UNIX domain socket, the name is
       * returned as a string.
       *
       * @return {(Object|String|null)} The address of the server
       * @public
       */
      address() {
        if (this.options.noServer) {
          throw new Error('The server is operating in "noServer" mode');
        }
        if (!this._server) return null;
        return this._server.address();
      }
      /**
       * Stop the server from accepting new connections and emit the `'close'` event
       * when all existing connections are closed.
       *
       * @param {Function} [cb] A one-time listener for the `'close'` event
       * @public
       */
      close(cb) {
        if (this._state === CLOSED) {
          if (cb) {
            this.once("close", () => {
              cb(new Error("The server is not running"));
            });
          }
          process.nextTick(emitClose, this);
          return;
        }
        if (cb) this.once("close", cb);
        if (this._state === CLOSING) return;
        this._state = CLOSING;
        if (this.options.noServer || this.options.server) {
          if (this._server) {
            this._removeListeners();
            this._removeListeners = this._server = null;
          }
          if (this.clients) {
            if (!this.clients.size) {
              process.nextTick(emitClose, this);
            } else {
              this._shouldEmitClose = true;
            }
          } else {
            process.nextTick(emitClose, this);
          }
        } else {
          const server = this._server;
          this._removeListeners();
          this._removeListeners = this._server = null;
          server.close(() => {
            emitClose(this);
          });
        }
      }
      /**
       * See if a given request should be handled by this server instance.
       *
       * @param {http.IncomingMessage} req Request object to inspect
       * @return {Boolean} `true` if the request is valid, else `false`
       * @public
       */
      shouldHandle(req) {
        if (this.options.path) {
          const index = req.url.indexOf("?");
          const pathname = index !== -1 ? req.url.slice(0, index) : req.url;
          if (pathname !== this.options.path) return false;
        }
        return true;
      }
      /**
       * Handle a HTTP Upgrade request.
       *
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @public
       */
      handleUpgrade(req, socket, head, cb) {
        socket.on("error", socketOnError);
        const key = req.headers["sec-websocket-key"];
        const upgrade = req.headers.upgrade;
        const version = +req.headers["sec-websocket-version"];
        if (req.method !== "GET") {
          const message = "Invalid HTTP method";
          abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
          return;
        }
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          const message = "Invalid Upgrade header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (key === void 0 || !keyRegex.test(key)) {
          const message = "Missing or invalid Sec-WebSocket-Key header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (version !== 13 && version !== 8) {
          const message = "Missing or invalid Sec-WebSocket-Version header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message, {
            "Sec-WebSocket-Version": "13, 8"
          });
          return;
        }
        if (!this.shouldHandle(req)) {
          abortHandshake(socket, 400);
          return;
        }
        const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
        let protocols = /* @__PURE__ */ new Set();
        if (secWebSocketProtocol !== void 0) {
          try {
            protocols = subprotocol.parse(secWebSocketProtocol);
          } catch (err) {
            const message = "Invalid Sec-WebSocket-Protocol header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        const secWebSocketExtensions = req.headers["sec-websocket-extensions"];
        const extensions = {};
        if (this.options.perMessageDeflate && secWebSocketExtensions !== void 0) {
          const perMessageDeflate = new PerMessageDeflate(
            this.options.perMessageDeflate,
            true,
            this.options.maxPayload
          );
          try {
            const offers = extension.parse(secWebSocketExtensions);
            if (offers[PerMessageDeflate.extensionName]) {
              perMessageDeflate.accept(offers[PerMessageDeflate.extensionName]);
              extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
            }
          } catch (err) {
            const message = "Invalid or unacceptable Sec-WebSocket-Extensions header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        if (this.options.verifyClient) {
          const info = {
            origin: req.headers[`${version === 8 ? "sec-websocket-origin" : "origin"}`],
            secure: !!(req.socket.authorized || req.socket.encrypted),
            req
          };
          if (this.options.verifyClient.length === 2) {
            this.options.verifyClient(info, (verified, code, message, headers) => {
              if (!verified) {
                return abortHandshake(socket, code || 401, message, headers);
              }
              this.completeUpgrade(
                extensions,
                key,
                protocols,
                req,
                socket,
                head,
                cb
              );
            });
            return;
          }
          if (!this.options.verifyClient(info)) return abortHandshake(socket, 401);
        }
        this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
      }
      /**
       * Upgrade the connection to WebSocket.
       *
       * @param {Object} extensions The accepted extensions
       * @param {String} key The value of the `Sec-WebSocket-Key` header
       * @param {Set} protocols The subprotocols
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @throws {Error} If called more than once with the same socket
       * @private
       */
      completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
        if (!socket.readable || !socket.writable) return socket.destroy();
        if (socket[kWebSocket]) {
          throw new Error(
            "server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration"
          );
        }
        if (this._state > RUNNING) return abortHandshake(socket, 503);
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        const headers = [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${digest}`
        ];
        const ws = new this.options.WebSocket(null, void 0, this.options);
        if (protocols.size) {
          const protocol = this.options.handleProtocols ? this.options.handleProtocols(protocols, req) : protocols.values().next().value;
          if (protocol) {
            headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
            ws._protocol = protocol;
          }
        }
        if (extensions[PerMessageDeflate.extensionName]) {
          const params = extensions[PerMessageDeflate.extensionName].params;
          const value = extension.format({
            [PerMessageDeflate.extensionName]: [params]
          });
          headers.push(`Sec-WebSocket-Extensions: ${value}`);
          ws._extensions = extensions;
        }
        this.emit("headers", headers, req);
        socket.write(headers.concat("\r\n").join("\r\n"));
        socket.removeListener("error", socketOnError);
        ws.setSocket(socket, head, {
          allowSynchronousEvents: this.options.allowSynchronousEvents,
          maxPayload: this.options.maxPayload,
          skipUTF8Validation: this.options.skipUTF8Validation
        });
        if (this.clients) {
          this.clients.add(ws);
          ws.on("close", () => {
            this.clients.delete(ws);
            if (this._shouldEmitClose && !this.clients.size) {
              process.nextTick(emitClose, this);
            }
          });
        }
        cb(ws, req);
      }
    };
    module2.exports = WebSocketServer;
    function addListeners(server, map) {
      for (const event of Object.keys(map)) server.on(event, map[event]);
      return function removeListeners() {
        for (const event of Object.keys(map)) {
          server.removeListener(event, map[event]);
        }
      };
    }
    function emitClose(server) {
      server._state = CLOSED;
      server.emit("close");
    }
    function socketOnError() {
      this.destroy();
    }
    function abortHandshake(socket, code, message, headers) {
      message = message || http.STATUS_CODES[code];
      headers = {
        Connection: "close",
        "Content-Type": "text/html",
        "Content-Length": Buffer.byteLength(message),
        ...headers
      };
      socket.once("finish", socket.destroy);
      socket.end(
        `HTTP/1.1 ${code} ${http.STATUS_CODES[code]}\r
` + Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join("\r\n") + "\r\n\r\n" + message
      );
    }
    function abortHandshakeOrEmitwsClientError(server, req, socket, code, message, headers) {
      if (server.listenerCount("wsClientError")) {
        const err = new Error(message);
        Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);
        server.emit("wsClientError", err, socket, req);
      } else {
        abortHandshake(socket, code, message, headers);
      }
    }
  }
});

// node_modules/ws/index.js
var require_ws = __commonJS({
  "node_modules/ws/index.js"(exports2, module2) {
    "use strict";
    var WebSocket = require_websocket();
    WebSocket.createWebSocketStream = require_stream();
    WebSocket.Server = require_websocket_server();
    WebSocket.Receiver = require_receiver();
    WebSocket.Sender = require_sender();
    WebSocket.WebSocket = WebSocket;
    WebSocket.WebSocketServer = WebSocket.Server;
    module2.exports = WebSocket;
  }
});

// node_modules/engine.io-client/build/cjs/transports/websocket.js
var require_websocket2 = __commonJS({
  "node_modules/engine.io-client/build/cjs/transports/websocket.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.WS = exports2.BaseWS = void 0;
    var transport_js_1 = require_transport();
    var util_js_1 = require_util();
    var engine_io_parser_1 = require_cjs();
    var globals_node_js_1 = require_globals_node();
    var debug_1 = __importDefault(require_src());
    var debug = (0, debug_1.default)("engine.io-client:websocket");
    var isReactNative = typeof navigator !== "undefined" && typeof navigator.product === "string" && navigator.product.toLowerCase() === "reactnative";
    var BaseWS = class extends transport_js_1.Transport {
      get name() {
        return "websocket";
      }
      doOpen() {
        const uri = this.uri();
        const protocols = this.opts.protocols;
        const opts = isReactNative ? {} : (0, util_js_1.pick)(this.opts, "agent", "perMessageDeflate", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "localAddress", "protocolVersion", "origin", "maxPayload", "family", "checkServerIdentity");
        if (this.opts.extraHeaders) {
          opts.headers = this.opts.extraHeaders;
        }
        try {
          this.ws = this.createSocket(uri, protocols, opts);
        } catch (err) {
          return this.emitReserved("error", err);
        }
        this.ws.binaryType = this.socket.binaryType;
        this.addEventListeners();
      }
      /**
       * Adds event listeners to the socket
       *
       * @private
       */
      addEventListeners() {
        this.ws.onopen = () => {
          if (this.opts.autoUnref) {
            this.ws._socket.unref();
          }
          this.onOpen();
        };
        this.ws.onclose = (closeEvent) => this.onClose({
          description: "websocket connection closed",
          context: closeEvent
        });
        this.ws.onmessage = (ev) => this.onData(ev.data);
        this.ws.onerror = (e) => this.onError("websocket error", e);
      }
      write(packets) {
        this.writable = false;
        for (let i = 0; i < packets.length; i++) {
          const packet = packets[i];
          const lastPacket = i === packets.length - 1;
          (0, engine_io_parser_1.encodePacket)(packet, this.supportsBinary, (data) => {
            try {
              this.doWrite(packet, data);
            } catch (e) {
              debug("websocket closed before onclose event");
            }
            if (lastPacket) {
              (0, globals_node_js_1.nextTick)(() => {
                this.writable = true;
                this.emitReserved("drain");
              }, this.setTimeoutFn);
            }
          });
        }
      }
      doClose() {
        if (typeof this.ws !== "undefined") {
          this.ws.onerror = () => {
          };
          this.ws.close();
          this.ws = null;
        }
      }
      /**
       * Generates uri for connection.
       *
       * @private
       */
      uri() {
        const schema = this.opts.secure ? "wss" : "ws";
        const query = this.query || {};
        if (this.opts.timestampRequests) {
          query[this.opts.timestampParam] = (0, util_js_1.randomString)();
        }
        if (!this.supportsBinary) {
          query.b64 = 1;
        }
        return this.createUri(schema, query);
      }
    };
    exports2.BaseWS = BaseWS;
    var WebSocketCtor = globals_node_js_1.globalThisShim.WebSocket || globals_node_js_1.globalThisShim.MozWebSocket;
    var WS = class extends BaseWS {
      createSocket(uri, protocols, opts) {
        return !isReactNative ? protocols ? new WebSocketCtor(uri, protocols) : new WebSocketCtor(uri) : new WebSocketCtor(uri, protocols, opts);
      }
      doWrite(_packet, data) {
        this.ws.send(data);
      }
    };
    exports2.WS = WS;
  }
});

// node_modules/engine.io-client/build/cjs/transports/websocket.node.js
var require_websocket_node = __commonJS({
  "node_modules/engine.io-client/build/cjs/transports/websocket.node.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || function(mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.WS = void 0;
    var ws = __importStar(require_ws());
    var websocket_js_1 = require_websocket2();
    var WS = class extends websocket_js_1.BaseWS {
      createSocket(uri, protocols, opts) {
        var _a;
        if ((_a = this.socket) === null || _a === void 0 ? void 0 : _a._cookieJar) {
          opts.headers = opts.headers || {};
          opts.headers.cookie = typeof opts.headers.cookie === "string" ? [opts.headers.cookie] : opts.headers.cookie || [];
          for (const [name, cookie] of this.socket._cookieJar.cookies) {
            opts.headers.cookie.push(`${name}=${cookie.value}`);
          }
        }
        return new ws.WebSocket(uri, protocols, opts);
      }
      doWrite(packet, data) {
        const opts = {};
        if (packet.options) {
          opts.compress = packet.options.compress;
        }
        if (this.opts.perMessageDeflate) {
          const len = (
            // @ts-ignore
            "string" === typeof data ? Buffer.byteLength(data) : data.length
          );
          if (len < this.opts.perMessageDeflate.threshold) {
            opts.compress = false;
          }
        }
        this.ws.send(data, opts);
      }
    };
    exports2.WS = WS;
  }
});

// node_modules/engine.io-client/build/cjs/transports/webtransport.js
var require_webtransport = __commonJS({
  "node_modules/engine.io-client/build/cjs/transports/webtransport.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.WT = void 0;
    var transport_js_1 = require_transport();
    var globals_node_js_1 = require_globals_node();
    var engine_io_parser_1 = require_cjs();
    var debug_1 = __importDefault(require_src());
    var debug = (0, debug_1.default)("engine.io-client:webtransport");
    var WT = class extends transport_js_1.Transport {
      get name() {
        return "webtransport";
      }
      doOpen() {
        try {
          this._transport = new WebTransport(this.createUri("https"), this.opts.transportOptions[this.name]);
        } catch (err) {
          return this.emitReserved("error", err);
        }
        this._transport.closed.then(() => {
          debug("transport closed gracefully");
          this.onClose();
        }).catch((err) => {
          debug("transport closed due to %s", err);
          this.onError("webtransport error", err);
        });
        this._transport.ready.then(() => {
          this._transport.createBidirectionalStream().then((stream) => {
            const decoderStream = (0, engine_io_parser_1.createPacketDecoderStream)(Number.MAX_SAFE_INTEGER, this.socket.binaryType);
            const reader = stream.readable.pipeThrough(decoderStream).getReader();
            const encoderStream = (0, engine_io_parser_1.createPacketEncoderStream)();
            encoderStream.readable.pipeTo(stream.writable);
            this._writer = encoderStream.writable.getWriter();
            const read = () => {
              reader.read().then(({ done, value }) => {
                if (done) {
                  debug("session is closed");
                  return;
                }
                debug("received chunk: %o", value);
                this.onPacket(value);
                read();
              }).catch((err) => {
                debug("an error occurred while reading: %s", err);
              });
            };
            read();
            const packet = { type: "open" };
            if (this.query.sid) {
              packet.data = `{"sid":"${this.query.sid}"}`;
            }
            this._writer.write(packet).then(() => this.onOpen());
          });
        });
      }
      write(packets) {
        this.writable = false;
        for (let i = 0; i < packets.length; i++) {
          const packet = packets[i];
          const lastPacket = i === packets.length - 1;
          this._writer.write(packet).then(() => {
            if (lastPacket) {
              (0, globals_node_js_1.nextTick)(() => {
                this.writable = true;
                this.emitReserved("drain");
              }, this.setTimeoutFn);
            }
          });
        }
      }
      doClose() {
        var _a;
        (_a = this._transport) === null || _a === void 0 ? void 0 : _a.close();
      }
    };
    exports2.WT = WT;
  }
});

// node_modules/engine.io-client/build/cjs/transports/index.js
var require_transports = __commonJS({
  "node_modules/engine.io-client/build/cjs/transports/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.transports = void 0;
    var polling_xhr_node_js_1 = require_polling_xhr_node();
    var websocket_node_js_1 = require_websocket_node();
    var webtransport_js_1 = require_webtransport();
    exports2.transports = {
      websocket: websocket_node_js_1.WS,
      webtransport: webtransport_js_1.WT,
      polling: polling_xhr_node_js_1.XHR
    };
  }
});

// node_modules/engine.io-client/build/cjs/contrib/parseuri.js
var require_parseuri = __commonJS({
  "node_modules/engine.io-client/build/cjs/contrib/parseuri.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.parse = parse;
    var re = /^(?:(?![^:@\/?#]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@\/?#]*)(?::([^:@\/?#]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;
    var parts = [
      "source",
      "protocol",
      "authority",
      "userInfo",
      "user",
      "password",
      "host",
      "port",
      "relative",
      "path",
      "directory",
      "file",
      "query",
      "anchor"
    ];
    function parse(str) {
      if (str.length > 8e3) {
        throw "URI too long";
      }
      const src = str, b = str.indexOf("["), e = str.indexOf("]");
      if (b != -1 && e != -1) {
        str = str.substring(0, b) + str.substring(b, e).replace(/:/g, ";") + str.substring(e, str.length);
      }
      let m = re.exec(str || ""), uri = {}, i = 14;
      while (i--) {
        uri[parts[i]] = m[i] || "";
      }
      if (b != -1 && e != -1) {
        uri.source = src;
        uri.host = uri.host.substring(1, uri.host.length - 1).replace(/;/g, ":");
        uri.authority = uri.authority.replace("[", "").replace("]", "").replace(/;/g, ":");
        uri.ipv6uri = true;
      }
      uri.pathNames = pathNames(uri, uri["path"]);
      uri.queryKey = queryKey(uri, uri["query"]);
      return uri;
    }
    function pathNames(obj, path) {
      const regx = /\/{2,9}/g, names = path.replace(regx, "/").split("/");
      if (path.slice(0, 1) == "/" || path.length === 0) {
        names.splice(0, 1);
      }
      if (path.slice(-1) == "/") {
        names.splice(names.length - 1, 1);
      }
      return names;
    }
    function queryKey(uri, query) {
      const data = {};
      query.replace(/(?:^|&)([^&=]*)=?([^&]*)/g, function($0, $1, $2) {
        if ($1) {
          data[$1] = $2;
        }
      });
      return data;
    }
  }
});

// node_modules/engine.io-client/build/cjs/socket.js
var require_socket = __commonJS({
  "node_modules/engine.io-client/build/cjs/socket.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Socket = exports2.SocketWithUpgrade = exports2.SocketWithoutUpgrade = void 0;
    var index_js_1 = require_transports();
    var util_js_1 = require_util();
    var parseqs_js_1 = require_parseqs();
    var parseuri_js_1 = require_parseuri();
    var component_emitter_1 = require_cjs2();
    var engine_io_parser_1 = require_cjs();
    var globals_node_js_1 = require_globals_node();
    var debug_1 = __importDefault(require_src());
    var debug = (0, debug_1.default)("engine.io-client:socket");
    var withEventListeners = typeof addEventListener === "function" && typeof removeEventListener === "function";
    var OFFLINE_EVENT_LISTENERS = [];
    if (withEventListeners) {
      addEventListener("offline", () => {
        debug("closing %d connection(s) because the network was lost", OFFLINE_EVENT_LISTENERS.length);
        OFFLINE_EVENT_LISTENERS.forEach((listener) => listener());
      }, false);
    }
    var SocketWithoutUpgrade = class _SocketWithoutUpgrade extends component_emitter_1.Emitter {
      /**
       * Socket constructor.
       *
       * @param {String|Object} uri - uri or options
       * @param {Object} opts - options
       */
      constructor(uri, opts) {
        super();
        this.binaryType = globals_node_js_1.defaultBinaryType;
        this.writeBuffer = [];
        this._prevBufferLen = 0;
        this._pingInterval = -1;
        this._pingTimeout = -1;
        this._maxPayload = -1;
        this._pingTimeoutTime = Infinity;
        if (uri && "object" === typeof uri) {
          opts = uri;
          uri = null;
        }
        if (uri) {
          const parsedUri = (0, parseuri_js_1.parse)(uri);
          opts.hostname = parsedUri.host;
          opts.secure = parsedUri.protocol === "https" || parsedUri.protocol === "wss";
          opts.port = parsedUri.port;
          if (parsedUri.query)
            opts.query = parsedUri.query;
        } else if (opts.host) {
          opts.hostname = (0, parseuri_js_1.parse)(opts.host).host;
        }
        (0, util_js_1.installTimerFunctions)(this, opts);
        this.secure = null != opts.secure ? opts.secure : typeof location !== "undefined" && "https:" === location.protocol;
        if (opts.hostname && !opts.port) {
          opts.port = this.secure ? "443" : "80";
        }
        this.hostname = opts.hostname || (typeof location !== "undefined" ? location.hostname : "localhost");
        this.port = opts.port || (typeof location !== "undefined" && location.port ? location.port : this.secure ? "443" : "80");
        this.transports = [];
        this._transportsByName = {};
        opts.transports.forEach((t) => {
          const transportName = t.prototype.name;
          this.transports.push(transportName);
          this._transportsByName[transportName] = t;
        });
        this.opts = Object.assign({
          path: "/engine.io",
          agent: false,
          withCredentials: false,
          upgrade: true,
          timestampParam: "t",
          rememberUpgrade: false,
          addTrailingSlash: true,
          rejectUnauthorized: true,
          perMessageDeflate: {
            threshold: 1024
          },
          transportOptions: {},
          closeOnBeforeunload: false
        }, opts);
        this.opts.path = this.opts.path.replace(/\/$/, "") + (this.opts.addTrailingSlash ? "/" : "");
        if (typeof this.opts.query === "string") {
          this.opts.query = (0, parseqs_js_1.decode)(this.opts.query);
        }
        if (withEventListeners) {
          if (this.opts.closeOnBeforeunload) {
            this._beforeunloadEventListener = () => {
              if (this.transport) {
                this.transport.removeAllListeners();
                this.transport.close();
              }
            };
            addEventListener("beforeunload", this._beforeunloadEventListener, false);
          }
          if (this.hostname !== "localhost") {
            debug("adding listener for the 'offline' event");
            this._offlineEventListener = () => {
              this._onClose("transport close", {
                description: "network connection lost"
              });
            };
            OFFLINE_EVENT_LISTENERS.push(this._offlineEventListener);
          }
        }
        if (this.opts.withCredentials) {
          this._cookieJar = (0, globals_node_js_1.createCookieJar)();
        }
        this._open();
      }
      /**
       * Creates transport of the given type.
       *
       * @param {String} name - transport name
       * @return {Transport}
       * @private
       */
      createTransport(name) {
        debug('creating transport "%s"', name);
        const query = Object.assign({}, this.opts.query);
        query.EIO = engine_io_parser_1.protocol;
        query.transport = name;
        if (this.id)
          query.sid = this.id;
        const opts = Object.assign({}, this.opts, {
          query,
          socket: this,
          hostname: this.hostname,
          secure: this.secure,
          port: this.port
        }, this.opts.transportOptions[name]);
        debug("options: %j", opts);
        return new this._transportsByName[name](opts);
      }
      /**
       * Initializes transport to use and starts probe.
       *
       * @private
       */
      _open() {
        if (this.transports.length === 0) {
          this.setTimeoutFn(() => {
            this.emitReserved("error", "No transports available");
          }, 0);
          return;
        }
        const transportName = this.opts.rememberUpgrade && _SocketWithoutUpgrade.priorWebsocketSuccess && this.transports.indexOf("websocket") !== -1 ? "websocket" : this.transports[0];
        this.readyState = "opening";
        const transport = this.createTransport(transportName);
        transport.open();
        this.setTransport(transport);
      }
      /**
       * Sets the current transport. Disables the existing one (if any).
       *
       * @private
       */
      setTransport(transport) {
        debug("setting transport %s", transport.name);
        if (this.transport) {
          debug("clearing existing transport %s", this.transport.name);
          this.transport.removeAllListeners();
        }
        this.transport = transport;
        transport.on("drain", this._onDrain.bind(this)).on("packet", this._onPacket.bind(this)).on("error", this._onError.bind(this)).on("close", (reason) => this._onClose("transport close", reason));
      }
      /**
       * Called when connection is deemed open.
       *
       * @private
       */
      onOpen() {
        debug("socket open");
        this.readyState = "open";
        _SocketWithoutUpgrade.priorWebsocketSuccess = "websocket" === this.transport.name;
        this.emitReserved("open");
        this.flush();
      }
      /**
       * Handles a packet.
       *
       * @private
       */
      _onPacket(packet) {
        if ("opening" === this.readyState || "open" === this.readyState || "closing" === this.readyState) {
          debug('socket receive: type "%s", data "%s"', packet.type, packet.data);
          this.emitReserved("packet", packet);
          this.emitReserved("heartbeat");
          switch (packet.type) {
            case "open":
              this.onHandshake(JSON.parse(packet.data));
              break;
            case "ping":
              this._sendPacket("pong");
              this.emitReserved("ping");
              this.emitReserved("pong");
              this._resetPingTimeout();
              break;
            case "error":
              const err = new Error("server error");
              err.code = packet.data;
              this._onError(err);
              break;
            case "message":
              this.emitReserved("data", packet.data);
              this.emitReserved("message", packet.data);
              break;
          }
        } else {
          debug('packet received with socket readyState "%s"', this.readyState);
        }
      }
      /**
       * Called upon handshake completion.
       *
       * @param {Object} data - handshake obj
       * @private
       */
      onHandshake(data) {
        this.emitReserved("handshake", data);
        this.id = data.sid;
        this.transport.query.sid = data.sid;
        this._pingInterval = data.pingInterval;
        this._pingTimeout = data.pingTimeout;
        this._maxPayload = data.maxPayload;
        this.onOpen();
        if ("closed" === this.readyState)
          return;
        this._resetPingTimeout();
      }
      /**
       * Sets and resets ping timeout timer based on server pings.
       *
       * @private
       */
      _resetPingTimeout() {
        this.clearTimeoutFn(this._pingTimeoutTimer);
        const delay = this._pingInterval + this._pingTimeout;
        this._pingTimeoutTime = Date.now() + delay;
        this._pingTimeoutTimer = this.setTimeoutFn(() => {
          this._onClose("ping timeout");
        }, delay);
        if (this.opts.autoUnref) {
          this._pingTimeoutTimer.unref();
        }
      }
      /**
       * Called on `drain` event
       *
       * @private
       */
      _onDrain() {
        this.writeBuffer.splice(0, this._prevBufferLen);
        this._prevBufferLen = 0;
        if (0 === this.writeBuffer.length) {
          this.emitReserved("drain");
        } else {
          this.flush();
        }
      }
      /**
       * Flush write buffers.
       *
       * @private
       */
      flush() {
        if ("closed" !== this.readyState && this.transport.writable && !this.upgrading && this.writeBuffer.length) {
          const packets = this._getWritablePackets();
          debug("flushing %d packets in socket", packets.length);
          this.transport.send(packets);
          this._prevBufferLen = packets.length;
          this.emitReserved("flush");
        }
      }
      /**
       * Ensure the encoded size of the writeBuffer is below the maxPayload value sent by the server (only for HTTP
       * long-polling)
       *
       * @private
       */
      _getWritablePackets() {
        const shouldCheckPayloadSize = this._maxPayload && this.transport.name === "polling" && this.writeBuffer.length > 1;
        if (!shouldCheckPayloadSize) {
          return this.writeBuffer;
        }
        let payloadSize = 1;
        for (let i = 0; i < this.writeBuffer.length; i++) {
          const data = this.writeBuffer[i].data;
          if (data) {
            payloadSize += (0, util_js_1.byteLength)(data);
          }
          if (i > 0 && payloadSize > this._maxPayload) {
            debug("only send %d out of %d packets", i, this.writeBuffer.length);
            return this.writeBuffer.slice(0, i);
          }
          payloadSize += 2;
        }
        debug("payload size is %d (max: %d)", payloadSize, this._maxPayload);
        return this.writeBuffer;
      }
      /**
       * Checks whether the heartbeat timer has expired but the socket has not yet been notified.
       *
       * Note: this method is private for now because it does not really fit the WebSocket API, but if we put it in the
       * `write()` method then the message would not be buffered by the Socket.IO client.
       *
       * @return {boolean}
       * @private
       */
      /* private */
      _hasPingExpired() {
        if (!this._pingTimeoutTime)
          return true;
        const hasExpired = Date.now() > this._pingTimeoutTime;
        if (hasExpired) {
          debug("throttled timer detected, scheduling connection close");
          this._pingTimeoutTime = 0;
          (0, globals_node_js_1.nextTick)(() => {
            this._onClose("ping timeout");
          }, this.setTimeoutFn);
        }
        return hasExpired;
      }
      /**
       * Sends a message.
       *
       * @param {String} msg - message.
       * @param {Object} options.
       * @param {Function} fn - callback function.
       * @return {Socket} for chaining.
       */
      write(msg, options, fn) {
        this._sendPacket("message", msg, options, fn);
        return this;
      }
      /**
       * Sends a message. Alias of {@link Socket#write}.
       *
       * @param {String} msg - message.
       * @param {Object} options.
       * @param {Function} fn - callback function.
       * @return {Socket} for chaining.
       */
      send(msg, options, fn) {
        this._sendPacket("message", msg, options, fn);
        return this;
      }
      /**
       * Sends a packet.
       *
       * @param {String} type: packet type.
       * @param {String} data.
       * @param {Object} options.
       * @param {Function} fn - callback function.
       * @private
       */
      _sendPacket(type2, data, options, fn) {
        if ("function" === typeof data) {
          fn = data;
          data = void 0;
        }
        if ("function" === typeof options) {
          fn = options;
          options = null;
        }
        if ("closing" === this.readyState || "closed" === this.readyState) {
          return;
        }
        options = options || {};
        options.compress = false !== options.compress;
        const packet = {
          type: type2,
          data,
          options
        };
        this.emitReserved("packetCreate", packet);
        this.writeBuffer.push(packet);
        if (fn)
          this.once("flush", fn);
        this.flush();
      }
      /**
       * Closes the connection.
       */
      close() {
        const close = () => {
          this._onClose("forced close");
          debug("socket closing - telling transport to close");
          this.transport.close();
        };
        const cleanupAndClose = () => {
          this.off("upgrade", cleanupAndClose);
          this.off("upgradeError", cleanupAndClose);
          close();
        };
        const waitForUpgrade = () => {
          this.once("upgrade", cleanupAndClose);
          this.once("upgradeError", cleanupAndClose);
        };
        if ("opening" === this.readyState || "open" === this.readyState) {
          this.readyState = "closing";
          if (this.writeBuffer.length) {
            this.once("drain", () => {
              if (this.upgrading) {
                waitForUpgrade();
              } else {
                close();
              }
            });
          } else if (this.upgrading) {
            waitForUpgrade();
          } else {
            close();
          }
        }
        return this;
      }
      /**
       * Called upon transport error
       *
       * @private
       */
      _onError(err) {
        debug("socket error %j", err);
        _SocketWithoutUpgrade.priorWebsocketSuccess = false;
        if (this.opts.tryAllTransports && this.transports.length > 1 && this.readyState === "opening") {
          debug("trying next transport");
          this.transports.shift();
          return this._open();
        }
        this.emitReserved("error", err);
        this._onClose("transport error", err);
      }
      /**
       * Called upon transport close.
       *
       * @private
       */
      _onClose(reason, description) {
        if ("opening" === this.readyState || "open" === this.readyState || "closing" === this.readyState) {
          debug('socket close with reason: "%s"', reason);
          this.clearTimeoutFn(this._pingTimeoutTimer);
          this.transport.removeAllListeners("close");
          this.transport.close();
          this.transport.removeAllListeners();
          if (withEventListeners) {
            if (this._beforeunloadEventListener) {
              removeEventListener("beforeunload", this._beforeunloadEventListener, false);
            }
            if (this._offlineEventListener) {
              const i = OFFLINE_EVENT_LISTENERS.indexOf(this._offlineEventListener);
              if (i !== -1) {
                debug("removing listener for the 'offline' event");
                OFFLINE_EVENT_LISTENERS.splice(i, 1);
              }
            }
          }
          this.readyState = "closed";
          this.id = null;
          this.emitReserved("close", reason, description);
          this.writeBuffer = [];
          this._prevBufferLen = 0;
        }
      }
    };
    exports2.SocketWithoutUpgrade = SocketWithoutUpgrade;
    SocketWithoutUpgrade.protocol = engine_io_parser_1.protocol;
    var SocketWithUpgrade = class extends SocketWithoutUpgrade {
      constructor() {
        super(...arguments);
        this._upgrades = [];
      }
      onOpen() {
        super.onOpen();
        if ("open" === this.readyState && this.opts.upgrade) {
          debug("starting upgrade probes");
          for (let i = 0; i < this._upgrades.length; i++) {
            this._probe(this._upgrades[i]);
          }
        }
      }
      /**
       * Probes a transport.
       *
       * @param {String} name - transport name
       * @private
       */
      _probe(name) {
        debug('probing transport "%s"', name);
        let transport = this.createTransport(name);
        let failed = false;
        SocketWithoutUpgrade.priorWebsocketSuccess = false;
        const onTransportOpen = () => {
          if (failed)
            return;
          debug('probe transport "%s" opened', name);
          transport.send([{ type: "ping", data: "probe" }]);
          transport.once("packet", (msg) => {
            if (failed)
              return;
            if ("pong" === msg.type && "probe" === msg.data) {
              debug('probe transport "%s" pong', name);
              this.upgrading = true;
              this.emitReserved("upgrading", transport);
              if (!transport)
                return;
              SocketWithoutUpgrade.priorWebsocketSuccess = "websocket" === transport.name;
              debug('pausing current transport "%s"', this.transport.name);
              this.transport.pause(() => {
                if (failed)
                  return;
                if ("closed" === this.readyState)
                  return;
                debug("changing transport and sending upgrade packet");
                cleanup();
                this.setTransport(transport);
                transport.send([{ type: "upgrade" }]);
                this.emitReserved("upgrade", transport);
                transport = null;
                this.upgrading = false;
                this.flush();
              });
            } else {
              debug('probe transport "%s" failed', name);
              const err = new Error("probe error");
              err.transport = transport.name;
              this.emitReserved("upgradeError", err);
            }
          });
        };
        function freezeTransport() {
          if (failed)
            return;
          failed = true;
          cleanup();
          transport.close();
          transport = null;
        }
        const onerror = (err) => {
          const error = new Error("probe error: " + err);
          error.transport = transport.name;
          freezeTransport();
          debug('probe transport "%s" failed because of error: %s', name, err);
          this.emitReserved("upgradeError", error);
        };
        function onTransportClose() {
          onerror("transport closed");
        }
        function onclose() {
          onerror("socket closed");
        }
        function onupgrade(to) {
          if (transport && to.name !== transport.name) {
            debug('"%s" works - aborting "%s"', to.name, transport.name);
            freezeTransport();
          }
        }
        const cleanup = () => {
          transport.removeListener("open", onTransportOpen);
          transport.removeListener("error", onerror);
          transport.removeListener("close", onTransportClose);
          this.off("close", onclose);
          this.off("upgrading", onupgrade);
        };
        transport.once("open", onTransportOpen);
        transport.once("error", onerror);
        transport.once("close", onTransportClose);
        this.once("close", onclose);
        this.once("upgrading", onupgrade);
        if (this._upgrades.indexOf("webtransport") !== -1 && name !== "webtransport") {
          this.setTimeoutFn(() => {
            if (!failed) {
              transport.open();
            }
          }, 200);
        } else {
          transport.open();
        }
      }
      onHandshake(data) {
        this._upgrades = this._filterUpgrades(data.upgrades);
        super.onHandshake(data);
      }
      /**
       * Filters upgrades, returning only those matching client transports.
       *
       * @param {Array} upgrades - server upgrades
       * @private
       */
      _filterUpgrades(upgrades) {
        const filteredUpgrades = [];
        for (let i = 0; i < upgrades.length; i++) {
          if (~this.transports.indexOf(upgrades[i]))
            filteredUpgrades.push(upgrades[i]);
        }
        return filteredUpgrades;
      }
    };
    exports2.SocketWithUpgrade = SocketWithUpgrade;
    var Socket = class extends SocketWithUpgrade {
      constructor(uri, opts = {}) {
        const o = typeof uri === "object" ? uri : opts;
        if (!o.transports || o.transports && typeof o.transports[0] === "string") {
          o.transports = (o.transports || ["polling", "websocket", "webtransport"]).map((transportName) => index_js_1.transports[transportName]).filter((t) => !!t);
        }
        super(uri, o);
      }
    };
    exports2.Socket = Socket;
  }
});

// node_modules/engine.io-client/build/cjs/transports/polling-fetch.js
var require_polling_fetch = __commonJS({
  "node_modules/engine.io-client/build/cjs/transports/polling-fetch.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Fetch = void 0;
    var polling_js_1 = require_polling();
    var Fetch = class extends polling_js_1.Polling {
      doPoll() {
        this._fetch().then((res) => {
          if (!res.ok) {
            return this.onError("fetch read error", res.status, res);
          }
          res.text().then((data) => this.onData(data));
        }).catch((err) => {
          this.onError("fetch read error", err);
        });
      }
      doWrite(data, callback) {
        this._fetch(data).then((res) => {
          if (!res.ok) {
            return this.onError("fetch write error", res.status, res);
          }
          callback();
        }).catch((err) => {
          this.onError("fetch write error", err);
        });
      }
      _fetch(data) {
        var _a;
        const isPost = data !== void 0;
        const headers = new Headers(this.opts.extraHeaders);
        if (isPost) {
          headers.set("content-type", "text/plain;charset=UTF-8");
        }
        (_a = this.socket._cookieJar) === null || _a === void 0 ? void 0 : _a.appendCookies(headers);
        return fetch(this.uri(), {
          method: isPost ? "POST" : "GET",
          body: isPost ? data : null,
          headers,
          credentials: this.opts.withCredentials ? "include" : "omit"
        }).then((res) => {
          var _a2;
          (_a2 = this.socket._cookieJar) === null || _a2 === void 0 ? void 0 : _a2.parseCookies(res.headers.getSetCookie());
          return res;
        });
      }
    };
    exports2.Fetch = Fetch;
  }
});

// node_modules/engine.io-client/build/cjs/index.js
var require_cjs3 = __commonJS({
  "node_modules/engine.io-client/build/cjs/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.WebTransport = exports2.WebSocket = exports2.NodeWebSocket = exports2.XHR = exports2.NodeXHR = exports2.Fetch = exports2.nextTick = exports2.parse = exports2.installTimerFunctions = exports2.transports = exports2.TransportError = exports2.Transport = exports2.protocol = exports2.SocketWithUpgrade = exports2.SocketWithoutUpgrade = exports2.Socket = void 0;
    var socket_js_1 = require_socket();
    Object.defineProperty(exports2, "Socket", { enumerable: true, get: function() {
      return socket_js_1.Socket;
    } });
    var socket_js_2 = require_socket();
    Object.defineProperty(exports2, "SocketWithoutUpgrade", { enumerable: true, get: function() {
      return socket_js_2.SocketWithoutUpgrade;
    } });
    Object.defineProperty(exports2, "SocketWithUpgrade", { enumerable: true, get: function() {
      return socket_js_2.SocketWithUpgrade;
    } });
    exports2.protocol = socket_js_1.Socket.protocol;
    var transport_js_1 = require_transport();
    Object.defineProperty(exports2, "Transport", { enumerable: true, get: function() {
      return transport_js_1.Transport;
    } });
    Object.defineProperty(exports2, "TransportError", { enumerable: true, get: function() {
      return transport_js_1.TransportError;
    } });
    var index_js_1 = require_transports();
    Object.defineProperty(exports2, "transports", { enumerable: true, get: function() {
      return index_js_1.transports;
    } });
    var util_js_1 = require_util();
    Object.defineProperty(exports2, "installTimerFunctions", { enumerable: true, get: function() {
      return util_js_1.installTimerFunctions;
    } });
    var parseuri_js_1 = require_parseuri();
    Object.defineProperty(exports2, "parse", { enumerable: true, get: function() {
      return parseuri_js_1.parse;
    } });
    var globals_node_js_1 = require_globals_node();
    Object.defineProperty(exports2, "nextTick", { enumerable: true, get: function() {
      return globals_node_js_1.nextTick;
    } });
    var polling_fetch_js_1 = require_polling_fetch();
    Object.defineProperty(exports2, "Fetch", { enumerable: true, get: function() {
      return polling_fetch_js_1.Fetch;
    } });
    var polling_xhr_node_js_1 = require_polling_xhr_node();
    Object.defineProperty(exports2, "NodeXHR", { enumerable: true, get: function() {
      return polling_xhr_node_js_1.XHR;
    } });
    var polling_xhr_js_1 = require_polling_xhr();
    Object.defineProperty(exports2, "XHR", { enumerable: true, get: function() {
      return polling_xhr_js_1.XHR;
    } });
    var websocket_node_js_1 = require_websocket_node();
    Object.defineProperty(exports2, "NodeWebSocket", { enumerable: true, get: function() {
      return websocket_node_js_1.WS;
    } });
    var websocket_js_1 = require_websocket2();
    Object.defineProperty(exports2, "WebSocket", { enumerable: true, get: function() {
      return websocket_js_1.WS;
    } });
    var webtransport_js_1 = require_webtransport();
    Object.defineProperty(exports2, "WebTransport", { enumerable: true, get: function() {
      return webtransport_js_1.WT;
    } });
  }
});

// node_modules/socket.io-client/build/cjs/url.js
var require_url = __commonJS({
  "node_modules/socket.io-client/build/cjs/url.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.url = url;
    var engine_io_client_1 = require_cjs3();
    var debug_1 = __importDefault(require_src());
    var debug = (0, debug_1.default)("socket.io-client:url");
    function url(uri, path = "", loc) {
      let obj = uri;
      loc = loc || typeof location !== "undefined" && location;
      if (null == uri)
        uri = loc.protocol + "//" + loc.host;
      if (typeof uri === "string") {
        if ("/" === uri.charAt(0)) {
          if ("/" === uri.charAt(1)) {
            uri = loc.protocol + uri;
          } else {
            uri = loc.host + uri;
          }
        }
        if (!/^(https?|wss?):\/\//.test(uri)) {
          debug("protocol-less url %s", uri);
          if ("undefined" !== typeof loc) {
            uri = loc.protocol + "//" + uri;
          } else {
            uri = "https://" + uri;
          }
        }
        debug("parse %s", uri);
        obj = (0, engine_io_client_1.parse)(uri);
      }
      if (!obj.port) {
        if (/^(http|ws)$/.test(obj.protocol)) {
          obj.port = "80";
        } else if (/^(http|ws)s$/.test(obj.protocol)) {
          obj.port = "443";
        }
      }
      obj.path = obj.path || "/";
      const ipv6 = obj.host.indexOf(":") !== -1;
      const host = ipv6 ? "[" + obj.host + "]" : obj.host;
      obj.id = obj.protocol + "://" + host + ":" + obj.port + path;
      obj.href = obj.protocol + "://" + host + (loc && loc.port === obj.port ? "" : ":" + obj.port);
      return obj;
    }
  }
});

// node_modules/socket.io-parser/build/cjs/is-binary.js
var require_is_binary = __commonJS({
  "node_modules/socket.io-parser/build/cjs/is-binary.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.isBinary = isBinary;
    exports2.hasBinary = hasBinary;
    var withNativeArrayBuffer = typeof ArrayBuffer === "function";
    var isView = (obj) => {
      return typeof ArrayBuffer.isView === "function" ? ArrayBuffer.isView(obj) : obj.buffer instanceof ArrayBuffer;
    };
    var toString = Object.prototype.toString;
    var withNativeBlob = typeof Blob === "function" || typeof Blob !== "undefined" && toString.call(Blob) === "[object BlobConstructor]";
    var withNativeFile = typeof File === "function" || typeof File !== "undefined" && toString.call(File) === "[object FileConstructor]";
    function isBinary(obj) {
      return withNativeArrayBuffer && (obj instanceof ArrayBuffer || isView(obj)) || withNativeBlob && obj instanceof Blob || withNativeFile && obj instanceof File;
    }
    function hasBinary(obj, toJSON) {
      if (!obj || typeof obj !== "object") {
        return false;
      }
      if (Array.isArray(obj)) {
        for (let i = 0, l = obj.length; i < l; i++) {
          if (hasBinary(obj[i])) {
            return true;
          }
        }
        return false;
      }
      if (isBinary(obj)) {
        return true;
      }
      if (obj.toJSON && typeof obj.toJSON === "function" && arguments.length === 1) {
        return hasBinary(obj.toJSON(), true);
      }
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key) && hasBinary(obj[key])) {
          return true;
        }
      }
      return false;
    }
  }
});

// node_modules/socket.io-parser/build/cjs/binary.js
var require_binary = __commonJS({
  "node_modules/socket.io-parser/build/cjs/binary.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.deconstructPacket = deconstructPacket;
    exports2.reconstructPacket = reconstructPacket;
    var is_binary_js_1 = require_is_binary();
    function deconstructPacket(packet) {
      const buffers = [];
      const packetData = packet.data;
      const pack = packet;
      pack.data = _deconstructPacket(packetData, buffers);
      pack.attachments = buffers.length;
      return { packet: pack, buffers };
    }
    function _deconstructPacket(data, buffers) {
      if (!data)
        return data;
      if ((0, is_binary_js_1.isBinary)(data)) {
        const placeholder = { _placeholder: true, num: buffers.length };
        buffers.push(data);
        return placeholder;
      } else if (Array.isArray(data)) {
        const newData = new Array(data.length);
        for (let i = 0; i < data.length; i++) {
          newData[i] = _deconstructPacket(data[i], buffers);
        }
        return newData;
      } else if (typeof data === "object" && !(data instanceof Date)) {
        const newData = {};
        for (const key in data) {
          if (Object.prototype.hasOwnProperty.call(data, key)) {
            newData[key] = _deconstructPacket(data[key], buffers);
          }
        }
        return newData;
      }
      return data;
    }
    function reconstructPacket(packet, buffers) {
      packet.data = _reconstructPacket(packet.data, buffers);
      delete packet.attachments;
      return packet;
    }
    function _reconstructPacket(data, buffers) {
      if (!data)
        return data;
      if (data && data._placeholder === true) {
        const isIndexValid = typeof data.num === "number" && data.num >= 0 && data.num < buffers.length;
        if (isIndexValid) {
          return buffers[data.num];
        } else {
          throw new Error("illegal attachments");
        }
      } else if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          data[i] = _reconstructPacket(data[i], buffers);
        }
      } else if (typeof data === "object") {
        for (const key in data) {
          if (Object.prototype.hasOwnProperty.call(data, key)) {
            data[key] = _reconstructPacket(data[key], buffers);
          }
        }
      }
      return data;
    }
  }
});

// node_modules/socket.io-parser/build/cjs/index.js
var require_cjs4 = __commonJS({
  "node_modules/socket.io-parser/build/cjs/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Decoder = exports2.Encoder = exports2.PacketType = exports2.protocol = void 0;
    exports2.isPacketValid = isPacketValid;
    var component_emitter_1 = require_cjs2();
    var binary_js_1 = require_binary();
    var is_binary_js_1 = require_is_binary();
    var debug_1 = require_src();
    var debug = (0, debug_1.default)("socket.io-parser");
    var RESERVED_EVENTS = [
      "connect",
      // used on the client side
      "connect_error",
      // used on the client side
      "disconnect",
      // used on both sides
      "disconnecting",
      // used on the server side
      "newListener",
      // used by the Node.js EventEmitter
      "removeListener"
      // used by the Node.js EventEmitter
    ];
    exports2.protocol = 5;
    var PacketType;
    (function(PacketType2) {
      PacketType2[PacketType2["CONNECT"] = 0] = "CONNECT";
      PacketType2[PacketType2["DISCONNECT"] = 1] = "DISCONNECT";
      PacketType2[PacketType2["EVENT"] = 2] = "EVENT";
      PacketType2[PacketType2["ACK"] = 3] = "ACK";
      PacketType2[PacketType2["CONNECT_ERROR"] = 4] = "CONNECT_ERROR";
      PacketType2[PacketType2["BINARY_EVENT"] = 5] = "BINARY_EVENT";
      PacketType2[PacketType2["BINARY_ACK"] = 6] = "BINARY_ACK";
    })(PacketType || (exports2.PacketType = PacketType = {}));
    var Encoder = class {
      /**
       * Encoder constructor
       *
       * @param {function} replacer - custom replacer to pass down to JSON.parse
       */
      constructor(replacer) {
        this.replacer = replacer;
      }
      /**
       * Encode a packet as a single string if non-binary, or as a
       * buffer sequence, depending on packet type.
       *
       * @param {Object} obj - packet object
       */
      encode(obj) {
        debug("encoding packet %j", obj);
        if (obj.type === PacketType.EVENT || obj.type === PacketType.ACK) {
          if ((0, is_binary_js_1.hasBinary)(obj)) {
            return this.encodeAsBinary({
              type: obj.type === PacketType.EVENT ? PacketType.BINARY_EVENT : PacketType.BINARY_ACK,
              nsp: obj.nsp,
              data: obj.data,
              id: obj.id
            });
          }
        }
        return [this.encodeAsString(obj)];
      }
      /**
       * Encode packet as string.
       */
      encodeAsString(obj) {
        let str = "" + obj.type;
        if (obj.type === PacketType.BINARY_EVENT || obj.type === PacketType.BINARY_ACK) {
          str += obj.attachments + "-";
        }
        if (obj.nsp && "/" !== obj.nsp) {
          str += obj.nsp + ",";
        }
        if (null != obj.id) {
          str += obj.id;
        }
        if (null != obj.data) {
          str += JSON.stringify(obj.data, this.replacer);
        }
        debug("encoded %j as %s", obj, str);
        return str;
      }
      /**
       * Encode packet as 'buffer sequence' by removing blobs, and
       * deconstructing packet into object with placeholders and
       * a list of buffers.
       */
      encodeAsBinary(obj) {
        const deconstruction = (0, binary_js_1.deconstructPacket)(obj);
        const pack = this.encodeAsString(deconstruction.packet);
        const buffers = deconstruction.buffers;
        buffers.unshift(pack);
        return buffers;
      }
    };
    exports2.Encoder = Encoder;
    var Decoder = class _Decoder extends component_emitter_1.Emitter {
      /**
       * Decoder constructor
       *
       * @param {function} reviver - custom reviver to pass down to JSON.stringify
       */
      constructor(reviver) {
        super();
        this.reviver = reviver;
      }
      /**
       * Decodes an encoded packet string into packet JSON.
       *
       * @param {String} obj - encoded packet
       */
      add(obj) {
        let packet;
        if (typeof obj === "string") {
          if (this.reconstructor) {
            throw new Error("got plaintext data when reconstructing a packet");
          }
          packet = this.decodeString(obj);
          const isBinaryEvent = packet.type === PacketType.BINARY_EVENT;
          if (isBinaryEvent || packet.type === PacketType.BINARY_ACK) {
            packet.type = isBinaryEvent ? PacketType.EVENT : PacketType.ACK;
            this.reconstructor = new BinaryReconstructor(packet);
            if (packet.attachments === 0) {
              super.emitReserved("decoded", packet);
            }
          } else {
            super.emitReserved("decoded", packet);
          }
        } else if ((0, is_binary_js_1.isBinary)(obj) || obj.base64) {
          if (!this.reconstructor) {
            throw new Error("got binary data when not reconstructing a packet");
          } else {
            packet = this.reconstructor.takeBinaryData(obj);
            if (packet) {
              this.reconstructor = null;
              super.emitReserved("decoded", packet);
            }
          }
        } else {
          throw new Error("Unknown type: " + obj);
        }
      }
      /**
       * Decode a packet String (JSON data)
       *
       * @param {String} str
       * @return {Object} packet
       */
      decodeString(str) {
        let i = 0;
        const p = {
          type: Number(str.charAt(0))
        };
        if (PacketType[p.type] === void 0) {
          throw new Error("unknown packet type " + p.type);
        }
        if (p.type === PacketType.BINARY_EVENT || p.type === PacketType.BINARY_ACK) {
          const start = i + 1;
          while (str.charAt(++i) !== "-" && i != str.length) {
          }
          const buf = str.substring(start, i);
          if (buf != Number(buf) || str.charAt(i) !== "-") {
            throw new Error("Illegal attachments");
          }
          p.attachments = Number(buf);
        }
        if ("/" === str.charAt(i + 1)) {
          const start = i + 1;
          while (++i) {
            const c = str.charAt(i);
            if ("," === c)
              break;
            if (i === str.length)
              break;
          }
          p.nsp = str.substring(start, i);
        } else {
          p.nsp = "/";
        }
        const next = str.charAt(i + 1);
        if ("" !== next && Number(next) == next) {
          const start = i + 1;
          while (++i) {
            const c = str.charAt(i);
            if (null == c || Number(c) != c) {
              --i;
              break;
            }
            if (i === str.length)
              break;
          }
          p.id = Number(str.substring(start, i + 1));
        }
        if (str.charAt(++i)) {
          const payload = this.tryParse(str.substr(i));
          if (_Decoder.isPayloadValid(p.type, payload)) {
            p.data = payload;
          } else {
            throw new Error("invalid payload");
          }
        }
        debug("decoded %s as %j", str, p);
        return p;
      }
      tryParse(str) {
        try {
          return JSON.parse(str, this.reviver);
        } catch (e) {
          return false;
        }
      }
      static isPayloadValid(type2, payload) {
        switch (type2) {
          case PacketType.CONNECT:
            return isObject(payload);
          case PacketType.DISCONNECT:
            return payload === void 0;
          case PacketType.CONNECT_ERROR:
            return typeof payload === "string" || isObject(payload);
          case PacketType.EVENT:
          case PacketType.BINARY_EVENT:
            return Array.isArray(payload) && (typeof payload[0] === "number" || typeof payload[0] === "string" && RESERVED_EVENTS.indexOf(payload[0]) === -1);
          case PacketType.ACK:
          case PacketType.BINARY_ACK:
            return Array.isArray(payload);
        }
      }
      /**
       * Deallocates a parser's resources
       */
      destroy() {
        if (this.reconstructor) {
          this.reconstructor.finishedReconstruction();
          this.reconstructor = null;
        }
      }
    };
    exports2.Decoder = Decoder;
    var BinaryReconstructor = class {
      constructor(packet) {
        this.packet = packet;
        this.buffers = [];
        this.reconPack = packet;
      }
      /**
       * Method to be called when binary data received from connection
       * after a BINARY_EVENT packet.
       *
       * @param {Buffer | ArrayBuffer} binData - the raw binary data received
       * @return {null | Object} returns null if more binary data is expected or
       *   a reconstructed packet object if all buffers have been received.
       */
      takeBinaryData(binData) {
        this.buffers.push(binData);
        if (this.buffers.length === this.reconPack.attachments) {
          const packet = (0, binary_js_1.reconstructPacket)(this.reconPack, this.buffers);
          this.finishedReconstruction();
          return packet;
        }
        return null;
      }
      /**
       * Cleans up binary packet reconstruction variables.
       */
      finishedReconstruction() {
        this.reconPack = null;
        this.buffers = [];
      }
    };
    function isNamespaceValid(nsp) {
      return typeof nsp === "string";
    }
    var isInteger = Number.isInteger || function(value) {
      return typeof value === "number" && isFinite(value) && Math.floor(value) === value;
    };
    function isAckIdValid(id) {
      return id === void 0 || isInteger(id);
    }
    function isObject(value) {
      return Object.prototype.toString.call(value) === "[object Object]";
    }
    function isDataValid(type2, payload) {
      switch (type2) {
        case PacketType.CONNECT:
          return payload === void 0 || isObject(payload);
        case PacketType.DISCONNECT:
          return payload === void 0;
        case PacketType.EVENT:
          return Array.isArray(payload) && (typeof payload[0] === "number" || typeof payload[0] === "string" && RESERVED_EVENTS.indexOf(payload[0]) === -1);
        case PacketType.ACK:
          return Array.isArray(payload);
        case PacketType.CONNECT_ERROR:
          return typeof payload === "string" || isObject(payload);
        default:
          return false;
      }
    }
    function isPacketValid(packet) {
      return isNamespaceValid(packet.nsp) && isAckIdValid(packet.id) && isDataValid(packet.type, packet.data);
    }
  }
});

// node_modules/socket.io-client/build/cjs/on.js
var require_on = __commonJS({
  "node_modules/socket.io-client/build/cjs/on.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.on = on;
    function on(obj, ev, fn) {
      obj.on(ev, fn);
      return function subDestroy() {
        obj.off(ev, fn);
      };
    }
  }
});

// node_modules/socket.io-client/build/cjs/socket.js
var require_socket2 = __commonJS({
  "node_modules/socket.io-client/build/cjs/socket.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Socket = void 0;
    var socket_io_parser_1 = require_cjs4();
    var on_js_1 = require_on();
    var component_emitter_1 = require_cjs2();
    var debug_1 = __importDefault(require_src());
    var debug = (0, debug_1.default)("socket.io-client:socket");
    var RESERVED_EVENTS = Object.freeze({
      connect: 1,
      connect_error: 1,
      disconnect: 1,
      disconnecting: 1,
      // EventEmitter reserved events: https://nodejs.org/api/events.html#events_event_newlistener
      newListener: 1,
      removeListener: 1
    });
    var Socket = class extends component_emitter_1.Emitter {
      /**
       * `Socket` constructor.
       */
      constructor(io, nsp, opts) {
        super();
        this.connected = false;
        this.recovered = false;
        this.receiveBuffer = [];
        this.sendBuffer = [];
        this._queue = [];
        this._queueSeq = 0;
        this.ids = 0;
        this.acks = {};
        this.flags = {};
        this.io = io;
        this.nsp = nsp;
        if (opts && opts.auth) {
          this.auth = opts.auth;
        }
        this._opts = Object.assign({}, opts);
        if (this.io._autoConnect)
          this.open();
      }
      /**
       * Whether the socket is currently disconnected
       *
       * @example
       * const socket = io();
       *
       * socket.on("connect", () => {
       *   console.log(socket.disconnected); // false
       * });
       *
       * socket.on("disconnect", () => {
       *   console.log(socket.disconnected); // true
       * });
       */
      get disconnected() {
        return !this.connected;
      }
      /**
       * Subscribe to open, close and packet events
       *
       * @private
       */
      subEvents() {
        if (this.subs)
          return;
        const io = this.io;
        this.subs = [
          (0, on_js_1.on)(io, "open", this.onopen.bind(this)),
          (0, on_js_1.on)(io, "packet", this.onpacket.bind(this)),
          (0, on_js_1.on)(io, "error", this.onerror.bind(this)),
          (0, on_js_1.on)(io, "close", this.onclose.bind(this))
        ];
      }
      /**
       * Whether the Socket will try to reconnect when its Manager connects or reconnects.
       *
       * @example
       * const socket = io();
       *
       * console.log(socket.active); // true
       *
       * socket.on("disconnect", (reason) => {
       *   if (reason === "io server disconnect") {
       *     // the disconnection was initiated by the server, you need to manually reconnect
       *     console.log(socket.active); // false
       *   }
       *   // else the socket will automatically try to reconnect
       *   console.log(socket.active); // true
       * });
       */
      get active() {
        return !!this.subs;
      }
      /**
       * "Opens" the socket.
       *
       * @example
       * const socket = io({
       *   autoConnect: false
       * });
       *
       * socket.connect();
       */
      connect() {
        if (this.connected)
          return this;
        this.subEvents();
        if (!this.io["_reconnecting"])
          this.io.open();
        if ("open" === this.io._readyState)
          this.onopen();
        return this;
      }
      /**
       * Alias for {@link connect()}.
       */
      open() {
        return this.connect();
      }
      /**
       * Sends a `message` event.
       *
       * This method mimics the WebSocket.send() method.
       *
       * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send
       *
       * @example
       * socket.send("hello");
       *
       * // this is equivalent to
       * socket.emit("message", "hello");
       *
       * @return self
       */
      send(...args) {
        args.unshift("message");
        this.emit.apply(this, args);
        return this;
      }
      /**
       * Override `emit`.
       * If the event is in `events`, it's emitted normally.
       *
       * @example
       * socket.emit("hello", "world");
       *
       * // all serializable datastructures are supported (no need to call JSON.stringify)
       * socket.emit("hello", 1, "2", { 3: ["4"], 5: Uint8Array.from([6]) });
       *
       * // with an acknowledgement from the server
       * socket.emit("hello", "world", (val) => {
       *   // ...
       * });
       *
       * @return self
       */
      emit(ev, ...args) {
        var _a, _b, _c;
        if (RESERVED_EVENTS.hasOwnProperty(ev)) {
          throw new Error('"' + ev.toString() + '" is a reserved event name');
        }
        args.unshift(ev);
        if (this._opts.retries && !this.flags.fromQueue && !this.flags.volatile) {
          this._addToQueue(args);
          return this;
        }
        const packet = {
          type: socket_io_parser_1.PacketType.EVENT,
          data: args
        };
        packet.options = {};
        packet.options.compress = this.flags.compress !== false;
        if ("function" === typeof args[args.length - 1]) {
          const id = this.ids++;
          debug("emitting packet with ack id %d", id);
          const ack = args.pop();
          this._registerAckCallback(id, ack);
          packet.id = id;
        }
        const isTransportWritable = (_b = (_a = this.io.engine) === null || _a === void 0 ? void 0 : _a.transport) === null || _b === void 0 ? void 0 : _b.writable;
        const isConnected = this.connected && !((_c = this.io.engine) === null || _c === void 0 ? void 0 : _c._hasPingExpired());
        const discardPacket = this.flags.volatile && !isTransportWritable;
        if (discardPacket) {
          debug("discard packet as the transport is not currently writable");
        } else if (isConnected) {
          this.notifyOutgoingListeners(packet);
          this.packet(packet);
        } else {
          this.sendBuffer.push(packet);
        }
        this.flags = {};
        return this;
      }
      /**
       * @private
       */
      _registerAckCallback(id, ack) {
        var _a;
        const timeout = (_a = this.flags.timeout) !== null && _a !== void 0 ? _a : this._opts.ackTimeout;
        if (timeout === void 0) {
          this.acks[id] = ack;
          return;
        }
        const timer = this.io.setTimeoutFn(() => {
          delete this.acks[id];
          for (let i = 0; i < this.sendBuffer.length; i++) {
            if (this.sendBuffer[i].id === id) {
              debug("removing packet with ack id %d from the buffer", id);
              this.sendBuffer.splice(i, 1);
            }
          }
          debug("event with ack id %d has timed out after %d ms", id, timeout);
          ack.call(this, new Error("operation has timed out"));
        }, timeout);
        const fn = (...args) => {
          this.io.clearTimeoutFn(timer);
          ack.apply(this, args);
        };
        fn.withError = true;
        this.acks[id] = fn;
      }
      /**
       * Emits an event and waits for an acknowledgement
       *
       * @example
       * // without timeout
       * const response = await socket.emitWithAck("hello", "world");
       *
       * // with a specific timeout
       * try {
       *   const response = await socket.timeout(1000).emitWithAck("hello", "world");
       * } catch (err) {
       *   // the server did not acknowledge the event in the given delay
       * }
       *
       * @return a Promise that will be fulfilled when the server acknowledges the event
       */
      emitWithAck(ev, ...args) {
        return new Promise((resolve, reject) => {
          const fn = (arg1, arg2) => {
            return arg1 ? reject(arg1) : resolve(arg2);
          };
          fn.withError = true;
          args.push(fn);
          this.emit(ev, ...args);
        });
      }
      /**
       * Add the packet to the queue.
       * @param args
       * @private
       */
      _addToQueue(args) {
        let ack;
        if (typeof args[args.length - 1] === "function") {
          ack = args.pop();
        }
        const packet = {
          id: this._queueSeq++,
          tryCount: 0,
          pending: false,
          args,
          flags: Object.assign({ fromQueue: true }, this.flags)
        };
        args.push((err, ...responseArgs) => {
          if (packet !== this._queue[0]) {
            return debug("packet [%d] already acknowledged", packet.id);
          }
          const hasError = err !== null;
          if (hasError) {
            if (packet.tryCount > this._opts.retries) {
              debug("packet [%d] is discarded after %d tries", packet.id, packet.tryCount);
              this._queue.shift();
              if (ack) {
                ack(err);
              }
            }
          } else {
            debug("packet [%d] was successfully sent", packet.id);
            this._queue.shift();
            if (ack) {
              ack(null, ...responseArgs);
            }
          }
          packet.pending = false;
          return this._drainQueue();
        });
        this._queue.push(packet);
        this._drainQueue();
      }
      /**
       * Send the first packet of the queue, and wait for an acknowledgement from the server.
       * @param force - whether to resend a packet that has not been acknowledged yet
       *
       * @private
       */
      _drainQueue(force = false) {
        debug("draining queue");
        if (!this.connected || this._queue.length === 0) {
          return;
        }
        const packet = this._queue[0];
        if (packet.pending && !force) {
          debug("packet [%d] has already been sent and is waiting for an ack", packet.id);
          return;
        }
        packet.pending = true;
        packet.tryCount++;
        debug("sending packet [%d] (try n\xB0%d)", packet.id, packet.tryCount);
        this.flags = packet.flags;
        this.emit.apply(this, packet.args);
      }
      /**
       * Sends a packet.
       *
       * @param packet
       * @private
       */
      packet(packet) {
        packet.nsp = this.nsp;
        this.io._packet(packet);
      }
      /**
       * Called upon engine `open`.
       *
       * @private
       */
      onopen() {
        debug("transport is open - connecting");
        if (typeof this.auth == "function") {
          this.auth((data) => {
            this._sendConnectPacket(data);
          });
        } else {
          this._sendConnectPacket(this.auth);
        }
      }
      /**
       * Sends a CONNECT packet to initiate the Socket.IO session.
       *
       * @param data
       * @private
       */
      _sendConnectPacket(data) {
        this.packet({
          type: socket_io_parser_1.PacketType.CONNECT,
          data: this._pid ? Object.assign({ pid: this._pid, offset: this._lastOffset }, data) : data
        });
      }
      /**
       * Called upon engine or manager `error`.
       *
       * @param err
       * @private
       */
      onerror(err) {
        if (!this.connected) {
          this.emitReserved("connect_error", err);
        }
      }
      /**
       * Called upon engine `close`.
       *
       * @param reason
       * @param description
       * @private
       */
      onclose(reason, description) {
        debug("close (%s)", reason);
        this.connected = false;
        delete this.id;
        this.emitReserved("disconnect", reason, description);
        this._clearAcks();
      }
      /**
       * Clears the acknowledgement handlers upon disconnection, since the client will never receive an acknowledgement from
       * the server.
       *
       * @private
       */
      _clearAcks() {
        Object.keys(this.acks).forEach((id) => {
          const isBuffered = this.sendBuffer.some((packet) => String(packet.id) === id);
          if (!isBuffered) {
            const ack = this.acks[id];
            delete this.acks[id];
            if (ack.withError) {
              ack.call(this, new Error("socket has been disconnected"));
            }
          }
        });
      }
      /**
       * Called with socket packet.
       *
       * @param packet
       * @private
       */
      onpacket(packet) {
        const sameNamespace = packet.nsp === this.nsp;
        if (!sameNamespace)
          return;
        switch (packet.type) {
          case socket_io_parser_1.PacketType.CONNECT:
            if (packet.data && packet.data.sid) {
              this.onconnect(packet.data.sid, packet.data.pid);
            } else {
              this.emitReserved("connect_error", new Error("It seems you are trying to reach a Socket.IO server in v2.x with a v3.x client, but they are not compatible (more information here: https://socket.io/docs/v3/migrating-from-2-x-to-3-0/)"));
            }
            break;
          case socket_io_parser_1.PacketType.EVENT:
          case socket_io_parser_1.PacketType.BINARY_EVENT:
            this.onevent(packet);
            break;
          case socket_io_parser_1.PacketType.ACK:
          case socket_io_parser_1.PacketType.BINARY_ACK:
            this.onack(packet);
            break;
          case socket_io_parser_1.PacketType.DISCONNECT:
            this.ondisconnect();
            break;
          case socket_io_parser_1.PacketType.CONNECT_ERROR:
            this.destroy();
            const err = new Error(packet.data.message);
            err.data = packet.data.data;
            this.emitReserved("connect_error", err);
            break;
        }
      }
      /**
       * Called upon a server event.
       *
       * @param packet
       * @private
       */
      onevent(packet) {
        const args = packet.data || [];
        debug("emitting event %j", args);
        if (null != packet.id) {
          debug("attaching ack callback to event");
          args.push(this.ack(packet.id));
        }
        if (this.connected) {
          this.emitEvent(args);
        } else {
          this.receiveBuffer.push(Object.freeze(args));
        }
      }
      emitEvent(args) {
        if (this._anyListeners && this._anyListeners.length) {
          const listeners = this._anyListeners.slice();
          for (const listener of listeners) {
            listener.apply(this, args);
          }
        }
        super.emit.apply(this, args);
        if (this._pid && args.length && typeof args[args.length - 1] === "string") {
          this._lastOffset = args[args.length - 1];
        }
      }
      /**
       * Produces an ack callback to emit with an event.
       *
       * @private
       */
      ack(id) {
        const self = this;
        let sent = false;
        return function(...args) {
          if (sent)
            return;
          sent = true;
          debug("sending ack %j", args);
          self.packet({
            type: socket_io_parser_1.PacketType.ACK,
            id,
            data: args
          });
        };
      }
      /**
       * Called upon a server acknowledgement.
       *
       * @param packet
       * @private
       */
      onack(packet) {
        const ack = this.acks[packet.id];
        if (typeof ack !== "function") {
          debug("bad ack %s", packet.id);
          return;
        }
        delete this.acks[packet.id];
        debug("calling ack %s with %j", packet.id, packet.data);
        if (ack.withError) {
          packet.data.unshift(null);
        }
        ack.apply(this, packet.data);
      }
      /**
       * Called upon server connect.
       *
       * @private
       */
      onconnect(id, pid) {
        debug("socket connected with id %s", id);
        this.id = id;
        this.recovered = pid && this._pid === pid;
        this._pid = pid;
        this.connected = true;
        this.emitBuffered();
        this._drainQueue(true);
        this.emitReserved("connect");
      }
      /**
       * Emit buffered events (received and emitted).
       *
       * @private
       */
      emitBuffered() {
        this.receiveBuffer.forEach((args) => this.emitEvent(args));
        this.receiveBuffer = [];
        this.sendBuffer.forEach((packet) => {
          this.notifyOutgoingListeners(packet);
          this.packet(packet);
        });
        this.sendBuffer = [];
      }
      /**
       * Called upon server disconnect.
       *
       * @private
       */
      ondisconnect() {
        debug("server disconnect (%s)", this.nsp);
        this.destroy();
        this.onclose("io server disconnect");
      }
      /**
       * Called upon forced client/server side disconnections,
       * this method ensures the manager stops tracking us and
       * that reconnections don't get triggered for this.
       *
       * @private
       */
      destroy() {
        if (this.subs) {
          this.subs.forEach((subDestroy) => subDestroy());
          this.subs = void 0;
        }
        this.io["_destroy"](this);
      }
      /**
       * Disconnects the socket manually. In that case, the socket will not try to reconnect.
       *
       * If this is the last active Socket instance of the {@link Manager}, the low-level connection will be closed.
       *
       * @example
       * const socket = io();
       *
       * socket.on("disconnect", (reason) => {
       *   // console.log(reason); prints "io client disconnect"
       * });
       *
       * socket.disconnect();
       *
       * @return self
       */
      disconnect() {
        if (this.connected) {
          debug("performing disconnect (%s)", this.nsp);
          this.packet({ type: socket_io_parser_1.PacketType.DISCONNECT });
        }
        this.destroy();
        if (this.connected) {
          this.onclose("io client disconnect");
        }
        return this;
      }
      /**
       * Alias for {@link disconnect()}.
       *
       * @return self
       */
      close() {
        return this.disconnect();
      }
      /**
       * Sets the compress flag.
       *
       * @example
       * socket.compress(false).emit("hello");
       *
       * @param compress - if `true`, compresses the sending data
       * @return self
       */
      compress(compress) {
        this.flags.compress = compress;
        return this;
      }
      /**
       * Sets a modifier for a subsequent event emission that the event message will be dropped when this socket is not
       * ready to send messages.
       *
       * @example
       * socket.volatile.emit("hello"); // the server may or may not receive it
       *
       * @returns self
       */
      get volatile() {
        this.flags.volatile = true;
        return this;
      }
      /**
       * Sets a modifier for a subsequent event emission that the callback will be called with an error when the
       * given number of milliseconds have elapsed without an acknowledgement from the server:
       *
       * @example
       * socket.timeout(5000).emit("my-event", (err) => {
       *   if (err) {
       *     // the server did not acknowledge the event in the given delay
       *   }
       * });
       *
       * @returns self
       */
      timeout(timeout) {
        this.flags.timeout = timeout;
        return this;
      }
      /**
       * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
       * callback.
       *
       * @example
       * socket.onAny((event, ...args) => {
       *   console.log(`got ${event}`);
       * });
       *
       * @param listener
       */
      onAny(listener) {
        this._anyListeners = this._anyListeners || [];
        this._anyListeners.push(listener);
        return this;
      }
      /**
       * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
       * callback. The listener is added to the beginning of the listeners array.
       *
       * @example
       * socket.prependAny((event, ...args) => {
       *   console.log(`got event ${event}`);
       * });
       *
       * @param listener
       */
      prependAny(listener) {
        this._anyListeners = this._anyListeners || [];
        this._anyListeners.unshift(listener);
        return this;
      }
      /**
       * Removes the listener that will be fired when any event is emitted.
       *
       * @example
       * const catchAllListener = (event, ...args) => {
       *   console.log(`got event ${event}`);
       * }
       *
       * socket.onAny(catchAllListener);
       *
       * // remove a specific listener
       * socket.offAny(catchAllListener);
       *
       * // or remove all listeners
       * socket.offAny();
       *
       * @param listener
       */
      offAny(listener) {
        if (!this._anyListeners) {
          return this;
        }
        if (listener) {
          const listeners = this._anyListeners;
          for (let i = 0; i < listeners.length; i++) {
            if (listener === listeners[i]) {
              listeners.splice(i, 1);
              return this;
            }
          }
        } else {
          this._anyListeners = [];
        }
        return this;
      }
      /**
       * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
       * e.g. to remove listeners.
       */
      listenersAny() {
        return this._anyListeners || [];
      }
      /**
       * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
       * callback.
       *
       * Note: acknowledgements sent to the server are not included.
       *
       * @example
       * socket.onAnyOutgoing((event, ...args) => {
       *   console.log(`sent event ${event}`);
       * });
       *
       * @param listener
       */
      onAnyOutgoing(listener) {
        this._anyOutgoingListeners = this._anyOutgoingListeners || [];
        this._anyOutgoingListeners.push(listener);
        return this;
      }
      /**
       * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
       * callback. The listener is added to the beginning of the listeners array.
       *
       * Note: acknowledgements sent to the server are not included.
       *
       * @example
       * socket.prependAnyOutgoing((event, ...args) => {
       *   console.log(`sent event ${event}`);
       * });
       *
       * @param listener
       */
      prependAnyOutgoing(listener) {
        this._anyOutgoingListeners = this._anyOutgoingListeners || [];
        this._anyOutgoingListeners.unshift(listener);
        return this;
      }
      /**
       * Removes the listener that will be fired when any event is emitted.
       *
       * @example
       * const catchAllListener = (event, ...args) => {
       *   console.log(`sent event ${event}`);
       * }
       *
       * socket.onAnyOutgoing(catchAllListener);
       *
       * // remove a specific listener
       * socket.offAnyOutgoing(catchAllListener);
       *
       * // or remove all listeners
       * socket.offAnyOutgoing();
       *
       * @param [listener] - the catch-all listener (optional)
       */
      offAnyOutgoing(listener) {
        if (!this._anyOutgoingListeners) {
          return this;
        }
        if (listener) {
          const listeners = this._anyOutgoingListeners;
          for (let i = 0; i < listeners.length; i++) {
            if (listener === listeners[i]) {
              listeners.splice(i, 1);
              return this;
            }
          }
        } else {
          this._anyOutgoingListeners = [];
        }
        return this;
      }
      /**
       * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
       * e.g. to remove listeners.
       */
      listenersAnyOutgoing() {
        return this._anyOutgoingListeners || [];
      }
      /**
       * Notify the listeners for each packet sent
       *
       * @param packet
       *
       * @private
       */
      notifyOutgoingListeners(packet) {
        if (this._anyOutgoingListeners && this._anyOutgoingListeners.length) {
          const listeners = this._anyOutgoingListeners.slice();
          for (const listener of listeners) {
            listener.apply(this, packet.data);
          }
        }
      }
    };
    exports2.Socket = Socket;
  }
});

// node_modules/socket.io-client/build/cjs/contrib/backo2.js
var require_backo2 = __commonJS({
  "node_modules/socket.io-client/build/cjs/contrib/backo2.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Backoff = Backoff;
    function Backoff(opts) {
      opts = opts || {};
      this.ms = opts.min || 100;
      this.max = opts.max || 1e4;
      this.factor = opts.factor || 2;
      this.jitter = opts.jitter > 0 && opts.jitter <= 1 ? opts.jitter : 0;
      this.attempts = 0;
    }
    Backoff.prototype.duration = function() {
      var ms = this.ms * Math.pow(this.factor, this.attempts++);
      if (this.jitter) {
        var rand = Math.random();
        var deviation = Math.floor(rand * this.jitter * ms);
        ms = (Math.floor(rand * 10) & 1) == 0 ? ms - deviation : ms + deviation;
      }
      return Math.min(ms, this.max) | 0;
    };
    Backoff.prototype.reset = function() {
      this.attempts = 0;
    };
    Backoff.prototype.setMin = function(min) {
      this.ms = min;
    };
    Backoff.prototype.setMax = function(max) {
      this.max = max;
    };
    Backoff.prototype.setJitter = function(jitter) {
      this.jitter = jitter;
    };
  }
});

// node_modules/socket.io-client/build/cjs/manager.js
var require_manager = __commonJS({
  "node_modules/socket.io-client/build/cjs/manager.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || function(mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Manager = void 0;
    var engine_io_client_1 = require_cjs3();
    var socket_js_1 = require_socket2();
    var parser = __importStar(require_cjs4());
    var on_js_1 = require_on();
    var backo2_js_1 = require_backo2();
    var component_emitter_1 = require_cjs2();
    var debug_1 = __importDefault(require_src());
    var debug = (0, debug_1.default)("socket.io-client:manager");
    var Manager = class extends component_emitter_1.Emitter {
      constructor(uri, opts) {
        var _a;
        super();
        this.nsps = {};
        this.subs = [];
        if (uri && "object" === typeof uri) {
          opts = uri;
          uri = void 0;
        }
        opts = opts || {};
        opts.path = opts.path || "/socket.io";
        this.opts = opts;
        (0, engine_io_client_1.installTimerFunctions)(this, opts);
        this.reconnection(opts.reconnection !== false);
        this.reconnectionAttempts(opts.reconnectionAttempts || Infinity);
        this.reconnectionDelay(opts.reconnectionDelay || 1e3);
        this.reconnectionDelayMax(opts.reconnectionDelayMax || 5e3);
        this.randomizationFactor((_a = opts.randomizationFactor) !== null && _a !== void 0 ? _a : 0.5);
        this.backoff = new backo2_js_1.Backoff({
          min: this.reconnectionDelay(),
          max: this.reconnectionDelayMax(),
          jitter: this.randomizationFactor()
        });
        this.timeout(null == opts.timeout ? 2e4 : opts.timeout);
        this._readyState = "closed";
        this.uri = uri;
        const _parser = opts.parser || parser;
        this.encoder = new _parser.Encoder();
        this.decoder = new _parser.Decoder();
        this._autoConnect = opts.autoConnect !== false;
        if (this._autoConnect)
          this.open();
      }
      reconnection(v) {
        if (!arguments.length)
          return this._reconnection;
        this._reconnection = !!v;
        if (!v) {
          this.skipReconnect = true;
        }
        return this;
      }
      reconnectionAttempts(v) {
        if (v === void 0)
          return this._reconnectionAttempts;
        this._reconnectionAttempts = v;
        return this;
      }
      reconnectionDelay(v) {
        var _a;
        if (v === void 0)
          return this._reconnectionDelay;
        this._reconnectionDelay = v;
        (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setMin(v);
        return this;
      }
      randomizationFactor(v) {
        var _a;
        if (v === void 0)
          return this._randomizationFactor;
        this._randomizationFactor = v;
        (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setJitter(v);
        return this;
      }
      reconnectionDelayMax(v) {
        var _a;
        if (v === void 0)
          return this._reconnectionDelayMax;
        this._reconnectionDelayMax = v;
        (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setMax(v);
        return this;
      }
      timeout(v) {
        if (!arguments.length)
          return this._timeout;
        this._timeout = v;
        return this;
      }
      /**
       * Starts trying to reconnect if reconnection is enabled and we have not
       * started reconnecting yet
       *
       * @private
       */
      maybeReconnectOnOpen() {
        if (!this._reconnecting && this._reconnection && this.backoff.attempts === 0) {
          this.reconnect();
        }
      }
      /**
       * Sets the current transport `socket`.
       *
       * @param {Function} fn - optional, callback
       * @return self
       * @public
       */
      open(fn) {
        debug("readyState %s", this._readyState);
        if (~this._readyState.indexOf("open"))
          return this;
        debug("opening %s", this.uri);
        this.engine = new engine_io_client_1.Socket(this.uri, this.opts);
        const socket = this.engine;
        const self = this;
        this._readyState = "opening";
        this.skipReconnect = false;
        const openSubDestroy = (0, on_js_1.on)(socket, "open", function() {
          self.onopen();
          fn && fn();
        });
        const onError = (err) => {
          debug("error");
          this.cleanup();
          this._readyState = "closed";
          this.emitReserved("error", err);
          if (fn) {
            fn(err);
          } else {
            this.maybeReconnectOnOpen();
          }
        };
        const errorSub = (0, on_js_1.on)(socket, "error", onError);
        if (false !== this._timeout) {
          const timeout = this._timeout;
          debug("connect attempt will timeout after %d", timeout);
          const timer = this.setTimeoutFn(() => {
            debug("connect attempt timed out after %d", timeout);
            openSubDestroy();
            onError(new Error("timeout"));
            socket.close();
          }, timeout);
          if (this.opts.autoUnref) {
            timer.unref();
          }
          this.subs.push(() => {
            this.clearTimeoutFn(timer);
          });
        }
        this.subs.push(openSubDestroy);
        this.subs.push(errorSub);
        return this;
      }
      /**
       * Alias for open()
       *
       * @return self
       * @public
       */
      connect(fn) {
        return this.open(fn);
      }
      /**
       * Called upon transport open.
       *
       * @private
       */
      onopen() {
        debug("open");
        this.cleanup();
        this._readyState = "open";
        this.emitReserved("open");
        const socket = this.engine;
        this.subs.push(
          (0, on_js_1.on)(socket, "ping", this.onping.bind(this)),
          (0, on_js_1.on)(socket, "data", this.ondata.bind(this)),
          (0, on_js_1.on)(socket, "error", this.onerror.bind(this)),
          (0, on_js_1.on)(socket, "close", this.onclose.bind(this)),
          // @ts-ignore
          (0, on_js_1.on)(this.decoder, "decoded", this.ondecoded.bind(this))
        );
      }
      /**
       * Called upon a ping.
       *
       * @private
       */
      onping() {
        this.emitReserved("ping");
      }
      /**
       * Called with data.
       *
       * @private
       */
      ondata(data) {
        try {
          this.decoder.add(data);
        } catch (e) {
          this.onclose("parse error", e);
        }
      }
      /**
       * Called when parser fully decodes a packet.
       *
       * @private
       */
      ondecoded(packet) {
        (0, engine_io_client_1.nextTick)(() => {
          this.emitReserved("packet", packet);
        }, this.setTimeoutFn);
      }
      /**
       * Called upon socket error.
       *
       * @private
       */
      onerror(err) {
        debug("error", err);
        this.emitReserved("error", err);
      }
      /**
       * Creates a new socket for the given `nsp`.
       *
       * @return {Socket}
       * @public
       */
      socket(nsp, opts) {
        let socket = this.nsps[nsp];
        if (!socket) {
          socket = new socket_js_1.Socket(this, nsp, opts);
          this.nsps[nsp] = socket;
        } else if (this._autoConnect && !socket.active) {
          socket.connect();
        }
        return socket;
      }
      /**
       * Called upon a socket close.
       *
       * @param socket
       * @private
       */
      _destroy(socket) {
        const nsps = Object.keys(this.nsps);
        for (const nsp of nsps) {
          const socket2 = this.nsps[nsp];
          if (socket2.active) {
            debug("socket %s is still active, skipping close", nsp);
            return;
          }
        }
        this._close();
      }
      /**
       * Writes a packet.
       *
       * @param packet
       * @private
       */
      _packet(packet) {
        debug("writing packet %j", packet);
        const encodedPackets = this.encoder.encode(packet);
        for (let i = 0; i < encodedPackets.length; i++) {
          this.engine.write(encodedPackets[i], packet.options);
        }
      }
      /**
       * Clean up transport subscriptions and packet buffer.
       *
       * @private
       */
      cleanup() {
        debug("cleanup");
        this.subs.forEach((subDestroy) => subDestroy());
        this.subs.length = 0;
        this.decoder.destroy();
      }
      /**
       * Close the current socket.
       *
       * @private
       */
      _close() {
        debug("disconnect");
        this.skipReconnect = true;
        this._reconnecting = false;
        this.onclose("forced close");
      }
      /**
       * Alias for close()
       *
       * @private
       */
      disconnect() {
        return this._close();
      }
      /**
       * Called when:
       *
       * - the low-level engine is closed
       * - the parser encountered a badly formatted packet
       * - all sockets are disconnected
       *
       * @private
       */
      onclose(reason, description) {
        var _a;
        debug("closed due to %s", reason);
        this.cleanup();
        (_a = this.engine) === null || _a === void 0 ? void 0 : _a.close();
        this.backoff.reset();
        this._readyState = "closed";
        this.emitReserved("close", reason, description);
        if (this._reconnection && !this.skipReconnect) {
          this.reconnect();
        }
      }
      /**
       * Attempt a reconnection.
       *
       * @private
       */
      reconnect() {
        if (this._reconnecting || this.skipReconnect)
          return this;
        const self = this;
        if (this.backoff.attempts >= this._reconnectionAttempts) {
          debug("reconnect failed");
          this.backoff.reset();
          this.emitReserved("reconnect_failed");
          this._reconnecting = false;
        } else {
          const delay = this.backoff.duration();
          debug("will wait %dms before reconnect attempt", delay);
          this._reconnecting = true;
          const timer = this.setTimeoutFn(() => {
            if (self.skipReconnect)
              return;
            debug("attempting reconnect");
            this.emitReserved("reconnect_attempt", self.backoff.attempts);
            if (self.skipReconnect)
              return;
            self.open((err) => {
              if (err) {
                debug("reconnect attempt error");
                self._reconnecting = false;
                self.reconnect();
                this.emitReserved("reconnect_error", err);
              } else {
                debug("reconnect success");
                self.onreconnect();
              }
            });
          }, delay);
          if (this.opts.autoUnref) {
            timer.unref();
          }
          this.subs.push(() => {
            this.clearTimeoutFn(timer);
          });
        }
      }
      /**
       * Called upon successful reconnect.
       *
       * @private
       */
      onreconnect() {
        const attempt = this.backoff.attempts;
        this._reconnecting = false;
        this.backoff.reset();
        this.emitReserved("reconnect", attempt);
      }
    };
    exports2.Manager = Manager;
  }
});

// node_modules/socket.io-client/build/cjs/index.js
var require_cjs5 = __commonJS({
  "node_modules/socket.io-client/build/cjs/index.js"(exports2, module2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.WebTransport = exports2.WebSocket = exports2.NodeWebSocket = exports2.XHR = exports2.NodeXHR = exports2.Fetch = exports2.Socket = exports2.Manager = exports2.protocol = void 0;
    exports2.io = lookup;
    exports2.connect = lookup;
    exports2.default = lookup;
    var url_js_1 = require_url();
    var manager_js_1 = require_manager();
    Object.defineProperty(exports2, "Manager", { enumerable: true, get: function() {
      return manager_js_1.Manager;
    } });
    var socket_js_1 = require_socket2();
    Object.defineProperty(exports2, "Socket", { enumerable: true, get: function() {
      return socket_js_1.Socket;
    } });
    var debug_1 = __importDefault(require_src());
    var debug = (0, debug_1.default)("socket.io-client");
    var cache = {};
    function lookup(uri, opts) {
      if (typeof uri === "object") {
        opts = uri;
        uri = void 0;
      }
      opts = opts || {};
      const parsed = (0, url_js_1.url)(uri, opts.path || "/socket.io");
      const source = parsed.source;
      const id = parsed.id;
      const path = parsed.path;
      const sameNamespace = cache[id] && path in cache[id]["nsps"];
      const newConnection = opts.forceNew || opts["force new connection"] || false === opts.multiplex || sameNamespace;
      let io;
      if (newConnection) {
        debug("ignoring socket cache for %s", source);
        io = new manager_js_1.Manager(source, opts);
      } else {
        if (!cache[id]) {
          debug("new io instance for %s", source);
          cache[id] = new manager_js_1.Manager(source, opts);
        }
        io = cache[id];
      }
      if (parsed.query && !opts.query) {
        opts.query = parsed.queryKey;
      }
      return io.socket(parsed.path, opts);
    }
    Object.assign(lookup, {
      Manager: manager_js_1.Manager,
      Socket: socket_js_1.Socket,
      io: lookup,
      connect: lookup
    });
    var socket_io_parser_1 = require_cjs4();
    Object.defineProperty(exports2, "protocol", { enumerable: true, get: function() {
      return socket_io_parser_1.protocol;
    } });
    var engine_io_client_1 = require_cjs3();
    Object.defineProperty(exports2, "Fetch", { enumerable: true, get: function() {
      return engine_io_client_1.Fetch;
    } });
    Object.defineProperty(exports2, "NodeXHR", { enumerable: true, get: function() {
      return engine_io_client_1.NodeXHR;
    } });
    Object.defineProperty(exports2, "XHR", { enumerable: true, get: function() {
      return engine_io_client_1.XHR;
    } });
    Object.defineProperty(exports2, "NodeWebSocket", { enumerable: true, get: function() {
      return engine_io_client_1.NodeWebSocket;
    } });
    Object.defineProperty(exports2, "WebSocket", { enumerable: true, get: function() {
      return engine_io_client_1.WebSocket;
    } });
    Object.defineProperty(exports2, "WebTransport", { enumerable: true, get: function() {
      return engine_io_client_1.WebTransport;
    } });
    module2.exports = lookup;
  }
});

// node_modules/flatted/cjs/index.js
var require_cjs6 = __commonJS({
  "node_modules/flatted/cjs/index.js"(exports2) {
    "use strict";
    var { parse: $parse, stringify: $stringify } = JSON;
    var { keys } = Object;
    var Primitive = String;
    var primitive = "string";
    var ignore = {};
    var object = "object";
    var noop = (_, value) => value;
    var primitives = (value) => value instanceof Primitive ? Primitive(value) : value;
    var Primitives = (_, value) => typeof value === primitive ? new Primitive(value) : value;
    var resolver = (input, lazy, parsed, $2) => (output) => {
      for (let ke = keys(output), { length } = ke, y = 0; y < length; y++) {
        const k = ke[y];
        const value = output[k];
        if (value instanceof Primitive) {
          const tmp = input[value];
          if (typeof tmp === object && !parsed.has(tmp)) {
            parsed.add(tmp);
            output[k] = ignore;
            lazy.push({ o: output, k, r: tmp });
          } else
            output[k] = $2.call(output, k, tmp);
        } else if (output[k] !== ignore)
          output[k] = $2.call(output, k, value);
      }
      return output;
    };
    var set = (known, input, value) => {
      const index = Primitive(input.push(value) - 1);
      known.set(value, index);
      return index;
    };
    var parse = (text, reviver) => {
      const input = $parse(text, Primitives).map(primitives);
      const $2 = reviver || noop;
      let value = input[0];
      if (typeof value === object && value) {
        const lazy = [];
        const revive = resolver(input, lazy, /* @__PURE__ */ new Set(), $2);
        value = revive(value);
        let i = 0;
        while (i < lazy.length) {
          const { o, k, r } = lazy[i++];
          o[k] = $2.call(o, k, revive(r));
        }
      }
      return $2.call({ "": value }, "", value);
    };
    exports2.parse = parse;
    var stringify = (value, replacer, space) => {
      const $2 = replacer && typeof replacer === object ? (k, v) => k === "" || -1 < replacer.indexOf(k) ? v : void 0 : replacer || noop;
      const known = /* @__PURE__ */ new Map();
      const input = [];
      const output = [];
      let i = +set(known, input, $2.call({ "": value }, "", value));
      let firstRun = !i;
      while (i < input.length) {
        firstRun = true;
        output[i] = $stringify(input[i++], replace, space);
      }
      return "[" + output.join(",") + "]";
      function replace(key, value2) {
        if (firstRun) {
          firstRun = !firstRun;
          return value2;
        }
        const after = $2.call(this, key, value2);
        switch (typeof after) {
          case object:
            if (after === null) return after;
          case primitive:
            return known.get(after) || set(known, input, after);
        }
        return after;
      }
    };
    exports2.stringify = stringify;
    var toJSON = (value) => $parse(stringify(value));
    exports2.toJSON = toJSON;
    var fromJSON = (value) => parse($stringify(value));
    exports2.fromJSON = fromJSON;
  }
});

// js/cursors.js
var require_cursors = __commonJS({
  "js/cursors.js"(exports2, module2) {
    function LERP(start, dest, speed) {
      return start + speed * (dest - start);
    }
    var LERP_SPEED = 0.25;
    var SEND_INTERVAL = 100;
    var CursorsHandler = class {
      constructor() {
        this.lastTimeMMsended = 0;
        this.lastMPsent = { x: 0, y: 0 };
        this.currentHandler = null;
        this.cursors = {};
        this.animationFrame = null;
        this.highlightedId = null;
      }
      // mouses_net
      addMouseMovementSharing(sendFunction) {
        const diagramArea = app.diagrams.$diagramArea[0];
        if (!diagramArea) {
          console.error("Couldnt find diagram area! aMMS");
          return;
        }
        this.currentHandler = (event) => {
          const now = Date.now();
          if (now - this.lastTimeMMsended >= SEND_INTERVAL) {
            const activeDiagram = app.diagrams.getCurrentDiagram();
            if (!activeDiagram) return;
            const editor = app.diagrams;
            if (editor) {
              const diagramX = activeDiagram._originX;
              const diagramY = activeDiagram._originY;
              const scale = app.diagrams.getZoomLevel();
              const rect = diagramArea.getBoundingClientRect();
              let diagram = activeDiagram._id;
              const dataToSend = {
                x: (event.clientX - rect.left) / scale - activeDiagram._originX,
                y: (event.clientY - rect.top) / scale - activeDiagram._originY,
                diagram
              };
              if (this.lastMPsent.x == dataToSend.x && this.lastMPsent.y == dataToSend.y)
                return;
              sendFunction(dataToSend);
              this.lastTimeMMsended = now;
              this.lastMPsent.x = dataToSend.x;
              this.lastMPsent.y = dataToSend.y;
            }
          }
        };
        diagramArea.addEventListener("mousemove", this.currentHandler);
        this.animate();
      }
      removeMouseMovementSharing() {
        const diagramArea = app.diagrams.$diagramArea[0];
        if (diagramArea && this.currentHandler) {
          diagramArea.removeEventListener("mousemove", this.currentHandler);
          this.currentHandler = null;
        }
        this.stopAnimation();
      }
      // mouses_view
      addCursor(id, name) {
        const container = app.diagrams.$diagramArea[0];
        const colors = [
          "#FF5733",
          // rojo-naranja
          "#33FF57",
          // verde
          "#3357FF",
          // azul
          "#F333FF",
          // magenta
          "#FFB833",
          // naranja
          "#33FFF3",
          // cian
          "#8E44AD",
          // púrpura
          "#2ECC71",
          // verde oscuro
          "#1ABC9C"
          // turquesa
        ];
        const foregroundColors = [
          "#000000",
          // para #FF5733
          "#000000",
          // para #33FF57
          "#FFFFFF",
          // para #3357FF
          "#000000",
          // para #F333FF
          "#000000",
          // para #FFB833
          "#000000",
          // para #33FFF3
          "#FFFFFF",
          // para #8E44AD
          "#000000",
          // para #2ECC71
          "#000000"
          // para #1ABC9C
        ];
        const i = Math.floor(Math.random() * colors.length);
        const color = colors[i];
        const fg = foregroundColors[i];
        const el = document.createElement("div");
        el.id = `cursor-${id}`;
        el.className = "live-share-cursor";
        el.innerHTML = `
      <svg style="fill: ${color}; width: 20px; filter: drop-shadow(1px 1px 1px rgba(0,0,0,0.4));" viewBox="0 0 24 24">
        <path d="M7,2l12,11.2l-5.8,0.5l3.3,7.3l-2.2,1l-3.2-7.4L7,19V2z"/>
      </svg>
      <div class="cursor-label" style="background: ${color}; color: ${fg};">${name}</div>
    `;
        container.appendChild(el);
        this.cursors[id] = {
          id,
          name,
          x: 0,
          y: 0,
          targetX: 0,
          targetY: 0,
          element: el
        };
      }
      removeCursor(id) {
        if (this.cursors[id]) {
          if (this.cursors[id].element) {
            this.cursors[id].element.style.display = "none";
            this.cursors[id].element.remove();
          }
          delete this.cursors[id];
        }
      }
      updateMousePosition({ id, x, y, diagram, name, zoom, originX, originY }) {
        if (!this.cursors[id]) {
          this.addCursor(id, name || "Anonymous");
        }
        this.cursors[id].targetX = x;
        this.cursors[id].targetY = y;
        this.cursors[id].diagram = diagram;
        this.cursors[id].zoom = zoom;
        this.cursors[id].originX = originX;
        this.cursors[id].originY = originY;
        const currentDiagram = app.diagrams.getCurrentDiagram();
        if (currentDiagram && currentDiagram._id === diagram) {
          this.cursors[id].element.style.display = "block";
        } else {
          this.cursors[id].element.style.display = "none";
        }
      }
      animate() {
        const scale = app.diagrams.getZoomLevel();
        for (let id in this.cursors) {
          const c = this.cursors[id];
          c.x = LERP(c.x, c.targetX, LERP_SPEED);
          c.y = LERP(c.y, c.targetY, LERP_SPEED);
          if (c.element) {
            const currentDiagram = app.diagrams.getCurrentDiagram();
            if (currentDiagram && currentDiagram._id === c.diagram) {
              const localScale = app.diagrams.getZoomLevel();
              const localOriginX = currentDiagram._originX;
              const localOriginY = currentDiagram._originY;
              const physicalX = (c.x + localOriginX) * localScale;
              const physicalY = (c.y + localOriginY) * localScale;
              c.element.style.transform = `translate(${physicalX}px, ${physicalY}px)`;
              c.element.style.display = "block";
            } else {
              c.element.style.display = "none";
            }
          }
        }
        this.animationFrame = requestAnimationFrame(() => this.animate());
      }
      stopAnimation() {
        if (this.animationFrame) {
          cancelAnimationFrame(this.animationFrame);
          this.animationFrame = null;
        }
      }
      setHighlight(id) {
        this.highlightedId = id;
        for (const [key, c] of Object.entries(this.cursors)) {
          if (key !== id && c.element) {
            c.element.style.zIndex = "100";
            c.element.style.filter = "none";
            const svg = c.element.querySelector("svg");
            if (svg) svg.style.transform = "scale(1)";
          }
        }
        if (id && this.cursors[id]) {
          const c = this.cursors[id];
          c.element.style.zIndex = "1000";
          c.element.style.filter = "drop-shadow(0 0 5px rgba(241, 196, 15, 0.6))";
          const svg = c.element.querySelector("svg");
          if (svg) svg.style.transform = "scale(1.15)";
        }
      }
      removeAllCursors() {
        for (const [key, value] of Object.entries(this.cursors)) {
          this.removeCursor(key);
        }
      }
    };
    module2.exports = { CursorsHandler };
  }
});

// js/client.js
var require_client = __commonJS({
  "js/client.js"(exports2, module2) {
    var io = require_cjs5();
    var fachada2 = require_fachada();
    var flatted2 = require_cjs6();
    var cursors_js = require_cursors();
    var cursors = new cursors_js.CursorsHandler();
    var socket = null;
    var current_room = null;
    var address = "";
    var users = {};
    var am_i_host = false;
    var remoteOpInProgress = false;
    var activeHighlights = {};
    var followingUserId = null;
    var userUpdateCallback = null;
    var originalGridVisible = true;
    var followOverlay = null;
    var followStyleElement = null;
    var lastKnownMouse = { x: 0, y: 0, diagram: null };
    var lastSentViewport = { originX: 0, originY: 0, zoom: 0, diagram: null };
    var lastViewportSyncTime = 0;
    var viewportWatcherInterval = null;
    var VIEWPORT_SYNC_THROTTLE = 30;
    var VIEWPORT_CHECK_INTERVAL = 50;
    var targetCamera = { x: 0, y: 0, zoom: 1, diagram: null };
    var currentCamera = { x: 0, y: 0, zoom: 1 };
    var followAnimationFrame = null;
    var ZOOM_PRECISION = 1e-3;
    var LERP_SPEED = 0.3;
    var lastAppliedSeq = 0;
    var selectionDebounceTimer = null;
    var currentLatency = -1;
    var latencyUpdateCallback = null;
    async function connectToServer(url, name, roomid) {
      removeChangesHook();
      return new Promise((resolve, reject) => {
        socket = io(url, {
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1e3,
          reconnectionDelayMax: 5e3,
          timeout: 1e4,
          auth: { username: name, room: roomid }
        });
        if (roomid && roomid !== -1) current_room = roomid;
        socket.on("user-joined", (data) => {
          if (!users[data.id]) users[data.id] = data.name;
          fachada2.INFO(`${data.name} joined`);
          if (userUpdateCallback) userUpdateCallback();
        });
        socket.on("current-users", (data) => {
          console.log("[LS] Received current-users:", data);
          data.forEach((u) => {
            if (!users[u.id]) users[u.id] = u.name;
          });
          if (userUpdateCallback) userUpdateCallback();
        });
        socket.on("is-host", (is_host) => {
          am_i_host = is_host;
          if (!am_i_host) fachada2.disableHostOptions();
          if (am_i_host) fachada2.hideLoadingOverlay();
          if (am_i_host) fachada2.INFO("You're the host");
        });
        socket.on("host-left", () => {
          console.log("[LS] Host left, session continues with new host");
          fachada2.WARN("Host changed. A new host has been assigned.");
        });
        socket.on("room-assigned", async (id) => {
          console.log("[LS] Room assigned: " + id);
          current_room = id;
          addChangesHook();
          startViewportWatcher();
          fachada2.hideLoadingOverlay();
          resolve(true);
        });
        socket.on("latency-response", () => {
          currentLatency = Math.round(Date.now() - lastPingTime);
          if (latencyUpdateCallback) latencyUpdateCallback(currentLatency);
        });
        socket.on("room-seq", (currentSeq) => {
          if (currentSeq < lastAppliedSeq) {
            console.log(
              `[LS] Sequence reset: was ${lastAppliedSeq}, now ${currentSeq}`
            );
            lastAppliedSeq = 0;
          }
          if (currentSeq > lastAppliedSeq) {
            console.log(
              `[LS] Requesting missed ops: ${lastAppliedSeq + 1} to ${currentSeq}`
            );
            socket.emit("request-missed-ops", { fromSeq: lastAppliedSeq });
          }
        });
        socket.on("missed-ops", (data) => {
          if (!data.ops || data.ops.length === 0) return;
          console.log(`[LS] Applying ${data.ops.length} missed operations`);
          data.ops.sort((a, b) => a.seq - b.seq);
          data.ops.forEach((entry) => {
            applyRemoteOperationWithSeq(entry.seq, entry.operation);
          });
        });
        socket.on("update-mouse-pos", (data) => {
          if (data.id === socket.id) return;
          cursors.updateMousePosition(data);
          if (followingUserId) {
            cursors.setHighlight(followingUserId);
          } else {
            cursors.setHighlight(null);
          }
          if (followingUserId === data.id) {
            applyViewportSync(data);
          }
        });
        socket.on("get-follow-sync", (data) => {
          if (socket && socket.connected) {
            const viewport = getCurrentViewportData();
            socket.emit("response-follow-sync", {
              requesterId: data.requesterId,
              viewportData: viewport
            });
          }
        });
        socket.on("follower-sync-data", (data) => {
          if (followingUserId === data.id) {
            const viewportData = data.viewportData || data;
            applyViewportSync(
              {
                id: data.id,
                diagram: viewportData.diagram,
                x: viewportData.x,
                y: viewportData.y,
                zoom: viewportData.zoom,
                originX: viewportData.originX,
                originY: viewportData.originY
              },
              true
            );
          }
        });
        socket.on("get-whole-document", (data) => {
          try {
            const projectObj = app.project.getProject();
            const cleanObject = app.repository.writeObject(projectObj);
            const str = flatted2.stringify(cleanObject);
            socket.emit("host-delivers-document", {
              to: data.requesterId,
              json: str
            });
          } catch (err) {
            fachada2.ERR("Error sending whole document.");
          }
        });
        socket.on("load-whole-document", (data) => {
          try {
            const projectObj = flatted2.parse(data.json);
            let openDiagramIds = [];
            let activeDiagramId = null;
            try {
              if (app.diagrams.getWorkingDiagrams) {
                openDiagramIds = app.diagrams.getWorkingDiagrams().map((d) => d._id);
              }
              if (app.diagrams.getCurrentDiagram()) {
                activeDiagramId = app.diagrams.getCurrentDiagram()._id;
              }
            } catch (e) {
              console.warn("[LS] Could not save workspace state", e);
            }
            app.repository.bypassConfirmation = true;
            app.project.loadFromJson(projectObj);
            app.repository.bypassConfirmation = false;
            try {
              openDiagramIds.forEach((id) => {
                const diag = app.repository.get(id);
                if (diag && diag instanceof type.Diagram) {
                  app.diagrams.openDiagram(diag);
                }
              });
              if (activeDiagramId) {
                const diag = app.repository.get(activeDiagramId);
                if (diag && diag instanceof type.Diagram) {
                  app.diagrams.setCurrentDiagram(diag);
                }
              }
            } catch (e) {
              console.warn("[LS] Could not restore workspace state", e);
            }
            fachada2.INFO("Document synchronized.");
          } catch (err) {
            fachada2.ERR("Error loading remote document:", err);
            console.error(err);
          } finally {
            fachada2.hideLoadingOverlay();
          }
        });
        socket.on("remote-operation", (data) => {
          remoteOpInProgress = true;
          try {
            const isOwn = data.socketId === socket.id;
            if (!isOwn) {
              const operation = flatted2.parse(data.operation);
              app.repository.doOperation(operation);
            }
            lastAppliedSeq = data.seq;
            app.diagrams.repaint();
            updateAllHighlights();
          } catch (err) {
            console.error("[LS] Operation Error:", err);
          } finally {
            remoteOpInProgress = false;
          }
        });
        socket.on("element-locked", ({ viewId, ownerId, color }) => {
          if (ownerId !== socket.id) {
            highlightElement(viewId, color);
          }
        });
        socket.on("element-unlocked", ({ viewId }) => {
          removeHighlight(viewId);
        });
        socket.on("user-left", (id) => {
          const userName = users[id] || "User";
          fachada2.INFO(`${userName} left`);
          delete users[id];
          cursors.removeCursor(id);
          if (followingUserId === id) {
            removeFollowEffects();
            followingUserId = null;
          }
          if (userUpdateCallback) userUpdateCallback();
        });
        socket.on("connect", () => {
          address = url;
          cursors.addMouseMovementSharing(sendMousePosition);
          fachada2.showLoadingOverlay();
          if (socket.recovered) {
            fachada2.INFO("Connection recovered!");
          }
          startPingMeasurement();
          if (socket.io && socket.io.engine) {
            socket.io.engine.on("pong", (latency) => {
              currentLatency = Math.round(latency);
              if (latencyUpdateCallback) latencyUpdateCallback(currentLatency);
            });
          }
        });
        socket.on("disconnect", (reason) => {
          console.log("[LS] Socket disconnected, reason:", reason);
          if (reason === "io server disconnect" || reason === "io client disconnect" || reason === "transport close") {
            disconnect();
          } else {
            fachada2.WARN("Connection lost. Reconnecting...");
            removeAllHighlights();
            cursors.removeAllCursors();
          }
        });
        socket.on("reconnect", (attempt) => {
          fachada2.INFO("Reconnected after " + attempt + " attempts.");
        });
        socket.on("connect_error", (err) => {
          console.error("Connect Error:", err);
          resolve(false);
        });
        document.addEventListener("visibilitychange", () => {
          if (!document.hidden && socket && socket.connected) {
            socket.emit("client-ping", { timestamp: Date.now() });
          }
        });
      });
    }
    function applyRemoteOperationWithSeq(seq, opStr) {
      if (seq <= lastAppliedSeq) return;
      remoteOpInProgress = true;
      try {
        const operation = flatted2.parse(opStr);
        app.repository.doOperation(operation);
        lastAppliedSeq = seq;
        app.diagrams.repaint();
        updateAllHighlights();
      } catch (err) {
        console.error("[LS] Operation Error:", err);
      } finally {
        remoteOpInProgress = false;
      }
    }
    var handleOperation = (operation) => {
      if (remoteOpInProgress || app.repository.bypassConfirmation) return;
      if (socket && socket.connected && current_room) {
        const str = flatted2.stringify(operation);
        socket.emit("sync-operation", str);
      }
    };
    var handleSelection = (models, views) => {
      if (!socket || !socket.connected) return;
      if (remoteOpInProgress) return;
      if (selectionDebounceTimer) {
        clearTimeout(selectionDebounceTimer);
      }
      selectionDebounceTimer = setTimeout(() => {
        selectionDebounceTimer = null;
        if (views && views.length > 0) {
          socket.emit(
            "lock-element",
            views.map((v) => v._id)
          );
        } else {
          socket.emit("unlock-elements");
        }
      }, 80);
    };
    var handleCommands = (commandId) => {
      if (remoteOpInProgress || !socket || !socket.connected) return;
    };
    function onDiagramChanged() {
      updateAllHighlights();
      syncViewportThrottled();
    }
    function addChangesHook() {
      removeChangesHook();
      app.repository.on("operationExecuted", handleOperation);
      app.commands.on("afterExecute", handleCommands);
      app.selections.on("selectionChanged", handleSelection);
      app.diagrams.on("currentDiagramChanged", onDiagramChanged);
      const diagramArea = app.diagrams.$diagramArea[0];
      if (diagramArea) {
        diagramArea.addEventListener("wheel", onDiagramWheel, { passive: true });
        diagramArea.addEventListener("mousedown", onDiagramMouseDown);
      }
    }
    function onDiagramWheel() {
      updateAllHighlights();
      checkViewportChange();
    }
    function checkViewportChange() {
      const currentDiagram = app.diagrams.getCurrentDiagram();
      if (!currentDiagram) return;
      const zoom = app.diagrams.getZoomLevel();
      const originX = currentDiagram._originX;
      const originY = currentDiagram._originY;
      const diagId = currentDiagram._id;
      const changed = Math.abs(lastSentViewport.originX - originX) > 0.1 || Math.abs(lastSentViewport.originY - originY) > 0.1 || Math.abs(lastSentViewport.zoom - zoom) > 1e-3 || lastSentViewport.diagram !== diagId;
      if (changed) {
        syncViewportThrottled();
        lastSentViewport.originX = originX;
        lastSentViewport.originY = originY;
        lastSentViewport.zoom = zoom;
        lastSentViewport.diagram = diagId;
      }
    }
    function startViewportWatcher() {
      stopViewportWatcher();
      const currentDiagram = app.diagrams.getCurrentDiagram();
      if (currentDiagram) {
        const zoom = app.diagrams.getZoomLevel();
        lastSentViewport = {
          originX: currentDiagram._originX,
          originY: currentDiagram._originY,
          zoom,
          diagram: currentDiagram._id
        };
        if (!lastKnownMouse.diagram) {
          lastKnownMouse.diagram = currentDiagram._id;
          lastKnownMouse.x = currentDiagram._originX;
          lastKnownMouse.y = currentDiagram._originY;
        }
      }
      viewportWatcherInterval = setInterval(
        checkViewportChange,
        VIEWPORT_CHECK_INTERVAL
      );
    }
    function stopViewportWatcher() {
      if (viewportWatcherInterval) {
        clearInterval(viewportWatcherInterval);
        viewportWatcherInterval = null;
      }
    }
    function syncViewportThrottled() {
      const now = Date.now();
      if (now - lastViewportSyncTime >= VIEWPORT_SYNC_THROTTLE) {
        sendMousePosition(lastKnownMouse);
        lastViewportSyncTime = now;
      }
    }
    function removeChangesHook() {
      app.repository.off("operationExecuted", handleOperation);
      app.commands.off("afterExecute", handleCommands);
      app.selections.off("selectionChanged", handleSelection);
      app.diagrams.off("currentDiagramChanged", onDiagramChanged);
      const diagramArea = app.diagrams.$diagramArea[0];
      if (diagramArea) {
        diagramArea.removeEventListener("wheel", onDiagramWheel);
        diagramArea.removeEventListener("mousedown", onDiagramMouseDown);
      }
    }
    var isPanning = false;
    function onDiagramMouseDown() {
      isPanning = true;
      const onMouseMove = () => {
        if (isPanning) {
          updateAllHighlights();
          syncViewportThrottled();
        }
      };
      const onMouseUp = () => {
        isPanning = false;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
    function highlightElement(viewId, color) {
      const view = app.repository.get(viewId);
      const diagramArea = app.diagrams.$diagramArea[0];
      if (view && view instanceof type.View) {
        removeHighlight(viewId);
        const hl = document.createElement("div");
        hl.className = "element-lock-highlight";
        hl.style.cssText = `
      position: absolute;
      border: 3px solid ${color};
      pointer-events: none;
      z-index: 5;
      box-sizing: border-box;
      display: none;
    `;
        diagramArea.appendChild(hl);
        activeHighlights[viewId] = { element: hl, color };
        updateAllHighlights();
      }
    }
    function removeHighlight(viewId) {
      if (activeHighlights[viewId]) {
        activeHighlights[viewId].element.remove();
        delete activeHighlights[viewId];
      }
    }
    function removeAllHighlights() {
      for (let viewId in activeHighlights) {
        activeHighlights[viewId].element.remove();
      }
      activeHighlights = {};
    }
    function updateAllHighlights() {
      const currentDiagram = app.diagrams.getCurrentDiagram();
      if (!currentDiagram) {
        for (let viewId in activeHighlights) {
          activeHighlights[viewId].element.style.display = "none";
        }
        return;
      }
      const zoom = app.diagrams.getZoomLevel();
      const originX = currentDiagram._originX;
      const originY = currentDiagram._originY;
      for (let viewId in activeHighlights) {
        const view = app.repository.get(viewId);
        if (view && view instanceof type.View && view._parent === currentDiagram) {
          const hlObj = activeHighlights[viewId];
          const hl = hlObj.element;
          const physicalX = (view.left + originX) * zoom;
          const physicalY = (view.top + originY) * zoom;
          const physicalW = view.width * zoom;
          const physicalH = view.height * zoom;
          hl.style.left = `${physicalX}px`;
          hl.style.top = `${physicalY}px`;
          hl.style.width = `${physicalW}px`;
          hl.style.height = `${physicalH}px`;
          hl.style.display = "block";
        } else {
          activeHighlights[viewId].element.style.display = "none";
        }
      }
    }
    function sendMousePosition(mouseData) {
      if (!(socket && socket.connected)) return;
      try {
        const { x, y, diagram } = mouseData;
        lastKnownMouse.x = x;
        lastKnownMouse.y = y;
        lastKnownMouse.diagram = diagram;
        const zoom = app.diagrams.getZoomLevel();
        const currentDiagram = app.diagrams.getCurrentDiagram();
        const originX = currentDiagram ? currentDiagram._originX : 0;
        const originY = currentDiagram ? currentDiagram._originY : 0;
        socket.emit("client-mouse-moved", {
          id: socket.id,
          x,
          y,
          diagram,
          zoom,
          originX,
          originY
        });
      } catch (e) {
        console.error("[LS] Error sending mouse position:", e);
      }
    }
    function requestDocument() {
      if (!(socket && socket.connected)) return;
      fachada2.showLoadingOverlay();
      socket.emit("request-doc");
    }
    var pingInterval = null;
    var lastPingTime = 0;
    var PING_INTERVAL = 5e3;
    function startPingMeasurement() {
      stopPingMeasurement();
      sendPing();
      pingInterval = setInterval(sendPing, PING_INTERVAL);
    }
    function sendPing() {
      if (socket && socket.connected) {
        lastPingTime = Date.now();
        socket.emit("latency-check");
      }
    }
    function stopPingMeasurement() {
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }
    }
    function disconnect() {
      stopPingMeasurement();
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      currentLatency = -1;
      address = "";
      current_room = null;
      stopViewportWatcher();
      removeAllHighlights();
      cursors.removeMouseMovementSharing();
      cursors.removeAllCursors();
      removeFollowEffects();
      fachada2.enableHostOptions();
      removeChangesHook();
      users = {};
      am_i_host = false;
      followingUserId = null;
      remoteOpInProgress = false;
      if (selectionDebounceTimer) {
        clearTimeout(selectionDebounceTimer);
        selectionDebounceTimer = null;
      }
      notifyDisconnect();
    }
    function getConnectedAddress() {
      return address;
    }
    function getCurrentRoom() {
      return current_room;
    }
    function getUsers() {
      return users;
    }
    function getSocketId() {
      return socket ? socket.id : null;
    }
    function getFollowingUserId() {
      return followingUserId;
    }
    function getLatency() {
      return currentLatency;
    }
    function onLatencyUpdate(callback) {
      latencyUpdateCallback = callback;
    }
    function setFollowingUserId(id) {
      if (followingUserId && !id) {
        try {
          app.preferences.set("diagramEditor.showGrid", originalGridVisible);
        } catch (e) {
          console.warn("[LS] Could not restore grid preference");
        }
        removeFollowEffects();
        stopFollowAnimation();
      } else if (!followingUserId && id) {
        try {
          originalGridVisible = app.preferences.get("diagramEditor.showGrid");
          app.preferences.set("diagramEditor.showGrid", true);
        } catch (e) {
          console.warn("[LS] Could not manage grid preference");
        }
        const diag = app.diagrams.getCurrentDiagram();
        if (diag) {
          currentCamera.x = diag._originX;
          currentCamera.y = diag._originY;
          currentCamera.zoom = app.diagrams.getZoomLevel();
        }
        applyFollowEffects(id);
        if (socket && socket.connected) {
          socket.emit("request-follow-sync", { targetId: id });
        }
      } else if (followingUserId && id && followingUserId !== id) {
        applyFollowEffects(id);
        if (socket && socket.connected) {
          socket.emit("request-follow-sync", { targetId: id });
        }
      }
      followingUserId = id;
    }
    function getCurrentViewportData() {
      try {
        const currentDiagram = app.diagrams.getCurrentDiagram();
        const zoom = app.diagrams.getZoomLevel();
        return {
          x: lastKnownMouse.x,
          y: lastKnownMouse.y,
          diagram: currentDiagram ? currentDiagram._id : null,
          zoom,
          originX: currentDiagram ? currentDiagram._originX : 0,
          originY: currentDiagram ? currentDiagram._originY : 0
        };
      } catch (e) {
        console.error("[LS] Error getting current viewport data:", e);
        return null;
      }
    }
    var FOLLOW_SCROLL_THRESHOLD = 200;
    function applyViewportSync(data, force = false) {
      try {
        const currentDiagram = app.diagrams.getCurrentDiagram();
        const currentZoom = app.diagrams.getZoomLevel();
        const zoom = data.zoom || currentZoom;
        let mouseX, mouseY;
        if (data.x !== void 0 && data.y !== void 0) {
          mouseX = data.x;
          mouseY = data.y;
        } else if (data.originX !== void 0 && data.originY !== void 0) {
          mouseX = data.originX + (data.x || 0);
          mouseY = data.originY + (data.y || 0);
        } else {
          mouseX = 0;
          mouseY = 0;
        }
        const diagramArea = app.diagrams.$diagramArea[0];
        const canvas = diagramArea ? diagramArea.querySelector("svg") : null;
        const viewWidth = canvas ? canvas.clientWidth : window.innerWidth - 220;
        const viewHeight = canvas ? canvas.clientHeight : window.innerHeight;
        const targetOriginX = mouseX - viewWidth / 2 / zoom;
        const targetOriginY = mouseY - viewHeight / 2 / zoom;
        if (data.diagram && (!currentDiagram || currentDiagram._id !== data.diagram)) {
          const targetDiag = app.repository.get(data.diagram);
          if (targetDiag && targetDiag instanceof type.Diagram) {
            app.diagrams.setCurrentDiagram(targetDiag);
            app.diagrams.repaint();
            currentCamera.x = targetOriginX;
            currentCamera.y = targetOriginY;
            currentCamera.zoom = zoom;
          }
        }
        targetCamera.x = targetOriginX;
        targetCamera.y = targetOriginY;
        targetCamera.zoom = zoom;
        targetCamera.diagram = data.diagram;
        const zoomDiff = Math.abs(targetCamera.zoom - currentZoom);
        const scrollXDiff = Math.abs(
          targetCamera.x - (currentDiagram ? currentDiagram._originX : 0)
        );
        const scrollYDiff = Math.abs(
          targetCamera.y - (currentDiagram ? currentDiagram._originY : 0)
        );
        const shouldScroll = force || !isPanning && (zoomDiff > ZOOM_PRECISION || scrollXDiff > FOLLOW_SCROLL_THRESHOLD || scrollYDiff > FOLLOW_SCROLL_THRESHOLD);
        if (shouldScroll) {
          if (zoomDiff > ZOOM_PRECISION || force) {
            app.diagrams.setZoomLevel(targetCamera.zoom);
            currentCamera.zoom = targetCamera.zoom;
          }
          startFollowAnimation();
          updateAllHighlights();
        }
      } catch (e) {
        console.error("[LS] Error syncing viewport following user:", e);
      }
    }
    function startFollowAnimation() {
      if (followAnimationFrame) return;
      function animate() {
        const diag = app.diagrams.getCurrentDiagram();
        if (!diag || !followingUserId) {
          followAnimationFrame = null;
          return;
        }
        const dx = targetCamera.x - diag._originX;
        const dy = targetCamera.y - diag._originY;
        const dz = targetCamera.zoom - app.diagrams.getZoomLevel();
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(dz) < 1e-3) {
          followAnimationFrame = null;
          return;
        }
        if (Math.abs(dz) > 1e-3) {
          app.diagrams.setZoomLevel(app.diagrams.getZoomLevel() + dz * LERP_SPEED);
        }
        app.diagrams.scrollTo(
          diag._originX + dx * LERP_SPEED,
          diag._originY + dy * LERP_SPEED
        );
        followAnimationFrame = requestAnimationFrame(animate);
      }
      followAnimationFrame = requestAnimationFrame(animate);
    }
    function stopFollowAnimation() {
      if (followAnimationFrame) {
        cancelAnimationFrame(followAnimationFrame);
        followAnimationFrame = null;
      }
    }
    function applyFollowEffects(targetId) {
      try {
        const userName = users[targetId] || "User";
        if (followOverlay) {
          followOverlay.remove();
        }
        followOverlay = document.createElement("div");
        followOverlay.id = "ls-follow-overlay";
        followOverlay.style.cssText = `
      position: absolute;
      top: 15px;
      right: 15px;
      padding: 6px 12px;
      background: #252525;
      border: 1px solid #444;
      border-left: 3px solid #f1c40f;
      border-radius: 2px;
      color: #ebebeb;
      font-family: 'Open Sans', sans-serif;
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 1000;
      box-shadow: 0 4px 10px rgba(0,0,0,0.4);
      pointer-events: auto;
      transition: all 0.3s ease;
    `;
        followStyleElement = document.createElement("style");
        followStyleElement.innerHTML = `
      @keyframes ls-slide-in {
        from { transform: translateX(20px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes ls-pulse {
        0% { transform: scale(1); opacity: 0.8; }
        50% { transform: scale(1.3); opacity: 0.4; }
        100% { transform: scale(1); opacity: 0.8; }
      }
    `;
        document.head.appendChild(followStyleElement);
        followOverlay.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 6px; height: 6px; background: #f1c40f; border-radius: 50%; animation: ls-pulse 2s infinite;"></div>
        <span style="font-weight: 400; color: #888; text-transform: uppercase; font-size: 9px; letter-spacing: 1px;">Following</span>
        <span style="font-weight: 400; color: #fff; font-size: 12px;">${userName}</span>
      </div>
      <div id="ls-stop-follow" style="
        cursor: pointer;
        padding: 2px 6px;
        background: rgba(255, 255, 255, 0.05);
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 2px;
        font-size: 10px;
        color: #888;
        transition: all 0.2s;
      " title="Stop following">\u2715</div>
    `;
        const diagramArea = app.diagrams.$diagramArea[0];
        if (diagramArea) {
          diagramArea.appendChild(followOverlay);
          document.getElementById("ls-stop-follow").onclick = (e) => {
            e.stopPropagation();
            setFollowingUserId(null);
            if (userUpdateCallback) userUpdateCallback();
          };
        }
      } catch (e) {
        console.error("[LS] Error applying follow effects:", e);
      }
    }
    function removeFollowEffects() {
      try {
        if (followOverlay) {
          followOverlay.style.opacity = "0";
          followOverlay.style.transform = "translateX(20px)";
          setTimeout(() => {
            if (followOverlay) {
              followOverlay.remove();
              followOverlay = null;
            }
          }, 300);
        }
        if (followStyleElement) {
          followStyleElement.remove();
          followStyleElement = null;
        }
      } catch (e) {
        console.error("[LS] Error removing follow effects:", e);
      }
    }
    var disconnectCallback = null;
    function onUserUpdate(callback) {
      userUpdateCallback = callback;
    }
    function onDisconnect(callback) {
      disconnectCallback = callback;
    }
    function notifyDisconnect() {
      if (disconnectCallback) disconnectCallback();
    }
    module2.exports = {
      connectToServer,
      sendMousePosition,
      disconnect,
      getConnectedAddress,
      requestDocument,
      getCurrentRoom,
      getUsers,
      getSocketId,
      getFollowingUserId,
      setFollowingUserId,
      getLatency,
      onLatencyUpdate,
      onUserUpdate,
      onDisconnect
    };
  }
});

// node_modules/negotiator/lib/charset.js
var require_charset = __commonJS({
  "node_modules/negotiator/lib/charset.js"(exports2, module2) {
    "use strict";
    module2.exports = preferredCharsets;
    module2.exports.preferredCharsets = preferredCharsets;
    var simpleCharsetRegExp = /^\s*([^\s;]+)\s*(?:;(.*))?$/;
    function parseAcceptCharset(accept) {
      var accepts = accept.split(",");
      for (var i = 0, j = 0; i < accepts.length; i++) {
        var charset = parseCharset(accepts[i].trim(), i);
        if (charset) {
          accepts[j++] = charset;
        }
      }
      accepts.length = j;
      return accepts;
    }
    function parseCharset(str, i) {
      var match = simpleCharsetRegExp.exec(str);
      if (!match) return null;
      var charset = match[1];
      var q = 1;
      if (match[2]) {
        var params = match[2].split(";");
        for (var j = 0; j < params.length; j++) {
          var p = params[j].trim().split("=");
          if (p[0] === "q") {
            q = parseFloat(p[1]);
            break;
          }
        }
      }
      return {
        charset,
        q,
        i
      };
    }
    function getCharsetPriority(charset, accepted, index) {
      var priority = { o: -1, q: 0, s: 0 };
      for (var i = 0; i < accepted.length; i++) {
        var spec = specify(charset, accepted[i], index);
        if (spec && (priority.s - spec.s || priority.q - spec.q || priority.o - spec.o) < 0) {
          priority = spec;
        }
      }
      return priority;
    }
    function specify(charset, spec, index) {
      var s = 0;
      if (spec.charset.toLowerCase() === charset.toLowerCase()) {
        s |= 1;
      } else if (spec.charset !== "*") {
        return null;
      }
      return {
        i: index,
        o: spec.i,
        q: spec.q,
        s
      };
    }
    function preferredCharsets(accept, provided) {
      var accepts = parseAcceptCharset(accept === void 0 ? "*" : accept || "");
      if (!provided) {
        return accepts.filter(isQuality).sort(compareSpecs).map(getFullCharset);
      }
      var priorities = provided.map(function getPriority(type2, index) {
        return getCharsetPriority(type2, accepts, index);
      });
      return priorities.filter(isQuality).sort(compareSpecs).map(function getCharset(priority) {
        return provided[priorities.indexOf(priority)];
      });
    }
    function compareSpecs(a, b) {
      return b.q - a.q || b.s - a.s || a.o - b.o || a.i - b.i || 0;
    }
    function getFullCharset(spec) {
      return spec.charset;
    }
    function isQuality(spec) {
      return spec.q > 0;
    }
  }
});

// node_modules/negotiator/lib/encoding.js
var require_encoding = __commonJS({
  "node_modules/negotiator/lib/encoding.js"(exports2, module2) {
    "use strict";
    module2.exports = preferredEncodings;
    module2.exports.preferredEncodings = preferredEncodings;
    var simpleEncodingRegExp = /^\s*([^\s;]+)\s*(?:;(.*))?$/;
    function parseAcceptEncoding(accept) {
      var accepts = accept.split(",");
      var hasIdentity = false;
      var minQuality = 1;
      for (var i = 0, j = 0; i < accepts.length; i++) {
        var encoding = parseEncoding(accepts[i].trim(), i);
        if (encoding) {
          accepts[j++] = encoding;
          hasIdentity = hasIdentity || specify("identity", encoding);
          minQuality = Math.min(minQuality, encoding.q || 1);
        }
      }
      if (!hasIdentity) {
        accepts[j++] = {
          encoding: "identity",
          q: minQuality,
          i
        };
      }
      accepts.length = j;
      return accepts;
    }
    function parseEncoding(str, i) {
      var match = simpleEncodingRegExp.exec(str);
      if (!match) return null;
      var encoding = match[1];
      var q = 1;
      if (match[2]) {
        var params = match[2].split(";");
        for (var j = 0; j < params.length; j++) {
          var p = params[j].trim().split("=");
          if (p[0] === "q") {
            q = parseFloat(p[1]);
            break;
          }
        }
      }
      return {
        encoding,
        q,
        i
      };
    }
    function getEncodingPriority(encoding, accepted, index) {
      var priority = { o: -1, q: 0, s: 0 };
      for (var i = 0; i < accepted.length; i++) {
        var spec = specify(encoding, accepted[i], index);
        if (spec && (priority.s - spec.s || priority.q - spec.q || priority.o - spec.o) < 0) {
          priority = spec;
        }
      }
      return priority;
    }
    function specify(encoding, spec, index) {
      var s = 0;
      if (spec.encoding.toLowerCase() === encoding.toLowerCase()) {
        s |= 1;
      } else if (spec.encoding !== "*") {
        return null;
      }
      return {
        i: index,
        o: spec.i,
        q: spec.q,
        s
      };
    }
    function preferredEncodings(accept, provided) {
      var accepts = parseAcceptEncoding(accept || "");
      if (!provided) {
        return accepts.filter(isQuality).sort(compareSpecs).map(getFullEncoding);
      }
      var priorities = provided.map(function getPriority(type2, index) {
        return getEncodingPriority(type2, accepts, index);
      });
      return priorities.filter(isQuality).sort(compareSpecs).map(function getEncoding(priority) {
        return provided[priorities.indexOf(priority)];
      });
    }
    function compareSpecs(a, b) {
      return b.q - a.q || b.s - a.s || a.o - b.o || a.i - b.i || 0;
    }
    function getFullEncoding(spec) {
      return spec.encoding;
    }
    function isQuality(spec) {
      return spec.q > 0;
    }
  }
});

// node_modules/negotiator/lib/language.js
var require_language = __commonJS({
  "node_modules/negotiator/lib/language.js"(exports2, module2) {
    "use strict";
    module2.exports = preferredLanguages;
    module2.exports.preferredLanguages = preferredLanguages;
    var simpleLanguageRegExp = /^\s*([^\s\-;]+)(?:-([^\s;]+))?\s*(?:;(.*))?$/;
    function parseAcceptLanguage(accept) {
      var accepts = accept.split(",");
      for (var i = 0, j = 0; i < accepts.length; i++) {
        var language = parseLanguage(accepts[i].trim(), i);
        if (language) {
          accepts[j++] = language;
        }
      }
      accepts.length = j;
      return accepts;
    }
    function parseLanguage(str, i) {
      var match = simpleLanguageRegExp.exec(str);
      if (!match) return null;
      var prefix = match[1];
      var suffix = match[2];
      var full = prefix;
      if (suffix) full += "-" + suffix;
      var q = 1;
      if (match[3]) {
        var params = match[3].split(";");
        for (var j = 0; j < params.length; j++) {
          var p = params[j].split("=");
          if (p[0] === "q") q = parseFloat(p[1]);
        }
      }
      return {
        prefix,
        suffix,
        q,
        i,
        full
      };
    }
    function getLanguagePriority(language, accepted, index) {
      var priority = { o: -1, q: 0, s: 0 };
      for (var i = 0; i < accepted.length; i++) {
        var spec = specify(language, accepted[i], index);
        if (spec && (priority.s - spec.s || priority.q - spec.q || priority.o - spec.o) < 0) {
          priority = spec;
        }
      }
      return priority;
    }
    function specify(language, spec, index) {
      var p = parseLanguage(language);
      if (!p) return null;
      var s = 0;
      if (spec.full.toLowerCase() === p.full.toLowerCase()) {
        s |= 4;
      } else if (spec.prefix.toLowerCase() === p.full.toLowerCase()) {
        s |= 2;
      } else if (spec.full.toLowerCase() === p.prefix.toLowerCase()) {
        s |= 1;
      } else if (spec.full !== "*") {
        return null;
      }
      return {
        i: index,
        o: spec.i,
        q: spec.q,
        s
      };
    }
    function preferredLanguages(accept, provided) {
      var accepts = parseAcceptLanguage(accept === void 0 ? "*" : accept || "");
      if (!provided) {
        return accepts.filter(isQuality).sort(compareSpecs).map(getFullLanguage);
      }
      var priorities = provided.map(function getPriority(type2, index) {
        return getLanguagePriority(type2, accepts, index);
      });
      return priorities.filter(isQuality).sort(compareSpecs).map(function getLanguage(priority) {
        return provided[priorities.indexOf(priority)];
      });
    }
    function compareSpecs(a, b) {
      return b.q - a.q || b.s - a.s || a.o - b.o || a.i - b.i || 0;
    }
    function getFullLanguage(spec) {
      return spec.full;
    }
    function isQuality(spec) {
      return spec.q > 0;
    }
  }
});

// node_modules/negotiator/lib/mediaType.js
var require_mediaType = __commonJS({
  "node_modules/negotiator/lib/mediaType.js"(exports2, module2) {
    "use strict";
    module2.exports = preferredMediaTypes;
    module2.exports.preferredMediaTypes = preferredMediaTypes;
    var simpleMediaTypeRegExp = /^\s*([^\s\/;]+)\/([^;\s]+)\s*(?:;(.*))?$/;
    function parseAccept(accept) {
      var accepts = splitMediaTypes(accept);
      for (var i = 0, j = 0; i < accepts.length; i++) {
        var mediaType = parseMediaType(accepts[i].trim(), i);
        if (mediaType) {
          accepts[j++] = mediaType;
        }
      }
      accepts.length = j;
      return accepts;
    }
    function parseMediaType(str, i) {
      var match = simpleMediaTypeRegExp.exec(str);
      if (!match) return null;
      var params = /* @__PURE__ */ Object.create(null);
      var q = 1;
      var subtype = match[2];
      var type2 = match[1];
      if (match[3]) {
        var kvps = splitParameters(match[3]).map(splitKeyValuePair);
        for (var j = 0; j < kvps.length; j++) {
          var pair = kvps[j];
          var key = pair[0].toLowerCase();
          var val = pair[1];
          var value = val && val[0] === '"' && val[val.length - 1] === '"' ? val.substr(1, val.length - 2) : val;
          if (key === "q") {
            q = parseFloat(value);
            break;
          }
          params[key] = value;
        }
      }
      return {
        type: type2,
        subtype,
        params,
        q,
        i
      };
    }
    function getMediaTypePriority(type2, accepted, index) {
      var priority = { o: -1, q: 0, s: 0 };
      for (var i = 0; i < accepted.length; i++) {
        var spec = specify(type2, accepted[i], index);
        if (spec && (priority.s - spec.s || priority.q - spec.q || priority.o - spec.o) < 0) {
          priority = spec;
        }
      }
      return priority;
    }
    function specify(type2, spec, index) {
      var p = parseMediaType(type2);
      var s = 0;
      if (!p) {
        return null;
      }
      if (spec.type.toLowerCase() == p.type.toLowerCase()) {
        s |= 4;
      } else if (spec.type != "*") {
        return null;
      }
      if (spec.subtype.toLowerCase() == p.subtype.toLowerCase()) {
        s |= 2;
      } else if (spec.subtype != "*") {
        return null;
      }
      var keys = Object.keys(spec.params);
      if (keys.length > 0) {
        if (keys.every(function(k) {
          return spec.params[k] == "*" || (spec.params[k] || "").toLowerCase() == (p.params[k] || "").toLowerCase();
        })) {
          s |= 1;
        } else {
          return null;
        }
      }
      return {
        i: index,
        o: spec.i,
        q: spec.q,
        s
      };
    }
    function preferredMediaTypes(accept, provided) {
      var accepts = parseAccept(accept === void 0 ? "*/*" : accept || "");
      if (!provided) {
        return accepts.filter(isQuality).sort(compareSpecs).map(getFullType);
      }
      var priorities = provided.map(function getPriority(type2, index) {
        return getMediaTypePriority(type2, accepts, index);
      });
      return priorities.filter(isQuality).sort(compareSpecs).map(function getType(priority) {
        return provided[priorities.indexOf(priority)];
      });
    }
    function compareSpecs(a, b) {
      return b.q - a.q || b.s - a.s || a.o - b.o || a.i - b.i || 0;
    }
    function getFullType(spec) {
      return spec.type + "/" + spec.subtype;
    }
    function isQuality(spec) {
      return spec.q > 0;
    }
    function quoteCount(string) {
      var count = 0;
      var index = 0;
      while ((index = string.indexOf('"', index)) !== -1) {
        count++;
        index++;
      }
      return count;
    }
    function splitKeyValuePair(str) {
      var index = str.indexOf("=");
      var key;
      var val;
      if (index === -1) {
        key = str;
      } else {
        key = str.substr(0, index);
        val = str.substr(index + 1);
      }
      return [key, val];
    }
    function splitMediaTypes(accept) {
      var accepts = accept.split(",");
      for (var i = 1, j = 0; i < accepts.length; i++) {
        if (quoteCount(accepts[j]) % 2 == 0) {
          accepts[++j] = accepts[i];
        } else {
          accepts[j] += "," + accepts[i];
        }
      }
      accepts.length = j + 1;
      return accepts;
    }
    function splitParameters(str) {
      var parameters = str.split(";");
      for (var i = 1, j = 0; i < parameters.length; i++) {
        if (quoteCount(parameters[j]) % 2 == 0) {
          parameters[++j] = parameters[i];
        } else {
          parameters[j] += ";" + parameters[i];
        }
      }
      parameters.length = j + 1;
      for (var i = 0; i < parameters.length; i++) {
        parameters[i] = parameters[i].trim();
      }
      return parameters;
    }
  }
});

// node_modules/negotiator/index.js
var require_negotiator = __commonJS({
  "node_modules/negotiator/index.js"(exports2, module2) {
    "use strict";
    var preferredCharsets = require_charset();
    var preferredEncodings = require_encoding();
    var preferredLanguages = require_language();
    var preferredMediaTypes = require_mediaType();
    module2.exports = Negotiator;
    module2.exports.Negotiator = Negotiator;
    function Negotiator(request) {
      if (!(this instanceof Negotiator)) {
        return new Negotiator(request);
      }
      this.request = request;
    }
    Negotiator.prototype.charset = function charset(available) {
      var set = this.charsets(available);
      return set && set[0];
    };
    Negotiator.prototype.charsets = function charsets(available) {
      return preferredCharsets(this.request.headers["accept-charset"], available);
    };
    Negotiator.prototype.encoding = function encoding(available) {
      var set = this.encodings(available);
      return set && set[0];
    };
    Negotiator.prototype.encodings = function encodings(available) {
      return preferredEncodings(this.request.headers["accept-encoding"], available);
    };
    Negotiator.prototype.language = function language(available) {
      var set = this.languages(available);
      return set && set[0];
    };
    Negotiator.prototype.languages = function languages(available) {
      return preferredLanguages(this.request.headers["accept-language"], available);
    };
    Negotiator.prototype.mediaType = function mediaType(available) {
      var set = this.mediaTypes(available);
      return set && set[0];
    };
    Negotiator.prototype.mediaTypes = function mediaTypes(available) {
      return preferredMediaTypes(this.request.headers.accept, available);
    };
    Negotiator.prototype.preferredCharset = Negotiator.prototype.charset;
    Negotiator.prototype.preferredCharsets = Negotiator.prototype.charsets;
    Negotiator.prototype.preferredEncoding = Negotiator.prototype.encoding;
    Negotiator.prototype.preferredEncodings = Negotiator.prototype.encodings;
    Negotiator.prototype.preferredLanguage = Negotiator.prototype.language;
    Negotiator.prototype.preferredLanguages = Negotiator.prototype.languages;
    Negotiator.prototype.preferredMediaType = Negotiator.prototype.mediaType;
    Negotiator.prototype.preferredMediaTypes = Negotiator.prototype.mediaTypes;
  }
});

// node_modules/mime-db/db.json
var require_db = __commonJS({
  "node_modules/mime-db/db.json"(exports2, module2) {
    module2.exports = {
      "application/1d-interleaved-parityfec": {
        source: "iana"
      },
      "application/3gpdash-qoe-report+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/3gpp-ims+xml": {
        source: "iana",
        compressible: true
      },
      "application/3gpphal+json": {
        source: "iana",
        compressible: true
      },
      "application/3gpphalforms+json": {
        source: "iana",
        compressible: true
      },
      "application/a2l": {
        source: "iana"
      },
      "application/ace+cbor": {
        source: "iana"
      },
      "application/activemessage": {
        source: "iana"
      },
      "application/activity+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-costmap+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-costmapfilter+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-directory+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-endpointcost+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-endpointcostparams+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-endpointprop+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-endpointpropparams+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-error+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-networkmap+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-networkmapfilter+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-updatestreamcontrol+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-updatestreamparams+json": {
        source: "iana",
        compressible: true
      },
      "application/aml": {
        source: "iana"
      },
      "application/andrew-inset": {
        source: "iana",
        extensions: ["ez"]
      },
      "application/applefile": {
        source: "iana"
      },
      "application/applixware": {
        source: "apache",
        extensions: ["aw"]
      },
      "application/at+jwt": {
        source: "iana"
      },
      "application/atf": {
        source: "iana"
      },
      "application/atfx": {
        source: "iana"
      },
      "application/atom+xml": {
        source: "iana",
        compressible: true,
        extensions: ["atom"]
      },
      "application/atomcat+xml": {
        source: "iana",
        compressible: true,
        extensions: ["atomcat"]
      },
      "application/atomdeleted+xml": {
        source: "iana",
        compressible: true,
        extensions: ["atomdeleted"]
      },
      "application/atomicmail": {
        source: "iana"
      },
      "application/atomsvc+xml": {
        source: "iana",
        compressible: true,
        extensions: ["atomsvc"]
      },
      "application/atsc-dwd+xml": {
        source: "iana",
        compressible: true,
        extensions: ["dwd"]
      },
      "application/atsc-dynamic-event-message": {
        source: "iana"
      },
      "application/atsc-held+xml": {
        source: "iana",
        compressible: true,
        extensions: ["held"]
      },
      "application/atsc-rdt+json": {
        source: "iana",
        compressible: true
      },
      "application/atsc-rsat+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rsat"]
      },
      "application/atxml": {
        source: "iana"
      },
      "application/auth-policy+xml": {
        source: "iana",
        compressible: true
      },
      "application/bacnet-xdd+zip": {
        source: "iana",
        compressible: false
      },
      "application/batch-smtp": {
        source: "iana"
      },
      "application/bdoc": {
        compressible: false,
        extensions: ["bdoc"]
      },
      "application/beep+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/calendar+json": {
        source: "iana",
        compressible: true
      },
      "application/calendar+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xcs"]
      },
      "application/call-completion": {
        source: "iana"
      },
      "application/cals-1840": {
        source: "iana"
      },
      "application/captive+json": {
        source: "iana",
        compressible: true
      },
      "application/cbor": {
        source: "iana"
      },
      "application/cbor-seq": {
        source: "iana"
      },
      "application/cccex": {
        source: "iana"
      },
      "application/ccmp+xml": {
        source: "iana",
        compressible: true
      },
      "application/ccxml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["ccxml"]
      },
      "application/cdfx+xml": {
        source: "iana",
        compressible: true,
        extensions: ["cdfx"]
      },
      "application/cdmi-capability": {
        source: "iana",
        extensions: ["cdmia"]
      },
      "application/cdmi-container": {
        source: "iana",
        extensions: ["cdmic"]
      },
      "application/cdmi-domain": {
        source: "iana",
        extensions: ["cdmid"]
      },
      "application/cdmi-object": {
        source: "iana",
        extensions: ["cdmio"]
      },
      "application/cdmi-queue": {
        source: "iana",
        extensions: ["cdmiq"]
      },
      "application/cdni": {
        source: "iana"
      },
      "application/cea": {
        source: "iana"
      },
      "application/cea-2018+xml": {
        source: "iana",
        compressible: true
      },
      "application/cellml+xml": {
        source: "iana",
        compressible: true
      },
      "application/cfw": {
        source: "iana"
      },
      "application/city+json": {
        source: "iana",
        compressible: true
      },
      "application/clr": {
        source: "iana"
      },
      "application/clue+xml": {
        source: "iana",
        compressible: true
      },
      "application/clue_info+xml": {
        source: "iana",
        compressible: true
      },
      "application/cms": {
        source: "iana"
      },
      "application/cnrp+xml": {
        source: "iana",
        compressible: true
      },
      "application/coap-group+json": {
        source: "iana",
        compressible: true
      },
      "application/coap-payload": {
        source: "iana"
      },
      "application/commonground": {
        source: "iana"
      },
      "application/conference-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/cose": {
        source: "iana"
      },
      "application/cose-key": {
        source: "iana"
      },
      "application/cose-key-set": {
        source: "iana"
      },
      "application/cpl+xml": {
        source: "iana",
        compressible: true,
        extensions: ["cpl"]
      },
      "application/csrattrs": {
        source: "iana"
      },
      "application/csta+xml": {
        source: "iana",
        compressible: true
      },
      "application/cstadata+xml": {
        source: "iana",
        compressible: true
      },
      "application/csvm+json": {
        source: "iana",
        compressible: true
      },
      "application/cu-seeme": {
        source: "apache",
        extensions: ["cu"]
      },
      "application/cwt": {
        source: "iana"
      },
      "application/cybercash": {
        source: "iana"
      },
      "application/dart": {
        compressible: true
      },
      "application/dash+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mpd"]
      },
      "application/dash-patch+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mpp"]
      },
      "application/dashdelta": {
        source: "iana"
      },
      "application/davmount+xml": {
        source: "iana",
        compressible: true,
        extensions: ["davmount"]
      },
      "application/dca-rft": {
        source: "iana"
      },
      "application/dcd": {
        source: "iana"
      },
      "application/dec-dx": {
        source: "iana"
      },
      "application/dialog-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/dicom": {
        source: "iana"
      },
      "application/dicom+json": {
        source: "iana",
        compressible: true
      },
      "application/dicom+xml": {
        source: "iana",
        compressible: true
      },
      "application/dii": {
        source: "iana"
      },
      "application/dit": {
        source: "iana"
      },
      "application/dns": {
        source: "iana"
      },
      "application/dns+json": {
        source: "iana",
        compressible: true
      },
      "application/dns-message": {
        source: "iana"
      },
      "application/docbook+xml": {
        source: "apache",
        compressible: true,
        extensions: ["dbk"]
      },
      "application/dots+cbor": {
        source: "iana"
      },
      "application/dskpp+xml": {
        source: "iana",
        compressible: true
      },
      "application/dssc+der": {
        source: "iana",
        extensions: ["dssc"]
      },
      "application/dssc+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xdssc"]
      },
      "application/dvcs": {
        source: "iana"
      },
      "application/ecmascript": {
        source: "iana",
        compressible: true,
        extensions: ["es", "ecma"]
      },
      "application/edi-consent": {
        source: "iana"
      },
      "application/edi-x12": {
        source: "iana",
        compressible: false
      },
      "application/edifact": {
        source: "iana",
        compressible: false
      },
      "application/efi": {
        source: "iana"
      },
      "application/elm+json": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/elm+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.cap+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/emergencycalldata.comment+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.control+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.deviceinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.ecall.msd": {
        source: "iana"
      },
      "application/emergencycalldata.providerinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.serviceinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.subscriberinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.veds+xml": {
        source: "iana",
        compressible: true
      },
      "application/emma+xml": {
        source: "iana",
        compressible: true,
        extensions: ["emma"]
      },
      "application/emotionml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["emotionml"]
      },
      "application/encaprtp": {
        source: "iana"
      },
      "application/epp+xml": {
        source: "iana",
        compressible: true
      },
      "application/epub+zip": {
        source: "iana",
        compressible: false,
        extensions: ["epub"]
      },
      "application/eshop": {
        source: "iana"
      },
      "application/exi": {
        source: "iana",
        extensions: ["exi"]
      },
      "application/expect-ct-report+json": {
        source: "iana",
        compressible: true
      },
      "application/express": {
        source: "iana",
        extensions: ["exp"]
      },
      "application/fastinfoset": {
        source: "iana"
      },
      "application/fastsoap": {
        source: "iana"
      },
      "application/fdt+xml": {
        source: "iana",
        compressible: true,
        extensions: ["fdt"]
      },
      "application/fhir+json": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/fhir+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/fido.trusted-apps+json": {
        compressible: true
      },
      "application/fits": {
        source: "iana"
      },
      "application/flexfec": {
        source: "iana"
      },
      "application/font-sfnt": {
        source: "iana"
      },
      "application/font-tdpfr": {
        source: "iana",
        extensions: ["pfr"]
      },
      "application/font-woff": {
        source: "iana",
        compressible: false
      },
      "application/framework-attributes+xml": {
        source: "iana",
        compressible: true
      },
      "application/geo+json": {
        source: "iana",
        compressible: true,
        extensions: ["geojson"]
      },
      "application/geo+json-seq": {
        source: "iana"
      },
      "application/geopackage+sqlite3": {
        source: "iana"
      },
      "application/geoxacml+xml": {
        source: "iana",
        compressible: true
      },
      "application/gltf-buffer": {
        source: "iana"
      },
      "application/gml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["gml"]
      },
      "application/gpx+xml": {
        source: "apache",
        compressible: true,
        extensions: ["gpx"]
      },
      "application/gxf": {
        source: "apache",
        extensions: ["gxf"]
      },
      "application/gzip": {
        source: "iana",
        compressible: false,
        extensions: ["gz"]
      },
      "application/h224": {
        source: "iana"
      },
      "application/held+xml": {
        source: "iana",
        compressible: true
      },
      "application/hjson": {
        extensions: ["hjson"]
      },
      "application/http": {
        source: "iana"
      },
      "application/hyperstudio": {
        source: "iana",
        extensions: ["stk"]
      },
      "application/ibe-key-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/ibe-pkg-reply+xml": {
        source: "iana",
        compressible: true
      },
      "application/ibe-pp-data": {
        source: "iana"
      },
      "application/iges": {
        source: "iana"
      },
      "application/im-iscomposing+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/index": {
        source: "iana"
      },
      "application/index.cmd": {
        source: "iana"
      },
      "application/index.obj": {
        source: "iana"
      },
      "application/index.response": {
        source: "iana"
      },
      "application/index.vnd": {
        source: "iana"
      },
      "application/inkml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["ink", "inkml"]
      },
      "application/iotp": {
        source: "iana"
      },
      "application/ipfix": {
        source: "iana",
        extensions: ["ipfix"]
      },
      "application/ipp": {
        source: "iana"
      },
      "application/isup": {
        source: "iana"
      },
      "application/its+xml": {
        source: "iana",
        compressible: true,
        extensions: ["its"]
      },
      "application/java-archive": {
        source: "apache",
        compressible: false,
        extensions: ["jar", "war", "ear"]
      },
      "application/java-serialized-object": {
        source: "apache",
        compressible: false,
        extensions: ["ser"]
      },
      "application/java-vm": {
        source: "apache",
        compressible: false,
        extensions: ["class"]
      },
      "application/javascript": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["js", "mjs"]
      },
      "application/jf2feed+json": {
        source: "iana",
        compressible: true
      },
      "application/jose": {
        source: "iana"
      },
      "application/jose+json": {
        source: "iana",
        compressible: true
      },
      "application/jrd+json": {
        source: "iana",
        compressible: true
      },
      "application/jscalendar+json": {
        source: "iana",
        compressible: true
      },
      "application/json": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["json", "map"]
      },
      "application/json-patch+json": {
        source: "iana",
        compressible: true
      },
      "application/json-seq": {
        source: "iana"
      },
      "application/json5": {
        extensions: ["json5"]
      },
      "application/jsonml+json": {
        source: "apache",
        compressible: true,
        extensions: ["jsonml"]
      },
      "application/jwk+json": {
        source: "iana",
        compressible: true
      },
      "application/jwk-set+json": {
        source: "iana",
        compressible: true
      },
      "application/jwt": {
        source: "iana"
      },
      "application/kpml-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/kpml-response+xml": {
        source: "iana",
        compressible: true
      },
      "application/ld+json": {
        source: "iana",
        compressible: true,
        extensions: ["jsonld"]
      },
      "application/lgr+xml": {
        source: "iana",
        compressible: true,
        extensions: ["lgr"]
      },
      "application/link-format": {
        source: "iana"
      },
      "application/load-control+xml": {
        source: "iana",
        compressible: true
      },
      "application/lost+xml": {
        source: "iana",
        compressible: true,
        extensions: ["lostxml"]
      },
      "application/lostsync+xml": {
        source: "iana",
        compressible: true
      },
      "application/lpf+zip": {
        source: "iana",
        compressible: false
      },
      "application/lxf": {
        source: "iana"
      },
      "application/mac-binhex40": {
        source: "iana",
        extensions: ["hqx"]
      },
      "application/mac-compactpro": {
        source: "apache",
        extensions: ["cpt"]
      },
      "application/macwriteii": {
        source: "iana"
      },
      "application/mads+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mads"]
      },
      "application/manifest+json": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["webmanifest"]
      },
      "application/marc": {
        source: "iana",
        extensions: ["mrc"]
      },
      "application/marcxml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mrcx"]
      },
      "application/mathematica": {
        source: "iana",
        extensions: ["ma", "nb", "mb"]
      },
      "application/mathml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mathml"]
      },
      "application/mathml-content+xml": {
        source: "iana",
        compressible: true
      },
      "application/mathml-presentation+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-associated-procedure-description+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-deregister+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-envelope+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-msk+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-msk-response+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-protection-description+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-reception-report+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-register+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-register-response+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-schedule+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-user-service-description+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbox": {
        source: "iana",
        extensions: ["mbox"]
      },
      "application/media-policy-dataset+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mpf"]
      },
      "application/media_control+xml": {
        source: "iana",
        compressible: true
      },
      "application/mediaservercontrol+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mscml"]
      },
      "application/merge-patch+json": {
        source: "iana",
        compressible: true
      },
      "application/metalink+xml": {
        source: "apache",
        compressible: true,
        extensions: ["metalink"]
      },
      "application/metalink4+xml": {
        source: "iana",
        compressible: true,
        extensions: ["meta4"]
      },
      "application/mets+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mets"]
      },
      "application/mf4": {
        source: "iana"
      },
      "application/mikey": {
        source: "iana"
      },
      "application/mipc": {
        source: "iana"
      },
      "application/missing-blocks+cbor-seq": {
        source: "iana"
      },
      "application/mmt-aei+xml": {
        source: "iana",
        compressible: true,
        extensions: ["maei"]
      },
      "application/mmt-usd+xml": {
        source: "iana",
        compressible: true,
        extensions: ["musd"]
      },
      "application/mods+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mods"]
      },
      "application/moss-keys": {
        source: "iana"
      },
      "application/moss-signature": {
        source: "iana"
      },
      "application/mosskey-data": {
        source: "iana"
      },
      "application/mosskey-request": {
        source: "iana"
      },
      "application/mp21": {
        source: "iana",
        extensions: ["m21", "mp21"]
      },
      "application/mp4": {
        source: "iana",
        extensions: ["mp4s", "m4p"]
      },
      "application/mpeg4-generic": {
        source: "iana"
      },
      "application/mpeg4-iod": {
        source: "iana"
      },
      "application/mpeg4-iod-xmt": {
        source: "iana"
      },
      "application/mrb-consumer+xml": {
        source: "iana",
        compressible: true
      },
      "application/mrb-publish+xml": {
        source: "iana",
        compressible: true
      },
      "application/msc-ivr+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/msc-mixer+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/msword": {
        source: "iana",
        compressible: false,
        extensions: ["doc", "dot"]
      },
      "application/mud+json": {
        source: "iana",
        compressible: true
      },
      "application/multipart-core": {
        source: "iana"
      },
      "application/mxf": {
        source: "iana",
        extensions: ["mxf"]
      },
      "application/n-quads": {
        source: "iana",
        extensions: ["nq"]
      },
      "application/n-triples": {
        source: "iana",
        extensions: ["nt"]
      },
      "application/nasdata": {
        source: "iana"
      },
      "application/news-checkgroups": {
        source: "iana",
        charset: "US-ASCII"
      },
      "application/news-groupinfo": {
        source: "iana",
        charset: "US-ASCII"
      },
      "application/news-transmission": {
        source: "iana"
      },
      "application/nlsml+xml": {
        source: "iana",
        compressible: true
      },
      "application/node": {
        source: "iana",
        extensions: ["cjs"]
      },
      "application/nss": {
        source: "iana"
      },
      "application/oauth-authz-req+jwt": {
        source: "iana"
      },
      "application/oblivious-dns-message": {
        source: "iana"
      },
      "application/ocsp-request": {
        source: "iana"
      },
      "application/ocsp-response": {
        source: "iana"
      },
      "application/octet-stream": {
        source: "iana",
        compressible: false,
        extensions: ["bin", "dms", "lrf", "mar", "so", "dist", "distz", "pkg", "bpk", "dump", "elc", "deploy", "exe", "dll", "deb", "dmg", "iso", "img", "msi", "msp", "msm", "buffer"]
      },
      "application/oda": {
        source: "iana",
        extensions: ["oda"]
      },
      "application/odm+xml": {
        source: "iana",
        compressible: true
      },
      "application/odx": {
        source: "iana"
      },
      "application/oebps-package+xml": {
        source: "iana",
        compressible: true,
        extensions: ["opf"]
      },
      "application/ogg": {
        source: "iana",
        compressible: false,
        extensions: ["ogx"]
      },
      "application/omdoc+xml": {
        source: "apache",
        compressible: true,
        extensions: ["omdoc"]
      },
      "application/onenote": {
        source: "apache",
        extensions: ["onetoc", "onetoc2", "onetmp", "onepkg"]
      },
      "application/opc-nodeset+xml": {
        source: "iana",
        compressible: true
      },
      "application/oscore": {
        source: "iana"
      },
      "application/oxps": {
        source: "iana",
        extensions: ["oxps"]
      },
      "application/p21": {
        source: "iana"
      },
      "application/p21+zip": {
        source: "iana",
        compressible: false
      },
      "application/p2p-overlay+xml": {
        source: "iana",
        compressible: true,
        extensions: ["relo"]
      },
      "application/parityfec": {
        source: "iana"
      },
      "application/passport": {
        source: "iana"
      },
      "application/patch-ops-error+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xer"]
      },
      "application/pdf": {
        source: "iana",
        compressible: false,
        extensions: ["pdf"]
      },
      "application/pdx": {
        source: "iana"
      },
      "application/pem-certificate-chain": {
        source: "iana"
      },
      "application/pgp-encrypted": {
        source: "iana",
        compressible: false,
        extensions: ["pgp"]
      },
      "application/pgp-keys": {
        source: "iana",
        extensions: ["asc"]
      },
      "application/pgp-signature": {
        source: "iana",
        extensions: ["asc", "sig"]
      },
      "application/pics-rules": {
        source: "apache",
        extensions: ["prf"]
      },
      "application/pidf+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/pidf-diff+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/pkcs10": {
        source: "iana",
        extensions: ["p10"]
      },
      "application/pkcs12": {
        source: "iana"
      },
      "application/pkcs7-mime": {
        source: "iana",
        extensions: ["p7m", "p7c"]
      },
      "application/pkcs7-signature": {
        source: "iana",
        extensions: ["p7s"]
      },
      "application/pkcs8": {
        source: "iana",
        extensions: ["p8"]
      },
      "application/pkcs8-encrypted": {
        source: "iana"
      },
      "application/pkix-attr-cert": {
        source: "iana",
        extensions: ["ac"]
      },
      "application/pkix-cert": {
        source: "iana",
        extensions: ["cer"]
      },
      "application/pkix-crl": {
        source: "iana",
        extensions: ["crl"]
      },
      "application/pkix-pkipath": {
        source: "iana",
        extensions: ["pkipath"]
      },
      "application/pkixcmp": {
        source: "iana",
        extensions: ["pki"]
      },
      "application/pls+xml": {
        source: "iana",
        compressible: true,
        extensions: ["pls"]
      },
      "application/poc-settings+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/postscript": {
        source: "iana",
        compressible: true,
        extensions: ["ai", "eps", "ps"]
      },
      "application/ppsp-tracker+json": {
        source: "iana",
        compressible: true
      },
      "application/problem+json": {
        source: "iana",
        compressible: true
      },
      "application/problem+xml": {
        source: "iana",
        compressible: true
      },
      "application/provenance+xml": {
        source: "iana",
        compressible: true,
        extensions: ["provx"]
      },
      "application/prs.alvestrand.titrax-sheet": {
        source: "iana"
      },
      "application/prs.cww": {
        source: "iana",
        extensions: ["cww"]
      },
      "application/prs.cyn": {
        source: "iana",
        charset: "7-BIT"
      },
      "application/prs.hpub+zip": {
        source: "iana",
        compressible: false
      },
      "application/prs.nprend": {
        source: "iana"
      },
      "application/prs.plucker": {
        source: "iana"
      },
      "application/prs.rdf-xml-crypt": {
        source: "iana"
      },
      "application/prs.xsf+xml": {
        source: "iana",
        compressible: true
      },
      "application/pskc+xml": {
        source: "iana",
        compressible: true,
        extensions: ["pskcxml"]
      },
      "application/pvd+json": {
        source: "iana",
        compressible: true
      },
      "application/qsig": {
        source: "iana"
      },
      "application/raml+yaml": {
        compressible: true,
        extensions: ["raml"]
      },
      "application/raptorfec": {
        source: "iana"
      },
      "application/rdap+json": {
        source: "iana",
        compressible: true
      },
      "application/rdf+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rdf", "owl"]
      },
      "application/reginfo+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rif"]
      },
      "application/relax-ng-compact-syntax": {
        source: "iana",
        extensions: ["rnc"]
      },
      "application/remote-printing": {
        source: "iana"
      },
      "application/reputon+json": {
        source: "iana",
        compressible: true
      },
      "application/resource-lists+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rl"]
      },
      "application/resource-lists-diff+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rld"]
      },
      "application/rfc+xml": {
        source: "iana",
        compressible: true
      },
      "application/riscos": {
        source: "iana"
      },
      "application/rlmi+xml": {
        source: "iana",
        compressible: true
      },
      "application/rls-services+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rs"]
      },
      "application/route-apd+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rapd"]
      },
      "application/route-s-tsid+xml": {
        source: "iana",
        compressible: true,
        extensions: ["sls"]
      },
      "application/route-usd+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rusd"]
      },
      "application/rpki-ghostbusters": {
        source: "iana",
        extensions: ["gbr"]
      },
      "application/rpki-manifest": {
        source: "iana",
        extensions: ["mft"]
      },
      "application/rpki-publication": {
        source: "iana"
      },
      "application/rpki-roa": {
        source: "iana",
        extensions: ["roa"]
      },
      "application/rpki-updown": {
        source: "iana"
      },
      "application/rsd+xml": {
        source: "apache",
        compressible: true,
        extensions: ["rsd"]
      },
      "application/rss+xml": {
        source: "apache",
        compressible: true,
        extensions: ["rss"]
      },
      "application/rtf": {
        source: "iana",
        compressible: true,
        extensions: ["rtf"]
      },
      "application/rtploopback": {
        source: "iana"
      },
      "application/rtx": {
        source: "iana"
      },
      "application/samlassertion+xml": {
        source: "iana",
        compressible: true
      },
      "application/samlmetadata+xml": {
        source: "iana",
        compressible: true
      },
      "application/sarif+json": {
        source: "iana",
        compressible: true
      },
      "application/sarif-external-properties+json": {
        source: "iana",
        compressible: true
      },
      "application/sbe": {
        source: "iana"
      },
      "application/sbml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["sbml"]
      },
      "application/scaip+xml": {
        source: "iana",
        compressible: true
      },
      "application/scim+json": {
        source: "iana",
        compressible: true
      },
      "application/scvp-cv-request": {
        source: "iana",
        extensions: ["scq"]
      },
      "application/scvp-cv-response": {
        source: "iana",
        extensions: ["scs"]
      },
      "application/scvp-vp-request": {
        source: "iana",
        extensions: ["spq"]
      },
      "application/scvp-vp-response": {
        source: "iana",
        extensions: ["spp"]
      },
      "application/sdp": {
        source: "iana",
        extensions: ["sdp"]
      },
      "application/secevent+jwt": {
        source: "iana"
      },
      "application/senml+cbor": {
        source: "iana"
      },
      "application/senml+json": {
        source: "iana",
        compressible: true
      },
      "application/senml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["senmlx"]
      },
      "application/senml-etch+cbor": {
        source: "iana"
      },
      "application/senml-etch+json": {
        source: "iana",
        compressible: true
      },
      "application/senml-exi": {
        source: "iana"
      },
      "application/sensml+cbor": {
        source: "iana"
      },
      "application/sensml+json": {
        source: "iana",
        compressible: true
      },
      "application/sensml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["sensmlx"]
      },
      "application/sensml-exi": {
        source: "iana"
      },
      "application/sep+xml": {
        source: "iana",
        compressible: true
      },
      "application/sep-exi": {
        source: "iana"
      },
      "application/session-info": {
        source: "iana"
      },
      "application/set-payment": {
        source: "iana"
      },
      "application/set-payment-initiation": {
        source: "iana",
        extensions: ["setpay"]
      },
      "application/set-registration": {
        source: "iana"
      },
      "application/set-registration-initiation": {
        source: "iana",
        extensions: ["setreg"]
      },
      "application/sgml": {
        source: "iana"
      },
      "application/sgml-open-catalog": {
        source: "iana"
      },
      "application/shf+xml": {
        source: "iana",
        compressible: true,
        extensions: ["shf"]
      },
      "application/sieve": {
        source: "iana",
        extensions: ["siv", "sieve"]
      },
      "application/simple-filter+xml": {
        source: "iana",
        compressible: true
      },
      "application/simple-message-summary": {
        source: "iana"
      },
      "application/simplesymbolcontainer": {
        source: "iana"
      },
      "application/sipc": {
        source: "iana"
      },
      "application/slate": {
        source: "iana"
      },
      "application/smil": {
        source: "iana"
      },
      "application/smil+xml": {
        source: "iana",
        compressible: true,
        extensions: ["smi", "smil"]
      },
      "application/smpte336m": {
        source: "iana"
      },
      "application/soap+fastinfoset": {
        source: "iana"
      },
      "application/soap+xml": {
        source: "iana",
        compressible: true
      },
      "application/sparql-query": {
        source: "iana",
        extensions: ["rq"]
      },
      "application/sparql-results+xml": {
        source: "iana",
        compressible: true,
        extensions: ["srx"]
      },
      "application/spdx+json": {
        source: "iana",
        compressible: true
      },
      "application/spirits-event+xml": {
        source: "iana",
        compressible: true
      },
      "application/sql": {
        source: "iana"
      },
      "application/srgs": {
        source: "iana",
        extensions: ["gram"]
      },
      "application/srgs+xml": {
        source: "iana",
        compressible: true,
        extensions: ["grxml"]
      },
      "application/sru+xml": {
        source: "iana",
        compressible: true,
        extensions: ["sru"]
      },
      "application/ssdl+xml": {
        source: "apache",
        compressible: true,
        extensions: ["ssdl"]
      },
      "application/ssml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["ssml"]
      },
      "application/stix+json": {
        source: "iana",
        compressible: true
      },
      "application/swid+xml": {
        source: "iana",
        compressible: true,
        extensions: ["swidtag"]
      },
      "application/tamp-apex-update": {
        source: "iana"
      },
      "application/tamp-apex-update-confirm": {
        source: "iana"
      },
      "application/tamp-community-update": {
        source: "iana"
      },
      "application/tamp-community-update-confirm": {
        source: "iana"
      },
      "application/tamp-error": {
        source: "iana"
      },
      "application/tamp-sequence-adjust": {
        source: "iana"
      },
      "application/tamp-sequence-adjust-confirm": {
        source: "iana"
      },
      "application/tamp-status-query": {
        source: "iana"
      },
      "application/tamp-status-response": {
        source: "iana"
      },
      "application/tamp-update": {
        source: "iana"
      },
      "application/tamp-update-confirm": {
        source: "iana"
      },
      "application/tar": {
        compressible: true
      },
      "application/taxii+json": {
        source: "iana",
        compressible: true
      },
      "application/td+json": {
        source: "iana",
        compressible: true
      },
      "application/tei+xml": {
        source: "iana",
        compressible: true,
        extensions: ["tei", "teicorpus"]
      },
      "application/tetra_isi": {
        source: "iana"
      },
      "application/thraud+xml": {
        source: "iana",
        compressible: true,
        extensions: ["tfi"]
      },
      "application/timestamp-query": {
        source: "iana"
      },
      "application/timestamp-reply": {
        source: "iana"
      },
      "application/timestamped-data": {
        source: "iana",
        extensions: ["tsd"]
      },
      "application/tlsrpt+gzip": {
        source: "iana"
      },
      "application/tlsrpt+json": {
        source: "iana",
        compressible: true
      },
      "application/tnauthlist": {
        source: "iana"
      },
      "application/token-introspection+jwt": {
        source: "iana"
      },
      "application/toml": {
        compressible: true,
        extensions: ["toml"]
      },
      "application/trickle-ice-sdpfrag": {
        source: "iana"
      },
      "application/trig": {
        source: "iana",
        extensions: ["trig"]
      },
      "application/ttml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["ttml"]
      },
      "application/tve-trigger": {
        source: "iana"
      },
      "application/tzif": {
        source: "iana"
      },
      "application/tzif-leap": {
        source: "iana"
      },
      "application/ubjson": {
        compressible: false,
        extensions: ["ubj"]
      },
      "application/ulpfec": {
        source: "iana"
      },
      "application/urc-grpsheet+xml": {
        source: "iana",
        compressible: true
      },
      "application/urc-ressheet+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rsheet"]
      },
      "application/urc-targetdesc+xml": {
        source: "iana",
        compressible: true,
        extensions: ["td"]
      },
      "application/urc-uisocketdesc+xml": {
        source: "iana",
        compressible: true
      },
      "application/vcard+json": {
        source: "iana",
        compressible: true
      },
      "application/vcard+xml": {
        source: "iana",
        compressible: true
      },
      "application/vemmi": {
        source: "iana"
      },
      "application/vividence.scriptfile": {
        source: "apache"
      },
      "application/vnd.1000minds.decision-model+xml": {
        source: "iana",
        compressible: true,
        extensions: ["1km"]
      },
      "application/vnd.3gpp-prose+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp-prose-pc3ch+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp-v2x-local-service-information": {
        source: "iana"
      },
      "application/vnd.3gpp.5gnas": {
        source: "iana"
      },
      "application/vnd.3gpp.access-transfer-events+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.bsf+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.gmop+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.gtpc": {
        source: "iana"
      },
      "application/vnd.3gpp.interworking-data": {
        source: "iana"
      },
      "application/vnd.3gpp.lpp": {
        source: "iana"
      },
      "application/vnd.3gpp.mc-signalling-ear": {
        source: "iana"
      },
      "application/vnd.3gpp.mcdata-affiliation-command+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcdata-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcdata-payload": {
        source: "iana"
      },
      "application/vnd.3gpp.mcdata-service-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcdata-signalling": {
        source: "iana"
      },
      "application/vnd.3gpp.mcdata-ue-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcdata-user-profile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-affiliation-command+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-floor-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-location-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-mbms-usage-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-service-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-signed+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-ue-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-ue-init-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-user-profile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-affiliation-command+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-affiliation-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-location-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-mbms-usage-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-service-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-transmission-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-ue-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-user-profile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mid-call+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.ngap": {
        source: "iana"
      },
      "application/vnd.3gpp.pfcp": {
        source: "iana"
      },
      "application/vnd.3gpp.pic-bw-large": {
        source: "iana",
        extensions: ["plb"]
      },
      "application/vnd.3gpp.pic-bw-small": {
        source: "iana",
        extensions: ["psb"]
      },
      "application/vnd.3gpp.pic-bw-var": {
        source: "iana",
        extensions: ["pvb"]
      },
      "application/vnd.3gpp.s1ap": {
        source: "iana"
      },
      "application/vnd.3gpp.sms": {
        source: "iana"
      },
      "application/vnd.3gpp.sms+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.srvcc-ext+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.srvcc-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.state-and-event-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.ussd+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp2.bcmcsinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp2.sms": {
        source: "iana"
      },
      "application/vnd.3gpp2.tcap": {
        source: "iana",
        extensions: ["tcap"]
      },
      "application/vnd.3lightssoftware.imagescal": {
        source: "iana"
      },
      "application/vnd.3m.post-it-notes": {
        source: "iana",
        extensions: ["pwn"]
      },
      "application/vnd.accpac.simply.aso": {
        source: "iana",
        extensions: ["aso"]
      },
      "application/vnd.accpac.simply.imp": {
        source: "iana",
        extensions: ["imp"]
      },
      "application/vnd.acucobol": {
        source: "iana",
        extensions: ["acu"]
      },
      "application/vnd.acucorp": {
        source: "iana",
        extensions: ["atc", "acutc"]
      },
      "application/vnd.adobe.air-application-installer-package+zip": {
        source: "apache",
        compressible: false,
        extensions: ["air"]
      },
      "application/vnd.adobe.flash.movie": {
        source: "iana"
      },
      "application/vnd.adobe.formscentral.fcdt": {
        source: "iana",
        extensions: ["fcdt"]
      },
      "application/vnd.adobe.fxp": {
        source: "iana",
        extensions: ["fxp", "fxpl"]
      },
      "application/vnd.adobe.partial-upload": {
        source: "iana"
      },
      "application/vnd.adobe.xdp+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xdp"]
      },
      "application/vnd.adobe.xfdf": {
        source: "iana",
        extensions: ["xfdf"]
      },
      "application/vnd.aether.imp": {
        source: "iana"
      },
      "application/vnd.afpc.afplinedata": {
        source: "iana"
      },
      "application/vnd.afpc.afplinedata-pagedef": {
        source: "iana"
      },
      "application/vnd.afpc.cmoca-cmresource": {
        source: "iana"
      },
      "application/vnd.afpc.foca-charset": {
        source: "iana"
      },
      "application/vnd.afpc.foca-codedfont": {
        source: "iana"
      },
      "application/vnd.afpc.foca-codepage": {
        source: "iana"
      },
      "application/vnd.afpc.modca": {
        source: "iana"
      },
      "application/vnd.afpc.modca-cmtable": {
        source: "iana"
      },
      "application/vnd.afpc.modca-formdef": {
        source: "iana"
      },
      "application/vnd.afpc.modca-mediummap": {
        source: "iana"
      },
      "application/vnd.afpc.modca-objectcontainer": {
        source: "iana"
      },
      "application/vnd.afpc.modca-overlay": {
        source: "iana"
      },
      "application/vnd.afpc.modca-pagesegment": {
        source: "iana"
      },
      "application/vnd.age": {
        source: "iana",
        extensions: ["age"]
      },
      "application/vnd.ah-barcode": {
        source: "iana"
      },
      "application/vnd.ahead.space": {
        source: "iana",
        extensions: ["ahead"]
      },
      "application/vnd.airzip.filesecure.azf": {
        source: "iana",
        extensions: ["azf"]
      },
      "application/vnd.airzip.filesecure.azs": {
        source: "iana",
        extensions: ["azs"]
      },
      "application/vnd.amadeus+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.amazon.ebook": {
        source: "apache",
        extensions: ["azw"]
      },
      "application/vnd.amazon.mobi8-ebook": {
        source: "iana"
      },
      "application/vnd.americandynamics.acc": {
        source: "iana",
        extensions: ["acc"]
      },
      "application/vnd.amiga.ami": {
        source: "iana",
        extensions: ["ami"]
      },
      "application/vnd.amundsen.maze+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.android.ota": {
        source: "iana"
      },
      "application/vnd.android.package-archive": {
        source: "apache",
        compressible: false,
        extensions: ["apk"]
      },
      "application/vnd.anki": {
        source: "iana"
      },
      "application/vnd.anser-web-certificate-issue-initiation": {
        source: "iana",
        extensions: ["cii"]
      },
      "application/vnd.anser-web-funds-transfer-initiation": {
        source: "apache",
        extensions: ["fti"]
      },
      "application/vnd.antix.game-component": {
        source: "iana",
        extensions: ["atx"]
      },
      "application/vnd.apache.arrow.file": {
        source: "iana"
      },
      "application/vnd.apache.arrow.stream": {
        source: "iana"
      },
      "application/vnd.apache.thrift.binary": {
        source: "iana"
      },
      "application/vnd.apache.thrift.compact": {
        source: "iana"
      },
      "application/vnd.apache.thrift.json": {
        source: "iana"
      },
      "application/vnd.api+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.aplextor.warrp+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.apothekende.reservation+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.apple.installer+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mpkg"]
      },
      "application/vnd.apple.keynote": {
        source: "iana",
        extensions: ["key"]
      },
      "application/vnd.apple.mpegurl": {
        source: "iana",
        extensions: ["m3u8"]
      },
      "application/vnd.apple.numbers": {
        source: "iana",
        extensions: ["numbers"]
      },
      "application/vnd.apple.pages": {
        source: "iana",
        extensions: ["pages"]
      },
      "application/vnd.apple.pkpass": {
        compressible: false,
        extensions: ["pkpass"]
      },
      "application/vnd.arastra.swi": {
        source: "iana"
      },
      "application/vnd.aristanetworks.swi": {
        source: "iana",
        extensions: ["swi"]
      },
      "application/vnd.artisan+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.artsquare": {
        source: "iana"
      },
      "application/vnd.astraea-software.iota": {
        source: "iana",
        extensions: ["iota"]
      },
      "application/vnd.audiograph": {
        source: "iana",
        extensions: ["aep"]
      },
      "application/vnd.autopackage": {
        source: "iana"
      },
      "application/vnd.avalon+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.avistar+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.balsamiq.bmml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["bmml"]
      },
      "application/vnd.balsamiq.bmpr": {
        source: "iana"
      },
      "application/vnd.banana-accounting": {
        source: "iana"
      },
      "application/vnd.bbf.usp.error": {
        source: "iana"
      },
      "application/vnd.bbf.usp.msg": {
        source: "iana"
      },
      "application/vnd.bbf.usp.msg+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.bekitzur-stech+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.bint.med-content": {
        source: "iana"
      },
      "application/vnd.biopax.rdf+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.blink-idb-value-wrapper": {
        source: "iana"
      },
      "application/vnd.blueice.multipass": {
        source: "iana",
        extensions: ["mpm"]
      },
      "application/vnd.bluetooth.ep.oob": {
        source: "iana"
      },
      "application/vnd.bluetooth.le.oob": {
        source: "iana"
      },
      "application/vnd.bmi": {
        source: "iana",
        extensions: ["bmi"]
      },
      "application/vnd.bpf": {
        source: "iana"
      },
      "application/vnd.bpf3": {
        source: "iana"
      },
      "application/vnd.businessobjects": {
        source: "iana",
        extensions: ["rep"]
      },
      "application/vnd.byu.uapi+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.cab-jscript": {
        source: "iana"
      },
      "application/vnd.canon-cpdl": {
        source: "iana"
      },
      "application/vnd.canon-lips": {
        source: "iana"
      },
      "application/vnd.capasystems-pg+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.cendio.thinlinc.clientconf": {
        source: "iana"
      },
      "application/vnd.century-systems.tcp_stream": {
        source: "iana"
      },
      "application/vnd.chemdraw+xml": {
        source: "iana",
        compressible: true,
        extensions: ["cdxml"]
      },
      "application/vnd.chess-pgn": {
        source: "iana"
      },
      "application/vnd.chipnuts.karaoke-mmd": {
        source: "iana",
        extensions: ["mmd"]
      },
      "application/vnd.ciedi": {
        source: "iana"
      },
      "application/vnd.cinderella": {
        source: "iana",
        extensions: ["cdy"]
      },
      "application/vnd.cirpack.isdn-ext": {
        source: "iana"
      },
      "application/vnd.citationstyles.style+xml": {
        source: "iana",
        compressible: true,
        extensions: ["csl"]
      },
      "application/vnd.claymore": {
        source: "iana",
        extensions: ["cla"]
      },
      "application/vnd.cloanto.rp9": {
        source: "iana",
        extensions: ["rp9"]
      },
      "application/vnd.clonk.c4group": {
        source: "iana",
        extensions: ["c4g", "c4d", "c4f", "c4p", "c4u"]
      },
      "application/vnd.cluetrust.cartomobile-config": {
        source: "iana",
        extensions: ["c11amc"]
      },
      "application/vnd.cluetrust.cartomobile-config-pkg": {
        source: "iana",
        extensions: ["c11amz"]
      },
      "application/vnd.coffeescript": {
        source: "iana"
      },
      "application/vnd.collabio.xodocuments.document": {
        source: "iana"
      },
      "application/vnd.collabio.xodocuments.document-template": {
        source: "iana"
      },
      "application/vnd.collabio.xodocuments.presentation": {
        source: "iana"
      },
      "application/vnd.collabio.xodocuments.presentation-template": {
        source: "iana"
      },
      "application/vnd.collabio.xodocuments.spreadsheet": {
        source: "iana"
      },
      "application/vnd.collabio.xodocuments.spreadsheet-template": {
        source: "iana"
      },
      "application/vnd.collection+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.collection.doc+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.collection.next+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.comicbook+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.comicbook-rar": {
        source: "iana"
      },
      "application/vnd.commerce-battelle": {
        source: "iana"
      },
      "application/vnd.commonspace": {
        source: "iana",
        extensions: ["csp"]
      },
      "application/vnd.contact.cmsg": {
        source: "iana",
        extensions: ["cdbcmsg"]
      },
      "application/vnd.coreos.ignition+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.cosmocaller": {
        source: "iana",
        extensions: ["cmc"]
      },
      "application/vnd.crick.clicker": {
        source: "iana",
        extensions: ["clkx"]
      },
      "application/vnd.crick.clicker.keyboard": {
        source: "iana",
        extensions: ["clkk"]
      },
      "application/vnd.crick.clicker.palette": {
        source: "iana",
        extensions: ["clkp"]
      },
      "application/vnd.crick.clicker.template": {
        source: "iana",
        extensions: ["clkt"]
      },
      "application/vnd.crick.clicker.wordbank": {
        source: "iana",
        extensions: ["clkw"]
      },
      "application/vnd.criticaltools.wbs+xml": {
        source: "iana",
        compressible: true,
        extensions: ["wbs"]
      },
      "application/vnd.cryptii.pipe+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.crypto-shade-file": {
        source: "iana"
      },
      "application/vnd.cryptomator.encrypted": {
        source: "iana"
      },
      "application/vnd.cryptomator.vault": {
        source: "iana"
      },
      "application/vnd.ctc-posml": {
        source: "iana",
        extensions: ["pml"]
      },
      "application/vnd.ctct.ws+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.cups-pdf": {
        source: "iana"
      },
      "application/vnd.cups-postscript": {
        source: "iana"
      },
      "application/vnd.cups-ppd": {
        source: "iana",
        extensions: ["ppd"]
      },
      "application/vnd.cups-raster": {
        source: "iana"
      },
      "application/vnd.cups-raw": {
        source: "iana"
      },
      "application/vnd.curl": {
        source: "iana"
      },
      "application/vnd.curl.car": {
        source: "apache",
        extensions: ["car"]
      },
      "application/vnd.curl.pcurl": {
        source: "apache",
        extensions: ["pcurl"]
      },
      "application/vnd.cyan.dean.root+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.cybank": {
        source: "iana"
      },
      "application/vnd.cyclonedx+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.cyclonedx+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.d2l.coursepackage1p0+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.d3m-dataset": {
        source: "iana"
      },
      "application/vnd.d3m-problem": {
        source: "iana"
      },
      "application/vnd.dart": {
        source: "iana",
        compressible: true,
        extensions: ["dart"]
      },
      "application/vnd.data-vision.rdz": {
        source: "iana",
        extensions: ["rdz"]
      },
      "application/vnd.datapackage+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dataresource+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dbf": {
        source: "iana",
        extensions: ["dbf"]
      },
      "application/vnd.debian.binary-package": {
        source: "iana"
      },
      "application/vnd.dece.data": {
        source: "iana",
        extensions: ["uvf", "uvvf", "uvd", "uvvd"]
      },
      "application/vnd.dece.ttml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["uvt", "uvvt"]
      },
      "application/vnd.dece.unspecified": {
        source: "iana",
        extensions: ["uvx", "uvvx"]
      },
      "application/vnd.dece.zip": {
        source: "iana",
        extensions: ["uvz", "uvvz"]
      },
      "application/vnd.denovo.fcselayout-link": {
        source: "iana",
        extensions: ["fe_launch"]
      },
      "application/vnd.desmume.movie": {
        source: "iana"
      },
      "application/vnd.dir-bi.plate-dl-nosuffix": {
        source: "iana"
      },
      "application/vnd.dm.delegation+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dna": {
        source: "iana",
        extensions: ["dna"]
      },
      "application/vnd.document+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dolby.mlp": {
        source: "apache",
        extensions: ["mlp"]
      },
      "application/vnd.dolby.mobile.1": {
        source: "iana"
      },
      "application/vnd.dolby.mobile.2": {
        source: "iana"
      },
      "application/vnd.doremir.scorecloud-binary-document": {
        source: "iana"
      },
      "application/vnd.dpgraph": {
        source: "iana",
        extensions: ["dpg"]
      },
      "application/vnd.dreamfactory": {
        source: "iana",
        extensions: ["dfac"]
      },
      "application/vnd.drive+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ds-keypoint": {
        source: "apache",
        extensions: ["kpxx"]
      },
      "application/vnd.dtg.local": {
        source: "iana"
      },
      "application/vnd.dtg.local.flash": {
        source: "iana"
      },
      "application/vnd.dtg.local.html": {
        source: "iana"
      },
      "application/vnd.dvb.ait": {
        source: "iana",
        extensions: ["ait"]
      },
      "application/vnd.dvb.dvbisl+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.dvbj": {
        source: "iana"
      },
      "application/vnd.dvb.esgcontainer": {
        source: "iana"
      },
      "application/vnd.dvb.ipdcdftnotifaccess": {
        source: "iana"
      },
      "application/vnd.dvb.ipdcesgaccess": {
        source: "iana"
      },
      "application/vnd.dvb.ipdcesgaccess2": {
        source: "iana"
      },
      "application/vnd.dvb.ipdcesgpdd": {
        source: "iana"
      },
      "application/vnd.dvb.ipdcroaming": {
        source: "iana"
      },
      "application/vnd.dvb.iptv.alfec-base": {
        source: "iana"
      },
      "application/vnd.dvb.iptv.alfec-enhancement": {
        source: "iana"
      },
      "application/vnd.dvb.notif-aggregate-root+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.notif-container+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.notif-generic+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.notif-ia-msglist+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.notif-ia-registration-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.notif-ia-registration-response+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.notif-init+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.pfr": {
        source: "iana"
      },
      "application/vnd.dvb.service": {
        source: "iana",
        extensions: ["svc"]
      },
      "application/vnd.dxr": {
        source: "iana"
      },
      "application/vnd.dynageo": {
        source: "iana",
        extensions: ["geo"]
      },
      "application/vnd.dzr": {
        source: "iana"
      },
      "application/vnd.easykaraoke.cdgdownload": {
        source: "iana"
      },
      "application/vnd.ecdis-update": {
        source: "iana"
      },
      "application/vnd.ecip.rlp": {
        source: "iana"
      },
      "application/vnd.eclipse.ditto+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ecowin.chart": {
        source: "iana",
        extensions: ["mag"]
      },
      "application/vnd.ecowin.filerequest": {
        source: "iana"
      },
      "application/vnd.ecowin.fileupdate": {
        source: "iana"
      },
      "application/vnd.ecowin.series": {
        source: "iana"
      },
      "application/vnd.ecowin.seriesrequest": {
        source: "iana"
      },
      "application/vnd.ecowin.seriesupdate": {
        source: "iana"
      },
      "application/vnd.efi.img": {
        source: "iana"
      },
      "application/vnd.efi.iso": {
        source: "iana"
      },
      "application/vnd.emclient.accessrequest+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.enliven": {
        source: "iana",
        extensions: ["nml"]
      },
      "application/vnd.enphase.envoy": {
        source: "iana"
      },
      "application/vnd.eprints.data+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.epson.esf": {
        source: "iana",
        extensions: ["esf"]
      },
      "application/vnd.epson.msf": {
        source: "iana",
        extensions: ["msf"]
      },
      "application/vnd.epson.quickanime": {
        source: "iana",
        extensions: ["qam"]
      },
      "application/vnd.epson.salt": {
        source: "iana",
        extensions: ["slt"]
      },
      "application/vnd.epson.ssf": {
        source: "iana",
        extensions: ["ssf"]
      },
      "application/vnd.ericsson.quickcall": {
        source: "iana"
      },
      "application/vnd.espass-espass+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.eszigno3+xml": {
        source: "iana",
        compressible: true,
        extensions: ["es3", "et3"]
      },
      "application/vnd.etsi.aoc+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.asic-e+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.etsi.asic-s+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.etsi.cug+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvcommand+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvdiscovery+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvprofile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvsad-bc+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvsad-cod+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvsad-npvr+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvservice+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvsync+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvueprofile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.mcid+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.mheg5": {
        source: "iana"
      },
      "application/vnd.etsi.overload-control-policy-dataset+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.pstn+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.sci+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.simservs+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.timestamp-token": {
        source: "iana"
      },
      "application/vnd.etsi.tsl+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.tsl.der": {
        source: "iana"
      },
      "application/vnd.eu.kasparian.car+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.eudora.data": {
        source: "iana"
      },
      "application/vnd.evolv.ecig.profile": {
        source: "iana"
      },
      "application/vnd.evolv.ecig.settings": {
        source: "iana"
      },
      "application/vnd.evolv.ecig.theme": {
        source: "iana"
      },
      "application/vnd.exstream-empower+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.exstream-package": {
        source: "iana"
      },
      "application/vnd.ezpix-album": {
        source: "iana",
        extensions: ["ez2"]
      },
      "application/vnd.ezpix-package": {
        source: "iana",
        extensions: ["ez3"]
      },
      "application/vnd.f-secure.mobile": {
        source: "iana"
      },
      "application/vnd.familysearch.gedcom+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.fastcopy-disk-image": {
        source: "iana"
      },
      "application/vnd.fdf": {
        source: "iana",
        extensions: ["fdf"]
      },
      "application/vnd.fdsn.mseed": {
        source: "iana",
        extensions: ["mseed"]
      },
      "application/vnd.fdsn.seed": {
        source: "iana",
        extensions: ["seed", "dataless"]
      },
      "application/vnd.ffsns": {
        source: "iana"
      },
      "application/vnd.ficlab.flb+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.filmit.zfc": {
        source: "iana"
      },
      "application/vnd.fints": {
        source: "iana"
      },
      "application/vnd.firemonkeys.cloudcell": {
        source: "iana"
      },
      "application/vnd.flographit": {
        source: "iana",
        extensions: ["gph"]
      },
      "application/vnd.fluxtime.clip": {
        source: "iana",
        extensions: ["ftc"]
      },
      "application/vnd.font-fontforge-sfd": {
        source: "iana"
      },
      "application/vnd.framemaker": {
        source: "iana",
        extensions: ["fm", "frame", "maker", "book"]
      },
      "application/vnd.frogans.fnc": {
        source: "iana",
        extensions: ["fnc"]
      },
      "application/vnd.frogans.ltf": {
        source: "iana",
        extensions: ["ltf"]
      },
      "application/vnd.fsc.weblaunch": {
        source: "iana",
        extensions: ["fsc"]
      },
      "application/vnd.fujifilm.fb.docuworks": {
        source: "iana"
      },
      "application/vnd.fujifilm.fb.docuworks.binder": {
        source: "iana"
      },
      "application/vnd.fujifilm.fb.docuworks.container": {
        source: "iana"
      },
      "application/vnd.fujifilm.fb.jfi+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.fujitsu.oasys": {
        source: "iana",
        extensions: ["oas"]
      },
      "application/vnd.fujitsu.oasys2": {
        source: "iana",
        extensions: ["oa2"]
      },
      "application/vnd.fujitsu.oasys3": {
        source: "iana",
        extensions: ["oa3"]
      },
      "application/vnd.fujitsu.oasysgp": {
        source: "iana",
        extensions: ["fg5"]
      },
      "application/vnd.fujitsu.oasysprs": {
        source: "iana",
        extensions: ["bh2"]
      },
      "application/vnd.fujixerox.art-ex": {
        source: "iana"
      },
      "application/vnd.fujixerox.art4": {
        source: "iana"
      },
      "application/vnd.fujixerox.ddd": {
        source: "iana",
        extensions: ["ddd"]
      },
      "application/vnd.fujixerox.docuworks": {
        source: "iana",
        extensions: ["xdw"]
      },
      "application/vnd.fujixerox.docuworks.binder": {
        source: "iana",
        extensions: ["xbd"]
      },
      "application/vnd.fujixerox.docuworks.container": {
        source: "iana"
      },
      "application/vnd.fujixerox.hbpl": {
        source: "iana"
      },
      "application/vnd.fut-misnet": {
        source: "iana"
      },
      "application/vnd.futoin+cbor": {
        source: "iana"
      },
      "application/vnd.futoin+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.fuzzysheet": {
        source: "iana",
        extensions: ["fzs"]
      },
      "application/vnd.genomatix.tuxedo": {
        source: "iana",
        extensions: ["txd"]
      },
      "application/vnd.gentics.grd+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.geo+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.geocube+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.geogebra.file": {
        source: "iana",
        extensions: ["ggb"]
      },
      "application/vnd.geogebra.slides": {
        source: "iana"
      },
      "application/vnd.geogebra.tool": {
        source: "iana",
        extensions: ["ggt"]
      },
      "application/vnd.geometry-explorer": {
        source: "iana",
        extensions: ["gex", "gre"]
      },
      "application/vnd.geonext": {
        source: "iana",
        extensions: ["gxt"]
      },
      "application/vnd.geoplan": {
        source: "iana",
        extensions: ["g2w"]
      },
      "application/vnd.geospace": {
        source: "iana",
        extensions: ["g3w"]
      },
      "application/vnd.gerber": {
        source: "iana"
      },
      "application/vnd.globalplatform.card-content-mgt": {
        source: "iana"
      },
      "application/vnd.globalplatform.card-content-mgt-response": {
        source: "iana"
      },
      "application/vnd.gmx": {
        source: "iana",
        extensions: ["gmx"]
      },
      "application/vnd.google-apps.document": {
        compressible: false,
        extensions: ["gdoc"]
      },
      "application/vnd.google-apps.presentation": {
        compressible: false,
        extensions: ["gslides"]
      },
      "application/vnd.google-apps.spreadsheet": {
        compressible: false,
        extensions: ["gsheet"]
      },
      "application/vnd.google-earth.kml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["kml"]
      },
      "application/vnd.google-earth.kmz": {
        source: "iana",
        compressible: false,
        extensions: ["kmz"]
      },
      "application/vnd.gov.sk.e-form+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.gov.sk.e-form+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.gov.sk.xmldatacontainer+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.grafeq": {
        source: "iana",
        extensions: ["gqf", "gqs"]
      },
      "application/vnd.gridmp": {
        source: "iana"
      },
      "application/vnd.groove-account": {
        source: "iana",
        extensions: ["gac"]
      },
      "application/vnd.groove-help": {
        source: "iana",
        extensions: ["ghf"]
      },
      "application/vnd.groove-identity-message": {
        source: "iana",
        extensions: ["gim"]
      },
      "application/vnd.groove-injector": {
        source: "iana",
        extensions: ["grv"]
      },
      "application/vnd.groove-tool-message": {
        source: "iana",
        extensions: ["gtm"]
      },
      "application/vnd.groove-tool-template": {
        source: "iana",
        extensions: ["tpl"]
      },
      "application/vnd.groove-vcard": {
        source: "iana",
        extensions: ["vcg"]
      },
      "application/vnd.hal+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.hal+xml": {
        source: "iana",
        compressible: true,
        extensions: ["hal"]
      },
      "application/vnd.handheld-entertainment+xml": {
        source: "iana",
        compressible: true,
        extensions: ["zmm"]
      },
      "application/vnd.hbci": {
        source: "iana",
        extensions: ["hbci"]
      },
      "application/vnd.hc+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.hcl-bireports": {
        source: "iana"
      },
      "application/vnd.hdt": {
        source: "iana"
      },
      "application/vnd.heroku+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.hhe.lesson-player": {
        source: "iana",
        extensions: ["les"]
      },
      "application/vnd.hl7cda+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/vnd.hl7v2+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/vnd.hp-hpgl": {
        source: "iana",
        extensions: ["hpgl"]
      },
      "application/vnd.hp-hpid": {
        source: "iana",
        extensions: ["hpid"]
      },
      "application/vnd.hp-hps": {
        source: "iana",
        extensions: ["hps"]
      },
      "application/vnd.hp-jlyt": {
        source: "iana",
        extensions: ["jlt"]
      },
      "application/vnd.hp-pcl": {
        source: "iana",
        extensions: ["pcl"]
      },
      "application/vnd.hp-pclxl": {
        source: "iana",
        extensions: ["pclxl"]
      },
      "application/vnd.httphone": {
        source: "iana"
      },
      "application/vnd.hydrostatix.sof-data": {
        source: "iana",
        extensions: ["sfd-hdstx"]
      },
      "application/vnd.hyper+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.hyper-item+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.hyperdrive+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.hzn-3d-crossword": {
        source: "iana"
      },
      "application/vnd.ibm.afplinedata": {
        source: "iana"
      },
      "application/vnd.ibm.electronic-media": {
        source: "iana"
      },
      "application/vnd.ibm.minipay": {
        source: "iana",
        extensions: ["mpy"]
      },
      "application/vnd.ibm.modcap": {
        source: "iana",
        extensions: ["afp", "listafp", "list3820"]
      },
      "application/vnd.ibm.rights-management": {
        source: "iana",
        extensions: ["irm"]
      },
      "application/vnd.ibm.secure-container": {
        source: "iana",
        extensions: ["sc"]
      },
      "application/vnd.iccprofile": {
        source: "iana",
        extensions: ["icc", "icm"]
      },
      "application/vnd.ieee.1905": {
        source: "iana"
      },
      "application/vnd.igloader": {
        source: "iana",
        extensions: ["igl"]
      },
      "application/vnd.imagemeter.folder+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.imagemeter.image+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.immervision-ivp": {
        source: "iana",
        extensions: ["ivp"]
      },
      "application/vnd.immervision-ivu": {
        source: "iana",
        extensions: ["ivu"]
      },
      "application/vnd.ims.imsccv1p1": {
        source: "iana"
      },
      "application/vnd.ims.imsccv1p2": {
        source: "iana"
      },
      "application/vnd.ims.imsccv1p3": {
        source: "iana"
      },
      "application/vnd.ims.lis.v2.result+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ims.lti.v2.toolconsumerprofile+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ims.lti.v2.toolproxy+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ims.lti.v2.toolproxy.id+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ims.lti.v2.toolsettings+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ims.lti.v2.toolsettings.simple+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.informedcontrol.rms+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.informix-visionary": {
        source: "iana"
      },
      "application/vnd.infotech.project": {
        source: "iana"
      },
      "application/vnd.infotech.project+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.innopath.wamp.notification": {
        source: "iana"
      },
      "application/vnd.insors.igm": {
        source: "iana",
        extensions: ["igm"]
      },
      "application/vnd.intercon.formnet": {
        source: "iana",
        extensions: ["xpw", "xpx"]
      },
      "application/vnd.intergeo": {
        source: "iana",
        extensions: ["i2g"]
      },
      "application/vnd.intertrust.digibox": {
        source: "iana"
      },
      "application/vnd.intertrust.nncp": {
        source: "iana"
      },
      "application/vnd.intu.qbo": {
        source: "iana",
        extensions: ["qbo"]
      },
      "application/vnd.intu.qfx": {
        source: "iana",
        extensions: ["qfx"]
      },
      "application/vnd.iptc.g2.catalogitem+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.iptc.g2.conceptitem+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.iptc.g2.knowledgeitem+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.iptc.g2.newsitem+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.iptc.g2.newsmessage+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.iptc.g2.packageitem+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.iptc.g2.planningitem+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ipunplugged.rcprofile": {
        source: "iana",
        extensions: ["rcprofile"]
      },
      "application/vnd.irepository.package+xml": {
        source: "iana",
        compressible: true,
        extensions: ["irp"]
      },
      "application/vnd.is-xpr": {
        source: "iana",
        extensions: ["xpr"]
      },
      "application/vnd.isac.fcs": {
        source: "iana",
        extensions: ["fcs"]
      },
      "application/vnd.iso11783-10+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.jam": {
        source: "iana",
        extensions: ["jam"]
      },
      "application/vnd.japannet-directory-service": {
        source: "iana"
      },
      "application/vnd.japannet-jpnstore-wakeup": {
        source: "iana"
      },
      "application/vnd.japannet-payment-wakeup": {
        source: "iana"
      },
      "application/vnd.japannet-registration": {
        source: "iana"
      },
      "application/vnd.japannet-registration-wakeup": {
        source: "iana"
      },
      "application/vnd.japannet-setstore-wakeup": {
        source: "iana"
      },
      "application/vnd.japannet-verification": {
        source: "iana"
      },
      "application/vnd.japannet-verification-wakeup": {
        source: "iana"
      },
      "application/vnd.jcp.javame.midlet-rms": {
        source: "iana",
        extensions: ["rms"]
      },
      "application/vnd.jisp": {
        source: "iana",
        extensions: ["jisp"]
      },
      "application/vnd.joost.joda-archive": {
        source: "iana",
        extensions: ["joda"]
      },
      "application/vnd.jsk.isdn-ngn": {
        source: "iana"
      },
      "application/vnd.kahootz": {
        source: "iana",
        extensions: ["ktz", "ktr"]
      },
      "application/vnd.kde.karbon": {
        source: "iana",
        extensions: ["karbon"]
      },
      "application/vnd.kde.kchart": {
        source: "iana",
        extensions: ["chrt"]
      },
      "application/vnd.kde.kformula": {
        source: "iana",
        extensions: ["kfo"]
      },
      "application/vnd.kde.kivio": {
        source: "iana",
        extensions: ["flw"]
      },
      "application/vnd.kde.kontour": {
        source: "iana",
        extensions: ["kon"]
      },
      "application/vnd.kde.kpresenter": {
        source: "iana",
        extensions: ["kpr", "kpt"]
      },
      "application/vnd.kde.kspread": {
        source: "iana",
        extensions: ["ksp"]
      },
      "application/vnd.kde.kword": {
        source: "iana",
        extensions: ["kwd", "kwt"]
      },
      "application/vnd.kenameaapp": {
        source: "iana",
        extensions: ["htke"]
      },
      "application/vnd.kidspiration": {
        source: "iana",
        extensions: ["kia"]
      },
      "application/vnd.kinar": {
        source: "iana",
        extensions: ["kne", "knp"]
      },
      "application/vnd.koan": {
        source: "iana",
        extensions: ["skp", "skd", "skt", "skm"]
      },
      "application/vnd.kodak-descriptor": {
        source: "iana",
        extensions: ["sse"]
      },
      "application/vnd.las": {
        source: "iana"
      },
      "application/vnd.las.las+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.las.las+xml": {
        source: "iana",
        compressible: true,
        extensions: ["lasxml"]
      },
      "application/vnd.laszip": {
        source: "iana"
      },
      "application/vnd.leap+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.liberty-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.llamagraphics.life-balance.desktop": {
        source: "iana",
        extensions: ["lbd"]
      },
      "application/vnd.llamagraphics.life-balance.exchange+xml": {
        source: "iana",
        compressible: true,
        extensions: ["lbe"]
      },
      "application/vnd.logipipe.circuit+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.loom": {
        source: "iana"
      },
      "application/vnd.lotus-1-2-3": {
        source: "iana",
        extensions: ["123"]
      },
      "application/vnd.lotus-approach": {
        source: "iana",
        extensions: ["apr"]
      },
      "application/vnd.lotus-freelance": {
        source: "iana",
        extensions: ["pre"]
      },
      "application/vnd.lotus-notes": {
        source: "iana",
        extensions: ["nsf"]
      },
      "application/vnd.lotus-organizer": {
        source: "iana",
        extensions: ["org"]
      },
      "application/vnd.lotus-screencam": {
        source: "iana",
        extensions: ["scm"]
      },
      "application/vnd.lotus-wordpro": {
        source: "iana",
        extensions: ["lwp"]
      },
      "application/vnd.macports.portpkg": {
        source: "iana",
        extensions: ["portpkg"]
      },
      "application/vnd.mapbox-vector-tile": {
        source: "iana",
        extensions: ["mvt"]
      },
      "application/vnd.marlin.drm.actiontoken+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.marlin.drm.conftoken+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.marlin.drm.license+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.marlin.drm.mdcf": {
        source: "iana"
      },
      "application/vnd.mason+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.maxar.archive.3tz+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.maxmind.maxmind-db": {
        source: "iana"
      },
      "application/vnd.mcd": {
        source: "iana",
        extensions: ["mcd"]
      },
      "application/vnd.medcalcdata": {
        source: "iana",
        extensions: ["mc1"]
      },
      "application/vnd.mediastation.cdkey": {
        source: "iana",
        extensions: ["cdkey"]
      },
      "application/vnd.meridian-slingshot": {
        source: "iana"
      },
      "application/vnd.mfer": {
        source: "iana",
        extensions: ["mwf"]
      },
      "application/vnd.mfmp": {
        source: "iana",
        extensions: ["mfm"]
      },
      "application/vnd.micro+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.micrografx.flo": {
        source: "iana",
        extensions: ["flo"]
      },
      "application/vnd.micrografx.igx": {
        source: "iana",
        extensions: ["igx"]
      },
      "application/vnd.microsoft.portable-executable": {
        source: "iana"
      },
      "application/vnd.microsoft.windows.thumbnail-cache": {
        source: "iana"
      },
      "application/vnd.miele+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.mif": {
        source: "iana",
        extensions: ["mif"]
      },
      "application/vnd.minisoft-hp3000-save": {
        source: "iana"
      },
      "application/vnd.mitsubishi.misty-guard.trustweb": {
        source: "iana"
      },
      "application/vnd.mobius.daf": {
        source: "iana",
        extensions: ["daf"]
      },
      "application/vnd.mobius.dis": {
        source: "iana",
        extensions: ["dis"]
      },
      "application/vnd.mobius.mbk": {
        source: "iana",
        extensions: ["mbk"]
      },
      "application/vnd.mobius.mqy": {
        source: "iana",
        extensions: ["mqy"]
      },
      "application/vnd.mobius.msl": {
        source: "iana",
        extensions: ["msl"]
      },
      "application/vnd.mobius.plc": {
        source: "iana",
        extensions: ["plc"]
      },
      "application/vnd.mobius.txf": {
        source: "iana",
        extensions: ["txf"]
      },
      "application/vnd.mophun.application": {
        source: "iana",
        extensions: ["mpn"]
      },
      "application/vnd.mophun.certificate": {
        source: "iana",
        extensions: ["mpc"]
      },
      "application/vnd.motorola.flexsuite": {
        source: "iana"
      },
      "application/vnd.motorola.flexsuite.adsi": {
        source: "iana"
      },
      "application/vnd.motorola.flexsuite.fis": {
        source: "iana"
      },
      "application/vnd.motorola.flexsuite.gotap": {
        source: "iana"
      },
      "application/vnd.motorola.flexsuite.kmr": {
        source: "iana"
      },
      "application/vnd.motorola.flexsuite.ttc": {
        source: "iana"
      },
      "application/vnd.motorola.flexsuite.wem": {
        source: "iana"
      },
      "application/vnd.motorola.iprm": {
        source: "iana"
      },
      "application/vnd.mozilla.xul+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xul"]
      },
      "application/vnd.ms-3mfdocument": {
        source: "iana"
      },
      "application/vnd.ms-artgalry": {
        source: "iana",
        extensions: ["cil"]
      },
      "application/vnd.ms-asf": {
        source: "iana"
      },
      "application/vnd.ms-cab-compressed": {
        source: "iana",
        extensions: ["cab"]
      },
      "application/vnd.ms-color.iccprofile": {
        source: "apache"
      },
      "application/vnd.ms-excel": {
        source: "iana",
        compressible: false,
        extensions: ["xls", "xlm", "xla", "xlc", "xlt", "xlw"]
      },
      "application/vnd.ms-excel.addin.macroenabled.12": {
        source: "iana",
        extensions: ["xlam"]
      },
      "application/vnd.ms-excel.sheet.binary.macroenabled.12": {
        source: "iana",
        extensions: ["xlsb"]
      },
      "application/vnd.ms-excel.sheet.macroenabled.12": {
        source: "iana",
        extensions: ["xlsm"]
      },
      "application/vnd.ms-excel.template.macroenabled.12": {
        source: "iana",
        extensions: ["xltm"]
      },
      "application/vnd.ms-fontobject": {
        source: "iana",
        compressible: true,
        extensions: ["eot"]
      },
      "application/vnd.ms-htmlhelp": {
        source: "iana",
        extensions: ["chm"]
      },
      "application/vnd.ms-ims": {
        source: "iana",
        extensions: ["ims"]
      },
      "application/vnd.ms-lrm": {
        source: "iana",
        extensions: ["lrm"]
      },
      "application/vnd.ms-office.activex+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ms-officetheme": {
        source: "iana",
        extensions: ["thmx"]
      },
      "application/vnd.ms-opentype": {
        source: "apache",
        compressible: true
      },
      "application/vnd.ms-outlook": {
        compressible: false,
        extensions: ["msg"]
      },
      "application/vnd.ms-package.obfuscated-opentype": {
        source: "apache"
      },
      "application/vnd.ms-pki.seccat": {
        source: "apache",
        extensions: ["cat"]
      },
      "application/vnd.ms-pki.stl": {
        source: "apache",
        extensions: ["stl"]
      },
      "application/vnd.ms-playready.initiator+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ms-powerpoint": {
        source: "iana",
        compressible: false,
        extensions: ["ppt", "pps", "pot"]
      },
      "application/vnd.ms-powerpoint.addin.macroenabled.12": {
        source: "iana",
        extensions: ["ppam"]
      },
      "application/vnd.ms-powerpoint.presentation.macroenabled.12": {
        source: "iana",
        extensions: ["pptm"]
      },
      "application/vnd.ms-powerpoint.slide.macroenabled.12": {
        source: "iana",
        extensions: ["sldm"]
      },
      "application/vnd.ms-powerpoint.slideshow.macroenabled.12": {
        source: "iana",
        extensions: ["ppsm"]
      },
      "application/vnd.ms-powerpoint.template.macroenabled.12": {
        source: "iana",
        extensions: ["potm"]
      },
      "application/vnd.ms-printdevicecapabilities+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ms-printing.printticket+xml": {
        source: "apache",
        compressible: true
      },
      "application/vnd.ms-printschematicket+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ms-project": {
        source: "iana",
        extensions: ["mpp", "mpt"]
      },
      "application/vnd.ms-tnef": {
        source: "iana"
      },
      "application/vnd.ms-windows.devicepairing": {
        source: "iana"
      },
      "application/vnd.ms-windows.nwprinting.oob": {
        source: "iana"
      },
      "application/vnd.ms-windows.printerpairing": {
        source: "iana"
      },
      "application/vnd.ms-windows.wsd.oob": {
        source: "iana"
      },
      "application/vnd.ms-wmdrm.lic-chlg-req": {
        source: "iana"
      },
      "application/vnd.ms-wmdrm.lic-resp": {
        source: "iana"
      },
      "application/vnd.ms-wmdrm.meter-chlg-req": {
        source: "iana"
      },
      "application/vnd.ms-wmdrm.meter-resp": {
        source: "iana"
      },
      "application/vnd.ms-word.document.macroenabled.12": {
        source: "iana",
        extensions: ["docm"]
      },
      "application/vnd.ms-word.template.macroenabled.12": {
        source: "iana",
        extensions: ["dotm"]
      },
      "application/vnd.ms-works": {
        source: "iana",
        extensions: ["wps", "wks", "wcm", "wdb"]
      },
      "application/vnd.ms-wpl": {
        source: "iana",
        extensions: ["wpl"]
      },
      "application/vnd.ms-xpsdocument": {
        source: "iana",
        compressible: false,
        extensions: ["xps"]
      },
      "application/vnd.msa-disk-image": {
        source: "iana"
      },
      "application/vnd.mseq": {
        source: "iana",
        extensions: ["mseq"]
      },
      "application/vnd.msign": {
        source: "iana"
      },
      "application/vnd.multiad.creator": {
        source: "iana"
      },
      "application/vnd.multiad.creator.cif": {
        source: "iana"
      },
      "application/vnd.music-niff": {
        source: "iana"
      },
      "application/vnd.musician": {
        source: "iana",
        extensions: ["mus"]
      },
      "application/vnd.muvee.style": {
        source: "iana",
        extensions: ["msty"]
      },
      "application/vnd.mynfc": {
        source: "iana",
        extensions: ["taglet"]
      },
      "application/vnd.nacamar.ybrid+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ncd.control": {
        source: "iana"
      },
      "application/vnd.ncd.reference": {
        source: "iana"
      },
      "application/vnd.nearst.inv+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nebumind.line": {
        source: "iana"
      },
      "application/vnd.nervana": {
        source: "iana"
      },
      "application/vnd.netfpx": {
        source: "iana"
      },
      "application/vnd.neurolanguage.nlu": {
        source: "iana",
        extensions: ["nlu"]
      },
      "application/vnd.nimn": {
        source: "iana"
      },
      "application/vnd.nintendo.nitro.rom": {
        source: "iana"
      },
      "application/vnd.nintendo.snes.rom": {
        source: "iana"
      },
      "application/vnd.nitf": {
        source: "iana",
        extensions: ["ntf", "nitf"]
      },
      "application/vnd.noblenet-directory": {
        source: "iana",
        extensions: ["nnd"]
      },
      "application/vnd.noblenet-sealer": {
        source: "iana",
        extensions: ["nns"]
      },
      "application/vnd.noblenet-web": {
        source: "iana",
        extensions: ["nnw"]
      },
      "application/vnd.nokia.catalogs": {
        source: "iana"
      },
      "application/vnd.nokia.conml+wbxml": {
        source: "iana"
      },
      "application/vnd.nokia.conml+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nokia.iptv.config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nokia.isds-radio-presets": {
        source: "iana"
      },
      "application/vnd.nokia.landmark+wbxml": {
        source: "iana"
      },
      "application/vnd.nokia.landmark+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nokia.landmarkcollection+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nokia.n-gage.ac+xml": {
        source: "iana",
        compressible: true,
        extensions: ["ac"]
      },
      "application/vnd.nokia.n-gage.data": {
        source: "iana",
        extensions: ["ngdat"]
      },
      "application/vnd.nokia.n-gage.symbian.install": {
        source: "iana",
        extensions: ["n-gage"]
      },
      "application/vnd.nokia.ncd": {
        source: "iana"
      },
      "application/vnd.nokia.pcd+wbxml": {
        source: "iana"
      },
      "application/vnd.nokia.pcd+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nokia.radio-preset": {
        source: "iana",
        extensions: ["rpst"]
      },
      "application/vnd.nokia.radio-presets": {
        source: "iana",
        extensions: ["rpss"]
      },
      "application/vnd.novadigm.edm": {
        source: "iana",
        extensions: ["edm"]
      },
      "application/vnd.novadigm.edx": {
        source: "iana",
        extensions: ["edx"]
      },
      "application/vnd.novadigm.ext": {
        source: "iana",
        extensions: ["ext"]
      },
      "application/vnd.ntt-local.content-share": {
        source: "iana"
      },
      "application/vnd.ntt-local.file-transfer": {
        source: "iana"
      },
      "application/vnd.ntt-local.ogw_remote-access": {
        source: "iana"
      },
      "application/vnd.ntt-local.sip-ta_remote": {
        source: "iana"
      },
      "application/vnd.ntt-local.sip-ta_tcp_stream": {
        source: "iana"
      },
      "application/vnd.oasis.opendocument.chart": {
        source: "iana",
        extensions: ["odc"]
      },
      "application/vnd.oasis.opendocument.chart-template": {
        source: "iana",
        extensions: ["otc"]
      },
      "application/vnd.oasis.opendocument.database": {
        source: "iana",
        extensions: ["odb"]
      },
      "application/vnd.oasis.opendocument.formula": {
        source: "iana",
        extensions: ["odf"]
      },
      "application/vnd.oasis.opendocument.formula-template": {
        source: "iana",
        extensions: ["odft"]
      },
      "application/vnd.oasis.opendocument.graphics": {
        source: "iana",
        compressible: false,
        extensions: ["odg"]
      },
      "application/vnd.oasis.opendocument.graphics-template": {
        source: "iana",
        extensions: ["otg"]
      },
      "application/vnd.oasis.opendocument.image": {
        source: "iana",
        extensions: ["odi"]
      },
      "application/vnd.oasis.opendocument.image-template": {
        source: "iana",
        extensions: ["oti"]
      },
      "application/vnd.oasis.opendocument.presentation": {
        source: "iana",
        compressible: false,
        extensions: ["odp"]
      },
      "application/vnd.oasis.opendocument.presentation-template": {
        source: "iana",
        extensions: ["otp"]
      },
      "application/vnd.oasis.opendocument.spreadsheet": {
        source: "iana",
        compressible: false,
        extensions: ["ods"]
      },
      "application/vnd.oasis.opendocument.spreadsheet-template": {
        source: "iana",
        extensions: ["ots"]
      },
      "application/vnd.oasis.opendocument.text": {
        source: "iana",
        compressible: false,
        extensions: ["odt"]
      },
      "application/vnd.oasis.opendocument.text-master": {
        source: "iana",
        extensions: ["odm"]
      },
      "application/vnd.oasis.opendocument.text-template": {
        source: "iana",
        extensions: ["ott"]
      },
      "application/vnd.oasis.opendocument.text-web": {
        source: "iana",
        extensions: ["oth"]
      },
      "application/vnd.obn": {
        source: "iana"
      },
      "application/vnd.ocf+cbor": {
        source: "iana"
      },
      "application/vnd.oci.image.manifest.v1+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oftn.l10n+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.contentaccessdownload+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.contentaccessstreaming+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.cspg-hexbinary": {
        source: "iana"
      },
      "application/vnd.oipf.dae.svg+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.dae.xhtml+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.mippvcontrolmessage+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.pae.gem": {
        source: "iana"
      },
      "application/vnd.oipf.spdiscovery+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.spdlist+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.ueprofile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.userprofile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.olpc-sugar": {
        source: "iana",
        extensions: ["xo"]
      },
      "application/vnd.oma-scws-config": {
        source: "iana"
      },
      "application/vnd.oma-scws-http-request": {
        source: "iana"
      },
      "application/vnd.oma-scws-http-response": {
        source: "iana"
      },
      "application/vnd.oma.bcast.associated-procedure-parameter+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.drm-trigger+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.imd+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.ltkm": {
        source: "iana"
      },
      "application/vnd.oma.bcast.notification+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.provisioningtrigger": {
        source: "iana"
      },
      "application/vnd.oma.bcast.sgboot": {
        source: "iana"
      },
      "application/vnd.oma.bcast.sgdd+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.sgdu": {
        source: "iana"
      },
      "application/vnd.oma.bcast.simple-symbol-container": {
        source: "iana"
      },
      "application/vnd.oma.bcast.smartcard-trigger+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.sprov+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.stkm": {
        source: "iana"
      },
      "application/vnd.oma.cab-address-book+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.cab-feature-handler+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.cab-pcc+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.cab-subs-invite+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.cab-user-prefs+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.dcd": {
        source: "iana"
      },
      "application/vnd.oma.dcdc": {
        source: "iana"
      },
      "application/vnd.oma.dd2+xml": {
        source: "iana",
        compressible: true,
        extensions: ["dd2"]
      },
      "application/vnd.oma.drm.risd+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.group-usage-list+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.lwm2m+cbor": {
        source: "iana"
      },
      "application/vnd.oma.lwm2m+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.lwm2m+tlv": {
        source: "iana"
      },
      "application/vnd.oma.pal+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.poc.detailed-progress-report+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.poc.final-report+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.poc.groups+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.poc.invocation-descriptor+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.poc.optimized-progress-report+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.push": {
        source: "iana"
      },
      "application/vnd.oma.scidm.messages+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.xcap-directory+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.omads-email+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/vnd.omads-file+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/vnd.omads-folder+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/vnd.omaloc-supl-init": {
        source: "iana"
      },
      "application/vnd.onepager": {
        source: "iana"
      },
      "application/vnd.onepagertamp": {
        source: "iana"
      },
      "application/vnd.onepagertamx": {
        source: "iana"
      },
      "application/vnd.onepagertat": {
        source: "iana"
      },
      "application/vnd.onepagertatp": {
        source: "iana"
      },
      "application/vnd.onepagertatx": {
        source: "iana"
      },
      "application/vnd.openblox.game+xml": {
        source: "iana",
        compressible: true,
        extensions: ["obgx"]
      },
      "application/vnd.openblox.game-binary": {
        source: "iana"
      },
      "application/vnd.openeye.oeb": {
        source: "iana"
      },
      "application/vnd.openofficeorg.extension": {
        source: "apache",
        extensions: ["oxt"]
      },
      "application/vnd.openstreetmap.data+xml": {
        source: "iana",
        compressible: true,
        extensions: ["osm"]
      },
      "application/vnd.opentimestamps.ots": {
        source: "iana"
      },
      "application/vnd.openxmlformats-officedocument.custom-properties+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.customxmlproperties+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawing+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawingml.chart+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawingml.chartshapes+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawingml.diagramcolors+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawingml.diagramdata+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawingml.diagramlayout+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawingml.diagramstyle+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.extended-properties+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.commentauthors+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.comments+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.handoutmaster+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.notesmaster+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.notesslide+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
        source: "iana",
        compressible: false,
        extensions: ["pptx"]
      },
      "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.presprops+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slide": {
        source: "iana",
        extensions: ["sldx"]
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slide+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slidelayout+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slidemaster+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slideshow": {
        source: "iana",
        extensions: ["ppsx"]
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slideshow.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slideupdateinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.tablestyles+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.tags+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.template": {
        source: "iana",
        extensions: ["potx"]
      },
      "application/vnd.openxmlformats-officedocument.presentationml.template.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.viewprops+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.calcchain+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.chartsheet+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.connections+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.dialogsheet+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.externallink+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcachedefinition+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcacherecords+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.pivottable+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.querytable+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionheaders+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionlog+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedstrings+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
        source: "iana",
        compressible: false,
        extensions: ["xlsx"]
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheetmetadata+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.tablesinglecells+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.template": {
        source: "iana",
        extensions: ["xltx"]
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.usernames+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.volatiledependencies+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.theme+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.themeoverride+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.vmldrawing": {
        source: "iana"
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
        source: "iana",
        compressible: false,
        extensions: ["docx"]
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document.glossary+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.fonttable+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.template": {
        source: "iana",
        extensions: ["dotx"]
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.websettings+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-package.core-properties+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-package.digital-signature-xmlsignature+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-package.relationships+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oracle.resource+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.orange.indata": {
        source: "iana"
      },
      "application/vnd.osa.netdeploy": {
        source: "iana"
      },
      "application/vnd.osgeo.mapguide.package": {
        source: "iana",
        extensions: ["mgp"]
      },
      "application/vnd.osgi.bundle": {
        source: "iana"
      },
      "application/vnd.osgi.dp": {
        source: "iana",
        extensions: ["dp"]
      },
      "application/vnd.osgi.subsystem": {
        source: "iana",
        extensions: ["esa"]
      },
      "application/vnd.otps.ct-kip+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oxli.countgraph": {
        source: "iana"
      },
      "application/vnd.pagerduty+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.palm": {
        source: "iana",
        extensions: ["pdb", "pqa", "oprc"]
      },
      "application/vnd.panoply": {
        source: "iana"
      },
      "application/vnd.paos.xml": {
        source: "iana"
      },
      "application/vnd.patentdive": {
        source: "iana"
      },
      "application/vnd.patientecommsdoc": {
        source: "iana"
      },
      "application/vnd.pawaafile": {
        source: "iana",
        extensions: ["paw"]
      },
      "application/vnd.pcos": {
        source: "iana"
      },
      "application/vnd.pg.format": {
        source: "iana",
        extensions: ["str"]
      },
      "application/vnd.pg.osasli": {
        source: "iana",
        extensions: ["ei6"]
      },
      "application/vnd.piaccess.application-licence": {
        source: "iana"
      },
      "application/vnd.picsel": {
        source: "iana",
        extensions: ["efif"]
      },
      "application/vnd.pmi.widget": {
        source: "iana",
        extensions: ["wg"]
      },
      "application/vnd.poc.group-advertisement+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.pocketlearn": {
        source: "iana",
        extensions: ["plf"]
      },
      "application/vnd.powerbuilder6": {
        source: "iana",
        extensions: ["pbd"]
      },
      "application/vnd.powerbuilder6-s": {
        source: "iana"
      },
      "application/vnd.powerbuilder7": {
        source: "iana"
      },
      "application/vnd.powerbuilder7-s": {
        source: "iana"
      },
      "application/vnd.powerbuilder75": {
        source: "iana"
      },
      "application/vnd.powerbuilder75-s": {
        source: "iana"
      },
      "application/vnd.preminet": {
        source: "iana"
      },
      "application/vnd.previewsystems.box": {
        source: "iana",
        extensions: ["box"]
      },
      "application/vnd.proteus.magazine": {
        source: "iana",
        extensions: ["mgz"]
      },
      "application/vnd.psfs": {
        source: "iana"
      },
      "application/vnd.publishare-delta-tree": {
        source: "iana",
        extensions: ["qps"]
      },
      "application/vnd.pvi.ptid1": {
        source: "iana",
        extensions: ["ptid"]
      },
      "application/vnd.pwg-multiplexed": {
        source: "iana"
      },
      "application/vnd.pwg-xhtml-print+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.qualcomm.brew-app-res": {
        source: "iana"
      },
      "application/vnd.quarantainenet": {
        source: "iana"
      },
      "application/vnd.quark.quarkxpress": {
        source: "iana",
        extensions: ["qxd", "qxt", "qwd", "qwt", "qxl", "qxb"]
      },
      "application/vnd.quobject-quoxdocument": {
        source: "iana"
      },
      "application/vnd.radisys.moml+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-audit+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-audit-conf+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-audit-conn+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-audit-dialog+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-audit-stream+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-conf+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog-base+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog-fax-detect+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog-fax-sendrecv+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog-group+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog-speech+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog-transform+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.rainstor.data": {
        source: "iana"
      },
      "application/vnd.rapid": {
        source: "iana"
      },
      "application/vnd.rar": {
        source: "iana",
        extensions: ["rar"]
      },
      "application/vnd.realvnc.bed": {
        source: "iana",
        extensions: ["bed"]
      },
      "application/vnd.recordare.musicxml": {
        source: "iana",
        extensions: ["mxl"]
      },
      "application/vnd.recordare.musicxml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["musicxml"]
      },
      "application/vnd.renlearn.rlprint": {
        source: "iana"
      },
      "application/vnd.resilient.logic": {
        source: "iana"
      },
      "application/vnd.restful+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.rig.cryptonote": {
        source: "iana",
        extensions: ["cryptonote"]
      },
      "application/vnd.rim.cod": {
        source: "apache",
        extensions: ["cod"]
      },
      "application/vnd.rn-realmedia": {
        source: "apache",
        extensions: ["rm"]
      },
      "application/vnd.rn-realmedia-vbr": {
        source: "apache",
        extensions: ["rmvb"]
      },
      "application/vnd.route66.link66+xml": {
        source: "iana",
        compressible: true,
        extensions: ["link66"]
      },
      "application/vnd.rs-274x": {
        source: "iana"
      },
      "application/vnd.ruckus.download": {
        source: "iana"
      },
      "application/vnd.s3sms": {
        source: "iana"
      },
      "application/vnd.sailingtracker.track": {
        source: "iana",
        extensions: ["st"]
      },
      "application/vnd.sar": {
        source: "iana"
      },
      "application/vnd.sbm.cid": {
        source: "iana"
      },
      "application/vnd.sbm.mid2": {
        source: "iana"
      },
      "application/vnd.scribus": {
        source: "iana"
      },
      "application/vnd.sealed.3df": {
        source: "iana"
      },
      "application/vnd.sealed.csf": {
        source: "iana"
      },
      "application/vnd.sealed.doc": {
        source: "iana"
      },
      "application/vnd.sealed.eml": {
        source: "iana"
      },
      "application/vnd.sealed.mht": {
        source: "iana"
      },
      "application/vnd.sealed.net": {
        source: "iana"
      },
      "application/vnd.sealed.ppt": {
        source: "iana"
      },
      "application/vnd.sealed.tiff": {
        source: "iana"
      },
      "application/vnd.sealed.xls": {
        source: "iana"
      },
      "application/vnd.sealedmedia.softseal.html": {
        source: "iana"
      },
      "application/vnd.sealedmedia.softseal.pdf": {
        source: "iana"
      },
      "application/vnd.seemail": {
        source: "iana",
        extensions: ["see"]
      },
      "application/vnd.seis+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.sema": {
        source: "iana",
        extensions: ["sema"]
      },
      "application/vnd.semd": {
        source: "iana",
        extensions: ["semd"]
      },
      "application/vnd.semf": {
        source: "iana",
        extensions: ["semf"]
      },
      "application/vnd.shade-save-file": {
        source: "iana"
      },
      "application/vnd.shana.informed.formdata": {
        source: "iana",
        extensions: ["ifm"]
      },
      "application/vnd.shana.informed.formtemplate": {
        source: "iana",
        extensions: ["itp"]
      },
      "application/vnd.shana.informed.interchange": {
        source: "iana",
        extensions: ["iif"]
      },
      "application/vnd.shana.informed.package": {
        source: "iana",
        extensions: ["ipk"]
      },
      "application/vnd.shootproof+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.shopkick+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.shp": {
        source: "iana"
      },
      "application/vnd.shx": {
        source: "iana"
      },
      "application/vnd.sigrok.session": {
        source: "iana"
      },
      "application/vnd.simtech-mindmapper": {
        source: "iana",
        extensions: ["twd", "twds"]
      },
      "application/vnd.siren+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.smaf": {
        source: "iana",
        extensions: ["mmf"]
      },
      "application/vnd.smart.notebook": {
        source: "iana"
      },
      "application/vnd.smart.teacher": {
        source: "iana",
        extensions: ["teacher"]
      },
      "application/vnd.snesdev-page-table": {
        source: "iana"
      },
      "application/vnd.software602.filler.form+xml": {
        source: "iana",
        compressible: true,
        extensions: ["fo"]
      },
      "application/vnd.software602.filler.form-xml-zip": {
        source: "iana"
      },
      "application/vnd.solent.sdkm+xml": {
        source: "iana",
        compressible: true,
        extensions: ["sdkm", "sdkd"]
      },
      "application/vnd.spotfire.dxp": {
        source: "iana",
        extensions: ["dxp"]
      },
      "application/vnd.spotfire.sfs": {
        source: "iana",
        extensions: ["sfs"]
      },
      "application/vnd.sqlite3": {
        source: "iana"
      },
      "application/vnd.sss-cod": {
        source: "iana"
      },
      "application/vnd.sss-dtf": {
        source: "iana"
      },
      "application/vnd.sss-ntf": {
        source: "iana"
      },
      "application/vnd.stardivision.calc": {
        source: "apache",
        extensions: ["sdc"]
      },
      "application/vnd.stardivision.draw": {
        source: "apache",
        extensions: ["sda"]
      },
      "application/vnd.stardivision.impress": {
        source: "apache",
        extensions: ["sdd"]
      },
      "application/vnd.stardivision.math": {
        source: "apache",
        extensions: ["smf"]
      },
      "application/vnd.stardivision.writer": {
        source: "apache",
        extensions: ["sdw", "vor"]
      },
      "application/vnd.stardivision.writer-global": {
        source: "apache",
        extensions: ["sgl"]
      },
      "application/vnd.stepmania.package": {
        source: "iana",
        extensions: ["smzip"]
      },
      "application/vnd.stepmania.stepchart": {
        source: "iana",
        extensions: ["sm"]
      },
      "application/vnd.street-stream": {
        source: "iana"
      },
      "application/vnd.sun.wadl+xml": {
        source: "iana",
        compressible: true,
        extensions: ["wadl"]
      },
      "application/vnd.sun.xml.calc": {
        source: "apache",
        extensions: ["sxc"]
      },
      "application/vnd.sun.xml.calc.template": {
        source: "apache",
        extensions: ["stc"]
      },
      "application/vnd.sun.xml.draw": {
        source: "apache",
        extensions: ["sxd"]
      },
      "application/vnd.sun.xml.draw.template": {
        source: "apache",
        extensions: ["std"]
      },
      "application/vnd.sun.xml.impress": {
        source: "apache",
        extensions: ["sxi"]
      },
      "application/vnd.sun.xml.impress.template": {
        source: "apache",
        extensions: ["sti"]
      },
      "application/vnd.sun.xml.math": {
        source: "apache",
        extensions: ["sxm"]
      },
      "application/vnd.sun.xml.writer": {
        source: "apache",
        extensions: ["sxw"]
      },
      "application/vnd.sun.xml.writer.global": {
        source: "apache",
        extensions: ["sxg"]
      },
      "application/vnd.sun.xml.writer.template": {
        source: "apache",
        extensions: ["stw"]
      },
      "application/vnd.sus-calendar": {
        source: "iana",
        extensions: ["sus", "susp"]
      },
      "application/vnd.svd": {
        source: "iana",
        extensions: ["svd"]
      },
      "application/vnd.swiftview-ics": {
        source: "iana"
      },
      "application/vnd.sycle+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.syft+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.symbian.install": {
        source: "apache",
        extensions: ["sis", "sisx"]
      },
      "application/vnd.syncml+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["xsm"]
      },
      "application/vnd.syncml.dm+wbxml": {
        source: "iana",
        charset: "UTF-8",
        extensions: ["bdm"]
      },
      "application/vnd.syncml.dm+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["xdm"]
      },
      "application/vnd.syncml.dm.notification": {
        source: "iana"
      },
      "application/vnd.syncml.dmddf+wbxml": {
        source: "iana"
      },
      "application/vnd.syncml.dmddf+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["ddf"]
      },
      "application/vnd.syncml.dmtnds+wbxml": {
        source: "iana"
      },
      "application/vnd.syncml.dmtnds+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/vnd.syncml.ds.notification": {
        source: "iana"
      },
      "application/vnd.tableschema+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.tao.intent-module-archive": {
        source: "iana",
        extensions: ["tao"]
      },
      "application/vnd.tcpdump.pcap": {
        source: "iana",
        extensions: ["pcap", "cap", "dmp"]
      },
      "application/vnd.think-cell.ppttc+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.tmd.mediaflex.api+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.tml": {
        source: "iana"
      },
      "application/vnd.tmobile-livetv": {
        source: "iana",
        extensions: ["tmo"]
      },
      "application/vnd.tri.onesource": {
        source: "iana"
      },
      "application/vnd.trid.tpt": {
        source: "iana",
        extensions: ["tpt"]
      },
      "application/vnd.triscape.mxs": {
        source: "iana",
        extensions: ["mxs"]
      },
      "application/vnd.trueapp": {
        source: "iana",
        extensions: ["tra"]
      },
      "application/vnd.truedoc": {
        source: "iana"
      },
      "application/vnd.ubisoft.webplayer": {
        source: "iana"
      },
      "application/vnd.ufdl": {
        source: "iana",
        extensions: ["ufd", "ufdl"]
      },
      "application/vnd.uiq.theme": {
        source: "iana",
        extensions: ["utz"]
      },
      "application/vnd.umajin": {
        source: "iana",
        extensions: ["umj"]
      },
      "application/vnd.unity": {
        source: "iana",
        extensions: ["unityweb"]
      },
      "application/vnd.uoml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["uoml"]
      },
      "application/vnd.uplanet.alert": {
        source: "iana"
      },
      "application/vnd.uplanet.alert-wbxml": {
        source: "iana"
      },
      "application/vnd.uplanet.bearer-choice": {
        source: "iana"
      },
      "application/vnd.uplanet.bearer-choice-wbxml": {
        source: "iana"
      },
      "application/vnd.uplanet.cacheop": {
        source: "iana"
      },
      "application/vnd.uplanet.cacheop-wbxml": {
        source: "iana"
      },
      "application/vnd.uplanet.channel": {
        source: "iana"
      },
      "application/vnd.uplanet.channel-wbxml": {
        source: "iana"
      },
      "application/vnd.uplanet.list": {
        source: "iana"
      },
      "application/vnd.uplanet.list-wbxml": {
        source: "iana"
      },
      "application/vnd.uplanet.listcmd": {
        source: "iana"
      },
      "application/vnd.uplanet.listcmd-wbxml": {
        source: "iana"
      },
      "application/vnd.uplanet.signal": {
        source: "iana"
      },
      "application/vnd.uri-map": {
        source: "iana"
      },
      "application/vnd.valve.source.material": {
        source: "iana"
      },
      "application/vnd.vcx": {
        source: "iana",
        extensions: ["vcx"]
      },
      "application/vnd.vd-study": {
        source: "iana"
      },
      "application/vnd.vectorworks": {
        source: "iana"
      },
      "application/vnd.vel+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.verimatrix.vcas": {
        source: "iana"
      },
      "application/vnd.veritone.aion+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.veryant.thin": {
        source: "iana"
      },
      "application/vnd.ves.encrypted": {
        source: "iana"
      },
      "application/vnd.vidsoft.vidconference": {
        source: "iana"
      },
      "application/vnd.visio": {
        source: "iana",
        extensions: ["vsd", "vst", "vss", "vsw"]
      },
      "application/vnd.visionary": {
        source: "iana",
        extensions: ["vis"]
      },
      "application/vnd.vividence.scriptfile": {
        source: "iana"
      },
      "application/vnd.vsf": {
        source: "iana",
        extensions: ["vsf"]
      },
      "application/vnd.wap.sic": {
        source: "iana"
      },
      "application/vnd.wap.slc": {
        source: "iana"
      },
      "application/vnd.wap.wbxml": {
        source: "iana",
        charset: "UTF-8",
        extensions: ["wbxml"]
      },
      "application/vnd.wap.wmlc": {
        source: "iana",
        extensions: ["wmlc"]
      },
      "application/vnd.wap.wmlscriptc": {
        source: "iana",
        extensions: ["wmlsc"]
      },
      "application/vnd.webturbo": {
        source: "iana",
        extensions: ["wtb"]
      },
      "application/vnd.wfa.dpp": {
        source: "iana"
      },
      "application/vnd.wfa.p2p": {
        source: "iana"
      },
      "application/vnd.wfa.wsc": {
        source: "iana"
      },
      "application/vnd.windows.devicepairing": {
        source: "iana"
      },
      "application/vnd.wmc": {
        source: "iana"
      },
      "application/vnd.wmf.bootstrap": {
        source: "iana"
      },
      "application/vnd.wolfram.mathematica": {
        source: "iana"
      },
      "application/vnd.wolfram.mathematica.package": {
        source: "iana"
      },
      "application/vnd.wolfram.player": {
        source: "iana",
        extensions: ["nbp"]
      },
      "application/vnd.wordperfect": {
        source: "iana",
        extensions: ["wpd"]
      },
      "application/vnd.wqd": {
        source: "iana",
        extensions: ["wqd"]
      },
      "application/vnd.wrq-hp3000-labelled": {
        source: "iana"
      },
      "application/vnd.wt.stf": {
        source: "iana",
        extensions: ["stf"]
      },
      "application/vnd.wv.csp+wbxml": {
        source: "iana"
      },
      "application/vnd.wv.csp+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.wv.ssp+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.xacml+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.xara": {
        source: "iana",
        extensions: ["xar"]
      },
      "application/vnd.xfdl": {
        source: "iana",
        extensions: ["xfdl"]
      },
      "application/vnd.xfdl.webform": {
        source: "iana"
      },
      "application/vnd.xmi+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.xmpie.cpkg": {
        source: "iana"
      },
      "application/vnd.xmpie.dpkg": {
        source: "iana"
      },
      "application/vnd.xmpie.plan": {
        source: "iana"
      },
      "application/vnd.xmpie.ppkg": {
        source: "iana"
      },
      "application/vnd.xmpie.xlim": {
        source: "iana"
      },
      "application/vnd.yamaha.hv-dic": {
        source: "iana",
        extensions: ["hvd"]
      },
      "application/vnd.yamaha.hv-script": {
        source: "iana",
        extensions: ["hvs"]
      },
      "application/vnd.yamaha.hv-voice": {
        source: "iana",
        extensions: ["hvp"]
      },
      "application/vnd.yamaha.openscoreformat": {
        source: "iana",
        extensions: ["osf"]
      },
      "application/vnd.yamaha.openscoreformat.osfpvg+xml": {
        source: "iana",
        compressible: true,
        extensions: ["osfpvg"]
      },
      "application/vnd.yamaha.remote-setup": {
        source: "iana"
      },
      "application/vnd.yamaha.smaf-audio": {
        source: "iana",
        extensions: ["saf"]
      },
      "application/vnd.yamaha.smaf-phrase": {
        source: "iana",
        extensions: ["spf"]
      },
      "application/vnd.yamaha.through-ngn": {
        source: "iana"
      },
      "application/vnd.yamaha.tunnel-udpencap": {
        source: "iana"
      },
      "application/vnd.yaoweme": {
        source: "iana"
      },
      "application/vnd.yellowriver-custom-menu": {
        source: "iana",
        extensions: ["cmp"]
      },
      "application/vnd.youtube.yt": {
        source: "iana"
      },
      "application/vnd.zul": {
        source: "iana",
        extensions: ["zir", "zirz"]
      },
      "application/vnd.zzazz.deck+xml": {
        source: "iana",
        compressible: true,
        extensions: ["zaz"]
      },
      "application/voicexml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["vxml"]
      },
      "application/voucher-cms+json": {
        source: "iana",
        compressible: true
      },
      "application/vq-rtcpxr": {
        source: "iana"
      },
      "application/wasm": {
        source: "iana",
        compressible: true,
        extensions: ["wasm"]
      },
      "application/watcherinfo+xml": {
        source: "iana",
        compressible: true,
        extensions: ["wif"]
      },
      "application/webpush-options+json": {
        source: "iana",
        compressible: true
      },
      "application/whoispp-query": {
        source: "iana"
      },
      "application/whoispp-response": {
        source: "iana"
      },
      "application/widget": {
        source: "iana",
        extensions: ["wgt"]
      },
      "application/winhlp": {
        source: "apache",
        extensions: ["hlp"]
      },
      "application/wita": {
        source: "iana"
      },
      "application/wordperfect5.1": {
        source: "iana"
      },
      "application/wsdl+xml": {
        source: "iana",
        compressible: true,
        extensions: ["wsdl"]
      },
      "application/wspolicy+xml": {
        source: "iana",
        compressible: true,
        extensions: ["wspolicy"]
      },
      "application/x-7z-compressed": {
        source: "apache",
        compressible: false,
        extensions: ["7z"]
      },
      "application/x-abiword": {
        source: "apache",
        extensions: ["abw"]
      },
      "application/x-ace-compressed": {
        source: "apache",
        extensions: ["ace"]
      },
      "application/x-amf": {
        source: "apache"
      },
      "application/x-apple-diskimage": {
        source: "apache",
        extensions: ["dmg"]
      },
      "application/x-arj": {
        compressible: false,
        extensions: ["arj"]
      },
      "application/x-authorware-bin": {
        source: "apache",
        extensions: ["aab", "x32", "u32", "vox"]
      },
      "application/x-authorware-map": {
        source: "apache",
        extensions: ["aam"]
      },
      "application/x-authorware-seg": {
        source: "apache",
        extensions: ["aas"]
      },
      "application/x-bcpio": {
        source: "apache",
        extensions: ["bcpio"]
      },
      "application/x-bdoc": {
        compressible: false,
        extensions: ["bdoc"]
      },
      "application/x-bittorrent": {
        source: "apache",
        extensions: ["torrent"]
      },
      "application/x-blorb": {
        source: "apache",
        extensions: ["blb", "blorb"]
      },
      "application/x-bzip": {
        source: "apache",
        compressible: false,
        extensions: ["bz"]
      },
      "application/x-bzip2": {
        source: "apache",
        compressible: false,
        extensions: ["bz2", "boz"]
      },
      "application/x-cbr": {
        source: "apache",
        extensions: ["cbr", "cba", "cbt", "cbz", "cb7"]
      },
      "application/x-cdlink": {
        source: "apache",
        extensions: ["vcd"]
      },
      "application/x-cfs-compressed": {
        source: "apache",
        extensions: ["cfs"]
      },
      "application/x-chat": {
        source: "apache",
        extensions: ["chat"]
      },
      "application/x-chess-pgn": {
        source: "apache",
        extensions: ["pgn"]
      },
      "application/x-chrome-extension": {
        extensions: ["crx"]
      },
      "application/x-cocoa": {
        source: "nginx",
        extensions: ["cco"]
      },
      "application/x-compress": {
        source: "apache"
      },
      "application/x-conference": {
        source: "apache",
        extensions: ["nsc"]
      },
      "application/x-cpio": {
        source: "apache",
        extensions: ["cpio"]
      },
      "application/x-csh": {
        source: "apache",
        extensions: ["csh"]
      },
      "application/x-deb": {
        compressible: false
      },
      "application/x-debian-package": {
        source: "apache",
        extensions: ["deb", "udeb"]
      },
      "application/x-dgc-compressed": {
        source: "apache",
        extensions: ["dgc"]
      },
      "application/x-director": {
        source: "apache",
        extensions: ["dir", "dcr", "dxr", "cst", "cct", "cxt", "w3d", "fgd", "swa"]
      },
      "application/x-doom": {
        source: "apache",
        extensions: ["wad"]
      },
      "application/x-dtbncx+xml": {
        source: "apache",
        compressible: true,
        extensions: ["ncx"]
      },
      "application/x-dtbook+xml": {
        source: "apache",
        compressible: true,
        extensions: ["dtb"]
      },
      "application/x-dtbresource+xml": {
        source: "apache",
        compressible: true,
        extensions: ["res"]
      },
      "application/x-dvi": {
        source: "apache",
        compressible: false,
        extensions: ["dvi"]
      },
      "application/x-envoy": {
        source: "apache",
        extensions: ["evy"]
      },
      "application/x-eva": {
        source: "apache",
        extensions: ["eva"]
      },
      "application/x-font-bdf": {
        source: "apache",
        extensions: ["bdf"]
      },
      "application/x-font-dos": {
        source: "apache"
      },
      "application/x-font-framemaker": {
        source: "apache"
      },
      "application/x-font-ghostscript": {
        source: "apache",
        extensions: ["gsf"]
      },
      "application/x-font-libgrx": {
        source: "apache"
      },
      "application/x-font-linux-psf": {
        source: "apache",
        extensions: ["psf"]
      },
      "application/x-font-pcf": {
        source: "apache",
        extensions: ["pcf"]
      },
      "application/x-font-snf": {
        source: "apache",
        extensions: ["snf"]
      },
      "application/x-font-speedo": {
        source: "apache"
      },
      "application/x-font-sunos-news": {
        source: "apache"
      },
      "application/x-font-type1": {
        source: "apache",
        extensions: ["pfa", "pfb", "pfm", "afm"]
      },
      "application/x-font-vfont": {
        source: "apache"
      },
      "application/x-freearc": {
        source: "apache",
        extensions: ["arc"]
      },
      "application/x-futuresplash": {
        source: "apache",
        extensions: ["spl"]
      },
      "application/x-gca-compressed": {
        source: "apache",
        extensions: ["gca"]
      },
      "application/x-glulx": {
        source: "apache",
        extensions: ["ulx"]
      },
      "application/x-gnumeric": {
        source: "apache",
        extensions: ["gnumeric"]
      },
      "application/x-gramps-xml": {
        source: "apache",
        extensions: ["gramps"]
      },
      "application/x-gtar": {
        source: "apache",
        extensions: ["gtar"]
      },
      "application/x-gzip": {
        source: "apache"
      },
      "application/x-hdf": {
        source: "apache",
        extensions: ["hdf"]
      },
      "application/x-httpd-php": {
        compressible: true,
        extensions: ["php"]
      },
      "application/x-install-instructions": {
        source: "apache",
        extensions: ["install"]
      },
      "application/x-iso9660-image": {
        source: "apache",
        extensions: ["iso"]
      },
      "application/x-iwork-keynote-sffkey": {
        extensions: ["key"]
      },
      "application/x-iwork-numbers-sffnumbers": {
        extensions: ["numbers"]
      },
      "application/x-iwork-pages-sffpages": {
        extensions: ["pages"]
      },
      "application/x-java-archive-diff": {
        source: "nginx",
        extensions: ["jardiff"]
      },
      "application/x-java-jnlp-file": {
        source: "apache",
        compressible: false,
        extensions: ["jnlp"]
      },
      "application/x-javascript": {
        compressible: true
      },
      "application/x-keepass2": {
        extensions: ["kdbx"]
      },
      "application/x-latex": {
        source: "apache",
        compressible: false,
        extensions: ["latex"]
      },
      "application/x-lua-bytecode": {
        extensions: ["luac"]
      },
      "application/x-lzh-compressed": {
        source: "apache",
        extensions: ["lzh", "lha"]
      },
      "application/x-makeself": {
        source: "nginx",
        extensions: ["run"]
      },
      "application/x-mie": {
        source: "apache",
        extensions: ["mie"]
      },
      "application/x-mobipocket-ebook": {
        source: "apache",
        extensions: ["prc", "mobi"]
      },
      "application/x-mpegurl": {
        compressible: false
      },
      "application/x-ms-application": {
        source: "apache",
        extensions: ["application"]
      },
      "application/x-ms-shortcut": {
        source: "apache",
        extensions: ["lnk"]
      },
      "application/x-ms-wmd": {
        source: "apache",
        extensions: ["wmd"]
      },
      "application/x-ms-wmz": {
        source: "apache",
        extensions: ["wmz"]
      },
      "application/x-ms-xbap": {
        source: "apache",
        extensions: ["xbap"]
      },
      "application/x-msaccess": {
        source: "apache",
        extensions: ["mdb"]
      },
      "application/x-msbinder": {
        source: "apache",
        extensions: ["obd"]
      },
      "application/x-mscardfile": {
        source: "apache",
        extensions: ["crd"]
      },
      "application/x-msclip": {
        source: "apache",
        extensions: ["clp"]
      },
      "application/x-msdos-program": {
        extensions: ["exe"]
      },
      "application/x-msdownload": {
        source: "apache",
        extensions: ["exe", "dll", "com", "bat", "msi"]
      },
      "application/x-msmediaview": {
        source: "apache",
        extensions: ["mvb", "m13", "m14"]
      },
      "application/x-msmetafile": {
        source: "apache",
        extensions: ["wmf", "wmz", "emf", "emz"]
      },
      "application/x-msmoney": {
        source: "apache",
        extensions: ["mny"]
      },
      "application/x-mspublisher": {
        source: "apache",
        extensions: ["pub"]
      },
      "application/x-msschedule": {
        source: "apache",
        extensions: ["scd"]
      },
      "application/x-msterminal": {
        source: "apache",
        extensions: ["trm"]
      },
      "application/x-mswrite": {
        source: "apache",
        extensions: ["wri"]
      },
      "application/x-netcdf": {
        source: "apache",
        extensions: ["nc", "cdf"]
      },
      "application/x-ns-proxy-autoconfig": {
        compressible: true,
        extensions: ["pac"]
      },
      "application/x-nzb": {
        source: "apache",
        extensions: ["nzb"]
      },
      "application/x-perl": {
        source: "nginx",
        extensions: ["pl", "pm"]
      },
      "application/x-pilot": {
        source: "nginx",
        extensions: ["prc", "pdb"]
      },
      "application/x-pkcs12": {
        source: "apache",
        compressible: false,
        extensions: ["p12", "pfx"]
      },
      "application/x-pkcs7-certificates": {
        source: "apache",
        extensions: ["p7b", "spc"]
      },
      "application/x-pkcs7-certreqresp": {
        source: "apache",
        extensions: ["p7r"]
      },
      "application/x-pki-message": {
        source: "iana"
      },
      "application/x-rar-compressed": {
        source: "apache",
        compressible: false,
        extensions: ["rar"]
      },
      "application/x-redhat-package-manager": {
        source: "nginx",
        extensions: ["rpm"]
      },
      "application/x-research-info-systems": {
        source: "apache",
        extensions: ["ris"]
      },
      "application/x-sea": {
        source: "nginx",
        extensions: ["sea"]
      },
      "application/x-sh": {
        source: "apache",
        compressible: true,
        extensions: ["sh"]
      },
      "application/x-shar": {
        source: "apache",
        extensions: ["shar"]
      },
      "application/x-shockwave-flash": {
        source: "apache",
        compressible: false,
        extensions: ["swf"]
      },
      "application/x-silverlight-app": {
        source: "apache",
        extensions: ["xap"]
      },
      "application/x-sql": {
        source: "apache",
        extensions: ["sql"]
      },
      "application/x-stuffit": {
        source: "apache",
        compressible: false,
        extensions: ["sit"]
      },
      "application/x-stuffitx": {
        source: "apache",
        extensions: ["sitx"]
      },
      "application/x-subrip": {
        source: "apache",
        extensions: ["srt"]
      },
      "application/x-sv4cpio": {
        source: "apache",
        extensions: ["sv4cpio"]
      },
      "application/x-sv4crc": {
        source: "apache",
        extensions: ["sv4crc"]
      },
      "application/x-t3vm-image": {
        source: "apache",
        extensions: ["t3"]
      },
      "application/x-tads": {
        source: "apache",
        extensions: ["gam"]
      },
      "application/x-tar": {
        source: "apache",
        compressible: true,
        extensions: ["tar"]
      },
      "application/x-tcl": {
        source: "apache",
        extensions: ["tcl", "tk"]
      },
      "application/x-tex": {
        source: "apache",
        extensions: ["tex"]
      },
      "application/x-tex-tfm": {
        source: "apache",
        extensions: ["tfm"]
      },
      "application/x-texinfo": {
        source: "apache",
        extensions: ["texinfo", "texi"]
      },
      "application/x-tgif": {
        source: "apache",
        extensions: ["obj"]
      },
      "application/x-ustar": {
        source: "apache",
        extensions: ["ustar"]
      },
      "application/x-virtualbox-hdd": {
        compressible: true,
        extensions: ["hdd"]
      },
      "application/x-virtualbox-ova": {
        compressible: true,
        extensions: ["ova"]
      },
      "application/x-virtualbox-ovf": {
        compressible: true,
        extensions: ["ovf"]
      },
      "application/x-virtualbox-vbox": {
        compressible: true,
        extensions: ["vbox"]
      },
      "application/x-virtualbox-vbox-extpack": {
        compressible: false,
        extensions: ["vbox-extpack"]
      },
      "application/x-virtualbox-vdi": {
        compressible: true,
        extensions: ["vdi"]
      },
      "application/x-virtualbox-vhd": {
        compressible: true,
        extensions: ["vhd"]
      },
      "application/x-virtualbox-vmdk": {
        compressible: true,
        extensions: ["vmdk"]
      },
      "application/x-wais-source": {
        source: "apache",
        extensions: ["src"]
      },
      "application/x-web-app-manifest+json": {
        compressible: true,
        extensions: ["webapp"]
      },
      "application/x-www-form-urlencoded": {
        source: "iana",
        compressible: true
      },
      "application/x-x509-ca-cert": {
        source: "iana",
        extensions: ["der", "crt", "pem"]
      },
      "application/x-x509-ca-ra-cert": {
        source: "iana"
      },
      "application/x-x509-next-ca-cert": {
        source: "iana"
      },
      "application/x-xfig": {
        source: "apache",
        extensions: ["fig"]
      },
      "application/x-xliff+xml": {
        source: "apache",
        compressible: true,
        extensions: ["xlf"]
      },
      "application/x-xpinstall": {
        source: "apache",
        compressible: false,
        extensions: ["xpi"]
      },
      "application/x-xz": {
        source: "apache",
        extensions: ["xz"]
      },
      "application/x-zmachine": {
        source: "apache",
        extensions: ["z1", "z2", "z3", "z4", "z5", "z6", "z7", "z8"]
      },
      "application/x400-bp": {
        source: "iana"
      },
      "application/xacml+xml": {
        source: "iana",
        compressible: true
      },
      "application/xaml+xml": {
        source: "apache",
        compressible: true,
        extensions: ["xaml"]
      },
      "application/xcap-att+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xav"]
      },
      "application/xcap-caps+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xca"]
      },
      "application/xcap-diff+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xdf"]
      },
      "application/xcap-el+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xel"]
      },
      "application/xcap-error+xml": {
        source: "iana",
        compressible: true
      },
      "application/xcap-ns+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xns"]
      },
      "application/xcon-conference-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/xcon-conference-info-diff+xml": {
        source: "iana",
        compressible: true
      },
      "application/xenc+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xenc"]
      },
      "application/xhtml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xhtml", "xht"]
      },
      "application/xhtml-voice+xml": {
        source: "apache",
        compressible: true
      },
      "application/xliff+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xlf"]
      },
      "application/xml": {
        source: "iana",
        compressible: true,
        extensions: ["xml", "xsl", "xsd", "rng"]
      },
      "application/xml-dtd": {
        source: "iana",
        compressible: true,
        extensions: ["dtd"]
      },
      "application/xml-external-parsed-entity": {
        source: "iana"
      },
      "application/xml-patch+xml": {
        source: "iana",
        compressible: true
      },
      "application/xmpp+xml": {
        source: "iana",
        compressible: true
      },
      "application/xop+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xop"]
      },
      "application/xproc+xml": {
        source: "apache",
        compressible: true,
        extensions: ["xpl"]
      },
      "application/xslt+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xsl", "xslt"]
      },
      "application/xspf+xml": {
        source: "apache",
        compressible: true,
        extensions: ["xspf"]
      },
      "application/xv+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mxml", "xhvml", "xvml", "xvm"]
      },
      "application/yang": {
        source: "iana",
        extensions: ["yang"]
      },
      "application/yang-data+json": {
        source: "iana",
        compressible: true
      },
      "application/yang-data+xml": {
        source: "iana",
        compressible: true
      },
      "application/yang-patch+json": {
        source: "iana",
        compressible: true
      },
      "application/yang-patch+xml": {
        source: "iana",
        compressible: true
      },
      "application/yin+xml": {
        source: "iana",
        compressible: true,
        extensions: ["yin"]
      },
      "application/zip": {
        source: "iana",
        compressible: false,
        extensions: ["zip"]
      },
      "application/zlib": {
        source: "iana"
      },
      "application/zstd": {
        source: "iana"
      },
      "audio/1d-interleaved-parityfec": {
        source: "iana"
      },
      "audio/32kadpcm": {
        source: "iana"
      },
      "audio/3gpp": {
        source: "iana",
        compressible: false,
        extensions: ["3gpp"]
      },
      "audio/3gpp2": {
        source: "iana"
      },
      "audio/aac": {
        source: "iana"
      },
      "audio/ac3": {
        source: "iana"
      },
      "audio/adpcm": {
        source: "apache",
        extensions: ["adp"]
      },
      "audio/amr": {
        source: "iana",
        extensions: ["amr"]
      },
      "audio/amr-wb": {
        source: "iana"
      },
      "audio/amr-wb+": {
        source: "iana"
      },
      "audio/aptx": {
        source: "iana"
      },
      "audio/asc": {
        source: "iana"
      },
      "audio/atrac-advanced-lossless": {
        source: "iana"
      },
      "audio/atrac-x": {
        source: "iana"
      },
      "audio/atrac3": {
        source: "iana"
      },
      "audio/basic": {
        source: "iana",
        compressible: false,
        extensions: ["au", "snd"]
      },
      "audio/bv16": {
        source: "iana"
      },
      "audio/bv32": {
        source: "iana"
      },
      "audio/clearmode": {
        source: "iana"
      },
      "audio/cn": {
        source: "iana"
      },
      "audio/dat12": {
        source: "iana"
      },
      "audio/dls": {
        source: "iana"
      },
      "audio/dsr-es201108": {
        source: "iana"
      },
      "audio/dsr-es202050": {
        source: "iana"
      },
      "audio/dsr-es202211": {
        source: "iana"
      },
      "audio/dsr-es202212": {
        source: "iana"
      },
      "audio/dv": {
        source: "iana"
      },
      "audio/dvi4": {
        source: "iana"
      },
      "audio/eac3": {
        source: "iana"
      },
      "audio/encaprtp": {
        source: "iana"
      },
      "audio/evrc": {
        source: "iana"
      },
      "audio/evrc-qcp": {
        source: "iana"
      },
      "audio/evrc0": {
        source: "iana"
      },
      "audio/evrc1": {
        source: "iana"
      },
      "audio/evrcb": {
        source: "iana"
      },
      "audio/evrcb0": {
        source: "iana"
      },
      "audio/evrcb1": {
        source: "iana"
      },
      "audio/evrcnw": {
        source: "iana"
      },
      "audio/evrcnw0": {
        source: "iana"
      },
      "audio/evrcnw1": {
        source: "iana"
      },
      "audio/evrcwb": {
        source: "iana"
      },
      "audio/evrcwb0": {
        source: "iana"
      },
      "audio/evrcwb1": {
        source: "iana"
      },
      "audio/evs": {
        source: "iana"
      },
      "audio/flexfec": {
        source: "iana"
      },
      "audio/fwdred": {
        source: "iana"
      },
      "audio/g711-0": {
        source: "iana"
      },
      "audio/g719": {
        source: "iana"
      },
      "audio/g722": {
        source: "iana"
      },
      "audio/g7221": {
        source: "iana"
      },
      "audio/g723": {
        source: "iana"
      },
      "audio/g726-16": {
        source: "iana"
      },
      "audio/g726-24": {
        source: "iana"
      },
      "audio/g726-32": {
        source: "iana"
      },
      "audio/g726-40": {
        source: "iana"
      },
      "audio/g728": {
        source: "iana"
      },
      "audio/g729": {
        source: "iana"
      },
      "audio/g7291": {
        source: "iana"
      },
      "audio/g729d": {
        source: "iana"
      },
      "audio/g729e": {
        source: "iana"
      },
      "audio/gsm": {
        source: "iana"
      },
      "audio/gsm-efr": {
        source: "iana"
      },
      "audio/gsm-hr-08": {
        source: "iana"
      },
      "audio/ilbc": {
        source: "iana"
      },
      "audio/ip-mr_v2.5": {
        source: "iana"
      },
      "audio/isac": {
        source: "apache"
      },
      "audio/l16": {
        source: "iana"
      },
      "audio/l20": {
        source: "iana"
      },
      "audio/l24": {
        source: "iana",
        compressible: false
      },
      "audio/l8": {
        source: "iana"
      },
      "audio/lpc": {
        source: "iana"
      },
      "audio/melp": {
        source: "iana"
      },
      "audio/melp1200": {
        source: "iana"
      },
      "audio/melp2400": {
        source: "iana"
      },
      "audio/melp600": {
        source: "iana"
      },
      "audio/mhas": {
        source: "iana"
      },
      "audio/midi": {
        source: "apache",
        extensions: ["mid", "midi", "kar", "rmi"]
      },
      "audio/mobile-xmf": {
        source: "iana",
        extensions: ["mxmf"]
      },
      "audio/mp3": {
        compressible: false,
        extensions: ["mp3"]
      },
      "audio/mp4": {
        source: "iana",
        compressible: false,
        extensions: ["m4a", "mp4a"]
      },
      "audio/mp4a-latm": {
        source: "iana"
      },
      "audio/mpa": {
        source: "iana"
      },
      "audio/mpa-robust": {
        source: "iana"
      },
      "audio/mpeg": {
        source: "iana",
        compressible: false,
        extensions: ["mpga", "mp2", "mp2a", "mp3", "m2a", "m3a"]
      },
      "audio/mpeg4-generic": {
        source: "iana"
      },
      "audio/musepack": {
        source: "apache"
      },
      "audio/ogg": {
        source: "iana",
        compressible: false,
        extensions: ["oga", "ogg", "spx", "opus"]
      },
      "audio/opus": {
        source: "iana"
      },
      "audio/parityfec": {
        source: "iana"
      },
      "audio/pcma": {
        source: "iana"
      },
      "audio/pcma-wb": {
        source: "iana"
      },
      "audio/pcmu": {
        source: "iana"
      },
      "audio/pcmu-wb": {
        source: "iana"
      },
      "audio/prs.sid": {
        source: "iana"
      },
      "audio/qcelp": {
        source: "iana"
      },
      "audio/raptorfec": {
        source: "iana"
      },
      "audio/red": {
        source: "iana"
      },
      "audio/rtp-enc-aescm128": {
        source: "iana"
      },
      "audio/rtp-midi": {
        source: "iana"
      },
      "audio/rtploopback": {
        source: "iana"
      },
      "audio/rtx": {
        source: "iana"
      },
      "audio/s3m": {
        source: "apache",
        extensions: ["s3m"]
      },
      "audio/scip": {
        source: "iana"
      },
      "audio/silk": {
        source: "apache",
        extensions: ["sil"]
      },
      "audio/smv": {
        source: "iana"
      },
      "audio/smv-qcp": {
        source: "iana"
      },
      "audio/smv0": {
        source: "iana"
      },
      "audio/sofa": {
        source: "iana"
      },
      "audio/sp-midi": {
        source: "iana"
      },
      "audio/speex": {
        source: "iana"
      },
      "audio/t140c": {
        source: "iana"
      },
      "audio/t38": {
        source: "iana"
      },
      "audio/telephone-event": {
        source: "iana"
      },
      "audio/tetra_acelp": {
        source: "iana"
      },
      "audio/tetra_acelp_bb": {
        source: "iana"
      },
      "audio/tone": {
        source: "iana"
      },
      "audio/tsvcis": {
        source: "iana"
      },
      "audio/uemclip": {
        source: "iana"
      },
      "audio/ulpfec": {
        source: "iana"
      },
      "audio/usac": {
        source: "iana"
      },
      "audio/vdvi": {
        source: "iana"
      },
      "audio/vmr-wb": {
        source: "iana"
      },
      "audio/vnd.3gpp.iufp": {
        source: "iana"
      },
      "audio/vnd.4sb": {
        source: "iana"
      },
      "audio/vnd.audiokoz": {
        source: "iana"
      },
      "audio/vnd.celp": {
        source: "iana"
      },
      "audio/vnd.cisco.nse": {
        source: "iana"
      },
      "audio/vnd.cmles.radio-events": {
        source: "iana"
      },
      "audio/vnd.cns.anp1": {
        source: "iana"
      },
      "audio/vnd.cns.inf1": {
        source: "iana"
      },
      "audio/vnd.dece.audio": {
        source: "iana",
        extensions: ["uva", "uvva"]
      },
      "audio/vnd.digital-winds": {
        source: "iana",
        extensions: ["eol"]
      },
      "audio/vnd.dlna.adts": {
        source: "iana"
      },
      "audio/vnd.dolby.heaac.1": {
        source: "iana"
      },
      "audio/vnd.dolby.heaac.2": {
        source: "iana"
      },
      "audio/vnd.dolby.mlp": {
        source: "iana"
      },
      "audio/vnd.dolby.mps": {
        source: "iana"
      },
      "audio/vnd.dolby.pl2": {
        source: "iana"
      },
      "audio/vnd.dolby.pl2x": {
        source: "iana"
      },
      "audio/vnd.dolby.pl2z": {
        source: "iana"
      },
      "audio/vnd.dolby.pulse.1": {
        source: "iana"
      },
      "audio/vnd.dra": {
        source: "iana",
        extensions: ["dra"]
      },
      "audio/vnd.dts": {
        source: "iana",
        extensions: ["dts"]
      },
      "audio/vnd.dts.hd": {
        source: "iana",
        extensions: ["dtshd"]
      },
      "audio/vnd.dts.uhd": {
        source: "iana"
      },
      "audio/vnd.dvb.file": {
        source: "iana"
      },
      "audio/vnd.everad.plj": {
        source: "iana"
      },
      "audio/vnd.hns.audio": {
        source: "iana"
      },
      "audio/vnd.lucent.voice": {
        source: "iana",
        extensions: ["lvp"]
      },
      "audio/vnd.ms-playready.media.pya": {
        source: "iana",
        extensions: ["pya"]
      },
      "audio/vnd.nokia.mobile-xmf": {
        source: "iana"
      },
      "audio/vnd.nortel.vbk": {
        source: "iana"
      },
      "audio/vnd.nuera.ecelp4800": {
        source: "iana",
        extensions: ["ecelp4800"]
      },
      "audio/vnd.nuera.ecelp7470": {
        source: "iana",
        extensions: ["ecelp7470"]
      },
      "audio/vnd.nuera.ecelp9600": {
        source: "iana",
        extensions: ["ecelp9600"]
      },
      "audio/vnd.octel.sbc": {
        source: "iana"
      },
      "audio/vnd.presonus.multitrack": {
        source: "iana"
      },
      "audio/vnd.qcelp": {
        source: "iana"
      },
      "audio/vnd.rhetorex.32kadpcm": {
        source: "iana"
      },
      "audio/vnd.rip": {
        source: "iana",
        extensions: ["rip"]
      },
      "audio/vnd.rn-realaudio": {
        compressible: false
      },
      "audio/vnd.sealedmedia.softseal.mpeg": {
        source: "iana"
      },
      "audio/vnd.vmx.cvsd": {
        source: "iana"
      },
      "audio/vnd.wave": {
        compressible: false
      },
      "audio/vorbis": {
        source: "iana",
        compressible: false
      },
      "audio/vorbis-config": {
        source: "iana"
      },
      "audio/wav": {
        compressible: false,
        extensions: ["wav"]
      },
      "audio/wave": {
        compressible: false,
        extensions: ["wav"]
      },
      "audio/webm": {
        source: "apache",
        compressible: false,
        extensions: ["weba"]
      },
      "audio/x-aac": {
        source: "apache",
        compressible: false,
        extensions: ["aac"]
      },
      "audio/x-aiff": {
        source: "apache",
        extensions: ["aif", "aiff", "aifc"]
      },
      "audio/x-caf": {
        source: "apache",
        compressible: false,
        extensions: ["caf"]
      },
      "audio/x-flac": {
        source: "apache",
        extensions: ["flac"]
      },
      "audio/x-m4a": {
        source: "nginx",
        extensions: ["m4a"]
      },
      "audio/x-matroska": {
        source: "apache",
        extensions: ["mka"]
      },
      "audio/x-mpegurl": {
        source: "apache",
        extensions: ["m3u"]
      },
      "audio/x-ms-wax": {
        source: "apache",
        extensions: ["wax"]
      },
      "audio/x-ms-wma": {
        source: "apache",
        extensions: ["wma"]
      },
      "audio/x-pn-realaudio": {
        source: "apache",
        extensions: ["ram", "ra"]
      },
      "audio/x-pn-realaudio-plugin": {
        source: "apache",
        extensions: ["rmp"]
      },
      "audio/x-realaudio": {
        source: "nginx",
        extensions: ["ra"]
      },
      "audio/x-tta": {
        source: "apache"
      },
      "audio/x-wav": {
        source: "apache",
        extensions: ["wav"]
      },
      "audio/xm": {
        source: "apache",
        extensions: ["xm"]
      },
      "chemical/x-cdx": {
        source: "apache",
        extensions: ["cdx"]
      },
      "chemical/x-cif": {
        source: "apache",
        extensions: ["cif"]
      },
      "chemical/x-cmdf": {
        source: "apache",
        extensions: ["cmdf"]
      },
      "chemical/x-cml": {
        source: "apache",
        extensions: ["cml"]
      },
      "chemical/x-csml": {
        source: "apache",
        extensions: ["csml"]
      },
      "chemical/x-pdb": {
        source: "apache"
      },
      "chemical/x-xyz": {
        source: "apache",
        extensions: ["xyz"]
      },
      "font/collection": {
        source: "iana",
        extensions: ["ttc"]
      },
      "font/otf": {
        source: "iana",
        compressible: true,
        extensions: ["otf"]
      },
      "font/sfnt": {
        source: "iana"
      },
      "font/ttf": {
        source: "iana",
        compressible: true,
        extensions: ["ttf"]
      },
      "font/woff": {
        source: "iana",
        extensions: ["woff"]
      },
      "font/woff2": {
        source: "iana",
        extensions: ["woff2"]
      },
      "image/aces": {
        source: "iana",
        extensions: ["exr"]
      },
      "image/apng": {
        compressible: false,
        extensions: ["apng"]
      },
      "image/avci": {
        source: "iana",
        extensions: ["avci"]
      },
      "image/avcs": {
        source: "iana",
        extensions: ["avcs"]
      },
      "image/avif": {
        source: "iana",
        compressible: false,
        extensions: ["avif"]
      },
      "image/bmp": {
        source: "iana",
        compressible: true,
        extensions: ["bmp"]
      },
      "image/cgm": {
        source: "iana",
        extensions: ["cgm"]
      },
      "image/dicom-rle": {
        source: "iana",
        extensions: ["drle"]
      },
      "image/emf": {
        source: "iana",
        extensions: ["emf"]
      },
      "image/fits": {
        source: "iana",
        extensions: ["fits"]
      },
      "image/g3fax": {
        source: "iana",
        extensions: ["g3"]
      },
      "image/gif": {
        source: "iana",
        compressible: false,
        extensions: ["gif"]
      },
      "image/heic": {
        source: "iana",
        extensions: ["heic"]
      },
      "image/heic-sequence": {
        source: "iana",
        extensions: ["heics"]
      },
      "image/heif": {
        source: "iana",
        extensions: ["heif"]
      },
      "image/heif-sequence": {
        source: "iana",
        extensions: ["heifs"]
      },
      "image/hej2k": {
        source: "iana",
        extensions: ["hej2"]
      },
      "image/hsj2": {
        source: "iana",
        extensions: ["hsj2"]
      },
      "image/ief": {
        source: "iana",
        extensions: ["ief"]
      },
      "image/jls": {
        source: "iana",
        extensions: ["jls"]
      },
      "image/jp2": {
        source: "iana",
        compressible: false,
        extensions: ["jp2", "jpg2"]
      },
      "image/jpeg": {
        source: "iana",
        compressible: false,
        extensions: ["jpeg", "jpg", "jpe"]
      },
      "image/jph": {
        source: "iana",
        extensions: ["jph"]
      },
      "image/jphc": {
        source: "iana",
        extensions: ["jhc"]
      },
      "image/jpm": {
        source: "iana",
        compressible: false,
        extensions: ["jpm"]
      },
      "image/jpx": {
        source: "iana",
        compressible: false,
        extensions: ["jpx", "jpf"]
      },
      "image/jxr": {
        source: "iana",
        extensions: ["jxr"]
      },
      "image/jxra": {
        source: "iana",
        extensions: ["jxra"]
      },
      "image/jxrs": {
        source: "iana",
        extensions: ["jxrs"]
      },
      "image/jxs": {
        source: "iana",
        extensions: ["jxs"]
      },
      "image/jxsc": {
        source: "iana",
        extensions: ["jxsc"]
      },
      "image/jxsi": {
        source: "iana",
        extensions: ["jxsi"]
      },
      "image/jxss": {
        source: "iana",
        extensions: ["jxss"]
      },
      "image/ktx": {
        source: "iana",
        extensions: ["ktx"]
      },
      "image/ktx2": {
        source: "iana",
        extensions: ["ktx2"]
      },
      "image/naplps": {
        source: "iana"
      },
      "image/pjpeg": {
        compressible: false
      },
      "image/png": {
        source: "iana",
        compressible: false,
        extensions: ["png"]
      },
      "image/prs.btif": {
        source: "iana",
        extensions: ["btif"]
      },
      "image/prs.pti": {
        source: "iana",
        extensions: ["pti"]
      },
      "image/pwg-raster": {
        source: "iana"
      },
      "image/sgi": {
        source: "apache",
        extensions: ["sgi"]
      },
      "image/svg+xml": {
        source: "iana",
        compressible: true,
        extensions: ["svg", "svgz"]
      },
      "image/t38": {
        source: "iana",
        extensions: ["t38"]
      },
      "image/tiff": {
        source: "iana",
        compressible: false,
        extensions: ["tif", "tiff"]
      },
      "image/tiff-fx": {
        source: "iana",
        extensions: ["tfx"]
      },
      "image/vnd.adobe.photoshop": {
        source: "iana",
        compressible: true,
        extensions: ["psd"]
      },
      "image/vnd.airzip.accelerator.azv": {
        source: "iana",
        extensions: ["azv"]
      },
      "image/vnd.cns.inf2": {
        source: "iana"
      },
      "image/vnd.dece.graphic": {
        source: "iana",
        extensions: ["uvi", "uvvi", "uvg", "uvvg"]
      },
      "image/vnd.djvu": {
        source: "iana",
        extensions: ["djvu", "djv"]
      },
      "image/vnd.dvb.subtitle": {
        source: "iana",
        extensions: ["sub"]
      },
      "image/vnd.dwg": {
        source: "iana",
        extensions: ["dwg"]
      },
      "image/vnd.dxf": {
        source: "iana",
        extensions: ["dxf"]
      },
      "image/vnd.fastbidsheet": {
        source: "iana",
        extensions: ["fbs"]
      },
      "image/vnd.fpx": {
        source: "iana",
        extensions: ["fpx"]
      },
      "image/vnd.fst": {
        source: "iana",
        extensions: ["fst"]
      },
      "image/vnd.fujixerox.edmics-mmr": {
        source: "iana",
        extensions: ["mmr"]
      },
      "image/vnd.fujixerox.edmics-rlc": {
        source: "iana",
        extensions: ["rlc"]
      },
      "image/vnd.globalgraphics.pgb": {
        source: "iana"
      },
      "image/vnd.microsoft.icon": {
        source: "iana",
        compressible: true,
        extensions: ["ico"]
      },
      "image/vnd.mix": {
        source: "iana"
      },
      "image/vnd.mozilla.apng": {
        source: "iana"
      },
      "image/vnd.ms-dds": {
        compressible: true,
        extensions: ["dds"]
      },
      "image/vnd.ms-modi": {
        source: "iana",
        extensions: ["mdi"]
      },
      "image/vnd.ms-photo": {
        source: "apache",
        extensions: ["wdp"]
      },
      "image/vnd.net-fpx": {
        source: "iana",
        extensions: ["npx"]
      },
      "image/vnd.pco.b16": {
        source: "iana",
        extensions: ["b16"]
      },
      "image/vnd.radiance": {
        source: "iana"
      },
      "image/vnd.sealed.png": {
        source: "iana"
      },
      "image/vnd.sealedmedia.softseal.gif": {
        source: "iana"
      },
      "image/vnd.sealedmedia.softseal.jpg": {
        source: "iana"
      },
      "image/vnd.svf": {
        source: "iana"
      },
      "image/vnd.tencent.tap": {
        source: "iana",
        extensions: ["tap"]
      },
      "image/vnd.valve.source.texture": {
        source: "iana",
        extensions: ["vtf"]
      },
      "image/vnd.wap.wbmp": {
        source: "iana",
        extensions: ["wbmp"]
      },
      "image/vnd.xiff": {
        source: "iana",
        extensions: ["xif"]
      },
      "image/vnd.zbrush.pcx": {
        source: "iana",
        extensions: ["pcx"]
      },
      "image/webp": {
        source: "apache",
        extensions: ["webp"]
      },
      "image/wmf": {
        source: "iana",
        extensions: ["wmf"]
      },
      "image/x-3ds": {
        source: "apache",
        extensions: ["3ds"]
      },
      "image/x-cmu-raster": {
        source: "apache",
        extensions: ["ras"]
      },
      "image/x-cmx": {
        source: "apache",
        extensions: ["cmx"]
      },
      "image/x-freehand": {
        source: "apache",
        extensions: ["fh", "fhc", "fh4", "fh5", "fh7"]
      },
      "image/x-icon": {
        source: "apache",
        compressible: true,
        extensions: ["ico"]
      },
      "image/x-jng": {
        source: "nginx",
        extensions: ["jng"]
      },
      "image/x-mrsid-image": {
        source: "apache",
        extensions: ["sid"]
      },
      "image/x-ms-bmp": {
        source: "nginx",
        compressible: true,
        extensions: ["bmp"]
      },
      "image/x-pcx": {
        source: "apache",
        extensions: ["pcx"]
      },
      "image/x-pict": {
        source: "apache",
        extensions: ["pic", "pct"]
      },
      "image/x-portable-anymap": {
        source: "apache",
        extensions: ["pnm"]
      },
      "image/x-portable-bitmap": {
        source: "apache",
        extensions: ["pbm"]
      },
      "image/x-portable-graymap": {
        source: "apache",
        extensions: ["pgm"]
      },
      "image/x-portable-pixmap": {
        source: "apache",
        extensions: ["ppm"]
      },
      "image/x-rgb": {
        source: "apache",
        extensions: ["rgb"]
      },
      "image/x-tga": {
        source: "apache",
        extensions: ["tga"]
      },
      "image/x-xbitmap": {
        source: "apache",
        extensions: ["xbm"]
      },
      "image/x-xcf": {
        compressible: false
      },
      "image/x-xpixmap": {
        source: "apache",
        extensions: ["xpm"]
      },
      "image/x-xwindowdump": {
        source: "apache",
        extensions: ["xwd"]
      },
      "message/cpim": {
        source: "iana"
      },
      "message/delivery-status": {
        source: "iana"
      },
      "message/disposition-notification": {
        source: "iana",
        extensions: [
          "disposition-notification"
        ]
      },
      "message/external-body": {
        source: "iana"
      },
      "message/feedback-report": {
        source: "iana"
      },
      "message/global": {
        source: "iana",
        extensions: ["u8msg"]
      },
      "message/global-delivery-status": {
        source: "iana",
        extensions: ["u8dsn"]
      },
      "message/global-disposition-notification": {
        source: "iana",
        extensions: ["u8mdn"]
      },
      "message/global-headers": {
        source: "iana",
        extensions: ["u8hdr"]
      },
      "message/http": {
        source: "iana",
        compressible: false
      },
      "message/imdn+xml": {
        source: "iana",
        compressible: true
      },
      "message/news": {
        source: "iana"
      },
      "message/partial": {
        source: "iana",
        compressible: false
      },
      "message/rfc822": {
        source: "iana",
        compressible: true,
        extensions: ["eml", "mime"]
      },
      "message/s-http": {
        source: "iana"
      },
      "message/sip": {
        source: "iana"
      },
      "message/sipfrag": {
        source: "iana"
      },
      "message/tracking-status": {
        source: "iana"
      },
      "message/vnd.si.simp": {
        source: "iana"
      },
      "message/vnd.wfa.wsc": {
        source: "iana",
        extensions: ["wsc"]
      },
      "model/3mf": {
        source: "iana",
        extensions: ["3mf"]
      },
      "model/e57": {
        source: "iana"
      },
      "model/gltf+json": {
        source: "iana",
        compressible: true,
        extensions: ["gltf"]
      },
      "model/gltf-binary": {
        source: "iana",
        compressible: true,
        extensions: ["glb"]
      },
      "model/iges": {
        source: "iana",
        compressible: false,
        extensions: ["igs", "iges"]
      },
      "model/mesh": {
        source: "iana",
        compressible: false,
        extensions: ["msh", "mesh", "silo"]
      },
      "model/mtl": {
        source: "iana",
        extensions: ["mtl"]
      },
      "model/obj": {
        source: "iana",
        extensions: ["obj"]
      },
      "model/step": {
        source: "iana"
      },
      "model/step+xml": {
        source: "iana",
        compressible: true,
        extensions: ["stpx"]
      },
      "model/step+zip": {
        source: "iana",
        compressible: false,
        extensions: ["stpz"]
      },
      "model/step-xml+zip": {
        source: "iana",
        compressible: false,
        extensions: ["stpxz"]
      },
      "model/stl": {
        source: "iana",
        extensions: ["stl"]
      },
      "model/vnd.collada+xml": {
        source: "iana",
        compressible: true,
        extensions: ["dae"]
      },
      "model/vnd.dwf": {
        source: "iana",
        extensions: ["dwf"]
      },
      "model/vnd.flatland.3dml": {
        source: "iana"
      },
      "model/vnd.gdl": {
        source: "iana",
        extensions: ["gdl"]
      },
      "model/vnd.gs-gdl": {
        source: "apache"
      },
      "model/vnd.gs.gdl": {
        source: "iana"
      },
      "model/vnd.gtw": {
        source: "iana",
        extensions: ["gtw"]
      },
      "model/vnd.moml+xml": {
        source: "iana",
        compressible: true
      },
      "model/vnd.mts": {
        source: "iana",
        extensions: ["mts"]
      },
      "model/vnd.opengex": {
        source: "iana",
        extensions: ["ogex"]
      },
      "model/vnd.parasolid.transmit.binary": {
        source: "iana",
        extensions: ["x_b"]
      },
      "model/vnd.parasolid.transmit.text": {
        source: "iana",
        extensions: ["x_t"]
      },
      "model/vnd.pytha.pyox": {
        source: "iana"
      },
      "model/vnd.rosette.annotated-data-model": {
        source: "iana"
      },
      "model/vnd.sap.vds": {
        source: "iana",
        extensions: ["vds"]
      },
      "model/vnd.usdz+zip": {
        source: "iana",
        compressible: false,
        extensions: ["usdz"]
      },
      "model/vnd.valve.source.compiled-map": {
        source: "iana",
        extensions: ["bsp"]
      },
      "model/vnd.vtu": {
        source: "iana",
        extensions: ["vtu"]
      },
      "model/vrml": {
        source: "iana",
        compressible: false,
        extensions: ["wrl", "vrml"]
      },
      "model/x3d+binary": {
        source: "apache",
        compressible: false,
        extensions: ["x3db", "x3dbz"]
      },
      "model/x3d+fastinfoset": {
        source: "iana",
        extensions: ["x3db"]
      },
      "model/x3d+vrml": {
        source: "apache",
        compressible: false,
        extensions: ["x3dv", "x3dvz"]
      },
      "model/x3d+xml": {
        source: "iana",
        compressible: true,
        extensions: ["x3d", "x3dz"]
      },
      "model/x3d-vrml": {
        source: "iana",
        extensions: ["x3dv"]
      },
      "multipart/alternative": {
        source: "iana",
        compressible: false
      },
      "multipart/appledouble": {
        source: "iana"
      },
      "multipart/byteranges": {
        source: "iana"
      },
      "multipart/digest": {
        source: "iana"
      },
      "multipart/encrypted": {
        source: "iana",
        compressible: false
      },
      "multipart/form-data": {
        source: "iana",
        compressible: false
      },
      "multipart/header-set": {
        source: "iana"
      },
      "multipart/mixed": {
        source: "iana"
      },
      "multipart/multilingual": {
        source: "iana"
      },
      "multipart/parallel": {
        source: "iana"
      },
      "multipart/related": {
        source: "iana",
        compressible: false
      },
      "multipart/report": {
        source: "iana"
      },
      "multipart/signed": {
        source: "iana",
        compressible: false
      },
      "multipart/vnd.bint.med-plus": {
        source: "iana"
      },
      "multipart/voice-message": {
        source: "iana"
      },
      "multipart/x-mixed-replace": {
        source: "iana"
      },
      "text/1d-interleaved-parityfec": {
        source: "iana"
      },
      "text/cache-manifest": {
        source: "iana",
        compressible: true,
        extensions: ["appcache", "manifest"]
      },
      "text/calendar": {
        source: "iana",
        extensions: ["ics", "ifb"]
      },
      "text/calender": {
        compressible: true
      },
      "text/cmd": {
        compressible: true
      },
      "text/coffeescript": {
        extensions: ["coffee", "litcoffee"]
      },
      "text/cql": {
        source: "iana"
      },
      "text/cql-expression": {
        source: "iana"
      },
      "text/cql-identifier": {
        source: "iana"
      },
      "text/css": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["css"]
      },
      "text/csv": {
        source: "iana",
        compressible: true,
        extensions: ["csv"]
      },
      "text/csv-schema": {
        source: "iana"
      },
      "text/directory": {
        source: "iana"
      },
      "text/dns": {
        source: "iana"
      },
      "text/ecmascript": {
        source: "iana"
      },
      "text/encaprtp": {
        source: "iana"
      },
      "text/enriched": {
        source: "iana"
      },
      "text/fhirpath": {
        source: "iana"
      },
      "text/flexfec": {
        source: "iana"
      },
      "text/fwdred": {
        source: "iana"
      },
      "text/gff3": {
        source: "iana"
      },
      "text/grammar-ref-list": {
        source: "iana"
      },
      "text/html": {
        source: "iana",
        compressible: true,
        extensions: ["html", "htm", "shtml"]
      },
      "text/jade": {
        extensions: ["jade"]
      },
      "text/javascript": {
        source: "iana",
        compressible: true
      },
      "text/jcr-cnd": {
        source: "iana"
      },
      "text/jsx": {
        compressible: true,
        extensions: ["jsx"]
      },
      "text/less": {
        compressible: true,
        extensions: ["less"]
      },
      "text/markdown": {
        source: "iana",
        compressible: true,
        extensions: ["markdown", "md"]
      },
      "text/mathml": {
        source: "nginx",
        extensions: ["mml"]
      },
      "text/mdx": {
        compressible: true,
        extensions: ["mdx"]
      },
      "text/mizar": {
        source: "iana"
      },
      "text/n3": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["n3"]
      },
      "text/parameters": {
        source: "iana",
        charset: "UTF-8"
      },
      "text/parityfec": {
        source: "iana"
      },
      "text/plain": {
        source: "iana",
        compressible: true,
        extensions: ["txt", "text", "conf", "def", "list", "log", "in", "ini"]
      },
      "text/provenance-notation": {
        source: "iana",
        charset: "UTF-8"
      },
      "text/prs.fallenstein.rst": {
        source: "iana"
      },
      "text/prs.lines.tag": {
        source: "iana",
        extensions: ["dsc"]
      },
      "text/prs.prop.logic": {
        source: "iana"
      },
      "text/raptorfec": {
        source: "iana"
      },
      "text/red": {
        source: "iana"
      },
      "text/rfc822-headers": {
        source: "iana"
      },
      "text/richtext": {
        source: "iana",
        compressible: true,
        extensions: ["rtx"]
      },
      "text/rtf": {
        source: "iana",
        compressible: true,
        extensions: ["rtf"]
      },
      "text/rtp-enc-aescm128": {
        source: "iana"
      },
      "text/rtploopback": {
        source: "iana"
      },
      "text/rtx": {
        source: "iana"
      },
      "text/sgml": {
        source: "iana",
        extensions: ["sgml", "sgm"]
      },
      "text/shaclc": {
        source: "iana"
      },
      "text/shex": {
        source: "iana",
        extensions: ["shex"]
      },
      "text/slim": {
        extensions: ["slim", "slm"]
      },
      "text/spdx": {
        source: "iana",
        extensions: ["spdx"]
      },
      "text/strings": {
        source: "iana"
      },
      "text/stylus": {
        extensions: ["stylus", "styl"]
      },
      "text/t140": {
        source: "iana"
      },
      "text/tab-separated-values": {
        source: "iana",
        compressible: true,
        extensions: ["tsv"]
      },
      "text/troff": {
        source: "iana",
        extensions: ["t", "tr", "roff", "man", "me", "ms"]
      },
      "text/turtle": {
        source: "iana",
        charset: "UTF-8",
        extensions: ["ttl"]
      },
      "text/ulpfec": {
        source: "iana"
      },
      "text/uri-list": {
        source: "iana",
        compressible: true,
        extensions: ["uri", "uris", "urls"]
      },
      "text/vcard": {
        source: "iana",
        compressible: true,
        extensions: ["vcard"]
      },
      "text/vnd.a": {
        source: "iana"
      },
      "text/vnd.abc": {
        source: "iana"
      },
      "text/vnd.ascii-art": {
        source: "iana"
      },
      "text/vnd.curl": {
        source: "iana",
        extensions: ["curl"]
      },
      "text/vnd.curl.dcurl": {
        source: "apache",
        extensions: ["dcurl"]
      },
      "text/vnd.curl.mcurl": {
        source: "apache",
        extensions: ["mcurl"]
      },
      "text/vnd.curl.scurl": {
        source: "apache",
        extensions: ["scurl"]
      },
      "text/vnd.debian.copyright": {
        source: "iana",
        charset: "UTF-8"
      },
      "text/vnd.dmclientscript": {
        source: "iana"
      },
      "text/vnd.dvb.subtitle": {
        source: "iana",
        extensions: ["sub"]
      },
      "text/vnd.esmertec.theme-descriptor": {
        source: "iana",
        charset: "UTF-8"
      },
      "text/vnd.familysearch.gedcom": {
        source: "iana",
        extensions: ["ged"]
      },
      "text/vnd.ficlab.flt": {
        source: "iana"
      },
      "text/vnd.fly": {
        source: "iana",
        extensions: ["fly"]
      },
      "text/vnd.fmi.flexstor": {
        source: "iana",
        extensions: ["flx"]
      },
      "text/vnd.gml": {
        source: "iana"
      },
      "text/vnd.graphviz": {
        source: "iana",
        extensions: ["gv"]
      },
      "text/vnd.hans": {
        source: "iana"
      },
      "text/vnd.hgl": {
        source: "iana"
      },
      "text/vnd.in3d.3dml": {
        source: "iana",
        extensions: ["3dml"]
      },
      "text/vnd.in3d.spot": {
        source: "iana",
        extensions: ["spot"]
      },
      "text/vnd.iptc.newsml": {
        source: "iana"
      },
      "text/vnd.iptc.nitf": {
        source: "iana"
      },
      "text/vnd.latex-z": {
        source: "iana"
      },
      "text/vnd.motorola.reflex": {
        source: "iana"
      },
      "text/vnd.ms-mediapackage": {
        source: "iana"
      },
      "text/vnd.net2phone.commcenter.command": {
        source: "iana"
      },
      "text/vnd.radisys.msml-basic-layout": {
        source: "iana"
      },
      "text/vnd.senx.warpscript": {
        source: "iana"
      },
      "text/vnd.si.uricatalogue": {
        source: "iana"
      },
      "text/vnd.sosi": {
        source: "iana"
      },
      "text/vnd.sun.j2me.app-descriptor": {
        source: "iana",
        charset: "UTF-8",
        extensions: ["jad"]
      },
      "text/vnd.trolltech.linguist": {
        source: "iana",
        charset: "UTF-8"
      },
      "text/vnd.wap.si": {
        source: "iana"
      },
      "text/vnd.wap.sl": {
        source: "iana"
      },
      "text/vnd.wap.wml": {
        source: "iana",
        extensions: ["wml"]
      },
      "text/vnd.wap.wmlscript": {
        source: "iana",
        extensions: ["wmls"]
      },
      "text/vtt": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["vtt"]
      },
      "text/x-asm": {
        source: "apache",
        extensions: ["s", "asm"]
      },
      "text/x-c": {
        source: "apache",
        extensions: ["c", "cc", "cxx", "cpp", "h", "hh", "dic"]
      },
      "text/x-component": {
        source: "nginx",
        extensions: ["htc"]
      },
      "text/x-fortran": {
        source: "apache",
        extensions: ["f", "for", "f77", "f90"]
      },
      "text/x-gwt-rpc": {
        compressible: true
      },
      "text/x-handlebars-template": {
        extensions: ["hbs"]
      },
      "text/x-java-source": {
        source: "apache",
        extensions: ["java"]
      },
      "text/x-jquery-tmpl": {
        compressible: true
      },
      "text/x-lua": {
        extensions: ["lua"]
      },
      "text/x-markdown": {
        compressible: true,
        extensions: ["mkd"]
      },
      "text/x-nfo": {
        source: "apache",
        extensions: ["nfo"]
      },
      "text/x-opml": {
        source: "apache",
        extensions: ["opml"]
      },
      "text/x-org": {
        compressible: true,
        extensions: ["org"]
      },
      "text/x-pascal": {
        source: "apache",
        extensions: ["p", "pas"]
      },
      "text/x-processing": {
        compressible: true,
        extensions: ["pde"]
      },
      "text/x-sass": {
        extensions: ["sass"]
      },
      "text/x-scss": {
        extensions: ["scss"]
      },
      "text/x-setext": {
        source: "apache",
        extensions: ["etx"]
      },
      "text/x-sfv": {
        source: "apache",
        extensions: ["sfv"]
      },
      "text/x-suse-ymp": {
        compressible: true,
        extensions: ["ymp"]
      },
      "text/x-uuencode": {
        source: "apache",
        extensions: ["uu"]
      },
      "text/x-vcalendar": {
        source: "apache",
        extensions: ["vcs"]
      },
      "text/x-vcard": {
        source: "apache",
        extensions: ["vcf"]
      },
      "text/xml": {
        source: "iana",
        compressible: true,
        extensions: ["xml"]
      },
      "text/xml-external-parsed-entity": {
        source: "iana"
      },
      "text/yaml": {
        compressible: true,
        extensions: ["yaml", "yml"]
      },
      "video/1d-interleaved-parityfec": {
        source: "iana"
      },
      "video/3gpp": {
        source: "iana",
        extensions: ["3gp", "3gpp"]
      },
      "video/3gpp-tt": {
        source: "iana"
      },
      "video/3gpp2": {
        source: "iana",
        extensions: ["3g2"]
      },
      "video/av1": {
        source: "iana"
      },
      "video/bmpeg": {
        source: "iana"
      },
      "video/bt656": {
        source: "iana"
      },
      "video/celb": {
        source: "iana"
      },
      "video/dv": {
        source: "iana"
      },
      "video/encaprtp": {
        source: "iana"
      },
      "video/ffv1": {
        source: "iana"
      },
      "video/flexfec": {
        source: "iana"
      },
      "video/h261": {
        source: "iana",
        extensions: ["h261"]
      },
      "video/h263": {
        source: "iana",
        extensions: ["h263"]
      },
      "video/h263-1998": {
        source: "iana"
      },
      "video/h263-2000": {
        source: "iana"
      },
      "video/h264": {
        source: "iana",
        extensions: ["h264"]
      },
      "video/h264-rcdo": {
        source: "iana"
      },
      "video/h264-svc": {
        source: "iana"
      },
      "video/h265": {
        source: "iana"
      },
      "video/iso.segment": {
        source: "iana",
        extensions: ["m4s"]
      },
      "video/jpeg": {
        source: "iana",
        extensions: ["jpgv"]
      },
      "video/jpeg2000": {
        source: "iana"
      },
      "video/jpm": {
        source: "apache",
        extensions: ["jpm", "jpgm"]
      },
      "video/jxsv": {
        source: "iana"
      },
      "video/mj2": {
        source: "iana",
        extensions: ["mj2", "mjp2"]
      },
      "video/mp1s": {
        source: "iana"
      },
      "video/mp2p": {
        source: "iana"
      },
      "video/mp2t": {
        source: "iana",
        extensions: ["ts"]
      },
      "video/mp4": {
        source: "iana",
        compressible: false,
        extensions: ["mp4", "mp4v", "mpg4"]
      },
      "video/mp4v-es": {
        source: "iana"
      },
      "video/mpeg": {
        source: "iana",
        compressible: false,
        extensions: ["mpeg", "mpg", "mpe", "m1v", "m2v"]
      },
      "video/mpeg4-generic": {
        source: "iana"
      },
      "video/mpv": {
        source: "iana"
      },
      "video/nv": {
        source: "iana"
      },
      "video/ogg": {
        source: "iana",
        compressible: false,
        extensions: ["ogv"]
      },
      "video/parityfec": {
        source: "iana"
      },
      "video/pointer": {
        source: "iana"
      },
      "video/quicktime": {
        source: "iana",
        compressible: false,
        extensions: ["qt", "mov"]
      },
      "video/raptorfec": {
        source: "iana"
      },
      "video/raw": {
        source: "iana"
      },
      "video/rtp-enc-aescm128": {
        source: "iana"
      },
      "video/rtploopback": {
        source: "iana"
      },
      "video/rtx": {
        source: "iana"
      },
      "video/scip": {
        source: "iana"
      },
      "video/smpte291": {
        source: "iana"
      },
      "video/smpte292m": {
        source: "iana"
      },
      "video/ulpfec": {
        source: "iana"
      },
      "video/vc1": {
        source: "iana"
      },
      "video/vc2": {
        source: "iana"
      },
      "video/vnd.cctv": {
        source: "iana"
      },
      "video/vnd.dece.hd": {
        source: "iana",
        extensions: ["uvh", "uvvh"]
      },
      "video/vnd.dece.mobile": {
        source: "iana",
        extensions: ["uvm", "uvvm"]
      },
      "video/vnd.dece.mp4": {
        source: "iana"
      },
      "video/vnd.dece.pd": {
        source: "iana",
        extensions: ["uvp", "uvvp"]
      },
      "video/vnd.dece.sd": {
        source: "iana",
        extensions: ["uvs", "uvvs"]
      },
      "video/vnd.dece.video": {
        source: "iana",
        extensions: ["uvv", "uvvv"]
      },
      "video/vnd.directv.mpeg": {
        source: "iana"
      },
      "video/vnd.directv.mpeg-tts": {
        source: "iana"
      },
      "video/vnd.dlna.mpeg-tts": {
        source: "iana"
      },
      "video/vnd.dvb.file": {
        source: "iana",
        extensions: ["dvb"]
      },
      "video/vnd.fvt": {
        source: "iana",
        extensions: ["fvt"]
      },
      "video/vnd.hns.video": {
        source: "iana"
      },
      "video/vnd.iptvforum.1dparityfec-1010": {
        source: "iana"
      },
      "video/vnd.iptvforum.1dparityfec-2005": {
        source: "iana"
      },
      "video/vnd.iptvforum.2dparityfec-1010": {
        source: "iana"
      },
      "video/vnd.iptvforum.2dparityfec-2005": {
        source: "iana"
      },
      "video/vnd.iptvforum.ttsavc": {
        source: "iana"
      },
      "video/vnd.iptvforum.ttsmpeg2": {
        source: "iana"
      },
      "video/vnd.motorola.video": {
        source: "iana"
      },
      "video/vnd.motorola.videop": {
        source: "iana"
      },
      "video/vnd.mpegurl": {
        source: "iana",
        extensions: ["mxu", "m4u"]
      },
      "video/vnd.ms-playready.media.pyv": {
        source: "iana",
        extensions: ["pyv"]
      },
      "video/vnd.nokia.interleaved-multimedia": {
        source: "iana"
      },
      "video/vnd.nokia.mp4vr": {
        source: "iana"
      },
      "video/vnd.nokia.videovoip": {
        source: "iana"
      },
      "video/vnd.objectvideo": {
        source: "iana"
      },
      "video/vnd.radgamettools.bink": {
        source: "iana"
      },
      "video/vnd.radgamettools.smacker": {
        source: "iana"
      },
      "video/vnd.sealed.mpeg1": {
        source: "iana"
      },
      "video/vnd.sealed.mpeg4": {
        source: "iana"
      },
      "video/vnd.sealed.swf": {
        source: "iana"
      },
      "video/vnd.sealedmedia.softseal.mov": {
        source: "iana"
      },
      "video/vnd.uvvu.mp4": {
        source: "iana",
        extensions: ["uvu", "uvvu"]
      },
      "video/vnd.vivo": {
        source: "iana",
        extensions: ["viv"]
      },
      "video/vnd.youtube.yt": {
        source: "iana"
      },
      "video/vp8": {
        source: "iana"
      },
      "video/vp9": {
        source: "iana"
      },
      "video/webm": {
        source: "apache",
        compressible: false,
        extensions: ["webm"]
      },
      "video/x-f4v": {
        source: "apache",
        extensions: ["f4v"]
      },
      "video/x-fli": {
        source: "apache",
        extensions: ["fli"]
      },
      "video/x-flv": {
        source: "apache",
        compressible: false,
        extensions: ["flv"]
      },
      "video/x-m4v": {
        source: "apache",
        extensions: ["m4v"]
      },
      "video/x-matroska": {
        source: "apache",
        compressible: false,
        extensions: ["mkv", "mk3d", "mks"]
      },
      "video/x-mng": {
        source: "apache",
        extensions: ["mng"]
      },
      "video/x-ms-asf": {
        source: "apache",
        extensions: ["asf", "asx"]
      },
      "video/x-ms-vob": {
        source: "apache",
        extensions: ["vob"]
      },
      "video/x-ms-wm": {
        source: "apache",
        extensions: ["wm"]
      },
      "video/x-ms-wmv": {
        source: "apache",
        compressible: false,
        extensions: ["wmv"]
      },
      "video/x-ms-wmx": {
        source: "apache",
        extensions: ["wmx"]
      },
      "video/x-ms-wvx": {
        source: "apache",
        extensions: ["wvx"]
      },
      "video/x-msvideo": {
        source: "apache",
        extensions: ["avi"]
      },
      "video/x-sgi-movie": {
        source: "apache",
        extensions: ["movie"]
      },
      "video/x-smv": {
        source: "apache",
        extensions: ["smv"]
      },
      "x-conference/x-cooltalk": {
        source: "apache",
        extensions: ["ice"]
      },
      "x-shader/x-fragment": {
        compressible: true
      },
      "x-shader/x-vertex": {
        compressible: true
      }
    };
  }
});

// node_modules/mime-db/index.js
var require_mime_db = __commonJS({
  "node_modules/mime-db/index.js"(exports2, module2) {
    module2.exports = require_db();
  }
});

// node_modules/mime-types/index.js
var require_mime_types = __commonJS({
  "node_modules/mime-types/index.js"(exports2) {
    "use strict";
    var db = require_mime_db();
    var extname = require("path").extname;
    var EXTRACT_TYPE_REGEXP = /^\s*([^;\s]*)(?:;|\s|$)/;
    var TEXT_TYPE_REGEXP = /^text\//i;
    exports2.charset = charset;
    exports2.charsets = { lookup: charset };
    exports2.contentType = contentType;
    exports2.extension = extension;
    exports2.extensions = /* @__PURE__ */ Object.create(null);
    exports2.lookup = lookup;
    exports2.types = /* @__PURE__ */ Object.create(null);
    populateMaps(exports2.extensions, exports2.types);
    function charset(type2) {
      if (!type2 || typeof type2 !== "string") {
        return false;
      }
      var match = EXTRACT_TYPE_REGEXP.exec(type2);
      var mime = match && db[match[1].toLowerCase()];
      if (mime && mime.charset) {
        return mime.charset;
      }
      if (match && TEXT_TYPE_REGEXP.test(match[1])) {
        return "UTF-8";
      }
      return false;
    }
    function contentType(str) {
      if (!str || typeof str !== "string") {
        return false;
      }
      var mime = str.indexOf("/") === -1 ? exports2.lookup(str) : str;
      if (!mime) {
        return false;
      }
      if (mime.indexOf("charset") === -1) {
        var charset2 = exports2.charset(mime);
        if (charset2) mime += "; charset=" + charset2.toLowerCase();
      }
      return mime;
    }
    function extension(type2) {
      if (!type2 || typeof type2 !== "string") {
        return false;
      }
      var match = EXTRACT_TYPE_REGEXP.exec(type2);
      var exts = match && exports2.extensions[match[1].toLowerCase()];
      if (!exts || !exts.length) {
        return false;
      }
      return exts[0];
    }
    function lookup(path) {
      if (!path || typeof path !== "string") {
        return false;
      }
      var extension2 = extname("x." + path).toLowerCase().substr(1);
      if (!extension2) {
        return false;
      }
      return exports2.types[extension2] || false;
    }
    function populateMaps(extensions, types) {
      var preference = ["nginx", "apache", void 0, "iana"];
      Object.keys(db).forEach(function forEachMimeType(type2) {
        var mime = db[type2];
        var exts = mime.extensions;
        if (!exts || !exts.length) {
          return;
        }
        extensions[type2] = exts;
        for (var i = 0; i < exts.length; i++) {
          var extension2 = exts[i];
          if (types[extension2]) {
            var from = preference.indexOf(db[types[extension2]].source);
            var to = preference.indexOf(mime.source);
            if (types[extension2] !== "application/octet-stream" && (from > to || from === to && types[extension2].substr(0, 12) === "application/")) {
              continue;
            }
          }
          types[extension2] = type2;
        }
      });
    }
  }
});

// node_modules/accepts/index.js
var require_accepts = __commonJS({
  "node_modules/accepts/index.js"(exports2, module2) {
    "use strict";
    var Negotiator = require_negotiator();
    var mime = require_mime_types();
    module2.exports = Accepts;
    function Accepts(req) {
      if (!(this instanceof Accepts)) {
        return new Accepts(req);
      }
      this.headers = req.headers;
      this.negotiator = new Negotiator(req);
    }
    Accepts.prototype.type = Accepts.prototype.types = function(types_) {
      var types = types_;
      if (types && !Array.isArray(types)) {
        types = new Array(arguments.length);
        for (var i = 0; i < types.length; i++) {
          types[i] = arguments[i];
        }
      }
      if (!types || types.length === 0) {
        return this.negotiator.mediaTypes();
      }
      if (!this.headers.accept) {
        return types[0];
      }
      var mimes = types.map(extToMime);
      var accepts = this.negotiator.mediaTypes(mimes.filter(validMime));
      var first = accepts[0];
      return first ? types[mimes.indexOf(first)] : false;
    };
    Accepts.prototype.encoding = Accepts.prototype.encodings = function(encodings_) {
      var encodings = encodings_;
      if (encodings && !Array.isArray(encodings)) {
        encodings = new Array(arguments.length);
        for (var i = 0; i < encodings.length; i++) {
          encodings[i] = arguments[i];
        }
      }
      if (!encodings || encodings.length === 0) {
        return this.negotiator.encodings();
      }
      return this.negotiator.encodings(encodings)[0] || false;
    };
    Accepts.prototype.charset = Accepts.prototype.charsets = function(charsets_) {
      var charsets = charsets_;
      if (charsets && !Array.isArray(charsets)) {
        charsets = new Array(arguments.length);
        for (var i = 0; i < charsets.length; i++) {
          charsets[i] = arguments[i];
        }
      }
      if (!charsets || charsets.length === 0) {
        return this.negotiator.charsets();
      }
      return this.negotiator.charsets(charsets)[0] || false;
    };
    Accepts.prototype.lang = Accepts.prototype.langs = Accepts.prototype.language = Accepts.prototype.languages = function(languages_) {
      var languages = languages_;
      if (languages && !Array.isArray(languages)) {
        languages = new Array(arguments.length);
        for (var i = 0; i < languages.length; i++) {
          languages[i] = arguments[i];
        }
      }
      if (!languages || languages.length === 0) {
        return this.negotiator.languages();
      }
      return this.negotiator.languages(languages)[0] || false;
    };
    function extToMime(type2) {
      return type2.indexOf("/") === -1 ? mime.lookup(type2) : type2;
    }
    function validMime(type2) {
      return typeof type2 === "string";
    }
  }
});

// node_modules/base64id/lib/base64id.js
var require_base64id = __commonJS({
  "node_modules/base64id/lib/base64id.js"(exports2, module2) {
    var crypto = require("crypto");
    var Base64Id = function() {
    };
    Base64Id.prototype.getRandomBytes = function(bytes) {
      var BUFFER_SIZE = 4096;
      var self = this;
      bytes = bytes || 12;
      if (bytes > BUFFER_SIZE) {
        return crypto.randomBytes(bytes);
      }
      var bytesInBuffer = parseInt(BUFFER_SIZE / bytes);
      var threshold = parseInt(bytesInBuffer * 0.85);
      if (!threshold) {
        return crypto.randomBytes(bytes);
      }
      if (this.bytesBufferIndex == null) {
        this.bytesBufferIndex = -1;
      }
      if (this.bytesBufferIndex == bytesInBuffer) {
        this.bytesBuffer = null;
        this.bytesBufferIndex = -1;
      }
      if (this.bytesBufferIndex == -1 || this.bytesBufferIndex > threshold) {
        if (!this.isGeneratingBytes) {
          this.isGeneratingBytes = true;
          crypto.randomBytes(BUFFER_SIZE, function(err, bytes2) {
            self.bytesBuffer = bytes2;
            self.bytesBufferIndex = 0;
            self.isGeneratingBytes = false;
          });
        }
        if (this.bytesBufferIndex == -1) {
          return crypto.randomBytes(bytes);
        }
      }
      var result = this.bytesBuffer.slice(bytes * this.bytesBufferIndex, bytes * (this.bytesBufferIndex + 1));
      this.bytesBufferIndex++;
      return result;
    };
    Base64Id.prototype.generateId = function() {
      var rand = Buffer.alloc(15);
      if (!rand.writeInt32BE) {
        return Math.abs(Math.random() * Math.random() * Date.now() | 0).toString() + Math.abs(Math.random() * Math.random() * Date.now() | 0).toString();
      }
      this.sequenceNumber = this.sequenceNumber + 1 | 0;
      rand.writeInt32BE(this.sequenceNumber, 11);
      if (crypto.randomBytes) {
        this.getRandomBytes(12).copy(rand);
      } else {
        [0, 4, 8].forEach(function(i) {
          rand.writeInt32BE(Math.random() * Math.pow(2, 32) | 0, i);
        });
      }
      return rand.toString("base64").replace(/\//g, "_").replace(/\+/g, "-");
    };
    exports2 = module2.exports = new Base64Id();
  }
});

// node_modules/engine.io/build/parser-v3/utf8.js
var require_utf8 = __commonJS({
  "node_modules/engine.io/build/parser-v3/utf8.js"(exports2, module2) {
    var stringFromCharCode = String.fromCharCode;
    function ucs2decode(string) {
      var output = [];
      var counter = 0;
      var length = string.length;
      var value;
      var extra;
      while (counter < length) {
        value = string.charCodeAt(counter++);
        if (value >= 55296 && value <= 56319 && counter < length) {
          extra = string.charCodeAt(counter++);
          if ((extra & 64512) == 56320) {
            output.push(((value & 1023) << 10) + (extra & 1023) + 65536);
          } else {
            output.push(value);
            counter--;
          }
        } else {
          output.push(value);
        }
      }
      return output;
    }
    function ucs2encode(array) {
      var length = array.length;
      var index = -1;
      var value;
      var output = "";
      while (++index < length) {
        value = array[index];
        if (value > 65535) {
          value -= 65536;
          output += stringFromCharCode(value >>> 10 & 1023 | 55296);
          value = 56320 | value & 1023;
        }
        output += stringFromCharCode(value);
      }
      return output;
    }
    function checkScalarValue(codePoint, strict) {
      if (codePoint >= 55296 && codePoint <= 57343) {
        if (strict) {
          throw Error("Lone surrogate U+" + codePoint.toString(16).toUpperCase() + " is not a scalar value");
        }
        return false;
      }
      return true;
    }
    function createByte(codePoint, shift) {
      return stringFromCharCode(codePoint >> shift & 63 | 128);
    }
    function encodeCodePoint(codePoint, strict) {
      if ((codePoint & 4294967168) == 0) {
        return stringFromCharCode(codePoint);
      }
      var symbol = "";
      if ((codePoint & 4294965248) == 0) {
        symbol = stringFromCharCode(codePoint >> 6 & 31 | 192);
      } else if ((codePoint & 4294901760) == 0) {
        if (!checkScalarValue(codePoint, strict)) {
          codePoint = 65533;
        }
        symbol = stringFromCharCode(codePoint >> 12 & 15 | 224);
        symbol += createByte(codePoint, 6);
      } else if ((codePoint & 4292870144) == 0) {
        symbol = stringFromCharCode(codePoint >> 18 & 7 | 240);
        symbol += createByte(codePoint, 12);
        symbol += createByte(codePoint, 6);
      }
      symbol += stringFromCharCode(codePoint & 63 | 128);
      return symbol;
    }
    function utf8encode(string, opts) {
      opts = opts || {};
      var strict = false !== opts.strict;
      var codePoints = ucs2decode(string);
      var length = codePoints.length;
      var index = -1;
      var codePoint;
      var byteString = "";
      while (++index < length) {
        codePoint = codePoints[index];
        byteString += encodeCodePoint(codePoint, strict);
      }
      return byteString;
    }
    function readContinuationByte() {
      if (byteIndex >= byteCount) {
        throw Error("Invalid byte index");
      }
      var continuationByte = byteArray[byteIndex] & 255;
      byteIndex++;
      if ((continuationByte & 192) == 128) {
        return continuationByte & 63;
      }
      throw Error("Invalid continuation byte");
    }
    function decodeSymbol(strict) {
      var byte1;
      var byte2;
      var byte3;
      var byte4;
      var codePoint;
      if (byteIndex > byteCount) {
        throw Error("Invalid byte index");
      }
      if (byteIndex == byteCount) {
        return false;
      }
      byte1 = byteArray[byteIndex] & 255;
      byteIndex++;
      if ((byte1 & 128) == 0) {
        return byte1;
      }
      if ((byte1 & 224) == 192) {
        byte2 = readContinuationByte();
        codePoint = (byte1 & 31) << 6 | byte2;
        if (codePoint >= 128) {
          return codePoint;
        } else {
          throw Error("Invalid continuation byte");
        }
      }
      if ((byte1 & 240) == 224) {
        byte2 = readContinuationByte();
        byte3 = readContinuationByte();
        codePoint = (byte1 & 15) << 12 | byte2 << 6 | byte3;
        if (codePoint >= 2048) {
          return checkScalarValue(codePoint, strict) ? codePoint : 65533;
        } else {
          throw Error("Invalid continuation byte");
        }
      }
      if ((byte1 & 248) == 240) {
        byte2 = readContinuationByte();
        byte3 = readContinuationByte();
        byte4 = readContinuationByte();
        codePoint = (byte1 & 7) << 18 | byte2 << 12 | byte3 << 6 | byte4;
        if (codePoint >= 65536 && codePoint <= 1114111) {
          return codePoint;
        }
      }
      throw Error("Invalid UTF-8 detected");
    }
    var byteArray;
    var byteCount;
    var byteIndex;
    function utf8decode(byteString, opts) {
      opts = opts || {};
      var strict = false !== opts.strict;
      byteArray = ucs2decode(byteString);
      byteCount = byteArray.length;
      byteIndex = 0;
      var codePoints = [];
      var tmp;
      while ((tmp = decodeSymbol(strict)) !== false) {
        codePoints.push(tmp);
      }
      return ucs2encode(codePoints);
    }
    module2.exports = {
      version: "2.1.2",
      encode: utf8encode,
      decode: utf8decode
    };
  }
});

// node_modules/engine.io/build/parser-v3/index.js
var require_parser_v3 = __commonJS({
  "node_modules/engine.io/build/parser-v3/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.packets = exports2.protocol = void 0;
    exports2.encodePacket = encodePacket;
    exports2.encodeBase64Packet = encodeBase64Packet;
    exports2.decodePacket = decodePacket;
    exports2.decodeBase64Packet = decodeBase64Packet;
    exports2.encodePayload = encodePayload;
    exports2.decodePayload = decodePayload;
    exports2.encodePayloadAsBinary = encodePayloadAsBinary;
    exports2.decodePayloadAsBinary = decodePayloadAsBinary;
    var utf8 = require_utf8();
    exports2.protocol = 3;
    var hasBinary = (packets) => {
      for (const packet of packets) {
        if (packet.data instanceof ArrayBuffer || ArrayBuffer.isView(packet.data)) {
          return true;
        }
      }
      return false;
    };
    exports2.packets = {
      open: 0,
      close: 1,
      ping: 2,
      pong: 3,
      message: 4,
      upgrade: 5,
      noop: 6
    };
    var packetslist = Object.keys(exports2.packets);
    var err = { type: "error", data: "parser error" };
    var EMPTY_BUFFER = Buffer.concat([]);
    function encodePacket(packet, supportsBinary, utf8encode, callback) {
      if (typeof supportsBinary === "function") {
        callback = supportsBinary;
        supportsBinary = null;
      }
      if (typeof utf8encode === "function") {
        callback = utf8encode;
        utf8encode = null;
      }
      if (Buffer.isBuffer(packet.data)) {
        return encodeBuffer(packet, supportsBinary, callback);
      } else if (packet.data && (packet.data.buffer || packet.data) instanceof ArrayBuffer) {
        return encodeBuffer({ type: packet.type, data: arrayBufferToBuffer(packet.data) }, supportsBinary, callback);
      }
      var encoded = exports2.packets[packet.type];
      if (void 0 !== packet.data) {
        encoded += utf8encode ? utf8.encode(String(packet.data), { strict: false }) : String(packet.data);
      }
      return callback("" + encoded);
    }
    function encodeBuffer(packet, supportsBinary, callback) {
      if (!supportsBinary) {
        return encodeBase64Packet(packet, callback);
      }
      var data = packet.data;
      var typeBuffer = Buffer.allocUnsafe(1);
      typeBuffer[0] = exports2.packets[packet.type];
      return callback(Buffer.concat([typeBuffer, data]));
    }
    function encodeBase64Packet(packet, callback) {
      var data = Buffer.isBuffer(packet.data) ? packet.data : arrayBufferToBuffer(packet.data);
      var message = "b" + exports2.packets[packet.type];
      message += data.toString("base64");
      return callback(message);
    }
    function decodePacket(data, binaryType, utf8decode) {
      if (data === void 0) {
        return err;
      }
      let type2;
      if (typeof data === "string") {
        type2 = data.charAt(0);
        if (type2 === "b") {
          return decodeBase64Packet(data.slice(1), binaryType);
        }
        if (utf8decode) {
          data = tryDecode(data);
          if (data === false) {
            return err;
          }
        }
        if (Number(type2) != type2 || !packetslist[type2]) {
          return err;
        }
        if (data.length > 1) {
          return { type: packetslist[type2], data: data.slice(1) };
        } else {
          return { type: packetslist[type2] };
        }
      }
      if (binaryType === "arraybuffer") {
        var intArray = new Uint8Array(data);
        type2 = intArray[0];
        return { type: packetslist[type2], data: intArray.buffer.slice(1) };
      }
      if (data instanceof ArrayBuffer) {
        data = arrayBufferToBuffer(data);
      }
      type2 = data[0];
      return { type: packetslist[type2], data: data.slice(1) };
    }
    function tryDecode(data) {
      try {
        data = utf8.decode(data, { strict: false });
      } catch (e) {
        return false;
      }
      return data;
    }
    function decodeBase64Packet(msg, binaryType) {
      var type2 = packetslist[msg.charAt(0)];
      var data = Buffer.from(msg.slice(1), "base64");
      if (binaryType === "arraybuffer") {
        var abv = new Uint8Array(data.length);
        for (var i = 0; i < abv.length; i++) {
          abv[i] = data[i];
        }
        data = abv.buffer;
      }
      return { type: type2, data };
    }
    function encodePayload(packets, supportsBinary, callback) {
      if (typeof supportsBinary === "function") {
        callback = supportsBinary;
        supportsBinary = null;
      }
      if (supportsBinary && hasBinary(packets)) {
        return encodePayloadAsBinary(packets, callback);
      }
      if (!packets.length) {
        return callback("0:");
      }
      function encodeOne(packet, doneCallback) {
        encodePacket(packet, supportsBinary, false, function(message) {
          doneCallback(null, setLengthHeader(message));
        });
      }
      map(packets, encodeOne, function(err2, results) {
        return callback(results.join(""));
      });
    }
    function setLengthHeader(message) {
      return message.length + ":" + message;
    }
    function map(ary, each, done) {
      const results = new Array(ary.length);
      let count = 0;
      for (let i = 0; i < ary.length; i++) {
        each(ary[i], (error, msg) => {
          results[i] = msg;
          if (++count === ary.length) {
            done(null, results);
          }
        });
      }
    }
    function decodePayload(data, binaryType, callback) {
      if (typeof data !== "string") {
        return decodePayloadAsBinary(data, binaryType, callback);
      }
      if (typeof binaryType === "function") {
        callback = binaryType;
        binaryType = null;
      }
      if (data === "") {
        return callback(err, 0, 1);
      }
      var length = "", n, msg, packet;
      for (var i = 0, l = data.length; i < l; i++) {
        var chr = data.charAt(i);
        if (chr !== ":") {
          length += chr;
          continue;
        }
        if (length === "" || length != (n = Number(length))) {
          return callback(err, 0, 1);
        }
        msg = data.slice(i + 1, i + 1 + n);
        if (length != msg.length) {
          return callback(err, 0, 1);
        }
        if (msg.length) {
          packet = decodePacket(msg, binaryType, false);
          if (err.type === packet.type && err.data === packet.data) {
            return callback(err, 0, 1);
          }
          var more = callback(packet, i + n, l);
          if (false === more)
            return;
        }
        i += n;
        length = "";
      }
      if (length !== "") {
        return callback(err, 0, 1);
      }
    }
    function bufferToString(buffer) {
      var str = "";
      for (var i = 0, l = buffer.length; i < l; i++) {
        str += String.fromCharCode(buffer[i]);
      }
      return str;
    }
    function stringToBuffer(string) {
      var buf = Buffer.allocUnsafe(string.length);
      for (var i = 0, l = string.length; i < l; i++) {
        buf.writeUInt8(string.charCodeAt(i), i);
      }
      return buf;
    }
    function arrayBufferToBuffer(data) {
      var length = data.byteLength || data.length;
      var offset = data.byteOffset || 0;
      return Buffer.from(data.buffer || data, offset, length);
    }
    function encodePayloadAsBinary(packets, callback) {
      if (!packets.length) {
        return callback(EMPTY_BUFFER);
      }
      map(packets, encodeOneBinaryPacket, function(err2, results) {
        return callback(Buffer.concat(results));
      });
    }
    function encodeOneBinaryPacket(p, doneCallback) {
      function onBinaryPacketEncode(packet) {
        var encodingLength = "" + packet.length;
        var sizeBuffer;
        if (typeof packet === "string") {
          sizeBuffer = Buffer.allocUnsafe(encodingLength.length + 2);
          sizeBuffer[0] = 0;
          for (var i = 0; i < encodingLength.length; i++) {
            sizeBuffer[i + 1] = parseInt(encodingLength[i], 10);
          }
          sizeBuffer[sizeBuffer.length - 1] = 255;
          return doneCallback(null, Buffer.concat([sizeBuffer, stringToBuffer(packet)]));
        }
        sizeBuffer = Buffer.allocUnsafe(encodingLength.length + 2);
        sizeBuffer[0] = 1;
        for (var i = 0; i < encodingLength.length; i++) {
          sizeBuffer[i + 1] = parseInt(encodingLength[i], 10);
        }
        sizeBuffer[sizeBuffer.length - 1] = 255;
        doneCallback(null, Buffer.concat([sizeBuffer, packet]));
      }
      encodePacket(p, true, true, onBinaryPacketEncode);
    }
    function decodePayloadAsBinary(data, binaryType, callback) {
      if (typeof binaryType === "function") {
        callback = binaryType;
        binaryType = null;
      }
      var bufferTail = data;
      var buffers = [];
      var i;
      while (bufferTail.length > 0) {
        var strLen = "";
        var isString = bufferTail[0] === 0;
        for (i = 1; ; i++) {
          if (bufferTail[i] === 255)
            break;
          if (strLen.length > 310) {
            return callback(err, 0, 1);
          }
          strLen += "" + bufferTail[i];
        }
        bufferTail = bufferTail.slice(strLen.length + 1);
        var msgLength = parseInt(strLen, 10);
        var msg = bufferTail.slice(1, msgLength + 1);
        if (isString)
          msg = bufferToString(msg);
        buffers.push(msg);
        bufferTail = bufferTail.slice(msgLength + 1);
      }
      var total = buffers.length;
      for (i = 0; i < total; i++) {
        var buffer = buffers[i];
        callback(decodePacket(buffer, binaryType, true), i, total);
      }
    }
  }
});

// node_modules/engine.io/build/transport.js
var require_transport2 = __commonJS({
  "node_modules/engine.io/build/transport.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Transport = void 0;
    var events_1 = require("events");
    var parser_v4 = require_cjs();
    var parser_v3 = require_parser_v3();
    var debug_1 = require_src();
    var debug = (0, debug_1.default)("engine:transport");
    function noop() {
    }
    var Transport = class extends events_1.EventEmitter {
      get readyState() {
        return this._readyState;
      }
      set readyState(state) {
        debug("readyState updated from %s to %s (%s)", this._readyState, state, this.name);
        this._readyState = state;
      }
      /**
       * Transport constructor.
       *
       * @param {EngineRequest} req
       */
      constructor(req) {
        super();
        this.writable = false;
        this._readyState = "open";
        this.discarded = false;
        this.protocol = req._query.EIO === "4" ? 4 : 3;
        this.parser = this.protocol === 4 ? parser_v4 : parser_v3;
        this.supportsBinary = !(req._query && req._query.b64);
      }
      /**
       * Flags the transport as discarded.
       *
       * @package
       */
      discard() {
        this.discarded = true;
      }
      /**
       * Called with an incoming HTTP request.
       *
       * @param req
       * @package
       */
      onRequest(req) {
      }
      /**
       * Closes the transport.
       *
       * @package
       */
      close(fn) {
        if ("closed" === this.readyState || "closing" === this.readyState)
          return;
        this.readyState = "closing";
        this.doClose(fn || noop);
      }
      /**
       * Called with a transport error.
       *
       * @param {String} msg - message error
       * @param {Object} desc - error description
       * @protected
       */
      onError(msg, desc) {
        if (this.listeners("error").length) {
          const err = new Error(msg);
          err.type = "TransportError";
          err.description = desc;
          this.emit("error", err);
        } else {
          debug("ignored transport error %s (%s)", msg, desc);
        }
      }
      /**
       * Called with parsed out a packets from the data stream.
       *
       * @param {Object} packet
       * @protected
       */
      onPacket(packet) {
        this.emit("packet", packet);
      }
      /**
       * Called with the encoded packet data.
       *
       * @param data
       * @protected
       */
      onData(data) {
        this.onPacket(this.parser.decodePacket(data));
      }
      /**
       * Called upon transport close.
       *
       * @protected
       */
      onClose() {
        this.readyState = "closed";
        this.emit("close");
      }
    };
    exports2.Transport = Transport;
    Transport.upgradesTo = [];
  }
});

// node_modules/engine.io/build/transports/polling.js
var require_polling2 = __commonJS({
  "node_modules/engine.io/build/transports/polling.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Polling = void 0;
    var transport_1 = require_transport2();
    var zlib_1 = require("zlib");
    var accepts = require_accepts();
    var debug_1 = require_src();
    var debug = (0, debug_1.default)("engine:polling");
    var compressionMethods = {
      gzip: zlib_1.createGzip,
      deflate: zlib_1.createDeflate
    };
    var Polling = class extends transport_1.Transport {
      /**
       * HTTP polling constructor.
       */
      constructor(req) {
        super(req);
        this.closeTimeout = 30 * 1e3;
      }
      /**
       * Transport name
       */
      get name() {
        return "polling";
      }
      /**
       * Overrides onRequest.
       *
       * @param {EngineRequest} req
       * @package
       */
      onRequest(req) {
        const res = req.res;
        req.res = null;
        if ("GET" === req.method) {
          this.onPollRequest(req, res);
        } else if ("POST" === req.method) {
          this.onDataRequest(req, res);
        } else {
          res.writeHead(500);
          res.end();
        }
      }
      /**
       * The client sends a request awaiting for us to send data.
       *
       * @private
       */
      onPollRequest(req, res) {
        if (this.req) {
          debug("request overlap");
          this.onError("overlap from client");
          res.writeHead(400);
          res.end();
          return;
        }
        debug("setting request");
        this.req = req;
        this.res = res;
        const onClose = () => {
          this.onError("poll connection closed prematurely");
        };
        const cleanup = () => {
          req.removeListener("close", onClose);
          this.req = this.res = null;
        };
        req.cleanup = cleanup;
        req.on("close", onClose);
        this.writable = true;
        this.emit("ready");
        if (this.writable && this.shouldClose) {
          debug("triggering empty send to append close packet");
          this.send([{ type: "noop" }]);
        }
      }
      /**
       * The client sends a request with data.
       *
       * @private
       */
      onDataRequest(req, res) {
        if (this.dataReq) {
          this.onError("data request overlap from client");
          res.writeHead(400);
          res.end();
          return;
        }
        const isBinary = "application/octet-stream" === req.headers["content-type"];
        if (isBinary && this.protocol === 4) {
          return this.onError("invalid content");
        }
        this.dataReq = req;
        this.dataRes = res;
        let chunks = isBinary ? Buffer.concat([]) : "";
        const cleanup = () => {
          req.removeListener("data", onData);
          req.removeListener("end", onEnd);
          req.removeListener("close", onClose);
          this.dataReq = this.dataRes = chunks = null;
        };
        const onClose = () => {
          cleanup();
          this.onError("data request connection closed prematurely");
        };
        const onData = (data) => {
          let contentLength;
          if (isBinary) {
            chunks = Buffer.concat([chunks, data]);
            contentLength = chunks.length;
          } else {
            chunks += data;
            contentLength = Buffer.byteLength(chunks);
          }
          if (contentLength > this.maxHttpBufferSize) {
            res.writeHead(413).end();
            cleanup();
          }
        };
        const onEnd = () => {
          this.onData(chunks);
          const headers = {
            // text/html is required instead of text/plain to avoid an
            // unwanted download dialog on certain user-agents (GH-43)
            "Content-Type": "text/html",
            "Content-Length": "2"
          };
          res.writeHead(200, this.headers(req, headers));
          res.end("ok");
          cleanup();
        };
        req.on("close", onClose);
        if (!isBinary)
          req.setEncoding("utf8");
        req.on("data", onData);
        req.on("end", onEnd);
      }
      /**
       * Processes the incoming data payload.
       *
       * @param data - encoded payload
       * @protected
       */
      onData(data) {
        debug('received "%s"', data);
        const callback = (packet) => {
          if ("close" === packet.type) {
            debug("got xhr close packet");
            this.onClose();
            return false;
          }
          this.onPacket(packet);
        };
        if (this.protocol === 3) {
          this.parser.decodePayload(data, callback);
        } else {
          this.parser.decodePayload(data).forEach(callback);
        }
      }
      /**
       * Overrides onClose.
       *
       * @private
       */
      onClose() {
        if (this.writable) {
          this.send([{ type: "noop" }]);
        }
        super.onClose();
      }
      send(packets) {
        this.writable = false;
        if (this.shouldClose) {
          debug("appending close packet to payload");
          packets.push({ type: "close" });
          this.shouldClose();
          this.shouldClose = null;
        }
        const doWrite = (data) => {
          const compress = packets.some((packet) => {
            return packet.options && packet.options.compress;
          });
          this.write(data, { compress });
        };
        if (this.protocol === 3) {
          this.parser.encodePayload(packets, this.supportsBinary, doWrite);
        } else {
          this.parser.encodePayload(packets, doWrite);
        }
      }
      /**
       * Writes data as response to poll request.
       *
       * @param {String} data
       * @param {Object} options
       * @private
       */
      write(data, options) {
        debug('writing "%s"', data);
        this.doWrite(data, options, () => {
          this.req.cleanup();
          this.emit("drain");
        });
      }
      /**
       * Performs the write.
       *
       * @protected
       */
      doWrite(data, options, callback) {
        const isString = typeof data === "string";
        const contentType = isString ? "text/plain; charset=UTF-8" : "application/octet-stream";
        const headers = {
          "Content-Type": contentType
        };
        const respond = (data2) => {
          headers["Content-Length"] = "string" === typeof data2 ? Buffer.byteLength(data2) : data2.length;
          this.res.writeHead(200, this.headers(this.req, headers));
          this.res.end(data2);
          callback();
        };
        if (!this.httpCompression || !options.compress) {
          respond(data);
          return;
        }
        const len = isString ? Buffer.byteLength(data) : data.length;
        if (len < this.httpCompression.threshold) {
          respond(data);
          return;
        }
        const encoding = accepts(this.req).encodings(["gzip", "deflate"]);
        if (!encoding) {
          respond(data);
          return;
        }
        this.compress(data, encoding, (err, data2) => {
          if (err) {
            this.res.writeHead(500);
            this.res.end();
            callback(err);
            return;
          }
          headers["Content-Encoding"] = encoding;
          respond(data2);
        });
      }
      /**
       * Compresses data.
       *
       * @private
       */
      compress(data, encoding, callback) {
        debug("compressing");
        const buffers = [];
        let nread = 0;
        compressionMethods[encoding](this.httpCompression).on("error", callback).on("data", function(chunk) {
          buffers.push(chunk);
          nread += chunk.length;
        }).on("end", function() {
          callback(null, Buffer.concat(buffers, nread));
        }).end(data);
      }
      /**
       * Closes the transport.
       *
       * @private
       */
      doClose(fn) {
        debug("closing");
        let closeTimeoutTimer;
        if (this.dataReq) {
          debug("aborting ongoing data request");
          this.dataReq.destroy();
        }
        const onClose = () => {
          clearTimeout(closeTimeoutTimer);
          fn();
          this.onClose();
        };
        if (this.writable) {
          debug("transport writable - closing right away");
          this.send([{ type: "close" }]);
          onClose();
        } else if (this.discarded) {
          debug("transport discarded - closing right away");
          onClose();
        } else {
          debug("transport not writable - buffering orderly close");
          this.shouldClose = onClose;
          closeTimeoutTimer = setTimeout(onClose, this.closeTimeout);
        }
      }
      /**
       * Returns headers for a response.
       *
       * @param {http.IncomingMessage} req
       * @param {Object} headers - extra headers
       * @private
       */
      headers(req, headers = {}) {
        const ua = req.headers["user-agent"];
        if (ua && (~ua.indexOf(";MSIE") || ~ua.indexOf("Trident/"))) {
          headers["X-XSS-Protection"] = "0";
        }
        headers["cache-control"] = "no-store";
        this.emit("headers", headers, req);
        return headers;
      }
    };
    exports2.Polling = Polling;
  }
});

// node_modules/engine.io/build/transports/polling-jsonp.js
var require_polling_jsonp = __commonJS({
  "node_modules/engine.io/build/transports/polling-jsonp.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.JSONP = void 0;
    var polling_1 = require_polling2();
    var qs = require("querystring");
    var rDoubleSlashes = /\\\\n/g;
    var rSlashes = /(\\)?\\n/g;
    var JSONP = class extends polling_1.Polling {
      /**
       * JSON-P polling transport.
       */
      constructor(req) {
        super(req);
        this.head = "___eio[" + (req._query.j || "").replace(/[^0-9]/g, "") + "](";
        this.foot = ");";
      }
      onData(data) {
        data = qs.parse(data).d;
        if ("string" === typeof data) {
          data = data.replace(rSlashes, function(match, slashes) {
            return slashes ? match : "\n";
          });
          super.onData(data.replace(rDoubleSlashes, "\\n"));
        }
      }
      doWrite(data, options, callback) {
        const js = JSON.stringify(data).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
        data = this.head + js + this.foot;
        super.doWrite(data, options, callback);
      }
    };
    exports2.JSONP = JSONP;
  }
});

// node_modules/engine.io/build/transports/websocket.js
var require_websocket3 = __commonJS({
  "node_modules/engine.io/build/transports/websocket.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.WebSocket = void 0;
    var transport_1 = require_transport2();
    var debug_1 = require_src();
    var debug = (0, debug_1.default)("engine:ws");
    var WebSocket = class extends transport_1.Transport {
      /**
       * WebSocket transport
       *
       * @param {EngineRequest} req
       */
      constructor(req) {
        super(req);
        this._doSend = (data) => {
          this.socket.send(data, this._onSent);
        };
        this._doSendLast = (data) => {
          this.socket.send(data, this._onSentLast);
        };
        this._onSent = (err) => {
          if (err) {
            this.onError("write error", err.stack);
          }
        };
        this._onSentLast = (err) => {
          if (err) {
            this.onError("write error", err.stack);
          } else {
            this.emit("drain");
            this.writable = true;
            this.emit("ready");
          }
        };
        this.socket = req.websocket;
        this.socket.on("message", (data, isBinary) => {
          const message = isBinary ? data : data.toString();
          debug('received "%s"', message);
          super.onData(message);
        });
        this.socket.once("close", this.onClose.bind(this));
        this.socket.on("error", this.onError.bind(this));
        this.writable = true;
        this.perMessageDeflate = null;
      }
      /**
       * Transport name
       */
      get name() {
        return "websocket";
      }
      /**
       * Advertise upgrade support.
       */
      get handlesUpgrades() {
        return true;
      }
      send(packets) {
        this.writable = false;
        for (let i = 0; i < packets.length; i++) {
          const packet = packets[i];
          const isLast = i + 1 === packets.length;
          if (this._canSendPreEncodedFrame(packet)) {
            this.socket._sender.sendFrame(packet.options.wsPreEncodedFrame, isLast ? this._onSentLast : this._onSent);
          } else {
            this.parser.encodePacket(packet, this.supportsBinary, isLast ? this._doSendLast : this._doSend);
          }
        }
      }
      /**
       * Whether the encoding of the WebSocket frame can be skipped.
       * @param packet
       * @private
       */
      _canSendPreEncodedFrame(packet) {
        var _a, _b, _c;
        return !this.perMessageDeflate && // @ts-expect-error use of untyped member
        typeof ((_b = (_a = this.socket) === null || _a === void 0 ? void 0 : _a._sender) === null || _b === void 0 ? void 0 : _b.sendFrame) === "function" && ((_c = packet.options) === null || _c === void 0 ? void 0 : _c.wsPreEncodedFrame) !== void 0;
      }
      doClose(fn) {
        debug("closing");
        this.socket.close();
        fn && fn();
      }
    };
    exports2.WebSocket = WebSocket;
  }
});

// node_modules/engine.io/build/transports/webtransport.js
var require_webtransport2 = __commonJS({
  "node_modules/engine.io/build/transports/webtransport.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.WebTransport = void 0;
    var transport_1 = require_transport2();
    var debug_1 = require_src();
    var engine_io_parser_1 = require_cjs();
    var debug = (0, debug_1.default)("engine:webtransport");
    var WebTransport2 = class extends transport_1.Transport {
      constructor(session, stream, reader) {
        super({ _query: { EIO: "4" } });
        this.session = session;
        const transformStream = (0, engine_io_parser_1.createPacketEncoderStream)();
        transformStream.readable.pipeTo(stream.writable).catch(() => {
          debug("the stream was closed");
        });
        this.writer = transformStream.writable.getWriter();
        (async () => {
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) {
                debug("session is closed");
                break;
              }
              debug("received chunk: %o", value);
              this.onPacket(value);
            }
          } catch (e) {
            debug("error while reading: %s", e.message);
          }
        })();
        session.closed.then(() => this.onClose());
        this.writable = true;
      }
      get name() {
        return "webtransport";
      }
      async send(packets) {
        this.writable = false;
        try {
          for (let i = 0; i < packets.length; i++) {
            const packet = packets[i];
            await this.writer.write(packet);
          }
        } catch (e) {
          debug("error while writing: %s", e.message);
        }
        this.emit("drain");
        this.writable = true;
        this.emit("ready");
      }
      doClose(fn) {
        debug("closing WebTransport session");
        this.session.close();
        fn && fn();
      }
    };
    exports2.WebTransport = WebTransport2;
  }
});

// node_modules/engine.io/build/transports/index.js
var require_transports2 = __commonJS({
  "node_modules/engine.io/build/transports/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var polling_1 = require_polling2();
    var polling_jsonp_1 = require_polling_jsonp();
    var websocket_1 = require_websocket3();
    var webtransport_1 = require_webtransport2();
    exports2.default = {
      polling,
      websocket: websocket_1.WebSocket,
      webtransport: webtransport_1.WebTransport
    };
    function polling(req) {
      if ("string" === typeof req._query.j) {
        return new polling_jsonp_1.JSONP(req);
      } else {
        return new polling_1.Polling(req);
      }
    }
    polling.upgradesTo = ["websocket", "webtransport"];
  }
});

// node_modules/engine.io/build/socket.js
var require_socket3 = __commonJS({
  "node_modules/engine.io/build/socket.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Socket = void 0;
    var events_1 = require("events");
    var debug_1 = require_src();
    var timers_1 = require("timers");
    var debug = (0, debug_1.default)("engine:socket");
    var Socket = class extends events_1.EventEmitter {
      get readyState() {
        return this._readyState;
      }
      set readyState(state) {
        debug("readyState updated from %s to %s", this._readyState, state);
        this._readyState = state;
      }
      constructor(id, server, transport, req, protocol) {
        super();
        this._readyState = "opening";
        this.upgrading = false;
        this.upgraded = false;
        this.writeBuffer = [];
        this.packetsFn = [];
        this.sentCallbackFn = [];
        this.cleanupFn = [];
        this.id = id;
        this.server = server;
        this.request = req;
        this.protocol = protocol;
        if (req) {
          if (req.websocket && req.websocket._socket) {
            this.remoteAddress = req.websocket._socket.remoteAddress;
          } else {
            this.remoteAddress = req.connection.remoteAddress;
          }
        } else {
        }
        this.pingTimeoutTimer = null;
        this.pingIntervalTimer = null;
        this.setTransport(transport);
        this.onOpen();
      }
      /**
       * Called upon transport considered open.
       *
       * @private
       */
      onOpen() {
        this.readyState = "open";
        this.transport.sid = this.id;
        this.sendPacket("open", JSON.stringify({
          sid: this.id,
          upgrades: this.getAvailableUpgrades(),
          pingInterval: this.server.opts.pingInterval,
          pingTimeout: this.server.opts.pingTimeout,
          maxPayload: this.server.opts.maxHttpBufferSize
        }));
        if (this.server.opts.initialPacket) {
          this.sendPacket("message", this.server.opts.initialPacket);
        }
        this.emit("open");
        if (this.protocol === 3) {
          this.resetPingTimeout();
        } else {
          this.schedulePing();
        }
      }
      /**
       * Called upon transport packet.
       *
       * @param {Object} packet
       * @private
       */
      onPacket(packet) {
        if ("open" !== this.readyState) {
          return debug("packet received with closed socket");
        }
        debug(`received packet ${packet.type}`);
        this.emit("packet", packet);
        switch (packet.type) {
          case "ping":
            if (this.transport.protocol !== 3) {
              this.onError(new Error("invalid heartbeat direction"));
              return;
            }
            debug("got ping");
            this.pingTimeoutTimer.refresh();
            this.sendPacket("pong");
            this.emit("heartbeat");
            break;
          case "pong":
            if (this.transport.protocol === 3) {
              this.onError(new Error("invalid heartbeat direction"));
              return;
            }
            debug("got pong");
            (0, timers_1.clearTimeout)(this.pingTimeoutTimer);
            this.pingIntervalTimer.refresh();
            this.emit("heartbeat");
            break;
          case "error":
            this.onClose("parse error");
            break;
          case "message":
            this.emit("data", packet.data);
            this.emit("message", packet.data);
            break;
        }
      }
      /**
       * Called upon transport error.
       *
       * @param {Error} err - error object
       * @private
       */
      onError(err) {
        debug("transport error");
        this.onClose("transport error", err);
      }
      /**
       * Pings client every `this.pingInterval` and expects response
       * within `this.pingTimeout` or closes connection.
       *
       * @private
       */
      schedulePing() {
        this.pingIntervalTimer = (0, timers_1.setTimeout)(() => {
          debug("writing ping packet - expecting pong within %sms", this.server.opts.pingTimeout);
          this.sendPacket("ping");
          this.resetPingTimeout();
        }, this.server.opts.pingInterval);
      }
      /**
       * Resets ping timeout.
       *
       * @private
       */
      resetPingTimeout() {
        (0, timers_1.clearTimeout)(this.pingTimeoutTimer);
        this.pingTimeoutTimer = (0, timers_1.setTimeout)(() => {
          if (this.readyState === "closed")
            return;
          this.onClose("ping timeout");
        }, this.protocol === 3 ? this.server.opts.pingInterval + this.server.opts.pingTimeout : this.server.opts.pingTimeout);
      }
      /**
       * Attaches handlers for the given transport.
       *
       * @param {Transport} transport
       * @private
       */
      setTransport(transport) {
        const onError = this.onError.bind(this);
        const onReady = () => this.flush();
        const onPacket = this.onPacket.bind(this);
        const onDrain = this.onDrain.bind(this);
        const onClose = this.onClose.bind(this, "transport close");
        this.transport = transport;
        this.transport.once("error", onError);
        this.transport.on("ready", onReady);
        this.transport.on("packet", onPacket);
        this.transport.on("drain", onDrain);
        this.transport.once("close", onClose);
        this.cleanupFn.push(function() {
          transport.removeListener("error", onError);
          transport.removeListener("ready", onReady);
          transport.removeListener("packet", onPacket);
          transport.removeListener("drain", onDrain);
          transport.removeListener("close", onClose);
        });
      }
      /**
       * Upon transport "drain" event
       *
       * @private
       */
      onDrain() {
        if (this.sentCallbackFn.length > 0) {
          debug("executing batch send callback");
          const seqFn = this.sentCallbackFn.shift();
          if (seqFn) {
            for (let i = 0; i < seqFn.length; i++) {
              seqFn[i](this.transport);
            }
          }
        }
      }
      /**
       * Upgrades socket to the given transport
       *
       * @param {Transport} transport
       * @private
       */
      /* private */
      _maybeUpgrade(transport) {
        debug('might upgrade socket transport from "%s" to "%s"', this.transport.name, transport.name);
        this.upgrading = true;
        const upgradeTimeoutTimer = (0, timers_1.setTimeout)(() => {
          debug("client did not complete upgrade - closing transport");
          cleanup();
          if ("open" === transport.readyState) {
            transport.close();
          }
        }, this.server.opts.upgradeTimeout);
        let checkIntervalTimer;
        const onPacket = (packet) => {
          if ("ping" === packet.type && "probe" === packet.data) {
            debug("got probe ping packet, sending pong");
            transport.send([{ type: "pong", data: "probe" }]);
            this.emit("upgrading", transport);
            clearInterval(checkIntervalTimer);
            checkIntervalTimer = setInterval(check, 100);
          } else if ("upgrade" === packet.type && this.readyState !== "closed") {
            debug("got upgrade packet - upgrading");
            cleanup();
            this.transport.discard();
            this.upgraded = true;
            this.clearTransport();
            this.setTransport(transport);
            this.emit("upgrade", transport);
            this.flush();
            if (this.readyState === "closing") {
              transport.close(() => {
                this.onClose("forced close");
              });
            }
          } else {
            cleanup();
            transport.close();
          }
        };
        const check = () => {
          if ("polling" === this.transport.name && this.transport.writable) {
            debug("writing a noop packet to polling for fast upgrade");
            this.transport.send([{ type: "noop" }]);
          }
        };
        const cleanup = () => {
          this.upgrading = false;
          clearInterval(checkIntervalTimer);
          (0, timers_1.clearTimeout)(upgradeTimeoutTimer);
          transport.removeListener("packet", onPacket);
          transport.removeListener("close", onTransportClose);
          transport.removeListener("error", onError);
          this.removeListener("close", onClose);
        };
        const onError = (err) => {
          debug("client did not complete upgrade - %s", err);
          cleanup();
          transport.close();
          transport = null;
        };
        const onTransportClose = () => {
          onError("transport closed");
        };
        const onClose = () => {
          onError("socket closed");
        };
        transport.on("packet", onPacket);
        transport.once("close", onTransportClose);
        transport.once("error", onError);
        this.once("close", onClose);
      }
      /**
       * Clears listeners and timers associated with current transport.
       *
       * @private
       */
      clearTransport() {
        let cleanup;
        const toCleanUp = this.cleanupFn.length;
        for (let i = 0; i < toCleanUp; i++) {
          cleanup = this.cleanupFn.shift();
          cleanup();
        }
        this.transport.on("error", function() {
          debug("error triggered by discarded transport");
        });
        this.transport.close();
        (0, timers_1.clearTimeout)(this.pingTimeoutTimer);
      }
      /**
       * Called upon transport considered closed.
       * Possible reasons: `ping timeout`, `client error`, `parse error`,
       * `transport error`, `server close`, `transport close`
       */
      onClose(reason, description) {
        if ("closed" !== this.readyState) {
          this.readyState = "closed";
          (0, timers_1.clearTimeout)(this.pingIntervalTimer);
          (0, timers_1.clearTimeout)(this.pingTimeoutTimer);
          process.nextTick(() => {
            this.writeBuffer = [];
          });
          this.packetsFn = [];
          this.sentCallbackFn = [];
          this.clearTransport();
          this.emit("close", reason, description);
        }
      }
      /**
       * Sends a message packet.
       *
       * @param {Object} data
       * @param {Object} options
       * @param {Function} callback
       * @return {Socket} for chaining
       */
      send(data, options, callback) {
        this.sendPacket("message", data, options, callback);
        return this;
      }
      /**
       * Alias of {@link send}.
       *
       * @param data
       * @param options
       * @param callback
       */
      write(data, options, callback) {
        this.sendPacket("message", data, options, callback);
        return this;
      }
      /**
       * Sends a packet.
       *
       * @param {String} type - packet type
       * @param {String} data
       * @param {Object} options
       * @param {Function} callback
       *
       * @private
       */
      sendPacket(type2, data, options = {}, callback) {
        if ("function" === typeof options) {
          callback = options;
          options = {};
        }
        if ("closing" !== this.readyState && "closed" !== this.readyState) {
          debug('sending packet "%s" (%s)', type2, data);
          options.compress = options.compress !== false;
          const packet = {
            type: type2,
            options
          };
          if (data)
            packet.data = data;
          this.emit("packetCreate", packet);
          this.writeBuffer.push(packet);
          if ("function" === typeof callback)
            this.packetsFn.push(callback);
          this.flush();
        }
      }
      /**
       * Attempts to flush the packets buffer.
       *
       * @private
       */
      flush() {
        if ("closed" !== this.readyState && this.transport.writable && this.writeBuffer.length) {
          debug("flushing buffer to transport");
          this.emit("flush", this.writeBuffer);
          this.server.emit("flush", this, this.writeBuffer);
          const wbuf = this.writeBuffer;
          this.writeBuffer = [];
          if (this.packetsFn.length) {
            this.sentCallbackFn.push(this.packetsFn);
            this.packetsFn = [];
          } else {
            this.sentCallbackFn.push(null);
          }
          this.transport.send(wbuf);
          this.emit("drain");
          this.server.emit("drain", this);
        }
      }
      /**
       * Get available upgrades for this socket.
       *
       * @private
       */
      getAvailableUpgrades() {
        const availableUpgrades = [];
        const allUpgrades = this.server.upgrades(this.transport.name);
        for (let i = 0; i < allUpgrades.length; ++i) {
          const upg = allUpgrades[i];
          if (this.server.opts.transports.indexOf(upg) !== -1) {
            availableUpgrades.push(upg);
          }
        }
        return availableUpgrades;
      }
      /**
       * Closes the socket and underlying transport.
       *
       * @param {Boolean} discard - optional, discard the transport
       * @return {Socket} for chaining
       */
      close(discard) {
        if (discard && (this.readyState === "open" || this.readyState === "closing")) {
          return this.closeTransport(discard);
        }
        if ("open" !== this.readyState)
          return;
        this.readyState = "closing";
        if (this.writeBuffer.length) {
          debug("there are %d remaining packets in the buffer, waiting for the 'drain' event", this.writeBuffer.length);
          this.once("drain", () => {
            debug("all packets have been sent, closing the transport");
            this.closeTransport(discard);
          });
          return;
        }
        debug("the buffer is empty, closing the transport right away");
        this.closeTransport(discard);
      }
      /**
       * Closes the underlying transport.
       *
       * @param {Boolean} discard
       * @private
       */
      closeTransport(discard) {
        debug("closing the transport (discard? %s)", !!discard);
        if (discard)
          this.transport.discard();
        this.transport.close(this.onClose.bind(this, "forced close"));
      }
    };
    exports2.Socket = Socket;
  }
});

// node_modules/cookie/index.js
var require_cookie = __commonJS({
  "node_modules/cookie/index.js"(exports2) {
    "use strict";
    exports2.parse = parse;
    exports2.serialize = serialize;
    var __toString = Object.prototype.toString;
    var __hasOwnProperty = Object.prototype.hasOwnProperty;
    var cookieNameRegExp = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
    var cookieValueRegExp = /^("?)[\u0021\u0023-\u002B\u002D-\u003A\u003C-\u005B\u005D-\u007E]*\1$/;
    var domainValueRegExp = /^([.]?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
    var pathValueRegExp = /^[\u0020-\u003A\u003D-\u007E]*$/;
    function parse(str, opt) {
      if (typeof str !== "string") {
        throw new TypeError("argument str must be a string");
      }
      var obj = {};
      var len = str.length;
      if (len < 2) return obj;
      var dec = opt && opt.decode || decode;
      var index = 0;
      var eqIdx = 0;
      var endIdx = 0;
      do {
        eqIdx = str.indexOf("=", index);
        if (eqIdx === -1) break;
        endIdx = str.indexOf(";", index);
        if (endIdx === -1) {
          endIdx = len;
        } else if (eqIdx > endIdx) {
          index = str.lastIndexOf(";", eqIdx - 1) + 1;
          continue;
        }
        var keyStartIdx = startIndex(str, index, eqIdx);
        var keyEndIdx = endIndex(str, eqIdx, keyStartIdx);
        var key = str.slice(keyStartIdx, keyEndIdx);
        if (!__hasOwnProperty.call(obj, key)) {
          var valStartIdx = startIndex(str, eqIdx + 1, endIdx);
          var valEndIdx = endIndex(str, endIdx, valStartIdx);
          if (str.charCodeAt(valStartIdx) === 34 && str.charCodeAt(valEndIdx - 1) === 34) {
            valStartIdx++;
            valEndIdx--;
          }
          var val = str.slice(valStartIdx, valEndIdx);
          obj[key] = tryDecode(val, dec);
        }
        index = endIdx + 1;
      } while (index < len);
      return obj;
    }
    function startIndex(str, index, max) {
      do {
        var code = str.charCodeAt(index);
        if (code !== 32 && code !== 9) return index;
      } while (++index < max);
      return max;
    }
    function endIndex(str, index, min) {
      while (index > min) {
        var code = str.charCodeAt(--index);
        if (code !== 32 && code !== 9) return index + 1;
      }
      return min;
    }
    function serialize(name, val, opt) {
      var enc = opt && opt.encode || encodeURIComponent;
      if (typeof enc !== "function") {
        throw new TypeError("option encode is invalid");
      }
      if (!cookieNameRegExp.test(name)) {
        throw new TypeError("argument name is invalid");
      }
      var value = enc(val);
      if (!cookieValueRegExp.test(value)) {
        throw new TypeError("argument val is invalid");
      }
      var str = name + "=" + value;
      if (!opt) return str;
      if (null != opt.maxAge) {
        var maxAge = Math.floor(opt.maxAge);
        if (!isFinite(maxAge)) {
          throw new TypeError("option maxAge is invalid");
        }
        str += "; Max-Age=" + maxAge;
      }
      if (opt.domain) {
        if (!domainValueRegExp.test(opt.domain)) {
          throw new TypeError("option domain is invalid");
        }
        str += "; Domain=" + opt.domain;
      }
      if (opt.path) {
        if (!pathValueRegExp.test(opt.path)) {
          throw new TypeError("option path is invalid");
        }
        str += "; Path=" + opt.path;
      }
      if (opt.expires) {
        var expires = opt.expires;
        if (!isDate(expires) || isNaN(expires.valueOf())) {
          throw new TypeError("option expires is invalid");
        }
        str += "; Expires=" + expires.toUTCString();
      }
      if (opt.httpOnly) {
        str += "; HttpOnly";
      }
      if (opt.secure) {
        str += "; Secure";
      }
      if (opt.partitioned) {
        str += "; Partitioned";
      }
      if (opt.priority) {
        var priority = typeof opt.priority === "string" ? opt.priority.toLowerCase() : opt.priority;
        switch (priority) {
          case "low":
            str += "; Priority=Low";
            break;
          case "medium":
            str += "; Priority=Medium";
            break;
          case "high":
            str += "; Priority=High";
            break;
          default:
            throw new TypeError("option priority is invalid");
        }
      }
      if (opt.sameSite) {
        var sameSite = typeof opt.sameSite === "string" ? opt.sameSite.toLowerCase() : opt.sameSite;
        switch (sameSite) {
          case true:
            str += "; SameSite=Strict";
            break;
          case "lax":
            str += "; SameSite=Lax";
            break;
          case "strict":
            str += "; SameSite=Strict";
            break;
          case "none":
            str += "; SameSite=None";
            break;
          default:
            throw new TypeError("option sameSite is invalid");
        }
      }
      return str;
    }
    function decode(str) {
      return str.indexOf("%") !== -1 ? decodeURIComponent(str) : str;
    }
    function isDate(val) {
      return __toString.call(val) === "[object Date]";
    }
    function tryDecode(str, decode2) {
      try {
        return decode2(str);
      } catch (e) {
        return str;
      }
    }
  }
});

// node_modules/object-assign/index.js
var require_object_assign = __commonJS({
  "node_modules/object-assign/index.js"(exports2, module2) {
    "use strict";
    var getOwnPropertySymbols = Object.getOwnPropertySymbols;
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    var propIsEnumerable = Object.prototype.propertyIsEnumerable;
    function toObject(val) {
      if (val === null || val === void 0) {
        throw new TypeError("Object.assign cannot be called with null or undefined");
      }
      return Object(val);
    }
    function shouldUseNative() {
      try {
        if (!Object.assign) {
          return false;
        }
        var test1 = new String("abc");
        test1[5] = "de";
        if (Object.getOwnPropertyNames(test1)[0] === "5") {
          return false;
        }
        var test2 = {};
        for (var i = 0; i < 10; i++) {
          test2["_" + String.fromCharCode(i)] = i;
        }
        var order2 = Object.getOwnPropertyNames(test2).map(function(n) {
          return test2[n];
        });
        if (order2.join("") !== "0123456789") {
          return false;
        }
        var test3 = {};
        "abcdefghijklmnopqrst".split("").forEach(function(letter) {
          test3[letter] = letter;
        });
        if (Object.keys(Object.assign({}, test3)).join("") !== "abcdefghijklmnopqrst") {
          return false;
        }
        return true;
      } catch (err) {
        return false;
      }
    }
    module2.exports = shouldUseNative() ? Object.assign : function(target, source) {
      var from;
      var to = toObject(target);
      var symbols;
      for (var s = 1; s < arguments.length; s++) {
        from = Object(arguments[s]);
        for (var key in from) {
          if (hasOwnProperty.call(from, key)) {
            to[key] = from[key];
          }
        }
        if (getOwnPropertySymbols) {
          symbols = getOwnPropertySymbols(from);
          for (var i = 0; i < symbols.length; i++) {
            if (propIsEnumerable.call(from, symbols[i])) {
              to[symbols[i]] = from[symbols[i]];
            }
          }
        }
      }
      return to;
    };
  }
});

// node_modules/vary/index.js
var require_vary = __commonJS({
  "node_modules/vary/index.js"(exports2, module2) {
    "use strict";
    module2.exports = vary;
    module2.exports.append = append;
    var FIELD_NAME_REGEXP = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
    function append(header, field) {
      if (typeof header !== "string") {
        throw new TypeError("header argument is required");
      }
      if (!field) {
        throw new TypeError("field argument is required");
      }
      var fields = !Array.isArray(field) ? parse(String(field)) : field;
      for (var j = 0; j < fields.length; j++) {
        if (!FIELD_NAME_REGEXP.test(fields[j])) {
          throw new TypeError("field argument contains an invalid header name");
        }
      }
      if (header === "*") {
        return header;
      }
      var val = header;
      var vals = parse(header.toLowerCase());
      if (fields.indexOf("*") !== -1 || vals.indexOf("*") !== -1) {
        return "*";
      }
      for (var i = 0; i < fields.length; i++) {
        var fld = fields[i].toLowerCase();
        if (vals.indexOf(fld) === -1) {
          vals.push(fld);
          val = val ? val + ", " + fields[i] : fields[i];
        }
      }
      return val;
    }
    function parse(header) {
      var end = 0;
      var list = [];
      var start = 0;
      for (var i = 0, len = header.length; i < len; i++) {
        switch (header.charCodeAt(i)) {
          case 32:
            if (start === end) {
              start = end = i + 1;
            }
            break;
          case 44:
            list.push(header.substring(start, end));
            start = end = i + 1;
            break;
          default:
            end = i + 1;
            break;
        }
      }
      list.push(header.substring(start, end));
      return list;
    }
    function vary(res, field) {
      if (!res || !res.getHeader || !res.setHeader) {
        throw new TypeError("res argument is required");
      }
      var val = res.getHeader("Vary") || "";
      var header = Array.isArray(val) ? val.join(", ") : String(val);
      if (val = append(header, field)) {
        res.setHeader("Vary", val);
      }
    }
  }
});

// node_modules/cors/lib/index.js
var require_lib = __commonJS({
  "node_modules/cors/lib/index.js"(exports2, module2) {
    (function() {
      "use strict";
      var assign = require_object_assign();
      var vary = require_vary();
      var defaults = {
        origin: "*",
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
        preflightContinue: false,
        optionsSuccessStatus: 204
      };
      function isString(s) {
        return typeof s === "string" || s instanceof String;
      }
      function isOriginAllowed(origin, allowedOrigin) {
        if (Array.isArray(allowedOrigin)) {
          for (var i = 0; i < allowedOrigin.length; ++i) {
            if (isOriginAllowed(origin, allowedOrigin[i])) {
              return true;
            }
          }
          return false;
        } else if (isString(allowedOrigin)) {
          return origin === allowedOrigin;
        } else if (allowedOrigin instanceof RegExp) {
          return allowedOrigin.test(origin);
        } else {
          return !!allowedOrigin;
        }
      }
      function configureOrigin(options, req) {
        var requestOrigin = req.headers.origin, headers = [], isAllowed;
        if (!options.origin || options.origin === "*") {
          headers.push([{
            key: "Access-Control-Allow-Origin",
            value: "*"
          }]);
        } else if (isString(options.origin)) {
          headers.push([{
            key: "Access-Control-Allow-Origin",
            value: options.origin
          }]);
          headers.push([{
            key: "Vary",
            value: "Origin"
          }]);
        } else {
          isAllowed = isOriginAllowed(requestOrigin, options.origin);
          headers.push([{
            key: "Access-Control-Allow-Origin",
            value: isAllowed ? requestOrigin : false
          }]);
          headers.push([{
            key: "Vary",
            value: "Origin"
          }]);
        }
        return headers;
      }
      function configureMethods(options) {
        var methods = options.methods;
        if (methods.join) {
          methods = options.methods.join(",");
        }
        return {
          key: "Access-Control-Allow-Methods",
          value: methods
        };
      }
      function configureCredentials(options) {
        if (options.credentials === true) {
          return {
            key: "Access-Control-Allow-Credentials",
            value: "true"
          };
        }
        return null;
      }
      function configureAllowedHeaders(options, req) {
        var allowedHeaders = options.allowedHeaders || options.headers;
        var headers = [];
        if (!allowedHeaders) {
          allowedHeaders = req.headers["access-control-request-headers"];
          headers.push([{
            key: "Vary",
            value: "Access-Control-Request-Headers"
          }]);
        } else if (allowedHeaders.join) {
          allowedHeaders = allowedHeaders.join(",");
        }
        if (allowedHeaders && allowedHeaders.length) {
          headers.push([{
            key: "Access-Control-Allow-Headers",
            value: allowedHeaders
          }]);
        }
        return headers;
      }
      function configureExposedHeaders(options) {
        var headers = options.exposedHeaders;
        if (!headers) {
          return null;
        } else if (headers.join) {
          headers = headers.join(",");
        }
        if (headers && headers.length) {
          return {
            key: "Access-Control-Expose-Headers",
            value: headers
          };
        }
        return null;
      }
      function configureMaxAge(options) {
        var maxAge = (typeof options.maxAge === "number" || options.maxAge) && options.maxAge.toString();
        if (maxAge && maxAge.length) {
          return {
            key: "Access-Control-Max-Age",
            value: maxAge
          };
        }
        return null;
      }
      function applyHeaders(headers, res) {
        for (var i = 0, n = headers.length; i < n; i++) {
          var header = headers[i];
          if (header) {
            if (Array.isArray(header)) {
              applyHeaders(header, res);
            } else if (header.key === "Vary" && header.value) {
              vary(res, header.value);
            } else if (header.value) {
              res.setHeader(header.key, header.value);
            }
          }
        }
      }
      function cors(options, req, res, next) {
        var headers = [], method = req.method && req.method.toUpperCase && req.method.toUpperCase();
        if (method === "OPTIONS") {
          headers.push(configureOrigin(options, req));
          headers.push(configureCredentials(options));
          headers.push(configureMethods(options));
          headers.push(configureAllowedHeaders(options, req));
          headers.push(configureMaxAge(options));
          headers.push(configureExposedHeaders(options));
          applyHeaders(headers, res);
          if (options.preflightContinue) {
            next();
          } else {
            res.statusCode = options.optionsSuccessStatus;
            res.setHeader("Content-Length", "0");
            res.end();
          }
        } else {
          headers.push(configureOrigin(options, req));
          headers.push(configureCredentials(options));
          headers.push(configureExposedHeaders(options));
          applyHeaders(headers, res);
          next();
        }
      }
      function middlewareWrapper(o) {
        var optionsCallback = null;
        if (typeof o === "function") {
          optionsCallback = o;
        } else {
          optionsCallback = function(req, cb) {
            cb(null, o);
          };
        }
        return function corsMiddleware(req, res, next) {
          optionsCallback(req, function(err, options) {
            if (err) {
              next(err);
            } else {
              var corsOptions = assign({}, defaults, options);
              var originCallback = null;
              if (corsOptions.origin && typeof corsOptions.origin === "function") {
                originCallback = corsOptions.origin;
              } else if (corsOptions.origin) {
                originCallback = function(origin, cb) {
                  cb(null, corsOptions.origin);
                };
              }
              if (originCallback) {
                originCallback(req.headers.origin, function(err2, origin) {
                  if (err2 || !origin) {
                    next(err2);
                  } else {
                    corsOptions.origin = origin;
                    cors(corsOptions, req, res, next);
                  }
                });
              } else {
                next();
              }
            }
          });
        };
      }
      module2.exports = middlewareWrapper;
    })();
  }
});

// node_modules/engine.io/build/server.js
var require_server = __commonJS({
  "node_modules/engine.io/build/server.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Server = exports2.BaseServer = void 0;
    var base64id = require_base64id();
    var transports_1 = require_transports2();
    var events_1 = require("events");
    var socket_1 = require_socket3();
    var debug_1 = require_src();
    var cookie_1 = require_cookie();
    var ws_1 = require_ws();
    var webtransport_1 = require_webtransport2();
    var engine_io_parser_1 = require_cjs();
    var debug = (0, debug_1.default)("engine");
    var kResponseHeaders = /* @__PURE__ */ Symbol("responseHeaders");
    function parseSessionId(data) {
      try {
        const parsed = JSON.parse(data);
        if (typeof parsed.sid === "string") {
          return parsed.sid;
        }
      } catch (e) {
      }
    }
    var BaseServer = class extends events_1.EventEmitter {
      /**
       * Server constructor.
       *
       * @param {Object} opts - options
       */
      constructor(opts = {}) {
        super();
        this.middlewares = [];
        this.clients = {};
        this.clientsCount = 0;
        this.opts = Object.assign({
          wsEngine: ws_1.Server,
          pingTimeout: 2e4,
          pingInterval: 25e3,
          upgradeTimeout: 1e4,
          maxHttpBufferSize: 1e6,
          transports: ["polling", "websocket"],
          // WebTransport is disabled by default
          allowUpgrades: true,
          httpCompression: {
            threshold: 1024
          },
          cors: false,
          allowEIO3: false
        }, opts);
        if (opts.cookie) {
          this.opts.cookie = Object.assign({
            name: "io",
            path: "/",
            // @ts-ignore
            httpOnly: opts.cookie.path !== false,
            sameSite: "lax"
          }, opts.cookie);
        }
        if (this.opts.cors) {
          this.use(require_lib()(this.opts.cors));
        }
        if (opts.perMessageDeflate) {
          this.opts.perMessageDeflate = Object.assign({
            threshold: 1024
          }, opts.perMessageDeflate);
        }
        this.init();
      }
      /**
       * Compute the pathname of the requests that are handled by the server
       * @param options
       * @protected
       */
      _computePath(options) {
        let path = (options.path || "/engine.io").replace(/\/$/, "");
        if (options.addTrailingSlash !== false) {
          path += "/";
        }
        return path;
      }
      /**
       * Returns a list of available transports for upgrade given a certain transport.
       */
      upgrades(transport) {
        if (!this.opts.allowUpgrades)
          return [];
        return transports_1.default[transport].upgradesTo || [];
      }
      /**
       * Verifies a request.
       *
       * @param {EngineRequest} req
       * @param upgrade - whether it's an upgrade request
       * @param fn
       * @protected
       * @return whether the request is valid
       */
      verify(req, upgrade, fn) {
        const transport = req._query.transport;
        if (!~this.opts.transports.indexOf(transport) || transport === "webtransport") {
          debug('unknown transport "%s"', transport);
          return fn(Server.errors.UNKNOWN_TRANSPORT, { transport });
        }
        const isOriginInvalid = checkInvalidHeaderChar(req.headers.origin);
        if (isOriginInvalid) {
          const origin = req.headers.origin;
          req.headers.origin = null;
          debug("origin header invalid");
          return fn(Server.errors.BAD_REQUEST, {
            name: "INVALID_ORIGIN",
            origin
          });
        }
        const sid = req._query.sid;
        if (sid) {
          if (!this.clients.hasOwnProperty(sid)) {
            debug('unknown sid "%s"', sid);
            return fn(Server.errors.UNKNOWN_SID, {
              sid
            });
          }
          const previousTransport = this.clients[sid].transport.name;
          if (!upgrade && previousTransport !== transport) {
            debug("bad request: unexpected transport without upgrade");
            return fn(Server.errors.BAD_REQUEST, {
              name: "TRANSPORT_MISMATCH",
              transport,
              previousTransport
            });
          }
        } else {
          if ("GET" !== req.method) {
            return fn(Server.errors.BAD_HANDSHAKE_METHOD, {
              method: req.method
            });
          }
          if (transport === "websocket" && !upgrade) {
            debug("invalid transport upgrade");
            return fn(Server.errors.BAD_REQUEST, {
              name: "TRANSPORT_HANDSHAKE_ERROR"
            });
          }
          if (!this.opts.allowRequest)
            return fn();
          return this.opts.allowRequest(req, (message, success) => {
            if (!success) {
              return fn(Server.errors.FORBIDDEN, {
                message
              });
            }
            fn();
          });
        }
        fn();
      }
      /**
       * Adds a new middleware.
       *
       * @example
       * import helmet from "helmet";
       *
       * engine.use(helmet());
       *
       * @param fn
       */
      use(fn) {
        this.middlewares.push(fn);
      }
      /**
       * Apply the middlewares to the request.
       *
       * @param req
       * @param res
       * @param callback
       * @protected
       */
      _applyMiddlewares(req, res, callback) {
        if (this.middlewares.length === 0) {
          debug("no middleware to apply, skipping");
          return callback();
        }
        const apply = (i) => {
          debug("applying middleware n\xB0%d", i + 1);
          this.middlewares[i](req, res, (err) => {
            if (err) {
              return callback(err);
            }
            if (i + 1 < this.middlewares.length) {
              apply(i + 1);
            } else {
              callback();
            }
          });
        };
        apply(0);
      }
      /**
       * Closes all clients.
       */
      close() {
        debug("closing all open clients");
        for (let i in this.clients) {
          if (this.clients.hasOwnProperty(i)) {
            this.clients[i].close(true);
          }
        }
        this.cleanup();
        return this;
      }
      /**
       * generate a socket id.
       * Overwrite this method to generate your custom socket id
       *
       * @param {IncomingMessage} req - the request object
       */
      generateId(req) {
        return base64id.generateId();
      }
      /**
       * Handshakes a new client.
       *
       * @param {String} transportName
       * @param {Object} req - the request object
       * @param {Function} closeConnection
       *
       * @protected
       */
      async handshake(transportName, req, closeConnection) {
        const protocol = req._query.EIO === "4" ? 4 : 3;
        if (protocol === 3 && !this.opts.allowEIO3) {
          debug("unsupported protocol version");
          this.emit("connection_error", {
            req,
            code: Server.errors.UNSUPPORTED_PROTOCOL_VERSION,
            message: Server.errorMessages[Server.errors.UNSUPPORTED_PROTOCOL_VERSION],
            context: {
              protocol
            }
          });
          closeConnection(Server.errors.UNSUPPORTED_PROTOCOL_VERSION);
          return;
        }
        let id;
        try {
          id = await this.generateId(req);
        } catch (e) {
          debug("error while generating an id");
          this.emit("connection_error", {
            req,
            code: Server.errors.BAD_REQUEST,
            message: Server.errorMessages[Server.errors.BAD_REQUEST],
            context: {
              name: "ID_GENERATION_ERROR",
              error: e
            }
          });
          closeConnection(Server.errors.BAD_REQUEST);
          return;
        }
        debug('handshaking client "%s"', id);
        try {
          var transport = this.createTransport(transportName, req);
          if ("polling" === transportName) {
            transport.maxHttpBufferSize = this.opts.maxHttpBufferSize;
            transport.httpCompression = this.opts.httpCompression;
          } else if ("websocket" === transportName) {
            transport.perMessageDeflate = this.opts.perMessageDeflate;
          }
        } catch (e) {
          debug('error handshaking to transport "%s"', transportName);
          this.emit("connection_error", {
            req,
            code: Server.errors.BAD_REQUEST,
            message: Server.errorMessages[Server.errors.BAD_REQUEST],
            context: {
              name: "TRANSPORT_HANDSHAKE_ERROR",
              error: e
            }
          });
          closeConnection(Server.errors.BAD_REQUEST);
          return;
        }
        const socket = new socket_1.Socket(id, this, transport, req, protocol);
        transport.on("headers", (headers, req2) => {
          const isInitialRequest = !req2._query.sid;
          if (isInitialRequest) {
            if (this.opts.cookie) {
              headers["Set-Cookie"] = [
                // @ts-ignore
                (0, cookie_1.serialize)(this.opts.cookie.name, id, this.opts.cookie)
              ];
            }
            this.emit("initial_headers", headers, req2);
          }
          this.emit("headers", headers, req2);
        });
        transport.onRequest(req);
        this.clients[id] = socket;
        this.clientsCount++;
        socket.once("close", () => {
          delete this.clients[id];
          this.clientsCount--;
        });
        this.emit("connection", socket);
        return transport;
      }
      async onWebTransportSession(session) {
        const timeout = setTimeout(() => {
          debug("the client failed to establish a bidirectional stream in the given period");
          session.close();
        }, this.opts.upgradeTimeout);
        const streamReader = session.incomingBidirectionalStreams.getReader();
        const result = await streamReader.read();
        if (result.done) {
          debug("session is closed");
          return;
        }
        const stream = result.value;
        const transformStream = (0, engine_io_parser_1.createPacketDecoderStream)(this.opts.maxHttpBufferSize, "nodebuffer");
        const reader = stream.readable.pipeThrough(transformStream).getReader();
        const { value, done } = await reader.read();
        if (done) {
          debug("stream is closed");
          return;
        }
        clearTimeout(timeout);
        if (value.type !== "open") {
          debug("invalid WebTransport handshake");
          return session.close();
        }
        if (value.data === void 0) {
          const transport = new webtransport_1.WebTransport(session, stream, reader);
          const id = base64id.generateId();
          debug('handshaking client "%s" (WebTransport)', id);
          const socket = new socket_1.Socket(id, this, transport, null, 4);
          this.clients[id] = socket;
          this.clientsCount++;
          socket.once("close", () => {
            delete this.clients[id];
            this.clientsCount--;
          });
          this.emit("connection", socket);
          return;
        }
        const sid = parseSessionId(value.data);
        if (!sid) {
          debug("invalid WebTransport handshake");
          return session.close();
        }
        const client = this.clients[sid];
        if (!client) {
          debug("upgrade attempt for closed client");
          session.close();
        } else if (client.upgrading) {
          debug("transport has already been trying to upgrade");
          session.close();
        } else if (client.upgraded) {
          debug("transport had already been upgraded");
          session.close();
        } else {
          debug("upgrading existing transport");
          const transport = new webtransport_1.WebTransport(session, stream, reader);
          client._maybeUpgrade(transport);
        }
      }
    };
    exports2.BaseServer = BaseServer;
    BaseServer.errors = {
      UNKNOWN_TRANSPORT: 0,
      UNKNOWN_SID: 1,
      BAD_HANDSHAKE_METHOD: 2,
      BAD_REQUEST: 3,
      FORBIDDEN: 4,
      UNSUPPORTED_PROTOCOL_VERSION: 5
    };
    BaseServer.errorMessages = {
      0: "Transport unknown",
      1: "Session ID unknown",
      2: "Bad handshake method",
      3: "Bad request",
      4: "Forbidden",
      5: "Unsupported protocol version"
    };
    var WebSocketResponse = class {
      constructor(req, socket) {
        this.req = req;
        this.socket = socket;
        req[kResponseHeaders] = {};
      }
      setHeader(name, value) {
        this.req[kResponseHeaders][name] = value;
      }
      getHeader(name) {
        return this.req[kResponseHeaders][name];
      }
      removeHeader(name) {
        delete this.req[kResponseHeaders][name];
      }
      write() {
      }
      writeHead() {
      }
      end() {
        this.socket.destroy();
      }
    };
    var Server = class _Server extends BaseServer {
      /**
       * Initialize websocket server
       *
       * @protected
       */
      init() {
        if (!~this.opts.transports.indexOf("websocket"))
          return;
        if (this.ws)
          this.ws.close();
        this.ws = new this.opts.wsEngine({
          noServer: true,
          clientTracking: false,
          perMessageDeflate: this.opts.perMessageDeflate,
          maxPayload: this.opts.maxHttpBufferSize
        });
        if (typeof this.ws.on === "function") {
          this.ws.on("headers", (headersArray, req) => {
            const additionalHeaders = req[kResponseHeaders] || {};
            delete req[kResponseHeaders];
            const isInitialRequest = !req._query.sid;
            if (isInitialRequest) {
              this.emit("initial_headers", additionalHeaders, req);
            }
            this.emit("headers", additionalHeaders, req);
            debug("writing headers: %j", additionalHeaders);
            Object.keys(additionalHeaders).forEach((key) => {
              headersArray.push(`${key}: ${additionalHeaders[key]}`);
            });
          });
        }
      }
      cleanup() {
        if (this.ws) {
          debug("closing webSocketServer");
          this.ws.close();
        }
      }
      /**
       * Prepares a request by processing the query string.
       *
       * @private
       */
      prepare(req) {
        if (!req._query) {
          const url = new URL(req.url, "https://socket.io");
          req._query = Object.fromEntries(url.searchParams.entries());
        }
      }
      createTransport(transportName, req) {
        return new transports_1.default[transportName](req);
      }
      /**
       * Handles an Engine.IO HTTP request.
       *
       * @param {EngineRequest} req
       * @param {ServerResponse} res
       */
      handleRequest(req, res) {
        debug('handling "%s" http request "%s"', req.method, req.url);
        this.prepare(req);
        req.res = res;
        const callback = (errorCode, errorContext) => {
          if (errorCode !== void 0) {
            this.emit("connection_error", {
              req,
              code: errorCode,
              message: _Server.errorMessages[errorCode],
              context: errorContext
            });
            abortRequest(res, errorCode, errorContext);
            return;
          }
          if (req._query.sid) {
            debug("setting new request for existing client");
            this.clients[req._query.sid].transport.onRequest(req);
          } else {
            const closeConnection = (errorCode2, errorContext2) => abortRequest(res, errorCode2, errorContext2);
            this.handshake(req._query.transport, req, closeConnection);
          }
        };
        this._applyMiddlewares(req, res, (err) => {
          if (err) {
            callback(_Server.errors.BAD_REQUEST, { name: "MIDDLEWARE_FAILURE" });
          } else {
            this.verify(req, false, callback);
          }
        });
      }
      /**
       * Handles an Engine.IO HTTP Upgrade.
       */
      handleUpgrade(req, socket, upgradeHead) {
        this.prepare(req);
        const res = new WebSocketResponse(req, socket);
        const callback = (errorCode, errorContext) => {
          if (errorCode !== void 0) {
            this.emit("connection_error", {
              req,
              code: errorCode,
              message: _Server.errorMessages[errorCode],
              context: errorContext
            });
            abortUpgrade(socket, errorCode, errorContext);
            return;
          }
          const head = Buffer.from(upgradeHead);
          upgradeHead = null;
          res.writeHead();
          this.ws.handleUpgrade(req, socket, head, (websocket) => {
            this.onWebSocket(req, socket, websocket);
          });
        };
        this._applyMiddlewares(req, res, (err) => {
          if (err) {
            callback(_Server.errors.BAD_REQUEST, { name: "MIDDLEWARE_FAILURE" });
          } else {
            this.verify(req, true, callback);
          }
        });
      }
      /**
       * Called upon a ws.io connection.
       * @param req
       * @param socket
       * @param websocket
       * @private
       */
      onWebSocket(req, socket, websocket) {
        websocket.on("error", onUpgradeError);
        if (transports_1.default[req._query.transport] !== void 0 && !transports_1.default[req._query.transport].prototype.handlesUpgrades) {
          debug("transport doesnt handle upgraded requests");
          websocket.close();
          return;
        }
        const id = req._query.sid;
        req.websocket = websocket;
        if (id) {
          const client = this.clients[id];
          if (!client) {
            debug("upgrade attempt for closed client");
            websocket.close();
          } else if (client.upgrading) {
            debug("transport has already been trying to upgrade");
            websocket.close();
          } else if (client.upgraded) {
            debug("transport had already been upgraded");
            websocket.close();
          } else {
            debug("upgrading existing transport");
            websocket.removeListener("error", onUpgradeError);
            const transport = this.createTransport(req._query.transport, req);
            transport.perMessageDeflate = this.opts.perMessageDeflate;
            client._maybeUpgrade(transport);
          }
        } else {
          const closeConnection = (errorCode, errorContext) => abortUpgrade(socket, errorCode, errorContext);
          this.handshake(req._query.transport, req, closeConnection);
        }
        function onUpgradeError() {
          debug("websocket error before upgrade");
        }
      }
      /**
       * Captures upgrade requests for a http.Server.
       *
       * @param {http.Server} server
       * @param {Object} options
       */
      attach(server, options = {}) {
        const path = this._computePath(options);
        const destroyUpgradeTimeout = options.destroyUpgradeTimeout || 1e3;
        function check(req) {
          return path === req.url.slice(0, path.length);
        }
        const listeners = server.listeners("request").slice(0);
        server.removeAllListeners("request");
        server.on("close", this.close.bind(this));
        server.on("listening", this.init.bind(this));
        server.on("request", (req, res) => {
          if (check(req)) {
            debug('intercepting request for path "%s"', path);
            this.handleRequest(req, res);
          } else {
            let i = 0;
            const l = listeners.length;
            for (; i < l; i++) {
              listeners[i].call(server, req, res);
            }
          }
        });
        if (~this.opts.transports.indexOf("websocket")) {
          server.on("upgrade", (req, socket, head) => {
            if (check(req)) {
              this.handleUpgrade(req, socket, head);
            } else if (false !== options.destroyUpgrade) {
              setTimeout(function() {
                if (socket.writable && socket.bytesWritten <= 0) {
                  socket.on("error", (e) => {
                    debug("error while destroying upgrade: %s", e.message);
                  });
                  return socket.end();
                }
              }, destroyUpgradeTimeout);
            }
          });
        }
      }
    };
    exports2.Server = Server;
    function abortRequest(res, errorCode, errorContext) {
      const statusCode = errorCode === Server.errors.FORBIDDEN ? 403 : 400;
      const message = errorContext && errorContext.message ? errorContext.message : Server.errorMessages[errorCode];
      res.writeHead(statusCode, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        code: errorCode,
        message
      }));
    }
    function abortUpgrade(socket, errorCode, errorContext = {}) {
      socket.on("error", () => {
        debug("ignoring error from closed connection");
      });
      if (socket.writable) {
        const message = errorContext.message || Server.errorMessages[errorCode];
        const length = Buffer.byteLength(message);
        socket.write("HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-type: text/html\r\nContent-Length: " + length + "\r\n\r\n" + message);
      }
      socket.destroy();
    }
    var validHdrChars = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      // 0 - 15
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 16 - 31
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 32 - 47
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 48 - 63
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 64 - 79
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 80 - 95
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 96 - 111
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      // 112 - 127
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 128 ...
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1
      // ... 255
    ];
    function checkInvalidHeaderChar(val) {
      val += "";
      if (val.length < 1)
        return false;
      if (!validHdrChars[val.charCodeAt(0)]) {
        debug('invalid header, index 0, char "%s"', val.charCodeAt(0));
        return true;
      }
      if (val.length < 2)
        return false;
      if (!validHdrChars[val.charCodeAt(1)]) {
        debug('invalid header, index 1, char "%s"', val.charCodeAt(1));
        return true;
      }
      if (val.length < 3)
        return false;
      if (!validHdrChars[val.charCodeAt(2)]) {
        debug('invalid header, index 2, char "%s"', val.charCodeAt(2));
        return true;
      }
      if (val.length < 4)
        return false;
      if (!validHdrChars[val.charCodeAt(3)]) {
        debug('invalid header, index 3, char "%s"', val.charCodeAt(3));
        return true;
      }
      for (let i = 4; i < val.length; ++i) {
        if (!validHdrChars[val.charCodeAt(i)]) {
          debug('invalid header, index "%i", char "%s"', i, val.charCodeAt(i));
          return true;
        }
      }
      return false;
    }
  }
});

// node_modules/engine.io/build/transports-uws/polling.js
var require_polling3 = __commonJS({
  "node_modules/engine.io/build/transports-uws/polling.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Polling = void 0;
    var transport_1 = require_transport2();
    var zlib_1 = require("zlib");
    var accepts = require_accepts();
    var debug_1 = require_src();
    var debug = (0, debug_1.default)("engine:polling");
    var compressionMethods = {
      gzip: zlib_1.createGzip,
      deflate: zlib_1.createDeflate
    };
    var Polling = class extends transport_1.Transport {
      /**
       * HTTP polling constructor.
       */
      constructor(req) {
        super(req);
        this.closeTimeout = 30 * 1e3;
      }
      /**
       * Transport name
       */
      get name() {
        return "polling";
      }
      /**
       * Overrides onRequest.
       *
       * @param req
       *
       * @private
       */
      onRequest(req) {
        const res = req.res;
        req.res = null;
        if (req.getMethod() === "get") {
          this.onPollRequest(req, res);
        } else if (req.getMethod() === "post") {
          this.onDataRequest(req, res);
        } else {
          res.writeStatus("500 Internal Server Error");
          res.end();
        }
      }
      /**
       * The client sends a request awaiting for us to send data.
       *
       * @private
       */
      onPollRequest(req, res) {
        if (this.req) {
          debug("request overlap");
          this.onError("overlap from client");
          res.writeStatus("500 Internal Server Error");
          res.end();
          return;
        }
        debug("setting request");
        this.req = req;
        this.res = res;
        const onClose = () => {
          this.writable = false;
          this.onError("poll connection closed prematurely");
        };
        const cleanup = () => {
          this.req = this.res = null;
        };
        req.cleanup = cleanup;
        res.onAborted(onClose);
        this.writable = true;
        this.emit("ready");
        if (this.writable && this.shouldClose) {
          debug("triggering empty send to append close packet");
          this.send([{ type: "noop" }]);
        }
      }
      /**
       * The client sends a request with data.
       *
       * @private
       */
      onDataRequest(req, res) {
        if (this.dataReq) {
          this.onError("data request overlap from client");
          res.writeStatus("500 Internal Server Error");
          res.end();
          return;
        }
        const expectedContentLength = Number(req.headers["content-length"]);
        if (!expectedContentLength) {
          this.onError("content-length header required");
          res.writeStatus("411 Length Required").end();
          return;
        }
        if (expectedContentLength > this.maxHttpBufferSize) {
          this.onError("payload too large");
          res.writeStatus("413 Payload Too Large").end();
          return;
        }
        const isBinary = "application/octet-stream" === req.headers["content-type"];
        if (isBinary && this.protocol === 4) {
          return this.onError("invalid content");
        }
        this.dataReq = req;
        this.dataRes = res;
        let buffer;
        let offset = 0;
        const headers = {
          // text/html is required instead of text/plain to avoid an
          // unwanted download dialog on certain user-agents (GH-43)
          "Content-Type": "text/html"
        };
        this.headers(req, headers);
        for (let key in headers) {
          res.writeHeader(key, String(headers[key]));
        }
        const onEnd = (buffer2) => {
          this.onData(buffer2.toString());
          this.onDataRequestCleanup();
          res.cork(() => {
            res.end("ok");
          });
        };
        res.onAborted(() => {
          this.onDataRequestCleanup();
          this.onError("data request connection closed prematurely");
        });
        res.onData((arrayBuffer, isLast) => {
          const totalLength = offset + arrayBuffer.byteLength;
          if (totalLength > expectedContentLength) {
            this.onError("content-length mismatch");
            res.close();
            return;
          }
          if (!buffer) {
            if (isLast) {
              onEnd(Buffer.from(arrayBuffer));
              return;
            }
            buffer = Buffer.allocUnsafe(expectedContentLength);
          }
          Buffer.from(arrayBuffer).copy(buffer, offset);
          if (isLast) {
            if (totalLength != expectedContentLength) {
              this.onError("content-length mismatch");
              res.writeStatus("400 Content-Length Mismatch").end();
              this.onDataRequestCleanup();
              return;
            }
            onEnd(buffer);
            return;
          }
          offset = totalLength;
        });
      }
      /**
       * Cleanup request.
       *
       * @private
       */
      onDataRequestCleanup() {
        this.dataReq = this.dataRes = null;
      }
      /**
       * Processes the incoming data payload.
       *
       * @param {String} encoded payload
       * @private
       */
      onData(data) {
        debug('received "%s"', data);
        const callback = (packet) => {
          if ("close" === packet.type) {
            debug("got xhr close packet");
            this.onClose();
            return false;
          }
          this.onPacket(packet);
        };
        if (this.protocol === 3) {
          this.parser.decodePayload(data, callback);
        } else {
          this.parser.decodePayload(data).forEach(callback);
        }
      }
      /**
       * Overrides onClose.
       *
       * @private
       */
      onClose() {
        if (this.writable) {
          this.send([{ type: "noop" }]);
        }
        super.onClose();
      }
      /**
       * Writes a packet payload.
       *
       * @param {Object} packet
       * @private
       */
      send(packets) {
        this.writable = false;
        if (this.shouldClose) {
          debug("appending close packet to payload");
          packets.push({ type: "close" });
          this.shouldClose();
          this.shouldClose = null;
        }
        const doWrite = (data) => {
          const compress = packets.some((packet) => {
            return packet.options && packet.options.compress;
          });
          this.write(data, { compress });
        };
        if (this.protocol === 3) {
          this.parser.encodePayload(packets, this.supportsBinary, doWrite);
        } else {
          this.parser.encodePayload(packets, doWrite);
        }
      }
      /**
       * Writes data as response to poll request.
       *
       * @param {String} data
       * @param {Object} options
       * @private
       */
      write(data, options) {
        debug('writing "%s"', data);
        this.doWrite(data, options, () => {
          this.req.cleanup();
          this.emit("drain");
        });
      }
      /**
       * Performs the write.
       *
       * @private
       */
      doWrite(data, options, callback) {
        const isString = typeof data === "string";
        const contentType = isString ? "text/plain; charset=UTF-8" : "application/octet-stream";
        const headers = {
          "Content-Type": contentType
        };
        const respond = (data2) => {
          this.headers(this.req, headers);
          this.res.cork(() => {
            Object.keys(headers).forEach((key) => {
              this.res.writeHeader(key, String(headers[key]));
            });
            this.res.end(data2);
          });
          callback();
        };
        if (!this.httpCompression || !options.compress) {
          respond(data);
          return;
        }
        const len = isString ? Buffer.byteLength(data) : data.length;
        if (len < this.httpCompression.threshold) {
          respond(data);
          return;
        }
        const encoding = accepts(this.req).encodings(["gzip", "deflate"]);
        if (!encoding) {
          respond(data);
          return;
        }
        this.compress(data, encoding, (err, data2) => {
          if (err) {
            this.res.writeStatus("500 Internal Server Error");
            this.res.end();
            callback(err);
            return;
          }
          headers["Content-Encoding"] = encoding;
          respond(data2);
        });
      }
      /**
       * Compresses data.
       *
       * @private
       */
      compress(data, encoding, callback) {
        debug("compressing");
        const buffers = [];
        let nread = 0;
        compressionMethods[encoding](this.httpCompression).on("error", callback).on("data", function(chunk) {
          buffers.push(chunk);
          nread += chunk.length;
        }).on("end", function() {
          callback(null, Buffer.concat(buffers, nread));
        }).end(data);
      }
      /**
       * Closes the transport.
       *
       * @private
       */
      doClose(fn) {
        debug("closing");
        let closeTimeoutTimer;
        const onClose = () => {
          clearTimeout(closeTimeoutTimer);
          fn();
          this.onClose();
        };
        if (this.writable) {
          debug("transport writable - closing right away");
          this.send([{ type: "close" }]);
          onClose();
        } else if (this.discarded) {
          debug("transport discarded - closing right away");
          onClose();
        } else {
          debug("transport not writable - buffering orderly close");
          this.shouldClose = onClose;
          closeTimeoutTimer = setTimeout(onClose, this.closeTimeout);
        }
      }
      /**
       * Returns headers for a response.
       *
       * @param req - request
       * @param {Object} extra headers
       * @private
       */
      headers(req, headers) {
        headers = headers || {};
        const ua = req.headers["user-agent"];
        if (ua && (~ua.indexOf(";MSIE") || ~ua.indexOf("Trident/"))) {
          headers["X-XSS-Protection"] = "0";
        }
        headers["cache-control"] = "no-store";
        this.emit("headers", headers, req);
        return headers;
      }
    };
    exports2.Polling = Polling;
  }
});

// node_modules/engine.io/build/transports-uws/websocket.js
var require_websocket4 = __commonJS({
  "node_modules/engine.io/build/transports-uws/websocket.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.WebSocket = void 0;
    var transport_1 = require_transport2();
    var debug_1 = require_src();
    var debug = (0, debug_1.default)("engine:ws");
    var WebSocket = class extends transport_1.Transport {
      /**
       * WebSocket transport
       *
       * @param req
       */
      constructor(req) {
        super(req);
        this.writable = false;
        this.perMessageDeflate = null;
      }
      /**
       * Transport name
       */
      get name() {
        return "websocket";
      }
      /**
       * Advertise upgrade support.
       */
      get handlesUpgrades() {
        return true;
      }
      /**
       * Writes a packet payload.
       *
       * @param {Array} packets
       * @private
       */
      send(packets) {
        this.writable = false;
        for (let i = 0; i < packets.length; i++) {
          const packet = packets[i];
          const isLast = i + 1 === packets.length;
          const send = (data) => {
            const isBinary = typeof data !== "string";
            const compress = this.perMessageDeflate && Buffer.byteLength(data) > this.perMessageDeflate.threshold;
            debug('writing "%s"', data);
            this.socket.send(data, isBinary, compress);
            if (isLast) {
              this.emit("drain");
              this.writable = true;
              this.emit("ready");
            }
          };
          if (packet.options && typeof packet.options.wsPreEncoded === "string") {
            send(packet.options.wsPreEncoded);
          } else {
            this.parser.encodePacket(packet, this.supportsBinary, send);
          }
        }
      }
      /**
       * Closes the transport.
       *
       * @private
       */
      doClose(fn) {
        debug("closing");
        fn && fn();
        this.socket.end();
      }
    };
    exports2.WebSocket = WebSocket;
  }
});

// node_modules/engine.io/build/transports-uws/index.js
var require_transports_uws = __commonJS({
  "node_modules/engine.io/build/transports-uws/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var polling_1 = require_polling3();
    var websocket_1 = require_websocket4();
    exports2.default = {
      polling: polling_1.Polling,
      websocket: websocket_1.WebSocket
    };
  }
});

// node_modules/engine.io/build/userver.js
var require_userver = __commonJS({
  "node_modules/engine.io/build/userver.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.uServer = void 0;
    var debug_1 = require_src();
    var server_1 = require_server();
    var transports_uws_1 = require_transports_uws();
    var debug = (0, debug_1.default)("engine:uws");
    var uServer = class extends server_1.BaseServer {
      init() {
      }
      cleanup() {
      }
      /**
       * Prepares a request by processing the query string.
       *
       * @private
       */
      prepare(req, res) {
        req.method = req.getMethod().toUpperCase();
        req.url = req.getUrl();
        const params = new URLSearchParams(req.getQuery());
        req._query = Object.fromEntries(params.entries());
        req.headers = {};
        req.forEach((key, value) => {
          req.headers[key] = value;
        });
        req.connection = {
          remoteAddress: Buffer.from(res.getRemoteAddressAsText()).toString()
        };
        res.onAborted(() => {
          debug("response has been aborted");
        });
      }
      createTransport(transportName, req) {
        return new transports_uws_1.default[transportName](req);
      }
      /**
       * Attach the engine to a µWebSockets.js server
       * @param app
       * @param options
       */
      attach(app2, options = {}) {
        const path = this._computePath(options);
        app2.any(path, this.handleRequest.bind(this)).ws(path, {
          compression: options.compression,
          idleTimeout: options.idleTimeout,
          maxBackpressure: options.maxBackpressure,
          maxPayloadLength: this.opts.maxHttpBufferSize,
          upgrade: this.handleUpgrade.bind(this),
          open: (ws) => {
            const transport = ws.getUserData().transport;
            transport.socket = ws;
            transport.writable = true;
            transport.emit("ready");
          },
          message: (ws, message, isBinary) => {
            ws.getUserData().transport.onData(isBinary ? message : Buffer.from(message).toString());
          },
          close: (ws, code, message) => {
            ws.getUserData().transport.onClose(code, message);
          }
        });
      }
      _applyMiddlewares(req, res, callback) {
        if (this.middlewares.length === 0) {
          return callback();
        }
        req.res = new ResponseWrapper(res);
        super._applyMiddlewares(req, req.res, (err) => {
          req.res.writeHead();
          callback(err);
        });
      }
      handleRequest(res, req) {
        debug('handling "%s" http request "%s"', req.getMethod(), req.getUrl());
        this.prepare(req, res);
        req.res = res;
        const callback = (errorCode, errorContext) => {
          if (errorCode !== void 0) {
            this.emit("connection_error", {
              req,
              code: errorCode,
              message: server_1.Server.errorMessages[errorCode],
              context: errorContext
            });
            this.abortRequest(req.res, errorCode, errorContext);
            return;
          }
          if (req._query.sid) {
            debug("setting new request for existing client");
            this.clients[req._query.sid].transport.onRequest(req);
          } else {
            const closeConnection = (errorCode2, errorContext2) => this.abortRequest(res, errorCode2, errorContext2);
            this.handshake(req._query.transport, req, closeConnection);
          }
        };
        this._applyMiddlewares(req, res, (err) => {
          if (err) {
            callback(server_1.Server.errors.BAD_REQUEST, { name: "MIDDLEWARE_FAILURE" });
          } else {
            this.verify(req, false, callback);
          }
        });
      }
      handleUpgrade(res, req, context) {
        debug("on upgrade");
        this.prepare(req, res);
        req.res = res;
        const callback = async (errorCode, errorContext) => {
          if (errorCode !== void 0) {
            this.emit("connection_error", {
              req,
              code: errorCode,
              message: server_1.Server.errorMessages[errorCode],
              context: errorContext
            });
            this.abortRequest(res, errorCode, errorContext);
            return;
          }
          const id = req._query.sid;
          let transport;
          if (id) {
            const client = this.clients[id];
            if (!client) {
              debug("upgrade attempt for closed client");
              return res.close();
            } else if (client.upgrading) {
              debug("transport has already been trying to upgrade");
              return res.close();
            } else if (client.upgraded) {
              debug("transport had already been upgraded");
              return res.close();
            } else {
              debug("upgrading existing transport");
              transport = this.createTransport(req._query.transport, req);
              client._maybeUpgrade(transport);
            }
          } else {
            transport = await this.handshake(req._query.transport, req, (errorCode2, errorContext2) => this.abortRequest(res, errorCode2, errorContext2));
            if (!transport) {
              return;
            }
          }
          const additionalHeaders = {};
          const isInitialRequest = !id;
          if (isInitialRequest) {
            this.emit("initial_headers", additionalHeaders, req);
          }
          this.emit("headers", additionalHeaders, req);
          req.res.writeStatus("101 Switching Protocols");
          Object.keys(additionalHeaders).forEach((key) => {
            req.res.writeHeader(key, additionalHeaders[key]);
          });
          res.upgrade({
            transport
          }, req.getHeader("sec-websocket-key"), req.getHeader("sec-websocket-protocol"), req.getHeader("sec-websocket-extensions"), context);
        };
        this._applyMiddlewares(req, res, (err) => {
          if (err) {
            callback(server_1.Server.errors.BAD_REQUEST, { name: "MIDDLEWARE_FAILURE" });
          } else {
            this.verify(req, true, callback);
          }
        });
      }
      abortRequest(res, errorCode, errorContext) {
        const statusCode = errorCode === server_1.Server.errors.FORBIDDEN ? "403 Forbidden" : "400 Bad Request";
        const message = errorContext && errorContext.message ? errorContext.message : server_1.Server.errorMessages[errorCode];
        res.writeStatus(statusCode);
        res.writeHeader("Content-Type", "application/json");
        res.end(JSON.stringify({
          code: errorCode,
          message
        }));
      }
    };
    exports2.uServer = uServer;
    var ResponseWrapper = class {
      constructor(res) {
        this.res = res;
        this.statusWritten = false;
        this.headers = [];
        this.isAborted = false;
      }
      set statusCode(status) {
        if (!status) {
          return;
        }
        this.writeStatus(status === 200 ? "200 OK" : "204 No Content");
      }
      writeHead(status) {
        this.statusCode = status;
      }
      setHeader(key, value) {
        if (Array.isArray(value)) {
          value.forEach((val) => {
            this.writeHeader(key, val);
          });
        } else {
          this.writeHeader(key, value);
        }
      }
      removeHeader() {
      }
      // needed by vary: https://github.com/jshttp/vary/blob/5d725d059b3871025cf753e9dfa08924d0bcfa8f/index.js#L134
      getHeader() {
      }
      writeStatus(status) {
        if (this.isAborted)
          return;
        this.res.writeStatus(status);
        this.statusWritten = true;
        this.writeBufferedHeaders();
        return this;
      }
      writeHeader(key, value) {
        if (this.isAborted)
          return;
        if (key === "Content-Length") {
          return;
        }
        if (this.statusWritten) {
          this.res.writeHeader(key, value);
        } else {
          this.headers.push([key, value]);
        }
      }
      writeBufferedHeaders() {
        this.headers.forEach(([key, value]) => {
          this.res.writeHeader(key, value);
        });
      }
      end(data) {
        if (this.isAborted)
          return;
        this.res.cork(() => {
          if (!this.statusWritten) {
            this.writeBufferedHeaders();
          }
          this.res.end(data);
        });
      }
      onData(fn) {
        if (this.isAborted)
          return;
        this.res.onData(fn);
      }
      onAborted(fn) {
        if (this.isAborted)
          return;
        this.res.onAborted(() => {
          this.isAborted = true;
          fn();
        });
      }
      cork(fn) {
        if (this.isAborted)
          return;
        this.res.cork(fn);
      }
    };
  }
});

// node_modules/engine.io/build/engine.io.js
var require_engine_io = __commonJS({
  "node_modules/engine.io/build/engine.io.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.protocol = exports2.Transport = exports2.Socket = exports2.uServer = exports2.parser = exports2.transports = exports2.Server = void 0;
    exports2.listen = listen;
    exports2.attach = attach;
    var http_1 = require("http");
    var server_1 = require_server();
    Object.defineProperty(exports2, "Server", { enumerable: true, get: function() {
      return server_1.Server;
    } });
    var index_1 = require_transports2();
    exports2.transports = index_1.default;
    var parser = require_cjs();
    exports2.parser = parser;
    var userver_1 = require_userver();
    Object.defineProperty(exports2, "uServer", { enumerable: true, get: function() {
      return userver_1.uServer;
    } });
    var socket_1 = require_socket3();
    Object.defineProperty(exports2, "Socket", { enumerable: true, get: function() {
      return socket_1.Socket;
    } });
    var transport_1 = require_transport2();
    Object.defineProperty(exports2, "Transport", { enumerable: true, get: function() {
      return transport_1.Transport;
    } });
    exports2.protocol = parser.protocol;
    function listen(port, options, listenCallback) {
      if ("function" === typeof options) {
        listenCallback = options;
        options = {};
      }
      const server = (0, http_1.createServer)(function(req, res) {
        res.writeHead(501);
        res.end("Not Implemented");
      });
      const engine = attach(server, options);
      engine.httpServer = server;
      server.listen(port, listenCallback);
      return engine;
    }
    function attach(server, options) {
      const engine = new server_1.Server(options);
      engine.attach(server, options);
      return engine;
    }
  }
});

// node_modules/socket.io/dist/client.js
var require_client2 = __commonJS({
  "node_modules/socket.io/dist/client.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Client = void 0;
    var socket_io_parser_1 = require_cjs4();
    var debug_1 = __importDefault(require_src());
    var debug = (0, debug_1.default)("socket.io:client");
    var Client = class {
      /**
       * Client constructor.
       *
       * @param server instance
       * @param conn
       * @package
       */
      constructor(server, conn) {
        this.sockets = /* @__PURE__ */ new Map();
        this.nsps = /* @__PURE__ */ new Map();
        this.server = server;
        this.conn = conn;
        this.encoder = server.encoder;
        this.decoder = new server._parser.Decoder();
        this.id = conn.id;
        this.setup();
      }
      /**
       * @return the reference to the request that originated the Engine.IO connection
       *
       * @public
       */
      get request() {
        return this.conn.request;
      }
      /**
       * Sets up event listeners.
       *
       * @private
       */
      setup() {
        this.onclose = this.onclose.bind(this);
        this.ondata = this.ondata.bind(this);
        this.onerror = this.onerror.bind(this);
        this.ondecoded = this.ondecoded.bind(this);
        this.decoder.on("decoded", this.ondecoded);
        this.conn.on("data", this.ondata);
        this.conn.on("error", this.onerror);
        this.conn.on("close", this.onclose);
        this.connectTimeout = setTimeout(() => {
          if (this.nsps.size === 0) {
            debug("no namespace joined yet, close the client");
            this.close();
          } else {
            debug("the client has already joined a namespace, nothing to do");
          }
        }, this.server._connectTimeout);
      }
      /**
       * Connects a client to a namespace.
       *
       * @param {String} name - the namespace
       * @param {Object} auth - the auth parameters
       * @private
       */
      connect(name, auth = {}) {
        if (this.server._nsps.has(name)) {
          debug("connecting to namespace %s", name);
          return this.doConnect(name, auth);
        }
        this.server._checkNamespace(name, auth, (dynamicNspName) => {
          if (dynamicNspName) {
            this.doConnect(name, auth);
          } else {
            debug("creation of namespace %s was denied", name);
            this._packet({
              type: socket_io_parser_1.PacketType.CONNECT_ERROR,
              nsp: name,
              data: {
                message: "Invalid namespace"
              }
            });
          }
        });
      }
      /**
       * Connects a client to a namespace.
       *
       * @param name - the namespace
       * @param {Object} auth - the auth parameters
       *
       * @private
       */
      doConnect(name, auth) {
        const nsp = this.server.of(name);
        nsp._add(this, auth, (socket) => {
          this.sockets.set(socket.id, socket);
          this.nsps.set(nsp.name, socket);
          if (this.connectTimeout) {
            clearTimeout(this.connectTimeout);
            this.connectTimeout = void 0;
          }
        });
      }
      /**
       * Disconnects from all namespaces and closes transport.
       *
       * @private
       */
      _disconnect() {
        for (const socket of this.sockets.values()) {
          socket.disconnect();
        }
        this.sockets.clear();
        this.close();
      }
      /**
       * Removes a socket. Called by each `Socket`.
       *
       * @private
       */
      _remove(socket) {
        if (this.sockets.has(socket.id)) {
          const nsp = this.sockets.get(socket.id).nsp.name;
          this.sockets.delete(socket.id);
          this.nsps.delete(nsp);
        } else {
          debug("ignoring remove for %s", socket.id);
        }
      }
      /**
       * Closes the underlying connection.
       *
       * @private
       */
      close() {
        if ("open" === this.conn.readyState) {
          debug("forcing transport close");
          this.conn.close();
          this.onclose("forced server close");
        }
      }
      /**
       * Writes a packet to the transport.
       *
       * @param {Object} packet object
       * @param {Object} opts
       * @private
       */
      _packet(packet, opts = {}) {
        if (this.conn.readyState !== "open") {
          debug("ignoring packet write %j", packet);
          return;
        }
        const encodedPackets = opts.preEncoded ? packet : this.encoder.encode(packet);
        this.writeToEngine(encodedPackets, opts);
      }
      writeToEngine(encodedPackets, opts) {
        if (opts.volatile && !this.conn.transport.writable) {
          debug("volatile packet is discarded since the transport is not currently writable");
          return;
        }
        const packets = Array.isArray(encodedPackets) ? encodedPackets : [encodedPackets];
        for (const encodedPacket of packets) {
          this.conn.write(encodedPacket, opts);
        }
      }
      /**
       * Called with incoming transport data.
       *
       * @private
       */
      ondata(data) {
        try {
          this.decoder.add(data);
        } catch (e) {
          debug("invalid packet format");
          this.onerror(e);
        }
      }
      /**
       * Called when parser fully decodes a packet.
       *
       * @private
       */
      ondecoded(packet) {
        const { namespace, authPayload } = this._parseNamespace(packet);
        const socket = this.nsps.get(namespace);
        if (!socket && packet.type === socket_io_parser_1.PacketType.CONNECT) {
          this.connect(namespace, authPayload);
        } else if (socket && packet.type !== socket_io_parser_1.PacketType.CONNECT && packet.type !== socket_io_parser_1.PacketType.CONNECT_ERROR) {
          process.nextTick(function() {
            socket._onpacket(packet);
          });
        } else {
          debug("invalid state (packet type: %s)", packet.type);
          this.close();
        }
      }
      _parseNamespace(packet) {
        if (this.conn.protocol !== 3) {
          return {
            namespace: packet.nsp,
            authPayload: packet.data
          };
        }
        const url = new URL(packet.nsp, "https://socket.io");
        return {
          namespace: url.pathname,
          authPayload: Object.fromEntries(url.searchParams.entries())
        };
      }
      /**
       * Handles an error.
       *
       * @param {Object} err object
       * @private
       */
      onerror(err) {
        for (const socket of this.sockets.values()) {
          socket._onerror(err);
        }
        this.conn.close();
      }
      /**
       * Called upon transport close.
       *
       * @param reason
       * @param description
       * @private
       */
      onclose(reason, description) {
        debug("client close with reason %s", reason);
        this.destroy();
        for (const socket of this.sockets.values()) {
          socket._onclose(reason, description);
        }
        this.sockets.clear();
        this.decoder.destroy();
      }
      /**
       * Cleans up event listeners.
       * @private
       */
      destroy() {
        this.conn.removeListener("data", this.ondata);
        this.conn.removeListener("error", this.onerror);
        this.conn.removeListener("close", this.onclose);
        this.decoder.removeListener("decoded", this.ondecoded);
        if (this.connectTimeout) {
          clearTimeout(this.connectTimeout);
          this.connectTimeout = void 0;
        }
      }
    };
    exports2.Client = Client;
  }
});

// node_modules/socket.io/dist/typed-events.js
var require_typed_events = __commonJS({
  "node_modules/socket.io/dist/typed-events.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.StrictEventEmitter = void 0;
    var events_1 = require("events");
    var StrictEventEmitter = class extends events_1.EventEmitter {
      /**
       * Adds the `listener` function as an event listener for `ev`.
       *
       * @param ev Name of the event
       * @param listener Callback function
       */
      on(ev, listener) {
        return super.on(ev, listener);
      }
      /**
       * Adds a one-time `listener` function as an event listener for `ev`.
       *
       * @param ev Name of the event
       * @param listener Callback function
       */
      once(ev, listener) {
        return super.once(ev, listener);
      }
      /**
       * Emits an event.
       *
       * @param ev Name of the event
       * @param args Values to send to listeners of this event
       */
      emit(ev, ...args) {
        return super.emit(ev, ...args);
      }
      /**
       * Emits a reserved event.
       *
       * This method is `protected`, so that only a class extending
       * `StrictEventEmitter` can emit its own reserved events.
       *
       * @param ev Reserved event name
       * @param args Arguments to emit along with the event
       */
      emitReserved(ev, ...args) {
        return super.emit(ev, ...args);
      }
      /**
       * Emits an event.
       *
       * This method is `protected`, so that only a class extending
       * `StrictEventEmitter` can get around the strict typing. This is useful for
       * calling `emit.apply`, which can be called as `emitUntyped.apply`.
       *
       * @param ev Event name
       * @param args Arguments to emit along with the event
       */
      emitUntyped(ev, ...args) {
        return super.emit(ev, ...args);
      }
      /**
       * Returns the listeners listening to an event.
       *
       * @param event Event name
       * @returns Array of listeners subscribed to `event`
       */
      listeners(event) {
        return super.listeners(event);
      }
    };
    exports2.StrictEventEmitter = StrictEventEmitter;
  }
});

// node_modules/socket.io/dist/socket-types.js
var require_socket_types = __commonJS({
  "node_modules/socket.io/dist/socket-types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.RESERVED_EVENTS = void 0;
    exports2.RESERVED_EVENTS = /* @__PURE__ */ new Set([
      "connect",
      "connect_error",
      "disconnect",
      "disconnecting",
      "newListener",
      "removeListener"
    ]);
  }
});

// node_modules/socket.io/dist/broadcast-operator.js
var require_broadcast_operator = __commonJS({
  "node_modules/socket.io/dist/broadcast-operator.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.RemoteSocket = exports2.BroadcastOperator = void 0;
    var socket_types_1 = require_socket_types();
    var socket_io_parser_1 = require_cjs4();
    var BroadcastOperator = class _BroadcastOperator {
      constructor(adapter, rooms = /* @__PURE__ */ new Set(), exceptRooms = /* @__PURE__ */ new Set(), flags = {}) {
        this.adapter = adapter;
        this.rooms = rooms;
        this.exceptRooms = exceptRooms;
        this.flags = flags;
      }
      /**
       * Targets a room when emitting.
       *
       * @example
       * // the “foo” event will be broadcast to all connected clients in the “room-101” room
       * io.to("room-101").emit("foo", "bar");
       *
       * // with an array of rooms (a client will be notified at most once)
       * io.to(["room-101", "room-102"]).emit("foo", "bar");
       *
       * // with multiple chained calls
       * io.to("room-101").to("room-102").emit("foo", "bar");
       *
       * @param room - a room, or an array of rooms
       * @return a new {@link BroadcastOperator} instance for chaining
       */
      to(room) {
        const rooms = new Set(this.rooms);
        if (Array.isArray(room)) {
          room.forEach((r) => rooms.add(r));
        } else {
          rooms.add(room);
        }
        return new _BroadcastOperator(this.adapter, rooms, this.exceptRooms, this.flags);
      }
      /**
       * Targets a room when emitting. Similar to `to()`, but might feel clearer in some cases:
       *
       * @example
       * // disconnect all clients in the "room-101" room
       * io.in("room-101").disconnectSockets();
       *
       * @param room - a room, or an array of rooms
       * @return a new {@link BroadcastOperator} instance for chaining
       */
      in(room) {
        return this.to(room);
      }
      /**
       * Excludes a room when emitting.
       *
       * @example
       * // the "foo" event will be broadcast to all connected clients, except the ones that are in the "room-101" room
       * io.except("room-101").emit("foo", "bar");
       *
       * // with an array of rooms
       * io.except(["room-101", "room-102"]).emit("foo", "bar");
       *
       * // with multiple chained calls
       * io.except("room-101").except("room-102").emit("foo", "bar");
       *
       * @param room - a room, or an array of rooms
       * @return a new {@link BroadcastOperator} instance for chaining
       */
      except(room) {
        const exceptRooms = new Set(this.exceptRooms);
        if (Array.isArray(room)) {
          room.forEach((r) => exceptRooms.add(r));
        } else {
          exceptRooms.add(room);
        }
        return new _BroadcastOperator(this.adapter, this.rooms, exceptRooms, this.flags);
      }
      /**
       * Sets the compress flag.
       *
       * @example
       * io.compress(false).emit("hello");
       *
       * @param compress - if `true`, compresses the sending data
       * @return a new BroadcastOperator instance
       */
      compress(compress) {
        const flags = Object.assign({}, this.flags, { compress });
        return new _BroadcastOperator(this.adapter, this.rooms, this.exceptRooms, flags);
      }
      /**
       * Sets a modifier for a subsequent event emission that the event data may be lost if the client is not ready to
       * receive messages (because of network slowness or other issues, or because they’re connected through long polling
       * and is in the middle of a request-response cycle).
       *
       * @example
       * io.volatile.emit("hello"); // the clients may or may not receive it
       *
       * @return a new BroadcastOperator instance
       */
      get volatile() {
        const flags = Object.assign({}, this.flags, { volatile: true });
        return new _BroadcastOperator(this.adapter, this.rooms, this.exceptRooms, flags);
      }
      /**
       * Sets a modifier for a subsequent event emission that the event data will only be broadcast to the current node.
       *
       * @example
       * // the “foo” event will be broadcast to all connected clients on this node
       * io.local.emit("foo", "bar");
       *
       * @return a new {@link BroadcastOperator} instance for chaining
       */
      get local() {
        const flags = Object.assign({}, this.flags, { local: true });
        return new _BroadcastOperator(this.adapter, this.rooms, this.exceptRooms, flags);
      }
      /**
       * Adds a timeout in milliseconds for the next operation
       *
       * @example
       * io.timeout(1000).emit("some-event", (err, responses) => {
       *   if (err) {
       *     // some clients did not acknowledge the event in the given delay
       *   } else {
       *     console.log(responses); // one response per client
       *   }
       * });
       *
       * @param timeout
       */
      timeout(timeout) {
        const flags = Object.assign({}, this.flags, { timeout });
        return new _BroadcastOperator(this.adapter, this.rooms, this.exceptRooms, flags);
      }
      /**
       * Emits to all clients.
       *
       * @example
       * // the “foo” event will be broadcast to all connected clients
       * io.emit("foo", "bar");
       *
       * // the “foo” event will be broadcast to all connected clients in the “room-101” room
       * io.to("room-101").emit("foo", "bar");
       *
       * // with an acknowledgement expected from all connected clients
       * io.timeout(1000).emit("some-event", (err, responses) => {
       *   if (err) {
       *     // some clients did not acknowledge the event in the given delay
       *   } else {
       *     console.log(responses); // one response per client
       *   }
       * });
       *
       * @return Always true
       */
      emit(ev, ...args) {
        if (socket_types_1.RESERVED_EVENTS.has(ev)) {
          throw new Error(`"${String(ev)}" is a reserved event name`);
        }
        const data = [ev, ...args];
        const packet = {
          type: socket_io_parser_1.PacketType.EVENT,
          data
        };
        const withAck = typeof data[data.length - 1] === "function";
        if (!withAck) {
          this.adapter.broadcast(packet, {
            rooms: this.rooms,
            except: this.exceptRooms,
            flags: this.flags
          });
          return true;
        }
        const ack = data.pop();
        let timedOut = false;
        let responses = [];
        const timer = setTimeout(() => {
          timedOut = true;
          ack.apply(this, [
            new Error("operation has timed out"),
            this.flags.expectSingleResponse ? null : responses
          ]);
        }, this.flags.timeout);
        let expectedServerCount = -1;
        let actualServerCount = 0;
        let expectedClientCount = 0;
        const checkCompleteness = () => {
          if (!timedOut && expectedServerCount === actualServerCount && responses.length === expectedClientCount) {
            clearTimeout(timer);
            ack.apply(this, [
              null,
              this.flags.expectSingleResponse ? responses[0] : responses
            ]);
          }
        };
        this.adapter.broadcastWithAck(packet, {
          rooms: this.rooms,
          except: this.exceptRooms,
          flags: this.flags
        }, (clientCount) => {
          expectedClientCount += clientCount;
          actualServerCount++;
          checkCompleteness();
        }, (clientResponse) => {
          responses.push(clientResponse);
          checkCompleteness();
        });
        this.adapter.serverCount().then((serverCount) => {
          expectedServerCount = serverCount;
          checkCompleteness();
        });
        return true;
      }
      /**
       * Emits an event and waits for an acknowledgement from all clients.
       *
       * @example
       * try {
       *   const responses = await io.timeout(1000).emitWithAck("some-event");
       *   console.log(responses); // one response per client
       * } catch (e) {
       *   // some clients did not acknowledge the event in the given delay
       * }
       *
       * @return a Promise that will be fulfilled when all clients have acknowledged the event
       */
      emitWithAck(ev, ...args) {
        return new Promise((resolve, reject) => {
          args.push((err, responses) => {
            if (err) {
              err.responses = responses;
              return reject(err);
            } else {
              return resolve(responses);
            }
          });
          this.emit(ev, ...args);
        });
      }
      /**
       * Gets a list of clients.
       *
       * @deprecated this method will be removed in the next major release, please use {@link Server#serverSideEmit} or
       * {@link fetchSockets} instead.
       */
      allSockets() {
        if (!this.adapter) {
          throw new Error("No adapter for this namespace, are you trying to get the list of clients of a dynamic namespace?");
        }
        return this.adapter.sockets(this.rooms);
      }
      /**
       * Returns the matching socket instances. This method works across a cluster of several Socket.IO servers.
       *
       * Note: this method also works within a cluster of multiple Socket.IO servers, with a compatible {@link Adapter}.
       *
       * @example
       * // return all Socket instances
       * const sockets = await io.fetchSockets();
       *
       * // return all Socket instances in the "room1" room
       * const sockets = await io.in("room1").fetchSockets();
       *
       * for (const socket of sockets) {
       *   console.log(socket.id);
       *   console.log(socket.handshake);
       *   console.log(socket.rooms);
       *   console.log(socket.data);
       *
       *   socket.emit("hello");
       *   socket.join("room1");
       *   socket.leave("room2");
       *   socket.disconnect();
       * }
       */
      fetchSockets() {
        return this.adapter.fetchSockets({
          rooms: this.rooms,
          except: this.exceptRooms,
          flags: this.flags
        }).then((sockets) => {
          return sockets.map((socket) => {
            if (socket.server) {
              return socket;
            } else {
              return new RemoteSocket(this.adapter, socket);
            }
          });
        });
      }
      /**
       * Makes the matching socket instances join the specified rooms.
       *
       * Note: this method also works within a cluster of multiple Socket.IO servers, with a compatible {@link Adapter}.
       *
       * @example
       *
       * // make all socket instances join the "room1" room
       * io.socketsJoin("room1");
       *
       * // make all socket instances in the "room1" room join the "room2" and "room3" rooms
       * io.in("room1").socketsJoin(["room2", "room3"]);
       *
       * @param room - a room, or an array of rooms
       */
      socketsJoin(room) {
        this.adapter.addSockets({
          rooms: this.rooms,
          except: this.exceptRooms,
          flags: this.flags
        }, Array.isArray(room) ? room : [room]);
      }
      /**
       * Makes the matching socket instances leave the specified rooms.
       *
       * Note: this method also works within a cluster of multiple Socket.IO servers, with a compatible {@link Adapter}.
       *
       * @example
       * // make all socket instances leave the "room1" room
       * io.socketsLeave("room1");
       *
       * // make all socket instances in the "room1" room leave the "room2" and "room3" rooms
       * io.in("room1").socketsLeave(["room2", "room3"]);
       *
       * @param room - a room, or an array of rooms
       */
      socketsLeave(room) {
        this.adapter.delSockets({
          rooms: this.rooms,
          except: this.exceptRooms,
          flags: this.flags
        }, Array.isArray(room) ? room : [room]);
      }
      /**
       * Makes the matching socket instances disconnect.
       *
       * Note: this method also works within a cluster of multiple Socket.IO servers, with a compatible {@link Adapter}.
       *
       * @example
       * // make all socket instances disconnect (the connections might be kept alive for other namespaces)
       * io.disconnectSockets();
       *
       * // make all socket instances in the "room1" room disconnect and close the underlying connections
       * io.in("room1").disconnectSockets(true);
       *
       * @param close - whether to close the underlying connection
       */
      disconnectSockets(close = false) {
        this.adapter.disconnectSockets({
          rooms: this.rooms,
          except: this.exceptRooms,
          flags: this.flags
        }, close);
      }
    };
    exports2.BroadcastOperator = BroadcastOperator;
    var RemoteSocket = class {
      constructor(adapter, details) {
        this.id = details.id;
        this.handshake = details.handshake;
        this.rooms = new Set(details.rooms);
        this.data = details.data;
        this.operator = new BroadcastOperator(adapter, /* @__PURE__ */ new Set([this.id]), /* @__PURE__ */ new Set(), {
          expectSingleResponse: true
          // so that remoteSocket.emit() with acknowledgement behaves like socket.emit()
        });
      }
      /**
       * Adds a timeout in milliseconds for the next operation.
       *
       * @example
       * const sockets = await io.fetchSockets();
       *
       * for (const socket of sockets) {
       *   if (someCondition) {
       *     socket.timeout(1000).emit("some-event", (err) => {
       *       if (err) {
       *         // the client did not acknowledge the event in the given delay
       *       }
       *     });
       *   }
       * }
       *
       * // note: if possible, using a room instead of looping over all sockets is preferable
       * io.timeout(1000).to(someConditionRoom).emit("some-event", (err, responses) => {
       *   // ...
       * });
       *
       * @param timeout
       */
      timeout(timeout) {
        return this.operator.timeout(timeout);
      }
      emit(ev, ...args) {
        return this.operator.emit(ev, ...args);
      }
      /**
       * Joins a room.
       *
       * @param {String|Array} room - room or array of rooms
       */
      join(room) {
        return this.operator.socketsJoin(room);
      }
      /**
       * Leaves a room.
       *
       * @param {String} room
       */
      leave(room) {
        return this.operator.socketsLeave(room);
      }
      /**
       * Disconnects this client.
       *
       * @param {Boolean} close - if `true`, closes the underlying connection
       * @return {Socket} self
       */
      disconnect(close = false) {
        this.operator.disconnectSockets(close);
        return this;
      }
    };
    exports2.RemoteSocket = RemoteSocket;
  }
});

// node_modules/socket.io/dist/socket.js
var require_socket4 = __commonJS({
  "node_modules/socket.io/dist/socket.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Socket = void 0;
    var socket_io_parser_1 = require_cjs4();
    var debug_1 = __importDefault(require_src());
    var typed_events_1 = require_typed_events();
    var base64id_1 = __importDefault(require_base64id());
    var broadcast_operator_1 = require_broadcast_operator();
    var socket_types_1 = require_socket_types();
    var debug = (0, debug_1.default)("socket.io:socket");
    var RECOVERABLE_DISCONNECT_REASONS = /* @__PURE__ */ new Set([
      "transport error",
      "transport close",
      "forced close",
      "ping timeout",
      "server shutting down",
      "forced server close"
    ]);
    function noop() {
    }
    var Socket = class extends typed_events_1.StrictEventEmitter {
      /**
       * Interface to a `Client` for a given `Namespace`.
       *
       * @param {Namespace} nsp
       * @param {Client} client
       * @param {Object} auth
       * @package
       */
      constructor(nsp, client, auth, previousSession) {
        super();
        this.nsp = nsp;
        this.client = client;
        this.recovered = false;
        this.data = {};
        this.connected = false;
        this.acks = /* @__PURE__ */ new Map();
        this.fns = [];
        this.flags = {};
        this.server = nsp.server;
        this.adapter = nsp.adapter;
        if (previousSession) {
          this.id = previousSession.sid;
          this.pid = previousSession.pid;
          previousSession.rooms.forEach((room) => this.join(room));
          this.data = previousSession.data;
          previousSession.missedPackets.forEach((packet) => {
            this.packet({
              type: socket_io_parser_1.PacketType.EVENT,
              data: packet
            });
          });
          this.recovered = true;
        } else {
          if (client.conn.protocol === 3) {
            this.id = nsp.name !== "/" ? nsp.name + "#" + client.id : client.id;
          } else {
            this.id = base64id_1.default.generateId();
          }
          if (this.server._opts.connectionStateRecovery) {
            this.pid = base64id_1.default.generateId();
          }
        }
        this.handshake = this.buildHandshake(auth);
        this.on("error", noop);
      }
      /**
       * Builds the `handshake` BC object
       *
       * @private
       */
      buildHandshake(auth) {
        var _a, _b, _c, _d;
        return {
          headers: ((_a = this.request) === null || _a === void 0 ? void 0 : _a.headers) || {},
          time: /* @__PURE__ */ new Date() + "",
          address: this.conn.remoteAddress,
          xdomain: !!((_b = this.request) === null || _b === void 0 ? void 0 : _b.headers.origin),
          // @ts-ignore
          secure: !this.request || !!this.request.connection.encrypted,
          issued: +/* @__PURE__ */ new Date(),
          url: (_c = this.request) === null || _c === void 0 ? void 0 : _c.url,
          // @ts-ignore
          query: ((_d = this.request) === null || _d === void 0 ? void 0 : _d._query) || {},
          auth
        };
      }
      /**
       * Emits to this client.
       *
       * @example
       * io.on("connection", (socket) => {
       *   socket.emit("hello", "world");
       *
       *   // all serializable datastructures are supported (no need to call JSON.stringify)
       *   socket.emit("hello", 1, "2", { 3: ["4"], 5: Buffer.from([6]) });
       *
       *   // with an acknowledgement from the client
       *   socket.emit("hello", "world", (val) => {
       *     // ...
       *   });
       * });
       *
       * @return Always returns `true`.
       */
      emit(ev, ...args) {
        if (socket_types_1.RESERVED_EVENTS.has(ev)) {
          throw new Error(`"${String(ev)}" is a reserved event name`);
        }
        const data = [ev, ...args];
        const packet = {
          type: socket_io_parser_1.PacketType.EVENT,
          data
        };
        if (typeof data[data.length - 1] === "function") {
          const id = this.nsp._ids++;
          debug("emitting packet with ack id %d", id);
          this.registerAckCallback(id, data.pop());
          packet.id = id;
        }
        const flags = Object.assign({}, this.flags);
        this.flags = {};
        if (this.nsp.server.opts.connectionStateRecovery) {
          this.adapter.broadcast(packet, {
            rooms: /* @__PURE__ */ new Set([this.id]),
            except: /* @__PURE__ */ new Set(),
            flags
          });
        } else {
          this.notifyOutgoingListeners(packet);
          this.packet(packet, flags);
        }
        return true;
      }
      /**
       * Emits an event and waits for an acknowledgement
       *
       * @example
       * io.on("connection", async (socket) => {
       *   // without timeout
       *   const response = await socket.emitWithAck("hello", "world");
       *
       *   // with a specific timeout
       *   try {
       *     const response = await socket.timeout(1000).emitWithAck("hello", "world");
       *   } catch (err) {
       *     // the client did not acknowledge the event in the given delay
       *   }
       * });
       *
       * @return a Promise that will be fulfilled when the client acknowledges the event
       */
      emitWithAck(ev, ...args) {
        const withErr = this.flags.timeout !== void 0;
        return new Promise((resolve, reject) => {
          args.push((arg1, arg2) => {
            if (withErr) {
              return arg1 ? reject(arg1) : resolve(arg2);
            } else {
              return resolve(arg1);
            }
          });
          this.emit(ev, ...args);
        });
      }
      /**
       * @private
       */
      registerAckCallback(id, ack) {
        const timeout = this.flags.timeout;
        if (timeout === void 0) {
          this.acks.set(id, ack);
          return;
        }
        const timer = setTimeout(() => {
          debug("event with ack id %d has timed out after %d ms", id, timeout);
          this.acks.delete(id);
          ack.call(this, new Error("operation has timed out"));
        }, timeout);
        this.acks.set(id, (...args) => {
          clearTimeout(timer);
          ack.apply(this, [null, ...args]);
        });
      }
      /**
       * Targets a room when broadcasting.
       *
       * @example
       * io.on("connection", (socket) => {
       *   // the “foo” event will be broadcast to all connected clients in the “room-101” room, except this socket
       *   socket.to("room-101").emit("foo", "bar");
       *
       *   // the code above is equivalent to:
       *   io.to("room-101").except(socket.id).emit("foo", "bar");
       *
       *   // with an array of rooms (a client will be notified at most once)
       *   socket.to(["room-101", "room-102"]).emit("foo", "bar");
       *
       *   // with multiple chained calls
       *   socket.to("room-101").to("room-102").emit("foo", "bar");
       * });
       *
       * @param room - a room, or an array of rooms
       * @return a new {@link BroadcastOperator} instance for chaining
       */
      to(room) {
        return this.newBroadcastOperator().to(room);
      }
      /**
       * Targets a room when broadcasting. Similar to `to()`, but might feel clearer in some cases:
       *
       * @example
       * io.on("connection", (socket) => {
       *   // disconnect all clients in the "room-101" room, except this socket
       *   socket.in("room-101").disconnectSockets();
       * });
       *
       * @param room - a room, or an array of rooms
       * @return a new {@link BroadcastOperator} instance for chaining
       */
      in(room) {
        return this.newBroadcastOperator().in(room);
      }
      /**
       * Excludes a room when broadcasting.
       *
       * @example
       * io.on("connection", (socket) => {
       *   // the "foo" event will be broadcast to all connected clients, except the ones that are in the "room-101" room
       *   // and this socket
       *   socket.except("room-101").emit("foo", "bar");
       *
       *   // with an array of rooms
       *   socket.except(["room-101", "room-102"]).emit("foo", "bar");
       *
       *   // with multiple chained calls
       *   socket.except("room-101").except("room-102").emit("foo", "bar");
       * });
       *
       * @param room - a room, or an array of rooms
       * @return a new {@link BroadcastOperator} instance for chaining
       */
      except(room) {
        return this.newBroadcastOperator().except(room);
      }
      /**
       * Sends a `message` event.
       *
       * This method mimics the WebSocket.send() method.
       *
       * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send
       *
       * @example
       * io.on("connection", (socket) => {
       *   socket.send("hello");
       *
       *   // this is equivalent to
       *   socket.emit("message", "hello");
       * });
       *
       * @return self
       */
      send(...args) {
        this.emit("message", ...args);
        return this;
      }
      /**
       * Sends a `message` event. Alias of {@link send}.
       *
       * @return self
       */
      write(...args) {
        this.emit("message", ...args);
        return this;
      }
      /**
       * Writes a packet.
       *
       * @param {Object} packet - packet object
       * @param {Object} opts - options
       * @private
       */
      packet(packet, opts = {}) {
        packet.nsp = this.nsp.name;
        opts.compress = false !== opts.compress;
        this.client._packet(packet, opts);
      }
      /**
       * Joins a room.
       *
       * @example
       * io.on("connection", (socket) => {
       *   // join a single room
       *   socket.join("room1");
       *
       *   // join multiple rooms
       *   socket.join(["room1", "room2"]);
       * });
       *
       * @param {String|Array} rooms - room or array of rooms
       * @return a Promise or nothing, depending on the adapter
       */
      join(rooms) {
        debug("join room %s", rooms);
        return this.adapter.addAll(this.id, new Set(Array.isArray(rooms) ? rooms : [rooms]));
      }
      /**
       * Leaves a room.
       *
       * @example
       * io.on("connection", (socket) => {
       *   // leave a single room
       *   socket.leave("room1");
       *
       *   // leave multiple rooms
       *   socket.leave("room1").leave("room2");
       * });
       *
       * @param {String} room
       * @return a Promise or nothing, depending on the adapter
       */
      leave(room) {
        debug("leave room %s", room);
        return this.adapter.del(this.id, room);
      }
      /**
       * Leave all rooms.
       *
       * @private
       */
      leaveAll() {
        this.adapter.delAll(this.id);
      }
      /**
       * Called by `Namespace` upon successful
       * middleware execution (ie: authorization).
       * Socket is added to namespace array before
       * call to join, so adapters can access it.
       *
       * @private
       */
      _onconnect() {
        debug("socket connected - writing packet");
        this.connected = true;
        this.join(this.id);
        if (this.conn.protocol === 3) {
          this.packet({ type: socket_io_parser_1.PacketType.CONNECT });
        } else {
          this.packet({
            type: socket_io_parser_1.PacketType.CONNECT,
            data: { sid: this.id, pid: this.pid }
          });
        }
      }
      /**
       * Called with each packet. Called by `Client`.
       *
       * @param {Object} packet
       * @private
       */
      _onpacket(packet) {
        debug("got packet %j", packet);
        switch (packet.type) {
          case socket_io_parser_1.PacketType.EVENT:
            this.onevent(packet);
            break;
          case socket_io_parser_1.PacketType.BINARY_EVENT:
            this.onevent(packet);
            break;
          case socket_io_parser_1.PacketType.ACK:
            this.onack(packet);
            break;
          case socket_io_parser_1.PacketType.BINARY_ACK:
            this.onack(packet);
            break;
          case socket_io_parser_1.PacketType.DISCONNECT:
            this.ondisconnect();
            break;
        }
      }
      /**
       * Called upon event packet.
       *
       * @param {Packet} packet - packet object
       * @private
       */
      onevent(packet) {
        const args = packet.data || [];
        debug("emitting event %j", args);
        if (null != packet.id) {
          debug("attaching ack callback to event");
          args.push(this.ack(packet.id));
        }
        if (this._anyListeners && this._anyListeners.length) {
          const listeners = this._anyListeners.slice();
          for (const listener of listeners) {
            listener.apply(this, args);
          }
        }
        this.dispatch(args);
      }
      /**
       * Produces an ack callback to emit with an event.
       *
       * @param {Number} id - packet id
       * @private
       */
      ack(id) {
        const self = this;
        let sent = false;
        return function() {
          if (sent)
            return;
          const args = Array.prototype.slice.call(arguments);
          debug("sending ack %j", args);
          self.packet({
            id,
            type: socket_io_parser_1.PacketType.ACK,
            data: args
          });
          sent = true;
        };
      }
      /**
       * Called upon ack packet.
       *
       * @private
       */
      onack(packet) {
        const ack = this.acks.get(packet.id);
        if ("function" == typeof ack) {
          debug("calling ack %s with %j", packet.id, packet.data);
          ack.apply(this, packet.data);
          this.acks.delete(packet.id);
        } else {
          debug("bad ack %s", packet.id);
        }
      }
      /**
       * Called upon client disconnect packet.
       *
       * @private
       */
      ondisconnect() {
        debug("got disconnect packet");
        this._onclose("client namespace disconnect");
      }
      /**
       * Handles a client error.
       *
       * @private
       */
      _onerror(err) {
        this.emitReserved("error", err);
      }
      /**
       * Called upon closing. Called by `Client`.
       *
       * @param {String} reason
       * @param description
       * @throw {Error} optional error object
       *
       * @private
       */
      _onclose(reason, description) {
        if (!this.connected)
          return this;
        debug("closing socket - reason %s", reason);
        this.emitReserved("disconnecting", reason, description);
        if (this.server._opts.connectionStateRecovery && RECOVERABLE_DISCONNECT_REASONS.has(reason)) {
          debug("connection state recovery is enabled for sid %s", this.id);
          this.adapter.persistSession({
            sid: this.id,
            pid: this.pid,
            rooms: [...this.rooms],
            data: this.data
          });
        }
        this._cleanup();
        this.client._remove(this);
        this.connected = false;
        this.emitReserved("disconnect", reason, description);
        return;
      }
      /**
       * Makes the socket leave all the rooms it was part of and prevents it from joining any other room
       *
       * @private
       */
      _cleanup() {
        this.leaveAll();
        this.nsp._remove(this);
        this.join = noop;
      }
      /**
       * Produces an `error` packet.
       *
       * @param {Object} err - error object
       *
       * @private
       */
      _error(err) {
        this.packet({ type: socket_io_parser_1.PacketType.CONNECT_ERROR, data: err });
      }
      /**
       * Disconnects this client.
       *
       * @example
       * io.on("connection", (socket) => {
       *   // disconnect this socket (the connection might be kept alive for other namespaces)
       *   socket.disconnect();
       *
       *   // disconnect this socket and close the underlying connection
       *   socket.disconnect(true);
       * })
       *
       * @param {Boolean} close - if `true`, closes the underlying connection
       * @return self
       */
      disconnect(close = false) {
        if (!this.connected)
          return this;
        if (close) {
          this.client._disconnect();
        } else {
          this.packet({ type: socket_io_parser_1.PacketType.DISCONNECT });
          this._onclose("server namespace disconnect");
        }
        return this;
      }
      /**
       * Sets the compress flag.
       *
       * @example
       * io.on("connection", (socket) => {
       *   socket.compress(false).emit("hello");
       * });
       *
       * @param {Boolean} compress - if `true`, compresses the sending data
       * @return {Socket} self
       */
      compress(compress) {
        this.flags.compress = compress;
        return this;
      }
      /**
       * Sets a modifier for a subsequent event emission that the event data may be lost if the client is not ready to
       * receive messages (because of network slowness or other issues, or because they’re connected through long polling
       * and is in the middle of a request-response cycle).
       *
       * @example
       * io.on("connection", (socket) => {
       *   socket.volatile.emit("hello"); // the client may or may not receive it
       * });
       *
       * @return {Socket} self
       */
      get volatile() {
        this.flags.volatile = true;
        return this;
      }
      /**
       * Sets a modifier for a subsequent event emission that the event data will only be broadcast to every sockets but the
       * sender.
       *
       * @example
       * io.on("connection", (socket) => {
       *   // the “foo” event will be broadcast to all connected clients, except this socket
       *   socket.broadcast.emit("foo", "bar");
       * });
       *
       * @return a new {@link BroadcastOperator} instance for chaining
       */
      get broadcast() {
        return this.newBroadcastOperator();
      }
      /**
       * Sets a modifier for a subsequent event emission that the event data will only be broadcast to the current node.
       *
       * @example
       * io.on("connection", (socket) => {
       *   // the “foo” event will be broadcast to all connected clients on this node, except this socket
       *   socket.local.emit("foo", "bar");
       * });
       *
       * @return a new {@link BroadcastOperator} instance for chaining
       */
      get local() {
        return this.newBroadcastOperator().local;
      }
      /**
       * Sets a modifier for a subsequent event emission that the callback will be called with an error when the
       * given number of milliseconds have elapsed without an acknowledgement from the client:
       *
       * @example
       * io.on("connection", (socket) => {
       *   socket.timeout(5000).emit("my-event", (err) => {
       *     if (err) {
       *       // the client did not acknowledge the event in the given delay
       *     }
       *   });
       * });
       *
       * @returns self
       */
      timeout(timeout) {
        this.flags.timeout = timeout;
        return this;
      }
      /**
       * Dispatch incoming event to socket listeners.
       *
       * @param {Array} event - event that will get emitted
       * @private
       */
      dispatch(event) {
        debug("dispatching an event %j", event);
        this.run(event, (err) => {
          process.nextTick(() => {
            if (err) {
              return this._onerror(err);
            }
            if (this.connected) {
              super.emitUntyped.apply(this, event);
            } else {
              debug("ignore packet received after disconnection");
            }
          });
        });
      }
      /**
       * Sets up socket middleware.
       *
       * @example
       * io.on("connection", (socket) => {
       *   socket.use(([event, ...args], next) => {
       *     if (isUnauthorized(event)) {
       *       return next(new Error("unauthorized event"));
       *     }
       *     // do not forget to call next
       *     next();
       *   });
       *
       *   socket.on("error", (err) => {
       *     if (err && err.message === "unauthorized event") {
       *       socket.disconnect();
       *     }
       *   });
       * });
       *
       * @param {Function} fn - middleware function (event, next)
       * @return {Socket} self
       */
      use(fn) {
        this.fns.push(fn);
        return this;
      }
      /**
       * Executes the middleware for an incoming event.
       *
       * @param {Array} event - event that will get emitted
       * @param {Function} fn - last fn call in the middleware
       * @private
       */
      run(event, fn) {
        if (!this.fns.length)
          return fn();
        const fns = this.fns.slice(0);
        function run(i) {
          fns[i](event, (err) => {
            if (err)
              return fn(err);
            if (!fns[i + 1])
              return fn();
            run(i + 1);
          });
        }
        run(0);
      }
      /**
       * Whether the socket is currently disconnected
       */
      get disconnected() {
        return !this.connected;
      }
      /**
       * A reference to the request that originated the underlying Engine.IO Socket.
       */
      get request() {
        return this.client.request;
      }
      /**
       * A reference to the underlying Client transport connection (Engine.IO Socket object).
       *
       * @example
       * io.on("connection", (socket) => {
       *   console.log(socket.conn.transport.name); // prints "polling" or "websocket"
       *
       *   socket.conn.once("upgrade", () => {
       *     console.log(socket.conn.transport.name); // prints "websocket"
       *   });
       * });
       */
      get conn() {
        return this.client.conn;
      }
      /**
       * Returns the rooms the socket is currently in.
       *
       * @example
       * io.on("connection", (socket) => {
       *   console.log(socket.rooms); // Set { <socket.id> }
       *
       *   socket.join("room1");
       *
       *   console.log(socket.rooms); // Set { <socket.id>, "room1" }
       * });
       */
      get rooms() {
        return this.adapter.socketRooms(this.id) || /* @__PURE__ */ new Set();
      }
      /**
       * Adds a listener that will be fired when any event is received. The event name is passed as the first argument to
       * the callback.
       *
       * @example
       * io.on("connection", (socket) => {
       *   socket.onAny((event, ...args) => {
       *     console.log(`got event ${event}`);
       *   });
       * });
       *
       * @param listener
       */
      onAny(listener) {
        this._anyListeners = this._anyListeners || [];
        this._anyListeners.push(listener);
        return this;
      }
      /**
       * Adds a listener that will be fired when any event is received. The event name is passed as the first argument to
       * the callback. The listener is added to the beginning of the listeners array.
       *
       * @param listener
       */
      prependAny(listener) {
        this._anyListeners = this._anyListeners || [];
        this._anyListeners.unshift(listener);
        return this;
      }
      /**
       * Removes the listener that will be fired when any event is received.
       *
       * @example
       * io.on("connection", (socket) => {
       *   const catchAllListener = (event, ...args) => {
       *     console.log(`got event ${event}`);
       *   }
       *
       *   socket.onAny(catchAllListener);
       *
       *   // remove a specific listener
       *   socket.offAny(catchAllListener);
       *
       *   // or remove all listeners
       *   socket.offAny();
       * });
       *
       * @param listener
       */
      offAny(listener) {
        if (!this._anyListeners) {
          return this;
        }
        if (listener) {
          const listeners = this._anyListeners;
          for (let i = 0; i < listeners.length; i++) {
            if (listener === listeners[i]) {
              listeners.splice(i, 1);
              return this;
            }
          }
        } else {
          this._anyListeners = [];
        }
        return this;
      }
      /**
       * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
       * e.g. to remove listeners.
       */
      listenersAny() {
        return this._anyListeners || [];
      }
      /**
       * Adds a listener that will be fired when any event is sent. The event name is passed as the first argument to
       * the callback.
       *
       * Note: acknowledgements sent to the client are not included.
       *
       * @example
       * io.on("connection", (socket) => {
       *   socket.onAnyOutgoing((event, ...args) => {
       *     console.log(`sent event ${event}`);
       *   });
       * });
       *
       * @param listener
       */
      onAnyOutgoing(listener) {
        this._anyOutgoingListeners = this._anyOutgoingListeners || [];
        this._anyOutgoingListeners.push(listener);
        return this;
      }
      /**
       * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
       * callback. The listener is added to the beginning of the listeners array.
       *
       * @example
       * io.on("connection", (socket) => {
       *   socket.prependAnyOutgoing((event, ...args) => {
       *     console.log(`sent event ${event}`);
       *   });
       * });
       *
       * @param listener
       */
      prependAnyOutgoing(listener) {
        this._anyOutgoingListeners = this._anyOutgoingListeners || [];
        this._anyOutgoingListeners.unshift(listener);
        return this;
      }
      /**
       * Removes the listener that will be fired when any event is sent.
       *
       * @example
       * io.on("connection", (socket) => {
       *   const catchAllListener = (event, ...args) => {
       *     console.log(`sent event ${event}`);
       *   }
       *
       *   socket.onAnyOutgoing(catchAllListener);
       *
       *   // remove a specific listener
       *   socket.offAnyOutgoing(catchAllListener);
       *
       *   // or remove all listeners
       *   socket.offAnyOutgoing();
       * });
       *
       * @param listener - the catch-all listener
       */
      offAnyOutgoing(listener) {
        if (!this._anyOutgoingListeners) {
          return this;
        }
        if (listener) {
          const listeners = this._anyOutgoingListeners;
          for (let i = 0; i < listeners.length; i++) {
            if (listener === listeners[i]) {
              listeners.splice(i, 1);
              return this;
            }
          }
        } else {
          this._anyOutgoingListeners = [];
        }
        return this;
      }
      /**
       * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
       * e.g. to remove listeners.
       */
      listenersAnyOutgoing() {
        return this._anyOutgoingListeners || [];
      }
      /**
       * Notify the listeners for each packet sent (emit or broadcast)
       *
       * @param packet
       *
       * @private
       */
      notifyOutgoingListeners(packet) {
        if (this._anyOutgoingListeners && this._anyOutgoingListeners.length) {
          const listeners = this._anyOutgoingListeners.slice();
          for (const listener of listeners) {
            listener.apply(this, packet.data);
          }
        }
      }
      newBroadcastOperator() {
        const flags = Object.assign({}, this.flags);
        this.flags = {};
        return new broadcast_operator_1.BroadcastOperator(this.adapter, /* @__PURE__ */ new Set(), /* @__PURE__ */ new Set([this.id]), flags);
      }
    };
    exports2.Socket = Socket;
  }
});

// node_modules/socket.io/dist/namespace.js
var require_namespace = __commonJS({
  "node_modules/socket.io/dist/namespace.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Namespace = exports2.RESERVED_EVENTS = void 0;
    var socket_1 = require_socket4();
    var typed_events_1 = require_typed_events();
    var debug_1 = __importDefault(require_src());
    var broadcast_operator_1 = require_broadcast_operator();
    var debug = (0, debug_1.default)("socket.io:namespace");
    exports2.RESERVED_EVENTS = /* @__PURE__ */ new Set(["connect", "connection", "new_namespace"]);
    var Namespace = class extends typed_events_1.StrictEventEmitter {
      /**
       * Namespace constructor.
       *
       * @param server instance
       * @param name
       */
      constructor(server, name) {
        super();
        this.sockets = /* @__PURE__ */ new Map();
        this._preConnectSockets = /* @__PURE__ */ new Map();
        this._fns = [];
        this._ids = 0;
        this.server = server;
        this.name = name;
        this._initAdapter();
      }
      /**
       * Initializes the `Adapter` for this nsp.
       * Run upon changing adapter by `Server#adapter`
       * in addition to the constructor.
       *
       * @private
       */
      _initAdapter() {
        this.adapter = new (this.server.adapter())(this);
        Promise.resolve(this.adapter.init()).catch((err) => {
          debug("error while initializing adapter: %s", err);
        });
      }
      /**
       * Registers a middleware, which is a function that gets executed for every incoming {@link Socket}.
       *
       * @example
       * const myNamespace = io.of("/my-namespace");
       *
       * myNamespace.use((socket, next) => {
       *   // ...
       *   next();
       * });
       *
       * @param fn - the middleware function
       */
      use(fn) {
        this._fns.push(fn);
        return this;
      }
      /**
       * Executes the middleware for an incoming client.
       *
       * @param socket - the socket that will get added
       * @param fn - last fn call in the middleware
       * @private
       */
      run(socket, fn) {
        if (!this._fns.length)
          return fn();
        const fns = this._fns.slice(0);
        function run(i) {
          fns[i](socket, (err) => {
            if (err)
              return fn(err);
            if (!fns[i + 1])
              return fn();
            run(i + 1);
          });
        }
        run(0);
      }
      /**
       * Targets a room when emitting.
       *
       * @example
       * const myNamespace = io.of("/my-namespace");
       *
       * // the “foo” event will be broadcast to all connected clients in the “room-101” room
       * myNamespace.to("room-101").emit("foo", "bar");
       *
       * // with an array of rooms (a client will be notified at most once)
       * myNamespace.to(["room-101", "room-102"]).emit("foo", "bar");
       *
       * // with multiple chained calls
       * myNamespace.to("room-101").to("room-102").emit("foo", "bar");
       *
       * @param room - a room, or an array of rooms
       * @return a new {@link BroadcastOperator} instance for chaining
       */
      to(room) {
        return new broadcast_operator_1.BroadcastOperator(this.adapter).to(room);
      }
      /**
       * Targets a room when emitting. Similar to `to()`, but might feel clearer in some cases:
       *
       * @example
       * const myNamespace = io.of("/my-namespace");
       *
       * // disconnect all clients in the "room-101" room
       * myNamespace.in("room-101").disconnectSockets();
       *
       * @param room - a room, or an array of rooms
       * @return a new {@link BroadcastOperator} instance for chaining
       */
      in(room) {
        return new broadcast_operator_1.BroadcastOperator(this.adapter).in(room);
      }
      /**
       * Excludes a room when emitting.
       *
       * @example
       * const myNamespace = io.of("/my-namespace");
       *
       * // the "foo" event will be broadcast to all connected clients, except the ones that are in the "room-101" room
       * myNamespace.except("room-101").emit("foo", "bar");
       *
       * // with an array of rooms
       * myNamespace.except(["room-101", "room-102"]).emit("foo", "bar");
       *
       * // with multiple chained calls
       * myNamespace.except("room-101").except("room-102").emit("foo", "bar");
       *
       * @param room - a room, or an array of rooms
       * @return a new {@link BroadcastOperator} instance for chaining
       */
      except(room) {
        return new broadcast_operator_1.BroadcastOperator(this.adapter).except(room);
      }
      /**
       * Adds a new client.
       *
       * @return {Socket}
       * @private
       */
      async _add(client, auth, fn) {
        var _a;
        debug("adding socket to nsp %s", this.name);
        const socket = await this._createSocket(client, auth);
        this._preConnectSockets.set(socket.id, socket);
        if (
          // @ts-ignore
          ((_a = this.server.opts.connectionStateRecovery) === null || _a === void 0 ? void 0 : _a.skipMiddlewares) && socket.recovered && client.conn.readyState === "open"
        ) {
          return this._doConnect(socket, fn);
        }
        this.run(socket, (err) => {
          process.nextTick(() => {
            if ("open" !== client.conn.readyState) {
              debug("next called after client was closed - ignoring socket");
              socket._cleanup();
              return;
            }
            if (err) {
              debug("middleware error, sending CONNECT_ERROR packet to the client");
              socket._cleanup();
              if (client.conn.protocol === 3) {
                return socket._error(err.data || err.message);
              } else {
                return socket._error({
                  message: err.message,
                  data: err.data
                });
              }
            }
            this._doConnect(socket, fn);
          });
        });
      }
      async _createSocket(client, auth) {
        const sessionId = auth.pid;
        const offset = auth.offset;
        if (
          // @ts-ignore
          this.server.opts.connectionStateRecovery && typeof sessionId === "string" && typeof offset === "string"
        ) {
          let session;
          try {
            session = await this.adapter.restoreSession(sessionId, offset);
          } catch (e) {
            debug("error while restoring session: %s", e);
          }
          if (session) {
            debug("connection state recovered for sid %s", session.sid);
            return new socket_1.Socket(this, client, auth, session);
          }
        }
        return new socket_1.Socket(this, client, auth);
      }
      _doConnect(socket, fn) {
        this._preConnectSockets.delete(socket.id);
        this.sockets.set(socket.id, socket);
        socket._onconnect();
        if (fn)
          fn(socket);
        this.emitReserved("connect", socket);
        this.emitReserved("connection", socket);
      }
      /**
       * Removes a client. Called by each `Socket`.
       *
       * @private
       */
      _remove(socket) {
        this.sockets.delete(socket.id) || this._preConnectSockets.delete(socket.id);
      }
      /**
       * Emits to all connected clients.
       *
       * @example
       * const myNamespace = io.of("/my-namespace");
       *
       * myNamespace.emit("hello", "world");
       *
       * // all serializable datastructures are supported (no need to call JSON.stringify)
       * myNamespace.emit("hello", 1, "2", { 3: ["4"], 5: Uint8Array.from([6]) });
       *
       * // with an acknowledgement from the clients
       * myNamespace.timeout(1000).emit("some-event", (err, responses) => {
       *   if (err) {
       *     // some clients did not acknowledge the event in the given delay
       *   } else {
       *     console.log(responses); // one response per client
       *   }
       * });
       *
       * @return Always true
       */
      emit(ev, ...args) {
        return new broadcast_operator_1.BroadcastOperator(this.adapter).emit(ev, ...args);
      }
      /**
       * Sends a `message` event to all clients.
       *
       * This method mimics the WebSocket.send() method.
       *
       * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send
       *
       * @example
       * const myNamespace = io.of("/my-namespace");
       *
       * myNamespace.send("hello");
       *
       * // this is equivalent to
       * myNamespace.emit("message", "hello");
       *
       * @return self
       */
      send(...args) {
        this.emit("message", ...args);
        return this;
      }
      /**
       * Sends a `message` event to all clients. Sends a `message` event. Alias of {@link send}.
       *
       * @return self
       */
      write(...args) {
        this.emit("message", ...args);
        return this;
      }
      /**
       * Sends a message to the other Socket.IO servers of the cluster.
       *
       * @example
       * const myNamespace = io.of("/my-namespace");
       *
       * myNamespace.serverSideEmit("hello", "world");
       *
       * myNamespace.on("hello", (arg1) => {
       *   console.log(arg1); // prints "world"
       * });
       *
       * // acknowledgements (without binary content) are supported too:
       * myNamespace.serverSideEmit("ping", (err, responses) => {
       *  if (err) {
       *     // some servers did not acknowledge the event in the given delay
       *   } else {
       *     console.log(responses); // one response per server (except the current one)
       *   }
       * });
       *
       * myNamespace.on("ping", (cb) => {
       *   cb("pong");
       * });
       *
       * @param ev - the event name
       * @param args - an array of arguments, which may include an acknowledgement callback at the end
       */
      serverSideEmit(ev, ...args) {
        if (exports2.RESERVED_EVENTS.has(ev)) {
          throw new Error(`"${String(ev)}" is a reserved event name`);
        }
        args.unshift(ev);
        this.adapter.serverSideEmit(args);
        return true;
      }
      /**
       * Sends a message and expect an acknowledgement from the other Socket.IO servers of the cluster.
       *
       * @example
       * const myNamespace = io.of("/my-namespace");
       *
       * try {
       *   const responses = await myNamespace.serverSideEmitWithAck("ping");
       *   console.log(responses); // one response per server (except the current one)
       * } catch (e) {
       *   // some servers did not acknowledge the event in the given delay
       * }
       *
       * @param ev - the event name
       * @param args - an array of arguments
       *
       * @return a Promise that will be fulfilled when all servers have acknowledged the event
       */
      serverSideEmitWithAck(ev, ...args) {
        return new Promise((resolve, reject) => {
          args.push((err, responses) => {
            if (err) {
              err.responses = responses;
              return reject(err);
            } else {
              return resolve(responses);
            }
          });
          this.serverSideEmit(ev, ...args);
        });
      }
      /**
       * Called when a packet is received from another Socket.IO server
       *
       * @param args - an array of arguments, which may include an acknowledgement callback at the end
       *
       * @private
       */
      _onServerSideEmit(args) {
        super.emitUntyped.apply(this, args);
      }
      /**
       * Gets a list of clients.
       *
       * @deprecated this method will be removed in the next major release, please use {@link Namespace#serverSideEmit} or
       * {@link Namespace#fetchSockets} instead.
       */
      allSockets() {
        return new broadcast_operator_1.BroadcastOperator(this.adapter).allSockets();
      }
      /**
       * Sets the compress flag.
       *
       * @example
       * const myNamespace = io.of("/my-namespace");
       *
       * myNamespace.compress(false).emit("hello");
       *
       * @param compress - if `true`, compresses the sending data
       * @return self
       */
      compress(compress) {
        return new broadcast_operator_1.BroadcastOperator(this.adapter).compress(compress);
      }
      /**
       * Sets a modifier for a subsequent event emission that the event data may be lost if the client is not ready to
       * receive messages (because of network slowness or other issues, or because they’re connected through long polling
       * and is in the middle of a request-response cycle).
       *
       * @example
       * const myNamespace = io.of("/my-namespace");
       *
       * myNamespace.volatile.emit("hello"); // the clients may or may not receive it
       *
       * @return self
       */
      get volatile() {
        return new broadcast_operator_1.BroadcastOperator(this.adapter).volatile;
      }
      /**
       * Sets a modifier for a subsequent event emission that the event data will only be broadcast to the current node.
       *
       * @example
       * const myNamespace = io.of("/my-namespace");
       *
       * // the “foo” event will be broadcast to all connected clients on this node
       * myNamespace.local.emit("foo", "bar");
       *
       * @return a new {@link BroadcastOperator} instance for chaining
       */
      get local() {
        return new broadcast_operator_1.BroadcastOperator(this.adapter).local;
      }
      /**
       * Adds a timeout in milliseconds for the next operation.
       *
       * @example
       * const myNamespace = io.of("/my-namespace");
       *
       * myNamespace.timeout(1000).emit("some-event", (err, responses) => {
       *   if (err) {
       *     // some clients did not acknowledge the event in the given delay
       *   } else {
       *     console.log(responses); // one response per client
       *   }
       * });
       *
       * @param timeout
       */
      timeout(timeout) {
        return new broadcast_operator_1.BroadcastOperator(this.adapter).timeout(timeout);
      }
      /**
       * Returns the matching socket instances.
       *
       * Note: this method also works within a cluster of multiple Socket.IO servers, with a compatible {@link Adapter}.
       *
       * @example
       * const myNamespace = io.of("/my-namespace");
       *
       * // return all Socket instances
       * const sockets = await myNamespace.fetchSockets();
       *
       * // return all Socket instances in the "room1" room
       * const sockets = await myNamespace.in("room1").fetchSockets();
       *
       * for (const socket of sockets) {
       *   console.log(socket.id);
       *   console.log(socket.handshake);
       *   console.log(socket.rooms);
       *   console.log(socket.data);
       *
       *   socket.emit("hello");
       *   socket.join("room1");
       *   socket.leave("room2");
       *   socket.disconnect();
       * }
       */
      fetchSockets() {
        return new broadcast_operator_1.BroadcastOperator(this.adapter).fetchSockets();
      }
      /**
       * Makes the matching socket instances join the specified rooms.
       *
       * Note: this method also works within a cluster of multiple Socket.IO servers, with a compatible {@link Adapter}.
       *
       * @example
       * const myNamespace = io.of("/my-namespace");
       *
       * // make all socket instances join the "room1" room
       * myNamespace.socketsJoin("room1");
       *
       * // make all socket instances in the "room1" room join the "room2" and "room3" rooms
       * myNamespace.in("room1").socketsJoin(["room2", "room3"]);
       *
       * @param room - a room, or an array of rooms
       */
      socketsJoin(room) {
        return new broadcast_operator_1.BroadcastOperator(this.adapter).socketsJoin(room);
      }
      /**
       * Makes the matching socket instances leave the specified rooms.
       *
       * Note: this method also works within a cluster of multiple Socket.IO servers, with a compatible {@link Adapter}.
       *
       * @example
       * const myNamespace = io.of("/my-namespace");
       *
       * // make all socket instances leave the "room1" room
       * myNamespace.socketsLeave("room1");
       *
       * // make all socket instances in the "room1" room leave the "room2" and "room3" rooms
       * myNamespace.in("room1").socketsLeave(["room2", "room3"]);
       *
       * @param room - a room, or an array of rooms
       */
      socketsLeave(room) {
        return new broadcast_operator_1.BroadcastOperator(this.adapter).socketsLeave(room);
      }
      /**
       * Makes the matching socket instances disconnect.
       *
       * Note: this method also works within a cluster of multiple Socket.IO servers, with a compatible {@link Adapter}.
       *
       * @example
       * const myNamespace = io.of("/my-namespace");
       *
       * // make all socket instances disconnect (the connections might be kept alive for other namespaces)
       * myNamespace.disconnectSockets();
       *
       * // make all socket instances in the "room1" room disconnect and close the underlying connections
       * myNamespace.in("room1").disconnectSockets(true);
       *
       * @param close - whether to close the underlying connection
       */
      disconnectSockets(close = false) {
        return new broadcast_operator_1.BroadcastOperator(this.adapter).disconnectSockets(close);
      }
    };
    exports2.Namespace = Namespace;
  }
});

// node_modules/socket.io-adapter/dist/contrib/yeast.js
var require_yeast = __commonJS({
  "node_modules/socket.io-adapter/dist/contrib/yeast.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.encode = encode;
    exports2.decode = decode;
    exports2.yeast = yeast;
    var alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_".split("");
    var length = 64;
    var map = {};
    var seed = 0;
    var i = 0;
    var prev;
    function encode(num) {
      let encoded = "";
      do {
        encoded = alphabet[num % length] + encoded;
        num = Math.floor(num / length);
      } while (num > 0);
      return encoded;
    }
    function decode(str) {
      let decoded = 0;
      for (i = 0; i < str.length; i++) {
        decoded = decoded * length + map[str.charAt(i)];
      }
      return decoded;
    }
    function yeast() {
      const now = encode(+/* @__PURE__ */ new Date());
      if (now !== prev)
        return seed = 0, prev = now;
      return now + "." + encode(seed++);
    }
    for (; i < length; i++)
      map[alphabet[i]] = i;
  }
});

// node_modules/socket.io-adapter/dist/in-memory-adapter.js
var require_in_memory_adapter = __commonJS({
  "node_modules/socket.io-adapter/dist/in-memory-adapter.js"(exports2) {
    "use strict";
    var _a;
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SessionAwareAdapter = exports2.Adapter = void 0;
    var events_1 = require("events");
    var yeast_1 = require_yeast();
    var WebSocket = require_ws();
    var canPreComputeFrame = typeof ((_a = WebSocket === null || WebSocket === void 0 ? void 0 : WebSocket.Sender) === null || _a === void 0 ? void 0 : _a.frame) === "function";
    var Adapter = class extends events_1.EventEmitter {
      /**
       * In-memory adapter constructor.
       *
       * @param nsp
       */
      constructor(nsp) {
        super();
        this.nsp = nsp;
        this.rooms = /* @__PURE__ */ new Map();
        this.sids = /* @__PURE__ */ new Map();
        this.encoder = nsp.server.encoder;
      }
      /**
       * To be overridden
       */
      init() {
      }
      /**
       * To be overridden
       */
      close() {
      }
      /**
       * Returns the number of Socket.IO servers in the cluster
       *
       * @public
       */
      serverCount() {
        return Promise.resolve(1);
      }
      /**
       * Adds a socket to a list of room.
       *
       * @param {SocketId}  id      the socket id
       * @param {Set<Room>} rooms   a set of rooms
       * @public
       */
      addAll(id, rooms) {
        if (!this.sids.has(id)) {
          this.sids.set(id, /* @__PURE__ */ new Set());
        }
        for (const room of rooms) {
          this.sids.get(id).add(room);
          if (!this.rooms.has(room)) {
            this.rooms.set(room, /* @__PURE__ */ new Set());
            this.emit("create-room", room);
          }
          if (!this.rooms.get(room).has(id)) {
            this.rooms.get(room).add(id);
            this.emit("join-room", room, id);
          }
        }
      }
      /**
       * Removes a socket from a room.
       *
       * @param {SocketId} id     the socket id
       * @param {Room}     room   the room name
       */
      del(id, room) {
        if (this.sids.has(id)) {
          this.sids.get(id).delete(room);
        }
        this._del(room, id);
      }
      _del(room, id) {
        const _room = this.rooms.get(room);
        if (_room != null) {
          const deleted = _room.delete(id);
          if (deleted) {
            this.emit("leave-room", room, id);
          }
          if (_room.size === 0 && this.rooms.delete(room)) {
            this.emit("delete-room", room);
          }
        }
      }
      /**
       * Removes a socket from all rooms it's joined.
       *
       * @param {SocketId} id   the socket id
       */
      delAll(id) {
        if (!this.sids.has(id)) {
          return;
        }
        for (const room of this.sids.get(id)) {
          this._del(room, id);
        }
        this.sids.delete(id);
      }
      /**
       * Broadcasts a packet.
       *
       * Options:
       *  - `flags` {Object} flags for this packet
       *  - `except` {Array} sids that should be excluded
       *  - `rooms` {Array} list of rooms to broadcast to
       *
       * @param {Object} packet   the packet object
       * @param {Object} opts     the options
       * @public
       */
      broadcast(packet, opts) {
        const flags = opts.flags || {};
        const packetOpts = {
          preEncoded: true,
          volatile: flags.volatile,
          compress: flags.compress
        };
        packet.nsp = this.nsp.name;
        const encodedPackets = this._encode(packet, packetOpts);
        this.apply(opts, (socket) => {
          if (typeof socket.notifyOutgoingListeners === "function") {
            socket.notifyOutgoingListeners(packet);
          }
          socket.client.writeToEngine(encodedPackets, packetOpts);
        });
      }
      /**
       * Broadcasts a packet and expects multiple acknowledgements.
       *
       * Options:
       *  - `flags` {Object} flags for this packet
       *  - `except` {Array} sids that should be excluded
       *  - `rooms` {Array} list of rooms to broadcast to
       *
       * @param {Object} packet   the packet object
       * @param {Object} opts     the options
       * @param clientCountCallback - the number of clients that received the packet
       * @param ack                 - the callback that will be called for each client response
       *
       * @public
       */
      broadcastWithAck(packet, opts, clientCountCallback, ack) {
        const flags = opts.flags || {};
        const packetOpts = {
          preEncoded: true,
          volatile: flags.volatile,
          compress: flags.compress
        };
        packet.nsp = this.nsp.name;
        packet.id = this.nsp._ids++;
        const encodedPackets = this._encode(packet, packetOpts);
        let clientCount = 0;
        this.apply(opts, (socket) => {
          clientCount++;
          socket.acks.set(packet.id, ack);
          if (typeof socket.notifyOutgoingListeners === "function") {
            socket.notifyOutgoingListeners(packet);
          }
          socket.client.writeToEngine(encodedPackets, packetOpts);
        });
        clientCountCallback(clientCount);
      }
      _encode(packet, packetOpts) {
        const encodedPackets = this.encoder.encode(packet);
        if (canPreComputeFrame && encodedPackets.length === 1 && typeof encodedPackets[0] === "string") {
          const data = Buffer.from("4" + encodedPackets[0]);
          packetOpts.wsPreEncodedFrame = WebSocket.Sender.frame(data, {
            readOnly: false,
            mask: false,
            rsv1: false,
            opcode: 1,
            fin: true
          });
        }
        return encodedPackets;
      }
      /**
       * Gets a list of sockets by sid.
       *
       * @param {Set<Room>} rooms   the explicit set of rooms to check.
       */
      sockets(rooms) {
        const sids = /* @__PURE__ */ new Set();
        this.apply({ rooms }, (socket) => {
          sids.add(socket.id);
        });
        return Promise.resolve(sids);
      }
      /**
       * Gets the list of rooms a given socket has joined.
       *
       * @param {SocketId} id   the socket id
       */
      socketRooms(id) {
        return this.sids.get(id);
      }
      /**
       * Returns the matching socket instances
       *
       * @param opts - the filters to apply
       */
      fetchSockets(opts) {
        const sockets = [];
        this.apply(opts, (socket) => {
          sockets.push(socket);
        });
        return Promise.resolve(sockets);
      }
      /**
       * Makes the matching socket instances join the specified rooms
       *
       * @param opts - the filters to apply
       * @param rooms - the rooms to join
       */
      addSockets(opts, rooms) {
        this.apply(opts, (socket) => {
          socket.join(rooms);
        });
      }
      /**
       * Makes the matching socket instances leave the specified rooms
       *
       * @param opts - the filters to apply
       * @param rooms - the rooms to leave
       */
      delSockets(opts, rooms) {
        this.apply(opts, (socket) => {
          rooms.forEach((room) => socket.leave(room));
        });
      }
      /**
       * Makes the matching socket instances disconnect
       *
       * @param opts - the filters to apply
       * @param close - whether to close the underlying connection
       */
      disconnectSockets(opts, close) {
        this.apply(opts, (socket) => {
          socket.disconnect(close);
        });
      }
      apply(opts, callback) {
        const rooms = opts.rooms;
        const except = this.computeExceptSids(opts.except);
        if (rooms.size) {
          const ids = /* @__PURE__ */ new Set();
          for (const room of rooms) {
            if (!this.rooms.has(room))
              continue;
            for (const id of this.rooms.get(room)) {
              if (ids.has(id) || except.has(id))
                continue;
              const socket = this.nsp.sockets.get(id);
              if (socket) {
                callback(socket);
                ids.add(id);
              }
            }
          }
        } else {
          for (const [id] of this.sids) {
            if (except.has(id))
              continue;
            const socket = this.nsp.sockets.get(id);
            if (socket)
              callback(socket);
          }
        }
      }
      computeExceptSids(exceptRooms) {
        const exceptSids = /* @__PURE__ */ new Set();
        if (exceptRooms && exceptRooms.size > 0) {
          for (const room of exceptRooms) {
            if (this.rooms.has(room)) {
              this.rooms.get(room).forEach((sid) => exceptSids.add(sid));
            }
          }
        }
        return exceptSids;
      }
      /**
       * Send a packet to the other Socket.IO servers in the cluster
       * @param packet - an array of arguments, which may include an acknowledgement callback at the end
       */
      serverSideEmit(packet) {
        console.warn("this adapter does not support the serverSideEmit() functionality");
      }
      /**
       * Save the client session in order to restore it upon reconnection.
       */
      persistSession(session) {
      }
      /**
       * Restore the session and find the packets that were missed by the client.
       * @param pid
       * @param offset
       */
      restoreSession(pid, offset) {
        return null;
      }
    };
    exports2.Adapter = Adapter;
    var SessionAwareAdapter = class extends Adapter {
      constructor(nsp) {
        super(nsp);
        this.nsp = nsp;
        this.sessions = /* @__PURE__ */ new Map();
        this.packets = [];
        this.maxDisconnectionDuration = nsp.server.opts.connectionStateRecovery.maxDisconnectionDuration;
        const timer = setInterval(() => {
          const threshold = Date.now() - this.maxDisconnectionDuration;
          this.sessions.forEach((session, sessionId) => {
            const hasExpired = session.disconnectedAt < threshold;
            if (hasExpired) {
              this.sessions.delete(sessionId);
            }
          });
          for (let i = this.packets.length - 1; i >= 0; i--) {
            const hasExpired = this.packets[i].emittedAt < threshold;
            if (hasExpired) {
              this.packets.splice(0, i + 1);
              break;
            }
          }
        }, 60 * 1e3);
        timer.unref();
      }
      persistSession(session) {
        session.disconnectedAt = Date.now();
        this.sessions.set(session.pid, session);
      }
      restoreSession(pid, offset) {
        const session = this.sessions.get(pid);
        if (!session) {
          return null;
        }
        const hasExpired = session.disconnectedAt + this.maxDisconnectionDuration < Date.now();
        if (hasExpired) {
          this.sessions.delete(pid);
          return null;
        }
        const index = this.packets.findIndex((packet) => packet.id === offset);
        if (index === -1) {
          return null;
        }
        const missedPackets = [];
        for (let i = index + 1; i < this.packets.length; i++) {
          const packet = this.packets[i];
          if (shouldIncludePacket(session.rooms, packet.opts)) {
            missedPackets.push(packet.data);
          }
        }
        return Promise.resolve(Object.assign(Object.assign({}, session), { missedPackets }));
      }
      broadcast(packet, opts) {
        var _a2;
        const isEventPacket = packet.type === 2;
        const withoutAcknowledgement = packet.id === void 0;
        const notVolatile = ((_a2 = opts.flags) === null || _a2 === void 0 ? void 0 : _a2.volatile) === void 0;
        if (isEventPacket && withoutAcknowledgement && notVolatile) {
          const id = (0, yeast_1.yeast)();
          packet.data.push(id);
          this.packets.push({
            id,
            opts,
            data: packet.data,
            emittedAt: Date.now()
          });
        }
        super.broadcast(packet, opts);
      }
    };
    exports2.SessionAwareAdapter = SessionAwareAdapter;
    function shouldIncludePacket(sessionRooms, opts) {
      const included = opts.rooms.size === 0 || sessionRooms.some((room) => opts.rooms.has(room));
      const notExcluded = sessionRooms.every((room) => !opts.except.has(room));
      return included && notExcluded;
    }
  }
});

// node_modules/socket.io-adapter/dist/cluster-adapter.js
var require_cluster_adapter = __commonJS({
  "node_modules/socket.io-adapter/dist/cluster-adapter.js"(exports2) {
    "use strict";
    var __rest = exports2 && exports2.__rest || function(s, e) {
      var t = {};
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
      if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
          if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
            t[p[i]] = s[p[i]];
        }
      return t;
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ClusterAdapterWithHeartbeat = exports2.ClusterAdapter = exports2.MessageType = void 0;
    var in_memory_adapter_1 = require_in_memory_adapter();
    var debug_1 = require_src();
    var crypto_1 = require("crypto");
    var debug = (0, debug_1.debug)("socket.io-adapter");
    var EMITTER_UID = "emitter";
    var DEFAULT_TIMEOUT = 5e3;
    function randomId() {
      return (0, crypto_1.randomBytes)(8).toString("hex");
    }
    var MessageType;
    (function(MessageType2) {
      MessageType2[MessageType2["INITIAL_HEARTBEAT"] = 1] = "INITIAL_HEARTBEAT";
      MessageType2[MessageType2["HEARTBEAT"] = 2] = "HEARTBEAT";
      MessageType2[MessageType2["BROADCAST"] = 3] = "BROADCAST";
      MessageType2[MessageType2["SOCKETS_JOIN"] = 4] = "SOCKETS_JOIN";
      MessageType2[MessageType2["SOCKETS_LEAVE"] = 5] = "SOCKETS_LEAVE";
      MessageType2[MessageType2["DISCONNECT_SOCKETS"] = 6] = "DISCONNECT_SOCKETS";
      MessageType2[MessageType2["FETCH_SOCKETS"] = 7] = "FETCH_SOCKETS";
      MessageType2[MessageType2["FETCH_SOCKETS_RESPONSE"] = 8] = "FETCH_SOCKETS_RESPONSE";
      MessageType2[MessageType2["SERVER_SIDE_EMIT"] = 9] = "SERVER_SIDE_EMIT";
      MessageType2[MessageType2["SERVER_SIDE_EMIT_RESPONSE"] = 10] = "SERVER_SIDE_EMIT_RESPONSE";
      MessageType2[MessageType2["BROADCAST_CLIENT_COUNT"] = 11] = "BROADCAST_CLIENT_COUNT";
      MessageType2[MessageType2["BROADCAST_ACK"] = 12] = "BROADCAST_ACK";
      MessageType2[MessageType2["ADAPTER_CLOSE"] = 13] = "ADAPTER_CLOSE";
    })(MessageType || (exports2.MessageType = MessageType = {}));
    function encodeOptions(opts) {
      return {
        rooms: [...opts.rooms],
        except: [...opts.except],
        flags: opts.flags
      };
    }
    function decodeOptions(opts) {
      return {
        rooms: new Set(opts.rooms),
        except: new Set(opts.except),
        flags: opts.flags
      };
    }
    var ClusterAdapter = class extends in_memory_adapter_1.Adapter {
      constructor(nsp) {
        super(nsp);
        this.requests = /* @__PURE__ */ new Map();
        this.ackRequests = /* @__PURE__ */ new Map();
        this.uid = randomId();
      }
      /**
       * Called when receiving a message from another member of the cluster.
       *
       * @param message
       * @param offset
       * @protected
       */
      onMessage(message, offset) {
        if (message.uid === this.uid) {
          return debug("[%s] ignore message from self", this.uid);
        }
        if (message.nsp !== this.nsp.name) {
          return debug("[%s] ignore message from another namespace (%s)", this.uid, message.nsp);
        }
        debug("[%s] new event of type %d from %s", this.uid, message.type, message.uid);
        switch (message.type) {
          case MessageType.BROADCAST: {
            const withAck = message.data.requestId !== void 0;
            if (withAck) {
              super.broadcastWithAck(message.data.packet, decodeOptions(message.data.opts), (clientCount) => {
                debug("[%s] waiting for %d client acknowledgements", this.uid, clientCount);
                this.publishResponse(message.uid, {
                  type: MessageType.BROADCAST_CLIENT_COUNT,
                  data: {
                    requestId: message.data.requestId,
                    clientCount
                  }
                });
              }, (arg) => {
                debug("[%s] received acknowledgement with value %j", this.uid, arg);
                this.publishResponse(message.uid, {
                  type: MessageType.BROADCAST_ACK,
                  data: {
                    requestId: message.data.requestId,
                    packet: arg
                  }
                });
              });
            } else {
              const packet = message.data.packet;
              const opts = decodeOptions(message.data.opts);
              this.addOffsetIfNecessary(packet, opts, offset);
              super.broadcast(packet, opts);
            }
            break;
          }
          case MessageType.SOCKETS_JOIN:
            super.addSockets(decodeOptions(message.data.opts), message.data.rooms);
            break;
          case MessageType.SOCKETS_LEAVE:
            super.delSockets(decodeOptions(message.data.opts), message.data.rooms);
            break;
          case MessageType.DISCONNECT_SOCKETS:
            super.disconnectSockets(decodeOptions(message.data.opts), message.data.close);
            break;
          case MessageType.FETCH_SOCKETS: {
            debug("[%s] calling fetchSockets with opts %j", this.uid, message.data.opts);
            super.fetchSockets(decodeOptions(message.data.opts)).then((localSockets) => {
              this.publishResponse(message.uid, {
                type: MessageType.FETCH_SOCKETS_RESPONSE,
                data: {
                  requestId: message.data.requestId,
                  sockets: localSockets.map((socket) => {
                    const _a = socket.handshake, { sessionStore } = _a, handshake = __rest(_a, ["sessionStore"]);
                    return {
                      id: socket.id,
                      handshake,
                      rooms: [...socket.rooms],
                      data: socket.data
                    };
                  })
                }
              });
            });
            break;
          }
          case MessageType.SERVER_SIDE_EMIT: {
            const packet = message.data.packet;
            const withAck = message.data.requestId !== void 0;
            if (!withAck) {
              this.nsp._onServerSideEmit(packet);
              return;
            }
            let called = false;
            const callback = (arg) => {
              if (called) {
                return;
              }
              called = true;
              debug("[%s] calling acknowledgement with %j", this.uid, arg);
              this.publishResponse(message.uid, {
                type: MessageType.SERVER_SIDE_EMIT_RESPONSE,
                data: {
                  requestId: message.data.requestId,
                  packet: arg
                }
              });
            };
            this.nsp._onServerSideEmit([...packet, callback]);
            break;
          }
          // @ts-ignore
          case MessageType.BROADCAST_CLIENT_COUNT:
          // @ts-ignore
          case MessageType.BROADCAST_ACK:
          // @ts-ignore
          case MessageType.FETCH_SOCKETS_RESPONSE:
          // @ts-ignore
          case MessageType.SERVER_SIDE_EMIT_RESPONSE:
            this.onResponse(message);
            break;
          default:
            debug("[%s] unknown message type: %s", this.uid, message.type);
        }
      }
      /**
       * Called when receiving a response from another member of the cluster.
       *
       * @param response
       * @protected
       */
      onResponse(response) {
        var _a, _b;
        const requestId = response.data.requestId;
        debug("[%s] received response %s to request %s", this.uid, response.type, requestId);
        switch (response.type) {
          case MessageType.BROADCAST_CLIENT_COUNT: {
            (_a = this.ackRequests.get(requestId)) === null || _a === void 0 ? void 0 : _a.clientCountCallback(response.data.clientCount);
            break;
          }
          case MessageType.BROADCAST_ACK: {
            (_b = this.ackRequests.get(requestId)) === null || _b === void 0 ? void 0 : _b.ack(response.data.packet);
            break;
          }
          case MessageType.FETCH_SOCKETS_RESPONSE: {
            const request = this.requests.get(requestId);
            if (!request) {
              return;
            }
            request.current++;
            response.data.sockets.forEach((socket) => request.responses.push(socket));
            if (request.current === request.expected) {
              clearTimeout(request.timeout);
              request.resolve(request.responses);
              this.requests.delete(requestId);
            }
            break;
          }
          case MessageType.SERVER_SIDE_EMIT_RESPONSE: {
            const request = this.requests.get(requestId);
            if (!request) {
              return;
            }
            request.current++;
            request.responses.push(response.data.packet);
            if (request.current === request.expected) {
              clearTimeout(request.timeout);
              request.resolve(null, request.responses);
              this.requests.delete(requestId);
            }
            break;
          }
          default:
            debug("[%s] unknown response type: %s", this.uid, response.type);
        }
      }
      async broadcast(packet, opts) {
        var _a;
        const onlyLocal = (_a = opts.flags) === null || _a === void 0 ? void 0 : _a.local;
        if (!onlyLocal) {
          try {
            const offset = await this.publishAndReturnOffset({
              type: MessageType.BROADCAST,
              data: {
                packet,
                opts: encodeOptions(opts)
              }
            });
            this.addOffsetIfNecessary(packet, opts, offset);
          } catch (e) {
            return debug("[%s] error while broadcasting message: %s", this.uid, e.message);
          }
        }
        super.broadcast(packet, opts);
      }
      /**
       * Adds an offset at the end of the data array in order to allow the client to receive any missed packets when it
       * reconnects after a temporary disconnection.
       *
       * @param packet
       * @param opts
       * @param offset
       * @private
       */
      addOffsetIfNecessary(packet, opts, offset) {
        var _a;
        if (!this.nsp.server.opts.connectionStateRecovery) {
          return;
        }
        const isEventPacket = packet.type === 2;
        const withoutAcknowledgement = packet.id === void 0;
        const notVolatile = ((_a = opts.flags) === null || _a === void 0 ? void 0 : _a.volatile) === void 0;
        if (isEventPacket && withoutAcknowledgement && notVolatile) {
          packet.data.push(offset);
        }
      }
      broadcastWithAck(packet, opts, clientCountCallback, ack) {
        var _a;
        const onlyLocal = (_a = opts === null || opts === void 0 ? void 0 : opts.flags) === null || _a === void 0 ? void 0 : _a.local;
        if (!onlyLocal) {
          const requestId = randomId();
          this.ackRequests.set(requestId, {
            clientCountCallback,
            ack
          });
          this.publish({
            type: MessageType.BROADCAST,
            data: {
              packet,
              requestId,
              opts: encodeOptions(opts)
            }
          });
          setTimeout(() => {
            this.ackRequests.delete(requestId);
          }, opts.flags.timeout);
        }
        super.broadcastWithAck(packet, opts, clientCountCallback, ack);
      }
      async addSockets(opts, rooms) {
        var _a;
        const onlyLocal = (_a = opts.flags) === null || _a === void 0 ? void 0 : _a.local;
        if (!onlyLocal) {
          try {
            await this.publishAndReturnOffset({
              type: MessageType.SOCKETS_JOIN,
              data: {
                opts: encodeOptions(opts),
                rooms
              }
            });
          } catch (e) {
            debug("[%s] error while publishing message: %s", this.uid, e.message);
          }
        }
        super.addSockets(opts, rooms);
      }
      async delSockets(opts, rooms) {
        var _a;
        const onlyLocal = (_a = opts.flags) === null || _a === void 0 ? void 0 : _a.local;
        if (!onlyLocal) {
          try {
            await this.publishAndReturnOffset({
              type: MessageType.SOCKETS_LEAVE,
              data: {
                opts: encodeOptions(opts),
                rooms
              }
            });
          } catch (e) {
            debug("[%s] error while publishing message: %s", this.uid, e.message);
          }
        }
        super.delSockets(opts, rooms);
      }
      async disconnectSockets(opts, close) {
        var _a;
        const onlyLocal = (_a = opts.flags) === null || _a === void 0 ? void 0 : _a.local;
        if (!onlyLocal) {
          try {
            await this.publishAndReturnOffset({
              type: MessageType.DISCONNECT_SOCKETS,
              data: {
                opts: encodeOptions(opts),
                close
              }
            });
          } catch (e) {
            debug("[%s] error while publishing message: %s", this.uid, e.message);
          }
        }
        super.disconnectSockets(opts, close);
      }
      async fetchSockets(opts) {
        var _a;
        const [localSockets, serverCount] = await Promise.all([
          super.fetchSockets(opts),
          this.serverCount()
        ]);
        const expectedResponseCount = serverCount - 1;
        if (((_a = opts.flags) === null || _a === void 0 ? void 0 : _a.local) || expectedResponseCount <= 0) {
          return localSockets;
        }
        const requestId = randomId();
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            const storedRequest2 = this.requests.get(requestId);
            if (storedRequest2) {
              reject(new Error(`timeout reached: only ${storedRequest2.current} responses received out of ${storedRequest2.expected}`));
              this.requests.delete(requestId);
            }
          }, opts.flags.timeout || DEFAULT_TIMEOUT);
          const storedRequest = {
            type: MessageType.FETCH_SOCKETS,
            resolve,
            timeout,
            current: 0,
            expected: expectedResponseCount,
            responses: localSockets
          };
          this.requests.set(requestId, storedRequest);
          this.publish({
            type: MessageType.FETCH_SOCKETS,
            data: {
              opts: encodeOptions(opts),
              requestId
            }
          });
        });
      }
      async serverSideEmit(packet) {
        const withAck = typeof packet[packet.length - 1] === "function";
        if (!withAck) {
          return this.publish({
            type: MessageType.SERVER_SIDE_EMIT,
            data: {
              packet
            }
          });
        }
        const ack = packet.pop();
        const expectedResponseCount = await this.serverCount() - 1;
        debug('[%s] waiting for %d responses to "serverSideEmit" request', this.uid, expectedResponseCount);
        if (expectedResponseCount <= 0) {
          return ack(null, []);
        }
        const requestId = randomId();
        const timeout = setTimeout(() => {
          const storedRequest2 = this.requests.get(requestId);
          if (storedRequest2) {
            ack(new Error(`timeout reached: only ${storedRequest2.current} responses received out of ${storedRequest2.expected}`), storedRequest2.responses);
            this.requests.delete(requestId);
          }
        }, DEFAULT_TIMEOUT);
        const storedRequest = {
          type: MessageType.SERVER_SIDE_EMIT,
          resolve: ack,
          timeout,
          current: 0,
          expected: expectedResponseCount,
          responses: []
        };
        this.requests.set(requestId, storedRequest);
        this.publish({
          type: MessageType.SERVER_SIDE_EMIT,
          data: {
            requestId,
            // the presence of this attribute defines whether an acknowledgement is needed
            packet
          }
        });
      }
      publish(message) {
        debug("[%s] sending message %s", this.uid, message.type);
        this.publishAndReturnOffset(message).catch((err) => {
          debug("[%s] error while publishing message: %s", this.uid, err);
        });
      }
      publishAndReturnOffset(message) {
        message.uid = this.uid;
        message.nsp = this.nsp.name;
        return this.doPublish(message);
      }
      publishResponse(requesterUid, response) {
        response.uid = this.uid;
        response.nsp = this.nsp.name;
        debug("[%s] sending response %s to %s", this.uid, response.type, requesterUid);
        this.doPublishResponse(requesterUid, response).catch((err) => {
          debug("[%s] error while publishing response: %s", this.uid, err);
        });
      }
    };
    exports2.ClusterAdapter = ClusterAdapter;
    var ClusterAdapterWithHeartbeat = class extends ClusterAdapter {
      constructor(nsp, opts) {
        super(nsp);
        this.nodesMap = /* @__PURE__ */ new Map();
        this.customRequests = /* @__PURE__ */ new Map();
        this._opts = Object.assign({
          heartbeatInterval: 5e3,
          heartbeatTimeout: 1e4
        }, opts);
        this.cleanupTimer = setInterval(() => {
          const now = Date.now();
          this.nodesMap.forEach((lastSeen, uid) => {
            const nodeSeemsDown = now - lastSeen > this._opts.heartbeatTimeout;
            if (nodeSeemsDown) {
              debug("[%s] node %s seems down", this.uid, uid);
              this.removeNode(uid);
            }
          });
        }, 1e3);
      }
      init() {
        this.publish({
          type: MessageType.INITIAL_HEARTBEAT
        });
      }
      scheduleHeartbeat() {
        if (this.heartbeatTimer) {
          this.heartbeatTimer.refresh();
        } else {
          this.heartbeatTimer = setTimeout(() => {
            this.publish({
              type: MessageType.HEARTBEAT
            });
          }, this._opts.heartbeatInterval);
        }
      }
      close() {
        this.publish({
          type: MessageType.ADAPTER_CLOSE
        });
        clearTimeout(this.heartbeatTimer);
        if (this.cleanupTimer) {
          clearInterval(this.cleanupTimer);
        }
      }
      onMessage(message, offset) {
        if (message.uid === this.uid) {
          return debug("[%s] ignore message from self", this.uid);
        }
        if (message.uid && message.uid !== EMITTER_UID) {
          this.nodesMap.set(message.uid, Date.now());
        }
        switch (message.type) {
          case MessageType.INITIAL_HEARTBEAT:
            this.publish({
              type: MessageType.HEARTBEAT
            });
            break;
          case MessageType.HEARTBEAT:
            break;
          case MessageType.ADAPTER_CLOSE:
            this.removeNode(message.uid);
            break;
          default:
            super.onMessage(message, offset);
        }
      }
      serverCount() {
        return Promise.resolve(1 + this.nodesMap.size);
      }
      publish(message) {
        this.scheduleHeartbeat();
        return super.publish(message);
      }
      async serverSideEmit(packet) {
        const withAck = typeof packet[packet.length - 1] === "function";
        if (!withAck) {
          return this.publish({
            type: MessageType.SERVER_SIDE_EMIT,
            data: {
              packet
            }
          });
        }
        const ack = packet.pop();
        const expectedResponseCount = this.nodesMap.size;
        debug('[%s] waiting for %d responses to "serverSideEmit" request', this.uid, expectedResponseCount);
        if (expectedResponseCount <= 0) {
          return ack(null, []);
        }
        const requestId = randomId();
        const timeout = setTimeout(() => {
          const storedRequest2 = this.customRequests.get(requestId);
          if (storedRequest2) {
            ack(new Error(`timeout reached: missing ${storedRequest2.missingUids.size} responses`), storedRequest2.responses);
            this.customRequests.delete(requestId);
          }
        }, DEFAULT_TIMEOUT);
        const storedRequest = {
          type: MessageType.SERVER_SIDE_EMIT,
          resolve: ack,
          timeout,
          missingUids: /* @__PURE__ */ new Set([...this.nodesMap.keys()]),
          responses: []
        };
        this.customRequests.set(requestId, storedRequest);
        this.publish({
          type: MessageType.SERVER_SIDE_EMIT,
          data: {
            requestId,
            // the presence of this attribute defines whether an acknowledgement is needed
            packet
          }
        });
      }
      async fetchSockets(opts) {
        var _a;
        const [localSockets, serverCount] = await Promise.all([
          super.fetchSockets({
            rooms: opts.rooms,
            except: opts.except,
            flags: {
              local: true
            }
          }),
          this.serverCount()
        ]);
        const expectedResponseCount = serverCount - 1;
        if (((_a = opts.flags) === null || _a === void 0 ? void 0 : _a.local) || expectedResponseCount <= 0) {
          return localSockets;
        }
        const requestId = randomId();
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            const storedRequest2 = this.customRequests.get(requestId);
            if (storedRequest2) {
              reject(new Error(`timeout reached: missing ${storedRequest2.missingUids.size} responses`));
              this.customRequests.delete(requestId);
            }
          }, opts.flags.timeout || DEFAULT_TIMEOUT);
          const storedRequest = {
            type: MessageType.FETCH_SOCKETS,
            resolve,
            timeout,
            missingUids: /* @__PURE__ */ new Set([...this.nodesMap.keys()]),
            responses: localSockets
          };
          this.customRequests.set(requestId, storedRequest);
          this.publish({
            type: MessageType.FETCH_SOCKETS,
            data: {
              opts: encodeOptions(opts),
              requestId
            }
          });
        });
      }
      onResponse(response) {
        const requestId = response.data.requestId;
        debug("[%s] received response %s to request %s", this.uid, response.type, requestId);
        switch (response.type) {
          case MessageType.FETCH_SOCKETS_RESPONSE: {
            const request = this.customRequests.get(requestId);
            if (!request) {
              return;
            }
            response.data.sockets.forEach((socket) => request.responses.push(socket));
            request.missingUids.delete(response.uid);
            if (request.missingUids.size === 0) {
              clearTimeout(request.timeout);
              request.resolve(request.responses);
              this.customRequests.delete(requestId);
            }
            break;
          }
          case MessageType.SERVER_SIDE_EMIT_RESPONSE: {
            const request = this.customRequests.get(requestId);
            if (!request) {
              return;
            }
            request.responses.push(response.data.packet);
            request.missingUids.delete(response.uid);
            if (request.missingUids.size === 0) {
              clearTimeout(request.timeout);
              request.resolve(null, request.responses);
              this.customRequests.delete(requestId);
            }
            break;
          }
          default:
            super.onResponse(response);
        }
      }
      removeNode(uid) {
        this.customRequests.forEach((request, requestId) => {
          request.missingUids.delete(uid);
          if (request.missingUids.size === 0) {
            clearTimeout(request.timeout);
            if (request.type === MessageType.FETCH_SOCKETS) {
              request.resolve(request.responses);
            } else if (request.type === MessageType.SERVER_SIDE_EMIT) {
              request.resolve(null, request.responses);
            }
            this.customRequests.delete(requestId);
          }
        });
        this.nodesMap.delete(uid);
      }
    };
    exports2.ClusterAdapterWithHeartbeat = ClusterAdapterWithHeartbeat;
  }
});

// node_modules/socket.io-adapter/dist/index.js
var require_dist = __commonJS({
  "node_modules/socket.io-adapter/dist/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MessageType = exports2.ClusterAdapterWithHeartbeat = exports2.ClusterAdapter = exports2.SessionAwareAdapter = exports2.Adapter = void 0;
    var in_memory_adapter_1 = require_in_memory_adapter();
    Object.defineProperty(exports2, "Adapter", { enumerable: true, get: function() {
      return in_memory_adapter_1.Adapter;
    } });
    Object.defineProperty(exports2, "SessionAwareAdapter", { enumerable: true, get: function() {
      return in_memory_adapter_1.SessionAwareAdapter;
    } });
    var cluster_adapter_1 = require_cluster_adapter();
    Object.defineProperty(exports2, "ClusterAdapter", { enumerable: true, get: function() {
      return cluster_adapter_1.ClusterAdapter;
    } });
    Object.defineProperty(exports2, "ClusterAdapterWithHeartbeat", { enumerable: true, get: function() {
      return cluster_adapter_1.ClusterAdapterWithHeartbeat;
    } });
    Object.defineProperty(exports2, "MessageType", { enumerable: true, get: function() {
      return cluster_adapter_1.MessageType;
    } });
  }
});

// node_modules/socket.io/dist/parent-namespace.js
var require_parent_namespace = __commonJS({
  "node_modules/socket.io/dist/parent-namespace.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ParentNamespace = void 0;
    var namespace_1 = require_namespace();
    var socket_io_adapter_1 = require_dist();
    var debug_1 = __importDefault(require_src());
    var debug = (0, debug_1.default)("socket.io:parent-namespace");
    var ParentNamespace = class _ParentNamespace extends namespace_1.Namespace {
      constructor(server) {
        super(server, "/_" + _ParentNamespace.count++);
        this.children = /* @__PURE__ */ new Set();
      }
      /**
       * @private
       */
      _initAdapter() {
        this.adapter = new ParentBroadcastAdapter(this);
      }
      emit(ev, ...args) {
        this.children.forEach((nsp) => {
          nsp.emit(ev, ...args);
        });
        return true;
      }
      createChild(name) {
        debug("creating child namespace %s", name);
        const namespace = new namespace_1.Namespace(this.server, name);
        this["_fns"].forEach((fn) => namespace.use(fn));
        this.listeners("connect").forEach((listener) => namespace.on("connect", listener));
        this.listeners("connection").forEach((listener) => namespace.on("connection", listener));
        this.children.add(namespace);
        if (this.server._opts.cleanupEmptyChildNamespaces) {
          const remove = namespace._remove;
          namespace._remove = (socket) => {
            remove.call(namespace, socket);
            if (namespace.sockets.size === 0) {
              debug("closing child namespace %s", name);
              namespace.adapter.close();
              this.server._nsps.delete(namespace.name);
              this.children.delete(namespace);
            }
          };
        }
        this.server._nsps.set(name, namespace);
        this.server.sockets.emitReserved("new_namespace", namespace);
        return namespace;
      }
      fetchSockets() {
        throw new Error("fetchSockets() is not supported on parent namespaces");
      }
    };
    exports2.ParentNamespace = ParentNamespace;
    ParentNamespace.count = 0;
    var ParentBroadcastAdapter = class extends socket_io_adapter_1.Adapter {
      broadcast(packet, opts) {
        this.nsp.children.forEach((nsp) => {
          nsp.adapter.broadcast(packet, opts);
        });
      }
    };
  }
});

// node_modules/socket.io/dist/uws.js
var require_uws = __commonJS({
  "node_modules/socket.io/dist/uws.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.patchAdapter = patchAdapter;
    exports2.restoreAdapter = restoreAdapter;
    exports2.serveFile = serveFile;
    var socket_io_adapter_1 = require_dist();
    var fs_1 = require("fs");
    var debug_1 = __importDefault(require_src());
    var debug = (0, debug_1.default)("socket.io:adapter-uws");
    var SEPARATOR = "";
    var { addAll, del, broadcast } = socket_io_adapter_1.Adapter.prototype;
    function patchAdapter(app2) {
      socket_io_adapter_1.Adapter.prototype.addAll = function(id, rooms) {
        const isNew = !this.sids.has(id);
        addAll.call(this, id, rooms);
        const socket = this.nsp.sockets.get(id) || this.nsp._preConnectSockets.get(id);
        if (!socket) {
          return;
        }
        if (socket.conn.transport.name === "websocket") {
          subscribe(this.nsp.name, socket, isNew, rooms);
          return;
        }
        if (isNew) {
          socket.conn.on("upgrade", () => {
            const rooms2 = this.sids.get(id);
            if (rooms2) {
              subscribe(this.nsp.name, socket, isNew, rooms2);
            }
          });
        }
      };
      socket_io_adapter_1.Adapter.prototype.del = function(id, room) {
        del.call(this, id, room);
        const socket = this.nsp.sockets.get(id) || this.nsp._preConnectSockets.get(id);
        if (socket && socket.conn.transport.name === "websocket") {
          const sessionId = socket.conn.id;
          const websocket = socket.conn.transport.socket;
          const topic = `${this.nsp.name}${SEPARATOR}${room}`;
          debug("unsubscribe connection %s from topic %s", sessionId, topic);
          websocket.unsubscribe(topic);
        }
      };
      socket_io_adapter_1.Adapter.prototype.broadcast = function(packet, opts) {
        const useFastPublish = opts.rooms.size <= 1 && opts.except.size === 0;
        if (!useFastPublish) {
          broadcast.call(this, packet, opts);
          return;
        }
        const flags = opts.flags || {};
        const basePacketOpts = {
          preEncoded: true,
          volatile: flags.volatile,
          compress: flags.compress
        };
        packet.nsp = this.nsp.name;
        const encodedPackets = this.encoder.encode(packet);
        const topic = opts.rooms.size === 0 ? this.nsp.name : `${this.nsp.name}${SEPARATOR}${opts.rooms.keys().next().value}`;
        debug("fast publish to %s", topic);
        encodedPackets.forEach((encodedPacket) => {
          const isBinary = typeof encodedPacket !== "string";
          app2.publish(topic, isBinary ? encodedPacket : "4" + encodedPacket, isBinary);
        });
        this.apply(opts, (socket) => {
          if (socket.conn.transport.name !== "websocket") {
            socket.client.writeToEngine(encodedPackets, basePacketOpts);
          }
        });
      };
    }
    function subscribe(namespaceName, socket, isNew, rooms) {
      const sessionId = socket.conn.id;
      const websocket = socket.conn.transport.socket;
      if (isNew) {
        debug("subscribe connection %s to topic %s", sessionId, namespaceName);
        websocket.subscribe(namespaceName);
      }
      rooms.forEach((room) => {
        const topic = `${namespaceName}${SEPARATOR}${room}`;
        debug("subscribe connection %s to topic %s", sessionId, topic);
        websocket.subscribe(topic);
      });
    }
    function restoreAdapter() {
      socket_io_adapter_1.Adapter.prototype.addAll = addAll;
      socket_io_adapter_1.Adapter.prototype.del = del;
      socket_io_adapter_1.Adapter.prototype.broadcast = broadcast;
    }
    var toArrayBuffer = (buffer) => {
      const { buffer: arrayBuffer, byteOffset, byteLength } = buffer;
      return arrayBuffer.slice(byteOffset, byteOffset + byteLength);
    };
    function serveFile(res, filepath) {
      const { size } = (0, fs_1.statSync)(filepath);
      const readStream = (0, fs_1.createReadStream)(filepath);
      const destroyReadStream = () => !readStream.destroyed && readStream.destroy();
      const onError = (error) => {
        destroyReadStream();
        throw error;
      };
      const onDataChunk = (chunk) => {
        const arrayBufferChunk = toArrayBuffer(chunk);
        res.cork(() => {
          const lastOffset = res.getWriteOffset();
          const [ok, done] = res.tryEnd(arrayBufferChunk, size);
          if (!done && !ok) {
            readStream.pause();
            res.onWritable((offset) => {
              const [ok2, done2] = res.tryEnd(arrayBufferChunk.slice(offset - lastOffset), size);
              if (!done2 && ok2) {
                readStream.resume();
              }
              return ok2;
            });
          }
        });
      };
      res.onAborted(destroyReadStream);
      readStream.on("data", onDataChunk).on("error", onError).on("end", destroyReadStream);
    }
  }
});

// node_modules/socket.io/package.json
var require_package = __commonJS({
  "node_modules/socket.io/package.json"(exports2, module2) {
    module2.exports = {
      name: "socket.io",
      version: "4.8.3",
      description: "node.js realtime framework server",
      keywords: [
        "realtime",
        "framework",
        "websocket",
        "tcp",
        "events",
        "socket",
        "io"
      ],
      files: [
        "dist/",
        "client-dist/",
        "wrapper.mjs",
        "!**/*.tsbuildinfo"
      ],
      directories: {
        doc: "docs/",
        example: "example/",
        lib: "lib/",
        test: "test/"
      },
      type: "commonjs",
      main: "./dist/index.js",
      exports: {
        ".": {
          types: "./dist/index.d.ts",
          import: "./wrapper.mjs",
          require: "./dist/index.js"
        },
        "./package.json": "./package.json"
      },
      types: "./dist/index.d.ts",
      license: "MIT",
      homepage: "https://github.com/socketio/socket.io/tree/main/packages/socket.io#readme",
      repository: {
        type: "git",
        url: "git+https://github.com/socketio/socket.io.git"
      },
      bugs: {
        url: "https://github.com/socketio/socket.io/issues"
      },
      scripts: {
        compile: "rimraf ./dist && tsc",
        test: "npm run format:check && npm run compile && npm run test:types && npm run test:unit",
        "test:types": "tsd",
        "test:unit": "nyc mocha --import=tsx --reporter spec --slow 200 --bail --timeout 10000 test/index.ts",
        "format:check": 'prettier --check "lib/**/*.ts" "test/**/*.ts"',
        "format:fix": 'prettier --write "lib/**/*.ts" "test/**/*.ts"',
        prepack: "npm run compile"
      },
      dependencies: {
        accepts: "~1.3.4",
        base64id: "~2.0.0",
        cors: "~2.8.5",
        debug: "~4.4.1",
        "engine.io": "~6.6.0",
        "socket.io-adapter": "~2.5.2",
        "socket.io-parser": "~4.2.4"
      },
      contributors: [
        {
          name: "Guillermo Rauch",
          email: "rauchg@gmail.com"
        },
        {
          name: "Arnout Kazemier",
          email: "info@3rd-eden.com"
        },
        {
          name: "Vladimir Dronnikov",
          email: "dronnikov@gmail.com"
        },
        {
          name: "Einar Otto Stangvik",
          email: "einaros@gmail.com"
        }
      ],
      engines: {
        node: ">=10.2.0"
      },
      tsd: {
        directory: "test"
      }
    };
  }
});

// node_modules/socket.io/dist/index.js
var require_dist2 = __commonJS({
  "node_modules/socket.io/dist/index.js"(exports2, module2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || function(mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Namespace = exports2.Socket = exports2.Server = void 0;
    var http_1 = __importDefault(require("http"));
    var fs_1 = require("fs");
    var zlib_1 = require("zlib");
    var accepts = require_accepts();
    var stream_1 = require("stream");
    var path = require("path");
    var engine_io_1 = require_engine_io();
    var client_1 = require_client2();
    var events_1 = require("events");
    var namespace_1 = require_namespace();
    Object.defineProperty(exports2, "Namespace", { enumerable: true, get: function() {
      return namespace_1.Namespace;
    } });
    var parent_namespace_1 = require_parent_namespace();
    var socket_io_adapter_1 = require_dist();
    var parser = __importStar(require_cjs4());
    var debug_1 = __importDefault(require_src());
    var socket_1 = require_socket4();
    Object.defineProperty(exports2, "Socket", { enumerable: true, get: function() {
      return socket_1.Socket;
    } });
    var typed_events_1 = require_typed_events();
    var uws_1 = require_uws();
    var cors_1 = __importDefault(require_lib());
    var debug = (0, debug_1.default)("socket.io:server");
    var clientVersion = require_package().version;
    var dotMapRegex = /\.map/;
    var Server = class _Server extends typed_events_1.StrictEventEmitter {
      constructor(srv, opts = {}) {
        super();
        this._nsps = /* @__PURE__ */ new Map();
        this.parentNsps = /* @__PURE__ */ new Map();
        this.parentNamespacesFromRegExp = /* @__PURE__ */ new Map();
        if ("object" === typeof srv && srv instanceof Object && !srv.listen) {
          opts = srv;
          srv = void 0;
        }
        this.path(opts.path || "/socket.io");
        this.connectTimeout(opts.connectTimeout || 45e3);
        this.serveClient(false !== opts.serveClient);
        this._parser = opts.parser || parser;
        this.encoder = new this._parser.Encoder();
        this.opts = opts;
        if (opts.connectionStateRecovery) {
          opts.connectionStateRecovery = Object.assign({
            maxDisconnectionDuration: 2 * 60 * 1e3,
            skipMiddlewares: true
          }, opts.connectionStateRecovery);
          this.adapter(opts.adapter || socket_io_adapter_1.SessionAwareAdapter);
        } else {
          this.adapter(opts.adapter || socket_io_adapter_1.Adapter);
        }
        opts.cleanupEmptyChildNamespaces = !!opts.cleanupEmptyChildNamespaces;
        this.sockets = this.of("/");
        if (srv || typeof srv == "number")
          this.attach(srv);
        if (this.opts.cors) {
          this._corsMiddleware = (0, cors_1.default)(this.opts.cors);
        }
      }
      get _opts() {
        return this.opts;
      }
      serveClient(v) {
        if (!arguments.length)
          return this._serveClient;
        this._serveClient = v;
        return this;
      }
      /**
       * Executes the middleware for an incoming namespace not already created on the server.
       *
       * @param name - name of incoming namespace
       * @param auth - the auth parameters
       * @param fn - callback
       *
       * @private
       */
      _checkNamespace(name, auth, fn) {
        if (this.parentNsps.size === 0)
          return fn(false);
        const keysIterator = this.parentNsps.keys();
        const run = () => {
          const nextFn = keysIterator.next();
          if (nextFn.done) {
            return fn(false);
          }
          nextFn.value(name, auth, (err, allow) => {
            if (err || !allow) {
              return run();
            }
            if (this._nsps.has(name)) {
              debug("dynamic namespace %s already exists", name);
              return fn(this._nsps.get(name));
            }
            const namespace = this.parentNsps.get(nextFn.value).createChild(name);
            debug("dynamic namespace %s was created", name);
            fn(namespace);
          });
        };
        run();
      }
      path(v) {
        if (!arguments.length)
          return this._path;
        this._path = v.replace(/\/$/, "");
        const escapedPath = this._path.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
        this.clientPathRegex = new RegExp("^" + escapedPath + "/socket\\.io(\\.msgpack|\\.esm)?(\\.min)?\\.js(\\.map)?(?:\\?|$)");
        return this;
      }
      connectTimeout(v) {
        if (v === void 0)
          return this._connectTimeout;
        this._connectTimeout = v;
        return this;
      }
      adapter(v) {
        if (!arguments.length)
          return this._adapter;
        this._adapter = v;
        for (const nsp of this._nsps.values()) {
          nsp._initAdapter();
        }
        return this;
      }
      /**
       * Attaches socket.io to a server or port.
       *
       * @param srv - server or port
       * @param opts - options passed to engine.io
       * @return self
       */
      listen(srv, opts = {}) {
        return this.attach(srv, opts);
      }
      /**
       * Attaches socket.io to a server or port.
       *
       * @param srv - server or port
       * @param opts - options passed to engine.io
       * @return self
       */
      attach(srv, opts = {}) {
        if ("function" == typeof srv) {
          const msg = "You are trying to attach socket.io to an express request handler function. Please pass a http.Server instance.";
          throw new Error(msg);
        }
        if (Number(srv) == srv) {
          srv = Number(srv);
        }
        if ("number" == typeof srv) {
          debug("creating http server and binding to %d", srv);
          const port = srv;
          srv = http_1.default.createServer((req, res) => {
            res.writeHead(404);
            res.end();
          });
          srv.listen(port);
        }
        Object.assign(opts, this.opts);
        opts.path = opts.path || this._path;
        this.initEngine(srv, opts);
        return this;
      }
      /**
       * Attaches socket.io to a uWebSockets.js app.
       * @param app
       * @param opts
       */
      attachApp(app2, opts = {}) {
        Object.assign(opts, this.opts);
        opts.path = opts.path || this._path;
        debug("creating uWebSockets.js-based engine with opts %j", opts);
        const engine = new engine_io_1.uServer(opts);
        engine.attach(app2, opts);
        this.bind(engine);
        if (this._serveClient) {
          app2.get(`${this._path}/*`, (res, req) => {
            if (!this.clientPathRegex.test(req.getUrl())) {
              req.setYield(true);
              return;
            }
            const filename = req.getUrl().replace(this._path, "").replace(/\?.*$/, "").replace(/^\//, "");
            const isMap = dotMapRegex.test(filename);
            const type2 = isMap ? "map" : "source";
            const expectedEtag = '"' + clientVersion + '"';
            const weakEtag = "W/" + expectedEtag;
            const etag = req.getHeader("if-none-match");
            if (etag) {
              if (expectedEtag === etag || weakEtag === etag) {
                debug("serve client %s 304", type2);
                res.writeStatus("304 Not Modified");
                res.end();
                return;
              }
            }
            debug("serve client %s", type2);
            res.writeHeader("cache-control", "public, max-age=0");
            res.writeHeader("content-type", "application/" + (isMap ? "json" : "javascript") + "; charset=utf-8");
            res.writeHeader("etag", expectedEtag);
            const filepath = path.join(__dirname, "../client-dist/", filename);
            (0, uws_1.serveFile)(res, filepath);
          });
        }
        (0, uws_1.patchAdapter)(app2);
      }
      /**
       * Initialize engine
       *
       * @param srv - the server to attach to
       * @param opts - options passed to engine.io
       * @private
       */
      initEngine(srv, opts) {
        debug("creating engine.io instance with opts %j", opts);
        this.eio = (0, engine_io_1.attach)(srv, opts);
        if (this._serveClient)
          this.attachServe(srv);
        this.httpServer = srv;
        this.bind(this.eio);
      }
      /**
       * Attaches the static file serving.
       *
       * @param srv http server
       * @private
       */
      attachServe(srv) {
        debug("attaching client serving req handler");
        const evs = srv.listeners("request").slice(0);
        srv.removeAllListeners("request");
        srv.on("request", (req, res) => {
          if (this.clientPathRegex.test(req.url)) {
            if (this._corsMiddleware) {
              this._corsMiddleware(req, res, () => {
                this.serve(req, res);
              });
            } else {
              this.serve(req, res);
            }
          } else {
            for (let i = 0; i < evs.length; i++) {
              evs[i].call(srv, req, res);
            }
          }
        });
      }
      /**
       * Handles a request serving of client source and map
       *
       * @param req
       * @param res
       * @private
       */
      serve(req, res) {
        const filename = req.url.replace(this._path, "").replace(/\?.*$/, "");
        const isMap = dotMapRegex.test(filename);
        const type2 = isMap ? "map" : "source";
        const expectedEtag = '"' + clientVersion + '"';
        const weakEtag = "W/" + expectedEtag;
        const etag = req.headers["if-none-match"];
        if (etag) {
          if (expectedEtag === etag || weakEtag === etag) {
            debug("serve client %s 304", type2);
            res.writeHead(304);
            res.end();
            return;
          }
        }
        debug("serve client %s", type2);
        res.setHeader("Cache-Control", "public, max-age=0");
        res.setHeader("Content-Type", "application/" + (isMap ? "json" : "javascript") + "; charset=utf-8");
        res.setHeader("ETag", expectedEtag);
        _Server.sendFile(filename, req, res);
      }
      /**
       * @param filename
       * @param req
       * @param res
       * @private
       */
      static sendFile(filename, req, res) {
        const readStream = (0, fs_1.createReadStream)(path.join(__dirname, "../client-dist/", filename));
        const encoding = accepts(req).encodings(["br", "gzip", "deflate"]);
        const onError = (err) => {
          if (err) {
            res.end();
          }
        };
        switch (encoding) {
          case "br":
            res.writeHead(200, { "content-encoding": "br" });
            (0, stream_1.pipeline)(readStream, (0, zlib_1.createBrotliCompress)(), res, onError);
            break;
          case "gzip":
            res.writeHead(200, { "content-encoding": "gzip" });
            (0, stream_1.pipeline)(readStream, (0, zlib_1.createGzip)(), res, onError);
            break;
          case "deflate":
            res.writeHead(200, { "content-encoding": "deflate" });
            (0, stream_1.pipeline)(readStream, (0, zlib_1.createDeflate)(), res, onError);
            break;
          default:
            res.writeHead(200);
            (0, stream_1.pipeline)(readStream, res, onError);
        }
      }
      /**
       * Binds socket.io to an engine.io instance.
       *
       * @param engine engine.io (or compatible) server
       * @return self
       */
      bind(engine) {
        this.engine = engine;
        this.engine.on("connection", this.onconnection.bind(this));
        return this;
      }
      /**
       * Called with each incoming transport connection.
       *
       * @param {engine.Socket} conn
       * @return self
       * @private
       */
      onconnection(conn) {
        debug("incoming connection with id %s", conn.id);
        const client = new client_1.Client(this, conn);
        if (conn.protocol === 3) {
          client.connect("/");
        }
        return this;
      }
      /**
       * Looks up a namespace.
       *
       * @example
       * // with a simple string
       * const myNamespace = io.of("/my-namespace");
       *
       * // with a regex
       * const dynamicNsp = io.of(/^\/dynamic-\d+$/).on("connection", (socket) => {
       *   const namespace = socket.nsp; // newNamespace.name === "/dynamic-101"
       *
       *   // broadcast to all clients in the given sub-namespace
       *   namespace.emit("hello");
       * });
       *
       * @param name - nsp name
       * @param fn optional, nsp `connection` ev handler
       */
      of(name, fn) {
        if (typeof name === "function" || name instanceof RegExp) {
          const parentNsp = new parent_namespace_1.ParentNamespace(this);
          debug("initializing parent namespace %s", parentNsp.name);
          if (typeof name === "function") {
            this.parentNsps.set(name, parentNsp);
          } else {
            this.parentNsps.set((nsp2, conn, next) => next(null, name.test(nsp2)), parentNsp);
            this.parentNamespacesFromRegExp.set(name, parentNsp);
          }
          if (fn) {
            parentNsp.on("connect", fn);
          }
          return parentNsp;
        }
        if (String(name)[0] !== "/")
          name = "/" + name;
        let nsp = this._nsps.get(name);
        if (!nsp) {
          for (const [regex, parentNamespace] of this.parentNamespacesFromRegExp) {
            if (regex.test(name)) {
              debug("attaching namespace %s to parent namespace %s", name, regex);
              return parentNamespace.createChild(name);
            }
          }
          debug("initializing namespace %s", name);
          nsp = new namespace_1.Namespace(this, name);
          this._nsps.set(name, nsp);
          if (name !== "/") {
            this.sockets.emitReserved("new_namespace", nsp);
          }
        }
        if (fn)
          nsp.on("connect", fn);
        return nsp;
      }
      /**
       * Closes server connection
       *
       * @param [fn] optional, called as `fn([err])` on error OR all conns closed
       */
      async close(fn) {
        await Promise.allSettled([...this._nsps.values()].map(async (nsp) => {
          nsp.sockets.forEach((socket) => {
            socket._onclose("server shutting down");
          });
          await nsp.adapter.close();
        }));
        this.engine.close();
        (0, uws_1.restoreAdapter)();
        if (this.httpServer) {
          return new Promise((resolve) => {
            this.httpServer.close((err) => {
              fn && fn(err);
              if (err) {
                debug("server was not running");
              }
              resolve();
            });
          });
        } else {
          fn && fn();
        }
      }
      /**
       * Registers a middleware, which is a function that gets executed for every incoming {@link Socket}.
       *
       * @example
       * io.use((socket, next) => {
       *   // ...
       *   next();
       * });
       *
       * @param fn - the middleware function
       */
      use(fn) {
        this.sockets.use(fn);
        return this;
      }
      /**
       * Targets a room when emitting.
       *
       * @example
       * // the “foo” event will be broadcast to all connected clients in the “room-101” room
       * io.to("room-101").emit("foo", "bar");
       *
       * // with an array of rooms (a client will be notified at most once)
       * io.to(["room-101", "room-102"]).emit("foo", "bar");
       *
       * // with multiple chained calls
       * io.to("room-101").to("room-102").emit("foo", "bar");
       *
       * @param room - a room, or an array of rooms
       * @return a new {@link BroadcastOperator} instance for chaining
       */
      to(room) {
        return this.sockets.to(room);
      }
      /**
       * Targets a room when emitting. Similar to `to()`, but might feel clearer in some cases:
       *
       * @example
       * // disconnect all clients in the "room-101" room
       * io.in("room-101").disconnectSockets();
       *
       * @param room - a room, or an array of rooms
       * @return a new {@link BroadcastOperator} instance for chaining
       */
      in(room) {
        return this.sockets.in(room);
      }
      /**
       * Excludes a room when emitting.
       *
       * @example
       * // the "foo" event will be broadcast to all connected clients, except the ones that are in the "room-101" room
       * io.except("room-101").emit("foo", "bar");
       *
       * // with an array of rooms
       * io.except(["room-101", "room-102"]).emit("foo", "bar");
       *
       * // with multiple chained calls
       * io.except("room-101").except("room-102").emit("foo", "bar");
       *
       * @param room - a room, or an array of rooms
       * @return a new {@link BroadcastOperator} instance for chaining
       */
      except(room) {
        return this.sockets.except(room);
      }
      /**
       * Sends a `message` event to all clients.
       *
       * This method mimics the WebSocket.send() method.
       *
       * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send
       *
       * @example
       * io.send("hello");
       *
       * // this is equivalent to
       * io.emit("message", "hello");
       *
       * @return self
       */
      send(...args) {
        this.sockets.emit("message", ...args);
        return this;
      }
      /**
       * Sends a `message` event to all clients. Alias of {@link send}.
       *
       * @return self
       */
      write(...args) {
        this.sockets.emit("message", ...args);
        return this;
      }
      /**
       * Sends a message to the other Socket.IO servers of the cluster.
       *
       * @example
       * io.serverSideEmit("hello", "world");
       *
       * io.on("hello", (arg1) => {
       *   console.log(arg1); // prints "world"
       * });
       *
       * // acknowledgements (without binary content) are supported too:
       * io.serverSideEmit("ping", (err, responses) => {
       *  if (err) {
       *     // some servers did not acknowledge the event in the given delay
       *   } else {
       *     console.log(responses); // one response per server (except the current one)
       *   }
       * });
       *
       * io.on("ping", (cb) => {
       *   cb("pong");
       * });
       *
       * @param ev - the event name
       * @param args - an array of arguments, which may include an acknowledgement callback at the end
       */
      serverSideEmit(ev, ...args) {
        return this.sockets.serverSideEmit(ev, ...args);
      }
      /**
       * Sends a message and expect an acknowledgement from the other Socket.IO servers of the cluster.
       *
       * @example
       * try {
       *   const responses = await io.serverSideEmitWithAck("ping");
       *   console.log(responses); // one response per server (except the current one)
       * } catch (e) {
       *   // some servers did not acknowledge the event in the given delay
       * }
       *
       * @param ev - the event name
       * @param args - an array of arguments
       *
       * @return a Promise that will be fulfilled when all servers have acknowledged the event
       */
      serverSideEmitWithAck(ev, ...args) {
        return this.sockets.serverSideEmitWithAck(ev, ...args);
      }
      /**
       * Gets a list of socket ids.
       *
       * @deprecated this method will be removed in the next major release, please use {@link Server#serverSideEmit} or
       * {@link Server#fetchSockets} instead.
       */
      allSockets() {
        return this.sockets.allSockets();
      }
      /**
       * Sets the compress flag.
       *
       * @example
       * io.compress(false).emit("hello");
       *
       * @param compress - if `true`, compresses the sending data
       * @return a new {@link BroadcastOperator} instance for chaining
       */
      compress(compress) {
        return this.sockets.compress(compress);
      }
      /**
       * Sets a modifier for a subsequent event emission that the event data may be lost if the client is not ready to
       * receive messages (because of network slowness or other issues, or because they’re connected through long polling
       * and is in the middle of a request-response cycle).
       *
       * @example
       * io.volatile.emit("hello"); // the clients may or may not receive it
       *
       * @return a new {@link BroadcastOperator} instance for chaining
       */
      get volatile() {
        return this.sockets.volatile;
      }
      /**
       * Sets a modifier for a subsequent event emission that the event data will only be broadcast to the current node.
       *
       * @example
       * // the “foo” event will be broadcast to all connected clients on this node
       * io.local.emit("foo", "bar");
       *
       * @return a new {@link BroadcastOperator} instance for chaining
       */
      get local() {
        return this.sockets.local;
      }
      /**
       * Adds a timeout in milliseconds for the next operation.
       *
       * @example
       * io.timeout(1000).emit("some-event", (err, responses) => {
       *   if (err) {
       *     // some clients did not acknowledge the event in the given delay
       *   } else {
       *     console.log(responses); // one response per client
       *   }
       * });
       *
       * @param timeout
       */
      timeout(timeout) {
        return this.sockets.timeout(timeout);
      }
      /**
       * Returns the matching socket instances.
       *
       * Note: this method also works within a cluster of multiple Socket.IO servers, with a compatible {@link Adapter}.
       *
       * @example
       * // return all Socket instances
       * const sockets = await io.fetchSockets();
       *
       * // return all Socket instances in the "room1" room
       * const sockets = await io.in("room1").fetchSockets();
       *
       * for (const socket of sockets) {
       *   console.log(socket.id);
       *   console.log(socket.handshake);
       *   console.log(socket.rooms);
       *   console.log(socket.data);
       *
       *   socket.emit("hello");
       *   socket.join("room1");
       *   socket.leave("room2");
       *   socket.disconnect();
       * }
       */
      fetchSockets() {
        return this.sockets.fetchSockets();
      }
      /**
       * Makes the matching socket instances join the specified rooms.
       *
       * Note: this method also works within a cluster of multiple Socket.IO servers, with a compatible {@link Adapter}.
       *
       * @example
       *
       * // make all socket instances join the "room1" room
       * io.socketsJoin("room1");
       *
       * // make all socket instances in the "room1" room join the "room2" and "room3" rooms
       * io.in("room1").socketsJoin(["room2", "room3"]);
       *
       * @param room - a room, or an array of rooms
       */
      socketsJoin(room) {
        return this.sockets.socketsJoin(room);
      }
      /**
       * Makes the matching socket instances leave the specified rooms.
       *
       * Note: this method also works within a cluster of multiple Socket.IO servers, with a compatible {@link Adapter}.
       *
       * @example
       * // make all socket instances leave the "room1" room
       * io.socketsLeave("room1");
       *
       * // make all socket instances in the "room1" room leave the "room2" and "room3" rooms
       * io.in("room1").socketsLeave(["room2", "room3"]);
       *
       * @param room - a room, or an array of rooms
       */
      socketsLeave(room) {
        return this.sockets.socketsLeave(room);
      }
      /**
       * Makes the matching socket instances disconnect.
       *
       * Note: this method also works within a cluster of multiple Socket.IO servers, with a compatible {@link Adapter}.
       *
       * @example
       * // make all socket instances disconnect (the connections might be kept alive for other namespaces)
       * io.disconnectSockets();
       *
       * // make all socket instances in the "room1" room disconnect and close the underlying connections
       * io.in("room1").disconnectSockets(true);
       *
       * @param close - whether to close the underlying connection
       */
      disconnectSockets(close = false) {
        return this.sockets.disconnectSockets(close);
      }
    };
    exports2.Server = Server;
    var emitterMethods = Object.keys(events_1.EventEmitter.prototype).filter(function(key) {
      return typeof events_1.EventEmitter.prototype[key] === "function";
    });
    emitterMethods.forEach(function(fn) {
      Server.prototype[fn] = function() {
        return this.sockets[fn].apply(this.sockets, arguments);
      };
    });
    module2.exports = (srv, opts) => new Server(srv, opts);
    module2.exports.Server = Server;
    module2.exports.Namespace = namespace_1.Namespace;
    module2.exports.Socket = socket_1.Socket;
  }
});

// js/server.js
var require_server2 = __commonJS({
  "js/server.js"(exports2, module2) {
    var { Server } = require_dist2();
    var http = require("http");
    var { networkInterfaces } = require("os");
    var server = null;
    var defaultPort = 6789;
    var MAX_OP_HISTORY = 500;
    var LiveShareServer = class {
      constructor() {
        this.io = null;
        this.server = null;
        this.address = "";
        this.users = {};
        this.locks = {};
        this.rooms = {};
        this.roomSeqs = {};
        this.opHistory = {};
      }
      start(port = 3e3) {
        return new Promise((resolve, reject) => {
          this.server = http.createServer();
          this.io = new Server(this.server, {
            cors: { origin: "*" },
            pingTimeout: 6e4,
            pingInterval: 25e3,
            maxHttpBufferSize: 1e8
          });
          this.io.on("connection", async (socket) => {
            const username = socket.handshake.auth.username || "Anonymous";
            let room_id = socket.handshake.auth.room;
            console.log(`[LS] User connected: ${username}, ${socket.id}`);
            if (!room_id || room_id == -1 || room_id === "-1" || room_id === "null") {
              room_id = "room_" + Math.random().toString(36).substring(2, 10);
              console.log(`[LS] Room created: ${room_id}`);
            }
            await socket.join(room_id);
            if (!this.rooms[room_id]) {
              this.rooms[room_id] = { users: {}, host_id: socket.id, locks: {} };
            }
            if (!this.roomSeqs[room_id]) this.roomSeqs[room_id] = 0;
            if (!this.opHistory[room_id]) this.opHistory[room_id] = [];
            for (const [sid] of Object.entries(this.rooms[room_id].users)) {
              if (sid !== socket.id && this.users[sid] && this.users[sid].name === username) {
                delete this.rooms[room_id].users[sid];
                delete this.users[sid];
              }
            }
            const isHost = socket.id === this.rooms[room_id].host_id;
            this.rooms[room_id].users[socket.id] = socket.id;
            this.users[socket.id] = {
              id: socket.id,
              name: username,
              isHost,
              room: room_id,
              color: "#" + Math.floor(Math.random() * 16777215).toString(16)
            };
            socket.emit("is-host", isHost);
            socket.emit("room-assigned", room_id);
            socket.emit("room-seq", this.roomSeqs[room_id]);
            const roomUsers = this.rooms[room_id].users;
            const otherUsers = Object.keys(roomUsers).filter((uid) => uid !== socket.id).map((uid) => ({
              id: uid,
              name: this.users[uid] ? this.users[uid].name : "Anonymous"
            }));
            socket.emit("current-users", otherUsers);
            socket.to(room_id).emit("user-joined", { id: socket.id, name: username });
            if (!isHost && this.rooms[room_id].host_id) {
              this.io.to(this.rooms[room_id].host_id).emit("get-whole-document", { requesterId: socket.id });
            }
            socket.on("latency-check", () => {
              socket.emit("latency-response");
            });
            socket.on("host-delivers-document", (data) => {
              this.io.to(data.to).emit("load-whole-document", { json: data.json });
            });
            socket.on("client-mouse-moved", (data) => {
              socket.to(this.users[socket.id].room).emit("update-mouse-pos", {
                id: socket.id,
                x: data.x,
                y: data.y,
                diagram: data.diagram,
                zoom: data.zoom,
                originX: data.originX,
                originY: data.originY,
                name: this.users[socket.id].name
              });
            });
            socket.on("request-follow-sync", (data) => {
              if (data.targetId && this.users[data.targetId]) {
                this.io.to(data.targetId).emit("get-follow-sync", {
                  requesterId: socket.id
                });
              }
            });
            socket.on("response-follow-sync", (data) => {
              if (data.requesterId && this.users[data.requesterId]) {
                this.io.to(data.requesterId).emit("follower-sync-data", {
                  id: socket.id,
                  ...data.viewportData
                });
              }
            });
            socket.on("request-doc", () => {
              console.log(
                `[LS] ${this.users[socket.id].name} requested the whole doc.`
              );
              this.io.to(this.rooms[this.users[socket.id].room].host_id).emit("get-whole-document", { requesterId: socket.id });
            });
            socket.on("sync-operation", (opStr) => {
              const userData = this.users[socket.id];
              if (!userData || !userData.room) return;
              const room_id2 = userData.room;
              if (!this.opHistory[room_id2]) this.opHistory[room_id2] = [];
              if (!this.roomSeqs[room_id2]) this.roomSeqs[room_id2] = 0;
              this.roomSeqs[room_id2]++;
              const seq = this.roomSeqs[room_id2];
              this.opHistory[room_id2].push({
                seq,
                socketId: socket.id,
                operation: opStr,
                timestamp: Date.now()
              });
              if (this.opHistory[room_id2].length > MAX_OP_HISTORY) {
                this.opHistory[room_id2].shift();
              }
              this.io.to(room_id2).emit("remote-operation", {
                seq,
                operation: opStr,
                socketId: socket.id
              });
            });
            socket.on("request-missed-ops", (data) => {
              const userData = this.users[socket.id];
              if (!userData) return;
              const room_id2 = userData.room;
              const fromSeq = data.fromSeq;
              const history = this.opHistory[room_id2] || [];
              const missed = history.filter((entry) => entry.seq > fromSeq);
              if (missed.length > 0) {
                console.log(
                  `[LS] Sending ${missed.length} missed ops to ${userData.name} (from seq ${fromSeq})`
                );
                socket.emit("missed-ops", { ops: missed });
              }
            });
            socket.on("lock-element", (viewIds) => {
              const room_id2 = this.users[socket.id].room;
              if (!this.rooms[room_id2]) return;
              viewIds.forEach((id) => {
                if (this.rooms[room_id2].locks[id]) return;
                this.rooms[room_id2].locks[id] = socket.id;
                this.io.to(room_id2).emit("element-locked", {
                  viewId: id,
                  ownerId: socket.id,
                  color: this.users[socket.id].color
                });
              });
            });
            socket.on("unlock-elements", () => {
              const room_id2 = this.users[socket.id].room;
              if (!this.rooms[room_id2]) return;
              for (let id in this.rooms[room_id2].locks) {
                if (this.rooms[room_id2].locks[id] === socket.id) {
                  delete this.rooms[room_id2].locks[id];
                  this.io.to(room_id2).emit("element-unlocked", { viewId: id });
                }
              }
            });
            socket.on("disconnect", () => {
              const userData = this.users[socket.id];
              if (!userData) return;
              const room_id2 = userData.room;
              if (!this.rooms[room_id2]) return;
              for (let id in this.rooms[room_id2].locks) {
                if (this.rooms[room_id2].locks[id] === socket.id) {
                  delete this.rooms[room_id2].locks[id];
                  this.io.to(room_id2).emit("element-unlocked", { viewId: id });
                }
              }
              console.log(`[LS] ${userData.name}, ${socket.id} left.`);
              socket.to(room_id2).emit("user-left", socket.id);
              delete this.rooms[room_id2].users[socket.id];
              let remainingUsers = Object.keys(this.rooms[room_id2].users);
              if (this.rooms[room_id2].host_id === socket.id) {
                this.io.to(room_id2).emit("host-left", { oldHostId: socket.id });
                if (remainingUsers.length > 0) {
                  let new_host = remainingUsers[0];
                  this.rooms[room_id2].host_id = new_host;
                  this.users[new_host].isHost = true;
                  this.io.to(new_host).emit("is-host", true);
                }
              }
              if (remainingUsers.length === 0) {
                delete this.rooms[room_id2];
                delete this.roomSeqs[room_id2];
                delete this.opHistory[room_id2];
              }
              delete this.users[socket.id];
            });
          });
          this.server.on("error", (err) => {
            if (err.code === "EADDRINUSE") {
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
    };
    async function startServer(port) {
      if (server) server.stop();
      server = new LiveShareServer();
      const targetPort = port || 3e3;
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
      return server && server.server && server.server.address() ? server.server.address().port : defaultPort;
    }
    function get_ip() {
      const nets = networkInterfaces();
      const candidates = [];
      for (const name of Object.keys(nets)) {
        for (const net2 of nets[name]) {
          if (net2.internal) continue;
          const isIPv4 = net2.family === "IPv4" || net2.family === 4;
          if (isIPv4) {
            candidates.push(net2.address);
          }
        }
      }
      const priority = (ip) => {
        if (ip.startsWith("10.")) return 0;
        const parts = ip.split(".");
        if (parts[0] === "172") {
          const second = parseInt(parts[1], 10);
          if (second >= 16 && second <= 31) return 1;
        }
        if (ip.startsWith("192.168.")) return 2;
        return 3;
      };
      candidates.sort((a, b) => priority(a) - priority(b));
      return candidates[0] || "127.0.0.1";
    }
    module2.exports = {
      LiveShareServer,
      startServer,
      stopServer,
      getServerAddress,
      getServer,
      getServerPort,
      defaultPort
    };
  }
});

// js/tunnel.js
var require_tunnel = __commonJS({
  "js/tunnel.js"(exports2, module2) {
    var { spawn } = require("child_process");
    var PROVIDER_TIMEOUT = 2e4;
    var tunnelInstance = null;
    var currentUrl = null;
    var currentProviderName = null;
    function wrapTunnel(url, closeFn) {
      const cbs = { close: [], error: [] };
      let closed = false;
      const obj = {
        url,
        close: () => {
          if (closed) return;
          closed = true;
          closeFn();
          cbs.close.slice().forEach((fn) => fn());
        },
        onClose: (cb) => cbs.close.push(cb),
        onError: (cb) => cbs.error.push(cb)
      };
      obj._fireClose = () => {
        if (closed) return;
        closed = true;
        cbs.close.slice().forEach((fn) => fn());
      };
      obj._fireError = (err) => {
        cbs.error.slice().forEach((fn) => fn(err));
      };
      return obj;
    }
    var cancelRegistry = [];
    function cancelAllInFlight() {
      const handlers = cancelRegistry.splice(0);
      handlers.forEach((fn) => fn());
    }
    function cleanupHandler(handler) {
      const idx = cancelRegistry.indexOf(handler);
      if (idx !== -1) cancelRegistry.splice(idx, 1);
    }
    function registerCancel(handler) {
      cancelRegistry.push(handler);
      return () => cleanupHandler(handler);
    }
    async function withTimeout(promise, ms) {
      return Promise.race([
        promise,
        new Promise(
          (_, reject) => setTimeout(() => reject(new Error("timeout")), ms)
        )
      ]);
    }
    function tryCloudflared(port) {
      return new Promise((resolve, reject) => {
        const child = spawn(
          "cloudflared",
          ["tunnel", "--url", `http://localhost:${port}`, "--no-autoupdate"],
          {
            stdio: ["ignore", "pipe", "pipe"]
          }
        );
        let resolved = false;
        let buffer = "";
        const unreg = registerCancel(() => {
          if (resolved) return;
          resolved = true;
          try {
            child.kill("SIGTERM");
          } catch (_) {
          }
          reject(new Error("cancelled"));
        });
        function onOutput(data) {
          if (resolved) return;
          buffer += data.toString();
          const m = buffer.match(
            /https:\/\/[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.trycloudflare\.com/
          );
          if (m) {
            resolved = true;
            unreg();
            child.stdout.removeAllListeners("data");
            child.stderr.removeAllListeners("data");
            const tw = wrapTunnel(m[0], () => child.kill("SIGTERM"));
            child.on("exit", () => tw._fireClose());
            child.on("error", (err) => tw._fireError(err));
            resolve(tw);
          }
        }
        child.stdout.on("data", onOutput);
        child.stderr.on("data", onOutput);
        child.on("error", (err) => {
          if (!resolved) {
            resolved = true;
            unreg();
            reject(err);
          }
        });
        child.on("exit", (code) => {
          if (!resolved) {
            resolved = true;
            unreg();
            reject(new Error(`cloudflared exited with code ${code}`));
          }
        });
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            unreg();
            try {
              child.kill("SIGTERM");
            } catch (_) {
            }
            reject(new Error("cloudflared timed out"));
          }
        }, PROVIDER_TIMEOUT);
      });
    }
    function tryLocalhostRun(port) {
      return new Promise((resolve, reject) => {
        const child = spawn(
          "ssh",
          [
            "-o",
            "StrictHostKeyChecking=no",
            "-o",
            "ServerAliveInterval=30",
            "-R",
            `80:localhost:${port}`,
            "nokey@localhost.run"
          ],
          {
            stdio: ["ignore", "pipe", "pipe"]
          }
        );
        let resolved = false;
        let buffer = "";
        const unreg = registerCancel(() => {
          if (resolved) return;
          resolved = true;
          try {
            child.kill("SIGTERM");
          } catch (_) {
          }
          reject(new Error("cancelled"));
        });
        function onOutput(data) {
          if (resolved) return;
          buffer += data.toString();
          const m = buffer.match(
            /https:\/\/[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.lhr\.life/
          );
          if (m) {
            resolved = true;
            unreg();
            child.stdout.removeAllListeners("data");
            child.stderr.removeAllListeners("data");
            const tw = wrapTunnel(m[0], () => child.kill("SIGTERM"));
            child.on("exit", () => tw._fireClose());
            child.on("error", (err) => tw._fireError(err));
            resolve(tw);
          }
        }
        child.stdout.on("data", onOutput);
        child.stderr.on("data", onOutput);
        child.on("error", (err) => {
          if (!resolved) {
            resolved = true;
            unreg();
            reject(err);
          }
        });
        child.on("exit", (code) => {
          if (!resolved) {
            resolved = true;
            unreg();
            reject(new Error(`ssh exited with code ${code}`));
          }
        });
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            unreg();
            try {
              child.kill("SIGTERM");
            } catch (_) {
            }
            reject(new Error("localhost.run timed out"));
          }
        }, PROVIDER_TIMEOUT);
      });
    }
    var PROVIDERS = [
      { name: "localhost.run", fn: tryLocalhostRun },
      { name: "cloudflared", fn: tryCloudflared }
    ];
    async function startSSHTunnel(port) {
      stopTunnel();
      console.log("[LS] Starting Windows SSH tunnel (localhost.run)...");
      try {
        const instance = await withTimeout(tryLocalhostRun(port), PROVIDER_TIMEOUT);
        cancelAllInFlight();
        currentUrl = instance.url;
        tunnelInstance = instance;
        currentProviderName = "localhost.run";
        instance.onClose(() => {
          console.log("[LS] SSH Tunnel closed");
          tunnelInstance = null;
          currentUrl = null;
          currentProviderName = null;
        });
        instance.onError((err) => {
          console.error("[LS] SSH Tunnel error:", err);
        });
        console.log(`[LS] SSH Tunnel started: ${currentUrl}`);
        return { url: currentUrl, errors: [] };
      } catch (e) {
        cancelAllInFlight();
        const msg = `SSH: ${e.message || e}`;
        console.warn(`[LS] SSH tunnel failed: ${msg}`);
        return { url: null, errors: [msg] };
      }
    }
    async function startTunnel(port) {
      stopTunnel();
      const errors = [];
      for (const provider of PROVIDERS) {
        console.log(`[LS] Tunnel: trying ${provider.name}...`);
        try {
          const instance = await withTimeout(provider.fn(port), PROVIDER_TIMEOUT);
          cancelAllInFlight();
          currentUrl = instance.url;
          tunnelInstance = instance;
          currentProviderName = provider.name;
          instance.onClose(() => {
            console.log(`[LS] Tunnel closed (${provider.name})`);
            tunnelInstance = null;
            currentUrl = null;
            currentProviderName = null;
          });
          instance.onError((err) => {
            console.error(`[LS] Tunnel error (${provider.name}):`, err);
          });
          console.log(`[LS] Tunnel started via ${provider.name}: ${currentUrl}`);
          return { url: currentUrl, errors: [] };
        } catch (e) {
          cancelAllInFlight();
          const msg = `${provider.name}: ${e.message || e}`;
          errors.push(msg);
          console.warn(
            `[LS] Tunnel provider ${provider.name} failed: ${e.message || e}`
          );
        }
      }
      console.error("[LS] All tunnel providers failed");
      return { url: null, errors };
    }
    function getTunnelUrl() {
      return currentUrl;
    }
    function stopTunnel() {
      cancelAllInFlight();
      if (tunnelInstance) {
        try {
          tunnelInstance.close();
        } catch (e) {
          console.error("[LS] Error closing tunnel:", e);
        }
        tunnelInstance = null;
        currentUrl = null;
        currentProviderName = null;
      }
    }
    module2.exports = { startTunnel, startSSHTunnel, getTunnelUrl, stopTunnel };
  }
});

// js/net.js
var require_net = __commonJS({
  "js/net.js"(exports2, module2) {
    var client = require_client();
    var server = require_server2();
    var tunnel = require_tunnel();
    var am_i_hosting = false;
    var am_i_connected = false;
    var activeTunnelUrl = null;
    var userPanel2 = null;
    var updateMenuStatesFn = null;
    function resetSessionState() {
      stopActiveTunnel();
      if (userPanel2) userPanel2.hide();
      if (updateMenuStatesFn)
        updateMenuStatesFn(
          {
            ls_ss: true,
            ls_js: true,
            ls_es: false,
            ls_cs: false,
            ls_sd: false
          },
          null,
          null
        );
      am_i_connected = false;
      am_i_hosting = false;
    }
    function setUserPanel(panel) {
      userPanel2 = panel;
    }
    function setUpdateMenuStates(fn) {
      updateMenuStatesFn = fn;
    }
    async function startSession2(name, mode, remoteServer) {
      if (mode === "remote") {
        am_i_hosting = false;
        am_i_connected = await client.connectToServer(remoteServer, name, -1);
      } else {
        am_i_hosting = true;
        await server.startServer(server.defaultPort);
        if (mode === "ssh" || mode === "tunnel") {
          const port = server.getServerPort();
          const result = await tunnel.startSSHTunnel(port);
          if (result.url) {
            activeTunnelUrl = result.url;
            console.log(`[LS] SSH Tunnel URL: ${activeTunnelUrl}`);
          } else {
            const fachada2 = require_fachada();
            const detail = result.errors.length > 0 ? " (" + result.errors.join("; ") + ")" : "";
            fachada2.WARN("SSH Tunnel unavailable \u2014 LAN only." + detail);
          }
        }
        am_i_connected = await client.connectToServer(
          server.getServerAddress(),
          name
        );
      }
      if (am_i_connected) {
        client.onDisconnect(handleClientDisconnect);
        if (userPanel2) userPanel2.show();
        if (updateMenuStatesFn)
          updateMenuStatesFn(
            {
              ls_ss: false,
              ls_js: false,
              ls_es: true,
              ls_cs: true,
              ls_sd: true
            },
            null,
            null
          );
      }
      return am_i_connected;
    }
    async function joinSession2(name, url) {
      let urlObj;
      try {
        urlObj = new URL(url);
      } catch (e) {
        const fachada2 = require_fachada();
        fachada2.ERR("Invalid session URL.");
        return false;
      }
      const roomId = urlObj.searchParams.get("room");
      const serverUrl = urlObj.origin;
      if (!roomId) {
        const fachada2 = require_fachada();
        fachada2.WARN(
          "No room ID found in session URL. You might not join the host canvas."
        );
      }
      am_i_hosting = false;
      am_i_connected = await client.connectToServer(serverUrl, name, roomId || -1);
      if (am_i_connected) {
        client.onDisconnect(handleClientDisconnect);
        if (userPanel2) userPanel2.show();
        if (updateMenuStatesFn)
          updateMenuStatesFn(
            {
              ls_ss: false,
              ls_js: false,
              ls_es: true,
              ls_cs: true,
              ls_sd: true
            },
            null,
            null
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
    function endSession2() {
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
            urlObj.searchParams.set("room", roomId);
          }
          return urlObj.toString();
        } catch (e) {
          return activeTunnelUrl + (roomId ? `/?room=${roomId}` : "");
        }
      }
      let baseUrl = am_i_hosting ? server.getServerAddress() : client.getConnectedAddress();
      if (!baseUrl) return "";
      if (roomId) {
        const urlObj = new URL(baseUrl);
        urlObj.searchParams.set("room", roomId);
        return urlObj.toString();
      }
      return baseUrl;
    }
    function syncDoc() {
      if (!am_i_connected) return;
      client.requestDocument();
    }
    module2.exports = {
      startSession: startSession2,
      joinSession: joinSession2,
      endSession: endSession2,
      getSessionLink,
      syncDoc,
      setUserPanel,
      setUpdateMenuStates
    };
  }
});

// js/user-panel.js
var require_user_panel = __commonJS({
  "js/user-panel.js"(exports2, module2) {
    var client = require_client();
    var WorkspaceManager;
    try {
      WorkspaceManager = brackets.getModule("view/WorkspaceManager");
    } catch (e) {
      WorkspaceManager = null;
    }
    var UserPanel2 = class {
      constructor() {
        this.id = "liveshare.userpanel";
        this.$panel = null;
        this.panelVisible = false;
        this.minimized = sessionStorage.getItem("liveshare.userpanel.minimized") === "true";
        this.maxHeight = 250;
        this.minHeight = 35;
        const storedHeight = parseInt(sessionStorage.getItem("liveshare.userpanel.height"));
        this.savedHeight = storedHeight && storedHeight > 0 && storedHeight < this.maxHeight ? storedHeight : 100;
        this.panel = null;
        this._isResizing = false;
        this._startY = 0;
        this._startHeight = 0;
      }
      show() {
        if (!this.$panel) {
          this.$panel = $(`
        <div id="liveshare-user-panel" style="
          display: flex;
          flex-direction: column;
          height: 100%;
          max-height: 250px;
          overflow: hidden;
          background: rgba(74, 76, 78);
          color: #ccc;
          font-size: 11px;
          border-left: 1px solid rgba(58, 63, 65);
        ">
          <!-- Header (Always visible) -->
          <div id="ls-panel-header" style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(58, 63, 65);
            padding: 5px 10px;
            border-bottom: 1px solid rgba(74, 76, 78);
            user-select: none;
            cursor: pointer;
          ">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-weight: 600; font-size: 10px; color: #ccc; text-transform: uppercase; letter-spacing: 1.2px;">LiveShare</span>
              <span id="ls-ping-indicator" style="
                font-size: 10px;
                color: #666;
                margin-left: 4px;
              ">\u2014</span>
            </div>
            <div id="ls-toggle-btn" style="
              width: 18px;
              height: 18px;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              font-size: 14px;
              color: #999;
              transition: color 0.2s;
            " onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#999'">\u2212</div>
          </div>

          <!-- Content (Minimizable) -->
          <div id="ls-panel-content" style="flex: 1; overflow-y: auto; padding: 2px 0;">
            <div id="ls-user-list" style="display: flex; flex-direction: column;"></div>
          </div>
        </div>
      `);
          const initialHeight = this.minimized ? 35 : Math.min(this.savedHeight, this.maxHeight);
          this.panel = app.panelManager.createBottomPanel(this.id, this.$panel, initialHeight);
          this.$panel.find("#ls-toggle-btn").on("click", () => {
            this.toggleMinimize();
          });
          this.$panel.find("#ls-panel-header").on("dblclick", () => {
            this.toggleMinimize();
          });
          if (this.minimized) {
            this.$panel.find("#ls-panel-content").hide();
            this.$panel.find("#ls-toggle-btn").text("+");
          }
          this.panel.show();
        } else {
          const $content = this.$panel.find("#ls-panel-content");
          if (this.minimized) {
            $content.hide();
          } else {
            $content.show();
          }
        }
        this.panel.show();
        this.panelVisible = true;
        this.render();
        if (this.panel && typeof this.panel.setHeight === "function") {
          const safeHeight = Math.min(Math.max(this.savedHeight, 35), this.maxHeight);
          const targetHeight = this.minimized ? 35 : safeHeight;
          this.panel.setHeight(targetHeight);
        }
        client.onUserUpdate(() => {
          console.log("[LS] User panel: user update callback fired");
          if (this.panelVisible) this.render();
        });
        client.onLatencyUpdate((latency) => {
          const $indicator = this.$panel.find("#ls-ping-indicator");
          if ($indicator.length) {
            let color;
            if (latency < 0) {
              color = "#666";
            } else if (latency < 50) {
              color = "#2ecc71";
            } else if (latency < 150) {
              color = "#f1c40f";
            } else {
              color = "#e74c3c";
            }
            $indicator.text(latency < 0 ? "\u2014" : latency + "ms").css("color", color);
          }
        });
      }
      toggleMinimize() {
        this.minimized = !this.minimized;
        const $content = this.$panel.find("#ls-panel-content");
        const $btn = this.$panel.find("#ls-toggle-btn");
        sessionStorage.setItem("liveshare.userpanel.minimized", this.minimized);
        const targetHeight = this.minimized ? 28 : Math.min(Math.max(this.savedHeight, 35), this.maxHeight);
        if (this.minimized) {
          const currentHeight = this.$panel.height();
          if (currentHeight > 35 && currentHeight < this.maxHeight) {
            this.savedHeight = currentHeight;
            sessionStorage.setItem("liveshare.userpanel.height", this.savedHeight);
          }
        }
        this.$panel.css("height", targetHeight + "px");
        $content.toggle(!this.minimized);
        $btn.text(this.minimized ? "+" : "\u2212");
        if (this.panel && typeof this.panel.setHeight === "function") {
          this.panel.setHeight(targetHeight);
        } else if (this.panel && typeof this.panel.resize === "function") {
          this.panel.resize();
        }
        if (app.panelManager) {
          if (app.panelManager.triggerEditorResize) {
            app.panelManager.triggerEditorResize();
          } else if (app.panelManager._notifyLayoutChange) {
            app.panelManager._notifyLayoutChange();
          }
        }
      }
      hide() {
        if (this.panel) {
          this.panel.hide();
        }
        this.panelVisible = false;
      }
      render() {
        if (!this.$panel) return;
        const users = client.getUsers();
        let followingId = client.getFollowingUserId();
        if (followingId && !users[followingId]) {
          client.setFollowingUserId(null);
          followingId = null;
        }
        const $list = this.$panel.find("#ls-user-list");
        $list.empty();
        const ids = Object.keys(users);
        let displayIds = ids;
        const myId = client.getSocketId();
        if (myId) {
          displayIds = ids.filter((id) => id !== myId);
        }
        if (displayIds.length === 0) {
          $list.append('<div style="font-style: italic; opacity: 0.5; padding: 8px; text-align: center; font-size: 11px; color: #999;">Waiting for peers...</div>');
          return;
        }
        displayIds.forEach((id) => {
          const isFollowing = followingId === id;
          const $userItem = $(`
        <div class="ls-user-item" style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 12px;
          margin: 0;
          cursor: pointer;
          transition: background 0.1s ease;
          background: ${isFollowing ? "rgba(58, 63, 65)" : "transparent"};
          color: #ccc;
        ">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 5px; height: 5px; border-radius: 50%; background: ${isFollowing ? "#fff" : "#999"};"></div>
            <span style="font-size: 11px; font-weight: ${isFollowing ? "700" : "400"}; line-height: 1;">${users[id]}</span>
          </div>
          ${isFollowing ? '<span style="font-size: 8px; color: #fff; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Following</span>' : ""}
        </div>
      `);
          $userItem.hover(
            function() {
              if (!isFollowing) $(this).css({ "background": "rgba(58, 63,65,0.5)", "color": "#fff" });
            },
            function() {
              if (!isFollowing) $(this).css({ "background": "transparent", "color": "#ccc" });
            }
          );
          $userItem.on("click", (e) => {
            e.preventDefault();
            if (isFollowing) {
              client.setFollowingUserId(null);
            } else {
              client.setFollowingUserId(id);
            }
            this.render();
          });
          $list.append($userItem);
        });
      }
    };
    module2.exports = UserPanel2;
  }
});

// main_src.js
var fachada = require_fachada();
var net = require_net();
var flatted = require_cjs6();
var UserPanel = require_user_panel();
var userPanel = new UserPanel();
async function startSession() {
  const data = await fachada.showSS();
  if (!data) return;
  if (!await net.startSession(data.name, data.mode, data.server)) {
    fachada.WARN("Couldnt start session");
    return;
  }
  fachada.INFO("Session started!");
  app.menu.updateStates(
    {
      ls_ss: false,
      ls_js: false,
      ls_es: true,
      ls_cs: true,
      ls_sd: true
    },
    null,
    null
  );
  userPanel.show();
}
async function joinSession() {
  const data = await fachada.showJS();
  if (!data) return;
  if (!await net.joinSession(data.name, data.address)) {
    fachada.WARN("Couldnt join session");
    return;
  }
  fachada.INFO("Session joined!");
  app.menu.updateStates(
    {
      ls_ss: false,
      ls_js: false,
      ls_es: true,
      ls_cs: true,
      ls_sd: true
    },
    null,
    null
  );
  userPanel.show();
}
function endSession() {
  net.endSession();
  userPanel.hide();
  fachada.INFO("Session ended");
  app.menu.updateStates(
    {
      ls_ss: true,
      ls_js: true,
      ls_es: false,
      ls_cs: false,
      ls_sd: false
    },
    null,
    null
  );
}
function copySessionLink() {
  let link = net.getSessionLink();
  navigator.clipboard.writeText(link).then(() => {
    fachada.INFO("Session link copied!");
  }).catch((err) => {
    console.error("[LS] Error copying with navigator:", err);
    console.log("[LS] Couldnt copy. The link is: " + link);
    fachada.ERR("Error. See console");
  });
}
function syncDocument() {
  net.syncDoc();
}
function init() {
  app.commands.register("liveshare:ss", startSession);
  app.commands.register("liveshare:js", joinSession);
  app.commands.register("liveshare:cs", copySessionLink);
  app.commands.register("liveshare:es", endSession);
  app.commands.register("liveshare:sd", syncDocument);
  app.commands.register("liveshare:pa", () => {
    console.log(app);
    console.log(app.project.getProject());
  });
  app.menu.updateStates(
    {
      ls_pa: false
    },
    null,
    null
  );
}
exports.init = init;
/*! Bundled license information:

xmlhttprequest-ssl/lib/XMLHttpRequest.js:
  (**
   * Wrapper for built-in http.js to emulate the browser XMLHttpRequest object.
   *
   * This can be used with JS designed for browsers to improve reuse of code and
   * allow the use of existing libraries.
   *
   * Usage: include("XMLHttpRequest.js") and use XMLHttpRequest per W3C specs.
   *
   * @author Dan DeFelippi <dan@driverdan.com>
   * @contributor David Ellis <d.f.ellis@ieee.org>
   * @license MIT
   *)

negotiator/index.js:
  (*!
   * negotiator
   * Copyright(c) 2012 Federico Romero
   * Copyright(c) 2012-2014 Isaac Z. Schlueter
   * Copyright(c) 2015 Douglas Christopher Wilson
   * MIT Licensed
   *)

mime-db/index.js:
  (*!
   * mime-db
   * Copyright(c) 2014 Jonathan Ong
   * Copyright(c) 2015-2022 Douglas Christopher Wilson
   * MIT Licensed
   *)

mime-types/index.js:
  (*!
   * mime-types
   * Copyright(c) 2014 Jonathan Ong
   * Copyright(c) 2015 Douglas Christopher Wilson
   * MIT Licensed
   *)

accepts/index.js:
  (*!
   * accepts
   * Copyright(c) 2014 Jonathan Ong
   * Copyright(c) 2015 Douglas Christopher Wilson
   * MIT Licensed
   *)

base64id/lib/base64id.js:
  (*!
   * base64id v0.1.0
   *)

engine.io/build/parser-v3/utf8.js:
  (*! https://mths.be/utf8js v2.1.2 by @mathias *)

cookie/index.js:
  (*!
   * cookie
   * Copyright(c) 2012-2014 Roman Shtylman
   * Copyright(c) 2015 Douglas Christopher Wilson
   * MIT Licensed
   *)

object-assign/index.js:
  (*
  object-assign
  (c) Sindre Sorhus
  @license MIT
  *)

vary/index.js:
  (*!
   * vary
   * Copyright(c) 2014-2017 Douglas Christopher Wilson
   * MIT Licensed
   *)
*/
