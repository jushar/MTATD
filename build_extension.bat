@echo off

rem Build Go DebugServer
cd TestServer
set GOARCH=386
go build -o ../VSCode_Extension/DebugServer.exe main.go MTADebugAPI.go MTAServer.go MTAServerAPI.go MTAUnitAPI.go

rem Compress binary
cd ..
.\upx.exe -4 VSCode_Extension/DebugServer.exe

rem Create Lua bundle
cd LuaLibrary
python Minify.py 0
move MTATD.bundle.lua ..\VSCode_Extension\MTATD.bundle.lua

rem Build VSCode extension vsix
cd ..\VSCode_Extension
vsce package
