/* =============================================================================
 * 工具：二维码生成
 * -----------------------------------------------------------------------------
 * 为了不依赖任何第三方 CDN（避免国内网络加载失败），这里内置了一个精简但完整的
 * 二维码编码器：
 *   · 字节模式（UTF-8），版本 1-10 自动选择
 *   · 容错等级 L / M / Q / H
 *   · Reed-Solomon 纠错（GF(256)）、块交织、8 种掩码 + 惩罚分择优
 *   · 绘制到 Canvas，支持导出 PNG / 复制图片
 * 数据全程在本地计算，不上传。
 * ========================================================================== */
(function (global) {
  'use strict';

  /* =========================================================================
   * 一、编码常量表（二维码版本 1-10）
   * ====================================================================== */
  var EC_LEVEL_BITS = { L: 1, M: 0, Q: 3, H: 2 };

  // 每个纠错块包含的纠错码字数
  var EC_PER_BLOCK = {
    L: [7, 10, 15, 20, 26, 18, 20, 24, 30, 18],
    M: [10, 16, 26, 18, 24, 16, 18, 22, 22, 26],
    Q: [13, 22, 18, 26, 18, 24, 18, 22, 20, 24],
    H: [17, 28, 22, 16, 22, 28, 26, 26, 24, 28]
  };

  // 纠错块数量
  var BLOCK_COUNT = {
    L: [1, 1, 1, 1, 1, 2, 2, 2, 2, 4],
    M: [1, 1, 1, 2, 2, 4, 4, 4, 5, 5],
    Q: [1, 1, 2, 2, 4, 4, 6, 6, 8, 8],
    H: [1, 1, 2, 4, 4, 4, 5, 6, 8, 8]
  };

  // 数据码字总数
  var DATA_CODEWORDS = {
    L: [19, 34, 55, 80, 108, 136, 156, 194, 232, 274],
    M: [16, 28, 44, 64, 86, 108, 124, 154, 182, 216],
    Q: [13, 22, 34, 48, 62, 76, 88, 110, 132, 154],
    H: [9, 16, 26, 36, 46, 60, 66, 86, 100, 122]
  };

  // 校正图形中心坐标
  var ALIGNMENT = [
    [],
    [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
    [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]
  ];

  var MAX_VERSION = 10;

  /* =========================================================================
   * 二、GF(256) 与 Reed-Solomon
   * ====================================================================== */
  var EXP = new Uint8Array(512);
  var LOG = new Uint8Array(256);

  (function initGaloisField() {
    var x = 1;
    for (var i = 0; i < 255; i += 1) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d; // 本原多项式 x^8 + x^4 + x^3 + x^2 + 1
    }
    for (var j = 255; j < 512; j += 1) EXP[j] = EXP[j - 255];
  })();

  function gfMultiply(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[LOG[a] + LOG[b]];
  }

  /** 生成多项式：(x - α^0)(x - α^1)...(x - α^(n-1))，最高次在前 */
  function generatorPolynomial(degree) {
    var poly = [1];
    for (var i = 0; i < degree; i += 1) {
      var next = new Array(poly.length + 1).fill(0);
      for (var j = 0; j < poly.length; j += 1) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMultiply(poly[j], EXP[i]);
      }
      poly = next;
    }
    return poly;
  }

  /** 计算 ecLength 个纠错码字 */
  function reedSolomon(data, ecLength) {
    var generator = generatorPolynomial(ecLength);
    var buffer = new Uint8Array(data.length + ecLength);
    buffer.set(data, 0);
    for (var i = 0; i < data.length; i += 1) {
      var factor = buffer[i];
      if (factor === 0) continue;
      for (var j = 0; j < generator.length; j += 1) {
        buffer[i + j] ^= gfMultiply(generator[j], factor);
      }
    }
    return buffer.slice(data.length);
  }

  /* =========================================================================
   * 三、BCH 校验（格式信息 / 版本信息）
   * ====================================================================== */
  function bitLength(value) {
    var length = 0;
    var temp = value;
    while (temp) {
      length += 1;
      temp >>>= 1;
    }
    return length;
  }

  function bchRemainder(value, poly) {
    var remainder = value;
    var polyDegree = bitLength(poly);
    while (bitLength(remainder) >= polyDegree) {
      remainder ^= poly << (bitLength(remainder) - polyDegree);
    }
    return remainder;
  }

  /** 15 位格式信息：2 位容错等级 + 3 位掩码 */
  function formatInfoBits(level, mask) {
    var data = (EC_LEVEL_BITS[level] << 3) | mask;
    var remainder = bchRemainder(data << 10, 0x537);
    return ((data << 10) | remainder) ^ 0x5412;
  }

  /** 18 位版本信息（版本 ≥ 7 才需要） */
  function versionInfoBits(version) {
    var remainder = bchRemainder(version << 12, 0x1f25);
    return (version << 12) | remainder;
  }

  /* =========================================================================
   * 四、掩码
   * ====================================================================== */
  function maskCondition(mask, row, col) {
    switch (mask) {
      case 0: return (row + col) % 2 === 0;
      case 1: return row % 2 === 0;
      case 2: return col % 3 === 0;
      case 3: return (row + col) % 3 === 0;
      case 4: return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
      case 5: return ((row * col) % 2) + ((row * col) % 3) === 0;
      case 6: return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
      case 7: return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
      default: return false;
    }
  }

  /** 掩码惩罚分：分数越低越容易识别 */
  function penaltyScore(matrix, size) {
    var score = 0;
    var row;
    var col;

    // 规则 1：同色连续 5 个以上
    for (row = 0; row < size; row += 1) {
      var runRow = 1;
      var runCol = 1;
      for (col = 1; col < size; col += 1) {
        if (matrix[row][col] === matrix[row][col - 1]) {
          runRow += 1;
        } else {
          if (runRow >= 5) score += 3 + (runRow - 5);
          runRow = 1;
        }
        if (matrix[col][row] === matrix[col - 1][row]) {
          runCol += 1;
        } else {
          if (runCol >= 5) score += 3 + (runCol - 5);
          runCol = 1;
        }
      }
      if (runRow >= 5) score += 3 + (runRow - 5);
      if (runCol >= 5) score += 3 + (runCol - 5);
    }

    // 规则 2：2x2 同色块
    for (row = 0; row < size - 1; row += 1) {
      for (col = 0; col < size - 1; col += 1) {
        var value = matrix[row][col];
        if (value === matrix[row][col + 1] && value === matrix[row + 1][col] && value === matrix[row + 1][col + 1]) {
          score += 3;
        }
      }
    }

    // 规则 3：类似定位图形的 1011101 0000 图案
    var patternA = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    var patternB = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    for (row = 0; row < size; row += 1) {
      for (col = 0; col <= size - 11; col += 1) {
        var matchA = true;
        var matchB = true;
        for (var k = 0; k < 11; k += 1) {
          var v = matrix[row][col + k] ? 1 : 0;
          if (v !== patternA[k]) matchA = false;
          if (v !== patternB[k]) matchB = false;
        }
        if (matchA) score += 40;
        if (matchB) score += 40;
      }
    }
    for (col = 0; col < size; col += 1) {
      for (row = 0; row <= size - 11; row += 1) {
        var vMatchA = true;
        var vMatchB = true;
        for (var m = 0; m < 11; m += 1) {
          var value2 = matrix[row + m][col] ? 1 : 0;
          if (value2 !== patternA[m]) vMatchA = false;
          if (value2 !== patternB[m]) vMatchB = false;
        }
        if (vMatchA) score += 40;
        if (vMatchB) score += 40;
      }
    }

    // 规则 4：黑白比例偏离 50%
    var dark = 0;
    for (row = 0; row < size; row += 1) {
      for (col = 0; col < size; col += 1) {
        if (matrix[row][col]) dark += 1;
      }
    }
    var percent = (dark * 100) / (size * size);
    score += Math.floor(Math.abs(percent - 50) / 5) * 10;

    return score;
  }

  /* =========================================================================
   * 五、生成二维码矩阵
   * ====================================================================== */
  /**
   * @param {string} text   要编码的内容
   * @param {string} level  容错等级 L / M / Q / H
   * @param {number} [forcedMask] 指定掩码（调试用），省略则自动择优
   * @returns {{ size:number, version:number, mask:number, modules:boolean[][] }}
   */
  function createMatrix(text, level, forcedMask) {
    if (!EC_LEVEL_BITS.hasOwnProperty(level)) level = 'M';
    var bytes = new TextEncoder().encode(text);
    var dataCodewords = DATA_CODEWORDS[level];

    // 1. 选择版本：4 位模式 + 字符计数 + 8 位/字节
    var version = -1;
    var i;
    for (i = 1; i <= MAX_VERSION; i += 1) {
      var countBits = i < 10 ? 8 : 16;
      if (4 + countBits + bytes.length * 8 <= dataCodewords[i - 1] * 8) {
        version = i;
        break;
      }
    }
    if (version === -1) {
      throw new Error('内容过长，超出当前支持范围（最多约 ' + (dataCodewords[MAX_VERSION - 1] - 3) + ' 字节，中文约 ' +
        Math.floor((dataCodewords[MAX_VERSION - 1] - 3) / 3) + ' 个字），请缩短内容或降低容错等级。');
    }

    var totalData = dataCodewords[version - 1];
    var capacityBits = totalData * 8;
    var cci = version < 10 ? 8 : 16;

    // 2. 组装比特流
    var bits = [];
    var putBits = function (value, length) {
      for (var b = length - 1; b >= 0; b -= 1) bits.push((value >>> b) & 1);
    };
    putBits(4, 4);            // 模式指示符：0100 = 字节模式
    putBits(bytes.length, cci);
    for (i = 0; i < bytes.length; i += 1) putBits(bytes[i], 8);

    // 终止符（最多 4 个 0）
    for (i = 0; i < 4 && bits.length < capacityBits; i += 1) bits.push(0);
    // 补齐到整字节
    while (bits.length % 8 !== 0) bits.push(0);

    var dataBytes = [];
    for (i = 0; i < bits.length; i += 8) {
      var byte = 0;
      for (var b2 = 0; b2 < 8; b2 += 1) byte = (byte << 1) | bits[i + b2];
      dataBytes.push(byte);
    }
    // 填充码字 0xEC / 0x11 交替
    var padToggle = true;
    while (dataBytes.length < totalData) {
      dataBytes.push(padToggle ? 0xec : 0x11);
      padToggle = !padToggle;
    }

    // 3. 分块 + RS 纠错 + 交织
    var blockCount = BLOCK_COUNT[level][version - 1];
    var ecPerBlock = EC_PER_BLOCK[level][version - 1];
    var baseLength = Math.floor(totalData / blockCount);
    var remainder = totalData % blockCount;

    var dataBlocks = [];
    var ecBlocks = [];
    var offset = 0;
    for (i = 0; i < blockCount; i += 1) {
      var length = baseLength + (i >= blockCount - remainder ? 1 : 0);
      var block = dataBytes.slice(offset, offset + length);
      offset += length;
      dataBlocks.push(block);
      ecBlocks.push(Array.prototype.slice.call(reedSolomon(Uint8Array.from(block), ecPerBlock)));
    }

    var finalBytes = [];
    var maxLength = 0;
    dataBlocks.forEach(function (block) { maxLength = Math.max(maxLength, block.length); });
    for (i = 0; i < maxLength; i += 1) {
      dataBlocks.forEach(function (block) {
        if (i < block.length) finalBytes.push(block[i]);
      });
    }
    for (i = 0; i < ecPerBlock; i += 1) {
      ecBlocks.forEach(function (block) { finalBytes.push(block[i]); });
    }

    // 4. 构建矩阵
    var size = version * 4 + 17;
    var modules = [];
    var reserved = [];
    for (i = 0; i < size; i += 1) {
      modules.push(new Array(size).fill(false));
      reserved.push(new Array(size).fill(false));
    }

    function setModule(row, col, dark) {
      modules[row][col] = !!dark;
      reserved[row][col] = true;
    }

    // 4.1 三个定位图形（含分隔符）
    function placeFinder(row0, col0) {
      for (var dr = -1; dr <= 7; dr += 1) {
        for (var dc = -1; dc <= 7; dc += 1) {
          var rr = row0 + dr;
          var cc = col0 + dc;
          if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
          var dark = (dr >= 0 && dr <= 6 && (dc === 0 || dc === 6)) ||
            (dc >= 0 && dc <= 6 && (dr === 0 || dr === 6)) ||
            (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4);
          setModule(rr, cc, dark);
        }
      }
    }
    placeFinder(0, 0);
    placeFinder(0, size - 7);
    placeFinder(size - 7, 0);

    // 4.2 校正图形（先于时序图形放置，与时序图形重叠处以校正图形为准）
    var alignment = ALIGNMENT[version - 1];
    for (var a = 0; a < alignment.length; a += 1) {
      for (var b3 = 0; b3 < alignment.length; b3 += 1) {
        var centerRow = alignment[a];
        var centerCol = alignment[b3];
        if (reserved[centerRow][centerCol]) continue; // 与定位图形重叠
        for (var dr2 = -2; dr2 <= 2; dr2 += 1) {
          for (var dc2 = -2; dc2 <= 2; dc2 += 1) {
            setModule(centerRow + dr2, centerCol + dc2, Math.max(Math.abs(dr2), Math.abs(dc2)) !== 1);
          }
        }
      }
    }

    // 4.3 时序图形
    for (i = 8; i < size - 8; i += 1) {
      if (!reserved[6][i]) setModule(6, i, i % 2 === 0);
      if (!reserved[i][6]) setModule(i, 6, i % 2 === 0);
    }

    // 4.4 预留格式信息区域（第 8 行 / 第 8 列）
    for (i = 0; i < 9; i += 1) {
      reserved[8][i] = true;
      reserved[i][8] = true;
    }
    for (i = 0; i < 8; i += 1) {
      reserved[8][size - 1 - i] = true;
      reserved[size - 1 - i][8] = true;
    }

    // 4.5 版本信息（版本 ≥ 7）
    if (version >= 7) {
      var versionBits = versionInfoBits(version);
      for (i = 0; i < 18; i += 1) {
        var versionBit = ((versionBits >> i) & 1) === 1;
        var vr = Math.floor(i / 3);
        var vc = (i % 3) + size - 11;
        modules[vr][vc] = versionBit;
        reserved[vr][vc] = true;
        modules[vc][vr] = versionBit;
        reserved[vc][vr] = true;
      }
    }

    // 4.6 放置数据比特（从右下角开始，两列一组蛇形上升）
    var bitIndex = 0;
    var totalBits = finalBytes.length * 8;
    var rowPos = size - 1;
    var direction = -1;

    for (var colPos = size - 1; colPos > 0; colPos -= 2) {
      if (colPos === 6) colPos -= 1; // 跳过竖向时序图形所在的第 6 列
      while (true) {
        for (var pair = 0; pair < 2; pair += 1) {
          var currentCol = colPos - pair;
          if (reserved[rowPos][currentCol]) continue;
          var bit = false;
          if (bitIndex < totalBits) {
            bit = ((finalBytes[bitIndex >> 3] >>> (7 - (bitIndex & 7))) & 1) === 1;
          }
          modules[rowPos][currentCol] = bit;
          bitIndex += 1;
        }
        rowPos += direction;
        if (rowPos < 0 || rowPos >= size) {
          rowPos -= direction;
          direction = -direction;
          break;
        }
      }
    }

    // 4.7 逐个掩码尝试，取惩罚分最低者
    function applyMask(base, mask) {
      var result = base.map(function (line) { return line.slice(); });
      for (var r = 0; r < size; r += 1) {
        for (var c = 0; c < size; c += 1) {
          if (reserved[r][c]) continue;
          if (maskCondition(mask, r, c)) result[r][c] = !result[r][c];
        }
      }
      return result;
    }

    function placeFormat(matrix, mask) {
      var formatBits = formatInfoBits(level, mask);
      for (var idx = 0; idx < 15; idx += 1) {
        var dark = ((formatBits >> idx) & 1) === 1;
        // 第一份：左上角（第 8 列竖向 + 第 8 行横向）
        if (idx < 6) matrix[idx][8] = dark;
        else if (idx < 8) matrix[idx + 1][8] = dark;
        else matrix[size - 15 + idx][8] = dark;

        // 第二份：右上角 + 左下角
        if (idx < 8) matrix[8][size - idx - 1] = dark;
        else if (idx < 9) matrix[8][15 - idx] = dark;
        else matrix[8][14 - idx] = dark;
      }
      matrix[size - 8][8] = true; // 固定的暗模块
    }

    var bestMatrix = null;
    var bestScore = Infinity;
    var bestMask = 0;

    var maskStart = forcedMask === undefined ? 0 : forcedMask;
    var maskEnd = forcedMask === undefined ? 7 : forcedMask;

    for (var mask = maskStart; mask <= maskEnd; mask += 1) {
      var candidate = applyMask(modules, mask);
      placeFormat(candidate, mask);
      var score = penaltyScore(candidate, size);
      if (score < bestScore) {
        bestScore = score;
        bestMatrix = candidate;
        bestMask = mask;
      }
    }

    return {
      size: size,
      version: version,
      mask: bestMask,
      modules: bestMatrix,
      level: level
    };
  }

  /* 供调试 / 测试使用 */
  global.QRCodeLite = { create: createMatrix };

  /* =========================================================================
   * 六、界面
   * ====================================================================== */
  var DEFAULT_TEXT = 'https://example.com';

  function render(root) {
    root.innerHTML = `
      <div class="field">
        <div class="label-row">
          <label class="label" for="qrText">内容（文本 / 链接 / 任意字符）</label>
          <span class="label-meta" id="qrBytes">0 字节</span>
        </div>
        <textarea id="qrText" class="textarea mono" rows="5" spellcheck="false"
          placeholder="输入链接或文本，例如 https://example.com">${DEFAULT_TEXT}</textarea>
      </div>

      <div class="form-row">
        <div class="form-item">
          <label class="label" for="qrSize">输出尺寸</label>
          <select id="qrSize" class="select">
            <option value="256">256 × 256</option>
            <option value="320" selected>320 × 320</option>
            <option value="420">420 × 420</option>
            <option value="512">512 × 512</option>
          </select>
        </div>
        <div class="form-item">
          <label class="label" for="qrLevel">容错等级</label>
          <select id="qrLevel" class="select">
            <option value="L">L · 约 7%</option>
            <option value="M" selected>M · 约 15%</option>
            <option value="Q">Q · 约 25%</option>
            <option value="H">H · 约 30%</option>
          </select>
        </div>
        <div class="form-item" style="flex:0 0 auto">
          <label class="label" for="qrFore">前景色</label>
          <input id="qrFore" type="color" value="#101014">
        </div>
        <div class="form-item" style="flex:0 0 auto">
          <label class="label" for="qrBack">背景色</label>
          <input id="qrBack" type="color" value="#ffffff">
        </div>
      </div>

      <div class="btn-row" style="margin-top:14px">
        <button type="button" class="btn primary" id="qrGenerate">生成二维码</button>
        <button type="button" class="btn" id="qrDownload">下载 PNG</button>
        <button type="button" class="btn" id="qrCopyImage">复制图片</button>
        <button type="button" class="btn ghost" id="qrSample">示例</button>
        <button type="button" class="btn ghost" id="qrClear">清空</button>
      </div>

      <div class="qr-stage">
        <canvas id="qrCanvas" width="320" height="320" role="img" aria-label="生成的二维码"></canvas>
      </div>

      <p class="status" id="qrStatus" hidden></p>
      <p class="hint">采用纯前端算法生成（版本 1-10，字节模式），不依赖任何第三方库；容错等级越高，可恢复的破损面积越大，但可容纳的内容越少。</p>
    `;

    var textInput = root.querySelector('#qrText');
    var sizeSelect = root.querySelector('#qrSize');
    var levelSelect = root.querySelector('#qrLevel');
    var foreInput = root.querySelector('#qrFore');
    var backInput = root.querySelector('#qrBack');
    var canvas = root.querySelector('#qrCanvas');
    var status = root.querySelector('#qrStatus');
    var byteLabel = root.querySelector('#qrBytes');
    var ctx = canvas.getContext('2d');
    var hasResult = false;

    function setStatus(type, text) {
      status.className = 'status ' + type;
      status.textContent = text;
      status.hidden = false;
    }

    function draw(result) {
      var target = Number(sizeSelect.value) || 320;
      var quiet = 4; // 四周留白 4 个模块，保证可扫描
      var totalModules = result.size + quiet * 2;
      var scale = Math.max(1, Math.floor(target / totalModules));
      var pixels = totalModules * scale;

      canvas.width = pixels;
      canvas.height = pixels;
      canvas.style.width = Math.min(target, pixels) + 'px';
      canvas.style.height = Math.min(target, pixels) + 'px';

      ctx.fillStyle = backInput.value;
      ctx.fillRect(0, 0, pixels, pixels);
      ctx.fillStyle = foreInput.value;

      for (var row = 0; row < result.size; row += 1) {
        for (var col = 0; col < result.size; col += 1) {
          if (result.modules[row][col]) {
            ctx.fillRect((col + quiet) * scale, (row + quiet) * scale, scale, scale);
          }
        }
      }
      hasResult = true;
    }

    function generate(silent) {
      var text = textInput.value;
      byteLabel.textContent = new TextEncoder().encode(text).length + ' 字节';

      if (!text.trim()) {
        hasResult = false;
        ctx.fillStyle = backInput.value;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setStatus('info', '请输入需要生成二维码的内容。');
        return;
      }

      try {
        var result = createMatrix(text, levelSelect.value);
        draw(result);
        setStatus('ok', '生成成功：版本 ' + result.version + '（' + result.size + ' × ' + result.size +
          ' 模块），容错等级 ' + levelSelect.value + '，掩码 ' + result.mask + '。');
        if (!silent) window.UI.toast('二维码已生成', 'success');
      } catch (error) {
        hasResult = false;
        // 清空画布，避免残留上一次的二维码造成误解
        ctx.fillStyle = backInput.value;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setStatus('err', error.message);
        if (!silent) window.UI.toast('生成失败：内容过长', 'error');
      }
    }

    var debouncedGenerate = window.UI.debounce(function () { generate(true); }, 220);

    textInput.addEventListener('input', function () {
      byteLabel.textContent = new TextEncoder().encode(textInput.value).length + ' 字节';
      debouncedGenerate();
    });
    sizeSelect.addEventListener('change', function () { generate(true); });
    levelSelect.addEventListener('change', function () { generate(true); });
    foreInput.addEventListener('input', function () { generate(true); });
    backInput.addEventListener('input', function () { generate(true); });

    root.querySelector('#qrGenerate').addEventListener('click', function () { generate(false); });

    root.querySelector('#qrSample').addEventListener('click', function () {
      textInput.value = DEFAULT_TEXT;
      generate(false);
      window.UI.toast('已填入示例内容', 'info');
    });

    root.querySelector('#qrClear').addEventListener('click', function () {
      textInput.value = '';
      byteLabel.textContent = '0 字节';
      hasResult = false;
      ctx.fillStyle = backInput.value;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      status.hidden = true;
      textInput.focus();
      window.UI.toast('已清空', 'success');
    });

    root.querySelector('#qrDownload').addEventListener('click', function () {
      if (!hasResult) {
        window.UI.toast('请先生成二维码', 'warn');
        return;
      }
      canvas.toBlob(function (blob) {
        if (!blob) {
          window.UI.toast('导出失败，请重试', 'error');
          return;
        }
        window.UI.downloadBlob(blob, 'qrcode-' + Date.now() + '.png');
        window.UI.toast('已开始下载 PNG', 'success');
      }, 'image/png');
    });

    root.querySelector('#qrCopyImage').addEventListener('click', function () {
      if (!hasResult) {
        window.UI.toast('请先生成二维码', 'warn');
        return;
      }
      if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
        window.UI.toast('当前浏览器不支持复制图片，请使用「下载 PNG」', 'warn');
        return;
      }
      canvas.toBlob(function (blob) {
        if (!blob) return;
        navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(function () {
          window.UI.toast('图片已复制到剪贴板', 'success');
        }).catch(function () {
          window.UI.toast('复制失败，请使用「下载 PNG」', 'error');
        });
      }, 'image/png');
    });

    generate(true);
  }

  window.ToolModules['qrcode'] = render;
})(window);
