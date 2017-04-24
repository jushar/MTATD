package main

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
)

type MTAServerAPI struct {
	Server *MTAServer
}

func NewMTAServerAPI(router *mux.Router, server *MTAServer) *MTAServerAPI {
	// Create instance
	api := new(MTAServerAPI)
	api.Server = server

	// Register routes
	router.HandleFunc("/command", api.handlerCommand)

	return api
}

func (api *MTAServerAPI) handlerCommand(res http.ResponseWriter, req *http.Request) {
	var jsonReq = struct {
		Command string `json:"command"`
	}{}

	err := json.NewDecoder(req.Body).Decode(&jsonReq)
	if err != nil {
		panic(err)
	} else {
		api.Server.ExecCommand(jsonReq.Command)

		json.NewEncoder(res).Encode(&jsonReq)
	}
}
