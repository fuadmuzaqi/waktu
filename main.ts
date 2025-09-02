Deno.serve((req) => {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const hh = parts.find(x => x.type === "hour")!.value;
  const mm = parts.find(x => x.type === "minute")!.value;
  const ss = parts.find(x => x.type === "second")!.value;
  const ms = now.getMilliseconds().toString().padStart(3, "0");

  // ✅ pakai backtick
  const time = ${hh}:${mm}:${ss}:${ms};

  const url = new URL(req.url);
  const plain = url.searchParams.get("plain");

  return new Response(
    plain ? time : JSON.stringify({ time, tz: "Asia/Jakarta (GMT+7)" }),
    {
      headers: {
        "Content-Type": plain ? "text/plain; charset=utf-8" : "application/json",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
});
