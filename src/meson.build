install_data(
    'eos_gates.js',
    'eos_gates_linux_package.js',
    'eos_gates_windows.js',
    'replacements.js',
    install_dir: pkgdatadir / 'src',
)

configure_file(
    input: 'config.js.in',
    output: 'config.js',
    configuration: config,
    install: true,
    install_dir: pkgdatadir / 'src',
)
