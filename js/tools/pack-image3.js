/* =============================================================================
 * 图片处理工具包 · 第三批（9 个）
 * -----------------------------------------------------------------------------
 * image-format-convert 格式转换
 * image-ascii          ASCII 字符画
 * image-pixel-art      像素风
 * image-tint           颜色叠加
 * image-noise          噪点纹理
 * image-vignette       暗角效果
 * image-gradient-gen   渐变图生成
 * image-pattern        图案生成
 * image-histogram      直方图
 *
 * 全部基于 Canvas 本地处理，不上传原图。
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  /** 图片类工具通用脚手架：上传 → 预览 → 处理 → 下载 */
  function singleTool(root, cfg) {
    var uid = K.uid('img3');
    root.innerHTML =
      K.dropzone(uid) +
      '<div id="' + uid + '-opts" class="form-row" style="margin-top:14px"></div>' +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="' + uid + '-apply">' + K.esc(cfg.actionLabel || '处理') + '</button>' +
        (cfg.hideDownload ? '' : '<button type="button" class="btn ghost" id="' + uid + '-download">下载结果</button>') +
      '</div>' +
      '<div class="img-stage" id="' + uid + '-stage"></div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      (cfg.hint ? '<p class="hint">' + cfg.hint + '</p>' : '');

    var stage = root.querySelector('#' + uid + '-stage');
    var optsBox = root.querySelector('#' + uid + '-opts');
    var statusEl = root.querySelector('#' + uid + '-status');
    var controls = {};
    var current = null; // 当前 canvas

    // 生成选项控件（复用 Kit 的 field 结构，带简化版读取）
    var fieldDefs = cfg.fields || [];
    optsBox.innerHTML = fieldDefs.map(function (f) {
      var id = uid + '-' + f.id;
      if (f.type === 'select') {
        return '<div class="form-item"><label class="label" for="' + id + '">' + K.esc(f.label) + '</label>' +
          '<select class="select" id="' + id + '">' + f.options.map(function (o) {
            return '<option value="' + K.esc(o.value) + '"' + (o.value === f.value ? ' selected' : '') + '>' + K.esc(o.label) + '</option>';
          }).join('') + '</select></div>';
      }
      if (f.type === 'checkbox') {
        return '<div class="form-item" style="flex:0 0 auto"><label class="check" style="margin-top:22px">' +
          '<input type="checkbox" id="' + id + '"' + (f.value ? ' checked' : '') + '><span>' + K.esc(f.label) + '</span></label></div>';
      }
      if (f.type === 'color') {
        return '<div class="form-item"><label class="label" for="' + id + '">' + K.esc(f.label) + '</label>' +
          '<input class="input" style="height:44px;padding:4px" type="color" id="' + id + '" value="' + K.esc(f.value || '#333333') + '"></div>';
      }
      return '<div class="form-item"><label class="label" for="' + id + '">' + K.esc(f.label) + '</label>' +
        '<input class="input mono" type="number" id="' + id + '" value="' + K.esc(f.value === undefined ? '' : f.value) + '"' +
        (f.min !== undefined ? ' min="' + f.min + '"' : '') +
        (f.max !== undefined ? ' max="' + f.max + '"' : '') +
        (f.step !== undefined ? ' step="' + f.step + '"' : '') + '></div>';
    }).join('');

    fieldDefs.forEach(function (f) {
      var node = root.querySelector('#' + uid + '-' + f.id);
      controls[f.id] = f.type === 'checkbox' ? { checked: node.checked, node: node } : { value: node.value, node: node };
      node.addEventListener('change', function () {
        controls[f.id] = f.type === 'checkbox' ? { checked: node.checked, node: node } : { value: node.value, node: node };
        if (cfg.live) apply();
      });
      if (f.type === 'color' || f.type === 'range') node.addEventListener('input', function () {
        controls[f.id] = { value: node.value, node: node };
        if (cfg.live) apply();
      });
    });

    function values() {
      var out = {};
      fieldDefs.forEach(function (f) {
        out[f.id] = f.type === 'checkbox' ? controls[f.id].checked : controls[f.id].value;
      });
      return out;
    }

    function setStatus(type, text) {
      if (!text) { statusEl.hidden = true; return; }
      statusEl.className = 'status ' + type;
      statusEl.textContent = text;
      statusEl.hidden = false;
    }

    function showCanvas(canvas) {
      current = canvas;
      stage.innerHTML = '';
      var wrap = document.createElement('div');
      wrap.className = 'img-card';
      var copy = document.createElement('canvas');
      var scale = Math.min(1, 720 / Math.max(canvas.width, canvas.height));
      copy.width = Math.max(1, Math.round(canvas.width * scale));
      copy.height = Math.max(1, Math.round(canvas.height * scale));
      copy.getContext('2d').drawImage(canvas, 0, 0, copy.width, copy.height);
      copy.style.maxWidth = '100%';
      wrap.appendChild(copy);
      stage.appendChild(wrap);
    }

    function apply() {
      if (!current) return;
      try {
        var canvas = cfg.process(current, values());
        if (canvas && canvas.tagName === 'CANVAS') showCanvas(canvas);
        else if (canvas && canvas.html) {
          stage.innerHTML = canvas.html;
          if (canvas.after) canvas.after(stage);
          current = canvas.canvas || current;
        }
        setStatus('ok', '处理完成');
      } catch (e) {
        setStatus('err', '处理失败：' + (e.message || '未知错误'));
      }
    }

    K.bindFile(root, uid, function (file) {
      setStatus('info', '读取图片…');
      K.loadImage(file).then(function (handle) {
        var canvas = K.canvas(handle.img.naturalWidth, handle.img.naturalHeight);
        canvas.getContext('2d').drawImage(handle.img, 0, 0);
        K.release(handle);
        current = canvas;
        apply();
      }).catch(function (e) {
        setStatus('err', e.message || '图片读取失败');
      });
    });

    root.querySelector('#' + uid + '-apply').addEventListener('click', apply);
    var downloadBtn = root.querySelector('#' + uid + '-download');
    if (downloadBtn) downloadBtn.addEventListener('click', function () {
      if (!current) { K.toast('请先上传并处理图片', 'warn'); return; }
      K.saveCanvas(current, cfg.filename || 'tool-output.png');
    });
    return { values: values };
  }

  /* ------------------------------ 1. 格式转换 ------------------------------ */
  function renderFormatConvert(root) {
    K.form(root, {
      uid: 'fmtconvert',
      actionLabel: '加载图片',
      fields: [
        { id: 'format', label: '目标格式', type: 'select', value: 'image/webp',
          options: [{ value: 'image/webp', label: 'WebP（体积最小）' }, { value: 'image/jpeg', label: 'JPEG' }, { value: 'image/png', label: 'PNG（无损）' }] },
        { id: 'quality', label: '质量（JPEG / WebP）', type: 'number', value: 85, min: 10, max: 100 }
      ],
      hint: '转为 JPEG 会丢透明通道（透明区变白）；PNG 无损但体积大。',
      run: function (v) {
        void v;
        return { html: '<p class="hint">先选择图片，转换结果会显示在下方，可直接下载。</p>', note: '' };
      }
    });
    // 借用脚手架：追加到已有的表单后面比较复杂，这里直接用独立 UI
    buildConvertPanel(root);
  }

  function buildConvertPanel(root) {
    var uid = K.uid('fmt');
    var box = document.createElement('div');
    box.innerHTML = K.dropzone(uid) +
      '<div class="btn-row"><button type="button" class="btn primary" id="' + uid + '-go">转换并下载</button></div>' +
      '<div id="' + uid + '-result"></div>';
    root.appendChild(box);
    var resultBox = box.querySelector('#' + uid + '-result');
    var fileInput = box.querySelector('#' + uid + '-file');
    var loaded = null;
    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      fileInput.value = '';
      if (!file) return;
      loaded = file;
      var url = URL.createObjectURL(file);
      resultBox.innerHTML = '<div class="img-card"><img src="' + url + '" style="max-width:100%" alt="预览"></div>' +
        '<p class="hint">原文件：' + K.esc(file.name) + '（' + K.formatBytes(file.size) + '）</p>';
    });
    box.querySelector('#' + uid + '-go').addEventListener('click', function () {
      if (!loaded) { K.toast('请先选择图片', 'warn'); return; }
      var select = root.querySelector('select');
      var quality = Number((root.querySelector('input[type=number]') || {}).value) || 85;
      var format = select ? select.value : 'image/webp';
      var img = resultBox.querySelector('img');
      if (!img || !img.naturalWidth) { K.toast('图片还没加载完成', 'warn'); return; }
      var canvas = K.canvas(img.naturalWidth, img.naturalHeight);
      var ctx = canvas.getContext('2d');
      if (format === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      ctx.drawImage(img, 0, 0);
      var ext = format === 'image/webp' ? 'webp' : format === 'image/png' ? 'png' : 'jpg';
      K.saveCanvas(canvas, 'converted.' + ext, format, quality / 100);
    });
  }

  /* ------------------------------ 2. ASCII 字符画 ------------------------------ */
  var ASCII_RAMPS = {
    dense: '@%#*+=-:. ',
    simple: '#+. ',
    blocks: '█▓▒░ ',
    dot: '⣿⣷⣯⣟⡿⢿⣻⣽⣾ '
  };

  function renderImageAscii(root) {
    singleTool(root, {
      actionLabel: '生成字符画',
      filename: 'ascii-art.txt',
      fields: [
        { id: 'cols', label: '横向字符数', type: 'number', value: 96, min: 20, max: 300 },
        { id: 'ramp', label: '字符梯度', type: 'select', value: 'dense',
          options: [{ value: 'dense', label: '细密 @%#*+=-:.' }, { value: 'simple', label: '简洁 #+. ' }, { value: 'blocks', label: '方块 █▓▒░' }, { value: 'dot', label: '盲文点阵' }] },
        { id: 'invert', label: '反相（浅底深字时勾选）', type: 'checkbox' }
      ],
      hint: '字符画按字符宽高比 1:2 修正，直接复制文本到等宽字体编辑器即可查看。',
      hideDownload: true,
      process: function (canvas, v) {
        var cols = Math.max(20, Math.min(300, Number(v.cols) || 96));
        var ramp = ASCII_RAMPS[v.ramp] || ASCII_RAMPS.dense;
        if (v.invert) ramp = ramp.split('').reverse().join('');
        var rows = Math.round(canvas.height / canvas.width * cols * 0.5);
        var small = K.canvas(cols, rows);
        var ctx = small.getContext('2d');
        ctx.drawImage(canvas, 0, 0, cols, rows);
        var data = ctx.getImageData(0, 0, cols, rows).data;
        var lines = [];
        for (var y = 0; y < rows; y += 1) {
          var line = '';
          for (var x = 0; x < cols; x += 1) {
            var i = (y * cols + x) * 4;
            var lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
            var alpha = data[i + 3] / 255;
            var level = Math.round((lum / 255 * alpha + (1 - alpha)) * (ramp.length - 1));
            line += ramp[level];
          }
          lines.push(line);
        }
        var text = lines.join('\n');
        return { html: '<pre class="code-block" style="font-size:7px;line-height:7px">' + K.esc(text) + '</pre>' +
          '<div class="btn-row"><button type="button" class="btn ghost" data-copy="' + K.esc(text) + '">复制字符画文本</button></div>', canvas: canvas };
      }
    });
  }

  /* ------------------------------ 3. 像素风 ------------------------------ */
  function renderPixelArt(root) {
    singleTool(root, {
      actionLabel: '像素化',
      fields: [
        { id: 'block', label: '像素块大小', type: 'number', value: 8, min: 2, max: 64 },
        { id: 'colors', label: '调色板颜色数（0 = 不量化）', type: 'select', value: '16',
          options: [{ value: '0', label: '不量化' }, { value: '32', label: '32 色' }, { value: '16', label: '16 色' }, { value: '8', label: '8 色' }, { value: '4', label: '4 色' }] },
        { id: 'scale', label: '输出尺寸放大倍数', type: 'number', value: 4, min: 1, max: 8 }
      ],
      hint: '先缩小再放大（关闭平滑）得到马赛克像素质感；调色板量化可模拟复古游戏机配色。',
      process: function (canvas, v) {
        var block = Math.max(2, Math.min(64, Number(v.block) || 8));
        var scale = Math.max(1, Math.min(8, Number(v.scale) || 4));
        var colors = Number(v.colors) || 0;
        var w = Math.max(1, Math.floor(canvas.width / block));
        var h = Math.max(1, Math.floor(canvas.height / block));
        var small = K.canvas(w, h);
        var sctx = small.getContext('2d');
        sctx.imageSmoothingEnabled = true;
        sctx.drawImage(canvas, 0, 0, w, h);
        var img = sctx.getImageData(0, 0, w, h);
        if (colors > 0) {
          var levels = Math.max(2, Math.round(Math.cbrt(colors))); // 每通道级数
          var d = img.data;
          for (var i = 0; i < d.length; i += 4) {
            d[i] = Math.round(d[i] / 255 * (levels - 1)) * Math.round(255 / (levels - 1));
            d[i + 1] = Math.round(d[i + 1] / 255 * (levels - 1)) * Math.round(255 / (levels - 1));
            d[i + 2] = Math.round(d[i + 2] / 255 * (levels - 1)) * Math.round(255 / (levels - 1));
          }
        }
        sctx.putImageData(img, 0, 0);
        var out = K.canvas(w * scale, h * scale);
        var octx = out.getContext('2d');
        octx.imageSmoothingEnabled = false; // 关键：最近邻放大
        octx.drawImage(small, 0, 0, out.width, out.height);
        return out;
      }
    });
  }

  /* ------------------------------ 4. 颜色叠加 ------------------------------ */
  function renderImageTint(root) {
    singleTool(root, {
      actionLabel: '叠加颜色',
      live: true,
      fields: [
        { id: 'color', label: '叠加颜色', type: 'color', value: '#ff6600' },
        { id: 'opacity', label: '不透明度（%）', type: 'number', value: 40, min: 1, max: 100 },
        { id: 'blend', label: '混合模式', type: 'select', value: 'multiply',
          options: [{ value: 'multiply', label: 'multiply 正片叠底（变暗）' }, { value: 'screen', label: 'screen 滤色（变亮）' }, { value: 'overlay', label: 'overlay 叠加' }, { value: 'color', label: 'color 上色（保留明暗）' }, { value: 'hue', label: 'hue 色相替换' }] }
      ],
      hint: '相当于 PS 的「颜色叠加」图层；color 模式最适合做单色调（duotone）海报底图。',
      process: function (canvas, v) {
        var out = K.canvas(canvas.width, canvas.height);
        var ctx = out.getContext('2d');
        ctx.drawImage(canvas, 0, 0);
        ctx.globalCompositeOperation = v.blend;
        ctx.globalAlpha = Math.max(1, Math.min(100, Number(v.opacity) || 40)) / 100;
        ctx.fillStyle = v.color;
        ctx.fillRect(0, 0, out.width, out.height);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        return out;
      }
    });
  }

  /* ------------------------------ 5. 噪点纹理 ------------------------------ */
  function renderImageNoise(root) {
    // 噪点不需要上传图片，走独立表单
    K.form(root, {
      uid: 'noise',
      actionLabel: '生成噪点图',
      fields: [
        { id: 'width', label: '宽度', type: 'number', value: 800, min: 16, max: 4096 },
        { id: 'height', label: '高度', type: 'number', value: 600, min: 16, max: 4096 },
        { id: 'mode', label: '噪点类型', type: 'select', value: 'mono',
          options: [{ value: 'mono', label: '黑白噪点（胶片颗粒）' }, { value: 'color', label: '彩色噪点' }, { value: 'sparse', label: '稀疏亮点（星空）' }] },
        { id: 'density', label: '密度（稀疏模式）', type: 'number', value: 2, min: 1, max: 30 }
      ],
      hint: '生成纯噪点 / 星空纹理，可做页面背景或叠加素材；直接下载 PNG。',
      run: function (v) {
        var w = Math.max(16, Math.min(4096, Number(v.width) || 800));
        var h = Math.max(16, Math.min(4096, Number(v.height) || 600));
        var canvas = K.canvas(w, h);
        var ctx = canvas.getContext('2d');
        var img = ctx.createImageData(w, h);
        var data = img.data;
        var density = Math.max(1, Math.min(30, Number(v.density) || 2));
        var threshold = v.mode === 'sparse' ? Math.round(255 / density) : 0;
        for (var i = 0; i < data.length; i += 4) {
          if (v.mode === 'sparse') {
            var r = K.randomInt(256);
            var on = r < threshold;
            data[i] = on ? 255 : 0;
            data[i + 1] = on ? 255 : 0;
            data[i + 2] = on ? 255 : 0;
            data[i + 3] = on ? 255 : 0;
          } else if (v.mode === 'mono') {
            var gray = K.randomInt(256);
            data[i] = data[i + 1] = data[i + 2] = gray;
            data[i + 3] = 255;
          } else {
            data[i] = K.randomInt(256);
            data[i + 1] = K.randomInt(256);
            data[i + 2] = K.randomInt(256);
            data[i + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
        var url = canvas.toDataURL('image/png');
        return {
          html: '<div class="img-card"><img src="' + url + '" style="max-width:100%" alt="噪点预览"></div>' +
            '<div class="btn-row"><button type="button" class="btn ghost" id="noise-download">下载 PNG</button></div>',
          after: function (box) {
            box.querySelector('#noise-download').addEventListener('click', function () {
              K.saveCanvas(canvas, 'noise-' + w + 'x' + h + '.png');
            });
          },
          note: w + '×' + h + ' 噪点已生成'
        };
      }
    });
  }

  /* ------------------------------ 6. 暗角效果 ------------------------------ */
  function renderImageVignette(root) {
    singleTool(root, {
      actionLabel: '添加暗角',
      live: true,
      fields: [
        { id: 'strength', label: '暗角强度（%）', type: 'number', value: 55, min: 1, max: 100 },
        { id: 'spread', label: '作用范围（%）', type: 'number', value: 70, min: 20, max: 100 },
        { id: 'color', label: '暗角颜色', type: 'color', value: '#000000' }
      ],
      hint: '径向渐变从中心向外变暗，让视线聚焦主体，摄影后期常用。',
      process: function (canvas, v) {
        var strength = Math.max(1, Math.min(100, Number(v.strength) || 55)) / 100;
        var spread = Math.max(20, Math.min(100, Number(v.spread) || 70)) / 100;
        var out = K.canvas(canvas.width, canvas.height);
        var ctx = out.getContext('2d');
        ctx.drawImage(canvas, 0, 0);
        var cx = out.width / 2;
        var cy = out.height / 2;
        var radius = Math.sqrt(cx * cx + cy * cy);
        var gradient = ctx.createRadialGradient(cx, cy, radius * (1 - spread), cx, cy, radius);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, hexToRgba(v.color, strength));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, out.width, out.height);
        return out;
      }
    });
  }

  function hexToRgba(hex, alpha) {
    var m = hex.replace('#', '');
    if (m.length === 3) m = m.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(m, 16) || 0;
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + alpha + ')';
  }

  /* ------------------------------ 7. 渐变图生成 ------------------------------ */
  function renderGradientGen(root) {
    K.form(root, {
      uid: 'gradientgen',
      actionLabel: '生成渐变图',
      fields: [
        { id: 'width', label: '宽度', type: 'number', value: 1200, min: 16, max: 4096 },
        { id: 'height', label: '高度', type: 'number', value: 675, min: 16, max: 4096 },
        { id: 'c1', label: '起始颜色', type: 'color', value: '#6366f1' },
        { id: 'c2', label: '结束颜色', type: 'color', value: '#22d3ee' },
        { id: 'dir', label: '方向', type: 'select', value: 'h',
          options: [{ value: 'h', label: '横向 →' }, { value: 'v', label: '纵向 ↓' }, { value: 'd', label: '对角线 ↘' }, { value: 'r', label: '径向（圆心扩散）' }] },
        { id: 'presets', label: '快捷配色', type: 'select', value: '',
          options: [{ value: '', label: '自定义' }, { value: 'sunset', label: '日落橙紫' }, { value: 'mint', label: '薄荷绿' }, { value: 'night', label: '深夜蓝黑' }] }
      ],
      hint: '生成一张可直接下载的渐变背景图；也可以把下方的 CSS 代码粘贴到网页里（体积更小）。',
      run: function (v) {
        var presets = { sunset: ['#f97316', '#a855f7'], mint: ['#34d399', '#0ea5e9'], night: ['#1e293b', '#0f172a'] };
        if (presets[v.presets]) { v.c1 = presets[v.presets][0]; v.c2 = presets[v.presets][1]; }
        var w = Math.max(16, Math.min(4096, Number(v.width) || 1200));
        var h = Math.max(16, Math.min(4096, Number(v.height) || 675));
        var canvas = K.canvas(w, h);
        var ctx = canvas.getContext('2d');
        var gradient;
        if (v.dir === 'r') {
          gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.sqrt(w * w + h * h) / 2);
        } else if (v.dir === 'v') {
          gradient = ctx.createLinearGradient(0, 0, 0, h);
        } else if (v.dir === 'd') {
          gradient = ctx.createLinearGradient(0, 0, w, h);
        } else {
          gradient = ctx.createLinearGradient(0, 0, w, 0);
        }
        gradient.addColorStop(0, v.c1);
        gradient.addColorStop(1, v.c2);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
        var url = canvas.toDataURL('image/png');
        return {
          html: '<div class="img-card"><img src="' + url + '" style="max-width:100%" alt="渐变预览"></div>' +
            '<div class="btn-row"><button type="button" class="btn ghost" id="grad-dl">下载 PNG</button>' +
            '<button type="button" class="btn ghost" data-copy="background: linear-gradient(' + (v.dir === 'v' ? '180deg' : v.dir === 'd' ? '135deg' : '90deg') + ', ' + v.c1 + ', ' + v.c2 + ');">复制 CSS 代码</button></div>',
          after: function (box) {
            var dl = box.querySelector('#grad-dl');
            if (dl) dl.addEventListener('click', function () { K.saveCanvas(canvas, 'gradient-' + w + 'x' + h + '.png'); });
          },
          note: 'CSS 写法：linear-gradient(' + (v.dir === 'v' ? '180deg' : v.dir === 'd' ? '135deg' : '90deg') + ', ' + v.c1 + ', ' + v.c2 + ')'
        };
      }
    });
  }

  /* ------------------------------ 8. 图案生成 ------------------------------ */
  function renderImagePattern(root) {
    K.form(root, {
      uid: 'pattern',
      actionLabel: '生成图案',
      fields: [
        { id: 'width', label: '宽度', type: 'number', value: 800, min: 16, max: 4096 },
        { id: 'height', label: '高度', type: 'number', value: 800, min: 16, max: 4096 },
        { id: 'type', label: '图案', type: 'select', value: 'checker',
          options: [{ value: 'checker', label: '棋盘格' }, { value: 'stripe', label: '斜条纹' }, { value: 'dots', label: '波点' }, { value: 'grid', label: '方格纸' }] },
        { id: 'cell', label: '单元尺寸（px）', type: 'number', value: 40, min: 4, max: 200 },
        { id: 'c1', label: '颜色 1', type: 'color', value: '#f1f5f9' },
        { id: 'c2', label: '颜色 2', type: 'color', value: '#6366f1' }
      ],
      hint: '透明背景的图案适合做网页底纹；棋盘格也常用来检查透明区域。',
      run: function (v) {
        var w = Math.max(16, Math.min(4096, Number(v.width) || 800));
        var h = Math.max(16, Math.min(4096, Number(v.height) || 800));
        var cell = Math.max(4, Math.min(200, Number(v.cell) || 40));
        var canvas = K.canvas(w, h);
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = v.c1;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = v.c2;
        if (v.type === 'checker') {
          for (var y = 0; y < Math.ceil(h / cell); y += 1) {
            for (var x = 0; x < Math.ceil(w / cell); x += 1) {
              if ((x + y) % 2 === 0) ctx.fillRect(x * cell, y * cell, cell, cell);
            }
          }
        } else if (v.type === 'stripe') {
          var step = cell * 2;
          for (var s = -h; s < w + h; s += step) {
            ctx.beginPath();
            ctx.moveTo(s, 0);
            ctx.lineTo(s + h, h);
            ctx.lineTo(s + h + cell, h);
            ctx.lineTo(s + cell, 0);
            ctx.closePath();
            ctx.fill();
          }
        } else if (v.type === 'dots') {
          var r = cell * 0.18;
          for (var yy = cell / 2; yy < h + cell; yy += cell) {
            for (var xx = cell / 2; xx < w + cell; xx += cell) {
              ctx.beginPath();
              ctx.arc(xx + ((Math.round(yy / cell) % 2) * cell / 2), yy, r, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        } else {
          ctx.strokeStyle = v.c2;
          ctx.lineWidth = Math.max(1, cell / 20);
          for (var gx = 0; gx <= w; gx += cell) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke(); }
          for (var gy = 0; gy <= h; gy += cell) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke(); }
        }
        var url = canvas.toDataURL('image/png');
        return {
          html: '<div class="img-card"><img src="' + url + '" style="max-width:100%" alt="图案预览"></div>' +
            '<div class="btn-row"><button type="button" class="btn ghost" id="pat-dl">下载 PNG</button></div>',
          after: function (box) {
            var dl = box.querySelector('#pat-dl');
            if (dl) dl.addEventListener('click', function () { K.saveCanvas(canvas, 'pattern-' + v.type + '.png'); });
          },
          note: w + '×' + h + ' 图案已生成'
        };
      }
    });
  }

  /* ------------------------------ 9. 直方图 ------------------------------ */
  function renderImageHistogram(root) {
    var uid = K.uid('histo');
    root.innerHTML = K.dropzone(uid) +
      '<div id="' + uid + '-result"></div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      '<p class="hint">直方图反映明暗分布：靠左偏暗、靠右偏亮、中间是中间调。三条彩色曲线是 RGB 各通道。</p>';

    var resultBox = root.querySelector('#' + uid + '-result');
    var statusEl = root.querySelector('#' + uid + '-status');

    function setStatus(type, text) {
      if (!text) { statusEl.hidden = true; return; }
      statusEl.className = 'status ' + type;
      statusEl.textContent = text;
      statusEl.hidden = false;
    }

    function drawHistogram(canvas) {
      var ctx = canvas.getContext('2d');
      var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      var step = Math.max(1, Math.floor(data.length / 4 / 400000)); // 大图抽样
      var rs = new Array(256).fill(0);
      var gs = new Array(256).fill(0);
      var bs = new Array(256).fill(0);
      var lum = new Array(256).fill(0);
      var total = 0;
      for (var i = 0; i < data.length; i += 4 * step) {
        rs[data[i]] += 1;
        gs[data[i + 1]] += 1;
        bs[data[i + 2]] += 1;
        var l = Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
        lum[l] += 1;
        total += 1;
      }
      var maxR = Math.max.apply(null, rs);
      var maxG = Math.max.apply(null, gs);
      var maxB = Math.max.apply(null, bs);
      var maxL = Math.max.apply(null, lum);
      function channel(values, max, color) {
        var c = K.canvas(700, 180);
        var cctx = c.getContext('2d');
        cctx.fillStyle = '#f8fafc';
        cctx.fillRect(0, 0, 700, 180);
        cctx.beginPath();
        cctx.moveTo(0, 180);
        for (var v = 0; v < 256; v += 1) {
          cctx.lineTo(v / 255 * 700, 180 - values[v] / max * 170);
        }
        cctx.lineTo(700, 180);
        cctx.closePath();
        cctx.fillStyle = color;
        cctx.globalAlpha = 0.85;
        cctx.fill();
        cctx.globalAlpha = 1;
        return c.toDataURL('image/png');
      }
      // 明暗统计
      var dark = 0, mid = 0, bright = 0;
      for (var lv = 0; lv < 256; lv += 1) {
        if (lv < 85) dark += lum[lv];
        else if (lv < 170) mid += lum[lv];
        else bright += lum[lv];
      }
      var pct = function (n) { return K.num(n / total * 100, 1) + '%'; };
      resultBox.innerHTML =
        '<div class="img-card"><img src="' + channel(lum, maxL, '#94a3b8') + '" style="width:100%" alt="亮度直方图"></div>' +
        '<div class="img-card"><img src="' + channel(rs, maxR, '#ef4444') + '" style="width:100%" alt="R 通道"></div>' +
        '<div class="img-card"><img src="' + channel(gs, maxG, '#22c55e') + '" style="width:100%" alt="G 通道"></div>' +
        '<div class="img-card"><img src="' + channel(bs, maxB, '#3b82f6') + '" style="width:100%" alt="B 通道"></div>';
      setStatus('ok', '暗部 ' + pct(dark) + ' · 中间调 ' + pct(mid) + ' · 亮部 ' + pct(bright));
    }

    K.bindFile(root, uid, function (file) {
      setStatus('info', '正在统计像素…');
      K.loadImage(file).then(function (handle) {
        var canvas = K.canvas(handle.img.naturalWidth, handle.img.naturalHeight);
        canvas.getContext('2d').drawImage(handle.img, 0, 0);
        K.release(handle);
        drawHistogram(canvas);
      }).catch(function (e) {
        setStatus('err', e.message || '读取失败');
      });
    });
  }

  window.ToolModules['image-format-convert'] = renderFormatConvert;
  window.ToolModules['image-ascii'] = renderImageAscii;
  window.ToolModules['image-pixel-art'] = renderPixelArt;
  window.ToolModules['image-tint'] = renderImageTint;
  window.ToolModules['image-noise'] = renderImageNoise;
  window.ToolModules['image-vignette'] = renderImageVignette;
  window.ToolModules['image-gradient-gen'] = renderGradientGen;
  window.ToolModules['image-pattern'] = renderImagePattern;
  window.ToolModules['image-histogram'] = renderImageHistogram;
})();
