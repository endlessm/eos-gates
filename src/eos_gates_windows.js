
const Lang = imports.lang;

const Flatpak = imports.gi.Flatpak;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const EosMetrics = imports.gi.EosMetrics;

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
    }
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
    if (process.processName == entry.processName)
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
        spawnUnderWine(this._launchedFile);
    },

    _getMainErrorMessage: function() {
        let escapedDisplayName = GLib.markup_escape_text(this._launchedFile.displayName, -1);
        return _("Sorry, you can't run <b>%s</b> on Endless.").format(escapedDisplayName);
    },
});

const EosGatesWindowsAppInAppStore = new Lang.Class({
    Name: 'EosGatesWindowsAppInAppStore',
    Extends: EosGatesWindows,

    _init: function(launchedFile, compatibleApp) {
        this.parent(launchedFile);
        this._compatibleApp = compatibleApp;
    },

    getHelpMessage: function() {
        return _("However, you can install <b>%s</b> on the Endless App Store").format(this._compatibleApp.appName);
    },

    getActionButton: function() {
        let button = new Gtk.Button({ visible: true,
                                      label: _("Install in App Store")});
        button.connect('clicked', Lang.bind(this, function() {
            EosGates.installAppFromStore(this._compatibleApp.flatpakInfo.remote,
                                         this._compatibleApp.flatpakInfo.id);
            this.quit();
        }));
        return button;
    }
});

const EosGatesWindowsAppAlreadyInstalled = new Lang.Class({
    Name: 'EosGatesWindowsAppAlreadyInstalled',
    Extends: EosGatesWindows,

    _init: function(launchedFile, compatibleApp) {
        this.parent(launchedFile);
        this._compatibleApp = compatibleApp;
    },

    getHelpMessage: function() {
        return _("However, you already have <b>%s</b> installed on this Computer").format(this._compatibleApp.appName);
    },

    getActionButton: function() {
        let button = new Gtk.Button({ visible: true,
                                      label: _("Launch %s").format(this._compatibleApp.appName) });
        button.connect('clicked', Lang.bind(this, function() {
            EosGates.launchFlatpakApp(this._compatibleApp.flatpakInfo.id);
            this.quit();
        }));
        return button;
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
             processName: processName,
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

    recordMetrics(process);

    let whitelist = readWhitelist();
    if (isWhitelisted(process, whitelist)) {
        spawnUnderWine(process);
        return 0;
    }

    let compatibleAppStoreApp = findInArray(FLATPAK_APPS,
                                            a => a.processName.exec(process.processName));

    if (compatibleAppStoreApp) {
        if (EosGates.flatpakAppRef(compatibleAppStoreApp.flatpakInfo.id) != null)
            return (new EosGatesWindowsAppAlreadyInstalled(process, compatibleAppStoreApp)).run(null);

        return (new EosGatesWindowsAppInAppStore(process,
                                                 compatibleAppStoreApp)).run(null);
    }

    return (new EosGatesWindows(process)).run(null);
}
