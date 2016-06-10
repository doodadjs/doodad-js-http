//! REPLACE_BY("// Copyright 2016 Claude Petit, licensed under Apache License version 2.0\n", true)
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
	
	//! BEGIN_REMOVE()
	if ((typeof process === 'object') && (typeof module === 'object')) {
	//! END_REMOVE()
		//! IF_DEF("serverSide")
			module.exports = exports;
		//! END_IF()
	//! BEGIN_REMOVE()
	};
	//! END_REMOVE()
	
	exports.add = function add(DD_MODULES) {
		DD_MODULES = (DD_MODULES || {});
		DD_MODULES['Doodad.NodeJs.Server.Http'] = {
			version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE() */,
			dependencies: [
				'Doodad.Server.Http',
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
				
				const __Natives__ = {
					windowJSON: global.JSON,
				};

				// TODO: 
				// 1) (todo) Setup page: IPs, Ports, Base URLs, Fall-back Pages (html status), Max number of processes, Storage Manager location
				// 3) (working on) Static files : Base URL (done), file(done)/folder(done), alias (done), Verbs (done), in/out process option (todo), mime type (auto or custom) (done), charset (todo), metadata (if text/html) (todo)
				// 4) (todo) Dynamic files : Base URL, Page class, Verbs, in/out process option, mime type ('text/html' or custom), charset, metadata (if text/html)
				// 5) (todo) Session and Shared Data Storage: Storage Manager Server, Storage Type Class (Pipes (Streams), RAM, Files, DB, ...), Data passed with JSON
				// 6) (todo) User/Password/Permissions
						

				nodejsHttp.REGISTER(http.Request.$extend(
										mixIns.NodeEvents,
				{
					$TYPE_NAME: 'Request',
					
					__headersWritten: doodad.PROTECTED(false),
					__trailersSent: doodad.PROTECTED(false),
					__closed: doodad.PROTECTED(false),
					
					currentResponse: doodad.PUBLIC(doodad.READ_ONLY(null)),
					rejected: doodad.PUBLIC(doodad.READ_ONLY(true)),
					rejectResponse: doodad.PUBLIC(doodad.READ_ONLY(null)),
					rejectData: doodad.PUBLIC(doodad.READ_ONLY(null)),
					
					nodeJsRequest: doodad.PUBLIC(doodad.READ_ONLY(null)),
					nodeJsResponse: doodad.PUBLIC(doodad.READ_ONLY(null)),

					__nodeJsRequestClosed: doodad.PROTECTED(false),

					startTime: doodad.PROTECTED(null),
					
					__redirectsCount: doodad.PROTECTED(0),
					
					$__actives: doodad.PROTECTED(doodad.TYPE(0)),
					
					$__timeStartSecond: doodad.PROTECTED(doodad.TYPE(null)),
					$__timeStartMinute: doodad.PROTECTED(doodad.TYPE(null)),
					$__timeStartHour: doodad.PROTECTED(doodad.TYPE(null)),
					$__lastSecond: doodad.PROTECTED(doodad.TYPE(0)),
					$__lastMinute: doodad.PROTECTED(doodad.TYPE(0)),
					$__lastHour: doodad.PROTECTED(doodad.TYPE(0)),
					
					$__total: doodad.PROTECTED(doodad.TYPE(0)),
					$__successful: doodad.PROTECTED(doodad.TYPE(0)),
					$__redirected: doodad.PROTECTED(doodad.TYPE(0)),
					$__failed: doodad.PROTECTED(doodad.TYPE(null)),
					$__aborted: doodad.PROTECTED(doodad.TYPE(0)),
					$__perSecond: doodad.PROTECTED(doodad.TYPE(0.0)),
					$__perMinute: doodad.PROTECTED(doodad.TYPE(0.0)),
					$__perHour: doodad.PROTECTED(doodad.TYPE(0.0)),

					$getStats: doodad.PUBLIC(doodad.TYPE(function $getStats() {
						return {
							actives: this.$__actives,
							total: this.$__total,
							successful: this.$__successful,
							redirected: this.$__redirected,
							failed: this.$__failed,
							aborted: this.$__aborted,
							perSecond: this.$__perSecond,
							perMinute: this.$__perMinute,
							perHour: this.$__perHour,
						};
					})),
					
					$clearStats: doodad.PUBLIC(doodad.TYPE(function $clearStats() {
						this.$__timeStartSecond = null;
						this.$__timeStartMinute = null;
						this.$__timeStartHour = null;
						this.$__lastSecond = 0;
						this.$__lastMinute = 0;
						this.$__lastHour = 0;

						this.$__total = 0;
						this.$__successful = 0;
						this.$__redirected = 0;
						this.$__failed = {};
						this.$__aborted = 0;
						this.$__perSecond = 0.0;
						this.$__perMinute = 0.0;
						this.$__perHour = 0.0;
					})),
					
					$create: doodad.OVERRIDE(function $create() {
						this._super();
						this.$__failed = {};
					}),
					
					nodeJsRequestOnClose: doodad.NODE_EVENT('close', function nodeJsRequestOnClose(context) {
						this.__nodeJsRequestClosed = true;
					}),
					
					nodeJsResponseOnClose: doodad.NODE_EVENT('close', function nodeJsResponseOnClose(context) {
						this.close(true);
					}),
					
					create: doodad.OVERRIDE(function create(server, nodeJsRequest, nodeJsResponse) {
						this.nodeJsRequestOnClose.attach(nodeJsRequest);
						this.nodeJsResponseOnClose.attach(nodeJsResponse);
						
						types.setAttributes(this, {
							startTime: process.hrtime(),
							nodeJsRequest: nodeJsRequest,
							nodeJsResponse: nodeJsResponse,
						});

						let host = nodeJsRequest.headers['host'];
						if (host) {
							host = files.Url.parse(server.protocol + '://' + host + '/');
						};
						
						let url = files.Url.parse(nodeJsRequest.url);
						if (host) {
							url = host.combine(url);
						};
						
						this.__redirectsCount = types.toInteger(url.args.get('redirects', true));
						if (!types.isFinite(this.__redirectsCount) || (this.__redirectsCount < 0)) {
							this.__redirectsCount = 0;
						};

						
						this._super(server, nodeJsRequest.method, url.removeArgs('redirects'), nodeJsRequest.headers);
						
						
						const type = types.getType(this);
						
						if (type.$__total >= types.getSafeIntegerLen().max) {
							type.$clearStats();
						};
						
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
							this.close(true);
						} catch(ex) {
						};

						this._super();
					}),
					
					getRequestStream: doodad.OVERRIDE(function getRequestStream(/*optional*/options) {
						if (this.__closed) {
							throw new server.RequestClosed();
						};							

						if (this.__nodeJsRequestClosed) {
							throw new server.RequestClosed();
						};
						
						if (!this.__requestStream) {
							options = types.clone(options) || {};

							const pageEncoding = types.get(options, 'encoding'); // encoding expected by the page
							
							if (types.get(options, 'text', false)) {
								// Force text mode with default encoding
								types.getDefault(options, 'encoding', 'utf-8');
							};

							const contentType = this.requestHeaders['content-type'];
							if (contentType) {
								let contentArgs = contentType.split(';', 2)[1];
								if (contentArgs) {
									contentArgs = contentArgs.split(',')
										.map(function(arg) {
												return arg.split('=', 2)
													.map(function(val) {
														return val.trim().toLowerCase();
													});
											})
										.filter(function(keyValue) {
											return keyValue[0] === 'charset';
										});
									if (contentArgs.length) {
										// Encoding of the request body
										options.encoding = contentArgs[0][1];
									};
								};
							};

							const encoding = types.get(options, 'encoding', pageEncoding);

							if (pageEncoding && (encoding !== pageEncoding)) {
								this.respondWithStatus(types.HttpStatus.UnsupportedMediaType);
							};
							
							let requestStream = null;
							
							if (types.isImplemented(this.currentResponse, 'createRequestStream')) {
								requestStream = this.currentResponse.createRequestStream(this, options);
							};
							
							if (!requestStream) {
								options.nodeStream = this.nodeJsRequest;
								if (encoding) {
									if (!nodejsIO.TextInputStream.$isValidEncoding(encoding)) {
										this.respondWithStatus(types.HttpStatus.UnsupportedMediaType);
									};
									requestStream = new nodejsIO.TextInputStream(options);
								} else {
									requestStream = new nodejsIO.BinaryInputStream(options);
								};
							};
							
							this.__requestStream = requestStream;
						};
						
						return this.__requestStream;
					}),
					
					startBodyTransfer: doodad.OVERRIDE(function startBodyTransfer(/*optional*/options) {
						if (this.__closed) {
							throw new server.RequestClosed();
						};							
						
						if (types.isFunction(options)) {
							// TODO: Remove. Kept for compatibility.
							options = {callback: options};
						};
						
						let callback = types.get(options, 'callback');
							
						if (callback) {
							if (!(callback instanceof types.Callback)) {
								const callbackObj = types.get(options, 'callbackObj');
								callback = new http.RequestCallback(this, callbackObj, callback);
							};
						};

						const requestStream = this.getRequestStream(options);

						if (requestStream.isListening()) {
							throw new types.Error("Transfer has already started.");
						};
						
						if (callback) {
							requestStream.onReady.attach(null, function(ev) {
								ev.preventDefault();
								callback(ev.data);
							});
						};
						
						requestStream.listen();
					}),
					
					proceed: doodad.PUBLIC(function proceed(response) {
						if (this.__closed) {
							throw new server.RequestClosed();
						};							
						
						if (this.currentResponse && (this.currentResponse !== response)) {
							this.currentResponse.destroy();
						};
						types.setAttribute(this, 'currentResponse', response);
						
						response.execute(this);
					}),
					
					end: doodad.OVERRIDE(function end() {
						// NOTE: MUST ALWAYS THROW AN ERROR
						if (this.__closed) {
							throw new server.RequestClosed();
						};							
						
						if (!this.__trailersSent) {
							this.sendTrailers();
						} else {
							this.close();
						};
						
						// NOTE: See "http.RequestCallback"
						throw new server.EndOfRequest();
					}),

					close: doodad.OVERRIDE(function close(/*optional*/forceDisconnect) {
						// NOTE: MUST ALWAYS THROWS AN ERROR
						
						this.sanitize();

						if (!this.__closed) {
							this.__closed = true;
							
							try {
								const type = types.getType(this);
								type.$__actives--;
								if (forceDisconnect) {
									type.$__aborted++;
								} else if (types.HttpStatus.isInformative(this.responseStatus) || types.HttpStatus.isSuccessful(this.responseStatus)) {
									type.$__successful++;
								} else if (types.HttpStatus.isRedirect(this.responseStatus)) {
									type.$__redirected++;
								} else if (types.HttpStatus.isError(this.responseStatus)) {
									var failed = type.$__failed;
									if (types.has(failed, this.responseStatus)) {
										failed[this.responseStatus]++;
									} else {
										failed[this.responseStatus] = 1;
									};
								};
							} catch(ex) {
								// Do nothing
							};

							this.onEnd(new doodad.Event());

							this.nodeJsRequestOnClose.clear();
							this.nodeJsResponseOnClose.clear();
							
							if (this.nodeJsResponse) {
								if (forceDisconnect) {
									// Close sockets
									this.nodeJsResponse.destroy();
									this.nodeJsRequest.destroy();
								} else if (this.__responseStream) {
									// EOF
									this.__responseStream.write(io.EOF);
									this.__responseStream.flush();
								} else {
									// EOF
									this.nodeJsResponse.end();
								};
							};
							
							if (this.currentResponse) {
								this.currentResponse.destroy();
							};
							
							this.__responseStream && this.__responseStream.destroy();
							this.__requestStream && this.__requestStream.destroy();
							
							types.setAttributes(this, {
								nodeJsRequest: null,
								nodeJsResponse: null,
								currentResponse: null,
							});
							
							this.__requestStream = null;
							this.__responseStream = null;
						};
						
						// NOTE: See "http.RequestCallback"
						throw new server.RequestClosed();
					}),

					addHeaders: doodad.OVERRIDE(function addHeaders(headers) {
						if (this.__closed) {
							throw new server.RequestClosed();
						};							
						if (this.nodeJsResponse.headersSent) {
							throw new types.Error("Can't add new headers because headers have been sent to the client.");
						};
						const responseHeaders = this.responseHeaders;
						tools.forEach(headers, function(value, name) {
							name = tools.title(name, '-');
							value = (types.isNothing(value) ? '' : tools.trim(types.toString(value)));
							responseHeaders[name] = value;
						});
						this.__headersWritten = false;
					}),
					
					addTrailers: doodad.OVERRIDE(function addTrailers(trailers) {
						if (this.__closed) {
							throw new server.RequestClosed();
						};							
						if (this.__trailersSent) {
							throw new types.Error("Can't add new trailers because trailers have been sent and the request has ended.");
						};
						const responseTrailers = this.responseTrailers;
						tools.forEach(trailers, function(value, name) {
							name = tools.title(name, '-');
							value = (types.isNothing(value) ? '' : tools.trim(types.toString(value)));
							if (value) {
								responseTrailers[name] = value;
							} else {
								delete responseTrailers[name];
							};
						});
					}),

					clearHeaders: doodad.OVERRIDE(function clearHeaders(/*optional*/names) {
						if (this.__closed) {
							throw new server.RequestClosed();
						};							
						if (this.nodeJsResponse.headersSent) {
							throw new types.Error("Can't clear headers because they have been sent to the client.");
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
							types.setAttributes(this, {
								responseHeaders: {},
								responseTrailers: {},
							});
						};
					}),
					
					sendHeaders: doodad.OVERRIDE(function sendHeaders(/*<<< [optional]message, [optional]status, [optional]headers*/) {
						if (this.__closed) {
							throw new server.RequestClosed();
						};							
						if (!this.__headersWritten) {
							const argsLen = arguments.length;
							
							this.addHeaders(arguments[argsLen - 1]);

							this.onSendHeaders(new doodad.Event());
							
							const status = arguments[argsLen - 2] || this.responseStatus,
								message = arguments[argsLen - 3] || this.responseMessage,
								headers = this.responseHeaders,
								response = this.nodeJsResponse;
								
							response.statusCode = status || types.HttpStatus.OK;
							response.statusMessage = message;
							tools.forEach(headers, function(value, name) {
								if (value) {
									response.setHeader(name, value);
								} else {
									response.removeHeader(name);
								};
							});
							
							types.setAttributes(this, {
								responseStatus: response.statusCode,
								responseMessage: response.statusMessage,
							});
							
							this.__headersWritten = true;
						};
					}),
					
					__responseStreamOnWrite: doodad.PROTECTED(function __responseStreamOnWrite(ev) {
						this.sendHeaders();
					}),
					
					getResponseStream: doodad.OVERRIDE(function getResponseStream(/*optional*/options) {
						if (this.__closed) {
							throw new server.RequestClosed();
						};							

						if (!this.__responseStream) {
							let responseStream = null;

							if (types.isImplemented(this.currentResponse, 'createResponseStream')) {
								responseStream = this.currentResponse.createResponseStream(this, options);
							};

							if (!responseStream) {
								// TODO: Take "encoding" from "Content-Type" before, then from "options".
								// TODO: Append ";charset=" to "Content-Type"
								const postpone = types.get(options, 'postpone', false);
								const encoding = types.get(options, 'encoding');
								if (encoding) {
									responseStream = new nodejsIO.TextOutputStream({encoding: encoding, nodeStream: this.nodeJsResponse, autoFlush: !postpone});
								} else {
									responseStream = new nodejsIO.BinaryOutputStream({nodeStream: this.nodeJsResponse, autoFlush: !postpone});
								};
							};

							if (responseStream.options.autoFlush) {
								responseStream.onWrite.attachOnce(this, this.__responseStreamOnWrite);
							};
							
							this.__responseStream = responseStream;
						};
						
						return this.__responseStream;
					}),
					
					sendTrailers: doodad.OVERRIDE(function sendTrailers(/*optional*/trailers) {
						if (this.__closed) {
							throw new server.RequestClosed();
						};							
						if (this.__trailersSent) {
							throw new types.Error("Trailers have already been sent and the request has ended.");
						};
						
						if (!this.nodeJsResponse.headersSent) {
							this.sendHeaders(); // must write headers before
						};
						
						this.addTrailers(trailers);

						this.__trailersSent = true;

						var proceedTrailers = new http.RequestCallback(this, this, function _proceedTrailers() {
							trailers = this.responseTrailers;
							
							if (!types.isEmpty(trailers)) {
								this.nodeJsResponse.addTrailers(trailers);
							};
							
							this.close();
						});
						
						if (this.__responseStream) {
							this.__responseStream.flush({callback: proceedTrailers});
						} else {
							proceedTrailers();
						};
					}),
					
					clear: doodad.OVERRIDE(function clear() {
						if (this.__closed) {
							throw new server.RequestClosed();
						};							
						if (this.nodeJsResponse) {
							if (!this.nodeJsResponse.headersSent) {
								this.clearHeaders();
							};
						};
						if (this.__responseStream) {
							this.__responseStream.clear();
						};
					}),
					
					respondWithStatus: doodad.OVERRIDE(function respondWithStatus(/*optional*/status, /*optional*/message, /*optional*/headers, /*optional*/data) {
						// NOTE: Must always throws an error.
						if (this.__closed) {
							throw new server.RequestClosed();
						};							
						if (this.nodeJsResponse.headersSent) {
							throw new types.Error("Can't respond with a new status because the headers have been sent to the client.");
						};
						
						this.addHeaders(headers);

						types.setAttributes(this, {
							responseStatus: status,
							responseMessage: message,
						});

						this.data.statusData = data;
						
						this.sendHeaders();
						
						this.onStatus(new doodad.Event());
						
						this.end();
					}),
					
					respondWithError: doodad.OVERRIDE(function respondWithError(ex) {
						// NOTE: Must always throw an error.
						if (this.__closed) {
							throw new server.RequestClosed();
						};							
						if (ex instanceof types.ScriptAbortedError) {
							throw ex;
						} else if (ex instanceof types.ScriptInterruptedError) {
							this.close(true);
						} else {
							this.clear();
							this.onError(new doodad.ErrorEvent(ex));
							
							if (!this.nodeJsResponse) {
								// Too late !
								this.close();
							} else if (this.nodeJsResponse.headersSent) {
								// Too late !
								this.end();
							} else {
								this.respondWithStatus(types.HttpStatus.InternalError, null, null, ex);
							};
						};
					}),

					redirectClient: doodad.OVERRIDE(function redirectClient(url, /*optional*/isPermanent) {
						// NOTE: Must always throw an error.
						if (this.__closed) {
							throw new server.RequestClosed();
						};							
						const maxRedirects = types.get(this.server.options, 'maxRedirects', 5);
						if (this.nodeJsResponse.headersSent) {
							throw new types.Error("Unable to redirect because HTTP headers are already sent.");
						} else if (this.__redirectsCount >= maxRedirects) {
							this.respondWithStatus(types.HttpStatus.NotFound);
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
						if (this.__closed) {
							throw new server.RequestClosed();
						};							
						const maxRedirects = types.get(this.server.options, 'maxRedirects', 5);
						if (this.nodeJsResponse.headersSent) {
							throw new types.Error("Unable to redirect because HTTP headers are already sent.");
						} else if (this.__redirectsCount >= maxRedirects) {
							this.reject();
						} else {
							this.clear();
							this.__redirectsCount++;
							if (types.isString(url)) {
								url = files.Url.parse(url);
							};
							types.setAttribute(this, 'url', url);
							// NOTE: See "http.RequestCallback"
							throw new http.RequestRedirected(this.currentResponse);
						};
					}),
					
					reject: doodad.OVERRIDE(function reject(/*optional*/rejectData, /*optional*/newResponse) {
						// NOTE: Must always throws an error.
						if (this.__closed) {
							throw new server.RequestClosed();
						};							
						types.setAttributes(this, {
							rejected: true,
							rejectResponse: this.currentResponse,
							rejectData: rejectData,
						});
						if (!newResponse) {
							newResponse = this.route.nextSibling();
						};
						if (newResponse) {
							// NOTE: See "http.RequestCallback"
							throw new http.RequestRedirected(newResponse);
						} else {
							this.respondWithStatus(types.HttpStatus.NotFound);
						};
					}),
					
					getTime: doodad.PUBLIC(function getTime() {
						if (this.__closed) {
							throw new server.RequestClosed();
						};							
						const time = process.hrtime(this.startTime);
						return (time[0] * 1000) + (time[1] / 1e6);
					}),
					
					getSource: doodad.PUBLIC(function getSource() {
						// TODO: Add more informations
						if (this.__closed) {
							throw new server.RequestClosed();
						};							
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
									const response = this.pageFactory.createResponse(request);
									if (response) {
										request.proceed(response);
									} else {
										request.respondWithStatus(types.HttpStatus.NotFound);
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
						types.setAttribute(this, '__address', this.__nodeServer.address());
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

						types.setAttribute(this, '__nodeServer', null);
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
							
							types.setAttribute(this, '__nodeServer', server);
							
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
							
							types.setAttribute(this, 'protocol', protocol);
							
							this.onListen(new doodad.Event());
						};
					}),
					stopListening: doodad.OVERRIDE(function stopListening() {
						if (this.__listening) {
							this.__listening = false;
							this.__nodeServer.close();
							this.onStopListening(new doodad.Event());
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

					$prepare: doodad.OVERRIDE(function(routes, route, matcher) {
						this._super(routes, route, matcher);
						
						let path = route.path;
						if (types.isString(path)) {
							path = files.Path.parse(path);
						};
						root.DD_ASSERT && root.DD_ASSERT((path instanceof files.Path), "Invalid path.");
						route.path = path;

						if (route.showFolders) {
							let folderTemplate = route.folderTemplate;
							if (types.isNothing(folderTemplate)) {
								folderTemplate = files.Path.parse(module.filename).set({file: null}).combine('./res/templates/Folder.ddt', {os: 'linux'});
							} else if (types.isString(folderTemplate)) {
								folderTemplate = files.Path.parse(folderTemplate);
							};
							root.DD_ASSERT && root.DD_ASSERT((folderTemplate instanceof files.Path), "Invalid folder template.");
							route.folderTemplate = folderTemplate;
						};
						
					}),

					createResponseStream: doodad.OVERRIDE(function(request, /*optional*/options) {
						const postpone = types.get(options, 'postpone', false);
						if (request.data.isFolder) {
							return new nodejsIO.TextOutputStream({nodeStream: request.nodeJsResponse, autoFlush: !postpone});
						};
					}),
					
					getSystemPath: doodad.PROTECTED(function getSystemPath(request) {
						const path = request.route.path.combine(request.route.matcherResult.url);
			//console.log(path.toString());
						return path;
					}),
					
					addHeaders: doodad.PROTECTED(function addHeaders(request, path, callback) {
						if (!path) {
							// Path was invalid
							request.respondWithStatus(types.HttpStatus.NotFound);
						};

						nodeFs.stat(path.toString(), new http.RequestCallback(request, this, function statCallback(err, stats) {
							if (err) {
								callback(err);
							} else {
								let mimeTypes,
									mimeType;
									
								if (stats.isFile()) {
									mimeTypes = mime.getTypes(path.file);
								} else {
									mimeTypes = ['text/html', 'application/json'];
								};
								
								mimeTypes = request.parseAccept(mimeTypes);
								
								if (mimeTypes.length) {
									mimeType = mimeTypes[0];

									request.addHeaders({
										'Last-Modified': dates.strftime('%a, %d %b %Y %H:%M:%S GMT', stats.mtime, __Internal__.enUSLocale, true), // ex.:   Fri, 10 Jul 2015 03:16:55 GMT
									});
									
									if (stats.isFile()) {
										request.addHeaders({
											'Content-Length': stats.size,
											'Content-Type': mimeType.name,
											'Content-Disposition': 'filename=' + path.file,
										});
									} else {
										request.addHeaders({
											'Content-Type': mimeType.name,
										});
									};

									callback(null, {
										mimeType: mimeType,
										stats: stats,
									});
									
								} else {
									err = new types.HttpError(types.HttpStatus.NotAcceptable, "Content refused by the client.");
									callback(err);
								};
							};		
							
						}));
					}),

					sendFile: doodad.PROTECTED(function sendFile(request, path, data) {
						request.data.isFolder = false;
						const fileSize = data.stats.size;
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
								const BUF_SIZE = 4096;
								let count = 0;
								const read = function readInternal() {
									const buf = new Buffer(Math.min(fileSize, BUF_SIZE));
									nodeFs.read(fd, buf, 0, buf.length, count, new http.RequestCallback(request, this, function readFileCallback(err, bytesRead) {
										if (err) {
											request.respondWithError(err);
										};
										if (bytesRead) {
											count += bytesRead;
											const stream = request.getResponseStream();
											stream.write(buf.slice(0, bytesRead), {callback: new http.RequestCallback(request, this, function() {
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
					
					sendFolder: doodad.PROTECTED(function sendFolder(request, path, data) {
						request.data.isFolder = true;
						if (request.url.file) {
							request.redirectClient(request.url.pushFile());
						};
						if (request.url.args.has('res')) {
							// TODO: HEAD requests
							request.clearHeaders();
							path = request.route.folderTemplate.set({file: null}).combine('./public/' + request.url.args.get('res'), {isRelative: true, os: 'linux'});
							this.addHeaders(request, path, new http.RequestCallback(request, this, function statCallback(err, data) {
								if (err) {
									//console.log(err);
									if (err.code === 'ENOENT') {
										request.respondWithStatus(types.HttpStatus.NotFound);
									} else {
										request.respondWithError(err);
									};
								} else if (data.stats.isFile()) {
									this.sendFile(request, path, data);
								} else {
									request.reject(data);
								};
							}));
							return;
						};
						function sendHtml(filesList) {
							return templatesHtml.getTemplate(request.route.folderTemplate)
								.then(new types.PromiseCallback(this, function(templType) {
									const stream = request.getResponseStream();
									const templ = new templType(request, path, filesList);
									templ.render(stream);
									return templ.renderPromise
										.nodeify(function(err, result) {
											templ.destroy();
											if (err) {
												throw err;
											} else {
												return result;
											};
										});
								}));
						};
						function sendJson(filesList) {
							const json = __Natives__.windowJSON.stringify(tools.map(filesList, function(file) {
								return {
									isFolder: file.isFolder,
									name: file.name,
									size: file.size,
								};
							}));
							return new Promise(function(resolve, reject) {
								// TODO: Create helper functions in the request object, with an option to use a specific format handler
								// NOT NEEDED: new http.RequestCallback(request, this, function(err) {})
								const stream = request.getResponseStream();
								stream.write(json, {callback: function(err) {
									if (err) {
										reject(err);
									} else {
										resolve();
									};
								}});
							});
						};
						function send(filesList) {
							let promise;
							if (data.mimeType.name === 'text/html') {
								promise = sendHtml(filesList);
							} else {
								promise = sendJson(filesList);
							};
							return promise
								.catch(new http.RequestCallback(request, this, function(err) {
									request.respondWithError(err);
								}));
						};
						function readDir() {
							return files.readdir(path, {async: true})
								.then(new types.PromiseCallback(this, function(filesList) {
									filesList.sort(function(file1, file2) {
										const n1 = file1.name.toUpperCase(),
											n2 = file2.name.toUpperCase();
										if ((!file1.isFolder && file2.isFolder)) {
											return 1;
										} else if (file1.isFolder && !file2.isFolder) {
											return -1;
										} else if (n1 > n2) {
											return 1;
										} else if (n1 < n2) {
											return -1;
										} else {
											return 0;
										};
									});
						//console.log(require('util').inspect(filesList));
									return filesList;
								}))
						};
						
						
						return readDir()
							.then(send)
							.then(new http.RequestCallback(request, this, function endReadDir() {
								request.end();
							}));
					}),
					
					execute_HEAD: doodad.OVERRIDE(function execute_HEAD(request) {
						const path = this.getSystemPath(request);
						this.addHeaders(request, path, new http.RequestCallback(request, this, function addHeadersCallback(err, data) {
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
						this.addHeaders(request, path, new http.RequestCallback(request, this, function addHeadersCallback(err, data) {
							if (err) {
								if (err instanceof types.HttpError) {
									request.respondWithStatus(err.code);
								} else if (err.code === 'ENOENT') {
									request.respondWithStatus(types.HttpStatus.NotFound);
								} else {
									request.respondWithError(err);
								};
							} else if (data.stats.isFile()) {
								this.sendFile(request, path, data);
							} else if ((data.mimeType.name === 'text/html') && request.route.showFolders && templatesHtml.isAvailable()) {
								this.sendFolder(request, path, data);
							} else if ((data.mimeType.name === 'application/json') && request.route.showFolders) {
								this.sendFolder(request, path, data);
							} else {
								request.reject();
							};
						}));
					}),
					
				}));

				nodejsHttp.REGISTER(nodejsHttp.StaticPage.$extend(
				{
					$TYPE_NAME: 'JavascriptPage',
					
					$__cache: doodad.PROTECTED(doodad.TYPE(  {}  )),
					
					$prepare: doodad.OVERRIDE(function(routes, route, matcher) {
						this._super(routes, route, matcher);
						
						if (types.isString(route.cachePath)) {
							route.cachePath = files.Path.parse(route.cachePath);
						};
					}),

					createCachedFile: doodad.PROTECTED(function(request) {
						let ok = false,
							cachedFilePath = null,
							fd = null;
						for (var i = 0; i < 10; i++) {
							cachedFilePath = request.route.cachePath.combine(null, {file: tools.generateUUID()});
							try {
								fd = nodeFs.openSync(cachedFilePath.toString(), 'wx', request.route.cachedFilesMode || 0o644);
								ok = true;
								break;
							} catch(ex) {
								if (ex instanceof types.ScriptInterruptedError) {
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
					
					createResponseStream: doodad.REPLACE(function(request, /*optional*/options) {
						const postpone = types.get(options, 'postpone', false),
							outputStream = new nodejsIO.TextOutputStream({nodeStream: request.nodeJsResponse, autoFlush: !postpone}),
							type = types.getType(this),
							key = request.data.cacheKey;
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
							const jsStream = new minifiers.Javascript({autoFlush: !postpone}),
								variables = request.route.variables;
							if (variables) {
								tools.forEach(variables, function(value, name) {
									jsStream.define(name, value);
								});
							};
							jsStream.pipe(outputStream, function(data) {
								const fd = cached.fd;
								if (data.raw === io.EOF) {
									cached.ready = true;
									if (fd) {
										nodeFs.close(fd);
										cached.fd = null;
									};
								} else {
									if (fd) {
										nodeFs.writeSync(fd, data.valueOf(), null, jsStream.options.encoding);
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
							request.data.fileName = path.file;
							request.data.cacheKey = key;
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
									'Content-Type': mime.getTypes(request.data.fileName)[0],
									'Content-Disposition': 'filename=' + request.data.fileName,
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
	
	//! BEGIN_REMOVE()
	if ((typeof process !== 'object') || (typeof module !== 'object')) {
	//! END_REMOVE()
		//! IF_UNDEF("serverSide")
			// <PRB> export/import are not yet supported in browsers
			global.DD_MODULES = exports.add(global.DD_MODULES);
		//! END_IF()
	//! BEGIN_REMOVE()
	};
	//! END_REMOVE()
}).call(
	//! BEGIN_REMOVE()
	(typeof window !== 'undefined') ? window : ((typeof global !== 'undefined') ? global : this)
	//! END_REMOVE()
	//! IF_DEF("serverSide")
	//! 	INJECT("global")
	//! ELSE()
	//! 	INJECT("window")
	//! END_IF()
);