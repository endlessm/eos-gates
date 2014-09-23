
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

function recordMetrics(process) {
    let recorder = EosMetrics.EventRecorder.get_default();
    let data = new GLib.Variant('as', process.argv);
    recorder.record_event(WINDOWS_APP_OPENED, data);
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
        spawnUnderWine(this._process);
    },
});

function getProcess(argv) {
    let processName = argv[0];
    if (!processName)
	return null;

    return { argv: argv,
             processName: GLib.path_get_basename(processName) };
}

function main(argv) {
    EosGates.setupEnvironment();

    let process = getProcess(argv);
    if (!process) {
	log('No argument provided - exiting');
	return 1;
    }

    recordMetrics(process);

    readWhitelist();
    if (isWhitelisted(process)) {
        spawnUnderWine(process);
        return 0;
    } else {
        let app = new EosGatesWindows(process);
        return app.run(null);
    }
}
