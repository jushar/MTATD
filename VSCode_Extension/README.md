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
1) Configure your MTA:SA server and client to stop timing out by creating an empty file named `timeout.longtime` in both your server directory (next to `MTA Server.exe`) and your MTA directory (next to `core.dll`). Make sure your _Windows Explorer_ shows file extensions.
2) When you start debugging, _Visual Studio Code_ asks you to create a new launch configuration based upon a default configuration.  
Make then sure you insert a valid `serverpath` (the path to the server folder **without** `MTA Server.exe`).
3) Download the latest Lua extension bundle from https://do-not.press/MTATD.bundle.lua, put it into the resource you want to debug (only one resource can be debugged at a time).
4) Add the bundle file to your `meta.xml`:
   ```xml
   <script src="MTATD.bundle.lua" type="shared"/>
   ```
5) Launch the debug test server by pressing _F1_ in _Visual Studio Code_ and entering `MTA:SA: Start Debug Server` (the auto-completion will help you). You could also create a key mapping for this command.
6) You're ready to start debugging now!