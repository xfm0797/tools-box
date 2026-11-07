/* =============================================================================
 * 工具：图片压缩 / 图片转 Base64
 * -----------------------------------------------------------------------------
 * 压缩使用 Canvas 重绘 + toBlob 指定质量，全程在本地完成；
 * 对大图先做尺寸缩放（限制最长边），避免一次性绘制超大画布导致移动端崩溃。
 * ========================================================================== */
(function () {
  'use strict';

  var MAX_FILE = 30 * 1024 * 1024;   // 30MB 硬上限
  var WARN_FILE = 8 * 1024 * 1024;   // 8MB 提示

  /** 读取图片为 HTMLImageElement */
  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var image = new Image();
      image.onload = function () { resolve({ image: image, url: url }); };
      image.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('无法解析该图片，请确认文件格式（支持 JPG / PNG / WebP / GIF 首帧）'));
      };
      image.src = url;
    });
  }

  function render(root) {
    root.innerHTML = `
      <div class="tabs" role="tablist" aria-label="图片处理模式">
        <button type="button" class="tab active" role="tab" aria-selected="true" data-tab="compress">图片压缩</button>
        <button type="button" class="tab" role="tab" aria-selected="false" data-tab="base64">转 Base64</button>
      </div>

      <section data-panel="compress">
        <div class="dropzone" id="imgDrop">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-4.5-4.5L7 21"/>
          </svg>
          <span><strong>点击选择图片</strong>，或拖拽到此处</span>
          <span>支持 JPG / PNG / WebP，建议不超过 20MB</span>
          <input type="file" id="imgFile" accept="image/*" aria-label="选择要压缩的图片">
        </div>

        <div class="file-meta" id="imgMeta" hidden></div>

        <div class="form-row stack" style="margin-top:14px">
          <div class="form-item">
            <label class="label" for="imgWidth">最长边限制</label>
            <select id="imgWidth" class="select">
              <option value="0">保持原始尺寸</option>
              <option value="1920">1920 px</option>
              <option value="1280">1280 px</option>
              <option value="800" selected>800 px</option>
              <option value="640">640 px</option>
            </select>
          </div>
          <div class="form-item">
            <label class="label" for="imgFormat">输出格式</label>
            <select id="imgFormat" class="select">
              <option value="image/jpeg" selected>JPEG（体积小）</option>
              <option value="image/webp">WebP（更小）</option>
              <option value="image/png">PNG（无损）</option>
            </select>
          </div>
          <div class="form-item">
            <label class="label" for="imgQuality">压缩质量：<span id="imgQualityValue">80</span>%</label>
            <div class="range-row">
              <input id="imgQuality" type="range" min="10" max="100" value="80">
            </div>
          </div>
        </div>

        <div class="btn-row" style="margin-top:14px">
          <button type="button" class="btn primary" id="imgCompress">压缩图片</button>
          <button type="button" class="btn" id="imgDownload" disabled>下载结果</button>
          <button type="button" class="btn ghost" id="imgSample">示例</button>
          <button type="button" class="btn ghost" id="imgReset">清除</button>
        </div>

        <p class="status" id="imgStatus" hidden></p>

        <div class="img-grid" id="imgPreview" hidden>
          <div class="img-card">
            <div class="img-card-head"><span>原图</span><span id="imgOriginalSize">—</span></div>
            <div class="img-card-body"><img id="imgOriginalPreview" alt="原图预览"></div>
          </div>
          <div class="img-card">
            <div class="img-card-head"><span>压缩后</span><span id="imgCompressedSize">—</span></div>
            <div class="img-card-body"><img id="imgCompressedPreview" alt="压缩后预览"></div>
          </div>
        </div>

        <p class="hint">压缩在本地 Canvas 中完成，画质与体积的平衡可通过质量滑块调整；PNG 为无损格式，质量参数对其无效。</p>
      </section>

      <section data-panel="base64" hidden>
        <div class="dropzone" id="imgB64Drop">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 16v2.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V16"/>
          </svg>
          <span><strong>点击选择图片</strong>，或拖拽到此处</span>
          <span>输出可直接用于 &lt;img src&gt; 的 Data URI</span>
          <input type="file" id="imgB64File" accept="image/*" aria-label="选择要转换为 Base64 的图片">
        </div>

        <div class="file-meta" id="imgB64Meta" hidden></div>

        <div class="img-grid" id="imgB64Preview" hidden>
          <div class="img-card" style="grid-column:1/-1">
            <div class="img-card-head"><span>预览</span><span id="imgB64Dim">—</span></div>
            <div class="img-card-body"><img id="imgB64Image" alt="图片预览"></div>
          </div>
        </div>

        <div class="field">
          <div class="label-row">
            <label class="label" for="imgB64Output">Data URI</label>
            <div class="label-actions">
              <button type="button" class="link-btn" id="imgB64Copy">复制</button>
            </div>
          </div>
          <textarea id="imgB64Output" class="textarea mono" rows="6" readonly placeholder="选择图片后自动生成"></textarea>
        </div>

        <div class="btn-row">
          <button type="button" class="btn" id="imgB64Save">下载为 .txt</button>
          <button type="button" class="btn ghost" id="imgB64Reset">清除</button>
        </div>
        <p class="hint">Base64 体积约为原图的 1.33 倍，建议仅用于小图标或内联占位图。</p>
      </section>
    `;

    window.UI.initTabs(root);

    /* ------------------------------ 通用文件校验 ------------------------------ */
    function checkFile(file) {
      if (!file) return '没有选择文件';
      if (!/^image\//.test(file.type)) return '请选择图片文件（当前类型：' + (file.type || '未知') + '）';
      if (file.size > MAX_FILE) return '图片过大（' + window.UI.formatBytes(file.size) + '），请选择小于 30MB 的图片';
      return '';
    }

    /* ------------------------------ 压缩 ------------------------------ */
    var fileInput = root.querySelector('#imgFile');
    var meta = root.querySelector('#imgMeta');
    var status = root.querySelector('#imgStatus');
    var previewWrap = root.querySelector('#imgPreview');
    var originalPreview = root.querySelector('#imgOriginalPreview');
    var compressedPreview = root.querySelector('#imgCompressedPreview');
    var originalSize = root.querySelector('#imgOriginalSize');
    var compressedSize = root.querySelector('#imgCompressedSize');
    var downloadBtn = root.querySelector('#imgDownload');
    var qualityRange = root.querySelector('#imgQuality');
    var qualityValue = root.querySelector('#imgQualityValue');

    var currentFile = null;
    var currentUrl = '';
    var compressedBlob = null;
    var compressedUrl = '';

    function setStatus(type, text) {
      status.className = 'status ' + type;
      status.textContent = text;
      status.hidden = false;
    }

    function releaseUrls() {
      if (currentUrl) { URL.revokeObjectURL(currentUrl); currentUrl = ''; }
      if (compressedUrl) { URL.revokeObjectURL(compressedUrl); compressedUrl = ''; }
    }

    qualityRange.addEventListener('input', function () {
      qualityValue.textContent = qualityRange.value;
    });

    function compress() {
      if (!currentFile) {
        window.UI.toast('请先选择图片', 'warn');
        return;
      }
      setStatus('info', '正在压缩…');
      downloadBtn.disabled = true;

      loadImage(currentFile).then(function (loaded) {
        var image = loaded.image;
        var maxWidth = Number(root.querySelector('#imgWidth').value) || 0;
        var longest = Math.max(image.naturalWidth, image.naturalHeight);
        var scale = maxWidth > 0 ? Math.min(1, maxWidth / longest) : 1;
        var width = Math.max(1, Math.round(image.naturalWidth * scale));
        var height = Math.max(1, Math.round(image.naturalHeight * scale));

        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');

        // PNG 需要保留透明度，JPEG 需要白色背景，避免透明区域变黑
        var mime = root.querySelector('#imgFormat').value;
        if (mime === 'image/jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, 0, 0, width, height);

        var quality = Number(qualityRange.value) / 100;

        canvas.toBlob(function (blob) {
          if (!blob) {
            setStatus('err', '压缩失败：浏览器未能生成图片，请尝试更换输出格式。');
            return;
          }
          URL.revokeObjectURL(loaded.url);
          if (compressedUrl) URL.revokeObjectURL(compressedUrl);

          compressedBlob = blob;
          compressedUrl = URL.createObjectURL(blob);

          compressedPreview.src = compressedUrl;
          compressedSize.textContent = window.UI.formatBytes(blob.size);
          previewWrap.hidden = false;
          downloadBtn.disabled = false;

          var ratio = currentFile.size > 0 ? (1 - blob.size / currentFile.size) * 100 : 0;
          var message = '压缩完成：' + image.naturalWidth + '×' + image.naturalHeight + ' → ' + width + '×' + height +
            '，' + window.UI.formatBytes(currentFile.size) + ' → ' + window.UI.formatBytes(blob.size);
          message += ratio > 0 ? '，体积减少 ' + ratio.toFixed(1) + '%。' : '，体积增加 ' + Math.abs(ratio).toFixed(1) + '%（可尝试降低质量或改用 WebP）。';
          setStatus(ratio > 0 ? 'ok' : 'info', message);
          window.UI.toast('压缩完成', 'success');
        }, mime, quality);
      }).catch(function (error) {
        setStatus('err', error.message);
        window.UI.toast('图片读取失败', 'error');
      });
    }

    function handleCompressFile(file) {
      var error = checkFile(file);
      if (error) {
        setStatus('err', error);
        window.UI.toast(error, 'error');
        return;
      }
      if (file.size > WARN_FILE) {
        window.UI.toast('图片较大，压缩可能需要几秒', 'info');
      }

      currentFile = file;
      compressedBlob = null;
      downloadBtn.disabled = true;
      previewWrap.hidden = true;

      if (currentUrl) URL.revokeObjectURL(currentUrl);
      currentUrl = URL.createObjectURL(file);
      originalPreview.src = currentUrl;
      originalSize.textContent = window.UI.formatBytes(file.size);

      meta.innerHTML = '<span class="name">' + window.UI.escapeHtml(file.name) + '</span>' +
        '<span>' + window.UI.formatBytes(file.size) + '</span>' +
        '<span>' + window.UI.escapeHtml(file.type || '未知类型') + '</span>';
      meta.hidden = false;

      compress();
    }

    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (file) handleCompressFile(file);
    });

    root.querySelector('#imgCompress').addEventListener('click', compress);
    root.querySelector('#imgFormat').addEventListener('change', function () {
      if (currentFile) compress();
    });
    root.querySelector('#imgWidth').addEventListener('change', function () {
      if (currentFile) compress();
    });

    downloadBtn.addEventListener('click', function () {
      if (!compressedBlob) {
        window.UI.toast('还没有可下载的结果', 'warn');
        return;
      }
      var mime = root.querySelector('#imgFormat').value;
      var ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
      var baseName = (currentFile.name || 'image').replace(/\.[^.]+$/, '');
      window.UI.downloadBlob(compressedBlob, baseName + '-compressed.' + ext);
      window.UI.toast('已开始下载', 'success');
    });

    // 示例：用 Canvas 现场生成一张渐变图片，方便直接体验压缩效果
    root.querySelector('#imgSample').addEventListener('click', function () {
      var canvas = document.createElement('canvas');
      canvas.width = 1400;
      canvas.height = 900;
      var ctx = canvas.getContext('2d');
      var gradient = ctx.createLinearGradient(0, 0, 1400, 900);
      gradient.addColorStop(0, '#5b5bd6');
      gradient.addColorStop(0.5, '#7c4dff');
      gradient.addColorStop(1, '#22d3ee');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1400, 900);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = 'bold 72px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillText('示例图片', 90, 460);
      ctx.font = '34px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillText('1400 × 900 · 用于体验本地压缩', 92, 520);
      for (var i = 0; i < 6; i += 1) {
        ctx.beginPath();
        ctx.arc(1100 + i * 30, 180 + i * 18, 90 - i * 10, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 - i * 0.06) + ')';
        ctx.lineWidth = 6;
        ctx.stroke();
      }
      canvas.toBlob(function (blob) {
        if (!blob) {
          window.UI.toast('示例生成失败', 'error');
          return;
        }
        handleCompressFile(new File([blob], 'demo-image.png', { type: 'image/png' }));
      }, 'image/png');
    });

    root.querySelector('#imgReset').addEventListener('click', function () {
      releaseUrls();
      currentFile = null;
      compressedBlob = null;
      fileInput.value = '';
      meta.hidden = true;
      previewWrap.hidden = true;
      status.hidden = true;
      downloadBtn.disabled = true;
      originalPreview.removeAttribute('src');
      compressedPreview.removeAttribute('src');
      window.UI.toast('已清除', 'success');
    });

    // 拖放
    (function bindCompressDrop() {
      var zone = root.querySelector('#imgDrop');
      ['dragenter', 'dragover'].forEach(function (type) {
        zone.addEventListener(type, function (event) {
          event.preventDefault();
          zone.classList.add('dragover');
        });
      });
      ['dragleave', 'drop'].forEach(function (type) {
        zone.addEventListener(type, function (event) {
          event.preventDefault();
          zone.classList.remove('dragover');
        });
      });
      zone.addEventListener('drop', function (event) {
        var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
        if (file) handleCompressFile(file);
      });
    })();

    /* ------------------------------ Base64 ------------------------------ */
    var b64Input = root.querySelector('#imgB64File');
    var b64Meta = root.querySelector('#imgB64Meta');
    var b64Output = root.querySelector('#imgB64Output');
    var b64Preview = root.querySelector('#imgB64Preview');
    var b64Image = root.querySelector('#imgB64Image');
    var b64Dim = root.querySelector('#imgB64Dim');

    function handleB64File(file) {
      var error = checkFile(file);
      if (error) {
        window.UI.toast(error, 'error');
        return;
      }
      if (file.size > 4 * 1024 * 1024) {
        window.UI.toast('图片较大，Base64 字符串会非常长，建议先压缩', 'warn');
      }

      window.UI.readFileAsDataURL(file).then(function (dataUrl) {
        b64Output.value = dataUrl;
        b64Image.src = dataUrl;
        b64Preview.hidden = false;
        b64Dim.textContent = window.UI.formatBytes(dataUrl.length) + ' 字符';

        b64Meta.innerHTML = '<span class="name">' + window.UI.escapeHtml(file.name) + '</span>' +
          '<span>' + window.UI.formatBytes(file.size) + '</span>' +
          '<span>Base64 长度 ' + dataUrl.length.toLocaleString('zh-CN') + '</span>';
        b64Meta.hidden = false;
        window.UI.toast('已生成 Data URI', 'success');
      }).catch(function (err) {
        window.UI.toast('读取失败：' + err.message, 'error');
      });
    }

    b64Input.addEventListener('change', function () {
      var file = b64Input.files && b64Input.files[0];
      if (file) handleB64File(file);
    });

    (function bindB64Drop() {
      var zone = root.querySelector('#imgB64Drop');
      ['dragenter', 'dragover'].forEach(function (type) {
        zone.addEventListener(type, function (event) {
          event.preventDefault();
          zone.classList.add('dragover');
        });
      });
      ['dragleave', 'drop'].forEach(function (type) {
        zone.addEventListener(type, function (event) {
          event.preventDefault();
          zone.classList.remove('dragover');
        });
      });
      zone.addEventListener('drop', function (event) {
        var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
        if (file) handleB64File(file);
      });
    })();

    root.querySelector('#imgB64Copy').addEventListener('click', function () {
      window.UI.copyText(b64Output.value);
    });

    root.querySelector('#imgB64Save').addEventListener('click', function () {
      if (!b64Output.value) {
        window.UI.toast('请先选择图片', 'warn');
        return;
      }
      window.UI.downloadText(b64Output.value, 'image-base64.txt');
      window.UI.toast('已开始下载', 'success');
    });

    root.querySelector('#imgB64Reset').addEventListener('click', function () {
      b64Input.value = '';
      b64Output.value = '';
      b64Meta.hidden = true;
      b64Preview.hidden = true;
      b64Image.removeAttribute('src');
      window.UI.toast('已清除', 'success');
    });
  }

  window.ToolModules['image'] = render;
})();
