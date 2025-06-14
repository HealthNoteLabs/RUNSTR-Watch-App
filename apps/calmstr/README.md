# CALMSTR - Meditation & Breathing App for Bangle.js

CALMSTR is a meditation and breathing app for Bangle.js 2 smartwatches. Practice mindful breathing with the 4-7-8 technique, featuring visual guides and session tracking.

## Features

- **4-7-8 Breathing**: Guided breathing pattern (4 sec inhale, 7 sec hold, 8 sec exhale)
- **Visual Guide**: Expanding circle animation that follows your breath
- **Session Tracking**: Track completed breathing sessions and cycles
- **Vibration Cues**: Gentle haptic feedback for breath timing
- **BLE Sync**: Sync session data with companion mobile app

## How to Use

1. **Start Session**: Tap the green START button
2. **Follow the Guide**: Watch the expanding circle and text prompts
3. **Breathe Along**: 
   - Inhale as circle expands (4 seconds)
   - Hold as circle stays large (7 seconds) 
   - Exhale as circle shrinks (8 seconds)
4. **Complete Cycles**: Default 4 cycles per session
5. **Track Progress**: View session summary when complete

## Controls

- **Touch Controls**: Tap START to begin, STOP to end early
- **Physical Button**: Press to exit app and return to launcher

## Session Data

Sessions are saved with timestamps in files named `calmstr.session.<timestamp>.json` containing:
- Start time and duration
- Breathing pattern used
- Number of cycles completed
- Completion status

## Benefits of 4-7-8 Breathing

- Reduces anxiety and stress
- Helps with sleep and relaxation
- Activates parasympathetic nervous system
- Can be done anywhere, anytime

## Future Features

- Multiple breathing patterns (box breathing, equal breathing)
- Meditation timers
- Daily reminders and streaks
- Heart rate integration
- Nostr integration for sharing wellness progress

## Troubleshooting

- **App feels slow**: Reduce other running apps for smoother animation
- **Vibration too strong/weak**: Adjust in watch settings
- **Session not saving**: Ensure adequate storage space

## Version History

- **0.01**: Initial release with 4-7-8 breathing pattern

## Credits

Part of the HealthNote Labs ecosystem for privacy-focused health tracking. 