// RUNSTR - Run Tracking App with BLE Sync for Bangle.js

// BLE UUIDs for RUNSTR Sync Service
const RUNSTR_SERVICE_UUID = "00000001-7275-6E73-7472-5F69645F3031"; // "runstr_id_01" in hex
const RUNSTR_DATA_CHAR_UUID = "00000002-7275-6E73-7472-5F69645F3031"; // "runstr_id_01" in hex, but with 0002

let running = false;
let runData = {startTime: null, distance: 0, duration: 0, steps: 0, gpsCoords: []};
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
      Bangle.buzz(100,1); // Short buzz to indicate data was sent
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
            g.setFont("6x8",1);g.setColor(1,1,1);g.setFontAlign(0,0);
            g.drawString("SENDING DATA...", g.getWidth()/2, 165);
            setTimeout(() => {
               if (runData.startTime && runData.duration > 0) showSummary(); else drawScreen();
            }, 2000);
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
  });

  NRF.on('disconnect', function(reason) {
    print("RUNSTR: Disconnected, reason: " + reason);
  });
  print("RUNSTR: BLE Sync Service Configured with onWrite handler.");
}

function formatTime(ms) {
  let totalSeconds = Math.floor(ms / 1000);
  let minutes = Math.floor(totalSeconds / 60);
  let seconds = totalSeconds % 60;
  return minutes + ":" + ("0"+seconds).substr(-2);
}

function formatDistance(meters) {
  return (meters / 1000).toFixed(2) + " km";
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
    g.setColor(gpsFix.fix ? 0x07E0 : 0xF800);
    g.drawString("GPS:" + (gpsFix.fix ? "OK" : "WAIT") + " (" + runData.gpsCoords.length + ")", g.getWidth()/2, 100);
    g.setColor(0xF800);
    g.fillRect(50, 120, 126, 150);
    g.setColor(1,1,1);
    g.setFont("6x8",2);
    g.drawString("STOP", g.getWidth()/2, 135);
  } else {
    g.setFont("6x8",1);
    g.setFontAlign(0,0);
    g.drawString("Track your runs", g.getWidth()/2, 40);
    g.setColor(gpsFix.fix ? 0x07E0 : 0xF800);
    g.drawString(gpsFix.fix ? "GPS Ready" : "Getting GPS...", g.getWidth()/2, 60);
    g.setColor(1,1,1);
    if (gpsFix.lat && gpsFix.lon) {
      g.setFont("6x8",1);
      g.drawString("Lat:" + gpsFix.lat.toFixed(4), g.getWidth()/2, 80);
      g.drawString("Lon:" + gpsFix.lon.toFixed(4), g.getWidth()/2, 95);
    }
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
  runData = {startTime: Date.now(), distance: 0, duration: 0, steps: stepCount, gpsCoords: []};
  if(gpsFix.fix) lastGPS = {lat: gpsFix.lat, lon: gpsFix.lon, time: Date.now()};
  else lastGPS = null;
  Bangle.buzz(200);
  updateInterval = setInterval(drawScreen, 1000);
  drawScreen();
}

function stopRun() {
  running = false;
  if (updateInterval) { clearInterval(updateInterval); updateInterval = null; }
  Bangle.buzz(100, 0.5);
  setTimeout(() => Bangle.buzz(100, 0.5), 200);
  
  // Save run data to storage
  let filename = "runstr.run." + Date.now() + ".json";
  require("Storage").writeJSON(filename, runData);
  
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
  g.drawString("Time: " + formatTime(runData.duration), g.getWidth()/2, 30);
  g.drawString("Distance: " + formatDistance(runData.distance), g.getWidth()/2, 50);
  g.drawString("Steps: " + runData.steps, g.getWidth()/2, 70);
  
  // SYNC button
  g.setColor(0x07FF); // Cyan
  g.fillRect(20, 100, 80, 130);
  g.setColor(0,0,0);
  g.setFont("6x8",2);
  g.drawString("SYNC", 50, 115);
  
  // OK button
  g.setColor(0x001F); // Blue
  g.fillRect(96, 100, 156, 130);
  g.setColor(1,1,1);
  g.setFont("6x8",2);
  g.drawString("OK", 126, 115);
}

Bangle.on('touch', function(btn, xy) {
  if (running) {
    if (xy.y >= 120 && xy.y <= 150 && xy.x >= 50 && xy.x <= 126) stopRun();
  } else {
    if (runData.startTime && runData.duration > 0) { // On Summary Screen
      // SYNC button pressed
      if (xy.x >= 20 && xy.x <= 80 && xy.y >= 100 && xy.y <= 130) {
        g.setFont("6x8",1);g.setColor(1,1,1);g.setFontAlign(0,0);
        g.drawString("Use phone to sync", g.getWidth()/2, 150);
        setTimeout(() => showSummary(), 2500);
      }
      // OK button pressed
      else if (xy.x >= 96 && xy.x <= 156 && xy.y >= 100 && xy.y <= 130) {
        runData = {startTime: null, distance: 0, duration: 0, steps: 0, gpsCoords: []};
        lastGPS = null;
        drawScreen();
      }
    } else { // On Start Screen
      if (xy.y >= 120 && xy.y <= 150 && xy.x >= 50 && xy.x <= 126) {
        if (gpsFix.fix && isValidGPS(gpsFix.lat, gpsFix.lon)) {
          startRun();
        } else {
          g.setFont("6x8",1);g.setColor(1,1,1);g.setFontAlign(0,0);
          g.drawString("GPS not ready!", g.getWidth()/2, 160);
          setTimeout(() => drawScreen(), 2000);
        }
      }
    }
  }
});

Bangle.on('GPS', function(gps) {
  let oldFix = gpsFix.fix;
  gpsFix = gps;
  print("GPS: fix=" + gps.fix + " lat=" + gps.lat + " lon=" + gps.lon);
  if (!running) {
    if (gpsFix.fix !== oldFix) drawScreen();
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
      runData.gpsCoords.push({lat: gps.lat, lon: gps.lon, time: currentTime, alt: gps.alt, speed: gps.speed});
      lastGPS = {lat: gps.lat, lon: gps.lon, time: currentTime};
    }
  } else {
    print("First GPS point");
    lastGPS = {lat: gps.lat, lon: gps.lon, time: currentTime};
    runData.gpsCoords.push({lat: gps.lat, lon: gps.lon, time: currentTime, alt: gps.alt, speed: gps.speed});
  }
});

let initialSteps = 0;
Bangle.on('step', function() {
  let currentSteps = Bangle.getHealthStatus("day").steps;
  if (running) {
    if (initialSteps === 0) { initialSteps = currentSteps; runData.steps = 0; }
    else runData.steps = currentSteps - initialSteps;
  } else initialSteps = 0;
  stepCount = currentSteps;
});

E.on('kill', function() {
  Bangle.setGPSPower(0);
  if (updateInterval) clearInterval(updateInterval);
});

// Initialize
stepCount = Bangle.getHealthStatus("day").steps;
Bangle.setGPSPower(1);
g.clear();
setupBLE(); // Setup BLE sync service
drawScreen(); 