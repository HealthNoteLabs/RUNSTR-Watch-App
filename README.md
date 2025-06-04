# RUNSTR Watch App (Bangle.js)

This repository contains the source code for the RUNSTR watch application, designed for Bangle.js 2 smartwatches.

This app is intended to be the on-watch component of the larger RUNSTR ecosystem, developed by HealthNote Labs. It allows users to track their runs using GPS, view real-time statistics, and save their run data.

## Project Structure

-   `/apps/runstr/`: Contains the actual Bangle.js application files:
    -   `app.js`: The main application logic.
    -   `metadata.json`: App information for the Bangle.js App Loader.
    -   `settings.js`: Code for the app's settings menu.
    -   `interface.html`: Web Bluetooth interface for downloading run data.
    -   `app-icon.js`: The app's icon.
    -   `README.md`: App-specific documentation for the Bangle.js App Loader.
    -   `ChangeLog`: Version history for the app.

## Features (Version 0.01)

-   GPS-based run tracking (distance, pace).
-   Real-time display of duration, distance, pace, and steps.
-   Saving run data to the watch's storage.
-   Touch-based controls for starting and stopping runs.
-   Configurable units (km/miles), pace display, and vibration alerts.
-   Ability to view and clear saved runs from the settings menu.
-   Data export (GPX and JSON) via Web Bluetooth interface.

## Development

This app is built for the Espruino JavaScript interpreter on Bangle.js devices.

-   **Bangle.js App Loader:** [https://banglejs.com/apps/](https://banglejs.com/apps/)
-   **Espruino Documentation:** [https://www.espruino.com/](https://www.espruino.com/)

## Contribution

This project is part of the HealthNote Labs initiative. For contributions, please refer to HealthNote Labs guidelines or open an issue in this repository.

## Future Vision

-   Integration with the main RUNSTR mobile application.
-   Nostr protocol features for decentralized sharing and community interaction.
-   Enhanced health metrics and user experience.

---

*This README is for the GitHub repository. The app-specific README for the Bangle.js App Loader can be found at `/apps/runstr/README.md`.* 