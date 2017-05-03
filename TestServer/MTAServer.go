package main

import (
	"bufio"
	"bytes"
	"container/ring"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
)

// MTAServer type represents an MTA Server process
type MTAServer struct {
	Path         string
	Process      *exec.Cmd
	Running      bool
	Stdin        io.WriteCloser
	Stdout       io.ReadCloser
	OutputBuffer *ring.Ring
	WaitMutex    sync.Mutex
}

// NewMTAServer instantiates a new MTA server instance
func NewMTAServer(path string) *MTAServer {
	server := new(MTAServer)
	server.Path = path
	server.OutputBuffer = ring.New(5000)
	server.Process = nil

	return server
}

func (server *MTAServer) Start() error {
	// Don't start processes twice
	if server.Process != nil && server.Process.Process != nil && server.Process.ProcessState != nil && !server.Process.ProcessState.Exited() {
		return errors.New("Process is already running")
	}

	// Spawn process
	server.Process = exec.Command(server.Path, "-n", "-t", "-u")

	// Get stdin
	var err error
	server.Stdin, err = server.Process.StdinPipe()
	if err != nil {
		return err
	}

	// Get stdout
	server.Stdout, err = server.Process.StdoutPipe()
	if err != nil {
		return err
	}

	// Capture output into ring buffer
	scanner := bufio.NewScanner(server.Stdout)
	go func() {
		for scanner.Scan() {
			text := scanner.Text()
			fmt.Println(text)

			server.OutputBuffer.Value = text
			server.OutputBuffer = server.OutputBuffer.Next()
		}
	}()

	server.Process.Stderr = os.Stderr
	server.Running = true

	// Call Run in a goroutine
	// Start doesn't work as it doesn't set the ProcessState correctly
	go func() {
		// Process.Run below calls Wait internally
		// However, only 1 wait can be used at the same time
		// so if we want 'Restart' to work correctly,
		// we can't use 'Wait' in 'Stop'
		// Our solution is to abuse a mutex as a condition variable
		server.WaitMutex.Lock()
		defer server.WaitMutex.Unlock()

		server.Process.Run()
	}()

	return nil
}

func (server *MTAServer) Stop(wait bool) error {
	if server.Process == nil || server.Process.Process == nil || server.Running == false {
		return errors.New("Process not started")
	}

	server.Running = false
	err := server.Process.Process.Signal(os.Interrupt)
	if err != nil {
		return err
	}

	// Wait for the server to stop
	if wait {
		// This mutex is signalled when the server has stopped
		server.WaitMutex.Lock()
		server.WaitMutex.Unlock()
	}

	return nil
}

func (server *MTAServer) Restart() error {
	// Send stop signal
	err := server.Stop(true)
	if err != nil {
		return err
	}

	// Start server
	return server.Start()
}

func (server *MTAServer) ExecCommand(command string) error {
	_, err := io.WriteString(server.Stdin, command+"\n")

	if err != nil {
		fmt.Println(err)
	}

	return err
}

func (server *MTAServer) GetLog() string {
	// Make string from output buffer
	var buffer bytes.Buffer

	server.OutputBuffer.Do(func(line interface{}) {
		if line != nil {
			buffer.WriteString(line.(string))
			buffer.WriteString("\n")
		}
	})

	return buffer.String()
}

func (server *MTAServer) ToggleTimeoutPrevention(enabled bool) {
	serverDirectory := filepath.Dir(server.Path)

	if enabled {
		// Server
		file, err := os.OpenFile(serverDirectory+"/timeout.longtime", os.O_RDONLY|os.O_CREATE, 0666)
		if err == nil {
			file.Close()
		}

		// Client
		file, err = os.OpenFile(serverDirectory+"/../MTA/timeout.longtime", os.O_RDONLY|os.O_CREATE, 0666)
		if err == nil {
			file.Close()
		}
	} else {
		err := os.Remove(serverDirectory + "/timeout.longtime") // Server
		if err != nil {
			panic(err)
		}

		err = os.Remove(serverDirectory + "/../MTA/timeout.longtime") // Client
		if err != nil {
			panic(err)
		}
	}
}
