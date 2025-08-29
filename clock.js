// clock.js — Realtime WIB (Asia/Jakarta) dengan kalibrasi via worldtimeapi.org
// Cara pakai (sama seperti sebelumnya):
//   <div id="clock">-- : -- : -- : ---</div>
//   <script src=".../clock.js"></script>
//   <script>startJakartaClock(document.getElementById('clock'));</script>

(function () {
  function pad3(n) { return String(n).padStart(3, '0'); }

  // Formatter HH:mm:ss khusus Asia/Jakarta (WIB, UTC+7)
  const formatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  // Offset koreksi (ms) agar mendekati waktu server
  let offsetMs = 0;

  // Anchor untuk animasi halus (minim drift)
  const startMonotonic = (typeof performance !== 'undefined') ? performance.now() : 0;
  const startWall = Date.now();

  // Render loop
  function render(el) {
    const elapsed = ((typeof performance !== 'undefined') ? performance.now() : 0) - startMonotonic;
    const t = startWall + elapsed + offsetMs; // waktu device + elapsed + koreksi offset
    const now = new Date(t);

    // Ambil HH:mm:ss dari WIB, dan ms dari Date yang sama
    const parts = formatter.formatToParts(now);
    let hh = '00', mm = '00', ss = '00';
    for (const part of parts) {
      if (part.type === 'hour') hh = part.value;
      else if (part.type === 'minute') mm = part.value;
      else if (part.type === 'second') ss = part.value;
    }
    el.textContent = ${hh} : ${mm} : ${ss} : ${pad3(now.getMilliseconds())};

    (typeof requestAnimationFrame === 'function')
      ? requestAnimationFrame(() => render(el))
      : setTimeout(() => render(el), 16);
  }

  // Kalibrasi ke server waktu (estimasi half RTT)
  async function calibrateOnce() {
    try {
      const t1 = (typeof performance !== 'undefined') ? performance.now() : Date.now();
      const res = await fetch('https://worldtimeapi.org/api/timezone/Asia/Jakarta', {
        cache: 'no-store'
      });
      const t2 = (typeof performance !== 'undefined') ? performance.now() : Date.now();

      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();

      // Ambil waktu server dalam ms
      const serverMs = (typeof data.unixtime === 'number')
        ? data.unixtime * 1000
        : Date.parse(data.datetime);

      // Estimasi "now di klien" saat respons diterima = serverMs + half RTT
      const halfRTT = (t2 - t1) / 2;
      const estNow = serverMs + halfRTT;

      // Koreksi offset: selisih antara estimasi server-now dan Date.now()
      offsetMs = estNow - Date.now();
    } catch (e) {
      // Gagal kalibrasi? Abaikan. Jam tetap jalan pakai device time.
      // Bisa tambahkan console.warn jika diperlukan.
    }
  }

  // Public API
  function startJakartaClock(el) {
    if (!(el instanceof Element)) throw new Error('startJakartaClock: parameter harus elemen DOM');
    render(el);            // mulai render realtime
    calibrateOnce();       // kalibrasi awal
    // Kalibrasi ulang tiap 1 jam untuk menjaga akurasi jangka panjang
    setInterval(calibrateOnce, 60 * 60 * 1000);
  }

  // Expose ke global
  window.startJakartaClock = startJakartaClock;
})();
