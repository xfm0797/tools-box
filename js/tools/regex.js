/* =============================================================================
 * 工具：正则表达式测试
 * -----------------------------------------------------------------------------
 * 输入变化后防抖执行（180ms），实时给出高亮预览、匹配明细与替换结果；
 * 对零长度匹配、超多匹配（>1000）与非法表达式都做了保护，避免死循环或页面卡死。
 * ========================================================================== */
(function () {
  'use strict';

  var MAX_MATCHES = 1000;

  function render(root) {
    root.innerHTML = `
      <div class="field">
        <div class="label-row">
          <label class="label" for="rePattern">正则表达式</label>
          <span class="label-meta">无需输入两侧的 /</span>
        </div>
        <div class="form-row">
          <div class="form-item" style="flex:1 1 260px">
            <input id="rePattern" class="input mono" type="text" spellcheck="false"
              placeholder="例如：\\d{4}-\\d{2}-\\d{2}" value="\\d{4}-\\d{2}-\\d{2}">
          </div>
        </div>
        <div class="check-row" style="margin-top:10px">
          <label class="check"><input type="checkbox" data-flag="g" checked> g 全局</label>
          <label class="check"><input type="checkbox" data-flag="i"> i 忽略大小写</label>
          <label class="check"><input type="checkbox" data-flag="m"> m 多行</label>
          <label class="check"><input type="checkbox" data-flag="s"> s 点匹配换行</label>
          <label class="check"><input type="checkbox" data-flag="u"> u Unicode</label>
          <label class="check"><input type="checkbox" data-flag="y"> y 粘连</label>
        </div>
      </div>

      <div class="field">
        <div class="label-row">
          <label class="label" for="reText">测试文本</label>
          <span class="label-meta" id="reMeta">0 字符</span>
        </div>
        <textarea id="reText" class="textarea" rows="8" spellcheck="false"
          placeholder="粘贴需要匹配的文本">发布日期：2024-05-01，更新于 2025-11-06。</textarea>
      </div>

      <div class="field">
        <label class="label" for="reReplace">替换为（支持 $1、$&amp; 等语法，可留空）</label>
        <input id="reReplace" class="input mono" type="text" spellcheck="false" placeholder="例如：[$&]">
      </div>

      <div class="btn-row">
        <button type="button" class="btn primary" id="reRun">执行匹配</button>
        <button type="button" class="btn ghost" id="reSample">示例</button>
        <button type="button" class="btn ghost" id="reClear">清空</button>
        <button type="button" class="link-btn" id="reCopy">复制全部匹配</button>
      </div>

      <p class="status" id="reStatus" hidden></p>

      <h2 class="sub-title">匹配预览</h2>
      <div class="preview-box" id="rePreview">尚未执行匹配</div>

      <h2 class="sub-title">匹配明细 <span class="label-meta" id="reCount"></span></h2>
      <div class="match-list" id="reMatches"></div>

      <h2 class="sub-title">替换结果</h2>
      <div class="preview-box" id="reReplaced">—</div>

      <p class="hint">支持 g / i / m / s / u / y 标志；单个表达式最多展示 1000 处匹配。超长文本搭配复杂表达式时解析可能耗时，建议先用小段文本验证。</p>
    `;

    var patternInput = root.querySelector('#rePattern');
    var textInput = root.querySelector('#reText');
    var replaceInput = root.querySelector('#reReplace');
    var preview = root.querySelector('#rePreview');
    var replacedBox = root.querySelector('#reReplaced');
    var matchesBox = root.querySelector('#reMatches');
    var status = root.querySelector('#reStatus');
    var countLabel = root.querySelector('#reCount');
    var meta = root.querySelector('#reMeta');
    var lastMatches = [];

    function getFlags() {
      var result = '';
      root.querySelectorAll('[data-flag]').forEach(function (box) {
        if (box.checked) result += box.dataset.flag;
      });
      return result;
    }

    function escapeHtml(text) {
      return window.UI.escapeHtml(text);
    }

    function setStatus(type, text) {
      status.className = 'status ' + type;
      status.textContent = text;
      status.hidden = false;
    }

    /** 根据匹配区间生成带 <mark> 的高亮 HTML */
    function buildHighlight(text, regex) {
      var globalRegex = new RegExp(regex.source, regex.flags.indexOf('g') === -1 ? regex.flags + 'g' : regex.flags);
      var html = '';
      var cursor = 0;
      var guard = 0;
      var match;

      while ((match = globalRegex.exec(text)) !== null) {
        guard += 1;
        if (guard > 5000) break;
        html += escapeHtml(text.slice(cursor, match.index));
        html += '<mark>' + escapeHtml(match[0]) + '</mark>';
        cursor = match.index + match[0].length;
        if (match[0] === '') {
          // 零长度匹配：手动推进，防止死循环
          globalRegex.lastIndex += 1;
          if (globalRegex.lastIndex > text.length) break;
          html += escapeHtml(text.slice(cursor, globalRegex.lastIndex));
          cursor = globalRegex.lastIndex;
        }
      }
      html += escapeHtml(text.slice(cursor));
      return html;
    }

    function run() {
      var pattern = patternInput.value;
      var text = textInput.value;
      var flagsValue = getFlags();

      meta.textContent = text.length.toLocaleString('zh-CN') + ' 字符';
      lastMatches = [];

      if (!pattern) {
        preview.textContent = '尚未执行匹配';
        replacedBox.textContent = '—';
        matchesBox.innerHTML = '';
        countLabel.textContent = '';
        status.hidden = true;
        return;
      }

      var regex;
      try {
        regex = new RegExp(pattern, flagsValue);
      } catch (error) {
        preview.textContent = '表达式无效';
        replacedBox.textContent = '—';
        matchesBox.innerHTML = '';
        countLabel.textContent = '';
        setStatus('err', '正则语法错误：' + error.message);
        return;
      }

      if (!text) {
        preview.textContent = '请输入测试文本';
        replacedBox.textContent = '—';
        matchesBox.innerHTML = '';
        countLabel.textContent = '';
        status.hidden = true;
        return;
      }

      // 收集匹配（强制全局遍历，同时保留原 flags 语义）
      var globalRegex = new RegExp(regex.source, flagsValue.indexOf('g') === -1 ? flagsValue + 'g' : flagsValue);
      var match;
      var guard = 0;
      while ((match = globalRegex.exec(text)) !== null) {
        guard += 1;
        if (guard > MAX_MATCHES) break;
        lastMatches.push({
          index: match.index,
          value: match[0],
          groups: match.slice(1)
        });
        if (match[0] === '') {
          globalRegex.lastIndex += 1;
          if (globalRegex.lastIndex > text.length) break;
        }
      }

      preview.innerHTML = buildHighlight(text, regex).replace(/\n/g, '<br>');

      // 替换结果（仅在填写替换内容时展示）
      if (replaceInput.value !== '') {
        try {
          replacedBox.textContent = text.replace(regex, replaceInput.value);
        } catch (error) {
          replacedBox.textContent = '替换失败：' + error.message;
        }
      } else {
        replacedBox.textContent = '（未填写替换内容，当前仅做匹配）';
      }

      if (!lastMatches.length) {
        countLabel.textContent = '';
        matchesBox.innerHTML = '<p class="hint" style="margin:0">没有匹配到任何内容。</p>';
        setStatus('info', '未匹配到结果，可尝试调整表达式或勾选 "i" 忽略大小写。');
        return;
      }

      countLabel.textContent = '共 ' + lastMatches.length + ' 处' +
        (guard > MAX_MATCHES ? '（仅显示前 ' + MAX_MATCHES + ' 处）' : '');

      matchesBox.innerHTML = lastMatches.map(function (item, index) {
        var groups = item.groups.length
          ? '<span class="group">分组：' + item.groups.map(function (group) {
            return group === undefined ? 'undefined' : '“' + escapeHtml(group) + '”';
          }).join('，') + '</span>'
          : '';
        return '<div class="match-item"><span class="idx">#' + (index + 1) + ' @' + item.index +
          '</span><span class="val">' + escapeHtml(item.value || '（空匹配）') + groups + '</span></div>';
      }).join('');

      setStatus('ok', '匹配成功：' + lastMatches.length + ' 处结果，表达式 /' + pattern + '/' + flagsValue);
    }

    var debouncedRun = window.UI.debounce(run, 180);

    patternInput.addEventListener('input', debouncedRun);
    textInput.addEventListener('input', debouncedRun);
    replaceInput.addEventListener('input', debouncedRun);
    root.querySelectorAll('[data-flag]').forEach(function (box) {
      box.addEventListener('change', run);
    });

    root.querySelector('#reRun').addEventListener('click', run);

    root.querySelector('#reSample').addEventListener('click', function () {
      patternInput.value = '(\\d{4})-(\\d{2})-(\\d{2})';
      textInput.value = '发布日期：2024-05-01，更新于 2025-11-06。\n另一个日期 1999-12-31。';
      replaceInput.value = '$1年$2月$3日';
      root.querySelector('[data-flag="g"]').checked = true;
      run();
      window.UI.toast('已填入示例', 'info');
    });

    root.querySelector('#reClear').addEventListener('click', function () {
      patternInput.value = '';
      textInput.value = '';
      replaceInput.value = '';
      preview.textContent = '尚未执行匹配';
      replacedBox.textContent = '—';
      matchesBox.innerHTML = '';
      countLabel.textContent = '';
      meta.textContent = '0 字符';
      status.hidden = true;
      patternInput.focus();
      window.UI.toast('已清空', 'success');
    });

    root.querySelector('#reCopy').addEventListener('click', function () {
      if (!lastMatches.length) {
        window.UI.toast('没有可复制的匹配结果', 'warn');
        return;
      }
      window.UI.copyText(lastMatches.map(function (item) { return item.value; }).join('\n'));
    });

    run();
  }

  window.ToolModules['regex'] = render;
})();
