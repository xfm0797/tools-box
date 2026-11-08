/* =============================================================================
 * 网络工具包 · 第四批（6 个）
 * -----------------------------------------------------------------------------
 * ip-classify     IP 类型判断
 * ua-parse        User-Agent 解析
 * mime-type       扩展名 / MIME 对照
 * url-query-edit  URL 参数增删改
 * ipv4-range      IPv4 与整数、网段互转
 * cookie-builder  生成 Set-Cookie
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  /* ------------------------------ 1. IP 类型判断 ------------------------------ */
  function renderIpClassify(root) {
    K.text(root, {
      uid: 'ipclass',
      inputLabel: 'IP 地址（每行一个，支持 IPv4 / IPv6）',
      inputRows: 6,
      actionLabel: '判断',
      options: [
        { id: 'binary', label: 'IPv4 显示二进制', type: 'checkbox', value: false }
      ],
      sample: '192.168.1.10\n10.0.0.5\n127.0.0.1\n8.8.8.8\n172.16.3.9\n169.254.1.1\n224.0.0.1\n::1\nfe80::1',
      run: function (text, opt) {
        var lines = text.split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
        var rows = [];
        lines.forEach(function (line) {
          if (/^\d{1,3}(\.\d{1,3}){3}$/.test(line)) {
            var parts = line.split('.').map(Number);
            if (parts.some(function (n) { return n > 255; })) {
              rows.push([line, 'IPv4', '非法', '字节超过 255']);
              return;
            }
            var a = parts[0];
            var b = parts[1];
            var type = '公网地址';
            if (a === 10) type = '私有地址（A 类 10.0.0.0/8）';
            else if (a === 172 && b >= 16 && b <= 31) type = '私有地址（B 类 172.16.0.0/12）';
            else if (a === 192 && b === 168) type = '私有地址（C 类 192.168.0.0/16）';
            else if (a === 127) type = '回环地址';
            else if (a === 169 && b === 254) type = '链路本地（APIPA）';
            else if (a >= 224 && a <= 239) type = '组播地址';
            else if (a >= 240) type = '保留 / 实验地址';
            else if (a === 100 && b >= 64 && b <= 127) type = '运营商级 NAT（100.64.0.0/10）';
            else if (a === 0) type = '保留（本网络）';
            else if (a === 192 && b === 0 && parts[2] === 2) type = '文档示例地址';
            else if (a === 198 && (b === 18 || b === 19)) type = '基准测试地址';
            else if (a === 198 && b === 51 && parts[2] === 100) type = '文档示例地址';
            else if (a === 203 && b === 0 && parts[2] === 113) type = '文档示例地址';
            var binary = opt.binary ? parts.map(function (n) { return ('00000000' + n.toString(2)).slice(-8); }).join('.') : '—';
            rows.push([line, 'IPv4', type, binary]);
          } else if (line.indexOf(':') >= 0) {
            var lower = line.toLowerCase();
            var v6type = '公网地址';
            if (lower === '::1') v6type = '回环地址';
            else if (/^fe[89ab]/.test(lower)) v6type = '链路本地';
            else if (/^f[cd]/.test(lower)) v6type = '唯一本地地址（私有）';
            else if (/^ff/.test(lower)) v6type = '组播地址';
            else if (lower === '::') v6type = '未指定地址';
            rows.push([line, 'IPv6', v6type, '—']);
          } else {
            rows.push([line, '—', '无法识别', '—']);
          }
        });
        return {
          output: rows.map(function (row) { return row[0] + ' → ' + row[2]; }).join('\n'),
          html: K.table(['地址', '协议', '类型', '二进制'], rows),
          note: '共判断 ' + lines.length + ' 个地址，规则遵循 RFC 1918 / 4193 / 6890'
        };
      }
    });
  }

  /* ------------------------------ 2. UA 解析 ------------------------------ */
  function renderUaParse(root) {
    K.text(root, {
      uid: 'uaparse',
      inputLabel: 'User-Agent 字符串',
      inputRows: 5,
      actionLabel: '解析',
      hideOutput: true,
      sample: navigator.userAgent,
      run: function (text) {
        var ua = text.trim();
        if (!ua) return { error: '请粘贴 UA 字符串' };
        var browser = '未知';
        var engine = '未知';
        var os = '未知';
        var device = '桌面';

        var browsers = [
          [/Edg\/([\d.]+)/, 'Edge'],
          [/OPR\/([\d.]+)/, 'Opera'],
          [/Firefox\/([\d.]+)/, 'Firefox'],
          [/Chrome\/([\d.]+)/, 'Chrome'],
          [/Version\/([\d.]+).*Safari/, 'Safari'],
          [/MSIE ([\d.]+)/, 'IE'],
          [/Trident\/.*rv:([\d.]+)/, 'IE']
        ];
        var version = '';
        browsers.forEach(function (item) {
          var match = item[0].exec(ua);
          if (match && browser === '未知') { browser = item[1]; version = match[1]; }
        });

        if (/AppleWebKit/.test(ua)) engine = 'WebKit';
        if (/Gecko\/|Firefox/.test(ua)) engine = 'Gecko';
        if (/Trident/.test(ua)) engine = 'Trident';
        if (/Chrome|Edg|OPR/.test(ua) && /AppleWebKit/.test(ua)) engine = 'Blink';

        if (/Windows NT 10/.test(ua)) os = 'Windows 10 / 11';
        else if (/Windows NT 6\.3/.test(ua)) os = 'Windows 8.1';
        else if (/Windows NT 6\.1/.test(ua)) os = 'Windows 7';
        else if (/Mac OS X ([\d_]+)/.test(ua)) os = 'macOS ' + (/([\d_]+)/.exec(ua)[1] || '').replace(/_/g, '.');
        else if (/Android ([\d.]+)/.test(ua)) os = 'Android ' + /Android ([\d.]+)/.exec(ua)[1];
        else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS ' + ((/OS ([\d_]+)/.exec(ua) || [])[1] || '').replace(/_/g, '.');
        else if (/Linux/.test(ua)) os = 'Linux';

        if (/iPhone/.test(ua)) device = 'iPhone';
        else if (/iPad/.test(ua)) device = 'iPad';
        else if (/Android/.test(ua) && /Mobile/.test(ua)) device = 'Android 手机';
        else if (/Android/.test(ua)) device = 'Android 平板';
        else if (/Mobile/.test(ua)) device = '移动设备';

        return {
          html: K.kv([
            { key: '浏览器', value: browser + (version ? ' ' + version.split('.')[0] : ''), mono: false },
            { key: '完整版本', value: version || '—' },
            { key: '渲染引擎', value: engine, mono: false },
            { key: '操作系统', value: os, mono: false },
            { key: '设备类型', value: device, mono: false },
            { key: '是否移动端', value: /Mobile|Android|iPhone|iPad/.test(ua) ? '是' : '否', mono: false },
            { key: 'UA 长度', value: ua.length + ' 字符' }
          ]),
          note: 'UA 可被伪造，仅作统计参考，不要用于安全判断'
        };
      }
    });
  }

  /* ------------------------------ 3. MIME 对照 ------------------------------ */
  var MIME_TABLE = [
    ['html', 'text/html'], ['css', 'text/css'], ['js', 'text/javascript'],
    ['mjs', 'text/javascript'], ['json', 'application/json'], ['xml', 'application/xml'],
    ['txt', 'text/plain'], ['md', 'text/markdown'], ['csv', 'text/csv'],
    ['png', 'image/png'], ['jpg', 'image/jpeg'], ['jpeg', 'image/jpeg'], ['gif', 'image/gif'],
    ['webp', 'image/webp'], ['avif', 'image/avif'], ['svg', 'image/svg+xml'], ['ico', 'image/x-icon'],
    ['bmp', 'image/bmp'], ['tiff', 'image/tiff'],
    ['mp3', 'audio/mpeg'], ['wav', 'audio/wav'], ['ogg', 'audio/ogg'], ['flac', 'audio/flac'],
    ['aac', 'audio/aac'], ['m4a', 'audio/mp4'],
    ['mp4', 'video/mp4'], ['webm', 'video/webm'], ['mov', 'video/quicktime'], ['avi', 'video/x-msvideo'],
    ['mkv', 'video/x-matroska'],
    ['pdf', 'application/pdf'], ['zip', 'application/zip'], ['gz', 'application/gzip'],
    ['tar', 'application/x-tar'], ['7z', 'application/x-7z-compressed'], ['rar', 'application/vnd.rar'],
    ['doc', 'application/msword'],
    ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ['xls', 'application/vnd.ms-excel'],
    ['xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['ppt', 'application/vnd.ms-powerpoint'],
    ['pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    ['woff', 'font/woff'], ['woff2', 'font/woff2'], ['ttf', 'font/ttf'], ['otf', 'font/otf'],
    ['wasm', 'application/wasm'], ['apk', 'application/vnd.android.package-archive'],
    ['dmg', 'application/x-apple-diskimage'], ['exe', 'application/x-msdownload'],
    ['epub', 'application/epub+zip'], ['rtf', 'application/rtf'], ['yaml', 'application/yaml'],
    ['yml', 'application/yaml'], ['toml', 'application/toml'], ['map', 'application/json']
  ];

  function renderMimeType(root) {
    K.text(root, {
      uid: 'mimetype',
      inputLabel: '扩展名或 MIME（每行一个）',
      inputRows: 6,
      actionLabel: '查询',
      hideOutput: true,
      sample: 'svg\napplication/json\n.mp4\nwoff2\nunknown-format',
      run: function (text) {
        var lines = text.split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
        var rows = lines.map(function (line) {
          var value = line.replace(/^\./, '').toLowerCase();
          if (value.indexOf('/') > 0) {
            var found = MIME_TABLE.filter(function (item) { return item[1] === value; });
            return [line, found.length ? found.map(function (item) { return '.' + item[0]; }).join(', ') : '—', found.length ? '已知' : '未收录'];
          }
          var byExt = MIME_TABLE.filter(function (item) { return item[0] === value; })[0];
          return [line, byExt ? byExt[1] : '—', byExt ? '已知' : '未收录'];
        });
        return {
          output: rows.map(function (row) { return row[0] + ' → ' + row[1]; }).join('\n'),
          html: K.table(['输入', '对应值', '状态'], rows),
          note: '共 ' + MIME_TABLE.length + ' 条常见映射，未收录不代表无效'
        };
      }
    });
  }

  /* ------------------------------ 4. URL 参数编辑 ------------------------------ */
  function renderUrlQueryEdit(root) {
    K.form(root, {
      uid: 'urlqedit',
      actionLabel: '应用修改',
      fields: [
        { id: 'url', label: '原始 URL', type: 'text', value: 'https://tools.lovou.pw/search?q=json&page=1', wide: true },
        { id: 'ops', label: '操作（每行一条：set 键=值 / del 键 / rename 旧=新）', type: 'textarea', rows: 5, wide: true, mono: true,
          value: 'set page=2\nset sort=desc\ndel q' }
      ],
      hint: '修改后会保留原有参数顺序与其余部分（hash、路径）不变。',
      run: function (v) {
        var url;
        try {
          url = new URL(String(v.url || '').trim());
        } catch (error) {
          return { error: 'URL 格式不合法' };
        }
        var lines = String(v.ops || '').split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
        var log = [];
        lines.forEach(function (line, index) {
          var match = /^(set|del|rename)\s+(.+)$/i.exec(line);
          if (!match) { log.push('第 ' + (index + 1) + ' 行无法识别：' + line); return; }
          var action = match[1].toLowerCase();
          var arg = match[2];
          if (action === 'set') {
            var pos = arg.indexOf('=');
            if (pos < 0) { log.push('set 缺少 =：' + line); return; }
            var key = arg.slice(0, pos).trim();
            url.searchParams.set(key, arg.slice(pos + 1).trim());
            log.push('设置 ' + key);
          } else if (action === 'del') {
            if (url.searchParams.has(arg.trim())) {
              url.searchParams.delete(arg.trim());
              log.push('删除 ' + arg.trim());
            } else {
              log.push('参数不存在：' + arg.trim());
            }
          } else {
            var pair = arg.split('=');
            if (pair.length !== 2) { log.push('rename 需要 旧=新：' + line); return; }
            var oldKey = pair[0].trim();
            var newKey = pair[1].trim();
            var value = url.searchParams.get(oldKey);
            if (value === null) { log.push('参数不存在：' + oldKey); return; }
            url.searchParams.delete(oldKey);
            url.searchParams.set(newKey, value);
            log.push('重命名 ' + oldKey + ' → ' + newKey);
          }
        });
        var params = [];
        url.searchParams.forEach(function (value, key) { params.push([key, value]); });
        return {
          output: url.href,
          html: K.kv([{ key: '修改后 URL', value: url.href }]) +
            K.table(['参数', '值'], params) +
            '<h4 class="sub-title">操作记录</h4><p class="hint" style="margin:0">' + K.esc(log.join('；') || '无操作') + '</p>',
          note: '共 ' + params.length + ' 个有效参数'
        };
      }
    });
  }

  /* ------------------------------ 5. IPv4 与网段 ------------------------------ */
  function renderIpv4Range(root) {
    K.form(root, {
      uid: 'ipv4range',
      actionLabel: '换算',
      fields: [
        { id: 'mode', label: '输入类型', type: 'select', value: 'ip', options: [
          { value: 'ip', label: 'IP + 掩码 → 网段信息' },
          { value: 'int', label: '整数 → IP' }
        ] },
        { id: 'ip', label: 'IP 地址或整数', type: 'text', value: '192.168.10.37', wide: true },
        { id: 'cidr', label: '掩码前缀（/）', type: 'number', value: 24, min: 0, max: 32, step: 1 }
      ],
      run: function (v) {
        function toInt(ip) {
          var parts = String(ip).trim().split('.');
          if (parts.length !== 4) return null;
          var nums = parts.map(Number);
          if (nums.some(function (n) { return !(n >= 0 && n <= 255) || String(n).indexOf('.') >= 0; })) return null;
          return ((nums[0] << 24) >>> 0) + (nums[1] << 16) + (nums[2] << 8) + nums[3];
        }
        function toIp(value) {
          return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255].join('.');
        }
        if (v.mode === 'int') {
          var num = Number(String(v.ip).trim());
          if (!isFinite(num) || num < 0 || num > 4294967295) return { error: '整数需在 0 – 4294967295 之间' };
          return {
            output: toIp(num),
            rows: [
              { key: 'IP 地址', value: toIp(num) },
              { key: '二进制', value: (num >>> 0).toString(2).padStart(32, '0') },
              { key: '十六进制', value: '0x' + (num >>> 0).toString(16).toUpperCase() }
            ]
          };
        }
        var ipInt = toInt(v.ip);
        if (ipInt === null) return { error: 'IPv4 地址格式不正确' };
        var prefix = Math.max(0, Math.min(32, Math.round(Number(v.cidr))));
        var mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
        var network = (ipInt & mask) >>> 0;
        var broadcast = (network | (~mask >>> 0)) >>> 0;
        var size = Math.pow(2, 32 - prefix);
        var first = prefix >= 31 ? network : network + 1;
        var last = prefix >= 31 ? broadcast : broadcast - 1;
        return {
          rows: [
            { key: 'IP', value: v.ip + ' / ' + prefix },
            { key: '子网掩码', value: toIp(mask) },
            { key: '网络地址', value: toIp(network) },
            { key: '广播地址', value: toIp(broadcast) },
            { key: '可用范围', value: size > 2 ? toIp(first) + ' – ' + toIp(last) : (prefix === 32 ? '单个主机' : '点对点链路') },
            { key: '地址总数', value: K.group(size) },
            { key: '可用主机数', value: size > 2 ? K.group(size - 2) : String(size) },
            { key: '整数范围', value: K.group(network) + ' – ' + K.group(broadcast) }
          ],
          note: '按无类别域间路由（CIDR）计算'
        };
      }
    });
  }

  /* ------------------------------ 6. 生成 Set-Cookie ------------------------------ */
  function renderCookieBuilder(root) {
    K.form(root, {
      uid: 'cookieb',
      actionLabel: '生成 Cookie 头',
      fields: [
        { id: 'name', label: 'Cookie 名称', type: 'text', value: 'sessionid' },
        { id: 'value', label: '值', type: 'text', value: 'abc123' },
        { id: 'domain', label: 'Domain', type: 'text', value: '' },
        { id: 'path', label: 'Path', type: 'text', value: '/' },
        { id: 'maxAge', label: 'Max-Age（秒，0 = 不设置）', type: 'number', value: 86400, min: 0, step: 1 },
        { id: 'sameSite', label: 'SameSite', type: 'select', value: 'Lax', options: [
          { value: 'Lax', label: 'Lax' },
          { value: 'Strict', label: 'Strict' },
          { value: 'None', label: 'None（必须同时 Secure）' }
        ] },
        { id: 'secure', label: 'Secure', type: 'checkbox', value: true },
        { id: 'httpOnly', label: 'HttpOnly', type: 'checkbox', value: true }
      ],
      run: function (v) {
        var name = String(v.name || '').trim();
        if (!/^[!#$%&'*+\-.0-9A-Z^_`a-z|~]+$/.test(name)) return { error: '名称含非法字符' };
        if (v.sameSite === 'None' && !v.secure) return { error: 'SameSite=None 时必须同时设置 Secure' };
        var parts = [name + '=' + String(v.value || '')];
        if (v.domain) parts.push('Domain=' + v.domain);
        if (v.path) parts.push('Path=' + v.path);
        if (Number(v.maxAge) > 0) parts.push('Max-Age=' + Number(v.maxAge));
        parts.push('SameSite=' + v.sameSite);
        if (v.secure) parts.push('Secure');
        if (v.httpOnly) parts.push('HttpOnly');
        var header = 'Set-Cookie: ' + parts.join('; ');
        return {
          output: header,
          html: '<pre class="code-block">' + K.esc(header) + '</pre>' +
            '<div class="btn-row"><button type="button" class="btn ghost" data-copy="' + K.esc(header) + '">复制响应头</button></div>',
          note: Number(v.maxAge) > 0 ? '过期时间约 ' + K.num(Number(v.maxAge) / 86400, 2) + ' 天' : '未设置 Max-Age，属于会话 Cookie'
        };
      }
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['ip-classify'] = renderIpClassify;
  window.ToolModules['ua-parse'] = renderUaParse;
  window.ToolModules['mime-type'] = renderMimeType;
  window.ToolModules['url-query-edit'] = renderUrlQueryEdit;
  window.ToolModules['ipv4-range'] = renderIpv4Range;
  window.ToolModules['cookie-builder'] = renderCookieBuilder;
})();
