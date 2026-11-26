// Katalog lini usaha MaralaKu. Dipakai bersama oleh browser (window.MARALA_LINES), server lokal, dan server cloud.
// Setiap lini menumpang pada salah satu mesin yang sudah ada (toko, kafe, jasa), lalu mengatur modul menu, istilah, jalur jualan, dan data contoh.
(function(root){'use strict';

const CATEGORIES=[
 ['ritel','Ritel & toko'],['kuliner','Makanan & minuman'],['jasa','Jasa & layanan'],['sewa','Sewa & properti'],
 ['event','Event, tiket & pendaftaran'],['wisata','Wisata & transportasi'],['pendidikan','Pendidikan'],['kesehatan','Kesehatan & kebugaran'],
 ['ibadah','Rumah ibadah & sosial'],['desa','Desa, lingkungan & koperasi'],['ternak','Peternakan & perikanan'],['tani','Pertanian & perkebunan'],
 ['produksi','Produksi & UMKM olahan'],['energi','Otomotif, energi & layanan digital']
];

const CHANNELS={
 kasir:{label:'Kasir saja',desc:'Pembeli datang ke tempatmu, kamu catat di kasir.'},
 online:{label:'Online saja',desc:'Pembeli pesan lewat link usahamu, kamu proses dan kirim.'},
 keduanya:{label:'Kasir + Online',desc:'Jualan di tempat dan online, stok dan laporan jadi satu.'}
};

// Modul menu: rute halaman, ikon, dan label bawaan. Laporan menyesuaikan mesin.
const MODULES={
 dashboard:[['dashboard'],'grid','Dashboard'],
 kasir:[['poscashier'],'cart','Kasir'],
 produk:[['posproducts'],'box','Produk'],
 stok:[['teko','warehouse','stockitems','movements','transfers','opnames'],'box','Stok'],
 hutang:[['posdebt'],'wallet','Hutang'],
 antrian:[['posqueue'],'clock','Antrian'],
 riwayat:[['poshistory'],'clock','Riwayat penjualan'],
 invoice:[['invoices'],'file','Invoice'],
 layanan:[['products'],'box','Daftar jasa'],
 pelanggan:[['customers'],'users','Pelanggan'],
 pembayaran:[['payments'],'wallet','Pembayaran'],
 pengeluaran:[['expenses'],'wallet','Pengeluaran'],
 laporan:[[],'chart','Laporan'],
 pesanan:[['onlineorders','shopsettings'],'cart','Pesanan online'],
 tagihan:[['recurring','invoices','payments'],'file','Tagihan berulang'],
 booking:[['bookings'],'calendar','Booking & jadwal'],
 event:[['events','registrations','checkin'],'ticket','Event & tiket'],
 donasi:[['publicreport'],'heart','Laporan publik'],
 ternak:[['animals'],'box','Data per ekor'],
 siklus:[['cycles'],'leaf','Siklus produksi'],
 anggota:[['members','ledger'],'users','Anggota & saldo'],
 komisi:[['commissions'],'wallet','Komisi karyawan'],
 produksi:[['batches'],'box','Produksi & batch'],
 barcode:[['barcodes'],'box','Barcode produk'],
 varian:[['variants'],'box','Varian produk']
};

// Fitur tambahan yang bisa dicentang di Pengaturan → Fitur. pos = hanya untuk mesin kasir (toko/kafe).
const FEATURES={
 pesanan:{label:'Etalase & pesanan online',desc:'Link toko untuk pembeli, pesanan masuk ke kasir atau tagihan.'},
 tagihan:{label:'Tagihan berulang',desc:'Tagihan bulanan otomatis untuk sewa, SPP, iuran, atau langganan.'},
 booking:{label:'Booking & jadwal',desc:'Jadwal per tempat atau orang, cek bentrok, DP, dan status kedatangan.'},
 event:{label:'Event & tiket',desc:'Kategori tiket, kuota, formulir, e-tiket QR, check-in, dan sertifikat.'},
 donasi:{label:'Laporan publik',desc:'Link laporan kas masuk dan keluar yang bisa dibagikan ke jamaah atau warga.'},
 ternak:{label:'Data per ekor',desc:'Nomor/eartag, bobot, kesehatan, kawin, kelahiran, dan penjualan.'},
 siklus:{label:'Siklus produksi',desc:'Tebar sampai panen: pakan, biaya, produksi harian, kematian, dan FCR.'},
 anggota:{label:'Anggota & saldo',desc:'Simpanan, penarikan, pinjaman, dan angsuran per anggota.'},
 komisi:{label:'Komisi karyawan',desc:'Persentase komisi per karyawan dari booking selesai atau catatan manual.'},
 produksi:{label:'Produksi & batch',desc:'Resep bahan, potong stok otomatis, HPP per unit, dan tanggal kedaluwarsa.'},
 barcode:{label:'Scan barcode',desc:'Pasang barcode ke produk dan scan di kasir dengan kamera atau scanner.',pos:true},
 varian:{label:'Varian produk',desc:'Buat produk per ukuran dan warna sekaligus.',pos:true}
};

const ENGINES={
 toko:{modules:['dashboard','kasir','produk','stok','hutang','pengeluaran','laporan'],terms:{item:'produk',start:'Mulai jualan',first:'Coba penjualan pertamamu',steps:['Buka {kasir}, pilih {item}, lalu catat pembayaran.','Pembayaran berhasil langsung masuk laporan usaha.','Buka laporan untuk melihat pendapatan dan laba usaha.']}},
 kafe:{modules:['dashboard','kasir','produk','antrian','riwayat','pengeluaran','laporan'],terms:{produk:'Menu',item:'menu',start:'Mulai jualan',first:'Coba penjualan pertamamu',steps:['Buka {kasir}, pilih {item}, lalu catat pembayaran.','Pesanan yang belum dibayar masuk {antrian} dan belum dihitung omzet.','Buka laporan untuk melihat pendapatan dan laba usaha.']}},
 jasa:{modules:['dashboard','invoice','layanan','pelanggan','pembayaran','pengeluaran','laporan'],terms:{item:'jasa',start:'Buat tagihan',first:'Coba tagihan pertamamu',steps:['Buka {invoice} dan buat tagihan untuk {pelangganKecil}.','Catat {pembayaranKecil} untuk melihat uang masuk.','Buka laporan untuk melihat pendapatan dan laba usaha.']}}
};

// Kumpulan istilah yang dipakai banyak lini.
const T={
 menu:{produk:'Menu',item:'menu'},
 jasaKasir:{produk:'Layanan & tarif',item:'layanan',riwayat:'Riwayat transaksi'},
 dana:{cash:true,revenue:'Penerimaan',kasir:'Catat penerimaan',produk:'Jenis dana',item:'jenis dana',riwayat:'Riwayat penerimaan',start:'Catat penerimaan',first:'Catat penerimaan pertamamu',steps:['Buka {kasir}, pilih {item}, lalu isi jumlahnya.','Penerimaan langsung masuk laporan kas.','Catat pengeluaran agar saldo kas terlihat jelas.']},
 iuran:{cash:true,revenue:'Iuran masuk',invoice:'Tagihan iuran',layanan:'Jenis iuran',pelanggan:'Anggota',pembayaran:'Pembayaran iuran',item:'iuran',start:'Buat tagihan iuran',first:'Coba tagihan iuran pertamamu'},
 warga:{cash:true,revenue:'Iuran masuk',invoice:'Tagihan iuran',layanan:'Jenis iuran',pelanggan:'Warga',pembayaran:'Pembayaran iuran',item:'iuran',start:'Buat tagihan iuran',first:'Coba tagihan iuran pertamamu'},
 peserta:{invoice:'Pendaftaran',layanan:'Kategori tiket',pelanggan:'Peserta',pembayaran:'Pembayaran peserta',item:'tiket',start:'Daftarkan peserta',first:'Coba pendaftaran pertamamu'},
 tiket:{kasir:'Penjualan tiket',produk:'Jenis tiket',item:'tiket',riwayat:'Riwayat tiket',start:'Jual tiket',first:'Coba penjualan tiket pertamamu'},
 penghuni:{invoice:'Tagihan sewa',layanan:'Kamar & tarif',pelanggan:'Penghuni',pembayaran:'Pembayaran sewa',item:'kamar',start:'Buat tagihan sewa',first:'Coba tagihan sewa pertamamu'},
 penyewa:{invoice:'Tagihan sewa',layanan:'Barang & tarif sewa',pelanggan:'Penyewa',pembayaran:'Pembayaran sewa',item:'barang sewa',start:'Buat tagihan sewa',first:'Coba tagihan sewa pertamamu'},
 siswa:{invoice:'Tagihan biaya',layanan:'Kelas & biaya',pelanggan:'Siswa',pembayaran:'Pembayaran siswa',item:'kelas',start:'Buat tagihan siswa',first:'Coba tagihan siswa pertamamu'},
 klien:{pelanggan:'Klien',item:'paket jasa'},
 pasien:{kasir:'Kasir',produk:'Layanan & tarif',antrian:'Antrian pasien',riwayat:'Riwayat kunjungan',item:'layanan'},
 hewan:{produk:'Hewan & hasil ternak',stok:'Pakan & obat',item:'hewan atau hasil ternak'},
 ikan:{produk:'Hasil panen',stok:'Pakan & benih',item:'hasil panen'},
 panen:{produk:'Hasil panen',stok:'Saprodi',item:'hasil panen'},
 anggotaKop:{invoice:'Tagihan angsuran',layanan:'Simpanan & pinjaman',pelanggan:'Anggota',pembayaran:'Setoran anggota',item:'jenis simpanan',start:'Buat tagihan angsuran',first:'Coba tagihan angsuran pertamamu'},
 sampah:{kasir:'Catat transaksi',produk:'Jenis sampah',item:'jenis sampah',riwayat:'Riwayat setoran'}
};

// Data contoh: [nama, kategori, harga, HPP, satuan]. stock = nama barang stok contoh.
const S={
 warung:{items:[['Beras 5 kg','Sembako',72000,64000,'karung'],['Minyak goreng 1 L','Sembako',18000,15000,'botol'],['Gula 1 kg','Sembako',17000,14000,'pak'],['Telur 1 kg','Sembako',29000,25000,'kg']]},
 kafe:{items:[['Kopi Susu MaralaKu','Kopi',18000,7000,'cup'],['Es Teh','Minuman',8000,3000,'cup'],['Roti Bakar','Makanan',16000,7000,'porsi'],['Americano','Kopi',14000,5000,'cup']],stock:['Cup 16 oz','Sedotan','Gula']},
 jasa:{items:[['Paket Desain','Jasa',250000,100000,'paket'],['Konsultasi','Jasa',150000,50000,'sesi'],['Cetak Dokumen','Jasa',10000,5000,'paket']],stock:['Kertas A4']},
 minimarket:{items:[['Mi goreng instan','Makanan',3500,2900,'pcs'],['Air mineral 600 ml','Minuman',4000,2800,'botol'],['Sabun mandi','Kebutuhan rumah',5000,3800,'pcs'],['Kopi sachet','Minuman',2000,1500,'sachet']]},
 bangunan:{items:[['Semen 50 kg','Material',68000,62000,'sak'],['Paku 1 kg','Material',22000,18000,'kg'],['Cat tembok 5 kg','Cat',95000,80000,'kaleng'],['Pipa PVC 3/4"','Pipa',35000,29000,'batang']]},
 pakaian:{items:[['Kaos polos M','Atasan',65000,40000,'pcs'],['Kemeja batik L','Atasan',150000,95000,'pcs'],['Celana chino','Bawahan',175000,110000,'pcs'],['Jilbab segi empat','Aksesoris',45000,28000,'pcs']]},
 elektronik:{items:[['Charger 20W','Aksesoris',85000,60000,'pcs'],['Earphone','Aksesoris',50000,32000,'pcs'],['Powerbank 10.000 mAh','Aksesoris',175000,130000,'pcs'],['Kabel data','Aksesoris',25000,15000,'pcs']]},
 apotek:{items:[['Paracetamol 500 mg','Obat bebas',5000,3500,'strip'],['Vitamin C 500 mg','Vitamin',15000,11000,'strip'],['Minyak kayu putih 60 ml','Obat luar',24000,19000,'botol'],['Masker medis','Alat kesehatan',30000,22000,'box']]},
 kosmetik:{items:[['Bedak padat','Wajah',45000,30000,'pcs'],['Lipstik','Bibir',55000,35000,'pcs'],['Sabun cuci muka','Perawatan',35000,24000,'pcs']]},
 atk:{items:[['Buku tulis 38 lbr','Buku',5000,3500,'pcs'],['Pulpen','Alat tulis',3000,2000,'pcs'],['Kertas HVS A4','Kertas',55000,46000,'rim']]},
 tani:{items:[['Pupuk urea 50 kg','Pupuk',150000,135000,'sak'],['Bibit cabai','Bibit',25000,17000,'pak'],['Pestisida 500 ml','Obat tanaman',65000,52000,'botol']]},
 emas:{items:[['Cincin emas 1 g','Perhiasan',1300000,1220000,'pcs'],['Kalung emas 2 g','Perhiasan',2600000,2440000,'pcs']]},
 oleh:{items:[['Keripik tempe','Camilan',20000,13000,'pak'],['Dodol','Manisan',25000,16000,'kotak'],['Kaos oleh-oleh','Suvenir',60000,38000,'pcs']]},
 makan:{items:[['Nasi ayam goreng','Makanan',20000,11000,'porsi'],['Soto ayam','Makanan',15000,8000,'porsi'],['Es teh manis','Minuman',5000,1500,'gelas'],['Nasi rames','Makanan',13000,7000,'porsi']],stock:['Beras','Minyak goreng','Gas 3 kg']},
 bakery:{items:[['Roti sobek','Roti',18000,9000,'pcs'],['Donat','Roti',6000,2500,'pcs'],['Bolu pandan','Kue',45000,24000,'loyang']],stock:['Tepung terigu','Gula','Mentega']},
 kantin:{items:[['Nasi goreng','Makanan',10000,6000,'porsi'],['Gorengan','Camilan',1000,500,'pcs'],['Es jeruk','Minuman',4000,1500,'gelas']],stock:['Beras','Minyak goreng','Jeruk']},
 katering:{items:[['Nasi box ayam','Paket',25000,15000,'box'],['Tumpeng mini','Paket',350000,200000,'paket'],['Snack box','Paket',12000,7000,'box']]},
 laundry:{items:[['Cuci setrika','Kiloan',7000,3000,'kg'],['Cuci kering','Kiloan',5000,2000,'kg'],['Bed cover','Satuan',35000,12000,'pcs']],stock:['Deterjen','Pewangi','Plastik laundry']},
 bengkel:{items:[['Ganti oli + oli','Jasa',55000,40000,'paket'],['Servis ringan','Jasa',50000,10000,'paket'],['Kampas rem','Suku cadang',45000,32000,'set'],['Busi','Suku cadang',20000,14000,'pcs']]},
 cuci:{items:[['Cuci motor','Cuci',15000,4000,'unit'],['Cuci mobil','Cuci',40000,10000,'unit'],['Poles bodi','Perawatan',75000,25000,'unit']],stock:['Sabun cuci','Semir ban','Lap mikrofiber']},
 salon:{items:[['Potong rambut','Rambut',35000,5000,'orang'],['Creambath','Perawatan',75000,20000,'orang'],['Cukur jenggot','Rambut',20000,3000,'orang']],stock:['Sampo','Krim','Handuk sekali pakai']},
 servis:{items:[['Servis ringan HP','Servis',75000,20000,'unit'],['Ganti LCD','Suku cadang',450000,330000,'unit'],['Cuci AC','Servis',85000,20000,'unit']]},
 foto:{items:[['Paket foto prewedding','Paket',2500000,900000,'paket'],['Foto produk per 10 foto','Paket',300000,80000,'paket'],['Dokumentasi acara','Paket',1500000,500000,'acara']]},
 cetak:{items:[['Cetak spanduk per m²','Cetak',25000,13000,'m²'],['Kartu nama 1 box','Cetak',45000,20000,'box'],['Sablon kaos per lusin','Sablon',600000,380000,'lusin']]},
 kos:{items:[['Kamar A1 per bulan','Kamar',800000,0,'bulan'],['Kamar B2 AC per bulan','Kamar',1200000,0,'bulan'],['Listrik tambahan','Tambahan',100000,0,'bulan']]},
 sewaAlat:{items:[['Sewa tenda per hari','Tenda',350000,50000,'hari'],['Kursi lipat per hari','Kursi',5000,500,'pcs'],['Sound system per hari','Audio',500000,100000,'hari']]},
 rental:{items:[['Sewa motor per hari','Motor',80000,15000,'hari'],['Sewa mobil per hari','Mobil',350000,90000,'hari'],['Antar jemput unit','Layanan',50000,15000,'kali']]},
 lapangan:{items:[['Futsal per jam','Lapangan',120000,20000,'jam'],['Badminton per jam','Lapangan',50000,8000,'jam'],['Sewa raket','Alat',15000,0,'pcs']]},
 tiket:{items:[['Tiket reguler','Tiket',50000,10000,'tiket'],['Tiket VIP','Tiket',150000,30000,'tiket'],['Tiket early bird','Tiket',35000,10000,'tiket']]},
 lomba:{items:[['Pendaftaran perorangan','Pendaftaran',75000,15000,'peserta'],['Pendaftaran tim','Pendaftaran',250000,50000,'tim']]},
 lari:{items:[['Kategori 5K','Kategori',150000,70000,'peserta'],['Kategori 10K','Kategori',200000,90000,'peserta'],['Kategori anak','Kategori',100000,50000,'peserta']]},
 wisata:{items:[['Tiket masuk dewasa','Tiket',15000,0,'orang'],['Tiket masuk anak','Tiket',10000,0,'orang'],['Parkir motor','Parkir',3000,0,'kendaraan']]},
 travel:{items:[['Kursi travel antar kota','Tiket',150000,90000,'kursi'],['Paket bagasi','Tambahan',25000,5000,'kali']]},
 parkir:{items:[['Parkir motor','Parkir',2000,0,'kendaraan'],['Parkir mobil','Parkir',5000,0,'kendaraan']]},
 sekolah:{items:[['SPP bulanan','SPP',250000,0,'bulan'],['Biaya pendaftaran','Pendaftaran',300000,0,'siswa'],['Paket 8 pertemuan','Paket',400000,120000,'paket']]},
 klinik:{items:[['Konsultasi umum','Layanan',50000,10000,'kunjungan'],['Cek gula darah','Pemeriksaan',25000,8000,'kali'],['Obat paket','Obat',35000,20000,'paket']],stock:['Strip gula darah','Kasa steril','Sarung tangan']},
 hewanPeliharaan:{items:[['Grooming kucing','Grooming',60000,15000,'ekor'],['Penitipan per hari','Penitipan',40000,10000,'hari'],['Makanan kucing 1 kg','Pakan',55000,42000,'kg']],stock:['Sampo hewan','Pasir kucing','Pakan kering']},
 gym:{items:[['Member bulanan','Member',150000,0,'bulan'],['Kunjungan harian','Harian',25000,0,'kali'],['Kelas yoga','Kelas',50000,10000,'sesi']]},
 dana:{items:[['Infak (per Rp1.000)','Infak',1000,0,'kelipatan'],['Sedekah (per Rp1.000)','Sedekah',1000,0,'kelipatan'],['Zakat fitrah per jiwa','Zakat',45000,0,'jiwa'],['Wakaf (per Rp10.000)','Wakaf',10000,0,'kelipatan']]},
 kurban:{items:[['Kambing kurban','Kurban',2800000,2300000,'ekor'],['Patungan sapi per orang','Kurban',3200000,2700000,'orang']]},
 iuran:{items:[['Iuran kebersihan','Iuran',20000,0,'bulan'],['Iuran keamanan','Iuran',30000,0,'bulan'],['Kas lingkungan','Iuran',10000,0,'bulan']]},
 koperasi:{items:[['Simpanan wajib','Simpanan',20000,0,'bulan'],['Simpanan pokok','Simpanan',100000,0,'anggota'],['Angsuran pinjaman','Pinjaman',250000,0,'bulan']]},
 arisan:{items:[['Setoran arisan','Arisan',100000,0,'putaran'],['Kas arisan','Kas',5000,0,'putaran']]},
 sampah:{items:[['Botol plastik','Plastik',3000,2000,'kg'],['Kardus','Kertas',2500,1500,'kg'],['Besi bekas','Logam',5000,3500,'kg']],stock:['Karung','Tali rafia','Timbangan gantung']},
 ternak:{items:[['Kambing jantan','Hewan',2500000,2000000,'ekor'],['Domba betina','Hewan',2000000,1600000,'ekor'],['Pupuk kandang','Hasil',15000,5000,'karung']],stock:['Pakan konsentrat','Obat cacing','Vitamin ternak']},
 unggas:{items:[['Telur ayam','Telur',28000,24000,'kg'],['Ayam afkir','Ayam',35000,25000,'ekor'],['Pupuk kotoran ayam','Hasil',10000,3000,'karung']],stock:['Pakan layer','Vitamin','Vaksin']},
 sapi:{items:[['Susu sapi segar','Susu',9000,6000,'liter'],['Sapi potong','Hewan',18000000,15000000,'ekor']],stock:['Konsentrat','Rumput','Obat']},
 ikan:{items:[['Lele konsumsi','Ikan',25000,18000,'kg'],['Nila','Ikan',35000,26000,'kg'],['Bibit lele 100 ekor','Benih',30000,20000,'paket']],stock:['Pelet ikan','Probiotik','Kapur dolomit']},
 panen:{items:[['Gabah kering','Padi',7000,5000,'kg'],['Cabai merah','Sayur',40000,28000,'kg'],['Bayam','Sayur',3000,1500,'ikat']],stock:['Pupuk NPK','Benih','Pestisida']},
 kebun:{items:[['Kopi biji (green bean)','Kopi',90000,65000,'kg'],['Jeruk','Buah',18000,11000,'kg'],['Kakao kering','Kakao',60000,45000,'kg']],stock:['Pupuk','Karung','Gunting panen']},
 tanamanHias:{items:[['Monstera pot 20','Tanaman',85000,45000,'pot'],['Bibit alpukat','Bibit',35000,15000,'polybag'],['Media tanam','Perlengkapan',15000,8000,'karung']],stock:['Pot plastik','Sekam','Pupuk']},
 olahan:{items:[['Keripik singkong 250 g','Camilan',15000,8000,'pak'],['Sambal botol','Bumbu',25000,13000,'botol'],['Kue kering toples','Kue',75000,42000,'toples']],stock:['Singkong','Minyak goreng','Kemasan']},
 konveksi:{items:[['Jahit kemeja','Jahit',150000,60000,'pcs'],['Kaos sablon per lusin','Produksi',720000,450000,'lusin'],['Permak celana','Jahit',25000,5000,'pcs']]},
 mebel:{items:[['Meja makan jati','Mebel',3500000,2300000,'set'],['Kursi rotan','Mebel',450000,280000,'pcs']]},
 air:{items:[['Isi ulang galon','Air',6000,2500,'galon'],['Galon baru + isi','Air',45000,35000,'galon']],stock:['Tutup galon','Segel','Filter']},
 bbm:{items:[['Pertalite eceran','BBM',12000,10500,'liter'],['Pertamax eceran','BBM',14500,12900,'liter']]},
 lpg:{items:[['LPG 3 kg','Gas',22000,19000,'tabung'],['Bright gas 5,5 kg','Gas',105000,95000,'tabung']]},
 ppob:{items:[['Pulsa 10.000','Pulsa',11500,10200,'transaksi'],['Token listrik 20.000','Token',22000,20300,'transaksi'],['Paket data 5 GB','Data',35000,31000,'transaksi']]},
 otomotif:{items:[['Helm standar','Aksesoris',250000,180000,'pcs'],['Oli mesin 1 L','Oli',55000,42000,'botol'],['Ban dalam','Suku cadang',35000,26000,'pcs']]}
};

const LINES=[];
const L=(id,label,category,engine,channel,x={})=>LINES.push({id,label,category,engine,channel,...x});

// Ritel & toko
L('warung','Warung / toko kelontong','ritel','toko','kasir',{samples:'warung',keywords:'sembako kelontong'});
L('minimarket','Minimarket / swalayan','ritel','toko','kasir',{samples:'minimarket',soon:['Scan barcode','Satuan bertingkat']});
L('toko-bangunan','Toko bangunan / material','ritel','toko','keduanya',{samples:'bangunan',keywords:'material semen'});
L('butik','Butik / toko pakaian','ritel','toko','keduanya',{samples:'pakaian',soon:['Varian ukuran & warna'],keywords:'baju fashion distro'});
L('toko-sepatu','Toko sepatu & tas','ritel','toko','keduanya',{samples:'pakaian',soon:['Varian ukuran & warna']});
L('toko-hp','Toko HP & elektronik','ritel','toko','keduanya',{samples:'elektronik',soon:['Nomor seri / IMEI'],keywords:'gadget handphone'});
L('apotek','Apotek / toko obat','ritel','toko','kasir',{samples:'apotek',soon:['Batch & kedaluwarsa'],keywords:'farmasi obat'});
L('toko-kosmetik','Toko kosmetik & skincare','ritel','toko','keduanya',{samples:'kosmetik',keywords:'kecantikan'});
L('toko-buku','Toko buku & ATK','ritel','toko','keduanya',{samples:'atk',keywords:'alat tulis fotokopi'});
L('toko-mainan','Toko mainan / hobi','ritel','toko','keduanya',{samples:'atk'});
L('toko-tani','Toko pertanian (saprotan)','ritel','toko','kasir',{samples:'tani',keywords:'pupuk bibit'});
L('toko-emas','Toko emas / perhiasan','ritel','toko','kasir',{samples:'emas'});
L('grosir','Grosir / distributor','ritel','toko','keduanya',{samples:'warung',soon:['Harga grosir bertingkat']});
L('reseller','Reseller / dropshipper','ritel','toko','online',{samples:'kosmetik'});
L('toko-online','Toko online','ritel','toko','online',{samples:'pakaian',keywords:'marketplace instagram whatsapp'});
L('frozen-food','Sembako & frozen food','ritel','toko','keduanya',{samples:'warung',soon:['Batch & kedaluwarsa']});
L('oleh-oleh','Toko oleh-oleh','ritel','toko','keduanya',{samples:'oleh',keywords:'suvenir'});
L('toko-hewan','Pet shop','ritel','toko','keduanya',{samples:'hewanPeliharaan',keywords:'kucing anjing pakan'});

// Makanan & minuman
L('kafe','Kafe / kedai kopi','kuliner','kafe','keduanya',{samples:'kafe',terms:T.menu,keywords:'coffee kopi'});
L('rumah-makan','Rumah makan / warteg','kuliner','kafe','kasir',{samples:'makan',terms:T.menu,keywords:'warung makan padang'});
L('restoran','Restoran','kuliner','kafe','keduanya',{samples:'makan',terms:T.menu,soon:['Pesan dari meja (QR)']});
L('angkringan','Angkringan / kaki lima','kuliner','kafe','kasir',{samples:'kantin',terms:T.menu,keywords:'pkl gerobak'});
L('katering','Katering','kuliner','jasa','online',{samples:'katering',terms:T.klien,keywords:'nasi box'});
L('bakery','Bakery / toko kue','kuliner','kafe','keduanya',{samples:'bakery',terms:T.menu,keywords:'roti'});
L('hampers','Kue kering & hampers','kuliner','kafe','online',{samples:'olahan',terms:T.menu,keywords:'lebaran parcel'});
L('minuman','Minuman kekinian / booth','kuliner','kafe','kasir',{samples:'kafe',terms:T.menu,keywords:'boba es'});
L('kantin','Kantin sekolah / kantor','kuliner','kafe','kasir',{samples:'kantin',terms:T.menu,soon:['Saldo siswa']});
L('cloud-kitchen','Dapur rumahan / cloud kitchen','kuliner','kafe','online',{samples:'makan',terms:T.menu});
L('meal-plan','Langganan makanan (meal plan)','kuliner','jasa','online',{samples:'katering',terms:T.klien,soon:['Tagihan berulang']});

// Jasa & layanan
L('jasa-umum','Jasa & usaha lain','jasa','jasa','kasir',{samples:'jasa'});
L('laundry','Laundry','jasa','kafe','keduanya',{samples:'laundry',terms:{...T.jasaKasir,antrian:'Cucian masuk'},keywords:'cuci baju kiloan'});
L('bengkel','Bengkel motor / mobil','jasa','toko','kasir',{samples:'bengkel',terms:{produk:'Jasa & suku cadang',item:'jasa atau suku cadang'}});
L('cuci-kendaraan','Cuci motor / mobil','jasa','kafe','kasir',{samples:'cuci',terms:{...T.jasaKasir,antrian:'Antrian cuci'},keywords:'carwash'});
L('salon','Salon / barbershop','jasa','kafe','keduanya',{samples:'salon',terms:T.jasaKasir,soon:['Booking jadwal','Komisi karyawan'],keywords:'pangkas rambut'});
L('spa','Spa / pijat / bekam','jasa','kafe','keduanya',{samples:'salon',terms:T.jasaKasir,soon:['Booking jadwal']});
L('servis-elektronik','Servis HP / elektronik / AC','jasa','kafe','keduanya',{samples:'servis',terms:{...T.jasaKasir,antrian:'Barang servis'},keywords:'reparasi'});
L('fotografi','Fotografi / videografi','jasa','jasa','online',{samples:'foto',terms:T.klien});
L('percetakan','Percetakan / sablon','jasa','jasa','keduanya',{samples:'cetak',terms:T.klien,keywords:'printing'});
L('penjahit','Penjahit / permak','jasa','jasa','kasir',{samples:'konveksi'});
L('konsultan','Konsultan / freelancer / agensi','jasa','jasa','online',{samples:'jasa',terms:T.klien});
L('kebersihan','Jasa kebersihan / tukang','jasa','jasa','online',{samples:'jasa',terms:T.klien,keywords:'cleaning service renovasi'});
L('ekspedisi','Jasa titip / kurir lokal','jasa','jasa','keduanya',{samples:'jasa',soon:['Resi & ongkir']});
L('biro-jasa','Notaris / biro jasa','jasa','jasa','online',{samples:'jasa',terms:T.klien});
L('kursus-mengemudi','Kursus mengemudi','jasa','jasa','keduanya',{samples:'sekolah',terms:T.siswa});

// Sewa & properti
L('kos','Kos-kosan / kontrakan','sewa','jasa','online',{samples:'kos',terms:T.penghuni,soon:['Tagihan berulang otomatis']});
L('homestay','Homestay / villa / guest house','sewa','jasa','online',{samples:'kos',terms:{...T.penghuni,pelanggan:'Tamu'},soon:['Kalender kamar']});
L('rental-kendaraan','Rental motor / mobil','sewa','jasa','keduanya',{samples:'rental',terms:T.penyewa,soon:['Kalender ketersediaan']});
L('sewa-alat','Sewa alat pesta / tenda / sound','sewa','jasa','keduanya',{samples:'sewaAlat',terms:T.penyewa,soon:['Kalender ketersediaan']});
L('sewa-outdoor','Sewa alat outdoor / kamera','sewa','jasa','keduanya',{samples:'sewaAlat',terms:T.penyewa});
L('lapangan','Lapangan futsal / badminton','sewa','kafe','keduanya',{samples:'lapangan',terms:{...T.jasaKasir,antrian:'Pemesanan'},soon:['Booking per jam']});
L('gedung','Gedung / aula / ruang meeting','sewa','jasa','online',{samples:'sewaAlat',terms:T.penyewa,soon:['Kalender ketersediaan']});
L('coworking','Coworking space','sewa','kafe','keduanya',{samples:'gym',terms:T.jasaKasir});
L('rental-ps','Rental PS / warnet','sewa','kafe','kasir',{samples:'lapangan',terms:T.jasaKasir,soon:['Billing per jam']});
L('sewa-kostum','Sewa kostum / baju adat','sewa','jasa','keduanya',{samples:'sewaAlat',terms:T.penyewa});

// Event, tiket & pendaftaran
L('seminar','Seminar / workshop / pelatihan','event','jasa','online',{samples:'tiket',terms:T.peserta,soon:['Formulir pendaftaran','E-tiket QR & check-in','Sertifikat']});
L('webinar','Webinar / kelas online','event','jasa','online',{samples:'tiket',terms:T.peserta,soon:['Formulir pendaftaran','Sertifikat']});
L('konser','Konser / pertunjukan / pameran','event','toko','keduanya',{samples:'tiket',terms:T.tiket,modules:['dashboard','kasir','produk','riwayat','pengeluaran','laporan'],soon:['Kuota tiket','Scan tiket di pintu']});
L('lomba','Lomba / kompetisi','event','jasa','online',{samples:'lomba',terms:T.peserta,soon:['Formulir pendaftaran','Unggah berkas']});
L('fun-run','Fun run / lari / gowes','event','jasa','online',{samples:'lari',terms:{...T.peserta,layanan:'Kategori lomba'},soon:['Ukuran jersey & nomor BIB','E-tiket QR & check-in']});
L('turnamen','Turnamen olahraga / e-sport','event','jasa','online',{samples:'lomba',terms:T.peserta});
L('bazar','Bazar / festival / expo','event','toko','keduanya',{samples:'tiket',terms:T.tiket,modules:['dashboard','kasir','produk','riwayat','pengeluaran','laporan'],soon:['Sewa booth tenant']});
L('pernikahan','Pernikahan / acara keluarga','event','jasa','online',{samples:'tiket',terms:{...T.peserta,pelanggan:'Tamu',invoice:'Undangan'},soon:['RSVP & check-in QR']});
L('reuni','Reuni / gathering komunitas','event','jasa','online',{samples:'tiket',terms:T.peserta});
L('pentas-sekolah','Wisuda / pentas sekolah','event','toko','keduanya',{samples:'tiket',terms:T.tiket,modules:['dashboard','kasir','produk','riwayat','pengeluaran','laporan']});
L('event-organizer','Event organizer','event','jasa','online',{samples:'foto',terms:T.klien});
L('teater','Bioskop mini / teater komunitas','event','toko','keduanya',{samples:'tiket',terms:T.tiket,modules:['dashboard','kasir','produk','riwayat','pengeluaran','laporan'],soon:['Kursi bernomor']});
L('volunteer','Pendaftaran volunteer','event','jasa','online',{samples:'lomba',terms:{...T.peserta,pelanggan:'Relawan'},soon:['Formulir pendaftaran']});

// Wisata & transportasi
L('tempat-wisata','Tempat wisata / kolam renang','wisata','toko','keduanya',{samples:'wisata',terms:T.tiket,modules:['dashboard','kasir','produk','riwayat','pengeluaran','laporan'],soon:['Kuota harian','Scan tiket']});
L('desa-wisata','Desa wisata / outbound','wisata','jasa','online',{samples:'wisata',terms:T.peserta});
L('travel-umrah','Travel umrah / haji / tour','wisata','jasa','online',{samples:'travel',terms:{...T.peserta,pelanggan:'Jamaah'},soon:['Cicilan & dokumen']});
L('travel','Travel antar kota / shuttle','wisata','toko','keduanya',{samples:'travel',terms:T.tiket,modules:['dashboard','kasir','produk','riwayat','pengeluaran','laporan'],soon:['Kursi bernomor & manifest']});
L('penyeberangan','Kapal / penyeberangan kecil','wisata','toko','kasir',{samples:'travel',terms:T.tiket,modules:['dashboard','kasir','produk','riwayat','pengeluaran','laporan']});
L('parkir','Parkir','wisata','toko','kasir',{samples:'parkir',terms:{kasir:'Karcis parkir',produk:'Tarif parkir',item:'tarif'},modules:['dashboard','kasir','produk','riwayat','pengeluaran','laporan']});
L('antar-jemput','Ojek / antar jemput sekolah','wisata','jasa','online',{samples:'rental',terms:{...T.klien,pelanggan:'Penumpang'},soon:['Tagihan berulang']});

// Pendidikan
L('bimbel','Bimbel / les privat','pendidikan','jasa','keduanya',{samples:'sekolah',terms:T.siswa,soon:['Tagihan SPP otomatis','Absensi siswa']});
L('kursus','Kursus musik / bahasa / komputer','pendidikan','jasa','keduanya',{samples:'sekolah',terms:T.siswa});
L('tpq','TPA / TPQ','pendidikan','jasa','kasir',{samples:'sekolah',terms:{...T.siswa,pelanggan:'Santri'}});
L('paud','PAUD / TK / sekolah swasta','pendidikan','jasa','keduanya',{samples:'sekolah',terms:T.siswa,soon:['Tagihan SPP otomatis']});
L('pesantren','Pondok pesantren','pendidikan','jasa','keduanya',{samples:'sekolah',terms:{...T.siswa,pelanggan:'Santri'},soon:['Uang saku santri']});
L('kursus-online','Kursus online / produk digital','pendidikan','toko','online',{samples:'sekolah',terms:{produk:'Produk digital',item:'produk digital'},modules:['dashboard','kasir','produk','riwayat','pengeluaran','laporan']});
L('ppdb','Penerimaan siswa baru (PPDB)','pendidikan','jasa','online',{samples:'sekolah',terms:{...T.peserta,pelanggan:'Calon siswa',layanan:'Jalur pendaftaran'},soon:['Formulir & unggah berkas']});

// Kesehatan & kebugaran
L('klinik','Klinik / praktik dokter','kesehatan','kafe','keduanya',{samples:'klinik',terms:T.pasien});
L('bidan','Bidan / terapis / fisioterapi','kesehatan','kafe','keduanya',{samples:'klinik',terms:T.pasien,soon:['Booking jadwal']});
L('klinik-gigi','Klinik gigi / kecantikan','kesehatan','kafe','keduanya',{samples:'klinik',terms:T.pasien,soon:['Booking jadwal']});
L('optik','Optik','kesehatan','toko','kasir',{samples:'kosmetik',terms:{produk:'Frame & lensa',item:'frame atau lensa'}});
L('klinik-hewan','Klinik hewan / grooming','kesehatan','kafe','keduanya',{samples:'hewanPeliharaan',terms:T.pasien});
L('gym','Gym / fitness / yoga','kesehatan','kafe','keduanya',{samples:'gym',terms:{...T.jasaKasir,antrian:'Check-in'},soon:['Member bulanan otomatis']});

// Rumah ibadah & sosial
L('masjid','Masjid / musala','ibadah','toko','keduanya',{samples:'dana',terms:T.dana,modules:['dashboard','kasir','produk','riwayat','pengeluaran','laporan'],soon:['Laporan transparan untuk jamaah','Donasi online'],keywords:'infak jamaah'});
L('zis','Lembaga zakat, infak, sedekah','ibadah','toko','online',{samples:'dana',terms:T.dana,modules:['dashboard','kasir','produk','riwayat','pengeluaran','laporan'],soon:['Dana terpisah','Data muzaki & mustahik']});
L('kurban','Kurban','ibadah','toko','keduanya',{samples:'kurban',terms:{...T.dana,produk:'Hewan kurban',item:'hewan kurban'},modules:['dashboard','kasir','produk','hutang','riwayat','pengeluaran','laporan'],soon:['Peserta per hewan']});
L('rumah-ibadah','Gereja / pura / vihara / klenteng','ibadah','toko','keduanya',{samples:'dana',terms:T.dana,modules:['dashboard','kasir','produk','riwayat','pengeluaran','laporan'],keywords:'persembahan kolekte'});
L('yayasan','Yayasan / panti asuhan','ibadah','toko','online',{samples:'dana',terms:T.dana,modules:['dashboard','kasir','produk','riwayat','pengeluaran','laporan'],soon:['Donatur rutin','Laporan penggunaan dana']});
L('galang-dana','Galang dana sosial','ibadah','toko','online',{samples:'dana',terms:T.dana,modules:['dashboard','kasir','produk','riwayat','pengeluaran','laporan'],soon:['Target & progres dana']});
L('majelis-taklim','Majelis taklim / pengajian','ibadah','jasa','kasir',{samples:'iuran',terms:T.iuran});
L('komunitas','Komunitas / organisasi / alumni','ibadah','jasa','online',{samples:'iuran',terms:T.iuran});
L('arisan','Arisan','ibadah','jasa','kasir',{samples:'arisan',terms:{...T.iuran,layanan:'Setoran arisan'},soon:['Putaran & pemenang']});

// Desa, lingkungan & koperasi
L('rt-rw','RT / RW','desa','jasa','online',{samples:'iuran',terms:T.warga,soon:['Tagihan berulang otomatis','Laporan kas untuk warga']});
L('perumahan','Perumahan / IPL / apartemen','desa','jasa','online',{samples:'iuran',terms:{...T.warga,pelanggan:'Penghuni'},soon:['Tagihan berulang otomatis']});
L('bumdes','BUMDes','desa','toko','keduanya',{samples:'warung',soon:['Banyak unit usaha']});
L('koperasi-simpan-pinjam','Koperasi simpan pinjam','desa','jasa','kasir',{samples:'koperasi',terms:T.anggotaKop,soon:['Simpanan & pinjaman anggota','SHU']});
L('koperasi-konsumen','Koperasi konsumen / sekolah','desa','toko','kasir',{samples:'minimarket',soon:['Belanja anggota & SHU']});
L('bank-sampah','Bank sampah','desa','toko','kasir',{samples:'sampah',terms:T.sampah,soon:['Saldo nasabah']});
L('posyandu','Posyandu','desa','jasa','kasir',{samples:'iuran',terms:{...T.warga,pelanggan:'Peserta posyandu'}});
L('karang-taruna','Karang taruna / PKK','desa','jasa','online',{samples:'iuran',terms:T.iuran});

// Peternakan & perikanan
L('ayam-petelur','Ayam petelur','ternak','toko','keduanya',{samples:'unggas',terms:T.hewan,soon:['Produksi telur harian']});
L('ayam-broiler','Ayam broiler','ternak','toko','kasir',{samples:'unggas',terms:T.hewan,soon:['Siklus panen & FCR']});
L('kambing','Kambing / domba','ternak','toko','keduanya',{samples:'ternak',terms:T.hewan,soon:['Data per ekor','Catatan kawin & kelahiran']});
L('sapi','Sapi potong / perah','ternak','toko','keduanya',{samples:'sapi',terms:T.hewan,soon:['Data per ekor','Produksi susu harian']});
L('ikan','Budidaya ikan (lele, nila, gurame)','ternak','toko','keduanya',{samples:'ikan',terms:T.ikan,soon:['Siklus tebar & panen']});
L('tambak','Udang / tambak','ternak','toko','kasir',{samples:'ikan',terms:T.ikan,soon:['Siklus tebar & panen']});
L('hewan-hias','Burung / kelinci / hewan hias','ternak','toko','keduanya',{samples:'hewanPeliharaan',terms:T.hewan});
L('lebah','Lebah madu','ternak','toko','keduanya',{samples:'olahan',terms:T.hewan});
L('agen-susu-telur','Agen susu / telur','ternak','toko','keduanya',{samples:'unggas',terms:T.hewan,soon:['Pelanggan langganan']});

// Pertanian & perkebunan
L('sawah','Sawah / palawija','tani','toko','kasir',{samples:'panen',terms:T.panen,soon:['Musim tanam & biaya per lahan']});
L('hortikultura','Sayur / hortikultura / hidroponik','tani','toko','keduanya',{samples:'panen',terms:T.panen});
L('kebun','Kebun buah / kopi / kakao','tani','toko','keduanya',{samples:'kebun',terms:T.panen});
L('sawit','Sawit / karet','tani','toko','kasir',{samples:'kebun',terms:T.panen});
L('pengepul','Pengepul hasil bumi','tani','toko','kasir',{samples:'panen',terms:T.panen,soon:['Pembelian dari petani']});
L('penggilingan','Penggilingan padi','tani','toko','kasir',{samples:'panen',terms:{...T.panen,produk:'Jasa giling & hasil'}});
L('tanaman-hias','Pembibitan / tanaman hias','tani','toko','keduanya',{samples:'tanamanHias',terms:{produk:'Tanaman & bibit',item:'tanaman'}});

// Produksi & UMKM olahan
L('olahan-makanan','Olahan makanan (keripik, sambal, kue)','produksi','toko','keduanya',{samples:'olahan',soon:['Resep & batch produksi']});
L('konveksi','Konveksi / garmen','produksi','jasa','keduanya',{samples:'konveksi',terms:T.klien});
L('mebel','Mebel / kerajinan','produksi','jasa','online',{samples:'mebel',terms:T.klien});
L('depot-air','Depot air isi ulang','produksi','toko','kasir',{samples:'air',soon:['Pelanggan langganan']});
L('skincare-rumahan','Sabun / skincare rumahan','produksi','toko','keduanya',{samples:'kosmetik',soon:['Batch & kedaluwarsa']});
L('batik','Batik / tenun','produksi','toko','keduanya',{samples:'pakaian'});

// Otomotif, energi & layanan digital
L('pertamini','Pertamini / BBM eceran','energi','toko','kasir',{samples:'bbm'});
L('pangkalan-lpg','Agen / pangkalan LPG','energi','toko','kasir',{samples:'lpg'});
L('ppob','Pulsa / PPOB / agen bank','energi','toko','kasir',{samples:'ppob',keywords:'token listrik brilink'});
L('showroom','Jual beli motor bekas','energi','toko','keduanya',{samples:'otomotif',soon:['Unit per nomor rangka']});
L('sparepart','Suku cadang & aksesoris','energi','toko','keduanya',{samples:'otomotif',soon:['Scan barcode']});

const byId=new Map(LINES.map(l=>[l.id,l]));
const DEFAULT_LINE={toko:'warung',kafe:'kafe',jasa:'jasa-umum',all:'warung'};

// Fitur bawaan per lini. Istilah menu fitur bisa disesuaikan per lini.
const LINE_FEATURES={
 tagihan:['kos','homestay','meal-plan','bimbel','kursus','tpq','paud','pesantren','rt-rw','perumahan','majelis-taklim','komunitas','karang-taruna','koperasi-simpan-pinjam','gym','antar-jemput','arisan','posyandu','agen-susu-telur','depot-air','kursus-mengemudi'],
 booking:['salon','spa','lapangan','gedung','rental-kendaraan','sewa-alat','sewa-outdoor','sewa-kostum','homestay','bidan','klinik-gigi','klinik','klinik-hewan','fotografi','kebersihan','coworking','rental-ps','kursus-mengemudi','cuci-kendaraan','restoran'],
 event:['seminar','webinar','konser','lomba','fun-run','turnamen','bazar','pernikahan','reuni','pentas-sekolah','event-organizer','teater','volunteer','tempat-wisata','desa-wisata','travel-umrah','travel','penyeberangan','ppdb'],
 donasi:['masjid','zis','rumah-ibadah','yayasan','galang-dana','kurban','rt-rw','perumahan','komunitas','majelis-taklim','karang-taruna','bumdes'],
 ternak:['kambing','sapi','hewan-hias','kurban'],
 siklus:['ayam-petelur','ayam-broiler','ikan','tambak','sawah','hortikultura','kebun','sawit','lebah','sapi'],
 anggota:['koperasi-simpan-pinjam','koperasi-konsumen','bank-sampah','kantin','pesantren','arisan','kurban','zis'],
 komisi:['salon','spa','bengkel','cuci-kendaraan','servis-elektronik','klinik-gigi','grosir','showroom'],
 produksi:['bakery','hampers','olahan-makanan','skincare-rumahan','katering','apotek','frozen-food','cloud-kitchen','depot-air','lebah'],
 barcode:['minimarket','apotek','toko-buku','sparepart','toko-kosmetik','grosir','koperasi-konsumen','toko-mainan'],
 varian:['butik','toko-sepatu','batik','toko-hp']
};
const FEATURE_TERMS={'bank-sampah':{anggota:'Nasabah & saldo'},kantin:{anggota:'Saldo siswa'},pesantren:{anggota:'Uang saku santri'},arisan:{anggota:'Peserta arisan'},kurban:{anggota:'Peserta kurban'},zis:{anggota:'Muzaki & mustahik'},masjid:{donasi:'Laporan jamaah'},'rt-rw':{donasi:'Laporan kas warga'},perumahan:{donasi:'Laporan kas warga'}};
// Rencana yang sudah terwujud lewat fitur di atas tidak lagi ditampilkan sebagai "menyusul".
const BUILT=/barcode|varian|batch|kedaluwarsa|tagihan|booking|kalender|e-tiket|check-in|formulir|sertifikat|kuota|scan tiket|donasi|laporan transparan|laporan kas|laporan penggunaan|data per ekor|kawin|siklus|produksi|musim tanam|simpanan|saldo|komisi|resep|member bulanan|pesan dari meja|pelanggan langganan|dana terpisah|muzaki|peserta per hewan|uang saku|rsvp|ukuran jersey/i;
for(const [feature,ids]of Object.entries(LINE_FEATURES))for(const id of ids){const line=byId.get(id);if(!line)continue;(line.features||=[]).push(feature);}
for(const line of LINES){if(FEATURE_TERMS[line.id])line.terms={...(line.terms||{}),...FEATURE_TERMS[line.id]};if(line.soon)line.soon=line.soon.filter(s=>!BUILT.test(s));if(!line.soon?.length)delete line.soon;}

function get(id){return byId.get(id)||null;}
function resolve(id,type){return byId.get(id)||byId.get(DEFAULT_LINE[type]||'warung');}
function channel(value,line){return CHANNELS[value]?value:(line?.channel||'kasir');}
function terms(line){
 const base=ENGINES[line.engine]||ENGINES.toko,out={};
 for(const [k,m]of Object.entries(MODULES))out[k]=m[2];
 Object.assign(out,base.terms,line.terms||{});
 out.pelangganKecil=out.pelanggan.toLowerCase();out.pembayaranKecil=out.pembayaran.toLowerCase();
 out.steps=(out.steps||[]).map(s=>s.replace(/\{(\w+)\}/g,(_,k)=>out[k]??''));
 return out;
}
// Fitur aktif = bawaan lini + etalase bila jualan online + pilihan pengguna (on/off).
function features(line,channel,choice={}){const out=new Set(line.features||[]);if(channel&&channel!=='kasir')out.add('pesanan');for(const f of choice.on||[])if(FEATURES[f])out.add(f);for(const f of choice.off||[])out.delete(f);for(const f of [...out])if(FEATURES[f]?.pos&&line.engine==='jasa')out.delete(f);return Object.keys(FEATURES).filter(f=>out.has(f));}
function modules(line,active=[]){const base=line.modules||(ENGINES[line.engine]||ENGINES.toko).modules,at=Math.max(0,base.indexOf('pengeluaran'));return [...base.slice(0,at),...active,...base.slice(at)];}
function menu(line,active=[]){
 const t=terms(line),reports=['profit','revenue',...(line.engine==='jasa'?[]:['posmonthly'])],seen=new Set();
 return modules(line,active).map(id=>{const routes=(id==='laporan'?reports:MODULES[id][0]).filter(r=>!seen.has(r));routes.forEach(r=>seen.add(r));return [t[id]||MODULES[id][2],routes,MODULES[id][1]];}).filter(g=>g[1].length);
}
function titles(line){
 const t=terms(line);
 return {poscashier:t.kasir,posproducts:t.produk,posqueue:t.antrian,poshistory:t.riwayat,posdebt:t.hutang,invoices:t.invoice,products:t.layanan,customers:t.pelanggan,payments:t.pembayaran,expenses:t.pengeluaran};
}
function samples(line){return S[line?.samples]||null;}
function category(id){return CATEGORIES.find(c=>c[0]===id)?.[1]||'';}
function search(q){
 const words=String(q||'').toLowerCase().split(/\s+/).filter(Boolean);
 if(!words.length)return LINES;
 return LINES.filter(l=>{const hay=(l.label+' '+category(l.category)+' '+(l.keywords||'')).toLowerCase();return words.every(w=>hay.includes(w));});
}

const api={CATEGORIES,CHANNELS,MODULES,FEATURES,ENGINES,LINES,DEFAULT_LINE,get,resolve,channel,features,terms,modules,menu,titles,samples,category,search};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MARALA_LINES=api;
})(typeof window!=='undefined'?window:globalThis);
