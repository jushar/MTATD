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
    self._resumeMode = ResumeMode.Resume

    -- Enable development mode
    setDevelopmentMode(true)

    -- Send info about us to backend
    self._backend:request("MTADebug/set_info", {
        resource_name = getResourceName(getThisResource()),
        resource_path = self:_getResourceBasePath()
    })

    -- Initially fetch the breakpoints from the backend
    -- and wait till they're received
    self:_fetchBreakpoints(true)

    -- Install debug hook
    debug.sethook(function(...) self:_hookFunction(...) end, "l")

    -- Update things once per 3 seconds asynchronously
    self._updateTimer = setTimer(
        function()
            -- Update breakpoint list
            self:_fetchBreakpoints()

            -- Check for changing resume mode
            self:_checkForResumeModeChange()

            -- Check for pending eval expression
            self:_checkForPendingEval()
        end,
        500,
        0
    )
end

-----------------------------------------------------------
-- Disposes the MTADebug instance (e.g. stops polling)
-----------------------------------------------------------
function MTATD.MTADebug:destructor()
    if self._updateTimer and isTimer(self._updateTimer) then
        killTimer(self._updateTimer)
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

    -- Is there a breakpoint and pending line step?
    if not self:hasBreakpoint(debugInfo.short_src, nextLineNumber) and self._resumeMode ~= ResumeMode.LineStep then
        return
    end

    outputDebugString("Reached breakpoint")

    -- Tell backend that we reached a breakpoint
    self._backend:request("MTADebug/set_resume_mode", {
        resume_mode = ResumeMode.Paused,
        current_file = debugInfo.short_src,
        current_line = nextLineNumber,

        local_variables = self:_getLocalVariables(),
        upvalue_variables = self:_getUpvalueVariables(),
        global_variables = self:_getGlobalVariables()
    })

    -- Wait for resume request
    local continue = false
    repeat
        -- Ask backend
        self._backend:request("MTADebug/get_resume_mode", {},
            function(info)
                -- Continue in case of a failure (to prevent a freeze)
                if not info then
                    continue = true
                end

                self._resumeMode = info.resume_mode

                if info.resume_mode ~= ResumeMode.Paused then
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

            -- Clear old breakpoints
            self._breakpoints = {}

            -- Add new breakpoints
            for k, breakpoint in ipairs(breakpoints or {}) do
                -- Prepend resource base path
                breakpoint.file = basePath..breakpoint.file

                if not self._breakpoints[breakpoint.file] then
                    self._breakpoints[breakpoint.file] = {}
                end
                self._breakpoints[breakpoint.file][breakpoint.line] = true
            end

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
-- Checks for resume mode changes and stores the
-- maybe new resume mode
-----------------------------------------------------------
function MTATD.MTADebug:_checkForResumeModeChange()
    self._backend:request("MTADebug/get_resume_mode", {},
        function(info)
            self._resumeMode = info.resume_mode
        end
    )
end

-----------------------------------------------------------
-- Checks for pending 'evaluate' commands
-----------------------------------------------------------
function MTATD.MTADebug:_checkForPendingEval()
    self._backend:request("MTADebug/get_pending_eval", {},
        function(info)
            if info.pending_eval and info.pending_eval ~= "" then
                -- Run the piece of code
                outputDebugString("RUN STRING: "..info.pending_eval)
                local returnString, errorString = self:_runString(info.pending_eval)

                -- Send result back to backend
                self._backend:request("MTADebug/set_eval_result", {
                    eval_result = "Result: "..tostring(returnString or errorString)
                }, function() end)
            end
        end
    )
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

-----------------------------------------------------------
-- Returns the names and values of the local variables
-- at the "current" stack frame
--
-- Returns a table indexed by the variable name
-----------------------------------------------------------
function MTATD.MTADebug:_getLocalVariables()
    local variables = { __isObject = "" } -- __isObject ensures that toJSON creates a JSON object rather than an array

    -- Get the values of up to 50 local variables
    for i = 1, 50 do
        local name, value = debug.getlocal(4, i)
        if name and value then
            variables[name] = tostring(value)
        end
    end

    return variables
end

-----------------------------------------------------------
-- Returns the names and values of the upvalue variables
-- at the "current" stack frame
--
-- Returns a table indexed by the variable name
-----------------------------------------------------------
function MTATD.MTADebug:_getUpvalueVariables()
    local variables = { __isObject = "" }
    local func = debug.getinfo(4, "f").func
    
    if func then
        for i = 1, 50 do
            local name, value = debug.getupvalue(func, i)
            if name and value then
                variables[tostring(name)] = tostring(value)
            end
        end
    end

    return variables
end

-----------------------------------------------------------
-- Returns the names and values of the global variables
--
-- Returns a table indexed by the variable name
-----------------------------------------------------------
function MTATD.MTADebug:_getGlobalVariables()
    local counter = 0
    local variables = { __isObject = "" }

    for k, v in pairs(_G) do
        if type(v) ~= "function" and type(k) == "string" then
            counter = counter + 1
            
            if counter <= 50 then
                variables[k] = tostring(v)
            end
        end
    end

    return variables
end

-----------------------------------------------------------
-- Loads and runs a given string
--
-- codeString (string): The string you want to run
--
-- Returns the result as the 1st parameter and maybe an
-- error as the 2nd parameter
-----------------------------------------------------------
function MTATD.MTADebug:_runString(codeString)
    -- Hacked in from 'runcode' resource
	local notReturned

	-- First we test with return
	local commandFunction, errorMsg = loadstring("return "..codeString)
	if errorMsg then
		-- It failed.  Lets try without "return"
		commandFunction, errorMsg = loadstring(codeString)
	end
	if errorMsg then
		-- It still failed.  Print the error message and stop the function
		return nil, errorMsg
	end

	-- Finally, lets execute our function
	local results = { pcall(commandFunction) }
	if not results[1] then
		return nil, results[2]
	end
	
	local resultsString = ""
	local first = true
	for i = 2, #results do
		if first then
			first = false
		else
			resultsString = resultsString..", "
		end
		local resultType = type(results[i])
		if isElement(results[i]) then
			resultType = "element:"..getElementType(results[i])
		end
		resultsString = resultsString..tostring(results[i]).." ["..resultType.."]"
	end
	
	if #results > 1 then
		return resultsString
	end
	
	return true
end
