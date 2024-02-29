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
const Gio = imports.gi.Gio;
const EosGates = imports.eos_gates;

function generateEndlessInstallerEntry() {
    let entry = {
        regex: {
            windows: /endless-installer.*.exe/
        },
        overrideHelpMessage: _("You are already running Endless OS")
    };

    // If we detect the presence of com.endlessm.Installer.desktop, inform
    // the user on how to actually install Endless OS.
    let desktopInfo = Gio.DesktopAppInfo.new('com.endlessm.Installer.desktop');
    if (desktopInfo && !desktopInfo.get_nodisplay()) {
        entry.desktopInfo = desktopInfo,
        entry.replacementInfo = {
            appName: _("Reformat with Endless OS"),
            description: _("You can reformat your computer with Endless OS. If you have Windows installed and want to keep it, reboot to Windows and run the Endless Installer under Windows.")
        }
    }

    return entry;
}

function definitions() {
    return [
        {
            regex: {
                windows: /^zoom.*\.exe$/i,
                linux: /^zoom/i
            },
            appName: _("Zoom"),
            flatpakInfo: { remote: 'flathub', id: 'us.zoom.Zoom' }
        },
        {
            regex: {
                windows: /spotifysetup.*.exe/i
            },
            appName: _("Spotify"),
            flatpakInfo: { remote: 'flathub', id: 'com.spotify.Client' }
        },
        {
            regex: {
                windows: /firefox\s+setup.*.exe/i,
                linux: /firefox.*/i
            },
            appName: _("Firefox"),
            flatpakInfo: { remote: 'flathub', id: 'org.mozilla.firefox' }
        },
        {
            regex: {
                windows: /chrome.*.exe/i,
                linux: /google-chrome.*/i
            },
            appName: _("Google Chrome "),
            flatpakInfo: { remote: 'eos-apps', id: 'com.google.Chrome' }
        },
        {
            regex: {
                 windows: /.*skype.*.exe/i,
                 linux: /skype.*/i
            },
            appName: _("Skype"),
            flatpakInfo: { remote: 'flathub', id: 'com.skype.Client' }
        },
        {
            regex: {
                 windows: /dropbox.*.exe/i,
                 linux: /dropbox.*/i
            },
            appName: _("Dropbox"),
            flatpakInfo: { remote: 'flathub', id: 'com.dropbox.Client' }
        },
        {
            regex: {
                 windows: /steam.*.exe/i,
                 linux: /steam.*/i
            },
            appName: _("Steam"),
            flatpakInfo: { remote: 'flathub', id: 'com.valvesoftware.Steam' }
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
            flatpakInfo: { remote: 'flathub', id: 'com.spotify.Client' },
            replacementInfo: {
                appName: _("Spotify"),
                description: _("Spotify is a streaming music service")
            }
        },
        {
            regex: {
                windows: /vlc.*.exe/i,
                linux: /vlc.*/i
            },
            appName: _("VLC"),
            flatpakInfo: { remote: 'flathub', id: 'org.videolan.VLC' },
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
            flatpakInfo: { remote: 'flathub', id: 'org.videolan.VLC' },
            replacementInfo: {
                appName: _("VLC"),
                description: _("VLC is a media player that can play most media files")
            }
        },
        {
            regex: {
                windows: /.*utorrent.*.exe/i
            },
            appName: _("µTorrent"),
            flatpakInfo: { remote: 'flathub', id: 'com.transmissionbt.Transmission' },
            replacementInfo: {
                appName: _("Transmission"),
                description: _("Transmission is a BitTorrent client, like µTorrent")
            }
        },
        {
            regex: {
                windows: /.*utweb_installer.*.exe/i
            },
            appName: _("µTorrent Web"),
            flatpakInfo: { remote: 'flathub', id: 'com.transmissionbt.Transmission' },
            replacementInfo: {
                appName: _("Transmission"),
                description: _("Transmission is a BitTorrent client, like µTorrent Web")
            }
        },
        {
            regex: {
                windows: /divx.*.exe/i
            },
            appName: _("DivX Codecs"),
            flatpakInfo: { remote: 'flathub', id: 'org.videolan.VLC' },
            replacementInfo: {
                appName: _("VLC"),
                description: _("VLC is a media player that can play most media files")
            }
        },
        {
            regex: {
                windows: /(^|\/)line.*.exe/i
            },
            appName: _("LINE"),
            linkInfo: { href: 'https://chrome.google.com/webstore/detail/line/ophjlpahpchlmihnnnihgmmeilfjmjjc' },
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
                windows: /.*\bflash.*player.*.exe/i,
                linux: /flash-player.*/i
            },
            overrideHelpMessage: _("Adobe Flash is downloaded and installed automatically by your browser on Endless OS. Please visit %s to check whether it has been installed correctly and contact the %s for support if you still have problems").format(EosGates.link(_("the Adobe Flash test page"), "https://www.adobe.com/software/flash/about"), EosGates.link(_("Endless Community"), "https://community.endlessos.com"))
        },
        {
            regex: {
                windows: /(windows.*(setup|install)|mediacreationtool).*.exe/i
            },
            appName: _("Microsoft Windows"),
            flatpakInfo: { remote: 'flathub', id: 'org.gnome.Boxes' },
            replacementInfo: {
                appName: _("GNOME Boxes"),
                description: _("GNOME Boxes is a Virtual Machine where you can install Microsoft Windows and run it alongside Endless OS")
            }
        },
        {
            regex: {
                windows: /minecraft.*\.(exe|msi)/i,
                linux: /minecraft.*/i
            },
            appName: _("Minecraft"),
            flatpakInfo: { remote: 'flathub', id: 'com.mojang.Minecraft' }
        },
        {
            regex: {
                windows: /Scratch\sDesktop\sSetup\s.*\.(exe|msi)/i,
            },
            appName: _("Scratch"),
            flatpakInfo: { remote: 'flathub', id: 'edu.mit.Scratch' }
        },
        {
            regex: {
                windows: /\bmicrosoft-?edge.*\.(exe|msi)$/i,
            },
            appName: _('Microsoft Edge'),
            flatpakInfo: {
                remote: 'flathub',
                id: 'com.microsoft.Edge',
            },
        },
        {
            regex: {
                windows: /\bopera.*\.exe$/i,
            },
            appName: _('Opera'),
            flatpakInfo: {
                remote: 'flathub',
                id: 'com.opera.Opera',
            },
        },
        {
            regex: {
                windows: /telegram.*\.exe$/i,
            },
            appName: _('Telegram'),
            flatpakInfo: {
                remote: 'flathub',
                id: 'org.telegram.desktop',
            },
        },
        {
            regex: {
                windows: /\bflstudio_.*\.exe$/i,
            },
            appName: _("FL Studio"),
            flatpakInfo: {
                remote: 'flathub',
                id: 'org.ardour.Ardour',
            },
            replacementInfo: {
                appName: _("Ardour"),
                description: _("Ardour is a digital audio workstation, like FL Studio"),
            }
        },
    ];
}
