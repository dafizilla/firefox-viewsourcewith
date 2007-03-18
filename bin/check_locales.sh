#!/bin/bash
# Author:   Davide Ficano
# Date  :   07/Aug/2006
# check_locales.sh check that locale files contain same $LANG_REF locale's strings
# If no arg is passed all locales are checked otherwise only the passed one
########
#http://steve-parker.org/sh/exitcodes.shtml
#http://www.network-theory.co.uk/docs/diff/Line_Group_Formats.html
########

EXT_NAME=viewsourcewith

BASEDIR=`dirname $0`
TMP_DIR=$BASEDIR/../tmp/
LOCALE_DIR=$BASEDIR/../src/main/locale/
OUT_DIR=$TMP_DIR/results

# This is the lang code used as reference when diff is executed
# This lang code must contains all property names
LANG_REF=it-IT

mkdir -p $OUT_DIR

function show_diff_per_file()
{
    make_result_for_lang "$LANG_REF";
    if [ "$1" == "" ];
    then
        for i in $LOCALE_DIR/[^$LANG_REF]*;
        do
            base=`basename $i`;
            make_result_for_lang $base;
            diff_lang_code $base;
        done
    else
        make_result_for_lang $1;
        diff_lang_code $1;
    fi
}

#######
## diff_lang_code lang_code
## Make a diff between $LANG_REF and passed lang_code
#######
function diff_lang_code()
{
    diff --old-group-format='%<' --unchanged-group-format='' $OUT_DIR/${LANG_REF}_sorted.txt $OUT_DIR/${1}_sorted.txt >$OUT_DIR/diff_result.txt
    if [ "$?" -eq "1" ];
    then
        echo $1 differs
        cat $OUT_DIR/diff_result.txt
        echo
        echo
    fi
}

#######
## make_result_for_lang lang_code
## Write all property names extracted from all DTD and properties files
## to $OUT_DIR/curr_tmp.txt
#######
function make_result_for_lang()
{
    rm -f $OUT_DIR/curr_tmp.txt
    for i in $LOCALE_DIR/$1/$EXT_NAME/*;
    do
        awk -f $BASEDIR/extract_names.awk $i >>$OUT_DIR/curr_tmp.txt
    done
    sort $OUT_DIR/curr_tmp.txt > $OUT_DIR/$1_sorted.txt
}

show_diff_per_file $*