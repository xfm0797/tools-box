/* =============================================================================
 * 计算换算工具包 · 第二批（17 个）
 * -----------------------------------------------------------------------------
 * salary-tax     税后工资与个税
 * savings        存款利息（单利 / 复利）
 * unit-pressure  压力换算
 * unit-energy    能量换算
 * unit-power     功率换算
 * unit-angle     角度换算
 * unit-fuel      油耗换算
 * unit-shoe      鞋码换算
 * fraction-calc  分数四则运算
 * bignum-calc    大整数计算
 * prime-factor   质数判断与分解
 * gcd-lcm        最大公约数 / 最小公倍数
 * stat-basic     描述性统计
 * quadratic      一元二次方程
 * triangle-calc  三角形计算
 * tip-split      小费与分账
 * price-unit     单价比较
 *
 * 全部本地计算；金额结果保留到分，仅供估算参考。
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  function fmtNum(value, digits) {
    if (!isFinite(value)) return '—';
    var abs = Math.abs(value);
    if (abs !== 0 && (abs < 1e-6 || abs >= 1e12)) return value.toExponential(6);
    return K.num(value, digits === undefined ? 6 : digits);
  }

  function money(value) {
    return (Math.round(value * 100) / 100).toFixed(2);
  }

  /** 通用「数值 + 单位」换算器 */
  function unitConverter(root, cfg) {
    K.form(root, {
      uid: cfg.uid,
      actionLabel: '换算',
      fields: [
        { id: 'value', label: '数值', type: 'number', value: cfg.value, step: 'any' },
        { id: 'from', label: '原单位', type: 'select', value: cfg.from,
          options: cfg.units.map(function (u) { return { value: u.key, label: u.label }; }) }
      ],
      hint: cfg.hint,
      run: function (v) {
        var n = parseFloat(v.value);
        if (!isFinite(n)) return { error: '请输入有效数值' };
        var unit = cfg.units.filter(function (u) { return u.key === v.from; })[0];
        if (!unit) return { error: '请选择原单位' };
        var base = n * unit.factor;
        var rows = cfg.units.map(function (u) {
          return {
            key: u.label,
            value: fmtNum(base / u.factor, cfg.digits) + (u.suffix ? ' ' + u.suffix : '')
          };
        });
        return { rows: rows, note: fmtNum(n) + ' ' + unit.label + ' = ' + fmtNum(base / cfg.units[0].factor) + ' ' + cfg.units[0].label };
      }
    });
  }

  /* ------------------------------ 1. 工资个税 ------------------------------ */
  var TAX_BRACKETS = [
    [3000, 0.03, 0],
    [12000, 0.1, 210],
    [25000, 0.2, 1410],
    [35000, 0.25, 2660],
    [55000, 0.3, 4410],
    [80000, 0.35, 7160],
    [Infinity, 0.45, 15160]
  ];

  function renderSalary(root) {
    K.form(root, {
      uid: 'salary',
      actionLabel: '计算',
      fields: [
        { id: 'gross', label: '税前月薪（元）', type: 'number', value: 20000, min: 0, step: 'any' },
        { id: 'social', label: '五险一金（元）', type: 'number', value: 3000, min: 0, step: 'any' },
        { id: 'special', label: '专项附加扣除（元）', type: 'number', value: 0, min: 0, step: 'any' },
        { id: 'threshold', label: '起征点（元）', type: 'number', value: 5000, min: 0 }
      ],
      hint: '按月度综合所得税率表简化计算，未考虑累计预扣、年终奖单独计税与各地社保基数上下限，实际到手以工资条为准。',
      run: function (v) {
        var gross = Number(v.gross);
        var social = Number(v.social);
        var special = Number(v.special);
        var threshold = Number(v.threshold);
        if (!isFinite(gross) || gross < 0) return { error: '税前月薪需要是非负数字' };
        if (!isFinite(social) || social < 0) return { error: '五险一金需要是非负数字' };

        var taxable = Math.max(0, gross - social - special - threshold);
        var bracket = TAX_BRACKETS.filter(function (b) { return taxable <= b[0]; })[0];
        var tax = Math.max(0, taxable * bracket[1] - bracket[2]);
        var net = gross - social - tax;
        var rate = taxable > 0 ? bracket[1] * 100 : 0;

        return {
          html: '<div class="big-result">¥' + money(net) + '</div>',
          rows: [
            { key: '应纳税所得额', value: '¥' + money(taxable) },
            { key: '适用税率', value: fmtNum(rate) + '%' },
            { key: '速算扣除数', value: '¥' + money(bracket[2]) },
            { key: '本月个税', value: '¥' + money(tax) },
            { key: '五险一金', value: '¥' + money(social) },
            { key: '税后到手', value: '¥' + money(net) },
            { key: '实际税负率', value: fmtNum(gross > 0 ? tax / gross * 100 : 0, 2) + '%' }
          ],
          note: '税后到手 ¥' + money(net) + '（按月度简化算法）'
        };
      }
    });
  }

  /* ------------------------------ 2. 存款利息 ------------------------------ */
  function renderSavings(root) {
    K.form(root, {
      uid: 'savings',
      actionLabel: '计算',
      fields: [
        { id: 'principal', label: '本金（元）', type: 'number', value: 100000, min: 0, step: 'any' },
        { id: 'rate', label: '年利率（%）', type: 'number', value: 2.5, min: 0, step: 'any' },
        { id: 'years', label: '存期（年）', type: 'number', value: 3, min: 0, step: 'any' },
        { id: 'mode', label: '计息方式', type: 'select', value: 'compound-year',
          options: [
            { value: 'simple', label: '单利（利息不生息）' },
            { value: 'compound-year', label: '复利 · 按年' },
            { value: 'compound-month', label: '复利 · 按月' },
            { value: 'compound-day', label: '复利 · 按日' }
          ] }
      ],
      hint: '不考虑利息税与提前支取，仅作收益估算。',
      run: function (v) {
        var principal = Number(v.principal);
        var rate = Number(v.rate) / 100;
        var years = Number(v.years);
        if (!isFinite(principal) || principal < 0) return { error: '本金需要是非负数字' };
        if (!isFinite(rate) || rate < 0) return { error: '年利率需要是非负数字' };
        if (!isFinite(years) || years < 0) return { error: '存期需要是非负数字' };

        var total;
        var periods;
        if (v.mode === 'simple') {
          total = principal * (1 + rate * years);
        } else if (v.mode === 'compound-month') {
          periods = Math.round(years * 12);
          total = principal * Math.pow(1 + rate / 12, periods);
        } else if (v.mode === 'compound-day') {
          periods = Math.round(years * 365);
          total = principal * Math.pow(1 + rate / 365, periods);
        } else {
          total = principal * Math.pow(1 + rate, years);
        }
        var interest = total - principal;
        var table = [];
        var maxYears = Math.min(Math.floor(years), 30);
        for (var y = 1; y <= maxYears; y += 1) {
          var t;
          if (v.mode === 'simple') t = principal * (1 + rate * y);
          else if (v.mode === 'compound-month') t = principal * Math.pow(1 + rate / 12, y * 12);
          else if (v.mode === 'compound-day') t = principal * Math.pow(1 + rate / 365, y * 365);
          else t = principal * Math.pow(1 + rate, y);
          table.push([y, money(t - principal), money(t)]);
        }

        return {
          html: '<div class="big-result">¥' + money(total) + '</div>' + K.table(['第 n 年', '累计利息', '本息合计'], table),
          rows: [
            { key: '本金', value: '¥' + money(principal) },
            { key: '利息', value: '¥' + money(interest) },
            { key: '本息合计', value: '¥' + money(total) },
            { key: '总收益率', value: fmtNum(principal > 0 ? interest / principal * 100 : 0, 2) + '%' },
            { key: '年化收益率', value: fmtNum(years > 0 && principal > 0 ? (Math.pow(total / principal, 1 / years) - 1) * 100 : 0, 3) + '%' }
          ],
          note: '按' + (v.mode === 'simple' ? '单利' : '复利') + '计算，利息 ¥' + money(interest)
        };
      }
    });
  }

  /* ------------------------------ 3–7. 单位换算 ------------------------------ */
  function renderPressure(root) {
    unitConverter(root, {
      uid: 'pressure', value: 1, from: 'atm', hint: '1 标准大气压 = 101325 Pa = 1.01325 bar。',
      units: [
        { key: 'pa', label: '帕斯卡 Pa', factor: 1 },
        { key: 'kpa', label: '千帕 kPa', factor: 1000 },
        { key: 'mpa', label: '兆帕 MPa', factor: 1e6 },
        { key: 'bar', label: '巴 bar', factor: 1e5 },
        { key: 'psi', label: '磅力/平方英寸 psi', factor: 6894.757293168 },
        { key: 'atm', label: '标准大气压 atm', factor: 101325 },
        { key: 'mmhg', label: '毫米汞柱 mmHg', factor: 133.322387415 },
        { key: 'kgf', label: '公斤力/平方厘米 kgf/cm²', factor: 98066.5 }
      ]
    });
  }

  function renderEnergy(root) {
    unitConverter(root, {
      uid: 'energy', value: 1, from: 'kcal', hint: '营养标签上的「千卡 / 大卡」即 kcal；1 度电 = 1 kWh。',
      units: [
        { key: 'j', label: '焦耳 J', factor: 1 },
        { key: 'kj', label: '千焦 kJ', factor: 1000 },
        { key: 'cal', label: '卡路里 cal', factor: 4.184 },
        { key: 'kcal', label: '千卡 kcal（大卡）', factor: 4184 },
        { key: 'wh', label: '瓦时 Wh', factor: 3600 },
        { key: 'kwh', label: '千瓦时 kWh（度）', factor: 3.6e6 },
        { key: 'btu', label: '英热单位 BTU', factor: 1055.05585262 }
      ]
    });
  }

  function renderPower(root) {
    unitConverter(root, {
      uid: 'power', value: 1, from: 'kw', hint: 'hp 为英制马力（745.7 W），PS 为公制马力（735.5 W），汽车参数多用 PS。',
      units: [
        { key: 'w', label: '瓦 W', factor: 1 },
        { key: 'kw', label: '千瓦 kW', factor: 1000 },
        { key: 'mw', label: '兆瓦 MW', factor: 1e6 },
        { key: 'hp', label: '英制马力 hp', factor: 745.699871582 },
        { key: 'ps', label: '公制马力 PS', factor: 735.49875 },
        { key: 'kcalh', label: '千卡/小时 kcal/h', factor: 1.163 },
        { key: 'btuh', label: 'BTU/小时', factor: 0.2930710702 }
      ]
    });
  }

  function renderAngle(root) {
    unitConverter(root, {
      uid: 'angle', value: 180, from: 'deg', hint: '180° = π 弧度 = 200 百分度。',
      units: [
        { key: 'deg', label: '度 °', factor: 1, suffix: '°' },
        { key: 'rad', label: '弧度 rad', factor: 57.29577951308232, suffix: 'rad' },
        { key: 'grad', label: '百分度 grad', factor: 0.9, suffix: 'gon' },
        { key: 'turn', label: '圈 turn', factor: 360, suffix: 'turn' },
        { key: 'arcmin', label: '角分 ′', factor: 1 / 60, suffix: '′' },
        { key: 'arcsec', label: '角秒 ″', factor: 1 / 3600, suffix: '″' },
        { key: 'mrad', label: '毫弧度 mrad', factor: 0.05729577951308232, suffix: 'mrad' }
      ]
    });
  }

  function renderFuel(root) {
    K.form(root, {
      uid: 'fuel',
      actionLabel: '换算',
      fields: [
        { id: 'value', label: '数值', type: 'number', value: 8, step: 'any', min: 0 },
        { id: 'from', label: '原单位', type: 'select', value: 'l100',
          options: [
            { value: 'l100', label: 'L/100km（百公里油耗）' },
            { value: 'kml', label: 'km/L（每升公里数）' },
            { value: 'mpgus', label: 'MPG（美制）' },
            { value: 'mpguk', label: 'MPG（英制）' }
          ] }
      ],
      hint: '油耗单位互为倒数，数值越小越省油（MPG 相反，越大越省）。',
      run: function (v) {
        var n = parseFloat(v.value);
        if (!isFinite(n) || n <= 0) return { error: '请输入大于 0 的数值' };
        var l100;
        if (v.from === 'l100') l100 = n;
        else if (v.from === 'kml') l100 = 100 / n;
        else if (v.from === 'mpgus') l100 = 235.214583 / n;
        else l100 = 282.480936 / n;

        return {
          html: '<div class="big-result">' + fmtNum(l100, 2) + ' L/100km</div>',
          rows: [
            { key: 'L/100km', value: fmtNum(l100, 2) },
            { key: 'km/L', value: fmtNum(100 / l100, 2) },
            { key: 'MPG（美制）', value: fmtNum(235.214583 / l100, 2) },
            { key: 'MPG（英制）', value: fmtNum(282.480936 / l100, 2) },
            { key: '每公里油费（按 8 元/L）', value: '¥' + fmtNum(l100 * 8 / 100, 3) }
          ],
          note: '换算基准：1 美制加仑 = 3.785411784 L，1 英制加仑 = 4.54609 L'
        };
      }
    });
  }

  /* ------------------------------ 8. 鞋码换算 ------------------------------ */
  function renderShoe(root) {
    K.form(root, {
      uid: 'shoe',
      actionLabel: '换算',
      fields: [
        { id: 'value', label: '数值', type: 'number', value: 42, step: 'any', min: 1 },
        { id: 'from', label: '原尺码', type: 'select', value: 'eu',
          options: [
            { value: 'eu', label: '欧码 EU' },
            { value: 'cm', label: '脚长 cm' },
            { value: 'usm', label: '美码（男）' },
            { value: 'usw', label: '美码（女）' },
            { value: 'uk', label: '英码 UK' }
          ] }
      ],
      hint: '按「欧码 = 1.5 ×（脚长 + 1.5）」估算，不同品牌楦型差异较大，建议以试穿为准。',
      run: function (v) {
        var n = parseFloat(v.value);
        if (!isFinite(n) || n <= 0) return { error: '请输入有效尺码' };
        var foot;
        if (v.from === 'cm') foot = n;
        else if (v.from === 'eu') foot = (n - 2) / 1.5;
        else if (v.from === 'usm') foot = (n + 31) / 1.5;
        else if (v.from === 'usw') foot = (n + 29) / 1.5;
        else foot = (n + 32) / 1.5;

        if (foot < 10 || foot > 40) return { error: '尺码超出合理范围（脚长约 10–40 cm）' };
        var eu = Math.round((foot * 1.5 + 2) * 2) / 2;
        var table = [];
        for (var cm = Math.max(21, Math.floor(foot) - 2); cm <= Math.min(33, Math.ceil(foot) + 2); cm += 0.5) {
          var e = Math.round((cm * 1.5 + 2) * 2) / 2;
          table.push([fmtNum(cm, 1) + ' cm', fmtNum(e, 1), fmtNum(e - 33, 1), fmtNum(e - 31, 1), fmtNum(e - 34, 1)]);
        }
        return {
          html: '<div class="big-result">EU ' + fmtNum(eu, 1) + '</div>' +
            K.table(['脚长', '欧码', '美码（男）', '美码（女）', '英码'], table),
          rows: [
            { key: '脚长', value: fmtNum(foot, 1) + ' cm（' + Math.round(foot * 10) + ' mm）' },
            { key: '欧码 EU', value: fmtNum(eu, 1) },
            { key: '美码（男）', value: fmtNum(eu - 33, 1) },
            { key: '美码（女）', value: fmtNum(eu - 31, 1) },
            { key: '英码 UK', value: fmtNum(eu - 34, 1) },
            { key: '中国码', value: Math.round(foot * 10) }
          ],
          note: '估算尺码：EU ' + fmtNum(eu, 1)
        };
      }
    });
  }

  /* ------------------------------ 9. 分数计算 ------------------------------ */
  function bigGcd(a, b) {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    while (b) { var t = a % b; a = b; b = t; }
    return a;
  }

  function renderFraction(root) {
    K.form(root, {
      uid: 'fraction',
      actionLabel: '计算',
      fields: [
        { id: 'a', label: '分子 A', type: 'number', value: 1 },
        { id: 'b', label: '分母 A', type: 'number', value: 2 },
        { id: 'op', label: '运算符', type: 'select', value: '+', options: ['+', '-', '×', '÷'] },
        { id: 'c', label: '分子 B', type: 'number', value: 1 },
        { id: 'd', label: '分母 B', type: 'number', value: 3 }
      ],
      hint: '结果会自动约分，并给出带分数与小数形式。',
      run: function (v) {
        var a = BigInt(Math.trunc(Number(v.a)));
        var b = BigInt(Math.trunc(Number(v.b)));
        var c = BigInt(Math.trunc(Number(v.c)));
        var d = BigInt(Math.trunc(Number(v.d)));
        if (b === 0n || d === 0n) return { error: '分母不能为 0' };
        var num, den;
        if (v.op === '+') { num = a * d + c * b; den = b * d; }
        else if (v.op === '-') { num = a * d - c * b; den = b * d; }
        else if (v.op === '×') { num = a * c; den = b * d; }
        else {
          if (c === 0n) return { error: '除数不能为 0' };
          num = a * d; den = b * c;
        }
        if (den < 0n) { num = -num; den = -den; }
        var g = bigGcd(num, den) || 1n;
        num /= g; den /= g;
        var whole = num / den;
        var rem = num % den;
        var mixed = whole !== 0n && rem !== 0n
          ? (num < 0n ? '-' : '') + (whole < 0n ? -whole : whole) + ' ' + (rem < 0n ? -rem : rem) + '/' + den
          : num + '/' + den;
        var decimal = Number(num) / Number(den);

        return {
          html: '<div class="big-result">' + num + '/' + den + '</div>',
          rows: [
            { key: '最简分数', value: num + '/' + den },
            { key: '带分数', value: mixed || (whole !== 0n ? String(whole) : '—') },
            { key: '小数', value: fmtNum(decimal, 10) },
            { key: '约分系数', value: String(g) },
            { key: '百分数', value: fmtNum(decimal * 100, 4) + '%' }
          ],
          note: '计算 ' + a + '/' + b + ' ' + v.op + ' ' + c + '/' + d
        };
      }
    });
  }

  /* ------------------------------ 10. 大整数计算 ------------------------------ */
  function renderBigNum(root) {
    K.form(root, {
      uid: 'bignum',
      actionLabel: '计算',
      fields: [
        { id: 'a', label: '整数 A', type: 'text', value: '123456789012345678901234567890', wide: true },
        { id: 'op', label: '运算符', type: 'select', value: '+',
          options: [{ value: '+', label: '加 +' }, { value: '-', label: '减 −' }, { value: '*', label: '乘 ×' }, { value: '/', label: '整除 ÷' }, { value: '%', label: '取余 %' }, { value: '**', label: '幂 **' }] },
        { id: 'b', label: '整数 B', type: 'text', value: '98765432109876543210', wide: true }
      ],
      hint: '基于 BigInt，可处理任意长度整数；除法为整除（向零取整），幂运算的指数上限 10000。',
      run: function (v) {
        var aText = String(v.a).trim();
        var bText = String(v.b).trim();
        if (!/^-?\d+$/.test(aText)) return { error: 'A 需要是整数' };
        if (!/^-?\d+$/.test(bText)) return { error: 'B 需要是整数' };
        var a = BigInt(aText);
        var b = BigInt(bText);
        var result;
        if (v.op === '+') result = a + b;
        else if (v.op === '-') result = a - b;
        else if (v.op === '*') result = a * b;
        else if (v.op === '/') {
          if (b === 0n) return { error: '除数不能为 0' };
          result = a / b;
        } else if (v.op === '%') {
          if (b === 0n) return { error: '除数不能为 0' };
          result = a % b;
        } else {
          if (b < 0n) return { error: '指数不能为负数' };
          if (b > 10000n) return { error: '指数过大（上限 10000）' };
          result = a ** b;
        }
        var text = result.toString();
        return {
          html: '<pre class="code-block" style="white-space:pre-wrap;word-break:break-all">' + K.esc(text) + '</pre>',
          rows: [
            { key: '结果位数', value: text.replace('-', '').length + ' 位' },
            { key: 'A 位数', value: aText.replace('-', '').length + ' 位' },
            { key: 'B 位数', value: bText.replace('-', '').length + ' 位' }
          ],
          note: '计算完成，结果 ' + text.replace('-', '').length + ' 位'
        };
      }
    });
  }

  /* ------------------------------ 11. 质数判断与分解 ------------------------------ */
  function renderPrime(root) {
    K.form(root, {
      uid: 'prime',
      actionLabel: '计算',
      fields: [{ id: 'n', label: '正整数（≤ 10¹²）', type: 'text', value: '2024' }],
      hint: '采用试除法，适合 10¹² 以内的整数；更大的数请使用专业工具。',
      run: function (v) {
        var text = String(v.n).trim().replace(/,/g, '');
        if (!/^\d+$/.test(text)) return { error: '请输入正整数' };
        var n = Number(text);
        if (n < 2) return { error: '请输入大于 1 的整数' };
        if (n > 1e12) return { error: '数值过大（上限 10¹²）' };

        var factors = [];
        var rest = n;
        var d = 2;
        while (rest % d === 0) { factors.push(d); rest /= d; }
        for (d = 3; d * d <= rest; d += 2) {
          while (rest % d === 0) { factors.push(d); rest /= d; }
        }
        if (rest > 1) factors.push(rest);

        var counts = [];
        factors.forEach(function (p) {
          var last = counts[counts.length - 1];
          if (last && last.p === p) last.k += 1;
          else counts.push({ p: p, k: 1 });
        });
        var expression = counts.map(function (c) { return c.k > 1 ? c.p + '^' + c.k : String(c.p); }).join(' × ');
        var divisorCount = counts.reduce(function (acc, c) { return acc * (c.k + 1); }, 1);
        var divisorSum = counts.reduce(function (acc, c) {
          var sum = 0;
          for (var i = 0; i <= c.k; i += 1) sum += Math.pow(c.p, i);
          return acc * sum;
        }, 1);

        return {
          html: '<div class="big-result">' + (factors.length === 1 ? n + ' 是质数' : n + ' = ' + expression) + '</div>',
          rows: [
            { key: '是否质数', value: factors.length === 1 ? '是' : '否' },
            { key: '标准分解', value: expression },
            { key: '质因数个数', value: String(factors.length) },
            { key: '约数个数', value: String(divisorCount) },
            { key: '约数之和', value: String(divisorSum) },
            { key: '平方根', value: fmtNum(Math.sqrt(n), 6) }
          ],
          note: factors.length === 1 ? n + ' 只能被 1 和自身整除' : n + ' 共有 ' + divisorCount + ' 个约数'
        };
      }
    });
  }

  /* ------------------------------ 12. 最大公约数 / 最小公倍数 ------------------------------ */
  function renderGcdLcm(root) {
    K.form(root, {
      uid: 'gcd',
      actionLabel: '计算',
      fields: [{ id: 'list', label: '整数列表（逗号或空格分隔）', type: 'text', value: '12, 18, 24', wide: true }],
      hint: '基于 BigInt，支持任意长度的整数；LCM 可能非常大。',
      run: function (v) {
        var parts = String(v.list).split(/[\s,，;]+/).filter(Boolean);
        if (parts.length < 2) return { error: '请至少输入两个整数' };
        var nums = [];
        for (var i = 0; i < parts.length; i += 1) {
          if (!/^-?\d+$/.test(parts[i])) return { error: '第 ' + (i + 1) + ' 项不是整数：' + parts[i] };
          nums.push(BigInt(parts[i]));
        }
        var gcdAll = nums.reduce(function (a, b) { return bigGcd(a, b); });
        var lcmAll = nums.reduce(function (a, b) {
          if (a === 0n || b === 0n) return 0n;
          return (a / bigGcd(a, b)) * b;
        });
        return {
          html: '<div class="big-result">GCD = ' + (gcdAll < 0n ? -gcdAll : gcdAll) + '</div>',
          rows: [
            { key: '最大公约数', value: String(gcdAll < 0n ? -gcdAll : gcdAll) },
            { key: '最小公倍数', value: String(lcmAll < 0n ? -lcmAll : lcmAll) },
            { key: '整数个数', value: nums.length + ' 个' },
            { key: '是否两两互质', value: (gcdAll === 1n ? '是' : '否') }
          ],
          note: '共 ' + nums.length + ' 个整数'
        };
      }
    });
  }

  /* ------------------------------ 13. 描述性统计 ------------------------------ */
  function renderStat(root) {
    K.form(root, {
      uid: 'stat',
      actionLabel: '统计',
      fields: [{ id: 'data', label: '数据（空格、逗号或换行分隔）', type: 'textarea', rows: 6, wide: true,
        value: '12, 15, 18, 20, 22, 25, 30, 35' }],
      hint: '方差默认使用样本方差（除以 n−1）；四分位数采用线性插值法。',
      run: function (v) {
        var parts = String(v.data).split(/[\s,，;]+/).filter(Boolean);
        if (parts.length < 2) return { error: '请至少输入两个数值' };
        var nums = [];
        for (var i = 0; i < parts.length; i += 1) {
          var n = Number(parts[i]);
          if (!isFinite(n)) return { error: '第 ' + (i + 1) + ' 项不是有效数字：' + parts[i] };
          nums.push(n);
        }
        var sorted = nums.slice().sort(function (a, b) { return a - b; });
        var n2 = nums.length;
        var sum = nums.reduce(function (a, b) { return a + b; }, 0);
        var mean = sum / n2;
        var median = n2 % 2 ? sorted[(n2 - 1) / 2] : (sorted[n2 / 2 - 1] + sorted[n2 / 2]) / 2;

        var counts = {};
        nums.forEach(function (x) { counts[x] = (counts[x] || 0) + 1; });
        var maxCount = Math.max.apply(null, Object.keys(counts).map(function (k) { return counts[k]; }));
        var modes = Object.keys(counts).filter(function (k) { return counts[k] === maxCount; }).map(Number);

        var variance = nums.reduce(function (acc, x) { return acc + Math.pow(x - mean, 2); }, 0) / (n2 - 1);
        var std = Math.sqrt(variance);

        function quantile(p) {
          var pos = (n2 - 1) * p;
          var base = Math.floor(pos);
          var rest = pos - base;
          if (sorted[base + 1] === undefined) return sorted[base];
          return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
        }
        var q1 = quantile(0.25);
        var q3 = quantile(0.75);
        var iqr = q3 - q1;
        var lowFence = q1 - 1.5 * iqr;
        var highFence = q3 + 1.5 * iqr;
        var outliers = nums.filter(function (x) { return x < lowFence || x > highFence; });

        return {
          html: '<div class="big-result">均值 ' + fmtNum(mean, 4) + '</div>' +
            K.table(['指标', '数值'], [
              ['样本数 n', n2],
              ['总和', fmtNum(sum)],
              ['平均值', fmtNum(mean, 6)],
              ['中位数', fmtNum(median, 6)],
              ['众数', maxCount > 1 ? modes.join('、') : '无（每个值只出现一次）'],
              ['最小值 / 最大值', fmtNum(sorted[0]) + ' / ' + fmtNum(sorted[n2 - 1])],
              ['极差', fmtNum(sorted[n2 - 1] - sorted[0])],
              ['样本方差', fmtNum(variance, 6)],
              ['样本标准差', fmtNum(std, 6)],
              ['Q1 / Q3', fmtNum(q1, 4) + ' / ' + fmtNum(q3, 4)],
              ['IQR', fmtNum(iqr, 4)],
              ['异常值', outliers.length ? outliers.join('、') : '无']
            ]),
          rows: [
            { key: '升序排列', value: sorted.map(function (x) { return fmtNum(x); }).join(', ') }
          ],
          note: '共 ' + n2 + ' 个数值，均值 ' + fmtNum(mean, 4) + '，标准差 ' + fmtNum(std, 4)
        };
      }
    });
  }

  /* ------------------------------ 14. 一元二次方程 ------------------------------ */
  function renderQuadratic(root) {
    K.form(root, {
      uid: 'quad',
      actionLabel: '求解',
      fields: [
        { id: 'a', label: '二次项系数 a', type: 'number', value: 1, step: 'any' },
        { id: 'b', label: '一次项系数 b', type: 'number', value: -3, step: 'any' },
        { id: 'c', label: '常数项 c', type: 'number', value: 2, step: 'any' }
      ],
      hint: '求 ax² + bx + c = 0 的根，自动判断实数根 / 复数根，并给出顶点与对称轴。',
      run: function (v) {
        var a = Number(v.a);
        var b = Number(v.b);
        var c = Number(v.c);
        if (!isFinite(a) || !isFinite(b) || !isFinite(c)) return { error: '系数需要是数字' };
        if (a === 0) {
          if (b === 0) return { error: 'a 与 b 同时为 0，不是有效方程' };
          return {
            output: 'x = ' + fmtNum(-c / b, 8),
            rows: [{ key: '类型', value: '一次方程' }, { key: '解', value: fmtNum(-c / b, 8) }],
            note: 'a = 0 时退化为一元一次方程'
          };
        }
        var delta = b * b - 4 * a * c;
        var vertexX = -b / (2 * a);
        var vertexY = a * vertexX * vertexX + b * vertexX + c;
        var rows = [
          { key: '判别式 Δ', value: fmtNum(delta, 8) },
          { key: '对称轴', value: 'x = ' + fmtNum(vertexX, 6) },
          { key: '顶点', value: '(' + fmtNum(vertexX, 6) + ', ' + fmtNum(vertexY, 6) + ')' },
          { key: '开口方向', value: a > 0 ? '向上（有最小值）' : '向下（有最大值）' }
        ];
        var output;
        if (delta > 0) {
          var r1 = (-b + Math.sqrt(delta)) / (2 * a);
          var r2 = (-b - Math.sqrt(delta)) / (2 * a);
          output = 'x₁ = ' + fmtNum(r1, 8) + '，x₂ = ' + fmtNum(r2, 8);
          rows.unshift({ key: '根', value: output });
          rows.push({ key: '根的类型', value: '两个不相等的实数根' });
        } else if (delta === 0) {
          output = 'x₁ = x₂ = ' + fmtNum(vertexX, 8);
          rows.unshift({ key: '根', value: output });
          rows.push({ key: '根的类型', value: '两个相等的实数根（重根）' });
        } else {
          var real = -b / (2 * a);
          var imag = Math.sqrt(-delta) / (2 * a);
          output = 'x₁ = ' + fmtNum(real, 6) + ' + ' + fmtNum(Math.abs(imag), 6) + 'i，x₂ = ' +
            fmtNum(real, 6) + ' − ' + fmtNum(Math.abs(imag), 6) + 'i';
          rows.unshift({ key: '根', value: output });
          rows.push({ key: '根的类型', value: '一对共轭复数根' });
        }
        return { html: '<div class="big-result" style="font-size:18px">' + K.esc(output) + '</div>', rows: rows, note: 'Δ = ' + fmtNum(delta, 6) };
      }
    });
  }

  /* ------------------------------ 15. 三角形计算 ------------------------------ */
  function renderTriangle(root) {
    K.form(root, {
      uid: 'tri',
      actionLabel: '计算',
      fields: [
        { id: 'a', label: '边 a', type: 'number', value: 3, min: 0, step: 'any' },
        { id: 'b', label: '边 b', type: 'number', value: 4, min: 0, step: 'any' },
        { id: 'c', label: '边 c', type: 'number', value: 5, min: 0, step: 'any' }
      ],
      hint: '输入三条边，输出面积、角度、高、外接圆与内切圆半径。',
      run: function (v) {
        var a = Number(v.a);
        var b = Number(v.b);
        var c = Number(v.c);
        if (![a, b, c].every(function (x) { return isFinite(x) && x > 0; })) return { error: '三条边都需要是正数' };
        var sorted = [a, b, c].sort(function (x, y) { return x - y; });
        if (sorted[0] + sorted[1] <= sorted[2]) return { error: '这三条边无法构成三角形（两边之和需大于第三边）' };

        var p = a + b + c;
        var s = p / 2;
        var area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
        var deg = function (rad) { return rad * 180 / Math.PI; };
        var angleA = deg(Math.acos((b * b + c * c - a * a) / (2 * b * c)));
        var angleB = deg(Math.acos((a * a + c * c - b * b) / (2 * a * c)));
        var angleC = 180 - angleA - angleB;
        var type = '不等边三角形';
        var eq = [a === b, b === c, a === c].filter(Boolean).length;
        if (eq === 3) type = '等边三角形';
        else if (eq === 1) type = '等腰三角形';
        if (Math.abs(angleC - 90) < 1e-6 || Math.abs(angleA - 90) < 1e-6 || Math.abs(angleB - 90) < 1e-6) type += '（直角）';
        else if (Math.max(angleA, angleB, angleC) > 90) type += '（钝角）';
        else type += '（锐角）';

        return {
          html: '<div class="big-result">面积 ' + fmtNum(area, 4) + '</div>',
          rows: [
            { key: '周长', value: fmtNum(p, 4) },
            { key: '半周长', value: fmtNum(s, 4) },
            { key: '面积', value: fmtNum(area, 6) },
            { key: '角 A / B / C', value: fmtNum(angleA, 3) + '° / ' + fmtNum(angleB, 3) + '° / ' + fmtNum(angleC, 3) + '°' },
            { key: '高（对应 a）', value: fmtNum(2 * area / a, 4) },
            { key: '外接圆半径 R', value: fmtNum(a * b * c / (4 * area), 4) },
            { key: '内切圆半径 r', value: fmtNum(area / s, 4) },
            { key: '类型', value: type }
          ],
          note: '三角形面积 ' + fmtNum(area, 4) + '（海伦公式）'
        };
      }
    });
  }

  /* ------------------------------ 16. 小费与分账 ------------------------------ */
  function renderTip(root) {
    K.form(root, {
      uid: 'tip',
      actionLabel: '计算',
      fields: [
        { id: 'amount', label: '账单金额', type: 'number', value: 268, min: 0, step: 'any' },
        { id: 'rate', label: '小费比例（%）', type: 'number', value: 10, min: 0, step: 'any' },
        { id: 'people', label: '人数', type: 'number', value: 4, min: 1 },
        { id: 'round', label: '每人金额向上取整到元', type: 'checkbox' }
      ],
      hint: '适合聚餐 AA、打车分摊；向上取整时多出的零头会单独提示。',
      run: function (v) {
        var amount = Number(v.amount);
        var rate = Number(v.rate);
        var people = Math.max(1, Math.round(Number(v.people)));
        if (!isFinite(amount) || amount < 0) return { error: '账单金额需要是非负数字' };
        if (!isFinite(rate) || rate < 0) return { error: '小费比例需要是非负数字' };

        var tip = amount * rate / 100;
        var total = amount + tip;
        var each = total / people;
        var payEach = v.round ? Math.ceil(each) : each;
        var collected = payEach * people;

        return {
          html: '<div class="big-result">每人 ¥' + money(payEach) + '</div>',
          rows: [
            { key: '账单金额', value: '¥' + money(amount) },
            { key: '小费', value: '¥' + money(tip) + '（' + fmtNum(rate) + '%）' },
            { key: '合计', value: '¥' + money(total) },
            { key: '人均（精确）', value: '¥' + money(each) },
            { key: '人均（实付）', value: '¥' + money(payEach) },
            { key: '多收零头', value: '¥' + money(collected - total) }
          ],
          note: people + ' 人分摊，合计 ¥' + money(total)
        };
      }
    });
  }

  /* ------------------------------ 17. 单价比较 ------------------------------ */
  function renderPriceUnit(root) {
    K.form(root, {
      uid: 'pu',
      actionLabel: '比较',
      fields: [
        { id: 'pa', label: '商品 A 价格', type: 'number', value: 25.8, min: 0, step: 'any' },
        { id: 'qa', label: '商品 A 数量', type: 'number', value: 500, min: 0, step: 'any' },
        { id: 'pb', label: '商品 B 价格', type: 'number', value: 39.9, min: 0, step: 'any' },
        { id: 'qb', label: '商品 B 数量', type: 'number', value: 750, min: 0, step: 'any' },
        { id: 'unit', label: '计量单位', type: 'text', value: '克', mono: false }
      ],
      hint: '常用于超市比价（元/100g）、纸巾比价（元/抽）等场景。',
      run: function (v) {
        var pa = Number(v.pa);
        var qa = Number(v.qa);
        var pb = Number(v.pb);
        var qb = Number(v.qb);
        if (![pa, qa, pb, qb].every(function (x) { return isFinite(x) && x > 0; })) {
          return { error: '价格与数量都需要是大于 0 的数字' };
        }
        var ua = pa / qa;
        var ub = pb / qb;
        var cheaper = ua < ub ? 'A' : ua > ub ? 'B' : '两者相同';
        var diffPct = Math.abs(ua - ub) / Math.max(ua, ub) * 100;
        return {
          html: '<div class="big-result">' + (cheaper === '两者相同' ? '单价相同' : cheaper + ' 更划算') + '</div>',
          rows: [
            { key: 'A 单价', value: '¥' + fmtNum(ua, 6) + ' / ' + v.unit },
            { key: 'B 单价', value: '¥' + fmtNum(ub, 6) + ' / ' + v.unit },
            { key: '单价差', value: '¥' + fmtNum(Math.abs(ua - ub), 6) + ' / ' + v.unit },
            { key: '便宜幅度', value: fmtNum(diffPct, 2) + '%' },
            { key: '按 A 的量买 B 需花', value: '¥' + fmtNum(ub * qa, 2) },
            { key: '按 B 的量买 A 需花', value: '¥' + fmtNum(ua * qb, 2) }
          ],
          note: cheaper === '两者相同' ? '两者单价一致' : cheaper + ' 的单价更低，便宜 ' + fmtNum(diffPct, 2) + '%'
        };
      }
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['salary-tax'] = renderSalary;
  window.ToolModules['savings'] = renderSavings;
  window.ToolModules['unit-pressure'] = renderPressure;
  window.ToolModules['unit-energy'] = renderEnergy;
  window.ToolModules['unit-power'] = renderPower;
  window.ToolModules['unit-angle'] = renderAngle;
  window.ToolModules['unit-fuel'] = renderFuel;
  window.ToolModules['unit-shoe'] = renderShoe;
  window.ToolModules['fraction-calc'] = renderFraction;
  window.ToolModules['bignum-calc'] = renderBigNum;
  window.ToolModules['prime-factor'] = renderPrime;
  window.ToolModules['gcd-lcm'] = renderGcdLcm;
  window.ToolModules['stat-basic'] = renderStat;
  window.ToolModules['quadratic'] = renderQuadratic;
  window.ToolModules['triangle-calc'] = renderTriangle;
  window.ToolModules['tip-split'] = renderTip;
  window.ToolModules['price-unit'] = renderPriceUnit;
})();
