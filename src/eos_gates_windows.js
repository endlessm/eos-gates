
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

function generateEndlessInstallerEntry() {
    let entry = {
        regex: /endless-installer.*.exe/,
        overrideHelpMessage: _("You are already running Endless OS")
    };

    // If we detect the presence of eos-installer.desktop, inform
    // the user on how to actually install Endless OS.
    let desktopInfo = Gio.DesktopAppInfo.new('eos-installer.desktop');
    if (desktopInfo) {
        entry.overrideHelpMessage = _("You are already running Endless OS from live media");
        entry.desktopInfo = desktopInfo,
        entry.replacementInfo = {
            appName: _("Endless OS Installer"),
            description: _("You can install Endless OS by running the Endless OS Installer.")
        }
    }

    return entry;
}

const FLATPAK_APPS = [
    {
        regex: /spotifysetup.*.exe/i,
        appName: _("Spotify"),
        flatpakInfo: { remote: 'eos-apps', id: 'com.spotify.Client' }
    },
    {
        regex: /firefox\s+setup.*.exe/i,
        appName: _("Firefox"),
        flatpakInfo: { remote: 'eos-apps', id: 'org.mozilla.Firefox' }
    },
    {
        regex: /chrome.*.exe/i,
        appName: _("Google Chrome "),
        flatpakInfo: { remote: 'eos-apps', id: 'com.google.Chrome' }
    },
    {
        regex: /.*skype.*.exe/i,
        appName: _("Skype"),
        flatpakInfo: { remote: 'eos-apps', id: 'com.microsoft.Skype' }
    },
    {
        regex: /dropbox.*.exe/i,
        appName: _("Dropbox"),
        flatpakInfo: { remote: 'eos-apps', id: 'com.dropbox.Client' }
    },
    {
        regex: /steam.*.exe/i,
        appName: _("Steam"),
        flatpakInfo: { remote: 'eos-apps', id: 'com.valvesoftware.Steam' }
    },
    {
        regex: /whatsapp.*.exe/i,
        appName: _("WhatsApp"),
        desktopInfo: Gio.DesktopAppInfo.new("eos-link-whatsapp.desktop")
    },
    {
        regex: /itunes.*.exe/i,
        appName: _("Apple iTunes"),
        flatpakInfo: { remote: 'eos-apps', id: 'com.spotify.Client' },
        replacementInfo: {
            appName: _("Spotify"),
            description: _("Spotify is a streaming music service")
        }
    },
    {
        regex: /vlc.*.exe/i,
        appName: _("VLC"),
        flatpakInfo: { remote: 'eos-apps', id: 'org.videolan.VLC' },
        replacementInfo: {
            appName: _("VLC"),
            description: _("VLC is a media player that can play most media files")
        }
    },
    {
        regex: /k-lite-mega-codec-pack.*.exe/i,
        appName: _("K-Lite Mega Codec Pack"),
        flatpakInfo: { remote: 'eos-apps', id: 'org.videolan.VLC' },
        replacementInfo: {
            appName: _("VLC"),
            description: _("VLC is a media player that can play most media files")
        }
    },
    {
        regex: /.*utorrent.*.exe/i,
        appName: _("uTorrent"),
        flatpakInfo: { remote: 'eos-apps', id: 'com.transmissionbt.Transmission' },
        replacementInfo: {
            appName: _("Transmission"),
            description: _("Transmission is a BitTorrent client, like uTorrent")
        }
    },
    {
        regex: /divx.*.exe/i,
        appName: _("DivX Codecs"),
        flatpakInfo: { remote: 'eos-apps', id: 'org.videolan.VLC' },
        replacementInfo: {
            appName: _("VLC"),
            description: _("VLC is a media player that can play most media files")
        }
    },
    generateEndlessInstallerEntry(),
    {
        regex: /.*\b(avira|norton|malwarebytes|sophos|kaspersky|mcaffe|avg|avast).*.exe/i,
        overrideHelpMessage: _("But do not worry. With Endless OS you are already safe from viruses that only affect Windows")
    },
    {
        regex: /.*\bflash.*player.*.exe/i,
        overrideHelpMessage: _("Adobe Flash is downloaded and installed automatically by your browser on Endless OS. Please visit %s to check whether it has been installed correctly and contact the %s for support if you still have problems").format(EosGates.link(_("the Adobe Flash test page"), "https://www.adobe.com/software/flash/about"), EosGates.link(_("Endless OS Community"), "https://community.endlessos.com"))
    }
    /*,
     * Commented out until we have a GNOME Boxes Flatpak
     * {
     *    regex: /[Ww]indows.*[Ss]etup.*.exe/,
     *    appName: _("Microsoft Windows"),
     *    flatpakInfo: { remote: 'gnome-apps', id: 'org.gnome.Boxes' },
     *    replacementInfo: {
     *        appName: _("GNOME Boxes"),
     *        description: _("GNOME Boxes is a Virtual Machine where you can install Microsoft Windows and run it alongside Endless OS")
     *    }
     * },
     */
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
        replacement: EosGates.findReplacementApp(process.filename, FLATPAK_APPS)
    })).run(null);
}
