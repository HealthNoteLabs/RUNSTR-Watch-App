// RUNSTR - Run Tracking App for Bangle.js

// BLE UUIDs for RUNSTR Sync Service
const RUNSTR_SERVICE_UUID = "00000001-7275-6E73-7472-5F69645F3031"; // "runstr_id_01" in hex
const RUNSTR_DATA_CHAR_UUID = "00000002-7275-6E73-7472-5F69645F3031"; // "runstr_id_01" in hex, but with 0002

let running = false;
let runData = {
  startTime: null,
  distance: 0,
  duration: 0,
  pace: 0,
  calories: 0,
  steps: 0,
  gpsCoords: []
};

let lastGPS = null;
let updateInterval = null;
let stepCount = 0;

let settings = Object.assign({
  units: "km", // km or mi
  showPace: true,
  vibrate: true
}, require('Storage').readJSON("runstr.json", true) || {});

// Function to prepare run data for syncing
function prepareRunDataForSync() {
  if (!runData || !runData.startTime) {
    print("RUNSTR: No run data to sync.");
    return null;
  }
  const payload = {
    startTime: runData.startTime,
    duration: runData.duration,
    distance: Math.round(runData.distance), // meters, integer
    steps: runData.steps,
    gpsCoordinates: runData.gpsCoords.map(coord => ({
      lat: coord.lat,
      lon: coord.lon,
      alt: coord.alt,
      speed: coord.speed, // Captured from gps event
      time: coord.time
    })),
    device: "Bangle.js RUNSTR App"
  };
  return JSON.stringify(payload);
}

// Function to update the BLE characteristic value
function updateBLECharacteristic(jsonData) {
  if (jsonData) { // Check if there is data to send
    try {
      NRF.updateServices({
        [RUNSTR_SERVICE_UUID]: {
          [RUNSTR_DATA_CHAR_UUID]: {
            value: jsonData,
            readable: true,
            notify: false, // No notifications for this MVP, just readable
            // maxLen: 512 // Set if a larger payload is expected and supported
          }
        }
      });
      print("RUNSTR: BLE characteristic updated.");
      Bangle.buzz(100,1); // Short buzz to indicate ready for sync / updated
    } catch (e) {
      print("RUNSTR: Error updating BLE characteristic:", e);
    }
  } else {
    print("RUNSTR: No JSON data to update BLE characteristic.");
  }
}

// Setup BLE Services
function setupBLE() {
  NRF.setServices({
    [RUNSTR_SERVICE_UUID]: { // Primary service for RUNSTR
      [RUNSTR_DATA_CHAR_UUID]: { // Characteristic for run data
        value: "{\"status\":\"no_run_data\"}", // Initial value, properly escaped JSON
        readable: true,
        // notify: true, // Future: could notify phone app when data is ready
        // writable: true, // Future: could allow phone to acknowledge sync
        description: "RUNSTR Run Data"
        // maxLen: 512 // Max length of the characteristic value in bytes
      }
    }
  }, {
    advertise: [RUNSTR_SERVICE_UUID], // Advertise the service UUID
    uart: false // Turn off Nordic UART service to save space if not used
  });

  NRF.on('connect', function(addr) {
    print("RUNSTR: Connected to " + addr);
  });

  NRF.on('disconnect', function(reason) {
    print("RUNSTR: Disconnected, reason: " + reason);
  });
  print("RUNSTR: BLE Sync Service Configured.");
}

// Helper functions
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
    // Minutes per mile
    minutesPerUnit = 26.8224 / metersPerSecond;
  } else {
    // Minutes per km
    minutesPerUnit = 16.6667 / metersPerSecond;
  }
  
  let minutes = Math.floor(minutesPerUnit);
  let seconds = Math.floor((minutesPerUnit - minutes) * 60);
  return minutes + ":" + ("0"+seconds).substr(-2);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  // Haversine formula for distance calculation
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function drawScreen() {
  g.clear();
  g.setColor(1,1,1);
  g.setFont("6x8",2);
  
  // Title
  g.setFontAlign(0,-1);
  g.drawString("RUNSTR", g.getWidth()/2, 5);
  
  // Draw status
  if (running) {
    // Update duration
    runData.duration = Date.now() - runData.startTime;
    
    // Time
    g.setFont("6x8",3);
    g.setFontAlign(0,0);
    g.drawString(formatTime(runData.duration), g.getWidth()/2, 40);
    
    // Distance
    g.setFont("6x8",2);
    g.drawString(formatDistance(runData.distance), g.getWidth()/2, 80);
    
    // Pace
    if (settings.showPace && runData.pace > 0) {
      g.setFont("6x8",1);
      g.drawString("Pace: " + formatPace(runData.pace) + "/" + (settings.units === "mi" ? "mi" : "km"), g.getWidth()/2, 110);
    }
    
    // Steps
    g.setFont("6x8",1);
    g.drawString("Steps: " + runData.steps, g.getWidth()/2, 130);
    
    // Stop button
    g.setColor(0xF800); // Red
    g.fillRect(70, 170, 170, 210);
    g.setColor(1,1,1);
    g.setFont("6x8",2);
    g.drawString("STOP", g.getWidth()/2, 190);
  } else {
    // Not running - show start screen or summary screen
    if (runData.startTime && runData.duration > 0) { // Summary Screen
      showSummary();
    } else { // Start Screen
      g.setFont("6x8",1);
      g.setFontAlign(0,0);
      g.drawString("Track your runs", g.getWidth()/2, 60);
      g.drawString("with GPS", g.getWidth()/2, 80);
      
      // Start button
      g.setColor(0x07E0); // Green
      g.fillRect(70, 120, 170, 180);
      g.setColor(0,0,0);
      g.setFont("6x8",3);
      g.drawString("START", g.getWidth()/2, 150);
    }
  }
}

function startRun() {
  running = true;
  runData = {
    startTime: Date.now(),
    distance: 0,
    duration: 0,
    pace: 0,
    calories: 0,
    steps: stepCount, // Initial steps at start of run
    gpsCoords: []
  };
  
  // Start GPS
  Bangle.setGPSPower(1);
  
  // Vibrate to indicate start
  if (settings.vibrate) {
    Bangle.buzz(200);
  }
  
  // Update screen every second
  updateInterval = setInterval(drawScreen, 1000);
  
  drawScreen();
}

function stopRun() {
  running = false;
  
  // Stop GPS
  Bangle.setGPSPower(0);
  
  // Clear update interval
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
  
  // Calculate final stats
  // runData.duration is already updated by drawScreen interval
  // Update steps one last time if needed, though Bangle.on('step') should be current
  // runData.steps will be (current total steps) - (total steps at start of run)

  // Save run data
  let filename = "runstr.run." + Date.now() + ".json";
  require("Storage").writeJSON(filename, runData);
  
  // Vibrate to indicate stop
  if (settings.vibrate) {
    Bangle.buzz(100, 0.5);
    setTimeout(() => Bangle.buzz(100, 0.5), 200);
  }
  
  // Show summary automatically
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

  // Time
  g.drawString("Time: " + formatTime(runData.duration), g.getWidth()/2, 40);

  // Distance
  g.drawString("Distance: " + formatDistance(runData.distance), g.getWidth()/2, 60);

  // Average pace
  let avgPace = runData.duration > 0 ? runData.distance / (runData.duration / 1000) : 0;
  g.drawString("Avg Pace: " + formatPace(avgPace) + "/" + (settings.units === "mi" ? "mi" : "km"), g.getWidth()/2, 80);

  // Steps
  g.drawString("Steps: " + runData.steps, g.getWidth()/2, 100);

  // SYNC button
  g.setColor(0x07FF); // Cyan
  g.fillRect(30, 130, 100, 170); // x1, y1, x2, y2
  g.setColor(0,0,0); // Black text
  g.setFont("6x8",2);
  g.drawString("SYNC", 65, 150); // Centered in button

  // OK button
  g.setColor(0x001F); // Blue
  g.fillRect(140, 130, 210, 170); // x1, y1, x2, y2
  g.setColor(1,1,1); // White text
  g.setFont("6x8",2);
  g.drawString("OK", 175, 150); // Centered in button
}

// Touch handler
Bangle.on('touch', function(btn, xy) {
  if (running) {
    // Check if stop button was pressed
    if (xy.y >= 170 && xy.y <= 210 && xy.x >= 70 && xy.x <= 170) {
      stopRun();
    }
  } else {
    // Not running - check buttons on current screen
    if (runData.startTime && runData.duration > 0) { // On Summary Screen
      // SYNC button pressed
      if (xy.x >= 30 && xy.x <= 100 && xy.y >= 130 && xy.y <= 170) {
        const runJson = prepareRunDataForSync();
        if (runJson) {
          updateBLECharacteristic(runJson);
           g.setFont("6x8",1);g.setColor(1,1,1);g.setFontAlign(0,0);
           g.drawString("SYNCING...", g.getWidth()/2, 190); // Feedback message
           setTimeout(() => { // Clear message and redraw summary or main screen
             if (runData.startTime && runData.duration > 0) showSummary(); else drawScreen();
           }, 2000);
        } else {
           g.setFont("6x8",1);g.setColor(1,1,1);g.setFontAlign(0,0);
           g.drawString("NO DATA", g.getWidth()/2, 190);
           setTimeout(() => {
            if (runData.startTime && runData.duration > 0) showSummary(); else drawScreen();
           }, 2000);
        }
      }
      // OK button pressed on summary screen
      else if (xy.x >= 140 && xy.x <= 210 && xy.y >= 130 && xy.y <= 170) {
        // Reset and go to main start screen
        runData = {
          startTime: null, distance: 0, duration: 0, pace: 0,
          calories: 0, steps: 0, gpsCoords: []
        };
        lastGPS = null;
        drawScreen(); 
      }
    } else { // On Start Screen
      // Check if start button was pressed
      if (xy.y >= 120 && xy.y <= 180 && xy.x >= 70 && xy.x <= 170) {
        startRun();
      }
    }
  }
});

// GPS handler
Bangle.on('GPS', function(gps) {
  if (!running || !gps.fix) return;
  
  let currentGPSTime = Date.now(); // Use current time for GPS point if gps.time is not reliable
  if (gps.time) currentGPSTime = gps.time.getTime(); // If gps.time is a Date object
  else if (typeof gps.time === 'number') currentGPSTime = gps.time; // if gps.time is already ms epoch

  // Calculate distance from last position
  if (lastGPS && lastGPS.lat && lastGPS.lon) {
    let dist = calculateDistance(lastGPS.lat, lastGPS.lon, gps.lat, gps.lon);
    
    // Filter out GPS noise (ignore movements less than 2 meters)
    if (dist > 2) {
      runData.distance += dist;
      
      // Calculate current pace (m/s)
      let timeDiff = (currentGPSTime - (lastGPS.time || 0)) / 1000; // seconds
      if (timeDiff > 0) {
        runData.pace = dist / timeDiff;
      }
      
      // Store GPS coordinate
      runData.gpsCoords.push({
        lat: gps.lat,
        lon: gps.lon,
        time: currentGPSTime,
        alt: gps.alt,
        speed: gps.speed // Capture speed from GPS if available
      });
      
      lastGPS = {lat: gps.lat, lon: gps.lon, time: currentGPSTime, alt: gps.alt, speed: gps.speed};
    }
  } else {
    lastGPS = {lat: gps.lat, lon: gps.lon, time: currentGPSTime, alt: gps.alt, speed: gps.speed};
    // Also add the first point
     runData.gpsCoords.push({
        lat: gps.lat,
        lon: gps.lon,
        time: currentGPSTime,
        alt: gps.alt,
        speed: gps.speed
      });
  }
});

// Step counter
let initialStepCountForRun = 0;
Bangle.on('step', function(updatetime) { // updatetime is the time of the step event
  let currentTotalSteps = Bangle.getHealthStatus("day").steps;
  if (running) {
    if (runData.startTime && initialStepCountForRun === 0) { // First step event after run started
        initialStepCountForRun = currentTotalSteps;
        runData.steps = 0; // Initialize run steps
    } else if (initialStepCountForRun > 0) {
        runData.steps = currentTotalSteps - initialStepCountForRun;
    }
  } else {
      initialStepCountForRun = 0; // Reset when not running
  }
  stepCount = currentTotalSteps; // Keep track of total steps for app start
});

// Handle app exit
E.on('kill', function() {
  // Stop GPS if running
  if (running) {
    Bangle.setGPSPower(0);
  }
  
  // Clear intervals
  if (updateInterval) {
    clearInterval(updateInterval);
  }
});

// Initialize
stepCount = Bangle.getHealthStatus("day").steps; // Initialize stepCount on app load
g.clear();
setupBLE(); // Call BLE setup when the app starts
drawScreen(); 