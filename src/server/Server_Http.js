//! BEGIN_MODULE()

//! REPLACE_BY("// Copyright 2015-2017 Claude Petit, licensed under Apache License version 2.0\n", true)
// doodad-js - Object-oriented programming framework
// File: Server_Http.js - Server tools
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
		DD_MODULES['Doodad.Server.Http'] = {
			version: /*! REPLACE_BY(TO_SOURCE(VERSION(MANIFEST("name")))) */ null /*! END_REPLACE()*/,
			namespaces: ['Interfaces', 'MixIns'],

			create: function create(root, /*optional*/_options, _shared) {
				"use strict";

				const doodad = root.Doodad,
					types = doodad.Types,
					tools = doodad.Tools,
					locale = tools.Locale,
					files = tools.Files,
					dates = tools.Dates,
					namespaces = doodad.Namespaces,	
					mime = tools.Mime,
					interfaces = doodad.Interfaces,
					mixIns = doodad.MixIns,
					extenders = doodad.Extenders,
					widgets = doodad.Widgets,
					io = doodad.IO,
					server = doodad.Server,
					serverMixIns = server.MixIns,
					http = server.Http,
					httpInterfaces = http.Interfaces,
					httpMixIns = http.MixIns,
					ioJson = io.Json,
					ioXml = io.Xml,
					moment = dates.Moment, // optional
					unicode = tools.Unicode;
					
					
				const __Internal__ = {
				};


				types.complete(_shared.Natives, {
					windowRegExp: global.RegExp,
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
					//return ((chrAscii >= 0x80) && (chrAscii <= 0xFF));
					return (chrAscii >= 0x80);
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
					let chr = unicode.nextChar(value, i);
					while (chr) {
						const prevI = i,
							chrAscii = chr.codePoint;
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
									str += chr.chr;
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
								str += chr.chr;
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
								if (delims && (delims.indexOf(chr.chr) >= 0)) {
									// Delimiter encountered. End of token.
									if (delimiters) {
										delimiters[0] = chr.chr;
									};
									i = chr.index + chr.size;
									break;
								} else if (endOfToken) {
									i = prevI;
									break;
								} else {
									str += chr.chr;
								};
							} else {
								// Invalid token
								str = null;
								break;
							};
						};
						i = chr.index + chr.size;
						chr = chr.nextChar();
					};
					if (quoted) {
						// Unterminated quoted string
						str = null;
					};
					pos[0] = i;
					return str;
				};
				
				http.ADD('parseAcceptHeader', function parseAcceptHeader(value) {
					const result = types.nullObject(),
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
						acceptExts = types.nullObject();
						
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
								if (!token) {
									// Invalid token
									return null;
								};
								if (delimiters[0] !== "=") {
									// Invalid token
									return null;
								};
								token = token.toLowerCase();  // param names are case-insensitive
								if (token === 'q') {
									pos[0] = i; // by ref
									delimiters[0] = ";,"; // by ref
									qvalue = __Internal__.getNextTokenOrString(value, pos, false, delimiters);
									i = pos[0];
									qvalue = types.toFloat(qvalue, 3);
									if ((qvalue < 0.0) || (qvalue > 1.0)) {
										// Invalid "qvalue"
										return null;
									};
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
						
						media = media.toLowerCase();  // medias are case-insensitive
						token = tools.split(media, '/', 2);
						const type = token[0] || '*',
							subtype = (token.length > 1) && token[1] || '*';

						result[media] = types.freezeObject(types.nullObject({
							name: media,
							type: type,
							subtype: subtype,
							weight: qvalue,
							exts: types.freezeObject(acceptExts),
						}));
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
				});
				
				http.ADD('parseAcceptEncodingHeader', function parseAcceptEncodingHeader(value) {
					if (!value) {
						return [];
					};

					const result = types.nullObject(),
						pos = [],
						delimiters = [];
					let	i = 0,
						encoding,
						token,
						str,
						qvalue,
						acceptExts;
						
					newEncoding: while (i < value.length) {
						qvalue = 1.0;
						acceptExts = types.nullObject();
							
						pos[0] = i; // by ref
						delimiters[0] = ";,"; // by ref
						encoding = __Internal__.getNextTokenOrString(value, pos, true, delimiters);
						i = pos[0];
						if (!encoding) {
							// Invalid token
							return null;
						};
						
						if (delimiters[0] !== ',') {
							newExt: while (i < value.length) {
								pos[0] = i; // by ref
								delimiters[0] = "="; // by ref
								token = __Internal__.getNextTokenOrString(value, pos, true, delimiters);
								i = pos[0];
								if (!token) {
									// Invalid token
									return null;
								};
								if (delimiters[0] !== "=") {
									// Invalid token
									return null;
								};
								token = token.toLowerCase();   // param names are case-insensitive
								if (token === 'q') {
									pos[0] = i; // by ref
									delimiters[0] = ";,"; // by ref
									qvalue = __Internal__.getNextTokenOrString(value, pos, false, delimiters);
									i = pos[0];
									qvalue = types.toFloat(qvalue, 3);
									if ((qvalue < 0.0) || (qvalue > 1.0)) {
										// Invalid "qvalue"
										return null;
									};
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
						
						encoding = encoding.toLowerCase(); // codings are case-insensitive

						// NOTE: 'identity' means 'no encoding'
						if ((qvalue > 0.0) || (encoding === 'identity')) { // NOTE: 'identity' with 'weight' at 0.0 forces an encoding
							result[encoding] = types.freezeObject(types.nullObject({
								name: encoding,
								weight: qvalue,
								exts: types.freezeObject(acceptExts),
							}));
						};
					};

					// Server MUST accept 'identity' unless explicitly not acceptable (weight at 0.0)
					if (result.identity) {
						// Client EXPLICITLY reject 'identity'
						if (result.identity.weight <= 0.0) {
							delete result.identity;
						};
					} else {
						// Client DID NOT reject 'identity'
						result.identity = types.freezeObject(types.nullObject({
							name: 'identity',
							weight: -1.0, // exceptional weight to make it very low priority
							exts: types.freezeObject(types.nullObject()),
						}));
					};
					
					return types.values(result)
						.sort(function(encoding1, encoding2) {
							if (encoding1.weight > encoding2.weight) {
								return -1;
							} else if (encoding1.weight < encoding2.weight) {
								return 1;
							} else {
								return 0;
							};
						});
				});
				
				http.ADD('parseContentTypeHeader', function parseContentTypeHeader(contentType) {
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
					
					media = media.toLowerCase();  // content-types are case-insensitive
					let tmp = tools.split(media, '/', 2);
					const type = tmp[0],
						subtype = tmp[1];
					if (!type || !subtype) {
						// Invalid media
						return null;
					};						
					
					const params = types.nullObject();
					if (delimiters[0] === ';') {
						while (pos[0] < contentType.length) {
							delimiters = ['=']; // byref
							let name = __Internal__.getNextTokenOrString(contentType, pos, true, delimiters);
							if (!name) {
								// Invalid token
								return null;
							};
							name = name.toLowerCase();   // param names are case-insensitive
							
							delimiters = [';']; // byref
							let value = __Internal__.getNextTokenOrString(contentType, pos, false, delimiters);
							
							params[name] = value || '';
						};
					};
					
					const weight = types.toFloat(types.get(params, 'q', 1.0));

					return types.freezeObject(types.nullObject({
						name: media,
						type: type,
						subtype: subtype,
						params: types.freezeObject(params),
						weight: weight,
						customData: types.nullObject(), // Allows to store custom fields even if object is frozen.
						toString: function toString() {
							return this.name + tools.reduce(this.params, function(result, value, key) {
								if (!types.isNothing(value)) {
									result += "; " + types.toString(key) + "=" + types.toString(value);
								};
								return result;
							}, "");
						},
						clone: function clone() {
							const params = types.nullObject(this.params);
							const newType = types.nullObject(this);
							newType.params = types.freezeObject(params);
							return types.freezeObject(newType);
						},
						set: function set(attrs) {
							const params = types.nullObject(this.params, types.get(attrs, 'params'));
							const customData = types.nullObject(this.customData, types.get(attrs, 'customData'));
							const newType = types.nullObject(this, attrs);
							newType.params = types.freezeObject(params);
							newType.customData = customData;
							return types.freezeObject(newType);
						},
					}));
				});

				http.ADD('parseContentDispositionHeader', function parseContentDispositionHeader(contentDisposition) {
					if (!contentDisposition) {
						return null;
					};
					
					const pos = [];
					let delimiters = [];
					
					pos[0] = 0; // byref
					delimiters = [';=']; // byref
					let media = __Internal__.getNextTokenOrString(contentDisposition, pos, true, delimiters);
					if (media === null) {
						return null;
					};
					
					const params = types.nullObject();

					if (delimiters[0] === ';') {
						media = media.toLowerCase();  // content-dispositions are case-insensitive
					} else {
						delimiters = [';']; // byref
						let value = __Internal__.getNextTokenOrString(contentDisposition, pos, false, delimiters);
							
						params[media] = value || '';
						media = '';
					};
					
					while (pos[0] < contentDisposition.length) {
						delimiters = ['=']; // byref
						let name = __Internal__.getNextTokenOrString(contentDisposition, pos, true, delimiters);
						if (!name) {
							// Invalid token
							return null;
						};
						name = name.toLowerCase();   // param names are case-insensitive
							
						delimiters = [';']; // byref
						let value = __Internal__.getNextTokenOrString(contentDisposition, pos, false, delimiters);
							
						params[name] = value || '';
					};
					
					return types.freezeObject(types.nullObject({
						name: media,
						params: types.freezeObject(params),
						toString: function toString() {
							return this.name + tools.reduce(this.params, function(result, value, key) {
								if (!types.isNothing(value)) {
									result += "; " + types.toString(key) + "=" + types.toString(value);
								};
								return result;
							}, "");
						},
					}));
				});

				http.ADD('compareMimeTypes', function compareMimeTypes(mimeType1, mimeType2) {
					if (((mimeType1.type === '*') && (mimeType1.subtype === '*')) || ((mimeType2.type === '*') && (mimeType2.subtype === '*'))) {
						return 10;
					} else if (((mimeType1.type === '*') || (mimeType2.type === '*')) && (mimeType1.subtype === mimeType2.subtype)) {
						return 20;
					} else if ((mimeType1.type === mimeType2.type) && ((mimeType1.subtype === '*') || (mimeType2.subtype === '*'))) {
						return 30;
					} else if (mimeType1.name === mimeType2.name) {
						return 40;
					} else {
						return 0;
					};
				});
				
				http.ADD('toRFC1123Date', function(date) {
					// ex.:   Fri, 10 Jul 2015 03:16:55 GMT
					if (moment && moment.isMoment(date)) {
						date = date.toDate();
					};
					return dates.strftime('%a, %d %b %Y %H:%M:%S GMT', date, __Internal__.enUSLocale, true);
				});
				
				
				http.ADD('prepareHandlersOptions', function prepareHandlersOptions(handlersOptions, /*optional*/parentOptions) {
					if (!types.isArray(handlersOptions)) {
						handlersOptions = [handlersOptions];
					};
					
					parentOptions = types.nullObject(parentOptions);

					return tools.map(handlersOptions, function(handlerOptions) {
						let handler;
						if (types.isJsObject(handlerOptions)) {
							handlerOptions = types.nullObject(handlerOptions);
							handler = handlerOptions.handler;
						} else if (types.isJsFunction(handlerOptions)) {
							handler = handlerOptions;
							handlerOptions = types.nullObject(types.get(handler, 'options'), {handler: handler});
						} else {
							throw new types.TypeError("Invalid options.");
						};
						
						if (types.isString(handler)) {
							handlerOptions.handler = handler = namespaces.get(handler);
						};
						
						if (types.isJsFunction(handler)) {
							handlerOptions = httpMixIns.Handler.$prepare(handlerOptions, parentOptions);
							if (handler.$prepare) {
								handlerOptions = handler.$prepare(handlerOptions, parentOptions);
							};
							handler.options = handlerOptions;
						} else if (types._implements(handler, httpMixIns.Handler)) {
							handlerOptions = types.getType(handler).$prepare(handlerOptions, parentOptions);
							if (!types.isType(handler)) {
								types.extend(handler.options, handlerOptions);
							};
						} else {
							throw new types.TypeError("Invalid handler type '~0~'.", [types.getTypeName(handler)]);
						};
						
						return handlerOptions;
					});
				});

				
				httpMixIns.REGISTER(doodad.MIX_IN(doodad.Class.$extend(
									mixIns.Creatable,
									mixIns.Events,
				{
					$TYPE_NAME: 'Headers',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('HeadersMixIn')), true) */,

					headers: doodad.PROTECTED(null),
					contentType: doodad.PUBLIC(doodad.READ_ONLY(null)),
					contentDisposition: doodad.PUBLIC(doodad.READ_ONLY(null)),
					__varyingHeaders: doodad.PROTECTED(null),

					onHeadersChanged: doodad.EVENT(false),

					create: doodad.OVERRIDE(function create(/*paramarray*/) {
						this.headers = types.nullObject();

						this._super.apply(this, arguments);
					}),

					getHeader: doodad.PUBLIC(function getHeader(name) {
						var fixed = tools.title(name, '-');
						return this.headers[fixed];
					}),
					
					getHeaders: doodad.PUBLIC(function getHeaders(/*optional*/names) {
						if (names) {
							if (!types.isArray(names)) {
								names = [names];
							};
							const headers = {};
							tools.forEach(names, function(name) {
								const fixed = tools.title(name, '-');
								headers[name] = this.headers[fixed];
								if (name !== fixed) {
									headers[fixed] = this.headers[fixed];
								};
							});
							return headers;
						} else {
							return types.extend({}, this.headers);
						};
					}),
					
					addHeader: doodad.PUBLIC(function addHeader(name, value) {
						const responseHeaders = this.headers;
						const fixed = tools.title(tools.trim(name), '-');
						value = (types.isNothing(value) ? '' : tools.trim(types.toString(value)));
						if (fixed === 'Content-Type') {
							this.setContentType(value);
						} else if (fixed === 'Content-Disposition') {
							this.setContentDisposition(value);
						} else if (fixed === 'Vary') {
							this.setVary(value);
						} else {
							if (value) {
								responseHeaders[fixed] = value;
							} else {
								delete responseHeaders[fixed];
							};
							this.onHeadersChanged(new doodad.Event({headers: [fixed]}));
						};
					}),
					
					addHeaders: doodad.PUBLIC(function addHeaders(headers) {
						const responseHeaders = this.headers;
						const changed = types.nullObject();
						tools.forEach(headers, function(value, name) {
							const fixed = tools.title(tools.trim(name), '-');
							value = (types.isNothing(value) ? '' : tools.trim(types.toString(value)));
							if (fixed === 'Content-Type') {
								this.setContentType(value);
							} else if (fixed === 'Content-Disposition') {
								this.setContentDisposition(value);
							} else if (fixed === 'Vary') {
								this.setVary(value);
							} else {
								if (value) {
									responseHeaders[fixed] = value;
								} else {
									delete responseHeaders[fixed];
								};
								changed[fixed] = null;
							};
						}, this);
						const changedKeys = types.keys(changed);
						if (changedKeys.length) {
							this.onHeadersChanged(new doodad.Event({headers: changedKeys}));
						};
					}),

					clearHeaders: doodad.PUBLIC(function clearHeaders(/*optional*/names) {
						let changedHeaders;
						if (names) {
							if (!types.isArray(names)) {
								names = [names];
							};
							changedHeaders = [];
							for (let i = 0; i < names.length; i++) {
								let fixed = tools.title(tools.trim(names[i]), '-');
								if (fixed in this.headers) {
									changedHeaders.push(fixed);
									if (fixed === 'Content-Type') {
										_shared.setAttribute(this, 'contentType', null);
									} else if (fixed === 'Content-Disposition') {
										_shared.setAttribute(this, 'contentDisposition', null);
									} else if (fixed === 'Vary') {
										this.__varyingHeaders = null;
									};
									delete this.headers[fixed];
								};
							};
						} else {
							changedHeaders = types.keys(this.headers);
							_shared.setAttributes(this, {
								headers: types.nullObject(),
								contentType: null,
							});
						};
						if (changedHeaders.length) {
							this.onHeadersChanged(new doodad.Event({headers: changedHeaders}));
						};
					}),

					setContentType: doodad.PUBLIC(function setContentType(contentType, /*optional*/options) {
						options = types.nullObject(options);

						if (types.isString(contentType)) {
							contentType = http.parseContentTypeHeader(contentType);
						};

						const encoding = options.encoding;
						if (encoding) {
							contentType = contentType.set({params: {charset: encoding}});
						};

						_shared.setAttribute(this, 'contentType', contentType);

						this.headers['Content-Type'] = contentType.toString();
						this.onHeadersChanged(new doodad.Event({headers: ['Content-Type']}));

						return this.contentType;
					}),

					setContentDisposition: doodad.PUBLIC(function setContentDisposition(contentDisposition) {
						if (types.isString(contentDisposition)) {
							contentDisposition = http.parseContentDispositionHeader(contentDisposition);
						};

						_shared.setAttribute(this, 'contentDisposition', contentDisposition);

						this.headers['Content-Disposition'] = (contentDisposition && contentDisposition.toString() || "");
						this.onHeadersChanged(new doodad.Event({headers: ['Content-Disposition']}));

						return this.contentDisposition;
					}),

					setVary: doodad.PUBLIC(function setVary(names) {
						if (!this.__varyingHeaders) {
							this.__varyingHeaders = types.nullObject();
						};

						tools.forEach(names.split(','), function(name) {
							const fixed = tools.title(tools.trim(name), '-');
							this.__varyingHeaders[fixed] = true;
						}, this);

						const vary = tools.reduce(this.__varyingHeaders, function(result, dummy, name) {
							return result + ', ' + name;
						}, "");

						this.headers['Vary'] = vary.slice(2);
						this.onHeadersChanged(new doodad.Event({headers: ['Vary']}));

						return vary;
					}),

					storeHeaders: doodad.PUBLIC(function storeHeaders(storeObj, /*optional*/names) {
						storeObj.addHeaders(this.getHeaders(names));
					}),
				})));


				http.REGISTER(doodad.BASE(doodad.Object.$extend(
									httpMixIns.Headers,
									//mixIns.Events,
		//									serverMixIns.Response,
				{
					$TYPE_NAME: 'Response',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('ResponseBase')), true) */,
					
					onGetStream: doodad.EVENT(false),
					onError: doodad.EVENT(false),
					onStatus: doodad.EVENT(false),
					onSendHeaders: doodad.EVENT(false),

					__ending: doodad.PROTECTED(false),
					ended: doodad.PUBLIC(doodad.PERSISTENT(doodad.READ_ONLY(false))),
					request: doodad.PUBLIC(doodad.READ_ONLY(null)),
					status: doodad.PUBLIC(doodad.READ_ONLY(types.HttpStatus.OK)),
					message: doodad.PUBLIC(doodad.READ_ONLY('OK')),
					statusData: doodad.PUBLIC(doodad.READ_ONLY(null)),

					trailers: doodad.PROTECTED(null),
					headersSent: doodad.PUBLIC(doodad.READ_ONLY(false)),
					trailersSent: doodad.PUBLIC(doodad.READ_ONLY(false)),

					__pipes: doodad.PROTECTED(null),

					stream: doodad.PROTECTED(null),
					getStream: doodad.PUBLIC(doodad.ASYNC(doodad.MUST_OVERRIDE())), // function(/*optional*/options)
					
					clear: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function clear()

					respondWithStatus: doodad.PUBLIC(doodad.ASYNC(doodad.MUST_OVERRIDE())), // function respondWithStatus(/*optional*/status, /*optional*/message, /*optional*/headers, /*optional*/data)
					respondWithError: doodad.PUBLIC(doodad.ASYNC(doodad.MUST_OVERRIDE())), // function respondWithError(ex)
					
					// TODO: Validate
					reset: doodad.PUBLIC(function reset() {
						const handlers = this.request.getHandlers().filter(function(handler) {return !types.isFunction(handler)});
						this.clearEvents(handlers);
						if (!this.ended) {
							_shared.setAttributes(this, {
								headers: types.nullObject(),
								trailers: types.nullObject(),
								__pipes: [],
								stream: null,
							});
						};
					}),

					create: doodad.OVERRIDE(function create(request) {
						this._super();

						_shared.setAttribute(this, 'request', request);
						
						this.reset();
					}),

					setContentType: doodad.OVERRIDE(function setContentType(contentType, /*optional*/options) {
						if (this.ended && !this.__ending) {
							throw new server.EndOfRequest();
						};							
						if (this.headersSent) {
							throw new types.NotAvailable("Can't add new headers because headers have been sent to the client.");
						};
						contentType = this.request.getAcceptables(contentType, options)[0];
						if (!contentType) {
							throw new types.HttpError(types.HttpStatus.NotAcceptable);
						};

						return this._super(contentType, options);
					}),

					addHeader: doodad.OVERRIDE(function addHeader(name, value) {
						if (this.ended && !this.__ending) {
							throw new server.EndOfRequest();
						};							
						if (this.headersSent) {
							throw new types.NotAvailable("Can't add new headers because headers have been sent to the client.");
						};
						this._super(name, value);
						this.request.setFullfilled(true);
					}),
					
					addHeaders: doodad.OVERRIDE(function addHeaders(headers) {
						if (this.ended && !this.__ending) {
							throw new server.EndOfRequest();
						};							
						if (this.headersSent) {
							throw new types.NotAvailable("Can't add new headers because headers have been sent to the client.");
						};
						this._super(headers);
						this.request.setFullfilled(true);
					}),

					clearHeaders: doodad.OVERRIDE(function clearHeaders(/*optional*/names) {
						if (this.ended && !this.__ending) {
							throw new server.EndOfRequest();
						};							
						if (this.headersSent) {
							throw new types.NotAvailable("Can't clear headers because they have been sent to the client.");
						};
						this._super(names);
					}),

					addTrailer: doodad.PUBLIC(function addTrailer(name, value) {
						if (this.ended && !this.__ending) {
							throw new server.EndOfRequest();
						};							
						if (this.trailersSent) {
							throw new types.NotAvailable("Can't add new trailers because trailers have been sent and the request has ended.");
						};
						const responseTrailers = this.trailers;
						const fixed = tools.title(tools.trim(name), '-');
						value = (types.isNothing(value) ? '' : tools.trim(types.toString(value)));
						if (value) {
							responseTrailers[fixed] = value;
						} else {
							delete responseTrailers[fixed];
						};
						this.onHeadersChanged(new doodad.Event({headers: [fixed], areTrailers: true}));
						this.request.setFullfilled(true);
					}),

					addTrailers: doodad.PUBLIC(function addTrailers(trailers) {
						if (this.ended && !this.__ending) {
							throw new server.EndOfRequest();
						};							
						if (this.trailersSent) {
							throw new types.NotAvailable("Can't add new trailers because trailers have been sent and the request has ended.");
						};
						const responseTrailers = this.trailers;
						const changed = types.nullObject();
						tools.forEach(trailers, function(value, name) {
							const fixed = tools.title(tools.trim(name), '-');
							value = (types.isNothing(value) ? '' : tools.trim(types.toString(value)));
							if (value) {
								responseTrailers[fixed] = value;
							} else {
								delete responseTrailers[fixed];
							};
							changed[fixed] = null;
						});
						const changedKeys = types.keys(changed);
						if (changedKeys.length) {
							this.onHeadersChanged(new doodad.Event({headers: changedKeys, areTrailers: true}));
						};
						this.request.setFullfilled(true);
					}),

					clearTrailers: doodad.PUBLIC(function clearTrailers(/*optional*/names) {
						if (this.ended && !this.__ending) {
							throw new server.EndOfRequest();
						};							

						let changedTrailers;
						if (names) {
							if (!types.isArray(names)) {
								names = [names];
							};
							changedTrailers = [];
							for (let i = 0; i < names.length; i++) {
								let fixed = tools.title(tools.trim(names[i]), '-');
								if (fixed in this.trailers) {
									changedTrailers.push(fixed);
									delete this.trailers[fixed];
								};
							};
						} else {
							changedTrailers = types.keys(this.tailers);
							_shared.setAttributes(this, {
								trailers: types.nullObject(),
							});
						};
						if (changedTrailers.length) {
							this.onHeadersChanged(new doodad.Event({headers: changedTrailers, areTrailers: true}));
						};
					}),

					setStatus: doodad.PUBLIC(function setStatus(status, /*optional*/message) {
						if (this.ended) {
							throw new server.EndOfRequest();
						};							

						if (this.headersSent) {
							throw new types.NotAvailable("Can't respond with a new status because the headers have already been sent to the client.");
						};

						_shared.setAttributes(this, {
							status: status || types.HttpStatus.OK,
							message: message || null,
						});

						if (status) {
							this.request.setFullfilled(true);
						};
					}),

					addPipe: doodad.PUBLIC(function addPipe(stream, /*optional*/options) {
						if (this.ended) {
							throw new server.EndOfRequest();
						};							

						if (!this.__pipes) {
							throw new types.NotAvailable("'addPipe' is not available because pipes have already been proceed.");
						};

						options = types.nullObject(options);

						const headers = options.headers;
						if (headers) {
							this.addHeaders(headers);
						};

						// TODO: Assert on "stream"
						// NOTE: Pipes are made at "getStream".
						const pipe = types.nullObject({stream: stream, options: options});
						if (options.unshift) {
							this.__pipes.unshift(pipe);
						} else {
							this.__pipes.push(pipe);
						};
					}),
					
					clearPipes: doodad.PUBLIC(function clearPipes() {
						if (this.ended) {
							throw new server.EndOfRequest();
						};

						if (!this.__pipes) {
							throw new types.NotAvailable("'clearPipes' is not available because pipes have already been proceed.");
						};

						this.__pipes = [];
					}),
					
					hasStream: doodad.PUBLIC(function hasStream() {
						return !!this.stream;
					}),

					hasContent: doodad.PUBLIC(function hasContent() {
						return this.hasStream() || 
							!types.isNothing(this.status) || 
							!types.isEmpty(this.headers) || 
							!types.isEmpty(this.trailers);
					}),

				})));
				
				http.REGISTER(doodad.EXPANDABLE(doodad.Object.$extend(
									mixIns.Events,
				{
					$TYPE_NAME: 'HandlerState',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('HandlerState')), true) */,
				})));
					
				http.REGISTER(doodad.BASE(doodad.Object.$extend(
									httpMixIns.Headers,
									serverMixIns.Request,
				{
					$TYPE_NAME: 'Request',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('RequestBase')), true) */,
					
					onGetStream: doodad.EVENT(false),
					
					__ending: doodad.PROTECTED(false),
					ended: doodad.PUBLIC(doodad.PERSISTENT(doodad.READ_ONLY(false))),
					response: doodad.PUBLIC(doodad.READ_ONLY(null)),
					verb: doodad.PUBLIC(doodad.READ_ONLY(null)),
					url: doodad.PUBLIC(doodad.READ_ONLY(null)),
					data: doodad.PUBLIC(doodad.READ_ONLY(null)),
					clientCrashed: doodad.PUBLIC(doodad.READ_ONLY(false)),
					clientCrashRecovery: doodad.PUBLIC(doodad.READ_ONLY(false)),
					contentType: doodad.PUBLIC(doodad.READ_ONLY(null)),
					
					createResponse: doodad.PROTECTED(doodad.MUST_OVERRIDE()), // function createResponse(/*paramarray*/)

					stream: doodad.PROTECTED(null),
					__streamOptions: doodad.PROTECTED(null),
					getStream: doodad.PUBLIC(doodad.ASYNC(doodad.MUST_OVERRIDE())), // function getStream(/*optional*/options)

					__pipes: doodad.PROTECTED(null),

					__waitQueue: doodad.PROTECTED(null), // before 'close'

					__redirectsCount: doodad.PROTECTED(0),

					__parsedAccept: doodad.PROTECTED(null),

					id: doodad.PUBLIC(doodad.READ_ONLY(null)), // ease debugging

					__handlersStates: doodad.PROTECTED(null),
					currentHandler: doodad.PUBLIC(doodad.READ_ONLY(null)),

					__contentEncodings: doodad.PROTECTED(null),

					__fullfilled: doodad.PROTECTED(false),

					$__actives: doodad.PROTECTED(doodad.TYPE(0)),
					$__active_requests: doodad.PROTECTED(doodad.TYPE( new types.Set() )),
					
					$__total: doodad.PROTECTED(doodad.TYPE(0)),
					$__successful: doodad.PROTECTED(doodad.TYPE(0)),
					$__redirected: doodad.PROTECTED(doodad.TYPE(0)),
					$__failed: doodad.PROTECTED(doodad.TYPE(null)),
					$__aborted: doodad.PROTECTED(doodad.TYPE(0)),

					$getStats: doodad.PUBLIC(doodad.TYPE(function $getStats() {
						return types.nullObject({
							actives: this.$__actives,
							total: this.$__total,
							successful: this.$__successful,
							redirected: this.$__redirected,
							failed: this.$__failed,
							aborted: this.$__aborted,
						});
					})),
					
					$getActives: doodad.PUBLIC(doodad.TYPE(function $getActives() {
						const actives = [];
						this.$__active_requests.forEach(function(request) {
							actives[actives.length] = request.url.toString();
						});
						return actives;
					})),

					$clearStats: doodad.PUBLIC(doodad.TYPE(function $clearStats() {
						this.$__total = 0;
						this.$__successful = 0;
						this.$__redirected = 0;
						this.$__failed = types.nullObject();
						this.$__aborted = 0;
					})),
					
					$create: doodad.OVERRIDE(function $create() {
						this._super();

						this.$clearStats();
					}),
					
					// TODO: Validate
					reset: doodad.PUBLIC(function reset() {
						if (this.__handlersStates) {
							const handlers = this.getHandlers().filter(function(handler) {return !types.isFunction(handler)});
							this.clearEvents(handlers);
						};
						if (!this.ended) {
							_shared.setAttributes(this, {
								__pipes: [],
								__streamOptions: types.nullObject(),
								__waitQueue: [],
								__handlersStates: new types.Map(),
								stream: null,
								__fullfilled: false,
								__contentEncodings: [],
							});

							this.onSanitize.stackSize = 60;
						};
					}),

					create: doodad.OVERRIDE(function create(server, verb, url, headers, /*optional*/responseArgs) {
						const type = types.getType(this);
						
						if (type.$__total >= types.getSafeIntegerBounds().max) {
							type.$clearStats();
						};
						
						type.$__total++;
						type.$__actives++;

						if (type.$__active_requests) {
							type.$__active_requests.add(this);
						};

						try {
							if (types.isString(url)) {
								url = files.Url.parse(url);
							};
					
							if (root.DD_ASSERT) {
								root.DD_ASSERT && root.DD_ASSERT(types._implements(server, httpMixIns.Server), "Invalid server.");
								root.DD_ASSERT(types.isString(verb), "Invalid verb.");
								root.DD_ASSERT((url instanceof files.Url), "Invalid URL.");
								root.DD_ASSERT(types.isObject(headers), "Invalid headers.");
							};

							this._super();
						
							_shared.setAttributes(this, {
								server: server,
								verb: verb.toUpperCase(),
								data: types.nullObject(),
								id: tools.generateUUID(),
							});

							this.addHeaders(headers);

							let host = this.getHeader('Host');
							if (host) {
								host = files.Url.parse(server.protocol + '://' + host + '/');
							};
						
							url = files.Url.parse(url);
							if (host) {
								url = host.combine(url);
							};
						
							this.__redirectsCount = types.toInteger(url.args.get('redirects', true));
							if (!types.isFinite(this.__redirectsCount) || (this.__redirectsCount < 0)) {
								this.__redirectsCount = 0;
							};

							const clientCrashed = types.toBoolean(url.args.get('crashReport', false));
							const clientCrashRecovery = types.toBoolean(url.args.get('crashRecovery', false));
	//throw new types.Error("allo"); // To simulate an error on 'create'
							url = url.removeArgs(['redirects', 'crashReport', 'crashRecovery'])

							this.reset();

							_shared.setAttributes(this, {
								url: url,
								clientCrashed: clientCrashed,
								clientCrashRecovery: (clientCrashRecovery && !clientCrashed),
								__parsedAccept: http.parseAcceptHeader(this.getHeader('Accept') || '*/*'),
								response: this.createResponse.apply(this, responseArgs || []),
							});
						} catch(ex) {
							type.$__actives--;
							var failed = type.$__failed;
							var status = types.HttpStatus.InternalError;
							if (types.has(failed, status)) {
								failed[status]++;
							} else {
								failed[status] = 1;
							};
							throw ex;
						};
					}),

					destroy: doodad.OVERRIDE(function destroy() {
						this.sanitize();

						tools.forEach(this.__handlersStates, function(state, handler) {
							if (state.mustDestroy) {
								types.DESTROY(handler);
								types.DESTROY(state);
							};
						});

						types.DESTROY(this.response);

						const type = types.getType(this);

						type.$__actives--;

						if (type.$__active_requests) {
							type.$__active_requests.delete(this);
						};

						this._super();
					}),

					hasHandler: doodad.PUBLIC(function hasHandler(handler) {
						return tools.some(this.__handlersStates.keys(), function someHandler(hdl) {
							return (types.isJsFunction(hdl) ? (hdl === handler) : types.isLike(hdl, handler));
						});
					}),

					getHandlers: doodad.PUBLIC(function getHandlers(/*optional*/handler) {
						if (handler) {
							return tools.filter(this.__handlersStates.keys(), function someHandler(hdl) {
								return (types.isJsFunction(hdl) ? (hdl === handler) : types.isLike(hdl, handler));
							});
						} else {
							return types.toArray(this.__handlersStates.keys());
						};
					}),

					getHandlerState: doodad.PUBLIC(function getHandlerState(/*optional*/handler) {
						root.DD_ASSERT && root.DD_ASSERT(types.isNothing(handler) || types.isJsFunction(handler) || types._implements(handler, httpMixIns.Handler), "Invalid handler.");
						if (types.isNothing(handler)) {
							handler = this.currentHandler;
						};
						let state = null;
						if (handler) {
							state = this.__handlersStates.get(handler);
							if (!state) {
								this.applyHandlerState(handler);
								state = this.__handlersStates.get(handler);
							};
						};
						return state;
					}),

					applyHandlerState: doodad.PUBLIC(function applyHandlerState(/*optional*/handler, /*optional*/newState, /*optional*/options) {
						if (types.isNothing(handler)) {
							handler = this.currentHandler;
						} else if (types.isString(handler)) {
							handler = namespaces.get(handler);
						};
						options = types.nullObject(options);
						root.DD_ASSERT && root.DD_ASSERT(types.isJsFunction(handler) || types._implements(handler, httpMixIns.Handler), "Invalid handler.");
						if (!options.globalState && types.isType(handler)) {
							handler = tools.filter(this.__handlersStates.keys(), function(hndlr) {
								return types.isLike(hndlr, handler);
							});
						} else {
							handler = [handler];
						};
						tools.forEach(handler, function(hndlr) {
							const protos = [];
							let state = null;
							if (!options.globalState && this.__handlersStates.has(hndlr)) {
								state = this.__handlersStates.get(hndlr);
							} else {
								state = new http.HandlerState();
								if (!options.globalState) {
									const handlerType = types.getType(hndlr);
									const globalState = this.__handlersStates.get(handlerType);
									if (globalState && !state._implements(globalState)) {
										protos.push(globalState);
									};
								};
								this.__handlersStates.set(hndlr, state);
							};
							if (newState && !state._implements(newState)) {
								protos.push(newState);
							};
							if (protos.length) {
								state.extend.apply(state, protos).create();
							};
						}, this);
					}),

					getAcceptables: doodad.PUBLIC(function getAcceptables(/*optional*/contentTypes, /*optional*/options) {
						options = types.nullObject(options);

						// Get negociated mime types between the handler and the client. Defaults to the "Accept" header.
						const handlerState = options.handler && this.getHandlerState(options.handler);
						let handlerTypes = handlerState && handlerState.mimeTypes || this.__parsedAccept;

						if (!contentTypes) {
							return handlerTypes;
						};

						if (!types.isArray(contentTypes)) {
							contentTypes = [contentTypes];
						};

						const acceptedTypes = [];
						
						if (handlerTypes) {
							for (let i = 0; i < contentTypes.length; i++) {
								let contentType = contentTypes[i];
								if (types.isString(contentType)) {
									contentType = http.parseContentTypeHeader(contentType);
								};
								if (contentType.weight > 0.0) {
									// Get mime type parameters from the handler options (typicaly 'charset')
									const result = tools.reduce(handlerTypes, function(result, handlerType, index) {
										const score = http.compareMimeTypes(handlerType, contentType);
										if (score > result.score) {
											result.score = score;
											result.mimeType = handlerType;
											result.index = index;
										};
										return result;
									}, {mimeType: null, score: 0, index: -1});
									let newContentType;
									if (result.mimeType) {
										const newParams = types.complete({}, result.mimeType.params, contentType.params);
										newContentType = contentType.set({weight: result.mimeType.weight, params: newParams});
										newContentType.customData.index = result.index; // for "sort"
										acceptedTypes.push(newContentType);
									};
								};
							};
						};
						
						acceptedTypes.sort(function(type1, type2) {
							if (type1.weight > type2.weight) {
								return -1;
							} else if (type1.weight < type2.weight) {
								return 1;
							} else if (type1.customData.index > type2.customData.index) {
								return 1;
							} else if (type1.customData.index < type2.customData.index) {
								return -1;
							} else {
								return 0;
							};
						});
						
						return acceptedTypes;
					}),

					redirectClient: doodad.PUBLIC(doodad.ASYNC(function redirectClient(url, /*optional*/isPermanent) {
						// NOTE: Must always throw an error.
						if (this.ended) {
							throw new server.EndOfRequest();
						};							
						const maxRedirects = this.server.options.maxRedirects || 5;
						if (this.response.headersSent) {
							throw new types.NotAvailable("Unable to redirect because HTTP headers are already sent.");
						} else if (this.__redirectsCount >= maxRedirects) {
							return this.end();
						} else {
							//this.response.clear();
							this.__redirectsCount++;
							url = this.url.set({file: null}).combine(url);
							const status = (isPermanent ? types.HttpStatus.MovedPermanently : types.HttpStatus.TemporaryRedirect);
							return this.response.respondWithStatus(status, null, {
								'Location': url.toString({
									args: {
										redirects: this.__redirectsCount,
									},
								}),
							});
						};
					})),
					
					redirectServer: doodad.PUBLIC(doodad.ASYNC(function redirectServer(url, /*optional*/options) {
						// NOTE: Must always throw an error.
						if (this.ended) {
							throw new server.EndOfRequest();
						};
						options = types.nullObject(options);
						const maxRedirects = this.server.options.maxRedirects || 5;
						if (this.response.headersSent) {
							throw new types.NotAvailable("Unable to redirect because HTTP headers are already sent.");
						} else if (this.__redirectsCount >= maxRedirects) {
							return this.end();
						} else {
							this.response.clear();
							this.__redirectsCount++;
							url = this.url.set({file: null}).combine(url);
							_shared.setAttribute(this, 'url', url);
							const verb = options.verb;
							if (verb) {
								_shared.setAttribute(this, 'verb', verb);
							};
							const data = options.data;
							if (data) {
								types.extend(this.data, data);
							};
							this.reset();
							this.response.reset();
							// NOTE: See "Request.catchError"
							throw new http.ProceedNewHandlers(this.server.handlersOptions);
						};
					})),

					addPipe: doodad.PUBLIC(function addPipe(stream, /*optional*/options) {
						if (this.ended) {
							throw new server.EndOfRequest();
						};

						if (!this.__pipes) {
							throw new types.NotAvailable("'addPipe' is not available because pipes have already been proceed.");
						};

						// TODO: Assert on "stream"
						// NOTE: Don't immediatly do pipes to not start the transfer. Pipes and transfer are made at "getStream".
						options = types.nullObject(options);
						const pipe = {stream: stream, options: options};
						if (options.unshift) {
							this.__pipes.unshift(pipe);
						} else {
							this.__pipes.push(pipe);
						};
					}),
					
					clearPipes: doodad.PUBLIC(function clearPipes() {
						if (this.ended) {
							throw new server.EndOfRequest();
						};

						if (!this.__pipes) {
							throw new types.NotAvailable("'clearPipes' is not available because pipes have already been proceed.");
						};

						this.__pipes = [];
					}),
					
					setStreamOptions: doodad.PUBLIC(function setStreamOptions(options) {
						if (this.ended) {
							throw new server.EndOfRequest();
						};

						const accept = types.get(this.__streamOptions, 'accept') || [];

						types.extend(this.__streamOptions, options);

						if (types.get(options, 'accept')) {
							let newAccept = options.accept;
							if (!types.isArray(newAccept)) {
								newAccept = [newAccept];
							};
							this.__streamOptions.accept = types.append(accept, newAccept.map(value => types.isString(value) ? http.parseAcceptHeader(value)[0] : value));
						};
					}),

					hasStream: doodad.PUBLIC(function hasStream() {
						return !!this.stream;
					}),
					
					isFullfilled: doodad.PUBLIC(function isFullfilled() {
						return this.__fullfilled;
					}),

					setFullfilled: doodad.PUBLIC(function setFullfilled(fullfilled) {
						this.__fullfilled = !!fullfilled;
					}),

					resolve: doodad.PUBLIC(doodad.ASYNC(function resolve(url, type) {
						if (this.ended) {
							throw new server.EndOfRequest();
						};
						
						const base = httpMixIns.Handler;
						if (types.isString(type)) {
							const tmp = namespaces.get(type);
							if (!types._implements(tmp, base)) {
								throw new types.TypeError("Invalid handler type : '~0~'.", [type]);
							};
							type = tmp;
						} else if (!types._implements(type, base)) {
							throw new types.TypeError("Invalid handler type : '~0~'.", [type.DD_FULL_NAME || '<unknown>']);
						};

						return this.proceed(this.server.handlersOptions, {resolveUrl: url})
							.then(function(handlers) {
								if (handlers) {
									const len = handlers.length;
									for (let i = 0; i < len; i++) {
										const handler = handlers[i];

										if (types.isLike(handler, type)) {
											return handler;
										};
									};
								};
								return null; // not found
							});
					})),

					proceed: doodad.PUBLIC(doodad.ASYNC(function proceed(handlersOptions, /*optional*/options) {
						const Promise = types.getPromise();

						if (this.ended) {
							throw new server.EndOfRequest();
						};
						
						if (!types.isArray(handlersOptions)) {
							handlersOptions = [handlersOptions];
						};

						const resolveUrl = files.parseUrl(types.get(options, 'resolveUrl', null));
						//const prevHandler = resolveUrl && this.currentHandler;


						const runHandler = function runHandler(handlerOptions, resolved) {
							handlerOptions = types.nullObject(handlerOptions);

							let handler = handlerOptions.handler;

							const acceptedMimeTypes = this.getAcceptables(handlerOptions.mimeTypes);

							if (!handlerOptions.mimeTypes || (acceptedMimeTypes && acceptedMimeTypes.length)) {
								const parentState = handlerOptions.parent && this.getHandlerState(handlerOptions.parent);
								const stateUrl = handlerOptions.matcherResult && (parentState && parentState.url ? parentState.url.combine(handlerOptions.matcherResult.url, {isRelative: true}) : handlerOptions.matcherResult.url);
								const stateProto = types.extend({}, handlerOptions.state, {
									parent: doodad.PUBLIC(doodad.READ_ONLY(handlerOptions.parent || null)),
									matcherResult: doodad.PUBLIC(doodad.READ_ONLY(handlerOptions.matcherResult || null)),
									mimeTypes: doodad.PUBLIC(doodad.READ_ONLY(acceptedMimeTypes || null)),
									url: doodad.PUBLIC(doodad.READ_ONLY(stateUrl || null)),
								});
								this.applyHandlerState(handler, stateProto, {globalState: true});

								let mustDestroy = false;
								if (types.isType(handler)) {
									// TODO: Reuse objects on "redirectServer"
									handler = handler.$createInstance(handlerOptions);
									mustDestroy = true;
								};

								if (!this.__handlersStates.has(handler)) {
									this.applyHandlerState(handler, {
										mustDestroy: doodad.PUBLIC(doodad.READ_ONLY(mustDestroy)),
									});
								};

								tools.forEach(handlerOptions.states, function(newState, handler) {
									this.applyHandlerState(handler, newState);
								}, this);
							
	//console.log(types.getTypeName(handler) + ": " + this.url.toString() + "   " + this.id);

								if (types._implements(handler, httpMixIns.Handler)) {
									if (resolveUrl) {
										const currentState = resolveUrl && this.getHandlerState(handler);
										const matcherResult = currentState && currentState.matcherResult;
										if (matcherResult && matcherResult.full) {
											resolved.push(handler);
										};
										if (types.isImplemented(handler, 'resolve')) {
											return handler.resolve(this, matcherResult && matcherResult.urlRemaining || resolveUrl);
										};
									} else {
										_shared.setAttribute(this, 'currentHandler', handler);
										return handler.execute(this);
									};
								} else if (types.isJsFunction(handler)) {
									if (!resolveUrl) {
										_shared.setAttribute(this, 'currentHandler', handler);
										return handler(this); // "handler" is "function(request) {...}"
									};
								} else {
									throw new types.TypeError("Invalid handler.");
								};
							};

							return null;
						};
						
						const loopProceedHandler = function proceedHandler(index, resolved) {
							if (!this.ended) {
								if (index < handlersOptions.length) {
									const handlerOptions = handlersOptions[index];
									return Promise.resolve(runHandler.call(this, handlerOptions, resolved))
										.then(function proceedGivenHandlers(newHandlersOptions) {
											if (newHandlersOptions && newHandlersOptions.length) {
												return this.proceed(newHandlersOptions, {resolveUrl: resolveUrl})
													.then(function(result) {
														if (resolveUrl) {
															types.append(resolved, result);
														};
													});
											};
										}, null, this)
										.catch(this.catchError, this)
										.then(function proceedNext(dummy) {
											return loopProceedHandler.call(this, index + 1, resolved);
										}, null, this);
								};
								return resolveUrl && resolved;
							};
						};
						
						return Promise.resolve(loopProceedHandler.call(this, 0, []));
					})),
					
					catchError: doodad.OVERRIDE(function catchError(ex) {
						const max = 5; // prevents infinite loop
						let count = 0;

						const _catchError = function _catchError(ex) {
							if (count >= max) {
								// Failed to respond with internal error.
								try {
									doodad.trapException(ex);
								} catch(o) {
								};
								throw ex;
							} else if (_shared.DESTROYED(this)) {
								if (ex.critical || !ex.bubble) {
									throw ex;
								};
							} else {
								count++;
								if (types._instanceof(ex, types.HttpError)) {
									return this.response.respondWithStatus(ex.code)
										.catch(_catchError, this);
								} else if (types._instanceof(ex, http.ProceedNewHandlers)) {
									return this.proceed(ex.handlersOptions)
										.catch(_catchError, this);
								} else if (types._instanceof(ex, http.StreamAborted)) {
									// Do nothing
								} else if (types._instanceof(ex, server.EndOfRequest)) {
									// Do nothing
								} else if (ex.critical) {
									throw ex;
								} else if (ex.bubble) {
									return this.end(true)
										.catch(_catchError, this);
								} else {
									// Internal error.
									return this.response.respondWithError(ex)
										.catch(_catchError, this);
								};
							};
						};

						return _catchError.call(this, ex);
					}),

					// NOTE: Experimental
					waitFor: doodad.PUBLIC(function waitFor(/*optional*/promise) {
						if (this.ended && !this.__ending) {
							throw new server.EndOfRequest();
						};

						root.DD_ASSERT && root.DD_ASSERT(types.isPromise(promise), "Invalid promise.");

						this.__waitQueue.push(promise);
					}),

					acceptContentEncodings: doodad.PUBLIC(function acceptContentEncodings(encodings) {
						if (this.ended) {
							throw new server.EndOfRequest();
						};

						if (!types.isArray(encodings)) {
							encodings = [encodings];
						};

						// To validate later on getStream
						types.append(this.__contentEncodings, encodings.map(encoding => encoding.toLowerCase())); // case-insensitive
					}),
				})));
				
				httpMixIns.REGISTER(doodad.MIX_IN(serverMixIns.Server.$extend(
				{
					$TYPE_NAME: 'Server',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('ServerMixIn')), true) */,

					protocol: doodad.PUBLIC(doodad.READ_ONLY(null)),
					handlersOptions: doodad.PUBLIC(doodad.READ_ONLY(null)),
					options:  doodad.PUBLIC(doodad.READ_ONLY(null)),
				})));
				
				httpMixIns.REGISTER(doodad.MIX_IN(doodad.Class.$extend(
									mixIns.Creatable,
									serverMixIns.Response,
				{
					$TYPE_NAME: 'Handler',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('HandlerMixIn')), true) */,

					$prepare: doodad.PUBLIC(function $prepare(options, /*optional*/parentOptions) {
						options = types.nullObject(options);

						let val;
						
						val = options.depth;
						if (!types.isNothing(val)) {
							val = types.toInteger(val);
						};
						options.depth = val;

						val = options.mimeTypes;
						if (!types.isNothing(val)) {
							if (!types.isArray(val)) {
								val = [val];
							};
							val = tools.map(val, function(typ) {
								return http.parseContentTypeHeader(typ);
							});
						};
						options.mimeTypes = val;
						
						val = options.extensions;
						if (!types.isNothing(val)) {
							if (!types.isArray(val)) {
								val = [val];
							};
							val = tools.map(val, function(ext) {
								return types.toString(ext).toLowerCase();
							});
						};
						options.extensions = val;
						
						val = options.verbs;
						if (!types.isNothing(val)) {
							if (!types.isArray(val)) {
								val = [val];
							};
							val = tools.map(val, function(verb) {
								return types.toString(verb).toUpperCase();
							});
						};
						options.verbs = val;
						
						val = options.caseSensitive;
						if (!types.isNothing(val)) {
							val = types.toBoolean(val);
						};
						options.caseSensitive = val;


						options.depth = (types.isNothing(options.depth) ? (types.isNothing(parentOptions.depth) ? 0 : parentOptions.depth) : options.depth);
						options.extensions = (options.extensions || parentOptions.extensions) && types.unique(options.extensions, parentOptions.extensions);
						options.verbs = (options.verbs || parentOptions.verbs) && types.unique(options.verbs, parentOptions.verbs);
						options.caseSensitive = (types.isNothing(options.caseSensitive) ? !!parentOptions.caseSensitive : options.caseSensitive);

						return options;
					}),

					create: doodad.OVERRIDE(function create(options) {
						this._super();

						_shared.setAttribute(this, 'options', options || types.nullObject());
					}),

					resolve: doodad.PUBLIC(doodad.NOT_IMPLEMENTED()),  // function(request, url)
				})));
				
				
				httpMixIns.REGISTER(doodad.MIX_IN(httpMixIns.Handler.$extend(
				{
					$TYPE_NAME: 'Routes',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('RoutesMixIn')), true) */,
					
					createHandlers: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(request, targetUrl)

					resolve: doodad.OVERRIDE(doodad.MUST_OVERRIDE()),  // function(request, url)
				})));
				
				
				httpMixIns.REGISTER(doodad.MIX_IN(httpMixIns.Handler.$extend(
				{
					$TYPE_NAME: 'Page',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('PageMixIn')), true) */,
					
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
						request.response.addHeaders({Allow: allowed.join(',')});
					})),

					execute: doodad.OVERRIDE(function execute(request) {
						const method = 'execute_' + request.verb;
						if (types.isImplemented(this, method)) {
							return this[method](request);
						} else {
							return request.response.respondWithStatus(types.HttpStatus.NotImplemented);
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
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('NullPage')), true) */,
				}));

				http.REGISTER(doodad.Object.$extend(
									httpMixIns.Page,
				{
					$TYPE_NAME: 'StatusPage',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('StatusPage')), true) */,
					
					$prepare: doodad.OVERRIDE(function $prepare(options, /*optional*/parentOptions) {
						types.getDefault(options, 'depth', 0);

						options = this._super(options, parentOptions);
						
						let val;
						
						options.status = types.toInteger(options.status);

						return options;
					}),
					
					execute_HEAD: doodad.OVERRIDE(function execute_HEAD(request) {
						return request.response.respondWithStatus(this.options.status);
					}),
					execute_GET: doodad.OVERRIDE(function execute_GET(request) {
						return request.response.respondWithStatus(this.options.status);
					}),
				}));

				http.REGISTER(doodad.BASE(doodad.Object.$extend(
									httpMixIns.Page,
				{
					$TYPE_NAME: 'StaticPage',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('StaticPageBase')), true) */,

					getSystemPath: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(request)

					execute_HEAD: doodad.OVERRIDE(doodad.MUST_OVERRIDE()),
					execute_GET: doodad.OVERRIDE(doodad.MUST_OVERRIDE()),

				})));

				/* TODO: Terminate and Test
				http.REGISTER(doodad.BASE(widgets.Widget.$extend(
									httpMixIns.Page,
				{
					$TYPE_NAME: 'WidgetPage',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('WidgetPageBase')), true) * /,
					
					execute_GET: doodad.OVERRIDE(function(request) {
						const result = this.show(request);
						if (result !== false) {
							const stream = request.response.getStream();
							this.render(stream);
						};
					}),
					execute_POST: doodad.OVERRIDE(function(request) {
						const result = this.load(request);
						if (result !== false) {
							const stream = request.response.getStream();
							this.render(stream);
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
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('RedirectHandler')), true) */,
					
					$prepare: doodad.OVERRIDE(function $prepare(options, /*optional*/parentOptions) {
						types.getDefault(options, 'depth', 0);

						options = this._super(options, parentOptions);
						
						let val;
						
						val = options.targetUrl;
						if (types.isString(val)) {
							val = files.Url.parse(val);
						};
						options.targetUrl = val;
						
						options.internal = types.toBoolean(options.internal);
						
						options.permanent = types.toBoolean(options.permanent);

						return options;
					}),
					
					execute: doodad.OVERRIDE(function execute(request) {
						const handlerState = request.getHandlerState(this);
						const url = handlerState.url.combine(this.options.targetUrl).set({isRelative: false});
						if (this.options.internal) {
							return request.redirectServer(url);
						} else {
							return request.redirectClient(url, this.options.permanent);
						};
					}),
				}));


				http.REGISTER(doodad.Object.$extend(
									httpMixIns.Handler,
				{
					$TYPE_NAME: 'CrossOriginHandler',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('CrossOriginHandler')), true) */,
					
					$prepare: doodad.OVERRIDE(function(options, /*optional*/parentOptions) {
						types.getDefault(options, 'depth', Infinity);

						options = this._super(options, parentOptions);
						
						let val;
						
						val = options.allowedOrigins;
						if (!types.isNothing(val)) {
							if (!types.isArray(val)) {
								val = [val];
							};
							val = tools.map(val, tools.toString);
						};
						options.allowedOrigins = val || [];
						
						val = options.allowedHeaders;
						if (!types.isNothing(val)) {
							if (!types.isArray(val)) {
								val = [val];
							};
							val = tools.map(val, tools.toString);
						};
						options.allowedHeaders = val || [];
						
						val = options.exposedHeaders;
						if (!types.isNothing(val)) {
							if (!types.isArray(val)) {
								val = [val];
							};
							val = tools.map(val, tools.toString);
						};
						options.exposedHeaders = val || [];
						
						options.allowCredentials = types.toBoolean(options.allowCredentials);
						
						val = options.maxAge;
						options.maxAge = (types.isNothing(val) ? null : types.toInteger(val) || null);

						return options;
					}),

					execute_OPTIONS: doodad.PROTECTED(doodad.ASYNC(function execute_OPTIONS(request) {
						const cors = request.getHeader('Origin');
						if (cors) {
							// Preflight CORS
							
							const allowedOrigins = this.options.allowedOrigins;
							if (allowedOrigins.length && (tools.indexOf(allowedOrigins, cors) < 0))
								{ // Case sensitive
								// Invalid origin
								return request.end();
							};

							const allowCredentials = this.options.allowCredentials;
							
							const wantedMethod = request.getHeader('Access-Control-Request-Method');
							if (!wantedMethod) {
								// No method
								return request.end();
							};
							
							const allowedMethods = this.options.verbs || ['HEAD', 'GET', 'POST'];
							if (tools.indexOf(allowedMethods, wantedMethod) < 0) { // Case sensitive
								// Invalid method
								return request.end();
							};
							
							let wantedHeaders = request.getHeader('Access-Control-Request-Headers');
							const allowedHeaders = this.options.allowedHeaders;
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
									return request.end();
								};
							};
							
							request.response.addHeaders({
								'Access-Control-Max-Age': (types.isNothing(this.options.maxAge) ? '' : types.toString(this.options.maxAge)),
								'Access-Control-Allow-Origin': (allowCredentials || allowedOrigins.length ? cors : '*'),
								'Access-Control-Allow-Credentials': (allowCredentials ? 'true' : 'false'),
								'Access-Control-Allow-Methods': allowedMethods.join(', '),
								'Access-Control-Allow-Headers': allowedHeaders.join(', '),
							});

							request.setFullfilled(false);
						};
					})),
					
					execute: doodad.OVERRIDE(function execute(request) {
						const method = 'execute_' + request.verb;
						if (types.isImplemented(this, method)) {
							return this[method](request);
							
						} else {
							const cors = request.getHeader('Origin');
							if (cors) {
								const allowedOrigins = this.options.allowedOrigins;
								if (allowedOrigins.length && (tools.indexOf(allowedOrigins, cors) < 0)) { // Case sensitive
									// Invalid origin
									return request.end();
								};
								
								const allowedMethods = this.options.verbs || ['HEAD', 'GET', 'POST'];
								if (tools.indexOf(allowedMethods, request.verb) < 0) { // Case sensitive
									// Invalid method
									return request.end();
								};
								
								const allowCredentials = this.options.allowCredentials;
								
								const exposedHeaders = this.options.exposedHeaders;
								
								request.response.addHeaders({
									'Access-Control-Allow-Origin': (allowCredentials || allowedOrigins.length ? cors : '*'),
									'Access-Control-Allow-Credentials': (allowCredentials ? 'true' : 'false'),
									'Access-Control-Expose-Headers': exposedHeaders.join(', '),
								});

								request.setFullfilled(false);
							};
						};
					}),
				}));

				http.REGISTER(doodad.Object.$extend(
									httpMixIns.Handler,
				{
					$TYPE_NAME: 'ContentSecurityPolicyHandler',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('ContentSecurityPolicyHandler')), true) */,

					$createPolicy: doodad.PUBLIC(doodad.TYPE(function $createPolicy() {
						return types.nullObject({
							'base-uri': null,
							'child-src': null,
							'connect-src': null,
							'default-src': null,
							'font-src': null,
							'form-action': null,
							'frame-ancestors': null,
							'frame-src': null,
							'img-src': null,
							'manifest-src': null,
							'media-src': null,
							'object-src': null,
							'plugin-types': null, // mime-types
							//'referrer': null, // obsolete
							'require-sri-for': null, // 'script', 'style', 'script style'
							'sandbox': null,
							'script-src': null,
							'style-src': null,
							'worker-src': null,
							'block-all-mixed-content': null,
							'upgrade-insecure-requests': null,
						});
					})),
					
					$updatePolicy: doodad.PUBLIC(doodad.TYPE(function $updatePolicy(policy, value, /*optional*/replace) {
						tools.forEach(tools.trim(value, ';', 0).split(';'), function(val) {
							const args = val.trim().split(' ');
							const name = args[0].toLowerCase();
							if (!(name in policy)) {
								throw new types.Error("Invalid or unknown policy name : '~0~'.", [name]);
							};
							if (replace || !policy[name]) {
								policy[name] = types.nullObject();
							};
							const obj = policy[name];
							if (args.length > 1) {
								tools.forEach(args.slice(1), function(val) {
									obj[val.trim()] = true;
								});
							};
						});
					})),

					$getPolicyString: doodad.PUBLIC(doodad.TYPE(function $getPolicyString(policy) {
						let value = '';
						tools.forEach(policy, function(args, name) {
							if (args) {
								value += '; ' + name;
								tools.forEach(args, function(dummy, arg) {
									value += ' ' + arg;
								});
							};
						});
						return value.slice(2);
					})),

					$prepare: doodad.OVERRIDE(function(options, /*optional*/parentOptions) {
						types.getDefault(options, 'depth', Infinity);

						options = this._super(options, parentOptions);
						
						let val;

						val = options.policy;
						const policy = this.$createPolicy();
						if (val) {
							this.$updatePolicy(policy, val);
						};
						options.policy = this.$getPolicyString(policy);
						
						const self = this;
						options.state = {
							policy: doodad.READ_ONLY(this.$createPolicy()),
							update: doodad.PUBLIC(function(value, /*optional*/replace) {
								self.$updatePolicy(this.policy, value, replace);
							}),
						};

						return options;
					}),

					__onGetStream: doodad.PROTECTED(function __onGetStream(ev) {
						const request = ev.handlerData[0];

						const type = types.getType(this);
						const state = request.getHandlerState(this);

						const contentType = request.getAcceptables(request.response.contentType, {handler: this})[0];
						if (contentType) {
							state.update(this.options.policy);
						};

						const value = type.$getPolicyString(state.policy);

						request.response.addHeader('Content-Security-Policy', value);
					}),

					execute: doodad.OVERRIDE(function(request) {
						request.response.onGetStream.attach(this, this.__onGetStream, null, [request]);
					}),
				}));

/* TODO: Complete and test
				http.REGISTER(doodad.Object.$extend(
									httpMixIns.Handler,
				{
					$TYPE_NAME: 'ContentSecurityPolicyReportHandler',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('ContentSecurityPolicyReportHandler')), true) * /,
					
					$prepare: doodad.OVERRIDE(function(options, /*optional* /parentOptions) {
						types.getDefault(options, 'depth', Infinity);

						options = this._super(options, parentOptions);
						
						let val;
						
						//CSP: report-uri
						//Content-Security-Policy-Report-Only: default-src https:; report-uri /endpoint

						return options;
					}),

					execute: doodad.OVERRIDE(function execute(request) {
						request.response.addHeaders({
						});

						request.setFullfilled(false);
					}),
				}));
*/

				http.REGISTER(doodad.Object.$extend(
									httpMixIns.Handler,
				{
					$TYPE_NAME: 'UpgradeInsecureRequestsHandler',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('UpgradeInsecureRequestsHandler')), true) */,
					
					$prepare: doodad.OVERRIDE(function(options, /*optional*/parentOptions) {
						types.getDefault(options, 'depth', Infinity);

						options = this._super(options, parentOptions);

						var val;
						
						options.sslPort = (types.toInteger(options.sslPort) || 443);

						val = options.sslDomain;
						options.sslDomain = (types.isNothing(val) ? null : types.toString(val));

						options.hstsSafe = types.toBoolean(options.hstsSafe);

						options.hstsMaxAge = (types.toInteger(options.hstsMaxAge) || 10886400);

						return options;
					}),

					execute: doodad.OVERRIDE(function execute(request) {
						const cspState = request.getHandlerState(http.ContentSecurityPolicyHandler);
						if (!cspState) {
							return;
						};

						const uirs = request.getHeader('Upgrade-Insecure-Requests');

						if (this.options.hstsSafe) {
							request.response.addHeader('Strict-Transport-Security', 'max-age=' + types.toString(this.options.hstsMaxAge) + '; preload');
							cspState.update('block-all-mixed-content');
						} else {
							cspState.update('upgrade-insecure-requests');
						};
						
						if (uirs === '1') {
							request.response.setVary('Upgrade-Insecure-Requests');
							
							if (!this.options.hstsSafe) {
								request.response.addHeaders({
									'Strict-Transport-Security': 'max-age=' + types.toString(this.options.hstsMaxAge),
								});
							};
						};

						request.setFullfilled(false);
						
						if (this.options.hstsSafe || (uirs === '1')) {
							if ((request.url.protocol !== 'https') && (request.url.domain || this.options.sslDomain)) {
								const opts = {protocol: 'https', port: this.options.sslPort};
								if (this.options.sslDomain) {
									opts.domain = this.options.sslDomain;
								};
								const url = request.url.set(opts);
								return request.redirectClient(url);
							};
						};
					}),
				}));


				http.REGISTER(doodad.Object.$extend(
									httpMixIns.Handler,
				{
					$TYPE_NAME: 'ClientCrashHandler',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('ClientCrashHandler')), true) */,
					
					$prepare: doodad.OVERRIDE(function(options, /*optional*/parentOptions) {
						types.getDefault(options, 'depth', Infinity);

						options = this._super(options, parentOptions);

						var val;
						
						val = options.reportUrl;
						options.reportUrl = (val ? files.Url.parse(val) : null);

						return options;
					}),

					execute: doodad.OVERRIDE(function execute(request) {
						if (request.clientCrashed) {
							if (this.options.reportUrl) {
								return request.redirectClient(request.url.combine(this.options.reportUrl));
							} else {
								// TODO: Use "crashRecovery" flag
								return request.redirectClient(request.url.setArgs({crashRecovery: true})); // NOTE: "?crashReport=true" is removed by the "Request" object
							};
						};
					}),
				}));


				http.REGISTER(doodad.BASE(doodad.Object.$extend(
									httpMixIns.Server,
				{
					$TYPE_NAME: 'Server',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('ServerBase')), true) */,

					create: doodad.OVERRIDE(function create(handlersOptions, /*optional*/serverOptions) {
						this._super();

						serverOptions = types.nullObject(serverOptions);

						var val;
						
						val = serverOptions.validHosts;
						if (!types.isNothing(val) && !types.isArray(val)) {
							val = [val];
						};
						serverOptions.validHosts = val;

						_shared.setAttributes(this, {
							handlersOptions: http.prepareHandlersOptions(handlersOptions),
							options: serverOptions,
						});
					}),
				})));


				http.REGISTER(doodad.BASE(doodad.Object.$extend(
				{
					$TYPE_NAME: 'RequestMatcher',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('RequestMatcherBase')), true) */,
					
					match: doodad.PUBLIC(doodad.MUST_OVERRIDE()), // function(request, url, handlerOptions)
				})));
				
				
				http.REGISTER(http.RequestMatcher.$extend(
				{
					$TYPE_NAME: 'UrlMatcher',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('UrlMatcher')), true) */,
					
					baseUrl: doodad.PUBLIC( null ),
					allowArguments: doodad.PUBLIC( true ),
					
					create: doodad.OVERRIDE(function create(baseUrl) {
						this._super();
						if (types.isString(baseUrl)) {
							baseUrl = files.Url.parse(baseUrl);
						};
						root.DD_ASSERT && root.DD_ASSERT((baseUrl instanceof files.Url), "Invalid url.");
						this.baseUrl = baseUrl;
					}),
					
					match: doodad.OVERRIDE(function match(request, requestUrl, handlerOptions) {
						const urlPath = requestUrl.toArray({pathOnly: true, trim: true});
						const urlPathLen = urlPath.length;

						const basePath = this.baseUrl.toArray({pathOnly: true, trim: true});
						const basePathLen = basePath.length;

						let weight = 0,    // weight
							full = false,  // full match
							url = null,    // matching URL
							urlRemaining = null; // what remains from request's url

						const urlArgs = types.nullObject(),
							queryArgs = types.nullObject();

						if (basePathLen <= urlPathLen) {
							let urlLevel = 0,     // path level (used later to remove the beginning of the path)
								starStar = false,
								starStarWeight = 0,
								i = 0;
							
							const maxDepth = handlerOptions.depth,
								allowArgs = this.allowArguments;
						
							while (urlLevel < urlPathLen) {
								let name1 = (i < basePathLen ? basePath[i] : null),
									name2 = urlPath[urlLevel],
									name1Lc,
									name2Lc;
								if (handlerOptions.caseSensitive) {
									name1Lc = name1;
									name2Lc = name2;
								} else {
									name1Lc = name1 && name1.toLowerCase();
									name2Lc = name2 && name2.toLowerCase();
								};
								if (name1 === '**') {
									starStar = true;
									starStarWeight = 0;
									i++;
								} else {
									if (starStar) {
										if (name1Lc === name2Lc) {
											i++;
											starStar = false;
											weight += starStarWeight + 1;
										} else {
											starStarWeight++;
										};
									} else {
										const pos = (name1 && allowArgs ? name1.indexOf(':') : -1);
										if (pos >= 0) {
											// Url arguments matching and extraction : ex. "/invoice/id:/edit" will match "/invoice/194/edit"
											let val = name1.slice(pos + 1).trim();
											if ((val[0] === '(') && (val.slice(-1) === ')')) {
												// RegExp matching
												val = new _shared.Natives.windowRegExp('^' + val + '$', handlerOptions.caseSensitive ? '' : 'i');
												val = val.exec(name2Lc);
												if (!val) {
													break;
												};
												if (val.length > 2) {
													val = val.slice(2);
												} else {
													val = val[1];
												};
											} else {
												val = name2;
											};
											name1 = name1.slice(0, pos).trim();
											urlArgs[name1] = val;
										} else if ((name1 !== '*') && (name1Lc !== name2Lc)) {
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
							
							const ar = urlPath.slice(urlLevel);
							let file = null;
							if (requestUrl.file) {
								file = ar.pop();
							};

							urlRemaining = files.Url.parse(null, {
								isRelative: true,
								path: ar,
								file: file,
								args: requestUrl.args,
							});

							if (allowArgs) {
								// Query string matching and extraction : ex. "/invoice/edit?id&details=1" will match "/invoice/edit?id=194&details=1"
								const args = this.baseUrl.args.toArray();
								if (args) {
									for (let i = 0; i < args.length; i++) {
										const arg = args[i],
											name = arg[0];
										if (name) {
											if (urlRemaining.args.has(name)) {
												let val = arg[1];
												let remainingVal = (urlRemaining.args.get(name, true) || '');
												if (val === null) {
													val = remainingVal;
													if (!handlerOptions.caseSensitive) {
														val = val.toLowerCase();
													};
												} else if ((val[0] === '(') && (val.slice(-1) === ')')) {
													// RegExp matching
													val = new _shared.Natives.windowRegExp('^' + val + '$', handlerOptions.caseSensitive ? '' : 'i');
													val = val.exec(remainingVal);
													if (!val) {
														weight = 0;
														full = false;
														break;
													};
													if (val.length > 2) {
														val = val.slice(2);
													} else {
														val = val[1];
													};
												} else {
													if (!handlerOptions.caseSensitive) {
														val = val.toLowerCase();
														remainingVal = remainingVal.toLowerCase();
													};
													if (val !== remainingVal) {
														weight = 0;
														full = false;
														break;
													};
												};
												queryArgs[name] = val;
												weight++;
											} else {
												weight = 0;
												full = false;
												break;
											};
										};
									};
								};
							};
						};

						return types.nullObject({
							weight: weight,
							full: full,
							url: url,
							urlRemaining: urlRemaining,
							urlArgs: urlArgs,
							queryArgs: queryArgs,
						});
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
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('Routes')), true) */,

					routes: doodad.PUBLIC(doodad.READ_ONLY(null)),

					$prepare: doodad.OVERRIDE(function $prepare(options, /*optional*/parentOptions) {
						types.getDefault(options, 'depth', Infinity);

						options = this._super(options, parentOptions);

						return options;
					}),

					create: doodad.OVERRIDE(function create(routes, /*optional*/options) {
						this._super(options);

						_shared.setAttributes(this, {
							routes: new types.Map(),
						});
						
						this.addRoutes(routes);
					}),
					
					addRoutes: doodad.PUBLIC(function addRoutes(newRoutes) {
						root.DD_ASSERT && root.DD_ASSERT((newRoutes instanceof types.Map) || types.isObject(newRoutes), "Invalid routes.");

						const routes = this.routes;

						tools.forEach(newRoutes, function(route, matcher) {
							if (!types.isNothing(route)) {
								root.DD_ASSERT && root.DD_ASSERT(types.isJsObject(route), "Invalid route.");
							
								route = types.nullObject(route);

								if (route.handlers && route.handlers.length) {
									if (types.isString(matcher)) {
										matcher = new http.UrlMatcher(matcher);
									};
									root.DD_ASSERT && root.DD_ASSERT((matcher instanceof http.RequestMatcher), "Invalid request matcher.");
							
									route.id = types.getSymbol();
									route.prepared = false;

									routes.set(matcher, route);
								};
							};
						}, this);
					}),
					
					createHandlers: doodad.OVERRIDE(function createHandlers(request, targetUrl) {
						let handlers = tools.reduce(this.routes, function(handlers, route, matcher) {
							const routeId = route.id;

							if (!route.prepared) {
								route.handlers = http.prepareHandlersOptions(route.handlers, this.options);
								route.prepared = true;
							};

							const handlersOptions = route.handlers;

							for (let i = 0; i < handlersOptions.length; i++) {
								const options = types.nullObject(handlersOptions[i]);

								if (options.verbs && (tools.indexOf(options.verbs, request.verb) === -1)) {
									continue;
								};
								
								if (options.extensions && targetUrl.file) {
									if (tools.indexOf(options.extensions, targetUrl.extension) === -1) {
										continue;
									};
								};

								const matcherResult = matcher.match(request, targetUrl, options);

								if ((matcherResult.weight > 0) || matcherResult.full) {
//matcherResult && matcherResult.urlRemaining && console.log(matcherResult.urlRemaining.toString());
									options.parent = this;
									options.routeId = routeId;
									options.routeIndex = i;
									options.matcherResult = matcherResult;
									handlers.push(options);
								};
							};
							
							return handlers;
						}, [], this);

						// NOTE: Sort descending
						handlers = handlers.sort(function(handler1, handler2) {
							if ((handler1.routeId === handler2.routeId) && (handler1.routeIndex > handler2.routeIndex)) {
								return 1;
							} else if ((handler1.routeId === handler2.routeId) && (handler1.routeIndex < handler2.routeIndex)) {
								return -1;
							} else if (handler1.matcherResult.full && !handler2.matcherResult.full) {
								return -1;
							} else if (!handler1.matcherResult.full && handler2.matcherResult.full) {
								return 1;
							} else if (handler1.matcherResult.weight > handler2.matcherResult.weight) {
								return -1;
							} else if (handler1.matcherResult.weight < handler2.matcherResult.weight) {
								return 1;
							} else {
								return 0;
							};
						});

						return handlers;
					}),
					
					execute: doodad.OVERRIDE(function execute(request) {
						const state = request.getHandlerState(this);
						const url = (state && state.matcherResult ? state.matcherResult.urlRemaining : request.url);
						const handlers = this.createHandlers(request, url);
						return request.proceed(handlers);
					}),

					resolve: doodad.OVERRIDE(function resolve(request, url) {
						// TODO: Validate domain with the server instead of just clearing it
						//url = files.parseUrl(url).set({domain: null});
						return this.createHandlers(request, url);
					}),

				}));


				http.REGISTER(doodad.Object.$extend(
									httpMixIns.Handler,
				{
					$TYPE_NAME: 'JsonBodyHandler',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('JsonBodyHandler')), true) */,
					
					/*
					$prepare: doodad.OVERRIDE(function $prepare(options, /*optional* /parentOptions) {
						types.getDefault(options, 'depth', Infinity);

						options = this._super(options, parentOptions);

						return options;
					}),
					*/
					
					__onGetStream: doodad.PROTECTED(function __onGetStream(ev) {
						const request = ev.handlerData[0];
						const contentType = request.contentType;
						if (contentType && (contentType.name === 'application/json')) {
							const encoding = contentType.params.charset || 'utf-8';

							if (!ioJson.Stream.$isValidEncoding(encoding)) {
								ev.data.stream = request.response.respondWithStatus(types.HttpStatus.UnsupportedMediaType);
								return;
							};

							const stream = new ioJson.Stream({encoding: encoding});

							request.onSanitize.attachOnce(null, function() {
								types.DESTROY(stream);
							});

							request.addPipe(stream);
						};
					}),

					execute: doodad.OVERRIDE(function(request) {
						request.setStreamOptions({
							accept: 'application/json', 
						});

						request.onGetStream.attach(this, this.__onGetStream, null, [request]);
					}),
				}));


		/* TODO: Test me
				http.REGISTER(doodad.Object.$extend(
									httpMixIns.Handler,
				{
					$TYPE_NAME: 'XmlBodyHandler',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('XmlBodyHandler')), true) * /,
					
					/ *
					$prepare: doodad.OVERRIDE(function $prepare(options, /*optional* /parentOptions) {
						types.getDefault(options, 'depth', Infinity);

						options = this._super(options, parentOptions);

						return options;
					}),
					* /
					
					__onGetStream: doodad.PROTECTED(function __onGetStream(ev) {
						const request = ev.handlerData[0];
						const contentType = request.contentType;
						if ((contentType.name === 'application/xml') || (contentType.name === 'text/xml')) {
							const encoding = contentType.params.charset || 'utf-8';

							if (!ioXml.Stream.$isValidEncoding(encoding)) {
								ev.data.stream = request.response.respondWithStatus(types.HttpStatus.UnsupportedMediaType);
								return;
							};

							const stream = new ioXml.Stream({encoding: encoding});
							request.addPipe(stream);
						};
					}),

					execute: doodad.OVERRIDE(function(request) {
						request.setStreamOptions({
							accept: ['application/xml', 'text/xml'], 
						});

						request.onGetStream.attach(this, this.__onGetStream, null, [request]);
					}),
				}));
		*/

				http.REGISTER(doodad.Object.$extend(
									httpMixIns.Handler,
				{
					$TYPE_NAME: 'UrlBodyHandler',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('UrlBodyHandler')), true) */,
					
					$prepare: doodad.OVERRIDE(function $prepare(options, /*optional*/parentOptions) {
						types.getDefault(options, 'depth', Infinity);

						options = this._super(options, parentOptions);

						let val;

						val = options.maxStringLength;
						if (!types.isNothing(val)) {
							val = types.toInteger(val);
						};
						options.maxStringLength = val;

						return options;
					}),
					
					__onGetStream: doodad.PROTECTED(function __onGetStream(ev) {
						const request = ev.handlerData[0];
						const contentType = request.contentType;
						if (contentType && (contentType.name === 'application/x-www-form-urlencoded')) {
							const encoding = contentType.params.charset || 'utf-8';

							if (!io.UrlDecoderStream.$isValidEncoding(encoding)) {
								ev.data.stream = request.response.respondWithStatus(types.HttpStatus.UnsupportedMediaType);
								return;
							};

							const options = {encoding: encoding};

							if (this.options.maxStringLength) {
								options.maxStringLength = this.options.maxStringLength;
							};

							const stream = new io.UrlDecoderStream(options);

							request.onSanitize.attachOnce(null, function () {
								types.DESTROY(stream);
							});

							request.addPipe(stream);
						};
					}),

					execute: doodad.OVERRIDE(function(request) {
						request.setStreamOptions({
							accept: 'application/x-www-form-urlencoded', 
						});

						request.onGetStream.attach(this, this.__onGetStream, null, [request]);
					}),
				}));


				http.REGISTER(doodad.Object.$extend(
									httpMixIns.Handler,
				{
					$TYPE_NAME: 'Base64BodyHandler',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('Base64BodyHandler')), true) */,
					
					//$prepare: doodad.OVERRIDE(function $prepare(options, /*optional* /parentOptions) {
					//	types.getDefault(options, 'depth', Infinity);
					//
					//	options = this._super(options, parentOptions);
					//
					//	let val;
					//
					//	return options;
					//}),
					
					__onGetStream: doodad.PROTECTED(function __onGetStream(ev) {
						const request = ev.handlerData[0];
						const contentEncoding = request.getHeader('Content-Transfer-Encoding');

						request.response.setVary('Content-Transfer-Encoding');

						if (contentEncoding === 'base64') {
							const stream = new io.Base64DecoderStream();

							request.onSanitize.attachOnce(null, function () {
								types.DESTROY(stream);
							});

							request.addPipe(stream);
						};
					}),

					execute: doodad.OVERRIDE(function(request) {
						request.onGetStream.attach(this, this.__onGetStream, null, [request]);
					}),
				}));


				http.REGISTER(doodad.Object.$extend(
									httpMixIns.Handler,
				{
					$TYPE_NAME: 'TextBodyHandler',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('TextBodyHandler')), true) */,
					
					//$prepare: doodad.OVERRIDE(function $prepare(options, /*optional*/parentOptions) {
					//	types.getDefault(options, 'depth', Infinity);
					//
					//	options = this._super(options, parentOptions);
					//
					//	let val;
					//
					//	return options;
					//}),
					
					__onGetStream: doodad.PROTECTED(function __onGetStream(ev) {
						const request = ev.handlerData[0];
						const contentType = request.contentType;
						if (contentType && (contentType.name === 'text/plain')) {
							const encoding = contentType.params.charset || 'utf-8';

							if (!io.TextDecoderStream.$isValidEncoding(encoding)) {
								ev.data.stream = request.response.respondWithStatus(types.HttpStatus.UnsupportedMediaType);
								return;
							};

							const stream = new io.TextDecoderStream({encoding: encoding});

							request.onSanitize.attachOnce(null, function () {
								types.DESTROY(stream);
							});

							request.addPipe(stream);
						};
					}),

					execute: doodad.OVERRIDE(function(request) {
						request.setStreamOptions({
							accept: 'text/plain', 
						});

						request.onGetStream.attach(this, this.__onGetStream, null, [request]);
					}),
				}));


				http.REGISTER(doodad.Object.$extend(
									httpMixIns.Handler,
				{
					$TYPE_NAME: 'FormMultipartBodyHandler',
					$TYPE_UUID: '' /*! INJECT('+' + TO_SOURCE(UUID('FormMultipartBodyHandler')), true) */,
					
					$prepare: doodad.OVERRIDE(function $prepare(options, /*optional*/parentOptions) {
						types.getDefault(options, 'depth', Infinity);

						options = this._super(options, parentOptions);
					
						//let val;
					
						options.state = {
							attached: false,
						};

						return options;
					}),
				
					__onBOF: doodad.PROTECTED(function __onBOF(ev) {
						const request = ev.handlerData[0],
							mpStream = ev.handlerData[1];

						request.clearHeaders();

						if (!ev.data.end) {
							request.addHeaders(ev.data.headers);

							const contentType = request.contentType;
							if (!contentType) {
								request.addHeader('Content-Type', 'text/plain');
							};
						};
					}),

					__onGetStream: doodad.PROTECTED(function __onGetStream(ev) {
						const request = ev.handlerData[0];
						
						let mpStream = ev.handlerData[1];

						// Prevents the request from returning "this.stream"
						ev.preventDefault();

						const contentType = request.contentType;
						if (!mpStream || (contentType.name === 'multipart/mixed')) {
							mpStream = new io.FormMultipartDecoderStream({boundary: contentType.params.boundary});

							request.onSanitize.attachOnce(null, function () {
								types.DESTROY(mpStream);
							});

							request.addPipe(mpStream);

							mpStream.onBOF.attach(this, this.__onBOF, 10, [request, mpStream])
						} else {
							ev.data.stream = mpStream;
							mpStream.unpipe();
						};

						request.onGetStream.attachOnce(this, this.__onGetStream, 10, [request, mpStream]);
					}),

					execute: doodad.OVERRIDE(function(request) {
						const state = request.getHandlerState(this);
						const contentType = request.contentType;
						if (!state.attached && (contentType.name === 'multipart/form-data')) {
							state.attached = true;

							request.setStreamOptions({
								accept: 'multipart/form-data, multipart/mixed', 
							});

							request.onGetStream.attachOnce(this, this.__onGetStream, 10, [request, null]);
						};
					}),
				}));


				http.REGISTER(types.createErrorType("ProceedNewHandlers", types.ScriptInterruptedError, function _new(handlersOptions, /*optional*/message, /*optional*/params) {
					this._this.handlersOptions = handlersOptions;
					this.superArgs = [message || "Will proceed with a new Handler object.", params];
				}));
				
				
				http.REGISTER(types.createErrorType("StreamAborted", types.ScriptInterruptedError, function _new(/*optional*/message, /*optional*/params) {
					this.superArgs = [message || "'getStream' has been aborted.", params];
				}));
				
				
				return function init(/*optional*/options) {
					return locale.load('en_US').then(function loadLocaleCallback(locale) {
						__Internal__.enUSLocale = locale;
					});
				};
			},
		};
		return DD_MODULES;
	},
};
//! END_MODULE()