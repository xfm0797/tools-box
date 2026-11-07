/* =============================================================================
 * 开发辅助工具包 · 第二批（18 个）
 * -----------------------------------------------------------------------------
 * json-path / json-diff / json-flatten / yaml-to-json / xml-format /
 * css-unit / css-grid-gen / css-bezier / css-filter-gen / markdown-table /
 * markdown-toc / markdown-preview / gitignore-gen / license-gen /
 * docker-run-gen / color-shade / semver / regex-generator
 *
 * 全部本地解析与生成，不请求任何远程资源。
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  function fmtJson(value) {
    return JSON.stringify(value, null, 2);
  }

  /* ------------------------------ 1. JSON 路径提取 ------------------------------ */
  function tokenizePath(path) {
    var normalized = String(path).trim()
      .replace(/^\$\.?/, '')
      .replace(/\[(\d+)\]/g, '.$1')
      .replace(/\[['"]([^'"]+)['"]\]/g, '.$1');
    if (!normalized) return [];
    return normalized.split('.').filter(function (s) { return s.length; });
  }

  function walkPaths(value, prefix, out, depth) {
    if (out.length > 500 || depth > 12) return;
    if (value === null || typeof value !== 'object') {
      out.push({ path: prefix || '$', type: value === null ? 'null' : typeof value, value: value });
      return;
    }
    if (Array.isArray(value)) {
      if (!value.length) out.push({ path: prefix + '（空数组）', type: 'array', value: '[]' });
      value.forEach(function (item, i) {
        walkPaths(item, prefix + '[' + i + ']', out, depth + 1);
      });
      return;
    }
    var keys = Object.keys(value);
    if (!keys.length) out.push({ path: prefix + '（空对象）', type: 'object', value: '{}' });
    keys.forEach(function (key) {
      walkPaths(value[key], prefix ? prefix + '.' + key : key, out, depth + 1);
    });
  }

  function renderJsonPath(root) {
    K.form(root, {
      uid: 'jpath',
      actionLabel: '提取',
      fields: [
        { id: 'json', label: 'JSON', type: 'textarea', rows: 7, wide: true, value: '{\n  "user": {\n    "name": "张三",\n    "tags": ["前端", "工具"],\n    "address": { "city": "杭州" }\n  },\n  "ok": true\n}' },
        { id: 'path', label: '路径（留空则列出全部路径）', type: 'text', value: 'user.tags[0]', wide: true },
        { id: 'mode', label: '输出', type: 'select', value: 'value',
          options: [{ value: 'value', label: '只显示值' }, { value: 'path', label: '显示「路径 = 值」' }] }
      ],
      hint: '支持 a.b[0].c、$.a.b、["key"] 等写法；留空路径可列出整棵 JSON 的所有叶子节点。',
      run: function (v) {
        var data;
        try { data = JSON.parse(v.json); }
        catch (e) { return { error: 'JSON 解析失败：' + e.message }; }

        if (!v.path.trim()) {
          var paths = [];
          walkPaths(data, '', paths, 0);
          var rows = paths.map(function (p) {
            return [p.path, p.type, typeof p.value === 'object' ? JSON.stringify(p.value) : String(p.value)];
          });
          return { html: K.table(['路径', '类型', '值'], rows), note: '共 ' + paths.length + ' 个叶子节点' };
        }

        var tokens = tokenizePath(v.path);
        var current = data;
        for (var i = 0; i < tokens.length; i += 1) {
          if (current === null || typeof current !== 'object') {
            return { error: '路径在第 ' + (i + 1) + ' 段「' + tokens[i] + '」处中断，当前值不是对象' };
          }
          if (!(tokens[i] in current)) return { error: '路径不存在：' + tokens.slice(0, i + 1).join('.') };
          current = current[tokens[i]];
        }
        var text = typeof current === 'object' ? fmtJson(current) : String(current);
        return {
          html: '<pre class="code-block">' + K.esc(text) + '</pre>',
          rows: [
            { key: '类型', value: Array.isArray(current) ? 'array' : current === null ? 'null' : typeof current },
            { key: '路径', value: v.path }
          ],
          note: v.mode === 'path' ? v.path + ' = ' + text : '提取成功'
        };
      }
    });
  }

  /* ------------------------------ 2. JSON 对比 ------------------------------ */
  function diffJson(a, b, path, out) {
    if (out.length > 800) return;
    var typeA = a === null ? 'null' : Array.isArray(a) ? 'array' : typeof a;
    var typeB = b === null ? 'null' : Array.isArray(b) ? 'array' : typeof b;
    if (typeA !== typeB) {
      out.push({ path: path || '$', kind: '类型不同', a: typeA, b: typeB });
      return;
    }
    if (typeA === 'object') {
      var keys = {};
      Object.keys(a).forEach(function (k) { keys[k] = true; });
      Object.keys(b).forEach(function (k) { keys[k] = true; });
      Object.keys(keys).forEach(function (k) {
        var hasA = Object.prototype.hasOwnProperty.call(a, k);
        var hasB = Object.prototype.hasOwnProperty.call(b, k);
        var p = path ? path + '.' + k : k;
        if (!hasA) out.push({ path: p, kind: '仅 B 有', a: '—', b: fmtJson(b[k]) });
        else if (!hasB) out.push({ path: p, kind: '仅 A 有', a: fmtJson(a[k]), b: '—' });
        else diffJson(a[k], b[k], p, out);
      });
      return;
    }
    if (typeA === 'array') {
      var max = Math.max(a.length, b.length);
      for (var i = 0; i < max; i += 1) {
        var p2 = path + '[' + i + ']';
        if (i >= a.length) out.push({ path: p2, kind: '仅 B 有', a: '—', b: fmtJson(b[i]) });
        else if (i >= b.length) out.push({ path: p2, kind: '仅 A 有', a: fmtJson(a[i]), b: '—' });
        else diffJson(a[i], b[i], p2, out);
      }
      return;
    }
    if (a !== b) out.push({ path: path || '$', kind: '值不同', a: String(a), b: String(b) });
  }

  function renderJsonDiff(root) {
    K.form(root, {
      uid: 'jdiff',
      actionLabel: '对比',
      stack: true,
      fields: [
        { id: 'a', label: 'JSON A', type: 'textarea', rows: 8, wide: true, value: '{\n  "name": "张三",\n  "age": 28,\n  "tags": ["a", "b"]\n}' },
        { id: 'b', label: 'JSON B', type: 'textarea', rows: 8, wide: true, value: '{\n  "name": "张三",\n  "age": 29,\n  "tags": ["a", "c"],\n  "city": "杭州"\n}' }
      ],
      hint: '递归比较对象与数组，输出每一处新增、删除、修改与类型变化。',
      run: function (v) {
        var a, b;
        try { a = JSON.parse(v.a); } catch (e) { return { error: 'A 不是合法 JSON：' + e.message }; }
        try { b = JSON.parse(v.b); } catch (e) { return { error: 'B 不是合法 JSON：' + e.message }; }
        var out = [];
        diffJson(a, b, '', out);
        if (!out.length) return { html: '<div class="big-result">两个 JSON 完全一致</div>', note: '没有差异' };
        var rows = out.map(function (item) {
          return [item.path, item.kind, item.a, item.b];
        });
        return {
          html: K.table(['路径', '变化', 'A', 'B'], rows, { maxHeight: '420px' }),
          note: '共 ' + out.length + ' 处差异'
        };
      }
    });
  }

  /* ------------------------------ 3. JSON 扁平化 ------------------------------ */
  function flatten(value, prefix, sep, out) {
    if (value !== null && typeof value === 'object') {
      if (Array.isArray(value)) {
        if (!value.length) { out[prefix] = []; return; }
        value.forEach(function (item, i) { flatten(item, prefix + sep + i, sep, out); });
      } else {
        var keys = Object.keys(value);
        if (!keys.length) { out[prefix] = {}; return; }
        keys.forEach(function (k) { flatten(value[k], prefix ? prefix + sep + k : k, sep, out); });
      }
      return;
    }
    out[prefix || '$'] = value;
  }

  function renderJsonFlatten(root) {
    K.form(root, {
      uid: 'jflat',
      actionLabel: '扁平化',
      fields: [
        { id: 'json', label: 'JSON', type: 'textarea', rows: 8, wide: true,
          value: '{\n  "user": { "name": "张三", "tags": ["a", "b"] },\n  "ok": true\n}' },
        { id: 'sep', label: '分隔符', type: 'select', value: '.',
          options: [{ value: '.', label: '点 .' }, { value: '/', label: '斜杠 /' }, { value: '_', label: '下划线 _' }] },
        { id: 'format', label: '输出格式', type: 'select', value: 'json',
          options: [{ value: 'json', label: '扁平 JSON 对象' }, { value: 'table', label: '键值表格' }] }
      ],
      hint: '常用于把嵌套配置转成环境变量、Excel 行或日志字段。',
      run: function (v) {
        var data;
        try { data = JSON.parse(v.json); } catch (e) { return { error: 'JSON 解析失败：' + e.message }; }
        if (data === null || typeof data !== 'object') return { error: '请输入对象或数组类型的 JSON' };
        var flat = {};
        flatten(data, '', v.sep, flat);
        var keys = Object.keys(flat);
        if (v.format === 'table') {
          return {
            html: K.table(['键', '值'], keys.map(function (k) {
              return [k, typeof flat[k] === 'object' ? JSON.stringify(flat[k]) : String(flat[k])];
            })),
            note: '共 ' + keys.length + ' 个叶子字段'
          };
        }
        return {
          html: '<pre class="code-block">' + K.esc(fmtJson(flat)) + '</pre>',
          note: '共 ' + keys.length + ' 个叶子字段'
        };
      }
    });
  }

  /* ------------------------------ 4. YAML 转 JSON ------------------------------ */
  function splitYamlPair(text) {
    var inSingle = false;
    var inDouble = false;
    for (var i = 0; i < text.length; i += 1) {
      var ch = text[i];
      if (ch === "'" && !inDouble) inSingle = !inSingle;
      else if (ch === '"' && !inSingle) inDouble = !inDouble;
      else if (ch === ':' && !inSingle && !inDouble && (i === text.length - 1 || text[i + 1] === ' ')) {
        return { key: text.slice(0, i).trim().replace(/^["']|["']$/g, ''), value: text.slice(i + 1).trim() };
      }
    }
    return null;
  }

  function splitInline(text, sep) {
    var parts = [];
    var buf = '';
    var depth = 0;
    var inS = false;
    var inD = false;
    for (var i = 0; i < text.length; i += 1) {
      var ch = text[i];
      if (ch === "'" && !inD) inS = !inS;
      else if (ch === '"' && !inS) inD = !inD;
      else if (!inS && !inD) {
        if (ch === '[' || ch === '{') depth += 1;
        else if (ch === ']' || ch === '}') depth -= 1;
        else if (ch === sep && depth === 0) { parts.push(buf); buf = ''; continue; }
      }
      buf += ch;
    }
    if (buf.trim()) parts.push(buf);
    return parts;
  }

  function parseYamlScalar(text) {
    var t = String(text).trim();
    if (!t) return null;
    if (t[0] === '"' && t[t.length - 1] === '"' && t.length > 1) {
      try { return JSON.parse(t); } catch (e) { return t.slice(1, -1); }
    }
    if (t[0] === "'" && t[t.length - 1] === "'" && t.length > 1) {
      return t.slice(1, -1).replace(/''/g, "'");
    }
    if (/^\[.*\]$/.test(t)) {
      var inner = t.slice(1, -1).trim();
      if (!inner) return [];
      return splitInline(inner, ',').map(parseYamlScalar);
    }
    if (/^\{.*\}$/.test(t)) {
      var innerObj = t.slice(1, -1).trim();
      var obj = {};
      if (!innerObj) return obj;
      splitInline(innerObj, ',').forEach(function (pair) {
        var p = splitYamlPair(pair.trim());
        if (p) obj[p.key] = parseYamlScalar(p.value);
      });
      return obj;
    }
    if (/^(true|yes|on)$/i.test(t)) return true;
    if (/^(false|no|off)$/i.test(t)) return false;
    if (/^(null|~)$/i.test(t)) return null;
    if (/^-?\d+$/.test(t)) return Number(t);
    if (/^-?\d*\.\d+([eE][-+]?\d+)?$/.test(t)) return Number(t);
    return t;
  }

  function parseYaml(src) {
    var lines = [];
    src.replace(/\r\n?/g, '\n').split('\n').forEach(function (line) {
      if (!line.trim() || /^\s*#/.test(line)) return;
      if (/^(---|\.\.\.)\s*$/.test(line)) return;
      var indent = line.match(/^ */)[0].length;
      var content = line.slice(indent).replace(/\s+#.*$/, '');
      lines.push({ indent: indent, content: content });
    });
    if (!lines.length) throw new Error('YAML 内容为空');
    var pos = 0;

    function isSeqLine(line) {
      return line.content === '-' || line.content.indexOf('- ') === 0;
    }

    function assign(obj, pair, indent) {
      if (pair.value !== '') {
        obj[pair.key] = parseYamlScalar(pair.value);
        return;
      }
      if (pos < lines.length && (lines[pos].indent > indent || (lines[pos].indent === indent && isSeqLine(lines[pos])))) {
        obj[pair.key] = parseBlock(lines[pos].indent);
      } else {
        obj[pair.key] = null;
      }
    }

    function parseBlock(indent) {
      var first = lines[pos];
      if (!first) return null;
      if (isSeqLine(first)) {
        var arr = [];
        while (pos < lines.length && lines[pos].indent === indent && isSeqLine(lines[pos])) {
          var itemText = lines[pos].content.slice(1).trim();
          var itemIndent = indent + 2;
          pos += 1;
          if (!itemText) {
            arr.push(pos < lines.length && lines[pos].indent > indent ? parseBlock(lines[pos].indent) : null);
            continue;
          }
          var pair = splitYamlPair(itemText);
          if (pair) {
            var obj = {};
            assign(obj, pair, itemIndent);
            while (pos < lines.length && lines[pos].indent >= itemIndent && !(lines[pos].indent === indent && isSeqLine(lines[pos]))) {
              var nextPair = splitYamlPair(lines[pos].content);
              if (!nextPair) break;
              pos += 1;
              assign(obj, nextPair, itemIndent);
            }
            arr.push(obj);
          } else {
            arr.push(parseYamlScalar(itemText));
          }
        }
        return arr;
      }
      var map = {};
      while (pos < lines.length && lines[pos].indent === indent) {
        var current = lines[pos];
        var p = splitYamlPair(current.content);
        if (!p) throw new Error('无法解析第 ' + (pos + 1) + ' 行：' + current.content);
        pos += 1;
        assign(map, p, indent);
      }
      return map;
    }

    var result = parseBlock(lines[0].indent);
    if (pos < lines.length) throw new Error('存在无法归属的缩进，请检查第 ' + (pos + 1) + ' 行');
    return result;
  }

  function renderYamlToJson(root) {
    K.form(root, {
      uid: 'y2j',
      actionLabel: '转换',
      fields: [{
        id: 'yaml', label: 'YAML', type: 'textarea', rows: 12, wide: true,
        value: 'name: 集成工具大全\nversion: 2.0\nfeatures:\n  - 纯前端\n  - 零依赖\n  - 可离线\nowner:\n  name: 张三\n  contact:\n    email: hi@example.com\n    tags: [工具, 前端]\nenabled: true'
      }],
      hint: '支持常见 YAML 子集：映射、序列、嵌套、行内数组/对象、引号与注释；不支持锚点、多文档与块标量（| / >）。',
      run: function (v) {
        var data;
        try { data = parseYaml(v.yaml); } catch (e) { return { error: e.message }; }
        return { html: '<pre class="code-block">' + K.esc(fmtJson(data)) + '</pre>', note: '转换完成' };
      }
    });
  }

  /* ------------------------------ 5. XML 格式化 ------------------------------ */
  function formatXml(xml, unit) {
    var tokens = xml.replace(/>\s+</g, '><').match(/<[^>]+>|[^<]+/g) || [];
    var output = [];
    var depth = 0;
    var selfClosing = /\/>$/;
    tokens.forEach(function (token) {
      if (/^<\?/.test(token) || /^<!DOCTYPE/i.test(token) || /^<!--/.test(token)) {
        output.push(new Array(depth + 1).join(unit) + token);
        return;
      }
      if (/^<\//.test(token)) {
        depth = Math.max(0, depth - 1);
        output.push(new Array(depth + 1).join(unit) + token);
        return;
      }
      if (/^</.test(token)) {
        output.push(new Array(depth + 1).join(unit) + token);
        if (!selfClosing.test(token)) depth += 1;
        return;
      }
      var text = token.trim();
      if (text) output.push(new Array(depth + 1).join(unit) + text);
    });
    return output.join('\n');
  }

  function renderXmlFormat(root) {
    K.form(root, {
      uid: 'xml',
      actionLabel: '格式化',
      fields: [{
        id: 'xml', label: 'XML', type: 'textarea', rows: 10, wide: true,
        value: '<config><app name="toolbox" version="2.0"><items><item id="1">文本</item><item id="2">图片</item></items></app></config>'
      }],
      hint: '按标签层级缩进，保留声明、注释与 CDATA 内容；不做合法性校验。',
      run: function (v) {
        if (!v.xml.trim()) return { error: '请输入 XML' };
        var out = formatXml(v.xml.trim(), '  ');
        return { html: '<pre class="code-block">' + K.esc(out) + '</pre>', note: '已格式化 ' + out.split('\n').length + ' 行' };
      }
    });
  }

  /* ------------------------------ 6. px / rem 换算 ------------------------------ */
  function renderCssUnit(root) {
    K.form(root, {
      uid: 'cssunit',
      actionLabel: '换算',
      fields: [
        { id: 'value', label: '数值', type: 'number', value: 16, step: 'any' },
        { id: 'unit', label: '原单位', type: 'select', value: 'px',
          options: [{ value: 'px', label: 'px' }, { value: 'rem', label: 'rem' }, { value: 'em', label: 'em' }, { value: 'pt', label: 'pt' }] },
        { id: 'root', label: '根字号（px）', type: 'number', value: 16, min: 1, step: 'any' },
        { id: 'base', label: '父级字号（px，用于 em）', type: 'number', value: 16, min: 1, step: 'any' }
      ],
      hint: '1rem = 根字号，1em = 父级字号，1pt = 1/72 英寸 = 96/72 px。',
      run: function (v) {
        var n = Number(v.value);
        var rootSize = Number(v.root) || 16;
        var baseSize = Number(v.base) || 16;
        if (!isFinite(n)) return { error: '请输入有效数值' };
        var px = v.unit === 'px' ? n : v.unit === 'rem' ? n * rootSize : v.unit === 'em' ? n * baseSize : n * 96 / 72;
        return {
          rows: [
            { key: 'px', value: K.num(px, 4) + ' px' },
            { key: 'rem', value: K.num(px / rootSize, 4) + ' rem' },
            { key: 'em', value: K.num(px / baseSize, 4) + ' em' },
            { key: 'pt', value: K.num(px * 72 / 96, 4) + ' pt' },
            { key: 'vw（按 1440 宽）', value: K.num(px / 1440 * 100, 4) + ' vw' }
          ],
          note: '按根字号 ' + rootSize + 'px、父级字号 ' + baseSize + 'px 计算'
        };
      }
    });
  }

  /* ------------------------------ 7. CSS Grid 生成器 ------------------------------ */
  function renderCssGrid(root) {
    K.form(root, {
      uid: 'cssgrid',
      actionLabel: '生成',
      fields: [
        { id: 'cols', label: '列数', type: 'number', value: 3, min: 1, max: 12 },
        { id: 'rows', label: '行数', type: 'number', value: 2, min: 1, max: 12 },
        { id: 'gap', label: '间距 px', type: 'number', value: 16, min: 0, max: 100 },
        { id: 'justify', label: '水平对齐', type: 'select', value: 'stretch',
          options: [{ value: 'stretch', label: 'stretch' }, { value: 'start', label: 'start' }, { value: 'center', label: 'center' }, { value: 'space-between', label: 'space-between' }] },
        { id: 'align', label: '垂直对齐', type: 'select', value: 'stretch',
          options: [{ value: 'stretch', label: 'stretch' }, { value: 'start', label: 'start' }, { value: 'center', label: 'center' }] }
      ],
      hint: '生成等宽等高的响应式网格，预览使用 6 个占位单元。',
      run: function (v) {
        var cols = Math.max(1, Math.min(12, Number(v.cols) || 1));
        var rows = Math.max(1, Math.min(12, Number(v.rows) || 1));
        var gap = Math.max(0, Number(v.gap) || 0);
        var css = '.grid {\n' +
          '  display: grid;\n' +
          '  grid-template-columns: repeat(' + cols + ', 1fr);\n' +
          '  grid-template-rows: repeat(' + rows + ', minmax(60px, auto));\n' +
          '  gap: ' + gap + 'px;\n' +
          '  justify-items: ' + v.justify + ';\n' +
          '  align-items: ' + v.align + ';\n' +
          '}';
        var cells = '';
        for (var i = 0; i < Math.min(6, cols * rows); i += 1) cells += '<span class="gp-cell">' + (i + 1) + '</span>';
        return {
          html: '<div class="grid-preview" style="grid-template-columns:repeat(' + cols + ',1fr);gap:' + gap +
            'px;justify-items:' + v.justify + ';align-items:' + v.align + '">' + cells + '</div>' +
            '<pre class="code-block">' + K.esc(css) + '</pre>',
          note: cols + ' 列 × ' + rows + ' 行，间距 ' + gap + 'px'
        };
      }
    });
  }

  /* ------------------------------ 8. 贝塞尔曲线 ------------------------------ */
  function renderBezier(root) {
    K.form(root, {
      uid: 'bezier',
      actionLabel: '预览',
      fields: [
        { id: 'p1', label: 'P1.x', type: 'number', value: 0.25, step: '0.01', min: 0, max: 1 },
        { id: 'p2', label: 'P1.y', type: 'number', value: 0.1, step: '0.01' },
        { id: 'p3', label: 'P2.x', type: 'number', value: 0.25, step: '0.01', min: 0, max: 1 },
        { id: 'p4', label: 'P2.y', type: 'number', value: 1, step: '0.01' },
        { id: 'duration', label: '时长（ms）', type: 'number', value: 600, min: 100, max: 5000 }
      ],
      hint: '常用的 ease、ease-in-out 都可以用 cubic-bezier 表示；x 需在 0–1 之间。',
      run: function (v) {
        var p = [Number(v.p1), Number(v.p2), Number(v.p3), Number(v.p4)].map(function (x) { return isFinite(x) ? x : 0; });
        if (p[0] < 0 || p[0] > 1 || p[2] < 0 || p[2] > 1) return { error: 'P1.x 与 P2.x 必须在 0–1 之间' };
        var duration = Math.max(100, Number(v.duration) || 600);
        var fn = 'cubic-bezier(' + p.map(function (x) { return K.num(x, 2); }).join(', ') + ')';
        var css = '.element {\n  transition: transform ' + duration + 'ms ' + fn + ';\n}\n\n.element:hover {\n  transform: translateX(240px);\n}';
        return {
          html: '<div class="bezier-stage"><span class="bezier-ball" style="transition:transform ' + duration +
            'ms ' + fn + '"></span></div>' +
            '<pre class="code-block">' + K.esc(css) + '</pre>',
          note: fn + ' · ' + duration + 'ms（鼠标移入预览区可看效果）'
        };
      }
    });

  }

  /* ------------------------------ 9. CSS 滤镜生成器 ------------------------------ */
  function renderCssFilter(root) {
    var sliders = [
      ['brightness', '亮度', 100, 0, 200],
      ['contrast', '对比度', 100, 0, 200],
      ['saturate', '饱和度', 100, 0, 200],
      ['blur', '模糊', 0, 0, 20],
      ['grayscale', '灰度', 0, 0, 100],
      ['sepia', '复古', 0, 0, 100],
      ['hue', '色相旋转', 0, 0, 360]
    ];
    var uid = K.uid('filter');
    K.form(root, {
      uid: 'filter',
      actionLabel: '应用',
      fields: sliders.map(function (s) {
        return { id: s[0], label: s[1] + '（' + s[2] + '）', type: 'number', value: s[2], min: s[3], max: s[4] };
      }),
      hint: '数值变化后点击「应用」更新预览与 CSS；预览用渐变色块代替图片。',
      run: function (v) {
        var parts = [];
        if (Number(v.brightness) !== 100) parts.push('brightness(' + Number(v.brightness) + '%)');
        if (Number(v.contrast) !== 100) parts.push('contrast(' + Number(v.contrast) + '%)');
        if (Number(v.saturate) !== 100) parts.push('saturate(' + Number(v.saturate) + '%)');
        if (Number(v.blur) > 0) parts.push('blur(' + Number(v.blur) + 'px)');
        if (Number(v.grayscale) > 0) parts.push('grayscale(' + Number(v.grayscale) + '%)');
        if (Number(v.sepia) > 0) parts.push('sepia(' + Number(v.sepia) + '%)');
        if (Number(v.hue) !== 0) parts.push('hue-rotate(' + Number(v.hue) + 'deg)');
        var value = parts.length ? parts.join(' ') : 'none';
        return {
          html: '<div class="filter-stage" style="filter:' + value + '"></div>' +
            '<pre class="code-block">' + K.esc('.element {\n  filter: ' + value + ';\n}') + '</pre>',
          note: 'filter: ' + value
        };
      }
    });
  }

  /* ------------------------------ 10. Markdown 表格 ------------------------------ */
  function renderMarkdownTable(root) {
    K.form(root, {
      uid: 'mdtable',
      actionLabel: '生成',
      fields: [
        { id: 'data', label: '粘贴 CSV / TSV / 多行文本', type: 'textarea', rows: 8, wide: true,
          value: '姓名,部门,城市\n张三,前端,杭州\n李四,后端,上海\n王五,设计,成都' },
        { id: 'align', label: '对齐', type: 'select', value: 'left',
          options: [{ value: 'left', label: '左对齐' }, { value: 'center', label: '居中' }, { value: 'right', label: '右对齐' }] },
        { id: 'header', label: '第一行作为表头', type: 'checkbox', value: true }
      ],
      hint: '自动识别逗号、制表符或竖线分隔；输出的 Markdown 可直接粘进文档。',
      run: function (v) {
        var rows = v.data.split('\n').filter(function (l) { return l.trim(); }).map(function (line) {
          var delim = line.indexOf('\t') >= 0 ? '\t' : line.indexOf('|') >= 0 ? '|' : ',';
          return line.split(delim).map(function (c) { return c.trim(); });
        });
        if (!rows.length) return { error: '请输入表格内容' };
        var cols = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
        rows = rows.map(function (r) {
          while (r.length < cols) r.push('');
          return r;
        });
        var head = v.header ? rows[0] : rows[0].map(function (_, i) { return '列 ' + (i + 1); });
        var body = v.header ? rows.slice(1) : rows;
        var marker = v.align === 'center' ? ':---:' : v.align === 'right' ? '---:' : ':---';
        var lines = [];
        lines.push('| ' + head.join(' | ') + ' |');
        lines.push('| ' + head.map(function () { return marker; }).join(' | ') + ' |');
        body.forEach(function (r) { lines.push('| ' + r.join(' | ') + ' |'); });
        var md = lines.join('\n');
        return {
          html: '<pre class="code-block">' + K.esc(md) + '</pre>',
          note: body.length + ' 行 × ' + cols + ' 列'
        };
      }
    });
  }

  /* ------------------------------ 11. Markdown 目录 ------------------------------ */
  function slugify(text) {
    return text.toLowerCase().replace(/<[^>]*>/g, '').replace(/[^\w\u4e00-\u9fa5\s-]/g, '').trim().replace(/\s+/g, '-');
  }

  function renderMarkdownToc(root) {
    K.form(root, {
      uid: 'mdtoc',
      actionLabel: '生成目录',
      fields: [
        { id: 'md', label: 'Markdown', type: 'textarea', rows: 12, wide: true,
          value: '# 集成工具大全\n\n## 快速开始\n\n### 本地运行\n\n### 部署\n\n## 工具列表\n\n### 文本处理\n\n### 图片处理\n' },
        { id: 'depth', label: '最大层级', type: 'select', value: '3',
          options: [{ value: '2', label: 'H1–H2' }, { value: '3', label: 'H1–H3' }, { value: '4', label: 'H1–H4' }, { value: '6', label: '全部' }] },
        { id: 'links', label: '生成锚点链接', type: 'checkbox', value: true }
      ],
      hint: '按照标题层级生成缩进列表；锚点规则与常见 Markdown 渲染器一致（小写、空格转连字符）。',
      run: function (v) {
        var maxDepth = Number(v.depth) || 3;
        var lines = v.md.split('\n');
        var items = [];
        var used = {};
        lines.forEach(function (line) {
          var m = line.match(/^(#{1,6})\s+(.+?)\s*$/);
          if (!m) return;
          var level = m[1].length;
          if (level > maxDepth) return;
          var text = m[2].replace(/#+$/, '').trim();
          var slug = slugify(text) || 'section';
          if (used[slug]) { used[slug] += 1; slug = slug + '-' + used[slug]; }
          else used[slug] = 1;
          items.push({ level: level, text: text, slug: slug });
        });
        if (!items.length) return { error: '没有找到标题（以 # 开头的行）' };
        var minLevel = Math.min.apply(null, items.map(function (i) { return i.level; }));
        var md = items.map(function (item) {
          var indent = new Array((item.level - minLevel) * 2 + 1).join(' ');
          return indent + '- ' + (v.links ? '[' + item.text + '](#' + item.slug + ')' : item.text);
        }).join('\n');
        return {
          html: '<pre class="code-block">' + K.esc(md) + '</pre>',
          note: '共 ' + items.length + ' 个标题（最深 H' + maxDepth + '）'
        };
      }
    });
  }

  /* ------------------------------ 12. Markdown 预览 ------------------------------ */
  function escapeHtml(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function inlineMd(text) {
    var out = escapeHtml(text);
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
    out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, label, href) {
      var safe = /^(https?:\/\/|\/|#|mailto:)/i.test(href) ? href : '#';
      return '<a href="' + safe + '" target="_blank" rel="noopener noreferrer">' + label + '</a>';
    });
    return out;
  }

  function markdownToHtml(src) {
    var lines = src.replace(/\r\n?/g, '\n').split('\n');
    var out = [];
    var inCode = false;
    var codeLines = [];
    var listType = null;
    var paragraph = [];

    function flushParagraph() {
      if (paragraph.length) {
        out.push('<p>' + inlineMd(paragraph.join(' ')) + '</p>');
        paragraph = [];
      }
    }
    function closeList() {
      if (listType) { out.push('</' + listType + '>'); listType = null; }
    }

    lines.forEach(function (line) {
      if (/^```/.test(line)) {
        if (inCode) {
          out.push('<pre><code>' + escapeHtml(codeLines.join('\n')) + '</code></pre>');
          codeLines = [];
          inCode = false;
        } else {
          flushParagraph();
          closeList();
          inCode = true;
        }
        return;
      }
      if (inCode) { codeLines.push(line); return; }

      if (!line.trim()) { flushParagraph(); closeList(); return; }

      var heading = line.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        flushParagraph();
        closeList();
        var level = heading[1].length;
        out.push('<h' + level + '>' + inlineMd(heading[2]) + '</h' + level + '>');
        return;
      }
      if (/^(\*\*\*|---|___)\s*$/.test(line)) {
        flushParagraph(); closeList(); out.push('<hr>'); return;
      }
      if (/^>\s?/.test(line)) {
        flushParagraph(); closeList();
        out.push('<blockquote>' + inlineMd(line.replace(/^>\s?/, '')) + '</blockquote>');
        return;
      }
      var ul = line.match(/^[-*+]\s+(.*)$/);
      var ol = line.match(/^\d+\.\s+(.*)$/);
      if (ul || ol) {
        flushParagraph();
        var wanted = ul ? 'ul' : 'ol';
        if (listType !== wanted) { closeList(); out.push('<' + wanted + '>'); listType = wanted; }
        out.push('<li>' + inlineMd((ul || ol)[1]) + '</li>');
        return;
      }
      paragraph.push(line.trim());
    });

    if (inCode) out.push('<pre><code>' + escapeHtml(codeLines.join('\n')) + '</code></pre>');
    flushParagraph();
    closeList();
    return out.join('\n');
  }

  function renderMarkdownPreview(root) {
    K.form(root, {
      uid: 'mdpreview',
      actionLabel: '预览',
      fields: [{
        id: 'md', label: 'Markdown', type: 'textarea', rows: 12, wide: true,
        value: '# 标题一\n\n这是一段**加粗**、*斜体*与 `行内代码` 的示例。\n\n> 引用：所有计算都在本地完成。\n\n- 列表项 1\n- 列表项 2\n\n1. 有序项\n2. 有序项\n\n```js\nconsole.log("hello");\n```\n\n[链接示例](https://example.com)'
      }],
      hint: '支持标题、粗体/斜体/删除线、行内代码、代码块、列表、引用、分割线与链接；不解析表格、脚注与内嵌 HTML。',
      run: function (v) {
        var html = markdownToHtml(v.md);
        return {
          html: '<div class="md-preview">' + html + '</div>',
          note: '已渲染 ' + v.md.split('\n').length + ' 行 Markdown'
        };
      }
    });
  }

  /* ------------------------------ 13. .gitignore 生成器 ------------------------------ */
  var GITIGNORE_SETS = {
    node: ['node_modules/', 'npm-debug.log*', 'yarn-error.log*', '.pnpm-store/', 'dist/', '.next/', '.nuxt/', 'coverage/'],
    python: ['__pycache__/', '*.py[cod]', '.venv/', 'venv/', '*.egg-info/', '.pytest_cache/', '.mypy_cache/'],
    java: ['*.class', 'target/', '*.jar', '*.war', '.gradle/', 'build/'],
    go: ['*.exe', '*.test', '*.out', 'vendor/', 'bin/'],
    rust: ['target/', 'Cargo.lock'],
    php: ['vendor/', '*.log', '.phpunit.result.cache'],
    mac: ['.DS_Store', '._*', '.Spotlight-V100', '.Trashes'],
    windows: ['Thumbs.db', 'ehthumbs.db', 'Desktop.ini', '$RECYCLE.BIN/'],
    linux: ['*~', '.directory', '.Trash-*'],
    ide: ['.idea/', '.vscode/', '*.iml', '*.swp', '*.swo'],
    env: ['.env', '.env.*', '!.env.example', '*.local'],
    logs: ['logs/', '*.log', 'npm-debug.log*'],
    cache: ['.cache/', '.temp/', 'tmp/']
  };

  function renderGitignore(root) {
    K.form(root, {
      uid: 'gitignore',
      actionLabel: '生成',
      fields: [
        { id: 'node', label: 'Node / 前端', type: 'checkbox', value: true },
        { id: 'python', label: 'Python', type: 'checkbox' },
        { id: 'java', label: 'Java', type: 'checkbox' },
        { id: 'go', label: 'Go', type: 'checkbox' },
        { id: 'rust', label: 'Rust', type: 'checkbox' },
        { id: 'php', label: 'PHP', type: 'checkbox' },
        { id: 'env', label: '环境变量', type: 'checkbox', value: true },
        { id: 'ide', label: '编辑器 / IDE', type: 'checkbox', value: true },
        { id: 'mac', label: 'macOS', type: 'checkbox', value: true },
        { id: 'windows', label: 'Windows', type: 'checkbox' },
        { id: 'linux', label: 'Linux', type: 'checkbox' },
        { id: 'logs', label: '日志', type: 'checkbox', value: true },
        { id: 'cache', label: '缓存 / 临时文件', type: 'checkbox' }
      ],
      hint: '按勾选项合并去重，生成可直接保存为 .gitignore 的内容。',
      run: function (v) {
        var sections = [];
        var seen = {};
        ['node', 'python', 'java', 'go', 'rust', 'php', 'env', 'ide', 'mac', 'windows', 'linux', 'logs', 'cache'].forEach(function (key) {
          if (!v[key]) return;
          var label = { node: 'Node / 前端', python: 'Python', java: 'Java', go: 'Go', rust: 'Rust', php: 'PHP', env: '环境变量', ide: '编辑器 / IDE', mac: 'macOS', windows: 'Windows', linux: 'Linux', logs: '日志', cache: '缓存' }[key];
          var lines = GITIGNORE_SETS[key].filter(function (line) {
            if (seen[line]) return false;
            seen[line] = true;
            return true;
          });
          if (lines.length) sections.push('# ' + label + '\n' + lines.join('\n'));
        });
        if (!sections.length) return { error: '请至少勾选一个分类' };
        var text = sections.join('\n\n') + '\n';
        return {
          html: '<pre class="code-block">' + K.esc(text) + '</pre>',
          note: '共 ' + text.split('\n').filter(Boolean).length + ' 行规则'
        };
      }
    });
  }

  /* ------------------------------ 14. 开源协议生成 ------------------------------ */
  var LICENSES = {
    mit: {
      name: 'MIT',
      body: function (year, author) {
        return 'MIT License\n\nCopyright (c) ' + year + ' ' + author + '\n\n' +
          'Permission is hereby granted, free of charge, to any person obtaining a copy\n' +
          'of this software and associated documentation files (the "Software"), to deal\n' +
          'in the Software without restriction, including without limitation the rights\n' +
          'to use, copy, modify, merge, publish, distribute, sublicense, and/or sell\n' +
          'copies of the Software, and to permit persons to whom the Software is\n' +
          'furnished to do so, subject to the following conditions:\n\n' +
          'The above copyright notice and this permission notice shall be included in all\n' +
          'copies or substantial portions of the Software.\n\n' +
          'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\n' +
          'IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\n' +
          'FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\n' +
          'AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\n' +
          'LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\n' +
          'OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\n' +
          'SOFTWARE.\n';
      }
    },
    bsd3: {
      name: 'BSD-3-Clause',
      body: function (year, author) {
        return 'BSD 3-Clause License\n\nCopyright (c) ' + year + ', ' + author + '\nAll rights reserved.\n\n' +
          'Redistribution and use in source and binary forms, with or without\n' +
          'modification, are permitted provided that the following conditions are met:\n\n' +
          '1. Redistributions of source code must retain the above copyright notice, this\n' +
          '   list of conditions and the following disclaimer.\n\n' +
          '2. Redistributions in binary form must reproduce the above copyright notice,\n' +
          '   this list of conditions and the following disclaimer in the documentation\n' +
          '   and/or other materials provided with the distribution.\n\n' +
          '3. Neither the name of the copyright holder nor the names of its contributors\n' +
          '   may be used to endorse or promote products derived from this software\n' +
          '   without specific prior written permission.\n\n' +
          'THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"\n' +
          'AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE\n' +
          'IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE\n' +
          'DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE\n' +
          'FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL\n' +
          'DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR\n' +
          'SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER\n' +
          'CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,\n' +
          'OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE\n' +
          'OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n';
      }
    },
    bsd2: {
      name: 'BSD-2-Clause',
      body: function (year, author) {
        return 'BSD 2-Clause License\n\nCopyright (c) ' + year + ', ' + author + '\nAll rights reserved.\n\n' +
          'Redistribution and use in source and binary forms, with or without\n' +
          'modification, are permitted provided that the following conditions are met:\n\n' +
          '1. Redistributions of source code must retain the above copyright notice, this\n' +
          '   list of conditions and the following disclaimer.\n\n' +
          '2. Redistributions in binary form must reproduce the above copyright notice,\n' +
          '   this list of conditions and the following disclaimer in the documentation\n' +
          '   and/or other materials provided with the distribution.\n\n' +
          'THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"\n' +
          'AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE\n' +
          'IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE\n' +
          'DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE\n' +
          'FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL\n' +
          'DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR\n' +
          'SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER\n' +
          'CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,\n' +
          'OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE\n' +
          'OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n';
      }
    },
    isc: {
      name: 'ISC',
      body: function (year, author) {
        return 'ISC License\n\nCopyright (c) ' + year + ' ' + author + '\n\n' +
          'Permission to use, copy, modify, and/or distribute this software for any\n' +
          'purpose with or without fee is hereby granted, provided that the above\n' +
          'copyright notice and this permission notice appear in all copies.\n\n' +
          'THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH\n' +
          'REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY\n' +
          'AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,\n' +
          'INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM\n' +
          'LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR\n' +
          'OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR\n' +
          'PERFORMANCE OF THIS SOFTWARE.\n';
      }
    },
    unlicense: {
      name: 'Unlicense',
      body: function () {
        return 'This is free and unencumbered software released into the public domain.\n\n' +
          'Anyone is free to copy, modify, publish, use, compile, sell, or distribute this\n' +
          'software, either in source code form or as a compiled binary, for any purpose,\n' +
          'commercial or non-commercial, and by any means.\n\n' +
          'In jurisdictions that recognize copyright laws, the author or authors of this\n' +
          'software dedicate any and all copyright interest in the software to the public\n' +
          'domain. We make this dedication for the benefit of the public at large and to\n' +
          'the detriment of our heirs and successors. We intend this dedication to be an\n' +
          'overt act of relinquishment in perpetuity of all present and future rights to\n' +
          'this software under copyright law.\n\n' +
          'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\n' +
          'IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\n' +
          'FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\n' +
          'AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN\n' +
          'ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION\n' +
          'WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.\n\n' +
          'For more information, please refer to <https://unlicense.org>\n';
      }
    }
  };

  function renderLicense(root) {
    K.form(root, {
      uid: 'license',
      actionLabel: '生成',
      fields: [
        { id: 'type', label: '协议', type: 'select', value: 'mit',
          options: [
            { value: 'mit', label: 'MIT（最宽松）' },
            { value: 'apache', label: 'Apache-2.0（提示）' },
            { value: 'bsd3', label: 'BSD-3-Clause' },
            { value: 'bsd2', label: 'BSD-2-Clause' },
            { value: 'isc', label: 'ISC' },
            { value: 'unlicense', label: 'Unlicense（公有领域）' }
          ] },
        { id: 'year', label: '年份', type: 'text', value: String(new Date().getFullYear()) },
        { id: 'author', label: '版权所有者', type: 'text', value: 'Your Name' }
      ],
      hint: 'MIT / BSD / ISC / Unlicense 为完整原文，可直接使用；Apache-2.0 与 GPL 文本较长，建议从官网获取原文。',
      run: function (v) {
        if (!v.author.trim()) return { error: '请填写版权所有者' };
        if (v.type === 'apache') {
          return {
            html: '<pre class="code-block">' + K.esc('Copyright ' + v.year + ' ' + v.author + '\n\n' +
              'Licensed under the Apache License, Version 2.0 (the "License");\n' +
              'you may not use this file except in compliance with the License.\n' +
              'You may obtain a copy of the License at\n\n' +
              '    http://www.apache.org/licenses/LICENSE-2.0\n\n' +
              'Unless required by applicable law or agreed to in writing, software\n' +
              'distributed under the License is distributed on an "AS IS" BASIS,\n' +
              'WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n' +
              'See the License for the specific language governing permissions and\n' +
              'limitations under the License.\n') + '</pre>',
            note: '这是 Apache-2.0 的版权声明片段，完整协议请从 apache.org 获取'
          };
        }
        var license = LICENSES[v.type];
        if (!license) return { error: '不支持的协议类型' };
        var text = license.body(v.year, v.author);
        return {
          html: '<pre class="code-block" style="max-height:420px;overflow:auto">' + K.esc(text) + '</pre>',
          note: license.name + ' · ' + text.split('\n').length + ' 行'
        };
      }
    });
  }

  /* ------------------------------ 15. docker run 生成器 ------------------------------ */
  function renderDockerRun(root) {
    K.form(root, {
      uid: 'docker',
      actionLabel: '生成命令',
      fields: [
        { id: 'image', label: '镜像', type: 'text', value: 'nginx:alpine', wide: true },
        { id: 'name', label: '容器名', type: 'text', value: 'web' },
        { id: 'ports', label: '端口映射', type: 'text', placeholder: '8080:80, 443:443' },
        { id: 'volumes', label: '挂载卷', type: 'text', placeholder: './html:/usr/share/nginx/html' },
        { id: 'env', label: '环境变量', type: 'text', placeholder: 'TZ=Asia/Shanghai, MODE=prod' },
        { id: 'network', label: '网络', type: 'text', placeholder: 'bridge' },
        { id: 'restart', label: '重启策略', type: 'select', value: 'unless-stopped',
          options: [{ value: '', label: '不设置' }, { value: 'no', label: 'no' }, { value: 'always', label: 'always' }, { value: 'unless-stopped', label: 'unless-stopped' }, { value: 'on-failure', label: 'on-failure' }] },
        { id: 'detach', label: '后台运行 -d', type: 'checkbox', value: true },
        { id: 'rm', label: '退出后删除 --rm', type: 'checkbox' }
      ],
      hint: '逗号分隔端口、卷与环境变量；生成的是单行命令，可直接复制到终端执行。',
      run: function (v) {
        if (!v.image.trim()) return { error: '请填写镜像名称' };
        var parts = ['docker run'];
        if (v.detach) parts.push('-d');
        if (v.rm) parts.push('--rm');
        if (v.name.trim()) parts.push('--name ' + v.name.trim());
        v.ports.split(',').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (p) {
          parts.push('-p ' + p);
        });
        v.volumes.split(',').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (vol) {
          parts.push('-v ' + vol);
        });
        v.env.split(',').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (e) {
          parts.push('-e ' + e);
        });
        if (v.network.trim()) parts.push('--network ' + v.network.trim());
        if (v.restart) parts.push('--restart ' + v.restart);
        parts.push(v.image.trim());
        var cmd = parts.join(' \\\n  ');
        return {
          html: '<pre class="code-block">' + K.esc(cmd) + '</pre>',
          note: '共 ' + (parts.length - 1) + ' 个参数'
        };
      }
    });
  }

  /* ------------------------------ 16. 颜色梯度 ------------------------------ */
  function hexToRgb(hex) {
    var value = hex.replace('#', '');
    if (value.length === 3) value = value.split('').map(function (c) { return c + c; }).join('');
    if (!/^[0-9a-f]{6}$/i.test(value)) return null;
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  }

  function rgbToHex(c) {
    return '#' + [c.r, c.g, c.b].map(function (v) {
      return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    }).join('');
  }

  function renderColorShade(root) {
    K.form(root, {
      uid: 'shade',
      actionLabel: '生成',
      fields: [
        { id: 'color', label: '基色', type: 'color', value: '#5b5bd6' },
        { id: 'steps', label: '每侧步数', type: 'number', value: 5, min: 1, max: 10 }
      ],
      hint: '变亮（与白色混合）与变暗（与黑色混合）各生成若干档，点击色块可复制 HEX。',
      run: function (v) {
        var base = hexToRgb(v.color);
        if (!base) return { error: '颜色格式不正确' };
        var steps = Math.max(1, Math.min(10, Number(v.steps) || 5));
        var lighter = [];
        var darker = [];
        for (var i = steps; i >= 1; i -= 1) {
          var t = i / (steps + 1);
          lighter.push(rgbToHex({
            r: base.r + (255 - base.r) * t,
            g: base.g + (255 - base.g) * t,
            b: base.b + (255 - base.b) * t
          }));
        }
        for (var j = 1; j <= steps; j += 1) {
          var t2 = j / (steps + 1);
          darker.push(rgbToHex({ r: base.r * (1 - t2), g: base.g * (1 - t2), b: base.b * (1 - t2) }));
        }
        var all = lighter.concat([v.color.toLowerCase()], darker);
        var html = '<div class="shade-grid">' + all.map(function (hex, idx) {
          var isBase = idx === steps;
          return '<button type="button" class="shade-item' + (isBase ? ' is-base' : '') + '" data-hex="' + hex + '">' +
            '<span class="shade-swatch" style="background:' + hex + '"></span>' +
            '<span class="shade-hex">' + hex.toUpperCase() + '</span></button>';
        }).join('') + '</div>';
        var vars = all.map(function (hex, idx) {
          var name = idx < steps ? 'light-' + (steps - idx) : idx === steps ? 'base' : 'dark-' + (idx - steps);
          return '  --color-' + name + ': ' + hex + ';';
        }).join('\n');
        return {
          html: html + '<pre class="code-block">' + K.esc(':root {\n' + vars + '\n}') + '</pre>',
          note: '共生成 ' + all.length + ' 档颜色，点击色块复制'
        };
      }
    });

    root.addEventListener('click', function (event) {
      var item = event.target.closest('.shade-item');
      if (!item) return;
      window.UI.copyText(item.getAttribute('data-hex'));
    });
  }

  /* ------------------------------ 17. 语义化版本 ------------------------------ */
  function parseSemver(text) {
    var m = String(text).trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/);
    if (!m) return null;
    return {
      major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]),
      pre: m[4] || '', build: m[5] || ''
    };
  }

  function compareSemver(a, b) {
    if (a.major !== b.major) return a.major - b.major;
    if (a.minor !== b.minor) return a.minor - b.minor;
    if (a.patch !== b.patch) return a.patch - b.patch;
    if (!a.pre && b.pre) return 1;
    if (a.pre && !b.pre) return -1;
    if (a.pre === b.pre) return 0;
    var pa = a.pre.split('.');
    var pb = b.pre.split('.');
    for (var i = 0; i < Math.max(pa.length, pb.length); i += 1) {
      if (pa[i] === undefined) return -1;
      if (pb[i] === undefined) return 1;
      var na = /^\d+$/.test(pa[i]);
      var nb = /^\d+$/.test(pb[i]);
      if (na && nb) {
        if (Number(pa[i]) !== Number(pb[i])) return Number(pa[i]) - Number(pb[i]);
      } else if (na !== nb) return na ? -1 : 1;
      else if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
    }
    return 0;
  }

  function renderSemver(root) {
    K.form(root, {
      uid: 'semver',
      actionLabel: '解析',
      fields: [
        { id: 'v1', label: '版本 A', type: 'text', value: '1.4.2' },
        { id: 'v2', label: '版本 B（可选）', type: 'text', value: '1.10.0' }
      ],
      hint: '遵循 SemVer 2.0：主版本.次版本.修订号[-预发布][+构建]。',
      run: function (v) {
        var a = parseSemver(v.v1);
        if (!a) return { error: '版本 A 不符合 SemVer 格式（如 1.2.3-beta.1）' };
        var rows = [
          { key: '主版本', value: String(a.major) },
          { key: '次版本', value: String(a.minor) },
          { key: '修订号', value: String(a.patch) },
          { key: '预发布', value: a.pre || '（无）' },
          { key: '构建元数据', value: a.build || '（无）' },
          { key: '下一主版本', value: (a.major + 1) + '.0.0' },
          { key: '下一次版本', value: a.major + '.' + (a.minor + 1) + '.0' },
          { key: '下一修订', value: a.major + '.' + a.minor + '.' + (a.patch + 1) }
        ];
        var note = '版本 A 解析成功';
        if (v.v2.trim()) {
          var b = parseSemver(v.v2);
          if (!b) return { error: '版本 B 不符合 SemVer 格式' };
          var cmp = compareSemver(a, b);
          rows.push({ key: '与 B 比较', value: cmp === 0 ? '相等' : cmp > 0 ? 'A 更新' : 'B 更新' });
          note = 'A ' + (cmp === 0 ? '=' : cmp > 0 ? '>' : '<') + ' B';
        }
        return { html: '<div class="big-result">' + K.esc(v.v1.trim()) + '</div>', rows: rows, note: note };
      }
    });
  }

  /* ------------------------------ 18. 常用正则生成 ------------------------------ */
  var REGEX_PRESETS = [
    ['email', '邮箱', '^[\\w.+-]+@[\\w-]+(\\.[\\w-]+)+$'],
    ['phone', '中国大陆手机号', '^1[3-9]\\d{9}$'],
    ['idcard', '身份证号（18 位）', '^[1-9]\\d{5}(19|20)\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]$'],
    ['url', '网址 URL', '^https?:\\/\\/[^\\s/$.?#].[^\\s]*$'],
    ['ipv4', 'IPv4 地址', '^((25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)\\.){3}(25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)$'],
    ['date', '日期 YYYY-MM-DD', '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'],
    ['time', '时间 HH:MM:SS', '^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$'],
    ['postcode', '中国邮政编码', '^[1-9]\\d{5}$'],
    ['username', '用户名（4–16 位）', '^[A-Za-z0-9_]{4,16}$'],
    ['password', '强密码（含大小写数字）', '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[A-Za-z\\d@$!%*?&]{8,}$'],
    ['chinese', '中文字符', '[\\u4e00-\\u9fa5]+'],
    ['hexcolor', '十六进制颜色', '^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$']
  ];

  function renderRegexGenerator(root) {
    K.form(root, {
      uid: 'regexgen',
      actionLabel: '生成',
      fields: [
        { id: 'email', label: '邮箱', type: 'checkbox', value: true },
        { id: 'phone', label: '手机号', type: 'checkbox', value: true },
        { id: 'idcard', label: '身份证', type: 'checkbox' },
        { id: 'url', label: '网址', type: 'checkbox' },
        { id: 'ipv4', label: 'IPv4', type: 'checkbox' },
        { id: 'date', label: '日期', type: 'checkbox' },
        { id: 'time', label: '时间', type: 'checkbox' },
        { id: 'postcode', label: '邮编', type: 'checkbox' },
        { id: 'username', label: '用户名', type: 'checkbox' },
        { id: 'password', label: '强密码', type: 'checkbox' },
        { id: 'chinese', label: '中文', type: 'checkbox' },
        { id: 'hexcolor', label: '颜色值', type: 'checkbox' },
        { id: 'test', label: '测试文本（可选）', type: 'text', wide: true, placeholder: '粘贴一段文本，检查是否匹配' }
      ],
      hint: '生成的是带 ^ $ 的整串匹配模式；需要部分匹配时自行去掉首尾锚点。',
      run: function (v) {
        var selected = REGEX_PRESETS.filter(function (preset) { return v[preset[0]]; });
        if (!selected.length) return { error: '请至少勾选一种类型' };
        var rows = selected.map(function (preset) {
          var result = '—';
          if (v.test !== '') {
            try {
              result = new RegExp(preset[2]).test(v.test) ? '匹配' : '不匹配';
            } catch (e) {
              result = '正则错误';
            }
          }
          return [{ html: '<code>' + K.esc(preset[2]) + '</code>' }, preset[1], result];
        });
        var text = selected.map(function (p) { return p[1] + '：' + p[2]; }).join('\n');
        return {
          html: '<pre class="code-block">' + K.esc(text) + '</pre>' + K.table(['正则', '用途', '测试结果'], rows),
          note: '已生成 ' + selected.length + ' 条正则'
        };
      }
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['json-path'] = renderJsonPath;
  window.ToolModules['json-diff'] = renderJsonDiff;
  window.ToolModules['json-flatten'] = renderJsonFlatten;
  window.ToolModules['yaml-to-json'] = renderYamlToJson;
  window.ToolModules['xml-format'] = renderXmlFormat;
  window.ToolModules['css-unit'] = renderCssUnit;
  window.ToolModules['css-grid-gen'] = renderCssGrid;
  window.ToolModules['css-bezier'] = renderBezier;
  window.ToolModules['css-filter-gen'] = renderCssFilter;
  window.ToolModules['markdown-table'] = renderMarkdownTable;
  window.ToolModules['markdown-toc'] = renderMarkdownToc;
  window.ToolModules['markdown-preview'] = renderMarkdownPreview;
  window.ToolModules['gitignore-gen'] = renderGitignore;
  window.ToolModules['license-gen'] = renderLicense;
  window.ToolModules['docker-run-gen'] = renderDockerRun;
  window.ToolModules['color-shade'] = renderColorShade;
  window.ToolModules['semver'] = renderSemver;
  window.ToolModules['regex-generator'] = renderRegexGenerator;
})();
