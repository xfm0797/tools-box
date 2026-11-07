/* =============================================================================
 * 编码解码工具包 · 第三批（12 个）
 * -----------------------------------------------------------------------------
 * quoted-printable  Quoted-Printable（邮件编码）
 * base62            Base62 编解码
 * crockford-base32  Crockford Base32
 * hexdump           Hexdump 视图
 * playfair          Playfair 密码
 * tap-code          敲击码
 * braille           盲文转换
 * hmac-gen          HMAC 签名
 * file-hash         文件哈希
 * luhn              Luhn 校验位
 * xor-cipher        XOR 加密
 * escape-regex      正则转义
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  function textToBytes(text) {
    return new Uint8Array(new TextEncoder().encode(text));
  }
  function bytesToText(bytes) {
    return new TextDecoder().decode(bytes);
  }
  function bytesToHex(bytes) {
    return Array.prototype.map.call(bytes, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  function hexToBytes(hex) {
    var clean = hex.replace(/[^0-9a-fA-F]/g, '');
    if (clean.length % 2) throw new Error('十六进制长度必须是偶数');
    var out = new Uint8Array(clean.length / 2);
    for (var i = 0; i < out.length; i += 1) out[i] = parseInt(clean.substr(i * 2, 2), 16);
    return out;
  }
  function bytesToB64(bytes) {
    var bin = '';
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin);
  }
  function b64ToBytes(b64) {
    var clean = b64.replace(/[\s]/g, '').replace(/-/g, '+').replace(/_/g, '/');
    while (clean.length % 4) clean += '=';
    var bin = atob(clean);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
    return out;
  }

  /* ------------------------------ 1. Quoted-Printable ------------------------------ */
  function renderQp(root) {
    K.text(root, {
      uid: 'qp',
      inputLabel: '输入内容',
      inputRows: 7,
      options: [
        { id: 'mode', label: '方向', type: 'select', value: 'encode',
          options: [{ value: 'encode', label: '编码（文本 → QP）' }, { value: 'decode', label: '解码（QP → 文本）' }] },
        { id: 'cjk', label: '编码时强制转义 ASCII（测试用）', type: 'checkbox' }
      ],
      hint: 'RFC 2045 邮件编码：非 ASCII 字节写成 =XX，行尾 = 表示软换行。',
      sample: '主题：测试邮件\n中文内容 = 可读性测试 ABC',
      run: function (text, v) {
        if (v.mode === 'decode') {
          var bytes = [];
          var src = text.replace(/=\r?\n/g, ''); // 软换行直接拼接
          for (var i = 0; i < src.length; i += 1) {
            if (src[i] === '=') {
              var hex = src.substr(i + 1, 2);
              if (!/^[0-9a-fA-F]{2}$/.test(hex)) return { error: '第 ' + (i + 1) + ' 个字符附近存在非法的 =XX 转义' };
              bytes.push(parseInt(hex, 16));
              i += 2;
            } else {
              bytes.push(src.charCodeAt(i) & 0xff);
            }
          }
          return { output: bytesToText(new Uint8Array(bytes)), note: '解码完成' };
        }
        // 编码
        var bytes = textToBytes(text);
        var out = '';
        var lineLen = 0;
        bytes.forEach(function (b) {
          var plain = v.cjk ? false : (b >= 33 && b <= 126 && b !== 61);
          var chunk = plain ? String.fromCharCode(b) : '=' + b.toString(16).toUpperCase().padStart(2, '0');
          if (lineLen + chunk.length > 75) { out += '=\r\n'; lineLen = 0; }
          out += chunk;
          lineLen += chunk.length;
        });
        return { output: out, note: '编码完成，' + out.length + ' 字符' };
      }
    });
  }

  /* ------------------------------ 2. Base62 ------------------------------ */
  var B62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

  function renderBase62(root) {
    K.text(root, {
      uid: 'b62',
      inputLabel: '输入内容',
      inputRows: 6,
      options: [
        { id: 'mode', label: '方向', type: 'select', value: 'encode',
          options: [{ value: 'encode', label: '编码（文本 → Base62）' }, { value: 'decode', label: '解码（Base62 → 文本）' }] }
      ],
      hint: '字节串按大端整数转 62 进制（0-9a-zA-Z），常用于短 ID 与短链接。',
      sample: 'Hello，短链接测试 123',
      run: function (text, v) {
        if (v.mode === 'decode') {
          if (!/^[0-9a-zA-Z\s]+$/.test(text.trim())) return { error: 'Base62 只包含 0-9、a-z、A-Z' };
          var n = BigInt(0);
          text.trim().split('').forEach(function (ch) { n = n * 62n + BigInt(B62.indexOf(ch)); });
          var hex = n.toString(16);
          if (hex.length % 2) hex = '0' + hex;
          var bytes = new Uint8Array(hex.length / 2);
          for (var i = 0; i < bytes.length; i += 1) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
          return { output: bytesToText(bytes), note: '解码完成' };
        }
        var bytes = textToBytes(text);
        var num = BigInt(0);
        bytes.forEach(function (b) { num = (num << 8n) + BigInt(b); });
        if (num === 0n) return { output: '0', note: '空输入编码为 0' };
        var out = '';
        while (num > 0n) { out = B62[Number(num % 62n)] + out; num /= 62n; }
        return { output: out, note: '编码完成，' + out.length + ' 字符' };
      }
    });
  }

  /* ------------------------------ 3. Crockford Base32 ------------------------------ */
  var C32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // 去掉 I L O U

  function renderCrockford(root) {
    K.text(root, {
      uid: 'crockford',
      inputLabel: '输入内容',
      inputRows: 6,
      options: [
        { id: 'mode', label: '方向', type: 'select', value: 'encode',
          options: [{ value: 'encode', label: '编码（文本 → Crockford32）' }, { value: 'decode', label: '解码（Crockford32 → 文本）' }] },
        { id: 'group', label: '编码时按 5 位分组加连字符', type: 'checkbox' }
      ],
      hint: 'Crockford Base32 去掉 I、L、O、U，避免手抄混淆；解码时 0/O、1/I/L 自动归一。',
      sample: 'Hello Crockford',
      run: function (text, v) {
        if (v.mode === 'decode') {
          var clean = text.toUpperCase().replace(/[\s-]/g, '')
            .replace(/O/g, '0').replace(/[IL]/g, '1');
          if (!clean.length) return { error: '请输入要解码的内容' };
          var num = BigInt(0);
          for (var i = 0; i < clean.length; i += 1) {
            var idx = C32.indexOf(clean[i]);
            if (idx < 0) return { error: '含有非法字符：' + clean[i] + '（U 也不允许）' };
            num = num * 32n + BigInt(idx);
          }
          var hex = num.toString(16);
          if (hex.length % 2) hex = '0' + hex;
          var bytes = new Uint8Array(hex.length / 2);
          for (var j = 0; j < bytes.length; j += 1) bytes[j] = parseInt(hex.substr(j * 2, 2), 16);
          return { output: bytesToText(bytes), note: '解码完成' };
        }
        var bytes = textToBytes(text);
        var num2 = BigInt(0);
        bytes.forEach(function (b) { num2 = (num2 << 8n) + BigInt(b); });
        if (num2 === 0n) return { output: '0', note: '空输入编码为 0' };
        var out = '';
        while (num2 > 0n) { out = C32[Number(num2 % 32n)] + out; num2 /= 32n; }
        if (v.group) out = out.replace(/(.{5})(?=.)/g, '$1-');
        return { output: out, note: '编码完成' };
      }
    });
  }

  /* ------------------------------ 4. Hexdump 视图 ------------------------------ */
  function renderHexdump(root) {
    K.text(root, {
      uid: 'hexdump',
      inputLabel: '输入内容',
      inputRows: 8,
      options: [
        { id: 'cols', label: '每行字节数', type: 'select', value: '16',
          options: [{ value: '8', label: '8 字节' }, { value: '16', label: '16 字节' }, { value: '32', label: '32 字节' }] }
      ],
      hint: '类似 xxd：左边是偏移，中间十六进制，右边是可打印字符（不可见显示为点）。',
      sample: 'The quick brown fox jumps over the lazy dog。',
      run: function (text, v) {
        var bytes = textToBytes(text);
        var cols = Number(v.cols) || 16;
        var lines = [];
        for (var off = 0; off < bytes.length; off += cols) {
          var slice = bytes.slice(off, off + cols);
          var hexArr = Array.prototype.map.call(slice, function (b) { return b.toString(16).padStart(2, '0'); });
          // 每两个字节一组，组间留双空格（xxd 风格）
          var hexParts = [];
          for (var i = 0; i < hexArr.length; i += 2) {
            hexParts.push(hexArr[i] + (hexArr[i + 1] ? ' ' + hexArr[i + 1] : ''));
          }
          var ascii = Array.prototype.map.call(slice, function (b) {
            return b >= 32 && b < 127 ? String.fromCharCode(b) : '.';
          }).join('');
          lines.push(off.toString(16).padStart(8, '0') + '  ' + hexParts.join('  ').padEnd(cols * 2 + Math.floor(cols / 2) - 1, ' ') + '  |' + ascii + '|');
        }
        return {
          output: lines.join('\n'),
          html: '<pre class="code-block">' + K.esc(lines.join('\n')) + '</pre>',
          note: '共 ' + bytes.length + ' 字节，UTF-8 编码'
        };
      }
    });
  }

  /* ------------------------------ 5. Playfair 密码 ------------------------------ */
  function playfairSquare(key) {
    var seen = [];
    var chars = (key.toUpperCase().replace(/[^A-Z]/g, '').replace(/J/g, 'I') + 'ABCDEFGHIKLMNOPQRSTUVWXYZ').split('');
    chars.forEach(function (c) { if (seen.indexOf(c) < 0) seen.push(c); });
    var grid = [];
    for (var r = 0; r < 5; r += 1) grid.push(seen.slice(r * 5, r * 5 + 5));
    return grid;
  }
  function playfairPos(grid, ch) {
    for (var r = 0; r < 5; r += 1) {
      var c = grid[r].indexOf(ch);
      if (c >= 0) return [r, c];
    }
    return null;
  }
  function playfairTransform(text, grid, encrypt) {
    var letters = text.toUpperCase().replace(/[^A-Z]/g, '').replace(/J/g, 'I');
    if (letters.length < 2) throw new Error('至少需要 2 个字母');
    // 两两分组，重复字母间插 X，结尾补 X
    var pairs = [];
    for (var i = 0; i < letters.length; i += 1) {
      var a = letters[i];
      var b = letters[i + 1];
      if (!b || a === b) { pairs.push([a, 'X']); if (a === b) i += 0; }
      else { pairs.push([a, b]); i += 1; }
    }
    return pairs.map(function (pair) {
      var p1 = playfairPos(grid, pair[0]);
      var p2 = playfairPos(grid, pair[1]);
      if (!p1 || !p2) return pair.join('');
      if (p1[0] === p2[0]) { // 同行 → 右移
        return grid[p1[0]][(p1[1] + (encrypt ? 1 : 4)) % 5] + grid[p2[0]][(p2[1] + (encrypt ? 1 : 4)) % 5];
      }
      if (p1[1] === p2[1]) { // 同列 → 下移
        return grid[(p1[0] + (encrypt ? 1 : 4)) % 5][p1[1]] + grid[(p2[0] + (encrypt ? 1 : 4)) % 5][p2[1]];
      }
      return grid[p1[0]][p2[1]] + grid[p2[0]][p1[1]]; // 矩形对角
    }).join('');
  }

  function renderPlayfair(root) {
    K.text(root, {
      uid: 'playfair',
      inputLabel: '输入内容',
      inputRows: 6,
      options: [
        { id: 'mode', label: '方向', type: 'select', value: 'encrypt',
          options: [{ value: 'encrypt', label: '加密' }, { value: 'decrypt', label: '解密' }] },
        { id: 'key', label: '密钥（字母）', type: 'text', value: 'KEYWORD' }
      ],
      hint: '5×5 双字母替换密码，I/J 合并；非字母字符会被丢弃，解密结果里的 X 多为填充。',
      sample: 'HELLO WORLD MEETING AT FIVE',
      run: function (text, v) {
        if (!v.key.replace(/[^A-Za-z]/g, '').length) return { error: '请填写字母密钥' };
        var grid = playfairSquare(v.key);
        var result = playfairTransform(text, grid, v.mode === 'encrypt');
        var gridHtml = K.table(['', '1', '2', '3', '4', '5'], grid.map(function (row, i) {
          return [String(i + 1)].concat(row);
        }), { maxHeight: '220px' });
        return {
          output: result,
          html: '<div class="kv-list"><div class="kv"><span class="kv-key">密钥方阵</span><span class="kv-val mono">密钥「' + K.esc(v.key) + '」，J 并入 I</span></div></div>' + gridHtml,
          note: (v.mode === 'encrypt' ? '加密' : '解密') + '完成，输出 ' + result.length + ' 个字母'
        };
      }
    });
  }

  /* ------------------------------ 6. 敲击码 ------------------------------ */
  var TAP_ALPHABET = 'ABCDEFGHIKLMNOPQRSTUVWXYZ'; // C 与 K 共用一格

  function renderTapCode(root) {
    K.text(root, {
      uid: 'tapcode',
      inputLabel: '输入内容',
      inputRows: 5,
      options: [
        { id: 'mode', label: '方向', type: 'select', value: 'encode',
          options: [{ value: 'encode', label: '编码（字母 → 敲点）' }, { value: 'decode', label: '解码（敲点 → 字母）' }] },
        { id: 'join', label: '字母间分隔', type: 'select', value: ' / ',
          options: [{ value: ' / ', label: '斜杠 a.b / a.a' }, { value: '  ', label: '双空格' }] }
      ],
      hint: '5×5 波利比乌斯方阵：先敲行再敲列，C 与 K 同格。历史上用于隔墙传信。',
      sample: 'HELP ME PLEASE',
      run: function (text, v) {
        if (v.mode === 'encode') {
          var letters = text.toUpperCase().replace(/[^A-Z]/g, '').replace(/K/g, 'C');
          if (!letters.length) return { error: '没有可编码的字母' };
          var out = letters.split('').map(function (ch) {
            var idx = TAP_ALPHABET.indexOf(ch);
            var r = Math.floor(idx / 5) + 1;
            var c = (idx % 5) + 1;
            // 先敲行再敲列，行与列的敲点用空格隔开
            return '.'.repeat(r) + ' ' + '.'.repeat(c);
          });
          return { output: out.join(v.join), note: '共编码 ' + letters.length + ' 个字母（K 视作 C）' };
        }
        var groups = text.trim().split(/\s*\/\s*|\s{2,}|\s*，\s*/).filter(function (g) { return g.trim().length; });
        if (!groups.length) return { error: '请输入敲点，如 . ... / . ..' };
        var chars = groups.map(function (group) {
          // 行、列敲点需要用空格分开（如 ... .）
          var segments = group.trim().split(/\s+/).map(function (s) { return s.length; });
          if (segments.length === 2 && segments[0] >= 1 && segments[0] <= 5 && segments[1] >= 1 && segments[1] <= 5) {
            return TAP_ALPHABET[(segments[0] - 1) * 5 + (segments[1] - 1)] || '?';
          }
          return '?';
        });
        return { output: chars.join(''), note: '解码时行、列敲点需要用空格分开（如 ... .）' };
      }
    });
  }

  /* ------------------------------ 7. 盲文转换 ------------------------------ */
  var BRAILLE = { a: 0x01, b: 0x03, c: 0x09, d: 0x19, e: 0x11, f: 0x0B, g: 0x1B, h: 0x13, i: 0x0A, j: 0x1A,
    k: 0x05, l: 0x07, m: 0x0D, n: 0x1D, o: 0x15, p: 0x0F, q: 0x1F, r: 0x17, s: 0x0E, t: 0x1E,
    u: 0x25, v: 0x27, w: 0x3A, x: 0x2D, y: 0x3D, z: 0x35,
    '1': 0x01, '2': 0x03, '3': 0x09, '4': 0x19, '5': 0x11, '6': 0x0B, '7': 0x1B, '8': 0x13, '9': 0x0A, '0': 0x1A };

  function renderBraille(root) {
    K.text(root, {
      uid: 'braille',
      inputLabel: '输入内容',
      inputRows: 5,
      options: [
        { id: 'mode', label: '方向', type: 'select', value: 'encode',
          options: [{ value: 'encode', label: '编码（字母 → 盲文点字）' }, { value: 'decode', label: '解码（盲文 → 字母）' }] }
      ],
      hint: '英文一级盲文（Grade 1）的 26 个基本字母与数字前缀，仅覆盖字母数字，非一一对应的缩写形式不在内。',
      sample: 'hello world 2024',
      run: function (text, v) {
        if (v.mode === 'encode') {
          var out = text.split('').map(function (ch) {
            var lower = ch.toLowerCase();
            if (BRAILLE[lower] !== undefined) {
              // 数字需要数字前缀 ⠼（0x3C）
              if (/[0-9]/.test(ch)) return '\u2800\u283c' + String.fromCharCode(0x2800 + BRAILLE[lower]);
              return String.fromCharCode(0x2800 + BRAILLE[lower]);
            }
            return ch;
          }).join('');
          return { output: out, note: '已转换，复制后可粘贴到任何支持 Unicode 盲文的编辑器' };
        }
        var rev = {};
        Object.keys(BRAILLE).forEach(function (k2) {
          if (rev[BRAILLE[k2]] === undefined || /[a-z]/.test(k2)) rev[BRAILLE[k2]] = k2;
        });
        var result = text.split('').map(function (ch) {
          var code = ch.charCodeAt(0);
          if (code === 0x283C) return ''; // 数字前缀跳过
          if (code >= 0x2800 && code <= 0x28FF) return rev[code - 0x2800] || '';
          return ch;
        }).join('');
        return { output: result, note: '解码完成' };
      }
    });
  }

  /* ------------------------------ 8. HMAC 签名 ------------------------------ */
  function renderHmacGen(root) {
    K.form(root, {
      uid: 'hmacgen',
      actionLabel: '计算签名',
      fields: [
        { id: 'msg', label: '消息内容', type: 'textarea', rows: 4, wide: true, value: '需要签名的内容' },
        { id: 'key', label: '密钥', type: 'text', value: 'secret-key', wide: true },
        { id: 'alg', label: '哈希算法', type: 'select', value: 'SHA-256',
          options: [{ value: 'SHA-1', label: 'SHA-1' }, { value: 'SHA-256', label: 'SHA-256（推荐）' },
            { value: 'SHA-384', label: 'SHA-384' }, { value: 'SHA-512', label: 'SHA-512' }] }
      ],
      hint: '使用 Web Crypto 的 HMAC，与各语言 hmac 库结果一致；密钥只在本地参与运算。',
      run: function (v) {
        if (!v.key) return { error: '请填写密钥' };
        if (!window.crypto || !window.crypto.subtle) {
          return { error: '当前环境不支持 Web Crypto，请用 https 或 localhost 打开' };
        }
        return window.crypto.subtle.importKey('raw', textToBytes(v.key), { name: 'HMAC', hash: { name: v.alg } }, false, ['sign'])
          .then(function (key) { return window.crypto.subtle.sign('HMAC', key, textToBytes(v.msg)); })
          .then(function (sig) {
            var bytes = new Uint8Array(sig);
            var hex = bytesToHex(bytes);
            return {
              rows: [
                { key: v.alg + '（十六进制）', value: hex },
                { key: 'Base64', value: bytesToB64(bytes) },
                { key: '摘要长度', value: bytes.length + ' 字节' }
              ],
              note: '签名完成'
            };
          });
      }
    });
  }

  /* ------------------------------ 9. 文件哈希 ------------------------------ */
  function renderFileHash(root) {
    var uid = K.uid('filehash');
    root.innerHTML =
      '<label class="dropzone" for="' + uid + '-file">' +
        '<span><strong>点击选择文件</strong>，或拖拽到此处</span>' +
        '<span>任意类型文件 · 最大 50MB · 只在本机计算</span>' +
        '<input type="file" id="' + uid + '-file">' +
      '</label>' +
      '<div id="' + uid + '-result"></div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      '<p class="hint">SHA 系列通过 Web Crypto 计算，MD5 未内置。校验下载文件时把官方 SHA-256 与结果对比即可。</p>';

    var resultBox = root.querySelector('#' + uid + '-result');
    var statusEl = root.querySelector('#' + uid + '-status');

    function setStatus(type, text) {
      if (!text) { statusEl.hidden = true; return; }
      statusEl.className = 'status ' + type;
      statusEl.textContent = text;
      statusEl.hidden = false;
    }

    function handle(file) {
      if (!file) return;
      if (file.size > 50 * 1024 * 1024) { setStatus('err', '文件超过 50MB，请先压缩'); return; }
      setStatus('info', '正在读取文件…');
      window.UI.readFileAsArrayBuffer(file).then(function (buffer) {
        var algos = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];
        return Promise.all(algos.map(function (a) {
          return window.crypto.subtle.digest(a, buffer).then(function (d) {
            return { alg: a, hex: bytesToHex(new Uint8Array(d)) };
          });
        })).then(function (rows) {
          resultBox.innerHTML = K.kv([{ key: '文件', value: file.name }, { key: '大小', value: K.formatBytes(file.size) }]
            .concat(rows.map(function (r) { return { key: r.alg, value: r.hex }; })));
          setStatus('ok', '计算完成');
        });
      }).catch(function (e) {
        setStatus('err', '读取失败：' + (e.message || '未知错误'));
      });
    }

    var input = root.querySelector('#' + uid + '-file');
    input.addEventListener('change', function () { handle(input.files && input.files[0]); input.value = ''; });
    var zone = input.closest('.dropzone');
    ['dragenter', 'dragover'].forEach(function (type) {
      zone.addEventListener(type, function (e) { e.preventDefault(); zone.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(function (type) {
      zone.addEventListener(type, function (e) { e.preventDefault(); zone.classList.remove('dragover'); });
    });
    zone.addEventListener('drop', function (e) {
      handle(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
    });
  }

  /* ------------------------------ 10. Luhn 校验位 ------------------------------ */
  function luhnCheck(digits) {
    var sum = 0;
    var len = digits.length;
    for (var i = 0; i < len; i += 1) {
      var d = Number(digits[len - 1 - i]);
      if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
    }
    return sum % 10 === 0;
  }
  function luhnCheckDigit(payload) {
    var sum = 0;
    var len = payload.length;
    for (var i = 0; i < len; i += 1) {
      var d = Number(payload[len - 1 - i]);
      if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
    }
    return (10 - (sum % 10)) % 10;
  }

  function renderLuhn(root) {
    K.form(root, {
      uid: 'luhn',
      actionLabel: '校验 / 计算校验位',
      fields: [
        { id: 'number', label: '号码（信用卡、会员卡等）', type: 'text', value: '4111 1111 1111 1111', wide: true },
        { id: 'action', label: '操作', type: 'select', value: 'validate',
          options: [{ value: 'validate', label: '校验完整号码' }, { value: 'checkdigit', label: '为前缀计算校验位' }] }
      ],
      hint: 'Luhn 算法用于识别手输错误，不是安全校验；只说明号码「格式可能正确」。',
      run: function (v) {
        var digits = v.number.replace(/[\s-]/g, '');
        if (!/^\d{2,25}$/.test(digits)) return { error: '请输入 2–25 位数字' };
        if (v.action === 'checkdigit') {
          var payload = digits.slice(0, -1);
          var cd = luhnCheckDigit(payload);
          return {
            rows: [
              { key: '前缀', value: payload },
              { key: '校验位', value: String(cd) },
              { key: '完整号码', value: payload + cd },
              { key: '校验结果', value: luhnCheck(payload + cd) ? '通过' : '异常' }
            ],
            note: '已按 Luhn 算法补齐最后一位'
          };
        }
        var last = digits.slice(-1);
        var expected = luhnCheckDigit(digits.slice(0, -1));
        return {
          html: '<div class="big-result">' + (luhnCheck(digits) ? '✅ 校验通过' : '❌ 校验不通过') + '</div>',
          rows: [
            { key: '号码', value: digits },
            { key: '末位校验位', value: last },
            { key: '应为', value: String(expected) },
            { key: '掩码显示', value: '**** **** **** ' + last }
          ],
          note: luhnCheck(digits) ? '格式符合 Luhn 规则' : '末位不符，可能抄错或输错一位'
        };
      }
    });
  }

  /* ------------------------------ 11. XOR 加密 ------------------------------ */
  function renderXor(root) {
    K.text(root, {
      uid: 'xor',
      inputLabel: '输入内容',
      inputRows: 6,
      options: [
        { id: 'mode', label: '方向', type: 'select', value: 'encrypt',
          options: [{ value: 'encrypt', label: '加密（文本 → 密文）' }, { value: 'decrypt', label: '解密（密文 → 文本）' }] },
        { id: 'key', label: '密钥（任意字符串，循环使用）', type: 'text', value: 'key' },
        { id: 'format', label: '密文格式', type: 'select', value: 'hex',
          options: [{ value: 'hex', label: '十六进制' }, { value: 'base64', label: 'Base64' }] }
      ],
      hint: 'XOR 是对称操作：加密解密同一把钥匙。仅用于演示原理，不具备真实安全性。',
      sample: 'The secret is 42',
      run: function (text, v) {
        if (!v.key) return { error: '请填写密钥' };
        var keyBytes = textToBytes(v.key);
        var dataBytes;
        if (v.mode === 'decrypt') {
          dataBytes = v.format === 'base64' ? b64ToBytes(text) : hexToBytes(text);
        } else {
          dataBytes = textToBytes(text);
        }
        var out = new Uint8Array(dataBytes.length);
        for (var i = 0; i < dataBytes.length; i += 1) out[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
        if (v.mode === 'decrypt') {
          try {
            return { output: bytesToText(out), note: '解密完成' };
          } catch (e) {
            return { error: '解密结果不是合法 UTF-8，密钥或密文可能有误' };
          }
        }
        return {
          output: v.format === 'base64' ? bytesToB64(out) : bytesToHex(out),
          note: '加密完成，' + out.length + ' 字节'
        };
      }
    });
  }

  /* ------------------------------ 12. 正则转义 ------------------------------ */
  function renderEscapeRegex(root) {
    K.text(root, {
      uid: 'escaperegex',
      inputLabel: '输入内容',
      inputRows: 6,
      options: [
        { id: 'mode', label: '方向', type: 'select', value: 'escape',
          options: [{ value: 'escape', label: '转义（当作普通文字匹配）' }, { value: 'unescape', label: '反转义（去掉多余反斜杠）' }] },
        { id: 'wrap', label: '输出包裹成 /…/i', type: 'checkbox' }
      ],
      hint: '把用户输入安全地嵌进正则：转义后按字面匹配，避免 ( ) * [ ] 被当作语法。',
      sample: '订单号：(2024)-No.[A] 总价 $1,000.99 *限时*',
      run: function (text, v) {
        var out;
        if (v.mode === 'escape') {
          out = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (v.wrap) out = '/' + out + '/i';
        } else {
          out = text.replace(/\\([.*+?^${}()|[\]\\])/g, '$1').replace(/^\/(.*)\/[a-z]*$/i, '$1');
        }
        return { output: out, note: v.mode === 'escape' ? '已转义 ' + (text.match(/[.*+?^${}()|[\]\\]/g) || []).length + ' 个元字符' : '已还原' };
      }
    });
  }

  window.ToolModules['quoted-printable'] = renderQp;
  window.ToolModules['base62'] = renderBase62;
  window.ToolModules['crockford-base32'] = renderCrockford;
  window.ToolModules['hexdump'] = renderHexdump;
  window.ToolModules['playfair'] = renderPlayfair;
  window.ToolModules['tap-code'] = renderTapCode;
  window.ToolModules['braille'] = renderBraille;
  window.ToolModules['hmac-gen'] = renderHmacGen;
  window.ToolModules['file-hash'] = renderFileHash;
  window.ToolModules['luhn'] = renderLuhn;
  window.ToolModules['xor-cipher'] = renderXor;
  window.ToolModules['escape-regex'] = renderEscapeRegex;
})();
