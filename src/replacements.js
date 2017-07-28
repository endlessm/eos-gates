const Gio = imports.gi.Gio;
const EosGates = imports.eos_gates;

function generateEndlessInstallerEntry() {
    let entry = {
        regex: {
            windows: /endless-installer.*.exe/
        },
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

function definitions() {
    return [
        {
            regex: {
                windows: /spotifysetup.*.exe/i
            },
            appName: _("Spotify"),
            flatpakInfo: { remote: 'eos-apps', id: 'com.spotify.Client' }
        },
        {
            regex: {
                windows: /firefox\s+setup.*.exe/i
            },
            appName: _("Firefox"),
            flatpakInfo: { remote: 'eos-apps', id: 'org.mozilla.Firefox' }
        },
        {
            regex: {
                windows: /chrome.*.exe/i
            },
            appName: _("Google Chrome "),
            flatpakInfo: { remote: 'eos-apps', id: 'com.google.Chrome' }
        },
        {
            regex: {
                 windows: /.*skype.*.exe/i
            },
            appName: _("Skype"),
            flatpakInfo: { remote: 'eos-apps', id: 'com.microsoft.Skype' }
        },
        {
            regex: {
                 windows: /dropbox.*.exe/i
            },
            appName: _("Dropbox"),
            flatpakInfo: { remote: 'eos-apps', id: 'com.dropbox.Client' }
        },
        {
            regex: {
                 windows: /steam.*.exe/i
            },
            appName: _("Steam"),
            flatpakInfo: { remote: 'eos-apps', id: 'com.valvesoftware.Steam' }
        },
        {
            regex: {
                windows: /whatsapp.*.exe/i
            },
            appName: _("WhatsApp"),
            desktopInfo: Gio.DesktopAppInfo.new("eos-link-whatsapp.desktop")
        },
        {
            regex: {
                windows: /itunes.*.exe/i
            },
            appName: _("Apple iTunes"),
            flatpakInfo: { remote: 'eos-apps', id: 'com.spotify.Client' },
            replacementInfo: {
                appName: _("Spotify"),
                description: _("Spotify is a streaming music service")
            }
        },
        {
            regex: {
                windows: /vlc.*.exe/i
            },
            appName: _("VLC"),
            flatpakInfo: { remote: 'eos-apps', id: 'org.videolan.VLC' },
            replacementInfo: {
                appName: _("VLC"),
                description: _("VLC is a media player that can play most media files")
            }
        },
        {
            regex: {
                windows: /k-lite-mega-codec-pack.*.exe/i
            },
            appName: _("K-Lite Mega Codec Pack"),
            flatpakInfo: { remote: 'eos-apps', id: 'org.videolan.VLC' },
            replacementInfo: {
                appName: _("VLC"),
                description: _("VLC is a media player that can play most media files")
            }
        },
        {
            regex: {
                windows: /.*utorrent.*.exe/i
            },
            appName: _("uTorrent"),
            flatpakInfo: { remote: 'eos-apps', id: 'com.transmissionbt.Transmission' },
            replacementInfo: {
                appName: _("Transmission"),
                description: _("Transmission is a BitTorrent client, like uTorrent")
            }
        },
        {
            regex: {
                windows: /divx.*.exe/i
            },
            appName: _("DivX Codecs"),
            flatpakInfo: { remote: 'eos-apps', id: 'org.videolan.VLC' },
            replacementInfo: {
                appName: _("VLC"),
                description: _("VLC is a media player that can play most media files")
            }
        },
        {
            regex: {
                windows: /line.*.exe/i
            },
            appName: _("LINE"),
            linkInfo: { href: 'https://chrome.google.com/webstore/detail/line/menkifleemblimdogmoihpfopnplikde' },
            overrideHelpMessage: _("You can install and use LINE through the Google Chrome Web Store")
        },
        generateEndlessInstallerEntry(),
        {
            regex: {
                windows: /.*\b(avira|norton|malwarebytes|sophos|kaspersky|mcaffe|avg|avast).*.exe/i
            },
            overrideHelpMessage: _("But do not worry. With Endless OS you are already safe from viruses that only affect Windows")
        },
        {
            regex: {
                windows: /.*\bflash.*player.*.exe/i
            },
            overrideHelpMessage: _("Adobe Flash is downloaded and installed automatically by your browser on Endless OS. Please visit %s to check whether it has been installed correctly and contact the %s for support if you still have problems").format(EosGates.link(_("the Adobe Flash test page"), "https://www.adobe.com/software/flash/about"), EosGates.link(_("Endless OS Community"), "https://community.endlessos.com"))
        }
        /*,
         * Commented out until we have a GNOME Boxes Flatpak
         * {
         *    regex: {
         *        windows: /[Ww]indows.*[Ss]etup.*.exe/i
         *    },
         *    appName: _("Microsoft Windows"),
         *    flatpakInfo: { remote: 'gnome-apps', id: 'org.gnome.Boxes' },
         *    replacementInfo: {
         *        appName: _("GNOME Boxes"),
         *        description: _("GNOME Boxes is a Virtual Machine where you can install Microsoft Windows and run it alongside Endless OS")
         *    }
         * },
         */
    ];
}
