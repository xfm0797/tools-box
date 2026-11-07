/* =============================================================================
 * 时间日期工具包 · 第二批（11 个）
 * -----------------------------------------------------------------------------
 * solar-term   二十四节气（按太阳视黄经计算）
 * date-range   日期区间批量生成
 * world-clock  世界时钟（多城市实时时间）
 * cron-next    Cron 下次运行时间
 * date-reformat 任意日期字符串格式化
 * quarter-calc 季度与财年
 * workday-add  工作日推算
 * time-arith   时间加减
 * duration-sum 时长批量累加
 * leap-year    闰年判断
 * date-easter  复活节及相关节日
 *
 * 所有计算基于浏览器本地时区或显式指定的时区，不联网校时。
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;
  var WEEK = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

  function pad2(n) { return String(n).padStart(2, '0'); }

  function fmtDate(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function parseDateInput(value) {
    if (!value) return null;
    var parts = value.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    return isNaN(d.getTime()) ? null : d;
  }

  function dayDiff(a, b) {
    var utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    var utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((utcB - utcA) / 86400000);
  }

  function addMonthsClamped(date, months) {
    var d = new Date(date.getTime());
    var day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + months);
    var last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
    return d;
  }

  /* ------------------------------ 1. 二十四节气 ------------------------------ */
  /* 儒略日 ↔ 公历（Meeus，适用于 1583 年之后） */
  function toJulian(date) {
    var y = date.getUTCFullYear();
    var m = date.getUTCMonth() + 1;
    var d = date.getUTCDate() + (date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600) / 24;
    if (m <= 2) { y -= 1; m += 12; }
    var a = Math.floor(y / 100);
    var b = 2 - a + Math.floor(a / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5;
  }

  /* 太阳视黄经（度） */
  function sunLongitude(jd) {
    var t = (jd - 2451545.0) / 36525;
    var l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
    var m = 357.52911 + 35999.05029 * t - 0.0001537 * t * t;
    var mr = m * Math.PI / 180;
    var c = (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(mr)
      + (0.019993 - 0.000101 * t) * Math.sin(2 * mr)
      + 0.000289 * Math.sin(3 * mr);
    var trueLong = l0 + c;
    var omega = 125.04 - 1934.136 * t;
    var apparent = trueLong - 0.00569 - 0.00478 * Math.sin(omega * Math.PI / 180);
    return ((apparent % 360) + 360) % 360;
  }

  var TERMS = [
    ['小寒', 285, 1, 5], ['大寒', 300, 1, 20], ['立春', 315, 2, 4], ['雨水', 330, 2, 19],
    ['惊蛰', 345, 3, 5], ['春分', 0, 3, 20], ['清明', 15, 4, 4], ['谷雨', 30, 4, 20],
    ['立夏', 45, 5, 5], ['小满', 60, 5, 21], ['芒种', 75, 6, 5], ['夏至', 90, 6, 21],
    ['小暑', 105, 7, 7], ['大暑', 120, 7, 22], ['立秋', 135, 8, 7], ['处暑', 150, 8, 23],
    ['白露', 165, 9, 7], ['秋分', 180, 9, 23], ['寒露', 195, 10, 8], ['霜降', 210, 10, 23],
    ['立冬', 225, 11, 7], ['小雪', 240, 11, 22], ['大雪', 255, 12, 7], ['冬至', 270, 12, 21]
  ];

  /** 求某年某个节气的北京时间（UTC+8） */
  function solarTermTime(year, term) {
    var jd = toJulian(new Date(Date.UTC(year, term[2] - 1, term[3], 4, 0, 0)));
    // 牛顿迭代：太阳每天约前进 0.9856°
    for (var i = 0; i < 6; i += 1) {
      var current = sunLongitude(jd);
      var diff = term[1] - current;
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      jd += diff / 0.98564736;
      if (Math.abs(diff) < 0.0001) break;
    }
    var utc = new Date((jd - 2440587.5) * 86400000);
    return new Date(utc.getTime() + 8 * 3600000); // 转成北京时间
  }

  function termDate(year, term) {
    var t = solarTermTime(year, term);
    return { name: term[0], date: new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate())), time: t };
  }

  function renderSolarTerm(root) {
    K.form(root, {
      uid: 'term',
      actionLabel: '查询',
      fields: [{ id: 'year', label: '年份', type: 'number', value: new Date().getFullYear(), min: 1900, max: 2100 }],
      hint: '按太阳视黄经（Meeus 低精度算法）计算，时间误差通常在几分钟内；日期以北京时间（UTC+8）为准。',
      run: function (v) {
        var year = Number(v.year);
        if (!year || year < 1900 || year > 2100) return { error: '年份需在 1900–2100 之间' };
        var rows = TERMS.map(function (term, i) {
          var info = termDate(year, term);
          return [i + 1, term[0], fmtDate(info.date), pad2(info.time.getUTCHours()) + ':' + pad2(info.time.getUTCMinutes()), WEEK[info.date.getUTCDay()]];
        });
        // 找出当前所处节气（仅查询当年时有意义）
        var note = '';
        var now = new Date();
        if (year === now.getFullYear()) {
          var passed = TERMS.map(function (t) { return termDate(year, t); })
            .filter(function (info) { return info.time.getTime() <= now.getTime(); });
          if (passed.length) {
            var last = passed[passed.length - 1];
            note = '当前节气：' + last.name + '（' + fmtDate(last.date) + ' 起）';
          }
        }
        return {
          html: K.table(['#', '节气', '日期', '时间', '星期'], rows),
          note: note || (year + ' 年共 24 个节气')
        };
      }
    });
  }

  /* ------------------------------ 2. 日期区间生成 ------------------------------ */
  function renderDateRange(root) {
    var today = new Date();
    var later = new Date(today.getTime() + 30 * 86400000);
    K.form(root, {
      uid: 'range',
      actionLabel: '生成',
      fields: [
        { id: 'start', label: '开始日期', type: 'date', value: fmtDate(today) },
        { id: 'end', label: '结束日期', type: 'date', value: fmtDate(later) },
        { id: 'step', label: '步长', type: 'number', value: 1, min: 1, max: 365 },
        { id: 'unit', label: '步长单位', type: 'select', value: 'day',
          options: [{ value: 'day', label: '天' }, { value: 'week', label: '周' }, { value: 'month', label: '月' }] },
        { id: 'weekdayOnly', label: '只保留工作日', type: 'checkbox' },
        { id: 'includeEnd', label: '包含结束日期', type: 'checkbox', value: true }
      ],
      hint: '最多输出 2000 条，避免误操作生成超长列表。',
      run: function (v) {
        var start = parseDateInput(v.start);
        var end = parseDateInput(v.end);
        if (!start || !end) return { error: '请选择有效的开始与结束日期' };
        if (end < start) return { error: '结束日期不能早于开始日期' };
        var step = Math.max(1, Number(v.step) || 1);
        var list = [];
        var index = 0;
        while (true) {
          // 以起始日为锚点计算第 index 个日期，避免「1 月 31 日 + 1 月 = 2 月 29 日 → 3 月 29 日」的漂移
          var cursor = v.unit === 'month'
            ? addMonthsClamped(start, index * step)
            : new Date(start.getFullYear(), start.getMonth(), start.getDate() + index * step * (v.unit === 'week' ? 7 : 1));
          if (v.includeEnd ? cursor > end : cursor >= end) break;
          list.push(cursor);
          if (list.length > 2000) return { error: '结果超过 2000 条，请缩小范围或加大步长' };
          index += 1;
        }
        if (v.weekdayOnly) {
          list = list.filter(function (d) { return d.getDay() !== 0 && d.getDay() !== 6; });
        }
        if (!list.length) return { error: '没有符合条件的日期' };
        var text = list.map(function (d) { return fmtDate(d) + ' ' + WEEK[d.getDay()]; }).join('\n');
        var workdays = list.filter(function (d) { return d.getDay() !== 0 && d.getDay() !== 6; }).length;
        return {
          html: '<pre class="code-block" style="max-height:320px;overflow:auto">' + K.esc(text) + '</pre>',
          rows: [
            { key: '条目数', value: list.length + ' 条' },
            { key: '首个 / 末个', value: fmtDate(list[0]) + ' ~ ' + fmtDate(list[list.length - 1]) },
            { key: '其中工作日', value: workdays + ' 天' },
            { key: '跨度', value: Math.abs(dayDiff(start, end)) + ' 天' }
          ],
          note: '已生成 ' + list.length + ' 条日期'
        };
      }
    });
  }

  /* ------------------------------ 3. 世界时钟 ------------------------------ */
  var CLOCK_ZONES = [
    ['北京', 'Asia/Shanghai'],
    ['东京', 'Asia/Tokyo'],
    ['首尔', 'Asia/Seoul'],
    ['新加坡', 'Asia/Singapore'],
    ['悉尼', 'Australia/Sydney'],
    ['迪拜', 'Asia/Dubai'],
    ['莫斯科', 'Europe/Moscow'],
    ['柏林', 'Europe/Berlin'],
    ['伦敦', 'Europe/London'],
    ['纽约', 'America/New_York'],
    ['洛杉矶', 'America/Los_Angeles'],
    ['圣保罗', 'America/Sao_Paulo']
  ];

  function zoneOffsetMinutes(date, zone) {
    var dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    var parts = {};
    dtf.formatToParts(date).forEach(function (p) { parts[p.type] = p.value; });
    var asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour) % 24, Number(parts.minute), Number(parts.second));
    return Math.round((asUtc - date.getTime()) / 60000);
  }

  function offsetLabel(minutes) {
    var sign = minutes >= 0 ? '+' : '-';
    var abs = Math.abs(minutes);
    return 'UTC' + sign + pad2(Math.floor(abs / 60)) + ':' + pad2(abs % 60);
  }

  function renderWorldClock(root) {
    root.innerHTML =
      '<div class="clock-head">' +
        '<span><span class="clock-local" id="clock-local">--:--:--</span> ' +
        '<span class="clock-date" id="clock-date">--</span></span>' +
        '<button type="button" class="link-btn" id="clock-refresh">刷新</button>' +
      '</div>' +
      '<div class="table-wrap"><table class="data-table clock-table"><thead><tr>' +
        '<th>城市</th><th>当地时间</th><th>日期</th><th>时区</th><th>与北京时差</th>' +
      '</tr></thead><tbody id="clock-body"></tbody></table></div>' +
      '<p class="hint">时间来自设备系统时钟，按 IANA 时区规则换算（含夏令时）。离开页面后自动停止刷新。</p>';

    var localEl = root.querySelector('#clock-local');
    var dateEl = root.querySelector('#clock-date');
    var body = root.querySelector('#clock-body');

    function tick() {
      var now = new Date();
      localEl.textContent = pad2(now.getHours()) + ':' + pad2(now.getMinutes()) + ':' + pad2(now.getSeconds());
      dateEl.textContent = fmtDate(now) + ' ' + WEEK[now.getDay()];

      var beijingOffset = zoneOffsetMinutes(now, 'Asia/Shanghai');
      body.innerHTML = CLOCK_ZONES.map(function (item) {
        var zone = item[1];
        var dtf = new Intl.DateTimeFormat('zh-CN', {
          timeZone: zone, hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
          year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short'
        });
        var parts = {};
        dtf.formatToParts(now).forEach(function (p) { parts[p.type] = p.value; });
        var offset = zoneOffsetMinutes(now, zone);
        var diff = (offset - beijingOffset) / 60;
        var diffText = diff === 0 ? '同时区' : (diff > 0 ? '早 ' + K.num(diff, 1) + ' 小时' : '晚 ' + K.num(-diff, 1) + ' 小时');
        return '<tr><td>' + K.esc(item[0]) + '</td>' +
          '<td class="mono">' + pad2(Number(parts.hour) % 24) + ':' + parts.minute + ':' + parts.second + '</td>' +
          '<td class="mono">' + parts.year + '-' + parts.month + '-' + parts.day + ' ' + (parts.weekday || '') + '</td>' +
          '<td class="mono">' + offsetLabel(offset) + '</td>' +
          '<td>' + diffText + '</td></tr>';
      }).join('');
    }

    root.querySelector('#clock-refresh').addEventListener('click', function () {
      tick();
      window.UI.toast('已刷新', 'success');
    });

    tick();
    var timer = setInterval(function () {
      if (!document.body.contains(root)) { clearInterval(timer); return; }
      tick();
    }, 1000);
  }

  /* ------------------------------ 4. Cron 下次运行 ------------------------------ */
  var MONTH_NAMES = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
  var DAY_NAMES = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };

  function cronNumber(token, names) {
    var upper = String(token).toUpperCase();
    if (names && names[upper] !== undefined) return names[upper];
    if (!/^\d+$/.test(token)) throw new Error('无法识别的字段值：' + token);
    return Number(token);
  }

  function cronField(field, min, max, names) {
    var set = {};
    String(field).split(',').forEach(function (part) {
      if (!part) throw new Error('字段中存在空值');
      var step = 1;
      var range = part;
      var slash = part.split('/');
      if (slash.length === 2) {
        range = slash[0];
        step = Number(slash[1]);
        if (!step || step <= 0) throw new Error('步长必须是正整数：' + part);
      } else if (slash.length > 2) throw new Error('字段格式错误：' + part);

      var lo;
      var hi;
      if (range === '*') { lo = min; hi = max; }
      else if (range.indexOf('-') > 0) {
        var ab = range.split('-');
        lo = cronNumber(ab[0], names);
        hi = cronNumber(ab[1], names);
      } else {
        lo = cronNumber(range, names);
        hi = slash.length === 2 ? max : lo;
      }
      if (lo < min || hi > max || lo > hi) {
        throw new Error('取值超出范围（' + min + '–' + max + '）：' + part);
      }
      for (var v = lo; v <= hi; v += step) set[v] = true;
    });
    return set;
  }

  function parseCron(expr) {
    var fields = expr.trim().split(/\s+/);
    if (fields.length !== 5) throw new Error('需要 5 个字段（分 时 日 月 周），当前 ' + fields.length + ' 个');
    var minute = cronField(fields[0], 0, 59);
    var hour = cronField(fields[1], 0, 23);
    var dom = cronField(fields[2], 1, 31);
    var month = cronField(fields[3], 1, 12, MONTH_NAMES);
    var dowRaw = cronField(fields[4], 0, 7, DAY_NAMES);
    var dow = {};
    Object.keys(dowRaw).forEach(function (k) { dow[Number(k) % 7] = true; });
    return {
      minute: minute, hour: hour, dom: dom, month: month, dow: dow,
      domStar: fields[2] === '*', dowStar: fields[4] === '*'
    };
  }

  function nextCronRuns(cron, from, count) {
    var results = [];
    var cursor = new Date(from.getTime());
    cursor.setSeconds(0, 0);
    cursor = new Date(cursor.getTime() + 60000);
    var limit = new Date(from.getTime() + 4 * 365 * 86400000);
    while (results.length < count && cursor <= limit) {
      if (!cron.month[cursor.getMonth() + 1]) {
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 0, 0, 0);
        continue;
      }
      var dayOfMonth = cursor.getDate();
      var dayOfWeek = cursor.getDay();
      var domOk = cron.dom[dayOfMonth];
      var dowOk = cron.dow[dayOfWeek];
      // cron 规则：日与周都不是 * 时取「或」，否则取「与」
      var dayOk = (!cron.domStar && !cron.dowStar) ? (domOk || dowOk) : (domOk && dowOk);
      if (!dayOk) {
        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1, 0, 0, 0);
        continue;
      }
      if (!cron.hour[cursor.getHours()]) {
        cursor = new Date(cursor.getTime() + 3600000 - cursor.getMinutes() * 60000 - cursor.getSeconds() * 1000);
        continue;
      }
      if (!cron.minute[cursor.getMinutes()]) {
        cursor = new Date(cursor.getTime() + 60000);
        continue;
      }
      results.push(new Date(cursor.getTime()));
      cursor = new Date(cursor.getTime() + 60000);
    }
    return results;
  }

  function renderCronNext(root) {
    K.form(root, {
      uid: 'cronnext',
      actionLabel: '计算下次运行',
      fields: [
        { id: 'expr', label: 'Cron 表达式（分 时 日 月 周）', type: 'text', value: '0 9 * * 1-5', wide: true },
        { id: 'count', label: '显示条数', type: 'number', value: 8, min: 1, max: 30 }
      ],
      hint: '支持 * 、列表 a,b 、区间 a-b 、步长 */n 与 a-b/n，月份可写 JAN–DEC，星期可写 SUN–SAT（0 与 7 都表示周日）。',
      run: function (v) {
        var cron;
        try {
          cron = parseCron(v.expr);
        } catch (e) {
          return { error: e.message };
        }
        var runs = nextCronRuns(cron, new Date(), Math.max(1, Number(v.count) || 8));
        if (!runs.length) return { error: '未来 4 年内没有匹配的时间，请检查表达式' };
        var now = Date.now();
        var rows = runs.map(function (d, i) {
          var mins = Math.round((d.getTime() - now) / 60000);
          var rel = mins < 60 ? mins + ' 分钟后' : mins < 1440 ? Math.round(mins / 60) + ' 小时后' : Math.round(mins / 1440) + ' 天后';
          return [i + 1, fmtDate(d) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()), WEEK[d.getDay()], rel];
        });
        return {
          html: K.table(['#', '运行时间', '星期', '距现在'], rows),
          note: '共找到 ' + runs.length + ' 次运行时间'
        };
      }
    });
  }

  /* ------------------------------ 5. 日期字符串格式化 ------------------------------ */
  function parseLooseDate(input) {
    var text = input.trim();
    if (!text) return null;
    if (/^\d{10}$/.test(text)) return new Date(Number(text) * 1000);
    if (/^\d{13}$/.test(text)) return new Date(Number(text));
    var normalized = text.replace(/[年月]/g, '-').replace(/日/g, '').replace(/\//g, '-').replace(/\./g, '-');
    normalized = normalized.replace(/\s+/g, ' ').trim();
    var m = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (m) {
      return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]),
        Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0));
    }
    m = normalized.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (m) return new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
    var d = new Date(text);
    return isNaN(d.getTime()) ? null : d;
  }

  function isoWeek(date) {
    var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    var day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return { year: d.getUTCFullYear(), week: week };
  }

  function renderDateReformat(root) {
    K.form(root, {
      uid: 'dre',
      actionLabel: '解析',
      fields: [{ id: 'input', label: '日期字符串或时间戳', type: 'text', value: '2024-03-05 14:30:00', wide: true, placeholder: '如 2024-03-05、2024/3/5 14:30、1709620200' }],
      hint: '支持 yyyy-MM-dd、yyyy/MM/dd、yyyy年M月d日、MM/dd/yyyy、秒/毫秒时间戳与标准 Date 字符串。',
      run: function (v) {
        var d = parseLooseDate(v.input);
        if (!d) return { error: '无法识别这个日期，请检查格式' };
        var week = isoWeek(d);
        var start = new Date(d.getFullYear(), 0, 1);
        var dayOfYear = dayDiff(start, d) + 1;
        return {
          rows: [
            { key: 'ISO 8601', value: d.toISOString() },
            { key: '本地时间', value: fmtDate(d) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()) },
            { key: 'UTC 时间', value: d.toUTCString() },
            { key: '时间戳（秒）', value: String(Math.floor(d.getTime() / 1000)) },
            { key: '时间戳（毫秒）', value: String(d.getTime()) },
            { key: '星期', value: WEEK[d.getDay()] },
            { key: '中文格式', value: d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日' },
            { key: 'ISO 周', value: week.year + ' 年第 ' + week.week + ' 周' },
            { key: '年内第几天', value: dayOfYear + ' / ' + (isLeap(d.getFullYear()) ? 366 : 365) },
            { key: '季度', value: 'Q' + (Math.floor(d.getMonth() / 3) + 1) }
          ],
          note: '已解析：' + fmtDate(d)
        };
      }
    });
  }

  function isLeap(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  /* ------------------------------ 6. 季度与财年 ------------------------------ */
  function renderQuarter(root) {
    var today = new Date();
    K.form(root, {
      uid: 'quarter',
      actionLabel: '计算',
      fields: [
        { id: 'date', label: '日期', type: 'date', value: fmtDate(today) },
        { id: 'fyStart', label: '财年起始月', type: 'select', value: '1',
          options: [{ value: '1', label: '1 月（自然年）' }, { value: '4', label: '4 月' }, { value: '7', label: '7 月' }, { value: '10', label: '10 月' }] }
      ],
      hint: '常用于财报、季度复盘与绩效考核周期换算。',
      run: function (v) {
        var d = parseDateInput(v.date);
        if (!d) return { error: '请选择有效日期' };
        var q = Math.floor(d.getMonth() / 3) + 1;
        var qStart = new Date(d.getFullYear(), (q - 1) * 3, 1);
        var qEnd = new Date(d.getFullYear(), q * 3, 0);
        var fyStartMonth = Number(v.fyStart) || 1;
        // 计算财年：起始月之前属于上一财年
        var fyYear = d.getMonth() + 1 >= fyStartMonth ? d.getFullYear() : d.getFullYear() - 1;
        var fyStart = new Date(fyYear, fyStartMonth - 1, 1);
        var fyEnd = new Date(fyYear + 1, fyStartMonth - 1, 0);
        var monthsIn = (d.getFullYear() - fyStart.getFullYear()) * 12 + (d.getMonth() - fyStart.getMonth());
        var fyQuarter = Math.floor(monthsIn / 3) + 1;
        return {
          rows: [
            { key: '自然季度', value: d.getFullYear() + ' 年 Q' + q },
            { key: '季度起止', value: fmtDate(qStart) + ' ~ ' + fmtDate(qEnd) },
            { key: '季度天数', value: (dayDiff(qStart, qEnd) + 1) + ' 天' },
            { key: '本季已过', value: (dayDiff(qStart, d) + 1) + ' 天' },
            { key: '本季剩余', value: dayDiff(d, qEnd) + ' 天' },
            { key: '财年', value: 'FY' + fyYear + '（' + fmtDate(fyStart) + ' 起）' },
            { key: '财年季度', value: 'FY' + fyYear + ' Q' + fyQuarter },
            { key: '财年进度', value: (Math.min(100, Math.max(0, (dayDiff(fyStart, d) + 1) / (dayDiff(fyStart, fyEnd) + 1) * 100))).toFixed(1) + '%' }
          ],
          note: '按财年起始月 ' + fyStartMonth + ' 月计算'
        };
      }
    });
  }

  /* ------------------------------ 7. 工作日推算 ------------------------------ */
  function renderWorkdayAdd(root) {
    var today = new Date();
    K.form(root, {
      uid: 'wadd',
      actionLabel: '推算',
      fields: [
        { id: 'start', label: '起始日期', type: 'date', value: fmtDate(today) },
        { id: 'days', label: '工作日数（负数向前推）', type: 'number', value: 10 },
        { id: 'holidays', label: '额外节假日（每行 yyyy-MM-dd，可留空）', type: 'textarea', rows: 4, wide: true, mono: true }
      ],
      hint: '只跳过周六周日与手填的节假日，不内置法定节假日表（每年安排不同，请按需填写）。',
      run: function (v) {
        var start = parseDateInput(v.start);
        if (!start) return { error: '请选择起始日期' };
        var days = Number(v.days);
        if (!isFinite(days) || days === 0) return { error: '工作日数不能为 0' };
        if (Math.abs(days) > 5000) return { error: '工作日数过大（上限 5000）' };
        var holidays = {};
        v.holidays.split('\n').forEach(function (line) {
          var t = line.trim();
          if (t) holidays[t] = true;
        });

        var cursor = new Date(start.getTime());
        var dir = days > 0 ? 1 : -1;
        var remaining = Math.abs(days);
        var skippedWeekend = 0;
        var skippedHoliday = 0;
        var steps = 0;
        while (remaining > 0) {
          cursor = new Date(cursor.getTime() + dir * 86400000);
          steps += 1;
          if (steps > 20000) return { error: '推算步数过多，请检查输入' };
          var key = fmtDate(cursor);
          if (cursor.getDay() === 0 || cursor.getDay() === 6) { skippedWeekend += 1; continue; }
          if (holidays[key]) { skippedHoliday += 1; continue; }
          remaining -= 1;
        }
        return {
          rows: [
            { key: '起始日期', value: fmtDate(start) + ' ' + WEEK[start.getDay()] },
            { key: '目标日期', value: fmtDate(cursor) + ' ' + WEEK[cursor.getDay()] },
            { key: '自然日间隔', value: Math.abs(dayDiff(start, cursor)) + ' 天' },
            { key: '跳过周末', value: skippedWeekend + ' 天' },
            { key: '跳过节假日', value: skippedHoliday + ' 天' }
          ],
          note: (days > 0 ? '向后' : '向前') + '推算 ' + Math.abs(days) + ' 个工作日'
        };
      }
    });
  }

  /* ------------------------------ 8. 时间加减 ------------------------------ */
  function parseClock(text) {
    var t = String(text).trim();
    if (!t) return null;
    var m = t.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
    if (m) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] || 0);
    m = t.match(/^(\d+(?:\.\d+)?)\s*(h|小时|m|分钟|s|秒)$/i);
    if (m) {
      var value = Number(m[1]);
      var unit = m[2].toLowerCase();
      return Math.round(value * (unit === 'h' || unit === '小时' ? 3600 : unit === 'm' || unit === '分钟' ? 60 : 1));
    }
    if (/^\d+(\.\d+)?$/.test(t)) return Math.round(Number(t) * 60); // 纯数字按分钟
    return null;
  }

  function hms(seconds) {
    var sign = seconds < 0 ? '-' : '';
    var abs = Math.abs(Math.round(seconds));
    return sign + pad2(Math.floor(abs / 3600)) + ':' + pad2(Math.floor(abs % 3600 / 60)) + ':' + pad2(abs % 60);
  }

  function renderTimeArith(root) {
    K.form(root, {
      uid: 'tarith',
      actionLabel: '计算',
      fields: [
        { id: 'a', label: '时间 A', type: 'text', value: '08:30:00', placeholder: 'hh:mm:ss 或 90m' },
        { id: 'op', label: '运算', type: 'select', value: '+', options: ['+', '-'] },
        { id: 'b', label: '时间 B', type: 'text', value: '2:45:30', placeholder: 'hh:mm:ss 或 1.5h' }
      ],
      hint: '支持 hh:mm:ss、hh:mm、90m、1.5h、45s；纯数字按分钟处理。',
      run: function (v) {
        var a = parseClock(v.a);
        var b = parseClock(v.b);
        if (a === null) return { error: '时间 A 格式不正确' };
        if (b === null) return { error: '时间 B 格式不正确' };
        var result = v.op === '-' ? a - b : a + b;
        return {
          html: '<div class="big-result">' + hms(result) + '</div>',
          rows: [
            { key: 'A', value: hms(a) + '（' + a + ' 秒）' },
            { key: 'B', value: hms(b) + '（' + b + ' 秒）' },
            { key: '结果', value: hms(result) },
            { key: '折算', value: (result / 3600).toFixed(2) + ' 小时 / ' + (result / 60).toFixed(1) + ' 分钟' }
          ],
          note: result < 0 ? '结果为负数（B 大于 A）' : '计算完成'
        };
      }
    });
  }

  /* ------------------------------ 9. 时长批量累加 ------------------------------ */
  function renderDurationSum(root) {
    K.form(root, {
      uid: 'dsum',
      actionLabel: '累加',
      fields: [
        { id: 'src', label: '每行一条时长', type: 'textarea', rows: 7, wide: true,
          value: '1:30\n2:15\n0:45\n1.5h' }
      ],
      hint: '每行支持 hh:mm:ss、hh:mm、90m、1.5h、45s，空行会被忽略。',
      run: function (v) {
        var lines = v.src.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
        if (!lines.length) return { error: '请至少输入一行时长' };
        var total = 0;
        var rows = [];
        for (var i = 0; i < lines.length; i += 1) {
          var sec = parseClock(lines[i]);
          if (sec === null) {
            return { error: '第 ' + (i + 1) + ' 行无法识别：' + lines[i] };
          }
          total += sec;
          rows.push([i + 1, lines[i], hms(sec)]);
        }
        return {
          html: '<div class="big-result">' + hms(total) + '</div>' + K.table(['#', '原始输入', '折算'], rows),
          rows: [
            { key: '总时长', value: hms(total) },
            { key: '总分钟', value: (total / 60).toFixed(1) },
            { key: '总小时', value: (total / 3600).toFixed(2) },
            { key: '条目数', value: rows.length + ' 条' },
            { key: '平均每条', value: hms(total / rows.length) }
          ],
          note: '已累加 ' + rows.length + ' 条时长'
        };
      }
    });
  }

  /* ------------------------------ 10. 闰年判断 ------------------------------ */
  function renderLeapYear(root) {
    K.form(root, {
      uid: 'leap',
      actionLabel: '判断',
      fields: [{ id: 'year', label: '年份', type: 'number', value: new Date().getFullYear(), min: 1, max: 9999 }],
      hint: '规则：能被 4 整除但不能被 100 整除，或能被 400 整除。',
      run: function (v) {
        var year = Number(v.year);
        if (!year || year < 1 || year > 9999) return { error: '年份需在 1–9999 之间' };
        var leap = isLeap(year);
        var prev = [];
        var next = [];
        var y = year - 1;
        while (prev.length < 5) { if (isLeap(y)) prev.unshift(y); y -= 1; }
        y = year + 1;
        while (next.length < 5) { if (isLeap(y)) next.push(y); y += 1; }
        return {
          html: '<div class="big-result">' + year + ' 年' + (leap ? '是闰年' : '不是闰年') + '</div>',
          rows: [
            { key: '二月天数', value: (leap ? 29 : 28) + ' 天' },
            { key: '全年天数', value: (leap ? 366 : 365) + ' 天' },
            { key: '世纪年规则', value: year % 100 === 0 ? (year % 400 === 0 ? '整百年且能被 400 整除 → 闰年' : '整百年但不能被 400 整除 → 平年') : '非整百年，看能否被 4 整除' },
            { key: '之前 5 个闰年', value: prev.join('、') },
            { key: '之后 5 个闰年', value: next.join('、') }
          ],
          note: leap ? '该年有 2 月 29 日' : '该年没有 2 月 29 日'
        };
      }
    });
  }

  /* ------------------------------ 11. 复活节 ------------------------------ */
  function easterSunday(year) {
    // Meeus/Jones/Butcher 算法（西方教会，格里高利历）
    var a = year % 19;
    var b = Math.floor(year / 100);
    var c = year % 100;
    var d = Math.floor(b / 4);
    var e = b % 4;
    var f = Math.floor((b + 8) / 25);
    var g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4);
    var k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31);
    var day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }

  function renderEaster(root) {
    K.form(root, {
      uid: 'easter',
      actionLabel: '计算',
      fields: [{ id: 'year', label: '年份', type: 'number', value: new Date().getFullYear(), min: 1583, max: 4099 }],
      hint: '采用 Meeus/Jones/Butcher 算法计算西方教会（格里高利历）的复活节，东正教日期可能不同。',
      run: function (v) {
        var year = Number(v.year);
        if (!year || year < 1583 || year > 4099) return { error: '年份需在 1583–4099 之间' };
        var easter = easterSunday(year);
        var offset = function (n) { return new Date(easter.getTime() + n * 86400000); };
        var rows = [
          ['复活节前的星期三', offset(-4)],
          ['耶稣受难日', offset(-2)],
          ['复活节星期日', easter],
          ['复活节星期一', offset(1)],
          ['耶稣升天节', offset(39)],
          ['圣灵降临节', offset(49)],
          ['圣体节', offset(60)]
        ].map(function (item) {
          return [item[0], fmtDate(item[1]), WEEK[item[1].getDay()]];
        });
        return {
          html: K.table(['节日', '日期', '星期'], rows),
          note: year + ' 年复活节：' + fmtDate(easter)
        };
      }
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['solar-term'] = renderSolarTerm;
  window.ToolModules['date-range'] = renderDateRange;
  window.ToolModules['world-clock'] = renderWorldClock;
  window.ToolModules['cron-next'] = renderCronNext;
  window.ToolModules['date-reformat'] = renderDateReformat;
  window.ToolModules['quarter-calc'] = renderQuarter;
  window.ToolModules['workday-add'] = renderWorkdayAdd;
  window.ToolModules['time-arith'] = renderTimeArith;
  window.ToolModules['duration-sum'] = renderDurationSum;
  window.ToolModules['leap-year'] = renderLeapYear;
  window.ToolModules['date-easter'] = renderEaster;
})();
