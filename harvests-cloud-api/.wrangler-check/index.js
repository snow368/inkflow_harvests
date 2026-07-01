var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/hono/dist/compose.js
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/body.js
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");

// node_modules/hono/dist/utils/url.js
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder2) => {
  try {
    return decoder2(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder2(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURIComponent_), "tryDecodeURIComponent");
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * `.bytes()` parses the request body as a `Uint8Array`.
   *
   * @see {@link https://hono.dev/docs/api/request#bytes}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.bytes()
   * })
   * ```
   */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var createResponseInstance = /* @__PURE__ */ __name((body, init) => new Response(body, init), "createResponseInstance");
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = /* @__PURE__ */ __name((name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, { status, headers: responseHeaders });
  }
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = /* @__PURE__ */ __name((text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  }, "text");
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class _Hono {
  static {
    __name(this, "_Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler, baseRoutePath) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  }, "request");
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name(((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }), "match2");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = class _Node {
  static {
    __name(this, "_Node");
  }
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
__name(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var hasChildren = /* @__PURE__ */ __name((children) => {
  for (const _ in children) {
    return true;
  }
  return false;
}, "hasChildren");
var Node2 = class _Node2 {
  static {
    __name(this, "_Node");
  }
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              this.#pushHandlerSets(handlerSets, astNode, method, node.#params);
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          if (matcher instanceof RegExp) {
            if (partOffsets === null) {
              partOffsets = new Array(len);
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.substring(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (hasChildren(child.#children)) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// node_modules/hono/dist/middleware/cors/index.js
var cors = /* @__PURE__ */ __name((options) => {
  const opts = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: [],
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return /* @__PURE__ */ __name(async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    __name(set, "set");
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*") {
        set("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*") {
      c.header("Vary", "Origin", { append: true });
    }
  }, "cors2");
}, "cors");

// node_modules/jose/dist/webapi/lib/buffer_utils.js
var encoder = new TextEncoder();
var decoder = new TextDecoder();
var MAX_INT32 = 2 ** 32;
function concat(...buffers) {
  const size = buffers.reduce((acc, { length }) => acc + length, 0);
  const buf = new Uint8Array(size);
  let i = 0;
  for (const buffer of buffers) {
    buf.set(buffer, i);
    i += buffer.length;
  }
  return buf;
}
__name(concat, "concat");
function encode(string) {
  const bytes = new Uint8Array(string.length);
  for (let i = 0; i < string.length; i++) {
    const code = string.charCodeAt(i);
    if (code > 127) {
      throw new TypeError("non-ASCII string encountered in encode()");
    }
    bytes[i] = code;
  }
  return bytes;
}
__name(encode, "encode");

// node_modules/jose/dist/webapi/lib/base64.js
function decodeBase64(encoded) {
  if (Uint8Array.fromBase64) {
    return Uint8Array.fromBase64(encoded);
  }
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
__name(decodeBase64, "decodeBase64");

// node_modules/jose/dist/webapi/util/base64url.js
function decode(input) {
  if (Uint8Array.fromBase64) {
    return Uint8Array.fromBase64(typeof input === "string" ? input : decoder.decode(input), {
      alphabet: "base64url"
    });
  }
  let encoded = input;
  if (encoded instanceof Uint8Array) {
    encoded = decoder.decode(encoded);
  }
  encoded = encoded.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return decodeBase64(encoded);
  } catch {
    throw new TypeError("The input to be decoded is not correctly encoded.");
  }
}
__name(decode, "decode");

// node_modules/jose/dist/webapi/lib/crypto_key.js
var unusable = /* @__PURE__ */ __name((name, prop = "algorithm.name") => new TypeError(`CryptoKey does not support this operation, its ${prop} must be ${name}`), "unusable");
var isAlgorithm = /* @__PURE__ */ __name((algorithm, name) => algorithm.name === name, "isAlgorithm");
function getHashLength(hash) {
  return parseInt(hash.name.slice(4), 10);
}
__name(getHashLength, "getHashLength");
function checkHashLength(algorithm, expected) {
  const actual = getHashLength(algorithm.hash);
  if (actual !== expected)
    throw unusable(`SHA-${expected}`, "algorithm.hash");
}
__name(checkHashLength, "checkHashLength");
function getNamedCurve(alg) {
  switch (alg) {
    case "ES256":
      return "P-256";
    case "ES384":
      return "P-384";
    case "ES512":
      return "P-521";
    default:
      throw new Error("unreachable");
  }
}
__name(getNamedCurve, "getNamedCurve");
function checkUsage(key, usage) {
  if (usage && !key.usages.includes(usage)) {
    throw new TypeError(`CryptoKey does not support this operation, its usages must include ${usage}.`);
  }
}
__name(checkUsage, "checkUsage");
function checkSigCryptoKey(key, alg, usage) {
  switch (alg) {
    case "HS256":
    case "HS384":
    case "HS512": {
      if (!isAlgorithm(key.algorithm, "HMAC"))
        throw unusable("HMAC");
      checkHashLength(key.algorithm, parseInt(alg.slice(2), 10));
      break;
    }
    case "RS256":
    case "RS384":
    case "RS512": {
      if (!isAlgorithm(key.algorithm, "RSASSA-PKCS1-v1_5"))
        throw unusable("RSASSA-PKCS1-v1_5");
      checkHashLength(key.algorithm, parseInt(alg.slice(2), 10));
      break;
    }
    case "PS256":
    case "PS384":
    case "PS512": {
      if (!isAlgorithm(key.algorithm, "RSA-PSS"))
        throw unusable("RSA-PSS");
      checkHashLength(key.algorithm, parseInt(alg.slice(2), 10));
      break;
    }
    case "Ed25519":
    case "EdDSA": {
      if (!isAlgorithm(key.algorithm, "Ed25519"))
        throw unusable("Ed25519");
      break;
    }
    case "ML-DSA-44":
    case "ML-DSA-65":
    case "ML-DSA-87": {
      if (!isAlgorithm(key.algorithm, alg))
        throw unusable(alg);
      break;
    }
    case "ES256":
    case "ES384":
    case "ES512": {
      if (!isAlgorithm(key.algorithm, "ECDSA"))
        throw unusable("ECDSA");
      const expected = getNamedCurve(alg);
      const actual = key.algorithm.namedCurve;
      if (actual !== expected)
        throw unusable(expected, "algorithm.namedCurve");
      break;
    }
    default:
      throw new TypeError("CryptoKey does not support this operation");
  }
  checkUsage(key, usage);
}
__name(checkSigCryptoKey, "checkSigCryptoKey");

// node_modules/jose/dist/webapi/lib/invalid_key_input.js
function message(msg, actual, ...types) {
  types = types.filter(Boolean);
  if (types.length > 2) {
    const last = types.pop();
    msg += `one of type ${types.join(", ")}, or ${last}.`;
  } else if (types.length === 2) {
    msg += `one of type ${types[0]} or ${types[1]}.`;
  } else {
    msg += `of type ${types[0]}.`;
  }
  if (actual == null) {
    msg += ` Received ${actual}`;
  } else if (typeof actual === "function" && actual.name) {
    msg += ` Received function ${actual.name}`;
  } else if (typeof actual === "object" && actual != null) {
    if (actual.constructor?.name) {
      msg += ` Received an instance of ${actual.constructor.name}`;
    }
  }
  return msg;
}
__name(message, "message");
var invalidKeyInput = /* @__PURE__ */ __name((actual, ...types) => message("Key must be ", actual, ...types), "invalidKeyInput");
var withAlg = /* @__PURE__ */ __name((alg, actual, ...types) => message(`Key for the ${alg} algorithm must be `, actual, ...types), "withAlg");

// node_modules/jose/dist/webapi/util/errors.js
var JOSEError = class extends Error {
  static {
    __name(this, "JOSEError");
  }
  static code = "ERR_JOSE_GENERIC";
  code = "ERR_JOSE_GENERIC";
  constructor(message2, options) {
    super(message2, options);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
};
var JWTClaimValidationFailed = class extends JOSEError {
  static {
    __name(this, "JWTClaimValidationFailed");
  }
  static code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
  code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
  claim;
  reason;
  payload;
  constructor(message2, payload, claim = "unspecified", reason = "unspecified") {
    super(message2, { cause: { claim, reason, payload } });
    this.claim = claim;
    this.reason = reason;
    this.payload = payload;
  }
};
var JWTExpired = class extends JOSEError {
  static {
    __name(this, "JWTExpired");
  }
  static code = "ERR_JWT_EXPIRED";
  code = "ERR_JWT_EXPIRED";
  claim;
  reason;
  payload;
  constructor(message2, payload, claim = "unspecified", reason = "unspecified") {
    super(message2, { cause: { claim, reason, payload } });
    this.claim = claim;
    this.reason = reason;
    this.payload = payload;
  }
};
var JOSEAlgNotAllowed = class extends JOSEError {
  static {
    __name(this, "JOSEAlgNotAllowed");
  }
  static code = "ERR_JOSE_ALG_NOT_ALLOWED";
  code = "ERR_JOSE_ALG_NOT_ALLOWED";
};
var JOSENotSupported = class extends JOSEError {
  static {
    __name(this, "JOSENotSupported");
  }
  static code = "ERR_JOSE_NOT_SUPPORTED";
  code = "ERR_JOSE_NOT_SUPPORTED";
};
var JWSInvalid = class extends JOSEError {
  static {
    __name(this, "JWSInvalid");
  }
  static code = "ERR_JWS_INVALID";
  code = "ERR_JWS_INVALID";
};
var JWTInvalid = class extends JOSEError {
  static {
    __name(this, "JWTInvalid");
  }
  static code = "ERR_JWT_INVALID";
  code = "ERR_JWT_INVALID";
};
var JWKSInvalid = class extends JOSEError {
  static {
    __name(this, "JWKSInvalid");
  }
  static code = "ERR_JWKS_INVALID";
  code = "ERR_JWKS_INVALID";
};
var JWKSNoMatchingKey = class extends JOSEError {
  static {
    __name(this, "JWKSNoMatchingKey");
  }
  static code = "ERR_JWKS_NO_MATCHING_KEY";
  code = "ERR_JWKS_NO_MATCHING_KEY";
  constructor(message2 = "no applicable key found in the JSON Web Key Set", options) {
    super(message2, options);
  }
};
var JWKSMultipleMatchingKeys = class extends JOSEError {
  static {
    __name(this, "JWKSMultipleMatchingKeys");
  }
  [Symbol.asyncIterator];
  static code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
  code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
  constructor(message2 = "multiple matching keys found in the JSON Web Key Set", options) {
    super(message2, options);
  }
};
var JWKSTimeout = class extends JOSEError {
  static {
    __name(this, "JWKSTimeout");
  }
  static code = "ERR_JWKS_TIMEOUT";
  code = "ERR_JWKS_TIMEOUT";
  constructor(message2 = "request timed out", options) {
    super(message2, options);
  }
};
var JWSSignatureVerificationFailed = class extends JOSEError {
  static {
    __name(this, "JWSSignatureVerificationFailed");
  }
  static code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  constructor(message2 = "signature verification failed", options) {
    super(message2, options);
  }
};

// node_modules/jose/dist/webapi/lib/is_key_like.js
var isCryptoKey = /* @__PURE__ */ __name((key) => {
  if (key?.[Symbol.toStringTag] === "CryptoKey")
    return true;
  try {
    return key instanceof CryptoKey;
  } catch {
    return false;
  }
}, "isCryptoKey");
var isKeyObject = /* @__PURE__ */ __name((key) => key?.[Symbol.toStringTag] === "KeyObject", "isKeyObject");
var isKeyLike = /* @__PURE__ */ __name((key) => isCryptoKey(key) || isKeyObject(key), "isKeyLike");

// node_modules/jose/dist/webapi/lib/helpers.js
function decodeBase64url(value, label, ErrorClass) {
  try {
    return decode(value);
  } catch {
    throw new ErrorClass(`Failed to base64url decode the ${label}`);
  }
}
__name(decodeBase64url, "decodeBase64url");

// node_modules/jose/dist/webapi/lib/type_checks.js
var isObjectLike = /* @__PURE__ */ __name((value) => typeof value === "object" && value !== null, "isObjectLike");
function isObject(input) {
  if (!isObjectLike(input) || Object.prototype.toString.call(input) !== "[object Object]") {
    return false;
  }
  if (Object.getPrototypeOf(input) === null) {
    return true;
  }
  let proto = input;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }
  return Object.getPrototypeOf(input) === proto;
}
__name(isObject, "isObject");
function isDisjoint(...headers) {
  const sources = headers.filter(Boolean);
  if (sources.length === 0 || sources.length === 1) {
    return true;
  }
  let acc;
  for (const header of sources) {
    const parameters = Object.keys(header);
    if (!acc || acc.size === 0) {
      acc = new Set(parameters);
      continue;
    }
    for (const parameter of parameters) {
      if (acc.has(parameter)) {
        return false;
      }
      acc.add(parameter);
    }
  }
  return true;
}
__name(isDisjoint, "isDisjoint");
var isJWK = /* @__PURE__ */ __name((key) => isObject(key) && typeof key.kty === "string", "isJWK");
var isPrivateJWK = /* @__PURE__ */ __name((key) => key.kty !== "oct" && (key.kty === "AKP" && typeof key.priv === "string" || typeof key.d === "string"), "isPrivateJWK");
var isPublicJWK = /* @__PURE__ */ __name((key) => key.kty !== "oct" && key.d === void 0 && key.priv === void 0, "isPublicJWK");
var isSecretJWK = /* @__PURE__ */ __name((key) => key.kty === "oct" && typeof key.k === "string", "isSecretJWK");

// node_modules/jose/dist/webapi/lib/signing.js
function checkKeyLength(alg, key) {
  if (alg.startsWith("RS") || alg.startsWith("PS")) {
    const { modulusLength } = key.algorithm;
    if (typeof modulusLength !== "number" || modulusLength < 2048) {
      throw new TypeError(`${alg} requires key modulusLength to be 2048 bits or larger`);
    }
  }
}
__name(checkKeyLength, "checkKeyLength");
function subtleAlgorithm(alg, algorithm) {
  const hash = `SHA-${alg.slice(-3)}`;
  switch (alg) {
    case "HS256":
    case "HS384":
    case "HS512":
      return { hash, name: "HMAC" };
    case "PS256":
    case "PS384":
    case "PS512":
      return { hash, name: "RSA-PSS", saltLength: parseInt(alg.slice(-3), 10) >> 3 };
    case "RS256":
    case "RS384":
    case "RS512":
      return { hash, name: "RSASSA-PKCS1-v1_5" };
    case "ES256":
    case "ES384":
    case "ES512":
      return { hash, name: "ECDSA", namedCurve: algorithm.namedCurve };
    case "Ed25519":
    case "EdDSA":
      return { name: "Ed25519" };
    case "ML-DSA-44":
    case "ML-DSA-65":
    case "ML-DSA-87":
      return { name: alg };
    default:
      throw new JOSENotSupported(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
  }
}
__name(subtleAlgorithm, "subtleAlgorithm");
async function getSigKey(alg, key, usage) {
  if (key instanceof Uint8Array) {
    if (!alg.startsWith("HS")) {
      throw new TypeError(invalidKeyInput(key, "CryptoKey", "KeyObject", "JSON Web Key"));
    }
    return crypto.subtle.importKey("raw", key, { hash: `SHA-${alg.slice(-3)}`, name: "HMAC" }, false, [usage]);
  }
  checkSigCryptoKey(key, alg, usage);
  return key;
}
__name(getSigKey, "getSigKey");
async function verify(alg, key, signature, data) {
  const cryptoKey = await getSigKey(alg, key, "verify");
  checkKeyLength(alg, cryptoKey);
  const algorithm = subtleAlgorithm(alg, cryptoKey.algorithm);
  try {
    return await crypto.subtle.verify(algorithm, cryptoKey, signature, data);
  } catch {
    return false;
  }
}
__name(verify, "verify");

// node_modules/jose/dist/webapi/lib/jwk_to_key.js
var unsupportedAlg = 'Invalid or unsupported JWK "alg" (Algorithm) Parameter value';
function subtleMapping(jwk) {
  let algorithm;
  let keyUsages;
  switch (jwk.kty) {
    case "AKP": {
      switch (jwk.alg) {
        case "ML-DSA-44":
        case "ML-DSA-65":
        case "ML-DSA-87":
          algorithm = { name: jwk.alg };
          keyUsages = jwk.priv ? ["sign"] : ["verify"];
          break;
        default:
          throw new JOSENotSupported(unsupportedAlg);
      }
      break;
    }
    case "RSA": {
      switch (jwk.alg) {
        case "PS256":
        case "PS384":
        case "PS512":
          algorithm = { name: "RSA-PSS", hash: `SHA-${jwk.alg.slice(-3)}` };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "RS256":
        case "RS384":
        case "RS512":
          algorithm = { name: "RSASSA-PKCS1-v1_5", hash: `SHA-${jwk.alg.slice(-3)}` };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "RSA-OAEP":
        case "RSA-OAEP-256":
        case "RSA-OAEP-384":
        case "RSA-OAEP-512":
          algorithm = {
            name: "RSA-OAEP",
            hash: `SHA-${parseInt(jwk.alg.slice(-3), 10) || 1}`
          };
          keyUsages = jwk.d ? ["decrypt", "unwrapKey"] : ["encrypt", "wrapKey"];
          break;
        default:
          throw new JOSENotSupported(unsupportedAlg);
      }
      break;
    }
    case "EC": {
      switch (jwk.alg) {
        case "ES256":
        case "ES384":
        case "ES512":
          algorithm = {
            name: "ECDSA",
            namedCurve: { ES256: "P-256", ES384: "P-384", ES512: "P-521" }[jwk.alg]
          };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ECDH-ES":
        case "ECDH-ES+A128KW":
        case "ECDH-ES+A192KW":
        case "ECDH-ES+A256KW":
          algorithm = { name: "ECDH", namedCurve: jwk.crv };
          keyUsages = jwk.d ? ["deriveBits"] : [];
          break;
        default:
          throw new JOSENotSupported(unsupportedAlg);
      }
      break;
    }
    case "OKP": {
      switch (jwk.alg) {
        case "Ed25519":
        case "EdDSA":
          algorithm = { name: "Ed25519" };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ECDH-ES":
        case "ECDH-ES+A128KW":
        case "ECDH-ES+A192KW":
        case "ECDH-ES+A256KW":
          algorithm = { name: jwk.crv };
          keyUsages = jwk.d ? ["deriveBits"] : [];
          break;
        default:
          throw new JOSENotSupported(unsupportedAlg);
      }
      break;
    }
    default:
      throw new JOSENotSupported('Invalid or unsupported JWK "kty" (Key Type) Parameter value');
  }
  return { algorithm, keyUsages };
}
__name(subtleMapping, "subtleMapping");
async function jwkToKey(jwk) {
  if (!jwk.alg) {
    throw new TypeError('"alg" argument is required when "jwk.alg" is not present');
  }
  const { algorithm, keyUsages } = subtleMapping(jwk);
  const keyData = { ...jwk };
  if (keyData.kty !== "AKP") {
    delete keyData.alg;
  }
  delete keyData.use;
  return crypto.subtle.importKey("jwk", keyData, algorithm, jwk.ext ?? (jwk.d || jwk.priv ? false : true), jwk.key_ops ?? keyUsages);
}
__name(jwkToKey, "jwkToKey");

// node_modules/jose/dist/webapi/lib/normalize_key.js
var unusableForAlg = "given KeyObject instance cannot be used for this algorithm";
var cache;
var handleJWK = /* @__PURE__ */ __name(async (key, jwk, alg, freeze = false) => {
  cache ||= /* @__PURE__ */ new WeakMap();
  let cached = cache.get(key);
  if (cached?.[alg]) {
    return cached[alg];
  }
  const cryptoKey = await jwkToKey({ ...jwk, alg });
  if (freeze)
    Object.freeze(key);
  if (!cached) {
    cache.set(key, { [alg]: cryptoKey });
  } else {
    cached[alg] = cryptoKey;
  }
  return cryptoKey;
}, "handleJWK");
var handleKeyObject = /* @__PURE__ */ __name((keyObject, alg) => {
  cache ||= /* @__PURE__ */ new WeakMap();
  let cached = cache.get(keyObject);
  if (cached?.[alg]) {
    return cached[alg];
  }
  const isPublic = keyObject.type === "public";
  const extractable = isPublic ? true : false;
  let cryptoKey;
  if (keyObject.asymmetricKeyType === "x25519") {
    switch (alg) {
      case "ECDH-ES":
      case "ECDH-ES+A128KW":
      case "ECDH-ES+A192KW":
      case "ECDH-ES+A256KW":
        break;
      default:
        throw new TypeError(unusableForAlg);
    }
    cryptoKey = keyObject.toCryptoKey(keyObject.asymmetricKeyType, extractable, isPublic ? [] : ["deriveBits"]);
  }
  if (keyObject.asymmetricKeyType === "ed25519") {
    if (alg !== "EdDSA" && alg !== "Ed25519") {
      throw new TypeError(unusableForAlg);
    }
    cryptoKey = keyObject.toCryptoKey(keyObject.asymmetricKeyType, extractable, [
      isPublic ? "verify" : "sign"
    ]);
  }
  switch (keyObject.asymmetricKeyType) {
    case "ml-dsa-44":
    case "ml-dsa-65":
    case "ml-dsa-87": {
      if (alg !== keyObject.asymmetricKeyType.toUpperCase()) {
        throw new TypeError(unusableForAlg);
      }
      cryptoKey = keyObject.toCryptoKey(keyObject.asymmetricKeyType, extractable, [
        isPublic ? "verify" : "sign"
      ]);
    }
  }
  if (keyObject.asymmetricKeyType === "rsa") {
    let hash;
    switch (alg) {
      case "RSA-OAEP":
        hash = "SHA-1";
        break;
      case "RS256":
      case "PS256":
      case "RSA-OAEP-256":
        hash = "SHA-256";
        break;
      case "RS384":
      case "PS384":
      case "RSA-OAEP-384":
        hash = "SHA-384";
        break;
      case "RS512":
      case "PS512":
      case "RSA-OAEP-512":
        hash = "SHA-512";
        break;
      default:
        throw new TypeError(unusableForAlg);
    }
    if (alg.startsWith("RSA-OAEP")) {
      return keyObject.toCryptoKey({
        name: "RSA-OAEP",
        hash
      }, extractable, isPublic ? ["encrypt"] : ["decrypt"]);
    }
    cryptoKey = keyObject.toCryptoKey({
      name: alg.startsWith("PS") ? "RSA-PSS" : "RSASSA-PKCS1-v1_5",
      hash
    }, extractable, [isPublic ? "verify" : "sign"]);
  }
  if (keyObject.asymmetricKeyType === "ec") {
    const nist = /* @__PURE__ */ new Map([
      ["prime256v1", "P-256"],
      ["secp384r1", "P-384"],
      ["secp521r1", "P-521"]
    ]);
    const namedCurve = nist.get(keyObject.asymmetricKeyDetails?.namedCurve);
    if (!namedCurve) {
      throw new TypeError(unusableForAlg);
    }
    const expectedCurve = { ES256: "P-256", ES384: "P-384", ES512: "P-521" };
    if (expectedCurve[alg] && namedCurve === expectedCurve[alg]) {
      cryptoKey = keyObject.toCryptoKey({
        name: "ECDSA",
        namedCurve
      }, extractable, [isPublic ? "verify" : "sign"]);
    }
    if (alg.startsWith("ECDH-ES")) {
      cryptoKey = keyObject.toCryptoKey({
        name: "ECDH",
        namedCurve
      }, extractable, isPublic ? [] : ["deriveBits"]);
    }
  }
  if (!cryptoKey) {
    throw new TypeError(unusableForAlg);
  }
  if (!cached) {
    cache.set(keyObject, { [alg]: cryptoKey });
  } else {
    cached[alg] = cryptoKey;
  }
  return cryptoKey;
}, "handleKeyObject");
async function normalizeKey(key, alg) {
  if (key instanceof Uint8Array) {
    return key;
  }
  if (isCryptoKey(key)) {
    return key;
  }
  if (isKeyObject(key)) {
    if (key.type === "secret") {
      return key.export();
    }
    if ("toCryptoKey" in key && typeof key.toCryptoKey === "function") {
      try {
        return handleKeyObject(key, alg);
      } catch (err) {
        if (err instanceof TypeError) {
          throw err;
        }
      }
    }
    let jwk = key.export({ format: "jwk" });
    return handleJWK(key, jwk, alg);
  }
  if (isJWK(key)) {
    if (key.k) {
      return decode(key.k);
    }
    return handleJWK(key, key, alg, true);
  }
  throw new Error("unreachable");
}
__name(normalizeKey, "normalizeKey");

// node_modules/jose/dist/webapi/key/import.js
async function importJWK(jwk, alg, options) {
  if (!isObject(jwk)) {
    throw new TypeError("JWK must be an object");
  }
  let ext;
  alg ??= jwk.alg;
  ext ??= options?.extractable ?? jwk.ext;
  switch (jwk.kty) {
    case "oct":
      if (typeof jwk.k !== "string" || !jwk.k) {
        throw new TypeError('missing "k" (Key Value) Parameter value');
      }
      return decode(jwk.k);
    case "RSA":
      if ("oth" in jwk && jwk.oth !== void 0) {
        throw new JOSENotSupported('RSA JWK "oth" (Other Primes Info) Parameter value is not supported');
      }
      return jwkToKey({ ...jwk, alg, ext });
    case "AKP": {
      if (typeof jwk.alg !== "string" || !jwk.alg) {
        throw new TypeError('missing "alg" (Algorithm) Parameter value');
      }
      if (alg !== void 0 && alg !== jwk.alg) {
        throw new TypeError("JWK alg and alg option value mismatch");
      }
      return jwkToKey({ ...jwk, ext });
    }
    case "EC":
    case "OKP":
      return jwkToKey({ ...jwk, alg, ext });
    default:
      throw new JOSENotSupported('Unsupported "kty" (Key Type) Parameter value');
  }
}
__name(importJWK, "importJWK");

// node_modules/jose/dist/webapi/lib/validate_crit.js
function validateCrit(Err, recognizedDefault, recognizedOption, protectedHeader, joseHeader) {
  if (joseHeader.crit !== void 0 && protectedHeader?.crit === void 0) {
    throw new Err('"crit" (Critical) Header Parameter MUST be integrity protected');
  }
  if (!protectedHeader || protectedHeader.crit === void 0) {
    return /* @__PURE__ */ new Set();
  }
  if (!Array.isArray(protectedHeader.crit) || protectedHeader.crit.length === 0 || protectedHeader.crit.some((input) => typeof input !== "string" || input.length === 0)) {
    throw new Err('"crit" (Critical) Header Parameter MUST be an array of non-empty strings when present');
  }
  let recognized;
  if (recognizedOption !== void 0) {
    recognized = new Map([...Object.entries(recognizedOption), ...recognizedDefault.entries()]);
  } else {
    recognized = recognizedDefault;
  }
  for (const parameter of protectedHeader.crit) {
    if (!recognized.has(parameter)) {
      throw new JOSENotSupported(`Extension Header Parameter "${parameter}" is not recognized`);
    }
    if (joseHeader[parameter] === void 0) {
      throw new Err(`Extension Header Parameter "${parameter}" is missing`);
    }
    if (recognized.get(parameter) && protectedHeader[parameter] === void 0) {
      throw new Err(`Extension Header Parameter "${parameter}" MUST be integrity protected`);
    }
  }
  return new Set(protectedHeader.crit);
}
__name(validateCrit, "validateCrit");

// node_modules/jose/dist/webapi/lib/validate_algorithms.js
function validateAlgorithms(option, algorithms) {
  if (algorithms !== void 0 && (!Array.isArray(algorithms) || algorithms.some((s) => typeof s !== "string"))) {
    throw new TypeError(`"${option}" option must be an array of strings`);
  }
  if (!algorithms) {
    return void 0;
  }
  return new Set(algorithms);
}
__name(validateAlgorithms, "validateAlgorithms");

// node_modules/jose/dist/webapi/lib/check_key_type.js
var tag = /* @__PURE__ */ __name((key) => key?.[Symbol.toStringTag], "tag");
var jwkMatchesOp = /* @__PURE__ */ __name((alg, key, usage) => {
  if (key.use !== void 0) {
    let expected;
    switch (usage) {
      case "sign":
      case "verify":
        expected = "sig";
        break;
      case "encrypt":
      case "decrypt":
        expected = "enc";
        break;
    }
    if (key.use !== expected) {
      throw new TypeError(`Invalid key for this operation, its "use" must be "${expected}" when present`);
    }
  }
  if (key.alg !== void 0 && key.alg !== alg) {
    throw new TypeError(`Invalid key for this operation, its "alg" must be "${alg}" when present`);
  }
  if (Array.isArray(key.key_ops)) {
    let expectedKeyOp;
    switch (true) {
      case (usage === "sign" || usage === "verify"):
      case alg === "dir":
      case alg.includes("CBC-HS"):
        expectedKeyOp = usage;
        break;
      case alg.startsWith("PBES2"):
        expectedKeyOp = "deriveBits";
        break;
      case /^A\d{3}(?:GCM)?(?:KW)?$/.test(alg):
        if (!alg.includes("GCM") && alg.endsWith("KW")) {
          expectedKeyOp = usage === "encrypt" ? "wrapKey" : "unwrapKey";
        } else {
          expectedKeyOp = usage;
        }
        break;
      case (usage === "encrypt" && alg.startsWith("RSA")):
        expectedKeyOp = "wrapKey";
        break;
      case usage === "decrypt":
        expectedKeyOp = alg.startsWith("RSA") ? "unwrapKey" : "deriveBits";
        break;
    }
    if (expectedKeyOp && key.key_ops?.includes?.(expectedKeyOp) === false) {
      throw new TypeError(`Invalid key for this operation, its "key_ops" must include "${expectedKeyOp}" when present`);
    }
  }
  return true;
}, "jwkMatchesOp");
var symmetricTypeCheck = /* @__PURE__ */ __name((alg, key, usage) => {
  if (key instanceof Uint8Array)
    return;
  if (isJWK(key)) {
    if (isSecretJWK(key) && jwkMatchesOp(alg, key, usage))
      return;
    throw new TypeError(`JSON Web Key for symmetric algorithms must have JWK "kty" (Key Type) equal to "oct" and the JWK "k" (Key Value) present`);
  }
  if (!isKeyLike(key)) {
    throw new TypeError(withAlg(alg, key, "CryptoKey", "KeyObject", "JSON Web Key", "Uint8Array"));
  }
  if (key.type !== "secret") {
    throw new TypeError(`${tag(key)} instances for symmetric algorithms must be of type "secret"`);
  }
}, "symmetricTypeCheck");
var asymmetricTypeCheck = /* @__PURE__ */ __name((alg, key, usage) => {
  if (isJWK(key)) {
    switch (usage) {
      case "decrypt":
      case "sign":
        if (isPrivateJWK(key) && jwkMatchesOp(alg, key, usage))
          return;
        throw new TypeError(`JSON Web Key for this operation must be a private JWK`);
      case "encrypt":
      case "verify":
        if (isPublicJWK(key) && jwkMatchesOp(alg, key, usage))
          return;
        throw new TypeError(`JSON Web Key for this operation must be a public JWK`);
    }
  }
  if (!isKeyLike(key)) {
    throw new TypeError(withAlg(alg, key, "CryptoKey", "KeyObject", "JSON Web Key"));
  }
  if (key.type === "secret") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithms must not be of type "secret"`);
  }
  if (key.type === "public") {
    switch (usage) {
      case "sign":
        throw new TypeError(`${tag(key)} instances for asymmetric algorithm signing must be of type "private"`);
      case "decrypt":
        throw new TypeError(`${tag(key)} instances for asymmetric algorithm decryption must be of type "private"`);
    }
  }
  if (key.type === "private") {
    switch (usage) {
      case "verify":
        throw new TypeError(`${tag(key)} instances for asymmetric algorithm verifying must be of type "public"`);
      case "encrypt":
        throw new TypeError(`${tag(key)} instances for asymmetric algorithm encryption must be of type "public"`);
    }
  }
}, "asymmetricTypeCheck");
function checkKeyType(alg, key, usage) {
  switch (alg.substring(0, 2)) {
    case "A1":
    case "A2":
    case "di":
    case "HS":
    case "PB":
      symmetricTypeCheck(alg, key, usage);
      break;
    default:
      asymmetricTypeCheck(alg, key, usage);
  }
}
__name(checkKeyType, "checkKeyType");

// node_modules/jose/dist/webapi/jws/flattened/verify.js
async function flattenedVerify(jws, key, options) {
  if (!isObject(jws)) {
    throw new JWSInvalid("Flattened JWS must be an object");
  }
  if (jws.protected === void 0 && jws.header === void 0) {
    throw new JWSInvalid('Flattened JWS must have either of the "protected" or "header" members');
  }
  if (jws.protected !== void 0 && typeof jws.protected !== "string") {
    throw new JWSInvalid("JWS Protected Header incorrect type");
  }
  if (jws.payload === void 0) {
    throw new JWSInvalid("JWS Payload missing");
  }
  if (typeof jws.signature !== "string") {
    throw new JWSInvalid("JWS Signature missing or incorrect type");
  }
  if (jws.header !== void 0 && !isObject(jws.header)) {
    throw new JWSInvalid("JWS Unprotected Header incorrect type");
  }
  let parsedProt = {};
  if (jws.protected) {
    try {
      const protectedHeader = decode(jws.protected);
      parsedProt = JSON.parse(decoder.decode(protectedHeader));
    } catch {
      throw new JWSInvalid("JWS Protected Header is invalid");
    }
  }
  if (!isDisjoint(parsedProt, jws.header)) {
    throw new JWSInvalid("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
  }
  const joseHeader = {
    ...parsedProt,
    ...jws.header
  };
  const extensions = validateCrit(JWSInvalid, /* @__PURE__ */ new Map([["b64", true]]), options?.crit, parsedProt, joseHeader);
  let b64 = true;
  if (extensions.has("b64")) {
    b64 = parsedProt.b64;
    if (typeof b64 !== "boolean") {
      throw new JWSInvalid('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
    }
  }
  const { alg } = joseHeader;
  if (typeof alg !== "string" || !alg) {
    throw new JWSInvalid('JWS "alg" (Algorithm) Header Parameter missing or invalid');
  }
  const algorithms = options && validateAlgorithms("algorithms", options.algorithms);
  if (algorithms && !algorithms.has(alg)) {
    throw new JOSEAlgNotAllowed('"alg" (Algorithm) Header Parameter value not allowed');
  }
  if (b64) {
    if (typeof jws.payload !== "string") {
      throw new JWSInvalid("JWS Payload must be a string");
    }
  } else if (typeof jws.payload !== "string" && !(jws.payload instanceof Uint8Array)) {
    throw new JWSInvalid("JWS Payload must be a string or an Uint8Array instance");
  }
  let resolvedKey = false;
  if (typeof key === "function") {
    key = await key(parsedProt, jws);
    resolvedKey = true;
  }
  checkKeyType(alg, key, "verify");
  const data = concat(jws.protected !== void 0 ? encode(jws.protected) : new Uint8Array(), encode("."), typeof jws.payload === "string" ? b64 ? encode(jws.payload) : encoder.encode(jws.payload) : jws.payload);
  const signature = decodeBase64url(jws.signature, "signature", JWSInvalid);
  const k = await normalizeKey(key, alg);
  const verified = await verify(alg, k, signature, data);
  if (!verified) {
    throw new JWSSignatureVerificationFailed();
  }
  let payload;
  if (b64) {
    payload = decodeBase64url(jws.payload, "payload", JWSInvalid);
  } else if (typeof jws.payload === "string") {
    payload = encoder.encode(jws.payload);
  } else {
    payload = jws.payload;
  }
  const result = { payload };
  if (jws.protected !== void 0) {
    result.protectedHeader = parsedProt;
  }
  if (jws.header !== void 0) {
    result.unprotectedHeader = jws.header;
  }
  if (resolvedKey) {
    return { ...result, key: k };
  }
  return result;
}
__name(flattenedVerify, "flattenedVerify");

// node_modules/jose/dist/webapi/jws/compact/verify.js
async function compactVerify(jws, key, options) {
  if (jws instanceof Uint8Array) {
    jws = decoder.decode(jws);
  }
  if (typeof jws !== "string") {
    throw new JWSInvalid("Compact JWS must be a string or Uint8Array");
  }
  const { 0: protectedHeader, 1: payload, 2: signature, length } = jws.split(".");
  if (length !== 3) {
    throw new JWSInvalid("Invalid Compact JWS");
  }
  const verified = await flattenedVerify({ payload, protected: protectedHeader, signature }, key, options);
  const result = { payload: verified.payload, protectedHeader: verified.protectedHeader };
  if (typeof key === "function") {
    return { ...result, key: verified.key };
  }
  return result;
}
__name(compactVerify, "compactVerify");

// node_modules/jose/dist/webapi/lib/jwt_claims_set.js
var epoch = /* @__PURE__ */ __name((date) => Math.floor(date.getTime() / 1e3), "epoch");
var minute = 60;
var hour = minute * 60;
var day = hour * 24;
var week = day * 7;
var year = day * 365.25;
var REGEX = /^(\+|\-)? ?(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)(?: (ago|from now))?$/i;
function secs(str) {
  const matched = REGEX.exec(str);
  if (!matched || matched[4] && matched[1]) {
    throw new TypeError("Invalid time period format");
  }
  const value = parseFloat(matched[2]);
  const unit = matched[3].toLowerCase();
  let numericDate;
  switch (unit) {
    case "sec":
    case "secs":
    case "second":
    case "seconds":
    case "s":
      numericDate = Math.round(value);
      break;
    case "minute":
    case "minutes":
    case "min":
    case "mins":
    case "m":
      numericDate = Math.round(value * minute);
      break;
    case "hour":
    case "hours":
    case "hr":
    case "hrs":
    case "h":
      numericDate = Math.round(value * hour);
      break;
    case "day":
    case "days":
    case "d":
      numericDate = Math.round(value * day);
      break;
    case "week":
    case "weeks":
    case "w":
      numericDate = Math.round(value * week);
      break;
    default:
      numericDate = Math.round(value * year);
      break;
  }
  if (matched[1] === "-" || matched[4] === "ago") {
    return -numericDate;
  }
  return numericDate;
}
__name(secs, "secs");
var normalizeTyp = /* @__PURE__ */ __name((value) => {
  if (value.includes("/")) {
    return value.toLowerCase();
  }
  return `application/${value.toLowerCase()}`;
}, "normalizeTyp");
var checkAudiencePresence = /* @__PURE__ */ __name((audPayload, audOption) => {
  if (typeof audPayload === "string") {
    return audOption.includes(audPayload);
  }
  if (Array.isArray(audPayload)) {
    return audOption.some(Set.prototype.has.bind(new Set(audPayload)));
  }
  return false;
}, "checkAudiencePresence");
function validateClaimsSet(protectedHeader, encodedPayload, options = {}) {
  let payload;
  try {
    payload = JSON.parse(decoder.decode(encodedPayload));
  } catch {
  }
  if (!isObject(payload)) {
    throw new JWTInvalid("JWT Claims Set must be a top-level JSON object");
  }
  const { typ } = options;
  if (typ && (typeof protectedHeader.typ !== "string" || normalizeTyp(protectedHeader.typ) !== normalizeTyp(typ))) {
    throw new JWTClaimValidationFailed('unexpected "typ" JWT header value', payload, "typ", "check_failed");
  }
  const { requiredClaims = [], issuer, subject, audience, maxTokenAge } = options;
  const presenceCheck = [...requiredClaims];
  if (maxTokenAge !== void 0)
    presenceCheck.push("iat");
  if (audience !== void 0)
    presenceCheck.push("aud");
  if (subject !== void 0)
    presenceCheck.push("sub");
  if (issuer !== void 0)
    presenceCheck.push("iss");
  for (const claim of new Set(presenceCheck.reverse())) {
    if (!(claim in payload)) {
      throw new JWTClaimValidationFailed(`missing required "${claim}" claim`, payload, claim, "missing");
    }
  }
  if (issuer && !(Array.isArray(issuer) ? issuer : [issuer]).includes(payload.iss)) {
    throw new JWTClaimValidationFailed('unexpected "iss" claim value', payload, "iss", "check_failed");
  }
  if (subject && payload.sub !== subject) {
    throw new JWTClaimValidationFailed('unexpected "sub" claim value', payload, "sub", "check_failed");
  }
  if (audience && !checkAudiencePresence(payload.aud, typeof audience === "string" ? [audience] : audience)) {
    throw new JWTClaimValidationFailed('unexpected "aud" claim value', payload, "aud", "check_failed");
  }
  let tolerance;
  switch (typeof options.clockTolerance) {
    case "string":
      tolerance = secs(options.clockTolerance);
      break;
    case "number":
      tolerance = options.clockTolerance;
      break;
    case "undefined":
      tolerance = 0;
      break;
    default:
      throw new TypeError("Invalid clockTolerance option type");
  }
  const { currentDate } = options;
  const now = epoch(currentDate || /* @__PURE__ */ new Date());
  if ((payload.iat !== void 0 || maxTokenAge) && typeof payload.iat !== "number") {
    throw new JWTClaimValidationFailed('"iat" claim must be a number', payload, "iat", "invalid");
  }
  if (payload.nbf !== void 0) {
    if (typeof payload.nbf !== "number") {
      throw new JWTClaimValidationFailed('"nbf" claim must be a number', payload, "nbf", "invalid");
    }
    if (payload.nbf > now + tolerance) {
      throw new JWTClaimValidationFailed('"nbf" claim timestamp check failed', payload, "nbf", "check_failed");
    }
  }
  if (payload.exp !== void 0) {
    if (typeof payload.exp !== "number") {
      throw new JWTClaimValidationFailed('"exp" claim must be a number', payload, "exp", "invalid");
    }
    if (payload.exp <= now - tolerance) {
      throw new JWTExpired('"exp" claim timestamp check failed', payload, "exp", "check_failed");
    }
  }
  if (maxTokenAge) {
    const age = now - payload.iat;
    const max = typeof maxTokenAge === "number" ? maxTokenAge : secs(maxTokenAge);
    if (age - tolerance > max) {
      throw new JWTExpired('"iat" claim timestamp check failed (too far in the past)', payload, "iat", "check_failed");
    }
    if (age < 0 - tolerance) {
      throw new JWTClaimValidationFailed('"iat" claim timestamp check failed (it should be in the past)', payload, "iat", "check_failed");
    }
  }
  return payload;
}
__name(validateClaimsSet, "validateClaimsSet");

// node_modules/jose/dist/webapi/jwt/verify.js
async function jwtVerify(jwt, key, options) {
  const verified = await compactVerify(jwt, key, options);
  if (verified.protectedHeader.crit?.includes("b64") && verified.protectedHeader.b64 === false) {
    throw new JWTInvalid("JWTs MUST NOT use unencoded payload");
  }
  const payload = validateClaimsSet(verified.protectedHeader, verified.payload, options);
  const result = { payload, protectedHeader: verified.protectedHeader };
  if (typeof key === "function") {
    return { ...result, key: verified.key };
  }
  return result;
}
__name(jwtVerify, "jwtVerify");

// node_modules/jose/dist/webapi/jwks/local.js
function getKtyFromAlg(alg) {
  switch (typeof alg === "string" && alg.slice(0, 2)) {
    case "RS":
    case "PS":
      return "RSA";
    case "ES":
      return "EC";
    case "Ed":
      return "OKP";
    case "ML":
      return "AKP";
    default:
      throw new JOSENotSupported('Unsupported "alg" value for a JSON Web Key Set');
  }
}
__name(getKtyFromAlg, "getKtyFromAlg");
function isJWKSLike(jwks) {
  return jwks && typeof jwks === "object" && Array.isArray(jwks.keys) && jwks.keys.every(isJWKLike);
}
__name(isJWKSLike, "isJWKSLike");
function isJWKLike(key) {
  return isObject(key);
}
__name(isJWKLike, "isJWKLike");
var LocalJWKSet = class {
  static {
    __name(this, "LocalJWKSet");
  }
  #jwks;
  #cached = /* @__PURE__ */ new WeakMap();
  constructor(jwks) {
    if (!isJWKSLike(jwks)) {
      throw new JWKSInvalid("JSON Web Key Set malformed");
    }
    this.#jwks = structuredClone(jwks);
  }
  jwks() {
    return this.#jwks;
  }
  async getKey(protectedHeader, token) {
    const { alg, kid } = { ...protectedHeader, ...token?.header };
    const kty = getKtyFromAlg(alg);
    const candidates = this.#jwks.keys.filter((jwk2) => {
      let candidate = kty === jwk2.kty;
      if (candidate && typeof kid === "string") {
        candidate = kid === jwk2.kid;
      }
      if (candidate && (typeof jwk2.alg === "string" || kty === "AKP")) {
        candidate = alg === jwk2.alg;
      }
      if (candidate && typeof jwk2.use === "string") {
        candidate = jwk2.use === "sig";
      }
      if (candidate && Array.isArray(jwk2.key_ops)) {
        candidate = jwk2.key_ops.includes("verify");
      }
      if (candidate) {
        switch (alg) {
          case "ES256":
            candidate = jwk2.crv === "P-256";
            break;
          case "ES384":
            candidate = jwk2.crv === "P-384";
            break;
          case "ES512":
            candidate = jwk2.crv === "P-521";
            break;
          case "Ed25519":
          case "EdDSA":
            candidate = jwk2.crv === "Ed25519";
            break;
        }
      }
      return candidate;
    });
    const { 0: jwk, length } = candidates;
    if (length === 0) {
      throw new JWKSNoMatchingKey();
    }
    if (length !== 1) {
      const error = new JWKSMultipleMatchingKeys();
      const _cached = this.#cached;
      error[Symbol.asyncIterator] = async function* () {
        for (const jwk2 of candidates) {
          try {
            yield await importWithAlgCache(_cached, jwk2, alg);
          } catch {
          }
        }
      };
      throw error;
    }
    return importWithAlgCache(this.#cached, jwk, alg);
  }
};
async function importWithAlgCache(cache2, jwk, alg) {
  const cached = cache2.get(jwk) || cache2.set(jwk, {}).get(jwk);
  if (cached[alg] === void 0) {
    const key = await importJWK({ ...jwk, ext: true }, alg);
    if (key instanceof Uint8Array || key.type !== "public") {
      throw new JWKSInvalid("JSON Web Key Set members must be public keys");
    }
    cached[alg] = key;
  }
  return cached[alg];
}
__name(importWithAlgCache, "importWithAlgCache");
function createLocalJWKSet(jwks) {
  const set = new LocalJWKSet(jwks);
  const localJWKSet = /* @__PURE__ */ __name(async (protectedHeader, token) => set.getKey(protectedHeader, token), "localJWKSet");
  Object.defineProperties(localJWKSet, {
    jwks: {
      value: /* @__PURE__ */ __name(() => structuredClone(set.jwks()), "value"),
      enumerable: false,
      configurable: false,
      writable: false
    }
  });
  return localJWKSet;
}
__name(createLocalJWKSet, "createLocalJWKSet");

// node_modules/jose/dist/webapi/jwks/remote.js
function isCloudflareWorkers() {
  return typeof WebSocketPair !== "undefined" || typeof navigator !== "undefined" && true || typeof EdgeRuntime !== "undefined" && EdgeRuntime === "vercel";
}
__name(isCloudflareWorkers, "isCloudflareWorkers");
var USER_AGENT;
if (typeof navigator === "undefined" || !"Cloudflare-Workers"?.startsWith?.("Mozilla/5.0 ")) {
  const NAME = "jose";
  const VERSION = "v6.2.3";
  USER_AGENT = `${NAME}/${VERSION}`;
}
var customFetch = /* @__PURE__ */ Symbol();
async function fetchJwks(url, headers, signal, fetchImpl = fetch) {
  const response = await fetchImpl(url, {
    method: "GET",
    signal,
    redirect: "manual",
    headers
  }).catch((err) => {
    if (err.name === "TimeoutError") {
      throw new JWKSTimeout();
    }
    throw err;
  });
  if (response.status !== 200) {
    throw new JOSEError("Expected 200 OK from the JSON Web Key Set HTTP response");
  }
  try {
    return await response.json();
  } catch {
    throw new JOSEError("Failed to parse the JSON Web Key Set HTTP response as JSON");
  }
}
__name(fetchJwks, "fetchJwks");
var jwksCache = /* @__PURE__ */ Symbol();
function isFreshJwksCache(input, cacheMaxAge) {
  if (typeof input !== "object" || input === null) {
    return false;
  }
  if (!("uat" in input) || typeof input.uat !== "number" || Date.now() - input.uat >= cacheMaxAge) {
    return false;
  }
  if (!("jwks" in input) || !isObject(input.jwks) || !Array.isArray(input.jwks.keys) || !Array.prototype.every.call(input.jwks.keys, isObject)) {
    return false;
  }
  return true;
}
__name(isFreshJwksCache, "isFreshJwksCache");
var RemoteJWKSet = class {
  static {
    __name(this, "RemoteJWKSet");
  }
  #url;
  #timeoutDuration;
  #cooldownDuration;
  #cacheMaxAge;
  #jwksTimestamp;
  #pendingFetch;
  #headers;
  #customFetch;
  #local;
  #cache;
  constructor(url, options) {
    if (!(url instanceof URL)) {
      throw new TypeError("url must be an instance of URL");
    }
    this.#url = new URL(url.href);
    this.#timeoutDuration = typeof options?.timeoutDuration === "number" ? options?.timeoutDuration : 5e3;
    this.#cooldownDuration = typeof options?.cooldownDuration === "number" ? options?.cooldownDuration : 3e4;
    this.#cacheMaxAge = typeof options?.cacheMaxAge === "number" ? options?.cacheMaxAge : 6e5;
    this.#headers = new Headers(options?.headers);
    if (USER_AGENT && !this.#headers.has("User-Agent")) {
      this.#headers.set("User-Agent", USER_AGENT);
    }
    if (!this.#headers.has("accept")) {
      this.#headers.set("accept", "application/json");
      this.#headers.append("accept", "application/jwk-set+json");
    }
    this.#customFetch = options?.[customFetch];
    if (options?.[jwksCache] !== void 0) {
      this.#cache = options?.[jwksCache];
      if (isFreshJwksCache(options?.[jwksCache], this.#cacheMaxAge)) {
        this.#jwksTimestamp = this.#cache.uat;
        this.#local = createLocalJWKSet(this.#cache.jwks);
      }
    }
  }
  pendingFetch() {
    return !!this.#pendingFetch;
  }
  coolingDown() {
    return typeof this.#jwksTimestamp === "number" ? Date.now() < this.#jwksTimestamp + this.#cooldownDuration : false;
  }
  fresh() {
    return typeof this.#jwksTimestamp === "number" ? Date.now() < this.#jwksTimestamp + this.#cacheMaxAge : false;
  }
  jwks() {
    return this.#local?.jwks();
  }
  async getKey(protectedHeader, token) {
    if (!this.#local || !this.fresh()) {
      await this.reload();
    }
    try {
      return await this.#local(protectedHeader, token);
    } catch (err) {
      if (err instanceof JWKSNoMatchingKey) {
        if (this.coolingDown() === false) {
          await this.reload();
          return this.#local(protectedHeader, token);
        }
      }
      throw err;
    }
  }
  async reload() {
    if (this.#pendingFetch && isCloudflareWorkers()) {
      this.#pendingFetch = void 0;
    }
    this.#pendingFetch ||= fetchJwks(this.#url.href, this.#headers, AbortSignal.timeout(this.#timeoutDuration), this.#customFetch).then((json) => {
      this.#local = createLocalJWKSet(json);
      if (this.#cache) {
        this.#cache.uat = Date.now();
        this.#cache.jwks = json;
      }
      this.#jwksTimestamp = Date.now();
      this.#pendingFetch = void 0;
    }).catch((err) => {
      this.#pendingFetch = void 0;
      throw err;
    });
    await this.#pendingFetch;
  }
};
function createRemoteJWKSet(url, options) {
  const set = new RemoteJWKSet(url, options);
  const remoteJWKSet = /* @__PURE__ */ __name(async (protectedHeader, token) => set.getKey(protectedHeader, token), "remoteJWKSet");
  Object.defineProperties(remoteJWKSet, {
    coolingDown: {
      get: /* @__PURE__ */ __name(() => set.coolingDown(), "get"),
      enumerable: true,
      configurable: false
    },
    fresh: {
      get: /* @__PURE__ */ __name(() => set.fresh(), "get"),
      enumerable: true,
      configurable: false
    },
    reload: {
      value: /* @__PURE__ */ __name(() => set.reload(), "value"),
      enumerable: true,
      configurable: false,
      writable: false
    },
    reloading: {
      get: /* @__PURE__ */ __name(() => set.pendingFetch(), "get"),
      enumerable: true,
      configurable: false
    },
    jwks: {
      value: /* @__PURE__ */ __name(() => set.jwks(), "value"),
      enumerable: true,
      configurable: false,
      writable: false
    }
  });
  return remoteJWKSet;
}
__name(createRemoteJWKSet, "createRemoteJWKSet");

// src/index.ts
async function neonQuery(connStr, query, params) {
  if (!connStr) throw new Error("NEON_DATABASE_URL not configured");
  const m = connStr.match(/postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)/);
  if (!m) throw new Error("Invalid Neon URL format");
  const [, user, pass, host] = m;
  const basic = btoa(`${user}:${pass}`);
  const body = { query };
  if (params && params.length > 0) body.params = params;
  const resp = await fetch(`https://${host}/v2/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Basic ${basic}` },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Neon ${resp.status}: ${t.slice(0, 200)}`);
  }
  const data = await resp.json();
  return data.rows || data;
}
__name(neonQuery, "neonQuery");
var BOT_SECRET = "vps-bot-secret-2024";
function checkBotToken(c) {
  const auth = c.req.header("Authorization") || "";
  if (auth === `Bearer ${BOT_SECRET}`) return true;
  if (c.req.query("token") === BOT_SECRET) return true;
  return false;
}
__name(checkBotToken, "checkBotToken");
var _behaviorLogsTableReady = null;
var ensureBehaviorLogsTable = /* @__PURE__ */ __name((db) => {
  if (!_behaviorLogsTableReady) {
    _behaviorLogsTableReady = db.prepare(`CREATE TABLE IF NOT EXISTS bot_behavior_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      bot_id TEXT NOT NULL,
      event TEXT NOT NULL,
      data TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`).run().then(() => {
    }).catch(() => {
    });
  }
  return _behaviorLogsTableReady;
}, "ensureBehaviorLogsTable");
var app = new Hono2();
app.use("/*", cors());
app.get("/_health", (c) => c.json({ ok: true, time: Date.now() }));
var FIREBASE_PROJECT_ID = "harvests-3b238";
var JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
var JWKS = createRemoteJWKSet(new URL(JWKS_URL));
async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID
    });
    return { uid: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}
__name(verifyToken, "verifyToken");
var PUBLIC_PATHS = /* @__PURE__ */ new Set([
  "/api/shopify/webhook/orders-create",
  "/api/fulfillment/shopify/callback",
  "/api/automation/bot-account",
  "/api/automation/bot-account/delete",
  "/api/automation/behavior-logs",
  "/api/bot/register",
  "/api/bot/heartbeat",
  "/api/automation/poll",
  "/api/automation/report",
  "/api/automation/artists",
  "/api/automation/observations",
  "/api/automation/neon-test",
  "/api/automation/tasks/create-from-artists"
]);
app.use("/api/*", async (c, next) => {
  const path = new URL(c.req.url).pathname;
  if (PUBLIC_PATHS.has(path)) return next();
  if (path === "/api/shopify/status" || path === "/api/shopify/orders/deduct") return next();
  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized \u2014 missing token" }, 401);
  }
  const user = await verifyToken(auth.slice(7));
  if (!user) {
    return c.json({ error: "Unauthorized \u2014 invalid token" }, 401);
  }
  c.set("user", user);
  try {
    const existing = await c.env.DB.prepare("SELECT id FROM users WHERE user_id = ?").bind(user.uid).first();
    if (!existing) {
      const now = Date.now();
      const role = user.email === "snow368@gmail.com" ? "admin" : "user";
      await c.env.DB.prepare(`
        INSERT INTO users (user_id, email, role, quota_daily_scrape, quota_total_scrape, created_at, updated_at)
        VALUES (?, ?, ?, 10, 100, ?, ?)
      `).bind(user.uid, user.email || "", role, now, now).run();
    } else {
      await c.env.DB.prepare("UPDATE users SET last_active_at = ?, updated_at = ? WHERE user_id = ?").bind(Date.now(), Date.now(), user.uid).run();
    }
  } catch {
  }
  await next();
});
app.get("/api/inventory/stock", async (c) => {
  const rows = await c.env.DB.prepare(`
    SELECT p.*,
      COALESCE((SELECT SUM(quantity) FROM inventory_inbounds WHERE product_sku = p.sku), 0) AS total_in,
      COALESCE((SELECT SUM(quantity) FROM inventory_outbounds WHERE product_sku = p.sku), 0) AS total_out
    FROM inventory_products p ORDER BY p.sku
  `).all();
  const items = (rows.results || []).map((r) => ({
    ...r,
    current_stock: (r.total_in || 0) - (r.total_out || 0),
    status: (r.total_in || 0) - (r.total_out || 0) === 0 ? "out_of_stock" : (r.total_in || 0) - (r.total_out || 0) <= (r.reorder_point || 0) ? "low_stock" : "healthy"
  }));
  return c.json({ ok: true, items });
});
app.get("/api/inventory/stock/:sku", async (c) => {
  const sku = c.req.param("sku");
  const product = await c.env.DB.prepare("SELECT * FROM inventory_products WHERE sku = ?").bind(sku).first();
  if (!product) return c.json({ error: "not found" }, 404);
  const inbounds = await c.env.DB.prepare("SELECT * FROM inventory_inbounds WHERE product_sku = ? ORDER BY inbound_date DESC").bind(sku).all();
  const outbounds = await c.env.DB.prepare("SELECT * FROM inventory_outbounds WHERE product_sku = ? ORDER BY outbound_date DESC").bind(sku).all();
  return c.json({ product, inbounds: inbounds.results || [], outbounds: outbounds.results || [] });
});
app.get("/api/inventory/alerts", async (c) => {
  const rows = await c.env.DB.prepare(`
    SELECT p.sku, p.name, p.category, p.reorder_point, p.reorder_qty, p.lead_time_days, p.moq, p.carton_qty,
      COALESCE(inb.total_in, 0) as total_inbound, COALESCE(out.total_out, 0) as total_outbound,
      COALESCE(inb.total_in, 0) - COALESCE(out.total_out, 0) as current_stock
    FROM inventory_products p
    LEFT JOIN (SELECT product_sku, SUM(quantity) as total_in FROM inventory_inbounds GROUP BY product_sku) inb ON p.sku = inb.product_sku
    LEFT JOIN (SELECT product_sku, SUM(quantity) as total_out FROM inventory_outbounds GROUP BY product_sku) out ON p.sku = out.product_sku
    WHERE (COALESCE(inb.total_in, 0) - COALESCE(out.total_out, 0)) <= p.reorder_point
    ORDER BY current_stock ASC
  `).all();
  return c.json({ ok: true, alerts: rows.results || [] });
});
app.get("/api/inventory/trends", async (c) => {
  const days = parseInt(c.req.query("days") || "90");
  const dateStr = new Date(Date.now() - days * 864e5).toISOString().split("T")[0];
  const products = await c.env.DB.prepare("SELECT sku, name FROM inventory_products").all();
  const trends = [];
  for (const p of products.results || []) {
    const out = await c.env.DB.prepare(
      "SELECT COALESCE(SUM(quantity), 0) as total FROM inventory_outbounds WHERE product_sku = ? AND outbound_date >= ?"
    ).bind(p.sku, dateStr).first();
    const total = await c.env.DB.prepare(
      "SELECT COALESCE(SUM(quantity),0) as total_in FROM inventory_inbounds WHERE product_sku = ?"
    ).bind(p.sku).first();
    const outTotal = await c.env.DB.prepare(
      "SELECT COALESCE(SUM(quantity),0) as total_out FROM inventory_outbounds WHERE product_sku = ?"
    ).bind(p.sku).first();
    trends.push({
      sku: p.sku,
      name: p.name,
      period_sold: out?.total || 0,
      avg_daily: Math.round((out?.total || 0) / days * 100) / 100,
      current_stock: (total?.total_in || 0) - (outTotal?.total_out || 0)
    });
  }
  return c.json({ ok: true, trends });
});
app.post("/api/inventory/product", async (c) => {
  const body = await c.req.json();
  const { sku, name, category, vendor, unit, unit_price, reorder_point, reorder_qty, lead_time_days, moq, carton_qty, source, shopify_variant_id, id } = body;
  const now = Date.now();
  if (id) {
    await c.env.DB.prepare(`UPDATE inventory_products SET name=?, category=?, vendor=?, unit=?, unit_price=?, reorder_point=?, reorder_qty=?, lead_time_days=?, moq=?, carton_qty=?, source=?, shopify_variant_id=?, updated_at=? WHERE id=?`).bind(name, category || "General", vendor || "", unit || "Box", unit_price || 0, reorder_point || 50, reorder_qty || 1e3, lead_time_days || 45, moq || 500, carton_qty || 100, source || "manual", shopify_variant_id || null, now, id).run();
    return c.json({ ok: true, action: "updated", sku });
  }
  try {
    await c.env.DB.prepare(`INSERT INTO inventory_products (sku,name,category,vendor,unit,unit_price,reorder_point,reorder_qty,lead_time_days,moq,carton_qty,source,shopify_variant_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(sku, name, category || "General", vendor || "", unit || "Box", unit_price || 0, reorder_point || 50, reorder_qty || 1e3, lead_time_days || 45, moq || 500, carton_qty || 100, source || "manual", shopify_variant_id || null, now, now).run();
    return c.json({ ok: true, action: "created", sku });
  } catch (e) {
    if (e.message?.includes("UNIQUE")) return c.json({ error: `SKU ${sku} already exists` }, 409);
    throw e;
  }
});
app.post("/api/inventory/product/:sku/field", async (c) => {
  const sku = c.req.param("sku");
  const { field, value } = await c.req.json();
  const allowed = ["name", "category", "vendor", "unit", "unit_price", "reorder_point", "reorder_qty", "lead_time_days", "moq", "carton_qty", "source", "barcode", "image_url"];
  if (!allowed.includes(field)) return c.json({ error: "invalid field" }, 400);
  await c.env.DB.prepare(`UPDATE inventory_products SET ${field}=?, updated_at=? WHERE sku=?`).bind(value, Date.now(), sku).run();
  return c.json({ ok: true });
});
app.delete("/api/inventory/product/:sku", async (c) => {
  await c.env.DB.prepare("DELETE FROM inventory_products WHERE sku=?").bind(c.req.param("sku")).run();
  return c.json({ ok: true });
});
app.post("/api/inventory/inbound", async (c) => {
  const { product_sku, quantity, po_number, inbound_date, note } = await c.req.json();
  if (!product_sku || !quantity || !inbound_date) return c.json({ error: "product_sku, quantity, inbound_date required" }, 400);
  await c.env.DB.prepare("INSERT INTO inventory_inbounds (product_sku,quantity,po_number,inbound_date,note,created_at) VALUES (?,?,?,?,?,?)").bind(product_sku, quantity, po_number || "", inbound_date, note || "", Date.now()).run();
  return c.json({ ok: true });
});
app.post("/api/inventory/outbound", async (c) => {
  const { product_sku, quantity, channel, customer_name, shopify_order_id, outbound_date, note } = await c.req.json();
  if (!product_sku || !quantity || !channel || !outbound_date) return c.json({ error: "product_sku, quantity, channel, outbound_date required" }, 400);
  if (!["B2C", "B2B"].includes(channel)) return c.json({ error: "channel must be B2C or B2B" }, 400);
  await c.env.DB.prepare("INSERT INTO inventory_outbounds (product_sku,quantity,channel,customer_name,shopify_order_id,outbound_date,note,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(product_sku, quantity, channel, customer_name || "", shopify_order_id || "", outbound_date, note || "", Date.now()).run();
  if (channel === "B2B" && customer_name) {
    const now = Date.now();
    try {
      await c.env.DB.prepare("INSERT INTO inventory_customers (name,updated_at,created_at) VALUES (?,?,?) ON CONFLICT(name) DO UPDATE SET updated_at=?").bind(customer_name, now, now, now).run();
    } catch {
    }
  }
  return c.json({ ok: true });
});
app.get("/api/inventory/inbounds", async (c) => {
  const rows = await c.env.DB.prepare("SELECT * FROM inventory_inbounds ORDER BY inbound_date DESC LIMIT 500").all();
  return c.json({ ok: true, items: rows.results || [] });
});
app.get("/api/inventory/outbounds", async (c) => {
  const channel = c.req.query("channel");
  const sku = c.req.query("sku");
  let sql = "SELECT * FROM inventory_outbounds WHERE 1=1";
  const binds = [];
  if (channel && channel !== "all") {
    sql += " AND channel = ?";
    binds.push(channel);
  }
  if (sku) {
    sql += " AND product_sku = ?";
    binds.push(sku);
  }
  sql += " ORDER BY outbound_date DESC LIMIT 500";
  const rows = await c.env.DB.prepare(sql).bind(...binds).all();
  return c.json({ ok: true, items: rows.results || [] });
});
app.get("/api/inventory/customers", async (c) => {
  const rows = await c.env.DB.prepare("SELECT * FROM inventory_customers ORDER BY CASE WHEN status='active' THEN 0 ELSE 1 END, total_orders DESC").all();
  return c.json({ ok: true, items: rows.results || [] });
});
app.post("/api/inventory/customer", async (c) => {
  const body = await c.req.json();
  const { name, email, instagram, country, customer_type, status, notes } = body;
  if (!name) return c.json({ error: "name required" }, 400);
  const now = Date.now();
  try {
    await c.env.DB.prepare(`
      INSERT INTO inventory_customers (name,email,instagram,country,customer_type,status,notes,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?)
      ON CONFLICT(name) DO UPDATE SET email=excluded.email, instagram=excluded.instagram, country=excluded.country, customer_type=excluded.customer_type, status=excluded.status, notes=excluded.notes, updated_at=excluded.updated_at
    `).bind(name, email || "", instagram || "", country || "", customer_type || "Retail", status || "active", notes || "", now, now).run();
  } catch (e) {
    await c.env.DB.prepare("INSERT INTO inventory_customers (name,email,instagram,country,customer_type,status,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(name, email || "", instagram || "", country || "", customer_type || "Retail", status || "active", notes || "", now, now).run();
  }
  return c.json({ ok: true });
});
app.post("/api/inventory/customers/sync", async (c) => {
  const { orders } = await c.req.json();
  if (!Array.isArray(orders)) return c.json({ error: "orders array required" }, 400);
  const now = Date.now();
  let count = 0;
  for (const o of orders) {
    const name = o.customer_name || o.shopify_customer_name || "Unknown";
    await c.env.DB.prepare(`
      INSERT INTO inventory_customers (name,email,last_order_date,first_order_date,total_orders,total_spent,updated_at,created_at)
      VALUES (?,?,?,?,1,?,?,?)
      ON CONFLICT(name) DO UPDATE SET total_orders=total_orders+1, total_spent=total_spent+?, last_order_date=?, updated_at=?
    `).bind(name, o.customer_email || "", o.order_date || "", o.order_date || "", o.total_spent || 0, now, now, o.total_spent || 0, o.order_date || "", now).run();
    count++;
  }
  return c.json({ ok: true, synced: count });
});
app.post("/api/inventory/po/create", async (c) => {
  const { items, supplier, expected_date, notes } = await c.req.json();
  if (!items?.length || !supplier) return c.json({ error: "items and supplier required" }, 400);
  const now = Date.now();
  const poNumber = "PO-" + now;
  const r = await c.env.DB.prepare("INSERT INTO purchase_orders (po_number,supplier,order_date,expected_date,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?)").bind(poNumber, supplier, (/* @__PURE__ */ new Date()).toISOString().split("T")[0], expected_date || "", notes || "", now, now).run();
  const poId = r.meta.last_row_id;
  const stmt = c.env.DB.prepare("INSERT INTO purchase_order_items (po_id,product_sku,quantity,unit_cost) VALUES (?,?,?,?)");
  for (const item of items) {
    await stmt.bind(poId, item.sku, item.quantity, item.unit_cost || 0).run();
  }
  return c.json({ ok: true, poNumber });
});
app.get("/api/inventory/po", async (c) => {
  const rows = await c.env.DB.prepare("SELECT * FROM purchase_orders ORDER BY created_at DESC").all();
  return c.json({ ok: true, items: rows.results || [] });
});
app.get("/api/inventory/po/:id/items", async (c) => {
  const rows = await c.env.DB.prepare("SELECT * FROM purchase_order_items WHERE po_id = ?").bind(c.req.param("id")).all();
  return c.json({ ok: true, items: rows.results || [] });
});
app.get("/api/fulfillment/boxes", async (c) => {
  const rows = await c.env.DB.prepare("SELECT *, CASE WHEN stock <= stock_alert THEN 1 ELSE 0 END as low_stock FROM order_boxes WHERE enabled = 1 ORDER BY max_units ASC").all();
  return c.json(rows.results || []);
});
app.post("/api/fulfillment/boxes", async (c) => {
  const { name, length_cm, width_cm, height_cm, max_units, weight_g, carrier, stock, stock_alert } = await c.req.json();
  if (!name || !length_cm || !width_cm || !height_cm) return c.json({ error: "name/length/width/height required" }, 400);
  await c.env.DB.prepare("INSERT INTO order_boxes (name,length_cm,width_cm,height_cm,max_units,weight_g,carrier,enabled,stock,stock_alert,created_at) VALUES (?,?,?,?,?,?,?,1,?,?,?)").bind(name, length_cm, width_cm, height_cm, max_units || 0, weight_g || 0, carrier || "", stock || 0, stock_alert || 50, Date.now()).run();
  return c.json({ ok: true });
});
app.post("/api/fulfillment/boxes/inbound", async (c) => {
  const { box_id, quantity } = await c.req.json();
  if (!box_id || !quantity || quantity <= 0) return c.json({ error: "box_id and quantity > 0 required" }, 400);
  const box = await c.env.DB.prepare("SELECT * FROM order_boxes WHERE id = ? AND enabled = 1").bind(box_id).first();
  if (!box) return c.json({ error: "box not found" }, 404);
  await c.env.DB.prepare("UPDATE order_boxes SET stock = stock + ? WHERE id = ?").bind(quantity, box_id).run();
  return c.json({ ok: true, newStock: (box.stock || 0) + quantity, box: box.name, inboundQty: quantity });
});
app.delete("/api/fulfillment/boxes/:id", async (c) => {
  await c.env.DB.prepare("UPDATE order_boxes SET enabled = 0 WHERE id = ?").bind(c.req.param("id")).run();
  return c.json({ ok: true });
});
app.get("/api/fulfillment/carriers", async (c) => {
  const rows = await c.env.DB.prepare("SELECT id, carrier, label, api_base_url, enabled FROM carrier_configs ORDER BY carrier").all();
  return c.json(rows.results || []);
});
app.post("/api/fulfillment/carriers", async (c) => {
  const { id, api_key, api_secret, extra_config } = await c.req.json();
  if (!id) return c.json({ error: "id required" }, 400);
  if (api_key) await c.env.DB.prepare("UPDATE carrier_configs SET api_key = ? WHERE id = ?").bind(api_key, id).run();
  if (api_secret) await c.env.DB.prepare("UPDATE carrier_configs SET api_secret = ? WHERE id = ?").bind(api_secret, id).run();
  if (extra_config) await c.env.DB.prepare("UPDATE carrier_configs SET extra_config = ? WHERE id = ?").bind(JSON.stringify(extra_config), id).run();
  return c.json({ ok: true });
});
app.get("/api/fulfillment/orders", async (c) => {
  const page = Math.max(1, parseInt(c.req.query("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") || "20")));
  const offset = (page - 1) * limit;
  const status = c.req.query("status");
  let sql = "SELECT * FROM orders WHERE 1=1";
  const binds = [];
  if (status) {
    sql += " AND status = ?";
    binds.push(status);
  }
  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  binds.push(limit, offset);
  const orders = await c.env.DB.prepare(sql).bind(...binds).all();
  const total = await c.env.DB.prepare("SELECT COUNT(*) as c FROM orders").first();
  return c.json({ orders: orders.results || [], total: total?.c || 0, page, limit });
});
app.get("/api/fulfillment/orders/:id", async (c) => {
  const order = await c.env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(c.req.param("id")).first();
  if (!order) return c.json({ error: "not found" }, 404);
  const items = await c.env.DB.prepare("SELECT * FROM order_items WHERE order_id = ?").bind(c.req.param("id")).all();
  const shipments = await c.env.DB.prepare("SELECT * FROM shipments WHERE order_id = ? ORDER BY created_at DESC").bind(c.req.param("id")).all();
  return c.json({ ...order, items: items.results || [], shipments: shipments.results || [] });
});
app.post("/api/fulfillment/orders", async (c) => {
  const { order_number, customer_name, country, state, city, zip_code, address, phone, items, notes } = await c.req.json();
  if (!order_number || !customer_name || !country) return c.json({ error: "order_number/customer_name/country required" }, 400);
  const now = Date.now();
  const r = await c.env.DB.prepare(`INSERT INTO orders (order_number,customer_name,country,state,city,zip_code,address,phone,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(order_number, customer_name, country, state || "", city || "", zip_code || "", address || "", phone || "", notes || "", now, now).run();
  const orderId = r.meta.last_row_id;
  if (items && Array.isArray(items)) {
    for (const item of items) {
      await c.env.DB.prepare("INSERT INTO order_items (order_id,sku,product_name,quantity,unit_price) VALUES (?,?,?,?,?)").bind(orderId, item.sku || "", item.product_name || "Item", item.quantity || 1, item.unit_price || 0).run();
    }
  }
  return c.json({ ok: true, id: orderId });
});
app.delete("/api/fulfillment/orders/:id", async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM order_items WHERE order_id = ?").bind(id).run();
  await c.env.DB.prepare("DELETE FROM shipments WHERE order_id = ?").bind(id).run();
  await c.env.DB.prepare("DELETE FROM orders WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});
var parseNote = /* @__PURE__ */ __name((note) => {
  try {
    const gifts = [];
    const needleRegex = /(\d{3,4})(RL|RS|RG|RT|F|M)\s*[xX*×]?\s*(\d+)?\s*(盒|箱)?/gi;
    const seen = /* @__PURE__ */ new Set();
    let match2;
    while ((match2 = needleRegex.exec(note)) !== null) {
      const label = match2[1].toUpperCase() + match2[2].toUpperCase();
      if (seen.has(label)) continue;
      seen.add(label);
      const qty = parseInt(match2[3] || "1", 10);
      gifts.push({ type: "needle", label, quantity: qty });
    }
    const bareRegex = /\b(\d{3,4})(RL|RS|RG|RT|F|M)\b/gi;
    while ((match2 = bareRegex.exec(note)) !== null) {
      const label = match2[1].toUpperCase() + match2[2].toUpperCase();
      if (seen.has(label)) continue;
      seen.add(label);
      gifts.push({ type: "needle", label, quantity: 1 });
    }
    const posterMatch = note.match(/(小海报|大海报|海报)[\sxX*×]*(\d+)?/i);
    if (posterMatch) gifts.push({ type: "poster", label: "\u6D77\u62A5", quantity: parseInt(posterMatch[2] || "1", 10) });
    return gifts;
  } catch {
    return [];
  }
}, "parseNote");
var parseGiftSkus = /* @__PURE__ */ __name((note) => {
  return parseNote(note).map((g) => ({
    sku: g.type === "needle" ? g.label : "POSTER",
    qty: g.quantity,
    name: g.type === "needle" ? g.label : "\u6D77\u62A5"
  }));
}, "parseGiftSkus");
app.get("/api/shopify/status", async (c) => {
  const config = await c.env.DB.prepare("SELECT * FROM carrier_configs WHERE carrier='shopify'").first();
  if (!config) return c.json({ connected: false, store: null });
  const storeDomain = config.api_base_url ? new URL(config.api_base_url).hostname : "dptattoo.myshopify.com";
  const lastOutbound = await c.env.DB.prepare("SELECT MAX(created_at) as last_sync FROM inventory_outbounds WHERE note LIKE '%Shopify Order%'").first();
  const outboundStats = await c.env.DB.prepare("SELECT COUNT(DISTINCT shopify_order_id) as dedup_orders, COUNT(*) as total_lines FROM inventory_outbounds WHERE shopify_order_id != ''").first();
  const lastOrder = await c.env.DB.prepare("SELECT created_at FROM orders ORDER BY created_at DESC LIMIT 1").first();
  return c.json({
    connected: true,
    store: storeDomain.replace(".myshopify.com", ""),
    lastDeduct: lastOutbound?.last_sync || null,
    deductedOrders: outboundStats?.dedup_orders || 0,
    deductedLines: outboundStats?.total_lines || 0,
    lastFulfillmentOrder: lastOrder?.created_at || null,
    hasToken: !!config.api_key
  });
});
app.post("/api/shopify/orders/deduct", async (c) => {
  const config = await c.env.DB.prepare("SELECT * FROM carrier_configs WHERE carrier='shopify'").first();
  if (!config) return c.json({ error: "Shopify not configured" }, 400);
  const accessToken = config.api_key;
  const storeDomain = config.api_base_url ? new URL(config.api_base_url).hostname : "dptattoo.myshopify.com";
  const apiVersion = "2024-10";
  const now = Date.now();
  let totalOrders = 0;
  let deductedItems = [];
  let ordersUrl = `https://${storeDomain}/admin/api/${apiVersion}/orders.json?status=any&fulfillment_status=unfulfilled&created_at_min=${new Date(Date.now() - 7 * 864e5).toISOString()}&limit=250`;
  while (ordersUrl) {
    const resp = await fetch(ordersUrl, { headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" } });
    if (!resp.ok) return c.json({ error: `Shopify API ${resp.status}: ${(await resp.text()).slice(0, 240)}` }, 502);
    const payload = await resp.json();
    const orders = Array.isArray(payload?.orders) ? payload.orders : [];
    for (const order of orders) {
      const orderId = String(order.id);
      const orderName = String(order.order_number || "");
      const customerNote = String(order.note || "").trim();
      const customerName = order.customer ? `${order.customer.first_name || ""} ${order.customer.last_name || ""}`.trim() : "";
      const existing = await c.env.DB.prepare("SELECT id FROM inventory_outbounds WHERE shopify_order_id = ? LIMIT 1").bind(orderId).first();
      if (existing) continue;
      for (const item of order.line_items || []) {
        const sku = String(item.sku || "").trim();
        const qty = Number(item.quantity) || 0;
        if (!sku || qty <= 0) continue;
        const product = await c.env.DB.prepare("SELECT sku FROM inventory_products WHERE sku = ?").bind(sku).first();
        if (!product) continue;
        const outboundDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const noteParts = [`Shopify Order #${orderName}`];
        if (customerNote) noteParts.push(`\u5BA2\u6237\u7559\u8A00: ${customerNote}`);
        if (item.title) noteParts.push(`\u5546\u54C1: ${item.title}`);
        await c.env.DB.prepare("INSERT INTO inventory_outbounds (product_sku,quantity,channel,customer_name,shopify_order_id,outbound_date,note,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(sku, qty, "B2C", customerName || "Shopify Customer", orderId, outboundDate, noteParts.join(" | "), now).run();
        deductedItems.push({ sku, qty, order: orderName });
      }
      if (customerNote) {
        for (const gift of parseGiftSkus(customerNote)) {
          const gp = await c.env.DB.prepare("SELECT sku FROM inventory_products WHERE sku = ?").bind(gift.sku).first();
          if (!gp) continue;
          const outboundDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          await c.env.DB.prepare("INSERT INTO inventory_outbounds (product_sku,quantity,channel,customer_name,shopify_order_id,outbound_date,note,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(gift.sku, gift.qty, "B2C", customerName || "Shopify Customer", orderId, outboundDate, `Shopify Order #${orderName} | \u8D60\u9001\u54C1: ${gift.name}`, now).run();
          deductedItems.push({ sku: gift.sku, qty: gift.qty, order: orderName, item: `\u{1F381}\u8D60\u9001 ${gift.name}` });
        }
      }
      totalOrders++;
    }
    const linkHeader = resp.headers.get("link");
    ordersUrl = linkHeader ? parseNextLink(linkHeader) : null;
  }
  return c.json({ ok: true, ordersProcessed: totalOrders, itemsDeducted: deductedItems.length, details: deductedItems });
});
var parseNextLink = /* @__PURE__ */ __name((linkHeader) => {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(",")) {
    if (!part.includes('rel="next"')) continue;
    const m = part.match(/<([^>]+)>/);
    if (m?.[1]) return m[1];
  }
  return null;
}, "parseNextLink");
app.post("/api/fulfillment/shopify/sync", async (c) => {
  const config = await c.env.DB.prepare("SELECT * FROM carrier_configs WHERE carrier='shopify'").first();
  if (!config) return c.json({ error: "Shopify not configured, run OAuth first" }, 400);
  const token = config.api_key;
  const baseUrl = config.api_base_url || "https://dptattoo.myshopify.com/admin/api/2024-04";
  const since = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  let page = 1, synced = 0, hasMore = true;
  while (hasMore) {
    const r = await fetch(baseUrl + "/orders.json?limit=50&created_at_min=" + since + "&page=" + page, {
      headers: { "X-Shopify-Access-Token": token }
    });
    const data = await r.json();
    const orders = data.orders || [];
    if (orders.length === 0) {
      hasMore = false;
      break;
    }
    for (const o of orders) {
      const addr = o.shipping_address || o.customer?.default_address || {};
      const now = Date.now();
      const r2 = await c.env.DB.prepare(`INSERT OR IGNORE INTO orders (order_number,source,status,customer_name,customer_email,country,state,city,zip_code,address,phone,currency,notes,created_at,updated_at) VALUES (?,'shopify','pending',?,?,?,?,?,?,?,?,?,?,?,?)`).bind(String(o.order_number), o.shipping_address?.name || o.customer?.name || "", o.email || "", addr.country_code || addr.country || "", addr.province || "", addr.city || "", addr.zip || "", addr.address1 || "", addr.phone || "", o.currency || "USD", o.note || "", new Date(o.created_at).getTime() || now, now).run();
      if (r2.meta.changes > 0) {
        const orderId = r2.meta.last_row_id;
        for (const item of o.line_items || []) {
          await c.env.DB.prepare("INSERT OR IGNORE INTO order_items (order_id,sku,product_name,quantity,unit_price) VALUES (?,?,?,?,?)").bind(orderId, item.sku || "", item.name || "", item.quantity || 1, Number(item.price) || 0).run();
        }
        synced++;
      }
    }
    page++;
  }
  return c.json({ ok: true, synced, message: `Synced ${synced} orders` });
});
app.post("/api/shopify/webhook/orders-create", async (c) => {
  const order = await c.req.json();
  if (!order?.id) return c.json({ error: "Invalid payload" }, 400);
  const orderId = String(order.id);
  const orderName = String(order.order_number || "");
  const existing = await c.env.DB.prepare("SELECT id FROM inventory_outbounds WHERE shopify_order_id = ? LIMIT 1").bind(orderId).first();
  if (existing) return c.json({ ok: true, skipped: true, reason: "already processed" });
  const financialStatus = String(order.financial_status || "").toLowerCase();
  if (financialStatus !== "paid" && financialStatus !== "partially_paid") {
    return c.json({ ok: true, skipped: true, reason: `not paid (${financialStatus})` });
  }
  const customerName = order.customer ? `${order.customer.first_name || ""} ${order.customer.last_name || ""}`.trim() : "";
  const customerNote = String(order.note || "").trim();
  const now = Date.now();
  let deductedCount = 0;
  for (const item of order.line_items || []) {
    const sku = String(item.sku || "").trim();
    const qty = Number(item.quantity) || 0;
    if (!sku || qty <= 0) continue;
    const product = await c.env.DB.prepare("SELECT sku FROM inventory_products WHERE sku = ?").bind(sku).first();
    if (!product) continue;
    const outboundDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const noteParts = [`Shopify Order #${orderName}`, "\u6765\u6E90: webhook"];
    if (customerNote) noteParts.push(`\u5BA2\u6237\u7559\u8A00: ${customerNote}`);
    if (item.title) noteParts.push(`\u5546\u54C1: ${item.title}`);
    await c.env.DB.prepare("INSERT INTO inventory_outbounds (product_sku,quantity,channel,customer_name,shopify_order_id,outbound_date,note,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(sku, qty, "B2C", customerName || "Shopify Customer", orderId, outboundDate, noteParts.join(" | "), now).run();
    deductedCount++;
  }
  if (customerNote) {
    for (const gift of parseGiftSkus(customerNote)) {
      const gp = await c.env.DB.prepare("SELECT sku FROM inventory_products WHERE sku = ?").bind(gift.sku).first();
      if (!gp) continue;
      const outboundDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      await c.env.DB.prepare("INSERT INTO inventory_outbounds (product_sku,quantity,channel,customer_name,shopify_order_id,outbound_date,note,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(gift.sku, gift.qty, "B2C", customerName || "Shopify Customer", orderId, outboundDate, `Shopify Order #${orderName} | \u8D60\u9001\u54C1: ${gift.name}`, now).run();
      deductedCount++;
    }
  }
  try {
    const addr = order.shipping_address || order.customer?.default_address || {};
    await c.env.DB.prepare(`INSERT OR IGNORE INTO orders (order_number,source,status,customer_name,customer_email,country,state,city,zip_code,address,phone,currency,notes,created_at,updated_at) VALUES (?,'shopify','pending',?,?,?,?,?,?,?,?,?,?,?,?)`).bind(orderName, customerName || "Shopify Customer", order.email || "", addr.country_code || addr.country || "", addr.province || "", addr.city || "", addr.zip || "", addr.address1 || "", addr.phone || "", order.currency || "USD", order.note || "", new Date(order.created_at).getTime() || now, now).run();
  } catch {
  }
  return c.json({ ok: true, orderId, orderName, itemsDeducted: deductedCount });
});
app.post("/api/fulfillment/orders/:id/ship", async (c) => {
  return c.json({ error: "Shipping requires local carrier API integration on VPS. Use VPS Express server for ship operations." }, 400);
});
app.get("/api/inventory/distributor-candidates", async (c) => {
  return c.json({ error: "Distributor import requires Neon DB on VPS" }, 400);
});
app.post("/api/inventory/import-distributor", async (c) => {
  return c.json({ error: "Distributor import requires Neon DB on VPS" }, 400);
});
app.post("/api/inventory/source/load", async (c) => {
  return c.json({ error: "CSV import requires local filesystem access on VPS" }, 400);
});
app.get("/api/scrape/configs", async (c) => {
  const { uid } = c.get("user");
  const rows = await c.env.DB.prepare(
    "SELECT * FROM user_scrape_configs WHERE user_id = ? ORDER BY created_at DESC"
  ).bind(uid).all();
  return c.json({ ok: true, items: rows.results || [] });
});
app.post("/api/scrape/configs", async (c) => {
  const { uid, email } = c.get("user");
  const { keyword, city, country } = await c.req.json();
  if (!keyword || !city) return c.json({ error: "keyword and city required" }, 400);
  const user = await c.env.DB.prepare("SELECT * FROM users WHERE user_id = ?").bind(uid).first();
  if (user) {
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const todayCount = await c.env.DB.prepare(
      "SELECT COUNT(*) as c FROM user_scrape_configs WHERE user_id = ? AND date(created_at / 1000, 'unixepoch') = ?"
    ).bind(uid, today).first();
    if (todayCount && todayCount.c >= (user.quota_daily_scrape || 10)) {
      return c.json({ error: `Daily quota exceeded (${user.quota_daily_scrape}/day)` }, 429);
    }
  }
  const now = Date.now();
  await c.env.DB.prepare(`
    INSERT INTO user_scrape_configs (user_id, user_email, keyword, city, country, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
  `).bind(uid, email || "", keyword, city, country || "US", now, now).run();
  try {
    await c.env.DB.prepare("INSERT INTO usage_logs (user_id, action, metadata, created_at) VALUES (?, ?, ?, ?)").bind(uid, "scrape_submit", JSON.stringify({ keyword, city, country }), now).run();
  } catch {
  }
  return c.json({ ok: true });
});
app.delete("/api/scrape/configs/:id", async (c) => {
  const { uid } = c.get("user");
  const r = await c.env.DB.prepare(
    "DELETE FROM user_scrape_configs WHERE id = ? AND user_id = ?"
  ).bind(c.req.param("id"), uid).run();
  return c.json({ ok: true, deleted: r.meta.changes > 0 });
});
app.get("/api/scrape/pending", async (c) => {
  const token = c.req.query("token");
  if (token !== "vps-bot-secret-2024") return c.json({ error: "unauthorized" }, 401);
  const rows = await c.env.DB.prepare(
    "SELECT * FROM user_scrape_configs WHERE status = 'pending' ORDER BY created_at ASC LIMIT 5"
  ).all();
  return c.json({ ok: true, items: rows.results || [] });
});
app.post("/api/scrape/update-status", async (c) => {
  const { token } = c.req.query();
  if (token !== "vps-bot-secret-2024") return c.json({ error: "unauthorized" }, 401);
  const { id, status, result } = await c.req.json();
  if (!id || !status) return c.json({ error: "id and status required" }, 400);
  const now = Date.now();
  await c.env.DB.prepare("UPDATE user_scrape_configs SET status = ?, updated_at = ? WHERE id = ?").bind(status, now, id).run();
  if (status === "running") {
    try {
      await c.env.DB.prepare("INSERT INTO usage_logs (user_id, action, metadata, created_at) VALUES (?, ?, ?, ?)").bind("system", "scrape_start", JSON.stringify({ configId: id }), now).run();
    } catch {
    }
  }
  return c.json({ ok: true });
});
app.get("/api/auth/me", async (c) => {
  const user = c.get("user");
  return c.json({ ok: true, uid: user.uid, email: user.email });
});
app.get("/api/admin/users", async (c) => {
  const { uid } = c.get("user");
  const me = await c.env.DB.prepare("SELECT role FROM users WHERE user_id = ?").bind(uid).first();
  if (me?.role !== "admin") return c.json({ error: "forbidden" }, 403);
  const rows = await c.env.DB.prepare(`
    SELECT u.*,
      (SELECT COUNT(*) FROM user_scrape_configs WHERE user_id = u.user_id) as total_tasks,
      (SELECT COUNT(*) FROM user_scrape_configs WHERE user_id = u.user_id AND status = 'completed') as completed_tasks
    FROM users u ORDER BY u.created_at DESC
  `).all();
  return c.json({ ok: true, users: rows.results || [] });
});
app.post("/api/admin/users/:uid/quota", async (c) => {
  const { uid: adminUid } = c.get("user");
  const me = await c.env.DB.prepare("SELECT role FROM users WHERE user_id = ?").bind(adminUid).first();
  if (me?.role !== "admin") return c.json({ error: "forbidden" }, 403);
  const targetUid = c.req.param("uid");
  const { quota_daily_scrape, quota_total_scrape, role } = await c.req.json();
  if (quota_daily_scrape) await c.env.DB.prepare("UPDATE users SET quota_daily_scrape = ? WHERE user_id = ?").bind(quota_daily_scrape, targetUid).run();
  if (quota_total_scrape) await c.env.DB.prepare("UPDATE users SET quota_total_scrape = ? WHERE user_id = ?").bind(quota_total_scrape, targetUid).run();
  if (role) await c.env.DB.prepare("UPDATE users SET role = ? WHERE user_id = ?").bind(role, targetUid).run();
  return c.json({ ok: true });
});
app.get("/api/admin/stats", async (c) => {
  const { uid } = c.get("user");
  const me = await c.env.DB.prepare("SELECT role FROM users WHERE user_id = ?").bind(uid).first();
  if (me?.role !== "admin") return c.json({ error: "forbidden" }, 403);
  const totalUsers = await c.env.DB.prepare("SELECT COUNT(*) as c FROM users").first();
  const totalTasks = await c.env.DB.prepare("SELECT COUNT(*) as c FROM user_scrape_configs").first();
  const pendingTasks = await c.env.DB.prepare("SELECT COUNT(*) as c FROM user_scrape_configs WHERE status = 'pending'").first();
  return c.json({ ok: true, stats: {
    totalUsers: totalUsers?.c || 0,
    totalTasks: totalTasks?.c || 0,
    pendingTasks: pendingTasks?.c || 0
  } });
});
app.get("/api/automation/bot-account", async (c) => {
  const botId = c.req.query("botId");
  if (!botId) return c.json({ error: "botId required" }, 400);
  try {
    await c.env.DB.prepare(`CREATE TABLE IF NOT EXISTS bot_accounts (
      account_id TEXT PRIMARY KEY, ig_handle TEXT, stage TEXT DEFAULT 'new',
      daily_task_limit INTEGER DEFAULT 5, speed_factor REAL DEFAULT 2.5,
      first_used_at TEXT, vps_name TEXT, proxy TEXT
    )`).run();
    try {
      await c.env.DB.prepare("ALTER TABLE bot_accounts ADD COLUMN vps_name TEXT").run();
    } catch {
    }
    try {
      await c.env.DB.prepare("ALTER TABLE bot_accounts ADD COLUMN proxy TEXT").run();
    } catch {
    }
    try {
      await c.env.DB.prepare("ALTER TABLE bot_accounts ADD COLUMN first_used_at TEXT").run();
    } catch {
    }
    await c.env.DB.prepare("DELETE FROM bot_accounts WHERE account_id=?").bind(botId).run();
    await c.env.DB.prepare(`INSERT INTO bot_accounts (account_id, ig_handle, first_used_at, vps_name, proxy) VALUES (?, ?, ?, ?, ?)`).bind(
      botId,
      c.req.query("igHandle") || null,
      c.req.query("firstUsedAt") || null,
      c.req.query("vpsName") || null,
      c.req.query("proxyIp") || null
    ).run();
    const all = await c.env.DB.prepare("SELECT account_id, ig_handle, stage, daily_task_limit, speed_factor, first_used_at, vps_name, proxy FROM bot_accounts").all();
    return c.json({
      ok: true,
      accounts: (all.results || []).map((a) => ({
        accountId: a.account_id,
        igHandle: a.ig_handle,
        stage: a.stage,
        dailyLimit: a.daily_task_limit,
        speed: a.speed_factor,
        firstUsedAt: a.first_used_at || null,
        vpsName: a.vps_name || null,
        proxy: a.proxy || null
      }))
    });
  } catch (e) {
    return c.json({ ok: false, error: String(e?.message || e) }, 500);
  }
});
app.get("/api/automation/bot-account/delete", async (c) => {
  const botId = c.req.query("botId");
  if (!botId) return c.json({ error: "botId required" }, 400);
  try {
    await c.env.DB.prepare("DELETE FROM bot_accounts WHERE account_id=?").bind(botId).run();
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ ok: false, error: String(e?.message || e) }, 500);
  }
});
app.post("/api/automation/sync", async (c) => {
  const token = c.req.header("x-sync-token");
  if (token !== "vps-sync-token-2026") return c.json({ error: "unauthorized" }, 401);
  const body = await c.req.json();
  try {
    await c.env.DB.prepare("ALTER TABLE bot_accounts ADD COLUMN first_used_at TEXT").run();
  } catch {
  }
  try {
    await c.env.DB.prepare("ALTER TABLE bot_accounts ADD COLUMN vps_name TEXT").run();
  } catch {
  }
  try {
    await c.env.DB.prepare("ALTER TABLE bot_accounts ADD COLUMN proxy TEXT").run();
  } catch {
  }
  if (body.counts) {
    try {
      await c.env.DB.prepare("DELETE FROM automation_tasks").run();
      for (const [status, cnt] of Object.entries(body.counts)) {
        if (Number(cnt) > 0) {
          await c.env.DB.prepare("INSERT INTO automation_tasks (id, status, created_at) VALUES (?, ?, ?)").bind(`sync_${status}`, status, Date.now()).run();
        }
      }
    } catch {
    }
  }
  if (body.daily) {
    try {
      await c.env.DB.prepare("DELETE FROM daily_task_stats").run();
      for (const d of body.daily) {
        await c.env.DB.prepare("INSERT INTO daily_task_stats (day, status, cnt) VALUES (?, ?, ?)").bind(d.day, d.status, d.cnt).run();
      }
    } catch {
    }
  }
  if (body.accounts) {
    try {
      await c.env.DB.prepare("DELETE FROM bot_accounts").run();
      for (const a of body.accounts) {
        await c.env.DB.prepare("INSERT INTO bot_accounts (account_id, ig_handle, stage, daily_task_limit, speed_factor, first_used_at, vps_name, proxy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(a.account_id, a.ig_handle, a.stage, a.daily_task_limit, a.speed_factor, a.first_used_at || null, a.vps_name || null, a.proxy || null).run();
      }
    } catch {
    }
  }
  return c.json({ ok: true });
});
app.get("/api/automation/dashboard", async (c) => {
  let counts = { pending: 0, leased: 0, done: 0, failed: 0 };
  let byDay = {};
  let accountsList = [];
  try {
    const summary = await c.env.DB.prepare("SELECT status, COUNT(*) as cnt FROM automation_tasks GROUP BY status").all();
    for (const r of summary.results || []) counts[r.status] = Number(r.cnt || 0);
  } catch {
  }
  try {
    const daily = await c.env.DB.prepare("SELECT day, status, cnt FROM daily_task_stats ORDER BY day DESC LIMIT 56").all();
    for (const r of daily.results || []) {
      if (!byDay[r.day]) byDay[r.day] = { day: r.day, pending: 0, leased: 0, done: 0, failed: 0, total: 0 };
      byDay[r.day][r.status] = Number(r.cnt || 0);
      byDay[r.day].total += Number(r.cnt || 0);
    }
  } catch {
  }
  try {
    const accounts = await c.env.DB.prepare("SELECT account_id, ig_handle, stage, daily_task_limit, speed_factor, first_used_at, vps_name, proxy FROM bot_accounts").all();
    accountsList = (accounts.results || []).map((a) => ({
      accountId: a.account_id,
      igHandle: a.ig_handle,
      stage: a.stage,
      dailyLimit: a.daily_task_limit,
      speed: a.speed_factor,
      firstUsedAt: a.first_used_at || null,
      vpsName: a.vps_name || null,
      proxy: a.proxy || null
    }));
  } catch {
  }
  return c.json({
    ok: true,
    total: Object.values(counts).reduce((a, b) => a + b, 0),
    counts,
    days: Object.values(byDay).sort((a, b) => String(b.day).localeCompare(String(a.day))),
    accounts: accountsList
  });
});
app.get("/api/automation/stats/dashboard", async (c) => {
  const resp = await c.req.raw.clone();
  return await c.env.ASSETS?.fetch?.(new URL("/api/automation/dashboard", c.req.url)) || c.redirect("/api/automation/dashboard");
});
app.post("/api/automation/behavior-logs", async (c) => {
  const { logs } = await c.req.json();
  if (!Array.isArray(logs) || logs.length === 0) return c.json({ ok: true });
  try {
    await ensureBehaviorLogsTable(c.env.DB);
    const stmts = logs.map(
      (row) => c.env.DB.prepare("INSERT INTO bot_behavior_logs (ts, bot_id, event, data) VALUES (?, ?, ?, ?)").bind(row.ts, row.botId || "unknown", row.event, JSON.stringify(row))
    );
    await c.env.DB.batch(stmts);
    return c.json({ ok: true, count: logs.length });
  } catch (e) {
    return c.json({ ok: false, error: String(e?.message || e) }, 500);
  }
});
app.get("/api/automation/behavior-logs", async (c) => {
  if (!checkBotToken(c)) return c.json({ error: "Unauthorized" }, 401);
  const botId = c.req.query("botId") || "";
  const event = c.req.query("event") || "";
  const limit = Math.min(200, Math.max(1, Number(c.req.query("limit")) || 100));
  const offset = Math.max(0, Number(c.req.query("offset")) || 0);
  try {
    await ensureBehaviorLogsTable(c.env.DB);
    let query = "SELECT * FROM bot_behavior_logs";
    const wheres = [];
    const params = [];
    wheres.push("created_at >= datetime('now', '-30 days')");
    if (botId) {
      wheres.push("bot_id=?");
      params.push(botId);
    }
    if (event) {
      wheres.push("event=?");
      params.push(event);
    }
    query += " WHERE " + wheres.join(" AND ");
    query += " ORDER BY id DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);
    const stmt = c.env.DB.prepare(query).bind(...params);
    const result = await stmt.all();
    return c.json({ ok: true, logs: (result.results || []).map((r) => {
      try {
        return { ...JSON.parse(r.data || "{}"), id: r.id, ts: r.ts, botId: r.bot_id, event: r.event };
      } catch {
        return { id: r.id, ts: r.ts, botId: r.bot_id, event: r.event };
      }
    }), offset, limit });
  } catch (e) {
    return c.json({ ok: false, error: String(e?.message || e) }, 500);
  }
});
app.get("/api/automation/behavior-bots", async (c) => {
  if (!checkBotToken(c)) return c.json({ error: "Unauthorized" }, 401);
  try {
    await ensureBehaviorLogsTable(c.env.DB);
    const result = await c.env.DB.prepare(
      "SELECT DISTINCT bot_id FROM bot_behavior_logs WHERE created_at >= datetime('now', '-30 days') ORDER BY bot_id"
    ).all();
    return c.json({ ok: true, bots: (result.results || []).map((r) => r.bot_id) });
  } catch (e) {
    return c.json({ ok: false, error: String(e?.message || e) }, 500);
  }
});
app.post("/api/bot/register", async (c) => {
  if (!checkBotToken(c)) return c.json({ error: "Unauthorized" }, 401);
  const { botId, host, version, meta } = await c.req.json();
  if (!botId) return c.json({ error: "botId required" }, 400);
  await c.env.DB.prepare(`CREATE TABLE IF NOT EXISTS bot_instances (
    bot_id TEXT PRIMARY KEY, host TEXT, version TEXT, status TEXT DEFAULT 'online',
    registered_at INTEGER, last_heartbeat INTEGER, meta TEXT
  )`).run();
  try {
    await c.env.DB.prepare("ALTER TABLE bot_instances ADD COLUMN meta TEXT").run();
  } catch {
  }
  const now = Date.now();
  await c.env.DB.prepare(`INSERT INTO bot_instances (bot_id,host,version,status,registered_at,last_heartbeat,meta)
    VALUES (?,?,?,'online',?,?,?) ON CONFLICT(bot_id) DO UPDATE SET
    host=excluded.host, version=excluded.version, status='online', last_heartbeat=excluded.last_heartbeat, meta=excluded.meta
  `).bind(botId, host || "", version || "", now, now, meta ? JSON.stringify(meta) : null).run();
  return c.json({ ok: true, botId, online: true, staleMs: 0 });
});
app.post("/api/bot/heartbeat", async (c) => {
  if (!checkBotToken(c)) return c.json({ error: "Unauthorized" }, 401);
  const { botId, host, version } = await c.req.json();
  if (!botId) return c.json({ error: "botId required" }, 400);
  const now = Date.now();
  await c.env.DB.prepare(`INSERT INTO bot_instances (bot_id,host,version,status,registered_at,last_heartbeat)
    VALUES (?,?,?,'online',?,?) ON CONFLICT(bot_id) DO UPDATE SET
    status='online', last_heartbeat=excluded.last_heartbeat, host=excluded.host, version=excluded.version
  `).bind(botId, host || "", version || "", now, now).run();
  return c.json({ ok: true, botId, ts: now });
});
async function ensureBotTables(db) {
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS bot_tasks (
    id TEXT PRIMARY KEY, payload TEXT, status TEXT DEFAULT 'pending',
    run_at INTEGER, lease_until INTEGER, leased_by TEXT,
    attempts INTEGER DEFAULT 0, max_attempts INTEGER DEFAULT 3,
    error_reason TEXT, created_at INTEGER, updated_at INTEGER
  )`).run();
  } catch {
  }
  for (const col of ["run_at", "lease_until", "leased_by", "attempts", "max_attempts", "error_reason", "updated_at"]) {
    try {
      await db.prepare(`ALTER TABLE bot_tasks ADD COLUMN ${col} INTEGER`).run();
    } catch {
    }
  }
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS bot_instances (
    bot_id TEXT PRIMARY KEY, host TEXT, version TEXT, status TEXT DEFAULT 'online',
    registered_at INTEGER, last_heartbeat INTEGER, meta TEXT
  )`).run();
  } catch {
  }
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS bot_config (
    bot_id TEXT NOT NULL, key TEXT NOT NULL, value TEXT, updated_at INTEGER,
    PRIMARY KEY (bot_id, key)
  )`).run();
  } catch {
  }
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS bot_profile_adjustments (
    bot_id TEXT PRIMARY KEY, adjustments_json TEXT, analysis_json TEXT,
    confidence REAL DEFAULT 0, analyzed_at INTEGER, updated_at INTEGER
  )`).run();
  } catch {
  }
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS bot_observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT, bot_id TEXT, command_id TEXT, artist_handle TEXT,
    mode TEXT, summary_json TEXT, profile_facts_json TEXT, created_at INTEGER
  )`).run();
  } catch {
  }
  try {
    await db.prepare(`ALTER TABLE bot_observations ADD COLUMN artist_handle TEXT`).run();
  } catch {
  }
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS daily_task_stats (
    day TEXT NOT NULL, status TEXT NOT NULL, cnt INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, status)
  )`).run();
  } catch {
  }
}
__name(ensureBotTables, "ensureBotTables");
app.get("/api/automation/neon-tasks", async (c) => {
  await ensureBotTables(c.env.DB);
  const limit = Math.min(200, Math.max(1, Number(c.req.query("limit")) || 50));
  const status = c.req.query("status") || "";
  try {
    let sql = "SELECT id, status, leased_by as leasedBy, payload, created_at, updated_at, error_reason FROM bot_tasks";
    const binds = [];
    const wheres = [];
    if (status) {
      wheres.push("status=?");
      binds.push(status);
    }
    if (wheres.length) sql += " WHERE " + wheres.join(" AND ");
    sql += " ORDER BY created_at DESC LIMIT ?";
    binds.push(limit);
    const rows = await c.env.DB.prepare(sql).bind(...binds).all();
    const tasks = (rows.results || []).map((t) => {
      let payload = {};
      try {
        payload = JSON.parse(t.payload || "{}");
      } catch {
      }
      return { id: t.id, status: t.status, leasedBy: t.leasedBy || null, payload, createdAt: t.created_at, updatedAt: t.updated_at, errorReason: t.error_reason || null };
    });
    return c.json({ ok: true, total: tasks.length, tasks });
  } catch (e) {
    return c.json({ ok: false, tasks: [], error: String(e?.message || e) }, 500);
  }
});
app.get("/api/automation/state-progress", async (c) => {
  try {
    await ensureBotTables(c.env.DB);
    let artists = [];
    try {
      const rows = await c.env.DB.prepare(`
      SELECT json_extract(payload, '$.state') as state, COUNT(*) as total
      FROM bot_tasks WHERE payload IS NOT NULL
      GROUP BY json_extract(payload, '$.state')
    `).all();
      artists = (rows.results || []).map((r) => ({
        state: r.state || "UNKNOWN",
        total: Number(r.total || 0)
      }));
    } catch (e1) {
      return c.json({ ok: false, error: "D1: " + String(e1?.message || e1).slice(0, 120) }, 500);
    }
    let doneRows = [];
    try {
      const done = await c.env.DB.prepare(`
        SELECT json_extract(payload, '$.state') as state,
          COUNT(DISTINCT json_extract(payload, '$.artistId')) as visited
        FROM bot_tasks WHERE status IN ('done','failed') AND payload IS NOT NULL
        GROUP BY json_extract(payload, '$.state')
      `).all();
      doneRows = (done.results || []).map((r) => ({
        state: r.state || "UNKNOWN",
        visited: Number(r.visited || 0)
      }));
    } catch {
    }
    const weekAgo = Date.now() - 7 * 864e5;
    let recentCount = 0;
    try {
      const row = await c.env.DB.prepare(
        "SELECT COUNT(*) as cnt FROM bot_tasks WHERE status='done' AND updated_at>=?"
      ).bind(weekAgo).first();
      recentCount = row?.cnt || 0;
    } catch {
    }
    const dailyRate = Math.max(1, Math.round(recentCount / 7));
    const progress = (artists || []).map((a) => {
      const state = a.state || "UNKNOWN";
      const doneRow = (doneRows || []).find((r) => r.state === state);
      const total = Number(a.total || 0);
      const visited = Number(doneRow?.visited || 0);
      const pct = total > 0 ? Math.round(visited / total * 100) : 0;
      const remaining = total - visited;
      const daysLeft = dailyRate > 0 ? Math.ceil(remaining / dailyRate) : null;
      return { state, total, visited, pct, remaining, daysLeft };
    });
    return c.json({ ok: true, progress, dailyRate });
  } catch (e) {
    return c.json({ ok: false, error: String(e?.message || e).slice(0, 300) }, 500);
  }
});
app.get("/api/automation/poll", async (c) => {
  if (!checkBotToken(c)) return c.json({ error: "Unauthorized" }, 401);
  const botId = c.req.query("botId") || "";
  const limit = Math.min(10, Math.max(1, Number(c.req.query("limit")) || 1));
  if (!botId) return c.json({ error: "botId required" }, 400);
  const connStr = c.env.NEON_DATABASE_URL;
  if (!connStr) return c.json({ error: "NEON_DATABASE_URL not configured" }, 500);
  const now = Date.now();
  const dedupWindow = now - 7 * 24 * 60 * 60 * 1e3;
  try {
    await neonQuery(
      connStr,
      `UPDATE automation_tasks SET status = 'pending', leased_by = NULL, lease_until = NULL, updated_at = $1
       WHERE status = 'leased' AND lease_until IS NOT NULL AND lease_until < $1`,
      [now]
    ).catch(() => {
    });
    const rows = await neonQuery(
      connStr,
      `UPDATE automation_tasks SET status = 'leased', leased_by = $1, lease_until = $2, updated_at = $3
       WHERE id IN (
         SELECT id FROM automation_tasks
         WHERE status = 'pending' AND run_at <= $4
           AND (payload->>'artistHandle' IS NULL
             OR NOT EXISTS (
               SELECT 1 FROM automation_tasks d
               WHERE d.status = 'done' AND d.updated_at > $5
                 AND d.payload->>'artistHandle' = automation_tasks.payload->>'artistHandle'
             ))
         ORDER BY run_at ASC LIMIT $6
       )
       RETURNING id, payload::text`,
      [botId, now + 12e4, now, now, dedupWindow, limit]
    );
    const commands = (rows || []).map((r) => {
      let payload = {};
      try {
        payload = JSON.parse(r.payload || "{}");
      } catch {
      }
      return { ...payload, id: r.id };
    });
    await c.env.DB.prepare(`INSERT INTO bot_instances (bot_id,status,registered_at,last_heartbeat)
      VALUES (?,'online',?,?) ON CONFLICT(bot_id) DO UPDATE SET status='online', last_heartbeat=excluded.last_heartbeat
    `).bind(botId, now, now).catch(() => {
    });
    return c.json({ ok: true, commands });
  } catch (e) {
    console.error("[poll] Neon error:", e?.message || e);
    return c.json({ ok: true, commands: [] });
  }
});
app.post("/api/automation/report", async (c) => {
  if (!checkBotToken(c)) return c.json({ error: "Unauthorized" }, 401);
  const { botId, commandId, status, reason } = await c.req.json();
  if (!botId || !commandId) return c.json({ error: "botId and commandId required" }, 400);
  if (status !== "done" && status !== "failed") return c.json({ error: "status must be done or failed" }, 400);
  const connStr = c.env.NEON_DATABASE_URL;
  if (!connStr) return c.json({ error: "NEON_DATABASE_URL not configured" }, 500);
  const now = Date.now();
  try {
    await neonQuery(
      connStr,
      `UPDATE automation_tasks SET status = $1, lease_until = NULL, leased_by = NULL, error_reason = $2, updated_at = $3
       WHERE id = $4 AND leased_by = $5 AND status IN ('leased','running')`,
      [status, status === "failed" ? reason || "unknown" : null, now, commandId, botId]
    );
  } catch (e) {
    console.error("[report] Neon error:", e?.message || e);
  }
  const day2 = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  await c.env.DB.prepare(`CREATE TABLE IF NOT EXISTS daily_task_stats (
    day TEXT NOT NULL, status TEXT NOT NULL, cnt INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, status)
  )`).catch(() => {
  });
  await c.env.DB.prepare(
    `INSERT INTO daily_task_stats (day, status, cnt) VALUES (?, ?, 1)
     ON CONFLICT(day, status) DO UPDATE SET cnt = cnt + 1`
  ).bind(day2, status === "done" ? "done" : "failed").run().catch(() => {
  });
  return c.json({ ok: true, commandId, status });
});
app.get("/api/automation/neon-test", async (c) => {
  const connStr = c.env.NEON_DATABASE_URL;
  if (!connStr) return c.json({ ok: false, error: "NEON_DATABASE_URL not set", hint: "use wrangler secret put NEON_DATABASE_URL" });
  const m = connStr.match(/postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)/);
  if (!m) return c.json({ ok: false, error: "URL regex no match", url: connStr.slice(0, 50) + "..." });
  try {
    const basic = btoa(`${m[1]}:${m[2]}`);
    const resp = await fetch(`https://${m[3]}/v2/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Basic ${basic}` },
      body: JSON.stringify({ query: "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name" })
    });
    const text = await resp.text();
    if (!resp.ok) return c.json({ ok: false, error: `Neon ${resp.status}`, detail: text.slice(0, 300) });
    const data = JSON.parse(text);
    const tables = (data.rows || data || []).map((t) => t.table_name);
    const countResp = await fetch(`https://${m[3]}/v2/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Basic ${basic}` },
      body: JSON.stringify({ query: "SELECT COUNT(*) as cnt FROM artists" })
    });
    const countData = await countResp.json();
    const cnt = (countData.rows || [])[0]?.cnt || 0;
    return c.json({ ok: true, tables, artistCount: cnt, user: m[1], host: m[3] });
  } catch (e) {
    return c.json({ ok: false, error: e.message, stack: e.stack?.slice(0, 500) });
  }
});
app.get("/api/automation/neon-check", async (c) => {
  const connStr = c.env.NEON_DATABASE_URL;
  if (!connStr) return c.json({ ok: false, error: "NEON_DATABASE_URL not set" });
  try {
    const tables = await neonQuery(connStr, "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
    const artistCount = await neonQuery(connStr, "SELECT COUNT(*) as cnt FROM artists");
    return c.json({ ok: true, tables: tables.map((t) => t.table_name), artistCount: artistCount[0]?.cnt || 0 });
  } catch (e) {
    return c.json({ ok: false, error: e.message });
  }
});
async function ensureObservationsTable(connStr) {
  try {
    await neonQuery(connStr, `CREATE TABLE IF NOT EXISTS bot_observations (id SERIAL PRIMARY KEY, bot_id TEXT NOT NULL, artist_handle TEXT, mode TEXT NOT NULL, created_at BIGINT NOT NULL)`);
  } catch {
  }
  try {
    await neonQuery(connStr, `CREATE INDEX IF NOT EXISTS idx_bot_obs_created_at ON bot_observations(created_at DESC)`);
  } catch {
  }
}
__name(ensureObservationsTable, "ensureObservationsTable");
app.get("/api/automation/observations", async (c) => {
  const limit = Math.min(50, Math.max(1, Number(c.req.query("limit")) || 20));
  try {
    const vps = await fetch(`http://163.245.212.169:3000/api/bot/observations?limit=${limit}`, { signal: AbortSignal.timeout(3e3) });
    if (vps.ok) {
      const data = await vps.json();
      const items = (data.observations || []).map((o) => ({ id: o.id, bot_id: o.botId, artist_handle: o.artistHandle || "", mode: o.mode, created_at: o.createdAt }));
      return c.json({ ok: true, items });
    }
  } catch {
  }
  try {
    const connStr = c.env.NEON_DATABASE_URL;
    if (!connStr) return c.json({ ok: false, error: "NEON not configured", items: [] }, 500);
    await ensureObservationsTable(connStr);
    const rows = await neonQuery(
      connStr,
      `SELECT id, bot_id, COALESCE(artist_handle, '') as artist_handle, mode, created_at FROM bot_observations ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return c.json({ ok: true, items: rows || [] });
  } catch (e) {
    return c.json({ ok: false, error: e.message, items: [] }, 500);
  }
});
app.post("/api/automation/observations", async (c) => {
  try {
    const body = await c.req.json();
    const connStr = c.env.NEON_DATABASE_URL;
    if (!connStr) return c.json({ error: "NEON not configured" }, 500);
    await ensureObservationsTable(connStr);
    if (body.items && Array.isArray(body.items)) {
      let synced = 0;
      for (const o of body.items) {
        const botId2 = String(o.botId || o.bot_id || "").trim();
        const ah = String(o.artistHandle || o.artist_handle || "").replace(/^@/, "").trim();
        const mode2 = String(o.mode || "").trim();
        const ts = Number(o.createdAt || o.created_at || Date.now());
        if (!botId2 || !mode2) continue;
        await neonQuery(connStr, `INSERT INTO bot_observations (bot_id, artist_handle, mode, created_at) VALUES ($1, $2, $3, $4)`, [botId2, ah || null, mode2, ts]);
        synced++;
      }
      return c.json({ ok: true, synced });
    }
    const botId = String(body.botId || body.bot_id || "").trim();
    const artistHandle = String(body.artistHandle || body.artist_handle || "").replace(/^@/, "").trim();
    const mode = String(body.mode || "").trim();
    if (!botId || !mode) return c.json({ error: "botId and mode required" }, 400);
    await neonQuery(connStr, `INSERT INTO bot_observations (bot_id, artist_handle, mode, created_at) VALUES ($1, $2, $3, $4)`, [botId, artistHandle || null, mode, Date.now()]);
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});
app.get("/api/automation/artists", async (c) => {
  const connStr = c.env.NEON_DATABASE_URL;
  if (!connStr) return c.json({ error: "NEON_DATABASE_URL not configured" }, 500);
  try {
    const state = (c.req.query("state") || "").toUpperCase();
    const search = c.req.query("search") || "";
    const page = Math.max(1, parseInt(c.req.query("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") || "50")));
    let where = "WHERE ig_handle IS NOT NULL AND ig_handle != ''";
    const params = [];
    let idx = 1;
    if (state) {
      where += ` AND import_region = $${idx++}`;
      params.push(state);
    }
    if (search) {
      where += ` AND (shop_name ILIKE $${idx} OR ig_handle ILIKE $${idx} OR city ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    const countResult = await neonQuery(connStr, `SELECT COUNT(*) as cnt FROM artists ${where}`, params);
    const total = countResult[0]?.cnt || 0;
    const offset = (page - 1) * limit;
    const rows = await neonQuery(
      connStr,
      `SELECT id, shop_name, ig_handle, city, import_region, phone, website, rating FROM artists ${where} ORDER BY shop_name ASC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );
    return c.json({ ok: true, items: rows || [], total, page, limit, pages: Math.ceil(total / limit) });
  } catch (e) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});
app.post("/api/automation/tasks/create-from-artists", async (c) => {
  const connStr = c.env.NEON_DATABASE_URL;
  if (!connStr) return c.json({ error: "NEON_DATABASE_URL not configured" }, 500);
  try {
    const { artistIds, taskType = "ig_browse" } = await c.req.json();
    if (!artistIds?.length) return c.json({ error: "artistIds required" }, 400);
    const ts = Date.now();
    const dedupWindow = ts - 7 * 24 * 60 * 60 * 1e3;
    let created = 0, skipped = 0;
    for (const id of artistIds) {
      const artist = await neonQuery(
        connStr,
        `SELECT id, shop_name, ig_handle, city, state FROM artists WHERE id = $1`,
        [id]
      );
      if (!artist?.[0]) continue;
      const a = artist[0];
      const existing = await neonQuery(
        connStr,
        `SELECT id FROM automation_tasks WHERE payload->>'artistHandle' = $1 AND updated_at > $2 LIMIT 1`,
        [a.ig_handle || a.shop_name, dedupWindow]
      );
      if (existing?.length > 0) {
        skipped++;
        continue;
      }
      await neonQuery(
        connStr,
        `INSERT INTO automation_tasks (id, status, payload, run_at, created_at, updated_at)
         VALUES ($1, 'pending', $2, $3, $4, $4)`,
        [
          `manual_${ts}_${id}`,
          JSON.stringify({ artistHandle: a.ig_handle || "", shopName: a.shop_name || "", city: a.city || "", state: a.state || "" }),
          ts,
          ts
        ]
      );
      created++;
    }
    return c.json({ ok: true, created, skipped, total: artistIds.length });
  } catch (e) {
    return c.json({ ok: false, error: e.message }, 500);
  }
});
var index_default = app;
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
