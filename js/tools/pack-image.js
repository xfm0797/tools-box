/* =============================================================================
 * 图片处理工具包（10 个）
 * -----------------------------------------------------------------------------
 * image-resize / image-crop / image-rotate / image-watermark / image-grayscale /
 * image-info / avatar-maker / image-split / image-eyedropper / placeholder-gen
 *
 * 所有处理都用 Canvas 在浏览器本地完成，图片不会被上传。
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;
  var MAX_SIDE = 6000;

  /* ------------------------------ 公共脚手架 ------------------------------ */

  function scaffold(uid, optionsHtml, actionLabel, hint) {
    return K.dropzone(uid, '点击选择图片') +
      '<div class="file-meta" id="' + uid + '-meta" hidden></div>' +
      optionsHtml +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="' + uid + '-run" disabled>' + actionLabel + '</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-sample">示例图片</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-reset">清除</button>' +
      '</div>' +
      '<div class="img-grid" id="' + uid + '-grid"></div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      (hint ? '<p class="hint">' + hint + '</p>' : '');
  }

  /** 生成一张示例图片，方便没有素材时直接体验 */
  function demoFile() {
    var canvas = K.canvas(1400, 900);
    var ctx = canvas.getContext('2d');
    var gradient = ctx.createLinearGradient(0, 0, 1400, 900);
    gradient.addColorStop(0, '#5b5bd6');
    gradient.addColorStop(0.45, '#a855f7');
    gradient.addColorStop(1, '#06b6d4');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1400, 900);

    ctx.globalAlpha = 0.18;
    for (var i = 0; i < 7; i += 1) {
      ctx.beginPath();
      ctx.arc(1080 + i * 26, 210 + i * 22, 150 - i * 14, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.font = 'bold 92px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('示例图片', 96, 470);
    ctx.font = '36px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.fillText('1400 × 900 · 用于本地处理演示', 98, 534);

    return new Promise(function (resolve) {
      canvas.toBlob(function (blob) {
        resolve(new File([blob], 'demo-image.png', { type: 'image/png' }));
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
    var body = wrap.querySelector('.img-card-body');
    canvas.className = 'preview-canvas';
    body.appendChild(canvas);
    wrap.querySelector('button').addEventListener('click', function () {
      K.saveCanvas(canvas, filename, type || 'image/png', 0.95);
    });
    return wrap;
  }

  /**
   * 统一的图片工具外壳
   * cfg = { uid, action, hint, options(uid), render(state, grid, setStatus, uid) }
   */
  function imageTool(root, cfg) {
    var uid = K.uid(cfg.uid);
    root.innerHTML = scaffold(uid, cfg.options(uid), cfg.action, cfg.hint);

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
          '<span>' + K.esc(file.type || '未知格式') + '</span>';
        runBtn.disabled = false;
        render();
        return handle;
      }).catch(function (error) {
        K.toast(error.message, 'error');
      });
    }

    function render() {
      if (!state.img) {
        setStatus('info', '请先选择一张图片。');
        return;
      }
      try {
        cfg.render(state, grid, setStatus, uid, meta);
      } catch (error) {
        console.error('[图片处理失败]', error);
        setStatus('err', '处理失败：' + (error.message || '未知错误'));
      }
    }

    K.bindFile(root, uid, load);
    runBtn.addEventListener('click', render);
    root.querySelector('#' + uid + '-sample').addEventListener('click', function () {
      demoFile().then(load);
    });
    root.querySelector('#' + uid + '-reset').addEventListener('click', function () {
      if (state.handle) K.release(state.handle);
      state.file = null;
      state.img = null;
      state.handle = null;
      meta.hidden = true;
      meta.innerHTML = '';
      grid.innerHTML = '';
      runBtn.disabled = true;
      setStatus(null, '');
      K.toast('已清除', 'success');
    });

    return { load: load, render: render };
  }

  /* ------------------------------ 尺寸调整 ------------------------------ */
  function renderResize(root) {
    var uid0 = K.uid('rs');
    imageTool(root, {
      uid: 'resize',
      action: '调整尺寸',
      hint: '默认锁定宽高比。输出尺寸上限 6000px，避免浏览器内存溢出。',
      options: function () {
        return '<div class="form-row">' +
          '<div class="form-item"><label class="label" for="' + uid0 + '-w">宽度（px）</label>' +
            '<input class="input" type="number" id="' + uid0 + '-w" value="800" min="1" max="6000" step="1"></div>' +
          '<div class="form-item"><label class="label" for="' + uid0 + '-h">高度（px）</label>' +
            '<input class="input" type="number" id="' + uid0 + '-h" value="514" min="1" max="6000" step="1"></div>' +
          '<div class="form-item"><label class="label" for="' + uid0 + '-fmt">输出格式</label>' +
            '<select class="select" id="' + uid0 + '-fmt">' +
              '<option value="image/jpeg">JPEG（体积小）</option>' +
              '<option value="image/png">PNG（无损）</option>' +
              '<option value="image/webp">WebP</option>' +
            '</select></div>' +
        '</div>' +
        '<label class="check"><input type="checkbox" id="' + uid0 + '-lock" checked><span>锁定宽高比</span></label>';
      },
      render: function (state, grid, setStatus) {
        var widthEl = root.querySelector('#' + uid0 + '-w');
        var heightEl = root.querySelector('#' + uid0 + '-h');
        var lock = root.querySelector('#' + uid0 + '-lock').checked;
        var format = root.querySelector('#' + uid0 + '-fmt').value;
        var img = state.img;

        var width = Math.min(Math.max(parseInt(widthEl.value, 10) || img.naturalWidth, 1), MAX_SIDE);
        var height = Math.min(Math.max(parseInt(heightEl.value, 10) || img.naturalHeight, 1), MAX_SIDE);
        if (lock) {
          var ratio = img.naturalWidth / img.naturalHeight;
          if (Math.abs(width / height - ratio) > 0.01) height = Math.round(width / ratio);
        }

        var canvas = K.canvas(width, height);
        var ctx = canvas.getContext('2d');
        if (format === 'image/jpeg') {
          ctx.fillStyle = '#ffffff'; // JPEG 不支持透明，先铺白底
          ctx.fillRect(0, 0, width, height);
        }
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        grid.innerHTML = '';
        grid.appendChild(makeCard('调整后 ' + width + ' × ' + height, canvas,
          'resized-' + width + 'x' + height + '.' + (format === 'image/png' ? 'png' : format === 'image/webp' ? 'webp' : 'jpg'),
          format));
        heightEl.value = height;
        setStatus('ok', '已从 ' + img.naturalWidth + ' × ' + img.naturalHeight + ' 调整为 ' + width + ' × ' + height + ' px。');
      }
    });
  }

  /* ------------------------------ 裁剪 ------------------------------ */
  function renderCrop(root) {
    var uid0 = K.uid('crop');
    imageTool(root, {
      uid: 'crop',
      action: '裁剪',
      hint: '按所选比例从原图中裁出最大可用区域，可指定取景位置。',
      options: function () {
        return '<div class="form-row">' +
          '<div class="form-item"><label class="label" for="' + uid0 + '-ratio">裁剪比例</label>' +
            '<select class="select" id="' + uid0 + '-ratio">' +
              '<option value="1">1 : 1（正方形）</option>' +
              '<option value="1.3333">4 : 3</option>' +
              '<option value="0.75">3 : 4</option>' +
              '<option value="1.7778" selected>16 : 9</option>' +
              '<option value="0.5625">9 : 16</option>' +
              '<option value="1.5">3 : 2</option>' +
              '<option value="2.35">2.35 : 1（电影宽幅）</option>' +
            '</select></div>' +
          '<div class="form-item"><label class="label" for="' + uid0 + '-pos">取景位置</label>' +
            '<select class="select" id="' + uid0 + '-pos">' +
              '<option value="center" selected>居中</option>' +
              '<option value="top">靠上</option>' +
              '<option value="bottom">靠下</option>' +
              '<option value="left">靠左</option>' +
              '<option value="right">靠右</option>' +
            '</select></div>' +
        '</div>';
      },
      render: function (state, grid, setStatus) {
        var ratio = parseFloat(root.querySelector('#' + uid0 + '-ratio').value);
        var pos = root.querySelector('#' + uid0 + '-pos').value;
        var img = state.img;
        var iw = img.naturalWidth;
        var ih = img.naturalHeight;

        var cw = iw;
        var ch = Math.round(iw / ratio);
        if (ch > ih) { ch = ih; cw = Math.round(ih * ratio); }

        var sx = Math.round((iw - cw) / 2);
        var sy = Math.round((ih - ch) / 2);
        if (pos === 'top') sy = 0;
        else if (pos === 'bottom') sy = ih - ch;
        else if (pos === 'left') sx = 0;
        else if (pos === 'right') sx = iw - cw;

        var canvas = K.canvas(cw, ch);
        canvas.getContext('2d').drawImage(img, sx, sy, cw, ch, 0, 0, cw, ch);

        grid.innerHTML = '';
        grid.appendChild(makeCard('裁剪结果 ' + cw + ' × ' + ch, canvas, 'cropped-' + cw + 'x' + ch + '.png', 'image/png'));
        setStatus('ok', '裁剪区域：x=' + sx + ', y=' + sy + '，尺寸 ' + cw + ' × ' + ch + ' px。');
      }
    });
  }

  /* ------------------------------ 旋转翻转 ------------------------------ */
  function renderRotate(root) {
    var uid0 = K.uid('rot');
    imageTool(root, {
      uid: 'rotate',
      action: '应用变换',
      hint: '旋转 90°/270° 会自动交换宽高。',
      options: function () {
        return '<div class="form-row">' +
          '<div class="form-item"><label class="label" for="' + uid0 + '-angle">旋转角度</label>' +
            '<select class="select" id="' + uid0 + '-angle">' +
              '<option value="90" selected>顺时针 90°</option>' +
              '<option value="180">旋转 180°</option>' +
              '<option value="270">顺时针 270°</option>' +
            '</select></div>' +
          '<div class="form-item"><label class="label">翻转</label>' +
            '<label class="check" style="margin-top:9px"><input type="checkbox" id="' + uid0 + '-h"><span>水平翻转</span></label>' +
          '</div>' +
          '<div class="form-item"><label class="label">&nbsp;</label>' +
            '<label class="check" style="margin-top:9px"><input type="checkbox" id="' + uid0 + '-v"><span>垂直翻转</span></label>' +
          '</div>' +
        '</div>';
      },
      render: function (state, grid, setStatus) {
        var angle = parseInt(root.querySelector('#' + uid0 + '-angle').value, 10);
        var flipH = root.querySelector('#' + uid0 + '-h').checked;
        var flipV = root.querySelector('#' + uid0 + '-v').checked;
        var img = state.img;
        var iw = img.naturalWidth;
        var ih = img.naturalHeight;
        var swap = angle === 90 || angle === 270;
        var canvas = K.canvas(swap ? ih : iw, swap ? iw : ih);
        var ctx = canvas.getContext('2d');

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(angle * Math.PI / 180);
        ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        ctx.drawImage(img, -iw / 2, -ih / 2);

        grid.innerHTML = '';
        grid.appendChild(makeCard('变换结果 ' + canvas.width + ' × ' + canvas.height, canvas,
          'rotated-' + angle + '.png', 'image/png'));
        setStatus('ok', '已旋转 ' + angle + '°' + (flipH ? '，水平翻转' : '') + (flipV ? '，垂直翻转' : '') + '。');
      }
    });
  }

  /* ------------------------------ 文字水印 ------------------------------ */
  function renderWatermark(root) {
    var uid0 = K.uid('wm');
    imageTool(root, {
      uid: 'watermark',
      action: '添加水印',
      hint: '水印在本地用 Canvas 绘制，位置按九宫格选择，支持平铺。',
      options: function () {
        return '<div class="form-row">' +
          '<div class="form-item" style="flex:2 1 240px"><label class="label" for="' + uid0 + '-text">水印文字</label>' +
            '<input class="input" type="text" id="' + uid0 + '-text" value="仅供内部使用"></div>' +
          '<div class="form-item"><label class="label" for="' + uid0 + '-pos">位置</label>' +
            '<select class="select" id="' + uid0 + '-pos">' +
              '<option value="br" selected>右下角</option><option value="bl">左下角</option>' +
              '<option value="tr">右上角</option><option value="tl">左上角</option>' +
              '<option value="center">居中</option>' +
            '</select></div>' +
          '<div class="form-item"><label class="label" for="' + uid0 + '-size">字号</label>' +
            '<input class="input" type="number" id="' + uid0 + '-size" value="36" min="8" max="200" step="1"></div>' +
          '<div class="form-item"><label class="label" for="' + uid0 + '-opacity">不透明度</label>' +
            '<input class="input" type="number" id="' + uid0 + '-opacity" value="45" min="5" max="100" step="5"></div>' +
          '<div class="form-item"><label class="label" for="' + uid0 + '-color">颜色</label>' +
            '<input class="input" type="color" id="' + uid0 + '-color" value="#ffffff" style="height:38px;padding:4px"></div>' +
          '<div class="form-item"><label class="label">&nbsp;</label>' +
            '<label class="check" style="margin-top:9px"><input type="checkbox" id="' + uid0 + '-tile"><span>平铺整图</span></label></div>' +
        '</div>';
      },
      render: function (state, grid, setStatus) {
        var text = root.querySelector('#' + uid0 + '-text').value.trim();
        if (!text) { setStatus('err', '请先填写水印文字。'); return; }
        var pos = root.querySelector('#' + uid0 + '-pos').value;
        var size = Math.min(Math.max(parseInt(root.querySelector('#' + uid0 + '-size').value, 10) || 36, 8), 200);
        var opacity = Math.min(Math.max(parseInt(root.querySelector('#' + uid0 + '-opacity').value, 10) || 45, 5), 100) / 100;
        var color = root.querySelector('#' + uid0 + '-color').value;
        var tile = root.querySelector('#' + uid0 + '-tile').checked;

        var img = state.img;
        var canvas = K.canvas(img.naturalWidth, img.naturalHeight);
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        ctx.font = 'bold ' + size + 'px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = color;
        ctx.globalAlpha = opacity;
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = 4;
        ctx.textBaseline = 'middle';

        var pad = Math.round(size * 0.9);
        if (tile) {
          ctx.textAlign = 'center';
          var stepX = ctx.measureText(text).width + size * 4;
          var stepY = size * 4;
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(-Math.PI / 8);
          for (var y = -canvas.height; y < canvas.height; y += stepY) {
            for (var x = -canvas.width; x < canvas.width; x += stepX) {
              ctx.fillText(text, x, y);
            }
          }
          ctx.restore();
        } else {
          ctx.textAlign = pos === 'br' || pos === 'tr' ? 'right' : pos === 'center' ? 'center' : 'left';
          var tx = pos === 'br' || pos === 'tr' ? canvas.width - pad
            : pos === 'center' ? canvas.width / 2 : pad;
          var ty = pos === 'bl' || pos === 'br' ? canvas.height - pad
            : pos === 'center' ? canvas.height / 2 : pad + size / 2;
          ctx.fillText(text, tx, ty);
        }

        grid.innerHTML = '';
        grid.appendChild(makeCard('水印预览', canvas, 'watermarked.png', 'image/png'));
        setStatus('ok', '已添加水印「' + text + '」，字号 ' + size + 'px，不透明度 ' + Math.round(opacity * 100) + '%。');
      }
    });
  }

  /* ------------------------------ 滤镜 ------------------------------ */
  function renderFilter(root) {
    var uid0 = K.uid('flt');
    imageTool(root, {
      uid: 'filter',
      action: '应用滤镜',
      hint: '逐像素处理，大图可能需要 1–2 秒，请耐心等待。',
      options: function () {
        return '<div class="form-row">' +
          '<div class="form-item"><label class="label" for="' + uid0 + '-type">滤镜</label>' +
            '<select class="select" id="' + uid0 + '-type">' +
              '<option value="gray" selected>黑白</option>' +
              '<option value="sepia">复古</option>' +
              '<option value="invert">反色</option>' +
              '<option value="bright">提亮</option>' +
              '<option value="dark">压暗</option>' +
              '<option value="contrast">增强对比</option>' +
              '<option value="warm">暖色调</option>' +
              '<option value="cool">冷色调</option>' +
            '</select></div>' +
          '<div class="form-item"><label class="label" for="' + uid0 + '-strength">强度（%）</label>' +
            '<input class="input" type="number" id="' + uid0 + '-strength" value="100" min="0" max="100" step="5"></div>' +
        '</div>';
      },
      render: function (state, grid, setStatus) {
        var type = root.querySelector('#' + uid0 + '-type').value;
        var strength = Math.min(Math.max(parseInt(root.querySelector('#' + uid0 + '-strength').value, 10) || 100, 0), 100) / 100;
        var img = state.img;

        var src = K.canvas(img.naturalWidth, img.naturalHeight);
        var sctx = src.getContext('2d');
        sctx.drawImage(img, 0, 0);
        var imageData = sctx.getImageData(0, 0, src.width, src.height);
        var data = imageData.data;

        for (var i = 0; i < data.length; i += 4) {
          var r = data[i];
          var g = data[i + 1];
          var b = data[i + 2];
          var nr = r;
          var ng = g;
          var nb = b;

          if (type === 'gray') {
            var gray = r * 0.299 + g * 0.587 + b * 0.114;
            nr = ng = nb = gray;
          } else if (type === 'sepia') {
            nr = r * 0.393 + g * 0.769 + b * 0.189;
            ng = r * 0.349 + g * 0.686 + b * 0.168;
            nb = r * 0.272 + g * 0.534 + b * 0.131;
          } else if (type === 'invert') {
            nr = 255 - r; ng = 255 - g; nb = 255 - b;
          } else if (type === 'bright') {
            nr = r + 45; ng = g + 45; nb = b + 45;
          } else if (type === 'dark') {
            nr = r - 45; ng = g - 45; nb = b - 45;
          } else if (type === 'contrast') {
            nr = (r - 128) * 1.45 + 128;
            ng = (g - 128) * 1.45 + 128;
            nb = (b - 128) * 1.45 + 128;
          } else if (type === 'warm') {
            nr = r + 28; ng = g + 8; nb = b - 22;
          } else if (type === 'cool') {
            nr = r - 22; ng = g + 4; nb = b + 30;
          }

          data[i] = Math.max(0, Math.min(255, r + (nr - r) * strength));
          data[i + 1] = Math.max(0, Math.min(255, g + (ng - g) * strength));
          data[i + 2] = Math.max(0, Math.min(255, b + (nb - b) * strength));
        }

        var canvas = K.canvas(img.naturalWidth, img.naturalHeight);
        canvas.getContext('2d').putImageData(imageData, 0, 0);

        grid.innerHTML = '';
        grid.appendChild(makeCard('滤镜效果', canvas, 'filter-' + type + '.png', 'image/png'));
        setStatus('ok', '已应用滤镜，强度 ' + Math.round(strength * 100) + '%。');
      }
    });
  }

  /* ------------------------------ 图片信息 ------------------------------ */
  function renderInfo(root) {
    imageTool(root, {
      uid: 'imginfo',
      action: '查看信息',
      hint: '平均色通过缩略图采样计算，仅供参考。',
      options: function () { return ''; },
      render: function (state, grid, setStatus) {
        var img = state.img;
        var file = state.file;

        var thumb = K.canvas(32, 32);
        var tctx = thumb.getContext('2d');
        tctx.drawImage(img, 0, 0, 32, 32);
        var pixels = tctx.getImageData(0, 0, 32, 32).data;
        var r = 0; var g = 0; var b = 0; var alpha = 0;
        for (var i = 0; i < pixels.length; i += 4) {
          r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2]; alpha += pixels[i + 3];
        }
        var count = pixels.length / 4;
        r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count);
        alpha = Math.round(alpha / count);
        var hex = '#' + [r, g, b].map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('').toUpperCase();

        var gcd = function (a, b2) { return b2 ? gcd(b2, a % b2) : a; };
        var divisor = gcd(img.naturalWidth, img.naturalHeight);
        var megapixels = (img.naturalWidth * img.naturalHeight / 1e6).toFixed(2);

        grid.innerHTML = '';
        grid.appendChild(makeCard('原图', (function () {
          var c = K.canvas(img.naturalWidth, img.naturalHeight);
          c.getContext('2d').drawImage(img, 0, 0);
          return c;
        })(), 'original.png', 'image/png'));

        var box = document.createElement('div');
        box.className = 'img-card';
        box.innerHTML = '<div class="img-card-head"><span>图片信息</span></div>' +
          '<div style="padding:4px 12px 12px">' +
          K.kv([
            { key: '文件名', value: file.name },
            { key: '尺寸', value: img.naturalWidth + ' × ' + img.naturalHeight + ' px' },
            { key: '宽高比', value: (img.naturalWidth / divisor) + ' : ' + (img.naturalHeight / divisor) },
            { key: '像素总量', value: megapixels + ' MP' },
            { key: '文件大小', value: K.formatBytes(file.size) },
            { key: '格式', value: file.type || '未知' },
            { key: '修改时间', value: new Date(file.lastModified).toLocaleString('zh-CN') },
            { key: '平均色', value: hex + ' / rgb(' + r + ', ' + g + ', ' + b + ')' },
            { key: '含透明通道', value: alpha < 255 ? '是（alpha 平均值 ' + alpha + '）' : '否' }
          ]) +
          '<div class="swatch-lg" style="background:' + hex + '"></div>' +
          '</div>';
        grid.appendChild(box);
        K.bindCopy(box);
        setStatus('ok', '信息读取完成。');
      }
    });
  }

  /* ------------------------------ 圆角头像 ------------------------------ */
  function renderAvatar(root) {
    var uid0 = K.uid('avatar');
    imageTool(root, {
      uid: 'avatar',
      action: '生成头像',
      hint: '自动居中裁成正方形，可按圆形或圆角导出，适合社交平台头像。',
      options: function () {
        return '<div class="form-row">' +
          '<div class="form-item"><label class="label" for="' + uid0 + '-size">输出尺寸</label>' +
            '<select class="select" id="' + uid0 + '-size">' +
              '<option value="128">128 × 128</option>' +
              '<option value="256" selected>256 × 256</option>' +
              '<option value="512">512 × 512</option>' +
              '<option value="1024">1024 × 1024</option>' +
            '</select></div>' +
          '<div class="form-item"><label class="label" for="' + uid0 + '-shape">形状</label>' +
            '<select class="select" id="' + uid0 + '-shape">' +
              '<option value="circle" selected>圆形</option>' +
              '<option value="round">圆角矩形</option>' +
              '<option value="square">正方形</option>' +
            '</select></div>' +
          '<div class="form-item"><label class="label" for="' + uid0 + '-radius">圆角半径（%）</label>' +
            '<input class="input" type="number" id="' + uid0 + '-radius" value="22" min="0" max="50" step="1"></div>' +
        '</div>';
      },
      render: function (state, grid, setStatus) {
        var size = parseInt(root.querySelector('#' + uid0 + '-size').value, 10);
        var shape = root.querySelector('#' + uid0 + '-shape').value;
        var radius = Math.min(Math.max(parseInt(root.querySelector('#' + uid0 + '-radius').value, 10) || 0, 0), 50) / 100 * size;
        var img = state.img;

        var side = Math.min(img.naturalWidth, img.naturalHeight);
        var sx = (img.naturalWidth - side) / 2;
        var sy = (img.naturalHeight - side) / 2;

        var canvas = K.canvas(size, size);
        var ctx = canvas.getContext('2d');

        function path() {
          ctx.beginPath();
          if (shape === 'circle') {
            ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
          } else if (shape === 'round') {
            var r = Math.min(radius, size / 2);
            ctx.moveTo(r, 0);
            ctx.lineTo(size - r, 0);
            ctx.quadraticCurveTo(size, 0, size, r);
            ctx.lineTo(size, size - r);
            ctx.quadraticCurveTo(size, size, size - r, size);
            ctx.lineTo(r, size);
            ctx.quadraticCurveTo(0, size, 0, size - r);
            ctx.lineTo(0, r);
            ctx.quadraticCurveTo(0, 0, r, 0);
          } else {
            ctx.rect(0, 0, size, size);
          }
          ctx.closePath();
        }

        path();
        ctx.save();
        ctx.clip();
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        ctx.restore();

        if (shape !== 'square') {
          // 透明背景预览：给卡片加棋盘格即可，这里不额外描边
        }

        grid.innerHTML = '';
        grid.appendChild(makeCard(shape === 'circle' ? '圆形头像' : shape === 'round' ? '圆角头像' : '方形头像',
          canvas, 'avatar-' + size + '.png', 'image/png'));
        setStatus('ok', '已生成 ' + size + ' × ' + size + ' 头像（' + (shape === 'circle' ? '圆形' : shape === 'round' ? '圆角' : '方形') + '）。');
      }
    });
  }

  /* ------------------------------ 九宫格切图 ------------------------------ */
  function renderSplit(root) {
    var uid0 = K.uid('split');
    imageTool(root, {
      uid: 'imgsplit',
      action: '切分图片',
      hint: '切图常用于朋友圈九宫格；每张可单独下载，也可一键全部下载。',
      options: function () {
        return '<div class="form-row">' +
          '<div class="form-item"><label class="label" for="' + uid0 + '-grid">切分方式</label>' +
            '<select class="select" id="' + uid0 + '-grid">' +
              '<option value="3x3" selected>3 × 3 九宫格</option>' +
              '<option value="2x2">2 × 2 四宫格</option>' +
              '<option value="3x1">3 × 1 横向三张</option>' +
              '<option value="1x3">1 × 3 纵向三张</option>' +
              '<option value="2x3">2 × 3 六宫格</option>' +
            '</select></div>' +
        '</div>';
      },
      render: function (state, grid, setStatus) {
        var mode = root.querySelector('#' + uid0 + '-grid').value.split('x');
        var cols = parseInt(mode[0], 10);
        var rows = parseInt(mode[1], 10);
        var img = state.img;
        var tileW = Math.floor(img.naturalWidth / cols);
        var tileH = Math.floor(img.naturalHeight / rows);

        if (tileW < 10 || tileH < 10) {
          setStatus('err', '图片太小，无法切分为 ' + cols + ' × ' + rows + ' 份。');
          return;
        }

        grid.innerHTML = '';
        grid.classList.add('img-grid-3');
        var canvases = [];
        for (var r = 0; r < rows; r += 1) {
          for (var c = 0; c < cols; c += 1) {
            var canvas = K.canvas(tileW, tileH);
            canvas.getContext('2d').drawImage(img, c * tileW, r * tileH, tileW, tileH, 0, 0, tileW, tileH);
            canvases.push(canvas);
            grid.appendChild(makeCard('第 ' + (r * cols + c + 1) + ' 张', canvas,
              'tile-' + (r * cols + c + 1) + '.png', 'image/png'));
          }
        }

        var actions = document.createElement('div');
        actions.className = 'btn-row';
        actions.style.gridColumn = '1 / -1';
        actions.innerHTML = '<button type="button" class="btn" id="' + uid0 + '-all">下载全部 ' + canvases.length + ' 张</button>';
        grid.appendChild(actions);
        actions.querySelector('button').addEventListener('click', function () {
          canvases.forEach(function (canvas, index) {
            setTimeout(function () {
              K.saveCanvas(canvas, 'tile-' + (index + 1) + '.png', 'image/png');
            }, index * 350);
          });
        });

        setStatus('ok', '已切分为 ' + cols + ' × ' + rows + ' 共 ' + canvases.length + ' 张，每张 ' + tileW + ' × ' + tileH + ' px。');
      }
    });
  }

  /* ------------------------------ 图片取色 ------------------------------ */
  function renderEyedropper(root) {
    var uid0 = K.uid('eye');
    imageTool(root, {
      uid: 'eyedropper',
      action: '加载取色',
      hint: '在图片上移动或点击即可取色，取色结果可一键复制。',
      options: function () { return ''; },
      render: function (state, grid, setStatus) {
        var img = state.img;
        var maxWidth = 620;
        var scale = Math.min(1, maxWidth / img.naturalWidth);
        var canvas = K.canvas(img.naturalWidth * scale, img.naturalHeight * scale);
        var ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.style.cursor = 'crosshair';

        grid.innerHTML = '';
        var card = document.createElement('div');
        card.className = 'img-card';
        card.style.gridColumn = '1 / -1';
        card.innerHTML = '<div class="img-card-head"><span>点击图片取色</span></div>' +
          '<div class="img-card-body" style="padding:12px"></div>' +
          '<div style="padding:0 12px 12px" id="' + uid0 + '-pick"></div>';
        card.querySelector('.img-card-body').appendChild(canvas);
        grid.appendChild(card);

        var pickBox = card.querySelector('#' + uid0 + '-pick');

        function pick(event) {
          var rect = canvas.getBoundingClientRect();
          var x = Math.floor((event.clientX - rect.left) * (canvas.width / rect.width));
          var y = Math.floor((event.clientY - rect.top) * (canvas.height / rect.height));
          x = Math.max(0, Math.min(canvas.width - 1, x));
          y = Math.max(0, Math.min(canvas.height - 1, y));
          var pixel = ctx.getImageData(x, y, 1, 1).data;
          var hex = '#' + [pixel[0], pixel[1], pixel[2]].map(function (v) {
            return ('0' + v.toString(16)).slice(-2);
          }).join('').toUpperCase();
          var rgb = 'rgb(' + pixel[0] + ', ' + pixel[1] + ', ' + pixel[2] + ')';

          pickBox.innerHTML =
            '<div class="color-row">' +
              '<span class="swatch" style="background:' + hex + '"></span>' +
              '<div style="flex:1;min-width:0">' +
                '<div class="mono" style="font-size:18px;font-weight:600">' + hex + '</div>' +
                '<div class="hint" style="margin-top:2px">' + rgb + ' · 坐标 ' + x + ', ' + y + '</div>' +
              '</div>' +
              '<button type="button" class="btn sm" data-hex="' + hex + '">复制 HEX</button>' +
              '<button type="button" class="btn sm ghost" data-hex="' + rgb + '">复制 RGB</button>' +
            '</div>';
          pickBox.querySelectorAll('[data-hex]').forEach(function (button) {
            button.addEventListener('click', function () {
              window.UI.copyText(button.getAttribute('data-hex'));
            });
          });
          setStatus('ok', '取色：' + hex + '（' + rgb + '）');
        }

        canvas.addEventListener('click', pick);
        setStatus('ok', '图片已加载，点击画面任意位置取色。');
      }
    });
  }

  /* ------------------------------ 占位图生成 ------------------------------ */
  function renderPlaceholder(root) {
    var uid = K.uid('ph');
    root.innerHTML =
      '<div class="form-row">' +
        '<div class="form-item"><label class="label" for="' + uid + '-w">宽度（px）</label>' +
          '<input class="input" type="number" id="' + uid + '-w" value="800" min="10" max="4000"></div>' +
        '<div class="form-item"><label class="label" for="' + uid + '-h">高度（px）</label>' +
          '<input class="input" type="number" id="' + uid + '-h" value="450" min="10" max="4000"></div>' +
        '<div class="form-item"><label class="label" for="' + uid + '-bg">背景色</label>' +
          '<input class="input" type="color" id="' + uid + '-bg" value="#e5e7eb" style="height:38px;padding:4px"></div>' +
        '<div class="form-item"><label class="label" for="' + uid + '-fg">文字色</label>' +
          '<input class="input" type="color" id="' + uid + '-fg" value="#6b7280" style="height:38px;padding:4px"></div>' +
        '<div class="form-item" style="flex:1 1 100%"><label class="label" for="' + uid + '-text">显示文字（留空则显示尺寸）</label>' +
          '<input class="input" type="text" id="' + uid + '-text" placeholder="例如 800 × 450"></div>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="' + uid + '-run">生成占位图</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-svg">复制 SVG</button>' +
      '</div>' +
      '<div class="img-grid" id="' + uid + '-grid"></div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      '<p class="hint">常用于设计稿与前端联调，生成后可下载 PNG 或复制 SVG 代码嵌入页面。</p>';

    var grid = root.querySelector('#' + uid + '-grid');
    var statusEl = root.querySelector('#' + uid + '-status');
    var lastSvg = '';

    function build() {
      var width = Math.min(Math.max(parseInt(root.querySelector('#' + uid + '-w').value, 10) || 800, 10), 4000);
      var height = Math.min(Math.max(parseInt(root.querySelector('#' + uid + '-h').value, 10) || 450, 10), 4000);
      var bg = root.querySelector('#' + uid + '-bg').value;
      var fg = root.querySelector('#' + uid + '-fg').value;
      var text = root.querySelector('#' + uid + '-text').value.trim() || (width + ' × ' + height);

      var canvas = K.canvas(width, height);
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      var fontSize = Math.max(12, Math.min(width, height) / 8);
      ctx.fillStyle = fg;
      ctx.font = '600 ' + fontSize + 'px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, width / 2, height / 2);

      grid.innerHTML = '';
      grid.appendChild(makeCard('占位图 ' + width + ' × ' + height, canvas,
        'placeholder-' + width + 'x' + height + '.png', 'image/png'));

      lastSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' +
        width + ' ' + height + '"><rect width="100%" height="100%" fill="' + bg + '"/>' +
        '<text x="50%" y="50%" fill="' + fg + '" font-family="sans-serif" font-size="' + Math.round(fontSize) +
        '" text-anchor="middle" dominant-baseline="middle">' + K.esc(text) + '</text></svg>';

      statusEl.className = 'status ok';
      statusEl.textContent = '已生成 ' + width + ' × ' + height + ' 占位图。';
      statusEl.hidden = false;
    }

    root.querySelector('#' + uid + '-run').addEventListener('click', build);
    root.querySelector('#' + uid + '-svg').addEventListener('click', function () {
      if (!lastSvg) build();
      window.UI.copyText(lastSvg, 'SVG 代码已复制');
    });
    build();
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['image-resize'] = renderResize;
  window.ToolModules['image-crop'] = renderCrop;
  window.ToolModules['image-rotate'] = renderRotate;
  window.ToolModules['image-watermark'] = renderWatermark;
  window.ToolModules['image-grayscale'] = renderFilter;
  window.ToolModules['image-info'] = renderInfo;
  window.ToolModules['avatar-maker'] = renderAvatar;
  window.ToolModules['image-split'] = renderSplit;
  window.ToolModules['image-eyedropper'] = renderEyedropper;
  window.ToolModules['placeholder-gen'] = renderPlaceholder;
})();
