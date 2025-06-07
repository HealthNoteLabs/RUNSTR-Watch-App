(function(back) {
  const SETTINGS_FILE = "runstr.json";
  
  // Load settings
  let settings = Object.assign({
    units: "km",
    showPace: true,
    vibrate: true,
    gpsAccuracy: "normal"
  }, require('Storage').readJSON(SETTINGS_FILE, true) || {});

  function save() {
    require('Storage').writeJSON(SETTINGS_FILE, settings);
  }

  // Settings menu
  E.showMenu({
    "": { "title": "RUNSTR Settings" },
    "< Back": () => back(),
    "Units": {
      value: settings.units === "mi" ? 1 : 0,
      min: 0, max: 1,
      format: v => v ? "Miles" : "Kilometers",
      onchange: v => {
        settings.units = v ? "mi" : "km";
        save();
      }
    },
    "Show Pace": {
      value: !!settings.showPace,
      onchange: v => {
        settings.showPace = v;
        save();
      }
    },
    "Vibrate": {
      value: !!settings.vibrate,
      onchange: v => {
        settings.vibrate = v;
        save();
      }
    },
    "GPS Accuracy": {
      value: ["low", "normal", "high"].indexOf(settings.gpsAccuracy),
      min: 0, max: 2,
      format: v => ["Low", "Normal", "High"][v],
      onchange: v => {
        settings.gpsAccuracy = ["low", "normal", "high"][v];
        save();
      }
    },
    "View Runs": () => {
      // Show list of saved runs
      let runs = require("Storage").list(/^runstr\.run\..*\.json$/);
      if (runs.length === 0) {
        E.showMessage("No runs saved yet", "RUNSTR");
        setTimeout(() => E.showMenu(), 2000);
      } else {
        let runMenu = {
          "": { "title": "Saved Runs" },
          "< Back": () => E.showMenu()
        };
        
        // Add each run to menu (show most recent first)
        runs.reverse().forEach((filename, idx) => {
          let runData = require("Storage").readJSON(filename);
          if (runData) {
            let date = new Date(runData.startTime);
            let dateStr = date.getDate() + "/" + (date.getMonth()+1);
            let distance = (settings.units === "mi" ? runData.distance * 0.000621371 : runData.distance / 1000).toFixed(2);
            runMenu["Run " + (idx+1) + " - " + dateStr] = {
              value: distance + (settings.units === "mi" ? " mi" : " km")
            };
          }
        });
        
        E.showMenu(runMenu);
      }
    },
    "Clear All Runs": () => {
      E.showPrompt("Delete all runs?", {
        title: "RUNSTR",
        buttons: {"Yes": true, "No": false}
      }).then((result) => {
        if (result) {
          let runs = require("Storage").list(/^runstr\.run\..*\.json$/);
          runs.forEach(f => require("Storage").erase(f));
          E.showMessage("All runs deleted", "RUNSTR");
          setTimeout(() => E.showMenu(), 1500);
        } else {
          E.showMenu();
        }
      });
    }
  });
}) 