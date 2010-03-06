#!/bin/bash

# This script was created to reply to: pipe_through_script
# https://sourceforge.net/forum/message.php?msg_id=4609261
TMP_FILE=`mktemp`
cp $1 $TMP_FILE

# sleep ensure sed-ed time differs from passed one
sleep 1
sed -e 's/foo/bar/g' $TMP_FILE >$1

