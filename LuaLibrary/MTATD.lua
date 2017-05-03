-----------------------------------------------------------
-- PROJECT: MTA:TD - Test and Debug Framework
--
-- LICENSE: See LICENSE in top level directory
-- PURPOSE: Shared across all MTA:TD modules
------------------------------------------------------------
MTATD = {}
MTATD.Host = "localhost"
MTATD.Port = "51237"

-- Class micro framework
MTATD.Class = setmetatable({}, {
    __call = function(self) return setmetatable({}, { __index = self }) end
})
function MTATD.Class:new(...)
    local obj = setmetatable({}, { __index = self })
    if obj.constructor then
        obj:constructor(...)
    end
    return obj
end
function MTATD.Class:delete(...)
    if self.destructor then
        self:destructor(...)
    end
end


-- Entrypoint function
local backend
function initMTATD()
    backend = MTATD.Backend:new(MTATD.Host, MTATD.Port)
end

-- Exitpoint function
function destroyMTATD()
    if backend then
        backend:delete()
    end
end
