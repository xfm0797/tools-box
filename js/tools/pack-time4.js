/* =============================================================================
 * 时间日期工具包 · 第四批（12 个）
 * -----------------------------------------------------------------------------
 * date-valid       日期合法性校验
 * timezone-diff    两时区时差对照
 * unix-multi       时间戳多格式输出
 * date-format-custom 自定义日期格式化
 * day-of-year      年积日与剩余天数
 * work-hours       工时计算
 * timestamp-units  秒 / 毫秒 / 微秒 / 纳秒互转
 * date-parse       日期智能解析
 * date-diff-exact  两日期精确差值
 * weekday-info     星期与周次信息
 * range-overlap    时间段重叠判断
 * moon-phase       月相与月龄
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;
  var DAY = 86400000;
  var WEEK = ['日', '一', '二', '三', '四', '五', '六'];

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function parseDate(value) {
    var text = String(value || '').trim();
    if (!text) return null;
    var match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/.exec(text);
    if (match) {
      var date = new Date(
        Number(match[1]), Number(match[2]) - 1, Number(match[3]),
        Number(match[4] || 0), Number(match[5] || 0), Number(match[6] || 0)
      );
      return isNaN(date.getTime()) ? null : date;
    }
    var fallback = new Date(text);
    return isNaN(fallback.getTime()) ? null : fallback;
  }

  function isoWeek(date) {
    var target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    var dayNum = (target.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNum + 3);
    var firstThursday = new Date(target.getFullYear(), 0, 4);
    var firstDayNum = (firstThursday.getDay() + 6) % 7;
    firstThursday.setDate(firstThursday.getDate() - firstDayNum + 3);
    return 1 + Math.round((target - firstThursday) / (7 * DAY));
  }

  function zoneOffsetMinutes(date, timeZone) {
    var formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    var parts = {};
    formatter.formatToParts(date).forEach(function (part) { parts[part.type] = part.value; });
    var hour = parts.hour === '24' ? 0 : Number(parts.hour);
    var asUTC = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      hour, Number(parts.minute), Number(parts.second));
    return Math.round((asUTC - date.getTime()) / 60000);
  }

  function offsetLabel(minutes) {
    var sign = minutes < 0 ? '-' : '+';
    var abs = Math.abs(minutes);
    return 'UTC' + sign + pad(Math.floor(abs / 60)) + ':' + pad(abs % 60);
  }

  /* ------------------------------ 1. 日期合法性校验 ------------------------------ */
  function renderDateValid(root) {
    K.form(root, {
      uid: 'datevalid',
      actionLabel: '校验',
      fields: [
        { id: 'date', label: '待校验日期（YYYY-MM-DD，支持批量换行）', type: 'textarea', rows: 5, wide: true, mono: true, value: '2026-02-29\n2024-02-29\n2026-13-01\n2026-04-31' }
      ],
      hint: '校验格式、月份范围、当月天数与闰年规则；输入框支持一次校验多行。',
      run: function (v) {
        var lines = String(v.date || '').split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
        if (!lines.length) return { error: '请填写至少一个日期' };
        var rows = lines.map(function (line) {
          var match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(line);
          if (!match) return [line, '✗', '格式应为 YYYY-MM-DD'];
          var year = Number(match[1]);
          var month = Number(match[2]);
          var day = Number(match[3]);
          if (month < 1 || month > 12) return [line, '✗', '月份超出 1–12'];
          var leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
          var limits = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
          if (day < 1 || day > limits[month - 1]) return [line, '✗', year + ' 年 ' + month + ' 月只有 ' + limits[month - 1] + ' 天'];
          var date = new Date(year, month - 1, day);
          return [line, '✓', '星期' + WEEK[date.getDay()] + (leap && month === 2 && day === 29 ? '（闰年）' : '')];
        });
        return {
          html: K.table(['输入', '结果', '说明'], rows),
          note: '共 ' + lines.length + ' 条，合法 ' + rows.filter(function (row) { return row[1] === '✓'; }).length + ' 条'
        };
      }
    });
  }

  /* ------------------------------ 2. 时区时差 ------------------------------ */
  function renderTimezoneDiff(root) {
    K.form(root, {
      uid: 'tzdiff',
      actionLabel: '对照',
      fields: [
        { id: 'zoneA', label: '时区 A', type: 'select', value: 'Asia/Shanghai', options: [
          { value: 'Asia/Shanghai', label: 'Asia/Shanghai 北京' },
          { value: 'Asia/Tokyo', label: 'Asia/Tokyo 东京' },
          { value: 'Asia/Singapore', label: 'Asia/Singapore 新加坡' },
          { value: 'Europe/London', label: 'Europe/London 伦敦' },
          { value: 'Europe/Paris', label: 'Europe/Paris 巴黎' },
          { value: 'America/New_York', label: 'America/New_York 纽约' },
          { value: 'America/Los_Angeles', label: 'America/Los_Angeles 洛杉矶' },
          { value: 'Australia/Sydney', label: 'Australia/Sydney 悉尼' },
          { value: 'UTC', label: 'UTC 协调世界时' }
        ] },
        { id: 'zoneB', label: '时区 B', type: 'select', value: 'America/New_York', options: [
          { value: 'Asia/Shanghai', label: 'Asia/Shanghai 北京' },
          { value: 'Asia/Tokyo', label: 'Asia/Tokyo 东京' },
          { value: 'Asia/Singapore', label: 'Asia/Singapore 新加坡' },
          { value: 'Europe/London', label: 'Europe/London 伦敦' },
          { value: 'Europe/Paris', label: 'Europe/Paris 巴黎' },
          { value: 'America/New_York', label: 'America/New_York 纽约' },
          { value: 'America/Los_Angeles', label: 'America/Los_Angeles 洛杉矶' },
          { value: 'Australia/Sydney', label: 'Australia/Sydney 悉尼' },
          { value: 'UTC', label: 'UTC 协调世界时' }
        ] },
        { id: 'at', label: '对照时刻（留空为现在）', type: 'text', placeholder: '2026-01-01 09:00', wide: true }
      ],
      run: function (v) {
        var at = v.at ? parseDate(v.at) : new Date();
        if (!at) return { error: '对照时刻格式无法识别' };
        try {
          var offsetA = zoneOffsetMinutes(at, v.zoneA);
          var offsetB = zoneOffsetMinutes(at, v.zoneB);
          var formatter = function (zone) {
            return new Intl.DateTimeFormat('zh-CN', {
              timeZone: zone, hour12: false,
              year: 'numeric', month: '2-digit', day: '2-digit',
              hour: '2-digit', minute: '2-digit', weekday: 'short'
            }).format(at);
          };
          var diff = (offsetA - offsetB) / 60;
          return {
            rows: [
              { key: v.zoneA, value: formatter(v.zoneA) + '（' + offsetLabel(offsetA) + '）', mono: false },
              { key: v.zoneB, value: formatter(v.zoneB) + '（' + offsetLabel(offsetB) + '）', mono: false },
              { key: '时差', value: (diff > 0 ? 'A 比 B 快 ' : diff < 0 ? 'A 比 B 慢 ' : '两地同时') + Math.abs(diff) + ' 小时', mono: false },
              { key: 'UTC 时刻', value: at.toISOString().replace('T', ' ').slice(0, 19) }
            ],
            note: '已按当前日期自动处理夏令时'
          };
        } catch (error) {
          return { error: '时区计算失败：' + error.message };
        }
      }
    });
  }

  /* ------------------------------ 3. 时间戳多格式 ------------------------------ */
  function renderUnixMulti(root) {
    K.form(root, {
      uid: 'unixmulti',
      actionLabel: '转换',
      fields: [
        { id: 'ts', label: '时间戳 / 日期字符串', type: 'text', value: '', placeholder: '1700000000 或 2026-01-01 12:00:00', wide: true },
        { id: 'unit', label: '数字单位', type: 'select', value: 'auto', options: [
          { value: 'auto', label: '自动识别' },
          { value: 's', label: '秒' },
          { value: 'ms', label: '毫秒' }
        ] }
      ],
      hint: '留空则使用当前时间。自动识别规则：10 位以内按秒，13 位按毫秒。',
      run: function (v) {
        var input = String(v.ts || '').trim();
        var date;
        if (!input) {
          date = new Date();
        } else if (/^\d+$/.test(input)) {
          var unit = v.unit;
          if (unit === 'auto') unit = input.length > 10 ? 'ms' : 's';
          var num = Number(input);
          date = new Date(unit === 'ms' ? num : num * 1000);
        } else {
          date = parseDate(input);
        }
        if (!date || isNaN(date.getTime())) return { error: '无法识别的时间，请填 10 / 13 位数字或标准日期' };

        var iso = date.toISOString();
        return {
          rows: [
            { key: 'Unix 秒', value: Math.floor(date.getTime() / 1000) },
            { key: 'Unix 毫秒', value: date.getTime() },
            { key: 'ISO 8601', value: iso },
            { key: 'UTC', value: iso.replace('T', ' ').slice(0, 19) + ' UTC' },
            { key: '本地时间', value: date.toLocaleString('zh-CN', { hour12: false }) },
            { key: 'RFC 2822', value: date.toUTCString() },
            { key: '相对现在', value: (function () {
              var diff = Date.now() - date.getTime();
              var abs = Math.abs(diff);
              var unit = abs < 60000 ? '秒' : abs < 3600000 ? '分钟' : abs < DAY ? '小时' : '天';
              var value = abs < 60000 ? Math.round(abs / 1000) : abs < 3600000 ? Math.round(abs / 60000) : abs < DAY ? Math.round(abs / 3600000) : Math.round(abs / DAY);
              return diff >= 0 ? value + ' ' + unit + '前' : value + ' ' + unit + '后';
            })() }
          ],
          note: '本地时区：' + (Intl.DateTimeFormat().resolvedOptions().timeZone || '未知')
        };
      }
    });
  }

  /* ------------------------------ 4. 自定义日期格式化 ------------------------------ */
  function renderDateFormatCustom(root) {
    K.form(root, {
      uid: 'datefmt',
      actionLabel: '格式化',
      fields: [
        { id: 'date', label: '日期时间', type: 'text', value: '', placeholder: '留空为当前时间', wide: true },
        { id: 'pattern', label: '格式模板', type: 'text', value: 'YYYY-MM-DD HH:mm:ss', wide: true },
        { id: 'week', label: '星期前缀', type: 'select', value: '周', options: [
          { value: '周', label: '周（周三）' },
          { value: '星期', label: '星期（星期三）' },
          { value: '', label: '不显示' }
        ] }
      ],
      hint: '可用占位符：YYYY YY MM M DD D HH H mm m ss s SSS A a Q ddd EEE WW X x',
      sample: { date: '2026-11-08 19:50:00', pattern: 'YYYY年MM月DD日 HH:mm:ss ddd' },
      run: function (v) {
        var date = v.date ? parseDate(v.date) : new Date();
        if (!date) return { error: '日期格式无法识别' };
        var d = date;
        var map = {
          YYYY: String(d.getFullYear()),
          YY: String(d.getFullYear()).slice(-2),
          MM: pad(d.getMonth() + 1),
          M: String(d.getMonth() + 1),
          DD: pad(d.getDate()),
          D: String(d.getDate()),
          HH: pad(d.getHours()),
          H: String(d.getHours()),
          mm: pad(d.getMinutes()),
          m: String(d.getMinutes()),
          ss: pad(d.getSeconds()),
          s: String(d.getSeconds()),
          SSS: ('00' + d.getMilliseconds()).slice(-3),
          A: d.getHours() < 12 ? 'AM' : 'PM',
          a: d.getHours() < 12 ? 'am' : 'pm',
          Q: String(Math.floor(d.getMonth() / 3) + 1),
          ddd: v.week ? v.week + WEEK[d.getDay()] : WEEK[d.getDay()],
          EEE: WEEK[d.getDay()],
          WW: pad(isoWeek(d)),
          X: String(Math.floor(d.getTime() / 1000)),
          x: String(d.getTime())
        };
        var output = String(v.pattern || '').replace(/YYYY|YY|MM|M|DD|D|HH|H|mm|m|ss|s|SSS|A|a|Q|ddd|EEE|WW|X|x/g, function (token) {
          return map[token] === undefined ? token : map[token];
        });
        return {
          output: output,
          note: '基于本地时区格式化' + (v.date ? '' : '（使用当前时间）')
        };
      }
    });
  }

  /* ------------------------------ 5. 年积日 ------------------------------ */
  function renderDayOfYear(root) {
    K.form(root, {
      uid: 'dayofyear',
      actionLabel: '计算',
      fields: [
        { id: 'date', label: '日期', type: 'date', value: '' }
      ],
      hint: '年积日（Day of Year）常用于日志时间戳、农业与天文记录。',
      run: function (v) {
        var date = v.date ? parseDate(v.date) : new Date();
        if (!date) return { error: '请选择日期' };
        var start = new Date(date.getFullYear(), 0, 1);
        var doy = Math.floor((new Date(date.getFullYear(), date.getMonth(), date.getDate()) - start) / DAY) + 1;
        var total = ((date.getFullYear() % 4 === 0 && date.getFullYear() % 100 !== 0) || date.getFullYear() % 400 === 0) ? 366 : 365;
        return {
          rows: [
            { key: '年积日', value: doy + ' / ' + total },
            { key: '剩余天数', value: (total - doy) + ' 天' },
            { key: '年度进度', value: K.num(doy / total * 100, 1) + '%' },
            { key: 'ISO 周次', value: date.getFullYear() + '-W' + pad(isoWeek(date)) },
            { key: '季度', value: 'Q' + (Math.floor(date.getMonth() / 3) + 1) },
            { key: '第几天（含今天）', value: doy }
          ],
          note: date.getFullYear() + ' 年共 ' + total + ' 天'
        };
      }
    });
  }

  /* ------------------------------ 6. 工时计算 ------------------------------ */
  function renderWorkHours(root) {
    K.form(root, {
      uid: 'workhours',
      actionLabel: '计算工时',
      fields: [
        { id: 'start', label: '上班时间', type: 'time', value: '09:00' },
        { id: 'end', label: '下班时间', type: 'time', value: '18:30' },
        { id: 'breakMin', label: '午休 / 休息时长（分钟）', type: 'number', value: 60, min: 0, step: 5 },
        { id: 'standard', label: '标准工时（小时 / 天）', type: 'number', value: 8, min: 1, max: 24, step: 0.5 }
      ],
      hint: '跨零点（如 22:00 到次日 06:00）会自动按次日计算。',
      run: function (v) {
        function toMinutes(text) {
          var match = /^(\d{1,2}):(\d{2})$/.exec(String(text || ''));
          return match ? Number(match[1]) * 60 + Number(match[2]) : null;
        }
        var start = toMinutes(v.start);
        var end = toMinutes(v.end);
        var rest = Math.max(0, Number(v.breakMin) || 0);
        var standard = Number(v.standard) || 8;
        if (start === null || end === null) return { error: '时间格式应为 HH:mm' };
        var span = end - start;
        if (span < 0) span += 1440;
        if (span === 0) return { error: '上下班时间不能相同' };
        var worked = span - rest;
        if (worked < 0) return { error: '休息时长超过了在岗时长' };
        var overtime = worked / 60 - standard;
        return {
          rows: [
            { key: '在岗时长', value: Math.floor(span / 60) + ' 小时 ' + (span % 60) + ' 分钟' },
            { key: '有效工时', value: Math.floor(worked / 60) + ' 小时 ' + (worked % 60) + ' 分钟' },
            { key: '折合小时', value: K.num(worked / 60, 2) + ' h' },
            { key: '标准工时差', value: (overtime >= 0 ? '多 ' : '少 ') + K.num(Math.abs(overtime), 2) + ' 小时', mono: false },
            { key: '按月（21.75 天）', value: K.num(worked / 60 * 21.75, 1) + ' 小时' },
            { key: '是否跨天', value: end < start ? '是（次日）' : '否', mono: false }
          ],
          note: '未扣除法定节假日与调休，仅按输入的上下班时间计算'
        };
      }
    });
  }

  /* ------------------------------ 7. 时间戳单位互转 ------------------------------ */
  function renderTimestampUnits(root) {
    K.form(root, {
      uid: 'tsunits',
      actionLabel: '换算',
      fields: [
        { id: 'value', label: '数值', type: 'text', value: '1700000000', wide: true },
        { id: 'unit', label: '当前单位', type: 'select', value: 's', options: [
          { value: 's', label: '秒' },
          { value: 'ms', label: '毫秒' },
          { value: 'us', label: '微秒' },
          { value: 'ns', label: '纳秒' }
        ] }
      ],
      run: function (v) {
        var num = Number(v.value);
        if (!isFinite(num)) return { error: '请输入数字' };
        var toSeconds = { s: 1, ms: 1e3, us: 1e6, ns: 1e9 }[v.unit];
        var seconds = num / toSeconds;
        var date = new Date(seconds * 1000);
        return {
          rows: [
            { key: '秒', value: K.num(seconds, 9) },
            { key: '毫秒', value: K.num(seconds * 1e3, 6) },
            { key: '微秒', value: K.num(seconds * 1e6, 3) },
            { key: '纳秒', value: K.num(seconds * 1e9, 0) },
            { key: '对应时间', value: isFinite(date.getTime()) ? date.toLocaleString('zh-CN', { hour12: false }) : '超出可表示范围', mono: false }
          ],
          note: '超过 2^53 的整数会损失精度，纳秒级建议用字符串处理'
        };
      }
    });
  }

  /* ------------------------------ 8. 日期智能解析 ------------------------------ */
  function renderDateParse(root) {
    K.form(root, {
      uid: 'dateparse',
      actionLabel: '解析',
      fields: [
        { id: 'input', label: '任意日期文本', type: 'text', value: '', placeholder: '2026-11-08 / 2026.11.08 / Nov 8, 2026', wide: true }
      ],
      sample: { input: '2026/11/8 19:50' },
      run: function (v) {
        var text = String(v.input || '').trim();
        if (!text) return { error: '请输入日期文本' };
        var date = parseDate(text);
        if (!date) {
          var now = new Date();
          return {
            rows: [
              { key: '解析结果', value: '当前时间（无法识别输入）', mono: false },
              { key: '当前本地时间', value: now.toLocaleString('zh-CN', { hour12: false }) }
            ],
            type: 'warn',
            note: '支持的格式：YYYY-MM-DD、YYYY/MM/DD、YYYY.MM.DD、ISO 8601、英文月份'
          };
        }
        return {
          rows: [
            { key: '识别时间', value: date.toLocaleString('zh-CN', { hour12: false }), mono: false },
            { key: 'ISO', value: date.toISOString() },
            { key: 'Unix 秒', value: Math.floor(date.getTime() / 1000) },
            { key: '星期', value: '星期' + WEEK[date.getDay()], mono: false },
            { key: '是否闰年', value: ((date.getFullYear() % 4 === 0 && date.getFullYear() % 100 !== 0) || date.getFullYear() % 400 === 0) ? '是' : '否', mono: false }
          ]
        };
      }
    });
  }

  /* ------------------------------ 9. 两日期精确差值 ------------------------------ */
  function renderDateDiffExact(root) {
    K.form(root, {
      uid: 'datediffexact',
      actionLabel: '计算差值',
      fields: [
        { id: 'from', label: '开始日期', type: 'date', value: '' },
        { id: 'to', label: '结束日期', type: 'date', value: '' }
      ],
      hint: '同时给出「年月日」差值与「总天数」差值，工作日按周一至周五统计（不含法定节假日）。',
      run: function (v) {
        var from = v.from ? parseDate(v.from) : null;
        var to = v.to ? parseDate(v.to) : null;
        if (!from || !to) return { error: '请填写开始与结束日期' };
        var sign = to < from ? -1 : 1;
        var a = sign > 0 ? from : to;
        var b = sign > 0 ? from : to;
        var start = sign > 0 ? from : to;
        var end = sign > 0 ? to : from;

        var years = end.getFullYear() - start.getFullYear();
        var months = end.getMonth() - start.getMonth();
        var days = end.getDate() - start.getDate();
        if (days < 0) {
          months -= 1;
          days += new Date(end.getFullYear(), end.getMonth(), 0).getDate();
        }
        if (months < 0) {
          years -= 1;
          months += 12;
        }

        var totalDays = Math.round((end - start) / DAY);
        var workdays = 0;
        var cursor = new Date(start.getTime());
        for (var i = 0; i < totalDays; i += 1) {
          cursor.setDate(cursor.getDate() + 1);
          var weekday = cursor.getDay();
          if (weekday !== 0 && weekday !== 6) workdays += 1;
        }

        return {
          rows: [
            { key: '差值', value: years + ' 年 ' + months + ' 个月 ' + days + ' 天' },
            { key: '总天数', value: K.group(totalDays) + ' 天' },
            { key: '总周数', value: K.num(totalDays / 7, 2) },
            { key: '工作日', value: workdays + ' 天' },
            { key: '周末天数', value: (totalDays - workdays) + ' 天' },
            { key: '总小时', value: K.group(totalDays * 24) + ' 小时' }
          ],
          note: (sign < 0 ? '结束日期早于开始日期，已按绝对值计算。' : '') + '工作日未扣除法定节假日'
        };
      }
    });
  }

  /* ------------------------------ 10. 星期与周次 ------------------------------ */
  function renderWeekdayInfo(root) {
    K.form(root, {
      uid: 'weekdayinfo',
      actionLabel: '查询',
      fields: [
        { id: 'date', label: '日期', type: 'date', value: '' }
      ],
      sample: { date: '2026-01-01' },
      run: function (v) {
        var date = v.date ? parseDate(v.date) : new Date();
        if (!date) return { error: '请选择日期' };
        var week = isoWeek(date);
        var monday = new Date(date.getTime());
        monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
        var sunday = new Date(monday.getTime());
        sunday.setDate(monday.getDate() + 6);
        return {
          rows: [
            { key: '星期', value: '星期' + WEEK[date.getDay()], mono: false },
            { key: '是否周末', value: date.getDay() === 0 || date.getDay() === 6 ? '是' : '否', mono: false },
            { key: 'ISO 周次', value: date.getFullYear() + '-W' + pad(week) },
            { key: '本周一', value: monday.getFullYear() + '-' + pad(monday.getMonth() + 1) + '-' + pad(monday.getDate()) },
            { key: '本周日', value: sunday.getFullYear() + '-' + pad(sunday.getMonth() + 1) + '-' + pad(sunday.getDate()) },
            { key: '距周一', value: ((date.getDay() + 6) % 7) + ' 天' },
            { key: '距周末', value: ((6 - date.getDay() + 7) % 7) + ' 天' }
          ]
        };
      }
    });
  }

  /* ------------------------------ 11. 时间段重叠 ------------------------------ */
  function renderRangeOverlap(root) {
    K.form(root, {
      uid: 'rangeoverlap',
      actionLabel: '判断',
      fields: [
        { id: 'a1', label: '区间 A 开始', type: 'text', value: '09:00', placeholder: '09:00 或 2026-01-01 09:00' },
        { id: 'a2', label: '区间 A 结束', type: 'text', value: '12:00', placeholder: '12:00' },
        { id: 'b1', label: '区间 B 开始', type: 'text', value: '11:30', placeholder: '11:30' },
        { id: 'b2', label: '区间 B 结束', type: 'text', value: '13:00', placeholder: '13:00' }
      ],
      hint: '纯时间（HH:mm）按同一天比较；带日期的完整时间按绝对时刻比较。',
      run: function (v) {
        function toMinutes(text) {
          var value = String(text || '').trim();
          var clock = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value);
          if (clock) return Number(clock[1]) * 60 + Number(clock[2]) + Number(clock[3] || 0) / 60;
          var date = parseDate(value);
          return date ? date.getTime() / 60000 : null;
        }
        var a1 = toMinutes(v.a1);
        var a2 = toMinutes(v.a2);
        var b1 = toMinutes(v.b1);
        var b2 = toMinutes(v.b2);
        if (a1 === null || a2 === null || b1 === null || b2 === null) return { error: '时间格式无法识别，请用 09:00 或完整日期时间' };
        if (a2 <= a1 || b2 <= b1) return { error: '每个区间的结束时间必须晚于开始时间' };

        var start = Math.max(a1, b1);
        var end = Math.min(a2, b2);
        var overlap = end - start;
        function fmt(minutes) {
          var h = Math.floor(minutes / 60);
          var m = Math.round(minutes % 60);
          return h + ' 小时 ' + m + ' 分钟';
        }
        return {
          rows: [
            { key: '是否重叠', value: overlap > 0 ? '是' : '否', mono: false },
            { key: '重叠时长', value: overlap > 0 ? fmt(overlap) : '0' },
            { key: '重叠起点', value: overlap > 0 ? new Date(start * 60000).toLocaleString('zh-CN', { hour12: false }) : '—', mono: false },
            { key: '区间 A 时长', value: fmt(a2 - a1) },
            { key: '区间 B 时长', value: fmt(b2 - b1) }
          ],
          note: '端点相接（如 10:00 结束、10:00 开始）视为不重叠'
        };
      }
    });
  }

  /* ------------------------------ 12. 月相 ------------------------------ */
  function renderMoonPhase(root) {
    K.form(root, {
      uid: 'moonphase',
      actionLabel: '计算月相',
      fields: [
        { id: 'date', label: '日期（留空为今天）', type: 'date', value: '' }
      ],
      hint: '以 2000-01-06 18:14 UTC 的新月为基准，按 29.530588853 天的朔望月周期推算，误差约 ±1 天。',
      run: function (v) {
        var date = v.date ? parseDate(v.date) : new Date();
        if (!date) return { error: '日期无效' };
        var synodic = 29.530588853;
        var knownNewMoon = Date.UTC(2000, 0, 6, 18, 14) / DAY;
        var current = date.getTime() / DAY;
        var age = ((current - knownNewMoon) % synodic + synodic) % synodic;
        var names = ['新月', '蛾眉月', '上弦月', '盈凸月', '满月', '亏凸月', '下弦月', '残月'];
        var index = Math.floor((age / synodic) * 8) % 8;
        var illumination = (1 - Math.cos(2 * Math.PI * age / synodic)) / 2;
        return {
          rows: [
            { key: '月相', value: names[index], mono: false },
            { key: '月龄', value: K.num(age, 2) + ' 天' },
            { key: '照亮比例', value: K.num(illumination * 100, 1) + '%' },
            { key: '下次满月约', value: (function () {
              var toFull = ((synodic * 0.5 - age) % synodic + synodic) % synodic;
              var next = new Date(date.getTime() + toFull * DAY);
              return next.getFullYear() + '-' + pad(next.getMonth() + 1) + '-' + pad(next.getDate());
            })() },
            { key: '下次新月约', value: (function () {
              var toNew = ((synodic - age) % synodic + synodic) % synodic;
              var next = new Date(date.getTime() + toNew * DAY);
              return next.getFullYear() + '-' + pad(next.getMonth() + 1) + '-' + pad(next.getDate());
            })() }
          ],
          note: '月相为天文近似值，民俗节日请以官方历法为准'
        };
      }
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['date-valid'] = renderDateValid;
  window.ToolModules['timezone-diff'] = renderTimezoneDiff;
  window.ToolModules['unix-multi'] = renderUnixMulti;
  window.ToolModules['date-format-custom'] = renderDateFormatCustom;
  window.ToolModules['day-of-year'] = renderDayOfYear;
  window.ToolModules['work-hours'] = renderWorkHours;
  window.ToolModules['timestamp-units'] = renderTimestampUnits;
  window.ToolModules['date-parse'] = renderDateParse;
  window.ToolModules['date-diff-exact'] = renderDateDiffExact;
  window.ToolModules['weekday-info'] = renderWeekdayInfo;
  window.ToolModules['range-overlap'] = renderRangeOverlap;
  window.ToolModules['moon-phase'] = renderMoonPhase;
})();
