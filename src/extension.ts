// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
const fs = require('fs');

function showError(e: Error) {
    console.error('[Visit Home] error: ', e);
    vscode.window.showInformationMessage(e.message);
}

async function trackModulePath(
    fileName: string,
    moduleName: string,
): Promise<'' | vscode.Uri> {
    if (!fileName) {
        return '';
    }
    const lastIndex = fileName.lastIndexOf('/');
    if (lastIndex === -1) {
        return '';
    }
    const parentDirUri = vscode.Uri.file(
        fileName.substring(0, lastIndex === 0 ? 1 : lastIndex),
    );
    try {
        const fileList = await vscode.workspace.fs.readDirectory(parentDirUri);
        const nm = fileList.find(
            (item) => item[0] === 'node_modules' && item[1] === 2, // TODO: SymbolicLink
        );
        if (nm) {
            const p = vscode.Uri.joinPath(
                parentDirUri,
                `node_modules/${moduleName}`,
            );
            console.log('module path: ', p);
            return p;
        }
    } catch (e) {
        showError(e);
        return '';
    }
    if (lastIndex === 0) {
        return '';
    }
    return await trackModulePath(parentDirUri.path, moduleName);
}

function trackPackageJson(
    moduleUri: vscode.Uri,
    times: number = 1,
): null | string {
    let parentDirUri = moduleUri;

    if (times > 1) {
        const lastIndex = moduleUri.path.lastIndexOf('/');
        parentDirUri = vscode.Uri.file(moduleUri.path.substring(0, lastIndex));
    }

    if (
        !parentDirUri.path.includes('node_modules') ||
        parentDirUri.path.endsWith('node_modules')
    ) {
        return null;
    }

    try {
        // const json = await vscode.workspace.fs.readFile(
        //     vscode.Uri.joinPath(parentDirUri, 'package.json'),
        // );
        const json = fs.readFileSync(
            vscode.Uri.joinPath(parentDirUri, 'package.json').path,
            'utf8',
        );
        return json;
    } catch (e) {
        // showError(e);
        return trackPackageJson(parentDirUri, times + 1);
    }
}

function getHomePage(packageJson: Record<string, any>) {
    if (packageJson.homepage) {
        return packageJson.homepage;
    }
    if (packageJson.repository) {
        if (typeof packageJson.repository === 'object') {
            return packageJson.repository.url;
        }
        return packageJson.repository;
    }
    return '';
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "visit-home" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand(
        'visit-home.visitHome',
        async () => {
            // The code you place here will be executed every time your command is executed

            const editor = vscode.window.activeTextEditor;

            if (editor) {
                // the Position object gives you the line and character where the cursor is
                const position = editor.selection.active;
                const rangeA = editor.document.getWordRangeAtPosition(
                    position,
                    /require\(['"].+['"]\)/,
                );
                const rangeB = editor.document.getWordRangeAtPosition(
                    position,
                    /from\s+['"].+['"]/,
                );
                let textA = rangeA ? editor.document.getText(rangeA) : '';
                let textB = rangeB ? editor.document.getText(rangeB) : '';
                if (textA) {
                    const match = textA.match(/require\(['"](.+?)['"]\)/);
                    if (match) {
                        textA = match[1];
                    }
                } else if (textB) {
                    const match = textB.match(/from\s+['"](.+?)['"]/);
                    if (match) {
                        textB = match[1];
                    }
                }
                const moduleName = textA || textB;
                if (
                    moduleName.startsWith('.') ||
                    moduleName.startsWith('..') ||
                    moduleName.startsWith('/')
                ) {
                    return;
                }
                const modulePath = await trackModulePath(
                    editor.document.fileName,
                    moduleName,
                );
                if (modulePath) {
                    const jsonText = trackPackageJson(modulePath);
                    if (jsonText) {
                        try {
                            const json = JSON.parse(jsonText);
                            const homePage = getHomePage(json);
                            console.log('homepage', homePage);
                            // TODO: add a toast?
                            await vscode.env.openExternal(
                                vscode.Uri.parse(homePage),
                            );
                        } catch (e) {
                            // showError(e);
                        }
                    }
                }
            }
        },
    );

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
