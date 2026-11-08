/* =============================================================================
 * 开发辅助工具包 · 第四批（16 个）
 * -----------------------------------------------------------------------------
 * uuid-validate    UUID 校验与版本识别
 * semver-compare   语义化版本比较
 * json-query       JSON 与 query string 互转
 * commit-lint      Conventional Commits 校验
 * changelog-gen    提交列表生成 CHANGELOG
 * code-stats       代码行数统计
 * indent-convert   缩进风格转换
 * url-join         URL 片段拼接
 * css-var-extract  CSS 变量提取
 * api-mock         字段定义生成 JSON 示例
 * datauri-info     Data URI 解析
 * regex-escape     正则元字符转义
 * sql-where        SQL WHERE 条件生成
 * number-format    数字格式化
 * env-example      .env 生成 .env.example
 * path-normalize   路径风格转换
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  /* ------------------------------ 1. UUID 校验 ------------------------------ */
  function renderUuidValidate(root) {
    K.text(root, {
      uid: 'uuidv',
      inputLabel: 'UUID（每行一个，可批量）',
      inputRows: 6,
      actionLabel: '校验',
      options: [
        { id: 'strict', label: '严格模式（版本位与变体位必须合法）', type: 'checkbox', value: true }
      ],
      sample: '550e8400-e29b-41d4-a716-446655440000\n018f3b6a-7c2d-7f3a-9b1e-2d4c6e8a0b1c\nnot-a-uuid',
      run: function (text, opt) {
        var pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        var lines = text.split(/\r?\n/).filter(function (line) { return line.trim() !== ''; });
        var rows = [];
        var valid = 0;
        lines.forEach(function (line) {
          var value = line.trim();
          var ok = pattern.test(value);
          var version = ok ? value.charAt(14) : '—';
          var variant = ok ? value.charAt(19).toLowerCase() : '—';
          var variantOk = ['8', '9', 'a', 'b'].indexOf(variant) >= 0;
          if (opt.strict && ok && (!/^[1-8]$/.test(version) || !variantOk)) ok = false;
          if (ok) valid += 1;
          rows.push([ok ? '✓' : '✗', value, version, variantOk ? 'RFC 4122' : '非标准', ok ? '合法' : '不合法']);
        });
        return {
          output: rows.map(function (row) { return row[0] + ' ' + row[1]; }).join('\n'),
          html: K.table(['', 'UUID', '版本', '变体', '结论'], rows),
          note: '共 ' + lines.length + ' 条，合法 ' + valid + ' 条'
        };
      }
    });
  }

  /* ------------------------------ 2. 版本比较 ------------------------------ */
  function parseSemver(text) {
    var match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/.exec(String(text).trim());
    if (!match) return null;
    return {
      raw: text.trim(),
      major: Number(match[1]),
      minor: Number(match[2]),
      patch: Number(match[3]),
      pre: match[4] ? match[4].split('.') : [],
      build: match[5] || ''
    };
  }

  function compareSemver(a, b) {
    var keys = ['major', 'minor', 'patch'];
    for (var i = 0; i < keys.length; i += 1) {
      if (a[keys[i]] !== b[keys[i]]) return a[keys[i]] > b[keys[i]] ? 1 : -1;
    }
    if (!a.pre.length && !b.pre.length) return 0;
    if (!a.pre.length) return 1;
    if (!b.pre.length) return -1;
    var len = Math.max(a.pre.length, b.pre.length);
    for (var j = 0; j < len; j += 1) {
      var pa = a.pre[j];
      var pb = b.pre[j];
      if (pa === undefined) return -1;
      if (pb === undefined) return 1;
      var na = /^\d+$/.test(pa);
      var nb = /^\d+$/.test(pb);
      if (na && nb) {
        if (Number(pa) !== Number(pb)) return Number(pa) > Number(pb) ? 1 : -1;
      } else if (na !== nb) {
        return na ? -1 : 1;
      } else if (pa !== pb) {
        return pa > pb ? 1 : -1;
      }
    }
    return 0;
  }

  function renderSemverCompare(root) {
    K.form(root, {
      uid: 'semver',
      actionLabel: '比较',
      fields: [
        { id: 'a', label: '版本 A', type: 'text', value: '1.2.3' },
        { id: 'b', label: '版本 B', type: 'text', value: '1.10.0' },
        { id: 'list', label: '或批量排序（每行一个版本）', type: 'textarea', rows: 5, wide: true, value: '' }
      ],
      hint: '遵循 SemVer 2.0：主版本.次版本.修订号，预发布版本小于正式版本（1.0.0-rc.1 < 1.0.0）。',
      run: function (v) {
        if (String(v.list || '').trim()) {
          var items = String(v.list).split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
          var parsed = items.map(function (item) { return parseSemver(item); });
          var bad = items.filter(function (item, index) { return !parsed[index]; });
          var valid = parsed.filter(Boolean).sort(compareSemver);
          return {
            output: valid.map(function (item) { return item.raw; }).join('\n'),
            note: bad.length ? '已排序 ' + valid.length + ' 个，忽略 ' + bad.length + ' 个非法版本：' + bad.join('、') : '升序排列 ' + valid.length + ' 个版本'
          };
        }
        var a = parseSemver(v.a);
        var b = parseSemver(v.b);
        if (!a) return { error: '版本 A 不符合 SemVer 格式' };
        if (!b) return { error: '版本 B 不符合 SemVer 格式' };
        var result = compareSemver(a, b);
        var symbols = ['=', '>', '<'];
        var diff = a.major !== b.major ? 'MAJOR（不兼容变更）' : a.minor !== b.minor ? 'MINOR（向下兼容的新功能）' : a.patch !== b.patch ? 'PATCH（向下兼容的修复）' : a.pre.join('.') !== b.pre.join('.') ? '预发布标识不同' : '完全相同';
        return {
          rows: [
            { key: '比较结果', value: 'A ' + symbols[result + 1] + ' B', mono: false },
            { key: '最大版本', value: result > 0 ? a.raw : result < 0 ? b.raw : '两者相等' },
            { key: '差异级别', value: diff },
            { key: '建议升级', value: a.major !== b.major ? 'MAJOR 变更，需人工确认兼容性' : a.minor !== b.minor ? 'MINOR 变更，可按需求升级' : 'PATCH 变更，可安全升级' }
          ]
        };
      }
    });
  }

  /* ------------------------------ 3. JSON 与 query ------------------------------ */
  function flatten(value, prefix, out) {
    if (value === null || typeof value !== 'object') {
      out.push([prefix, String(value)]);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(function (item, index) { flatten(item, prefix + '[' + index + ']', out); });
      return;
    }
    Object.keys(value).forEach(function (key) {
      flatten(value[key], prefix ? prefix + '.' + key : key, out);
    });
  }

  function unflatten(pairs) {
    var root = {};
    pairs.forEach(function (pair) {
      var keys = pair[0].replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
      var cursor = root;
      keys.forEach(function (key, index) {
        var nextIsIndex = /^\d+$/.test(keys[index + 1] || '');
        if (index === keys.length - 1) {
          cursor[key] = pair[1];
          return;
        }
        if (cursor[key] === undefined) cursor[key] = nextIsIndex ? [] : {};
        cursor = cursor[key];
      });
    });
    return root;
  }

  function renderJsonQuery(root) {
    K.text(root, {
      uid: 'jsonquery',
      inputLabel: 'JSON 或 query string',
      inputRows: 8,
      actionLabel: '转换',
      options: [
        { id: 'mode', label: '方向', type: 'select', value: 'toQuery', options: [
          { value: 'toQuery', label: 'JSON → query string' },
          { value: 'toJson', label: 'query string → JSON' }
        ] },
        { id: 'encode', label: '对值做 URL 编码', type: 'checkbox', value: true }
      ],
      sample: '{"user":{"name":"XFM","tags":["工具","前端"]},"page":2}',
      run: function (text, opt) {
        if (opt.mode === 'toQuery') {
          var data;
          try {
            data = JSON.parse(text);
          } catch (error) {
            return { error: 'JSON 解析失败：' + error.message };
          }
          var flat = [];
          flatten(data, '', flat);
          var query = flat.map(function (pair) {
            var key = opt.encode ? encodeURIComponent(pair[0]) : pair[0];
            var value = opt.encode ? encodeURIComponent(pair[1]) : pair[1];
            return key + '=' + value;
          }).join('&');
          return {
            output: query,
            note: '已展开 ' + flat.length + ' 个字段（数组用 [i] 下标表示）'
          };
        }
        var pairs = text.replace(/^\?/, '').split('&').filter(Boolean).map(function (item) {
          var pos = item.indexOf('=');
          var key = pos < 0 ? item : item.slice(0, pos);
          var value = pos < 0 ? '' : item.slice(pos + 1);
          return [decodeURIComponent(key.replace(/\+/g, ' ')), decodeURIComponent(value.replace(/\+/g, ' '))];
        });
        return {
          output: JSON.stringify(unflatten(pairs), null, 2),
          note: '共解析 ' + pairs.length + ' 个参数，同名 key 后者覆盖前者'
        };
      }
    });
  }

  /* ------------------------------ 4. Commit 校验 ------------------------------ */
  var COMMIT_TYPES = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'];

  function renderCommitLint(root) {
    K.text(root, {
      uid: 'commitlint',
      inputLabel: '提交信息（可多行，每行一条）',
      inputRows: 7,
      actionLabel: '校验',
      options: [
        { id: 'maxLen', label: '标题最大长度', type: 'number', value: 72, min: 20, max: 200, step: 1 },
        { id: 'scope', label: 'scope 为必填', type: 'checkbox', value: false }
      ],
      sample: 'feat(tools): 新增回到顶部按钮\nfix footer 年份错误\nupdate readme.',
      run: function (text, opt) {
        var pattern = /^(\w+)(?:\(([^)]+)\))?(!)?:\s(.+)$/;
        var lines = text.split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
        var rows = [];
        lines.forEach(function (line) {
          var match = pattern.exec(line);
          var issues = [];
          if (!match) {
            issues.push('不符合 type(scope): subject 格式');
          } else {
            if (COMMIT_TYPES.indexOf(match[1]) < 0) issues.push('type 不在推荐列表：' + match[1]);
            if (opt.scope && !match[2]) issues.push('缺少 scope');
            if (match[4].length > Number(opt.maxLen)) issues.push('标题过长（' + match[4].length + ' > ' + opt.maxLen + '）');
            if (/[.。]$/.test(match[4])) issues.push('标题结尾不要加句号');
            if (match[4].charAt(0) === match[4].charAt(0).toUpperCase() && /[A-Z]/.test(match[4].charAt(0))) issues.push('标题建议小写开头');
          }
          rows.push([
            issues.length ? '✗' : '✓',
            line,
            match ? match[1] : '—',
            match ? (match[2] || '—') : '—',
            issues.length ? issues.join('；') : '通过'
          ]);
        });
        return {
          output: rows.map(function (row) { return row[0] + ' ' + row[1]; }).join('\n'),
          html: K.table(['', '提交信息', 'type', 'scope', '结论'], rows),
          note: '共 ' + lines.length + ' 条，通过 ' + rows.filter(function (row) { return row[0] === '✓'; }).length + ' 条（Conventional Commits）'
        };
      }
    });
  }

  /* ------------------------------ 5. CHANGELOG ------------------------------ */
  var TYPE_LABEL = {
    feat: '新增功能', fix: '问题修复', docs: '文档', style: '代码格式',
    refactor: '重构', perf: '性能优化', test: '测试', build: '构建', ci: '持续集成',
    chore: '杂项', revert: '回滚'
  };
  var TYPE_ORDER = ['feat', 'fix', 'perf', 'refactor', 'docs', 'style', 'test', 'build', 'ci', 'chore', 'revert'];

  function renderChangelogGen(root) {
    K.form(root, {
      uid: 'changelog',
      actionLabel: '生成 CHANGELOG',
      fields: [
        { id: 'version', label: '版本号', type: 'text', value: '1.1.0' },
        { id: 'date', label: '日期', type: 'date', value: '' },
        { id: 'commits', label: '提交列表（每行一条，支持 type(scope): desc）', type: 'textarea', rows: 8, wide: true, mono: true,
          value: 'feat(ui): 右下角新增回到顶部按钮\nfix(footer): 修正版权年份\nchore: 添加 MIT 许可证\nperf(json): 大文件解析改用流式分段' },
        { id: 'link', label: '提交链接前缀（可选）', type: 'text', value: '' }
      ],
      hint: '按 Conventional Commits 的 type 归类，未识别的行会归入「其他变更」。',
      run: function (v) {
        var lines = String(v.commits || '').split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
        if (!lines.length) return { error: '请填写提交列表' };
        var date = v.date || new Date().toISOString().slice(0, 10);
        var groups = {};
        var others = [];
        lines.forEach(function (line) {
          var clean = line.replace(/^[-*]\s*/, '');
          var match = /^(\w+)(?:\(([^)]+)\))?!?:\s*(.+)$/.exec(clean);
          if (match && TYPE_LABEL[match[1]]) {
            groups[match[1]] = groups[match[1]] || [];
            groups[match[1]].push(match[2] ? '**' + match[2] + '**：' + match[3] : match[3]);
          } else {
            others.push(clean);
          }
        });
        var out = ['## [' + (v.version || '未发布') + '] - ' + date, ''];
        TYPE_ORDER.forEach(function (type) {
          if (!groups[type]) return;
          out.push('### ' + TYPE_LABEL[type]);
          groups[type].forEach(function (item) { out.push('- ' + item); });
          out.push('');
        });
        if (others.length) {
          out.push('### 其他变更');
          others.forEach(function (item) { out.push('- ' + item); });
          out.push('');
        }
        var text = out.join('\n');
        return {
          output: text,
          html: '<pre class="code-block">' + K.esc(text) + '</pre>' +
            '<div class="btn-row"><button type="button" class="btn ghost" data-copy="' + K.esc(text) + '">复制 CHANGELOG</button></div>',
          note: '统计：' + Object.keys(groups).map(function (key) { return TYPE_LABEL[key] + ' ' + groups[key].length; }).join(' · ')
        };
      }
    });
  }

  /* ------------------------------ 6. 代码行数 ------------------------------ */
  function renderCodeStats(root) {
    K.text(root, {
      uid: 'codestats',
      inputLabel: '粘贴代码',
      inputRows: 10,
      actionLabel: '统计',
      hideOutput: true,
      options: [
        { id: 'lang', label: '注释语法', type: 'select', value: 'c', options: [
          { value: 'c', label: 'C 系（// 与 /* */）' },
          { value: 'hash', label: '井号（#，Python / Shell）' },
          { value: 'html', label: 'HTML / XML（<!-- -->）' },
          { value: 'sql', label: 'SQL（-- 与 /* */）' }
        ] }
      ],
      sample: '/* 示例 */\nfunction add(a, b) {\n  // 求和\n  return a + b;\n}\n\nconsole.log(add(1, 2));',
      run: function (text, opt) {
        var lines = text.split(/\r?\n/);
        var blank = 0;
        var comment = 0;
        var code = 0;
        var inBlock = false;
        lines.forEach(function (line) {
          var trimmed = line.trim();
          if (trimmed === '') { blank += 1; return; }
          if (inBlock) {
            comment += 1;
            if (trimmed.indexOf('*/') >= 0) inBlock = false;
            return;
          }
          if (opt.lang === 'hash' && trimmed.charAt(0) === '#') { comment += 1; return; }
          if (opt.lang === 'sql' && trimmed.indexOf('--') === 0) { comment += 1; return; }
          if ((opt.lang === 'c' || opt.lang === 'sql') && trimmed.indexOf('//') === 0) { comment += 1; return; }
          if (opt.lang === 'c' || opt.lang === 'sql') {
            if (trimmed.indexOf('/*') === 0) {
              comment += 1;
              if (trimmed.indexOf('*/') < 0) inBlock = true;
              return;
            }
          }
          if (opt.lang === 'html' && trimmed.indexOf('<!--') === 0) { comment += 1; return; }
          code += 1;
        });
        var chars = text.length;
        return {
          html: K.stats([
            { label: '总行数', value: lines.length },
            { label: '代码行', value: code },
            { label: '注释行', value: comment },
            { label: '空行', value: blank },
            { label: '代码占比', value: K.num(code / (lines.length || 1) * 100, 1) + '%' },
            { label: '字符数', value: K.group(chars) }
          ]),
          note: '注释统计为按行识别，行尾注释计入代码行'
        };
      }
    });
  }

  /* ------------------------------ 7. 缩进转换 ------------------------------ */
  function renderIndentConvert(root) {
    K.text(root, {
      uid: 'indentconv',
      inputLabel: '源代码',
      inputRows: 10,
      actionLabel: '转换',
      options: [
        { id: 'to', label: '转换为', type: 'select', value: '2', options: [
          { value: '2', label: '2 空格' },
          { value: '4', label: '4 空格' },
          { value: '8', label: '8 空格' },
          { value: 'tab', label: '制表符 Tab' }
        ] },
        { id: 'fromWidth', label: '原缩进宽度（空格数）', type: 'number', value: 4, min: 1, max: 8, step: 1 }
      ],
      sample: 'function demo() {\n    if (true) {\n        return 1;\n    }\n}',
      run: function (text, opt) {
        var unit = opt.to === 'tab' ? '\t' : new Array(Number(opt.to) + 1).join(' ');
        var fromWidth = Number(opt.fromWidth) || 4;
        var out = text.split(/\r?\n/).map(function (line) {
          var match = /^[\t ]*/.exec(line)[0];
          var spaces = match.replace(/\t/g, new Array(fromWidth + 1).join(' ')).length;
          var levels = spaces / fromWidth;
          var rest = line.slice(match.length);
          if (opt.to === 'tab') return new Array(Math.round(levels) + 1).join('\t') + rest;
          return new Array(Math.round(levels * Number(opt.to)) + 1).join(' ') + rest;
        }).join('\n');
        return { output: out, note: '按缩进层级换算，' + (opt.to === 'tab' ? '输出制表符' : '每级 ' + opt.to + ' 空格') };
      }
    });
  }

  /* ------------------------------ 8. URL 拼接 ------------------------------ */
  function renderUrlJoin(root) {
    K.form(root, {
      uid: 'urljoin',
      actionLabel: '拼接',
      fields: [
        { id: 'base', label: '基础 URL', type: 'text', value: 'https://tools.lovou.pw', wide: true },
        { id: 'parts', label: '路径片段（每行一段）', type: 'textarea', rows: 4, wide: true, value: 'tool\njson-format' },
        { id: 'trailing', label: '保留结尾斜杠', type: 'checkbox', value: false }
      ],
      hint: '自动处理重复斜杠与相对路径（.. 与 .）。',
      run: function (v) {
        var base = String(v.base || '').trim();
        if (!base) return { error: '请填写基础 URL' };
        var parts = String(v.parts || '').split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
        var joined = base.replace(/\/+$/, '') + '/' + parts.map(function (part) {
          return part.replace(/^\/+|\/+$/g, '');
        }).filter(Boolean).join('/');
        var url;
        try {
          url = new URL(joined);
        } catch (error) {
          return { error: '拼接结果不是合法 URL：' + joined };
        }
        var normalized = url.href;
        if (!v.trailing) normalized = normalized.replace(/\/+$/, '');
        return {
          output: normalized,
          rows: [
            { key: '拼接结果', value: normalized },
            { key: '协议', value: url.protocol.replace(':', '') },
            { key: '主机', value: url.host },
            { key: '路径', value: url.pathname },
            { key: '片段数', value: parts.length }
          ],
          note: '已处理重复斜杠与相对路径'
        };
      }
    });
  }

  /* ------------------------------ 9. CSS 变量提取 ------------------------------ */
  function renderCssVarExtract(root) {
    K.text(root, {
      uid: 'cssvar',
      inputLabel: '粘贴 CSS',
      inputRows: 10,
      actionLabel: '提取变量',
      hideOutput: true,
      options: [
        { id: 'onlyVars', label: '只保留变量声明行', type: 'checkbox', value: false }
      ],
      sample: ':root {\n  --primary: #5b5bd6;\n  --radius-lg: 18px;\n  --shadow-1: 0 1px 2px rgba(20,22,31,.04);\n}\n[data-theme="dark"] {\n  --primary: #8b8bf5;\n}',
      run: function (text, opt) {
        var pattern = /(--[A-Za-z0-9-_]+)\s*:\s*([^;{}]+);/g;
        var rows = [];
        var match;
        while ((match = pattern.exec(text))) {
          rows.push([match[1], match[2].trim()]);
        }
        if (!rows.length) return { error: '没有找到 CSS 自定义属性（--var: value;）' };
        var html = K.table(['变量', '值'], rows) +
          '<div class="btn-row"><button type="button" class="btn ghost" data-copy="' +
          K.esc(rows.map(function (row) { return row[0] + ': ' + row[1] + ';'; }).join('\n')) + '">复制为声明</button></div>';
        if (opt.onlyVars) {
          return { html: html, note: '共 ' + rows.length + ' 个变量' };
        }
        return {
          output: rows.map(function (row) { return row[0] + ': ' + row[1] + ';'; }).join('\n'),
          html: html,
          note: '共 ' + rows.length + ' 个变量（同名变量后出现者优先）'
        };
      }
    });
  }

  /* ------------------------------ 10. 字段定义生成 JSON ------------------------------ */
  function renderApiMock(root) {
    K.text(root, {
      uid: 'apimock',
      inputLabel: '字段定义（每行：字段名 类型 [说明]）',
      inputRows: 9,
      actionLabel: '生成 JSON',
      options: [
        { id: 'indent', label: '缩进空格数', type: 'number', value: 2, min: 0, max: 8, step: 1 },
        { id: 'list', label: '输出 JSON 数组（2 条）', type: 'checkbox', value: false }
      ],
      hint: '支持类型：string / number / int / boolean / date / array / object。嵌套字段用 a.b 表示。',
      sample: 'id string 主键\nname string 名称\nage int 年龄\nactive boolean 是否启用\ncreatedAt date 创建时间\ntags array 标签',
      run: function (text, opt) {
        var lines = text.split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
        if (!lines.length) return { error: '请填写字段定义' };
        function sampleOf(type) {
          switch (type) {
            case 'int': return 1;
            case 'number': return 1.5;
            case 'boolean': return true;
            case 'date': return new Date().toISOString().slice(0, 10);
            case 'array': return [];
            case 'object': return {};
            default: return '示例文本';
          }
        }
        var root2 = {};
        lines.forEach(function (line) {
          var parts = line.split(/\s+/);
          var path = parts[0].split('.');
          var type = (parts[1] || 'string').toLowerCase();
          var cursor = root2;
          path.forEach(function (key, index) {
            if (index === path.length - 1) cursor[key] = sampleOf(type);
            else {
              if (typeof cursor[key] !== 'object' || cursor[key] === null) cursor[key] = {};
              cursor = cursor[key];
            }
          });
        });
        var payload = opt.list ? [root2, root2] : root2;
        var json = JSON.stringify(payload, null, Number(opt.indent));
        return {
          output: json,
          html: '<pre class="code-block">' + K.esc(json) + '</pre>',
          note: '共 ' + lines.length + ' 个字段，值为类型占位示例'
        };
      }
    });
  }

  /* ------------------------------ 11. Data URI 解析 ------------------------------ */
  function renderDataUriInfo(root) {
    K.text(root, {
      uid: 'datauri',
      inputLabel: '粘贴 Data URI（data:image/png;base64,...）',
      inputRows: 6,
      actionLabel: '解析',
      hideOutput: true,
      allowEmpty: false,
      run: function (text) {
        var match = /^data:([^;,]*)(;[^,]*)?,(.*)$/s.exec(text.trim());
        if (!match) return { error: '不是合法的 Data URI 格式' };
        var mime = match[1] || 'text/plain';
        var meta = match[2] || '';
        var isBase64 = /base64/i.test(meta);
        var payload = match[3];
        var bytes = isBase64
          ? Math.floor(payload.replace(/=+$/, '').length * 3 / 4)
          : new TextEncoder().encode(decodeURIComponent(payload)).length;
        var rows = [
          { key: 'MIME 类型', value: mime },
          { key: '编码方式', value: isBase64 ? 'Base64' : 'URL 编码', mono: false },
          { key: '数据大小', value: K.formatBytes(bytes) + '（' + K.group(bytes) + ' 字节）' },
          { key: 'URI 总长度', value: K.group(text.trim().length) + ' 字符' },
          { key: '膨胀比例', value: isBase64 ? '约 133%（相对原始二进制）' : '取决于转义字符比例', mono: false },
          { key: '参数', value: meta.replace(/^;/, '') || '无' }
        ];
        var html = K.kv(rows);
        if (/^image\//.test(mime)) {
          html += '<div class="img-card"><img src="' + K.esc(text.trim()) + '" alt="Data URI 预览" style="max-width:100%;display:block"></div>';
        }
        return { html: html, note: '可直接放入 img 的 src 或 CSS 的 url()' };
      }
    });
  }

  /* ------------------------------ 12. 正则转义 ------------------------------ */
  function renderRegexEscape(root) {
    K.text(root, {
      uid: 'regexesc',
      inputLabel: '原始文本',
      actionLabel: '转义',
      options: [
        { id: 'mode', label: '方向', type: 'select', value: 'escape', options: [
          { value: 'escape', label: '转义特殊字符' },
          { value: 'unescape', label: '去除转义' }
        ] }
      ],
      sample: 'a.b*c?d+e(f)[g]{h}|i^j$k\\l',
      run: function (text, opt) {
        if (opt.mode === 'escape') {
          return {
            output: text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            note: '结果可直接传给 new RegExp() 做字面量匹配'
          };
        }
        return {
          output: text.replace(/\\([.*+?^${}()|[\]\\])/g, '$1'),
          note: '仅去除正则元字符上的反斜杠'
        };
      }
    });
  }

  /* ------------------------------ 13. SQL WHERE ------------------------------ */
  function renderSqlWhere(root) {
    K.form(root, {
      uid: 'sqlwhere',
      actionLabel: '生成 WHERE',
      fields: [
        { id: 'rules', label: '条件（每行：字段 运算符 值）', type: 'textarea', rows: 6, wide: true, mono: true,
          value: 'status = 1\ncreated_at >= 2026-01-01\nname LIKE %测试%\nid IN 1,2,3' },
        { id: 'logic', label: '条件连接', type: 'select', value: 'AND', options: [
          { value: 'AND', label: 'AND' },
          { value: 'OR', label: 'OR' }
        ] },
        { id: 'quote', label: '字符串加单引号', type: 'checkbox', value: true }
      ],
      hint: '支持的运算符：= != > < >= <= LIKE IN NOT IN IS NULL IS NOT NULL BETWEEN a,b',
      run: function (v) {
        var lines = String(v.rules || '').split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
        if (!lines.length) return { error: '请至少填写一条条件' };
        var clauses = [];
        for (var i = 0; i < lines.length; i += 1) {
          var line = lines[i];
          var match = /^(\S+)\s+(NOT\s+LIKE|LIKE|NOT\s+IN|IN|IS\s+NOT\s+NULL|IS\s+NULL|BETWEEN|>=|<=|!=|<>|=|>|<)\s*(.*)$/i.exec(line);
          if (!match) return { error: '第 ' + (i + 1) + ' 行格式不正确：' + line };
          var field = match[1];
          var op = match[2].toUpperCase().replace(/\s+/g, ' ');
          var value = (match[3] || '').trim();
          if (op === 'IS NULL' || op === 'IS NOT NULL') { clauses.push(field + ' ' + op); continue; }
          if (op === 'IN' || op === 'NOT IN') {
            var items = value.split(',').map(function (item) { return item.trim(); }).filter(Boolean);
            var quoted = items.map(function (item) {
              if (/^-?\d+(\.\d+)?$/.test(item)) return item;
              return v.quote ? "'" + item.replace(/'/g, "''") + "'" : item;
            });
            clauses.push(field + ' ' + op + ' (' + quoted.join(', ') + ')');
            continue;
          }
          if (op === 'BETWEEN') {
            var range = value.split(',');
            if (range.length !== 2) return { error: '第 ' + (i + 1) + ' 行 BETWEEN 需要两个值，用逗号分隔' };
            clauses.push(field + ' BETWEEN ' + range[0].trim() + ' AND ' + range[1].trim());
            continue;
          }
          var literal = value;
          if (!/^-?\d+(\.\d+)?$/.test(literal) && literal.toUpperCase() !== 'NULL') {
            literal = v.quote ? "'" + literal.replace(/'/g, "''") + "'" : literal;
          }
          clauses.push(field + ' ' + op + ' ' + literal);
        }
        var where = 'WHERE ' + clauses.join('\n  ' + v.logic + ' ');
        return {
          output: where,
          html: '<pre class="code-block">' + K.esc(where) + '</pre>',
          note: '共 ' + clauses.length + ' 个条件，已自动为字符串加引号'
        };
      }
    });
  }

  /* ------------------------------ 14. 数字格式化 ------------------------------ */
  function renderNumberFormat(root) {
    K.text(root, {
      uid: 'numfmt',
      inputLabel: '数值（可多行批量）',
      inputRows: 6,
      actionLabel: '格式化',
      options: [
        { id: 'style', label: '格式', type: 'select', value: 'group', options: [
          { value: 'group', label: '千分位'},
          { value: 'money', label: '人民币 ¥' },
          { value: 'percent', label: '百分比' },
          { value: 'compact', label: '缩写（1.2万 / 3.4M）' },
          { value: 'fixed', label: '固定小数位' }
        ] },
        { id: 'digits', label: '小数位', type: 'number', value: 2, min: 0, max: 8, step: 1 },
        { id: 'currency', label: '货币符号', type: 'text', value: '¥' }
      ],
      sample: '1234567.891\n0.2567\n98765432100\n-4520.5',
      run: function (text, opt) {
        var digits = Math.max(0, Math.min(8, Math.round(Number(opt.digits))));
        var lines = text.split(/\r?\n/).filter(function (line) { return line.trim() !== ''; });
        var results = lines.map(function (line) {
          var num = Number(line.replace(/,/g, '').trim());
          if (!isFinite(num)) return line + ' → 不是数字';
          switch (opt.style) {
            case 'money': return opt.currency + K.group(num.toFixed(digits));
            case 'percent': return K.num(num * 100, digits) + '%';
            case 'compact':
              var abs = Math.abs(num);
              if (abs >= 1e8) return K.num(num / 1e8, 2) + ' 亿';
              if (abs >= 1e4) return K.num(num / 1e4, 2) + ' 万';
              return K.group(num.toFixed(digits));
            case 'fixed': return num.toFixed(digits);
            default: {
              var fixed = num.toFixed(digits);
              var parts = fixed.split('.');
              return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (parts[1] ? '.' + parts[1] : '');
            }
          }
        });
        return { output: results.join('\n'), note: '共处理 ' + lines.length + ' 个数值' };
      }
    });
  }

  /* ------------------------------ 15. env 示例 ------------------------------ */
  function renderEnvExample(root) {
    K.text(root, {
      uid: 'envexample',
      inputLabel: '粘贴 .env 内容',
      inputRows: 9,
      actionLabel: '生成示例',
      options: [
        { id: 'mask', label: '敏感值打码', type: 'checkbox', value: true },
        { id: 'keepEmpty', label: '保留空值项', type: 'checkbox', value: true },
        { id: 'comment', label: '保留注释行', type: 'checkbox', value: true }
      ],
      hint: '自动识别 KEY / SECRET / TOKEN / PASSWORD / URL 等敏感字段，避免把真实密钥提交到仓库。',
      sample: '# 数据库\nDB_HOST=10.0.0.12\nDB_PASSWORD=Sup3rSecret\nAPI_TOKEN=ghp_xxxxxxxx\nDEBUG=true\nEMPTY_KEY=',
      run: function (text, opt) {
        var lines = text.split(/\r?\n/);
        var sensitive = /(PASS|SECRET|TOKEN|KEY|PRIVATE|CREDENTIAL|AUTH|DSN|CONN)/i;
        var masked = 0;
        var out = lines.map(function (line) {
          var trimmed = line.trim();
          if (!trimmed) return '';
          if (trimmed.charAt(0) === '#') return opt.comment ? line : '';
          var match = /^([A-Za-z_][A-Za-z0-9_.]*)\s*=\s*(.*)$/.exec(trimmed);
          if (!match) return line;
          var key = match[1];
          var value = match[2];
          if (!opt.keepEmpty && value === '') return '';
          if (opt.mask && value !== '' && sensitive.test(key)) {
            masked += 1;
            return key + '=your_' + key.toLowerCase() + '_here';
          }
          return key + '=' + value;
        }).filter(function (line, index, arr) {
          return !(line === '' && arr[index - 1] === '');
        });
        return {
          output: out.join('\n'),
          note: '共 ' + lines.length + ' 行，已打码 ' + masked + ' 个敏感值'
        };
      }
    });
  }

  /* ------------------------------ 16. 路径转换 ------------------------------ */
  function renderPathNormalize(root) {
    K.text(root, {
      uid: 'pathnorm',
      inputLabel: '路径（每行一个）',
      inputRows: 7,
      actionLabel: '转换',
      options: [
        { id: 'mode', label: '转换方向', type: 'select', value: 'toUnix', options: [
          { value: 'toUnix', label: 'Windows → Unix' },
          { value: 'toWin', label: 'Unix → Windows' },
          { value: 'normalize', label: '仅规范化（去 .. 与重复斜杠）' }
        ] },
        { id: 'extra', label: '额外处理', type: 'select', value: 'none', options: [
          { value: 'none', label: '无' },
          { value: 'quote', label: '加双引号' },
          { value: 'escape', label: '反斜杠转义' }
        ] }
      ],
      sample: 'C:\\Users\\XFM\\Documents\\项目\\index.html\n/var/www/html/app/index.js',
      run: function (text, opt) {
        var lines = text.split(/\r?\n/).filter(function (line) { return line.trim() !== ''; });
        var results = lines.map(function (line) {
          var value = line.trim();
          if (opt.mode === 'toUnix') {
            value = value.replace(/^([A-Za-z]):\\/, '/$1/').replace(/\\/g, '/');
          } else if (opt.mode === 'toWin') {
            value = value.replace(/^\/([A-Za-z])\//, function (_, drive) { return drive.toUpperCase() + ':/'; }).replace(/\//g, '\\');
          } else {
            var isWin = value.indexOf('\\') >= 0;
            var sep = isWin ? '\\' : '/';
            var prefix = '';
            if (isWin && /^[A-Za-z]:/.test(value)) { prefix = value.slice(0, 2); value = value.slice(2); }
            if (!isWin && value.charAt(0) === '/') { prefix = '/'; value = value.slice(1); }
            var stack = [];
            value.split(/[\\/]+/).forEach(function (part) {
              if (!part || part === '.') return;
              if (part === '..') { if (stack.length) stack.pop(); }
              else stack.push(part);
            });
            value = prefix + (prefix === '/' ? '' : sep) + stack.join(sep);
          }
          if (opt.extra === 'quote') value = '"' + value + '"';
          if (opt.extra === 'escape') value = value.replace(/\\/g, '\\\\');
          return value;
        });
        return { output: results.join('\n'), note: '共转换 ' + lines.length + ' 条路径' };
      }
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['uuid-validate'] = renderUuidValidate;
  window.ToolModules['semver-compare'] = renderSemverCompare;
  window.ToolModules['json-query'] = renderJsonQuery;
  window.ToolModules['commit-lint'] = renderCommitLint;
  window.ToolModules['changelog-gen'] = renderChangelogGen;
  window.ToolModules['code-stats'] = renderCodeStats;
  window.ToolModules['indent-convert'] = renderIndentConvert;
  window.ToolModules['url-join'] = renderUrlJoin;
  window.ToolModules['css-var-extract'] = renderCssVarExtract;
  window.ToolModules['api-mock'] = renderApiMock;
  window.ToolModules['datauri-info'] = renderDataUriInfo;
  window.ToolModules['regex-escape'] = renderRegexEscape;
  window.ToolModules['sql-where'] = renderSqlWhere;
  window.ToolModules['number-format'] = renderNumberFormat;
  window.ToolModules['env-example'] = renderEnvExample;
  window.ToolModules['path-normalize'] = renderPathNormalize;
})();
