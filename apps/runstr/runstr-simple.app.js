// RUNSTR - Simple Run Tracking App for Bangle.js

let running = false;
let runData = {
  startTime: null,
  distance: 0,
  duration: 0,
  steps: 0,
  gpsCoords: []
};

let lastGPS = null;
let updateInterval = null;
let stepCount = 0;
let gpsFix = { fix: 0 };

// Function to validate GPS coordinates
function isValidGPS(lat, lon) {
  return (typeof lat === 'number' && typeof lon === 'number' && 
          lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 &&
          lat !== 0 && lon !== 0);
}

function formatTime(ms) {
  let totalSeconds = Math.floor(ms / 1000);
  let minutes = Math.floor(totalSeconds / 60);
  let seconds = totalSeconds % 60;
  return minutes + ":" + ("0"+seconds).substr(-2);
}

function formatDistance(meters) {
  let km = meters / 1000;
  return km.toFixed(2) + " km";
}

function calculateDistance(lat1, lon1, lat2, lon2) {
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
  g.setFontAlign(0,-1);
  g.drawString("RUNSTR", g.getWidth()/2, 5);
  
  if (running) {
    runData.duration = Date.now() - runData.startTime;
    
    g.setFont("6x8",2);
    g.setFontAlign(0,0);
    g.drawString(formatTime(runData.duration), g.getWidth()/2, 30);
    g.drawString(formatDistance(runData.distance), g.getWidth()/2, 55);
    
    g.setFont("6x8",1);
    g.drawString("Steps:" + runData.steps, g.getWidth()/2, 80);
    
    // GPS Status
    g.setColor(gpsFix.fix ? 0x07E0 : 0xF800);
    g.drawString("GPS:" + (gpsFix.fix ? "OK" : "WAIT") + " (" + runData.gpsCoords.length + ")", g.getWidth()/2, 100);
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
    g.drawString("Track your runs", g.getWidth()/2, 40);
    
    // GPS Status
    g.setColor(gpsFix.fix ? 0x07E0 : 0xF800);
    g.drawString(gpsFix.fix ? "GPS Ready" : "Getting GPS...", g.getWidth()/2, 60);
    g.setColor(1,1,1);
    
    // Show coordinates if available
    if (gpsFix.lat && gpsFix.lon) {
      g.setFont("6x8",1);
      g.drawString("Lat:" + gpsFix.lat.toFixed(4), g.getWidth()/2, 80);
      g.drawString("Lon:" + gpsFix.lon.toFixed(4), g.getWidth()/2, 95);
    }
    
    // Start button
    if (gpsFix.fix) {
      g.setColor(0x07E0);
      g.fillRect(50, 120, 126, 150);
      g.setColor(0,0,0);
      g.setFont("6x8",2);
      g.drawString("START", g.getWidth()/2, 135);
    } else {
      g.setColor(0x7BEF);
      g.fillRect(50, 120, 126, 150);
      g.setColor(0,0,0);
      g.setFont("6x8",1);
      g.drawString("WAIT GPS", g.getWidth()/2, 135);
    }
  }
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
  updateInterval = setInterval(drawScreen, 1000);
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
  
  // Show summary
  g.clear();
  g.setColor(1,1,1);
  g.setFont("6x8",2);
  g.setFontAlign(0,-1);
  g.drawString("RUN COMPLETE", g.getWidth()/2, 5);
  
  g.setFont("6x8",1);
  g.setFontAlign(0,0);
  g.drawString("Time: " + formatTime(runData.duration), g.getWidth()/2, 40);
  g.drawString("Distance: " + formatDistance(runData.distance), g.getWidth()/2, 60);
  g.drawString("Steps: " + runData.steps, g.getWidth()/2, 80);
  
  // OK button
  g.setColor(0x001F);
  g.fillRect(50, 120, 126, 150);
  g.setColor(1,1,1);
  g.setFont("6x8",2);
  g.drawString("OK", g.getWidth()/2, 135);
}

// Touch handler
Bangle.on('touch', function(btn, xy) {
  if (running) {
    if (xy.y >= 120 && xy.y <= 150 && xy.x >= 50 && xy.x <= 126) {
      stopRun();
    }
  } else {
    if (xy.y >= 120 && xy.y <= 150 && xy.x >= 50 && xy.x <= 126) {
      if (runData.startTime && runData.duration > 0) {
        // Reset after summary
        runData = {startTime: null, distance: 0, duration: 0, steps: 0, gpsCoords: []};
        lastGPS = null;
        drawScreen();
      } else if (gpsFix.fix && isValidGPS(gpsFix.lat, gpsFix.lon)) {
        startRun();
      } else {
        g.setFont("6x8",1);g.setColor(1,1,1);g.setFontAlign(0,0);
        g.drawString("GPS not ready!", g.getWidth()/2, 160);
        setTimeout(() => drawScreen(), 2000);
      }
    }
  }
});

// GPS handler
Bangle.on('GPS', function(gps) {
  let oldFix = gpsFix.fix;
  gpsFix = gps;
  
  print("GPS: fix=" + gps.fix + " lat=" + gps.lat + " lon=" + gps.lon);

  if (!running) {
    if (gpsFix.fix !== oldFix) {
      drawScreen();
    }
    return;
  }
  
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
        time: currentTime
      });
      
      lastGPS = {lat: gps.lat, lon: gps.lon, time: currentTime};
    }
  } else {
    print("First GPS point");
    lastGPS = {lat: gps.lat, lon: gps.lon, time: currentTime};
    runData.gpsCoords.push({
      lat: gps.lat,
      lon: gps.lon,
      time: currentTime
    });
  }
});

// Step counter
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
});

// Initialize
stepCount = Bangle.getHealthStatus("day").steps;
Bangle.setGPSPower(1);
g.clear();
drawScreen(); 