/* =============================================================================
 * 工具：随机密码 / 随机数
 * -----------------------------------------------------------------------------
 * 随机源优先使用 crypto.getRandomValues（操作系统级熵池），并用拒绝采样消除取模偏差；
 * 密码保证包含每一种被勾选的字符类型，再用 Fisher-Yates 洗牌打散位置。
 * ========================================================================== */
(function () {
  'use strict';

  var POOLS = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: 'abcdefghijklmnopqrstuvwxyz',
    digits: '0123456789',
    symbols: '!@#$%^&*()-_=+[]{};:,.?/~'
  };
  var AMBIGUOUS = /[il1Lo0O]/g;

  /** 0 ~ max-1 的安全随机整数（拒绝采样，避免取模偏差） */
  function randomInt(max) {
    if (max <= 1) return 0;
    var limit = Math.floor(4294967296 / max) * max;
    var buffer = new Uint32Array(1);
    var value = 0;
    var guard = 0;
    do {
      if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(buffer);
      } else {
        buffer[0] = Math.floor(Math.random() * 4294967296);
      }
      value = buffer[0];
      guard += 1;
    } while (value >= limit && guard < 1000);
    return value % max;
  }

  function shuffle(array) {
    for (var i = array.length - 1; i > 0; i -= 1) {
      var j = randomInt(i + 1);
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }

  function strengthOf(entropy) {
    if (entropy < 40) return { text: '弱', color: '#ef4444', percent: 30 };
    if (entropy < 60) return { text: '中等', color: '#f59e0b', percent: 55 };
    if (entropy < 80) return { text: '强', color: '#10b981', percent: 80 };
    return { text: '很强', color: '#059669', percent: 100 };
  }

  function render(root) {
    root.innerHTML = `
      <div class="tabs" role="tablist" aria-label="随机生成模式">
        <button type="button" class="tab active" role="tab" aria-selected="true" data-tab="password">随机密码</button>
        <button type="button" class="tab" role="tab" aria-selected="false" data-tab="number">随机数</button>
      </div>

      <section data-panel="password">
        <div class="form-row stack">
          <div class="form-item">
            <label class="label" for="pwLength">密码长度：<span id="pwLengthValue">16</span> 位</label>
            <div class="range-row">
              <input id="pwLengthRange" type="range" min="4" max="64" value="16">
              <input id="pwLength" class="input" type="number" min="4" max="64" value="16" style="width:82px">
            </div>
          </div>
          <div class="form-item" style="flex:0 1 130px">
            <label class="label" for="pwCount">生成数量</label>
            <select id="pwCount" class="select">
              <option>1</option>
              <option>3</option>
              <option selected>5</option>
              <option>10</option>
            </select>
          </div>
        </div>

        <div class="check-row" style="margin-top:14px">
          <label class="check"><input type="checkbox" id="pwUpper" checked> 大写字母 A-Z</label>
          <label class="check"><input type="checkbox" id="pwLower" checked> 小写字母 a-z</label>
          <label class="check"><input type="checkbox" id="pwDigits" checked> 数字 0-9</label>
          <label class="check"><input type="checkbox" id="pwSymbols" checked> 符号 !@#$</label>
          <label class="check"><input type="checkbox" id="pwNoAmbiguous"> 排除易混淆字符（0/O、1/l/I）</label>
        </div>

        <div class="btn-row" style="margin-top:14px">
          <button type="button" class="btn primary" id="pwGenerate">生成密码</button>
          <button type="button" class="btn" id="pwCopyAll">复制全部</button>
          <button type="button" class="btn ghost" id="pwSample">示例</button>
          <button type="button" class="btn ghost" id="pwClear">清空</button>
        </div>

        <div class="meter"><div class="meter-fill" id="pwMeter"></div></div>
        <p class="meter-text" id="pwMeterText">等待生成</p>

        <div class="pw-list" id="pwList"></div>
        <p class="hint">密码仅在本机生成，不会保存或上传。请及时保存到可信的密码管理器中。</p>
      </section>

      <section data-panel="number" hidden>
        <div class="form-row">
          <div class="form-item">
            <label class="label" for="rnMin">最小值（含）</label>
            <input id="rnMin" class="input mono" type="number" value="1">
          </div>
          <div class="form-item">
            <label class="label" for="rnMax">最大值（含）</label>
            <input id="rnMax" class="input mono" type="number" value="100">
          </div>
          <div class="form-item">
            <label class="label" for="rnCount">生成个数</label>
            <input id="rnCount" class="input mono" type="number" value="5" min="1" max="1000">
          </div>
          <div class="form-item" style="flex:0 1 130px">
            <label class="label" for="rnSort">排序</label>
            <select id="rnSort" class="select">
              <option value="none">不排序</option>
              <option value="asc">升序</option>
              <option value="desc">降序</option>
            </select>
          </div>
        </div>

        <div class="check-row" style="margin-top:12px">
          <label class="check"><input type="checkbox" id="rnUnique"> 结果不重复</label>
        </div>

        <div class="btn-row" style="margin-top:14px">
          <button type="button" class="btn primary" id="rnGenerate">生成随机数</button>
          <button type="button" class="link-btn" id="rnCopy">复制结果</button>
          <button type="button" class="btn ghost" id="rnSample">示例</button>
          <button type="button" class="btn ghost" id="rnClear">清空</button>
        </div>

        <div class="field">
          <label class="label" for="rnOutput">结果</label>
          <textarea id="rnOutput" class="textarea mono" rows="5" readonly placeholder="结果会显示在这里"></textarea>
        </div>
        <p class="status" id="rnStatus" hidden></p>
        <p class="hint">取值范围为闭区间；勾选「结果不重复」时，区间内的整数个数必须不少于生成个数。</p>
      </section>
    `;

    window.UI.initTabs(root);

    /* ------------------------------ 密码 ------------------------------ */
    var lengthRange = root.querySelector('#pwLengthRange');
    var lengthInput = root.querySelector('#pwLength');
    var lengthValue = root.querySelector('#pwLengthValue');
    var pwList = root.querySelector('#pwList');
    var meter = root.querySelector('#pwMeter');
    var meterText = root.querySelector('#pwMeterText');
    var generated = [];

    function syncLength(value) {
      var length = Math.min(64, Math.max(4, Math.round(Number(value) || 16)));
      lengthRange.value = length;
      lengthInput.value = length;
      lengthValue.textContent = length;
      return length;
    }

    lengthRange.addEventListener('input', function () { syncLength(lengthRange.value); });
    lengthInput.addEventListener('input', function () { syncLength(lengthInput.value); });
    lengthInput.addEventListener('blur', function () { syncLength(lengthInput.value); });

    function buildPool() {
      var pool = '';
      if (root.querySelector('#pwUpper').checked) pool += POOLS.upper;
      if (root.querySelector('#pwLower').checked) pool += POOLS.lower;
      if (root.querySelector('#pwDigits').checked) pool += POOLS.digits;
      if (root.querySelector('#pwSymbols').checked) pool += POOLS.symbols;
      if (root.querySelector('#pwNoAmbiguous').checked) pool = pool.replace(AMBIGUOUS, '');
      return pool;
    }

    function generatePassword(length, pool) {
      var chars = [];
      // 先保证每类字符至少出现一次
      var groups = [];
      if (root.querySelector('#pwUpper').checked) groups.push(POOLS.upper);
      if (root.querySelector('#pwLower').checked) groups.push(POOLS.lower);
      if (root.querySelector('#pwDigits').checked) groups.push(POOLS.digits);
      if (root.querySelector('#pwSymbols').checked) groups.push(POOLS.symbols);

      var noAmbiguous = root.querySelector('#pwNoAmbiguous').checked;
      groups.forEach(function (group) {
        var usable = noAmbiguous ? group.replace(AMBIGUOUS, '') : group;
        if (usable.length && chars.length < length) {
          chars.push(usable.charAt(randomInt(usable.length)));
        }
      });

      while (chars.length < length) {
        chars.push(pool.charAt(randomInt(pool.length)));
      }
      return shuffle(chars).join('');
    }

    function renderPasswords() {
      pwList.innerHTML = generated.map(function (password, index) {
        return '<div class="pw-item"><span>' + window.UI.escapeHtml(password) + '</span>' +
          '<button type="button" class="link-btn" data-index="' + index + '">复制</button></div>';
      }).join('');
    }

    root.querySelector('#pwGenerate').addEventListener('click', function () {
      var pool = buildPool();
      if (!pool) {
        window.UI.toast('请至少勾选一种字符类型', 'warn');
        return;
      }
      var length = syncLength(lengthInput.value);
      var count = Number(root.querySelector('#pwCount').value) || 1;

      generated = [];
      for (var i = 0; i < count; i += 1) {
        generated.push(generatePassword(length, pool));
      }
      renderPasswords();

      var entropy = length * Math.log2(pool.length);
      var strength = strengthOf(entropy);
      meter.style.width = strength.percent + '%';
      meter.style.background = strength.color;
      meterText.textContent = '强度：' + strength.text + ' · 约 ' + Math.round(entropy) + ' 位熵（字符池 ' + pool.length + ' 个）';
      window.UI.toast('已生成 ' + count + ' 个密码', 'success');
    });

    pwList.addEventListener('click', function (event) {
      var button = event.target.closest('[data-index]');
      if (!button) return;
      var index = Number(button.getAttribute('data-index'));
      window.UI.copyText(generated[index]);
    });

    root.querySelector('#pwCopyAll').addEventListener('click', function () {
      if (!generated.length) {
        window.UI.toast('还没有生成密码', 'warn');
        return;
      }
      window.UI.copyText(generated.join('\n'));
    });

    root.querySelector('#pwSample').addEventListener('click', function () {
      syncLength(20);
      root.querySelector('#pwUpper').checked = true;
      root.querySelector('#pwLower').checked = true;
      root.querySelector('#pwDigits').checked = true;
      root.querySelector('#pwSymbols').checked = true;
      root.querySelector('#pwNoAmbiguous').checked = false;
      root.querySelector('#pwCount').value = '5';
      root.querySelector('#pwGenerate').click();
      window.UI.toast('已套用「高强度」示例配置', 'info');
    });

    root.querySelector('#pwClear').addEventListener('click', function () {
      generated = [];
      pwList.innerHTML = '';
      meter.style.width = '0';
      meterText.textContent = '等待生成';
      window.UI.toast('已清空', 'success');
    });

    /* ------------------------------ 随机数 ------------------------------ */
    var output = root.querySelector('#rnOutput');
    var rnStatus = root.querySelector('#rnStatus');

    function setStatus(type, text) {
      rnStatus.className = 'status ' + type;
      rnStatus.textContent = text;
      rnStatus.hidden = false;
    }

    root.querySelector('#rnGenerate').addEventListener('click', function () {
      rnStatus.hidden = true;
      var min = Number(root.querySelector('#rnMin').value);
      var max = Number(root.querySelector('#rnMax').value);
      var count = Number(root.querySelector('#rnCount').value);
      var unique = root.querySelector('#rnUnique').checked;
      var sortMode = root.querySelector('#rnSort').value;

      if (!Number.isFinite(min) || !Number.isFinite(max)) {
        setStatus('err', '最小值与最大值必须是有效数字。');
        return;
      }
      if (!Number.isInteger(min) || !Number.isInteger(max)) {
        setStatus('err', '为了避免浮点误差，请填写整数。');
        return;
      }
      if (min > max) {
        setStatus('err', '最小值不能大于最大值。');
        return;
      }
      if (!Number.isInteger(count) || count < 1 || count > 1000) {
        setStatus('err', '生成个数需为 1 ~ 1000 之间的整数。');
        return;
      }

      var range = max - min + 1;
      if (unique && count > range) {
        setStatus('err', '区间内只有 ' + range + ' 个整数，无法生成 ' + count + ' 个互不相同的数。');
        return;
      }
      if (range > 4294967295) {
        setStatus('err', '区间过大，请把范围控制在 0 ~ 4294967295 之内。');
        return;
      }

      var values = [];
      if (unique) {
        var used = Object.create(null);
        while (values.length < count) {
          var candidate = min + randomInt(range);
          if (!used[candidate]) {
            used[candidate] = true;
            values.push(candidate);
          }
        }
      } else {
        for (var i = 0; i < count; i += 1) values.push(min + randomInt(range));
      }

      if (sortMode === 'asc') values.sort(function (a, b) { return a - b; });
      if (sortMode === 'desc') values.sort(function (a, b) { return b - a; });

      output.value = values.join(', ');
      setStatus('ok', '已生成 ' + values.length + ' 个随机整数，范围 [' + min + ', ' + max + ']' +
        (unique ? '，互不重复。' : '。'));
      window.UI.toast('生成完成', 'success');
    });

    root.querySelector('#rnSample').addEventListener('click', function () {
      root.querySelector('#rnMin').value = '1';
      root.querySelector('#rnMax').value = '100';
      root.querySelector('#rnCount').value = '5';
      root.querySelector('#rnUnique').checked = true;
      root.querySelector('#rnSort').value = 'asc';
      root.querySelector('#rnGenerate').click();
      window.UI.toast('已套用示例配置', 'info');
    });

    root.querySelector('#rnCopy').addEventListener('click', function () {
      window.UI.copyText(output.value);
    });

    root.querySelector('#rnClear').addEventListener('click', function () {
      output.value = '';
      rnStatus.hidden = true;
      window.UI.toast('已清空', 'success');
    });

    // 默认先生成一组，便于直接使用
    root.querySelector('#pwGenerate').click();
  }

  window.ToolModules['random'] = render;
})();
