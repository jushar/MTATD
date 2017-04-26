# MTA:SA Lua Debugger
This extension implements a debug adapter for MTA:SA's (Multi Theft Auto: San Andreas) Lua. It doesn't work with plain Lua.

## Features
* Breakpoints
* Line steps
* Variable lists (locals, upvalues, globals)
* Resource restarts
* Integrated *runcode* via VSCode's "Debug Console" feature

## Planned Features
* Step into functions (+ return from function)
* Stack traces

## Usage
Before starting, make sure you insert a valid `serverpath` (the path to the server folder **without** `MTA Server.exe`).
