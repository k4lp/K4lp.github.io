// js/canvas.js
class HTMLCanvas {
  constructor(canvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }
  clear(){
    this.ctx.clearRect(0,0,this.canvas.width, this.canvas.height);
  }
  async renderHTML(html, w=800, h=600, scale=1){
    // Render HTML into canvas via SVG foreignObject
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <foreignObject width="100%" height="100%">
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap');
      body { font-family: 'Geist', sans-serif; }
    </style>
    <div xmlns="http://www.w3.org/1999/xhtml">${html}</div>
  </foreignObject>
</svg>`;
    const blob = new Blob([svg], {type:'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise((res, rej)=>{
      img.onload = res; img.onerror = rej; img.src = url;
    });
    this.canvas.width = w*scale; this.canvas.height = h*scale;
    this.ctx.setTransform(scale,0,0,scale,0,0);
    this.ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
  }
}
window.HTMLCanvas = HTMLCanvas;
