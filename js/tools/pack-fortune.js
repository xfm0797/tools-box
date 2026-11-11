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

  function parseSurname(raw) {
    var map = {};
    raw.split(/\s+/).forEach(function (item) {
      var m = /^([\u4e00-\u9fa5])(\d{1,2})$/.exec(item);
      if (m) map[m[1]] = parseInt(m[2], 10);
    });
    return map;
  }

  var SURNAMES = parseSurname(SURNAME_RAW);

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
   * @param {number} surnameStroke 姓的康熙笔画
   * @param {Array} chars 名（1 或 2 个字对象）
   * @param {Array} favor 用神五行
   */
  function scoreName(surnameStroke, chars, favor) {
    var s = surnameStroke;
    var tian, ren, di, zong, wai;

    if (chars.length === 2) {
      tian = s + 1;
      ren = s + chars[0].stroke;
      di = chars[0].stroke + chars[1].stroke;
      zong = s + chars[0].stroke + chars[1].stroke;
      wai = zong - ren + 1;
    } else {
      tian = s + 1;
      ren = s + chars[0].stroke;
      di = chars[0].stroke + 1;
      zong = s + chars[0].stroke;
      wai = 2;
    }

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

    // 单名外格固定为 2（凶），五格天然少 12 分，按 88 分制归一化
    var denominator = chars.length === 1 ? 88 : 100;
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

  function buildCandidates(surname, surnameStroke, sex, favor, single) {
    var list = [];
    var seen = {};

    function push(chars) {
      var key = chars.map(function (c) { return c.ch; }).join('');
      if (seen[key]) return;
      seen[key] = true;
      if (chars.some(function (c) { return c.ch === surname; })) return;
      if (chars.length === 2 && chars[0].ch === chars[1].ch) return;
      var result = scoreName(surnameStroke, chars, favor);
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
        { key: '笔画基准', value: '康熙笔画；姓「' + rows.surname + '」' +
            (rows.guessed ? '未收录，暂按 ' + rows.surnameStroke + ' 画估算，请在「姓的笔画」手动填写' :
              '按 ' + rows.surnameStroke + ' 画计'), mono: false, copy: false }
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
      '<h4 class="sub-title">推荐名字（' + (single ? '单名' : '双名') + ' · 按综合分排序）</h4>' +
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
        { id: 'surname', label: '姓氏（单字）', type: 'text', value: '王', placeholder: '如 王' },
        { id: 'stroke', label: '姓的笔画（选填）', type: 'number', value: '', placeholder: '留空自动查', min: 1, max: 40 },
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
        '节气日期取常年近似值，边界日（每月 4—8 日）可能差一天。名字按康熙笔画算五格，' +
        '全部结果属民俗文化范畴，不作命理断语。',
      sample: function (fill) {
        fill({ surname: '王', stroke: '', sex: 'm', date: '1995-08-15', time: '08:30', count: 'two', favor: 'auto' });
      },
      run: function (v) {
        var surname = String(v.surname || '').trim();
        if (!surname) return { error: '请填写姓氏' };
        if (surname.length > 1) return { error: '目前只支持单字姓，复姓（欧阳、司马等）暂未内置笔画表' };
        if (!/^[\u4e00-\u9fa5]$/.test(surname)) return { error: '姓氏需为单个汉字' };

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

        // 笔画：手填优先，其次查内置表，都没有按 8 画兜底
        var manual = parseInt(v.stroke, 10);
        var surnameStroke = SURNAMES[surname];
        var guessed = false;
        if (isFinite(manual) && manual > 0) {
          surnameStroke = Math.min(manual, 40);
        } else if (!surnameStroke) {
          surnameStroke = 8;
          guessed = true;
        }

        var favor = bazi.favor.slice();
        if (v.favor && v.favor !== 'auto') {
          // 手动指定时，补该行本身 + 生它的那一行（印比同补）
          favor = [v.favor, SHENG_BY[v.favor]].filter(function (item, i, arr) {
            return item && arr.indexOf(item) === i;
          });
        }

        var single = v.count === 'one';
        var list = buildCandidates(surname, surnameStroke, v.sex, favor, single);
        if (!list.length) return { error: '没有生成候选名字，请调整性别或五行偏好' };

        var picked = diversify(list, 10);
        var html = buildReport(bazi, {
          surname: surname,
          surnameStroke: surnameStroke,
          guessed: guessed,
          list: picked
        }, single);

        var best = picked[0];
        var note = '共评估 ' + list.length + ' 组组合，最高分「' + best.name + '」' +
          best.detail.score + ' 分（' + best.detail.sancai + ' 三才）' +
          (guessed ? '；姓「' + surname + '」未收录，按 8 画估算，可在「姓的笔画」填康熙笔画后重算' : '');

        return { html: html, note: note };
      }
    });
  }

  window.ToolModules['zhouyi-naming'] = renderNaming;
})();
