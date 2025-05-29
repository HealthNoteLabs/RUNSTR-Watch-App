// RUNSTR - Run Tracking App for Bangle.js
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

// Load saved settings
let settings = Object.assign({
  units: "km", // km or mi
  showPace: true,
  vibrate: true
}, require('Storage').readJSON("runstr.json", true) || {});

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
    // Not running - show start screen
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

function startRun() {
  running = true;
  runData = {
    startTime: Date.now(),
    distance: 0,
    duration: 0,
    pace: 0,
    calories: 0,
    steps: stepCount,
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
  runData.duration = Date.now() - runData.startTime;
  runData.steps = stepCount - runData.steps;
  
  // Save run data
  let filename = "runstr.run." + Date.now() + ".json";
  require("Storage").writeJSON(filename, runData);
  
  // Vibrate to indicate stop
  if (settings.vibrate) {
    Bangle.buzz(100, 0.5);
    setTimeout(() => Bangle.buzz(100, 0.5), 200);
  }
  
  // Show summary
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
  g.drawString("Time: " + formatTime(runData.duration), g.getWidth()/2, 50);
  
  // Distance
  g.drawString("Distance: " + formatDistance(runData.distance), g.getWidth()/2, 70);
  
  // Average pace
  let avgPace = runData.duration > 0 ? runData.distance / (runData.duration / 1000) : 0;
  g.drawString("Avg Pace: " + formatPace(avgPace) + "/" + (settings.units === "mi" ? "mi" : "km"), g.getWidth()/2, 90);
  
  // Steps
  g.drawString("Steps: " + runData.steps, g.getWidth()/2, 110);
  
  // OK button
  g.setColor(0x001F); // Blue
  g.fillRect(70, 150, 170, 190);
  g.setColor(1,1,1);
  g.setFont("6x8",2);
  g.drawString("OK", g.getWidth()/2, 170);
}

// Touch handler
Bangle.on('touch', function(btn, xy) {
  if (running) {
    // Check if stop button was pressed
    if (xy.y >= 170 && xy.y <= 210 && xy.x >= 70 && xy.x <= 170) {
      stopRun();
    }
  } else {
    // Check if start button or OK button was pressed
    if (xy.y >= 120 && xy.y <= 190 && xy.x >= 70 && xy.x <= 170) {
      if (runData.duration > 0) {
        // OK button after run - reset
        runData = {
          startTime: null,
          distance: 0,
          duration: 0,
          pace: 0,
          calories: 0,
          steps: 0,
          gpsCoords: []
        };
      }
      startRun();
    }
  }
});

// GPS handler
Bangle.on('GPS', function(gps) {
  if (!running || !gps.fix) return;
  
  // Calculate distance from last position
  if (lastGPS && lastGPS.lat && lastGPS.lon) {
    let dist = calculateDistance(lastGPS.lat, lastGPS.lon, gps.lat, gps.lon);
    
    // Filter out GPS noise (ignore movements less than 2 meters)
    if (dist > 2) {
      runData.distance += dist;
      
      // Calculate current pace (m/s)
      let timeDiff = (gps.time - lastGPS.time) / 1000; // seconds
      if (timeDiff > 0) {
        runData.pace = dist / timeDiff;
      }
      
      // Store GPS coordinate
      runData.gpsCoords.push({
        lat: gps.lat,
        lon: gps.lon,
        time: gps.time,
        alt: gps.alt
      });
      
      lastGPS = gps;
    }
  } else {
    lastGPS = gps;
  }
});

// Step counter
Bangle.on('step', function(count) {
  stepCount = count;
  if (running) {
    runData.steps = stepCount - runData.steps;
  }
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
g.clear();
drawScreen(); 