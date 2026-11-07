/* =============================================================================
 * 编码解码工具包（16 个）
 * -----------------------------------------------------------------------------
 * html-entities / hex-text / binary-text / ascii-table / morse-code /
 * caesar-cipher / rot-cipher / base32 / base58 / jwt-decode / utf8-bytes /
 * vigenere / atbash / base64url / punycode / url-builder
 *
 * Base32、Base58、Punycode、JWT 解析均为本地实现，不依赖任何第三方库。
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  var encoder = new TextEncoder();
  var decoder = new TextDecoder('utf-8');

  /* ------------------------------ 公共编解码 ------------------------------ */

  function bytesToBinary(bytes) {
    var parts = [];
    for (var i = 0; i < bytes.length; i += 8192) {
      parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + 8192)));
    }
    return parts.join('');
  }

  function binaryToBytes(binary) {
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i) & 0xff;
    return bytes;
  }

  function toBase64(bytes) {
    return btoa(bytesToBinary(bytes));
  }

  function fromBase64(text) {
    return binaryToBytes(atob(text.replace(/\s+/g, '')));
  }

  var B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  function base32Encode(bytes) {
    var bits = 0;
    var value = 0;
    var out = '';
    for (var i = 0; i < bytes.length; i += 1) {
      value = ((value << 8) | bytes[i]) & 0xffff;
      bits += 8;
      while (bits >= 5) {
        out += B32[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits > 0) out += B32[(value << (5 - bits)) & 31];
    while (out.length % 8 !== 0) out += '=';
    return out;
  }

  function base32Decode(text) {
    var clean = text.replace(/=+$/, '').replace(/\s+/g, '').toUpperCase();
    var bits = 0;
    var value = 0;
    var out = [];
    for (var i = 0; i < clean.length; i += 1) {
      var index = B32.indexOf(clean.charAt(i));
      if (index === -1) throw new Error('包含非法 Base32 字符：' + clean.charAt(i));
      value = ((value << 5) | index) & 0xffff;
      bits += 5;
      if (bits >= 8) {
        out.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }
    return new Uint8Array(out);
  }

  var B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

  function base58Encode(bytes) {
    if (!bytes.length) return '';
    var zeros = 0;
    while (zeros < bytes.length && bytes[zeros] === 0) zeros += 1;
    var digits = [0];
    for (var i = zeros; i < bytes.length; i += 1) {
      var carry = bytes[i];
      for (var j = 0; j < digits.length; j += 1) {
        carry += digits[j] << 8;
        digits[j] = carry % 58;
        carry = Math.floor(carry / 58);
      }
      while (carry > 0) {
        digits.push(carry % 58);
        carry = Math.floor(carry / 58);
      }
    }
    var out = '';
    for (var z = 0; z < zeros; z += 1) out += '1';
    for (var k = digits.length - 1; k >= 0; k -= 1) out += B58.charAt(digits[k]);
    return out;
  }

  function base58Decode(text) {
    var clean = text.replace(/\s+/g, '');
    var zeros = 0;
    while (zeros < clean.length && clean.charAt(zeros) === '1') zeros += 1;
    var bytes = [0];
    for (var i = zeros; i < clean.length; i += 1) {
      var index = B58.indexOf(clean.charAt(i));
      if (index === -1) throw new Error('包含非法 Base58 字符：' + clean.charAt(i));
      var carry = index;
      for (var j = 0; j < bytes.length; j += 1) {
        carry += bytes[j] * 58;
        bytes[j] = carry & 0xff;
        carry >>= 8;
      }
      while (carry > 0) {
        bytes.push(carry & 0xff);
        carry >>= 8;
      }
    }
    var out = new Uint8Array(zeros + bytes.length);
    for (var k = 0; k < bytes.length; k += 1) out[out.length - 1 - k] = bytes[k];
    return out;
  }

  function base64UrlEncode(text) {
    return toBase64(encoder.encode(text)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function base64UrlDecode(text) {
    var base = text.replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, '');
    while (base.length % 4 !== 0) base += '=';
    return decoder.decode(fromBase64(base));
  }

  /* ------------------------------ HTML 实体 ------------------------------ */
  function renderHtmlEntities(root) {
    K.text(root, {
      uid: 'ent',
      inputLabel: '输入内容',
      outputLabel: '结果',
      actionLabel: '转换',
      options: [
        {
          id: 'mode', type: 'select', label: '处理方式', value: 'encode',
          options: [
            { value: 'encode', label: '编码（& < > " \'）' },
            { value: 'decode', label: '解码（还原实体）' },
            { value: 'encodeAll', label: '编码全部非 ASCII 字符' }
          ]
        }
      ],
      sample: '<a href="https://example.com" title="示例">中文 & 符号</a>',
      run: function (text, opt) {
        if (opt.mode === 'decode') {
          var box = document.createElement('textarea');
          box.innerHTML = text;
          return { output: box.value, note: '已还原 HTML 实体。' };
        }
        if (opt.mode === 'encodeAll') {
          var out = '';
          for (var i = 0; i < text.length; i += 1) {
            var code = text.charCodeAt(i);
            out += code > 0x7e ? '&#' + code + ';' : text.charAt(i)
              .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          }
          return { output: out, note: '已把非 ASCII 字符转换为数字实体。' };
        }
        return {
          output: text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
          note: '已转义 5 个 HTML 特殊字符。'
        };
      }
    });
  }

  /* ------------------------------ 十六进制 ------------------------------ */
  function renderHex(root) {
    K.text(root, {
      uid: 'hex',
      inputLabel: '输入文本或十六进制串',
      outputLabel: '结果',
      actionLabel: '转换',
      options: [
        {
          id: 'mode', type: 'select', label: '方向', value: 'encode',
          options: [{ value: 'encode', label: '文本 → 十六进制' }, { value: 'decode', label: '十六进制 → 文本' }]
        },
        { id: 'space', type: 'checkbox', label: '字节间加空格', value: true },
        { id: 'upper', type: 'checkbox', label: '使用大写字母' }
      ],
      sample: '集成工具 Hello',
      run: function (text, opt) {
        if (opt.mode === 'encode') {
          var bytes = encoder.encode(text);
          var list = [];
          for (var i = 0; i < bytes.length; i += 1) {
            var hex = bytes[i].toString(16);
            if (hex.length < 2) hex = '0' + hex;
            list.push(opt.upper ? hex.toUpperCase() : hex);
          }
          return { output: list.join(opt.space ? ' ' : ''), note: text.length + ' 字符 → ' + bytes.length + ' 字节。' };
        }
        var clean = text.replace(/0x/gi, '').replace(/[\s,;:]+/g, '');
        if (!clean) return { error: '请粘贴十六进制字符串。' };
        if (/[^0-9a-fA-F]/.test(clean)) return { error: '包含非十六进制字符（只允许 0-9、a-f）。' };
        if (clean.length % 2 !== 0) return { error: '十六进制字符数应为偶数（每 2 个字符表示 1 字节），当前为 ' + clean.length + ' 个。' };
        var out = new Uint8Array(clean.length / 2);
        for (var j = 0; j < out.length; j += 1) out[j] = parseInt(clean.substr(j * 2, 2), 16);
        return { output: decoder.decode(out), note: '已把 ' + out.length + ' 字节还原为文本。' };
      }
    });
  }

  /* ------------------------------ 二进制 ------------------------------ */
  function renderBinary(root) {
    K.text(root, {
      uid: 'bin',
      inputLabel: '输入文本或二进制串',
      outputLabel: '结果',
      actionLabel: '转换',
      options: [
        {
          id: 'mode', type: 'select', label: '方向', value: 'encode',
          options: [{ value: 'encode', label: '文本 → 二进制' }, { value: 'decode', label: '二进制 → 文本' }]
        },
        { id: 'space', type: 'checkbox', label: '字节间加空格', value: true }
      ],
      sample: 'Hello 你好',
      run: function (text, opt) {
        if (opt.mode === 'encode') {
          var bytes = encoder.encode(text);
          var list = [];
          for (var i = 0; i < bytes.length; i += 1) {
            list.push(('0000000' + bytes[i].toString(2)).slice(-8));
          }
          return { output: list.join(opt.space ? ' ' : ''), note: bytes.length + ' 字节，共 ' + bytes.length * 8 + ' 位。' };
        }
        var clean = text.replace(/[\s,;]+/g, '');
        if (!clean) return { error: '请粘贴二进制字符串。' };
        if (/[^01]/.test(clean)) return { error: '只允许 0 和 1。' };
        if (clean.length % 8 !== 0) return { error: '二进制位数应为 8 的倍数，当前为 ' + clean.length + ' 位。' };
        var out = new Uint8Array(clean.length / 8);
        for (var j = 0; j < out.length; j += 1) out[j] = parseInt(clean.substr(j * 8, 8), 2);
        return { output: decoder.decode(out), note: '已还原 ' + out.length + ' 字节。' };
      }
    });
  }

  /* ------------------------------ ASCII 码表 ------------------------------ */
  var CTRL_NAMES = ['NUL', 'SOH', 'STX', 'ETX', 'EOT', 'ENQ', 'ACK', 'BEL', 'BS', 'HT', 'LF', 'VT', 'FF', 'CR', 'SO', 'SI',
    'DLE', 'DC1', 'DC2', 'DC3', 'DC4', 'NAK', 'SYN', 'ETB', 'CAN', 'EM', 'SUB', 'ESC', 'FS', 'GS', 'RS', 'US'];

  function renderAscii(root) {
    var uid = K.uid('ascii');
    root.innerHTML =
      '<div class="field">' +
        '<div class="label-row"><label class="label" for="' + uid + '-q">筛选（十进制 / 十六进制 / 字符）</label></div>' +
        '<input id="' + uid + '-q" class="input mono" type="search" placeholder="输入 65 或 0x41 或 A 进行筛选">' +
      '</div>' +
      '<div id="' + uid + '-table"></div>' +
      '<p class="hint">ASCII 共 128 个字符（0–127），其中 0–31 与 127 为控制字符，无法直接显示。</p>';

    var rows = [];
    for (var i = 0; i < 128; i += 1) {
      var charText = i === 32 ? '空格' : (i < 32 || i === 127)
        ? (i === 127 ? 'DEL' : CTRL_NAMES[i])
        : String.fromCharCode(i);
      rows.push({
        dec: i,
        hex: '0x' + ('0' + i.toString(16).toUpperCase()).slice(-2),
        bin: ('0000000' + i.toString(2)).slice(-8),
        ch: charText,
        type: i < 32 || i === 127 ? '控制字符' : (i === 32 ? '空白' : '可打印')
      });
    }

    var tableBox = root.querySelector('#' + uid + '-table');
    var search = root.querySelector('#' + uid + '-q');

    function draw(keyword) {
      var q = (keyword || '').trim().toLowerCase();
      var filtered = rows.filter(function (row) {
        if (!q) return true;
        return String(row.dec) === q || row.hex.toLowerCase() === q || row.bin === q ||
          String(row.dec).indexOf(q) === 0 || String(row.ch).toLowerCase() === q ||
          row.type.toLowerCase().indexOf(q) !== -1;
      });
      tableBox.innerHTML = K.table(['十进制', '十六进制', '二进制', '字符', '类型'],
        filtered.map(function (row) {
          return [row.dec, row.hex, row.bin, { html: '<span class="mono">' + K.esc(row.ch) + '</span>' }, row.type];
        }), { maxHeight: '460px' }) +
        '<p class="hint">共 ' + filtered.length + ' 条结果。</p>';
    }

    search.addEventListener('input', window.UI.debounce(function () { draw(search.value); }, 150));
    draw('');
  }

  /* ------------------------------ 摩斯电码 ------------------------------ */
  var MORSE = {
    A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
    I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
    Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
    Y: '-.--', Z: '--..',
    '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
    '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
    '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--',
    '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
    ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-',
    '"': '.-..-.', '@': '.--.-.'
  };
  var MORSE_REVERSE = Object.create(null);
  Object.keys(MORSE).forEach(function (key) { MORSE_REVERSE[MORSE[key]] = key; });

  function renderMorse(root) {
    K.text(root, {
      uid: 'morse',
      inputLabel: '输入文本或摩斯电码',
      outputLabel: '结果',
      actionLabel: '转换',
      options: [
        {
          id: 'mode', type: 'select', label: '方向', value: 'encode',
          options: [{ value: 'encode', label: '文本 → 摩斯电码' }, { value: 'decode', label: '摩斯电码 → 文本' }]
        },
        { id: 'slash', type: 'checkbox', label: '用 / 分隔单词', value: true }
      ],
      sample: 'SOS HELLO',
      run: function (text, opt) {
        if (opt.mode === 'encode') {
          var groups = text.toUpperCase().split(/\s+/).filter(Boolean).map(function (word) {
            return Array.from(word).map(function (ch) {
              return MORSE[ch] || '';
            }).filter(Boolean).join(' ');
          }).filter(Boolean);
          if (!groups.length) return { error: '没有可转换的字符（仅支持字母、数字与常用标点）。' };
          return { output: groups.join(opt.slash ? ' / ' : '   '), note: '已编码 ' + groups.length + ' 个单词。' };
        }
        var words = text.replace(/\s*\/\s*/g, '|').split(/\s*\|\s*|\s{3,}/);
        var decoded = words.map(function (word) {
          return word.trim().split(/\s+/).filter(Boolean).map(function (code) {
            if (!MORSE_REVERSE[code]) throw new Error('无法识别的摩斯码：' + code);
            return MORSE_REVERSE[code];
          }).join('');
        });
        return { output: decoded.join(' '), note: '已解码 ' + decoded.length + ' 个单词。' };
      }
    });
  }

  /* ------------------------------ 凯撒密码 ------------------------------ */
  function caesarShift(text, shift) {
    return Array.from(text).map(function (ch) {
      var code = ch.charCodeAt(0);
      if (code >= 65 && code <= 90) return String.fromCharCode((code - 65 + shift + 26 * 100) % 26 + 65);
      if (code >= 97 && code <= 122) return String.fromCharCode((code - 97 + shift + 26 * 100) % 26 + 97);
      return ch;
    }).join('');
  }

  function renderCaesar(root) {
    var uid = K.uid('caesar');
    root.innerHTML =
      '<div class="field">' +
        '<div class="label-row"><label class="label" for="' + uid + '-input">输入文本</label></div>' +
        '<textarea id="' + uid + '-input" class="textarea mono" rows="5" spellcheck="false" placeholder="输入需要加密或解密的英文文本"></textarea>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-item"><label class="label" for="' + uid + '-shift">偏移量（1–25）</label>' +
          '<input id="' + uid + '-shift" class="input" type="number" value="3" min="1" max="25" step="1"></div>' +
        '<div class="form-item"><label class="label" for="' + uid + '-mode">方向</label>' +
          '<select id="' + uid + '-mode" class="select">' +
            '<option value="enc">加密（字母后移）</option><option value="dec">解密（字母前移）</option>' +
          '</select></div>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="' + uid + '-run">转换</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-sample">示例</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-clear">清空</button>' +
      '</div>' +
      '<div class="field">' +
        '<div class="label-row"><label class="label" for="' + uid + '-out">结果</label>' +
        '<div class="label-actions"><button type="button" class="link-btn" id="' + uid + '-copy">复制结果</button></div></div>' +
        '<textarea id="' + uid + '-out" class="textarea mono" rows="5" readonly></textarea>' +
      '</div>' +
      '<h2 class="sub-title">暴力破解（全部 25 种偏移）</h2>' +
      '<div class="kv-list" id="' + uid + '-brute"></div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      '<p class="hint">凯撒密码只移位英文字母，数字、标点与中文保持原样。仅适合了解古典密码原理，不能用于真实加密。</p>';

    var input = root.querySelector('#' + uid + '-input');
    var shiftEl = root.querySelector('#' + uid + '-shift');
    var modeEl = root.querySelector('#' + uid + '-mode');
    var out = root.querySelector('#' + uid + '-out');
    var brute = root.querySelector('#' + uid + '-brute');
    var statusEl = root.querySelector('#' + uid + '-status');

    function run() {
      var text = input.value;
      if (!text) { window.UI.toast('请先输入内容', 'warn'); input.focus(); return; }
      var shift = parseInt(shiftEl.value, 10);
      if (!isFinite(shift) || shift < 1 || shift > 25) {
        statusEl.className = 'status err';
        statusEl.textContent = '偏移量必须是 1–25 之间的整数。';
        statusEl.hidden = false;
        return;
      }
      var real = modeEl.value === 'dec' ? 26 - shift : shift;
      out.value = caesarShift(text, real);
      statusEl.className = 'status ok';
      statusEl.textContent = '已按偏移 ' + shift + ' ' + (modeEl.value === 'dec' ? '解密' : '加密') + '。';
      statusEl.hidden = false;

      brute.innerHTML = K.kv(Array.from({ length: 25 }, function (_, index) {
        return { key: '偏移 ' + (index + 1), value: caesarShift(text.split('\n')[0].slice(0, 60), index + 1) };
      }));
      K.bindCopy(brute);
    }

    root.querySelector('#' + uid + '-run').addEventListener('click', run);
    root.querySelector('#' + uid + '-copy').addEventListener('click', function () { window.UI.copyText(out.value); });
    root.querySelector('#' + uid + '-sample').addEventListener('click', function () {
      input.value = 'Hello World, this is a Caesar cipher demo.';
      run();
    });
    root.querySelector('#' + uid + '-clear').addEventListener('click', function () {
      input.value = '';
      out.value = '';
      brute.innerHTML = '';
      statusEl.hidden = true;
      window.UI.toast('已清空', 'success');
    });
  }

  /* ------------------------------ ROT13 / ROT47 ------------------------------ */
  function rot13(text) {
    return text.replace(/[a-zA-Z]/g, function (ch) {
      var base = ch <= 'Z' ? 65 : 97;
      return String.fromCharCode((ch.charCodeAt(0) - base + 13) % 26 + base);
    });
  }

  function rot47(text) {
    return text.replace(/[!-~]/g, function (ch) {
      return String.fromCharCode((ch.charCodeAt(0) - 33 + 47) % 94 + 33);
    });
  }

  function renderRot(root) {
    K.text(root, {
      uid: 'rot',
      inputLabel: '输入文本',
      outputLabel: '结果（再执行一次即可还原）',
      actionLabel: '转换',
      options: [
        {
          id: 'mode', type: 'select', label: '算法', value: 'rot13',
          options: [
            { value: 'rot13', label: 'ROT13（仅字母）' },
            { value: 'rot47', label: 'ROT47（全部可打印字符）' },
            { value: 'rot18', label: 'ROT18（字母 + 数字）' }
          ]
        }
      ],
      sample: 'Hello, World! 123',
      run: function (text, opt) {
        if (opt.mode === 'rot47') return { output: rot47(text), note: 'ROT47 为自反变换，再执行一次即可还原。' };
        if (opt.mode === 'rot18') {
          var step = rot13(text).replace(/[0-9]/g, function (ch) {
            return String((parseInt(ch, 10) + 5) % 10);
          });
          return { output: step, note: 'ROT18 = ROT13 + 数字位移 5。' };
        }
        return { output: rot13(text), note: 'ROT13 为自反变换，再执行一次即可还原。' };
      }
    });
  }

  /* ------------------------------ Base32 ------------------------------ */
  function renderBase32(root) {
    K.text(root, {
      uid: 'base32',
      inputLabel: '输入文本或 Base32 字符串',
      outputLabel: '结果',
      actionLabel: '转换',
      options: [
        {
          id: 'mode', type: 'select', label: '方向', value: 'encode',
          options: [{ value: 'encode', label: '编码（UTF-8 → Base32）' }, { value: 'decode', label: '解码' }]
        }
      ],
      sample: 'Hello 世界',
      run: function (text, opt) {
        if (opt.mode === 'encode') {
          var out = base32Encode(encoder.encode(text));
          return { output: out, note: 'Base32（RFC 4648）编码完成，共 ' + out.length + ' 个字符。' };
        }
        try {
          var bytes = base32Decode(text);
          return { output: decoder.decode(bytes), note: '解码出 ' + bytes.length + ' 字节。' };
        } catch (error) {
          return { error: '解码失败：' + error.message };
        }
      }
    });
  }

  /* ------------------------------ Base58 ------------------------------ */
  function renderBase58(root) {
    K.text(root, {
      uid: 'base58',
      inputLabel: '输入文本或 Base58 字符串',
      outputLabel: '结果',
      actionLabel: '转换',
      options: [
        {
          id: 'mode', type: 'select', label: '方向', value: 'encode',
          options: [{ value: 'encode', label: '编码（UTF-8 → Base58）' }, { value: 'decode', label: '解码' }]
        }
      ],
      sample: 'Bitcoin 比特币',
      run: function (text, opt) {
        if (opt.mode === 'encode') {
          var out = base58Encode(encoder.encode(text));
          return { output: out, note: 'Base58（Bitcoin 字母表）编码完成。' };
        }
        try {
          var bytes = base58Decode(text);
          return { output: decoder.decode(bytes), note: '解码出 ' + bytes.length + ' 字节。' };
        } catch (error) {
          return { error: '解码失败：' + error.message };
        }
      }
    });
  }

  /* ------------------------------ Base64URL ------------------------------ */
  function renderBase64Url(root) {
    K.text(root, {
      uid: 'b64url',
      inputLabel: '输入文本或 Base64URL 字符串',
      outputLabel: '结果',
      actionLabel: '转换',
      options: [
        {
          id: 'mode', type: 'select', label: '方向', value: 'encode',
          options: [
            { value: 'encode', label: '编码（去掉 + / = 的 URL 安全变体）' },
            { value: 'decode', label: '解码' }
          ]
        }
      ],
      sample: 'https://example.com/路径?x=1',
      run: function (text, opt) {
        if (opt.mode === 'encode') return { output: base64UrlEncode(text), note: 'Base64URL 编码完成（无填充）。' };
        try {
          return { output: base64UrlDecode(text), note: 'Base64URL 解码完成。' };
        } catch (error) {
          return { error: '解码失败：不是合法的 Base64URL 字符串。' };
        }
      }
    });
  }

  /* ------------------------------ UTF-8 字节 ------------------------------ */
  function renderUtf8(root) {
    var uid = K.uid('utf8');
    root.innerHTML =
      '<div class="field">' +
        '<div class="label-row"><label class="label" for="' + uid + '-input">输入文本</label>' +
        '<span class="label-meta" id="' + uid + '-count">0 字符</span></div>' +
        '<textarea id="' + uid + '-input" class="textarea" rows="6" spellcheck="false" placeholder="输入文本，查看每个字符的码点与 UTF-8 编码"></textarea>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="' + uid + '-run">分析</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-sample">示例</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-clear">清空</button>' +
      '</div>' +
      '<div id="' + uid + '-out"></div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      '<p class="hint">中文常用汉字占 3 字节，Emoji 占 4 字节；这解释了为什么「字数」和「文件体积」并不相等。</p>';

    var input = root.querySelector('#' + uid + '-input');
    var out = root.querySelector('#' + uid + '-out');
    var countEl = root.querySelector('#' + uid + '-count');
    var statusEl = root.querySelector('#' + uid + '-status');

    function analyze() {
      var text = input.value;
      if (!text) { window.UI.toast('请先输入文本', 'warn'); return; }
      var chars = Array.from(text);
      var limit = 500;
      var rows = chars.slice(0, limit).map(function (ch, index) {
        var code = ch.codePointAt(0);
        var bytes = encoder.encode(ch);
        var hex = [];
        for (var i = 0; i < bytes.length; i += 1) {
          hex.push(('0' + bytes[i].toString(16)).slice(-2).toUpperCase());
        }
        return [
          index + 1,
          ch === ' ' ? '空格' : ch === '\n' ? '换行' : ch,
          'U+' + ('0000' + code.toString(16).toUpperCase()).slice(-4),
          bytes.length,
          hex.join(' ')
        ];
      });
      var total = encoder.encode(text).length;
      out.innerHTML = K.stats([
        { label: '字符数（码点）', value: chars.length },
        { label: 'UTF-16 长度', value: text.length },
        { label: 'UTF-8 字节', value: total },
        { label: '平均字节/字符', value: K.num(total / (chars.length || 1), 2) }
      ]) + K.table(['#', '字符', '码点', '字节数', 'UTF-8 字节'], rows, { maxHeight: '420px' });
      statusEl.className = 'status ok';
      statusEl.textContent = chars.length > limit ? '内容较长，仅展示前 ' + limit + ' 个字符，统计仍按全文计算。' : '分析完成。';
      statusEl.hidden = false;
    }

    input.addEventListener('input', function () {
      countEl.textContent = Array.from(input.value).length + ' 字符';
    });
    root.querySelector('#' + uid + '-run').addEventListener('click', analyze);
    root.querySelector('#' + uid + '-sample').addEventListener('click', function () {
      input.value = 'A中😀';
      countEl.textContent = '3 字符';
      analyze();
    });
    root.querySelector('#' + uid + '-clear').addEventListener('click', function () {
      input.value = '';
      out.innerHTML = '';
      countEl.textContent = '0 字符';
      statusEl.hidden = true;
      window.UI.toast('已清空', 'success');
    });
  }

  /* ------------------------------ 维吉尼亚密码 ------------------------------ */
  function renderVigenere(root) {
    K.text(root, {
      uid: 'vig',
      inputLabel: '输入文本',
      outputLabel: '结果',
      actionLabel: '转换',
      options: [
        { id: 'key', type: 'text', label: '密钥（仅字母）', value: 'KEY', placeholder: '例如 KEY' },
        {
          id: 'mode', type: 'select', label: '方向', value: 'enc',
          options: [{ value: 'enc', label: '加密' }, { value: 'dec', label: '解密' }]
        }
      ],
      sample: 'Attack at dawn',
      run: function (text, opt) {
        var key = String(opt.key || '').replace(/[^a-zA-Z]/g, '').toUpperCase();
        if (!key) return { error: '请输入只包含字母的密钥。' };
        var index = 0;
        var out = Array.from(text).map(function (ch) {
          var code = ch.charCodeAt(0);
          var isUpper = code >= 65 && code <= 90;
          var isLower = code >= 97 && code <= 122;
          if (!isUpper && !isLower) return ch;
          var shift = key.charCodeAt(index % key.length) - 65;
          index += 1;
          if (opt.mode === 'dec') shift = 26 - shift;
          var base = isUpper ? 65 : 97;
          return String.fromCharCode((code - base + shift) % 26 + base);
        }).join('');
        return { output: out, note: '使用密钥 ' + key + ' ' + (opt.mode === 'dec' ? '解密' : '加密') + '，共处理 ' + index + ' 个字母。' };
      }
    });
  }

  /* ------------------------------ 埃特巴什 ------------------------------ */
  function renderAtbash(root) {
    K.text(root, {
      uid: 'atbash',
      inputLabel: '输入文本',
      outputLabel: '结果（自反变换）',
      actionLabel: '转换',
      options: [
        { id: 'keepCase', type: 'checkbox', label: '保持原有大小写', value: true }
      ],
      sample: 'Hello World',
      run: function (text, opt) {
        var out = Array.from(text).map(function (ch) {
          var code = ch.charCodeAt(0);
          if (code >= 65 && code <= 90) return String.fromCharCode(90 - (code - 65));
          if (code >= 97 && code <= 122) {
            var mapped = String.fromCharCode(122 - (code - 97));
            return opt.keepCase ? mapped : mapped.toUpperCase();
          }
          return ch;
        }).join('');
        return { output: out, note: 'A↔Z、B↔Y…… 再执行一次即可还原。' };
      }
    });
  }

  /* ------------------------------ JWT 解析 ------------------------------ */
  function renderJwt(root) {
    var uid = K.uid('jwt');
    root.innerHTML =
      '<div class="field">' +
        '<div class="label-row"><label class="label" for="' + uid + '-input">JWT Token</label></div>' +
        '<textarea id="' + uid + '-input" class="textarea mono" rows="5" spellcheck="false" ' +
        'placeholder="粘贴形如 xxxxx.yyyyy.zzzzz 的 JWT"></textarea>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="' + uid + '-run">解析</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-sample">示例</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-clear">清空</button>' +
      '</div>' +
      '<div id="' + uid + '-out"></div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      '<p class="hint">仅做 Base64URL 解码展示，<strong>不校验签名</strong>。请勿在此粘贴生产环境的敏感 Token。</p>';

    var input = root.querySelector('#' + uid + '-input');
    var out = root.querySelector('#' + uid + '-out');
    var statusEl = root.querySelector('#' + uid + '-status');

    function setStatus(type, text) {
      statusEl.className = 'status ' + type;
      statusEl.textContent = text;
      statusEl.hidden = false;
    }

    function run() {
      var token = input.value.trim();
      if (!token) { window.UI.toast('请先粘贴 JWT', 'warn'); return; }
      var parts = token.split('.');
      if (parts.length < 2) {
        out.innerHTML = '';
        setStatus('err', '格式不正确：JWT 至少应包含「header.payload」两段，以英文句点分隔。');
        return;
      }
      var header, payload;
      try {
        header = JSON.parse(base64UrlDecode(parts[0]));
      } catch (e) {
        out.innerHTML = '';
        setStatus('err', 'Header 解析失败：不是合法的 Base64URL JSON。');
        return;
      }
      try {
        payload = JSON.parse(base64UrlDecode(parts[1]));
      } catch (e) {
        out.innerHTML = '';
        setStatus('err', 'Payload 解析失败：不是合法的 Base64URL JSON。');
        return;
      }

      var rows = [
        { key: '算法 alg', value: header.alg || '（未声明）' },
        { key: '类型 typ', value: header.typ || '（未声明）' }
      ];
      if (payload.iat) rows.push({ key: '签发时间 iat', value: new Date(payload.iat * 1000).toLocaleString('zh-CN') });
      if (payload.nbf) rows.push({ key: '生效时间 nbf', value: new Date(payload.nbf * 1000).toLocaleString('zh-CN') });
      if (payload.exp) {
        var expDate = new Date(payload.exp * 1000);
        var expired = Date.now() > payload.exp * 1000;
        rows.push({
          key: '过期时间 exp',
          value: expDate.toLocaleString('zh-CN') + (expired ? '（已过期）' : '（仍然有效）')
        });
      }
      if (payload.iss) rows.push({ key: '签发者 iss', value: String(payload.iss) });
      if (payload.sub) rows.push({ key: '主体 sub', value: String(payload.sub) });

      out.innerHTML =
        '<h2 class="sub-title">Header</h2>' +
        '<pre class="code-block">' + K.esc(JSON.stringify(header, null, 2)) + '</pre>' +
        '<h2 class="sub-title">Payload</h2>' +
        '<pre class="code-block">' + K.esc(JSON.stringify(payload, null, 2)) + '</pre>' +
        K.kv(rows);
      K.bindCopy(out);
      setStatus('ok', '解析完成。签名段长度 ' + (parts[2] ? parts[2].length : 0) + ' 字符（未校验）。');
    }

    root.querySelector('#' + uid + '-run').addEventListener('click', run);
    root.querySelector('#' + uid + '-sample').addEventListener('click', function () {
      var header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      var payload = base64UrlEncode(JSON.stringify({
        sub: '1234567890', name: '张三', iat: 1700000000, exp: 1900000000
      }));
      input.value = header + '.' + payload + '.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      run();
    });
    root.querySelector('#' + uid + '-clear').addEventListener('click', function () {
      input.value = '';
      out.innerHTML = '';
      statusEl.hidden = true;
      window.UI.toast('已清空', 'success');
    });
  }

  /* ------------------------------ Punycode ------------------------------ */
  var PUNY_BASE = 36;
  var PUNY_TMIN = 1;
  var PUNY_TMAX = 26;
  var PUNY_SKEW = 38;
  var PUNY_DAMP = 700;
  var PUNY_INITIAL_BIAS = 72;
  var PUNY_INITIAL_N = 128;

  function punyAdapt(delta, numPoints, firstTime) {
    var k = 0;
    delta = firstTime ? Math.floor(delta / PUNY_DAMP) : delta >> 1;
    delta += Math.floor(delta / numPoints);
    for (; delta > ((PUNY_BASE - PUNY_TMIN) * PUNY_TMAX) >> 1; k += PUNY_BASE) {
      delta = Math.floor(delta / (PUNY_BASE - PUNY_TMIN));
    }
    return Math.floor(k + (PUNY_BASE - PUNY_TMIN + 1) * delta / (delta + PUNY_SKEW));
  }

  function punyDigitToChar(digit) {
    return String.fromCharCode(digit + 22 + 75 * (digit < 26 ? 1 : 0));
  }

  function punyCharToDigit(code) {
    if (code >= 48 && code <= 57) return code - 22;
    if (code >= 65 && code <= 90) code += 32;
    if (code >= 97 && code <= 122) return code - 97;
    return PUNY_BASE;
  }

  function punycodeEncode(input) {
    var codePoints = Array.from(input).map(function (ch) { return ch.codePointAt(0); });
    var output = [];
    var n = PUNY_INITIAL_N;
    var delta = 0;
    var bias = PUNY_INITIAL_BIAS;
    var basic = codePoints.filter(function (c) { return c < 0x80; });
    var handled = basic.length;

    basic.forEach(function (c) { output.push(String.fromCharCode(c)); });
    if (basic.length) output.push('-');

    var h = basic.length;
    while (h < codePoints.length) {
      var m = Infinity;
      codePoints.forEach(function (c) { if (c >= n && c < m) m = c; });
      delta += (m - n) * (h + 1);
      n = m;
      codePoints.forEach(function (c) {
        if (c < n) delta += 1;
        if (c === n) {
          var q = delta;
          for (var k = PUNY_BASE; ; k += PUNY_BASE) {
            var t = k <= bias ? PUNY_TMIN : (k >= bias + PUNY_TMAX ? PUNY_TMAX : k - bias);
            if (q < t) break;
            output.push(punyDigitToChar(t + (q - t) % (PUNY_BASE - t)));
            q = Math.floor((q - t) / (PUNY_BASE - t));
          }
          output.push(punyDigitToChar(q));
          bias = punyAdapt(delta, h + 1, h === handled);
          delta = 0;
          h += 1;
        }
      });
      delta += 1;
      n += 1;
    }
    return output.join('');
  }

  function punycodeDecode(input) {
    var output = [];
    var basic = input.lastIndexOf('-');
    var index = 0;
    if (basic > 0) {
      for (var j = 0; j < basic; j += 1) {
        var code = input.charCodeAt(j);
        if (code >= 0x80) throw new Error('基本段包含非 ASCII 字符');
        output.push(code);
      }
      index = basic + 1;
    }
    var n = PUNY_INITIAL_N;
    var i = 0;
    var bias = PUNY_INITIAL_BIAS;
    while (index < input.length) {
      var oldi = i;
      var w = 1;
      for (var k = PUNY_BASE; ; k += PUNY_BASE) {
        if (index >= input.length) throw new Error('编码串在数字中途结束');
        var digit = punyCharToDigit(input.charCodeAt(index));
        index += 1;
        if (digit >= PUNY_BASE) throw new Error('包含非法字符');
        i += digit * w;
        var t = k <= bias ? PUNY_TMIN : (k >= bias + PUNY_TMAX ? PUNY_TMAX : k - bias);
        if (digit < t) break;
        w *= (PUNY_BASE - t);
      }
      var length = output.length + 1;
      bias = punyAdapt(i - oldi, length, oldi === 0);
      n += Math.floor(i / length);
      i %= length;
      output.splice(i, 0, n);
      i += 1;
    }
    return String.fromCodePoint.apply(null, output);
  }

  function domainToAscii(domain) {
    return domain.split('.').map(function (label) {
      if (!label) return label;
      if (/^[\x00-\x7f]+$/.test(label)) return label;
      return 'xn--' + punycodeEncode(label);
    }).join('.');
  }

  function domainToUnicode(domain) {
    return domain.split('.').map(function (label) {
      if (/^xn--/i.test(label)) {
        try { return punycodeDecode(label.slice(4)); } catch (e) { return label; }
      }
      return label;
    }).join('.');
  }

  function renderPunycode(root) {
    K.text(root, {
      uid: 'puny',
      inputLabel: '输入域名',
      outputLabel: '结果',
      actionLabel: '转换',
      options: [
        {
          id: 'mode', type: 'select', label: '方向', value: 'toAscii',
          options: [
            { value: 'toAscii', label: '中文域名 → Punycode（xn--）' },
            { value: 'toUnicode', label: 'Punycode → 中文域名' }
          ]
        }
      ],
      sample: '中文.中国',
      run: function (text, opt) {
        var domain = text.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/:\d+$/, '');
        if (!domain) return { error: '请输入域名。' };
        var out = opt.mode === 'toAscii' ? domainToAscii(domain) : domainToUnicode(domain);
        return { output: out, note: '转换完成。' + (opt.mode === 'toAscii' ? '可直接用于 DNS 与证书配置。' : '') };
      }
    });
  }

  /* ------------------------------ URL 参数构建 ------------------------------ */
  function renderUrlBuilder(root) {
    K.form(root, {
      uid: 'urlbuild',
      actionLabel: '生成 URL',
      fields: [
        { id: 'base', label: '基础地址', type: 'text', value: 'https://example.com/search', wide: true, placeholder: 'https://example.com/path' },
        { id: 'params', label: '参数（每行 key=value）', type: 'textarea', rows: 6, wide: true, placeholder: 'q=集成工具\npage=2\nsort=desc' },
        { id: 'encode', label: '对参数值做 URL 编码', type: 'checkbox', value: true },
        { id: 'dedupe', label: '同名参数保留最后一个', type: 'checkbox', value: true }
      ],
      sample: { base: 'https://example.com/search', params: 'q=集成工具\npage=2\ntag=前端\ntag=工具' },
      run: function (values) {
        var base = String(values.base || '').trim();
        if (!base) return { error: '请填写基础地址。' };
        var params = [];
        String(values.params || '').replace(/\r\n?/g, '\n').split('\n').forEach(function (row) {
          if (!row.trim()) return;
          var index = row.indexOf('=');
          var key = index === -1 ? row.trim() : row.slice(0, index).trim();
          var value = index === -1 ? '' : row.slice(index + 1);
          if (!key) return;
          var exist = params.filter(function (p) { return p[0] === key; })[0];
          if (exist && values.dedupe) exist[1] = value;
          else params.push([key, value]);
        });

        var target;
        try {
          target = new URL(base);
        } catch (e) {
          return { error: '基础地址不是合法的 URL，请包含协议（如 https://）。' };
        }

        var finalUrl;
        if (values.encode) {
          params.forEach(function (pair) { target.searchParams.append(pair[0], pair[1]); });
          finalUrl = target.toString();
        } else {
          // 不做编码时手动拼接，保留用户输入的原始字符
          var raw = params.map(function (pair) { return pair[0] + '=' + pair[1]; }).join('&');
          finalUrl = target.origin + target.pathname + (raw ? '?' + raw : '') + (target.hash || '');
        }

        return {
          html: '<div class="preview-box mono" style="word-break:break-all;white-space:pre-wrap">' + K.esc(finalUrl) + '</div>',
          rows: [
            { key: '完整 URL', value: finalUrl },
            { key: '参数个数', value: params.length },
            { key: '长度', value: finalUrl.length + ' 字符' }
          ],
          note: '生成完成，可直接复制。'
        };
      }
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['html-entities'] = renderHtmlEntities;
  window.ToolModules['hex-text'] = renderHex;
  window.ToolModules['binary-text'] = renderBinary;
  window.ToolModules['ascii-table'] = renderAscii;
  window.ToolModules['morse-code'] = renderMorse;
  window.ToolModules['caesar-cipher'] = renderCaesar;
  window.ToolModules['rot-cipher'] = renderRot;
  window.ToolModules['base32'] = renderBase32;
  window.ToolModules['base58'] = renderBase58;
  window.ToolModules['jwt-decode'] = renderJwt;
  window.ToolModules['utf8-bytes'] = renderUtf8;
  window.ToolModules['vigenere'] = renderVigenere;
  window.ToolModules['atbash'] = renderAtbash;
  window.ToolModules['base64url'] = renderBase64Url;
  window.ToolModules['punycode'] = renderPunycode;
  window.ToolModules['url-builder'] = renderUrlBuilder;
})();
