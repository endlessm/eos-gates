project(
    'eos-gates',
    version: '1.0.0',
    meson_version: '>= 1',
    license: 'GPL-3.0-or-later',
)

gnome = import('gnome')
i18n = import('i18n')

gjs_console = dependency('gjs-1.0').get_variable(pkgconfig: 'gjs_console')

prefix      = get_option('prefix')
bindir      = prefix / get_option('bindir')
localedir   = prefix / get_option('localedir')
pkglibdir   = prefix / get_option('libdir') / meson.project_name()
pkgdatadir  = prefix / get_option('datadir') / meson.project_name()

config = configuration_data({
    'bindir': bindir,
    'localedir': localedir,
    'pkglibdir': pkglibdir,
    'pkgdatadir': pkgdatadir,
    'GJS_CONSOLE': gjs_console,
    'PACKAGE_NAME': meson.project_name(),
    'PACKAGE_VERSION': meson.project_version(),
    'GETTEXT_PACKAGE': meson.project_name(),
})

foreach executable : ['eos-gates-windows', 'eos-gates-linux-package']
    configure_file(
        input: executable + '.in',
        output: executable,
        configuration: config,
        install: true,
        install_dir: bindir,
        install_mode: 'rwxr-xr-x',
    )
endforeach

gnome.compile_resources(
    'eos-gates',
    'eos-gates.gresource.xml',
    gresource_bundle: true,
    install: true,
    install_dir: pkgdatadir,
)

subdir('data')
subdir('po')
subdir('src')
