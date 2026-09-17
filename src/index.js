export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/patch.bytes") {
      return env.ASSETS.fetch(request);
    }

    return new Response("NineX patch delivery worker", {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8"
      }
    });
  }
};
// NineX patch delivery
