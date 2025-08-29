// parco.js — WIB realtime API-only dari Cloudflare Worker (tanpa fallback device time)
// Error jika API gagal (sesuai permintaanmu).

(function () {
  const ZONE = 'Asia/Jakarta';
  const API_URL = 'https://fuadtm.fuad-alhabibi.workers.dev/'; // ganti ini
  const RESYNC_MS = 60 * 60 * 1000; // re-sync tiap 1 jam

  const fmt = new Intl.DateTimeFormat('id-ID', {
    timeZone: ZONE,
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  const pad3 = n => String(n).padStart(3, '0');

  let baseServerMs = 0; // epoch server saat sinkron
  let baseMono = 0;     // performance.now() saat sinkron
  let rafId = null;
  let stopped = false;

  function setError(el, msg) {
    stopped = true;
    if (rafId && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafId);
    el.textContent = 'Error';
  }

  async function syncFromAPI(el) {
    try {
      const ac = ('AbortController' in window) ? new AbortController() : null;
      if (ac) setTimeout(() => ac.abort(), 8000); // timeout 8s

      const t1 = performance.now?.() ?? 0;
      const res = await fetch(API_URL, { cache: 'no-store', signal: ac?.signal });
      const t2 = performance.now?.() ?? 0;

      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (typeof data.epochMs !== 'number') throw new Error('Invalid payload');

      const halfRTT = (t2 - t1) / 2;
      baseServerMs = data.epochMs + halfRTT; // estimasi "now" saat respons tiba
      baseMono = performance.now?.() ?? 0;
      return true;
    } catch (e) {
      setError(el, e?.message);
      return false;
    }
  }

  function render(el) {
    if (stopped) return;
    const nowMono = performance.now?.() ?? 0;
    const elapsed = nowMono - baseMono;         // durasi lokal monotonic (bukan wall clock device)
    const t = baseServerMs + elapsed;           // waktu berjalan dari baseline server
    const d = new Date(t);

    const parts = fmt.formatToParts(d);
    let hh='00', mm='00', ss='00';
    for (const p of parts) {
      if (p.type === 'hour') hh = p.value;
      else if (p.type === 'minute') mm = p.value;
      else if (p.type === 'second') ss = p.value;
    }
    el.textContent = ${hh} : ${mm} : ${ss} : ${pad3(d.getMilliseconds())};

    rafId = (typeof requestAnimationFrame === 'function')
      ? requestAnimationFrame(() => render(el))
      : setTimeout(() => render(el), 16);
  }

  async function startJakartaClock(el) {
    if (!(el instanceof Element)) throw new Error('startJakartaClock: butuh elemen DOM');
    const ok = await syncFromAPI(el); // sinkron awal WAJIB sukses
    if (!ok) return;
    render(el);
    setInterval(async () => { if (!stopped) await syncFromAPI(el); }, RESYNC_MS);
  }

  window.startJakartaClock = startJakartaClock;
})();
