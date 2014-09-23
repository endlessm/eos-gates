
const Lang = imports.lang;

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const EosMetrics = imports.gi.EosMetrics;

const EosGates = imports.eos_gates;

// Happens when a .rpm or .deb is opened. Contains the filename of
// the package.
const LINUX_PACKAGE_OPENED = '0bba3340-52e3-41a2-854f-e6ed36621379';

function recordMetrics(packageFile) {
    let recorder = EosMetrics.EventRecorder.get_default();
    let data = new GLib.Variant('s', packageFile.packagePath);
    recorder.record_event(LINUX_PACKAGE_OPENED, data);
}

const EosGatesLinuxPackage = new Lang.Class({
    Name: 'EosGatesLinuxPackage',
    Extends: EosGates.Application,

    APP_ID: 'com.endlessm.Gates.LinuxPackage',
});

function getPackageFile(argv) {
    let packagePath = argv[0];
    if (!packagePath)
	return null;

    let filename = GLib.path_get_basename(packagePath);

    // TODO: Get a better display name by parsing package
    // information.
    let displayName = filename;

    return { packagePath: packagePath,
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

    recordMetrics(packageFile);

    let app = new EosGatesLinuxPackage(packageFile);
    return app.run(null);
}
