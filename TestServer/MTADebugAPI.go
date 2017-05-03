package main

import (
	"net/http"

	"encoding/json"

	"github.com/gorilla/mux"
)

type MTADebugAPI struct {
	Breakpoints       []debugBreakpoint
	CurrentBreakpoint debugBreakpoint

	ClientContext debugContext
	ServerContext debugContext

	PendingEval string
	EvalResult  string

	Info debugeeInfo
}

type debugBreakpoint struct {
	File string `json:"file"`
	Line int    `json:"line"`
}

type debugContext struct {
	ResumeMode       int               `json:"resume_mode"`
	File             string            `json:"current_file"`
	Line             int               `json:"current_line"`
	LocalVariables   map[string]string `json:"local_variables"`
	UpvalueVariables map[string]string `json:"upvalue_variables"`
	GlobalVariables  map[string]string `json:"global_variables"`
}

type debugeeInfo struct {
	ResourceName string `json:"resource_name"`
	ResourcePath string `json:"resource_path"`
}

func (bp *debugBreakpoint) equals(other *debugBreakpoint) bool {
	return bp.File == other.File && bp.Line == other.Line
}

func NewMTADebugAPI(router *mux.Router) *MTADebugAPI {
	// Create instance
	api := new(MTADebugAPI)

	api.Breakpoints = []debugBreakpoint{}
	api.ServerContext.ResumeMode = 0 // ResumeMode.Resume
	api.ClientContext.ResumeMode = 0 // ResumeMode.Resume

	api.PendingEval = ""
	api.EvalResult = ""

	// Register routes
	router.HandleFunc("/get_info", api.handlerGetInfo)
	router.HandleFunc("/set_info", api.handlerSetInfo)

	router.HandleFunc("/get_breakpoints", api.handlerGetBreakpoints)
	router.HandleFunc("/set_breakpoint", api.handlerSetBreakpoint)
	router.HandleFunc("/remove_breakpoint", api.handlerRemoveBreakpoint)
	router.HandleFunc("/clear_breakpoints", api.handlerClearBreakpoints)

	router.HandleFunc("/get_resume_mode_server", api.handlerGetResumeModeServer)
	router.HandleFunc("/get_resume_mode_client", api.handlerGetResumeModeClient)
	router.HandleFunc("/set_resume_mode_server", api.handlerSetResumeModeServer)
	router.HandleFunc("/set_resume_mode_client", api.handlerSetResumeModeClient)

	router.HandleFunc("/get_pending_eval", api.handlerGetPendingEval)
	router.HandleFunc("/set_pending_eval", api.handlerSetPendingEval)
	router.HandleFunc("/get_eval_result", api.handlerGetEvalResult)
	router.HandleFunc("/set_eval_result", api.handlerSetEvalResult)

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

func (api *MTADebugAPI) handlerClearBreakpoints(res http.ResponseWriter, req *http.Request) {
	api.Breakpoints = []debugBreakpoint{}

	json.NewEncoder(res).Encode(&api.Breakpoints)
}

func (api *MTADebugAPI) handlerGetResumeModeServer(res http.ResponseWriter, req *http.Request) {
	json.NewEncoder(res).Encode(&api.ServerContext)
}

func (api *MTADebugAPI) handlerGetResumeModeClient(res http.ResponseWriter, req *http.Request) {
	json.NewEncoder(res).Encode(&api.ClientContext)
}

func (api *MTADebugAPI) handlerSetResumeModeServer(res http.ResponseWriter, req *http.Request) {
	// Create an empty context (Decode merges the structures instead of fully overwriting)
	context := debugContext{}

	err := json.NewDecoder(req.Body).Decode(&context)
	if err != nil {
		panic(err)
	} else {
		api.ServerContext = context
		json.NewEncoder(res).Encode(&api.ServerContext)
	}
}

func (api *MTADebugAPI) handlerSetResumeModeClient(res http.ResponseWriter, req *http.Request) {
	// Create an empty context (Decode merges the structures instead of fully overwriting)
	context := debugContext{}

	err := json.NewDecoder(req.Body).Decode(&context)
	if err != nil {
		panic(err)
	} else {
		api.ClientContext = context
		json.NewEncoder(res).Encode(&api.ClientContext)
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

func (api *MTADebugAPI) handlerGetPendingEval(res http.ResponseWriter, req *http.Request) {
	var jsonReq = struct {
		PendingEval string `json:"pending_eval"`
	}{api.PendingEval}

	err := json.NewEncoder(res).Encode(&jsonReq)
	if err != nil {
		panic(err)
	} else {
		api.PendingEval = ""
	}
}

func (api *MTADebugAPI) handlerSetPendingEval(res http.ResponseWriter, req *http.Request) {
	var jsonReq = struct {
		PendingEval string `json:"pending_eval"`
	}{}

	err := json.NewDecoder(req.Body).Decode(&jsonReq)
	if err != nil {
		panic(err)
	} else {
		api.PendingEval = jsonReq.PendingEval

		json.NewEncoder(res).Encode(&jsonReq)
	}
}

func (api *MTADebugAPI) handlerGetEvalResult(res http.ResponseWriter, req *http.Request) {
	var jsonReq = struct {
		EvalResult string `json:"eval_result"`
	}{api.EvalResult}

	err := json.NewEncoder(res).Encode(&jsonReq)
	if err != nil {
		panic(err)
	} else {
		api.EvalResult = ""
	}
}

func (api *MTADebugAPI) handlerSetEvalResult(res http.ResponseWriter, req *http.Request) {
	var jsonReq = struct {
		EvalResult string `json:"eval_result"`
	}{}

	err := json.NewDecoder(req.Body).Decode(&jsonReq)
	if err != nil {
		panic(err)
	} else {
		api.EvalResult = jsonReq.EvalResult

		json.NewEncoder(res).Encode(&jsonReq)
	}
}
