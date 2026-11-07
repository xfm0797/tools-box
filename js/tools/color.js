/* =============================================================================
 * 工具：颜色格式转换（HEX / RGB / HSL）
 * -----------------------------------------------------------------------------
 * 支持 #RGB、#RRGGBB、#RRGGBBAA、rgb()/rgba()、hsl()/hsla() 等常见写法，
 * 输入时实时解析，解析失败只提示不抛错；同时给出与黑白文字的对比度参考。
 * ========================================================================== */
(function () {
  'use strict';

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  /** 十六进制 → {r,g,b,a} */
  function hexToRgb(hex) {
    var value = hex.replace(/^#/, '').trim();
    if (!/^[0-9a-fA-F]+$/.test(value)) return null;
    if (value.length === 3 || value.length === 4) {
      value = value.split('').map(function (ch) { return ch + ch; }).join('');
    }
    if (value.length !== 6 && value.length !== 8) return null;
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16),
      a: value.length === 8 ? parseInt(value.slice(6, 8), 16) / 255 : 1
    };
  }

  function rgbToHex(rgb) {
    var hex = '#' + [rgb.r, rgb.g, rgb.b].map(function (channel) {
      var v = Math.round(clamp(channel, 0, 255));
      return (v < 16 ? '0' : '') + v.toString(16);
    }).join('');
    if (rgb.a !== undefined && rgb.a < 1) {
      var alpha = Math.round(clamp(rgb.a, 0, 1) * 255);
      hex += (alpha < 16 ? '0' : '') + alpha.toString(16);
    }
    return hex.toUpperCase();
  }

  /** RGB → HSL（h: 0-360, s/l: 0-100） */
  function rgbToHsl(rgb) {
    var r = rgb.r / 255;
    var g = rgb.g / 255;
    var b = rgb.b / 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var delta = max - min;
    var h = 0;
    var s = 0;
    var l = (max + min) / 2;

    if (delta !== 0) {
      s = delta / (1 - Math.abs(2 * l - 1));
      switch (max) {
        case r: h = ((g - b) / delta) % 6; break;
        case g: h = (b - r) / delta + 2; break;
        default: h = (r - g) / delta + 4; break;
      }
      h *= 60;
      if (h < 0) h += 360;
    }
    return {
      h: Math.round(h),
      s: Math.round(clamp(s, 0, 1) * 100),
      l: Math.round(clamp(l, 0, 1) * 100),
      a: rgb.a === undefined ? 1 : rgb.a
    };
  }

  /** HSL → RGB */
  function hslToRgb(hsl) {
    var h = ((hsl.h % 360) + 360) % 360 / 360;
    var s = clamp(hsl.s, 0, 100) / 100;
    var l = clamp(hsl.l, 0, 100) / 100;
    var a = hsl.a === undefined ? 1 : hsl.a;

    if (s === 0) {
      var gray = Math.round(l * 255);
      return { r: gray, g: gray, b: gray, a: a };
    }

    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    var hueToChannel = function (t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return {
      r: Math.round(hueToChannel(h + 1 / 3) * 255),
      g: Math.round(hueToChannel(h) * 255),
      b: Math.round(hueToChannel(h - 1 / 3) * 255),
      a: a
    };
  }

  /** 解析任意受支持的颜色字符串 */
  function parseColor(input) {
    var text = String(input).trim();
    if (!text) return null;

    if (/^#?[0-9a-fA-F]{3,8}$/.test(text)) return hexToRgb(text);

    var rgbMatch = /^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/i.exec(text);
    if (rgbMatch) {
      var alpha = rgbMatch[4] === undefined ? 1 : (rgbMatch[4].indexOf('%') !== -1
        ? parseFloat(rgbMatch[4]) / 100
        : parseFloat(rgbMatch[4]));
      return {
        r: clamp(parseFloat(rgbMatch[1]), 0, 255),
        g: clamp(parseFloat(rgbMatch[2]), 0, 255),
        b: clamp(parseFloat(rgbMatch[3]), 0, 255),
        a: clamp(alpha, 0, 1)
      };
    }

    var hslMatch = /^hsla?\(\s*(-?[\d.]+)(?:deg)?\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/i.exec(text);
    if (hslMatch) {
      var alpha2 = hslMatch[4] === undefined ? 1 : (hslMatch[4].indexOf('%') !== -1
        ? parseFloat(hslMatch[4]) / 100
        : parseFloat(hslMatch[4]));
      return hslToRgb({
        h: parseFloat(hslMatch[1]),
        s: parseFloat(hslMatch[2]),
        l: parseFloat(hslMatch[3]),
        a: clamp(alpha2, 0, 1)
      });
    }

    return null;
  }

  /** 相对亮度（WCAG） */
  function relativeLuminance(rgb) {
    var channel = function (value) {
      var v = value / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
  }

  function contrastRatio(l1, l2) {
    var light = Math.max(l1, l2);
    var dark = Math.min(l1, l2);
    return (light + 0.05) / (dark + 0.05);
  }

  function render(root) {
    root.innerHTML = `
      <div class="color-preview" id="colorPreview"></div>

      <div class="field">
        <div class="label-row">
          <label class="label" for="colorInput">颜色值</label>
          <span class="label-meta">支持 HEX / RGB / HSL</span>
        </div>
        <div class="form-row">
          <div class="form-item" style="flex:0 0 auto">
            <input id="colorPicker" type="color" value="#5b5bd6" aria-label="取色器">
          </div>
          <div class="form-item" style="flex:1 1 220px">
            <input id="colorInput" class="input mono" type="text" spellcheck="false" value="#5B5BD6"
              placeholder="#5B5BD6 或 rgb(91,91,214) 或 hsl(240,58%,60%)">
          </div>
        </div>
      </div>

      <div class="btn-row">
        <button type="button" class="btn" id="colorCopyAll">复制结果</button>
        <button type="button" class="btn ghost" id="colorSample">示例</button>
        <button type="button" class="btn ghost" id="colorRandom">随机颜色</button>
        <button type="button" class="btn ghost" id="colorClear">清空</button>
      </div>

      <div class="kv-list" id="colorResults"></div>
      <p class="status" id="colorStatus" hidden></p>
      <p class="hint">对比度依据 WCAG 2.1 相对亮度公式计算，4.5:1 以上适合正文，3:1 以上适合大字号。</p>
    `;

    var preview = root.querySelector('#colorPreview');
    var input = root.querySelector('#colorInput');
    var picker = root.querySelector('#colorPicker');
    var results = root.querySelector('#colorResults');
    var status = root.querySelector('#colorStatus');
    var lastText = '';

    function row(key, value) {
      var safe = window.UI.escapeHtml(value);
      return '<div class="kv"><span class="kv-key">' + window.UI.escapeHtml(key) + '</span>' +
        '<span class="kv-val" title="' + safe + '">' + safe + '</span>' +
        '<button type="button" class="link-btn" data-copy="' + safe + '">复制</button></div>';
    }

    function update() {
      var text = input.value.trim();
      status.hidden = true;

      if (!text) {
        lastText = '';
        preview.style.background = 'transparent';
        results.innerHTML = '';
        return;
      }

      var rgb = parseColor(text);
      if (!rgb) {
        lastText = '';
        preview.style.background = 'var(--surface-3)';
        results.innerHTML = '';
        status.className = 'status err';
        status.textContent = '无法识别该颜色值，请使用 #RRGGBB、rgb(0-255,0-255,0-255) 或 hsl(0-360,0-100%,0-100%) 格式。';
        status.hidden = false;
        return;
      }

      var hex = rgbToHex(rgb);
      var hsl = rgbToHsl(rgb);
      var hex6 = hex.slice(0, 7);
      preview.style.background = hex;
      picker.value = hex6.toLowerCase();

      var rgbText = rgb.a < 1
        ? 'rgba(' + Math.round(rgb.r) + ', ' + Math.round(rgb.g) + ', ' + Math.round(rgb.b) + ', ' + Number(rgb.a.toFixed(3)) + ')'
        : 'rgb(' + Math.round(rgb.r) + ', ' + Math.round(rgb.g) + ', ' + Math.round(rgb.b) + ')';
      var hslText = rgb.a < 1
        ? 'hsla(' + hsl.h + ', ' + hsl.s + '%, ' + hsl.l + '%, ' + Number(rgb.a.toFixed(3)) + ')'
        : 'hsl(' + hsl.h + ', ' + hsl.s + '%, ' + hsl.l + '%)';

      var luminance = relativeLuminance(rgb);
      var onBlack = contrastRatio(luminance, 0);
      var onWhite = contrastRatio(luminance, 1);

      lastText = 'HEX: ' + hex + '\nRGB: ' + rgbText + '\nHSL: ' + hslText;

      results.innerHTML = [
        row('HEX', hex),
        row('RGB', rgbText),
        row('HSL', hslText),
        row('亮度', (luminance * 100).toFixed(1) + '%'),
        row('黑字对比', onBlack.toFixed(2) + ':1' + (onBlack >= 4.5 ? '（可读）' : '（偏低）')),
        row('白字对比', onWhite.toFixed(2) + ':1' + (onWhite >= 4.5 ? '（可读）' : '（偏低）'))
      ].join('');
    }

    input.addEventListener('input', window.UI.debounce(update, 120));
    input.addEventListener('change', update);
    picker.addEventListener('input', function () {
      input.value = picker.value.toUpperCase();
      update();
    });

    root.querySelector('#colorCopyAll').addEventListener('click', function () {
      if (!lastText) {
        window.UI.toast('还没有可复制的结果', 'warn');
        return;
      }
      window.UI.copyText(lastText);
    });

    root.querySelector('#colorSample').addEventListener('click', function () {
      input.value = 'rgb(91, 91, 214)';
      update();
      window.UI.toast('已填入示例', 'info');
    });

    root.querySelector('#colorRandom').addEventListener('click', function () {
      input.value = '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0').toUpperCase();
      update();
      window.UI.toast('已生成随机颜色', 'success');
    });

    root.querySelector('#colorClear').addEventListener('click', function () {
      input.value = '';
      results.innerHTML = '';
      preview.style.background = 'transparent';
      status.hidden = true;
      input.focus();
      window.UI.toast('已清空', 'success');
    });

    // 复制按钮使用点击委托，避免每次重建列表时重复绑定
    results.addEventListener('click', function (event) {
      var button = event.target.closest('[data-copy]');
      if (button) window.UI.copyText(button.getAttribute('data-copy'));
    });

    update();
  }

  window.ToolModules['color'] = render;
})();
