/* =============================================================================
 * 工具：文本处理（大小写转换 + 字数统计）
 * -----------------------------------------------------------------------------
 * 转换结果输出到独立文本域，原始内容不被覆盖，便于对比；
 * 统计采用防抖计算（150ms），长文本也不会因每次按键全量正则匹配而卡顿。
 * ========================================================================== */
(function () {
  'use strict';

  /** 统计各类文本指标 */
  function analyze(text) {
    var chars = text.length;
    var charsNoSpace = text.replace(/\s/g, '').length;

    // 汉字（含扩展区）按字符计数
    var cjkMatches = text.match(/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g);
    var cjk = cjkMatches ? cjkMatches.length : 0;

    // 英文单词 / 数字串
    var words = text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g);
    var wordCount = words ? words.length : 0;

    var lines = text.length === 0 ? 0 : text.split('\n').length;
    var paragraphs = text.split(/\n\s*\n/).filter(function (block) {
      return block.trim().length > 0;
    }).length;

    var bytes = new TextEncoder().encode(text).length;

    return {
      chars: chars,
      charsNoSpace: charsNoSpace,
      cjk: cjk,
      words: wordCount,
      lines: lines,
      paragraphs: paragraphs,
      bytes: bytes
    };
  }

  function render(root) {
    root.innerHTML = `
      <div class="field">
        <div class="label-row">
          <label class="label" for="textInput">原始文本</label>
          <span class="label-meta" id="textMeta">0 字符</span>
        </div>
        <textarea id="textInput" class="textarea" rows="9" spellcheck="false"
          placeholder="在这里输入或粘贴文本，下方会实时统计字数"></textarea>
      </div>

      <div class="btn-row">
        <button type="button" class="btn sm" data-op="upper">全部大写</button>
        <button type="button" class="btn sm" data-op="lower">全部小写</button>
        <button type="button" class="btn sm" data-op="title">单词首字母大写</button>
        <button type="button" class="btn sm" data-op="sentence">句首字母大写</button>
        <button type="button" class="btn sm" data-op="reverse">反转文本</button>
        <button type="button" class="btn sm" data-op="collapse">合并多余空白</button>
        <button type="button" class="btn sm" data-op="blank">删除空行</button>
        <button type="button" class="btn sm ghost" data-op="sample">示例</button>
        <button type="button" class="btn sm ghost" data-op="clear">清空</button>
      </div>

      <div class="field">
        <div class="label-row">
          <label class="label" for="textOutput">转换结果</label>
          <div class="label-actions">
            <button type="button" class="link-btn" id="textCopy">复制结果</button>
            <button type="button" class="link-btn" id="textUseAsInput">用作原文</button>
          </div>
        </div>
        <textarea id="textOutput" class="textarea" rows="8" readonly placeholder="转换结果会显示在这里"></textarea>
      </div>

      <div class="stat-grid" id="textStats"></div>
      <p class="hint">统计口径：字符数按 UTF-16 码元计（与 JS <code>length</code> 一致），汉字单独统计，单词按连续英文字母 / 数字计，字节数按 UTF-8 编码计算。</p>
    `;

    var input = root.querySelector('#textInput');
    var output = root.querySelector('#textOutput');
    var meta = root.querySelector('#textMeta');
    var stats = root.querySelector('#textStats');

    function renderStats() {
      var data = analyze(input.value);
      var items = [
        { label: '字符数(含空格)', value: data.chars },
        { label: '字符数(不含空格)', value: data.charsNoSpace },
        { label: '汉字数', value: data.cjk },
        { label: '英文单词 / 数字', value: data.words },
        { label: '行数', value: data.lines },
        { label: '段落数', value: data.paragraphs },
        { label: 'UTF-8 字节', value: data.bytes }
      ];
      stats.innerHTML = items.map(function (item) {
        return '<div class="stat"><div class="stat-value">' + item.value.toLocaleString('zh-CN') +
          '</div><div class="stat-label">' + item.label + '</div></div>';
      }).join('');
      meta.textContent = data.chars.toLocaleString('zh-CN') + ' 字符';
    }

    var updateStats = window.UI.debounce(renderStats, 150);

    input.addEventListener('input', updateStats);

    var operations = {
      upper: function (text) { return text.toUpperCase(); },
      lower: function (text) { return text.toLowerCase(); },
      title: function (text) {
        return text.toLowerCase().replace(/(^|[\s\-_\/(\[{'"“”])([a-z\u00c0-\u024f])/g, function (match, prefix, char) {
          return prefix + char.toUpperCase();
        });
      },
      sentence: function (text) {
        var lower = text.toLowerCase();
        // 句首（开头或 . ! ? 换行之后）的首个字母大写
        return lower.replace(/(^|[.!?。！？\n]\s*)([a-z\u00c0-\u024f])/g, function (match, prefix, char) {
          return prefix + char.toUpperCase();
        });
      },
      reverse: function (text) {
        // 按码点反转，避免 emoji 被拆散
        return Array.from(text).reverse().join('');
      },
      collapse: function (text) {
        return text.replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n\n').trim();
      },
      blank: function (text) {
        return text.split('\n').filter(function (line) {
          return line.trim().length > 0;
        }).join('\n');
      }
    };

    root.querySelectorAll('[data-op]').forEach(function (button) {
      button.addEventListener('click', function () {
        var op = button.dataset.op;

        if (op === 'sample') {
          input.value = 'Hello World! This is a 集成工具大全 sample.\n\n你可以试试大小写转换，或者看看右侧的字数统计。';
          output.value = '';
          renderStats();
          window.UI.toast('已填入示例', 'info');
          return;
        }

        if (op === 'clear') {
          input.value = '';
          output.value = '';
          renderStats();
          input.focus();
          window.UI.toast('已清空', 'success');
          return;
        }

        if (!input.value) {
          window.UI.toast('请先输入文本', 'warn');
          input.focus();
          return;
        }

        try {
          output.value = operations[op](input.value);
          window.UI.toast('转换完成', 'success');
        } catch (error) {
          window.UI.toast('转换失败：' + error.message, 'error');
        }
      });
    });

    root.querySelector('#textCopy').addEventListener('click', function () {
      window.UI.copyText(output.value);
    });

    root.querySelector('#textUseAsInput').addEventListener('click', function () {
      if (!output.value) {
        window.UI.toast('还没有转换结果', 'warn');
        return;
      }
      input.value = output.value;
      output.value = '';
      renderStats();
      window.UI.toast('已替换为当前结果', 'success');
    });

    renderStats();
  }

  window.ToolModules['text-tools'] = render;
})();
