/* =============================================================================
 * 图片处理工具包 · 第五批（8 个）
 * -----------------------------------------------------------------------------
 * img-color-swap     指定颜色替换
 * img-scan-doc       扫描件增强
 * img-halftone       半调网点
 * img-sharpen        锐化
 * img-flatten        透明背景合成底色
 * img-posterize      色调分离
 * img-grid           构图网格 / 三分线
 * img-white-balance  色温微调
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  function preview(canvas) {
    var scale = Math.min(1, 520 / Math.max(canvas.width, canvas.height));
    var thumb = K.canvas(canvas.width * scale, canvas.height * scale);
    var ctx = thumb.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, thumb.width, thumb.height);
    return '<div class="img-card"><img src="' + thumb.toDataURL('image/png') + '" alt="处理结果预览" style="max-width:100%;display:block"></div>';
  }

  function imageTool(root, cfg) {
    var state = { handle: null, file: null };

    var picker = document.createElement('div');
    picker.className = 'field';
    picker.innerHTML = K.dropzone(cfg.uid, cfg.label || '选择图片');
    root.appendChild(picker);

    var info = document.createElement('p');
    info.className = 'hint';
    info.textContent = '尚未选择图片';
    picker.appendChild(info);

    var body = document.createElement('div');
    root.appendChild(body);

    K.bindFile(picker, cfg.uid, function (file) {
      K.loadImage(file).then(function (handle) {
        K.release(state.handle);
        state.handle = handle;
        state.file = file;
        info.textContent = file.name + ' · ' + handle.img.naturalWidth + ' × ' + handle.img.naturalHeight + ' · ' + K.formatBytes(file.size);
        K.toast('图片已载入', 'success');
      }).catch(function (error) {
        K.toast(error.message, 'error');
      });
    });

    K.form(body, {
      uid: cfg.uid,
      actionLabel: cfg.actionLabel || '生成并下载',
      fields: cfg.fields || [],
      hint: cfg.hint,
      autorun: false,
      run: function (values) {
        if (!state.handle) return { error: '请先选择一张图片' };
        return cfg.run(values, state);
      }
    });
  }

  function drawBase(state) {
    var img = state.handle.img;
    var canvas = K.canvas(img.naturalWidth, img.naturalHeight);
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return { canvas: canvas, ctx: ctx };
  }

  function hexToRgb(hex) {
    var value = String(hex || '').replace('#', '');
    if (value.length === 3) {
      value = value.charAt(0) + value.charAt(0) + value.charAt(1) + value.charAt(1) + value.charAt(2) + value.charAt(2);
    }
    var num = parseInt(value, 16);
    if (!isFinite(num)) return { r: 0, g: 0, b: 0 };
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  /* ------------------------------ 1. 颜色替换 ------------------------------ */
  function renderColorSwap(root) {
    imageTool(root, {
      uid: 'colorswap',
      fields: [
        { id: 'from', label: '要替换的颜色', type: 'color', value: '#ffffff' },
        { id: 'to', label: '替换为', type: 'color', value: '#ff5c8a' },
        { id: 'tolerance', label: '容差（0–100）', type: 'number', value: 12, min: 0, max: 100 },
        { id: 'keepAlpha', label: '保留透明通道', type: 'checkbox', value: true }
      ],
      hint: '常用于把纯色背景改成透明底或品牌色。容差越大替换范围越广，抠图边缘会带上更多相近颜色；纯色素材容差 5–15 就够。',
      run: function (values, state) {
        var base = drawBase(state);
        var ctx = base.ctx;
        var image = ctx.getImageData(0, 0, base.canvas.width, base.canvas.height);
        var data = image.data;
        var from = hexToRgb(values.from);
        var to = hexToRgb(values.to);
        var tolerance = Math.max(0, Math.min(100, parseFloat(values.tolerance) || 0)) * 2.55;
        var replaced = 0;
        for (var i = 0; i < data.length; i += 4) {
          var dr = data[i] - from.r;
          var dg = data[i + 1] - from.g;
          var db = data[i + 2] - from.b;
          if (Math.sqrt(dr * dr + dg * dg + db * db) <= tolerance) {
            data[i] = to.r;
            data[i + 1] = to.g;
            data[i + 2] = to.b;
            if (!values.keepAlpha) data[i + 3] = 255;
            replaced += 1;
          }
        }
        ctx.putImageData(image, 0, 0);
        K.saveCanvas(base.canvas, 'color-swap.png');
        return {
          html: preview(base.canvas),
          note: '共替换 ' + replaced.toLocaleString('zh-CN') + ' 个像素（占 ' + K.num((replaced / (data.length / 4)) * 100, 2) + '%）'
        };
      }
    });
  }

  /* ------------------------------ 2. 扫描件增强 ------------------------------ */
  function renderScanDoc(root) {
    imageTool(root, {
      uid: 'scandoc',
      fields: [
        { id: 'strength', label: '增强强度', type: 'select', value: '2', options: [
          { value: '1', label: '轻（保留灰阶）' },
          { value: '2', label: '中（推荐）' },
          { value: '3', label: '重（接近纯黑白）' }
        ] },
        { id: 'threshold', label: '白场阈值（0–255）', type: 'number', value: 205, min: 120, max: 254 }
      ],
      hint: '手机拍纸质文件常发灰、偏黄。这一步会转灰度、按白场把纸底拉白、把墨色压黑，观感接近扫描仪输出，还能减小体积。',
      run: function (values, state) {
        var base = drawBase(state);
        var ctx = base.ctx;
        var image = ctx.getImageData(0, 0, base.canvas.width, base.canvas.height);
        var data = image.data;
        var white = Math.max(120, Math.min(254, parseInt(values.threshold, 10) || 205));
        var gamma = { 1: 1.0, 2: 1.35, 3: 1.9 }[values.strength] || 1.35;
        for (var i = 0; i < data.length; i += 4) {
          var lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          lum = (lum / white) * 255;
          lum = Math.pow(Math.min(1, lum / 255), gamma) * 255;
          lum = Math.max(0, Math.min(255, lum));
          data[i] = data[i + 1] = data[i + 2] = lum;
        }
        ctx.putImageData(image, 0, 0);
        K.saveCanvas(base.canvas, 'scan-doc.png');
        return { html: preview(base.canvas), note: '白场 ' + white + '，强度 ' + values.strength };
      }
    });
  }

  /* ------------------------------ 3. 半调网点 ------------------------------ */
  function renderHalftone(root) {
    imageTool(root, {
      uid: 'halftone',
      fields: [
        { id: 'cell', label: '网点间距（px）', type: 'number', value: 8, min: 3, max: 40 },
        { id: 'bg', label: '底色', type: 'color', value: '#ffffff' },
        { id: 'ink', label: '墨色', type: 'color', value: '#111111' },
        { id: 'angle', label: '纹理角度', type: 'select', value: '45', options: [
          { value: '0', label: '0°' },
          { value: '15', label: '15°（精细）' },
          { value: '45', label: '45°（经典）' }
        ] }
      ],
      hint: '印刷时代的半调网点：用大小不一的圆点表现深浅。这里按格子平均亮度算点半径，角度决定网点排列方向，45° 最不易看出规律。',
      run: function (values, state) {
        var img = state.handle.img;
        var cell = Math.max(3, Math.min(40, parseInt(values.cell, 10) || 8));
        var cols = Math.ceil(img.naturalWidth / cell);
        var rows = Math.ceil(img.naturalHeight / cell);
        var sample = K.canvas(img.naturalWidth, img.naturalHeight);
        var sctx = sample.getContext('2d');
        sctx.drawImage(img, 0, 0);
        var source = sctx.getImageData(0, 0, sample.width, sample.height).data;

        var canvas = K.canvas(img.naturalWidth, img.naturalHeight);
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = values.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = values.ink;
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((parseFloat(values.angle) || 0) * Math.PI / 180);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);

        for (var y = 0; y < rows; y += 1) {
          for (var x = 0; x < cols; x += 1) {
            var sum = 0;
            var count = 0;
            for (var py = y * cell; py < Math.min((y + 1) * cell, sample.height); py += 1) {
              for (var px = x * cell; px < Math.min((x + 1) * cell, sample.width); px += 1) {
                var index = (py * sample.width + px) * 4;
                sum += 0.299 * source[index] + 0.587 * source[index + 1] + 0.114 * source[index + 2];
                count += 1;
              }
            }
            if (!count) continue;
            var darkness = 1 - sum / count / 255;
            var radius = (cell / 2) * Math.sqrt(darkness) * 1.15;
            if (radius < 0.4) continue;
            ctx.beginPath();
            ctx.arc((x + 0.5) * cell, (y + 0.5) * cell, radius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        K.saveCanvas(canvas, 'halftone.png');
        return { html: preview(canvas), note: cols + ' × ' + rows + ' 个网点，间距 ' + cell + 'px' };
      }
    });
  }

  /* ------------------------------ 4. 锐化 ------------------------------ */
  function renderSharpen(root) {
    imageTool(root, {
      uid: 'sharpen',
      fields: [
        { id: 'amount', label: '强度', type: 'number', value: 1, min: 0.1, max: 3, step: 0.1 },
        { id: 'radius', label: '半径', type: 'select', value: '1', options: [
          { value: '1', label: '1px（细节）' },
          { value: '2', label: '2px（中等）' }
        ] }
      ],
      hint: '锐化本质是「原图 + 边缘差」。强度过大会出现白边与噪点，人像建议 0.6–1.0，截图文字可以到 1.5。',
      run: function (values, state) {
        var base = drawBase(state);
        var ctx = base.ctx;
        var width = base.canvas.width;
        var height = base.canvas.height;
        var image = ctx.getImageData(0, 0, width, height);
        var src = image.data;
        var out = new Uint8ClampedArray(src.length);
        var amount = Math.max(0.1, Math.min(3, parseFloat(values.amount) || 1));
        var center = 1 + 4 * amount;
        for (var y = 0; y < height; y += 1) {
          for (var x = 0; x < width; x += 1) {
            var i = (y * width + x) * 4;
            if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
              out[i] = src[i]; out[i + 1] = src[i + 1]; out[i + 2] = src[i + 2]; out[i + 3] = src[i + 3];
              continue;
            }
            for (var c = 0; c < 3; c += 1) {
              var sum = src[i + c] * center
                - src[i - 4 + c] * amount
                - src[i + 4 + c] * amount
                - src[i - width * 4 + c] * amount
                - src[i + width * 4 + c] * amount;
              out[i + c] = sum;
            }
            out[i + 3] = src[i + 3];
          }
        }
        image.data.set(out);
        ctx.putImageData(image, 0, 0);
        K.saveCanvas(base.canvas, 'sharpen.png');
        return { html: preview(base.canvas), note: '锐化强度 ' + amount };
      }
    });
  }

  /* ------------------------------ 5. 透明合成底色 ------------------------------ */
  function renderFlatten(root) {
    imageTool(root, {
      uid: 'flatten',
      fields: [
        { id: 'bg', label: '背景色', type: 'color', value: '#ffffff' },
        { id: 'padding', label: '四周留白（px）', type: 'number', value: 0, min: 0, max: 200 }
      ],
      hint: 'PNG 透明图放到深色页面会「消失」，或者某些平台上传后透明区变黑。这里把透明区合成到指定底色，输出不透明的 PNG / JPG。',
      run: function (values, state) {
        var img = state.handle.img;
        var pad = Math.max(0, Math.min(200, parseInt(values.padding, 10) || 0));
        var canvas = K.canvas(img.naturalWidth + pad * 2, img.naturalHeight + pad * 2);
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = values.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, pad, pad);
        K.saveCanvas(canvas, 'flatten.png');
        return { html: preview(canvas), note: '输出尺寸 ' + canvas.width + ' × ' + canvas.height };
      }
    });
  }

  /* ------------------------------ 6. 色调分离 ------------------------------ */
  function renderPosterize(root) {
    imageTool(root, {
      uid: 'posterize',
      fields: [
        { id: 'levels', label: '色阶数', type: 'number', value: 5, min: 2, max: 16 },
        { id: 'gray', label: '先转灰度', type: 'checkbox', value: false }
      ],
      hint: '把每个通道的 256 级压缩到 N 级，画面变成大色块，适合做海报、插画与丝网印刷风格；色阶越少越抽象。',
      run: function (values, state) {
        var base = drawBase(state);
        var ctx = base.ctx;
        var levels = Math.max(2, Math.min(16, parseInt(values.levels, 10) || 5));
        var image = ctx.getImageData(0, 0, base.canvas.width, base.canvas.height);
        var data = image.data;
        var step = 255 / (levels - 1);
        for (var i = 0; i < data.length; i += 4) {
          if (values.gray) {
            var lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            var quant = Math.round(lum / step) * step;
            data[i] = data[i + 1] = data[i + 2] = quant;
          } else {
            data[i] = Math.round(data[i] / step) * step;
            data[i + 1] = Math.round(data[i + 1] / step) * step;
            data[i + 2] = Math.round(data[i + 2] / step) * step;
          }
        }
        ctx.putImageData(image, 0, 0);
        K.saveCanvas(base.canvas, 'posterize.png');
        return { html: preview(base.canvas), note: '色阶 ' + levels + ' 级' };
      }
    });
  }

  /* ------------------------------ 7. 构图网格 ------------------------------ */
  function renderGrid(root) {
    imageTool(root, {
      uid: 'grid',
      fields: [
        { id: 'divisions', label: '等分数', type: 'select', value: '3', options: [
          { value: '3', label: '三分法（3 × 3）' },
          { value: '4', label: '四等分网格' },
          { value: '6', label: '六等分细网格' }
        ] },
        { id: 'color', label: '线条颜色', type: 'color', value: '#ff3b30' },
        { id: 'opacity', label: '不透明度（%）', type: 'number', value: 55, min: 10, max: 100 },
        { id: 'width', label: '线宽（px）', type: 'number', value: 2, min: 1, max: 10 }
      ],
      hint: '三分法的四个交点就是视觉重心，把主体放在交点上通常比放正中更耐看。导出后可直接作为构图参考图。',
      run: function (values, state) {
        var base = drawBase(state);
        var ctx = base.ctx;
        var divisions = parseInt(values.divisions, 10) || 3;
        var opacity = Math.max(10, Math.min(100, parseInt(values.opacity, 10) || 55)) / 100;
        var lineWidth = Math.max(1, parseInt(values.width, 10) || 2);
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = values.color;
        ctx.lineWidth = lineWidth;
        for (var i = 1; i < divisions; i += 1) {
          var x = (base.canvas.width / divisions) * i;
          var y = (base.canvas.height / divisions) * i;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, base.canvas.height);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(base.canvas.width, y);
          ctx.stroke();
        }
        if (divisions === 3) {
          ctx.globalAlpha = Math.min(1, opacity + 0.2);
          ctx.fillStyle = values.color;
          [1, 2].forEach(function (gx) {
            [1, 2].forEach(function (gy) {
              ctx.beginPath();
              ctx.arc((base.canvas.width / 3) * gx, (base.canvas.height / 3) * gy, lineWidth * 2.5, 0, Math.PI * 2);
              ctx.fill();
            });
          });
        }
        ctx.globalAlpha = 1;
        K.saveCanvas(base.canvas, 'grid.png');
        return { html: preview(base.canvas), note: divisions + ' × ' + divisions + ' 网格' };
      }
    });
  }

  /* ------------------------------ 8. 色温微调 ------------------------------ */
  function renderWhiteBalance(root) {
    imageTool(root, {
      uid: 'whitebalance',
      fields: [
        { id: 'temp', label: '色温（负=偏冷，正=偏暖）', type: 'number', value: 0, min: -50, max: 50 },
        { id: 'tint', label: '色调（负=偏绿，正=偏品红）', type: 'number', value: 0, min: -50, max: 50 },
        { id: 'saturation', label: '饱和度（%）', type: 'number', value: 100, min: 0, max: 200 }
      ],
      hint: '室内白炽灯发黄、阴天发蓝，都可以用色温微调找回来。数值是相对增益，不会改变细节，比直接调曲线安全。',
      run: function (values, state) {
        var base = drawBase(state);
        var ctx = base.ctx;
        var temp = Math.max(-50, Math.min(50, parseFloat(values.temp) || 0)) / 100;
        var tint = Math.max(-50, Math.min(50, parseFloat(values.tint) || 0)) / 100;
        var sat = Math.max(0, Math.min(200, parseFloat(values.saturation) || 100)) / 100;
        var image = ctx.getImageData(0, 0, base.canvas.width, base.canvas.height);
        var data = image.data;
        var rGain = 1 + temp * 0.3 + tint * 0.1;
        var gGain = 1 - tint * 0.2;
        var bGain = 1 - temp * 0.3 + tint * 0.1;
        for (var i = 0; i < data.length; i += 4) {
          var r = data[i] * rGain;
          var g = data[i + 1] * gGain;
          var b = data[i + 2] * bGain;
          if (sat !== 1) {
            var gray = 0.299 * r + 0.587 * g + 0.114 * b;
            r = gray + (r - gray) * sat;
            g = gray + (g - gray) * sat;
            b = gray + (b - gray) * sat;
          }
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
        }
        ctx.putImageData(image, 0, 0);
        K.saveCanvas(base.canvas, 'white-balance.png');
        return { html: preview(base.canvas), note: '色温 ' + K.num(temp * 100, 0) + '，色调 ' + K.num(tint * 100, 0) + '，饱和度 ' + K.num(sat * 100, 0) + '%' };
      }
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['img-color-swap'] = renderColorSwap;
  window.ToolModules['img-scan-doc'] = renderScanDoc;
  window.ToolModules['img-halftone'] = renderHalftone;
  window.ToolModules['img-sharpen'] = renderSharpen;
  window.ToolModules['img-flatten'] = renderFlatten;
  window.ToolModules['img-posterize'] = renderPosterize;
  window.ToolModules['img-grid'] = renderGrid;
  window.ToolModules['img-white-balance'] = renderWhiteBalance;
})();
