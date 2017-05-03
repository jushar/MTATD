# MTA:SA Lua Debugger and Test Framework
This extension implements a debug adapter for MTA:SA's (Multi Theft Auto: San Andreas) Lua. Note that it doesn't work with plain Lua though.

## Features
* Breakpoints
* Step into, Step over
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
1) When you start debugging, _Visual Studio Code_ asks you to create a new launch configuration based upon a default configuration.  
Make then sure you insert a valid `serverpath` (the path to the server folder **without** `MTA Server.exe`).   
2) Add the _debug bundle_ to your project by executing the command `MTA:TD: Add bundle to current project` (press `F1`, enter the command and submit). This only works if you opened root folder of your resource (_meta.xml_ lies there).   
3) Add the bundle file to your `meta.xml`:
   ```xml
   <script src="MTATD.bundle.lua" type="shared"/>
   ```
4) Launch the debug test server by pressing _F1_ in _Visual Studio Code_ and entering `MTA:TD: Start MTA Debug Server` (the auto-completion will help you). You could also create a key mapping for this command.   
5) You're ready to start debugging now!   
