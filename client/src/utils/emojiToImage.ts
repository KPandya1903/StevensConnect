export function emojiToFile(emoji: string): Promise<File> {
  return new Promise((resolve, reject) => {
    const size = 400;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) { reject(new Error('Canvas not supported')); return; }

    // Gradient background
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#EEF2FF');
    grad.addColorStop(1, '#E0E7FF');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, 32);
    ctx.fill();

    // Emoji centered
    ctx.font = '200px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, size / 2, size / 2 + 10);

    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
      resolve(new File([blob], 'emoji.png', { type: 'image/png' }));
    }, 'image/png');
  });
}
