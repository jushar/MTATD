@echo off

rem Build Go DebugServer
cd TestServer
go build -o ../VSCode_Extension/DebugServer.exe main.go MTADebugAPI.go MTAServer.go MTAServerAPI.go MTAUnitAPI.go

rem Compress binary
cd ..
.\upx.exe -4 VSCode_Extension/DebugServer.exe

rem Build VSCode extension vsix
cd VSCode_Extension
vsce package
