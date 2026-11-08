/* =============================================================================
 * 文本处理工具包 · 第五批（12 个）
 * -----------------------------------------------------------------------------
 * text-sort-natural  自然排序
 * text-mirror        镜像文字
 * fancy-text         花体字转换
 * text-long-lines    超长行检测
 * csv-quote          CSV 字段引号处理
 * lines-to-sql       行转 SQL IN 列表
 * lines-to-json      行转 JSON 数组
 * number-sequence    数字序列生成
 * unicode-normalize  NFC / NFD 归一化
 * text-remove-accents 去除变音符号
 * text-reading-time  阅读时长估算
 * text-split-sentence 按句切分
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  /* ------------------------------ 1. 自然排序 ------------------------------ */
  function renderSortNatural(root) {
    K.text(root, {
      uid: 'sortnatural',
      inputLabel: '多行文本（文件名、章节名等）',
      inputRows: 9,
      actionLabel: '排序',
      options: [
        { id: 'desc', label: '倒序', type: 'checkbox', value: false },
        { id: 'caseFirst', label: '区分大小写优先', type: 'checkbox', value: false },
        { id: 'noEmpty', label: '忽略空行', type: 'checkbox', value: true }
      ],
      hint: '自然排序会把 file2 排在 file10 前面（普通字典序正好相反）。',
      sample: 'file1.txt\nfile10.txt\nfile2.txt\n第3章\n第20章',
      run: function (text, opt) {
        var lines = text.split(/\r?\n/);
        if (opt.noEmpty) lines = lines.filter(function (line) { return line.trim() !== ''; });
        var collator = new Intl.Collator('zh-CN', {
          numeric: true,
          sensitivity: opt.caseFirst ? 'variant' : 'base'
        });
        lines.sort(function (a, b) { return collator.compare(a, b); });
        if (opt.desc) lines.reverse();
        return { output: lines.join('\n'), note: '共 ' + lines.length + ' 行，按数字与中文拼音自然顺序排列' };
      }
    });
  }

  /* ------------------------------ 2. 镜像文字 ------------------------------ */
  function renderMirrorText(root) {
    K.text(root, {
      uid: 'mirror',
      inputLabel: '原始文本',
      actionLabel: '镜像',
      options: [
        { id: 'mode', label: '方式', type: 'select', value: 'horizontal', options: [
          { value: 'horizontal', label: '水平镜像（字符倒序 + 括号翻转）' },
          { value: 'vertical', label: '上下翻转（使用 Unicode 对应符号）' }
        ] }
      ],
      hint: '水平镜像适合做「镜面文字」效果；上下翻转只能映射部分字母与符号。',
      sample: 'Hello (tools) [box]',
      run: function (text, opt) {
        if (opt.mode === 'vertical') {
          var flip = {
            a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ', i: 'ᴉ', j: 'ɾ',
            k: 'ʞ', l: 'l', m: 'ɯ', n: 'u', o: 'o', p: 'd', q: 'b', r: 'ɹ', s: 's', t: 'ʇ',
            u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z',
            A: '∀', B: '𐐒', C: 'Ɔ', D: '◖', E: 'Ǝ', F: 'Ⅎ', G: '⅁', H: 'H', I: 'I', J: 'ſ',
            K: 'ʞ', L: '˥', M: 'W', N: 'N', O: 'O', P: 'Ԁ', Q: 'Ό', R: 'ᴚ', S: 'S', T: '⊥',
            U: '∩', V: 'Λ', W: 'M', X: 'X', Y: '⅄', Z: 'Z',
            '1': 'Ɩ', '2': 'ᄅ', '3': 'Ɛ', '4': 'ㄣ', '5': 'ϛ', '6': '9', '7': 'ㄥ', '8': '8', '9': '6', '0': '0',
            '.': '˙', ',': "'", '?': '¿', '!': '¡', '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{',
            '<': '>', '>': '<', '&': '⅋', '_': '‾'
          };
          var outV = Array.from(text).reverse().map(function (ch) {
            return flip[ch] || ch;
          }).join('');
          return { output: outV, note: '已按字符映射并反转顺序' };
        }
        var mirror = { '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<', '«': '»', '»': '«' };
        var out = Array.from(text).reverse().map(function (ch) { return mirror[ch] || ch; }).join('');
        return { output: out, note: '括号成对翻转，可直接用于镜面排版' };
      }
    });
  }

  /* ------------------------------ 3. 花体字转换 ------------------------------ */
  var FANCY = {
    bold: { upper: 0x1d400, lower: 0x1d41a, digit: 0x1d7ce },
    italic: { upper: 0x1d434, lower: 0x1d44e, digit: 0 },
    boldItalic: { upper: 0x1d468, lower: 0x1d482, digit: 0 },
    script: { upper: 0x1d49c, lower: 0x1d4b6, digit: 0 },
    double: { upper: 0x1d538, lower: 0x1d552, digit: 0x1d7d8 },
    mono: { upper: 0x1d670, lower: 0x1d68a, digit: 0x1d7f6 }
  };

  function renderFancyText(root) {
    K.text(root, {
      uid: 'fancy',
      inputLabel: '原始文本（仅转换英文与数字）',
      actionLabel: '转换',
      options: [
        { id: 'style', label: '样式', type: 'select', value: 'bold', options: [
          { value: 'bold', label: '粗体 𝐀𝐁𝐂' },
          { value: 'italic', label: '斜体 𝐴𝐵𝐶' },
          { value: 'boldItalic', label: '粗斜体 𝑨𝑩𝑪' },
          { value: 'script', label: '手写体 𝒜ℬ𝒞' },
          { value: 'double', label: '空心体 𝔸𝔹ℂ' },
          { value: 'mono', label: '等宽 𝙰𝙱𝙲' },
          { value: 'circled', label: '圆圈 ⒶⒷⒸ' },
          { value: 'fullwidth', label: '全角 ＡＢＣ' }
        ] }
      ],
      hint: '这些字符是 Unicode 数学字母，社交平台普遍支持；部分老字体可能显示为方框。',
      sample: 'Tools Box 2026',
      run: function (text, opt) {
        if (opt.style === 'circled') {
          return {
            output: Array.from(text).map(function (ch) {
              var code = ch.charCodeAt(0);
              if (code >= 65 && code <= 90) return String.fromCodePoint(0x24b6 + code - 65);
              if (code >= 97 && code <= 122) return String.fromCodePoint(0x24d0 + code - 97);
              if (code >= 49 && code <= 57) return String.fromCodePoint(0x2460 + code - 49);
              if (code === 48) return '⓪';
              return ch;
            }).join(''),
            note: '圆圈字母，适合列表与强调'
          };
        }
        if (opt.style === 'fullwidth') {
          return {
            output: Array.from(text).map(function (ch) {
              var code = ch.charCodeAt(0);
              if (code === 32) return '\u3000';
              if (code >= 33 && code <= 126) return String.fromCharCode(code + 0xfee0);
              return ch;
            }).join(''),
            note: '全角字符占两个半角宽度'
          };
        }
        var map = FANCY[opt.style] || FANCY.bold;
        var converted = Array.from(text).map(function (ch) {
          var code = ch.codePointAt(0);
          if (code >= 65 && code <= 90) return String.fromCodePoint(map.upper + code - 65);
          if (code >= 97 && code <= 122) return String.fromCodePoint(map.lower + code - 97);
          if (code >= 48 && code <= 57 && map.digit) return String.fromCodePoint(map.digit + code - 48);
          return ch;
        }).join('');
        return { output: converted, note: '部分字母在 Unicode 中有既定样式差异（如手写体的小写 e）' };
      }
    });
  }

  /* ------------------------------ 4. 超长行检测 ------------------------------ */
  function renderLongLines(root) {
    K.text(root, {
      uid: 'longlines',
      inputLabel: '粘贴代码或文档',
      inputRows: 10,
      actionLabel: '检测',
      hideOutput: true,
      options: [
        { id: 'limit', label: '长度阈值（字符）', type: 'number', value: 100, min: 10, step: 10 },
        { id: 'tab', label: 'Tab 折算为 4 空格', type: 'checkbox', value: true }
      ],
      sample: 'const short = 1;\nconst veryLong = someFunction(argumentOne, argumentTwo, argumentThree, argumentFour, argumentFive, argumentSix);',
      run: function (text, opt) {
        var limit = Math.max(10, Math.round(Number(opt.limit)));
        var rows = [];
        text.split(/\r?\n/).forEach(function (line, index) {
          var length = Array.from(opt.tab ? line.replace(/\t/g, '    ') : line).length;
          if (length > limit) {
            rows.push([index + 1, length, K.esc(line.slice(0, 80)) + (line.length > 80 ? '…' : '')]);
          }
        });
        if (!rows.length) return { html: '<p class="hint">没有超过 ' + limit + ' 字符的行，格式很整齐。</p>', note: '共检查全部行' };
        return {
          html: K.table(['行号', '长度', '内容片段'], rows),
          note: '共 ' + rows.length + ' 行超过 ' + limit + ' 字符'
        };
      }
    });
  }

  /* ------------------------------ 5. CSV 字段引号 ------------------------------ */
  function renderCsvQuote(root) {
    K.text(root, {
      uid: 'csvquote',
      inputLabel: 'CSV / TSV 内容',
      inputRows: 9,
      actionLabel: '处理',
      options: [
        { id: 'sep', label: '分隔符', type: 'select', value: ',', options: [
          { value: ',', label: '逗号 ,' },
          { value: ';', label: '分号 ;' },
          { value: '\t', label: '制表符 Tab' },
          { value: '|', label: '竖线 |' }
        ] },
        { id: 'mode', label: '加引号策略', type: 'select', value: 'need', options: [
          { value: 'need', label: '仅必要时加引号' },
          { value: 'all', label: '全部字段加引号' }
        ] }
      ],
      hint: '字段中含分隔符、双引号或换行时必须加引号，内部双引号需写成两个。',
      sample: '姓名,备注,城市\n张三,"喜欢,咖啡",北京\n李四,"说"你好"",上海',
      run: function (text, opt) {
        var sep = opt.sep;
        var lines = text.split(/\r?\n/).filter(function (line) { return line !== ''; });
        var out = lines.map(function (line) {
          var fields = [];
          var current = '';
          var inQuote = false;
          for (var i = 0; i < line.length; i += 1) {
            var ch = line.charAt(i);
            if (ch === '"') {
              if (inQuote && line.charAt(i + 1) === '"') { current += '"'; i += 1; }
              else inQuote = !inQuote;
            } else if (ch === sep && !inQuote) {
              fields.push(current);
              current = '';
            } else {
              current += ch;
            }
          }
          fields.push(current);
          return fields.map(function (value) {
            var need = value.indexOf(sep) >= 0 || value.indexOf('"') >= 0 || /[\r\n]/.test(value);
            if (opt.mode === 'all' || need) return '"' + value.replace(/"/g, '""') + '"';
            return value;
          }).join(sep);
        });
        return { output: out.join('\n'), note: '共处理 ' + lines.length + ' 行' };
      }
    });
  }

  /* ------------------------------ 6. 行转 SQL IN ------------------------------ */
  function renderLinesToSql(root) {
    K.text(root, {
      uid: 'linestosql',
      inputLabel: '每行一个值',
      inputRows: 8,
      actionLabel: '生成 IN 列表',
      options: [
        { id: 'quote', label: '按字符串加单引号', type: 'checkbox', value: true },
        { id: 'wrap', label: '每行一个值（便于阅读）', type: 'checkbox', value: true },
        { id: 'unique', label: '去重', type: 'checkbox', value: true },
        { id: 'limit', label: '超过多少个值提示（0 不提示）', type: 'number', value: 1000, min: 0, step: 100 }
      ],
      sample: "1001\n1002\n1003\n'1004'",
      run: function (text, opt) {
        var values = text.split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
        if (opt.unique) values = values.filter(function (item, index) { return values.indexOf(item) === index; });
        var items = values.map(function (value) {
          var clean = value.replace(/^'(.*)'$/, '$1');
          if (/^-?\d+(\.\d+)?$/.test(clean)) return clean;
          if (/^NULL$/i.test(clean)) return 'NULL';
          return opt.quote ? "'" + clean.replace(/'/g, "''") + "'" : clean;
        });
        var list = opt.wrap ? '(' + items.join(',\n ') + ')' : '(' + items.join(', ') + ')';
        var notes = ['共 ' + items.length + ' 个值'];
        if (Number(opt.limit) > 0 && items.length > Number(opt.limit)) notes.push('超过 ' + opt.limit + ' 个值，部分数据库会拒绝执行');
        return { output: list, note: notes.join('，') };
      }
    });
  }

  /* ------------------------------ 7. 行转 JSON 数组 ------------------------------ */
  function renderLinesToJson(root) {
    K.text(root, {
      uid: 'linestojson',
      inputLabel: '每行一个元素',
      inputRows: 8,
      actionLabel: '生成 JSON',
      options: [
        { id: 'type', label: '元素类型', type: 'select', value: 'string', options: [
          { value: 'string', label: '字符串' },
          { value: 'number', label: '数字' },
          { value: 'auto', label: '自动判断' }
        ] },
        { id: 'unique', label: '去重', type: 'checkbox', value: true },
        { id: 'pretty', label: '格式化输出', type: 'checkbox', value: false }
      ],
      sample: 'json-format\nbase64\ntimestamp',
      run: function (text, opt) {
        var lines = text.split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
        if (opt.unique) lines = lines.filter(function (item, index) { return lines.indexOf(item) === index; });
        var list = lines.map(function (line) {
          if (opt.type === 'number') {
            var num = Number(line);
            return isFinite(num) ? num : null;
          }
          if (opt.type === 'auto') {
            if (/^-?\d+(\.\d+)?$/.test(line)) return Number(line);
            if (/^(true|false)$/i.test(line)) return /^true$/i.test(line);
            if (/^null$/i.test(line)) return null;
          }
          return line;
        });
        var json = JSON.stringify(list, null, opt.pretty ? 2 : 0);
        return { output: json, note: '共 ' + list.length + ' 个元素' };
      }
    });
  }

  /* ------------------------------ 8. 数字序列生成 ------------------------------ */
  function renderNumberSequence(root) {
    K.form(root, {
      uid: 'numseq',
      actionLabel: '生成',
      fields: [
        { id: 'start', label: '起始值', type: 'number', value: 1, step: 1 },
        { id: 'end', label: '结束值', type: 'number', value: 20, step: 1 },
        { id: 'step', label: '步长', type: 'number', value: 1, step: 0.1 },
        { id: 'pad', label: '补零位数（0 不补）', type: 'number', value: 0, min: 0, max: 12, step: 1 },
        { id: 'sep', label: '分隔符', type: 'text', value: '\n' },
        { id: 'prefix', label: '每项前缀', type: 'text', value: '' }
      ],
      hint: '适合批量生成编号、页码、测试数据；步长可为小数，最多生成 10000 项。',
      run: function (v) {
        var start = Number(v.start);
        var end = Number(v.end);
        var step = Number(v.step);
        if (!isFinite(start) || !isFinite(end) || !isFinite(step) || step === 0) return { error: '起始值、结束值与步长必须是数字，步长不能为 0' };
        var items = [];
        var guard = 0;
        for (var value = start; step > 0 ? value <= end : value >= end; value += step) {
          items.push(value);
          guard += 1;
          if (guard > 10000) return { error: '生成项数超过 10000，请缩小范围或加大步长' };
        }
        var pad = Math.max(0, Math.round(Number(v.pad)));
        var sep = v.sep === '' ? '\n' : v.sep.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
        var out = items.map(function (num) {
          var text = String(Number(num.toFixed(10)));
          if (pad > 0) text = text.padStart(pad, '0');
          return (v.prefix || '') + text;
        }).join(sep);
        return { output: out, note: '共生成 ' + items.length + ' 项' };
      }
    });
  }

  /* ------------------------------ 9. Unicode 归一化 ------------------------------ */
  function renderUnicodeNormalize(root) {
    K.text(root, {
      uid: 'unorm',
      inputLabel: '输入文本（含组合字符、全角、变音符号）',
      actionLabel: '归一化',
      hideOutput: true,
      options: [
        { id: 'form', label: '归一化形式', type: 'select', value: 'NFC', options: [
          { value: 'NFC', label: 'NFC（组合成单字符，推荐）' },
          { value: 'NFD', label: 'NFD（拆成基础字符 + 组合符号）' },
          { value: 'NFKC', label: 'NFKC（兼容合成，全角转半角）' },
          { value: 'NFKD', label: 'NFKD（兼容分解）' }
        ] }
      ],
      hint: '中文「繁体/简体」不会被转换，归一化只处理编码层面的等价值。',
      sample: 'café\u0301　ＡＢＣ１２３ ﬁ',
      run: function (text, opt) {
        if (typeof text.normalize !== 'function') return { error: '当前环境不支持 String.prototype.normalize' };
        var result = text.normalize(opt.form);
        var before = Array.from(text).length;
        var after = Array.from(result).length;
        return {
          output: result,
          html: K.stats([
            { label: '原始码点', value: before },
            { label: '归一化后', value: after },
            { label: '差异', value: (after - before > 0 ? '+' : '') + (after - before) },
            { label: '形式', value: opt.form }
          ]),
          note: before === after ? '长度未变化，但可能存在码点替换' : '字符数发生变化，说明存在可合并 / 可分解的部分'
        };
      }
    });
  }

  /* ------------------------------ 10. 去除变音符号 ------------------------------ */
  function renderRemoveAccents(root) {
    K.text(root, {
      uid: 'noaccents',
      inputLabel: '含变音符号的文本',
      actionLabel: '去除',
      options: [
        { id: 'lower', label: '同时转小写', type: 'checkbox', value: false },
        { id: 'keepCase', label: '保留特殊字母大小写', type: 'checkbox', value: true }
      ],
      hint: '适合生成 URL slug、文件名与账号名：café → cafe，Müller → Muller。',
      sample: 'Café Müller naïve résumé Œuvre Straße',
      run: function (text, opt) {
        var special = {
          'ß': 'ss', 'æ': 'ae', 'Æ': 'AE', 'ø': 'o', 'Ø': 'O', 'œ': 'oe', 'Œ': 'OE',
          'đ': 'd', 'Đ': 'D', 'ł': 'l', 'Ł': 'L', 'þ': 'th', 'Þ': 'TH', 'ı': 'i'
        };
        var converted = Array.from(text).map(function (ch) {
          if (special[ch]) return special[ch];
          var base = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (!opt.keepCase) base = base.toLowerCase();
          return base;
        }).join('');
        if (opt.lower) converted = converted.toLowerCase();
        return { output: converted, note: '已去除组合用变音符号并展开特殊字母' };
      }
    });
  }

  /* ------------------------------ 11. 阅读时长 ------------------------------ */
  function renderReadingTime(root) {
    K.text(root, {
      uid: 'readtime',
      inputLabel: '文章正文',
      inputRows: 10,
      actionLabel: '估算',
      hideOutput: true,
      options: [
        { id: 'cjkSpeed', label: '中文阅读速度（字 / 分钟）', type: 'number', value: 300, min: 50, step: 10 },
        { id: 'enSpeed', label: '英文阅读速度（词 / 分钟）', type: 'number', value: 220, min: 50, step: 10 }
      ],
      sample: '集成工具大全提供 508 款工具。This paragraph mixes English words to demonstrate the mixed-language estimation. 所有计算均在本地完成。',
      run: function (text, opt) {
        var cjk = (text.match(/[\u3400-\u9fff]/g) || []).length;
        var latinWords = (text.match(/[A-Za-z][A-Za-z'-]*/g) || []).length;
        var cjkSpeed = Math.max(50, Number(opt.cjkSpeed));
        var enSpeed = Math.max(50, Number(opt.enSpeed));
        var minutes = cjk / cjkSpeed + latinWords / enSpeed;
        var sentences = (text.match(/[.!?。！？]+/g) || []).length;
        var paragraphs = text.split(/\n\s*\n/).filter(function (p) { return p.trim() !== ''; }).length;
        function human(m) {
          if (m < 1) return Math.max(1, Math.round(m * 60)) + ' 秒';
          return Math.floor(m) + ' 分 ' + Math.round((m - Math.floor(m)) * 60) + ' 秒';
        }
        return {
          html: K.stats([
            { label: '预计阅读', value: human(minutes) },
            { label: '汉字数', value: cjk },
            { label: '英文词数', value: latinWords },
            { label: '句子数', value: sentences },
            { label: '段落数', value: paragraphs },
            { label: '语速假设', value: cjkSpeed + ' 字 / ' + enSpeed + ' 词' }
          ]),
          note: '按中英文分别折算，未计入图表与代码块的额外停留时间'
        };
      }
    });
  }

  /* ------------------------------ 12. 按句切分 ------------------------------ */
  function renderSplitSentence(root) {
    K.text(root, {
      uid: 'splitsentence',
      inputLabel: '大段文本',
      inputRows: 9,
      actionLabel: '切分',
      options: [
        { id: 'keepPunct', label: '保留句末标点', type: 'checkbox', value: true },
        { id: 'number', label: '每句加序号', type: 'checkbox', value: false },
        { id: 'trim', label: '去掉首尾空白', type: 'checkbox', value: true }
      ],
      sample: '第一句话。第二句话！第三句问句？还有英文句子. And another one!',
      run: function (text, opt) {
        var parts = (text.match(/[^.!?。！？]+[.!?。！？]*/g) || []).filter(function (item) { return item.trim() !== ''; });
        var lines = parts.map(function (item, index) {
          var line = opt.trim ? item.trim() : item;
          if (!opt.keepPunct) line = line.replace(/[.!?。！？]+$/, '');
          return opt.number ? (index + 1) + '. ' + line : line;
        });
        return { output: lines.join('\n'), note: '共切出 ' + lines.length + ' 句' };
      }
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['text-sort-natural'] = renderSortNatural;
  window.ToolModules['text-mirror'] = renderMirrorText;
  window.ToolModules['fancy-text'] = renderFancyText;
  window.ToolModules['text-long-lines'] = renderLongLines;
  window.ToolModules['csv-quote'] = renderCsvQuote;
  window.ToolModules['lines-to-sql'] = renderLinesToSql;
  window.ToolModules['lines-to-json'] = renderLinesToJson;
  window.ToolModules['number-sequence'] = renderNumberSequence;
  window.ToolModules['unicode-normalize'] = renderUnicodeNormalize;
  window.ToolModules['text-remove-accents'] = renderRemoveAccents;
  window.ToolModules['text-reading-time'] = renderReadingTime;
  window.ToolModules['text-split-sentence'] = renderSplitSentence;
})();
