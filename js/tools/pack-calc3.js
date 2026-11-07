/* =============================================================================
 * 计算换算工具包 · 第三批（14 个）
 * -----------------------------------------------------------------------------
 * circle-calc    圆与立体几何
 * pythagoras     勾股定理
 * bitwise        位运算计算器
 * log-calc       对数计算
 * trig-calc      三角函数
 * combinatorics  排列组合
 * pace-calc      跑步配速
 * dpi-calc       屏幕像素密度
 * aspect-ratio   宽高比
 * hourly-rate    时薪换算
 * pet-age        宠物年龄
 * data-transfer  下载时间计算
 * vat-calc       增值税
 * resistor-color 电阻色环
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  function money(n) {
    return '¥' + K.group(Math.round(n * 100) / 100);
  }

  /* ------------------------------ 1. 圆与立体几何 ------------------------------ */
  function renderCircleCalc(root) {
    K.form(root, {
      uid: 'circlecalc',
      actionLabel: '计算',
      fields: [
        { id: 'radius', label: '半径 / 底面半径', type: 'number', value: 5, min: 0.0001, step: 'any' },
        { id: 'height', label: '高（柱体 / 锥体用）', type: 'number', value: 10, min: 0, step: 'any' }
      ],
      hint: '输入半径即可得到圆与常见立体的全部几何量；高为 0 时立体量为 0。',
      run: function (v) {
        var r = Number(v.radius);
        var h = Number(v.height);
        if (!(r > 0)) return { error: '半径必须大于 0' };
        if (h < 0) return { error: '高度不能为负数' };
        var PI = Math.PI;
        return {
          rows: [
            { key: '圆周长', value: K.num(2 * PI * r, 4) },
            { key: '圆面积', value: K.num(PI * r * r, 4) },
            { key: '直径', value: K.num(2 * r, 4) },
            { key: '球表面积 4πr²', value: K.num(4 * PI * r * r, 4) },
            { key: '球体积 4πr³/3', value: K.num(4 / 3 * PI * Math.pow(r, 3), 4) },
            { key: '圆柱侧面积 2πrh', value: K.num(2 * PI * r * h, 4) },
            { key: '圆柱体积 πr²h', value: K.num(PI * r * r * h, 4) },
            { key: '圆锥体积 πr²h/3', value: K.num(PI * r * r * h / 3, 4) },
            { key: '外接立方体边长', value: K.num(2 * r / Math.sqrt(3), 4) }
          ],
          note: 'π 取 ' + PI
        };
      }
    });
  }

  /* ------------------------------ 2. 勾股定理 ------------------------------ */
  function renderPythagoras(root) {
    K.form(root, {
      uid: 'pythagoras',
      actionLabel: '求解',
      fields: [
        { id: 'mode', label: '已知条件', type: 'select', value: 'legs',
          options: [{ value: 'legs', label: '已知两条直角边 a、b' }, { value: 'hyp', label: '已知斜边 c 与一条直角边' }] },
        { id: 'a', label: '直角边 a', type: 'number', value: 3, min: 0, step: 'any' },
        { id: 'b', label: '直角边 b', type: 'number', value: 4, min: 0, step: 'any' },
        { id: 'c', label: '斜边 c', type: 'number', value: 5, min: 0, step: 'any' }
      ],
      hint: 'a² + b² = c²。已知斜边与一条直角边时自动校验能否构成直角三角形。',
      run: function (v) {
        var a = Number(v.a);
        var b = Number(v.b);
        var c = Number(v.c);
        if (v.mode === 'legs') {
          if (!(a > 0) || !(b > 0)) return { error: '两条直角边都要大于 0' };
          var hyp = Math.sqrt(a * a + b * b);
          return {
            rows: [
              { key: '斜边 c', value: K.num(hyp, 6) },
              { key: '面积', value: K.num(a * b / 2, 6) },
              { key: '锐角 A（对边 a）', value: K.num(Math.atan2(a, b) * 180 / Math.PI, 3) + '°' },
              { key: '锐角 B（对边 b）', value: K.num(Math.atan2(b, a) * 180 / Math.PI, 3) + '°' }
            ],
            note: 'a=' + a + '、b=' + b + ' → c² = ' + (a * a + b * b)
          };
        }
        if (!(c > 0) || !(a > 0)) return { error: '斜边与直角边都要大于 0' };
        if (c <= a) return { error: '斜边必须大于直角边' };
        var leg = Math.sqrt(c * c - a * a);
        return {
          rows: [
            { key: '另一条直角边 b', value: K.num(leg, 6) },
            { key: '面积', value: K.num(a * leg / 2, 6) },
            { key: '锐角 A（对边 a）', value: K.num(Math.asin(a / c) * 180 / Math.PI, 3) + '°' }
          ],
          note: 'c² − a² = ' + (c * c - a * a)
        };
      }
    });
  }

  /* ------------------------------ 3. 位运算计算器 ------------------------------ */
  function renderBitwise(root) {
    K.form(root, {
      uid: 'bitwise',
      actionLabel: '运算',
      fields: [
        { id: 'a', label: '操作数 A', type: 'text', value: '0xF0', wide: true },
        { id: 'b', label: '操作数 B', type: 'text', value: '0x0F', wide: true },
        { id: 'shift', label: '移位位数', type: 'number', value: 2, min: 0, max: 31 }
      ],
      hint: '支持十进制、0x 十六进制、0b 二进制输入；按 32 位有符号整数计算，与 C / JS 位运算一致。',
      run: function (v) {
        function parseNum(text) {
          var s = String(text).trim();
          if (!s) return NaN;
          var sign = s[0] === '-' ? -1 : 1;
          if (s[0] === '-' || s[0] === '+') s = s.slice(1);
          if (/^0b/i.test(s)) return sign * parseInt(s.slice(2), 2);
          if (/^0x/i.test(s)) return sign * parseInt(s.slice(2), 16);
          if (/^0o/i.test(s)) return sign * parseInt(s.slice(2), 8);
          return sign * Number(s);
        }
        var a = parseNum(v.a);
        var b = parseNum(v.b);
        if (isNaN(a) || isNaN(b)) return { error: '请输入有效数字（支持 10、0x1F、0b1010）' };
        var shift = Math.max(0, Math.min(31, Number(v.shift) || 0));
        function bin(x) {
          return (x >>> 0).toString(2).padStart(32, '0').replace(/(.{8})(?=.)/g, '$1 ');
        }
        return {
          html: K.kv([
            { key: 'A 的二进制', value: bin(a), copy: false },
            { key: 'B 的二进制', value: bin(b), copy: false }
          ]),
          rows: [
            { key: 'A AND B', value: String(a & b) + '（0x' + (a & b).toString(16) + '）' },
            { key: 'A OR B', value: String(a | b) + '（0x' + (a | b).toString(16) + '）' },
            { key: 'A XOR B', value: String(a ^ b) + '（0x' + (a ^ b).toString(16) + '）' },
            { key: 'NOT A', value: String(~a) + '（0x' + (~a >>> 0).toString(16) + '）' },
            { key: 'A << ' + shift, value: String(a << shift) },
            { key: 'A >> ' + shift + '（算术）', value: String(a >> shift) },
            { key: 'A >>> ' + shift + '（逻辑）', value: String(a >>> shift) }
          ],
          note: '结果均为 32 位有符号整数'
        };
      }
    });
  }

  /* ------------------------------ 4. 对数计算 ------------------------------ */
  function renderLogCalc(root) {
    K.form(root, {
      uid: 'logcalc',
      actionLabel: '计算',
      fields: [
        { id: 'value', label: '真数（> 0）', type: 'number', value: 1000, min: 0.0000001, step: 'any' },
        { id: 'base', label: '底数（> 0 且 ≠ 1）', type: 'number', value: 10, min: 0.000001, step: 'any' }
      ],
      hint: '同时给出常用换底结果，如 log2 用于估算二分次数与哈希桶深。',
      run: function (v) {
        var val = Number(v.value);
        var base = Number(v.base);
        if (!(val > 0)) return { error: '真数必须大于 0' };
        if (!(base > 0) || base === 1) return { error: '底数必须大于 0 且不等于 1' };
        var ln = Math.log(val);
        var result = ln / Math.log(base);
        return {
          html: '<div class="big-result">log<sub>' + K.esc(base) + '</sub> ' + K.esc(val) + ' = ' + K.num(result, 8) + '</div>',
          rows: [
            { key: '自然对数 ln', value: K.num(ln, 8) },
            { key: '常用对数 lg', value: K.num(Math.log10(val), 8) },
            { key: 'log2', value: K.num(Math.log2(val), 8) },
            { key: 'e 的 ' + K.num(ln, 4) + ' 次方（验算）', value: K.num(Math.exp(ln), 6) }
          ],
          note: '换底公式：log_a(b) = ln(b) / ln(a)'
        };
      }
    });
  }

  /* ------------------------------ 5. 三角函数 ------------------------------ */
  function renderTrigCalc(root) {
    K.form(root, {
      uid: 'trigcalc',
      actionLabel: '计算',
      fields: [
        { id: 'value', label: '角度值', type: 'number', value: 30, step: 'any' },
        { id: 'unit', label: '单位', type: 'select', value: 'deg',
          options: [{ value: 'deg', label: '角度（°）' }, { value: 'rad', label: '弧度（rad）' }] },
        { id: 'digits', label: '小数位数', type: 'number', value: 6, min: 1, max: 12 }
      ],
      hint: 'tan 在 ±90° 处趋于无穷，会标注为 ∞；角度换算按 180° = π。',
      run: function (v) {
        var val = Number(v.value);
        if (isNaN(val)) return { error: '请输入数字' };
        var digits = Math.min(12, Math.max(1, Number(v.digits) || 6));
        var rad = v.unit === 'deg' ? val * Math.PI / 180 : val;
        var deg = v.unit === 'deg' ? val : val * 180 / Math.PI;
        var sinV = Math.sin(rad);
        var cosV = Math.cos(rad);
        var tanV = Math.abs(cosV) < 1e-14 ? null : sinV / cosV;
        return {
          rows: [
            { key: '角度 / 弧度', value: K.num(deg, 6) + '° = ' + K.num(rad, 8) + ' rad' },
            { key: 'sin', value: K.num(sinV, digits) },
            { key: 'cos', value: K.num(cosV, digits) },
            { key: 'tan', value: tanV === null ? '∞（cos ≈ 0）' : K.num(tanV, digits) },
            { key: 'asin（反正弦）', value: Math.abs(sinV) <= 1 ? K.num(Math.asin(sinV) * 180 / Math.PI, 4) + '°' : '—' },
            { key: 'acos（反余弦）', value: Math.abs(cosV) <= 1 ? K.num(Math.acos(cosV) * 180 / Math.PI, 4) + '°' : '—' }
          ],
          note: '与 π 对比：该角是 π 的 ' + K.num(rad / Math.PI, 6) + ' 倍'
        };
      }
    });
  }

  /* ------------------------------ 6. 排列组合 ------------------------------ */
  function bigFactorial(n) {
    var result = 1n;
    for (var i = 2n; i <= BigInt(n); i += 1n) result *= i;
    return result;
  }

  /** C(n,r)（BigInt 乘法链，避免巨大阶乘） */
  function bigCombination(n, r) {
    var c = 1n;
    for (var i = 1; i <= r; i += 1) c = c * BigInt(n - r + i) / BigInt(i);
    return c;
  }

  function renderCombinatorics(root) {
    K.form(root, {
      uid: 'combinatorics',
      actionLabel: '计算',
      fields: [
        { id: 'n', label: '总数 n', type: 'number', value: 10, min: 0, max: 5000 },
        { id: 'r', label: '选取数 r', type: 'number', value: 3, min: 0, max: 5000 }
      ],
      hint: 'C(n,r) 组合不计顺序，P(n,r) 排列计顺序；超过 170! 时阶乘以位数表示。',
      run: function (v) {
        var n = Math.floor(Number(v.n));
        var r = Math.floor(Number(v.r));
        if (n < 0 || r < 0) return { error: 'n 与 r 都不能为负数' };
        if (r > n) return { error: 'r 不能大于 n' };
        // C(n,r) 用乘法链避免巨大阶乘
        var c = bigCombination(n, r);
        var p = c;
        for (var j = 1; j <= r; j += 1) p *= BigInt(n - r + j);
        var factStr;
        if (n <= 170) factStr = bigFactorial(n).toString();
        else {
          var digits = Math.ceil((n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n)) / Math.LN10);
          factStr = '约 ' + digits + ' 位数（超出 JS 精确表示）';
        }
        return {
          rows: [
            { key: '组合 C(n,r)', value: c.toString() },
            { key: '排列 P(n,r)', value: p.toString() },
            { key: 'n!', value: factStr },
            { key: '重复组合 C(n+r-1,r)', value: bigCombination(n + r - 1, r).toString() }
          ],
          note: 'n=' + n + '、r=' + r
        };
      }
    });
  }

  /* ------------------------------ 7. 跑步配速 ------------------------------ */
  function renderPaceCalc(root) {
    K.form(root, {
      uid: 'pacecalc',
      actionLabel: '计算配速',
      fields: [
        { id: 'distance', label: '距离（km，可填 42.195）', type: 'number', value: 5, min: 0.01, step: 'any' },
        { id: 'time', label: '用时（HH:MM:SS 或 MM:SS）', type: 'text', value: '27:30' },
        { id: 'targetPace', label: '目标配速（分/公里，可选）', type: 'text', value: '', placeholder: '如 5:30 → 预计完赛时间' }
      ],
      hint: '配速 = 每公里耗时。填目标配速可反推预计完赛时间，跑马拉松配速规划常用。',
      run: function (v) {
        function parseTime(text) {
          var parts = text.trim().split(':').map(Number);
          if (parts.some(isNaN)) return null;
          if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
          if (parts.length === 2) return parts[0] * 60 + parts[1];
          return parts[0];
        }
        function fmt(sec) {
          sec = Math.round(sec);
          var h = Math.floor(sec / 3600);
          var m = Math.floor(sec % 3600 / 60);
          var s = sec % 60;
          return (h ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
        }
        var dist = Number(v.distance);
        var seconds = parseTime(v.time || '');
        if (!(dist > 0)) return { error: '距离必须大于 0' };
        if (!seconds) return { error: '用时格式示例 27:30 或 3:45:20' };
        var pace = seconds / dist;
        var rows = [
          { key: '平均配速', value: Math.floor(pace / 60) + ':' + String(Math.round(pace % 60)).padStart(2, '0') + ' /km' },
          { key: '平均速度', value: K.num(dist / (seconds / 3600), 3) + ' km/h（' + K.num(60 / pace, 2) + ' km/60min）' },
          { key: '每 400 米一圈', value: fmt(pace * 0.4) },
          { key: '5km / 10km 按此速度', value: fmt(pace * 5) + ' / ' + fmt(pace * 10) }
        ];
        var tp = (v.targetPace || '').trim();
        if (tp) {
          var target = parseTime(tp);
          if (!target || target <= 0) return { error: '目标配速示例：5:30' };
          rows.push({ key: '目标配速 ' + tp + ' 完赛', value: fmt(target * dist) + '（比当前' + (target * dist < seconds ? '快 ' : '慢 ') + fmt(Math.abs(target * dist - seconds)) + '）' });
        }
        return { rows: rows, note: dist + ' km 用时 ' + fmt(seconds) };
      }
    });
  }

  /* ------------------------------ 8. 屏幕像素密度 ------------------------------ */
  function renderDpiCalc(root) {
    K.form(root, {
      uid: 'dpicalc',
      actionLabel: '计算',
      fields: [
        { id: 'width', label: '横向分辨率（px）', type: 'number', value: 1920, min: 1 },
        { id: 'height', label: '纵向分辨率（px）', type: 'number', value: 1080, min: 1 },
        { id: 'diagonal', label: '对角线尺寸（英寸）', type: 'number', value: 15.6, min: 0.1, step: 'any' },
        { id: 'zoom', label: '系统缩放（%）', type: 'number', value: 100, min: 50, max: 300 }
      ],
      hint: 'PPI 越高越细腻；「有效 PPI」考虑系统缩放后的实际渲染密度，选显示器时更实用。',
      run: function (v) {
        var w = Number(v.width);
        var h = Number(v.height);
        var diag = Number(v.diagonal);
        if (!(w > 0) || !(h > 0) || !(diag > 0)) return { error: '分辨率与尺寸都要大于 0' };
        var px = Math.sqrt(w * w + h * h);
        var ppi = px / diag;
        var zoom = Number(v.zoom) / 100;
        var g = Math.hypot(w / zoom, h / zoom);
        var mm = 25.4 / ppi;
        return {
          rows: [
            { key: 'PPI（物理像素密度）', value: K.num(ppi, 2) },
            { key: '点距', value: K.num(mm * 1000, 1) + ' μm（' + K.num(mm, 4) + ' mm）' },
            { key: '有效逻辑分辨率', value: Math.round(w / zoom) + ' × ' + Math.round(h / zoom) + '（缩放 ' + v.zoom + '%）' },
            { key: '有效 PPI', value: K.num(g / diag, 2) },
            { key: '宽高比', value: simplifyRatio(w, h) },
            { key: '总像素', value: K.group(w * h) + '（约 ' + K.num(w * h / 1000000, 1) + 'MP）' }
          ],
          note: '参考：手机约 300–500 PPI，27 寸 4K 约 163 PPI'
        };
      }
    });
  }

  function simplifyRatio(w, h) {
    function gcd(x, y) { return y ? gcd(y, x % y) : x; }
    var g = gcd(w, h);
    var rw = w / g;
    var rh = h / g;
    if (rw > 50 || rh > 50) return K.num(w / h, 4) + ' : 1';
    return rw + ' : ' + rh;
  }

  /* ------------------------------ 9. 宽高比 ------------------------------ */
  function renderAspectRatio(root) {
    K.form(root, {
      uid: 'aspectratio',
      actionLabel: '换算',
      fields: [
        { id: 'w1', label: '原始宽', type: 'number', value: 1920, min: 1 },
        { id: 'h1', label: '原始高', type: 'number', value: 1080, min: 1 },
        { id: 'target', label: '目标宽（可选）', type: 'number', value: '', min: 0 },
        { id: 'targetH', label: '目标高（可选）', type: 'number', value: '', min: 0 }
      ],
      hint: '填目标宽自动算高，填目标高自动算宽；都填则取按宽度等比的结果。',
      run: function (v) {
        var w1 = Number(v.w1);
        var h1 = Number(v.h1);
        if (!(w1 > 0) || !(h1 > 0)) return { error: '原始宽高都要大于 0' };
        var rows = [
          { key: '简化比例', value: simplifyRatio(w1, h1) },
          { key: '小数比例', value: K.num(w1 / h1, 4) + '（宽 ÷ 高）' },
          { key: '常见标准', value: nearestStandard(w1 / h1) }
        ];
        var tw = Number(v.target);
        var th = Number(v.targetH);
        if (tw > 0) rows.push({ key: '目标宽 ' + tw + ' → 高', value: String(Math.round(tw * h1 / w1)) });
        if (th > 0) rows.push({ key: '目标高 ' + th + ' → 宽', value: String(Math.round(th * w1 / h1)) });
        if (!(tw > 0) && !(th > 0)) rows.push({ key: '缩小到 1280 宽', value: '1280 × ' + Math.round(1280 * h1 / w1) });
        return { rows: rows, note: '等比缩放不裁边；需要裁剪填充请用「图片裁剪」工具' };
      }
    });
  }

  function nearestStandard(ratio) {
    var standards = [[1, '1:1 方图'], [4 / 3, '4:3 传统'], [3 / 2, '3:2 相机'], [16 / 10, '16:10'], [16 / 9, '16:9 宽屏'], [21 / 9, '21:9 带鱼屏'], [9 / 16, '9:16 竖屏'], [2 / 3, '2:3 海报'], [3 / 4, '3:4 竖版'], [1180 / 820, '≈1.44 A4 横向']];
    var best = standards.reduce(function (acc, s) {
      return Math.abs(s[0] - ratio) < Math.abs(acc[0] - ratio) ? s : acc;
    });
    return best[1] + '（差 ' + K.num(Math.abs(best[0] - ratio) / ratio * 100, 2) + '%）';
  }

  /* ------------------------------ 10. 时薪换算 ------------------------------ */
  function renderHourlyRate(root) {
    K.form(root, {
      uid: 'hourlyrate',
      actionLabel: '换算',
      fields: [
        { id: 'amount', label: '收入金额', type: 'number', value: 12000, min: 0, step: 'any' },
        { id: 'period', label: '金额口径', type: 'select', value: 'month',
          options: [{ value: 'month', label: '月薪' }, { value: 'year', label: '年薪（含年终）' }, { value: 'day', label: '日薪' }, { value: 'hour', label: '时薪' }] },
        { id: 'workDays', label: '每月工作日', type: 'number', value: 21.75, min: 1, max: 31, step: 'any' },
        { id: 'hours', label: '每天工时', type: 'number', value: 8, min: 1, max: 24, step: 'any' }
      ],
      hint: '21.75 天是劳动节计算月计薪天数；算时薪可以评估加班值不值。',
      run: function (v) {
        var amount = Number(v.amount);
        var days = Number(v.workDays);
        var hours = Number(v.hours);
        if (!(amount > 0)) return { error: '请输入收入金额' };
        var monthPay;
        if (v.period === 'month') monthPay = amount;
        else if (v.period === 'year') monthPay = amount / 12;
        else if (v.period === 'day') monthPay = amount * days;
        else monthPay = amount * days * hours;
        var dayPay = monthPay / days;
        var hourPay = dayPay / hours;
        var yearPay = monthPay * 12;
        return {
          rows: [
            { key: '年薪', value: money(yearPay) },
            { key: '月薪', value: money(monthPay) },
            { key: '日薪', value: money(dayPay) },
            { key: '时薪', value: money(hourPay) },
            { key: '每分钟', value: money(hourPay / 60) },
            { key: '加班 1 小时（1.5 倍）', value: money(hourPay * 1.5) }
          ],
          note: '按每月 ' + days + ' 天、每天 ' + hours + ' 小时计算'
        };
      }
    });
  }

  /* ------------------------------ 11. 宠物年龄 ------------------------------ */
  function renderPetAge(root) {
    function ageOf(pts, human) {
      for (var i = 1; i < pts.length; i += 1) {
        if (human <= pts[i][1]) {
          return pts[i - 1][0] + (human - pts[i - 1][1]) / (pts[i][1] - pts[i - 1][1]) * (pts[i][0] - pts[i - 1][0]);
        }
      }
      return pts[pts.length - 1][0];
    }
    K.form(root, {
      uid: 'petage',
      actionLabel: '换算',
      fields: [
        { id: 'pet', label: '宠物', type: 'select', value: 'dog-m',
          options: [{ value: 'dog-s', label: '狗（小型 ≤10kg）' }, { value: 'dog-m', label: '狗（中型 10–25kg）' }, { value: 'dog-l', label: '狗（大型 ≥25kg）' }, { value: 'cat', label: '猫' }] },
        { id: 'age', label: '宠物年龄（岁，可小数）', type: 'number', value: 3, min: 0, max: 30, step: 'any' }
      ],
      hint: '大型犬衰老更快，换算表按体重分档；结果为估算，个体差异较大。',
      run: function (v) {
        var age = Number(v.age);
        if (!(age >= 0)) return { error: '年龄不能为负数' };
        // 分段线性：狗 1 岁≈15 人岁，2 岁≈24，之后按体型每年 +4~7；猫每年 +4（前两年 24）
        var curves = {
          'dog-s': [[1, 15], [2, 24], [16, 24 + 14 * 4.5]],
          'dog-m': [[1, 15], [2, 24], [16, 24 + 14 * 5.5]],
          'dog-l': [[1, 14], [2, 22], [14, 22 + 12 * 7]],
          'cat': [[1, 15], [2, 24], [20, 24 + 18 * 4]]
        };
        var pts = curves[v.pet] || curves['dog-m'];
        var human;
        if (age <= pts[0][0]) human = age * pts[0][1];
        else {
          for (var i = 1; i < pts.length; i += 1) {
            if (age <= pts[i][0]) {
              var t = (age - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]);
              human = pts[i - 1][1] + t * (pts[i][1] - pts[i - 1][1]);
              break;
            }
          }
          if (human === undefined) human = pts[pts.length - 1][1];
        }
        var petName = { 'dog-s': '小型犬', 'dog-m': '中型犬', 'dog-l': '大型犬', 'cat': '猫' }[v.pet];
        var stage = human < 12 ? '幼年 / 少年' : human < 30 ? '青年' : human < 45 ? '壮年' : human < 60 ? '中年' : '老年（人类标准）';
        return {
          rows: [
            { key: petName + ' ' + age + ' 岁 ≈ 人类', value: K.num(human, 1) + ' 岁' },
            { key: '发育阶段', value: stage },
            { key: '反过来：人类 30 岁 ≈', value: '宠物 ' + K.num(ageOf(pts, 30), 1) + ' 岁' }
          ],
          note: '1 岁前发育最快，换算不是简单乘 7'
        };
      }
    });
  }

  /* ------------------------------ 12. 下载时间计算 ------------------------------ */
  function renderDataTransfer(root) {
    K.form(root, {
      uid: 'transfer',
      actionLabel: '计算',
      fields: [
        { id: 'size', label: '文件大小', type: 'number', value: 800, min: 0.000001, step: 'any' },
        { id: 'unit', label: '大小单位', type: 'select', value: 'MB',
          options: [{ value: 'KB', label: 'KB' }, { value: 'MB', label: 'MB' }, { value: 'GB', label: 'GB' }, { value: 'TB', label: 'TB' }] },
        { id: 'speed', label: '带宽（Mbps）', type: 'number', value: 300, min: 0.01, step: 'any' },
        { id: 'eff', label: '有效利用率（%）', type: 'number', value: 85, min: 1, max: 100 }
      ],
      hint: '1 Byte = 8 bit：100M 宽带理论上限 12.5 MB/s，实际还有协议开销，默认按 85% 估算。',
      run: function (v) {
        var size = Number(v.size);
        var unitMul = { KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12 }[v.unit];
        var speed = Number(v.speed);
        var eff = Number(v.eff) / 100;
        if (!(size > 0)) return { error: '文件大小要大于 0' };
        if (!(speed > 0)) return { error: '带宽要大于 0' };
        var bytes = size * unitMul;
        var bits = bytes * 8;
        var effSpeed = speed * 1000000 * eff; // bit/s
        var sec = bits / effSpeed;
        var rows = [
          { key: '理论速度', value: K.num(speed / 8, 3) + ' MB/s' },
          { key: '实际速度（' + v.eff + '%）', value: K.num(effSpeed / 8000000, 3) + ' MB/s' },
          { key: '预计耗时', value: sec < 90 ? Math.round(sec) + ' 秒' : sec < 5400 ? K.num(sec / 60, 1) + ' 分钟' : K.num(sec / 3600, 2) + ' 小时' }
        ];
        ['100M', '500M', '1000M'].forEach(function (tag, i) {
          var mbps = [100, 500, 1000][i];
          rows.push({ key: '若用 ' + tag + ' 宽带', value: secOn(mbps) });
        });
        function secOn(mbps2) {
          var s = bits / (mbps2 * 1000000 * eff);
          return s < 90 ? Math.round(s) + ' 秒' : s < 5400 ? K.num(s / 60, 1) + ' 分钟' : K.num(s / 3600, 2) + ' 小时';
        }
        return { rows: rows, note: size + ' ' + v.unit + ' @ ' + speed + 'Mbps' };
      }
    });
  }

  /* ------------------------------ 13. 增值税 ------------------------------ */
  function renderVatCalc(root) {
    K.form(root, {
      uid: 'vatcalc',
      actionLabel: '计算',
      fields: [
        { id: 'price', label: '价格', type: 'number', value: 1130, min: 0, step: 'any' },
        { id: 'kind', label: '价格口径', type: 'select', value: 'gross',
          options: [{ value: 'gross', label: '含税价 → 拆税' }, { value: 'net', label: '不含税价 → 加税' }] },
        { id: 'rate', label: '税率', type: 'select', value: '13',
          options: [{ value: '13', label: '13%（货物销售）' }, { value: '9', label: '9%（交通运输 / 建筑）' }, { value: '6', label: '6%（现代服务）' }, { value: '3', label: '3%（小规模）' }, { value: '1', label: '1%（小规模优惠）' }] }
      ],
      hint: '含税价 ÷ (1+税率) = 不含税价。开票、报价时核对税率，别把 13% 直接当折算系数。',
      run: function (v) {
        var price = Number(v.price);
        var rate = Number(v.rate) / 100;
        if (!(price >= 0)) return { error: '价格不能为负数' };
        var net;
        if (v.kind === 'gross') net = price / (1 + rate);
        else net = price;
        var tax = net * rate;
        var gross = v.kind === 'gross' ? price : net * (1 + rate);
        return {
          rows: [
            { key: '不含税价', value: money(net) },
            { key: '税额', value: money(tax) },
            { key: '含税价', value: money(gross) },
            { key: '价税合计校验', value: money(net + tax) }
          ],
          note: '税率 ' + v.rate + '%，' + (v.kind === 'gross' ? '从含税价倒算' : '从不含税价正算')
        };
      }
    });
  }

  /* ------------------------------ 14. 电阻色环 ------------------------------ */
  var RES_COLORS = [
    { name: '黑', en: 'black', digit: 0, mult: 1, hex: '#000000' },
    { name: '棕', en: 'brown', digit: 1, mult: 10, hex: '#795548', tol: '±1%' },
    { name: '红', en: 'red', digit: 2, mult: 100, hex: '#e53935', tol: '±2%' },
    { name: '橙', en: 'orange', digit: 3, mult: 1e3, hex: '#fb8c00' },
    { name: '黄', en: 'yellow', digit: 4, mult: 1e4, hex: '#fdd835' },
    { name: '绿', en: 'green', digit: 5, mult: 1e5, hex: '#43a047', tol: '±0.5%' },
    { name: '蓝', en: 'blue', digit: 6, mult: 1e6, hex: '#1e88e5', tol: '±0.25%' },
    { name: '紫', en: 'violet', digit: 7, mult: 1e7, hex: '#8e24aa', tol: '±0.1%' },
    { name: '灰', en: 'gray', digit: 8, mult: 1e8, hex: '#9e9e9e' },
    { name: '白', en: 'white', digit: 9, mult: 1e9, hex: '#ffffff' },
    { name: '金', en: 'gold', digit: -1, mult: 0.1, hex: '#c9a227', tol: '±5%' },
    { name: '银', en: 'silver', digit: -1, mult: 0.01, hex: '#c0c0c0', tol: '±10%' }
  ];

  function renderResistorColor(root) {
    function colorOptions() {
      return RES_COLORS.map(function (c) { return { value: c.en, label: c.name }; });
    }
    function byEn(en) {
      return RES_COLORS.find(function (c) { return c.en === en; }) || RES_COLORS[0];
    }
    function fmtOhms(v) {
      if (v >= 1e9) return K.num(v / 1e9, 3) + ' GΩ';
      if (v >= 1e6) return K.num(v / 1e6, 3) + ' MΩ';
      if (v >= 1e3) return K.num(v / 1e3, 3) + ' kΩ';
      return K.num(v, 3) + ' Ω';
    }
    var bands = [];
    ['b1', 'b2', 'b3', 'b4', 'b5'].forEach(function (id) { bands.push(id); });
    K.form(root, {
      uid: 'resistor',
      actionLabel: '读取阻值',
      fields: [
        { id: 'bandCount', label: '色环数', type: 'select', value: '4',
          options: [{ value: '4', label: '4 环（2 有效位）' }, { value: '5', label: '5 环（3 有效位）' }] },
        { id: 'b1', label: '第 1 环（有效位）', type: 'select', value: 'brown', options: colorOptions() },
        { id: 'b2', label: '第 2 环（有效位）', type: 'select', value: 'black', options: colorOptions() },
        { id: 'b3', label: '第 3 环（4 环=倍率）', type: 'select', value: 'red', options: colorOptions() },
        { id: 'b4', label: '第 4 环（5 环=倍率）', type: 'select', value: 'red', options: colorOptions() },
        { id: 'b5', label: '误差环（4 环=第 4 环）', type: 'select', value: 'gold', options: colorOptions() }
      ],
      hint: '4 环读法：前两环有效位 + 第 3 环倍率 + 第 4 环误差；5 环前三环是有效位。金 / 银只作倍率或误差。',
      run: function (v) {
        var is5 = v.bandCount === '5';
        var c = [byEn(v.b1), byEn(v.b2), byEn(v.b3), byEn(is5 ? v.b4 : v.b3), byEn(v.b5)];
        var digits = is5 ? [c[0].digit, c[1].digit, c[2].digit] : [c[0].digit, c[1].digit];
        var multiplier = is5 ? c[3].mult : c[2].mult;
        if (digits.some(function (d) { return d < 0; })) return { error: '有效位色环不能选金 / 银' };
        var value = Number(digits.join('')) * multiplier;
        var tol = c[4].tol || '±20%（无误差环默认）';
        var colorRow = RES_COLORS.slice(0, 10).map(function (col) {
          return { html: '<span class="res-swatch" style="background:' + col.hex + '" title="' + col.name + '"></span>' };
        });
        return {
          html: '<div class="big-result">' + fmtOhms(value) + ' ' + K.esc(tol) + '</div>' +
            '<div class="res-strip">' + colorRow.map(function (r) { return r.html; }).join('') + '<span class="hint" style="margin-left:8px">色环对照（黑→白）</span></div>',
          rows: [
            { key: '有效位', value: digits.join('') },
            { key: '倍率', value: '×' + multiplier },
            { key: '最小值', value: fmtOhms(value * 0.95) },
            { key: '最大值', value: fmtOhms(value * 1.05) }
          ],
          note: (is5 ? '5 环' : '4 环') + '读法：' + digits.join('') + ' × ' + multiplier
        };
      }
    });
  }

  window.ToolModules['circle-calc'] = renderCircleCalc;
  window.ToolModules['pythagoras'] = renderPythagoras;
  window.ToolModules['bitwise'] = renderBitwise;
  window.ToolModules['log-calc'] = renderLogCalc;
  window.ToolModules['trig-calc'] = renderTrigCalc;
  window.ToolModules['combinatorics'] = renderCombinatorics;
  window.ToolModules['pace-calc'] = renderPaceCalc;
  window.ToolModules['dpi-calc'] = renderDpiCalc;
  window.ToolModules['aspect-ratio'] = renderAspectRatio;
  window.ToolModules['hourly-rate'] = renderHourlyRate;
  window.ToolModules['pet-age'] = renderPetAge;
  window.ToolModules['data-transfer'] = renderDataTransfer;
  window.ToolModules['vat-calc'] = renderVatCalc;
  window.ToolModules['resistor-color'] = renderResistorColor;
})();
