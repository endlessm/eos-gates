
const Lang = imports.lang;

const Flatpak = imports.gi.Flatpak;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const EosGates = imports.eos_gates;
EosGates.setupEnvironment();

const WHITELISTED_APPS = [
    // This is an unlikely binary name to run into, so just add it
    // in here for testing purposes...
    { processName: "com.endlessm.test-whitelist.exe" },
];

const FLATPAK_APPS = [
    {
        processName: /[Ss]potify[Ss]etup.*.exe/,
        appName: _('Spotify'),
        flatpakInfo: { remote: 'eos-apps', id: 'com.spotify.Client' }
    },
    {
        processName: /[Ff]irefox\s+[Ss]etup.*.exe/,
        appName: _('Firefox'),
        flatpakInfo: { remote: 'eos-apps', id: 'org.mozilla.Firefox' }
    },
    {
        processName: /iTunes.*.exe/,
        appName: _('Apple iTunes'),
        flatpakInfo: { remote: 'eos-apps', id: 'com.spotify.Client' },
        replacementInfo: {
            appName: _('Spotify'),
            description: _('a streaming music service')
        }
    }
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
    let dataDirs = GLib.get_system_data_dirs();
    return dataDirs.map((dataDir) => {
        let path = GLib.build_filenamev([dataDir, 'eos-gates', 'whitelist.json']);
        let data = loadJSON(path);
        if (!data || !data.length)
            return [];

	return data;
    }).reduce((whitelist, incoming) =>
        whitelist.concat(incoming),
        []
    ).concat(WHITELISTED_APPS);
}

function matchWhitelist(process, entry) {
    if (process.filename == entry.processName)
        return true;

    // TODO: match on PE metadata, like process name,
    // signature, etc.

    return false;
}

function isWhitelisted(process, whitelist) {
    return WHITELISTED_APPS.some(function(entry) {
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
        return _("Sorry, you can't run <b>%s</b> on Endless.").format(escapedDisplayName);
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
             path: processPath,
             filename: processName,
             displayName: displayName };
}

function findInArray(array, test) {
    for (let i = 0; i < array.length; ++i)
        if (test(array[i]))
            return array[i];

    return null;
}

function main(argv) {
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

    let compatibleAppStoreApp = findInArray(FLATPAK_APPS,
                                            a => a.processName.exec(process.filename));

    return (new EosGatesWindows({
        attempt: process,
        replacement: findInArray(FLATPAK_APPS,
                                 a => a.processName.exec(process.filename))
    })).run(null);
}
