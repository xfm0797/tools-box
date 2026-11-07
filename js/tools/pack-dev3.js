/* =============================================================================
 * 开发辅助工具包 · 第三批（19 个）
 * -----------------------------------------------------------------------------
 * json-merge      JSON 合并
 * json-sort-keys  JSON 键排序
 * dotenv-parse    dotenv / INI 转 JSON
 * curl-builder    curl 命令生成
 * robots-gen      robots.txt 生成
 * meta-gen        SEO Meta 标签生成
 * lorem-gen       假文生成
 * color-mix       颜色混合
 * color-blind     色盲模拟
 * clip-path-gen   clip-path 生成
 * flex-gen        Flex 布局生成器
 * objectid-gen    MongoDB ObjectId
 * shell-escape    Shell 转义
 * debounce-demo   防抖节流演示
 * media-query-gen 响应式断点生成
 * log-parser      访问日志解析
 * commit-gen      Conventional Commits 生成
 * html-skeleton   HTML 模板生成
 * sql-insert      SQL INSERT 生成
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  function parseJson(text) {
    return JSON.parse(text);
  }
  function formatJson(value) {
    return JSON.stringify(value, null, 2);
  }

  /* ------------------------------ 1. JSON 合并 ------------------------------ */
  function deepMerge(a, b, arrayMode) {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (arrayMode === 'concat') return a.concat(b);
      if (arrayMode === 'union') return a.concat(b.filter(function (x) { return a.indexOf(x) < 0; }));
      return b; // replace
    }
    if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
      var out = Object.assign({}, a);
      Object.keys(b).forEach(function (key) {
        out[key] = key in a ? deepMerge(a[key], b[key], arrayMode) : b[key];
      });
      return out;
    }
    return b === undefined ? a : b;
  }

  function renderJsonMerge(root) {
    K.form(root, {
      uid: 'jsonmerge',
      actionLabel: '合并',
      fields: [
        { id: 'a', label: 'JSON A（作为基底）', type: 'textarea', rows: 6, wide: true, mono: true, value: '{"server":{"port":3000,"host":"localhost"},"tags":["api"]}' },
        { id: 'b', label: 'JSON B（覆盖 A）', type: 'textarea', rows: 6, wide: true, mono: true, value: '{"server":{"port":8080,"debug":true},"tags":["v2"]}' },
        { id: 'arrayMode', label: '数组处理', type: 'select', value: 'replace',
          options: [{ value: 'replace', label: '用 B 覆盖' }, { value: 'concat', label: '拼接 A + B' }, { value: 'union', label: '合并去重' }] }
      ],
      hint: '同名键按「B 覆盖 A」递归合并；数组可选拼接或去重合并。',
      run: function (v) {
        var a;
        var b;
        try { a = parseJson(v.a); } catch (e) { return { error: 'JSON A 解析失败：' + e.message }; }
        try { b = parseJson(v.b); } catch (e) { return { error: 'JSON B 解析失败：' + e.message }; }
        var merged = deepMerge(a, b, v.arrayMode);
        var out = formatJson(merged);
        return { output: out, html: '<pre class="code-block">' + K.esc(out) + '</pre>', note: '合并完成' };
      }
    });
  }

  /* ------------------------------ 2. JSON 键排序 ------------------------------ */
  function sortKeysDeep(value, desc, arrayKeep) {
    if (Array.isArray(value)) {
      return arrayKeep ? value.map(function (item) { return sortKeysDeep(item, desc, arrayKeep); }) : value;
    }
    if (value && typeof value === 'object') {
      var keys = Object.keys(value).sort(function (a, b) {
        return desc ? b.localeCompare(a) : a.localeCompare(b);
      });
      var out = {};
      keys.forEach(function (k) { out[k] = sortKeysDeep(value[k], desc, arrayKeep); });
      return out;
    }
    return value;
  }

  function renderJsonSortKeys(root) {
    K.text(root, {
      uid: 'jsonsort',
      inputLabel: '输入 JSON',
      inputRows: 9,
      options: [
        { id: 'order', label: '排序方向', type: 'select', value: 'asc',
          options: [{ value: 'asc', label: '升序 a → z' }, { value: 'desc', label: '降序 z → a' }] },
        { id: 'arrayKeep', label: '递归排序数组内对象', type: 'checkbox', value: true }
      ],
      hint: '对键名做字典序排序，方便 diff 与 review；数组顺序保持不变（勾选后仅排序数组内的对象键）。',
      sample: '{"b":1,"a":{"d":2,"c":[3,{"z":9,"y":8}]},"aa":true}',
      run: function (text, v) {
        var data;
        try { data = parseJson(text); } catch (e) { return { error: 'JSON 解析失败：' + e.message }; }
        var sorted = sortKeysDeep(data, v.order === 'desc', v.arrayKeep);
        return { output: formatJson(sorted), note: '已按键名' + (v.order === 'desc' ? '降序' : '升序') + '排序' };
      }
    });
  }

  /* ------------------------------ 3. dotenv / INI 转 JSON ------------------------------ */
  function renderDotenvParse(root) {
    K.text(root, {
      uid: 'dotenv',
      inputLabel: '输入 .env / INI 内容',
      inputRows: 9,
      options: [
        { id: 'typed', label: '自动转换布尔与数字', type: 'checkbox', value: true },
        { id: 'nested', label: '下划线转嵌套（DB_HOST → db.host）', type: 'checkbox' }
      ],
      hint: '支持 # 注释、export 前缀与带引号的值；空值转空字符串。',
      sample: '# 数据库配置\nDB_HOST=localhost\nDB_PORT=5432\nDEBUG=true\nAPP_NAME="我的应用"\nexport API_KEY=abc123\nEMPTY=',
      run: function (text, v) {
        var flat = {};
        text.replace(/\r/g, '').split('\n').forEach(function (line, idx) {
          var trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) return;
          trimmed = trimmed.replace(/^export\s+/, '');
          var eq = trimmed.indexOf('=');
          if (eq <= 0) {
            if (/^\[[^\]]+\]$/.test(trimmed)) return; // INI section：忽略节名
            throw new Error('第 ' + (idx + 1) + ' 行缺少 =，或只有节名外的无效内容');
          }
          var key = trimmed.slice(0, eq).trim();
          var value = trimmed.slice(eq + 1).trim();
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          } else if (v.typed) {
            if (value === 'true') value = true;
            else if (value === 'false') value = false;
            else if (value !== '' && !isNaN(Number(value))) value = Number(value);
          }
          flat[key] = value;
        });
        if (!Object.keys(flat).length) return { error: '没有解析到任何键值对' };
        if (v.nested) {
          var nested = {};
          Object.keys(flat).forEach(function (key) {
            var parts = key.toLowerCase().split('_');
            var node = nested;
            parts.forEach(function (p, i) {
              if (i === parts.length - 1) node[p] = flat[key];
              else { node[p] = node[p] || {}; node = node[p]; }
            });
          });
          return { output: formatJson(nested), note: '已解析 ' + Object.keys(flat).length + ' 个键并转为嵌套结构' };
        }
        return { output: formatJson(flat), note: '已解析 ' + Object.keys(flat).length + ' 个键值对' };
      }
    });
  }

  /* ------------------------------ 4. curl 命令生成 ------------------------------ */
  function shellQuote(text) {
    return "'" + String(text).replace(/'/g, "'\\''") + "'";
  }

  function renderCurlBuilder(root) {
    K.form(root, {
      uid: 'curlbuilder',
      actionLabel: '生成命令',
      fields: [
        { id: 'method', label: '方法', type: 'select', value: 'GET',
          options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].map(function (m) { return { value: m, label: m }; }) },
        { id: 'url', label: 'URL', type: 'text', value: 'https://api.example.com/v1/users', wide: true },
        { id: 'headers', label: '请求头（每行 Key: Value）', type: 'textarea', rows: 3, wide: true, mono: true, value: 'Authorization: Bearer token123\nContent-Type: application/json' },
        { id: 'body', label: '请求体（GET 时忽略）', type: 'textarea', rows: 4, wide: true, mono: true, value: '{"name":"张三","role":"admin"}' },
        { id: 'style', label: '输出风格', type: 'select', value: 'multi',
          options: [{ value: 'multi', label: '多行（\\ 续行，可读性好）' }, { value: 'single', label: '单行（直接粘贴）' }] }
      ],
      hint: '生成 curl / bash 命令，参数全部单引号包裹避免注入；也可复制到 Postman 导入。',
      run: function (v) {
        if (!v.url.trim()) return { error: '请填写 URL' };
        var lines = ['curl -X ' + v.method + ' ' + shellQuote(v.url.trim())];
        v.headers.split('\n').forEach(function (line) {
          if (line.trim()) lines.push('  -H ' + shellQuote(line.trim()));
        });
        if (v.method !== 'GET' && v.body.trim()) {
          lines.push('  -d ' + shellQuote(v.body.trim()));
        }
        var cmd = v.style === 'single' ? lines.join(' ') : lines.join(' \\\n');
        return {
          html: '<pre class="code-block">' + K.esc(cmd) + '</pre>' +
            '<div class="btn-row"><button type="button" class="btn ghost" data-copy="' + K.esc(cmd) + '">复制命令</button></div>',
          note: 'Windows CMD 用户请把 \ 换成 ^，或改用单行模式'
        };
      }
    });
  }

  /* ------------------------------ 5. robots.txt 生成 ------------------------------ */
  function renderRobotsGen(root) {
    K.form(root, {
      uid: 'robotsgen',
      actionLabel: '生成',
      fields: [
        { id: 'mode', label: '策略', type: 'select', value: 'allow',
          options: [{ value: 'allow', label: '允许全部' }, { value: 'disallow', label: '禁止全部' }, { value: 'custom', label: '自定义规则' }] },
        { id: 'disallow', label: '禁止路径（每行一个，自定义模式用）', type: 'textarea', rows: 4, wide: true, mono: true, value: '/admin/\n/private/\n/*.json' },
        { id: 'sitemap', label: 'Sitemap 地址（可选）', type: 'text', placeholder: 'https://example.com/sitemap.xml' },
        { id: 'crawlDelay', label: 'Crawl-delay（秒，0 不写）', type: 'number', value: 0, min: 0, max: 30 }
      ],
      hint: 'robots.txt 放在网站根目录；Disallow 是「建议」而非强制，敏感目录请配合鉴权。',
      run: function (v) {
        var lines = ['User-agent: *'];
        if (v.mode === 'allow') {
          lines.push('Allow: /');
        } else if (v.mode === 'disallow') {
          lines.push('Disallow: /');
        } else {
          var paths = v.disallow.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
          if (!paths.length) return { error: '自定义模式至少要填一条禁止路径' };
          paths.forEach(function (p) { lines.push('Disallow: ' + p); });
        }
        var delay = Number(v.crawlDelay) || 0;
        if (delay > 0) lines.push('Crawl-delay: ' + delay);
        var out = lines.join('\n');
        if (v.sitemap.trim()) out += '\n\nSitemap: ' + v.sitemap.trim();
        return {
          output: out,
          html: '<pre class="code-block">' + K.esc(out) + '</pre>',
          note: '常用 UA：Googlebot（谷歌）、Baiduspider（百度）、bingbot（必应）'
        };
      }
    });
  }

  /* ------------------------------ 6. SEO Meta 标签生成 ------------------------------ */
  function renderMetaGen(root) {
    K.form(root, {
      uid: 'metagen',
      actionLabel: '生成',
      fields: [
        { id: 'title', label: '页面标题', type: 'text', value: '我的产品 - 让协作更简单', wide: true },
        { id: 'desc', label: '页面描述（150 字内）', type: 'textarea', rows: 2, wide: true, value: '一款帮助小团队高效协作的在线工具，任务、文档与日程一站式管理。' },
        { id: 'keywords', label: '关键词（逗号分隔）', type: 'text', value: '协作, 项目管理, 团队工具' },
        { id: 'url', label: '页面地址', type: 'text', value: 'https://example.com/product' },
        { id: 'image', label: '分享配图（og:image）', type: 'text', value: 'https://example.com/cover.png' },
        { id: 'siteName', label: '站点名', type: 'text', value: 'Example' },
        { id: 'twitter', label: '生成 Twitter Card', type: 'checkbox', value: true }
      ],
      hint: 'OG 标签决定微信 / 推特 / Slack 分享卡片的外观；图片建议 1200×630。',
      run: function (v) {
        if (!v.title.trim()) return { error: '请填写页面标题' };
        var tags = [];
        tags.push('<title>' + K.esc(v.title) + '</title>');
        tags.push('<meta name="description" content="' + K.esc(v.desc) + '">');
        if (v.keywords.trim()) tags.push('<meta name="keywords" content="' + K.esc(v.keywords) + '">');
        tags.push('<link rel="canonical" href="' + K.esc(v.url) + '">');
        tags.push('<meta property="og:type" content="website">');
        tags.push('<meta property="og:title" content="' + K.esc(v.title) + '">');
        tags.push('<meta property="og:description" content="' + K.esc(v.desc) + '">');
        if (v.url.trim()) tags.push('<meta property="og:url" content="' + K.esc(v.url) + '">');
        if (v.image.trim()) tags.push('<meta property="og:image" content="' + K.esc(v.image) + '">');
        if (v.siteName.trim()) tags.push('<meta property="og:site_name" content="' + K.esc(v.siteName) + '">');
        if (v.twitter) {
          tags.push('<meta name="twitter:card" content="summary_large_image">');
          tags.push('<meta name="twitter:title" content="' + K.esc(v.title) + '">');
          tags.push('<meta name="twitter:description" content="' + K.esc(v.desc) + '">');
        }
        var out = tags.join('\n');
        return {
          output: out,
          html: '<pre class="code-block">' + K.esc(out) + '</pre>',
          note: '标题建议 ≤ 30 字，描述 ≤ 150 字（SERP 展示限制）'
        };
      }
    });
  }

  /* ------------------------------ 7. 假文生成 ------------------------------ */
  var LOREM_SENTENCES = ('Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur Excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum').split(' ');
  var CN_WORDS = ['数据驱动', '用户体验', '闭环', '赋能', '沉淀', '打磨', '迭代', '链路', '抓手', '场景', '协同', '增长', '心智', '壁垒', '矩阵', '颗粒度', '感知', '复用', '解耦', '弹性'];

  function renderLoremGen(root) {
    K.form(root, {
      uid: 'loremgen',
      actionLabel: '生成',
      fields: [
        { id: 'count', label: '段落数', type: 'number', value: 3, min: 1, max: 30 },
        { id: 'lang', label: '语种', type: 'select', value: 'latin',
          options: [{ value: 'latin', label: '拉丁假文（Lorem ipsum）' }, { value: 'cn', label: '中文乱数假文' }] },
        { id: 'sentences', label: '每段句子数', type: 'number', value: 4, min: 1, max: 12 },
        { id: 'html', label: '输出为 <p> 标签', type: 'checkbox' }
      ],
      hint: '排版与联调用占位文本，不承载真实内容。',
      run: function (v) {
        var count = Math.max(1, Math.min(30, Number(v.count) || 1));
        var per = Math.max(1, Math.min(12, Number(v.sentences) || 4));
        var paras = [];
        for (var p = 0; p < count; p += 1) {
          var sents = [];
          for (var s = 0; s < per; s += 1) {
            var len = 6 + K.randomInt(12);
            var words = [];
            for (var w = 0; w < len; w += 1) {
              words.push(v.lang === 'cn' ? K.pick(CN_WORDS) : K.pick(LOREM_SENTENCES).toLowerCase());
            }
            sents.push(words.join(v.lang === 'cn' ? '' : ' '));
          }
          var text = sents.map(function (s2) {
            return v.lang === 'cn' ? s2 + '。' : s2.charAt(0).toUpperCase() + s2.slice(1) + '.';
          }).join(v.lang === 'cn' ? '' : ' ');
          paras.push(v.html ? '<p>' + text + '</p>' : text);
        }
        var out = paras.join(v.html ? '\n' : '\n\n');
        return {
          output: out,
          html: '<pre class="code-block">' + K.esc(out) + '</pre>',
          note: '已生成 ' + count + ' 段 × ' + per + ' 句'
        };
      }
    });
  }

  /* ------------------------------ 8. 颜色混合 ------------------------------ */
  function hexToRgb(hex) {
    var m = hex.replace('#', '');
    if (m.length === 3) m = m.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(m, 16);
    if (isNaN(n) || m.length !== 6) return null;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(rgb) {
    return '#' + rgb.map(function (v) { return Math.round(v).toString(16).padStart(2, '0'); }).join('');
  }

  function renderColorMix(root) {
    K.form(root, {
      uid: 'colormix',
      actionLabel: '混合',
      fields: [
        { id: 'c1', label: '颜色 A', type: 'text', value: '#6366f1' },
        { id: 'c2', label: '颜色 B', type: 'text', value: '#f59e0b' },
        { id: 'ratio', label: 'A 占比（%）', type: 'number', value: 50, min: 0, max: 100 },
        { id: 'alphaOn', label: '附加：A 以此透明度叠在白底上', type: 'number', value: 50, min: 0, max: 100 }
      ],
      hint: '线性 RGB 插值；「透明度叠加」模拟半透明色印在白色背景后的实际观感。',
      run: function (v) {
        var a = hexToRgb(v.c1);
        var b = hexToRgb(v.c2);
        if (!a) return { error: '颜色 A 不是合法 HEX，如 #6366f1' };
        if (!b) return { error: '颜色 B 不是合法 HEX' };
        var t = Math.max(0, Math.min(100, Number(v.ratio) || 50)) / 100;
        var mixed = a.map(function (c, i) { return c * t + b[i] * (1 - t); });
        var alpha = Math.max(0, Math.min(100, Number(v.alphaOn) || 50)) / 100;
        var onWhite = a.map(function (c) { return c * alpha + 255 * (1 - alpha); });
        return {
          html: '<div class="mix-preview">' +
            '<div class="mix-swatch"><span style="background:' + rgbToHex(a) + '"></span><em>A</em></div>' +
            '<div class="mix-swatch"><span style="background:' + rgbToHex(mixed) + '"></span><em>混合</em></div>' +
            '<div class="mix-swatch"><span style="background:' + rgbToHex(b) + '"></span><em>B</em></div>' +
            '<div class="mix-swatch"><span style="background:' + rgbToHex(onWhite) + '"></span><em>A@' + v.alphaOn + '%</em></div>' +
            '</div>',
          rows: [
            { key: '混合结果 HEX', value: rgbToHex(mixed) },
            { key: 'RGB', value: 'rgb(' + mixed.map(function (c) { return Math.round(c); }).join(', ') + ')' },
            { key: '透明叠加白底', value: rgbToHex(onWhite) },
            { key: 'CSS 写法', value: 'color-mix(in srgb, ' + v.c1 + ' ' + v.ratio + '%, ' + v.c2 + ')' }
          ],
          note: '线性插值与 CSS color-mix(in srgb) 结果一致'
        };
      }
    });
  }

  /* ------------------------------ 9. 色盲模拟 ------------------------------ */
  var CVD_MATRIX = {
    protanopia: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
    deuteranopia: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.011820, 0.042940, 0.968881],
    tritanopia: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.303900],
    achromatopsia: [0.2126, 0.7152, 0.0722, 0.2126, 0.7152, 0.0722, 0.2126, 0.7152, 0.0722]
  };

  function simulate(rgb, matrix) {
    var m = matrix;
    return [
      Math.max(0, Math.min(255, rgb[0] * m[0] + rgb[1] * m[1] + rgb[2] * m[2])),
      Math.max(0, Math.min(255, rgb[0] * m[3] + rgb[1] * m[4] + rgb[2] * m[5])),
      Math.max(0, Math.min(255, rgb[0] * m[6] + rgb[1] * m[7] + rgb[2] * m[8]))
    ];
  }

  function renderColorBlind(root) {
    K.form(root, {
      uid: 'colorblind',
      actionLabel: '模拟',
      fields: [
        { id: 'color', label: '颜色（HEX）', type: 'text', value: '#e11d48' },
        { id: 'extra', label: '对照色 2（可选）', type: 'text', value: '#22c55e' },
        { id: 'extra2', label: '对照色 3（可选）', type: 'text', value: '#f59e0b' }
      ],
      hint: '用 Brettel / Viénot 类线性变换近似三类红绿色盲与全色盲的观感，检查图表配色是否可区分。',
      run: function (v) {
        var base = hexToRgb(v.color);
        if (!base) return { error: '颜色不是合法 HEX' };
        var extras = [v.extra, v.extra2].filter(function (c) { return c && c.trim(); }).map(hexToRgb).filter(Boolean);
        var all = [base].concat(extras);
        var names = [['正常', null], ['红色盲 protanopia', 'protanopia'], ['绿色盲 deuteranopia', 'deuteranopia'], ['蓝黄色盲 tritanopia', 'tritanopia'], ['全色盲 achromatopsia', 'achromatopsia']];
        var rowsHtml = names.map(function (entry) {
          var cells = all.map(function (rgb) {
            var out = entry[1] ? simulate(rgb, CVD_MATRIX[entry[1]]) : rgb;
            return '<span class="shade-swatch" style="background:' + rgbToHex(out) + '"></span>';
          }).join('');
          return '<div class="cvd-row"><span class="cvd-name">' + K.esc(entry[0]) + '</span><span class="cvd-swatches">' + cells + '</span></div>';
        }).join('');
        var outputs = names.slice(1).map(function (entry) {
          return entry[0].split(' ')[0] + '：' + rgbToHex(simulate(base, CVD_MATRIX[entry[1]]));
        });
        return {
          output: outputs.join('\n'),
          html: '<div class="cvd-panel">' + rowsHtml + '</div>',
          note: '每行从左到右依次是你填入的颜色；两色在某行变得难分就该换配色'
        };
      }
    });
  }

  /* ------------------------------ 10. clip-path 生成 ------------------------------ */
  function renderClipPathGen(root) {
    K.form(root, {
      uid: 'clippath',
      actionLabel: '生成',
      fields: [
        { id: 'shape', label: '形状', type: 'select', value: 'circle',
          options: [{ value: 'circle', label: 'circle 圆形' }, { value: 'ellipse', label: 'ellipse 椭圆' }, { value: 'inset', label: 'inset 内缩（四边独立）' }, { value: 'polygon-tri', label: 'polygon 三角形' }, { value: 'polygon-arrow', label: 'polygon 箭头' }, { value: 'polygon-star', label: 'polygon 五角星' }, { value: 'polygon-speech', label: 'polygon 气泡' }] },
        { id: 'value', label: '参数（circle/ellipse/inset）', type: 'text', value: '40%' },
        { id: 'insetT', label: 'inset：上（%）', type: 'number', value: 10 },
        { id: 'insetR', label: '右（%）', type: 'number', value: 10 },
        { id: 'insetB', label: '下（%）', type: 'number', value: 10 },
        { id: 'insetL', label: '左（%）', type: 'number', value: 10 }
      ],
      hint: '选中 inset 时用四个百分比参数；polygon 形状直接给出顶点坐标。',
      run: function (v) {
        var css;
        if (v.shape === 'circle') css = 'circle(' + (v.value || '40%') + ')';
        else if (v.shape === 'ellipse') css = 'ellipse(' + (v.value || '40% 60%') + ')';
        else if (v.shape === 'inset') css = 'inset(' + Number(v.insetT) + '% ' + Number(v.insetR) + '% ' + Number(v.insetB) + '% ' + Number(v.insetL) + '%)';
        else if (v.shape === 'polygon-tri') css = 'polygon(50% 0%, 100% 100%, 0% 100%)';
        else if (v.shape === 'polygon-arrow') css = 'polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)';
        else if (v.shape === 'polygon-star') css = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
        else css = 'polygon(0% 0%, 100% 0%, 100% 70%, 40% 70%, 20% 100%, 22% 70%, 0% 70%)';
        return {
          output: 'clip-path: ' + css + ';',
          html: '<pre class="code-block">.shape {\n  clip-path: ' + css + ';\n}</pre>' +
            '<div class="clip-demo" style="clip-path:' + css + '"></div>',
          note: '上方色块即实际裁剪效果'
        };
      }
    });
  }

  /* ------------------------------ 11. Flex 布局生成器 ------------------------------ */
  function renderFlexGen(root) {
    K.form(root, {
      uid: 'flexgen',
      actionLabel: '生成',
      fields: [
        { id: 'direction', label: '方向', type: 'select', value: 'row',
          options: [{ value: 'row', label: 'row 横向' }, { value: 'column', label: 'column 纵向' }] },
        { id: 'justify', label: 'justify-content', type: 'select', value: 'space-between',
          options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'].map(function (o) { return { value: o, label: o }; }) },
        { id: 'align', label: 'align-items', type: 'select', value: 'center',
          options: ['stretch', 'flex-start', 'center', 'flex-end', 'baseline'].map(function (o) { return { value: o, label: o }; }) },
        { id: 'wrap', label: '换行', type: 'select', value: 'nowrap',
          options: [{ value: 'nowrap', label: 'nowrap 不换行' }, { value: 'wrap', label: 'wrap 换行' }] },
        { id: 'gap', label: '间距（px）', type: 'number', value: 12, min: 0, max: 60 },
        { id: 'items', label: '子项数量', type: 'number', value: 5, min: 1, max: 8 }
      ],
      hint: '实时预览下方就是实际渲染效果，代码可直接复制。',
      run: function (v) {
        var css = 'display: flex;\nflex-direction: ' + v.direction + ';\njustify-content: ' + v.justify +
          ';\nalign-items: ' + v.align + ';\nflex-wrap: ' + v.wrap + ';\ngap: ' + (Number(v.gap) || 0) + 'px;';
        var count = Math.max(1, Math.min(8, Number(v.items) || 5));
        var boxes = '';
        for (var i = 0; i < count; i += 1) boxes += '<span class="flex-demo-item">' + (i + 1) + '</span>';
        return {
          output: css,
          html: '<pre class="code-block">' + K.esc(css) + '</pre>' +
            '<div class="flex-demo" style="display:flex;flex-direction:' + v.direction + ';justify-content:' + v.justify +
            ';align-items:' + v.align + ';flex-wrap:' + v.wrap + ';gap:' + (Number(v.gap) || 0) + 'px">' + boxes + '</div>',
          note: '子项高度不同时 align-items 的效果更明显'
        };
      }
    });
  }

  /* ------------------------------ 12. MongoDB ObjectId ------------------------------ */
  function renderObjectIdGen(root) {
    K.form(root, {
      uid: 'objectid',
      actionLabel: '生成',
      fields: [
        { id: 'count', label: '生成数量', type: 'number', value: 5, min: 1, max: 100 },
        { id: 'decode', label: '解析已有 ObjectId（可选）', type: 'text', placeholder: '如 665f1c2e8a9b3c0012d4e5f6' }
      ],
      hint: 'ObjectId = 4 字节秒级时间戳 + 5 字节随机 + 3 字节递增计数器。前 8 位十六进制即创建时间。',
      run: function (v) {
        var rows = [];
        if (v.decode.trim()) {
          var id = v.decode.trim();
          if (!/^[0-9a-fA-F]{24}$/.test(id)) return { error: 'ObjectId 应为 24 位十六进制' };
          var ts = parseInt(id.slice(0, 8), 16);
          var date = new Date(ts * 1000);
          rows.push({ key: '解析 ' + id, value: fmtLocal(date) + '（时间戳 ' + ts + '）' });
        }
        var count = Math.max(1, Math.min(100, Number(v.count) || 1));
        var list = [];
        for (var i = 0; i < count; i += 1) {
          var now = Math.floor(Date.now() / 1000);
          var hex = now.toString(16).padStart(8, '0');
          for (var b = 0; b < 8; b += 1) hex += K.randomInt(256).toString(16).padStart(2, '0');
          var counter = K.randomInt(16777216).toString(16).padStart(6, '0');
          list.push(hex + counter);
        }
        return {
          output: list.join('\n'),
          html: '<pre class="code-block">' + K.esc(list.join('\n')) + '</pre>',
          rows: rows,
          note: '已生成 ' + count + ' 个 ObjectId'
        };
      }
    });
  }

  function fmtLocal(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0') +
      ' ' + String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0') + ':' + String(date.getSeconds()).padStart(2, '0');
  }

  /* ------------------------------ 13. Shell 转义 ------------------------------ */
  function renderShellEscape(root) {
    K.text(root, {
      uid: 'shellescape',
      inputLabel: '输入参数（每行一个）',
      inputRows: 6,
      options: [
        { id: 'style', label: '目标 Shell', type: 'select', value: 'posix',
          options: [{ value: 'posix', label: 'POSIX / bash（单引号）' }, { value: 'cmd', label: 'Windows CMD（双引号）' }, { value: 'ps', label: 'PowerShell（单引号）' }] },
        { id: 'join', label: '拼接目标命令（可选）', type: 'text', value: 'grep', placeholder: '如 grep、docker、kubectl' }
      ],
      hint: 'POSIX 单引号内除单引号外全部字面；含单引号时用 \'\\\'\' 技巧拼接。',
      sample: "it's a \"test\" file\n路径 C:\\Users\\name\n$HOME && rm -rf /",
      run: function (text, v) {
        var args = text.replace(/\r/g, '').split('\n').filter(function (l) { return l.trim().length; });
        if (!args.length) return { error: '请输入至少一个参数' };
        var quoted;
        if (v.style === 'cmd') {
          quoted = args.map(function (a) { return '"' + a.replace(/"/g, '""') + '"'; });
        } else if (v.style === 'ps') {
          quoted = args.map(function (a) { return "'" + a.replace(/'/g, "''") + "'"; });
        } else {
          quoted = args.map(shellQuote);
        }
        var cmd = v.join.trim() ? v.join.trim() + ' ' + quoted.join(' ') : quoted.join(' ');
        return { output: cmd, note: '共转义 ' + args.length + ' 个参数（' + v.style.toUpperCase() + ' 风格）' };
      }
    });
  }

  /* ------------------------------ 14. 防抖节流演示 ------------------------------ */
  function renderDebounceDemo(root) {
    root.innerHTML =
      '<div class="form-row">' +
        '<div class="form-item"><label class="label" for="dd-wait">间隔（ms）</label><input class="input mono" type="number" id="dd-wait" value="500" min="50" max="5000" step="50"></div>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="dd-trigger">疯狂点击我（触发事件）</button>' +
        '<button type="button" class="btn ghost" id="dd-clear">清空日志</button>' +
      '</div>' +
      '<div class="kv-list" id="dd-log" style="margin-top:14px"></div>' +
      '<p class="hint">防抖：停止点击 500ms 后才执行 1 次（只保留最后一次）；节流：每 500ms 最多执行 1 次（保证频率）。</p>';

    var log = root.querySelector('#dd-log');
    var waitInput = root.querySelector('#dd-wait');
    var rawCount = 0;
    var debounceCount = 0;
    var throttleCount = 0;
    var debounceTimer = null;
    var lastThrottle = 0;

    function addLog(text) {
      var row = document.createElement('div');
      row.className = 'kv';
      row.innerHTML = '<span class="kv-key">' + K.esc(new Date().toLocaleTimeString('zh-CN')) + '</span><span class="kv-val mono">' + K.esc(text) + '</span>';
      log.prepend(row);
      while (log.children.length > 14) log.removeChild(log.lastChild);
    }
    function updateRaw() {
      addLog('原始事件 #' + (++rawCount) + ' | 防抖已执行 ' + debounceCount + ' 次 | 节流已执行 ' + throttleCount + ' 次');
    }
    root.querySelector('#dd-trigger').addEventListener('click', function () {
      updateRaw();
      var wait = Math.max(50, Math.min(5000, Number(waitInput.value) || 500));
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        debounceCount += 1;
        addLog('⚡️ 防抖函数执行 #' + debounceCount + '（停止点击 ' + wait + 'ms 后）');
      }, wait);
      var now = Date.now();
      if (now - lastThrottle >= wait) {
        lastThrottle = now;
        throttleCount += 1;
        addLog('⚡️ 节流函数执行 #' + throttleCount + '（间隔 ' + wait + 'ms 内第一次）');
      }
    });
    root.querySelector('#dd-clear').addEventListener('click', function () {
      log.innerHTML = '';
      rawCount = debounceCount = throttleCount = 0;
      addLog('日志已清空，计数归零');
    });
  }

  /* ------------------------------ 15. 响应式断点生成 ------------------------------ */
  function renderMediaQueryGen(root) {
    K.form(root, {
      uid: 'mediaquery',
      actionLabel: '生成',
      fields: [
        { id: 'base', label: '基准字号（px）', type: 'number', value: 16, min: 10, max: 24 },
        { id: 'strategy', label: '策略', type: 'select', value: 'mobile',
          options: [{ value: 'mobile', label: '移动优先（min-width）' }, { value: 'desktop', label: '桌面优先（max-width）' }] },
        { id: 'breakpoints', label: '断点（px，逗号分隔）', type: 'text', value: '640, 768, 1024, 1280' }
      ],
      hint: '移动优先的代码更利于小屏性能；断点建议按内容断，而非死磕设备型号。',
      run: function (v) {
        var points = v.breakpoints.split(/[,，\s]+/).map(Number).filter(function (n) { return n >= 200 && n <= 4000; }).sort(function (a, b) { return a - b; });
        if (!points.length) return { error: '请填写至少一个断点，如 768' };
        var base = Number(v.base) || 16;
        var isMobile = v.strategy === 'mobile';
        var sorted = isMobile ? points : points.slice().reverse();
        var css = ':root { font-size: ' + base + 'px; }\n';
        sorted.forEach(function (p, i) {
          // 断点处字号阶梯增长
          var size = base + (i + 1) * 0.5;
          css += '\n@media ' + (isMobile ? 'min-width' : 'max-width') + ': ' + p + 'px {\n  :root { font-size: ' + size + 'px; }\n  /* ' + (p >= 1024 ? '桌面布局' : p >= 768 ? '平板布局' : '大屏手机布局') + ' */\n}\n';
        });
        var tailwindRows = points.map(function (p) {
          return ['sm: 640', 'md: 768', 'lg: 1024', 'xl: 1280', '2xl: 1536'].find(function (t) { return parseInt(t.split(': ')[1]) === p; }) || (p + 'px');
        });
        return {
          output: css,
          html: '<pre class="code-block">' + K.esc(css) + '</pre>' +
            K.table(['断点', 'Tailwind 对应'], tailwindRows.map(function (t) { return [p2(points[tailwindRows.indexOf(t)]), t]; })),
          note: '字号随断点阶梯增长，正文排版更均衡'
        };
        function p2(n) { return n + 'px'; }
      }
    });
  }

  /* ------------------------------ 16. 访问日志解析 ------------------------------ */
  function renderLogParser(root) {
    K.text(root, {
      uid: 'logparser',
      inputLabel: '粘贴访问日志（nginx combined 格式）',
      inputRows: 9,
      hideOutput: true,
      sample: '203.0.113.5 - - [06/Nov/2026:10:15:32 +0800] "GET /api/users HTTP/1.1" 200 1234 "-" "Mozilla/5.0 Chrome/120"\n198.51.100.7 - admin [06/Nov/2026:10:16:01 +0800] "POST /api/login HTTP/1.1" 401 96 "-" "curl/8.0"\n203.0.113.5 - - [06/Nov/2026:10:16:30 +0800] "GET /api/orders HTTP/1.1" 500 512 "-" "Mozilla/5.0 Chrome/120"\n192.0.2.9 - - [06/Nov/2026:10:17:10 +0800] "GET /index.html HTTP/1.1" 304 0 "-" "Mozilla/5.0 Safari/605"',
      run: function (text) {
        var re = /^(\S+) \S+ (\S+) \[([^\]]+)\] "(\S+) (\S+)[^"]*" (\d{3}) (\S+)(?: "([^"]*)" "([^"]*)")?/;
        var rows = [];
        var ips = {};
        var statuses = {};
        var bytes = 0;
        text.replace(/\r/g, '').split('\n').forEach(function (line) {
          if (!line.trim()) return;
          var m = line.match(re);
          if (!m) return;
          rows.push({ ip: m[1], user: m[2], time: m[3], method: m[4], path: m[5], status: m[6], size: m[7] });
          ips[m[1]] = (ips[m[1]] || 0) + 1;
          statuses[m[6]] = (statuses[m[6]] || 0) + 1;
          bytes += m[7] === '-' ? 0 : Number(m[7]);
        });
        if (!rows.length) return { error: '没有解析出任何日志行，请确认是 combined 格式' };
        var topIps = Object.keys(ips).sort(function (a, b) { return ips[b] - ips[a]; }).slice(0, 5);
        var statusSummary = Object.keys(statuses).sort().map(function (s) {
          return s + '×' + statuses[s];
        }).join('、');
        var table = K.table(['IP', '时间', '方法', '路径', '状态', '字节'], rows.map(function (r) {
          var color = r.status[0] === '5' ? '#dc2626' : r.status[0] === '4' ? '#d97706' : 'inherit';
          return [r.ip, r.time, r.method, r.path, { html: '<span style="color:' + color + ';font-weight:600">' + r.status + '</span>' }, r.size];
        }), { maxHeight: '320px' });
        return {
          html: '<div class="stat-grid">' +
            '<div class="stat"><span class="stat-value">' + rows.length + '</span><span class="stat-label">日志条数</span></div>' +
            '<div class="stat"><span class="stat-value">' + Object.keys(ips).length + '</span><span class="stat-label">独立 IP</span></div>' +
            '<div class="stat"><span class="stat-value">' + K.formatBytes(bytes) + '</span><span class="stat-label">总流量</span></div>' +
            '</div>' +
            '<p class="hint">状态码分布：' + K.esc(statusSummary) + '；TOP IP：' + K.esc(topIps.join('、')) + '</p>' + table,
          note: '点击表格可滚动查看全部 ' + rows.length + ' 条'
        };
      }
    });
  }

  /* ------------------------------ 17. Conventional Commits 生成 ------------------------------ */
  function renderCommitGen(root) {
    K.form(root, {
      uid: 'commitgen',
      actionLabel: '生成',
      fields: [
        { id: 'type', label: '类型', type: 'select', value: 'feat',
          options: [
            { value: 'feat', label: 'feat 新功能' }, { value: 'fix', label: 'fix 修复' }, { value: 'docs', label: 'docs 文档' },
            { value: 'style', label: 'style 格式' }, { value: 'refactor', label: 'refactor 重构' }, { value: 'perf', label: 'perf 性能' },
            { value: 'test', label: 'test 测试' }, { value: 'build', label: 'build 构建' }, { value: 'ci', label: 'ci CI' },
            { value: 'chore', label: 'chore 杂项' }, { value: 'revert', label: 'revert 回滚' }
          ] },
        { id: 'scope', label: '影响范围（可选）', type: 'text', placeholder: '如 auth、ui、api' },
        { id: 'subject', label: '一句话描述（祈使句，不加句号）', type: 'text', value: '支持手机号验证码登录', wide: true },
        { id: 'body', label: '详细说明（可选）', type: 'textarea', rows: 3, wide: true, value: '' },
        { id: 'breaking', label: '有破坏性变更（! 与 BREAKING CHANGE）', type: 'checkbox' },
        { id: 'issue', label: '关联 Issue（可选）', type: 'text', placeholder: '如 #42' }
      ],
      hint: '规范提交让 changelog 自动化成为可能；工具会按 Angular 规范拼接全部字段。',
      run: function (v) {
        if (!v.subject.trim()) return { error: '请填写一句话描述' };
        var head = v.type + (v.scope.trim() ? '(' + v.scope.trim() + ')' : '') + (v.breaking ? '!' : '') + ': ' + v.subject.trim();
        var parts = [head];
        if (v.body.trim()) parts.push('\n' + v.body.trim());
        if (v.breaking) parts.push('\nBREAKING CHANGE: 请补充迁移说明');
        if (v.issue.trim()) parts.push('\n\nRefs: ' + v.issue.trim());
        var msg = parts.join('');
        return {
          output: msg,
          html: '<pre class="code-block">' + K.esc(msg) + '</pre>' +
            '<div class="btn-row"><button type="button" class="btn ghost" data-copy="' + K.esc(msg) + '">复制提交信息</button></div>',
          note: '用法：git commit -m "$(cat <<\'EOF\' ... )" 或复制到 GUI 提交框'
        };
      }
    });
  }

  /* ------------------------------ 18. HTML 模板生成 ------------------------------ */
  function renderHtmlSkeleton(root) {
    K.form(root, {
      uid: 'skeleton',
      actionLabel: '生成',
      fields: [
        { id: 'title', label: '页面标题', type: 'text', value: '我的页面', wide: true },
        { id: 'lang', label: '语言', type: 'text', value: 'zh-CN' },
        { id: 'css', label: '引入 CSS 文件', type: 'text', value: 'style.css' },
        { id: 'js', label: '引入 JS 文件', type: 'text', value: 'main.js' },
        { id: 'viewport', label: '含 viewport（移动端必备）', type: 'checkbox', value: true },
        { id: 'og', label: '含基础 OG 标签', type: 'checkbox' },
        { id: 'dark', label: '含 prefers-color-scheme 暗色适配', type: 'checkbox', value: true }
      ],
      hint: '一个能直接跑的 HTML5 骨架；不引外部资源，符合本站「无 CDN」的口味。',
      run: function (v) {
        var head = [];
        head.push('  <meta charset="UTF-8">');
        if (v.viewport) head.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
        head.push('  <title>' + K.esc(v.title) + '</title>');
        if (v.og) {
          head.push('  <meta property="og:title" content="' + K.esc(v.title) + '">');
        }
        if (v.css.trim()) head.push('  <link rel="stylesheet" href="' + K.esc(v.css.trim()) + '">');
        var body = [];
        body.push('  <header>');
        body.push('    <h1>' + K.esc(v.title) + '</h1>');
        body.push('  </header>');
        body.push('  <main>');
        body.push('    <p>页面内容从这里开始。</p>');
        body.push('  </main>');
        var scripts = v.js.trim() ? '\n  <script src="' + K.esc(v.js.trim()) + '" defer><\/script>' : '';
        var dark = v.dark
          ? '\n  <style>\n    @media (prefers-color-scheme: dark) {\n      :root { color-scheme: dark; }\n      body { background: #111318; color: #e8eaed; }\n    }\n  </style>'
          : '';
        var out = '<!DOCTYPE html>\n<html lang="' + (v.lang.trim() || 'zh-CN') + '">\n<head>\n' + head.join('\n') + dark + '\n</head>\n<body>\n' + body.join('\n') + scripts + '\n</body>\n</html>';
        return {
          output: out,
          html: '<pre class="code-block">' + K.esc(out) + '</pre>',
          note: '保存为 index.html 即可直接打开'
        };
      }
    });
  }

  /* ------------------------------ 19. SQL INSERT 生成 ------------------------------ */
  function parseDelimited(text, sep) {
    var rows = [];
    var cur = '';
    var inQuote = false;
    var row = [];
    for (var i = 0; i < text.length; i += 1) {
      var ch = text[i];
      if (inQuote) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cur += '"'; i += 1; }
          else inQuote = false;
        } else cur += ch;
      } else if (ch === '"') inQuote = true;
      else if (ch === sep) { row.push(cur); cur = ''; }
      else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (ch !== '\r') cur += ch;
    }
    if (cur.length || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return c.trim().length; }); });
  }

  function renderSqlInsert(root) {
    K.form(root, {
      uid: 'sqlinsert',
      actionLabel: '生成 SQL',
      fields: [
        { id: 'table', label: '表名', type: 'text', value: 'users' },
        { id: 'data', label: '数据（首行为列名，CSV / TSV）', type: 'textarea', rows: 7, wide: true, mono: true,
          value: 'name,age,city\n张三,28,北京\n李四,32,上海\nO\'Brien,25,"Dublin, IE"' },
        { id: 'multiline', label: '多语句（每行一条 INSERT）', type: 'checkbox' },
        { id: 'ifNotExists', label: '加 IF NOT EXISTS 防重（MySQL 8.0 / PostgreSQL）', type: 'checkbox' }
      ],
      hint: '自动处理引号与逗号转义；数字列自动不加引号，其余按字符串转义（含 \' → \'\'）。',
      run: function (v) {
        var table = v.table.trim();
        if (!/^\w+$/.test(table)) return { error: '表名只能包含字母数字与下划线' };
        var sep = v.data.indexOf('\t') >= 0 && v.data.indexOf(',') < 0 ? '\t' : ',';
        var rows = parseDelimited(v.data, sep);
        if (rows.length < 2) return { error: '至少需要表头 + 1 行数据' };
        var headers = rows[0].map(function (h) { return h.trim(); });
        if (headers.some(function (h) { return !h.length; })) return { error: '表头存在空列名' };
        var statements = rows.slice(1).map(function (row) {
          var values = headers.map(function (_, i) {
            var cell = (row[i] === undefined ? '' : row[i]).trim();
            if (cell === '' || cell.toUpperCase() === 'NULL') return 'NULL';
            if (/^-?\d+(\.\d+)?$/.test(cell)) return cell;
            return "'" + cell.replace(/'/g, "''") + "'";
          });
          return 'INSERT INTO ' + table + ' (' + headers.map(function (h) { return '`' + h + '`'; }).join(', ') + ') VALUES (' + values.join(', ') + ');';
        });
        var out = v.multiline ? statements.join('\n') : 'INSERT INTO ' + table + ' (' + headers.map(function (h) { return '`' + h + '`'; }).join(', ') + ') VALUES\n' +
          rows.slice(1).map(function (row) {
            var values = headers.map(function (_, i) {
              var cell = (row[i] === undefined ? '' : row[i]).trim();
              if (cell === '' || cell.toUpperCase() === 'NULL') return 'NULL';
              if (/^-?\d+(\.\d+)?$/.test(cell)) return cell;
              return "'" + cell.replace(/'/g, "''") + "'";
            });
            return '  (' + values.join(', ') + ')';
          }).join(',\n') + ';';
        if (v.ifNotExists) out = '-- MySQL 8.0+ / PG：IGNORE / ON CONFLICT 需按库调整\n' + out;
        return {
          output: out,
          html: '<pre class="code-block">' + K.esc(out) + '</pre>' +
            '<div class="btn-row"><button type="button" class="btn ghost" data-copy="' + K.esc(out) + '">复制 SQL</button></div>',
          note: '共 ' + statements.length + ' 行数据，' + headers.length + ' 列；反引号列名适配 MySQL，PG 请去掉'
        };
      }
    });
  }

  window.ToolModules['json-merge'] = renderJsonMerge;
  window.ToolModules['json-sort-keys'] = renderJsonSortKeys;
  window.ToolModules['dotenv-parse'] = renderDotenvParse;
  window.ToolModules['curl-builder'] = renderCurlBuilder;
  window.ToolModules['robots-gen'] = renderRobotsGen;
  window.ToolModules['meta-gen'] = renderMetaGen;
  window.ToolModules['lorem-gen'] = renderLoremGen;
  window.ToolModules['color-mix'] = renderColorMix;
  window.ToolModules['color-blind'] = renderColorBlind;
  window.ToolModules['clip-path-gen'] = renderClipPathGen;
  window.ToolModules['flex-gen'] = renderFlexGen;
  window.ToolModules['objectid-gen'] = renderObjectIdGen;
  window.ToolModules['shell-escape'] = renderShellEscape;
  window.ToolModules['debounce-demo'] = renderDebounceDemo;
  window.ToolModules['media-query-gen'] = renderMediaQueryGen;
  window.ToolModules['log-parser'] = renderLogParser;
  window.ToolModules['commit-gen'] = renderCommitGen;
  window.ToolModules['html-skeleton'] = renderHtmlSkeleton;
  window.ToolModules['sql-insert'] = renderSqlInsert;
})();
