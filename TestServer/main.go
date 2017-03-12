package main

import (
	"net/http"

	"github.com/gorilla/mux"
)

func main() {
	// Make root router
	router := mux.NewRouter()

	// Initialise APIs
	NewMTAUnitAPI(router.PathPrefix("/MTAUnit").Subrouter())
	//mtaDebugAPI := NewMTADebugAPI(router.PathPrefix("MTADebug").Subrouter())

	// Init and start MTA server
	// server := NewMTAServer("D:\\Dev\\MTA\\mtasa-blue\\Bin\\server\\MTA Server_d.exe")
	// server.Start()

	// Start HTTP server
	http.Handle("/", router)
	http.ListenAndServe(":8080", nil)
}
