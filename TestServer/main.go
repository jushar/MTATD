package main

import (
	"net/http"

	"bufio"
	"os"

	"github.com/gorilla/mux"
)

func main() {
	// Make root router
	router := mux.NewRouter()

	// Init MTA server
	//server := NewMTAServer("D:\\Program Files (x86)\\MTA San Andreas 1.5\\server\\MTA Server.exe")
	server := NewMTAServer("D:\\Dev\\MTA\\mtasa-blue\\Bin\\server\\MTA Server_d.exe")

	// Initialise APIs
	NewMTAUnitAPI(router.PathPrefix("/MTAUnit").Subrouter())
	NewMTADebugAPI(router.PathPrefix("/MTADebug").Subrouter())
	NewMTAServerAPI(router.PathPrefix("/MTAServer").Subrouter(), server)

	/// Start MTA server
	server.Start()

	// Start HTTP server
	http.Handle("/", router)
	go http.ListenAndServe(":8080", nil)

	// Wait for input
	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		server.ExecCommand(scanner.Text())
	}
}
