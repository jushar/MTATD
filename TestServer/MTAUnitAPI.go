package main

import "github.com/gorilla/mux"
import "net/http"

import "encoding/json"

type MTAUnitAPI struct {
}

type TestResult struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

type TestSuiteResults map[string]map[string]TestResult

func NewMTAUnitAPI(router *mux.Router) *MTAUnitAPI {
	// Create instance
	api := new(MTAUnitAPI)

	// Register routes
	router.HandleFunc("/report_test_results", api.Handler_ReportTestResults)

	return api
}

func (api *MTAUnitAPI) Handler_ReportTestResults(res http.ResponseWriter, req *http.Request) {
	// Parse data
	var testSuiteResults TestSuiteResults
	err := json.NewDecoder(req.Body).Decode(&testSuiteResults)
	if err != nil {
		panic(err.Error())
	}

	// Remarshal data for testing purposes
	json.NewEncoder(res).Encode(&testSuiteResults)
}
