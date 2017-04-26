-----------------------------------------------------------
-- PROJECT: MTA:TD - Test and Debug Framework
--
-- LICENSE: See LICENSE in top level directory
-- PURPOSE: MTATD Entrypoint
------------------------------------------------------------

-- Start MTATD
initMTATD()

-- Destroy MTATD gracefully
addEventHandler(triggerClientEvent and "onResourceStop" or "onClientResourceStop", resourceRoot,
    function()
        destroyMTATD()
    end,
    "low-9999999"
)
