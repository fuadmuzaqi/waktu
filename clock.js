// clock.js
// Realtime clock for Asia/Jakarta (GMT+7) — HH : mm : ss : SSS
// Usage: startJakartaClock(document.getElementById('clock'));

(function () {
  function pad2(n) { return String(n).padStart(2, '0'); }
  function pad3(n) { return String(n).padStart(3, '0'); }

  // Formatter untuk jam/menit/detik di zona waktu Asia/Jakarta (GMT+7)
  const formatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  // Memulai animasi clock yang halus dan minim drift
  function startJakartaClock(el) {
    if (!(el instanceof Element)) {
      throw new Error('startJakartaClock: parameter harus berupa elemen DOM.');
    }

    // Anchor ke waktu sistem untuk meminimalkan drift
    const t0 = Date.now();
    const p0 = (typeof performance !== 'undefined' ? performance.now() : 0);

    function render() {
      const elapsed = (typeof performance !== 'undefined' ? performance.now() : 0) - p0;
      const now = new Date(t0 + elapsed);

      // Ambil HH:mm:ss pakai formatter Asia/Jakarta
      const parts = formatter.formatToParts(now);
      let hh = '00', mm = '00', ss = '00';
      for (const part of parts) {
        if (part.type === 'hour')   hh = part.value;
        if (part.type === 'minute') mm = part.value;
        if (part.type === 'second') ss = part.value;
      }

      // Milidetik diambil dari waktu "now" yang sama (konsepnya independen dari zona)
      const ms = pad3(now.getMilliseconds());

      el.textContent = `${hh} : ${mm} : ${ss} : ${ms}`;
      (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(render) : setTimeout(render, 16));
    }

    render();
  }

  // Expose ke global
  window.startJakartaClock = startJakartaClock;
})();
