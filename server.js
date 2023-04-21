const fs = require('fs');
const http2 = require('http2');
const http = require('http');
const path = require('path').posix;

class WebServer extends require('events') {
   /**
    * The working directory for the server.
    * @type {string} @readonly
    */
   #wd;

   /**
    * The secure server.
    * @type {http2.Http2SecureServer}
    */
   #secureServer;

   /**
    * The unsecure http server.
    * @type {http.Server}
    */
   #unsecureServer;

   /**
    * If the api endpoints are allowed to be used on unsecure connections.
    * @type {boolean}
    */
   #unsecureApi;

   /**
    * a map containing api calls linked to their endpoints.
    * @type {Map<HttpMethods, Map<string, APICallback>>}
    */
   #apiBinds = new Map();

   /**
    * Creates a new web server.
    * @param {WebServerOptions} WebServerOptions 
    */
   constructor({
      workingDirectory = './site',
      secureOptions = {},
      unsecureOptions = {},
      secureRun = true,
      unsecureRun = true,
      unsecureApi = false,
      securePorts = [441],
      unsecurePorts = [80],
   } = {}) {
      // getting the working directory and ensuring it ends without a backslash.
      let wd = path.normalize(workingDirectory);
      this.#wd = wd.slice(-1) === '/' ? wd.slice(0, -1): wd;

      // creating the working directory for the static web files.
      fs.promises.mkdir(this.#wd, {recursive: true});

      // sets the unsecure api setting.
      this.#unsecureApi = unsecureApi;

      // starting the http servers.
      if (secureRun) {
         this.#secureServer = http2.createSecureServer(secureOptions, this.#onRequest.bind(this, true));
         for (let i of securePorts) this.#secureServer.listen(i);
      }

      if (unsecureRun) {
         this.#unsecureServer = http.createServer(unsecureOptions, this.#onRequest.bind(this, false));
         for (let i of unsecurePorts) this.#unsecureServer.listen(i);
      }
   }

   /**
    * Adds an api call to an endpoint.
    * @param {HttpMethods} method The method the endpoint uses. Case Sensitive
    * @param {string} endpoint The unencoded endpoint to set the request to. Case Insensitive
    * @param {APICallback} callback The function to call when the endpoint is requested.
    */
   addApiListener(method, endpoint, callback) {
      // getting the method map.
      let endpoints = this.#apiBinds.get(method);

      // if the method doesnt exist create and set the map for it.
      if (!endpoints) {
         endpoints = new Map();
         this.#apiBinds.set(method, endpoints);
      }

      // setting the api endpoint and callback.
      endpoints.set(endpoint.toLowerCase(), callback);
   }

   /**
    * Removes an api from the callback.
    * @param {HttpMethods} method The method the endpoint uses. Case Sensitive
    * @param {string} endpoint The endpoint to remove from api callbacks. Case Insensitive
    */
   removeApiListener(method, endpoint) {
      // gets and checks that the api exists for the method.
      let endpoints = this.#apiBinds.get(method);
      if (endpoints) {
         // deturmining to remove one item or the whole method.
         if (endpoints.size() > 1) {
            endpoints.delete(endpoint.toLowerCase());
         } else {
            this.#apiBinds.delete(method);
         }
      }
   }

   /**
    * When the server recieves a request.
    * @param {boolean} secure If the request was made over a secure connection.
    * @param {HttpRequest} request The http request.
    * @param {HttpResponse} response The http response.
    */
   async #onRequest(secure, request, response) {
      let pos = request.url.search(/'?'|'#'/),
          p = decodeURIComponent(pos < 0 ? request.url: request.url.slice(0, pos));

      // checks and calls the given api. and if it is called the connection is ended.
      if ((secure || this.#unsecureApi) && await this.#callAPI(request.method, p, request, response)) return;

      // if a dta is detected close the connection.
      if (this.#dtaDetection(p, request)) {
         response.writeHead(422).end();
         response.socket.end();
         return;
      }

      // attempting to read the file.
      let rs = fs.createReadStream(this.#wd + p);

      // if an error occurs close the request.
      rs.on('error', (err) => {
         response.statusCode = 404;
         if (!response.closed) response.end();
      });

      // ensuring the request closes when stream ends.
      rs.on('close', () => {
         if (!response.closed) response.end();
      });

      // piping the file to the response.
      rs.pipe(response);
   }

   /**
    * Detects and logs directory transversal attacks.
    * @param {string} p The decoded url of the request
    * @param {HttpRequest} request The http request.
    * @returns {boolean} If a dta was detected.
    */
   #dtaDetection(p, request) {
      let attack = false;

      // detecting dta
      if (/(^[\/])|(\/\.\.\/)|[\%\\]/.test(p)) {
         // grabbing the attackers information to log.
         let attacker = {
            ip: request.socket.remoteAddress,
            port: request.socket.remotePort,
            path: request.url,
            method: request.method,
            headers: request.headers,
            date: Date().toString(),
         }

         // logging/triggering event for a dta.
         if (this.listenerCount('dta') > 0) {
            this.emit('dtd', attacker);
         } else {
            console.warn(`directory transversal attack attempted\nAttacker: ${JSON.stringify(attacker)}`);
         }

         attack = true;
      }

      return attack;
   }

   /**
    * Checks and attempts to call the matching api.
    * @param {HttpMethods} method The method to get.
    * @param {string} p The path of the request.
    * @param {HttpRequest} request The http request.
    * @param {HttpResponse} response The http resposne.
    * @type {boolean} If the api call exists
    */
   async #callAPI(method, p, request, response) {
      let cb = this.#apiBinds.get(method),
          called = false;

      // attempts to get the callback.
      if (cb) {
         cb = cb.get(p);
         if (cb) {
            // if the callback exists use it
            called = true;

            try {
               await cb(request, response);
               // setting an response code just in case the request is still open.
               response.statusCode = 200;
            } catch (err) {
               // setting an response code just in case the request is still open.
               response.statusCode = 500;
   
               // emit/log the error.
               if (this.listenerCount('error') > 0) {
                  this.emit(err);
               } else {
                  console.log(err);
               }
            }

            // if the request is still active close it.
            if (!response.closed) {
               if (!response.closed) response.end();
            }
         }
      }

      return called;
   }

   /**
    * Closes the web server.
    */
   close() {
      if (this.#secureServer) this.#secureServer.close();
      if (this.#unsecureServer) this.#unsecureServer.close();

      this.emit('close');
   }
}

module.exports = WebServer;

/**
 * @typedef {"CONNECT"|"DELETE"|"GET"|"HEAD"|"OPTIONS"|"PATCH"|"POST"|"PUT"|"TRACE"} HttpMethods Http Methods
 * @typedef {http2.Http2ServerRequest|http.IncomingMessage} HttpRequest An http Request.
 * @typedef {http2.Http2ServerResponse|http.ServerResponse} HttpResponse An Http Response
 */

/**
 * @callback APICallback Callbacks on the webserver.
 * @param {HttpRequest} request The http request.
 * @param {HttpResponse} response The http response.
 * @returns {Promise<void>}
 */

/**
 * @typedef {Object} WebServerOptions Options for the webserver.
 * @property {string} [workingDirectory] The working directory for the server.
 * @property {http2.SecureServerOptions} [secureServerOptions] The options for the secure http server.
 * @property {http.ServerOptions} [serverOptions] The options for the unsecure http server.
 * @property {boolean} [secureRun] Should the secure http server be ran?
 * @property {boolean} [unsecureRun] Should the unsecure http server be ran?
 * @property {boolean} [unsecureApi] Should the unsecure http server be able to use api endpoints and callbacks?
 * @property {number[]} [securePorts] The ports the secure http server will listen on.
 * @property {number[]} [unsecurePorts] The ports the unsecure http server will listen on.
 */
