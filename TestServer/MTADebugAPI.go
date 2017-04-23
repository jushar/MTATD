package main

import (
	"net/http"

	"encoding/json"

	"github.com/gorilla/mux"
)

const (
	RESUME_MODE_RESUME    = 0
	RESUME_MODE_PAUSED    = 1
	RESUME_MODE_LINE_STEP = 2
)

type MTADebugAPI struct {
	Breakpoints           []debugBreakpoint
	ResumeMode            int
	CurrentBreakpoint     debugBreakpoint
	CurrentLocalVariables map[string]string

	Info struct {
		ResourcePath string `json:"resource_path"`
	}
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
	api.ResumeMode = RESUME_MODE_RESUME

	// Register routes
	router.HandleFunc("/get_info", api.handlerGetInfo)
	router.HandleFunc("/set_info", api.handlerSetInfo)
	router.HandleFunc("/get_breakpoints", api.handlerGetBreakpoints)
	router.HandleFunc("/set_breakpoint", api.handlerSetBreakpoint)
	router.HandleFunc("/remove_breakpoint", api.handlerRemoveBreakpoint)
	router.HandleFunc("/get_resume_mode", api.handlerGetResumeMode)
	router.HandleFunc("/set_resume_mode", api.handlerSetResumeMode)

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

func (api *MTADebugAPI) handlerGetResumeMode(res http.ResponseWriter, req *http.Request) {
	var jsonRes = struct { // TODO: Define proper type
		ResumeMode     int               `json:"resume_mode"`
		CurrentFile    string            `json:"current_file"`
		CurrentLine    int               `json:"current_line"`
		LocalVariables map[string]string `json:"local_variables"`
	}{api.ResumeMode, api.CurrentBreakpoint.File, api.CurrentBreakpoint.Line, api.CurrentLocalVariables}

	json.NewEncoder(res).Encode(&jsonRes)
}

func (api *MTADebugAPI) handlerSetResumeMode(res http.ResponseWriter, req *http.Request) {
	var jsonReq = struct {
		ResumeMode     int               `json:"resume_mode"`
		CurrentFile    string            `json:"current_file"`
		CurrentLine    int               `json:"current_line"`
		LocalVariables map[string]string `json:"local_variables"`
	}{}

	err := json.NewDecoder(req.Body).Decode(&jsonReq)
	if err != nil {
		panic(err)
	} else {
		api.ResumeMode = jsonReq.ResumeMode // TODO: Check range
		api.CurrentBreakpoint.File = jsonReq.CurrentFile
		api.CurrentBreakpoint.Line = jsonReq.CurrentLine
		api.CurrentLocalVariables = jsonReq.LocalVariables

		json.NewEncoder(res).Encode(&jsonReq)
	}
}

func (api *MTADebugAPI) handlerGetInfo(res http.ResponseWriter, req *http.Request) {
	err := json.NewEncoder(res).Encode(&api.Info)
	if err != nil {
		panic(err)
	}
}

func (api *MTADebugAPI) handlerSetInfo(res http.ResponseWriter, req *http.Request) {
	err := json.NewDecoder(req.Body).Decode(&api.Info)
	if err != nil {
		panic(err)
	} else {
		json.NewEncoder(res).Encode(&api.Info)
	}
}
