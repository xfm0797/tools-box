/* =============================================================================
 * 网络工具包 · 第五批（6 个）
 * -----------------------------------------------------------------------------
 * url-anatomy       URL 结构拆解
 * cidr-merge        CIDR 网段合并
 * cache-control-gen 缓存策略头生成
 * url-risk-check    URL 风险特征检查
 * proxy-env         代理环境变量生成
 * curl-to-fetch     curl 转 fetch / axios
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  function codeOut(title, code) {
    return '<div class="label-row"><span class="label">' + K.esc(title) + '</span>' +
      '<div class="label-actions"><button type="button" class="link-btn" data-copy="' + K.esc(code) + '">复制</button></div></div>' +
      '<pre class="code-block">' + K.esc(code) + '</pre>';
  }

  /* ------------------------------ 1. URL 拆解 ------------------------------ */
  function renderUrlAnatomy(root) {
    K.text(root, {
      uid: 'urlanatomy',
      inputLabel: 'URL（每行一个）',
      inputRows: 5,
      actionLabel: '拆解',
      hideOutput: true,
      options: [
        { id: 'params', label: '展开查询参数', type: 'checkbox', value: true }
      ],
      hint: '按 RFC 3986 把 URL 拆成协议、主机、端口、路径、查询与片段。注意 # 之后的内容不会发给服务器，前端路由常依赖这一点。',
      sample: 'https://user:pass@tools.lovou.pw:8443/path/to/page?utm_source=wx&id=42#section-2',
      run: function (text, opt) {
        var lines = text.split(/\r?\n/).filter(function (line) { return line.trim() !== ''; });
        if (!lines.length) return { error: '请至少输入一个 URL' };
        var blocks = [];
        lines.forEach(function (line) {
          var url;
          try {
            url = new URL(line.trim());
          } catch (error) {
            blocks.push('<p class="status err">无法解析：' + K.esc(line) + '</p>');
            return;
          }
          var rows = [
            { key: '协议 scheme', value: url.protocol.replace(':', ''), mono: false },
            { key: '用户名', value: url.username || '—', mono: false },
            { key: '密码', value: url.password ? '•••（已隐藏）' : '—', mono: false },
            { key: '主机 host', value: url.hostname, mono: false },
            { key: '端口 port', value: url.port || '默认（' + (url.protocol === 'https:' ? '443' : '80') + '）', mono: false },
            { key: '路径 pathname', value: url.pathname, mono: false },
            { key: '查询 search', value: url.search || '—', mono: false },
            { key: '片段 hash', value: url.hash || '—', mono: false },
            { key: '源 origin', value: url.origin, mono: false }
          ];
          var html = K.kv(rows);
          if (opt.params && url.searchParams && url.searchParams.toString()) {
            var paramRows = [];
            url.searchParams.forEach(function (value, key) {
              paramRows.push([key, value]);
            });
            html += '<p class="hint" style="margin-top:12px">查询参数（' + paramRows.length + ' 个）</p>' +
              K.table(['参数', '值'], paramRows);
          }
          blocks.push('<div class="result-block">' + html + '</div>');
        });
        return { html: blocks.join(''), output: '', note: '解析 ' + lines.length + ' 个 URL' };
      }
    });
  }

  /* ------------------------------ 2. CIDR 合并 ------------------------------ */
  function ipToInt(ip) {
    var parts = String(ip).split('.');
    if (parts.length !== 4) return null;
    var num = 0;
    for (var i = 0; i < 4; i += 1) {
      var value = parseInt(parts[i], 10);
      if (!/^\d+$/.test(parts[i]) || value < 0 || value > 255) return null;
      num = num * 256 + value;
    }
    return num;
  }

  function intToIp(num) {
    return [(num >>> 24) & 255, (num >>> 16) & 255, (num >>> 8) & 255, num & 255].join('.');
  }

  function maskOf(bits) {
    return bits === 0 ? 0 : (0xFFFFFFFF << (32 - bits)) >>> 0;
  }

  /** 把任意 [start, end] 地址区间拆成若干合法 CIDR 块 */
  function rangeToCidrs(start, end) {
    var out = [];
    var cursor = start;
    while (cursor <= end) {
      var bits = 32;
      for (var candidate = 0; candidate <= 32; candidate += 1) {
        var mask = maskOf(candidate);
        var blockStart = (cursor & mask) >>> 0;
        var size = Math.pow(2, 32 - candidate);
        if (blockStart === cursor && cursor + size - 1 <= end) {
          bits = candidate;
          break;
        }
      }
      out.push(intToIp(cursor) + '/' + bits);
      cursor += Math.pow(2, 32 - bits);
    }
    return out;
  }

  function renderCidrMerge(root) {
    K.text(root, {
      uid: 'cidrmerge',
      inputLabel: '每行一个网段或 IP（如 10.0.0.0/24、192.168.1.5）',
      inputRows: 8,
      actionLabel: '合并',
      options: [
        { id: 'includeSingle', label: '结果中保留单个 IP', type: 'checkbox', value: false }
      ],
      hint: '把重叠或相邻的网段合并成最小集合，常用于整理防火墙白名单、路由表与云厂商 IP 段。合并后覆盖范围完全等价，不会多也不会少。',
      sample: '10.0.0.0/24\n10.0.1.0/24\n10.0.2.0/23\n192.168.1.5\n192.168.1.6\n192.168.1.7\n192.168.1.8',
      run: function (text, opt) {
        var ranges = [];
        var invalid = [];
        text.split(/\r?\n/).forEach(function (line) {
          var raw = line.trim();
          if (!raw) return;
          var parts = raw.split('/');
          var ip = ipToInt(parts[0]);
          if (ip === null) { invalid.push(raw); return; }
          var bits = parts.length > 1 ? parseInt(parts[1], 10) : 32;
          if (!isFinite(bits) || bits < 0 || bits > 32) { invalid.push(raw); return; }
          var mask = maskOf(bits);
          ranges.push({ start: (ip & mask) >>> 0, end: ((ip & mask) >>> 0) + Math.pow(2, 32 - bits) - 1, bits: bits });
        });
        if (!ranges.length) return { error: '没有可解析的网段' };
        ranges.sort(function (a, b) { return a.start - b.start; });
        var merged = [ranges[0]];
        for (var i = 1; i < ranges.length; i += 1) {
          var last = merged[merged.length - 1];
          var current = ranges[i];
          if (current.start <= last.end + 1) {
            if (current.end > last.end) last.end = current.end;
          } else {
            merged.push({ start: current.start, end: current.end });
          }
        }
        var out = [];
        merged.forEach(function (item) {
          rangeToCidrs(item.start, item.end).forEach(function (cidr) {
            if (!opt.includeSingle && /\/32$/.test(cidr)) return;
            out.push(cidr);
          });
        });
        var totalIps = 0;
        out.forEach(function (cidr) {
          totalIps += Math.pow(2, 32 - parseInt(cidr.split('/')[1], 10));
        });
        var dropped = merged.reduce(function (sum, item) { return sum + (item.end - item.start + 1); }, 0) - totalIps;
        return {
          output: out.join('\n'),
          note: ranges.length + ' 个网段合并为 ' + out.length + ' 段，共 ' + K.group(totalIps) + ' 个地址' +
            (dropped ? '（另有 ' + dropped + ' 个单 IP 未输出）' : '') +
            (invalid.length ? '，忽略 ' + invalid.length + ' 行' : '')
        };
      }
    });
  }

  /* ------------------------------ 3. 缓存策略 ------------------------------ */
  var CACHE_PRESETS = {
    static: {
      label: '静态资源（哈希文件名）',
      headers: [
        ['Cache-Control', 'public, max-age=31536000, immutable'],
        ['ETag', '保持由服务器生成'],
        ['Vary', 'Accept-Encoding']
      ],
      note: '文件名带 content hash 时可用一年 immutable，改内容就换文件名。'
    },
    html: {
      label: 'HTML 入口页',
      headers: [
        ['Cache-Control', 'no-cache, must-revalidate'],
        ['ETag', '保持'],
        ['Vary', 'Accept-Encoding']
      ],
      note: 'no-cache 不是不缓存，而是每次用 ETag 协商，能拿到 304；必须让 HTML 及时更新，否则用户会加载到旧资源。'
    },
    api: {
      label: 'API 短缓存',
      headers: [
        ['Cache-Control', 'public, max-age=60, stale-while-revalidate=300'],
        ['Vary', 'Accept, Accept-Encoding, Authorization'],
        ['CDN-Cache-Control', 'public, max-age=120']
      ],
      note: 'stale-while-revalidate 让 CDN 先返回旧值再后台更新，兼顾命中率与新鲜度。'
    },
    private: {
      label: '用户私有数据',
      headers: [
        ['Cache-Control', 'private, no-store'],
        ['Pragma', 'no-cache（兼容 HTTP/1.0）']
      ],
      note: '包含个人信息、订单、后台数据的响应不要进共享缓存，no-store 才是真正的「不落盘」。'
    },
    swr: {
      label: '图片 / 字体长缓存',
      headers: [
        ['Cache-Control', 'public, max-age=2592000'],
        ['Vary', 'Accept-Encoding']
      ],
      note: '图片与字体更新频率低，30 天缓存 + 改名换版本是最稳的策略。'
    }
  };

  function renderCacheControl(root) {
    K.form(root, {
      uid: 'cachecontrol',
      fields: [
        { id: 'preset', label: '场景', type: 'select', value: 'static', options: Object.keys(CACHE_PRESETS).map(function (key) {
          return { value: key, label: CACHE_PRESETS[key].label };
        }) },
        { id: 'server', label: '服务器语法', type: 'select', value: 'nginx', options: [
          { value: 'nginx', label: 'Nginx' },
          { value: 'apache', label: 'Apache' },
          { value: 'node', label: 'Node / Express' },
          { value: 'cf', label: 'Cloudflare Pages（_headers）' }
        ] },
        { id: 'maxAge', label: '覆盖 max-age（秒，0 = 用默认）', type: 'number', value: 0, min: 0 }
      ],
      actionLabel: '生成',
      hint: '缓存策略的核心是区分「入口文件」与「静态资源」：入口必须可协商更新，带哈希的资源才能长期缓存。',
      sample: { preset: 'static', server: 'nginx', maxAge: 0 },
      run: function (values) {
        var preset = CACHE_PRESETS[values.preset] || CACHE_PRESETS.static;
        var headers = preset.headers.map(function (item) { return item.slice(); });
        var overrideAge = parseInt(values.maxAge, 10);
        if (overrideAge > 0) {
          headers = headers.map(function (item) {
            if (item[0] === 'Cache-Control') {
              return [item[0], item[1].replace(/max-age=\d+/, 'max-age=' + overrideAge)];
            }
            return item;
          });
        }
        var code = '';
        if (values.server === 'nginx') {
          code = headers.map(function (item) {
            return 'add_header ' + item[0] + ' "' + item[1] + '" always;';
          }).join('\n');
        } else if (values.server === 'apache') {
          code = '<IfModule mod_headers.c>\n' + headers.map(function (item) {
            return '  Header set ' + item[0] + ' "' + item[1] + '"';
          }).join('\n') + '\n</IfModule>';
        } else if (values.server === 'node') {
          code = 'app.use((req, res, next) => {\n' + headers.map(function (item) {
            return "  res.setHeader('" + item[0] + "', '" + item[1] + "');";
          }).join('\n') + '\n  next();\n});';
        } else {
          code = '/*\n' + headers.map(function (item) {
            return '  ' + item[0] + ': ' + item[1];
          }).join('\n');
        }
        return { html: codeOut(values.server, code), note: preset.note };
      }
    });
  }

  /* ------------------------------ 4. URL 风险特征 ------------------------------ */
  var PHISH_WORDS = ['login', 'signin', 'verify', 'account', 'secure', 'update', 'wallet', 'bank', 'pay', 'confirm', 'unlock', 'recover'];

  function renderUrlRisk(root) {
    K.text(root, {
      uid: 'urlrisk',
      inputLabel: '待检查的 URL（每行一个）',
      inputRows: 6,
      actionLabel: '检查',
      hideOutput: true,
      hint: '基于常见钓鱼特征做启发式判断：@ 混淆、IP 直连、非标准端口、punycode、超长主机名、敏感关键词等。命中不代表一定是恶意站点，但值得多看一眼。',
      sample: 'http://192.168.1.1:8080/login/verify-account\nhttps://xn--80ak6aa92e.com/secure/update\nhttps://github.com/xfm0797/tools-box',
      run: function (text) {
        var lines = text.split(/\r?\n/).filter(function (line) { return line.trim() !== ''; });
        if (!lines.length) return { error: '请至少输入一个 URL' };
        var rows = [];
        lines.forEach(function (line) {
          var raw = line.trim();
          var findings = [];
          var url;
          try {
            url = new URL(raw);
          } catch (error) {
            rows.push([raw, '高', '不是合法 URL']);
            return;
          }
          if (raw.split('?')[0].indexOf('@') >= 0) findings.push('包含 @：前面可能伪装成域名');
          if (/^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname)) findings.push('直接使用 IP 地址');
          if (url.port && ['', '80', '443'].indexOf(url.port) < 0) findings.push('非标准端口 ' + url.port);
          if (/^xn--/i.test(url.hostname) || url.hostname.indexOf('.xn--') >= 0) findings.push('Punycode 域名，可能是同形字攻击');
          if (url.hostname.replace(/\./g, '').length > 30) findings.push('主机名过长（' + url.hostname.length + ' 字符）');
          if ((url.hostname.match(/-/g) || []).length >= 3) findings.push('主机名含多个短横线');
          if (url.protocol === 'http:') findings.push('使用明文 HTTP');
          var path = (url.pathname + url.search).toLowerCase();
          var hits = PHISH_WORDS.filter(function (word) { return path.indexOf(word) >= 0; });
          if (hits.length >= 2) findings.push('路径含多个敏感词：' + hits.join('、'));
          if ((url.search.match(/=/g) || []).length > 8) findings.push('查询参数过多（' + url.search.split('&').length + ' 个）');
          var level = findings.length === 0 ? '低' : findings.length <= 2 ? '中' : '高';
          rows.push([url.hostname || raw, level, findings.length ? findings.join('；') : '未发现明显可疑特征']);
        });
        var highCount = rows.filter(function (row) { return row[1] === '高'; }).length;
        return {
          html: K.table(['主机', '风险', '命中特征'], rows),
          output: '',
          note: '检查 ' + rows.length + ' 个 URL，其中 ' + highCount + ' 个高风险'
        };
      }
    });
  }

  /* ------------------------------ 5. 代理环境变量 ------------------------------ */
  function renderProxyEnv(root) {
    K.form(root, {
      uid: 'proxyenv',
      fields: [
        { id: 'proxy', label: '代理地址', type: 'text', value: 'http://127.0.0.1:7890' },
        { id: 'noProxy', label: '不走代理的地址', type: 'text', value: 'localhost,127.0.0.1,*.local' },
        { id: 'shell', label: '目标', type: 'select', value: 'bash', options: [
          { value: 'bash', label: 'bash / zsh' },
          { value: 'powershell', label: 'PowerShell' },
          { value: 'cmd', label: 'cmd' },
          { value: 'docker', label: 'Docker 容器' }
        ] }
      ],
      actionLabel: '生成',
      hint: '大小写两套变量都要设：很多工具只读小写，curl 与部分 Java 程序只读大写。NO_PROXY 支持逗号分隔，通配符写法各程序支持不一。',
      sample: { proxy: 'http://127.0.0.1:7890', noProxy: 'localhost,127.0.0.1,*.local', shell: 'bash' },
      run: function (values) {
        var proxy = String(values.proxy || '').trim();
        if (!/^(https?|socks5h?):\/\/\S+$/.test(proxy)) return { error: '代理地址需形如 http://127.0.0.1:7890' };
        var noProxy = String(values.noProxy || '').trim();
        var lines = [];
        if (values.shell === 'bash') {
          lines.push('export HTTP_PROXY=' + proxy, 'export HTTPS_PROXY=' + proxy, 'export http_proxy=' + proxy,
            'export https_proxy=' + proxy, 'export ALL_PROXY=' + proxy, 'export all_proxy=' + proxy);
          if (noProxy) lines.push('export NO_PROXY=' + noProxy, 'export no_proxy=' + noProxy);
          lines.push('', '# 取消代理：unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy NO_PROXY no_proxy');
        } else if (values.shell === 'powershell') {
          lines.push('$env:HTTP_PROXY="' + proxy + '"', '$env:HTTPS_PROXY="' + proxy + '"',
            '$env:http_proxy="' + proxy + '"', '$env:https_proxy="' + proxy + '"');
          if (noProxy) lines.push('$env:NO_PROXY="' + noProxy + '"', '$env:no_proxy="' + noProxy + '"');
        } else if (values.shell === 'cmd') {
          lines.push('set HTTP_PROXY=' + proxy, 'set HTTPS_PROXY=' + proxy, 'set http_proxy=' + proxy, 'set https_proxy=' + proxy);
          if (noProxy) lines.push('set NO_PROXY=' + noProxy, 'set no_proxy=' + noProxy);
          lines.push('', 'rem 取消代理：set HTTP_PROXY=');
        } else {
          var dockerLines = ['docker run --rm'];
          ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy'].forEach(function (key) {
            dockerLines.push('  -e ' + key + '=' + proxy);
          });
          if (noProxy) {
            dockerLines.push('  -e NO_PROXY=' + noProxy);
            dockerLines.push('  -e no_proxy=' + noProxy);
          }
          dockerLines.push('  your-image:tag');
          lines = dockerLines;
        }
        return { html: codeOut(values.shell, lines.join('\n')), note: '代理 ' + proxy };
      }
    });
  }

  /* ------------------------------ 6. curl 转 fetch ------------------------------ */
  function tokenize(command) {
    var text = command.replace(/\\\r?\n/g, ' ').trim();
    var tokens = [];
    var re = /'([^']*)'|"((?:[^"\\]|\\.)*)"|(\S+)/g;
    var match;
    while ((match = re.exec(text)) !== null) {
      if (match[1] !== undefined) tokens.push(match[1]);
      else if (match[2] !== undefined) tokens.push(match[2].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\t/g, '\t'));
      else tokens.push(match[3]);
    }
    return tokens;
  }

  function renderCurlToFetch(root) {
    K.text(root, {
      uid: 'curltofetch',
      inputLabel: 'curl 命令',
      inputRows: 8,
      outputRows: 14,
      actionLabel: '转换',
      options: [
        { id: 'target', label: '输出', type: 'select', value: 'fetch', options: [
          { value: 'fetch', label: 'fetch（浏览器 / Node 18+）' },
          { value: 'axios', label: 'axios' }
        ] }
      ],
      hint: '支持 -X、-H、-d/--data/--data-raw、-u、--url 与引号包裹的参数。用了 -k 或 --compressed 会在注释里提示需要额外处理。',
      sample: 'curl -X POST "https://api.example.com/v1/items" \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer sk_live_xxx" \\\n  -d \'{"name":"tools","count":508}\'',
      run: function (text, opt) {
        var tokens = tokenize(text);
        if (!tokens.length || !/^curl$/i.test(tokens[0])) return { error: '请以 curl 开头粘贴完整命令' };
        var method = '';
        var url = '';
        var headers = [];
        var body = '';
        var auth = '';
        var notes = [];
        for (var i = 1; i < tokens.length; i += 1) {
          var token = tokens[i];
          if (token === '-X' || token === '--request') { method = tokens[i + 1] || ''; i += 1; continue; }
          if (token === '-H' || token === '--header') {
            var header = tokens[i + 1] || '';
            var idx = header.indexOf(':');
            if (idx > 0) headers.push([header.slice(0, idx).trim(), header.slice(idx + 1).trim()]);
            i += 1;
            continue;
          }
          if (token === '-d' || token === '--data' || token === '--data-raw' || token === '--data-binary') {
            body = tokens[i + 1] || '';
            i += 1;
            continue;
          }
          if (token === '-u' || token === '--user') {
            auth = tokens[i + 1] || '';
            i += 1;
            continue;
          }
          if (token === '--url') { url = tokens[i + 1] || ''; i += 1; continue; }
          if (token === '-k' || token === '--insecure') { notes.push('原命令忽略证书校验（-k），浏览器环境无法覆盖，请改用代理或自签证书'); continue; }
          if (token === '--compressed') { notes.push('已自动加上 Accept-Encoding 提示，浏览器无需手动设置'); continue; }
          if (token.charAt(0) === '-') continue;
          if (!url) url = token;
        }
        if (!url) return { error: '没找到请求 URL' };
        if (!method) method = body ? 'POST' : 'GET';
        if (auth && auth.indexOf(':') >= 0) {
          if (/^[\x20-\x7e]+$/.test(auth)) {
            headers.push(['Authorization', 'Basic ' + btoa(auth)]);
            notes.push('已把 -u 转成 Basic Authorization 头');
          } else {
            notes.push('-u 含非 ASCII 字符，请自行做 UTF-8 后 Base64 编码再用 Basic 头');
          }
        }
        var isJson = headers.some(function (item) { return /content-type/i.test(item[0]) && /json/i.test(item[1]); });
        var headerBlock = headers.map(function (item) {
          return "'" + item[0] + "': '" + item[1].replace(/'/g, "\\'") + "'";
        }).join(',\n    ');
        var code;
        if (opt.target === 'axios') {
          var cfg = ["  url: '" + url + "'", "  method: '" + method.toLowerCase() + "'"];
          if (headers.length) cfg.push('  headers: {\n    ' + headerBlock + '\n  }');
          if (body) cfg.push('  data: ' + (isJson && /^[\[{]/.test(body.trim()) ? body.trim() : "`" + body.replace(/`/g, '\\`') + "`"));
          code = 'const res = await axios({\n' + cfg.join(',\n') + '\n});\nconsole.log(res.data);';
        } else {
          var options = ["  method: '" + method + "'"];
          if (headers.length) options.push('  headers: {\n    ' + headerBlock + '\n  }');
          if (body) options.push('  body: ' + (isJson && /^[\[{]/.test(body.trim()) ? 'JSON.stringify(' + body.trim() + ')' : '`' + body.replace(/`/g, '\\`') + '`'));
          code = 'const res = await fetch(' + JSON.stringify(url) + ', {\n' + options.join(',\n') + '\n});\n' +
            'if (!res.ok) throw new Error(`HTTP ${res.status}`);\n' +
            'const data = await res.json();\nconsole.log(data);';
        }
        if (notes.length) code = '// ' + notes.join('\n// ') + '\n' + code;
        return { output: code, note: method + ' ' + url + ' · ' + headers.length + ' 个请求头' };
      }
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['url-anatomy'] = renderUrlAnatomy;
  window.ToolModules['cidr-merge'] = renderCidrMerge;
  window.ToolModules['cache-control-gen'] = renderCacheControl;
  window.ToolModules['url-risk-check'] = renderUrlRisk;
  window.ToolModules['proxy-env'] = renderProxyEnv;
  window.ToolModules['curl-to-fetch'] = renderCurlToFetch;
})();
