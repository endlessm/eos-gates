
const Lang = imports.lang;

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const EosGates = imports.eos_gates;
const Replacements = imports.replacements;

const WHITELISTED_APPS = [
    // This is an unlikely binary name to run into, so just add it
    // in here for testing purposes...
    { processName: "com.endlessm.test-whitelist.exe" },
];

// Happens when a .exe or .msi file is opened. Contains the
// argv that was passed to the application.
const WINDOWS_APP_OPENED = 'cf09194a-3090-4782-ab03-87b2f1515aed';

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
    for (let dataDir of GLib.get_system_data_dirs()) {
        let path = GLib.build_filenamev([dataDir, 'eos-gates', 'whitelist.json']);
        let data = loadJSON(path);
        if (!data || !data.length)
            continue;

        return data;
    }

    return [];
}

function matchWhitelist(process, entry) {
    if (process.filename == entry.processName)
        return true;

    // TODO: match on PE metadata, like process name,
    // signature, etc.

    return false;
}

function isWhitelisted(process, whitelist) {
    return whitelist.some(function(entry) {
        return matchWhitelist(process, entry);
    });
}

const EosGatesWindows = new Lang.Class({
    Name: 'EosGatesWindows',
    Extends: EosGates.Application,

    APP_ID: 'com.endlessm.Gates.Windows',

    _launchNormally: function() {
        spawnUnderWine(this.attempt);
    },

    _getMainErrorMessage: function() {
        let escapedDisplayName = GLib.markup_escape_text(this.attempt.displayName, -1);
        return _("Sorry, you can't run %s on Endless.").format(EosGates.bold(escapedDisplayName));
    }
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
             path: processPath,
             filename: processName,
             displayName: displayName };
}

function main(argv) {
    EosGates.setupEnvironment();
    let process = getProcess(argv);
    if (!process) {
        log('No argument provided - exiting');
        return 1;
    }

    EosGates.recordMetrics(WINDOWS_APP_OPENED,
                           new GLib.Variant('as', process.argv));

    let whitelist = readWhitelist();
    if (isWhitelisted(process, whitelist)) {
        spawnUnderWine(process);
        return 0;
    }

    return (new EosGatesWindows({
        attempt: process,
        replacement: EosGates.findReplacementApp(process.filename,
                                                 'windows',
                                                 Replacements.definitions())
    })).run(null);
}
