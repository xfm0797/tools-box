/* =============================================================================
 * 文本处理工具包 · 第四批（12 个）
 * -----------------------------------------------------------------------------
 * palindrome-check 回文检测
 * char-counter     字符统计概览
 * line-stats       行统计
 * line-shuffle     行乱序
 * keyword-density  关键词密度
 * readability-score 可读性评分
 * text-quote       引用包裹
 * text-chunk       按长度分块
 * invisible-chars  不可见字符清理
 * group-separator  字符分组分隔（卡号 / 编号）
 * line-diff-simple 行集合差异
 * cjk-pad          中英混排对齐
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  /* 字符显示宽度：CJK / 全角算 2，其余算 1 */
  function charWidth(code) {
    if (code >= 0x1100 && (
      code <= 0x115f ||
      code === 0x2329 || code === 0x232a ||
      (code >= 0x2e80 && code <= 0xa4cf && code !== 0x303f) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6)
    )) return 2;
    return 1;
  }

  function displayWidth(text) {
    var width = 0;
    for (var i = 0; i < text.length; i += 1) width += charWidth(text.charCodeAt(i));
    return width;
  }

  /* ------------------------------ 1. 回文检测 ------------------------------ */
  function renderPalindromeCheck(root) {
    K.text(root, {
      uid: 'palindrome',
      inputLabel: '文本（每行一条，逐行判定）',
      inputRows: 7,
      actionLabel: '检测',
      hideOutput: true,
      options: [
        { id: 'ignoreCase', label: '忽略大小写', type: 'checkbox', value: true },
        { id: 'ignorePunct', label: '忽略标点与空格', type: 'checkbox', value: true }
      ],
      sample: '上海自来水来自海上\nA man, a plan, a canal: Panama\n集成工具大全',
      run: function (text, opt) {
        function normalize(line) {
          var value = line;
          if (opt.ignoreCase) value = value.toLowerCase();
          if (opt.ignorePunct) value = value.replace(/[\s\p{P}\p{S}]/gu, '');
          return Array.from(value);
        }
        var lines = text.split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
        var rows = lines.map(function (line) {
          var chars = normalize(line);
          var reversed = chars.slice().reverse().join('');
          var forward = chars.join('');
          var ok = chars.length > 0 && forward === reversed;
          return [ok ? '✓ 是' : '✗ 否', line, chars.length, forward.slice(0, 24) + (forward.length > 24 ? '…' : '')];
        });
        return {
          html: K.table(['结论', '原文', '有效字符', '归一化后'], rows),
          note: '共 ' + lines.length + ' 行，其中 ' + rows.filter(function (row) { return row[0].indexOf('✓') === 0; }).length + ' 条是回文'
        };
      }
    });
  }

  /* ------------------------------ 2. 字符统计 ------------------------------ */
  function renderCharCounter(root) {
    K.text(root, {
      uid: 'charcnt',
      inputLabel: '待统计文本',
      inputRows: 8,
      actionLabel: '统计',
      options: [
        { id: 'ignoreSpace', label: '忽略空白字符', type: 'checkbox', value: false },
        { id: 'ignoreCase', label: '忽略大小写', type: 'checkbox', value: false }
      ],
      sample: 'Hello 世界！集成工具大全 308 款工具。',
      run: function (text, opt) {
        var raw = text;
        var body = opt.ignoreSpace ? raw.replace(/\s/g, '') : raw;
        var work = opt.ignoreCase ? body.toLowerCase() : body;
        var chars = Array.from(body);
        var cjk = chars.filter(function (ch) { return /[\u3400-\u9fff\uf900-\ufaff]/.test(ch); }).length;
        var latin = chars.filter(function (ch) { return /[A-Za-z]/.test(ch); }).length;
        var digits = chars.filter(function (ch) { return /[0-9]/.test(ch); }).length;
        var punct = chars.filter(function (ch) { return /[\p{P}\p{S}]/u.test(ch); }).length;
        var spaces = (raw.match(/\s/g) || []).length;
        var lines = raw === '' ? 0 : raw.split(/\r?\n/).length;
        var words = body.trim() === '' ? 0 : body.trim().split(/\s+/).length;
        var sentences = (raw.match(/[.!?。！？]+/g) || []).length;

        var freq = {};
        Array.from(work).forEach(function (ch) {
          if (/\s/.test(ch)) return;
          freq[ch] = (freq[ch] || 0) + 1;
        });
        var top = Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a]; }).slice(0, 12);
        var table = K.table(['字符', '次数'], top.map(function (ch) {
          return [ch === ' ' ? '（空格）' : ch, freq[ch]];
        }));

        return {
          output: String(chars.length),
          html: K.stats([
            { label: '字符数', value: chars.length },
            { label: '不含空白', value: Array.from(body.replace(/\s/g, '')).length },
            { label: '字节 UTF-8', value: new TextEncoder().encode(raw).length },
            { label: '词数', value: words },
            { label: '行数', value: lines },
            { label: '句数', value: sentences }
          ]) + K.stats([
            { label: '汉字', value: cjk },
            { label: '字母', value: latin },
            { label: '数字', value: digits },
            { label: '标点符号', value: punct },
            { label: '空白字符', value: spaces }
          ]) + '<h4 class="sub-title">高频字符 Top 12</h4>' + table,
          note: '以上统计基于当前输入，实时反映在页面上'
        };
      }
    });
  }

  /* ------------------------------ 3. 行统计 ------------------------------ */
  function renderLineStats(root) {
    K.text(root, {
      uid: 'linestats',
      inputLabel: '多行文本',
      inputRows: 9,
      actionLabel: '分析',
      options: [
        { id: 'noEmpty', label: '排除空行', type: 'checkbox', value: true },
        { id: 'noBlank', label: '排除纯空白行', type: 'checkbox', value: true }
      ],
      sample: '第一行内容\n\n第二行稍长一些的内容\n   \n最后一行',
      run: function (text, opt) {
        var lines = text.split(/\r?\n/);
        if (opt.noBlank) lines = lines.filter(function (line) { return line.trim() !== ''; });
        if (opt.noEmpty) lines = lines.filter(function (line) { return line !== ''; });
        if (!lines.length) return { error: '没有可统计的有效行' };

        var lengths = lines.map(function (line) { return Array.from(line).length; });
        var total = lengths.reduce(function (sum, n) { return sum + n; }, 0);
        var max = Math.max.apply(null, lengths);
        var min = Math.min.apply(null, lengths);
        var maxIndex = lengths.indexOf(max) + 1;
        var sorted = lengths.slice().sort(function (a, b) { return a - b; });
        var median = sorted.length % 2
          ? sorted[(sorted.length - 1) / 2]
          : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;

        var distribution = {};
        lengths.forEach(function (n) {
          var bucket = n <= 10 ? '1–10' : n <= 20 ? '11–20' : n <= 40 ? '21–40' : n <= 80 ? '41–80' : '80+';
          distribution[bucket] = (distribution[bucket] || 0) + 1;
        });

        return {
          html: K.stats([
            { label: '行数', value: lines.length },
            { label: '总字符', value: total },
            { label: '平均行长', value: K.num(total / lines.length, 1) },
            { label: '最长行', value: max + '（第 ' + maxIndex + ' 行）' },
            { label: '最短行', value: min },
            { label: '行长中位数', value: median }
          ]) + '<h4 class="sub-title">行长分布</h4>' + K.table(['字符区间', '行数'], Object.keys(distribution).map(function (key) {
            return [key, distribution[key]];
          })),
          note: '按 Unicode 码点计长度，emoji 计 1'
        };
      }
    });
  }

  /* ------------------------------ 4. 行乱序 ------------------------------ */
  function renderLineShuffle(root) {
    K.text(root, {
      uid: 'lineshuf',
      inputLabel: '多行文本',
      inputRows: 9,
      actionLabel: '打乱',
      options: [
        { id: 'noBlank', label: '忽略空行', type: 'checkbox', value: true },
        { id: 'number', label: '输出带序号', type: 'checkbox', value: false }
      ],
      sample: '苹果\n香蕉\n橙子\n葡萄\n西瓜\n芒果',
      run: function (text, opt) {
        var lines = text.split(/\r?\n/);
        if (opt.noBlank) lines = lines.filter(function (line) { return line.trim() !== ''; });
        K.shuffle(lines);
        var out = lines.map(function (line, index) {
          return opt.number ? (index + 1) + '. ' + line : line;
        }).join('\n');
        return { output: out, note: '使用系统安全随机源洗牌，共 ' + lines.length + ' 行' };
      }
    });
  }

  /* ------------------------------ 5. 关键词密度 ------------------------------ */
  function renderKeywordDensity(root) {
    K.text(root, {
      uid: 'keyworddensity',
      inputLabel: '待分析文章',
      inputRows: 9,
      actionLabel: '分析',
      hideOutput: true,
      options: [
        { id: 'top', label: '显示前 N 个关键词', type: 'number', value: 15, min: 5, max: 100, step: 1 },
        { id: 'stop', label: '过滤常见虚词', type: 'checkbox', value: true }
      ],
      sample: '工具箱的价值在于把常用的小功能集中起来。工具箱应当轻量，工具箱应当离线可用，好用的工具箱不需要注册。',
      run: function (text, opt) {
        var stopWords = ['的', '了', '和', '是', '在', '我', '有', '不', '这', '也', '就', '都', '而', '及', '与', '或', '等', '被', '把', '对', '为', 'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'is', 'it', 'for', 'on', 'with', 'as', 'at', 'by', 'be'];
        var counts = {};
        var total = 0;

        // 英文按单词，中文按相邻二字组（bigram）统计，更接近关键词直觉
        var latin = text.toLowerCase().match(/[a-z][a-z'-]+/g) || [];
        latin.forEach(function (word) {
          if (opt.stop && stopWords.indexOf(word) >= 0) return;
          if (word.length < 2) return;
          counts[word] = (counts[word] || 0) + 1;
          total += 1;
        });

        var cjkRuns = text.match(/[\u3400-\u9fff]+/g) || [];
        cjkRuns.forEach(function (run) {
          var chars = Array.from(run);
          for (var i = 0; i < chars.length - 1; i += 1) {
            var gram = chars[i] + chars[i + 1];
            if (opt.stop && (stopWords.indexOf(chars[i]) >= 0 || stopWords.indexOf(chars[i + 1]) >= 0)) continue;
            counts[gram] = (counts[gram] || 0) + 1;
            total += 1;
          }
        });

        var keys = Object.keys(counts);
        if (!keys.length) return { error: '没有提取到可用词汇，内容可能太短' };
        keys.sort(function (a, b) { return counts[b] - counts[a]; });
        var limit = Math.max(5, Math.min(100, Math.round(Number(opt.top))));
        var rows = keys.slice(0, limit).map(function (key) {
          return [key, counts[key], K.num(counts[key] / total * 100, 2) + '%'];
        });
        return {
          html: K.table(['关键词', '出现次数', '密度'], rows),
          note: '共 ' + keys.length + ' 个候选词，中文按二字组切分，密度基于' + total + ' 个词次'
        };
      }
    });
  }

  /* ------------------------------ 6. 可读性评分 ------------------------------ */
  function renderReadability(root) {
    K.text(root, {
      uid: 'readability',
      inputLabel: '待评估文本',
      inputRows: 9,
      actionLabel: '评估',
      hideOutput: true,
      sample: 'This tool checks how easy a text is to read. Short sentences and common words score better. It works offline and never uploads your content.',
      run: function (text) {
        var sentences = (text.match(/[.!?。！？]+/g) || []).length || 1;
        var words = text.trim().split(/\s+/).filter(Boolean);
        var cjkChars = (text.match(/[\u3400-\u9fff]/g) || []).length;
        var latinWords = words.filter(function (word) { return /[a-zA-Z]/.test(word); });

        function syllables(word) {
          var value = word.toLowerCase().replace(/[^a-z]/g, '');
          if (!value) return 0;
          var groups = value.match(/[aeiouy]+/g);
          var count = groups ? groups.length : 0;
          if (/e$/.test(value) && count > 1) count -= 1;
          return Math.max(1, count);
        }

        var totalSyllables = latinWords.reduce(function (sum, word) { return sum + syllables(word); }, 0);
        var avgWords = latinWords.length / sentences;
        var avgSyllables = latinWords.length ? totalSyllables / latinWords.length : 0;
        var flesch = 206.835 - 1.015 * avgWords - 84.6 * avgSyllables;
        var level = flesch >= 80 ? '很容易（小学水平）' : flesch >= 60 ? '较容易（初中水平）' : flesch >= 40 ? '偏难（高中以上）' : flesch >= 20 ? '难（专业读者）' : '很难（学术 / 法律文本）';

        var cjkSentences = (text.match(/[。！？]/g) || []).length || 1;
        return {
          html: K.stats([
            { label: 'Flesch 分值', value: K.num(flesch, 1) },
            { label: '难度等级', value: level },
            { label: '句子数', value: sentences },
            { label: '英文词数', value: latinWords.length },
            { label: '平均句长', value: K.num(avgWords, 1) + ' 词' },
            { label: '平均音节', value: K.num(avgSyllables, 2) }
          ]) + K.table(['指标', '数值'], [
            ['中文汉字数', cjkChars],
            ['中文句子数', cjkSentences],
            ['中文平均句长', K.num(cjkChars / cjkSentences, 1) + ' 字'],
            ['总字符数', text.length]
          ]),
          note: 'Flesch 公式针对英文设计，中文部分仅作句长参考'
        };
      }
    });
  }

  /* ------------------------------ 7. 引用包裹 ------------------------------ */
  function renderTextQuote(root) {
    K.text(root, {
      uid: 'txtquote',
      inputLabel: '原始文本',
      inputRows: 9,
      actionLabel: '生成引用',
      options: [
        { id: 'prefix', label: '引用前缀', type: 'text', value: '> ' },
        { id: 'blank', label: '空行也加前缀', type: 'checkbox', value: true },
        { id: 'trim', label: '去掉每行首尾空白', type: 'checkbox', value: false }
      ],
      sample: '引用第一句\n引用第二句\n\n引用第三句',
      run: function (text, opt) {
        var prefix = opt.prefix;
        var lines = text.split(/\r?\n/);
        var out = lines.map(function (line) {
          var body = opt.trim ? line.trim() : line;
          if (!opt.blank && body === '') return '';
          return prefix + body;
        }).join('\n');
        return { output: out, note: '适合 Markdown / 邮件引用块' };
      }
    });
  }

  /* ------------------------------ 8. 按长度分块 ------------------------------ */
  function renderTextChunk(root) {
    K.text(root, {
      uid: 'txtchunk',
      inputLabel: '长文本',
      inputRows: 9,
      actionLabel: '分块',
      options: [
        { id: 'size', label: '每块字符数', type: 'number', value: 120, min: 1, step: 1 },
        { id: 'by', label: '切分依据', type: 'select', value: 'char', options: [
          { value: 'char', label: '按字符（严格长度）' },
          { value: 'word', label: '按单词（尽量不截断单词）' }
        ] },
        { id: 'join', label: '块间分隔', type: 'select', value: 'blank', options: [
          { value: 'blank', label: '空行' },
          { value: 'dash', label: '--- 分隔线' },
          { value: 'none', label: '直接相连' }
        ] }
      ],
      sample: '集成工具大全是一个纯前端工具箱，所有计算都在浏览器本地完成，输入内容不会上传到任何服务器，关闭标签页即释放内存。',
      run: function (text, opt) {
        var size = Math.max(1, Math.floor(Number(opt.size) || 0));
        var chunks = [];
        if (opt.by === 'word') {
          var words = text.split(/(\s+)/);
          var current = '';
          words.forEach(function (part) {
            if (Array.from(current + part).length > size && current.trim() !== '') {
              chunks.push(current.trim());
              current = part.replace(/^\s+/, '');
            } else {
              current += part;
            }
          });
          if (current.trim() !== '') chunks.push(current.trim());
        } else {
          var chars = Array.from(text);
          for (var i = 0; i < chars.length; i += size) chunks.push(chars.slice(i, i + size).join(''));
        }
        var sep = opt.join === 'blank' ? '\n\n' : opt.join === 'dash' ? '\n\n---\n\n' : '';
        return {
          output: chunks.join(sep),
          note: '共切成 ' + chunks.length + ' 块，每块上限 ' + size + ' 字符'
        };
      }
    });
  }

  /* ------------------------------ 9. 不可见字符清理 ------------------------------ */
  function renderInvisibleChars(root) {
    K.text(root, {
      uid: 'invisible',
      inputLabel: '粘贴文本（从网页 / PDF 复制的内容常见问题）',
      inputRows: 9,
      actionLabel: '检测并清理',
      outputLabel: '清理后的文本',
      sample: '这是一段\u200b包含零宽空格的文本\ufeff，还有\u00a0不间断空格与\u3000全角空格。',
      run: function (text) {
        var labels = {
          '\u200b': '零宽空格 U+200B',
          '\u200c': '零宽非连接符 U+200C',
          '\u200d': '零宽连接符 U+200D',
          '\u2060': '词连接符 U+2060',
          '\ufeff': 'BOM / 零宽不换行空格 U+FEFF',
          '\u00a0': '不间断空格 U+00A0',
          '\u3000': '全角空格 U+3000',
          '\u2007': '数字空格 U+2007',
          '\u2009': '窄空格 U+2009',
          '\u2028': '行分隔符 U+2028',
          '\u2029': '段分隔符 U+2029',
          '\u202a': '从左到右嵌入 U+202A',
          '\u202c': '方向格式化终止 U+202C',
          '\u202d': '从右到左嵌入 U+202D',
          '\t': '制表符 \\t'
        };
        var found = {};
        var cleaned = Array.from(text).map(function (ch) {
          if (labels[ch]) {
            found[ch] = (found[ch] || 0) + 1;
            if (ch === '\t') return ch;
            if (ch === '\u3000' || ch === '\u00a0') return ' ';
            return '';
          }
          return ch;
        }).join('');

        var keys = Object.keys(found);
        if (!keys.length) {
          return { output: cleaned, note: '未发现常见的零宽字符或异常空格' };
        }
        // 统一空格并保留换行
        cleaned = cleaned.replace(/[ \t]+\n/g, '\n').replace(/ {2,}/g, ' ');
        var rows = keys.map(function (key) { return [labels[key], found[key]]; });
        return {
          output: cleaned,
          html: K.table(['字符', '出现次数'], rows),
          note: '共发现 ' + keys.length + ' 类异常字符，已从输出中清除或替换为普通空格'
        };
      }
    });
  }

  /* ------------------------------ 10. 字符分组分隔 ------------------------------ */
  function renderGroupSeparator(root) {
    K.text(root, {
      uid: 'groupsep',
      inputLabel: '待分组内容（每行一条）',
      inputRows: 6,
      actionLabel: '分组',
      options: [
        { id: 'size', label: '每组字符数', type: 'number', value: 4, min: 1, max: 32, step: 1 },
        { id: 'sep', label: '分隔符', type: 'text', value: ' ' },
        { id: 'from', label: '分组方向', type: 'select', value: 'left', options: [
          { value: 'left', label: '从左往右（编号、券码）' },
          { value: 'right', label: '从右往左（银行卡号习惯）' }
        ] },
        { id: 'clean', label: '先去掉非字母数字字符', type: 'checkbox', value: true }
      ],
      hint: '银行卡号、快递单号、IMEI 常按 4 位分组，从右分组能让末组保持完整。',
      sample: '6222020200112345678\nSF1234567890123',
      run: function (text, opt) {
        var size = Math.max(1, Math.min(32, Math.round(Number(opt.size))));
        var sep = opt.sep === '' ? ' ' : opt.sep;
        var lines = text.split(/\r?\n/).filter(function (line) { return line.trim() !== ''; });
        var results = lines.map(function (line) {
          var value = line.trim();
          if (opt.clean) value = value.replace(/[^0-9A-Za-z\u4e00-\u9fff]/g, '');
          if (opt.from === 'right') {
            var parts = [];
            for (var end = value.length; end > 0; end -= size) {
              parts.unshift(value.slice(Math.max(0, end - size), end));
            }
            return parts.join(sep);
          }
          return value.match(new RegExp('.{1,' + size + '}', 'g')).join(sep);
        });
        return { output: results.join('\n'), note: '共处理 ' + lines.length + ' 行，每 ' + size + ' 位一组' };
      }
    });
  }

  /* ------------------------------ 11. 行集合差异 ------------------------------ */
  function renderLineDiffSimple(root) {
    K.text(root, {
      uid: 'linediff',
      inputLabel: '文本 A（基准）',
      inputRows: 8,
      actionLabel: '比较',
      options: [
        { id: 'other', label: '文本 B（对照）', type: 'textarea', rows: 8, wide: true, value: '' },
        { id: 'trim', label: '忽略行首尾空白', type: 'checkbox', value: true },
        { id: 'ignoreCase', label: '忽略大小写', type: 'checkbox', value: false }
      ],
      sample: 'alpha\nbeta\ngamma',
      run: function (text, opt) {
        function norm(line) {
          var value = opt.trim ? line.trim() : line;
          return opt.ignoreCase ? value.toLowerCase() : value;
        }
        var a = text.split(/\r?\n/).map(norm).filter(function (line, i, arr) { return line !== '' || arr.length === 1; });
        var b = String(opt.other || '').split(/\r?\n/).map(norm);
        if (b.length === 1 && b[0] === '') b = [];

        var onlyA = a.filter(function (line) { return b.indexOf(line) < 0; });
        var onlyB = b.filter(function (line) { return a.indexOf(line) < 0; });
        var common = a.filter(function (line) { return b.indexOf(line) >= 0; });

        return {
          output: '仅在 A：\n' + (onlyA.join('\n') || '（无）') + '\n\n仅在 B：\n' + (onlyB.join('\n') || '（无）'),
          html: K.stats([
            { label: '仅在 A', value: onlyA.length },
            { label: '仅在 B', value: onlyB.length },
            { label: '共有', value: common.length }
          ]),
          note: '按行集合比较，不做顺序比对（顺序差异请用「文本对比」工具）'
        };
      }
    });
  }

  /* ------------------------------ 12. 中英混排对齐 ------------------------------ */
  function renderCjkPad(root) {
    K.text(root, {
      uid: 'cjkpad',
      inputLabel: '多行文本',
      inputRows: 9,
      actionLabel: '对齐',
      options: [
        { id: 'width', label: '目标显示宽度（半角单位）', type: 'number', value: 20, min: 1, step: 1 },
        { id: 'fill', label: '填充字符', type: 'text', value: ' ' },
        { id: 'align', label: '对齐方向', type: 'select', value: 'right', options: [
          { value: 'right', label: '右填充（左对齐）' },
          { value: 'left', label: '左填充（右对齐）' }
        ] }
      ],
      sample: '名称\nJSON\nBase64\n时间戳转换',
      run: function (text, opt) {
        var target = Math.max(1, Math.floor(Number(opt.width) || 0));
        var fill = opt.fill === '' ? ' ' : opt.fill;
        var out = text.split(/\r?\n/).map(function (line) {
          var width = displayWidth(line);
          if (width >= target) return line;
          var padCount = Math.ceil((target - width) / displayWidth(fill || ' '));
          var pad = new Array(padCount + 1).join(fill);
          return opt.align === 'right' ? line + pad : pad + line;
        }).join('\n');
        return {
          output: out,
          note: '汉字与全角符号按 2 个半角宽度计算，' + target + ' 宽对齐'
        };
      }
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['palindrome-check'] = renderPalindromeCheck;
  window.ToolModules['char-counter'] = renderCharCounter;
  window.ToolModules['line-stats'] = renderLineStats;
  window.ToolModules['line-shuffle'] = renderLineShuffle;
  window.ToolModules['keyword-density'] = renderKeywordDensity;
  window.ToolModules['readability-score'] = renderReadability;
  window.ToolModules['text-quote'] = renderTextQuote;
  window.ToolModules['text-chunk'] = renderTextChunk;
  window.ToolModules['invisible-chars'] = renderInvisibleChars;
  window.ToolModules['group-separator'] = renderGroupSeparator;
  window.ToolModules['line-diff-simple'] = renderLineDiffSimple;
  window.ToolModules['cjk-pad'] = renderCjkPad;
})();
