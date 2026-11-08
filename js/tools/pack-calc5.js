/* =============================================================================
 * 计算换算工具包 · 第五批（14 个）
 * -----------------------------------------------------------------------------
 * unit-torque       扭矩换算
 * unit-flow         流量换算
 * unit-density      密度换算
 * number-to-words-en 数字转英文
 * ratio-alloc       比例分配
 * margin-calc       毛利率换算
 * break-even        盈亏平衡
 * depreciation      折旧计算
 * probability-odds  赔率与期望值
 * gpa-calc          GPA 加权计算
 * sci-notation      科学计数法
 * significant-figs  有效数字修约
 * round-modes       取整方式对照
 * paper-size        纸张尺寸对照
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  function money(value) {
    if (!isFinite(value)) return '—';
    return '¥' + K.group(Number(value).toFixed(2));
  }

  function positive(value, label) {
    var num = parseFloat(value);
    if (!isFinite(num) || num < 0) throw new Error((label || '数值') + '需为不小于 0 的数字');
    return num;
  }

  /** 通用「数值 + 单位」换算面板 */
  function unitPanel(root, cfg) {
    K.form(root, {
      uid: cfg.uid,
      fields: [
        { id: 'value', label: '数值', type: 'number', value: cfg.sample, step: 'any' },
        { id: 'from', label: '原单位', type: 'select', value: cfg.units[0].key, options: cfg.units.map(function (unit) {
          return { value: unit.key, label: unit.label };
        }) },
        { id: 'to', label: '目标单位', type: 'select', value: cfg.units[1].key, options: cfg.units.map(function (unit) {
          return { value: unit.key, label: unit.label };
        }) }
      ],
      actionLabel: '换算',
      hint: cfg.hint,
      sample: { value: cfg.sample, from: cfg.units[0].key, to: cfg.units[1].key },
      run: function (values) {
        var value = parseFloat(values.value);
        if (!isFinite(value)) return { error: '请输入数字' };
        var from = cfg.units.filter(function (unit) { return unit.key === values.from; })[0];
        var to = cfg.units.filter(function (unit) { return unit.key === values.to; })[0];
        if (!from || !to) return { error: '请选择单位' };
        var base = value * from.ratio;
        var result = base / to.ratio;
        var rows = cfg.units.map(function (unit) {
          return { key: unit.label, value: K.num(base / unit.ratio, 6) };
        });
        return {
          rows: [{ key: '换算结果', value: K.num(result, 6) + ' ' + to.label, mono: false }].concat(rows),
          note: value + ' ' + from.label + ' = ' + K.num(result, 6) + ' ' + to.label
        };
      }
    });
  }

  function renderTorque(root) {
    unitPanel(root, {
      uid: 'torque',
      sample: 100,
      hint: '汽车轮毂螺丝常见 100–140 N·m。1 kgf·m = 9.80665 N·m，1 lbf·ft ≈ 1.3558 N·m；扭力扳手刻度多以 N·m 或 lbf·ft 标注。',
      units: [
        { key: 'nm', label: 'N·m 牛米', ratio: 1 },
        { key: 'kgfm', label: 'kgf·m 千克力米', ratio: 9.80665 },
        { key: 'lbfft', label: 'lbf·ft 磅力英尺', ratio: 1.3558179483 },
        { key: 'lbfin', label: 'lbf·in 磅力英寸', ratio: 0.1129848290 },
        { key: 'ozfin', label: 'ozf·in 盎司力英寸', ratio: 0.0070615518 }
      ]
    });
  }

  function renderFlow(root) {
    unitPanel(root, {
      uid: 'flow',
      sample: 60,
      hint: '净水器标 3 L/min，换算成 m³/h 就是 0.18；空调与新风常用 CFM，1 CFM ≈ 1.699 m³/h。',
      units: [
        { key: 'lmin', label: 'L/min 升每分', ratio: 1 },
        { key: 'ls', label: 'L/s 升每秒', ratio: 60 },
        { key: 'm3h', label: 'm³/h 立方米每小时', ratio: 1000 / 60 },
        { key: 'm3s', label: 'm³/s 立方米每秒', ratio: 60000 },
        { key: 'gpm', label: 'GPM 加仑每分（美制）', ratio: 3.785411784 },
        { key: 'cfm', label: 'CFM 立方英尺每分', ratio: 28.316846592 }
      ]
    });
  }

  function renderDensity(root) {
    unitPanel(root, {
      uid: 'density',
      sample: 7.85,
      hint: '水的密度 1 g/cm³，钢约 7.85，铝约 2.70。跨境物流计费常用 lb/ft³ 判定抛货，1 lb/ft³ ≈ 16.018 kg/m³。',
      units: [
        { key: 'gcm3', label: 'g/cm³ 克每立方厘米', ratio: 1000 },
        { key: 'kgm3', label: 'kg/m³ 千克每立方米', ratio: 1 },
        { key: 'gl', label: 'g/L 克每升', ratio: 1 },
        { key: 'lbft3', label: 'lb/ft³ 磅每立方英尺', ratio: 16.01846337 },
        { key: 'lbgal', label: 'lb/gal 磅每加仑（美制）', ratio: 119.8264273 }
      ]
    });
  }

  /* ------------------------------ 数字转英文 ------------------------------ */
  var ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  var TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  var SCALES = ['', ' thousand', ' million', ' billion', ' trillion'];

  function below1000(num) {
    var out = [];
    if (num >= 100) {
      out.push(ONES[Math.floor(num / 100)] + ' hundred');
      num %= 100;
    }
    if (num >= 20) {
      var ten = TENS[Math.floor(num / 10)];
      var unit = num % 10;
      out.push(unit ? ten + '-' + ONES[unit] : ten);
    } else if (num > 0) {
      out.push(ONES[num]);
    }
    return out.join(' ');
  }

  function toEnglishWords(num) {
    if (num === 0) return 'zero';
    var groups = [];
    var rest = num;
    var scale = 0;
    while (rest > 0) {
      var chunk = rest % 1000;
      if (chunk) groups.unshift(below1000(chunk) + SCALES[scale]);
      rest = Math.floor(rest / 1000);
      scale += 1;
    }
    return groups.join(' ');
  }

  function renderNumberWords(root) {
    K.form(root, {
      uid: 'numwords',
      fields: [
        { id: 'value', label: '整数（最大 999 万亿）', type: 'text', value: '1234567' },
        { id: 'capital', label: '每个单词首字母大写', type: 'checkbox', value: false }
      ],
      actionLabel: '转换',
      hint: '英文金额、支票与合同常需写出单词形式。注意 hundred / thousand 不加复数 s，只有「几百」「几千」用 two hundred 这种写法。',
      sample: { value: '20260118', capital: false },
      run: function (values) {
        var raw = String(values.value || '').replace(/[,\s]/g, '');
        if (!/^\d+$/.test(raw)) return { error: '请输入纯数字（可带千分位逗号）' };
        if (raw.replace(/^0+/, '').length > 15) return { error: '数字过大，最多支持 15 位' };
        var num = Number(raw);
        var words = toEnglishWords(num);
        if (values.capital) {
          words = words.replace(/\b[a-z]/g, function (ch) { return ch.toUpperCase(); });
        }
        return {
          rows: [
            { key: '英文', value: words },
            { key: '位数', value: String(num).length + ' 位', mono: false },
            { key: '千分位', value: K.group(String(num)) }
          ]
        };
      }
    });
  }

  /* ------------------------------ 比例分配 ------------------------------ */
  function renderRatioAlloc(root) {
    K.form(root, {
      uid: 'ratioalloc',
      fields: [
        { id: 'ratio', label: '比例（用 : 或空格分隔）', type: 'text', value: '2:3:5' },
        { id: 'total', label: '总量 / 总金额', type: 'number', value: 1000, step: 'any' },
        { id: 'names', label: '名称（可选，逗号分隔）', type: 'text', placeholder: '甲,乙,丙' }
      ],
      actionLabel: '分配',
      hint: '按比例分账、分摊费用、配料配比都用得上。结果保留两位小数，余数自动补到最大的一份上，保证合计等于总量。',
      sample: { ratio: '2:3:5', total: 1000, names: '甲,乙,丙' },
      run: function (values) {
        var parts = String(values.ratio || '').split(/[:,，\s]+/).filter(function (item) { return item !== ''; });
        if (parts.length < 2) return { error: '至少需要两个比例项，如 2:3' };
        var numbers = parts.map(function (item) {
          var num = parseFloat(item);
          if (!isFinite(num) || num < 0) throw new Error('比例项“' + item + '”不是有效数字');
          return num;
        });
        var sum = numbers.reduce(function (a, b) { return a + b; }, 0);
        if (sum <= 0) return { error: '比例之和必须大于 0' };
        var total = parseFloat(values.total);
        if (!isFinite(total)) return { error: '请输入总金额' };
        var names = String(values.names || '').split(/[,，\s]+/).filter(function (item) { return item !== ''; });
        var shares = numbers.map(function (num) { return Math.round((total * num / sum) * 100) / 100; });
        var diff = Math.round((total - shares.reduce(function (a, b) { return a + b; }, 0)) * 100) / 100;
        if (diff !== 0) {
          var maxIndex = shares.indexOf(Math.max.apply(null, shares));
          shares[maxIndex] = Math.round((shares[maxIndex] + diff) * 100) / 100;
        }
        var gcd = numbers.reduce(function (a, b) {
          while (b) { var t = b; b = a % b; a = t; }
          return a;
        });
        var rows = shares.map(function (share, index) {
          var label = names[index] || ('第 ' + (index + 1) + ' 份');
          return { key: label + '（' + numbers[index] + ' 份）', value: money(share) + '  占比 ' + K.num((numbers[index] / sum) * 100, 2) + '%', mono: false };
        });
        rows.push({ key: '合计', value: money(total) + '（' + parts.length + ' 份）', mono: false });
        rows.push({ key: '最简比', value: numbers.map(function (num) { return num / gcd; }).join(' : '), mono: false });
        return { rows: rows };
      }
    });
  }

  /* ------------------------------ 毛利率 ------------------------------ */
  function renderMargin(root) {
    K.form(root, {
      uid: 'margin',
      fields: [
        { id: 'cost', label: '成本（元）', type: 'number', value: 60, step: '0.01' },
        { id: 'price', label: '售价（元）', type: 'number', value: 100, step: '0.01' },
        { id: 'shipping', label: '其他成本（运费、平台佣金等）', type: 'number', value: 0, step: '0.01' }
      ],
      actionLabel: '计算',
      hint: '毛利率 =（售价 − 成本）÷ 售价，加价率 =（售价 − 成本）÷ 成本。两者含义完全不同：成本 60 卖 100，毛利率 40%，加价率 66.7%。',
      sample: { cost: 60, price: 100, shipping: 8 },
      run: function (values) {
        var cost = positive(values.cost, '成本') + positive(values.shipping, '其他成本');
        var price = positive(values.price, '售价');
        if (price <= 0) return { error: '售价必须大于 0' };
        var profit = price - cost;
        var margin = (profit / price) * 100;
        var markup = cost > 0 ? (profit / cost) * 100 : Infinity;
        var rows = [
          { key: '总成本', value: money(cost), mono: false },
          { key: '毛利', value: money(profit), mono: false },
          { key: '毛利率', value: K.num(margin, 2) + '%', mono: false },
          { key: '加价率（成本加成）', value: isFinite(markup) ? K.num(markup, 2) + '%' : '—', mono: false },
          { key: '成本占售价', value: K.num((cost / price) * 100, 2) + '%', mono: false }
        ];
        if (margin < 0) rows.push({ key: '提示', value: '售价低于成本，处于亏损状态', mono: false });
        return { rows: rows, note: margin < 0 ? '当前为亏本定价' : '' };
      }
    });
  }

  /* ------------------------------ 盈亏平衡 ------------------------------ */
  function renderBreakEven(root) {
    K.form(root, {
      uid: 'breakeven',
      fields: [
        { id: 'fixed', label: '固定成本（房租、工资等）', type: 'number', value: 20000, step: '0.01' },
        { id: 'price', label: '单件售价', type: 'number', value: 99, step: '0.01' },
        { id: 'variable', label: '单件变动成本', type: 'number', value: 39, step: '0.01' },
        { id: 'plan', label: '预计销量（可选）', type: 'number', value: 500 }
      ],
      actionLabel: '计算',
      hint: '盈亏平衡点 = 固定成本 ÷（售价 − 变动成本）。边际贡献为负时，无论卖多少都补不回固定成本，这时候要先涨价或降本。',
      sample: { fixed: 20000, price: 99, variable: 39, plan: 500 },
      run: function (values) {
        var fixed = positive(values.fixed, '固定成本');
        var price = positive(values.price, '售价');
        var variable = positive(values.variable, '变动成本');
        var contribution = price - variable;
        if (contribution <= 0) {
          return { error: '单件售价不高于变动成本，边际贡献为 ' + money(contribution) + '，无法实现盈亏平衡' };
        }
        var units = fixed / contribution;
        var rows = [
          { key: '边际贡献 / 件', value: money(contribution), mono: false },
          { key: '保本销量', value: K.num(units, 1) + ' 件（向上取整 ' + Math.ceil(units) + ' 件）', mono: false },
          { key: '保本销售额', value: money(Math.ceil(units) * price), mono: false }
        ];
        var plan = parseFloat(values.plan);
        if (isFinite(plan) && plan > 0) {
          var profit = plan * contribution - fixed;
          var safe = ((plan - units) / plan) * 100;
          rows.push({ key: '预计销量下利润', value: money(profit), mono: false });
          rows.push({ key: '安全边际', value: K.num(safe, 1) + '%（销量下滑超过该比例即亏损）', mono: false });
        }
        return { rows: rows };
      }
    });
  }

  /* ------------------------------ 折旧 ------------------------------ */
  function renderDepreciation(root) {
    K.form(root, {
      uid: 'depreciation',
      fields: [
        { id: 'cost', label: '原值', type: 'number', value: 100000, step: '0.01' },
        { id: 'salvage', label: '残值', type: 'number', value: 5000, step: '0.01' },
        { id: 'years', label: '使用年限', type: 'number', value: 5, min: 1, max: 50 },
        { id: 'method', label: '方法', type: 'select', value: 'straight', options: [
          { value: 'straight', label: '直线法（平均年限）' },
          { value: 'double', label: '双倍余额递减法' },
          { value: 'sum', label: '年数总和法' }
        ] }
      ],
      actionLabel: '计算',
      hint: '直线法每年折旧相同；双倍余额递减法前期折得多、后期少（最后两年转直线补足残值）；年数总和法按 n、(n−1)… 的权重分摊。',
      sample: { cost: 100000, salvage: 5000, years: 5, method: 'double' },
      run: function (values) {
        var cost = positive(values.cost, '原值');
        var salvage = positive(values.salvage, '残值');
        var years = parseInt(values.years, 10);
        if (!years || years < 1) return { error: '使用年限至少 1 年' };
        if (salvage >= cost) return { error: '残值应小于原值' };
        var depreciable = cost - salvage;
        var rows = [];
        var book = cost;
        var total = 0;
        if (values.method === 'straight') {
          var per = depreciable / years;
          for (var i = 1; i <= years; i += 1) {
            book -= per;
            total += per;
            rows.push([String(i), money(per), money(total), money(book)]);
          }
        } else if (values.method === 'sum') {
          var weightSum = (years * (years + 1)) / 2;
          for (var j = 1; j <= years; j += 1) {
            var amount = depreciable * ((years - j + 1) / weightSum);
            book -= amount;
            total += amount;
            rows.push([String(j), money(amount), money(total), money(book)]);
          }
        } else {
          var rate = 2 / years;
          for (var k = 1; k <= years; k += 1) {
            var remainYears = years - k + 1;
            var dep = remainYears <= 2 ? (book - salvage) / remainYears : book * rate;
            if (book - dep < salvage) dep = book - salvage;
            book -= dep;
            total += dep;
            rows.push([String(k), money(dep), money(total), money(book)]);
          }
        }
        return {
          html: K.table(['年度', '当年折旧', '累计折旧', '账面净值'], rows),
          note: '按' + ({ straight: '直线法', double: '双倍余额递减法', sum: '年数总和法' }[values.method]) + '计算，' + years + ' 年后账面净值 ' + money(book)
        };
      }
    });
  }

  /* ------------------------------ 赔率与期望 ------------------------------ */
  function renderOdds(root) {
    K.form(root, {
      uid: 'odds',
      fields: [
        { id: 'prob', label: '你认为的胜率（%）', type: 'number', value: 60, min: 0, max: 100, step: '0.1' },
        { id: 'odds', label: '市场赔率（小数赔率）', type: 'number', value: 2.1, step: '0.01' },
        { id: 'stake', label: '下注金额', type: 'number', value: 100, step: '0.01' }
      ],
      actionLabel: '计算',
      hint: '小数赔率 2.1 表示押 1 元赢了拿回 2.1 元（含本金）。隐含概率 = 1 ÷ 赔率；期望值 = 胜率 ×（赔率 − 1）− 败率，大于 0 才算有价值。',
      sample: { prob: 60, odds: 2.1, stake: 100 },
      run: function (values) {
        var prob = parseFloat(values.prob) / 100;
        var odds = parseFloat(values.odds);
        var stake = positive(values.stake, '下注金额');
        if (!isFinite(prob) || prob < 0 || prob > 1) return { error: '胜率需在 0–100 之间' };
        if (!isFinite(odds) || odds <= 1) return { error: '小数赔率需大于 1' };
        var implied = 1 / odds;
        var win = stake * (odds - 1);
        var ev = prob * win - (1 - prob) * stake;
        var fairOdds = prob > 0 ? 1 / prob : Infinity;
        return {
          rows: [
            { key: '隐含概率', value: K.num(implied * 100, 2) + '%', mono: false },
            { key: '你的胜率', value: K.num(prob * 100, 2) + '%', mono: false },
            { key: '价值差', value: K.num((prob - implied) * 100, 2) + ' 个百分点', mono: false },
            { key: '赢时净收', value: money(win), mono: false },
            { key: '期望收益', value: money(ev) + '（回报率 ' + K.num((ev / stake) * 100, 2) + '%）', mono: false },
            { key: '公平赔率', value: isFinite(fairOdds) ? K.num(fairOdds, 2) : '—', mono: false }
          ],
          note: ev > 0 ? '期望为正，理论上有价值' : '期望为负，长期会亏'
        };
      }
    });
  }

  /* ------------------------------ GPA ------------------------------ */
  function renderGpa(root) {
    K.form(root, {
      uid: 'gpa',
      stack: true,
      fields: [
        { id: 'list', label: '每行一门课：课程名, 学分, 绩点', type: 'textarea', rows: 7, wide: true,
          value: '高等数学, 4, 3.7\n大学英语, 2, 4.0\n数据结构, 3, 3.3\n体育, 1, 4.0' },
        { id: 'scale', label: '换算标准', type: 'select', value: '4', options: [
          { value: '4', label: '4.0 制（美式）' },
          { value: '5', label: '5.0 制（部分国内高校）' },
          { value: '100', label: '百分制加权平均' }
        ] }
      ],
      actionLabel: '计算',
      hint: 'GPA = Σ(学分 × 绩点) ÷ Σ学分，是学分加权平均，不是简单平均。百分制加权平均同理，用成绩替换绩点即可。',
      run: function (values) {
        var lines = String(values.list || '').split(/\r?\n/).filter(function (line) { return line.trim() !== ''; });
        if (!lines.length) return { error: '请至少填写一门课程' };
        var credits = 0;
        var points = 0;
        var rows = [];
        lines.forEach(function (line) {
          var parts = line.split(/[,，\t]+/).map(function (item) { return item.trim(); }).filter(function (item) { return item !== ''; });
          if (parts.length < 3) throw new Error('“' + line + '”格式不对，应为 课程名, 学分, 绩点');
          var credit = parseFloat(parts[1]);
          var point = parseFloat(parts[2]);
          if (!isFinite(credit) || credit <= 0) throw new Error('“' + parts[0] + '”的学分无效');
          if (!isFinite(point)) throw new Error('“' + parts[0] + '”的绩点无效');
          credits += credit;
          points += credit * point;
          rows.push([parts[0], K.num(credit, 2), K.num(point, 2), K.num(credit * point, 3)]);
        });
        var average = points / credits;
        rows.push(['合计', K.num(credits, 2), '—', K.num(points, 3)]);
        return {
          html: K.table(['课程', '学分', '绩点 / 成绩', '学分 × 绩点'], rows),
          note: '加权平均 ' + K.num(average, 3) + '（' + ({ 4: '4.0 制', 5: '5.0 制', 100: '百分制' }[values.scale]) + '，共 ' + K.num(credits, 2) + ' 学分）'
        };
      }
    });
  }

  /* ------------------------------ 科学计数法 ------------------------------ */
  function renderSciNote(root) {
    K.form(root, {
      uid: 'scinote',
      fields: [
        { id: 'value', label: '数值（支持 1.23e-5 写法）', type: 'text', value: '0.000123' },
        { id: 'digits', label: '有效位数', type: 'number', value: 4, min: 1, max: 15 }
      ],
      actionLabel: '转换',
      hint: '科学计数法把数字写成 a × 10ⁿ（1 ≤ |a| < 10）；工程计数法的指数必须是 3 的倍数，更贴近 k / M / G 前缀。',
      sample: { value: '602214076000000000000000', digits: 4 },
      run: function (values) {
        var num = parseFloat(String(values.value).replace(/[,\s_]/g, ''));
        if (!isFinite(num)) return { error: '请输入有效数字' };
        var digits = Math.max(1, Math.min(15, parseInt(values.digits, 10) || 4));
        if (num === 0) {
          return {
            rows: [
              { key: '科学计数法', value: '0' },
              { key: '工程计数法', value: '0' },
              { key: '普通写法', value: '0' }
            ]
          };
        }
        var exponent = Math.floor(Math.log10(Math.abs(num)));
        var mantissa = num / Math.pow(10, exponent);
        var engExp = Math.floor(exponent / 3) * 3;
        var engMantissa = num / Math.pow(10, engExp);
        var plain = num.toFixed(Math.max(0, digits - 1 - exponent));
        return {
          rows: [
            { key: '科学计数法', value: K.num(mantissa, digits - 1) + ' × 10^' + exponent },
            { key: '工程计数法', value: K.num(engMantissa, digits - 1) + ' × 10^' + engExp },
            { key: '程序写法', value: K.num(mantissa, digits - 1) + 'e' + exponent },
            { key: '普通写法', value: Math.abs(num) >= 1e21 ? num.toExponential(digits - 1) : plain },
            { key: '数量级', value: '10^' + exponent, mono: false }
          ]
        };
      }
    });
  }

  /* ------------------------------ 有效数字 ------------------------------ */
  function countSigFigs(text) {
    var raw = String(text).trim().replace(/^[+-]/, '');
    if (/e/i.test(raw)) {
      var mantissa = raw.split(/e/i)[0];
      return countSigFigs(mantissa);
    }
    raw = raw.replace(/[,\s_]/g, '');
    if (!/^\d*\.?\d*$/.test(raw) || raw === '' || raw === '.') return 0;
    var digits = raw.replace('.', '');
    if (raw.indexOf('.') >= 0) {
      var trimmed = digits.replace(/^0+/, '');
      return trimmed.length;
    }
    var noZero = digits.replace(/^0+/, '');
    if (!noZero) return 0;
    return noZero.replace(/0+$/, '').length || noZero.length;
  }

  function renderSigFigs(root) {
    K.form(root, {
      uid: 'sigfigs',
      fields: [
        { id: 'value', label: '原始数值', type: 'text', value: '0.004560' },
        { id: 'keep', label: '保留有效位数', type: 'number', value: 2, min: 1, max: 15 }
      ],
      actionLabel: '修约',
      hint: '有效数字从第一个非零数字开始计数；小数末尾的 0 也算有效（0.004560 有 4 位）。整数末尾的 0 有歧义，科学计数法最稳妥。',
      sample: { value: '0.004560', keep: 2 },
      run: function (values) {
        var text = String(values.value).trim();
        var num = parseFloat(text);
        if (!isFinite(num)) return { error: '请输入有效数字' };
        var keep = Math.max(1, Math.min(15, parseInt(values.keep, 10) || 2));
        var current = countSigFigs(text);
        var exponent = num === 0 ? 0 : Math.floor(Math.log10(Math.abs(num)));
        var digits = keep - 1 - exponent;
        var rounded = num === 0 ? 0 : Number(num.toFixed(Math.max(0, digits)));
        var sci = num === 0 ? '0' : Number(num).toPrecision(keep);
        return {
          rows: [
            { key: '原有有效位数', value: current ? current + ' 位' : '无法判断', mono: false },
            { key: '修约结果', value: String(rounded), mono: false },
            { key: '科学计数法', value: sci.indexOf('e') >= 0 ? sci : Number(sci).toExponential(keep - 1) },
            { key: '十进制位', value: '保留到小数点后 ' + Math.max(0, digits) + ' 位', mono: false }
          ],
          note: '按四舍五入修约到 ' + keep + ' 位有效数字'
        };
      }
    });
  }

  /* ------------------------------ 取整对照 ------------------------------ */
  function roundHalfEven(value, decimals) {
    var factor = Math.pow(10, decimals);
    var scaled = value * factor;
    var lower = Math.floor(scaled);
    var diff = scaled - lower;
    var result;
    if (Math.abs(diff - 0.5) < 1e-9) {
      result = lower % 2 === 0 ? lower : lower + 1;
    } else {
      result = Math.round(scaled);
    }
    return result / factor;
  }

  function renderRoundModes(root) {
    K.form(root, {
      uid: 'roundmodes',
      fields: [
        { id: 'value', label: '数值', type: 'number', value: -12.5, step: 'any' },
        { id: 'decimals', label: '小数位', type: 'number', value: 0, min: 0, max: 8 }
      ],
      actionLabel: '对照',
      hint: '编程里最容易踩的坑：JS 的 Math.round(-0.5) 得到 -0，而银行的四舍五入是「五入远离零」。财务计算建议用 toFixed 或整数化后再算。',
      sample: { value: -12.5, decimals: 0 },
      run: function (values) {
        var num = parseFloat(values.value);
        if (!isFinite(num)) return { error: '请输入数字' };
        var decimals = Math.max(0, Math.min(8, parseInt(values.decimals, 10) || 0));
        var factor = Math.pow(10, decimals);
        var scaled = num * factor;
        var rows = [
          { key: '向下取整 floor', value: K.num(Math.floor(scaled) / factor, decimals) },
          { key: '向上取整 ceil', value: K.num(Math.ceil(scaled) / factor, decimals) },
          { key: '截断 trunc（向零）', value: K.num(Math.trunc(scaled) / factor, decimals) },
          { key: '四舍五入 round（.5 向 +∞）', value: K.num(Math.round(scaled) / factor, decimals) },
          { key: '银行家舍入（.5 取偶）', value: K.num(roundHalfEven(num, decimals), decimals) },
          { key: '远离零（五入）', value: K.num((num >= 0 ? Math.round(scaled) : -Math.round(-scaled)) / factor, decimals) }
        ];
        return { rows: rows, note: '小数位 ' + decimals + '，缩放后值 ' + K.num(scaled, 6) };
      }
    });
  }

  /* ------------------------------ 纸张尺寸 ------------------------------ */
  var PAPER = {
    A: [[841, 1189], [594, 841], [420, 594], [297, 420], [210, 297], [148, 210], [105, 148], [74, 105], [52, 74], [37, 52], [26, 37]],
    B: [[1000, 1414], [707, 1000], [500, 707], [353, 500], [250, 353], [176, 250], [125, 176], [88, 125], [62, 88], [44, 62], [31, 44]],
    C: [[917, 1297], [648, 917], [458, 648], [324, 458], [229, 324], [162, 229], [114, 162], [81, 114], [57, 81], [40, 57], [28, 40]]
  };

  function renderPaperSize(root) {
    K.form(root, {
      uid: 'paper',
      fields: [
        { id: 'series', label: '系列', type: 'select', value: 'A', options: [
          { value: 'A', label: 'A 系列（办公常用）' },
          { value: 'B', label: 'B 系列（海报、书籍）' },
          { value: 'C', label: 'C 系列（信封）' }
        ] },
        { id: 'dpi', label: '导出分辨率 DPI', type: 'select', value: '300', options: [
          { value: '72', label: '72（屏幕）' },
          { value: '150', label: '150（草稿）' },
          { value: '300', label: '300（印刷）' },
          { value: '600', label: '600（高清）' }
        ] }
      ],
      actionLabel: '查询',
      hint: 'ISO 216 纸张的长宽比恒为 1:√2，对折一次就得到下一号。A4 是 210×297 mm，换算成 300 DPI 的像素是 2480×3508。',
      sample: { series: 'A', dpi: '300' },
      run: function (values) {
        var series = PAPER[values.series] || PAPER.A;
        var dpi = parseInt(values.dpi, 10) || 300;
        var rows = series.map(function (size, index) {
          var width = size[0];
          var height = size[1];
          var pxW = Math.round((width / 25.4) * dpi);
          var pxH = Math.round((height / 25.4) * dpi);
          return [
            values.series + index,
            width + ' × ' + height + ' mm',
            K.num(width / 25.4, 2) + ' × ' + K.num(height / 25.4, 2) + ' in',
            pxW + ' × ' + pxH + ' px'
          ];
        });
        return {
          html: K.table(['规格', '毫米', '英寸', '像素 @' + dpi + 'DPI'], rows),
          note: values.series + ' 系列共 ' + rows.length + ' 种规格'
        };
      }
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['unit-torque'] = renderTorque;
  window.ToolModules['unit-flow'] = renderFlow;
  window.ToolModules['unit-density'] = renderDensity;
  window.ToolModules['number-to-words-en'] = renderNumberWords;
  window.ToolModules['ratio-alloc'] = renderRatioAlloc;
  window.ToolModules['margin-calc'] = renderMargin;
  window.ToolModules['break-even'] = renderBreakEven;
  window.ToolModules['depreciation'] = renderDepreciation;
  window.ToolModules['probability-odds'] = renderOdds;
  window.ToolModules['gpa-calc'] = renderGpa;
  window.ToolModules['sci-notation'] = renderSciNote;
  window.ToolModules['significant-figs'] = renderSigFigs;
  window.ToolModules['round-modes'] = renderRoundModes;
  window.ToolModules['paper-size'] = renderPaperSize;
})();
