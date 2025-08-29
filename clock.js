// clock.js — WIB realtime hanya dari API (tanpa memakai Date.now sebagai sumber waktu).
// Sumber waktu: worldtimeapi.org. Jika API gagal -> tampil "Error" dan berhenti.

(function () {
  const ZONE = 'Asia/Jakarta';
  const API_URL = https://worldtimeapi.org/api/timezone/${ZONE};
  const RESYNC_MS = 60 * 60 * 1000; // sinkron ulang tiap 1 jam

  // Formatter HH:mm:ss untuk WIB (Asia/Jakarta)
  const fmt = new Intl.DateTimeFormat('id-ID', {
    timeZone: ZONE,
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  const pad3 = n => String(n).padStart(3, '0');

  let baseServerMs = 0;      // "waktu server" pada momen sinkron
  let baseMono = 0;          // performance.now() pada momen sinkron
  let rafId = null;
  let stopped = false;

  function setError(el, msg) {
    stopped = true;
    if (rafId && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafId);
    el.textContent = 'Error';
    // Jika ingin men-debug: el.title = msg || 'API error';
  }

  // Ambil waktu server + perkirakan half RTT -> tentukan baseline
  async function syncFromAPI(el) {
    try {
      const ctrl = ('AbortController' in window) ? new AbortController() : null;
      if (ctrl) setTimeout(() => ctrl.abort(), 8000); // timeout 8s
      const t1 = (typeof performance !== 'undefined') ? performance.now() : 0;

      const res = await fetch(API_URL, {
        cache: 'no-store',
        signal: ctrl ? ctrl.signal : undefined,
      });

      const t2 = (typeof performance !== 'undefined') ? performance.now() : 0;
      if (!res.ok) throw new Error('HTTP ' + res.status);

      const data = await res.json();
      const serverMs = (typeof data.unixtime === 'number')
        ? data.unixtime * 1000
        : Date.parse(data.datetime);

      const halfRTT = (t2 - t1) / 2;
      baseServerMs = serverMs + halfRTT;     // estimasi "sekarang" dari sisi server saat respons tiba
      baseMono = (typeof performance !== 'undefined') ? performance.now() : 0; // jangkar monotonic

      return true;
    } catch (e) {
      setError(el, e && e.message);
      return false;
    }
  }

  function render(el) {
    if (stopped) return;
    const nowMono = (typeof performance !== 'undefined') ? performance.now() : 0;
    const elapsed = nowMono - baseMono;           // hanya pakai jam monotonic lokal untuk menghitung durasi
    const t = baseServerMs + elapsed;             // waktu = baseline server + durasi monotonic
    const d = new Date(t);

    // Format HH:mm:ss dari zona WIB; ms dari objek Date yang sama
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
    // Sinkron awal WAJIB berhasil; jika gagal -> Error & berhenti.
    const ok = await syncFromAPI(el);
    if (!ok) return;
    render(el);

    // Sinkron ulang berkala. Jika salah satu kalibrasi ulang gagal -> Error & berhenti (sesuai permintaan).
    setInterval(async () => {
      if (stopped) return;
      const ok2 = await syncFromAPI(el);
      if (!ok2) return; // setError dipanggil di dalam syncFromAPI
    }, RESYNC_MS);
  }

  window.startJakartaClock = startJakartaClock;
})();
