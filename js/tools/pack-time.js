/* =============================================================================
 * 时间日期工具包（12 个）
 * -----------------------------------------------------------------------------
 * date-diff / date-add / age-calc / workday-calc / timezone-convert /
 * week-info / ts-batch / duration-format / date-format / countdown /
 * calendar-gen / cron-parser
 *
 * 所有日期换算均基于浏览器本地时区（时区转换工具除外）。
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  var WEEK_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function fmtDate(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function fmtDateTime(date) {
    return fmtDate(date) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
  }

  function parseLocalDate(str) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(str || '').trim());
    if (!m) return null;
    var date = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(date.getTime()) ? null : date;
  }

  function parseLocalDateTime(str) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})[T ](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/.exec(String(str || '').trim());
    if (!m) return null;
    var date = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
    return isNaN(date.getTime()) ? null : date;
  }

  function dayDiff(a, b) {
    // 用「当地零点」计算整天差，避免夏令时导致的小时误差
    var da = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    var db = new Date(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((db - da) / 86400000);
  }

  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  function daysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  function isWeekend(date) {
    var day = date.getDay();
    return day === 0 || day === 6;
  }

  function todayInput() {
    var now = new Date();
    return fmtDate(now);
  }

  /** 两个日期之间的工作日（含起止，排除周六日） */
  function countWorkdays(start, end) {
    var sign = 1;
    var a = new Date(start.getTime());
    var b = new Date(end.getTime());
    if (a > b) { var temp = a; a = b; b = temp; sign = -1; }
    var count = 0;
    var cursor = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    var last = new Date(b.getFullYear(), b.getMonth(), b.getDate());
    while (cursor <= last) {
      if (!isWeekend(cursor)) count += 1;
      cursor.setDate(cursor.getDate() + 1);
    }
    return count * sign;
  }

  /* ------------------------------ 日期相差 ------------------------------ */
  function renderDateDiff(root) {
    K.form(root, {
      uid: 'datediff',
      actionLabel: '计算相差',
      fields: [
        { id: 'start', label: '开始日期', type: 'date', value: '2024-01-01' },
        { id: 'end', label: '结束日期', type: 'date', value: todayInput() },
        { id: 'inclusive', label: '包含首尾两天', type: 'checkbox' }
      ],
      sample: { start: '2024-01-01', end: '2024-12-31' },
      run: function (values) {
        var a = parseLocalDate(values.start);
        var b = parseLocalDate(values.end);
        if (!a || !b) return { error: '请选择有效的开始与结束日期。' };

        var days = dayDiff(a, b);
        var abs = Math.abs(days) + (values.inclusive ? 1 : 0);
        var workdays = countWorkdays(a, b);

        // 精确年月日：逐月推进
        var sign = days < 0 ? -1 : 1;
        var from = sign > 0 ? a : b;
        var to = sign > 0 ? b : a;
        var years = 0;
        var months = 0;
        var cursor = new Date(from.getTime());
        while (true) {
          var next = new Date(cursor.getTime());
          next.setFullYear(next.getFullYear() + 1);
          if (next <= to) { cursor = next; years += 1; } else break;
        }
        while (true) {
          var nextMonth = new Date(cursor.getTime());
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          if (nextMonth <= to) { cursor = nextMonth; months += 1; } else break;
        }
        var restDays = dayDiff(cursor, to);

        return {
          rows: [
            { key: '相差天数', value: days + ' 天' + (days < 0 ? '（结束早于开始）' : '') },
            { key: '含首尾天数', value: abs + ' 天' },
            { key: '精确间隔', value: (sign < 0 ? '-' : '') + years + ' 年 ' + months + ' 个月 ' + restDays + ' 天' },
            { key: '折合周数', value: K.num(Math.abs(days) / 7, 1) + ' 周' },
            { key: '折合小时', value: K.group(Math.abs(days) * 24) + ' 小时' },
            { key: '折合分钟', value: K.group(Math.abs(days) * 1440) + ' 分钟' },
            { key: '工作日（周一至周五）', value: Math.abs(workdays) + ' 天' },
            { key: '周末天数', value: (abs - Math.abs(workdays)) + ' 天' }
          ],
          note: '按本地时区的自然日计算，已排除夏令时影响。'
        };
      }
    });
  }

  /* ------------------------------ 日期加减 ------------------------------ */
  function renderDateAdd(root) {
    K.form(root, {
      uid: 'dateadd',
      actionLabel: '计算新日期',
      fields: [
        { id: 'base', label: '基准日期 / 时间', type: 'datetime-local', value: fmtDate(new Date()) + 'T09:00' },
        { id: 'years', label: '加/减 年', type: 'number', value: 0, step: 1 },
        { id: 'months', label: '加/减 月', type: 'number', value: 0, step: 1 },
        { id: 'days', label: '加/减 天', type: 'number', value: 0, step: 1 },
        { id: 'hours', label: '加/减 小时', type: 'number', value: 0, step: 1 }
      ],
      sample: { base: '2024-01-31T09:00', years: 1, months: 1, days: 10, hours: 0 },
      run: function (values) {
        var base = parseLocalDateTime(values.base);
        if (!base) return { error: '请选择有效的基准日期。' };
        var result = new Date(base.getTime());
        var years = parseInt(values.years, 10) || 0;
        var months = parseInt(values.months, 10) || 0;
        var days = parseInt(values.days, 10) || 0;
        var hours = parseInt(values.hours, 10) || 0;

        // 先处理年月，遇到月末自动收敛（如 1/31 + 1 月 → 2/29）
        if (years) result.setFullYear(result.getFullYear() + years);
        if (months) {
          var targetMonth = result.getMonth() + months;
          var day = result.getDate();
          result.setDate(1);
          result.setMonth(targetMonth);
          result.setDate(Math.min(day, daysInMonth(result.getFullYear(), result.getMonth() + 1)));
        }
        result.setDate(result.getDate() + days);
        result.setHours(result.getHours() + hours);

        return {
          rows: [
            { key: '结果日期', value: fmtDate(result) + ' ' + WEEK_CN[result.getDay()] },
            { key: '结果时间', value: fmtDateTime(result) },
            { key: '时间戳（秒）', value: Math.floor(result.getTime() / 1000) },
            { key: '时间戳（毫秒）', value: result.getTime() },
            { key: 'ISO 8601', value: result.toISOString() }
          ],
          note: '月末加月会自动收敛到当月最后一天。'
        };
      }
    });
  }

  /* ------------------------------ 年龄计算 ------------------------------ */
  /* 每个星座的起始「月日」阈值，摩羯座跨年单独处理 */
  var ZODIAC_SIGNS = [
    ['水瓶座', 120], ['双鱼座', 219], ['白羊座', 321], ['金牛座', 420],
    ['双子座', 521], ['巨蟹座', 622], ['狮子座', 723], ['处女座', 823],
    ['天秤座', 923], ['天蝎座', 1024], ['射手座', 1123], ['摩羯座', 1222]
  ];
  var CHINESE_ZODIAC = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

  function renderAge(root) {
    K.form(root, {
      uid: 'age',
      actionLabel: '计算年龄',
      fields: [
        { id: 'birth', label: '出生日期', type: 'date', value: '1995-06-15' },
        { id: 'at', label: '计算日期', type: 'date', value: todayInput() }
      ],
      sample: { birth: '1995-06-15' },
      run: function (values) {
        var birth = parseLocalDate(values.birth);
        var at = parseLocalDate(values.at) || new Date();
        if (!birth) return { error: '请选择有效的出生日期。' };
        if (birth > at) return { error: '出生日期不能晚于计算日期。' };

        var years = at.getFullYear() - birth.getFullYear();
        var months = at.getMonth() - birth.getMonth();
        var days = at.getDate() - birth.getDate();
        if (days < 0) {
          months -= 1;
          days += daysInMonth(at.getFullYear(), at.getMonth());
        }
        if (months < 0) { years -= 1; months += 12; }

        var totalDays = dayDiff(birth, at);
        var nextBirthday = new Date(at.getFullYear(), birth.getMonth(), birth.getDate());
        if (nextBirthday < new Date(at.getFullYear(), at.getMonth(), at.getDate())) {
          nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
        }
        var untilBirthday = dayDiff(new Date(at.getFullYear(), at.getMonth(), at.getDate()), nextBirthday);

        var md = (birth.getMonth() + 1) * 100 + birth.getDate();
        var sign = '摩羯座';
        ZODIAC_SIGNS.forEach(function (item) {
          if (md >= item[1]) sign = item[0];
        });

        return {
          rows: [
            { key: '周岁', value: years + ' 岁 ' + months + ' 个月 ' + days + ' 天' },
            { key: '虚岁（传统算法）', value: (at.getFullYear() - birth.getFullYear() + 1) + ' 岁' },
            { key: '出生至今', value: K.group(totalDays) + ' 天（约 ' + K.num(totalDays / 365.25, 1) + ' 年）' },
            { key: '下次生日', value: fmtDate(nextBirthday) + '，还有 ' + untilBirthday + ' 天' },
            { key: '星座', value: sign },
            { key: '生肖', value: CHINESE_ZODIAC[((birth.getFullYear() - 4) % 12 + 12) % 12] },
            { key: '出生星期', value: WEEK_CN[birth.getDay()] }
          ],
          note: '周岁按公历生日精确到日计算；虚岁为传统「出生即 1 岁，过年加 1 岁」的简化算法。'
        };
      }
    });
  }

  /* ------------------------------ 工作日计算 ------------------------------ */
  function renderWorkday(root) {
    K.form(root, {
      uid: 'workday',
      actionLabel: '计算',
      fields: [
        {
          id: 'mode', label: '计算方式', type: 'select', value: 'between',
          options: [
            { value: 'between', label: '两个日期之间有几天工作日' },
            { value: 'add', label: '从某天起 N 个工作日后的日期' }
          ]
        },
        { id: 'start', label: '开始日期', type: 'date', value: todayInput() },
        { id: 'end', label: '结束日期（方式一使用）', type: 'date', value: todayInput() },
        { id: 'days', label: '工作日天数（方式二使用）', type: 'number', value: 10, step: 1 }
      ],
      sample: { mode: 'between', start: '2024-01-01', end: '2024-01-31' },
      run: function (values) {
        var start = parseLocalDate(values.start);
        if (!start) return { error: '请选择有效的开始日期。' };

        if (values.mode === 'between') {
          var end = parseLocalDate(values.end);
          if (!end) return { error: '请选择有效的结束日期。' };
          var workdays = countWorkdays(start, end);
          var total = Math.abs(dayDiff(start, end)) + 1;
          return {
            rows: [
              { key: '工作日', value: Math.abs(workdays) + ' 天' },
              { key: '周末', value: (total - Math.abs(workdays)) + ' 天' },
              { key: '自然日合计', value: total + ' 天' },
              { key: '工作日占比', value: K.num(Math.abs(workdays) / total * 100, 1) + '%' }
            ],
            note: '按周一至周五为工作日计算，未扣除法定节假日与调休。'
          };
        }

        var need = parseInt(values.days, 10);
        if (!isFinite(need) || need === 0) return { error: '工作日天数需为非 0 整数（负数表示往前推）。' };
        var step = need > 0 ? 1 : -1;
        var remain = Math.abs(need);
        var cursor = new Date(start.getTime());
        var guard = 0;
        while (remain > 0 && guard < 20000) {
          cursor.setDate(cursor.getDate() + step);
          if (!isWeekend(cursor)) remain -= 1;
          guard += 1;
        }
        return {
          rows: [
            { key: '结果日期', value: fmtDate(cursor) + ' ' + WEEK_CN[cursor.getDay()] },
            { key: '跨越自然日', value: Math.abs(dayDiff(start, cursor)) + ' 天' },
            { key: '时间戳（秒）', value: Math.floor(cursor.getTime() / 1000) }
          ],
          note: '已跳过周六日，未考虑法定节假日与调休。'
        };
      }
    });
  }

  /* ------------------------------ 时区转换 ------------------------------ */
  var ZONES = [
    { id: 'Asia/Shanghai', label: '北京 / 上海 (UTC+8)' },
    { id: 'UTC', label: '协调世界时 UTC' },
    { id: 'Asia/Tokyo', label: '东京 (UTC+9)' },
    { id: 'Asia/Singapore', label: '新加坡 (UTC+8)' },
    { id: 'Asia/Kolkata', label: '印度 (UTC+5:30)' },
    { id: 'Asia/Dubai', label: '迪拜 (UTC+4)' },
    { id: 'Europe/London', label: '伦敦 (UTC+0/+1)' },
    { id: 'Europe/Paris', label: '巴黎 (UTC+1/+2)' },
    { id: 'America/New_York', label: '纽约 (UTC-5/-4)' },
    { id: 'America/Los_Angeles', label: '洛杉矶 (UTC-8/-7)' },
    { id: 'Australia/Sydney', label: '悉尼 (UTC+10/+11)' }
  ];

  function tzOffsetMs(date, timeZone) {
    var dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    var parts = dtf.formatToParts(date);
    var map = {};
    parts.forEach(function (part) { map[part.type] = part.value; });
    var asUTC = Date.UTC(+map.year, +map.month - 1, +map.day,
      (+map.hour) % 24, +map.minute, +map.second);
    return asUTC - date.getTime();
  }

  function zonedToUtc(localString, timeZone) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})[T ](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/.exec(localString);
    if (!m) return null;
    var guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
    var first = tzOffsetMs(new Date(guess), timeZone);
    var second = tzOffsetMs(new Date(guess - first), timeZone);
    return new Date(guess - second);
  }

  function renderTimezone(root) {
    K.form(root, {
      uid: 'tz',
      actionLabel: '转换',
      stack: true,
      fields: [
        { id: 'when', label: '本地时间（按下方来源时区解释）', type: 'datetime-local', value: fmtDate(new Date()) + 'T' + pad(new Date().getHours()) + ':' + pad(new Date().getMinutes()) },
        {
          id: 'from', label: '来源时区', type: 'select', value: 'Asia/Shanghai',
          options: ZONES.map(function (zone) { return { value: zone.id, label: zone.label }; })
        }
      ],
      run: function (values) {
        var utc = zonedToUtc(values.when, values.from);
        if (!utc) return { error: '请输入有效的日期时间。' };
        var rows = ZONES.map(function (zone) {
          var text;
          try {
            text = new Intl.DateTimeFormat('zh-CN', {
              timeZone: zone.id, hour12: false,
              year: 'numeric', month: '2-digit', day: '2-digit',
              hour: '2-digit', minute: '2-digit', weekday: 'short'
            }).format(utc);
          } catch (e) {
            text = '（浏览器不支持该时区）';
          }
          return { key: zone.label, value: text };
        });
        rows.push({ key: 'UTC 时间戳（秒）', value: Math.floor(utc.getTime() / 1000) });
        return { rows: rows, note: '已按 IANA 时区数据库换算，自动处理夏令时。' };
      }
    });
  }

  /* ------------------------------ 周数 / 星期 ------------------------------ */
  function isoWeekOf(date) {
    var target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    var dayNum = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    return {
      week: Math.ceil(((target - yearStart) / 86400000 + 1) / 7),
      year: target.getUTCFullYear()
    };
  }

  function renderWeekInfo(root) {
    K.form(root, {
      uid: 'week',
      actionLabel: '查询',
      fields: [
        { id: 'date', label: '日期', type: 'date', value: todayInput() }
      ],
      run: function (values) {
        var date = parseLocalDate(values.date);
        if (!date) return { error: '请选择有效日期。' };
        var iso = isoWeekOf(date);
        var yearStart = new Date(date.getFullYear(), 0, 1);
        var dayOfYear = dayDiff(yearStart, date) + 1;
        var totalDays = isLeapYear(date.getFullYear()) ? 366 : 365;
        var quarter = Math.floor(date.getMonth() / 3) + 1;
        var monthDays = daysInMonth(date.getFullYear(), date.getMonth() + 1);

        return {
          rows: [
            { key: '日期', value: fmtDate(date) + ' ' + WEEK_CN[date.getDay()] },
            { key: 'ISO 周数', value: iso.year + ' 年第 ' + iso.week + ' 周' },
            { key: '本年第几天', value: dayOfYear + ' / ' + totalDays },
            { key: '季度', value: '第 ' + quarter + ' 季度（Q' + quarter + '）' },
            { key: '本月天数', value: monthDays + ' 天' },
            { key: '是否闰年', value: isLeapYear(date.getFullYear()) ? '是（366 天）' : '否（365 天）' },
            { key: '距年末', value: (totalDays - dayOfYear) + ' 天' },
            { key: '时间戳（秒）', value: Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 1000) }
          ],
          note: 'ISO 周数按「周一为一周开始、包含 1 月 4 日的那周为第 1 周」计算。'
        };
      }
    });
  }

  /* ------------------------------ 时间戳批量转换 ------------------------------ */
  function renderTsBatch(root) {
    K.text(root, {
      uid: 'tsbatch',
      inputLabel: '每行一个时间戳（自动识别秒 / 毫秒）',
      inputPlaceholder: '1700000000\n1700000000000\n2024-01-01 00:00:00',
      outputLabel: '转换结果',
      actionLabel: '批量转换',
      options: [
        {
          id: 'target', type: 'select', label: '输出格式', value: 'local',
          options: [
            { value: 'local', label: '本地时间' },
            { value: 'utc', label: 'UTC 时间' },
            { value: 'iso', label: 'ISO 8601' },
            { value: 'stamp', label: '反向：日期 → 时间戳' }
          ]
        }
      ],
      sample: '1700000000\n1700000000000\n2024-06-01',
      run: function (text, opt) {
        var rows = text.replace(/\r\n?/g, '\n').split('\n').filter(function (row) { return row.trim(); });
        if (rows.length > 1000) return { error: '一次最多处理 1000 行。' };
        var bad = 0;
        var out = rows.map(function (row) {
          var raw = row.trim();
          if (opt.target === 'stamp') {
            var date = parseLocalDateTime(raw) || parseLocalDate(raw);
            if (!date) { bad += 1; return raw + '  →  无法识别'; }
            return raw + '  →  ' + Math.floor(date.getTime() / 1000) + '（秒） / ' + date.getTime() + '（毫秒）';
          }
          var num = Number(raw);
          if (!isFinite(num) || raw === '') { bad += 1; return raw + '  →  非法时间戳'; }
          // 10 位按秒、13 位按毫秒，其余按数值大小推断
          var ms = Math.abs(num) < 1e11 ? num * 1000 : num;
          var d = new Date(ms);
          if (isNaN(d.getTime())) { bad += 1; return raw + '  →  超出可表示范围'; }
          var text;
          if (opt.target === 'utc') text = d.toISOString().replace('T', ' ').replace('.000Z', ' UTC');
          else if (opt.target === 'iso') text = d.toISOString();
          else text = fmtDateTime(d) + ' ' + WEEK_CN[d.getDay()];
          return raw + '  →  ' + text;
        });
        return {
          output: out.join('\n'),
          note: '共处理 ' + rows.length + ' 行' + (bad ? '，其中 ' + bad + ' 行无法识别。' : '，全部成功。'),
          type: bad ? 'info' : 'ok'
        };
      }
    });
  }

  /* ------------------------------ 时长换算 ------------------------------ */
  function renderDuration(root) {
    K.form(root, {
      uid: 'duration',
      actionLabel: '换算',
      fields: [
        { id: 'value', label: '数值', type: 'number', value: 3661, step: 'any' },
        {
          id: 'unit', label: '单位', type: 'select', value: 'seconds',
          options: [
            { value: 'seconds', label: '秒' },
            { value: 'minutes', label: '分钟' },
            { value: 'hours', label: '小时' },
            { value: 'days', label: '天' }
          ]
        }
      ],
      sample: { value: 90061, unit: 'seconds' },
      run: function (values) {
        var value = parseFloat(values.value);
        if (!isFinite(value)) return { error: '请输入有效数值。' };
        var factor = { seconds: 1, minutes: 60, hours: 3600, days: 86400 }[values.unit] || 1;
        var totalSeconds = value * factor;
        var sign = totalSeconds < 0 ? '-' : '';
        var abs = Math.abs(totalSeconds);

        var days = Math.floor(abs / 86400);
        var hours = Math.floor((abs % 86400) / 3600);
        var minutes = Math.floor((abs % 3600) / 60);
        var seconds = Math.floor(abs % 60);

        var parts = [];
        if (days) parts.push(days + ' 天');
        if (hours) parts.push(hours + ' 小时');
        if (minutes) parts.push(minutes + ' 分钟');
        if (seconds || !parts.length) parts.push(seconds + ' 秒');

        return {
          rows: [
            { key: '可读时长', value: sign + parts.join(' ') },
            { key: 'HH:MM:SS', value: sign + (days ? days + ' 天 ' : '') + pad(hours) + ':' + pad(minutes) + ':' + pad(seconds) },
            { key: '总秒数', value: K.num(totalSeconds, 3) },
            { key: '总分钟', value: K.num(totalSeconds / 60, 3) },
            { key: '总小时', value: K.num(totalSeconds / 3600, 3) },
            { key: '总天数', value: K.num(totalSeconds / 86400, 4) }
          ],
          note: '按 1 天 = 24 小时计算，不含「工作日」概念。'
        };
      }
    });
  }

  /* ------------------------------ 日期格式化 ------------------------------ */
  function renderDateFormat(root) {
    K.form(root, {
      uid: 'dateformat',
      actionLabel: '格式化',
      fields: [
        { id: 'when', label: '日期时间', type: 'datetime-local', value: fmtDate(new Date()) + 'T' + pad(new Date().getHours()) + ':' + pad(new Date().getMinutes()) },
        { id: 'pattern', label: '格式模板', type: 'text', value: 'YYYY-MM-DD HH:mm:ss', wide: true, placeholder: 'YYYY/MM/DD HH:mm:ss' }
      ],
      sample: { pattern: 'YYYY年M月D日 dddd HH:mm:ss' },
      run: function (values) {
        var date = parseLocalDateTime(values.when);
        if (!date) return { error: '请选择有效的日期时间。' };
        var pattern = values.pattern || 'YYYY-MM-DD HH:mm:ss';
        var map = {
          YYYY: String(date.getFullYear()),
          YY: String(date.getFullYear()).slice(-2),
          MM: pad(date.getMonth() + 1),
          M: String(date.getMonth() + 1),
          DD: pad(date.getDate()),
          D: String(date.getDate()),
          HH: pad(date.getHours()),
          H: String(date.getHours()),
          mm: pad(date.getMinutes()),
          m: String(date.getMinutes()),
          ss: pad(date.getSeconds()),
          s: String(date.getSeconds()),
          SSS: String(date.getMilliseconds()).padStart(3, '0'),
          dddd: WEEK_CN[date.getDay()],
          dd: '周' + '日一二三四五六'.charAt(date.getDay()),
          A: date.getHours() < 12 ? '上午' : '下午',
          X: String(Math.floor(date.getTime() / 1000))
        };
        // 长 token 优先替换，避免 YYYY 被 YY 提前切碎
        var out = pattern.replace(/YYYY|SSS|dddd|YY|MM|DD|HH|mm|ss|dd|M|D|H|m|s|A|X/g, function (token) {
          return map[token] !== undefined ? map[token] : token;
        });
        return {
          rows: [
            { key: '格式化结果', value: out },
            { key: 'ISO 8601', value: date.toISOString() },
            { key: '时间戳（秒）', value: Math.floor(date.getTime() / 1000) }
          ],
          note: '支持 YYYY YY MM M DD D HH H mm m ss s SSS dddd dd A X 等占位符。'
        };
      }
    });
  }

  /* ------------------------------ 倒计时 ------------------------------ */
  function renderCountdown(root) {
    var uid = K.uid('cd');
    root.innerHTML =
      '<div class="form-row">' +
        '<div class="form-item" style="flex:2 1 240px">' +
          '<label class="label" for="' + uid + '-target">目标时间</label>' +
          '<input id="' + uid + '-target" class="input mono" type="datetime-local" value="">' +
        '</div>' +
        '<div class="form-item">' +
          '<label class="label" for="' + uid + '-preset">快捷选择</label>' +
          '<select id="' + uid + '-preset" class="select">' +
            '<option value="">自定义</option>' +
            '<option value="newyear">下一个元旦</option>' +
            '<option value="weekend">最近的周末</option>' +
            '<option value="hour">1 小时后</option>' +
            '<option value="day">1 天后</option>' +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="' + uid + '-start">开始倒计时</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-clear">清除</button>' +
      '</div>' +
      '<div class="cd-stage" id="' + uid + '-stage" hidden>' +
        '<div class="cd-grid">' +
          '<div class="cd-cell"><span class="cd-num" id="' + uid + '-d">0</span><span class="cd-label">天</span></div>' +
          '<div class="cd-cell"><span class="cd-num" id="' + uid + '-h">0</span><span class="cd-label">时</span></div>' +
          '<div class="cd-cell"><span class="cd-num" id="' + uid + '-m">0</span><span class="cd-label">分</span></div>' +
          '<div class="cd-cell"><span class="cd-num" id="' + uid + '-s">0</span><span class="cd-label">秒</span></div>' +
        '</div>' +
        '<p class="cd-note" id="' + uid + '-note"></p>' +
      '</div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      '<p class="hint">倒计时仅在本页面运行，切换或关闭页面后停止。</p>';

    var target = root.querySelector('#' + uid + '-target');
    var preset = root.querySelector('#' + uid + '-preset');
    var stage = root.querySelector('#' + uid + '-stage');
    var note = root.querySelector('#' + uid + '-note');
    var statusEl = root.querySelector('#' + uid + '-status');
    var timer = null;

    target.value = fmtDate(new Date()) + 'T' + pad(new Date().getHours()) + ':' + pad(new Date().getMinutes() + 1 > 59 ? 59 : new Date().getMinutes() + 1);

    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    function tick() {
      if (!document.body.contains(root)) { stop(); return; }
      var end = parseLocalDateTime(target.value);
      if (!end) { stop(); return; }
      var diff = end.getTime() - Date.now();
      var abs = Math.abs(diff);
      root.querySelector('#' + uid + '-d').textContent = Math.floor(abs / 86400000);
      root.querySelector('#' + uid + '-h').textContent = pad(Math.floor((abs % 86400000) / 3600000));
      root.querySelector('#' + uid + '-m').textContent = pad(Math.floor((abs % 3600000) / 60000));
      root.querySelector('#' + uid + '-s').textContent = pad(Math.floor((abs % 60000) / 1000));
      note.textContent = (diff >= 0 ? '距离 ' : '已过去 ') + fmtDateTime(end) + ' ' + WEEK_CN[end.getDay()] +
        (diff >= 0 ? '' : '（已过 ' + Math.floor(abs / 86400000) + ' 天）');
      stage.hidden = false;
    }

    root.querySelector('#' + uid + '-start').addEventListener('click', function () {
      var end = parseLocalDateTime(target.value);
      if (!end) {
        statusEl.className = 'status err';
        statusEl.textContent = '请选择有效的目标时间。';
        statusEl.hidden = false;
        return;
      }
      statusEl.hidden = true;
      stop();
      tick();
      timer = setInterval(tick, 1000);
      window.UI.toast('倒计时已启动', 'success');
    });

    root.querySelector('#' + uid + '-clear').addEventListener('click', function () {
      stop();
      stage.hidden = true;
      statusEl.hidden = true;
      window.UI.toast('已清除倒计时', 'success');
    });

    preset.addEventListener('change', function () {
      var now = new Date();
      var date;
      if (preset.value === 'newyear') date = new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0);
      else if (preset.value === 'weekend') {
        date = new Date(now.getTime());
        var add = (6 - date.getDay() + 7) % 7 || 7;
        date.setDate(date.getDate() + add);
        date.setHours(0, 0, 0, 0);
      } else if (preset.value === 'hour') date = new Date(now.getTime() + 3600000);
      else if (preset.value === 'day') date = new Date(now.getTime() + 86400000);
      if (!date) return;
      target.value = fmtDate(date) + 'T' + pad(date.getHours()) + ':' + pad(date.getMinutes());
    });
  }

  /* ------------------------------ 月历生成 ------------------------------ */
  function renderCalendar(root) {
    var uid = K.uid('cal');
    var now = new Date();
    root.innerHTML =
      '<div class="form-row">' +
        '<div class="form-item"><label class="label" for="' + uid + '-year">年份</label>' +
          '<input id="' + uid + '-year" class="input" type="number" min="1900" max="2100" value="' + now.getFullYear() + '"></div>' +
        '<div class="form-item"><label class="label" for="' + uid + '-month">月份</label>' +
          '<select id="' + uid + '-month" class="select">' +
            Array.from({ length: 12 }, function (_, i) {
              return '<option value="' + (i + 1) + '"' + (i === now.getMonth() ? ' selected' : '') + '>' + (i + 1) + ' 月</option>';
            }).join('') +
          '</select></div>' +
        '<div class="form-item"><label class="label" for="' + uid + '-first">每周起始</label>' +
          '<select id="' + uid + '-first" class="select">' +
            '<option value="1">周一</option><option value="0">周日</option>' +
          '</select></div>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="' + uid + '-run">生成月历</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-today">回到本月</button>' +
      '</div>' +
      '<div id="' + uid + '-out"></div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      '<p class="hint">高亮显示今天；月历可直接截图使用，也可复制为文本（在结果区选中即可）。</p>';

    var yearEl = root.querySelector('#' + uid + '-year');
    var monthEl = root.querySelector('#' + uid + '-month');
    var firstEl = root.querySelector('#' + uid + '-first');
    var out = root.querySelector('#' + uid + '-out');
    var statusEl = root.querySelector('#' + uid + '-status');

    function draw() {
      var year = parseInt(yearEl.value, 10);
      var month = parseInt(monthEl.value, 10);
      if (!isFinite(year) || year < 1900 || year > 2100) {
        statusEl.className = 'status err';
        statusEl.textContent = '年份需在 1900–2100 之间。';
        statusEl.hidden = false;
        return;
      }
      var firstDay = parseInt(firstEl.value, 10);
      var start = new Date(year, month - 1, 1);
      var offset = (start.getDay() - firstDay + 7) % 7;
      var total = daysInMonth(year, month);
      var prevTotal = daysInMonth(year, month === 1 ? 12 : month - 1);
      var prevYear = month === 1 ? year - 1 : year;

      var cells = [];
      var i;
      for (i = offset - 1; i >= 0; i -= 1) {
        cells.push({ day: prevTotal - i, out: true });
      }
      for (i = 1; i <= total; i += 1) cells.push({ day: i, out: false });
      var nextDay = 1;
      while (cells.length % 7 !== 0 || cells.length < 35) {
        cells.push({ day: nextDay, out: true });
        nextDay += 1;
      }

      var today = new Date();
      var isThisMonth = today.getFullYear() === year && today.getMonth() === month - 1;
      var heads = ['一', '二', '三', '四', '五', '六', '日'];
      if (firstDay === 0) heads = ['日', '一', '二', '三', '四', '五', '六'];

      var html = '<div class="cal"><div class="cal-head">' + year + ' 年 ' + month + ' 月</div>' +
        '<div class="cal-grid">' +
        heads.map(function (h) { return '<div class="cal-wday">' + h + '</div>'; }).join('') +
        cells.map(function (cell) {
          var isToday = !cell.out && isThisMonth && cell.day === today.getDate();
          var weekend = false;
          return '<div class="cal-day' + (cell.out ? ' out' : '') + (isToday ? ' today' : '') + '">' + cell.day + '</div>';
        }).join('') +
        '</div></div>';

      out.innerHTML = html;
      statusEl.className = 'status ok';
      statusEl.textContent = year + ' 年 ' + month + ' 月共 ' + total + ' 天，1 日是' + WEEK_CN[start.getDay()] + '。';
      statusEl.hidden = false;
    }

    root.querySelector('#' + uid + '-run').addEventListener('click', draw);
    root.querySelector('#' + uid + '-today').addEventListener('click', function () {
      var t = new Date();
      yearEl.value = t.getFullYear();
      monthEl.value = t.getMonth() + 1;
      draw();
    });
    draw();
  }

  /* ------------------------------ Cron 解析 ------------------------------ */
  function parseCronField(expr, min, max) {
    var set = Object.create(null);
    expr.split(',').forEach(function (part) {
      if (!part) throw new Error('存在空的分段');
      var step = 1;
      var range = part;
      var slash = part.indexOf('/');
      if (slash !== -1) {
        range = part.slice(0, slash);
        step = parseInt(part.slice(slash + 1), 10);
        if (!isFinite(step) || step <= 0) throw new Error('步长无效：' + part);
      }
      var start;
      var end;
      if (range === '*') {
        start = min;
        end = max;
      } else if (range.indexOf('-') !== -1) {
        var seg = range.split('-');
        start = parseInt(seg[0], 10);
        end = parseInt(seg[1], 10);
      } else {
        start = parseInt(range, 10);
        end = slash === -1 ? start : max;
      }
      if (!isFinite(start) || !isFinite(end) || start < min || end > max || start > end) {
        throw new Error('取值超出范围：' + part + '（允许 ' + min + '–' + max + '）');
      }
      for (var v = start; v <= end; v += step) set[v] = true;
    });
    return set;
  }

  function describeCron(fields) {
    var names = ['分钟', '小时', '日', '月', '星期'];
    return fields.map(function (field, index) {
      if (field.expr === '*') return '每' + names[index];
      if (field.expr === '*/1') return '每' + names[index];
      return names[index] + ' ' + field.expr;
    }).join('，');
  }

  function renderCron(root) {
    var uid = K.uid('cron');
    root.innerHTML =
      '<div class="field">' +
        '<div class="label-row"><label class="label" for="' + uid + '-input">Cron 表达式（5 段）</label></div>' +
        '<input id="' + uid + '-input" class="input mono" type="text" value="0 9 * * 1-5" spellcheck="false">' +
      '</div>' +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="' + uid + '-run">解析</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-sample">示例</button>' +
        '<button type="button" class="btn ghost" id="' + uid + '-clear">清空</button>' +
      '</div>' +
      '<div id="' + uid + '-out"></div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      '<p class="hint">格式：<code>分 时 日 月 周</code>，支持 <code>*</code>、<code>*/n</code>、<code>a-b</code>、<code>a,b</code>。周字段 0 与 7 都表示周日。不支持秒级与 @yearly 等扩展语法。</p>';

    var input = root.querySelector('#' + uid + '-input');
    var out = root.querySelector('#' + uid + '-out');
    var statusEl = root.querySelector('#' + uid + '-status');

    function setStatus(type, text) {
      statusEl.className = 'status ' + type;
      statusEl.textContent = text;
      statusEl.hidden = false;
    }

    function run() {
      var expr = input.value.trim().replace(/\s+/g, ' ');
      if (!expr) { window.UI.toast('请输入 Cron 表达式', 'warn'); return; }
      var parts = expr.split(' ');
      if (parts.length !== 5) {
        out.innerHTML = '';
        setStatus('err', '需要 5 段（分 时 日 月 周），当前为 ' + parts.length + ' 段。');
        return;
      }

      var minutes, hours, days, months, weekdays;
      try {
        minutes = parseCronField(parts[0], 0, 59);
        hours = parseCronField(parts[1], 0, 23);
        days = parseCronField(parts[2], 1, 31);
        months = parseCronField(parts[3], 1, 12);
        weekdays = parseCronField(parts[4], 0, 7);
      } catch (error) {
        out.innerHTML = '';
        setStatus('err', '解析失败：' + error.message);
        return;
      }
      if (weekdays[7]) weekdays[0] = true;

      var cursor = new Date();
      cursor.setSeconds(0, 0);
      cursor.setMinutes(cursor.getMinutes() + 1);

      var results = [];
      var guard = 0;
      while (results.length < 5 && guard < 1500000) {
        if (months[cursor.getMonth() + 1] && days[cursor.getDate()] && weekdays[cursor.getDay()] &&
          hours[cursor.getHours()] && minutes[cursor.getMinutes()]) {
          results.push(new Date(cursor.getTime()));
        }
        cursor.setMinutes(cursor.getMinutes() + 1);
        guard += 1;
      }

      if (!results.length) {
        out.innerHTML = '';
        setStatus('err', '在未来约 3 年内没有匹配的时间，请检查「日」与「星期」是否冲突。');
        return;
      }

      var sets = [minutes, hours, days, months, weekdays];
      var sample = sets.map(function (set) {
        var values = Object.keys(set).map(Number).sort(function (a, b) { return a - b; });
        return values.slice(0, 12).join(', ') + (values.length > 12 ? ' …（共 ' + values.length + ' 个）' : '');
      });

      out.innerHTML =
        K.table(['字段', '表达式', '匹配取值'], [
          ['分钟', parts[0], sample[0]],
          ['小时', parts[1], sample[1]],
          ['日', parts[2], sample[2]],
          ['月', parts[3], sample[3]],
          ['星期', parts[4], sample[4] + '（0=周日）']
        ]) +
        '<h2 class="sub-title">接下来 5 次执行</h2>' +
        K.table(['#', '时间', '星期'], results.map(function (date, index) {
          return [index + 1, fmtDateTime(date), WEEK_CN[date.getDay()]];
        }));

      setStatus('ok', '解析成功。按本地时区计算，未考虑节假日。');
    }

    root.querySelector('#' + uid + '-run').addEventListener('click', run);
    root.querySelector('#' + uid + '-sample').addEventListener('click', function () {
      input.value = '*/15 9-18 * * 1-5';
      run();
    });
    root.querySelector('#' + uid + '-clear').addEventListener('click', function () {
      input.value = '';
      out.innerHTML = '';
      statusEl.hidden = true;
      window.UI.toast('已清空', 'success');
    });
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') { event.preventDefault(); run(); }
    });
    run();
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['date-diff'] = renderDateDiff;
  window.ToolModules['date-add'] = renderDateAdd;
  window.ToolModules['age-calc'] = renderAge;
  window.ToolModules['workday-calc'] = renderWorkday;
  window.ToolModules['timezone-convert'] = renderTimezone;
  window.ToolModules['week-info'] = renderWeekInfo;
  window.ToolModules['ts-batch'] = renderTsBatch;
  window.ToolModules['duration-format'] = renderDuration;
  window.ToolModules['date-format'] = renderDateFormat;
  window.ToolModules['countdown'] = renderCountdown;
  window.ToolModules['calendar-gen'] = renderCalendar;
  window.ToolModules['cron-parser'] = renderCron;
})();
