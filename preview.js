/* 图提取 ImageGrab · 结果预览与批量下载 */
const grid = document.getElementById('grid');
const counter = document.getElementById('counter');
const meta = document.getElementById('meta');
const prog = document.getElementById('prog');
const dlBtn = document.getElementById('dlBtn');
const empty = document.getElementById('empty');

let items = [];
let selected = new Set();
let pageInfo = { title: '', url: '' };
let host = 'images';

const pad = (n) => String(n).padStart(2, '0');
const kb = (n) => (n >= 1024 ? (n / 1024).toFixed(1) + ' KB' : n + ' B');

function updateCounter() {
  counter.textContent = `已选 ${selected.size} / 共 ${items.length}`;
  dlBtn.disabled = selected.size === 0;
}

function render() {
  grid.innerHTML = '';
  if (!items.length) {
    empty.hidden = false;
    updateCounter();
    return;
  }
  empty.hidden = true;
  items.forEach((it, i) => {
    const el = document.createElement('div');
    el.className = 'item' + (selected.has(it.url) ? ' checked' : '');
    el.dataset.url = it.url;
    el.innerHTML = `
      <span class="checkbox">✓</span>
      <span class="idx">${pad(i + 1)}</span>
      <img class="thumb" loading="lazy" referrerpolicy="no-referrer" alt="">
      <div class="meta-row">
        <span class="dim">${it.w && it.h ? it.w + '×' + it.h : '尺寸未知'}</span>
        <span class="dim">${it.ext || ''}</span>
      </div>`;
    const img = el.querySelector('img');
    img.src = it.url;
    img.addEventListener('error', () => {
      el.classList.add('broken');
      el.querySelector('.thumb').replaceWith(
        Object.assign(document.createElement('div'), {
          className: 'thumb',
          textContent: '加载失败',
          style: 'display:grid;place-items:center;color:#8b95a3;font-size:12px',
        })
      );
    });
    el.addEventListener('click', () => {
      if (selected.has(it.url)) selected.delete(it.url);
      else selected.add(it.url);
      el.classList.toggle('checked');
      updateCounter();
    });
    grid.appendChild(el);
  });
  updateCounter();
}

function extOf(url) {
  const m = String(url).split('?')[0].match(/\.([a-z0-9]{2,5})$/i);
  return m ? m[1].toLowerCase() : 'img';
}

async function load() {
  const { lastGrab } = await chrome.storage.local.get('lastGrab');
  if (!lastGrab || !lastGrab.items) {
    meta.textContent = '没有提取记录';
    render();
    return;
  }
  pageInfo = lastGrab.page || pageInfo;
  try {
    host = new URL(pageInfo.url).hostname.replace(/^www\./, '').replace(/[^\w.-]/g, '_');
  } catch {
    host = 'images';
  }
  items = lastGrab.items.map((it) => ({ ...it, ext: extOf(it.url) }));
  selected = new Set(items.filter((it) => (it.w || 0) >= 400).slice(0, 60).map((it) => it.url));
  meta.textContent = `${pageInfo.title || '未命名页面'} · ${items.length} 张`;
  meta.title = pageInfo.url;
  document.title = `图提取 · ${host} · ${items.length} 张`;
  render();
}

document.querySelector('.tools').addEventListener('click', (e) => {
  const act = e.target.dataset && e.target.dataset.act;
  if (!act) return;
  if (act === 'all') selected = new Set(items.map((i) => i.url));
  if (act === 'none') selected = new Set();
  if (act === 'invert') selected = new Set(items.filter((i) => !selected.has(i.url)).map((i) => i.url));
  if (act === 'big') selected = new Set(items.filter((i) => (i.w || 0) * (i.h || 0) >= 400 * 400).map((i) => i.url));
  if (act === 'download') return downloadSelected();
  render();
});

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === 'a') {
    e.preventDefault();
    selected = new Set(items.map((i) => i.url));
    render();
  }
  if (e.key === 'Escape') {
    selected = new Set();
    render();
  }
});

async function toPngBlob(url) {
  const res = await fetch(url, { mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const blob = await res.blob();
  if (blob.type === 'image/png') return blob;
  const bmp = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  canvas.getContext('2d').drawImage(bmp, 0, 0);
  const out = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!out) throw new Error('转码失败');
  return out;
}

async function downloadSelected() {
  const list = items.filter((i) => selected.has(i.url));
  if (!list.length) return;
  dlBtn.disabled = true;
  let done = 0;
  let fail = 0;
  for (let i = 0; i < list.length; i++) {
    const it = list[i];
    const name = `imagegrab/${host}/${pad(i + 1)}.png`;
    prog.textContent = `下载中 ${i + 1}/${list.length}…`;
    try {
      const blob = await toPngBlob(it.url);
      const objUrl = URL.createObjectURL(blob);
      await chrome.downloads.download({ url: objUrl, filename: name, conflictAction: 'uniquify', saveAs: false });
      setTimeout(() => URL.revokeObjectURL(objUrl), 20000);
      done++;
    } catch {
      try {
        await chrome.downloads.download({
          url: it.url,
          filename: `imagegrab/${host}/raw-${pad(i + 1)}.${it.ext}`,
          conflictAction: 'uniquify',
          saveAs: false,
        });
        done++;
      } catch {
        fail++;
      }
    }
    await new Promise((r) => setTimeout(r, 180));
  }
  prog.textContent = `完成：成功 ${done} 张${fail ? '，失败 ' + fail + ' 张' : ''} → 下载目录 imagegrab/${host}/`;
  dlBtn.disabled = false;
}

load();
