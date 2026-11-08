/* =============================================================================
 * 编码解码工具包 · 第四批（12 个）
 * -----------------------------------------------------------------------------
 * base16           十六进制编解码
 * base36           Base36 编解码
 * mime-encoded-word 邮件主题编码（RFC 2047）
 * html-entity      HTML 实体编解码
 * unicode-escape   Unicode 转义编解码
 * c-escape         C 风格字符串转义
 * uuencode         UUEncode 编解码
 * caesar-brute     凯撒密码暴力破解
 * byte-frequency   字节频率与信息熵
 * mojibake-fix     乱码修复
 * url-part-encode  URL 分段编码
 * rot47            ROT47 变形加密
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  var B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  var B36 = '0123456789abcdefghijklmnopqrstuvwxyz';

  function toBytes(text) {
    return new TextEncoder().encode(text);
  }

  function fromBytes(bytes) {
    return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
  }

  function bytesToBigInt(bytes, base) {
    var value = BigInt(0);
    var big = BigInt(base);
    for (var i = 0; i < bytes.length; i += 1) {
      value = value * big + BigInt(bytes[i]);
    }
    return value;
  }

  function bigIntToBytes(value) {
    var bytes = [];
    var zero = BigInt(0);
    var big = BigInt(256);
    while (value > zero) {
      bytes.unshift(Number(value % big));
      value = value / big;
    }
    return bytes;
  }

  function encodeBigBase(text, alphabet) {
    var bytes = toBytes(text);
    if (!bytes.length) return '';
    var value = bytesToBigInt(bytes, 256);
    var base = BigInt(alphabet.length);
    var out = '';
    var zero = BigInt(0);
    while (value > zero) {
      out = alphabet.charAt(Number(value % base)) + out;
      value = value / base;
    }
    return out;
  }

  function decodeBigBase(text, alphabet) {
    var clean = text.replace(/\s+/g, '');
    var value = BigInt(0);
    var base = BigInt(alphabet.length);
    for (var i = 0; i < clean.length; i += 1) {
      var index = alphabet.indexOf(clean.charAt(i));
      if (index < 0) throw new Error('包含非法字符：' + clean.charAt(i));
      value = value * base + BigInt(index);
    }
    return fromBytes(bigIntToBytes(value));
  }

  /* ------------------------------ 1. 十六进制 ------------------------------ */
  function renderBase16(root) {
    K.text(root, {
      uid: 'b16',
      inputLabel: '输入文本（编码）或十六进制串（解码）',
      outputLabel: '结果',
      actionLabel: '转换',
      options: [
        { id: 'mode', label: '方向', type: 'select', value: 'encode', options: [
          { value: 'encode', label: '文本 → 十六进制' },
          { value: 'decode', label: '十六进制 → 文本' }
        ] },
        { id: 'upper', label: '大写字母', type: 'checkbox', value: true },
        { id: 'space', label: '字节间加空格', type: 'checkbox', value: false },
        { id: 'prefix', label: '添加 0x 前缀', type: 'checkbox', value: false }
      ],
      sample: '集成工具大全',
      run: function (text, opt) {
        if (opt.mode === 'encode') {
          var hex = Array.prototype.map.call(toBytes(text), function (byte) {
            return ('0' + byte.toString(16)).slice(-2);
          });
          if (opt.upper) hex = hex.map(function (item) { return item.toUpperCase(); });
          if (opt.prefix) hex = hex.map(function (item) { return '0x' + item; });
          return { output: hex.join(opt.space ? ' ' : ''), note: 'UTF-8 编码后共 ' + hex.length + ' 字节' };
        }
        var clean = text.replace(/0x/gi, '').replace(/[^0-9a-fA-F]/g, '');
        if (clean.length === 0) return { error: '没有可解析的十六进制字符' };
        if (clean.length % 2) return { error: '十六进制字符数必须是偶数（当前 ' + clean.length + ' 位）' };
        var bytes = [];
        for (var i = 0; i < clean.length; i += 2) bytes.push(parseInt(clean.substr(i, 2), 16));
        return { output: fromBytes(bytes), note: '共还原 ' + bytes.length + ' 字节' };
      }
    });
  }

  /* ------------------------------ 2. Base36 ------------------------------ */
  function renderBase36(root) {
    K.text(root, {
      uid: 'b36',
      inputLabel: '输入文本（编码）或 Base36 串（解码）',
      actionLabel: '转换',
      options: [
        { id: 'mode', label: '方向', type: 'select', value: 'encode', options: [
          { value: 'encode', label: '文本 → Base36' },
          { value: 'decode', label: 'Base36 → 文本' }
        ] }
      ],
      sample: 'hello',
      run: function (text, opt) {
        try {
          if (opt.mode === 'encode') {
            var encoded = encodeBigBase(text, B36);
            return { output: encoded, note: '按 UTF-8 字节整体做大整数编码，长度 ' + encoded.length };
          }
          return { output: decodeBigBase(text, B36), note: '解码完成' };
        } catch (error) {
          return { error: error.message };
        }
      }
    });
  }

  /* ------------------------------ 3. 邮件主题编码 ------------------------------ */
  function renderMimeEncodedWord(root) {
    K.text(root, {
      uid: 'mimeword',
      inputLabel: '邮件主题（编码）或 =?UTF-8?B?...?= 串（解码）',
      inputRows: 6,
      actionLabel: '转换',
      options: [
        { id: 'mode', label: '方向', type: 'select', value: 'encode', options: [
          { value: 'encode', label: '主题 → RFC 2047 编码字' },
          { value: 'decode', label: '编码字 → 主题' }
        ] },
        { id: 'encoding', label: '编码方式', type: 'select', value: 'B', options: [
          { value: 'B', label: 'B（Base64，推荐）' },
          { value: 'Q', label: 'Q（Quoted-Printable）' }
        ] }
      ],
      hint: '邮件主题含中文时，需按 RFC 2047 拆成多个 =?UTF-8?B?...?= 编码字，单段不超过 75 字符。',
      sample: '集成工具大全 · 每周更新',
      run: function (text, opt) {
        if (opt.mode === 'decode') {
          var decoded = text.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, function (match, charset, enc, payload) {
            try {
              if (enc.toUpperCase() === 'B') {
                var binary = atob(payload);
                var bytes = new Uint8Array(binary.length);
                for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
                return new TextDecoder(charset || 'utf-8').decode(bytes);
              }
              var percent = payload.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, function (_, hex) {
                return '%' + hex;
              });
              return decodeURIComponent(percent);
            } catch (error) {
              return match;
            }
          });
          return { output: decoded, note: '已解码全部 =?...?= 编码字' };
        }

        if (opt.encoding === 'Q') {
          var bytesQ = toBytes(text);
          var outQ = '';
          for (var q = 0; q < bytesQ.length; q += 1) {
            var byte = bytesQ[q];
            if (byte === 32) outQ += '_';
            else if (byte >= 33 && byte <= 126 && byte !== 61 && byte !== 63 && byte !== 95) outQ += String.fromCharCode(byte);
            else outQ += '=' + ('0' + byte.toString(16)).slice(-2).toUpperCase();
          }
          return { output: '=?UTF-8?Q?' + outQ + '?=', note: 'Q 编码会把空格转为下划线' };
        }

        var raw = toBytes(text);
        var binaryStr = Array.prototype.map.call(raw, function (byte) { return String.fromCharCode(byte); }).join('');
        var base64 = btoa(binaryStr);
        var chunks = base64.match(/.{1,60}/g) || [base64];
        return {
          output: chunks.map(function (chunk) { return '=?UTF-8?B?' + chunk + '?='; }).join('\r\n '),
          note: '共 ' + chunks.length + ' 段，段间用「CRLF + 空格」折叠'
        };
      }
    });
  }

  /* ------------------------------ 4. HTML 实体 ------------------------------ */
  function renderHtmlEntity(root) {
    K.text(root, {
      uid: 'hment',
      inputLabel: '输入内容',
      actionLabel: '转换',
      options: [
        { id: 'mode', label: '方向', type: 'select', value: 'encode', options: [
          { value: 'encode', label: '文本 → 实体' },
          { value: 'decode', label: '实体 → 文本' }
        ] },
        { id: 'scope', label: '编码范围', type: 'select', value: 'special', options: [
          { value: 'special', label: '仅特殊字符 < > & " \'' },
          { value: 'nonascii', label: '特殊字符 + 非 ASCII' },
          { value: 'all', label: '全部字符' }
        ] }
      ],
      sample: '<div class="tip">中文 & emoji 🎉</div>',
      run: function (text, opt) {
        if (opt.mode === 'decode') {
          var area = document.createElement('textarea');
          area.innerHTML = text;
          var decoded = area.value;
          return { output: decoded, note: '已解码命名实体与数字实体' };
        }
        var out = Array.from(text).map(function (ch) {
          var code = ch.codePointAt(0);
          if (ch === '&') return '&amp;';
          if (ch === '<') return '&lt;';
          if (ch === '>') return '&gt;';
          if (ch === '"') return '&quot;';
          if (ch === "'") return '&#39;';
          if (opt.scope === 'all') return '&#' + code + ';';
          if (opt.scope === 'nonascii' && code > 127) return '&#' + code + ';';
          return ch;
        }).join('');
        return { output: out, note: '使用数字实体，兼容性最好' };
      }
    });
  }

  /* ------------------------------ 5. Unicode 转义 ------------------------------ */
  function renderUnicodeEscape(root) {
    K.text(root, {
      uid: 'unesc',
      inputLabel: '输入文本或转义序列',
      actionLabel: '转换',
      options: [
        { id: 'mode', label: '方向', type: 'select', value: 'escape', options: [
          { value: 'escape', label: '文本 → \\u 转义' },
          { value: 'unescape', label: '\\u 转义 → 文本' }
        ] },
        { id: 'style', label: '转义风格', type: 'select', value: 'u4', options: [
          { value: 'u4', label: '\\uXXXX（BMP）' },
          { value: 'ubrace', label: '\\u{XXXXX}（码点）' }
        ] },
        { id: 'asciiOnly', label: '仅转义非 ASCII', type: 'checkbox', value: true }
      ],
      sample: '你好, world 👋',
      run: function (text, opt) {
        if (opt.mode === 'escape') {
          return {
            output: Array.from(text).map(function (ch) {
              var code = ch.codePointAt(0);
              if (opt.asciiOnly && code < 128) return ch;
              if (opt.style === 'ubrace') return '\\u{' + code.toString(16).toUpperCase() + '}';
              if (code > 0xffff) {
                var high = Math.floor((code - 0x10000) / 0x400) + 0xd800;
                var low = ((code - 0x10000) % 0x400) + 0xdc00;
                return '\\u' + high.toString(16).toUpperCase() + '\\u' + low.toString(16).toUpperCase();
              }
              return '\\u' + ('0000' + code.toString(16).toUpperCase()).slice(-4);
            }).join(''),
            note: 'JS 字符串字面量可直接使用该结果'
          };
        }
        var out = text.replace(/\\u\{([0-9a-fA-F]+)\}/g, function (_, hex) {
          return String.fromCodePoint(parseInt(hex, 16));
        }).replace(/\\u([0-9a-fA-F]{4})/g, function (_, hex) {
          return String.fromCharCode(parseInt(hex, 16));
        }).replace(/\\x([0-9a-fA-F]{2})/g, function (_, hex) {
          return String.fromCharCode(parseInt(hex, 16));
        });
        return { output: out, note: '支持 \\uXXXX、\\u{XXXXX} 与 \\xXX' };
      }
    });
  }

  /* ------------------------------ 6. C 风格转义 ------------------------------ */
  function renderCEscape(root) {
    K.text(root, {
      uid: 'cesc',
      inputLabel: '输入文本或转义串',
      actionLabel: '转换',
      options: [
        { id: 'mode', label: '方向', type: 'select', value: 'escape', options: [
          { value: 'escape', label: '文本 → 转义串' },
          { value: 'unescape', label: '转义串 → 文本' }
        ] }
      ],
      sample: '第一行\n第二行\t制表 "引号" 与 \\反斜杠',
      run: function (text, opt) {
        if (opt.mode === 'escape') {
          return {
            output: text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '\\r')
              .replace(/\t/g, '\\t').replace(/"/g, '\\"'),
            note: '适用于 C / Java / JS 等语言的字符串字面量'
          };
        }
        return {
          output: text.replace(/\\(n|r|t|0|"|'|\\|x[0-9a-fA-F]{2})/g, function (match, key) {
            if (key === 'n') return '\n';
            if (key === 'r') return '\r';
            if (key === 't') return '\t';
            if (key === '0') return '\0';
            if (key === '\\') return '\\';
            if (key.charAt(0) === 'x') return String.fromCharCode(parseInt(key.slice(1), 16));
            return key;
          }),
          note: '已还原常见转义字符'
        };
      }
    });
  }

  /* ------------------------------ 7. UUEncode ------------------------------ */
  function renderUuencode(root) {
    K.text(root, {
      uid: 'uuencode',
      inputLabel: '文本（编码）或 uuencode 正文（解码）',
      inputRows: 8,
      actionLabel: '转换',
      options: [
        { id: 'mode', label: '方向', type: 'select', value: 'encode', options: [
          { value: 'encode', label: '文本 → UUEncode' },
          { value: 'decode', label: 'UUEncode → 文本' }
        ] },
        { id: 'withBegin', label: '包含 begin / end 行', type: 'checkbox', value: true }
      ],
      hint: 'UUEncode 是老式邮件附件编码：每 3 字节转 4 个可打印字符，行首字符表示本行字节数。',
      sample: 'Hello, UUEncode!',
      run: function (text, opt) {
        if (opt.mode === 'encode') {
          var bytes = toBytes(text);
          var lines = [];
          for (var offset = 0; offset < bytes.length; offset += 45) {
            var chunk = Array.prototype.slice.call(bytes, offset, offset + 45);
            var line = String.fromCharCode(chunk.length + 32);
            for (var i = 0; i < chunk.length; i += 3) {
              var b0 = chunk[i];
              var b1 = chunk[i + 1] || 0;
              var b2 = chunk[i + 2] || 0;
              line += String.fromCharCode((b0 >> 2) + 32);
              line += String.fromCharCode((((b0 & 3) << 4) | (b1 >> 4)) + 32);
              line += String.fromCharCode((((b1 & 15) << 2) | (b2 >> 6)) + 32);
              line += String.fromCharCode((b2 & 63) + 32);
            }
            lines.push(line);
          }
          lines.push('`');
          if (opt.withBegin) lines.unshift('begin 644 data.txt');
          if (opt.withBegin) lines.push('end');
          return { output: lines.join('\n'), note: '原始 ' + bytes.length + ' 字节，共 ' + Math.ceil(bytes.length / 45) + ' 行数据' };
        }

        var body = text.split(/\r?\n/).filter(function (line) {
          var trimmed = line.trim();
          return trimmed && trimmed.indexOf('begin ') !== 0 && trimmed !== 'end';
        });
        var out = [];
        body.forEach(function (line) {
          if (!line.length) return;
          var length = line.charCodeAt(0) - 32;
          if (length <= 0) return;
          var buffer = [];
          for (var i = 1; i < line.length; i += 4) {
            var c0 = line.charCodeAt(i) - 32;
            var c1 = (line.charCodeAt(i + 1) || 32) - 32;
            var c2 = (line.charCodeAt(i + 2) || 32) - 32;
            var c3 = (line.charCodeAt(i + 3) || 32) - 32;
            buffer.push(((c0 << 2) | (c1 >> 4)) & 0xff);
            buffer.push((((c1 & 15) << 4) | (c2 >> 2)) & 0xff);
            buffer.push((((c2 & 3) << 6) | c3) & 0xff);
          }
          out = out.concat(buffer.slice(0, length));
        });
        if (!out.length) return { error: '没有解析到有效的 UUEncode 数据行' };
        return { output: fromBytes(out), note: '共还原 ' + out.length + ' 字节' };
      }
    });
  }

  /* ------------------------------ 8. 凯撒暴力破解 ------------------------------ */
  function renderCaesarBrute(root) {
    K.text(root, {
      uid: 'caesarb',
      inputLabel: '密文（支持英文与中文不变部分）',
      inputRows: 6,
      actionLabel: '列出 26 种位移',
      hideOutput: true,
      options: [
        { id: 'mode', label: '范围', type: 'select', value: 'all', options: [
          { value: 'all', label: '全部 1–25 位移' },
          { value: 'one', label: '只解指定位移' }
        ] },
        { id: 'shift', label: '位移量（模式为「指定」时生效）', type: 'number', value: 3, min: 0, max: 25, step: 1 }
      ],
      hint: '凯撒密码只是字母表循环位移，逐个尝试 25 种可能即可肉眼识别明文。',
      sample: 'Wkh txlfn eurzq ira mxpsv ryhu wkh odcb grj',
      run: function (text, opt) {
        function shift(value, amount) {
          return value.replace(/[a-zA-Z]/g, function (ch) {
            var base = ch <= 'Z' ? 65 : 97;
            return String.fromCharCode((ch.charCodeAt(0) - base + amount + 26) % 26 + base);
          });
        }
        if (opt.mode === 'one') {
          var amount = Math.round(Number(opt.shift)) % 26;
          return { output: shift(text, 26 - amount), note: '按位移 ' + amount + ' 解密' };
        }
        var rows = [];
        for (var i = 1; i <= 25; i += 1) {
          rows.push([i, shift(text, 26 - i)]);
        }
        return {
          html: K.table(['位移', '解密结果'], rows),
          note: '共列出 25 种结果，注意寻找可读的英文句子'
        };
      }
    });
  }

  /* ------------------------------ 9. 字节频率分析 ------------------------------ */
  function renderByteFrequency(root) {
    K.text(root, {
      uid: 'bytefreq',
      inputLabel: '输入文本',
      inputRows: 7,
      actionLabel: '分析',
      hideOutput: true,
      options: [
        { id: 'top', label: '显示前 N 个字节', type: 'number', value: 16, min: 4, max: 256, step: 1 },
        { id: 'hex', label: '以十六进制显示', type: 'checkbox', value: true }
      ],
      sample: 'AAAAABBBBCCCDDE',
      run: function (text, opt) {
        var bytes = toBytes(text);
        if (!bytes.length) return { error: '请输入文本' };
        var freq = new Array(256).fill(0);
        for (var i = 0; i < bytes.length; i += 1) freq[bytes[i]] += 1;
        var list = [];
        for (var b = 0; b < 256; b += 1) {
          if (freq[b]) list.push({ byte: b, count: freq[b] });
        }
        list.sort(function (a, b2) { return b2.count - a.count; });
        var limit = Math.max(4, Math.min(256, Math.round(Number(opt.top))));
        var rows = list.slice(0, limit).map(function (item) {
          var label = opt.hex ? '0x' + ('0' + item.byte.toString(16)).slice(-2).toUpperCase() : String(item.byte);
          var char = item.byte >= 32 && item.byte <= 126 ? String.fromCharCode(item.byte) : '·';
          return [label, char, item.count, K.num(item.count / bytes.length * 100, 2) + '%'];
        });
        return {
          html: K.stats([
            { label: '总字节', value: bytes.length },
            { label: '不同字节', value: list.length },
            { label: '最高频', value: K.num(list[0].count / bytes.length * 100, 1) + '%' },
            { label: '熵（估算）', value: K.num(list.reduce(function (sum, item) {
              var p = item.count / bytes.length;
              return sum - p * Math.log2(p);
            }, 0), 2) + ' bit/字节' }
          ]) + K.table(['字节', '字符', '次数', '占比'], rows),
          note: '熵越接近 8 越接近随机数据；纯文本通常在 4–5 之间'
        };
      }
    });
  }

  /* ------------------------------ 10. 乱码修复 ------------------------------ */
  function renderMojibakeFix(root) {
    K.text(root, {
      uid: 'mojibake',
      inputLabel: '粘贴乱码文本（如「ä½ å¥½」或「浣犲ソ」）',
      inputRows: 6,
      actionLabel: '尝试修复',
      outputLabel: '修复结果',
      hint: '常见成因：UTF-8 字节被当成 Latin-1 或 GBK 解码。工具会同时尝试两种反向还原，取最像正常文本的一个。',
      sample: 'ä½ å¥½ï¼Œä¸–ç•Œ',
      run: function (text) {
        function score(value) {
          var bad = (value.match(/\uFFFD/g) || []).length;
          var cjk = (value.match(/[\u3400-\u9fff]/g) || []).length;
          var latinExt = (value.match(/[\u0080-\u024f]/g) || []).length;
          return { bad: bad, cjk: cjk, latinExt: latinExt, value: value };
        }

        // 方案一：Latin-1 字节 → UTF-8
        var latinBytes = [];
        var latinOk = true;
        Array.from(text).forEach(function (ch) {
          var code = ch.codePointAt(0);
          if (code > 255) latinOk = false;
          latinBytes.push(code & 0xff);
        });
        var candidateA = latinOk
          ? new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(latinBytes))
          : null;

        // 方案二：UTF-8 字节 → GBK
        var candidateB = null;
        try {
          candidateB = new TextDecoder('gbk', { fatal: false }).decode(toBytes(text));
        } catch (error) {
          candidateB = null;
        }

        var results = [score(text)];
        if (candidateA) results.push(score(candidateA));
        if (candidateB) results.push(score(candidateB));

        results.sort(function (a, b) {
          if (a.bad !== b.bad) return a.bad - b.bad;
          if (a.cjk !== b.cjk) return b.cjk - a.cjk;
          return a.latinExt - b.latinExt;
        });
        var best = results[0];
        var rows = results.map(function (item, index) {
          return [
            index === 0 ? '选用' : '候选',
            item.value.slice(0, 40) + (item.value.length > 40 ? '…' : ''),
            item.bad,
            item.cjk
          ];
        });
        return {
          output: best.value,
          html: K.table(['', '结果预览', '替换符', '汉字数'], rows),
          note: best.value === text ? '未找到更优解，原文可能不是编码错位导致的乱码' : '已选择最优还原结果'
        };
      }
    });
  }

  /* ------------------------------ 11. URL 分段编码 ------------------------------ */
  function renderUrlPartEncode(root) {
    K.text(root, {
      uid: 'urlpart',
      inputLabel: '输入 URL 或文本',
      actionLabel: '编码',
      options: [
        { id: 'mode', label: '模式', type: 'select', value: 'component', options: [
          { value: 'component', label: 'encodeURIComponent（参数值）' },
          { value: 'uri', label: 'encodeURI（整条 URL）' },
          { value: 'decode', label: 'decodeURIComponent（解码）' }
        ] },
        { id: 'each', label: '逐行处理', type: 'checkbox', value: true }
      ],
      sample: 'https://tools.lovou.pw/搜索?q=中文 参数&page=1',
      run: function (text, opt) {
        function convert(value) {
          if (opt.mode === 'decode') return decodeURIComponent(value);
          return opt.mode === 'uri' ? encodeURI(value) : encodeURIComponent(value);
        }
        try {
          if (!opt.each) return { output: convert(text), note: '保留结构字符的差异见下方说明' };
          var lines = text.split(/\r?\n/);
          return {
            output: lines.map(convert).join('\n'),
            note: '共处理 ' + lines.length + ' 行'
          };
        } catch (error) {
          return { error: '编码失败：' + error.message };
        }
      }
    });
  }

  /* ------------------------------ 12. ROT47 ------------------------------ */
  function renderRot47(root) {
    K.text(root, {
      uid: 'rot47',
      inputLabel: '输入文本',
      actionLabel: 'ROT47',
      hint: '对 ASCII 33–126 的可打印字符做 47 位循环位移，数字、字母、符号一起变换；中文字符保持不变。',
      sample: 'Hello, World! 123',
      run: function (text) {
        return {
          output: Array.from(text).map(function (ch) {
            var code = ch.charCodeAt(0);
            if (code < 33 || code > 126) return ch;
            return String.fromCharCode(33 + ((code - 33 + 47) % 94));
          }).join(''),
          note: '同一个操作即可还原（自反）'
        };
      }
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['base16'] = renderBase16;
  window.ToolModules['base36'] = renderBase36;
  window.ToolModules['mime-encoded-word'] = renderMimeEncodedWord;
  window.ToolModules['html-entity'] = renderHtmlEntity;
  window.ToolModules['unicode-escape'] = renderUnicodeEscape;
  window.ToolModules['c-escape'] = renderCEscape;
  window.ToolModules['uuencode'] = renderUuencode;
  window.ToolModules['caesar-brute'] = renderCaesarBrute;
  window.ToolModules['byte-frequency'] = renderByteFrequency;
  window.ToolModules['mojibake-fix'] = renderMojibakeFix;
  window.ToolModules['url-part-encode'] = renderUrlPartEncode;
  window.ToolModules['rot47'] = renderRot47;
})();
