/* =============================================================================
 * 工具：URL 编解码
 * -----------------------------------------------------------------------------
 * 提供 encodeURIComponent（适合参数值）与 encodeURI（适合完整链接）两种编码方式；
 * 解码使用 decodeURIComponent，失败时说明原因（如不完整的百分号转义）。
 * 另附 URL 结构解析：协议、主机、路径、查询参数表。
 * ========================================================================== */
(function () {
  'use strict';

  function render(root) {
    root.innerHTML = `
      <div class="field">
        <div class="label-row">
          <label class="label" for="urlInput">输入内容</label>
          <span class="label-meta" id="urlCount">0 字符</span>
        </div>
        <textarea id="urlInput" class="textarea mono" rows="7" spellcheck="false"
          placeholder="输入需要编码的文本，或粘贴已经编码的 URL"></textarea>
      </div>

      <div class="form-row">
        <div class="form-item">
          <label class="label" for="urlMode">编码方式</label>
          <select id="urlMode" class="select">
            <option value="component">encodeURIComponent（参数值，推荐）</option>
            <option value="uri">encodeURI（完整链接，保留分隔符）</option>
          </select>
        </div>
      </div>

      <div class="btn-row" style="margin-top:14px">
        <button type="button" class="btn primary" id="urlEncode">编码</button>
        <button type="button" class="btn" id="urlDecode">解码</button>
        <button type="button" class="btn ghost" id="urlSample">示例</button>
        <button type="button" class="btn ghost" id="urlClear">清空</button>
      </div>

      <div class="field">
        <div class="label-row">
          <label class="label" for="urlOutput">结果</label>
          <div class="label-actions">
            <button type="button" class="link-btn" id="urlCopy">复制结果</button>
          </div>
        </div>
        <textarea id="urlOutput" class="textarea mono" rows="7" readonly
          placeholder="编码 / 解码结果会显示在这里"></textarea>
      </div>

      <p class="status" id="urlStatus" hidden></p>

      <h2 class="sub-title">解析链接结构</h2>
      <div class="field">
        <div class="label-row">
          <label class="label" for="urlParseInput">完整 URL</label>
        </div>
        <div class="form-row">
          <div class="form-item" style="flex:1 1 260px">
            <input id="urlParseInput" class="input mono" type="text" spellcheck="false"
              placeholder="https://example.com/path?page=2&tag=前端">
          </div>
          <button type="button" class="btn" id="urlParse">解析</button>
        </div>
      </div>
      <div class="kv-list" id="urlParsed" hidden></div>
      <p class="hint">解析基于浏览器原生 <code>URL</code> 对象，自动补齐协议时会按 https 处理。所有参数仅在本地解析。</p>
    `;

    var input = root.querySelector('#urlInput');
    var output = root.querySelector('#urlOutput');
    var count = root.querySelector('#urlCount');
    var status = root.querySelector('#urlStatus');
    var mode = root.querySelector('#urlMode');

    input.addEventListener('input', function () {
      count.textContent = input.value.length.toLocaleString('zh-CN') + ' 字符';
    });

    function setStatus(type, text) {
      status.className = 'status ' + type;
      status.textContent = text;
      status.hidden = false;
    }

    root.querySelector('#urlEncode').addEventListener('click', function () {
      var text = input.value;
      if (!text) {
        window.UI.toast('请先输入要编码的内容', 'warn');
        input.focus();
        return;
      }
      try {
        output.value = mode.value === 'uri' ? encodeURI(text) : encodeURIComponent(text);
        setStatus('ok', '编码完成：' + text.length.toLocaleString('zh-CN') + ' 字符 → ' +
          output.value.length.toLocaleString('zh-CN') + ' 字符。');
        window.UI.toast('编码完成', 'success');
      } catch (error) {
        // 例如文本中含有孤立代理项（非法 UTF-16）
        setStatus('err', '编码失败：' + error.message);
        window.UI.toast('编码失败，内容包含非法字符', 'error');
      }
    });

    root.querySelector('#urlDecode').addEventListener('click', function () {
      var text = input.value.trim();
      if (!text) {
        window.UI.toast('请先粘贴需要解码的内容', 'warn');
        input.focus();
        return;
      }
      try {
        output.value = decodeURIComponent(text);
        setStatus('ok', '解码完成：输出 ' + output.value.length.toLocaleString('zh-CN') + ' 字符。');
        window.UI.toast('解码完成', 'success');
      } catch (error) {
        output.value = '';
        setStatus('err', '解码失败：内容中存在不完整或非法的百分号转义（例如单独的 "%" 或 "%ZZ"）。请检查后重试。');
        window.UI.toast('不是合法的 URL 编码字符串', 'error');
      }
    });

    root.querySelector('#urlSample').addEventListener('click', function () {
      input.value = 'https://example.com/search?q=集成工具&from=首页';
      count.textContent = input.value.length.toLocaleString('zh-CN') + ' 字符';
      status.hidden = true;
      output.value = '';
      root.querySelector('#urlEncode').click();
    });

    root.querySelector('#urlClear').addEventListener('click', function () {
      input.value = '';
      output.value = '';
      count.textContent = '0 字符';
      status.hidden = true;
      input.focus();
      window.UI.toast('已清空', 'success');
    });

    root.querySelector('#urlCopy').addEventListener('click', function () {
      window.UI.copyText(output.value);
    });

    /* ------------------------------ URL 解析 ------------------------------ */
    var parseInput = root.querySelector('#urlParseInput');
    var parsed = root.querySelector('#urlParsed');

    function row(key, value) {
      var safe = window.UI.escapeHtml(value);
      return '<div class="kv">' +
        '<span class="kv-key">' + window.UI.escapeHtml(key) + '</span>' +
        '<span class="kv-val" title="' + safe + '">' + safe + '</span>' +
        '<button type="button" class="link-btn" data-copy="' + safe + '">复制</button>' +
        '</div>';
    }

    root.querySelector('#urlParse').addEventListener('click', function () {
      var raw = parseInput.value.trim();
      if (!raw) {
        window.UI.toast('请先输入完整 URL', 'warn');
        parseInput.focus();
        return;
      }
      var url;
      try {
        url = new URL(raw);
      } catch (e) {
        try {
          url = new URL('https://' + raw);
        } catch (e2) {
          parsed.hidden = true;
          window.UI.toast('无法解析该 URL，请检查格式', 'error');
          return;
        }
      }

      var params = [];
      url.searchParams.forEach(function (value, key) {
        params.push(key + ' = ' + value);
      });

      var rows = [
        row('协议', url.protocol.replace(':', '')),
        row('主机', url.host),
        row('路径', url.pathname),
        row('查询串', url.search || '（无）'),
        row('锚点', url.hash || '（无）')
      ];
      if (params.length) {
        params.forEach(function (item, index) {
          rows.push(row('参数 ' + (index + 1), item));
        });
      } else {
        rows.push(row('参数', '（无）'));
      }

      parsed.innerHTML = rows.join('');
      parsed.hidden = false;

      parsed.querySelectorAll('[data-copy]').forEach(function (button) {
        button.addEventListener('click', function () {
          window.UI.copyText(button.getAttribute('data-copy'));
        });
      });
      window.UI.toast('解析完成，共 ' + params.length + ' 个参数', 'success');
    });

    // 回车即解析
    parseInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        root.querySelector('#urlParse').click();
      }
    });
  }

  window.ToolModules['url-codec'] = render;
})();
