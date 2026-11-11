/* =============================================================================
 * 命理文化工具包
 * -----------------------------------------------------------------------------
 * zhouyi-naming   周易起名（八字五行 + 五格剖象）
 *
 * 说明：
 *   1. 排盘用公历生日推四柱（年柱以立春分界、月柱以节气分界、日柱用儒略日、
 *      时柱用五鼠遁）。节气日期取常年近似值，误差 1 天以内，属正常范围。
 *   2. 五格剖象按康熙笔画推算天格 / 人格 / 地格 / 总格 / 外格，配合 81 数理
 *      吉凶与三才五行生克打分；字库按五行归类，取用神所在行的字做组合。
 *   3. 全部属民俗文化范畴，不构成任何预测或建议，结果仅供取名参考。
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  /* ------------------------------ 干支与五行 ------------------------------ */

  var STEMS = '甲乙丙丁戊己庚辛壬癸'.split('');
  var BRANCHES = '子丑寅卯辰巳午未申酉戌亥'.split('');
  var STEM_WX = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
  var BRANCH_WX = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];
  var WX = ['木', '火', '土', '金', '水'];
  var SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };    // 我生
  var SHENG_BY = { 火: '木', 土: '火', 金: '土', 水: '金', 木: '水' }; // 生我
  var KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };       // 我克
  var WX_COLOR = { 木: '#16a34a', 火: '#dc2626', 土: '#b45309', 金: '#a16207', 水: '#2563eb' };

  // 各月节气日（小寒 / 立春 / 惊蛰 / 清明 / 立夏 / 芒种 / 小暑 / 立秋 / 白露 / 寒露 / 立冬 / 大雪）
  var TERM_DAY = [6, 4, 6, 5, 6, 6, 7, 8, 8, 8, 7, 7];

  /* ------------------------------ 姓氏笔画 ------------------------------ */

  var SURNAME_RAW =
    '王4 李7 张11 刘15 陈16 杨13 赵14 黄12 周8 吴7 徐10 孙10 胡11 朱6 高10 林8 何7 郭15 马10 罗20 ' +
    '梁11 宋7 郑19 谢17 韩17 唐10 冯12 于3 董15 萧18 程12 曹11 袁10 邓19 许11 傅12 沈8 曾12 彭12 吕7 ' +
    '苏22 卢16 蒋17 蔡17 贾13 丁2 魏18 薛19 叶15 阎16 余7 潘16 杜7 戴18 夏10 钟17 汪8 田5 任6 姜9 ' +
    '范11 方4 石5 姚9 谭19 廖14 邹17 熊14 金8 陆16 郝14 孔4 白5 崔11 康11 毛4 邱12 秦10 江7 史5 ' +
    '顾21 侯9 邵12 孟8 龙16 万15 段9 雷13 钱16 汤13 尹4 黎15 易8 常11 武8 乔12 贺12 赖16 龚22 文4 ' +
    '庞19 樊15 兰23 殷10 施9 陶16 洪10 翟14 安6 颜18 倪10 严20 牛4 温13 季8 俞9 章11 鲁15 葛15 伍6 ' +
    '韦9 申5 尤4 毕10 聂18 焦12 向6 柳9 邢11 路13 岳8 齐14 祁8 时10 舒12 屈8 项12 闵12 包5 左5';

  // 复姓里出现、但单姓表未收录的字，同样按康熙笔画补上
  var SURNAME_EXTRA_RAW =
    '欧15 阳17 诸15 皇9 甫7 尉11 迟19 慕15 容10 宇6 长8 俟9 闻14 人2 赫14 连14 澹16 台5 冶7 宗8 政9 ' +
    '濮17 淳12 屠12 轩10 辕17 狐9 离19 闾15 呼8 延7 微13 雕16 拓9 跋12 夹7 谷7 漆15 乐15 正5 壤20 ' +
    '驷15 良7 干3 独16 孤8 宫10 门8 西6 叔8 太4 单12 上3 官8 ' +
    '司5 徒10 空8 羊6 令5 百6 里7 南9 舌6 生5 东8 公4 丘5';

  // 常见复姓：两字分别取笔画，天格与人格都按复姓规则算
  var COMPOUND_RAW =
    '欧阳 司马 上官 诸葛 东方 皇甫 尉迟 公孙 慕容 长孙 宇文 司徒 司空 夏侯 万俟 闻人 赫连 澹台 ' +
    '公冶 宗政 濮阳 淳于 单于 太叔 申屠 公羊 轩辕 令狐 钟离 闾丘 百里 东郭 南门 呼延 羊舌 微生 ' +
    '梁丘 左丘 东门 西门 南宫 独孤 拓跋 夹谷 漆雕 乐正 壤驷 公良 谷梁 段干';

  function parseSurname(raw) {
    var map = {};
    raw.split(/\s+/).forEach(function (item) {
      var m = /^([\u4e00-\u9fa5])(\d{1,2})$/.exec(item);
      if (m) map[m[1]] = parseInt(m[2], 10);
    });
    return map;
  }

  var SURNAMES = parseSurname(SURNAME_RAW + ' ' + SURNAME_EXTRA_RAW);

  var COMPOUND = {};
  COMPOUND_RAW.split(/\s+/).forEach(function (item) {
    if (item.length === 2) COMPOUND[item] = true;
  });

  /** 单字康熙笔画，未收录返回 0 */
  function charStroke(ch) {
    return SURNAMES[ch] || 0;
  }

  /* ------------------------------ 字库 --------------------------------
   * 每条格式：汉字 + 康熙笔画 + 性别(m 男 / f 女 / u 通用) + 类别
   *   性别：m 偏男 · f 偏女 · u 通用
   *   类别：t 草木自然 · w 水泽 · f 光火 · e 玉石土石 · m 金器 · p 品德 · a 文雅 · s 声名
   * 汉字一律用简体，笔画仍按繁体康熙计（枫 8 画简体、13 画康熙），
   * 五行归属与笔画都取传统算法，不随简化字改动。
   * 名字两字同类会被扣分，避免「桐楠」「薇蕾」这类部首堆叠。
   * ------------------------------------------------------------------ */

  var POOL_RAW = {
    木: [
      '林8mt', '松8mt', '柏9mt', '柯9mt', '桓10mt', '森12mt', '茂11mt',
      '栩10um', '桐10um', '梓11um', '楠13um', '榆13um', '枫13um',
      '楚13ua', '荣14um', '楷13mp', '槿15ff',
      '英11fp', '若11fa', '苗11ft', '芊9fa', '芳10fa', '芝10fa', '芸10fa',
      '萱15fa', '菁14fa', '菲14fa', '蓉16fa', '蕾19fa', '薇19fa', '兰23fa'
    ],
    火: [
      '旭6mf', '明8uf', '昕8ff', '昊8mf', '昌8mf', '昭9mf', '昱9mf', '炫9mf',
      '炯9mf', '南9ma', '亮9mf', '彤7ff', '丹4ff', '晶12ff', '晴12ff', '暖13ff',
      '晖13mf', '煜13mf', '焕13mf', '炜13mf', '烨16mf', '灿17ff', '晓16ff', '曦20ff',
      '智12mp', '礼18mp', '夏10ff', '晗11ff', '卓8mp', '朗10mf', '晨11uf', '炎8mf'
    ],
    土: [
      '山3mt', '岩8me', '峰10mt', '坤8me', '垚9me', '培11mp', '城10me', '基11me',
      '坚11mp', '堂11me', '墨15ua', '圣13mp', '辰7ue', '玉5fe', '玮14ue', '瑾16fe',
      '瑶15fe', '珊10fe', '琳13fe', '琪13fe', '琦13fe', '瑞14ue', '瑜14fe', '璇16fe',
      '璟17fe', '瑛16fe', '岚12fe', '嵘17me', '岳17me'
    ],
    金: [
      '金8mm', '锐15mm', '铭14mm', '钰13fe', '锋15mm', '钧12mm', '钢16mm', '鑫24mm',
      '银14fe', '铜14mm', '钟17mm', '锦16um', '锡16mm', '素10fa', '纯10fa', '秋9ut',
      '商11mm', '善12mp', '诗13fa', '诚14mp', '信9mp', '声17ms', '白5ua', '申5mm',
      '修10mp', '儒16mp'
    ],
    水: [
      '水4uw', '江7mm', '河9mm', '海11mm', '洋10mm', '波9mm', '润16mm', '泽17mm',
      '清12uw', '洁16ff', '涵12ff', '渊12mm', '源14mm', '泓9mm', '沐8uw', '沛8mm',
      '沁8ff', '汐7ff', '沅8ff', '泳9mm', '浩11mm', '淼12mm', '湖13mm', '溪14ff',
      '瀛20mm', '雨8ff', '雪11ff', '云12uw', '霖16mm', '露20ff', '霜17ff', '雯12ff',
      '霏16ff', '霓16ff'
    ]
  };

  function parsePool(list) {
    var out = [];
    list.forEach(function (item) {
      var m = /^([\u4e00-\u9fa5])(\d{1,2})([a-z]{2})$/.exec(item);
      if (!m) return;
      out.push({ ch: m[1], stroke: parseInt(m[2], 10), sex: m[3].charAt(0), cat: m[3].charAt(1) });
    });
    return out;
  }

  var POOLS = {};
  WX.forEach(function (wx) { POOLS[wx] = parsePool(POOL_RAW[wx]); });

  /* ------------------------------ 八十一数理 ------------------------------ */

  var LUCK_GOOD = [1, 3, 5, 6, 7, 8, 11, 13, 15, 16, 17, 18, 21, 23, 24, 25, 29, 31, 32,
    33, 35, 37, 39, 41, 45, 47, 48, 52, 57, 61, 63, 65, 67, 68, 81];
  var LUCK_HALF = [27, 30, 38, 40, 42, 43, 46, 49, 50, 51, 53, 55, 58, 60, 62, 70, 71, 73,
    75, 77, 78, 80];

  function luckOf(n) {
    var v = n;
    while (v > 81) v -= 80;
    if (LUCK_GOOD.indexOf(v) >= 0) return 2;   // 吉
    if (LUCK_HALF.indexOf(v) >= 0) return 1;   // 半吉
    return 0;                                  // 凶
  }

  function luckText(level) {
    return level === 2 ? '吉' : level === 1 ? '半吉' : '凶';
  }

  /** 数理五行：尾数 1·2 木、3·4 火、5·6 土、7·8 金、9·0 水 */
  function numWx(n) {
    var t = n % 10;
    if (t === 1 || t === 2) return '木';
    if (t === 3 || t === 4) return '火';
    if (t === 5 || t === 6) return '土';
    if (t === 7 || t === 8) return '金';
    return '水';
  }

  /** 三才相性：a 对 b 的关系得分（满分 10） */
  function relationScore(a, b) {
    if (a === b) return 8;            // 比和
    if (SHENG[a] === b) return 10;    // 相生
    if (SHENG[b] === a) return 8;     // 受生
    if (KE[a] === b) return 2;        // 我克（耗）
    return 4;                         // 被克
  }

  /* ------------------------------ 排盘 ------------------------------ */

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  /** 公历转儒略日数（整数） */
  function julianDay(y, m, d) {
    var a = Math.floor((14 - m) / 12);
    var yy = y + 4800 - a;
    var mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy +
      Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }

  /** 日柱序号（0 = 甲子） */
  function dayIndex(y, m, d) {
    return (julianDay(y, m, d) + 49) % 60;
  }

  /** 月支索引：以节气为界 */
  function monthBranch(m, d) {
    var after = d >= TERM_DAY[m - 1];
    if (m === 12) return after ? 0 : 11;
    if (m === 1) return after ? 1 : 0;
    return after ? m : m - 1;
  }

  function ganzhi(stem, branch) {
    return STEMS[stem] + BRANCHES[branch];
  }

  /**
   * 四柱排盘
   * @returns {object|null} { year, month, day, hour, count, dayStem, dayWx, strength, favor }
   */
  function calcBazi(y, m, d, hh, mm) {
    if (!(y >= 1900 && y <= 2100) || !(m >= 1 && m <= 12) || !(d >= 1 && d <= 31)) return null;

    // 年柱：立春（2 月 4 日）分界
    var yearForPillar = (m < 2 || (m === 2 && d < 4)) ? y - 1 : y;
    var yearStem = ((yearForPillar - 4) % 10 + 10) % 10;
    var yearBranch = ((yearForPillar - 4) % 12 + 12) % 12;

    // 月柱：五虎遁，寅月天干 = (年干 % 5) * 2 + 2
    var mBranch = monthBranch(m, d);
    var monthOrder = ((mBranch - 2) + 12) % 12 + 1;   // 寅 = 1
    var firstMonthStem = ((yearStem % 5) * 2 + 2) % 10;
    var monthStem = (firstMonthStem + monthOrder - 1) % 10;

    // 日柱：23 点后算次日
    var lateNight = hh >= 23;
    var dIdx = dayIndex(y, m, d);
    if (lateNight) dIdx = (dIdx + 1) % 60;
    var dayStem = dIdx % 10;
    var dayBranch = dIdx % 12;

    // 时柱：五鼠遁，子时天干 = (日干 % 5) * 2
    var hourBranch = hh === 23 ? 0 : Math.floor((hh + 1) / 2) % 12;
    var hourStem = ((dayStem % 5) * 2 + hourBranch) % 10;

    var pillars = [
      { label: '年柱', stem: yearStem, branch: yearBranch },
      { label: '月柱', stem: monthStem, branch: mBranch },
      { label: '日柱', stem: dayStem, branch: dayBranch },
      { label: '时柱', stem: hourStem, branch: hourBranch }
    ];

    // 五行统计：四个天干 + 四个地支
    var count = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    pillars.forEach(function (p) {
      count[STEM_WX[p.stem]] += 1;
      count[BRANCH_WX[p.branch]] += 1;
    });

    var dayWx = STEM_WX[dayStem];
    var ally = count[dayWx] + count[SHENG_BY[dayWx]];   // 比劫 + 印
    var strength = ally >= 5 ? 'strong' : ally <= 3 ? 'weak' : 'balanced';

    var favor = [];
    if (strength === 'weak') {
      favor = [SHENG_BY[dayWx], dayWx];
    } else if (strength === 'strong') {
      favor = [SHENG[dayWx], KE[dayWx]];
    } else {
      favor = WX.slice().sort(function (a, b) { return count[a] - count[b]; }).slice(0, 2);
    }
    favor = favor.filter(function (item, i) { return item && favor.indexOf(item) === i; });

    return {
      pillars: pillars,
      count: count,
      dayStem: dayStem,
      dayWx: dayWx,
      ally: ally,
      strength: strength,
      favor: favor,
      yearPillar: ganzhi(yearStem, yearBranch),
      monthPillar: ganzhi(monthStem, mBranch),
      dayPillar: ganzhi(dayStem, dayBranch),
      hourPillar: ganzhi(hourStem, hourBranch)
    };
  }

  /* ------------------------------ 五格与评分 ------------------------------ */

  /**
   * @param {Array} strokes 姓的逐字康熙笔画（单姓 1 个、复姓 2 个）
   * @param {Array} chars 名（1 或 2 个字对象）
   * @param {Array} favor 用神五行
   */
  function scoreName(strokes, chars, favor) {
    var compound = strokes.length === 2;
    var s = compound ? strokes[0] + strokes[1] : strokes[0];
    var nameSum = chars[0].stroke + (chars.length === 2 ? chars[1].stroke : 0);

    // 天格：单姓补虚位 1，复姓两字相加
    var tian = compound ? s : s + 1;
    // 人格：姓的末字 + 名的首字
    var ren = (compound ? strokes[1] : strokes[0]) + chars[0].stroke;
    // 地格：单名补虚位 1
    var di = chars.length === 2 ? chars[0].stroke + chars[1].stroke : chars[0].stroke + 1;
    var zong = s + nameSum;
    // 外格：总格 − 人格 + 1；单姓单名无所谓副运，古法固定取 2
    var wai = (chars.length === 1 && !compound) ? 2 : zong - ren + 1;

    var cells = [
      { label: '天格', value: tian },
      { label: '人格', value: ren },
      { label: '地格', value: di },
      { label: '总格', value: zong },
      { label: '外格', value: wai }
    ];

    // 五格：每格 12 分，人格与总格为凶额外扣 10
    var wugeScore = 0;
    cells.forEach(function (cell) {
      var lv = luckOf(cell.value);
      cell.level = lv;
      cell.wx = numWx(cell.value);
      wugeScore += lv === 2 ? 12 : lv === 1 ? 7 : 0;
    });
    if (cells[1].level === 0) wugeScore -= 10;
    if (cells[3].level === 0) wugeScore -= 10;
    wugeScore = Math.max(0, wugeScore);

    // 三才
    var sancai = cells[0].wx + cells[1].wx + cells[2].wx;
    var sancaiScore = relationScore(cells[0].wx, cells[1].wx) + relationScore(cells[1].wx, cells[2].wx);

    // 用神匹配
    var wxScore = 0;
    chars.forEach(function (ch) {
      if (favor.indexOf(ch.wx) >= 0) wxScore += 10;
    });

    // 两字同类别扣分（部首堆叠）
    var penalty = 0;
    if (chars.length === 2 && chars[0].cat === chars[1].cat) penalty = 8;

    // 单姓单名外格固定为 2（凶），五格天然少 12 分，按 88 分制归一化；
    // 复姓单名的外格是「姓首字 + 1」，随笔画变化，正常按 100 分制算
    var denominator = (chars.length === 1 && strokes.length === 1) ? 88 : 100;
    var total = Math.max(0, Math.min(100,
      Math.round((wugeScore + sancaiScore + wxScore - penalty) / denominator * 100)));

    return {
      cells: cells,
      sancai: sancai,
      wugeScore: wugeScore,
      sancaiScore: sancaiScore,
      wxScore: wxScore,
      score: total
    };
  }

  function starOf(score) {
    if (score >= 88) return '★★★';
    if (score >= 75) return '★★';
    return '★';
  }

  /* ------------------------------ 候选生成 ------------------------------ */

  function pickPool(wx, sex) {
    return POOLS[wx].filter(function (item) {
      return item.sex === 'u' || item.sex === sex;
    });
  }

  function buildCandidates(surname, strokes, sex, favor, single) {
    var list = [];
    var seen = {};
    var surnameChars = surname.split('');

    function push(chars) {
      var key = chars.map(function (c) { return c.ch; }).join('');
      if (seen[key]) return;
      seen[key] = true;
      // 名里不能出现姓中的任何一个字（复姓要逐字比对）
      if (chars.some(function (c) { return surnameChars.indexOf(c.ch) >= 0; })) return;
      if (chars.length === 2 && chars[0].ch === chars[1].ch) return;
      var result = scoreName(strokes, chars, favor);
      list.push({
        name: surname + key,
        chars: chars,
        detail: result
      });
    }

    if (single) {
      var all = [];
      favor.forEach(function (wx) { all = all.concat(pickPool(wx, sex)); });
      all.forEach(function (item) {
        push([{ ch: item.ch, stroke: item.stroke, cat: item.cat, wx: wxOf(item) }]);
      });
    } else {
      var a = pickPool(favor[0], sex);
      var b = favor[1] ? pickPool(favor[1], sex) : a;
      a.forEach(function (x) {
        b.forEach(function (y) {
          push([
            { ch: x.ch, stroke: x.stroke, cat: x.cat, wx: favor[0] },
            { ch: y.ch, stroke: y.stroke, cat: y.cat, wx: favor[1] || favor[0] }
          ]);
          if (favor[1]) {
            push([
              { ch: y.ch, stroke: y.stroke, cat: y.cat, wx: favor[1] },
              { ch: x.ch, stroke: x.stroke, cat: x.cat, wx: favor[0] }
            ]);
          }
        });
      });
    }

    list.sort(function (p, q) {
      if (q.detail.score !== p.detail.score) return q.detail.score - p.detail.score;
      return p.detail.cells[3].value - q.detail.cells[3].value;
    });
    return list;
  }

  // 字库条目反查五行（用于单名模式）
  function wxOf(item) {
    for (var i = 0; i < WX.length; i++) {
      if (POOLS[WX[i]].indexOf(item) >= 0) return WX[i];
    }
    return WX[0];
  }

  /**
   * 同分同笔画结构的名字最多留 2 个
   * 否则「王培旭 / 王基旭 / 王坚旭 / 王堂旭」会挤满整屏，实际是同一套五格
   */
  function diversify(list, limit) {
    var picked = [];
    var pattern = {};
    for (var i = 0; i < list.length && picked.length < limit; i++) {
      var item = list[i];
      var strokes = item.chars.map(function (c) { return c.stroke; }).sort(function (a, b) { return a - b; });
      var key = item.detail.score + '|' + strokes.join('-');
      pattern[key] = (pattern[key] || 0) + 1;
      if (pattern[key] > 2) continue;
      picked.push(item);
    }
    return picked;
  }

  /* ------------------------------ 输出组件 ------------------------------ */

  function bar(percent, color) {
    return '<span style="display:inline-block;width:90px;height:8px;border-radius:99px;' +
      'background:var(--surface-3);overflow:hidden;vertical-align:middle">' +
      '<span style="display:block;height:100%;width:' + Math.max(percent, 0) + '%;background:' + color + '"></span></span>';
  }

  function buildReport(bazi, rows, single) {
    var html = '';

    // 1. 四柱：天干按五行着色，地支单列
    function bigChar(ch, wx) {
      return { html: '<span class="mono" style="font-size:20px;font-weight:650;color:' +
        WX_COLOR[wx] + '">' + ch + '</span>' };
    }

    html += '<div class="result-block">' +
      '<h4 class="sub-title">四柱排盘</h4>' +
      K.table(bazi.pillars.map(function (p) { return p.label; }), [
        bazi.pillars.map(function (p) { return bigChar(STEMS[p.stem], STEM_WX[p.stem]); }),
        bazi.pillars.map(function (p) { return bigChar(BRANCHES[p.branch], BRANCH_WX[p.branch]); }),
        bazi.pillars.map(function (p) { return STEM_WX[p.stem] + ' · ' + BRANCH_WX[p.branch]; })
      ]) +
      '<p class="hint" style="margin:8px 0 0">' +
      '八字：' + bazi.yearPillar + ' ' + bazi.monthPillar + ' ' + bazi.dayPillar + ' ' + bazi.hourPillar +
      '　日主：' + STEMS[bazi.dayStem] + '（' + bazi.dayWx + '）' +
      '</p>' +
      '</div>';

    // 2. 五行分布
    var wugeRows = WX.map(function (wx) {
      var n = bazi.count[wx];
      return [
        wx,
        n + ' 个',
        { html: bar(n / 8 * 100, WX_COLOR[wx]) + ' <span class="mono" style="margin-left:6px">' +
            Math.round(n / 8 * 100) + '%</span>' },
        { html: bazi.favor.indexOf(wx) >= 0 ? '<b style="color:' + WX_COLOR[wx] + '">用神</b>' : '—' }
      ];
    });

    var strengthText = bazi.strength === 'weak' ? '偏弱（同类 ' + bazi.ally + ' 字，需生扶）'
      : bazi.strength === 'strong' ? '偏强（同类 ' + bazi.ally + ' 字，宜泄耗）'
      : '中和（同类 ' + bazi.ally + ' 字，按缺补）';

    html += '<div class="result-block">' +
      '<h4 class="sub-title">五行分布</h4>' +
      K.table(['五行', '本气', '占比', '取用'], wugeRows) +
      K.kv([
        { key: '日主强弱', value: strengthText, mono: false, copy: false },
        { key: '补益五行', value: bazi.favor.join('、') + '（取名优先取该行字）', mono: false, copy: false },
        { key: '笔画基准', value: '康熙笔画；' + rows.surname.split('').map(function (ch, i) {
            return ch + ' ' + rows.strokes[i] + ' 画';
          }).join(' + ') + (rows.compound ? '（合计 ' + rows.surnameStroke + ' 画）' : '') +
            (rows.guessed.length ? '，其中「' + rows.guessed.join('、') + '」未收录、按 8 画估算' : ''),
          mono: false, copy: false }
      ]) +
      '</div>';

    // 3. 名字列表
    var nameRows = rows.list.map(function (item) {
      var d = item.detail;
      var wuge = d.cells.map(function (c) {
        return c.label.charAt(0) + c.value;
      }).join(' ');
      return [
        { html: '<b style="font-size:15px">' + K.esc(item.name) + '</b>' },
        { html: '<span class="mono">' + item.chars.map(function (c) {
          return c.ch + c.stroke + '<span style="color:' + WX_COLOR[c.wx] + '">' + c.wx + '</span>';
        }).join(' · ') + '</span>' },
        { html: '<span class="mono">' + wuge + '</span>' },
        { html: '<span class="mono">' + d.sancai + '</span>' },
        { html: '<b>' + d.score + '</b> 分 <span style="color:var(--text-3)">' + starOf(d.score) + '</span>' }
      ];
    });

    html += '<div class="result-block">' +
      '<h4 class="sub-title">推荐名字（' + (rows.compound ? '复姓 · ' : '') + (single ? '单名' : '双名') +
      ' · 共 ' + (rows.surname.length + (single ? 1 : 2)) + ' 字 · 按综合分排序）</h4>' +
      K.table(['姓名', '笔画', '五格 天·人·地·总·外', '三才', '评分'], nameRows) +
      '<p class="hint" style="margin:8px 0 0">' +
      '评分 = 五格数理 60 + 三才生克 20 + 用神匹配 20，两字同部首再扣 8。' +
      '词义、谐音、方言读音请自行推敲，工具只做结构与五行的初筛。' +
      '</p>' +
      '</div>';

    return html;
  }

  /* ------------------------------ 主入口 ------------------------------ */

  function renderNaming(root) {
    K.form(root, {
      uid: 'zhouyi',
      fields: [
        { id: 'surname', label: '姓氏（单姓或复姓）', type: 'text', value: '王', placeholder: '如 王 / 欧阳' },
        { id: 'stroke', label: '姓首字笔画（选填）', type: 'number', value: '', placeholder: '留空自动查', min: 1, max: 40 },
        { id: 'sex', label: '性别', type: 'select', value: 'm', options: [
          { value: 'm', label: '男' },
          { value: 'f', label: '女' }
        ] },
        { id: 'date', label: '出生日期', type: 'date', value: '1995-08-15' },
        { id: 'time', label: '出生时间', type: 'time', value: '08:30' },
        { id: 'count', label: '名字字数', type: 'select', value: 'two', options: [
          { value: 'two', label: '双名（姓 + 两字）' },
          { value: 'one', label: '单名（姓 + 一字）' }
        ] },
        { id: 'favor', label: '补益五行', type: 'select', value: 'auto', options: [
          { value: 'auto', label: '自动（按八字缺什么补什么）' },
          { value: '木', label: '木' },
          { value: '火', label: '火' },
          { value: '土', label: '土' },
          { value: '金', label: '金' },
          { value: '水', label: '水' }
        ] }
      ],
      actionLabel: '排盘取名',
      hint: '四柱按公历生日推算：年柱以立春分界，月柱按节气，日柱用儒略日，时柱用五鼠遁。' +
        '节气日期取常年近似值，边界日（每月 4—8 日）可能差一天。名字按康熙笔画算五格；' +
        '姓氏支持复姓（欧阳、司马、上官等），天格取姓两字之和、人格取姓末字加名首字；' +
        '复姓第二字的笔画自动查表，手填值只覆盖首字。' +
        '全部结果属民俗文化范畴，不作命理断语。',
      sample: function (fill) {
        fill({ surname: '王', stroke: '', sex: 'm', date: '1995-08-15', time: '08:30', count: 'two', favor: 'auto' });
      },
      run: function (v) {
        var surname = String(v.surname || '').replace(/\s+/g, '');
        if (!surname) return { error: '请填写姓氏' };
        if (!/^[\u4e00-\u9fa5]+$/.test(surname)) return { error: '姓氏只能填汉字，不含字母、数字或符号' };
        if (surname.length > 2) {
          return { error: '姓氏最多两字；复姓（欧阳、司马、上官等）填两字即可，三字以上请拆分' };
        }

        var dateParts = String(v.date || '').split('-');
        var timeParts = String(v.time || '').split(':');
        if (dateParts.length !== 3 || timeParts.length < 2) return { error: '请填写完整的出生日期与时间' };

        var y = parseInt(dateParts[0], 10);
        var m = parseInt(dateParts[1], 10);
        var d = parseInt(dateParts[2], 10);
        var hh = parseInt(timeParts[0], 10);
        var mi = parseInt(timeParts[1], 10);
        if (!isFinite(y) || !isFinite(m) || !isFinite(d) || !isFinite(hh)) {
          return { error: '出生日期或时间格式有误' };
        }

        var bazi = calcBazi(y, m, d, hh, mi);
        if (!bazi) return { error: '出生日期需在 1900—2100 年之间' };

        // 笔画：逐字查表；手填值只覆盖首字（复姓第二字仍走内置表）；都没有按 8 画兜底
        var manual = parseInt(v.stroke, 10);
        var strokes = surname.split('').map(charStroke);
        if (isFinite(manual) && manual > 0) strokes[0] = Math.min(manual, 40);
        var guessed = [];
        strokes.forEach(function (value, i) {
          if (!value) {
            strokes[i] = 8;
            guessed.push(surname.charAt(i));
          }
        });
        var compound = strokes.length === 2;
        var surnameStroke = strokes.reduce(function (sum, value) { return sum + value; }, 0);
        var notInList = compound && !COMPOUND[surname];

        var favor = bazi.favor.slice();
        if (v.favor && v.favor !== 'auto') {
          // 手动指定时，补该行本身 + 生它的那一行（印比同补）
          favor = [v.favor, SHENG_BY[v.favor]].filter(function (item, i, arr) {
            return item && arr.indexOf(item) === i;
          });
        }

        var single = v.count === 'one';
        var list = buildCandidates(surname, strokes, v.sex, favor, single);
        if (!list.length) return { error: '没有生成候选名字，请调整性别或五行偏好' };

        var picked = diversify(list, 10);
        var html = buildReport(bazi, {
          surname: surname,
          strokes: strokes,
          surnameStroke: surnameStroke,
          compound: compound,
          guessed: guessed,
          list: picked
        }, single);

        var best = picked[0];
        var note = '共评估 ' + list.length + ' 组组合，最高分「' + best.name + '」' +
          best.detail.score + ' 分（' + best.detail.sancai + ' 三才）' +
          (guessed.length ? '；姓中「' + guessed.join('、') + '」未收录，暂按 8 画估算' : '') +
          (notInList ? '；「' + surname + '」不在常见复姓表，已按双字姓计算' : '');

        return { html: html, note: note };
      }
    });
  }

  /* ==========================================================================
   * 姻缘测定
   * --------------------------------------------------------------------------
   * 合婚分五路看，加权合成姻缘指数（满分 100）：
   *   年支（生肖）20 · 日支（夫妻宫）25 · 日主五行 20 · 五行互补 20 · 日干五合 15
   * 只看年月日三柱，时柱不参与，所以不需要填出生时辰。
   * 另附西方占星的太阳星座配对作参考，单独一块，不计入总分。
   * ======================================================================== */

  var ZODIAC = '鼠牛虎兔龙蛇马羊猴鸡狗猪'.split('');

  // 地支关系（索引：子 0 … 亥 11）
  var PAIR_LIUHE = ['0-1', '2-11', '3-10', '4-9', '5-8', '6-7'];      // 子丑 寅亥 卯戌 辰酉 巳申 午未
  var PAIR_LIUHAI = ['0-7', '1-6', '2-5', '3-4', '8-11', '9-10'];     // 子未 丑午 寅巳 卯辰 申亥 酉戌
  var PAIR_SANHE = [[8, 0, 4], [11, 3, 7], [2, 6, 10], [5, 9, 1]];    // 申子辰 亥卯未 寅午戌 巳酉丑
  var PAIR_XING = ['0-3', '2-5', '5-8', '2-8', '1-10', '10-7', '1-7']; // 子卯 寅巳 巳申 寅申 丑戌 戌未 丑未
  var SELF_XING = [4, 6, 9, 11];                                       // 辰午酉亥自刑

  function branchRelation(a, b) {
    // 先处理同支：同支不可能是六合/三合，只有辰午酉亥自刑
    if (a === b) return SELF_XING.indexOf(a) >= 0 ? 'xing' : 'same';
    var lo = Math.min(a, b);
    var hi = Math.max(a, b);
    if (PAIR_LIUHE.indexOf(lo + '-' + hi) >= 0) return 'liuhe';
    for (var i = 0; i < PAIR_SANHE.length; i++) {
      if (PAIR_SANHE[i].indexOf(a) >= 0 && PAIR_SANHE[i].indexOf(b) >= 0) return 'sanhe';
    }
    if ((a - b + 12) % 12 === 6) return 'chong';
    if (PAIR_LIUHAI.indexOf(lo + '-' + hi) >= 0) return 'hai';
    if (PAIR_XING.indexOf(lo + '-' + hi) >= 0) return 'xing';
    return 'none';
  }

  var REL_TEXT = {
    liuhe: '六合', sanhe: '三合', same: '同支',
    none: '平（无合无冲）', hai: '相害', xing: '相刑', chong: '相冲'
  };

  function zodiacScore(rel) {
    return { liuhe: 20, sanhe: 18, same: 14, none: 12, hai: 7, xing: 6, chong: 3 }[rel];
  }

  function palaceScore(rel) {
    return { liuhe: 25, sanhe: 22, same: 16, none: 15, hai: 9, xing: 8, chong: 4 }[rel];
  }

  /** 统计前三柱六个字的五行（不看时柱） */
  function countThreePillars(pillars) {
    var c = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    for (var i = 0; i < 3; i++) {
      c[STEM_WX[pillars[i].stem]] += 1;
      c[BRANCH_WX[pillars[i].branch]] += 1;
    }
    return c;
  }

  /** 五行互补：各自缺的行，对方是否补得上 */
  function wuxingFit(a, b) {
    var lackA = WX.filter(function (w) { return a[w] === 0; });
    var lackB = WX.filter(function (w) { return b[w] === 0; });
    if (!lackA.length && !lackB.length) {
      return { score: 16, lackA: lackA, lackB: lackB, filled: 0, total: 0,
        note: '双方五行俱全，没有明显缺口，互补性一般但也不冲' };
    }
    var filled = 0;
    lackA.forEach(function (w) { if (b[w] >= 1) filled += 1; });
    lackB.forEach(function (w) { if (a[w] >= 1) filled += 1; });
    var total = lackA.length + lackB.length;
    return {
      score: Math.round(6 + 14 * (filled / total)),
      lackA: lackA,
      lackB: lackB,
      filled: filled,
      total: total,
      note: '你缺 ' + (lackA.join('、') || '无') + '，TA 缺 ' + (lackB.join('、') || '无') +
        '；互补 ' + filled + '/' + total + ' 项'
    };
  }

  /** 日干五合：甲己、乙庚、丙辛、丁壬、戊癸 */
  function stemHe(a, b) {
    return a !== b && a % 5 === b % 5;
  }

  /* ------------------------------ 星座（参考） ------------------------------ */

  var SIGN_TABLE = [
    [1, 20, '水瓶', '风'], [2, 19, '双鱼', '水'], [3, 21, '白羊', '火'],
    [4, 20, '金牛', '土'], [5, 21, '双子', '风'], [6, 22, '巨蟹', '水'],
    [7, 23, '狮子', '火'], [8, 23, '处女', '土'], [9, 23, '天秤', '风'],
    [10, 24, '天蝎', '水'], [11, 23, '射手', '火'], [12, 22, '摩羯', '土']
  ];

  function sunSign(m, d) {
    var row = SIGN_TABLE[m - 1];
    if (d >= row[1]) return { name: row[2], element: row[3] };
    var prev = SIGN_TABLE[(m - 2 + 12) % 12];
    return { name: prev[2], element: prev[3] };
  }

  var ELEMENT_SCORE = {
    火火: 88, 土土: 88, 风风: 88, 水水: 88,
    火风: 85, 风火: 85, 土水: 85, 水土: 85,
    火水: 62, 水火: 62, 土风: 62, 风土: 62,
    火土: 58, 土火: 58, 风水: 58, 水风: 58
  };

  var ELEMENT_NOTE = {
    火火: '同为火象，都爱热闹、行动力强，缺点是容易一起冲动',
    土土: '同为土象，务实稳定，日子过得踏实但需要有人制造点新鲜感',
    风风: '同为风象，聊得来、朋友多，容易停在精神层面',
    水水: '同为水象，情绪共鸣强，要小心一起沉进情绪里',
    火风: '火遇风，互相点燃，一个敢想一个会说，节奏很合',
    土水: '土能蓄水，一个给安全感一个给柔软，是最稳的组合之一',
    火水: '火与水天生拉扯，一个要热烈一个要深度，靠理解才能走下去',
    土风: '土要落地、风要自由，节奏差得比较多，需要各自留空间',
    火土: '火急土慢，一个想马上做、一个要先想清楚',
    风水: '风轻水重，表达方式差得远，容易一个说一个猜'
  };

  /* ------------------------------ 姻缘评分 ------------------------------ */

  function levelOf(total) {
    if (total >= 85) return { text: '上等姻缘', color: '#dc2626' };
    if (total >= 70) return { text: '良好', color: '#ea580c' };
    if (total >= 55) return { text: '中等', color: '#ca8a04' };
    if (total >= 40) return { text: '需磨合', color: '#2563eb' };
    return { text: '差异较大', color: '#475569' };
  }

  function matchPair(aBazi, bBazi) {
    // 1. 生肖（年支）
    var relZodiac = branchRelation(aBazi.pillars[0].branch, bBazi.pillars[0].branch);
    var sZodiac = zodiacScore(relZodiac);

    // 2. 夫妻宫（日支）
    var relPalace = branchRelation(aBazi.pillars[2].branch, bBazi.pillars[2].branch);
    var sPalace = palaceScore(relPalace);

    // 3. 日主五行
    var wa = aBazi.dayWx;
    var wb = bBazi.dayWx;
    var relStem;
    var sStem;
    if (wa === wb) {
      relStem = 'same';
      sStem = 16;
    } else if (SHENG[wa] === wb || SHENG[wb] === wa) {
      relStem = 'sheng';
      sStem = 20;
    } else {
      relStem = 'ke';
      sStem = 9;
    }

    // 4. 五行互补
    var fit = wuxingFit(countThreePillars(aBazi.pillars), countThreePillars(bBazi.pillars));

    // 5. 日干五合
    var he = stemHe(aBazi.dayStem, bBazi.dayStem);
    var sHe = he ? 15 : (aBazi.dayStem === bBazi.dayStem ? 10 : 7);

    var total = sZodiac + sPalace + sStem + fit.score + sHe;

    // 各维度文案
    var noteZodiac = '你属' + ZODIAC[aBazi.pillars[0].branch] + '（' + BRANCHES[aBazi.pillars[0].branch] +
      '），TA 属' + ZODIAC[bBazi.pillars[0].branch] + '（' + BRANCHES[bBazi.pillars[0].branch] + '），' +
      REL_TEXT[relZodiac];

    var notePalace = '日支为夫妻宫：' + BRANCHES[aBazi.pillars[2].branch] + ' 与 ' +
      BRANCHES[bBazi.pillars[2].branch] + '，' + REL_TEXT[relPalace];

    var noteStem;
    if (relStem === 'sheng') {
      noteStem = '你是' + aBazi.dayPillar.charAt(0) + wa + '，TA 是' + bBazi.dayPillar.charAt(0) + wb +
        '，' + (SHENG[wa] === wb ? wa + '生' + wb : wb + '生' + wa) + '，互相滋养';
    } else if (relStem === 'same') {
      noteStem = '同为' + wa + '命，气质相近，像照镜子，默契但也容易同进同退';
    } else {
      noteStem = '你是' + aBazi.dayPillar.charAt(0) + wa + '，TA 是' + bBazi.dayPillar.charAt(0) + wb +
        '，' + (KE[wa] === wb ? wa + '克' + wb : wb + '克' + wa) + '，需要靠沟通化解';
    }

    var noteHe = he
      ? '日干 ' + STEMS[aBazi.dayStem] + STEMS[bBazi.dayStem] + ' 相合，是传统合婚里的加分项'
      : (aBazi.dayStem === bBazi.dayStem ? '日干相同（比肩），说不上合也不算冲' : '日干无五合关系');

    return {
      total: total,
      level: levelOf(total),
      rows: [
        { name: '生肖（年支）', score: sZodiac, max: 20, note: noteZodiac },
        { name: '夫妻宫（日支）', score: sPalace, max: 25, note: notePalace },
        { name: '日主五行', score: sStem, max: 20, note: noteStem },
        { name: '五行互补', score: fit.score, max: 20, note: fit.note },
        { name: '日干五合', score: sHe, max: 15, note: noteHe }
      ],
      relations: { zodiac: relZodiac, palace: relPalace, stem: relStem, he: he }
    };
  }

  /** 按最弱的环节给建议，避免一律「多沟通」 */
  function adviceOf(result) {
    var tips = [];
    var r = result.relations;

    if (r.palace === 'chong') {
      tips.push('日支相冲，两个人对「日子怎么过」的默认设定差得远，小事上先立规矩比事后争论省力。');
    } else if (r.palace === 'hai' || r.palace === 'xing') {
      tips.push('夫妻宫带刑害，容易在同一个点上反复别扭，把最介意的那件事摊开讲一次，比反复试探有用。');
    } else if (r.palace === 'liuhe' || r.palace === 'sanhe') {
      tips.push('夫妻宫相合，日常磨合成本低，别把这份顺应当成理所当然就好。');
    } else {
      tips.push('夫妻宫平顺无冲，没有天然加成也没有硬伤，能走多远主要看两个人怎么经营。');
    }

    if (r.zodiac === 'chong') {
      tips.push('生肖相冲只在民俗层面成立，真正影响相处的是节奏差异：一个急一个稳时，先说结论再说理由。');
    }

    if (r.stem === 'ke') {
      tips.push('日主相克，容易一方总在纠正另一方，试着把「你应该」换成「我需要」。');
    }

    if (!r.he) {
      tips.push('日干没有五合，默契靠相处积累而不是天然带出来，共同的长期目标比一时热情更重要。');
    }

    if (result.rows[3].score < 12) {
      tips.push('五行互补偏弱，各自的短板别指望对方自动补上，必要时各自找出口。');
    }

    if (!tips.length) {
      tips.push('几项都处在顺的位置，剩下的是把日子过细，别让合拍变成忽略对方。');
    }
    return tips.slice(0, 3);
  }

  /* ------------------------------ 姻缘渲染 ------------------------------ */

  function renderMarriage(root) {
    K.form(root, {
      uid: 'marriage',
      fields: [
        { id: 'aDate', label: '你的生日', type: 'date', value: '1995-08-15' },
        { id: 'bDate', label: 'TA 的生日', type: 'date', value: '1996-11-02' }
      ],
      actionLabel: '测姻缘',
      hint: '合婚只看年月日三柱：年支看生肖、日支看夫妻宫、日干看日主，所以不需要填出生时辰。' +
        '指数由五项加权而成，属于传统民俗算法，不构成任何感情判断，两个人怎么相处永远比一张表更重要。',
      sample: function (fill) {
        fill({ aDate: '1995-08-15', bDate: '1996-11-02' });
      },
      run: function (v) {
        function parseDate(str) {
          var parts = String(str || '').split('-');
          if (parts.length !== 3) return null;
          var y = parseInt(parts[0], 10);
          var m = parseInt(parts[1], 10);
          var d = parseInt(parts[2], 10);
          if (!isFinite(y) || !isFinite(m) || !isFinite(d)) return null;
          return { y: y, m: m, d: d };
        }

        var pa = parseDate(v.aDate);
        var pb = parseDate(v.bDate);
        if (!pa) return { error: '请填写你的生日' };
        if (!pb) return { error: '请填写 TA 的生日' };

        var aBazi = calcBazi(pa.y, pa.m, pa.d, 12, 0);
        var bBazi = calcBazi(pb.y, pb.m, pb.d, 12, 0);
        if (!aBazi || !bBazi) return { error: '生日需在 1900—2100 年之间' };

        var result = matchPair(aBazi, bBazi);
        var signA = sunSign(pa.m, pa.d);
        var signB = sunSign(pb.m, pb.d);
        var signScore = ELEMENT_SCORE[signA.element + signB.element] || 70;

        var html = '';

        // 总分
        html += '<div class="result-block">' +
          K.stats([
            { html: '<span style="color:' + result.level.color + '">' + result.total + '</span>', label: '姻缘指数' },
            { html: '<span style="color:' + result.level.color + '">' + result.level.text + '</span>', label: '综合等级' },
            { value: ZODIAC[aBazi.pillars[0].branch] + ' × ' + ZODIAC[bBazi.pillars[0].branch], label: '生肖' },
            { value: result.relations.he ? '有' : '无', label: '日干五合' }
          ]) + '</div>';

        // 双方三柱
        var heads = ['你的' + pa.m + '月' + pa.d + '日', 'TA 的' + pb.m + '月' + pb.d + '日'];
        html += '<div class="result-block">' +
          '<h4 class="sub-title">双方三柱</h4>' +
          K.table(['对象', '年柱', '月柱', '日柱'], [
            [{ html: '<b>你</b>' }, aBazi.yearPillar, aBazi.monthPillar, aBazi.dayPillar + '（日主 ' + STEMS[aBazi.dayStem] + '）'],
            [{ html: '<b>TA</b>' }, bBazi.yearPillar, bBazi.monthPillar, bBazi.dayPillar + '（日主 ' + STEMS[bBazi.dayStem] + '）']
          ]) +
          '</div>';

        // 五维得分
        var scoreRows = result.rows.map(function (row) {
          var percent = row.score / row.max * 100;
          return [
            row.name,
            { html: bar(percent, 'var(--primary)') + ' <span class="mono" style="margin-left:6px">' +
                row.score + '/' + row.max + '</span>' },
            row.note
          ];
        });

        html += '<div class="result-block">' +
          '<h4 class="sub-title">五项拆解</h4>' +
          K.table(['维度', '得分', '依据'], scoreRows) +
          '</div>';

        // 建议
        var tips = adviceOf(result);
        html += '<div class="result-block">' +
          '<h4 class="sub-title">相处提示</h4>' +
          '<ul style="margin:0;padding-left:20px;line-height:1.85">' +
          tips.map(function (tip) { return '<li>' + K.esc(tip) + '</li>'; }).join('') +
          '</ul></div>';

        // 星座参考
        html += '<div class="result-block">' +
          '<h4 class="sub-title">星座参考（不计入总分）</h4>' +
          K.kv([
            { key: '你', value: '太阳' + signA.name + '座（' + signA.element + '象）', mono: false, copy: false },
            { key: 'TA', value: '太阳' + signB.name + '座（' + signB.element + '象）', mono: false, copy: false },
            { key: '元素配对', value: signScore + ' 分', mono: false, copy: false },
            { key: '一句话', value: ELEMENT_NOTE[signA.element + signB.element] || '元素互补一般，靠相处补', mono: false, copy: false }
          ]) +
          '</div>';

        var best = result.rows.slice().sort(function (p, q) {
          return (q.score / q.max) - (p.score / p.max);
        })[0];
        var note = '姻缘指数 ' + result.total + '（' + result.level.text + '），最顺的一项是' + best.name;

        return { html: html, note: note };
      }
    });
  }

  window.ToolModules['zhouyi-naming'] = renderNaming;
  window.ToolModules['marriage-match'] = renderMarriage;
})();
