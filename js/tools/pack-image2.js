/* =============================================================================
 * 图片处理工具包 · 第二批（9 个）
 * -----------------------------------------------------------------------------
 * image-border      加边框与圆角
 * image-collage     多图拼接
 * image-base64-view Base64 转图片
 * image-mosaic      马赛克 / 像素化
 * image-target-size 压缩到指定体积
 * image-batch-resize 批量缩放
 * image-palette     主色提取
 * image-ico         生成 favicon.ico
 * image-compare     图片对比
 *
 * 全部使用 Canvas 在本地处理，图片不会上传到任何服务器。
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;
  var MAX_SIDE = 6000;

  /* ------------------------------ 公共部分 ------------------------------ */

  function demoFile(width, height, text) {
    var canvas = K.canvas(width || 1400, height || 900);
    var ctx = canvas.getContext('2d');
    var gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#5b5bd6');
    gradient.addColorStop(0.5, '#a855f7');
    gradient.addColorStop(1, '#06b6d4');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 0.16;
    for (var i = 0; i < 6; i += 1) {
      ctx.beginPath();
      ctx.arc(canvas.width * 0.78 + i * 24, canvas.height * 0.28 + i * 20, 130 - i * 14, 0, Math.PI * 2);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 9;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,.96)';
    ctx.font = 'bold 86px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(text || '示例图片', 88, canvas.height * 0.54);
    ctx.font = '34px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.fillText(canvas.width + ' × ' + canvas.height + ' · 本地演示素材', 90, canvas.height * 0.6);
    return new Promise(function (resolve) {
      canvas.toBlob(function (blob) {
        resolve(new File([blob], 'demo.png', { type: 'image/png' }));
      }, 'image/png');
    });
  }

  function makeCard(title, canvas, filename, type, extra) {
    var wrap = document.createElement('div');
    wrap.className = 'img-card';
    wrap.innerHTML = '<div class="img-card-head"><span>' + K.esc(title) + '</span>' +
      '<button type="button" class="link-btn">下载</button></div>' +
      '<div class="img-card-body"></div>' +
      (extra ? '<p class="hint" style="margin:0 12px 10px">' + K.esc(extra) + '</p>' : '');
    canvas.className = 'preview-canvas';
    wrap.querySelector('.img-card-body').appendChild(canvas);
    wrap.querySelector('button').addEventListener('click', function () {
      K.saveCanvas(canvas, filename, type || 'image/png', 0.95);
    });
    return wrap;
  }

  function roundRect(ctx, x, y, w, h, r) {
    var radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  /** 单图工具外壳 */
  function singleTool(root, cfg) {
    var uid = K.uid(cfg.uid);
    root.innerHTML = K.dropzone(uid, '点击选择图片') +
      '<div class="file-meta" id="' + uid + '-meta" hidden></div>' +
      cfg.options(uid) +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="' + uid + '-run" disabled>' + K.esc(cfg.action) + '</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-sample">示例图片</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-reset">清除</button>' +
      '</div>' +
      '<div class="img-grid" id="' + uid + '-grid"></div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      (cfg.hint ? '<p class="hint">' + cfg.hint + '</p>' : '');

    var meta = root.querySelector('#' + uid + '-meta');
    var runBtn = root.querySelector('#' + uid + '-run');
    var grid = root.querySelector('#' + uid + '-grid');
    var statusEl = root.querySelector('#' + uid + '-status');
    var state = { file: null, img: null, handle: null };

    function setStatus(type, text) {
      if (!text) { statusEl.hidden = true; return; }
      statusEl.className = 'status ' + type;
      statusEl.textContent = text;
      statusEl.hidden = false;
    }

    function load(file) {
      return K.loadImage(file).then(function (handle) {
        if (state.handle) K.release(state.handle);
        state.file = file;
        state.img = handle.img;
        state.handle = handle;
        meta.hidden = false;
        meta.innerHTML = '<span class="name">' + K.esc(file.name) + '</span>' +
          '<span>' + handle.img.naturalWidth + ' × ' + handle.img.naturalHeight + ' px</span>' +
          '<span>' + K.formatBytes(file.size) + '</span>' +
          '<span>' + K.esc(file.type || '未知') + '</span>';
        runBtn.disabled = false;
        render();
      }).catch(function (error) {
        K.toast(error.message, 'error');
      });
    }

    function render() {
      if (!state.img) { setStatus('info', '请先选择一张图片。'); return; }
      try {
        cfg.render(state, grid, setStatus, uid);
      } catch (error) {
        console.error('[图片处理失败]', error);
        setStatus('err', '处理失败：' + (error.message || '未知错误'));
      }
    }

    K.bindFile(root, uid, load);
    runBtn.addEventListener('click', render);
    root.querySelector('#' + uid + '-sample').addEventListener('click', function () {
      demoFile(cfg.demoW, cfg.demoH).then(load);
    });
    root.querySelector('#' + uid + '-reset').addEventListener('click', function () {
      if (state.handle) K.release(state.handle);
      state.file = null; state.img = null; state.handle = null;
      meta.hidden = true; meta.innerHTML = '';
      grid.innerHTML = '';
      runBtn.disabled = true;
      setStatus(null, '');
      K.toast('已清除', 'success');
    });
  }

  /* ------------------------------ 1. 边框与圆角 ------------------------------ */
  function renderBorder(root) {
    var uid0 = K.uid('bd');
    singleTool(root, {
      uid: 'border',
      action: '生成',
      hint: '内边距用来给边框留白；圆角对内边距、边框与图片同时生效。',
      options: function () {
        return '<div class="form-row">' +
          '<div class="form-item"><label class="label" for="' + uid0 + '-w">边框宽度 px</label>' +
            '<input class="input" type="number" id="' + uid0 + '-w" value="16" min="0" max="200"></div>' +
          '<div class="form-item"><label class="label" for="' + uid0 + '-pad">内边距 px</label>' +
            '<input class="input" type="number" id="' + uid0 + '-pad" value="24" min="0" max="400"></div>' +
          '<div class="form-item"><label class="label" for="' + uid0 + '-r">圆角 px</label>' +
            '<input class="input" type="number" id="' + uid0 + '-r" value="24" min="0" max="400"></div>' +
          '<div class="form-item"><label class="label" for="' + uid0 + '-color">边框颜色</label>' +
            '<input class="input" type="color" id="' + uid0 + '-color" value="#5b5bd6"></div>' +
          '<div class="form-item"><label class="label" for="' + uid0 + '-bg">背景颜色</label>' +
            '<input class="input" type="color" id="' + uid0 + '-bg" value="#ffffff"></div>' +
        '</div>';
      },
      render: function (state, grid, setStatus) {
        var border = Math.max(0, Number(root.querySelector('#' + uid0 + '-w').value) || 0);
        var pad = Math.max(0, Number(root.querySelector('#' + uid0 + '-pad').value) || 0);
        var radius = Math.max(0, Number(root.querySelector('#' + uid0 + '-r').value) || 0);
        var color = root.querySelector('#' + uid0 + '-color').value;
        var bg = root.querySelector('#' + uid0 + '-bg').value;

        var img = state.img;
        var offset = pad + border;
        var canvas = K.canvas(img.naturalWidth + offset * 2, img.naturalHeight + offset * 2);
        if (canvas.width > MAX_SIDE || canvas.height > MAX_SIDE) {
          setStatus('err', '输出尺寸超过 ' + MAX_SIDE + 'px，请先缩小图片');
          return;
        }
        var ctx = canvas.getContext('2d');

        ctx.fillStyle = bg;
        roundRect(ctx, 0, 0, canvas.width, canvas.height, radius);
        ctx.fill();

        // 图片区域：按圆角裁切
        ctx.save();
        roundRect(ctx, offset, offset, img.naturalWidth, img.naturalHeight, Math.max(0, radius - border));
        ctx.clip();
        ctx.drawImage(img, offset, offset);
        ctx.restore();

        if (border > 0) {
          ctx.strokeStyle = color;
          ctx.lineWidth = border;
          roundRect(ctx, border / 2, border / 2, canvas.width - border, canvas.height - border, Math.max(0, radius - border / 2));
          ctx.stroke();
        }
        grid.innerHTML = '';
        grid.appendChild(makeCard('带边框图片', canvas, 'bordered.png', 'image/png',
          canvas.width + ' × ' + canvas.height + ' px'));
        setStatus('ok', '已生成边框，输出 ' + canvas.width + ' × ' + canvas.height + ' px');
      }
    });
  }

  /* ------------------------------ 2. 多图拼接 ------------------------------ */
  function renderCollage(root) {
    var uid = K.uid('col');
    root.innerHTML =
      '<label class="dropzone" for="' + uid + '-files">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 16v2.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V16"/></svg>' +
        '<span><strong>选择 2–9 张图片</strong>，或拖拽到此处</span>' +
        '<span>支持多选 · 建议尺寸接近，拼接效果更好</span>' +
        '<input type="file" id="' + uid + '-files" accept="image/*" multiple>' +
      '</label>' +
      '<div class="file-meta" id="' + uid + '-meta" hidden></div>' +
      '<div class="form-row">' +
        '<div class="form-item"><label class="label" for="' + uid + '-dir">拼接方向</label>' +
          '<select class="select" id="' + uid + '-dir">' +
            '<option value="h">横向拼接</option><option value="v">纵向拼接</option>' +
            '<option value="g2">2 列网格</option><option value="g3">3 列网格</option>' +
          '</select></div>' +
        '<div class="form-item"><label class="label" for="' + uid + '-gap">间距 px</label>' +
          '<input class="input" type="number" id="' + uid + '-gap" value="12" min="0" max="100"></div>' +
        '<div class="form-item"><label class="label" for="' + uid + '-bg">背景色</label>' +
          '<input class="input" type="color" id="' + uid + '-bg" value="#ffffff"></div>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="' + uid + '-run" disabled>拼接</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-sample">示例图片</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-reset">清除</button>' +
      '</div>' +
      '<div class="img-grid" id="' + uid + '-grid"></div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>';

    var input = root.querySelector('#' + uid + '-files');
    var zone = input.closest('.dropzone');
    var meta = root.querySelector('#' + uid + '-meta');
    var runBtn = root.querySelector('#' + uid + '-run');
    var grid = root.querySelector('#' + uid + '-grid');
    var statusEl = root.querySelector('#' + uid + '-status');
    var state = { items: [] };

    function setStatus(type, text) {
      if (!text) { statusEl.hidden = true; return; }
      statusEl.className = 'status ' + type;
      statusEl.textContent = text;
      statusEl.hidden = false;
    }

    function loadFiles(files) {
      var list = Array.prototype.slice.call(files).filter(function (f) { return /^image\//.test(f.type); }).slice(0, 9);
      if (!list.length) { K.toast('请选择图片文件', 'error'); return; }
      Promise.all(list.map(function (file) { return K.loadImage(file); })).then(function (handles) {
        state.items.forEach(function (item) { K.release(item.handle); });
        state.items = handles.map(function (handle) { return { img: handle.img, handle: handle }; });
        meta.hidden = false;
        meta.innerHTML = '<span class="name">' + state.items.length + ' 张图片</span>' +
          '<span>' + state.items.map(function (i) { return i.img.naturalWidth + '×' + i.img.naturalHeight; }).join(' / ') + '</span>';
        runBtn.disabled = state.items.length < 2;
        setStatus(state.items.length < 2 ? 'warn' : 'info', state.items.length < 2 ? '至少需要 2 张图片' : '已就绪，点击「拼接」');
      }).catch(function (error) {
        K.toast(error.message, 'error');
      });
    }

    function run() {
      var dir = root.querySelector('#' + uid + '-dir').value;
      var gap = Math.max(0, Number(root.querySelector('#' + uid + '-gap').value) || 0);
      var bg = root.querySelector('#' + uid + '-bg').value;
      var items = state.items;
      if (items.length < 2) { K.toast('请至少选择 2 张图片', 'warn'); return; }

      var canvas;
      var ctx;
      if (dir === 'h' || dir === 'v') {
        var common = dir === 'h'
          ? Math.min.apply(null, items.map(function (i) { return i.img.naturalHeight; }))
          : Math.min.apply(null, items.map(function (i) { return i.img.naturalWidth; }));
        var sizes = items.map(function (i) {
          return dir === 'h'
            ? { w: Math.round(i.img.naturalWidth * common / i.img.naturalHeight), h: common }
            : { w: common, h: Math.round(i.img.naturalHeight * common / i.img.naturalWidth) };
        });
        var totalW = dir === 'h' ? sizes.reduce(function (s, x) { return s + x.w; }, 0) + gap * (items.length - 1) : common;
        var totalH = dir === 'v' ? sizes.reduce(function (s, x) { return s + x.h; }, 0) + gap * (items.length - 1) : common;
        canvas = K.canvas(totalW, totalH);
        ctx = canvas.getContext('2d');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        var x = 0;
        var y = 0;
        items.forEach(function (item, i) {
          ctx.drawImage(item.img, x, y, sizes[i].w, sizes[i].h);
          if (dir === 'h') x += sizes[i].w + gap;
          else y += sizes[i].h + gap;
        });
      } else {
        var cols = dir === 'g2' ? 2 : 3;
        var rows = Math.ceil(items.length / cols);
        var cellW = Math.floor(Math.min(1200, Math.max.apply(null, items.map(function (i) { return i.img.naturalWidth; }))) / 1);
        var cellH = Math.round(cellW * 0.75);
        canvas = K.canvas(cols * cellW + gap * (cols + 1), rows * cellH + gap * (rows + 1));
        ctx = canvas.getContext('2d');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        items.forEach(function (item, i) {
          var cx = gap + (i % cols) * (cellW + gap);
          var cy = gap + Math.floor(i / cols) * (cellH + gap);
          // cover 裁剪，保持比例且填满单元格
          var scale = Math.max(cellW / item.img.naturalWidth, cellH / item.img.naturalHeight);
          var sw = cellW / scale;
          var sh = cellH / scale;
          ctx.drawImage(item.img, (item.img.naturalWidth - sw) / 2, (item.img.naturalHeight - sh) / 2, sw, sh, cx, cy, cellW, cellH);
        });
      }

      if (canvas.width > MAX_SIDE || canvas.height > MAX_SIDE) {
        setStatus('err', '输出尺寸 ' + canvas.width + '×' + canvas.height + ' 超过 ' + MAX_SIDE + 'px，请减少图片数量');
        return;
      }
      grid.innerHTML = '';
      grid.appendChild(makeCard('拼接结果', canvas, 'collage.png', 'image/png', canvas.width + ' × ' + canvas.height + ' px'));
      setStatus('ok', '已拼接 ' + items.length + ' 张图片');
    }

    function handleFiles(files) { loadFiles(files); }

    input.addEventListener('change', function () {
      handleFiles(input.files);
      input.value = '';
    });
    ['dragenter', 'dragover'].forEach(function (type) {
      zone.addEventListener(type, function (e) { e.preventDefault(); zone.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(function (type) {
      zone.addEventListener(type, function (e) { e.preventDefault(); zone.classList.remove('dragover'); });
    });
    zone.addEventListener('drop', function (e) {
      handleFiles(e.dataTransfer && e.dataTransfer.files);
    });
    runBtn.addEventListener('click', run);
    root.querySelector('#' + uid + '-sample').addEventListener('click', function () {
      Promise.all([demoFile(900, 700, '图 1'), demoFile(1100, 800, '图 2'), demoFile(800, 900, '图 3')])
        .then(function (files) { loadFiles(files); });
    });
    root.querySelector('#' + uid + '-reset').addEventListener('click', function () {
      state.items.forEach(function (item) { K.release(item.handle); });
      state.items = [];
      meta.hidden = true;
      meta.innerHTML = '';
      grid.innerHTML = '';
      runBtn.disabled = true;
      setStatus(null, '');
      K.toast('已清除', 'success');
    });
  }

  /* ------------------------------ 3. Base64 转图片 ------------------------------ */
  function renderBase64View(root) {
    var uid = 'b64v';
    root.innerHTML =
      '<div class="field"><div class="label-row"><label class="label" for="' + uid + '-src">Base64 / Data URI</label></div>' +
        '<textarea class="textarea mono" id="' + uid + '-src" rows="6" spellcheck="false" ' +
        'placeholder="data:image/png;base64,iVBORw0KGgo..."></textarea></div>' +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="' + uid + '-run">解析</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-sample">示例</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-clear">清空</button>' +
      '</div>' +
      '<div id="' + uid + '-out"></div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      '<p class="hint">支持带 data: 前缀或不带前缀的 Base64；解析后可直接下载为 PNG。</p>';

    var src = root.querySelector('#' + uid + '-src');
    var out = root.querySelector('#' + uid + '-out');
    var statusEl = root.querySelector('#' + uid + '-status');

    function setStatus(type, text) {
      if (!text) { statusEl.hidden = true; return; }
      statusEl.className = 'status ' + type;
      statusEl.textContent = text;
      statusEl.hidden = false;
    }

    function run() {
      var raw = src.value.trim();
      if (!raw) { K.toast('请先粘贴 Base64', 'warn'); src.focus(); return; }
      var match = raw.match(/^data:([^;,]+)?(;charset=[^;,]+)?(;base64)?,(.*)$/s);
      var mime = match ? (match[1] || 'image/png') : 'image/png';
      var data = match ? match[4] : raw;
      data = data.replace(/\s+/g, '');
      if (!/^[A-Za-z0-9+/=_-]+$/.test(data)) { setStatus('err', '内容不是合法的 Base64'); return; }
      var uri = 'data:' + mime + ';base64,' + data;

      var img = new Image();
      img.onload = function () {
        out.innerHTML = '';
        var card = document.createElement('div');
        card.className = 'img-card';
        card.innerHTML = '<div class="img-card-head"><span>预览</span><button type="button" class="link-btn">下载</button></div>' +
          '<div class="img-card-body"><img class="preview-canvas" alt="Base64 图片预览"></div>';
        var imgEl = card.querySelector('img');
        imgEl.src = uri;
        card.querySelector('button').addEventListener('click', function () {
          var a = document.createElement('a');
          a.href = uri;
          a.download = 'image.' + (mime.split('/')[1] || 'png').replace('jpeg', 'jpg');
          a.click();
          K.toast('已开始下载', 'success');
        });
        out.appendChild(card);
        out.appendChild(hintBlock('图片尺寸', img.naturalWidth + ' × ' + img.naturalHeight + ' px'));
        out.appendChild(hintBlock('MIME', mime));
        out.appendChild(hintBlock('Base64 长度', data.length + ' 字符（约 ' + K.formatBytes(Math.round(data.length * 3 / 4)) + '）'));
        setStatus('ok', '解析成功');
      };
      img.onerror = function () {
        out.innerHTML = '';
        setStatus('err', '无法解码，请检查 Base64 是否完整');
      };
      img.src = uri;
    }

    function hintBlock(key, value) {
      var div = document.createElement('p');
      div.className = 'hint';
      div.innerHTML = '<strong>' + K.esc(key) + '</strong>：<span class="mono">' + K.esc(value) + '</span>';
      return div;
    }

    root.querySelector('#' + uid + '-run').addEventListener('click', run);
    root.querySelector('#' + uid + '-clear').addEventListener('click', function () {
      src.value = '';
      out.innerHTML = '';
      setStatus(null, '');
      K.toast('已清空', 'success');
    });
    root.querySelector('#' + uid + '-sample').addEventListener('click', function () {
      demoFile(320, 200, 'Base64').then(function (file) {
        var reader = new FileReader();
        reader.onload = function () { src.value = reader.result; run(); };
        reader.readAsDataURL(file);
      });
    });
  }

  /* ------------------------------ 4. 马赛克 / 像素化 ------------------------------ */
  function renderMosaic(root) {
    var uid0 = K.uid('mos');
    singleTool(root, {
      uid: 'mosaic',
      action: '生成',
      hint: '先缩小再放大即可得到像素块效果；块越大越抽象，适合遮挡人脸或隐私信息。',
      options: function () {
        return '<div class="form-row">' +
          '<div class="form-item"><label class="label" for="' + uid0 + '-block">像素块大小</label>' +
            '<input class="input" type="range" id="' + uid0 + '-block" min="2" max="60" value="12" step="1">' +
            '<span class="label-meta" id="' + uid0 + '-block-val">12 px</span></div>' +
          '<div class="form-item"><label class="label" for="' + uid0 + '-mode">效果</label>' +
            '<select class="select" id="' + uid0 + '-mode">' +
              '<option value="mosaic">马赛克（像素块）</option>' +
              '<option value="blur">模糊（高斯近似）</option>' +
            '</select></div>' +
        '</div>';
      },
      render: function (state, grid, setStatus) {
        var blockEl = root.querySelector('#' + uid0 + '-block');
        var label = root.querySelector('#' + uid0 + '-block-val');
        var block = Number(blockEl.value);
        var mode = root.querySelector('#' + uid0 + '-mode').value;
        label.textContent = block + ' px';
        var img = state.img;

        var canvas = K.canvas(img.naturalWidth, img.naturalHeight);
        var ctx = canvas.getContext('2d');
        if (mode === 'mosaic') {
          var smallW = Math.max(1, Math.round(img.naturalWidth / block));
          var smallH = Math.max(1, Math.round(img.naturalHeight / block));
          var temp = K.canvas(smallW, smallH);
          temp.getContext('2d').drawImage(img, 0, 0, smallW, smallH);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(temp, 0, 0, canvas.width, canvas.height);
        } else {
          // 用低分辨率放大 + 平滑插值模拟模糊，避免逐像素卷积
          var w2 = Math.max(1, Math.round(img.naturalWidth / block * 2));
          var h2 = Math.max(1, Math.round(img.naturalHeight / block * 2));
          var temp2 = K.canvas(w2, h2);
          temp2.getContext('2d').drawImage(img, 0, 0, w2, h2);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(temp2, 0, 0, canvas.width, canvas.height);
        }
        grid.innerHTML = '';
        grid.appendChild(makeCard(mode === 'mosaic' ? '马赛克结果' : '模糊结果', canvas,
          mode === 'mosaic' ? 'mosaic.png' : 'blur.png', 'image/png', '像素块 ' + block + ' px'));
        setStatus('ok', '已应用' + (mode === 'mosaic' ? '马赛克' : '模糊') + '，块大小 ' + block + ' px');
      }
    });

    // 拖动滑块时实时更新数值
    var range = root.querySelector('#' + uid0 + '-block');
    var val = root.querySelector('#' + uid0 + '-block-val');
    range.addEventListener('input', function () { val.textContent = range.value + ' px'; });
  }

  /* ------------------------------ 5. 压缩到指定体积 ------------------------------ */
  function renderTargetSize(root) {
    var uid0 = K.uid('ts');
    singleTool(root, {
      uid: 'target',
      action: '压缩',
      hint: '通过二分查找质量参数逼近目标体积；若在最低质量下仍超出，会同时缩小尺寸。',
      options: function () {
        return '<div class="form-row">' +
          '<div class="form-item"><label class="label" for="' + uid0 + '-kb">目标体积 KB</label>' +
            '<input class="input" type="number" id="' + uid0 + '-kb" value="200" min="5" max="20000"></div>' +
          '<div class="form-item"><label class="label" for="' + uid0 + '-fmt">输出格式</label>' +
            '<select class="select" id="' + uid0 + '-fmt">' +
              '<option value="image/jpeg">JPEG</option><option value="image/webp">WebP</option>' +
            '</select></div>' +
        '</div>';
      },
      render: function (state, grid, setStatus) {
        var targetKb = Math.max(5, Number(root.querySelector('#' + uid0 + '-kb').value) || 200);
        var format = root.querySelector('#' + uid0 + '-fmt').value;
        var img = state.img;
        var targetBytes = targetKb * 1024;

        function encode(scale, quality) {
          var canvas = K.canvas(img.naturalWidth * scale, img.naturalHeight * scale);
          var ctx = canvas.getContext('2d');
          if (format === 'image/jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          return K.canvasBlob(canvas, format, quality).then(function (blob) {
            return { canvas: canvas, blob: blob };
          });
        }

        setStatus('info', '正在压缩…');
        var attempts = [];
        function search(scale) {
          var low = 0.05;
          var high = 0.95;
          var best = null;
          var round = 0;
          function step() {
            if (round >= 6) return Promise.resolve(best);
            round += 1;
            var q = (low + high) / 2;
            return encode(scale, q).then(function (result) {
              attempts.push({ q: q, size: result.blob ? result.blob.size : 0, scale: scale });
              if (!result.blob) return best;
              if (result.blob.size <= targetBytes) best = result;
              if (result.blob.size > targetBytes) high = q;
              else low = q;
              return step();
            });
          }
          return step();
        }

        search(1).then(function (best) {
          if (best) return best;
          // 质量压到最低仍超标，按面积比例缩小尺寸再试
          var ratio = Math.sqrt(targetBytes / (attempts[0].size || targetBytes)) * 0.95;
          return search(Math.max(0.1, Math.min(1, ratio)));
        }).then(function (best) {
          if (!best) { setStatus('err', '压缩失败，请换一张图片试试'); return; }
          grid.innerHTML = '';
          grid.appendChild(makeCard('压缩结果', best.canvas,
            'compressed.' + (format === 'image/webp' ? 'webp' : 'jpg'), format,
            K.formatBytes(best.blob.size) + ' · 目标 ' + targetKb + ' KB'));
          setStatus('ok', '输出 ' + K.formatBytes(best.blob.size) + '，目标 ' + targetKb + ' KB' +
            (best.blob.size > targetBytes ? '（已尽力，仍未达标）' : ''));
        }).catch(function (error) {
          setStatus('err', '压缩失败：' + (error.message || '未知错误'));
        });
      }
    });
  }

  /* ------------------------------ 6. 批量缩放 ------------------------------ */
  function renderBatchResize(root) {
    var uid = K.uid('batch');
    root.innerHTML =
      '<label class="dropzone" for="' + uid + '-files">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 16v2.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V16"/></svg>' +
        '<span><strong>批量选择图片</strong>，或拖拽到此处</span>' +
        '<span>一次最多处理 20 张 · 全部在本地完成</span>' +
        '<input type="file" id="' + uid + '-files" accept="image/*" multiple>' +
      '</label>' +
      '<div class="form-row">' +
        '<div class="form-item"><label class="label" for="' + uid + '-w">最大宽度 px</label>' +
          '<input class="input" type="number" id="' + uid + '-w" value="1280" min="16" max="6000"></div>' +
        '<div class="form-item"><label class="label" for="' + uid + '-h">最大高度 px</label>' +
          '<input class="input" type="number" id="' + uid + '-h" value="1280" min="16" max="6000"></div>' +
        '<div class="form-item"><label class="label" for="' + uid + '-q">质量</label>' +
          '<input class="input" type="number" id="' + uid + '-q" value="0.85" min="0.1" max="1" step="0.05"></div>' +
        '<div class="form-item"><label class="label" for="' + uid + '-fmt">格式</label>' +
          '<select class="select" id="' + uid + '-fmt">' +
            '<option value="image/jpeg">JPEG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option>' +
          '</select></div>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="' + uid + '-run" disabled>批量处理</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-reset">清除</button>' +
      '</div>' +
      '<div class="img-grid" id="' + uid + '-grid"></div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      '<p class="hint">超出最大宽高的图片会等比缩小，小于限制的保持原尺寸；每张结果可单独下载。</p>';

    var input = root.querySelector('#' + uid + '-files');
    var zone = input.closest('.dropzone');
    var runBtn = root.querySelector('#' + uid + '-run');
    var grid = root.querySelector('#' + uid + '-grid');
    var statusEl = root.querySelector('#' + uid + '-status');
    var items = [];

    function setStatus(type, text) {
      if (!text) { statusEl.hidden = true; return; }
      statusEl.className = 'status ' + type;
      statusEl.textContent = text;
      statusEl.hidden = false;
    }

    function loadFiles(files) {
      var list = Array.prototype.slice.call(files).filter(function (f) { return /^image\//.test(f.type); }).slice(0, 20);
      if (!list.length) { K.toast('请选择图片文件', 'error'); return; }
      Promise.all(list.map(function (file) { return K.loadImage(file); })).then(function (handles) {
        items.forEach(function (item) { K.release(item.handle); });
        items = handles.map(function (handle) { return { img: handle.img, handle: handle, name: handle.img.alt || '' }; });
        // 用文件名标注（Image 对象没有名字，这里按顺序生成）
        items.forEach(function (item, i) { item.name = 'image-' + (i + 1); });
        runBtn.disabled = false;
        setStatus('info', '已加载 ' + items.length + ' 张图片，点击「批量处理」');
      }).catch(function (error) {
        K.toast(error.message, 'error');
      });
    }

    function run() {
      if (!items.length) return;
      var maxW = Math.max(16, Number(root.querySelector('#' + uid + '-w').value) || 1280);
      var maxH = Math.max(16, Number(root.querySelector('#' + uid + '-h').value) || 1280);
      var quality = Math.min(1, Math.max(0.1, Number(root.querySelector('#' + uid + '-q').value) || 0.85));
      var format = root.querySelector('#' + uid + '-fmt').value;
      grid.innerHTML = '';
      setStatus('info', '正在处理 ' + items.length + ' 张图片…');

      var done = 0;
      var totalBefore = 0;
      var totalAfter = 0;
      items.forEach(function (item, index) {
        var scale = Math.min(1, maxW / item.img.naturalWidth, maxH / item.img.naturalHeight);
        var canvas = K.canvas(item.img.naturalWidth * scale, item.img.naturalHeight * scale);
        var ctx = canvas.getContext('2d');
        if (format === 'image/jpeg') {
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(item.img, 0, 0, canvas.width, canvas.height);
        K.canvasBlob(canvas, format, quality).then(function (blob) {
          done += 1;
          totalBefore += item.handle.img.naturalWidth * item.handle.img.naturalHeight;
          totalAfter += canvas.width * canvas.height;
          var ext = format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png';
          grid.appendChild(makeCard(item.name + '.' + ext, canvas, item.name + '.' + ext, format,
            canvas.width + ' × ' + canvas.height + ' px · ' + (blob ? K.formatBytes(blob.size) : '—')));
          if (done === items.length) {
            setStatus('ok', '已完成 ' + done + ' 张，像素总量 ' + K.formatBytes(totalBefore) + ' → ' + K.formatBytes(totalAfter));
          }
        });
      });
    }

    input.addEventListener('change', function () { loadFiles(input.files); input.value = ''; });
    ['dragenter', 'dragover'].forEach(function (type) {
      zone.addEventListener(type, function (e) { e.preventDefault(); zone.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(function (type) {
      zone.addEventListener(type, function (e) { e.preventDefault(); zone.classList.remove('dragover'); });
    });
    zone.addEventListener('drop', function (e) { loadFiles(e.dataTransfer && e.dataTransfer.files); });
    runBtn.addEventListener('click', run);
    root.querySelector('#' + uid + '-reset').addEventListener('click', function () {
      items.forEach(function (item) { K.release(item.handle); });
      items = [];
      grid.innerHTML = '';
      runBtn.disabled = true;
      setStatus(null, '');
      K.toast('已清除', 'success');
    });
  }

  /* ------------------------------ 7. 主色提取 ------------------------------ */
  function renderPalette(root) {
    singleTool(root, {
      uid: 'palette',
      action: '提取主色',
      hint: '把颜色量化到 4 bit/通道后统计出现频率，取前 8 个作为主色；点击色块即可复制 HEX。',
      options: function () {
        return '<div class="form-row">' +
          '<div class="form-item"><label class="label" for="imgp-count">颜色数量</label>' +
            '<select class="select" id="imgp-count">' +
              '<option value="6">6 种</option><option value="8" selected>8 种</option><option value="12">12 种</option>' +
            '</select></div>' +
        '</div>';
      },
      render: function (state, grid, setStatus) {
        var count = Number(root.querySelector('#imgp-count').value) || 8;
        var img = state.img;
        var w = Math.min(400, img.naturalWidth);
        var h = Math.max(1, Math.round(img.naturalHeight * w / img.naturalWidth));
        var canvas = K.canvas(w, h);
        var ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        var data = ctx.getImageData(0, 0, w, h).data;

        var buckets = {};
        var total = 0;
        for (var i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue;
          var r = data[i] >> 4;
          var g = data[i + 1] >> 4;
          var b = data[i + 2] >> 4;
          var key = (r << 8) | (g << 4) | b;
          if (!buckets[key]) buckets[key] = { r: 0, g: 0, b: 0, n: 0 };
          buckets[key].r += data[i];
          buckets[key].g += data[i + 1];
          buckets[key].b += data[i + 2];
          buckets[key].n += 1;
          total += 1;
        }
        var list = Object.keys(buckets).map(function (k) {
          var b = buckets[k];
          return {
            r: Math.round(b.r / b.n),
            g: Math.round(b.g / b.n),
            b: Math.round(b.b / b.n),
            n: b.n
          };
        }).sort(function (x, y) { return y.n - x.n; }).slice(0, count);

        function hex(c) {
          return '#' + [c.r, c.g, c.b].map(function (v) { return v.toString(16).padStart(2, '0'); }).join('');
        }

        grid.innerHTML = '';
        var wrap = document.createElement('div');
        wrap.className = 'palette-result';
        wrap.innerHTML = '<div class="palette-grid palette-grid-lg">' + list.map(function (c) {
          var hx = hex(c);
          return '<button type="button" class="palette-item" data-hex="' + hx + '" title="点击复制 ' + hx + '">' +
            '<span class="swatch" style="background:' + hx + '"></span>' +
            '<span class="palette-hex">' + hx.toUpperCase() + '</span>' +
            '<span class="palette-rgb">' + (c.n / total * 100).toFixed(1) + '%</span></button>';
        }).join('') + '</div>';
        wrap.querySelectorAll('.palette-item').forEach(function (btn) {
          btn.addEventListener('click', function () {
            window.UI.copyText(btn.getAttribute('data-hex'));
          });
        });
        grid.appendChild(wrap);

        // 色板条：按占比绘制，便于直观感受配色
        var strip = K.canvas(600, 60);
        var sctx = strip.getContext('2d');
        var acc = 0;
        list.forEach(function (c, i) {
          var start = acc;
          acc += c.n / total;
          sctx.fillStyle = hex(c);
          sctx.fillRect(start * 600, 0, Math.ceil((acc - start) * 600) + 1, 60);
          if (i === list.length - 1) acc = 1;
        });
        grid.appendChild(makeCard('配色占比', strip, 'palette.png', 'image/png', '按面积占比排列'));
        setStatus('ok', '提取出 ' + list.length + ' 个主色，点击色块可复制');
      }
    });
  }

  /* ------------------------------ 8. 生成 ICO ------------------------------ */
  function renderIco(root) {
    singleTool(root, {
      uid: 'ico',
      action: '生成 ICO',
      hint: 'ICO 内嵌多个尺寸的 PNG（16/32/48/64/128/256），可直接作为 favicon.ico 使用。',
      options: function () {
        return '<p class="hint" style="margin:0 0 8px">建议先选择正方形图片，非正方形会被居中裁切。</p>';
      },
      render: function (state, grid, setStatus) {
        var img = state.img;
        var sizes = [16, 32, 48, 64, 128, 256];
        setStatus('info', '正在生成多种尺寸…');

        Promise.all(sizes.map(function (size) {
          var canvas = K.canvas(size, size);
          var ctx = canvas.getContext('2d');
          var side = Math.min(img.naturalWidth, img.naturalHeight);
          var sx = (img.naturalWidth - side) / 2;
          var sy = (img.naturalHeight - side) / 2;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
          return K.canvasBlob(canvas, 'image/png').then(function (blob) {
            return blob.arrayBuffer().then(function (buffer) {
              return { size: size, bytes: new Uint8Array(buffer), canvas: canvas };
            });
          });
        })).then(function (entries) {
          var headerSize = 6 + entries.length * 16;
          var totalSize = headerSize + entries.reduce(function (s, e) { return s + e.bytes.length; }, 0);
          var buffer = new ArrayBuffer(totalSize);
          var view = new DataView(buffer);
          var offset = 0;
          view.setUint16(0, 0, true);       // reserved
          view.setUint16(2, 1, true);       // type: icon
          view.setUint16(4, entries.length, true);
          offset = 6;
          var dataOffset = headerSize;
          entries.forEach(function (entry) {
            view.setUint8(offset, entry.size >= 256 ? 0 : entry.size);
            view.setUint8(offset + 1, entry.size >= 256 ? 0 : entry.size);
            view.setUint8(offset + 2, 0);   // palette
            view.setUint8(offset + 3, 0);   // reserved
            view.setUint16(offset + 4, 1, true);
            view.setUint16(offset + 6, 32, true); // bpp
            view.setUint32(offset + 8, entry.bytes.length, true);
            view.setUint32(offset + 12, dataOffset, true);
            offset += 16;
            dataOffset += entry.bytes.length;
          });
          var bytes = new Uint8Array(buffer);
          var cursor = headerSize;
          entries.forEach(function (entry) {
            bytes.set(entry.bytes, cursor);
            cursor += entry.bytes.length;
          });
          var blob = new Blob([bytes], { type: 'image/x-icon' });
          var url = URL.createObjectURL(blob);

          grid.innerHTML = '';
          var card = document.createElement('div');
          card.className = 'img-card';
          card.innerHTML = '<div class="img-card-head"><span>favicon.ico</span>' +
            '<button type="button" class="link-btn">下载</button></div>' +
            '<div class="img-card-body ico-body"></div>' +
            '<p class="hint" style="margin:0 12px 10px">' + sizes.join(' / ') + ' px · ' + K.formatBytes(blob.size) + '</p>';
          var body = card.querySelector('.img-card-body');
          entries.slice().reverse().forEach(function (entry) {
            var c = entry.canvas;
            c.className = 'ico-preview';
            body.appendChild(c);
          });
          card.querySelector('button').addEventListener('click', function () {
            window.UI.downloadBlob(blob, 'favicon.ico');
            K.toast('已导出 favicon.ico', 'success');
          });
          grid.appendChild(card);
          URL.revokeObjectURL(url);
          setStatus('ok', '已生成 ' + entries.length + ' 个尺寸的 ICO，共 ' + K.formatBytes(blob.size));
        }).catch(function (error) {
          setStatus('err', '生成失败：' + (error.message || '未知错误'));
        });
      }
    });
  }

  /* ------------------------------ 9. 图片对比 ------------------------------ */
  function renderCompare(root) {
    var uid = 'cmp';
    root.innerHTML =
      '<div class="cmp-inputs">' +
        '<label class="dropzone cmp-zone" for="' + uid + '-a">' +
          '<span><strong>图片 A</strong></span><span>点击或拖拽</span>' +
          '<input type="file" id="' + uid + '-a" accept="image/*">' +
        '</label>' +
        '<label class="dropzone cmp-zone" for="' + uid + '-b">' +
          '<span><strong>图片 B</strong></span><span>点击或拖拽</span>' +
          '<input type="file" id="' + uid + '-b" accept="image/*">' +
        '</label>' +
      '</div>' +
      '<div id="' + uid + '-stage"></div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      '<p class="hint">两张图片会等比缩放到同一宽度叠加显示，拖动滑块可左右擦除对比；若尺寸一致，还会统计像素差异比例。</p>';

    var stateA = null;
    var stateB = null;
    var stage = root.querySelector('#' + uid + '-stage');
    var statusEl = root.querySelector('#' + uid + '-status');

    function setStatus(type, text) {
      if (!text) { statusEl.hidden = true; return; }
      statusEl.className = 'status ' + type;
      statusEl.textContent = text;
      statusEl.hidden = false;
    }

    function bind(id, key) {
      var input = root.querySelector('#' + id);
      var zone = input.closest('.dropzone');
      function handle(file) {
        if (!file) return;
        K.loadImage(file).then(function (handle) {
          if (key === 'a') {
            if (stateA) K.release(stateA.handle);
            stateA = { img: handle.img, handle: handle, file: file };
          } else {
            if (stateB) K.release(stateB.handle);
            stateB = { img: handle.img, handle: handle, file: file };
          }
          zone.querySelector('span:last-of-type').textContent =
            handle.img.naturalWidth + '×' + handle.img.naturalHeight + ' · ' + K.formatBytes(file.size);
          render();
        }).catch(function (error) { K.toast(error.message, 'error'); });
      }
      input.addEventListener('change', function () { handle(input.files[0]); input.value = ''; });
      ['dragenter', 'dragover'].forEach(function (t) {
        zone.addEventListener(t, function (e) { e.preventDefault(); zone.classList.add('dragover'); });
      });
      ['dragleave', 'drop'].forEach(function (t) {
        zone.addEventListener(t, function (e) { e.preventDefault(); zone.classList.remove('dragover'); });
      });
      zone.addEventListener('drop', function (e) { handle(e.dataTransfer && e.dataTransfer.files[0]); });
    }

    function render() {
      if (!stateA || !stateB) return;
      var a = stateA.img;
      var b = stateB.img;
      stage.innerHTML = '';
      var wrap = document.createElement('div');
      wrap.className = 'compare-stage';
      wrap.innerHTML = '<img class="cmp-img" alt="图片 A"><img class="cmp-img cmp-top" alt="图片 B">' +
        '<input type="range" class="cmp-range" min="0" max="100" value="50" aria-label="对比位置">' +
        '<span class="cmp-tag cmp-tag-a">A</span><span class="cmp-tag cmp-tag-b">B</span>';
      var imgA = wrap.querySelectorAll('img')[0];
      var imgB = wrap.querySelectorAll('img')[1];
      imgA.src = stateA.handle.url;
      imgB.src = stateB.handle.url;
      var range = wrap.querySelector('.cmp-range');
      range.addEventListener('input', function () {
        imgB.style.clipPath = 'inset(0 0 0 ' + range.value + '%)';
      });
      imgB.style.clipPath = 'inset(0 0 0 50%)';
      stage.appendChild(wrap);

      var info = document.createElement('p');
      info.className = 'hint';
      info.innerHTML = '<strong>A</strong> ' + a.naturalWidth + '×' + a.naturalHeight +
        ' · <strong>B</strong> ' + b.naturalWidth + '×' + b.naturalHeight;
      stage.appendChild(info);

      if (a.naturalWidth === b.naturalWidth && a.naturalHeight === b.naturalHeight) {
        var w = Math.min(600, a.naturalWidth);
        var h = Math.round(a.naturalHeight * w / a.naturalWidth);
        var canvasA = K.canvas(w, h);
        var canvasB = K.canvas(w, h);
        var ctxA = canvasA.getContext('2d', { willReadFrequently: true });
        var ctxB = canvasB.getContext('2d', { willReadFrequently: true });
        ctxA.drawImage(a, 0, 0, w, h);
        ctxB.drawImage(b, 0, 0, w, h);
        var da = ctxA.getImageData(0, 0, w, h).data;
        var db = ctxB.getImageData(0, 0, w, h).data;
        var diff = 0;
        var totalPx = w * h;
        for (var i = 0; i < da.length; i += 4) {
          if (Math.abs(da[i] - db[i]) > 12 || Math.abs(da[i + 1] - db[i + 1]) > 12 || Math.abs(da[i + 2] - db[i + 2]) > 12) {
            diff += 1;
          }
        }
        var pct = diff / totalPx * 100;
        info.innerHTML += ' · 像素差异 <strong>' + pct.toFixed(2) + '%</strong>';
        setStatus(pct < 0.5 ? 'ok' : 'warn', pct < 0.5 ? '两张图几乎一致' : '差异像素占比 ' + pct.toFixed(2) + '%');
      } else {
        setStatus('info', '尺寸不同，仅做视觉对比（不做像素差异统计）');
      }
    }

    bind(uid + '-a', 'a');
    bind(uid + '-b', 'b');
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['image-border'] = renderBorder;
  window.ToolModules['image-collage'] = renderCollage;
  window.ToolModules['image-base64-view'] = renderBase64View;
  window.ToolModules['image-mosaic'] = renderMosaic;
  window.ToolModules['image-target-size'] = renderTargetSize;
  window.ToolModules['image-batch-resize'] = renderBatchResize;
  window.ToolModules['image-palette'] = renderPalette;
  window.ToolModules['image-ico'] = renderIco;
  window.ToolModules['image-compare'] = renderCompare;
})();
