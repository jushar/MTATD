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

/**
 * The debugger resume state
 */
enum ResumeMode {
	Resume = 0,
	Paused,
	LineStep
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

	// Current local, upvalue and global variables
	private _currentLocalVariables: Object;
	private _currentUpvalueVariables: Object;
	private _currentGlobalVariables: Object;

	// maps from sourceFile to array of Breakpoints
	private _breakPoints = new Map<string, DebugProtocol.Breakpoint[]>();

	private _pollPausedTimer: NodeJS.Timer = null;

	private _variableHandles = new Handles<string>();

	private _backendUrl: string = 'http://localhost:51237';

	private _resourceName: string;
	private _resourcesPath: string;
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
		// This debug adapter implements the configurationDoneRequest.
		//response.body.supportsConfigurationDoneRequest = true;

		// make VS Code to use 'evaluate' when hovering over source
		//response.body.supportsEvaluateForHovers = true;

		// Enable the restart request
		response.body.supportsRestartRequest = true;

		this.sendResponse(response);
	}

	/**
	 * Called when the debugger is launched (and the debugee started)
	 */
	protected launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments): void {
		if (args.trace) {
			Logger.setup(Logger.LogLevel.Verbose, /*logToFile=*/false);
		}

		// Delay request shortly if the MTA Server is not running yet
		let interval: NodeJS.Timer;
		interval = setInterval(() => {		
			// Get info about debuggee
			request(this._backendUrl + '/MTADebug/get_info', (err, res, body) => {
				if (err || res.statusCode != 200) {
					// Try again soon
					return;
				}

				// Apply path from response
				const info = JSON.parse(body);
				if (!info.resource_name || !info.resource_path)
				{
					// Try again soon
					return;
				}

				this._resourceName = info.resource_name;
				this._resourcesPath = normalize(`${args.serverpath}/mods/deathmatch/resources/`);
				this._resourcePath = normalize(`${args.serverpath}/mods/deathmatch/resources/${info.resource_path}`);

				// Start timer that polls for the execution being paused
				if (!this._pollPausedTimer)
					this._pollPausedTimer = setInterval(() => { this.checkForPausedTick(); }, 500);

				// We know got a list of breakpoints, so tell VSCode we're ready
				this.sendEvent(new InitializedEvent());

				// We just start to run until we hit a breakpoint or an exception
				this.continueRequest(<DebugProtocol.ContinueResponse>response, { threadId: MTASADebugSession.THREAD_ID });

				// Clear interval as we successfully received the info
				clearInterval(interval)
			});
		}, 200);
	}

	/**
	 * Called when the editor requests a restart
	 */
	protected restartRequest(response: DebugProtocol.RestartResponse, args: DebugProtocol.RestartArguments): void {
		// Send restart command to server
		request(this._backendUrl + '/MTAServer/command', {
			json: { command: `restart ${this._resourceName}` }
		}, () => {
			this.sendResponse(response);
		});
	}

	/**
	 * Called when the editor requests a breakpoint being set
	 */
	protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {
		const path = args.source.path;
		const clientLines = args.lines;

		// Clear old breakpoints
		request(this._backendUrl + "/MTADebug/clear_breakpoints")

		// Read file contents into array for direct access
		//const lines = readFileSync(path).toString().split('\n');

		const breakpoints = new Array<Breakpoint>();

		// verify breakpoint locations
		for (let i = 0; i < clientLines.length; i++) {
			let l = this.convertClientLineToDebugger(clientLines[i]);

			/*if (l < lines.length) {
				// If a line is empty or starts with '+' we don't allow to set a breakpoint but move the breakpoint down
				const line = lines[l].trim();
				if (line.length == 0 || line.indexOf("--") == 0)
					l++;
			}*/

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
		const currentFilePath = this._resourcesPath + this._currentFile;
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
		scopes.push(new Scope("Global", this._variableHandles.create("global_" + frameReference), false));

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
		
		// TODO: Use variablesReference to show the entries in tables
		if (id.startsWith('local')) {
			for (const name in this._currentLocalVariables) {
				if (this._currentLocalVariables.hasOwnProperty(name) && name != '__isObject') {
					variables.push({
						name: name,
						type: 'string', // TODO: Map type properly
						value: this._currentLocalVariables[name],
						variablesReference: 0
					});
				}
			}
		} else if (id.startsWith('closure')) {
			for (const name in this._currentUpvalueVariables) {
				if (this._currentUpvalueVariables.hasOwnProperty(name) && name != '__isObject') {
					variables.push({
						name: name,
						type: 'string', // TODO: Map type properly
						value: this._currentUpvalueVariables[name],
						variablesReference: 0
					});
				}
			}
		} else if (id.startsWith('global')) {
			for (const name in this._currentGlobalVariables) {
				if (this._currentGlobalVariables.hasOwnProperty(name) && name != '__isObject') {
					variables.push({
						name: name,
						type: 'string', // TODO: Map type properly
						value: this._currentGlobalVariables[name],
						variablesReference: 0
					});
				}
			}
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
			json: { resume_mode: ResumeMode.Resume }
		}, () => {
			this._isRunning = true;
			this.sendResponse(response);
		});
	}

	/**
	 * Called when a step to the next line is requested
	 */
	protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): void {
		// Send line step request to backend
		request(this._backendUrl + '/MTADebug/set_resume_mode', {
			json: { resume_mode: ResumeMode.LineStep }
		}, () => {
			this._isRunning = false;
			this.sendResponse(response);
		});
	}

	/**
	 * Called when the editor requests an eval call
	 */
	protected evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments): void {
		request(this._backendUrl + '/MTADebug/set_pending_eval', {
			json: { pending_eval: args.expression }
		}, () => {

			// Dirty hack: Wait a moment (TODO)
			setTimeout(() => {
				request(this._backendUrl + '/MTADebug/get_eval_result', (err, res, body) => {
					if (!err && res.statusCode === 200) {
						// Output result to backend
						response.body = {
							result: JSON.parse(body).eval_result,
							variablesReference: 0
						};
						this.sendResponse(response);
					}
				});
			}, 1000);
		});
	}

	/**
	 * Polls the backend for the current execution state
	 */
	protected checkForPausedTick() {
		request(this._backendUrl + '/MTADebug/get_resume_mode', (err, response, body) => {
			if (!err && response.statusCode === 200) {
				const obj = JSON.parse(body);

				// Check if paused
				if (obj.resume_mode == ResumeMode.Paused) {
					// Store the breakpoint's file and line
					this._currentFile = obj.current_file;
					this._currentLine = obj.current_line;

					this._currentLocalVariables = obj.local_variables;
					this._currentUpvalueVariables = obj.upvalue_variables;
					this._currentGlobalVariables = obj.global_variables;

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
		
		return relativePath.replace(/\\/g, '/');
	}

	private log(msg: string, line: number) {
		const e = new OutputEvent(`${msg}: ${line}\n`);
		(<DebugProtocol.OutputEvent>e).body.variablesReference = this._variableHandles.create("args");
		this.sendEvent(e);	// print current line on debug console
	}
}

DebugSession.run(MTASADebugSession);
