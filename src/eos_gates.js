/* Copyright 2014–2024 Endless OS Foundation LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
const Format = imports.format;
const Gettext = imports.gettext;
const Lang = imports.lang;
const Signals = imports.signals;

imports.gi.versions.Gtk = "3.0";
imports.gi.versions.Gdk = "3.0";

const Config = imports.config;
const EosMetrics = imports.gi.EosMetrics;
const Flatpak = imports.gi.Flatpak;
const GLib = imports.gi.GLib;
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const LAUNCH_APP_CENTER_URI = 'x-eos-gates:launch-app-center';

function recordMetrics(event, data) {
    let recorder = EosMetrics.EventRecorder.get_default();
    recorder.record_event(event, data);
}

function actionButtonProps(props, application) {
    // We check for either no flatpak-info or not already having
    // a replacement, since we need the flatpak info to install the app
    // from the app store. If we already have a replacement, then it is
    // guaranteed that we have some sort of option (either through
    // the flatpak info or the desktop file) to launch an existing
    // application.
    if (!props.replacement || (!props.replacement.flatpakInfo && !props.alreadyHaveReplacement))
        return {
            label: _("OK"),
            action: function() {
                application.quit();
            }
        };

    let appName = !!props.replacement.replacementInfo ?
                  props.replacement.replacementInfo.appName : props.replacement.appName;

    if (props.alreadyHaveReplacement)
        return {
            label: _("Launch %s").format(appName),
            action: function() {
                launchReplacementApp(props.replacement,
                                     props.replacementRef,
                                     props.attempt.argv);
                application.quit();
            }
        };

    return {
        label: _("Install %s").format(appName),
        action: function() {
            installAppFromStore(props.replacement,
                                props.attempt.argv);
            application.quit();
        }
    };
}

function bold(text) {
    return '<b>%s</b>'.format(text);
}

function link(text, href) {
    return '<a href="%s">%s</a>'.format(href, text);
}

var Application = new Lang.Class({
    Name: 'Application',
    Extends: Gtk.Application,

    _init: function(props) {
        this.attempt = props.attempt;
        this.replacement = props.replacement;

        this._replacementRef = null;
        if (this.replacement && this.replacement.flatpakInfo)
            this._replacementRef = flatpakAppRef(this.replacement.flatpakInfo.id);

        this._alreadyHaveReplacement = (this.replacement &&
                                        ((this.replacement.flatpakInfo &&
                                          this._replacementRef) ||
                                         this.replacement.desktopInfo ||
                                         this.replacement.linkInfo));

        this.parent({ application_id: this.APP_ID });
    },

    getHelpMessage: function() {
        if (!this.replacement)
            return _("You can install applications from our %s.").format(link(_("App Center"),
                                                                              LAUNCH_APP_CENTER_URI));

        if (this.replacement.overrideHelpMessage)
            return this.replacement.overrideHelpMessage;

        let isEquivalentApp = !!this.replacement.replacementInfo;
        let appName = !!this.replacement.replacementInfo ?
                      this.replacement.replacementInfo.appName : this.replacement.appName;

        if (this._alreadyHaveReplacement)
            return _("However, you already have %s installed").format(bold(appName));

        return _("However, you can install %s on the Endless App Center").format(bold(appName));
    },

    getExtraInformationMessage: function() {
        if (!this.replacement ||
            !this.replacement.replacementInfo ||
            !this.replacement.replacementInfo.description)
            return null;

        return this.replacement.replacementInfo.description;
    },

    getActionButton: function() {
        let props = actionButtonProps({
            attempt: this.attempt,
            replacement: this.replacement,
            replacementRef: this._replacementRef,
            alreadyHaveReplacement: this._alreadyHaveReplacement
        }, this);
        let button = new Gtk.Button({ visible: true,
                                      label: props.label });
        button.connect('clicked', props.action);
        return button;
    },

    _buildUI: function() {
        this._window = new Gtk.ApplicationWindow({ application: this,
                                                   title: _("%s is unsupported").format(this.attempt.displayName),
                                                   resizable: false,
                                                   width_request: 640,
                                                   height_request: 360 });
        this._window.set_position(Gtk.WindowPosition.CENTER);


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
        label.connect('activate-link', (label, uri) => {
            if (uri !== LAUNCH_APP_CENTER_URI)
                return false;
            const bus = this.get_dbus_connection();
            const parameters = new GLib.Variant('(sava{sv})', ['set-mode', [GLib.Variant.new_string('overview')], {}]);
            bus.call(
                'org.gnome.Software',
                '/org/gnome/Software',
                'org.freedesktop.Application',
                'ActivateAction',
                parameters,
                /* reply_type */ null,
                Gio.DBusCallFlags.NONE,
                /* timeout_msec */ -1,
                /* cancellable */ null,
                /* callback */ null,
            )
            this.quit();
            return true;
        });
        errorMessageBox.add(label);

        let extraInformationMessage = this.getExtraInformationMessage();
        if (extraInformationMessage) {
            label = new Gtk.Label({ visible: true,
                                    use_markup: true,
                                    wrap: true,
                                    max_width_chars: 30,
                                    label: extraInformationMessage });
            errorMessageBox.add(label);
        }

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

        let action = new Gio.SimpleAction({ name: 'quit' });
        action.connect('activate', () => { this.quit() });
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

    try {
        flatpakRemote = installation.get_remote_by_name(remote, null);
    } catch (e) {
        logError(e, 'Could not find flatpak remote %s: %s'.format(remote));
    }

    // Get the default branch now to construct the full unique ID GNOME Software expects.
    if (flatpakRemote) {
        let defaultBranch = flatpakRemote.get_default_branch()
        if (defaultBranch)
            return 'system/flatpak/%s/desktop/%s.desktop/%s'.format(remote,
                                                                    appId,
                                                                    defaultBranch);
    }

    return appId;
}

// Happens when we launch gnome-software for a known flatpak replacement
// of an unsupported binary.
const EVENT_LAUNCHED_INSTALLER_FOR_FLATPAK = 'e98bf6d9-8511-44f9-a1bd-a1d0518934b9';

// Happens when we launch a known flatpak replacement of an unsupported binary
// directly.
const EVENT_LAUNCHED_EXISTING_FLATPAK = '192f39dd-79b3-4497-99fa-9d8aea28760c';

// Happens when we launch gnome-software to install an 'equivalent' app for
// an unsupported binary.
const EVENT_LAUNCHED_EQUIVALENT_INSTALLER_FOR_FLATPAK = '7de69d43-5f6b-4bef-b5f3-a21295b79185';

// Happens when we launch an 'equivalent' app for an unsupported binary directly. 
const EVENT_LAUNCHED_EQUIVALENT_EXISTING_FLATPAK = '00d7bc1e-ec93-4c53-ae78-a6b40450be4a';

function installAppFromStore(replacement, originalPayload) {
    let appStoreId = getAppStoreAppId(replacement.flatpakInfo.remote,
                                      replacement.flatpakInfo.id);
    recordMetrics(replacement.replacementInfo ?
                  EVENT_LAUNCHED_EQUIVALENT_INSTALLER_FOR_FLATPAK :
                  EVENT_LAUNCHED_INSTALLER_FOR_FLATPAK,
                  new GLib.Variant('(sas)', [replacement.flatpakInfo.id, originalPayload]));
    Gio.DBusActionGroup.get(Gio.Application.get_default().get_dbus_connection(),
                            'org.gnome.Software',
                            '/org/gnome/Software')
                       .activate_action('details',
                                        new GLib.Variant('(ss)', [appStoreId, '']));
}

function launchFlatpakRef(ref, replacement) {
    // HACK: this is a workaround for
    // https://github.com/flatpak/flatpak/issues/946. We're going to assume
    // that the desktop ID for this application is the one provided by the
    // flatpak installation
    let desktopId = replacement.flatpakInfo.id + '.desktop';
    let desktopInfo = Gio.DesktopAppInfo.new(desktopId);

    if (!desktopInfo)
        return;

    desktopInfo.launch([], null);
}

function launchFlatpakApp(replacement, replacementRef, originalPayload) {
    try {
        recordMetrics(replacement.replacementInfo ?
                      EVENT_LAUNCHED_EQUIVALENT_EXISTING_FLATPAK :
                      EVENT_LAUNCHED_EXISTING_FLATPAK,
                      new GLib.Variant('(sas)', [replacement.flatpakInfo.id, originalPayload]));
        launchFlatpakRef(replacementRef, replacement);
    } catch (e) {
        logError(e, 'Something went wrong in launching %s'.format(replacement.flatpakInfo.id));
    }
}

function launchDesktopApp(replacement, originalPayload) {
    try {
        recordMetrics(replacement.replacementInfo ?
                      EVENT_LAUNCHED_EQUIVALENT_EXISTING_FLATPAK :
                      EVENT_LAUNCHED_EXISTING_FLATPAK,
                      new GLib.Variant('(sas)', [replacement.desktopInfo.get_id(), originalPayload]));
        replacement.desktopInfo.launch([], null);
    } catch (e) {
        logError(e, 'Something went wrong in launching %s'.format(replacement.desktopInfo.id));
    }
}

function launchLink(replacement, originalPayload) {
    try {
        recordMetrics(replacement.replacementInfo ?
                      EVENT_LAUNCHED_EQUIVALENT_EXISTING_FLATPAK :
                      EVENT_LAUNCHED_EXISTING_FLATPAK,
                      new GLib.Variant('(sas)', [replacement.linkInfo.href, originalPayload]));
        Gio.AppInfo.launch_default_for_uri(replacement.linkInfo.href, null);
    } catch (e) {
        logError(e, 'Something went wrong in launching %s'.format(replacement.linkInfo.href));
    }
}

function launchReplacementApp(replacement, replacementRef, originalPayload) {
    if (replacement.desktopInfo) {
        launchDesktopApp(replacement, originalPayload);
        return;
    }

    if (replacement.linkInfo) {
        launchLink(replacement, originalPayload);
        return;
    }

    // Assuming that we have a replacement flatpak to launch
    launchFlatpakApp(replacement, replacementRef, originalPayload);
}

function flatpakAppRef(appId) {
    try {
        return Flatpak.Installation.new_user(null).get_current_installed_app(appId, null);
    } catch (e) {
        try {
            return Flatpak.Installation.new_system(null).get_current_installed_app(appId, null);
        } catch (e) {
            // Could not get ref, app is probably not installed
            return null;
        }
    }
}

function findInArray(array, test) {
    for (let i = 0; i < array.length; ++i)
        if (test(array[i]))
            return array[i];

    return null;
}

function findReplacementApp(filename, platform, replacements) {
    return findInArray(replacements, a => a.regex[platform] && a.regex[platform].exec(filename));
}

function setupEnvironment() {
    Gettext.bindtextdomain(Config.GETTEXT_PACKAGE, Config.LOCALE_DIR);
    Gettext.textdomain(Config.GETTEXT_PACKAGE);

    window._ = Gettext.gettext;

    String.prototype.format = Format.format;
}
