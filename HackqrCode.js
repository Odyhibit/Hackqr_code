// ----------------------------------------
// utilities
// ----------------------------------------
const encoder = new TextEncoder();
const utf8Decoder = new TextDecoder();

// turn a Uint8Array of bytes into a big binary string “010101…”
function bytesToBinStr(bytes) {
  return Array.from(bytes)
              .map(b => b.toString(2).padStart(8,'0'))
              .join('');
}

// turn a binary string “010101…” into a Uint8Array of bytes
function binStrToBytes(binStr) {
  let bytes = [];
  for (let i = 0; i < binStr.length; i += 8) {
    bytes.push(parseInt(binStr.slice(i, i+8), 2));
  }
  return new Uint8Array(bytes);
}

// round up to a multiple
function roundUp(n, factor) {
  return n + (factor - (n % factor)) % factor;
}

// ----------------------------------------
// ENCODE
// ----------------------------------------
function encodeMessage() {
  let msg = document.getElementById('textInput').value;
  if (!msg) return;

  // 1) encode to UTF-8 bytes
  let bytes = encoder.encode(msg);

  // 2) compute layout in *bits*
  let bitCount = bytes.length * 8;
  let cols = roundUp(Math.ceil(Math.sqrt(bitCount)), 2);
  let rows = roundUp(Math.ceil(bitCount / cols), 4);

  // 3) pad our byte-array so rows*cols is an exact multiple of 8
  let totalBits = cols * rows;
  let totalBytes = totalBits / 8;
  if (bytes.length < totalBytes) {
    let padded = new Uint8Array(totalBytes);
    padded.set(bytes);
    bytes = padded;
  }

  // 4) build a flat binary string
  const binStr = Array.from(bytes)
    .map(b => b.toString(2).padStart(8, '0'))
    .join('');

  // 5) fill a 2D matrix of bits, 2 bits per “cell group” as you had it
  let binMatrix = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < totalBytes; i++) {
    let row = Math.floor((2 * i) / cols) * 4;
    let col = (2 * i) % cols;
    let byteBits = binStr.slice(i*8, i*8+8);
    for (let j = 0; j < 4; j++) {
      let bitPair = byteBits.slice(2*j, 2*j+2);
      binMatrix[row + j][col    ] = +bitPair[0];
      binMatrix[row + j][col + 1] = +bitPair[1];
    }
  }

  // 6) draw to canvas
  const scale = 20;
  const canvas = document.getElementById('encodeCanvas');
  const ctx    = canvas.getContext('2d');
  canvas.width = cols * scale;
  canvas.height= rows * scale;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      ctx.fillStyle = binMatrix[y][x] ? 'black' : 'white';
      ctx.fillRect(x*scale, y*scale, scale, scale);
    }
  }

  // 7) make download link
  const link = document.getElementById('downloadLink');
  link.href    = canvas.toDataURL();
  link.download= 'encoded_message.png';
  link.style.display = 'block';
  link.textContent   = 'Download Encoded Image';
}

// ————————————————————————————————————————————
// DECODE
// ————————————————————————————————————————————
document.getElementById('fileInput')
  .addEventListener('change', function(ev) {
    const file = ev.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.getElementById('decodeCanvas');
        const ctx    = canvas.getContext('2d');
        canvas.width  = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Rebuild the same rows×cols bit-matrix you used on encode
        const scale = 20;            // must match your encoder
        const cols  = img.width / scale;
        const rows  = img.height / scale;
        const offset = Math.floor(scale/2);
        const imgData = ctx.getImageData(0,0,img.width,img.height).data;

        // sample into binMatrix[r][c]
        const binMatrix = Array.from(
          { length: rows },
          () => Array(cols).fill(0)
        );
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            let x = c*scale + offset;
            let y = r*scale + offset;
            let idx = (y*img.width + x)*4;
            binMatrix[r][c] = imgData[idx] < 128 ? 1 : 0;
          }
        }

        // reconstruct each byte in the 2×4 pattern
        const totalBytes = (rows * cols) / 8;
        let bytes = new Uint8Array(totalBytes);
        for (let i = 0; i < totalBytes; i++) {
          const charRow = Math.floor((2*i) / cols) * 4;
          const charCol = (2*i) % cols;
          let bitStr = "";
          for (let j = 0; j < 4; j++) {
            bitStr += binMatrix[charRow + j][charCol    ];
            bitStr += binMatrix[charRow + j][charCol + 1];
          }
          bytes[i] = parseInt(bitStr, 2);
        }

        // strip trailing NUL padding bytes
        let end = bytes.length;
        while (end > 0 && bytes[end - 1] === 0) end--;
        bytes = bytes.slice(0, end);

        // **decode** the entire byte sequence as UTF-8
        const message = utf8Decoder.decode(bytes);

        // show it (use .value if it's a textarea/input)
        document.getElementById('output').textContent = message;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });