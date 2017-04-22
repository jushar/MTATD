package main

import (
	"net/http"

	"encoding/json"

	"github.com/gorilla/mux"
)

type MTADebugAPI struct {
	Breakpoints []debugBreakpoint
}

type debugBreakpoint struct {
	File string `json:"file"`
	Line int    `json:"line"`
}

func (bp *debugBreakpoint) equals(other *debugBreakpoint) bool {
	return bp.File == other.File && bp.Line == other.Line
}

func NewMTADebugAPI(router *mux.Router) *MTADebugAPI {
	// Create instance
	api := new(MTADebugAPI)
	api.Breakpoints = []debugBreakpoint{}

	// Register routes
	router.HandleFunc("/get_breakpoints", api.handlerGetBreakpoints)
	router.HandleFunc("/set_breakpoint", api.handlerSetBreakpoint)
	router.HandleFunc("/remove_breakpoint", api.handlerRemoveBreakpoint)

	return api
}

func (api *MTADebugAPI) handlerGetBreakpoints(res http.ResponseWriter, req *http.Request) {
	json.NewEncoder(res).Encode(&api.Breakpoints)
}

func (api *MTADebugAPI) handlerSetBreakpoint(res http.ResponseWriter, req *http.Request) {
	breakpoint := debugBreakpoint{}
	err := json.NewDecoder(req.Body).Decode(&breakpoint)

	if err != nil {
		panic(err)
	} else {
		api.Breakpoints = append(api.Breakpoints, breakpoint)
	}

	json.NewEncoder(res).Encode(&breakpoint)
}

func (api *MTADebugAPI) handlerRemoveBreakpoint(res http.ResponseWriter, req *http.Request) {
	breakpoint := debugBreakpoint{}
	err := json.NewDecoder(req.Body).Decode(&breakpoint)

	if err != nil {
		panic(err)
	} else {
		newBreakpoints := []debugBreakpoint{}
		for _, bp := range newBreakpoints {
			if bp.equals(&breakpoint) {
				newBreakpoints = append(newBreakpoints, bp)
			}
		}
		api.Breakpoints = newBreakpoints
	}

	json.NewEncoder(res).Encode(&breakpoint)
}
