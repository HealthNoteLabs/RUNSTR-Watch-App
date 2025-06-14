// RUNSTR - Enhanced Run Tracking App with BLE Sync for Bangle.js

// BLE UUIDs for RUNSTR Sync Service
const RUNSTR_SERVICE_UUID = "00000001-7275-6E73-7472-5F69645F3031";
const RUNSTR_DATA_CHAR_UUID = "00000002-7275-6E73-7472-5F69645F3031";

let running = false;
let runData = {startTime: null, distance: 0, duration: 0, steps: 0, gpsCoords: []};
let lastGPS = null;
let updateInterval = null;
let stepCount = 0;
let gpsFix = { fix: 0 };
let lastTouchTime = 0; // For touch debouncing
let screenNeedsRedraw = true; // Optimize redraws

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
    device: "Bangle.js RUNSTR App"
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
  g.fillRect(0, 160, g.getWidth(), 176); // Clear message area
  g.setColor(0,0,0);
  g.fillRect(0, 160, g.getWidth(), 176);
  g.setColor(1,1,1);
  g.drawString(text, g.getWidth()/2, 168);
  setTimeout(() => {
    screenNeedsRedraw = true;
    if (runData.startTime && runData.duration > 0) showSummary(); 
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
  Bangle.buzz(50); // Short haptic feedback
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
  return (meters / 1000).toFixed(2) + " km";
}

function formatPace(metersPerSecond) {
  if (metersPerSecond === 0) return "--:--";
  let minutesPerKm = 16.6667 / metersPerSecond;
  let minutes = Math.floor(minutesPerKm);
  let seconds = Math.floor((minutesPerKm - minutes) * 60);
  return minutes + ":" + ("0"+seconds).substr(-2) + "/km";
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
  
  g.clear();
  g.setColor(1,1,1);
  g.setFont("6x8",2);
  g.setFontAlign(0,-1);
  g.drawString("RUNSTR", g.getWidth()/2, 5);
  
  if (running) {
    runData.duration = Date.now() - runData.startTime;
    
    // Time
    g.setFont("6x8",2);
    g.setFontAlign(0,0);
    g.drawString(formatTime(runData.duration), g.getWidth()/2, 30);
    
    // Distance
    g.setFont("6x8",2);
    g.drawString(formatDistance(runData.distance), g.getWidth()/2, 55);
    
    // Pace (if moving)
    g.setFont("6x8",1);
    if (runData.duration > 10000 && runData.distance > 50) { // Only show pace after 10s and 50m
      let avgPace = runData.distance / (runData.duration / 1000);
      g.drawString("Pace: " + formatPace(avgPace), g.getWidth()/2, 75);
    }
    
    // Steps
    g.drawString("Steps: " + runData.steps, g.getWidth()/2, 90);
    
    // GPS Status with better visibility
    g.setColor(gpsFix.fix ? 0x07E0 : 0xF800);
    g.drawString("GPS:" + (gpsFix.fix ? "OK" : "WAIT") + " (" + runData.gpsCoords.length + ")", g.getWidth()/2, 105);
    g.setColor(1,1,1);
    
    // Stop button
    g.setColor(0xF800);
    g.fillRect(50, 120, 126, 150);
    g.setColor(1,1,1);
    g.setFont("6x8",2);
    g.drawString("STOP", g.getWidth()/2, 135);
  } else {
    g.setFont("6x8",1);
    g.setFontAlign(0,0);
    g.drawString("Track your runs", g.getWidth()/2, 35);
    g.drawString("with GPS", g.getWidth()/2, 50);
    
    // GPS Status with coordinates
    g.setColor(gpsFix.fix ? 0x07E0 : 0xF800);
    g.drawString(gpsFix.fix ? "GPS Ready" : "Getting GPS fix...", g.getWidth()/2, 70);
    g.setColor(1,1,1);
    
    if (gpsFix.lat && gpsFix.lon) {
      g.setFont("6x8",1);
      g.drawString("Lat:" + gpsFix.lat.toFixed(4), g.getWidth()/2, 85);
      g.drawString("Lon:" + gpsFix.lon.toFixed(4), g.getWidth()/2, 100);
    }
    
    // Start button with status-based styling
    if (gpsFix.fix) {
      g.setColor(0x07E0); // Green
      g.fillRect(50, 120, 126, 150);
      g.setColor(0,0,0);
      g.setFont("6x8",2);
      g.drawString("START", g.getWidth()/2, 135);
    } else {
      g.setColor(0x7BEF); // Gray
      g.fillRect(50, 120, 126, 150);
      g.setColor(0,0,0);
      g.setFont("6x8",1);
      g.drawString("WAIT GPS", g.getWidth()/2, 135);
    }
  }
  
  screenNeedsRedraw = false;
}

function startRun() {
  running = true;
  runData = {
    startTime: Date.now(), 
    distance: 0, 
    duration: 0, 
    steps: stepCount, 
    gpsCoords: []
  };
  
  if(gpsFix.fix) {
    lastGPS = {lat: gpsFix.lat, lon: gpsFix.lon, time: Date.now()};
  } else {
    lastGPS = null;
  }
  
  Bangle.buzz(200);
  screenNeedsRedraw = true;
  
  // Slower refresh rate to reduce conflicts
  updateInterval = setInterval(() => {
    if (running) {
      screenNeedsRedraw = true;
      drawScreen();
    }
  }, 2000);
  
  drawScreen();
}

function stopRun() {
  running = false;
  
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
  
  Bangle.buzz(100, 0.5);
  setTimeout(() => Bangle.buzz(100, 0.5), 200);
  
  // Save run data
  let filename = "runstr.run." + Date.now() + ".json";
  require("Storage").writeJSON(filename, runData);
  print("RUNSTR: Run saved as " + filename);
  
  screenNeedsRedraw = true;
  showSummary();
}

function showSummary() {
  g.clear();
  g.setColor(1,1,1);
  g.setFont("6x8",2);
  g.setFontAlign(0,-1);
  g.drawString("RUN COMPLETE", g.getWidth()/2, 5);
  
  g.setFont("6x8",1);
  g.setFontAlign(0,0);
  
  // Stats
  g.drawString("Time: " + formatTime(runData.duration), g.getWidth()/2, 30);
  g.drawString("Distance: " + formatDistance(runData.distance), g.getWidth()/2, 50);
  
  // Average pace
  if (runData.duration > 0 && runData.distance > 0) {
    let avgPace = runData.distance / (runData.duration / 1000);
    g.drawString("Avg Pace: " + formatPace(avgPace), g.getWidth()/2, 70);
  }
  
  g.drawString("Steps: " + runData.steps, g.getWidth()/2, 90);
  
  // SYNC button
  g.setColor(0x07FF);
  g.fillRect(20, 110, 80, 140);
  g.setColor(0,0,0);
  g.setFont("6x8",2);
  g.drawString("SYNC", 50, 125);
  
  // OK button
  g.setColor(0x001F);
  g.fillRect(96, 110, 156, 140);
  g.setColor(1,1,1);
  g.setFont("6x8",2);
  g.drawString("OK", 126, 125);
}

// Enhanced touch handler with debouncing and feedback
Bangle.on('touch', function(btn, xy) {
  let now = Date.now();
  if (now - lastTouchTime < 300) return; // 300ms debounce
  lastTouchTime = now;
  
  if (running) {
    // Stop button
    if (xy.y >= 120 && xy.y <= 150 && xy.x >= 50 && xy.x <= 126) {
      flashButton(50, 120, 126, 150, "STOPPING");
      setTimeout(() => stopRun(), 150);
    }
  } else {
    if (runData.startTime && runData.duration > 0) { // Summary Screen
      // SYNC button
      if (xy.x >= 20 && xy.x <= 80 && xy.y >= 110 && xy.y <= 140) {
        flashButton(20, 110, 80, 140, "SYNC");
        setTimeout(() => {
          showMessage("Use phone app to sync", 3000);
        }, 150);
      }
      // OK button
      else if (xy.x >= 96 && xy.x <= 156 && xy.y >= 110 && xy.y <= 140) {
        flashButton(96, 110, 156, 140, "OK");
        setTimeout(() => {
          runData = {startTime: null, distance: 0, duration: 0, steps: 0, gpsCoords: []};
          lastGPS = null;
          screenNeedsRedraw = true;
          drawScreen();
        }, 150);
      }
    } else { // Start Screen
      if (xy.y >= 120 && xy.y <= 150 && xy.x >= 50 && xy.x <= 126) {
        if (gpsFix.fix && isValidGPS(gpsFix.lat, gpsFix.lon)) {
          flashButton(50, 120, 126, 150, "STARTING");
          setTimeout(() => startRun(), 150);
        } else {
          flashButton(50, 120, 126, 150, "NO GPS");
          setTimeout(() => {
            showMessage("GPS not ready! Go outside", 3000);
          }, 150);
        }
      }
    }
  }
});

// GPS handler with better management
Bangle.on('GPS', function(gps) {
  let oldFix = gpsFix.fix;
  gpsFix = gps;
  
  print("GPS: fix=" + gps.fix + " lat=" + gps.lat + " lon=" + gps.lon);

  // Only redraw if GPS status changed and not running
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
      
      lastGPS = {lat: gps.lat, lon: gps.lon, time: currentTime};
      screenNeedsRedraw = true; // GPS update during run
    }
  } else {
    print("First GPS point");
    lastGPS = {lat: gps.lat, lon: gps.lon, time: currentTime};
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

// Step counter with better tracking
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

// Handle app exit
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
print("RUNSTR: Enhanced app started"); 