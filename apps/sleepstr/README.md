# SLEEPSTR - Sleep Tracking & Alarm Clock App for Bangle.js

SLEEPSTR is a comprehensive sleep tracking and alarm clock app for Bangle.js 2 smartwatches. Track your sleep patterns, set smart alarms, and improve your sleep quality with detailed analytics.

## Features

- **Manual Sleep Tracking**: Log bedtime and wake time with simple button presses
- **Sleep Quality Rating**: Rate your sleep quality from 1-5 stars
- **Smart Alarm Clock**: Vibration-based alarm with intelligent wake-up timing
- **Movement Detection**: Track movements during sleep using accelerometer
- **Sleep Analytics**: View sleep duration, quality trends, and patterns
- **BLE Sync**: Sync sleep data with companion mobile app

## How to Use

### Sleep Tracking
1. **Start Sleep**: Tap the green SLEEP button when going to bed
2. **End Sleep**: Tap the red WAKE UP button when you wake up (or let alarm wake you)
3. **Rate Quality**: Use 1-5 stars to rate how well you slept
4. **View Summary**: See sleep duration, quality, and movement data

### Alarm Clock
1. **Set Alarm**: Tap the alarm time display to enter alarm settings
2. **Adjust Time**: Tap left/right of time to decrease/increase hours
3. **Smart Wake**: Toggle smart wake feature for optimal wake timing
4. **Enable/Disable**: Toggle alarm on/off as needed

## Smart Wake Feature

The smart wake algorithm monitors your movement during sleep and can wake you up to 30 minutes before your set alarm time if it detects you're in light sleep (more movement). This helps you wake up feeling more refreshed.

## Controls

- **Touch Controls**: 
  - Main screen: Tap SLEEP/WAKE UP buttons
  - Alarm setting: Tap time to adjust, tap options to toggle
  - Quality rating: Tap stars to rate sleep
- **Physical Button**: Press to exit app and return to launcher

## Sleep Data

Sleep sessions are saved with timestamps in files named `sleepstr.sleep.<timestamp>.json` containing:
- Bed time and wake time
- Sleep duration
- Quality rating (1-5 stars)
- Movement count during sleep
- Alarm usage information

## Benefits of Sleep Tracking

- Identify sleep patterns and trends
- Optimize sleep duration for better health
- Track sleep quality improvements
- Wake up at optimal times with smart alarms
- Correlate sleep with other health metrics

## Alarm Features

- **Vibration Only**: Silent alarm won't disturb others
- **Smart Wake Window**: 30-minute window for optimal wake timing
- **Snooze Function**: 5-minute snooze with vibration reminder
- **Movement Detection**: Uses accelerometer to detect sleep phases

## Future Features

- Multiple alarm support
- Sleep cycle analysis (REM, deep sleep detection)
- Bedtime reminders and sleep scheduling
- Integration with CALMSTR for bedtime breathing exercises
- Advanced sleep analytics and insights
- Heart rate integration for sleep stages

## Troubleshooting

- **Alarm not working**: Check that alarm is enabled in settings
- **Movement not detected**: Ensure watch is worn snugly during sleep
- **Battery drain**: Sleep tracking is optimized but continuous monitoring uses battery
- **Data not syncing**: Ensure BLE is enabled and phone app is connected

## Version History

- **0.01**: Initial release with sleep tracking and alarm functionality

## Credits

Part of the HealthNote Labs ecosystem for comprehensive health and wellness tracking. 