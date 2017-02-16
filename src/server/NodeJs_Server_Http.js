//! BEGIN_MODULE()

//! REPLACE_BY("// Copyright 2015-2017 Claude Petit, licensed under Apache License version 2.0\n", true)
// doodad-js - Object-oriented programming framework
// File: NodeJs_Server_Http.js - HTTP Server tools for NodeJs
// Project home: https://github.com/doodadjs/
// Author: Claude Petit, Quebec city
// Contact: doodadjs [at] gmail.com
// Note: I'm still in alpha-beta stage, so expect to find some bugs or incomplete parts !
// License: Apache V2
//
//	Copyright 2015-2017 Claude Petit
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


				let nodeIConv = null;
				try {
					nodeIConv = require('iconv-lite');
				} catch(ex) {
				};
				
				const __Internal__ = {
				};
				
				types.complete(_shared.Natives, {
					windowJSON: global.JSON,
					
					globalBuffer: global.Buffer,

					globalProcess: global.process,
				});

				// TODO: 
				// 1) (todo) Setup page: IPs, Ports, Base URLs, Fall-back Pages (html status), Max number of processes, Storage Manager location
				// 3) (working on) Static files : Base URL (done), file(done)/folder(done), alias (done), Verbs (done), in/out process option (todo), mime type (auto or custom) (done), charset (done), metadata (if text/html) (todo)
				// 4) (todo) Dynamic files : Base URL (done), Page class (done), Verbs (done), in/out process option, mime type ('text/html' or custom) (done), charset (done), metadata (if text/html) (todo)
				// 5) (todo) Session and Shared Data Storage: Storage Manager Server, Storage Type Class (Pipes (Streams), RAM, Files, DB, ...), Data passed with JSON
				// 6) (todo) User/Password/Permissions


				nodejsHttp.REGISTER(doodad.EXPANDABLE(http.Response.$extend(
										mixIns.NodeEvents,
				{
					$TYPE_NAME: 'Response',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('NodeJsResponse')), true) */,

					nodeJsStream: doodad.PROTECTED(null),

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
						this.nodeJsStreamOnError.clear();
						this.nodeJsStreamOnClose.clear();

						types.DESTROY(this.stream);

						this._super();
					}),
					
					end: doodad.PUBLIC(doodad.ASYNC(function end(forceDisconnect) {
						const Promise = types.getPromise();

						if (this.ended) {
							throw new server.EndOfRequest();
						};

						return Promise.try(function() {
								if (!forceDisconnect) {
									if ((this.status || types.HttpStatus.OK) !== types.HttpStatus.OK) {
										const ev = new doodad.Event({promise: Promise.resolve()});
										this.onStatus(ev);
										if (ev.prevent) {
											return ev.data.promise;
										};
									};
								};
							}, this)
							.finally(function() {
								if (!forceDisconnect) {
									const stream = this.stream;
									if (stream && !stream.isDestroyed()) {
										return stream.flushAsync();
									};
								};
							}, this)
							.finally(function() {
								let promise;
								const stream = this.stream,
									destroyed = stream && stream.isDestroyed();
								if (forceDisconnect || destroyed || this.nodeJsStream.finished) {
									types.DESTROY(this.nodeJsStream);
								} else {
									if (!this.trailersSent) {
										this.sendTrailers();
									};
									promise = Promise.create(function(resolve, reject) {
											this.nodeJsStream.once('close', resolve);
											this.nodeJsStream.once('finish', resolve);
											this.nodeJsStream.once('error', reject);
										}, this);
									if (stream) {
										// EOF
										stream.write(io.EOF);
										stream.flush()
									} else {
										// EOF
										this.nodeJsStream.end();
									};
								};
								_shared.setAttribute(this, 'ended', true);
								return promise;
							}, this)
							.then(function() {
								if (!this.request.ended) {
									return this.request.end(forceDisconnect);
								};
							}, null, this)
							.then(function() {
								throw new server.EndOfRequest();
							});
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
						if (!this.ended && !this.headersSent) {
							this.sendHeaders();
						};
					}),
					
					__streamOnError: doodad.PROTECTED(function __streamOnError(ev) {
						this.onError(ev);
						if (!this.ended) {
							this.request.end(true);
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

						let ev = null;

						if (this.stream) {
							ev = new doodad.Event({
								stream: this.stream,
								options: options,
							});
							this.onGetStream(ev);

							if (ev.prevent) {
								this.stream = null;
							} else {
								this.stream = ev.data.stream;
								return ev.data.stream;
							};
						};

						if (options.contentType) {
							this.setContentType(options.contentType, {encoding: options.encoding});
						} else if (options.encoding) {
							this.setContentType(this.contentType || 'text/plain', {encoding: options.encoding, force: true});
						};
						
						if (!this.contentType) {
							throw new types.Error("'Content-Type' has not been set.");
						};

						if (!ev) {
							const responseStream = new nodejsIO.BinaryOutputStream({nodeStream: this.nodeJsStream});
							responseStream.onWrite.attachOnce(this, this.__streamOnWrite, 10);
							responseStream.onError.attachOnce(this, this.__streamOnError, 10);

							ev = new doodad.Event({
								stream: responseStream,
								options: options,
							});
							this.onGetStream(ev);
						};
						
						return Promise.resolve(ev.data.stream)
							.then(function(responseStream) {
								if (types.isNothing(responseStream)) {
									throw new http.StreamAborted();
								};

								root.DD_ASSERT && root.DD_ASSERT(types._implements(responseStream, io.Stream), "Invalid response stream.");

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
								this.__pipes = [];

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
								this.request.setFullfilled(true);

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

						if (!this.headersSent) {
							this.clearHeaders();
						};

						if (!this.trailersSent) {
							this.clearTrailers();
						};

						if (this.stream) {
							this.stream.clear();
						};
					}),
					
					respondWithStatus: doodad.OVERRIDE(function respondWithStatus(status, /*optional*/message, /*optional*/headers, /*optional*/data) {
						const Promise = types.getPromise();

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

						this.request.setFullfilled(true);

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

							this.request.setFullfilled(true);

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

						if (this.ended) {
							throw new server.EndOfRequest();
						};

						if (!(path instanceof files.Path)) {
							path = files.Path.parse(path);
						};

						return Promise.create(function tryStat(resolve, reject) {
								nodeFs.stat(path.toString(), doodad.Callback(this, function getStatsCallback(err, stats) {
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
				})));

				nodejsHttp.REGISTER(doodad.EXPANDABLE(http.Request.$extend(
										mixIns.NodeEvents,
				{
					$TYPE_NAME: 'Request',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('NodeJsRequest')), true) */,
					
					nodeJsStream: doodad.PROTECTED(null),

					startTime: doodad.PROTECTED(null),

					$__time: doodad.PROTECTED(doodad.TYPE(null)),
					$__totalSecond: doodad.PROTECTED(doodad.TYPE(0)),
					$__totalMinute: doodad.PROTECTED(doodad.TYPE(0)),
					$__totalHour: doodad.PROTECTED(doodad.TYPE(0)),
					$__perSecond: doodad.PROTECTED(doodad.TYPE(0.0)),
					$__perMinute: doodad.PROTECTED(doodad.TYPE(0.0)),
					$__perHour: doodad.PROTECTED(doodad.TYPE(0.0)),

					$getStats: doodad.OVERRIDE(function $getStats() {
						const stats = this._super();
						return types.extend(stats, {
							totalSecond: this.$__totalSecond,
							totalMinute: this.$__totalMinute,
							totalHour: this.$__totalHour,
							perSecond: this.$__perSecond,
							perMinute: this.$__perMinute,
							perHour: this.$__perHour,
						});
					}),
					
					$clearStats: doodad.OVERRIDE(function $clearStats() {
						this._super();
					
						this.$__time = _shared.Natives.globalProcess.hrtime();
						this.$__totalSecond = 0;
						this.$__totalMinute = 0;
						this.$__totalHour = 0;
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
						this.startTime = _shared.Natives.globalProcess.hrtime();

						this.nodeJsStream = nodeJsRequest;
						this.nodeJsStreamOnError.attach(nodeJsRequest);
						this.nodeJsStreamOnClose.attachOnce(nodeJsRequest);
						
						this._super(server, nodeJsRequest.method, nodeJsRequest.url, nodeJsRequest.headers, [nodeJsResponse]);
						
						const type = types.getType(this);
						
						const time = _shared.Natives.globalProcess.hrtime(type.$__time);
						let diff = time[0] + (time[1] / 1e9); // seconds
						if (diff <= 1.0) {
							type.$__totalSecond++;
							type.$__perSecond = type.$__totalSecond * diff;
						} else {
							type.$__totalSecond = 0;
							type.$__perSecond = 0.0;
						};
						diff /= 60.0;
						if (diff <= 1.0) {
							type.$__totalMinute++;
							type.$__perMinute = type.$__totalMinute * diff;
						} else {
							type.$__totalMinute = 0;
							type.$__perMinute = 0.0;
						};
						diff /= 60.0;
						if (diff <= 1.0) {
							type.$__totalHour++;
							type.$__perHour = type.$__totalHour * diff;
						} else {
							type.$__totalHour = 0;
							type.$__perHour = 0.0;
						};
						type.$__time = _shared.Natives.globalProcess.hrtime();
					}),
					
					destroy: doodad.OVERRIDE(function destroy() {
						this.nodeJsStreamOnError.clear();
						this.nodeJsStreamOnClose.clear();

						types.DESTROY(this.stream);

						this._super();
					}),
					
					createResponse: doodad.OVERRIDE(function createResponse(nodeJsRequest) {
						return new nodejsHttp.Response(this, nodeJsRequest);
					}),

					end: doodad.OVERRIDE(function end(/*optional*/forceDisconnect) {
						// NOTE: MUST ALWAYS THROWS AN ERROR
						
						const Promise = types.getPromise();

						if (this.ended) {
							throw new server.EndOfRequest();
						};

						function wait() {
							if (!forceDisconnect) {
								const queue = this.__waitQueue;
								if (queue.length) {
									this.__waitQueue = [];
									return Promise.all(queue)
										.then(wait, null, this);
								};
							};
						};
						
						return Promise.try(function tryEndRequest() {
								_shared.setAttribute(this, 'ended', true); // blocks additional operations...
								this.__ending = true; // ...but some operations are still allowed

								if (!this.response.ended) {
									return this.response.end(forceDisconnect)
										.catch(server.EndOfRequest, function() {});
								};
							}, this)
							.then(function() {
								this.__ending = false; // now blocks any operation

								if (forceDisconnect) {
									types.DESTROY(this.nodeJsStream);
								};
							}, null, this)
							.then(wait, null, this)
							.catch(this.catchError, this)
							.nodeify(function(err) {
								const type = types.getType(this);
								type.$__actives--;
								if (forceDisconnect || this.response.isDestroyed()) {
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

								this.onEnd();

								if (err) {
									throw err;
								};

								throw new server.EndOfRequest();
							}, this);
					}),

					__streamOnError: doodad.PROTECTED(function __streamOnError(ev) {
						this.onError(ev);
						if (!this.ended) {
							this.end(true);
						};
					}),
					
					getStream: doodad.OVERRIDE(function getStream(/*optional*/options) {
						const Promise = types.getPromise();

						if (this.ended && !this.__ending) {
							throw new server.EndOfRequest();
						};							

						options = types.nullObject(this.__streamOptions, options);

						let ev = null;

						if (this.stream) {
							ev = new doodad.Event({
								stream: this.stream,
								options: options,
							});
							this.onGetStream(ev);
		
							if (ev.prevent) {
								this.stream = null;
							} else {
								this.stream = ev.data.stream;
								return ev.data.stream;
							};
						};

						const acceptContentEncodings = this.__contentEncodings || ['identity'];
						const contentEncoding = (this.getHeader('Content-Encoding') || 'identity').toLowerCase(); // case-insensitive
						if (acceptContentEncodings.indexOf(contentEncoding) < 0) { 
							return this.response.respondWithStatus(types.HttpStatus.UnsupportedMediaType);
						};

						if (!ev) {
							const requestStream = new nodejsIO.BinaryInputStream({nodeStream: this.nodeJsStream});

							ev = new doodad.Event({
								stream: requestStream,
								options: options,
							});
							this.onGetStream(ev);
						};
						
						return Promise.resolve(ev.data.stream)
							.then(function(requestStream) {
								if (types.isNothing(requestStream)) {
									throw new http.StreamAborted();
								};

								root.DD_ASSERT && root.DD_ASSERT(types._implements(requestStream, io.Stream), "Invalid request stream.");
								requestStream.onError.attachOnce(this, this.__streamOnError, 10);

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
								this.__pipes = [];
							
								let accept = options.accept;  // content-types expected by the page
								if (types.isString(accept)) {
									accept = [http.parseAcceptHeader(accept)];
								};
								if (!accept || !accept.length) {
									return this.response.respondWithStatus(types.HttpStatus.UnsupportedMediaType);
								};
							
								const requestType = this.contentType;
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
								this.setFullfilled(true);

								return requestStream;
							}, null, this);
					}),
					
					getTime: doodad.PUBLIC(function getTime() {
						if (this.ended && !this.__ending) {
							throw new server.EndOfRequest();
						};							
						const time = _shared.Natives.globalProcess.hrtime(this.startTime);
						return (time[0] * 1000) + (time[1] / 1e6);
					}),
					
					getSource: doodad.PUBLIC(function getSource() {
						// TODO: Add more informations
						if (this.ended && !this.__ending) {
							throw new server.EndOfRequest();
						};							
						return types.nullObject({
							address: this.nodeJsStream.socket.remoteAddress,
						});
					}),
				})));
				
				nodejsHttp.REGISTER(http.Server.$extend(
								mixIns.NodeEvents,
				{
					$TYPE_NAME: 'Server',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('NodeJsServer')), true) */,

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

							try {
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
													request.response.clear();
													return request.response.respondWithStatus(types.HttpStatus.NotFound);
												};
											};
										})
										.catch(request.catchError)
										.nodeify(function(err, result) {
											types.DESTROY(request);
											types.DESTROY(nodeRequest);
											types.DESTROY(nodeResponse);
											if (err) {
												throw err;
											};
										})
										.catch(tools.catchAndExit); // fatal error
								};
							} catch(ex) {
								// <PRB> On error, we must return something to the browser or otherwise it will repeat the request if we just drop the connection !!!
								nodeResponse.statusCode = types.HttpStatus.InternalError;
								nodeResponse.end(function() {
									types.DESTROY(nodeRequest);
									types.DESTROY(nodeResponse);
								});
								throw ex;
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
									opts.pfx = nodeFs.readFileSync(types.toString(options.pfxFile));
								} else if (options.rawPfx) {
									opts.pfx = options.rawPfx;
								} else {
									if (options.keyFile) {
										opts.key = nodeFs.readFileSync(types.toString(options.keyFile));
									} else if (options.rawKey) {
										opts.key = options.rawKey;
									} else {
										throw new types.Error("Missing private key file.");
									};
									if (options.certFile) {
										opts.cert = nodeFs.readFileSync(types.toString(options.certFile));
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
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('FolderPageTemplate')), true) */,

					path: doodad.PROTECTED(null),
					
					$readDir: doodad.PUBLIC(doodad.ASYNC(function $readDir(handler, path) {
						return files.readdir(path, {async: true})
							.then(function sortFiles(filesList) {
								filesList = filesList
									.filter(function(file) {
										if (file.isFolder) {
											return true;
										};
										if (!handler.options.mimeTypes) {
											return true;
										};
										var types = mime.getTypes(file.name);
										return tools.some(handler.options.mimeTypes, function(mimeType) {
											return (tools.findItem(types, function(type) {
													return type === mimeType.name;
												}) !== null);
										});
									})
									.sort(function(file1, file2) {
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
					})),

					create: doodad.OVERRIDE(function create(request, cacheHandler, path) {
						this._super(request, cacheHandler);

						this.path = path;

						var cached = cacheHandler.getCached(request);
						files.watch(this.path.toString(), function() {
							cached.invalidate();
						});
					}),

					readDir: doodad.PUBLIC(doodad.ASYNC(function readDir() {
						return types.getType(this).$readDir(this.request.currentHandler, this.path);
					})),
				})));
				
				nodejsHttp.REGISTER(http.StaticPage.$extend(
				{
					$TYPE_NAME: 'StaticPage',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('StaticPage')), true) */,

					$prepare: doodad.OVERRIDE(function $prepare(options, /*optional*/parentOptions) {
						types.getDefault(options, 'depth', Infinity);

						options = this._super(options, parentOptions);
						
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
										if (res) {
											//key += '|' + res;
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

					getSystemPath: doodad.OVERRIDE(function getSystemPath(request, targetUrl) {
						let path;
						if (!request.url.file && targetUrl.args.has('res')) {
							path = this.options.folderTemplate.set({file: null}).combine('./public/' + targetUrl.args.get('res', true), {isRelative: true, os: 'linux'});
						} else {
							path = this.options.path.combine(targetUrl, {isRelative: true});
						};
						return path;
					}),
					
					addHeaders: doodad.PROTECTED(doodad.ASYNC(function addHeaders(request) {
						const Promise = types.getPromise();
						const state = request.getHandlerState(this);
						const path = this.getSystemPath(request, state.matcherResult.urlRemaining);
						return Promise.create(function tryStat(resolve, reject) {
								const pathStr = path.toApiString();
								nodeFs.stat(pathStr, doodad.Callback(this, function getStatsCallback(err, stats) {
									if (err) {
										if (err.code === 'ENOENT') {
											resolve(null);
										} else {
											reject(err);
										};
									} else {
										if (path.file && !stats.isFile()) {
											stats.path = path.pushFile().toApiString();
										} else {
											stats.path = pathStr;
										};
										resolve(stats);
									};
								}))
							}, this)
							.then(function toCanonical(stats) {
								if (stats) {
									if (this.options.caseSensitive && this.options.forceCaseSensitive) {
										// Windows/MacOS X : File systems are case-insensitive by default. 
										//					If "forceCaseSensitive" is true, we scan the file system for the right name and require that exact name. 
										//					But please note that it causes an overhead and enabling the case-sensitive option on the file system,
										//					when possible, is a better choice.
										return files.getCanonical(path, {async: true})
											.then(function(canonicalPath) {
												stats.realPath = canonicalPath.toApiString();
												return stats;
											});
									} else {
										stats.realPath = stats.path;
									};
								};
								return stats;
							}, null, this)
							.then(function parseStats(stats) {
								if (!stats) {
									return null;
								};
								
								if (stats.path !== stats.realPath) {
									return null;
								};

								let contentTypes,
									force = false;
								if (stats.isFile()) {
									contentTypes = mime.getTypes(path.file);
								} else {
									contentTypes = ['text/html; charset=utf-8', 'application/json; charset=utf-8'];
									force = true;
								};
								
								let contentType;
								if (request.url.args.has('res')) {
									contentType = contentTypes[0];
									force = true;
								} else {
									contentType = request.getAcceptables(contentTypes, {force: force})[0];
								};
								if (!contentType) {
									return request.response.respondWithStatus(types.HttpStatus.NotAcceptable);
								};

								request.response.addHeaders({
									'Last-Modified': http.toRFC1123Date(stats.mtime), // ex.:   Fri, 10 Jul 2015 03:16:55 GMT
								});
								
								if (stats.isFile()) {
									request.response.addHeaders({
										'Content-Length': stats.size,
										'Content-Disposition': 'filename="' + path.file.replace(/\"/g, '\\"') + '"',
									});
								} else {
									request.response.setVary('Accept');
								};

								request.response.setContentType(contentType, {force: force});

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
							return request.response.getStream(root.getOptions().debug ? {watch: data.path} : null)
								.then(function(outputStream) {
									const iwritable = outputStream.getInterface(nodejsIOInterfaces.IWritable);
									return Promise.create(function(resolve, reject) {
										const inputStream = nodeFs.createReadStream(data.path.toString());
										request.onSanitize.attachOnce(null, function() {
											types.DESTROY(inputStream);
										});
										request.onEnd.attachOnce(null, function() {
											reject(new server.EndOfRequest);
										});
										inputStream
											.once('error', reject)
											.pipe(iwritable, {end: true});
										outputStream.onError.attachOnce(null, function(err) {
											reject(err.error)
										});
										outputStream.onEOF.attachOnce(null, resolve)
									}, this);
								}, null, this)
								.then(function() {
									return request.end();
								});
						};
					})),
					
					sendFolder: doodad.PROTECTED(doodad.ASYNC(function sendFolder(request, data) {
						const Promise = types.getPromise();
						request.data.isFolder = true;
						if (request.url.file) {
							return request.redirectClient(request.url.pushFile());
						};
						// Get negociated mime types between the handler and the client
						function sendHtml(filesList) {
							return templatesHtml.getTemplate(this.options.folderTemplate)
								.then(function renderTemplate(templType) {
									const templ = new templType(request, request.getHandlers(nodejsHttp.CacheHandler).slice(-1)[0], data.path);
									return request.response.getStream({encoding: templType.$ddt.options.encoding})
										.then(function(stream) {
											templ.setStream(stream);
											return templ.render();
										}, null, this)
										.nodeify(function cleanup(err, result) {
											types.DESTROY(templ);
											if (err) {
												throw err;
											} else {
												return result;
											};
										});
								}, null, this);
						};
						function sendJson() {
							// TODO: Create helper functions in the request object, with an option to use a specific format handler
							// TODO: JSON Stream (instead of global.JSON)
							return nodejsHttp.FolderPageTemplate.$readDir(this, data.path)
								.then(function stringifyDir(filesList) {
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
								}, null, this);
						};
						function send(filesList) {
							if (data.contentType.name === 'text/html') {
								return sendHtml.call(this, filesList);
							} else {
								return sendJson.call(this, filesList);
							};
						};
						
						return send.call(this)
							.then(function() {
								return request.end();
							}, null, this);
					})),
					
					execute_HEAD: doodad.OVERRIDE(function execute_HEAD(request) {
						return this.addHeaders(request)
							.then(function(data) {
								if (!data) {
									request.setFullfilled(false);
								};
							});
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
								} else {
									request.setFullfilled(false);
								};
							}, this);
					}),
					
				}));

				nodejsHttp.REGISTER(nodejsHttp.StaticPage.$extend(
				{
					$TYPE_NAME: 'JavascriptPage',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('JavascriptPage')), true) */,
					
					$prepare: doodad.OVERRIDE(function $prepare(options, /*optional*/parentOptions) {
						options = this._super(options, parentOptions);
						
						let val;
						
						options.variables = options.variables || {};

						return options;
					}),

					sendFile: doodad.OVERRIDE(function sendFile(request, data) {
						const jsStream = new minifiers.Javascript();

						request.onSanitize.attachOnce(this, function sanitize() {
							types.DESTROY(jsStream); // stops the stream in case of abort
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
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('CacheStream')), true) */,

					__listening: doodad.PROTECTED(false),
					__remaining: doodad.PROTECTED(null),
					__headersCompiled: doodad.PROTECTED(false),
					__headers: doodad.PROTECTED(null),
					//__verb: doodad.PROTECTED(null),
					//__file: doodad.PROTECTED(null),
					__status: doodad.PROTECTED(null),
					__message: doodad.PROTECTED(null),
					//__key: doodad.PROTECTED(null),
					//__section: doodad.PROTECTED(null),
					__encoding: doodad.PROTECTED(null),

					create: doodad.OVERRIDE(function create(/*optional*/options) {
						this._super(options);

						types.getDefault(this.options, 'headersOnly', false);
					}),
					
					reset: doodad.OVERRIDE(function reset() {
						this._super();

						this.__listening = false;
						this.__remaining = null;
						this.__headersCompiled = false;
						this.__headers = types.nullObject();
						//this.__verb = null;
						//this.__file = null;
						this.__status = null;
						this.__message = null;
						//this.__key = null;
						//this.__section = null;
						this.__encoding = null;
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

						const data = ev.data;

						ev.preventDefault();

						const eof = (data.raw === io.EOF);
						let buf = !eof && data.raw;

						let remaining = this.__remaining;
						this.__remaining = null;
						if (remaining) {
							if (buf) {
								buf = _shared.Natives.globalBuffer.concat([remaining, buf], remaining.length + buf.length);
							} else {
								buf = remaining;
							};
						};

						if (this.__headersCompiled || eof) {
							if (buf) {
								this.push({raw: buf, valueOf: function() {return this.raw}});
							};
							if (eof) {
								this.push({raw: io.EOF, valueOf: function() {return this.raw}});
							};
						} else {
							let index,
								lastIndex = 0;
							while ((index = buf.indexOf(0x0A, lastIndex)) >= 0) { // "\n"
								if (index === lastIndex) {
									this.__headersCompiled = true;
									this.push({raw: io.BOF, headers: this.__headers, status: {code: this.__status, message: this.__message}, encoding: this.__encoding, valueOf: function() {return this.raw}});
									break;
								};
								const str = buf.slice(lastIndex, index).toString('utf-8');
								const header = tools.split(str, ':', 2);
								const name = tools.trim(header[0] || '');
								const value = tools.trim(header[1] || '');
								if (name === 'X-Cache-Key') {
									//this.__key = value;
								} else if (name === 'X-Cache-File') {
									//const val = tools.split(value, ' ', 2);
									//this.__verb = val[0] || '';
									//this.__file = val[1] || '';
								} else if (name === 'X-Cache-Status') {
									const val = tools.split(value, ' ', 2);
									this.__status = parseInt(val[0]) || 200;
									this.__message = val[1] || '';
								} else if (name === 'X-Cache-Section') {
									//this.__section = value;
								} else if (name === 'X-Cache-Encoding') {
									this.__encoding = value;
								} else if (name.slice(0, 8) === 'X-Cache-') {
									// Ignored
								} else if (name) {
									this.__headers[name] = value;
								};
								lastIndex = index + 1;
							};
							if (this.__headersCompiled && this.options.headersOnly) {
								this.push({raw: io.EOF, valueOf: function() {return this.raw}});
								this.stopListening();
							} else {
								let remaining = null;
								if ((index >= 0) && (index < buf.length - 1)) {
									remaining = buf.slice(index + 1);
								};
								if (remaining) {
									if (this.__headersCompiled) {
										this.push({raw: remaining, valueOf: function() {return this.raw}});
									} else {
										this.__remaining = remaining;
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
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('CacheHandler')), true) */,
					
					$__cache: doodad.PROTECTED(doodad.TYPE(  new types.Map()  )), // <FUTURE> Global to threads (shared)
					
					$prepare: doodad.OVERRIDE(function $prepare(options, /*optional*/parentOptions) {
						types.getDefault(options, 'depth', Infinity);

						options = this._super(options, parentOptions);
						
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
								return request.url.set({domain: null, args: null}).toString() + 
									'|' + (request.response.getHeader('Content-Type') || '*/*');
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
							if (!parent) {
								// No parent (should not happen)
								return null;
							};
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
						if (cached) {
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
								fileStream.once('open', openCb = doodad.Callback(this, function onOpen(fd) {
									fileStream.removeListener('error', errorCb);
									request.onSanitize.attachOnce(this, function sanitize() {
										fileStream.close();
									});
									resolve(fileStream);
								}, reject));
								fileStream.once('error', errorCb = doodad.Callback(this, function onError(err) {
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
									const cacheStream = new nodejsHttp.CacheStream({headersOnly: (request.verb === 'HEAD')});
									request.onSanitize.attachOnce(this, function sanitize(ev) {
										types.DESTROY(cacheStream);
									});
									var promise = cacheStream.onReady.promise(function(ev) {
										if (ev.data.raw === io.BOF) {
											ev.preventDefault();
											if (!cached.section) {
												request.response.clearHeaders();
												request.response.addHeaders(ev.data.headers);
												//ev.data.status.code && request.response.setStatus(ev.data.status.code, ev.data.status.message);
											};
											if (ev.data.encoding) {
												const decoder = new io.TextDecoderStream();
												return cacheStream.pipe(decoder);
											};
											return cacheStream;
										} else {
											// Cancels resolve and waits next event
											return false;
										};
									}, this);
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
									stream.once('error', errorCb = doodad.Callback(this, function streamOnError(err) {
										stream.removeListener('open', openCb);
										// Abort writing of cache file, but give the response to the client
										cached.path = null;
										cached.abort();
										reject(err);
									}, reject));
									stream.once('open', openCb = doodad.Callback(this, function streamOnOpen(fd) {
										stream.removeListener('error', errorCb);
										var ddStream = (encoding ? new nodejsIO.TextOutputStream({nodeStream: stream, encoding: encoding}) : new nodejsIO.BinaryOutputStream({nodeStream: stream}));
										request.onSanitize.attachOnce(null, function sanitize() {
											//stream.close();
											types.DESTROY(stream);
											types.DESTROY(ddStream);
											cached.abort();
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
									if (encoding) {
										headers += 'X-Cache-Encoding: ' + encoding + '\n'; // ex.: 'utf-8'
									};
									stream.write(headers + '\n', {encoding: 'utf-8'}); // NOTE: Encodes headers like Node.js (utf-8) even if it should be 'ascii'.
									return stream;
								};
							}, null, this)
							.catch(function(err) {
								cached.abort();
								throw err;
							}, this);
					})),

					__onGetStream: doodad.PROTECTED(function(ev) {
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
											cacheStream.flush();
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
												cacheStream.onEOF.promise(function onEOF() {
														cached.validate();
														if (ev.data.options.watch) {
															files.watch(ev.data.options.watch, function() {
																cached.invalidate();
															}, {once: true});
														};
													}, this)
													.catch(function(err) {
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
						request.response.onGetStream.attachOnce(this, this.__onGetStream, null, [request]);
					}),
				}));
				
				
				// Request input
				nodejsHttp.REGISTER(doodad.Object.$extend(
									httpMixIns.Handler,
				{
					$TYPE_NAME: 'CompressionBodyHandler',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('CompressionBodyHandler')), true) */,
					
					$prepare: doodad.OVERRIDE(function $prepare(options, /*optional*/parentOptions) {
						types.getDefault(options, 'depth', Infinity);

						options = this._super(options, parentOptions);

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
							val = types.append([], val, ['identity']);
						};
						options.encodings = val;
						
						// TODO: Options per mime types per encoding
						// TODO: Default options
						options.optionsPerEncoding = types.nullObject(options.optionsPerEncoding);

						return options;
					}),
					
					__onGetStream: doodad.PROTECTED(function __onGetStream(ev) {
						const request = ev.handlerData[0];
						const encoding = (request.getHeader('Content-Encoding') || 'identity').toLowerCase(); // case insensitive

						if (tools.indexOf(this.options.encodings, encoding) < 0) {
							////////return request.response.respondWithStatus(types.HttpStatus.UnsupportedMediaType);
							ev.data.stream = request.response.respondWithStatus(types.HttpStatus.UnsupportedMediaType);
							return;
						};

						const optionsPerEncoding = this.options.optionsPerEncoding;

						let stream = null;
						switch (encoding) {
							case 'identity':
								break;
							case 'gzip':
								stream = nodeZlib.createGunzip(optionsPerEncoding.gzip);
								break;
							case 'deflate':
								stream = nodeZlib.createInflate(optionsPerEncoding.deflate);
								break;
							default:
								///////return request.response.respondWithStatus(types.HttpStatus.UnsupportedMediaType);
								ev.data.stream = request.response.respondWithStatus(types.HttpStatus.UnsupportedMediaType);
								return;
						};

						if (stream) {
							request.addPipe(stream);
						};
					}),

					execute: doodad.OVERRIDE(function(request) {
						request.acceptContentEncodings(this.options.encodings);

						request.onGetStream.attach(this, this.__onGetStream, null, [request]);
					}),
				}));


				// Response output
				nodejsHttp.REGISTER(doodad.Object.$extend(
									httpMixIns.Handler,
				{
					$TYPE_NAME: 'CompressionHandler',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('CompressionHandler')), true) */,
					
					$prepare: doodad.OVERRIDE(function $prepare(options, /*optional*/parentOptions) {
						types.getDefault(options, 'depth', Infinity);

						options = this._super(options, parentOptions);

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

						options.state = {
							contentEncoding: doodad.PUBLIC(null),
						};

						var type = this;
						options.states = types.extend({}, options.states, {
							'Doodad.NodeJs.Server.Http.CacheHandler': {
								generateKey: doodad.OVERRIDE(function(request, handler) {
									let key = this._super(request, handler);
									if (key) {
										const handlers = request.getHandlers(type);
										const compressionHandler = handlers.slice(-1)[0];
										if (compressionHandler) {
											const encoding = request.getHandlerState(compressionHandler).contentEncoding || 'identity';
											key += '|' + encoding;
										};
									};
									return key;
								}),
							},
						});

						return options;
					}),
					
					__onGetStream: doodad.PROTECTED(function __onGetStream(ev) {
						const request = ev.handlerData[0];

						const encoding = request.getHandlerState(this).contentEncoding;
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
						
						request.response.setVary('Accept-Encoding');

						if (stream) {
							const type = request.response.getHeader('Content-Type');
							if (!type || request.getAcceptables(type, {handler: this}).length) {
								// NOTE: Server MUST NOT include 'identity' in the 'Content-Encoding' header
								request.response.addHeaders({
									'Content-Encoding': encoding,
								});

								request.response.addPipe(stream, {unshift: true});

								request.response.onSendHeaders.attachOnce(this, function(ev) {
									request.response.clearHeaders('Content-Length');
								});
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
								request.getHandlerState(this).contentEncoding = encoding;

								request.response.onGetStream.attachOnce(this, this.__onGetStream, null, [request]);
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