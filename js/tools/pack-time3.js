/* =============================================================================
 * 时间日期工具包 · 第三批（10 个）
 * -----------------------------------------------------------------------------
 * festival-countdown 节日倒计时
 * julian-day         儒略日转换
 * stopwatch          秒表
 * pomodoro           番茄钟
 * nth-weekday        第 N 个星期几
 * biz-hours          工作时长计算
 * days-in-month      月天数查询
 * dst-check          夏令时检测
 * year-calendar      年历生成
 * year-progress      年度进度
 * ========================================================================== */
(function () {
  'use strict';

  var K = window.ToolKit;
  var WEEK_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  function pad2(n) { return String(n).padStart(2, '0'); }
  function fmtDate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function daysBetween(a, b) {
    return Math.round((new Date(b.getFullYear(), b.getMonth(), b.getDate()) -
      new Date(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000);
  }

  /* ------------------------------ 1. 节日倒计时 ------------------------------ */
  var FESTIVALS = [
    { name: '元旦', month: 1, day: 1 }, { name: '情人节', month: 2, day: 14 },
    { name: '妇女节', month: 3, day: 8 }, { name: '劳动节', month: 5, day: 1 },
    { name: '青年节', month: 5, day: 4 }, { name: '儿童节', month: 6, day: 1 },
    { name: '建党节', month: 7, day: 1 }, { name: '建军节', month: 8, day: 1 },
    { name: '教师节', month: 9, day: 10 }, { name: '国庆节', month: 10, day: 1 },
    { name: '万圣节', month: 10, day: 31 }, { name: '光棍节', month: 11, day: 11 },
    { name: '圣诞节', month: 12, day: 25 }
  ];
  // 固定农历日期对应的公历节日按近似公历日展示（精确农历另需历表）
  var LUNAR_APPROX = [
    { name: '春节（约）', month: 1, day: 25 }, { name: '元宵节（约）', month: 2, day: 12 },
    { name: '端午节（约）', month: 6, day: 10 }, { name: '七夕（约）', month: 8, day: 10 },
    { name: '中秋节（约）', month: 9, day: 17 }
  ];

  function renderFestivalCountdown(root) {
    K.form(root, {
      uid: 'festival',
      actionLabel: '查询',
      fields: [
        { id: 'year', label: '年份', type: 'number', value: new Date().getFullYear(), min: 1900, max: 2200 },
        { id: 'includeLunar', label: '包含农历节日（按往年近似日期）', type: 'checkbox' }
      ],
      hint: '公历节日为准确日期；标「约」的农历节日按近年常见日期估算，仅供倒计时参考。',
      run: function (v) {
        var year = Math.min(2200, Math.max(1900, Number(v.year) || new Date().getFullYear()));
        var today = new Date();
        var list = FESTIVALS.slice();
        if (v.includeLunar) list = list.concat(LUNAR_APPROX);
        var rows = list.map(function (f) {
          var date = new Date(year, f.month - 1, f.day);
          var diff = daysBetween(today, date);
          if (diff < -7 && year === today.getFullYear()) return null; // 今年已过且超过一周，不再列出
          return {
            festival: f.name,
            date: fmtDate(date) + ' ' + WEEK_CN[date.getDay()],
            diff: diff < 0 ? '已过 ' + (-diff) + ' 天' : diff === 0 ? '🎉 就是今天' : '还有 ' + diff + ' 天'
          };
        }).filter(Boolean);
        var nearest = rows.filter(function (r) { return /^还有/.test(r.diff); })
          .sort(function (a, b) { return parseInt(a.diff) - parseInt(b.diff); })[0];
        return {
          html: K.table(['节日', '日期', '倒计时'], rows.map(function (r) {
            return [r.festival, r.date, r.diff];
          })) + (nearest ? '<p class="hint">下一个节日：<strong>' + K.esc(nearest.festival) + '</strong>（' + K.esc(nearest.diff) + '）</p>' : ''),
          note: year + ' 年共列出 ' + rows.length + ' 个节日'
        };
      }
    });
  }

  /* ------------------------------ 2. 儒略日转换 ------------------------------ */
  function gregorianToJdn(y, m, d) {
    var a = Math.floor((14 - m) / 12);
    var yy = y + 4800 - a;
    var mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }
  function jdnToGregorian(jdn) {
    var a = jdn + 32044;
    var b = Math.floor((4 * a + 3) / 146097);
    var c = a - Math.floor(146097 * b / 4);
    var d2 = Math.floor((4 * c + 3) / 1461);
    var e = c - Math.floor(1461 * d2 / 4);
    var m2 = Math.floor((5 * e + 2) / 153);
    var day = e - Math.floor((153 * m2 + 2) / 5) + 1;
    var month = m2 + 3 - 12 * Math.floor(m2 / 10);
    var year = 100 * b + d2 - 4800 + Math.floor(m2 / 10);
    return { year: year, month: month, day: day };
  }

  function renderJulianDay(root) {
    K.form(root, {
      uid: 'julianday',
      actionLabel: '换算',
      fields: [
        { id: 'mode', label: '方向', type: 'select', value: 'toJd',
          options: [{ value: 'toJd', label: '公历 → 儒略日' }, { value: 'fromJd', label: '儒略日 → 公历' }] },
        { id: 'date', label: '日期（YYYY-MM-DD）', type: 'text', value: '' , placeholder: '留空则用今天' },
        { id: 'jd', label: '儒略日数（JDN）', type: 'text', value: '2460000' }
      ],
      hint: '儒略日数（JDN）是天文学记日法：自公元前 4713 年 1 月 1 日起连续计数，正午为一天起点。',
      run: function (v) {
        if (v.mode === 'fromJd') {
          var jdn = Math.floor(Number(v.jd));
          if (!jdn || jdn < 0) return { error: '请输入有效的儒略日数' };
          var g = jdnToGregorian(jdn);
          var d = new Date(g.year, g.month - 1, g.day);
          var unixTs = (jdn - 2440587.5) * 86400000; // 与 Unix 纪元的关系
          return {
            rows: [
              { key: '公历日期', value: fmtDate(d) + ' ' + WEEK_CN[d.getDay()] },
              { key: 'Unix 时间戳', value: String(Math.round(unixTs)) + '（当日正午 UTC）' },
              { key: '修订儒略日 MJD', value: String(jdn - 2400000) }
            ],
            note: 'JDN ' + jdn + ' 对应 ' + g.year + ' 年（含公历 1582 年前的切换误差，仅支持格里历范围）'
          };
        }
        var parts;
        if (v.date.trim()) {
          parts = v.date.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
          if (!parts) return { error: '日期格式应为 YYYY-MM-DD' };
        } else {
          var today = new Date();
          parts = [null, today.getFullYear(), today.getMonth() + 1, today.getDate()];
        }
        var y = Number(parts[1]);
        var m = Number(parts[2]);
        var day = Number(parts[3]);
        var jdn2 = gregorianToJdn(y, m, day);
        return {
          rows: [
            { key: '儒略日数 JDN', value: String(jdn2) },
            { key: '修订儒略日 MJD', value: String(jdn2 - 2400000) },
            { key: 'Unix 时间戳', value: String(Math.round((jdn2 - 2440587.5) * 86400000)) + '（当日正午 UTC）' }
          ],
          note: fmtDate(new Date(y, m - 1, day)) + ' → JDN ' + jdn2
        };
      }
    });
  }

  /* ------------------------------ 3. 秒表 ------------------------------ */
  function renderStopwatch(root) {
    root.innerHTML =
      '<div class="totp-stage">' +
        '<div class="clock-local" id="sw-display">00:00.00</div>' +
        '<div class="meter"><span class="meter-fill" id="sw-meter" style="width:0%"></span></div>' +
        '<div class="btn-row" style="margin-top:12px">' +
          '<button type="button" class="btn primary" id="sw-start">开始</button>' +
          '<button type="button" class="btn ghost" id="sw-lap">计次</button>' +
          '<button type="button" class="btn ghost" id="sw-reset">复位</button>' +
        '</div>' +
        '<div id="sw-laps" style="margin-top:12px"></div>' +
      '</div>' +
      '<p class="hint">基于 performance.now() 计时，后台挂起也不会丢时间；离开页面计时自动继续（数据在内存中）。</p>';

    var display = root.querySelector('#sw-display');
    var meter = root.querySelector('#sw-meter');
    var lapsBox = root.querySelector('#sw-laps');
    var startBtn = root.querySelector('#sw-start');
    var lapBtn = root.querySelector('#sw-lap');
    var resetBtn = root.querySelector('#sw-reset');
    var running = false;
    var startTime = 0;
    var elapsed = 0;
    var laps = [];
    var timer = null;

    function fmt(ms) {
      var totalSec = Math.floor(ms / 10);
      var cs = totalSec % 100;
      var sec = Math.floor(totalSec / 100) % 60;
      var min = Math.floor(totalSec / 6000);
      return pad2(min) + ':' + pad2(sec) + '.' + pad2(cs);
    }
    function draw() {
      display.textContent = fmt(elapsed);
      // 计次环：最近一圈占满一圈（60 秒）的进度
      var lastLap = laps.length ? laps[laps.length - 1] : 0;
      var lapMs = laps.length ? elapsed - lastLap : elapsed;
      meter.style.width = Math.min(100, (lapMs % 60000) / 600) + '%';
    }
    function tick() {
      elapsed = performance.now() - startTime;
      draw();
    }
    function renderLaps() {
      if (!laps.length) { lapsBox.innerHTML = ''; return; }
      lapsBox.innerHTML = K.table(['计次', '单圈', '累计'], laps.map(function (t, i) {
        var prev = i > 0 ? laps[i - 1] : 0;
        return [String(i + 1), fmt(t - prev), fmt(t)];
      }), { maxHeight: '200px' });
    }
    startBtn.addEventListener('click', function () {
      if (running) {
        elapsed = performance.now() - startTime;
        clearInterval(timer);
        running = false;
        startBtn.textContent = '继续';
      } else {
        startTime = performance.now() - elapsed;
        timer = setInterval(tick, 30);
        running = true;
        startBtn.textContent = '暂停';
      }
    });
    lapBtn.addEventListener('click', function () {
      if (!running && !elapsed) { K.toast('先按「开始」再计次', 'warn'); return; }
      laps.push(running ? performance.now() - startTime : elapsed);
      renderLaps();
    });
    resetBtn.addEventListener('click', function () {
      clearInterval(timer);
      running = false;
      elapsed = 0;
      laps = [];
      startBtn.textContent = '开始';
      draw();
      renderLaps();
      lapsBox.innerHTML = '';
    });
    draw();
  }

  /* ------------------------------ 4. 番茄钟 ------------------------------ */
  function renderPomodoro(root) {
    root.innerHTML =
      '<div class="form-row">' +
        '<div class="form-item"><label class="label" for="pomo-work">专注时长（分钟）</label><input class="input mono" type="number" id="pomo-work" value="25" min="1" max="120"></div>' +
        '<div class="form-item"><label class="label" for="pomo-break">休息时长（分钟）</label><input class="input mono" type="number" id="pomo-break" value="5" min="1" max="60"></div>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="pomo-start">开始专注</button>' +
        '<button type="button" class="btn ghost" id="pomo-stop">结束</button>' +
      '</div>' +
      '<div class="totp-stage" style="margin-top:14px">' +
        '<div class="totp-code" id="pomo-display">25:00</div>' +
        '<div class="meter"><span class="meter-fill" id="pomo-meter" style="width:100%"></span></div>' +
        '<p class="totp-note" id="pomo-note">准备就绪</p>' +
      '</div>' +
      '<p class="hint">阶段结束自动切换专注 / 休息并响铃提示（需浏览器允许页面发声；标签页在后台时计时继续）。</p>';

    var display = root.querySelector('#pomo-display');
    var meter = root.querySelector('#pomo-meter');
    var note = root.querySelector('#pomo-note');
    var startBtn = root.querySelector('#pomo-start');
    var stopBtn = root.querySelector('#pomo-stop');
    var workMin = root.querySelector('#pomo-work');
    var breakMin = root.querySelector('#pomo-break');
    var phase = null; // 'work' | 'break'
    var deadline = 0;
    var totalMs = 0;
    var timer = null;
    var rounds = 0;

    function beep() {
      try {
        var ctx = new (window.AudioContext || window.webkitAudioContext)();
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880; gain.gain.value = 0.2;
        osc.start(); osc.stop(ctx.currentTime + 0.4);
      } catch (e) { /* 不发声也不影响功能 */ }
    }
    function draw() {
      var remain = Math.max(0, deadline - Date.now());
      var mm = Math.floor(remain / 60000);
      var ss = Math.floor(remain / 1000) % 60;
      display.textContent = pad2(mm) + ':' + pad2(ss);
      meter.style.width = Math.round(remain / totalMs * 100) + '%';
      if (remain <= 0) {
        clearInterval(timer);
        beep();
        if (phase === 'work') {
          rounds += 1;
          startPhase('break');
        } else {
          phase = null;
          note.textContent = '本轮完成 🎉 共专注 ' + rounds + ' 轮';
          startBtn.textContent = '开始专注';
        }
      }
    }
    function startPhase(next) {
      phase = next;
      var minutes = Number(next === 'work' ? workMin.value : breakMin.value) || 5;
      totalMs = minutes * 60000;
      deadline = Date.now() + totalMs;
      note.textContent = next === 'work' ? '🍅 专注中…' : '☕️ 休息一下';
      startBtn.textContent = '切换';
      clearInterval(timer);
      timer = setInterval(draw, 250);
      draw();
    }
    startBtn.addEventListener('click', function () {
      startPhase(phase === 'work' ? 'break' : 'work');
    });
    stopBtn.addEventListener('click', function () {
      clearInterval(timer);
      phase = null;
      rounds = 0;
      note.textContent = '已复位';
      display.textContent = (Number(workMin.value) || 25) + ':00';
      meter.style.width = '100%';
    });
    // 初始态：显示完整时长而不是 00:00
    display.textContent = (Number(workMin.value) || 25) + ':00';
    meter.style.width = '100%';
    note.textContent = '准备就绪';
  }

  /* ------------------------------ 5. 第 N 个星期几 ------------------------------ */
  function renderNthWeekday(root) {
    K.form(root, {
      uid: 'nthweekday',
      actionLabel: '计算',
      fields: [
        { id: 'year', label: '年份', type: 'number', value: new Date().getFullYear(), min: 1900, max: 2200 },
        { id: 'month', label: '月份', type: 'select', value: '5',
          options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(function (m) { return { value: m, label: m + ' 月' }; }) },
        { id: 'weekday', label: '星期', type: 'select', value: '0',
          options: WEEK_CN.map(function (w, i) { return { value: String(i), label: w }; }) },
        { id: 'nth', label: '第几个（0 = 最后一个）', type: 'select', value: '2',
          options: [{ value: '1', label: '第 1 个' }, { value: '2', label: '第 2 个' }, { value: '3', label: '第 3 个' }, { value: '4', label: '第 4 个' }, { value: '5', label: '第 5 个' }, { value: '0', label: '最后一个' }] }
      ],
      hint: '母亲节 = 5 月第 2 个周日；父亲节 = 6 月第 3 个周日；感恩节 = 11 月第 4 个周四。',
      run: function (v) {
        var year = Number(v.year);
        var month = Number(v.month) - 1;
        var weekday = Number(v.weekday);
        var nth = Number(v.nth);
        var list = [];
        for (var day = 1; day <= 31; day += 1) {
          var d = new Date(year, month, day);
          if (d.getMonth() !== month) break;
          if (d.getDay() === weekday) list.push(d);
        }
        if (!list.length) return { error: '该月没有指定的星期' };
        var target = nth === 0 ? list[list.length - 1] : list[Math.min(nth, list.length) - 1];
        if (!target) return { error: '该月只有 ' + list.length + ' 个' + WEEK_CN[weekday] };
        return {
          rows: [
            { key: '结果日期', value: fmtDate(target) + ' ' + WEEK_CN[target.getDay()] },
            { key: '该月全部', value: list.map(fmtDate).join('、') },
            { key: '年内第几天', value: String(daysBetween(new Date(year, 0, 1), target) + 1) }
          ],
          note: year + ' 年 ' + (month + 1) + ' 月第 ' + (nth === 0 ? '最后一' : nth) + '个' + WEEK_CN[weekday] + '是 ' + fmtDate(target)
        };
      }
    });
  }

  /* ------------------------------ 6. 工作时长计算 ------------------------------ */
  function renderBizHours(root) {
    K.form(root, {
      uid: 'bizhours',
      actionLabel: '计算净工作时长',
      fields: [
        { id: 'start', label: '开始时间', type: 'text', value: '', placeholder: 'YYYY-MM-DD HH:mm' },
        { id: 'end', label: '结束时间', type: 'text', value: '', placeholder: 'YYYY-MM-DD HH:mm' },
        { id: 'dayStart', label: '每日上班', type: 'text', value: '09:00' },
        { id: 'dayEnd', label: '每日下班', type: 'text', value: '18:00' },
        { id: 'skipWeekend', label: '跳过周末', type: 'checkbox', value: true },
        { id: 'holidays', label: '额外跳过的日期', type: 'text', value: '', placeholder: '逗号分隔，如 2026-01-01,2026-02-17' }
      ],
      hint: '只统计每天上班窗口内的时间；跨多天时逐天累加，最多计算 3 年。',
      run: function (v) {
        function parse(dt) {
          var m = dt.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?$/);
          if (!m) return null;
          return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0));
        }
        var start = parse(v.start || '');
        var end = parse(v.end || '');
        if (!start || !end) return { error: '请按 YYYY-MM-DD HH:mm 填写开始与结束时间' };
        if (end <= start) return { error: '结束时间必须晚于开始时间' };
        var wm = (v.dayStart || '09:00').match(/^(\d{1,2}):(\d{2})$/);
        var we = (v.dayEnd || '18:00').match(/^(\d{1,2}):(\d{2})$/);
        if (!wm || !we) return { error: '上班 / 下班时间格式应为 HH:mm' };
        var wStart = Number(wm[1]) * 60 + Number(wm[2]);
        var wEnd = Number(we[1]) * 60 + Number(we[2]);
        if (wEnd <= wStart) return { error: '下班时间必须晚于上班时间' };
        var holidays = {};
        (v.holidays || '').split(/[,，\s]+/).forEach(function (s) { if (s.trim()) holidays[s.trim()] = true; });
        var totalMin = 0;
        var workDays = 0;
        var cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        var limit = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        var guard = 0;
        while (cursor <= limit && guard < 1200) {
          guard += 1;
          var isWeekend = cursor.getDay() === 0 || cursor.getDay() === 6;
          var skip = (v.skipWeekend && isWeekend) || holidays[fmtDate(cursor)];
          if (!skip) {
            var dayStartMin = cursor.getTime() === new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
              ? start.getHours() * 60 + start.getMinutes() : 0;
            var dayEndMin = cursor.getTime() === limit.getTime()
              ? end.getHours() * 60 + end.getMinutes() : 1440;
            var from = Math.max(dayStartMin, wStart);
            var to = Math.min(dayEndMin, wEnd);
            if (to > from) { totalMin += to - from; workDays += 1; }
          }
          cursor.setDate(cursor.getDate() + 1);
        }
        var h = Math.floor(totalMin / 60);
        var mm = totalMin % 60;
        return {
          rows: [
            { key: '净工作时长', value: h + ' 小时 ' + mm + ' 分钟（共 ' + K.group(totalMin) + ' 分钟）' },
            { key: '有效工作日', value: workDays + ' 天' },
            { key: '每日窗口', value: v.dayStart + ' – ' + v.dayEnd + '（' + (wEnd - wStart) + ' 分钟/天）' }
          ],
          note: '如需扣除午休，可把窗口改成 09:00–12:00 与 13:30–18:00 分两次计算后相加'
        };
      }
    });
  }

  /* ------------------------------ 7. 月天数查询 ------------------------------ */
  function renderDaysInMonth(root) {
    K.form(root, {
      uid: 'daysinmonth',
      actionLabel: '查询',
      fields: [
        { id: 'year', label: '年份', type: 'number', value: new Date().getFullYear(), min: 1900, max: 2200 }
      ],
      hint: '自动判断闰年二月；同时给出每月第一天是星期几，方便排班表。',
      run: function (v) {
        var year = Math.min(2200, Math.max(1900, Number(v.year) || new Date().getFullYear()));
        var rows = [];
        var total = 0;
        for (var m = 1; m <= 12; m += 1) {
          var days = new Date(year, m, 0).getDate();
          total += days;
          var first = new Date(year, m - 1, 1);
          rows.push([m + ' 月', String(days), WEEK_CN[first.getDay()], days === 31 ? '大月' : days === 30 ? '小月' : days === 29 ? '闰月' : '平月']);
        }
        return {
          html: K.table(['月份', '天数', '第一天', '类型'], rows) +
            '<p class="hint">' + year + ' 年共 <strong>' + total + '</strong> 天，闰年判断：' +
            ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? '是闰年' : '不是闰年') + '</p>',
          note: year + ' 年共有 ' + total + ' 天'
        };
      }
    });
  }

  /* ------------------------------ 8. 夏令时检测 ------------------------------ */
  function renderDstCheck(root) {
    K.form(root, {
      uid: 'dstcheck',
      actionLabel: '检测',
      fields: [
        { id: 'zone', label: 'IANA 时区', type: 'text', value: 'America/New_York' },
        { id: 'year', label: '年份', type: 'number', value: new Date().getFullYear(), min: 1970, max: 2100 }
      ],
      hint: '逐天对比与 UTC 的偏移量：全年只有一种偏移则该时区当年无夏令时。',
      run: function (v) {
        var zone = v.zone.trim();
        var year = Math.min(2100, Math.max(1970, Number(v.year) || new Date().getFullYear()));
        try { new Intl.DateTimeFormat('en-US', { timeZone: zone }).format(new Date()); }
        catch (e) { return { error: '无法识别时区「' + zone + '」，示例：Asia/Shanghai、Europe/Paris' }; }
        function offsetMin(date) {
          var parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(date);
          var get = function (t) { return Number((parts.find(function (p) { return p.type === t; }) || {}).value); };
          var asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
          return (asUtc - date.getTime()) / 60000;
        }
        var changes = [];
        var prev = offsetMin(new Date(Date.UTC(year, 0, 1)));
        var standard = prev;
        for (var day = 2; day <= 366; day += 1) {
          var d = new Date(Date.UTC(year, 0, day));
          if (d.getUTCFullYear() !== year) break;
          var off = offsetMin(d);
          if (off !== prev) {
            changes.push({ date: new Date(d.getTime() - 86400000), from: prev, to: off });
            prev = off;
          }
          if (off < standard) standard = off;
        }
        if (!changes.length) {
          return {
            html: '<div class="big-result">全年无夏令时</div>',
            rows: [{ key: '全年偏移', value: 'UTC' + (standard >= 0 ? '+' : '') + (standard / 60) }],
            note: zone + ' 在 ' + year + ' 年没有切换时间'
          };
        }
        var dstOff = Math.max(changes[0].to, changes[0].from);
        return {
          rows: changes.map(function (c, i) {
            return {
              key: '切换 ' + (i + 1),
              value: fmtDate(c.date) + '：UTC' + (c.from >= 0 ? '+' : '') + (c.from / 60) + ' → UTC' + (c.to >= 0 ? '+' : '') + (c.to / 60)
            };
          }).concat([{ key: '夏令时期间偏移', value: 'UTC' + (dstOff >= 0 ? '+' : '') + (dstOff / 60), copy: false }]),
          note: zone + ' 在 ' + year + ' 年有 ' + changes.length + ' 次时间切换'
        };
      }
    });
  }

  /* ------------------------------ 9. 年历生成 ------------------------------ */
  function renderYearCalendar(root) {
    K.form(root, {
      uid: 'yearcal',
      actionLabel: '生成年历',
      fields: [
        { id: 'year', label: '年份', type: 'number', value: new Date().getFullYear(), min: 1900, max: 2200 },
        { id: 'weekStart', label: '每周起始', type: 'select', value: '1',
          options: [{ value: '1', label: '周一' }, { value: '0', label: '周日' }] }
      ],
      hint: '12 个月排成网格，高亮今天；可整页截图或打印。',
      run: function (v) {
        var year = Math.min(2200, Math.max(1900, Number(v.year) || new Date().getFullYear()));
        var start = Number(v.weekStart) === 0 ? 0 : 1;
        var today = fmtDate(new Date());
        var months = [];
        for (var m = 0; m < 12; m += 1) {
          var first = new Date(year, m, 1);
          var total = new Date(year, m + 1, 0).getDate();
          var cells = [];
          for (var i = 0; i < (first.getDay() - start + 7) % 7; i += 1) cells.push('');
          for (var d = 1; d <= total; d += 1) cells.push(d);
          months.push({ label: (m + 1) + ' 月', cells: cells });
        }
        var headers = [];
        for (var w = 0; w < 7; w += 1) headers.push(WEEK_CN[(start + w) % 7].slice(1));
        var html = '<div class="calendar-year">';
        months.forEach(function (mo) {
          html += '<div class="calendar-month"><div class="calendar-title">' + K.esc(year + '年' + mo.label) + '</div><table class="data-table calendar-table"><thead><tr>' +
            headers.map(function (h) { return '<th>' + K.esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>';
          for (var r = 0; r < mo.cells.length; r += 7) {
            html += '<tr>' + mo.cells.slice(r, r + 7).map(function (c) {
              if (c === '') return '<td></td>';
              var iso = year + '-' + pad2(parseInt(mo.label, 10)) + '-' + pad2(c);
              return '<td' + (iso === today ? ' style="background:var(--accent-soft);font-weight:700"' : '') + '>' + c + '</td>';
            }).join('') + '</tr>';
          }
          html += '</tbody></table></div>';
        });
        html += '</div>';
        return {
          html: html,
          note: year + ' 年年历已生成，今天：' + today
        };
      }
    });
  }

  /* ------------------------------ 10. 年度进度 ------------------------------ */
  function renderYearProgress(root) {
    root.innerHTML =
      '<div class="totp-stage">' +
        '<div class="clock-local" id="yp-clock">--:--:--</div>' +
        '<div id="yp-bars"></div>' +
        '<p class="totp-note" id="yp-note"></p>' +
      '</div>' +
      '<p class="hint">每秒刷新；「本年」按自然年计算，闰年按 366 天。</p>';

    var clock = root.querySelector('#yp-clock');
    var bars = root.querySelector('#yp-bars');
    var noteEl = root.querySelector('#yp-note');

    function draw() {
      var now = new Date();
      clock.textContent = pad2(now.getHours()) + ':' + pad2(now.getMinutes()) + ':' + pad2(now.getSeconds());
      var yearStart = new Date(now.getFullYear(), 0, 1);
      var yearEnd = new Date(now.getFullYear() + 1, 0, 1);
      var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      var monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      var dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      var dayPct = (now - dayStart) / 86400000 * 100;
      var monthPct = (now - monthStart) / (monthEnd - monthStart) * 100;
      var yearPct = (now - yearStart) / (yearEnd - yearStart) * 100;
      var weekPct = ((now.getDay() + 6) % 7 + dayPct / 100) / 7 * 100;
      var items = [
        { label: '今日', pct: dayPct, detail: '剩余 ' + (86400 - Math.floor((now - dayStart) / 1000)) + ' 秒' },
        { label: '本周', pct: weekPct, detail: '周一为起点' },
        { label: '本月', pct: monthPct, detail: now.getFullYear() + ' 年 ' + (now.getMonth() + 1) + ' 月' },
        { label: '今年', pct: yearPct, detail: now.getFullYear() + ' 年（' + (Math.round((yearEnd - yearStart) / 86400000)) + ' 天）' }
      ];
      bars.innerHTML = items.map(function (item) {
        return '<div class="meter-row"><span class="meter-label">' + K.esc(item.label) + '</span>' +
          '<div class="meter"><span class="meter-fill" style="width:' + item.pct.toFixed(2) + '%"></span></div>' +
          '<span class="meter-value">' + item.pct.toFixed(1) + '%</span></div>';
      }).join('');
      noteEl.textContent = items.map(function (i2) { return i2.label + ' ' + i2.pct.toFixed(1) + '%'; }).join(' · ');
    }
    var timer = setInterval(function () {
      if (!document.body.contains(root)) { clearInterval(timer); return; }
      draw();
    }, 1000);
    draw();
  }

  window.ToolModules['festival-countdown'] = renderFestivalCountdown;
  window.ToolModules['julian-day'] = renderJulianDay;
  window.ToolModules['stopwatch'] = renderStopwatch;
  window.ToolModules['pomodoro'] = renderPomodoro;
  window.ToolModules['nth-weekday'] = renderNthWeekday;
  window.ToolModules['biz-hours'] = renderBizHours;
  window.ToolModules['days-in-month'] = renderDaysInMonth;
  window.ToolModules['dst-check'] = renderDstCheck;
  window.ToolModules['year-calendar'] = renderYearCalendar;
  window.ToolModules['year-progress'] = renderYearProgress;
})();
