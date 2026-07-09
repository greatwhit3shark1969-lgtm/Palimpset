'use strict';

/* ---------- constants ---------- */
const DB_NAME = 'palimpsest-db';
const DB_VERSION = 1;
const STORE = 'notes';
const GRACE_MS = 10 * 60 * 1000; // 10 minutes before a note can resurface
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

const toRoman = n => n <= 10 ? (ROMAN[n] || String(n)) : String(n);

/* ---------- IndexedDB layer ---------- */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

let dbPromise = openDB();

async function dbAll() {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(note) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(note);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbDelete(id) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ---------- state ---------- */
let notes = [];               // in-memory cache, kept in sync with IDB
let resurfacedIds = [];       // ids currently shown in the "returning to you" zone
let pendingPhotoBlob = null;
let pendingPhotoType = null;

/* ---------- elements ---------- */
const composer = document.getElementById('composer');
const tagInput = document.getElementById('tag-input');
const saveBtn = document.getElementById('save-btn');
const photoInput = document.getElementById('photo-input');
const photoLabel = document.getElementById('photo-label');
const photoPreview = document.getElementById('photo-preview');
const photoPreviewImg = document.getElementById('photo-preview-img');
const photoClear = document.getElementById('photo-clear');
const resurfaceBtn = document.getElementById('resurface-btn');
const resurfacedList = document.getElementById('resurfaced-list');
const resurfacedEmpty = document.getElementById('resurfaced-empty');
const archiveList = document.getElementById('archive-list');
const archiveEmpty = document.getElementById('archive-empty');
const exportBtn = document.getElementById('export-btn');
const themeToggle = document.getElementById('theme-toggle');
const themeLabel = document.getElementById('theme-toggle-label');
const toast = document.getElementById('toast');

/* ---------- toast ---------- */
let toastTimer = null;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

/* ---------- theme ---------- */
function initTheme() {
  const saved = localStorage.getItem('palimpsest-theme');
  const theme = saved || 'dark';
  applyTheme(theme);
}
function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    themeLabel.textContent = 'light';
  } else {
    document.documentElement.removeAttribute('data-theme');
    themeLabel.textContent = 'dark';
  }
  localStorage.setItem('palimpsest-theme', theme);
}
themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  applyTheme(current === 'light' ? 'dark' : 'light');
});

/* ---------- photo handling ---------- */
photoInput.addEventListener('change', async () => {
  const file = photoInput.files[0];
  if (!file) return;
  const compressed = await compressImage(file, 1280, 0.72);
  pendingPhotoBlob = compressed.blob;
  pendingPhotoType = compressed.blob.type;
  photoPreviewImg.src = URL.createObjectURL(compressed.blob);
  photoPreview.hidden = false;
  photoLabel.textContent = 'photo attached';
});

photoClear.addEventListener('click', () => {
  pendingPhotoBlob = null;
  pendingPhotoType = null;
  photoInput.value = '';
  photoPreview.hidden = true;
  photoLabel.textContent = 'add photo';
});

function compressImage(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
        else { width = Math.round(width * maxDim / height); height = maxDim; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => resolve({ blob, width, height }), 'image/jpeg', quality);
    };
    img.onerror = reject;
    img.src = url;
  });
}

/* ---------- compose / save ---------- */
saveBtn.addEventListener('click', async () => {
  const text = composer.value.trim();
  if (!text && !pendingPhotoBlob) {
    showToast('Nothing to set down yet.');
    return;
  }
  const tags = tagInput.value.split(',').map(t => t.trim()).filter(Boolean);
  const now = Date.now();
  const note = {
    id: crypto.randomUUID(),
    text,
    tags,
    photoBlob: pendingPhotoBlob,
    photoType: pendingPhotoType,
    createdAt: now,
    lastRevisedAt: now,
    revisions: 0,
    lastResurfacedAt: null,
    timesResurfaced: 0,
  };
  await dbPut(note);
  notes.unshift(note);

  composer.value = '';
  tagInput.value = '';
  pendingPhotoBlob = null;
  pendingPhotoType = null;
  photoInput.value = '';
  photoPreview.hidden = true;
  photoLabel.textContent = 'add photo';

  showToast('Set down.');
  renderArchive();
});

/* ---------- resurfacing ---------- */
function eligibleForResurface(now) {
  return notes
    .filter(n => now - n.createdAt >= GRACE_MS)
    .sort((a, b) => {
      const aKey = a.lastResurfacedAt ?? 0;
      const bKey = b.lastResurfacedAt ?? 0;
      return aKey - bKey; // never-resurfaced (0) and longest-waiting first
    });
}

async function pullResurfaced({ silent } = {}) {
  const now = Date.now();
  const pool = eligibleForResurface(now);
  const picked = pool.slice(0, 2);

  if (picked.length === 0) {
    resurfacedIds = [];
    renderResurfaced();
    if (!silent) showToast('Nothing due back yet.');
    return;
  }

  for (const n of picked) {
    n.lastResurfacedAt = now;
    n.timesResurfaced += 1;
    await dbPut(n);
  }
  resurfacedIds = picked.map(n => n.id);
  renderResurfaced();
  renderArchive();
  if (!silent) showToast(picked.length === 1 ? 'One note returned.' : 'Two notes returned.');
}

resurfaceBtn.addEventListener('click', () => pullResurfaced());

/* ---------- rendering ---------- */
function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function noteEl(note, { resurfaced } = {}) {
  const el = document.createElement('article');
  el.className = 'note' + (resurfaced ? ' is-resurfaced' : '');
  el.dataset.id = note.id;
  if (resurfaced) el.dataset.numeral = 'return ' + toRoman(note.timesResurfaced);

  if (note.photoBlob) {
    const img = document.createElement('img');
    img.className = 'note-photo';
    img.src = URL.createObjectURL(note.photoBlob);
    img.alt = 'Attached photo';
    el.appendChild(img);
  }

  if (note.text) {
    const p = document.createElement('p');
    p.className = 'note-text';
    p.textContent = note.text;
    el.appendChild(p);
  }

  if (note.tags && note.tags.length) {
    const tagWrap = document.createElement('div');
    tagWrap.className = 'note-tags';
    note.tags.forEach(t => {
      const span = document.createElement('span');
      span.className = 'note-tag';
      span.textContent = t;
      tagWrap.appendChild(span);
    });
    el.appendChild(tagWrap);
  }

  const meta = document.createElement('div');
  meta.className = 'note-meta';
  const left = document.createElement('div');
  left.className = 'meta-left';
  const dateSpan = document.createElement('span');
  dateSpan.textContent = fmtDate(note.createdAt);
  left.appendChild(dateSpan);
  if (note.revisions > 0) {
    const revSpan = document.createElement('span');
    revSpan.textContent = 'revised ' + toRoman(note.revisions) + 'x';
    left.appendChild(revSpan);
  }
  meta.appendChild(left);

  const actions = document.createElement('div');
  actions.className = 'meta-actions';
  const editBtn = iconButton('rewrite', () => openRewrite(el, note));
  const delBtn = iconButton('delete', () => removeNote(note.id), true);
  actions.appendChild(editBtn);
  actions.appendChild(delBtn);
  meta.appendChild(actions);

  el.appendChild(meta);
  return el;
}

function iconButton(label, onClick, danger) {
  const btn = document.createElement('button');
  btn.className = 'icon-btn' + (danger ? ' danger' : '');
  btn.type = 'button';
  btn.textContent = label === 'rewrite' ? '✎ rewrite' : '✕ remove';
  btn.addEventListener('click', onClick);
  return btn;
}

function openRewrite(el, note) {
  if (el.querySelector('.rewrite-panel')) return; // already open

  const panel = document.createElement('div');
  panel.className = 'rewrite-panel';

  const ghost = document.createElement('p');
  ghost.className = 'ghost-text';
  ghost.textContent = note.text || '(no text — photo only)';

  const textarea = document.createElement('textarea');
  textarea.rows = 3;
  textarea.value = note.text;

  const actions = document.createElement('div');
  actions.className = 'rewrite-actions';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'ghost-btn small';
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'cancel';
  cancelBtn.addEventListener('click', () => panel.remove());

  const saveRewriteBtn = document.createElement('button');
  saveRewriteBtn.className = 'ink-btn';
  saveRewriteBtn.type = 'button';
  saveRewriteBtn.textContent = 'Rewrite';
  saveRewriteBtn.addEventListener('click', async () => {
    const newText = textarea.value.trim();
    note.text = newText;
    note.revisions += 1;
    note.lastRevisedAt = Date.now();
    await dbPut(note);
    showToast('Rewritten — ' + toRoman(note.revisions) + ' revision' + (note.revisions === 1 ? '' : 's') + ' now.');
    renderResurfaced();
    renderArchive();
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(saveRewriteBtn);
  panel.appendChild(ghost);
  panel.appendChild(textarea);
  panel.appendChild(actions);
  el.appendChild(panel);
  textarea.focus();
}

async function removeNote(id) {
  await dbDelete(id);
  notes = notes.filter(n => n.id !== id);
  resurfacedIds = resurfacedIds.filter(rid => rid !== id);
  renderResurfaced();
  renderArchive();
  showToast('Removed.');
}

function renderResurfaced() {
  resurfacedList.innerHTML = '';
  const items = resurfacedIds.map(id => notes.find(n => n.id === id)).filter(Boolean);
  if (items.length === 0) {
    resurfacedEmpty.hidden = false;
    return;
  }
  resurfacedEmpty.hidden = true;
  items.forEach(n => resurfacedList.appendChild(noteEl(n, { resurfaced: true })));
}

function renderArchive() {
  archiveList.innerHTML = '';
  const sorted = [...notes].sort((a, b) => b.createdAt - a.createdAt);
  if (sorted.length === 0) {
    archiveEmpty.hidden = false;
    return;
  }
  archiveEmpty.hidden = true;
  sorted.forEach(n => archiveList.appendChild(noteEl(n)));
}

/* ---------- export ---------- */
exportBtn.addEventListener('click', async () => {
  const exportable = notes.map(n => ({
    ...n,
    photoBlob: undefined,
    photoDataUrl: undefined, // filled below if present
  }));

  await Promise.all(notes.map(async (n, i) => {
    if (n.photoBlob) {
      exportable[i].photoDataUrl = await blobToDataUrl(n.photoBlob);
    }
    delete exportable[i].photoBlob;
  }));

  const blob = new Blob([JSON.stringify(exportable, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'palimpsest-export-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('Exported.');
});

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/* ---------- boot ---------- */
async function boot() {
  initTheme();
  notes = await dbAll();
  renderArchive();
  await pullResurfaced({ silent: true });

  if (resurfacedIds.length === 0) {
    resurfacedEmpty.hidden = false;
  }
}

boot();

/* ---------- service worker ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* offline install still works even if this particular registration attempt fails */
    });
  });
}
