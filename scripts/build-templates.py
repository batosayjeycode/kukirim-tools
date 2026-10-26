"""Generate the free spreadsheet templates in public/downloads/.

Usage:  python3 scripts/build-templates.py   (requires openpyxl)

The .xlsx files are committed; rerun this only when changing a template.
Formulas use only functions supported by Excel, Google Sheets, and LibreOffice
(SUMIFS, COUNTIF, COUNTIFS, DATE, IF). Sample data is fictitious.
"""

from datetime import date, datetime
from pathlib import Path

from openpyxl import Workbook
from openpyxl.formatting.rule import FormulaRule
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation

OUT = Path(__file__).resolve().parent.parent / "public" / "downloads"
FIXED_TIME = datetime(2026, 10, 26)  # keeps file metadata stable between runs

MONEY = '"Rp"#,##0;-"Rp"#,##0'
DATE_FMT = "dd/mm/yyyy"
HEADER_FILL = PatternFill("solid", fgColor="0B6E4F")
HEADER_FONT = Font(bold=True, color="FFFFFF")
INPUT_FILL = PatternFill("solid", fgColor="FFF8DC")
TITLE_FONT = Font(bold=True, size=14)
BOLD = Font(bold=True)
WRAP = Alignment(wrap_text=True, vertical="top")

MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli",
          "Agustus", "September", "Oktober", "November", "Desember"]

CHANNELS = ["Shopee", "Tokopedia", "TikTok Shop", "WhatsApp", "Instagram", "Toko offline", "Lainnya"]


def new_workbook():
    wb = Workbook()
    wb.properties.creator = "Kukirim Tools"
    wb.properties.created = FIXED_TIME
    wb.properties.modified = FIXED_TIME
    return wb


def header_row(ws, row, headers, widths=None):
    for col, text in enumerate(headers, start=1):
        cell = ws.cell(row=row, column=col, value=text)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(vertical="center", wrap_text=True)
    if widths:
        for col, width in enumerate(widths, start=1):
            ws.column_dimensions[ws.cell(row=1, column=col).column_letter].width = width


def instructions(ws, title, lines):
    ws.title = "Petunjuk"
    ws.column_dimensions["A"].width = 110
    ws["A1"] = title
    ws["A1"].font = TITLE_FONT
    for i, line in enumerate(lines, start=3):
        cell = ws.cell(row=i, column=1, value=line)
        cell.alignment = WRAP
        if line and not line.startswith(("-", "•")) and line.endswith(":"):
            cell.font = BOLD


def list_validation(ws, formula, cell_range, prompt):
    dv = DataValidation(type="list", formula1=formula, allow_blank=True)
    dv.error = "Pilih dari daftar, atau tambahkan pilihan baru di sheet daftar."
    dv.errorTitle = "Pilihan tidak ada di daftar"
    dv.prompt = prompt
    dv.showErrorMessage = True
    ws.add_data_validation(dv)
    dv.add(cell_range)


# ---------------------------------------------------------------------------
# Template 1: pembukuan (bookkeeping)
# ---------------------------------------------------------------------------

TX_ROWS = 2000  # rows covered by formulas and validation
CATEGORIES = ["Penjualan", "Pendapatan lain", "Pembelian stok", "Biaya marketplace", "Ongkir",
              "Kemasan", "Iklan & promosi", "Gaji", "Sewa & utilitas", "Lain-lain"]

SAMPLE_TX = [
    (date(2026, 9, 2), "Pengeluaran", "Pembelian stok", "Beli 50 pcs kaos polos", "Lainnya", 1_750_000),
    (date(2026, 9, 3), "Pengeluaran", "Kemasan", "Polymailer 100 pcs", "Lainnya", 85_000),
    (date(2026, 9, 5), "Pemasukan", "Penjualan", "Pencairan penjualan minggu 1", "Shopee", 1_240_000),
    (date(2026, 9, 6), "Pemasukan", "Penjualan", "5 pesanan via chat", "WhatsApp", 475_000),
    (date(2026, 9, 12), "Pengeluaran", "Iklan & promosi", "Iklan toko", "Shopee", 150_000),
    (date(2026, 9, 15), "Pemasukan", "Penjualan", "Pencairan penjualan minggu 2", "Tokopedia", 980_000),
    (date(2026, 9, 20), "Pengeluaran", "Ongkir", "Subsidi ongkir pesanan chat", "WhatsApp", 60_000),
    (date(2026, 9, 30), "Pengeluaran", "Sewa & utilitas", "Internet bulan September", "Lainnya", 300_000),
    (date(2026, 10, 1), "Pengeluaran", "Pembelian stok", "Restock 30 pcs", "Lainnya", 1_050_000),
    (date(2026, 10, 4), "Pemasukan", "Penjualan", "Pencairan penjualan minggu 1", "Shopee", 1_530_000),
    (date(2026, 10, 8), "Pemasukan", "Penjualan", "Bazar akhir pekan", "Toko offline", 640_000),
    (date(2026, 10, 10), "Pengeluaran", "Kemasan", "Lakban dan kardus", "Lainnya", 45_000),
]


def build_bookkeeping():
    wb = new_workbook()
    instructions(wb.active, "Template Pembukuan Online Shop — Kukirim Tools", [
        "Template sederhana untuk mencatat pemasukan dan pengeluaran toko online, lalu melihat laba per bulan.",
        "",
        "Cara pakai:",
        "1. Buka sheet Kategori. Sesuaikan daftar kategori dan channel penjualan dengan toko Anda.",
        "2. Hapus contoh data (fiktif) di sheet Transaksi, mulai dari baris 2.",
        "3. Catat setiap transaksi: satu baris per pemasukan atau pengeluaran. Kolom berwarna krem adalah isian.",
        "4. Buka sheet Ringkasan dan isi tahun di sel B2. Ringkasan bulanan dan per kategori terisi otomatis.",
        "",
        "Kolom di sheet Transaksi:",
        "- Tanggal: tanggal uang masuk atau keluar (format hari/bulan/tahun).",
        "- Jenis: Pemasukan atau Pengeluaran.",
        "- Kategori: pilih dari daftar di sheet Kategori.",
        "- Keterangan: catatan singkat, misalnya nama barang atau periode pencairan.",
        "- Channel: sumber penjualan atau tempat biaya terjadi (opsional).",
        "- Jumlah: nilai dalam rupiah, selalu angka positif. Jenis menentukan apakah ini masuk atau keluar.",
        "",
        "Catatan:",
        f"- Rumus ringkasan membaca sampai baris {TX_ROWS + 1} di sheet Transaksi.",
        "- Untuk penjualan marketplace, catat jumlah yang benar-benar dicairkan ke rekening Anda, "
        "atau catat penjualan kotor dan biaya marketplace secara terpisah. Pilih satu cara dan konsisten.",
        "- Template ini tidak terhubung dengan marketplace mana pun. Semua data diisi manual.",
        "- Ringkasan ini adalah catatan sederhana, bukan laporan keuangan resmi atau perhitungan pajak.",
        "",
        "Google Sheets: unggah file ini ke Google Drive, lalu buka dengan Google Sheets (atau File > Impor).",
        "Dibuat oleh Kukirim Tools (tools.kukirim.com).",
    ])

    # Kategori
    ws = wb.create_sheet("Kategori")
    header_row(ws, 1, ["Kategori", "Channel"], [26, 20])
    for i, name in enumerate(CATEGORIES, start=2):
        ws.cell(row=i, column=1, value=name).fill = INPUT_FILL
    for i, name in enumerate(CHANNELS, start=2):
        ws.cell(row=i, column=2, value=name).fill = INPUT_FILL
    ws["D1"] = "Tambahkan atau ubah isi kolom A dan B (maksimal 30 baris)."
    ws.freeze_panes = "A2"

    # Transaksi
    ws = wb.create_sheet("Transaksi", 1)
    header_row(ws, 1, ["Tanggal", "Jenis", "Kategori", "Keterangan", "Channel", "Jumlah (Rp)"],
               [13, 14, 20, 36, 16, 16])
    for r, row in enumerate(SAMPLE_TX, start=2):
        for c, value in enumerate(row, start=1):
            ws.cell(row=r, column=c, value=value)
    last = TX_ROWS + 1
    for r in range(2, last + 1):
        ws.cell(row=r, column=1).number_format = DATE_FMT
        ws.cell(row=r, column=6).number_format = MONEY
    list_validation(ws, '"Pemasukan,Pengeluaran"', f"B2:B{last}", "Pemasukan atau Pengeluaran")
    list_validation(ws, "=Kategori!$A$2:$A$31", f"C2:C{last}", "Pilih kategori")
    list_validation(ws, "=Kategori!$B$2:$B$31", f"E2:E{last}", "Pilih channel")
    amount = DataValidation(type="decimal", operator="greaterThanOrEqual", formula1="0", allow_blank=True)
    amount.error = "Jumlah harus angka 0 atau lebih. Pilih Jenis untuk menandai pengeluaran."
    amount.showErrorMessage = True
    ws.add_data_validation(amount)
    amount.add(f"F2:F{last}")
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:F{last}"

    # Ringkasan
    ws = wb.create_sheet("Ringkasan", 2)
    ws.column_dimensions["A"].width = 22
    for col in "BCDE":
        ws.column_dimensions[col].width = 18
    ws["A1"] = "Ringkasan"
    ws["A1"].font = TITLE_FONT
    ws["A2"] = "Tahun"
    ws["A2"].font = BOLD
    ws["B2"] = 2026
    ws["B2"].fill = INPUT_FILL

    rng = lambda col: f"Transaksi!${col}$2:${col}${last}"  # noqa: E731
    header_row(ws, 4, ["Bulan", "Pemasukan", "Pengeluaran", "Laba bersih", "Margin"])
    for i, month in enumerate(MONTHS, start=1):
        r = 4 + i
        start, end = f"DATE($B$2,{i},1)", f"DATE($B$2,{i + 1},1)"
        period = f'{rng("A")},">="&{start},{rng("A")},"<"&{end}'
        ws.cell(row=r, column=1, value=month)
        ws.cell(row=r, column=2, value=f'=SUMIFS({rng("F")},{rng("B")},"Pemasukan",{period})')
        ws.cell(row=r, column=3, value=f'=SUMIFS({rng("F")},{rng("B")},"Pengeluaran",{period})')
        ws.cell(row=r, column=4, value=f"=B{r}-C{r}")
        ws.cell(row=r, column=5, value=f'=IF(B{r}>0,D{r}/B{r},"")')
    total = 17
    ws.cell(row=total, column=1, value="Total").font = BOLD
    for col in "BCD":
        ws[f"{col}{total}"] = f"=SUM({col}5:{col}16)"
        ws[f"{col}{total}"].font = BOLD
    ws[f"E{total}"] = f'=IF(B{total}>0,D{total}/B{total},"")'
    ws[f"E{total}"].font = BOLD
    for r in range(5, total + 1):
        for col in "BCD":
            ws[f"{col}{r}"].number_format = MONEY
        ws[f"E{r}"].number_format = "0.0%"
    ws["A18"] = "Margin = laba bersih ÷ pemasukan. Kosong jika belum ada pemasukan."

    header_row(ws, 20, ["Kategori", "Pemasukan", "Pengeluaran"])
    year = f'{rng("A")},">="&DATE($B$2,1,1),{rng("A")},"<"&DATE($B$2+1,1,1)'
    for i in range(30):
        r = 21 + i
        src = f"Kategori!$A${2 + i}"
        ws.cell(row=r, column=1, value=f'=IF({src}="","",{src})')
        for col, kind in (("B", "Pemasukan"), ("C", "Pengeluaran")):
            ws[f"{col}{r}"] = f'=IF($A{r}="","",SUMIFS({rng("F")},{rng("C")},$A{r},{rng("B")},"{kind}",{year}))'
            ws[f"{col}{r}"].number_format = MONEY

    wb.save(OUT / "template-pembukuan-online-shop.xlsx")


# ---------------------------------------------------------------------------
# Template 2: manajemen order (order management)
# ---------------------------------------------------------------------------

ORDER_ROWS = 1000
PAYMENT = ["Belum bayar", "Sudah bayar", "Refund"]
FULFILLMENT = ["Baru", "Dikemas", "Dikirim", "Diterima", "Retur", "Batal"]
COURIERS = ["JNE", "J&T", "SiCepat", "Pos Indonesia", "AnterAja", "Ninja Xpress", "Kurir toko", "Lainnya"]

SAMPLE_ORDERS = [
    (date(2026, 10, 20), "ORD-0001", "Shopee", "Kaos polos hitam L", 2, 75_000, "Sudah bayar", "Diterima", "JNE", "CONTOH0001", ""),
    (date(2026, 10, 21), "ORD-0002", "WhatsApp", "Kaos polos putih M", 1, 75_000, "Sudah bayar", "Dikirim", "J&T", "CONTOH0002", "Bungkus kado"),
    (date(2026, 10, 22), "ORD-0003", "Tokopedia", "Hoodie abu XL", 1, 185_000, "Sudah bayar", "Dikemas", "SiCepat", "", ""),
    (date(2026, 10, 23), "ORD-0004", "Instagram", "Kaos polos navy S", 3, 70_000, "Belum bayar", "Baru", "", "", "Menunggu transfer"),
    (date(2026, 10, 23), "ORD-0005", "TikTok Shop", "Topi bordir", 1, 55_000, "Sudah bayar", "Baru", "", "", ""),
    (date(2026, 10, 24), "ORD-0006", "Shopee", "Kaos polos hitam M", 1, 75_000, "Refund", "Batal", "", "", "Stok habis"),
]


def build_orders():
    wb = new_workbook()
    instructions(wb.active, "Template Manajemen Order — Kukirim Tools", [
        "Template untuk mencatat pesanan dari berbagai channel di satu tempat dan memantau mana yang perlu dikirim.",
        "",
        "Cara pakai:",
        "1. Sesuaikan pilihan channel, status, dan kurir di sheet Daftar.",
        "2. Hapus contoh data (fiktif) di sheet Order, mulai dari baris 2.",
        "3. Tambahkan satu baris per pesanan. Kolom Total terisi otomatis dari Jumlah × Harga satuan.",
        "4. Perbarui status pembayaran dan pengiriman setiap ada perubahan.",
        "5. Lihat sheet Ringkasan untuk jumlah pesanan per status dan per channel.",
        "",
        "Kolom di sheet Order:",
        "- Tanggal order, ID order (kode internal Anda, misalnya ORD-0001), Channel, Produk.",
        "- Jumlah dan Harga satuan: Total dihitung otomatis.",
        "- Status pembayaran: Belum bayar, Sudah bayar, atau Refund.",
        "- Status pengiriman: Baru, Dikemas, Dikirim, Diterima, Retur, atau Batal.",
        "- Kurir dan No. resi: isi setelah paket dikirim.",
        "- Catatan: permintaan khusus atau hal yang perlu diingat.",
        "",
        "Baris berwarna kuning: sudah dibayar tetapi belum dikirim (status Baru atau Dikemas).",
        "",
        "Catatan:",
        f"- Rumus Total dan Ringkasan mencakup sampai baris {ORDER_ROWS + 1}.",
        "- Template ini sengaja tidak memiliki kolom nama, alamat, atau nomor HP pelanggan. "
        "Simpan data pribadi pelanggan seperlunya dan hapus jika sudah tidak diperlukan.",
        "- Template ini tidak terhubung dengan marketplace atau kurir mana pun. Semua data diisi manual.",
        "",
        "Google Sheets: unggah file ini ke Google Drive, lalu buka dengan Google Sheets (atau File > Impor).",
        "Dibuat oleh Kukirim Tools (tools.kukirim.com).",
    ])

    # Daftar (lists)
    ws = wb.create_sheet("Daftar")
    lists = [("Channel", CHANNELS), ("Status pembayaran", PAYMENT), ("Status pengiriman", FULFILLMENT), ("Kurir", COURIERS)]
    header_row(ws, 1, [name for name, _ in lists], [18, 20, 20, 18])
    for c, (_, values) in enumerate(lists, start=1):
        for r, value in enumerate(values, start=2):
            ws.cell(row=r, column=c, value=value).fill = INPUT_FILL
    ws["F1"] = "Ubah atau tambahkan pilihan (maksimal 20 baris per kolom)."
    ws.freeze_panes = "A2"

    # Order
    ws = wb.create_sheet("Order", 1)
    header_row(ws, 1, ["Tanggal order", "ID order", "Channel", "Produk", "Jumlah", "Harga satuan", "Total",
                       "Status pembayaran", "Status pengiriman", "Kurir", "No. resi", "Catatan"],
               [13, 12, 14, 26, 9, 14, 14, 18, 18, 14, 18, 28])
    for r, row in enumerate(SAMPLE_ORDERS, start=2):
        values = row[:6] + (None,) + row[6:]
        for c, value in enumerate(values, start=1):
            if value not in (None, ""):
                ws.cell(row=r, column=c, value=value)
    last = ORDER_ROWS + 1
    for r in range(2, last + 1):
        ws.cell(row=r, column=1).number_format = DATE_FMT
        ws.cell(row=r, column=6).number_format = MONEY
        ws.cell(row=r, column=7, value=f'=IF(OR(E{r}="",F{r}=""),"",E{r}*F{r})').number_format = MONEY
    list_validation(ws, "=Daftar!$A$2:$A$21", f"C2:C{last}", "Pilih channel")
    list_validation(ws, "=Daftar!$B$2:$B$21", f"H2:H{last}", "Status pembayaran")
    list_validation(ws, "=Daftar!$C$2:$C$21", f"I2:I{last}", "Status pengiriman")
    list_validation(ws, "=Daftar!$D$2:$D$21", f"J2:J{last}", "Pilih kurir")
    qty = DataValidation(type="whole", operator="greaterThanOrEqual", formula1="1", allow_blank=True)
    qty.error = "Jumlah harus bilangan bulat 1 atau lebih."
    qty.showErrorMessage = True
    ws.add_data_validation(qty)
    qty.add(f"E2:E{last}")
    ws.conditional_formatting.add(
        f"A2:L{last}",
        FormulaRule(formula=['AND($H2="Sudah bayar",OR($I2="Baru",$I2="Dikemas"))'],
                    fill=PatternFill("solid", fgColor="FFF2A8")),
    )
    ws.freeze_panes = "C2"
    ws.auto_filter.ref = f"A1:L{last}"

    # Ringkasan
    ws = wb.create_sheet("Ringkasan", 2)
    ws.column_dimensions["A"].width = 26
    ws.column_dimensions["B"].width = 16
    ws.column_dimensions["C"].width = 18
    ws["A1"] = "Ringkasan Order"
    ws["A1"].font = TITLE_FONT
    o = lambda col: f"Order!${col}$2:${col}${last}"  # noqa: E731

    ws["A3"] = "Perlu dikirim"
    ws["A3"].font = BOLD
    ws["B3"] = f'=COUNTIFS({o("H")},"Sudah bayar",{o("I")},"Baru")+COUNTIFS({o("H")},"Sudah bayar",{o("I")},"Dikemas")'
    ws["C3"] = "Sudah dibayar, status Baru atau Dikemas"
    ws["A4"] = "Menunggu pembayaran"
    ws["A4"].font = BOLD
    ws["B4"] = f'=COUNTIFS({o("H")},"Belum bayar",{o("I")},"<>Batal")'

    def count_table(top, title, list_col, order_col):
        header_row(ws, top, [title, "Jumlah order"])
        for i in range(20):
            r = top + 1 + i
            src = f"Daftar!${list_col}${2 + i}"
            ws[f"A{r}"] = f'=IF({src}="","",{src})'
            ws[f"B{r}"] = f'=IF($A{r}="","",COUNTIF({o(order_col)},$A{r}))'
        return top + 22

    nxt = count_table(6, "Status pembayaran", "B", "H")
    nxt = count_table(nxt, "Status pengiriman", "C", "I")

    header_row(ws, nxt, ["Channel", "Jumlah order", "Total penjualan"])
    for i in range(20):
        r = nxt + 1 + i
        src = f"Daftar!$A${2 + i}"
        ws[f"A{r}"] = f'=IF({src}="","",{src})'
        ws[f"B{r}"] = f'=IF($A{r}="","",COUNTIF({o("C")},$A{r}))'
        ws[f"C{r}"] = f'=IF($A{r}="","",SUMIFS({o("G")},{o("C")},$A{r},{o("H")},"Sudah bayar"))'
        ws[f"C{r}"].number_format = MONEY
    ws[f"A{nxt + 22}"] = "Total penjualan hanya menghitung order berstatus Sudah bayar."

    wb.save(OUT / "template-manajemen-order.xlsx")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    build_bookkeeping()
    build_orders()
    for f in sorted(OUT.glob("*.xlsx")):
        print(f"{f.name}: {f.stat().st_size:,} bytes")
