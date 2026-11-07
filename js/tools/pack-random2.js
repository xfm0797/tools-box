/* =============================================================================
 * 随机生成工具包 · 第二批（9 个）
 * -----------------------------------------------------------------------------
 * random-mac       MAC 地址生成
 * random-ip        随机 IP / 网段内 IP
 * random-emoji     随机 emoji
 * random-matrix    随机数表
 * random-pin       PIN / 验证码
 * lottery-numbers  彩票机选
 * random-decision  随机决策
 * card-deal        扑克牌发牌
 * dice-expression  骰子表达式
 *
 * 全部使用 crypto.getRandomValues（经拒绝采样），不使用 Math.random。
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  function randHex(bytes) {
    var arr = new Uint8Array(bytes);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(arr);
    else for (var i = 0; i < bytes; i += 1) arr[i] = Math.floor(Math.random() * 256);
    return Array.prototype.map.call(arr, function (b) { return b.toString(16).padStart(2, '0'); });
  }

  /* ------------------------------ 1. MAC 地址 ------------------------------ */
  function renderMac(root) {
    K.form(root, {
      uid: 'mac',
      actionLabel: '生成',
      fields: [
        { id: 'count', label: '数量', type: 'number', value: 5, min: 1, max: 100 },
        { id: 'prefix', label: 'OUI 前缀（可选）', type: 'text', placeholder: '如 00:1A:2B 或 001A2B' },
        { id: 'sep', label: '分隔符', type: 'select', value: ':',
          options: [{ value: ':', label: '冒号 00:1A:2B' }, { value: '-', label: '短横线 00-1A-2B' }, { value: '.', label: '点分 001a.2b3c' }, { value: '', label: '无分隔 001A2B3C4D5E' }] },
        { id: 'upper', label: '大写字母', type: 'checkbox', value: true },
        { id: 'local', label: '设为本地管理地址', type: 'checkbox' }
      ],
      hint: '生成的地址默认是单播、全局唯一的格式；勾选「本地管理」后第一字节的第二位会置 1，适合虚拟机/容器内部使用。',
      run: function (v) {
        var count = Math.max(1, Math.min(100, Number(v.count) || 1));
        var prefixBytes = [];
        if (v.prefix.trim()) {
          var clean = v.prefix.replace(/[^0-9a-fA-F]/g, '');
          if (clean.length % 2 !== 0 || clean.length > 10) return { error: 'OUI 前缀需要是 2–10 位十六进制' };
          for (var i = 0; i < clean.length; i += 2) prefixBytes.push(clean.slice(i, i + 2));
        }
        var list = [];
        for (var n = 0; n < count; n += 1) {
          var bytes = randHex(6).map(function (b) { return b.toUpperCase(); });
          for (var p = 0; p < prefixBytes.length; p += 1) bytes[p] = prefixBytes[p].toUpperCase();
          var first = parseInt(bytes[0], 16);
          if (v.local) first = (first | 2) & 0xfe; // 本地管理位 = 1，同时保证单播
          else first = first & 0xfe;
          bytes[0] = first.toString(16).padStart(2, '0').toUpperCase();
          var text = v.sep ? bytes.join(v.sep) : bytes.join('');
          if (v.sep === '.') {
            text = bytes.join('').toLowerCase().replace(/(.{4})(?=.)/g, '$1.');
          }
          list.push(v.upper ? text.toUpperCase() : text.toLowerCase());
        }
        return {
          html: '<pre class="code-block">' + K.esc(list.join('\n')) + '</pre>',
          note: '已生成 ' + count + ' 个 MAC 地址'
        };
      }
    });
  }

  /* ------------------------------ 2. 随机 IP ------------------------------ */
  function ipFromInt(n) {
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  }

  function renderRandomIp(root) {
    K.form(root, {
      uid: 'rip',
      actionLabel: '生成',
      fields: [
        { id: 'scope', label: '地址范围', type: 'select', value: '192.168',
          options: [
            { value: '192.168', label: '192.168.0.0/16（家庭局域网）' },
            { value: '10', label: '10.0.0.0/8（私有 A 类）' },
            { value: '172', label: '172.16.0.0/12（私有 B 类）' },
            { value: 'public', label: '公网地址（随机）' },
            { value: 'custom', label: '自定义网段（下方填写）' }
          ] },
        { id: 'cidr', label: '自定义 CIDR（可选）', type: 'text', placeholder: '如 203.0.113.0/24' },
        { id: 'count', label: '数量', type: 'number', value: 8, min: 1, max: 100 }
      ],
      hint: '公网地址只是随机生成，不代表真实可用的主机；用于测试数据填充。',
      run: function (v) {
        var count = Math.max(1, Math.min(100, Number(v.count) || 1));
        var base;
        var mask;
        if (v.scope === 'custom') {
          var m = v.cidr.trim().match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/);
          if (!m) return { error: '请填写形如 203.0.113.0/24 的网段' };
          var parts = m[1].split('.').map(Number);
          if (parts.some(function (p) { return p > 255; })) return { error: 'IP 段不合法' };
          var prefix = Number(m[2]);
          if (prefix > 32) return { error: '前缀长度不能超过 32' };
          mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
          base = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
          base = (base & mask) >>> 0;
        } else if (v.scope === 'public') {
          base = 0x01000000;
          mask = 0;
        } else if (v.scope === '10') {
          base = 0x0a000000;
          mask = 0xff000000;
        } else if (v.scope === '172') {
          base = 0xac100000;
          mask = 0xfff00000;
        } else {
          base = 0xc0a80000;
          mask = 0xffff0000;
        }

        var hostBits = 32 - (mask === 0 ? 0 : Math.log2((mask >>> 0) + 1));
        var size = Math.round(Math.pow(2, hostBits));
        var list = [];
        for (var i = 0; i < count; i += 1) {
          if (mask === 0) {
            // 公网：避开 0/8、10/8、127/8、172.16/12、192.168/16
            var ip;
            do {
              ip = (K.randomInt(0xffffffff) | 0x01000000) >>> 0;
            } while (
              (ip >>> 24) === 10 || (ip >>> 24) === 127 ||
              ((ip >>> 24) === 172 && ((ip >>> 20) & 15) >= 1 && ((ip >>> 20) & 15) <= 31) ||
              ((ip >>> 16) === 0xc0a8)
            );
            list.push(ipFromInt(ip));
            continue;
          }
          var offset = K.randomInt(size);
          list.push(ipFromInt((base + offset) >>> 0));
        }
        return {
          html: '<pre class="code-block">' + K.esc(list.join('\n')) + '</pre>',
          note: '已生成 ' + count + ' 个随机 IP' + (mask ? '（网段内 ' + size.toLocaleString('zh-CN') + ' 个地址）' : '')
        };
      }
    });
  }

  /* ------------------------------ 3. 随机 emoji ------------------------------ */
  var EMOJI = {
    '表情': '😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😙 😋 😛 😜 🤪 😝 🤗 🤭 🤫 🤔 🤐 😐 😑 😶 😏 😒 🙄 😬 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 🤯 🤠 🥳 😎 🤓 🧐 😕 😟 🙁 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿',
    '动物': '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🐛 🦋 🐌 🐞 🐜 🦗 🕷 🦂 🐢 🐍 🦎 🦖 🐙 🦑 🦐 🦞 🦀 🐡 🐠 🐟 🐬 🐳 🦈 🐊 🐅 🐆 🦓 🦍 🐘 🦛 🦒 🐪 🐫 🦘 🐿 🦔',
    '食物': '🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🥑 🥦 🥒 🥬 🥕 🌽 🥔 🍠 🥐 🥯 🍞 🥖 🥨 🧀 🥚 🍳 🥞 🧇 🥓 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🥙 🍜 🍝 🍣 🍤 🍦 🍰 🎂 🍮 🍭 🍫 🍿 🍩 🍪 ☕ 🍵 🧃 🥤 🍺 🍷',
    '活动': '⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉 🎱 🏓 🏸 🥊 🥋 🎯 🎳 🎮 🎲 🧩 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🎻 🎪 🎭 🎟 🎫 🏆 🥇 🥈 🥉 ⚡ 🔥 ✨ 🌟 💫',
    '符号': '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 ☮️ ✌️ 🤞 🤟 🤘 👌 👍 👎 👏 🙌 🫶 💪 🙏 ✨ ⭐ 🌈 ☀️ 🌤 ⛅ 🌧 ⛈ ❄️ ⛄ 🌊 🍀'
  };

  function renderEmoji(root) {
    K.form(root, {
      uid: 'emoji',
      actionLabel: '生成',
      fields: [
        { id: 'count', label: '数量', type: 'number', value: 12, min: 1, max: 200 },
        { id: 'cat', label: '分类', type: 'select', value: 'all',
          options: [
            { value: 'all', label: '全部混合' },
            { value: '表情', label: '表情' },
            { value: '动物', label: '动物' },
            { value: '食物', label: '食物' },
            { value: '活动', label: '活动' },
            { value: '符号', label: '符号' }
          ] },
        { id: 'sep', label: '每行数量', type: 'number', value: 6, min: 1, max: 20 },
        { id: 'unique', label: '不重复', type: 'checkbox', value: true }
      ],
      hint: '用于测试文案、占位内容或给孩子的随机奖励贴纸。',
      run: function (v) {
        var pool = [];
        if (v.cat === 'all') {
          Object.keys(EMOJI).forEach(function (key) { pool = pool.concat(EMOJI[key].split(' ')); });
        } else {
          pool = EMOJI[v.cat].split(' ');
        }
        pool = pool.filter(Boolean);
        var count = Math.max(1, Math.min(200, Number(v.count) || 1));
        var out = [];
        if (v.unique) {
          if (count > pool.length) return { error: '该分类只有 ' + pool.length + ' 个 emoji，请减少数量或关闭「不重复」' };
          out = K.shuffle(pool.slice()).slice(0, count);
        } else {
          for (var i = 0; i < count; i += 1) out.push(K.pick(pool));
        }
        var perLine = Math.max(1, Number(v.sep) || 6);
        var lines = [];
        for (var j = 0; j < out.length; j += perLine) lines.push(out.slice(j, j + perLine).join(' '));
        return {
          html: '<div class="emoji-out">' + lines.map(function (l) { return '<div>' + K.esc(l) + '</div>'; }).join('') + '</div>',
          note: '已生成 ' + count + ' 个 emoji'
        };
      }
    });
  }

  /* ------------------------------ 4. 随机数表 ------------------------------ */
  function renderMatrix(root) {
    K.form(root, {
      uid: 'matrix',
      actionLabel: '生成',
      fields: [
        { id: 'rows', label: '行数', type: 'number', value: 5, min: 1, max: 50 },
        { id: 'cols', label: '列数', type: 'number', value: 8, min: 1, max: 30 },
        { id: 'min', label: '最小值', type: 'number', value: 1 },
        { id: 'max', label: '最大值', type: 'number', value: 100 },
        { id: 'decimals', label: '小数位', type: 'number', value: 0, min: 0, max: 6 },
        { id: 'unique', label: '不重复', type: 'checkbox' }
      ],
      hint: '常用于抽样、测试数据、课堂随机点名等场景。',
      run: function (v) {
        var rows = Math.max(1, Math.min(50, Number(v.rows) || 5));
        var cols = Math.max(1, Math.min(30, Number(v.cols) || 8));
        var min = Number(v.min);
        var max = Number(v.max);
        var decimals = Math.max(0, Math.min(6, Number(v.decimals) || 0));
        if (!isFinite(min) || !isFinite(max)) return { error: '最小值和最大值需要是数字' };
        if (min > max) return { error: '最小值不能大于最大值' };
        var total = rows * cols;
        var seen = {};
        var values = [];
        var attempts = 0;
        var scale = Math.pow(10, decimals);
        var rangeSize = Math.floor((max - min) * scale) + 1;
        if (v.unique && rangeSize < total) {
          return { error: '区间内可取值只有 ' + rangeSize + ' 个，不够填满 ' + total + ' 格' };
        }
        while (values.length < total) {
          attempts += 1;
          if (attempts > total * 200) return { error: '可用取值太少，无法生成不重复的随机数表' };
          var value = (K.randomInt(rangeSize) / scale + min);
          var key = value.toFixed(decimals);
          if (v.unique && seen[key]) continue;
          seen[key] = true;
          values.push(value);
        }
        var table = [];
        for (var r = 0; r < rows; r += 1) {
          var line = [];
          for (var c = 0; c < cols; c += 1) line.push(values[r * cols + c].toFixed(decimals));
          table.push(line);
        }
        return {
          html: K.table(Array.from({ length: cols }, function (_, i) { return 'C' + (i + 1); }), table),
          note: '已生成 ' + rows + ' × ' + cols + ' 随机数表（区间 ' + min + ' ~ ' + max + '）'
        };
      }
    });
  }

  /* ------------------------------ 5. PIN / 验证码 ------------------------------ */
  function renderPin(root) {
    K.form(root, {
      uid: 'pin',
      actionLabel: '生成',
      fields: [
        { id: 'length', label: '长度', type: 'number', value: 6, min: 3, max: 32 },
        { id: 'count', label: '数量', type: 'number', value: 5, min: 1, max: 100 },
        { id: 'charset', label: '字符集', type: 'select', value: 'digit',
          options: [
            { value: 'digit', label: '纯数字' },
            { value: 'digit-nz', label: '数字（不含 0）' },
            { value: 'alnum', label: '字母 + 数字' },
            { value: 'alnum-safe', label: '字母数字（排除易混 0O1lI）' }
          ] },
        { id: 'group', label: '每 3 位加空格', type: 'checkbox' }
      ],
      hint: '使用安全随机源生成，适合临时密码、邀请码、短信验证码测试。',
      run: function (v) {
        var length = Math.max(3, Math.min(32, Number(v.length) || 6));
        var count = Math.max(1, Math.min(100, Number(v.count) || 1));
        var sets = {
          digit: '0123456789',
          'digit-nz': '123456789',
          alnum: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
          'alnum-safe': '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz'
        };
        var chars = sets[v.charset] || sets.digit;
        var list = [];
        for (var i = 0; i < count; i += 1) {
          var code = '';
          for (var j = 0; j < length; j += 1) code += chars[K.randomInt(chars.length)];
          if (v.group) code = code.replace(/(.{3})(?=.)/g, '$1 ');
          list.push(code);
        }
        return {
          html: '<pre class="code-block pin-list">' + K.esc(list.join('\n')) + '</pre>',
          note: '已生成 ' + count + ' 个 ' + length + ' 位验证码'
        };
      }
    });
  }

  /* ------------------------------ 6. 彩票机选 ------------------------------ */
  function pickUnique(min, max, count) {
    var pool = [];
    for (var i = min; i <= max; i += 1) pool.push(i);
    return K.shuffle(pool).slice(0, count).sort(function (a, b) { return a - b; });
  }

  function renderLottery(root) {
    K.form(root, {
      uid: 'lottery',
      actionLabel: '机选',
      fields: [
        { id: 'type', label: '玩法', type: 'select', value: 'ssq',
          options: [{ value: 'ssq', label: '双色球（6 红 + 1 蓝）' }, { value: 'dlt', label: '大乐透（5 前区 + 2 后区）' }] },
        { id: 'count', label: '注数', type: 'number', value: 5, min: 1, max: 20 }
      ],
      hint: '仅供娱乐，不构成任何购彩建议。每注号码均为独立随机生成，不与历史开奖关联。',
      run: function (v) {
        var count = Math.max(1, Math.min(20, Number(v.count) || 1));
        var rows = [];
        for (var i = 0; i < count; i += 1) {
          if (v.type === 'dlt') {
            var front = pickUnique(1, 35, 5);
            var back = pickUnique(1, 12, 2);
            rows.push([
              i + 1,
              front.map(function (n) { return '<span class="ball ball-red">' + pad2(n) + '</span>'; }).join(''),
              back.map(function (n) { return '<span class="ball ball-blue">' + pad2(n) + '</span>'; }).join('')
            ].map(function (cell, idx) {
              return idx === 0 ? cell : { html: cell };
            }));
          } else {
            var red = pickUnique(1, 33, 6);
            var blue = pickUnique(1, 16, 1);
            rows.push([
              i + 1,
              { html: red.map(function (n) { return '<span class="ball ball-red">' + pad2(n) + '</span>'; }).join('') },
              { html: blue.map(function (n) { return '<span class="ball ball-blue">' + pad2(n) + '</span>'; }).join('') }
            ]);
          }
        }
        var headers = v.type === 'dlt' ? ['注', '前区（5）', '后区（2）'] : ['注', '红球（6）', '蓝球（1）'];
        return {
          html: K.table(headers, rows),
          note: '已机选 ' + count + ' 注，祝好运（仅供娱乐）'
        };
      }
    });

    function pad2(n) { return String(n).padStart(2, '0'); }
  }

  /* ------------------------------ 7. 随机决策 ------------------------------ */
  function renderDecision(root) {
    var uid = 'dec';
    root.innerHTML =
      '<div class="field"><div class="label-row"><label class="label" for="' + uid + '-opts">候选项（每行一个）</label>' +
        '<span class="label-meta" id="' + uid + '-count">0 项</span></div>' +
        '<textarea class="textarea" id="' + uid + '-opts" rows="6" spellcheck="false">今天吃什么？\n火锅\n日料\n烧烤\n在家做饭</textarea></div>' +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="' + uid + '-run">帮我决定</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-clear">清空</button>' +
      '</div>' +
      '<div id="' + uid + '-out"></div>' +
      '<p class="hint">第一行会被当作「问题」，其余每行是一个选项；只写一行时全部按选项处理。至少需要 2 个选项。</p>';

    var opts = root.querySelector('#' + uid + '-opts');
    var countEl = root.querySelector('#' + uid + '-count');
    var out = root.querySelector('#' + uid + '-out');

    function read() {
      var lines = opts.value.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
      var question = '';
      var items = lines;
      if (lines.length > 2 && /[？?]$/.test(lines[0])) {
        question = lines[0];
        items = lines.slice(1);
      }
      return { question: question, items: items };
    }

    function refreshCount() {
      countEl.textContent = read().items.length + ' 项';
    }

    function run() {
      var data = read();
      if (data.items.length < 2) {
        window.UI.toast('请至少填写两个选项', 'warn');
        opts.focus();
        return;
      }
      var winner = K.pick(data.items);
      out.innerHTML = (data.question ? '<p class="hint" style="text-align:center">' + K.esc(data.question) + '</p>' : '') +
        '<div class="big-result" style="text-align:center">' + K.esc(winner) + '</div>' +
        '<p class="hint" style="text-align:center">从 ' + data.items.length + ' 个选项中随机选出</p>';
    }

    root.querySelector('#' + uid + '-run').addEventListener('click', run);
    root.querySelector('#' + uid + '-clear').addEventListener('click', function () {
      opts.value = '';
      out.innerHTML = '';
      refreshCount();
      window.UI.toast('已清空', 'success');
    });
    opts.addEventListener('input', refreshCount);
    refreshCount();
  }

  /* ------------------------------ 8. 扑克牌发牌 ------------------------------ */
  var SUITS = [
    { key: 'spade', symbol: '♠', color: 'black' },
    { key: 'heart', symbol: '♥', color: 'red' },
    { key: 'club', symbol: '♣', color: 'black' },
    { key: 'diamond', symbol: '♦', color: 'red' }
  ];
  var RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

  function renderCardDeal(root) {
    K.form(root, {
      uid: 'deal',
      actionLabel: '发牌',
      fields: [
        { id: 'players', label: '玩家数', type: 'number', value: 4, min: 1, max: 8 },
        { id: 'each', label: '每人张数', type: 'number', value: 5, min: 1, max: 13 },
        { id: 'joker', label: '加入大小王', type: 'checkbox' },
        { id: 'sort', label: '按点数排序', type: 'checkbox', value: true }
      ],
      hint: '一副牌 52 张（含王 54 张），不会重复发同一张牌。',
      run: function (v) {
        var players = Math.max(1, Math.min(8, Number(v.players) || 1));
        var each = Math.max(1, Math.min(13, Number(v.each) || 1));
        var deck = [];
        SUITS.forEach(function (suit) {
          RANKS.forEach(function (rank, idx) {
            deck.push({ rank: rank, value: idx + 2, suit: suit });
          });
        });
        if (v.joker) {
          deck.push({ rank: '小王', value: 15, suit: { symbol: '🃏', color: 'black' } });
          deck.push({ rank: '大王', value: 16, suit: { symbol: '🃏', color: 'red' } });
        }
        if (players * each > deck.length) {
          return { error: '牌不够：需要 ' + players * each + ' 张，一副牌只有 ' + deck.length + ' 张' };
        }
        K.shuffle(deck);
        var hands = [];
        for (var p = 0; p < players; p += 1) {
          var hand = deck.slice(p * each, p * each + each);
          if (v.sort) hand.sort(function (a, b) { return b.value - a.value; });
          hands.push(hand);
        }
        var html = '<div class="card-hands">' + hands.map(function (hand, i) {
          return '<div class="card-hand"><span class="card-hand-title">玩家 ' + (i + 1) + '</span>' +
            '<span class="card-row">' + hand.map(function (card) {
              var red = card.suit.color === 'red';
              if (card.rank === '小王' || card.rank === '大王') {
                return '<span class="pcard ' + (red ? 'red' : '') + '">' + card.rank + '</span>';
              }
              return '<span class="pcard ' + (red ? 'red' : '') + '">' + card.suit.symbol + card.rank + '</span>';
            }).join('') + '</span></div>';
        }).join('') + '</div>';
        return { html: html, note: '已发 ' + players + ' 家，每家 ' + each + ' 张，剩余 ' + (deck.length - players * each) + ' 张' };
      }
    });
  }

  /* ------------------------------ 9. 骰子表达式 ------------------------------ */
  function renderDice(root) {
    K.form(root, {
      uid: 'dice',
      actionLabel: '投掷',
      fields: [
        { id: 'expr', label: '骰子表达式', type: 'text', value: '2d6+3', wide: true },
        { id: 'times', label: '投掷次数', type: 'number', value: 1, min: 1, max: 50 }
      ],
      hint: '格式：NdM+K 或 NdM-K，例如 2d6+3、4d8、1d20-2；也支持直接写 d6（等同 1d6）。',
      run: function (v) {
        var m = v.expr.trim().match(/^(\d*)d(\d+)\s*([+-]\s*\d+)?$/i);
        if (!m) return { error: '表达式格式不正确，应为 NdM+K' };
        var count = m[1] ? Number(m[1]) : 1;
        var sides = Number(m[2]);
        var modifier = m[3] ? Number(m[3].replace(/\s+/g, '')) : 0;
        if (count < 1 || count > 100) return { error: '骰子数量需在 1–100 之间' };
        if (sides < 2 || sides > 1000) return { error: '骰子面数需在 2–1000 之间' };
        var times = Math.max(1, Math.min(50, Number(v.times) || 1));

        var rows = [];
        var totals = [];
        for (var t = 0; t < times; t += 1) {
          var rolls = [];
          var sum = 0;
          for (var i = 0; i < count; i += 1) {
            var r = K.randomInt(sides) + 1;
            rolls.push(r);
            sum += r;
          }
          var total = sum + modifier;
          totals.push(total);
          rows.push([
            t + 1,
            rolls.join(' + ') + (modifier ? (modifier > 0 ? ' + ' : ' − ') + Math.abs(modifier) : ''),
            total
          ]);
        }
        var modText = modifier ? (modifier > 0 ? '+' + modifier : String(modifier)) : '';
        return {
          html: '<div class="big-result">' + totals[0] + '</div>' + K.table(['#', '骰子明细', '合计'], rows),
          rows: [
            { key: '表达式', value: count + 'd' + sides + modText },
            { key: '理论范围', value: (count + modifier) + ' ~ ' + (count * sides + modifier) },
            { key: '本次合计', value: totals.join('、') },
            { key: '平均', value: (totals.reduce(function (a, b) { return a + b; }, 0) / totals.length).toFixed(2) }
          ],
          note: '投掷 ' + times + ' 次，每次 ' + count + ' 个 ' + sides + ' 面骰'
        };
      }
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['random-mac'] = renderMac;
  window.ToolModules['random-ip'] = renderRandomIp;
  window.ToolModules['random-emoji'] = renderEmoji;
  window.ToolModules['random-matrix'] = renderMatrix;
  window.ToolModules['random-pin'] = renderPin;
  window.ToolModules['lottery-numbers'] = renderLottery;
  window.ToolModules['random-decision'] = renderDecision;
  window.ToolModules['card-deal'] = renderCardDeal;
  window.ToolModules['dice-expression'] = renderDice;
})();
