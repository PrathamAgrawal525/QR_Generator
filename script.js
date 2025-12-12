/* ============================ */
/*       ELEMENT SELECTORS      */
/* ============================ */
const $ = (id) => document.getElementById(id);

const dataInput = $('data');
const sizeInput = $('size');
const borderInput = $('border');
const fgInput = $('fg');
const bgInput = $('bg');
const logoInput = $('logo');
const logoScale = $('logoScale');

const qrPreview = $('qrPreview');
const previewText = $('previewText');
const qrWrapper = $('qrWrapper');

const previewBtn = $('previewBtn');
const downloadBtn = $('downloadBtn');

let logoImage = null;

/* ============================ */
/*        ERROR FUNCTION        */
/* ============================ */
function showError(msg) {
    const err = $('error');
    err.textContent = msg || "";
}

/* ============================ */
/*        LOAD LOGO IMAGE       */
/* ============================ */
function loadLogoFile(file) {
    return new Promise((resolve, reject) => {
        if (!file) return resolve(null);

        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject("Invalid image file");
            img.src = reader.result;
        };
        reader.onerror = () => reject("File read error");
        reader.readAsDataURL(file);
    });
}

logoInput.addEventListener("change", async () => {
    const file = logoInput.files[0];
    try {
        logoImage = await loadLogoFile(file);
        drawQR();
    } catch (err) {
        showError(err);
        logoImage = null;
    }
});

/* ============================ */
/*        MAIN QR FUNCTION      */
/* ============================ */
function drawQR() {
    const value = dataInput.value.trim();
    if (!value) {
        showError("Enter text to generate QR.");
        return;
    }

    showError("");

    const size = parseInt(sizeInput.value) || 400;
    const border = parseInt(borderInput.value) || 4;
    const fg = fgInput.value;
    const bg = bgInput.value;
    const scale = parseFloat(logoScale.value) || 0.18;

    // Generate QR
    const qr = new QRious({
        value,
        size,
        background: bg,
        foreground: fg,
        padding: 0,
        level: "H"
    });

    // Prepare canvas for adding logo
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    const baseImg = new Image();

    baseImg.onload = () => {
        ctx.drawImage(baseImg, 0, 0, size, size);

        // Add logo if available
        if (logoImage) {
            const logoSize = size * scale;
            const x = (size - logoSize) / 2;
            const y = (size - logoSize) / 2;

            ctx.save();

            // Optional rounded backdrop for logo
            ctx.fillStyle = bg;
            ctx.beginPath();
            ctx.arc(x + logoSize / 2, y + logoSize / 2, logoSize / 2 + 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.drawImage(logoImage, x, y, logoSize, logoSize);
            ctx.restore();
        }

        // Set final QR image
        qrPreview.src = canvas.toDataURL();

        // Show and animate
        qrPreview.style.display = "block";
        previewText.style.display = "none";

        // Reset animation
        qrPreview.classList.remove("show");
        qrWrapper.classList.remove("qr-glow");
        void qrPreview.offsetWidth;
        void qrWrapper.offsetWidth;

        // Apply blur-in + glow animation
        qrPreview.classList.add("show");
        qrWrapper.classList.add("qr-glow");
    };

    baseImg.src = qr.toDataURL();
}

/* ============================ */
/*       BUTTON HANDLERS        */
/* ============================ */
previewBtn.onclick = drawQR;

/* ---- Download Button ---- */
downloadBtn.addEventListener("click", () => {

    // Button pulse animation
    downloadBtn.classList.remove("pulse");
    void downloadBtn.offsetWidth;
    downloadBtn.classList.add("pulse");

    if (qrPreview.src === "" || qrPreview.style.display === "none") {
        showError("Generate a QR first.");
        return;
    }

    const link = document.createElement("a");
    link.href = qrPreview.src;
    link.download = "qrcode.png";
    link.click();
});

/* ============================ */
/*     LIVE UPDATE HANDLERS     */
/* ============================ */
[dataInput, sizeInput, borderInput, fgInput, bgInput, logoScale].forEach(input => {
    input.addEventListener("input", () => {
        if (dataInput.value.trim() !== "") drawQR();
    });
});
