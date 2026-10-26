/**
 * Browser glue for /generator-label-paket/. Validation and CSV parsing live in
 * src/lib/labels.js. All output is built with createElement/textContent.
 *
 * Privacy: recipient data stays in memory only. Sender details are written to
 * localStorage only while the user has ticked "Simpan di browser ini".
 */
import {
  COLUMNS,
  MAX_ROWS,
  importLabelCsv,
  validateRecipient,
  validateSender,
  serializeSender,
  parseStoredSender,
  addressLines,
  paginate,
} from '../lib/labels.js';

const SENDER_STORAGE_KEY = 'kukirim:pengirim';
const SENDER_FIELDS = ['nama', 'no_hp', 'alamat', 'nama_toko'];
const MAX_FILE_BYTES = 1024 * 1024;

/** Print layouts. `perSheet` labels are placed on each printed page. */
const LAYOUTS = {
  thermal: { perSheet: 1, minFontPt: 8, page: '@page { size: 100mm 150mm; margin: 0; }' },
  a4: { perSheet: 8, minFontPt: 6, page: '@page { size: A4; margin: 8mm; }' },
};

const overflows = (/** @type {HTMLElement} */ el) => el.scrollHeight > el.clientHeight + 1;

/**
 * Shrink a label's font in 0.5pt steps until its content fits.
 * @param {HTMLElement} label laid out at print size
 * @param {number} minPt
 * @returns {boolean} whether the content fits
 */
function fitLabel(label, minPt) {
  if (!overflows(label)) return true;
  // 1pt = 4/3 CSS px
  let pt = Math.round(((parseFloat(getComputedStyle(label).fontSize) * 3) / 4) * 2) / 2;
  while (overflows(label) && pt > minPt) {
    pt = Math.max(minPt, pt - 0.5);
    label.style.fontSize = `${pt}pt`;
  }
  return !overflows(label);
}

/** @type {(import('../lib/labels.js').Recipient)[]} */
let recipients = [];

const root = document.getElementById('label-tool');
if (root) init();

function init() {
  const $ = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));
  const senderForm = /** @type {HTMLFormElement} */ ($('sender-form'));
  const recipientForm = /** @type {HTMLFormElement} */ ($('recipient-form'));
  const csvInput = /** @type {HTMLInputElement} */ ($('csv-file'));
  const saveSender = /** @type {HTMLInputElement} */ ($('sender-save'));
  const preview = $('label-preview');
  const printArea = $('print-area');
  const pageStyle = $('label-page-style');
  const listStatus = $('list-status');
  const senderStatus = $('sender-status');
  const recipientStatus = $('recipient-status');
  const importReport = $('import-report');
  const printButton = /** @type {HTMLButtonElement} */ ($('print-labels'));
  const clearButton = /** @type {HTMLButtonElement} */ ($('clear-labels'));

  // ---------- helpers ----------

  /**
   * @param {string} tag
   * @param {string} [className]
   * @param {string} [text]
   */
  function h(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  /** @param {HTMLFormElement} form @param {string} name */
  const formValue = (form, name) => String(new FormData(form).get(name) ?? '');

  /** @param {HTMLFormElement} form */
  function clearErrors(form) {
    for (const el of form.querySelectorAll('[aria-invalid="true"]')) el.removeAttribute('aria-invalid');
    for (const el of form.querySelectorAll('.field-error')) {
      el.textContent = '';
      /** @type {HTMLElement} */ (el).hidden = true;
    }
  }

  /**
   * @param {import('../lib/labels.js').FieldError[]} errors
   * @param {string} idPrefix
   */
  function showErrors(errors, idPrefix) {
    for (const { field, message } of errors) {
      document.getElementById(`${idPrefix}${field}`)?.setAttribute('aria-invalid', 'true');
      const msg = document.getElementById(`${idPrefix}${field}-error`);
      if (msg) {
        msg.textContent = message;
        msg.hidden = false;
      }
    }
    if (errors[0]) document.getElementById(`${idPrefix}${errors[0].field}`)?.focus();
  }

  const storage = {
    get() {
      try {
        return localStorage.getItem(SENDER_STORAGE_KEY);
      } catch {
        return null;
      }
    },
    /** @param {string} value */
    set(value) {
      try {
        localStorage.setItem(SENDER_STORAGE_KEY, value);
        return true;
      } catch {
        return false;
      }
    },
    remove() {
      try {
        localStorage.removeItem(SENDER_STORAGE_KEY);
      } catch {
        // Storage unavailable: nothing was saved.
      }
    },
  };

  // ---------- sender ----------

  const senderInput = () => Object.fromEntries(SENDER_FIELDS.map((f) => [f, formValue(senderForm, `pengirim_${f}`)]));
  const senderIsEmpty = () => SENDER_FIELDS.every((f) => formValue(senderForm, `pengirim_${f}`).trim() === '');

  /** Valid sender, or null when empty or invalid (invalid senders are left off labels). */
  function currentSender() {
    if (senderIsEmpty()) return null;
    const result = validateSender(senderInput());
    return result.ok ? result.sender : null;
  }

  /** Validate and show sender errors. Returns false when a partly filled sender is invalid. */
  function checkSender() {
    clearErrors(senderForm);
    if (senderIsEmpty()) return true;
    const result = validateSender(senderInput());
    if (!result.ok) {
      showErrors(result.errors, 'pengirim_');
      return false;
    }
    return true;
  }

  function persistSender() {
    if (!saveSender.checked) return;
    const sender = currentSender();
    if (sender && storage.set(serializeSender(sender))) {
      senderStatus.textContent = 'Data pengirim tersimpan di browser ini.';
    } else if (!sender) {
      senderStatus.textContent = 'Lengkapi nama dan no. HP pengirim yang valid agar bisa disimpan.';
    } else {
      senderStatus.textContent = 'Browser ini tidak mengizinkan penyimpanan data.';
    }
  }

  function loadSender() {
    const raw = storage.get();
    if (raw === null) return;
    const sender = parseStoredSender(raw);
    if (!sender) {
      storage.remove();
      return;
    }
    for (const f of SENDER_FIELDS) {
      const input = /** @type {HTMLInputElement | null} */ (document.getElementById(`pengirim_${f}`));
      if (input) input.value = sender[f];
    }
    saveSender.checked = true;
    senderStatus.textContent = 'Data pengirim dimuat dari browser ini.';
  }

  senderForm.addEventListener('submit', (e) => e.preventDefault());
  senderForm.addEventListener('input', () => {
    clearErrors(senderForm);
    render();
  });
  senderForm.addEventListener('change', (e) => {
    if (e.target === saveSender) return;
    checkSender();
    persistSender();
  });

  saveSender.addEventListener('change', () => {
    if (saveSender.checked) {
      if (checkSender()) persistSender();
    } else {
      storage.remove();
      senderStatus.textContent = 'Data pengirim tidak lagi disimpan di browser ini.';
    }
  });

  $('sender-delete').addEventListener('click', () => {
    storage.remove();
    senderForm.reset();
    clearErrors(senderForm);
    senderStatus.textContent = 'Data pengirim dihapus dari browser ini.';
    render();
  });

  // ---------- recipients ----------

  /** @param {import('../lib/labels.js').Recipient[]} added */
  function addRecipients(added) {
    const room = MAX_ROWS - recipients.length;
    recipients = recipients.concat(added.slice(0, Math.max(0, room)));
    render();
    return Math.max(0, added.length - room);
  }

  recipientForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors(recipientForm);
    const input = Object.fromEntries(COLUMNS.map((c) => [c, formValue(recipientForm, `penerima_${c}`)]));
    const result = validateRecipient(input);
    if (!result.ok) {
      showErrors(result.errors, 'penerima_');
      recipientStatus.textContent = 'Periksa kembali isian yang ditandai.';
      return;
    }
    if (addRecipients([result.recipient]) > 0) {
      recipientStatus.textContent = `Daftar sudah berisi ${MAX_ROWS} label (batas maksimal).`;
      return;
    }
    recipientForm.reset();
    recipientStatus.textContent = `Label untuk ${result.recipient.nama_penerima} ditambahkan.`;
    document.getElementById('penerima_nama_penerima')?.focus();
  });

  csvInput.addEventListener('change', async () => {
    const file = csvInput.files?.[0];
    csvInput.value = ''; // allow re-importing the same file
    importReport.replaceChildren();
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      importReport.append(h('p', 'error-text', 'File terlalu besar. Maksimal 1 MB.'));
      return;
    }

    const text = await file.text();
    const result = importLabelCsv(text);
    if (!result.ok) {
      importReport.append(h('p', 'error-text', result.message));
      return;
    }

    const skipped = addRecipients(result.recipients);
    const summary = `${result.recipients.length} dari ${result.total} baris berhasil ditambahkan.`;
    importReport.append(h('p', result.invalid.length > 0 ? 'warning-text' : 'success-text', summary));

    if (skipped > 0) {
      importReport.append(h('p', 'warning-text', `${skipped} label tidak ditambahkan karena daftar sudah mencapai ${MAX_ROWS} label.`));
    }
    if (text.includes('�')) {
      importReport.append(h('p', 'warning-text', 'Beberapa huruf mungkin tidak terbaca. Simpan file sebagai "CSV UTF-8" lalu impor ulang.'));
    }
    if (result.ignoredColumns.length > 0) {
      importReport.append(h('p', 'note', `Kolom diabaikan: ${result.ignoredColumns.join(', ')}.`));
    }
    if (result.invalid.length > 0) {
      importReport.append(h('p', 'error-text', `${result.invalid.length} baris bermasalah dan tidak ditambahkan:`));
      const list = h('ul', 'error-list');
      for (const { row, errors } of result.invalid.slice(0, 50)) {
        list.append(h('li', '', `Baris ${row}: ${errors.map((e) => e.message).join(' ')}`));
      }
      if (result.invalid.length > 50) list.append(h('li', '', `…dan ${result.invalid.length - 50} baris lainnya.`));
      importReport.append(list);
    }
  });

  preview.addEventListener('click', (e) => {
    const button = /** @type {HTMLElement} */ (e.target).closest('[data-remove]');
    if (!button) return;
    const index = Number(/** @type {HTMLElement} */ (button).dataset.remove);
    recipients = recipients.filter((_, i) => i !== index);
    render();
    listStatus.focus();
  });

  clearButton.addEventListener('click', () => {
    recipients = [];
    importReport.replaceChildren();
    render();
  });

  // ---------- rendering ----------

  /**
   * @param {import('../lib/labels.js').Recipient} r
   * @param {import('../lib/labels.js').Sender | null} sender
   */
  function renderLabel(r, sender) {
    const label = h('article', 'label');
    const to = h('section', 'label-to');
    to.append(h('p', 'label-heading', 'Penerima'), h('p', 'label-name', r.nama_penerima), h('p', 'label-phone', r.no_hp));
    for (const line of addressLines(r)) to.append(h('p', 'label-line', line));
    if (r.catatan) to.append(h('p', 'label-note', `Catatan: ${r.catatan}`));
    label.append(to);

    if (sender) {
      const from = h('section', 'label-from');
      from.append(h('p', 'label-heading', 'Pengirim'));
      if (sender.nama_toko) from.append(h('p', 'label-sender-name', sender.nama_toko));
      from.append(h('p', sender.nama_toko ? 'label-line' : 'label-sender-name', sender.nama));
      from.append(h('p', 'label-line', sender.no_hp));
      if (sender.alamat) from.append(h('p', 'label-line', sender.alamat));
      label.append(from);
    }
    return label;
  }

  function selectedLayout() {
    const value = formValue(/** @type {HTMLFormElement} */ ($('print-options')), 'ukuran');
    return value === 'a4' ? 'a4' : 'thermal';
  }

  function render() {
    const sender = currentSender();
    const layoutName = selectedLayout();
    const layout = LAYOUTS[layoutName];

    // Print sheets first, so each label can be fitted at its real size.
    pageStyle.textContent = layout.page;
    printArea.className = `print-area print-${layoutName}`;
    /** @type {HTMLElement[]} */
    const printLabels = [];
    printArea.replaceChildren(
      ...paginate(recipients, layout.perSheet).map((group) => {
        const sheet = h('div', 'sheet');
        for (const r of group) {
          const label = renderLabel(r, sender);
          printLabels.push(label);
          sheet.append(label);
        }
        return sheet;
      }),
    );
    const fits = printLabels.map((label) => fitLabel(label, layout.minFontPt));

    // Screen preview with remove buttons.
    preview.replaceChildren(
      ...recipients.map((r, i) => {
        const item = h('li', 'preview-item');
        const remove = h('button', 'button-link', 'Hapus');
        remove.setAttribute('type', 'button');
        remove.dataset.remove = String(i);
        remove.setAttribute('aria-label', `Hapus label ${r.nama_penerima}`);
        item.append(renderLabel(r, sender));
        if (!fits[i]) item.append(h('p', 'fit-warning', 'Teks terlalu panjang untuk ukuran ini; sebagian bisa terpotong. Persingkat alamat atau catatan.'));
        item.append(remove);
        return item;
      }),
    );

    const n = recipients.length;
    listStatus.textContent = n === 0 ? 'Belum ada label. Tambahkan penerima atau impor CSV.' : `${n} label siap dicetak.`;
    printButton.disabled = n === 0;
    clearButton.hidden = n === 0;
  }

  $('print-options').addEventListener('change', render);
  printButton.addEventListener('click', () => {
    if (!checkSender()) {
      senderStatus.textContent = 'Perbaiki data pengirim atau kosongkan semua isian pengirim sebelum mencetak.';
      return;
    }
    window.print();
  });

  loadSender();
  render();
}
