/* =============================================================================
 * 生活实用工具包 · 第四批（10 个）
 * -----------------------------------------------------------------------------
 * zodiac-sign     星座查询
 * chinese-zodiac  生肖与干支
 * blood-type      血型遗传概率
 * cooking-convert 烹饪单位换算
 * sleep-cycle     睡眠周期计算
 * waist-hip       腰臀比与健康风险
 * shoe-size       鞋码对照
 * anniversary     纪念日与天数
 * caffeine        咖啡因代谢
 * alcohol         酒精代谢与血液酒精浓度
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  /* ------------------------------ 1. 星座 ------------------------------ */
  var ZODIAC = [
    { name: '摩羯座', start: [12, 22], end: [1, 19], element: '土象', planet: '土星', trait: '务实、有耐心、目标感强' },
    { name: '水瓶座', start: [1, 20], end: [2, 18], element: '风象', planet: '天王星', trait: '独立、理性、想法前卫' },
    { name: '双鱼座', start: [2, 19], end: [3, 20], element: '水象', planet: '海王星', trait: '共情力强、浪漫、富有想象' },
    { name: '白羊座', start: [3, 21], end: [4, 19], element: '火象', planet: '火星', trait: '直接、行动力强、爱冒险' },
    { name: '金牛座', start: [4, 20], end: [5, 20], element: '土象', planet: '金星', trait: '稳定、重视感官、耐力好' },
    { name: '双子座', start: [5, 21], end: [6, 21], element: '风象', planet: '水星', trait: '好奇、反应快、善于表达' },
    { name: '巨蟹座', start: [6, 22], end: [7, 22], element: '水象', planet: '月亮', trait: '顾家、敏感、保护欲强' },
    { name: '狮子座', start: [7, 23], end: [8, 22], element: '火象', planet: '太阳', trait: '自信、慷慨、有领导欲' },
    { name: '处女座', start: [8, 23], end: [9, 22], element: '土象', planet: '水星', trait: '细致、讲逻辑、追求完善' },
    { name: '天秤座', start: [9, 23], end: [10, 23], element: '风象', planet: '金星', trait: '重视平衡、审美佳、善协调' },
    { name: '天蝎座', start: [10, 24], end: [11, 22], element: '水象', planet: '冥王星', trait: '专注、洞察力强、爱恨分明' },
    { name: '射手座', start: [11, 23], end: [12, 21], element: '火象', planet: '木星', trait: '乐观、爱自由、喜欢远方' }
  ];

  function zodiacOf(month, day) {
    return ZODIAC.filter(function (item) {
      var s = item.start;
      var e = item.end;
      if (s[0] <= e[0]) return (month === s[0] && day >= s[1]) || (month === e[0] && day <= e[1]);
      return (month === s[0] && day >= s[1]) || (month === e[0] && day <= e[1]) || month > s[0] || month < e[0];
    })[0] || ZODIAC[0];
  }

  function renderZodiacSign(root) {
    K.form(root, {
      uid: 'zodiac',
      actionLabel: '查询星座',
      fields: [
        { id: 'date', label: '出生日期', type: 'date', value: '1995-06-15' }
      ],
      hint: '星座按公历（阳历）日期划分，农历生日请先换算为公历。',
      run: function (v) {
        if (!v.date) return { error: '请选择日期' };
        var parts = v.date.split('-');
        var month = Number(parts[1]);
        var day = Number(parts[2]);
        var sign = zodiacOf(month, day);
        return {
          rows: [
            { key: '星座', value: sign.name, mono: false },
            { key: '日期区间', value: sign.start[0] + ' 月 ' + sign.start[1] + ' 日 – ' + sign.end[0] + ' 月 ' + sign.end[1] + ' 日', mono: false },
            { key: '属性', value: sign.element, mono: false },
            { key: '守护星', value: sign.planet, mono: false },
            { key: '性格关键词', value: sign.trait, mono: false }
          ],
          note: '星座日期边界在不同年份可能相差一天，仅供娱乐参考'
        };
      }
    });
  }

  /* ------------------------------ 2. 生肖与干支 ------------------------------ */
  var STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var ANIMALS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

  function renderChineseZodiac(root) {
    K.form(root, {
      uid: 'cnzodiac',
      actionLabel: '查询',
      fields: [
        { id: 'year', label: '出生年份（公历）', type: 'number', value: 1995, min: 1900, max: 2100, step: 1 }
      ],
      hint: '以立春为界更准确，此处按公历年份近似，1-2 月出生者可能属于上一年生肖。',
      run: function (v) {
        var year = Math.round(Number(v.year));
        if (!(year >= 1900 && year <= 2100)) return { error: '年份需在 1900 – 2100 之间' };
        var index = ((year - 4) % 12 + 12) % 12;
        var stem = STEMS[((year - 4) % 10 + 10) % 10];
        var branch = BRANCHES[index];
        var now = new Date().getFullYear();
        return {
          rows: [
            { key: '生肖', value: ANIMALS[index], mono: false },
            { key: '干支', value: stem + branch + '年', mono: false },
            { key: '周岁（约）', value: (now - year) + ' 岁' },
            { key: '虚岁（约）', value: (now - year + 1) + ' 岁' },
            { key: '纳音参考', value: '每 60 年一轮回，' + (year - 4) % 60 + ' / 60' }
          ],
          note: '生肖以农历年为界，春节前出生请按上一年计算'
        };
      }
    });
  }

  /* ------------------------------ 3. 血型遗传 ------------------------------ */
  function renderBloodType(root) {
    K.form(root, {
      uid: 'bloodtype',
      actionLabel: '计算可能血型',
      fields: [
        { id: 'father', label: '父亲血型', type: 'select', value: 'A', options: [
          { value: 'A', label: 'A 型' }, { value: 'B', label: 'B 型' },
          { value: 'AB', label: 'AB 型' }, { value: 'O', label: 'O 型' }
        ] },
        { id: 'mother', label: '母亲血型', type: 'select', value: 'B', options: [
          { value: 'A', label: 'A 型' }, { value: 'B', label: 'B 型' },
          { value: 'AB', label: 'AB 型' }, { value: 'O', label: 'O 型' }
        ] }
      ],
      hint: '按 ABO 血型系统的等位基因组合推算，不含 Rh 因子。',
      run: function (v) {
        var genotype = {
          A: ['AA', 'AO'],
          B: ['BB', 'BO'],
          AB: ['AB'],
          O: ['OO']
        };
        var possible = {};
        var fatherSet = genotype[v.father] || genotype.A;
        var motherSet = genotype[v.mother] || genotype.A;
        fatherSet.forEach(function (g1) {
          motherSet.forEach(function (g2) {
            [0, 1].forEach(function (i) {
              [0, 1].forEach(function (j) {
                var pair = [g1.charAt(i), g2.charAt(j)].sort().join('');
                var type = pair.indexOf('A') >= 0 && pair.indexOf('B') >= 0 ? 'AB'
                  : pair.indexOf('A') >= 0 ? 'A'
                    : pair.indexOf('B') >= 0 ? 'B' : 'O';
                possible[type] = (possible[type] || 0) + 1;
              });
            });
          });
        });
        var total = Object.keys(possible).reduce(function (sum, key) { return sum + possible[key]; }, 0);
        var all = ['A', 'B', 'AB', 'O'];
        var rows = all.map(function (type) {
          return {
            key: type + ' 型',
            value: possible[type] ? '可能，概率约 ' + K.num(possible[type] / total * 100, 1) + '%' : '不可能',
            mono: false
          };
        });
        return {
          rows: rows,
          note: '概率为该组合下的基因型枚举结果；亲子鉴定请以医学检测为准'
        };
      }
    });
  }

  /* ------------------------------ 4. 烹饪换算 ------------------------------ */
  function renderCookingConvert(root) {
    K.form(root, {
      uid: 'cooking',
      actionLabel: '换算',
      fields: [
        { id: 'amount', label: '数量', type: 'number', value: 1, min: 0, step: 0.1 },
        { id: 'unit', label: '单位', type: 'select', value: 'cup', options: [
          { value: 'cup', label: '杯 cup（240 ml）' },
          { value: 'tbsp', label: '汤匙 tbsp（15 ml）' },
          { value: 'tsp', label: '茶匙 tsp（5 ml）' },
          { value: 'ml', label: '毫升 ml' },
          { value: 'g', label: '克 g' },
          { value: 'oz', label: '盎司 oz（28.35 g）' }
        ] },
        { id: 'ingredient', label: '食材（决定密度）', type: 'select', value: 'water', options: [
          { value: 'water', label: '水 / 牛奶（1.0 g/ml）' },
          { value: 'flour', label: '面粉（0.53 g/ml）' },
          { value: 'sugar', label: '白砂糖（0.85 g/ml）' },
          { value: 'rice', label: '大米（0.85 g/ml）' },
          { value: 'oil', label: '食用油（0.92 g/ml）' },
          { value: 'honey', label: '蜂蜜（1.42 g/ml）' }
        ] }
      ],
      hint: '体积与重量换算依赖密度，不同品牌面粉差异可达 10%，烘焙建议用厨房秤。',
      run: function (v) {
        var amount = Number(v.amount);
        if (!(amount >= 0)) return { error: '数量不能为负数' };
        var density = { water: 1, flour: 0.53, sugar: 0.85, rice: 0.85, oil: 0.92, honey: 1.42 }[v.ingredient];
        var mlPerUnit = { cup: 240, tbsp: 15, tsp: 5, ml: 1, g: null, oz: null }[v.unit];
        var ml = mlPerUnit === null ? (v.unit === 'g' ? amount / density : amount * 28.35 / density) : amount * mlPerUnit;
        var grams = ml * density;
        return {
          rows: [
            { key: '体积', value: K.num(ml, 1) + ' ml' },
            { key: '重量', value: K.num(grams, 1) + ' g' },
            { key: '杯', value: K.num(ml / 240, 2) + ' cup' },
            { key: '汤匙', value: K.num(ml / 15, 1) + ' tbsp' },
            { key: '茶匙', value: K.num(ml / 5, 1) + ' tsp' },
            { key: '盎司', value: K.num(grams / 28.35, 2) + ' oz' }
          ],
          note: '换算基于所选食材密度'
        };
      }
    });
  }

  /* ------------------------------ 5. 睡眠周期 ------------------------------ */
  function renderSleepCycle(root) {
    K.form(root, {
      uid: 'sleep',
      actionLabel: '计算',
      fields: [
        { id: 'mode', label: '计算方式', type: 'select', value: 'wake', options: [
          { value: 'wake', label: '已知入睡时间，推算起床时间' },
          { value: 'bed', label: '已知起床时间，推算入睡时间' }
        ] },
        { id: 'time', label: '时间（HH:mm）', type: 'time', value: '23:00' },
        { id: 'fall', label: '入睡耗时（分钟）', type: 'number', value: 15, min: 0, max: 90, step: 5 }
      ],
      hint: '一个完整睡眠周期约 90 分钟，建议睡 4–6 个周期（6–9 小时），在周期末尾醒来更清醒。',
      run: function (v) {
        var match = /^(\d{1,2}):(\d{2})$/.exec(String(v.time || ''));
        if (!match) return { error: '时间格式应为 HH:mm' };
        var base = Number(match[1]) * 60 + Number(match[2]);
        var fall = Math.max(0, Number(v.fall) || 0);
        function fmt(total) {
          var normalized = ((total % 1440) + 1440) % 1440;
          var h = Math.floor(normalized / 60);
          var m = normalized % 60;
          return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
        }
        var rows = [];
        [3, 4, 5, 6].forEach(function (cycles) {
          var duration = cycles * 90;
          var label = cycles + ' 个周期（' + K.num(duration / 60, 1) + ' 小时）';
          if (v.mode === 'wake') rows.push({ key: label, value: '建议起床 ' + fmt(base + fall + duration), mono: false });
          else rows.push({ key: label, value: '建议入睡 ' + fmt(base - fall - duration), mono: false });
        });
        return {
          rows: rows,
          note: v.mode === 'wake'
            ? '按 ' + v.time + ' 上床、' + fall + ' 分钟入睡计算'
            : '按 ' + v.time + ' 起床、' + fall + ' 分钟入睡计算'
        };
      }
    });
  }

  /* ------------------------------ 6. 腰臀比 ------------------------------ */
  function renderWaistHip(root) {
    K.form(root, {
      uid: 'waisthip',
      actionLabel: '计算',
      fields: [
        { id: 'sex', label: '性别', type: 'select', value: 'male', options: [
          { value: 'male', label: '男' }, { value: 'female', label: '女' }
        ] },
        { id: 'waist', label: '腰围（cm）', type: 'number', value: 84, min: 30, step: 0.1 },
        { id: 'hip', label: '臀围（cm）', type: 'number', value: 96, min: 30, step: 0.1 }
      ],
      hint: 'WHO 建议男性腰臀比 < 0.90、女性 < 0.85；腰围单独看：男性 < 90cm、女性 < 85cm。',
      run: function (v) {
        var waist = Number(v.waist);
        var hip = Number(v.hip);
        if (!(waist > 0) || !(hip > 0)) return { error: '腰围与臀围都需要填写' };
        var ratio = waist / hip;
        var limit = v.sex === 'male' ? 0.9 : 0.85;
        var level = ratio < limit - 0.05 ? '偏低' : ratio <= limit ? '正常' : ratio <= limit + 0.1 ? '偏高' : '高风险';
        return {
          rows: [
            { key: '腰臀比 WHR', value: K.num(ratio, 3) },
            { key: '参考上限', value: limit.toFixed(2) + '（' + (v.sex === 'male' ? '男' : '女') + '）' },
            { key: '评级', value: level, mono: false },
            { key: '腰围判定', value: waist < (v.sex === 'male' ? 90 : 85) ? '正常' : '腹型肥胖风险', mono: false },
            { key: '建议', value: ratio > limit ? '增加有氧运动、控制精制碳水摄入' : '保持当前生活方式', mono: false }
          ],
          note: '腰臀比反映脂肪分布，比单纯体重更能预测代谢风险'
        };
      }
    });
  }

  /* ------------------------------ 7. 鞋码对照 ------------------------------ */
  function renderShoeSize(root) {
    K.form(root, {
      uid: 'shoesize',
      actionLabel: '换算',
      fields: [
        { id: 'sex', label: '性别', type: 'select', value: 'male', options: [
          { value: 'male', label: '男' }, { value: 'female', label: '女' }
        ] },
        { id: 'length', label: '脚长（mm）', type: 'number', value: 255, min: 150, max: 330, step: 1 }
      ],
      hint: '脚长取最长脚趾到脚跟的距离，建议下午测量并留 5–10mm 余量。',
      run: function (v) {
        var mm = Number(v.length);
        if (!(mm > 0)) return { error: '请填写脚长' };
        var cm = mm / 10;
        var cn = Math.round(mm / 10) * 2 - 10;
        var eu = Math.round((cm + 1.5) * 1.5);
        var us = v.sex === 'male' ? cm * 1.5 - 11.5 : cm * 1.5 - 10.5;
        var uk = cm * 1.5 - 12.5;
        return {
          rows: [
            { key: '脚长', value: mm + ' mm' },
            { key: '中国码（旧码）', value: String(cn) },
            { key: '欧码 EU', value: String(eu) },
            { key: '美码 US（' + (v.sex === 'male' ? '男' : '女') + '）', value: K.num(us, 1) },
            { key: '英码 UK', value: K.num(uk, 1) },
            { key: '日本码 JP', value: K.num(cm, 1) + ' cm' }
          ],
          note: '各品牌鞋楦差异较大，运动鞋建议比正装鞋大半码'
        };
      }
    });
  }

  /* ------------------------------ 8. 纪念日 ------------------------------ */
  function renderAnniversary(root) {
    K.form(root, {
      uid: 'anniversary',
      actionLabel: '计算',
      fields: [
        { id: 'start', label: '起始日期', type: 'date', value: '' },
        { id: 'name', label: '名称（可选）', type: 'text', value: '在一起' }
      ],
      hint: '默认以今天为基准；包含「第 N 天」「周年」「下一个整百天」等信息。',
      run: function (v) {
        if (!v.start) return { error: '请选择起始日期' };
        var start = new Date(v.start + 'T00:00:00');
        if (isNaN(start.getTime())) return { error: '日期无效' };
        var today = new Date();
        var base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        var days = Math.floor((base - start) / 86400000) + 1;
        var years = base.getFullYear() - start.getFullYear();
        var nextAnniversary = new Date(base.getFullYear(), start.getMonth(), start.getDate());
        if (nextAnniversary < base) nextAnniversary = new Date(base.getFullYear() + 1, start.getMonth(), start.getDate());
        var toNext = Math.round((nextAnniversary - base) / 86400000);
        var nextHundred = Math.ceil(days / 100) * 100;
        return {
          rows: [
            { key: (v.name || '起始') + '至今', value: Math.max(1, days) + ' 天' },
            { key: '整年数', value: years + ' 周年' },
            { key: '下一个纪念日', value: nextAnniversary.toLocaleDateString('zh-CN') + '（' + toNext + ' 天后）', mono: false },
            { key: '下一个整百天', value: '第 ' + nextHundred + ' 天（还差 ' + (nextHundred - days) + ' 天）' },
            { key: '总周数', value: K.num(days / 7, 1) + ' 周' }
          ],
          note: '按自然日计算，起始日算作第 1 天'
        };
      }
    });
  }

  /* ------------------------------ 9. 咖啡因代谢 ------------------------------ */
  function renderCaffeine(root) {
    K.form(root, {
      uid: 'caffeine',
      actionLabel: '计算',
      fields: [
        { id: 'mg', label: '摄入量（mg）', type: 'number', value: 200, min: 1, step: 10 },
        { id: 'time', label: '饮用时间', type: 'time', value: '14:00' },
        { id: 'half', label: '半衰期（小时）', type: 'number', value: 5, min: 1, max: 12, step: 0.5 }
      ],
      hint: '咖啡因半衰期因人而异（3–7 小时），吸烟者更短、孕妇与口服避孕药使用者更长；建议睡前 8 小时停止摄入。',
      run: function (v) {
        var mg = Number(v.mg);
        var half = Number(v.half);
        if (!(mg > 0) || !(half > 0)) return { error: '摄入量与半衰期必须大于 0' };
        var match = /^(\d{1,2}):(\d{2})$/.exec(String(v.time || ''));
        if (!match) return { error: '时间格式应为 HH:mm' };
        var startMinutes = Number(match[1]) * 60 + Number(match[2]);
        function fmt(minutes) {
          var norm = ((minutes % 1440) + 1440) % 1440;
          var h = Math.floor(norm / 60);
          var m = Math.round(norm % 60);
          return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
        }
        function timeTo(target) {
          var hours = half * Math.log2(mg / target);
          return { hours: hours, clock: fmt(startMinutes + hours * 60) };
        }
        var t100 = timeTo(100);
        var t50 = timeTo(50);
        var t20 = timeTo(20);
        return {
          rows: [
            { key: '降至 100 mg', value: K.num(t100.hours, 1) + ' 小时后（' + t100.clock + '）', mono: false },
            { key: '降至 50 mg', value: K.num(t50.hours, 1) + ' 小时后（' + t50.clock + '）', mono: false },
            { key: '降至 20 mg', value: K.num(t20.hours, 1) + ' 小时后（' + t20.clock + '）', mono: false },
            { key: '完全代谢', value: K.num(half * 5, 1) + ' 小时（约 5 个半衰期）' },
            { key: '建议最后饮用', value: fmt(startMinutes - 60) + ' 前后，避免影响入睡', mono: false }
          ],
          note: '仅作估算，个体差异明显'
        };
      }
    });
  }

  /* ------------------------------ 10. 酒精代谢 ------------------------------ */
  function renderAlcohol(root) {
    K.form(root, {
      uid: 'alcohol',
      actionLabel: '估算',
      fields: [
        { id: 'sex', label: '性别', type: 'select', value: 'male', options: [
          { value: 'male', label: '男' }, { value: 'female', label: '女' }
        ] },
        { id: 'weight', label: '体重（kg）', type: 'number', value: 70, min: 30, step: 0.5 },
        { id: 'volume', label: '酒量（ml）', type: 'number', value: 500, min: 1, step: 10 },
        { id: 'abv', label: '酒精度（% vol）', type: 'number', value: 5, min: 0.1, max: 96, step: 0.1 },
        { id: 'hours', label: '已过去（小时）', type: 'number', value: 2, min: 0, step: 0.5 }
      ],
      hint: 'Widmark 公式：BAC = 酒精克数 ÷ (体重 × 分布系数) − 0.015 × 小时数。男性 r≈0.68，女性 r≈0.55。',
      run: function (v) {
        var weight = Number(v.weight);
        var volume = Number(v.volume);
        var abv = Number(v.abv);
        var hours = Number(v.hours);
        if (!(weight > 0) || !(volume > 0) || !(abv > 0) || !(hours >= 0)) return { error: '请检查各项输入' };
        var grams = volume * (abv / 100) * 0.789;
        var r = v.sex === 'male' ? 0.68 : 0.55;
        var bac = grams / (weight * r) * 100 - 0.015 * hours;
        bac = Math.max(0, bac);
        var peak = grams / (weight * r) * 100;
        var soberHours = peak / 0.015;
        var level = bac === 0 ? '已代谢完' : bac < 20 ? '基本无影响' : bac < 50 ? '反应变慢（中国酒驾标准 20mg/100ml 起）' : bac < 80 ? '酒驾区间' : '醉驾区间（≥80）';
        return {
          rows: [
            { key: '纯酒精量', value: K.num(grams, 1) + ' g' },
            { key: '峰值 BAC', value: K.num(peak, 2) + ' mg/100ml' },
            { key: '当前 BAC', value: K.num(bac, 2) + ' mg/100ml' },
            { key: '状态', value: level, mono: false },
            { key: '代谢所需总时间', value: K.num(soberHours, 1) + ' 小时' },
            { key: '剩余代谢时间', value: K.num(Math.max(0, soberHours - hours), 1) + ' 小时' }
          ],
          note: '估算值不能作为能否驾驶的依据，饮酒后请勿驾车'
        };
      }
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['zodiac-sign'] = renderZodiacSign;
  window.ToolModules['chinese-zodiac'] = renderChineseZodiac;
  window.ToolModules['blood-type'] = renderBloodType;
  window.ToolModules['cooking-convert'] = renderCookingConvert;
  window.ToolModules['sleep-cycle'] = renderSleepCycle;
  window.ToolModules['waist-hip'] = renderWaistHip;
  window.ToolModules['shoe-size'] = renderShoeSize;
  window.ToolModules['anniversary'] = renderAnniversary;
  window.ToolModules['caffeine'] = renderCaffeine;
  window.ToolModules['alcohol'] = renderAlcohol;
})();
