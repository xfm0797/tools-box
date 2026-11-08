/* =============================================================================
 * 时间日期工具包 · 第五批（12 个）
 * -----------------------------------------------------------------------------
 * iso-duration      ISO 8601 时长解析与生成
 * rfc-date          RFC 2822 / RFC 3339 日期
 * date-sort         日期批量排序
 * date-weekday-tag  批量标注星期与周次
 * time-round        时间取整（计费用）
 * week-parity       单双周判断
 * date-en-ordinal   英文序数日期
 * time-ago          相对时间描述
 * date-bucket       日期分组统计
 * time-12-24        12 / 24 小时制转换
 * date-extremes     最早、最晚与跨度
 * meeting-planner   跨时区会议时间
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;

  var WEEK_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  var MONTH_EN = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  function p2(value) {
    return ('0' + value).slice(-2);
  }

  /** 解析常见日期写法，返回 Date（本地时间）或 null */
  function parseDate(text) {
    var raw = String(text || '').trim();
    if (!raw) return null;
    var m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T ]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/.exec(raw);
    if (m) {
      var date = new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
      if (date.getFullYear() === +m[1] && date.getMonth() === +m[2] - 1 && date.getDate() === +m[3]) return date;
      return null;
    }
    var fallback = new Date(raw);
    return isNaN(fallback.getTime()) ? null : fallback;
  }

  function isoWeek(date) {
    var target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    var day = (target.getDay() + 6) % 7;
    target.setDate(target.getDate() - day + 3);
    var firstThursday = new Date(target.getFullYear(), 0, 4);
    var firstDay = (firstThursday.getDay() + 6) % 7;
    firstThursday.setDate(firstThursday.getDate() - firstDay + 3);
    return 1 + Math.round((target - firstThursday) / 604800000);
  }

  /* ------------------------------ 1. ISO 8601 时长 ------------------------------ */
  var ISO_UNITS = [
    { key: 'y', label: '年', ms: 31536000000 },
    { key: 'mo', label: '月', ms: 2592000000 },
    { key: 'd', label: '天', ms: 86400000 },
    { key: 'h', label: '小时', ms: 3600000 },
    { key: 'mi', label: '分钟', ms: 60000 },
    { key: 's', label: '秒', ms: 1000 }
  ];

  function renderIsoDuration(root) {
    K.text(root, {
      uid: 'isodur',
      inputLabel: '输入内容',
      inputRows: 4,
      actionLabel: '转换',
      options: [
        { id: 'mode', label: '方向', type: 'select', value: 'parse', options: [
          { value: 'parse', label: '解析 PnYnMnDTnHnMnS' },
          { value: 'build', label: '秒数 → ISO 时长' }
        ] }
      ],
      hint: 'ISO 8601 时长以 P 开头，日期部分与时间部分用 T 分隔：P1Y2M3DT4H5M6S。注意 M 在 T 之前是月、之后是分钟。',
      sample: 'P1Y2M3DT4H5M6S',
      run: function (text, opt) {
        if (opt.mode === 'build') {
          var total = parseFloat(text.replace(/[^0-9.]/g, ''));
          if (!isFinite(total)) return { error: '请输入秒数，如 90061' };
          var rest = Math.floor(total);
          var out = 'P';
          var days = Math.floor(rest / 86400);
          rest -= days * 86400;
          var hours = Math.floor(rest / 3600);
          rest -= hours * 3600;
          var minutes = Math.floor(rest / 60);
          var seconds = rest - minutes * 60;
          if (days) out += days + 'D';
          if (hours || minutes || seconds) {
            out += 'T';
            if (hours) out += hours + 'H';
            if (minutes) out += minutes + 'M';
            if (seconds) out += seconds + 'S';
          }
          if (out === 'P') out = 'PT0S';
          return { output: out, note: '共 ' + total + ' 秒' };
        }
        var src = text.trim().toUpperCase().replace(/\s+/g, '');
        var m = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?)?$/.exec(src);
        if (!m || src === 'P') return { error: '格式不合法，示例：P1Y2M3DT4H5M6S' };
        var years = +(m[1] || 0);
        var months = +(m[2] || 0);
        var weeks = +(m[3] || 0);
        var days = +(m[4] || 0);
        var hours = +(m[5] || 0);
        var minutes = +(m[6] || 0);
        var seconds = +(m[7] || 0);
        var ms = years * ISO_UNITS[0].ms + months * ISO_UNITS[1].ms +
          (weeks * 7 + days) * 86400000 + hours * 3600000 + minutes * 60000 + seconds * 1000;
        var rows = [
          { key: '年', value: years, mono: false },
          { key: '月', value: months, mono: false },
          { key: '周', value: weeks, mono: false },
          { key: '天', value: days, mono: false },
          { key: '小时', value: hours, mono: false },
          { key: '分钟', value: minutes, mono: false },
          { key: '秒', value: K.num(seconds, 3), mono: false },
          { key: '合计（按 365 天/年、30 天/月估算）', value: K.num(ms / 86400000, 3) + ' 天 / ' + K.num(ms / 3600000, 2) + ' 小时', mono: false }
        ];
        return { output: src, note: '已解析为各字段', html: K.kv(rows) };
      }
    });
  }

  /* ------------------------------ 2. RFC 日期 ------------------------------ */
  var DAY_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function rfc2822(date) {
    var offset = -date.getTimezoneOffset();
    var sign = offset >= 0 ? '+' : '-';
    var abs = Math.abs(offset);
    return DAY_EN[date.getDay()] + ', ' + p2(date.getDate()) + ' ' + MONTH_EN[date.getMonth()].slice(0, 3) + ' ' +
      date.getFullYear() + ' ' + p2(date.getHours()) + ':' + p2(date.getMinutes()) + ':' + p2(date.getSeconds()) +
      ' ' + sign + p2(Math.floor(abs / 60)) + p2(abs % 60);
  }

  function renderRfcDate(root) {
    K.text(root, {
      uid: 'rfcdate',
      inputLabel: '日期时间（如 2026-01-18 09:30，留空用当前时间）',
      inputRows: 3,
      actionLabel: '生成',
      allowEmpty: true,
      hideOutput: true,
      hint: '邮件头 Date 用 RFC 2822，OpenAPI 与 Atom 用 RFC 3339。两者都是「星期 + 日期 + 时间 + 时区偏移」的组合，只是分隔符不同。',
      sample: '2026-01-18 09:30:00',
      run: function (text) {
        var date = text.trim() ? parseDate(text) : new Date();
        if (!date) return { error: '无法识别该日期，请用 2026-01-18 09:30 这种写法' };
        var offset = -date.getTimezoneOffset();
        var sign = offset >= 0 ? '+' : '-';
        var abs = Math.abs(offset);
        var zone = sign + p2(Math.floor(abs / 60)) + ':' + p2(abs % 60);
        var rows = [
          { key: 'RFC 2822（邮件）', value: rfc2822(date) },
          { key: 'RFC 3339（API）', value: date.getFullYear() + '-' + p2(date.getMonth() + 1) + '-' + p2(date.getDate()) +
            'T' + p2(date.getHours()) + ':' + p2(date.getMinutes()) + ':' + p2(date.getSeconds()) + zone },
          { key: 'ISO 8601 UTC', value: date.toISOString() },
          { key: 'HTTP Date', value: DAY_EN[date.getDay()] + ', ' + p2(date.getDate()) + ' ' +
            MONTH_EN[date.getMonth()].slice(0, 3) + ' ' + date.getFullYear() + ' ' +
            p2(date.getUTCHours()) + ':' + p2(date.getUTCMinutes()) + ':' + p2(date.getUTCSeconds()) + ' GMT' }
        ];
        return { html: K.kv(rows), output: '', note: '本机时区偏移 ' + zone };
      }
    });
  }

  /* ------------------------------ 3. 日期排序 ------------------------------ */
  function renderDateSort(root) {
    K.text(root, {
      uid: 'datesort',
      inputLabel: '每行一个日期',
      inputRows: 9,
      actionLabel: '排序',
      options: [
        { id: 'desc', label: '倒序', type: 'checkbox', value: false },
        { id: 'normalize', label: '统一输出为 YYYY-MM-DD', type: 'checkbox', value: true },
        { id: 'withTime', label: '保留时间部分', type: 'checkbox', value: false }
      ],
      hint: '支持 2026-01-18、2026/1/18、2026.01.18、2026-01-18 09:30 等写法；无法识别的行会原样保留在末尾。',
      sample: '2026-03-05\n2025/12/31\n2026.1.18\n2026-01-18 09:30',
      run: function (text, opt) {
        var lines = text.split(/\r?\n/).filter(function (line) { return line.trim() !== ''; });
        var ok = [];
        var bad = [];
        lines.forEach(function (line) {
          var date = parseDate(line);
          if (date) ok.push({ date: date, raw: line.trim() });
          else bad.push(line.trim());
        });
        ok.sort(function (a, b) { return a.date - b.date; });
        if (opt.desc) ok.reverse();
        var out = ok.map(function (item) {
          if (!opt.normalize) return item.raw;
          var base = item.date.getFullYear() + '-' + p2(item.date.getMonth() + 1) + '-' + p2(item.date.getDate());
          return opt.withTime ? base + ' ' + p2(item.date.getHours()) + ':' + p2(item.date.getMinutes()) : base;
        }).concat(bad);
        return {
          output: out.join('\n'),
          note: '有效 ' + ok.length + ' 条' + (bad.length ? '，无法识别 ' + bad.length + ' 条（已放在末尾）' : '')
        };
      }
    });
  }

  /* ------------------------------ 4. 批量标注星期 ------------------------------ */
  function renderWeekdayTag(root) {
    K.text(root, {
      uid: 'wdtag',
      inputLabel: '每行一个日期',
      inputRows: 9,
      actionLabel: '标注',
      options: [
        { id: 'style', label: '格式', type: 'select', value: 'suffix', options: [
          { value: 'suffix', label: '日期后追加星期与周次' },
          { value: 'start', label: '星期放在前面' },
          { value: 'iso', label: 'ISO 周格式：2026-W03-7' }
        ] },
        { id: 'weekend', label: '标记周末', type: 'checkbox', value: true }
      ],
      hint: '周次采用 ISO 8601：周一为一周第一天，第 1 周是包含 1 月 4 日的那一周。做排班、对账时比「第几周」的土办法可靠。',
      sample: '2026-01-01\n2026-01-05\n2026-02-17\n2026-10-01',
      run: function (text, opt) {
        var out = [];
        var weekend = 0;
        text.split(/\r?\n/).forEach(function (line) {
          if (!line.trim()) return;
          var date = parseDate(line);
          if (!date) {
            out.push(line + '  ← 无法识别');
            return;
          }
          var week = isoWeek(date);
          var day = date.getDay();
          var isWeekend = day === 0 || day === 6;
          if (isWeekend) weekend += 1;
          var flag = opt.weekend && isWeekend ? ' ●休息' : '';
          var base = date.getFullYear() + '-' + p2(date.getMonth() + 1) + '-' + p2(date.getDate());
          if (opt.style === 'iso') {
            out.push(base + '  ' + date.getFullYear() + '-W' + p2(week) + '-' + (day === 0 ? 7 : day) + flag);
          } else if (opt.style === 'start') {
            out.push(WEEK_CN[day] + '  ' + base + '（第 ' + week + ' 周）' + flag);
          } else {
            out.push(base + '  ' + WEEK_CN[day] + '（第 ' + week + ' 周）' + flag);
          }
        });
        return {
          output: out.join('\n'),
          note: '共 ' + out.length + ' 行，其中周末 ' + weekend + ' 天'
        };
      }
    });
  }

  /* ------------------------------ 5. 时间取整 ------------------------------ */
  function renderTimeRound(root) {
    K.form(root, {
      uid: 'timeround',
      fields: [
        { id: 'time', label: '时间', type: 'text', value: '09:47', placeholder: 'HH:mm' },
        { id: 'step', label: '步长（分钟）', type: 'select', value: '15', options: [
          { value: '5', label: '5 分钟' },
          { value: '6', label: '6 分钟（0.1 小时）' },
          { value: '10', label: '10 分钟' },
          { value: '15', label: '15 分钟' },
          { value: '30', label: '30 分钟' },
          { value: '60', label: '1 小时' }
        ] },
        { id: 'mode', label: '方式', type: 'select', value: 'round', options: [
          { value: 'round', label: '四舍五入' },
          { value: 'ceil', label: '向上取整（多计）' },
          { value: 'floor', label: '向下取整（少计）' }
        ] },
        { id: 'bill', label: '计费单价（元 / 小时）', type: 'number', value: 0, min: 0, step: 0.01 }
      ],
      actionLabel: '取整',
      hint: '律师、咨询与 freelancer 计费常按 6 分钟（0.1 小时）或 15 分钟取整；向上取整对服务方有利，向下对客户有利。',
      sample: { time: '09:47', step: '15', mode: 'ceil', bill: 600 },
      run: function (values) {
        var m = /^(\d{1,2}):(\d{1,2})$/.exec(String(values.time || '').trim());
        if (!m) return { error: '时间格式应为 HH:mm，例如 09:47' };
        var hour = +m[1];
        var minute = +m[2];
        if (hour > 23 || minute > 59) return { error: '小时需 ≤ 23，分钟需 ≤ 59' };
        var step = parseInt(values.step, 10) || 15;
        var total = hour * 60 + minute;
        var target;
        if (values.mode === 'ceil') target = Math.ceil(total / step) * step;
        else if (values.mode === 'floor') target = Math.floor(total / step) * step;
        else target = Math.round(total / step) * step;
        var outHour = Math.floor(target / 60) % 24;
        var outMinute = target % 60;
        var delta = target - total;
        var rows = [
          { key: '原始时间', value: p2(hour) + ':' + p2(minute), mono: false },
          { key: '取整后', value: p2(outHour) + ':' + p2(outMinute) + (target >= 1440 ? '（次日）' : ''), mono: false },
          { key: '调整量', value: (delta >= 0 ? '+' : '') + delta + ' 分钟', mono: false }
        ];
        var price = parseFloat(values.bill);
        if (price > 0) {
          var original = price * (total / 60);
          var rounded = price * (target / 60);
          rows.push({ key: '计费时长', value: K.num(total / 60, 2) + ' 小时 → ' + K.num(target / 60, 2) + ' 小时', mono: false });
          rows.push({ key: '金额', value: '¥' + K.num(original, 2) + ' → ¥' + K.num(rounded, 2) + '（差 ¥' + K.num(rounded - original, 2) + '）', mono: false });
        }
        return { rows: rows };
      }
    });
  }

  /* ------------------------------ 6. 单双周 ------------------------------ */
  function renderWeekParity(root) {
    K.form(root, {
      uid: 'weekparity',
      fields: [
        { id: 'date', label: '日期', type: 'date' },
        { id: 'base', label: '基准周的周一', type: 'date', value: '2026-01-05' },
        { id: 'labelOdd', label: '单周叫法', type: 'text', value: '单周' },
        { id: 'labelEven', label: '双周叫法', type: 'text', value: '双周' }
      ],
      actionLabel: '判断',
      hint: '国内排班常按「单双周」轮换：有的以自然周序号（ISO）为准，有的以某个基准周往后推算。这里提供后者，避免跨年时错位。',
      sample: { date: '2026-01-19', base: '2026-01-05', labelOdd: '单周', labelEven: '双周' },
      run: function (values) {
        var date = parseDate(values.date) || new Date();
        var base = parseDate(values.base);
        if (!base) return { error: '基准日期无法识别' };
        var baseMonday = new Date(base.getFullYear(), base.getMonth(), base.getDate());
        baseMonday.setDate(baseMonday.getDate() - ((baseMonday.getDay() + 6) % 7));
        var target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        var weekDiff = Math.floor((target - baseMonday) / 604800000);
        var isOdd = ((weekDiff % 2) + 2) % 2 === 0;
        return {
          rows: [
            { key: '日期', value: target.getFullYear() + '-' + p2(target.getMonth() + 1) + '-' + p2(target.getDate()) + ' ' + WEEK_CN[target.getDay()], mono: false },
            { key: '基准周', value: baseMonday.getFullYear() + '-' + p2(baseMonday.getMonth() + 1) + '-' + p2(baseMonday.getDate()) + '（周一）', mono: false },
            { key: '相隔周数', value: weekDiff + ' 周', mono: false },
            { key: '轮换结果', value: isOdd ? (values.labelOdd || '单周') : (values.labelEven || '双周'), mono: false },
            { key: 'ISO 周次', value: target.getFullYear() + '-W' + p2(isoWeek(target)), mono: false }
          ]
        };
      }
    });
  }

  /* ------------------------------ 7. 英文序数日期 ------------------------------ */
  function ordinalSuffix(day) {
    if (day >= 11 && day <= 13) return 'th';
    if (day % 10 === 1) return 'st';
    if (day % 10 === 2) return 'nd';
    if (day % 10 === 3) return 'rd';
    return 'th';
  }

  function renderEnOrdinal(root) {
    K.text(root, {
      uid: 'enordinal',
      inputLabel: '日期（如 2026-01-01）',
      inputRows: 3,
      actionLabel: '转换',
      hideOutput: true,
      options: [
        { id: 'weekday', label: '包含星期', type: 'checkbox', value: false }
      ],
      hint: '英文日期序数后缀只有 1st / 2nd / 3rd / th 四种，14 号之后回到 th；英式写法日在前，美式写法月在前。',
      sample: '2026-01-01',
      run: function (text, opt) {
        var date = parseDate(text) || new Date();
        var day = date.getDate();
        var month = MONTH_EN[date.getMonth()];
        var suffix = ordinalSuffix(day);
        var prefix = opt.weekday ? WEEK_CN[date.getDay()].replace('周', '星期') : '';
        var weekdayEn = DAY_EN[date.getDay()];
        var rows = [
          { key: '美式（月 日, 年）', value: month + ' ' + day + suffix + ', ' + date.getFullYear() + (opt.weekday ? ' (' + weekdayEn + ')' : '') },
          { key: '英式（日 月 年）', value: day + suffix + ' ' + month + ' ' + date.getFullYear() + (opt.weekday ? ' (' + weekdayEn + ')' : '') },
          { key: '缩写', value: weekdayEn + ', ' + MONTH_EN[date.getMonth()].slice(0, 3) + ' ' + day + suffix + ' ' + date.getFullYear() },
          { key: '纯数字', value: date.getFullYear() + '-' + p2(date.getMonth() + 1) + '-' + p2(day) },
          { key: '中文', value: date.getFullYear() + ' 年 ' + (date.getMonth() + 1) + ' 月 ' + day + ' 日 ' + (prefix || WEEK_CN[date.getDay()]), mono: false }
        ];
        return { html: K.kv(rows), output: '', note: '已生成 5 种写法' };
      }
    });
  }

  /* ------------------------------ 8. 相对时间 ------------------------------ */
  var AGO_UNITS = [
    { label: '年', ms: 31536000000 },
    { label: '个月', ms: 2592000000 },
    { label: '天', ms: 86400000 },
    { label: '小时', ms: 3600000 },
    { label: '分钟', ms: 60000 },
    { label: '秒', ms: 1000 }
  ];

  function humanAgo(diffMs) {
    var abs = Math.abs(diffMs);
    if (abs < 10000) return '刚刚';
    for (var i = 0; i < AGO_UNITS.length; i += 1) {
      var unit = AGO_UNITS[i];
      if (abs >= unit.ms) {
        var value = Math.floor(abs / unit.ms);
        return value + ' ' + unit.label + (diffMs > 0 ? '后' : '前');
      }
    }
    return '刚刚';
  }

  function renderTimeAgo(root) {
    K.text(root, {
      uid: 'timeago',
      inputLabel: '目标时间（如 2025-06-01 12:00，留空用当前时间）',
      inputRows: 3,
      actionLabel: '计算',
      allowEmpty: true,
      hideOutput: true,
      hint: '用于文章发布时间、消息时间戳的友好显示。按 365 天/年、30 天/月估算，和大多数前端库（如 timeago.js）口径一致。',
      sample: '2025-06-01 12:00',
      run: function (text) {
        var target = text.trim() ? parseDate(text) : new Date();
        if (!target) return { error: '无法识别该时间，请用 2026-01-18 09:30 这种写法' };
        var now = new Date();
        var diff = now - target;
        var rows = [
          { key: '相对现在', value: humanAgo(diff), mono: false },
          { key: '详细差值', value: (diff >= 0 ? '已过去 ' : '还有 ') + K.num(Math.abs(diff) / 86400000, 2) + ' 天', mono: false },
          { key: '小时', value: K.num(Math.abs(diff) / 3600000, 1) + ' 小时', mono: false },
          { key: '秒级时间戳', value: Math.floor(target.getTime() / 1000) },
          { key: '毫秒时间戳', value: target.getTime() }
        ];
        var milestones = [1, 7, 30, 100, 365].map(function (days) {
          var at = new Date(target.getTime() + days * 86400000);
          return days + ' 天：' + at.getFullYear() + '-' + p2(at.getMonth() + 1) + '-' + p2(at.getDate()) + ' ' + p2(at.getHours()) + ':' + p2(at.getMinutes());
        }).join('  ');
        rows.push({ key: '里程碑', value: milestones, mono: false });
        return { html: K.kv(rows), output: '', note: '以本机当前时间 ' + p2(now.getHours()) + ':' + p2(now.getMinutes()) + ' 为基准' };
      }
    });
  }

  /* ------------------------------ 9. 日期分组统计 ------------------------------ */
  function renderDateBucket(root) {
    K.text(root, {
      uid: 'datebucket',
      inputLabel: '每行一个日期（可带时间）',
      inputRows: 9,
      actionLabel: '统计',
      hideOutput: true,
      options: [
        { id: 'by', label: '分组粒度', type: 'select', value: 'month', options: [
          { value: 'year', label: '按年' },
          { value: 'quarter', label: '按季度' },
          { value: 'month', label: '按月' },
          { value: 'week', label: '按 ISO 周' },
          { value: 'weekday', label: '按星期' }
        ] },
        { id: 'chart', label: '显示占比条', type: 'checkbox', value: true }
      ],
      hint: '把导出的订单日期、日志日期粘贴进来，一眼看出记录集中在哪些月份 —— 用于对账、排期复盘都很省事。',
      sample: '2026-01-03\n2026-01-19\n2026-02-02\n2026-02-28\n2026-03-11\n2026-03-12\n2026-03-30',
      run: function (text, opt) {
        var buckets = {};
        var order = [];
        var invalid = 0;
        text.split(/\r?\n/).forEach(function (line) {
          if (!line.trim()) return;
          var date = parseDate(line);
          if (!date) { invalid += 1; return; }
          var key;
          if (opt.by === 'year') key = date.getFullYear() + ' 年';
          else if (opt.by === 'quarter') key = date.getFullYear() + ' Q' + (Math.floor(date.getMonth() / 3) + 1);
          else if (opt.by === 'month') key = date.getFullYear() + '-' + p2(date.getMonth() + 1);
          else if (opt.by === 'week') key = date.getFullYear() + '-W' + p2(isoWeek(date));
          else key = WEEK_CN[date.getDay()];
          if (!buckets[key]) { buckets[key] = 0; order.push(key); }
          buckets[key] += 1;
        });
        if (!order.length) return { error: '没有可识别的日期' };
        var total = order.reduce(function (sum, key) { return sum + buckets[key]; }, 0);
        var rows = order.map(function (key) {
          var count = buckets[key];
          var percent = (count / total) * 100;
          var cell = opt.chart
            ? '<span class="bar-cell"><span style="width:' + percent.toFixed(1) + '%"></span></span>'
            : String(count);
          return [key, { html: cell }, percent.toFixed(1) + '%'];
        });
        return {
          html: K.table(['分组', '数量', '占比'], rows),
          output: '',
          note: '共 ' + total + ' 条记录，' + order.length + ' 个分组' + (invalid ? '，忽略 ' + invalid + ' 条无效行' : '')
        };
      }
    });
  }

  /* ------------------------------ 10. 12 / 24 小时制 ------------------------------ */
  function renderTime1224(root) {
    K.text(root, {
      uid: 't1224',
      inputLabel: '时间（每行一个，如 14:30 或 2:30 PM）',
      inputRows: 6,
      actionLabel: '转换',
      options: [
        { id: 'mode', label: '方向', type: 'select', value: 'to12', options: [
          { value: 'to12', label: '24 小时制 → 12 小时制' },
          { value: 'to24', label: '12 小时制 → 24 小时制' }
        ] },
        { id: 'pad', label: '小时补零（09:05）', type: 'checkbox', value: false }
      ],
      hint: '12 小时制的坑：12:00 AM 是午夜 0 点，12:00 PM 是正午 12 点，两者都不是 0 点也不是 24 点。',
      sample: '00:00\n09:05\n12:00\n13:45\n23:59',
      run: function (text, opt) {
        var out = [];
        text.split(/\r?\n/).forEach(function (line) {
          var raw = line.trim();
          if (!raw) return;
          if (opt.mode === 'to12') {
            var m = /^(\d{1,2}):(\d{2})$/.exec(raw);
            if (!m) { out.push(raw + '  ← 格式应为 HH:mm'); return; }
            var hour = +m[1];
            if (hour > 23) { out.push(raw + '  ← 小时超出 23'); return; }
            var suffix = hour < 12 ? 'AM' : 'PM';
            var hour12 = hour % 12;
            if (hour12 === 0) hour12 = 12;
            out.push((opt.pad ? p2(hour12) : hour12) + ':' + m[2] + ' ' + suffix);
            return;
          }
          var m2 = /^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/.exec(raw);
          if (!m2) { out.push(raw + '  ← 格式应为 h:mm AM/PM'); return; }
          var h = +m2[1];
          var mark = (m2[3] || '').toUpperCase();
          if (h > 12) { out.push(raw + '  ← 12 小时制小时不应大于 12'); return; }
          if (mark === 'AM') h = h === 12 ? 0 : h;
          else if (mark === 'PM') h = h === 12 ? 12 : h + 12;
          out.push((opt.pad ? p2(h) : String(h)) + ':' + m2[2]);
        });
        return { output: out.join('\n'), note: '共处理 ' + out.length + ' 行' };
      }
    });
  }

  /* ------------------------------ 11. 最早最晚与跨度 ------------------------------ */
  function renderDateExtremes(root) {
    K.text(root, {
      uid: 'dateext',
      inputLabel: '每行一个日期',
      inputRows: 8,
      actionLabel: '分析',
      hideOutput: true,
      hint: '一次算出最早、最晚、跨度与平均间隔，适合核对日志区间、活动周期与项目排期。',
      sample: '2026-01-05\n2026-01-19\n2026-03-02\n2025-12-22',
      run: function (text) {
        var dates = [];
        var invalid = 0;
        text.split(/\r?\n/).forEach(function (line) {
          if (!line.trim()) return;
          var date = parseDate(line);
          if (date) dates.push(date);
          else invalid += 1;
        });
        if (!dates.length) return { error: '没有可识别的日期' };
        dates.sort(function (a, b) { return a - b; });
        var first = dates[0];
        var last = dates[dates.length - 1];
        var span = Math.round((last - first) / 86400000);
        var avg = dates.length > 1 ? span / (dates.length - 1) : 0;
        function fmt(date) {
          return date.getFullYear() + '-' + p2(date.getMonth() + 1) + '-' + p2(date.getDate());
        }
        var rows = [
          { key: '有效条数', value: dates.length + ' 条', mono: false },
          { key: '最早', value: fmt(first) + ' ' + WEEK_CN[first.getDay()], mono: false },
          { key: '最晚', value: fmt(last) + ' ' + WEEK_CN[last.getDay()], mono: false },
          { key: '跨度', value: span + ' 天（' + K.num(span / 7, 2) + ' 周）', mono: false },
          { key: '平均间隔', value: dates.length > 1 ? K.num(avg, 2) + ' 天' : '仅 1 个日期', mono: false },
          { key: '去重后', value: new Set(dates.map(function (d) { return d.getTime(); })).size + ' 个不同日期', mono: false }
        ];
        if (invalid) rows.push({ key: '忽略', value: invalid + ' 条无法识别', mono: false });
        return { html: K.kv(rows), output: '', note: '已按时间升序整理' };
      }
    });
  }

  /* ------------------------------ 12. 跨时区会议 ------------------------------ */
  var ZONES = [
    { zone: 'Asia/Shanghai', label: '北京' },
    { zone: 'Asia/Tokyo', label: '东京' },
    { zone: 'Asia/Singapore', label: '新加坡' },
    { zone: 'Europe/London', label: '伦敦' },
    { zone: 'Europe/Berlin', label: '柏林' },
    { zone: 'America/New_York', label: '纽约' },
    { zone: 'America/Los_Angeles', label: '洛杉矶' },
    { zone: 'Australia/Sydney', label: '悉尼' }
  ];

  function zoneOffset(date, zone) {
    var formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    var parts = formatter.formatToParts(date);
    var map = {};
    parts.forEach(function (part) { map[part.type] = part.value; });
    var asUTC = Date.UTC(+map.year, +map.month - 1, +map.day, (+map.hour) % 24, +map.minute, +map.second);
    return asUTC - date.getTime();
  }

  function wallToInstant(dateText, timeText, zone) {
    var dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText);
    if (!dm) return null;
    var tm = /^(\d{1,2}):(\d{2})$/.exec(timeText);
    if (!tm) return null;
    var guess = Date.UTC(+dm[1], +dm[2] - 1, +dm[3], +tm[1], +tm[2], 0);
    var offset = zoneOffset(new Date(guess), zone);
    var instant = guess - offset;
    offset = zoneOffset(new Date(instant), zone);
    return new Date(guess - offset);
  }

  function renderMeeting(root) {
    K.form(root, {
      uid: 'meeting',
      stack: true,
      fields: [
        { id: 'date', label: '日期', type: 'date' },
        { id: 'time', label: '时间', type: 'text', value: '10:00', placeholder: 'HH:mm' },
        { id: 'zone', label: '基准时区', type: 'select', value: 'Asia/Shanghai', options: ZONES.map(function (item) {
          return { value: item.zone, label: item.label + '（' + item.zone + '）' };
        }) }
      ],
      actionLabel: '换算',
      hint: '把某个城市的时间换算到其他城市，并标出是否落在 9:00–18:00 的工作时段，方便约跨时区会议。夏令时由浏览器按 IANA 时区数据库自动处理。',
      sample: { date: new Date().toISOString().slice(0, 10), time: '10:00', zone: 'Asia/Shanghai' },
      run: function (values) {
        var instant = wallToInstant(String(values.date || ''), String(values.time || ''), values.zone);
        if (!instant || isNaN(instant.getTime())) return { error: '请填写日期与 HH:mm 格式的时间' };
        var baseDay = String(values.date || '');
        var rows = ZONES.map(function (item) {
          var local = new Date(instant.toLocaleString('en-US', { timeZone: item.zone }));
          var hour = local.getHours();
          var work = hour >= 9 && hour < 18;
          var offset = zoneOffset(instant, item.zone) / 60000;
          var sign = offset >= 0 ? '+' : '-';
          var abs = Math.abs(offset);
          var localDay = new Intl.DateTimeFormat('en-CA', { timeZone: item.zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant);
          var dayNote = localDay === baseDay ? '' : '（' + (localDay > baseDay ? '次日' : '前一日') + '）';
          return [
            item.label,
            p2(hour) + ':' + p2(local.getMinutes()) + dayNote,
            'UTC' + sign + p2(Math.floor(abs / 60)) + ':' + p2(abs % 60),
            work ? '工作时段' : '休息时段'
          ];
        });
        return {
          html: K.table(['城市', '当地时间', '偏移', '状态'], rows),
          note: '基准：' + values.date + ' ' + values.time + ' ' + values.zone,
          rows: [{ key: 'UTC 时间', value: instant.toISOString().replace('T', ' ').slice(0, 19) }]
        };
      }
    });
  }

  /* ------------------------------ 注册 ------------------------------ */
  window.ToolModules['iso-duration'] = renderIsoDuration;
  window.ToolModules['rfc-date'] = renderRfcDate;
  window.ToolModules['date-sort'] = renderDateSort;
  window.ToolModules['date-weekday-tag'] = renderWeekdayTag;
  window.ToolModules['time-round'] = renderTimeRound;
  window.ToolModules['week-parity'] = renderWeekParity;
  window.ToolModules['date-en-ordinal'] = renderEnOrdinal;
  window.ToolModules['time-ago'] = renderTimeAgo;
  window.ToolModules['date-bucket'] = renderDateBucket;
  window.ToolModules['time-12-24'] = renderTime1224;
  window.ToolModules['date-extremes'] = renderDateExtremes;
  window.ToolModules['meeting-planner'] = renderMeeting;
})();
