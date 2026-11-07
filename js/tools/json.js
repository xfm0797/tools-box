/* =============================================================================
 * 工具：JSON 格式化 / 压缩 / 校验
 * -----------------------------------------------------------------------------
 * 逻辑全部基于原生 JSON.parse / JSON.stringify，异常统一转换为可读提示，
 * 并从原生错误信息中解析出错位置（行列）。大文本给出提示后异步执行，避免阻塞。
 * ========================================================================== */
(function () {
  'use strict';

  var SAMPLE = {
    site: '集成工具大全',
    version: '1.0.0',
    local: true,
    tools: [
      { id: 'json-format', name: 'JSON 格式化', category: '开发辅助' },
      { id: 'base64', name: 'Base64 编解码', category: '编码解码' },
      { id: 'qrcode', name: '二维码生成', category: '开发辅助' }
    ],
    author: { name: '你的名字', tags: ['前端', '纯静态', '无后端'] },
    updated: '2024-05-01'
  };

  var LARGE_TEXT = 500 * 1024; // 超过 500KB 提示可能耗时

  function render(root) {
    root.innerHTML = `
      <div class="field">
        <div class="label-row">
          <label class="label" for="jsonInput">输入 JSON</label>
          <span class="label-meta" id="jsonCount">0 字符</span>
        </div>
        <textarea id="jsonInput" class="textarea mono" rows="10" spellcheck="false"
          placeholder='粘贴 JSON，例如：{"name":"工具箱","tags":["实用","本地"]}'></textarea>
      </div>

      <div class="btn-row">
        <button type="button" class="btn primary" id="jsonFormat">格式化</button>
        <button type="button" class="btn" id="jsonMinify">压缩</button>
        <button type="button" class="btn" id="jsonValidate">校验</button>
        <button type="button" class="btn ghost" id="jsonSample">示例</button>
        <button type="button" class="btn ghost" id="jsonClear">清空</button>
      </div>

      <div class="field">
        <div class="label-row">
          <label class="label" for="jsonOutput">结果</label>
          <div class="label-actions">
            <button type="button" class="link-btn" id="jsonCopy">复制结果</button>
          </div>
        </div>
        <textarea id="jsonOutput" class="textarea mono" rows="12" readonly
          placeholder="格式化或压缩后的结果会显示在这里"></textarea>
      </div>

      <p class="status" id="jsonStatus" hidden></p>
      <p class="hint">支持标准 JSON（不含注释、尾逗号）。校验失败时会给出出错的行号与列号，方便定位。</p>
    `;

    var input = root.querySelector('#jsonInput');
    var output = root.querySelector('#jsonOutput');
    var status = root.querySelector('#jsonStatus');
    var count = root.querySelector('#jsonCount');

    function setStatus(type, text) {
      status.className = 'status ' + type;
      status.textContent = text;
      status.hidden = false;
    }

    function clearStatus() {
      status.hidden = true;
      status.textContent = '';
    }

    function updateCount() {
      count.textContent = input.value.length.toLocaleString('zh-CN') + ' 字符';
    }

    /** 从 JSON 解析错误信息中提取行列位置 */
    function locateError(message, text) {
      var lineColumn = /line\s+(\d+)\s+column\s+(\d+)/i.exec(message);
      if (lineColumn) {
        return { line: Number(lineColumn[1]), column: Number(lineColumn[2]) };
      }
      var position = /position\s+(\d+)/i.exec(message);
      if (!position) return null;
      var index = Math.min(Number(position[1]), text.length);
      var before = text.slice(0, index);
      var line = before.split('\n').length;
      var column = index - before.lastIndexOf('\n');
      return { line: line, column: column };
    }

    function describeType(value) {
      if (value === null) return 'null';
      if (Array.isArray(value)) return '数组（' + value.length + ' 项）';
      var type = typeof value;
      if (type === 'object') {
        return '对象（' + Object.keys(value).length + ' 个键）';
      }
      if (type === 'string') return '字符串（' + value.length + ' 字符）';
      if (type === 'number') return '数字';
      if (type === 'boolean') return '布尔值';
      return type;
    }

    /** 统一执行入口：task 为 'format' | 'minify' | 'validate' */
    function run(task) {
      var text = input.value;
      if (!text.trim()) {
        clearStatus();
        window.UI.toast('请先输入 JSON 内容', 'warn');
        input.focus();
        return;
      }

      var execute = function () {
        var value;
        try {
          value = JSON.parse(text);
        } catch (error) {
          var where = locateError(error.message, text);
          var positionText = where ? `（第 ${where.line} 行，第 ${where.column} 列）` : '';
          output.value = '';
          setStatus('err', '解析失败' + positionText + '：' + error.message);
          window.UI.toast('JSON 格式有误，请查看下方提示', 'error');
          return;
        }

        if (task === 'validate') {
          setStatus('ok', '校验通过：合法 JSON，顶层类型为 ' + describeType(value) +
            '，原文本 ' + text.length.toLocaleString('zh-CN') + ' 字符。');
          window.UI.toast('JSON 格式正确', 'success');
          return;
        }

        var result;
        if (task === 'format') {
          result = JSON.stringify(value, null, 2);
          setStatus('ok', '格式化完成：' + describeType(value) + '，输出 ' +
            result.length.toLocaleString('zh-CN') + ' 字符。');
        } else {
          result = JSON.stringify(value);
          var saved = text.length - result.length;
          setStatus('ok', '压缩完成：' + result.length.toLocaleString('zh-CN') + ' 字符' +
            (saved > 0 ? '，比原文减少 ' + saved.toLocaleString('zh-CN') + ' 字符。' : '。'));
        }
        output.value = result;
        window.UI.toast(task === 'format' ? '格式化完成' : '压缩完成', 'success');
      };

      // 大文本：先让浏览器有机会重绘，再执行解析
      if (text.length > LARGE_TEXT) {
        setStatus('info', '文本较大（' + (text.length / 1024).toFixed(0) + ' KB），正在处理…');
        setTimeout(execute, 30);
      } else {
        execute();
      }
    }

    input.addEventListener('input', updateCount);
    root.querySelector('#jsonFormat').addEventListener('click', function () { run('format'); });
    root.querySelector('#jsonMinify').addEventListener('click', function () { run('minify'); });
    root.querySelector('#jsonValidate').addEventListener('click', function () { run('validate'); });

    root.querySelector('#jsonSample').addEventListener('click', function () {
      input.value = JSON.stringify(SAMPLE, null, 2);
      updateCount();
      run('format');
      window.UI.toast('已填入示例', 'info');
    });

    root.querySelector('#jsonClear').addEventListener('click', function () {
      input.value = '';
      output.value = '';
      updateCount();
      clearStatus();
      input.focus();
      window.UI.toast('已清空', 'success');
    });

    root.querySelector('#jsonCopy').addEventListener('click', function () {
      if (!output.value) {
        window.UI.toast('还没有可复制的结果', 'warn');
        return;
      }
      window.UI.copyText(output.value);
    });

    // 键盘快捷键：Ctrl/Cmd + Enter 格式化
    input.addEventListener('keydown', function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        run('format');
      }
    });

    updateCount();
  }

  window.ToolModules['json-format'] = render;
})();
