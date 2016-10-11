//! BEGIN_MODULE()

//! REPLACE_BY("// Copyright 2016 Claude Petit, licensed under Apache License version 2.0\n", true)
// doodad-js - Object-oriented programming framework
// File: NodeJs_Server_Http.js - HTTP Server tools for NodeJs
// Project home: https://github.com/doodadjs/
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

module.exports = {
	add: function add(DD_MODULES) {
		DD_MODULES = (DD_MODULES || {});
		DD_MODULES['Doodad.NodeJs.Server.Http'] = {
			version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE()*/,
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
					dates = tools.Dates,
					moment = dates.Moment, // Optional
					
					nodeFs = require('fs'),
					nodeZlib = require('zlib'),
					nodeHttp = require('http');

				
				const __Internal__ = {
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


				nodejsHttp.REGISTER(http.Response.$extend(
										mixIns.NodeEvents,
				{
					$TYPE_NAME: 'Response',

					nodeJsStream: doodad.PROTECTED(null),

					__ending: doodad.PROTECTED(false),

					nodeJsStreamOnError: doodad.NODE_EVENT('error', function nodeJsStreamOnError(context, err) {
						// When 'error' is raised ?
						debugger;
						console.error(err);
					}),
					
					nodeJsStreamOnClose: doodad.NODE_EVENT(['close'], function nodeJsStreamOnClose(context) {
						// Response stream has been closed
						if (!this.ended) {
							this.end(true);
						};
					}),
					
					create: doodad.OVERRIDE(function create(request, nodeJsStream) {
						this._super(request);

						this.nodeJsStream = nodeJsStream;
						this.nodeJsStreamOnError.attach(nodeJsStream);
						this.nodeJsStreamOnClose.attachOnce(nodeJsStream);
					}),

					destroy: doodad.OVERRIDE(function destroy() {
						this.nodeJsStream.destroy();
						this.stream && !this.stream.isDestroyed() && this.stream.destroy();

						this._super();
					}),
					
					end: doodad.PUBLIC(doodad.ASYNC(function end(forceDisconnect) {
						if (this.ended || this.__ending) {
							throw new server.EndOfRequest();
						};

						this.__ending = true;
						
						return Promise.try(function() {
								if (forceDisconnect) {
									if (this.stream) {
										this.stream.destroy();
									};
									this.nodeJsStream.destroy();
								} else {
									if (!this.trailersSent) {
										this.sendTrailers();
									};
									let promise = null;
									if (!this.nodeJsStream.finished) {
										promise = Promise.create(function(resolve, reject) {
												this.nodeJsStream.once('close', resolve);
												this.nodeJsStream.once('finish', resolve);
												this.nodeJsStream.once('error', reject);
											}, this);
										if (this.stream) {
											// EOF
											this.stream.write(io.EOF);
											this.stream.flush()
										} else {
											// EOF
											this.nodeJsStream.end();
										};
									};
									return promise;
								};
							}, this)
							.then(function() {
								_shared.setAttribute(this, 'ended', true);

								if (!this.request.ended) {
									return this.request.end(forceDisconnect);
								};

								throw new server.EndOfRequest();
							}, null, this);
					})),

					sendHeaders: doodad.PUBLIC(function sendHeaders() {
						//if (this.ended) {
						//	throw new server.EndOfRequest();
						//};

						if (this.headersSent) {
							throw new types.Error("Can't respond with a new status or new headers because the headers have already been sent to the client.");
						};

						if (this.nodeJsStream.headersSent) {
							// NOTE: Should not happen
							throw new types.Error("Can't send the headers and the status because Node.js has already sent headers to the client.");
						};

						this.onSendHeaders(new doodad.Event());
							
						const status = this.status || types.HttpStatus.OK,
							message = this.message || nodeHttp.STATUS_CODES[status],
							headers = this.headers,
							response = this.nodeJsStream;
						
						response.statusCode = status;
						response.statusMessage = message;
						tools.forEach(headers, function(value, name) {
							if (value) {
								response.setHeader(name, value);
							} else {
								response.removeHeader(name);
							};
						});
							
						_shared.setAttributes(this, {
							status: response.statusCode,
							message: response.statusMessage,
						});

						_shared.setAttribute(this, 'headersSent', true);
					}),
					
					__streamOnWrite: doodad.PROTECTED(function __streamOnWrite(ev) {
						if (!ev.prevent) {
							if (!this.ended && !this.headersSent) {
								this.sendHeaders();
							};
						};
					}),
					
					getStream: doodad.OVERRIDE(function getStream(/*optional*/options) {
						const Promise = types.getPromise();

						if (this.ended) {
							throw new server.EndOfRequest();
						};							

						options = types.nullObject(options);

						const status = options.status,
							message = options.message,
							headers = options.headers;

						if (status || headers) {
							if (this.headersSent) {
								throw new types.Error("Can't set a new status or new headers because the headers have been sent to the client.");
							};
							if (headers) {
								this.addHeaders(headers);
							};
							if (status) {
								this.setStatus(status, message);
							};
						};

						if (this.stream) {
							return this.stream;
						};

						if (options.contentType) {
							this.setContentType(options.contentType, options.encoding);
						} else if (options.encoding) {
							this.setContentType(this.contentType || 'text/plain', options.encoding);
						};
						
						if (!this.contentType) {
							throw new types.Error("'Content-Type' has not been set.");
						};

						let responseStream = new nodejsIO.BinaryOutputStream({nodeStream: this.nodeJsStream}); // , autoFlush: !options.postpone
						responseStream.onWrite.attachOnce(this, this.__streamOnWrite, 10);

						const ev = new doodad.Event({
							stream: responseStream,
							options: options,
						});
						this.onCreateStream(ev);
						
						return Promise.resolve(ev.data.stream)
							.then(function(responseStream) {
								if (types.isNothing(responseStream)) {
									throw new http.StreamAborted();
								};

								if (!ev.prevent) {
									tools.forEach(this.__pipes, function(pipe) {
										pipe.options.pipeOptions = types.nullObject(pipe.options.pipeOptions);
										if (!types._implements(pipe.stream, io.Stream) && types._implements(responseStream, io.Stream)) {
											const iwritable = responseStream.getInterface(nodejsIOInterfaces.IWritable);
											pipe.stream.pipe(iwritable, pipe.options.pipeOptions);
										} else {
											pipe.stream.pipe(responseStream, pipe.options.pipeOptions);
										};
										responseStream = pipe.stream;
									});
								};
								this.__pipes = null;   // no more pipes allowed

								const encoding = this.contentType.params.charset;
								if (types._implements(responseStream, io.Stream)) {
									if (encoding && !types._implements(responseStream, ioMixIns.TextOutputStream)) {
										const textStream = new io.TextOutputStream({encoding: encoding});
										textStream.pipe(responseStream);
										responseStream = textStream;
									};
								} else {
									if (encoding) {
										if (!nodejsIO.TextInputStream.$isValidEncoding(encoding)) {
											throw new types.Error("Invalid encoding.");
										};
										responseStream = new nodejsIO.TextOutputStream({encoding: encoding, nodeStream: responseStream});
									} else {
										responseStream = new nodejsIO.BinaryOutputStream({nodeStream: responseStream});
									};
								};

								this.stream = responseStream;

								return responseStream;
							}, null, this);
					}),
					
					sendTrailers: doodad.PROTECTED(function sendTrailers(/*optional*/trailers) {
						//if (this.ended) {
						//	throw new server.EndOfRequest();
						//};

						if (this.trailersSent) {
							//throw new types.Error("Trailers have already been sent and the request will be closed.");
							return;
						};
						
						if (!this.headersSent) {
							this.sendHeaders(); // must write headers before
						};
						
						if (trailers) {
							this.addTrailers(trailers);
						};

						trailers = this.trailers;
						if (!types.isEmpty(trailers)) {
							this.nodeJsStream.addTrailers(trailers);
						};

						_shared.setAttribute(this, 'trailersSent', true);
					}),
					
					clear: doodad.OVERRIDE(function clear() {
						if (this.ended) {
							throw new server.EndOfRequest();
						};							
						if (this.nodeJsStream) {
							if (!this.headersSent) {
								this.clearHeaders();
							};
						};
						if (this.stream) {
							this.stream.clear();
						};
					}),
					
					respondWithStatus: doodad.OVERRIDE(function respondWithStatus(status, /*optional*/message, /*optional*/headers, /*optional*/data) {
						// NOTE: Must always throws an error.
						if (this.ended) {
							throw new server.EndOfRequest();
						};

						if (this.headersSent) {
							throw new types.Error("Can't respond with a new status or new headers because the headers have already been sent to the client.");
						};
						
						this.addHeaders(headers);

						_shared.setAttributes(this, {
							status: status,
							message: message || nodeHttp.STATUS_CODES[status],
							statusData: data,
						});

						this.sendHeaders();
						
						this.onStatus(new doodad.Event());

						return this.request.end();
					}),

					respondWithError: doodad.OVERRIDE(function respondWithError(ex) {
						// NOTE: Must always throw an error.
						if (this.ended) {
							throw new server.EndOfRequest();
						};							
						if (ex.critical) {
							throw ex;
						} else if (ex.bubble) {
							// Do nothing
						} else {
							this.clear();
							this.onError(new doodad.ErrorEvent(ex));
							
							if (!this.nodeJsStream) {
								// Too late !
								return this.end();
							} else if (this.headersSent) {
								// Too late !
								return this.request.end();
							} else {
								return this.respondWithStatus(types.HttpStatus.InternalError, null, null, ex);
							};
						};
					}),

					sendFile: doodad.PUBLIC(doodad.ASYNC(function sendFile(path) {
						const Promise = types.getPromise();

						if (!(path instanceof files.Path)) {
							path = files.Path.parse(path);
						};

						return Promise.create(function tryStat(resolve, reject) {
								nodeFs.stat(path.toString(), new doodad.Callback(this, function getStatsCallback(err, stats) {
									if (err) {
										reject(err);
									} else {
										resolve(stats);
									};
								}))
							}, this)
							.then(function parseStats(stats) {
								if (!stats.isFile()) {
									throw new types.HttpError(types.HttpStatus.NotFound);
								};

								if (!this.contentType) {
									const contentTypes = mime.getTypes(path.file);
									this.setContentType(contentTypes);
								};
								
								this.addHeaders({
									'Last-Modified': http.toRFC1123Date(stats.mtime), // ex.:   Fri, 10 Jul 2015 03:16:55 GMT
									'Content-Length': stats.size,
								});

								if (!this.getHeader('Content-Disposition')) {
									this.addHeader('Content-Disposition', 'attachment; filename="' + path.file.replace(/\"/g, '\\"') + '"');
								};

								if (request.verb !== 'HEAD') {
									return this.getStream();
								};
							}, null, this)
							.then(function (outputStream) {
								if (outputStream) {
									const iwritable = outputStream.getInterface(nodejsIOInterfaces.IWritable);
									const inputStream = nodeFs.createReadStream(path.toString());
									inputStream.pipe(iwritable);
									return outputStream.onEOF.promise();
								};
							}, null, this)
							.catch(function cacthError(err) {
								if (err.code === 'ENOENT') {
									throw new types.HttpError(types.HttpStatus.NotFound);
								} else if (err.code === 'EPERM') {
									throw new types.HttpError(types.HttpStatus.Forbidden);
								} else {
									throw err;
								};
							}, this);
					})),
				}));

				nodejsHttp.REGISTER(http.Request.$extend(
										mixIns.NodeEvents,
				{
					$TYPE_NAME: 'Request',
					
					nodeJsStream: doodad.PROTECTED(null),

					//__ending: doodad.PROTECTED(false),

					startTime: doodad.PROTECTED(null),

					$__timeStartSecond: doodad.PROTECTED(doodad.TYPE(null)),
					$__timeStartMinute: doodad.PROTECTED(doodad.TYPE(null)),
					$__timeStartHour: doodad.PROTECTED(doodad.TYPE(null)),
					$__lastSecond: doodad.PROTECTED(doodad.TYPE(0)),
					$__lastMinute: doodad.PROTECTED(doodad.TYPE(0)),
					$__lastHour: doodad.PROTECTED(doodad.TYPE(0)),

					$__perSecond: doodad.PROTECTED(doodad.TYPE(0.0)),
					$__perMinute: doodad.PROTECTED(doodad.TYPE(0.0)),
					$__perHour: doodad.PROTECTED(doodad.TYPE(0.0)),

					$getStats: doodad.OVERRIDE(function $getStats() {
						const stats = this._super();
						return types.extend(stats, {
							perSecond: this.$__perSecond,
							perMinute: this.$__perMinute,
							perHour: this.$__perHour,
						});
					}),
					
					$clearStats: doodad.OVERRIDE(function $clearStats() {
						this._super();

						this.$__timeStartSecond = null;
						this.$__timeStartMinute = null;
						this.$__timeStartHour = null;
						this.$__lastSecond = 0;
						this.$__lastMinute = 0;
						this.$__lastHour = 0;

						this.$__perSecond = 0.0;
						this.$__perMinute = 0.0;
						this.$__perHour = 0.0;
					}),
					
					nodeJsStreamOnError: doodad.NODE_EVENT('error', function nodeJsStreamOnError(context, err) {
						// When 'error' is raised ?
						debugger;
						console.error(err);
					}),
					
					nodeJsStreamOnClose: doodad.NODE_EVENT(['close'], function nodeJsStreamOnClose(context) {
						if (!this.ended) {
							this.end(true);
						};
					}),
					
					create: doodad.OVERRIDE(function create(server, nodeJsRequest, nodeJsResponse) {
						this.startTime = process.hrtime();

						this.nodeJsStream = nodeJsRequest;
						this.nodeJsStreamOnError.attach(nodeJsRequest);
						this.nodeJsStreamOnClose.attachOnce(nodeJsRequest);
						
						this._super(server, nodeJsRequest.method, nodeJsRequest.url, nodeJsRequest.headers, [nodeJsResponse]);
						
						const type = types.getType(this);
						
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
					
					//reset : doodad.OVERRIDE(function reset() {
					//	this._super();
					//
					//	this.stream = null;
					//}),

					destroy: doodad.OVERRIDE(function destroy() {
						this.nodeJsStream.destroy();
						this.stream && !this.stream.isDestroyed() && this.stream.destroy();

						this._super();
					}),
					
					createResponse: doodad.OVERRIDE(function createResponse(nodeJsRequest) {
						return new nodejsHttp.Response(this, nodeJsRequest);
					}),

					end: doodad.OVERRIDE(function end(/*optional*/forceDisconnect) {
						// NOTE: MUST ALWAYS THROWS AN ERROR
						
						const Promise = types.getPromise();

						if (this.ended) { // || this.__ending) {
							throw new server.EndOfRequest();
						};

						//this.__ending = true;
						
						function wait() {
							if (!forceDisconnect && !this.isDestroyed()) {
								const queue = this.__waitQueue;
								if (queue.length) {
									this.__waitQueue = [];
									return Promise.all(queue)
										.then(wait, null, this);
								};
							};
						};
						
						return Promise.try(function() {
								if (forceDisconnect) {
									this.nodeJsStream.destroy();
								};

								_shared.setAttribute(this, 'ended', true);

								if (!this.response.ended) {
									return this.response.end(forceDisconnect)
										.catch(server.EndOfRequest, function() {});
								};
							}, this)
							.then(wait, null, this)
							.catch(this.catchError, this)
							.nodeify(function(err) {
								const type = types.getType(this);
								type.$__actives--;
								if (forceDisconnect || this.isDestroyed() || this.response.isDestroyed()) {
//console.log((this.url && this.url.toString()) + ": " + this.response.isDestroyed());
									type.$__aborted++;
								} else {
									const status = this.response.status;
									if (types.HttpStatus.isInformative(status) || types.HttpStatus.isSuccessful(status)) {
										type.$__successful++;
									} else if (types.HttpStatus.isRedirect(status)) {
										type.$__redirected++;
									} else { // if (types.HttpStatus.isError(status))
										var failed = type.$__failed;
										if (types.has(failed, status)) {
											failed[status]++;
										} else {
											failed[status] = 1;
										};
									};
								};

								if (!this.isDestroyed()) {
									this.onEnd();
								};

								if (err) {
									throw err;
								};

								throw new server.EndOfRequest();
							}, this);
					}),

					getStream: doodad.OVERRIDE(function getStream(/*optional*/options) {
						const Promise = types.getPromise();

						if (this.ended) {
							throw new server.EndOfRequest();
						};							

						options = types.nullObject(this.__streamOptions, options);

						if (this.stream) {
							return this.stream;
						};

						let requestStream = new nodejsIO.BinaryInputStream({nodeStream: this.nodeJsStream});

						const ev = new doodad.Event({
							stream: requestStream,
						});
						this.onCreateStream(ev);
						
						return Promise.resolve(ev.data.stream)
							.then(function(requestStream) {
								if (types.isNothing(requestStream)) {
									throw new http.StreamAborted();
								};

								if (!ev.prevent) {
									tools.forEach(this.__pipes, function forEachPipe(pipe) {
										pipe.options.pipeOptions = types.nullObject(pipe.options.pipeOptions);
										if (!types._implements(requestStream, io.Stream) && types._implements(pipe.stream, io.Stream)) {
											const iwritable = pipe.stream.getInterface(nodejsIOInterfaces.IWritable);
											requestStream.pipe(iwritable, pipe.options.pipeOptions);
										} else {
											requestStream.pipe(pipe.stream, pipe.options.pipeOptions);
										};
										requestStream = pipe.stream;
									});
								};
								this.__pipes = null;   // no more pipes allowed
							
								const accept = http.parseAcceptHeader(options.accept);  // content-types expected by the page
								if (!accept) {
									throw new types.Error("Option 'accept' is missing or invalid.");
								};
							
								const requestType = http.parseContentTypeHeader(this.getHeader('Content-Type'));
								if (!requestType) {
									return this.response.respondWithStatus(types.HttpStatus.UnsupportedMediaType);
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
									return this.response.respondWithStatus(types.HttpStatus.UnsupportedMediaType);
								};
							
								if (!requestEncoding) {
									requestEncoding = options.encoding; // default encoding
								};
							
								if (!types._implements(requestStream, io.Stream)) {
									if (requestEncoding) {
										if (!nodejsIO.TextInputStream.$isValidEncoding(requestEncoding)) {
											return this.response.respondWithStatus(types.HttpStatus.UnsupportedMediaType);
										};
										requestStream = new nodejsIO.TextInputStream({nodeStream: requestStream, encoding: requestEncoding});
									} else {
										requestStream = new nodejsIO.BinaryInputStream({nodeStream: requestStream});
									};
								};

								this.stream = requestStream;

								return requestStream;
							}, null, this);
					}),
					
					getTime: doodad.PUBLIC(function getTime() {
						if (this.ended) {
							throw new server.EndOfRequest();
						};							
						const time = process.hrtime(this.startTime);
						return (time[0] * 1000) + (time[1] / 1e6);
					}),
					
					getSource: doodad.PUBLIC(function getSource() {
						// TODO: Add more informations
						if (this.ended) {
							throw new server.EndOfRequest();
						};							
						return types.nullObject({
							address: this.nodeJsStream.socket.remoteAddress,
						});
					}),
				}));
				
				nodejsHttp.REGISTER(http.Server.$extend(
								mixIns.NodeEvents,
				{
					$TYPE_NAME: 'Server',

					__nodeServer: doodad.PROTECTED(doodad.READ_ONLY()),
					__address: doodad.PROTECTED(doodad.READ_ONLY()),
					__listening: doodad.PROTECTED(false),
					
					onNodeRequest: doodad.NODE_EVENT('request', function onNodeRequest(context, nodeRequest, nodeResponse) {
						const Promise = types.getPromise();
						if (this.__listening) {
							if (this.options.validHosts) {
								const host = nodeRequest.headers['host'];
								if (tools.indexOf(this.options.validHosts, host) < 0) {
									nodeResponse.writeHead(types.HttpStatus.BadRequest);
									nodeResponse.end();
									return;
								};
							};

							const request = new nodejsHttp.Request(this, nodeRequest, nodeResponse);
							
							const ev = new doodad.Event({
									request: request,
								});
								
							this.onNewRequest(ev);
								
							if (!ev.prevent) {
								request.proceed(this.handlersOptions)
									.catch(request.catchError)
									.then(function endRequest() {
										if (!request.isDestroyed() && !request.ended) {
											if (request.isFullfilled()) {
												return request.end();
											} else {
												return request.response.respondWithStatus(types.HttpStatus.NotFound);
											};
										};
									})
									.catch(request.catchError)
									.then(function() {
										if (!request.isDestroyed()) {
											request.destroy();
										};
									})
									.catch(tools.catchAndExit, tools); // fatal error
							};
						};
					}),
					
					//onNodeConnect: doodad.NODE_EVENT('connect', function onNodeConnect(context) {
					//}),

					onNodeListening: doodad.NODE_EVENT('listening', function onNodeListening(context) {
						_shared.setAttribute(this, '__address', this.__nodeServer.address());
						tools.log(tools.LogLevels.Info, "HTTP server listening on port '~port~', address '~address~'.", this.__address);
						tools.log(tools.LogLevels.Warning, "IMPORTANT: It is an experimental and not finished software. Don't use it on production, or do it at your own risks. Please report bugs and suggestions to 'doodadjs [at] gmail <dot> com'.");
					}),

					onNodeError: doodad.NODE_EVENT('error', function onNodeError(context, ex) {
						this.onError(new doodad.ErrorEvent(ex));
					}),
					
					onNodeClose: doodad.NODE_EVENT('close', function onNodeClose(context) {
						const server = this.__nodeServer;
						
						this.onNodeListening.detach(server);
						this.onNodeError.detach(server);
						this.onNodeClose.detach(server);
						//this.onNodeConnect.detach(server);
						
						tools.log(tools.LogLevels.Info, "Listening socket closed (address '~address~', port '~port~').", this.__address);

						_shared.setAttribute(this, '__nodeServer', null);
					}),
					
					isListening: doodad.OVERRIDE(function isListening() {
						return this.__listening;
					}),
					
					listen: doodad.OVERRIDE(function listen(/*optional*/options) {
						if (!this.__listening) {
							this.__listening = true;

							options = types.nullObject(options);
							
							const protocol = options.protocol || 'http';
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
								const opts = types.nullObject();
								if (options.pfxFile) {
									opts.pfx = nodeFs.readFileSync(options.pfxFile);
								} else if (options.rawPfx) {
									opts.pfx = options.rawPfx;
								} else {
									if (options.keyFile) {
										opts.key = nodeFs.readFileSync(options.keyFile);
									} else if (options.rawKey) {
										opts.key = options.rawKey;
									} else {
										throw new types.Error("Missing private key file.");
									};
									if (options.certFile) {
										opts.cert = nodeFs.readFileSync(options.certFile);
									} else if (options.rawCert) {
										opts.cert = options.rawCert;
									} else {
										throw new types.Error("Missing certificate file.");
									};
								};
								if (!opts.pfx && !opts.key && !opts.cert) {
									throw new types.Error("Missing private key and certificate files.");
								};
								server = factory.createServer(opts);
							} else {
								server = factory.createServer();
							};
							
							if (types.has(options, 'timeout')) {
								server.setTimeout(options.timeout);
							} else {
								// Default of 2 minutes is too limited...
								server.setTimeout(5 * 60 * 1000); // 5 minutes
							};

							this.onNodeRequest.attach(server);
							this.onNodeListening.attach(server);
							this.onNodeError.attach(server);
							this.onNodeClose.attach(server);

							//if (options.acceptConnect) {
							//	this.onNodeConnect.attach(server);
							//};
							
							//server.on('connection');
							//server.on('checkContinue');
							//server.on('upgrade');
							//server.on('clientError');
							
							_shared.setAttribute(this, '__nodeServer', server);
							
							const target = options.target || '127.0.0.1';
							const type = options.type || 'tcp'; // 'tcp', 'unix', 'handle'
							if (type === 'tcp') { // TCP/IP Socket
								const port = options.port || (protocol === 'https' ? 443 : 80);
								const queueLength = options.queueLength;
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
					
					create: doodad.OVERRIDE(function create(request, cacheHandler, path, fils) {
						this._super(request, cacheHandler);

						this.path = path;
						this.files = fils;

						var cached = cacheHandler.getCached(request);
						files.watch(this.path.toString(), function() {
							cached.invalidate();
						});
					}),
				})));
				
				nodejsHttp.REGISTER(http.StaticPage.$extend(
				{
					$TYPE_NAME: 'StaticPage',

					$prepare: doodad.OVERRIDE(function $prepare(options) {
						types.getDefault(options, 'depth', Infinity);

						options = this._super(options);
						
						let val;
						
						options.defaultEncoding = options.defaultEncoding || 'utf-8';
						
						val = options.path;
						if (!(val instanceof files.Path)) {
							val = files.Path.parse(val);
						};
						root.DD_ASSERT && root.DD_ASSERT((val instanceof files.Path), "Invalid path.");
						options.path = val;

						options.showFolders = types.toBoolean(options.showFolders);

						if (options.showFolders) {
							val = options.folderTemplate;
							if (types.isNothing(val)) {
								val = files.Path.parse(module.filename).set({file: null}).combine('./res/templates/Folder.ddt', {os: 'linux'});
							} else if (!(val instanceof files.Path)) {
								val = files.Path.parse(val);
							};
							root.DD_ASSERT && root.DD_ASSERT((val instanceof files.Path), "Invalid folder template.");
							options.folderTemplate = val;
						};

						options.states = types.extend({}, options.states, {
							'Doodad.NodeJs.Server.Http.CacheHandler': {
								generateKey: doodad.OVERRIDE(function(request, handler) {
									let key = this._super(request, handler);
									if (key) {
										const res = !request.url.file && request.url.args.get('res');
										//key += (res ? ('|' + res) : '');
										if (res) {
											// No cache
											return null;
										};
									};
									return key;
								}),
							},
						});

						return options;
					}),

					getSystemPath: doodad.PROTECTED(function getSystemPath(request) {
						let path;
						if (request.url.args.has('res')) {
							path = this.options.folderTemplate.set({file: null}).combine('./public/' + request.url.args.get('res'), {isRelative: true, os: 'linux'});
						} else {
							const handlerState = request.getHandlerState(this);
							path = this.options.path.combine(handlerState.matcherResult.urlRemaining);
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
											//resolve(request.response.respondWithStatus(types.HttpStatus.NotFound));
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
								
								let contentTypes;
								if (stats.isFile()) {
									contentTypes = mime.getTypes(path.file);
								} else {
									contentTypes = ['text/html; charset=utf-8', 'application/json; charset=utf-8'];
								};
								
								const contentType = request.getAcceptables(contentTypes)[0];
								if (!contentType) {
									return request.response.respondWithStatus(types.HttpStatus.NotAcceptable);
								};

								request.response.addHeaders({
									'Last-Modified': http.toRFC1123Date(stats.mtime), // ex.:   Fri, 10 Jul 2015 03:16:55 GMT
								});
								
								if (stats.isFile()) {
									request.response.addHeaders({
										'Content-Length': stats.size,
										'Content-Type': contentType.toString(),
										'Content-Disposition': 'filename="' + path.file.replace(/\"/g, '\\"') + '"',
									});
								} else {
									// NOTE: Response get chunked (if request is HTTP/1.1).
									request.response.addHeaders({
										'Content-Type': contentType.toString(),
									});
								};

								return types.nullObject({
									contentType: contentType,
									stats: stats,
									path: path,
								});
							});
					})),

					sendFile: doodad.PROTECTED(doodad.ASYNC(function sendFile(request, data) {
						const Promise = types.getPromise();

						if (data.path) {
							request.data.isFolder = false;
							return request.response.getStream()
								.then(function(outputStream) {
									const iwritable = outputStream.getInterface(nodejsIOInterfaces.IWritable);
									return Promise.create(function(resolve, reject) {
										const inputStream = nodeFs.createReadStream(data.path.toString());
										inputStream
											.once('close', resolve)
											.once('end', resolve)
											.once('error', reject)
											.pipe(iwritable, {end: true});
									}, this);
								}, null, this);
						};
					})),
					
					sendFolder: doodad.PROTECTED(doodad.ASYNC(function sendFolder(request, data) {
						const Promise = types.getPromise();
						request.data.isFolder = true;
						if (request.url.file) {
							return request.redirectClient(request.url.pushFile());
						};
						function sendHtml(filesList) {
							return templatesHtml.getTemplate(this.options.folderTemplate)
								.then(function renderTemplate(templType) {
									const templ = new templType(request, request.getHandlers(nodejsHttp.CacheHandler).slice(-1)[0], data.path, filesList);
									return request.response.getStream({encoding: templType.$ddt.options.encoding})
										.then(function(stream) {
											templ.setStream(stream);
											return templ.render();
										}, null, this)
										.nodeify(function cleanup(err, result) {
											templ.destroy();
											if (err) {
												throw err;
											} else {
												return result;
											};
										});
								}, null, this);
						};
						function sendJson(filesList) {
							// TODO: Create helper functions in the request object, with an option to use a specific format handler
							// TODO: JSON Stream (instead of global.JSON)
							filesList = tools.map(filesList, function(file) {
								return types.nullObject({
									isFolder: file.isFolder,
									name: file.name,
									size: file.size,
								});
							});
							const json = _shared.Natives.windowJSON.stringify(filesList);
							return request.response.getStream()
								.then(function(stream) {
									return stream.writeAsync(json);
								}, null, this);
						};
						function send(filesList) {
							if (data.contentType.name === 'text/html') {
								return sendHtml.call(this, filesList);
							} else {
								return sendJson.call(this, filesList);
							};
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
								}, null, this);
						};
						
						
						return readDir.call(this)
							.then(function(filesList) {
								return send.call(this, filesList);
							}, null, this);
					})),
					
					execute_HEAD: doodad.OVERRIDE(function execute_HEAD(request) {
						return this.addHeaders(request);
					}),
					
					execute_GET: doodad.OVERRIDE(function execute_GET(request) {
						// TODO: Range
						return this.addHeaders(request)
							.then(function(data) {
								if (data) {
									if (data.stats.isFile()) {
										return this.sendFile(request, data);
									} else if ((data.contentType.name === 'text/html') && this.options.showFolders && templatesHtml.isAvailable()) {
										return this.sendFolder(request, data);
									} else if ((data.contentType.name === 'application/json') && this.options.showFolders) {
										return this.sendFolder(request, data);
									};
								};
							}, this);
					}),
					
				}));

				nodejsHttp.REGISTER(nodejsHttp.StaticPage.$extend(
				{
					$TYPE_NAME: 'JavascriptPage',
					
					$prepare: doodad.OVERRIDE(function $prepare(options) {
						options = this._super(options);
						
						let val;
						
						options.variables = options.variables || {};

						return options;
					}),

					sendFile: doodad.OVERRIDE(function sendFile(request, data) {
						const jsStream = new minifiers.Javascript();

						request.onSanitize.attachOnce(this, function sanitize() {
							jsStream.destroy(); // stops the stream in case of abort
						});

						tools.forEach(this.options.variables, function forEachVar(value, name) {
							jsStream.define(name, value);
						});

						request.response.clearHeaders('Content-Length');
						request.response.addPipe(jsStream);

						return this._super(request, data);
					}),
				}));
				
				
				nodejsHttp.REGISTER(io.Stream.$extend(
									io.InputStream,
									io.OutputStream,
				{
					$TYPE_NAME: 'CacheStream',

					__listening: doodad.PROTECTED(false),
					__remaining: doodad.PROTECTED(null),
					__headersCompiled: doodad.PROTECTED(false),
					__headers: doodad.PROTECTED(null),
					__verb: doodad.PROTECTED(null),
					__file: doodad.PROTECTED(null),
					__status: doodad.PROTECTED(null),
					__message: doodad.PROTECTED(null),
					__key: doodad.PROTECTED(null),
					__section: doodad.PROTECTED(null),

					onHeaders: doodad.EVENT(false),

					create: doodad.OVERRIDE(function create(/*optional*/options) {
						this._super(options);

						types.getDefault(this.options, 'headersOnly', false);
					}),
					
					getStatus: doodad.PUBLIC(function getStatus() {
						if (this.__headersCompiled && this.__status) {
							return [this.__status, this.__message || ''];
						};
					}),

					getHeaders: doodad.PUBLIC(function getHeaders() {
						if (this.__headersCompiled && this.__headers) {
							return this.__headers;
						};
					}),

					getSection: doodad.PUBLIC(function getHeaders() {
						if (this.__headersCompiled && this.__section) {
							return this.__section;
						};
					}),

					reset: doodad.OVERRIDE(function reset() {
						this._super();

						this.__listening = false;
						this.__remaining = null;
						this.__headersCompiled = false;
						this.__headers = types.nullObject();
						this.__status = null;
						this.__message = null;
					}),

					isListening: doodad.OVERRIDE(function isListening() {
						return this.__listening;
					}),
					
					listen: doodad.OVERRIDE(function listen(/*optional*/options) {
						options = types.nullObject(options);
						if (!this.__listening) {
							this.__listening = true;
							this.onListen(new doodad.Event());
						};
					}),
					
					stopListening: doodad.OVERRIDE(function stopListening() {
						if (this.__listening) {
							this.__listening = false;
							this.onStopListening(new doodad.Event());
						};
					}),

					onWrite: doodad.OVERRIDE(function onWrite(ev) {
						const retval = this._super(ev);
						if (!ev.prevent) {
							ev.preventDefault();

							if (!this.__headersCompiled || !this.options.headersOnly) {
								const data = ev.data;
								if (this.__headersCompiled || (data.raw === io.EOF)) {
									this.push(data, {output: false});
								} else {
									let buf = data.raw;
									let remaining = this.__remaining;
									if (remaining) {
										this.__remaining = remaining = null;
										buf = Buffer.concat([remaining, buf], remaining.length + buf.length);
									};
									let index,
										lastIndex = 0;
									while ((index = buf.indexOf(0x0A, lastIndex)) >= 0) { "\n"
										if (index === lastIndex) {
											this.__headersCompiled = true;
											this.onHeaders(new doodad.Event());
											if (this.options.headersOnly) {
												this.push({raw: io.EOF, valueOf: function() {return this.raw}}, {output: false});
												this.stopListening();
											};
											break;
										};
										const str = buf.slice(lastIndex, index).toString('utf-8');
										const header = tools.split(str, ':', 2);
										const name = tools.trim(header[0] || '');
										const value = tools.trim(header[1] || '');
										if (name === 'X-Cache-Key') {
											this.__key = value;
										} else if (name === 'X-Cache-File') {
											const val = tools.split(value, ' ', 2);
											this.__verb = val[0] || '';
											this.__file = val[1] || '';
										} else if (name === 'X-Cache-Status') {
											const val = tools.split(value, ' ', 2);
											this.__status = parseInt(val[0]) || 200;
											this.__message = val[1] || '';
										} else if (name === 'X-Cache-Section') {
											this.__section = value;
										} else if (name.slice(0, 8) === 'X-Cache-') {
											// Ignored
										} else if (name) {
											this.__headers[name] = value;
										};
										lastIndex = index + 1;
									};
									if ((index >= 0) && (index < buf.length - 1)) {
										remaining = buf.slice(index + 1);
									};
									if (remaining && !this.options.headersOnly) {
										if (this.__headersCompiled) {
											this.push({raw: remaining, valueOf: function() {return this.raw}}, {output: false});
										} else {
											this.__remaining = remaining;
										};
									};
								};
							};
						};
						return retval;
					}),
				}));

				nodejsHttp.REGISTER(doodad.Object.$extend(
									httpMixIns.Handler,
				{
					$TYPE_NAME: 'CacheHandler',
					
					$__cache: doodad.PROTECTED(doodad.TYPE(  new types.Map()  )), // <FUTURE> Global to threads (shared)
					
					$prepare: doodad.OVERRIDE(function $prepare(options) {
						types.getDefault(options, 'depth', Infinity);

						options = this._super(options);
						
						let val;
						
						val = options.cachePath;
						if (!(val instanceof files.Path)) {
							val = files.Path.parse(val);
						};
						root.DD_ASSERT && root.DD_ASSERT((val instanceof files.Path), "Invalid cache path.");
						options.cachePath = val;

						val = options.keyGenerator;
						if (!val) {
							val = function defaultKeyGenerator(request, handler) {
								return request.url.set({domain: null, args: null}).toString();
							};
						};
						root.DD_ASSERT && root.DD_ASSERT(types.isJsFunction(val), "Invalid key generator.");
						options.keyGenerator = val;

						val = moment && options.duration;
						if (val && !moment.isDuration(val)) {
							val = moment.duration(types.toString(val)); // ISO 8601 / ASP.NET style TimeSpans (see Moment doc)
						};
						options.duration = val;

						options.state = {
							cached: doodad.PUBLIC(false),
							generateKey: doodad.PUBLIC(doodad.METHOD(options.keyGenerator)),
						};

						return options;
					}),

					getCached: doodad.PUBLIC(function getCached(request, /*optional*/options) {
						const type = types.getType(this);
						let create = types.get(options, 'create', true);
						let key = types.get(options, 'key');
						const state = request.getHandlerState(this);
						if (types.isNothing(key)) {
							key = state.generateKey(request, this);
						};
						if (types.isNothing(key)) {
							// No cache
							return null;
						};
						let parent = key;
						const section = types.get(options, 'section');
						if (section) {
							parent = this.getCached(request, {key: key});
							key += '|' + section;
						};
						let cached = (section ? null : state.cached);
						let writing = false;
						if (!cached || (cached.key !== key)) {
							if (cached) {
								create = false;
							};
							cached = type.$__cache.get(key);
						};
						if (!cached && create) {
							cached = types.nullObject({
								key: key, // String
								path: null, // Path
								writing: writing, // Bool
								aborted: false, // Bool
								ready: false, // Bool
								section: section, // String
								disabled: false, // Bool
								duration: null, // Moment Duration
								expiration: null, // Date
								parent: parent, // Cached object
								children: {}, // objectof(Cached objects)
								isInvalid: function() {
									return !this.disabled && !this.ready && !this.writing && (request.verb !== 'HEAD');
								},
								isPending: function() {
									return !this.disabled && !this.ready && this.writing;
								},
								isValid: function() {
									return !this.disabled && this.ready && !this.writing;
								},
								validate: function() {
									if (!this.ready && this.writing) {
										this.writing = false;
										this.ready = !this.aborted;
										if (this.aborted && this.path) {
											nodeFs.unlink(this.path.toString(), function(err) {}); // no need to get error feedbacks
											this.path = null;
										};
										this.aborted = false;
									};
								},
								abort: function() {
									if (!this.ready && this.writing && !this.aborted) {
										this.aborted = true;
										this.validate();
									};
								},
								invalidate: function() {
									if (this.ready && !this.writing) {
										this.ready = false;
										this.writing = true;
										this.abort();
									};
									tools.forEach(this.children, function(child) {
										child.invalidate();
									});
								},
							});
							type.$__cache.set(key, cached);
						};
						if (cached.expiration && cached.ready) {
							if (moment.create().isSameOrAfter(cached.expiration)) {
								cached.invalidate();
							};
						};
						if (section) {
							parent.children[section] = cached;
						} else {
							state.cached = cached;
						};
						return cached;
					}),
					
					openFile: doodad.PUBLIC(doodad.ASYNC(function openFile(request, cached) {
						const Promise = types.getPromise();

						if (!cached.ready) {
							throw new types.Error("Cache is not ready.");
						};

						return Promise.create(function(resolve, reject) {
								const fileStream = nodeFs.createReadStream(cached.path.toString());
								let openCb = null,
									errorCb = null;
								fileStream.once('open', openCb = new doodad.Callback(this, function onOpen(fd) {
									fileStream.removeListener('error', errorCb);
									request.onSanitize.attachOnce(this, function sanitize() {
										fileStream.close();
									});
									resolve(fileStream);
								}, reject));
								fileStream.once('error', errorCb = new doodad.Callback(this, function onError(err) {
									fileStream.removeListener('open', openCb);
									reject(err);
								}, reject));
							}, this)
							.catch(function catchOpen(err) {
								cached.path = null;
								cached.invalidate();
								if (cached.section) {
									return null;
								} else if ((err.code === 'ENOENT') || (err.code === 'EPERM')) {
									// Cache file has been deleted or is not accessible, will restart the request and try to generate a new cache file
									return request.redirectServer(request.url); // will throw
								} else {
									throw err;
								};
							}, this)
							.then(function(fileStream) {
								if (fileStream) {
									const cacheStream = new nodejsHttp.CacheStream({autoFlush: false, headersOnly: (request.verb === 'HEAD')});
									request.onSanitize.attachOnce(this, function sanitize(ev) {
										cacheStream.destroy();
									});
									var promise = cacheStream.onHeaders.promise()
										.then(function onHeaders(ev) {
											const status = cacheStream.getStatus();
											const headers = cacheStream.getHeaders();
											if (!cached.section) {
												request.response.clearHeaders();
												headers && request.response.addHeaders(headers);
												status && request.response.setStatus(status[0], status[1]);
											};
											return cacheStream;
										}, null, this);
									cacheStream.listen();
									fileStream.pipe(cacheStream.getInterface(nodejsIOInterfaces.IWritable));
									return promise;
								};
							}, null, this);
					})),

					createFile: doodad.PUBLIC(doodad.ASYNC(function createFile(request, cached, /*optional*/options) {
						const Promise = types.getPromise();
						
						if (cached.disabled) {
							return null;
						};

						if (cached.ready || cached.writing) {
							throw new types.Error("Cache is ready or writing.");
						};

						options = types.nullObject(options);

						const encoding = options.encoding;

						let duration = options.duration || cached.duration || this.options.duration;
						if (duration) {
							if (!moment) {
								throw new types.NotAvailable("Cache durations are not available because 'moment' is not installed.");
							};
							if (!moment.isDuration(duration)) {
								duration = moment.duration(types.toString(duration)); // ISO 8601 / ASP.NET style TimeSpans (see Moment doc)
							};
							cached.duration = duration;
							cached.expiration = moment.create().add(duration);
						};

						function loopOpenFile(count) {
							cached.path = this.options.cachePath.combine(null, {file: tools.generateUUID()});
							return Promise.create(function tryOpen(resolve, reject) {
									const stream = nodeFs.createWriteStream(cached.path.toString(), {autoClose: true, flags: 'wx', mode: this.options.cachedFilesMode || 0o644});
									let errorCb = null,
										openCb = null;
									stream.once('error', errorCb = new doodad.Callback(this, function streamOnError(err) {
										stream.removeListener('open', openCb);
										// Abort writing of cache file, but give the response to the client
										cached.path = null;
										cached.abort();
										reject(err);
									}, reject));
									stream.once('open', openCb = new doodad.Callback(this, function streamOnOpen(fd) {
										stream.removeListener('error', errorCb);
										var ddStream = (encoding ? new nodejsIO.TextOutputStream({nodeStream: stream, encoding: encoding}) : new nodejsIO.BinaryOutputStream({nodeStream: stream}));
										request.onSanitize.attachOnce(this, function sanitize() {
											cached.abort();
											stream.destroy();
											ddStream.destroy();
										});
										resolve(ddStream);
									}, reject));
								}, this)
								.catch(function catchOpen(err) {
									if ((err.code === 'EEXIST') && (count > 1)) {
										return loopOpenFile.call(this, count - 1);
									} else if (err.code === 'EPERM') {
										return null;
									} else {
										throw err;
									};
								}, this);
						};
						
						cached.writing = true;

						return loopOpenFile.call(this, 10)
							.then(function afterOpen(stream) {
								if (stream) {
									request.waitFor(stream.onEOF.promise());
									let headers = '';
									headers += 'X-Cache-Key: ' + cached.key + '\n';
									headers += 'X-Cache-File: ' + request.verb + ' ' + request.url.toString() + '\n';
									if (cached.section) {
										headers += 'X-Cache-Section: ' + cached.section + '\n';
									} else {
										// TODO: Trailers ("X-Cache-Trailer-XXX" ?)
										if (!request.response.headersSent) {
											request.response.sendHeaders();
										};
										const status = request.response.status || 200;
										headers += 'X-Cache-Status: ' + types.toString(status) + ' ' + (request.response.message || nodeHttp.STATUS_CODES[status] || '') + '\n';
										tools.forEach(request.response.getHeaders(), function(value, name) {
											headers += (name + ': ' + value + '\n');
										});
									};
									if (cached.expiration) {
										headers += 'X-Cache-Expiration: ' + http.toRFC1123Date(cached.expiration) + '\n'; // ex.:   Fri, 10 Jul 2015 03:16:55 GMT
									};
									stream.write(headers + '\n', 'utf-8');
									return stream;
								};
							}, null, this)
							.catch(function(err) {
								cached.abort();
								throw err;
							}, this);
					})),

					__onCreateStream: doodad.PROTECTED(function(ev) {
						const request = ev.handlerData[0];
						const cached = this.getCached(request);
						if (cached) {
							const output = ev.data.stream;
							if (cached.isValid()) {
								ev.data.stream = this.openFile(request, cached)
									.then(function sendCache(cacheStream) {
										if (cacheStream) {
											const promise = cacheStream.onEOF.promise();
											cacheStream.pipe(output);
											cacheStream.flush({output: false});
											return promise;
										};
									}, null, this)
									.then(function() {
										return request.end();
									}, null, this);
							} else if (cached.isInvalid()) {
								ev.data.stream = this.createFile(request, cached)
									.then(function(cacheStream) {
										if (cacheStream) {
											request.waitFor(
												cacheStream.onEOF.promise()
													.then(function onEOF(ev) {
														cached.validate();
													}, this)
													.catch(function(err) {
														cacheStream.write(io.EOF);
														cached.abort();
														throw err;
													}, this)
											);
											output.pipe(cacheStream);
										};
										return output;
									});
							};
						};
					}),

					execute: doodad.OVERRIDE(function execute(request) {
						request.response.onCreateStream.attachOnce(this, this.__onCreateStream, null, [request]);
					}),
				}));
				
				
				nodejsHttp.REGISTER(doodad.Object.$extend(
									httpMixIns.Handler,
				{
					$TYPE_NAME: 'CompressionHandler',
					
					$prepare: doodad.OVERRIDE(function $prepare(options) {
						types.getDefault(options, 'depth', Infinity);

						options = this._super(options);

						var val;
						
						val = options.encodings;
						if (types.isNothing(val)) {
							val = ['gzip', 'deflate', 'identity'];
						} else {
							if (!types.isArray(val)) {
								val = [val];
							};
							val = tools.map(val, function(c) {
								return types.toString(c).toLowerCase(); // codings are case-insensitive
							});
						};
						if (tools.indexOf(val, 'identity') < 0) {
							// Server MUST accept 'identity' unless explicitly not acceptable by the client (weight at 0.0)
							val = types.append([], val, ['identity']);
						};
						options.encodings = val;
						

						// TODO: Options per mime types per encoding
						// TODO: Default options
						options.optionsPerEncoding = types.nullObject(options.optionsPerEncoding);

						options.states = types.extend({}, options.states, {
							'Doodad.NodeJs.Server.Http.CacheHandler': {
								generateKey: doodad.OVERRIDE(function(request, handler) {
									let key = this._super(request, handler);
									if (key) {
										const encoding = request.response.getHeader("Content-Encoding") || 'identity';
										key += '|' + encoding;
									};
									return key;
								}),
							},
						});

						return options;
					}),
					
					__onCreateStream: doodad.PROTECTED(function __onCreateStream(ev) {
						const request = ev.handlerData[0];

						const encoding = request.response.getHeader('Content-Encoding');
						const optionsPerEncoding = this.options.optionsPerEncoding;

						let stream = null;
						switch (encoding) {
							case 'gzip':
								stream = nodeZlib.createGzip(optionsPerEncoding.gzip);
								break;
							case 'deflate':
								stream = nodeZlib.createDeflate(optionsPerEncoding.deflate);
								break;
							default:
								// Unknown compression method
						};
						
						if (stream) {
							const type = request.response.getHeader('Content-Type');
							if (!type || request.getAcceptables(type, {handler: this}).length) {
								request.response.addPipe(stream, {unshift: true});

								request.response.onSendHeaders.attachOnce(this, function(ev) {
									request.response.clearHeaders('Content-Length');
								});
							} else {
								request.response.clearHeaders('Content-Encoding');
							};
						};
					}),

					execute: doodad.OVERRIDE(function(request) {
						// TODO: Options per mime types per encoding
						
						let encoding = request.response.getHeader('Content-Encoding');
						if (!encoding) {
							const encodings = this.options.encodings;
							const accept = http.parseAcceptEncodingHeader(request.getHeader('Accept-Encoding') || 'identity');
						
							const acceptable = tools.filter(accept, function(encoding) {
								return (tools.indexOf(encodings, encoding.name) >= 0);
							});
							
							if (!acceptable.length) {
								return request.response.respondWithStatus(types.HttpStatus.UnsupportedMediaType);
							};
						
							let ok = false;
						
							encoding = acceptable[0].name; // case-insensitive (should be already in lower-case)
							switch (encoding) {
								case 'gzip':
								case 'deflate':
									ok = true;
									break;
								case 'identity':							
									// No compression
									break;
								default:
									// Unknown compression method
									return request.response.respondWithStatus(types.HttpStatus.UnsupportedMediaType);
							};
						
							if (ok) {
								// NOTE: Server MUST NOT include 'identity' in the 'Content-Encoding' header
								request.response.addHeaders({
									'Content-Encoding': encoding,
								});

								request.response.onCreateStream.attachOnce(this, this.__onCreateStream, null, [request]);
							};
						};
					}),
				}));


			},
		};
		return DD_MODULES;
	},
};
//! END_MODULE()