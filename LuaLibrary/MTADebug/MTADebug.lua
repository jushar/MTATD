-----------------------------------------------------------
-- PROJECT: MTA:TD - Test and Debug Framework
--
-- LICENSE: See LICENSE in top level directory
-- PURPOSE: Shared global variables across the module
------------------------------------------------------------

-- Namespace for the MTADebug library
MTATD.MTADebug = MTATD.Class()

-- Resume mode enumeration
local ResumeMode = {
    Resume = 0,
    Paused = 1,
    LineStep = 2
}

-----------------------------------------------------------
-- Constructs the MTADebug manager
--
-- backend (MTATD.Backend): The MTATD backend instance
-----------------------------------------------------------
function MTATD.MTADebug:constructor(backend)
    self._backend = backend
    self._breakpoints = {}

    -- Enable development mode
    --setDevelopmentMode(true, true) -- TODO

    -- Initially fetch the breakpoints from the backend
    -- and wait till they're received
    self:_fetchBreakpoints(true)

    -- Install debug hook
    debug.sethook(function(...) self:_hookFunction(...) end, "l")

    -- Update breakpoint list once per 3 seconds asynchronously
    self._breakpointUpdateTimer = setTimer(function() self:_fetchBreakpoints() end, 3 * 1000, 0)
end

-----------------------------------------------------------
-- Disposes the MTADebug instance (e.g. stops polling)
-----------------------------------------------------------
function MTATD.MTADebug:destructor()
    if self._breakpointUpdateTimer and isTimer(self._breakpointUpdateTimer) then
        killTimer(self._breakpointUpdateTimer)
    end
end

-----------------------------------------------------------
-- (Private) function that is called for each line in
-- the script being executed (line hook)
--
-- hookType (string): The hook type string
--                    (this should always be 'line')
-- nextLineNumber (number): The next line that is executed
-----------------------------------------------------------
function MTATD.MTADebug:_hookFunction(hookType, nextLineNumber)
    -- Ignore other types
    if hookType ~= "line" then
        return
    end

    -- Get some debug info
    local debugInfo = debug.getinfo(3, "S")
    debugInfo.short_src = debugInfo.short_src:gsub("\\", "/")

    -- Is there a breakpoint?
    if not self:hasBreakpoint(debugInfo.short_src, nextLineNumber) then
        return
    end
    outputDebugString("Reached breakpoint")

    -- Tell backend that we reached a breakpoint
    self._backend:request("MTADebug/set_resume_mode", { resume_mode = ResumeMode.Paused })

    -- Wait for resume request
    local continue = false
    repeat
        -- Ask backend
        self._backend:request("MTADebug/get_resume_mode", {},
            function(info)
                if info.resume_mode == ResumeMode.Resume then
                    continue = true

                    -- Update breakpoints
                    self:_fetchBreakpoints(true)
                end
            end
        )

        -- Sleep a bit (MTA still processes http events internally)
        debugSleep(100)
    until continue

    outputDebugString("Resuming execution...")
end

-----------------------------------------------------------
-- Checks whether or not there is a breakpoint at the
-- given line in the given file
--
-- fileName (string): The file name (relative script path)
-- lineNumber (number): The line number
--
-- Returns true if there is a breakpoint, false otherwise
-----------------------------------------------------------
function MTATD.MTADebug:hasBreakpoint(fileName, lineNumber)
    local breakpoints = self._breakpoints[fileName]
    if breakpoints then
        return breakpoints[lineNumber]
    end
    return false
end

-----------------------------------------------------------
-- Fetches the breakpoints from the backend and updates
-- the internally stored list of breakpoints
--
-- wait (bool): true to wait till the response is available,
--              false otherwise (defaults to 'false')
-----------------------------------------------------------
function MTATD.MTADebug:_fetchBreakpoints(wait)
    local responseAvailable = false

    self._backend:request("MTADebug/get_breakpoints", {},
        function(breakpoints)
            local basePath = self:_getResourceBasePath()

            for k, breakpoint in ipairs(breakpoints) do
                -- Prepend resource base path
                breakpoint.file = basePath..breakpoint.file

                if not self._breakpoints[breakpoint.file] then
                    self._breakpoints[breakpoint.file] = {}
                end
                self._breakpoints[breakpoint.file][breakpoint.line] = true
            end
            
            iprint(self._breakpoints)

            responseAvailable = true
        end
    )

    -- Wait
    if wait then
        repeat
            debugSleep(25)
        until responseAvailable
    end
end

-----------------------------------------------------------
-- Builds the base path for a resource (the path used
-- in error messages)
--
-- Returns the built base path
-----------------------------------------------------------
function MTATD.MTADebug:_getResourceBasePath()
    local thisResource = getThisResource()

    if triggerClientEvent then -- Is server?
        local organizationalPath = getResourceOrganizationalPath(thisResource)
        return getResourceName(thisResource).."/"..(organizationalPath ~= "" and organizationalPath.."/" or "")
    else
        return getResourceName(thisResource).."/"
    end
end
