/* =============================================================================
 * 计算换算工具包（16 个）
 * -----------------------------------------------------------------------------
 * unit-length / unit-weight / unit-area / unit-volume / unit-speed /
 * unit-temperature / unit-data / unit-time / bmi-calc / loan-calc /
 * discount-calc / percentage-calc / number-base / roman-numeral /
 * chinese-number / compound-interest
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  /* ------------------------------ 通用单位换算 ------------------------------ */

  function unitForm(root, cfg) {
    var units = cfg.units;
    var options = units.map(function (unit) { return { value: unit.id, label: unit.label }; });

    K.form(root, {
      uid: cfg.uid,
      actionLabel: '换算',
      fields: [
        { id: 'value', label: '数值', type: 'number', value: cfg.value === undefined ? 1 : cfg.value, step: 'any' },
        { id: 'from', label: '从', type: 'select', value: cfg.from, options: options },
        { id: 'to', label: '到', type: 'select', value: cfg.to, options: options }
      ],
      sample: cfg.sample,
      run: function (values) {
        var value = parseFloat(values.value);
        if (!isFinite(value)) return { error: '请输入有效数字。' };
        var from = units.filter(function (u) { return u.id === values.from; })[0];
        var to = units.filter(function (u) { return u.id === values.to; })[0];
        if (!from || !to) return { error: '请选择有效的单位。' };

        var baseValue = value * from.factor;
        var result = baseValue / to.factor;

        var rows = units.map(function (unit) {
          return { key: unit.label, value: K.num(baseValue / unit.factor, 8) };
        });

        return {
          html: '<div class="big-result">' + K.esc(K.num(value, 8)) + ' ' + K.esc(from.label) +
            ' = <strong>' + K.esc(K.num(result, 8)) + '</strong> ' + K.esc(to.label) + '</div>',
          rows: rows,
          note: '换算结果保留 8 位有效小数，已自动去除末尾多余的 0。'
        };
      }
    });
  }

  /* ------------------------------ 长度 ------------------------------ */
  function renderLength(root) {
    unitForm(root, {
      uid: 'len',
      from: 'm', to: 'ft', value: 1,
      sample: { value: 100, from: 'm', to: 'km' },
      units: [
        { id: 'mm', label: '毫米 mm', factor: 0.001 },
        { id: 'cm', label: '厘米 cm', factor: 0.01 },
        { id: 'dm', label: '分米 dm', factor: 0.1 },
        { id: 'm', label: '米 m', factor: 1 },
        { id: 'km', label: '千米 km', factor: 1000 },
        { id: 'chi', label: '尺（市制）', factor: 1 / 3 },
        { id: 'cun', label: '寸（市制）', factor: 0.1 / 3 },
        { id: 'li', label: '里（市制）', factor: 500 },
        { id: 'in', label: '英寸 in', factor: 0.0254 },
        { id: 'ft', label: '英尺 ft', factor: 0.3048 },
        { id: 'yd', label: '码 yd', factor: 0.9144 },
        { id: 'mi', label: '英里 mi', factor: 1609.344 },
        { id: 'nmi', label: '海里 nmi', factor: 1852 }
      ]
    });
  }

  /* ------------------------------ 重量 ------------------------------ */
  function renderWeight(root) {
    unitForm(root, {
      uid: 'wt',
      from: 'kg', to: 'jin', value: 1,
      sample: { value: 70, from: 'kg', to: 'lb' },
      units: [
        { id: 'mg', label: '毫克 mg', factor: 0.000001 },
        { id: 'g', label: '克 g', factor: 0.001 },
        { id: 'kg', label: '千克 kg', factor: 1 },
        { id: 't', label: '吨 t', factor: 1000 },
        { id: 'jin', label: '斤（市制）', factor: 0.5 },
        { id: 'liang', label: '两（市制）', factor: 0.05 },
        { id: 'lb', label: '磅 lb', factor: 0.45359237 },
        { id: 'oz', label: '盎司 oz', factor: 0.028349523125 },
        { id: 'st', label: '英石 st', factor: 6.35029318 },
        { id: 'ct', label: '克拉 ct', factor: 0.0002 }
      ]
    });
  }

  /* ------------------------------ 面积 ------------------------------ */
  function renderArea(root) {
    unitForm(root, {
      uid: 'area',
      from: 'm2', to: 'ping', value: 100,
      sample: { value: 120, from: 'm2', to: 'ping' },
      units: [
        { id: 'cm2', label: '平方厘米 cm²', factor: 0.0001 },
        { id: 'm2', label: '平方米 m²', factor: 1 },
        { id: 'km2', label: '平方千米 km²', factor: 1000000 },
        { id: 'ha', label: '公顷 ha', factor: 10000 },
        { id: 'mu', label: '亩（市制）', factor: 666.6666666667 },
        { id: 'ping', label: '坪（台湾）', factor: 3.305785 },
        { id: 'ft2', label: '平方英尺 ft²', factor: 0.09290304 },
        { id: 'in2', label: '平方英寸 in²', factor: 0.00064516 },
        { id: 'acre', label: '英亩 acre', factor: 4046.8564224 },
        { id: 'mi2', label: '平方英里 mi²', factor: 2589988.110336 }
      ]
    });
  }

  /* ------------------------------ 体积 ------------------------------ */
  function renderVolume(root) {
    unitForm(root, {
      uid: 'vol',
      from: 'l', to: 'ml', value: 1,
      sample: { value: 2, from: 'l', to: 'galus' },
      units: [
        { id: 'ml', label: '毫升 mL', factor: 0.001 },
        { id: 'l', label: '升 L', factor: 1 },
        { id: 'm3', label: '立方米 m³', factor: 1000 },
        { id: 'cm3', label: '立方厘米 cm³', factor: 0.001 },
        { id: 'galus', label: '加仑（美制）', factor: 3.785411784 },
        { id: 'galuk', label: '加仑（英制）', factor: 4.54609 },
        { id: 'pintus', label: '品脱（美制）', factor: 0.473176473 },
        { id: 'cupus', label: '杯（美制）', factor: 0.2365882365 },
        { id: 'flozus', label: '液量盎司（美制）', factor: 0.0295735295625 },
        { id: 'ft3', label: '立方英尺 ft³', factor: 28.316846592 }
      ]
    });
  }

  /* ------------------------------ 速度 ------------------------------ */
  function renderSpeed(root) {
    unitForm(root, {
      uid: 'spd',
      from: 'kmh', to: 'ms', value: 100,
      sample: { value: 120, from: 'kmh', to: 'mph' },
      units: [
        { id: 'ms', label: '米/秒 m/s', factor: 1 },
        { id: 'kmh', label: '千米/小时 km/h', factor: 1 / 3.6 },
        { id: 'mph', label: '英里/小时 mph', factor: 0.44704 },
        { id: 'knot', label: '节 kn', factor: 0.514444444 },
        { id: 'fts', label: '英尺/秒 ft/s', factor: 0.3048 },
        { id: 'mach', label: '马赫（海平面）', factor: 340.3 }
      ]
    });
  }

  /* ------------------------------ 温度 ------------------------------ */
  function renderTemperature(root) {
    var units = [
      { id: 'c', label: '摄氏度 °C' },
      { id: 'f', label: '华氏度 °F' },
      { id: 'k', label: '开尔文 K' },
      { id: 'r', label: '兰氏度 °R' }
    ];

    function toCelsius(value, unit) {
      if (unit === 'f') return (value - 32) * 5 / 9;
      if (unit === 'k') return value - 273.15;
      if (unit === 'r') return (value - 491.67) * 5 / 9;
      return value;
    }

    function fromCelsius(c, unit) {
      if (unit === 'f') return c * 9 / 5 + 32;
      if (unit === 'k') return c + 273.15;
      if (unit === 'r') return (c + 273.15) * 9 / 5;
      return c;
    }

    K.form(root, {
      uid: 'temp',
      actionLabel: '换算',
      fields: [
        { id: 'value', label: '温度值', type: 'number', value: 25, step: 'any' },
        {
          id: 'from', label: '单位', type: 'select', value: 'c',
          options: units.map(function (u) { return { value: u.id, label: u.label }; })
        }
      ],
      sample: { value: 98.6, from: 'f' },
      run: function (values) {
        var value = parseFloat(values.value);
        if (!isFinite(value)) return { error: '请输入有效数字。' };
        var celsius = toCelsius(value, values.from);
        if (celsius < -273.15) return { error: '低于绝对零度（-273.15 °C），物理上不存在。' };

        var rows = units.map(function (unit) {
          return { key: unit.label, value: K.num(fromCelsius(celsius, unit.id), 4) };
        });
        rows.push({
          key: '体感提示',
          value: celsius <= 0 ? '冰点以下' : celsius < 15 ? '偏冷' : celsius < 26 ? '舒适' : celsius < 32 ? '偏热' : '高温'
        });

        return {
          html: '<div class="big-result">' + K.esc(K.num(celsius, 4)) + ' °C</div>',
          rows: rows,
          note: '换算公式：°F = °C × 9/5 + 32；K = °C + 273.15。'
        };
      }
    });
  }

  /* ------------------------------ 数据存储 ------------------------------ */
  function renderData(root) {
    var units = [
      { id: 'bit', label: '位 bit', factor: 1 / 8 },
      { id: 'b', label: '字节 B', factor: 1 },
      { id: 'kb', label: 'KB（1000）', factor: 1000 },
      { id: 'mb', label: 'MB（1000²）', factor: 1e6 },
      { id: 'gb', label: 'GB（1000³）', factor: 1e9 },
      { id: 'tb', label: 'TB（1000⁴）', factor: 1e12 },
      { id: 'kib', label: 'KiB（1024）', factor: 1024 },
      { id: 'mib', label: 'MiB（1024²）', factor: 1048576 },
      { id: 'gib', label: 'GiB（1024³）', factor: 1073741824 },
      { id: 'tib', label: 'TiB（1024⁴）', factor: 1099511627776 }
    ];

    K.form(root, {
      uid: 'data',
      actionLabel: '换算',
      fields: [
        { id: 'value', label: '数值', type: 'number', value: 1, step: 'any' },
        {
          id: 'from', label: '单位', type: 'select', value: 'gb',
          options: units.map(function (u) { return { value: u.id, label: u.label }; })
        }
      ],
      sample: { value: 500, from: 'gb' },
      run: function (values) {
        var value = parseFloat(values.value);
        if (!isFinite(value)) return { error: '请输入有效数字。' };
        var from = units.filter(function (u) { return u.id === values.from; })[0];
        var bytes = value * from.factor;

        var rows = units.map(function (unit) {
          var converted = bytes / unit.factor;
          return { key: unit.label, value: converted >= 1e9 ? converted.toExponential(6) : K.num(converted, 6) };
        });
        rows.push({ key: '通俗描述', value: K.formatBytes(bytes) + '（按 1024 进制）' });

        return {
          html: '<div class="big-result">' + K.esc(K.num(value, 6)) + ' ' + K.esc(from.label) +
            ' = ' + K.esc(K.formatBytes(bytes)) + '</div>',
          rows: rows,
          note: '存储厂商多用 1000 进制（GB），操作系统多用 1024 进制（GiB），这是「买 1TB 只显示 931GB」的原因。'
        };
      }
    });
  }

  /* ------------------------------ 时间单位 ------------------------------ */
  function renderTimeUnit(root) {
    var units = [
      { id: 'ms', label: '毫秒 ms', factor: 0.001 },
      { id: 's', label: '秒 s', factor: 1 },
      { id: 'min', label: '分钟 min', factor: 60 },
      { id: 'h', label: '小时 h', factor: 3600 },
      { id: 'd', label: '天 d', factor: 86400 },
      { id: 'w', label: '周 w', factor: 604800 },
      { id: 'mon', label: '月（30 天）', factor: 2592000 },
      { id: 'y', label: '年（365 天）', factor: 31536000 }
    ];

    K.form(root, {
      uid: 'tunit',
      actionLabel: '换算',
      fields: [
        { id: 'value', label: '数值', type: 'number', value: 1, step: 'any' },
        {
          id: 'from', label: '单位', type: 'select', value: 'h',
          options: units.map(function (u) { return { value: u.id, label: u.label }; })
        }
      ],
      sample: { value: 90, from: 'min' },
      run: function (values) {
        var value = parseFloat(values.value);
        if (!isFinite(value)) return { error: '请输入有效数字。' };
        var from = units.filter(function (u) { return u.id === values.from; })[0];
        var seconds = value * from.factor;
        var rows = units.map(function (unit) {
          return { key: unit.label, value: K.num(seconds / unit.factor, 6) };
        });
        return {
          html: '<div class="big-result">' + K.esc(K.num(value, 6)) + ' ' + K.esc(from.label) + ' = ' + K.esc(K.num(seconds, 4)) + ' 秒</div>',
          rows: rows,
          note: '按 1 月 = 30 天、1 年 = 365 天估算，与日历实际长度存在差异。'
        };
      }
    });
  }

  /* ------------------------------ BMI ------------------------------ */
  function renderBmi(root) {
    K.form(root, {
      uid: 'bmi',
      actionLabel: '计算 BMI',
      fields: [
        { id: 'height', label: '身高（cm）', type: 'number', value: 170, min: 50, max: 260, step: '0.1' },
        { id: 'weight', label: '体重（kg）', type: 'number', value: 65, min: 10, max: 400, step: '0.1' },
        {
          id: 'standard', label: '标准', type: 'select', value: 'cn',
          options: [{ value: 'cn', label: '中国标准' }, { value: 'who', label: 'WHO 国际标准' }]
        },
        {
          id: 'gender', label: '性别（用于基础代谢）', type: 'select', value: 'm',
          options: [{ value: 'm', label: '男' }, { value: 'f', label: '女' }]
        }
      ],
      sample: { height: 175, weight: 70 },
      run: function (values) {
        var height = parseFloat(values.height) / 100;
        var weight = parseFloat(values.weight);
        if (!isFinite(height) || height <= 0) return { error: '请输入有效身高（cm）。' };
        if (!isFinite(weight) || weight <= 0) return { error: '请输入有效体重（kg）。' };

        var bmi = weight / (height * height);
        var category;
        if (values.standard === 'cn') {
          if (bmi < 18.5) category = '偏瘦';
          else if (bmi < 24) category = '正常';
          else if (bmi < 28) category = '超重';
          else category = '肥胖';
        } else {
          if (bmi < 18.5) category = '偏瘦';
          else if (bmi < 25) category = '正常';
          else if (bmi < 30) category = '超重';
          else category = '肥胖';
        }

        var low = 18.5 * height * height;
        var high = (values.standard === 'cn' ? 24 : 25) * height * height;
        var bmr = 10 * weight + 6.25 * parseFloat(values.height) - 5 * 30 + (values.gender === 'f' ? -161 : 5);

        return {
          html: '<div class="big-result">BMI <strong>' + K.num(bmi, 1) + '</strong> · ' + K.esc(category) + '</div>',
          rows: [
            { key: 'BMI 数值', value: K.num(bmi, 2) },
            { key: '体型分类', value: category + '（' + (values.standard === 'cn' ? '中国' : 'WHO') + '标准）' },
            { key: '健康体重区间', value: K.num(low, 1) + ' – ' + K.num(high, 1) + ' kg' },
            { key: '与区间差值', value: weight < low ? '偏轻 ' + K.num(low - weight, 1) + ' kg'
              : weight > high ? '超重 ' + K.num(weight - high, 1) + ' kg' : '处于区间内' },
            { key: '基础代谢（估算）', value: K.num(bmr, 0) + ' kcal/天（按 30 岁' + (values.gender === 'f' ? '女性' : '男性') + '公式）' }
          ],
          note: 'BMI 只反映体重与身高的比例，不区分肌肉与脂肪，运动员、孕妇、儿童不宜直接套用。'
        };
      }
    });
  }

  /* ------------------------------ 贷款计算 ------------------------------ */
  function renderLoan(root) {
    K.form(root, {
      uid: 'loan',
      actionLabel: '计算还款',
      fields: [
        { id: 'amount', label: '贷款金额（元）', type: 'number', value: 1000000, min: 0, step: '1000' },
        { id: 'rate', label: '年利率（%）', type: 'number', value: 3.6, min: 0, max: 36, step: '0.01' },
        { id: 'years', label: '贷款年限（年）', type: 'number', value: 30, min: 1, max: 40, step: 1 },
        {
          id: 'method', label: '还款方式', type: 'select', value: 'equal',
          options: [
            { value: 'equal', label: '等额本息（每月相同）' },
            { value: 'principal', label: '等额本金（逐月递减）' }
          ]
        }
      ],
      sample: { amount: 1000000, rate: 3.6, years: 30 },
      run: function (values) {
        var amount = parseFloat(values.amount);
        var annual = parseFloat(values.rate) / 100;
        var years = parseInt(values.years, 10);
        if (!isFinite(amount) || amount <= 0) return { error: '请输入有效的贷款金额。' };
        if (!isFinite(annual) || annual < 0) return { error: '请输入有效的年利率。' };
        if (!isFinite(years) || years <= 0) return { error: '请输入有效的贷款年限。' };

        var months = years * 12;
        var rate = annual / 12;
        var table;
        var firstPayment;
        var lastPayment;
        var totalInterest;

        if (values.method === 'equal') {
          var payment = rate === 0
            ? amount / months
            : amount * rate * Math.pow(1 + rate, months) / (Math.pow(1 + rate, months) - 1);
          firstPayment = payment;
          lastPayment = payment;
          totalInterest = payment * months - amount;

          var balance = amount;
          table = [];
          for (var i = 1; i <= Math.min(12, months); i += 1) {
            var interest = balance * rate;
            var principal = payment - interest;
            balance -= principal;
            table.push([i, K.num(payment, 2), K.num(principal, 2), K.num(interest, 2), K.num(Math.max(balance, 0), 2)]);
          }
        } else {
          var principalPart = amount / months;
          firstPayment = principalPart + amount * rate;
          lastPayment = principalPart + principalPart * rate;
          // 等额本金总利息 = 月利率 × 本金 × (期数 + 1) ÷ 2（剩余本金构成等差数列）
          totalInterest = rate * amount * (months + 1) / 2;
          var rest = amount;
          table = [];
          for (var j = 1; j <= Math.min(12, months); j += 1) {
            var interest2 = rest * rate;
            rest -= principalPart;
            table.push([j, K.num(principalPart + interest2, 2), K.num(principalPart, 2), K.num(interest2, 2), K.num(Math.max(rest, 0), 2)]);
          }
        }

        return {
          html: '<div class="big-result">首月还款 <strong>' + K.num(firstPayment, 2) + '</strong> 元' +
            (values.method === 'principal' ? '，每月递减 ' + K.num(amount / months * rate, 2) + ' 元' : '') + '</div>' +
            '<h2 class="sub-title">前 12 期还款明细</h2>' +
            K.table(['期数', '月供', '本金', '利息', '剩余本金'], table, { maxHeight: '360px' }),
          rows: [
            { key: '贷款总额', value: K.group(K.num(amount, 2)) + ' 元' },
            { key: '还款月数', value: months + ' 期' },
            { key: '首月月供', value: K.num(firstPayment, 2) + ' 元' },
            { key: '末月月供', value: K.num(lastPayment, 2) + ' 元' },
            { key: '支付利息总额', value: K.group(K.num(totalInterest, 2)) + ' 元' },
            { key: '还款总额', value: K.group(K.num(amount + totalInterest, 2)) + ' 元' },
            { key: '利息占本金', value: K.num(totalInterest / amount * 100, 2) + '%' }
          ],
          note: '按月利率 = 年利率 ÷ 12 计算，未考虑提前还款、LPR 浮动与手续费。结果仅供参考。'
        };
      }
    });
  }

  /* ------------------------------ 折扣计算 ------------------------------ */
  function renderDiscount(root) {
    K.form(root, {
      uid: 'discount',
      actionLabel: '计算价格',
      fields: [
        { id: 'price', label: '原价（元）', type: 'number', value: 299, min: 0, step: '0.01' },
        { id: 'discount', label: '折扣（几折）', type: 'number', value: 8.5, min: 0, max: 10, step: '0.1' },
        { id: 'coupon', label: '额外立减（元）', type: 'number', value: 0, min: 0, step: '1' }
      ],
      sample: { price: 399, discount: 7.5, coupon: 20 },
      run: function (values) {
        var price = parseFloat(values.price);
        var discount = parseFloat(values.discount);
        var coupon = parseFloat(values.coupon) || 0;
        if (!isFinite(price) || price < 0) return { error: '请输入有效原价。' };
        if (!isFinite(discount) || discount < 0 || discount > 10) return { error: '折扣需在 0–10 之间（如 8.5 折）。' };

        var afterDiscount = price * discount / 10;
        var final = Math.max(afterDiscount - coupon, 0);
        var saved = price - final;

        return {
          html: '<div class="big-result">实付 <strong>¥' + K.num(final, 2) + '</strong></div>',
          rows: [
            { key: '原价', value: '¥' + K.num(price, 2) },
            { key: '折扣', value: discount + ' 折（相当于 ' + K.num(discount * 10, 0) + '%）' },
            { key: '折后价', value: '¥' + K.num(afterDiscount, 2) },
            { key: '立减金额', value: '¥' + K.num(coupon, 2) },
            { key: '实付金额', value: '¥' + K.num(final, 2) },
            { key: '共节省', value: '¥' + K.num(saved, 2) + '（' + K.num(saved / price * 100, 1) + '%）' }
          ],
          note: coupon > afterDiscount ? '立减金额超过折后价，实付按 0 元计算。' : ''
        };
      }
    });
  }

  /* ------------------------------ 百分比 ------------------------------ */
  function renderPercentage(root) {
    K.form(root, {
      uid: 'pct',
      actionLabel: '计算',
      fields: [
        {
          id: 'mode', label: '计算类型', type: 'select', value: 'of',
          options: [
            { value: 'of', label: 'A 的 B% 是多少' },
            { value: 'ratio', label: 'A 是 B 的百分之几' },
            { value: 'change', label: '从 A 到 B 的变化率' },
            { value: 'add', label: 'A 增加 B% 后是多少' },
            { value: 'sub', label: 'A 减少 B% 后是多少' }
          ]
        },
        { id: 'a', label: '数值 A', type: 'number', value: 200, step: 'any' },
        { id: 'b', label: '数值 B / 百分比', type: 'number', value: 15, step: 'any' }
      ],
      sample: { mode: 'of', a: 200, b: 15 },
      run: function (values) {
        var a = parseFloat(values.a);
        var b = parseFloat(values.b);
        if (!isFinite(a) || !isFinite(b)) return { error: '请输入有效数字。' };

        var result;
        var expression;
        if (values.mode === 'of') {
          result = a * b / 100;
          expression = a + ' × ' + b + '%';
        } else if (values.mode === 'ratio') {
          if (b === 0) return { error: '除数 B 不能为 0。' };
          result = a / b * 100;
          expression = a + ' ÷ ' + b + ' × 100%';
        } else if (values.mode === 'change') {
          if (a === 0) return { error: '起始值 A 不能为 0，否则无法计算变化率。' };
          result = (b - a) / Math.abs(a) * 100;
          expression = '(' + b + ' − ' + a + ') ÷ |' + a + '| × 100%';
        } else if (values.mode === 'add') {
          result = a * (1 + b / 100);
          expression = a + ' × (1 + ' + b + '%)';
        } else {
          result = a * (1 - b / 100);
          expression = a + ' × (1 − ' + b + '%)';
        }

        var isPercent = values.mode === 'ratio' || values.mode === 'change';
        return {
          html: '<div class="big-result">' + K.esc(expression) + ' = <strong>' +
            K.esc(K.num(result, 4)) + (isPercent ? '%' : '') + '</strong></div>',
          rows: [
            { key: '结果', value: K.num(result, 6) + (isPercent ? '%' : '') },
            { key: '计算式', value: expression },
            { key: '四舍五入（2 位）', value: K.num(result, 2) + (isPercent ? '%' : '') }
          ],
          note: isPercent ? '百分数结果保留 6 位小数。' : '数值结果保留 6 位小数。'
        };
      }
    });
  }

  /* ------------------------------ 进制转换 ------------------------------ */
  var DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

  function parseByBase(text, base) {
    var clean = String(text).trim().toLowerCase().replace(/[\s_]/g, '');
    var prefix = { 2: '0b', 8: '0o', 16: '0x' }[base];
    if (prefix && clean.indexOf(prefix) === 0) clean = clean.slice(2);
    if (!clean) throw new Error('请输入要转换的数值。');
    var negative = clean.charAt(0) === '-';
    if (negative) clean = clean.slice(1);
    var value = BigInt(0);
    var bigBase = BigInt(base);
    for (var i = 0; i < clean.length; i += 1) {
      var digit = DIGITS.indexOf(clean.charAt(i));
      if (digit === -1 || digit >= base) throw new Error('字符「' + clean.charAt(i) + '」不属于 ' + base + ' 进制。');
      value = value * bigBase + BigInt(digit);
    }
    return negative ? -value : value;
  }

  function renderNumberBase(root) {
    var bases = [
      { id: 2, label: '二进制 (2)' }, { id: 8, label: '八进制 (8)' },
      { id: 10, label: '十进制 (10)' }, { id: 16, label: '十六进制 (16)' },
      { id: 36, label: '三十六进制 (36)' }
    ];

    K.form(root, {
      uid: 'base',
      actionLabel: '转换',
      fields: [
        { id: 'value', label: '数值', type: 'text', value: '255', wide: true, placeholder: '支持 0x / 0b / 0o 前缀' },
        {
          id: 'from', label: '源进制', type: 'select', value: 10,
          options: bases.map(function (b) { return { value: b.id, label: b.label }; })
        },
        { id: 'custom', label: '自定义进制（2–36）', type: 'number', value: 32, min: 2, max: 36, step: 1 }
      ],
      sample: { value: '0xFF', from: 16 },
      run: function (values) {
        var base = parseInt(values.from, 10);
        var value;
        try {
          value = parseByBase(values.value, base);
        } catch (error) {
          return { error: error.message };
        }

        var rows = bases.map(function (item) {
          return { key: item.label, value: value.toString(item.id).toUpperCase() };
        });
        var custom = parseInt(values.custom, 10);
        if (isFinite(custom) && custom >= 2 && custom <= 36) {
          rows.push({ key: '自定义 ' + custom + ' 进制', value: value.toString(custom).toUpperCase() });
        }
        rows.push({ key: '十进制（千分位）', value: K.group(value.toString()) });
        rows.push({ key: '位宽（二进制）', value: value.toString(2).replace('-', '').length + ' 位' });

        return {
          html: '<div class="big-result">' + K.esc(value.toString(10)) + '<span style="font-size:14px;color:var(--text-3)"> (10)</span></div>',
          rows: rows,
          note: '使用 BigInt 精确计算，支持超过 2^53 的大整数。'
        };
      }
    });
  }

  /* ------------------------------ 罗马数字 ------------------------------ */
  var ROMAN_MAP = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
  ];

  function toRoman(num) {
    var out = '';
    var rest = num;
    ROMAN_MAP.forEach(function (pair) {
      while (rest >= pair[0]) { out += pair[1]; rest -= pair[0]; }
    });
    return out;
  }

  function fromRoman(text) {
    var str = String(text).toUpperCase().replace(/\s/g, '');
    if (!/^[IVXLCDM]+$/.test(str)) throw new Error('只能包含 I、V、X、L、C、D、M。');
    var values = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
    var total = 0;
    for (var i = 0; i < str.length; i += 1) {
      var current = values[str.charAt(i)];
      var next = values[str.charAt(i + 1)] || 0;
      total += current < next ? -current : current;
    }
    if (toRoman(total) !== str) throw new Error('不是规范的罗马数字写法（如 4 应写作 IV，而不是 IIII）。');
    return total;
  }

  function renderRoman(root) {
    K.form(root, {
      uid: 'roman',
      actionLabel: '转换',
      fields: [
        {
          id: 'mode', label: '方向', type: 'select', value: 'toRoman',
          options: [
            { value: 'toRoman', label: '阿拉伯数字 → 罗马数字' },
            { value: 'toNumber', label: '罗马数字 → 阿拉伯数字' }
          ]
        },
        { id: 'value', label: '输入', type: 'text', value: '2024', wide: true }
      ],
      sample: { mode: 'toRoman', value: '1987' },
      run: function (values) {
        var raw = String(values.value || '').trim();
        if (!raw) return { error: '请输入内容。' };
        if (values.mode === 'toRoman') {
          var num = parseInt(raw, 10);
          if (!isFinite(num) || num < 1 || num > 3999) return { error: '罗马数字只支持 1–3999 的整数。' };
          var roman = toRoman(num);
          return {
            html: '<div class="big-result"><strong>' + K.esc(roman) + '</strong></div>',
            rows: [
              { key: '阿拉伯数字', value: num },
              { key: '罗马数字', value: roman },
              { key: '字符数', value: roman.length }
            ],
            note: '标准罗马数字不表示 0 与负数，最大到 3999（MMMCMXCIX）。'
          };
        }
        try {
          var result = fromRoman(raw);
          return {
            html: '<div class="big-result"><strong>' + result + '</strong></div>',
            rows: [
              { key: '罗马数字', value: raw.toUpperCase() },
              { key: '阿拉伯数字', value: result },
              { key: '二进制', value: result.toString(2) }
            ],
            note: '已校验是否符合标准减法规则。'
          };
        } catch (error) {
          return { error: error.message };
        }
      }
    });
  }

  /* ------------------------------ 中文数字 / 金额大写 ------------------------------ */
  var CN_DIGITS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  var CN_UNITS = ['', '拾', '佰', '仟'];
  var CN_GROUPS = ['', '万', '亿', '万亿'];

  function groupToChinese(num) {
    var str = String(num);
    var out = '';
    var zero = false;
    for (var i = 0; i < str.length; i += 1) {
      var digit = Number(str.charAt(i));
      var unit = CN_UNITS[str.length - 1 - i];
      if (digit === 0) {
        zero = true;
      } else {
        if (zero && out) out += '零';
        zero = false;
        out += CN_DIGITS[digit] + unit;
      }
    }
    return out;
  }

  function intToChinese(intPart) {
    if (intPart === 0) return '零';
    var groups = [];
    var rest = intPart;
    while (rest > 0) {
      groups.push(rest % 10000);
      rest = Math.floor(rest / 10000);
    }
    var out = '';
    for (var i = groups.length - 1; i >= 0; i -= 1) {
      var group = groups[i];
      if (group === 0) {
        if (out && !/零$/.test(out)) out += '零';
        continue;
      }
      if (out && group < 1000 && !/零$/.test(out)) out += '零';
      out += groupToChinese(group) + CN_GROUPS[i];
    }
    return out.replace(/零+$/, '');
  }

  function toRmbUpper(value) {
    if (value === 0) return '零元整';
    var negative = value < 0;
    var abs = Math.abs(value);
    var intPart = Math.floor(abs);
    var cents = Math.round((abs - intPart) * 100);
    if (cents >= 100) { intPart += 1; cents -= 100; }

    var out = intToChinese(intPart) + '元';
    if (cents === 0) {
      out += '整';
    } else {
      var jiao = Math.floor(cents / 10);
      var fen = cents % 10;
      if (jiao > 0) out += CN_DIGITS[jiao] + '角';
      else if (fen > 0) out += '零';
      if (fen > 0) out += CN_DIGITS[fen] + '分';
      else out += '整';
    }
    return (negative ? '负' : '') + out;
  }

  function renderChineseNumber(root) {
    K.form(root, {
      uid: 'cnnum',
      actionLabel: '转换',
      fields: [
        { id: 'value', label: '数字', type: 'text', value: '1234.56', wide: true, placeholder: '例如 1234.56' },
        {
          id: 'mode', label: '输出', type: 'select', value: 'rmb',
          options: [
            { value: 'rmb', label: '人民币金额大写' },
            { value: 'plain', label: '中文数字读法（壹贰叁）' },
            { value: 'simple', label: '中文数字读法（一二三）' }
          ]
        }
      ],
      sample: { value: '10086.5', mode: 'rmb' },
      run: function (values) {
        var raw = String(values.value || '').trim().replace(/,/g, '').replace(/¥|￥/g, '');
        if (!raw) return { error: '请输入数字。' };
        var num = Number(raw);
        if (!isFinite(num)) return { error: '请输入有效数字。' };
        if (Math.abs(num) >= 1e12) return { error: '数值过大，仅支持小于 1 万亿的金额。' };

        var rmb = toRmbUpper(num);
        var plain = intToChinese(Math.floor(Math.abs(num))) + (num < 0 ? '（负）' : '');
        var simple = plain.replace(/[壹贰叁肆伍陆柒捌玖拾佰仟]/g, function (ch) {
          return { 壹: '一', 贰: '二', 叁: '三', 肆: '四', 伍: '五', 陆: '六', 柒: '七', 捌: '八', 玖: '九', 拾: '十', 佰: '百', 仟: '千' }[ch];
        }).replace(/^一十/, '十');

        var main = values.mode === 'rmb' ? rmb : values.mode === 'simple' ? simple : plain;
        return {
          html: '<div class="big-result" style="font-size:20px"><strong>' + K.esc(main) + '</strong></div>',
          rows: [
            { key: '金额大写', value: rmb },
            { key: '中文读法（大写）', value: plain },
            { key: '中文读法（小写）', value: simple },
            { key: '千分位', value: K.group(K.num(num, 2)) }
          ],
          note: '金额大写按财务规范生成：中间连续 0 只读一个「零」，角分为 0 时以「整」结尾。'
        };
      }
    });
  }

  /* ------------------------------ 复利计算 ------------------------------ */
  function renderCompound(root) {
    K.form(root, {
      uid: 'compound',
      actionLabel: '计算收益',
      fields: [
        { id: 'principal', label: '本金（元）', type: 'number', value: 100000, min: 0, step: '1000' },
        { id: 'rate', label: '年化收益率（%）', type: 'number', value: 5, min: -100, step: '0.1' },
        { id: 'years', label: '投资年限（年）', type: 'number', value: 10, min: 1, max: 60, step: 1 },
        {
          id: 'freq', label: '复利频率', type: 'select', value: 1,
          options: [
            { value: 1, label: '每年' }, { value: 2, label: '每半年' },
            { value: 4, label: '每季度' }, { value: 12, label: '每月' }, { value: 365, label: '每日' }
          ]
        }
      ],
      sample: { principal: 100000, rate: 6, years: 20, freq: 12 },
      run: function (values) {
        var principal = parseFloat(values.principal);
        var rate = parseFloat(values.rate) / 100;
        var years = parseInt(values.years, 10);
        var freq = parseInt(values.freq, 10);
        if (!isFinite(principal) || principal <= 0) return { error: '请输入有效本金。' };
        if (!isFinite(rate)) return { error: '请输入有效年化收益率。' };
        if (!isFinite(years) || years <= 0) return { error: '请输入有效年限。' };

        var periods = years * freq;
        var ratePerPeriod = rate / freq;
        var finalAmount = principal * Math.pow(1 + ratePerPeriod, periods);
        var interest = finalAmount - principal;
        var simple = principal * (1 + rate * years);

        var table = [];
        var balance = principal;
        for (var y = 1; y <= years; y += 1) {
          balance = principal * Math.pow(1 + ratePerPeriod, y * freq);
          table.push([y, K.num(balance, 2), K.num(balance - principal, 2), K.num((balance / principal - 1) * 100, 2) + '%']);
        }

        return {
          html: '<div class="big-result">到期本息 <strong>¥' + K.group(K.num(finalAmount, 2)) + '</strong></div>' +
            K.table(['第 N 年', '本息合计', '累计收益', '累计收益率'], table.slice(0, 30), { maxHeight: '360px' }),
          rows: [
            { key: '本金', value: '¥' + K.group(K.num(principal, 2)) },
            { key: '年化收益率', value: K.num(rate * 100, 2) + '%' },
            { key: '复利次数', value: periods + ' 次（每年 ' + freq + ' 次）' },
            { key: '到期本息', value: '¥' + K.group(K.num(finalAmount, 2)) },
            { key: '复利收益', value: '¥' + K.group(K.num(interest, 2)) },
            { key: '单利收益（对照）', value: '¥' + K.group(K.num(simple - principal, 2)) },
            { key: '复利比单利多赚', value: '¥' + K.group(K.num((finalAmount - simple), 2)) },
            { key: '本息倍数', value: K.num(finalAmount / principal, 3) + ' 倍' }
          ],
          note: '按名义年化收益率计算，未扣除手续费与税费；负收益时结果同样成立。'
        };
      }
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['unit-length'] = renderLength;
  window.ToolModules['unit-weight'] = renderWeight;
  window.ToolModules['unit-area'] = renderArea;
  window.ToolModules['unit-volume'] = renderVolume;
  window.ToolModules['unit-speed'] = renderSpeed;
  window.ToolModules['unit-temperature'] = renderTemperature;
  window.ToolModules['unit-data'] = renderData;
  window.ToolModules['unit-time'] = renderTimeUnit;
  window.ToolModules['bmi-calc'] = renderBmi;
  window.ToolModules['loan-calc'] = renderLoan;
  window.ToolModules['discount-calc'] = renderDiscount;
  window.ToolModules['percentage-calc'] = renderPercentage;
  window.ToolModules['number-base'] = renderNumberBase;
  window.ToolModules['roman-numeral'] = renderRoman;
  window.ToolModules['chinese-number'] = renderChineseNumber;
  window.ToolModules['compound-interest'] = renderCompound;
})();
