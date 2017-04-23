# MTA:TD - Testing and Debugger Framework for MTA:SA
[![Build Status](https://travis-ci.org/Jusonex/MTATD.svg?branch=master)](https://travis-ci.org/Jusonex/MTATD)

## Usage
TODO

## Stash
### useful PowerShell commands
```PowerShell
Invoke-WebRequest -uri "http://localhost:8080/MTADebug/set_breakpoint" -Method POST -Body (Get-Content .\TestServer\TestSamples\set_breakpoint.json)

Invoke-WebRequest -uri "http://localhost:8080/MTADebug/set_resume_mode" -Method POST -Body (Get-Content .\TestServer\TestSamples\resume_execution.json)

```
