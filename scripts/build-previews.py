#!/usr/bin/env python3
"""Generate the SVG previews in public/images/ shown on the template and label pages.

The spreadsheet previews use the same fictitious sample rows as scripts/build-templates.py;
re-run both after changing the sample data:  python3 scripts/build-previews.py
No dependencies beyond the standard library. Outputs are committed.
"""
from pathlib import Path
from xml.sax.saxutils import escape

OUT = Path(__file__).resolve().parent.parent / "public" / "images"
GREEN = "#0b6e4f"
FONT = "Arial, Helvetica, sans-serif"
ROW_H = 30


def text(x, y, value, size=13, weight="normal", fill="#1b2420", anchor="start"):
    return (f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{weight}" fill="{fill}" '
            f'text-anchor="{anchor}">{escape(str(value))}</text>')


def sheet(title, columns, rows, tabs, active, highlight=(), note=None):
    """columns: [(label, width, align)], rows: [[cell, ...]], highlight: row indexes filled yellow."""
    width = sum(w for _, w, _ in columns) + 2
    top = 44  # title bar
    table_h = ROW_H * (len(rows) + 1)
    note_h = 34 if note else 0
    height = top + table_h + note_h + 40
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" '
           f'font-family="{FONT}" role="img">',
           f'<rect width="{width}" height="{height}" rx="8" fill="#ffffff" stroke="#d5dcd8"/>',
           f'<rect width="{width}" height="{top}" rx="8" fill="#f2f5f3"/>',
           f'<rect y="{top - 8}" width="{width}" height="8" fill="#f2f5f3"/>',
           '<circle cx="18" cy="22" r="5" fill="#d5dcd8"/><circle cx="34" cy="22" r="5" fill="#d5dcd8"/>'
           '<circle cx="50" cy="22" r="5" fill="#d5dcd8"/>',
           text(70, 27, title, 14, "bold")]
    # header
    x, y = 1, top
    out.append(f'<rect x="1" y="{y}" width="{width - 2}" height="{ROW_H}" fill="{GREEN}"/>')
    for label, w, align in columns:
        tx, anchor = (x + w - 8, "end") if align == "right" else (x + 8, "start")
        out.append(text(tx, y + 20, label, 12, "bold", "#ffffff", anchor))
        x += w
    # rows
    for i, row in enumerate(rows):
        y = top + ROW_H * (i + 1)
        if i in highlight:
            out.append(f'<rect x="1" y="{y}" width="{width - 2}" height="{ROW_H}" fill="#fff2a8"/>')
        out.append(f'<line x1="1" y1="{y + ROW_H}" x2="{width - 1}" y2="{y + ROW_H}" stroke="#e3e8e5"/>')
        x = 1
        for (label, w, align), cell in zip(columns, row):
            tx, anchor = (x + w - 8, "end") if align == "right" else (x + 8, "start")
            out.append(text(tx, y + 20, cell, 12, anchor=anchor))
            x += w
    # column lines
    x = 1
    for _, w, _ in columns[:-1]:
        x += w
        out.append(f'<line x1="{x}" y1="{top + ROW_H}" x2="{x}" y2="{top + table_h}" stroke="#e3e8e5"/>')
    y = top + table_h
    if note:
        out.append(text(12, y + 22, note, 12, fill="#55615b"))
        y += note_h
    # sheet tabs
    tx = 8
    for tab in tabs:
        w = 16 + 7.5 * len(tab)
        is_active = tab == active
        out.append(f'<rect x="{tx}" y="{y + 8}" width="{w:.0f}" height="24" rx="4" '
                   f'fill="{"#ffffff" if is_active else "#f2f5f3"}" stroke="{GREEN if is_active else "#d5dcd8"}"/>')
        out.append(text(tx + 8, y + 25, tab, 12, "bold" if is_active else "normal", GREEN if is_active else "#55615b"))
        tx += w + 6
    out.append("</svg>")
    return "\n".join(out) + "\n", width, height


def rp(n):
    return "Rp" + f"{n:,}".replace(",", ".")


def bookkeeping():
    columns = [("Tanggal", 92, "left"), ("Jenis", 104, "left"), ("Kategori", 134, "left"),
               ("Keterangan", 228, "left"), ("Channel", 98, "left"), ("Jumlah (Rp)", 112, "right")]
    rows = [
        ("02/09/2026", "Pengeluaran", "Pembelian stok", "Beli 50 pcs kaos polos", "Lainnya", rp(1_750_000)),
        ("03/09/2026", "Pengeluaran", "Kemasan", "Polymailer 100 pcs", "Lainnya", rp(85_000)),
        ("05/09/2026", "Pemasukan", "Penjualan", "Pencairan penjualan minggu 1", "Shopee", rp(1_240_000)),
        ("06/09/2026", "Pemasukan", "Penjualan", "5 pesanan via chat", "WhatsApp", rp(475_000)),
        ("12/09/2026", "Pengeluaran", "Iklan & promosi", "Iklan toko", "Shopee", rp(150_000)),
        ("15/09/2026", "Pemasukan", "Penjualan", "Pencairan penjualan minggu 2", "Tokopedia", rp(980_000)),
    ]
    return sheet("template-pembukuan-online-shop.xlsx — Transaksi", columns, rows,
                 ["Petunjuk", "Transaksi", "Ringkasan", "Kategori"], "Transaksi",
                 note="Contoh data fiktif. Satu baris per pemasukan atau pengeluaran.")


def orders():
    columns = [("Tanggal", 92, "left"), ("ID order", 86, "left"), ("Channel", 98, "left"),
               ("Produk", 160, "left"), ("Total", 92, "right"), ("Pembayaran", 106, "left"),
               ("Pengiriman", 96, "left")]
    rows = [
        ("20/10/2026", "ORD-0001", "Shopee", "Kaos polos hitam L", rp(150_000), "Sudah bayar", "Diterima"),
        ("21/10/2026", "ORD-0002", "WhatsApp", "Kaos polos putih M", rp(75_000), "Sudah bayar", "Dikirim"),
        ("22/10/2026", "ORD-0003", "Tokopedia", "Hoodie abu XL", rp(185_000), "Sudah bayar", "Dikemas"),
        ("23/10/2026", "ORD-0004", "Instagram", "Kaos polos navy S", rp(210_000), "Belum bayar", "Baru"),
        ("23/10/2026", "ORD-0005", "TikTok Shop", "Topi bordir", rp(55_000), "Sudah bayar", "Baru"),
        ("24/10/2026", "ORD-0006", "Shopee", "Kaos polos hitam M", rp(75_000), "Refund", "Batal"),
    ]
    return sheet("template-manajemen-order.xlsx — Order", columns, rows,
                 ["Petunjuk", "Order", "Ringkasan", "Daftar"], "Order", highlight=(2, 4),
                 note="Kuning: sudah dibayar tetapi belum dikirim. Contoh data fiktif.")


def label_lines(x, y, scale):
    """Recipient + sender blocks of the sample label, top-left at (x, y)."""
    s = scale
    lines = [
        ("PENERIMA", 11, "bold", "#55615b"), ("Contoh Penerima Satu", 17, "bold", "#1b2420"),
        ("081200000001", 13, "normal", "#1b2420"), ("Jl. Contoh Raya No. 12, RT 01/RW 02", 12, "normal", "#1b2420"),
        ("Kel. Sukasari, Kec. Coblong", 12, "normal", "#1b2420"), ("Kota Bandung, Jawa Barat 40135", 12, "normal", "#1b2420"),
        ("Catatan: Titip ke satpam", 12, "normal", "#55615b"),
    ]
    out, cy = [], y
    for value, size, weight, fill in lines:
        cy += (size + 7) * s
        out.append(text(x, round(cy, 1), value, round(size * s, 1), weight, fill))
    cy += 14 * s
    out.append(f'<line x1="{x}" y1="{cy:.1f}" x2="{x + 236 * s:.1f}" y2="{cy:.1f}" stroke="#1b2420" '
               f'stroke-dasharray="{4 * s:.1f} {3 * s:.1f}"/>')
    for value, size, weight, fill in [("PENGIRIM", 11, "bold", "#55615b"), ("Toko Contoh", 13, "bold", "#1b2420"),
                                      ("081200009999", 12, "normal", "#1b2420")]:
        cy += (size + 7) * s
        out.append(text(x, round(cy, 1), value, round(size * s, 1), weight, fill))
    return out


def labels():
    width, height = 720, 470
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" '
           f'font-family="{FONT}" role="img">',
           f'<rect width="{width}" height="{height}" rx="8" fill="#f2f5f3"/>']
    # Thermal 100 × 150 mm (2:3), 260 × 390 px
    tx, ty, tw, th = 40, 40, 260, 390
    out.append(f'<rect x="{tx}" y="{ty}" width="{tw}" height="{th}" rx="6" fill="#ffffff" stroke="#1b2420" stroke-width="1.5"/>')
    out += label_lines(tx + 14, ty + 6, 1)
    out.append(text(tx + tw / 2, ty + th + 26, "Thermal 100 × 150 mm (1 label per lembar)", 13, "bold", GREEN, "middle"))
    # A4 210 × 297 mm with 2 × 4 labels, 260 × 368 px
    ax, ay, aw, ah = 400, 40, 278, 393
    out.append(f'<rect x="{ax}" y="{ay}" width="{aw}" height="{ah}" fill="#ffffff" stroke="#1b2420" stroke-width="1.5"/>')
    pad, gap = 12, 6
    cw, ch = (aw - 2 * pad - gap) / 2, (ah - 2 * pad - 3 * gap) / 4
    for r in range(4):
        for c in range(2):
            x, y = ax + pad + c * (cw + gap), ay + pad + r * (ch + gap)
            out.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{cw:.1f}" height="{ch:.1f}" fill="none" '
                       f'stroke="#9aa59f" stroke-dasharray="3 3"/>')
            out += label_lines(round(x + 6, 1), round(y - 1, 1), 0.38)
    out.append(text(ax + aw / 2, ay + ah + 23, "A4 isi 8 label (2 × 4), potong di garis", 13, "bold", GREEN, "middle"))
    out.append("</svg>")
    return "\n".join(out) + "\n", width, height


if __name__ == "__main__":
    for name, (svg, w, h) in {
        "pratinjau-template-pembukuan.svg": bookkeeping(),
        "pratinjau-template-manajemen-order.svg": orders(),
        "pratinjau-label-pengiriman.svg": labels(),
    }.items():
        (OUT / name).write_text(svg, encoding="utf-8")
        print(f"{name}: {w}×{h}, {len(svg.encode())} bytes")
