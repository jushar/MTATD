/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import {
	Logger,
	DebugSession, LoggingDebugSession,
	InitializedEvent, TerminatedEvent, StoppedEvent, BreakpointEvent, OutputEvent, Event,
	Thread, StackFrame, Scope, Source, Handles, Breakpoint
} from 'vscode-debugadapter';
import {DebugProtocol} from 'vscode-debugprotocol';
import {readFileSync} from 'fs';
import {basename, normalize} from 'path';
import * as request from 'request';


/**
 * This interface should always match the schema found in the mock-debug extension manifest.
 */
export interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
	/** An absolute path to the MTA server to debug. */
	serverpath: string;
	/** Automatically stop target after launch. If not specified, target does not stop. */
	stopOnEntry?: boolean;
	/** enable logging the Debug Adapter Protocol */
	trace?: boolean;
}

class MTASADebugSession extends DebugSession {

	// we don't support multiple threads, so we can use a hardcoded ID for the default thread
	private static THREAD_ID = 1;

	// since we want to send breakpoint events, we will assign an id to every event
	// so that the frontend can match events with breakpoints.
	private _breakpointId = 1000;

	// the initial (and one and only) file we are 'debugging'
	private _currentFile: string;

	// This is the next line that will be 'executed'
	private _currentLine = 0;

	// maps from sourceFile to array of Breakpoints
	private _breakPoints = new Map<string, DebugProtocol.Breakpoint[]>();

	private _pollPausedTimer: NodeJS.Timer = null;

	private _variableHandles = new Handles<string>();

	private _backendUrl: string = 'http://localhost:8080';

	private _resourcePath: string;

	private _isRunning: boolean = false;

	/**
	 * Creates a new debug adapter that is used for one debug session.
	 * We configure the default implementation of a debug adapter here.
	 */
	public constructor() {
		super();

		this.setDebuggerLinesStartAt1(true);
	}

	/**
	 * The 'initialize' request is the first request called by the frontend
	 * to interrogate the features the debug adapter provides.
	 */
	protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
		// since this debug adapter can accept configuration requests like 'setBreakpoint' at any time,
		// we request them early by sending an 'initializeRequest' to the frontend.
		// The frontend will end the configuration sequence by calling 'configurationDone' request.
		this.sendEvent(new InitializedEvent());

		// This debug adapter implements the configurationDoneRequest.
		//response.body.supportsConfigurationDoneRequest = true;

		// make VS Code to use 'evaluate' when hovering over source
		//response.body.supportsEvaluateForHovers = true;

		this.sendResponse(response);
	}

	/**
	 * Called when the debugger is launched (and the debugee started)
	 */
	protected launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments): void {
		if (args.trace) {
			Logger.setup(Logger.LogLevel.Verbose, /*logToFile=*/false);
		}

		// Get info about debuggee
		request(this._backendUrl + '/MTADebug/get_info', (err, res, body) => {
			if (err || res.statusCode != 200) {
				// TODO: Show error
				return;
			}

			// Apply path from response
			const info = JSON.parse(body);
			this._resourcePath = normalize(`${args.serverpath}/mods/deathmatch/resources/${info.resource_path}`);

			// Start timer that polls for the execution being paused
			if (!this._pollPausedTimer)
				this._pollPausedTimer = setInterval(() => { this.checkForPausedTick(); }, 1000);

			// We just start to run until we hit a breakpoint or an exception
			this.continueRequest(<DebugProtocol.ContinueResponse>response, { threadId: MTASADebugSession.THREAD_ID });
		});
	}

	/**
	 * Called when the editor requests a breakpoint being set
	 */
	protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {
		const path = args.source.path;
		const clientLines = args.lines;

		// Read file contents into array for direct access
		const lines = readFileSync(path).toString().split('\n');

		const breakpoints = new Array<Breakpoint>();

		// verify breakpoint locations
		for (var i = 0; i < clientLines.length; i++) {
			let l = this.convertClientLineToDebugger(clientLines[i]);

			if (l < lines.length) {
				// If a line is empty or starts with '+' we don't allow to set a breakpoint but move the breakpoint down
				const line = lines[l].trim();
				if (line.length == 0 || line.indexOf("--") == 0)
					l++;
			}

			// Create breakpoint
			const bp = <DebugProtocol.Breakpoint> new Breakpoint(true, this.convertDebuggerLineToClient(l));
			bp.id = this._breakpointId++;
			breakpoints.push(bp);

			// Send breakpoint request to backend
			request(this._backendUrl + "/MTADebug/set_breakpoint", {
				json: {
					file: this.getRelativeResourcePath(args.source.path),
					line: l
				}
			});
		}
		this._breakPoints.set(path, breakpoints);

		// send back the actual breakpoint positions
		response.body = {
			breakpoints: breakpoints
		};
		this.sendResponse(response);
	}

	/**
	 * Called to inform the editor about the thread we're using
	 */
	protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
		// Return the default thread
		response.body = {
			threads: [
				new Thread(MTASADebugSession.THREAD_ID, "thread 1")
			]
		};
		this.sendResponse(response);
	}

	/**
	 * Returns a fake 'stacktrace' where every 'stackframe' is a word from the current line.
	 */
	protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments): void {
		const frames = new Array<StackFrame>();
		
		// Only the current stack frame is supported for now
		const currentFilePath = this.getAbsoluteResourcePath(this._currentFile);
		frames.push(new StackFrame(0, 'Frame 0', new Source(basename(currentFilePath),
				this.convertDebuggerPathToClient(currentFilePath)),
				this.convertDebuggerLineToClient(this._currentLine), 0));
		
		// Craft response
		response.body = {
			stackFrames: frames,
			totalFrames: 1
		};
		this.sendResponse(response);
	}

	/**
	 * Called to inform the editor about the existing variable scopes
	 */
	protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments): void {
		const frameReference = args.frameId;
		const scopes = new Array<Scope>();
		scopes.push(new Scope("Local", this._variableHandles.create("local_" + frameReference), false));
		scopes.push(new Scope("Closure", this._variableHandles.create("closure_" + frameReference), false));
		scopes.push(new Scope("Global", this._variableHandles.create("global_" + frameReference), true));

		response.body = {
			scopes: scopes
		};
		this.sendResponse(response);
	}

	/**
	 * Called to inform the editor about the values of the variables
	 */
	protected variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments): void {
		const variables = [];
		const id = this._variableHandles.get(args.variablesReference);
		if (id != null) {
			variables.push({
				name: id + "_i",
				type: "integer",
				value: "123",
				variablesReference: 0
			});
			variables.push({
				name: id + "_f",
				type: "float",
				value: "3.14",
				variablesReference: 0
			});
			variables.push({
				name: id + "_s",
				type: "string",
				value: "hello world",
				variablesReference: 0
			});
			variables.push({
				name: id + "_o",
				type: "object",
				value: "Object",
				variablesReference: this._variableHandles.create("object_")
			});
		}

		response.body = {
			variables: variables
		};
		this.sendResponse(response);
	}

	/**
	 * Called when the editor requests the executing to be continued
	 */
	protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments): void {
		// Send continue request to backend
		request(this._backendUrl + '/MTADebug/set_resume_mode', {
			json: { resume_mode: 0 }
		}, () => {
			this._isRunning = true;
			this.sendResponse(response);
		});
	}

	/**
	 * Called when a step to the next line is requested
	 */
	protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): void {
		this.sendResponse(response);
		// no more lines: run to end
		//this.sendEvent(new TerminatedEvent());
	}

	protected evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments): void {
		response.body = {
			result: `evaluate(context: '${args.context}', '${args.expression}')`,
			variablesReference: 0
		};
		this.sendResponse(response);
	}

	/**
	 * Polls the backend for the current execution state
	 */
	protected checkForPausedTick() {
		if (!this._isRunning)
			return;

		request(this._backendUrl + '/MTADebug/get_resume_mode', (err, response, body) => {
			if (!err && response.statusCode === 200) {
				const obj = JSON.parse(body);

				// Check if paused
				if (obj.resume_mode == 1) {
					// Store the breakpoint's file and line
					this._currentFile = obj.current_file;
					this._currentLine = obj.current_line;

					this._isRunning = false;
					this.sendEvent(new StoppedEvent('breakpoint', MTASADebugSession.THREAD_ID));
				}
			}
		});
	}


	/**
	 * Returns the relative resource path from an absolute path
	 * @param absolutePath The absolute path
	 * @return The relative path
	 */
	private getRelativeResourcePath(absolutePath: string) {
		const relativePath = normalize(absolutePath).toLowerCase().replace(this._resourcePath.toLowerCase(), '');
		
		// Drop the resource name to prevent it from being in the string twice
		return relativePath.replace('\\', '/').replace(/(.*?)\/(.*)/, '$2');
	}

	/**
	 * Returns the absolute path from a relative path
	 * @param relativePath The relative path (e.g. "<resourcenName>/server.lua")
	 * @return The absolute path
	 */
	private getAbsoluteResourcePath(relativePath: string) {
		return this._resourcePath + relativePath;
	}

	private log(msg: string, line: number) {
		const e = new OutputEvent(`${msg}: ${line}\n`);
		(<DebugProtocol.OutputEvent>e).body.variablesReference = this._variableHandles.create("args");
		this.sendEvent(e);	// print current line on debug console
	}
}

DebugSession.run(MTASADebugSession);
