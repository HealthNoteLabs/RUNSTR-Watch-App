// RUNSTR - Enhanced Run Tracking App with History, Goals & Alerts
// Phase 3-5 Implementation: Enhanced Stats + Goal Setting + Distance Alerts

// BLE UUIDs for RUNSTR Sync Service
const RUNSTR_SERVICE_UUID = "00000001-7275-6E73-7472-5F69645F3031";
const RUNSTR_DATA_CHAR_UUID = "00000002-7275-6E73-7472-5F69645F3031";

let running = false;
let lastGPS = null;
let updateInterval = null;
let stepCount = 0;
let gpsFix = { fix: 0 };
let lastTouchTime = 0;
let screenNeedsRedraw = true;

// Phase 3-5: Enhanced settings structure with goals and alerts
let settings = Object.assign({
  units: "km",
  showPace: true,
  vibrate: true,
  // Goal settings
  goalType: "none", // "none", "distance", "time", "steps"
  goalValue: 0,     // meters, milliseconds, or step count
  // Alert settings
  distanceAlerts: true,
  alertInterval: 1000, // meters (1km) or 1609 (1 mile)
  // Phase 3: Stats preferences
  showSplits: true,
  showElevation: false,
  autoLap: true
}, require('Storage').readJSON("runstr.json", true) || {});

// Phase 3-5: Enhanced run data with comprehensive tracking
let runData = {
  startTime: null,
  distance: 0,
  duration: 0,
  steps: 0,
  gpsCoords: [],
  // Goal tracking
  goalType: settings.goalType,
  goalValue: settings.goalValue,
  goalCompleted: false,
  lastAlertDistance: 0,
  // Phase 3: Enhanced stats
  splits: [], // Array of {distance, time, pace}
  maxSpeed: 0,
  minElevation: null,
  maxElevation: null,
  totalAscent: 0,
  totalDescent: 0,
  // Phase 5: Alert tracking
  nextAlertDistance: settings.alertInterval
};

// App state management with new screens
let appState = {
  screen: "main", // "main", "running", "summary", "history", "goals", "stats"
  historyIndex: 0,
  goalSetupStep: 0 // For goal setup wizard
};

// Phase 4: Goal management functions
function showGoalSetup() {
  appState.screen = "goals";
  appState.goalSetupStep = 0;
  screenNeedsRedraw = true;
  drawGoalSetup();
}

function drawGoalSetup() {
  g.clear();
  g.setColor(1,1,1);
  g.setFont("6x8",2);
  g.setFontAlign(0,-1);
  g.drawString("SET GOAL", g.getWidth()/2, 5);
  
  if (appState.goalSetupStep === 0) {
    // Goal type selection
    g.setFont("6x8",1);
    g.setFontAlign(0,0);
    g.drawString("Choose goal type:", g.getWidth()/2, 30);
    
    // Distance goal button
    g.setColor(settings.goalType === "distance" ? 0x07E0 : 0x7BEF);
    g.fillRect(10, 45, 166, 65);
    g.setColor(0,0,0);
    g.drawString("Distance Goal", g.getWidth()/2, 55);
    
    // Time goal button
    g.setColor(settings.goalType === "time" ? 0x07E0 : 0x7BEF);
    g.fillRect(10, 70, 166, 90);
    g.setColor(0,0,0);
    g.drawString("Time Goal", g.getWidth()/2, 80);
    
    // Steps goal button
    g.setColor(settings.goalType === "steps" ? 0x07E0 : 0x7BEF);
    g.fillRect(10, 95, 166, 115);
    g.setColor(0,0,0);
    g.drawString("Steps Goal", g.getWidth()/2, 105);
    
    // No goal button
    g.setColor(settings.goalType === "none" ? 0x07E0 : 0x7BEF);
    g.fillRect(10, 120, 166, 140);
    g.setColor(0,0,0);
    g.drawString("No Goal", g.getWidth()/2, 130);
    
  } else if (appState.goalSetupStep === 1) {
    // Goal value setting
    g.setFont("6x8",1);
    g.setFontAlign(0,0);
    g.drawString("Set " + settings.goalType + " goal:", g.getWidth()/2, 30);
    
    let currentValue = settings.goalValue;
    let displayValue = "";
    
    if (settings.goalType === "distance") {
      displayValue = formatDistance(currentValue);
    } else if (settings.goalType === "time") {
      displayValue = formatTime(currentValue);
    } else if (settings.goalType === "steps") {
      displayValue = currentValue + " steps";
    }
    
    g.setFont("6x8",2);
    g.drawString(displayValue, g.getWidth()/2, 60);
    
    // Adjustment buttons
    g.setColor(0x001F);
    g.fillRect(10, 80, 50, 110);
    g.setColor(1,1,1);
    g.setFont("6x8",2);
    g.drawString("--", 30, 95);
    
    g.setColor(0x001F);
    g.fillRect(126, 80, 166, 110);
    g.setColor(1,1,1);
    g.drawString("++", 146, 95);
    
    g.setColor(0x001F);
    g.fillRect(60, 80, 116, 110);
    g.setColor(1,1,1);
    g.setFont("6x8",1);
    g.drawString("-/+", 88, 95);
  }
  
  // Navigation buttons
  g.setColor(0xF800);
  g.fillRect(10, 145, 70, 170);
  g.setColor(1,1,1);
  g.setFont("6x8",2);
  g.drawString("BACK", 40, 157);
  
  if (appState.goalSetupStep === 1 || settings.goalType === "none") {
    g.setColor(0x07E0);
    g.fillRect(106, 145, 166, 170);
    g.setColor(0,0,0);
    g.drawString("SAVE", 136, 157);
  } else {
    g.setColor(0x07FF);
    g.fillRect(106, 145, 166, 170);
    g.setColor(0,0,0);
    g.drawString("NEXT", 136, 157);
  }
  
  screenNeedsRedraw = false;
}

// Phase 3: Enhanced statistics display
function showDetailedStats() {
  appState.screen = "stats";
  g.clear();
  g.setColor(1,1,1);
  g.setFont("6x8",2);
  g.setFontAlign(0,-1);
  g.drawString("RUN STATS", g.getWidth()/2, 5);
  
  if (!runData.startTime) {
    g.setFont("6x8",1);
    g.setFontAlign(0,0);
    g.drawString("No active run", g.getWidth()/2, 60);
    g.drawString("Start a run first", g.getWidth()/2, 80);
  } else {
    g.setFont("6x8",1);
    g.setFontAlign(-1,0);
    
    // Current pace
    if (runData.duration > 10000 && runData.distance > 50) {
      let currentPace = runData.distance / (runData.duration / 1000);
      g.drawString("Current Pace:", 5, 25);
      g.setFontAlign(1,0);
      g.drawString(formatPace(currentPace), 170, 25);
    }
    
    // Max speed
    g.setFontAlign(-1,0);
    g.drawString("Max Speed:", 5, 40);
    g.setFontAlign(1,0);
    g.drawString((runData.maxSpeed * 3.6).toFixed(1) + " km/h", 170, 40);
    
    // Elevation data
    if (runData.minElevation !== null && runData.maxElevation !== null) {
      g.setFontAlign(-1,0);
      g.drawString("Elevation:", 5, 55);
      g.setFontAlign(1,0);
      g.drawString(runData.minElevation.toFixed(0) + "-" + runData.maxElevation.toFixed(0) + "m", 170, 55);
      
      g.setFontAlign(-1,0);
      g.drawString("Ascent:", 5, 70);
      g.setFontAlign(1,0);
      g.drawString(runData.totalAscent.toFixed(0) + "m", 170, 70);
    }
    
    // Goal progress
    if (runData.goalType !== "none") {
      g.setFontAlign(-1,0);
      g.drawString("Goal Progress:", 5, 85);
      g.setFontAlign(1,0);
      
      let progress = 0;
      if (runData.goalType === "distance") {
        progress = (runData.distance / runData.goalValue) * 100;
      } else if (runData.goalType === "time") {
        progress = (runData.duration / runData.goalValue) * 100;
      } else if (runData.goalType === "steps") {
        progress = (runData.steps / runData.goalValue) * 100;
      }
      
      g.drawString(progress.toFixed(0) + "%", 170, 85);
      
      // Progress bar
      g.setColor(0x7BEF);
      g.fillRect(5, 95, 170, 105);
      g.setColor(progress >= 100 ? 0x07E0 : 0x07FF);
      g.fillRect(5, 95, 5 + (Math.min(progress, 100) * 165 / 100), 105);
      g.setColor(1,1,1);
    }
    
    // Splits (if any)
    if (runData.splits.length > 0) {
      g.setFont("6x8",1);
      g.setFontAlign(0,0);
      g.drawString("Last Split:", g.getWidth()/2, 115);
      let lastSplit = runData.splits[runData.splits.length - 1];
      g.drawString(formatPace(lastSplit.pace), g.getWidth()/2, 130);
    }
  }
  
  // Back button
  g.setColor(0x001F);
  g.fillRect(50, 145, 126, 170);
  g.setColor(1,1,1);
  g.setFont("6x8",2);
  g.setFontAlign(0,0);
  g.drawString("BACK", g.getWidth()/2, 157);
  
  screenNeedsRedraw = false;
}

// Phase 5: Distance alert system
function checkDistanceAlerts() {
  if (!settings.distanceAlerts || !running) return;
  
  if (runData.distance >= runData.nextAlertDistance) {
    // Trigger alert
    let alertDistance = runData.nextAlertDistance;
    let unit = settings.units === "mi" ? "mile" : "kilometer";
    
    // Vibration pattern for milestone
    Bangle.buzz(200);
    setTimeout(() => Bangle.buzz(200), 300);
    setTimeout(() => Bangle.buzz(200), 600);
    
    // Show alert message
    showMessage(formatDistance(alertDistance) + " completed!", 3000);
    
    // Update next alert distance
    runData.nextAlertDistance += settings.alertInterval;
    
    // Add split if auto-lap is enabled
    if (settings.autoLap) {
      addSplit();
    }
    
    print("RUNSTR: Distance alert at " + alertDistance + "m");
  }
}

// Phase 3: Split tracking
function addSplit() {
  if (runData.splits.length === 0) {
    // First split
    let pace = runData.distance / (runData.duration / 1000);
    runData.splits.push({
      distance: runData.distance,
      time: runData.duration,
      pace: pace
    });
  } else {
    // Subsequent splits
    let lastSplit = runData.splits[runData.splits.length - 1];
    let splitDistance = runData.distance - lastSplit.distance;
    let splitTime = runData.duration - lastSplit.time;
    let splitPace = splitDistance / (splitTime / 1000);
    
    runData.splits.push({
      distance: runData.distance,
      time: runData.duration,
      pace: splitPace
    });
  }
}

// Phase 4: Goal checking
function checkGoalCompletion() {
  if (runData.goalType === "none" || runData.goalCompleted) return;
  
  let goalMet = false;
  
  if (runData.goalType === "distance" && runData.distance >= runData.goalValue) {
    goalMet = true;
  } else if (runData.goalType === "time" && runData.duration >= runData.goalValue) {
    goalMet = true;
  } else if (runData.goalType === "steps" && runData.steps >= runData.goalValue) {
    goalMet = true;
  }
  
  if (goalMet) {
    runData.goalCompleted = true;
    
    // Goal completion celebration
    Bangle.buzz(300);
    setTimeout(() => Bangle.buzz(300), 400);
    setTimeout(() => Bangle.buzz(300), 800);
    setTimeout(() => Bangle.buzz(300), 1200);
    
    showMessage("GOAL COMPLETED!", 4000);
    print("RUNSTR: Goal completed!");
  }
}

// Phase 1: Function to get stored runs
function getStoredRuns() {
  let runFiles = require("Storage").list(/^runstr\.run\..*\.json$/);
  let runs = [];
  
  for (let i = 0; i < runFiles.length; i++) {
    try {
      let data = require("Storage").readJSON(runFiles[i]);
      if (data && data.startTime) {
        runs.push({
          file: runFiles[i],
          date: new Date(data.startTime),
          distance: data.distance || 0,
          duration: data.duration || 0,
          steps: data.steps || 0,
          synced: data.synced || false,
          // Phase 3: Enhanced stats
          goalCompleted: data.goalCompleted || false,
          splits: data.splits || []
        });
      }
    } catch (e) {
      print("Error reading run file: " + runFiles[i]);
    }
  }
  
  // Sort by date, most recent first
  runs.sort((a, b) => b.date.getTime() - a.date.getTime());
  return runs.slice(0, 10); // Keep last 10 runs
}

// Phase 2: History screen
function showHistory() {
  appState.screen = "history";
  g.clear();
  g.setColor(1,1,1);
  g.setFont("6x8",2);
  g.setFontAlign(0,-1);
  g.drawString("RUN HISTORY", g.getWidth()/2, 5);
  
  let runs = getStoredRuns();
  
  if (runs.length === 0) {
    g.setFont("6x8",1);
    g.setFontAlign(0,0);
    g.drawString("No runs yet", g.getWidth()/2, 60);
    g.drawString("Start your first run!", g.getWidth()/2, 80);
  } else {
    g.setFont("6x8",1);
    g.setFontAlign(-1,0);
    
    // Show up to 4 runs
    for (let i = 0; i < Math.min(runs.length, 4); i++) {
      let y = 25 + (i * 25);
      let run = runs[i];
      
      // Date (left side)
      let dateStr = run.date.getDate() + "/" + (run.date.getMonth()+1);
      g.drawString(dateStr, 5, y);
      
      // Distance and time (right side)
      g.setFontAlign(1,0);
      g.drawString(formatDistance(run.distance), 85, y);
      g.drawString(formatTime(run.duration), 170, y);
      
      // Steps (small, below)
      g.setFontAlign(-1,0);
      g.drawString(run.steps + " steps", 5, y + 10);
      
      // Sync status
      g.setFontAlign(1,0);
      g.setColor(run.synced ? 0x07E0 : 0xF800);
      g.drawString(run.synced ? "✓" : "○", 170, y + 10);
      g.setColor(1,1,1);
    }
    
    // Show total count if more runs exist
    if (runs.length > 4) {
      g.setFont("6x8",1);
      g.setFontAlign(0,0);
      g.drawString("+" + (runs.length - 4) + " more runs", g.getWidth()/2, 130);
    }
  }
  
  // Back button
  g.setColor(0x001F);
  g.fillRect(50, 145, 126, 170);
  g.setColor(1,1,1);
  g.setFont("6x8",2);
  g.setFontAlign(0,0);
  g.drawString("BACK", g.getWidth()/2, 157);
  
  screenNeedsRedraw = false;
}

// Function to validate GPS coordinates
function isValidGPS(lat, lon) {
  return (typeof lat === 'number' && typeof lon === 'number' && 
          lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 &&
          lat !== 0 && lon !== 0);
}

// Function to prepare run data for syncing
function prepareRunDataForSync() {
  if (!runData || !runData.startTime) {
    print("RUNSTR: No run data to sync.");
    return null;
  }
  const payload = {
    startTime: runData.startTime,
    duration: runData.duration,
    distance: Math.round(runData.distance),
    steps: runData.steps,
    gpsCoordinates: runData.gpsCoords.map(coord => ({
      lat: coord.lat,
      lon: coord.lon,
      alt: coord.alt || 0,
      speed: coord.speed || 0,
      time: coord.time
    })),
    device: "Bangle.js RUNSTR App",
    // Phase 1: Include goal information
    goalType: runData.goalType,
    goalValue: runData.goalValue,
    goalCompleted: runData.goalCompleted
  };
  return JSON.stringify(payload);
}

// Function to update the BLE characteristic value
function updateBLECharacteristic(jsonData) {
  if (jsonData) {
    try {
      NRF.updateServices({
        [RUNSTR_SERVICE_UUID]: {
          [RUNSTR_DATA_CHAR_UUID]: {
            value: jsonData,
            notify: true
          }
        }
      });
      print("RUNSTR: BLE characteristic updated and notified.");
      Bangle.buzz(100,1);
    } catch (e) {
      print("RUNSTR: Error updating BLE characteristic:", e);
    }
  }
}

// Setup BLE Services
function setupBLE() {
  NRF.setServices({
    [RUNSTR_SERVICE_UUID]: {
      [RUNSTR_DATA_CHAR_UUID]: {
        value: "{\"status\":\"no_run_data\"}",
        readable: true,
        notify: true,
        writable: true,
        onWrite: function(evt) {
          print("RUNSTR: Write received from central, preparing data.");
          const runJson = prepareRunDataForSync();
          if (runJson) {
            updateBLECharacteristic(runJson);
            showMessage("SENDING DATA...", 2000);
          }
        },
        description: "RUNSTR Run Data"
      }
    }
  }, {
    advertise: [RUNSTR_SERVICE_UUID],
    uart: false
  });

  NRF.on('connect', function(addr) {
    print("RUNSTR: Connected to " + addr);
    showMessage("Phone Connected", 1500);
  });

  NRF.on('disconnect', function(reason) {
    print("RUNSTR: Disconnected, reason: " + reason);
    showMessage("Phone Disconnected", 1500);
  });
  print("RUNSTR: BLE Sync Service Configured.");
}

// Helper function to show temporary messages
function showMessage(text, duration) {
  g.setFont("6x8",1);
  g.setColor(1,1,1);
  g.setFontAlign(0,0);
  g.fillRect(0, 160, g.getWidth(), 176);
  g.setColor(0,0,0);
  g.fillRect(0, 160, g.getWidth(), 176);
  g.setColor(1,1,1);
  g.drawString(text, g.getWidth()/2, 168);
  setTimeout(() => {
    screenNeedsRedraw = true;
    if (appState.screen === "summary") showSummary();
    else if (appState.screen === "history") showHistory();
    else drawScreen();
  }, duration);
}

// Visual feedback for button presses
function flashButton(x1, y1, x2, y2, text) {
  g.setColor(1,1,1);
  g.fillRect(x1, y1, x2, y2);
  g.setColor(0,0,0);
  g.setFont("6x8",2);
  g.setFontAlign(0,0);
  g.drawString(text, (x1+x2)/2, (y1+y2)/2);
  Bangle.buzz(50);
}

function formatTime(ms) {
  let totalSeconds = Math.floor(ms / 1000);
  let hours = Math.floor(totalSeconds / 3600);
  let minutes = Math.floor((totalSeconds % 3600) / 60);
  let seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return hours + ":" + ("0"+minutes).substr(-2) + ":" + ("0"+seconds).substr(-2);
  } else {
    return minutes + ":" + ("0"+seconds).substr(-2);
  }
}

function formatDistance(meters) {
  if (settings.units === "mi") {
    let miles = meters * 0.000621371;
    return miles.toFixed(2) + " mi";
  } else {
    let km = meters / 1000;
    return km.toFixed(2) + " km";
  }
}

function formatPace(metersPerSecond) {
  if (metersPerSecond === 0) return "--:--";
  
  let minutesPerUnit;
  if (settings.units === "mi") {
    minutesPerUnit = 26.8224 / metersPerSecond;
  } else {
    minutesPerUnit = 16.6667 / metersPerSecond;
  }
  
  let minutes = Math.floor(minutesPerUnit);
  let seconds = Math.floor((minutesPerUnit - minutes) * 60);
  return minutes + ":" + ("0"+seconds).substr(-2) + "/" + (settings.units === "mi" ? "mi" : "km");
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function drawScreen() {
  if (!screenNeedsRedraw) return;
  
  appState.screen = running ? "running" : "main";
  
  g.clear();
  g.setColor(1,1,1);
  g.setFont("6x8",2);
  g.setFontAlign(0,-1);
  g.drawString("RUNSTR", g.getWidth()/2, 5);
  
  if (running) {
    runData.duration = Date.now() - runData.startTime;
    
    g.setFont("6x8",2);
    g.setFontAlign(0,0);
    g.drawString(formatTime(runData.duration), g.getWidth()/2, 25);
    g.drawString(formatDistance(runData.distance), g.getWidth()/2, 45);
    
    // Phase 3: Enhanced running display
    g.setFont("6x8",1);
    if (runData.duration > 10000 && runData.distance > 50) {
      let avgPace = runData.distance / (runData.duration / 1000);
      g.drawString("Pace: " + formatPace(avgPace), g.getWidth()/2, 65);
    }
    
    // Goal progress indicator
    if (runData.goalType !== "none") {
      let progress = 0;
      let goalText = "";
      
      if (runData.goalType === "distance") {
        progress = (runData.distance / runData.goalValue) * 100;
        goalText = "Goal: " + progress.toFixed(0) + "%";
      } else if (runData.goalType === "time") {
        progress = (runData.duration / runData.goalValue) * 100;
        goalText = "Goal: " + progress.toFixed(0) + "%";
      } else if (runData.goalType === "steps") {
        progress = (runData.steps / runData.goalValue) * 100;
        goalText = "Goal: " + progress.toFixed(0) + "%";
      }
      
      g.setColor(runData.goalCompleted ? 0x07E0 : (progress >= 80 ? 0xFFE0 : 1));
      g.drawString(goalText, g.getWidth()/2, 80);
      g.setColor(1,1,1);
    }
    
    g.drawString("Steps: " + runData.steps, g.getWidth()/2, 95);
    
    g.setColor(gpsFix.fix ? 0x07E0 : 0xF800);
    g.drawString("GPS:" + (gpsFix.fix ? "OK" : "WAIT") + " (" + runData.gpsCoords.length + ")", g.getWidth()/2, 110);
    g.setColor(1,1,1);
    
    // Stop button
    g.setColor(0xF800);
    g.fillRect(30, 125, 90, 155);
    g.setColor(1,1,1);
    g.setFont("6x8",2);
    g.drawString("STOP", 60, 140);
    
    // Stats button
    g.setColor(0x07FF);
    g.fillRect(100, 125, 146, 155);
    g.setColor(0,0,0);
    g.setFont("6x8",1);
    g.drawString("STATS", 123, 140);
    
  } else {
    g.setFont("6x8",1);
    g.setFontAlign(0,0);
    g.drawString("Track your runs", g.getWidth()/2, 30);
    g.drawString("with GPS", g.getWidth()/2, 45);
    
    // Current goal display
    if (settings.goalType !== "none") {
      g.setFont("6x8",1);
      let goalText = "Goal: ";
      if (settings.goalType === "distance") {
        goalText += formatDistance(settings.goalValue);
      } else if (settings.goalType === "time") {
        goalText += formatTime(settings.goalValue);
      } else if (settings.goalType === "steps") {
        goalText += settings.goalValue + " steps";
      }
      g.drawString(goalText, g.getWidth()/2, 60);
    }
    
    g.setColor(gpsFix.fix ? 0x07E0 : 0xF800);
    g.drawString(gpsFix.fix ? "GPS Ready" : "Getting GPS fix...", g.getWidth()/2, 75);
    g.setColor(1,1,1);
    
    let runs = getStoredRuns();
    if (runs.length > 0) {
      g.setFont("6x8",1);
      g.drawString("Tap title for " + runs.length + " runs", g.getWidth()/2, 90);
    }
    
    // Start button
    if (gpsFix.fix) {
      g.setColor(0x07E0);
      g.fillRect(30, 105, 90, 135);
      g.setColor(0,0,0);
      g.setFont("6x8",2);
      g.drawString("START", 60, 120);
    } else {
      g.setColor(0x7BEF);
      g.fillRect(30, 105, 90, 135);
      g.setColor(0,0,0);
      g.setFont("6x8",1);
      g.drawString("WAIT GPS", 60, 120);
    }
    
    // Goals button
    g.setColor(0xFFE0);
    g.fillRect(100, 105, 146, 135);
    g.setColor(0,0,0);
    g.setFont("6x8",1);
    g.drawString("GOALS", 123, 120);
  }
  
  screenNeedsRedraw = false;
}

function startRun() {
  running = true;
  appState.screen = "running";
  
  // Enhanced run data initialization
  runData = {
    startTime: Date.now(),
    distance: 0,
    duration: 0,
    steps: stepCount,
    gpsCoords: [],
    goalType: settings.goalType,
    goalValue: settings.goalValue,
    goalCompleted: false,
    lastAlertDistance: 0,
    // Phase 3: Enhanced stats
    splits: [],
    maxSpeed: 0,
    minElevation: null,
    maxElevation: null,
    totalAscent: 0,
    totalDescent: 0,
    // Phase 5: Alert tracking
    nextAlertDistance: settings.alertInterval
  };
  
  if(gpsFix.fix) {
    lastGPS = {lat: gpsFix.lat, lon: gpsFix.lon, time: Date.now(), alt: gpsFix.alt || 0};
    if (gpsFix.alt) {
      runData.minElevation = gpsFix.alt;
      runData.maxElevation = gpsFix.alt;
    }
  } else {
    lastGPS = null;
  }
  
  Bangle.buzz(200);
  screenNeedsRedraw = true;
  
  updateInterval = setInterval(() => {
    if (running) {
      checkGoalCompletion();
      checkDistanceAlerts();
      screenNeedsRedraw = true;
      drawScreen();
    }
  }, 2000);
  
  drawScreen();
}

function stopRun() {
  running = false;
  appState.screen = "summary";
  
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
  
  Bangle.buzz(100, 0.5);
  setTimeout(() => Bangle.buzz(100, 0.5), 200);
  
  // Phase 1: Enhanced run data saving
  let filename = "runstr.run." + Date.now() + ".json";
  let saveData = Object.assign({}, runData, {
    synced: false,
    version: "1.1" // Track app version
  });
  
  require("Storage").writeJSON(filename, saveData);
  print("RUNSTR: Run saved as " + filename);
  
  screenNeedsRedraw = true;
  showSummary();
}

function showSummary() {
  appState.screen = "summary";
  g.clear();
  g.setColor(1,1,1);
  g.setFont("6x8",2);
  g.setFontAlign(0,-1);
  g.drawString("RUN COMPLETE", g.getWidth()/2, 5);
  
  g.setFont("6x8",1);
  g.setFontAlign(0,0);
  
  g.drawString("Time: " + formatTime(runData.duration), g.getWidth()/2, 30);
  g.drawString("Distance: " + formatDistance(runData.distance), g.getWidth()/2, 50);
  
  if (runData.duration > 0 && runData.distance > 0) {
    let avgPace = runData.distance / (runData.duration / 1000);
    g.drawString("Avg Pace: " + formatPace(avgPace), g.getWidth()/2, 70);
  }
  
  g.drawString("Steps: " + runData.steps, g.getWidth()/2, 90);
  
  // Phase 1: Show goal completion status
  if (runData.goalType !== "none") {
    g.setColor(runData.goalCompleted ? 0x07E0 : 0xF800);
    g.drawString("Goal: " + (runData.goalCompleted ? "COMPLETED!" : "Not reached"), g.getWidth()/2, 105);
    g.setColor(1,1,1);
  }
  
  // SYNC button
  g.setColor(0x07FF);
  g.fillRect(20, 120, 80, 150);
  g.setColor(0,0,0);
  g.setFont("6x8",2);
  g.drawString("SYNC", 50, 135);
  
  // OK button
  g.setColor(0x001F);
  g.fillRect(96, 120, 156, 150);
  g.setColor(1,1,1);
  g.setFont("6x8",2);
  g.drawString("OK", 126, 135);
}

// Enhanced touch handler with new screens
Bangle.on('touch', function(btn, xy) {
  let now = Date.now();
  if (now - lastTouchTime < 300) return;
  lastTouchTime = now;
  
  if (appState.screen === "running") {
    // Stop button
    if (xy.y >= 125 && xy.y <= 155 && xy.x >= 30 && xy.x <= 90) {
      flashButton(30, 125, 90, 155, "STOPPING");
      setTimeout(() => stopRun(), 150);
    }
    // Stats button
    else if (xy.y >= 125 && xy.y <= 155 && xy.x >= 100 && xy.x <= 146) {
      flashButton(100, 125, 146, 155, "STATS");
      setTimeout(() => showDetailedStats(), 150);
    }
  } else if (appState.screen === "goals") {
    // Goal setup screen handling
    if (appState.goalSetupStep === 0) {
      // Goal type selection
      if (xy.y >= 45 && xy.y <= 65) {
        settings.goalType = "distance";
        settings.goalValue = settings.units === "mi" ? 1609 : 1000; // 1 mile or 1 km
        appState.goalSetupStep = 1;
        screenNeedsRedraw = true;
        drawGoalSetup();
      } else if (xy.y >= 70 && xy.y <= 90) {
        settings.goalType = "time";
        settings.goalValue = 1800000; // 30 minutes
        appState.goalSetupStep = 1;
        screenNeedsRedraw = true;
        drawGoalSetup();
      } else if (xy.y >= 95 && xy.y <= 115) {
        settings.goalType = "steps";
        settings.goalValue = 5000;
        appState.goalSetupStep = 1;
        screenNeedsRedraw = true;
        drawGoalSetup();
      } else if (xy.y >= 120 && xy.y <= 140) {
        settings.goalType = "none";
        settings.goalValue = 0;
        // Skip to save
      }
    } else if (appState.goalSetupStep === 1) {
      // Goal value adjustment
      if (xy.x >= 10 && xy.x <= 50 && xy.y >= 80 && xy.y <= 110) {
        // Decrease value
        if (settings.goalType === "distance") {
          settings.goalValue = Math.max(100, settings.goalValue - (settings.units === "mi" ? 161 : 100));
        } else if (settings.goalType === "time") {
          settings.goalValue = Math.max(60000, settings.goalValue - 300000); // 5 min steps
        } else if (settings.goalType === "steps") {
          settings.goalValue = Math.max(100, settings.goalValue - 500);
        }
        screenNeedsRedraw = true;
        drawGoalSetup();
      } else if (xy.x >= 126 && xy.x <= 166 && xy.y >= 80 && xy.y <= 110) {
        // Increase value
        if (settings.goalType === "distance") {
          settings.goalValue += (settings.units === "mi" ? 161 : 100);
        } else if (settings.goalType === "time") {
          settings.goalValue += 300000; // 5 min steps
        } else if (settings.goalType === "steps") {
          settings.goalValue += 500;
        }
        screenNeedsRedraw = true;
        drawGoalSetup();
      } else if (xy.x >= 60 && xy.x <= 116 && xy.y >= 80 && xy.y <= 110) {
        // Fine adjustment
        if (settings.goalType === "distance") {
          settings.goalValue += (settings.goalValue % (settings.units === "mi" ? 161 : 100) === 0) ? 
                                (settings.units === "mi" ? 16 : 10) : -(settings.goalValue % (settings.units === "mi" ? 161 : 100));
        } else if (settings.goalType === "time") {
          settings.goalValue += (settings.goalValue % 300000 === 0) ? 60000 : -(settings.goalValue % 300000);
        } else if (settings.goalType === "steps") {
          settings.goalValue += (settings.goalValue % 500 === 0) ? 100 : -(settings.goalValue % 500);
        }
        screenNeedsRedraw = true;
        drawGoalSetup();
      }
    }
    
    // Navigation buttons
    if (xy.y >= 145 && xy.y <= 170) {
      if (xy.x >= 10 && xy.x <= 70) {
        // Back button
        if (appState.goalSetupStep === 0) {
          appState.screen = "main";
          screenNeedsRedraw = true;
          drawScreen();
        } else {
          appState.goalSetupStep = 0;
          screenNeedsRedraw = true;
          drawGoalSetup();
        }
      } else if (xy.x >= 106 && xy.x <= 166) {
        // Next/Save button
        if (appState.goalSetupStep === 0 && settings.goalType !== "none") {
          appState.goalSetupStep = 1;
          screenNeedsRedraw = true;
          drawGoalSetup();
        } else {
          // Save settings
          require("Storage").writeJSON("runstr.json", settings);
          showMessage("Goal saved!", 2000);
          setTimeout(() => {
            appState.screen = "main";
            screenNeedsRedraw = true;
            drawScreen();
          }, 2000);
        }
      }
    }
  } else if (appState.screen === "stats") {
    // Back button
    if (xy.y >= 145 && xy.y <= 170 && xy.x >= 50 && xy.x <= 126) {
      flashButton(50, 145, 126, 170, "BACK");
      setTimeout(() => {
        appState.screen = running ? "running" : "main";
        screenNeedsRedraw = true;
        drawScreen();
      }, 150);
    }
  } else if (appState.screen === "main") {
    // Start button
    if (xy.y >= 105 && xy.y <= 135 && xy.x >= 30 && xy.x <= 90) {
      if (gpsFix.fix && isValidGPS(gpsFix.lat, gpsFix.lon)) {
        flashButton(30, 105, 90, 135, "STARTING");
        setTimeout(() => startRun(), 150);
      } else {
        flashButton(30, 105, 90, 135, "NO GPS");
        setTimeout(() => showMessage("GPS not ready! Go outside", 3000), 150);
      }
    }
    // Goals button
    else if (xy.y >= 105 && xy.y <= 135 && xy.x >= 100 && xy.x <= 146) {
      flashButton(100, 105, 146, 135, "GOALS");
      setTimeout(() => showGoalSetup(), 150);
    }
    // Tap title for history
    else if (xy.y >= 5 && xy.y <= 25) {
      let runs = getStoredRuns();
      if (runs.length > 0) {
        screenNeedsRedraw = true;
        showHistory();
      }
    }
  }
  // ... existing touch handlers for other screens ...
});

// Enhanced GPS handler with elevation tracking
Bangle.on('GPS', function(gps) {
  let oldFix = gpsFix.fix;
  gpsFix = gps;
  
  print("GPS: fix=" + gps.fix + " lat=" + gps.lat + " lon=" + gps.lon + " alt=" + gps.alt);

  if (!running && gpsFix.fix !== oldFix) {
    screenNeedsRedraw = true;
    drawScreen();
    return;
  }
  
  if (!running) return;
  
  if (!gps.fix || !isValidGPS(gps.lat, gps.lon)) {
    print("Invalid GPS data");
    return;
  }
  
  let currentTime = Date.now();
  
  // Phase 3: Track elevation changes
  if (gps.alt) {
    if (runData.minElevation === null || gps.alt < runData.minElevation) {
      runData.minElevation = gps.alt;
    }
    if (runData.maxElevation === null || gps.alt > runData.maxElevation) {
      runData.maxElevation = gps.alt;
    }
    
    if (lastGPS && lastGPS.alt) {
      let elevationChange = gps.alt - lastGPS.alt;
      if (elevationChange > 1) {
        runData.totalAscent += elevationChange;
      } else if (elevationChange < -1) {
        runData.totalDescent += Math.abs(elevationChange);
      }
    }
  }
  
  // Track max speed
  if (gps.speed && gps.speed > runData.maxSpeed) {
    runData.maxSpeed = gps.speed;
  }
  
  if (lastGPS && lastGPS.lat && lastGPS.lon) {
    let dist = calculateDistance(lastGPS.lat, lastGPS.lon, gps.lat, gps.lon);
    print("Distance: " + dist + "m");
    
    if (dist > 1) {
      runData.distance += dist;
      print("Total distance: " + runData.distance + "m");
      
      runData.gpsCoords.push({
        lat: gps.lat,
        lon: gps.lon,
        time: currentTime,
        alt: gps.alt,
        speed: gps.speed
      });
      
      lastGPS = {lat: gps.lat, lon: gps.lon, time: currentTime, alt: gps.alt || 0};
      screenNeedsRedraw = true;
    }
  } else {
    print("First GPS point");
    lastGPS = {lat: gps.lat, lon: gps.lon, time: currentTime, alt: gps.alt || 0};
    runData.gpsCoords.push({
      lat: gps.lat,
      lon: gps.lon,
      time: currentTime,
      alt: gps.alt,
      speed: gps.speed
    });
    screenNeedsRedraw = true;
  }
});

let initialSteps = 0;
Bangle.on('step', function() {
  let currentSteps = Bangle.getHealthStatus("day").steps;
  
  if (running) {
    if (initialSteps === 0) {
      initialSteps = currentSteps;
      runData.steps = 0;
    } else {
      runData.steps = currentSteps - initialSteps;
    }
    screenNeedsRedraw = true;
  } else {
    initialSteps = 0;
  }
  
  stepCount = currentSteps;
});

// Complete the missing functions and handlers

// Function to validate GPS coordinates
function isValidGPS(lat, lon) {
  return (typeof lat === 'number' && typeof lon === 'number' && 
          lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 &&
          lat !== 0 && lon !== 0);
}

// Function to prepare run data for syncing
function prepareRunDataForSync() {
  if (!runData || !runData.startTime) {
    print("RUNSTR: No run data to sync.");
    return null;
  }
  const payload = {
    startTime: runData.startTime,
    duration: runData.duration,
    distance: Math.round(runData.distance),
    steps: runData.steps,
    gpsCoordinates: runData.gpsCoords.map(coord => ({
      lat: coord.lat,
      lon: coord.lon,
      alt: coord.alt || 0,
      speed: coord.speed || 0,
      time: coord.time
    })),
    device: "Bangle.js RUNSTR App",
    // Enhanced sync data
    goalType: runData.goalType,
    goalValue: runData.goalValue,
    goalCompleted: runData.goalCompleted,
    splits: runData.splits,
    maxSpeed: runData.maxSpeed,
    elevationGain: runData.totalAscent
  };
  return JSON.stringify(payload);
}

// Function to update the BLE characteristic value
function updateBLECharacteristic(jsonData) {
  if (jsonData) {
    try {
      NRF.updateServices({
        [RUNSTR_SERVICE_UUID]: {
          [RUNSTR_DATA_CHAR_UUID]: {
            value: jsonData,
            notify: true
          }
        }
      });
      print("RUNSTR: BLE characteristic updated and notified.");
      Bangle.buzz(100,1);
    } catch (e) {
      print("RUNSTR: Error updating BLE characteristic:", e);
    }
  }
}

// Setup BLE Services
function setupBLE() {
  NRF.setServices({
    [RUNSTR_SERVICE_UUID]: {
      [RUNSTR_DATA_CHAR_UUID]: {
        value: "{\"status\":\"no_run_data\"}",
        readable: true,
        notify: true,
        writable: true,
        onWrite: function(evt) {
          print("RUNSTR: Write received from central, preparing data.");
          const runJson = prepareRunDataForSync();
          if (runJson) {
            updateBLECharacteristic(runJson);
            showMessage("SENDING DATA...", 2000);
          }
        },
        description: "RUNSTR Run Data"
      }
    }
  }, {
    advertise: [RUNSTR_SERVICE_UUID],
    uart: false
  });

  NRF.on('connect', function(addr) {
    print("RUNSTR: Connected to " + addr);
    showMessage("Phone Connected", 1500);
  });

  NRF.on('disconnect', function(reason) {
    print("RUNSTR: Disconnected, reason: " + reason);
    showMessage("Phone Disconnected", 1500);
  });
  print("RUNSTR: BLE Sync Service Configured.");
}

// Helper function to show temporary messages
function showMessage(text, duration) {
  g.setFont("6x8",1);
  g.setColor(1,1,1);
  g.setFontAlign(0,0);
  g.fillRect(0, 160, g.getWidth(), 176);
  g.setColor(0,0,0);
  g.fillRect(0, 160, g.getWidth(), 176);
  g.setColor(1,1,1);
  g.drawString(text, g.getWidth()/2, 168);
  setTimeout(() => {
    screenNeedsRedraw = true;
    if (appState.screen === "summary") showSummary();
    else if (appState.screen === "history") showHistory();
    else if (appState.screen === "goals") drawGoalSetup();
    else if (appState.screen === "stats") showDetailedStats();
    else drawScreen();
  }, duration);
}

// Visual feedback for button presses
function flashButton(x1, y1, x2, y2, text) {
  g.setColor(1,1,1);
  g.fillRect(x1, y1, x2, y2);
  g.setColor(0,0,0);
  g.setFont("6x8",2);
  g.setFontAlign(0,0);
  g.drawString(text, (x1+x2)/2, (y1+y2)/2);
  Bangle.buzz(50);
}

function formatTime(ms) {
  let totalSeconds = Math.floor(ms / 1000);
  let hours = Math.floor(totalSeconds / 3600);
  let minutes = Math.floor((totalSeconds % 3600) / 60);
  let seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return hours + ":" + ("0"+minutes).substr(-2) + ":" + ("0"+seconds).substr(-2);
  } else {
    return minutes + ":" + ("0"+seconds).substr(-2);
  }
}

function formatDistance(meters) {
  if (settings.units === "mi") {
    let miles = meters * 0.000621371;
    return miles.toFixed(2) + " mi";
  } else {
    let km = meters / 1000;
    return km.toFixed(2) + " km";
  }
}

function formatPace(metersPerSecond) {
  if (metersPerSecond === 0) return "--:--";
  
  let minutesPerUnit;
  if (settings.units === "mi") {
    minutesPerUnit = 26.8224 / metersPerSecond;
  } else {
    minutesPerUnit = 16.6667 / metersPerSecond;
  }
  
  let minutes = Math.floor(minutesPerUnit);
  let seconds = Math.floor((minutesPerUnit - minutes) * 60);
  return minutes + ":" + ("0"+seconds).substr(-2) + "/" + (settings.units === "mi" ? "mi" : "km");
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function showHistory() {
  appState.screen = "history";
  g.clear();
  g.setColor(1,1,1);
  g.setFont("6x8",2);
  g.setFontAlign(0,-1);
  g.drawString("RUN HISTORY", g.getWidth()/2, 5);
  
  let runs = getStoredRuns();
  
  if (runs.length === 0) {
    g.setFont("6x8",1);
    g.setFontAlign(0,0);
    g.drawString("No runs yet", g.getWidth()/2, 60);
    g.drawString("Start your first run!", g.getWidth()/2, 80);
  } else {
    g.setFont("6x8",1);
    g.setFontAlign(-1,0);
    
    for (let i = 0; i < Math.min(runs.length, 4); i++) {
      let y = 25 + (i * 25);
      let run = runs[i];
      
      let dateStr = run.date.getDate() + "/" + (run.date.getMonth()+1);
      g.drawString(dateStr, 5, y);
      
      g.setFontAlign(1,0);
      g.drawString(formatDistance(run.distance), 85, y);
      g.drawString(formatTime(run.duration), 170, y);
      
      g.setFontAlign(-1,0);
      g.drawString(run.steps + " steps", 5, y + 10);
      
      // Enhanced history display
      if (run.goalCompleted) {
        g.setColor(0x07E0);
        g.drawString("★", 90, y + 10);
        g.setColor(1,1,1);
      }
      
      g.setFontAlign(1,0);
      g.setColor(run.synced ? 0x07E0 : 0xF800);
      g.drawString(run.synced ? "✓" : "○", 170, y + 10);
      g.setColor(1,1,1);
    }
    
    if (runs.length > 4) {
      g.setFont("6x8",1);
      g.setFontAlign(0,0);
      g.drawString("+" + (runs.length - 4) + " more runs", g.getWidth()/2, 130);
    }
  }
  
  g.setColor(0x001F);
  g.fillRect(50, 145, 126, 170);
  g.setColor(1,1,1);
  g.setFont("6x8",2);
  g.setFontAlign(0,0);
  g.drawString("BACK", g.getWidth()/2, 157);
  
  screenNeedsRedraw = false;
}

// Enhanced stopRun with version update
function stopRun() {
  running = false;
  appState.screen = "summary";
  
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
  
  Bangle.buzz(100, 0.5);
  setTimeout(() => Bangle.buzz(100, 0.5), 200);
  
  // Enhanced run data saving
  let filename = "runstr.run." + Date.now() + ".json";
  let saveData = Object.assign({}, runData, {
    synced: false,
    version: "2.0" // Updated version for phases 3-5
  });
  
  require("Storage").writeJSON(filename, saveData);
  print("RUNSTR: Run saved as " + filename);
  
  screenNeedsRedraw = true;
  showSummary();
}

// Enhanced showSummary with new stats
function showSummary() {
  appState.screen = "summary";
  g.clear();
  g.setColor(1,1,1);
  g.setFont("6x8",2);
  g.setFontAlign(0,-1);
  g.drawString("RUN COMPLETE", g.getWidth()/2, 5);
  
  g.setFont("6x8",1);
  g.setFontAlign(0,0);
  
  g.drawString("Time: " + formatTime(runData.duration), g.getWidth()/2, 25);
  g.drawString("Distance: " + formatDistance(runData.distance), g.getWidth()/2, 40);
  
  if (runData.duration > 0 && runData.distance > 0) {
    let avgPace = runData.distance / (runData.duration / 1000);
    g.drawString("Avg Pace: " + formatPace(avgPace), g.getWidth()/2, 55);
  }
  
  g.drawString("Steps: " + runData.steps, g.getWidth()/2, 70);
  
  // Enhanced summary with goal status
  if (runData.goalType !== "none") {
    g.setColor(runData.goalCompleted ? 0x07E0 : 0xF800);
    g.drawString("Goal: " + (runData.goalCompleted ? "COMPLETED! ★" : "Not reached"), g.getWidth()/2, 85);
    g.setColor(1,1,1);
  }
  
  // Show elevation gain if available
  if (runData.totalAscent > 5) {
    g.drawString("Ascent: " + runData.totalAscent.toFixed(0) + "m", g.getWidth()/2, 100);
  }
  
  // SYNC button
  g.setColor(0x07FF);
  g.fillRect(20, 120, 80, 150);
  g.setColor(0,0,0);
  g.setFont("6x8",2);
  g.drawString("SYNC", 50, 135);
  
  // OK button
  g.setColor(0x001F);
  g.fillRect(96, 120, 156, 150);
  g.setColor(1,1,1);
  g.setFont("6x8",2);
  g.drawString("OK", 126, 135);
}

// Complete touch handler for summary and history screens
Bangle.on('touch', function(btn, xy) {
  let now = Date.now();
  if (now - lastTouchTime < 300) return;
  lastTouchTime = now;
  
  if (appState.screen === "summary") {
    if (xy.x >= 20 && xy.x <= 80 && xy.y >= 120 && xy.y <= 150) {
      flashButton(20, 120, 80, 150, "SYNC");
      setTimeout(() => {
        showMessage("Use phone app to sync", 3000);
      }, 150);
    }
    else if (xy.x >= 96 && xy.x <= 156 && xy.y >= 120 && xy.y <= 150) {
      flashButton(96, 120, 156, 150, "OK");
      setTimeout(() => {
        runData = {
          startTime: null, distance: 0, duration: 0, steps: 0, gpsCoords: [],
          goalType: settings.goalType, goalValue: settings.goalValue,
          goalCompleted: false, lastAlertDistance: 0, splits: [],
          maxSpeed: 0, minElevation: null, maxElevation: null,
          totalAscent: 0, totalDescent: 0, nextAlertDistance: settings.alertInterval
        };
        lastGPS = null;
        appState.screen = "main";
        screenNeedsRedraw = true;
        drawScreen();
      }, 150);
    }
  } else if (appState.screen === "history") {
    if (xy.y >= 145 && xy.y <= 170 && xy.x >= 50 && xy.x <= 126) {
      flashButton(50, 145, 126, 170, "BACK");
      setTimeout(() => {
        appState.screen = "main";
        screenNeedsRedraw = true;
        drawScreen();
      }, 150);
    }
  }
});

E.on('kill', function() {
  Bangle.setGPSPower(0);
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  print("RUNSTR: App exited, GPS stopped");
});

// Initialize
stepCount = Bangle.getHealthStatus("day").steps;
Bangle.setGPSPower(1);
g.clear();
setupBLE();
screenNeedsRedraw = true;
drawScreen();
print("RUNSTR: Enhanced app with Goals & Alerts started (v2.0)"); 