-----------------------------------------------------------
-- PROJECT: MTA:TD - Test and Debug Framework
--
-- LICENSE: See LICENSE in top level directory
-- PURPOSE: Finds and runs the tests
-----------------------------------------------------------
MTAUnit.TestRunner = {}
MTAUnit.TestRunner.Mode = { SearchGlobalEnv = 1, Registered = 2 }

-----------------------------------------------------------
-- Searchs all test cases in the project,
-- executes them and returns the results finally
--
-- Returns the test results (table)
-----------------------------------------------------------
function MTAUnit.TestRunner:run(mode)
    local testResults = {}

    -- Check which mode we're running in
    if mode == MTAUnit.TestRunner.Mode.SearchGlobalEnv then
        -- Find all TestX classes in the global environment
        for name, classt in pairs(_G) do
            -- Only process proper variables and classes
            if type(name) == "string" and type(classt) == "table"
                and name:sub(1, 4) == "Test" then

                -- Run unit test
                if classt.run then
                    -- Create instance
                    local obj = setmetatable({}, { __index = classt })

                    -- Run test now and cut off 'Test' prefix
                    testResults[name:sub(5)] = obj:run()
                end
            end
        end
    elseif mode == MTAUnit.TestRunner.Mode.Registered then
        -- TODO
    end

    -- Pass test results to the backend
    self:_presentResults(testResults)
end

-----------------------------------------------------------
-- Presents the test results to the backend (private)
--
-- testResults (table): The test results
-----------------------------------------------------------
function MTAUnit.TestRunner._presentResults(testResults)
    -- TODO
end
