version=`grep '^version' extension.properties | sed 's/^.*=//'`
extname=`grep '^ext.name' extension.properties | sed 's/^.*=//'`
filename=$extname-$version.tar.bz2
rm -f $filename
echo creating $filename ...
tar jcf $filename -X bin/tar-exclude.lst .
