/* 图提取 ImageGrab · popup */
const $ = (id) => document.getElementById(id);
const DEFAULT_MIN = 200;
const BAD_URL = /(?:^data:|^blob:|favicon|sprite|icon[-_/.]|logo[-_/.]|\/logo\.|placeholder|blank\.|pixel\.|1x1|spacer|loading\.(gif|png)|grey\.gif)/i;

/* 注入到页面里执行：收集图片地址（含懒加载与背景图） */
function collectImages(opts) {
  const min = Number(opts.min || 0);
  const extra = (opts.exclude || '')
    .split(/[,，\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const bad = /(?:^data:|^blob:|favicon|sprite|icon[-_/.]|logo[-_/.]|placeholder|blank\.|pixel\.|1x1|spacer)/i;

  const seen = new Map();

  const add = (raw, w, h, alt) => {
    if (!raw || typeof raw !== 'string') return;
    let url;
    try {
      url = new URL(raw.trim(), location.href).href;
    } catch {
      return;
    }
    if (!/^https?:/i.test(url)) return;
    if (bad.test(url)) return;
    const low = url.toLowerCase();
    if (extra.some((k) => low.includes(k))) return;
    // 长边小于阈值才丢弃：这样 1600x300 的长图不会被误杀，而 32x32 图标会被过滤
    if ((w || h) && Math.max(w, h) < min) return;
    const prev = seen.get(url);
    const area = (w || 0) * (h || 0);
    if (!prev || area > prev.area) seen.set(url, { url, w: w || 0, h: h || 0, alt: alt || '', area });
  };

  const fromSrcset = (srcset, w, h) => {
    if (!srcset) return;
    srcset.split(',').forEach((part) => {
      const u = part.trim().split(/\s+/)[0];
      if (u) add(u, w || 0, h || 0, '');
    });
  };

  document.querySelectorAll('img').forEach((img) => {
    // 懒加载图的 naturalWidth 是占位图的尺寸，要取自然尺寸与布局尺寸的较大值
    const w = Math.max(img.naturalWidth || 0, img.width || 0);
    const h = Math.max(img.naturalHeight || 0, img.height || 0);
    const d = img.dataset || {};
    add(img.currentSrc || img.src, w, h, img.alt);
    ['src', 'original', 'lazySrc', 'lazy', 'lazySrcset', 'srcset'].forEach((k) => {
      const v = d[k] || img.getAttribute('data-' + k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()));
      if (v) fromSrcset(v, w, h);
    });
    fromSrcset(img.getAttribute('srcset'), w, h);
  });

  document.querySelectorAll('source[srcset]').forEach((s) => fromSrcset(s.getAttribute('srcset')));
  document.querySelectorAll('video[poster]').forEach((v) => add(v.getAttribute('poster'), 0, 0, ''));

  document.querySelectorAll('*').forEach((el) => {
    const bg = getComputedStyle(el).backgroundImage;
    if (bg && bg !== 'none' && bg.includes('url(')) {
      const m = bg.match(/url\((['"]?)(.*?)\1\)/g) || [];
      m.forEach((one) => {
        const u = one.replace(/^url\((['"]?)/, '').replace(/(['"]?)\)$/, '');
        const r = el.getBoundingClientRect();
        add(u, Math.round(r.width), Math.round(r.height), '');
      });
    }
  });

  const items = [...seen.values()].sort((a, b) => b.area - a.area).map(({ url, w, h, alt }) => ({ url, w, h, alt }));
  return { items, page: { title: document.title, url: location.href } };
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function init() {
  const saved = await chrome.storage.local.get(['minSize', 'exclude']);
  if (saved.minSize != null) $('minSize').value = saved.minSize;
  if (saved.exclude) $('exclude').value = saved.exclude;

  const tab = await getActiveTab();
  const badge = $('pageBadge');
  if (!tab || !tab.url) {
    badge.textContent = '无活动标签页';
    return;
  }
  if (!/^https?:/i.test(tab.url)) {
    badge.textContent = '当前页不支持';
    $('grab').disabled = true;
    setStatus('请在普通网页（http/https）上使用，chrome:// 页面无法注入脚本。', 'err');
    return;
  }
  badge.textContent = new URL(tab.url).hostname;
  badge.title = tab.title || '';
}

function setStatus(text, cls) {
  const el = $('status');
  el.textContent = text;
  el.className = 'status' + (cls ? ' ' + cls : '');
}

$('grab').addEventListener('click', async () => {
  const btn = $('grab');
  btn.disabled = true;
  setStatus('正在扫描页面图片…');
  try {
    const min = Math.max(0, Number($('minSize').value) || DEFAULT_MIN);
    const exclude = $('exclude').value.trim();
    await chrome.storage.local.set({ minSize: min, exclude });

    const tab = await getActiveTab();
    if (!tab || !tab.id) throw new Error('找不到活动标签页');

    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: collectImages,
      args: [{ min, exclude }],
    });
    const data = res && res.result;
    if (!data || !data.items) throw new Error('页面脚本没有返回结果');

    if (!data.items.length) {
      setStatus('没有找到符合条件的图片，试试把「最小尺寸」调小。', 'err');
      return;
    }

    await chrome.storage.local.set({
      lastGrab: { ...data, min, exclude, grabbedAt: Date.now() },
    });
    setStatus(`找到 ${data.items.length} 张图片，正在打开预览页…`, 'ok');
    await chrome.tabs.create({ url: chrome.runtime.getURL('preview.html') });
    window.close();
  } catch (e) {
    setStatus('提取失败：' + (e && e.message ? e.message : e), 'err');
  } finally {
    btn.disabled = false;
  }
});

$('openPreview').addEventListener('click', async (e) => {
  e.preventDefault();
  const { lastGrab } = await chrome.storage.local.get('lastGrab');
  if (!lastGrab) {
    setStatus('还没有提取记录，先点上面的按钮。', 'err');
    return;
  }
  await chrome.tabs.create({ url: chrome.runtime.getURL('preview.html') });
  window.close();
});

init();
