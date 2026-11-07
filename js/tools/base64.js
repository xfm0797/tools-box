/* =============================================================================
 * 工具：Base64 编解码
 * -----------------------------------------------------------------------------
 * 文本走 UTF-8 → 二进制 → btoa 的路径，因此中文、emoji 都不会乱码；
 * 解码时兼容 URL-safe 变体（- _）以及缺失的补位（=），并对非法字符给出提示。
 * 文件通过 FileReader 读取为 ArrayBuffer 后按块转换，避免超长参数导致调用栈溢出。
 * ========================================================================== */
(function () {
  'use strict';

  var MAX_FILE = 12 * 1024 * 1024; // 12MB 上限，超过后生成的字符串会占用大量内存

  /** 字符串 → UTF-8 → Base64 */
  function encodeBase64(text) {
    var bytes = new TextEncoder().encode(text);
    var binary = '';
    var chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  /** Base64 → 字节 → UTF-8 字符串 */
  function decodeBase64(input) {
    var clean = String(input)
      .replace(/[\s\r\n]+/g, '')
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    if (!clean) throw new Error('内容为空');
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) {
      throw new Error('包含非法字符，不是有效的 Base64 字符串');
    }
    var remainder = clean.length % 4;
    if (remainder === 1) throw new Error('Base64 长度不合法');
    if (remainder > 1) clean += new Array(5 - remainder).join('=');

    var binary;
    try {
      binary = atob(clean);
    } catch (e) {
      throw new Error('解码失败，字符串可能已损坏');
    }
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

    // 尝试按 UTF-8 解析；失败则回退到 Latin-1，避免直接报错
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (e) {
      return new TextDecoder('utf-8').decode(bytes) + '\n\n[提示] 解码结果可能不是 UTF-8 文本，已按兼容模式显示。';
    }
  }

  /** ArrayBuffer → Base64（分块处理，避免 apply 参数过多） */
  function bufferToBase64(buffer) {
    var bytes = new Uint8Array(buffer);
    var binary = '';
    var chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function render(root) {
    root.innerHTML = `
      <div class="tabs" role="tablist" aria-label="Base64 处理模式">
        <button type="button" class="tab active" role="tab" aria-selected="true" data-tab="text">文本</button>
        <button type="button" class="tab" role="tab" aria-selected="false" data-tab="file">文件</button>
      </div>

      <section data-panel="text">
        <div class="field">
          <div class="label-row">
            <label class="label" for="b64Input">原始内容 / Base64 字符串</label>
            <span class="label-meta" id="b64Count">0 字符</span>
          </div>
          <textarea id="b64Input" class="textarea mono" rows="8" spellcheck="false"
            placeholder="输入要编码的文本，或粘贴需要解码的 Base64"></textarea>
        </div>

        <div class="btn-row">
          <button type="button" class="btn primary" id="b64Encode">编码</button>
          <button type="button" class="btn" id="b64Decode">解码</button>
          <button type="button" class="btn ghost" id="b64Sample">示例</button>
          <button type="button" class="btn ghost" id="b64Clear">清空</button>
        </div>

        <div class="field">
          <div class="label-row">
            <label class="label" for="b64Output">结果</label>
            <div class="label-actions">
              <button type="button" class="link-btn" id="b64Copy">复制结果</button>
            </div>
          </div>
          <textarea id="b64Output" class="textarea mono" rows="8" readonly
            placeholder="编码 / 解码结果会显示在这里"></textarea>
        </div>

        <p class="status" id="b64Status" hidden></p>
        <p class="hint">解码兼容 URL-safe 变体（<code>-</code> <code>_</code>）与省略的补位符 <code>=</code>；编码结果遵循标准 Base64，可直接用于 Data URI。</p>
      </section>

      <section data-panel="file" hidden>
        <div class="dropzone" id="b64Drop">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 16v2.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V16"/>
          </svg>
          <span><strong>点击选择文件</strong>，或把文件拖到这里</span>
          <span>建议不超过 12MB · 任意类型</span>
          <input type="file" id="b64File" aria-label="选择要转换为 Base64 的文件">
        </div>

        <div class="file-meta" id="b64FileMeta" hidden></div>
        <p class="status" id="b64FileStatus" hidden></p>

        <div class="field">
          <div class="label-row">
            <label class="label" for="b64FileOutput">Base64 结果</label>
            <div class="label-actions">
              <button type="button" class="link-btn" id="b64CopyRaw">复制纯 Base64</button>
              <button type="button" class="link-btn" id="b64CopyUri">复制 Data URI</button>
            </div>
          </div>
          <textarea id="b64FileOutput" class="textarea mono" rows="7" readonly
            placeholder="选择文件后自动生成"></textarea>
        </div>

        <div class="btn-row">
          <button type="button" class="btn" id="b64Save">下载为 .txt</button>
          <button type="button" class="btn ghost" id="b64Reset">清除文件</button>
        </div>

        <p class="hint">文件只会在当前页面内读取并转换，不会上传。Base64 会让体积膨胀约 33%，大文件建议改用文件传输。</p>
      </section>
    `;

    window.UI.initTabs(root);

    /* ------------------------------ 文本模式 ------------------------------ */
    var input = root.querySelector('#b64Input');
    var output = root.querySelector('#b64Output');
    var count = root.querySelector('#b64Count');
    var status = root.querySelector('#b64Status');

    function setStatus(type, text) {
      status.className = 'status ' + type;
      status.textContent = text;
      status.hidden = false;
    }

    input.addEventListener('input', function () {
      count.textContent = input.value.length.toLocaleString('zh-CN') + ' 字符';
    });

    root.querySelector('#b64Encode').addEventListener('click', function () {
      var text = input.value;
      if (!text) {
        window.UI.toast('请先输入要编码的文本', 'warn');
        input.focus();
        return;
      }
      try {
        output.value = encodeBase64(text);
        setStatus('ok', '编码完成：' + text.length.toLocaleString('zh-CN') + ' 字符 → ' +
          output.value.length.toLocaleString('zh-CN') + ' 字符。');
        window.UI.toast('编码完成', 'success');
      } catch (error) {
        setStatus('err', '编码失败：' + error.message);
      }
    });

    root.querySelector('#b64Decode').addEventListener('click', function () {
      var text = input.value;
      if (!text.trim()) {
        window.UI.toast('请先粘贴 Base64 字符串', 'warn');
        input.focus();
        return;
      }
      try {
        output.value = decodeBase64(text);
        setStatus('ok', '解码完成：输出 ' + output.value.length.toLocaleString('zh-CN') + ' 字符。');
        window.UI.toast('解码完成', 'success');
      } catch (error) {
        output.value = '';
        setStatus('err', '解码失败：' + error.message);
        window.UI.toast('不是有效的 Base64 字符串', 'error');
      }
    });

    root.querySelector('#b64Sample').addEventListener('click', function () {
      input.value = '集成工具大全 · Base64 支持中文与 emoji 🎉';
      count.textContent = input.value.length.toLocaleString('zh-CN') + ' 字符';
      output.value = '';
      status.hidden = true;
      root.querySelector('#b64Encode').click();
    });

    root.querySelector('#b64Clear').addEventListener('click', function () {
      input.value = '';
      output.value = '';
      count.textContent = '0 字符';
      status.hidden = true;
      input.focus();
      window.UI.toast('已清空', 'success');
    });

    root.querySelector('#b64Copy').addEventListener('click', function () {
      window.UI.copyText(output.value);
    });

    /* ------------------------------ 文件模式 ------------------------------ */
    var fileInput = root.querySelector('#b64File');
    var fileMeta = root.querySelector('#b64FileMeta');
    var fileStatus = root.querySelector('#b64FileStatus');
    var fileOutput = root.querySelector('#b64FileOutput');
    var currentUri = '';

    function resetFile() {
      fileInput.value = '';
      fileOutput.value = '';
      currentUri = '';
      fileMeta.hidden = true;
      fileStatus.hidden = true;
      fileMeta.innerHTML = '';
    }

    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (file) handleFile(file);
    });

    // 拖放上传
    var dropzone = root.querySelector('#b64Drop');
    ['dragenter', 'dragover'].forEach(function (type) {
      dropzone.addEventListener(type, function (event) {
        event.preventDefault();
        dropzone.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach(function (type) {
      dropzone.addEventListener(type, function (event) {
        event.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });
    dropzone.addEventListener('drop', function (event) {
      var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) handleFile(file);
    });

    function handleFile(file) {
      if (file.size > MAX_FILE) {
        resetFile();
        fileStatus.className = 'status err';
        fileStatus.textContent = '文件过大（' + window.UI.formatBytes(file.size) + '），请选择小于 12MB 的文件，避免浏览器内存占用过高。';
        fileStatus.hidden = false;
        window.UI.toast('文件超出大小限制', 'error');
        return;
      }

      fileStatus.className = 'status info';
      fileStatus.textContent = '正在读取文件…';
      fileStatus.hidden = false;

      window.UI.readFileAsArrayBuffer(file).then(function (buffer) {
        var base64 = bufferToBase64(buffer);
        var mime = file.type || 'application/octet-stream';
        currentUri = 'data:' + mime + ';base64,' + base64;
        fileOutput.value = base64;

        var previewHtml = '';
        if (/^image\//.test(mime)) {
          previewHtml = '<img src="' + currentUri + '" alt="文件预览" style="max-height:120px;border-radius:8px;border:1px solid var(--border)">';
        }

        fileMeta.innerHTML = '<span class="name">' + window.UI.escapeHtml(file.name) + '</span>' +
          '<span>' + window.UI.formatBytes(file.size) + '</span>' +
          '<span>' + window.UI.escapeHtml(mime) + '</span>' +
          '<span>Base64 ' + window.UI.formatBytes(base64.length) + '</span>' +
          (previewHtml ? '<span style="flex-basis:100%">' + previewHtml + '</span>' : '');
        fileMeta.hidden = false;

        fileStatus.className = 'status ok';
        fileStatus.textContent = '转换完成：原始 ' + window.UI.formatBytes(file.size) +
          '，Base64 长度 ' + base64.length.toLocaleString('zh-CN') + ' 字符。';
        fileStatus.hidden = false;
        window.UI.toast('文件已转换为 Base64', 'success');
      }).catch(function (error) {
        fileStatus.className = 'status err';
        fileStatus.textContent = '读取失败：' + error.message;
        fileStatus.hidden = false;
      });
    }

    root.querySelector('#b64CopyRaw').addEventListener('click', function () {
      window.UI.copyText(fileOutput.value);
    });

    root.querySelector('#b64CopyUri').addEventListener('click', function () {
      window.UI.copyText(currentUri || fileOutput.value);
    });

    root.querySelector('#b64Save').addEventListener('click', function () {
      if (!fileOutput.value) {
        window.UI.toast('请先选择文件', 'warn');
        return;
      }
      window.UI.downloadText(fileOutput.value, 'base64.txt');
      window.UI.toast('已开始下载', 'success');
    });

    root.querySelector('#b64Reset').addEventListener('click', function () {
      resetFile();
      window.UI.toast('已清除文件', 'success');
    });
  }

  window.ToolModules['base64'] = render;
})();
