//! REPLACE_BY("// Copyright 2016 Claude Petit, licensed under Apache License version 2.0\n")
// dOOdad - Object-oriented programming framework
// File: NodeJs_Server.js - Server tools extension for NodeJs
// Project home: https://sourceforge.net/projects/doodad-js/
// Trunk: svn checkout svn://svn.code.sf.net/p/doodad-js/code/trunk doodad-js-code
// Author: Claude Petit, Quebec city
// Contact: doodadjs [at] gmail.com
// Note: I'm still in alpha-beta stage, so expect to find some bugs or incomplete parts !
// License: Apache V2
//
//	Copyright 2016 Claude Petit
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
	const global = this;

	const exports = {};
	if (typeof process === 'object') {
		module.exports = exports;
	};
	
	exports.add = function add(DD_MODULES) {
		DD_MODULES = (DD_MODULES || {});
		DD_MODULES['Doodad.NodeJs.Server.Http'] = {
			type: null,
			version: '0.2d',
			namespaces: null,
			dependencies: [
				{
					name: 'Doodad.Types', 
					version: '1.1r',
				},
				'Doodad', 
				{
					name: 'Doodad.IO',
					version: '0.2',
				}, 
				'Doodad.Tools.Mime', 
				{
					name: 'Doodad.Tools.Locale',
					version: '1.2',
				}, 
				{
					name: 'Doodad.Tools.Dates',
					version: '1.1',
				}, 
				{
					name: 'Doodad.Server',
					version: '0.2',
				}, 
				{
					name: 'Doodad.Server.Http',
					version: '0.2',
				},
				'Doodad.NodeJs', 
				{
					name: 'Doodad.NodeJs.IO',
					version: '0.2',
				}, 
				{
					name: 'Doodad.IO.Minifiers', 
					version: '0.2',
				},
				'Doodad.Templates.Html',
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
				// 3) (working on) Static files : Base URL (done), file(done)/folder(done), alias (done), Verbs (done), in/out process option (todo), mime type (auto or custom) (done), charset (todo), metadata (if text/html) (todo)
				// 4) (todo) Dynamic files : Base URL, Page class, Verbs, in/out process option, mime type ('text/html' or custom), charset, metadata (if text/html)
				// 5) (todo) Session and Shared Data Storage: Storage Manager Server, Storage Type Class (Pipes (Streams), RAM, Files, DB, ...), Data passed with JSON
				// 6) (todo) User/Password/Permissions
						

				nodejsHttp.REGISTER(http.Request.$extend(
				{
					$TYPE_NAME: 'Request',
					
					__headersWritten: doodad.PROTECTED(false),
					__trailersSent: doodad.PROTECTED(false),
					
					currentPage: doodad.PUBLIC(doodad.READ_ONLY(null)),
					rejected: doodad.PUBLIC(doodad.READ_ONLY(true)),
					rejectPage: doodad.PUBLIC(doodad.READ_ONLY(null)),
					rejectData: doodad.PUBLIC(doodad.READ_ONLY(null)),
					
					nodeJsRequest: doodad.PUBLIC(doodad.READ_ONLY(null)),
					nodeJsResponse: doodad.PUBLIC(doodad.READ_ONLY(null)),

					startTime: doodad.PROTECTED(null),
					
					__redirectsCount: doodad.PROTECTED(0),
					
					$__actives: doodad.PROTECTED(doodad.TYPE(0)),
					$__total: doodad.PROTECTED(doodad.TYPE(0)),
					$__timeStartSecond: doodad.PROTECTED(doodad.TYPE(null)),
					$__timeStartMinute: doodad.PROTECTED(doodad.TYPE(null)),
					$__timeStartHour: doodad.PROTECTED(doodad.TYPE(null)),
					$__lastSecond: doodad.PROTECTED(doodad.TYPE(0)),
					$__lastMinute: doodad.PROTECTED(doodad.TYPE(0)),
					$__lastHour: doodad.PROTECTED(doodad.TYPE(0)),
					$__perSecond: doodad.PROTECTED(doodad.TYPE(0)),
					$__perMinute: doodad.PROTECTED(doodad.TYPE(0)),
					$__perHour: doodad.PROTECTED(doodad.TYPE(0)),
					$__successful: doodad.PROTECTED(doodad.TYPE(0)),
					$__redirected: doodad.PROTECTED(doodad.TYPE(0)),
					$__failed: doodad.PROTECTED(doodad.TYPE(null)),
					
					$getStats: doodad.PUBLIC(doodad.TYPE(function() {
						return {
							actives: this.$__actives,
							total: this.$__total,
							successful: this.$__successful,
							redirected: this.$__redirected,
							failed: this.$__failed,
							perSecond: this.$__perSecond,
							perMinute: this.$__perMinute,
							perHour: this.$__perHour,
						};
					})),
					
					$create: doodad.OVERRIDE(function create() {
						this._super();
						this.$__failed = {};
					}),
					
					create: doodad.OVERRIDE(function create(server, nodeJsRequest, nodeJsResponse) {
						this.setAttributes({
							startTime: process.hrtime(),
							nodeJsRequest: nodeJsRequest,
							nodeJsResponse: nodeJsResponse,
						});

						this._super(server, nodeJsRequest.method, nodeJsRequest.url, nodeJsRequest.headers);
						
						this.__redirectsCount = parseInt(this.url.args.get('redirects', true));
						if (!types.isFinite(this.__redirectsCount) || (this.__redirectsCount < 0)) {
							this.__redirectsCount = 0;
						};
						
						const type = types.getType(this);
						type.$__total++;
						type.$__actives++;
						
						type.$__lastSecond++;
						if (!type.$__timeStartSecond) {
							type.$__timeStartSecond = process.hrtime();
						} else {
							let time = process.hrtime(type.$__timeStartSecond);
							time = time[0] + (time[1] / 1e9);
							if (time >= 1) {
								type.$__perSecond = Math.max(0, type.$__lastSecond / time);
								type.$__lastSecond = 0;
								type.$__timeStartSecond = process.hrtime();
							};
						};
						
						type.$__lastMinute++;
						if (!type.$__timeStartMinute) {
							type.$__timeStartMinute = process.hrtime();
						} else {
							let time = process.hrtime(type.$__timeStartMinute);
							time = (time[0] + (time[1] / 1e9));
							if (time >= 60) {
								type.$__perMinute = Math.max(0, type.$__lastMinute / time);
								type.$__lastMinute = 0;
								type.$__timeStartMinute = process.hrtime();
							};
						};
						
						type.$__lastHour++;
						if (!type.$__timeStartHour) {
							type.$__timeStartHour = process.hrtime();
						} else {
							let time = process.hrtime(type.$__timeStartHour);
							time = (time[0] + (time[1] / 1e9));
							if (time >= (60 * 60)) {
								type.$__perHour = Math.max(0, type.$__lastHour / time);
								type.$__lastHour = 0;
								type.$__timeStartHour = process.hrtime();
							};
						};
					}),
					
					destroy: doodad.OVERRIDE(function destroy() {
						try {
							this.close();
						} catch(ex) {
						};

						this._super();
					}),
					
					getRequestStream: doodad.OVERRIDE(function getRequestStream() {
						if (!this.__requestStream) {
							let requestStream = null;
							
							if (types.isImplemented(this.currentPage, 'createRequestStream')) {
								requestStream = this.currentPage.createRequestStream(this);
							};
							
							if (!requestStream) {
								requestStream = new nodejsIO.BinaryInputStream(this.nodeJsRequest);
							};
							
							this.__requestStream = requestStream;
						};
						
						return this.__requestStream;
					}),
					
					startBodyTransfer: doodad.OVERRIDE(function startBodyTransfer(callback) {
						const requestStream = this.getRequestStream();

						if (requestStream.isListening()) {
							throw new types.Error("Transfer already started.");
						};
						
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
						if (!this.__trailersSent) {
							this.sendTrailers();
						} else {
							this.close();
						};
						
						// NOTE: See "http.RequestCallback"
						throw new server.EndOfRequest();
					}),

					close: doodad.OVERRIDE(function close(/*optional*/forceDisconnect) {
						if (this.nodeJsResponse) {
							try {
								const type = types.getType(this);
								type.$__actives--;
								if (types.HttpStatus.isInformative(this.responseStatus) || types.HttpStatus.isSuccessful(this.responseStatus)) {
									type.$__successful++;
								} else if (types.HttpStatus.isRedirect(this.responseStatus)) {
									type.$__redirected++;
								} else if (types.HttpStatus.isError(this.responseStatus)) {
									var failed = type.$__failed;
									if (types.hasKey(failed, this.responseStatus)) {
										failed[this.responseStatus]++;
									} else {
										failed[this.responseStatus] = 1;
									};
								};
							} catch(ex) {
								// Do nothing
							};

							this.sanitize();

							this.onEnd(new doodad.Event());

							if (forceDisconnect) {
								this.nodeJsResponse.destroy();
								this.nodeJsRequest.destroy();
							} else {
								if (this.__responseStream) {
									this.__responseStream.write(io.EOF);
									this.__responseStream.flush();
								} else {
									this.nodeJsResponse.end();
								};
							};

							if (this.currentPage) {
								this.currentPage.destroy();
							};
							
							this.__responseStream && this.__responseStream.destroy();
							this.__requestStream && this.__requestStream.destroy();
							
							this.setAttributes({
								nodeJsRequest: null,
								nodeJsResponse: null,
								currentPage: null,
							});
							
							this.__requestStream = null;
							this.__responseStream = null;
						};
						
						// NOTE: See "http.RequestCallback"
						throw new server.RequestClosed();
					}),

					addHeaders: doodad.OVERRIDE(function addHeaders(headers) {
						if (this.nodeJsResponse.headersSent) {
							throw new types.Error("Can't add new headers because headers have been sent to the client.");
						};
						const responseHeaders = this.responseHeaders;
						tools.forEach(headers, function(value, name) {
							responseHeaders[tools.title(name, '-')] = value;
						});
						this.__headersWritten = false;
					}),
					
					addTrailers: doodad.OVERRIDE(function addTrailers(trailers) {
						if (this.__trailersSent) {
							throw new types.Error("Can't add new trailers because trailers have been sent and the request has ended.");
						};
						const responseTrailers = this.responseTrailers;
						tools.forEach(trailers, function(value, name) {
							responseTrailers[tools.title(name, '-')] = value;
						});
					}),

					clearHeaders: doodad.OVERRIDE(function clearHeaders(/*optional*/names) {
						if (this.nodeJsResponse.headersSent) {
							throw new types.Error("Can't clear headers because they are been sent to the client.");
						};
						const response = this.nodeJsResponse;
						if (names) {
							if (!types.isArray(names)) {
								names = [names];
							};
							for (let i = 0; i < names.length; i++) {
								let name = tools.title(names[i], '-');
								delete this.responseHeaders[name];
								delete this.responseTrailers[name];
								response.removeHeader(name);
							};
						} else {
							tools.forEach(this.responseHeaders, function(value, name) {
								response.removeHeader(name);
							});
							this.setAttributes({
								responseHeaders: {},
								responseTrailers: {},
							});
						};
					}),
					
					sendHeaders: doodad.OVERRIDE(function sendHeaders(/*<<< [optional]message, [optional]status, [optional]headers*/) {
						if (!this.__headersWritten) {
							const argsLen = arguments.length;
								
							this.addHeaders(arguments[argsLen - 1]);
								
							const status = arguments[argsLen - 2] || this.responseStatus,
								message = arguments[argsLen - 3] || this.responseMessage,
								headers = this.responseHeaders,
								response = this.nodeJsResponse;
								
							response.statusCode = status || types.HttpStatus.OK;
							response.statusMessage = message;
							tools.forEach(headers, function(value, name) {
								response.setHeader(name, value);
							});
							
							this.setAttributes({
								responseStatus: response.statusCode,
								responseMessage: response.statusMessage,
							});
							
							this.__headersWritten = true;
						};
					}),
					
					__responseStreamOnWrite: doodad.PROTECTED(function __responseStreamOnWrite(ev) {
						this.sendHeaders();
					}),
					
					getResponseStream: doodad.OVERRIDE(function getResponseStream() {
						if (!this.__responseStream) {
							let responseStream = null;

							if (types.isImplemented(this.currentPage, 'createResponseStream')) {
								responseStream = this.currentPage.createResponseStream(this);
							};

							if (!responseStream) {
								responseStream = new nodejsIO.BinaryOutputStream(this.nodeJsResponse, {autoFlush: true});
							};

							responseStream.onWrite.attachOnce(this, this.__responseStreamOnWrite);
							
							this.__responseStream = responseStream;
						};
						
						return this.__responseStream;
					}),
					
					sendTrailers: doodad.OVERRIDE(function sendTrailers(/*optional*/trailers) {
						if (this.__trailersSent) {
							throw new types.Error("Trailers have already been sent and the request has ended.");
						};
						
						var proceedTrailers = new http.RequestCallback(this, this, function _proceedTrailers() {
							if (!this.nodeJsResponse.headersSent) {
								this.sendHeaders(); // must write headers before
							};
							
							this.addTrailers(trailers);

							trailers = this.responseTrailers;
							
							if (!types.isEmpty(trailers)) {
								this.nodeJsResponse.addTrailers(trailers);
							};
							
							this.__trailersSent = true;

							this.close();
						});
						
						if (this.__responseStream) {
							this.__responseStream.flush({callback: proceedTrailers});
						} else {
							proceedTrailers();
						};
					}),
					
					clear: doodad.OVERRIDE(function clear() {
						if (!this.nodeJsResponse.headersSent) {
							this.clearHeaders();
						};
						if (this.__responseStream) {
							this.__responseStream.clear();
						};
					}),
					
					respondWithStatus: doodad.OVERRIDE(function respondWithStatus(/*optional*/status, /*optional*/message, /*optional*/headers, /*optional*/data) {
						// NOTE: Must always throw an error.
						this.clear();
						
						if (this.nodeJsResponse.headersSent) {
							throw new types.Error("Can't respond with a new status because the headers have been sent to the client.");
						};
						
						this.addHeaders(headers);

						this.setAttributes({
							responseStatus: status,
							responseMessage: message,
						});

						this.customData.statusData = data;
						
						this.sendHeaders();
						
						this.onStatus(new doodad.Event());
						
						this.end();
					}),
					
					respondWithError: doodad.OVERRIDE(function respondWithError(ex) {
						// NOTE: Must always throw an error.
						if (ex instanceof types.ScriptAbortedError) {
							throw ex;
						};
						
						this.clear();
						this.onError(new doodad.ErrorEvent(ex));
						
						if (this.nodeJsResponse.headersSent) {
							// Too late !
							this.end();
						} else {
							this.respondWithStatus(types.HttpStatus.InternalError, null, null, ex);
						};
					}),

					redirectClient: doodad.OVERRIDE(function redirectClient(url, /*optional*/isPermanent) {
						// NOTE: Must always throw an error.
						const maxRedirects = types.get(this.server.options, 'maxRedirects', 5);
						if (this.nodeJsResponse.headersSent) {
							throw new types.Error("Unable to redirect because HTTP headers are already sent.");
						} else if (this.__redirectsCount >= maxRedirects) {
							this.reject();
						} else {
							this.__redirectsCount++;
							if (types.isString(url)) {
								url = this.url.set({file: null}).combine(url);
							};
							const status = (isPermanent ? types.HttpStatus.MovedPermanently : types.HttpStatus.TemporaryRedirect);
							this.respondWithStatus(status, null, {
								'Location': url.toString({
									//protocol: 'http',
									//domain: this.headers.host,
									args: {
										redirects: this.__redirectsCount,
									},
								}),
							});
						};
					}),
					
					redirectServer: doodad.OVERRIDE(function redirectServer(url) {
						// NOTE: Must always throw an error.
						const maxRedirects = types.get(this.server.options, 'maxRedirects', 5);
						if (this.nodeJsResponse.headersSent) {
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
							// NOTE: See "http.RequestCallback"
							throw new http.RequestRedirected(this.currentPage);
						};
					}),
					
					reject: doodad.OVERRIDE(function reject(/*optional*/rejectData, /*optional*/page) {
						// NOTE: Must always throw an error.
						this.setAttributes({
							rejected: true,
							rejectPage: this.currentPage,
							rejectData: rejectData,
						});
						if (!page) {
							page = this.mapping.nextSibling();
						};
						if (page) {
							// NOTE: See "http.RequestCallback"
							throw new http.RequestRedirected(page);
						} else {
							this.respondWithStatus(types.HttpStatus.VersionNotSupported);
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
					}),
					onNodeCloseHandler: doodad.PROTECTED(null),
					
					isListening: doodad.OVERRIDE(function isListening() {
						return this.__listening;
					}),
					
					listen: doodad.OVERRIDE(function listen(/*optional*/options) {
						if (!this.__listening) {
							this.__listening = true;

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
						};
					}),
					stopListening: doodad.OVERRIDE(function stopListening() {
						if (this.__listening) {
							this.__listening = false;
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

					$prepare: doodad.OVERRIDE(function(mappings, mapping, matcher) {
						this._super(mappings, mapping, matcher);
						
						let path = mapping.path;
						
						if (types.isString(path)) {
							path = tools.Path.parse(path);
						};
						
						root.DD_ASSERT && root.DD_ASSERT((path instanceof tools.Path), "Invalid path.");

						mapping.path = path;
					}),

					createResponseStream: doodad.OVERRIDE(function(request) {
						if (request.customData.isFolder) {
							return new nodejsIO.TextOutputStream(request.nodeJsResponse, {autoFlush: true});
						};
					}),
					
					getSystemPath: doodad.PROTECTED(function getSystemPath(request) {
						const path = request.mapping.path.combine(request.mapping.relativePath);
			//console.log(path.toString());
						return path;
					}),
					
					addHeaders: doodad.PROTECTED(function addHeaders(request, path, callback) {
						if (!path) {
							// Path was invalid
							request.respondWithStatus(types.HttpStatus.NotFound);
						};

						nodeFs.stat(path.toString(), new http.RequestCallback(request, this, function statCallback(err, stats) {
							if (!err) {
								let mimeTypes;
								if (stats.isFile()) {
									mimeTypes = mime.getTypes(path.file);
								} else {
									mimeTypes = ['text/html'];
								};
								
								mimeTypes = request.parseAccept(mimeTypes);
								
								if (mimeTypes.length) {
									request.addHeaders({
										'Last-Modified': dates.strftime('%a, %d %b %Y %H:%M:%S GMT', stats.mtime, __Internal__.enUSLocale, true), // ex.:   Fri, 10 Jul 2015 03:16:55 GMT
									});
									
									if (stats.isFile()) {
										request.addHeaders({
											'Content-Length': stats.size,
											'Content-Type': mimeTypes[0].name,
											'Content-Disposition': 'filename=' + path.file,
										});
									} else {
										request.addHeaders({
											'Content-Type': mimeTypes[0].name,
										});
									};
								} else {
									err = new types.HttpError(types.HttpStatus.NotAcceptable, "Content refused by the client.");
								};
							};
							
							callback.call(this, err, stats);
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
											request.getResponseStream().write(buf.slice(0, bytesRead), {callback: new http.RequestCallback(request, this, function() {
												if (count >= fileSize) {
													request.end();
												} else {
													read.call(this);
												};
											})});
										} else {
											request.end();
										};
									}));
								};
								read.call(this);
							}));
						};
					}),
					
					sendFolder: doodad.PROTECTED(function sendFolder(request, path, stats) {
						request.customData.isFolder = true;
						if (request.url.file) {
							request.redirectClient(request.url.pushFile());
						};
						if (request.url.args.has('res')) {
							request.clearHeaders();
							path = request.mapping.folderTemplate.set({file: null}).combine('./public/' + request.url.args.get('res'), {isRelative: true, os: 'linux'});
							this.addHeaders(request, path, function statCallback(err, stats) {
								if (err) {
									//console.log(err);
									if (err.code === 'ENOENT') {
										request.respondWithStatus(types.HttpStatus.NotFound);
									} else {
										request.respondWithError(err);
									};
								} else if (stats.isFile()) {
									this.sendFile(request, path, stats);
								} else {
									request.reject(stats);
								};
							});
							return;
						};
						files.readdir(path, {async: true})
							.then(new tools.PromiseCallback(this, function(filesList) {
								filesList.sort(function(file1, file2) {
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
					//console.log(filesList);
								return templatesHtml.getTemplate(request.mapping.folderTemplate)
									.then(new tools.PromiseCallback(this, function(templType) {
										const templ = new templType(request, path, filesList);
										templ.render(request.getResponseStream());
										return templ.renderPromise
											['finally'](function() {
												templ.destroy();
											});
									}));
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
						this.addHeaders(request, path, new http.RequestCallback(request, this, function addHeadersCallback(err, stats) {
							if (err) {
								if (err instanceof types.HttpError) {
									request.respondWithStatus(err.code);
								} else if (err.code === 'ENOENT') {
									request.respondWithStatus(types.HttpStatus.NotFound);
								} else {
									request.respondWithError(err);
								};
							} else {
								request.end();
							};
						}));
					}),
					
					execute_GET: doodad.OVERRIDE(function execute_GET(request) {
						// TODO: Cache-Control
						// TODO: Range
						const path = this.getSystemPath(request);
			//console.log(path);
						this.addHeaders(request, path, new http.RequestCallback(request, this, function addHeadersCallback(err, stats) {
							if (err) {
			//console.log(err);
								if (err instanceof types.HttpError) {
									request.respondWithStatus(err.code);
								} else if (err.code === 'ENOENT') {
									request.respondWithStatus(types.HttpStatus.NotFound);
								} else {
									request.respondWithError(err);
								};
							} else if (stats.isFile()) {
			//console.log("file");
								this.sendFile(request, path, stats);
							} else if (request.mapping.showFolders && request.mapping.folderTemplate && templatesHtml.isAvailable()) {
			//console.log("folder");
								this.sendFolder(request, path, stats);
							} else {
			//console.log("reject");
								request.reject();
							};
						}));
					}),
					
				}));

				nodejsHttp.REGISTER(nodejsHttp.StaticPage.$extend(
				{
					$TYPE_NAME: 'JavascriptPage',
					
					$__cache: doodad.PROTECTED(doodad.TYPE(  {}  )),
					
					$prepare: doodad.OVERRIDE(function(mappings, mapping, matcher) {
						this._super(mappings, mapping, matcher);
						
						if (types.isString(mapping.cachePath)) {
							mapping.cachePath = tools.Path.parse(mapping.cachePath);
						};
					}),

					createCachedFile: doodad.PROTECTED(function(request) {
						let ok = false,
							cachedFilePath = null,
							fd = null;
						for (var i = 0; i < 10; i++) {
							cachedFilePath = request.mapping.cachePath.combine(null, {file: tools.generateUUID()});
							try {
								fd = nodeFs.openSync(cachedFilePath.toString(), 'wx', request.mapping.cachedFilesMode || 0o644);
								ok = true;
								break;
							} catch(ex) {
								if (ex instanceof types.ScriptAbortedError) {
									throw ex;
								};
								if (ex.code !== 'EEXIST') {
									throw ex;
								};
							};
						};
						if (!ok) {
							throw new types.Error("Failed to create a unique file.");
						};
						return {
							path: cachedFilePath,
							fd: fd,
							ready: false,
						};
					}),
					
					createResponseStream: doodad.REPLACE(function(request) {
						const outputStream = new nodejsIO.TextOutputStream(request.nodeJsResponse, {autoFlush: true}),
							type = types.getType(this),
							key = request.customData.cacheKey;
						let cached = types.get(type.$__cache, key);
						if (!cached) {
							type.$__cache[key] = cached = this.createCachedFile(request);
							request.onSanitize.attachOnce(null, new http.RequestCallback(request, this, function sanitize() {
								const cached = types.get(type.$__cache, key);
								if (cached) {
									const fd = cached.fd;
									if (fd) {
										nodeFs.close(fd);
										cached.fd = null;
									};
								};
							}));
						};
						if (cached.ready) {
							return outputStream;
						} else {
							const jsStream = new minifiers.Javascript({autoFlush: true}),
								directives = request.mapping.directives;
							if (directives) {
								for (let i = 0; i < directives.length; i++) {
									jsStream.runDirective(directives[i]);
								};
							};
							jsStream.pipe(outputStream, function(data) {
								const fd = cached.fd,
									value = data.valueOf();
								if (value === io.EOF) {
									cached.ready = true;
									if (fd) {
										nodeFs.close(fd);
										cached.fd = null;
									};
								} else {
									if (fd) {
										nodeFs.writeSync(fd, value, null, jsStream.options.encoding);
									};
								};
							});
							return jsStream;
						};
					}),

					getSystemPath: doodad.OVERRIDE(function getSystemPath(request, index) {
						let path = this._super(request, index);
						if (path) {
							const type = types.getType(this),
								key = path.toString();
							request.customData.fileName = path.file;
							request.customData.cacheKey = key;
							const cached = types.get(type.$__cache, key);
							if (cached && cached.ready) {
								path = cached.path;
							};
						};
						return path;
					}),
					
					addHeaders: doodad.OVERRIDE(function addHeaders(request, path, callback) {
						this._super(request, path, new http.RequestCallback(request, this, function(err, stats) {
							if (!err) {
								request.clearHeaders('Content-Length');
								request.addHeaders({
									'Content-Type': mime.getTypes(request.customData.fileName)[0],
									'Content-Disposition': 'filename=' + request.customData.fileName,
								});
							};
							callback.call(this, err, stats);
						}));
					}),
				}));


				return function init(/*optional*/options) {
					return locale.loadLocale('en_US').then(function(locale) {
						__Internal__.enUSLocale = locale;
					});
				};
			},
		};
		
		return DD_MODULES;
	};
	
	if (typeof process !== 'object') {
		// <PRB> export/import are not yet supported in browsers
		global.DD_MODULES = exports.add(global.DD_MODULES);
	};
}).call((typeof global !== 'undefined') ? global : ((typeof window !== 'undefined') ? window : this));