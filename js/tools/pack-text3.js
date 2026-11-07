/* =============================================================================
 * 文本处理工具包 · 第三批（14 个）
 * -----------------------------------------------------------------------------
 * text-transpose   行列互换（转置）
 * text-grep        行筛选（保留 / 删除匹配行）
 * text-slug        Slug 生成
 * text-case-toggle 大小写切换
 * text-emoji-strip 移除 emoji 与不可见字符
 * text-md-escape   Markdown 转义
 * text-nato        NATO 音标字母
 * text-vertical    竖排文字
 * text-abbrev      首字母缩写
 * text-camel-split 命名拆词
 * text-squeeze     空白压缩
 * text-para-format 段落排版
 * text-cut         按列 / 字段截取
 * text-strip-html  HTML 转纯文本
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  /* ------------------------------ 1. 行列互换 ------------------------------ */
  function renderTranspose(root) {
    K.text(root, {
      uid: 'transpose',
      inputLabel: '输入内容（每行一条记录）',
      inputRows: 8,
      options: [
        { id: 'sep', label: '字段分隔符', type: 'text', value: ',' },
        { id: 'join', label: '输出连接符', type: 'text', value: ',' }
      ],
      hint: '把表格的行与列互换：第 1 列变成第 1 行。空位用空字符串补齐。',
      sample: '姓名,城市,年龄\n小明,北京,25\n小红,上海,30',
      run: function (text, v) {
        var lines = text.replace(/\r/g, '').split('\n').filter(function (l) { return l.length; });
        if (!lines.length) return { error: '没有可处理的行' };
        var sep = v.sep || ',';
        var join = v.join || sep;
        var grid = lines.map(function (line) { return line.split(sep); });
        var maxLen = Math.max.apply(null, grid.map(function (row) { return row.length; }));
        var out = [];
        for (var col = 0; col < maxLen; col += 1) {
          out.push(grid.map(function (row) { return row[col] === undefined ? '' : row[col]; }).join(join));
        }
        return {
          output: out.join('\n'),
          note: '原始 ' + lines.length + ' 行 × 最宽 ' + maxLen + ' 列 → 互换后 ' + maxLen + ' 行'
        };
      }
    });
  }

  /* ------------------------------ 2. 行筛选 ------------------------------ */
  function renderGrep(root) {
    K.text(root, {
      uid: 'grep',
      inputLabel: '输入内容',
      inputRows: 9,
      options: [
        { id: 'pattern', label: '匹配规则', type: 'text', value: 'error', placeholder: '普通文字或正则，如 ^\\d+|error' },
        { id: 'mode', label: '操作', type: 'select', value: 'keep',
          options: [{ value: 'keep', label: '保留匹配行' }, { value: 'remove', label: '删除匹配行' }] },
        { id: 'regex', label: '使用正则', type: 'checkbox', value: true },
        { id: 'ignoreCase', label: '忽略大小写', type: 'checkbox' },
        { id: 'invert', label: '反选（对规则取反）', type: 'checkbox' }
      ],
      sample: 'INFO 服务启动完成\nERROR 数据库连接失败\nWARN 配置项缺失\nERROR 请求超时\nINFO 端口监听 8080',
      run: function (text, v) {
        if (!v.pattern.trim()) return { error: '请填写匹配规则' };
        var re;
        try {
          re = v.regex
            ? new RegExp(v.pattern, v.ignoreCase ? 'i' : '')
            : new RegExp(v.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), v.ignoreCase ? 'i' : '');
        } catch (e) {
          return { error: '正则不合法：' + e.message };
        }
        var lines = text.replace(/\r/g, '').split('\n');
        var kept = [];
        var removed = 0;
        lines.forEach(function (line) {
          var hit = re.test(line);
          if (v.invert) hit = !hit;
          if (v.mode === 'keep' ? hit : !hit) kept.push(line); else removed += 1;
        });
        return {
          output: kept.join('\n'),
          note: '保留 ' + kept.length + ' 行，去掉 ' + removed + ' 行'
        };
      }
    });
  }

  /* ------------------------------ 3. Slug 生成 ------------------------------ */
  function renderSlug(root) {
    K.text(root, {
      uid: 'slug',
      inputLabel: '输入标题（每行一条）',
      inputRows: 6,
      options: [
        { id: 'sep', label: '单词分隔符', type: 'select', value: '-',
          options: [{ value: '-', label: '短横线 my-post' }, { value: '_', label: '下划线 my_post' }] },
        { id: 'lower', label: '转为小写', type: 'checkbox', value: true },
        { id: 'maxLen', label: '最大长度', type: 'number', value: 60, min: 5, max: 200 }
      ],
      hint: '适合做 URL 路径或文件名：保留字母数字与中文，其余符号替换为分隔符。',
      sample: '如何快速学习 JavaScript 入门\n2024 年度总结 & 复盘',
      run: function (text, v) {
        var sep = v.sep === '_' ? '_' : '-';
        var maxLen = Math.max(5, Math.min(200, Number(v.maxLen) || 60));
        var out = text.replace(/\r/g, '').split('\n').map(function (line) {
          var slug = line.trim()
            .replace(/['’"“”]/g, '')
            .replace(/[^\w\u4e00-\u9fa5]+/g, sep)
            .replace(new RegExp('^[' + sep + ']+|[' + sep + ']+$', 'g'), '');
          if (v.lower) slug = slug.toLowerCase();
          if (slug.length > maxLen) {
            slug = slug.slice(0, maxLen);
            // 不在分隔符上截断：去掉尾部残缺片段
            if (sep === '-') slug = slug.replace(/-[^-]*$/, '');
          }
          return slug;
        }).filter(function (s) { return s.length; });
        if (!out.length) return { error: '没有生成任何 Slug，输入可能全是符号' };
        return { output: out.join('\n'), note: '共 ' + out.length + ' 条' };
      }
    });
  }

  /* ------------------------------ 4. 大小写切换 ------------------------------ */
  function renderCaseToggle(root) {
    K.text(root, {
      uid: 'casetoggle',
      inputLabel: '输入内容',
      inputRows: 6,
      options: [
        { id: 'mode', label: '目标风格', type: 'select', value: 'upper',
          options: [
            { value: 'upper', label: '全部大写 HELLO WORLD' },
            { value: 'lower', label: '全部小写 hello world' },
            { value: 'title', label: '每词首字母 Hello World' },
            { value: 'sentence', label: '每句首字母 Hello world. Nice day.' },
            { value: 'swap', label: '大小写互换 hELLO wORLD' }
          ] }
      ],
      sample: 'hello world. this is a test.',
      run: function (text, v) {
        var out = text;
        if (v.mode === 'upper') out = text.toUpperCase();
        else if (v.mode === 'lower') out = text.toLowerCase();
        else if (v.mode === 'title') {
          out = text.replace(/([A-Za-z\u00c0-\u024f]['A-Za-z\u00c0-\u024f]*)/g, function (w) {
            return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
          });
        } else if (v.mode === 'sentence') {
          out = text.toLowerCase().replace(/(^\s*[a-z])|([.!?]\s+[a-z])/g, function (m) { return m.toUpperCase(); });
        } else {
          out = text.replace(/[A-Za-z]/g, function (c) {
            return c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase();
          });
        }
        return { output: out };
      }
    });
  }

  /* ------------------------------ 5. 移除 emoji ------------------------------ */
  // 覆盖 emoji 各主要区段 + 变体选择符 + 零宽字符 + BOM
  var INVISIBLE_RE = /[\u200b-\u200f\u2028\u2029\u202a-\u202e\u2060\u2066-\u2069\ufeff]/g;
  var EMOJI_RE = /[\u{1f000}-\u{1ffff}]|[\u{e000}-\u{f8ff}]|[\u2600-\u27bf]|[\u2190-\u21ff\u2300-\u23ff]|[\ufe00-\ufe0f]|[\u{1f1e6}-\u{1f1ff}]/gu;

  function renderEmojiStrip(root) {
    K.text(root, {
      uid: 'emojistrip',
      inputLabel: '输入内容',
      inputRows: 7,
      options: [
        { id: 'mode', label: '移除对象', type: 'select', value: 'emoji',
          options: [{ value: 'emoji', label: '仅移除 emoji / 表情符号' }, { value: 'all', label: 'emoji + 零宽字符等不可见字符' }] },
        { id: 'space', label: '替换为空格', type: 'checkbox' }
      ],
      sample: '任务完成 ✅ 今晚聚餐 🍻🎉 记得带伞 ☔️',
      run: function (text, v) {
        var cleaned = text.replace(EMOJI_RE, v.space ? ' ' : '');
        if (v.mode === 'all') cleaned = cleaned.replace(INVISIBLE_RE, '');
        cleaned = cleaned.replace(/ {2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
        var removed = text.length - text.replace(EMOJI_RE, '').length;
        return {
          output: cleaned,
          note: '移除了 ' + removed + ' 个符号字符' + (v.mode === 'all' ? '及不可见字符' : '')
        };
      }
    });
  }

  /* ------------------------------ 6. Markdown 转义 ------------------------------ */
  var MD_SPECIAL = /[\\`*_{}[\]()#+\-.!>|~]/g;

  function renderMdEscape(root) {
    K.text(root, {
      uid: 'mdescape',
      inputLabel: '输入内容',
      inputRows: 7,
      options: [
        { id: 'mode', label: '方向', type: 'select', value: 'escape',
          options: [{ value: 'escape', label: '转义（防止被 Markdown 解析）' }, { value: 'unescape', label: '反转义（还原 \\. 这类写法）' }] }
      ],
      sample: '价格 *仅限今日*！1. 优惠 #爆款\n[点击这里](https://example.com) 还有 _下划线_',
      run: function (text, v) {
        var out = v.mode === 'escape'
          ? text.replace(MD_SPECIAL, '\\$&')
          : text.replace(/\\([\\`*_{}[\]()#+\-.!>|~])/g, '$1');
        return { output: out, note: v.mode === 'escape' ? '特殊字符前已加反斜杠' : '已去掉转义反斜杠' };
      }
    });
  }

  /* ------------------------------ 7. NATO 音标字母 ------------------------------ */
  var NATO = {
    A: 'Alfa', B: 'Bravo', C: 'Charlie', D: 'Delta', E: 'Echo', F: 'Foxtrot', G: 'Golf',
    H: 'Hotel', I: 'India', J: 'Juliett', K: 'Kilo', L: 'Lima', M: 'Mike', N: 'November',
    O: 'Oscar', P: 'Papa', Q: 'Quebec', R: 'Romeo', S: 'Sierra', T: 'Tango', U: 'Uniform',
    V: 'Victor', W: 'Whiskey', X: 'X-ray', Y: 'Yankee', Z: 'Zulu',
    '0': 'Zero', '1': 'One', '2': 'Two', '3': 'Three', '4': 'Four',
    '5': 'Five', '6': 'Six', '7': 'Seven', '8': 'Eight', '9': 'Nine'
  };

  function renderNato(root) {
    K.text(root, {
      uid: 'nato',
      inputLabel: '输入字母数字',
      inputRows: 4,
      options: [
        { id: 'join', label: '连接方式', type: 'select', value: 'space',
          options: [{ value: 'space', label: '空格分隔' }, { value: 'dash', label: '短横线分隔' }, { value: 'line', label: '每词一行' }] }
      ],
      hint: '国际无线电通话字母表（ICAO），用于电话里逐字报「ABC」时避免听错。',
      sample: 'CN2024-XYZ',
      run: function (text, v) {
        var joiner = v.join === 'dash' ? '-' : v.join === 'line' ? '\n' : ' ';
        var words = [];
        var unknown = [];
        text.toUpperCase().replace(/\s/g, '').split('').forEach(function (ch) {
          if (NATO[ch]) words.push(NATO[ch]);
          else unknown.push(ch);
        });
        if (!words.length) return { error: '没有可转换的字母或数字' };
        return {
          output: words.join(joiner),
          note: unknown.length ? '已跳过无法转换的字符：' + unknown.join(' ') : '共转换 ' + words.length + ' 个字符'
        };
      }
    });
  }

  /* ------------------------------ 8. 竖排文字 ------------------------------ */
  function renderVertical(root) {
    K.text(root, {
      uid: 'vertical',
      inputLabel: '输入内容',
      inputRows: 6,
      options: [
        { id: 'cols', label: '每列字数（0 = 全文一列）', type: 'number', value: 0, min: 0, max: 40 }
      ],
      hint: '传统竖排是从上到下、从右往左读：输出每一「列」是一行，第一列在右侧靠前。',
      sample: '床前明月光疑是地上霜举头望明月低头思故乡',
      run: function (text, v) {
        var chars = text.replace(/\s/g, '').split('');
        if (!chars.length) return { error: '请输入文字' };
        var cols = Math.max(0, Math.min(40, Number(v.cols) || 0));
        var columns;
        if (!cols) columns = [chars];
        else {
          columns = [];
          for (var i = 0; i < chars.length; i += cols) columns.push(chars.slice(i, i + cols));
        }
        // 竖排从右往左：先反转列顺序，再按行拼接
        var reversed = columns.slice().reverse();
        var height = Math.max.apply(null, columns.map(function (c) { return c.length; }));
        var lines = [];
        for (var row = 0; row < height; row += 1) {
          lines.push(reversed.map(function (col) { return row < col.length ? col[row] : '　'; }).join(' '));
        }
        return {
          output: lines.join('\n'),
          note: '共 ' + columns.length + ' 列，每列最多 ' + height + ' 字（从右往左读）'
        };
      }
    });
  }

  /* ------------------------------ 9. 首字母缩写 ------------------------------ */
  function renderAbbrev(root) {
    K.text(root, {
      uid: 'abbrev',
      inputLabel: '输入标题（每行一条）',
      inputRows: 6,
      options: [
        { id: 'mode', label: '取字方式', type: 'select', value: 'word',
          options: [
            { value: 'word', label: '每个单词取首字母（Acronyms）' },
            { value: 'cn', label: '中文取首字 / 英文取词首字母' },
            { value: 'lower', label: '单词首字母小写（camel 式）' }
          ] },
        { id: 'upper', label: '结果大写', type: 'checkbox', value: true }
      ],
      sample: 'World Health Organization\n轻量级目录访问协议 LDAP 简称',
      run: function (text, v) {
        var lines = text.replace(/\r/g, '').split('\n').filter(function (l) { return l.trim(); });
        if (!lines.length) return { error: '请输入标题' };
        var result = lines.map(function (line) {
          // 中文单字直接取；英文按连续字母切词
          var tokens = line.match(/[\u4e00-\u9fa5]|[A-Za-z]+/g) || [];
          var abbr = tokens.map(function (t) { return t.charAt(0); }).join('');
          if (v.mode === 'lower') return abbr.charAt(0).toUpperCase() + abbr.slice(1).toLowerCase();
          if (v.mode === 'cn' && !v.upper) return abbr;
          return v.upper === false ? abbr : abbr.toUpperCase();
        });
        return { output: result.join('\n'), note: '共 ' + result.length + ' 条缩写' };
      }
    });
  }

  /* ------------------------------ 10. 命名拆词 ------------------------------ */
  function renderCamelSplit(root) {
    K.text(root, {
      uid: 'camelsplit',
      inputLabel: '输入标识符（每行一个）',
      inputRows: 6,
      options: [
        { id: 'join', label: '输出连接方式', type: 'select', value: 'space',
          options: [
            { value: 'space', label: '空格 userName → user name' },
            { value: 'kebab', label: '短横线 user-name' },
            { value: 'snake', label: '下划线 user_name' }
          ] }
      ],
      hint: '支持 camelCase、PascalCase、snake_case、kebab-case 与 SCREAMING_SNAKE 混合输入。',
      sample: 'userName\nHTTPResponseCode\nparse_json_string\nget-user-by-id',
      run: function (text, v) {
        var joiner = v.join === 'kebab' ? '-' : v.join === 'snake' ? '_' : ' ';
        var lines = text.replace(/\r/g, '').split('\n').filter(function (l) { return l.trim(); });
        if (!lines.length) return { error: '请输入标识符' };
        var result = lines.map(function (line) {
          var words = line
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')        // camelCase 边界
            .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')     // HTTPResponse 边界
            .replace(/[_\-]+/g, ' ')
            .trim().split(/\s+/).filter(Boolean);
          var joined = words.join(joiner);
          return v.join === 'kebab' ? joined.toLowerCase() : v.join === 'snake' ? joined.toLowerCase() : joined;
        });
        return { output: result.join('\n'), note: '共拆分 ' + result.length + ' 个标识符' };
      }
    });
  }

  /* ------------------------------ 11. 空白压缩 ------------------------------ */
  function renderSqueeze(root) {
    K.text(root, {
      uid: 'squeeze',
      inputLabel: '输入内容',
      inputRows: 7,
      options: [
        { id: 'spaces', label: '行内连续空白', type: 'select', value: 'one',
          options: [
            { value: 'one', label: '压缩为 1 个空格' },
            { value: 'none', label: '全部删除' },
            { value: 'keep', label: '保留不动' }
          ] },
        { id: 'blank', label: '连续空行', type: 'select', value: 'one',
          options: [
            { value: 'one', label: '压缩为 1 个空行' },
            { value: 'none', label: '删除全部空行' },
            { value: 'keep', label: '保留不动' }
          ] },
        { id: 'trim', label: '去掉行首尾空白', type: 'checkbox', value: true }
      ],
      hint: '复制 PDF、网页或日志后常见多余空白，一键压缩再粘贴。',
      sample: '今天    天气   不错\n\n\n\n出门  散步。',
      run: function (text, v) {
        var out = text;
        if (v.spaces === 'one') out = out.replace(/[^\S\n]+/g, ' ');
        else if (v.spaces === 'none') out = out.replace(/[^\S\n]+/g, '');
        if (v.trim) out = out.split('\n').map(function (l) { return l.trim(); }).join('\n');
        if (v.blank === 'one') out = out.replace(/\n\s*\n+/g, '\n\n');
        else if (v.blank === 'none') out = out.replace(/\n\s*\n+/g, '\n');
        return { output: out.replace(/^\n+|\n+$/g, ''), note: '压缩完成，原 ' + text.length + ' 字符 → 现 ' + out.length + ' 字符' };
      }
    });
  }

  /* ------------------------------ 12. 段落排版 ------------------------------ */
  function renderParaFormat(root) {
    K.text(root, {
      uid: 'paraformat',
      inputLabel: '输入内容（空行分隔段落）',
      inputRows: 9,
      options: [
        { id: 'indent', label: '段首缩进', type: 'select', value: 'cn',
          options: [
            { value: 'cn', label: '中文习惯：首行空两格' },
            { value: 'none', label: '不缩进' },
            { value: 'four', label: '首行空四格' }
          ] },
        { id: 'blank', label: '段间空行', type: 'checkbox', value: true },
        { id: 'cnSpace', label: '中英文之间加空格', type: 'checkbox', value: true }
      ],
      hint: '从网页复制的文章往往一行一句，此工具会按空行把碎行合并回完整段落。',
      sample: '人工智能正在\n改变我们的生活。\n\n它在医疗、教育等领域\n都有广泛应用。',
      run: function (text, v) {
        var paras = text.replace(/\r/g, '').split(/\n\s*\n+/)
          .map(function (p) { return p.replace(/\n/g, '').trim(); })
          .filter(function (p) { return p.length; });
        if (!paras.length) return { error: '请输入内容' };
        var indent = v.indent === 'cn' ? '　　' : v.indent === 'four' ? '    ' : '';
        var out = paras.map(function (p) {
          var body = v.cnSpace
            ? p.replace(/([\u4e00-\u9fa5])([A-Za-z0-9@#$])/g, '$1 $2').replace(/([A-Za-z0-9@#$])([\u4e00-\u9fa5])/g, '$1 $2')
            : p;
          return indent + body;
        });
        return {
          output: out.join(v.blank ? '\n\n' : '\n'),
          note: '共 ' + paras.length + ' 个段落，已合并断行'
        };
      }
    });
  }

  /* ------------------------------ 13. 按列 / 字段截取 ------------------------------ */
  function renderCut(root) {
    K.text(root, {
      uid: 'cut',
      inputLabel: '输入内容（每行一条）',
      inputRows: 8,
      options: [
        { id: 'mode', label: '截取方式', type: 'select', value: 'field',
          options: [
            { value: 'field', label: '按字段（第 N 列）' },
            { value: 'char', label: '按字符位置（cut -c）' }
          ] },
        { id: 'field', label: '字段序号（从 1 开始，逗号分隔）', type: 'text', value: '1,3' },
        { id: 'sep', label: '字段分隔符', type: 'text', value: ',' },
        { id: 'range', label: '字符范围（如 1-5 或 5-）', type: 'text', placeholder: '仅按字符模式生效' }
      ],
      hint: '字段模式等价于 cut -d, -f1,3；字符模式等价于 cut -c1-5。越界的字段返回空。',
      sample: '张三,男,28,北京\n李四,女,32,上海\n王五,男,25,广州',
      run: function (text, v) {
        var lines = text.replace(/\r/g, '').split('\n').filter(function (l) { return l.length; });
        if (!lines.length) return { error: '请输入内容' };
        if (v.mode === 'field') {
          var indexes = v.field.split(/[,，\s]+/).map(Number).filter(function (n) { return n >= 1; });
          if (!indexes.length) return { error: '请填写字段序号，如 1,3' };
          var sep = v.sep || ',';
          var out = lines.map(function (line) {
            return indexes.map(function (i) { return (line.split(sep)[i - 1] || '').trim(); }).join(sep);
          });
          return { output: out.join('\n'), note: '取第 ' + indexes.join('、') + ' 列，共 ' + out.length + ' 行' };
        }
        var m = (v.range || '').match(/^(\d*)(-?)(\d*)$/);
        if (!m || (!m[1] && !m[3])) return { error: '字符范围格式不合法，示例：1-5、5- 或 -10' };
        var start = m[1] ? Number(m[1]) : 1;
        var end = m[3] ? Number(m[3]) : Infinity;
        if (start < 1 || end < start) return { error: '范围起点需 ≥ 1 且不小于终点' };
        var out2 = lines.map(function (line) {
          return Array.from(line).slice(start - 1, end === Infinity ? undefined : end).join('');
        });
        return { output: out2.join('\n'), note: '取第 ' + start + '–' + (end === Infinity ? '末尾' : end) + ' 个字符' };
      }
    });
  }

  /* ------------------------------ 14. HTML 转纯文本 ------------------------------ */
  function decodeBasicEntities(html) {
    var named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', copy: '©', reg: '®', mdash: '—', ndash: '–', hellip: '…', middot: '·' };
    return html
      .replace(/&#x([0-9a-fA-F]+);/g, function (_, hex) { return String.fromCodePoint(parseInt(hex, 16)); })
      .replace(/&#(\d+);/g, function (_, dec) { return String.fromCodePoint(Number(dec)); })
      .replace(/&([a-z]+);/gi, function (all, name) { return named[name.toLowerCase()] || all; });
  }

  function renderStripHtml(root) {
    K.text(root, {
      uid: 'striptext',
      inputLabel: '输入 HTML',
      inputRows: 9,
      mono: true,
      options: [
        { id: 'blockNewline', label: '块级标签后换行', type: 'checkbox', value: true },
        { id: 'href', label: '保留链接地址', type: 'checkbox' }
      ],
      hint: '去掉 script / style 内容与全部标签，还原可读纯文本，方便粘贴到不支持 HTML 的地方。',
      sample: '<h2>会议纪要</h2><p>时间：<b>周五</b> 14:00<br>地点：3 楼会议室</p><p>详情见 <a href="https://example.com/doc">共享文档</a>。</p>',
      run: function (text, v) {
        var out = text
          .replace(/<!--[\s\S]*?-->/g, '')
          .replace(/<(script|style|head)\b[\s\S]*?<\/\1\s*>/gi, '')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/(p|div|h[1-6]|li|tr|section|article|blockquote)\s*>/gi, v.blockNewline ? '\n' : ' ')
          .replace(/<(p|div|h[1-6]|li|tr|section|article|blockquote)\b[^>]*>/gi, v.blockNewline ? '\n' : ' ')
          .replace(/<a\b[^>]*href=["']([^"']*)["'][^>]*>/gi, v.href ? ' [$1] ' : '')
          .replace(/<[^>]+>/g, '');
        out = decodeBasicEntities(out)
          .replace(/[ \t]+/g, ' ')
          .split('\n').map(function (l) { return l.trim(); })
          .join('\n').replace(/\n{2,}/g, '\n').trim();
        if (!out) return { error: '没有提取到文本内容' };
        return { output: out, note: '已去除标签，保留 ' + out.length + ' 字符纯文本' };
      }
    });
  }

  window.ToolModules['text-transpose'] = renderTranspose;
  window.ToolModules['text-grep'] = renderGrep;
  window.ToolModules['text-slug'] = renderSlug;
  window.ToolModules['text-case-toggle'] = renderCaseToggle;
  window.ToolModules['text-emoji-strip'] = renderEmojiStrip;
  window.ToolModules['text-md-escape'] = renderMdEscape;
  window.ToolModules['text-nato'] = renderNato;
  window.ToolModules['text-vertical'] = renderVertical;
  window.ToolModules['text-abbrev'] = renderAbbrev;
  window.ToolModules['text-camel-split'] = renderCamelSplit;
  window.ToolModules['text-squeeze'] = renderSqueeze;
  window.ToolModules['text-para-format'] = renderParaFormat;
  window.ToolModules['text-cut'] = renderCut;
  window.ToolModules['text-strip-html'] = renderStripHtml;
})();
