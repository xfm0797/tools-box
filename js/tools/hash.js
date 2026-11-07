/* =============================================================================
 * 工具：MD5 / SHA 哈希计算
 * -----------------------------------------------------------------------------
 * · MD5：内置纯 JS 实现（Web Crypto 不提供 MD5）
 * · SHA-1 / SHA-256 / SHA-384 / SHA-512：使用浏览器原生 Web Crypto（需 https 或 localhost）
 * 文本输入做防抖，文件在读取后计算；大文件给出耗时提示。
 * ========================================================================== */
(function () {
  'use strict';

  /* ------------------------- MD5 常量与实现 ------------------------- */
  var MD5_K = [
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee,
    0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
    0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
    0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
    0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa,
    0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
    0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
    0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
    0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
    0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05,
    0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039,
    0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
    0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
    0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391
  ];

  var MD5_S = (function () {
    var table = [];
    [[7, 12, 17, 22], [5, 9, 14, 20], [4, 11, 16, 23], [6, 10, 15, 21]].forEach(function (group) {
      for (var i = 0; i < 4; i += 1) {
        for (var j = 0; j < 4; j += 1) table.push(group[j]);
      }
    });
    return table;
  })();

  function leftRotate(value, bits) {
    return ((value << bits) | (value >>> (32 - bits))) >>> 0;
  }

  function bytesToHex(bytes) {
    var hex = '';
    for (var i = 0; i < bytes.length; i += 1) {
      hex += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
    }
    return hex;
  }

  /** 计算 MD5，返回小写十六进制字符串 */
  function md5(bytes) {
    var bitLength = bytes.length * 8;
    // 补位：0x80 + 若干 0，使长度 ≡ 56 (mod 64)，再追加 64 位小端长度
    var paddedLength = (((bytes.length + 8) >> 6) + 1) * 64;
    var buffer = new Uint8Array(paddedLength);
    buffer.set(bytes);
    buffer[bytes.length] = 0x80;

    var view = new DataView(buffer.buffer);
    view.setUint32(paddedLength - 8, bitLength % 4294967296, true);
    view.setUint32(paddedLength - 4, Math.floor(bitLength / 4294967296), true);

    var a0 = 0x67452301;
    var b0 = 0xefcdab89;
    var c0 = 0x98badcfe;
    var d0 = 0x10325476;
    var words = new Uint32Array(16);

    for (var offset = 0; offset < paddedLength; offset += 64) {
      for (var i = 0; i < 16; i += 1) {
        words[i] = view.getUint32(offset + i * 4, true);
      }

      var a = a0;
      var b = b0;
      var c = c0;
      var d = d0;

      for (var j = 0; j < 64; j += 1) {
        var f;
        var g;
        if (j < 16) {
          f = (b & c) | (~b & d);
          g = j;
        } else if (j < 32) {
          f = (d & b) | (~d & c);
          g = (5 * j + 1) % 16;
        } else if (j < 48) {
          f = b ^ c ^ d;
          g = (3 * j + 5) % 16;
        } else {
          f = c ^ (b | ~d);
          g = (7 * j) % 16;
        }

        f = (f + a + MD5_K[j] + words[g]) >>> 0;
        a = d;
        d = c;
        c = b;
        b = (b + leftRotate(f, MD5_S[j])) >>> 0;
      }

      a0 = (a0 + a) >>> 0;
      b0 = (b0 + b) >>> 0;
      c0 = (c0 + c) >>> 0;
      d0 = (d0 + d) >>> 0;
    }

    var output = new Uint8Array(16);
    var outView = new DataView(output.buffer);
    outView.setUint32(0, a0, true);
    outView.setUint32(4, b0, true);
    outView.setUint32(8, c0, true);
    outView.setUint32(12, d0, true);
    return bytesToHex(output);
  }

  /* ------------------------- SHA（Web Crypto） ------------------------- */
  function supportsSubtle() {
    return !!(window.crypto && window.crypto.subtle && window.crypto.subtle.digest);
  }

  function shaDigest(algorithm, bytes) {
    if (!supportsSubtle()) {
      return Promise.reject(new Error('当前环境不支持 Web Crypto（需要 https 或 localhost 访问），无法计算 SHA 系列摘要'));
    }
    return window.crypto.subtle.digest(algorithm, bytes).then(function (buffer) {
      return bytesToHex(new Uint8Array(buffer));
    });
  }

  function render(root) {
    root.innerHTML = `
      <div class="tabs" role="tablist" aria-label="哈希计算模式">
        <button type="button" class="tab active" role="tab" aria-selected="true" data-tab="text">文本</button>
        <button type="button" class="tab" role="tab" aria-selected="false" data-tab="file">文件</button>
      </div>

      <div class="form-row">
        <div class="form-item" style="flex:0 1 220px">
          <label class="label" for="hashAlgorithm">算法</label>
          <select id="hashAlgorithm" class="select">
            <option value="MD5" selected>MD5（128 位）</option>
            <option value="SHA-1">SHA-1（160 位）</option>
            <option value="SHA-256">SHA-256（256 位）</option>
            <option value="SHA-384">SHA-384（384 位）</option>
            <option value="SHA-512">SHA-512（512 位）</option>
          </select>
        </div>
      </div>

      <section data-panel="text">
        <div class="field">
          <div class="label-row">
            <label class="label" for="hashText">输入文本</label>
            <span class="label-meta" id="hashMeta">0 字符 / 0 字节</span>
          </div>
          <textarea id="hashText" class="textarea" rows="7" spellcheck="false"
            placeholder="输入需要计算摘要的文本，支持中文"></textarea>
        </div>

        <div class="btn-row">
          <button type="button" class="btn primary" id="hashRun">计算哈希</button>
          <button type="button" class="btn ghost" id="hashSample">示例</button>
          <button type="button" class="btn ghost" id="hashClear">清空</button>
        </div>
      </section>

      <section data-panel="file" hidden>
        <div class="dropzone" id="hashDrop">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><polyline points="14 3 14 8 19 8"/>
          </svg>
          <span><strong>点击选择文件</strong>，或拖拽到此处</span>
          <span>文件不会被上传，仅在本地读取计算</span>
          <input type="file" id="hashFile" aria-label="选择要计算哈希的文件">
        </div>
        <div class="file-meta" id="hashFileMeta" hidden></div>
        <div class="btn-row" style="margin-top:12px">
          <button type="button" class="btn" id="hashFileClear">清除文件</button>
        </div>
      </section>

      <div class="field">
        <div class="label-row">
          <label class="label" for="hashOutput">摘要（十六进制）</label>
          <div class="label-actions">
            <button type="button" class="link-btn" id="hashCopy">复制</button>
            <button type="button" class="link-btn" id="hashCopyUpper">复制大写</button>
          </div>
        </div>
        <textarea id="hashOutput" class="textarea mono" rows="4" readonly placeholder="计算结果会显示在这里"></textarea>
      </div>

      <div class="field">
        <label class="label" for="hashOutputUpper">大写形式</label>
        <textarea id="hashOutputUpper" class="textarea mono" rows="2" readonly placeholder="—"></textarea>
      </div>

      <p class="status" id="hashStatus" hidden></p>
      <p class="hint">MD5 与 SHA-1 已不适合用于安全场景（如密码存储），建议使用 SHA-256 及以上；本站仅用于校验文件完整性等用途。</p>
    `;

    window.UI.initTabs(root);

    var algorithm = root.querySelector('#hashAlgorithm');
    var textInput = root.querySelector('#hashText');
    var output = root.querySelector('#hashOutput');
    var outputUpper = root.querySelector('#hashOutputUpper');
    var meta = root.querySelector('#hashMeta');
    var status = root.querySelector('#hashStatus');

    function setStatus(type, text) {
      status.className = 'status ' + type;
      status.textContent = text;
      status.hidden = false;
    }

    function clearStatus() {
      status.hidden = true;
      status.textContent = '';
    }

    function showResult(hex, note) {
      output.value = hex;
      outputUpper.value = hex.toUpperCase();
      setStatus('ok', '计算完成：' + algorithm.value + ' · ' + hex.length * 4 + ' 位' + (note ? ' · ' + note : ''));
    }

    function computeForBytes(bytes, note) {
      var algo = algorithm.value;
      if (algo === 'MD5') {
        // 大文件同步计算会阻塞，放到下一个事件循环并提示
        return new Promise(function (resolve, reject) {
          setTimeout(function () {
            try { resolve(md5(bytes)); } catch (error) { reject(error); }
          }, 20);
        });
      }
      return shaDigest(algo, bytes);
    }

    function computeText() {
      var text = textInput.value;
      meta.textContent = text.length.toLocaleString('zh-CN') + ' 字符 / ' +
        new TextEncoder().encode(text).length.toLocaleString('zh-CN') + ' 字节';

      if (!text) {
        output.value = '';
        outputUpper.value = '';
        clearStatus();
        return;
      }

      var bytes = new TextEncoder().encode(text);
      output.value = '';
      outputUpper.value = '';

      computeForBytes(bytes).then(function (hex) {
        showResult(hex, text.length + ' 字符');
      }).catch(function (error) {
        setStatus('err', error.message);
      });
    }

    var debouncedCompute = window.UI.debounce(computeText, 260);

    textInput.addEventListener('input', debouncedCompute);
    algorithm.addEventListener('change', function () {
      // 文本内容存在时重算，否则重算文件
      if (textInput.value) computeText();
      else if (currentFile) computeFile(currentFile);
    });

    root.querySelector('#hashRun').addEventListener('click', function () {
      if (!textInput.value) {
        window.UI.toast('请先输入文本', 'warn');
        textInput.focus();
        return;
      }
      computeText();
    });

    root.querySelector('#hashSample').addEventListener('click', function () {
      textInput.value = '集成工具大全';
      computeText();
      window.UI.toast('已填入示例', 'info');
    });

    root.querySelector('#hashClear').addEventListener('click', function () {
      textInput.value = '';
      output.value = '';
      outputUpper.value = '';
      meta.textContent = '0 字符 / 0 字节';
      clearStatus();
      textInput.focus();
      window.UI.toast('已清空', 'success');
    });

    root.querySelector('#hashCopy').addEventListener('click', function () {
      window.UI.copyText(output.value);
    });

    root.querySelector('#hashCopyUpper').addEventListener('click', function () {
      window.UI.copyText(outputUpper.value);
    });

    /* ------------------------------ 文件模式 ------------------------------ */
    var fileInput = root.querySelector('#hashFile');
    var fileMeta = root.querySelector('#hashFileMeta');
    var currentFile = null;

    function computeFile(file) {
      if (file.size > 50 * 1024 * 1024) {
        setStatus('err', '文件超过 50MB，浏览器内存可能不足，建议先分片或使用命令行工具。');
        return;
      }
      setStatus('info', '正在读取文件并计算…（' + window.UI.formatBytes(file.size) + '）');

      window.UI.readFileAsArrayBuffer(file).then(function (buffer) {
        return computeForBytes(new Uint8Array(buffer));
      }).then(function (hex) {
        showResult(hex, file.name);
      }).catch(function (error) {
        setStatus('err', '计算失败：' + error.message);
      });
    }

    function handleFile(file) {
      if (!file) return;
      currentFile = file;
      fileMeta.innerHTML = '<span class="name">' + window.UI.escapeHtml(file.name) + '</span>' +
        '<span>' + window.UI.formatBytes(file.size) + '</span>' +
        '<span>' + window.UI.escapeHtml(file.type || '未知类型') + '</span>';
      fileMeta.hidden = false;
      computeFile(file);
    }

    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (file) handleFile(file);
    });

    (function bindDrop() {
      var zone = root.querySelector('#hashDrop');
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
        if (file) handleFile(file);
      });
    })();

    root.querySelector('#hashFileClear').addEventListener('click', function () {
      currentFile = null;
      fileInput.value = '';
      fileMeta.hidden = true;
      output.value = '';
      outputUpper.value = '';
      clearStatus();
      window.UI.toast('已清除文件', 'success');
    });

    computeText();
  }

  window.ToolModules['hash'] = render;
  window.HashLite = { md5: md5, sha: shaDigest };
})();
