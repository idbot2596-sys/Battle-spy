export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/patch.bytes") {
      return new Response(env.ASSETS.fetch(new Request(new URL("/patch.bytes", url), request)), {
        headers: {
          "Content-Type": "application/octet-stream",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Content-Disposition": 'inline; filename="patch.bytes"'
        }
      });
    }

    return new Response("NineX patch delivery worker", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
};
