# 图提取 ImageGrab

一个 Chrome 扩展：**一键提取电商详情页所有图片，过滤图标水印，批量下载为 PNG**。
配套一个纯静态官网（`docs/`），可直接托管到 GitHub Pages。

## 目录

```
a3-imagegrab/
├─ manifest.json          MV3 清单
├─ popup.html/css/js      插件弹窗：设最小尺寸、排除词，点「提取本页图片」
├─ preview.html/css/js    结果页：网格预览、全选/反选、批量下载 PNG
├─ icons/                 16/32/48/128 图标（由 scripts/make_icons.py 生成）
├─ scripts/make_icons.py  图标生成脚本
├─ test/                  本地验证页（模拟电商详情页）
└─ docs/                  官网（index.html + css + js + assets）
```

## 安装（开发者模式）

1. 把整个 `a3-imagegrab` 文件夹放到一个以后不会删的位置，例如 `D:\extensions\imagegrab`
2. Chrome 地址栏打开 `chrome://extensions`
3. 右上角打开 **开发者模式**
4. 点 **加载已解压的扩展程序**，选择这个文件夹（文件夹里直接有 `manifest.json`）

## 使用

1. 打开任意商品详情页（淘宝 / 京东 / 拼多多商家版等）
2. 点工具栏的「图提取」图标
3. 按需调整「最小尺寸」（默认 200px）与「额外排除」词
4. 点 **提取本页图片** → 自动打开结果页
5. 勾选（全选 / 反选 / 仅选大图 / 单张点选），点 **下载选中为 PNG**
6. 文件保存在 `下载目录/imagegrab/<域名>/01.png、02.png…`

## 实现要点

- **采集三类来源**：`<img>`（`src` / `currentSrc` / `srcset`）、懒加载属性（`data-src`、`data-original`、`data-lazy-src` 等）、元素 `background-image`
- **过滤**：按真实像素尺寸（`naturalWidth/Height`）+ 路径关键词（favicon、icon、logo、sprite、1×1 等）+ 用户自定义排除词
- **去重**：以绝对 URL 为键，同一张图保留面积最大的记录
- **转 PNG**：`fetch` → `Blob` → `createImageBitmap` → `canvas.toBlob('image/png')`；跨域失败时回退为原始文件下载（`raw-` 前缀），不会静默丢图
- **下载**：`chrome.downloads.download`，文件名 `imagegrab/<host>/NN.png`，`conflictAction: uniquify`
- 权限：`activeTab`、`scripting`、`downloads`、`storage`；无后台常驻、无远程请求、不上传任何数据

## GitHub Pages 发布官网

仓库设置 → Pages → Source 选 `Deploy from a branch` → 分支 `main`，目录 `/docs`。
发布后地址形如 `https://<用户名>.github.io/<仓库名>/`。

## 已知限制

- 部分站点对图片做了 Referer 防盗链，预览缩略图可能加载失败；下载时若跨域转码失败会回退保存原始文件
- 只在「浏览器已加载的 DOM」里采集，无限滚动的页面需要先滚动到底再提取
- 开发者模式加载的扩展，Chrome 启动时可能提示"停用开发者模式扩展"，选保留即可
