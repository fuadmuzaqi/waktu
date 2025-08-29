// clock.js — WIB realtime hanya dari API timeapi.io (tanpa fallback jam device)
// Jika API gagal (awal atau re-sync), tampil "Error" dan berhenti.

(function () {
  const ZONE = 'Asia/Jakarta';
  const API_URL = https://timeapi.io/api/Time/current/zone?timeZone=${encodeURIComponent(ZONE)};
  const RESYNC_MS = 60 * 60 * 1000; // re-sync setiap 1 jam

  // Formatter HH:mm:ss untuk WIB (Asia/Jakarta)
  const fmt = new Intl.DateTimeFormat('id-ID', {
    timeZone: ZONE,
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  const pad3 = n => String(n).padStart(3, '0');

  let baseServerMs = 0; // waktu server saat sinkron (ms)
  let baseMono = 0;     // performance.now() saat sinkron
  let rafId = null;
  let stopped = false;

  function setError(el, msg) {
    stopped = true;
    if (rafId && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafId);
    el.textContent = 'Error';
    // el.title = msg || 'API error'; // uncomment jika ingin debug tooltip
  }

  // Ambil waktu server dan jadikan baseline (tambahkan koreksi half RTT)
  async function syncFromAPI(el) {
    try {
      const ac = ('AbortController' in window) ? new AbortController() : null;
      if (ac) setTimeout(() => ac.abort(), 8000); // timeout 8s

      const t1 = (typeof performance !== 'undefined') ? performance.now() : 0;
      const res = await fetch(API_URL, { cache: 'no-store', signal: ac ? ac.signal : undefined });
      const t2 = (typeof performance !== 'undefined') ? performance.now() : 0;

      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();

      // timeapi.io mengembalikan ISO string pada field "dateTime"
      // contoh: "2025-08-29T13:48:06.087742+07:00"
      const serverIso = data && data.dateTime;
      if (!serverIso) throw new Error('Invalid payload');

      // JS Date menerima presisi ms (akan memangkas digit ekstra jika ada)
      const serverMs = Date.parse(serverIso);
      if (isNaN(serverMs)) throw new Error('Invalid datetime');

      const halfRTT = (t2 - t1) / 2;
      baseServerMs = serverMs + halfRTT; // estimasi "sekarang" saat respons tiba
      baseMono = (typeof performance !== 'undefined') ? performance.now() : 0;
      return true;
    } catch (e) {
      setError(el, e && e.message);
      return false;
    }
  }

  function render(el) {
    if (stopped) return;
    const nowMono = (typeof performance !== 'undefined') ? performance.now() : 0;
    const elapsed = nowMono - baseMono;          // hanya durasi monotonic lokal
    const t = baseServerMs + elapsed;            // waktu = baseline server + durasi
    const d = new Date(t);

    // Format HH:mm:ss dari WIB; ms dari objek Date yang sama
    const parts = fmt.formatToParts(d);
    let hh = '00', mm = '00', ss = '00';
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
    if (!(el instanceof Element)) throw new Error('startJakartaClock: parameter harus elemen DOM');

    // Sinkron awal WAJIB sukses
    const ok = await syncFromAPI(el);
    if (!ok) return;

    render(el);

    // Re-sync berkala (kalau gagal → Error & berhenti, sesuai permintaan)
    setInterval(async () => {
      if (stopped) return;
      const ok2 = await syncFromAPI(el);
      if (!ok2) return; // setError sudah dipanggil di syncFromAPI
    }, RESYNC_MS);
  }

  window.startJakartaClock = startJakartaClock;
})();
