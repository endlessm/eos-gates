
const Lang = imports.lang;

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const EosMetrics = imports.gi.EosMetrics;

const EosGates = imports.eos_gates;

const WHITELISTED_APPS = [
    // This is an unlikely binary name to run into, so just add it
    // in here for testing purposes...
    { processName: "com.endlessm.test-whitelist.exe" },
];

// Happens when a .exe or .msi file is opened. Contains the
// argv that was passed to the application.
const WINDOWS_APP_OPENED = 'cf09194a-3090-4782-ab03-87b2f1515aed';

function recordWindowsAppOpen(process) {
    let args = new GLib.Variant('as', process.argv);
    this._eventRecorder.record_event(WINDOWS_APP_OPENED, args);
}

function spawnUnderWine(process) {
    let argv = ['wine', 'start', '/unix'].concat(process.argv);
    Gio.Subprocess.new(argv, 0);
}

function loadJSON(path) {
    try {
        let [success, contents] = GLib.file_get_contents(path);
        return JSON.parse(contents);
    } catch(e) {
        return null;
    }
}

function readWhitelist() {
    let dataDirs = GLib.get_system_data_dirs();
    dataDirs.forEach(function(dataDir) {
        let path = GLib.build_filenamev([dataDir, 'eos-gates', 'whitelist.json']);
        let data = loadJSON(path);
        if (!data || !data.length)
            return;

        Lang.copyProperties(data, WHITELISTED_APPS);
    });
}

function matchWhitelist(process, entry) {
    if (process.processName == entry.processName)
        return true;

    // TODO: match on PE metadata, like process name,
    // signature, etc.

    return false;
}

function isWhitelisted(process) {
    return WHITELISTED_APPS.some(function(entry) {
        return matchWhitelist(process, entry);
    });
}

const EosGatesWindows = new Lang.Class({
    Name: 'EosGatesWindows',
    Extends: EosGates.Application,

    APP_ID: 'com.endlessm.Gates.Windows',

    _launchNormally: function() {
        spawnUnderWine(this._launchedFile);
    },

    _getMainErrorMessage: function() {
        let escapedDisplayName = GLib.markup_escape_text(this._launchedFile.displayName, -1);
        return _("Sorry, you can't run <b>%s</b> on Endless.").format(escapedDisplayName);
    },

    _init: function() {
        this._eventRecorder = new EosMetrics.EventRecorder();
    },
});

function getProcess(argv) {
    let processPath = argv[0];
    if (!processPath)
	return null;

    let processName = GLib.path_get_basename(processPath);

    // TODO: Get a better display name by parsing PE information
    // or checking our whitelist of apps.
    let displayName = processName;

    return { argv: argv,
             processName: processName,
             displayName: displayName };
}

function main(argv) {
    EosGates.setupEnvironment();

    let process = getProcess(argv);
    if (!process) {
	log('No argument provided - exiting');
	return 1;
    }

    recordWindowsAppOpen(process);

    readWhitelist();
    if (isWhitelisted(process)) {
        spawnUnderWine(process);
        return 0;
    } else {
        let app = new EosGatesWindows(process);
        return app.run(null);
    }
}
