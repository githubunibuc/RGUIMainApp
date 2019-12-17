const { ipcRenderer } = require('electron');
const objects = require("../../libraries/objects");

// build the dialog after the window was created
ipcRenderer.on('dialogCreated', (event, args) => 
{
    // create the dialog
    objects.makeDialog(args.dialogID, args.data);

    // update to last state if opened previously
    if(args.lastState) {
        objects.changeDialogState(args.lastState, true);
    }
    // trigger dialogCreated event for loading data
    ipcRenderer.send('dialogCreated', {name: args.dialogID});
});

// load data received from R
ipcRenderer.on('dialogIncomingData', (event, args) => {
    objects.incommingDataFromR(args);
});

// Update data received from R
ipcRenderer.on('dataUpdateFromR', (event, args) => {
    objects.incommingUpdateDataFromR(args);
});

// multiple select for container
document.addEventListener("keydown", event => {
    if (event.key === 'Shift') {
        objects.keyPressedEvent(event.key, true);
    }
});
document.addEventListener("keyup", event => {
    if (event.key === 'Shift') {
        objects.keyPressedEvent(event.key, false);
    }
});