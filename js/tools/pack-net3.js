/* =============================================================================
 * 网络工具包 · 第三批（10 个）
 * -----------------------------------------------------------------------------
 * ip-range-list    CIDR 展开
 * ipv6-subnet      IPv6 子网计算
 * dns-records      DNS 记录速查
 * email-validate   邮箱校验
 * phone-validate   手机号校验
 * hosts-gen        hosts 记录生成
 * cors-cheatsheet  CORS 速查
 * rest-cheatsheet  REST 方法速查
 * mailto-builder   mailto 链接生成
 * wifi-qr          WiFi 二维码文本
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  function ipToInt(ip) {
    var parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(function (p) { return isNaN(p) || p < 0 || p > 255; })) return null;
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  }
  function intToIp(n) {
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  }

  /* ------------------------------ 1. CIDR 展开 ------------------------------ */
  function renderIpRangeList(root) {
    K.form(root, {
      uid: 'iprange',
      actionLabel: '展开',
      fields: [
        { id: 'cidr', label: '网段（CIDR）', type: 'text', value: '192.168.1.0/28' },
        { id: 'list', label: '展开为 IP 清单', type: 'checkbox', value: true },
        { id: 'withGateway', label: '标注网络 / 广播地址', type: 'checkbox', value: true }
      ],
      hint: '最多展开 65536 个地址；更大的网段只给出范围与总数。',
      run: function (v) {
        var m = v.cidr.trim().match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/);
        if (!m) return { error: '请填写形如 192.168.1.0/28 的网段' };
        var base = ipToInt(m[1]);
        var prefix = Number(m[2]);
        if (base === null) return { error: 'IP 地址不合法' };
        if (prefix > 32) return { error: '前缀长度不能超过 32' };
        var mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
        var network = (base & mask) >>> 0;
        var size = Math.pow(2, 32 - prefix);
        var first = prefix >= 31 ? network : network + 1;
        var last = prefix >= 31 ? network + size - 1 : network + size - 2;
        var rows = [
          { key: '网络地址', value: intToIp(network) + '/' + prefix },
          { key: '掩码', value: intToIp(mask) },
          { key: '地址总数', value: K.group(size) },
          { key: '可用主机', value: prefix >= 31 ? (prefix === 32 ? '1（/32 单地址）' : '2（/31 点对点）') : K.group(size - 2) },
          { key: '首个可用', value: intToIp(first) },
          { key: '最后可用', value: intToIp(last) }
        ];
        var html = '';
        if (v.list) {
          if (size > 65536) html = '<p class="hint">网段太大（' + K.group(size) + ' 个地址），跳过逐条展开。</p>';
          else {
            var ips = [];
            for (var i = 0; i < size; i += 1) {
              var ip = intToIp(network + i);
              var tag = '';
              if (v.withGateway && i === 0) tag = '（网络地址）';
              if (v.withGateway && i === size - 1) tag = '（广播地址）';
              ips.push(ip + tag);
            }
            html = '<pre class="code-block">' + K.esc(ips.join('\n')) + '</pre>' +
              '<div class="btn-row"><button type="button" class="btn ghost" data-copy="' + K.esc(ips.join('\n')) + '">复制清单</button></div>';
          }
        }
        return { output: '', html: html, rows: rows, note: '展开完成' };
      }
    });
  }

  /* ------------------------------ 2. IPv6 子网计算 ------------------------------ */
  function expandIpv6(addr) {
    var head = addr;
    var tailBits = BigInt(0);
    var embeddedV4 = '';
    var v4Match = addr.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
    if (v4Match) {
      embeddedV4 = v4Match[2];
      head = v4Match[1];
      var v4parts = embeddedV4.split('.').map(Number);
      var v4int = BigInt(((v4parts[0] << 8) | v4parts[1]) * 65536 + ((v4parts[2] << 8) | v4parts[3]));
      tailBits = v4int;
      head += '0:0';
    }
    if (head.includes('::')) {
      var sides = head.split('::');
      var left = sides[0] ? sides[0].split(':').filter(Boolean) : [];
      var right = sides[1] !== undefined ? (sides[1] ? sides[1].split(':').filter(Boolean) : []) : [];
      var missing = 8 - left.length - right.length;
      if (missing < 0) throw new Error(':: 只能出现一次且组数不能超过 8');
      var middle = [];
      for (var i = 0; i < missing; i += 1) middle.push('0');
      head = left.concat(middle, right).join(':');
    }
    var groups = head.split(':').filter(Boolean);
    if (groups.length !== 8) throw new Error('IPv6 需要 8 组十六进制');
    var big = BigInt(0);
    groups.forEach(function (g) {
      if (!/^[0-9a-fA-F]{1,4}$/.test(g)) throw new Error('非法十六进制组：' + g);
      big = (big << 16n) + BigInt(parseInt(g, 16));
    });
    if (embeddedV4) big = (big << 32n) + tailBits;
    return big;
  }

  function bigintToIpv6(n) {
    var groups = [];
    for (var i = 7; i >= 0; i -= 1) {
      var g = Number((n >> BigInt(i * 16)) & 0xffffn);
      groups.push(g.toString(16));
    }
    return groups.join(':');
  }

  function renderIpv6Subnet(root) {
    K.form(root, {
      uid: 'v6subnet',
      actionLabel: '计算',
      fields: [
        { id: 'cidr', label: 'IPv6 网段（CIDR）', type: 'text', value: '2001:db8::/48' }
      ],
      hint: '支持缩写形式与内嵌 IPv4（::ffff:1.2.3.4）；总数按 BigInt 计算，不会溢出。',
      run: function (v) {
        var m = v.cidr.trim().match(/^(.+?)\/(\d{1,3})$/);
        if (!m) return { error: '请填写形如 2001:db8::/48 的网段' };
        var prefix = Number(m[2]);
        if (prefix > 128) return { error: '前缀长度不能超过 128' };
        var addr;
        try { addr = expandIpv6(m[1]); }
        catch (e) { return { error: e.message }; }
        var hostBits = 128 - prefix;
        // BigInt 可以精确表示 2^128，无需哨兵值
        var mask = (0xffffffffffffffffffffffffffffffffn << BigInt(hostBits)) & 0xffffffffffffffffffffffffffffffffn;
        var network = addr & mask;
        var size = 1n << BigInt(hostBits);
        var last = network + size - 1n;
        return {
          rows: [
            { key: '网络地址（展开）', value: bigintToIpv6(network) },
            { key: '前缀长度', value: '/' + prefix },
            { key: '主机位', value: hostBits + ' 位' },
            { key: '地址总数', value: hostBits >= 64 ? '2^' + hostBits + '（超大）' : size.toString() },
            { key: '首个地址', value: bigintToIpv6(network) },
            { key: '最后一个地址', value: bigintToIpv6(last) },
            { key: '掩码（展开）', value: bigintToIpv6(mask) }
          ],
          note: '常见前缀：/64 主机网段、/48 站点、/32 运营商'
        };
      }
    });
  }

  /* ------------------------------ 3. DNS 记录速查 ------------------------------ */
  var DNS_RECORDS = [
    ['A', '域名 → IPv4 地址', 'example.com. 3600 IN A 93.184.216.34', '最常用；TTL 建议生产 300–3600'],
    ['AAAA', '域名 → IPv6 地址', 'example.com. 3600 IN AAAA 2606:2800:220:1:248:1893:25c8:1946', 'IPv6 环境必备'],
    ['CNAME', '域名 → 另一个域名（别名）', 'www.example.com. 3600 IN CNAME example.com.', '不能与 A/AAAA 同名共存；不能用在区域顶点'],
    ['MX', '邮件交换服务器', 'example.com. 3600 IN MX 10 mail.example.com.', '数字越小优先级越高'],
    ['TXT', '任意文本（SPF / DKIM / 域名验证）', 'example.com. 3600 IN TXT "v=spf1 include:_spf.example.com ~all"', '一条记录 255 字符上限，长串拆分拼接'],
    ['NS', '权威域名服务器', 'example.com. 86400 IN NS ns1.example.com.', '注册商处修改；传播可达 48h'],
    ['SOA', '区域权威起始记录', 'example.com. IN SOA ns1 admin ( 2024010101 7200 3600 1209600 3600 )', '每区域必须一条；含序列号与刷新参数'],
    ['SRV', '服务定位（端口 + 主机）', '_sip._tcp.example.com. 3600 IN SRV 10 60 5060 sip.example.com.', 'VoIP / XMPP / 部分即时通讯用'],
    ['CAA', '允许签发证书的 CA', 'example.com. 3600 IN CAA 0 issue "letsencrypt.org"', '防止被错误 CA 签发证书'],
    ['PTR', 'IP → 域名（反向解析）', '34.216.184.93.in-addr.arpa. 3600 IN PTR example.com.', '发邮件服务器需要，减少进垃圾箱概率']
  ];

  function renderDnsRecords(root) {
    K.form(root, {
      uid: 'dnsrecords',
      actionLabel: '搜索',
      fields: [
        { id: 'q', label: '关键词', type: 'text', value: '', placeholder: '如 MX、CNAME、SPF' }
      ],
      hint: '记录名 / 用途 / 示例三个维度同时匹配；速查表不发起真实 DNS 查询。',
      run: function (v) {
        var q = (v.q || '').trim().toLowerCase();
        var rows = DNS_RECORDS.filter(function (r) {
          return !q || r.join(' ').toLowerCase().includes(q);
        });
        if (!rows.length) return { error: '没有匹配的记录类型' };
        return {
          hideOutputNote: true,
          html: K.table(['类型', '用途', '示例', '备注'], rows.map(function (r) {
            return [r[0], r[1], r[2], r[3]];
          })),
          note: '匹配到 ' + rows.length + ' 种记录类型'
        };
      }
    });
  }

  /* ------------------------------ 4. 邮箱校验 ------------------------------ */
  var TYPO_MAP = { 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gnail.com': 'gmail.com', 'hotmail.co': 'hotmail.com', 'outlok.com': 'outlook.com', 'qq.con': 'qq.com', '163.con': '163.com' };
  var COMMON_DOMAINS = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'qq.com', '163.com', '126.com', 'foxmail.com', 'icloud.com'];

  function renderEmailValidate(root) {
    K.form(root, {
      uid: 'emailvalidate',
      actionLabel: '校验',
      fields: [
        { id: 'emails', label: '邮箱（每行一个，支持批量）', type: 'textarea', rows: 6, wide: true,
          value: 'user@example.com\n张三@qq.com\ntest..name@gmail.com\nbad@server\nx@gmial.com' }
      ],
      hint: '按 RFC 5322 简化规则校验（本地部分 + @ + 域名），并对常见拼写错误给出纠正建议。',
      run: function (v) {
        var lines = v.emails.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!lines.length) return { error: '请输入至少一个邮箱' };
        var re = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;
        var results = lines.map(function (email) {
          var valid = re.test(email) && email.length <= 254;
          var tip = '';
          if (!valid) {
            if (email.indexOf('@') < 0) tip = '缺少 @';
            else if (/\.\./.test(email)) tip = '存在连续两个点';
            else if (/^\./.test(email.split('@')[0]) || /\.$/.test(email.split('@')[0])) tip = '本地部分不能以点开头或结尾';
            else tip = '格式不合法';
          } else {
            var domain = email.split('@')[1].toLowerCase();
            if (TYPO_MAP[domain]) tip = '⚠️ 可能想写 ' + TYPO_MAP[domain];
            else if (COMMON_DOMAINS.indexOf(domain) >= 0) tip = '常见域名';
          }
          return [email, valid ? '✅ 通过' : '❌ 不通过', tip || '—'];
        });
        var ok = results.filter(function (r) { return r[1].indexOf('✅') === 0; }).length;
        return {
          hideOutputNote: true,
          html: K.table(['邮箱', '结果', '说明'], results),
          note: '通过 ' + ok + ' / ' + results.length
        };
      }
    });
  }

  /* ------------------------------ 5. 手机号校验 ------------------------------ */
  var CARRIER_PREFIX = [
    ['13[0-9]', '中国移动'], ['145', '中国联通（数据卡）'], ['146', '中国联通'],
    ['147', '中国移动'], ['148', '中国虚拟运营商'], ['149', '中国联通'],
    ['15[0-3,5-9]', '中国移动 / 联通'], ['162', '中国虚拟运营商'], ['165', '中国联通'],
    ['166', '中国联通'], ['167', '中国虚拟运营商'], ['170', '中国虚拟运营商'],
    ['171', '中国虚拟运营商'], ['172', '中国电信'], ['173', '中国电信'],
    ['175', '中国电信'], ['176', '中国联通'], ['177', '中国电信'],
    ['178', '中国移动'], ['18[0-9]', '移动 / 联通 / 电信'], ['19[0-1,3,5,8,9]', '移动 / 电信 / 广电']
  ];

  function renderPhoneValidate(root) {
    K.form(root, {
      uid: 'phonevalidate',
      actionLabel: '校验',
      fields: [
        { id: 'phones', label: '手机号（每行一个，可带 +86 / 空格 / 短横线）', type: 'textarea', rows: 6, wide: true,
          value: '13800138000\n+86 186 1234 5678\n12345678901\n10086' }
      ],
      hint: '按中国大陆 11 位号段规则校验并推测运营商；不查询真实归属地。',
      run: function (v) {
        var lines = v.phones.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!lines.length) return { error: '请输入至少一个号码' };
        var re = /^(?:\+?86)?1\d{10}$/;
        var results = lines.map(function (phone) {
          var cleaned = phone.replace(/[\s-]/g, '');
          var valid = re.test(cleaned) && /^1[3-9]\d{9}$/.test(cleaned.replace(/^\+?86/, ''));
          var carrier = '—';
          if (valid) {
            var num = cleaned.replace(/^\+?86/, '');
            var match = CARRIER_PREFIX.find(function (c) {
              var re2 = new RegExp('^' + c[0].replace(',', '') );
              return re2.test(num);
            });
            carrier = match ? match[1] : '号段待更新';
          }
          return [phone, valid ? '✅ 有效' : '❌ 无效', carrier, cleaned];
        });
        return {
          hideOutputNote: true,
          html: K.table(['输入', '结果', '推测运营商', '规范化'], results),
          note: '虚拟运营商号段（16x / 17x 部分）归属可能不准'
        };
      }
    });
  }

  /* ------------------------------ 6. hosts 生成 ------------------------------ */
  function renderHostsGen(root) {
    K.form(root, {
      uid: 'hostsgen',
      actionLabel: '生成',
      fields: [
        { id: 'ip', label: '统一指向 IP（可选）', type: 'text', value: '127.0.0.1', placeholder: '留空则每行自带 IP' },
        { id: 'domains', label: '域名列表（每行一个；或「IP 域名」格式）', type: 'textarea', rows: 6, wide: true, mono: true,
          value: 'dev.example.com\napi.example.com\n127.0.0.1 legacy.example.com\n# 这是注释' },
        { id: 'header', label: '生成注释头', type: 'checkbox', value: true }
      ],
      hint: '生成内容粘贴到系统 hosts 文件：Windows C:\\Windows\\System32\\drivers\\etc\\hosts，macOS/Linux /etc/hosts，需管理员权限。',
      run: function (v) {
        var lines = v.domains.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!lines.length) return { error: '请输入域名' };
        var defaultIp = v.ip.trim();
        var out = [];
        if (v.header) {
          out.push('# Generated by 工具大全 · ' + new Date().toLocaleDateString('zh-CN'));
          out.push('# 删除以下条目即可恢复默认解析');
          out.push('');
        }
        lines.forEach(function (line) {
          if (line.startsWith('#')) { out.push(line); return; }
          if (/^\d{1,3}(\.\d{1,3}){3}\s+\S/.test(line)) { out.push(line); return; }
          if (!defaultIp) return; // 没有统一 IP 且行内没有 IP：跳过
          out.push(defaultIp + '\t' + line);
        });
        if (!out.some(function (l) { return l && !l.startsWith('#'); })) {
          return { error: '没有生成任何条目：要么统一填 IP，要么在行内写「IP 域名」' };
        }
        var text = out.join('\n');
        return {
          output: text,
          html: '<pre class="code-block">' + K.esc(text) + '</pre>',
          note: '共 ' + out.filter(function (l) { return l && !l.startsWith('#'); }).length + ' 条解析记录'
        };
      }
    });
  }

  /* ------------------------------ 7. CORS 速查 ------------------------------ */
  var CORS_ROWS = [
    ['Access-Control-Allow-Origin', '响应头', 'Access-Control-Allow-Origin: https://app.example.com', '允许哪些来源；* 不能与 credentials 同用'],
    ['Access-Control-Allow-Methods', '响应头（预检）', 'Access-Control-Allow-Methods: GET, POST, PUT, DELETE', '预检时告知允许的方法'],
    ['Access-Control-Allow-Headers', '响应头（预检）', 'Access-Control-Allow-Headers: Content-Type, Authorization', '允许前端携带的自定义头'],
    ['Access-Control-Allow-Credentials', '响应头', 'Access-Control-Allow-Credentials: true', '允许携带 Cookie；此时 Origin 必须是具体值'],
    ['Access-Control-Max-Age', '响应头（预检）', 'Access-Control-Max-Age: 86400', '预检结果缓存秒数，减少 OPTIONS 请求'],
    ['Access-Control-Expose-Headers', '响应头', 'Access-Control-Expose-Headers: X-Request-Id', '让前端能读到自定义响应头'],
    ['Access-Control-Request-Method', '请求头（预检）', 'OPTIONS 请求自动携带', '前端无需手动设置'],
    ['Origin', '请求头', 'Origin: https://app.example.com', '浏览器自动带；工具请求可能没有'],
    ['Vary: Origin', '响应头', 'Vary: Origin', 'Origin 动态返回时必须加，防止 CDN 缓存串包'],
    ['常见坑：405 OPTIONS', '排查', 'Nginx 拦截了预检请求', '网关要显式放行 OPTIONS 方法'],
    ['常见坑：Cookie 带不上', '排查', 'fetch 需 credentials: include，且后端不能返回 *', '三处配置缺一不可'],
    ['常见坑：重定向丢头', '排查', '302 后的响应没有 CORS 头', '直接在最终地址做 CORS']
  ];

  function renderCorsCheatsheet(root) {
    K.form(root, {
      uid: 'corscheat',
      actionLabel: '搜索',
      fields: [
        { id: 'q', label: '关键词', type: 'text', value: '', placeholder: '如 credentials、OPTIONS、预检' }
      ],
      hint: '覆盖常用头与三大高频坑；预检（OPTIONS）只在「非简单请求」时触发。',
      run: function (v) {
        var q = (v.q || '').trim().toLowerCase();
        var rows = CORS_ROWS.filter(function (r) {
          return !q || r.join(' ').toLowerCase().includes(q);
        });
        if (!rows.length) return { error: '没有匹配内容' };
        return {
          hideOutputNote: true,
          html: K.table(['条目', '类别', '示例 / 说明'], rows.map(function (r) {
            return [r[0], r[1], r[2] + (r[3] ? '\n💡 ' + r[3] : '')];
          })),
          note: '匹配到 ' + rows.length + ' 条'
        };
      }
    });
  }

  /* ------------------------------ 8. REST 方法速查 ------------------------------ */
  var REST_ROWS = [
    ['GET', '读取资源', '✅ 幂等', '✅ 安全', '✅ 可缓存', '/users/42', '浏览器直接输入就是 GET'],
    ['POST', '创建资源 / 触发动作', '❌ 不幂等', '❌ 不安全', '⚠️ 视情况', '/users', '重复提交可能重复建资源，前端要防抖'],
    ['PUT', '整体替换资源', '✅ 幂等', '❌ 不安全', '❌', '/users/42', '不带全部字段会把没传的清掉'],
    ['PATCH', '部分更新资源', '⚠️ 通常幂等', '❌ 不安全', '❌', '/users/42', '只传需要改的字段'],
    ['DELETE', '删除资源', '✅ 幂等', '❌ 不安全', '❌', '/users/42', '删除后重复删结果一样（404 或 204）'],
    ['HEAD', '只要响应头', '✅ 幂等', '✅ 安全', '✅ 可缓存', '/files/report.pdf', '探测文件大小与是否存在'],
    ['OPTIONS', '询问支持的方法 / 预检', '✅ 幂等', '✅ 安全', '⚠️', '*', 'CORS 预检就是自动发的 OPTIONS']
  ];

  function renderRestCheatsheet(root) {
    K.form(root, {
      uid: 'restcheat',
      actionLabel: '搜索',
      fields: [
        { id: 'q', label: '关键词', type: 'text', value: '', placeholder: '如 PUT、幂等、缓存' }
      ],
      hint: '「安全」= 不修改资源状态；「幂等」= 重复调用结果相同。两者都满足才适合重试。',
      run: function (v) {
        var q = (v.q || '').trim().toLowerCase();
        var rows = REST_ROWS.filter(function (r) {
          return !q || r.join(' ').toLowerCase().includes(q);
        });
        if (!rows.length) return { error: '没有匹配的方法' };
        return {
          hideOutputNote: true,
          html: K.table(['方法', '语义', '幂等', '安全', '缓存', '示例路径', '注意'], rows.map(function (r) {
            return [r[0], r[1], r[2], r[3], r[4], r[5], r[6]];
          })),
          note: '匹配到 ' + rows.length + ' 个方法'
        };
      }
    });
  }

  /* ------------------------------ 9. mailto 链接生成 ------------------------------ */
  function renderMailtoBuilder(root) {
    K.form(root, {
      uid: 'mailtobuilder',
      actionLabel: '生成链接',
      fields: [
        { id: 'to', label: '收件人', type: 'text', value: 'hello@example.com' },
        { id: 'cc', label: '抄送（逗号分隔）', type: 'text', value: '' },
        { id: 'subject', label: '主题', type: 'text', value: '合作咨询' },
        { id: 'body', label: '正文', type: 'textarea', rows: 4, wide: true, value: '你好，\n\n我想了解贵司的产品。' }
      ],
      hint: '生成的链接可放在网页「联系我们」按钮上，点击直接唤起本地邮件客户端。',
      run: function (v) {
        if (!v.to.trim()) return { error: '至少填写一个收件人' };
        var params = [];
        if (v.cc.trim()) params.push('cc=' + encodeURIComponent(v.cc.trim()));
        if (v.subject.trim()) params.push('subject=' + encodeURIComponent(v.subject));
        if (v.body.trim()) params.push('body=' + encodeURIComponent(v.body));
        var link = 'mailto:' + v.to.trim() + (params.length ? '?' + params.join('&') : '');
        return {
          output: link,
          html: '<div class="big-result" style="word-break:break-all">' + K.esc(link) + '</div>' +
            '<div class="btn-row"><button type="button" class="btn ghost" data-copy="' + K.esc(link) + '">复制链接</button>' +
            '<a class="btn ghost" href="' + K.esc(link) + '">测试打开</a></div>',
          note: '主题与正文已做 URL 编码，中文安全'
        };
      }
    });
  }

  /* ------------------------------ 10. WiFi 二维码文本 ------------------------------ */
  function renderWifiQr(root) {
    K.form(root, {
      uid: 'wifiqr',
      actionLabel: '生成字符串',
      fields: [
        { id: 'ssid', label: 'WiFi 名称（SSID）', type: 'text', value: 'MyHome-WiFi' },
        { id: 'password', label: '密码', type: 'text', value: '12345678' },
        { id: 'encryption', label: '加密方式', type: 'select', value: 'WPA',
          options: [{ value: 'WPA', label: 'WPA / WPA2 / WPA3' }, { value: 'WEP', label: 'WEP（老旧）' }, { value: 'nopass', label: '无密码' }] },
        { id: 'hidden', label: '隐藏网络', type: 'checkbox' }
      ],
      hint: '把生成的字符串粘贴到「二维码生成」工具即可得到扫码连 WiFi 的二维码；特殊字符 \ ; , " : 需转义（已自动处理）。',
      run: function (v) {
        var ssid = v.ssid.trim();
        if (!ssid) return { error: '请填写 WiFi 名称' };
        function esc(text) {
          return text.replace(/([\\;,:"])/g, '\\$1');
        }
        var enc = v.encryption;
        if (enc === 'nopass') {
          return {
            output: 'WIFI:T:nopass;S:' + esc(ssid) + ';' + (v.hidden ? 'H:true;' : '') + ';',
            note: '无密码网络'
          };
        }
        if (!v.password) return { error: '该加密方式需要密码' };
        var text = 'WIFI:T:' + enc + ';S:' + esc(ssid) + ';P:' + esc(v.password) + ';' + (v.hidden ? 'H:true;' : '') + ';';
        return {
          output: text,
          html: '<pre class="code-block">' + K.esc(text) + '</pre>' +
            '<div class="btn-row"><button type="button" class="btn ghost" data-copy="' + K.esc(text) + '">复制字符串</button>' +
            '<a class="btn ghost" href="#/tool/qr">去二维码生成 →</a></div>',
          note: ' guests 扫码即可自动连接，改密码后需重新生成'
        };
      }
    });
  }

  window.ToolModules['ip-range-list'] = renderIpRangeList;
  window.ToolModules['ipv6-subnet'] = renderIpv6Subnet;
  window.ToolModules['dns-records'] = renderDnsRecords;
  window.ToolModules['email-validate'] = renderEmailValidate;
  window.ToolModules['phone-validate'] = renderPhoneValidate;
  window.ToolModules['hosts-gen'] = renderHostsGen;
  window.ToolModules['cors-cheatsheet'] = renderCorsCheatsheet;
  window.ToolModules['rest-cheatsheet'] = renderRestCheatsheet;
  window.ToolModules['mailto-builder'] = renderMailtoBuilder;
  window.ToolModules['wifi-qr'] = renderWifiQr;
})();
