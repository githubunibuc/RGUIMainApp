# R-GUI-MainApp

This project has received funding through the University of Bucharest, from UEFISCDI domain 6 "Supporting excellence research in universities" Institutional Development Fund. The project number was CNFIS-FDI-2019-0186, titled: "Integrated IT&C environment to develop and collaborate to support excelence research within the University of Bucharest".

## Dialog Events

### Sending data

* dialogCreated -- triggered after a window is loaded

* dialogCurrentStateUpdate -- This is used to save a dialog state so it can be restored on reopen.

* runCommand -- This is used to send the dialog command to R

* dialogCommandUpdate -- This is used to send the R command to the main window for the preview

### Receiving data

* dialogInitialData -- Get data after dialog created

* dialogDataUpdate -- Get data anytime after dialog was created - usually an update
