/* =============================================================================
 * 编码解码工具包 · 第二批（14 个）
 * -----------------------------------------------------------------------------
 * base85 / escape-js / escape-sql / rot18 / affine-cipher / rail-fence /
 * bacon-cipher / a1z26 / brainfuck / hash-identify / crc32 / jwt-sign /
 * totp / gzip-base64
 *
 * 说明：jwt-sign 与 totp 使用 Web Crypto（HMAC），gzip-base64 使用
 * CompressionStream；三者都只在本地计算，不发起网络请求。
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  var encoder = new TextEncoder();
  var decoder = new TextDecoder();

  function bytesToText(bytes) {
    return decoder.decode(bytes);
  }

  function textToBytes(text) {
    return encoder.encode(text);
  }

  function toBase64(bytes) {
    var binary = '';
    for (var i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  function fromBase64(text) {
    var clean = text.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
    while (clean.length % 4) clean += '=';
    var binary = atob(clean);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  /* ------------------------------ 1. Base85 / Ascii85 ------------------------------ */
  function a85Encode(bytes) {
    var out = '';
    for (var i = 0; i < bytes.length; i += 4) {
      var chunk = bytes.subarray(i, i + 4);
      var n = chunk.length;
      var value = 0;
      for (var j = 0; j < 4; j += 1) value = value * 256 + (j < n ? chunk[j] : 0);
      if (n === 4 && value === 0) { out += 'z'; continue; }
      var chars = [];
      for (var k = 4; k >= 0; k -= 1) {
        chars[k] = String.fromCharCode(value % 85 + 33);
        value = Math.floor(value / 85);
      }
      out += chars.join('').slice(0, n + 1);
    }
    return out;
  }

  function a85Decode(text) {
    var src = text.replace(/^\s*<~/, '').replace(/~>\s*$/, '').replace(/\s+/g, '');
    var out = [];
    var group = [];
    for (var i = 0; i < src.length; i += 1) {
      var ch = src[i];
      if (ch === 'z') {
        if (group.length) throw new Error('z 只能出现在分组边界');
        out.push(0, 0, 0, 0);
        continue;
      }
      var code = ch.charCodeAt(0) - 33;
      if (code < 0 || code > 84) throw new Error('包含非法字符：' + ch);
      group.push(code);
      if (group.length === 5) {
        var value = 0;
        for (var g = 0; g < 5; g += 1) value = value * 85 + group[g];
        out.push((value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255);
        group = [];
      }
    }
    if (group.length === 1) throw new Error('末尾分组长度不合法');
    if (group.length > 1) {
      var len = group.length;
      while (group.length < 5) group.push(84);
      var v = 0;
      for (var h = 0; h < 5; h += 1) v = v * 85 + group[h];
      var bytes = [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
      out = out.concat(bytes.slice(0, len - 1));
    }
    return new Uint8Array(out);
  }

  function renderBase85(root) {
    K.text(root, {
      uid: 'a85',
      inputLabel: '原文 / Base85 编码',
      outputLabel: '结果',
      inputRows: 7,
      options: [{
        id: 'mode', label: '方向', type: 'select', value: 'encode',
        options: [{ value: 'encode', label: '文本 → Base85' }, { value: 'decode', label: 'Base85 → 文本' }]
      }],
      hint: '采用 Adobe Ascii85 变体（字符集 ! 至 u，支持 z 压缩连续零字节），首尾的 <~ ~> 可省略。',
      sample: 'Hello, 世界!',
      run: function (text, opt) {
        if (opt.mode === 'encode') {
          var encoded = a85Encode(textToBytes(text));
          return { output: encoded, note: '原始 ' + textToBytes(text).length + ' 字节 → 编码后 ' + encoded.length + ' 字符' };
        }
        var bytes = a85Decode(text);
        return { output: bytesToText(bytes), note: '解码得到 ' + bytes.length + ' 字节' };
      }
    });
  }

  /* ------------------------------ 2. JS 字符串转义 ------------------------------ */
  function renderEscapeJs(root) {
    K.text(root, {
      uid: 'ejs',
      inputLabel: '原文 / 转义字符串',
      outputLabel: '结果',
      inputRows: 7,
      options: [
        { id: 'mode', label: '方向', type: 'select', value: 'encode',
          options: [{ value: 'encode', label: '转义（文本 → 字面量）' }, { value: 'decode', label: '还原（字面量 → 文本）' }] },
        { id: 'asciiOnly', label: '非 ASCII 也转成 \\uXXXX', type: 'checkbox' }
      ],
      sample: '第一行\n"引号" 与 \\ 反斜杠\t制表符',
      run: function (text, opt) {
        if (opt.mode === 'encode') {
          var out = '';
          Array.from(text).forEach(function (ch) {
            var code = ch.codePointAt(0);
            if (ch === '\\') out += '\\\\';
            else if (ch === '"') out += '\\"';
            else if (ch === "'") out += "\\'";
            else if (ch === '\n') out += '\\n';
            else if (ch === '\r') out += '\\r';
            else if (ch === '\t') out += '\\t';
            else if (ch === '\b') out += '\\b';
            else if (ch === '\f') out += '\\f';
            else if (code < 0x20 || code === 0x7f) out += '\\x' + code.toString(16).padStart(2, '0');
            else if (code > 0xffff) {
              var high = Math.floor((code - 0x10000) / 0x400) + 0xd800;
              var low = (code - 0x10000) % 0x400 + 0xdc00;
              out += '\\u' + high.toString(16).toUpperCase() + '\\u' + low.toString(16).toUpperCase();
            } else if (opt.asciiOnly && code > 0x7e) out += '\\u' + code.toString(16).toUpperCase().padStart(4, '0');
            else out += ch;
          });
          return { output: out, note: '转义后 ' + out.length + ' 字符' };
        }
        var decoded = text.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, function (m, seq) {
          if (seq[0] === 'u' && seq[1] === '{') return String.fromCodePoint(parseInt(seq.slice(2, -1), 16));
          if (seq[0] === 'u' && seq.length === 5) return String.fromCharCode(parseInt(seq.slice(1), 16));
          if (seq[0] === 'x' && seq.length === 3) return String.fromCharCode(parseInt(seq.slice(1), 16));
          var map = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', '0': '\0', '\\': '\\', '"': '"', "'": "'", '`': '`' };
          return map[seq] === undefined ? seq : map[seq];
        });
        return { output: decoded, note: '还原后 ' + Array.from(decoded).length + ' 字符' };
      }
    });
  }

  /* ------------------------------ 3. SQL 字符串转义 ------------------------------ */
  function renderEscapeSql(root) {
    K.text(root, {
      uid: 'esql',
      inputLabel: '原文 / 已转义字符串',
      outputLabel: '结果',
      inputRows: 7,
      options: [
        { id: 'mode', label: '方向', type: 'select', value: 'encode',
          options: [{ value: 'encode', label: '转义' }, { value: 'decode', label: '还原' }] },
        { id: 'dialect', label: '方言', type: 'select', value: 'mysql',
          options: [{ value: 'mysql', label: 'MySQL（反斜杠转义）' }, { value: 'standard', label: '标准 SQL（仅单引号加倍）' }] }
      ],
      sample: "O'Reilly 出版社的《SQL 入门》",
      run: function (text, opt) {
        if (opt.mode === 'encode') {
          if (opt.dialect === 'standard') return { output: text.replace(/'/g, "''"), note: '标准 SQL：单引号已加倍' };
          return {
            output: text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"')
              .replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t').replace(/\0/g, '\\0'),
            note: 'MySQL：反斜杠与引号已转义'
          };
        }
        var out = text.replace(/''/g, "'");
        if (opt.dialect === 'mysql') {
          out = out.replace(/\\(.)/g, function (m, ch) {
            var map = { n: '\n', r: '\r', t: '\t', '0': '\0', '\\': '\\', "'": "'", '"': '"', Z: '\x1a', b: '\b' };
            return map[ch] === undefined ? ch : map[ch];
          });
        }
        return { output: out, note: '已还原转义字符' };
      }
    });
  }

  /* ------------------------------ 4. ROT5 / ROT18 ------------------------------ */
  function renderRot18(root) {
    K.text(root, {
      uid: 'rot18',
      inputLabel: '原文',
      outputLabel: '结果',
      inputRows: 6,
      hint: 'ROT18 = 字母 ROT13 + 数字 ROT5，两者互逆，加密与解密是同一个操作。',
      sample: 'Hello 2024, 你好',
      run: function (text) {
        var out = text.replace(/[a-zA-Z0-9]/g, function (ch) {
          var code = ch.charCodeAt(0);
          if (code >= 48 && code <= 57) return String.fromCharCode((code - 48 + 5) % 10 + 48);
          if (code >= 65 && code <= 90) return String.fromCharCode((code - 65 + 13) % 26 + 65);
          return String.fromCharCode((code - 97 + 13) % 26 + 97);
        });
        return { output: out, note: '字母移位 13、数字移位 5（再执行一次可还原）' };
      }
    });
  }

  /* ------------------------------ 5. 仿射密码 ------------------------------ */
  function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

  function modInverse(a, m) {
    for (var i = 1; i < m; i += 1) if ((a * i) % m === 1) return i;
    return null;
  }

  function renderAffine(root) {
    K.form(root, {
      uid: 'affine',
      actionLabel: '转换',
      fields: [
        { id: 'text', label: '文本', type: 'textarea', rows: 5, wide: true },
        { id: 'mode', label: '方向', type: 'select', value: 'encode',
          options: [{ value: 'encode', label: '加密' }, { value: 'decode', label: '解密' }] },
        { id: 'a', label: '乘数 a（与 26 互质）', type: 'number', value: 5, min: 1, max: 25 },
        { id: 'b', label: '偏移 b', type: 'number', value: 8, min: 0, max: 25 }
      ],
      hint: '公式：E(x) = (a·x + b) mod 26；a 必须是 1、3、5、7、9、11、15、17、19、21、23、25 之一。',
      sample: { text: 'Affine Cipher 123', a: 5, b: 8 },
      run: function (v) {
        var a = Number(v.a);
        var b = Number(v.b);
        if (!isFinite(a) || !isFinite(b)) return { error: '参数需要是数字' };
        if (gcd(a, 26) !== 1) return { error: 'a 必须与 26 互质（如 5、7、11）' };
        var inv = modInverse(a, 26);
        var out = Array.from(v.text).map(function (ch) {
          var code = ch.charCodeAt(0);
          var upper = code >= 65 && code <= 90;
          var lower = code >= 97 && code <= 122;
          if (!upper && !lower) return ch;
          var x = upper ? code - 65 : code - 97;
          var y = v.mode === 'encode' ? (a * x + b) % 26 : ((inv * (x - b + 26 * 26)) % 26);
          return String.fromCharCode((upper ? 65 : 97) + y);
        }).join('');
        return {
          html: '<div class="big-result">' + K.esc(out) + '</div>',
          note: v.mode === 'encode' ? '加密完成（a=' + a + ', b=' + b + '）' : '解密完成（a⁻¹=' + inv + '）'
        };
      }
    });
  }

  /* ------------------------------ 6. 栅栏密码 ------------------------------ */
  function railPattern(len, rails) {
    var pattern = [];
    var rail = 0;
    var dir = 1;
    for (var i = 0; i < len; i += 1) {
      pattern.push(rail);
      if (rails > 1) {
        if (rail === 0) dir = 1;
        else if (rail === rails - 1) dir = -1;
        rail += dir;
      }
    }
    return pattern;
  }

  function renderRailFence(root) {
    K.form(root, {
      uid: 'rail',
      actionLabel: '转换',
      fields: [
        { id: 'text', label: '文本', type: 'textarea', rows: 5, wide: true },
        { id: 'mode', label: '方向', type: 'select', value: 'encode',
          options: [{ value: 'encode', label: '加密' }, { value: 'decode', label: '解密' }] },
        { id: 'rails', label: '栅栏数', type: 'number', value: 3, min: 2, max: 12 }
      ],
      hint: '按锯齿形把字符写到 n 行再逐行读出；解密时按同样的锯齿轨迹回填。',
      sample: { text: 'WEAREDISCOVEREDFLEEATONCE', rails: 3 },
      run: function (v) {
        var rails = Number(v.rails);
        if (rails < 2 || rails > 12) return { error: '栅栏数需在 2–12 之间' };
        var chars = Array.from(v.text);
        if (!chars.length) return { error: '请输入文本' };
        var pattern = railPattern(chars.length, rails);
        var out;
        if (v.mode === 'encode') {
          var buckets = [];
          for (var r = 0; r < rails; r += 1) buckets.push('');
          chars.forEach(function (ch, i) { buckets[pattern[i]] += ch; });
          out = buckets.join('');
        } else {
          var counts = [];
          for (var r2 = 0; r2 < rails; r2 += 1) counts.push(0);
          pattern.forEach(function (p) { counts[p] += 1; });
          var rows = [];
          var cursor = 0;
          for (var r3 = 0; r3 < rails; r3 += 1) {
            rows.push(chars.slice(cursor, cursor + counts[r3]));
            cursor += counts[r3];
          }
          var index = [];
          for (var r4 = 0; r4 < rails; r4 += 1) index.push(0);
          out = pattern.map(function (p) { return rows[p][index[p]++]; }).join('');
        }
        return {
          html: '<pre class="code-block">' + K.esc(out) + '</pre>',
          note: v.mode === 'encode' ? '已按 ' + rails + ' 栏加密' : '已按 ' + rails + ' 栏解密'
        };
      }
    });
  }

  /* ------------------------------ 7. 培根密码 ------------------------------ */
  var BACON_24 = 'ABCDEFGHIKLMNOPQRSTUWXYZ'; // I/J 与 U/V 合并
  var BACON_26 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  function renderBacon(root) {
    K.form(root, {
      uid: 'bacon',
      actionLabel: '转换',
      fields: [
        { id: 'text', label: '文本 / AB 序列', type: 'textarea', rows: 5, wide: true },
        { id: 'mode', label: '方向', type: 'select', value: 'encode',
          options: [{ value: 'encode', label: '文本 → AB 序列' }, { value: 'decode', label: 'AB 序列 → 文本' }] },
        { id: 'variant', label: '字母表', type: 'select', value: '26',
          options: [{ value: '26', label: '26 字母（现代常用）' }, { value: '24', label: '24 字母（I/J、U/V 合并）' }] },
        { id: 'sep', label: '每组之间加空格', type: 'checkbox', value: true }
      ],
      sample: { text: 'BACON', mode: 'encode' },
      run: function (v) {
        var alphabet = v.variant === '24' ? BACON_24 : BACON_26;
        if (v.mode === 'encode') {
          var groups = [];
          Array.from(v.text.toUpperCase()).forEach(function (ch) {
            var idx = alphabet.indexOf(ch);
            if (idx < 0) {
              if (ch === 'J' && v.variant === '24') idx = alphabet.indexOf('I');
              else if (ch === 'V' && v.variant === '24') idx = alphabet.indexOf('U');
              else return;
            }
            groups.push(idx.toString(2).padStart(5, '0').replace(/0/g, 'A').replace(/1/g, 'B'));
          });
          if (!groups.length) return { error: '没有可编码的字母（仅支持 A–Z）' };
          return {
            html: '<pre class="code-block">' + K.esc(groups.join(v.sep ? ' ' : '')) + '</pre>',
            note: '共编码 ' + groups.length + ' 个字母'
          };
        }
        var seq = v.text.toUpperCase().replace(/[^AB]/g, '');
        if (!seq.length) return { error: '请粘贴由 A / B 组成的序列' };
        if (seq.length % 5 !== 0) return { error: 'AB 序列长度需要是 5 的倍数（当前 ' + seq.length + '）' };
        var out = '';
        for (var i = 0; i < seq.length; i += 5) {
          var idx = parseInt(seq.slice(i, i + 5).replace(/A/g, '0').replace(/B/g, '1'), 2);
          if (idx >= alphabet.length) return { error: '第 ' + (i / 5 + 1) + ' 组超出字母表范围' };
          out += alphabet[idx];
        }
        return { html: '<div class="big-result">' + K.esc(out) + '</div>', note: '已解码 ' + out.length + ' 个字母' };
      }
    });
  }

  /* ------------------------------ 8. A1Z26 ------------------------------ */
  function renderA1z26(root) {
    K.text(root, {
      uid: 'a1z26',
      inputLabel: '原文 / 数字序列',
      outputLabel: '结果',
      inputRows: 6,
      options: [
        { id: 'mode', label: '方向', type: 'select', value: 'encode',
          options: [{ value: 'encode', label: '字母 → 数字' }, { value: 'decode', label: '数字 → 字母' }] },
        { id: 'sep', label: '分隔符', type: 'select', value: '-',
          options: [{ value: '-', label: '短横线' }, { value: ' ', label: '空格' }, { value: ',', label: '逗号' }] },
        { id: 'keepCase', label: '解密时输出小写', type: 'checkbox' }
      ],
      hint: 'A=1、B=2 … Z=26。解密时会自动忽略除数字以外的所有字符，因此用哪种分隔符都能还原。',
      sample: 'HELLO WORLD',
      run: function (text, opt) {
        if (opt.mode === 'encode') {
          var nums = [];
          Array.from(text.toUpperCase()).forEach(function (ch) {
            if (ch >= 'A' && ch <= 'Z') nums.push(ch.charCodeAt(0) - 64);
          });
          if (!nums.length) return { error: '没有可转换的字母' };
          return { output: nums.join(opt.sep), note: '共转换 ' + nums.length + ' 个字母' };
        }
        var parts = text.trim().split(/[^0-9]+/).filter(Boolean);
        var out = '';
        for (var i = 0; i < parts.length; i += 1) {
          var n = parseInt(parts[i], 10);
          if (!n || n < 1 || n > 26) return { error: '数字 ' + parts[i] + ' 不在 1–26 范围内' };
          var ch = String.fromCharCode(64 + n);
          out += opt.keepCase ? ch.toLowerCase() : ch;
        }
        return { output: out, note: '共解码 ' + out.length + ' 个字母' };
      }
    });
  }

  /* ------------------------------ 9. Brainfuck 解释器 ------------------------------ */
  function renderBrainfuck(root) {
    K.form(root, {
      uid: 'bf',
      actionLabel: '运行',
      fields: [
        { id: 'code', label: 'Brainfuck 代码', type: 'textarea', rows: 7, wide: true,
          value: '++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.' },
        { id: 'input', label: '程序输入（用于 , 指令）', type: 'text', placeholder: '可留空' },
        { id: 'limit', label: '最大执行步数', type: 'number', value: 5000000, min: 1000, max: 20000000 }
      ],
      hint: '内存 30000 个字节、8 位循环；为了防止死循环，超过步数上限会中断并提示。',
      run: function (v) {
        var code = v.code;
        var out = '';
        var cells = new Uint8Array(30000);
        var ptr = 0;
        var pc = 0;
        var inputPos = 0;
        var input = v.input || '';
        var steps = 0;
        var limit = Number(v.limit) || 5000000;

        // 预编译括号匹配，避免运行时重复扫描
        var jump = {};
        var stack = [];
        for (var i = 0; i < code.length; i += 1) {
          if (code[i] === '[') stack.push(i);
          else if (code[i] === ']') {
            if (!stack.length) return { error: '第 ' + (i + 1) + ' 个字符处有未匹配的 ]' };
            var open = stack.pop();
            jump[open] = i;
            jump[i] = open;
          }
        }
        if (stack.length) return { error: '有 ' + stack.length + ' 个 [ 未闭合' };

        while (pc < code.length) {
          steps += 1;
          if (steps > limit) {
            return { error: '执行步数超过 ' + limit + '，可能存在死循环（已中断）' };
          }
          var cmd = code[pc];
          if (cmd === '>') ptr = (ptr + 1) % 30000;
          else if (cmd === '<') ptr = (ptr + 29999) % 30000;
          else if (cmd === '+') cells[ptr] = (cells[ptr] + 1) & 255;
          else if (cmd === '-') cells[ptr] = (cells[ptr] + 255) & 255;
          else if (cmd === '.') out += String.fromCharCode(cells[ptr]);
          else if (cmd === ',') {
            if (inputPos < input.length) { cells[ptr] = input.charCodeAt(inputPos) & 255; inputPos += 1; }
            else cells[ptr] = 0;
          } else if (cmd === '[' && cells[ptr] === 0) pc = jump[pc];
          else if (cmd === ']' && cells[ptr] !== 0) pc = jump[pc];
          pc += 1;
        }
        if (out.length > 20000) out = out.slice(0, 20000) + '\n…（输出过长，已截断）';
        return {
          html: '<pre class="code-block">' + K.esc(out || '（程序没有输出）') + '</pre>',
          note: '执行完成，共 ' + steps + ' 步，输出 ' + out.length + ' 字符'
        };
      }
    });
  }

  /* ------------------------------ 10. 哈希类型识别 ------------------------------ */
  function renderHashIdentify(root) {
    K.text(root, {
      uid: 'hid',
      inputLabel: '粘贴哈希值',
      outputLabel: '识别结果',
      outputRows: 3,
      actionLabel: '识别',
      inputRows: 3,
      showCount: false,
      hint: '仅按长度与字符集推断，无法确定唯一算法；带盐或加前缀的哈希会单独标注。',
      sample: '5d41402abc4b2a76b9719d911017c592',
      run: function (text) {
        var value = text.trim();
        if (!value) return { error: '请粘贴哈希值' };
        var rows = [];
        var add = function (name, reason) { rows.push([name, reason]); };
        var hex = /^[a-f0-9]+$/i.test(value);

        if (/^\$2[aby]?\$\d{2}\$/.test(value)) add('bcrypt', '以 $2a$ / $2b$ / $2y$ 开头');
        else if (/^\$argon2(id|i|d)\$/.test(value)) add('Argon2', '以 $argon2 开头');
        else if (/^\$6\$/.test(value)) add('SHA-512 crypt', '以 $6$ 开头');
        else if (/^\$5\$/.test(value)) add('SHA-256 crypt', '以 $5$ 开头');
        else if (/^\$1\$/.test(value)) add('MD5 crypt', '以 $1$ 开头');
        else if (/^pbkdf2/i.test(value)) add('PBKDF2', '以 pbkdf2 开头');
        else if (/^\{SSHA\}/i.test(value)) add('LDAP SSHA', '以 {SSHA} 开头');
        else if (!hex) {
          // Base64 形式的摘要
          var base64Len = value.replace(/=+$/, '').length;
          var b64Map = { 24: '16 字节 · MD5', 27: '20 字节 · SHA-1（Base64）', 43: '32 字节 · SHA-256（Base64）', 64: '48 字节 · SHA-384（Base64）', 86: '64 字节 · SHA-512（Base64）' };
          if (b64Map[base64Len]) add('Base64 摘要', b64Map[base64Len]);
          else add('无法确定', '既不是十六进制，也不是常见长度的 Base64');
        } else {
          var map = {
            8: ['CRC32 / 32 位校验', '8 位十六进制'],
            16: ['64 位哈希（截断）', '16 位十六进制，可能是截断的 MD5'],
            32: ['MD5 / NTLM / MD4', '32 位十六进制（128 bit）'],
            40: ['SHA-1 / MySQL5 / RIPEMD-160', '40 位十六进制（160 bit）'],
            56: ['SHA-224 / SHA3-224', '56 位十六进制（224 bit）'],
            64: ['SHA-256 / SHA3-256 / BLAKE2s', '64 位十六进制（256 bit）'],
            96: ['SHA-384 / SHA3-384', '96 位十六进制（384 bit）'],
            128: ['SHA-512 / SHA3-512 / Whirlpool', '128 位十六进制（512 bit）']
          };
          if (map[value.length]) add(map[value.length][0], map[value.length][1]);
          else add('无法确定', '长度 ' + value.length + ' 不在常见摘要长度内');
        }

        return {
          output: '长度 ' + value.length + ' 字符，可能类型：' + rows.map(function (r) { return r[0]; }).join(' / '),
          html: K.table(['可能类型', '判断依据'], rows),
          note: '仅作参考，最终需结合来源判断'
        };
      }
    });
  }

  /* ------------------------------ 11. CRC32 ------------------------------ */
  var crcTable = null;
  function getCrcTable() {
    if (crcTable) return crcTable;
    crcTable = new Uint32Array(256);
    for (var n = 0; n < 256; n += 1) {
      var c = n;
      for (var k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      crcTable[n] = c >>> 0;
    }
    return crcTable;
  }

  function crc32(bytes) {
    var table = getCrcTable();
    var crc = 0xffffffff;
    for (var i = 0; i < bytes.length; i += 1) {
      crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function renderCrc32(root) {
    K.text(root, {
      uid: 'crc',
      inputLabel: '文本（按 UTF-8 计算）',
      outputLabel: '结果',
      outputRows: 4,
      actionLabel: '计算',
      inputRows: 6,
      options: [{ id: 'expected', label: '对照值（可选）', type: 'text', placeholder: '如 0xCBF43926', mono: false }],
      sample: '123456789',
      run: function (text, opt) {
        var bytes = textToBytes(text);
        var value = crc32(bytes);
        var hex = value.toString(16).toUpperCase().padStart(8, '0');
        var note = 'CRC-32（IEEE 802.3）· ' + bytes.length + ' 字节';
        if (opt.expected) {
          var expected = opt.expected.trim().replace(/^0x/i, '').toUpperCase();
          note += expected === hex ? ' · 与对照值一致' : ' · 与对照值不一致（输入为 ' + expected + '）';
        }
        return {
          output: '0x' + hex,
          note: note
        };
      }
    });
  }

  /* ------------------------------ 12. JWT 生成（HMAC） ------------------------------ */
  function base64UrlEncode(bytes) {
    return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function subtleHmac(alg, keyBytes, dataBytes) {
    if (!window.crypto || !window.crypto.subtle) {
      return Promise.reject(new Error('当前环境不支持 Web Crypto，请用 https 或 localhost 打开'));
    }
    // JWT 用 HS256/384/512 表示算法，Web Crypto 需要 SHA-256/384/512
    var hash = /^HS(\d+)$/.test(alg) ? 'SHA-' + alg.slice(2) : alg;
    return window.crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: { name: hash } }, false, ['sign'])
      .then(function (key) {
        return window.crypto.subtle.sign('HMAC', key, dataBytes);
      });
  }

  function renderJwtSign(root) {
    var now = Math.floor(Date.now() / 1000);
    K.form(root, {
      uid: 'jwts',
      actionLabel: '生成 Token',
      fields: [
        { id: 'header', label: 'Header（JSON）', type: 'textarea', rows: 3, wide: true, mono: true,
          value: '{\n  "alg": "HS256",\n  "typ": "JWT"\n}' },
        { id: 'payload', label: 'Payload（JSON）', type: 'textarea', rows: 6, wide: true, mono: true,
          value: '{\n  "sub": "1234567890",\n  "name": "张三",\n  "iat": ' + now + '\n}' },
        { id: 'secret', label: '密钥（HMAC Secret）', type: 'text', value: 'your-256-bit-secret', wide: true },
        { id: 'alg', label: '签名算法', type: 'select', value: 'HS256',
          options: [{ value: 'HS256', label: 'HS256' }, { value: 'HS384', label: 'HS384' }, { value: 'HS512', label: 'HS512' }] }
      ],
      hint: '只在本地签名，密钥不会离开浏览器。注意：JWT 只做签名不加密，Payload 是明文可读的。',
      run: function (v) {
        var header, payload;
        try {
          header = JSON.parse(v.header);
        } catch (e) { return { error: 'Header 不是合法 JSON：' + e.message }; }
        try {
          payload = JSON.parse(v.payload);
        } catch (e) { return { error: 'Payload 不是合法 JSON：' + e.message }; }
        if (!v.secret) return { error: '请填写 HMAC 密钥' };
        header.alg = v.alg;
        header.typ = header.typ || 'JWT';

        var head = base64UrlEncode(textToBytes(JSON.stringify(header)));
        var body = base64UrlEncode(textToBytes(JSON.stringify(payload)));
        var signingInput = head + '.' + body;

        return subtleHmac(v.alg, textToBytes(v.secret), textToBytes(signingInput)).then(function (signature) {
          var token = signingInput + '.' + base64UrlEncode(new Uint8Array(signature));
          return {
            html: '<pre class="code-block">' + K.esc(token) + '</pre>' +
              '<div class="btn-row"><button type="button" class="btn ghost" data-copy="' + K.esc(token) + '">复制 Token</button></div>',
            rows: [
              { key: '算法', value: v.alg },
              { key: 'Header', value: head },
              { key: 'Payload', value: body },
              { key: 'Token 长度', value: token.length + ' 字符' }
            ],
            note: '签名完成，可粘贴到 jwt.io 验证（注意密钥一致）'
          };
        });
      }
    });
  }

  /* ------------------------------ 13. TOTP ------------------------------ */
  var B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  function base32Decode(input) {
    var clean = input.toUpperCase().replace(/[\s-]/g, '').replace(/=+$/, '');
    if (!clean.length) return new Uint8Array(0);
    var bits = 0;
    var value = 0;
    var out = [];
    for (var i = 0; i < clean.length; i += 1) {
      var idx = B32_ALPHABET.indexOf(clean[i]);
      if (idx < 0) throw new Error('Base32 中含有非法字符：' + clean[i]);
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        bits -= 8;
        out.push((value >>> bits) & 0xff);
        // 只保留尚未输出的低位，避免长输入时 32 位溢出
        value &= (1 << bits) - 1;
      }
    }
    return new Uint8Array(out);
  }

  // timestamp 单位为秒（RFC 6238：T = floor((当前时间 - T0) / 步长)）
  function totpCode(secret, period, digits, alg, timestamp) {
    var keyBytes;
    try {
      keyBytes = base32Decode(secret);
    } catch (e) {
      return Promise.reject(e);
    }
    if (!keyBytes.length) return Promise.reject(new Error('密钥为空，请填写 Base32 格式的密钥'));
    var counter = Math.floor(timestamp / period);
    var msg = new Uint8Array(8);
    var high = Math.floor(counter / 4294967296);
    var low = counter % 4294967296;
    msg[0] = (high >>> 24) & 255; msg[1] = (high >>> 16) & 255; msg[2] = (high >>> 8) & 255; msg[3] = high & 255;
    msg[4] = (low >>> 24) & 255; msg[5] = (low >>> 16) & 255; msg[6] = (low >>> 8) & 255; msg[7] = low & 255;

    return subtleHmac(alg, keyBytes, msg).then(function (buffer) {
      var hash = new Uint8Array(buffer);
      var offset = hash[hash.length - 1] & 0x0f;
      var binary = ((hash[offset] & 0x7f) << 24) | (hash[offset + 1] << 16) | (hash[offset + 2] << 8) | hash[offset + 3];
      var mod = Math.pow(10, digits);
      return String(binary % mod).padStart(digits, '0');
    });
  }

  function renderTotp(root) {
    var lastPeriod = 30;
    var api = K.form(root, {
      uid: 'totp',
      actionLabel: '生成验证码',
      fields: [
        { id: 'secret', label: 'Base32 密钥', type: 'text', value: 'JBSWY3DPEHPK3PXP', wide: true },
        { id: 'digits', label: '位数', type: 'select', value: '6',
          options: [{ value: '6', label: '6 位' }, { value: '8', label: '8 位' }] },
        { id: 'period', label: '周期（秒）', type: 'number', value: 30, min: 10, max: 120 },
        { id: 'alg', label: '算法', type: 'select', value: 'SHA-1',
          options: [{ value: 'SHA-1', label: 'SHA-1（标准）' }, { value: 'SHA-256', label: 'SHA-256' }, { value: 'SHA-512', label: 'SHA-512' }] }
      ],
      hint: '与 Google Authenticator、1Password 等 App 的 TOTP 规则一致（RFC 6238）。密钥只在本机参与计算。',
      run: function (v) {
        var period = Math.max(10, Number(v.period) || 30);
        var digits = Number(v.digits) || 6;
        lastPeriod = period;
        if (!v.secret.trim()) return { error: '请填写 Base32 密钥' };
        var nowSec = Math.floor(Date.now() / 1000);
        return totpCode(v.secret, period, digits, v.alg, nowSec).then(function (code) {
          var remain = period - (nowSec % period);
          var pct = Math.round(remain / period * 100);
          return {
            html: '<div class="totp-stage"><div class="totp-code">' + code.replace(/(\d{3})(?=\d)/, '$1 ') + '</div>' +
              '<div class="meter"><span class="meter-fill" style="width:' + pct + '%"></span></div>' +
              '<p class="totp-note">剩余 ' + remain + ' 秒刷新</p></div>',
            rows: [
              { key: '当前验证码', value: code },
              { key: '有效期', value: remain + ' 秒' },
              { key: '周期 / 位数', value: period + ' 秒 / ' + digits + ' 位' }
            ],
            note: '验证码每 ' + period + ' 秒变化一次'
          };
        });
      }
    });

    // 每秒刷新倒计时，到期自动重算；离开页面后自动停止
    var timer = setInterval(function () {
      if (!document.body.contains(root)) { clearInterval(timer); return; }
      var stage = root.querySelector('.totp-stage');
      if (!stage) return;
      var remain = lastPeriod - (Math.floor(Date.now() / 1000) % lastPeriod);
      var fill = stage.querySelector('.meter-fill');
      var note = stage.querySelector('.totp-note');
      if (fill) fill.style.width = Math.round(remain / lastPeriod * 100) + '%';
      if (note) note.textContent = '剩余 ' + remain + ' 秒刷新';
      if (remain === lastPeriod) api.run();
    }, 1000);
  }

  /* ------------------------------ 14. gzip + Base64 ------------------------------ */
  function streamThrough(bytes, stream) {
    return new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()
      .then(function (buffer) { return new Uint8Array(buffer); });
  }

  function renderGzip(root) {
    K.text(root, {
      uid: 'gzip',
      inputLabel: '原文 / Base64 字符串',
      outputLabel: '结果',
      inputRows: 8,
      options: [{
        id: 'mode', label: '方向', type: 'select', value: 'compress',
        options: [{ value: 'compress', label: '压缩（文本 → Base64）' }, { value: 'decompress', label: '解压（Base64 → 文本）' }]
      }],
      hint: '使用浏览器内置的 CompressionStream（gzip）。适合把长 JSON / 配置塞进 URL 或环境变量；Chrome 80+、Safari 16.4+ 支持。',
      sample: '{"name":"集成工具大全","features":["纯前端","零依赖","可离线"],"count":211}',
      run: function (text, opt) {
        if (typeof CompressionStream === 'undefined') {
          return { error: '当前浏览器不支持 CompressionStream，请升级浏览器' };
        }
        if (opt.mode === 'compress') {
          var input = textToBytes(text);
          return streamThrough(input, new CompressionStream('gzip')).then(function (out) {
            var b64 = toBase64(out);
            return {
              output: b64,
              note: input.length + ' 字节 → ' + out.length + ' 字节（压缩率 ' +
                (out.length / input.length * 100).toFixed(1) + '%），Base64 后 ' + b64.length + ' 字符'
            };
          });
        }
        var raw;
        try {
          raw = fromBase64(text.trim());
        } catch (e) {
          return { error: 'Base64 格式不正确' };
        }
        return streamThrough(raw, new DecompressionStream('gzip')).then(function (out) {
          return { output: bytesToText(out), note: '解压得到 ' + out.length + ' 字节' };
        }).catch(function () {
          throw new Error('解压失败，内容可能不是 gzip 压缩的 Base64');
        });
      }
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['base85'] = renderBase85;
  window.ToolModules['escape-js'] = renderEscapeJs;
  window.ToolModules['escape-sql'] = renderEscapeSql;
  window.ToolModules['rot18'] = renderRot18;
  window.ToolModules['affine-cipher'] = renderAffine;
  window.ToolModules['rail-fence'] = renderRailFence;
  window.ToolModules['bacon-cipher'] = renderBacon;
  window.ToolModules['a1z26'] = renderA1z26;
  window.ToolModules['brainfuck'] = renderBrainfuck;
  window.ToolModules['hash-identify'] = renderHashIdentify;
  window.ToolModules['crc32'] = renderCrc32;
  window.ToolModules['jwt-sign'] = renderJwtSign;
  window.ToolModules['totp'] = renderTotp;
  window.ToolModules['gzip-base64'] = renderGzip;
})();
