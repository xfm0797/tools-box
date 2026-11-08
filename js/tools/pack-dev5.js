/* =============================================================================
 * 开发辅助工具包 · 第五批（16 个）
 * -----------------------------------------------------------------------------
 * ts-to-json        TS 接口转 JSON 样例
 * json-schema-gen   JSON 转 JSON Schema
 * css-animation-gen CSS 动画生成
 * css-clamp-gen     clamp() 流式字号
 * svg-optimize      SVG 精简
 * regex-explain     正则逐段解释
 * html-to-jsx       HTML 转 JSX
 * semver-range      版本范围判定
 * package-json-gen  package.json 生成
 * tsconfig-gen      tsconfig.json 生成
 * dockerfile-gen    Dockerfile 生成
 * github-action-gen GitHub Actions 工作流
 * nginx-config-gen  Nginx 反向代理配置
 * sql-create-table  字段列表转建表语句
 * enum-gen          枚举代码生成
 * branch-name       分支名生成与解析
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  function codeOut(title, code) {
    return '<div class="label-row"><span class="label">' + K.esc(title) + '</span>' +
      '<div class="label-actions"><button type="button" class="link-btn" data-copy="' + K.esc(code) + '">复制</button></div></div>' +
      '<pre class="code-block">' + K.esc(code) + '</pre>';
  }

  /* ------------------------------ 1. TS 接口转 JSON ------------------------------ */
  function sampleForType(type) {
    var text = String(type || '').trim();
    if (/^'[^']*'(\s*\|\s*'[^']*')+$/.test(text)) return text.match(/'([^']*)'/)[1];
    if (/^"[^"]*"(\s*\|\s*"[^"]*")+$/.test(text)) return text.match(/"([^"]*)"/)[1];
    if (/\|/.test(text)) return sampleForType(text.split('|')[0]);
    if (text === 'string') return 'string';
    if (text === 'number' || text === 'bigint') return 0;
    if (text === 'boolean') return true;
    if (text === 'null') return null;
    if (text === 'Date') return '2026-01-01T00:00:00.000Z';
    if (/^[A-Za-z_$][\w$]*(\[\])+$/.test(text)) return [];
    if (/Array<.+>$/.test(text)) return [];
    if (/Record</.test(text)) return {};
    return null;
  }

  function renderTsToJson(root) {
    K.text(root, {
      uid: 'tstojson',
      inputLabel: 'TypeScript 接口',
      inputRows: 10,
      outputRows: 12,
      actionLabel: '生成',
      options: [
        { id: 'optional', label: '输出可选字段', type: 'checkbox', value: true },
        { id: 'pretty', label: '缩进 2 空格', type: 'checkbox', value: true }
      ],
      hint: '按字段类型生成一份可用的样例数据，常用于 mock、文档示例与前端联调占位。只解析扁平结构，嵌套对象请手动补充。',
      sample: 'interface User {\n  id: number;\n  name: string;\n  email?: string;\n  active: boolean;\n  tags: string[];\n  role: \'admin\' | \'guest\';\n}',
      run: function (text, opt) {
        var body = text.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
        var start = body.indexOf('{');
        var end = body.lastIndexOf('}');
        if (start < 0 || end <= start) return { error: '没找到接口体，请贴一段 interface X { ... }' };
        var inner = body.slice(start + 1, end);
        var fields = inner.split(/[;\n]/).map(function (line) { return line.trim(); }).filter(Boolean);
        var result = {};
        var count = 0;
        fields.forEach(function (line) {
          var m = /^([A-Za-z_$][\w$]*)(\?)?\s*:\s*(.+)$/.exec(line);
          if (!m) return;
          if (m[2] && !opt.optional) return;
          result[m[1]] = sampleForType(m[3]);
          count += 1;
        });
        if (!count) return { error: '没有解析出任何字段，检查一下格式' };
        var json = JSON.stringify(result, null, opt.pretty ? 2 : 0);
        return { output: json, note: '解析出 ' + count + ' 个字段' };
      }
    });
  }

  /* ------------------------------ 2. JSON 转 Schema ------------------------------ */
  function buildSchema(value, withRequired) {
    if (value === null) return { type: 'null' };
    if (Array.isArray(value)) {
      return { type: 'array', items: value.length ? buildSchema(value[0], withRequired) : {} };
    }
    var type = typeof value;
    if (type === 'object') {
      var properties = {};
      var required = [];
      Object.keys(value).forEach(function (key) {
        properties[key] = buildSchema(value[key], withRequired);
        required.push(key);
      });
      var schema = { type: 'object', properties: properties };
      if (withRequired && required.length) schema.required = required;
      schema.additionalProperties = false;
      return schema;
    }
    if (type === 'number') {
      return { type: Number.isInteger(value) ? 'integer' : 'number' };
    }
    return { type: type };
  }

  function renderJsonSchema(root) {
    K.text(root, {
      uid: 'jsonschema',
      inputLabel: 'JSON 数据',
      inputRows: 10,
      outputRows: 14,
      actionLabel: '生成',
      options: [
        { id: 'required', label: '把现有字段标为 required', type: 'checkbox', value: true },
        { id: 'draft', label: '加上 $schema 声明', type: 'checkbox', value: true }
      ],
      hint: '由真实数据反推 Schema，适合给接口加校验、给表单生成配置。注意样例里没有出现的字段不会进 Schema，数组只取第一项的类型。',
      sample: '{\n  "id": 1,\n  "name": "XFM",\n  "tags": ["tools"],\n  "profile": { "city": "Beijing", "age": 30 }\n}',
      run: function (text, opt) {
        var data;
        try {
          data = JSON.parse(text);
        } catch (error) {
          return { error: 'JSON 解析失败：' + error.message };
        }
        var schema = buildSchema(data, opt.required);
        if (opt.draft) {
          var merged = { $schema: 'https://json-schema.org/draft/2020-12/schema' };
          Object.keys(schema).forEach(function (key) { merged[key] = schema[key]; });
          schema = merged;
        }
        return { output: JSON.stringify(schema, null, 2), note: '已生成 ' + Object.keys(schema.properties || {}).length + ' 个顶层字段的 Schema' };
      }
    });
  }

  /* ------------------------------ 3. CSS 动画 ------------------------------ */
  var ANIMATIONS = {
    fadeIn: { keyframes: 'from { opacity: 0; }\n  to { opacity: 1; }', extra: '' },
    slideUp: { keyframes: 'from { opacity: 0; transform: translateY(16px); }\n  to { opacity: 1; transform: translateY(0); }', extra: '' },
    pop: { keyframes: '0% { transform: scale(0.9); }\n  60% { transform: scale(1.03); }\n  100% { transform: scale(1); }', extra: '' },
    spin: { keyframes: 'from { transform: rotate(0deg); }\n  to { transform: rotate(360deg); }', extra: '' },
    pulse: { keyframes: '0%, 100% { opacity: 1; }\n  50% { opacity: 0.45; }', extra: '' },
    shake: { keyframes: '0%, 100% { transform: translateX(0); }\n  25% { transform: translateX(-6px); }\n  75% { transform: translateX(6px); }', extra: '' },
    bounce: { keyframes: '0%, 100% { transform: translateY(0); }\n  50% { transform: translateY(-12px); }', extra: '' },
    flip: { keyframes: 'from { transform: rotateY(0); }\n  to { transform: rotateY(180deg); }', extra: '' }
  };

  function renderCssAnimation(root) {
    K.form(root, {
      uid: 'cssanim',
      fields: [
        { id: 'preset', label: '动画', type: 'select', value: 'fadeIn', options: Object.keys(ANIMATIONS).map(function (key) {
          return { value: key, label: key };
        }) },
        { id: 'name', label: '动画名', type: 'text', value: 'fade-in' },
        { id: 'duration', label: '时长（ms）', type: 'number', value: 400, min: 50, max: 5000 },
        { id: 'easing', label: '缓动', type: 'select', value: 'cubic-bezier(0.16, 1, 0.3, 1)', options: [
          { value: 'ease', label: 'ease' },
          { value: 'linear', label: 'linear' },
          { value: 'ease-in-out', label: 'ease-in-out' },
          { value: 'cubic-bezier(0.16, 1, 0.3, 1)', label: 'cubic-bezier 平滑' }
        ] },
        { id: 'repeat', label: '重复', type: 'select', value: '1', options: [
          { value: '1', label: '一次' },
          { value: 'infinite', label: '无限循环' }
        ] },
        { id: 'fill', label: '保留结束状态（forwards）', type: 'checkbox', value: true }
      ],
      actionLabel: '生成',
      hint: '生成的 keyframes 用 transform 与 opacity，走 GPU 合成层，不会触发重排；避免对 width / top 做动画。',
      sample: { preset: 'slideUp', name: 'slide-up', duration: 400, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', repeat: '1', fill: true },
      run: function (values) {
        var preset = ANIMATIONS[values.preset] || ANIMATIONS.fadeIn;
        var name = String(values.name || 'anim').replace(/[^a-zA-Z0-9-_]/g, '-');
        var duration = Math.max(50, Math.min(5000, parseInt(values.duration, 10) || 400));
        var css = '@keyframes ' + name + ' {\n  ' + preset.keyframes + '\n}\n\n' +
          '.animate-' + name + ' {\n' +
          '  animation: ' + name + ' ' + duration + 'ms ' + values.easing + ' ' + values.repeat +
          (values.fill ? ' both' : '') + ';\n}\n\n' +
          '@media (prefers-reduced-motion: reduce) {\n  .animate-' + name + ' { animation: none; }\n}';
        return { html: codeOut('CSS', css), note: name + ' · ' + duration + 'ms' };
      }
    });
  }

  /* ------------------------------ 4. clamp 流式字号 ------------------------------ */
  function renderClamp(root) {
    K.form(root, {
      uid: 'clamp',
      fields: [
        { id: 'min', label: '最小字号（px）', type: 'number', value: 16, min: 8, max: 120 },
        { id: 'max', label: '最大字号（px）', type: 'number', value: 32, min: 8, max: 200 },
        { id: 'vwMin', label: '视口起点（px）', type: 'number', value: 375, min: 240, max: 2000 },
        { id: 'vwMax', label: '视口终点（px）', type: 'number', value: 1280, min: 320, max: 3000 }
      ],
      actionLabel: '生成',
      hint: 'clamp(最小值, 中间值, 最大值)：中间值用 calc(斜率 × 100vw + 截距) 让字号随视口线性变化，两端自动夹紧，省掉一堆媒体查询。',
      sample: { min: 16, max: 32, vwMin: 375, vwMax: 1280 },
      run: function (values) {
        var min = parseFloat(values.min);
        var max = parseFloat(values.max);
        var vwMin = parseFloat(values.vwMin);
        var vwMax = parseFloat(values.vwMax);
        if (!isFinite(min) || !isFinite(max) || !isFinite(vwMin) || !isFinite(vwMax)) return { error: '请填写完整数值' };
        if (max < min) return { error: '最大字号不能小于最小字号' };
        if (vwMax <= vwMin) return { error: '视口终点需大于起点' };
        var slope = (max - min) / (vwMax - vwMin);
        var intercept = min - slope * vwMin;
        var vwPart = K.num(slope * 100, 4);
        var css = 'font-size: clamp(' + K.num(min, 2) + 'px, ' + K.num(intercept, 4) + 'px + ' + vwPart + 'vw, ' + K.num(max, 2) + 'px);';
        var lines = [
          '/* ' + vwMin + 'px → ' + min + 'px，' + vwMax + 'px → ' + max + 'px */',
          css,
          '',
          '/* rem 写法（1rem = 16px） */',
          'font-size: clamp(' + K.num(min / 16, 3) + 'rem, ' + K.num(intercept / 16, 4) + 'rem + ' + vwPart + 'vw, ' + K.num(max / 16, 3) + 'rem);'
        ];
        return { html: codeOut('CSS', lines.join('\n')), note: '斜率 ' + vwPart + 'vw，截距 ' + K.num(intercept, 2) + 'px' };
      }
    });
  }

  /* ------------------------------ 5. SVG 精简 ------------------------------ */
  function renderSvgOptimize(root) {
    K.text(root, {
      uid: 'svgopt',
      inputLabel: 'SVG 源码',
      inputRows: 12,
      outputRows: 12,
      actionLabel: '精简',
      options: [
        { id: 'meta', label: '移除 metadata / title / desc', type: 'checkbox', value: true },
        { id: 'numbers', label: '数值保留 2 位小数', type: 'checkbox', value: true },
        { id: 'attrs', label: '移除编辑器属性', type: 'checkbox', value: true }
      ],
      hint: '从 Figma / Sketch 导出的 SVG 常带一堆命名空间、注释与 metadata。这里做无损清理，不改变图形；如果要进一步压缩，可再用 svgo。',
      sample: '<?xml version="1.0" encoding="UTF-8"?>\n<!-- Generator: Sketch -->\n<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">\n  <metadata>...</metadata>\n  <title>icon</title>\n  <path d="M12 2.000000 L22 22.000000" fill="none" stroke="#000" stroke-width="2"/>\n</svg>',
      run: function (text, opt) {
        var before = text.length;
        var out = text;
        out = out.replace(/<\?xml[\s\S]*?\?>/g, '');
        out = out.replace(/<!DOCTYPE[\s\S]*?>/g, '');
        out = out.replace(/<!--[\s\S]*?-->/g, '');
        if (opt.meta) {
          out = out.replace(/<metadata[\s\S]*?<\/metadata>/g, '');
          out = out.replace(/<title[\s\S]*?<\/title>/g, '');
          out = out.replace(/<desc[\s\S]*?<\/desc>/g, '');
        }
        if (opt.attrs) {
          out = out.replace(/\s(data-name|id|class)="[^"]*"/g, '');
          out = out.replace(/\sxmlns:(xlink|x|i|graph|sketch)="[^"]*"/g, '');
        }
        if (opt.numbers) {
          out = out.replace(/-?\d+\.\d{3,}/g, function (num) {
            return String(Math.round(parseFloat(num) * 100) / 100);
          });
        }
        out = out.replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ').trim();
        if (!/<svg/i.test(out)) return { error: '没检测到 <svg> 标签，确认一下粘贴的是 SVG 源码' };
        var saved = before - out.length;
        return {
          output: out,
          note: '从 ' + K.formatBytes(before) + ' 压到 ' + K.formatBytes(out.length) +
            '（省 ' + (saved > 0 ? K.num((saved / before) * 100, 1) + '%' : '0%') + '）'
        };
      }
    });
  }

  /* ------------------------------ 6. 正则解释 ------------------------------ */
  var REGEX_RULES = [
    [/^\\d/, '\\d 数字 0-9'],
    [/^\\D/, '\\D 非数字'],
    [/^\\w/, '\\w 单词字符（字母、数字、下划线）'],
    [/^\\W/, '\\W 非单词字符'],
    [/^\\s/, '\\s 空白字符'],
    [/^\\S/, '\\S 非空白字符'],
    [/^\\b/, '\\b 单词边界'],
    [/^\\B/, '\\B 非单词边界'],
    [/^\\n/, '\\n 换行符'],
    [/^\\r/, '\\r 回车符'],
    [/^\\t/, '\\t 制表符'],
    [/^\\u[0-9a-fA-F]{4}/, '\\uXXXX Unicode 码位'],
    [/^\\p\{[^}]+\}/, '\\p{...} Unicode 属性'],
    [/^\\[1-9]\d*/, '反向引用：匹配第 n 个捕获组的内容'],
    [/^\\[a-zA-Z]/, '转义字符：按字面匹配该字符'],
    [/^\^\$/, '空行（仅匹配空字符串行）'],
    [/^\^/, '^ 行 / 字符串开头'],
    [/^\$/, '$ 行 / 字符串结尾'],
    [/^\(\?:/, '(?: 非捕获分组'],
    [/^\?<[=!]/, '❓ 不支持的写法'],
    [/^\(\?<[A-Za-z_$][\w$]*>/, '(?<name> 命名捕获分组'],
    [/^\(\?=/, '(?= 正向先行断言：后面必须紧跟'],
    [/^\(\?!/, '(?! 负向先行断言：后面不能紧跟'],
    [/^\(\?<=/, '(?<= 正向后行断言：前面必须是'],
    [/^\(\?<!/, '(?<! 负向后行断言：前面不能是'],
    [/^\(/, '( 捕获分组开始'],
    [/^\)/, ') 分组结束'],
    [/^\[/, '[ 字符集开始'],
    [/^\]/, '] 字符集结束'],
    [/^\{[^}]*\}/, '{n,m} 量词：重复 n 到 m 次'],
    [/^\*\?|^\+\?|^\?\?/, '? 惰性量词：尽可能少匹配'],
    [/^\*/, '* 量词：重复 0 次或多次'],
    [/^\+/, '+ 量词：重复 1 次或多次'],
    [/^\?/, '? 量词：出现 0 或 1 次（可选）'],
    [/^\|/, '| 或：匹配左右任一侧'],
    [/^\./, '. 任意字符（默认不含换行）']
  ];

  function explainRegex(pattern) {
    var tokens = [];
    var index = 0;
    while (index < pattern.length) {
      var rest = pattern.slice(index);
      var matched = null;
      for (var i = 0; i < REGEX_RULES.length; i += 1) {
        var rule = REGEX_RULES[i];
        var m = rule[0].exec(rest);
        if (m && m[0].length) {
          matched = { token: m[0], meaning: rule[1] };
          break;
        }
      }
      if (!matched) {
        // 字符集整体读取
        if (rest.charAt(0) === '[') {
          var close = rest.indexOf(']');
          if (close > 0) {
            matched = { token: rest.slice(0, close + 1), meaning: '字符集：匹配其中任意一个字符' + (/^\^/.test(rest.slice(1, close)) ? '（取反）' : '') };
          }
        }
      }
      if (!matched) {
        matched = { token: rest.charAt(0), meaning: '字面量：匹配字符「' + rest.charAt(0) + '」' };
      }
      tokens.push(matched);
      index += matched.token.length;
    }
    return tokens;
  }

  function renderRegexExplain(root) {
    K.text(root, {
      uid: 'regexexplain',
      inputLabel: '正则表达式（不含首尾 /）',
      inputRows: 3,
      actionLabel: '解释',
      hideOutput: true,
      hint: '按从左到右的顺序把正则拆成最小单元，逐段说明含义。适合读别人写的复杂正则，或者给团队成员讲清楚匹配逻辑。',
      sample: '^(?:https?):\\/\\/([\\w-]+\\.)+[\\w]{2,6}(\\/.*)?$',
      run: function (text) {
        var pattern = text.trim().replace(/^\/|\/[gimsuy]*$/g, '');
        if (!pattern) return { error: '请输入正则表达式' };
        var tokens = explainRegex(pattern);
        var rows = tokens.map(function (item, index) {
          return [String(index + 1), item.token, { html: '<code>' + K.esc(item.token) + '</code>' }, item.meaning];
        });
        var groups = (pattern.match(/\((?!\?)/g) || []).length;
        return {
          html: K.table(['#', '原始', '单元', '说明'], rows),
          output: '',
          note: '共 ' + tokens.length + ' 个单元，' + groups + ' 个捕获组'
        };
      }
    });
  }

  /* ------------------------------ 7. HTML 转 JSX ------------------------------ */
  var JSX_ATTRS = {
    'class': 'className', 'for': 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly',
    maxlength: 'maxLength', colspan: 'colSpan', rowspan: 'rowSpan', autofocus: 'autoFocus',
    autocomplete: 'autoComplete', contenteditable: 'contentEditable', novalidate: 'noValidate',
    srcset: 'srcSet', 'http-equiv': 'httpEquiv', 'accept-charset': 'acceptCharset',
    onclick: 'onClick', onchange: 'onChange', onsubmit: 'onSubmit', oninput: 'onInput'
  };

  function styleToObject(style) {
    var pairs = style.split(';').map(function (item) { return item.trim(); }).filter(Boolean);
    var parts = pairs.map(function (pair) {
      var idx = pair.indexOf(':');
      if (idx < 0) return null;
      var key = pair.slice(0, idx).trim().replace(/-([a-z])/g, function (all, ch) { return ch.toUpperCase(); });
      var value = pair.slice(idx + 1).trim();
      return key + ": '" + value.replace(/'/g, "\\'") + "'";
    }).filter(Boolean);
    return '{{' + parts.join(', ') + '}}';
  }

  function renderHtmlToJsx(root) {
    K.text(root, {
      uid: 'htmltojsx',
      inputLabel: 'HTML 片段',
      inputRows: 12,
      outputRows: 12,
      actionLabel: '转换',
      options: [
        { id: 'style', label: '内联 style 转对象', type: 'checkbox', value: true },
        { id: 'comment', label: '注释转 {/* */}', type: 'checkbox', value: true }
      ],
      hint: 'JSX 与 HTML 的差异主要在：class → className、自闭合标签必须带 /、style 要写成对象、注释用 {/* */}。转换后仍需自行检查事件与自定义属性。',
      sample: '<div class="card" style="padding:12px;background:#fff">\n  <!-- 标题 -->\n  <h3 for="x">标题</h3>\n  <img src="a.png">\n  <br>\n</div>',
      run: function (text, opt) {
        var out = text;
        if (opt.comment) out = out.replace(/<!--([\s\S]*?)-->/g, function (all, body) { return '{/*' + body + '*/}'; });
        if (opt.style) {
          out = out.replace(/style="([^"]*)"/g, function (all, body) { return 'style=' + styleToObject(body); });
        }
        out = out.replace(/\s([a-zA-Z-]+)=/g, function (all, name) {
          var lower = name.toLowerCase();
          var mapped = JSX_ATTRS[lower];
          if (mapped) return ' ' + mapped + '=';
          if (/^data-|^aria-/.test(lower)) return ' ' + lower + '=';
          if (lower !== name) return ' ' + lower + '=';
          return all;
        });
        out = out.replace(/<(br|hr|img|input|meta|link|source|area|base|col|embed|track|wbr)([^>]*?)\s*\/?>/gi, function (all, tag, rest) {
          return '<' + tag.toLowerCase() + rest.replace(/\s+$/, '') + ' />';
        });
        return { output: out, note: '已转换 ' + (out.match(/className=/g) || []).length + ' 处 className' };
      }
    });
  }

  /* ------------------------------ 8. 版本范围 ------------------------------ */
  function parseVersion(text) {
    var m = /^v?(\d+)(?:\.(\d+|[xX*]))?(?:\.(\d+|[xX*]))?(?:-([0-9A-Za-z.-]+))?$/.exec(String(text).trim());
    if (!m) return null;
    return {
      major: parseInt(m[1], 10),
      minor: m[2] === undefined || /[xX*]/.test(m[2]) ? null : parseInt(m[2], 10),
      patch: m[3] === undefined || /[xX*]/.test(m[3]) ? null : parseInt(m[3], 10),
      pre: m[4] || ''
    };
  }

  function compareVersion(a, b) {
    if (a.major !== b.major) return a.major > b.major ? 1 : -1;
    if ((a.minor || 0) !== (b.minor || 0)) return (a.minor || 0) > (b.minor || 0) ? 1 : -1;
    if ((a.patch || 0) !== (b.patch || 0)) return (a.patch || 0) > (b.patch || 0) ? 1 : -1;
    if (a.pre === b.pre) return 0;
    if (!a.pre) return 1;
    if (!b.pre) return -1;
    return a.pre > b.pre ? 1 : -1;
  }

  function expandComparator(token) {
    if (token === '*' || token === 'x' || token === 'X') return [];
    var opMatch = /^(\^|~|>=|<=|>|<|=)?\s*(.+)$/.exec(token);
    var op = opMatch[1] || '=';
    var version = parseVersion(opMatch[2]);
    if (!version) throw new Error('无法解析版本：' + token);
    if (op === '^') {
      var upper;
      if (version.major > 0 || version.minor === null) upper = { major: version.major + 1, minor: 0, patch: 0, pre: '' };
      else if (version.minor > 0) upper = { major: 0, minor: version.minor + 1, patch: 0, pre: '' };
      else upper = { major: 0, minor: 0, patch: (version.patch || 0) + 1, pre: '' };
      return [{ op: '>=', version: version }, { op: '<', version: upper }];
    }
    if (op === '~') {
      var upperPatch = { major: version.major, minor: (version.minor || 0) + 1, patch: 0, pre: '' };
      return [{ op: '>=', version: version }, { op: '<', version: upperPatch }];
    }
    if ((version.minor === null || version.patch === null) && (op === '=' || op === '>=' || op === '<')) {
      var low = { major: version.major, minor: version.minor || 0, patch: version.patch || 0, pre: '' };
      var high = version.minor === null
        ? { major: version.major + 1, minor: 0, patch: 0, pre: '' }
        : { major: version.major, minor: version.minor + 1, patch: 0, pre: '' };
      if (op === '=') return [{ op: '>=', version: low }, { op: '<', version: high }];
    }
    return [{ op: op, version: version }];
  }

  function testComparator(version, comp) {
    var cmp = compareVersion(version, comp.version);
    if (comp.op === '>=') return cmp >= 0;
    if (comp.op === '>') return cmp > 0;
    if (comp.op === '<=') return cmp <= 0;
    if (comp.op === '<') return cmp < 0;
    return cmp === 0;
  }

  function satisfies(version, range) {
    var sets = String(range).split('||');
    return sets.some(function (set) {
      var text = set.trim();
      if (!text || text === '*') return true;
      var hyphen = /^(\S+)\s+-\s+(\S+)$/.exec(text);
      var comps = [];
      if (hyphen) {
        comps = comps.concat(expandComparator('>=' + hyphen[1]));
        comps = comps.concat(expandComparator('<=' + hyphen[2]));
      } else {
        text.replace(/(\^|~|>=|<=|>|<|=)?\s*([0-9A-Za-z.*xX-]+)/g, function (all, op, ver) {
          comps = comps.concat(expandComparator((op || '') + ver));
          return all;
        });
      }
      return comps.every(function (comp) { return testComparator(version, comp); });
    });
  }

  function renderSemverRange(root) {
    K.form(root, {
      uid: 'semverrange',
      fields: [
        { id: 'version', label: '具体版本', type: 'text', value: '1.4.2' },
        { id: 'range', label: '版本范围', type: 'text', value: '^1.2.0' }
      ],
      actionLabel: '判定',
      hint: '支持 ^ ~ >= <= > < =、1.2.x、*、1.2.3 - 2.0.0 与 || 组合。^1.2.3 表示「不改变最左非零位」，~1.2.3 只允许补丁号变化。',
      sample: { version: '1.4.2', range: '^1.2.0' },
      run: function (values) {
        var version = parseVersion(values.version);
        if (!version) return { error: '版本格式不合法，应形如 1.2.3' };
        if (version.minor === null || version.patch === null) return { error: '请填写完整的三段版本号' };
        if (!String(values.range || '').trim()) return { error: '请填写版本范围' };
        var matched = satisfies(version, values.range);
        var rows = [
          { key: '版本', value: 'v' + version.major + '.' + version.minor + '.' + version.patch + (version.pre ? '-' + version.pre : ''), mono: false },
          { key: '范围', value: values.range, mono: false },
          { key: '结果', value: matched ? '满足 ✔' : '不满足 ✘', mono: false }
        ];
        var tryList = ['1.0.0', '1.2.0', '1.2.9', '1.3.0', '1.9.9', '2.0.0'].map(function (item) {
          var v = parseVersion(item);
          return item + ' ' + (satisfies(v, values.range) ? '✔' : '✘');
        }).join('   ');
        rows.push({ key: '常见版本对照', value: tryList, mono: false });
        return { rows: rows, note: matched ? '在范围内' : '超出范围' };
      }
    });
  }

  /* ------------------------------ 9. package.json ------------------------------ */
  function renderPackageJson(root) {
    K.form(root, {
      uid: 'pkgjson',
      stack: true,
      fields: [
        { id: 'name', label: '包名', type: 'text', value: 'my-tools' },
        { id: 'version', label: '版本', type: 'text', value: '1.0.0' },
        { id: 'desc', label: '描述', type: 'text', value: '纯前端小工具集合' },
        { id: 'type', label: '模块类型', type: 'select', value: 'module', options: [
          { value: 'module', label: 'ESM（"type": "module"）' },
          { value: 'commonjs', label: 'CommonJS' }
        ] },
        { id: 'scripts', label: 'scripts（每行 key: value）', type: 'textarea', rows: 4, wide: true, value: 'dev: vite\ndev: 启动开发服务器\nbuild: vite build\nbuild: 生产构建\ntest: vitest run' },
        { id: 'deps', label: '依赖（每行 name@version，可空）', type: 'textarea', rows: 3, wide: true, value: 'vue@^3.4.0\nvue-router@^4.2.0' },
        { id: 'license', label: '许可证', type: 'text', value: 'MIT' }
      ],
      actionLabel: '生成',
      hint: 'scripts 里带中文说明的行会被当成上一行的注释放进 note；依赖按 name@version 拆分，支持 ^ ~ 前缀。',
      run: function (values) {
        var name = String(values.name || '').trim().toLowerCase();
        if (!/^[a-z0-9@/._-]+$/.test(name)) return { error: '包名只能包含小写字母、数字、- _ . @ /' };
        var pkg = {
          name: name,
          version: String(values.version || '1.0.0').trim(),
          description: String(values.desc || '').trim(),
          type: values.type,
          scripts: {},
          license: String(values.license || 'MIT').trim()
        };
        if (!/^\d+\.\d+\.\d+/.test(pkg.version)) return { error: '版本需符合 semver，如 1.0.0' };
        var notes = [];
        String(values.scripts || '').split(/\r?\n/).forEach(function (line) {
          var raw = line.trim();
          if (!raw) return;
          var idx = raw.indexOf(':');
          if (idx < 0) return;
          var key = raw.slice(0, idx).trim();
          var value = raw.slice(idx + 1).trim();
          if (!key) return;
          if (notes.length && /^[\u4e00-\u9fa5]/.test(value) && key === notes[notes.length - 1].key) {
            notes[notes.length - 1].note = value;
            return;
          }
          pkg.scripts[key] = value;
          notes.push({ key: key, note: '' });
        });
        var deps = {};
        String(values.deps || '').split(/\r?\n/).forEach(function (line) {
          var raw = line.trim();
          if (!raw) return;
          var at = raw.lastIndexOf('@');
          if (at <= 0) throw new Error('依赖「' + raw + '」缺少版本，写成 name@^1.0.0');
          deps[raw.slice(0, at)] = raw.slice(at + 1);
        });
        if (Object.keys(deps).length) pkg.dependencies = deps;
        var json = JSON.stringify(pkg, null, 2);
        var desc = notes.filter(function (item) { return item.note; })
          .map(function (item) { return item.key + '：' + item.note; }).join('\n');
        return {
          html: codeOut('package.json', json),
          note: desc ? '脚本说明 → ' + desc.replace(/\n/g, ' / ') : '已生成 package.json'
        };
      }
    });
  }

  /* ------------------------------ 10. tsconfig ------------------------------ */
  function renderTsconfig(root) {
    K.form(root, {
      uid: 'tsconfig',
      fields: [
        { id: 'target', label: 'target', type: 'select', value: 'ES2022', options: ['ES2017', 'ES2020', 'ES2022', 'ESNext'].map(function (t) {
          return { value: t, label: t };
        }) },
        { id: 'module', label: 'module', type: 'select', value: 'ESNext', options: ['CommonJS', 'ES2020', 'ESNext', 'NodeNext'].map(function (m) {
          return { value: m, label: m };
        }) },
        { id: 'jsx', label: 'jsx', type: 'select', value: 'react-jsx', options: [
          { value: 'react-jsx', label: 'react-jsx（React 17+）' },
          { value: 'preserve', label: 'preserve' },
          { value: 'none', label: '不使用' }
        ] },
        { id: 'strict', label: '开启 strict', type: 'checkbox', value: true },
        { id: 'paths', label: '路径别名（如 @/* -> src/*）', type: 'text', value: '@/* -> src/*' },
        { id: 'outDir', label: '输出目录', type: 'text', value: 'dist' }
      ],
      actionLabel: '生成',
      hint: 'bundler 模式（moduleResolution: bundler）适合 Vite / esbuild 项目；Node 项目选 NodeNext 并把 module 设为 NodeNext，才能正确处理 .js 扩展名。',
      sample: { target: 'ES2022', module: 'ESNext', jsx: 'react-jsx', strict: true, paths: '@/* -> src/*', outDir: 'dist' },
      run: function (values) {
        var compiler = {
          target: values.target,
          module: values.module,
          moduleResolution: values.module === 'NodeNext' ? 'NodeNext' : 'bundler',
          lib: ['ES2022', 'DOM', 'DOM.Iterable'],
          strict: !!values.strict,
          skipLibCheck: true,
          esModuleInterop: true,
          forceConsistentCasingInFileNames: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          outDir: String(values.outDir || 'dist').trim()
        };
        if (values.jsx !== 'none') compiler.jsx = values.jsx;
        var alias = String(values.paths || '').trim();
        if (alias) {
          var m = /^(.+?)\s*(?:->|=>|:)\s*(.+)$/.exec(alias);
          if (m) {
            compiler.baseUrl = '.';
            compiler.paths = {};
            compiler.paths[m[1].trim()] = [m[2].trim()];
          }
        }
        var config = { compilerOptions: compiler, include: ['src'] };
        return { html: codeOut('tsconfig.json', JSON.stringify(config, null, 2)), note: 'target ' + values.target + ' · module ' + values.module };
      }
    });
  }

  /* ------------------------------ 11. Dockerfile ------------------------------ */
  var BASE_PRESETS = {
    node: { image: 'node:20-alpine', workdir: '/app', install: 'npm ci', build: 'npm run build', cmd: '["node", "dist/index.js"]', port: '3000' },
    nodeDev: { image: 'node:20-alpine', workdir: '/app', install: 'npm ci', build: '', cmd: '["npm", "run", "dev"]', port: '5173' },
    nginx: { image: 'nginx:alpine', workdir: '/usr/share/nginx/html', install: '', build: '', cmd: '', port: '80' },
    python: { image: 'python:3.12-slim', workdir: '/app', install: 'pip install --no-cache-dir -r requirements.txt', build: '', cmd: '["python", "main.py"]', port: '8000' },
    go: { image: 'golang:1.22-alpine', workdir: '/app', install: 'go mod download', build: 'go build -o server .', cmd: '["/app/server"]', port: '8080' }
  };

  function renderDockerfile(root) {
    K.form(root, {
      uid: 'dockerfile',
      fields: [
        { id: 'preset', label: '技术栈', type: 'select', value: 'node', options: [
          { value: 'node', label: 'Node 服务' },
          { value: 'nodeDev', label: 'Node 前端开发' },
          { value: 'nginx', label: 'Nginx 静态站点' },
          { value: 'python', label: 'Python' },
          { value: 'go', label: 'Go' }
        ] },
        { id: 'port', label: '暴露端口', type: 'text', value: '3000' },
        { id: 'multi', label: '多阶段构建（更小镜像）', type: 'checkbox', value: true },
        { id: 'nonroot', label: '使用非 root 用户', type: 'checkbox', value: true }
      ],
      actionLabel: '生成',
      hint: '多阶段构建只把产物拷进运行镜像，体积能小一个量级；非 root 用户运行时能降低容器逃逸风险。生成的只是起点，仍建议配合 .dockerignore。',
      sample: { preset: 'node', port: '3000', multi: true, nonroot: true },
      run: function (values) {
        var preset = BASE_PRESETS[values.preset] || BASE_PRESETS.node;
        var port = String(values.port || preset.port).replace(/\D/g, '') || preset.port;
        var lines = [];
        if (values.multi && preset.build) {
          lines.push('FROM ' + preset.image + ' AS builder');
          lines.push('WORKDIR ' + preset.workdir);
          lines.push('COPY package*.json ./');
          lines.push('RUN ' + preset.install);
          lines.push('COPY . .');
          lines.push('RUN ' + preset.build);
          lines.push('');
          lines.push('FROM ' + preset.image);
          lines.push('WORKDIR ' + preset.workdir);
          lines.push('ENV NODE_ENV=production');
          lines.push('COPY --from=builder ' + preset.workdir + '/dist ./dist');
          lines.push('COPY package*.json ./');
          lines.push('RUN ' + (values.preset === 'node' ? 'npm ci --omit=dev' : preset.install));
        } else {
          lines.push('FROM ' + preset.image);
          lines.push('WORKDIR ' + preset.workdir);
          if (preset.install) {
            lines.push('COPY package*.json ./');
            lines.push('RUN ' + preset.install);
            lines.push('COPY . .');
          } else {
            lines.push('COPY . .');
          }
          if (preset.build) lines.push('RUN ' + preset.build);
        }
        if (values.nonroot && values.preset !== 'nginx') {
          lines.push('');
          lines.push('# 非 root 运行');
          lines.push('RUN addgroup -S app && adduser -S app -G app');
          lines.push('USER app');
        }
        lines.push('');
        lines.push('EXPOSE ' + port);
        if (preset.cmd) lines.push('CMD ' + preset.cmd);
        return { html: codeOut('Dockerfile', lines.join('\n')), note: lines.length + ' 行 · 端口 ' + port };
      }
    });
  }

  /* ------------------------------ 12. GitHub Actions ------------------------------ */
  function renderGithubAction(root) {
    K.form(root, {
      uid: 'ghaction',
      fields: [
        { id: 'name', label: '工作流名称', type: 'text', value: 'CI' },
        { id: 'on', label: '触发方式', type: 'select', value: 'both', options: [
          { value: 'push', label: 'push 到 main' },
          { value: 'both', label: 'push + PR' },
          { value: 'manual', label: '仅手动触发' }
        ] },
        { id: 'node', label: 'Node 版本', type: 'text', value: '20' },
        { id: 'install', label: '安装命令', type: 'text', value: 'npm ci' },
        { id: 'run', label: '执行命令（每行一条）', type: 'textarea', rows: 3, wide: true, value: 'npm run lint\nnpm test\nnpm run build' }
      ],
      actionLabel: '生成',
      hint: '默认带 actions/checkout + setup-node + npm 缓存，是多语言项目最通用的骨架；需要部署时再加一段 steps 即可。',
      sample: { name: 'CI', on: 'both', node: '20', install: 'npm ci', run: 'npm run lint\nnpm test' },
      run: function (values) {
        var name = String(values.name || 'CI').trim();
        var lines = ['name: ' + name, '', 'on:'];
        if (values.on === 'manual') {
          lines.push('  workflow_dispatch:');
        } else if (values.on === 'push') {
          lines.push('  push:', '    branches: [main]');
        } else {
          lines.push('  push:', '    branches: [main]', '  pull_request:', '    branches: [main]');
        }
        lines.push('');
        lines.push('jobs:');
        lines.push('  build:');
        lines.push('    runs-on: ubuntu-latest');
        lines.push('    steps:');
        lines.push('      - uses: actions/checkout@v4');
        lines.push('      - uses: actions/setup-node@v4');
        lines.push('        with:');
        lines.push('          node-version: \'' + String(values.node || '20').trim() + '\'');
        lines.push('          cache: npm');
        lines.push('      - name: 安装依赖');
        lines.push('        run: ' + String(values.install || 'npm ci').trim());
        String(values.run || '').split(/\r?\n/).forEach(function (line, index) {
          var cmd = line.trim();
          if (!cmd) return;
          lines.push('      - name: 步骤 ' + (index + 1));
          lines.push('        run: ' + cmd);
        });
        return { html: codeOut('.github/workflows/ci.yml', lines.join('\n')), note: '触发：' + values.on };
      }
    });
  }

  /* ------------------------------ 13. Nginx 反代 ------------------------------ */
  function renderNginx(root) {
    K.form(root, {
      uid: 'nginx',
      fields: [
        { id: 'domain', label: '域名', type: 'text', value: 'example.com' },
        { id: 'upstream', label: '上游地址', type: 'text', value: '127.0.0.1:3000' },
        { id: 'ssl', label: '启用 HTTPS（443 + 证书）', type: 'checkbox', value: true },
        { id: 'ws', label: '支持 WebSocket', type: 'checkbox', value: true },
        { id: 'body', label: '上传大小上限（m）', type: 'text', value: '20' },
        { id: 'root', label: '静态目录（可空）', type: 'text', placeholder: '/var/www/site' }
      ],
      actionLabel: '生成',
      hint: '反向代理的标准骨架：proxy_set_header 必须带上 Host 与 X-Forwarded-*，否则上游拿不到真实客户端信息；WebSocket 需要额外透传 Upgrade 与 Connection。',
      sample: { domain: 'tools.lovou.pw', upstream: '127.0.0.1:8080', ssl: true, ws: true, body: '20', root: '' },
      run: function (values) {
        var domain = String(values.domain || '').trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
        if (!/^[a-zA-Z0-9.-]+$/.test(domain)) return { error: '域名格式不合法' };
        var upstream = String(values.upstream || '').trim();
        if (!/^[\w.-]+(:\d+)?$/.test(upstream)) return { error: '上游地址应为 host:port' };
        var lines = [];
        if (values.ssl) {
          lines.push('server {');
          lines.push('  listen 80;');
          lines.push('  server_name ' + domain + ';');
          lines.push('  return 301 https://$host$request_uri;');
          lines.push('}');
          lines.push('');
        }
        lines.push('server {');
        lines.push('  listen ' + (values.ssl ? '443 ssl http2' : '80') + ';');
        lines.push('  server_name ' + domain + ';');
        if (values.ssl) {
          lines.push('  ssl_certificate     /etc/letsencrypt/live/' + domain + '/fullchain.pem;');
          lines.push('  ssl_certificate_key /etc/letsencrypt/live/' + domain + '/privkey.pem;');
          lines.push('  ssl_protocols TLSv1.2 TLSv1.3;');
        }
        lines.push('');
        lines.push('  client_max_body_size ' + (String(values.body || '20').replace(/\D/g, '') || '20') + 'm;');
        lines.push('  gzip on;');
        lines.push('  gzip_types text/css application/javascript application/json image/svg+xml;');
        if (String(values.root || '').trim()) {
          lines.push('');
          lines.push('  root ' + String(values.root).trim() + ';');
          lines.push('  index index.html;');
          lines.push('  location / { try_files $uri $uri/ /index.html; }');
        }
        lines.push('');
        lines.push('  location / {');
        lines.push('    proxy_pass http://' + upstream + ';');
        lines.push('    proxy_http_version 1.1;');
        lines.push('    proxy_set_header Host $host;');
        lines.push('    proxy_set_header X-Real-IP $remote_addr;');
        lines.push('    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;');
        lines.push('    proxy_set_header X-Forwarded-Proto $scheme;');
        if (values.ws) {
          lines.push('    proxy_set_header Upgrade $http_upgrade;');
          lines.push('    proxy_set_header Connection "upgrade";');
        }
        lines.push('    proxy_read_timeout 60s;');
        lines.push('  }');
        lines.push('}');
        return { html: codeOut('nginx.conf', lines.join('\n')), note: domain + ' → ' + upstream };
      }
    });
  }

  /* ------------------------------ 14. 建表语句 ------------------------------ */
  var SQL_TYPES = ['INT', 'BIGINT', 'VARCHAR(255)', 'TEXT', 'BOOLEAN', 'DATE', 'DATETIME', 'DECIMAL(10,2)', 'JSON'];

  function renderCreateTable(root) {
    K.form(root, {
      uid: 'createtable',
      stack: true,
      fields: [
        { id: 'table', label: '表名', type: 'text', value: 'users' },
        { id: 'columns', label: '字段（每行：名称 类型 主键/非空/唯一/默认值）', type: 'textarea', rows: 8, wide: true,
          value: 'id BIGINT 主键 自增\nname VARCHAR(64) 非空\nemail VARCHAR(128) 非空 唯一\nstatus INT 默认 1\ncreated_at DATETIME 默认 now()' },
        { id: 'charset', label: '字符集', type: 'select', value: 'utf8mb4', options: [
          { value: 'utf8mb4', label: 'utf8mb4' },
          { value: '', label: '不指定' }
        ] },
        { id: 'comment', label: '表注释', type: 'text', placeholder: '可选' }
      ],
      actionLabel: '生成',
      hint: '支持中文修饰词：主键 / 自增 / 非空 / 唯一 / 默认 xxx。生成 MySQL 语法，方言差异（如 AUTO_INCREMENT 位置）请按实际库调整。',
      run: function (values) {
        var table = String(values.table || '').trim();
        if (!/^[A-Za-z_][\w$]*$/.test(table)) return { error: '表名只能包含字母、数字、下划线' };
        var lines = String(values.columns || '').split(/\r?\n/).filter(function (line) { return line.trim() !== ''; });
        if (!lines.length) return { error: '请至少填写一个字段' };
        var defs = [];
        var pk = '';
        lines.forEach(function (line) {
          var parts = line.trim().split(/\s+/);
          var name = parts.shift();
          if (!/^[A-Za-z_][\w$]*$/.test(name)) throw new Error('字段名「' + name + '」不合法');
          var type = parts.shift();
          if (!type) throw new Error('字段「' + name + '」缺少类型');
          var upper = type.toUpperCase();
          if (upper === 'PK' || upper === '主键') throw new Error('字段「' + name + '」缺少类型（把类型写在名称后面）');
          var modifiers = parts.join(' ');
          var def = '  `' + name + '` ' + type.toUpperCase();
          if (/自增|auto/i.test(modifiers)) def += ' AUTO_INCREMENT';
          if (/非空|not\s*null|必填/i.test(modifiers)) def += ' NOT NULL';
          if (/唯一|unique/i.test(modifiers)) def += ' UNIQUE';
          if (/默认|default/i.test(modifiers)) {
            var dm = /(?:默认|default)\s*(.+)$/i.exec(modifiers);
            if (dm) {
              var dv = dm[1].trim();
              if (/^(null|now\(\)|current_timestamp|true|false|\d+(\.\d+)?)$/i.test(dv)) def += ' DEFAULT ' + dv.toUpperCase().replace('NOW()', 'CURRENT_TIMESTAMP');
              else def += " DEFAULT '" + dv.replace(/'/g, "''") + "'";
            }
          }
          if (/主键|primary/i.test(modifiers)) pk = name;
          defs.push(def);
        });
        var head = 'CREATE TABLE `' + table + '` (';
        var tail = ') ENGINE=InnoDB' +
          (values.charset ? ' DEFAULT CHARSET=' + values.charset : '') +
          (String(values.comment || '').trim() ? " COMMENT='" + String(values.comment).replace(/'/g, "''") + "'" : '') + ';';
        var body = defs;
        if (pk) body.push('  PRIMARY KEY (`' + pk + '`)');
        var sql = head + '\n' + body.join(',\n') + '\n' + tail;
        return {
          html: codeOut('SQL', sql),
          note: defs.length - (pk ? 1 : 0) + ' 个字段' + (pk ? '，主键 ' + pk : '，未指定主键')
        };
      }
    });
  }

  /* ------------------------------ 15. 枚举代码 ------------------------------ */
  function renderEnum(root) {
    K.form(root, {
      uid: 'enumgen',
      stack: true,
      fields: [
        { id: 'name', label: '枚举名', type: 'text', value: 'OrderStatus' },
        { id: 'list', label: '成员（每行 NAME 或 NAME=VALUE）', type: 'textarea', rows: 6, wide: true, value: 'PENDING=0\nPAID=1\nSHIPPED=2\nDONE=3' },
        { id: 'lang', label: '语言', type: 'select', value: 'ts', options: [
          { value: 'ts', label: 'TypeScript' },
          { value: 'py', label: 'Python' },
          { value: 'go', label: 'Go' },
          { value: 'java', label: 'Java' },
          { value: 'cs', label: 'C#' }
        ] }
      ],
      actionLabel: '生成',
      hint: '同一份枚举一次生成多语言版本，避免前后端常量对不上。值缺省从 0 开始自增；带字符串值时 TypeScript 会生成字符串枚举。',
      run: function (values) {
        var name = String(values.name || '').trim();
        if (!/^[A-Za-z_][\w$]*$/.test(name)) return { error: '枚举名不合法' };
        var items = String(values.list || '').split(/\r?\n/).map(function (line) { return line.trim(); })
          .filter(Boolean).map(function (line, index) {
            var m = /^([A-Za-z_][\w$]*)\s*(?:=\s*(.+))?$/.exec(line);
            if (!m) throw new Error('成员「' + line + '」格式不合法');
            var raw = m[2] === undefined ? String(index) : m[2].trim();
            return { key: m[1], raw: raw, quoted: /^['"]/.test(raw) || !/^-?\d+(\.\d+)?$/.test(raw) };
          });
        if (!items.length) return { error: '请至少填写一个成员' };
        var out = '';
        if (values.lang === 'ts') {
          out = 'export enum ' + name + ' {\n' + items.map(function (item) {
            return '  ' + item.key + ' = ' + (item.quoted ? "'" + item.raw.replace(/^['"]|['"]$/g, '') + "'" : item.raw) + ',';
          }).join('\n') + '\n}';
        } else if (values.lang === 'py') {
          out = 'from enum import IntEnum\n\n\nclass ' + name + '(IntEnum):\n' + items.map(function (item) {
            return '    ' + item.key + ' = ' + (item.quoted ? '"' + item.raw.replace(/^['"]|['"]$/g, '') + '"' : item.raw);
          }).join('\n');
        } else if (values.lang === 'go') {
          out = 'type ' + name + ' int\n\nconst (\n' + items.map(function (item, index) {
            return '    ' + name + item.key.charAt(0) + item.key.slice(1).toLowerCase() + ' ' + name + ' = ' + (item.quoted ? index : item.raw);
          }).join('\n') + '\n)';
        } else if (values.lang === 'java') {
          out = 'public enum ' + name + ' {\n' + items.map(function (item) {
            return '    ' + item.key + '(' + (item.quoted ? '"' + item.raw.replace(/^['"]|['"]$/g, '') + '"' : item.raw) + ')';
          }).join(',\n') + ';\n\n    private final Object value;\n\n    ' + name + '(Object value) {\n        this.value = value;\n    }\n\n    public Object getValue() {\n        return value;\n    }\n}';
        } else {
          out = 'public enum ' + name + '\n{\n' + items.map(function (item) {
            return '    ' + item.key + ' = ' + (item.quoted ? '"' + item.raw.replace(/^['"]|['"]$/g, '') + '"' : item.raw) + ',';
          }).join('\n') + '\n}';
        }
        return { html: codeOut('代码', out), note: items.length + ' 个成员，' + values.lang };
      }
    });
  }

  /* ------------------------------ 16. 分支名 ------------------------------ */
  var BRANCH_TYPES = {
    feat: '新功能',
    fix: '缺陷修复',
    hotfix: '线上紧急修复',
    chore: '构建与杂项',
    docs: '文档',
    refactor: '重构',
    test: '测试',
    perf: '性能优化',
    style: '样式调整'
  };

  function slugify(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[\u4e00-\u9fa5]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-')
      .slice(0, 48);
  }

  function renderBranchName(root) {
    K.form(root, {
      uid: 'branchname',
      fields: [
        { id: 'mode', label: '模式', type: 'select', value: 'build', options: [
          { value: 'build', label: '由标题生成分支名' },
          { value: 'parse', label: '解析已有分支名' }
        ] },
        { id: 'type', label: '类型', type: 'select', value: 'feat', options: Object.keys(BRANCH_TYPES).map(function (key) {
          return { value: key, label: key + '（' + BRANCH_TYPES[key] + '）' };
        }) },
        { id: 'ticket', label: '工单号（可空）', type: 'text', placeholder: '如 128' },
        { id: 'title', label: '标题或已有分支名', type: 'text', value: 'Add front-matter template' }
      ],
      actionLabel: '生成',
      hint: '约定式分支名：type/issue-slug，例如 feat/128-front-matter-template。全小写、用短横线，避免中文与空格，CI 与脚本好解析。',
      sample: { mode: 'build', type: 'feat', ticket: '128', title: 'Add front-matter template' },
      run: function (values) {
        var title = String(values.title || '').trim();
        if (!title) return { error: '请填写标题或分支名' };
        if (values.mode === 'parse') {
          var m = /^([a-z]+)\/(?:(\d+)-)?(.+)$/.exec(title);
          if (!m) return { error: '分支名不像 type/slug 格式，无法解析' };
          return {
            rows: [
              { key: '类型', value: m[1] + (BRANCH_TYPES[m[1]] ? '（' + BRANCH_TYPES[m[1]] + '）' : '（未知类型）'), mono: false },
              { key: '工单号', value: m[2] || '无', mono: false },
              { key: '描述', value: m[3], mono: false }
            ]
          };
        }
        var slug = slugify(title);
        if (!slug) return { error: '标题里没有可用的英文字母或数字，请手动补一个英文描述' };
        var ticket = String(values.ticket || '').replace(/\D/g, '');
        var branch = values.type + '/' + (ticket ? ticket + '-' : '') + slug;
        return {
          rows: [
            { key: '分支名', value: branch },
            { key: '对应提交', value: values.type + (ticket ? '(' + ticket + ')' : '') + ': ' + title, mono: false },
            { key: '长度', value: branch.length + ' 字符（建议 ≤ 60）', mono: false }
          ],
          note: '已生成分支名'
        };
      }
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['ts-to-json'] = renderTsToJson;
  window.ToolModules['json-schema-gen'] = renderJsonSchema;
  window.ToolModules['css-animation-gen'] = renderCssAnimation;
  window.ToolModules['css-clamp-gen'] = renderClamp;
  window.ToolModules['svg-optimize'] = renderSvgOptimize;
  window.ToolModules['regex-explain'] = renderRegexExplain;
  window.ToolModules['html-to-jsx'] = renderHtmlToJsx;
  window.ToolModules['semver-range'] = renderSemverRange;
  window.ToolModules['package-json-gen'] = renderPackageJson;
  window.ToolModules['tsconfig-gen'] = renderTsconfig;
  window.ToolModules['dockerfile-gen'] = renderDockerfile;
  window.ToolModules['github-action-gen'] = renderGithubAction;
  window.ToolModules['nginx-config-gen'] = renderNginx;
  window.ToolModules['sql-create-table'] = renderCreateTable;
  window.ToolModules['enum-gen'] = renderEnum;
  window.ToolModules['branch-name'] = renderBranchName;
})();
