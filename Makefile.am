
SUBDIRS = po
ACLOCAL_AMFLAGS = -I m4

CLEANFILES =
DISTCLEANFILES =
EXTRA_DIST =

resource_files = $(shell $(GLIB_COMPILE_RESOURCES) --sourcedir=$(srcdir) --generate-dependencies $(srcdir)/eos-gates.gresource.xml)
eos-gates.gresource: eos-gates.gresource.xml $(resource_files)
	$(AM_V_GEN)$(GLIB_COMPILE_RESOURCES) --target=$@ --sourcedir=$(srcdir)  $<
CLEANFILES += eos-gates.gresource

do_subst = sed \
	-e 's|@localedir[@]|$(localedir)|g' \
	-e 's|@pkglibdir[@]|$(pkglibdir)|g' \
	-e 's|@pkgdatadir[@]|$(pkgdatadir)|g' \
	-e 's|@GJS_CONSOLE[@]|$(GJS_CONSOLE)|g' \
	-e 's|@PACKAGE_NAME[@]|$(PACKAGE)|g' \
	-e 's|@PACKAGE_VERSION[@]|$(VERSION)|g' \
	-e 's|@GETTEXT_PACKAGE[@]|$(GETTEXT_PACKAGE)|g'
src/config.js: src/config.js.in Makefile
	$(AM_V_GEN) $(do_subst) $< > $@

# # # INSTALL RULES # # #

js_sources = \
	src/config.js \
	src/eos_gates.js \
	$(NULL)

nobase_pkgdata_DATA = \
	$(js_sources) \
	eos-gates.gresource \
	$(NULL)

eos-gates: eos-gates.in Makefile
	$(AM_V_GEN) $(do_subst) $< > $@
	chmod +x $@
CLEANFILES += eos-gates

bin_SCRIPTS = eos-gates

EXTRA_DIST += \
	$(js_sources) \
	$(resource_files) \
	eos-gates.gresource.xml \
	src/config.js.in \
	eos-gates.in \
	$(NULL)
