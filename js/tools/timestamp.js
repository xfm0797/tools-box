/* =============================================================================
 * 工具：时间戳与日期互转
 * -----------------------------------------------------------------------------
 * 时间戳方向：自动识别 10 位（秒）与 13 位（毫秒），也可手动指定；
 * 日期方向：使用 datetime-local 的本地时间语义，输出秒级 / 毫秒级时间戳。
 * 页面实时显示当前时间，离开页面后自动停止计时器。
 * ========================================================================== */
(function () {
  'use strict';

  function pad(value) {
    return value < 10 ? '0' + value : String(value);
  }

  function formatLocal(date) {
    var week = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
      ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds()) +
      ' 周' + week;
  }

  function formatUTC(date) {
    return date.getUTCFullYear() + '-' + pad(date.getUTCMonth() + 1) + '-' + pad(date.getUTCDate()) +
      ' ' + pad(date.getUTCHours()) + ':' + pad(date.getUTCMinutes()) + ':' + pad(date.getUTCSeconds()) + ' UTC';
  }

  /** 相对时间描述，例如「3 分钟前」 */
  function relativeTime(date) {
    var diff = Date.now() - date.getTime();
    var future = diff < 0;
    var seconds = Math.abs(diff) / 1000;
    var text;
    if (seconds < 45) text = '几秒';
    else if (seconds < 90) text = '1 分钟';
    else if (seconds < 3600) text = Math.round(seconds / 60) + ' 分钟';
    else if (seconds < 86400) text = Math.round(seconds / 3600) + ' 小时';
    else if (seconds < 86400 * 30) text = Math.round(seconds / 86400) + ' 天';
    else if (seconds < 86400 * 365) text = Math.round(seconds / 86400 / 30) + ' 个月';
    else text = Math.round(seconds / 86400 / 365) + ' 年';
    return future ? text + '后' : text + '前';
  }

  function render(root) {
    root.innerHTML = `
      <div class="label-row">
        <span class="label">当前时间</span>
        <button type="button" class="link-btn" id="tsRefresh">刷新</button>
      </div>

      <div class="stat-grid" style="margin-top:0">
        <div class="stat">
          <div class="stat-value" id="tsLiveClock" style="font-size:15px">--:--:--</div>
          <div class="stat-label" id="tsLiveDate">本地时间</div>
        </div>
        <div class="stat">
          <div class="stat-value" id="tsNowSeconds">--</div>
          <div class="stat-label">秒级时间戳</div>
        </div>
        <div class="stat">
          <div class="stat-value" id="tsNowMillis">--</div>
          <div class="stat-label">毫秒级时间戳</div>
        </div>
      </div>

      <div class="btn-row" style="margin-top:12px">
        <button type="button" class="btn sm" id="tsCopySeconds">复制秒级</button>
        <button type="button" class="btn sm" id="tsCopyMillis">复制毫秒级</button>
        <button type="button" class="btn sm ghost" id="tsSample">示例</button>
        <button type="button" class="btn sm ghost" id="tsClear">清空</button>
        <button type="button" class="btn sm ghost" id="tsCopyAll">复制结果</button>
      </div>

      <h2 class="sub-title">时间戳 → 日期时间</h2>
      <div class="form-row">
        <div class="form-item" style="flex:1 1 220px">
          <label class="label" for="tsInput">时间戳</label>
          <input id="tsInput" class="input mono" type="text" inputmode="numeric" placeholder="例如 1714550400 或 1714550400000">
        </div>
        <div class="form-item" style="flex:0 1 150px">
          <label class="label" for="tsUnit">单位</label>
          <select id="tsUnit" class="select">
            <option value="auto">自动识别</option>
            <option value="s">秒（10 位）</option>
            <option value="ms">毫秒（13 位）</option>
          </select>
        </div>
        <button type="button" class="btn primary" id="tsToDate">转换</button>
      </div>

      <div class="kv-list" id="tsDateResult" hidden></div>
      <p class="status" id="tsDateStatus" hidden></p>

      <h2 class="sub-title">日期时间 → 时间戳</h2>
      <div class="form-row">
        <div class="form-item" style="flex:1 1 240px">
          <label class="label" for="tsDateInput">本地日期时间</label>
          <input id="tsDateInput" class="input" type="datetime-local" step="1">
        </div>
        <button type="button" class="btn primary" id="tsToTimestamp">转换</button>
        <button type="button" class="btn ghost" id="tsNowFill">填入此刻</button>
      </div>

      <div class="kv-list" id="tsStampResult" hidden></div>
      <p class="status" id="tsStampStatus" hidden></p>
      <p class="hint">时间戳按本地时区换算；「秒级」为 Unix 秒（10 位），「毫秒级」为 JavaScript 毫秒（13 位）。</p>
    `;

    var liveClock = root.querySelector('#tsLiveClock');
    var liveDate = root.querySelector('#tsLiveDate');
    var nowSeconds = root.querySelector('#tsNowSeconds');
    var nowMillis = root.querySelector('#tsNowMillis');

    function tick() {
      // 页面已切换时停止计时，避免定时器泄漏
      if (!document.body.contains(liveClock)) {
        clearInterval(timer);
        return;
      }
      var now = new Date();
      liveClock.textContent = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
      liveDate.textContent = now.getFullYear() + ' 年 ' + (now.getMonth() + 1) + ' 月 ' + now.getDate() + ' 日 · 本地时间';
      nowSeconds.textContent = String(Math.floor(now.getTime() / 1000));
      nowMillis.textContent = String(now.getTime());
    }

    var timer = setInterval(tick, 1000);
    tick();

    root.querySelector('#tsRefresh').addEventListener('click', function () {
      tick();
      window.UI.toast('已刷新', 'success');
    });

    root.querySelector('#tsCopySeconds').addEventListener('click', function () {
      window.UI.copyText(nowSeconds.textContent);
    });

    root.querySelector('#tsCopyMillis').addEventListener('click', function () {
      window.UI.copyText(nowMillis.textContent);
    });

    root.querySelector('#tsSample').addEventListener('click', function () {
      input.value = '1700000000';
      unit.value = 'auto';
      root.querySelector('#tsToDate').click();
      window.UI.toast('已填入示例时间戳', 'info');
    });

    root.querySelector('#tsClear').addEventListener('click', function () {
      input.value = '';
      dateInput.value = '';
      dateResult.hidden = true;
      stampResult.hidden = true;
      dateStatus.hidden = true;
      stampStatus.hidden = true;
      window.UI.toast('已清空', 'success');
    });

    root.querySelector('#tsCopyAll').addEventListener('click', function () {
      var rows = Array.prototype.slice.call(root.querySelectorAll('.kv')).filter(function (row) {
        return row.offsetParent !== null;
      });
      if (!rows.length) {
        window.UI.toast('还没有转换结果', 'warn');
        return;
      }
      var text = rows.map(function (row) {
        return row.querySelector('.kv-key').textContent + '：' + row.querySelector('.kv-val').textContent;
      }).join('\n');
      window.UI.copyText(text);
    });

    /* --------------------------- 时间戳 → 日期 --------------------------- */
    var input = root.querySelector('#tsInput');
    var unit = root.querySelector('#tsUnit');
    var dateResult = root.querySelector('#tsDateResult');
    var dateStatus = root.querySelector('#tsDateStatus');

    function kv(key, value) {
      var safe = window.UI.escapeHtml(value);
      return '<div class="kv"><span class="kv-key">' + window.UI.escapeHtml(key) + '</span>' +
        '<span class="kv-val" title="' + safe + '">' + safe + '</span>' +
        '<button type="button" class="link-btn" data-copy="' + safe + '">复制</button></div>';
    }

    root.querySelector('#tsToDate').addEventListener('click', function () {
      var raw = input.value.trim();
      dateResult.hidden = true;
      dateStatus.hidden = true;

      if (!raw) {
        window.UI.toast('请输入时间戳', 'warn');
        input.focus();
        return;
      }
      if (!/^-?\d+$/.test(raw)) {
        dateStatus.className = 'status err';
        dateStatus.textContent = '时间戳只能是整数，请去掉空格、小数点或其他字符。';
        dateStatus.hidden = false;
        return;
      }

      var number = Number(raw);
      var useMs = unit.value === 'ms' || (unit.value === 'auto' && raw.replace('-', '').length >= 12);
      var millis = useMs ? number : number * 1000;
      var date = new Date(millis);

      if (isNaN(date.getTime())) {
        dateStatus.className = 'status err';
        dateStatus.textContent = '无法识别的数值，超出可表示的时间范围（约公元 ±27 万年）。';
        dateStatus.hidden = false;
        return;
      }

      dateResult.innerHTML = [
        kv('本地时间', formatLocal(date)),
        kv('UTC 时间', formatUTC(date)),
        kv('ISO 8601', date.toISOString()),
        kv('相对时间', relativeTime(date)),
        kv('识别单位', useMs ? '毫秒' : '秒')
      ].join('');
      dateResult.hidden = false;
      dateResult.querySelectorAll('[data-copy]').forEach(function (button) {
        button.addEventListener('click', function () {
          window.UI.copyText(button.getAttribute('data-copy'));
        });
      });
    });

    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') root.querySelector('#tsToDate').click();
    });

    /* --------------------------- 日期 → 时间戳 --------------------------- */
    var dateInput = root.querySelector('#tsDateInput');
    var stampResult = root.querySelector('#tsStampResult');
    var stampStatus = root.querySelector('#tsStampStatus');

    function toLocalInputValue(date) {
      return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
        'T' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
    }

    dateInput.value = toLocalInputValue(new Date());

    root.querySelector('#tsNowFill').addEventListener('click', function () {
      dateInput.value = toLocalInputValue(new Date());
      window.UI.toast('已填入当前时间', 'info');
    });

    root.querySelector('#tsToTimestamp').addEventListener('click', function () {
      stampResult.hidden = true;
      stampStatus.hidden = true;

      if (!dateInput.value) {
        window.UI.toast('请选择日期时间', 'warn');
        return;
      }

      var date = new Date(dateInput.value);
      if (isNaN(date.getTime())) {
        stampStatus.className = 'status err';
        stampStatus.textContent = '日期格式无法识别，请重新选择。';
        stampStatus.hidden = false;
        return;
      }

      stampResult.innerHTML = [
        kv('秒级时间戳', String(Math.floor(date.getTime() / 1000))),
        kv('毫秒级时间戳', String(date.getTime())),
        kv('本地时间', formatLocal(date)),
        kv('ISO 8601', date.toISOString())
      ].join('');
      stampResult.hidden = false;
      stampResult.querySelectorAll('[data-copy]').forEach(function (button) {
        button.addEventListener('click', function () {
          window.UI.copyText(button.getAttribute('data-copy'));
        });
      });
    });
  }

  window.ToolModules['timestamp'] = render;
})();
