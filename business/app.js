/* Prototype service layer: replace these functions with Supabase repositories in production. */
const db = {
  units:['Teko Marala','Sewa Ruangan','Vendor','Penjualan Lainnya','Sewa Teras Marala'],
  revenues:[['22 Sep 2026','Teko Marala',850000,'Cash','Penjualan harian'],['22 Sep 2026','Sewa Ruangan',2500000,'Transfer','Acara meeting'],['21 Sep 2026','Vendor',1250000,'Transfer','Catering']],
  customers:[['Aisyah Rahman','0812-8890-1122','Wedding'],['Budi Santoso','0821-3456-7890','Meeting rutin'],['Citra Lestari','0813-6677-8811','Catering']],
  products:[['TK-001','Thai Tea','Teko Marala','Produk','Cup','Rp8.000','Rp15.000'],['SR-001','Sewa Venue','Sewa Ruangan','Sewa','Paket','Rp1.200.000','Rp2.500.000'],['VN-001','Catering Paket A','Vendor','Jasa','Paket','Rp750.000','Rp1.250.000']],
  invoices:[['INV/MARALA/2026/0024','Aisyah Rahman','22 Sep 2026','Rp5.500.000','DP'],['INV/MARALA/2026/0023','PT Harmoni','21 Sep 2026','Rp2.500.000','Lunas'],['INV/MARALA/2026/0022','Budi Santoso','20 Sep 2026','Rp1.250.000','Menunggu Pembayaran']],
  stock:[['Thai Tea Powder','Gudang','24','Kg','Rp1.440.000','Aman'],['Green Tea Powder','Gudang','7','Kg','Rp420.000','Menipis'],['Cup 16 oz','Teko Marala','90','Pcs','Rp72.000','Menipis']],
  expenses:[['22 Sep 2026','Petty Cash','Konsumsi','Air minum rapat','Rp50.000'],['21 Sep 2026','Pengajuan','Listrik','Pembayaran listrik','Rp500.000'],['20 Sep 2026','Petty Cash','ATK','Pulpen dan kertas','Rp85.000']]
};
const icon={dashboard:'▦',operational:'◷',database:'◉',master:'◇',stock:'▣',finance:'◈',report:'▤',settings:'⚙'};
const menu=[['Dashboard','dashboard'],['Operasional','operational',['Omzet Harian','Invoice','Pembayaran']],['Database','database',['Customer']],['Master Data','master',['Produk & Jasa','Unit Bisnis']],['Stok','stock',['Stok Gudang','Stok Teko Marala','Stok Keseluruhan','Stock Opname','Rekomendasi Belanja','Master Stok']],['Keuangan','finance',['Pengeluaran','Pengajuan','Petty Cash']],['Laporan','report',['Laba Rugi','Laporan Omzet','Laporan Stock Opname']],['Pengaturan','settings',['Identitas BUMM','Informasi Rekening','Invoice Settings','Tampilan','Manajemen Pengguna','Aplikasi']]];
const rupiah=n=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
const slug=s=>s.toLowerCase().replace(/&/g,'dan').replace(/\s+/g,'-');
function nav(){return `<aside class="sidebar" id="sidebar"><div class="brand"><div class="brand-icon">M</div><div>BUMM MARALA<small>MANAGEMENT SYSTEM</small></div></div><nav class="nav">${menu.map((m,i)=>m[2]?`<div class="nav-group"><button class="${i===1?'open':''}" data-toggle="${slug(m[0])}"><span>${icon[m[1]]}</span>${m[0]}<span class="arrow">›</span></button><div class="submenu ${i===1?'show':''}" id="${slug(m[0])}">${m[2].map(x=>`<a href="#${slug(x)}" data-page="${x}">${x}</a>`).join('')}</div></div>`:`<a class="active" href="#dashboard" data-page="${m[0]}"><span>${icon[m[1]]}</span>${m[0]}</a>`).join('')}</nav></aside>`}
function topbar(){return `<header class="topbar"><div class="page-head"><button class="icon-btn hamburger" id="hamburger">☰</button><div><h1 id="pageTitle">Dashboard</h1><div class="breadcrumb">BUMM Marala / <span id="crumb">Dashboard</span></div></div></div><div class="actions"><button class="secondary" id="install" hidden>⇩ Install Aplikasi</button><button class="icon-btn" id="theme" title="Ganti tema">◐</button><button class="icon-btn" title="Notifikasi">♢</button><div class="user"><div class="avatar">GD</div><div><b>Gusti Cahyaning Dewo</b><small>ADMIN</small></div></div></div></header>`}
function metric(title,value,ico,trend,bad=false){return `<article class="card metric"><div class="metric-top"><span>${title}</span><span class="metric-icon">${ico}</span></div><strong>${value}</strong><span class="trend ${bad?'bad':''}">${trend}</span></article>`}
function dash(){const bars=[42,67,52,86,61,72,93,76];return `<section class="module active" id="page-dashboard"><div class="welcome"><div><h2>Selamat pagi, Gusti 👋</h2><p>Berikut ringkasan operasional BUMM Marala hari ini, 22 September 2026.</p></div><button class="primary" data-modal="revenue">＋ Input Omzet</button></div><div class="metrics">${metric('Omzet Hari Ini','Rp4.600.000','↗','12,5% dari kemarin')}${metric('Omzet Bulan Ini','Rp86.450.000','◫','8,2% dari bulan lalu')}${metric('Pengeluaran Bulan Ini','Rp18.275.000','↘','4,3% dari bulan lalu',true)}${metric('Laba Bersih Bulan Ini','Rp68.175.000','◈','15,8% dari bulan lalu')}</div><div class="grid"><article class="card panel"><h3>Omzet Harian</h3><p class="sub">Performa omzet 8 hari terakhir</p><div class="chart">${bars.map((b,i)=>`<div class="bar-wrap"><div class="bar" style="height:${b}%"></div><span>${15+i} Sep</span></div>`).join('')}</div><div class="legend"><span><i class="dot"></i>Omzet harian</span><span>Target bulan ini: Rp100.000.000</span></div></article><article class="card panel"><h3>Omzet per Unit Bisnis</h3><p class="sub">September 2026</p><div class="donut-area"><div class="donut"></div></div><div class="legend"><span><i class="dot"></i>Teko Marala 45%</span><span>Unit lain 55%</span></div></article></div><div class="grid"><article class="card panel"><h3>Quick Actions</h3><p class="sub">Akses cepat pekerjaan rutin</p><div class="quick"><button data-modal="revenue">＋ Input Omzet</button><button data-modal="invoice">＋ Buat Invoice</button><button data-modal="payment">＋ Catat Pembayaran</button><button data-modal="stock">＋ Stock Opname</button><button data-modal="expense">＋ Catat Pengeluaran</button><button data-modal="customer">＋ Customer Baru</button></div></article><article class="card panel"><h3>Perlu Perhatian</h3><p class="sub">Operasional hari ini</p><ul class="activity"><li><b>3 invoice belum lunas</b><small>Nilai total Rp8.750.000</small></li><li><b>2 stok menipis</b><small>Perlu rekomendasi belanja</small></li><li><b>1 pengajuan menunggu persetujuan</b><small>Pengajuan listrik Rp500.000</small></li></ul></article></div><article class="card table-card"><div class="table-head"><div><h3>Invoice Terbaru</h3><p class="sub">Dokumen terakhir dibuat</p></div><button class="link" data-page="Invoice">Lihat semua →</button></div>${table(['Nomor Invoice','Customer','Tanggal','Total','Status'],db.invoices,true)}</article></section>`}
function table(headers,rows,status=false){return `<table><thead><tr>${headers.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((x,i)=>`<td>${status&&i===r.length-1?`<span class="badge ${x==='Lunas'?'paid':'pending'}">${x}</span>`:x}</td>`).join('')}<td><button class="link">Detail</button></td></tr>`).join('')}</tbody></table>`}
function module(name){let title=name, rows=[], headers=[], action='', note=''; if(name==='Omzet Harian'){headers=['Tanggal','Unit bisnis','Omzet','Metode','Keterangan'];rows=db.revenues;action='Input Omzet';note='Rekap omzet harian seluruh unit bisnis.'}else if(name==='Customer'){headers=['Nama','No. Telepon / WhatsApp','Keterangan'];rows=db.customers;action='Tambah Customer';note='Total Customer: 128'}else if(name==='Produk & Jasa'){headers=['Kode','Nama','Unit bisnis','Jenis','Satuan','Harga modal','Harga jual'];rows=db.products;action='Tambah Produk';note='Master data produk, jasa, sewa, dan vendor.'}else if(name==='Invoice'){headers=['Nomor Invoice','Customer','Tanggal','Total','Status'];rows=db.invoices;action='Buat Invoice';note='Buat dan kelola invoice semua unit bisnis.'}else if(name.includes('Stok')||name==='Rekomendasi Belanja'){headers=['Produk','Lokasi','Stok','Satuan','Nilai Stok','Status'];rows=db.stock;action=name==='Stock Opname'?'Mulai Opname':'Input Stok';note=name==='Rekomendasi Belanja'?'Produk di bawah stok minimum perlu dibeli.':'Pantau persediaan gudang dan Teko Marala.'}else if(name==='Pengeluaran'||name==='Pengajuan'||name==='Petty Cash'){headers=['Tanggal','Jenis','Kategori','Keterangan','Nominal'];rows=db.expenses;action=name==='Pengajuan'?'Buat Pengajuan':'Catat Pengeluaran';note='Catat dan pantau pengeluaran operasional.'}else if(name.includes('Laporan')||name==='Laba Rugi'){return `<section class="module" id="page-${slug(name)}"><div class="welcome"><div><h2>${name}</h2><p>Laporan periode September 2026</p></div><button class="primary" onclick="notify('Laporan siap diunduh.')">⇩ Export Laporan</button></div><div class="metrics">${metric('Total Pendapatan','Rp86.450.000','↗','September 2026')}${metric('Total Pengeluaran','Rp18.275.000','↘','September 2026',true)}${metric('Laba Bersih','Rp68.175.000','◈','Margin 78,9%')} </div><article class="card panel" style="margin-top:16px"><h3>Pendapatan vs Pengeluaran</h3><p class="sub">Ringkasan otomatis dari transaksi yang tercatat</p><div class="chart">${[40,56,48,73,68,58,89,76].map((b,i)=>`<div class="bar-wrap"><div class="bar" style="height:${b}%"></div><span>Minggu ${i+1}</span></div>`).join('')}</div></article></section>`}else if(['Identitas BUMM','Informasi Rekening','Invoice Settings','Tampilan','Manajemen Pengguna','Aplikasi'].includes(name)){return `<section class="module" id="page-${slug(name)}"><div class="welcome"><div><h2>${name}</h2><p>Pengaturan khusus ADMIN</p></div><button class="primary" onclick="notify('Pengaturan berhasil disimpan.')">Simpan Perubahan</button></div><article class="card panel"><h3>${name}</h3><p class="sub">Data ini akan digunakan pada dokumen baru dan sistem BUMM Marala.</p><div class="empty">Halaman pengaturan siap dihubungkan ke database production.</div></article></section>`}else {note='Halaman ini disiapkan sebagai bagian dari sistem operasional BUMM Marala.';action='Tambah Data'}return `<section class="module" id="page-${slug(name)}"><div class="welcome"><div><h2>${title}</h2><p>${note}</p></div><button class="primary" data-modal="${name==='Customer'?'customer':name==='Omzet Harian'?'revenue':name==='Invoice'?'invoice':name==='Pengeluaran'?'expense':'stock'}">＋ ${action}</button></div><div class="toolbar"><input class="search" placeholder="Cari data..."/><div><button class="secondary" onclick="notify('Filter diterapkan.')">☷ Filter</button> <button class="secondary" onclick="notify('Fitur export akan menghasilkan Excel/PDF.')">⇩ Export</button></div></div><article class="card table-card"><div class="table-head"><div><h3>Data ${title}</h3><p class="sub">Data contoh untuk prototype</p></div><button class="link" onclick="notify('Bulk input siap dikembangkan.')">Input Banyak</button></div>${table(headers,rows,name==='Invoice'||name.includes('Stok'))}</article></section>`}
function modal(){return `<div class="modal-layer" id="modal"><form class="modal" id="form"><h3 id="modalTitle">Tambah Data</h3><div id="modalFields"></div><div class="modal-foot"><button type="button" class="secondary" id="cancel">Batal</button><button class="primary">Simpan</button></div></form></div><div class="toast" id="toast">Data berhasil disimpan.</div>`}
function modalFields(type){const forms={customer:[['Nama','text'],['No. Telepon / WhatsApp','tel'],['Keterangan','text']],revenue:[['Tanggal','date'],['Unit Bisnis','select'],['Nominal Omzet','number'],['Metode Pembayaran','select'],['Keterangan','text']],invoice:[['Customer','select'],['Tanggal Invoice','date'],['Jatuh Tempo','date'],['Total','number']],payment:[['Nomor Invoice','select'],['Tanggal Pembayaran','date'],['Nominal','number'],['Metode','select']],stock:[['Tanggal','date'],['Produk','select'],['Lokasi','select'],['Stok Fisik','number'],['Keterangan','text']],expense:[['Tanggal','date'],['Jenis','select'],['Kategori','text'],['Nominal','number'],['Keterangan','text']]};return (forms[type]||forms.customer).map(([label,type])=>`<label>${label}${type==='select'?`<select><option>Pilih ${label}</option>${(label.includes('Unit')?db.units:label==='Customer'?db.customers.map(x=>x[0]):label.includes('Invoice')?db.invoices.map(x=>x[0]):label==='Lokasi'?['Gudang','Teko Marala']:label==='Jenis'?['Petty Cash','Pengajuan']:['Cash','Transfer']).map(x=>`<option>${x}</option>`).join('')}</select>`:`<input type="${type}" ${type==='date'?'value="2026-09-22"':''} required/>`}</label>`).join('')}
function app(){document.getElementById('app').innerHTML=`<div class="shell">${nav()}<main class="main">${topbar()}<div class="content">${dash()}${menu.flatMap(m=>m[2]||[]).map(module).join('')}</div></main></div>${modal()}`;bind();}
function go(name){document.querySelectorAll('.module').forEach(x=>x.classList.remove('active'));document.getElementById('page-'+slug(name))?.classList.add('active');document.querySelectorAll('[data-page]').forEach(x=>x.classList.toggle('active',x.dataset.page===name));document.getElementById('pageTitle').textContent=name;document.getElementById('crumb').textContent=name;document.getElementById('sidebar').classList.remove('mobile-open');window.scrollTo(0,0)}
function notify(text){const t=document.getElementById('toast');t.textContent=text;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2800)}
function bind(){document.querySelectorAll('[data-page]').forEach(x=>x.addEventListener('click',e=>{e.preventDefault();go(x.dataset.page)}));document.querySelectorAll('[data-toggle]').forEach(x=>x.addEventListener('click',()=>{x.classList.toggle('open');document.getElementById(x.dataset.toggle).classList.toggle('show')}));document.getElementById('hamburger').onclick=()=>document.getElementById('sidebar').classList.toggle('mobile-open');document.getElementById('theme').onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem('bumm-theme',document.body.classList.contains('dark')?'dark':'light')};if(localStorage.getItem('bumm-theme')==='dark')document.body.classList.add('dark');document.querySelectorAll('[data-modal]').forEach(x=>x.onclick=()=>{const type=x.dataset.modal;document.getElementById('modalTitle').textContent=({customer:'Tambah Customer',revenue:'Input Omzet Harian',invoice:'Buat Invoice',payment:'Catat Pembayaran',stock:'Stock Opname',expense:'Catat Pengeluaran'})[type];document.getElementById('modalFields').innerHTML=modalFields(type);document.getElementById('modal').classList.add('show')});document.getElementById('cancel').onclick=()=>document.getElementById('modal').classList.remove('show');document.getElementById('form').onsubmit=e=>{e.preventDefault();document.getElementById('modal').classList.remove('show');notify('Data berhasil disimpan.')} ;let installPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;document.getElementById('install').hidden=false});document.getElementById('install').onclick=async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;document.getElementById('install').hidden=true}};}
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js');app();

// Omzet is a flexible operational module: users choose the reporting period inside it.
function upgradeRevenueModule(){
  const menuItem=document.querySelector('[data-page="Omzet Harian"]');
  const page=document.getElementById('page-omzet-harian');
  if(!menuItem||!page)return;
  menuItem.dataset.page='Omzet';
  menuItem.textContent='Omzet';
  page.id='page-omzet';
  page.querySelector('h2').textContent='Omzet';
  page.querySelector('.welcome p').textContent='Catat dan tarik data omzet berdasarkan periode yang Anda perlukan.';
  const toolbar=page.querySelector('.toolbar');
  toolbar.classList.add('period-toolbar');
  toolbar.innerHTML=`<input class="search" placeholder="Cari unit, metode, atau keterangan..."/><div class="period-controls"><select aria-label="Pilihan periode"><option>Hari ini</option><option>Minggu ini</option><option selected>Bulan ini</option><option>Tahun ini</option><option>Rentang tanggal</option></select><input type="date" value="2026-09-01" aria-label="Tanggal mulai"/><input type="date" value="2026-09-22" aria-label="Tanggal akhir"/><button class="secondary" onclick="notify('Periode omzet diperbarui.')">Terapkan</button><button class="secondary" onclick="notify('Fitur export akan menghasilkan Excel/PDF.')">⇩ Export</button></div>`;
  page.querySelector('.table-head h3').textContent='Data Omzet';
  page.querySelector('.table-head .sub').textContent='Tarik dan rekap omzet berdasarkan periode pilihan.';
}
upgradeRevenueModule();

function upgradeDashboardPeriod(){
  const dashboard=document.getElementById('page-dashboard');
  const welcome=dashboard?.querySelector('.welcome');
  if(!dashboard||!welcome)return;
  const controls=document.createElement('div');
  controls.className='dashboard-period card';
  controls.innerHTML=`<div><b>Periode Dashboard</b><small id="dashboardPeriodLabel">Bulan September 2026</small></div><div class="period-controls"><select id="dashboardPeriod"><option value="day">Tanggal tertentu</option><option value="month" selected>Bulan</option><option value="year">Tahun</option><option value="range">Rentang tanggal</option></select><input id="dashboardStart" type="date" value="2026-09-01" aria-label="Tanggal mulai"/><input id="dashboardEnd" type="date" value="2026-09-22" aria-label="Tanggal akhir"/><button class="primary" id="applyDashboardPeriod">Terapkan</button></div>`;
  welcome.insertAdjacentElement('afterend',controls);
  document.getElementById('applyDashboardPeriod').addEventListener('click',()=>{
    const type=document.getElementById('dashboardPeriod').value;
    const start=document.getElementById('dashboardStart').value;
    const end=document.getElementById('dashboardEnd').value;
    const label=type==='day'?`Tanggal ${start}`:type==='month'?'Bulan September 2026':type==='year'?'Tahun 2026':`${start} s.d. ${end}`;
    document.getElementById('dashboardPeriodLabel').textContent=label;
    dashboard.querySelector('.welcome p').textContent=`Ringkasan operasional BUMM Marala untuk ${label.toLowerCase()}.`;
    dashboard.querySelector('.chart').previousElementSibling.textContent=`Performa omzet — ${label}`;
    notify('Dashboard diperbarui untuk '+label+'.');
  });
}
upgradeDashboardPeriod();

function formatDate(date){
  if(!date) return '—';
  if(String(date).includes('Sep') || String(date).includes('Okt') || String(date).includes('Agu') || String(date).includes('Nov') || String(date).includes('Des') || String(date).includes('Jan') || String(date).includes('Feb') || String(date).includes('Mar') || String(date).includes('Apr') || String(date).includes('Mei') || String(date).includes('Jun') || String(date).includes('Jul')) return String(date);
  const d=new Date(`${date}T00:00:00`);
  if(isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'});
}

function getNextInvoiceNumber(){
  const numbers=(db.invoices||[]).map(inv=>{
    const m=String(inv[0]).match(/(\d+)$/);
    return m?parseInt(m[1],10):0;
  });
  const max=numbers.length?Math.max(...numbers,24):24;
  return `INV/MARALA/2026/${String(max+1).padStart(4,'0')}`;
}

db.payments=db.payments||[
  {date:'22 Sep 2026',invoice:'INV/MARALA/2026/0024',customer:'Aisyah Rahman',method:'Transfer',amount:2000000},
  {date:'21 Sep 2026',invoice:'INV/MARALA/2026/0023',customer:'PT Harmoni',method:'Transfer',amount:2500000}
];

function invoiceTotal(number){
  const invoice=db.invoices.find(item=>item[0]===number);
  return Number((invoice?.[3]||'0').replace(/[^0-9]/g,''))||0;
}

function paidTotal(number){
  return (db.payments||[]).filter(item=>item.invoice===number).reduce((sum,item)=>sum+(Number(item.amount)||0),0);
}

function invoiceSummary(number){
  const total = invoiceTotal(number);
  const detail = db.invoiceDetails?.[number];
  return { subtotal: detail?.subtotal ?? total, discount: detail?.discount ?? 0,
    other: detail?.other ?? 0, total, paid: paidTotal(number),
    balance: Math.max(0, total - paidTotal(number)) };
}

function invoiceSummaryMarkup(number){
  const s = invoiceSummary(number);
  const rows = [['Total Harga', s.subtotal, ''], ['Diskon', s.discount, ''],
    ['Biaya Lainnya', s.other, ''], ['Total Tagihan', s.total, 'summary-total'],
    ['Sudah Dibayarkan', s.paid, ''], ['Sisa Pembayaran', s.balance, 'summary-balance']];
  return `<div class="invoice-summary">${rows.map(([label, value, type]) =>
    `<div class="invoice-summary-row ${type}"><span>${label}</span><strong>${rupiah(value)}</strong></div>`).join('')}</div>`;
}

function resetModalFoot(saveText = 'Simpan'){
  const foot = document.querySelector('#modal .modal-foot');
  if(!foot) return;
  foot.innerHTML = `<button type="button" class="secondary" id="cancel">Batal</button><button class="primary">${saveText}</button>`;
  document.getElementById('cancel').onclick = () => document.getElementById('modal').classList.remove('show');
}

function openInvoicePrint(target){
  let number, customer, date, eventDate;
  if(typeof target === 'string'){
    number = target;
    const inv = db.invoices.find(item => item[0] === number);
    if(!inv) return;
    customer = inv[1];
    date = inv[2];
    eventDate = (db.invoiceEventDates && db.invoiceEventDates[number]) || '—';
  } else {
    const cells = [...target.querySelectorAll('td')].map(c => c.textContent.trim());
    number = cells[0];
    customer = cells[1];
    date = cells[2];
    eventDate = cells[3] || '—';
  }
  const inv = db.invoices.find(item => item[0] === number);
  const total = invoiceTotal(number);
  const paid = paidTotal(number);
  const balance = Math.max(0, total - paid);
  const status = balance === 0 && total > 0 ? 'Lunas' : paid > 0 ? (inv?.[4] === 'DP' ? 'DP' : 'Sebagian Dibayar') : 'Menunggu Pembayaran';
  const payments = (db.payments || []).filter(p => p.invoice === number);

  const invoice = window.open('', '_blank', 'width=850,height=900');
  if(!invoice){ notify('Izinkan pop-up untuk mencetak invoice.'); return; }
  invoice.document.write(`<!doctype html><html lang="id"><head><title>${number}</title><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#172033;padding:48px;max-width:760px;margin:auto;line-height:1.5;font-size:14px}
    header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:22px;border-bottom:2px solid #0b4ea2;margin-bottom:32px}
    .logo{width:44px;height:44px;border-radius:10px;background:#0b4ea2;color:#fff;font-size:22px;font-weight:800;display:grid;place-items:center;flex-shrink:0}
    .brand-name{font-size:16px;font-weight:800;color:#062a5c;margin-bottom:2px}
    .brand-sub{font-size:11px;color:#65758b;letter-spacing:.5px}
    .inv-meta{text-align:right}
    .inv-meta .inv-label{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#65758b;margin-bottom:4px}
    .inv-meta .inv-number{font-size:15px;font-weight:700;color:#0b4ea2;margin-bottom:6px}
    .badge{display:inline-block;padding:4px 10px;border-radius:99px;font-weight:700;font-size:11px;letter-spacing:.4px}
    .paid{background:#def7ea;color:#08724a}
    .pending{background:#fff0d4;color:#a65c00}
    .section{margin-bottom:28px}
    .section-title{font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#65758b;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #e5eaf2}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px}
    .info-row{font-size:13px;color:#172033;padding:3px 0}
    .info-row .lbl{color:#65758b;font-size:12px}
    .customer-name{font-size:18px;font-weight:700;color:#062a5c;margin-bottom:4px}
    table{width:100%;border-collapse:collapse;margin-top:4px}
    th{font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#65758b;padding:9px 0;border-bottom:1px solid #e5eaf2;text-align:left}
    th:last-child,td:last-child{text-align:right}
    td{padding:10px 0;font-size:13px;border-bottom:1px solid #f2f5f9;color:#172033}
    .tagihan-block{margin-top:28px;padding-top:20px;border-top:2px solid #e5eaf2}
    .tagihan-hero{background:linear-gradient(135deg,#0b4ea2,#062a5c);color:#fff;border-radius:10px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
    .tagihan-hero .lbl{font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#bcd3f3;margin-bottom:4px}
    .tagihan-hero .val{font-size:24px;font-weight:800;color:#fff}
    .tagihan-rows{margin-bottom:12px}
    .t-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:13px;color:#172033}
    .t-row .t-lbl{color:#64748b}
    .t-row .t-val{font-weight:600}
    .t-row.discount .t-val{color:#c83b3b}
    .t-row.total-final{font-size:14.5px;font-weight:800;color:#0b4ea2;padding:8px 0;border-top:1px solid #e5eaf2;border-bottom:1px solid #e5eaf2;margin-top:4px}
    .t-row.total-final .t-val{color:#0b4ea2;font-size:15px;font-weight:800}
    .t-row.pembayaran{font-size:13.5px;font-weight:700;color:#138a57;padding:8px 0;margin-top:6px}
    .t-row.pembayaran .t-val{color:#138a57;font-size:14.5px;font-weight:700}
    .t-row.sisa{font-size:14.5px;font-weight:800;padding:8px 0 4px;margin-top:4px;border-top:1px solid #e5eaf2}
    .t-row.sisa.belum-lunas{color:#c83b3b}
    .t-row.sisa.lunas{color:#138a57}
    .t-row.sisa .t-val{font-size:16px;font-weight:800}
    .payment-history{margin-top:24px;padding-top:16px;border-top:1px solid #e5eaf2}
    .bank-info{margin-top:20px;padding:14px 16px;background:#f8fbff;border-radius:8px;border-left:3px solid #0b4ea2;font-size:13px}
    .footer{margin-top:48px;padding-top:14px;border-top:1px solid #e5eaf2;color:#65758b;font-size:11px;text-align:center}
    @media print{body{padding:20px}}.lunas-stamp{font-size:11px;font-weight:700;color:#08724a;background:#def7ea;border-radius:99px;padding:3px 10px;margin-left:8px;vertical-align:middle}
    .invoice-summary{width:100%;max-width:420px;margin:24px 0 0 auto;break-inside:avoid}.invoice-summary-row{display:flex;justify-content:space-between;align-items:baseline;gap:24px;padding:9px 0;font-size:14px}.invoice-summary-row strong{white-space:nowrap;font-variant-numeric:tabular-nums;font-weight:500}.invoice-summary-row.summary-total{border-top:1px solid #d5dce5;margin-top:6px;padding-top:14px}.invoice-summary-row.summary-balance{border-top:1px solid #d5dce5;margin-top:6px;padding-top:14px}.summary-total,.summary-balance,.summary-total strong,.summary-balance strong{font-weight:700}.invoice-summary-row.summary-balance{font-size:16px}@media(max-width:480px){.invoice-summary{max-width:none}.invoice-summary-row{gap:12px}}
  </style></head><body>
    <header>
      <div style="display:flex;gap:12px;align-items:flex-start">
        <div class="logo">M</div>
        <div>
          <div class="brand-name">BUMM MARALA</div>
          <div class="brand-sub">Management System</div>
        </div>
      </div>
      <div class="inv-meta">
        <div class="inv-label">Invoice</div>
        <div class="inv-number">${number}</div>
        <span class="badge ${balance===0?'paid':'pending'}">${status}</span>
      </div>
    </header>

    <div class="section">
      <div class="section-title">Informasi Invoice</div>
      <div class="info-grid">
        <div class="info-row"><div class="lbl">Tanggal Invoice</div>${date}</div>
        ${eventDate&&eventDate!=='—'?`<div class="info-row"><div class="lbl">Tanggal Acara</div>${eventDate}</div>`:'<div></div>'}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Kepada</div>
      <div class="customer-name">${customer}</div>

    </div>

    <div class="section">
      <div class="section-title">Rincian Layanan</div>
      <table>
        <thead><tr><th>Deskripsi</th><th>Qty</th><th>Total</th></tr></thead>
        <tbody><tr><td>Layanan / Produk BUMM Marala</td><td>1</td><td>${rupiah(total)}</td></tr></tbody>
      </table>
    </div>

    ${invoiceSummaryMarkup(number)}

    <div class="bank-info">
      <strong>Pembayaran via:</strong> Bank Syariah Indonesia (BSI) &nbsp;|&nbsp; No. Rekening: <strong>7123456789</strong> &nbsp;a/n&nbsp; <strong>BUMM Marala</strong>
    </div>

    <div class="footer">Terima kasih telah mempercayakan layanan kepada BUMM Marala.<br>Dokumen ini sah sebagai tanda bukti invoice resmi.</div>
    <script>window.onload=()=>window.print()<\/script>
  </body></html>`);
  invoice.document.close();
}

function openInvoiceDetail(number){
  const invoice = db.invoices.find(item => item[0] === number);
  if(!invoice) return;
  const modal = document.querySelector('#modal .modal');
  const layer = document.getElementById('modal');
  modal.classList.add('invoice-builder');
  document.getElementById('modalTitle').textContent = `Detail Invoice — ${number}`;
  const total = invoiceTotal(number);
  const paid = paidTotal(number);
  const balance = Math.max(0, total - paid);
  const status = balance === 0 && total > 0 ? 'Lunas' : paid > 0 ? (invoice[4] === 'DP' ? 'DP' : 'Sebagian Dibayar') : 'Menunggu Pembayaran';
  const eventDate = (db.invoiceEventDates && db.invoiceEventDates[number]) || '—';
  const cust = db.customers.find(c => c[0] === invoice[1]);
  const payments = (db.payments || []).filter(p => p.invoice === number);

  document.getElementById('modalFields').innerHTML = `
    <div class="inv-detail">

      <!-- Customer & Status -->
      <div class="inv-cust-row">
        <div>
          <div class="inv-cust-name">${invoice[1]}</div>
          <div class="inv-cust-sub">${cust ? `WA: ${cust[1]}` : ''}${cust && cust[2] ? ` &middot; ${cust[2]}` : ''}</div>
        </div>
        <span class="badge ${status === 'Lunas' ? 'paid' : 'pending'}">${status}</span>
      </div>

      <!-- Dates -->
      <div class="inv-dates">
        <span>Tanggal Invoice &nbsp;<strong>${invoice[2]}</strong></span>
        ${eventDate && eventDate !== '—' ? `<span>Tanggal Acara &nbsp;<strong>${eventDate}</strong></span>` : ''}
      </div>

      ${invoiceSummaryMarkup(number)}

      <!-- Riwayat Pembayaran -->
      <details>
        <summary class="inv-history-title">Riwayat Pembayaran (${payments.length} transaksi)</summary>
        ${payments.length ? `
          <table style="width:100%;font-size:13px">
            <thead><tr>
              <th style="padding:8px 0;color:var(--muted);font-weight:600;font-size:11px;border-bottom:1px solid var(--line)">Tanggal</th>
              <th style="padding:8px 0;color:var(--muted);font-weight:600;font-size:11px;border-bottom:1px solid var(--line)">Metode</th>
              <th style="padding:8px 0;color:var(--muted);font-weight:600;font-size:11px;border-bottom:1px solid var(--line);text-align:right">Nominal</th>
            </tr></thead>
            <tbody>
              ${payments.map(p => `<tr>
                <td style="padding:8px 0;border-bottom:1px solid var(--line);color:var(--text)">${p.date}</td>
                <td style="padding:8px 0;border-bottom:1px solid var(--line);color:var(--muted)">${p.method}</td>
                <td style="padding:8px 0;border-bottom:1px solid var(--line);text-align:right;font-weight:700;color:var(--good)">${rupiah(p.amount)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        ` : `<p style="color:var(--muted);font-size:13px;margin:0">Belum ada pembayaran untuk invoice ini.</p>`}
      </details>

    </div>
  `;



  const foot = document.querySelector('#modal .modal-foot');
  if (foot) {
    foot.innerHTML = `
      <button type="button" class="secondary" id="closeDetailModal">Tutup</button>
      <button type="button" class="secondary" id="printDetailModal">PDF / Print</button>
      ${balance > 0 ? `<button type="button" class="primary" id="payDetailModal">＋ Catat Pembayaran</button>` : ''}
    `;
    document.getElementById('closeDetailModal').onclick = () => {
      layer.classList.remove('show');
      modal.classList.remove('invoice-builder');
    };
    document.getElementById('printDetailModal').onclick = () => {
      openInvoicePrint(number);
    };
    const payBtn = document.getElementById('payDetailModal');
    if (payBtn) {
      payBtn.onclick = () => {
        layer.classList.remove('show');
        modal.classList.remove('invoice-builder');
        showPaymentForm(number);
      };
    }
  }
  layer.classList.add('show');
}

function updateCustomerDropdowns(){
  const select = document.getElementById('invoiceCustomer');
  if(!select) return;
  const currentVal = select.value;
  select.innerHTML = `<option value="">Pilih customer</option>${db.customers.map(c => `<option value="${c[0]}">${c[0]}</option>`).join('')}`;
  if(currentVal && db.customers.some(c => c[0] === currentVal)){
    select.value = currentVal;
  }
}

function renderCustomerTable(){
  const page = document.getElementById('page-customer');
  if(!page) return;
  const tbody = page.querySelector('tbody');
  if(!tbody) return;
  tbody.innerHTML = db.customers.map((c, index) => `<tr><td>${c[0]}</td><td>${c[1]}</td><td>${c[2] || '—'}</td><td><button class="link edit-customer" data-customer="${index}">Edit</button> <button class="link delete-customer" data-customer="${index}">Hapus</button></td></tr>`).join('');
  const note = page.querySelector('.welcome p');
  if(note) note.textContent = `Total Customer: ${db.customers.length} terdaftar`;
  tbody.querySelectorAll('.edit-customer').forEach(btn => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.customer);
      showCustomerModal(db.customers[idx]);
    };
  });
  tbody.querySelectorAll('.delete-customer').forEach(btn => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.customer);
      const cust = db.customers[idx];
      if(confirm(`Hapus customer "${cust[0]}" dari database?`)){
        db.customers.splice(idx, 1);
        savePrototypeData();
        renderCustomerTable();
        updateCustomerDropdowns();
        notify('Customer berhasil dihapus.');
      }
    };
  });
}

function addCustomer(name, phone, notes = ''){
  name = name.trim(); phone = phone.trim(); notes = (notes || '').trim();
  if(!name || !phone) return null;
  const existing = db.customers.find(c => c[0].toLowerCase() === name.toLowerCase());
  if(existing){
    existing[1] = phone;
    if(notes) existing[2] = notes;
  } else {
    db.customers.push([name, phone, notes]);
  }
  savePrototypeData();
  renderCustomerTable();
  updateCustomerDropdowns();
  return name;
}

function showCustomerModal(initialData = null){
  resetModalFoot(initialData ? 'Simpan Perubahan' : 'Tambah Customer');
  const modal = document.querySelector('#modal .modal');
  const layer = document.getElementById('modal');
  const form = document.getElementById('form');
  modal.classList.remove('invoice-builder');
  document.getElementById('modalTitle').textContent = initialData ? 'Edit Customer' : 'Tambah Customer';
  document.getElementById('modalFields').innerHTML = `<label>Nama Customer<input id="custName" type="text" value="${initialData ? initialData[0] : ''}" placeholder="Nama lengkap atau instansi" required/></label><label>No. Telepon / WhatsApp<input id="custPhone" type="tel" value="${initialData ? initialData[1] : ''}" placeholder="Contoh: 0812-3456-7890" required/></label><label>Keterangan / Acara<input id="custNotes" type="text" value="${initialData ? (initialData[2] || '') : ''}" placeholder="Contoh: Wedding, Meeting rutin, Catering"/></label>`;
  form.onsubmit = e => {
    e.preventDefault();
    const name = document.getElementById('custName').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const notes = document.getElementById('custNotes').value.trim();
    if(!name || !phone){
      notify('Nama dan nomor WhatsApp wajib diisi.');
      return;
    }
    if(initialData){
      initialData[0] = name;
      initialData[1] = phone;
      initialData[2] = notes;
    } else {
      addCustomer(name, phone, notes);
    }
    savePrototypeData();
    renderCustomerTable();
    updateCustomerDropdowns();
    layer.classList.remove('show');
    notify(initialData ? 'Data customer berhasil diperbarui.' : `Customer "${name}" berhasil ditambahkan.`);
  };
  layer.classList.add('show');
}

function upgradeCustomerModule(){
  const page = document.getElementById('page-customer');
  if(!page) return;
  const header = page.querySelector('thead tr');
  if(header && !header.querySelector('.action-header')){
    header.insertAdjacentHTML('beforeend', '<th class="action-header">Aksi</th>');
  }
  renderCustomerTable();
  const search = page.querySelector('.search');
  if(search){
    search.placeholder = 'Cari nama, no. telepon, atau keterangan...';
    search.oninput = () => {
      const q = search.value.trim().toLowerCase();
      page.querySelectorAll('tbody tr').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    };
  }
  const addBtn = page.querySelector('[data-modal="customer"]');
  if(addBtn){
    addBtn.onclick = () => showCustomerModal();
  }
}

function renderInvoiceTable(){
  const page = document.getElementById('page-invoice');
  if(!page) return;
  const thead = page.querySelector('thead');
  if(thead){
    thead.innerHTML = `<tr>
      <th>Nomor Invoice</th>
      <th>Customer</th>
      <th>Tanggal Invoice</th>
      <th>Tanggal Acara</th>
      <th>Total Tagihan</th>
      <th>Sudah Dibayar</th>
      <th>Sisa Tagihan</th>
      <th>Status</th>
      <th class="action-header">Aksi</th>
    </tr>`;
  }
  const tbody = page.querySelector('tbody');
  if(!tbody) return;
  tbody.innerHTML = db.invoices.map(invoice => {
    const number = invoice[0];
    const customer = invoice[1];
    const invDate = invoice[2];
    const eventDate = (db.invoiceEventDates && db.invoiceEventDates[number]) || '—';
    const total = invoiceTotal(number);
    const paid = paidTotal(number);
    const balance = Math.max(0, total - paid);
    let status = invoice[4] || 'Menunggu Pembayaran';
    if(balance === 0 && total > 0){
      status = 'Lunas';
    } else if(paid > 0){
      status = (status === 'DP' || paid < total) ? (paid === total ? 'Lunas' : (status === 'DP' ? 'DP' : 'Sebagian Dibayar')) : status;
    }
    invoice[4] = status;

    return `<tr data-invoice-date="${invDate}" data-event-date="${eventDate !== '—' ? eventDate : ''}">
      <td><b>${number}</b></td>
      <td>${customer}</td>
      <td>${invDate}</td>
      <td>${eventDate}</td>
      <td><b>${rupiah(total)}</b></td>
      <td style="color:${paid > 0 ? 'var(--good)' : 'var(--muted)'};font-weight:650">${paid > 0 ? rupiah(paid) : 'Rp0'}</td>
      <td style="color:${balance === 0 ? 'var(--good)' : 'var(--bad)'};font-weight:700">${rupiah(balance)}</td>
      <td><span class="badge ${status === 'Lunas' ? 'paid' : 'pending'}">${status}</span></td>
      <td>
        <button class="link detail-invoice" data-invoice="${number}">Detail</button>
        <button class="link edit-invoice" data-invoice="${number}">Edit</button>
        <button class="link delete-invoice" data-invoice="${number}">Hapus</button>
        <button class="link print-invoice" data-invoice="${number}">PDF / Print</button>
      </td>
    </tr>`;
  }).join('');

  // Bind actions
  tbody.querySelectorAll('.detail-invoice').forEach(btn => {
    btn.onclick = () => openInvoiceDetail(btn.dataset.invoice);
  });
  tbody.querySelectorAll('.print-invoice').forEach(btn => {
    btn.onclick = () => openInvoicePrint(btn.dataset.invoice);
  });
  tbody.querySelectorAll('.delete-invoice').forEach(btn => {
    btn.onclick = () => {
      const key = btn.dataset.invoice;
      if(confirm(`Hapus invoice ${key}? Tindakan ini tidak dapat dibatalkan.`)){
        const idx = db.invoices.findIndex(item => item[0] === key);
        if(idx !== -1) db.invoices.splice(idx, 1);
        if(db.invoiceEventDates) delete db.invoiceEventDates[key];
        db.payments = (db.payments || []).filter(p => p.invoice !== key);
        savePrototypeData();
        renderInvoiceTable();
        renderPayments();
        updateDashboardMetrics();
        notify('Invoice berhasil dihapus.');
      }
    };
  });
  tbody.querySelectorAll('.edit-invoice').forEach(btn => {
    btn.onclick = () => {
      const number = btn.dataset.invoice;
      const inv = db.invoices.find(item => item[0] === number);
      if(!inv) return;
      resetModalFoot('Simpan Perubahan');
      const modal = document.querySelector('#modal .modal');
      const layer = document.getElementById('modal');
      const form = document.getElementById('form');
      modal.classList.remove('invoice-builder');
      document.getElementById('modalTitle').textContent = `Edit Invoice — ${number}`;
      const eventDate = (db.invoiceEventDates && db.invoiceEventDates[number]) || '';
      document.getElementById('modalFields').innerHTML = `
        <label>Customer<input id="editInvCustomer" type="text" value="${inv[1]}" required/></label>
        <label>Tanggal Invoice<input id="editInvDate" type="text" value="${inv[2]}" required/></label>
        <label>Tanggal Acara<input id="editInvEventDate" type="text" value="${eventDate !== '—' ? eventDate : ''}"/></label>
        <label>Total Tagihan (Rp)<input id="editInvTotal" type="text" value="${inv[3]}" required/></label>
        <label>Status<select id="editInvStatus">
          <option ${inv[4] === 'Menunggu Pembayaran' ? 'selected' : ''}>Menunggu Pembayaran</option>
          <option ${inv[4] === 'DP' ? 'selected' : ''}>DP</option>
          <option ${inv[4] === 'Sebagian Dibayar' ? 'selected' : ''}>Sebagian Dibayar</option>
          <option ${inv[4] === 'Lunas' ? 'selected' : ''}>Lunas</option>
        </select></label>
      `;
      form.onsubmit = e => {
        e.preventDefault();
        inv[1] = document.getElementById('editInvCustomer').value.trim();
        inv[2] = document.getElementById('editInvDate').value.trim();
        inv[3] = document.getElementById('editInvTotal').value.trim();
        inv[4] = document.getElementById('editInvStatus').value;
        const newEventDate = document.getElementById('editInvEventDate').value.trim();
        if(db.invoiceEventDates) db.invoiceEventDates[number] = newEventDate || '—';
        savePrototypeData();
        renderInvoiceTable();
        renderPayments();
        updateDashboardMetrics();
        layer.classList.remove('show');
        notify('Invoice berhasil diperbarui.');
      };
      layer.classList.add('show');
    };
  });
}

function showInvoiceBuilder(){
  resetModalFoot('Buat & Simpan Invoice');
  const modal = document.querySelector('#modal .modal');
  const layer = document.getElementById('modal');
  const form = document.getElementById('form');
  const nextNumber = getNextInvoiceNumber();
  const state = { items: [], unit: '', customer: '', discount: 0, other: 0 };
  modal.classList.add('invoice-builder');
  document.getElementById('modalTitle').textContent = 'Buat Invoice';
  document.getElementById('modalFields').innerHTML = `<div class="invoice-layout"><div><h4>Customer</h4><div class="customer-line"><label>Data Customer<select id="invoiceCustomer"><option value="">Pilih customer</option>${db.customers.map(c => `<option value="${c[0]}">${c[0]}</option>`).join('')}</select><div class="customer-phone" id="customerPhone">Pilih customer untuk melihat nomor WhatsApp.</div></label><button type="button" class="secondary" id="openQuickCustomer">＋ Customer Baru</button></div><div class="quick-customer" id="quickCustomer"><b>Input Customer Cepat (Otomatis Masuk Database)</b><div class="invoice-grid"><label>Nama<input id="newCustomerName" type="text" placeholder="Nama customer"/></label><label>No. WhatsApp<input id="newCustomerPhone" type="tel" placeholder="08xx-xxxx-xxxx"/></label></div><label>Keterangan<input id="newCustomerNotes" type="text" placeholder="Keperluan / Acara"/></label><button type="button" class="secondary" id="saveQuickCustomer">Simpan ke Database & Pilih</button></div><h4>Informasi Invoice & Unit Usaha</h4><div class="invoice-grid"><label>Unit Usaha<select id="invoiceUnit"><option value="">Pilih unit usaha</option>${db.units.map(x => `<option>${x}</option>`).join('')}</select></label><label>Nomor Invoice<input id="invoiceNumber" value="${nextNumber}" readonly/></label><label>Tanggal Invoice<input id="invoiceDate" type="date" value="2026-09-22" required/></label><label>Jatuh Tempo<input id="dueDate" type="date" value="2026-09-29" required/></label></div><section id="eventDetails" class="event-details"><h4>Jadwal Acara</h4><div class="invoice-grid"><label>Tanggal Acara<input id="eventDate" type="date"/></label><label>Jam Mulai<input id="eventTime" type="time"/></label><label>Jam Selesai<input id="eventEndTime" type="time"/></label></div></section><h4>Rincian Produk / Jasa</h4><p class="builder-note">Satu invoice hanya dapat memakai satu unit usaha. Produk yang tersedia mengikuti unit yang dipilih.</p><div id="invoiceItems"><div class="empty">Pilih unit usaha untuk menambahkan produk atau jasa.</div></div><button type="button" class="secondary" id="addInvoiceItem" disabled>＋ Tambah Produk</button><h4>Penyesuaian</h4><div class="invoice-grid"><label>Diskon (Rp)<input id="invoiceDiscount" type="number" min="0" value="0"/></label><label>Biaya Lainnya (Rp)<input id="invoiceOther" type="number" min="0" value="0"/></label></div><label>Catatan<textarea id="invoiceNotes" rows="3" placeholder="Catatan untuk customer atau internal"></textarea></label></div><aside class="summary-box"><h4>Rincian Sebelum Disimpan</h4><div id="invoicePreview" class="builder-note">Lengkapi data invoice untuk melihat ringkasannya.</div><dl><div><dt>Subtotal</dt><dd id="subtotalValue">Rp0</dd></div><div><dt>Diskon</dt><dd id="discountValue">- Rp0</dd></div><div><dt>Biaya lainnya</dt><dd id="otherValue">Rp0</dd></div><div class="grand"><dt>Total Invoice</dt><dd id="totalValue">Rp0</dd></div></dl></aside></div>`;
  const $ = id => document.getElementById(id);
  const money = value => rupiah(Number(value) || 0);
  const customerChange = () => {
    const selected = db.customers.find(c => c[0] === $('invoiceCustomer').value);
    state.customer = selected?.[0] || '';
    $('customerPhone').textContent = selected ? `WhatsApp: ${selected[1]}${selected[2] ? ` · ${selected[2]}` : ''}` : 'Pilih customer untuk melihat nomor WhatsApp.';
    refreshPreview();
  };
  const updateTotals = () => {
    state.discount = Number($('invoiceDiscount').value) || 0;
    state.other = Number($('invoiceOther').value) || 0;
    const subtotal = state.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const total = Math.max(0, subtotal - state.discount + state.other);
    $('subtotalValue').textContent = money(subtotal);
    $('discountValue').textContent = '- ' + money(state.discount);
    $('otherValue').textContent = money(state.other);
    $('totalValue').textContent = money(total);
    return { subtotal, total };
  };
  const refreshPreview = () => {
    const { subtotal, total } = updateTotals();
    const needsSchedule = ['Sewa Ruangan', 'Vendor'].includes(state.unit);
    const eventDateVal = $('eventDate')?.value || '';
    const startTime = $('eventTime')?.value || '';
    const endTime = $('eventEndTime')?.value || '';
    const scheduleStr = eventDateVal ? `${formatDate(eventDateVal)}${startTime ? ` (${startTime}${endTime ? `–${endTime}` : ''})` : ''}` : 'Belum ditentukan';
    $('invoicePreview').innerHTML = `<b>${$('invoiceNumber').value}</b><br>${state.customer || 'Customer belum dipilih'}<br>${state.unit || 'Unit usaha belum dipilih'}${needsSchedule ? `<br>Acara: ${scheduleStr}` : ''}<br>${state.items.length} item · ${money(subtotal)} → <b>${money(total)}</b>`;
  };
  const updateEventVisibility = () => {
    const needsSchedule = ['Sewa Ruangan', 'Vendor'].includes($('invoiceUnit').value);
    $('eventDetails').classList.toggle('show', needsSchedule);
    ['eventDate', 'eventTime', 'eventEndTime'].forEach(id => {
      const el = $(id);
      if(el) el.required = needsSchedule;
    });
    refreshPreview();
  };
  const renderItems = () => {
    const holder = $('invoiceItems');
    if(!state.unit){
      holder.innerHTML = '<div class="empty">Pilih unit usaha untuk menambahkan produk atau jasa.</div>';
      return;
    }
    const available = db.products.filter(p => p[2] === state.unit);
    if(!state.items.length && available.length){
      state.items.push({ name: available[0]?.[1] || '', qty: 1, price: Number((available[0]?.[6] || '0').replace(/[^0-9]/g, '')) });
    }
    holder.innerHTML = state.items.map((item, index) => `<div class="item-row"><select data-item-name="${index}">${available.map(p => `<option ${p[1] === item.name ? 'selected' : ''}>${p[1]}</option>`).join('')}</select><input data-item-qty="${index}" type="number" min="1" value="${item.qty}" aria-label="Jumlah"/><input data-item-price="${index}" type="number" min="0" value="${item.price}" aria-label="Harga"/><button type="button" class="remove-item" data-remove-item="${index}" title="Hapus produk">×</button></div>`).join('');
    holder.querySelectorAll('[data-item-name]').forEach(select => select.onchange = () => {
      const index = Number(select.dataset.itemName);
      const product = available.find(p => p[1] === select.value);
      state.items[index].name = select.value;
      state.items[index].price = Number((product?.[6] || '0').replace(/[^0-9]/g, ''));
      renderItems();
      refreshPreview();
    });
    holder.querySelectorAll('[data-item-qty]').forEach(input => input.oninput = () => {
      state.items[Number(input.dataset.itemQty)].qty = Number(input.value) || 0;
      refreshPreview();
    });
    holder.querySelectorAll('[data-item-price]').forEach(input => input.oninput = () => {
      state.items[Number(input.dataset.itemPrice)].price = Number(input.value) || 0;
      refreshPreview();
    });
    holder.querySelectorAll('[data-remove-item]').forEach(button => button.onclick = () => {
      state.items.splice(Number(button.dataset.removeItem), 1);
      renderItems();
      refreshPreview();
    });
  };
  $('invoiceCustomer').onchange = customerChange;
  $('invoiceUnit').onchange = () => {
    state.unit = $('invoiceUnit').value;
    state.items = [];
    $('addInvoiceItem').disabled = !state.unit;
    updateEventVisibility();
    renderItems();
    refreshPreview();
  };
  $('addInvoiceItem').onclick = () => {
    const available = db.products.filter(p => p[2] === state.unit);
    state.items.push({ name: available[0]?.[1] || '', qty: 1, price: Number((available[0]?.[6] || '0').replace(/[^0-9]/g, '')) });
    renderItems();
    refreshPreview();
  };
  ['invoiceDiscount', 'invoiceOther', 'invoiceNotes', 'eventDate', 'eventTime', 'eventEndTime'].forEach(id => $(id)?.addEventListener('input', refreshPreview));
  $('openQuickCustomer').onclick = () => $('quickCustomer').classList.toggle('show');
  $('saveQuickCustomer').onclick = () => {
    const name = $('newCustomerName').value.trim(), phone = $('newCustomerPhone').value.trim(), notes = $('newCustomerNotes').value.trim();
    if(!name || !phone){ notify('Nama dan nomor WhatsApp customer wajib diisi.'); return; }
    addCustomer(name, phone, notes);
    $('invoiceCustomer').value = name;
    customerChange();
    $('quickCustomer').classList.remove('show');
    $('newCustomerName').value = ''; $('newCustomerPhone').value = ''; $('newCustomerNotes').value = '';
    notify(`Customer "${name}" berhasil ditambahkan ke database.`);
  };
  form.onsubmit = event => {
    event.preventDefault();
    if(!state.customer || !state.unit || !state.items.length || state.items.some(item => !item.name || item.qty < 1)){
      notify('Lengkapi customer, unit usaha, dan minimal satu produk terlebih dahulu.');
      return;
    }
    const needsSchedule = ['Sewa Ruangan', 'Vendor'].includes(state.unit);
    const eventDateVal = $('eventDate')?.value || '';
    if(needsSchedule && !eventDateVal){
      notify('Tanggal acara wajib diisi untuk unit ' + state.unit + '.');
      return;
    }
    const { subtotal, total } = updateTotals();
    const invNumber = $('invoiceNumber').value;
    const invDateVal = $('invoiceDate').value;
    const formattedDate = formatDate(invDateVal);
    const formattedTotal = money(total);
    const formattedEventDate = eventDateVal ? formatDate(eventDateVal) : '—';

    // 1. Simpan ke database invoice
    db.invoices.unshift([invNumber, state.customer, formattedDate, formattedTotal, 'Menunggu Pembayaran']);
    db.invoiceEventDates = db.invoiceEventDates || {};
    db.invoiceEventDates[invNumber] = formattedEventDate;

    db.invoiceDetails = db.invoiceDetails || {};
    db.invoiceDetails[invNumber] = { subtotal, discount: state.discount, other: state.other, items: state.items.map(item => ({ ...item })) };

    // 2. Simpan persistensi prototype
    savePrototypeData();

    // 3. Render tabel invoice dengan 9 kolom yang lengkap
    renderInvoiceTable();

    // 4. Perbarui modul pembayaran & dashboard
    renderPayments();
    updateDashboardMetrics();

    layer.classList.remove('show');
    modal.classList.remove('invoice-builder');
    notify(`Invoice ${invNumber} berhasil disimpan.`);
  };
  refreshPreview();
  layer.classList.add('show');
}

function upgradeOperationalActions(){
  const page = document.getElementById('page-omzet');
  if(!page) return;
  const header = page.querySelector('thead tr');
  if(header && !header.querySelector('.action-header')) header.insertAdjacentHTML('beforeend', '<th class="action-header">Aksi</th>');
  page.querySelectorAll('tbody tr').forEach(row => {
    const action = row.lastElementChild;
    action.innerHTML = `<button class="link edit-record">Edit</button> <button class="link delete-record">Hapus</button>`;
  });
  page.addEventListener('click', event => {
    const row = event.target.closest('tr');
    if(!row) return;
    if(event.target.classList.contains('delete-record')){
      if(confirm('Hapus data omzet ini? Tindakan ini tidak dapat dibatalkan.')){
        row.remove();
        notify('Data omzet berhasil dihapus.');
      }
      return;
    }
    if(!event.target.classList.contains('edit-record')) return;
    const cells = [...row.querySelectorAll('td')];
    const fields = [['Tanggal', 'date', cells[0].textContent], ['Unit Bisnis', 'text', cells[1].textContent], ['Nominal Omzet', 'text', cells[2].textContent], ['Metode Pembayaran', 'text', cells[3].textContent], ['Keterangan', 'text', cells[4].textContent]];
    resetModalFoot('Simpan Perubahan');
    document.getElementById('modalTitle').textContent = 'Edit Omzet';
    document.getElementById('modalFields').innerHTML = fields.map(([label, input, value]) => `<label>${label}<input type="${input}" value="${value}" required></label>`).join('');
    const form = document.getElementById('form');
    form.onsubmit = e => {
      e.preventDefault();
      const inputs = [...form.querySelectorAll('input')];
      inputs.forEach((input, index) => { cells[index].textContent = input.value; });
      document.getElementById('modal').classList.remove('show');
      notify('Data berhasil diperbarui.');
    };
    document.getElementById('modal').classList.add('show');
  });
}

function upgradeInvoiceList(){
  const page = document.getElementById('page-invoice');
  if(!page || page.dataset.listReady) return;
  page.dataset.listReady = 'true';

  db.invoiceEventDates = db.invoiceEventDates || {
    'INV/MARALA/2026/0024': '27 Sep 2026',
    'INV/MARALA/2026/0023': '25 Sep 2026',
    'INV/MARALA/2026/0022': '05 Okt 2026'
  };

  renderInvoiceTable();

  const filters = document.createElement('div');
  filters.className = 'invoice-filter-panel card';
  filters.innerHTML = `<label>Filter berdasarkan<select id="invoiceDateType"><option value="allDates">Semua Tanggal</option><option value="invoiceDate">Tanggal Invoice</option><option value="eventDate">Tanggal Acara</option></select></label><label>Dari tanggal<input id="invoiceFilterFrom" type="date"/></label><label>Sampai tanggal<input id="invoiceFilterTo" type="date"/></label><label>Status<select id="invoiceStatusFilter"><option value="">Semua status</option><option>Draft</option><option>Menunggu Pembayaran</option><option>DP</option><option>Sebagian Dibayar</option><option>Lunas</option><option>Jatuh Tempo</option></select></label><div class="filter-actions"><button class="primary" id="applyInvoiceFilter">Terapkan</button><button class="secondary" id="resetInvoiceFilter">Reset</button></div>`;
  page.querySelector('.toolbar').insertAdjacentElement('afterend', filters);

  const apply = () => {
    const field = document.getElementById('invoiceDateType').value;
    const from = document.getElementById('invoiceFilterFrom').value;
    const to = document.getElementById('invoiceFilterTo').value;
    const status = document.getElementById('invoiceStatusFilter').value;
    let count = 0;
    page.querySelectorAll('tbody tr').forEach(row => {
      const dates = field === 'allDates' ? [row.dataset.invoiceDate || '', row.dataset.eventDate || ''] : [row.dataset[field] || ''];
      const dateMatches = dates.some(date => (!from || date >= from) && (!to || date <= to));
      const currentStatus = row.children[7]?.textContent.trim() || '';
      const statusMatches = !status || currentStatus === status;
      const visible = dateMatches && statusMatches;
      row.style.display = visible ? '' : 'none';
      if(visible) count++;
    });
    notify(`${count} invoice ditemukan.`);
  };
  document.getElementById('applyInvoiceFilter').onclick = apply;
  document.getElementById('resetInvoiceFilter').onclick = () => {
    ['invoiceFilterFrom', 'invoiceFilterTo', 'invoiceStatusFilter'].forEach(id => document.getElementById(id).value = '');
    page.querySelectorAll('tbody tr').forEach(row => row.style.display = '');
    notify('Filter invoice direset.');
  };
}

function upgradeRevenueFilters(){
  const page = document.getElementById('page-omzet');
  if(!page) return;
  const controls = page.querySelector('.period-controls');
  if(!controls || controls.dataset.ready || controls.children.length < 5) return;
  controls.dataset.ready = 'true';
  const [period, start, end, applyButton, exportButton] = [...controls.children];
  if(!period || !start || !end || !applyButton || !exportButton) return;
  period.id = 'revenuePeriod'; start.id = 'revenueFrom'; end.id = 'revenueTo'; applyButton.id = 'applyRevenueFilter'; exportButton.id = 'exportRevenue';
  const unit = document.createElement('select');
  unit.id = 'revenueUnit'; unit.className = 'unit-filter';
  unit.innerHTML = `<option value="">Semua Unit Bisnis</option>${db.units.map(item => `<option value="${item}">${item}</option>`).join('')}`;
  applyButton.before(unit);
  const rows = [...page.querySelectorAll('tbody tr')];
  const isoDates = ['2026-09-22', '2026-09-22', '2026-09-21'];
  rows.forEach((row, index) => row.dataset.revenueDate = isoDates[index] || '');
  const foot = document.createElement('tfoot');
  foot.innerHTML = '<tr class="revenue-total-row"><td colspan="2">TOTAL OMZET</td><td id="revenueTotal">Rp0</td><td colspan="3" id="revenueCount">0 transaksi</td></tr>';
  page.querySelector('table').append(foot);
  const updateTotal = () => {
    const visible = [...page.querySelectorAll('tbody tr')].filter(row => row.style.display !== 'none');
    const total = visible.reduce((sum, row) => sum + (Number(row.children[2].textContent.replace(/[^0-9]/g, '')) || 0), 0);
    document.getElementById('revenueTotal').textContent = rupiah(total);
    document.getElementById('revenueCount').textContent = `${visible.length} transaksi`;
    return visible;
  };
  applyButton.onclick = () => {
    const from = start.value, to = end.value, chosenUnit = unit.value, query = page.querySelector('.search').value.trim().toLowerCase();
    rows.forEach(row => {
      const date = row.dataset.revenueDate || '', contents = row.textContent.toLowerCase();
      const visible = (!from || date >= from) && (!to || date <= to) && (!chosenUnit || row.children[1].textContent.trim() === chosenUnit) && (!query || contents.includes(query));
      row.style.display = visible ? '' : 'none';
    });
    const visible = updateTotal();
    notify(`${visible.length} data omzet ditemukan.`);
  };
  exportButton.onclick = () => {
    const visible = updateTotal();
    const data = [['Tanggal', 'Unit Bisnis', 'Omzet', 'Metode', 'Keterangan'], ...visible.map(row => [...row.children].slice(0, 5).map(cell => cell.textContent.trim()))];
    const csv = '\uFEFF' + data.map(line => line.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); link.download = 'Laporan_Omzet_BUMM_Marala.csv'; link.click(); URL.revokeObjectURL(link.href);
    notify('Data omzet berhasil diexport.');
  };
  page.querySelector('.search').addEventListener('input', () => applyButton.click());
  updateTotal();
}

function renderPayments(){
  const page = document.getElementById('page-pembayaran');
  if(!page) return;
  const rows = (db.payments || []).map((payment, index) => {
    const total = invoiceTotal(payment.invoice), paid = paidTotal(payment.invoice), balance = Math.max(0, total - paid), status = balance === 0 ? 'Lunas' : paid > 0 ? 'Sebagian Dibayar' : 'Menunggu Pembayaran';
    return `<tr><td>${payment.date}</td><td><b>${payment.invoice}</b></td><td>${payment.customer}</td><td>${payment.method}</td><td><b>${rupiah(payment.amount)}</b></td><td style="color:${balance === 0 ? 'var(--good)' : 'var(--bad)'};font-weight:700">${rupiah(balance)}</td><td><span class="badge ${status === 'Lunas' ? 'paid' : 'pending'}">${status}</span></td><td><button class="link detail-payment" data-invoice="${payment.invoice}">Invoice</button> <button class="link delete-payment" data-payment="${index}">Hapus</button></td></tr>`;
  }).join('');
  page.innerHTML = `<div class="welcome"><div><h2>Pembayaran Invoice</h2><p>Catat pembayaran yang diterima dan pantau sisa tagihan setiap invoice.</p></div><button class="primary" id="newPayment">＋ Catat Pembayaran</button></div><div class="metrics">${metric('Pembayaran Diterima', rupiah((db.payments || []).reduce((sum, item) => sum + item.amount, 0)), '↗', 'September 2026')}${metric('Invoice Belum Lunas', String(db.invoices.filter(item => paidTotal(item[0]) < invoiceTotal(item[0])).length), '◫', 'Perlu ditindaklanjuti')}${metric('Total Sisa Tagihan', rupiah(db.invoices.reduce((sum, item) => sum + Math.max(0, invoiceTotal(item[0]) - paidTotal(item[0])), 0)), '◈', 'Dari invoice aktif')}</div><div class="toolbar" style="margin-top:18px"><input class="search" id="paymentSearch" placeholder="Cari invoice atau customer..."/><button class="secondary" id="exportPayments">⇩ Export</button></div><article class="card table-card"><div class="table-head"><div><h3>Riwayat Pembayaran</h3><p class="sub">Setiap pembayaran terhubung langsung ke invoice dan otomatis memperbarui sisa tagihan.</p></div></div><table><thead><tr><th>Tanggal</th><th>Nomor Invoice</th><th>Customer</th><th>Metode</th><th>Nominal Dibayar</th><th>Sisa Tagihan</th><th>Status Invoice</th><th>Aksi</th></tr></thead><tbody>${rows || '<tr><td colspan="8" class="empty">Belum ada pembayaran.</td></tr>'}</tbody></table></article>`;
  document.getElementById('newPayment').onclick = () => showPaymentForm();
  page.querySelectorAll('.detail-payment').forEach(btn => {
    btn.onclick = () => openInvoiceDetail(btn.dataset.invoice);
  });
  page.querySelectorAll('.delete-payment').forEach(button => button.onclick = () => {
    if(confirm('Hapus catatan pembayaran ini? Sisa tagihan dan status invoice akan dihitung ulang.')){
      const idx = Number(button.dataset.payment);
      const payment = db.payments[idx];
      if(payment){
        db.payments.splice(idx, 1);
        const inv = db.invoices.find(item => item[0] === payment.invoice);
        if(inv){
          const bal = invoiceTotal(inv[0]) - paidTotal(inv[0]);
          inv[4] = bal === 0 ? 'Lunas' : paidTotal(inv[0]) > 0 ? 'Sebagian Dibayar' : 'Menunggu Pembayaran';
        }
        savePrototypeData();
        renderInvoiceTable();
        renderPayments();
        updateDashboardMetrics();
        notify('Pembayaran berhasil dihapus.');
      }
    }
  });
  document.getElementById('paymentSearch').oninput = event => {
    const term = event.target.value.toLowerCase();
    page.querySelectorAll('tbody tr').forEach(row => row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none');
  };
  document.getElementById('exportPayments').onclick = () => {
    const lines = [['Tanggal', 'Invoice', 'Customer', 'Metode', 'Nominal'], ...(db.payments || []).map(item => [item.date, item.invoice, item.customer, item.method, item.amount])];
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob(['\uFEFF' + lines.map(line => line.join(',')).join('\n')], { type: 'text/csv' })); link.download = 'Laporan_Pembayaran_BUMM_Marala.csv'; link.click();
    notify('Riwayat pembayaran berhasil diexport.');
  };
}

function showPaymentForm(defaultInvoiceNumber = null){
  resetModalFoot('Simpan Pembayaran');
  const modal = document.querySelector('#modal .modal'), layer = document.getElementById('modal'), form = document.getElementById('form');
  modal.classList.remove('invoice-builder');
  document.getElementById('modalTitle').textContent = 'Catat Pembayaran Invoice';
  const unpaidList = db.invoices.filter(item => paidTotal(item[0]) < invoiceTotal(item[0]));
  document.getElementById('modalFields').innerHTML = `<label>Nomor Invoice<select id="paymentInvoice"><option value="">Pilih invoice</option>${unpaidList.map(item => `<option value="${item[0]}">${item[0]} — ${item[1]}</option>`).join('')}</select></label><div class="payment-info" id="paymentInvoiceInfo">${unpaidList.length ? 'Pilih invoice untuk melihat total tagihan, sudah dibayar, dan sisa tagihan.' : 'Semua invoice saat ini sudah lunas.'}</div><label>Tanggal Pembayaran<input id="paymentDate" type="date" value="2026-09-22" required/></label><label>Nominal Pembayaran (DP / Cicilan / Pelunasan)<input id="paymentAmount" type="number" min="1" placeholder="Masukkan nominal" required/></label><label>Metode Pembayaran<select id="paymentMethod"><option>Transfer</option><option>Cash</option><option>QRIS</option></select></label><label>Keterangan<input id="paymentNote" type="text" placeholder="Contoh: DP 50%, Pelunasan acara"/></label>`;
  const invoiceSelect = document.getElementById('paymentInvoice');
  invoiceSelect.onchange = () => {
    const number = invoiceSelect.value;
    if(!number){
      document.getElementById('paymentInvoiceInfo').innerHTML = 'Pilih invoice untuk melihat ringkasan tagihan.';
      return;
    }
    const total = invoiceTotal(number), paid = paidTotal(number), balance = Math.max(0, total - paid), invoice = db.invoices.find(item => item[0] === number);
    document.getElementById('paymentInvoiceInfo').innerHTML = `
      <div style="font-weight:700;font-size:13px;color:var(--text);margin-bottom:10px">${invoice[1]}</div>
      <div class="inv-bill-summary" style="font-size:13px">
        <div class="inv-bill-row">
          <span style="color:var(--muted)">Total Harga</span>
          <span class="val">${rupiah(total)}</span>
        </div>
        <div class="inv-bill-separator"></div>
        <div class="inv-bill-row total-tagihan-row">
          <span>Total Tagihan</span>
          <span class="val">${rupiah(total)}</span>
        </div>
        <div style="height:10px"></div>
        <div class="inv-bill-row pembayaran-diterima-row">
          <span>Pembayaran Diterima</span>
          <span class="val">${rupiah(paid)}</span>
        </div>
        <div class="inv-bill-separator" style="margin:4px 0"></div>
        <div class="inv-bill-row sisa-tagihan-row ${balance === 0 ? 'is-lunas' : ''}">
          <span>Sisa Tagihan</span>
          <span class="val" style="color:${balance === 0 ? 'var(--good)' : 'var(--bad)'}">${rupiah(balance)}</span>
        </div>
      </div>
    `;
    document.getElementById('paymentAmount').max = balance || '';
    document.getElementById('paymentAmount').value = balance || '';
  };

  if(defaultInvoiceNumber && unpaidList.some(item => item[0] === defaultInvoiceNumber)){
    invoiceSelect.value = defaultInvoiceNumber;
    invoiceSelect.onchange();
  }

  form.onsubmit = event => {
    event.preventDefault();
    const number = invoiceSelect.value, amount = Number(document.getElementById('paymentAmount').value);
    if(!number || !amount){ notify('Pilih invoice dan isi nominal pembayaran.'); return; }
    const balance = invoiceTotal(number) - paidTotal(number);
    if(amount > balance){ notify('Nominal pembayaran melebihi sisa tagihan.'); return; }
    const invoice = db.invoices.find(item => item[0] === number);
    db.payments.push({ date: formatDate(document.getElementById('paymentDate').value), invoice: number, customer: invoice[1], method: document.getElementById('paymentMethod').value, amount });
    const remaining = balance - amount;
    invoice[4] = remaining === 0 ? 'Lunas' : paidTotal(number) > 0 ? (amount < balance ? 'DP' : 'Sebagian Dibayar') : 'Menunggu Pembayaran';
    savePrototypeData();
    renderInvoiceTable();
    renderPayments();
    updateDashboardMetrics();
    layer.classList.remove('show');
    notify(`Pembayaran sebesar ${rupiah(amount)} berhasil dicatat. Sisa tagihan: ${rupiah(remaining)}.`);
  };
  layer.classList.add('show');
}

function updateDashboardMetrics(){
  const unpaidInvoices = db.invoices.filter(item => paidTotal(item[0]) < invoiceTotal(item[0]));
  const totalUnpaid = unpaidInvoices.reduce((sum, item) => sum + Math.max(0, invoiceTotal(item[0]) - paidTotal(item[0])), 0);
  const activityEl = document.querySelector('#page-dashboard .activity');
  if(activityEl){
    const firstLi = activityEl.querySelector('li');
    if(firstLi){
      firstLi.innerHTML = `<b>${unpaidInvoices.length} invoice belum lunas</b><small>Nilai total ${rupiah(totalUnpaid)}</small>`;
    }
  }
  const dashTable = document.querySelector('#page-dashboard .table-card tbody');
  if(dashTable){
    dashTable.innerHTML = db.invoices.slice(0, 5).map(r => {
      const number = r[0];
      const total = invoiceTotal(number);
      const paid = paidTotal(number);
      const balance = Math.max(0, total - paid);
      const status = balance === 0 && total > 0 ? 'Lunas' : paid > 0 ? (r[4] === 'DP' ? 'DP' : 'Sebagian Dibayar') : 'Menunggu Pembayaran';
      return `<tr><td><b>${number}</b></td><td>${r[1]}</td><td>${r[2]}</td><td>${rupiah(total)}</td><td><span class="badge ${status === 'Lunas' ? 'paid' : 'pending'}">${status}</span></td><td><button class="link" onclick="openInvoiceDetail('${number}')">Detail</button></td></tr>`;
    }).join('');
  }
}

function savePrototypeData(){
  localStorage.setItem('bumm-marala-prototype', JSON.stringify({ invoices: db.invoices, payments: db.payments, customers: db.customers, invoiceEventDates: db.invoiceEventDates || {}, invoiceDetails: db.invoiceDetails || {} }));
}

function restorePrototypeData(){
  try{
    const saved = JSON.parse(localStorage.getItem('bumm-marala-prototype') || 'null');
    if(!saved) return;
    if(Array.isArray(saved.invoices)){
      saved.invoices.forEach(inv => {
        if(inv[3] && !/\d/.test(inv[3]) && inv[4] && /\d/.test(inv[4])){
          const tmp = inv[3]; inv[3] = inv[4]; inv[4] = tmp;
        } else if(inv[3] && !/\d/.test(inv[3])){
          inv[3] = 'Rp1.000.000';
        }
      });
      db.invoices.splice(0, db.invoices.length, ...saved.invoices);
    }
    if(Array.isArray(saved.payments)) db.payments.splice(0, db.payments.length, ...saved.payments);
    if(Array.isArray(saved.customers)) db.customers.splice(0, db.customers.length, ...saved.customers);
    db.invoiceEventDates = saved.invoiceEventDates || {};
    db.invoiceDetails = saved.invoiceDetails || {};

    renderInvoiceTable();
    renderCustomerTable();
    renderPayments();
    updateDashboardMetrics();
  }catch(error){ console.warn('Data prototype tidak dapat dipulihkan.', error); }
}

upgradeOperationalActions();
upgradeInvoiceList();
upgradeRevenueFilters();
upgradeCustomerModule();
renderPayments();
restorePrototypeData();

document.querySelectorAll('[data-modal="invoice"]').forEach(button => button.onclick = showInvoiceBuilder);
document.querySelectorAll('[data-modal="payment"]').forEach(button => button.onclick = () => showPaymentForm());
document.querySelectorAll('[data-modal="customer"]').forEach(button => button.onclick = () => showCustomerModal());

