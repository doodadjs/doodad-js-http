//! REPLACE_BY("// Copyright 2016 Claude Petit, licensed under Apache License version 2.0\n", true)
// dOOdad - Object-oriented programming framework
// File: NodeJs_Server_Http.js - HTTP Server tools for NodeJs
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

			create: function create(root, /*optional*/_options, _shared) {
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
					nodejsIOInterfaces = nodejsIO.Interfaces,
					server = doodad.Server,
					serverInterfaces = server.Interfaces,
					http = server.Http,
					httpInterfaces = http.Interfaces,
					httpMixIns = http.MixIns,
					nodejsServer = nodejs.Server,
					nodejsHttp = nodejsServer.Http,
					minifiers = io.Minifiers,
					templates = doodad.Templates,
					templatesHtml = templates.Html,
					
					nodeFs = require('fs');

				
				const __Internal__ = {
					enUSLocale: null,
				};
				
				types.complete(_shared.Natives, {
					windowJSON: global.JSON,
				});

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
					
					currentHandler: doodad.PUBLIC(doodad.READ_ONLY(null)),
					//rejected: doodad.PUBLIC(doodad.READ_ONLY(true)),
					//rejectHandler: doodad.PUBLIC(doodad.READ_ONLY(null)),
					//rejectData: doodad.PUBLIC(doodad.READ_ONLY(null)),
					
					nodeJsRequest: doodad.PROTECTED(null),
					nodeJsResponse: doodad.PROTECTED(null),
					
					requestStreamIsReady: doodad.PROTECTED(false),
					responseStreamIsReady: doodad.PROTECTED(false),
					
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
					
					nodeJsRequestOnEnd: doodad.NODE_EVENT('end', function nodeJsRequestOnEnd(context) {
						this.__nodeJsRequestClosed = true;
					}),
					
					nodeJsResponseOnFinish: doodad.NODE_EVENT('finish', function nodeJsResponseOnFinish(context) {
						if (!this.__closed) {
							// Response stream has been closed from an unknown operation
							try {
								this.close(true);
							} catch(ex) {
							};
						};
						
						this.responseStreamIsReady && this.responseStream.destroy();
						this.requestStreamIsReady && this.requestStream.destroy();
						
						this.nodeJsRequest = null;
						this.nodeJsResponse = null;
						
						_shared.setAttribute(this, 'currentHandler', null);
						
						this.requestStream = null;
						this.responseStream = null;
					}),
					
					create: doodad.OVERRIDE(function create(server, nodeJsRequest, nodeJsResponse) {
						this.nodeJsRequestOnEnd.attachOnce(nodeJsRequest);
						this.nodeJsResponseOnFinish.attachOnce(nodeJsResponse);
						
						this.startTime = process.hrtime();
						this.nodeJsRequest = nodeJsRequest;
						this.nodeJsResponse = nodeJsResponse;
						
						this.requestStream = nodeJsRequest;
						this.responseStream = nodeJsResponse;

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

						// TODO: Handle client crash
						//this.clientCrashed = types.toBoolean(url.args.get('crashReport', true));
						
						url = url.removeArgs(['redirects', 'crashReport'])
						
						this._super(server, nodeJsRequest.method, url, nodeJsRequest.headers);
						
						
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
						if (!this.__closed) {
							try {
								this.close(true);
							} catch(ex) {
							};
						};
						this._super();
					}),
					
					addRequestPipe: doodad.PUBLIC(function addRequestPipe(stream) {
						if (this.requestStreamIsReady) {
							throw new types.NotAvailable();
						};
						const requestStream = this.requestStream;
						if (!types._implements(requestStream, io.Stream) && types._implements(stream, io.Stream)) {
							const iwritable = stream.getInterface(nodejsIOInterfaces.IWritable);
							requestStream.pipe(iwritable);
						} else {
							requestStream.pipe(stream);
						};
						this.requestStream = stream;
					}),
					
					getRequestStream: doodad.OVERRIDE(function getRequestStream(/*optional*/options) {
						if (this.__closed) {
							throw new server.RequestClosed();
						};							

						if (this.__nodeJsRequestClosed) {
							throw new server.RequestClosed();
						};
						
						if (!this.requestStreamIsReady) {
							const accept = http.parseAcceptHeader(types.get(options, 'accept'));  // content-types expected by the page
							if (!accept) {
								throw new types.Error("Option 'accept' is missing or invalid.");
							};
							
							const requestType = http.parseContentTypeHeader(this.getRequestHeader('Content-Type'));
							if (!requestType) {
								this.respondWithStatus(types.HttpStatus.UnsupportedMediaType);
							};

							let requestEncoding = null;
							if (types.has(requestType.params, 'charset')) {
								// Encoding of the request body
								requestEncoding = requestType.params.charset;
							};

							const contentTypes = tools.filter(accept, function(type) {
								return (((type.name === requestType.name) || (type.name === '*/*') || ((type.type === requestType.type) && (type.subtype === '*'))) && (type.weight > 0.0));
							});
							
							if (types.isEmpty(contentTypes)) {
								this.respondWithStatus(types.HttpStatus.UnsupportedMediaType);
							};
							
							if (!requestEncoding) {
								requestEncoding = types.get(options, 'encoding'); // default encoding
							};
							
							let requestStream = this.requestStream;
							if (!types._implements(requestStream, io.Stream)) {
								if (requestEncoding) {
									if (!nodejsIO.TextInputStream.$isValidEncoding(requestEncoding)) {
										this.respondWithStatus(types.HttpStatus.UnsupportedMediaType);
									};
									requestStream = new nodejsIO.TextInputStream({nodeStream: this.requestStream, encoding: requestEncoding});
								} else {
									requestStream = new nodejsIO.BinaryInputStream({nodeStream: this.requestStream});
								};
							};

							this.requestStream = requestStream;
							this.requestStreamIsReady = true;
						};
						
						return this.requestStream;
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
							// TODO: delete options.callback;
							if (!(callback instanceof types.Callback)) {
								const callbackObj = types.get(options, 'callbackObj');
								callback = new doodad.Callback(callbackObj, callback);
							};
						};

						const requestStream = this.getRequestStream(options);

						if (requestStream.isListening()) {
							throw new types.Error("Transfer has already started.");
						};
						
						if (callback) {
							requestStream.onReady.attach(null, function readyCallback(ev) {
								ev.preventDefault();
								callback(ev.data);
							});
						};
						
						requestStream.listen();
					}),
					
					proceed: doodad.OVERRIDE(function proceed(handler) {
						if (this.__closed) {
							throw new server.RequestClosed();
						};
						
						const Promise = types.getPromise();
						
						_shared.setAttribute(this, 'currentHandler', handler);
						
						let promise;
						if (types._implements(handler, httpMixIns.Handler)) {
							promise = handler.execute(this);
						} else { // if (types.isJsFunction(handler))
							promise = Promise.resolve(handler(this));
						};
						
						return promise
							.catch(this.catchError)
							.then(function(handler) {
								if (handler) {
									return this.proceed(handler);
								} else {
									handler = this.route && this.route.nextSibling();
									if (handler) {
										return this.proceed(handler);
									};
								};
							}, null, this);
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
						
						// NOTE: See "Request.catchError"
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

							if (this.nodeJsResponse) {
								if (forceDisconnect) {
									// Close sockets
									this.nodeJsResponse.destroy();
									this.nodeJsRequest.destroy();
								} else if (this.responseStreamIsReady) {
									// EOF
									this.responseStream.write(io.EOF);
									this.responseStream.flush();
								} else {
									// EOF
									this.nodeJsResponse.end();
								};
							};
						};
						
						// NOTE: See "Request.catchError"
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
							const fixed = tools.title(name, '-');
							value = (types.isNothing(value) ? '' : tools.trim(types.toString(value)));
							if (value) {
								responseHeaders[fixed] = value;
							} else {
								delete responseHeaders[fixed];
							};
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
							const fixed = tools.title(name, '-');
							value = (types.isNothing(value) ? '' : tools.trim(types.toString(value)));
							if (value) {
								responseTrailers[fixed] = value;
							} else {
								delete responseTrailers[fixed];
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
							_shared.setAttributes(this, {
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
							
							_shared.setAttributes(this, {
								responseStatus: response.statusCode,
								responseMessage: response.statusMessage,
							});

							this.__headersWritten = true;
						};
					}),
					
					responseStreamOnWrite: doodad.PROTECTED(function responseStreamOnWrite(ev) {
						if (!this.__closed) {
							this.sendHeaders();
						};
					}),
					
					addResponsePipe: doodad.PUBLIC(function addResponsePipe(stream) {
						if (this.responseStreamIsReady) {
							throw new types.NotAvailable();
						};
						const responseStream = this.responseStream;
						if (!types._implements(stream, io.Stream) && types._implements(responseStream, io.Stream)) {
							const iwritable = responseStream.getInterface(nodejsIOInterfaces.IWritable);
							stream.pipe(iwritable);
						} else {
							stream.pipe(responseStream);
						};
						this.responseStream = stream;
					}),
					
					getResponseStream: doodad.OVERRIDE(function getResponseStream(/*optional*/options) {
						if (this.__closed) {
							throw new server.RequestClosed();
						};							

						if (!this.responseStreamIsReady) {
							let encoding = null;
							let contentType = http.parseContentTypeHeader(types.get(options, 'contentType', this.getResponseHeader('content-type')));
							if (!contentType) {
								throw new types.Error("'Content-Type' header missing or invalid.");
							};
							encoding = types.get(options, 'encoding', types.get(contentType.params, 'charset'));
							if (encoding) {
								this.addHeaders({'Content-Type':  contentType.name + ';charset=' + encoding});
							} else {
								this.addHeaders({'Content-Type':  contentType.name});
							};

							let responseStream = this.responseStream;
							
							if (!types._implements(responseStream, io.Stream)) {
								const postpone = types.get(options, 'postpone', false);
								if (encoding) {
									if (!nodejsIO.TextInputStream.$isValidEncoding(encoding)) {
										throw new types.Error("Invalid encoding.");
									};
									responseStream = new nodejsIO.TextOutputStream({encoding: encoding, nodeStream: responseStream, autoFlush: !postpone});
								} else {
									responseStream = new nodejsIO.BinaryOutputStream({nodeStream: responseStream, autoFlush: !postpone});
								};

								this.responseStream = responseStream;
							};
							
							if (responseStream.options.autoFlush) { // if (!postpone)
								responseStream.onWrite.attachOnce(this, this.responseStreamOnWrite);
							};
							
							this.responseStreamIsReady = true;
						};
						
						return this.responseStream;
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

						var proceedTrailers = new doodad.Callback(this, function _proceedTrailers() {
							trailers = this.responseTrailers;
							
							if (!types.isEmpty(trailers)) {
								this.nodeJsResponse.addTrailers(trailers);
							};
							
							this.close();
						});
						
						if (this.responseStreamIsReady) {
							this.responseStream.flush({callback: proceedTrailers});
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
						if (this.responseStreamIsReady) {
							this.responseStream.clear();
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

						_shared.setAttributes(this, {
							responseStatus: status,
							responseMessage: message,
						});

						this.data.statusData = data;
						
						this.sendHeaders();
						
						this.onStatus(new doodad.Event());
						
						this.end();
					}),
					
					catchError: function catchError(ex) {
						const request = this;
						const max = 5; // prevents infinite loop
						let count = 0,
							abort = false;
						if (request.isDestroyed()) {
							if (types._instanceof(ex, types.ScriptAbortedError)) {
								abort = true;
							} else if (types._instanceof(ex, server.ScriptInterruptedError)) {
								// Do nothing
							} else {
								count = max;
							};
						} else {
							while (count < max) {
								count++;
								try {
									if (types._instanceof(ex, types.HttpError)) {
										request.respondWithStatus(ex.code);
									} else if (types._instanceof(ex, http.ProceedNewHandler)) {
										return ex.handler;
									} else if (types._instanceof(ex, server.RequestClosed)) {
										tools.callAsync(function() {
											if (!request.isDestroyed()) {
												request.destroy();
											};
										}, -1);
									} else if (types._instanceof(ex, server.EndOfRequest)) {
										request.close();
									} else if (types._instanceof(ex, types.ScriptAbortedError)) {
										abort = true;
									} else if (types._instanceof(ex, types.ScriptInterruptedError)) {
										request.close(true);
									} else {
										// Internal error.
										request.respondWithError(ex);
									};
									break;
								} catch(o) {
									ex = o;
								};
							};
						};
						if (abort) {
							throw ex;
						} else if (count >= max) {
							// Failed to respond with internal error.
							try {
								doodad.trapException(ex);
							} catch(o) {
							};
							try {
								if (!request.isDestroyed()) {
									request.destroy();
								};
							} catch(o) {
							};
						};
					},
					
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
							//this.respondWithStatus(types.HttpStatus.NotFound);
							this.end();
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
							this.end();
						} else {
							this.clear();
							this.__redirectsCount++;
							if (types.isString(url)) {
								url = files.Url.parse(url);
							};
							_shared.setAttribute(this, 'url', url);
							// NOTE: See "Request.catchError"
							throw new http.ProceedNewHandler(this.server.routes);
						};
					}),
					
					//reject: doodad.OVERRIDE(function reject(/*optional*/rejectData, /*optional*/newHandler) {
					//	// NOTE: Must always throws an error.
					//	if (this.__closed) {
					//		throw new server.RequestClosed();
					//	};							
					//	_shared.setAttributes(this, {
					//		rejected: true,
					//		rejectHandler: this.currentHandler,
					//		rejectData: rejectData,
					//	});
					//	if (!newHandler) {
					//		newHandler = this.route.nextSibling();
					//	};
					//	if (newHandler) {
					//		// NOTE: See "Request.catchError"
					//		throw new http.ProceedNewHandler(newHandler);
					//	} else {
					//		throw new types.ScriptInterruptedError();
					//	};
					//}),
					
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

					hasRequestStream: doodad.OVERRIDE(function hasRequestStream() {
						return this.requestStreamIsReady;
					}),
					
					hasResponseStream: doodad.OVERRIDE(function hasResponseStream() {
						return this.responseStreamIsReady;
					}),
					
					isFullfilled: doodad.OVERRIDE(function isFullfilled() {
						return !types.isNothing(this.responseStatus) || 
							!!this.hasRequestStream() || 
							!!this.hasResponseStream() || 
							!types.isEmpty(this.responseHeaders) || 
							!types.isEmpty(this.responseTrailers);
					}),
				}));
				
				nodejsHttp.REGISTER(http.Server.$extend(
				{
					$TYPE_NAME: 'Server',

					__nodeServer: doodad.PROTECTED(doodad.READ_ONLY()),
					__address: doodad.PROTECTED(doodad.READ_ONLY()),
					__listening: doodad.PROTECTED(false),
					
					onNodeRequest: doodad.PROTECTED(function onNodeRequest(nodeRequest, nodeResponse) {
						const Promise = types.getPromise();
						if (this.__listening) {
							const request = new nodejsHttp.Request(this, nodeRequest, nodeResponse);
							
							const ev = new doodad.Event({
									request: request,
								});
								
							this.onNewRequest(ev);
								
							if (!ev.prevent) {
								request.proceed(this.routes)
									.catch(request.catchError)
									.then(function endRequest() {
										try {
											if (!request.isDestroyed()) {
												if (request.isFullfilled()) {
													request.end();
												} else {
													request.respondWithStatus(types.HttpStatus.NotFound);
												};
											};
										} catch(o) {
										};
									})
									.catch(tools.catchAndExit);
							};
						};
					}),
					
					//onNodeConnect: doodad.PROTECTED(function onNodeConnect(request, socket, head) {
					//}),
					//onNodeConnectHandler: doodad.PROTECTED(null),
					
					onNodeListening: doodad.PROTECTED(function onNodeListening() {
						_shared.setAttribute(this, '__address', this.__nodeServer.address());
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

						_shared.setAttribute(this, '__nodeServer', null);
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
							
							_shared.setAttribute(this, '__nodeServer', server);
							
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
							
							_shared.setAttribute(this, 'protocol', protocol);
							
							this.onListen(new doodad.Event());
						};
					}),
					stopListening: doodad.OVERRIDE(function stopListening() {
						if (this.__listening) {
							this.__listening = false;
							this.onStopListening(new doodad.Event());
							this.__nodeServer.close();
							_shared.setAttributes(this, {
								__nodeServer: null,
								__address: null,
							});
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

					$prepare: doodad.OVERRIDE(function $prepare(options) {
						this._super(options);
						
						let val;
						
						val = types.get(options, 'path');
						if (types.isString(val)) {
							val = files.Path.parse(val);
						};
						root.DD_ASSERT && root.DD_ASSERT((val instanceof files.Path), "Invalid path.");
						options.path = val;

						val = types.toBoolean(types.get(options, 'showFolders', false));
						options.showFolders = val;
						if (val) {
							val = types.get(options, 'folderTemplate');
							if (types.isNothing(val)) {
								val = files.Path.parse(module.filename).set({file: null}).combine('./res/templates/Folder.ddt', {os: 'linux'});
							} else if (types.isString(val)) {
								val = files.Path.parse(val);
							};
							root.DD_ASSERT && root.DD_ASSERT((val instanceof files.Path), "Invalid folder template.");
							options.folderTemplate = val;
						};
					}),

					//createResponseStream: doodad.OVERRIDE(function createResponseStream(request, outputStream, /*optional*/options) {
					//	const postpone = types.get(options, 'postpone', false);
					//	if (request.data.isFolder) {
					//		return new nodejsIO.TextOutputStream({nodeStream: outputStream, autoFlush: !postpone});
					//	};
					//}),
					
					getSystemPath: doodad.PROTECTED(function getSystemPath(request) {
						let path;
						if (request.url.args.has('res')) {
							path = request.route.folderTemplate.set({file: null}).combine('./public/' + request.url.args.get('res'), {isRelative: true, os: 'linux'});
						} else {
							path = request.route.path.combine(request.route.matcherResult.urlRemaining);
						};
			//console.log(path.toString());
						return path;
					}),
					
					addHeaders: doodad.PROTECTED(doodad.ASYNC(function addHeaders(request) {
						const Promise = types.getPromise();
						const path = this.getSystemPath(request);
						return Promise.create(function tryStat(resolve, reject) {
								nodeFs.stat(path.toString(), new doodad.Callback(this, function getStatsCallback(err, stats) {
									if (err) {
										if (err.code === 'ENOENT') {
											//request.respondWithStatus(types.HttpStatus.NotFound);
											resolve(null);
										} else {
											reject(err);
										};
									} else {
										resolve(stats);
									};
								}))
							}, this)
							.then(function parseStats(stats) {
								if (!stats) {
									return null;
								};
								
								let mimeTypes;
								if (stats.isFile()) {
									mimeTypes = mime.getTypes(path.file);
								} else {
									mimeTypes = ['text/html', 'application/json'];
								};
								
								const mimeType = request.parseAccept(mimeTypes)[0];
								
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

								return {
									mimeType: mimeType,
									stats: stats,
									path: path,
								};
							});
					})),

					sendFile: doodad.PROTECTED(doodad.ASYNC(function sendFile(request, data) {
						const Promise = types.getPromise();
					
						return Promise.create(function tryPipe(resolve, reject) {
							request.data.isFolder = false;

							const inputStream = nodeFs.createReadStream(data.path.toString());
							const outputStream = request.getResponseStream();
							const iwritable = outputStream.getInterface(nodejsIOInterfaces.IWritable);

							inputStream
								.once('end', resolve)
								.pipe(iwritable, {end: false});
						});
					})),
					
					sendFolder: doodad.PROTECTED(doodad.ASYNC(function sendFolder(request, data) {
						const Promise = types.getPromise();
						request.data.isFolder = true;
						if (request.url.file) {
							request.redirectClient(request.url.pushFile());
						};
						function sendHtml(filesList) {
							return templatesHtml.getTemplate(request.route.folderTemplate)
								.then(function renderTemplate(templType) {
									const stream = request.getResponseStream({encoding: templType.$ddt.options.encoding});
									const templ = new templType(request, data.path, filesList);
									templ.render(stream);
									return templ.renderPromise
										.nodeify(function cleanup(err, result) {
											templ.destroy();
											if (err) {
												throw err;
											} else {
												return result;
											};
										});
								});
						};
						function sendJson(filesList) {
							return Promise.create(function sendJsonPromise(resolve, reject) {
								// TODO: Create helper functions in the request object, with an option to use a specific format handler
								// TODO: JSON Stream (instead of global.JSON)
								filesList = tools.map(filesList, function(file) {
									return {
										isFolder: file.isFolder,
										name: file.name,
										size: file.size,
									};
								});
								const json = _shared.Natives.windowJSON.stringify(filesList);
								const stream = request.getResponseStream();
								stream.write(json, {callback: function writeCallback(err) {
									if (err) {
										reject(err);
									} else {
										resolve();
									};
								}});
							}, this);
						};
						function send(filesList) {
							let promise;
							if (data.mimeType.name === 'text/html') {
								promise = sendHtml(filesList);
							} else {
								promise = sendJson(filesList);
							};
							return promise
								.catch(function handleError(err) {
									request.respondWithError(err);
								});
						};
						function readDir() {
							return files.readdir(data.path, {async: true})
								.then(function sortFiles(filesList) {
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
								});
						};
						
						
						return readDir()
							.then(send);
					})),
					
					execute_HEAD: doodad.OVERRIDE(function execute_HEAD(request) {
						return this.addHeaders(request);
					}),
					
					execute_GET: doodad.OVERRIDE(function execute_GET(request) {
						// TODO: Cache-Control
						// TODO: Range
						return this.addHeaders(request)
							.then(function(data) {
								if (data) {
									if (data.stats.isFile()) {
										return this.sendFile(request, data);
									} else if ((data.mimeType.name === 'text/html') && request.route.showFolders && templatesHtml.isAvailable()) {
										return this.sendFolder(request, data);
									} else if ((data.mimeType.name === 'application/json') && request.route.showFolders) {
										return this.sendFolder(request, data);
									};
								};
							}, this);
					}),
					
				}));

				nodejsHttp.REGISTER(nodejsHttp.StaticPage.$extend(
				{
					$TYPE_NAME: 'JavascriptPage',
					
					$__cache: doodad.PROTECTED(doodad.TYPE(  {}  )),
					
					$prepare: doodad.OVERRIDE(function $prepare(options) {
						this._super(options);
						
						let val;
						
						val = types.get(options, 'cachePath');
						if (types.isString(val)) {
							val = files.Path.parse(val);
						};
						root.DD_ASSERT && root.DD_ASSERT((val instanceof files.Path), "Invalid cache path.");
						options.cachePath = val
						
						val = types.get(options, 'variables');
						options.variables = val || [];
					}),

					getCachedFile: doodad.PROTECTED(doodad.ASYNC(function getCachedFile(request) {
						const Promise = types.getPromise();
						function loopOpenFile(count) {
							const cachedFilePath = request.route.cachePath.combine(null, {file: tools.generateUUID()});
							return Promise.create(function tryOpen(resolve, reject) {
									const stream = nodeFs.createWriteStream(cachedFilePath.toString(), {flags: 'wx', mode: request.route.cachedFilesMode || 0o644});
									const cached = {
										path: cachedFilePath,
										stream: stream,
										ready: false,
										writing: false,
									};
									request.onSanitize.attachOnce(this, function sanitize() {
										if (cached.stream) {
											stream.destroy();
											cached.stream = null;
										};
									});
									resolve(cached);
								}, this)
								.catch(function(err) {
									if ((err.code === 'EEXIST') && (count > 0)) {
										resolve(loopOpenFile.call(this, count - 1));
									} else {
										reject(err);
									};
								}, this);
						};
						
						const type = types.getType(this),
							key = request.data.cacheKey;
							
						let cached = types.get(type.$__cache, key);
						
						if (cached) {
							return cached;
						} else {
							return loopOpenFile.call(this, 10)
								.then(function(cached) {
									type.$__cache[key] = cached;
									return cached;
								}, this);
						};
					})),
					
					createPipes: doodad.PROTECTED(doodad.ASYNC(function createPipes(request) {
						return this.getCachedFile(request)
							.then(function createPipes(cached) {
								if (!cached || !cached.ready) {
									const jsStream = new minifiers.Javascript({autoFlush: true}),
										variables = request.route.variables;
									tools.forEach(variables, function(value, name) {
										jsStream.define(name, value);
									});
									if (cached && !cached.writing) {
										cached.writing = true;
										const ireadable = jsStream.getInterface(nodejsIOInterfaces.IReadable);
										ireadable.pipe(cached.stream);
									};
									request.addResponsePipe(jsStream);
								};
							}, null, this);
					})),

					getSystemPath: doodad.OVERRIDE(function getSystemPath(request) {
						let path = this._super(request);
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
					
					addHeaders: doodad.OVERRIDE(function addHeaders(request) {
						return this._super(request)
							.then(function overrideHeaders(data) {
								request.clearHeaders('Content-Length');
								request.addHeaders({
									'Content-Type': mime.getTypes(request.data.fileName)[0],
									'Content-Disposition': 'filename=' + request.data.fileName,
								});
								return data;
							});
					}),
					
					sendFile: doodad.OVERRIDE(function sendFile(request, data) {
						const _super = this.superAsync();
						return this.createPipes(request)
							.then(function callSuper() {
								return _super(request, data);
							});
					}),
				}));


				return function init(/*optional*/options) {
					return locale.loadLocale('en_US').then(function loadLocaleCallback(locale) {
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