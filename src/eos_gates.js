
const Format = imports.format;
const Gettext = imports.gettext;
const Lang = imports.lang;
const Signals = imports.signals;

const Config = imports.config;
const EosMetrics = imports.gi.EosMetrics;
const GLib = imports.gi.GLib;
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

// Happens when a .exe or .msi file is opened. Contains the
// argv that was passed to the application.
const WINDOWS_APP_OPENED = 'cf09194a-3090-4782-ab03-87b2f1515aed';

const WHITELISTED_APPS = [
    // This is an unlikely binary name to run into, so just add it
    // in here for testing purposes...
    { processName: "com.endlessm.test-whitelist.exe" },
];

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

function spawnUnderWine(process) {
    let argv = ['wine', 'start'].concat(process.argv);
    Gio.Subprocess.new(argv, 0);
}

const KONAMI_CODE = '111 111 116 116 113 114 113 114 56 38';
const KonamiManager = new Lang.Class({
    Name: 'KonamiManager',

    _init: function() {
        this.reset();
    },

    reset: function() {
        this._combo = '';
    },

    keyRelease: function(event) {
        let [success, keycode] = event.get_keycode();
        this._combo += ' ' + keycode;

        // Trim the string to make sure it doesn't get out of hand.
        this._combo = this._combo.slice(-KONAMI_CODE.length);

        if (this._combo == KONAMI_CODE) {
            this.emit('code-entered');
            this.reset();
            return true;
        } else {
            return false;
        }
    },
});
Signals.addSignalMethods(KonamiManager.prototype);

const Application = new Lang.Class({
    Name: 'Application',

    _init: function(process) {
        this._process = process;

        this.application = new Gtk.Application({
            application_id: 'com.endlessm.Gates',
        });

        this.application.connect('startup', Lang.bind(this, this._onStartup));
        this.application.connect('activate', Lang.bind(this, this._onActivate));
    },

    _spawnWine: function() {
        spawnUnderWine(this._process);
        this.application.quit();
    },

    _onKonamiCodeEntered: function() {
        this._spawnWine();
    },

    _onKeyRelease: function(window, event) {
        return this._konami.keyRelease(event);
    },

    _onOKClicked: function() {
        this.application.quit();
    },

    _buildUI: function() {
        // TODO: Get a better display name by parsing PE information
        // or checking our whitelist of apps.
        let processDisplayName = this._process.processName;

        this._window = new Gtk.ApplicationWindow({ application: this.application,
                                                   title: _("%s is unsupported").format(processDisplayName),
                                                   skip_taskbar_hint: true,
                                                   resizable: false,
                                                   width_request: 640,
                                                   height_request: 360 });
        this._window.set_position(Gtk.WindowPosition.CENTER);

        this._window.connect('key-release-event', Lang.bind(this, this._onKeyRelease));

        let box = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL,
                                margin: 20,
                                visible: true });

        let escapedProcessName = GLib.markup_escape_text(processDisplayName, -1);

        let errorMessageBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL,
                                            valign: Gtk.Align.CENTER,
                                            vexpand: true,
                                            visible: true });
        let label;

        label = new Gtk.Label({ visible: true,
                                use_markup: true,
                                label: Format.vprintf(_("Sorry, you can't run <b>%s</b> on Endless yet."), [escapedProcessName]) });
        label.get_style_context().add_class('unsupported-error');
        errorMessageBox.add(label);

        label = new Gtk.Label({ visible: true,
                                label: _("We're working on it, though!") });
        label.get_style_context().add_class('unsupported-subtitle');
        errorMessageBox.add(label);

        box.add(errorMessageBox);

        let button = new Gtk.Button({ visible: true,
                                      label: _("OK") });
        button.connect('clicked', Lang.bind(this, this._onOKClicked));
        box.add(button);

        this._window.add(box);
    },

    _onStartup: function() {
        // Load custom CSS
        let resource = Gio.Resource.load(Config.RESOURCE_DIR + '/eos-gates.gresource');
        resource._register();

        let provider = new Gtk.CssProvider();
        provider.load_from_file(Gio.File.new_for_uri('resource:///com/endlessm/gates/eos-gates.css'));
        Gtk.StyleContext.add_provider_for_screen(Gdk.Screen.get_default(), provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);

        this._konami = new KonamiManager();
        this._konami.connect('code-entered', Lang.bind(this, this._onKonamiCodeEntered));

        this._buildUI();
    },

    _onActivate: function() {
        this._window.present();
    },
});

function getProcess(argv) {
    let processName = argv[0];
    return { argv: argv,
             processName: processName };
}

function recordMetrics(process) {
    let recorder = EosMetrics.EventRecorder.get_default();
    let data = new GLib.Variant('as', process.argv);
    recorder.record_event(WINDOWS_APP_OPENED, data);
}

function setupEnvironment() {
    Gettext.bindtextdomain(Config.GETTEXT_PACKAGE, Config.LOCALE_DIR);
    Gettext.textdomain(Config.GETTEXT_PACKAGE);

    window._ = Gettext.gettext;

    String.prototype.format = Format.format;
}

function main(argv) {
    setupEnvironment();

    let process = getProcess(argv);

    recordMetrics(process);

    readWhitelist();
    if (isWhitelisted(process)) {
        spawnUnderWine(process);
        return 0;
    } else {
        let app = new Application(process);
        return app.application.run(null);
    }
}
