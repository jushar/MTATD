# MTA:SA Lua Debugger and Test Framework
This extension implements a debug adapter for MTA:SA's (Multi Theft Auto: San Andreas) Lua. Note that it doesn't work with plain Lua though.

## Features
* Breakpoints
* Line steps
* Variable lists (locals, upvalues, globals)
* Resource restarts
* Integrated *runcode* via VSCode's "Debug Console" feature

## Screenshots
![Debugger Screenshot](http://i.imgur.com/x378Gp7.png)

## Planned Features
* Step into functions (+ return from function)
* Stack traces
* Variable editing
* Unit Tests

## Usage
When you start debugging, _Visual Studio Code_ asks you to create a new launch configuration based upon a default configuration.  
Make then sure you insert a valid `serverpath` (the path to the server folder **without** `MTA Server.exe`).
