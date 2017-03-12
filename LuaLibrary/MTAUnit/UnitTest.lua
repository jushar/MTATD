----------------------------------------------------------
-- PROJECT: MTA:SA Unit Testing Framework
--
-- LICENSE: See LICENSE in top level directory
-- PURPOSE: Provide a base class for all test cases
-----------------------------------------------------------
MTAUnit.UnitTest = {}

-----------------------------------------------------------
-- Runs all test cases in this class
--
-- Returns the test results
-----------------------------------------------------------
function MTAUnit.UnitTest:run()
    -- Init attributes
    self.testResults = {}

    -- Execute setup method if exists
    if self.setup then
        self:setup()
    end

    -- Execute all tests that are prefixed by a 'test'
    for methodName, func in pairs(self) do
        if methodName:sub(1, 4) == "test" then
            -- Call test function and catch errors
            local success, err = pcall(func)

            -- Store test result
            self.testResults[methodName] = { success = success, message = err }
        end
    end

    -- Execute clean method if exists
    if self.clean then
        self:clean()
    end

    return self.testResults
end

-----------------------------------------------------------
-- Checks if the passed predicate is true
--
-- value (bool): The predicate you want to check
-----------------------------------------------------------
function MTAUnit.UnitTest:assertTrue(value)
    if value ~= true then
        error("Expected true, got "..tostring(value))
    end
end

-----------------------------------------------------------
-- Checks if the passed predicate is false
--
-- value (bool): The predicate you want to check
-----------------------------------------------------------
function MTAUnit.UnitTest:assertFalse(value)
    if value ~= false then
        error("Expected false, got "..tostring(value))
    end
end

-----------------------------------------------------------
-- Checks if the passed value is equal to an expected value
--
-- value (any): The actual value
-- expected (any): The expected value
-----------------------------------------------------------
function MTAUnit.UnitTest:assertEquals(value, expected)
    if value ~= expected then
        error("Expected "..tostring(expected)..", got "..tostring(value))
    end
end
