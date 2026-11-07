/* =============================================================================
 * 文本处理工具包（13 个）
 * -----------------------------------------------------------------------------
 * text-dedupe 文本去重 / line-sort 行排序 / text-diff 文本对比 /
 * case-convert 命名风格 / width-convert 全角半角 / line-number 行号增删 /
 * text-escape 转义反转义 / text-split 文本分割 / text-extract 信息提取 /
 * text-shuffle 文本乱序 / text-truncate 文本截断 / unicode-convert Unicode /
 * text-template 模板替换
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  function lines(text) {
    return text.replace(/\r\n?/g, '\n').split('\n');
  }

  /* ------------------------------ 文本去重 ------------------------------ */
  function renderDedupe(root) {
    K.text(root, {
      uid: 'dedupe',
      inputLabel: '原始文本（每行一条）',
      inputPlaceholder: '重复的行会被自动去掉，保留首次出现的位置',
      outputLabel: '去重结果',
      actionLabel: '去重',
      options: [
        { id: 'ignoreCase', type: 'checkbox', label: '忽略大小写' },
        { id: 'trim', type: 'checkbox', label: '忽略行首尾空白', value: true },
        { id: 'dropEmpty', type: 'checkbox', label: '删除空行' }
      ],
      sample: '苹果\n香蕉\n苹果\n 香蕉 \n橙子\nApple\napple',
      run: function (text, opt) {
        var rows = lines(text);
        var seen = Object.create(null);
        var kept = [];
        var removed = 0;
        rows.forEach(function (row) {
          var key = opt.trim ? row.trim() : row;
          if (opt.dropEmpty && !key) { removed += 1; return; }
          if (opt.ignoreCase) key = key.toLowerCase();
          if (seen[key]) { removed += 1; return; }
          seen[key] = true;
          kept.push(opt.trim ? row.trim() : row);
        });
        return {
          output: kept.join('\n'),
          note: '原 ' + rows.length + ' 行 → 保留 ' + kept.length + ' 行，去除 ' + removed + ' 行重复/空行。'
        };
      }
    });
  }

  /* ------------------------------ 行排序 ------------------------------ */
  function renderLineSort(root) {
    K.text(root, {
      uid: 'linesort',
      inputLabel: '待排序文本（每行一条）',
      outputLabel: '排序结果',
      actionLabel: '排序',
      options: [
        {
          id: 'mode', type: 'select', label: '排序方式', value: 'asc',
          options: [
            { value: 'asc', label: '字典升序' },
            { value: 'desc', label: '字典降序' },
            { value: 'len-asc', label: '按长度升序' },
            { value: 'len-desc', label: '按长度降序' },
            { value: 'natural', label: '自然排序（数字按大小）' },
            { value: 'reverse', label: '反转当前顺序' }
          ]
        },
        { id: 'ignoreCase', type: 'checkbox', label: '忽略大小写' },
        { id: 'dedupe', type: 'checkbox', label: '顺带去重' },
        { id: 'dropEmpty', type: 'checkbox', label: '删除空行' }
      ],
      sample: 'item10\nitem2\nBanana\napple\nitem1\n',
      run: function (text, opt) {
        var rows = lines(text);
        if (opt.dropEmpty) rows = rows.filter(function (r) { return r.trim() !== ''; });
        if (opt.dedupe) {
          var seen = Object.create(null);
          rows = rows.filter(function (r) {
            var key = opt.ignoreCase ? r.toLowerCase() : r;
            if (seen[key]) return false;
            seen[key] = true;
            return true;
          });
        }
        var normalize = function (value) { return opt.ignoreCase ? value.toLowerCase() : value; };
        if (opt.mode === 'asc') rows.sort(function (a, b) { return normalize(a).localeCompare(normalize(b), 'zh-CN'); });
        else if (opt.mode === 'desc') rows.sort(function (a, b) { return normalize(b).localeCompare(normalize(a), 'zh-CN'); });
        else if (opt.mode === 'len-asc') rows.sort(function (a, b) { return a.length - b.length; });
        else if (opt.mode === 'len-desc') rows.sort(function (a, b) { return b.length - a.length; });
        else if (opt.mode === 'natural') {
          rows.sort(function (a, b) { return normalize(a).localeCompare(normalize(b), 'zh-CN', { numeric: true }); });
        } else if (opt.mode === 'reverse') rows.reverse();
        return { output: rows.join('\n'), note: '共 ' + rows.length + ' 行。' };
      }
    });
  }

  /* ------------------------------ 文本对比 ------------------------------ */
  function renderDiff(root) {
    var uid = K.uid('diff');
    root.innerHTML =
      '<div class="split">' +
        '<div class="field">' +
          '<div class="label-row"><label class="label" for="' + uid + '-a">原文 A</label></div>' +
          '<textarea id="' + uid + '-a" class="textarea mono" rows="9" spellcheck="false" placeholder="粘贴原始文本"></textarea>' +
        '</div>' +
        '<div class="field">' +
          '<div class="label-row"><label class="label" for="' + uid + '-b">新文本 B</label></div>' +
          '<textarea id="' + uid + '-b" class="textarea mono" rows="9" spellcheck="false" placeholder="粘贴修改后的文本"></textarea>' +
        '</div>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="' + uid + '-run">开始对比</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-sample">示例</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-clear">清空</button>' +
      '</div>' +
      '<div id="' + uid + '-out"></div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      '<p class="hint">按行对比（最长公共子序列算法），最多支持 1500 行 × 1500 行。绿色为新增，红色为删除，灰色为未变化。</p>';

    var a = root.querySelector('#' + uid + '-a');
    var b = root.querySelector('#' + uid + '-b');
    var out = root.querySelector('#' + uid + '-out');
    var statusEl = root.querySelector('#' + uid + '-status');

    function setStatus(type, text) {
      if (!text) { statusEl.hidden = true; return; }
      statusEl.className = 'status ' + type;
      statusEl.textContent = text;
      statusEl.hidden = false;
    }

    function computeDiff(aRows, bRows) {
      var n = aRows.length;
      var m = bRows.length;
      var width = m + 1;
      var dp = new Int32Array((n + 1) * width);
      for (var i = n - 1; i >= 0; i -= 1) {
        for (var j = m - 1; j >= 0; j -= 1) {
          dp[i * width + j] = aRows[i] === bRows[j]
            ? dp[(i + 1) * width + j + 1] + 1
            : Math.max(dp[(i + 1) * width + j], dp[i * width + j + 1]);
        }
      }
      var ops = [];
      var x = 0;
      var y = 0;
      while (x < n && y < m) {
        if (aRows[x] === bRows[y]) {
          ops.push(['same', aRows[x]]); x += 1; y += 1;
        } else if (dp[(x + 1) * width + y] >= dp[x * width + y + 1]) {
          ops.push(['del', aRows[x]]); x += 1;
        } else {
          ops.push(['add', bRows[y]]); y += 1;
        }
      }
      while (x < n) { ops.push(['del', aRows[x]]); x += 1; }
      while (y < m) { ops.push(['add', bRows[y]]); y += 1; }
      return ops;
    }

    function run() {
      if (!a.value && !b.value) {
        window.UI.toast('请先粘贴两段文本', 'warn');
        return;
      }
      var aRows = lines(a.value);
      var bRows = lines(b.value);
      if (aRows.length > 1500 || bRows.length > 1500) {
        setStatus('err', '文本行数过多（' + aRows.length + ' / ' + bRows.length + '），请分段对比，最多 1500 行。');
        return;
      }
      var ops = computeDiff(aRows, bRows);
      var add = 0;
      var del = 0;
      var lineA = 0;
      var lineB = 0;
      var html = ops.map(function (op) {
        var cls = 'diff-line';
        var sign = ' ';
        if (op[0] === 'add') { cls += ' diff-add'; sign = '+'; add += 1; lineB += 1; }
        else if (op[0] === 'del') { cls += ' diff-del'; sign = '-'; del += 1; lineA += 1; }
        else { lineA += 1; lineB += 1; }
        return '<div class="' + cls + '">' +
          '<span class="diff-no">' + (op[0] === 'add' ? '' : lineA) + '</span>' +
          '<span class="diff-no">' + (op[0] === 'del' ? '' : lineB) + '</span>' +
          '<span class="diff-sign">' + sign + '</span>' +
          '<span class="diff-text">' + (K.esc(op[1]) || '&nbsp;') + '</span>' +
          '</div>';
      }).join('');

      out.innerHTML = '<div class="diff-view">' + html + '</div>';
      setStatus(add + del === 0 ? 'ok' : 'info',
        add + del === 0 ? '两段文本完全一致。' : ('新增 ' + add + ' 行，删除 ' + del + ' 行，未变化 ' + (ops.length - add - del) + ' 行。'));
    }

    root.querySelector('#' + uid + '-run').addEventListener('click', run);
    root.querySelector('#' + uid + '-sample').addEventListener('click', function () {
      a.value = '第一行\n第二行\n第三行\n第四行\n';
      b.value = '第一行\n第二行（已修改）\n第四行\n第五行\n';
      run();
    });
    root.querySelector('#' + uid + '-clear').addEventListener('click', function () {
      a.value = '';
      b.value = '';
      out.innerHTML = '';
      setStatus(null, '');
      window.UI.toast('已清空', 'success');
    });
  }

  /* ------------------------------ 命名风格转换 ------------------------------ */
  function renderCase(root) {
    var uid = K.uid('case');
    root.innerHTML =
      '<div class="field">' +
        '<div class="label-row"><label class="label" for="' + uid + '-input">输入标识符或词组</label>' +
        '<span class="label-meta" id="' + uid + '-count">0 字符</span></div>' +
        '<textarea id="' + uid + '-input" class="textarea mono" rows="3" spellcheck="false" ' +
        'placeholder="例如：user profile name / userProfileName / user_profile_name"></textarea>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="' + uid + '-run">转换</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-sample">示例</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-clear">清空</button>' +
      '</div>' +
      '<div id="' + uid + '-out"></div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      '<p class="hint">自动识别空格、下划线、连字符、点号以及 camelCase / PascalCase 边界。</p>';

    var input = root.querySelector('#' + uid + '-input');
    var out = root.querySelector('#' + uid + '-out');
    var statusEl = root.querySelector('#' + uid + '-status');
    var countEl = root.querySelector('#' + uid + '-count');

    function words(text) {
      return text
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .split(/[^A-Za-z0-9\u4e00-\u9fa5]+/)
        .filter(function (w) { return w.length > 0; });
    }

    function cap(word) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }

    function convert() {
      var text = input.value.trim();
      if (!text) {
        window.UI.toast('请先输入内容', 'warn');
        input.focus();
        return;
      }
      var parts = words(text);
      if (!parts.length) {
        statusEl.className = 'status err';
        statusEl.textContent = '没有识别到可转换的字母或数字。';
        statusEl.hidden = false;
        out.innerHTML = '';
        return;
      }
      var lower = parts.map(function (w) { return w.toLowerCase(); });
      var rows = [
        { key: 'camelCase', value: lower[0] + lower.slice(1).map(cap).join('') },
        { key: 'PascalCase', value: parts.map(cap).join('') },
        { key: 'snake_case', value: lower.join('_') },
        { key: 'CONSTANT_CASE', value: lower.join('_').toUpperCase() },
        { key: 'kebab-case', value: lower.join('-') },
        { key: 'dot.case', value: lower.join('.') },
        { key: 'Title Case', value: parts.map(cap).join(' ') },
        { key: 'lower case', value: lower.join(' ') },
        { key: 'UPPER CASE', value: lower.join(' ').toUpperCase() }
      ];
      out.innerHTML = K.kv(rows);
      K.bindCopy(out);
      statusEl.className = 'status ok';
      statusEl.textContent = '已识别 ' + parts.length + ' 个词片段。';
      statusEl.hidden = false;
    }

    input.addEventListener('input', function () {
      countEl.textContent = input.value.length + ' 字符';
    });
    root.querySelector('#' + uid + '-run').addEventListener('click', convert);
    root.querySelector('#' + uid + '-sample').addEventListener('click', function () {
      input.value = 'user profile name';
      countEl.textContent = input.value.length + ' 字符';
      convert();
    });
    root.querySelector('#' + uid + '-clear').addEventListener('click', function () {
      input.value = '';
      out.innerHTML = '';
      countEl.textContent = '0 字符';
      statusEl.hidden = true;
      window.UI.toast('已清空', 'success');
    });
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); convert(); }
    });
  }

  /* ------------------------------ 全角半角 ------------------------------ */
  function renderWidth(root) {
    K.text(root, {
      uid: 'width',
      inputLabel: '输入文本',
      inputRows: 7,
      outputLabel: '转换结果',
      actionLabel: '转换',
      options: [
        {
          id: 'mode', type: 'select', label: '转换方向', value: 'toHalf',
          options: [
            { value: 'toHalf', label: '全角 → 半角' },
            { value: 'toFull', label: '半角 → 全角' }
          ]
        },
        { id: 'trimSpace', type: 'checkbox', label: '同时处理全角空格' }
      ],
      sample: 'ＡＢＣ１２３，你好！　（全角括号）',
      run: function (text, opt) {
        var result = '';
        for (var i = 0; i < text.length; i += 1) {
          var code = text.charCodeAt(i);
          if (opt.mode === 'toHalf') {
            if (code === 0x3000) result += ' ';
            else if (code >= 0xff01 && code <= 0xff5e) result += String.fromCharCode(code - 0xfee0);
            else result += text.charAt(i);
          } else {
            if (code === 0x20) result += '\u3000';
            else if (code >= 0x21 && code <= 0x7e) result += String.fromCharCode(code + 0xfee0);
            else result += text.charAt(i);
          }
        }
        if (!opt.trimSpace) result = result.replace(/\u3000/g, '　');
        return { output: result, note: '已按「' + (opt.mode === 'toHalf' ? '全角→半角' : '半角→全角') + '」转换 ' + text.length + ' 个字符。' };
      }
    });
  }

  /* ------------------------------ 行号增删 ------------------------------ */
  function renderLineNumber(root) {
    K.text(root, {
      uid: 'lineno',
      inputLabel: '输入文本',
      outputLabel: '结果',
      actionLabel: '处理',
      options: [
        {
          id: 'mode', type: 'select', label: '操作', value: 'add',
          options: [{ value: 'add', label: '添加行号' }, { value: 'remove', label: '移除行号' }]
        },
        {
          id: 'sep', type: 'select', label: '序号后缀', value: '. ',
          options: [
            { value: '. ', label: '1. ' },
            { value: '、', label: '1、' },
            { value: ') ', label: '1) ' },
            { value: '\t', label: '1<Tab>' }
          ]
        },
        { id: 'start', type: 'number', label: '起始序号', value: 1, min: 0, step: 1 },
        { id: 'pad', type: 'number', label: '补零位数（0 不补）', value: 0, min: 0, max: 6 }
      ],
      sample: '第一行内容\n第二行内容\n第三行内容',
      run: function (text, opt) {
        var rows = lines(text);
        if (opt.mode === 'remove') {
          var removed = rows.map(function (row) {
            return row.replace(/^\s*\d+\s*[.)、:：]?\s?/, '');
          });
          return { output: removed.join('\n'), note: '已移除每行开头的行号。' };
        }
        var start = parseInt(opt.start, 10);
        if (!isFinite(start)) start = 1;
        var pad = parseInt(opt.pad, 10) || 0;
        var maxNo = start + rows.length - 1;
        var width = pad > 0 ? pad : String(maxNo).length;
        var out = rows.map(function (row, index) {
          var no = String(start + index);
          while (no.length < width) no = '0' + no;
          return no + opt.sep + row;
        });
        return { output: out.join('\n'), note: '已为 ' + rows.length + ' 行添加行号。' };
      }
    });
  }

  /* ------------------------------ 转义反转义 ------------------------------ */
  function renderEscape(root) {
    K.text(root, {
      uid: 'escape',
      inputLabel: '输入内容',
      outputLabel: '结果',
      actionLabel: '转换',
      options: [
        {
          id: 'mode', type: 'select', label: '处理方式', value: 'escape',
          options: [
            { value: 'escape', label: '转义为 \\n \\t 等' },
            { value: 'unescape', label: '把 \\n \\t 还原' },
            { value: 'html', label: 'HTML 转义（& < > 引号）' },
            { value: 'htmlBack', label: 'HTML 反转义' },
            { value: 'json', label: '转 JSON 字符串片段' },
            { value: 'jsonBack', label: '解析 JSON 字符串片段' }
          ]
        }
      ],
      sample: '第一行\n第二行\t带制表符 "引号" \\反斜杠',
      run: function (text, opt) {
        if (opt.mode === 'escape') {
          var out = text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t').replace(/"/g, '\\"').replace(/'/g, "\\'");
          return { output: out, note: '已转义为可读的单行字符串。' };
        }
        if (opt.mode === 'unescape') {
          var res = text.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t')
            .replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
          return { output: res, note: '已还原转义字符。' };
        }
        if (opt.mode === 'html') {
          var esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          return { output: esc, note: '已转义 HTML 特殊字符。' };
        }
        if (opt.mode === 'htmlBack') {
          var box = document.createElement('textarea');
          box.innerHTML = text;
          return { output: box.value, note: '已还原 HTML 实体。' };
        }
        if (opt.mode === 'json') {
          return { output: JSON.stringify(text), note: '已生成 JSON 字符串字面量（含首尾引号）。' };
        }
        try {
          var parsed = JSON.parse(text.trim());
          if (typeof parsed !== 'string') throw new Error('不是字符串');
          return { output: parsed, note: '已解析 JSON 字符串。' };
        } catch (error) {
          return { error: '解析失败：请确认内容是合法的 JSON 字符串（需含首尾双引号）。' };
        }
      }
    });
  }

  /* ------------------------------ 文本分割 ------------------------------ */
  function renderSplit(root) {
    K.text(root, {
      uid: 'split',
      inputLabel: '待分割文本',
      outputLabel: '分割结果（每行一段）',
      actionLabel: '分割',
      options: [
        {
          id: 'mode', type: 'select', label: '分割方式', value: 'delimiter',
          options: [
            { value: 'delimiter', label: '按分隔符' },
            { value: 'length', label: '按固定长度' },
            { value: 'regex', label: '按正则表达式' },
            { value: 'lines', label: '按换行/空白' }
          ]
        },
        { id: 'param', type: 'text', label: '分隔符 / 长度 / 正则', value: ',', placeholder: '例如 , 或 ; 或 \\s+' }
      ],
      sample: '苹果,香蕉,橙子,西瓜',
      run: function (text, opt) {
        var parts;
        if (opt.mode === 'delimiter') {
          if (!opt.param) return { error: '请填写分隔符。' };
          parts = text.split(opt.param);
        } else if (opt.mode === 'length') {
          var size = parseInt(opt.param, 10);
          if (!isFinite(size) || size <= 0) return { error: '长度必须是大于 0 的整数。' };
          parts = [];
          for (var i = 0; i < text.length; i += size) parts.push(text.slice(i, i + size));
        } else if (opt.mode === 'regex') {
          var re;
          try { re = new RegExp(opt.param, 'g'); }
          catch (e) { return { error: '正则表达式语法错误：' + e.message }; }
          parts = text.split(re);
        } else {
          parts = text.split(/\s+/);
        }
        parts = parts.filter(function (p) { return p !== ''; });
        return { output: parts.join('\n'), note: '共分割为 ' + parts.length + ' 段。' };
      }
    });
  }

  /* ------------------------------ 信息提取 ------------------------------ */
  var EXTRACT_RULES = {
    email: { label: '邮箱地址', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
    url: { label: '网址链接', re: /https?:\/\/[^\s<>"'）)】\]]+/g },
    phone: { label: '手机号', re: /(?:\+?86[-\s]?)?1[3-9]\d{9}/g },
    ipv4: { label: 'IPv4 地址', re: /\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b/g },
    date: { label: '日期', re: /\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?/g },
    number: { label: '数字', re: /-?\d+(?:\.\d+)?/g },
    chinese: { label: '中文片段', re: /[\u4e00-\u9fa5]+/g },
    idcard: { label: '身份证号', re: /\b\d{17}[\dXx]\b/g }
  };

  function renderExtract(root) {
    var options = Object.keys(EXTRACT_RULES).map(function (key) {
      return { value: key, label: EXTRACT_RULES[key].label };
    });
    K.text(root, {
      uid: 'extract',
      inputLabel: '粘贴包含目标信息的文本',
      outputLabel: '提取结果（每行一条）',
      actionLabel: '提取',
      options: [
        { id: 'type', type: 'select', label: '提取类型', value: 'email', options: options },
        { id: 'unique', type: 'checkbox', label: '结果去重', value: true }
      ],
      sample: '联系我：hi@example.com 或 support@test.cn，官网 https://example.com/path，电话 13800138000。',
      run: function (text, opt) {
        var rule = EXTRACT_RULES[opt.type] || EXTRACT_RULES.email;
        var matches = text.match(rule.re) || [];
        if (opt.unique) {
          var seen = Object.create(null);
          matches = matches.filter(function (m) {
            if (seen[m]) return false;
            seen[m] = true;
            return true;
          });
        }
        return {
          output: matches.join('\n'),
          note: matches.length ? '共提取 ' + matches.length + ' 条' + rule.label + '。' : '没有找到' + rule.label + '。',
          type: matches.length ? 'ok' : 'info'
        };
      }
    });
  }

  /* ------------------------------ 文本乱序 ------------------------------ */
  function renderShuffle(root) {
    K.text(root, {
      uid: 'shuffle',
      inputLabel: '输入文本',
      outputLabel: '乱序结果',
      actionLabel: '打乱',
      options: [
        {
          id: 'unit', type: 'select', label: '打乱单位', value: 'lines',
          options: [
            { value: 'lines', label: '按行' },
            { value: 'words', label: '按词（中文按字）' },
            { value: 'chars', label: '按字符' }
          ]
        },
        { id: 'keepFirst', type: 'checkbox', label: '保留首行位置（适合表头）' }
      ],
      sample: '第一行\n第二行\n第三行\n第四行\n第五行',
      run: function (text, opt) {
        var items;
        if (opt.unit === 'lines') items = lines(text);
        else if (opt.unit === 'words') items = text.split(/(\s+)/).filter(function (s) { return s !== ''; });
        else items = text.split('');

        var head = null;
        if (opt.keepFirst && items.length > 1) head = items.shift();
        K.shuffle(items);
        if (head !== null) items.unshift(head);

        return {
          output: opt.unit === 'lines' ? items.join('\n') : items.join(''),
          note: '已使用系统安全随机源打乱 ' + items.length + ' 个单元。'
        };
      }
    });
  }

  /* ------------------------------ 文本截断 ------------------------------ */
  function renderTruncate(root) {
    K.text(root, {
      uid: 'truncate',
      inputLabel: '输入文本',
      outputLabel: '截断结果',
      actionLabel: '截断',
      options: [
        { id: 'length', type: 'number', label: '长度上限', value: 100, min: 1, step: 1 },
        {
          id: 'unit', type: 'select', label: '长度单位', value: 'chars',
          options: [{ value: 'chars', label: '字符' }, { value: 'bytes', label: 'UTF-8 字节' }]
        },
        { id: 'ellipsis', type: 'checkbox', label: '超出时追加省略号', value: true }
      ],
      sample: '这是一段用来演示截断效果的文字，长度会超过设定的上限，因此会被裁掉一部分。',
      run: function (text, opt) {
        var limit = parseInt(opt.length, 10);
        if (!isFinite(limit) || limit <= 0) return { error: '长度上限必须是大于 0 的整数。' };
        var encoder = new TextEncoder();
        var out;
        var cut = false;

        if (opt.unit === 'chars') {
          var chars = Array.from(text);
          cut = chars.length > limit;
          out = cut ? chars.slice(0, limit).join('') : text;
        } else {
          var bytes = encoder.encode(text);
          cut = bytes.length > limit;
          if (!cut) out = text;
          else {
            var slice = bytes.slice(0, limit);
            // 避免把多字节字符截成乱码：逐字节回退到合法 UTF-8 边界
            var decoder = new TextDecoder('utf-8', { fatal: true });
            while (slice.length > 0) {
              try { out = decoder.decode(slice); break; }
              catch (e) { slice = slice.slice(0, slice.length - 1); }
            }
            if (out === undefined) out = '';
          }
        }
        if (cut && opt.ellipsis) out += '…';
        var total = opt.unit === 'chars' ? Array.from(text).length : encoder.encode(text).length;
        return {
          output: out,
          note: '原文 ' + total + (opt.unit === 'chars' ? ' 字符' : ' 字节') + (cut ? '，已截断到 ' + limit : '，未超出上限。')
        };
      }
    });
  }

  /* ------------------------------ Unicode 转换 ------------------------------ */
  function renderUnicode(root) {
    K.text(root, {
      uid: 'unicode',
      inputLabel: '输入内容',
      outputLabel: '结果',
      actionLabel: '转换',
      options: [
        {
          id: 'mode', type: 'select', label: '转换方式', value: 'toUnicode',
          options: [
            { value: 'toUnicode', label: '中文 → \\uXXXX' },
            { value: 'fromUnicode', label: '\\uXXXX → 中文' },
            { value: 'toEntity', label: '中文 → &#NNNNN;' },
            { value: 'fromEntity', label: '&#NNNNN; → 中文' }
          ]
        },
        { id: 'onlyNonAscii', type: 'checkbox', label: '仅转换非 ASCII 字符', value: true }
      ],
      sample: '你好，世界 Hello',
      run: function (text, opt) {
        var out = '';
        if (opt.mode === 'toUnicode') {
          for (var i = 0; i < text.length; i += 1) {
            var code = text.charCodeAt(i);
            if (!opt.onlyNonAscii || code > 0x7e) {
              out += '\\u' + ('0000' + code.toString(16).toUpperCase()).slice(-4);
            } else {
              out += text.charAt(i);
            }
          }
          return { output: out, note: '已生成 ' + text.length + ' 个字符的 Unicode 转义序列。' };
        }
        if (opt.mode === 'fromUnicode') {
          out = text.replace(/\\u\{([0-9a-fA-F]{1,6})\}|\\u([0-9a-fA-F]{4})/g, function (m, hex1, hex2) {
            return String.fromCodePoint(parseInt(hex1 || hex2, 16));
          });
          return { output: out, note: '已还原转义序列。' };
        }
        if (opt.mode === 'toEntity') {
          for (var j = 0; j < text.length; j += 1) {
            var c = text.charCodeAt(j);
            out += (!opt.onlyNonAscii || c > 0x7e) ? '&#' + c + ';' : text.charAt(j);
          }
          return { output: out, note: '已生成 HTML 数字实体。' };
        }
        out = text.replace(/&#x([0-9a-fA-F]+);|&#(\d+);/g, function (m, hex, dec) {
          return String.fromCodePoint(hex ? parseInt(hex, 16) : parseInt(dec, 10));
        });
        return { output: out, note: '已还原 HTML 数字实体。' };
      }
    });
  }

  /* ------------------------------ 模板替换 ------------------------------ */
  function renderTemplate(root) {
    var uid = K.uid('tpl');
    root.innerHTML =
      '<div class="split">' +
        '<div class="field">' +
          '<div class="label-row"><label class="label" for="' + uid + '-tpl">模板文本</label></div>' +
          '<textarea id="' + uid + '-tpl" class="textarea mono" rows="9" spellcheck="false" ' +
          'placeholder="你好 {{name}}，你的订单 {{orderId}} 已发货。"></textarea>' +
        '</div>' +
        '<div class="field">' +
          '<div class="label-row"><label class="label" for="' + uid + '-vars">变量（每行 key=value）</label></div>' +
          '<textarea id="' + uid + '-vars" class="textarea mono" rows="9" spellcheck="false" ' +
          'placeholder="name=张三\norderId=20241106001"></textarea>' +
        '</div>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="' + uid + '-run">替换</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-sample">示例</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-clear">清空</button>' +
      '</div>' +
      '<div class="field">' +
        '<div class="label-row"><label class="label" for="' + uid + '-out">结果</label>' +
        '<div class="label-actions"><button type="button" class="link-btn" id="' + uid + '-copy">复制结果</button></div></div>' +
        '<textarea id="' + uid + '-out" class="textarea mono" rows="9" readonly placeholder="替换结果会显示在这里"></textarea>' +
      '</div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      '<p class="hint">支持 <code>{{key}}</code> 与 <code>\${key}</code> 两种占位符；变量行支持 <code>=</code> 或 <code>:</code> 分隔，值中可以包含等号。</p>';

    var tpl = root.querySelector('#' + uid + '-tpl');
    var varsEl = root.querySelector('#' + uid + '-vars');
    var out = root.querySelector('#' + uid + '-out');
    var statusEl = root.querySelector('#' + uid + '-status');

    function run() {
      if (!tpl.value) {
        window.UI.toast('请先填写模板文本', 'warn');
        tpl.focus();
        return;
      }
      var map = Object.create(null);
      varsEl.value.replace(/\r\n?/g, '\n').split('\n').forEach(function (row) {
        if (!row.trim()) return;
        var index = row.indexOf('=');
        if (index === -1) index = row.indexOf(':');
        if (index === -1) return;
        var key = row.slice(0, index).trim();
        if (key) map[key] = row.slice(index + 1).trim();
      });

      var missing = [];
      var result = tpl.value.replace(/\{\{\s*([\w.-]+)\s*\}\}|\$\{\s*([\w.-]+)\s*\}/g, function (match, a, b) {
        var key = a || b;
        if (Object.prototype.hasOwnProperty.call(map, key)) return map[key];
        missing.push(key);
        return match;
      });

      out.value = result;
      var keys = Object.keys(map);
      if (missing.length) {
        statusEl.className = 'status info';
        statusEl.textContent = '替换完成，但有 ' + missing.length + ' 个占位符没有对应变量：' + missing.join('、');
      } else {
        statusEl.className = 'status ok';
        statusEl.textContent = '替换完成，共使用 ' + keys.length + ' 个变量。';
      }
      statusEl.hidden = false;
    }

    root.querySelector('#' + uid + '-run').addEventListener('click', run);
    root.querySelector('#' + uid + '-copy').addEventListener('click', function () {
      window.UI.copyText(out.value);
    });
    root.querySelector('#' + uid + '-sample').addEventListener('click', function () {
      tpl.value = '你好 {{name}}，你的订单 ${orderId} 已于 {{date}} 发货。\n如有疑问请联系 {{service}}。';
      varsEl.value = 'name=张三\norderId=20241106001\ndate=2024-11-06\nservice=客服小助手';
      run();
    });
    root.querySelector('#' + uid + '-clear').addEventListener('click', function () {
      tpl.value = '';
      varsEl.value = '';
      out.value = '';
      statusEl.hidden = true;
      window.UI.toast('已清空', 'success');
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['text-dedupe'] = renderDedupe;
  window.ToolModules['line-sort'] = renderLineSort;
  window.ToolModules['text-diff'] = renderDiff;
  window.ToolModules['case-convert'] = renderCase;
  window.ToolModules['width-convert'] = renderWidth;
  window.ToolModules['line-number'] = renderLineNumber;
  window.ToolModules['text-escape'] = renderEscape;
  window.ToolModules['text-split'] = renderSplit;
  window.ToolModules['text-extract'] = renderExtract;
  window.ToolModules['text-shuffle'] = renderShuffle;
  window.ToolModules['text-truncate'] = renderTruncate;
  window.ToolModules['unicode-convert'] = renderUnicode;
  window.ToolModules['text-template'] = renderTemplate;
})();
