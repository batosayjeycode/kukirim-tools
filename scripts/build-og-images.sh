#!/bin/sh
# Regenerate the per-tool social preview images (1200 × 630) from scripts/og-image.html.
# Needs Google Chrome (macOS path below; set CHROME to override). Outputs are committed.
set -eu
cd "$(dirname "$0")/.."
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
SRC="file://$PWD/scripts/og-image.html"

shot() {
  "$CHROME" --headless --disable-gpu --hide-scrollbars --window-size=1200,630 \
    --screenshot="public/images/$1" "$SRC#$2" 2>/dev/null
  echo "public/images/$1"
}

shot og-kalkulator-keuntungan.png 'h=Kalkulator keuntungan jualan online&c=Laba bersih|Margin|Harga impas'
shot og-generator-label-paket.png 'h=Generator %26 cetak label pengiriman paket&c=Thermal 100×150 mm|A4 isi 8|Impor CSV'
shot og-template-pembukuan-online-shop.png 'h=Template pembukuan online shop (Excel)&c=Pemasukan|Pengeluaran|Laba per bulan'
shot og-template-manajemen-order.png 'h=Template rekap orderan online shop&c=Semua channel|Status bayar|Status kirim'
