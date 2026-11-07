/* =============================================================================
 * 工具工装（Kit）
 * -----------------------------------------------------------------------------
 * 供 js/tools/pack-*.js 复用的轻量构建块，避免 100 个工具重复写同样的骨架：
 *   Kit.text()   标准「文本进 → 文本出」工具
 *   Kit.form()   标准「表单 → 结果」工具
 *   Kit.table()  表格
 *   Kit.kv()     键值结果列表（带复制按钮）
 *   Kit.dropzone / bindFile / loadImage / canvasBlob  图片类工具公共能力
 *   Kit.randomInt / shuffle / pick  基于系统安全随机源
 *
 * 本文件不包含任何具体工具逻辑，也不发起网络请求。
 * ========================================================================== */
(function () {
  'use strict';

  var Kit = {};
  var uidSeq = 0;

  /* ------------------------------ 基础 ------------------------------ */

  Kit.esc = function (value) {
    return window.UI.escapeHtml(value === null || value === undefined ? '' : String(value));
  };

  /** 生成当前页面内唯一的元素 id 前缀，避免多个工具混用时选择器冲突 */
  Kit.uid = function (prefix) {
    uidSeq += 1;
    return (prefix || 'kit') + uidSeq;
  };

  Kit.toast = function (message, type) {
    window.UI.toast(message, type);
  };

  /** 直接复用主入口的体积格式化 */
  Kit.formatBytes = function (bytes) {
    return window.UI.formatBytes(bytes);
  };

  /** 数字友好显示：保留有效位但去掉多余的 0 */
  Kit.num = function (value, digits) {
    if (!isFinite(value)) return '—';
    var fixed = Number(value).toFixed(digits === undefined ? 6 : digits);
    return fixed.replace(/\.?0+$/, '') || '0';
  };

  /** 千分位 */
  Kit.group = function (value) {
    var parts = String(value).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  /* ------------------------------ 表格与键值 ------------------------------ */

  Kit.table = function (headers, rows, options) {
    var opts = options || {};
    var head = headers.map(function (h) {
      return '<th>' + Kit.esc(h) + '</th>';
    }).join('');
    var body = rows.map(function (row) {
      return '<tr>' + row.map(function (cell) {
        if (cell && typeof cell === 'object' && cell.html) return '<td>' + cell.html + '</td>';
        return '<td>' + Kit.esc(cell) + '</td>';
      }).join('') + '</tr>';
    }).join('');
    return '<div class="table-wrap"' + (opts.maxHeight ? ' style="max-height:' + opts.maxHeight + '"' : '') + '>' +
      '<table class="data-table"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>';
  };

  /** 键值行：{ key, value, copy: true } */
  Kit.kv = function (rows) {
    return '<div class="kv-list">' + rows.map(function (row) {
      var value = row.value === null || row.value === undefined ? '' : String(row.value);
      var safe = Kit.esc(value);
      return '<div class="kv">' +
        '<span class="kv-key">' + Kit.esc(row.key) + '</span>' +
        '<span class="kv-val' + (row.mono === false ? '' : ' mono') + '" title="' + safe + '">' + (row.html || safe) + '</span>' +
        (row.copy === false ? '' : '<button type="button" class="link-btn" data-copy="' + safe + '">复制</button>') +
        '</div>';
    }).join('') + '</div>';
  };

  /** 为容器内所有 [data-copy] 绑定复制 */
  Kit.bindCopy = function (scope) {
    if (!scope) return;
    Array.prototype.forEach.call(scope.querySelectorAll('[data-copy]'), function (button) {
      if (button.__copyBound) return;
      button.__copyBound = true;
      button.addEventListener('click', function () {
        window.UI.copyText(button.getAttribute('data-copy'));
      });
    });
  };

  Kit.stats = function (items) {
    return '<div class="stat-grid">' + items.map(function (item) {
      return '<div class="stat"><span class="stat-value">' + (item.html || Kit.esc(item.value)) +
        '</span><span class="stat-label">' + Kit.esc(item.label) + '</span></div>';
    }).join('') + '</div>';
  };

  /* ------------------------------ 表单字段 ------------------------------ */

  function optionList(options, current) {
    return (options || []).map(function (opt) {
      var value = typeof opt === 'object' ? opt.value : opt;
      var label = typeof opt === 'object' ? opt.label : opt;
      return '<option value="' + Kit.esc(value) + '"' +
        (String(value) === String(current) ? ' selected' : '') + '>' + Kit.esc(label) + '</option>';
    }).join('');
  }

  function fieldHtml(uid, field) {
    var id = uid + '-' + field.id;
    var type = field.type || 'text';
    var label = '<label class="label" for="' + id + '">' + Kit.esc(field.label) + '</label>';

    if (type === 'checkbox') {
      return '<div class="form-item" style="flex:0 0 auto"><label class="check" style="margin-top:22px">' +
        '<input type="checkbox" id="' + id + '"' + (field.value ? ' checked' : '') + '>' +
        '<span>' + Kit.esc(field.label) + '</span></label></div>';
    }

    var control;
    if (type === 'select') {
      control = '<select class="select" id="' + id + '">' + optionList(field.options, field.value) + '</select>';
    } else if (type === 'textarea') {
      control = '<textarea class="textarea' + (field.mono === false ? '' : ' mono') + '" id="' + id + '" rows="' +
        (field.rows || 4) + '" spellcheck="false" placeholder="' + Kit.esc(field.placeholder || '') + '">' +
        Kit.esc(field.value || '') + '</textarea>';
    } else {
      control = '<input class="input' + (field.mono === false ? '' : ' mono') + '" type="' + type + '" id="' + id + '" value="' +
        Kit.esc(field.value === null || field.value === undefined ? '' : field.value) + '"' +
        (field.placeholder ? ' placeholder="' + Kit.esc(field.placeholder) + '"' : '') +
        (field.min !== undefined ? ' min="' + field.min + '"' : '') +
        (field.max !== undefined ? ' max="' + field.max + '"' : '') +
        (field.step !== undefined ? ' step="' + field.step + '"' : '') + '>';
    }

    return '<div class="form-item"' + (field.wide ? ' style="flex:1 1 100%"' : '') + '>' +
      label + control +
      (field.hint ? '<p class="hint" style="margin-top:6px">' + Kit.esc(field.hint) + '</p>' : '') +
      '</div>';
  }

  /**
   * 标准表单工具
   * cfg = {
   *   uid, fields: [...], actionLabel, hint,
   *   sample: { fieldId: value } | function (fill) {},
   *   run: function (values) -> { rows, html, note, error }
   * }
   */
  Kit.form = function (root, cfg) {
    var uid = Kit.uid(cfg.uid || 'form');
    var fields = cfg.fields || [];

    root.innerHTML =
      '<div class="form-row' + (cfg.stack ? ' stack' : '') + '">' +
        fields.map(function (field) { return fieldHtml(uid, field); }).join('') +
      '</div>' +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="' + uid + '-run">' + Kit.esc(cfg.actionLabel || '计算') + '</button>' +
        (cfg.sample ? '<button type="button" class="btn ghost" id="' + uid + '-sample">示例</button>' : '') +
        '<button type="button" class="btn ghost" id="' + uid + '-clear">清空</button>' +
      '</div>' +
      '<div id="' + uid + '-result"></div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      (cfg.hint ? '<p class="hint">' + cfg.hint + '</p>' : '');

    var resultBox = root.querySelector('#' + uid + '-result');
    var statusEl = root.querySelector('#' + uid + '-status');

    function setStatus(type, text) {
      if (!text) { statusEl.hidden = true; return; }
      statusEl.className = 'status ' + type;
      statusEl.textContent = text;
      statusEl.hidden = false;
    }

    function readValues() {
      var values = {};
      fields.forEach(function (field) {
        var node = root.querySelector('#' + uid + '-' + field.id);
        if (!node) return;
        values[field.id] = field.type === 'checkbox' ? node.checked : node.value;
      });
      return values;
    }

    function fill(values) {
      fields.forEach(function (field) {
        var node = root.querySelector('#' + uid + '-' + field.id);
        if (!node) return;
        if (field.type === 'checkbox') node.checked = !!values[field.id];
        else node.value = values[field.id] === null || values[field.id] === undefined ? '' : values[field.id];
      });
    }

    function clear() {
      fields.forEach(function (field) {
        var node = root.querySelector('#' + uid + '-' + field.id);
        if (!node) return;
        if (field.type === 'checkbox') node.checked = false;
        else if (field.type === 'select') node.selectedIndex = 0;
        else node.value = '';
      });
      resultBox.innerHTML = '';
      setStatus(null, '');
    }

    function applyResult(result) {
      if (!result) return; // 由 run 内部自行提示
      if (result.error) {
        resultBox.innerHTML = '';
        setStatus('err', result.error);
        return;
      }
      var parts = [];
      if (result.html) parts.push(result.html);
      if (result.rows && result.rows.length) parts.push(Kit.kv(result.rows));
      resultBox.innerHTML = parts.join('');
      Kit.bindCopy(resultBox);
      setStatus(result.type || 'ok', result.note || '');
    }

    function failed(error) {
      resultBox.innerHTML = '';
      setStatus('err', '计算失败：' + (error.message || '输入格式有误'));
    }

    function run() {
      var values = readValues();
      var result;
      try {
        result = cfg.run(values, root);
      } catch (error) {
        failed(error);
        return;
      }
      // 支持异步结果（Web Crypto、CompressionStream 等）
      if (result && typeof result.then === 'function') {
        setStatus('info', '计算中…');
        result.then(applyResult).catch(failed);
        return;
      }
      applyResult(result);
    }

    root.querySelector('#' + uid + '-run').addEventListener('click', run);
    root.querySelector('#' + uid + '-clear').addEventListener('click', function () {
      clear();
      Kit.toast('已清空', 'success');
    });
    if (cfg.sample) {
      root.querySelector('#' + uid + '-sample').addEventListener('click', function () {
        if (typeof cfg.sample === 'function') cfg.sample(fill);
        else fill(cfg.sample);
        run();
      });
    }

    if (cfg.autorun !== false) run();
    return { run: run, readValues: readValues, fill: fill, setStatus: setStatus };
  };

  /**
   * 标准「文本进 → 文本出」工具
   * cfg = {
   *   uid, inputLabel, inputRows, outputLabel, outputRows, mono,
   *   options: [ 与 fields 相同结构，但不含 label 的整行排布 ],
   *   run: function (text, options) -> string | { output, note, type, error },
   *   sample: string | function (node) {},
   *   live: 输入时自动运行, hint
   * }
   */
  Kit.text = function (root, cfg) {
    var uid = Kit.uid(cfg.uid || 'text');
    var options = cfg.options || [];
    var showCount = cfg.showCount !== false;

    root.innerHTML =
      '<div class="field">' +
        '<div class="label-row">' +
          '<label class="label" for="' + uid + '-input">' + Kit.esc(cfg.inputLabel || '输入内容') + '</label>' +
          (showCount ? '<span class="label-meta" id="' + uid + '-count">0 字符</span>' : '') +
        '</div>' +
        '<textarea id="' + uid + '-input" class="textarea' + (cfg.mono === false ? '' : ' mono') + '" rows="' +
          (cfg.inputRows || 7) + '" spellcheck="false" placeholder="' + Kit.esc(cfg.inputPlaceholder || '') + '"></textarea>' +
      '</div>' +
      (options.length ? '<div class="form-row">' + options.map(function (opt) {
        return fieldHtml(uid, opt);
      }).join('') + '</div>' : '') +
      '<div class="btn-row">' +
        '<button type="button" class="btn primary" id="' + uid + '-run">' + Kit.esc(cfg.actionLabel || '转换') + '</button>' +
        (cfg.sample ? '<button type="button" class="btn ghost" id="' + uid + '-sample">示例</button>' : '') +
        '<button type="button" class="btn ghost" id="' + uid + '-clear">清空</button>' +
      '</div>' +
      '<div class="field">' +
        '<div class="label-row">' +
          '<label class="label" for="' + uid + '-output">' + Kit.esc(cfg.outputLabel || '结果') + '</label>' +
          '<div class="label-actions"><button type="button" class="link-btn" id="' + uid + '-copy">复制结果</button></div>' +
        '</div>' +
        '<textarea id="' + uid + '-output" class="textarea' + (cfg.mono === false ? '' : ' mono') + '" rows="' +
          (cfg.outputRows || cfg.inputRows || 7) + '" readonly placeholder="结果会显示在这里"></textarea>' +
      '</div>' +
      '<div id="' + uid + '-extra"></div>' +
      '<p class="status" id="' + uid + '-status" hidden></p>' +
      (cfg.hint ? '<p class="hint">' + cfg.hint + '</p>' : '');

    var input = root.querySelector('#' + uid + '-input');
    var output = root.querySelector('#' + uid + '-output');
    var extra = root.querySelector('#' + uid + '-extra');
    // 纯表格类结果可以隐藏文本输出框，避免出现大片空白
    if (cfg.hideOutput) {
      var outputField = output.closest('.field');
      if (outputField) outputField.hidden = true;
    }
    var statusEl = root.querySelector('#' + uid + '-status');
    var countEl = root.querySelector('#' + uid + '-count');

    function setStatus(type, text) {
      if (!text) { statusEl.hidden = true; return; }
      statusEl.className = 'status ' + type;
      statusEl.textContent = text;
      statusEl.hidden = false;
    }

    function refreshCount() {
      if (countEl) countEl.textContent = input.value.length.toLocaleString('zh-CN') + ' 字符';
    }

    function readOptions() {
      var values = {};
      options.forEach(function (opt) {
        var node = root.querySelector('#' + uid + '-' + opt.id);
        if (!node) return;
        values[opt.id] = opt.type === 'checkbox' ? node.checked : node.value;
      });
      return values;
    }

    function applyResult(result) {
      if (typeof result === 'string') result = { output: result };
      if (!result) return;
      output.value = result.output === undefined ? '' : result.output;
      if (extra) extra.innerHTML = result.html || '';
      if (extra && result.html) Kit.bindCopy(extra);
      setStatus(result.type || 'ok', result.note || '');
    }

    function failed(error) {
      output.value = '';
      setStatus('err', '处理失败：' + (error.message || '输入格式有误'));
    }

    function run() {
      var text = input.value;
      if (!text.length && cfg.allowEmpty !== true) {
        setStatus('info', '请先输入内容');
        window.UI.toast('请先输入内容', 'warn');
        input.focus();
        return;
      }
      var result;
      try {
        result = cfg.run(text, readOptions());
      } catch (error) {
        failed(error);
        return;
      }
      if (result && result.error) {
        output.value = '';
        setStatus('err', result.error);
        return;
      }
      // 支持异步结果（Web Crypto、CompressionStream 等）
      if (result && typeof result.then === 'function') {
        setStatus('info', '处理中…');
        result.then(applyResult).catch(failed);
        return;
      }
      applyResult(result);
    }

    root.querySelector('#' + uid + '-run').addEventListener('click', run);
    root.querySelector('#' + uid + '-clear').addEventListener('click', function () {
      input.value = '';
      output.value = '';
      if (extra) extra.innerHTML = '';
      refreshCount();
      setStatus(null, '');
      input.focus();
      window.UI.toast('已清空', 'success');
    });
    root.querySelector('#' + uid + '-copy').addEventListener('click', function () {
      window.UI.copyText(output.value);
    });
    if (cfg.sample) {
      root.querySelector('#' + uid + '-sample').addEventListener('click', function () {
        var value = typeof cfg.sample === 'function' ? cfg.sample() : cfg.sample;
        input.value = value == null ? '' : String(value);
        refreshCount();
        run();
      });
    }

    input.addEventListener('input', refreshCount);
    if (cfg.live) {
      input.addEventListener('input', window.UI.debounce(function () {
        if (input.value.trim()) run();
      }, 260));
    }

    refreshCount();
    if (cfg.autorun && input.value.trim()) run();
    return { run: run, input: input, output: output };
  };

  /* ------------------------------ 随机 ------------------------------ */

  /** 安全随机整数 [0, max) */
  Kit.randomInt = function (max) {
    if (max <= 0) return 0;
    // 超过 32 位范围时拆成高位 + 低位，避免取模区间为 0 导致死循环
    if (max > 4294967296) {
      var high = Kit.randomInt(Math.floor(max / 4294967296));
      var low = Kit.randomInt(4294967296);
      return Math.min(max - 1, high * 4294967296 + low);
    }
    var cryptoObj = window.crypto || window.msCrypto;
    if (!cryptoObj || !cryptoObj.getRandomValues) return Math.floor(Math.random() * max);
    var limit = Math.floor(4294967296 / max) * max;
    var buffer = new Uint32Array(1);
    do { cryptoObj.getRandomValues(buffer); } while (buffer[0] >= limit);
    return buffer[0] % max;
  };

  /** 从数组中随机取一个 */
  Kit.pick = function (list) {
    return list[Kit.randomInt(list.length)];
  };

  /** Fisher-Yates 洗牌（就地） */
  Kit.shuffle = function (list) {
    for (var i = list.length - 1; i > 0; i -= 1) {
      var j = Kit.randomInt(i + 1);
      var temp = list[i];
      list[i] = list[j];
      list[j] = temp;
    }
    return list;
  };

  /* ------------------------------ 图片 ------------------------------ */

  Kit.dropzone = function (uid, label) {
    return '<label class="dropzone" for="' + uid + '-file">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 16V4"/><path d="M7 9l5-5 5 5"/>' +
      '<path d="M4 16v2.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V16"/></svg>' +
      '<span><strong>' + Kit.esc(label || '点击选择图片') + '</strong>，或拖拽到此处</span>' +
      '<span>支持 JPG / PNG / WebP / GIF · 建议不超过 20MB</span>' +
      '<input type="file" id="' + uid + '-file" accept="image/*">' +
      '</label>';
  };

  /** 绑定文件选择（含拖拽），回调收到 File */
  Kit.bindFile = function (root, uid, handler) {
    var input = root.querySelector('#' + uid + '-file');
    if (!input) return;
    var zone = input.closest('.dropzone');

    function handle(file) {
      if (!file) return;
      if (!/^image\//.test(file.type)) {
        window.UI.toast('请选择图片文件', 'error');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        window.UI.toast('图片超过 20MB，请压缩后再试', 'error');
        return;
      }
      handler(file);
    }

    input.addEventListener('change', function () {
      handle(input.files && input.files[0]);
      input.value = '';
    });

    if (zone) {
      ['dragenter', 'dragover'].forEach(function (type) {
        zone.addEventListener(type, function (event) {
          event.preventDefault();
          zone.classList.add('dragover');
        });
      });
      ['dragleave', 'drop'].forEach(function (type) {
        zone.addEventListener(type, function (event) {
          event.preventDefault();
          zone.classList.remove('dragover');
        });
      });
      zone.addEventListener('drop', function (event) {
        var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
        handle(file);
      });
    }
  };

  /** 读取图片为 HTMLImageElement */
  Kit.loadImage = function (file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { resolve({ img: img, url: url }); };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('图片解码失败，请换一张试试'));
      };
      img.src = url;
    });
  };

  Kit.release = function (handle) {
    if (handle && handle.url) URL.revokeObjectURL(handle.url);
  };

  Kit.canvas = function (width, height) {
    var canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    return canvas;
  };

  Kit.canvasBlob = function (canvas, type, quality) {
    return new Promise(function (resolve) {
      if (canvas.toBlob) {
        canvas.toBlob(function (blob) { resolve(blob); }, type || 'image/png', quality);
        return;
      }
      try {
        var data = canvas.toDataURL(type || 'image/png', quality);
        var binary = atob(data.split(',')[1]);
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        resolve(new Blob([bytes], { type: type || 'image/png' }));
      } catch (error) {
        resolve(null);
      }
    });
  };

  Kit.saveCanvas = function (canvas, filename, type, quality) {
    Kit.canvasBlob(canvas, type, quality).then(function (blob) {
      if (!blob) {
        window.UI.toast('导出失败，浏览器不支持该格式', 'error');
        return;
      }
      window.UI.downloadBlob(blob, filename);
      window.UI.toast('已导出 ' + filename, 'success');
    });
  };

  window.ToolKit = Kit;
})();
