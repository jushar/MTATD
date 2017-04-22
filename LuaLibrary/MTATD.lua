-----------------------------------------------------------
-- PROJECT: MTA:TD - Test and Debug Framework
--
-- LICENSE: See LICENSE in top level directory
-- PURPOSE: Shared across all MTA:TD modules
------------------------------------------------------------
MTATD = {}

-- Class micro framework
MTATD.Class = setmetatable({}, {
    __call = function(self) return setmetatable({}, { __index = self }) end
})
function MTATD.Class:new(...)
    local obj = setmetatable({}, { __index = self })
    if obj.constructor then
        obj:constructor(...)
    end
end

function initMTATD()
    MTATD.Backend:new("localhost", 8080)
end
