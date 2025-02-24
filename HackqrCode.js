 function unicodeToBinary(text) {
            return text.split('').map(char => char.charCodeAt(0).toString(2).padStart(8, '0')).join('');
        }

        function makeMultiple(num, factor) {
            return num % factor === 0 ? num : num + (factor - (num % factor));
        }

        function trimZeroBytes(str) {
            let newStr = "";
            for (let i = 0; i < str.length; i++) {
                if (str.charCodeAt(i) !== 0) {
                    newStr += str[i];
                }
            }
              return newStr;
        }

        function padToMultipleOf(str, num) {
          const remainder = str.length % num;
          if (remainder !== 0) {
            const spacesToAdd = num - remainder;
            str += ' '.repeat(spacesToAdd);
          }
          return str;
        }


        function encodeMessage() {
            let message = document.getElementById('textInput').value;
            if (!message) return;
            const cols = makeMultiple(Math.ceil(Math.sqrt(message.length * 8)), 2);
            const rows = makeMultiple(Math.ceil((message.length * 8) / cols), 4);
            message = padToMultipleOf(message, cols * 2);
            const binStr = unicodeToBinary(message);
            //console.log(binStr, cols, rows, binStr.length,message, message.length);
            const scale = 20;

            const binMatrix = Array.from({ length: rows }, () => Array(cols).fill(0));

            for (let i = 0; i < binStr.length / 8; i++) {
    let current_row = Math.floor((2 * i) / cols) * 4;
    let current_col = (2 * i) % cols;

    // Ensure row exists in binMatrix
    if (!binMatrix[current_row]) binMatrix[current_row] = Array(cols).fill(0);
    if (!binMatrix[current_row + 1]) binMatrix[current_row + 1] = Array(cols).fill(0);
    if (!binMatrix[current_row + 2]) binMatrix[current_row + 2] = Array(cols).fill(0);
    if (!binMatrix[current_row + 3]) binMatrix[current_row + 3] = Array(cols).fill(0);

    for (let j = 0; j < 4; j++) {
        if (current_col + 1 < cols) { // Ensure within bounds
            binMatrix[current_row + j][current_col] = parseInt(binStr[8 * i + 2 * j]);
            binMatrix[current_row + j][current_col + 1] = parseInt(binStr[8 * i + 2 * j + 1]);
        }
    }
}


            const canvas = document.getElementById('encodeCanvas');
            const ctx = canvas.getContext('2d');
            canvas.width = cols * scale;
            canvas.height = rows * scale;

            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    ctx.fillStyle = binMatrix[y][x] ? "black" : "white";
                    ctx.fillRect(x * scale, y * scale, scale, scale);
                }
            }

            const link = document.getElementById('downloadLink');
            link.href = canvas.toDataURL();
            link.download = "encoded_message.png";
            link.style.display = 'block';
            link.textContent = "Download Encoded Image";
        }

        document.getElementById('fileInput').addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.getElementById('decodeCanvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);

                    const imageData = ctx.getImageData(0, 0, img.width, img.height);
                    const data = imageData.data;
                    const binaryData = [];

                    for (let y = 3; y < img.height; y += 21) {
                        let row = [];
                        for (let x = 3; x < img.width; x += 21) {
                            const index = (y * img.width + x) * 4;
                            const color = data[index];
                            row.push(color < 128 ? 1 : 0);
                        }
                        binaryData.push(row);
                    }

                    let message = "";
                    const rows = binaryData.length;
                    const cols = binaryData[0].length;
                    const num_chars = (cols * rows) / 8;

                    for (let i = 0; i < num_chars; i++) {
                        let binaryString = "";
                        let char_row = Math.floor((2 * i) / cols) * 4;
                        let char_col = (2 * i) % cols;
                        for (let j = 0; j < 4; j++) {
                            binaryString += binaryData[char_row + j][char_col];
                            binaryString += binaryData[char_row + j][char_col + 1];
                        }
                        message += String.fromCharCode(parseInt(binaryString, 2));
                    }

                    document.getElementById('output').textContent = trimZeroBytes(message);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });