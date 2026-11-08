/* =============================================================================
 * 编码解码工具包 · 第五批（12 个）
 * -----------------------------------------------------------------------------
 * base45          Base45 编解码（RFC 9285）
 * gray-code       二进制与格雷码互转
 * bcd-code        BCD 编码 / 解码
 * columnar-cipher 列置换密码
 * zalgo-text      Zalgo 抖动文字
 * leetspeak       1337 火星文转换
 * barcode-code39  Code 39 条形码（SVG）
 * crc16           CRC16 校验（4 种变体）
 * netstring       Netstring 编码
 * pem-format      PEM 证书分块
 * dna-encode      DNA 碱基编码
 * keyboard-offset 键盘错位还原
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  var encoder = new TextEncoder();

  function toBytes(text) {
    return encoder.encode(text);
  }

  function bytesToText(bytes) {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (error) {
      return '（不是合法 UTF-8，以下为十六进制）\n' + hexOf(bytes);
    }
  }

  function hexOf(bytes) {
    return Array.prototype.map.call(bytes, function (byte) {
      return ('0' + byte.toString(16)).slice(-2);
    }).join(' ');
  }

  /* ------------------------------ 1. Base45 ------------------------------ */
  var B45 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

  function base45Encode(bytes) {
    var out = '';
    for (var i = 0; i < bytes.length; i += 2) {
      if (i + 1 < bytes.length) {
        var pair = bytes[i] * 256 + bytes[i + 1];
        out += B45.charAt(pair % 45);
        pair = Math.floor(pair / 45);
        out += B45.charAt(pair % 45);
        out += B45.charAt(Math.floor(pair / 45));
      } else {
        var single = bytes[i];
        out += B45.charAt(single % 45);
        out += B45.charAt(Math.floor(single / 45));
      }
    }
    return out;
  }

  function base45Decode(text) {
    var source = text.replace(/\s+/g, '');
    var out = [];
    var i = 0;
    while (i < source.length) {
      var rest = source.length - i;
      if (rest === 1) throw new Error('Base45 字符数不合法（末尾只剩 1 个字符）');
      var c0 = B45.indexOf(source.charAt(i));
      var c1 = B45.indexOf(source.charAt(i + 1));
      if (c0 < 0) throw new Error('非法 Base45 字符：' + source.charAt(i));
      if (c1 < 0) throw new Error('非法 Base45 字符：' + source.charAt(i + 1));
      if (rest >= 3) {
        var c2 = B45.indexOf(source.charAt(i + 2));
        if (c2 < 0) throw new Error('非法 Base45 字符：' + source.charAt(i + 2));
        var triple = c0 + c1 * 45 + c2 * 2025;
        if (triple > 0xFFFF) throw new Error('Base45 数据块超出 2 字节范围');
        out.push((triple >> 8) & 0xFF, triple & 0xFF);
        i += 3;
      } else {
        var duo = c0 + c1 * 45;
        if (duo > 0xFF) throw new Error('Base45 数据块超出 1 字节范围');
        out.push(duo);
        i += 2;
      }
    }
    return new Uint8Array(out);
  }

  function renderBase45(root) {
    K.text(root, {
      uid: 'base45',
      inputLabel: '输入内容',
      inputRows: 6,
      outputRows: 6,
      actionLabel: '转换',
      options: [
        { id: 'mode', label: '方向', type: 'select', value: 'encode', options: [
          { value: 'encode', label: '文本 → Base45' },
          { value: 'decode', label: 'Base45 → 文本' }
        ] }
      ],
      hint: 'Base45 用 45 个字符表示数据，编码后体积约增加 50%，但可以直接写进二维码字母数字模式，比 Base64 更省空间（EU 数字新冠证书即采用此格式）。',
      sample: 'Hello, Base45!',
      run: function (text, opt) {
        if (opt.mode === 'decode') {
          var bytes = base45Decode(text);
          return { output: bytesToText(bytes), note: '解码得到 ' + bytes.length + ' 字节' };
        }
        var data = toBytes(text);
        var result = base45Encode(data);
        return { output: result, note: data.length + ' 字节 → ' + result.length + ' 字符' };
      }
    });
  }

  /* ------------------------------ 2. 格雷码 ------------------------------ */
  function binToGray(value) {
    return (value ^ (value >>> 1)) >>> 0;
  }

  function grayToBin(gray) {
    var value = gray;
    var shift = gray;
    while (shift > 0) {
      shift = shift >>> 1;
      value = value ^ shift;
    }
    return value >>> 0;
  }

  function renderGrayCode(root) {
    K.text(root, {
      uid: 'graycode',
      inputLabel: '每行一个值（二进制写 0/1，十进制模式写整数）',
      inputRows: 8,
      actionLabel: '转换',
      options: [
        { id: 'mode', label: '模式', type: 'select', value: 'bg', options: [
          { value: 'bg', label: '二进制 → 格雷码' },
          { value: 'gb', label: '格雷码 → 二进制' },
          { value: 'int', label: '整数 → 二进制 + 格雷码' }
        ] },
        { id: 'pad', label: '位宽（0 = 自动）', type: 'number', value: 0, min: 0, max: 32 }
      ],
      hint: '格雷码相邻两个码只有 1 位不同，常用于旋转编码器与跨时钟域信号，能把机械抖动的误码降到 1 位。',
      sample: '0000\n0001\n0010\n0011\n0111\n1111',
      run: function (text, opt) {
        var width = parseInt(opt.pad, 10) || 0;
        var lines = text.split(/\r?\n/).filter(function (line) { return line.trim() !== ''; });
        if (!lines.length) return { error: '请至少输入一行' };
        var out = [];
        lines.forEach(function (line) {
          var raw = line.trim().replace(/\s+/g, '');
          if (opt.mode === 'int') {
            if (!/^\d+$/.test(raw)) throw new Error('“' + line + '”不是十进制整数');
            var dec = parseInt(raw, 10);
            var bits = width ? width : Math.max(1, dec.toString(2).length);
            out.push(dec + ' → ' + pad(dec.toString(2), bits) + ' → 格雷码 ' + pad(binToGray(dec).toString(2), bits));
            return;
          }
          if (!/^[01]+$/.test(raw)) throw new Error('“' + line + '”不是二进制串');
          var len = width || raw.length;
          var value = parseInt(raw, 2);
          if (opt.mode === 'bg') {
            out.push(pad(binToGray(value).toString(2), len));
          } else {
            out.push(pad(grayToBin(value).toString(2), len));
          }
        });
        return { output: out.join('\n'), note: '共处理 ' + lines.length + ' 行' };
      }
    });
  }

  function pad(bits, width) {
    var out = String(bits);
    while (out.length < width) out = '0' + out;
    return out;
  }

  /* ------------------------------ 3. BCD 编码 ------------------------------ */
  function renderBcd(root) {
    K.text(root, {
      uid: 'bcd',
      inputLabel: '输入内容（编码：十进制数字串；解码：十六进制字节）',
      inputRows: 6,
      actionLabel: '转换',
      options: [
        { id: 'mode', label: '方向', type: 'select', value: 'encode', options: [
          { value: 'encode', label: '数字 → BCD' },
          { value: 'decode', label: 'BCD → 数字' }
        ] },
        { id: 'packed', label: '压缩 BCD（一个字节两位数字）', type: 'checkbox', value: true }
      ],
      hint: '压缩 BCD 一个字节放两位十进制数（0x12 = 数字 12）；非压缩 BCD 一个字节只放一位（0x01 0x02）。RTC 时钟芯片、老式数码管多用这种格式。',
      sample: '20260118',
      run: function (text, opt) {
        var src = text.replace(/[\s,]+/g, '');
        if (opt.mode === 'decode') {
          if (!/^[0-9a-fA-F]+$/.test(src)) return { error: '请输入十六进制字节，如 20 26 01 18' };
          if (src.length % 2) return { error: '十六进制字符数必须是偶数' };
          var digits = [];
          for (var i = 0; i < src.length; i += 2) {
            var byte = parseInt(src.substr(i, 2), 16);
            var high = byte >> 4;
            var low = byte & 0x0F;
            if (opt.packed) {
              if (high > 9 || low > 9) throw new Error('字节 0x' + src.substr(i, 2) + ' 不是合法压缩 BCD');
              digits.push(String(high), String(low));
            } else {
              if (byte > 9) throw new Error('字节 0x' + src.substr(i, 2) + ' 不是合法非压缩 BCD');
              digits.push(String(byte));
            }
          }
          return { output: digits.join(''), note: '解出 ' + digits.length + ' 位数字' };
        }
        if (!/^\d+$/.test(src)) return { error: '请输入纯数字' };
        var out = [];
        if (opt.packed) {
          var body = src.length % 2 ? src + '0' : src;
          for (var j = 0; j < body.length; j += 2) {
            var value = parseInt(body.charAt(j), 10) * 16 + parseInt(body.charAt(j + 1), 10);
            out.push(('0' + value.toString(16).toUpperCase()).slice(-2));
          }
          return {
            output: out.join(' '),
            note: src.length % 2 ? '位数是奇数，末尾已补 0 凑整' : '共 ' + out.length + ' 字节'
          };
        }
        for (var k = 0; k < src.length; k += 1) {
          out.push('0' + src.charAt(k));
        }
        return { output: out.join(' '), note: '共 ' + out.length + ' 字节（非压缩，每字节 1 位）' };
      }
    });
  }

  /* ------------------------------ 4. 列置换密码 ------------------------------ */
  function columnOrder(key) {
    var items = key.split('').map(function (ch, index) {
      return { ch: ch.toLowerCase(), index: index };
    });
    items.sort(function (a, b) {
      if (a.ch !== b.ch) return a.ch < b.ch ? -1 : 1;
      return a.index - b.index;
    });
    return items.map(function (item) { return item.index; });
  }

  function columnarEncrypt(text, key, padChar) {
    var width = key.length;
    var body = text.replace(/\s+/g, '');
    var rows = Math.ceil(body.length / width) || 1;
    while (body.length < rows * width) body += padChar;
    var order = columnOrder(key);
    var out = '';
    order.forEach(function (col) {
      for (var r = 0; r < rows; r += 1) out += body.charAt(r * width + col);
    });
    return { text: out, pad: rows * width - text.replace(/\s+/g, '').length };
  }

  function columnarDecrypt(cipher, key) {
    var width = key.length;
    var body = cipher.replace(/\s+/g, '');
    if (body.length % width) throw new Error('密文长度（' + body.length + '）不是密钥长度（' + width + '）的整数倍');
    var rows = body.length / width;
    var order = columnOrder(key);
    var columns = [];
    var pos = 0;
    order.forEach(function (col) {
      columns[col] = body.substr(pos, rows);
      pos += rows;
    });
    var out = '';
    for (var r = 0; r < rows; r += 1) {
      for (var c = 0; c < width; c += 1) out += columns[c].charAt(r);
    }
    return out;
  }

  function renderColumnar(root) {
    K.form(root, {
      uid: 'columnar',
      fields: [
        { id: 'text', label: '原文 / 密文', type: 'textarea', rows: 5, wide: true, placeholder: '只保留字母与数字，空格会被忽略' },
        { id: 'key', label: '密钥单词', type: 'text', value: 'LEMON', placeholder: '如 LEMON' },
        { id: 'mode', label: '方向', type: 'select', value: 'encrypt', options: [
          { value: 'encrypt', label: '加密' },
          { value: 'decrypt', label: '解密' }
        ] },
        { id: 'pad', label: '填充字符', type: 'text', value: 'X' }
      ],
      actionLabel: '执行',
      hint: '列置换把明文按密钥宽度写成矩阵，再按密钥字母的字典序逐列读出；密钥越长、字母越乱，破解难度越高，但单靠它仍不足以保护重要数据。',
      sample: { text: 'attackatdawn', key: 'LEMON', mode: 'encrypt', pad: 'X' },
      run: function (values) {
        var key = String(values.key || '').replace(/[^A-Za-z]/g, '');
        if (key.length < 2) return { error: '密钥至少需要 2 个字母' };
        if (!String(values.text || '').trim()) return { error: '请填写原文或密文' };
        var padChar = String(values.pad || 'X').charAt(0) || 'X';
        if (values.mode === 'decrypt') {
          var plain = columnarDecrypt(values.text, key);
          return {
            rows: [
              { key: '解密结果', value: plain },
              { key: '提示', value: '末尾的填充字符可能是 ' + padChar + '，请按需删除', mono: false }
            ]
          };
        }
        var result = columnarEncrypt(values.text, key, padChar);
        var grouped = result.text.replace(/(.{5})/g, '$1 ').trim();
        return {
          rows: [
            { key: '密文', value: grouped },
            { key: '密文（连续）', value: result.text },
            { key: '列顺序', value: columnOrder(key).map(function (i) { return key.charAt(i) + '→' + (i + 1); }).join('  '), mono: false },
            { key: '填充', value: result.pad ? result.pad + ' 个 ' + padChar : '无需填充', mono: false }
          ]
        };
      }
    });
  }

  /* ------------------------------ 5. Zalgo 文字 ------------------------------ */
  var ZALGO_UP = '\u0300\u0301\u0302\u0303\u0304\u0305\u0306\u0307\u0308\u0309\u030A\u030B\u030C\u030D\u030E\u030F\u0310\u0311\u0312\u0313\u0314\u0315\u031B';
  var ZALGO_DOWN = '\u0316\u0317\u0318\u0319\u031C\u031D\u031E\u031F\u0320\u0321\u0322\u0323\u0324\u0325\u0326\u0327\u0328\u0329\u032A\u032B\u032C\u032D\u032E\u032F\u0330\u0331\u0332\u0333\u0334';
  var ZALGO_MID = '\u0335\u0336\u0337\u0338\u0339\u033A\u033B\u033C\u033D\u033E\u033F\u0340\u0341';

  function renderZalgo(root) {
    K.text(root, {
      uid: 'zalgo',
      inputLabel: '原始文字',
      inputRows: 5,
      actionLabel: '抖动',
      options: [
        { id: 'strength', label: '强度', type: 'select', value: '2', options: [
          { value: '1', label: '轻微（1-6 个组合符）' },
          { value: '2', label: '中等（4-12）' },
          { value: '3', label: '狂热（10-24）' }
        ] },
        { id: 'where', label: '方向', type: 'select', value: 'both', options: [
          { value: 'both', label: '上下都有' },
          { value: 'up', label: '只在上方' },
          { value: 'down', label: '只在下方' }
        ] }
      ],
      hint: 'Zalgo 会在每个字符后面叠加 Unicode 组合符号，产生向上、向下的“抖动”效果。只适合娱乐，复制到聊天软件里可能被折叠或显示为方块。',
      sample: 'Zalgo!',
      run: function (text, opt) {
        var base = { 1: [1, 6], 2: [4, 12], 3: [10, 24] }[opt.strength] || [4, 12];
        var out = '';
        for (var i = 0; i < text.length; i += 1) {
          var ch = text.charAt(i);
          out += ch;
          if (ch === ' ' || ch === '\n' || ch === '\t') continue;
          var total = base[0] + Math.floor(Math.random() * (base[1] - base[0] + 1));
          for (var j = 0; j < total; j += 1) {
            var pool = opt.where === 'up' ? ZALGO_UP : opt.where === 'down' ? ZALGO_DOWN : (j % 3 === 0 ? ZALGO_MID : (j % 2 ? ZALGO_DOWN : ZALGO_UP));
            out += pool.charAt(Math.floor(Math.random() * pool.length));
          }
        }
        return { output: out, note: '原始 ' + text.length + ' 字符，输出 ' + out.length + ' 个码位' };
      }
    });
  }

  /* ------------------------------ 6. 1337 火星文 ------------------------------ */
  var LEET_MAP = { a: '4', b: '8', e: '3', g: '9', i: '1', l: '1', o: '0', s: '5', t: '7', z: '2' };
  var LEET_HARD = { a: '@', b: '8', e: '3', g: '9', i: '!', l: '|', o: '0', s: '$', t: '7', z: '2' };
  var LEET_BACK = { '4': 'a', '@': 'a', '8': 'b', '3': 'e', '9': 'g', '1': 'i', '!': 'i', '|': 'l', '0': 'o', '5': 's', '$': 's', '7': 't', '2': 'z' };

  function renderLeet(root) {
    K.text(root, {
      uid: 'leet',
      inputLabel: '输入内容',
      inputRows: 5,
      actionLabel: '转换',
      options: [
        { id: 'mode', label: '方向', type: 'select', value: 'encode', options: [
          { value: 'encode', label: '普通文字 → 1337' },
          { value: 'decode', label: '1337 → 普通文字' }
        ] },
        { id: 'hard', label: '使用符号版（@ $ ! |）', type: 'checkbox', value: false }
      ],
      hint: '1337（leet）起源于早期 BBS 与游戏，用数字和符号替代字母。解码时 1 会还原成 i、| 还原成 l，属于有损转换。',
      sample: 'elite hacker',
      run: function (text, opt) {
        if (opt.mode === 'decode') {
          var plain = text.replace(/[@483 91!|05$72]/g, function (ch) {
            return LEET_BACK[ch] || ch;
          });
          return { output: plain, note: '有损还原：1 → i、| → l、4 与 @ → a' };
        }
        var map = opt.hard ? LEET_HARD : LEET_MAP;
        var count = 0;
        var out = text.replace(/[a-zA-Z]/g, function (ch) {
          var mapped = map[ch.toLowerCase()];
          if (!mapped) return ch;
          count += 1;
          return mapped;
        });
        return { output: out, note: '共替换 ' + count + ' 个字母' };
      }
    });
  }

  /* ------------------------------ 7. Code 39 条形码 ------------------------------ */
  var CODE39 = {
    '0': '101001101101', '1': '110100101011', '2': '101100101011', '3': '110110010101',
    '4': '101001101011', '5': '110100110101', '6': '101100110101', '7': '101001011011',
    '8': '110100101101', '9': '101100101101',
    A: '110101001011', B: '101101001011', C: '110110100101', D: '101011001011',
    E: '110101100101', F: '101101100101', G: '101010011011', H: '110101001101',
    I: '101101001101', J: '101011001101', K: '110101010011', L: '101101010011',
    M: '110110101001', N: '101011010011', O: '110101101001', P: '101101101001',
    Q: '101010110011', R: '110101011001', S: '101101011001', T: '101011011001',
    U: '110010101011', V: '100110101011', W: '110011010101', X: '100101101011',
    Y: '110010110101', Z: '100110110101',
    '-': '100101011011', '.': '110010101101', ' ': '100110101101',
    '$': '100100100101', '/': '100100101001', '+': '100101001001', '%': '101001001001',
    '*': '100101101101'
  };
  var MOD43 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%';

  function runLengths(bits) {
    var out = [];
    var current = bits.charAt(0);
    var count = 0;
    for (var i = 0; i < bits.length; i += 1) {
      if (bits.charAt(i) === current) {
        count += 1;
      } else {
        out.push(count);
        current = bits.charAt(i);
        count = 1;
      }
    }
    out.push(count);
    return out;
  }

  function code39Svg(payload, unit, height) {
    var quiet = unit * 10;
    var x = quiet;
    var rects = [];
    var text = '*' + payload + '*';
    var total = 0;
    for (var i = 0; i < text.length; i += 1) {
      var pattern = CODE39[text.charAt(i)];
      if (!pattern) continue;
      var widths = runLengths(pattern);
      for (var w = 0; w < widths.length; w += 1) {
        var width = widths[w] === 2 ? unit * 3 : unit;
        if (w % 2 === 0) {
          rects.push('<rect x="' + x + '" y="0" width="' + width + '" height="' + height + '" fill="#000"/>');
        }
        x += width;
      }
      total += 1;
      if (i < text.length - 1) x += unit; // 字符间距
    }
    var width = x + quiet;
    return {
      svg: '<svg class="barcode-svg" viewBox="0 0 ' + width + ' ' + (height + 26) + '" width="100%" ' +
        'style="max-width:' + Math.min(width, 720) + 'px" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Code 39 条形码 ' + K.esc(payload) + '">' +
        '<rect width="100%" height="100%" fill="#fff"/>' + rects.join('') +
        '<text x="' + (width / 2) + '" y="' + (height + 20) + '" text-anchor="middle" font-family="monospace" font-size="14" fill="#000">' +
        K.esc(text) + '</text></svg>',
      chars: total
    };
  }

  function renderBarcode39(root) {
    K.text(root, {
      uid: 'code39',
      inputLabel: '要编码的内容（数字、大写字母与 - . 空格 $ / + %）',
      inputRows: 3,
      actionLabel: '生成',
      hideOutput: true,
      options: [
        { id: 'check', label: '添加 MOD-43 校验位', type: 'checkbox', value: false },
        { id: 'height', label: '条码高度（px）', type: 'number', value: 80, min: 30, max: 200 },
        { id: 'unit', label: '窄条宽度（px）', type: 'number', value: 2, min: 1, max: 6 }
      ],
      hint: 'Code 39 是最容易手工实现的条形码，只支持 43 个字符，不需要校验位也能被多数扫码枪识别；星号 * 是起止符，会自动补上。',
      sample: 'TOOLS-508',
      run: function (text, opt) {
        var payload = text.trim().replace(/\*/g, '').toUpperCase();
        if (!payload) return { error: '请输入内容' };
        var invalid = [];
        for (var i = 0; i < payload.length; i += 1) {
          if (!CODE39[payload.charAt(i)]) invalid.push(payload.charAt(i));
        }
        if (invalid.length) {
          return { error: 'Code 39 不支持这些字符：' + invalid.join(' ') + '（只支持 0-9 A-Z - . 空格 $ / + %）' };
        }
        var checkNote = '';
        if (opt.check) {
          var sum = 0;
          for (var j = 0; j < payload.length; j += 1) sum += MOD43.indexOf(payload.charAt(j));
          var digit = MOD43.charAt(sum % 43);
          payload += digit;
          checkNote = '校验位：' + digit;
        }
        var unit = Math.max(1, Math.min(6, parseInt(opt.unit, 10) || 2));
        var height = Math.max(30, Math.min(200, parseInt(opt.height, 10) || 80));
        var result = code39Svg(payload, unit, height);
        return {
          output: '*' + payload + '*',
          html: '<div class="barcode-box">' + result.svg + '</div>',
          note: '共 ' + result.chars + ' 个字符（含起止符），' + checkNote
        };
      }
    });
  }

  /* ------------------------------ 8. CRC16 ------------------------------ */
  var CRC16_VARIANTS = {
    'ccitt-false': { label: 'CRC-16/CCITT-FALSE', poly: 0x1021, init: 0xFFFF, refin: false, xorout: 0x0000 },
    modbus: { label: 'CRC-16/MODBUS', poly: 0xA001, init: 0xFFFF, refin: true, xorout: 0x0000 },
    xmodem: { label: 'CRC-16/XMODEM', poly: 0x1021, init: 0x0000, refin: false, xorout: 0x0000 },
    arc: { label: 'CRC-16/ARC (IBM)', poly: 0xA001, init: 0x0000, refin: true, xorout: 0x0000 },
    kermit: { label: 'CRC-16/KERMIT', poly: 0x8408, init: 0x0000, refin: true, xorout: 0x0000 }
  };

  function crc16(bytes, spec) {
    var crc = spec.init;
    for (var i = 0; i < bytes.length; i += 1) {
      crc ^= spec.refin ? bytes[i] : bytes[i] << 8;
      for (var bit = 0; bit < 8; bit += 1) {
        if (spec.refin) {
          crc = (crc & 1) ? (crc >>> 1) ^ spec.poly : crc >>> 1;
        } else {
          crc = (crc & 0x8000) ? ((crc << 1) ^ spec.poly) & 0xFFFF : (crc << 1) & 0xFFFF;
        }
      }
    }
    return (crc ^ spec.xorout) & 0xFFFF;
  }

  function renderCrc16(root) {
    K.text(root, {
      uid: 'crc16',
      inputLabel: '输入内容',
      inputRows: 6,
      actionLabel: '计算',
      hideOutput: true,
      options: [
        { id: 'variant', label: '变体', type: 'select', value: 'modbus', options: Object.keys(CRC16_VARIANTS).map(function (key) {
          return { value: key, label: CRC16_VARIANTS[key].label };
        }) },
        { id: 'hex', label: '输入是十六进制字节', type: 'checkbox', value: false }
      ],
      hint: 'CRC16 常见于 Modbus、XMODEM 与各种无线帧。同一串数据在不同变体下结果完全不同，对接设备时务必选对变体。',
      sample: 'Hello',
      run: function (text, opt) {
        var bytes;
        if (opt.hex) {
          var clean = text.replace(/[^0-9a-fA-F]/g, '');
          if (clean.length % 2) return { error: '十六进制字符数必须是偶数' };
          bytes = new Uint8Array(clean.length / 2);
          for (var i = 0; i < bytes.length; i += 1) bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
        } else {
          bytes = toBytes(text);
        }
        var rows = Object.keys(CRC16_VARIANTS).map(function (key) {
          var spec = CRC16_VARIANTS[key];
          var value = crc16(bytes, spec);
          var hex = ('000' + value.toString(16).toUpperCase()).slice(-4);
          return {
            key: spec.label,
            value: hex + '  (' + ((value & 0xFF) + ', ' + ((value >> 8) & 0xFF)) + ' 低字节在前)'
          };
        });
        return { html: K.kv(rows), output: '', note: '按 ' + bytes.length + ' 字节计算' };
      }
    });
  }

  /* ------------------------------ 9. Netstring ------------------------------ */
  function renderNetstring(root) {
    K.text(root, {
      uid: 'netstring',
      inputLabel: '输入内容',
      inputRows: 6,
      actionLabel: '转换',
      options: [
        { id: 'mode', label: '方向', type: 'select', value: 'encode', options: [
          { value: 'encode', label: '文本 → Netstring' },
          { value: 'decode', label: 'Netstring → 文本' }
        ] }
      ],
      hint: 'Netstring 格式是「长度:数据,」，常用于 DNS、Twisted 与简单的流式协议：接收方先读到冒号，就知道接下来要读多少字节，无需转义。',
      sample: 'hello world',
      run: function (text, opt) {
        if (opt.mode === 'decode') {
          var rest = text.trim();
          var items = [];
          while (rest.length) {
            var colon = rest.indexOf(':');
            if (colon < 0) throw new Error('缺少冒号分隔符');
            var lengthText = rest.slice(0, colon);
            if (!/^\d+$/.test(lengthText)) throw new Error('长度字段不是数字：' + lengthText);
            var length = parseInt(lengthText, 10);
            var start = colon + 1;
            if (rest.charAt(start + length) !== ',') throw new Error('第 ' + (items.length + 1) + ' 项结尾缺少逗号');
            items.push(rest.substr(start, length));
            rest = rest.slice(start + length + 1);
          }
          return { output: items.join('\n'), note: '解出 ' + items.length + ' 个字段' };
        }
        var bytes = toBytes(text);
        return { output: bytes.length + ':' + text + ',', note: '长度为 UTF-8 字节数（' + bytes.length + '）' };
      }
    });
  }

  /* ------------------------------ 10. PEM 分块 ------------------------------ */
  var PEM_TYPES = ['CERTIFICATE', 'PUBLIC KEY', 'PRIVATE KEY', 'RSA PRIVATE KEY', 'CERTIFICATE REQUEST'];

  function renderPem(root) {
    K.text(root, {
      uid: 'pem',
      inputLabel: 'Base64 内容（编码）或 PEM 文本（解码）',
      inputRows: 8,
      actionLabel: '转换',
      options: [
        { id: 'mode', label: '方向', type: 'select', value: 'wrap', options: [
          { value: 'wrap', label: 'Base64 → PEM' },
          { value: 'unwrap', label: 'PEM → Base64' }
        ] },
        { id: 'type', label: '类型', type: 'select', value: 'CERTIFICATE', options: PEM_TYPES.map(function (t) {
          return { value: t, label: t };
        }) },
        { id: 'wrap', label: '每行字符数', type: 'number', value: 64, min: 16, max: 76 }
      ],
      hint: 'PEM 就是 Base64 加上 -----BEGIN / -----END 包头，并每 64 个字符换行。手写证书、密钥或 CSR 时用它补齐格式。',
      sample: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1LfVLPHCozMxH2Mo4lgOEePzNm0tRgeLezV6ffAt0gunVTLw7onLRnrq0/IzW7yWR7QkrmBL7jTKEn5u+qKhbwKfBstIs+bMY2Zkp18gnTxKLxoS2tFczGkPLPgizskuemMghRniWaoLcyehkd3qqGElvW/VDL5AaWTg0nLVkjRo9z+40RQzuVaE8AkAFmxZzow3x+VJYKdjykkJ0iT9wCS0DRTXu269V264Vf/3jvredZiKRkgwlL9xNAwxXFg0x/XFw005UWVRIkdgcKWTjpBP2dPwVZ4WWC+9aGVd+Gyn1o0CLelf4rEjGoXbAAEgAqeGUxrcIlbjXfbcmwIDAQAB',
      run: function (text, opt) {
        var body = text.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
        if (!body) return { error: '请填入 Base64 内容或 PEM 文本' };
        if (!/^[A-Za-z0-9+/=]+$/.test(body)) return { error: '包含非 Base64 字符，请检查是否混入了中文或标点' };
        if (opt.mode === 'unwrap') {
          return {
            output: body,
            note: '已去掉包头与换行，共 ' + body.length + ' 个 Base64 字符'
          };
        }
        var per = Math.max(16, Math.min(76, parseInt(opt.wrap, 10) || 64));
        var type = opt.type || 'CERTIFICATE';
        var lines = [];
        for (var i = 0; i < body.length; i += per) lines.push(body.substr(i, per));
        return {
          output: '-----BEGIN ' + type + '-----\n' + lines.join('\n') + '\n-----END ' + type + '-----',
          note: '共 ' + lines.length + ' 行，每行 ' + per + ' 字符'
        };
      }
    });
  }

  /* ------------------------------ 11. DNA 编码 ------------------------------ */
  var DNA_MAP = ['A', 'C', 'G', 'T'];

  function dnaEncode(bytes) {
    var out = '';
    for (var i = 0; i < bytes.length; i += 1) {
      var byte = bytes[i];
      out += DNA_MAP[(byte >> 6) & 3] + DNA_MAP[(byte >> 4) & 3] + DNA_MAP[(byte >> 2) & 3] + DNA_MAP[byte & 3];
    }
    return out;
  }

  function dnaDecode(text) {
    var clean = text.toUpperCase().replace(/[^ACGT]/g, '');
    if (clean.length % 4) throw new Error('碱基数量必须是 4 的整数倍（当前 ' + clean.length + ' 个）');
    var bytes = new Uint8Array(clean.length / 4);
    for (var i = 0; i < bytes.length; i += 1) {
      var chunk = clean.substr(i * 4, 4);
      var value = 0;
      for (var j = 0; j < 4; j += 1) {
        var index = DNA_MAP.indexOf(chunk.charAt(j));
        if (index < 0) throw new Error('非法碱基：' + chunk.charAt(j));
        value = value * 4 + index;
      }
      bytes[i] = value;
    }
    return bytes;
  }

  function renderDna(root) {
    K.text(root, {
      uid: 'dna',
      inputLabel: '输入内容',
      inputRows: 6,
      actionLabel: '转换',
      options: [
        { id: 'mode', label: '方向', type: 'select', value: 'encode', options: [
          { value: 'encode', label: '文本 → 碱基序列' },
          { value: 'decode', label: '碱基序列 → 文本' }
        ] },
        { id: 'group', label: '每 4 个碱基分隔', type: 'checkbox', value: true }
      ],
      hint: '每个字节拆成 4 组 2 bit，分别映射到 A / C / G / T，1 字节正好 4 个碱基。纯属编码游戏，与真实基因序列无关。',
      sample: 'DNA',
      run: function (text, opt) {
        if (opt.mode === 'decode') {
          var bytes = dnaDecode(text);
          return { output: bytesToText(bytes), note: '解出 ' + bytes.length + ' 字节' };
        }
        var data = toBytes(text);
        var bases = dnaEncode(data);
        var output = opt.group ? bases.replace(/(.{4})/g, '$1 ').trim() : bases;
        return { output: output, note: data.length + ' 字节 → ' + bases.length + ' 个碱基' };
      }
    });
  }

  /* ------------------------------ 12. 键盘错位还原 ------------------------------ */
  var KB_ROWS = [
    ['`1234567890-=', '~!@#$%^&*()_+'],
    ['qwertyuiop[]', 'QWERTYUIOP{}'],
    ["asdfghjkl;'", 'ASDFGHJKL:"'],
    ['zxcvbnm,./', 'ZXCVBNM<>?']
  ];

  function keyboardShift(text, direction) {
    var step = direction === 'left' ? -1 : 1;
    var out = '';
    for (var i = 0; i < text.length; i += 1) {
      var ch = text.charAt(i);
      var replaced = ch;
      for (var r = 0; r < KB_ROWS.length; r += 1) {
        for (var half = 0; half < 2; half += 1) {
          var row = KB_ROWS[r][half];
          var index = row.indexOf(ch);
          if (index < 0) continue;
          var target = index + step;
          if (target >= 0 && target < row.length) replaced = row.charAt(target);
          r = KB_ROWS.length;
          break;
        }
      }
      out += replaced;
    }
    return out;
  }

  function renderKeyboardOffset(root) {
    K.text(root, {
      uid: 'kboffset',
      inputLabel: '错位的文本',
      inputRows: 6,
      actionLabel: '还原',
      options: [
        { id: 'dir', label: '方向', type: 'select', value: 'left', options: [
          { value: 'left', label: '整体左移一键（手往右偏一格）' },
          { value: 'right', label: '整体右移一键（手往左偏一格）' }
        ] }
      ],
      hint: '典型场景：想打 hello 却打成 jr;;p。选“左移一键”即可还原。中文输入法下的错位无法还原，只能处理英文与符号。',
      sample: 'jr;;p ept;f',
      run: function (text, opt) {
        var result = keyboardShift(text, opt.dir);
        return {
          output: result,
          note: result === text ? '没有可移动的字符，检查一下方向？' : '已按 QWERTY 布局向' + (opt.dir === 'left' ? '左' : '右') + '移一键'
        };
      }
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['base45'] = renderBase45;
  window.ToolModules['gray-code'] = renderGrayCode;
  window.ToolModules['bcd-code'] = renderBcd;
  window.ToolModules['columnar-cipher'] = renderColumnar;
  window.ToolModules['zalgo-text'] = renderZalgo;
  window.ToolModules['leetspeak'] = renderLeet;
  window.ToolModules['barcode-code39'] = renderBarcode39;
  window.ToolModules['crc16'] = renderCrc16;
  window.ToolModules['netstring'] = renderNetstring;
  window.ToolModules['pem-format'] = renderPem;
  window.ToolModules['dna-encode'] = renderDna;
  window.ToolModules['keyboard-offset'] = renderKeyboardOffset;
})();
