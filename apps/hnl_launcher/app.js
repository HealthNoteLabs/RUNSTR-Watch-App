// HealthNote Labs Custom Launcher

const APP_CACHE_FILE = "hnl_launcher.cache.json";
let appList = [];
let currentSelection = 0;
const APPS_PER_PAGE = 3; // Number of apps to display per page
let currentPage = 0;

// Load settings or set defaults
let settings = Object.assign({
  font: "12x20",
  showClock: true,
  showBATT: true,
  theme: {
    fg: g.theme.fg,
    bg: g.theme.bg,
    fgH: g.theme.fgH,
    bgH: g.theme.bgH,
  }
}, require('Storage').readJSON("hnl_launcher.json", true) || {});

function saveSettings() {
  require('Storage').writeJSON("hnl_launcher.json", settings);
}

function getApps() {
  let apps = require("Storage").list(/\.info$/)
    .map(appFile => {
      let app = require("Storage").readJSON(appFile, 1);
      return app && {
        id: appFile.slice(0, -5), // Remove .info
        name: app.name,
        type: app.type,
        sortorder: app.sortorder,
        icon: app.icon ? require("Storage").read(app.icon) : null,
        src: app.src
      };
    })
    .filter(app => app && (app.id === 'runstr' || app.id.startsWith('hnl_') || (app.tags && app.tags.includes('healthnotelabs'))));

  // Sort apps: by sortorder, then by name
  apps.sort((a, b) => {
    let sa = (a.sortorder !== undefined) ? a.sortorder : 0;
    let sb = (b.sortorder !== undefined) ? b.sortorder : 0;
    if (sa < sb) return -1;
    if (sa > sb) return 1;
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });
  return apps;
}

function drawApp(index, r) {
  let app = appList[index];
  if (!app) return;
  
  let x = r.x;
  let y = r.y;
  let h = r.h;
  let w = r.w;

  if (index === currentSelection) {
    g.setColor(settings.theme.bgH).fillRect(x, y, x + w - 1, y + h - 1);
    g.setColor(settings.theme.fgH);
  } else {
    g.setColor(settings.theme.bg).fillRect(x, y, x + w - 1, y + h - 1);
    g.setColor(settings.theme.fg);
  }

  let iconX = x + 4;
  let textX = x + 4;
  if (app.icon) {
    try {
      g.drawImage(app.icon, iconX, y + (h - 48) / 2);
      textX += 52; // Icon width + padding
    } catch (e) {
      // Icon drawing error
    }
  }
  g.setFont(settings.font).setFontAlign(-1, 0);
  g.drawString(app.name, textX, y + h / 2);
}

function draw() {
  g.clear();
  Bangle.drawWidgets(); // Draw widgets (like clock, battery)
  
  let r = Bangle.appRect;
  let x = r.x;
  let y = r.y;
  let w = r.w;
  let h = r.h / APPS_PER_PAGE; // Height for each app entry

  let startIdx = currentPage * APPS_PER_PAGE;
  let endIdx = Math.min(startIdx + APPS_PER_PAGE, appList.length);

  for (let i = startIdx; i < endIdx; i++) {
    drawApp(i, { x: x, y: y + (i - startIdx) * h, w: w, h: h });
  }
  
  // Draw scroll indicators if needed
  if (appList.length > APPS_PER_PAGE) {
    g.setColor(settings.theme.fg);
    if (currentPage > 0) {
      g.fillPoly([r.x + r.w - 8, r.y + 4, r.x + r.w - 12, r.y + 10, r.x + r.w - 4, r.y + 10]); // Up arrow
    }
    if (endIdx < appList.length) {
      g.fillPoly([r.x + r.w - 8, r.y + r.h - 4, r.x + r.w - 12, r.y + r.h - 10, r.x + r.w - 4, r.y + r.h - 10]); // Down arrow
    }
  }
}

function launchApp(app) {
  if (!app || !app.src) {
    E.showMessage("App Invalid", "Launcher");
    setTimeout(draw, 1000);
    return;
  }
  if (require("Storage").read(app.src) === undefined) {
    E.showMessage("App Corrupt", "Launcher");
    setTimeout(draw, 1000);
    return;
  }
  E.showMessage("Loading "+app.name, "Launcher");
  load(app.src);
}

function onSwipe(dir) {
  if (dir < 0) { // Swipe Up or Left (Previous)
    currentSelection--;
    if (currentSelection < 0) {
      currentSelection = appList.length - 1;
    }
  } else { // Swipe Down or Right (Next)
    currentSelection++;
    if (currentSelection >= appList.length) {
      currentSelection = 0;
    }
  }
  currentPage = Math.floor(currentSelection / APPS_PER_PAGE);
  draw();
}

// Main execution
appList = getApps();

if (appList.length === 0) {
  E.showMessage("No HNL Apps Found", "HealthNote Launcher");
  // Optionally, load default launcher or show message
  // setTimeout(() => load("launch.js"), 2000);
} else {
  g.clear();
  Bangle.loadWidgets();
  Bangle.drawWidgets();
  draw();

  setWatch(() => {
    if (appList[currentSelection]) {
      launchApp(appList[currentSelection]);
    }
  }, BTN1, { repeat: true, edge: "falling" });

  Bangle.on("swipe", onSwipe);
  // For Bangle.js 2, BTN2 for previous, BTN3 for next
  setWatch(() => onSwipe(-1), BTN2, {repeat:true});
  setWatch(() => onSwipe(1), BTN3, {repeat:true});
}

// Clear launcher itself from RAM
E.on('kill', () => {
  // You could save currentSelection or currentPage here if needed
}); 