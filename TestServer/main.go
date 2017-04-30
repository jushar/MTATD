package main

import (
	"net/http"

	"bufio"
	"os"

	"fmt"

	"github.com/gorilla/mux"
)

func main() {
	// Check args
	if len(os.Args) < 3 {
		fmt.Printf("ERROR: Syntax %s <server-path> <backend-port>", os.Args[0])
		return
	}

	// Make root router
	router := mux.NewRouter()

	// Init MTA server
	server := NewMTAServer(os.Args[1])

	// Initialise APIs
	NewMTAUnitAPI(router.PathPrefix("/MTAUnit").Subrouter())
	NewMTADebugAPI(router.PathPrefix("/MTADebug").Subrouter())
	NewMTAServerAPI(router.PathPrefix("/MTAServer").Subrouter(), server)

	// Start MTA server
	fmt.Println("Launching MTA Server...")
	server.Start()

	// Start HTTP server
	fmt.Println("Launching HTTP server...")
	http.Handle("/", router)
	go http.ListenAndServe(":"+os.Args[2], nil)

	// Wait for input
	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		server.ExecCommand(scanner.Text())
	}
}
