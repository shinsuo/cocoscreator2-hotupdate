#!/bin/bash

# generate manifest (change version first!).
node version_generator.js -v $1

# output new remote-assets
rm -rf ./remote/native/ios/release/res
rm -rf  ./remote/native/ios/release/src
cp -a ./build/jsb-link/res ./remote/native/ios/release/
cp -a ./build/jsb-link/src ./remote/native/ios/release/
cp -a ./assets/project.manifest ./remote/native/ios/release/
cp -a ./assets/version.manifest ./remote/native/ios/release/
