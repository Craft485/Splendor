#!/bin/bash

if [ -e "public/game.js" ]; then
    libversion=$(cat package.json | grep socket.io-client | grep -o -P '\d+\.\d+\.\d+')
    echo "Using version ${libversion}"
    filecontents=$(cat public/game.js)
    libname=$(echo $filecontents | grep -o socket.io-client)
    if [ -n $libversion ] && [ -n $libname ]; then
        filecontents=$(echo "${filecontents/"socket.io-client"/"https://cdn.socket.io/${libversion}/socket.io.esm.min.js"}")
        echo $filecontents > public/game.js
    fi
fi
