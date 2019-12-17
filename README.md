# R-GUI-MainApp


## Dialog Events

### Sending data

* dialogCreated -- triggered after a window is loaded

* dialogCurrentStateUpdate -- This is used to save a dialog state so it can be restored on reopen.

* runCommand -- This is used to send the dialog command to R

* dialogCommandUpdate -- This is used to send the R command to the main window for the preview

### Receiving data

* dialogInitialData -- Get data after dialog created

* dialogDataUpdate -- Get data anytime after dialog was created - usually an update