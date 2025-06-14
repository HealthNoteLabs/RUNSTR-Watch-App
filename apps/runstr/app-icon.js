// RUNSTR icon - 48x48px simple "R" letter
var g = Graphics.createArrayBuffer(48,48,1,{msb:true});
g.clear();
g.setColor(1);
g.setFont("6x8",4); // Large font
g.setFontAlign(0,0); // Center align
g.drawString("R", 24, 24); // Draw "R" in center

// Save to storage as runstr.img
require("Storage").write("runstr.img", require("heatshrink").compress(g.buffer));
print("RUNSTR icon created and saved to storage");