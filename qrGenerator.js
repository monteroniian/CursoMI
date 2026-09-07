/* ==========================================================================
   CursosMi - Mercado Pago QR Generator Utility
   ========================================================================== */

export function renderQRCode(canvasElement, textData) {
    if (!canvasElement) return;
    const ctx = canvasElement.getContext('2d');
    const width = canvasElement.width || 200;
    const height = canvasElement.height || 200;

    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw QR Frame Accent
    ctx.strokeStyle = '#009ee3'; // Mercado Pago Blue
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, width - 8, height - 8);

    // Draw QR pattern simulation for Mercado Pago Checkout
    const cells = 15;
    const cellSize = (width - 30) / cells;
    const offsetX = 15;
    const offsetY = 15;

    ctx.fillStyle = '#0f172a';
    
    // Seed pseudo-random pattern based on string
    let hash = 0;
    for (let i = 0; i < textData.length; i++) {
        hash = ((hash << 5) - hash) + textData.charCodeAt(i);
        hash |= 0;
    }

    for (let row = 0; row < cells; row++) {
        for (let col = 0; col < cells; col++) {
            // Finder patterns in corners
            const isTopLeft = row < 4 && col < 4;
            const isTopRight = row < 4 && col >= cells - 4;
            const isBottomLeft = row >= cells - 4 && col < 4;

            if (isTopLeft || isTopRight || isBottomLeft) {
                if (row === 0 || row === 3 || col === 0 || col === 3 || (row >= 1 && row <= 2 && col >= 1 && col <= 2)) {
                    ctx.fillRect(offsetX + col * cellSize, offsetY + row * cellSize, cellSize, cellSize);
                }
            } else {
                const val = (row * cells + col + hash) % 3;
                if (val === 0 || val === 1) {
                    ctx.fillRect(offsetX + col * cellSize, offsetY + row * cellSize, cellSize - 0.5, cellSize - 0.5);
                }
            }
        }
    }

    // Mercado Pago Logo in Center
    const logoSize = 36;
    const logoX = (width - logoSize) / 2;
    const logoY = (height - logoSize) / 2;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(logoX - 2, logoY - 2, logoSize + 4, logoSize + 4);
    
    ctx.fillStyle = '#009ee3';
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MP', width / 2, height / 2);
}
