// Penghubung halaman MaralaKU dengan aplikasi Android: unduhan, cetak, jendela cetak, dan salin teks.
// Disuntikkan setiap halaman selesai dimuat. Halaman web tetap berjalan normal di browser biasa.
(function () {
  if (window.__maralaAndroid || !window.MaralaAndroid) return;
  window.__maralaAndroid = true;
  var A = window.MaralaAndroid;
  var blobs = new Map();

  // Simpan objek Blob agar unduhan CSV yang dibuat di halaman tetap bisa dibaca walau link-nya langsung dicabut.
  var createUrl = URL.createObjectURL.bind(URL);
  var revokeUrl = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = function (obj) {
    var url = createUrl(obj);
    try { if (obj instanceof Blob) blobs.set(url, obj); } catch (e) {}
    return url;
  };
  URL.revokeObjectURL = function (url) {
    setTimeout(function () { blobs.delete(url); }, 30000);
    revokeUrl(url);
  };

  function cleanName(name) {
    return String(name || 'unduhan').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'unduhan';
  }
  function nameFrom(anchor, href) {
    var name = anchor && anchor.getAttribute('download');
    if (name) return cleanName(name);
    try {
      var last = new URL(href, location.href).pathname.split('/').pop();
      return cleanName(decodeURIComponent(last || ''));
    } catch (e) { return 'unduhan'; }
  }
  function save(blob, name) {
    var reader = new FileReader();
    reader.onload = function () {
      var data = String(reader.result), comma = data.indexOf(',');
      A.saveFile(cleanName(name), blob.type || 'application/octet-stream', data.slice(comma + 1));
    };
    reader.onerror = function () { A.toast('Gagal menyiapkan berkas.'); };
    reader.readAsDataURL(blob);
  }
  function fetchSave(href, name) {
    A.toast('Mengunduh…');
    fetch(href, { credentials: 'include' }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var cd = res.headers.get('content-disposition') || '';
      var match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
      if (match && (!name || name === 'unduhan')) name = decodeURIComponent(match[1]);
      return res.blob();
    }).then(function (blob) { save(blob, name); })
      .catch(function () { A.toast('Unduhan gagal. Periksa koneksi lalu coba lagi.'); });
  }
  function download(anchor) {
    var href = anchor.href;
    var name = nameFrom(anchor, href);
    var blob = blobs.get(href);
    if (blob) save(blob, name); else fetchSave(href, name);
  }
  function isDownload(anchor) {
    return anchor.hasAttribute('download') || String(anchor.href).indexOf('blob:') === 0;
  }
  window.__maralaDownload = fetchSave;

  // Link unduhan yang ada di halaman.
  document.addEventListener('click', function (event) {
    var anchor = event.target && event.target.closest && event.target.closest('a[href]');
    if (!anchor || !isDownload(anchor)) return;
    event.preventDefault();
    download(anchor);
  }, true);
  // Link unduhan yang dibuat lewat kode lalu langsung di-klik tanpa ditempel ke halaman.
  var anchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (!this.isConnected && this.href && isDownload(this)) return download(this);
    return anchorClick.call(this);
  };

  // Cetak: halaman sendiri, atau "jendela cetak" (invoice, QR) yang ditulis lewat window.open('').
  window.print = function () { A.printPage(document.title || 'MaralaKU'); };
  function printWindow() {
    var html = '';
    var win;
    var doc = {
      write: function () { html += Array.prototype.join.call(arguments, ''); },
      writeln: function () { html += Array.prototype.join.call(arguments, '') + '\n'; },
      open: function () { html = ''; return doc; },
      close: function () {
        setTimeout(function () { if (typeof win.onload === 'function') win.onload(); }, 0);
      }
    };
    win = {
      document: doc,
      closed: false,
      onload: null,
      focus: function () {},
      close: function () { win.closed = true; },
      addEventListener: function (type, fn) { if (type === 'load') win.onload = fn; },
      print: function () {
        var match = /<title>([^<]*)<\/title>/i.exec(html);
        A.printHtml(html, match ? match[1] : 'MaralaKU');
      }
    };
    return win;
  }
  window.open = function (url) {
    if (!url || url === 'about:blank') return printWindow();
    try { A.openUrl(new URL(url, location.href).href); } catch (e) {}
    return null;
  };

  // Salin link.
  var writeText = function (text) { A.copy(String(text)); return Promise.resolve(); };
  try {
    if (navigator.clipboard) Object.defineProperty(navigator.clipboard, 'writeText', { value: writeText, configurable: true });
    else Object.defineProperty(navigator, 'clipboard', { value: { writeText: writeText }, configurable: true });
  } catch (e) {}
})();
