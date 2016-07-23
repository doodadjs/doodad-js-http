//! REPLACE_BY("// Copyright 2016 Claude Petit, licensed under Apache License version 2.0\n", true)
// dOOdad - Object-oriented programming framework
// File: Server_Http.js - Server tools
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
		DD_MODULES['Doodad.Server.Http'] = {
			version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE() */,
			namespaces: ['Interfaces', 'MixIns'],

			create: function create(root, /*optional*/_options, _shared) {
				"use strict";

				const doodad = root.Doodad,
					types = doodad.Types,
					tools = doodad.Tools,
					files = tools.Files,
					namespaces = doodad.Namespaces,	
					mime = tools.Mime,
					mixIns = doodad.MixIns,
					extenders = doodad.Extenders,
					widgets = doodad.Widgets,
					io = doodad.IO,
					server = doodad.Server,
					serverInterfaces = server.Interfaces,
					serverMixIns = server.MixIns,
					http = server.Http,
					httpInterfaces = http.Interfaces,
					httpMixIns = http.MixIns,
					
					Promise = types.getPromise();
					
				const __Internal__ = {
				};


				types.complete(_shared.Natives, {
					mathFloor: global.Math.floor,
					windowParseFloat: global.parseFloat,
					windowIsNaN: global.isNaN,
				});
				
				
				
	/* RFC 7230
		 token          = 1*tchar

		 tchar          = "!" / "#" / "$" / "%" / "&" / "'" / "*"
						/ "+" / "-" / "." / "^" / "_" / "`" / "|" / "~"
						/ DIGIT / ALPHA
						; any VCHAR, except delimiters
						
	   A string of text is parsed as a single value if it is quoted using
	   double-quote marks.

		 quoted-string  = DQUOTE *( qdtext / quoted-pair ) DQUOTE
		 qdtext         = HTAB / SP /%x21 / %x23-5B / %x5D-7E / obs-text
		 obs-text       = %x80-FF


	   The backslash octet ("\") can be used as a single-octet quoting
	   mechanism within quoted-string and comment constructs.  Recipients
	   that process the value of a quoted-string MUST handle a quoted-pair
	   as if it were replaced by the octet following the backslash.

		 quoted-pair    = "\" ( HTAB / SP / VCHAR / obs-text )
		 

		 OWS            = *( SP / HTAB )
						; optional whitespace
		 RWS            = 1*( SP / HTAB )
						; required whitespace
		 BWS            = OWS
						; "bad" whitespace
		 
	*/

	/* RFC 7231
		Accept = #( media-range [ accept-params ] )

		 media-range    = ( "* / *"
						  / ( type "/" "*" )
						  / ( type "/" subtype )
						  ) *( OWS ";" OWS parameter )
		 accept-params  = weight *( accept-ext )
		 accept-ext = OWS ";" OWS token [ "=" ( token / quoted-string ) ]

		 weight = OWS ";" OWS "q=" qvalue
		 qvalue = ( "0" [ "." 0*3DIGIT ] )
				/ ( "1" [ "." 0*3("0") ] )
	*/
				
				__Internal__.isObsText = function isObsText(chrAscii) {
					return ((chrAscii >= 0x80) && (chrAscii <= 0xFF));
				};
				
				__Internal__.getNextTokenOrString = function getNextTokenOrString(value, /*byref*/pos, /*optional*/token, /*optional byref*/delimiters) {
					const delims = delimiters && delimiters[0];
					let i = pos[0],
						quoted = false,
						str = '',
						quotePair = false,
						endOfToken = false;
					if (delimiters) {
						// No delimiter encountered
						delimiters[0] = null;
					};
					while (i < value.length) {
						const chr = value[i],
							chrAscii = chr.charCodeAt(0);
						if (quoted) {
							// QUOTED STRING
							if (chrAscii === 0x5C) {  // '\\'
								quotePair = true;
							} else if (quotePair) {
								quotePair = false;
								if (
									(chrAscii === 0x09) || // '\t'
									((chrAscii >= 0x20) && (chrAscii <= 0x7E)) ||  // US ASCII Visible Chars
									__Internal__.isObsText(chrAscii)
								) {
									str += chr;
								} else {
									// Invalid string
									str = null;
									break;
								};
							} else if (chrAscii === 0x22) {  // '"'
								quoted = false;
							} else if (
								(chrAscii === 0x09) || // '\t'
								(chrAscii === 0x20) || // ' '
								(chrAscii === 0x21) || // '!'
								((chrAscii >= 0x23) && (chrAscii <= 0x5B)) || 
								((chrAscii >= 0x5D) && (chrAscii <= 0x7E)) ||
								__Internal__.isObsText(chrAscii)
							) {
								str += chr;
							} else {
								// Invalid string
								str = null;
								break;
							};
						} else {
							// TOKEN
							if ((chrAscii === 0x09) || (chrAscii === 0x20)) { // OWS
								// Skip spaces
								if (str) {
									endOfToken = true;
								};
							} else if (chrAscii === 0x22) {  // '"'
								if (endOfToken || str || token) {
									// Invalid token
									str = null;
									break;
								} else {
									quoted = true;
								};
							} else if ((chrAscii >= 0x20) && (chrAscii <= 0x7E)) {  // US ASCII Visible Chars, excepted delimiters
								if (delims && (delims.indexOf(chr) >= 0)) {
									// Delimiter encountered. End of token.
									if (delimiters) {
										delimiters[0] = chr;
									};
									i++;
									break;
								} else if (endOfToken) {
									i--;
									break;
								} else {
									str += chr;
								};
							} else {
								// Invalid token
								str = null;
								break;
							};
						};
						i++;
					};
					if (quoted) {
						// Unterminated quoted string
						str = null;
					};
					pos[0] = i;
					return str;
				};
				
				http.parseAcceptHeader = function parseAcceptHeader(value) {
					const result = {},
						pos = [],
						delimiters = [];
					let	i = 0,
						media,
						token,
						str,
						qvalue,
						acceptExts;
						
					newMedia: while (i < value.length) {
						qvalue = 1.0;
						acceptExts = {};
							
						pos[0] = i; // by ref
						delimiters[0] = ";,"; // by ref
						media = __Internal__.getNextTokenOrString(value, pos, true, delimiters);
						i = pos[0];
						if (!media) {
							// Invalid token
							return null;
						};
						
						if (delimiters[0] !== ',') {
							newExt: while (i < value.length) {
								pos[0] = i; // by ref
								delimiters[0] = "="; // by ref
								token = __Internal__.getNextTokenOrString(value, pos, true, delimiters);
								i = pos[0];
								if (token === null) {
									// Invalid token
									return null;
								};
								if (delimiters[0] !== "=") {
									// Invalid token
									return null;
								};
								if (token === 'q') {
									pos[0] = i; // by ref
									delimiters[0] = ";,"; // by ref
									qvalue = __Internal__.getNextTokenOrString(value, pos, false, delimiters);
									i = pos[0];
									qvalue = _shared.Natives.windowParseFloat(qvalue);
									if (_shared.Natives.windowIsNaN(qvalue) || (qvalue <= 0.0) || (qvalue > 1.0)) {
										// Invalid "qvalue"
										return null;
									};
									qvalue = _shared.Natives.mathFloor(qvalue * 1000) / 1000; // 3 decimal digits
								} else {
									pos[0] = i; // by ref
									delimiters[0] = ";,"; // by ref
									str = __Internal__.getNextTokenOrString(value, pos, false, delimiters);
									i = pos[0];
									if (str === null) {
										// Invalid token or quoted string
										return null;
									};
									acceptExts[token] = str;
								};
								
								if (delimiters[0] === ',') {
									break newExt;
								};
							};
						};
						
						media = media.toLowerCase();
						token = media.split('/', 2);
						const type = token[0] || '*',
							subtype = (token.length > 1) && token[1] || '*';

						result[media] = {
							name: media,
							type: type,
							subtype: subtype,
							weight: qvalue,
							exts: acceptExts,
						};
					};
					
					return types.values(result).sort(function(media1, media2) {
						if (media1.weight > media2.weight) {
							return -1;
						} else if (media1.weight < media2.weight) {
							return 1;
						} else {
							return 0;
						};
					});
				};
				
				http.parseContentTypeHeader = function parseContentTypeHeader(contentType) {
					if (!contentType) {
						return null;
					};
					
					const pos = [];
					let delimiters = [];
					
					pos[0] = 0; // byref
					delimiters = [';']; // byref
					let media = __Internal__.getNextTokenOrString(contentType, pos, true, delimiters);
					if (!media) {
						// Invalid token
						return null;
					};
					
					media = media.toLowerCase();
					let tmp = media.split('/', 2);
					const type = tmp[0],
						subtype = tmp[1];
					if (!type || !subtype) {
						// Invalid media
						return null;
					};						
					
					const params = {};
					if (delimiters[0] === ';') {
						while (pos[0] < contentType.length) {
							delimiters = ['=']; // byref
							let name = __Internal__.getNextTokenOrString(contentType, pos, true, delimiters);
							if (!name) {
								// Invalid token
								return null;
							};
							name = name.toLowerCase();
							
							delimiters = [';']; // byref
							let value = __Internal__.getNextTokenOrString(contentType, pos, false, delimiters);
							
							params[name] = value || '';
						};
					};
					
					return {
						name: media,
						type: type,
						subtype: subtype,
						params: params,
					};
				};

				
				http.REGISTER(doodad.BASE(doodad.Object.$extend(
									serverMixIns.Request,
				{
					$TYPE_NAME: 'Request',
					
					onStatus: doodad.EVENT(false),
					onSendHeaders: doodad.EVENT(false),
					
					route: doodad.PUBLIC(doodad.READ_ONLY(null)),
					verb: doodad.PUBLIC(doodad.READ_ONLY(null)),
					url: doodad.PUBLIC(doodad.READ_ONLY(null)),
					requestHeaders: doodad.PUBLIC(doodad.READ_ONLY(null)),
					
					startBodyTransfer: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/options)
					
					requestStream: doodad.PROTECTED(null),
					responseStream: doodad.PROTECTED(null),
					
					getRequestStream: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/options)
					getResponseStream: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/options)
					
					responseStatus: doodad.PUBLIC(doodad.READ_ONLY(null)),
					responseMessage: doodad.PUBLIC(doodad.READ_ONLY(null)),
					responseHeaders: doodad.PROTECTED(null),
					responseTrailers: doodad.PROTECTED(null),

					proceed: doodad.PUBLIC(doodad.ASYNC(doodad.MUST_OVERRIDE())), // function(handler)

					addHeaders: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(headers)
					addTrailers: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(trailers)
					clearHeaders: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/names)
					
					sendHeaders: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function()
					sendTrailers: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function()
					
					clear: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function clear()
					respondWithStatus: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function respondWithStatus(/*optional*/status, /*optional*/message, /*optional*/headers, /*optional*/data)
					close: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function close()
					
					redirectClient: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function redirectClient(url, /*optional*/isPermanent)
					redirectServer: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function redirectServer(url)
					//reject: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function reject()

					hasRequestStream: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function hasRequestStream()
					hasResponseStream: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function hasResponseStream()
					isFullfilled: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function isFullfilled()

					getRequestHeader: doodad.PUBLIC(function getRequestHeader(name) {
						var fixed = tools.title(name, '-');
						return this.requestHeaders[fixed];
					}),
					
					getRequestHeaders: doodad.PUBLIC(function getRequestHeaders(names) {
						if (!types.isArray(names)) {
							names = [names];
						};
						const headers = {};
						tools.forEach(names, function(name) {
							const fixed = tools.title(name, '-');
							headers[name] = this.requestHeaders[fixed];
							if (name !== fixed) {
								headers[fixed] = this.requestHeaders[fixed];
							};
						});
						return headers;
					}),
					
					getResponseHeader: doodad.PUBLIC(function getResponseHeader(name) {
						var fixed = tools.title(name, '-');
						return this.responseHeaders[fixed];
					}),
					
					getResponseHeaders: doodad.PUBLIC(function getResponseHeaders(names) {
						if (!types.isArray(names)) {
							names = [names];
						};
						const headers = {};
						tools.forEach(names, function(name) {
							const fixed = tools.title(name, '-');
							headers[name] = this.responseHeaders[fixed];
							if (name !== fixed) {
								headers[fixed] = this.responseHeaders[fixed];
							};
						});
						return headers;
					}),
					
					parseAccept: doodad.PUBLIC(function parseAccept(mimeTypes, /*optional*/options) {
						let accept = this.getRequestHeader('Accept');
						if (accept) {
							accept = http.parseAcceptHeader(accept);
						};
						
						let acceptedTypes = [];
						
						for (let i = 0; i < mimeTypes.length; i++) {
							let type = mimeTypes[i].split('/', 2);
							const subtype = type[1];
							type = type[0];
							
							let ok = false,
								weight = 1.0;
								
							if (accept) {
								for (let j = 0; j < accept.length; j++) {
									const entry = accept[j];
									if ((entry.type === '*') || (entry.type === type)) {
										if ((entry.subtype === '*') || (entry.subtype === subtype)) {
											ok = true;
											weight = entry.weight;
											break;
										};
									};
								};
							} else {
								ok = true;
							};
							
							if (ok) {
								acceptedTypes.push({
									name: type + (subtype ? '/' + subtype : ''),
									type: type,
									subtype: subtype,
									weight: weight,
								});
							};
						};
						
						acceptedTypes = acceptedTypes.sort(function(type1, type2) {
							if (type1.weight > type2.weight) {
								return -1;
							} else if (type1.weight < type2.weight) {
								return 1;
							} else {
								return 0;
							};
						});
						
						if (!acceptedTypes.length && !types.get(options, 'dontThrow', false)) {
							throw new types.HttpError(types.HttpStatus.NotAcceptable, "Content refused by the client.");
						};
						
						return acceptedTypes;
					}),
					
					create: doodad.OVERRIDE(function create(server, verb, url, headers) {
						if (types.isString(url)) {
							url = files.Url.parse(url);
						};
					
						if (root.DD_ASSERT) {
							root.DD_ASSERT && root.DD_ASSERT(types._implements(server, httpInterfaces.Server), "Invalid server.");
							root.DD_ASSERT(types.isString(verb), "Invalid verb.");
							root.DD_ASSERT((url instanceof files.Url), "Invalid URL.");
							root.DD_ASSERT(types.isObject(headers), "Invalid headers.");
						};

						this._super();
						
						const fixedHeaders = {};
						tools.forEach(headers, function(value, name) {
							const fixed = tools.title(name, '-');
							fixedHeaders[fixed] = value;
						});
						
						_shared.setAttributes(this, {
							server: server,
							verb: verb.toUpperCase(),
							url: url,
							requestHeaders: fixedHeaders,
							responseHeaders: {},
							responseTrailers: {},
						});
					}),
				})));
				
				httpInterfaces.REGISTER(doodad.INTERFACE(serverInterfaces.Server.$extend(
				{
					$TYPE_NAME: 'Server',

					protocol: doodad.PUBLIC(doodad.READ_ONLY()),
					routes: doodad.PUBLIC(doodad.READ_ONLY()),
					options:  doodad.PUBLIC(doodad.READ_ONLY()),
				})));
				
				httpMixIns.REGISTER(doodad.MIX_IN(doodad.Class.$extend(
									serverInterfaces.Response,
				{
					$TYPE_NAME: 'Handler',

					$prepare: doodad.PUBLIC(function $prepare(options) {
						let val, newVal;
						
						val = types.get(options, 'depth');
						options.depth = types.toInteger(val) || 0;

						val = types.get(options, 'mimeTypes');
						newVal = null;
						if (!types.isNothing(val)) {
							if (!types.isArray(val)) {
								val = [val];
							};
							newVal = tools.map(val, function(typ) {
								return types.toString(typ).toLowerCase();
							});
						};
						options.mimeTypes = newVal;
						
						val = types.get(options, 'extensions');
						newVal = null;
						if (!types.isNothing(val)) {
							if (!types.isArray(val)) {
								val = [val];
							};
							newVal = tools.map(val, function(ext) {
								return types.toString(ext).toLowerCase();
							});
						};
						options.extensions = newVal;
						
						val = types.get(options, 'verbs');
						newVal = null;
						if (!types.isNothing(val)) {
							if (!types.isArray(val)) {
								val = [val];
							};
							newVal = tools.map(val, function(verb) {
								return types.toString(verb).toUpperCase();
							});
						};
						options.verbs = newVal;
						
						val = types.get(options, 'caseSensitive', false);
						options.caseSensitive = types.toBoolean(val);
					}),
				})));
				
				
				httpMixIns.REGISTER(doodad.MIX_IN(httpMixIns.Handler.$extend(
				{
					$TYPE_NAME: 'Routes',
					
					createHandler: doodad.PUBLIC(doodad.RETURNS(function(val) {return types.isNothing(val) || types.isFunction(val) || types._implements(val, httpMixIns.Handler)})), // function(request)
				})));
				
				
				httpMixIns.REGISTER(doodad.MIX_IN(httpMixIns.Handler.$extend(
				{
					$TYPE_NAME: 'Page',
					
					__knownVerbs: doodad.PROTECTED(doodad.ATTRIBUTE(['HEAD', 'GET', 'POST', 'PUT', 'DELETE', 'TRACE', 'CONNECT', 'OPTIONS'], extenders.UniqueArray)),

					__allowedVerbs: doodad.PROTECTED(doodad.READ_ONLY(null)),
					
					execute_HEAD: doodad.PROTECTED(doodad.ASYNC(doodad.NOT_IMPLEMENTED())), // function(request)
					execute_GET: doodad.PROTECTED(doodad.ASYNC(doodad.NOT_IMPLEMENTED())), // function(request)
					execute_POST: doodad.PROTECTED(doodad.ASYNC(doodad.NOT_IMPLEMENTED())), // function(request)
					execute_PUT: doodad.PROTECTED(doodad.ASYNC(doodad.NOT_IMPLEMENTED())), // function(request)
					execute_DELETE: doodad.PROTECTED(doodad.ASYNC(doodad.NOT_IMPLEMENTED())), // function(request)
					execute_TRACE: doodad.PROTECTED(doodad.ASYNC(doodad.NOT_IMPLEMENTED())), // function(request)
					execute_CONNECT: doodad.PROTECTED(doodad.ASYNC(doodad.NOT_IMPLEMENTED())), // function(request)
					
					execute_OPTIONS: doodad.PROTECTED(doodad.ASYNC(function(request) {
						let allowed = this.__allowedVerbs;
						if (!allowed) {
							allowed = tools.filter(this.__knownVerbs, this.isAllowed, this);
							_shared.setAttribute(this, '__allowedVerbs', allowed);
						};
						request.addHeaders({Allow: allowed.join(',')});
					})),

					execute: doodad.OVERRIDE(function execute(request) {
						const method = 'execute_' + request.verb;
						if (types.isImplemented(this, method)) {
							return this[method](request);
						} else {
							request.respondWithStatus(types.HttpStatus.NotImplemented);
						};
					}),

					isAllowed: doodad.PUBLIC(function(verb) {
						return types.isImplemented(this, 'execute_' + verb.toUpperCase());
					}),
				})));
				
				
				http.REGISTER(doodad.Object.$extend(
									httpMixIns.Page,
				{
					$TYPE_NAME: 'NullPage',
				}));

				http.REGISTER(doodad.Object.$extend(
									httpMixIns.Page,
				{
					$TYPE_NAME: 'StatusPage',
					
					$prepare: doodad.OVERRIDE(function $prepare(options) {
						this._super(options);
						
						var val;
						
						val = types.get(options, 'status');
						val = types.toInteger(val);
						if (types.isNaN(val)) {
							val = types.HttpStatus.InternalError;
						};
						options.status = val;
					}),
					
					execute_HEAD: doodad.OVERRIDE(function execute_HEAD(request) {
						request.respondWithStatus(request.route.status);
					}),
					execute_GET: doodad.OVERRIDE(function execute_GET(request) {
						request.respondWithStatus(request.route.status);
					}),
				}));

				http.REGISTER(doodad.BASE(doodad.Object.$extend(
									httpMixIns.Page,
				{
					$TYPE_NAME: 'StaticPage',

					execute_HEAD: doodad.OVERRIDE(doodad.MUST_OVERRIDE()),
					execute_GET: doodad.OVERRIDE(doodad.MUST_OVERRIDE()),
				})));

				/* TODO: Terminate and Test
				http.REGISTER(doodad.BASE(widgets.Widget.$extend(
									httpMixIns.Page,
				{
					$TYPE_NAME: 'WidgetPage',
					
					execute_GET: doodad.OVERRIDE(function(request) {
						const result = this.show(request);
						if (result !== false) {
							const stream = request.getResponseStream();
							request.writeHeader();
							this.render(stream);
							request.writeFooter();
						};
					}),
					execute_POST: doodad.OVERRIDE(function(request) {
						const result = this.load(request);
						if (result !== false) {
							const stream = request.getResponseStream();
							request.writeHeader();
							this.render(stream);
							request.writeFooter();
						};
					}),
					
					show: doodad.PROTECTED(doodad.MUST_OVERRIDE()), // function(request)
					load: doodad.PROTECTED(doodad.MUST_OVERRIDE()), // function(request)
				})));
				*/
				
				http.REGISTER(doodad.Object.$extend(
									httpMixIns.Handler,
				{
					$TYPE_NAME: 'RedirectHandler',
					
					$prepare: doodad.OVERRIDE(function $prepare(options) {
						this._super(options);
						
						let val;
						
						val = types.get(options, 'targetUrl');
						if (!types.isNothing(val)) {
							if (types.isString(val)) {
								val = files.Url.parse(val);
							};
						};
						options.targetUrl = val;
						
						val = types.get(options, 'internal', false);
						options.internal = types.toBoolean(val);
						
						val = types.get(options, 'permanent', false);
						options.permanent = types.toBoolean(val);
					}),
					
					execute: doodad.OVERRIDE(function(request) {
						const url = request.route.url.combine(request.route.targetUrl);
						if (request.route.internal) {
							request.redirectServer(url);
						} else {
							request.redirectClient(url, request.route.permanent);
						};
					}),
				}));


				http.REGISTER(doodad.Object.$extend(
									httpMixIns.Handler,
				{
					$TYPE_NAME: 'CrossOriginHandler',
					
					$prepare: doodad.OVERRIDE(function(options) {
						this._super(options);
						
						let val, newVal;
						
						val = types.get(options, 'allowedOrigins');
						newVal = null;
						if (!types.isNothing(val)) {
							if (!types.isArray(val)) {
								val = [val];
							};
							newVal = tools.map(val, tools.toString);
						};
						options.allowedOrigins = newVal || [];
						
						val = types.get(options, 'allowedHeaders');
						if (!types.isNothing(val)) {
							if (!types.isArray(val)) {
								val = [val];
							};
							newVal = tools.map(val, tools.toString);
						};
						options.allowedHeaders = newVal || [];
						
						val = types.get(options, 'exposedHeaders');
						if (!types.isNothing(val)) {
							if (!types.isArray(val)) {
								val = [val];
							};
							newVal = tools.map(val, tools.toString);
						};
						options.exposedHeaders = newVal || [];
						
						val = types.get(options, 'allowCredentials', false);
						options.allowCredentials = types.toBoolean(val);
						
						val = types.get(options, 'maxAge');
						options.maxAge = (types.isNothing(val) ? null : types.toInteger(val) || null);
					}),

					execute_OPTIONS: doodad.PROTECTED(doodad.ASYNC(function execute_OPTIONS(request) {
						const cors = request.getRequestHeader('Origin');
						if (cors) {
							// Preflight CORS
							
							const allowedOrigins = request.route.allowedOrigins;
							if (allowedOrigins.length && (tools.indexOf(allowedOrigins, cors) < 0))
								{ // Case sensitive
								// Invalid origin
								request.end();
							};

							const allowCredentials = request.route.allowCredentials;
							
							const wantedMethod = request.getRequestHeader('Access-Control-Request-Method');
							if (!wantedMethod) {
								// No method
								request.end();
							};
							
							const allowedMethods = request.route.verbs || ['HEAD', 'GET', 'POST'];
							if (tools.indexOf(allowedMethods, wantedMethod) < 0) { // Case sensitive
								// Invalid method
								request.end();
							};
							
							let wantedHeaders = request.getRequestHeader('Access-Control-Request-Headers');
							const allowedHeaders = request.route.allowedHeaders;
							if (wantedHeaders) {
								wantedHeaders = wantedHeaders.split(',').map(function(val) {
										return val.trim().toLowerCase();
									});
								const allowedHeadersLC = allowedHeaders.map(function(val) {
										return val.toLowerCase();
									});
								if (!tools.every(wantedHeaders, function(val) {
											return (tools.indexOf(allowedHeadersLC, val) >= 0)  // Case insensitive
										})) {
									// Invalid header
									request.end();
								};
							};
							
							request.addHeaders({
								'Access-Control-Max-Age': (types.isNothing(request.route.maxAge) ? '' : types.toString(request.route.maxAge)),
								'Access-Control-Allow-Origin': (allowCredentials || allowedOrigins.length ? cors : '*'),
								'Access-Control-Allow-Credentials': (allowCredentials ? 'true' : 'false'),
								'Access-Control-Allow-Methods': allowedMethods.join(', '),
								'Access-Control-Allow-Headers': allowedHeaders.join(', '),
							});
						};
					})),
					
					execute: doodad.OVERRIDE(function execute(request) {
						const method = 'execute_' + request.verb;
						if (types.isImplemented(this, method)) {
							return this[method](request);
							
						} else {
							const cors = request.getRequestHeader('Origin');
							if (cors) {
								const allowedOrigins = request.route.allowedOrigins;
								if (allowedOrigins.length && (tools.indexOf(allowedOrigins, cors) < 0)) { // Case sensitive
									// Invalid origin
									request.end();
								};
								
								const allowedMethods = request.route.verbs || ['HEAD', 'GET', 'POST'];
								if (tools.indexOf(allowedMethods, request.verb) < 0) { // Case sensitive
									// Invalid method
									request.end();
								};
								
								const allowCredentials = request.route.allowCredentials;
								
								const exposedHeaders = request.route.exposedHeaders;
								
								request.addHeaders({
									'Access-Control-Allow-Origin': (allowCredentials || allowedOrigins.length ? cors : '*'),
									'Access-Control-Allow-Credentials': (allowCredentials ? 'true' : 'false'),
									'Access-Control-Expose-Headers': exposedHeaders.join(', '),
								});
							};
						};
					}),
				}));


				http.REGISTER(doodad.Object.$extend(
									httpMixIns.Handler,
				{
					$TYPE_NAME: 'UpgradeInsecureRequestsHandler',
					
					$prepare: doodad.OVERRIDE(function(options) {
						this._super(options);

						var val;
						
						val = types.get(options, 'sslPort');
						options.sslPort = (types.toInteger(val) || 443);

						val = types.get(options, 'sslDomain');
						options.sslDomain = (types.isNothing(val) ? null : types.toString(val));

						val = types.get(options, 'hstsSafe', false);
						options.hstsSafe = types.toBoolean(val);

						val = types.get(options, 'hstsMaxAge');
						options.hstsMaxAge = (types.toInteger(val) || 10886400);
					}),

					execute: doodad.OVERRIDE(function execute(request) {
						const uirs = request.getRequestHeader('Upgrade-Insecure-Requests');

						if (request.route.hstsSafe) {
							request.addHeaders({
								'Strict-Transport-Security': 'max-age=' + types.toString(request.route.hstsMaxAge) + '; preload',
								'Content-Security-Policy': 'block-all-mixed-content;',
							});
						} else {
							request.addHeaders({
								'Content-Security-Policy': 'upgrade-insecure-requests;',
							});
						};
						
						if (uirs === '1') {
							request.addHeaders({
								'Vary': 'Upgrade-Insecure-Requests',
							});
							
							if (!request.route.hstsSafe) {
								request.addHeaders({
									'Strict-Transport-Security': 'max-age=' + types.toString(request.route.hstsMaxAge),
								});
							};
						};
						
						if (request.route.hstsSafe || (uirs === '1')) {
							if ((request.url.protocol !== 'https') && (request.url.domain || request.route.sslDomain)) {
								const opts = {protocol: 'https', port: request.route.sslPort};
								if (request.route.sslDomain) {
									opts.domain = request.route.sslDomain;
								};
								const url = request.url.set(opts);
								request.redirectClient(url);
							};
						};
					}),
				}));


				http.REGISTER(doodad.BASE(doodad.Object.$extend(
									httpInterfaces.Server,
				{
					$TYPE_NAME: 'Server',

					create: doodad.OVERRIDE(function create(routes, /*optional*/options) {
						root.DD_ASSERT && root.DD_ASSERT(types._implements(routes, httpMixIns.Routes), "Invalid page factory.");
						
						this._super();
						
						_shared.setAttributes(this, {
							routes: routes, 
							options: options,
						});
					}),
				})));


				http.REGISTER(doodad.BASE(doodad.Object.$extend(
				{
					$TYPE_NAME: 'RequestMatcher',
					
					match: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(request, route)
				})));
				
				
				http.REGISTER(http.RequestMatcher.$extend(
				{
					$TYPE_NAME: 'UrlMatcher',
					
					baseUrl: doodad.PUBLIC( null ),
					
					create: doodad.OVERRIDE(function create(baseUrl) {
						this._super();
						if (types.isString(baseUrl)) {
							baseUrl = files.Url.parse(baseUrl);
						};
						root.DD_ASSERT && root.DD_ASSERT((baseUrl instanceof files.Url), "Invalid url.");
						this.baseUrl = baseUrl;
					}),
					
					match: doodad.OVERRIDE(function match(request, route) {
						// TODO: Query string matching and extraction in "request.data.query" : ex. "/invoice/edit?id&details=1" will match "/invoice$edit?id=194&details=1"
						// TODO: Url arguments matching and extraction in "request.data.args" : ex. "/invoice/id:/edit" will match "/invoice/194/edit"
						// TODO: RegExp between parentheses in patterns : ex. "/invoice$edit?id=(\\d+)&details=1"   ,   "/invoice/id:(\\d+)/edit", ...
						
						this._super(request, route);
						
						const requestUrl = (route.parent ? route.parent.matcherResult.urlRemaining : request.url);
						const urlPath = tools.trim(requestUrl.toArray(), '');
						const urlPathLen = urlPath.length;

						const basePath = tools.trim(this.baseUrl.toArray(), '');
						const basePathLen = basePath.length;

						let weight = 0,    // weight
							full = false,  // full match
							url = null,    // matching URL
							urlRemaining = null; // what remains from request's url

						if (basePathLen <= urlPathLen) {
							let urlLevel = 0,     // path level (used later to remove the beginning of the path)
								starStar = false,
								starStarWeight = 0,
								i = 0;
							
							const maxDepth = route.depth;
						
							while (urlLevel < urlPathLen) {
								let name1 = (i < basePathLen ? basePath[i] : null),
									name2 = urlPath[urlLevel];
								if (!route.caseSensitive) {
									name1 = name1 && name1.toUpperCase();
									name2 = name2 && name2.toUpperCase();
								};
								if (name1 === '**') {
									starStar = true;
									starStarWeight = 0;
									i++;
								} else {
									if (starStar) {
										if (name1 === name2) {
											i++;
											starStar = false;
											weight += starStarWeight + 1;
										} else {
											starStarWeight++;
										};
									} else {
										if ((name1 !== '*') && (name1 !== name2)) {
											break;
										};
										i++;
										weight++;
									};
									urlLevel++;
								};
							};
							
							if ((i >= basePathLen) && (urlPathLen - urlLevel <= maxDepth)) {
								full = (urlPathLen >= weight);
							} else {
								weight = 0;
							};
							
							url = files.Url.parse(urlPath.slice(0, urlLevel));
							
							urlRemaining = files.Url.parse(urlPath.slice(urlLevel), {
								isRelative: true,
							});
						};

						return {
							weight: weight,
							full: full,
							url: url,
							urlRemaining: urlRemaining,
						};
					}),
					
					toString: doodad.OVERRIDE(function toString() {
						if (types.isType(this)) {
							return this._super();
						} else {
							this.overrideSuper();
							return this.baseUrl.toString();
						};
					}),
				}));
				
				http.REGISTER(doodad.Object.$extend(
									httpMixIns.Routes,
				{
					$TYPE_NAME: 'Routes',

					routes: doodad.PUBLIC(doodad.READ_ONLY(null)),
					options: doodad.PUBLIC(doodad.READ_ONLY(null)),
	
					$prepare: doodad.OVERRIDE(function $prepare(options) {
						types.getDefault(options, 'depth', Infinity);

						this._super(options);
					}),
	
					create: doodad.OVERRIDE(function create(routes, /*optional*/options) {
						this._super();
						
						_shared.setAttributes(this, {
							options: options
						});

						this.addRoutes(routes);
					}),
					
					addRoutes: doodad.PUBLIC(function addRoutes(routes) {
						root.DD_ASSERT && root.DD_ASSERT((routes instanceof types.Map) || types.isObject(routes), "Invalid routes.");

						const parsedRoutes = (this.routes || new types.Map());
						
						tools.forEach(routes, function(route, matcher) {
							root.DD_ASSERT && root.DD_ASSERT(types.isObject(route), "Invalid route.");
							
							if (types.isString(matcher)) {
								matcher = new http.UrlMatcher(matcher);
							};
							root.DD_ASSERT && root.DD_ASSERT((matcher instanceof http.RequestMatcher), "Invalid request matcher.");
							
							route = types.extend({}, route);
							route.matcher = matcher;
							
							let handlers = types.get(route, 'handlers', []);
							delete route.handlers;
							if (!types.isArray(handlers)) {
								handlers = [handlers];
							};
							
							const newHandlers = [];
							tools.forEach(handlers, function(handlerOpts) {
								handlerOpts = types.extend({}, handlerOpts);
								
								types.complete(handlerOpts, route);
								
								let handler = types.get(handlerOpts, 'handler');
								if (types.isString(handler)) {
									handlerOpts.handler = handler = namespaces.get(handler);
								};
								
								if (types.isJsFunction(handler)) {
									httpMixIns.Handler.$prepare(handlerOpts);
								} else if (types._implements(handler, httpMixIns.Handler)) {
									types.getType(handler).$prepare(handlerOpts);
								} else {
									throw new types.TypeError("Invalid handler type '~0~' in Url matcher '~1~'.", [types.getTypeName(handler), matcher.toString()]);
								};
								
								newHandlers.push(handlerOpts);
							});
							
							if (newHandlers.length) {
								route.handlers = newHandlers;
								parsedRoutes.set(matcher, route);
							};
						});

						_shared.setAttributes(this, {
							routes: parsedRoutes,
						});
					}),
					
					createHandler: doodad.OVERRIDE(function createHandler(request) {
						let routes = tools.reduce(this.routes, function(routes, route) {
							const handlers = route.handlers;
							for (let i = 0; i < handlers.length; i++) {
								let handler = handlers[i];
								
								if (handler.verbs && (tools.indexOf(handler.verbs, request.verb) === -1)) {
									continue;
								};
								
								if (handler.extensions && !types.isNothing(request.url.extension)) {
									if (tools.indexOf(handler.extensions, request.url.extension) === -1) {
										continue;
									};
								};
								
								handler = types.extend({}, handler);
								handler.parent = request.route;
								handler.mimeTypes = handler.mimeTypes && request.parseAccept(handler.mimeTypes, {dontThrow: true});
								handler.mimeWeight = tools.reduce(handler.mimeTypes, function(result, mimeType) {
									if (mimeType.weight > result) {
										return mimeType.weight;
									} else {
										return result;
									};
								}, 0.0);

								handler.matcherResult = handler.matcher.match(request, handler);
								if ((handler.matcherResult.weight > 0) || handler.matcherResult.full) {
									handler.url = (handler.parent ? handler.parent.url.combine(handler.matcherResult.url, {isRelative: true}) : handler.matcherResult.url);
									routes.push(handler);
								};
							};
							
							return routes;
						}, []);

						// NOTE: Sort descending
						routes = routes.sort(function(route1, route2) {
							if (route1.matcherResult.full && !route2.matcherResult.full) {
								return -1;
							} else if (!route1.matcherResult.full && route2.matcherResult.full) {
								return 1;
							} else if (route1.matcherResult.weight > route2.matcherResult.weight) {
								return -1;
							} else if (route1.matcherResult.weight < route2.matcherResult.weight) {
								return 1;
							} else if (route1.mimeWeight > route2.mimeWeight) {
								return -1;
							} else if (route1.mimeWeight < route2.mimeWeight) {
								return 1;
							} else {
								return 0;
							};
						});

						const self = this;
						
						const __getSibling = function __getSibling(index) {
							if ((index < 0) || (index >= routes.length)) {
								return null;
							};
							
							let route = routes[index];

							route.index = index;
							
							route.previousSibling = function previousSibling() {
								if (this.noSibling || types.get(self.options, 'noSibling', false)) {
									return null;
								};
								return __getSibling(this.index - 1);
							};
							
							route.nextSibling = function nextSibling() {
								if (this.noSibling || types.get(self.options, 'noSibling', false)) {
									return null;
								};
								return __getSibling(this.index + 1);
							};
							
							route.getSibling = function getSibling(index) {
								if (this.noSibling || types.get(self.options, 'noSibling', false)) {
									return null;
								};
								return __getSibling(index);
							};
							
							_shared.setAttribute(request, 'route', route)

							let handler = route.handler;
							if (types.isType(handler)) {
								handler = handler.$createInstance();
							};
							
							return handler;
						};
						
						return __getSibling(0);
					}),
					
					execute: doodad.OVERRIDE(function(request) {
						const handler = this.createHandler(request);
						if (handler) {
							return request.proceed(handler)
								.nodeify(function requestCleanup(err, result) {
									if (request.route.handler !== handler) {
										if (types._implements(handler, mixIns.Creatable) && !handler.isDestroyed()) {
											handler.destroy();
										};
									};
									if (err) {
										throw err;
									};
									return result;
								});
						};
					}),
				}));
				
				http.ProceedNewHandler = types.createErrorType("ProceedNewHandler", types.ScriptInterruptedError, function _new(handler, /*optional*/message, /*optional*/params) {
					this.handler = handler;
					return types.ScriptInterruptedError.call(this, message || "Will proceed with a new Handler object.", params);
				});
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