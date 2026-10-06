(()=>{
const type=window.MARALA_TYPE==='jasa'?'jasa':window.MARALA_TYPE==='kafe'?'kafe':'toko';
const reports=['profit','revenue',...(type==='jasa'?[]:['posmonthly'])];
const definitions={
 toko:[['Dashboard',['dashboard'],'grid'],['Kasir',['poscashier'],'cart'],['Produk',['posproducts'],'box'],['Stok',['teko','warehouse','stockitems','movements','transfers','opnames'],'box'],['Hutang',['posdebt'],'wallet'],['Pengeluaran',['expenses'],'wallet'],['Laporan',reports,'chart']],
 kafe:[['Dashboard',['dashboard'],'grid'],['Kasir',['poscashier'],'cart'],['Menu',['posproducts'],'box'],['Antrian',['posqueue'],'clock'],['Riwayat penjualan',['poshistory'],'clock'],['Pengeluaran',['expenses'],'wallet'],['Laporan',reports,'chart']],
 jasa:[['Dashboard',['dashboard'],'grid'],['Invoice',['invoices'],'file'],['Daftar jasa',['products'],'box'],['Pelanggan',['customers'],'users'],['Pembayaran',['payments'],'wallet'],['Pengeluaran',['expenses'],'wallet'],['Laporan',reports,'chart']]
};
window.MARALA_TYPE=type;
window.MARALA_GROUPS=[...definitions[type],['Pengaturan',['identity','users','banks','invoiceSettings'],'settings']];
window.MARALA_NAV=window.MARALA_GROUPS.flatMap(g=>g[1]);
window.MARALA_TITLES={poscashier:'Kasir',posproducts:type==='kafe'?'Menu':'Produk',posqueue:'Antrian',poshistory:'Riwayat penjualan',posdebt:'Hutang',teko:'Stok outlet',warehouse:'Stok gudang',stockitems:'Daftar barang',movements:'Mutasi stok',opnames:'Hitung stok',transfers:'Transfer stok',profit:'Laba rugi',revenue:'Penjualan',posmonthly:'Rincian kasir',posapproval:'Rekap kasir',identity:'Profil usaha',users:'Akun tim',banks:'Rekening usaha',invoiceSettings:'Pengaturan invoice',products:'Daftar jasa',expenses:'Pengeluaran',payments:'Pembayaran',customers:'Pelanggan'};
const paths={grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',cart:'M3 3h2l3 13h11l2-9H6 M9 20h.01 M18 20h.01',box:'M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10',wallet:'M3 6h17v14H3z M3 6V4h14 M15 10h6v6h-6z',chart:'M4 3v18h17 M8 16v-5 M13 16V7 M18 16V4',clock:'M12 8v5l3 2 M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18',file:'M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6 M9 16h6',users:'M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M2 21v-3a7 7 0 0 1 14 0v3 M17 5a4 4 0 0 1 0 8 M19 16a6 6 0 0 1 3 5',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z'};
window.maralaIcon=k=>`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[k]||paths.grid}"/></svg>`;
})();
