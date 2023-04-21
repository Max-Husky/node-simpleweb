Just an overly simple webserver supporting both http and https.

# WebServer
## Constructors
### `WebServer(WebServerOptions)`
- `WebServerOptions` [`<Object>`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)
  - `workingDirectory` [`<string>`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type) The working directory for the server. *Default: **"./site"***
  - `secureServerOptions` [`<Http2.SecureServerOptions>`](https://nodejs.org/dist/latest-v18.x/docs/api/http2.html#http2createsecureserveroptions-onrequesthandler) The options for the secure http server.
  - `serverOptions` [`<http.ServerOptions>`](https://nodejs.org/dist/latest-v18.x/docs/api/http.html#httpcreateserveroptions-requestlistener) The options for the unsecure http server.
  - `secureRun` [`<boolean>`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#boolean_type) Should the secure http server be ran? *Default: **true***
  - `unsecureRun` [`<boolean>`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#boolean_type) Should the unsecure http server be ran? *Default: **true***
  - `unsecureApi` [`<boolean>`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#boolean_type) Should the unsecure http server be able to use api endpoints and callbacks? *Default: **false***
  - `securePorts` [`<number[]>`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#number_type) The ports the secure http server will listen on. *Default: **[441]***
  - `unsecurePorts` [`<number[]>`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#number_type) The ports the unsecure http server will listen on. *Default: **[80]***

Returns: [`<WebServer>`](#WebServer)

Creates and starts the webserver.

## Events
### `close`
### `error`

## Methods
### `close()`
Closes the http servers then emits the close event.
### `addApiListener(method, endpoint, callback)`
- `method` [`<string>`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type) The method the endpoint uses. **Case Sensitive**
- `endpoint` [`<string>`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type) The unencoded endpoint to set the request to. **Case insensitive**
- `callback` [`<function`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function)[`<Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)[`<void>>>`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#undefined_type) The function to call when the endpoint is requested.
   - `request` [`<http2.Http2ServerRequest`](https://nodejs.org/dist/latest-v18.x/docs/api/http2.html#class-http2http2serverrequest)` | `[`http.IncomingMessage>`](https://nodejs.org/dist/latest-v18.x/docs/api/http.html#class-httpincomingmessage)
   - `response` [`<http2.Http2ServerResponse`](https://nodejs.org/dist/latest-v18.x/docs/api/http2.html#class-http2http2serverresponse)` | `[`http.ServerResponse>`](https://nodejs.org/dist/latest-v18.x/docs/api/http.html#class-httpserverresponse)

Adds a function to be called when the path is requested.
### `removeApiListener(method, endpoint)`
- `method` [`<string>`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type) The method the endpoint uses. **Case Sensitive**
- `endpoint` [`<string>`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type) The unencoded endpoint to set the request to. **Case insensitive**
