const MAX_BODY = 8_000_000;
async function readBody(request, limit = MAX_BODY) {
  if (Number(request.headers.get('content-length') || 0) > limit) throw Object.assign(new Error('Data terlalu besar.'), {status: 413});
  if (!request.body) return Buffer.alloc(0);
  const reader = request.body.getReader(), chunks = [];
  let length = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) { await reader.cancel(); throw Object.assign(new Error('Data terlalu besar.'), {status: 413}); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
async function dispatch(handler, request, bytes) {
  const url = new URL(request.url), headers = Object.fromEntries(request.headers);
  headers.host = url.host;
  const req = {
    url: url.pathname + url.search, method: request.method, headers,
    socket: {remoteAddress: request.headers.get('cf-connecting-ip') || 'unknown'},
    async *[Symbol.asyncIterator]() { if (bytes.length) yield bytes; }
  };
  const responseHeaders = new Headers();
  let status = 200, content = null;
  const res = {
    headersSent: false,
    setHeader(k, v) { responseHeaders.set(k, v); },
    writeHead(code, values = {}) { status = code; for (const [k, v] of Object.entries(values)) responseHeaders.set(k, v); this.headersSent = true; },
    end(value) { content = value ?? null; }
  };
  await handler(req, res);
  return new Response(content, {status, headers: responseHeaders});
}
module.exports = {readBody, dispatch};
