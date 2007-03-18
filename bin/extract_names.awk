BEGIN {
    len = split(ARGV[1], a, "/")
    fileName = tolower(a[len]);
}
    
fileName ~ /\.dtd$/ && $0 ~ /^<!ENTITY/ {
    // Process DTD files
    printf("%-30s:%s\n", fileName, $2)
}

fileName ~ /\.properties$/ && $0 ~ /^.*=/ {
    // Process properties files
    split($0, name, "=");
    printf("%-30s:%s\n", fileName, name[1])
}
