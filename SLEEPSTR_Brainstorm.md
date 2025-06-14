# SLEEPSTR - Sleep Tracking & Alarm Clock App Brainstorming

## 🎉 DEVELOPMENT UPDATE - MVP COMPLETED!

### ✅ **What We've Built (Today):**
- **Manual sleep/wake logging** with simple button interface
- **Quick-action interface** following proven RUNSTR/CALMSTR pattern
- **1-5 star sleep quality rating** with interactive star touch interface
- **Smart alarm clock** with vibration and 30-minute wake window
- **Movement detection** using accelerometer during sleep
- **Multiple app views** (main, alarm setting, quality rating, summary)
- **BLE sync capability** ready for mobile app integration
- **Comprehensive sleep analytics** with duration, quality, and movement tracking

### 🚀 **Key Features Implemented:**
- **Sleep Tracking Flow:** SLEEP button → track duration → WAKE UP → rate quality → view summary
- **Smart Alarm System:** Set time, enable/disable, smart wake during light sleep window
- **Movement Monitoring:** Accelerometer detects movement during sleep for smart wake
- **Multi-Screen Interface:** Seamless navigation between sleep tracking, alarm setting, and data review
- **Session Data Storage:** Each sleep session saved with complete metrics

### 📱 **User Experience:**
- Tap SLEEP when going to bed → automatic tracking starts
- Smart alarm wakes you gently during optimal sleep phase
- Rate sleep quality with intuitive star interface
- View detailed sleep summary with sync option
- Easy alarm configuration with time adjustment and smart features

---

## Project Overview
**SLEEPSTR** is the third app in the HealthNote ecosystem, focused on sleep tracking, smart alarms, and sleep quality monitoring. Building on the proven RUNSTR/CALMSTR architecture with BLE sync and Nostr integration.

---

## I. Core Features Analysis

### Primary Functions (MVP)
1. **Sleep Tracking**
   - Manual sleep/wake time logging
   - Sleep duration calculation
   - Sleep quality rating (1-5 scale)
   - Movement detection via accelerometer
   
2. **Smart Alarm Clock**
   - Vibration-based alarm (no sound)
   - Smart wake-up during light sleep window
   - Snooze functionality
   - Multiple alarm slots
   
3. **Sleep Analytics**
   - Sleep pattern trends
   - Average sleep duration
   - Sleep quality over time
   - Integration with activity data

### Secondary Features (Phase 2)
- Sleep cycle detection (light/deep sleep)
- Sleep debt calculation
- Bedtime reminders
- Sleep environment tracking (temperature, etc.)
- Integration with CALMSTR for bedtime breathing

---

## II. Technical Architecture Options

### A. Sleep Detection Strategy

**Option 1: Manual Logging (MVP)**
- User manually logs sleep/wake times
- Simple, reliable, immediate implementation
- Requires user discipline but works consistently

**Option 2: Automatic Detection**
- Use accelerometer + heart rate to detect sleep
- More complex but hands-off user experience
- May have accuracy issues, battery drain

**Option 3: Hybrid Approach**
- Manual sleep time, automatic wake detection
- Best of both worlds for MVP
- User sets sleep time, watch detects wake-up movement

### B. Data Storage Strategy

**Sleep Session Data Structure:**
```json
{
  "sessionId": "timestamp",
  "bedTime": 1704067200000,
  "sleepTime": 1704067800000,
  "wakeTime": 1704096000000,
  "duration": 28200000,
  "quality": 4,
  "movements": 15,
  "alarmUsed": true,
  "device": "HealthNote Watch SLEEPSTR"
}
```

### C. Alarm System Architecture

**Alarm Data Structure:**
```json
{
  "alarmId": 1,
  "time": "07:00",
  "enabled": true,
  "smartWake": true,
  "windowMinutes": 30,
  "days": ["mon", "tue", "wed", "thu", "fri"],
  "label": "Work"
}
```

---

## III. User Experience Design

### A. Main Interface Options

**Option 1: Status Dashboard**
```
┌─────────────────┐
│   SLEEPSTR      │
│                 │
│ Last: 7h 32m    │
│ Quality: ★★★★☆  │
│ Alarm: 07:00    │
│                 │
│ [SLEEP] [WAKE]  │
└─────────────────┘
```

**Option 2: Quick Actions (RUNSTR Style)**
```
┌─────────────────┐
│   SLEEPSTR      │
│                 │
│ Tonight: 22:30  │
│ Wake: 07:00     │
│                 │
│ [START SLEEP]   │
└─────────────────┘
```

**Option 3: Time-Based Context**
```
┌─────────────────┐
│   SLEEPSTR      │
│ 22:45 - Evening │
│                 │
│ Ready for bed?  │
│ Target: 8 hours │
│                 │
│ [LOG BEDTIME]   │
└─────────────────┘
```

### B. Sleep Quality Input Options

**Option 1: Star Rating (1-5)**
- Visual stars, easy to understand
- Quick tap interface
- Universally recognized

**Option 2: Sleep Quality Descriptors**
- "Terrible", "Poor", "OK", "Good", "Great"
- More descriptive than numbers
- May require more screen space

**Option 3: Simple Binary**
- "Good Sleep" vs "Poor Sleep"
- Fastest input method
- Less granular data

---

## IV. Smart Alarm Implementation

### A. Smart Wake Algorithm

**Basic Algorithm:**
```javascript
function shouldWakeUser(targetTime, windowMinutes) {
  const now = new Date();
  const window = windowMinutes * 60 * 1000;
  const earliestWake = targetTime - window;
  
  if (now >= earliestWake && now <= targetTime) {
    // Check if user is in light sleep (movement detected)
    if (recentMovementDetected()) {
      return true; // Wake up now
    }
  }
  
  if (now >= targetTime) {
    return true; // Time's up, wake anyway
  }
  
  return false;
}
```

### B. Movement Detection

**Accelerometer Monitoring:**
```javascript
// Monitor accelerometer during sleep
// Detect movement patterns
// Distinguish between sleep movements and wake movements
// Battery optimization considerations
```

---

## V. Integration with HealthNote Ecosystem

### A. Cross-App Data Sharing

**RUNSTR Integration:**
- Exercise affects sleep quality
- Sleep affects next day's performance
- Recovery time correlation

**CALMSTR Integration:**
- Bedtime breathing sessions
- Sleep meditation programs
- Stress/sleep correlation

### B. BLE Sync Data

**Sleep Data for Nostr (NIP-101h):**
```json
{
  "kind": 1352,
  "content": "Sleep session data",
  "tags": [
    ["duration", "28200"],
    ["quality", "4"],
    ["sleep_time", "1704067800"],
    ["wake_time", "1704096000"]
  ]
}
```

---

## VI. Implementation Strategy

### A. Development Phases

**Phase 1: Basic Sleep Logging (Week 1)**
- [ ] Manual sleep/wake time buttons
- [ ] Sleep duration calculation
- [ ] Basic UI following RUNSTR/CALMSTR pattern
- [ ] Simple data storage

**Phase 2: Sleep Quality & Analytics (Week 2)**
- [ ] Sleep quality rating system
- [ ] Weekly/monthly sleep trends
- [ ] Sleep data visualization
- [ ] BLE sync implementation

**Phase 3: Alarm Clock Functionality (Week 3)**
- [ ] Basic vibration alarm
- [ ] Alarm setting interface
- [ ] Snooze functionality
- [ ] Multiple alarm support

**Phase 4: Smart Features (Week 4)**
- [ ] Smart wake-up algorithm
- [ ] Movement detection during sleep
- [ ] Sleep cycle analysis
- [ ] Integration with other HealthNote apps

### B. Code Architecture Plan

**Following RUNSTR/CALMSTR patterns:**
```javascript
// Core variables
let sleeping = false;
let sleepData = {bedTime: null, sleepTime: null, wakeTime: null, quality: 0};
let alarms = [];
let currentAlarm = null;

// BLE Service (continuing UUID sequence)
const SLEEPSTR_SERVICE_UUID = "00000005-7275-6E73-7472-5F69645F3031";
const SLEEPSTR_DATA_CHAR_UUID = "00000006-7275-6E73-7472-5F69645F3031";

// Main functions
function startSleep() { }
function endSleep() { }
function setAlarm(time, options) { }
function checkAlarms() { }
function rateSleeep(quality) { }
function setupBLE() { }
function drawScreen() { }
```

---

## VII. Key Decision Points & Questions

### **A. Feature Priority Questions:**

1. **Sleep tracking approach for MVP?**
   - Manual logging (simple, reliable)
   - Automatic detection (complex, may be inaccurate)
   - Hybrid approach (manual sleep, auto wake)

2. **Alarm functionality scope?**
   - Basic vibration alarm only
   - Smart wake-up during light sleep
   - Multiple alarms with different settings

3. **Sleep quality input method?**
   - 1-5 star rating (intuitive)
   - Descriptive words (more detailed)
   - Simple good/bad binary (fastest)

### **B. Technical Implementation Questions:**

4. **Movement detection strategy?**
   - Use accelerometer data during sleep
   - Simple movement counting
   - More complex sleep stage detection

5. **Alarm storage and management?**
   - Single alarm only (MVP)
   - Multiple alarms with scheduling
   - Recurring alarm patterns

6. **Battery optimization?**
   - How often to check movement during sleep
   - Balance between accuracy and battery life
   - Sleep mode optimizations

### **C. User Experience Questions:**

7. **Main interface style?**
   - Status dashboard with current sleep info
   - Quick-action buttons like RUNSTR/CALMSTR
   - Context-aware based on time of day

8. **Sleep tracking workflow?**
   - Single "Sleep" button that toggles
   - Separate "Bedtime" and "Sleep" buttons
   - Automatic bedtime detection

---

## VIII. Success Metrics

### **Development Success:**
- [ ] Reliable sleep/wake logging
- [ ] Accurate sleep duration calculation
- [ ] Functional alarm system with vibration
- [ ] BLE sync integration
- [ ] Smooth integration with HealthNote Launcher

### **User Experience Success:**
- [ ] Easy bedtime/wake logging workflow
- [ ] Helpful sleep insights and trends
- [ ] Reliable alarm functionality
- [ ] Battery life doesn't suffer significantly
- [ ] Data syncs properly for health tracking

---

## IX. Questions for You:

### **Immediate Decisions Needed:**

1. **Sleep tracking approach:** Manual logging, automatic detection, or hybrid?

2. **Main interface style:** Status dashboard, quick-action buttons, or time-based context?

3. **Alarm scope for MVP:** Basic vibration only, or include smart wake features?

4. **Sleep quality rating:** 1-5 stars, descriptive words, or simple good/bad?

5. **Movement detection:** Include accelerometer monitoring or keep it simple?

### **Integration Preferences:**

6. **Cross-app features:** Should SLEEPSTR integrate with CALMSTR for bedtime breathing?

7. **Data sharing:** How detailed should sleep data be for Nostr sync?

8. **Alarm management:** Single alarm for MVP or multiple alarm support?

---

## X. Recommended MVP Approach

Based on RUNSTR/CALMSTR success patterns, I recommend:

### **Week 1 - Core Sleep Tracking:**
- **Manual sleep/wake logging** (reliable, simple)
- **Quick-action interface** (proven successful)
- **1-5 star quality rating** (intuitive, visual)
- **Basic sleep duration and trends**

### **Week 2 - Alarm Functionality:**
- **Single vibration alarm** with time setting
- **Snooze functionality**
- **Basic smart wake** (30-minute window)

### **Week 3 - Polish & Integration:**
- **BLE sync for sleep data**
- **Integration with HealthNote ecosystem**
- **Sleep analytics and insights**

**Ready to start building when you give direction on the key decisions!** 😴✨ 