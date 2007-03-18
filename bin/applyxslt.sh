#!/usr/bin/bash
# Author:   Davide Ficano
# Date  :   22/Aug/2006

xsldir=xsl/install

if [ -z "$1" ];
then
/usr/bin/find $xsldir -name \*.xsl -exec $0 under-find '{}' \;
elif [ "$1" == "under-find" ];
then
    fulldir=`dirname $2`
    tmpdir=`dirname $0`/../tmp

    #Remove starting xsl/
    dir=`echo $fulldir | sed 's/^xsl\///'`
    
    name=`basename $2 .xsl`
    destdir=$tmpdir/xsltresults/$dir
    #extension=`echo $name | sed 's/.*\.//'`
    isxml=`echo $name | grep -c '\(rdf\|xml\)$'`

    echo Processing $name into $destdir
    
    mkdir -p $destdir
    xsltproc --path xsl --stringparam generate-updateurl true $2 xsl/extension.xml >$tmpdir/xsltr.xml
    
    if [ $isxml == 1 ] ;
    then
        # xmllint allow to indent the output
        xmllint --format -o $destdir/$name $tmpdir/xsltr.xml
    else
        cp $tmpdir/xsltr.xml $destdir/$name
    fi
    
    rm -f $tmpdir/xsltr.xml
fi
