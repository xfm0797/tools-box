/* =============================================================================
 * 随机生成工具包（10 个）
 * -----------------------------------------------------------------------------
 * uuid-gen / nanoid-gen / random-string / palette-gen / lottery-pick /
 * dice-roll / coin-flip / team-split / name-gen / random-datetime
 *
 * 所有随机数均来自 crypto.getRandomValues，比 Math.random 更适合生成
 * 标识符、抽奖结果与验证码。
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  function cryptoBytes(length) {
    var bytes = new Uint8Array(length);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    return bytes;
  }

  /** 从字符集里安全地取一个字符 */
  function pickChar(charset) {
    return charset.charAt(K.randomInt(charset.length));
  }

  function randomFromCharset(length, charset) {
    var out = '';
    for (var i = 0; i < length; i += 1) out += pickChar(charset);
    return out;
  }

  /* ------------------------------ UUID ------------------------------ */
  function uuidV4() {
    var bytes = cryptoBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // 版本 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // 变体 RFC 4122
    var hex = Array.prototype.map.call(bytes, function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' +
      hex.slice(16, 20) + '-' + hex.slice(20);
  }

  function renderUuid(root) {
    var uid = K.uid('uuid');
    root.innerHTML =
      '<div class="form-row">' +
        '<div class="form-item"><label class="label" for="' + uid + '-count">生成数量</label>' +
          '<input class="input" type="number" id="' + uid + '-count" value="5" min="1" max="200"></div>' +
        '<div class="form-item"><label class="label">&nbsp;</label>' +
          '<label class="check" style="margin-top:9px"><input type="checkbox" id="' + uid + '-upper"><span>大写字母</span></label></div>' +
        '<div class="form-item"><label class="label">&nbsp;</label>' +
          '<label class="check" style="margin-top:9px"><input type="checkbox" id="' + uid + '-nohyphen"><span>去掉连字符</span></label></div>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="' + uid + '-run">生成 UUID v4</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-copy">复制全部</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-clear">清空</button>' +
      '</div>' +
      '<div class="pw-list" id="' + uid + '-list"></div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      '<p class="hint">UUID v4 含 122 位随机信息，重复概率可忽略不计。可用于数据库主键、请求追踪 ID 等场景。</p>';

    var list = root.querySelector('#' + uid + '-list');
    var statusEl = root.querySelector('#' + uid + '-status');
    var current = [];

    function run() {
      var count = Math.min(Math.max(parseInt(root.querySelector('#' + uid + '-count').value, 10) || 5, 1), 200);
      var upper = root.querySelector('#' + uid + '-upper').checked;
      var noHyphen = root.querySelector('#' + uid + '-nohyphen').checked;
      current = [];
      for (var i = 0; i < count; i += 1) {
        var id = uuidV4();
        if (noHyphen) id = id.replace(/-/g, '');
        if (upper) id = id.toUpperCase();
        current.push(id);
      }
      list.innerHTML = current.map(function (id) {
        return '<div class="pw-item"><span>' + K.esc(id) + '</span>' +
          '<button type="button" class="link-btn" data-copy="' + K.esc(id) + '">复制</button></div>';
      }).join('');
      K.bindCopy(list);
      statusEl.className = 'status ok';
      statusEl.textContent = '已生成 ' + count + ' 个 UUID v4。';
      statusEl.hidden = false;
    }

    root.querySelector('#' + uid + '-run').addEventListener('click', run);
    root.querySelector('#' + uid + '-copy').addEventListener('click', function () {
      window.UI.copyText(current.join('\n'));
    });
    root.querySelector('#' + uid + '-clear').addEventListener('click', function () {
      list.innerHTML = '';
      current = [];
      statusEl.hidden = true;
      window.UI.toast('已清空', 'success');
    });
    run();
  }

  /* ------------------------------ NanoID ------------------------------ */
  function renderNanoid(root) {
    K.form(root, {
      uid: 'nanoid',
      actionLabel: '生成短 ID',
      fields: [
        { id: 'length', label: '长度', type: 'number', value: 21, min: 2, max: 128 },
        { id: 'count', label: '数量', type: 'number', value: 5, min: 1, max: 200 },
        {
          id: 'alphabet', label: '字符集', type: 'select', value: 'default',
          options: [
            { value: 'default', label: '默认（A-Z a-z 0-9 _-）' },
            { value: 'lower', label: '小写 + 数字' },
            { value: 'digits', label: '纯数字' },
            { value: 'nolookalike', label: '去除易混淆字符' }
          ]
        }
      ],
      sample: { length: 12 },
      run: function (values) {
        var length = Math.min(Math.max(parseInt(values.length, 10) || 21, 2), 128);
        var count = Math.min(Math.max(parseInt(values.count, 10) || 5, 1), 200);
        var alphabets = {
          default: 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict',
          lower: 'abcdefghijklmnopqrstuvwxyz0123456789',
          digits: '0123456789',
          nolookalike: 'abcdefghjkmnpqrstuvwxyz23456789'
        };
        var charset = alphabets[values.alphabet] || alphabets.default;
        var ids = [];
        for (var i = 0; i < count; i += 1) ids.push(randomFromCharset(length, charset));

        return {
          html: '<div class="pw-list">' + ids.map(function (id) {
            return '<div class="pw-item"><span>' + K.esc(id) + '</span>' +
              '<button type="button" class="link-btn" data-copy="' + K.esc(id) + '">复制</button></div>';
          }).join('') + '</div>',
          note: '每个 ID 含 ' + length + ' 个字符，字符集大小 ' + charset.length +
            '，组合数约 10^' + Math.round(length * Math.log10(charset.length)) + '。'
        };
      },
      hint: 'NanoID 比 UUID 更短，适合 URL 短链、文件名与前端临时 key。'
    });
  }

  /* ------------------------------ 随机字符串 ------------------------------ */
  function renderRandomString(root) {
    var uid = K.uid('rstr');
    root.innerHTML =
      '<div class="form-row">' +
        '<div class="form-item"><label class="label" for="' + uid + '-len">长度</label>' +
          '<input class="input" type="number" id="' + uid + '-len" value="16" min="1" max="512"></div>' +
        '<div class="form-item"><label class="label" for="' + uid + '-count">数量</label>' +
          '<input class="input" type="number" id="' + uid + '-count" value="1" min="1" max="100"></div>' +
        '<div class="form-item" style="flex:1 1 100%"><label class="label" for="' + uid + '-custom">自定义字符集（可选，填写后忽略下方勾选）</label>' +
          '<input class="input mono" type="text" id="' + uid + '-custom" placeholder="例如 abcdef0123456789"></div>' +
      '</div>' +
      '<div class="check-row">' +
        '<label class="check"><input type="checkbox" id="' + uid + '-upper" checked><span>大写 A-Z</span></label>' +
        '<label class="check"><input type="checkbox" id="' + uid + '-lower" checked><span>小写 a-z</span></label>' +
        '<label class="check"><input type="checkbox" id="' + uid + '-digit" checked><span>数字 0-9</span></label>' +
        '<label class="check"><input type="checkbox" id="' + uid + '-symbol"><span>符号 !@#$%</span></label>' +
        '<label class="check"><input type="checkbox" id="' + uid + '-noambiguous"><span>去除 0O1lI 等易混淆字符</span></label>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="' + uid + '-run">生成</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-copy">复制结果</button>' +
      '</div>' +
      '<div class="field">' +
        '<textarea id="' + uid + '-out" class="textarea mono" rows="6" readonly placeholder="生成结果会显示在这里"></textarea>' +
      '</div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      '<p class="hint">如果用于密码，建议长度 ≥ 12 且至少包含三类字符。这里的随机源为 crypto.getRandomValues。</p>';

    var out = root.querySelector('#' + uid + '-out');
    var statusEl = root.querySelector('#' + uid + '-status');

    function run() {
      var length = Math.min(Math.max(parseInt(root.querySelector('#' + uid + '-len').value, 10) || 16, 1), 512);
      var count = Math.min(Math.max(parseInt(root.querySelector('#' + uid + '-count').value, 10) || 1, 1), 100);
      var custom = root.querySelector('#' + uid + '-custom').value;
      var charset = custom;
      var groups = [];

      if (!custom) {
        if (root.querySelector('#' + uid + '-upper').checked) groups.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
        if (root.querySelector('#' + uid + '-lower').checked) groups.push('abcdefghijklmnopqrstuvwxyz');
        if (root.querySelector('#' + uid + '-digit').checked) groups.push('0123456789');
        if (root.querySelector('#' + uid + '-symbol').checked) groups.push('!@#$%^&*()-_=+[]{};:,.?');
        if (!groups.length) {
          statusEl.className = 'status err';
          statusEl.textContent = '请至少勾选一类字符，或填写自定义字符集。';
          statusEl.hidden = false;
          return;
        }
        charset = groups.join('');
      }

      if (root.querySelector('#' + uid + '-noambiguous').checked) {
        charset = charset.replace(/[0O1lI|`'"]/g, '');
      }
      if (!charset.length) {
        statusEl.className = 'status err';
        statusEl.textContent = '字符集为空，请调整勾选项。';
        statusEl.hidden = false;
        return;
      }

      var results = [];
      for (var i = 0; i < count; i += 1) results.push(randomFromCharset(length, charset));
      out.value = results.join('\n');
      statusEl.className = 'status ok';
      statusEl.textContent = '已生成 ' + count + ' 组，每组 ' + length + ' 个字符，字符集大小 ' + charset.length + '。';
      statusEl.hidden = false;
    }

    root.querySelector('#' + uid + '-run').addEventListener('click', run);
    root.querySelector('#' + uid + '-copy').addEventListener('click', function () { window.UI.copyText(out.value); });
    run();
  }

  /* ------------------------------ 配色方案 ------------------------------ */
  function hexToRgb(hex) {
    var value = hex.replace('#', '');
    if (value.length === 3) value = value.split('').map(function (c) { return c + c; }).join('');
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var h = 0;
    var s = 0;
    var l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    s /= 100; l /= 100;
    function hue(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    var r;
    var g;
    var b;
    if (s === 0) { r = g = b = l; }
    else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue(p, q, h + 1 / 3);
      g = hue(p, q, h);
      b = hue(p, q, h - 1 / 3);
    }
    return '#' + [r, g, b].map(function (v) {
      return ('0' + Math.round(v * 255).toString(16)).slice(-2);
    }).join('').toUpperCase();
  }

  function renderPalette(root) {
    var uid = K.uid('palette');
    root.innerHTML =
      '<div class="form-row">' +
        '<div class="form-item"><label class="label" for="' + uid + '-base">基准色</label>' +
          '<input class="input" type="color" id="' + uid + '-base" value="#5b5bd6" style="height:38px;padding:4px"></div>' +
        '<div class="form-item"><label class="label" for="' + uid + '-mode">配色规则</label>' +
          '<select class="select" id="' + uid + '-mode">' +
            '<option value="analogous" selected>邻近色（和谐）</option>' +
            '<option value="complement">互补色（对比强）</option>' +
            '<option value="triadic">三角配色</option>' +
            '<option value="tetradic">四角配色</option>' +
            '<option value="mono">单色明暗</option>' +
          '</select></div>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="' + uid + '-run">生成配色</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-random">随机换一组</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-copy">复制 CSS 变量</button>' +
      '</div>' +
      '<div class="palette-grid" id="' + uid + '-grid"></div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      '<p class="hint">配色基于 HSL 色轮计算。点击任意色块即可复制色值。</p>';

    var grid = root.querySelector('#' + uid + '-grid');
    var statusEl = root.querySelector('#' + uid + '-status');
    var colors = [];

    function build(baseHex, mode) {
      var rgb = hexToRgb(baseHex);
      var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      var variants;
      if (mode === 'analogous') {
        variants = [[-30, 0], [-15, 0], [0, 0], [15, 0], [30, 0]];
      } else if (mode === 'complement') {
        variants = [[0, 0], [180, 0], [0, 18], [180, -14], [0, -22]];
      } else if (mode === 'triadic') {
        variants = [[0, 0], [120, 0], [240, 0], [0, 20], [0, -20]];
      } else if (mode === 'tetradic') {
        variants = [[0, 0], [90, 0], [180, 0], [270, 0], [0, -20]];
      } else {
        variants = [[0, 28], [0, 14], [0, 0], [0, -14], [0, -28]];
      }

      colors = variants.map(function (pair) {
        var h = hsl.h + pair[0];
        var l = Math.max(8, Math.min(94, hsl.l + pair[1]));
        return hslToHex(h, hsl.s, l);
      });

      grid.innerHTML = colors.map(function (hex) {
        var rgb2 = hexToRgb(hex);
        var lum = (0.299 * rgb2.r + 0.587 * rgb2.g + 0.114 * rgb2.b) / 255;
        return '<button type="button" class="palette-item" data-copy="' + hex + '" ' +
          'style="background:' + hex + ';color:' + (lum > 0.6 ? '#111827' : '#ffffff') + '">' +
          '<span class="palette-hex">' + hex + '</span>' +
          '<span class="palette-rgb">' + rgb2.r + ', ' + rgb2.g + ', ' + rgb2.b + '</span>' +
          '</button>';
      }).join('');

      grid.querySelectorAll('[data-copy]').forEach(function (button) {
        button.addEventListener('click', function () {
          window.UI.copyText(button.getAttribute('data-copy'));
        });
      });
      statusEl.className = 'status ok';
      statusEl.textContent = '已生成 ' + colors.length + ' 色配色方案，点击色块复制。';
      statusEl.hidden = false;
    }

    function run() {
      build(root.querySelector('#' + uid + '-base').value, root.querySelector('#' + uid + '-mode').value);
    }

    root.querySelector('#' + uid + '-run').addEventListener('click', run);
    root.querySelector('#' + uid + '-mode').addEventListener('change', run);
    root.querySelector('#' + uid + '-base').addEventListener('input', run);
    root.querySelector('#' + uid + '-random').addEventListener('click', function () {
      var hex = hslToHex(K.randomInt(360), 55 + K.randomInt(35), 40 + K.randomInt(25));
      root.querySelector('#' + uid + '-base').value = hex;
      run();
    });
    root.querySelector('#' + uid + '-copy').addEventListener('click', function () {
      var css = ':root {\n' + colors.map(function (hex, index) {
        return '  --color-' + (index + 1) + ': ' + hex + ';';
      }).join('\n') + '\n}';
      window.UI.copyText(css, 'CSS 变量已复制');
    });
    run();
  }

  /* ------------------------------ 抽奖 ------------------------------ */
  function renderLottery(root) {
    var uid = K.uid('lottery');
    root.innerHTML =
      '<div class="field">' +
        '<div class="label-row"><label class="label" for="' + uid + '-names">参与名单（每行一个，支持逗号分隔）</label>' +
        '<span class="label-meta" id="' + uid + '-count">0 人</span></div>' +
        '<textarea id="' + uid + '-names" class="textarea" rows="8" placeholder="张三&#10;李四&#10;王五"></textarea>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-item"><label class="label" for="' + uid + '-pick">抽取人数</label>' +
          '<input class="input" type="number" id="' + uid + '-pick" value="3" min="1"></div>' +
        '<div class="form-item"><label class="label">&nbsp;</label>' +
          '<label class="check" style="margin-top:9px"><input type="checkbox" id="' + uid + '-unique" checked><span>中奖者不重复</span></label></div>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="' + uid + '-run">开始抽奖</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-sample">示例名单</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-clear">清空</button>' +
      '</div>' +
      '<div id="' + uid + '-out"></div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      '<p class="hint">使用密码学安全随机源，结果不可预测。名单只在本地处理。</p>';

    var namesEl = root.querySelector('#' + uid + '-names');
    var countEl = root.querySelector('#' + uid + '-count');
    var out = root.querySelector('#' + uid + '-out');
    var statusEl = root.querySelector('#' + uid + '-status');

    function parseNames() {
      return namesEl.value.split(/[\n,，、;；]+/).map(function (name) {
        return name.trim();
      }).filter(Boolean);
    }

    function refreshCount() {
      countEl.textContent = parseNames().length + ' 人';
    }

    function run() {
      var names = parseNames();
      if (names.length < 1) {
        window.UI.toast('请先输入参与名单', 'warn');
        namesEl.focus();
        return;
      }
      var pick = parseInt(root.querySelector('#' + uid + '-pick').value, 10) || 1;
      var unique = root.querySelector('#' + uid + '-unique').checked;

      if (unique && pick > names.length) {
        statusEl.className = 'status err';
        statusEl.textContent = '参与人数只有 ' + names.length + ' 人，无法不重复地抽取 ' + pick + ' 人。';
        statusEl.hidden = false;
        return;
      }

      var pool = names.slice();
      var winners = [];
      for (var i = 0; i < pick; i += 1) {
        if (unique) {
          var index = K.randomInt(pool.length);
          winners.push(pool.splice(index, 1)[0]);
        } else {
          winners.push(names[K.randomInt(names.length)]);
        }
      }

      out.innerHTML = '<div class="winner-grid">' + winners.map(function (name, index) {
        return '<div class="winner"><span class="winner-rank">' + (index + 1) + '</span>' +
          '<span class="winner-name">' + K.esc(name) + '</span></div>';
      }).join('') + '</div>' +
        '<div class="btn-row"><button type="button" class="btn sm" id="' + uid + '-copy">复制中奖名单</button></div>';
      out.querySelector('#' + uid + '-copy').addEventListener('click', function () {
        window.UI.copyText(winners.join('\n'));
      });

      statusEl.className = 'status ok';
      statusEl.textContent = '从 ' + names.length + ' 人中抽取 ' + pick + ' 人，中奖：' + winners.join('、');
      statusEl.hidden = false;
    }

    namesEl.addEventListener('input', refreshCount);
    root.querySelector('#' + uid + '-run').addEventListener('click', run);
    root.querySelector('#' + uid + '-sample').addEventListener('click', function () {
      namesEl.value = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'].join('\n');
      refreshCount();
      run();
    });
    root.querySelector('#' + uid + '-clear').addEventListener('click', function () {
      namesEl.value = '';
      out.innerHTML = '';
      refreshCount();
      statusEl.hidden = true;
      window.UI.toast('已清空', 'success');
    });
    refreshCount();
  }

  /* ------------------------------ 骰子 ------------------------------ */
  function renderDice(root) {
    K.form(root, {
      uid: 'dice',
      actionLabel: '掷骰子',
      fields: [
        { id: 'count', label: '骰子数量', type: 'number', value: 2, min: 1, max: 50 },
        { id: 'sides', label: '面数', type: 'select', value: 6, options: [4, 6, 8, 10, 12, 20, 100] }
      ],
      sample: { count: 3, sides: 6 },
      run: function (values) {
        var count = Math.min(Math.max(parseInt(values.count, 10) || 1, 1), 50);
        var sides = parseInt(values.sides, 10) || 6;
        var results = [];
        var sum = 0;
        for (var i = 0; i < count; i += 1) {
          var value = K.randomInt(sides) + 1;
          results.push(value);
          sum += value;
        }
        var faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        var visual = sides === 6
          ? results.map(function (v) { return '<span class="dice-face">' + faces[v - 1] + '</span>'; }).join('')
          : results.map(function (v) { return '<span class="dice-num">' + v + '</span>'; }).join('');

        return {
          html: '<div class="dice-stage">' + visual + '</div>',
          rows: [
            { key: '骰子数量', value: count + ' 个（d' + sides + '）' },
            { key: '点数', value: results.join(', ') },
            { key: '合计', value: sum },
            { key: '平均', value: K.num(sum / count, 2) },
            { key: '理论期望', value: K.num((sides + 1) / 2 * count, 2) }
          ],
          note: '每次点击都会重新生成，结果由系统安全随机源产生。'
        };
      }
    });
  }

  /* ------------------------------ 抛硬币 ------------------------------ */
  function renderCoin(root) {
    K.form(root, {
      uid: 'coin',
      actionLabel: '抛硬币',
      fields: [
        { id: 'count', label: '次数', type: 'number', value: 10, min: 1, max: 500 }
      ],
      sample: { count: 20 },
      run: function (values) {
        var count = Math.min(Math.max(parseInt(values.count, 10) || 1, 1), 500);
        var heads = 0;
        var sequence = [];
        var maxStreak = 0;
        var streak = 0;
        var last = null;
        for (var i = 0; i < count; i += 1) {
          var isHead = K.randomInt(2) === 0;
          sequence.push(isHead ? '正' : '反');
          if (isHead) heads += 1;
          if (isHead === last) streak += 1;
          else { streak = 1; last = isHead; }
          if (streak > maxStreak) maxStreak = streak;
        }
        return {
          html: '<div class="coin-seq">' + sequence.map(function (ch) {
            return '<span class="coin ' + (ch === '正' ? 'head' : 'tail') + '">' + ch + '</span>';
          }).join('') + '</div>',
          rows: [
            { key: '总次数', value: count },
            { key: '正面', value: heads + ' 次（' + K.num(heads / count * 100, 1) + '%）' },
            { key: '反面', value: (count - heads) + ' 次（' + K.num((count - heads) / count * 100, 1) + '%）' },
            { key: '最长连续', value: maxStreak + ' 次' },
            { key: '结果序列', value: sequence.join(' ') }
          ],
          note: '大数定律下正反比例会趋近 1:1，但单次结果始终是独立的。'
        };
      }
    });
  }

  /* ------------------------------ 随机分组 ------------------------------ */
  function renderTeamSplit(root) {
    var uid = K.uid('team');
    root.innerHTML =
      '<div class="field">' +
        '<div class="label-row"><label class="label" for="' + uid + '-names">成员名单（每行一个）</label>' +
        '<span class="label-meta" id="' + uid + '-count">0 人</span></div>' +
        '<textarea id="' + uid + '-names" class="textarea" rows="8" placeholder="张三&#10;李四&#10;王五"></textarea>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-item"><label class="label" for="' + uid + '-teams">分组数</label>' +
          '<input class="input" type="number" id="' + uid + '-teams" value="2" min="2" max="20"></div>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="' + uid + '-run">随机分组</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-sample">示例名单</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-clear">清空</button>' +
      '</div>' +
      '<div id="' + uid + '-out"></div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      '<p class="hint">先洗牌再轮流分配，各组人数最多相差 1 人。</p>';

    var namesEl = root.querySelector('#' + uid + '-names');
    var countEl = root.querySelector('#' + uid + '-count');
    var out = root.querySelector('#' + uid + '-out');
    var statusEl = root.querySelector('#' + uid + '-status');

    function parseNames() {
      return namesEl.value.split(/[\n,，、;；]+/).map(function (n) { return n.trim(); }).filter(Boolean);
    }

    function run() {
      var names = parseNames();
      if (names.length < 2) {
        window.UI.toast('请至少输入 2 个成员', 'warn');
        return;
      }
      var teamCount = Math.min(Math.max(parseInt(root.querySelector('#' + uid + '-teams').value, 10) || 2, 2), 20);
      if (teamCount > names.length) {
        statusEl.className = 'status err';
        statusEl.textContent = '成员只有 ' + names.length + ' 人，无法分成 ' + teamCount + ' 组。';
        statusEl.hidden = false;
        return;
      }

      var pool = K.shuffle(names.slice());
      var teams = [];
      for (var i = 0; i < teamCount; i += 1) teams.push([]);
      pool.forEach(function (name, index) {
        teams[index % teamCount].push(name);
      });

      out.innerHTML = '<div class="team-grid">' + teams.map(function (members, index) {
        return '<div class="team-card"><div class="team-head">第 ' + (index + 1) + ' 组 · ' + members.length + ' 人</div>' +
          '<ul>' + members.map(function (name) { return '<li>' + K.esc(name) + '</li>'; }).join('') + '</ul></div>';
      }).join('') + '</div>';

      statusEl.className = 'status ok';
      statusEl.textContent = names.length + ' 人已随机分为 ' + teamCount + ' 组。';
      statusEl.hidden = false;
    }

    namesEl.addEventListener('input', function () {
      countEl.textContent = parseNames().length + ' 人';
    });
    root.querySelector('#' + uid + '-run').addEventListener('click', run);
    root.querySelector('#' + uid + '-sample').addEventListener('click', function () {
      namesEl.value = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '郑一', '王二'].join('\n');
      countEl.textContent = '10 人';
      run();
    });
    root.querySelector('#' + uid + '-clear').addEventListener('click', function () {
      namesEl.value = '';
      out.innerHTML = '';
      countEl.textContent = '0 人';
      statusEl.hidden = true;
      window.UI.toast('已清空', 'success');
    });
  }

  /* ------------------------------ 随机姓名 ------------------------------ */
  var SURNAMES = ('王 李 张 刘 陈 杨 黄 赵 吴 周 徐 孙 马 朱 胡 郭 何 高 林 罗 郑 梁 谢 宋 唐 许 韩 冯 邓 曹 ' +
    '彭 曾 肖 田 董 袁 潘 于 蒋 蔡 余 杜 叶 程 苏 魏 吕 丁 任 沈 姚 卢 姜 崔 钟 谭 陆 汪 范 金').split(' ');
  var GIVEN_M = '伟 强 磊 军 洋 勇 杰 涛 明 超 辉 鹏 华 飞 鑫 波 斌 宇 浩 凯 健 俊 帆 帅 岩 峰 晨 阳 博 文'.split(' ');
  var GIVEN_F = '芳 娜 敏 静 丽 娟 艳 婷 雪 琳 欣 悦 佳 怡 萱 涵 琪 思 雨 梦 洁 颖 岚 彤 薇 露 晴 语 菲 曼'.split(' ');

  function renderName(root) {
    K.form(root, {
      uid: 'name',
      actionLabel: '生成姓名',
      fields: [
        { id: 'count', label: '数量', type: 'number', value: 10, min: 1, max: 100 },
        {
          id: 'gender', label: '性别倾向', type: 'select', value: 'any',
          options: [{ value: 'any', label: '随机' }, { value: 'm', label: '男' }, { value: 'f', label: '女' }]
        },
        {
          id: 'length', label: '名字长度', type: 'select', value: '2',
          options: [{ value: '2', label: '两字（单名）' }, { value: '3', label: '三字（双名）' }]
        }
      ],
      sample: { count: 12 },
      run: function (values) {
        var count = Math.min(Math.max(parseInt(values.count, 10) || 10, 1), 100);
        var names = [];
        var used = Object.create(null);
        var guard = 0;
        while (names.length < count && guard < count * 40) {
          guard += 1;
          var surname = K.pick(SURNAMES);
          var pool = values.gender === 'm' ? GIVEN_M : values.gender === 'f' ? GIVEN_F : GIVEN_M.concat(GIVEN_F);
          var given = values.length === '3' ? K.pick(pool) + K.pick(pool) : K.pick(pool);
          var name = surname + given;
          if (used[name]) continue;
          used[name] = true;
          names.push(name);
        }
        return {
          html: '<div class="name-grid">' + names.map(function (name) {
            return '<span class="name-chip">' + K.esc(name) + '</span>';
          }).join('') + '</div>',
          rows: [
            { key: '生成数量', value: names.length + ' 个' },
            { key: '名单', value: names.join('、') }
          ],
          note: '姓名由常见姓氏与常用名字随机组合，仅用于测试数据、小说角色等场景，与真实人物无关。'
        };
      }
    });
  }

  /* ------------------------------ 随机日期 ------------------------------ */
  function renderRandomDate(root) {
    K.form(root, {
      uid: 'rdate',
      actionLabel: '生成日期',
      fields: [
        { id: 'start', label: '起始日期', type: 'date', value: '2020-01-01' },
        { id: 'end', label: '结束日期', type: 'date', value: '2025-12-31' },
        { id: 'count', label: '数量', type: 'number', value: 5, min: 1, max: 100 },
        { id: 'sort', label: '排序', type: 'select', value: 'asc', options: [{ value: 'asc', label: '升序' }, { value: 'none', label: '不排序' }] }
      ],
      sample: { count: 8 },
      run: function (values) {
        var start = new Date(values.start + 'T00:00:00');
        var end = new Date(values.end + 'T23:59:59');
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return { error: '请选择有效的起止日期。' };
        if (start > end) return { error: '起始日期不能晚于结束日期。' };

        var count = Math.min(Math.max(parseInt(values.count, 10) || 5, 1), 100);
        var span = end.getTime() - start.getTime();
        var list = [];
        for (var i = 0; i < count; i += 1) {
          list.push(new Date(start.getTime() + K.randomInt(Math.max(span, 1))));
        }
        if (values.sort === 'asc') list.sort(function (a, b) { return a - b; });

        return {
          html: '<div class="pw-list">' + list.map(function (date) {
            var text = date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).slice(-2) + '-' +
              ('0' + date.getDate()).slice(-2) + ' ' + ('0' + date.getHours()).slice(-2) + ':' +
              ('0' + date.getMinutes()).slice(-2) + ':' + ('0' + date.getSeconds()).slice(-2);
            return '<div class="pw-item"><span>' + text + '</span>' +
              '<button type="button" class="link-btn" data-copy="' + text + '">复制</button></div>';
          }).join('') + '</div>',
          note: '在 ' + values.start + ' 至 ' + values.end + ' 之间随机取 ' + count + ' 个时刻。'
        };
      }
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['uuid-gen'] = renderUuid;
  window.ToolModules['nanoid-gen'] = renderNanoid;
  window.ToolModules['random-string'] = renderRandomString;
  window.ToolModules['palette-gen'] = renderPalette;
  window.ToolModules['lottery-pick'] = renderLottery;
  window.ToolModules['dice-roll'] = renderDice;
  window.ToolModules['coin-flip'] = renderCoin;
  window.ToolModules['team-split'] = renderTeamSplit;
  window.ToolModules['name-gen'] = renderName;
  window.ToolModules['random-datetime'] = renderRandomDate;
})();
