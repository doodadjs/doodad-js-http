//! REPLACE_BY("// Copyright 2016 Claude Petit, licensed under Apache License version 2.0\n")
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
	if (typeof process === 'object') {
		module.exports = exports;
	};
	
	exports.add = function add(DD_MODULES) {
		DD_MODULES = (DD_MODULES || {});
		DD_MODULES['Doodad.Server.Http'] = {
			type: null,
			version: '0.2d',
			namespaces: ['Interfaces', 'MixIns'],
			dependencies: [
				{
					name: 'Doodad.Types', 
					version: '1.1r',
				},
				'Doodad.Tools', 
				'Doodad.Tools.Mime', 
				'Doodad', 
				{
					name: 'Doodad.IO',
					version: '0.2',
				}, 
				{
					name: 'Doodad.Server',
					version: '0.2',
				}, 
				'Doodad.Widgets'
			],

			create: function create(root, /*optional*/_options) {
				"use strict";

				const doodad = root.Doodad,
					types = doodad.Types,
					tools = doodad.Tools,
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
							
						pos[0] = i;
						delimiters[0] = ";,";
						media = __Internal__.getNextTokenOrString(value, pos, true, delimiters);
						i = pos[0];
						if (!media) {
							// Invalid token
							return null;
						};
						
						if (delimiters[0] !== ',') {
							newExt: while (i < value.length) {
								pos[0] = i;
								delimiters[0] = "=";
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
									pos[0] = i;
									delimiters[0] = ";,";
									qvalue = __Internal__.getNextTokenOrString(value, pos, false, delimiters);
									i = pos[0];
									qvalue = parseFloat(qvalue);
									if (isNaN(qvalue) || (qvalue <= 0.0) || (qvalue > 1.0)) {
										// Invalid "qvalue"
										return null;
									};
									qvalue = Math.floor(qvalue * 1000) / 1000; // 3 decimal digits
								} else {
									pos[0] = i;
									delimiters[0] = ";,";
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
					
					mapping: doodad.PUBLIC(doodad.READ_ONLY(null)),
					verb: doodad.PUBLIC(doodad.READ_ONLY(null)),
					url: doodad.PUBLIC(doodad.READ_ONLY(null)),
					fileExtension: doodad.PUBLIC(doodad.READ_ONLY(null)),
					fileMimeTypes: doodad.PUBLIC(doodad.READ_ONLY(null)),
					requestHeaders: doodad.PUBLIC(doodad.READ_ONLY(null)),
					
					startBodyTransfer: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function()
					
					__requestStream: doodad.PROTECTED(null),
					__responseStream: doodad.PROTECTED(null),
					
					getRequestStream: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function()
					getResponseStream: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function()
					
					responseStatus: doodad.PUBLIC(doodad.READ_ONLY(null)),
					responseMessage: doodad.PUBLIC(doodad.READ_ONLY(null)),
					responseHeaders: doodad.PUBLIC(doodad.READ_ONLY(null)),  // TODO: Property that returns a copy
					responseTrailers: doodad.PUBLIC(doodad.READ_ONLY(null)), // TODO: Property that returns a copy

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
						
						let fileMimeTypes = [];
						
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
								fileMimeTypes.push({
									name: type + (subtype ? '/' + subtype : ''),
									type: type,
									subtype: subtype,
									weight: weight,
								});
							};
						};
						
						fileMimeTypes = fileMimeTypes.sort(function(type1, type2) {
							if (type1.weight > type2.weight) {
								return -1;
							} else if (type1.weight < type2.weight) {
								return 1;
							} else {
								return 0;
							};
						});
						
						return fileMimeTypes;
					}),
					
					create: doodad.OVERRIDE(function create(server, verb, url, headers) {
						if (types.isString(url)) {
							url = tools.Url.parse(url);
						};
					
						if (root.DD_ASSERT) {
							root.DD_ASSERT && root.DD_ASSERT(types._implements(server, http.Server), "Invalid server.");
							root.DD_ASSERT(types.isString(verb), "Invalid verb.");
							root.DD_ASSERT((url instanceof tools.Url), "Invalid URL.");
							root.DD_ASSERT(types.isObject(headers), "Invalid headers.");
						};
						
						this.setAttributes({
							server: server,
							verb: verb.toLowerCase(),
							url: url,
							requestHeaders: headers,
							customData: {},
							responseHeaders: {},
							responseTrailers: {},
						});
						
						const requestFile = url.file;
						
						let fileExtension = null,
							fileMimeTypes = null;
							
						if (requestFile) {
							let pos = requestFile.lastIndexOf('.');
							if (pos >= 0) {
								fileExtension = requestFile.slice(pos + 1);
							};
							fileMimeTypes = this.parseAccept(mime.getTypes(requestFile));
						};

						this.setAttributes({
							fileExtension: fileExtension,
							fileMimeTypes: fileMimeTypes || [],
						});
					}),
				})));
				
				httpInterfaces.REGISTER(doodad.INTERFACE(serverInterfaces.Server.$extend(
				{
					$TYPE_NAME: 'Server',

					pageFactory: doodad.PUBLIC(doodad.READ_ONLY()),
					options:  doodad.PUBLIC(doodad.READ_ONLY()),
				})));
				
				httpInterfaces.REGISTER(doodad.INTERFACE(doodad.Class.$extend(
				{
					$TYPE_NAME: 'PageFactory',
					
					createPage: doodad.PUBLIC(doodad.RETURNS(function(val) {return types._implements(val, httpMixIns.Page)})), // function(request)
				})));
				
				httpMixIns.REGISTER(doodad.MIX_IN(doodad.Class.$extend(
									mixIns.Creatable,
									serverInterfaces.Response,
				{
					$TYPE_NAME: 'Page',
					
					knownVerbs: doodad.PUBLIC(doodad.ATTRIBUTE(['head', 'get', 'post', 'put', 'delete', 'trace', 'connect', 'options'], extenders.UniqueArray)),
					__allowedVerbs: doodad.PROTECTED(doodad.READ_ONLY(null)),
					
					createRequestStream: doodad.PUBLIC(doodad.NOT_IMPLEMENTED()), // function(request)
					createResponseStream: doodad.PUBLIC(doodad.NOT_IMPLEMENTED()), // function(request)
					
					execute: doodad.OVERRIDE(function(request) {
						const method = 'execute_' + request.verb.toUpperCase();
						let result;
						if (types.isImplemented(this, method)) {
							result = this[method](request);
						} else {
							result = request.respondWithStatus(types.HttpStatus.NotImplemented);
						};
						return result;
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
							allowed = tools.filter(this.knownVerbs, this.isAllowed, this);
							this.setAttribute('__allowedVerbs', allowed);
						};
						request.addHeaders({Allow: allowed.join(',')});
						request.end();
					}),
					
					isAllowed: doodad.PUBLIC(function(verb) {
						return types.isImplemented(this, 'execute_' + verb.toUpperCase());
					}),
					
					$prepare: doodad.PUBLIC(function(mappings, mapping, key) {
						if (types.isArray(mapping.verbs)) {
							tools.forEach(mapping.verbs, function(verb, i) {
								mapping.verbs[i] = verb.toLowerCase();
							});
						};
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
						request.respondWithStatus(request.mapping.status);
					}),
					execute_GET: doodad.OVERRIDE(function execute_GET(request) {
						request.respondWithStatus(request.mapping.status);
					}),
				}));

				http.REGISTER(doodad.BASE(doodad.Object.$extend(
									httpMixIns.Page,
				{
					$TYPE_NAME: 'StaticPage',

					execute_HEAD: doodad.OVERRIDE(doodad.MUST_OVERRIDE()),
					execute_GET: doodad.OVERRIDE(doodad.MUST_OVERRIDE()),
				})));

				http.REGISTER(doodad.BASE(widgets.Widget.$extend(
									httpMixIns.Page,
				{
					$TYPE_NAME: 'WidgetPage',
					
					execute_GET: doodad.OVERRIDE(function(request) {
						const result = this.show(request);
						if (result !== false) {
							request.writeHeader();
							this.render(request.getResponseStream());
							request.writeFooter();
						};
						return result;
					}),
					execute_POST: doodad.OVERRIDE(function(request) {
						const result = this.load(request);
						if (result !== false) {
							request.writeHeader();
							this.render(request.getResponseStream());
							request.writeFooter();
						};
						return result;
					}),
					
					show: doodad.PROTECTED(doodad.MUST_OVERRIDE()), // function(request)
					load: doodad.PROTECTED(doodad.MUST_OVERRIDE()), // function(request)
				})));
				
				http.REGISTER(doodad.Object.$extend(
									httpMixIns.Page,
				{
					$TYPE_NAME: 'RedirectPage',
					
					execute_GET: doodad.OVERRIDE(function(request) {
						if (request.mapping.internal) {
							request.redirectServer(request.mapping.targetUrl);
						} else {
							request.redirectClient(request.mapping.targetUrl, request.mapping.permanent);
						};
					}),
				}));
				


				http.REGISTER(doodad.BASE(doodad.Object.$extend(
									httpInterfaces.Server,
				{
					$TYPE_NAME: 'Server',

					pageFactory: doodad.PUBLIC(doodad.READ_ONLY()),
					options:  doodad.PUBLIC(doodad.READ_ONLY()),
					
					create: doodad.OVERRIDE(function create(pageFactory, /*optional*/options) {
						root.DD_ASSERT && root.DD_ASSERT(types._implements(pageFactory, httpInterfaces.PageFactory), "Invalid page factory.");
						
						this.setAttributes({pageFactory: pageFactory, options: options});
					}),
				})));


				http.REGISTER(doodad.BASE(doodad.Object.$extend(
				{
					$TYPE_NAME: 'RequestMatcher',
					
					match: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(request, map)
				})));
				
				
				http.REGISTER(http.RequestMatcher.$extend(
				{
					$TYPE_NAME: 'UrlMatcher',
					
					url: doodad.PUBLIC( null ),
					
					create: doodad.OVERRIDE(function(url) {
						this._super();
						if (types.isString(url)) {
							url = tools.Url.parse(url);
						};
						root.DD_ASSERT && root.DD_ASSERT((url instanceof tools.Url), "Invalid url.");
						this.url = url;
					}),
					
					match: doodad.OVERRIDE(function(request, map) {
						this._super(request, map);
						
						const requestUrl = request.url,
							requestUrlPath = requestUrl.path,
							requestUrlPathLen = (requestUrlPath && requestUrlPath.length || 0);

						const path = this.url.path,
							pathLen = (path && path.length || 0);
							
						let level = 0,     // path level (used later to remove the beginning of the path)
							weight = 0,    // weight
							full = false,  // full match
							depth = 0,
							starStar = false;
							
						if (pathLen <= requestUrlPathLen) {
							weight++;
							let i = 0,
								j = 0;
							while ((i < pathLen) && (j < requestUrlPathLen)) {
								let name1 = path[i],
									name2 = requestUrlPath[j];
								if (!map.caseSensitive) {
									name1 = name1.toUpperCase();
									name2 = name2.toUpperCase();
								};
								if (name1 === '**') {
									starStar = true;
									i++;
									level++;
								} else if (starStar) {
									if (name1 === name2) {
										i++;
										level++;
										starStar = false;
									};
								} else {
									if ((name1 !== '*') && (name1 !== name2)) {
										break;
									};
									i++;
									level++;
								};
								j++;
								weight++;
							};
							
							if (level >= pathLen) {
								let ok = true;
								if (!types.isNothing(map.depth)) {
									if (this.url.file) {
										pathLen++;
									};
									if ((pathLen + map.depth) < (requestUrlPathLen + (requestUrl.file ? 1 : 0))) {
										ok = false;
									};
								};
								
								if (ok) {
									if (this.url.file) {
										if (requestUrl.file) {
											let name1 = this.url.file,
												name2 = requestUrl.file;
											if (!map.caseSensitive) {
												name1 = name1.toUpperCase();
												name2 = name2.toUpperCase();
											};
											if (name1 === name2) {
												weight++;
												full = true;
											};
										};
									} else {
										full = true;
									};
								};
							};
						};
						
						types.extend(map, {
							level: level,
							weight: weight,
							full: full,
						});
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
				
				
				http.REGISTER(http.RequestMatcher.$extend(
				{
					$TYPE_NAME: 'RegExpUrlMatcher',
					
					regex: doodad.PUBLIC( null ),
					
					create: doodad.OVERRIDE(function(regex) {
						this._super();
						if (types.isString(regex)) {
							regex = new global.RegExp(regex);
						};
						root.DD_ASSERT && root.DD_ASSERT((regex instanceof global.RegExp), "Invalid regular expression.");
						this.regex = regex;
					}),
					
					match: doodad.OVERRIDE(function(request, map) {
						this._super(request, map);

						// TODO: Test
						const url = request.url.toString();
						map.matches = this.regex.exec(url);
						if (!map.matches) {
							return false;
						};
						map.level = url.slice(0, map.matches.index).split('/').length - 1;
						map.weight = -1; // -1 because first item is the whole string
						let ok = true;
						map.full = tools.every(map.matches, function(match) {
							if (match) {
								if (ok) {
									map.weight++;
								};
								return true;
							} else {
								ok = false;
								return false;
							};
						});
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
				
				
				http.REGISTER(doodad.Object.$extend(
									httpInterfaces.PageFactory,
				{
					$TYPE_NAME: 'PageFactory',

					urlMappings: doodad.PUBLIC(doodad.READ_ONLY(null)),
										/*
											mapping = {
												// Common
												page: Class,
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
					
					create: doodad.OVERRIDE(function create(urlMappings, /*optional*/options) {
						root.DD_ASSERT && root.DD_ASSERT((urlMappings instanceof types.Map) || types.isObject(urlMappings), "Invalid url mappings.");

						const parsedMappings = new types.Map();
						tools.forEach(urlMappings, function(maps, matcher) {
							if (matcher && maps) {
								if (types.isString(matcher)) {
									matcher = new http.UrlMatcher(matcher);
								};
								root.DD_ASSERT && root.DD_ASSERT((matcher instanceof http.RequestMatcher), "Invalid request matcher.");
								
								if (!types.isArray(maps)) {
									maps = [maps];
								};
								
								const parsedMaps = [];
								tools.forEach(maps, function(map) {
									if (map) {
										const newMap = types.extend({}, map);
										
										newMap.matcher = matcher;
										
										if (types.isString(newMap.page)) {
											newMap.page = namespaces.getNamespace(newMap.page);
										};
										
										if (!types._implements(newMap.page, httpMixIns.Page)) {
											throw new types.TypeError(tools.format("Invalid page type '~0~' for Url matcher '~1~'.", [types.getTypeName(map.page), matcher.toString()]));
										};
										
										types.getType(newMap.page).$prepare(urlMappings, newMap, matcher);
										
										parsedMaps.push(newMap);
									};
								});
								
								parsedMappings.set(matcher, parsedMaps);
							};
						});
						
						this.setAttributes({server: server, urlMappings: parsedMappings, options: options});
					}),
					
					createPage: doodad.OVERRIDE(function createPage(request) {
						let mappings = tools.reduce(this.urlMappings, function(mappings, maps, name) {
							nextMap: for (let h = 0; h < maps.length; h++) {
								const map = maps[h],
									matcher = map.matcher;
									
								if (map.verbs && (tools.indexOf(map.verbs, request.verb.toLowerCase()) === -1)) {
									continue nextMap;
								};
								
								if (map.extensions && requestFile) {
									if (tools.indexOf(mapping.extensions, request.fileExtension) === -1) {
										continue nextMap;
									};
								};
								
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
										continue nextMap;
									} else {
										mimeType = request.fileMimeTypes[pos];
										mimeTypes.push(mimeType);
										if (mimeType.weight > mimeWeight) {
											mimeWeight = mimeType.weight;
										};
									};
								};

								const newMap = types.extend({}, map);

								newMap.name = name;
								newMap.mimeTypes = mimeTypes.sort(function(type1, type2) {
									if (type1.weight > type2.weight) {
										return -1;
									} else if (type1.weight < type2.weight) {
										return 1;
									} else {
										return 0;
									};
								});
								newMap.mimeWeight = mimeWeight;
								
								matcher.match(request, newMap);
								
								if ((newMap.weight > 0) || newMap.full) {
									mappings.push(newMap);
								};
							};
							
							return mappings;
						}, []);

						// NOTE: Sort descending
						mappings = mappings.sort(function(map1, map2) {
							if (map1.full && !map2.full) {
								return -1;
							} else if (!map1.full && map2.full) {
								return 1;
							} else if (map1.weight > map2.weight) {
								return -1;
							} else if (map1.weight < map2.weight) {
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
						
						const getSibling = function getSibling(direction, index) {
							for (let i = index + direction; (i >= 0) && (i < mappings.length); i += direction) {
								const mapping = mappings[i];

								mapping.index = i;
								mapping.previousSibling = function() {
									if (this.noSibling || types.get(self.options, 'noSibling', false)) {
										return null;
									};
									return getSibling(-1, this.index);
								};
								mapping.nextSibling = function() {
									if (this.noSibling || types.get(self.options, 'noSibling', false)) {
										return null;
									};
									return getSibling(1, this.index);
								};
								
								types.invoke(request, 'setAttribute', ['mapping', mapping])
								
								if (types.isType(mapping.page)) {
									mapping.page = new mapping.page();
								};
								
								return mapping.page;
							};

							return null;
						};
						
						return getSibling(1, -1);
					}),
				}));
				
				http.ServerRedirect = types.createErrorType("ServerRedirect", types.ScriptAbortedError, function _new(url) {
					this.url = url;
					return types.ScriptAbortedError.call(this, "Server redirect.");
				});

				http.ClientRedirect = types.createErrorType("ClientRedirect", types.ScriptAbortedError, function _new(url, /*optional*/isPermanent) {
					this.url = url;
					this.isPermanent = isPermanent;
					return types.ScriptAbortedError.call(this, "Client redirect.");
				});
				
				http.RequestRejected = types.createErrorType("RequestRejected", types.ScriptAbortedError, function _new() {
					return types.ScriptAbortedError.call(this, "Request rejected.");
				});
				
				http.RequestCallback = types.setPrototypeOf(function(request, obj, fn) {
					if (types.isString(fn)) {
						fn = obj[fn];
					};
					fn = types.makeInside(obj, fn);
					let callback = function requestCallback(/*paramarray*/) {
						try {
							if (!request.isDestroyed()) {
								return fn.apply(obj, arguments);
							};
						} catch(ex) {
							const max = 5; // prevents infinite loop
							let count = 0,
								abort = false;
							while (count < max) {
								count++;
								try {
									if (types._instanceof(ex, server.EndOfRequest)) {
										// Do nothing
									} else if (types._instanceof(ex, server.RequestClosed)) {
										request.destroy()
									} else if (types._instanceof(ex, http.RequestRejected)) {
										request.reject();
									} else if (types._instanceof(ex, http.ClientRedirect)) {
										request.redirectClient(ex.url, ex.isPermanent);
									} else if (types._instanceof(ex, http.ServerRedirect)) {
										request.redirectServer(ex.url);
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
								if (abort) {
									throw ex;
								};
								if (count >= max) {
									// Failed to respond with internal error.
									try {
										doodad.trapException(obj, ex, attr);
									} catch(o) {
									};
									try {
										request.destroy();
									} catch(o) {
									};
								};
							};
						};
					};
					callback = types.setPrototypeOf(callback, http.RequestCallback);
					return callback;
				}, types.Callback);
				
				
			},
		};
		
		return DD_MODULES;
	};
	
	if (typeof process !== 'object') {
		// <PRB> export/import are not yet supported in browsers
		global.DD_MODULES = exports.add(global.DD_MODULES);
	};
}).call((typeof global !== 'undefined') ? global : ((typeof window !== 'undefined') ? window : this));