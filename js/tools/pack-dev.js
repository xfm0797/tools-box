/* =============================================================================
 * 开发辅助工具包（16 个）
 * -----------------------------------------------------------------------------
 * json-to-ts / json-to-csv / csv-to-json / json-to-yaml / css-minify /
 * regex-cheatsheet / mime-lookup / user-agent-parse / git-cheatsheet /
 * linux-cheatsheet / css-gradient / box-shadow / border-radius /
 * color-contrast / sql-formatter / html-formatter
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  /* ------------------------------ JSON → TypeScript ------------------------------ */

  function tsFromJson(json) {
    var interfaces = [];
    var used = Object.create(null);

    function pascal(str) {
      var out = String(str).replace(/[^A-Za-z0-9]+(.)?/g, function (_, c) {
        return c ? c.toUpperCase() : '';
      }).replace(/^[a-z]/, function (c) { return c.toUpperCase(); });
      return out || 'Value';
    }

    function validKey(key) {
      return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
    }

    function buildInterface(obj, hint) {
      var base = pascal(hint);
      var name = base;
      var index = 2;
      while (used[name]) { name = base + index; index += 1; }
      used[name] = true;

      var lines = Object.keys(obj).map(function (key) {
        return '  ' + validKey(key) + ': ' + typeOf(obj[key], key) + ';';
      });
      interfaces.push('export interface ' + name + ' {\n' + lines.join('\n') + '\n}');
      return name;
    }

    function typeOf(value, hint) {
      if (value === null) return 'null';
      if (Array.isArray(value)) {
        if (!value.length) return 'any[]';
        var types = value.map(function (item) { return typeOf(item, hint + 'Item'); });
        var unique = types.filter(function (item, i) { return types.indexOf(item) === i; });
        return unique.length === 1 ? unique[0] + '[]' : '(' + unique.join(' | ') + ')[]';
      }
      if (typeof value === 'object') return buildInterface(value, hint);
      if (typeof value === 'string') return 'string';
      if (typeof value === 'number') return 'number';
      if (typeof value === 'boolean') return 'boolean';
      return 'any';
    }

    var rootType;
    if (Array.isArray(json)) {
      rootType = typeOf(json, 'Root');
      return 'export type Root = ' + rootType + ';\n\n' + interfaces.reverse().join('\n\n');
    }
    if (json && typeof json === 'object') {
      rootType = buildInterface(json, 'Root');
      return interfaces.reverse().join('\n\n');
    }
    return 'export type Root = ' + typeOf(json, 'Root') + ';';
  }

  function renderJsonToTs(root) {
    var uid = K.uid('j2ts');
    root.innerHTML =
      '<div class="field">' +
        '<div class="label-row"><label class="label" for="' + uid + '-input">JSON 数据</label>' +
        '<span class="label-meta" id="' + uid + '-count">0 字符</span></div>' +
        '<textarea id="' + uid + '-input" class="textarea mono" rows="10" spellcheck="false" ' +
        'placeholder=\'{"id": 1, "name": "张三"}\'></textarea>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="' + uid + '-run">生成类型</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-sample">示例</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-clear">清空</button>' +
      '</div>' +
      '<div class="field">' +
        '<div class="label-row"><label class="label" for="' + uid + '-output">TypeScript 类型定义</label>' +
        '<div class="label-actions"><button type="button" class="link-btn" id="' + uid + '-copy">复制结果</button></div></div>' +
        '<textarea id="' + uid + '-output" class="textarea mono" rows="12" readonly placeholder="生成的 interface 会显示在这里"></textarea>' +
      '</div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      '<p class="hint">根据值的实际类型推断，空数组会生成 <code>any[]</code>。生成后可按业务需要把 <code>number</code> 收窄为字面量联合类型。</p>';

    var input = root.querySelector('#' + uid + '-input');
    var output = root.querySelector('#' + uid + '-output');
    var statusEl = root.querySelector('#' + uid + '-status');
    var countEl = root.querySelector('#' + uid + '-count');

    function run() {
      if (!input.value.trim()) {
        window.UI.toast('请先粘贴 JSON', 'warn');
        input.focus();
        return;
      }
      var data;
      try {
        data = JSON.parse(input.value);
      } catch (error) {
        output.value = '';
        statusEl.className = 'status err';
        statusEl.textContent = 'JSON 解析失败：' + error.message;
        statusEl.hidden = false;
        return;
      }
      output.value = tsFromJson(data);
      var count = (output.value.match(/export (interface|type)/g) || []).length;
      statusEl.className = 'status ok';
      statusEl.textContent = '已生成 ' + count + ' 个类型定义。';
      statusEl.hidden = false;
    }

    input.addEventListener('input', function () {
      countEl.textContent = input.value.length.toLocaleString('zh-CN') + ' 字符';
    });
    root.querySelector('#' + uid + '-run').addEventListener('click', run);
    root.querySelector('#' + uid + '-copy').addEventListener('click', function () {
      window.UI.copyText(output.value);
    });
    root.querySelector('#' + uid + '-sample').addEventListener('click', function () {
      input.value = JSON.stringify({
        id: 1,
        name: '张三',
        tags: ['a', 'b'],
        profile: { age: 28, vip: true },
        orders: [{ orderId: 'A1', amount: 99.5 }]
      }, null, 2);
      countEl.textContent = input.value.length + ' 字符';
      run();
    });
    root.querySelector('#' + uid + '-clear').addEventListener('click', function () {
      input.value = '';
      output.value = '';
      countEl.textContent = '0 字符';
      statusEl.hidden = true;
      window.UI.toast('已清空', 'success');
    });
  }

  /* ------------------------------ JSON → CSV ------------------------------ */
  function toCsvCell(value) {
    if (value === null || value === undefined) return '';
    var text = typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (/[",\n\r]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
    return text;
  }

  function renderJsonToCsv(root) {
    K.text(root, {
      uid: 'j2csv',
      inputLabel: 'JSON 数组',
      inputRows: 10,
      outputLabel: 'CSV 结果',
      outputRows: 10,
      actionLabel: '转换',
      options: [
        {
          id: 'delimiter', type: 'select', label: '分隔符', value: ',',
          options: [{ value: ',', label: '逗号 ,' }, { value: '\t', label: '制表符 Tab' }, { value: ';', label: '分号 ;' }]
        }
      ],
      sample: '[{"id":1,"name":"张三","city":"北京"},{"id":2,"name":"李四","city":"上海, 浦东"}]',
      run: function (text, opt) {
        var data;
        try { data = JSON.parse(text); }
        catch (error) { return { error: 'JSON 解析失败：' + error.message }; }
        if (!Array.isArray(data)) return { error: '请提供 JSON 数组（形如 [{...}, {...}]）。' };
        if (!data.length) return { error: '数组为空，没有可导出的数据。' };

        var keys = [];
        data.forEach(function (row) {
          if (row && typeof row === 'object' && !Array.isArray(row)) {
            Object.keys(row).forEach(function (key) {
              if (keys.indexOf(key) === -1) keys.push(key);
            });
          }
        });
        if (!keys.length) return { error: '数组元素不是对象，无法转换为表格。' };

        var lines = [keys.map(toCsvCell).join(opt.delimiter)];
        data.forEach(function (row) {
          lines.push(keys.map(function (key) {
            return toCsvCell(row && typeof row === 'object' ? row[key] : '');
          }).join(opt.delimiter));
        });
        return {
          output: lines.join('\n'),
          note: '共 ' + data.length + ' 行 × ' + keys.length + ' 列。字段含逗号或换行时会自动加引号。'
        };
      }
    });
  }

  /* ------------------------------ CSV → JSON ------------------------------ */
  function parseCsv(text, delimiter) {
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;

    for (var i = 0; i < text.length; i += 1) {
      var ch = text.charAt(i);
      if (inQuotes) {
        if (ch === '"') {
          if (text.charAt(i + 1) === '"') { field += '"'; i += 1; }
          else inQuotes = false;
        } else field += ch;
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        row.push(field); field = '';
      } else if (ch === '\n') {
        row.push(field); rows.push(row); row = []; field = '';
      } else if (ch !== '\r') {
        field += ch;
      }
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter(function (item) {
      return item.length > 1 || (item[0] || '').trim() !== '';
    });
  }

  function renderCsvToJson(root) {
    K.text(root, {
      uid: 'csv2j',
      inputLabel: 'CSV 文本（第一行为表头）',
      inputRows: 10,
      outputLabel: 'JSON 结果',
      outputRows: 10,
      actionLabel: '转换',
      options: [
        {
          id: 'delimiter', type: 'select', label: '分隔符', value: 'auto',
          options: [
            { value: 'auto', label: '自动识别' },
            { value: ',', label: '逗号 ,' },
            { value: '\t', label: '制表符 Tab' },
            { value: ';', label: '分号 ;' }
          ]
        },
        { id: 'typed', type: 'checkbox', label: '数字与布尔自动转类型', value: true }
      ],
      sample: 'id,name,city\n1,张三,北京\n2,李四,"上海, 浦东"',
      run: function (text, opt) {
        var delimiter = opt.delimiter;
        if (delimiter === 'auto') {
          var firstLine = text.split('\n')[0] || '';
          var counts = {
            ',': (firstLine.match(/,/g) || []).length,
            '\t': (firstLine.match(/\t/g) || []).length,
            ';': (firstLine.match(/;/g) || []).length
          };
          delimiter = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; })[0];
        }
        var rows = parseCsv(text, delimiter);
        if (rows.length < 2) return { error: '至少需要「表头 + 1 行数据」。' };

        var headers = rows[0].map(function (h, i) {
          var name = h.trim();
          return name || 'column' + (i + 1);
        });

        function convert(value) {
          if (!opt.typed) return value;
          var trimmed = value.trim();
          if (trimmed === '') return '';
          if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
          if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === 'true';
          if (/^null$/i.test(trimmed)) return null;
          return value;
        }

        var data = rows.slice(1).map(function (row) {
          var obj = {};
          headers.forEach(function (key, index) {
            obj[key] = convert(row[index] === undefined ? '' : row[index]);
          });
          return obj;
        });

        return {
          output: JSON.stringify(data, null, 2),
          note: '已转换 ' + data.length + ' 行，分隔符为「' + (delimiter === '\t' ? 'Tab' : delimiter) + '」。'
        };
      }
    });
  }

  /* ------------------------------ JSON → YAML ------------------------------ */
  function yamlScalar(value) {
    if (value === null) return 'null';
    if (typeof value === 'boolean') return String(value);
    if (typeof value === 'number') return String(value);
    var text = String(value);
    if (text === '') return '""';
    if (/^[\s]|[\s]$/.test(text) || /[:#\-?*&!|>'"%@`{}\[\],]/.test(text) ||
      /^(true|false|null|yes|no|on|off|~)$/i.test(text) || /^-?\d+(\.\d+)?$/.test(text)) {
      return JSON.stringify(text);
    }
    return text;
  }

  function toYaml(value, indent) {
    var pad = new Array(indent + 1).join('  ');
    if (Array.isArray(value)) {
      if (!value.length) return '[]';
      return value.map(function (item) {
        if (item && typeof item === 'object') {
          var inner = toYaml(item, indent + 1);
          return pad + '- ' + inner.replace(new RegExp('^' + pad + '  '), '');
        }
        return pad + '- ' + yamlScalar(item);
      }).join('\n');
    }
    if (value && typeof value === 'object') {
      var keys = Object.keys(value);
      if (!keys.length) return '{}';
      return keys.map(function (key) {
        var item = value[key];
        if (item && typeof item === 'object' && Object.keys(item).length) {
          return pad + key + ':\n' + toYaml(item, indent + 1);
        }
        if (Array.isArray(item)) return pad + key + ': []';
        return pad + key + ': ' + yamlScalar(item);
      }).join('\n');
    }
    return pad + yamlScalar(value);
  }

  function renderJsonToYaml(root) {
    K.text(root, {
      uid: 'j2yaml',
      inputLabel: 'JSON 数据',
      inputRows: 10,
      outputLabel: 'YAML 结果',
      outputRows: 12,
      actionLabel: '转换',
      sample: '{\n  "name": "demo",\n  "version": "1.0.0",\n  "ports": [8080, 8443],\n  "env": { "DEBUG": false }\n}',
      run: function (text) {
        var data;
        try { data = JSON.parse(text); }
        catch (error) { return { error: 'JSON 解析失败：' + error.message }; }
        return { output: toYaml(data, 0), note: '已转换为 YAML，缩进 2 个空格。' };
      },
      hint: '仅做 JSON → YAML 单向转换，不支持 YAML 解析（避免引入依赖）。'
    });
  }

  /* ------------------------------ CSS 压缩 ------------------------------ */
  function renderCssMinify(root) {
    var uid = 'cssmin';
    K.text(root, {
      uid: uid,
      inputLabel: '原始 CSS',
      inputRows: 10,
      outputLabel: '压缩结果',
      outputRows: 8,
      actionLabel: '压缩',
      options: [
        { id: 'keepComment', type: 'checkbox', label: '保留 /*! 重要注释 */' }
      ],
      sample: '/* 主按钮 */\n.btn {\n  color: #fff;\n  padding: 8px 16px;\n  background: #5b5bd6;\n}\n\n.btn:hover {\n  background: #4a4ac4;\n}',
      run: function (text, opt) {
        var original = text.length;
        var out = text;
        if (opt.keepComment) {
          var keeps = [];
          out = out.replace(/\/\*![\s\S]*?\*\//g, function (m) {
            keeps.push(m);
            return '\u0001KEEP' + (keeps.length - 1) + '\u0001';
          });
          out = out.replace(/\/\*[\s\S]*?\*\//g, '');
          out = out.replace(/\u0001KEEP(\d+)\u0001/g, function (_, index) { return keeps[Number(index)]; });
        } else {
          out = out.replace(/\/\*[\s\S]*?\*\//g, '');
        }
        out = out.replace(/\s+/g, ' ')
          .replace(/\s*([{}:;,>+~])\s*/g, '$1')
          .replace(/;}/g, '}')
          .replace(/\s*!\s*important/gi, '!important')
          .trim();
        var saved = original - out.length;
        return {
          output: out,
          note: '原始 ' + K.formatBytes(original) + ' → 压缩后 ' + K.formatBytes(out.length) +
            '，减少 ' + (original ? K.num(saved / original * 100, 1) : 0) + '%。'
        };
      }
    });
  }

  /* ------------------------------ 速查表通用 ------------------------------ */
  function cheatSheet(root, cfg) {
    var uid = K.uid('cheat');
    root.innerHTML =
      '<div class="field">' +
        '<div class="label-row"><label class="label" for="' + uid + '-q">搜索命令或说明</label></div>' +
        '<input id="' + uid + '-q" class="input" type="search" placeholder="输入关键词，例如 commit、权限">' +
      '</div>' +
      '<div class="cheat-list" id="' + uid + '-list"></div>' +
      '<p class="hint">共 ' + cfg.items.length + ' 条，点击命令即可复制。</p>';

    var input = root.querySelector('#' + uid + '-q');
    var list = root.querySelector('#' + uid + '-list');

    function draw(keyword) {
      var query = (keyword || '').trim().toLowerCase();
      var items = cfg.items.filter(function (item) {
        if (!query) return true;
        return (item.cmd + ' ' + item.desc).toLowerCase().indexOf(query) !== -1;
      });
      if (!items.length) {
        list.innerHTML = '<p class="empty">没有匹配的命令，换个关键词试试。</p>';
        return;
      }
      list.innerHTML = items.map(function (item) {
        return '<div class="cheat-item">' +
          '<button type="button" class="cheat-cmd mono" data-copy="' + K.esc(item.cmd) + '">' + K.esc(item.cmd) + '</button>' +
          '<p class="cheat-desc">' + K.esc(item.desc) + '</p>' +
          '</div>';
      }).join('');
      K.bindCopy(list);
    }

    input.addEventListener('input', window.UI.debounce(function () { draw(input.value); }, 150));
    draw('');
  }

  function renderRegexCheat(root) {
    cheatSheet(root, {
      items: [
        { cmd: '^', desc: '匹配字符串开头（多行模式下为行首）' },
        { cmd: '$', desc: '匹配字符串结尾（多行模式下为行尾）' },
        { cmd: '.', desc: '任意单个字符（不含换行，加 s 标志后可匹配换行）' },
        { cmd: '\\d  \\D', desc: '数字 / 非数字，等价于 [0-9] / [^0-9]' },
        { cmd: '\\w  \\W', desc: '字母数字下划线 / 其取反' },
        { cmd: '\\s  \\S', desc: '空白字符（空格、制表、换行）/ 非空白' },
        { cmd: '\\b', desc: '单词边界，常用于整词匹配 \\bword\\b' },
        { cmd: '[abc]', desc: '字符集合，匹配其中任意一个' },
        { cmd: '[^abc]', desc: '排除型字符集合' },
        { cmd: '[a-z]', desc: '范围匹配，小写字母' },
        { cmd: 'a*  a+  a?', desc: '重复 0 次以上 / 1 次以上 / 0 或 1 次' },
        { cmd: 'a{2,5}', desc: '重复 2 到 5 次' },
        { cmd: 'a{3,}', desc: '至少重复 3 次' },
        { cmd: 'a*?', desc: '非贪婪匹配，尽可能少地匹配' },
        { cmd: '(abc)', desc: '捕获分组，可在替换中用 $1 引用' },
        { cmd: '(?:abc)', desc: '非捕获分组，只分组不占编号' },
        { cmd: '(?<name>abc)', desc: '具名分组，替换中用 $<name> 引用' },
        { cmd: '(?=abc)', desc: '正向前瞻：后面必须是 abc' },
        { cmd: '(?!abc)', desc: '负向前瞻：后面不能是 abc' },
        { cmd: '(?<=abc)', desc: '正向后顾：前面必须是 abc' },
        { cmd: 'a|b', desc: '或，匹配 a 或 b' },
        { cmd: '/g', desc: '全局匹配标志，找到全部结果' },
        { cmd: '/i', desc: '忽略大小写' },
        { cmd: '/m', desc: '多行模式，^ $ 匹配每行首尾' },
        { cmd: '/s', desc: '点号匹配换行' },
        { cmd: '/u', desc: 'Unicode 模式，正确处理 Emoji 与生僻字' },
        { cmd: '\\u4e00-\\u9fa5', desc: '常用中文汉字范围' },
        { cmd: '(?<=\\$)\\d+', desc: '示例：提取 $ 后面的数字' }
      ]
    });
  }

  function renderMime(root) {
    var items = [
      ['html', 'text/html'], ['htm', 'text/html'], ['css', 'text/css'],
      ['js', 'application/javascript'], ['mjs', 'application/javascript'], ['json', 'application/json'],
      ['xml', 'application/xml'], ['txt', 'text/plain'], ['csv', 'text/csv'], ['md', 'text/markdown'],
      ['png', 'image/png'], ['jpg / jpeg', 'image/jpeg'], ['gif', 'image/gif'], ['webp', 'image/webp'],
      ['svg', 'image/svg+xml'], ['ico', 'image/x-icon'], ['bmp', 'image/bmp'], ['avif', 'image/avif'],
      ['mp3', 'audio/mpeg'], ['wav', 'audio/wav'], ['ogg', 'audio/ogg'], ['flac', 'audio/flac'],
      ['mp4', 'video/mp4'], ['webm', 'video/webm'], ['mov', 'video/quicktime'], ['avi', 'video/x-msvideo'],
      ['pdf', 'application/pdf'], ['zip', 'application/zip'], ['rar', 'application/vnd.rar'],
      ['7z', 'application/x-7z-compressed'], ['tar', 'application/x-tar'], ['gz', 'application/gzip'],
      ['doc', 'application/msword'], ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      ['xls', 'application/vnd.ms-excel'], ['xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      ['ppt', 'application/vnd.ms-powerpoint'], ['pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
      ['woff', 'font/woff'], ['woff2', 'font/woff2'], ['ttf', 'font/ttf'], ['otf', 'font/otf'],
      ['wasm', 'application/wasm'], ['apk', 'application/vnd.android.package-archive'],
      ['eot', 'application/vnd.ms-fontobject'], ['rtf', 'application/rtf']
    ].map(function (pair) { return { cmd: pair[1], desc: '扩展名：' + pair[0] }; });

    cheatSheet(root, { items: items });
  }

  function renderGitCheat(root) {
    cheatSheet(root, {
      items: [
        { cmd: 'git init', desc: '在当前目录初始化仓库' },
        { cmd: 'git clone <url>', desc: '克隆远程仓库到本地' },
        { cmd: 'git status', desc: '查看工作区与暂存区状态' },
        { cmd: 'git add .', desc: '把全部改动加入暂存区' },
        { cmd: 'git add -p', desc: '按代码块交互式选择要提交的改动' },
        { cmd: 'git commit -m "说明"', desc: '提交暂存区内容' },
        { cmd: 'git commit --amend', desc: '修改最近一次提交（未推送时使用）' },
        { cmd: 'git log --oneline --graph', desc: '以图形化单行方式查看提交历史' },
        { cmd: 'git diff', desc: '查看工作区与暂存区的差异' },
        { cmd: 'git diff --staged', desc: '查看已暂存但未提交的差异' },
        { cmd: 'git restore <file>', desc: '丢弃工作区中某文件的修改' },
        { cmd: 'git restore --staged <file>', desc: '把文件移出暂存区（保留修改）' },
        { cmd: 'git switch -c <branch>', desc: '创建并切换到新分支' },
        { cmd: 'git switch <branch>', desc: '切换分支' },
        { cmd: 'git branch -d <branch>', desc: '删除已合并的本地分支' },
        { cmd: 'git merge <branch>', desc: '把指定分支合并到当前分支' },
        { cmd: 'git rebase <branch>', desc: '把当前分支变基到目标分支' },
        { cmd: 'git fetch --prune', desc: '拉取远程更新并清理失效的远程分支引用' },
        { cmd: 'git pull --rebase', desc: '拉取并以变基方式合并，保持线性历史' },
        { cmd: 'git push -u origin <branch>', desc: '首次推送并建立上游关联' },
        { cmd: 'git remote -v', desc: '查看远程仓库地址' },
        { cmd: 'git stash', desc: '临时保存未提交的改动' },
        { cmd: 'git stash pop', desc: '恢复最近一次 stash 并删除记录' },
        { cmd: 'git cherry-pick <hash>', desc: '把某个提交应用到当前分支' },
        { cmd: 'git reset --soft HEAD~1', desc: '撤销最近一次提交，保留改动在暂存区' },
        { cmd: 'git reflog', desc: '查看引用变动记录，可用于找回误删提交' },
        { cmd: 'git tag -a v1.0 -m "说明"', desc: '创建附注标签' },
        { cmd: 'git clean -fd', desc: '删除未跟踪的文件与目录（谨慎使用）' }
      ]
    });
  }

  function renderLinuxCheat(root) {
    cheatSheet(root, {
      items: [
        { cmd: 'ls -lah', desc: '列出文件，含隐藏文件与可读体积' },
        { cmd: 'cd -', desc: '回到上一个工作目录' },
        { cmd: 'pwd', desc: '显示当前所在路径' },
        { cmd: 'du -sh *', desc: '统计当前目录下各文件/文件夹体积' },
        { cmd: 'df -h', desc: '查看磁盘分区使用情况' },
        { cmd: 'find . -name "*.log"', desc: '按名称查找文件' },
        { cmd: 'grep -rn "关键词" .', desc: '递归搜索并显示行号' },
        { cmd: 'tail -f app.log', desc: '实时跟踪日志文件末尾' },
        { cmd: 'less +F app.log', desc: '分页查看并跟踪日志（Ctrl+C 退出跟踪）' },
        { cmd: 'ps aux | grep node', desc: '查找指定进程' },
        { cmd: 'kill -9 <pid>', desc: '强制结束进程' },
        { cmd: 'top -o %MEM', desc: '按内存占用排序查看进程' },
        { cmd: 'chmod 755 file', desc: '设置文件权限为 rwxr-xr-x' },
        { cmd: 'chown -R user:group dir', desc: '递归修改文件归属' },
        { cmd: 'tar -czf a.tar.gz dir/', desc: '打包并 gzip 压缩目录' },
        { cmd: 'tar -xzf a.tar.gz', desc: '解压 tar.gz 文件' },
        { cmd: 'zip -r a.zip dir/', desc: '压缩为 zip（需安装 zip）' },
        { cmd: 'curl -I https://example.com', desc: '只获取响应头' },
        { cmd: 'curl -X POST -d "{}" -H "Content-Type: application/json" url', desc: '发送 JSON POST 请求' },
        { cmd: 'ssh user@host -p 22', desc: '通过指定端口登录远程主机' },
        { cmd: 'scp file user@host:/path', desc: '本地文件复制到远程' },
        { cmd: 'rsync -avz src/ user@host:/dest/', desc: '增量同步目录' },
        { cmd: 'netstat -tunlp', desc: '查看监听端口与对应进程' },
        { cmd: 'ss -tunlp', desc: 'netstat 的现代替代品' },
        { cmd: 'systemctl status nginx', desc: '查看服务状态' },
        { cmd: 'journalctl -u nginx -f', desc: '实时查看服务日志' },
        { cmd: 'crontab -e', desc: '编辑当前用户的定时任务' },
        { cmd: 'nohup cmd > out.log 2>&1 &', desc: '后台运行并重定向输出' }
      ]
    });
  }

  /* ------------------------------ UA 解析 ------------------------------ */
  function parseUserAgent(ua) {
    var result = { browser: '未知', version: '', engine: '未知', os: '未知', device: '桌面设备', mobile: false };

    var browsers = [
      ['Edge', /Edg(?:e|A|iOS)?\/([\d.]+)/],
      ['Opera', /OPR\/([\d.]+)/],
      ['Chrome', /Chrome\/([\d.]+)/],
      ['Firefox', /Firefox\/([\d.]+)/],
      ['Safari', /Version\/([\d.]+).*Safari/],
      ['IE', /MSIE ([\d.]+)|Trident\/.*rv:([\d.]+)/]
    ];
    browsers.forEach(function (item) {
      var match = item[1].exec(ua);
      if (match && result.browser === '未知') {
        result.browser = item[0];
        result.version = match[1] || match[2] || '';
      }
    });

    if (/Edg\//.test(ua)) { result.browser = 'Edge'; result.version = (/Edg\/([\d.]+)/.exec(ua) || [])[1] || ''; }
    if (/MicroMessenger\/([\d.]+)/.test(ua)) { result.browser = '微信内置浏览器'; result.version = (/MicroMessenger\/([\d.]+)/.exec(ua) || [])[1] || ''; }
    if (/AlipayClient/.test(ua)) { result.browser = '支付宝内置浏览器'; }

    if (/Blink/.test(ua) || /Chrome\//.test(ua)) result.engine = 'Blink';
    if (/AppleWebKit/.test(ua) && /Safari/.test(ua) && !/Chrome/.test(ua)) result.engine = 'WebKit';
    if (/Gecko\//.test(ua) && !/like Gecko/.test(ua)) result.engine = 'Gecko';
    if (/Trident/.test(ua)) result.engine = 'Trident';

    if (/Windows NT 10/.test(ua)) result.os = 'Windows 10/11';
    else if (/Windows NT 6\.3/.test(ua)) result.os = 'Windows 8.1';
    else if (/Windows NT 6\.1/.test(ua)) result.os = 'Windows 7';
    else if (/Windows/.test(ua)) result.os = 'Windows';
    else if (/iPhone|iPad|iPod/.test(ua)) result.os = 'iOS';
    else if (/Android ([\d.]+)/.test(ua)) result.os = 'Android ' + (/Android ([\d.]+)/.exec(ua) || [])[1];
    else if (/Mac OS X/.test(ua)) result.os = 'macOS';
    else if (/Linux/.test(ua)) result.os = 'Linux';
    else if (/CrOS/.test(ua)) result.os = 'ChromeOS';

    if (/Mobile|Android|iPhone|iPad|iPod/.test(ua)) { result.mobile = true; result.device = '移动设备'; }
    if (/iPad|Tablet/.test(ua)) result.device = '平板';
    if (/bot|crawler|spider/i.test(ua)) { result.device = '爬虫 / 机器人'; result.mobile = false; }

    return result;
  }

  function renderUserAgent(root) {
    var uid = 'ua';
    root.innerHTML =
      '<div class="field">' +
        '<div class="label-row"><label class="label" for="' + uid + '-input">User-Agent 字符串</label>' +
        '<div class="label-actions"><button type="button" class="link-btn" id="' + uid + '-self">填入当前浏览器</button></div></div>' +
        '<textarea id="' + uid + '-input" class="textarea mono" rows="4" spellcheck="false"></textarea>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="' + uid + '-run">解析</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-sample">示例</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-clear">清空</button>' +
      '</div>' +
      '<div id="' + uid + '-out"></div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      '<p class="hint">基于关键字规则识别，结果仅供参考；UA 可被伪造，不能作为安全依据。</p>';

    var input = root.querySelector('#' + uid + '-input');
    var out = root.querySelector('#' + uid + '-out');
    var statusEl = root.querySelector('#' + uid + '-status');

    function run() {
      var ua = input.value.trim();
      if (!ua) { window.UI.toast('请先粘贴 UA 字符串', 'warn'); input.focus(); return; }
      var info = parseUserAgent(ua);
      out.innerHTML = K.kv([
        { key: '浏览器', value: info.browser + (info.version ? ' ' + info.version : '') },
        { key: '渲染引擎', value: info.engine },
        { key: '操作系统', value: info.os },
        { key: '设备类型', value: info.device },
        { key: '是否移动端', value: info.mobile ? '是' : '否' },
        { key: '原始长度', value: ua.length + ' 字符' }
      ]);
      K.bindCopy(out);
      statusEl.className = 'status ok';
      statusEl.textContent = '解析完成。';
      statusEl.hidden = false;
    }

    root.querySelector('#' + uid + '-run').addEventListener('click', run);
    root.querySelector('#' + uid + '-self').addEventListener('click', function () {
      input.value = navigator.userAgent;
      run();
    });
    root.querySelector('#' + uid + '-sample').addEventListener('click', function () {
      input.value = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
      run();
    });
    root.querySelector('#' + uid + '-clear').addEventListener('click', function () {
      input.value = '';
      out.innerHTML = '';
      statusEl.hidden = true;
      window.UI.toast('已清空', 'success');
    });
    input.value = navigator.userAgent;
    run();
  }

  /* ------------------------------ CSS 渐变 ------------------------------ */
  function renderGradient(root) {
    var uid = K.uid('grad');
    root.innerHTML =
      '<div class="form-row">' +
        '<div class="form-item"><label class="label" for="' + uid + '-type">类型</label>' +
          '<select class="select" id="' + uid + '-type">' +
            '<option value="linear" selected>线性渐变</option><option value="radial">径向渐变</option>' +
          '</select></div>' +
        '<div class="form-item"><label class="label" for="' + uid + '-angle">角度（线性）</label>' +
          '<input class="input" type="number" id="' + uid + '-angle" value="135" min="0" max="360" step="15"></div>' +
        '<div class="form-item"><label class="label" for="' + uid + '-c1">起始色</label>' +
          '<input class="input" type="color" id="' + uid + '-c1" value="#5b5bd6" style="height:38px;padding:4px"></div>' +
        '<div class="form-item"><label class="label" for="' + uid + '-c2">结束色</label>' +
          '<input class="input" type="color" id="' + uid + '-c2" value="#06b6d4" style="height:38px;padding:4px"></div>' +
      '</div>' +
      '<div class="gradient-preview" id="' + uid + '-preview"></div>' +
      '<div class="field">' +
        '<div class="label-row"><label class="label" for="' + uid + '-code">CSS 代码</label>' +
        '<div class="label-actions"><button type="button" class="link-btn" id="' + uid + '-copy">复制</button></div></div>' +
        '<textarea id="' + uid + '-code" class="textarea mono" rows="4" readonly></textarea>' +
      '</div>' +
      '<p class="hint">可直接粘贴到样式表中使用，渐变为纯 CSS，兼容所有现代浏览器。</p>';

    function update() {
      var type = root.querySelector('#' + uid + '-type').value;
      var angle = parseInt(root.querySelector('#' + uid + '-angle').value, 10) || 0;
      var c1 = root.querySelector('#' + uid + '-c1').value;
      var c2 = root.querySelector('#' + uid + '-c2').value;
      var css = type === 'linear'
        ? 'linear-gradient(' + angle + 'deg, ' + c1 + ' 0%, ' + c2 + ' 100%)'
        : 'radial-gradient(circle at 50% 50%, ' + c1 + ' 0%, ' + c2 + ' 100%)';
      root.querySelector('#' + uid + '-preview').style.background = css;
      root.querySelector('#' + uid + '-code').value = 'background: ' + css + ';';
    }

    ['type', 'angle', 'c1', 'c2'].forEach(function (suffix) {
      var node = root.querySelector('#' + uid + '-' + suffix);
      node.addEventListener('input', update);
      node.addEventListener('change', update);
    });
    root.querySelector('#' + uid + '-copy').addEventListener('click', function () {
      window.UI.copyText(root.querySelector('#' + uid + '-code').value);
    });
    update();
  }

  /* ------------------------------ 阴影生成 ------------------------------ */
  function renderShadow(root) {
    var uid = K.uid('shadow');
    var fields = [
      ['x', '水平偏移', -40, 40, 0],
      ['y', '垂直偏移', -40, 40, 12],
      ['blur', '模糊半径', 0, 80, 28],
      ['spread', '扩散半径', -30, 40, -8]
    ];

    root.innerHTML =
      '<div class="form-row">' + fields.map(function (f) {
        return '<div class="form-item"><label class="label" for="' + uid + '-' + f[0] + '">' + f[1] +
          ' <span class="label-meta" id="' + uid + '-' + f[0] + '-val">' + f[4] + 'px</span></label>' +
          '<input class="range" type="range" id="' + uid + '-' + f[0] + '" min="' + f[2] + '" max="' + f[3] + '" value="' + f[4] + '"></div>';
      }).join('') +
        '<div class="form-item"><label class="label" for="' + uid + '-color">颜色</label>' +
          '<input class="input" type="color" id="' + uid + '-color" value="#1f2937" style="height:38px;padding:4px"></div>' +
        '<div class="form-item"><label class="label" for="' + uid + '-opacity">不透明度 <span class="label-meta" id="' + uid + '-opacity-val">18%</span></label>' +
          '<input class="range" type="range" id="' + uid + '-opacity" min="0" max="100" value="18"></div>' +
      '</div>' +
      '<div class="shadow-stage"><div class="shadow-box" id="' + uid + '-box">shadow</div></div>' +
      '<div class="field">' +
        '<div class="label-row"><label class="label" for="' + uid + '-code">CSS 代码</label>' +
        '<div class="label-actions"><button type="button" class="link-btn" id="' + uid + '-copy">复制</button></div></div>' +
        '<textarea id="' + uid + '-code" class="textarea mono" rows="3" readonly></textarea>' +
      '</div>' +
      '<p class="hint">拖动滑块实时预览；负的扩散半径会让阴影收缩，适合更「干净」的卡片阴影。</p>';

    function hexToRgba(hex, alpha) {
      var value = hex.replace('#', '');
      var r = parseInt(value.slice(0, 2), 16);
      var g = parseInt(value.slice(2, 4), 16);
      var b = parseInt(value.slice(4, 6), 16);
      return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
    }

    function update() {
      var values = {};
      fields.forEach(function (f) {
        values[f[0]] = parseInt(root.querySelector('#' + uid + '-' + f[0]).value, 10);
        root.querySelector('#' + uid + '-' + f[0] + '-val').textContent = values[f[0]] + 'px';
      });
      var opacity = parseInt(root.querySelector('#' + uid + '-opacity').value, 10);
      root.querySelector('#' + uid + '-opacity-val').textContent = opacity + '%';
      var color = hexToRgba(root.querySelector('#' + uid + '-color').value, (opacity / 100).toFixed(2));

      var css = values.x + 'px ' + values.y + 'px ' + values.blur + 'px ' + values.spread + 'px ' + color;
      root.querySelector('#' + uid + '-box').style.boxShadow = css;
      root.querySelector('#' + uid + '-code').value = 'box-shadow: ' + css + ';';
    }

    fields.forEach(function (f) {
      root.querySelector('#' + uid + '-' + f[0]).addEventListener('input', update);
    });
    root.querySelector('#' + uid + '-opacity').addEventListener('input', update);
    root.querySelector('#' + uid + '-color').addEventListener('input', update);
    root.querySelector('#' + uid + '-copy').addEventListener('click', function () {
      window.UI.copyText(root.querySelector('#' + uid + '-code').value);
    });
    update();
  }

  /* ------------------------------ 圆角生成 ------------------------------ */
  function renderRadius(root) {
    var uid = K.uid('radius');
    var corners = [['tl', '左上'], ['tr', '右上'], ['br', '右下'], ['bl', '左下']];

    root.innerHTML =
      '<div class="form-row">' + corners.map(function (c) {
        return '<div class="form-item"><label class="label" for="' + uid + '-' + c[0] + '">' + c[1] + '</label>' +
          '<input class="input" type="number" id="' + uid + '-' + c[0] + '" value="16" min="0" max="200"></div>';
      }).join('') + '</div>' +
      '<label class="check"><input type="checkbox" id="' + uid + '-link" checked><span>四角统一</span></label>' +
      '<div class="radius-stage"><div class="radius-box" id="' + uid + '-box"></div></div>' +
      '<div class="field">' +
        '<div class="label-row"><label class="label" for="' + uid + '-code">CSS 代码</label>' +
        '<div class="label-actions"><button type="button" class="link-btn" id="' + uid + '-copy">复制</button></div></div>' +
        '<textarea id="' + uid + '-code" class="textarea mono" rows="3" readonly></textarea>' +
      '</div>' +
      '<p class="hint">四个角分别设置时可做出「叶子形」「对话气泡」等不规则形状。</p>';

    function update(event) {
      var link = root.querySelector('#' + uid + '-link').checked;
      if (link && event && event.target.id.indexOf('tl') !== -1) {
        ['tr', 'br', 'bl'].forEach(function (key) {
          root.querySelector('#' + uid + '-' + key).value = event.target.value;
        });
      }
      var values = corners.map(function (c) {
        return Math.max(0, parseInt(root.querySelector('#' + uid + '-' + c[0]).value, 10) || 0);
      });
      var css = values.map(function (v) { return v + 'px'; }).join(' ');
      root.querySelector('#' + uid + '-box').style.borderRadius = css;
      root.querySelector('#' + uid + '-code').value = 'border-radius: ' + css + ';';
    }

    corners.forEach(function (c) {
      root.querySelector('#' + uid + '-' + c[0]).addEventListener('input', update);
    });
    root.querySelector('#' + uid + '-link').addEventListener('change', update);
    root.querySelector('#' + uid + '-copy').addEventListener('click', function () {
      window.UI.copyText(root.querySelector('#' + uid + '-code').value);
    });
    update();
  }

  /* ------------------------------ 对比度检测 ------------------------------ */
  function relativeLuminance(hex) {
    var value = hex.replace('#', '');
    if (value.length === 3) value = value.split('').map(function (c) { return c + c; }).join('');
    var channels = [0, 2, 4].map(function (i) {
      var v = parseInt(value.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  function renderContrast(root) {
    var uid = K.uid('contrast');
    root.innerHTML =
      '<div class="form-row">' +
        '<div class="form-item"><label class="label" for="' + uid + '-fg">文字颜色</label>' +
          '<input class="input" type="color" id="' + uid + '-fg" value="#ffffff" style="height:38px;padding:4px"></div>' +
        '<div class="form-item"><label class="label" for="' + uid + '-bg">背景颜色</label>' +
          '<input class="input" type="color" id="' + uid + '-bg" value="#5b5bd6" style="height:38px;padding:4px"></div>' +
        '<div class="form-item" style="flex:2 1 220px"><label class="label" for="' + uid + '-hex">或直接输入色值</label>' +
          '<input class="input mono" type="text" id="' + uid + '-hex" placeholder="例如 #5b5bd6"></div>' +
      '</div>' +
      '<div class="contrast-preview" id="' + uid + '-preview">' +
        '<p class="cp-big">大号文字示例 24px</p>' +
        '<p class="cp-small">正文示例：这段文字用于检查可读性，AA 级要求正文对比度不低于 4.5:1。</p>' +
      '</div>' +
      '<div id="' + uid + '-out"></div>';

    var fg = root.querySelector('#' + uid + '-fg');
    var bg = root.querySelector('#' + uid + '-bg');
    var hexInput = root.querySelector('#' + uid + '-hex');
    var preview = root.querySelector('#' + uid + '-preview');
    var out = root.querySelector('#' + uid + '-out');

    function update() {
      var l1 = relativeLuminance(fg.value);
      var l2 = relativeLuminance(bg.value);
      var ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      preview.style.color = fg.value;
      preview.style.background = bg.value;

      var pass = function (threshold) { return ratio >= threshold ? '通过' : '不通过'; };
      out.innerHTML = '<div class="big-result">对比度 <strong>' + ratio.toFixed(2) + ' : 1</strong></div>' +
        K.table(['用途', '要求', '结果'], [
          ['正文 AA（≤ 24px）', '4.5 : 1', pass(4.5)],
          ['正文 AAA', '7 : 1', pass(7)],
          ['大号文字 AA（≥ 24px 或 19px 粗体）', '3 : 1', pass(3)],
          ['大号文字 AAA', '4.5 : 1', pass(4.5)],
          ['非文本元素（图标、边框）', '3 : 1', pass(3)]
        ]);
    }

    [fg, bg].forEach(function (input) {
      input.addEventListener('input', function () {
        hexInput.value = '';
        update();
      });
    });
    hexInput.addEventListener('input', function () {
      var value = hexInput.value.trim();
      if (/^#?[0-9a-fA-F]{6}$/.test(value) || /^#?[0-9a-fA-F]{3}$/.test(value)) {
        bg.value = value.charAt(0) === '#' ? value : '#' + value;
        update();
      }
    });
    update();
  }

  /* ------------------------------ SQL 格式化 ------------------------------ */
  var SQL_MAJOR = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET',
    'UNION ALL', 'UNION', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL JOIN', 'CROSS JOIN', 'JOIN',
    'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE'];

  function formatSql(sql) {
    var out = sql.replace(/\s+/g, ' ').trim();

    // 关键字大写（按长度从长到短，避免 JOIN 抢先匹配 LEFT JOIN）
    SQL_MAJOR.slice().sort(function (a, b) { return b.length - a.length; }).forEach(function (keyword) {
      var pattern = new RegExp('\\b' + keyword.replace(/ /g, '\\s+') + '\\b', 'gi');
      out = out.replace(pattern, keyword);
    });
    out = out.replace(/\b(and|or|on|as|in|not|like|between|is|null|desc|asc)\b/gi, function (m) {
      return m.toUpperCase();
    });

    // 主要子句换行
    SQL_MAJOR.forEach(function (keyword) {
      var pattern = new RegExp('\\s+' + keyword.replace(/ /g, '\\s+') + '\\b', 'g');
      out = out.replace(pattern, '\n' + keyword);
    });

    // AND / OR 缩进换行
    out = out.replace(/\s+(AND|OR)\s+/g, '\n  $1 ');
    out = out.replace(/\s*,\s*/g, ', ');
    out = out.replace(/\s*=\s*/g, ' = ');
    out = out.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');

    return out.split('\n').map(function (line) {
      return line.trim();
    }).filter(Boolean).join('\n');
  }

  function renderSql(root) {
    K.text(root, {
      uid: 'sqlfmt',
      inputLabel: '原始 SQL',
      inputRows: 10,
      outputLabel: '格式化结果',
      outputRows: 12,
      actionLabel: '格式化',
      sample: 'select u.id,u.name,count(o.id) as cnt from users u left join orders o on o.user_id=u.id where u.status=1 and o.created_at>\'2024-01-01\' group by u.id,u.name order by cnt desc limit 20',
      hint: '采用规则式格式化（关键字大写 + 子句换行），不解析语义；复杂存储过程请使用专业工具。',
      run: function (text) {
        return { output: formatSql(text), note: '格式化完成。' };
      }
    });
  }

  /* ------------------------------ HTML 格式化 ------------------------------ */
  var VOID_TAGS = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];

  function formatHtml(html, unit) {
    var tokens = html.replace(/>\s+</g, '><').match(/<[^>]+>|[^<]+/g) || [];
    var lines = [];
    var depth = 0;
    var rawTag = null;

    tokens.forEach(function (token) {
      var text = token.trim();
      if (!text) return;

      if (rawTag) {
        lines.push(unit.repeat(depth) + text);
        if (new RegExp('</' + rawTag + '>', 'i').test(text)) rawTag = null;
        if (/^<\//.test(text)) depth = Math.max(0, depth - 1);
        return;
      }

      if (/^<\//.test(text)) {
        depth = Math.max(0, depth - 1);
        lines.push(unit.repeat(depth) + text);
        return;
      }

      if (/^<!|^<\?/.test(text)) {
        lines.push(unit.repeat(depth) + text);
        return;
      }

      if (/^<[a-zA-Z]/.test(text)) {
        lines.push(unit.repeat(depth) + text);
        var tagName = (/^<([a-zA-Z][\w-]*)/.exec(text) || [])[1] || '';
        var lower = tagName.toLowerCase();
        var selfClose = /\/>$/.test(text) || VOID_TAGS.indexOf(lower) !== -1;
        if (!selfClose) {
          depth += 1;
          if (lower === 'script' || lower === 'style' || lower === 'pre' || lower === 'textarea') rawTag = lower;
        }
        return;
      }

      lines.push(unit.repeat(depth) + text);
    });

    return lines.join('\n');
  }

  function renderHtmlFormat(root) {
    K.text(root, {
      uid: 'htmlfmt',
      inputLabel: '原始 HTML',
      inputRows: 10,
      outputLabel: '格式化结果',
      outputRows: 12,
      actionLabel: '格式化',
      options: [
        { id: 'indent', type: 'select', label: '缩进', value: '2', options: [{ value: '2', label: '2 空格' }, { value: '4', label: '4 空格' }, { value: 'tab', label: 'Tab' }] }
      ],
      sample: '<div class="card"><h2>标题</h2><p>正文内容 <a href="#">链接</a></p><img src="a.png" alt=""><ul><li>一</li><li>二</li></ul></div>',
      hint: '简单缩进格式化，不做标签合法性校验；&lt;script&gt; / &lt;style&gt; 内容会原样保留。',
      run: function (text, opt) {
        var isTab = opt.indent === 'tab';
        var size = isTab ? 1 : parseInt(opt.indent, 10);
        var unit = isTab ? '\t' : new Array(size + 1).join(' ');
        return {
          output: formatHtml(text, unit),
          note: '已按 ' + (isTab ? 'Tab' : size + ' 空格') + '缩进格式化。'
        };
      }
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['json-to-ts'] = renderJsonToTs;
  window.ToolModules['json-to-csv'] = renderJsonToCsv;
  window.ToolModules['csv-to-json'] = renderCsvToJson;
  window.ToolModules['json-to-yaml'] = renderJsonToYaml;
  window.ToolModules['css-minify'] = renderCssMinify;
  window.ToolModules['regex-cheatsheet'] = renderRegexCheat;
  window.ToolModules['mime-lookup'] = renderMime;
  window.ToolModules['user-agent-parse'] = renderUserAgent;
  window.ToolModules['git-cheatsheet'] = renderGitCheat;
  window.ToolModules['linux-cheatsheet'] = renderLinuxCheat;
  window.ToolModules['css-gradient'] = renderGradient;
  window.ToolModules['box-shadow'] = renderShadow;
  window.ToolModules['border-radius'] = renderRadius;
  window.ToolModules['color-contrast'] = renderContrast;
  window.ToolModules['sql-formatter'] = renderSql;
  window.ToolModules['html-formatter'] = renderHtmlFormat;
})();
