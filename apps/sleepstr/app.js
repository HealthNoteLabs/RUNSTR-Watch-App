// SLEEPSTR - Sleep Tracking & Alarm Clock App with BLE Sync for Bangle.js

// BLE UUIDs for SLEEPSTR Sync Service
const SLEEPSTR_SERVICE_UUID = "00000005-7275-6E73-7472-5F69645F3031";
const SLEEPSTR_DATA_CHAR_UUID = "00000006-7275-6E73-7472-5F69645F3031";

let sleeping = false;
let sleepData = {bedTime: null, sleepTime: null, wakeTime: null, duration: 0, quality: 0, movements: 0};
let alarmData = {time: "07:00", enabled: true, smartWake: true, windowMinutes: 30};
let alarmCheckInterval = null;
let movementCount = 0;
let lastMovementTime = 0;
let lastTouchTime = 0; // For touch debouncing
let screenNeedsRedraw = true; // Optimize redraws
let currentView = 'main'; // main, quality_rating, alarm_setting, summary

// Function to prepare sleep data for syncing
function prepareSleepDataForSync() {
  if (!sleepData || !sleepData.bedTime) {
    print("SLEEPSTR: No sleep data to sync.");
    return null;
  }
  const payload = {
    bedTime: sleepData.bedTime,
    sleepTime: sleepData.sleepTime,
    wakeTime: sleepData.wakeTime,
    duration: sleepData.duration,
    quality: sleepData.quality,
    movements: sleepData.movements,
    alarmUsed: alarmData.enabled,
    device: "HealthNote Watch SLEEPSTR"
  };
  return JSON.stringify(payload);
}

// Function to update the BLE characteristic value
function updateBLECharacteristic(jsonData) {
  if (jsonData) {
    try {
      NRF.updateServices({
        [SLEEPSTR_SERVICE_UUID]: {
          [SLEEPSTR_DATA_CHAR_UUID]: {
            value: jsonData,
            notify: true
          }
        }
      });
      print("SLEEPSTR: BLE characteristic updated and notified.");
      Bangle.buzz(100,1);
    } catch (e) {
      print("SLEEPSTR: Error updating BLE characteristic:", e);
    }
  }
}

// Setup BLE Services
function setupBLE() {
  NRF.setServices({
    [SLEEPSTR_SERVICE_UUID]: {
      [SLEEPSTR_DATA_CHAR_UUID]: {
        value: "{\"status\":\"no_sleep_data\"}",
        readable: true,
        notify: true,
        writable: true,
        onWrite: function(evt) {
          print("SLEEPSTR: Write received from central, preparing data.");
          const sleepJson = prepareSleepDataForSync();
          if (sleepJson) {
            updateBLECharacteristic(sleepJson);
            showMessage("SENDING DATA...", 2000);
          }
        },
        description: "SLEEPSTR Sleep Data"
      }
    }
  }, {
    advertise: [SLEEPSTR_SERVICE_UUID],
    uart: false
  });

  NRF.on('connect', function(addr) {
    print("SLEEPSTR: Connected to " + addr);
    showMessage("Phone Connected", 1500);
  });

  NRF.on('disconnect', function(reason) {
    print("SLEEPSTR: Disconnected, reason: " + reason);
    showMessage("Phone Disconnected", 1500);
  });
  print("SLEEPSTR: BLE Sync Service Configured.");
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
    drawScreen();
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
  let totalMinutes = Math.floor(ms / 60000);
  let hours = Math.floor(totalMinutes / 60);
  let minutes = totalMinutes % 60;
  return hours + "h " + minutes + "m";
}

function formatClock(timeStr) {
  // timeStr is in format "07:00"
  return timeStr;
}

function getCurrentTime() {
  const now = new Date();
  const hours = ("0" + now.getHours()).substr(-2);
  const minutes = ("0" + now.getMinutes()).substr(-2);
  return hours + ":" + minutes;
}

function drawStars(x, y, rating, maxRating = 5) {
  const starSize = 12;
  const spacing = 16;
  const startX = x - ((maxRating * spacing) / 2);
  
  for (let i = 0; i < maxRating; i++) {
    const starX = startX + (i * spacing);
    if (i < rating) {
      // Filled star
      g.setColor(0xFFE0); // Yellow
      g.fillPoly([
        starX, y-starSize/2,
        starX+3, y-2,
        starX+starSize/2, y-2,
        starX+6, y+2,
        starX+4, y+starSize/2,
        starX, y+4,
        starX-4, y+starSize/2,
        starX-6, y+2,
        starX-starSize/2, y-2,
        starX-3, y-2
      ]);
    } else {
      // Empty star outline
      g.setColor(0x7BEF); // Gray
      g.drawPoly([
        starX, y-starSize/2,
        starX+3, y-2,
        starX+starSize/2, y-2,
        starX+6, y+2,
        starX+4, y+starSize/2,
        starX, y+4,
        starX-4, y+starSize/2,
        starX-6, y+2,
        starX-starSize/2, y-2,
        starX-3, y-2
      ]);
    }
  }
}

function checkAlarm() {
  if (!alarmData.enabled) return;
  
  const now = new Date();
  const currentTime = getCurrentTime();
  const alarmTime = alarmData.time;
  
  // Check if it's alarm time
  if (currentTime === alarmTime) {
    triggerAlarm();
    return;
  }
  
  // Smart wake logic - check 30 minutes before alarm
  if (alarmData.smartWake && sleeping) {
    const [alarmHours, alarmMinutes] = alarmTime.split(':').map(Number);
    const alarmDate = new Date();
    alarmDate.setHours(alarmHours, alarmMinutes, 0, 0);
    
    const windowStart = new Date(alarmDate.getTime() - (alarmData.windowMinutes * 60000));
    
    if (now >= windowStart && now <= alarmDate) {
      // Check if user has been moving (light sleep)
      const timeSinceLastMovement = Date.now() - lastMovementTime;
      if (timeSinceLastMovement < 60000 && movementCount > 0) { // Movement in last minute
        print("SLEEPSTR: Smart wake - detected light sleep");
        triggerAlarm();
      }
    }
  }
}

function triggerAlarm() {
  print("SLEEPSTR: ALARM TRIGGERED");
  
  // Stop sleep tracking if active
  if (sleeping) {
    endSleep();
  }
  
  // Vibration pattern for alarm
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      Bangle.buzz(300, 1); // Long vibration
    }, i * 1000);
  }
  
  showMessage("WAKE UP! Tap to snooze", 10000);
  
  // Show snooze option
  setTimeout(() => {
    currentView = 'main';
    screenNeedsRedraw = true;
    drawScreen();
  }, 10000);
}

function snoozeAlarm() {
  // Snooze for 5 minutes
  const [hours, minutes] = alarmData.time.split(':').map(Number);
  const newMinutes = (minutes + 5) % 60;
  const newHours = minutes + 5 >= 60 ? (hours + 1) % 24 : hours;
  
  alarmData.time = ("0" + newHours).substr(-2) + ":" + ("0" + newMinutes).substr(-2);
  
  showMessage("Snoozed 5 minutes", 2000);
}

function drawScreen() {
  if (!screenNeedsRedraw) return;
  
  g.clear();
  g.setColor(1,1,1);
  g.setFont("6x8",2);
  g.setFontAlign(0,-1);
  
  if (currentView === 'quality_rating') {
    drawQualityRatingScreen();
  } else if (currentView === 'alarm_setting') {
    drawAlarmSettingScreen();
  } else if (currentView === 'summary') {
    drawSummaryScreen();
  } else {
    drawMainScreen();
  }
  
  screenNeedsRedraw = false;
}

function drawMainScreen() {
  g.drawString("SLEEPSTR", g.getWidth()/2, 5);
  
  g.setFont("6x8",1);
  g.setFontAlign(0,0);
  
  if (sleeping) {
    // Show sleep in progress
    g.drawString("Sleeping...", g.getWidth()/2, 30);
    
    const elapsed = Date.now() - sleepData.sleepTime;
    g.drawString("Time: " + formatTime(elapsed), g.getWidth()/2, 50);
    
    g.drawString("Movements: " + movementCount, g.getWidth()/2, 70);
    
    // Wake up button
    g.setColor(0xF800); // Red
    g.fillRect(50, 120, 126, 150);
    g.setColor(1,1,1);
    g.setFont("6x8",2);
    g.drawString("WAKE UP", g.getWidth()/2, 135);
  } else {
    // Show last sleep if available
    if (sleepData.wakeTime && sleepData.duration > 0) {
      g.drawString("Last: " + formatTime(sleepData.duration), g.getWidth()/2, 30);
      
      // Show quality stars
      if (sleepData.quality > 0) {
        g.drawString("Quality:", g.getWidth()/2, 45);
        drawStars(g.getWidth()/2, 60, sleepData.quality);
      }
    }
    
    // Show alarm status
    g.setColor(alarmData.enabled ? 0x07E0 : 0x7BEF);
    g.drawString("Alarm: " + formatClock(alarmData.time) + (alarmData.enabled ? " ✓" : " ✗"), g.getWidth()/2, 80);
    g.setColor(1,1,1);
    
    // Sleep button
    g.setColor(0x07E0); // Green
    g.fillRect(50, 120, 126, 150);
    g.setColor(0,0,0);
    g.setFont("6x8",2);
    g.drawString("SLEEP", g.getWidth()/2, 135);
  }
}

function drawQualityRatingScreen() {
  g.drawString("RATE SLEEP", g.getWidth()/2, 5);
  
  g.setFont("6x8",1);
  g.setFontAlign(0,0);
  g.drawString("How was your sleep?", g.getWidth()/2, 30);
  
  // Draw interactive stars
  drawStars(g.getWidth()/2, 70, sleepData.quality);
  
  // Instructions
  g.drawString("Tap stars to rate", g.getWidth()/2, 100);
  
  // Confirm button
  if (sleepData.quality > 0) {
    g.setColor(0x07E0);
    g.fillRect(50, 120, 126, 150);
    g.setColor(0,0,0);
    g.setFont("6x8",2);
    g.drawString("CONFIRM", g.getWidth()/2, 135);
  }
}

function drawAlarmSettingScreen() {
  g.drawString("SET ALARM", g.getWidth()/2, 5);
  
  g.setFont("6x8",1);
  g.setFontAlign(0,0);
  
  // Current alarm time
  g.setFont("6x8",3);
  g.drawString(formatClock(alarmData.time), g.getWidth()/2, 40);
  
  g.setFont("6x8",1);
  
  // Smart wake option
  g.setColor(alarmData.smartWake ? 0x07E0 : 0x7BEF);
  g.drawString("Smart Wake: " + (alarmData.smartWake ? "ON" : "OFF"), g.getWidth()/2, 70);
  g.setColor(1,1,1);
  
  // Enable/disable
  g.setColor(alarmData.enabled ? 0x07E0 : 0xF800);
  g.drawString("Alarm: " + (alarmData.enabled ? "ON" : "OFF"), g.getWidth()/2, 90);
  g.setColor(1,1,1);
  
  // Back button
  g.setColor(0x001F);
  g.fillRect(50, 120, 126, 150);
  g.setColor(1,1,1);
  g.setFont("6x8",2);
  g.drawString("BACK", g.getWidth()/2, 135);
}

function drawSummaryScreen() {
  g.drawString("SLEEP SUMMARY", g.getWidth()/2, 5);
  
  g.setFont("6x8",1);
  g.setFontAlign(0,0);
  
  // Sleep stats
  g.drawString("Duration: " + formatTime(sleepData.duration), g.getWidth()/2, 30);
  g.drawString("Bed: " + new Date(sleepData.bedTime).toTimeString().substr(0,5), g.getWidth()/2, 45);
  g.drawString("Wake: " + new Date(sleepData.wakeTime).toTimeString().substr(0,5), g.getWidth()/2, 60);
  g.drawString("Movements: " + sleepData.movements, g.getWidth()/2, 75);
  
  if (sleepData.quality > 0) {
    g.drawString("Quality:", g.getWidth()/2, 90);
    drawStars(g.getWidth()/2, 105, sleepData.quality);
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

function startSleep() {
  sleeping = true;
  const now = Date.now();
  sleepData = {
    bedTime: now,
    sleepTime: now,
    wakeTime: null,
    duration: 0,
    quality: 0,
    movements: 0
  };
  
  movementCount = 0;
  lastMovementTime = now;
  
  Bangle.buzz(200); // Start vibration
  screenNeedsRedraw = true;
  
  // Start alarm checking
  if (!alarmCheckInterval) {
    alarmCheckInterval = setInterval(checkAlarm, 30000); // Check every 30 seconds
  }
  
  drawScreen();
  print("SLEEPSTR: Sleep tracking started");
}

function endSleep() {
  sleeping = false;
  const now = Date.now();
  
  sleepData.wakeTime = now;
  sleepData.duration = now - sleepData.sleepTime;
  sleepData.movements = movementCount;
  
  if (alarmCheckInterval) {
    clearInterval(alarmCheckInterval);
    alarmCheckInterval = null;
  }
  
  Bangle.buzz(100, 0.5);
  setTimeout(() => Bangle.buzz(100, 0.5), 200);
  
  // Save sleep data
  let filename = "sleepstr.sleep." + Date.now() + ".json";
  require("Storage").writeJSON(filename, sleepData);
  print("SLEEPSTR: Sleep saved as " + filename);
  
  // Go to quality rating
  currentView = 'quality_rating';
  screenNeedsRedraw = true;
  drawScreen();
}

function adjustAlarmTime(hours, minutes) {
  let [h, m] = alarmData.time.split(':').map(Number);
  h = (h + hours + 24) % 24;
  m = (m + minutes + 60) % 60;
  if (minutes < 0 && m > 55) h = (h - 1 + 24) % 24;
  if (minutes > 0 && m < 5) h = (h + 1) % 24;
  
  alarmData.time = ("0" + h).substr(-2) + ":" + ("0" + m).substr(-2);
}

// Enhanced touch handler
Bangle.on('touch', function(btn, xy) {
  let now = Date.now();
  if (now - lastTouchTime < 300) return; // 300ms debounce
  lastTouchTime = now;
  
  if (currentView === 'quality_rating') {
    // Star rating touch handling
    if (xy.y >= 55 && xy.y <= 85) {
      const starWidth = 16;
      const startX = (g.getWidth() - (5 * starWidth)) / 2;
      for (let i = 0; i < 5; i++) {
        if (xy.x >= startX + (i * starWidth) && xy.x <= startX + ((i + 1) * starWidth)) {
          sleepData.quality = i + 1;
          screenNeedsRedraw = true;
          drawScreen();
          break;
        }
      }
    }
    
    // Confirm button
    if (sleepData.quality > 0 && xy.y >= 120 && xy.y <= 150 && xy.x >= 50 && xy.x <= 126) {
      flashButton(50, 120, 126, 150, "CONFIRMED");
      setTimeout(() => {
        currentView = 'summary';
        screenNeedsRedraw = true;
        drawScreen();
      }, 150);
    }
  } else if (currentView === 'alarm_setting') {
    // Alarm time adjustment
    if (xy.y >= 25 && xy.y <= 55) {
      if (xy.x < g.getWidth()/2) {
        adjustAlarmTime(-1, 0); // Decrease hour
      } else {
        adjustAlarmTime(1, 0); // Increase hour
      }
      screenNeedsRedraw = true;
    }
    
    // Smart wake toggle
    if (xy.y >= 65 && xy.y <= 75) {
      alarmData.smartWake = !alarmData.smartWake;
      screenNeedsRedraw = true;
    }
    
    // Alarm enable toggle
    if (xy.y >= 85 && xy.y <= 95) {
      alarmData.enabled = !alarmData.enabled;
      screenNeedsRedraw = true;
    }
    
    // Back button
    if (xy.y >= 120 && xy.y <= 150 && xy.x >= 50 && xy.x <= 126) {
      flashButton(50, 120, 126, 150, "BACK");
      setTimeout(() => {
        currentView = 'main';
        screenNeedsRedraw = true;
        drawScreen();
      }, 150);
    }
  } else if (currentView === 'summary') {
    // SYNC button
    if (xy.x >= 20 && xy.x <= 80 && xy.y >= 120 && xy.y <= 150) {
      flashButton(20, 120, 80, 150, "SYNC");
      setTimeout(() => {
        showMessage("Use phone app to sync", 3000);
      }, 150);
    }
    // OK button
    else if (xy.x >= 96 && xy.x <= 156 && xy.y >= 120 && xy.y <= 150) {
      flashButton(96, 120, 156, 150, "OK");
      setTimeout(() => {
        currentView = 'main';
        screenNeedsRedraw = true;
        drawScreen();
      }, 150);
    }
  } else { // main view
    if (sleeping) {
      // Wake up button
      if (xy.y >= 120 && xy.y <= 150 && xy.x >= 50 && xy.x <= 126) {
        flashButton(50, 120, 126, 150, "WAKING");
        setTimeout(() => endSleep(), 150);
      }
    } else {
      // Sleep button
      if (xy.y >= 120 && xy.y <= 150 && xy.x >= 50 && xy.x <= 126) {
        flashButton(50, 120, 126, 150, "SLEEPING");
        setTimeout(() => startSleep(), 150);
      }
      // Alarm area - tap to configure
      else if (xy.y >= 75 && xy.y <= 85) {
        currentView = 'alarm_setting';
        screenNeedsRedraw = true;
        drawScreen();
      }
    }
  }
  
  if (screenNeedsRedraw) drawScreen();
});

// Accelerometer for movement detection during sleep
Bangle.on('accel', function(accel) {
  if (!sleeping) return;
  
  // Simple movement detection
  const movement = Math.abs(accel.x) + Math.abs(accel.y) + Math.abs(accel.z);
  if (movement > 1.2) { // Threshold for movement
    movementCount++;
    lastMovementTime = Date.now();
  }
});

// Handle app exit
E.on('kill', function() {
  if (alarmCheckInterval) {
    clearInterval(alarmCheckInterval);
  }
  print("SLEEPSTR: App exited");
});

// Initialize
g.clear();
setupBLE();
screenNeedsRedraw = true;
drawScreen();

// Start alarm checking
alarmCheckInterval = setInterval(checkAlarm, 30000);

print("SLEEPSTR: Sleep tracking app started"); 