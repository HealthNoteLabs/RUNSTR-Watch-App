# RUNSTR Bangle.js, Mobile App, and Nostr Integration Brainstorm

## I. Core User Flow & System Architecture

This document outlines ideas for integrating the RUNSTR Bangle.js watch app with a companion mobile application and the Nostr network, focusing on NIP-101e (workout records) and NIP-101h (health metrics), along with proposed community fitness NIPs.

**Overall Flow:**

1.  **Data Capture (Bangle.js Watch):** Tracks runs (GPS, duration, steps, etc.).
2.  **Data Sync (Watch to Phone):** Transfers run data to the companion mobile app via Bluetooth.
3.  **Nostr Interaction (Mobile App):** Mobile app processes data, creates Nostr events, manages identity, and publishes to relays.
4.  **Data Consumption (Nostr Clients):** Users view their data on the RUNSTR mobile app or other Nostr clients.

## II. Bangle.js Watch App Responsibilities

*   **Primary Function:**
    *   Track runs: GPS coordinates, timestamps, duration, distance (calculated), step count.
    *   Store run data locally on the watch until synced.
    *   Manage multiple runs if storage allows.
*   **Data Formatting for Sync:**
    *   **Option 1 (Basic):** Send raw data fields (e.g., array of GPS points, start/end times, total steps).
    *   **Option 2 (Preferred):** Structure the collected data into a JSON object that closely mirrors the content and relevant tags of a `Kind 1301` (NIP-101e) event. This simplifies processing on the phone.
        *   Example: `{ "type": "run", "start_time": 167... , "duration_ms": 3600000, "distance_m": 5000, "steps": 5000, "gps_polyline": "encoded_polyline_data", "device": "Bangle.js RUNSTR" }`
*   **User Interface (Watch):**
    *   Start/Stop/Pause run.
    *   Display current run metrics.
    *   Indicate unsynced runs.
    *   Manual "Sync to Phone" option (triggers Bluetooth transfer).
*   **Nostr Capabilities (Considerations):**
    *   **Direct Posting to Relays:** No (Bangle.js 2 lacks WiFi).
    *   **Key Generation:** Yes, can generate Nostr keypairs.
    *   **Signing Events:** Yes, if it holds a private key.

## III. Mobile Companion App Responsibilities

*   **Watch Communication:**
    *   Manage Bluetooth connection to Bangle.js.
    *   Receive run data (raw or structured JSON) from the watch.
    *   Acknowledge successful sync to the watch (allowing watch to potentially clear synced data).
*   **Nostr Event Management:**
    *   Transform watch data into complete `Kind 1301` Nostr events.
    *   Handle event creation: `id`, `created_at`, `tags` (including client info, accuracy, etc.).
    *   Manage Nostr identities and signing (see Section IV).
    *   Implement privacy options (Public, Private via NIP-44 encryption).
    *   Publish events to user-configured Nostr relays.
    *   Handle potential publish errors (retry queues).
*   **Nostr Data Consumption:**
    *   Fetch, display, and manage user's `Kind 1301` and other NIP-101h data from relays (as per "Modular Health NIPs" document - "Nostr Stats Page").
    *   Allow re-publishing, export to Blossom.
*   **Community Fitness NIPs (Kinds 33401-33405) Integration:**
    *   **Discovery & Management:** Users browse, join, create Challenges (33403), Teams (33404), Events (33405) via the mobile app.
    *   **Linking:** When publishing a `Kind 1301` from a watch run, the mobile app allows the user to link it to active Challenges, Teams, or Events by adding the appropriate `["challenge", ...]`, `["team", ...]`, or `["event", ...]` tags.
    *   Workout templates (33401) and plans (33402) could be managed and potentially synced to the watch for guided workouts in a future iteration.

## IV. Nostr Identity & Signing Models

**Model A: Phone-Centric Identity (Easiest to Implement)**

*   **Watch:** Sends run data (preferably structured JSON) to the phone. Does NOT manage any Nostr keys or perform signing.
*   **Phone App:**
    1.  Uses the user's primary Nostr identity (e.g., from NIP-07 extension, imported nsec) to sign and publish the `Kind 1301` event.
    2.  Alternatively, the phone app could generate and manage a new, anonymous "Watch Data Identity" (npub/nsec pair stored on the phone) if the user prefers not to use their primary identity for all raw watch posts. The user could then "boost" or reference these posts from their primary identity.
*   **Pros:** Simplest for Bangle.js development. Keeps private keys off the watch, enhancing security.
*   **Cons:** Run data is not cryptographically signed *by the watch itself*. Its origin is asserted by the phone app.

**Model B: Watch with Delegated Identity (NIP-26 - Advanced)**

*   **Setup Phase:**
    1.  **Watch:** Generates and stores its own stable Nostr keypair (`watch_npub`/`watch_nsec`). This is the "watch's identity."
    2.  **Phone App:** The user logs in with their primary Nostr identity (`user_npub`). The phone app facilitates the creation of a NIP-26 delegation tag, where `user_npub` authorizes `watch_npub` to publish specific kinds (e.g., `1301`) on its behalf. This delegation tag is sent to and stored on the watch.
*   **Runtime (Watch):**
    1.  Collects run data.
    2.  Constructs a complete `Kind 1301` Nostr event. The `pubkey` field is `watch_npub`. The NIP-26 delegation tag (referencing `user_npub` as the delegator) is included in the `tags` array.
    3.  Signs the event using `watch_nsec`.
*   **Runtime (Phone App):**
    1.  Receives the fully formed, signed Nostr event from the watch.
    2.  (Optional but recommended) Verifies the event's signature against `watch_npub`.
    3.  Publishes the event to Nostr relays. Clients will see the event is from `watch_npub` but authorized by `user_npub`.
*   **Pros:** Cryptographically proves data origin from the watch. Aligns with advanced Nostr identity and delegation standards (as referenced in HealthNote OS guide). Allows the watch to be a distinct, authorized entity.
*   **Cons:** More complex for Bangle.js development (key management, full event creation, signing). Security of `watch_nsec` on the watch needs careful consideration.

## V. Data Privacy & Encryption

*   Mobile app handles privacy settings (Public post, Private post).
*   For "Private" posts, the mobile app encrypts the event `content` using NIP-44 before publishing, likely with the user's primary key or a shared key with intended recipients.
*   The "Modular Health NIPs" document idea of "Default publish mode: Public / Private / Ask Each Time" should be implemented in the mobile app.

## VI. Open Questions & Future Considerations

*   **Watch Storage Management:** How does the watch manage its local storage if the phone is unavailable for syncing for extended periods? (Overwrite oldest? Warn user?)
*   **Bluetooth Sync Robustness:** Handling interruptions, ensuring data integrity during transfer.
*   **Battery Impact (Watch):** On-watch signing and more complex data handling might have a higher battery cost.
*   **Direct Watch-to-Nostr (Highly Advanced/Unlikely for Bangle.js 2):** Could the watch ever use an intermediary BT device (not a phone) or a future Bangle version with WiFi for more direct posting?
*   **NIP-101h Health Metrics:** Beyond runs (NIP-101e), how will other metrics like heart rate, daily steps (NIP-101h Kinds 1351-1357) be collected by the watch and integrated/published via the phone app? The same identity models would apply.

## VII. Summary of User's Initial Ideas & Integration

*   **Track Run/Sync Run data to phone (Phone posts to nostr, then deletes from local storage):** This is the core of the recommended flow. Deletion policy needs care (confirm publication before deleting).
*   **Spin up a fresh anonymous npub for the watch user, use some sort of delegated signing method:** Model B (NIP-26) directly addresses this. The "anonymous npub for the watch" is `watch_npub`, and NIP-26 is the delegation.
*   **Optimize the watch for anonymity but enable the user to send data to runstr or npub.health to add to the data set on their primary nostr account:**
    *   Anonymity via `watch_npub` (if not widely associated with user) + NIP-26.
    *   The phone app, using the primary Nostr account, can "boost" (Kind 6), reference, or create aggregate posts that include data from the watch's NIP-26 authorized events.
    *   "npub.health" or "runstr" (as a service/relay): The mobile app can be configured to publish to specific relays, including these if they exist.

This document provides a foundation. The recommended approach is to start with **Model A (Phone-Centric Identity)** for initial development due to its simplicity and then potentially evolve to **Model B (NIP-26 Delegation)** for more advanced Nostr-native features.

## VIII. MVP Implementation Plan: Phone-Centric Data Sync (Watch to Mobile for Kind 1301)

This plan focuses on the MVP requirements for transferring run data from the Bangle.js RUNSTR app to the companion mobile app, which will then handle Nostr event creation and publication (as per Model A).

**A. Bangle.js RUNSTR App Tasks:**

1.  **Data Collection for Kind 1301:**
    *   Ensure all necessary data points for a basic Kind 1301 run event are collected and accessible. Based on current `app.js` and Kind 1301 needs:
        *   `startTime` (Unix timestamp, milliseconds)
        *   `duration` (milliseconds)
        *   `distance` (meters)
        *   `steps` (count for the run)
        *   `gpsCoords` (array of objects: `{lat, lon, alt, speed, time}`. `time` is epoch ms.)
        *   `device` (Static string: "Bangle.js RUNSTR App")
        *   `client_name` (Static string: "RUNSTR Bangle.js") // To be added by phone app
        *   `client_version` (App version) // To be added by phone app

2.  **JSON Payload Structure for Sync:**
    *   Define a clear JSON structure for sending the run data. Example:
        ```json
        {
          "startTime": 1678886400000,
          "duration": 1800000, // 30 minutes in ms
          "distance": 5000,   // 5km in meters
          "steps": 4500,
          "gpsCoordinates": [ // Array of coordinate objects
            {"lat": 40.7128, "lon": -74.0060, "alt": 10, "speed": 2.5, "time": 1678886405000},
            // ... more points
          ],
          "device": "Bangle.js RUNSTR App"
        }
        ```
    *   The mobile app will be responsible for any further transformations (e.g., encoding `gpsCoordinates` into a polyline for the Kind 1301 `content` or `gps_polyline` tag).

3.  **Bluetooth Low Energy (BLE) Service & Characteristic:**
    *   **Define GATT Service:**
        *   Create a unique UUID for a "RUNSTR Sync Service".
    *   **Define GATT Characteristic:**
        *   Within this service, create a unique UUID for a "Run Data Characteristic".
        *   This characteristic will be readable by the connected mobile app.
        *   Its value will be the JSON string of the run data.
    *   **Implementation:**
        *   When a run is completed and the user initiates sync, the Bangle.js app will update this characteristic with the latest run's JSON data.
        *   The Bangle.js will need to advertise this service when sync is possible/initiated.
        *   Consider how to handle multiple unsynced runs (e.g., send one at a time, or a JSON array of runs if the characteristic value size permits). For MVP, one run at a time is simpler.

4.  **User Interface (UI) for Sync:**
    *   Add a "Sync to Phone" button or menu option within the RUNSTR app. This could appear:
        *   After a run is completed (on the summary screen).
        *   In a list of saved/unsynced runs (if run history view is implemented for MVP).
    *   Tapping this button would:
        *   Prepare the JSON data for the most recent (or selected) unsynced run.
        *   Update the BLE characteristic value.
        *   Potentially trigger BLE advertising if not already active.
        *   Provide user feedback (e.g., "Ready to Sync", "Syncing...", "Sync Complete" - though "Sync Complete" would require acknowledgment from the phone).

**B. Mobile Companion App Tasks (for receiving data):**

1.  **BLE Communication:**
    *   **Scan for Devices:** Scan for Bangle.js devices advertising the "RUNSTR Sync Service" UUID.
    *   **Connect to Device:** Establish a BLE connection with the selected Bangle.js.
    *   **Discover Services & Characteristics:** Discover the "RUNSTR Sync Service" and the "Run Data Characteristic".
    *   **Read Characteristic:** Read the value of the "Run Data Characteristic" (the JSON string).

2.  **Data Handling:**
    *   **Parse JSON:** Convert the received JSON string into a native data object/structure within the mobile app.
    *   **Validate Data (Optional but Recommended):** Basic checks to ensure the data seems valid.
    *   **Store/Pass for Nostr Publication:** Hand off the parsed run data to the module/service responsible for:
        *   Creating the full Kind 1301 Nostr event (adding `id`, `pubkey`, `created_at`, `sig`, formatting tags like `gps_polyline` if needed from `gpsCoordinates`).
        *   Handling NIP-04/NIP-44 encryption if a private post is intended.
        *   Signing the event with the user's Nostr identity.
        *   Publishing the event to configured relays.

3.  **Sync Acknowledgment (Post-MVP or basic MVP):**
    *   For a robust system, the mobile app should notify the Bangle.js app upon successful receipt (and ideally, successful Nostr publication) of the data. This allows the Bangle.js to mark the run as "synced" and potentially clear it from local storage if policies dictate.
    *   For MVP, this acknowledgment might be simplified or deferred. The watch might just clear the run data locally after attempting to send it.

This plan focuses on the critical path of getting data from the watch to the phone for the MVP. The subsequent steps of Nostr event creation, signing, and publishing on the mobile app are detailed in Sections III and IV of this `Brainstorm.md` document under Model A. 