/* =============================================================================
 * 文本处理工具包 · 第二批（15 个）
 * -----------------------------------------------------------------------------
 * text-reverse   文本反转（整段 / 每行 / 行序 / 词序）
 * text-pad       按显示宽度对齐填充
 * text-wrap      按宽度折行（中英混排）
 * text-indent    批量增加 / 移除缩进
 * text-prefix    批量添加前后缀与行号
 * text-merge     多行合并为一段
 * text-columns   分隔文本转对齐列
 * text-similarity 编辑距离与相似度
 * text-replace   批量查找替换（支持正则）
 * text-sort-multi 按指定列排序
 * text-frequency 词频 / 字频统计
 * text-clean     一键清洗文本
 * text-censor    敏感词打码
 * text-repeat    文本重复拼接
 * text-newline   换行符检测与转换
 *
 * 全部本地计算，不上传任何内容。
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  /* 计算字符串的显示宽度：CJK 全角字符按 2 列计 */
  function dispWidth(text) {
    var width = 0;
    var chars = Array.from(text);
    for (var i = 0; i < chars.length; i += 1) {
      var code = chars[i].codePointAt(0);
      // 常见全角 / 宽字符区间
      var wide = (code >= 0x1100 && code <= 0x115f) ||
        (code >= 0x2e80 && code <= 0xa4cf && code !== 0x303f) ||
        (code >= 0xac00 && code <= 0xd7a3) ||
        (code >= 0xf900 && code <= 0xfaff) ||
        (code >= 0xfe30 && code <= 0xfe6f) ||
        (code >= 0xff00 && code <= 0xff60) ||
        (code >= 0xffe0 && code <= 0xffe6) ||
        (code >= 0x1f300 && code <= 0x1f9ff) ||
        (code >= 0x20000 && code <= 0x3fffd);
      width += wide ? 2 : 1;
    }
    return width;
  }

  /* 按显示宽度截断（用于对齐填充前的兜底） */
  function padTo(text, width, fill) {
    var need = width - dispWidth(text);
    if (need <= 0) return text;
    var unit = fill || ' ';
    var repeat = Math.ceil(need / Math.max(1, dispWidth(unit)));
    return text + new Array(repeat + 1).join(unit).slice(0, need);
  }

  function replaceEscapes(text) {
    return text.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r');
  }

  /* ------------------------------ 1. 文本反转 ------------------------------ */
  function renderReverse(root) {
    K.text(root, {
      uid: 'rev',
      inputLabel: '原文',
      outputLabel: '反转结果',
      inputRows: 8,
      options: [{
        id: 'mode', label: '反转方式', type: 'select', value: 'char',
        options: [
          { value: 'char', label: '整段字符倒序' },
          { value: 'line-char', label: '每行内部倒序' },
          { value: 'line-order', label: '行顺序倒置' },
          { value: 'word', label: '每行词序倒置' }
        ]
      }],
      sample: 'Hello 世界\n第二行文本\nThird line',
      run: function (text, opt) {
        if (opt.mode === 'char') {
          return { output: Array.from(text).reverse().join(''), note: '已倒序 ' + Array.from(text).length + ' 个字符' };
        }
        var lines = text.split('\n');
        if (opt.mode === 'line-char') {
          return {
            output: lines.map(function (line) { return Array.from(line).reverse().join(''); }).join('\n'),
            note: '共处理 ' + lines.length + ' 行'
          };
        }
        if (opt.mode === 'line-order') {
          return { output: lines.slice().reverse().join('\n'), note: '共倒置 ' + lines.length + ' 行' };
        }
        return {
          output: lines.map(function (line) {
            var parts = line.split(/\s+/).filter(Boolean);
            return parts.reverse().join(' ');
          }).join('\n'),
          note: '按空白分词后倒置词序'
        };
      }
    });
  }

  /* ------------------------------ 2. 对齐填充 ------------------------------ */
  function renderPad(root) {
    K.text(root, {
      uid: 'pad',
      inputLabel: '待对齐的文本（每行一条）',
      outputLabel: '对齐结果',
      actionLabel: '对齐',
      inputRows: 8,
      options: [
        { id: 'width', label: '目标宽度', type: 'number', value: 24, min: 1, max: 200 },
        { id: 'align', label: '对齐方式', type: 'select', value: 'left',
          options: [{ value: 'left', label: '左对齐' }, { value: 'right', label: '右对齐' }, { value: 'center', label: '居中' }] },
        { id: 'fill', label: '填充字符', type: 'select', value: ' ',
          options: [{ value: ' ', label: '空格' }, { value: '0', label: '0' }, { value: '-', label: '短横线' }, { value: '.', label: '点' }, { value: '　', label: '全角空格' }] },
        { id: 'cjk', label: '中文算 2 列', type: 'checkbox', value: true }
      ],
      hint: '按显示宽度对齐后，可直接粘进代码注释或等宽字体环境。',
      sample: '姓名\n产品经理\nQA\n前端工程师',
      run: function (text, opt) {
        var target = Math.max(1, Number(opt.width) || 0);
        if (!target) return { error: '请填写有效的目标宽度' };
        var lines = text.split('\n');
        var measure = opt.cjk ? dispWidth : function (s) { return Array.from(s).length; };
        var out = lines.map(function (line) {
          var need = target - measure(line);
          if (need <= 0) return line;
          var unitWidth = opt.cjk ? dispWidth(opt.fill) : 1;
          var units = Math.ceil(need / Math.max(1, unitWidth));
          var pad = new Array(units + 1).join(opt.fill);
          if (opt.align === 'right') return pad + line;
          if (opt.align === 'center') {
            var leftCount = Math.floor(units / 2);
            var rightCount = units - leftCount;
            return new Array(leftCount + 1).join(opt.fill) + line + new Array(rightCount + 1).join(opt.fill);
          }
          return line + pad;
        }).join('\n');
        return { output: out, note: '已按 ' + target + ' 列宽对齐 ' + lines.length + ' 行' };
      }
    });
  }

  /* ------------------------------ 3. 文本折行 ------------------------------ */
  function renderWrap(root) {
    K.text(root, {
      uid: 'wrap',
      inputLabel: '原文',
      outputLabel: '折行结果',
      actionLabel: '折行',
      inputRows: 7,
      options: [
        { id: 'width', label: '每行最大宽度', type: 'number', value: 40, min: 5, max: 200 },
        { id: 'unit', label: '断行单位', type: 'select', value: 'char',
          options: [{ value: 'char', label: '按字符（适合中文）' }, { value: 'word', label: '按单词（适合英文）' }] },
        { id: 'keepBlank', label: '保留空行', type: 'checkbox', value: true }
      ],
      sample: '这是一段用来演示自动折行的中文文本，它会按照设定的宽度在合适的位置换行，方便粘贴到邮件或文档里。\nThe quick brown fox jumps over the lazy dog and keeps running across the field.',
      run: function (text, opt) {
        var width = Math.max(5, Number(opt.width) || 40);
        var out = [];
        text.split('\n').forEach(function (line) {
          if (!line.trim()) {
            if (opt.keepBlank) out.push('');
            return;
          }
          if (opt.unit === 'word') {
            var words = line.split(/\s+/);
            var current = '';
            words.forEach(function (word) {
              var next = current ? current + ' ' + word : word;
              if (dispWidth(next) > width && current) { out.push(current); current = word; }
              else current = next;
            });
            if (current) out.push(current);
            return;
          }
          var buf = '';
          var widthSoFar = 0;
          Array.from(line).forEach(function (ch) {
            var w = dispWidth(ch);
            if (widthSoFar + w > width && buf) { out.push(buf); buf = ''; widthSoFar = 0; }
            buf += ch;
            widthSoFar += w;
          });
          if (buf) out.push(buf);
        });
        return { output: out.join('\n'), note: '折行后共 ' + out.length + ' 行' };
      }
    });
  }

  /* ------------------------------ 4. 缩进处理 ------------------------------ */
  function renderIndent(root) {
    K.text(root, {
      uid: 'indent',
      inputLabel: '原文',
      outputLabel: '结果',
      inputRows: 8,
      options: [
        { id: 'mode', label: '操作', type: 'select', value: 'add',
          options: [{ value: 'add', label: '增加缩进' }, { value: 'remove', label: '移除缩进' }] },
        { id: 'unit', label: '缩进单位', type: 'select', value: '2',
          options: [{ value: '2', label: '2 空格' }, { value: '4', label: '4 空格' }, { value: 'tab', label: 'Tab' }, { value: '　　', label: '2 全角空格' }] },
        { id: 'skipEmpty', label: '跳过空行', type: 'checkbox', value: true }
      ],
      sample: '第一段\n第二段\n  已经缩进的一行',
      run: function (text, opt) {
        var unit = opt.unit === 'tab' ? '\t' : opt.unit === '　　' ? '　　' : new Array(Number(opt.unit) + 1).join(' ');
        var lines = text.split('\n').map(function (line) {
          if (!line.length && opt.skipEmpty) return line;
          if (opt.mode === 'add') return unit + line;
          return line.replace(/^[ \t\u3000]+/, '');
        });
        return { output: lines.join('\n'), note: '已' + (opt.mode === 'add' ? '增加' : '移除') + '缩进，共 ' + lines.length + ' 行' };
      }
    });
  }

  /* ------------------------------ 5. 前后缀与编号 ------------------------------ */
  function renderPrefix(root) {
    K.text(root, {
      uid: 'prefix',
      inputLabel: '原文（每行一条）',
      outputLabel: '结果',
      inputRows: 8,
      options: [
        { id: 'prefix', label: '行首添加', type: 'text', placeholder: '如 - ', mono: false },
        { id: 'suffix', label: '行尾添加', type: 'text', placeholder: '如 ;', mono: false },
        { id: 'start', label: '起始序号（留空不编号）', type: 'number', placeholder: '如 1', min: 0 },
        { id: 'skipEmpty', label: '跳过空行', type: 'checkbox', value: true }
      ],
      sample: '苹果\n香蕉\n橙子',
      run: function (text, opt) {
        var n = opt.start === '' ? null : Number(opt.start);
        if (n !== null && !isFinite(n)) return { error: '起始序号需要是数字' };
        var idx = 0;
        var out = text.split('\n').map(function (line) {
          if (!line.length && opt.skipEmpty) return line;
          idx += 1;
          var serial = n === null ? '' : (n + idx - 1) + '. ';
          return (opt.prefix || '') + serial + line + (opt.suffix || '');
        }).join('\n');
        return { output: out, note: n === null ? '已添加前后缀' : '已编号并添加前后缀，共 ' + idx + ' 行' };
      }
    });
  }

  /* ------------------------------ 6. 多行合并 ------------------------------ */
  function renderMerge(root) {
    K.text(root, {
      uid: 'merge',
      inputLabel: '多行文本',
      outputLabel: '合并结果',
      actionLabel: '合并',
      inputRows: 8,
      options: [
        { id: 'sep', label: '连接符', type: 'select', value: 'space',
          options: [{ value: 'space', label: '空格' }, { value: 'comma', label: ', ' }, { value: 'none', label: '无' }, { value: 'break', label: '换行（等同不合并）' }] },
        { id: 'custom', label: '自定义连接符', type: 'text', placeholder: '如 | ', mono: false },
        { id: 'trim', label: '去除每行首尾空白', type: 'checkbox', value: true },
        { id: 'dropEmpty', label: '丢弃空行', type: 'checkbox', value: true }
      ],
      sample: '第一行内容\n第二行内容\n\n第三行内容',
      run: function (text, opt) {
        var sepMap = { space: ' ', comma: ', ', none: '', break: '\n' };
        var sep = opt.custom ? replaceEscapes(opt.custom) : sepMap[opt.sep];
        var lines = text.split('\n');
        if (opt.trim) lines = lines.map(function (l) { return l.trim(); });
        if (opt.dropEmpty) lines = lines.filter(function (l) { return l.length > 0; });
        return { output: lines.join(sep), note: '已合并 ' + lines.length + ' 行为一段' };
      }
    });
  }

  /* ------------------------------ 7. 文本转对齐列 ------------------------------ */
  function renderColumns(root) {
    K.text(root, {
      uid: 'cols',
      inputLabel: '每行一条记录（列之间用分隔符隔开）',
      outputLabel: '对齐结果',
      actionLabel: '对齐',
      inputRows: 9,
      options: [
        { id: 'delim', label: '分隔符', type: 'select', value: 'auto',
          options: [{ value: 'auto', label: '自动识别' }, { value: '\t', label: '制表符' }, { value: ',', label: '逗号' }, { value: '|', label: '竖线' }, { value: ' ', label: '空格' }] },
        { id: 'gap', label: '列间距', type: 'number', value: 2, min: 1, max: 10 }
      ],
      hint: '输出为等宽文本表格，可直接粘贴到命令行输出、代码注释或纯文本报告。',
      sample: '名称,数量,单价\n苹果,12,5.5\n进口车厘子,3,89',
      run: function (text, opt) {
        var rows = text.split('\n').filter(function (l) { return l.trim().length; });
        if (!rows.length) return { error: '请输入至少一行内容' };
        var delim = opt.delim;
        if (delim === 'auto') {
          var candidates = ['\t', ',', '|', /\s{2,}/];
          for (var i = 0; i < candidates.length; i += 1) {
            if (rows[0].split(candidates[i]).length > 1) { delim = candidates[i]; break; }
          }
          if (delim === 'auto') delim = ',';
        }
        var cells = rows.map(function (line) { return line.split(delim).map(function (c) { return c.trim(); }); });
        var colCount = cells.reduce(function (max, row) { return Math.max(max, row.length); }, 0);
        var widths = [];
        for (var c = 0; c < colCount; c += 1) {
          widths[c] = cells.reduce(function (max, row) { return Math.max(max, dispWidth(row[c] || '')); }, 0);
        }
        var gap = new Array((Number(opt.gap) || 2) + 1).join(' ');
        var out = cells.map(function (row) {
          var line = '';
          for (var i2 = 0; i2 < colCount; i2 += 1) {
            var cell = row[i2] || '';
            line += padTo(cell, widths[i2], ' ') + (i2 === colCount - 1 ? '' : gap);
          }
          return line.replace(/\s+$/, '');
        }).join('\n');
        return { output: out, note: rows.length + ' 行 × ' + colCount + ' 列' };
      }
    });
  }

  /* ------------------------------ 8. 文本相似度 ------------------------------ */
  function levenshtein(a, b) {
    var s = Array.from(a);
    var t = Array.from(b);
    if (s.length > t.length) { var tmp = s; s = t; t = tmp; }
    var prev = new Array(s.length + 1);
    var curr = new Array(s.length + 1);
    for (var i = 0; i <= s.length; i += 1) prev[i] = i;
    for (var j = 1; j <= t.length; j += 1) {
      curr[0] = j;
      for (var k = 1; k <= s.length; k += 1) {
        var cost = s[k - 1] === t[j - 1] ? 0 : 1;
        curr[k] = Math.min(curr[k - 1] + 1, prev[k] + 1, prev[k - 1] + cost);
      }
      var swap = prev; prev = curr; curr = swap;
    }
    return prev[s.length];
  }

  function renderSimilarity(root) {
    var uid = 'sim';
    root.innerHTML =
      '<div class="form-row">' +
        '<div class="form-item" style="flex:1 1 100%"><label class="label" for="' + uid + '-a">文本 A</label>' +
          '<textarea class="textarea mono" id="' + uid + '-a" rows="6" spellcheck="false" placeholder="粘贴第一段文本"></textarea></div>' +
        '<div class="form-item" style="flex:1 1 100%"><label class="label" for="' + uid + '-b">文本 B</label>' +
          '<textarea class="textarea mono" id="' + uid + '-b" rows="6" spellcheck="false" placeholder="粘贴第二段文本"></textarea></div>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="' + uid + '-run">计算相似度</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-sample">示例</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-clear">清空</button>' +
      '</div>' +
      '<div id="' + uid + '-out"></div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      '<p class="hint">编辑距离按 Unicode 字符计算（一个汉字算 1）；超过 5000 字符会自动截断，避免页面卡顿。</p>';

    var a = root.querySelector('#' + uid + '-a');
    var b = root.querySelector('#' + uid + '-b');
    var out = root.querySelector('#' + uid + '-out');
    var statusEl = root.querySelector('#' + uid + '-status');

    function run() {
      var left = a.value;
      var right = b.value;
      if (!left.length && !right.length) {
        window.UI.toast('请先输入两段文本', 'warn');
        a.focus();
        return;
      }
      var truncated = false;
      if (left.length > 5000) { left = left.slice(0, 5000); truncated = true; }
      if (right.length > 5000) { right = right.slice(0, 5000); truncated = true; }

      var dist = levenshtein(left, right);
      var maxLen = Math.max(Array.from(left).length, Array.from(right).length);
      var similarity = maxLen === 0 ? 100 : Math.max(0, (1 - dist / maxLen) * 100);

      // 词集合 Jaccard 相似度
      function tokens(text) {
        var list = text.toLowerCase().match(/[\u4e00-\u9fa5]|[a-z0-9]+/g) || [];
        var set = {};
        list.forEach(function (t) { set[t] = 1; });
        return Object.keys(set);
      }
      var ta = tokens(left);
      var tb = tokens(right);
      var inter = ta.filter(function (t) { return tb.indexOf(t) >= 0; }).length;
      var union = ta.length + tb.length - inter;
      var jaccard = union === 0 ? 100 : (inter / union) * 100;

      // 公共前缀
      var pa = Array.from(left);
      var pb = Array.from(right);
      var prefix = 0;
      while (prefix < pa.length && prefix < pb.length && pa[prefix] === pb[prefix]) prefix += 1;

      out.innerHTML = K.stats([
        { value: similarity.toFixed(1) + '%', label: '字符相似度' },
        { value: jaccard.toFixed(1) + '%', label: '词集相似度' },
        { value: dist, label: '编辑距离' },
        { value: prefix, label: '公共前缀字符' }
      ]) + K.kv([
        { key: 'A 长度', value: Array.from(left).length + ' 字符' },
        { key: 'B 长度', value: Array.from(right).length + ' 字符' },
        { key: '长度差', value: Math.abs(Array.from(left).length - Array.from(right).length) + ' 字符' },
        { key: '是否完全相同', value: left === right ? '是' : '否' },
        { key: '相似等级', value: similarity >= 95 ? '几乎相同' : similarity >= 70 ? '高度相似' : similarity >= 40 ? '部分相似' : '差异较大' }
      ]);
      K.bindCopy(out);
      statusEl.className = 'status ' + (truncated ? 'warn' : 'ok');
      statusEl.textContent = truncated ? '文本超过 5000 字符，已截断计算' : '计算完成';
      statusEl.hidden = false;
    }

    root.querySelector('#' + uid + '-run').addEventListener('click', run);
    root.querySelector('#' + uid + '-sample').addEventListener('click', function () {
      a.value = '集成工具大全是一个纯前端、零依赖的在线工具箱。';
      b.value = '集成工具大全是一个纯前端、无依赖的在线工具集合。';
      run();
    });
    root.querySelector('#' + uid + '-clear').addEventListener('click', function () {
      a.value = '';
      b.value = '';
      out.innerHTML = '';
      statusEl.hidden = true;
      window.UI.toast('已清空', 'success');
    });
  }

  /* ------------------------------ 9. 批量查找替换 ------------------------------ */
  function renderReplace(root) {
    K.form(root, {
      uid: 'repl',
      actionLabel: '替换',
      fields: [
        { id: 'src', label: '源文本', type: 'textarea', rows: 7, wide: true },
        { id: 'find', label: '查找', type: 'text', placeholder: '要查找的内容，支持 \\n \\t 转义' },
        { id: 'to', label: '替换为', type: 'text', placeholder: '留空表示删除' },
        { id: 'regex', label: '按正则表达式匹配', type: 'checkbox' },
        { id: 'ignoreCase', label: '忽略大小写', type: 'checkbox' }
      ],
      sample: { src: '订单号：A1001，金额 128 元\n订单号：A1002，金额 256 元', find: 'A(\\d+)', to: 'B$1', regex: true },
      run: function (v) {
        var src = v.src;
        if (!src.length) return { error: '请先输入源文本' };
        if (!v.find.length) return { error: '请填写要查找的内容' };
        var find = replaceEscapes(v.find);
        var to = replaceEscapes(v.to);
        var count = 0;
        var result;
        if (v.regex) {
          var re;
          try {
            re = new RegExp(find, 'g' + (v.ignoreCase ? 'i' : ''));
          } catch (e) {
            return { error: '正则表达式不合法：' + e.message };
          }
          // 先数匹配次数，再交给原生 replace 处理 $1 / $& 等替换语法
          var matched = src.match(re);
          count = matched ? matched.length : 0;
          result = src.replace(re, to);
        } else {
          var flags = v.ignoreCase ? 'gi' : 'g';
          var literal = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
          result = src.replace(literal, function () { count += 1; return to; });
        }
        return {
          html: '<pre class="code-block">' + K.esc(result) + '</pre>',
          note: count ? '共替换 ' + count + ' 处' : '未找到匹配内容'
        };
      }
    });
  }

  /* ------------------------------ 10. 按列排序 ------------------------------ */
  function renderSortMulti(root) {
    K.text(root, {
      uid: 'sortcol',
      inputLabel: '每行一条记录',
      outputLabel: '排序结果',
      actionLabel: '排序',
      inputRows: 9,
      options: [
        { id: 'delim', label: '分隔符', type: 'select', value: ',',
          options: [{ value: ',', label: '逗号' }, { value: '\t', label: '制表符' }, { value: '|', label: '竖线' }, { value: ' ', label: '空格' }] },
        { id: 'index', label: '按第几列', type: 'number', value: 1, min: 1, max: 50 },
        { id: 'numeric', label: '按数字比较', type: 'checkbox' },
        { id: 'desc', label: '降序', type: 'checkbox' },
        { id: 'ignoreCase', label: '忽略大小写', type: 'checkbox', value: true }
      ],
      sample: '苹果,12,5.5\n车厘子,3,89\n香蕉,25,3.2',
      run: function (text, opt) {
        var rows = text.split('\n').filter(function (l) { return l.length; });
        if (!rows.length) return { error: '请输入内容' };
        var index = Math.max(1, Number(opt.index) || 1) - 1;
        var dir = opt.desc ? -1 : 1;
        var parse = function (line) { return line.split(opt.delim); };
        rows.sort(function (x, y) {
          var cx = parse(x)[index] || '';
          var cy = parse(y)[index] || '';
          if (opt.numeric) {
            var nx = parseFloat(cx.replace(/[^\d.-]/g, ''));
            var ny = parseFloat(cy.replace(/[^\d.-]/g, ''));
            if (isNaN(nx)) nx = -Infinity;
            if (isNaN(ny)) ny = -Infinity;
            return (nx - ny) * dir;
          }
          var a = opt.ignoreCase ? cx.toLowerCase() : cx;
          var b = opt.ignoreCase ? cy.toLowerCase() : cy;
          return a.localeCompare(b, 'zh-CN') * dir;
        });
        return { output: rows.join('\n'), note: '已按第 ' + (index + 1) + ' 列' + (opt.desc ? '降序' : '升序') + '排列 ' + rows.length + ' 行' };
      }
    });
  }

  /* ------------------------------ 11. 词频统计 ------------------------------ */
  function renderFrequency(root) {
    K.text(root, {
      uid: 'freq',
      inputLabel: '待统计的文本',
      outputLabel: '统计结果（表格）',
      outputRows: 4,
      actionLabel: '统计',
      hideOutput: true,
      inputRows: 8,
      options: [
        { id: 'mode', label: '统计单位', type: 'select', value: 'auto',
          options: [{ value: 'auto', label: '自动判断' }, { value: 'char', label: '按字' }, { value: 'word', label: '按词' }, { value: 'line', label: '按行' }] },
        { id: 'top', label: '显示前 N 条', type: 'number', value: 20, min: 1, max: 200 },
        { id: 'minLen', label: '最短长度', type: 'number', value: 1, min: 1, max: 10 }
      ],
      hint: '「按字」适合中文（逐字统计），「按词」按连续的字母/数字切分，适合英文。',
      sample: '前端开发需要掌握 HTML、CSS 和 JavaScript。\nJavaScript 是现代前端开发的核心语言，CSS 负责样式。',
      run: function (text, opt) {
        var mode = opt.mode;
        var cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        var latin = (text.match(/[A-Za-z]/g) || []).length;
        if (mode === 'auto') mode = cjk >= latin ? 'char' : 'word';
        var items = [];
        if (mode === 'line') {
          items = text.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
        } else if (mode === 'char') {
          items = (text.match(/[\u4e00-\u9fa5]|[A-Za-z0-9]/g) || []);
        } else {
          items = text.toLowerCase().match(/[a-z0-9']+/g) || [];
        }
        var minLen = Math.max(1, Number(opt.minLen) || 1);
        items = items.filter(function (t) { return t.length >= minLen; });
        if (!items.length) return { error: '没有可统计的内容' };

        var map = {};
        items.forEach(function (t) { map[t] = (map[t] || 0) + 1; });
        var list = Object.keys(map).map(function (key) { return { key: key, count: map[key] }; });
        list.sort(function (a, b) { return b.count - a.count || a.key.localeCompare(b.key); });

        var total = items.length;
        var top = list.slice(0, Math.max(1, Number(opt.top) || 20));
        var max = top[0].count || 1;
        var rows = top.map(function (item, i) {
          var pct = (item.count / total * 100).toFixed(1);
          var barWidth = Math.max(2, Math.round(item.count / max * 100));
          return [
            i + 1,
            item.key,
            item.count,
            pct + '%',
            { html: '<span class="bar-cell"><span style="width:' + barWidth + '%"></span></span>' }
          ];
        });
        return {
          html: K.table(['#', '内容', '次数', '占比', '分布'], rows),
          note: '共 ' + total + ' 个' + (mode === 'char' ? '字' : mode === 'word' ? '词' : '行') +
            '，去重后 ' + list.length + ' 个 · 统计单位：' + (mode === 'char' ? '按字' : mode === 'word' ? '按词' : '按行')
        };
      }
    });
  }

  /* ------------------------------ 12. 文本清洗 ------------------------------ */
  function renderClean(root) {
    K.form(root, {
      uid: 'clean',
      actionLabel: '清洗',
      fields: [
        { id: 'src', label: '待清洗文本', type: 'textarea', rows: 8, wide: true },
        { id: 'trim', label: '去除每行首尾空白', type: 'checkbox', value: true },
        { id: 'blank', label: '删除空行', type: 'checkbox', value: true },
        { id: 'spaces', label: '合并连续空格', type: 'checkbox', value: true },
        { id: 'invisible', label: '删除零宽字符与 BOM', type: 'checkbox', value: true },
        { id: 'cjkSpace', label: '中英文之间加空格', type: 'checkbox' },
        { id: 'stripHtml', label: '去除 HTML 标签', type: 'checkbox' }
      ],
      sample: { src: '  第一行   有  多余空格\n\n\n第二行<span>带标签</span>\u200b内容　\n' },
      run: function (v) {
        var text = v.src;
        if (!text.length) return { error: '请先输入文本' };
        var before = text.length;
        if (v.invisible) {
          text = text.replace(/[\u200b-\u200f\ufeff\u00ad]/g, '').replace(/\u00a0/g, ' ');
        }
        if (v.stripHtml) text = text.replace(/<[^>]*>/g, '');
        if (v.spaces) text = text.replace(/[ \t\u3000]{2,}/g, ' ');
        if (v.cjkSpace) {
          text = text.replace(/([\u4e00-\u9fa5])([A-Za-z0-9])/g, '$1 $2')
            .replace(/([A-Za-z0-9])([\u4e00-\u9fa5])/g, '$1 $2');
        }
        var lines = text.split('\n');
        if (v.trim) lines = lines.map(function (l) { return l.trim(); });
        if (v.blank) lines = lines.filter(function (l) { return l.length > 0; });
        text = lines.join('\n');
        return {
          html: '<pre class="code-block">' + K.esc(text) + '</pre>',
          note: '已清洗：' + before + ' → ' + text.length + ' 字符，' + lines.length + ' 行'
        };
      }
    });
  }

  /* ------------------------------ 13. 敏感词打码 ------------------------------ */
  function renderCensor(root) {
    K.text(root, {
      uid: 'censor',
      inputLabel: '原文',
      outputLabel: '打码结果',
      actionLabel: '打码',
      inputRows: 7,
      options: [
        { id: 'words', label: '敏感词（逗号或换行分隔）', type: 'textarea', rows: 2, value: '密码, admin', placeholder: '示例：密码, 身份证', wide: true },
        { id: 'mask', label: '替换方式', type: 'select', value: 'star',
          options: [{ value: 'star', label: '等长星号 ***' }, { value: 'fixed', label: '固定 [已屏蔽]' }, { value: 'keep', label: '保留首字 *' }] },
        { id: 'ignoreCase', label: '忽略大小写', type: 'checkbox', value: true }
      ],
      hint: '仅做本地字符串替换，适合粘贴日志、聊天记录前快速遮盖关键字。',
      sample: '用户 admin 的密码是 123456，请联系 admin 重置密码。',
      run: function (text, opt) {
        var words = (opt.words || '').split(/[,，\n]/).map(function (w) { return w.trim(); }).filter(Boolean);
        if (!words.length) return { error: '请先填写至少一个敏感词' };
        var count = 0;
        var flags = 'g' + (opt.ignoreCase ? 'i' : '');
        words.forEach(function (word) {
          var re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
          text = text.replace(re, function (match) {
            count += 1;
            if (opt.mask === 'fixed') return '[已屏蔽]';
            if (opt.mask === 'keep') return match.charAt(0) + new Array(match.length).join('*');
            return new Array(match.length + 1).join('*');
          });
        });
        return { output: text, note: '共屏蔽 ' + count + ' 处，涉及 ' + words.length + ' 个关键词' };
      }
    });
  }

  /* ------------------------------ 14. 文本重复拼接 ------------------------------ */
  function renderRepeat(root) {
    K.text(root, {
      uid: 'rep',
      inputLabel: '原文',
      outputLabel: '拼接结果',
      actionLabel: '生成',
      inputRows: 5,
      options: [
        { id: 'times', label: '重复次数', type: 'number', value: 3, min: 1, max: 10000 },
        { id: 'sep', label: '分隔符', type: 'select', value: 'newline',
          options: [{ value: 'newline', label: '换行' }, { value: 'space', label: '空格' }, { value: 'comma', label: '逗号' }, { value: 'none', label: '无' }] },
        { id: 'perLine', label: '每行单独重复', type: 'checkbox' }
      ],
      sample: 'item-',
      run: function (text, opt) {
        var times = Number(opt.times);
        if (!times || times < 1) return { error: '重复次数需要是正整数' };
        if (times > 10000) return { error: '重复次数过大（上限 10000）' };
        var sepMap = { newline: '\n', space: ' ', comma: ', ', none: '' };
        var sep = sepMap[opt.sep];
        if (opt.perLine) {
          var out = text.split('\n').map(function (line) {
            var arr = [];
            for (var i = 0; i < times; i += 1) arr.push(line);
            return arr.join(sep);
          }).join('\n');
          return { output: out, note: '每行重复 ' + times + ' 次' };
        }
        var arr2 = [];
        for (var j = 0; j < times; j += 1) arr2.push(text);
        return { output: arr2.join(sep), note: '已重复 ' + times + ' 次，共 ' + arr2.join(sep).length + ' 字符' };
      }
    });
  }

  /* ------------------------------ 15. 换行符转换 ------------------------------ */
  function renderNewline(root) {
    K.text(root, {
      uid: 'nl',
      inputLabel: '原文',
      outputLabel: '转换结果',
      actionLabel: '转换',
      inputRows: 7,
      options: [{
        id: 'target', label: '目标换行符', type: 'select', value: 'lf',
        options: [
          { value: 'lf', label: 'LF（\\n，Unix / macOS）' },
          { value: 'crlf', label: 'CRLF（\\r\\n，Windows）' },
          { value: 'cr', label: 'CR（\\r，老式 Mac）' }
        ]
      }],
      hint: '统计规则：先数 CRLF，再数单独的 LF 与 CR，三者互不重复计数。',
      sample: '第一行\n第二行\n第三行',
      run: function (text, opt) {
        var crlf = (text.match(/\r\n/g) || []).length;
        var lf = (text.match(/\n/g) || []).length - crlf;
        var cr = (text.match(/\r(?!\n)/g) || []).length;
        var target = opt.target === 'crlf' ? '\r\n' : opt.target === 'cr' ? '\r' : '\n';
        var output = text.replace(/\r\n|\r|\n/g, target);
        var name = opt.target === 'crlf' ? 'CRLF' : opt.target === 'cr' ? 'CR' : 'LF';
        return {
          output: output,
          note: '检测到 CRLF ' + crlf + ' 处、LF ' + lf + ' 处、CR ' + cr + ' 处；已统一为 ' + name
        };
      }
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['text-reverse'] = renderReverse;
  window.ToolModules['text-pad'] = renderPad;
  window.ToolModules['text-wrap'] = renderWrap;
  window.ToolModules['text-indent'] = renderIndent;
  window.ToolModules['text-prefix'] = renderPrefix;
  window.ToolModules['text-merge'] = renderMerge;
  window.ToolModules['text-columns'] = renderColumns;
  window.ToolModules['text-similarity'] = renderSimilarity;
  window.ToolModules['text-replace'] = renderReplace;
  window.ToolModules['text-sort-multi'] = renderSortMulti;
  window.ToolModules['text-frequency'] = renderFrequency;
  window.ToolModules['text-clean'] = renderClean;
  window.ToolModules['text-censor'] = renderCensor;
  window.ToolModules['text-repeat'] = renderRepeat;
  window.ToolModules['text-newline'] = renderNewline;
})();
