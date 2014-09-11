
AC_INIT([Endless Gates], [0],
    [], [eos-gates], [http://endlessm.com])
AM_INIT_AUTOMAKE([-Wall -Wno-portability foreign 1.11 tar-ustar])
AM_SILENT_RULES([yes])

AC_CACHE_SAVE

GETTEXT_PACKAGE=AC_PACKAGE_NAME
AC_SUBST(GETTEXT_PACKAGE)
AC_DEFINE_UNQUOTED(GETTEXT_PACKAGE,"$GETTEXT_PACKAGE",[The name of the gettext domain])
IT_PROG_INTLTOOL(0.40.0)
AM_GLIB_GNU_GETTEXT

AC_PROG_MKDIR_P
PKG_PROG_PKG_CONFIG

GJS_CONSOLE=`$PKG_CONFIG --variable=gjs_console gjs-1.0`
AC_SUBST(GJS_CONSOLE)

GLIB_COMPILE_RESOURCES=`$PKG_CONFIG --variable glib_compile_resources gio-2.0`
AC_SUBST(GLIB_COMPILE_RESOURCES)

AC_CACHE_SAVE

AC_CONFIG_FILES([
    po/Makefile.in
    Makefile
])
AC_OUTPUT
