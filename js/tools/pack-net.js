/* =============================================================================
 * 网络工具包（7 个）
 * -----------------------------------------------------------------------------
 * domain-parse / cookie-parse / http-header / ipv4-convert / subnet-calc /
 * http-status / port-lookup
 *
 * 全部离线计算，不发起任何网络请求（因此不需要 CORS，也不会泄露查询内容）。
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  /* ------------------------------ 域名 / URL 解析 ------------------------------ */
  function renderDomain(root) {
    var uid = 'domain';
    root.innerHTML =
      '<div class="field">' +
        '<div class="label-row"><label class="label" for="' + uid + '-input">URL 或域名</label></div>' +
        '<input id="' + uid + '-input" class="input mono" type="text" spellcheck="false" ' +
        'placeholder="https://blog.example.com:8443/path/page?x=1#top">' +
      '</div>' +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="' + uid + '-run">解析</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-sample">示例</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-clear">清空</button>' +
      '</div>' +
      '<div id="' + uid + '-out"></div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      '<p class="hint">缺少协议时会自动按 https 补全。主域识别采用常见后缀表，未覆盖的后缀会按「最后两段」处理。</p>';

    var input = root.querySelector('#' + uid + '-input');
    var out = root.querySelector('#' + uid + '-out');
    var statusEl = root.querySelector('#' + uid + '-status');

    var MULTI_TLDS = ['com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn', 'ac.cn', 'co.uk', 'org.uk',
      'co.jp', 'co.kr', 'com.hk', 'com.tw', 'com.au', 'co.nz', 'com.sg'];

    function run() {
      var raw = input.value.trim();
      if (!raw) { window.UI.toast('请输入 URL 或域名', 'warn'); input.focus(); return; }
      var url;
      try {
        url = new URL(raw);
      } catch (e) {
        try { url = new URL('https://' + raw); }
        catch (e2) {
          out.innerHTML = '';
          statusEl.className = 'status err';
          statusEl.textContent = '无法解析，请检查格式是否正确。';
          statusEl.hidden = false;
          return;
        }
      }

      var hostname = url.hostname;
      var asciiHost = hostname;
      if (/[^\x00-\x7f]/.test(hostname)) {
        // 浏览器会自动把国际化域名转成 punycode
        asciiHost = url.hostname;
      }
      var labels = asciiHost.split('.');
      var tld = labels.slice(-1)[0];
      var multi = MULTI_TLDS.filter(function (suffix) {
        return asciiHost === suffix || asciiHost.slice(-suffix.length - 1) === '.' + suffix;
      })[0];
      var rootDomain = multi
        ? labels.slice(-(multi.split('.').length + 1)).join('.')
        : labels.slice(-2).join('.');
      var subDomain = labels.slice(0, Math.max(0, labels.length - (multi ? multi.split('.').length + 1 : 2))).join('.') || '（无）';

      var params = [];
      url.searchParams.forEach(function (value, key) {
        params.push({ key: key, value: value });
      });

      var rows = [
        { key: '协议', value: url.protocol.replace(':', '') },
        { key: '完整主机', value: url.host },
        { key: '主机名', value: asciiHost },
        { key: '端口', value: url.port || (url.protocol === 'https:' ? '443（默认）' : url.protocol === 'http:' ? '80（默认）' : '（无）') },
        { key: '路径', value: url.pathname },
        { key: '查询串', value: url.search || '（无）' },
        { key: '锚点', value: url.hash || '（无）' },
        { key: '顶级域 TLD', value: '.' + tld },
        { key: '主域名', value: rootDomain },
        { key: '子域名', value: subDomain },
        { key: '来源 Origin', value: url.origin }
      ];

      out.innerHTML = K.kv(rows) +
        (params.length
          ? '<h2 class="sub-title">查询参数（' + params.length + ' 个）</h2>' +
            K.table(['#', '参数名', '值'], params.map(function (p, index) {
              return [index + 1, p.key, p.value];
            }))
          : '');

      K.bindCopy(out);
      statusEl.className = 'status ok';
      statusEl.textContent = '解析完成' + (params.length ? '，共 ' + params.length + ' 个查询参数。' : '。');
      statusEl.hidden = false;
    }

    root.querySelector('#' + uid + '-run').addEventListener('click', run);
    root.querySelector('#' + uid + '-sample').addEventListener('click', function () {
      input.value = 'https://blog.example.com:8443/path/page?x=1&tag=%E5%89%8D%E7%AB%AF#top';
      run();
    });
    root.querySelector('#' + uid + '-clear').addEventListener('click', function () {
      input.value = '';
      out.innerHTML = '';
      statusEl.hidden = true;
      window.UI.toast('已清空', 'success');
    });
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') { event.preventDefault(); run(); }
    });
  }

  /* ------------------------------ Cookie 解析 ------------------------------ */
  function renderCookie(root) {
    var uid = 'cookie';
    root.innerHTML =
      '<div class="field">' +
        '<div class="label-row"><label class="label" for="' + uid + '-input">Cookie 字符串</label>' +
        '<div class="label-actions"><button type="button" class="link-btn" id="' + uid + '-self">读取当前站点 Cookie</button></div></div>' +
        '<textarea id="' + uid + '-input" class="textarea mono" rows="5" spellcheck="false" ' +
        'placeholder="sessionid=abc123; theme=dark; Path=/; HttpOnly"></textarea>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="' + uid + '-run">解析</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-sample">示例</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-clear">清空</button>' +
      '</div>' +
      '<div id="' + uid + '-out"></div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      '<p class="hint">「读取当前站点 Cookie」只能读取非 HttpOnly 的项；不同站点之间互相隔离，本页面也无法读取其他网站的 Cookie。</p>';

    var input = root.querySelector('#' + uid + '-input');
    var out = root.querySelector('#' + uid + '-out');
    var statusEl = root.querySelector('#' + uid + '-status');

    var ATTRIBUTES = ['path', 'domain', 'expires', 'max-age', 'samesite', 'secure', 'httponly', 'priority', 'partitioned'];

    function run() {
      var text = input.value.trim();
      if (!text) { window.UI.toast('请粘贴 Cookie 字符串', 'warn'); input.focus(); return; }
      var parts = text.split(';');
      var cookies = [];
      var attrs = [];

      parts.forEach(function (part) {
        var item = part.trim();
        if (!item) return;
        var index = item.indexOf('=');
        var key = index === -1 ? item : item.slice(0, index).trim();
        var value = index === -1 ? '' : item.slice(index + 1).trim();
        var lower = key.toLowerCase();
        if (ATTRIBUTES.indexOf(lower) !== -1) {
          attrs.push({ key: key, value: value || 'true' });
        } else {
          var decoded = value;
          try { decoded = decodeURIComponent(value); } catch (e) { decoded = value; }
          cookies.push({ key: key, value: decoded, raw: value });
        }
      });

      out.innerHTML = '<h2 class="sub-title">键值对（' + cookies.length + ' 个）</h2>' +
        (cookies.length
          ? K.table(['#', '名称', '值（已解码）'], cookies.map(function (c, index) {
            return [index + 1, c.key, c.value];
          }))
          : '<p class="hint">没有解析到键值对。</p>') +
        (attrs.length
          ? '<h2 class="sub-title">属性</h2>' +
            K.table(['属性', '值'], attrs.map(function (a) { return [a.key, a.value]; }))
          : '');

      statusEl.className = 'status ok';
      statusEl.textContent = '解析完成：' + cookies.length + ' 个键值对，' + attrs.length + ' 个属性。';
      statusEl.hidden = false;
    }

    root.querySelector('#' + uid + '-run').addEventListener('click', run);
    root.querySelector('#' + uid + '-self').addEventListener('click', function () {
      var value = document.cookie;
      if (!value) {
        window.UI.toast('当前站点没有可读的 Cookie', 'warn');
        return;
      }
      input.value = value;
      run();
    });
    root.querySelector('#' + uid + '-sample').addEventListener('click', function () {
      input.value = 'sessionid=s%3Aabc123.def456; theme=dark; lang=zh-CN; Path=/; Domain=.example.com; Max-Age=86400; SameSite=Lax';
      run();
    });
    root.querySelector('#' + uid + '-clear').addEventListener('click', function () {
      input.value = '';
      out.innerHTML = '';
      statusEl.hidden = true;
      window.UI.toast('已清空', 'success');
    });
  }

  /* ------------------------------ HTTP 头解析 ------------------------------ */
  function renderHttpHeader(root) {
    var uid = 'header';
    root.innerHTML =
      '<div class="field">' +
        '<div class="label-row"><label class="label" for="' + uid + '-input">原始请求头 / 响应头</label></div>' +
        '<textarea id="' + uid + '-input" class="textarea mono" rows="8" spellcheck="false" ' +
        'placeholder="Content-Type: application/json&#10;Authorization: Bearer xxx&#10;Accept: */*"></textarea>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="' + uid + '-run">解析</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-sample">示例</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-clear">清空</button>' +
      '</div>' +
      '<div id="' + uid + '-out"></div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      '<p class="hint">以第一个冒号分隔键值，支持折行（以空格开头的续行会拼接到上一行）。</p>';

    var input = root.querySelector('#' + uid + '-input');
    var out = root.querySelector('#' + uid + '-out');
    var statusEl = root.querySelector('#' + uid + '-status');

    function run() {
      var lines = input.value.replace(/\r\n?/g, '\n').split('\n');
      if (!input.value.trim()) { window.UI.toast('请粘贴 HTTP 头', 'warn'); return; }

      var pairs = [];
      lines.forEach(function (line) {
        if (!line.trim()) return;
        if (/^\s/.test(line) && pairs.length) {
          pairs[pairs.length - 1].value += ' ' + line.trim();
          return;
        }
        var index = line.indexOf(':');
        if (index === -1) {
          pairs.push({ key: line.trim(), value: '' });
          return;
        }
        pairs.push({ key: line.slice(0, index).trim(), value: line.slice(index + 1).trim() });
      });

      if (!pairs.length) {
        out.innerHTML = '';
        statusEl.className = 'status err';
        statusEl.textContent = '没有解析到有效的头字段。';
        statusEl.hidden = false;
        return;
      }

      var obj = {};
      pairs.forEach(function (pair) {
        if (obj[pair.key] === undefined) obj[pair.key] = pair.value;
        else if (Array.isArray(obj[pair.key])) obj[pair.key].push(pair.value);
        else obj[pair.key] = [obj[pair.key], pair.value];
      });

      var NAME_MAP = {
        'content-type': '内容类型', 'content-length': '内容长度', 'authorization': '鉴权凭证',
        'user-agent': '客户端标识', 'accept': '可接受类型', 'cookie': 'Cookie',
        'set-cookie': '设置 Cookie', 'cache-control': '缓存策略', 'etag': '资源版本标识',
        'server': '服务器', 'date': '响应时间', 'location': '重定向地址',
        'access-control-allow-origin': 'CORS 允许来源'
      };

      out.innerHTML = K.kv([
        { key: '字段数量', value: pairs.length },
        { key: '总字符数', value: input.value.length }
      ]) +
        '<h2 class="sub-title">字段明细</h2>' +
        K.table(['字段', '含义', '值'], pairs.map(function (pair) {
          return [pair.key, NAME_MAP[pair.key.toLowerCase()] || '—', pair.value];
        }), { maxHeight: '420px' }) +
        '<h2 class="sub-title">JSON 形式（可直接复制）</h2>' +
        '<pre class="code-block">' + K.esc(JSON.stringify(obj, null, 2)) + '</pre>';

      K.bindCopy(out);
      statusEl.className = 'status ok';
      statusEl.textContent = '解析完成，共 ' + pairs.length + ' 个字段。';
      statusEl.hidden = false;
    }

    root.querySelector('#' + uid + '-run').addEventListener('click', run);
    root.querySelector('#' + uid + '-sample').addEventListener('click', function () {
      input.value = 'Host: api.example.com\nContent-Type: application/json; charset=utf-8\nAuthorization: Bearer eyJhbGciOi...\nAccept: */*\nCache-Control: no-cache';
      run();
    });
    root.querySelector('#' + uid + '-clear').addEventListener('click', function () {
      input.value = '';
      out.innerHTML = '';
      statusEl.hidden = true;
      window.UI.toast('已清空', 'success');
    });
  }

  /* ------------------------------ IPv4 转换 ------------------------------ */
  function ipToInt(ip) {
    var parts = ip.split('.');
    if (parts.length !== 4) throw new Error('IPv4 应包含 4 段，用点分隔。');
    var value = 0;
    parts.forEach(function (part) {
      var num = Number(part);
      if (!/^\d+$/.test(part) || num < 0 || num > 255) throw new Error('每段必须是 0–255 的整数：' + part);
      value = value * 256 + num;
    });
    return value;
  }

  function intToIp(value) {
    return [24, 16, 8, 0].map(function (shift) {
      return Math.floor(value / Math.pow(2, shift)) % 256;
    }).join('.');
  }

  function renderIpv4(root) {
    K.form(root, {
      uid: 'ipv4',
      actionLabel: '转换',
      fields: [
        {
          id: 'mode', label: '转换方向', type: 'select', value: 'toInt',
          options: [
            { value: 'toInt', label: 'IP → 整数 / 十六进制' },
            { value: 'toIp', label: '整数 → IP' }
          ]
        },
        { id: 'value', label: '输入', type: 'text', value: '192.168.1.1', wide: true }
      ],
      sample: { mode: 'toInt', value: '8.8.8.8' },
      run: function (values) {
        var raw = String(values.value || '').trim();
        if (!raw) return { error: '请输入内容。' };

        if (values.mode === 'toInt') {
          var int;
          try { int = ipToInt(raw); }
          catch (error) { return { error: error.message }; }
          var hex = int.toString(16).toUpperCase();
          while (hex.length < 8) hex = '0' + hex;
          var bin = int.toString(2);
          while (bin.length < 32) bin = '0' + bin;
          return {
            html: '<div class="big-result mono">' + K.esc(intToIp(int)) + ' = ' + K.group(int) + '</div>',
            rows: [
              { key: '点分十进制', value: intToIp(int) },
              { key: '十进制整数', value: int },
              { key: '十六进制', value: '0x' + hex },
              { key: '二进制', value: bin.replace(/(.{8})(?=.)/g, '$1.') },
              { key: 'IP 类别', value: int >>> 24 < 128 ? 'A 类' : int >>> 24 < 192 ? 'B 类' : int >>> 24 < 224 ? 'C 类' : int >>> 24 < 240 ? 'D 类（组播）' : 'E 类（保留）' },
              { key: '是否私有地址', value: (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(intToIp(int)) ? '是' : '否') }
            ],
            note: '整数与 IP 的互转常用于数据库存储与访问控制列表。'
          };
        }

        var number;
        if (/^0x[0-9a-f]+$/i.test(raw)) number = parseInt(raw, 16);
        else if (/^[01]{8,32}$/.test(raw)) number = parseInt(raw, 2);
        else number = Number(raw);
        if (!isFinite(number) || number < 0 || number > 4294967295) {
          return { error: '整数需在 0–4294967295 之间（支持 0x 十六进制与 32 位二进制输入）。' };
        }
        var ip = intToIp(number);
        return {
          html: '<div class="big-result mono">' + K.esc(ip) + '</div>',
          rows: [
            { key: 'IP 地址', value: ip },
            { key: '十进制', value: number },
            { key: '十六进制', value: '0x' + number.toString(16).toUpperCase() }
          ],
          note: '转换完成。'
        };
      }
    });
  }

  /* ------------------------------ 子网计算 ------------------------------ */
  function renderSubnet(root) {
    K.form(root, {
      uid: 'subnet',
      actionLabel: '计算子网',
      fields: [
        { id: 'ip', label: 'IP 地址', type: 'text', value: '192.168.1.10', wide: true },
        { id: 'prefix', label: '掩码前缀（/n）', type: 'number', value: 24, min: 0, max: 32, step: 1 }
      ],
      sample: { ip: '192.168.1.10', prefix: 24 },
      run: function (values) {
        var ip = String(values.ip || '').trim();
        var prefix = parseInt(values.prefix, 10);
        if (!isFinite(prefix) || prefix < 0 || prefix > 32) return { error: '掩码前缀需在 0–32 之间。' };

        var ipInt;
        try { ipInt = ipToInt(ip); }
        catch (error) { return { error: error.message }; }

        var mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
        var network = (ipInt & mask) >>> 0;
        var broadcast = (network | (~mask >>> 0)) >>> 0;
        var hostCount = prefix >= 31 ? (prefix === 32 ? 1 : 2) : Math.pow(2, 32 - prefix) - 2;
        var firstHost = prefix >= 31 ? network : network + 1;
        var lastHost = prefix >= 31 ? broadcast : broadcast - 1;

        return {
          html: '<div class="big-result mono">' + K.esc(intToIp(network)) + '/' + prefix + '</div>',
          rows: [
            { key: 'IP 地址', value: ip },
            { key: '子网掩码', value: intToIp(mask) + '（/' + prefix + '）' },
            { key: '通配符掩码', value: intToIp((~mask) >>> 0) },
            { key: '网络地址', value: intToIp(network) },
            { key: '广播地址', value: intToIp(broadcast) },
            { key: '可用主机范围', value: intToIp(firstHost) + ' – ' + intToIp(lastHost) },
            { key: '可用主机数', value: K.group(hostCount) + ' 个' },
            { key: '地址总数', value: K.group(Math.pow(2, 32 - prefix)) + ' 个' },
            { key: '网络类别', value: ipInt >>> 24 < 128 ? 'A 类' : ipInt >>> 24 < 192 ? 'B 类' : ipInt >>> 24 < 224 ? 'C 类' : 'D/E 类' },
            { key: '反向 DNS 区', value: intToIp(network).split('.').reverse().join('.') + '.in-addr.arpa' }
          ],
          note: '前缀 ≥ 31 时为点对点链路（/31）或单主机（/32），可用主机数按特殊规则计算。'
        };
      }
    });
  }

  /* ------------------------------ 状态码 / 端口速查 ------------------------------ */
  function lookupTable(root, cfg) {
    var uid = K.uid(cfg.uid);
    root.innerHTML =
      '<div class="field">' +
        '<div class="label-row"><label class="label" for="' + uid + '-q">搜索</label></div>' +
        '<input id="' + uid + '-q" class="input" type="search" placeholder="' + K.esc(cfg.placeholder) + '">' +
      '</div>' +
      '<div id="' + uid + '-out"></div>';

    var input = root.querySelector('#' + uid + '-q');
    var out = root.querySelector('#' + uid + '-out');

    function draw(keyword) {
      var query = (keyword || '').trim().toLowerCase();
      var rows = cfg.rows.filter(function (row) {
        if (!query) return true;
        return row.join(' ').toLowerCase().indexOf(query) !== -1;
      });
      out.innerHTML = K.table(cfg.headers, rows, { maxHeight: '520px' }) +
        '<p class="hint">共 ' + rows.length + ' 条' + (query ? '匹配结果' : '') + '。</p>';
    }

    input.addEventListener('input', window.UI.debounce(function () { draw(input.value); }, 150));
    draw('');
  }

  function renderHttpStatus(root) {
    lookupTable(root, {
      uid: 'status',
      placeholder: '输入 404 或「未找到」',
      headers: ['状态码', '含义', '说明'],
      rows: [
        ['100', 'Continue', '请求已接收，客户端应继续发送请求体'],
        ['101', 'Switching Protocols', '切换协议（如升级到 WebSocket）'],
        ['200', 'OK', '请求成功'],
        ['201', 'Created', '资源创建成功，通常用于 POST'],
        ['202', 'Accepted', '已接受，但尚未处理完成'],
        ['204', 'No Content', '成功但无返回内容，常用于 DELETE'],
        ['206', 'Partial Content', '范围请求，用于断点续传与视频拖动'],
        ['301', 'Moved Permanently', '永久重定向，搜索引擎会更新索引'],
        ['302', 'Found', '临时重定向'],
        ['303', 'See Other', '重定向到另一个地址，且用 GET 访问'],
        ['304', 'Not Modified', '资源未修改，使用本地缓存'],
        ['307', 'Temporary Redirect', '临时重定向，保持原请求方法'],
        ['308', 'Permanent Redirect', '永久重定向，保持原请求方法'],
        ['400', 'Bad Request', '请求语法错误或参数不合法'],
        ['401', 'Unauthorized', '未认证，需要登录'],
        ['403', 'Forbidden', '已认证但无权限访问'],
        ['404', 'Not Found', '资源不存在'],
        ['405', 'Method Not Allowed', '请求方法不被允许'],
        ['408', 'Request Timeout', '请求超时'],
        ['409', 'Conflict', '请求与资源当前状态冲突'],
        ['410', 'Gone', '资源已被永久删除'],
        ['413', 'Payload Too Large', '请求体过大（常见于上传限制）'],
        ['415', 'Unsupported Media Type', '请求格式不被支持'],
        ['418', "I'm a teapot", '愚人节彩蛋状态码'],
        ['422', 'Unprocessable Entity', '参数格式正确但语义有误'],
        ['429', 'Too Many Requests', '请求过于频繁，被限流'],
        ['431', 'Request Header Fields Too Large', '请求头过大'],
        ['500', 'Internal Server Error', '服务器内部错误'],
        ['501', 'Not Implemented', '服务器不支持该请求方法'],
        ['502', 'Bad Gateway', '网关收到上游的无效响应'],
        ['503', 'Service Unavailable', '服务暂不可用（过载或维护）'],
        ['504', 'Gateway Timeout', '网关等待上游超时'],
        ['505', 'HTTP Version Not Supported', '不支持的 HTTP 版本']
      ]
    });
  }

  function renderPort(root) {
    lookupTable(root, {
      uid: 'port',
      placeholder: '输入 443 或 ssh',
      headers: ['端口', '协议', '用途'],
      rows: [
        ['20 / 21', 'TCP', 'FTP 数据传输 / 控制'],
        ['22', 'TCP', 'SSH 远程登录、Git over SSH'],
        ['23', 'TCP', 'Telnet（明文，不安全）'],
        ['25', 'TCP', 'SMTP 邮件发送'],
        ['53', 'TCP/UDP', 'DNS 域名解析'],
        ['67 / 68', 'UDP', 'DHCP 服务端 / 客户端'],
        ['80', 'TCP', 'HTTP'],
        ['110', 'TCP', 'POP3 收邮件'],
        ['123', 'UDP', 'NTP 时间同步'],
        ['143', 'TCP', 'IMAP 收邮件'],
        ['161 / 162', 'UDP', 'SNMP 网络管理'],
        ['443', 'TCP', 'HTTPS'],
        ['445', 'TCP', 'SMB 文件共享'],
        ['465 / 587', 'TCP', 'SMTPS / SMTP 提交'],
        ['500', 'UDP', 'IPSec IKE'],
        ['514', 'UDP', 'Syslog 日志'],
        ['873', 'TCP', 'rsync 同步'],
        ['993 / 995', 'TCP', 'IMAPS / POP3S'],
        ['1080', 'TCP', 'SOCKS 代理'],
        ['1433', 'TCP', 'SQL Server'],
        ['1521', 'TCP', 'Oracle Database'],
        ['2049', 'TCP/UDP', 'NFS'],
        ['2375 / 2376', 'TCP', 'Docker API（2376 为 TLS）'],
        ['3000', 'TCP', '常见前端 / Node 开发端口'],
        ['3306', 'TCP', 'MySQL / MariaDB'],
        ['3389', 'TCP', 'Windows 远程桌面'],
        ['4000', 'TCP', '常见开发服务器端口'],
        ['5000', 'TCP', 'Flask / 常见开发端口'],
        ['5432', 'TCP', 'PostgreSQL'],
        ['5601', 'TCP', 'Kibana'],
        ['5672', 'TCP', 'RabbitMQ'],
        ['6379', 'TCP', 'Redis'],
        ['6443', 'TCP', 'Kubernetes API'],
        ['8000 / 8080', 'TCP', '常见 HTTP 备用端口'],
        ['8081', 'TCP', '常见 Nexus / 备用 HTTP'],
        ['8443', 'TCP', 'HTTPS 备用端口'],
        ['9000', 'TCP', 'PHP-FPM / MinIO'],
        ['9092', 'TCP', 'Kafka'],
        ['9200 / 9300', 'TCP', 'Elasticsearch HTTP / 传输'],
        ['11211', 'TCP/UDP', 'Memcached'],
        ['27017', 'TCP', 'MongoDB']
      ]
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['domain-parse'] = renderDomain;
  window.ToolModules['cookie-parse'] = renderCookie;
  window.ToolModules['http-header'] = renderHttpHeader;
  window.ToolModules['ipv4-convert'] = renderIpv4;
  window.ToolModules['subnet-calc'] = renderSubnet;
  window.ToolModules['http-status'] = renderHttpStatus;
  window.ToolModules['port-lookup'] = renderPort;
})();
