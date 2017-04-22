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
	NewMTADebugAPI(router.PathPrefix("/MTADebug").Subrouter())

	// Init and start MTA server
	server := NewMTAServer("D:\\Program Files (x86)\\MTA San Andreas 1.5\\server\\MTA Server.exe")
	server.Start()

	// Start HTTP server
	http.Handle("/", router)
	http.ListenAndServe(":8080", nil)
}
