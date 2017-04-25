'use strict';

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { exec, ChildProcess } from 'child_process';
import { normalize } from 'path';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('extension.startMTA', () => {
        // The code you place here will be executed every time your command is executed
        const config = vscode.workspace.getConfiguration('launch');
        let info = config.get<Array<any>>('configurations');
        if (info) {
            info = info.filter(v => v.type === "mtasa");

            if (info[0]) {
                // Display a message box to the user
                vscode.window.showInformationMessage('Starting MTA:SA server right now');

                // Start server
                const path = normalize(info[0].serverpath + '/MTA Server_d.exe');
                exec(`start cmd.exe /K "${path}"`); // TODO: Insert packaged path here
            }
        }
    });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}