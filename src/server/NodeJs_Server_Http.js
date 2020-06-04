//! BEGIN_MODULE()

//! REPLACE_BY("// Copyright 2015-2018 Claude Petit, licensed under Apache License version 2.0\n", true)
	// doodad-js - Object-oriented programming framework
	// File: NodeJs_Server_Http.js - HTTP Server tools for NodeJs
	// Project home: https://github.com/doodadjs/
	// Author: Claude Petit, Quebec city
	// Contact: doodadjs [at] gmail.com
	// Note: I'm still in alpha-beta stage, so expect to find some bugs or incomplete parts !
	// License: Apache V2
	//
	//	Copyright 2015-2018 Claude Petit
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


//! IF_SET("mjs")
	//! INJECT("import {default as nodeFs} from 'fs';")
	//! INJECT("import {default as nodeZlib} from 'zlib';")
	//! INJECT("import {default as nodeHttp} from 'http';")
	//! INJECT("import {default as nodeHttps} from 'https';")
	//! INJECT("import {default as nodeCrypto} from 'crypto';")
	//! INJECT("import {default as nodeCluster} from 'cluster';")
//! ELSE()
	"use strict";

	const nodeFs = require('fs'),
		nodeZlib = require('zlib'),
		nodeHttp = require('http'),
		nodeHttps = require('https'),
		nodeCrypto = require('crypto'),
		nodeCluster = require('cluster');
//! END_IF()


exports.add = function add(modules) {
	modules = (modules || {});
	modules['Doodad.NodeJs.Server.Http'] = {
		version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE()*/,
		dependencies: [
			'Doodad.Server.Http',
		],

		create: function create(root, /*optional*/_options, _shared) {
			const doodad = root.Doodad,
				types = doodad.Types,
				tools = doodad.Tools,
				files = tools.Files,
				namespaces = doodad.Namespaces,
				mime = tools.Mime,
				//locale = tools.Locale,
				mixIns = doodad.MixIns,
				//interfaces = doodad.Interfaces,
				//extenders = doodad.Extenders,
				io = doodad.IO,
				//ioInterfaces = io.Interfaces,
				ioMixIns = io.MixIns,
				nodejs = doodad.NodeJs,
				cluster = nodejs.Cluster,
				nodejsIO = nodejs.IO,
				nodejsIOInterfaces = nodejsIO.Interfaces,
				server = doodad.Server,
				//serverInterfaces = server.Interfaces,
				ipc = server.Ipc,
				http = server.Http,
				//httpInterfaces = http.Interfaces,
				httpMixIns = http.MixIns,
				nodejsServer = nodejs.Server,
				nodejsHttp = nodejsServer.Http,
				minifiers = io.Minifiers,
				templates = doodad.Templates,
				templatesHtml = templates.Html,
				dates = tools.Dates,
				moment = dates.Moment; // Optional


			const modulePath = files.parsePath(module.filename).set({file: null});


			const __Internal__ = {
			};

			tools.complete(_shared.Natives, {
				windowJSON: global.JSON,

				globalBuffer: global.Buffer,

				globalProcess: global.process,

				//mathFloor: global.Math.floor,
				mathRound: global.Math.round,
				mathMax: global.Math.max,
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

					__endRacer: doodad.PRIVATE(null),

					nodeJsStream: doodad.PROTECTED(null),

					nodeJsStreamOnError: doodad.NODE_EVENT('error', function nodeJsStreamOnError(context, err) {
						err.trapped = true;
						if (!this.ended) {
							this.__endRacer.resolve(this.end(true));
						};
					}),

					nodeJsStreamOnClose: doodad.NODE_EVENT('close', function nodeJsStreamOnClose(context) {
						// Response stream has been closed
						if (!this.ended) {
							this.__endRacer.resolve(this.end(!!this.nodeJsStream.finished));
						};
					}),

					nodeJsStreamOnFinish: doodad.NODE_EVENT('finish', function nodeJsStreamOnFinish(context) {
						// Response stream has been closed
						if (!this.ended) {
							this.__endRacer.resolve(this.end(true));
						};
					}),

					create: doodad.OVERRIDE(function create(request, nodeJsStream) {
						types.setAttribute(this, 'message', nodeHttp.STATUS_CODES[this.status]);

						this._super(request);

						const Promise = types.getPromise();

						this.__endRacer = Promise.createRacer();

						this.nodeJsStream = nodeJsStream;
						this.nodeJsStreamOnError.attach(nodeJsStream);
						this.nodeJsStreamOnClose.attachOnce(nodeJsStream);
						this.nodeJsStreamOnFinish.attachOnce(nodeJsStream);
					}),

					destroy: doodad.OVERRIDE(function destroy() {
						if (!types.DESTROYED(this.nodeJsStream)) {
							this.nodeJsStream.end();
						};

						this.nodeJsStreamOnError.clear();
						this.nodeJsStreamOnClose.clear();
						this.nodeJsStreamOnFinish.clear();

						const racer = this.__endRacer;

						if (racer && !racer.isSolved()) {
							this.__endRacer.reject(new types.ScriptInterruptedError("Response object is about to be destroyed."));
						};

						types.DESTROY(this.stream);

						this._super();
					}),

					end: doodad.PUBLIC(doodad.NON_REENTRANT(doodad.ASYNC(function end(forceDisconnect) {
						// NOTE: MUST ALWAYS REJECTS

						if (this.ended) {
							throw new server.EndOfRequest();
						};

						const Promise = types.getPromise();

						return Promise.try(function tryEnd() {
							types.setAttribute(this, 'ended', true); // blocks additional operations...
							this.__ending = true; // ...but some operations are still allowed
							if (!forceDisconnect) {
								if (this.status !== types.HttpStatus.OK) {
									const ev = new doodad.Event({promise: Promise.resolve()});
									this.onStatus(ev);
									if (ev.prevent) {
										return ev.data.promise;
									};
								};
							};
							return undefined;
						}, this)
							.finally(function() {
								let promise = null;
								const stream = this.stream,
									destroyed = stream && types.DESTROYED(stream),
									buffered = stream && !destroyed && stream._implements(ioMixIns.BufferedStreamBase);
								if (forceDisconnect || destroyed || this.nodeJsStream.finished) {
									types.DESTROY(this.nodeJsStream);
								} else {
									if (!this.trailersSent) {
										this.sendTrailers();
									};
									promise = Promise.create(function(resolve, reject) {
										this.nodeJsStream.once('destroy', resolve);
										this.nodeJsStream.once('close', resolve);
										this.nodeJsStream.once('finish', resolve);
										this.nodeJsStream.once('error', reject);
										if (buffered) {
											return stream.flushAsync({purge: true})
												.then(function(dummy) {
													if (stream.canWrite()) {
														stream.write(io.EOF);
														return stream.flushAsync({purge: true});
													} else {
														this.nodeJsStream.end();
													};
													return undefined;
												}, null, this)
												.catch(reject);
										} else if (stream && stream.canWrite()) {
											return stream.writeAsync(io.EOF);
										} else {
											this.nodeJsStream.end();
										};
										return undefined;
									}, this);
								};
								this.__ending = false; // now blocks any operation
								return promise;
							}, this)
							.then(function(dummy) {
								if (!this.request.ended) {
									return this.request.end(forceDisconnect);
								};
								return undefined;
							}, null, this)
							.then(function(dummy) {
								throw new server.EndOfRequest();
							});
					}))),

					setStatus: doodad.OVERRIDE(function setStatus(status, /*optional*/message) {
						status = status || types.HttpStatus.OK;
						message = message || nodeHttp.STATUS_CODES[status];

						this._super(status, message);
					}),

					sendHeaders: doodad.PUBLIC(function sendHeaders() {
						if (this.ended && !this.__ending) {
							throw new server.EndOfRequest();
						};

						if (this.headersSent) {
							throw new types.NotAvailable("Can't respond with a new status or new headers because the headers have already been sent to the client.");
						};

						if (this.nodeJsStream.headersSent) {
							// NOTE: Should not happen
							throw new types.NotAvailable("Can't send the headers and the status because Node.js has already sent headers to the client.");
						};

						this.onSendHeaders(new doodad.Event());

						const response = this.nodeJsStream;

						response.statusCode = this.status;
						response.statusMessage = this.message;

						tools.forEach(this.headers, function(value, name) {
							if (value) {
								response.setHeader(name, value);
							} else {
								response.removeHeader(name);
							};
						});

						types.setAttribute(this, 'headersSent', true);
					}),

					__streamOnWrite: doodad.PROTECTED(function __streamOnWrite(ev) {
						if ((!this.ended || this.__ending) && !this.headersSent) {
							this.sendHeaders();
						};
					}),

					__streamOnError: doodad.PROTECTED(function __streamOnError(ev) {
						ev.preventDefault(); // error handled
						if (!this.ended) {
							this.__endRacer.resolve(this.end(true));
						};
					}),

					getStream: doodad.OVERRIDE(doodad.NON_REENTRANT(function getStream(/*optional*/options) {
						// NOTE: "getStream" is NON_REENTRANT

						if (this.ended && !this.__ending) {
							throw new server.EndOfRequest();
						};

						const Promise = types.getPromise();

						options = tools.nullObject(options);

						const status = options.status,
							message = options.message,
							headers = options.headers;

						if (status || headers) {
							if (this.headersSent) {
								throw new types.NotAvailable("Can't set a new status or new headers because the headers have been sent to the client.");
							};
							if (headers) {
								this.addHeaders(headers);
							};
							if (status) {
								this.setStatus(status, message);
							};
						};

						if (options.contentType) {
							this.setContentType(options.contentType, {encoding: options.encoding});
						} else if (options.encoding) {
							this.setContentType(this.contentType || 'text/plain', {encoding: options.encoding});
						};

						const currentStream = this.stream;
						if (currentStream) {
							return currentStream;
						};

						if (!this.contentType) {
							throw new types.Error("'Content-Type' has not been set.");
						};

						const responseStream = new nodejsIO.BinaryOutputStream(this.nodeJsStream);

						this.request.onSanitize.attachOnce(null, function() {
							types.DESTROY(responseStream);
						});

						responseStream.onWrite.attachOnce(this, this.__streamOnWrite, 10);

						const ev = new doodad.Event({
							stream: Promise.resolve(responseStream),
							options: options,
						});

						this.onGetStream(ev);

						// NOTE: "ev.data.stream" can be overriden, and it can be a Promise that returns a stream, or the stream itself.
						return this.__endRacer.race(Promise.resolve(ev.data.stream)
							.then(function(responseStream) {
								if (types.isNothing(responseStream)) {
									throw new http.StreamAborted();
								};

								root.DD_ASSERT && root.DD_ASSERT(types._implements(responseStream, ioMixIns.OutputStreamBase), "Invalid response stream.");

								let headers = null;

								tools.forEach(this.__pipes, function(pipe) {
									const pipeHeaders = pipe.options.headers;
									if (pipeHeaders) {
										if (headers) {
											tools.extend(headers, pipeHeaders);
										} else {
											headers = tools.nullObject(pipeHeaders);
										};
									};

									pipe.options.pipeOptions = tools.nullObject(pipe.options.pipeOptions);

									// <PRB> No longer works since Node 8.2.1 : Sometimes it generates incomplete files.
									//if (!types._implements(pipe.stream, io.Stream) && types._implements(responseStream, io.Stream)) {
									//	const iwritable = responseStream.getInterface(nodejsIOInterfaces.IWritable);
									//	pipe.stream.pipe(iwritable, pipe.options.pipeOptions);
									//} else {
									//	pipe.stream.pipe(responseStream, pipe.options.pipeOptions);
									//};
									//responseStream = pipe.stream;

									const pipeStream = pipe.stream;
									const isNodeStream = !types._implements(pipeStream, ioMixIns.StreamBase);
									const sourceStream = (isNodeStream ? new nodejsIO.BinaryInputOutputStream(pipeStream) : pipeStream);
									sourceStream.pipe(responseStream, pipe.options.pipeOptions);

									if (isNodeStream) {
										this.request.onSanitize.attachOnce(null, function() {
											types.DESTROY(sourceStream);
										});
									};

									responseStream = sourceStream;
								}, this);

								this.__pipes = null;  // disables "addPipe".

								if (headers) {
									this.onSendHeaders.attachOnce(this, function(ev) {
										// Re-add pipe headers
										this.addHeaders(headers);
									});
								};

								const encoding = this.contentType.params.charset;
								if (types._implements(responseStream, io.Stream)) {
									if (encoding && !types._implements(responseStream, ioMixIns.TextOutputStream)) {
										const textStream = new io.TextDecoderStream({encoding: encoding});
										this.request.onSanitize.attachOnce(null, function() {
											types.DESTROY(textStream);
										});
										textStream.pipe(responseStream);
										responseStream = textStream;
									};
								} else {
									if (encoding) {
										if (!nodejsIO.TextInputStream.$isValidEncoding(encoding)) {
											throw new types.Error("Invalid encoding.");
										};
										responseStream = new nodejsIO.TextOutputStream(responseStream, {encoding: encoding});
									} else {
										responseStream = new nodejsIO.BinaryOutputStream(responseStream);
									};
									this.request.onSanitize.attachOnce(null, function() {
										types.DESTROY(responseStream);
									});
								};

								responseStream.onError.attach(this, this.__streamOnError, 10);

								this.stream = responseStream;

								this.request.setFullfilled(true);

								return responseStream;
							}, null, this)
							.catch(function(err) {
								types.DESTROY(responseStream);

								throw err;
							}));
					})),

					sendTrailers: doodad.PROTECTED(function sendTrailers(/*optional*/trailers) {
						if (this.ended && !this.__ending) {
							throw new server.EndOfRequest();
						};

						if (this.trailersSent) {
							throw new types.NotAvailable("Trailers have already been sent and the request will be closed.");
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

						types.setAttribute(this, 'trailersSent', true);
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
						// NOTE: Must always throws an error.
						if (this.ended) {
							throw new server.EndOfRequest();
						};


						if (this.headersSent) {
							throw new types.NotAvailable("Can't respond with a new status or new headers because the headers have already been sent to the client.");
						};

						this.addHeaders(headers);

						types.setAttributes(this, {
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

						} else {
							ex.trapped = true;

							if (!ex.bubble) {
								this.clear();

								this.request.setFullfilled(true);

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
						};

						return undefined;
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
							nodeFs.stat(path.toApiString(), doodad.Callback(this, function getStatsCallback(err, stats) {
								if (err) {
									reject(err);
								} else {
									resolve(stats);
								};
							}));
						}, this)
							.then(function parseStats(stats) {
								if (!stats.isFile()) {
									throw new types.HttpError(types.HttpStatus.NotFound);
								};

								const contentTypes = this.request.getAcceptables(mime.getTypes(path.file) || ['application/octet-stream']);

								if (!contentTypes.length) {
									throw new types.HttpError(types.HttpStatus.UnsupportedMediaType);
								};

								this.setContentType(contentTypes[0]);

								this.addHeaders({
									'Last-Modified': http.toRFC1123Date(stats.mtime), // ex.:   Fri, 10 Jul 2015 03:16:55 GMT
									'Content-Length': stats.size,
								});

								if (!this.getHeader('Content-Disposition')) {
									this.addHeader('Content-Disposition', 'attachment; filename="' + path.file.replace(/"/g, '\\"') + '"');
								};

								if (this.request.verb !== 'HEAD') {
									return this.getStream();
								};

								return undefined;
							}, null, this)
							.then(function(outputStream) {
								if (outputStream) {
									const inputStream = nodeFs.createReadStream(path.toApiString());
									this.request.onSanitize.attachOnce(null, function() {
										types.DESTROY(inputStream);
									});
									const iwritable = outputStream.getInterface(nodejsIOInterfaces.IWritable);
									inputStream.pipe(iwritable);
									return outputStream.onEOF.promise();
								};
								return undefined;
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

					__endRacer: doodad.PRIVATE(null),

					nodeJsStream: doodad.PROTECTED(null),

					startTime: doodad.PROTECTED(null),

					$__setAbortedWhenEnded: doodad.PROTECTED(false),
					__aborted: doodad.PROTECTED(false),

					$__time: doodad.PROTECTED(doodad.TYPE(null)),
					$__totalHour: doodad.PROTECTED(doodad.TYPE(0)),
					$__perSecond: doodad.PROTECTED(doodad.TYPE(0.0)),
					$__perMinute: doodad.PROTECTED(doodad.TYPE(0.0)),
					$__perHour: doodad.PROTECTED(doodad.TYPE(0.0)),
					$__oldPerSecond: doodad.PROTECTED(doodad.TYPE(null)),
					$__noActivityStart: doodad.PROTECTED(doodad.TYPE(null)),
					$__noActivityTimeout: doodad.PROTECTED(doodad.TYPE(null)),
					$__statsUpdated: doodad.PROTECTED(doodad.TYPE(false)),

					$getStats: doodad.OVERRIDE(function $getStats() {
						const stats = this._super();
						return tools.extend(stats, {
							perSecond: this.$__perSecond,
							perMinute: this.$__perMinute,
							perHour: this.$__perHour,
						});
					}),

					$clearStats: doodad.OVERRIDE(function $clearStats() {
						this._super();

						this.$__time = null;
						this.$__totalHour = 0;
						this.$__perSecond = 0.0;
						this.$__perMinute = 0.0;
						this.$__perHour = 0.0;

						const oldPerSecond = this.$__oldPerSecond;
						if (oldPerSecond) {
							oldPerSecond.length = 0;
						} else {
							this.$__oldPerSecond = [];
						};

						const noActivityTimeout = this.$__noActivityTimeout;
						if (noActivityTimeout) {
							noActivityTimeout.cancel();
							this.$__noActivityTimeout = null;
						};
						this.$__noActivityStart = null;
						this.$__statsUpdated = false;
					}),

					$compileStats: doodad.PROTECTED(doodad.TYPE(function $compileStats() {
						const oldPerSecond = this.$__oldPerSecond;
						let perSecond = 0.0;
						const time = this.$__time;
						let seconds = 0.0;
						if (time) {
							const diff = _shared.Natives.globalProcess.hrtime(time);
							seconds = diff[0] + (diff[1] / 1e9);
							if (seconds > 0.0) {
								perSecond = this.$__totalHour / seconds;
							};
							if (seconds > 86400.0) {
								this.$__time = null;
								this.$__totalHour = 0;
							};
						};
						oldPerSecond.push(perSecond);
						let count = oldPerSecond.length;
						if (count > 60) {
							oldPerSecond.shift();
							count--;
						};
						if (count > 1) {
							const max = count - 1; // last appended is already included in "perScecond".
							for (let i = 0; i < max; i++) {
								perSecond += oldPerSecond[i];
							};
							perSecond /= count;
						};
						this.$__perSecond = perSecond;
						const perMinute = (seconds >= 60.0 ? perSecond * 60.0 : 0.0);
						this.$__perMinute = perMinute;
						this.$__perHour = (seconds >= 3600.0 ? perMinute * 60.0 : 0.0);
					})),

					$watchNoActivity: doodad.PROTECTED(doodad.TYPE(function $watchNoActivity() {
						this.$__noActivityStart = _shared.Natives.globalProcess.hrtime();
						this.$__noActivityTimeout = tools.callAsync(function noActivityTimer() {
							this.$__noActivityTimeout = null;
							if (this.$__statsUpdated) {
								this.$__statsUpdated = false;
								this.$watchNoActivity();
							} else {
								const oldPerSecond = this.$__oldPerSecond;
								const diff = _shared.Natives.globalProcess.hrtime(this.$__noActivityStart);
								let seconds = diff[0] + (diff[1] / 1e9);
								seconds = _shared.Natives.mathRound(seconds);
								let count = oldPerSecond.length;
								if (count > 0) {
									let totalHour = this.$__totalHour;
									while ((seconds > 0) && (count > 0)) {
										totalHour -= _shared.Natives.mathMax(_shared.Natives.mathRound(oldPerSecond.shift()), 1);
										if (totalHour < 0) {
											totalHour = 0;
											break;
										};
										seconds--;
										count--;
									};
									this.$__totalHour = totalHour;
								};
								this.$compileStats();
								if (this.$__perSecond > 0.0) {
									this.$watchNoActivity();
								} else {
									this.$__time = null;
									this.$__totalHour = 0;
									oldPerSecond.length = 0;
								};
							};
						}, 1000, this, null, true);
					})),

					nodeJsStreamOnError: doodad.NODE_EVENT('error', function nodeJsStreamOnError(context, err) {
						err.trapped = true;
						if (!this.ended) {
							this.__endRacer.resolve(this.end(true));
						};
					}),

					nodeJsStreamOnClose: doodad.NODE_EVENT('close', function nodeJsStreamOnClose(context) {
						if (this.ended) {
							const type = types.getType(this);
							if (type.$__setAbortedWhenEnded) {
								this.__aborted = true;
							};
						} else {
							this.__endRacer.resolve(this.end(!!this.nodeJsStream.aborted));
						};
					}),

					$create: doodad.OVERRIDE(function $create(/*paramarray*/...args) {
						this._super(...args);

						// <PRB> Before Node.js version 10.2.1, the 'close' event was normally not emitted when the request was ended.
						this.$__setAbortedWhenEnded = (tools.Version.compare("10.2.1", process.versions.node) < 0);
					}),

					create: doodad.OVERRIDE(function create(server, nodeJsRequest, nodeJsResponse) {
						const Promise = types.getPromise();

						this.startTime = _shared.Natives.globalProcess.hrtime();

						this.nodeJsStream = nodeJsRequest;
						this.nodeJsStreamOnError.attach(nodeJsRequest);
						this.nodeJsStreamOnClose.attachOnce(nodeJsRequest);

						this._super(server, nodeJsRequest.method, nodeJsRequest.url, nodeJsRequest.headers, [nodeJsResponse]);

						this.__endRacer = Promise.createRacer();

						////////////////
						// STATISTICS //
						////////////////

						const type = types.getType(this);

						type.$__totalHour++;

						if (type.$__time) {
							type.$compileStats();
						} else {
							type.$__time = _shared.Natives.globalProcess.hrtime();
						};
						type.$__statsUpdated = true;

						if (!type.$__noActivityTimeout) {
							type.$watchNoActivity();
						};

					}),

					destroy: doodad.OVERRIDE(function destroy() {
						this.nodeJsStreamOnError.clear();
						this.nodeJsStreamOnClose.clear();

						types.DESTROY(this.stream);

						const racer = this.__endRacer;

						if (racer && !racer.isSolved()) {
							this.__endRacer.reject(new types.ScriptInterruptedError("Request object is about to be destroyed."));
						};

						this._super();
					}),

					createResponse: doodad.OVERRIDE(function createResponse(nodeJsRequest) {
						return new nodejsHttp.Response(this, nodeJsRequest);
					}),

					proceed: doodad.OVERRIDE(function proceed(handlersOptions, /*optional*/options) {
						return this.__endRacer.race(this._super(handlersOptions, options));
					}),

					end: doodad.OVERRIDE(function end(/*optional*/forceDisconnect) {
						// NOTE: MUST ALWAYS REJECTS

						const Promise = types.getPromise();

						if (this.ended) {
							throw new server.EndOfRequest();
						};

						function wait() {
							if (!forceDisconnect) {
								const queue = this.__waitQueue;
								if (queue.length) {
									this.__waitQueue = [];
									return this.__endRacer.race(Promise.all(queue))
										.then(wait, null, this);
								};
							};
							return undefined;
						};

						const type = types.getType(this);

						return Promise.try(function tryEndRequest() {
							types.setAttribute(this, 'ended', true); // blocks additional operations...
							this.__ending = true; // ...but some operations are still allowed

							if (!this.response.ended) {
								return this.response.end(forceDisconnect)
									.catch(server.EndOfRequest, function() {});
							};

							return undefined;
						}, this)
							.then(function(dummy) {
								this.__ending = false; // now blocks any operation

								const stream = this.stream,
									destroyed = stream && types.DESTROYED(stream),
									buffered = stream && !destroyed && stream._implements(ioMixIns.BufferedStreamBase);

								if (forceDisconnect || destroyed) {
									types.DESTROY(this.nodeJsStream);
									this.sanitize(); // should prevents blocking on "wait" if everything is cleaned correctly on sanitize.
								} else {
									if (buffered) {
										return stream.flushAsync({purge: true});
									};
								};

								return undefined;
							}, null, this)
							.then(wait, null, this)
							.catch(this.catchError, this)
							.nodeify(function(err, dummy) {
								let status = this.response.status;

								if (this.__aborted || forceDisconnect || types.DESTROYED(this.response)) {
									status = null;
								};

								this.onEnd();

								if (err) {
									throw err;
								};

								return status;
							}, this)
							.nodeify(function(err, status) {
								if (err || types.isNothing(status)) {
									this.$__aborted++;
								} else if (types.HttpStatus.isInformative(status) || types.HttpStatus.isSuccessful(status)) {
									this.$__successful++;
								} else if (types.HttpStatus.isRedirect(status)) {
									this.$__redirected++;
								} else {
									const failed = this.$__failed;
									const statusStr = types.toString(status);
									if (types.has(failed, statusStr)) {
										failed[statusStr]++;
									} else {
										failed[statusStr] = 1;
									};
								};

								throw new server.EndOfRequest();
							}, type);
					}),

					__streamOnError: doodad.PROTECTED(function __streamOnError(ev) {
						ev.preventDefault(); // error handled
						if (!this.ended) {
							this.__endRacer.resolve(this.end(true));
						};
					}),

					getStream: doodad.OVERRIDE(doodad.NON_REENTRANT(function getStream(/*optional*/options) {
						// NOTE: "getStream" is NON_REENTRANT

						const Promise = types.getPromise();

						if (this.ended && !this.__ending) {
							throw new server.EndOfRequest();
						};

						options = tools.nullObject(this.__streamOptions, options);

						const currentStream = this.stream;
						if (currentStream) {
							return currentStream;
						};

						const acceptContentEncodings = (this.__contentEncodings.length ? this.__contentEncodings : ['identity']);
						const contentEncoding = (this.getHeader('Content-Encoding') || 'identity').toLowerCase(); // case-insensitive
						if (acceptContentEncodings.indexOf(contentEncoding) < 0) {
							return this.response.respondWithStatus(types.HttpStatus.UnsupportedMediaType);
						};

						const requestStream = new nodejsIO.BinaryInputStream(this.nodeJsStream);

						this.onSanitize.attachOnce(null, function() {
							types.DESTROY(requestStream);
						});

						const ev = new doodad.Event({
							stream: Promise.resolve(requestStream),
							options: options,
						});

						this.onGetStream(ev);

						// NOTE: "ev.data.stream" can be overriden, and it can be a Promise that returns a stream, or the stream itself.
						return this.__endRacer.race(Promise.resolve(ev.data.stream)
							.then(function(requestStream) {
								if (types.isNothing(requestStream)) {
									throw new http.StreamAborted();
								};

								root.DD_ASSERT && root.DD_ASSERT(types._implements(requestStream, ioMixIns.InputStreamBase), "Invalid request stream.");

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

								requestStream.onError.attach(this, this.__streamOnError, 10);

								tools.forEach(this.__pipes, function forEachPipe(pipe) {
									pipe.options.pipeOptions = tools.nullObject(pipe.options.pipeOptions);

									//if (!types._implements(requestStream, io.Stream) && types._implements(pipe.stream, io.Stream)) {
									//	const iwritable = pipe.stream.getInterface(nodejsIOInterfaces.IWritable);
									//	requestStream.pipe(iwritable, pipe.options.pipeOptions);
									//} else {
									//	requestStream.pipe(pipe.stream, pipe.options.pipeOptions);
									//};
									//requestStream = pipe.stream;

									const pipeStream = pipe.stream;
									const isNodeStream = !types._implements(pipeStream, ioMixIns.StreamBase);
									const destStream = (isNodeStream ? new nodejsIO.BinaryOutputStream(pipeStream) : pipeStream);
									//destStream.onError.attachOnce(this, this.onError);
									requestStream.pipe(destStream, pipe.options.pipeOptions);
									const sourceStream = (isNodeStream ? new nodejsIO.BinaryInputStream(pipeStream) : pipeStream);
									if (isNodeStream) {
										this.onSanitize.attachOnce(null, function() {
											types.DESTROY(destStream);
											types.DESTROY(sourceStream);
										});
									};
									requestStream = sourceStream;
								}, this);
								this.__pipes = null;  // disables "addPipe".

								if (types._implements(requestStream, io.Stream)) {
									if (requestEncoding && !types._implements(requestStream, [ioMixIns.TextInputStream, ioMixIns.ObjectTransformableOut])) {
										const textStream = new io.TextDecoderStream({encoding: requestEncoding});
										//textStream.onError.attachOnce(this, this.onError);
										//this.onSanitize.attachOnce(null, function() {
										//	types.DESTROY(textStream);
										//});
										requestStream.pipe(textStream);
										requestStream = textStream;
									};
								} else {
									if (requestEncoding) {
										if (!nodejsIO.TextInputStream.$isValidEncoding(requestEncoding)) {
											return this.response.respondWithStatus(types.HttpStatus.UnsupportedMediaType);
										};
										requestStream = new nodejsIO.TextInputStream(requestStream, {encoding: requestEncoding});
									} else {
										requestStream = new nodejsIO.BinaryInputStream(requestStream);
									};
									//requestStream.onError.attachOnce(this, this.onError);
									//this.onSanitize.attachOnce(null, function() {
									//	types.DESTROY(requestStream);
									//});
								};

								this.stream = requestStream;

								this.setFullfilled(true);

								return requestStream;
							}, null, this)
							.catch(function(err) {
								types.DESTROY(requestStream);

								throw err;
							}));
					})),

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
						return tools.nullObject({
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
						//const Promise = types.getPromise();

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

								request.onError.attach(this, function(ev) {
									this.onError(ev);
								});

								request.response.onError.attach(this, function(ev) {
									this.onError(ev);
								});

								const ev = new doodad.Event({
									request: request,
								});

								this.onNewRequest(ev);

								if (!ev.prevent) {
									request.proceed(this.handlersOptions)
										.catch(request.catchError, request)
										.then(function endRequest() {
											if (!types.DESTROYED(request) && !request.ended) {
												if (request.isFullfilled()) {
													if (!request.ended) {
														return request.end();
													};
												} else {
													request.response.clear();
													return request.response.respondWithStatus(types.HttpStatus.NotFound);
												};
											};
											return undefined;
										})
										.catch(request.catchError, request)
										.nodeify(function requestCleanup(err, dummy) {
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
						types.setAttribute(this, '__address', this.__nodeServer.address());
						tools.log(tools.LogLevels.Info, "~protocol~ server listening on port '~port~', address '~address~' (~family~).", tools.extend({protocol: this.protocol.toUpperCase()}, this.__address));
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

						types.setAttribute(this, '__nodeServer', null);
					}),

					isListening: doodad.OVERRIDE(function isListening() {
						return this.__listening;
					}),

					listen: doodad.OVERRIDE(function listen(/*optional*/options) {
						// TODO: Multiple calls to "listen" for multiple IPs to bind to, instead of multiple server objects.

						if (!this.__listening) {
							this.__listening = true;

							options = tools.nullObject(options);

							const protocol = options.protocol || 'http';
							let factory;
							if (protocol === 'http') {
								factory = nodeHttp;
							} else if (protocol === 'https') {
								factory = nodeHttps;
							} else {
								throw new doodad.Error("Invalid protocol : '~0~'.", [protocol]);
							};

							let server;
							if (protocol === 'https') {
								// TODO: Implement other available options
								// TODO: Ask for private key's passphrase from the terminal if encrypted and decrypt the key.
								const opts = tools.nullObject();
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

							types.setAttribute(this, '__nodeServer', server);

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

							types.setAttribute(this, 'protocol', protocol);

							this.onListen(new doodad.Event());
						};
					}),
					stopListening: doodad.OVERRIDE(function stopListening() {
						if (this.__listening) {
							this.__listening = false;
							this.onStopListening(new doodad.Event());
							this.__nodeServer.close();
							types.setAttributes(this, {
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
								return filesList
									.filter(function(file) {
										if (file.isFolder) {
											return true;
										};
										if (!handler.options.mimeTypes) {
											return true;
										};
										const mimeTypes = mime.getTypes(file.name) || ['application/octet-stream'];
										file.mimeTypes = mimeTypes.filter(function(type) {
											return tools.some(handler.options.mimeTypes, function(mimeType) {
												return mimeType.name === type;
											});
										});
										return (file.mimeTypes.length > 0);
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
							}, null, this);
					})),

					create: doodad.OVERRIDE(function create(request, cacheHandler, path) {
						this._super(request, cacheHandler);

						this.path = path;

						if (cacheHandler) {
							const state = request.getHandlerState(cacheHandler);

							state.onNewCached.attachOnce(this, function(handler, cached) {
								files.watch(this.path.toApiString(), function() {
									cached.invalidate();
								});
							});
						};
					}),

					readDir: doodad.PUBLIC(doodad.ASYNC(function readDir() {
						return types.getType(this).$readDir(this.request.currentHandler, this.path);
					})),
				})));

			nodejsHttp.REGISTER(http.FileSystemPage.$extend(
				{
					$TYPE_NAME: 'FileSystemPage',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('FileSystemPage')), true) */,

					$applyGlobalHandlerStates: doodad.OVERRIDE(function $applyGlobalHandlerStates(server) {
						this._super(server);

						const resType = this.DD_FULL_NAME;

						server.applyGlobalHandlerState(nodejsHttp.CacheHandler, {
							generateKey: doodad.OVERRIDE(function generateKey(request, handler, keyObj, sectionName) {
								this._super(request, handler, keyObj, sectionName);

								const res = !request.url.file && request.url.getArg('res', true);
								if (res) {
									keyObj.url.path = null;
									keyObj.url.file = null;
									keyObj.resType = resType;
									keyObj.res = res;
								};
							}),
						});
					}),

					$prepare: doodad.OVERRIDE(function $prepare(options) {
						types.getDefault(options, 'depth', Infinity);

						options = this._super(options);

						let val;

						options.defaultEncoding = options.defaultEncoding || 'utf-8';

						val = files.parsePath(options.path);
						const stats = nodeFs.statSync(val.toApiString());
						options.isFolder = !stats.isFile();
						if (options.isFolder) {
							val = val.pushFile();
						};
						options.path = val;

						options.showFolders = types.toBoolean(options.showFolders);

						if (options.showFolders) {
							val = options.folderTemplate;
							if (types.isNothing(val)) {
								val = modulePath.combine('./res/templates/Folder.ddt');
							} else if (!(val instanceof files.Path)) {
								val = files.Path.parse(val);
							};
							root.DD_ASSERT && root.DD_ASSERT((val instanceof files.Path), "Invalid folder template.");
							options.folderTemplate = val;
						};

						return options;
					}),

					getSystemPath: doodad.OVERRIDE(function getSystemPath(request, targetUrl) {
						let path = null;
						if (targetUrl) {
							if (this.options.isFolder) {
								if (targetUrl.args.has('res')) {
									path = this.options.folderTemplate.set({file: ''}).combine('./public/' + targetUrl.args.get('res', true));
								} else if (targetUrl.isRelative) {
									path = this.options.path.combine(targetUrl.set({domain: null}));
								} else {
									const handlerState = request.getHandlerState(this);
									const handlerUrl = handlerState.url.pushFile();
									const relativeUrl = targetUrl.relative(handlerUrl);
									path = this.options.path.combine(relativeUrl);
								};
							} else if (!targetUrl.isRelative && !targetUrl.args.has('res')) {
								path = this.options.path;
							};
						};
						return path;
					}),

					__getFileUrl: doodad.PROTECTED(function getFileUrl(request) {
						const state = request.getHandlerState(this);
						const urlRemaining = state.matcherResult.urlRemaining;

						const url = (urlRemaining && (urlRemaining.path.length || urlRemaining.file) ? urlRemaining : request.url);

						return url;
					}),

					createStream: doodad.OVERRIDE(function createStream(request, /*optional*/options) {
						let url = types.get(options, 'url', null);

						if (!url) {
							url = this.__getFileUrl(request);
						};

						const path = this.getSystemPath(request, url);

						if (!path) {
							return null;
						};

						const nodeStream = nodeFs.createReadStream(path.toApiString());
						const inputStream = new nodejsIO.BinaryInputStream(nodeStream);

						request.onSanitize.attachOnce(null, function() {
							types.DESTROY(inputStream);
							types.DESTROY(nodeStream);
						});

						return inputStream;
					}),

					addHeaders: doodad.PROTECTED(doodad.ASYNC(function addHeaders(request) {
						const Promise = types.getPromise();

						const url = this.__getFileUrl(request);

						const path = this.getSystemPath(request, url);

						if (!path) {
							return null;
						};

						const stat = function(path) {
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
										if (stats.isFile()) {
											if (path.file) {
												stats.path = pathStr;
											} else {
												const newPath = path.popFile();
												stats.path = (newPath ? newPath.toApiString() : pathStr);
											};
										} else if (path.file) {
											stats.path = path.pushFile().toApiString();
										} else {
											stats.path = pathStr;
										};
										resolve(stats);
									};
								}));
							}, this)
								.then(function toCanonical(stats) {
									if (stats) {
										if (this.options.caseSensitive && this.options.forceCaseSensitive) {
											// Windows/MacOS X : File systems are case-insensitive by default.
											//					If "forceCaseSensitive" is true, we scan the file system for the right name and require that exact name.
											//					But please note that it causes an overhead and enabling the case-sensitive option on the file system,
											//					when possible, is a better choice.
											return files.getCanonicalAsync(path)
												.then(function(canonicalPath) {
													if (stats.isFile()) {
														if (canonicalPath.file) {
															stats.realPath = canonicalPath.toApiString();
														} else {
															const newPath = canonicalPath.popFile();
															stats.realPath = (newPath ? newPath.toApiString() : canonicalPath.toApiString());
														};
													} else if (canonicalPath.file) {
														stats.realPath = canonicalPath.pushFile().toApiString();
													} else {
														stats.realPath = canonicalPath.toApiString();
													};
													return stats;
												}, null, this);
										} else {
											stats.realPath = stats.path;
										};
									};
									return stats;
								}, null, this);
						};

						return stat.call(this, path)
							.then(function(stats) {
								// TODO: Do not hardcode. Make options.
								if (!stats && (path.extension === 'ddtx')) {
									return stat.call(this, path.set({extension: 'ddt'}));
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
									handler = null;
								if (stats.isFile()) {
									contentTypes = mime.getTypes(path.file) || ['application/octet-stream'];
									handler = request.currentHandler;
								} else {
									// TODO: Make it dynamic. Based on folder index (currently Folder.ddt or json output, depending on the "Accept" header).
									contentTypes = ['text/html; charset=utf-8', 'application/json; charset=utf-8'];
								};

								const isResource = request.url.args.has('res');

								let contentType;
								if (isResource) {
									contentType = contentTypes[0];
								} else {
									contentType = request.getAcceptables(contentTypes, {handler})[0];
								};
								if (!contentType) {
									return request.response.respondWithStatus(types.HttpStatus.NotAcceptable);
								};

								request.response.addHeaders({
									'Last-Modified': http.toRFC1123Date(stats.mtime), // ex.:   Fri, 10 Jul 2015 03:16:55 GMT
								});

								if (stats.isFile()) {
									request.response.addHeaders({
										'Content-Disposition': 'filename="' + path.file.replace(/"/g, '\\"') + '"',
									});
								} else {
									const state = request.getHandlerState(this);
									if (state.matcherResult) {
										types.setAttribute(state.matcherResult, 'url', state.matcherResult.url.pushFile());
									};
									request.response.setVary('Accept');
								};

								// Use HTTP 1.1 chunks, or let Node.js provide it.
								request.response.clearHeaders('Content-Length');

								request.response.setContentType(contentType, {handler});

								return tools.nullObject({
									contentType,
									stats,
									url,
									path,
								});
							}, null, this);
					})),

					sendDDT: doodad.PROTECTED(doodad.ASYNC(function sendDDT(request, data) {
						// TODO: Allow to extend with other template engines.
						request.data.isFolder = false;
						if (!request.url.file) {
							return request.redirectClient(request.url.popFile());
						};
						if (request.url.extension === 'ddt') {
							// We always show the extension "ddtx"
							return request.redirectClient(request.url.set({extension: 'ddtx'}));
						};
						if (data.path) {
							// NOTE: By changing the extension to "ddt", it will first try to serve the "ddtx". And if the 'ddtx' file doesn't exist, it will serve the "ddt".
							return templatesHtml.getTemplate(null, data.path.set({extension: 'ddt'}))
								.then(function renderTemplate(templType) {
									const cacheHandlers = request.getHandlers(nodejsHttp.CacheHandler);
									const cacheHandler = (cacheHandlers.length > 0 ? cacheHandlers[cacheHandlers.length - 1] : null);
									const templ = new templType(request, cacheHandler, {variables: this.options.variables});
									return request.response.getStream({encoding: templType.$options.encoding})
										.then(function(stream) {
											templ.pipe(stream);
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
								}, null, this)
								.then(function() {
									if (!request.ended) {
										return request.end();
									};
									return undefined;
								});
						};
						return undefined;
					})),

					sendFile: doodad.PROTECTED(doodad.ASYNC(function sendFile(request, data) {
						//const Promise = types.getPromise();

						if (data.path) {
							request.data.isFolder = false;

							if (!request.url.file && !request.url.args.has('res')) {
								return request.redirectClient(request.url.popFile());
							};

							// TODO: Refactor "watch" without using "options". See CacheHandler.__onGetStream
							const options = (root.getOptions().debug ? {watch: data.path} : null);

							return request.response.getStream(options)
								.then(function(outputStream) {
									return this.createStream(request, {url: data.url})
										.then(function(inputStream) {
											inputStream.pipe(outputStream);
											return outputStream.onEOF.promise();
										}, null, this);
								}, null, this)
								.then(function() {
									if (!request.ended) {
										return request.end();
									};
									return undefined;
								});
						};

						return undefined;
					})),

					sendFolder: doodad.PROTECTED(doodad.ASYNC(function sendFolder(request, data) {
						//const Promise = types.getPromise();
						request.data.isFolder = true;
						if (request.url.file) {
							return request.redirectClient(request.url.pushFile());
						};

						// Get negociated mime types between the handler and the client
						function sendHtml() {
							return templatesHtml.getTemplate(null, this.options.folderTemplate)
								.then(function renderTemplate(templType) {
									const cacheHandlers = request.getHandlers(nodejsHttp.CacheHandler);
									const cacheHandler = (cacheHandlers.length > 0 ? cacheHandlers[cacheHandlers.length - 1] : null);
									const templ = new templType(request, cacheHandler, data.path);
									return request.response.getStream({encoding: templType.$options.encoding})
										.then(function(stream) {
											templ.pipe(stream);
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
							// TODO: Use template from "this.options.folderTemplate" for $readDir
							return nodejsHttp.FolderPageTemplate.$readDir(this, data.path)
								.then(function stringifyDir(filesList) {
									filesList = tools.map(filesList, function(file) {
										return tools.nullObject({
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

						function send() {
							if (data.contentType.name === 'text/html') {
								return sendHtml.call(this);
							} else {
								return sendJson.call(this);
							};
						};

						return send.call(this)
							.then(function() {
								if (!request.ended) {
									return request.end();
								};
								return undefined;
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
										// TODO: Allow to extend with other template engines.
										const isDDT = (data.path.extension === 'ddt') || (data.path.extension === 'ddi') || (data.path.extension === 'ddtx');
										if (isDDT && (data.contentType.name === 'text/html')) {
											return this.sendDDT(request, data);
											// TODO: Use another flag than "showFolders" to mean if we can send the source file of a DDT or a DDTX
										} else if (!isDDT || this.options.showFolders) {
											return this.sendFile(request, data);
										} else {
											return request.response.respondWithStatus(types.HttpStatus.UnsupportedMediaType);
										};
									} else if (this.options.showFolders && ((data.contentType.name === 'text/html') || (data.contentType.name === 'application/json'))) {
										return this.sendFolder(request, data);
									} else {
										return request.response.respondWithStatus(types.HttpStatus.UnsupportedMediaType);
									};
								} else {
									request.setFullfilled(false);
								};
								return undefined;
							}, null, this);
					}),

				}));

			nodejsHttp.REGISTER(doodad.Object.$extend(
				ipc.MixIns.Service,
				{
					$TYPE_NAME: 'ClusterDataServiceMaster',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('ClusterDataServiceMaster')), true) */,

					syncSetToken: ipc.CALLABLE(function syncSetToken(request, handlerName, token) {
						const Promise = types.getPromise();
						if (nodeCluster.isMaster) {
							const keys = types.keys(nodeCluster.workers);
							return Promise.map(keys, function(key) {
								const worker = nodeCluster.workers[key];
								// TODO: Get "worker" from Request and remove that argument.
								if (worker.id !== request.msg.worker.id) {
									return request.server.callService(nodejsHttp.ClusterDataServiceWorker.DD_FULL_NAME, 'setToken', [handlerName, token], {worker: worker /*ttl: ..., ...*/});
								};
								return undefined;
							}, this);
						};
						return undefined;
					}),

					syncDeleteToken: ipc.CALLABLE(function syncDeleteToken(request, handlerName, id) {
						const Promise = types.getPromise();
						if (nodeCluster.isMaster) {
							const keys = types.keys(nodeCluster.workers);
							return Promise.map(keys, function(key) {
								const worker = nodeCluster.workers[key];
								// TODO: Get "worker" from Request and remove that argument.
								if (worker.id !== request.msg.worker.id) {
									return request.server.callService(nodejsHttp.ClusterDataServiceWorker.DD_FULL_NAME, 'deleteToken', [handlerName, id], {worker: worker /*ttl: ..., ...*/});
								};
								return undefined;
							}, this);
						};
						return undefined;
					}),
				}));

			nodejsHttp.REGISTER(doodad.Object.$extend(
				ipc.MixIns.Service,
				{
					$TYPE_NAME: 'ClusterDataServiceWorker',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('ClusterDataServiceWorker')), true) */,

					setToken: ipc.CALLABLE(function setToken(request, handlerName, token, /*optional*/options) {
						if (nodeCluster.isWorker && handlerName && token && token.id && token.data) {
							const handler = namespaces.get(handlerName);
							if (!types._implements(handler, httpMixIns.Handler)) {
								throw new types.ValueError("Invalid handler name.");
							};
							return nodejsHttp.ClusterDataHandler.$set(request, handler, token.data, tools.nullObject({foreignId: token.id, ttl: token.ttl}, options))
								.then(function(token) {
									// Does nothing
								});
						};
						return undefined;
					}),

					deleteToken: ipc.CALLABLE(function deleteToken(request, handlerName, id, /*optional*/options) {
						if (nodeCluster.isWorker && handlerName && id) {
							const handler = namespaces.get(handlerName);
							if (!types._implements(handler, httpMixIns.Handler)) {
								throw new types.ValueError("Invalid handler name.");
							};
							return nodejsHttp.ClusterDataHandler.$delete(request, handler, id, options);
						};
						return undefined;
					}),
				}));

			nodejsHttp.REGISTER(doodad.Object.$extend(
				httpMixIns.Handler,
				{
					$TYPE_NAME: 'DataHandler',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('DataHandler')), true) */,

					$timeoutDelay: doodad.PUBLIC(30), // seconds

					$__exchangedDatas: doodad.PROTECTED(null),

					$__dataTimeoutId: doodad.PROTECTED(null),

					$__collectInternal: doodad.PROTECTED(function $__collectInternal() {
						this.$__dataTimeoutId = null;
						let count = 0;
						try {
							const exchanged = this.$__exchangedDatas;
							tools.forEach(exchanged, function(storage, handlerType) {
								// TODO: Make sure the main thread will not lock for too long by doing X items per tick
								// TODO: Isolate Infinity ttls so that we don't loop through them.
								tools.forEach(storage, function(token, id) {
									const diff = process.hrtime(token.time);
									const seconds = diff[0] + (diff[1] / 1e9);
									if (seconds >= token.ttl) {
										storage.delete(id);
									} else {
										count++;
									};
								}, this);
							}, this);
						} catch(o) {
							if (root.getOptions().debug) {
								types.DEBUGGER();
							};
						};
						if (count > 0) {
							this.$__startCollector();
						};
					}),

					$__startCollector: doodad.PROTECTED(function $__startCollector() {
						if (!this.$__dataTimeoutId) {
							this.$__dataTimeoutId = tools.callAsync(this.$__collectInternal, this.$timeoutDelay * 1000, this, null, true);
						};
					}),

					// TODO: Flood protection on "$set".
					// FUTURE: Reuse id for the same request url and session, or just the url (depends if data is common to a session or not).
					$set: doodad.PUBLIC(doodad.TYPE(doodad.ASYNC(function $set(request, handler, data, /*optional*/options) {
						const MAX_RETRIES = 5;

						if (root.DD_ASSERT) {
							root.DD_ASSERT(data, "Invalid data.");
							root.DD_ASSERT(types._implements(handler, httpMixIns.Handler), "Invalid handler.");
						};

						const ttl = types.get(options, 'ttl', 5 * 60);
						root.DD_ASSERT && root.DD_ASSERT(types.isInteger(ttl), "Invalid TTL option.");

						const handlerType = types.getType(handler);

						const exchanged = this.$__exchangedDatas;

						let storage = exchanged.get(handlerType);
						if (!storage) {
							storage = new types.Map();
							exchanged.set(handlerType, storage);
						};

						let id = null;

						const foreignId = types.get(options, 'foreignId');
						if (foreignId) {
							const foreignIdStr = types.toString(foreignId);
							// NOTE: "$set" called with an ID should comes from IPC
							if (storage.has(foreignIdStr)) {
								// Signal the collision.
								// TODO: LOW: Create a specific error type (types.SyncError ?).
								throw new types.Error("That id is not available : ~0~.", [foreignIdStr]);
							};
							id = foreignIdStr;
						} else {
							id = tools.generateUUID();
							let retries = 0;
							while ((retries < MAX_RETRIES) && storage.has(id)) {
								id = tools.generateUUID();
								retries++;
							};
							if (retries >= MAX_RETRIES) {
								throw new types.Error("Can't generate a new ID.");
							};
						};

						const token = {
							id,
							data,
							ttl,
							time: process.hrtime(),
						};

						storage.set(id, token);

						this.$__startCollector();

						return token;
					}))),

					$get: doodad.PUBLIC(doodad.TYPE(doodad.ASYNC(function $get(request, handler, id, /*optional*/options) {
						const exchanged = this.$__exchangedDatas;
						const handlerType = types.getType(handler);
						const storage = exchanged.get(handlerType);
						if (storage) {
							const token = storage.get(id);
							if (token) {
								token.time = process.hrtime(); // Revives the token
								return token;
							};
						};
						return null;
					}))),

					$delete: doodad.PUBLIC(doodad.TYPE(doodad.ASYNC(function $delete(request, handler, id, /*optional*/options) {
						const exchanged = this.$__exchangedDatas;
						const handlerType = types.getType(handler);
						const storage = exchanged.get(handlerType);
						if (storage) {
							storage.delete(id);
						};
						return null;
					}))),

					$prepare: doodad.OVERRIDE(function $prepare(options) {
						options = this._super(options);

						//let val;

						options.defaultTTL = types.toInteger(options.defaultTTL) || 5 * 60; // seconds

						return options;
					}),

					$create: doodad.OVERRIDE(function $create() {
						this._super();

						this.$__exchangedDatas = new types.Map();
					}),

					$destroy: doodad.OVERRIDE(function $destroy() {
						if (this.$__dataTimeoutId) {
							this.$__dataTimeoutId.cancel();
							this.$__dataTimeoutId = null;
						};

						this._super();
					}),

					getData: doodad.PUBLIC(doodad.ASYNC(function getData(request, handler, id, /*optional*/options) {
						return types.getType(this).$get(request, handler, id, options)
							.then(function(token) {
								if (token) {
									return token.data;
								};
								return null;
							});
					})),

					setData: doodad.PUBLIC(doodad.ASYNC(function setData(request, handler, data, /*optional*/options) {
						return types.getType(this).$set(request, handler, data, tools.nullObject({
							ttl: this.options.defaultTTL,
						}, options))
							.then(function(token) {
								return token.id;
							});
					})),

					deleteData: doodad.PUBLIC(doodad.ASYNC(function deleteData(request, handler, id, /*optional*/options) {
						return types.getType(this).$delete(request, handler, id, options);
					})),

					// TODO: Probably I should remove "MUST_OVERRIDE" ?
					execute: doodad.OVERRIDE(function(request) {
						return this._super(request);
					}),
				}));

			nodejsHttp.REGISTER(nodejsHttp.DataHandler.$extend(
				{
					$TYPE_NAME: 'ClusterDataHandler',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('ClusterDataHandler')), true) */,

					$prepare: doodad.OVERRIDE(function $prepare(options) {
						options = this._super(options);

						//let val;

						if (nodeCluster.isWorker) {
							if (!types._instanceof(options.messenger, cluster.ClusterMessenger)) {
								throw new types.ValueError("Invalid or missing 'messenger' option.");
							};
						};

						return options;
					}),

					$set: doodad.OVERRIDE(function $set(request, handler, data, /*optional*/options) {
						return this._super(request, handler, data, options)
							.then(function(token) {
								if (nodeCluster.isWorker && !types.has(options, 'foreignId')) {
									const handlerType = types.getType(handler);
									const handlerName = handlerType.DD_FULL_NAME;
									//root.DD_ASSERT && root.DD_ASSERT(namespaces.get(handlerName) === handlerType, "Handler is not registred.");

									// TODO: Handle ID collisions while syncing by generating a new ID and syncing X more time(s).
									return options.messenger.callService(nodejsHttp.ClusterDataServiceMaster.DD_FULL_NAME, 'syncSetToken', [handlerName, token])
										.then(function(dummy) {
											return token;
										}, null, this);
								};
								return token;
							}, null, this);
					}),

					$delete: doodad.OVERRIDE(function $delete(request, handler, id, /*optional*/options) {
						return this._super(request, handler, id)
							.then(function(dummy) {
								if (nodeCluster.isWorker) {
									const handlerType = types.getType(handler);
									const handlerName = handlerType.DD_FULL_NAME;
									//root.DD_ASSERT && root.DD_ASSERT(namespaces.get(handlerName) === handlerType, "Handler is not registred.");

									// TODO: Handle ID collisions while syncing by generating a new ID and syncing X more time(s).
									return options.messenger.callService(nodejsHttp.ClusterDataServiceMaster.DD_FULL_NAME, 'syncDeleteToken', [handlerName, id]);
								};
								return undefined;
							}, null, this);
					}),

					setData: doodad.OVERRIDE(function setData(request, handler, data, /*optional*/options) {
						return this._super(request, handler, data, tools.nullObject({messenger: this.options.messenger}, options));
					}),

					deleteData: doodad.OVERRIDE(function deleteData(request, handler, id, /*optional*/options) {
						return this._super(request, handler, id, tools.nullObject({messenger: this.options.messenger}, options));
					}),
				}));


			// TODO: Implement transforms to "Page" instead of making a new handler.
			nodejsHttp.REGISTER(nodejsHttp.FileSystemPage.$extend(
				{
					$TYPE_NAME: 'JavascriptFileSystemPage',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('JavascriptFileSystemPage')), true) */,

					$prepare: doodad.OVERRIDE(function $prepare(options) {
						options = this._super(options);

						//let val;

						options.runDirectives = types.toBoolean(options.runDirectives);
						options.keepComments = types.toBoolean(options.keepComments);
						options.keepSpaces = types.toBoolean(options.keepSpaces);

						options.variables = tools.nullObject(options.variables);

						return options;
					}),

					$applyGlobalHandlerStates: doodad.OVERRIDE(function $applyGlobalHandlerStates(server) {
						this._super(server);

						server.applyGlobalHandlerState(nodejsHttp.CacheHandler, {
							generateKey: doodad.OVERRIDE(function generateKey(request, handler, keyObj, sectionName) {
								this._super(request, handler, keyObj, sectionName);

								if (!sectionName) {
									const varsId = request.url.getArg('vars', true);
									if (!types.isNothing(varsId)) {
										keyObj.varsId = varsId;
									};
								};
							}),
						});
					}),

					getJsVars: doodad.PUBLIC(doodad.ASYNC(function getJsVars(request, id, /*optional*/options) {
						const dataHandlers = request.getHandlers(nodejsHttp.DataHandler);
						const dataHandler = (dataHandlers.length > 0 ? dataHandlers[dataHandlers.length - 1] : null);
						if (!dataHandler) {
							throw new types.NotAvailable("Data handler is not loaded.");
						};
						return dataHandler.getData(request, this, id, options);
					})),

					setJsVars: doodad.PUBLIC(doodad.ASYNC(function setJsVars(request, vars, /*optional*/options) {
						const dataHandlers = request.getHandlers(nodejsHttp.DataHandler);
						const dataHandler = (dataHandlers.length > 0 ? dataHandlers[dataHandlers.length - 1] : null);
						if (!dataHandler) {
							throw new types.NotAvailable("Data handler is not loaded.");
						};
						return dataHandler.setData(request, this, vars, options);
					})),

					deleteJsVars: doodad.PUBLIC(doodad.ASYNC(function deleteJsVars(request, id, /*optional*/options) {
						const dataHandlers = request.getHandlers(nodejsHttp.DataHandler);
						const dataHandler = (dataHandlers.length > 0 ? dataHandlers[dataHandlers.length - 1] : null);
						if (!dataHandler) {
							throw new types.NotAvailable("Data handler is not loaded.");
						};
						return dataHandler.deleteData(request, this, id, options);
					})),

					createStream: doodad.OVERRIDE(function createStream(request, /*optional*/options) {
						const Promise = types.getPromise();

						return this._super(request, options)
							.then(function(inputStream) {
								if (!inputStream) {
									return null;
								};

								const url = types.get(options, 'url', request.url);

								const file = (url.hasArg('res') ? url.getArg('res', true) : url.file);
								const fileTypes = mime.getTypes(file);
								if (!tools.some(fileTypes, function(fileType) {
									return fileType === 'application/javascript';
								})) {
									return inputStream;
								};

								//if (!types._implements(inputStream, ioMixIns.TextInputStream)) {
								//	const encoding = types.get(options, 'encoding', 'utf-8');
								//	const textStream = new io.TextDecoderStream({encoding: encoding});
								//	inputStream.pipe(textStream);
								//	inputStream = textStream;
								//};

								const mimeType = request.getAcceptables('application/javascript', {handler: this})[0];
								//const encoding = types.get(options, 'encoding', (mimeType ? mimeType.params.charset : null) || 'utf-8');
								const encoding = (mimeType && mimeType.params.charset || 'utf-8');

								const jsStream = new minifiers.Javascript({
									runDirectives: this.options.runDirectives,
									keepComments: this.options.keepComments,
									keepSpaces: this.options.keepSpaces,
									encoding: encoding,
								});

								request.onSanitize.attachOnce(null, function sanitize() {
									types.DESTROY(jsStream); // stops the stream in case of abort
								});

								let promise = Promise.resolve();

								const varsId = url.getArg('vars', true);
								if (varsId) {
									promise = promise
										.then(function(dummy) {
											return this.getJsVars(request, varsId);
										}, null, this)
										.then(function(vars) {
											if (!vars) {
												return request.response.respondWithStatus(types.HttpStatus.NotFound);
											};
											tools.forEach(vars, function forEachVar(value, name) {
												jsStream.define(name, value);
											});
											return undefined;
										}, null, this);
								};

								return promise
									.then(function(dummy) {
										tools.forEach(this.options.variables, function forEachVar(value, name) {
											jsStream.define(name, value);
										});

										return inputStream.pipe(jsStream);
									}, null, this);
							}, null, this);
					}),
				}));


			nodejsHttp.REGISTER(io.BufferedInputOutputStream.$extend(
				ioMixIns.BinaryTransformableIn,
				ioMixIns.BinaryTransformableOut,
				{
					$TYPE_NAME: 'CacheStream',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('CacheStream')), true) */,

					__remaining: doodad.PROTECTED(null),
					__headersCompiled: doodad.PROTECTED(false),
					__headers: doodad.PROTECTED(null),
					__verb: doodad.PROTECTED(null),
					__file: doodad.PROTECTED(null),
					__status: doodad.PROTECTED(null),
					__message: doodad.PROTECTED(null),
					//__key: doodad.PROTECTED(null),
					//__section: doodad.PROTECTED(false),
					//__parent: doodad.PROTECTED(null),
					__encoding: doodad.PROTECTED(null),

					__listening: doodad.PROTECTED(false),

					create: doodad.OVERRIDE(function create(/*optional*/options) {
						this._super(options);

						types.getDefault(this.options, 'headersOnly', false);
					}),

					reset: doodad.OVERRIDE(function reset() {
						this._super();

						this.__remaining = null;
						this.__headersCompiled = false;
						this.__headers = tools.nullObject();
						this.__verb = null;
						this.__file = null;
						this.__status = null;
						this.__message = null;
						//this.__key = null;
						//this.__section = false;
						//this.__parent = null;
						this.__encoding = null;
					}),

					onWrite: doodad.OVERRIDE(function onWrite(ev) {
						const retval = this._super(ev);

						if (this.__listening) {
							ev.preventDefault();

							const data = ev.data;
							const eof = (data.raw === io.EOF);
							let buf = data.valueOf();

							const remaining = this.__remaining;
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
									this.submit(new io.BinaryData(buf), {callback: data.defer()});
								};
								if (eof) {
									this.submit(new io.BinaryData(io.EOF), {callback: data.defer()});
								};
							} else {
								let index,
									lastIndex = 0;
								/* eslint no-cond-assign: "off" */
								while ((index = buf.indexOf(0x0A, lastIndex)) >= 0) { // "\n"
									if (index === lastIndex) {
										this.__headersCompiled = true;
										this.submit(new io.BinaryData(io.BOF, {data: {code: this.__status, message: this.__message, verb: this.__verb, file: this.__file, encoding: this.__encoding, headers: this.__headers}}), {callback: data.defer()});
										break;
									};
									const str = buf.slice(lastIndex, index).toString('utf-8');
									const header = tools.split(str, ':', 2);
									const name = tools.trim(header[0] || '');
									const value = tools.trim(header[1] || '');
									if (name === 'X-Cache-Key') {
										//this.__key = value;
									} else if (name === 'X-Cache-File') {
										const val = tools.split(value, ' ', 2);
										this.__verb = val[0] || '';
										this.__file = val[1] || '';
									} else if (name === 'X-Cache-Status') {
										const val = tools.split(value, ' ', 2);
										this.__status = parseInt(val[0], 10) || 200;
										this.__message = val[1] || '';
									} else if (name === 'X-Cache-Section') {
										//this.__section = types.toBoolean(value.toLowerCase());
									} else if (name === 'X-Cache-Parent') {
										//this.__parent = value;
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
									this.submit(new io.BinaryData(io.EOF), {callback: data.defer()});
									this.stopListening();
								} else {
									let remaining = null;
									if ((index >= 0) && (index < buf.length - 1)) {
										remaining = buf.slice(index + 1);
									};
									if (remaining) {
										if (this.__headersCompiled) {
											this.submit(new io.BinaryData(remaining), {callback: data.defer()});
										} else {
											this.__remaining = remaining;
										};
									};
								};
							};
						};

						return retval;
					}),

					isListening: doodad.REPLACE(function isListening() {
						return this.__listening;
					}),

					listen: doodad.REPLACE(function listen(/*optional*/options) {
						if (!this.__listening) {
							this.__listening = true;

							this.onListen();
						};
					}),

					stopListening: doodad.REPLACE(function stopListening() {
						if (this.__listening) {
							this.__listening = false;

							this.onStopListening();
						};
					}),
				}));

			__Internal__.keyObjToString = function keyObjToString() {
				const keys = types.keys(this);
				keys.sort(function(key1, key2) {
					if (key1 < key2) {
						return -1;
					} else if (key1 > key2) {
						return 1;
					} else {
						return 0;
					};
				});
				return '{' + tools.reduce(keys, function(str, key) {
					const val = this[key];
					if ((key === 'toString') || types.isNothing(val) || types.isFunction(val)) {
						return str;
					} else if (types.isPrimitive(val)) {
						return str + key + ':' + types.toString(val) + '|';
					} else if (types._instanceof(val, nodejsHttp.CacheHeaders)) {
						return str + key + ':' + val.toString() + '|';
					} else if (types.isArray(val)) {
						return '[' + tools.reduce(str, function(item) {
							return str + __Internal__.keyObjToString.call(item) + '|';
						}, '') + ']';
					} else if (types.isJsObject(val)) {
						if (types.has(val, 'toString')) {
							return str + key + ':' + types.toString(val) + '|';
						} else {
							return str + key + ':' + __Internal__.keyObjToString.call(val) + '|';
						};
					} else {
						throw new types.Error("Invalid cache key value encountered.");
					};
				}, '', this) + '}';
			};

			__Internal__.keyObjToHash = function toHash() {
				const hashStream = nodeCrypto.createHash('sha256');
				hashStream.update(this.toString());
				const hash = hashStream.digest('base64');
				types.DESTROY(hashStream);
				return hash;
			};

			nodejsHttp.REGISTER(doodad.Object.$extend(
				httpMixIns.Headers,
				{
					$TYPE_NAME: 'CacheHeaders',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('CacheHeaders')), true) */,

					toString: doodad.OVERRIDE(function toString() {
						if (types.isType(this)) {
							return this._super();
						};

						this.overrideSuper();

						const headers = this.headers;
						const names = types.keys(headers);

						names.sort(function(name1, name2) {
							if (name1 < name2) {
								return -1;
							} else if (name1 > name2) {
								return 1;
							} else {
								return 0;
							};
						});

						return '{' + tools.reduce(names, function(str, name) {
							return str + name + ':' + headers[name] + '|';
						}, '', this) + '}';
					}),
				}));

			nodejsHttp.REGISTER(types.CustomEventTarget.$inherit(
				/*typeProto*/
				{
					$TYPE_NAME: 'CachedObject',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('CachedObject')), true) */,
				},
				/*instanceProto*/
				{
					ondestroy: null,
					onvalidate: null,
					oninvalidate: null,

					key: null, // Key Object
					hashedKey: null, // String
					isSection: false, // Boolean
					parent: null, // Cached object
					duration: null, // Moment Duration
					isMain: false, // Boolean

					path: null, // Path
					writing: false, // Boolean
					ready: false, // Boolean
					expiration: null, // Date
					children: null, // objectof(Cached objects)

					_delete: types.SUPER(function _delete() {
						this.invalidate();
						this.dispatchEvent(new types.CustomEvent('destroy'));
						this._super();
					}),

					isInvalid: function isInvalid() {
						return !this.ready && !this.writing;
					},
					isPending: function isPending() {
						return !this.ready && this.writing;
					},
					isValid: function isValid() {
						return this.ready && !this.writing;
					},
					validate: function validate() {
						if (!this.ready && this.writing) {
							this.writing = false;
							this.ready = true;
							this.dispatchEvent(new types.CustomEvent('validate'));
						};
					},
					abort: function abort() {
						if (!this.ready && this.writing) {
							this.writing = false;
							if (this.path) {
								nodeFs.unlink(this.path.toApiString(), function(err) {}); // no need to get error feedbacks
								this.path = null;
							};
							this.dispatchEvent(new types.CustomEvent('invalidate'));
						};
					},
					invalidate: function invalidate() {
						const ok = this.ready && !this.writing;
						let retval = ok;
						if (ok) {
							this.ready = false;
							if (this.path) {
								nodeFs.unlink(this.path.toApiString(), function(err) {}); // no need to get error feedbacks
								this.path = null;
							};
						};
						tools.forEach(this.children, function(child) {
							const done = child.invalidate();
							if (done) {
								retval = true;
							};
						});
						if (ok) {
							this.dispatchEvent(new types.CustomEvent('invalidate'));
						};
						return retval;
					},
				}));

			nodejsHttp.REGISTER(doodad.Object.$extend(
				httpMixIns.Handler,
				{
					$TYPE_NAME: 'CacheHandler',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('CacheHandler')), true) */,

					$__cache: doodad.PROTECTED(doodad.TYPE(  new types.Map()  )), // <FUTURE> Global to threads (shared)

					$__enabled: doodad.PROTECTED(doodad.TYPE( true )),

					$applyGlobalHandlerStates: doodad.OVERRIDE(function $applyGlobalHandlerStates(server) {
						this._super(server);

						server.applyGlobalHandlerState(this, {
							disabled: doodad.PUBLIC(false), // Boolean
							noMain: doodad.PUBLIC(false), // Boolean
							defaultDuration: doodad.PUBLIC(null), // Moment Duration
							cached: doodad.PUBLIC(null), // CachedObject instance
							onNewCached: doodad.PUBLIC(doodad.RAW_EVENT()),
							generateKey: doodad.PUBLIC(function generateKey(request, handler, keyObj, sectionName) {
								keyObj.headers.addHeader('Content-Type', request.response.getHeader('Content-Type') || '*/*');
							}),
						});
					}),

					$prepare: doodad.OVERRIDE(function $prepare(options) {
						types.getDefault(options, 'depth', Infinity);

						options = this._super(options);

						let val;

						val = options.cachePath;
						if (!(val instanceof files.Path)) {
							val = files.Path.parse(val);
						};
						root.DD_ASSERT && root.DD_ASSERT(types._instanceof(val, files.Path), "Invalid cache path.");
						options.cachePath = val;

						val = moment && options.duration;
						if (!types.isNothing(val) && !moment.isDuration(val)) {
							val = moment.duration(types.toString(val)); // ISO 8601 / ASP.NET style TimeSpans (see Moment doc)
						};
						options.duration = val;

						return options;
					}),

					$expire: doodad.PUBLIC(doodad.TYPE(function $expire(key) {
						const cached = this.$__cache.get(key);
						if (!cached) {
							throw new types.ValueError("Invalid key.");
						};
						return cached.invalidate();
					})),

					$enable: doodad.PUBLIC(doodad.TYPE(function $enable() {
						this.$__enabled = true;
					})),

					$disable: doodad.PUBLIC(doodad.TYPE(function $disable() {
						this.$__enabled = false;
					})),

					createKey: doodad.PUBLIC(function createKey(/*optional*/data) {
						const key = tools.nullObject(data);

						key.toString = __Internal__.keyObjToString;
						key.toHash = __Internal__.keyObjToHash;

						return key;
					}),

					__createCached: doodad.PROTECTED(function __createCached(request, /*optional*/key, /*optional*/section, /*optional*/options) {
						if (!nodejsHttp.CacheHandler.$__enabled) {
							return null;
						};

						const state = request.getHandlerState(this);

						if (state.disabled) {
							return null;
						};

						const type = types.getType(this);
						const cacheMap = type.$__cache;

						let isMain = types.get(options, 'isMain', true);

						let parent = null;
						if (section) {
							isMain = false;
							parent = this.getCached(request, {key: key});
							if (!parent) {
								parent = this.__createCached(request, key, null, {isMain: false});
							};
							root.DD_ASSERT && root.DD_ASSERT(parent, "Section has no parent.");
							key = section;
						};

						if (root.DD_ASSERT) {
							root.DD_ASSERT(types.isFrozen(key), "Key is not finalized. You must freeze the key object when it is final.");
							root.DD_ASSERT(!isMain || !state.noMain, "Main file has been disabled.");
						};

						const hashedKey = key.toHash();

						const cached = new nodejsHttp.CachedObject();
						cached.key = key; // Key Object
						cached.hashedKey = hashedKey; // String
						cached.isSection = !!section; // Boolean
						cached.parent = parent; // Cached object
						cached.duration = state.defaultDuration; // Moment Duration
						cached.children = new types.Map(); // Cached objects
						cached.isMain = isMain; // Boolean

						cached.addEventListener('destroy', function() {
							cacheMap.delete(cached.key);
							cacheMap.delete(cached.hashedKey);

							if (cached.isSection && !types.DESTROYED(cached.parent)) {
								cached.parent.children.delete(cached.key);
								cached.parent.children.delete(cached.hashedKey);
							};
						});

						cacheMap.set(key, cached);
						cacheMap.set(hashedKey, cached);

						if (section && parent) {
							parent.children.set(key, cached);
							parent.children.set(hashedKey, cached);
						};

						const onNew = types.get(options, 'onNew', null);
						if (onNew) {
							onNew(cached);
						};

						state.onNewCached(this, cached);

						return cached;
					}),

					getCached: doodad.PUBLIC(function getCached(request, /*optional*/options) {
						if (!nodejsHttp.CacheHandler.$__enabled) {
							return null;
						};

						const state = request.getHandlerState(this);

						if (state.disabled) {
							return null;
						};

						const section = types.get(options, 'section'); // string

						if (!section && state.noMain) {
							return null;
						};

						const create = types.get(options, 'create', false); // boolean

						let key = types.get(options, 'key', null); // object

						if (types.isNothing(key)) {
							key = this.createKey();
							key.url = request.url.toDataObject({domain: null, args: null, functions: true});
							key.headers = new nodejsHttp.CacheHeaders();
						};

						if (root.DD_ASSERT) {
							root.DD_ASSERT(types.isJsObject(key), "Invalid cache key.");
							root.DD_ASSERT(types.isNothing(section) || types.isJsObject(section), "Invalid cache section key.");
						};

						const type = types.getType(this);

						let cached = null;

						if (types.isJsObject(key)) {
							if (types.isFrozen(key)) {
								// Get from object key
								cached = type.$__cache.get(key);
							} else {
								state.generateKey(request, this, key, section);
								types.freezeObject(key); // TODO: depthFreeze
							};

							if (!cached) {
								cached = type.$__cache.get(key.toHash());
							};

						} else if (types.isString(key)) {
							// Get from hashed key
							cached = type.$__cache.get(key);
							//key = cached.key;

						} else {
							throw new types.ValueError("Invalid cached object key '~0~'.", [key]);

						};

						if (cached && section) {
							let child = cached.children.get(section);
							if (!child) {
								const hashedSection = section.toHash();
								child = cached.children.get(hashedSection);
							};
							cached = child;
						};

						if (cached) {
							if (cached.expiration && cached.ready) {
								if (moment.create().isSameOrAfter(cached.expiration)) {
									cached.invalidate();
								};
							};
							return cached;

						} else if (create && (section || !state.noMain)) {
							return this.__createCached(request, key, section, options);

						} else {
							return null;

						};
					}),

					openFile: doodad.PUBLIC(doodad.ASYNC(function openFile(request, cached) {
						if (!nodejsHttp.CacheHandler.$__enabled) {
							return null;
						};

						const Promise = types.getPromise();

						const state = request.getHandlerState(this);

						if (state.disabled) {
							return null;
						};

						if (!cached.ready) {
							throw new types.NotAvailable("Cache is not ready.");
						};

						if (cached.writing) {
							throw new types.NotAvailable("Cache is writing.");
						};

						return Promise.create(function openFile(resolve, reject) {
							const fileStream = nodeFs.createReadStream(cached.path.toApiString());
							let openCb = null,
								errorCb = null;
							const cleanup = function _cleanup() {
								fileStream.removeListener('open', openCb);
								fileStream.removeListener('error', errorCb);
								openCb = null;
								errorCb = null;
							};
							fileStream.once('open', openCb = doodad.Callback(this, function onOpen(fd) {
								cleanup();
								request.onSanitize.attachOnce(null, function sanitize() {
									fileStream.close();
								});
								resolve(fileStream);
							}, reject));
							fileStream.once('error', errorCb = doodad.Callback(this, function onError(err) {
								cleanup();
								reject(err);
							}, reject));
						}, this)
							.catch(function catchOpen(err) {
								cached.invalidate();
								cached.path = null;
								if ((err.code === 'ENOENT') || (err.code === 'EPERM')) {
									// Cache file has been deleted or is not accessible
									return null;
								} else {
									throw err;
								};
							}, this)
							.then(function proceed(fileStream) {
								if (fileStream) {
									const cacheStream = new nodejsHttp.CacheStream({headersOnly: (request.verb === 'HEAD')});
									cacheStream.listen();
									const iwritable = cacheStream.getInterface(nodejsIOInterfaces.IWritable);
									request.onSanitize.attachOnce(null, function sanitize(ev) {
										types.DESTROY(cacheStream);
									});
									const promise = cacheStream.onReady.promise(function(ev) {
										ev.preventDefault();
										if (ev.data.raw === io.BOF) {
											if (ev.data.options.data.file) { // Main file
												request.response.clearHeaders();
												request.response.addHeaders(ev.data.options.data.headers);
												//ev.data.options.data.code && request.response.setStatus(ev.data.options.data.code, ev.data.options.data.message);
											};
											cacheStream.setOptions({flushMode: 'manual'});
											cacheStream.onFlush.attachOnce(this, function(ev) {
												cacheStream.setOptions({flushMode: 'auto'});
											});
											return cacheStream;
										} else {
											// Cancels resolve and waits next 'onData' event
											return false;
										};
									}, this, _shared.SECRET);
									fileStream.pipe(iwritable);
									return promise;
								} else {
									return null;
								};
							}, null, this);
					})),

					createFile: doodad.PUBLIC(doodad.ASYNC(function createFile(request, cached, /*optional*/options) {
						if (!nodejsHttp.CacheHandler.$__enabled) {
							return null;
						};

						const Promise = types.getPromise();

						const state = request.getHandlerState(this);

						if (state.disabled) {
							return null;
						};

						if (cached.ready) {
							throw new types.NotAvailable("Cache is ready.");
						};

						if (cached.writing) {
							throw new types.NotAvailable("Cache is writing.");
						};

						options = tools.nullObject(options);

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
							cached.path = this.options.cachePath.combine(tools.generateUUID());
							return Promise.create(function tryOpen(resolve, reject) {
								const stream = nodeFs.createWriteStream(cached.path.toApiString(), {autoClose: true, flags: 'wx', mode: this.options.cachedFilesMode || 0o644});
								let errorCb = null,
									openCb = null;
								stream.once('error', errorCb = doodad.Callback(this, function streamOnError(err) {
									stream.removeListener('open', openCb);
									reject(err);
								}, reject));
								stream.once('open', openCb = doodad.Callback(this, function streamOnOpen(fd) {
									stream.removeListener('error', errorCb);
									const ddStream = (encoding ? new nodejsIO.TextOutputStream(stream, {encoding: encoding}) : new nodejsIO.BinaryOutputStream(stream));
									request.onSanitize.attachOnce(null, function sanitize() {
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
									} else {
										// Abort writing of cache file, but give the response to the client
										cached.path = null;
										cached.abort();

										if (err.code === 'EPERM') {
											return null;
										} else {
											throw err;
										};
									};
								}, this);
						};

						cached.writing = true;

						return tools.Files.mkdirAsync(this.options.cachePath, {makeParents: true})
							.then(function(dummy) {
								return loopOpenFile.call(this, 10);
							}, null, this)
							.then(function afterOpen(stream) {
								if (stream) {
									let headers = '';
									headers += 'X-Cache-Key: ' + cached.hashedKey + '\n';
									if (root.getOptions().debug) {
										headers += 'X-Cache-Key-Debug: ' + cached.key.toString() + '\n';
									};
									if (cached.isSection) {
										headers += 'X-Cache-Section: True\n';
										headers += 'X-Cache-Parent: ' + cached.parent.hashedKey + '\n';
									};
									if (cached.expiration) {
										headers += 'X-Cache-Expiration: ' + http.toRFC1123Date(cached.expiration) + '\n'; // ex.:   Fri, 10 Jul 2015 03:16:55 GMT
									};
									if (encoding) {
										headers += 'X-Cache-Encoding: ' + encoding + '\n'; // ex.: 'utf-8'
									};
									if (cached.isMain) {
										// TODO: Trailers ("X-Cache-Trailer-XXX" ?)
										if (!request.response.headersSent) {
											request.response.sendHeaders();
										};
										const status = request.response.status || 200;
										headers += 'X-Cache-File: ' + request.verb + ' ' + request.url.toApiString() + '\n';
										headers += 'X-Cache-Status: ' + types.toString(status) + ' ' + (request.response.message || nodeHttp.STATUS_CODES[status] || '') + '\n';
										tools.forEach(request.response.getHeaders(), function(value, name) {
											headers += (name + ': ' + value + '\n');
										});
									};

									stream.write(io.TextData.$encode(headers + '\n', 'utf-8')); // NOTE: Encodes headers like Node.js (utf-8) even if it should be 'ascii'.

									request.waitFor(stream.onEOF.promise());

									return stream;
								};

								return undefined;
							}, null, this)
							.catch(function(err) {
								cached.abort();
								throw err;
							}, this);
					})),

					__onGetStream: doodad.PROTECTED(function(ev) {
						const request = ev.handlerData[0];

						if (!types.HttpStatus.isError(request.response.status) && !types.HttpStatus.isRedirect(request.response.status)) {
							const start = function _start(output) {
								const cached = this.getCached(request, {create: true});

								if (cached && cached.isValid()) {
									return this.openFile(request, cached)
										.then(function sendCache(cacheStream) {
											if (cacheStream) {
												const promise = cacheStream.onEOF.promise();
												cacheStream.pipe(output);
												cacheStream.flush();
												return promise
													.then(function() {
														if (!request.ended) {
															return request.end();
														};
														return undefined;
													}, null, this);
											} else {
												// Cache file has been deleted or is no longer accessible. Will try to recreate the file.
												return start.call(this, output);
											};
										}, null, this);
								} else if (cached && cached.isInvalid() && (request.verb !== 'HEAD')) {
									return this.createFile(request, cached)
										.then(function(cacheStream) {
											if (cacheStream) {
												const promise = cacheStream.onEOF.promise(function onEOF() {
													cached.validate();
													// TODO: Refactor "watch" without using "options". See FileSystemPage.sendFile
													if (ev.data.options.watch) {
														files.watch(ev.data.options.watch, function() {
															cached.invalidate();
														}, {once: true});
													};
												}, this, _shared.SECRET)
													.catch(function(err) {
														cached.abort();
														throw err;
													});

												request.waitFor(promise);

												output.pipe(cacheStream);
											};
											return output;
										}, null, this);
								} else {
									return output;
								};
							};

							ev.data.stream = ev.data.stream
								.then(start, null, this);
						};
					}),

					execute: doodad.OVERRIDE(function execute(request) {
						if (!nodejsHttp.CacheHandler.$__enabled) {
							return;
						};

						const state = request.getHandlerState(this);

						if (state.disabled) {
							return;
						};

						request.response.onGetStream.attachOnce(this, this.__onGetStream, 100, [request]);
					}),
				}));


			// Request input
			nodejsHttp.REGISTER(doodad.Object.$extend(
				httpMixIns.Handler,
				{
					$TYPE_NAME: 'CompressionBodyHandler',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('CompressionBodyHandler')), true) */,

					$prepare: doodad.OVERRIDE(function $prepare(options) {
						types.getDefault(options, 'depth', Infinity);

						options = this._super(options);

						let val;

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
							val = tools.append([], val, ['identity']);
						};
						options.encodings = val;

						// TODO: Options per mime types per encoding
						// TODO: Default options
						options.optionsPerEncoding = tools.nullObject(options.optionsPerEncoding);

						return options;
					}),

					__onGetStream: doodad.PROTECTED(function __onGetStream(ev) {
						const request = ev.handlerData[0];
						const encoding = (request.getHeader('Content-Encoding') || 'identity').toLowerCase(); // case insensitive

						if (tools.indexOf(this.options.encodings, encoding) < 0) {
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
							ev.data.stream = request.response.respondWithStatus(types.HttpStatus.UnsupportedMediaType);
							return;
						};

						if (stream) {
							request.onSanitize.attachOnce(null, function () {
								types.DESTROY(stream);
							});

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

					$applyGlobalHandlerStates: doodad.OVERRIDE(function $applyGlobalHandlerStates(server) {
						this._super(server);

						server.applyGlobalHandlerState(this, {
							contentEncoding: doodad.PUBLIC(null),
						});

						server.applyGlobalHandlerState(nodejsHttp.CacheHandler, {
							generateKey: doodad.OVERRIDE(function generateKey(request, handler, keyObj, sectionName) {
								this._super(request, handler, keyObj, sectionName);

								if (!sectionName) {
									const encoding = request.response.getHeader('Content-Encoding');
									if (encoding) {
										keyObj.headers.addHeader('Content-Encoding', encoding);
									};
								};
							}),
						});
					}),

					$prepare: doodad.OVERRIDE(function $prepare(options) {
						types.getDefault(options, 'depth', Infinity);

						options = this._super(options);

						let val;

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
							val = tools.append([], val, ['identity']);
						};
						options.encodings = val;


						// TODO: Options per mime types per encoding
						// TODO: Default options
						options.optionsPerEncoding = tools.nullObject(options.optionsPerEncoding);

						return options;
					}),

					__onGetStream: doodad.PROTECTED(function __onGetStream(ev) {
						const request = ev.handlerData[0];

						const encoding = request.getHandlerState(this).contentEncoding;
						const optionsPerEncoding = this.options.optionsPerEncoding;

						let stream = null;

						const type = request.response.getHeader('Content-Type');

						if (!type || (request.getAcceptables(type, {handler: this}).length > 0)) {
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
						};

						if (stream) {
							request.onSanitize.attachOnce(null, function () {
								types.DESTROY(stream);
							});

							// NOTE: Server MUST NOT include 'identity' in the 'Content-Encoding' header

							request.response.addPipe(stream, {
								unshift: true,
								headers: {
									'Content-Encoding': encoding,
								},
							});

							request.response.onSendHeaders.attachOnce(this, function(ev) {
								request.response.clearHeaders('Content-Length');
							});
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

						return undefined;
					}),
				}));

		},
	};
	return modules;
};

//! END_MODULE()
