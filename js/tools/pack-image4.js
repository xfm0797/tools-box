/* =============================================================================
 * 图片处理工具包 · 第四批（8 个）
 * -----------------------------------------------------------------------------
 * img-info          图片信息速览
 * img-datauri       图片转 Data URI
 * img-placeholder   占位图生成
 * img-tint          单色蒙版（Tint）
 * img-frame         加相框
 * img-strip-meta    去除元数据
 * img-trim          自动去白边
 * img-scale-percent 按百分比缩放
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  /** 生成缩略预览（最长边不超过 520px），避免把原图整幅塞进 DOM */
  function preview(canvas) {
    var scale = Math.min(1, 520 / Math.max(canvas.width, canvas.height));
    var thumb = K.canvas(canvas.width * scale, canvas.height * scale);
    var ctx = thumb.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, thumb.width, thumb.height);
    return '<div class="img-card"><img src="' + thumb.toDataURL('image/png') + '" alt="处理结果预览" style="max-width:100%;display:block"></div>';
  }

  function stats(rows) {
    return K.kv(rows);
  }

  /** 直接对已加载的 <img> 生成缩略预览 */
  function previewImage(img) {
    var scale = Math.min(1, 520 / Math.max(img.naturalWidth, img.naturalHeight));
    var thumb = K.canvas(img.naturalWidth * scale, img.naturalHeight * scale);
    var ctx = thumb.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, thumb.width, thumb.height);
    return '<div class="img-card"><img src="' + thumb.toDataURL('image/png') + '" alt="原图预览" style="max-width:100%;display:block"></div>';
  }

  /** 通用图片工具骨架：上方选图，下方参数表单，执行后自动下载 */
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

    if (cfg.after) cfg.after(body, state);
  }

  /* ------------------------------ 1. 图片信息 ------------------------------ */
  function renderImgInfo(root) {
    var uid = K.uid('imginfo');
    var box = document.createElement('div');
    box.className = 'field';
    box.innerHTML = K.dropzone(uid, '选择图片查看信息');
    root.appendChild(box);
    var out = document.createElement('div');
    root.appendChild(out);

    K.bindFile(box, uid, function (file) {
      K.loadImage(file).then(function (handle) {
        var img = handle.img;
        var ratio = img.naturalWidth / img.naturalHeight;
        var gcd = (function (a, b) { return b ? gcd(b, a % b) : a; })(img.naturalWidth, img.naturalHeight);
        var megapixels = img.naturalWidth * img.naturalHeight / 1e6;
        var bytesPerPixel = file.size / (img.naturalWidth * img.naturalHeight);
        out.innerHTML = previewImage(img) +
          stats([
            { key: '文件大小', value: K.formatBytes(file.size) },
            { key: '类型', value: file.type || '未知' },
            { key: '像素尺寸', value: img.naturalWidth + ' × ' + img.naturalHeight },
            { key: '宽高比', value: K.num(ratio, 4) + '（' + (img.naturalWidth / gcd) + ':' + (img.naturalHeight / gcd) + '）' },
            { key: '百万像素', value: K.num(megapixels, 2) + ' MP' },
            { key: '单位像素字节', value: K.num(bytesPerPixel, 3) + ' B/px' },
            { key: '打印建议（300 DPI）', value: K.num(img.naturalWidth / 300, 2) + ' × ' + K.num(img.naturalHeight / 300, 2) + ' 英寸' },
            { key: '常见用途判断', value: megapixels >= 8 ? '可满足 A4 打印 / 大屏展示' : megapixels >= 2 ? '适合网页与社交分享' : '适合图标与小图' , mono: false }
          ]);
        K.bindCopy(out);
        K.release(handle);
      }).catch(function (error) {
        K.toast(error.message, 'error');
      });
    });
  }

  /* ------------------------------ 2. 图片转 Data URI ------------------------------ */
  function renderImgDataUri(root) {
    imageTool(root, {
      uid: 'imgdatauri',
      label: '选择需要内联的图片',
      actionLabel: '生成 Data URI',
      fields: [
        { id: 'format', label: '编码格式', type: 'select', value: 'keep', options: [
          { value: 'keep', label: '保持原样（不重新压缩）' },
          { value: 'image/jpeg', label: '重新编码 JPEG' },
          { value: 'image/webp', label: '重新编码 WebP' }
        ] },
        { id: 'quality', label: '质量（重新编码时生效）', type: 'number', value: 82, min: 10, max: 100, step: 1 }
      ],
      hint: 'Data URI 适合把小图标内联进 CSS / HTML，超过 8KB 会明显拖慢首屏。',
      run: function (v, state) {
        if (v.format === 'keep') {
          return readAsDataUri(state.file).then(function (uri) {
            return {
              html: '<div class="field"><div class="label-row"><label class="label">Data URI</label>' +
                '<div class="label-actions"><button type="button" class="link-btn" data-copy="' + K.esc(uri) + '">复制</button></div></div>' +
                '<textarea class="textarea mono" rows="6" readonly>' + K.esc(uri) + '</textarea></div>',
              note: '长度 ' + uri.length + ' 字符，约 ' + K.formatBytes(uri.length) + '（Base64 比原文件大约 33%）'
            };
          });
        }
        var canvas = K.canvas(state.handle.img.naturalWidth, state.handle.img.naturalHeight);
        var ctx = canvas.getContext('2d');
        if (v.format === 'image/jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(state.handle.img, 0, 0);
        var uri = canvas.toDataURL(v.format, Number(v.quality) / 100);
        return {
          html: '<div class="field"><div class="label-row"><label class="label">Data URI</label>' +
            '<div class="label-actions"><button type="button" class="link-btn" data-copy="' + K.esc(uri) + '">复制</button></div></div>' +
            '<textarea class="textarea mono" rows="6" readonly>' + K.esc(uri) + '</textarea></div>',
          note: '重新编码后长度 ' + uri.length + ' 字符，约 ' + K.formatBytes(uri.length)
        };
      }
    });
  }

  function readAsDataUri(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result)); };
      reader.onerror = function () { reject(new Error('读取文件失败')); };
      reader.readAsDataURL(file);
    });
  }

  /* ------------------------------ 3. 占位图生成 ------------------------------ */
  function renderImgPlaceholder(root) {
    K.form(root, {
      uid: 'imgph',
      actionLabel: '生成并下载',
      fields: [
        { id: 'w', label: '宽度（px）', type: 'number', value: 1200, min: 1, max: 8000, step: 1 },
        { id: 'h', label: '高度（px）', type: 'number', value: 630, min: 1, max: 8000, step: 1 },
        { id: 'bg', label: '背景色', type: 'color', value: '#5b5bd6' },
        { id: 'fg', label: '文字颜色', type: 'color', value: '#ffffff' },
        { id: 'text', label: '文字（留空显示尺寸）', type: 'text', value: '', wide: true },
        { id: 'radius', label: '圆角（px）', type: 'number', value: 0, min: 0, max: 200, step: 1 }
      ],
      hint: '生成的占位图可直接用于设计稿与前端开发。',
      run: function (v) {
        var w = Math.round(Number(v.w));
        var h = Math.round(Number(v.h));
        if (!(w > 0) || !(h > 0)) return { error: '宽高必须是正数' };
        var canvas = K.canvas(w, h);
        var ctx = canvas.getContext('2d');
        var text = String(v.text || '').trim() || (w + ' × ' + h);

        if (Number(v.radius) > 0) {
          var r = Math.min(Number(v.radius), w / 2, h / 2);
          ctx.beginPath();
          ctx.moveTo(r, 0);
          ctx.lineTo(w - r, 0);
          ctx.quadraticCurveTo(w, 0, w, r);
          ctx.lineTo(w, h - r);
          ctx.quadraticCurveTo(w, h, w - r, h);
          ctx.lineTo(r, h);
          ctx.quadraticCurveTo(0, h, 0, h - r);
          ctx.lineTo(0, r);
          ctx.quadraticCurveTo(0, 0, r, 0);
          ctx.closePath();
          ctx.clip();
        }
        ctx.fillStyle = v.bg;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = v.fg;
        var size = Math.max(12, Math.round(Math.min(w, h) / 8));
        ctx.font = '600 ' + size + 'px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, w / 2, h / 2);
        K.saveCanvas(canvas, 'placeholder-' + w + 'x' + h + '.png');
        return { html: preview(canvas), note: '已生成 ' + w + ' × ' + h + ' 占位图并开始下载' };
      }
    });
  }

  /* ------------------------------ 4. 单色蒙版 ------------------------------ */
  function renderImgTint(root) {
    imageTool(root, {
      uid: 'imgtint',
      label: '选择需要叠加色调的图片',
      fields: [
        { id: 'color', label: '蒙版颜色', type: 'color', value: '#5b5bd6' },
        { id: 'alpha', label: '强度（%）', type: 'number', value: 35, min: 1, max: 100, step: 1 },
        { id: 'mode', label: '混合模式', type: 'select', value: 'source-atop', options: [
          { value: 'source-atop', label: '正常叠加（保留明暗）' },
          { value: 'overlay', label: '叠加（增强对比）' },
          { value: 'multiply', label: '正片叠底（压暗）' },
          { value: 'screen', label: '滤色（提亮）' }
        ] }
      ],
      run: function (v, state) {
        var img = state.handle.img;
        var canvas = K.canvas(img.naturalWidth, img.naturalHeight);
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        ctx.globalCompositeOperation = v.mode;
        ctx.globalAlpha = Number(v.alpha) / 100;
        ctx.fillStyle = v.color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        K.saveCanvas(canvas, 'tint-' + canvas.width + 'x' + canvas.height + '.png');
        return { html: preview(canvas), note: '已套用 ' + v.color + '，强度 ' + v.alpha + '%' };
      }
    });
  }

  /* ------------------------------ 5. 加相框 ------------------------------ */
  function renderImgFrame(root) {
    imageTool(root, {
      uid: 'imgframe',
      label: '选择需要加相框的图片',
      fields: [
        { id: 'border', label: '边框宽度（px）', type: 'number', value: 24, min: 0, max: 400, step: 1 },
        { id: 'color', label: '边框颜色', type: 'color', value: '#ffffff' },
        { id: 'inner', label: '内描边颜色（可留空）', type: 'color', value: '#e4e7ef' },
        { id: 'shadow', label: '添加投影', type: 'checkbox', value: true },
        { id: 'radius', label: '圆角（px）', type: 'number', value: 0, min: 0, max: 120, step: 1 }
      ],
      run: function (v, state) {
        var img = state.handle.img;
        var border = Math.max(0, Number(v.border));
        var canvas = K.canvas(img.naturalWidth + border * 2, img.naturalHeight + border * 2);
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = v.color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (v.inner !== '#e4e7ef' && v.inner) {
          ctx.strokeStyle = v.inner;
          ctx.lineWidth = 1;
          ctx.strokeRect(border - 0.5, border - 0.5, img.naturalWidth + 1, img.naturalHeight + 1);
        }
        if (v.shadow) {
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.28)';
          ctx.shadowBlur = border * 0.6 || 8;
          ctx.shadowOffsetY = border * 0.2 || 3;
          ctx.fillStyle = '#000';
          ctx.fillRect(border, border, img.naturalWidth, img.naturalHeight);
          ctx.restore();
        }
        if (Number(v.radius) > 0) {
          var r = Math.min(Number(v.radius), img.naturalWidth / 2, img.naturalHeight / 2);
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(border + r, border);
          ctx.arcTo(border + img.naturalWidth, border, border + img.naturalWidth, border + img.naturalHeight, r);
          ctx.arcTo(border + img.naturalWidth, border + img.naturalHeight, border, border + img.naturalHeight, r);
          ctx.arcTo(border, border + img.naturalHeight, border, border, r);
          ctx.arcTo(border, border, border + img.naturalWidth, border, r);
          ctx.closePath();
          ctx.clip();
        }
        ctx.drawImage(img, border, border);
        if (Number(v.radius) > 0) ctx.restore();
        K.saveCanvas(canvas, 'framed-' + canvas.width + 'x' + canvas.height + '.png');
        return { html: preview(canvas), note: '边框 ' + border + 'px，导出尺寸 ' + canvas.width + ' × ' + canvas.height };
      }
    });
  }

  /* ------------------------------ 6. 去除元数据 ------------------------------ */
  function renderImgStripMeta(root) {
    imageTool(root, {
      uid: 'imgstrip',
      label: '选择需要清理元数据的图片',
      fields: [
        { id: 'format', label: '导出格式', type: 'select', value: 'image/jpeg', options: [
          { value: 'image/jpeg', label: 'JPEG' },
          { value: 'image/png', label: 'PNG' },
          { value: 'image/webp', label: 'WebP' }
        ] },
        { id: 'quality', label: '质量（JPEG / WebP）', type: 'number', value: 92, min: 10, max: 100, step: 1 }
      ],
      hint: '重新绘制到 Canvas 再导出，会丢弃 EXIF / GPS / 相机型号等信息；同时也会移除色彩配置。',
      run: function (v, state) {
        var img = state.handle.img;
        var canvas = K.canvas(img.naturalWidth, img.naturalHeight);
        var ctx = canvas.getContext('2d');
        if (v.format === 'image/jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);
        var ext = v.format === 'image/png' ? 'png' : v.format === 'image/webp' ? 'webp' : 'jpg';
        K.saveCanvas(canvas, 'clean.' + ext, v.format, Number(v.quality) / 100);
        return {
          html: preview(canvas),
          note: '已重绘导出（原文件 ' + K.formatBytes(state.file.size) + '），元数据不再保留'
        };
      }
    });
  }

  /* ------------------------------ 7. 自动去白边 ------------------------------ */
  function renderImgTrim(root) {
    imageTool(root, {
      uid: 'imgtrim',
      label: '选择带纯色留白的图片',
      fields: [
        { id: 'tolerance', label: '颜色容差（0–100）', type: 'number', value: 12, min: 0, max: 100, step: 1 },
        { id: 'corner', label: '取样角', type: 'select', value: 'tl', options: [
          { value: 'tl', label: '左上' },
          { value: 'tr', label: '右上' },
          { value: 'bl', label: '左下' },
          { value: 'br', label: '右下' }
        ] },
        { id: 'pad', label: '保留边距（px）', type: 'number', value: 0, min: 0, max: 200, step: 1 }
      ],
      hint: '以选中角的像素作为背景色，向内收缩直到遇到明显不同的像素，适合扫描件与截图。',
      run: function (v, state) {
        var img = state.handle.img;
        var w = img.naturalWidth;
        var h = img.naturalHeight;
        var canvas = K.canvas(w, h);
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        var data = ctx.getImageData(0, 0, w, h).data;
        var sampleX = v.corner === 'tr' || v.corner === 'br' ? w - 1 : 0;
        var sampleY = v.corner === 'bl' || v.corner === 'br' ? h - 1 : 0;
        var sampleIndex = (sampleY * w + sampleX) * 4;
        var bg = [data[sampleIndex], data[sampleIndex + 1], data[sampleIndex + 2]];
        var tolerance = Number(v.tolerance) / 100 * 441;

        function isBg(x, y) {
          var i = (y * w + x) * 4;
          var dr = data[i] - bg[0];
          var dg = data[i + 1] - bg[1];
          var db = data[i + 2] - bg[2];
          return Math.sqrt(dr * dr + dg * dg + db * db) <= tolerance;
        }

        var top = 0;
        var bottom = h - 1;
        var left = 0;
        var right = w - 1;
        while (top < bottom && rowIsBg(top)) top += 1;
        while (bottom > top && rowIsBg(bottom)) bottom -= 1;
        while (left < right && colIsBg(left)) left += 1;
        while (right > left && colIsBg(right)) right -= 1;

        function rowIsBg(y) {
          for (var x = 0; x < w; x += 1) if (!isBg(x, y)) return false;
          return true;
        }
        function colIsBg(x) {
          for (var y = top; y <= bottom; y += 1) if (!isBg(x, y)) return false;
          return true;
        }

        var pad = Math.max(0, Number(v.pad));
        left = Math.max(0, left - pad);
        top = Math.max(0, top - pad);
        right = Math.min(w - 1, right + pad);
        bottom = Math.min(h - 1, bottom + pad);

        var cw = right - left + 1;
        var ch = bottom - top + 1;
        if (cw <= 0 || ch <= 0) return { error: '整张图都被识别为背景色，请调低容差' };
        var out = K.canvas(cw, ch);
        out.getContext('2d').drawImage(canvas, left, top, cw, ch, 0, 0, cw, ch);
        K.saveCanvas(out, 'trimmed-' + cw + 'x' + ch + '.png');
        return {
          html: preview(out),
          note: '原图 ' + w + ' × ' + h + ' → 裁剪后 ' + cw + ' × ' + ch + '，四边各收缩 ' + left + ' / ' + (w - 1 - right) + ' / ' + top + ' / ' + (h - 1 - bottom) + ' px'
        };
      }
    });
  }

  /* ------------------------------ 8. 按百分比缩放 ------------------------------ */
  function renderImgScalePercent(root) {
    imageTool(root, {
      uid: 'imgscale',
      label: '选择需要缩放的图片',
      fields: [
        { id: 'percent', label: '缩放比例（%）', type: 'number', value: 50, min: 1, max: 400, step: 1 },
        { id: 'format', label: '导出格式', type: 'select', value: 'image/png', options: [
          { value: 'image/png', label: 'PNG' },
          { value: 'image/jpeg', label: 'JPEG' },
          { value: 'image/webp', label: 'WebP' }
        ] },
        { id: 'quality', label: '质量（JPEG / WebP）', type: 'number', value: 90, min: 10, max: 100, step: 1 }
      ],
      run: function (v, state) {
        var img = state.handle.img;
        var percent = Number(v.percent) / 100;
        if (!(percent > 0)) return { error: '缩放比例必须大于 0' };
        var w = Math.max(1, Math.round(img.naturalWidth * percent));
        var h = Math.max(1, Math.round(img.naturalHeight * percent));
        if (w * h > 40000000) return { error: '目标尺寸过大（超过 4000 万像素），请调低比例' };
        var canvas = K.canvas(w, h);
        var ctx = canvas.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        if (v.format === 'image/jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
        }
        ctx.drawImage(img, 0, 0, w, h);
        var ext = v.format === 'image/png' ? 'png' : v.format === 'image/webp' ? 'webp' : 'jpg';
        K.saveCanvas(canvas, 'scaled-' + w + 'x' + h + '.' + ext, v.format, Number(v.quality) / 100);
        return {
          html: preview(canvas),
          note: img.naturalWidth + ' × ' + img.naturalHeight + ' → ' + w + ' × ' + h + '（' + v.percent + '%）'
        };
      }
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['img-info'] = renderImgInfo;
  window.ToolModules['img-datauri'] = renderImgDataUri;
  window.ToolModules['img-placeholder'] = renderImgPlaceholder;
  window.ToolModules['img-tint'] = renderImgTint;
  window.ToolModules['img-frame'] = renderImgFrame;
  window.ToolModules['img-strip-meta'] = renderImgStripMeta;
  window.ToolModules['img-trim'] = renderImgTrim;
  window.ToolModules['img-scale-percent'] = renderImgScalePercent;
})();
