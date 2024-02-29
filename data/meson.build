desktop_files = [
    'com.endlessm.Gates.LinuxPackage.desktop',
    'com.endlessm.Gates.Windows.desktop',
]

foreach desktop_file : desktop_files
    i18n.merge_file(
        input: configure_file(
            input: desktop_file + '.in.in',
            output: desktop_file + '.in',
            configuration: config,
        ),
        output: desktop_file,
        po_dir: meson.current_source_dir() / '..' / 'po',
        type: 'desktop',
        install: true,
        install_dir: get_option('datadir') / 'applications',
    )
endforeach
