(()=>{
  // Create a 48x48 1-bit graphics buffer (msb first, as expected by Bangle.js 2)
  var g = Graphics.createArrayBuffer(48,48,1,{msb:true});
  g.clear();
  // Draw a centred capital "R"
  g.setFont("6x8",2);
  g.setFontAlign(0,0); // centre alignment
  g.drawString("R",24,24);
  // Return heatshrink-compressed image data so the loader stores it as runstr.img
  return require("heatshrink").compress(g.buffer);
})();