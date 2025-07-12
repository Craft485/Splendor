#!/bin/bash

if [ -e "public/game.js" ]; then
    set -f # Temp disable globbing (allow bash to read asterisks as characters and not as some sort of command)
    libversion=$(cat package.json | grep socket.io-client | grep -o -P '\d+\.\d+\.\d+')
    echo "Using version ${libversion}"
    filecontents=$(cat public/game.js)
    libname=$(echo $filecontents | grep -o socket.io-client)
    if [ -n $libversion ] && [ -n $libname ]; then
        filecontents=$(echo "${filecontents/"socket.io-client"/"https://cdn.socket.io/${libversion}/socket.io.esm.min.js"}")
        echo $filecontents > public/game.js
    fi
    set +f # Re-enable globbing
fi
