'use strict';

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { spawn, ChildProcess } from 'child_process';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('extension.startMTA', () => {
        // The code you place here will be executed every time your command is executed
        const config = vscode.workspace.getConfiguration('launch');
        const info = config.get('configurations');
        if (info) {
            // Display a message box to the user
            vscode.window.showInformationMessage('TestServer started');

            vscode.window.showInformationMessage(info[0].program);
            spawn(info[0].program);
        }

    });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}