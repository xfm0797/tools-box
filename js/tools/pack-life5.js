/* =============================================================================
 * 生活实用工具包 · 第五批（10 个）
 * -----------------------------------------------------------------------------
 * pet-food       宠物每日喂食量
 * clothing-size  服装尺码换算
 * ring-size      戒指手寸对照
 * recipe-scale   食谱份量缩放
 * aqi-calc       PM2.5 折算 AQI
 * uv-advice      紫外线指数建议
 * due-date       预产期与孕周估算
 * child-height   孩子成年身高预测
 * noise-db       分贝与安全暴露时长
 * quake-energy   震级能量换算
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  /* ------------------------------ 1. 宠物喂食 ------------------------------ */
  function renderPetFood(root) {
    K.form(root, {
      uid: 'petfood',
      fields: [
        { id: 'species', label: '宠物', type: 'select', value: 'dog', options: [
          { value: 'dog', label: '狗' },
          { value: 'cat', label: '猫' }
        ] },
        { id: 'weight', label: '体重（kg）', type: 'number', value: 12, min: 0.3, max: 90, step: 0.1 },
        { id: 'activity', label: '活动量', type: 'select', value: 'normal', options: [
          { value: 'low', label: '低（少动 / 已绝育 / 老年）' },
          { value: 'normal', label: '正常' },
          { value: 'high', label: '高（工作犬 / 运动量大）' }
        ] },
        { id: 'kcal', label: '粮的热量（kcal / 100g）', type: 'number', value: 360, min: 200, max: 600 }
      ],
      actionLabel: '计算',
      hint: '静息能量需求 RER = 70 × 体重^0.75，再乘活动系数得到每日能量需求 DER。包装上的建议量通常偏高，按体重算更稳，喂两周看体态再微调。',
      sample: { species: 'dog', weight: 12, activity: 'normal', kcal: 360 },
      run: function (values) {
        var weight = parseFloat(values.weight);
        var kcal = parseFloat(values.kcal);
        if (!isFinite(weight) || weight <= 0) return { error: '请输入有效体重' };
        if (!isFinite(kcal) || kcal <= 0) return { error: '请输入粮的热量密度' };
        var rer = 70 * Math.pow(weight, 0.75);
        var factors = values.species === 'cat'
          ? { low: 1.0, normal: 1.2, high: 1.4 }
          : { low: 1.2, normal: 1.6, high: 2.0 };
        var der = rer * (factors[values.activity] || factors.normal);
        var grams = (der / kcal) * 100;
        return {
          rows: [
            { key: '静息能量 RER', value: K.num(rer, 0) + ' kcal/天', mono: false },
            { key: '每日能量 DER', value: K.num(der, 0) + ' kcal/天', mono: false },
            { key: '建议喂食量', value: K.num(grams, 0) + ' g/天（约 ' + K.num(grams / 2, 0) + ' g × 2 餐）', mono: false },
            { key: '按月用量', value: K.num(grams * 30 / 1000, 2) + ' kg', mono: false }
          ],
          note: '按' + (values.species === 'dog' ? '犬' : '猫') + '、体重 ' + weight + 'kg 估算'
        };
      }
    });
  }

  /* ------------------------------ 2. 服装尺码 ------------------------------ */
  var CLOTHING = [
    { cn: '155/76A', us: 'XXS', eu: '32', height: [150, 158], weight: [40, 48] },
    { cn: '160/80A', us: 'XS', eu: '34', height: [155, 163], weight: [45, 53] },
    { cn: '165/84A', us: 'S', eu: '36', height: [160, 168], weight: [50, 58] },
    { cn: '170/88A', us: 'M', eu: '38', height: [165, 173], weight: [55, 65] },
    { cn: '175/92A', us: 'L', eu: '40', height: [170, 178], weight: [62, 72] },
    { cn: '180/96A', us: 'XL', eu: '42', height: [175, 183], weight: [70, 80] },
    { cn: '185/100A', us: 'XXL', eu: '44', height: [180, 188], weight: [78, 90] },
    { cn: '190/104A', us: '3XL', eu: '46', height: [185, 195], weight: [88, 100] }
  ];

  function renderClothingSize(root) {
    K.form(root, {
      uid: 'clothsize',
      fields: [
        { id: 'gender', label: '性别', type: 'select', value: 'male', options: [
          { value: 'male', label: '男' },
          { value: 'female', label: '女' }
        ] },
        { id: 'height', label: '身高（cm）', type: 'number', value: 175, min: 140, max: 210 },
        { id: 'weight', label: '体重（kg）', type: 'number', value: 70, min: 35, max: 150 },
        { id: 'fit', label: '版型偏好', type: 'select', value: 'regular', options: [
          { value: 'slim', label: '修身（选小一码）' },
          { value: 'regular', label: '常规' },
          { value: 'loose', label: '宽松（选大一码）' }
        ] }
      ],
      actionLabel: '推荐',
      hint: '尺码以「身高/胸围 + 体型」标注，中、美、欧的字母码只是习惯差异。网购时优先看平铺尺寸表，身高体重只能给个起点。',
      sample: { gender: 'male', height: 175, weight: 70, fit: 'regular' },
      run: function (values) {
        var height = parseFloat(values.height);
        var weight = parseFloat(values.weight);
        if (!isFinite(height) || !isFinite(weight)) return { error: '请填写身高与体重' };
        var rows = CLOTHING.map(function (item) {
          var midHeight = (item.height[0] + item.height[1]) / 2;
          var midWeight = (item.weight[0] + item.weight[1]) / 2;
          return { item: item, score: Math.abs(height - midHeight) + Math.abs(weight - midWeight) * 1.4 };
        }).sort(function (a, b) { return a.score - b.score; });
        var best = rows[0].item;
        var shift = values.fit === 'slim' ? -1 : values.fit === 'loose' ? 1 : 0;
        var index = CLOTHING.indexOf(best) + shift;
        index = Math.max(0, Math.min(CLOTHING.length - 1, index));
        best = CLOTHING[index];
        return {
          rows: [
            { key: '推荐中国码', value: best.cn, mono: false },
            { key: '美国码', value: best.us, mono: false },
            { key: '欧洲码', value: best.eu, mono: false },
            { key: '参考区间', value: best.height[0] + '–' + best.height[1] + ' cm / ' + best.weight[0] + '–' + best.weight[1] + ' kg', mono: false },
            { key: '说明', value: values.gender === 'male' ? '男装版型' : '女装版型（同身高下胸腰差更大，可能需再偏小一码）', mono: false }
          ]
        };
      }
    });
  }

  /* ------------------------------ 3. 戒指手寸 ------------------------------ */
  function renderRingSize(root) {
    K.form(root, {
      uid: 'ringsize',
      fields: [
        { id: 'mode', label: '已知', type: 'select', value: 'circumference', options: [
          { value: 'circumference', label: '手指周长（mm）' },
          { value: 'diameter', label: '戒指内径（mm）' }
        ] },
        { id: 'value', label: '数值（mm）', type: 'number', value: 54, step: 0.1 }
      ],
      actionLabel: '换算',
      hint: '周长 = 内径 × π。量手时用无弹性的细线绕指根一圈，取稍松的那个读数，晚上与运动后手指会偏粗。',
      sample: { mode: 'circumference', value: 54 },
      run: function (values) {
        var num = parseFloat(values.value);
        if (!isFinite(num) || num <= 0) return { error: '请输入有效的长度' };
        var circumference = values.mode === 'diameter' ? num * Math.PI : num;
        var diameter = circumference / Math.PI;
        var us = (diameter - 11.5) / 0.8128;
        var hk = circumference - 40;
        return {
          rows: [
            { key: '周长', value: K.num(circumference, 2) + ' mm', mono: false },
            { key: '内径', value: K.num(diameter, 2) + ' mm', mono: false },
            { key: '大陆 / 港版号', value: K.num(hk, 1) + ' 号（约）', mono: false },
            { key: '美版号', value: K.num(us, 1) + ' 号（约）', mono: false },
            { key: '欧版号', value: K.num(circumference, 1) + '（欧洲多用周长毫米数）', mono: false }
          ],
          note: '不同品牌的号数标准略有差异，购买前请以商家尺寸表为准'
        };
      }
    });
  }

  /* ------------------------------ 4. 食谱缩放 ------------------------------ */
  function parseAmount(text) {
    var raw = String(text).trim();
    var mixed = /^(\d+)\s+(\d+)\/(\d+)$/.exec(raw);
    if (mixed) return parseInt(mixed[1], 10) + parseInt(mixed[2], 10) / parseInt(mixed[3], 10);
    var frac = /^(\d+)\/(\d+)$/.exec(raw);
    if (frac) return parseInt(frac[1], 10) / parseInt(frac[2], 10);
    var num = parseFloat(raw);
    return isFinite(num) ? num : NaN;
  }

  function renderRecipeScale(root) {
    K.form(root, {
      uid: 'recipescale',
      stack: true,
      fields: [
        { id: 'from', label: '原份数', type: 'number', value: 4, min: 1 },
        { id: 'to', label: '目标份数', type: 'number', value: 6, min: 1 },
        { id: 'list', label: '配料（每行：名称 数量 单位）', type: 'textarea', rows: 7, wide: true,
          value: '低筋面粉 200 g\n细砂糖 3/4 杯\n鸡蛋 2 个\n牛奶 150 ml\n黄油 1 1/2 大勺' },
        { id: 'round', label: '数量取整', type: 'select', value: 'smart', options: [
          { value: 'smart', label: '智能（≥10 取整，其余保留一位）' },
          { value: 'none', label: '保留两位小数' }
        ] }
      ],
      actionLabel: '缩放',
      hint: '支持 1/2、3/4、1 1/2 这类分数写法。蛋、个这类不可分割的配料建议向上取整，调味料（盐、香料）按 0.8 倍缩放更接近口味。',
      sample: { from: 4, to: 6, list: '低筋面粉 200 g\n鸡蛋 2 个\n盐 1/2 小勺', round: 'smart' },
      run: function (values) {
        var from = parseFloat(values.from);
        var to = parseFloat(values.to);
        if (!isFinite(from) || from <= 0) return { error: '原份数需大于 0' };
        if (!isFinite(to) || to <= 0) return { error: '目标份数需大于 0' };
        var factor = to / from;
        var lines = String(values.list || '').split(/\r?\n/).filter(function (line) { return line.trim() !== ''; });
        if (!lines.length) return { error: '请填写配料清单' };
        var rows = [];
        lines.forEach(function (line) {
          var parts = line.trim().split(/\s+/);
          var name = parts.shift();
          var amountText = parts.shift();
          var unit = parts.join(' ');
          var amount = parseAmount(amountText);
          if (!isFinite(amount)) throw new Error('「' + line + '」的数量无法识别');
          var scaled = amount * factor;
          var isCount = /^(个|只|枚|片|张|根|瓣|颗)$/.test(unit);
          if (isCount) scaled = Math.ceil(scaled - 0.001);
          else if (/^(盐|糖|香料|胡椒|辣椒|生抽|老抽)$/.test(name)) scaled = scaled * 0.85;
          var display = values.round === 'none' ? K.num(scaled, 2)
            : scaled >= 10 ? String(Math.round(scaled)) : K.num(scaled, 1);
          rows.push([name, amountText + (unit ? ' ' + unit : ''), display + (unit ? ' ' + unit : '')]);
        });
        return {
          html: K.table(['配料', '原量', '缩放后'], rows),
          note: '按 ' + from + ' → ' + to + ' 份缩放（× ' + K.num(factor, 2) + '）' +
            (factor !== 1 ? '，鸡蛋等计数类已向上取整，调味料按 0.85 折减' : '')
        };
      }
    });
  }

  /* ------------------------------ 5. AQI ------------------------------ */
  var AQI_BREAKS = [
    { cLow: 0, cHigh: 35, iLow: 0, iHigh: 50, level: '优', color: '#00e400', advice: '空气很好，可以正常户外活动。' },
    { cLow: 35, cHigh: 75, iLow: 50, iHigh: 100, level: '良', color: '#ffff00', advice: '可正常活动，极少数敏感人群应减少户外剧烈运动。' },
    { cLow: 75, cHigh: 115, iLow: 100, iHigh: 150, level: '轻度污染', color: '#ff7e00', advice: '儿童、老人与心肺疾病患者减少户外活动。' },
    { cLow: 115, cHigh: 150, iLow: 150, iHigh: 200, level: '中度污染', color: '#ff0000', advice: '敏感人群避免户外活动，普通人减少户外运动。' },
    { cLow: 150, cHigh: 250, iLow: 200, iHigh: 300, level: '重度污染', color: '#99004c', advice: '尽量留在室内，关闭门窗并开启净化器。' },
    { cLow: 250, cHigh: 350, iLow: 300, iHigh: 400, level: '严重污染', color: '#7e0023', advice: '避免外出，必须外出时佩戴 N95 口罩。' },
    { cLow: 350, cHigh: 500, iLow: 400, iHigh: 500, level: '严重污染', color: '#7e0023', advice: '所有人群避免户外活动。' }
  ];

  function renderAqi(root) {
    K.form(root, {
      uid: 'aqi',
      fields: [
        { id: 'pm25', label: 'PM2.5 浓度（μg/m³）', type: 'number', value: 58, min: 0, max: 600, step: 0.1 },
        { id: 'pm10', label: 'PM10 浓度（可选）', type: 'number', value: 0, min: 0, max: 800, step: 0.1 }
      ],
      actionLabel: '折算',
      hint: '按中国《环境空气质量指数技术规定》HJ 633-2012 的 24 小时浓度限值分段线性折算。AQI 取各项污染物分指数中的最大值，这里只算颗粒物。',
      sample: { pm25: 58, pm10: 92 },
      run: function (values) {
        var pm25 = parseFloat(values.pm25);
        if (!isFinite(pm25) || pm25 < 0) return { error: '请输入有效的 PM2.5 浓度' };
        var band = AQI_BREAKS.filter(function (item) { return pm25 >= item.cLow && pm25 <= item.cHigh; })[0] || AQI_BREAKS[AQI_BREAKS.length - 1];
        var iaqi = Math.round(((band.iHigh - band.iLow) / (band.cHigh - band.cLow)) * (pm25 - band.cLow) + band.iLow);
        var rows = [
          { key: 'PM2.5 分指数 IAQI', value: String(iaqi), mono: false },
          { key: '等级', value: band.level, mono: false },
          { key: '健康提示', value: band.advice, mono: false }
        ];
        var pm10 = parseFloat(values.pm10);
        if (isFinite(pm10) && pm10 > 0) {
          var pm10Band = AQI_BREAKS.filter(function (item) { return pm10 / 2 >= item.cLow && pm10 / 2 <= item.cHigh; })[0];
          rows.push({ key: 'PM10 参考', value: pm10 + ' μg/m³（PM10 的 AQI 断点约为 PM2.5 的 2 倍，仅供粗略对比）', mono: false });
          if (pm10Band && pm10Band.iHigh > iaqi) rows.push({ key: '注意', value: 'PM10 可能成为首要污染物，实际 AQI 会更高', mono: false });
        }
        return { rows: rows, note: 'AQI ' + iaqi + ' · ' + band.level };
      }
    });
  }

  /* ------------------------------ 6. 紫外线 ------------------------------ */
  var UV_LEVELS = [
    { max: 2, level: '1 级 低', spf: '可不做特殊防护', advice: '正常外出即可，长时间户外建议戴帽子。' },
    { max: 5, level: '2 级 中等', spf: 'SPF 15+ / PA+', advice: '正午减少暴晒，涂防晒或打伞。' },
    { max: 7, level: '3 级 高', spf: 'SPF 30+ / PA++', advice: '10:00–16:00 尽量在阴凉处，每 2 小时补涂。' },
    { max: 10, level: '4 级 很高', spf: 'SPF 50+ / PA+++', advice: '避免正午外出，戴帽、墨镜与长袖。' },
    { max: 99, level: '5 级 极高', spf: 'SPF 50+ / PA++++', advice: '尽量不外出，暴露皮肤必须遮挡。' }
  ];

  function renderUv(root) {
    K.form(root, {
      uid: 'uv',
      fields: [
        { id: 'uv', label: '紫外线指数 UVI', type: 'number', value: 8, min: 0, max: 15, step: 1 },
        { id: 'skin', label: '肤色类型', type: 'select', value: '3', options: [
          { value: '1', label: 'I 型：极易晒伤（白皙、雀斑）' },
          { value: '2', label: 'II 型：容易晒伤' },
          { value: '3', label: 'III 型：一般' },
          { value: '4', label: 'IV 型：不易晒伤（偏深）' }
        ] }
      ],
      actionLabel: '评估',
      hint: 'UVI 每升高 1，晒伤速度大约加快。防晒霜的 SPF 只对 UVB 有效，PA 才是 UVA；涂一次不等于全天有效，出汗与摩擦都会掉。',
      sample: { uv: 8, skin: '3' },
      run: function (values) {
        var uvi = parseFloat(values.uv);
        if (!isFinite(uvi) || uvi < 0) return { error: '请输入有效的 UVI' };
        var band = UV_LEVELS.filter(function (item) { return uvi <= item.max; })[0] || UV_LEVELS[UV_LEVELS.length - 1];
        var base = { 1: 67, 2: 100, 3: 200, 4: 300 }[values.skin] || 200;
        var minutes = Math.round(base / Math.max(0.3, uvi));
        return {
          rows: [
            { key: '等级', value: band.level, mono: false },
            { key: '防晒建议', value: band.spf, mono: false },
            { key: '做法', value: band.advice, mono: false },
            { key: '大致晒伤时间', value: minutes + ' 分钟（无防护、正午直射）', mono: false }
          ],
          note: 'UVI ' + uvi + ' · ' + band.level
        };
      }
    });
  }

  /* ------------------------------ 7. 预产期 ------------------------------ */
  function renderDueDate(root) {
    var defaultLmp = new Date(Date.now() - 70 * 86400000).toISOString().slice(0, 10);
    K.form(root, {
      uid: 'duedate',
      fields: [
        { id: 'lmp', label: '末次月经第一天', type: 'date', value: defaultLmp },
        { id: 'cycle', label: '月经周期（天）', type: 'number', value: 28, min: 20, max: 45 }
      ],
      actionLabel: '估算',
      hint: '内格勒法则：预产期 = 末次月经首日 + 280 天（按 28 天周期）。周期偏长者按差值顺延。预产期只是估算，实际分娩在 ±2 周内都很常见，具体请以产检医生判断为准。',
      sample: { lmp: '', cycle: 28 },
      run: function (values) {
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(values.lmp || ''));
        if (!m) return { error: '请选择末次月经第一天的日期' };
        var lmp = new Date(+m[1], +m[2] - 1, +m[3]);
        var cycle = Math.max(20, Math.min(45, parseInt(values.cycle, 10) || 28));
        var adjust = cycle - 28;
        var due = new Date(lmp.getTime() + (280 + adjust) * 86400000);
        var now = new Date();
        var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        var days = Math.floor((today - lmp) / 86400000);
        if (days < 0) return { error: '末次月经日期不能晚于今天' };
        var weeks = Math.floor(days / 7);
        var restDays = days % 7;
        var trimester = weeks < 13 ? '孕早期' : weeks < 28 ? '孕中期' : '孕晚期';
        var remain = Math.ceil((due - today) / 86400000);
        function fmt(date) {
          return date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).slice(-2) + '-' + ('0' + date.getDate()).slice(-2);
        }
        return {
          rows: [
            { key: '预产期', value: fmt(due) + '（' + ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][due.getDay()] + '）', mono: false },
            { key: '当前孕周', value: weeks + ' 周 ' + restDays + ' 天（' + trimester + '）', mono: false },
            { key: '距预产期', value: remain > 0 ? '还有 ' + remain + ' 天' : '已超过预产期 ' + Math.abs(remain) + ' 天', mono: false },
            { key: '孕早期结束', value: fmt(new Date(lmp.getTime() + 13 * 7 * 86400000)), mono: false },
            { key: '孕中期结束', value: fmt(new Date(lmp.getTime() + 28 * 7 * 86400000)), mono: false }
          ],
          note: '按 ' + cycle + ' 天周期估算，仅供参考'
        };
      }
    });
  }

  /* ------------------------------ 8. 成年身高预测 ------------------------------ */
  function renderChildHeight(root) {
    K.form(root, {
      uid: 'childheight',
      fields: [
        { id: 'father', label: '父亲身高（cm）', type: 'number', value: 175, min: 140, max: 220 },
        { id: 'mother', label: '母亲身高（cm）', type: 'number', value: 162, min: 140, max: 220 },
        { id: 'gender', label: '孩子性别', type: 'select', value: 'boy', options: [
          { value: 'boy', label: '男孩' },
          { value: 'girl', label: '女孩' }
        ] }
      ],
      actionLabel: '预测',
      hint: '遗传靶身高（mid-parental height）：男孩 =（父 + 母 + 13）÷ 2，女孩 =（父 + 母 − 13）÷ 2，结果上下浮动约 ±8.5 cm。营养、睡眠与运动会影响最终落在区间里的位置。',
      sample: { father: 175, mother: 162, gender: 'boy' },
      run: function (values) {
        var father = parseFloat(values.father);
        var mother = parseFloat(values.mother);
        if (!isFinite(father) || !isFinite(mother)) return { error: '请填写父母身高' };
        var target = values.gender === 'boy' ? (father + mother + 13) / 2 : (father + mother - 13) / 2;
        return {
          rows: [
            { key: '遗传靶身高', value: K.num(target, 1) + ' cm', mono: false },
            { key: '常见区间', value: K.num(target - 8.5, 1) + ' – ' + K.num(target + 8.5, 1) + ' cm', mono: false },
            { key: '父母平均', value: K.num((father + mother) / 2, 1) + ' cm', mono: false },
            { key: '提示', value: '公式只能给出遗传倾向，不能替代骨龄评估；若明显偏离生长曲线，建议看儿科内分泌科。', mono: false }
          ]
        };
      }
    });
  }

  /* ------------------------------ 9. 分贝 ------------------------------ */
  var DB_SCENES = [
    { db: 30, scene: '安静的卧室' },
    { db: 40, scene: '图书馆' },
    { db: 55, scene: '普通交谈' },
    { db: 65, scene: '街道交通' },
    { db: 75, scene: '吸尘器' },
    { db: 85, scene: '繁忙马路 / 工厂' },
    { db: 95, scene: '地铁进站' },
    { db: 105, scene: '音乐会前排' },
    { db: 115, scene: '电锯 / 摇滚现场' },
    { db: 130, scene: '飞机起飞（近距离）' }
  ];

  function renderNoise(root) {
    K.form(root, {
      uid: 'noise',
      fields: [
        { id: 'db', label: '声压级（dB SPL）', type: 'number', value: 95, min: 0, max: 160, step: 1 },
        { id: 'hours', label: '每天暴露时长（小时）', type: 'number', value: 1, min: 0.1, max: 24, step: 0.1 }
      ],
      actionLabel: '评估',
      hint: 'NIOSH 标准：85 dB 每天最多 8 小时，每增加 3 dB 允许时长减半。声压每 +10 dB 能量是 10 倍，所以 95 dB 只有 47 分钟额度。',
      sample: { db: 95, hours: 1 },
      run: function (values) {
        var db = parseFloat(values.db);
        var hours = parseFloat(values.hours);
        if (!isFinite(db) || db < 0) return { error: '请输入有效分贝值' };
        if (!isFinite(hours) || hours <= 0) return { error: '请输入有效时长' };
        var allowed = 8 / Math.pow(2, (db - 85) / 3);
        var dose = (hours / allowed) * 100;
        var nearest = DB_SCENES.reduce(function (best, item) {
          return Math.abs(item.db - db) < Math.abs(best.db - db) ? item : best;
        }, DB_SCENES[0]);
        var pressure = Math.pow(10, db / 20) * 20e-6;
        return {
          rows: [
            { key: '安全暴露上限', value: allowed >= 1 ? K.num(allowed, 1) + ' 小时/天' : K.num(allowed * 60, 0) + ' 分钟/天', mono: false },
            { key: '当前日剂量', value: K.num(dose, 0) + '%' + (dose > 100 ? '（已超标）' : dose > 50 ? '（接近上限）' : '（安全）'), mono: false },
            { key: '声压', value: K.num(pressure, 4) + ' Pa（相对 20 μPa）', mono: false },
            { key: '相近场景', value: nearest.scene + '（约 ' + nearest.db + ' dB）', mono: false },
            { key: '建议', value: dose > 100 ? '务必使用耳塞或降低音量，长期超量会造成不可逆听力损失' : '注意间歇休息，远离声源', mono: false }
          ]
        };
      }
    });
  }

  /* ------------------------------ 10. 震级能量 ------------------------------ */
  function renderQuake(root) {
    K.form(root, {
      uid: 'quake',
      fields: [
        { id: 'magnitude', label: '震级 M', type: 'number', value: 6.0, min: 0, max: 9.9, step: 0.1 },
        { id: 'compare', label: '与另一震级比较', type: 'number', value: 5.0, min: 0, max: 9.9, step: 0.1 }
      ],
      actionLabel: '换算',
      hint: '古登堡-里希特能量公式：log₁₀E = 4.8 + 1.5M（单位焦耳）。震级每增加 1，能量约放大 31.6 倍；每增加 0.2，能量翻一倍。',
      sample: { magnitude: 6.0, compare: 5.0 },
      run: function (values) {
        var m = parseFloat(values.magnitude);
        if (!isFinite(m)) return { error: '请输入震级' };
        var energy = Math.pow(10, 4.8 + 1.5 * m);
        var tnt = energy / 4.184e9;
        var other = parseFloat(values.compare);
        var rows = [
          { key: '能量', value: energy.toExponential(3) + ' J', mono: false },
          { key: 'TNT 当量', value: K.num(tnt, 1) + ' 吨（' + K.num(tnt / 10000, 3) + ' 万吨 TNT）', mono: false },
          { key: '相对 4 级', value: K.num(energy / Math.pow(10, 4.8 + 1.5 * 4), 1) + ' 倍', mono: false }
        ];
        if (isFinite(other)) {
          var diff = m - other;
          rows.push({
            key: 'M' + K.num(other, 1) + ' 对比',
            value: '能量差 ' + Math.pow(10, 1.5 * diff).toFixed(2) + ' 倍（振幅差 ' + Math.pow(10, diff).toFixed(2) + ' 倍）',
            mono: false
          });
        }
        rows.push({ key: '提示', value: '能量并不等于破坏力：震源深度、场地条件与建筑抗震等级影响更大。', mono: false });
        return { rows: rows };
      }
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['pet-food'] = renderPetFood;
  window.ToolModules['clothing-size'] = renderClothingSize;
  window.ToolModules['ring-size'] = renderRingSize;
  window.ToolModules['recipe-scale'] = renderRecipeScale;
  window.ToolModules['aqi-calc'] = renderAqi;
  window.ToolModules['uv-advice'] = renderUv;
  window.ToolModules['due-date'] = renderDueDate;
  window.ToolModules['child-height'] = renderChildHeight;
  window.ToolModules['noise-db'] = renderNoise;
  window.ToolModules['quake-energy'] = renderQuake;
})();
