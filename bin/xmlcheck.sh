if [ -n "$1" ];
then
    srcdir=$1
else
    srcdir=src/main/locale
fi

echo XML check $srcdir ...
/usr/bin/find $srcdir -type f -regex '.*\.\(xml\|rdf\)' -exec xmllint --noout '{}' \;