package main

import (
	"bufio"
	"os"
	"time"
)

func main() {
	server := NewMTAServer("D:\\Dev\\MTA\\mtasa-blue\\Bin\\server\\MTA Server_d.exe")
	server.Start()

	time.Sleep(15 * time.Second)

	server.ExecCommand("help")

	reader := bufio.NewReader(os.Stdin)
	reader.ReadString('\n')
}
