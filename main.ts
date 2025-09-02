// main.ts
Deno.serve((req) => {
  const now = new Date();

  // Ambil jam/menit/detik sesuai zona waktu Asia/Jakarta (GMT+7)
  const fmt = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const hh = parts.find(p => p.type === "hour")!.value;
  const mm = parts.find(p => p.type === "minute")!.value;
  const ss = parts.find(p => p.type === "second")!.value;

  // Milidetik (0–999), tidak terpengaruh zona waktu
  const ms = now.getMilliseconds().toString().padStart(3, "0");

  const time = ${hh}:${mm}:${ss}:${ms};

  // ?plain=1 → balikan teks polos
  const url = new URL(req.url);
  const plain = url.searchParams.get("plain");

  const headers = new Headers({
    "Content-Type": plain ? "text/plain; charset=utf-8" : "application/json",
    "Cache-Control": "no-store",
    // Biar bebas diakses dari web mana pun
    "Access-Control-Allow-Origin": "*",
  });

  return new Response(plain ? time : JSON.stringify({ time, tz: "Asia/Jakarta (GMT+7)" }), { headers });
});
