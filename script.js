// Same script as previous version — fully works on mobile without modification

// script.js — client-side QR generation with Qrious + logo overlay
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
const qrCanvas = $('qrCanvas');
const errorBox = $('error');

let logoImage = null;

function showError(msg) {
    errorBox.textContent = msg || '';
}

function loadLogo(file) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject("Invalid image");
            img.src = r.result;
        };
        r.onerror = reject;
        r.readAsDataURL(file);
    });
}

function drawQR() {
    const value = dataInput.value.trim();
    if (!value) {
        showError("Enter text!");
        return;
    }
    showError("");

    const size = parseInt(sizeInput.value) || 400;
    const fg = fgInput.value;
    const bg = bgInput.value;
    const border = parseInt(borderInput.value) || 4;

    const qr = new QRious({
        value,
        size,
        background: bg,
        foreground: fg,
        padding: border,
        level: "H"
    });

    const ctx = qrCanvas.getContext("2d");
    qrCanvas.width = size;
    qrCanvas.height = size;

    const img = new Image();
    img.onload = () => {
        ctx.drawImage(img, 0, 0, size, size);

        if (logoImage) {
            const scale = parseFloat(logoScale.value);
            const logoSize = size * scale;
            const x = (size - logoSize) / 2;
            const y = (size - logoSize) / 2;
            ctx.drawImage(logoImage, x, y, logoSize, logoSize);
        }
    };
    img.src = qr.toDataURL();
}

previewBtn.onclick = drawQR;
downloadBtn.onclick = () => {
    drawQR();
    setTimeout(() => {
        const link = document.createElement("a");
        link.download = "qrcode.png";
        link.href = qrCanvas.toDataURL("image/png");
        link.click();
    }, 150);
};

dropZone.onclick = () => logoInput.click();
logoInput.onchange = async () => {
    const file = logoInput.files[0];
    if (file) {
        logoImage = await loadLogo(file);
        drawQR();
    }
};

logoScale.oninput = () => {
    scaleLabel.textContent = Math.round(logoScale.value * 100) + "%";
    drawQR();
};

drawQR();
