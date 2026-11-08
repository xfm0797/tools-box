/* =============================================================================
 * 计算换算工具包 · 第四批（14 个）
 * -----------------------------------------------------------------------------
 * bmr             基础代谢率
 * tdee            每日总消耗与热量目标
 * body-fat        体脂率（美国海军公式）
 * ideal-weight    标准体重（四种公式）
 * water-intake    每日饮水量
 * fuel-cost       油费计算
 * electricity-cost 电费计算
 * paint-calc      涂料用量
 * tile-calc       瓷砖数量
 * loan-compare    等额本息 / 等额本金对比
 * savings-goal     储蓄目标测算
 * roi             投资回报率
 * cagr            年化复合增长率
 * overtime-pay    加班费计算
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  function money(value) {
    return '¥' + K.group((Math.round(value * 100) / 100).toFixed(2));
  }

  /* ------------------------------ 1. 基础代谢率 ------------------------------ */
  function renderBmr(root) {
    K.form(root, {
      uid: 'bmr',
      actionLabel: '计算 BMR',
      fields: [
        { id: 'sex', label: '性别', type: 'select', value: 'male', options: [
          { value: 'male', label: '男' },
          { value: 'female', label: '女' }
        ] },
        { id: 'age', label: '年龄（岁）', type: 'number', value: 28, min: 10, max: 120, step: 1 },
        { id: 'height', label: '身高（cm）', type: 'number', value: 175, min: 80, step: 0.1 },
        { id: 'weight', label: '体重（kg）', type: 'number', value: 68, min: 20, step: 0.1 }
      ],
      hint: '采用 Mifflin-St Jeor 公式，是目前临床最常用的估算式，误差约 ±10%。',
      run: function (v) {
        var age = Number(v.age);
        var h = Number(v.height);
        var w = Number(v.weight);
        if (!(age > 0) || !(h > 0) || !(w > 0)) return { error: '年龄、身高、体重都需要填写正数' };
        var base = 10 * w + 6.25 * h - 5 * age;
        var bmr = v.sex === 'male' ? base + 5 : base - 161;
        return {
          rows: [
            { key: '基础代谢 BMR', value: Math.round(bmr) + ' kcal / 天' },
            { key: '每小时消耗', value: Math.round(bmr / 24) + ' kcal' },
            { key: '静息一天（不活动）', value: Math.round(bmr * 1.2) + ' kcal' }
          ],
          note: 'BMR 是躺着不动的消耗量，日常总消耗请用「每日总消耗 TDEE」工具'
        };
      }
    });
  }

  /* ------------------------------ 2. 每日总消耗 ------------------------------ */
  function renderTdee(root) {
    K.form(root, {
      uid: 'tdee',
      actionLabel: '计算 TDEE',
      fields: [
        { id: 'sex', label: '性别', type: 'select', value: 'male', options: [
          { value: 'male', label: '男' },
          { value: 'female', label: '女' }
        ] },
        { id: 'age', label: '年龄（岁）', type: 'number', value: 28, min: 10, max: 120, step: 1 },
        { id: 'height', label: '身高（cm）', type: 'number', value: 175, min: 80, step: 0.1 },
        { id: 'weight', label: '体重（kg）', type: 'number', value: 68, min: 20, step: 0.1 },
        { id: 'activity', label: '活动水平', type: 'select', value: '1.55', wide: true, options: [
          { value: '1.2', label: '久坐（几乎不运动）' },
          { value: '1.375', label: '轻度（每周 1–3 次）' },
          { value: '1.55', label: '中度（每周 3–5 次）' },
          { value: '1.725', label: '高强度（每周 6–7 次）' },
          { value: '1.9', label: '极高（体力工作 / 一天两练）' }
        ] }
      ],
      run: function (v) {
        var age = Number(v.age);
        var h = Number(v.height);
        var w = Number(v.weight);
        if (!(age > 0) || !(h > 0) || !(w > 0)) return { error: '年龄、身高、体重都需要填写正数' };
        var bmr = 10 * w + 6.25 * h - 5 * age + (v.sex === 'male' ? 5 : -161);
        var tdee = bmr * Number(v.activity);
        return {
          rows: [
            { key: 'BMR', value: Math.round(bmr) + ' kcal' },
            { key: 'TDEE 每日总消耗', value: Math.round(tdee) + ' kcal' },
            { key: '减脂（-20%）', value: Math.round(tdee * 0.8) + ' kcal' },
            { key: '缓慢减脂（-10%）', value: Math.round(tdee * 0.9) + ' kcal' },
            { key: '维持体重', value: Math.round(tdee) + ' kcal' },
            { key: '增肌（+10%）', value: Math.round(tdee * 1.1) + ' kcal' },
            { key: '每周减重预估', value: K.num(tdee * 0.2 * 7 / 7700, 2) + ' kg（按 -20% 热量缺口）' }
          ],
          note: '约 7700 kcal 对应 1 kg 脂肪，结果仅供估算'
        };
      }
    });
  }

  /* ------------------------------ 3. 体脂率 ------------------------------ */
  function renderBodyFat(root) {
    K.form(root, {
      uid: 'bodyfat',
      actionLabel: '估算体脂率',
      fields: [
        { id: 'sex', label: '性别', type: 'select', value: 'male', options: [
          { value: 'male', label: '男' },
          { value: 'female', label: '女' }
        ] },
        { id: 'height', label: '身高（cm）', type: 'number', value: 175, min: 80, step: 0.1 },
        { id: 'neck', label: '颈围（cm）', type: 'number', value: 38, min: 10, step: 0.1 },
        { id: 'waist', label: '腰围（cm，男性量肚脐处）', type: 'number', value: 84, min: 30, step: 0.1 },
        { id: 'hip', label: '臀围（cm，女性必填）', type: 'number', value: 96, min: 30, step: 0.1 }
      ],
      hint: '美国海军（US Navy）围度公式，需软尺贴身测量，晨起空腹测量更稳定。',
      run: function (v) {
        var h = Number(v.height);
        var neck = Number(v.neck);
        var waist = Number(v.waist);
        var hip = Number(v.hip);
        if (!(h > 0) || !(neck > 0) || !(waist > 0)) return { error: '身高、颈围、腰围都要填写' };
        var fat;
        if (v.sex === 'male') {
          if (waist <= neck) return { error: '腰围应大于颈围' };
          fat = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(h)) - 450;
        } else {
          if (!(hip > 0)) return { error: '女性需要填写臀围' };
          fat = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(h)) - 450;
        }
        if (!isFinite(fat)) return { error: '围度数据异常，请检查输入' };
        var level = v.sex === 'male'
          ? (fat < 6 ? '过低' : fat < 14 ? '运动员' : fat < 18 ? '健康' : fat < 25 ? '偏高' : '肥胖')
          : (fat < 14 ? '过低' : fat < 21 ? '运动员' : fat < 25 ? '健康' : fat < 32 ? '偏高' : '肥胖');
        var lean = 100 - fat;
        return {
          rows: [
            { key: '体脂率', value: K.num(fat, 1) + '%' },
            { key: '瘦体重占比', value: K.num(lean, 1) + '%' },
            { key: '评级', value: level, mono: false },
            { key: '健康参考区间', value: v.sex === 'male' ? '10% – 20%' : '18% – 28%', mono: false },
            { key: '公式', value: 'US Navy 围度法（' + (v.sex === 'male' ? '男' : '女') + '）' }
          ],
          note: '围度法误差约 ±3–5%，如需精确请用 DEXA 或体成分仪'
        };
      }
    });
  }

  /* ------------------------------ 4. 标准体重 ------------------------------ */
  function renderIdealWeight(root) {
    K.form(root, {
      uid: 'idealw',
      actionLabel: '计算',
      fields: [
        { id: 'sex', label: '性别', type: 'select', value: 'male', options: [
          { value: 'male', label: '男' },
          { value: 'female', label: '女' }
        ] },
        { id: 'height', label: '身高（cm）', type: 'number', value: 175, min: 120, max: 230, step: 0.1 }
      ],
      run: function (v) {
        var cm = Number(v.height);
        if (!(cm > 0)) return { error: '请填写身高' };
        var inches = cm / 2.54;
        var over60 = Math.max(0, inches - 60);
        var male = v.sex === 'male';
        var devine = (male ? 50 : 45.5) + 2.3 * over60;
        var robinson = (male ? 52 : 49) + (male ? 1.9 : 1.7) * over60;
        var miller = (male ? 56.2 : 53.1) + (male ? 1.41 : 1.36) * over60;
        var hamwi = (male ? 48 : 45.5) + (male ? 2.7 : 2.2) * over60;
        var bmiMin = 18.5 * Math.pow(cm / 100, 2);
        var bmiMax = 23.9 * Math.pow(cm / 100, 2);
        return {
          rows: [
            { key: 'Devine 公式', value: K.num(devine, 1) + ' kg' },
            { key: 'Robinson 公式', value: K.num(robinson, 1) + ' kg' },
            { key: 'Miller 公式', value: K.num(miller, 1) + ' kg' },
            { key: 'Hamwi 公式', value: K.num(hamwi, 1) + ' kg' },
            { key: '四者平均', value: K.num((devine + robinson + miller + hamwi) / 4, 1) + ' kg' },
            { key: '健康 BMI 区间（18.5–23.9）', value: K.num(bmiMin, 1) + ' – ' + K.num(bmiMax, 1) + ' kg' }
          ],
          note: '公式结果不含肌肉量差异，健身人群可上浮 5–10%'
        };
      }
    });
  }

  /* ------------------------------ 5. 每日饮水量 ------------------------------ */
  function renderWaterIntake(root) {
    K.form(root, {
      uid: 'water',
      actionLabel: '计算',
      fields: [
        { id: 'weight', label: '体重（kg）', type: 'number', value: 68, min: 20, step: 0.1 },
        { id: 'exercise', label: '每日运动时长（分钟）', type: 'number', value: 30, min: 0, step: 5 },
        { id: 'climate', label: '环境', type: 'select', value: 'normal', options: [
          { value: 'cool', label: '凉爽（< 20℃）' },
          { value: 'normal', label: '常温（20–28℃）' },
          { value: 'hot', label: '炎热（> 28℃）' }
        ] }
      ],
      hint: '基础按 35 ml/kg 估算，运动每小时额外补 500 ml，炎热环境上浮 15%。',
      run: function (v) {
        var w = Number(v.weight);
        if (!(w > 0)) return { error: '请填写体重' };
        var base = w * 35;
        var exercise = Number(v.exercise || 0) / 60 * 500;
        var climateFactor = v.climate === 'hot' ? 1.15 : v.climate === 'cool' ? 0.95 : 1;
        var total = (base + exercise) * climateFactor;
        var cups = total / 250;
        return {
          rows: [
            { key: '每日建议饮水', value: (Math.round(total / 50) * 50) + ' ml' },
            { key: '折合 250ml 杯数', value: K.num(cups, 1) + ' 杯' },
            { key: '基础需求', value: Math.round(base) + ' ml' },
            { key: '运动补充', value: Math.round(exercise) + ' ml' },
            { key: '起床后建议', value: '250–300 ml 温水' },
            { key: '睡前 1 小时', value: '不超过 200 ml' }
          ],
          note: '心肾功能异常者请遵医嘱，本结果不构成医学建议'
        };
      }
    });
  }

  /* ------------------------------ 6. 油费计算 ------------------------------ */
  function renderFuelCost(root) {
    K.form(root, {
      uid: 'fuelcost',
      actionLabel: '计算油费',
      fields: [
        { id: 'distance', label: '行驶里程（km）', type: 'number', value: 500, min: 0, step: 0.1 },
        { id: 'consumption', label: '百公里油耗（L）', type: 'number', value: 7.5, min: 0.1, step: 0.1 },
        { id: 'price', label: '油价（元 / L）', type: 'number', value: 7.85, min: 0.01, step: 0.01 },
        { id: 'people', label: '同乘人数（含司机）', type: 'number', value: 1, min: 1, step: 1 }
      ],
      run: function (v) {
        var km = Number(v.distance);
        var per100 = Number(v.consumption);
        var price = Number(v.price);
        if (!(km >= 0) || !(per100 > 0) || !(price > 0)) return { error: '请检查里程、油耗与油价' };
        var liters = km / 100 * per100;
        var cost = liters * price;
        var people = Math.max(1, Number(v.people) || 1);
        return {
          rows: [
            { key: '耗油量', value: K.num(liters, 2) + ' L' },
            { key: '总油费', value: money(cost) },
            { key: '每公里成本', value: money(cost / (km || 1)) },
            { key: '人均分摊', value: money(cost / people) },
            { key: '百公里花费', value: money(per100 * price) }
          ],
          note: '按当前油价估算，未计入过路费与保养'
        };
      }
    });
  }

  /* ------------------------------ 7. 电费计算 ------------------------------ */
  function renderElectricityCost(root) {
    K.form(root, {
      uid: 'eleccost',
      actionLabel: '计算电费',
      fields: [
        { id: 'power', label: '功率（W）', type: 'number', value: 1500, min: 1, step: 1 },
        { id: 'hours', label: '每天使用（小时）', type: 'number', value: 2, min: 0, max: 24, step: 0.1 },
        { id: 'days', label: '天数', type: 'number', value: 30, min: 1, step: 1 },
        { id: 'price', label: '电价（元 / 度）', type: 'number', value: 0.55, min: 0.01, step: 0.01 }
      ],
      run: function (v) {
        var power = Number(v.power);
        var hours = Number(v.hours);
        var days = Number(v.days);
        var price = Number(v.price);
        if (!(power > 0) || !(hours >= 0) || !(days > 0) || !(price > 0)) return { error: '请检查功率、时长、天数与电价' };
        var kwh = power / 1000 * hours * days;
        return {
          rows: [
            { key: '用电量', value: K.num(kwh, 3) + ' 度（kWh）' },
            { key: '电费', value: money(kwh * price) },
            { key: '每天电费', value: money(kwh / days * price) },
            { key: '折合每月', value: money(kwh / days * 30 * price) },
            { key: '折合每年', value: money(kwh / days * 365 * price) }
          ],
          note: '1 度 = 1 kWh；阶梯电价请按平均单价估算'
        };
      }
    });
  }

  /* ------------------------------ 8. 涂料用量 ------------------------------ */
  function renderPaintCalc(root) {
    K.form(root, {
      uid: 'paint',
      actionLabel: '计算用量',
      fields: [
        { id: 'area', label: '涂刷面积（㎡）', type: 'number', value: 80, min: 0, step: 0.1 },
        { id: 'coats', label: '涂刷遍数', type: 'number', value: 2, min: 1, max: 5, step: 1 },
        { id: 'coverage', label: '涂料遮盖率（㎡ / L）', type: 'number', value: 10, min: 1, step: 0.1 },
        { id: 'waste', label: '损耗率（%）', type: 'number', value: 10, min: 0, max: 50, step: 1 },
        { id: 'pack', label: '包装规格（L / 桶）', type: 'number', value: 5, min: 0.5, step: 0.5 }
      ],
      hint: '常见乳胶漆遮盖率 8–12 ㎡/L（单遍），深色或旧墙翻新需增加遍数。',
      run: function (v) {
        var area = Number(v.area);
        var coats = Number(v.coats);
        var coverage = Number(v.coverage);
        var waste = Number(v.waste);
        var pack = Number(v.pack);
        if (!(area > 0) || !(coats > 0) || !(coverage > 0) || !(pack > 0)) return { error: '面积、遍数、遮盖率与包装规格都需要填写正数' };
        var liters = area * coats / coverage * (1 + waste / 100);
        var buckets = Math.ceil(liters / pack);
        return {
          rows: [
            { key: '需要涂料', value: K.num(liters, 2) + ' L' },
            { key: '含损耗', value: '已按 ' + waste + '% 计入' },
            { key: '建议购买', value: buckets + ' 桶（' + pack + ' L / 桶）' },
            { key: '实际总量', value: K.num(buckets * pack, 1) + ' L' },
            { key: '剩余', value: K.num(buckets * pack - liters, 2) + ' L' }
          ]
        };
      }
    });
  }

  /* ------------------------------ 9. 瓷砖数量 ------------------------------ */
  function renderTileCalc(root) {
    K.form(root, {
      uid: 'tile',
      actionLabel: '计算片数',
      fields: [
        { id: 'width', label: '铺贴区域长（m）', type: 'number', value: 5, min: 0.1, step: 0.01 },
        { id: 'height', label: '铺贴区域宽（m）', type: 'number', value: 4, min: 0.1, step: 0.01 },
        { id: 'tileW', label: '单片长（mm）', type: 'number', value: 800, min: 10, step: 1 },
        { id: 'tileH', label: '单片宽（mm）', type: 'number', value: 800, min: 10, step: 1 },
        { id: 'waste', label: '损耗率（%）', type: 'number', value: 8, min: 0, max: 40, step: 1 }
      ],
      run: function (v) {
        var w = Number(v.width);
        var h = Number(v.height);
        var tw = Number(v.tileW) / 1000;
        var th = Number(v.tileH) / 1000;
        var waste = Number(v.waste);
        if (!(w > 0) || !(h > 0) || !(tw > 0) || !(th > 0)) return { error: '区域尺寸与瓷砖尺寸都需要填写正数' };
        var area = w * h;
        var tileArea = tw * th;
        var exact = area / tileArea;
        var withWaste = Math.ceil(exact * (1 + waste / 100));
        var perRow = Math.ceil(w / tw);
        var rows = Math.ceil(h / th);
        return {
          rows: [
            { key: '铺贴面积', value: K.num(area, 2) + ' ㎡' },
            { key: '单片面积', value: K.num(tileArea, 4) + ' ㎡' },
            { key: '理论片数', value: K.num(exact, 1) + ' 片' },
            { key: '含损耗片数', value: withWaste + ' 片' },
            { key: '整片排版', value: perRow + ' 列 × ' + rows + ' 行 = ' + (perRow * rows) + ' 片' },
            { key: '采购建议', value: Math.max(withWaste, perRow * rows) + ' 片（建议多备 1 箱）' }
          ],
          note: '不规则空间或斜铺请把损耗率提高到 12% 以上'
        };
      }
    });
  }

  /* ------------------------------ 10. 还款方式对比 ------------------------------ */
  function renderLoanCompare(root) {
    K.form(root, {
      uid: 'loancompare',
      actionLabel: '对比两种方式',
      fields: [
        { id: 'amount', label: '贷款本金（元）', type: 'number', value: 1000000, min: 1000, step: 1000 },
        { id: 'rate', label: '年利率（%）', type: 'number', value: 3.6, min: 0.01, step: 0.01 },
        { id: 'months', label: '贷款期数（月）', type: 'number', value: 360, min: 1, step: 1 }
      ],
      run: function (v) {
        var principal = Number(v.amount);
        var annual = Number(v.rate) / 100;
        var months = Math.round(Number(v.months));
        if (!(principal > 0) || !(annual >= 0) || !(months > 0)) return { error: '请检查本金、利率与期数' };

        var monthlyRate = annual / 12;
        var equalPayment = monthlyRate === 0
          ? principal / months
          : principal * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
        var totalEqual = equalPayment * months;

        var principalPart = principal / months;
        var firstMonth = principalPart + principal * monthlyRate;
        var lastMonth = principalPart + principalPart * monthlyRate;
        var totalPrincipalMethod = principal + (months + 1) * principal * monthlyRate / 2;

        return {
          rows: [
            { key: '等额本息 · 月供', value: money(equalPayment) },
            { key: '等额本息 · 总利息', value: money(totalEqual - principal) },
            { key: '等额本息 · 总还款', value: money(totalEqual) },
            { key: '等额本金 · 首月', value: money(firstMonth) },
            { key: '等额本金 · 末月', value: money(lastMonth) },
            { key: '等额本金 · 总利息', value: money(totalPrincipalMethod - principal) },
            { key: '等额本金 · 总还款', value: money(totalPrincipalMethod) },
            { key: '利息差额', value: money(totalEqual - totalPrincipalMethod) + '（等额本息多付）' }
          ],
          note: '等额本金前期压力大但总利息少；等额本息月供固定，现金流更好安排'
        };
      }
    });
  }

  /* ------------------------------ 11. 储蓄目标测算 ------------------------------ */
  function renderSavingsGoal(root) {
    K.form(root, {
      uid: 'savingsgoal',
      actionLabel: '测算',
      fields: [
        { id: 'target', label: '目标金额（元）', type: 'number', value: 500000, min: 100, step: 1000 },
        { id: 'current', label: '现有本金（元）', type: 'number', value: 50000, min: 0, step: 1000 },
        { id: 'rate', label: '年化收益率（%）', type: 'number', value: 3.5, min: 0, step: 0.1 },
        { id: 'years', label: '计划年数', type: 'number', value: 5, min: 0.5, max: 50, step: 0.5 }
      ],
      hint: '按月末投入、按月复利计算，用于估算「每月要存多少」。',
      run: function (v) {
        var target = Number(v.target);
        var current = Number(v.current);
        var rate = Number(v.rate) / 100;
        var years = Number(v.years);
        if (!(target > 0) || !(years > 0) || current < 0) return { error: '请检查目标金额、本金与年数' };
        var months = Math.round(years * 12);
        var monthRate = Math.pow(1 + rate, 1 / 12) - 1;
        var grown = monthRate === 0 ? current : current * Math.pow(1 + monthRate, months);
        var gap = target - grown;
        var needed = gap <= 0 ? 0 : monthRate === 0 ? gap / months : gap * monthRate / (Math.pow(1 + monthRate, months) - 1);
        var noInterest = Math.max(0, (target - current) / months);
        return {
          rows: [
            { key: '每月需存', value: money(needed) },
            { key: '本金自然增长到', value: money(grown) },
            { key: '资金缺口', value: gap <= 0 ? '已达成，无需追加' : money(gap) },
            { key: '不计收益时每月', value: money(noInterest) },
            { key: '收益贡献', value: money(Math.max(0, needed * months + current - (target - gap))) },
            { key: '总投入', value: money(current + needed * months) },
            { key: '期数', value: months + ' 个月（' + years + ' 年）' }
          ],
          note: gap <= 0 ? '按当前本金与收益率已能在期限内达标' : '按年化 ' + v.rate + '% 复利估算，实际收益会有波动'
        };
      }
    });
  }

  /* ------------------------------ 12. 投资回报率 ------------------------------ */
  function renderRoi(root) {
    K.form(root, {
      uid: 'roi',
      actionLabel: '计算 ROI',
      fields: [
        { id: 'cost', label: '总投入（元）', type: 'number', value: 10000, min: 0.01, step: 100 },
        { id: 'revenue', label: '总收益 / 回收（元）', type: 'number', value: 13500, min: 0, step: 100 },
        { id: 'years', label: '投资年限（用于年化）', type: 'number', value: 2, min: 0.1, step: 0.1 }
      ],
      run: function (v) {
        var cost = Number(v.cost);
        var revenue = Number(v.revenue);
        var years = Number(v.years);
        if (!(cost > 0)) return { error: '总投入必须大于 0' };
        if (!(years > 0)) return { error: '投资年限必须大于 0' };
        var profit = revenue - cost;
        var roi = profit / cost * 100;
        var annualized = (Math.pow(revenue / cost, 1 / years) - 1) * 100;
        return {
          rows: [
            { key: '净利润', value: money(profit) },
            { key: 'ROI 投资回报率', value: K.num(roi, 2) + '%' },
            { key: '年化收益率 CAGR', value: K.num(annualized, 2) + '%' },
            { key: '回本倍数', value: K.num(revenue / cost, 2) + ' 倍' },
            { key: '结论', value: roi > 0 ? '盈利' : roi === 0 ? '持平' : '亏损', mono: false }
          ],
          note: 'ROI 为总回报，年化按复利折算，更适合跨项目横向比较'
        };
      }
    });
  }

  /* ------------------------------ 13. 年化复合增长率 ------------------------------ */
  function renderCagr(root) {
    K.form(root, {
      uid: 'cagr',
      actionLabel: '计算 CAGR',
      fields: [
        { id: 'start', label: '起始值', type: 'number', value: 100, min: 0.0001, step: 1 },
        { id: 'end', label: '结束值', type: 'number', value: 260, min: 0.0001, step: 1 },
        { id: 'years', label: '年数', type: 'number', value: 5, min: 0.1, step: 0.1 }
      ],
      run: function (v) {
        var start = Number(v.start);
        var end = Number(v.end);
        var years = Number(v.years);
        if (!(start > 0) || !(end > 0) || !(years > 0)) return { error: '起止值与年数都需要大于 0' };
        var cagr = (Math.pow(end / start, 1 / years) - 1) * 100;
        return {
          rows: [
            { key: 'CAGR 年化复合增长率', value: K.num(cagr, 2) + '%' },
            { key: '总增长', value: K.num((end / start - 1) * 100, 2) + '%' },
            { key: '翻倍所需年数（72 法则）', value: cagr > 0 ? K.num(72 / cagr, 1) + ' 年' : '不适用' },
            { key: '平均每年增长', value: K.num((end - start) / years, 2) }
          ],
          note: 'CAGR 只描述首尾变化，不反映中间波动'
        };
      }
    });
  }

  /* ------------------------------ 14. 加班费 ------------------------------ */
  function renderOvertimePay(root) {
    K.form(root, {
      uid: 'overtime',
      actionLabel: '计算加班费',
      fields: [
        { id: 'salary', label: '月工资（元）', type: 'number', value: 8000, min: 0, step: 100 },
        { id: 'days', label: '月计薪天数', type: 'number', value: 21.75, min: 1, max: 31, step: 0.01 },
        { id: 'weekday', label: '工作日加班（小时）', type: 'number', value: 10, min: 0, step: 0.5 },
        { id: 'weekend', label: '休息日加班（小时）', type: 'number', value: 8, min: 0, step: 0.5 },
        { id: 'holiday', label: '法定节假日加班（小时）', type: 'number', value: 0, min: 0, step: 0.5 }
      ],
      hint: '按《劳动法》倍率：工作日 1.5 倍、休息日 2 倍、法定节假日 3 倍；小时工资 = 月工资 ÷ 21.75 ÷ 8。',
      run: function (v) {
        var salary = Number(v.salary);
        if (!(salary > 0)) return { error: '请填写月工资' };
        var payDays = Number(v.days);
        if (!(payDays > 0)) return { error: '月计薪天数必须大于 0' };
        var hourly = salary / payDays / 8;
        var weekday = Number(v.weekday || 0) * hourly * 1.5;
        var weekend = Number(v.weekend || 0) * hourly * 2;
        var holiday = Number(v.holiday || 0) * hourly * 3;
        var total = weekday + weekend + holiday;
        return {
          rows: [
            { key: '小时工资', value: money(hourly) },
            { key: '工作日加班费（1.5×）', value: money(weekday) },
            { key: '休息日加班费（2×）', value: money(weekend) },
            { key: '节假日加班费（3×）', value: money(holiday) },
            { key: '加班费合计', value: money(total) },
            { key: '折合月总收入', value: money(salary + total) }
          ],
          note: '部分城市对加班费基数有下限规定，实际以当地政策与劳动合同为准'
        };
      }
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['bmr'] = renderBmr;
  window.ToolModules['tdee'] = renderTdee;
  window.ToolModules['body-fat'] = renderBodyFat;
  window.ToolModules['ideal-weight'] = renderIdealWeight;
  window.ToolModules['water-intake'] = renderWaterIntake;
  window.ToolModules['fuel-cost'] = renderFuelCost;
  window.ToolModules['electricity-cost'] = renderElectricityCost;
  window.ToolModules['paint-calc'] = renderPaintCalc;
  window.ToolModules['tile-calc'] = renderTileCalc;
  window.ToolModules['loan-compare'] = renderLoanCompare;
  window.ToolModules['savings-goal'] = renderSavingsGoal;
  window.ToolModules['roi'] = renderRoi;
  window.ToolModules['cagr'] = renderCagr;
  window.ToolModules['overtime-pay'] = renderOvertimePay;
})();
