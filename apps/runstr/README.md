# RUNSTR - Run Tracking App for Bangle.js

RUNSTR is a GPS-based run tracking app for Bangle.js 2 smartwatches. Track your runs, monitor your pace, distance, and steps, all from your wrist!

## Features

- **GPS Tracking**: Accurate distance measurement using GPS
- **Real-time Statistics**: View time, distance, pace, and steps during your run
- **Run History**: All runs are saved for later viewing
- **Simple Interface**: Easy-to-use touch controls
- **Metric/Imperial Units**: Choose between kilometers or miles

## How to Use

1. **Start a Run**: Tap the green START button to begin tracking
2. **During Your Run**: The display shows:
   - Elapsed time
   - Distance covered
   - Current pace
   - Step count
3. **Stop Running**: Tap the red STOP button when finished
4. **View Summary**: See your run statistics after stopping

## Controls

- **Touch Controls**: Tap buttons on screen to start/stop runs
- **Physical Button**: Press to exit the app and return to the launcher

## Settings

The app saves your preferences in `runstr.json`:
- `units`: "km" or "mi" (default: "km")
- `showPace`: Show pace during run (default: true)
- `vibrate`: Vibrate on start/stop (default: true)

## Data Storage

Run data is saved with timestamps in files named `runstr.run.<timestamp>.json` containing:
- Start time
- Duration
- Distance
- GPS coordinates
- Steps
- Calculated pace

## Future Features

- Sync with RUNSTR phone app
- View run history on watch
- Set run goals
- Audio/vibration alerts for pace/distance milestones
- Heart rate monitoring support
- Nostr integration for sharing runs

## Troubleshooting

- **GPS Not Working**: Make sure you're outdoors with clear sky view
- **Distance Not Updating**: GPS needs a few seconds to get a fix
- **App Crashes**: Try restarting your Bangle.js

## Version History

- **0.01**: Initial release with basic run tracking

## Credits

Created for the Bangle.js platform by the RUNSTR team. 