/* =============================================================================
 * 网络工具包 · 第二批（7 个）
 * -----------------------------------------------------------------------------
 * ipv6-format      IPv6 展开 / 压缩
 * ip-in-subnet     判断 IP 是否属于某网段
 * cidr-split       网段拆分
 * mac-format       MAC 地址格式转换
 * basic-auth       Basic Auth 头生成 / 解析
 * url-normalize    URL 规范化与去跟踪参数
 * id-card-validate 身份证校验
 *
 * 全部离线计算，不发起任何网络请求。
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  /* ------------------------------ 1. IPv6 格式化 ------------------------------ */
  function parseIPv6(input) {
    var s = String(input).trim().toLowerCase();
    if (!s || /[^0-9a-f:.]/.test(s)) return null;
    var firstDouble = s.indexOf('::');
    if (firstDouble >= 0 && s.indexOf('::', firstDouble + 1) >= 0) return null;

    var head = s;
    var tailText = '';
    if (firstDouble >= 0) {
      head = s.slice(0, firstDouble);
      tailText = s.slice(firstDouble + 2);
    }

    function toGroups(part) {
      if (!part) return [];
      var arr = part.split(':');
      var out = [];
      for (var i = 0; i < arr.length; i += 1) {
        var group = arr[i];
        if (!group) return null;
        if (group.indexOf('.') >= 0) {
          if (i !== arr.length - 1) return null;
          var v4 = group.split('.').map(Number);
          if (v4.length !== 4 || v4.some(function (x) { return !isFinite(x) || x < 0 || x > 255; })) return null;
          out.push(((v4[0] << 8) | v4[1]).toString(16));
          out.push(((v4[2] << 8) | v4[3]).toString(16));
        } else {
          if (!/^[0-9a-f]{1,4}$/.test(group)) return null;
          out.push(parseInt(group, 16).toString(16));
        }
      }
      return out;
    }

    var headGroups = toGroups(head);
    var tailGroups = toGroups(tailText);
    if (!headGroups || !tailGroups) return null;

    if (firstDouble < 0) {
      if (headGroups.length !== 8) return null;
      return headGroups;
    }
    var total = headGroups.length + tailGroups.length;
    if (total > 7) return null;
    var fill = [];
    for (var i = 0; i < 8 - total; i += 1) fill.push('0');
    return headGroups.concat(fill, tailGroups);
  }

  function compressIPv6(groups) {
    var bestStart = -1;
    var bestLen = 0;
    var start = -1;
    var len = 0;
    for (var i = 0; i < 8; i += 1) {
      if (groups[i] === '0') {
        if (start < 0) { start = i; len = 0; }
        len += 1;
        if (len > bestLen) { bestLen = len; bestStart = start; }
      } else {
        start = -1;
        len = 0;
      }
    }
    var text;
    if (bestLen < 2) {
      text = groups.map(function (g) { return g; }).join(':');
    } else {
      var left = groups.slice(0, bestStart).join(':');
      var right = groups.slice(bestStart + bestLen).join(':');
      text = left + '::' + right;
    }
    return text;
  }

  function ipv6Type(groups) {
    var first = parseInt(groups[0], 16);
    if (groups.every(function (g) { return g === '0'; })) return '未指定地址（::）';
    if (groups.slice(0, 7).every(function (g) { return g === '0'; }) && groups[7] === '1') return '回环地址（::1）';
    if (groups.slice(0, 5).every(function (g) { return g === '0'; }) && groups[5] === 'ffff') return 'IPv4 映射地址';
    if ((first & 0xffc0) === 0xfe80) return '链路本地地址（fe80::/10）';
    if ((first & 0xfe00) === 0xfc00) return '唯一本地地址（fc00::/7）';
    if ((first & 0xff00) === 0xff00) return '组播地址（ff00::/8）';
    if ((first & 0xe000) === 0x2000) return '全球单播地址（2000::/3）';
    return '其他类型';
  }

  function renderIpv6(root) {
    K.form(root, {
      uid: 'ipv6',
      actionLabel: '格式化',
      fields: [
        { id: 'addr', label: 'IPv6 地址', type: 'text', value: '2001:db8::1', wide: true },
        { id: 'mode', label: '方向', type: 'select', value: 'auto',
          options: [{ value: 'auto', label: '自动（同时输出展开与压缩）' }, { value: 'expand', label: '只输出完整形式' }, { value: 'compress', label: '只输出压缩形式' }] }
      ],
      hint: '支持 :: 压缩、内嵌 IPv4（如 ::ffff:192.168.1.1）与大小写混写。',
      run: function (v) {
        var groups = parseIPv6(v.addr);
        if (!groups) return { error: '不是合法的 IPv6 地址' };
        var full = groups.map(function (g) { return g.padStart(4, '0'); }).join(':');
        var compressed = compressIPv6(groups);
        var rows = [
          { key: '完整形式', value: full },
          { key: '压缩形式', value: compressed },
          { key: '分组数量', value: groups.length + ' 组' },
          { key: '地址类型', value: ipv6Type(groups) }
        ];
        if (groups.slice(0, 5).every(function (g) { return g === '0'; }) && groups[5] === 'ffff') {
          var high = parseInt(groups[6], 16);
          var low = parseInt(groups[7], 16);
          rows.push({ key: 'IPv4 形式', value: [(high >> 8) & 255, high & 255, (low >> 8) & 255, low & 255].join('.') });
        }
        if (v.mode === 'auto' || v.mode === 'compress') rows.unshift({ key: '结果', value: compressed });
        if (v.mode === 'expand') rows.unshift({ key: '结果', value: full });
        return { rows: rows, note: '地址类型：' + ipv6Type(groups) };
      }
    });
  }

  /* ------------------------------ 2. IP 是否在网段内 ------------------------------ */
  function ipv4ToInt(ip) {
    var parts = String(ip).trim().split('.');
    if (parts.length !== 4) return null;
    var value = 0;
    for (var i = 0; i < 4; i += 1) {
      if (!/^\d{1,3}$/.test(parts[i])) return null;
      var n = Number(parts[i]);
      if (n > 255) return null;
      value = (value * 256) + n;
    }
    return value >>> 0;
  }

  function intToIpv4(value) {
    return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255].join('.');
  }

  function parseCidr(text) {
    var m = String(text).trim().match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/);
    if (!m) return null;
    var ip = ipv4ToInt(m[1]);
    var prefix = Number(m[2]);
    if (ip === null || prefix > 32) return null;
    var mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    var network = (ip & mask) >>> 0;
    var broadcast = (network | (~mask >>> 0)) >>> 0;
    return { ip: ip, prefix: prefix, mask: mask, network: network, broadcast: broadcast };
  }

  function renderIpInSubnet(root) {
    K.form(root, {
      uid: 'ipsub',
      actionLabel: '判断',
      fields: [
        { id: 'ip', label: 'IP 地址', type: 'text', value: '192.168.1.77' },
        { id: 'cidr', label: '网段（CIDR）', type: 'text', value: '192.168.1.0/24' }
      ],
      hint: '按位与运算判断归属，同时给出网络地址、广播地址与可用主机范围。',
      run: function (v) {
        var ip = ipv4ToInt(v.ip);
        if (ip === null) return { error: 'IP 地址不合法' };
        var cidr = parseCidr(v.cidr);
        if (!cidr) return { error: '网段格式应为 192.168.1.0/24' };
        var inside = ((ip & cidr.mask) >>> 0) === cidr.network;
        var hostCount = cidr.prefix >= 31 ? (cidr.prefix === 31 ? 2 : 1) : Math.pow(2, 32 - cidr.prefix) - 2;
        return {
          html: '<div class="big-result">' + (inside ? '在网段内' : '不在网段内') + '</div>',
          rows: [
            { key: '查询 IP', value: v.ip.trim() },
            { key: '所属网段', value: intToIpv4(ip & cidr.mask) + '/' + cidr.prefix },
            { key: '网络地址', value: intToIpv4(cidr.network) },
            { key: '广播地址', value: intToIpv4(cidr.broadcast) },
            { key: '子网掩码', value: intToIpv4(cidr.mask) },
            { key: '可用主机数', value: hostCount + ' 个' },
            { key: '主机范围', value: cidr.prefix >= 31 ? intToIpv4(cidr.network) + ' ~ ' + intToIpv4(cidr.broadcast) : intToIpv4(cidr.network + 1) + ' ~ ' + intToIpv4(cidr.broadcast - 1) }
          ],
          note: inside ? '该 IP 属于 ' + intToIpv4(cidr.network) + '/' + cidr.prefix : '该 IP 不属于目标网段'
        };
      }
    });
  }

  /* ------------------------------ 3. 网段拆分 ------------------------------ */
  function renderCidrSplit(root) {
    K.form(root, {
      uid: 'cidrsplit',
      actionLabel: '拆分',
      fields: [
        { id: 'cidr', label: '原始网段', type: 'text', value: '192.168.0.0/24', wide: true },
        { id: 'prefix', label: '拆分后的前缀长度', type: 'number', value: 26, min: 1, max: 32 }
      ],
      hint: '新前缀必须大于原前缀；单次最多列出 256 个子网。',
      run: function (v) {
        var cidr = parseCidr(v.cidr);
        if (!cidr) return { error: '网段格式应为 192.168.0.0/24' };
        var newPrefix = Number(v.prefix);
        if (!newPrefix || newPrefix <= cidr.prefix) return { error: '新前缀需要大于 ' + cidr.prefix };
        if (newPrefix > 32) return { error: '前缀不能超过 32' };
        var count = Math.pow(2, newPrefix - cidr.prefix);
        if (count > 256) return { error: '会拆分出 ' + count + ' 个子网，超过 256 个上限' };
        var size = Math.pow(2, 32 - newPrefix);

        var rows = [];
        for (var i = 0; i < count; i += 1) {
          var network = (cidr.network + i * size) >>> 0;
          var broadcast = (network + size - 1) >>> 0;
          rows.push([
            (i + 1),
            intToIpv4(network) + '/' + newPrefix,
            intToIpv4(network),
            intToIpv4(broadcast),
            newPrefix >= 31 ? size : size - 2
          ]);
        }
        return {
          html: K.table(['#', '子网', '网络地址', '广播地址', '可用主机'], rows, { maxHeight: '420px' }),
          note: '已将 ' + v.cidr + ' 拆分为 ' + count + ' 个 /' + newPrefix + ' 子网'
        };
      }
    });
  }

  /* ------------------------------ 4. MAC 地址格式 ------------------------------ */
  function renderMacFormat(root) {
    K.form(root, {
      uid: 'macfmt',
      actionLabel: '转换',
      fields: [{ id: 'mac', label: 'MAC 地址', type: 'text', value: '00-1A-2B-3C-4D-5E', wide: true }],
      hint: '接受冒号、短横线、点分（Cisco）或无分隔写法。',
      run: function (v) {
        var clean = String(v.mac).replace(/[^0-9a-fA-F]/g, '');
        if (clean.length !== 12) return { error: 'MAC 地址需要包含 12 位十六进制字符' };
        var bytes = [];
        for (var i = 0; i < 12; i += 2) bytes.push(clean.slice(i, i + 2).toUpperCase());
        var first = parseInt(bytes[0], 16);
        var patterns = {
          '冒号（小写）': bytes.join(':').toLowerCase(),
          '短横线（大写）': bytes.join('-'),
          '点分（Cisco）': bytes.join('').toLowerCase().replace(/(.{4})(?=.)/g, '$1.'),
          '无分隔': bytes.join(''),
          'Windows 样式': bytes.join('-')
        };
        var rows = Object.keys(patterns).map(function (key) {
          return { key: key, value: patterns[key] };
        });
        rows.push({ key: '第一字节二进制', value: parseInt(bytes[0], 16).toString(2).padStart(8, '0') });
        rows.push({ key: '地址类型', value: (first & 1) ? '组播 / 广播' : '单播' });
        rows.push({ key: '管理方式', value: (first & 2) ? '本地管理（虚拟网卡常见）' : '全球唯一（厂商 OUI）' });
        return { rows: rows, note: (first & 1) ? '组播地址' : '单播地址' };
      }
    });
  }

  /* ------------------------------ 5. Basic Auth ------------------------------ */
  function b64EncodeUtf8(text) {
    var bytes = new TextEncoder().encode(text);
    var binary = '';
    for (var i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  function b64DecodeUtf8(text) {
    var binary = atob(text);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function renderBasicAuth(root) {
    K.form(root, {
      uid: 'basic',
      actionLabel: '转换',
      fields: [
        { id: 'mode', label: '方向', type: 'select', value: 'encode',
          options: [{ value: 'encode', label: '账号密码 → Authorization 头' }, { value: 'decode', label: 'Authorization 头 → 账号密码' }] },
        { id: 'user', label: '用户名', type: 'text', value: 'admin' },
        { id: 'pass', label: '密码', type: 'text', value: '123456' },
        { id: 'header', label: 'Authorization 头（解码时使用）', type: 'text', wide: true, placeholder: 'Basic YWRtaW46MTIzNDU2' }
      ],
      hint: 'Basic Auth 只是 Base64（可逆），必须配合 HTTPS 使用，不能当作加密。',
      run: function (v) {
        if (v.mode === 'encode') {
          if (!v.user) return { error: '请填写用户名' };
          var token = b64EncodeUtf8(v.user + ':' + v.pass);
          return {
            html: '<pre class="code-block">Authorization: Basic ' + K.esc(token) + '</pre>',
            rows: [
              { key: 'Base64 值', value: token },
              { key: '明文组合', value: v.user + ':' + v.pass },
              { key: '头部长度', value: ('Authorization: Basic ' + token).length + ' 字符' }
            ],
            note: '已生成 Basic 认证头'
          };
        }
        var raw = v.header.trim().replace(/^Authorization:\s*/i, '').replace(/^Basic\s+/i, '');
        if (!raw) return { error: '请粘贴 Authorization 头或 Base64 值' };
        var decoded;
        try {
          decoded = b64DecodeUtf8(raw);
        } catch (e) {
          return { error: 'Base64 解码失败，请检查内容' };
        }
        var idx = decoded.indexOf(':');
        if (idx < 0) return { error: '解码结果缺少冒号，可能不是 Basic 认证' };
        return {
          html: '<div class="big-result">' + K.esc(decoded.slice(0, idx)) + '</div>',
          rows: [
            { key: '用户名', value: decoded.slice(0, idx) },
            { key: '密码', value: decoded.slice(idx + 1) },
            { key: '完整明文', value: decoded }
          ],
          note: '解码成功'
        };
      }
    });
  }

  /* ------------------------------ 6. URL 规范化 ------------------------------ */
  var TRACKING_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
    'fbclid', 'gclid', 'yclid', 'msclkid', 'spm', 'scm', 'from', 'share_token', 'ref', 'referrer'];

  function renderUrlNormalize(root) {
    K.form(root, {
      uid: 'urlnorm',
      actionLabel: '规范化',
      fields: [{ id: 'url', label: 'URL', type: 'text', wide: true,
        value: 'HTTPS://Example.COM:443/Path/Page?utm_source=weixin&b=2&a=1#section' }],
      hint: '常见于分享链接清洗、SEO 去重与日志归一化。',
      run: function (v) {
        var url;
        try {
          url = new URL(v.url.trim());
        } catch (e) {
          return { error: 'URL 格式不正确（需要包含协议，如 https://）' };
        }
        var removed = [];
        url.searchParams.forEach(function (value, key) {
          if (TRACKING_KEYS.indexOf(key.toLowerCase()) >= 0) removed.push(key);
        });
        removed.forEach(function (key) { url.searchParams.delete(key); });

        // 参数排序
        var entries = [];
        url.searchParams.forEach(function (value, key) { entries.push([key, value]); });
        entries.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
        var sorted = new URLSearchParams();
        entries.forEach(function (pair) { sorted.append(pair[0], pair[1]); });
        url.search = sorted.toString();

        if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) {
          url.port = '';
        }
        url.hash = '';

        var before = v.url.trim();
        var after = url.toString();
        var rows = [
          { key: '规范化结果', value: after },
          { key: '协议', value: url.protocol.replace(':', '') },
          { key: '主机', value: url.hostname },
          { key: '路径', value: url.pathname },
          { key: '参数个数', value: entries.length + ' 个' }
        ];
        if (removed.length) rows.push({ key: '已移除跟踪参数', value: removed.join(', ') });
        return {
          html: '<pre class="code-block">' + K.esc(after) + '</pre>',
          rows: rows,
          note: '已清理 ' + removed.length + ' 个跟踪参数，参数已按字母排序'
        };
      }
    });
  }

  /* ------------------------------ 7. 身份证校验 ------------------------------ */
  var PROVINCES = {
    '11': '北京', '12': '天津', '13': '河北', '14': '山西', '15': '内蒙古',
    '21': '辽宁', '22': '吉林', '23': '黑龙江', '31': '上海', '32': '江苏',
    '33': '浙江', '34': '安徽', '35': '福建', '36': '江西', '37': '山东',
    '41': '河南', '42': '湖北', '43': '湖南', '44': '广东', '45': '广西',
    '46': '海南', '50': '重庆', '51': '四川', '52': '贵州', '53': '云南',
    '54': '西藏', '61': '陕西', '62': '甘肃', '63': '青海', '64': '宁夏',
    '65': '新疆', '71': '台湾', '81': '香港', '82': '澳门', '91': '国外'
  };
  var ID_WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  var ID_CHECK = '10X98765432';

  function idCheckCode(first17) {
    var sum = 0;
    for (var i = 0; i < 17; i += 1) sum += Number(first17[i]) * ID_WEIGHTS[i];
    return ID_CHECK[sum % 11];
  }

  function renderIdCard(root) {
    K.form(root, {
      uid: 'idcard',
      actionLabel: '校验',
      fields: [{ id: 'id', label: '身份证号（15 或 18 位）', type: 'text', value: '11010519491231002X', wide: true }],
      hint: '仅校验位数、出生日期与校验码，不联网核验，也不代表证件真实有效。15 位号码可升级为 18 位。',
      run: function (v) {
        var id = String(v.id).trim().toUpperCase().replace(/\s+/g, '');
        var rows = [];
        if (/^\d{15}$/.test(id)) {
          var upgraded = id.slice(0, 6) + '19' + id.slice(6);
          upgraded += idCheckCode(upgraded);
          return {
            html: '<div class="big-result">' + upgraded + '</div>',
            rows: [
              { key: '原号码', value: id },
              { key: '升级结果', value: upgraded },
              { key: '说明', value: '15 位号码补全年份并追加校验码' }
            ],
            note: '已升级为 18 位号码'
          };
        }
        if (!/^\d{17}[\dX]$/.test(id)) return { error: '身份证号应为 18 位（末位可为 X）或 15 位' };

        var province = PROVINCES[id.slice(0, 2)];
        if (!province) rows.push({ key: '地区码', value: '未知（' + id.slice(0, 2) + '）' });

        var year = Number(id.slice(6, 10));
        var month = Number(id.slice(10, 12));
        var day = Number(id.slice(12, 14));
        var birth = new Date(year, month - 1, day);
        var dateOk = birth.getFullYear() === year && birth.getMonth() === month - 1 && birth.getDate() === day;
        var age = null;
        if (dateOk) {
          var now = new Date();
          age = now.getFullYear() - year;
          if (now.getMonth() < month - 1 || (now.getMonth() === month - 1 && now.getDate() < day)) age -= 1;
        }

        var expected = idCheckCode(id.slice(0, 17));
        var checkOk = expected === id[17];
        var gender = Number(id[16]) % 2 === 1 ? '男' : '女';

        rows.push({ key: '校验结果', value: checkOk ? '校验通过' : '校验失败（应为 ' + expected + '）' });
        rows.push({ key: '出生日期', value: dateOk ? year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0') : '日期不合法' });
        if (dateOk) rows.push({ key: '年龄', value: age + ' 岁' });
        rows.push({ key: '性别', value: gender });
        rows.push({ key: '省份', value: province || '未知' });
        rows.push({ key: '顺序码', value: id.slice(14, 17) });
        rows.push({ key: '校验码', value: id[17] });

        var valid = checkOk && dateOk;
        return {
          html: '<div class="big-result">' + (valid ? '校验通过' : '校验未通过') + '</div>',
          rows: rows,
          note: valid ? '格式与校验码均正确' : '请检查号码是否输入有误',
          type: valid ? 'ok' : 'warn'
        };
      }
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['ipv6-format'] = renderIpv6;
  window.ToolModules['ip-in-subnet'] = renderIpInSubnet;
  window.ToolModules['cidr-split'] = renderCidrSplit;
  window.ToolModules['mac-format'] = renderMacFormat;
  window.ToolModules['basic-auth'] = renderBasicAuth;
  window.ToolModules['url-normalize'] = renderUrlNormalize;
  window.ToolModules['id-card-validate'] = renderIdCard;
})();
