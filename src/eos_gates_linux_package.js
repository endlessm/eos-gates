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
const Lang = imports.lang;

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const EosMetrics = imports.gi.EosMetrics;

const EosGates = imports.eos_gates;
const Replacements = imports.replacements;

// Happens when a .rpm or .deb is opened. Contains the filename of
// the package.
const LINUX_PACKAGE_OPENED = '0bba3340-52e3-41a2-854f-e6ed36621379';

const EosGatesLinuxPackage = new Lang.Class({
    Name: 'EosGatesLinuxPackage',
    Extends: EosGates.Application,

    APP_ID: 'com.endlessm.Gates.LinuxPackage',

    _getMainErrorMessage: function() {
        let escapedDisplayName = GLib.markup_escape_text(this.attempt.displayName, -1);
        return _("Sorry, you can't install %s on Endless.").format(EosGates.bold(escapedDisplayName));
    }
});

function getPackageFile(argv) {
    let packagePath = argv[0];
    if (!packagePath)
	return null;

    let filename = GLib.path_get_basename(packagePath);

    // TODO: Get a better display name by parsing package
    // information.
    let displayName = filename;

    return { argv: argv,
             path: packagePath,
             filename: filename,
             displayName: displayName };
}

function main(argv) {
    EosGates.setupEnvironment();

    let packageFile = getPackageFile(argv);
    if (!packageFile) {
        log('No argument provided - exiting');
        return 1;
    }

    EosGates.recordMetrics(LINUX_PACKAGE_OPENED,
                           new GLib.Variant('as', packageFile.argv));

    let app = new EosGatesLinuxPackage({
        attempt: packageFile,
        replacement: EosGates.findReplacementApp(packageFile.filename,
                                                 'linux',
                                                 Replacements.definitions())
    });
    return app.run(null);
}
