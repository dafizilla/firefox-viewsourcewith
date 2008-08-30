echo first >/tmp/komp.log
export PATH=/opt/devel/mozilla/kompozer/:$PATH
kompozer $* >>/tmp/komp.log
