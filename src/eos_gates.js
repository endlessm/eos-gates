
const Format = imports.format;
const Gettext = imports.gettext;
const Lang = imports.lang;
const Signals = imports.signals;

const Config = imports.config;
const Flatpak = imports.gi.Flatpak;
const GLib = imports.gi.GLib;
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

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
    Extends: Gtk.Application,

    _init: function(launchedFile) {
        this._launchedFile = launchedFile;

	this.parent({ application_id: this.APP_ID });
    },

    _launchNormally: function() {
        // Do nothing.
    },

    _onKonamiCodeEntered: function() {
        this._launchNormally();
        this.quit();
    },

    _onKeyRelease: function(window, event) {
        return this._konami.keyRelease(event);
    },

    getHelpMessage: function() {
        return _("You can install applications from our <a href='endlessm-app://eos-app-store'>App Store</a>.");
    },

    getActionButton: function() {
        let button = new Gtk.Button({ visible: true,
	                                  label: _("OK") });
        button.connect('clicked', Lang.bind(this, this.quit));
        return button;
    },

    _buildUI: function() {
        this._window = new Gtk.ApplicationWindow({ application: this,
                                                   title: _("%s is unsupported").format(this._launchedFile.displayName),
                                                   skip_taskbar_hint: true,
                                                   resizable: false,
                                                   width_request: 640,
                                                   height_request: 360 });
        this._window.set_position(Gtk.WindowPosition.CENTER);

        this._window.connect('key-release-event', Lang.bind(this, this._onKeyRelease));

        let box = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL,
                                margin: 20,
                                visible: true });

        let errorMessageBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL,
                                            valign: Gtk.Align.CENTER,
                                            vexpand: true,
                                            visible: true,
                                            spacing: 6 });
        let label;

        label = new Gtk.Label({ visible: true,
                                use_markup: true,
                                wrap: true,
                                max_width_chars: 40,
                                halign: Gtk.Align.CENTER,
                                label: this._getMainErrorMessage() });
        label.get_style_context().add_class('unsupported-error');
        errorMessageBox.add(label);

        label = new Gtk.Label({ visible: true,
                                use_markup: true,
                                wrap: true,
                                max_width_chars: 30,
                                label: this.getHelpMessage() });
        label.get_style_context().add_class('unsupported-subtitle');
        label.connect('activate-link', Lang.bind(this, function() {
            this.quit();
            return false;
        }));
        errorMessageBox.add(label);

        box.add(errorMessageBox);
        box.add(this.getActionButton());

        this._window.add(box);
    },

    vfunc_startup: function() {
        this.parent();

        // Load custom CSS
        let resource = Gio.Resource.load(Config.RESOURCE_DIR + '/eos-gates.gresource');
        resource._register();

        let provider = new Gtk.CssProvider();
        provider.load_from_file(Gio.File.new_for_uri('resource:///com/endlessm/gates/eos-gates.css'));
        Gtk.StyleContext.add_provider_for_screen(Gdk.Screen.get_default(), provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);

        this._konami = new KonamiManager();
        this._konami.connect('code-entered', Lang.bind(this, this._onKonamiCodeEntered));

        let action = new Gio.SimpleAction({ name: 'quit' });
        action.connect('activate', Lang.bind(this, this.quit));
        this.add_accelerator('Escape', 'app.quit', null);
        this.add_action(action);

        this._buildUI();
    },

    vfunc_activate: function() {
        this._window.present();
    },
});

function spawnProcess(argv=[]) {
    return Gio.Subprocess.new(argv, Gio.SubprocessFlags.NONE);
}

function getAppStoreAppId(remote, appId) {
    let installation = Flatpak.Installation.new_system(null);
    let flatpakRemote = null;

    let defaultBranch = null;
    try {
        flatpakRemote = installation.get_remote_by_name(remote, null);
    } catch (e) {
        logError(e, 'Could not find flatpak remote %s: %s'.format(remote));
    }

    // Get the default branch now to construct the full unique ID GNOME Software expects.
    if (flatpakRemote) {
        defaultBranch = flatpakRemote.get_default_branch()
        if (defaultBranch)
            return 'system/flatpak/%s/desktop/%s.desktop/%s'.format(remote,
                                                                    appId,
                                                                    defaultBranch);
    }

    return appId;
}

function installAppFromStore(remote, appId) {
    let appStoreId = getAppStoreAppId(remote, appId);
    spawnProcess(['gnome-software', '--details=%s'.format(appStoreId)]);
}

function setupEnvironment() {
    Gettext.bindtextdomain(Config.GETTEXT_PACKAGE, Config.LOCALE_DIR);
    Gettext.textdomain(Config.GETTEXT_PACKAGE);

    window._ = Gettext.gettext;

    String.prototype.format = Format.format;
}
