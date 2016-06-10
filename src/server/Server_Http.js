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

			create: function create(root, /*optional*/_options) {
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
					httpMixIns = http.MixIns;
					
					
				const __Internal__ = {
				};


				const __Natives__ = {
					mathFloor: global.Math.floor,
					windowParseFloat: global.parseFloat,
					windowIsNaN: global.isNaN,
				};
				
				
				
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
									qvalue = __Natives__.windowParseFloat(qvalue);
									if (__Natives__.windowIsNaN(qvalue) || (qvalue <= 0.0) || (qvalue > 1.0)) {
										// Invalid "qvalue"
										return null;
									};
									qvalue = __Natives__.mathFloor(qvalue * 1000) / 1000; // 3 decimal digits
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
				
				http.REGISTER(doodad.BASE(doodad.Object.$extend(
									serverMixIns.Request,
				{
					$TYPE_NAME: 'Request',
					
					onStatus: doodad.EVENT(false),
					onSendHeaders: doodad.EVENT(false),
					
					route: doodad.PUBLIC(doodad.READ_ONLY(null)),
					verb: doodad.PUBLIC(doodad.READ_ONLY(null)),
					url: doodad.PUBLIC(doodad.READ_ONLY(null)),
					//fileMimeTypes: doodad.PUBLIC(doodad.READ_ONLY(null)),
					requestHeaders: doodad.PUBLIC(doodad.READ_ONLY(null)),
					
					startBodyTransfer: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/options)
					
					__requestStream: doodad.PROTECTED(null),
					__responseStream: doodad.PROTECTED(null),
					
					getRequestStream: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/options)
					getResponseStream: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(/*optional*/options)
					
					responseStatus: doodad.PUBLIC(doodad.READ_ONLY(null)),
					responseMessage: doodad.PUBLIC(doodad.READ_ONLY(null)),
					responseHeaders: doodad.PUBLIC(doodad.READ_ONLY(null)),
					responseTrailers: doodad.PUBLIC(doodad.READ_ONLY(null)),

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
					reject: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function reject()

					parseAccept: doodad.PUBLIC(function parseAccept(mimeTypes) {
						let accept = this.requestHeaders['accept'];
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
						
						return acceptedTypes;
					}),
					
					create: doodad.OVERRIDE(function create(server, verb, url, headers) {
						if (types.isString(url)) {
							url = files.Url.parse(url);
						};
					
						if (root.DD_ASSERT) {
							root.DD_ASSERT && root.DD_ASSERT(types._implements(server, http.Server), "Invalid server.");
							root.DD_ASSERT(types.isString(verb), "Invalid verb.");
							root.DD_ASSERT((url instanceof files.Url), "Invalid URL.");
							root.DD_ASSERT(types.isObject(headers), "Invalid headers.");
						};
						
						types.setAttributes(this, {
							server: server,
							verb: verb.toUpperCase(),
							url: url,
							requestHeaders: headers,
							data: {},
							responseHeaders: {},
							responseTrailers: {},
						});
						
						//const requestFile = url.file;
						
						/*
						let fileMimeTypes = null;
							
						if (requestFile) {
							fileMimeTypes = mime.getTypes(requestFile);
						} else {
							// NOTE: Seems there is no offical mime type for representing a folder, but "inode/directory" is used by some systems.
							fileMimeTypes = ['inode/directory'];
						};

						types.setAttributes(this, {
							fileMimeTypes: fileMimeTypes,
						});
						*/
					}),
				})));
				
				httpInterfaces.REGISTER(doodad.INTERFACE(serverInterfaces.Server.$extend(
				{
					$TYPE_NAME: 'Server',

					protocol: doodad.PUBLIC(doodad.READ_ONLY()),
					pageFactory: doodad.PUBLIC(doodad.READ_ONLY()),
					bodyFactory: doodad.PUBLIC(doodad.READ_ONLY()),
					options:  doodad.PUBLIC(doodad.READ_ONLY()),
				})));
				
				httpInterfaces.REGISTER(doodad.INTERFACE(doodad.Class.$extend(
				{
					$TYPE_NAME: 'PageFactory',
					
					createResponse: doodad.PUBLIC(doodad.RETURNS(function(val) {return types._implements(val, httpInterfaces.Response)})), // function(request)
				})));
				
				httpInterfaces.REGISTER(doodad.INTERFACE(serverInterfaces.Response.$extend(
				{
					$TYPE_NAME: 'Response',

					$prepare: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(routes, route, key)

					createRequestStream: doodad.PUBLIC(doodad.NOT_IMPLEMENTED()), // function(request, /*optional*/options)
					createResponseStream: doodad.PUBLIC(doodad.NOT_IMPLEMENTED()), // function(request, /*optional*/options)
				})));
				
				
				httpMixIns.REGISTER(doodad.MIX_IN(doodad.Class.$extend(
									httpInterfaces.Response,
				{
					$TYPE_NAME: 'Page',
					
					__knownVerbs: doodad.PROTECTED(doodad.ATTRIBUTE(['HEAD', 'GET', 'POST', 'PUT', 'DELETE', 'TRACE', 'CONNECT', 'OPTIONS'], extenders.UniqueArray)),

					__allowedVerbs: doodad.PROTECTED(doodad.READ_ONLY(null)),
					
					$prepare: doodad.OVERRIDE(function(routes, route, key) {
						if (route.extensions) {
							if (!types.isArray(route.extensions)) {
								route.extensions = [route.extensions];
							};
							tools.forEach(route.extensions, function(ext, i) {
								route.extensions[i] = ext.toLowerCase();
							});
						};
						if (route.verbs) {
							if (!types.isArray(route.verbs)) {
								route.verbs = [route.verbs];
							};
							tools.forEach(route.verbs, function(verb, i) {
								route.verbs[i] = verb.toUpperCase();
							});
						};
					}),

					execute_HEAD: doodad.PROTECTED(doodad.NOT_IMPLEMENTED()), // function(request)
					execute_GET: doodad.PROTECTED(doodad.NOT_IMPLEMENTED()), // function(request)
					execute_POST: doodad.PROTECTED(doodad.NOT_IMPLEMENTED()), // function(request)
					execute_PUT: doodad.PROTECTED(doodad.NOT_IMPLEMENTED()), // function(request)
					execute_DELETE: doodad.PROTECTED(doodad.NOT_IMPLEMENTED()), // function(request)
					execute_TRACE: doodad.PROTECTED(doodad.NOT_IMPLEMENTED()), // function(request)
					execute_CONNECT: doodad.PROTECTED(doodad.NOT_IMPLEMENTED()), // function(request)
					
					execute_OPTIONS: doodad.PROTECTED(function(request) {
						let allowed = this.__allowedVerbs;
						if (!allowed) {
							allowed = tools.filter(this.__knownVerbs, this.isAllowed, this);
							types.setAttribute(this, '__allowedVerbs', allowed);
						};
						request.addHeaders({Allow: allowed.join(',')});
						request.end();
					}),

					execute: doodad.OVERRIDE(function execute(request) {
						const method = 'execute_' + request.verb;
						if (types.isImplemented(this, method)) {
							this[method](request);
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
							if (stream) {
								request.writeHeader();
								this.render(stream);
								request.writeFooter();
							};
						};
						return result;
					}),
					execute_POST: doodad.OVERRIDE(function(request) {
						const result = this.load(request);
						if (result !== false) {
							const stream = request.getResponseStream();
							if (stream) {
								request.writeHeader();
								this.render(stream);
								request.writeFooter();
							};
						};
						return result;
					}),
					
					show: doodad.PROTECTED(doodad.MUST_OVERRIDE()), // function(request)
					load: doodad.PROTECTED(doodad.MUST_OVERRIDE()), // function(request)
				})));
				*/
				
				http.REGISTER(doodad.Object.$extend(
									httpMixIns.Page,
				{
					$TYPE_NAME: 'RedirectPage',
					
					execute_GET: doodad.OVERRIDE(function(request) {
						if (request.route.internal) {
							request.redirectServer(request.route.targetUrl);
						} else {
							request.redirectClient(request.route.targetUrl, request.route.permanent);
						};
					}),
				}));


				http.REGISTER(doodad.Object.$extend(
									httpInterfaces.Response,
				{
					$TYPE_NAME: 'CrossOriginResponse',
					
					$prepare: doodad.OVERRIDE(function(routes, route, key) {
						route.allowedOrigins = route.allowedOrigins || [];
						if (!types.isArray(route.allowedOrigins)) {
							route.allowedOrigins = [route.allowedOrigins];
						};
						
						route.allowedHeaders = route.allowedHeaders || [];
						if (!types.isArray(route.allowedHeaders)) {
							route.allowedHeaders = [route.allowedHeaders];
						};
						
						route.exposedHeaders = route.exposedHeaders || [];
						if (!types.isArray(route.exposedHeaders)) {
							route.exposedHeaders = [route.exposedHeaders];
						};
						
						route.allowCredentials = types.toBoolean(route.allowCredentials);
						
						route.maxAge = (types.isNothing(route.maxAge) ? null : types.toInteger(route.maxAge) || null);
					}),

					execute_OPTIONS: doodad.PROTECTED(function execute_OPTIONS(request) {
						const cors = request.requestHeaders['origin'];
						if (cors) {
							// Preflight CORS
							
							const allowedOrigins = request.route.allowedOrigins;
							if (allowedOrigins.length && (tools.indexOf(allowedOrigins, cors) < 0))
								{ // Case sensitive
								// Invalid origin
								request.end();
							};

							const allowCredentials = request.route.allowCredentials;
							
							const wantedMethod = request.requestHeaders['access-control-request-method'];
							if (!wantedMethod) {
								// No method
								request.end();
							};
							
							const allowedMethods = request.route.verbs || ['HEAD', 'GET', 'POST'];
							if (tools.indexOf(allowedMethods, wantedMethod) < 0) { // Case sensitive
								// Invalid method
								request.end();
							};
							
							let wantedHeaders = request.requestHeaders['access-control-request-headers'];
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
								'Access-Control-Max-Age': (types.isInteger(request.route.maxAge) ? String(request.route.maxAge) : ''),
								'Access-Control-Allow-Origin': (allowCredentials || allowedOrigins.length ? cors : '*'),
								'Access-Control-Allow-Credentials': (allowCredentials ? 'true' : 'false'),
								'Access-Control-Allow-Methods': allowedMethods.join(', '),
								'Access-Control-Allow-Headers': allowedHeaders.join(', '),
							});
							
							request.end();
						};
					}),
					
					execute: doodad.OVERRIDE(function execute(request) {
						const method = 'execute_' + request.verb;
						if (types.isImplemented(this, method)) {
							this[method](request);
							
						} else {
							const cors = request.requestHeaders['origin'];
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
						
						// Execute next page
						request.reject();
					}),
				}));


				http.REGISTER(doodad.Object.$extend(
									httpInterfaces.Response,
				{
					$TYPE_NAME: 'UpgradeInsecureRequestsResponse',
					
					$prepare: doodad.OVERRIDE(function(routes, route, key) {
						route.sslPort = (types.toInteger(route.sslPort) || 443);
						route.sslDomain = (types.isNothing(route.sslDomain) ? null : types.toString(route.sslDomain));
						route.hstsSafe = types.toBoolean(route.hstsSafe);
						route.hstsMaxAge = (types.toInteger(route.hstsMaxAge) || 10886400);
					}),

					execute: doodad.OVERRIDE(function execute(request) {
						const uirs = request.requestHeaders['upgrade-insecure-requests'];

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
						
						// Execute next page
						request.reject();
					}),
				}));


				http.REGISTER(doodad.BASE(doodad.Object.$extend(
									httpInterfaces.Server,
				{
					$TYPE_NAME: 'Server',

					options:  doodad.PUBLIC(doodad.READ_ONLY()),
					
					create: doodad.OVERRIDE(function create(pageFactory, /*optional*/options) {
						root.DD_ASSERT && root.DD_ASSERT(types._implements(pageFactory, httpInterfaces.PageFactory), "Invalid page factory.");
						
						types.setAttributes(this, {
							pageFactory: pageFactory, 
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
						
						const urlPath = route.url.toArray();
						if (!urlPath[0]) {
							urlPath.shift();
						};
						const urlPathLen = urlPath.length;

						const basePath = this.baseUrl.toArray();
						if (!basePath[0]) {
							basePath.shift();
						};
						const basePathLen = basePath.length;

						let weight = 0,    // weight
							full = false,  // full match
							urlRemaining = null; // what remains from request's url

						if (basePathLen <= urlPathLen) {
							let urlLevel = 0,     // path level (used later to remove the beginning of the path)
								starStar = false,
								starStarWeight = 0,
								i = 0,
								j = 0;
							
							const maxDepth = route.depth;
						
							while (j < urlPathLen) {
								let name1 = (i < basePathLen ? basePath[i] : null),
									name2 = urlPath[j];
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
											weight += starStarWeight;
										} else {
											starStarWeight++;
										};
									} else {
										if ((name1 !== '*') && (name1 !== name2)) {
											if (i >= basePathLen) {
												weight = 0;
											};
											break;
										};
										i++;
										weight++;
									};
									j++;
									urlLevel++;
								};
							};
							
							if (urlPathLen - urlLevel <= maxDepth) {
								full = (urlLevel >= basePathLen);
							} else {
								weight = 0;
							};
							
							urlRemaining = files.Url.parse(urlPath.slice(urlLevel), {
								isRelative: true,
							});
						};

						return {
							weight: weight,
							full: full,
							url: urlRemaining,
						};
					}),
					
					toString: doodad.OVERRIDE(function toString() {
						if (types.isType(this)) {
							return this._super();
						} else {
							this.overrideSuper();
							return this.url.toString();
						};
					}),
				}));
				
				/* TODO: Terminate and Test
				http.REGISTER(http.RequestMatcher.$extend(
				{
					$TYPE_NAME: 'RegExpUrlMatcher',
					
					regex: doodad.PUBLIC( null ),
					
					create: doodad.OVERRIDE(function create(regex) {
						this._super();
						if (types.isString(regex)) {
							regex = new global.RegExp(regex);
						};
						root.DD_ASSERT && root.DD_ASSERT((regex instanceof global.RegExp), "Invalid regular expression.");
						this.regex = regex;
					}),
					
					match: doodad.OVERRIDE(function match(request, route) {
						this._super(request, route);

						const url = route.url.toString();
						route.matches = this.regex.exec(url);
						if (!route.matches) {
							return false;
						};
						const level = url.slice(0, route.matches.index).split('/').length - 1;
						let weight = -1; // -1 because first item is the whole string
						let ok = true;
						const full = tools.every(route.matches, function(match) {
							if (match) {
								if (ok) {
									weight++;
								};
								return true;
							} else {
								ok = false;
								return false;
							};
						});
						
						return {
							weight: weight,
							full: full,
							....
						};
					}),

					toString: doodad.OVERRIDE(function toString() {
						if (types.isType(this)) {
							return this._super();
						} else {
							this.overrideSuper();
							return this.regex.source;
						};
					}),
				}));
				*/
				
				http.REGISTER(doodad.Object.$extend(
									httpInterfaces.PageFactory,
				{
					$TYPE_NAME: 'PageFactory',

					urlRoutes: doodad.PUBLIC(doodad.READ_ONLY(null)),
										/*
											route = {
												// Common
												responses: [Class],
												verbs: [],
												extensions: [],
												mimeTypes: [],
												noSibling: false,
												depth: 0,
												cachePath: '',
												
												// Static Page
												path: '',
												
												// Redirect Page
												targetUrl: '',
												permanent: false,
												internal: false,

												// Status Page
												status: 0,
												
												// Runtime Attributes
												name: '',
												index: 0,
												level: 0,
												weight: 0,
												mimeWeight: 0.0,
												full: false,
												url: '',
												previousSibling: function(),
												nextSibling: function(),
											}
										*/
					options: doodad.PUBLIC(doodad.READ_ONLY(null)),
					
					create: doodad.OVERRIDE(function create(urlRoutes, /*optional*/options) {
						this._super();
						
						types.setAttributes(this, {
							options: options
						});

						this.addRoutes(urlRoutes);
					}),
					
					addRoutes: doodad.PUBLIC(function addRoutes(routes) {
						root.DD_ASSERT && root.DD_ASSERT((routes instanceof types.Map) || types.isObject(routes), "Invalid routes.");

						const parsedRoutes = (this.urlRoutes || new types.Map());
						
						tools.forEach(routes, function(maps, matcher) {
							if (matcher && maps) {
								if (types.isString(matcher)) {
									matcher = new http.UrlMatcher(matcher);
								};
								root.DD_ASSERT && root.DD_ASSERT((matcher instanceof http.RequestMatcher), "Invalid request matcher.");
								
								if (!types.isArray(maps)) {
									maps = [maps];
								};
								
								const newRoutes = [];
								
								tools.forEach(maps, function(map) {
									if (map) {
										let newRoute;
										if (types.isJsObject(map)) {
											newRoute = types.extend({}, map);
										} else {
											newRoute = {};
											newRoute.responses = map;
											newRoute.depth = Infinity;
										};
										
										newRoute.matcher = matcher;
										newRoute.depth = (types.isNothing(newRoute.depth) ? 0 : types.toInteger(newRoute.depth));

										if (!types.isArray(newRoute.responses)) {
											newRoute.responses = [newRoute.responses];
										};
										
										for (let i = 0; i < newRoute.responses.length; i++) {
											let response = newRoute.responses[i];
											
											if (types.isString(response)) {
												newRoute.responses[i] = response = namespaces.getNamespace(response);
											};
											
											if (types._implements(response, httpInterfaces.Response)) {
												types.getType(response).$prepare(routes, newRoute, matcher);
											} else if (types._implements(response, httpInterfaces.PageFactory)) {
												// ...
											} else {
												throw new types.TypeError("Invalid response type '~0~' in Url matcher '~1~'.", [types.getTypeName(response), matcher.toString()]);
											};
										};
										
										newRoutes.push(newRoute);
									};
								});
								
								parsedRoutes.set(matcher, newRoutes);
							};
						});

						types.setAttributes(this, {
							urlRoutes: parsedRoutes,
						});
					}),
					
					createResponse: doodad.OVERRIDE(function createResponse(request, /*optional*/parentRoute) {
						let routes = tools.reduce(this.urlRoutes, function(routes, maps) {
							nextRoute: for (let h = 0; h < maps.length; h++) {
								const map = maps[h];
									
								if (map.verbs && (tools.indexOf(map.verbs, request.verb) === -1)) {
									continue nextRoute;
								};
								
								if (map.extensions && !types.isNothing(request.url.extension)) {
									if (tools.indexOf(map.extensions, request.url.extension) === -1) {
										continue nextRoute;
									};
								};
								
								/*
								const typesLen = map.mimeTypes && map.mimeTypes.length || 0,
									mimeTypes = []; // accepted mime types
									
								let mimeWeight = 0.0; // mime file weight
								
								for (let j = 0; j < typesLen; j++) {
									let mimeType = map.mimeTypes[j];
									mimeType = mimeType.trim().toLowerCase().split('/', 2);
									const type = mimeType[0] || '*',
										subtype = (mimeType.length > 1) && mimeType[1] || '*';
									const pos = tools.findItem(request.fileMimeTypes, function(item) {
										return ((type === '*') || (type === item.type)) && ((subtype === '*') || (subtype === item.subtype));
									});
									if (pos === null) {
										// Not accepted by client
										continue nextRoute;
									} else {
										mimeType = request.fileMimeTypes[pos];
										mimeTypes.push(mimeType);
										if (mimeType.weight > mimeWeight) {
											mimeWeight = mimeType.weight;
										};
									};
								};
								*/

								const newRoute = types.extend({}, map);

								newRoute.url = (parentRoute ? parentRoute.matcherResult.url : request.url);
								newRoute.parent = parentRoute;
								
								/*
								newRoute.mimeTypes = mimeTypes.sort(function(type1, type2) {
									if (type1.weight > type2.weight) {
										return -1;
									} else if (type1.weight < type2.weight) {
										return 1;
									} else {
										return 0;
									};
								});
								newRoute.mimeWeight = mimeWeight;
								*/
								newRoute.mimeTypes = (map.mimeTypes && request.parseAccept(map.mimeTypes));
								newRoute.mimeWeight = tools.reduce(newRoute.mimeTypes, function(result, mimeType) {
									if (mimeType.weight > result) {
										return mimeType.weight;
									} else {
										return result;
									};
								}, 0.0);
								
								newRoute.matcherResult = map.matcher.match(request, newRoute);
								
								if ((newRoute.matcherResult.weight > 0) || newRoute.matcherResult.full) {
									routes.push(newRoute);
								};
							};
							
							return routes;
						}, []);

						// NOTE: Sort descending
						routes = routes.sort(function(map1, map2) {
							if (map1.matcherResult.full && !map2.matcherResult.full) {
								return -1;
							} else if (!map1.matcherResult.full && map2.matcherResult.full) {
								return 1;
							} else if (map1.matcherResult.weight > map2.matcherResult.weight) {
								return -1;
							} else if (map1.matcherResult.weight < map2.matcherResult.weight) {
								return 1;
							} else if (map1.mimeWeight > map2.mimeWeight) {
								return -1;
							} else if (map1.mimeWeight < map2.mimeWeight) {
								return 1;
							} else {
								return 0;
							};
						});

						const self = this;
						
						const __getSibling = function __getSibling(index, responseIndex) {
							if ((index < 0) || (index >= routes.length)) {
								return null;
							};
							const route = routes[index];
							
							if ((responseIndex < 0) || (responseIndex > route.responses.length)) {
								return null;
							};
							let response = route.responses[responseIndex];

							route.index = index;
							route.responseIndex = responseIndex;
							
							//route.previousSibling = function previousSibling() {
							//	if (this.noSibling || types.get(self.options, 'noSibling', false)) {
							//		return null;
							//	};
							//	if (this.responseIndex > 0) {
							//		return __getSibling(this.index, this.responseIndex - 1);
							//	} else {
							//		return __getSibling(this.index - 1, 0);
							//	};
							//};
							
							route.nextSibling = function nextSibling() {
								if (this.noSibling || types.get(self.options, 'noSibling', false)) {
									return null;
								};
								if (this.responseIndex < this.responses.length - 1) {
									return __getSibling(this.index, this.responseIndex + 1);
								} else {
									return __getSibling(this.index + 1, 0);
								};
							};
							
							route.getSibling = function getSibling(index, responseIndex) {
								if (this.noSibling || types.get(self.options, 'noSibling', false)) {
									return null;
								};
								return __getSibling(index, responseIndex);
							};
							
							types.setAttribute(request, 'route', route)

							if (types.isType(response)) {
								response = response.$createInstance();
							};

							if (types._implements(response, httpInterfaces.PageFactory)) {
								return response.createResponse(request, route);
							} else {
								return response;
							};
						};
						
						return __getSibling(0, 0);
					}),
				}));
				
				http.RequestRedirected = types.createErrorType("RequestRedirected", types.ScriptInterruptedError, function _new(response, /*optional*/message, /*optional*/params) {
					var ex = types.ScriptInterruptedError.call(this, message || "Request redirected.", params);
					ex.response = response;
					return ex;
				});

				http.RequestCallback = types.setPrototypeOf(function(request, obj, fn) {
					// IMPORTANT: No error should popup from a callback, excepted "ScriptAbortedError".
					if (types.isPrototypeOf(types.Callback, fn)) {
						return fn;
					};
					if (types.isString(fn) || types.isSymbol(fn)) {
						fn = obj[fn];
					};
					const insideFn = types.makeInside(obj, fn);
					let callback = function requestCallback(/*paramarray*/) {
						try {
							if (!request.isDestroyed()) {
								return insideFn.apply(obj, arguments);
							};
						} catch(ex) {
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
										if (types._instanceof(ex, server.RequestClosed)) {
											tools.callAsync(function() {
												if (!request.isDestroyed()) {
													request.destroy();
												};
											}, -1);
										} else if (types._instanceof(ex, server.EndOfRequest)) {
											request.close();
										} else if (types._instanceof(ex, http.RequestRedirected)) {
											request.proceed(ex.response);
										} else if (types._instanceof(ex, types.ScriptAbortedError)) {
											abort = true;
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
									doodad.trapException(obj, ex, attr);
								} catch(o) {
								};
								try {
									if (!request.isDestroyed()) {
										request.destroy();
									};
								} catch(o) {
								};
							};
						};
					};
					callback = types.setPrototypeOf(callback, http.RequestCallback);
					callback[types.OriginalValueSymbol] = fn;
					return callback;
				}, types.Callback);
				
				
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