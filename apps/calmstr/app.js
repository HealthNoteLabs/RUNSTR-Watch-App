// CALMSTR - Meditation & Breathing App with BLE Sync for Bangle.js

// BLE UUIDs for CALMSTR Sync Service
const CALMSTR_SERVICE_UUID = "00000003-7275-6E73-7472-5F69645F3031";
const CALMSTR_DATA_CHAR_UUID = "00000004-7275-6E73-7472-5F69645F3031";

let breathing = false;
let sessionData = {startTime: null, duration: 0, type: 'breathing', pattern: '4-7-8', completed: false};
let breathPhase = 'prepare'; // prepare, inhale, hold, exhale
let phaseTimer = null;
let phaseStartTime = 0;
let cycleCount = 0;
let totalCycles = 4; // Default 4 cycles for 4-7-8 breathing
let lastTouchTime = 0; // For touch debouncing
let screenNeedsRedraw = true; // Optimize redraws

// 4-7-8 Breathing pattern timings (in milliseconds)
const BREATHING_PATTERN = {
  inhale: 4000,   // 4 seconds
  hold: 7000,     // 7 seconds
  exhale: 8000    // 8 seconds
};

// Circle animation properties
let circleRadius = 30;
let targetRadius = 30;
const MIN_RADIUS = 20;
const MAX_RADIUS = 70;

// Function to prepare session data for syncing
function prepareSessionDataForSync() {
  if (!sessionData || !sessionData.startTime) {
    print("CALMSTR: No session data to sync.");
    return null;
  }
  const payload = {
    startTime: sessionData.startTime,
    duration: sessionData.duration,
    type: sessionData.type,
    pattern: sessionData.pattern,
    cycles: cycleCount,
    completed: sessionData.completed,
    device: "HealthNote Watch CALMSTR"
  };
  return JSON.stringify(payload);
}

// Function to update the BLE characteristic value
function updateBLECharacteristic(jsonData) {
  if (jsonData) {
    try {
      NRF.updateServices({
        [CALMSTR_SERVICE_UUID]: {
          [CALMSTR_DATA_CHAR_UUID]: {
            value: jsonData,
            notify: true
          }
        }
      });
      print("CALMSTR: BLE characteristic updated and notified.");
      Bangle.buzz(100,1);
    } catch (e) {
      print("CALMSTR: Error updating BLE characteristic:", e);
    }
  }
}

// Setup BLE Services
function setupBLE() {
  NRF.setServices({
    [CALMSTR_SERVICE_UUID]: {
      [CALMSTR_DATA_CHAR_UUID]: {
        value: "{\"status\":\"no_session_data\"}",
        readable: true,
        notify: true,
        writable: true,
        onWrite: function(evt) {
          print("CALMSTR: Write received from central, preparing data.");
          const sessionJson = prepareSessionDataForSync();
          if (sessionJson) {
            updateBLECharacteristic(sessionJson);
            showMessage("SENDING DATA...", 2000);
          }
        },
        description: "CALMSTR Session Data"
      }
    }
  }, {
    advertise: [CALMSTR_SERVICE_UUID],
    uart: false
  });

  NRF.on('connect', function(addr) {
    print("CALMSTR: Connected to " + addr);
    showMessage("Phone Connected", 1500);
  });

  NRF.on('disconnect', function(reason) {
    print("CALMSTR: Disconnected, reason: " + reason);
    showMessage("Phone Disconnected", 1500);
  });
  print("CALMSTR: BLE Sync Service Configured.");
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
    if (sessionData.startTime && sessionData.duration > 0) showSummary(); 
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
  let minutes = Math.floor(totalSeconds / 60);
  let seconds = totalSeconds % 60;
  return minutes + ":" + ("0"+seconds).substr(-2);
}

function getPhaseText(phase) {
  switch(phase) {
    case 'prepare': return 'Get Ready';
    case 'inhale': return 'Breathe In';
    case 'hold': return 'Hold';
    case 'exhale': return 'Breathe Out';
    default: return 'Breathe';
  }
}

function getPhaseColor(phase) {
  switch(phase) {
    case 'prepare': return 0x7BEF; // Light blue
    case 'inhale': return 0x07E0;  // Green
    case 'hold': return 0xFFE0;    // Yellow
    case 'exhale': return 0x07FF;  // Cyan
    default: return 0x7BEF;
  }
}

function updateCircleRadius() {
  const now = Date.now();
  const phaseElapsed = now - phaseStartTime;
  let progress = 0;
  
  switch(breathPhase) {
    case 'prepare':
      targetRadius = MIN_RADIUS;
      break;
    case 'inhale':
      progress = phaseElapsed / BREATHING_PATTERN.inhale;
      targetRadius = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * Math.min(progress, 1);
      break;
    case 'hold':
      targetRadius = MAX_RADIUS;
      break;
    case 'exhale':
      progress = phaseElapsed / BREATHING_PATTERN.exhale;
      targetRadius = MAX_RADIUS - (MAX_RADIUS - MIN_RADIUS) * Math.min(progress, 1);
      break;
  }
  
  // Smooth animation
  circleRadius += (targetRadius - circleRadius) * 0.1;
}

function drawBreathingCircle() {
  updateCircleRadius();
  
  const centerX = g.getWidth() / 2;
  const centerY = 65;
  
  // Draw outer circle (background)
  g.setColor(0x2104); // Dark gray
  g.fillCircle(centerX, centerY, MAX_RADIUS + 5);
  
  // Draw breathing circle
  g.setColor(getPhaseColor(breathPhase));
  g.fillCircle(centerX, centerY, circleRadius);
  
  // Draw inner circle for contrast
  g.setColor(1,1,1);
  g.fillCircle(centerX, centerY, circleRadius * 0.3);
  
  // Phase text
  g.setColor(0,0,0);
  g.setFont("6x8",1);
  g.setFontAlign(0,0);
  g.drawString(getPhaseText(breathPhase), centerX, centerY);
}

function drawScreen() {
  if (!screenNeedsRedraw) return;
  
  g.clear();
  g.setColor(1,1,1);
  g.setFont("6x8",2);
  g.setFontAlign(0,-1);
  g.drawString("CALMSTR", g.getWidth()/2, 5);
  
  if (breathing) {
    // Show current cycle
    g.setFont("6x8",1);
    g.setFontAlign(0,0);
    g.drawString("Cycle " + (cycleCount + 1) + " of " + totalCycles, g.getWidth()/2, 25);
    
    // Draw breathing circle
    drawBreathingCircle();
    
    // Show elapsed time
    sessionData.duration = Date.now() - sessionData.startTime;
    g.drawString("Time: " + formatTime(sessionData.duration), g.getWidth()/2, 110);
    
    // Stop button
    g.setColor(0xF800);
    g.fillRect(50, 130, 126, 160);
    g.setColor(1,1,1);
    g.setFont("6x8",2);
    g.drawString("STOP", g.getWidth()/2, 145);
  } else {
    g.setFont("6x8",1);
    g.setFontAlign(0,0);
    g.drawString("4-7-8 Breathing", g.getWidth()/2, 35);
    g.drawString("Inhale 4, Hold 7, Exhale 8", g.getWidth()/2, 50);
    
    // Show last session if available
    if (sessionData.startTime && sessionData.duration > 0) {
      g.drawString("Last: " + formatTime(sessionData.duration), g.getWidth()/2, 70);
      g.drawString("Cycles: " + cycleCount, g.getWidth()/2, 85);
    }
    
    // Start button
    g.setColor(0x07E0); // Green
    g.fillRect(50, 120, 126, 150);
    g.setColor(0,0,0);
    g.setFont("6x8",2);
    g.drawString("START", g.getWidth()/2, 135);
  }
  
  screenNeedsRedraw = false;
}

function nextBreathPhase() {
  const now = Date.now();
  
  switch(breathPhase) {
    case 'prepare':
      breathPhase = 'inhale';
      phaseStartTime = now;
      Bangle.buzz(100); // Gentle vibration cue
      phaseTimer = setTimeout(nextBreathPhase, BREATHING_PATTERN.inhale);
      break;
    case 'inhale':
      breathPhase = 'hold';
      phaseStartTime = now;
      Bangle.buzz(50); // Shorter vibration for hold
      phaseTimer = setTimeout(nextBreathPhase, BREATHING_PATTERN.hold);
      break;
    case 'hold':
      breathPhase = 'exhale';
      phaseStartTime = now;
      Bangle.buzz(100); // Gentle vibration for exhale
      phaseTimer = setTimeout(nextBreathPhase, BREATHING_PATTERN.exhale);
      break;
    case 'exhale':
      cycleCount++;
      if (cycleCount >= totalCycles) {
        // Session complete
        stopBreathing(true);
      } else {
        // Next cycle
        breathPhase = 'inhale';
        phaseStartTime = now;
        Bangle.buzz(100);
        phaseTimer = setTimeout(nextBreathPhase, BREATHING_PATTERN.inhale);
      }
      break;
  }
  screenNeedsRedraw = true;
}

function startBreathing() {
  breathing = true;
  breathPhase = 'prepare';
  cycleCount = 0;
  sessionData = {
    startTime: Date.now(), 
    duration: 0, 
    type: 'breathing',
    pattern: '4-7-8',
    completed: false
  };
  
  phaseStartTime = Date.now();
  circleRadius = MIN_RADIUS;
  targetRadius = MIN_RADIUS;
  
  Bangle.buzz(200); // Start vibration
  screenNeedsRedraw = true;
  
  // Start breathing sequence after 2 seconds preparation
  phaseTimer = setTimeout(nextBreathPhase, 2000);
  
  drawScreen();
}

function stopBreathing(completed = false) {
  breathing = false;
  breathPhase = 'prepare';
  
  if (phaseTimer) {
    clearTimeout(phaseTimer);
    phaseTimer = null;
  }
  
  sessionData.completed = completed;
  sessionData.duration = Date.now() - sessionData.startTime;
  
  if (completed) {
    Bangle.buzz(100, 0.5);
    setTimeout(() => Bangle.buzz(100, 0.5), 200);
    setTimeout(() => Bangle.buzz(100, 0.5), 400);
  } else {
    Bangle.buzz(200);
  }
  
  // Save session data
  let filename = "calmstr.session." + Date.now() + ".json";
  require("Storage").writeJSON(filename, sessionData);
  print("CALMSTR: Session saved as " + filename);
  
  screenNeedsRedraw = true;
  showSummary();
}

function showSummary() {
  g.clear();
  g.setColor(1,1,1);
  g.setFont("6x8",2);
  g.setFontAlign(0,-1);
  g.drawString(sessionData.completed ? "SESSION COMPLETE" : "SESSION ENDED", g.getWidth()/2, 5);
  
  g.setFont("6x8",1);
  g.setFontAlign(0,0);
  
  // Stats
  g.drawString("Time: " + formatTime(sessionData.duration), g.getWidth()/2, 30);
  g.drawString("Pattern: " + sessionData.pattern, g.getWidth()/2, 50);
  g.drawString("Cycles: " + cycleCount + " of " + totalCycles, g.getWidth()/2, 70);
  
  if (sessionData.completed) {
    g.setColor(0x07E0);
    g.drawString("✓ Completed!", g.getWidth()/2, 90);
    g.setColor(1,1,1);
  }
  
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
  
  if (breathing) {
    // Stop button
    if (xy.y >= 130 && xy.y <= 160 && xy.x >= 50 && xy.x <= 126) {
      flashButton(50, 130, 126, 160, "STOPPING");
      setTimeout(() => stopBreathing(false), 150);
    }
  } else {
    if (sessionData.startTime && sessionData.duration > 0) { // Summary Screen
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
          sessionData = {startTime: null, duration: 0, type: 'breathing', pattern: '4-7-8', completed: false};
          cycleCount = 0;
          screenNeedsRedraw = true;
          drawScreen();
        }, 150);
      }
    } else { // Start Screen
      if (xy.y >= 120 && xy.y <= 150 && xy.x >= 50 && xy.x <= 126) {
        flashButton(50, 120, 126, 150, "STARTING");
        setTimeout(() => startBreathing(), 150);
      }
    }
  }
});

// Animation loop for smooth circle animation during breathing
setInterval(() => {
  if (breathing) {
    screenNeedsRedraw = true;
    drawScreen();
  }
}, 100); // Update 10 times per second for smooth animation

// Handle app exit
E.on('kill', function() {
  if (phaseTimer) {
    clearTimeout(phaseTimer);
  }
  print("CALMSTR: App exited");
});

// Initialize
g.clear();
setupBLE();
screenNeedsRedraw = true;
drawScreen();
print("CALMSTR: Meditation app started"); 