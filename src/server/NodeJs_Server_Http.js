//! REPLACE_BY("// Copyright 2015 Claude Petit, licensed under Apache License version 2.0\n")
// dOOdad - Class library for Javascript (BETA) with some extras (ALPHA)
// File: NodeJs_Server.js - Server tools extension for NodeJs
// Project home: https://sourceforge.net/projects/doodad-js/
// Trunk: svn checkout svn://svn.code.sf.net/p/doodad-js/code/trunk doodad-js-code
// Author: Claude Petit, Quebec city
// Contact: doodadjs [at] gmail.com
// Note: I'm still in alpha-beta stage, so expect to find some bugs or incomplete parts !
// License: Apache V2
//
//	Copyright 2015 Claude Petit
//
//	Licensed under the Apache License, Version 2.0 (the "License");
//	you may not use this file except in compliance with the License.
//	You may obtain a copy of the License at
//
//		http://www.apache.org/licenses/LICENSE-2.0
//
//	Unless required by applicable law or agreed to in writing, software
//	distributed under the License is distributed on an "AS IS" BASIS,
//	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//	See the License for the specific language governing permissions and
//	limitations under the License.
//! END_REPLACE()

(function() {
	var global = this;

	global.DD_MODULES = (global.DD_MODULES || {});
	global.DD_MODULES['Doodad.NodeJs.Server.Http'] = {
		type: null,
		version: '0d',
		namespaces: null,
		dependencies: [
			'Doodad', 'Doodad.IO', 'Doodad.Tools.Mime', 'Doodad.Tools.Locale', 'Doodad.Tools.Dates', 'Doodad.Server', 
			'Doodad.Server.Http', 'Doodad.NodeJs', 'Doodad.NodeJs.IO', 'Doodad.IO.Minifiers', 'Doodad.Templates.Html'
		],

		create: function create(root, /*optional*/_options) {
			"use strict";

			const doodad = root.Doodad,
				types = doodad.Types,
				tools = doodad.Tools,
				files = tools.Files,
				namespaces = doodad.Namespaces,
				mime = tools.Mime,
				locale = tools.Locale,
				dates = tools.Dates,
				mixIns = doodad.MixIns,
				interfaces = doodad.Interfaces,
				extenders = doodad.Extenders,
				io = doodad.IO,
				ioInterfaces = io.Interfaces,
				ioMixIns = io.MixIns,
				nodejs = doodad.NodeJs,
				nodejsIO = nodejs.IO,
				server = doodad.Server,
				serverInterfaces = server.Interfaces,
				http = server.Http,
				httpInterfaces = http.Interfaces,
				httpMixIns = http.Interfaces,
				nodejsServer = nodejs.Server,
				nodejsHttp = nodejsServer.Http,
				minifiers = io.Minifiers,
				templates = doodad.Templates,
				templatesHtml = templates.Html,
				
				nodeFs = require('fs');

			
			const __Internal__ = {
				enUSLocale: null,
			};

			// TODO: 
			// 1) (todo) Setup page: IPs, Ports, Base URLs, Fall-back Pages (html status), Max number of processes, Storage Manager location
			// 3) (working on) Static files : Base URL (done), file(done)/folder (todo), alias (done), Verbs (done), in/out process option (todo), mime type (auto or custom) (done), charset (todo), metadata (if text/html) (todo)
			// 4) (todo) Dynamic files : Base URL, Page class, Verbs, in/out process option, mime type ('text/html' or custom), charset, metadata (if text/html)
			// 5) (todo) Session and Shared Data Storage: Storage Manager Server, Storage Type Class (Pipes (Streams), RAM, Files, DB, ...), Data passed with JSON
			// 6) (todo) User/Password/Permissions
					

			nodejsHttp.REGISTER(http.Request.$extend(
			{
				$TYPE_NAME: 'Request',
				
				currentPage: doodad.PUBLIC(doodad.READ_ONLY(null)),
				rejected: doodad.PUBLIC(doodad.READ_ONLY(true)),
				rejectPage: doodad.PUBLIC(doodad.READ_ONLY(null)),
				rejectData: doodad.PUBLIC(doodad.READ_ONLY(null)),
				
				nodeJsRequest: doodad.PUBLIC(doodad.READ_ONLY(null)),
				nodeJsResponse: doodad.PUBLIC(doodad.READ_ONLY(null)),

				startTime: doodad.PROTECTED(null),
				
				__redirectsCount: doodad.PROTECTED(0),
				
				$__actives: doodad.PROTECTED(doodad.TYPE(0)),
				
				$getStats: doodad.PUBLIC(doodad.TYPE(function() {
					// TODO: More stats (like "requests per second")
					return {
						actives: this.$__actives,
					};
				})),
				
				create: doodad.OVERRIDE(function create(server, nodeJsRequest, nodeJsResponse) {
					this.startTime = process.hrtime();
					
					this._super();
					
					types.getType(this).$__actives++;
					
					this.setAttributes({
						server: server,
						nodeJsRequest: nodeJsRequest,
						nodeJsResponse: nodeJsResponse,
						verb: nodeJsRequest.method.toLowerCase(),
						url: tools.Url.parse(nodeJsRequest.url),
						headers: nodeJsRequest.headers,
					});
					
					this.__redirectsCount = parseInt(this.url.args.get('redirects', true));
					if (!types.isFinite(this.__redirectsCount) || (this.__redirectsCount < 0)) {
						this.__redirectsCount = 0;
					};
				}),
				
				destroy: doodad.OVERRIDE(function destroy() {
					try {
						this.close();
					} catch(ex) {
					};

					types.getType(this).$__actives--;
					
					this._super();
				}),
				
				startBodyTransfer: doodad.OVERRIDE(function startBodyTransfer(callback) {
					root.DD_ASSERT && root.DD_ASSERT(!this.requestStream, "Transfer already started.");
					
					let requestStream = null;
					if (types.isImplemented(this.currentPage, 'createRequestStream')) {
						requestStream = this.currentPage.createRequestStream(this);
					};
					if (!requestStream) {
						requestStream = new nodejsIO.BinaryInputStream(this.nodeJsRequest);
					};
					this.setAttribute('requestStream', requestStream);
					
					requestStream.onReady.attach(this.currentPage, callback);
					requestStream.listen();
				}),
				
				proceed: doodad.PUBLIC(function proceed(page) {
					if (this.currentPage && (this.currentPage !== page)) {
						this.currentPage.destroy();
					};
					this.setAttribute('currentPage', page);
					
					page.execute(this);
				}),
				
				end: doodad.OVERRIDE(function end() {
					this.sendHeaders();
					if (this.responseStream) {
						// Will write headers, flush content, end request and close
						this.sendTrailers();
					} else {
						this.close(true);
					};
					
					throw new server.EndOfRequest();
				}),

				close: doodad.OVERRIDE(function close(/*optional*/forceDisconnect) {
					if (this.nodeJsResponse) {
						this.sanitize();

						this.onEnd(new doodad.Event());

						if (forceDisconnect) {
							this.nodeJsResponse.destroy();
							this.nodeJsRequest.destroy();
						} else {
							if (this.responseStream) {
								this.responseStream.write(io.EOF);
								this.responseStream.flush();
							};
						};

						if (this.currentPage) {
							this.currentPage.destroy();
						};
						
						this.responseStream && this.responseStream.destroy();
						this.requestStream && this.requestStream.destroy();
						
						this.setAttributes({
							nodeJsRequest: null,
							nodeJsResponse: null,
							currentPage: null,
							requestStream: null,
							responseStream: null,
						});
					};
					
					throw new server.RequestClosed();
				}),

				addHeaders: doodad.OVERRIDE(function addHeaders(headers) {
					const responseHeaders = this.responseHeaders;
					tools.forEach(headers, function(value, name) {
						responseHeaders[tools.title(name, '-')] = value;
					});
				}),
				
				addTrailers: doodad.OVERRIDE(function addTrailers(trailers) {
					const responseTrailers = this.responseTrailers;
					tools.forEach(trailers, function(value, name) {
						responseTrailers[tools.title(name, '-')] = value;
					});
				}),

				clearHeaders: doodad.OVERRIDE(function clearHeaders(/*optional*/names) {
					if (!this.headersSent) {
						const stream = this.nodeJsResponse;
						if (names) {
							if (!types.isArray(names)) {
								names = [names];
							};
							for (let i = 0; i < names.length; i++) {
								let name = tools.title(names[i], '-');
								stream.removeHeader(name);
								delete this.responseHeaders[name];
								delete this.responseTrailers[name];
							};
						} else {
							tools.forEach(this.responseHeaders, function(value, name) {
								stream.removeHeader(name);
							});
							this.setAttributes({
								responseHeaders: {},
								responseTrailers: {},
							});
						};
					};
				}),
				
				sendHeaders: doodad.OVERRIDE(function sendHeaders(/*<<< [optional]message, [optional]status, [optional]headers*/) {
					if (!this.headersSent) {
						this.setAttribute('headersSent', true);

						const argsLen = arguments.length;
							
						this.addHeaders(arguments[argsLen - 1]);
							
						let headers = this.responseHeaders; // ??? 'const' doesn't work
						const message = arguments[argsLen - 3] || this.responseMessage;
							
						let status = arguments[argsLen - 2] || this.responseStatus;
						
						if (status || !types.isEmpty(headers)) {
							status = status || http.StatusCodes.OK;
							if (message) {
								this.nodeJsResponse.writeHead(status, message, headers);
							} else {
								this.nodeJsResponse.writeHead(status, headers);
							};
						};
						
						this.responseStatus = status;
						this.responseMessage = message;

						let responseStream = null;
						if (types.isImplemented(this.currentPage, 'createResponseStream')) {
							responseStream = this.currentPage.createResponseStream(this);
						};
						if (!responseStream) {
							responseStream = new nodejsIO.BinaryOutputStream(this.nodeJsResponse, {autoFlush: true});
						};
						this.setAttribute('responseStream', responseStream);
					};
				}),
				
				sendTrailers: doodad.OVERRIDE(function sendTrailers(/*optional*/trailers) {
					if (!this.trailersSent) {
						this.setAttribute('trailersSent', true);
							
						this.sendHeaders(); // must write headers before
						
						this.responseStream.flush({callback: new http.RequestCallback(this, this, function flushCallback() {
							this.addTrailers(trailers);

							trailers = this.responseTrailers;
							
							if (!types.isEmpty(trailers)) {
								this.nodeJsResponse.addTrailers(trailers);
							};
							
							this.close();
						})});
					};
				}),
				
				clear: doodad.OVERRIDE(function clear() {
					if (!this.headersSent) {
						this.clearHeaders();
					};
					if (this.responseStream) {
						this.responseStream.clear();
					};
				}),
				
				respondWithStatus: doodad.OVERRIDE(function respondWithStatus(/*optional*/status, /*optional*/message, /*optional*/headers, /*optional*/data) {
					this.clear();
					
					if (!this.headersSent) {
						this.addHeaders(headers);

						this.responseStatus = status;
						this.responseMessage = message;
						this.customData.statusData = data;
						
						this.sendHeaders();
						
						this.onStatus(new doodad.Event());
					};
					
					this.end();
				}),
				
				respondWithError: doodad.OVERRIDE(function respondWithError(ex) {
					this.clear();
					this.onError(new doodad.ErrorEvent(ex));
					if (this.headersSent) {
						this.end();
					} else {
						this.respondWithStatus(http.StatusCodes.InternalError, null, null, ex);
					};
				}),

				redirectClient: doodad.OVERRIDE(function redirectClient(url, /*optional*/isPermanent) {
					const maxRedirects = types.get(this.server.options, 'maxRedirects', 5);
					if (this.headersSent) {
						throw new types.Error("Unable to redirect because HTTP headers are already sent.");
					} else if (this.__redirectsCount >= maxRedirects) {
						this.reject();
					} else {
						this.__redirectsCount++;
						if (types.isString(url)) {
							url = tools.Url.parse(url);
						};
						const status = (isPermanent ? http.StatusCodes.MovedPermanently : http.StatusCodes.TemporaryRedirect);
						this.respondWithStatus(status, null, {
							'Location': url.toString({
								args: {
									redirects: this.__redirectsCount,
								},
							}),
						});
					};
				}),
				
				redirectServer: doodad.OVERRIDE(function redirectServer(url) {
					const maxRedirects = types.get(this.server.options, 'maxRedirects', 5);
					if (this.headersSent) {
						throw new types.Error("Unable to redirect because HTTP headers are already sent.");
					} else if (this.__redirectsCount >= maxRedirects) {
						this.reject();
					} else {
						this.clear();
						this.__redirectsCount++;
						if (types.isString(url)) {
							url = tools.Url.parse(url);
						};
						this.setAttribute('url', url);
						this.proceed(this.currentPage);
					};
				}),
				
				reject: doodad.OVERRIDE(function reject(/*optional*/rejectData, /*optional*/page) {
					this.setAttributes({
						rejected: true,
						rejectPage: this.currentPage,
						rejectData: rejectData,
					});
					if (!page) {
						page = this.mapping.nextSibling();
					};
					if (page) {
						this.proceed(page);
					} else {
						this.close(true);
					};
				}),
				
				getTime: doodad.PUBLIC(function getTime() {
					const time = process.hrtime(this.startTime);
					return (time[0] * 1000) + (time[1] / 1e6);
				}),
				
				getSource: doodad.PUBLIC(function getSource() {
					// TODO: Add more informations
					return {
						address: this.nodeJsRequest.socket.remoteAddress,
					};
				}),
			}));
			
			nodejsHttp.REGISTER(http.Server.$extend(
			{
				$TYPE_NAME: 'Server',

				__nodeServer: doodad.PROTECTED(doodad.READ_ONLY()),
				__address: doodad.PROTECTED(doodad.READ_ONLY()),
				__listening: doodad.PROTECTED(false),
				
				onNodeRequest: doodad.PROTECTED(function onRequest(request, response) {
					if (this.__listening) {
						request = new nodejsHttp.Request(this, request, response);
						
						const ev = new doodad.Event({
								request: request,
							});
							
						this.onNewRequest(ev);
							
						if (!ev.prevent) {
							const callback = new http.RequestCallback(request, this, function() {
								const page = this.pageFactory.createPage(request);
								if (page) {
									request.proceed(page);
								} else {
									request.close(true);
								};
							});
							callback();
						};
					};
				}),
				
				//onNodeConnect: doodad.PROTECTED(function onNodeConnect(request, socket, head) {
				//}),
				//onNodeConnectHandler: doodad.PROTECTED(null),
				
				onNodeListening: doodad.PROTECTED(function onNodeListening() {
					this.__listening = true;
					this.setAttribute('__address', this.__nodeServer.address());
					tools.log(tools.LogLevels.Info, "HTTP server listening on port '~port~', address '~address~'.", this.__address);
					tools.log(tools.LogLevels.Warning, "IMPORTANT: It is an experimental and not finished software. Don't use it on production, or do it at your own risks. Please report bugs and suggestions to 'doodadjs [at] gmail <dot> com'.");
				}),
				onNodeListeningHandler: doodad.PROTECTED(null),

				onNodeError: doodad.PROTECTED(function onNodeError(ex) {
					this.onError(new doodad.ErrorEvent(ex));
				}),
				onNodeErrorHandler: doodad.PROTECTED(null),
				
				onNodeClose: doodad.PROTECTED(function onNodeClose() {
					if (this.__listening) {
						this.__listening = false;

						const server = this.__nodeServer;
						
						server.removeListener('listening', this.onNodeListeningHandler);
						this.onNodeListeningHandler = null;
						
						server.removeListener('error', this.onNodeErrorHandler);
						this.onNodeErrorHandler = null;
						
						server.removeListener('close', this.onNodeCloseHandler);
						this.onNodeCloseHandler = null;
						
						//if (this.onNodeConnectHandler) {
						//	server.removeListener('connect', this.onNodeConnectHandler);
						//	this.onNodeConnectHandler = null;
						//};
						
						tools.log(tools.LogLevels.Info, "Listening socket closed (address '~address~', port '~port~').", this.__address);

						this.setAttribute('__nodeServer', null);
					};
				}),
				onNodeCloseHandler: doodad.PROTECTED(null),
				
				listen: doodad.OVERRIDE(function listen(/*optional*/options) {
					if (!options) {
						options = {};
					};
					
					const protocol = types.get(options, 'protocol', 'http');
					let factory;
					if ((protocol === 'http') || (protocol === 'https')) {
						factory = require(protocol);
					} else {
						throw new doodad.Error("Invalid protocol : '~0~'.", [protocol]);
					};
					
					let server;
					if (protocol === 'https') {
						// TODO: Implement other available options
						// TODO: Ask for private key's passphrase from the terminal if encrypted and decrypt the key.
						const opts = {};
						if (types.get(options, 'pfxFile')) {
							opts.pfx = nodeFs.readFileSync(options.pfxFile);
						} else if (types.get(options, 'rawPfx')) {
							opts.pfx = options.rawPfx;
						} else {
							if (types.get(options, 'keyFile')) {
								opts.key = nodeFs.readFileSync(options.keyFile);
							} else if (types.get(options, 'rawKey')) {
								opts.key = options.rawKey;
							} else {
								throw new types.Error("Missing private key file.");
							};
							if (types.get(options, 'certFile')) {
								opts.cert = nodeFs.readFileSync(options.certFile);
							} else if (types.get(options, 'rawCert')) {
								opts.cert = options.rawCert;
							} else {
								throw new types.Error("Missing certificate file.");
							};
						};
						if (!opts.pfx && !opts.key && !opts.cert) {
							throw new types.Error("Missing private key and certificate files.");
						};
						server = factory.createServer(opts, new doodad.Callback(this, 'onNodeRequest'));
					} else {
						server = factory.createServer(new doodad.Callback(this, 'onNodeRequest'));
					};
					
					this.onNodeListeningHandler = new doodad.Callback(this, 'onNodeListening');
					server.on('listening', this.onNodeListeningHandler);

					this.onNodeErrorHandler = new doodad.Callback(this, 'onNodeError');
					server.on('error', this.onNodeErrorHandler);

					this.onNodeCloseHandler = new doodad.Callback(this, 'onNodeClose');
					server.on('close', this.onNodeCloseHandler);

					//if (types.get(options, 'acceptConnect', false)) {
					//	this.onNodeConnectHandler = new doodad.Callback(this, 'onNodeConnect');
					//	server.on('connect', this.onNodeConnectHandler);
					//};
					
					//server.on('connection');
					//server.on('checkContinue');
					//server.on('upgrade');
					//server.on('clientError');
					
					this.setAttribute('__nodeServer', server);
					
					const target = types.get(options, 'target', '127.0.0.1');
					const type = types.get(options, 'type', 'tcp', false); // 'tcp', 'unix', 'handle'
					if (type === 'tcp') { // TCP/IP Socket
						const port = types.get(options, 'port', (protocol === 'https' ? 443 : 80));
						const queueLength = types.get(options, 'queueLength', undefined);
						if (root.DD_ASSERT) {
							root.DD_ASSERT(types.isString(target), "Invalid target.");
							root.DD_ASSERT(types.isInteger(port) && (port >= 0) && (port <= 65535), "Invalid port.");
							root.DD_ASSERT(types.isNothing(queueLength) || (types.isInteger(queueLength) && (queueLength > 0)), "Invalid queue length.");
						};
						server.listen(port, target, queueLength);
					} else if (type === 'unix') { // Unix Socket
						root.DD_ASSERT && root.DD_ASSERT(types.isString(target), "Invalid target.");
						server.listen(target);
					} else if (type === 'handle') { // System Handle
						root.DD_ASSERT && root.DD_ASSERT(types.isObject(target) && (('_handle' in target) || ('fd' in target)), "Invalid target.");
						server.listen(target);
					} else {
						throw new doodad.Error("Invalid target type option : '~0~'.", [type]);
					};
				}),
				stopListening: doodad.OVERRIDE(function stopListening() {
					if (this.__listening) {
						this.__nodeServer.close();
					};
				}),
			}));
			
			nodejsHttp.REGISTER(doodad.BASE(templatesHtml.PageTemplate.$extend(
			{
				$TYPE_NAME: 'FolderPageTemplate',

				path: doodad.PROTECTED(null),
				files: doodad.PROTECTED(null),
				
				create: doodad.OVERRIDE(function create(request, path, files) {
					this._super(request);
					this.path = path;
					this.files = files;
				}),
			})));
			
			nodejsHttp.REGISTER(http.StaticPage.$extend(
			{
				$TYPE_NAME: 'StaticPage',

				createResponseStream: doodad.OVERRIDE(function(request) {
					if (request.customData.isFolder) {
						return new nodejsIO.TextOutputStream(request.nodeJsResponse, {autoFlush: true});
					};
				}),
				
				getSystemPath: doodad.PROTECTED(function getSystemPath(request) {
					const url = types.clone(request.url);
					const path = request.mapping.path.combine(url, {
						protocol: 'file',
						path: url.path.slice(request.mapping.level),
						dontThrow: true,
					});
					return path;
				}),
				
				addHeaders: doodad.PROTECTED(function addHeaders(request, path, callback) {
					// TODO: Look at "Accept"
					if (!path) {
						// Path was invalid
						request.respondWithStatus(http.StatusCodes.NotFound);
					};
					nodeFs.stat(path.toString(), new http.RequestCallback(request, this, function statCallback(err, stats) {
						if (err) {
							if (err.code === 'ENOENT') {
								request.respondWithStatus(http.StatusCodes.NotFound);
							} else {
								request.respondWithError(err);
							};
						};
						request.addHeaders({
							'Last-Modified': dates.strftime('%a, %d %b %Y %H:%M:%S GMT', stats.mtime, __Internal__.enUSLocale, true),             // ex.:   Fri, 10 Jul 2015 03:16:55 GMT
						});
						if (stats.isFile()) {
							request.addHeaders({
								'Content-Length': stats.size,
								'Content-Type': mime.getTypes(path.file)[0],
								'Content-Disposition': 'filename=' + path.file,
							});
						} else {
							request.addHeaders({
								'Content-Type': 'text/html',
							});
						};
						callback.call(this, stats);
					}));
				}),

				sendFile: doodad.PROTECTED(function sendFile(request, path, stats) {
					request.customData.isFolder = false;
					const fileSize = stats.size;
					if (fileSize <= 0) {
						// Empty file
						request.end();
					} else {
						nodeFs.open(path.toString(), 'r', undefined, new http.RequestCallback(request, this, function openFileCallback(err, fd) {
							if (err) {
								request.respondWithError(err);
							};
							request.onSanitize.attachOnce(null, function() {
								nodeFs.close(fd);
							});
							request.sendHeaders();
							// TODO: Get file-system cluster size or get read-cache size or something else
							let count = 0;
							const read = function readInternal() {
								const buf = new Buffer(Math.min(fileSize, 4096));
								nodeFs.read(fd, buf, 0, buf.length, count, new http.RequestCallback(request, this, function readFileCallback(err, bytesRead) {
									if (err) {
										request.respondWithError(err);
									};
									if (bytesRead) {
										count += bytesRead;
										request.responseStream.write(buf.slice(0, bytesRead), {callback: new http.RequestCallback(request, this, function() {
											if (count >= fileSize) {
												request.end();
											} else {
												read.apply(this);
											};
										})});
									} else {
										request.end();
									};
								}));
							};
							read.apply(this);
						}));
					};
				}),
				
				sendFolder: doodad.PROTECTED(function sendFile(request, path, stats) {
					request.customData.isFolder = true;
					if (path.file) {
						request.redirectClient(request.url.pushFile());
					};
					if (request.url.args.has('res')) {
						request.clearHeaders();
						path = request.mapping.templateFolder.combine('./public/' + request.url.args.get('res'), {isRelative: true, os: 'linux'});
						this.addHeaders(request, path, function statCallback(stats) {
							if (stats.isFile()) {
								this.sendFile(request, path, stats);
							} else {
								request.reject(stats);
							};
						});
						return;
					};
					request.sendHeaders();
					files.readdir(path, {async: true})
						.then(new tools.PromiseCallback(this, function(files) {
							files.sort(function(file1, file2) {
								const n1 = file1.name.toUpperCase(),
									n2 = file2.name.toUpperCase();
								if ((!file1.isFolder && file2.isFolder) || (n1 > n2)) {
									return 1;
								} else if ((file1.isFolder && !file2.isFolder) || (n1 < n2)) {
									return -1;
								} else {
									return 0;
								};
							});
							return templatesHtml.getTemplate(request.mapping.templateFolder)
								.then(new tools.PromiseCallback(this, function(templ) {
									templ = new templ(request, path, files);
									templ.render(request.responseStream);
									return templ.renderPromise
										['finally'](new tools.PromiseCallback(this, function() {
											templ.destroy();
										}));
								}))
								['catch'](function(ex) {
									request.respondWithError(ex);
								});
						}))
						.then(new tools.PromiseCallback(this, function() {
							request.end();
						}))
						['catch'](function(ex) {
							request.respondWithError(ex);
						});
				}),
				
				execute_HEAD: doodad.OVERRIDE(function execute_HEAD(request) {
					const path = this.getSystemPath(request);
					this.addHeaders(request, path, function addHeadersCallback(stats) {
						request.end();
					});
				}),
				
				execute_GET: doodad.OVERRIDE(function execute_GET(request) {
					// TODO: Client cache
					// TODO: Range
					const path = this.getSystemPath(request);
					this.addHeaders(request, path, function addHeadersCallback(stats) {
						if (stats.isFile()) {
							this.sendFile(request, path, stats);
						} else if (request.mapping.showFolders && request.mapping.templateFolder && templatesHtml.isAvailable()) {
							this.sendFolder(request, path, stats);
						} else {
							request.reject(stats);
						};
					});
				}),
				
			}));

			nodejsHttp.REGISTER(nodejsHttp.StaticPage.$extend(
			{
				$TYPE_NAME: 'JavascriptPage',
				
				$__cache: doodad.PROTECTED(doodad.TYPE(  {}  )),
				
				createResponseStream: doodad.REPLACE(function(request) {
					const outputStream = new nodejsIO.TextOutputStream(request.nodeJsResponse, {autoFlush: true}),
						type = types.getType(this),
						cachedFile = types.get(type.$__cache, request.customData.cacheKey);
					if (cachedFile.ready) {
						return outputStream;
					} else {
						const jsStream = new minifiers.Javascript(),
							directives = request.mapping.directives;
						jsStream.onWrite.attach(null, new http.RequestCallback(request, this, function(ev) {
							const data = ev.data;
							if (data.raw instanceof Buffer) {
								data.raw = data.raw.toString('utf8');
							};
						}));
						jsStream.onFlush.attach(null, new http.RequestCallback(request, this, function(ev) {
							const data = ev.data;
							outputStream.flush(data.options);
						}));
						jsStream.onReady.attach(null, new http.RequestCallback(request, this, function(ev) {
							const data = ev.data;
							if (data.raw === io.EOF) {
								outputStream.write(io.EOF, data.options);
								cachedFile.ready = true;
							} else {
								outputStream.write(data.text, data.options);
								const fd = cachedFile.fd;
								if (fd) {
									nodeFs.writeSync(fd, data.text);
								};
							};
							ev.preventDefault();
						}));
						jsStream.listen();
						if (directives) {
							for (let i = 0; i < directives.length; i++) {
								jsStream.runDirective(directives[i]);
							};
						};
						jsStream.define('PACKAGE_CONFIG', types.toSource(root.getConfig() || {}, Infinity));
						return jsStream;
					};
				}),

				getSystemPath: doodad.OVERRIDE(function getSystemPath(request) {
					let path = this._super(request);
					if (path) {
						const type = types.getType(this),
							key = path.toString();
						request.customData.fileName = path.file;
						request.customData.cacheKey = key;
						let cached = types.get(type.$__cache, key);
						if (cached && cached.ready) {
							path = cached.path;
						} else if (!cached && request.mapping.cachePath) {
							// TODO: Generate a new UUID if file already exists
							const cacheFilePath = request.mapping.cachePath.combine(null, {file: tools.generateUUID()});
							type.$__cache[key] = {
								path: cacheFilePath,
								ready: false,
								fd: nodeFs.openSync(cacheFilePath.toString(), 'wx', 0o644),
							};
							request.onSanitize.attachOnce(null, new http.RequestCallback(request, this, function() {
								const cached = types.get(type.$__cache, key);
								if (cached) {
									const fd = cached.fd;
									if (fd) {
										nodeFs.close(fd);
										delete cached.fd;
									};
								};
							}));
						};
					};
					return path;
				}),
				
				addHeaders: doodad.OVERRIDE(function addHeaders(request, path, callback) {
					//const type = types.getType(this);
					this._super(request, path, function(stats) {
						//const cached = types.get(type.$__cache, request.customData.cacheKey);
						//if (!cached || !cached.ready) {
							request.clearHeaders('Content-Length');
						//};
						request.addHeaders({
							'Content-Type': mime.getTypes(request.customData.fileName)[0],
							'Content-Disposition': 'filename=' + request.customData.fileName,
						});
						callback.call(this, stats);
					});
				}),
			}));


			return function init(/*optional*/options) {
				locale.loadLocale('en_US').finally(new namespaces.ReadyCallback(null, function(locale) {
					__Internal__.enUSLocale = locale;
				}));
			};
		},
	};
})();