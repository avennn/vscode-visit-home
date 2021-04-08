// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

async function trackModulePath(
    fileName: string,
    moduleName: string,
): Promise<string | vscode.Uri> {
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
    console.log('parent dir uri: ', parentDirUri.path);
    const fileList = await vscode.workspace.fs.readDirectory(parentDirUri);
    console.log('file result: ', fileList);
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
    if (lastIndex === 0) {
        return '';
    }
    return await trackModulePath(parentDirUri.path, moduleName);
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
                if (editor.selection.isEmpty) {
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

                    // let lastIndex = editor.document.fileName.lastIndexOf('/');
                    // let parentDirUri = vscode.Uri.file(
                    //     editor.document.fileName.substring(0, lastIndex),
                    // );
                    // console.log(
                    //     'parentDirUri',
                    //     editor.document.fileName,
                    //     lastIndex,
                    //     parentDirUri,
                    // );
                    // vscode.workspace.fs
                    //     .readDirectory(parentDirUri)
                    //     .then((fileList) => {
                    //         console.log('file result: ', fileList);
                    //         const nm = fileList.find(
                    //             (item) =>
                    //                 item[0] === 'node_modules' && item[1] === 2,
                    //         );
                    //         if (nm) {
                    //             let p = vscode.Uri.joinPath(
                    //                 parentDirUri,
                    //                 `node_modules/${moduleName}`,
                    //             );
                    //             console.log('module name1: ', p);
                    //         } else {
                    //             lastIndex = parentDirUri.path.lastIndexOf('/');
                    //             parentDirUri = vscode.Uri.file(
                    //                 parentDirUri.path.substring(0, lastIndex),
                    //             );
                    //             vscode.workspace.fs
                    //                 .readDirectory(parentDirUri)
                    //                 .then((fileList) => {
                    //                     const nm = fileList.find(
                    //                         (item) =>
                    //                             item[0] === 'node_modules' &&
                    //                             item[1] === 2,
                    //                     );
                    //                     if (nm) {
                    //                         let p = vscode.Uri.joinPath(
                    //                             parentDirUri,
                    //                             `node_modules/${moduleName}`,
                    //                         );
                    //                         console.log('module name2: ', p);
                    //                     }
                    //                 });
                    //         }
                    //     });

                    const modulePath = await trackModulePath(
                        editor.document.fileName,
                        moduleName,
                    );
                    console.log('module path: ', modulePath);
                    console.log(
                        'workspace: ',
                        vscode.workspace.workspaceFolders,
                    );
                }
            }
        },
    );

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
