// script.js — client-side QR generation with Qrious + logo overlay
// Save next to index.html and styles.css

const $ = (id) => document.getElementById(id);

const dataInput = $('data');
const sizeInput = $('size');
const borderInput = $('border');
const fgInput = $('fg');
const bgInput = $('bg');
const logoInput = $('logo');
const dropZone = $('dropZone');
const logoScale = $('logoScale');
const scaleLabel = $('scaleLabel');
const previewBtn = $('previewBtn');
const downloadBtn = $('downloadBtn');
const resetBtn = $('resetBtn');
const qrCanvas = $('qrCanvas');
const errorBox = $('error');
const previewInfo = $('info');

let logoImage = null; // HTMLImageElement or null
const MAX_LOGO_BYTES = 4 * 1024 * 1024; // 4MB

// helper to show errors
function showError(msg) {
    errorBox.textContent = msg || '';
    if (msg) previewInfo.textContent = 'Error — see message';
    else previewInfo.textContent = 'Looks great — scan to test';
}

// read logo file into an Image object (returns Promise)
function loadLogoFile(file) {
    return new Promise((resolve, reject) => {
        if (!file) return resolve(null);
        if (file.size > MAX_LOGO_BYTES) return reject(new Error('Logo too large (max 4MB)'));
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Invalid image file'));
            img.src = reader.result;
        };
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.readAsDataURL(file);
    });
}

// draw QR to canvas using Qrious then overlay logo (if provided)
function drawQR() {
    const value = dataInput.value.trim();
    if (!value) {
        clearCanvas();
        showError('Enter text or URL to generate QR');
        return;
    }
    showError('');
    const size = Math.min(Math.max(parseInt(sizeInput.value, 10) || 400, 128), 1200);
    const border = Math.max(parseInt(borderInput.value, 10) || 4, 0);
    const fg = fgInput.value || '#000000';
    const bg = bgInput.value || '#ffffff';
    const scale = parseFloat(logoScale.value) || 0.18;

    // Create QR on an offscreen canvas with QR modules (qrious)
    const qr = new QRious({
        value,
        size,
        level: 'H',   // high error correction (helps when logo overlaid)
        background: bg,
        foreground: fg,
        padding: border  // Qrious uses `padding` param (pixels) — we emulate border by adding pixels
    });

    // Put the QR onto our main canvas
    qrCanvas.width = size;
    qrCanvas.height = size;
    const ctx = qrCanvas.getContext('2d');
    ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
    // draw the canvas from qrious dataURL
    const dataURL = qr.toDataURL();
    const tempImg = new Image();
    tempImg.onload = () => {
        // Draw QR base
        ctx.drawImage(tempImg, 0, 0, size, size);

        // If logoImage exists, overlay centered
        if (logoImage) {
            // compute logo size based on scale fraction of QR width
            const maxLogoW = Math.round(size * scale);
            // preserve aspect ratio
            const aspect = logoImage.width / logoImage.height;
            let lw = maxLogoW, lh = Math.round(maxLogoW / aspect);
            if (lh > maxLogoW) {
                lh = maxLogoW;
                lw = Math.round(maxLogoW * aspect);
            }

            const lx = Math.round((size - lw) / 2);
            const ly = Math.round((size - lh) / 2);

            // Draw a subtle rounded white backdrop behind logo for contrast when bg is dark
            const pad = Math.round(Math.min(lw, lh) * 0.08);
            ctx.fillStyle = bg; // use chosen background so overlay looks seamless
            roundRect(ctx, lx - pad, ly - pad, lw + pad * 2, lh + pad * 2, Math.max(8, Math.round(lw * 0.12)), true, false);

            // then draw the logo
            ctx.drawImage(logoImage, lx, ly, lw, lh);
        }
    };
    tempImg.onerror = () => showError('Failed to render QR image');
    tempImg.src = dataURL;
}

// utility: draw rounded rectangle
function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    if (typeof stroke == 'undefined') stroke = true;
    if (typeof r === 'undefined') r = 5;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
}

// clear canvas placeholder
function clearCanvas() {
    const ctx = qrCanvas.getContext('2d');
    ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
    // draw a subtle placeholder
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, 0, qrCanvas.width, qrCanvas.height);
}

// download current canvas as PNG
function downloadPNG() {
    // Force a fresh draw to ensure latest data
    drawQR();
    setTimeout(() => {
        qrCanvas.toBlob((blob) => {
            if (!blob) { showError('Failed to export image'); return; }
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const safeName = (dataInput.value.trim() ? dataInput.value.trim().replace(/\s+/g, '_').slice(0, 30) : 'qrcode');
            a.download = `${safeName}.png`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        }, 'image/png');
    }, 120); // tiny delay for canvas to be ready
}

// drag & drop handlers for logo
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag'); });
dropZone.addEventListener('dragleave', (e) => { dropZone.classList.remove('drag'); });
dropZone.addEventListener('drop', async (e) => {
    e.preventDefault(); dropZone.classList.remove('drag');
    const file = e.dataTransfer.files[0];
    await handleLogoFile(file);
});

// file input change
logoInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    await handleLogoFile(file);
});

async function handleLogoFile(file) {
    if (!file) { logoImage = null; showError(''); drawQR(); return; }
    try {
        const img = await loadLogoFile(file);
        logoImage = img;
        showError('');
        drawQR();
    } catch (err) {
        logoImage = null; showError(err.message);
    }
}

// UI events
previewBtn.addEventListener('click', drawQR);
downloadBtn.addEventListener('click', downloadPNG);
resetBtn.addEventListener('click', () => {
    dataInput.value = '';
    sizeInput.value = 400;
    borderInput.value = 4;
    fgInput.value = '#0b172a';
    bgInput.value = '#ffffff';
    logoInput.value = '';
    logoImage = null;
    logoScale.value = 0.18;
    scaleLabel.textContent = Math.round(logoScale.value * 100) + '%';
    showError('');
    clearCanvas();
});

// live updates with debounce
let debounce;
[dataInput, sizeInput, fgInput, bgInput, borderInput].forEach(el => {
    el.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(drawQR, 550);
    });
});
logoScale.addEventListener('input', () => {
    scaleLabel.textContent = Math.round(parseFloat(logoScale.value) * 100) + '%';
    clearTimeout(debounce);
    debounce = setTimeout(drawQR, 300);
});

// initialize placeholder
clearCanvas();
previewInfo.textContent = 'Enter text to create a QR';

// optional: pre-load a sample "timepass" QR if user asked earlier
// This sample points to a fun page — change as you like:
(function preloadExample() {
    dataInput.value = 'https://example.com/just-for-fun';
    drawQR();
})();
